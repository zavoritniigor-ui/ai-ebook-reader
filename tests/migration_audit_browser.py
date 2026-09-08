"""Real HTTP execution-order, selection, cancellation and offline-shell audit.
READER_AUDIT_URL may point to production; no real AI requests or credentials.
"""
import base64, os, time
from browser_cdp import CDP, pdf_bytes

c = CDP()
c.sock.settimeout(40)
c.call('Page.enable')
c.call('Network.enable')
c.call('Network.setBypassServiceWorker', bypass=False)
c.call('Network.setCacheDisabled', cacheDisabled=True)
url = os.environ.get('READER_AUDIT_URL', 'http://127.0.0.1:8765/index.html')
preload = c.call('Page.addScriptToEvaluateOnNewDocument', source='''
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
    if hard:
        c.call('Page.reload', ignoreCache=True)
    else:
        c.call('Page.navigate', url=url)
    c.wait("document.readyState==='complete' && !document.body.inert")
    check('cold/hard reload: populated voices and null stored preferences',
          "__errors.length===0 && voices.length===2 && state.selectedVoiceURIByLang.en==='audit-en' && typeof sentenceRangeAt==='function' && typeof startAiTask==='function'")

reload()
for _ in range(2):
    reload(hard=True)
check('classic execution order and no duplicate scripts', '''(()=>{
 const scripts=[...document.scripts].filter(s=>s.src.includes('/js/'));
 return scripts.every(s=>!s.async&&!s.defer&&s.type!=='module') &&
 new Set(scripts.map(s=>s.src)).size===scripts.length &&
 scripts[0].src.includes('/core.js') && scripts[1].src.includes('/lang-detect.js');})()''')
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
 document.body.classList.add('pdf-mode');
 await initPdf(new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'audit.pdf'));
 const ok=state.currentIndex===1&&els.pages.textContent.includes('Left sentence')&&els.pages.querySelectorAll('.pdf-text-layer').length===1&&pdfTasks.render===null&&pdfTasks.text===null;
 await state.pdfDoc.loadingTask.destroy();state.pdfDoc=null;pdfTasks.loading=null;return ok;
}})()""")
# Actual PDF.js items deliberately alternate left/right columns in the content stream.
c.js("state.translateMode=true;state.lastWordNode=null;window.__layer=els.pages.querySelector('.pdf-text-layer')")
check('ten two-column taps choose the second sentence', '''(()=>{
 for(const span of pdfTextSpans(__layer)){
 const n=span.firstChild,r=document.createRange(),offset=n.data.indexOf('Second')+2;
 r.setStart(n,offset);r.setEnd(n,offset+1);const b=r.getBoundingClientRect();
 state.lastWordNode=null;const sentence=sentenceRangeAt(b.x+b.width/2,b.y+b.height/2);
 if(sentence?.toString()!=='Second sentence.')return false;
 }return true;})()''')
check('visited word wrappers preserve full PDF sentence', '''(()=>{
 const span=pdfTextSpans(__layer)[0],n=span.firstChild,r=document.createRange();
 const start=n.data.indexOf('Second');r.setStart(n,start);r.setEnd(n,start+6);const b=r.getBoundingClientRect();
 selectWordAtPoint(b.x+b.width/2,b.y+b.height/2);
 return sentenceRangeAt(b.x+b.width/2,b.y+b.height/2)?.toString()==='Second sentence.';})()''')
check('word expansion preserves punctuation and sentence boundary', """(()=>{
 const r=wordToSentenceEndRangeAt(0,0);return r?.toString()==='Second sentence.';
})()""")
check('visual highlight does not include another column', '''(()=>{
 state.lastWordNode=null;const group=pdfVisualGroup(__layer,pdfTextSpans(__layer)[0]);
 const sentence=buildSentenceRangesFromSpans(group)[0].range;
 showSelectionHighlight(sentence);const text=state.selSpans.map(s=>s.textContent).join('');
 const ok=text.includes('Left')&&!text.includes('Right')&&!text.includes('Second');clearSelectionHighlight();return ok;})()''')
check('pointer cancel and background clear long-press/drag state', '''(async()=>{
 state.format='txt';dragSel={};state.touchSelecting=true;state.dragRange=document.createRange();
 touchSelTimer=setTimeout(()=>{throw Error('stale long press')},50);
 els.mainArea.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true}));
 if(dragSel||state.touchSelecting||state.dragRange||touchSelTimer)return false;
 touchSelTimer=setTimeout(()=>{throw Error('background long press')},50);
 stopBackgroundActivity();await new Promise(r=>setTimeout(r,100));return !touchSelTimer&&pdfTasks.render===null&&pdfTasks.text===null;})()''')
check('background cancels PDF file-read before a PDF.js task exists', """(async()=>{
 state.format='pdf';state.pdfDoc=null;let release;
 const pending=initPdf({arrayBuffer:()=>new Promise(r=>release=r)});
 const before=readerEpoch.book;stopBackgroundActivity();release(new ArrayBuffer(0));await pending;
 return readerEpoch.book===before+1&&pdfTasks.loading===null&&state.pdfDoc===null&&state.format===null;
})()""")
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
finally:
    c.call('Network.emulateNetworkConditions', offline=False, latency=0, downloadThroughput=-1, uploadThroughput=-1)
    c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=preload)
print('ALL MIGRATION AUDIT CHECKS PASSED', flush=True)
