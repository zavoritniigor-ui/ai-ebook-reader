"""Real HTTP execution-order, selection, cancellation and offline-shell audit.
READER_AUDIT_URL may point to production; no real AI requests or credentials.
"""
import base64, json, os, time
from urllib.parse import urlsplit
from browser_cdp import CDP, pdf_bytes

c = CDP()
c.sock.settimeout(40)
c.call('Page.enable')
c.call('Emulation.setDeviceMetricsOverride',width=900,height=1200,deviceScaleFactor=2,mobile=True)
c.call('Network.enable')
c.call('Network.setBypassServiceWorker', bypass=False)
c.call('Network.setCacheDisabled', cacheDisabled=True)
url = os.environ.get('READER_AUDIT_URL', 'http://127.0.0.1:8765/index.html')
preload = c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__auditLoadId=Math.random().toString(36);
window.__errors=[];
const reportConsoleError=console.error.bind(console);
console.error=(...args)=>{__errors.push('console.error: '+args.map(String).join(' '));reportConsoleError(...args);};
addEventListener('error', e=>__errors.push(e.message));
addEventListener('unhandledrejection', e=>__errors.push(String(e.reason)));
Object.defineProperty(window, 'speechSynthesis', {configurable:true,value:{
 getVoices:()=>[{name:'Google English', lang:'en-US',voiceURI:'audit-en',localService:false},
 {name:'Google French',lang:'fr-FR',voiceURI:'audit-fr',localService:false}],cancel(){},speak(){}}});
