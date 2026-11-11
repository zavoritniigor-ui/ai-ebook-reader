"""800x1280 tablet: >300 MiB streamed files, serial batch/failure/retry,
byte-range PDF opening, saved-file reopening, sidebar scale, full translation.
Synthetic PDFs have a large unreferenced stream (not a compressed/bomb fixture).
No credentials, live AI or external libraries are used.
"""
import base64, json, os, time, tempfile
from pathlib import Path
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=800, height=1280, deviceScaleFactor=1, mobile=True)
c.call('Page.navigate', url=URL)
READY = "document.readyState==='complete' && !document.body.inert && typeof enqueueLibraryBook==='function'"
c.wait(READY, timeout=30)
c.js("localStorage.clear(); showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); state.pdfScale=1; state.pdfFit='width'; 1")

def check(name, expr, timeout=0):
    end = time.monotonic() + timeout
    while True:
        result = c.js(expr)
        if result is True: break
        assert time.monotonic() < end, (name, result)
        time.sleep(.1)
    print('PASS', name, flush=True)

def screenshot(name):
    directory = Path(os.environ.get('READER_SCREENSHOT_DIR', str(Path(tempfile.gettempdir()) / 'pdf-large-publications')))
    directory.mkdir(parents=True, exist_ok=True)
    data = c.call('Page.captureScreenshot', format='png')['data']
    (directory / name).write_bytes(base64.b64decode(data))

# Padding before xref keeps all object offsets valid, and xref/startxref point
# straight to disk's tail. It tests real PDF.js range I/O, not a fake large size.
pdf = pdf_document([{'text': 'A complete large publication page %d.' % i} for i in range(1, 5)])
xref = pdf.index(b'xref\n')
padding = 301 * 1024 * 1024
prefix = pdf[:xref] + f'99 0 obj\n<< /Length {padding} >>\nstream\n'.encode()
endstream = b'\nendstream\nendobj\n'
new_xref = len(prefix) + padding + len(endstream)
suffix = endstream + pdf[xref:].replace(f'startxref\n{xref}'.encode(), f'startxref\n{new_xref}'.encode())
c.js(f"window.__prefix=Uint8Array.from(atob('{base64.b64encode(prefix).decode()}'),ch=>ch.charCodeAt(0)); window.__suffix=Uint8Array.from(atob('{base64.b64encode(suffix).decode()}'),ch=>ch.charCodeAt(0)); 1")
c.js("""(() => {
  window.__nativeFetch=window.fetch; window.__active=0; window.__peak=0; window.__started=[]; window.__fail=true; window.__beats=0;
  window.__beat=setInterval(()=>__beats++,10);
  const length=__prefix.length+301*1048576+__suffix.length;
  window.fetch=async(url,opts)=>{
    url=String(url);
    if(url.includes('op=ia-files')) return new Response(JSON.stringify({scan:true,series:'Tablet Journal',volume:'12',issue:'7',files:[{name:'issue.pdf',format:'Text PDF',size:length}]}));
    if(url.includes('op=ia-file')) {
      const id=new URL(url,location.href).searchParams.get('id'); __started.push(id);
      if(id==='issue-b' && __fail) { __fail=false; return new Response('failure',{status:503}); }
      __active++; __peak=Math.max(__peak,__active); let phase=0,remaining=301*1048576;
      return new Response(new ReadableStream({pull(ctrl){
        if(phase===0){ctrl.enqueue(__prefix);phase++;}
        else if(remaining){const n=Math.min(1048576,remaining);ctrl.enqueue(new Uint8Array(n));remaining-=n;}
        else {ctrl.enqueue(__suffix);ctrl.close();__active--;}
      }}),{headers:{'content-length':String(length),'content-type':'application/pdf'}});
    }
    return __nativeFetch(url,opts);
  };
  openLibrary();
  const list=document.getElementById('library-list');list.replaceChildren();
  for(const id of ['issue-a','issue-b','issue-c']){const card=libraryCard({ia:true,id,title:'Tablet Journal '+id,pdf:true,series:'Tablet Journal',volume:'12',issue:id});list.append(card);card.querySelector('.library-select').click();}
  document.getElementById('library-batch').click();
  return 1;
})()""")
check('three large downloads complete independently; second fails and third continues', "!libraryQueueRunning && [...libraryDownloads.values()].map(i=>i.state).join(',')==='saved,failed,saved'", 120)
check('queue is serial, progress yields to UI, each saved PDF exceeds 300 MiB', "__peak===1 && __beats>5 && [...libraryDownloads.values()].filter(i=>i.state==='saved').every(i=>i.got>300*1048576) && document.querySelectorAll('#library-downloads .library-download').length===3")
c.js("document.querySelector('#library-downloads [data-state=failed] button').click(); 1")
check('retry only re-downloads the failed issue', "!libraryQueueRunning && [...libraryDownloads.values()].every(i=>i.state==='saved') && __started.join(',')==='issue-a,issue-b,issue-c,issue-b'", 120)
check('all large files survive shelf retention with supplied series metadata', "(async()=>{const a=(await listShelfBooks()).filter(b=>b.sourceId?.startsWith('issue-'));return a.length===3 && a.every(b=>b.size>300*1048576 && b.series==='Tablet Journal' && b.volume==='12' && b.issue==='7');})()")
# Reload: no retained File/queue cache can satisfy reopening.
c.call('Page.reload'); c.wait(READY, timeout=30)
c.js("""(async()=>{ const books=(await listShelfBooks()).filter(b=>b.sourceId?.startsWith('issue-'));window.__keys=books.map(b=>b.key);
  window.__wholeReads=0;window.__rangeBytes=0;window.__maxRead=0;const orig=Blob.prototype.arrayBuffer;
  Blob.prototype.arrayBuffer=function(){if(this.size>300*1048576)__wholeReads++;else{__rangeBytes+=this.size;__maxRead=Math.max(__maxRead,this.size);}return orig.call(this);};
  els.sidebar.classList.add('collapsed');state.pdfFit='width';state.pdfScale=1; await openShelfBook(__keys[0]);return 1;})()""")
