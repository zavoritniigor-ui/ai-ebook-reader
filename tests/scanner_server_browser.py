"""Opt-in OCR job transport and scanner UI, with a bounded same-origin server double.

Real GPU/model and PDF geometry are independently tested by server/ocr. This suite
proves the browser uploads original bytes, never regenerates the returned PDF,
uses light previews, cancels/releases jobs, and does not silently upload locally.
"""
import os
from browser_cdp import CDP

c = CDP()
c.call('Page.enable')
c.call('Runtime.enable')
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=915, deviceScaleFactor=2, mobile=True)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert && typeof OcrClient==='object'", timeout=30)


def check(name, js):
    result = c.js(js)
    assert result is True, (name, result)
    print('PASS ' + name, flush=True)


c.js("""(async()=>{
 localStorage.clear(); openScanner();
 window.__realFetch=fetch;
 window.__pdf=await (await fetch('/tests/fixtures/pdf/reportlab-multilingual-illustrated.pdf')).blob();
 const cv=document.createElement('canvas');cv.width=3200;cv.height=2400;
 const ctx=cv.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,3200,2400);
 ctx.font='96px sans-serif';ctx.fillStyle='black';ctx.fillText('L’école française — déjà Noël.',100,300);
 window.__original=new File([await scanBlob(cv,'image/jpeg',.96)],'original.jpg',{type:'image/jpeg'});cv.width=0;
 window.__calls=[];window.__mode='ok';window.__saved=null;
 window.fetch=async(url,init={})=>{
   if(!String(url).startsWith('/api/ocr/'))return __realFetch(url,init);
   __calls.push({url:String(url),method:init.method||'GET',body:init.body,headers:init.headers});
   if(__mode==='offline')throw new TypeError('network unavailable');
   if((init.method||'GET')==='DELETE')return new Response(null,{status:204});
   if(String(url).endsWith('/jobs'))return Response.json({id:'a'.repeat(32)},{status:201});
   if(String(url).includes('/pages/')){
     if(__mode==='wait')return new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));
     if(__mode==='busy')return Response.json({error:'busy'},{status:429});
     return Response.json({index:0,width:3200,height:2400,word_count:5});
   }
   if(String(url).endsWith('/pdf'))return new Response(__pdf,{headers:{'Content-Type':'application/pdf'}});
   if(String(url).endsWith('/manifest'))return Response.json({schema:1,pages:[{words:[{text:'école',bbox:[10,20,50,40]}]}]});
   throw new Error('Unexpected route');
 };
 window.scanSaveFile=async(file)=>{window.__saved=file;return 'saved';};
 return true;
})()""")
check('local is the fresh default and explains local processing', "!scanUsesServer() && scanEl('scan-privacy').dataset.i18n==='scanPrivacy' && __calls.length===0")
check('choosing server is explicit, changes privacy and restricts output to PDF', """(()=>{
 scanEl('scan-engine').value='server';scanEl('scan-engine').dispatchEvent(new Event('change'));
 return scanUsesServer()&&scanEl('scan-privacy').dataset.i18n==='scanServerPrivacy'&&scanEl('scan-ocr-row').hidden&&
 !scanEl('scan-dewarp-row').hidden&&!scanEl('scan-dewarp').checked&&[...scanEl('scan-format').options].filter(o=>!o.value.startsWith('pdf')).every(o=>o.disabled)&&__calls.length===0;
})()""")
check('server preview is bounded and adding/editing photos sends nothing', """(async()=>{
 await scanAddFiles([__original],false);const p=scanState.pages[0];
 return p.file===__original&&p.previewOnly&&Math.max(p.w,p.h)<=1000&&__calls.length===0&&JSON.stringify(p.corners)===JSON.stringify(SCAN_FULL);
})()""")
check('original bytes and normalized editing metadata go in a serial job; PDF is saved unchanged', """(async()=>{
 const p=scanState.pages[0];p.corners=[[.1,.1],[.9,.1],[.9,.9],[.1,.9]];p.rotation=90;p.filter='gray';
 scanEl('scan-format').value='pdf-fit';scanEl('scan-nup').value='4';await scanExport('save');
 const put=__calls.find(c=>c.method==='PUT'),post=__calls.find(c=>c.method==='POST');
 return put.body===__original&&put.body!==p.out&&JSON.stringify(JSON.parse(put.headers['X-OCR-Options']))===JSON.stringify({corners:p.corners,rotation:90,filter:'gray'})&&
 JSON.stringify(JSON.parse(post.body))===JSON.stringify({paper:'fit',nup:1,dewarp:false})&&
 __calls.map(c=>c.method).join(',')==='POST,PUT,GET,GET,DELETE'&&
 __saved.type==='application/pdf'&&await __saved.text()===await __pdf.text()&&!scanState.busy&&scanEl('scan-cancel-export').hidden;
})()""")
check('cancellation aborts a pending page, releases its job and unlocks the editor', """(async()=>{
 __calls=[];__mode='wait';const run=scanExport('save');
 for(let i=0;i<100&&!__calls.some(c=>c.method==='PUT');i++)await new Promise(r=>setTimeout(r,10));
 const locked=scanEl('scan-engine').disabled&&!scanEl('scan-cancel-export').hidden;
 scanEl('scan-cancel-export').click();await run;
 return locked&&__calls.at(-1).method==='DELETE'&&!scanState.busy&&!scanEl('scan-engine').disabled&&!scanState.controller;
})()""")
check('busy or unreachable server gives an error without generating a local substitute', """(async()=>{
 const before=__saved;__calls=[];__mode='busy';await scanExport('save');
 const busy=scanEl('scan-status').textContent===t('scanServerRetry')&&__calls.at(-1).method==='DELETE';
 __calls=[];__mode='offline';await scanExport('save');
 return busy&&scanEl('scan-status').textContent===t('scanServerOffline')&&__saved===before&&__calls.length===1;
})()""")
check('oversized photos fail before any upload', """(async()=>{
 __calls=[];__mode='ok';const file=new File([new Uint8Array(20*1024*1024+1)],'large.jpg');
 try{await OcrClient.createPdf([{file,corners:SCAN_FULL,rotation:0,filter:'orig'}],{paper:'fit',nup:1,dewarp:false});return false;}
 catch(e){return e.code==='too_large'&&__calls.length===0;}
})()""")
check('returning to local mode re-renders from original and performs no OCR-server request', """(async()=>{
 __calls=[];scanEl('scan-engine').value='device';scanEl('scan-engine').dispatchEvent(new Event('change'));
 scanEl('scan-format').value='jpg';scanEl('scan-ocr').checked=false;await scanExport('save');
 const p=scanState.pages[0];return !p.previewOnly&&Math.max(p.w,p.h)>1000&&__calls.length===0&&__saved.type==='image/jpeg';
})()""")
c.js('window.fetch=__realFetch;closeScanner();localStorage.clear();1')
c.sock.close()