localStorage.setItem('reader_voices_manual','null');
''')['identifier']

def check(name, expression):
    value = c.js(expression)
    assert value is True, (name, value)
    print('PASS', name, flush=True)

def reload(hard=False):
    previous = c.js("window.__auditLoadId || null")
    if hard:
        c.call('Page.reload', ignoreCache=True)
    else:
        c.call('Page.navigate', url=url)
    c.wait("window.__auditLoadId && window.__auditLoadId!==" + json.dumps(previous) + " && document.readyState==='complete' && !document.body.inert")
    check('cold/hard reload: populated voices and null stored preferences',
          "__errors.length===0 && voices.length===2 && state.selectedVoiceURIByLang.en==='audit-en' && typeof sentenceRangeAt==='function' && typeof startAiTask==='function'")

parts = urlsplit(url)
c.call('Storage.clearDataForOrigin',origin=parts.scheme+'://'+parts.netloc,storageTypes='service_workers,cache_storage')
reload()
c.js('(async()=>{await navigator.serviceWorker.ready;})()')
c.wait('!!navigator.serviceWorker.controller')
manifest = c.call('Page.getAppManifest')
assert not manifest.get('errors'), manifest
assert not c.call('Page.getInstallabilityErrors').get('installabilityErrors')
check('installable shell has actual 192/512 icons and standalone manifest', """(async()=>{
 const m=await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
 const sizes=await Promise.all(m.icons.map(icon=>new Promise(resolve=>{const image=new Image();
 image.onload=()=>resolve(`${image.naturalWidth}x${image.naturalHeight}`);image.onerror=()=>resolve('error');image.src=icon.src;})));
 return !!m.name&&m.display==='standalone'&&sizes.includes('192x192')&&sizes.includes('512x512');})()""")
check('first SW installation does not announce a nonexistent update', "!document.getElementById('sw-update-banner')")
check('later controller changes show exactly one update banner', """(()=>{
 navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
 navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
 return document.querySelectorAll('#sw-update-banner').length===1;})()""")
for _ in range(2):
    reload(hard=True)
check('classic execution order and no duplicate scripts', '''(()=>{
 const scripts=[...document.scripts].filter(s=>s.src.includes('/js/'));
 return scripts.every(s=>!s.async&&!s.defer&&s.type!=='module') &&
 new Set(scripts.map(s=>s.src)).size===scripts.length &&
 scripts.map(s=>new URL(s.src).pathname.split('/').pop()).join(',')==='core.js,lang-detect.js,tts.js,selection.js,learning-stats.js,navigation.js,pdf-zoom-pan.js,ui-tooltip.js,translation.js,grammar-svo.js,ai-client.js,dictation.js,pdf-ink.js,pdf-crop.js,pdf-render.js,formats.js,onboarding.js,main.js,pwa-lifecycle.js';})()''')
check('language and voice helper dependencies', "detectLang('Les oiseaux chantent.').startsWith('fr') && voiceForText('Hello world').voice.voiceURI==='audit-en'")
check('sanitization unchanged', '''(()=>{const d=document.createElement('div');d.innerHTML=safeHtml('<script>x</script><img src=x onerror=x><a href="javascript:x">x</a><svg onload=x></svg>',true);return !d.querySelector('script,img[src],svg,[onerror],[onload],[href]') && escapeHtml('<>&')==='&lt;&gt;&amp;';})()''')
check('bodyless HTTP response survives timeout wrapper', """(async()=>{
 const original=fetch;try{window.fetch=async()=>new Response(null,{status:204});
 const response=await fetchWithTimeout('/audit');return response.status===204&&(await response.text())==='';
 }finally{window.fetch=original;}})()""")
check('async replacement/epoch/target cancellation', '''(()=>{
 const a=beginAsyncTask('audit'),b=beginAsyncTask('audit');if(!a.signal.aborted||!b.current())return false;
 readerEpoch.book++;if(b.current())return false;const d=beginAsyncTask('audit');
 const old=state.targetLang;state.targetLang='fr';const stale=!d.current();state.targetLang=old;
 cancelAsyncTasks();return stale&&d.signal.aborted&&!asyncTasks.size;})()''')
check('provider priority, fallback, no-key and abort', '''(async()=>{
 const oldFetch=fetch, oldGroq=state.groqKey, oldKey=state.apiKey;let calls=[];
 try{state.groqKey='audit-fake';state.apiKey='audit-fake';
 window.fetch=async(url,opts)=>{calls.push(String(url));return calls.length===1?new Response('{}',{status:503}):new Response(JSON.stringify({candidates:[{content:{parts:[{text:'ok'}]}}]}));};
 if(await callAI('test')!=='ok'||calls.length!==2||!calls[0].includes('groq'))return false;
 const controller=new AbortController();controller.abort();calls=[];
 try{await callAIVision('test','data:image/jpeg;base64,AA==',controller.signal);return false;}catch(e){if(e.name!=='AbortError'||calls.length)return false;}
 state.groqKey='';state.apiKey='';try{await callAI('test');return false;}catch(e){return e.message===t('needKey')&&calls.length===0;}
 }finally{window.fetch=oldFetch;state.groqKey=oldGroq;state.apiKey=oldKey;}})()''')
check('in-flight text and vision abort never call fallback', """(async()=>{
 const oldFetch=fetch,oldGroq=state.groqKey,oldGemini=state.apiKey;
 try{state.groqKey=state.apiKey='audit-fake';
 for(const vision of [false,true]){
 let calls=0;window.fetch=(url,options)=>{calls++;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true}));};
 const controller=new AbortController();const pending=vision?callAIVision('test','data:image/jpeg;base64,AA==',controller.signal):callAI('test',controller.signal);
 controller.abort();try{await pending;return false;}catch(e){if(e.name!=='AbortError'||calls!==1)return false;}
 }return true;}finally{window.fetch=oldFetch;state.groqKey=oldGroq;state.apiKey=oldGemini;}})()""")
check('AI panel no-key, replacement and background abort lifecycle', """(async()=>{
 const oldCall=callAI,oldAlert=alert,oldKey=state.groqKey,oldGemini=state.apiKey;let notice='',resolvers=[];
 try{state.groqKey='';state.apiKey='';window.alert=message=>notice=message;
 await startAiTask('Hello','ask');if(notice!==t('needKey'))return false;
 state.groqKey='audit';callAI=(prompt,signal)=>new Promise((resolve,reject)=>{
 resolvers.push(resolve);signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true});});
 const first=startAiTask('First','ask'),second=startAiTask('Second','ask');resolvers[1]('<p>Second reply</p>');
 await Promise.all([first,second]);if(!els.askPanel.classList.contains('ready')||els.askContent.textContent!=='Second reply')return false;
 const third=startAiTask('Third','ask');cancelAsyncTasks(['ask']);await third;
 return !els.askPanel.classList.contains('loading');
 }finally{callAI=oldCall;window.alert=oldAlert;state.groqKey=oldKey;state.apiKey=oldGemini;els.askPanel.classList.remove('loading','ready','expanded');}})()""")
data = base64.b64encode(pdf_bytes(two_columns=True)).decode()
check('real PDF cold-start rendering and text layer', f"""(async()=>{{
 state.format='pdf';state.bookKey='audit-pdf';state.pdfFit='page';state.pdfScale=1;
 document.body.classList.add('pdf-mode','immersive-mode');
 await Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{{}})));
 clearTimeout(resizeTimer);localStorage.removeItem(state.bookKey);
 await initPdf(new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'audit.pdf'));
 const ok=state.currentIndex===1&&els.pages.textContent.includes('Left sentence')&&els.pages.querySelectorAll('.pdf-text-layer').length===1&&pdfTasks.render===null&&pdfTasks.text===null;
 return ok;
}})()""")
# Actual PDF.js items deliberately alternate left/right columns in the content stream.
c.js("state.translateMode=true;state.lastWordNode=null;window.__layer=els.pages.querySelector('.pdf-text-layer')")
check('ten two-column taps choose the second sentence', '''(()=>{
 const spans=pdfTextSpans(__layer);if(spans.length!==10)return false;
 for(const span of spans){
 const n=span.firstChild,r=document.createRange(),offset=n.data.indexOf('Second')+2;
 r.setStart(n,offset);r.setEnd(n,offset+1);const b=r.getBoundingClientRect();
 if(!__layer.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)))return false;
 state.lastWordNode=null;const sentence=sentenceRangeAt(b.x+b.width/2,b.y+b.height/2);
 if(sentence?.toString()!=='Second sentence.')return false;
 }return true;})()''')
check('PDF element-caret fallback uses exact glyph offset', """(()=>{
 const span=pdfTextSpans(__layer)[0],n=span.firstChild,r=document.createRange();
 const offset=n.data.indexOf('Second')+2;r.setStart(n,offset);r.setEnd(n,offset+1);
 const b=r.getBoundingClientRect(),original=document.caretRangeFromPoint;
 document.caretRangeFromPoint=()=>{const c=document.createRange();c.selectNodeContents(__layer);c.collapse(true);return c;};
 try{state.lastWordNode=null;return sentenceRangeAt(b.x+b.width/2,b.y+b.height/2)?.toString()==='Second sentence.';}
 finally{document.caretRangeFromPoint=original;}
})()""")
check('PDF highlight wrappers preserve every glyph at zoom and pan', """(()=>{
 const wrapper=els.pages.querySelector('.pdf-page-wrapper');
 const span=pdfTextSpans(__layer)[0],original=span.textContent;
 const glyphs=()=>{const out=[],w=document.createTreeWalker(span,NodeFilter.SHOW_TEXT);let n;
 while(n=w.nextNode())for(let i=0;i<n.length;i++){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const b=r.getBoundingClientRect();out.push({x:b.x,y:b.y,width:b.width,height:b.height});}return out;};
 const same=(a,b)=>a.length===b.length&&a.every((r,i)=>['x','y','width','height'].every(k=>Math.abs(r[k]-b[i][k])<1));
 try{for(const scale of [1,2.5]){
 wrapper.style.transformOrigin='0 0';wrapper.style.transform=`translate(-20px,30px) scale(${scale})`;
 span.textContent=original;const before=glyphs(),r=document.createRange();r.setStart(span.firstChild,5);r.setEnd(span.firstChild,13);
 const b=r.getBoundingClientRect();state.lastWordNode=null;
 if(selectWordAtPoint(b.x+b.width/2,b.y+b.height/2)!=='sentence'||!same(before,glyphs()))return false;
 const sentence=buildSentenceRangesFromSpans([span])[0].range;showSelectionHighlight(sentence);
 if(!same(before,glyphs()))return false;clearSelectionHighlight();if(!same(before,glyphs()))return false;
 }return true;}finally{clearSelectionHighlight();span.textContent=original;state.lastWordNode=null;wrapper.style.transform='';}
})()""")
check('visited word wrappers preserve full PDF sentence', '''(()=>{
 const span=pdfTextSpans(__layer)[0],n=span.firstChild,r=document.createRange();
 const start=n.data.indexOf('Second');r.setStart(n,start);r.setEnd(n,start+6);const b=r.getBoundingClientRect();
 if(selectWordAtPoint(b.x+b.width/2,b.y+b.height/2)!=='Second')return false;
 if(selectWordAtPoint(b.x+b.width/2,b.y+b.height/2)!=='Second')return false;
 return sentenceRangeAt(b.x+b.width/2,b.y+b.height/2)?.toString()==='Second sentence.';})()''')
check('word expansion preserves punctuation and sentence boundary', """(()=>{
 const r=wordToSentenceEndRangeAt(0,0);return r?.toString()==='Second sentence.';
})()""")
check('visual highlight does not include another column', '''(()=>{
 state.lastWordNode=null;const group=pdfVisualGroup(__layer,pdfTextSpans(__layer)[0]);
 const sentence=buildSentenceRangesFromSpans(group)[0].range;
 showSelectionHighlight(sentence);const text=state.selSpans.map(s=>s.textContent).join('');
 const ok=text.includes('Left')&&!text.includes('Right')&&!text.includes('Second');clearSelectionHighlight();return ok;})()''')
c.js('(async()=>{await state.pdfDoc.loadingTask.destroy();state.pdfDoc=null;pdfTasks.loading=null;})()')
check('unrelated pointerup preserves a completed text highlight', """(()=>{
 state.format='txt';const r=document.createRange();r.selectNodeContents(els.pages);
 showSelectionHighlight(r);const highlight=CSS.highlights.get(SEL_HL_NAME);
 document.body.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
 const ok=!!highlight&&CSS.highlights.get(SEL_HL_NAME)===highlight;clearSelectionHighlight();return ok;
})()""")
check('pointer cancel and background clear long-press/drag state', '''(async()=>{
 state.format='txt';dragSel={};state.touchSelecting=true;state.dragRange=document.createRange();
 touchSelTimer=setTimeout(()=>{throw Error('stale long press')},50);
 els.mainArea.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true}));
 if(dragSel||state.touchSelecting||state.dragRange||touchSelTimer)return false;
 touchSelTimer=setTimeout(()=>{throw Error('background long press')},50);
 stopBackgroundActivity();await new Promise(r=>setTimeout(r,100));return !touchSelTimer&&pdfTasks.render===null&&pdfTasks.text===null;})()''')
check('blur and book invalidation release selection state', """(async()=>{
 for(const cancel of [()=>window.dispatchEvent(new Event('blur')),()=>invalidateSelection()]){
 dragSel={};state.dragRange=document.createRange();state.touchSelecting=true;els.container.style.touchAction='none';
 touchSelTimer=setTimeout(()=>{throw Error('uncancelled drag timer')},20);cancel();
 if(dragSel||state.dragRange||state.touchSelecting||touchSelTimer||els.container.style.touchAction)return false;
 }await new Promise(r=>setTimeout(r,30));return true;})()""")
check('background cancels PDF file-read before a PDF.js task exists', """(async()=>{
 state.format='pdf';state.pdfDoc=null;let release;
 const pending=initPdf({arrayBuffer:()=>new Promise(r=>release=r)});
 const before=readerEpoch.book;stopBackgroundActivity();release(new ArrayBuffer(0));await pending;
 return readerEpoch.book===before+1&&pdfTasks.loading===null&&state.pdfDoc===null&&state.format===null;
})()""")
check('stale PDF completion destroys its loader without clearing the replacement', """(async()=>{
 const original=window.pdfjsLib;let release,destroyed=0;
 const loading={promise:new Promise(resolve=>release=resolve),destroy:async()=>destroyed++};
 const replacement={destroy:async()=>{throw Error('destroyed replacement');}};
 try{window.pdfjsLib={...original,getDocument:()=>loading};
 const pending=initPdf({arrayBuffer:async()=>new ArrayBuffer(0)});await Promise.resolve();
 readerEpoch.book++;pdfTasks.loading=replacement;release({});await pending;
 return destroyed===1&&pdfTasks.loading===replacement;
 }finally{window.pdfjsLib=original;pdfTasks.loading=null;}})()""")
c.js("""state.lastTapPoint={x:1,y:1};state.lastWordNode=els.pages;
 touchSelTimer=setTimeout(()=>{throw Error('book-change timer')},100);
 const input=new DataTransfer();input.items.add(new File(['Fresh audit book.'],'audit.txt',{type:'text/plain'}));
 els.upload.files=input.files;els.upload.dispatchEvent(new Event('change',{bubbles:true}));""")
c.wait("state.format==='txt' && els.pages.textContent.includes('Fresh audit book.')")
check('real book replacement clears stale selection and PDF ownership',
      "state.lastTapPoint===null && state.lastWordNode===null && !dragSel && !state.touchSelecting && pdfTasks.loading===null && state.pdfDoc===null")
check('no browser errors', '__errors.length===0')
reload()
check('service worker ready', '(async()=>{await navigator.serviceWorker.ready;return true;})()')
time.sleep(1)
reload()
check('offline shell contains every versioned module', '''(async()=>{
 const names=(await caches.keys()).filter(n=>n.startsWith('ai-reader-shell-'));
 const cache=await caches.open(names.at(-1));
 for(const s of [...document.scripts].filter(s=>s.src.includes('/js/'))){if(!s.src.includes('?v=')||!await cache.match(s.src))return false;}return true;})()''')
c.call('Network.emulateNetworkConditions', offline=True, latency=0, downloadThroughput=0, uploadThroughput=0)
try:
    reload()
    check('offline service worker controls page', '!!navigator.serviceWorker.controller')
    check('offline real PDF render and worker resources', f"""(async()=>{{
     state.format='pdf';state.bookKey='audit-offline';state.pdfFit='page';state.pdfScale=1;
     document.body.classList.add('pdf-mode','immersive-mode');
     await initPdf(new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'offline.pdf'));
     const ok=els.pages.textContent.includes('Right sentence')&&els.pages.querySelectorAll('.pdf-text-layer').length===1&&__errors.length===0;
     await state.pdfDoc.loadingTask.destroy();state.pdfDoc=null;pdfTasks.loading=null;return ok;
    }})()""")
finally:
    c.call('Network.emulateNetworkConditions', offline=False, latency=0, downloadThroughput=-1, uploadThroughput=-1)
    c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=preload)
print('ALL MIGRATION AUDIT CHECKS PASSED', flush=True)