check('saved large PDF opens in real PDF.js without a whole-file ArrayBuffer', "pdfContinuousReady && pdfRenderedPages.has(1) && state.totalPages===4 && __wholeReads===0 && __maxRead<=1048576 && __rangeBytes<8*1048576", 30)
check('thumbnail sidebar opens at readable fit width', "(async()=>{els.sidebar.classList.remove('collapsed');await new Promise(r=>setTimeout(r,800));const w=pdfPageWrappers[state.currentIndex].getBoundingClientRect().width;return w>450 && Math.abs(w-pdfContainerAvailWidth())<3;})()")
check('navigation during sidebar resize keeps both page edges inside the reading area', "(async()=>{els.sidebar.classList.add('collapsed');await new Promise(r=>setTimeout(r,650));els.sidebar.classList.remove('collapsed');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));navigateToPdfPage(3,{instant:true});await new Promise(r=>setTimeout(r,900));const c=els.container.getBoundingClientRect(),w=pdfPageWrappers[3].getBoundingClientRect(),p=els.pages.getBoundingClientRect();return Math.abs(p.width-pdfContainerAvailWidth())<3 && w.left>=c.left-2 && w.right<=c.right+2 || JSON.stringify({container:{left:c.left,right:c.right,width:c.width},page:{left:w.left,right:w.right,width:w.width},stack:p.width});})()")
c.js("pdfThumbItems[3].click(); 1")
check('thumbnail navigates to selected page', "state.currentIndex===3 && pdfRenderedPages.has(3)", 15)
check('closing and reopening sidebar recalculates width without shrinking cumulatively', "(async()=>{for(let i=0;i<3;i++){els.sidebar.classList.add('collapsed');await new Promise(r=>setTimeout(r,650));els.sidebar.classList.remove('collapsed');await new Promise(r=>setTimeout(r,650));}return Math.abs(pdfPageWrappers[state.currentIndex].getBoundingClientRect().width-pdfContainerAvailWidth())<3;})()")
# An old width-fit setting must not inherit an unrelated free zoom multiplier.
check('fit width ignores a stale free zoom multiplier', "(()=>{state.pdfScale=.25;state.pdfFit='width';relayoutContinuousPdfAtScale();return Math.abs(pdfPageWrappers[state.currentIndex].getBoundingClientRect().width-pdfContainerAvailWidth())<3;})()")
screenshot('tablet-sidebar.png')
c.js("window.__cachedKeys=__keys; 1")
for i in (1, 2):
    c.js(f"(async()=>{{await openShelfBook(__cachedKeys[{i}]);return 1;}})()")
    check('reopen saved queued issue '+str(i), "pdfContinuousReady && pdfRenderedPages.has(state.currentIndex) && __wholeReads===0", 30)
# Long translations: preserve every source character, complete ordered chunks,
# and retry a truncated plain reply rather than display its prefix as complete.
c.js("state.groqKey='test-not-a-key'; state.sharedGroqKey=''; window.__calls=[]; callAI=async(prompt,signal,task,unused,options)=>{__calls.push(prompt); const m=prompt.match(/цей фрагмент: \"([\\s\\S]*?)\"/);return m?'Переклад '+m[1]:'Переклад';}; 1")
check('long translation sends and returns the ENTIRE source, including final marker', "(async()=>{const source=('Sentence with selected text. '.repeat(250))+'FINAL_MARKER';const chunks=translationChunks(source);const result=await aiTranslateText(source,'en',null,'uk','',false,'groq');return chunks.join('')===source && __calls.length===chunks.length && result.includes('FINAL_MARKER') && chunks.every(s=>s.length<=1700);})()")
check('truncated plain reply is replaced by complete smaller requests', "(async()=>{let n=0;callAI=async()=>{if(++n===1)throw new AiRequestError('cut','truncated',{partial:'Лише початок'});return 'Повний переклад.';};const r=await aiTranslateText('A selected passage that must be translated completely. '.repeat(8),'en',null,'uk','',false,'groq');return n>=3 && r && !r.includes('Лише початок');})()")
check('translation popup scrolls all the way to the final line on tablet', "(()=>{els.tooltip.style.display='flex';els.ttOriginal.textContent='Long selected passage';els.ttTranslation.textContent='Повний переклад. '.repeat(1800)+'LAST_LINE';positionTooltip(400,400,{left:350,right:450,top:380,bottom:400,width:100,height:20});const tr=els.ttTranslation;tr.scrollTop=tr.scrollHeight;return tr.scrollHeight>tr.clientHeight+100 && tr.scrollTop>0 && tr.scrollHeight-tr.scrollTop-tr.clientHeight<3 && els.tooltip.getBoundingClientRect().bottom<=1280;})()")
check('device and offline fallback chunks preserve the full selected source', "(async()=>{const source='Continuous selected text. '.repeat(300)+'FINAL';const seen=[];const out=await translateCompleteSelection(source,async part=>{seen.push(part);return part;});return seen.join('')===source && seen.every(s=>s.length<=1700) && out.endsWith('FINAL');})()")
screenshot('tablet-translation.png')
# Remove only this suite's records; temporary staging is cleaned on next launch.
c.js("(async()=>{for(const key of __cachedKeys)await removeShelfBook(key);return 1;})()")
# Real PDF.js text layer, newspaper columns, and actual long-press touch drags.
# The endpoints are adjacent in the PDF stream; paragraph interiors follow them.
news_lines = [('Other organizations', 220, 680, 12), ('The Dementia Action', 220, 530, 12),
              ('representing people', 220, 660, 12), ('living with dementia', 220, 640, 12),
              ('are calling for more', 220, 620, 12), ('research and careful', 220, 600, 12),
              ('monitoring of safety.', 220, 580, 12)]
for x in (40, 420):
    for y in (680, 660, 640, 620, 600, 580, 530):
        news_lines.append(('Neighbour column.', x, y, 12))
news_pdf = base64.b64encode(pdf_document([{'lines': news_lines}])).decode()
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
c.js(f"""(async()=>{{els.sidebar.classList.add('collapsed');state.pdfFit='width';state.pdfScale=1;
  els.tooltip.style.display='none';window.__sent=[];handleWordOrSelection=async text=>{{__sent.push(text);}};
  if(!state.translateMode)els.translateBtn.click();
  await openBookFile(new File([Uint8Array.from(atob('{news_pdf}'),ch=>ch.charCodeAt(0))],'newspaper.pdf',{{type:'application/pdf'}}));return 1;}})()""")
c.wait("pdfRenderedPages.has(1) && pdfInFlightRenders===0", timeout=20)
time.sleep(.8)

def touch_points(x, y):
    return [{'x': x, 'y': y, 'id': 1, 'radiusX': 2, 'radiusY': 2, 'force': 1}]

for reverse in (False, True):
    coords = c.js("""(()=>{const spans=pdfTextSpans(pdfPageWrappers[1].querySelector('.pdf-text-layer'));
      const box=t=>spans.find(s=>s.textContent===t).getBoundingClientRect();const a=box('Other organizations'),b=box('The Dementia Action');
      return {a:{x:a.left+2,y:a.top+a.height/2},b:{x:b.right-2,y:b.top+b.height/2}};})()""")
    a, b = (coords['b'], coords['a']) if reverse else (coords['a'], coords['b'])
    c.js("__sent.length=0; 1")
    c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=touch_points(a['x'], a['y']))
    time.sleep(.65)
    for step in range(1, 16):
        c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=touch_points(a['x']+(b['x']-a['x'])*step/15, a['y']+(b['y']-a['y'])*step/15))
        time.sleep(.02)
    c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
    time.sleep(.85)  # let the reader's 700 ms post-touch click guard expire
    check('actual touch drag keeps all paragraphs in its newspaper column, reverse='+str(reverse),
          "__sent.at(-1)==='Other organizations representing people living with dementia are calling for more research and careful monitoring of safety. The Dementia Action' || JSON.stringify({sent:__sent,selection:state.lastSelectionText,canonical:state.canonicalSelection?.text})")
screenshot('tablet-newspaper-selection.png')
print('ALL LARGE PUBLICATION CHECKS PASSED', flush=True)
