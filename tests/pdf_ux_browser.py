"""PDF UX regression checks via a disposable Chrome CDP session (Python stdlib only).
Start a local server on 8765 and Chrome with --remote-debugging-port=9222.
No AI request or real credentials are used. Share/clipboard OS dialogs are mocked.
"""
import base64, json, os, socket, struct, time, urllib.request

from browser_cdp import CDP, pdf_bytes

c=CDP(); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
# Keep gesture/timer waits on the browser clock even when the Python process is descheduled.
def pause(seconds): c.js(f'new Promise(resolve=>setTimeout(resolve,{seconds * 1000}))')
c.call('Emulation.setDeviceMetricsOverride',width=900,height=1200,deviceScaleFactor=2,mobile=True)
c.call('Emulation.setTouchEmulationEnabled',enabled=True,maxTouchPoints=5)
c.call('Page.navigate',url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'));c.wait("document.readyState==='complete' && !document.body.inert")
pause(1)
print('app loaded:', c.js('typeof navigateToPdfPage'))
data=base64.b64encode(pdf_bytes()).decode()
print('loaded PDF:',c.js(f'''(async()=>{{
 localStorage.clear(); state.pdfScale=1; state.pdfFit='width'; state.format='pdf'; state.bookKey='pdf-ux-test';
 document.body.classList.add('pdf-mode','immersive-mode');
 window.__errors=[]; window.addEventListener('error',e=>__errors.push(e.message));
 // Continuous-scroll rewrite: the render primitive is now page-agnostic
 // renderPdfPageInto(pageNum, wrapper, scale, isWanted), called once per page
 // that actually (re-)renders — the direct equivalent of the old single
 // renderPdfPage() for render-counting purposes.
 window.__renders=0; window.__pendingRenders=0; window.__lastRenderAt=performance.now(); window.__realRender=renderPdfPageInto;
 renderPdfPageInto=async(...args)=>{{__renders++;__pendingRenders++;__lastRenderAt=performance.now();try{{return await __realRender(...args)}}finally{{__pendingRenders--;__lastRenderAt=performance.now()}}}};
 const file=new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'fixture.pdf');
 await initPdf(file);return {{pages:state.totalPages,text:els.pages.textContent, canvases:els.pages.querySelectorAll('canvas').length}};
}})()'''))
# The 'pdf-mode'/'immersive-mode' classes above resize #reader-container, which
# navigation.js's ResizeObserver (fixes the HANDOFF.md pagination/resize-sync
# bug) correctly detects and reacts to with a debounced renderPdfPage() call --
# just like tests/pdf_sentence_reselect_browser.py already has to account for.
# Left unhandled, that debounced call can land mid-gesture below and increment
# __renders (or even cancelPdfInteraction() a live pinch) well after setup,
# for a reason unrelated to what each check actually exercises. Wait for it to
# settle before any of the render-counting checks begin.
c.wait('__pendingRenders===0 && performance.now()-window.__lastRenderAt>400', timeout=25)

def check(name, expression, timeout=0):
    result=c.js(expression)
    deadline=time.monotonic()+timeout
    while result is not True and time.monotonic()<deadline:
        pause(.1)
        result=c.js(expression)
    assert result is True, (name,result)
    print('PASS',name)

def touch(kind, points):
    c.call('Input.dispatchTouchEvent',type=kind,touchPoints=[dict(x=x,y=y,id=i,radiusX=5,radiusY=5,force=1) for i,x,y in points])

# The continuous-scroll settle chain (relayoutContinuousPdfAtScale: measure
# pages, render the window, restore the anchor via a requestAnimationFrame)
# has more async steps than the old single-page renderer's swap — give it
# more margin than the original 0.5s to reduce timing-sensitive flakiness
# in this gesture-heavy suite.
def settle(): pause(.8)
check('quick menu preserves PDF state before gesture regressions', "(()=>{const before=JSON.stringify([state.currentIndex,state.pdfScale,state.pdfZoom,els.container.scrollTop,els.container.scrollLeft]);quickMenu.open();quickMenu.close();return before===JSON.stringify([state.currentIndex,state.pdfScale,state.pdfZoom,els.container.scrollTop,els.container.scrollLeft]);})()")
# Opening the wheel collapses the sidebar; wait for its resize-triggered PDF
# render before starting an explicit render that it could otherwise cancel.
c.wait("document.getElementById('quick-menu').hidden && __pendingRenders===0 && performance.now()-window.__lastRenderAt>400", timeout=35)
check('plain text and single text layer',"els.pages.textContent.includes('Hello world') && [...document.querySelectorAll('.pdf-page-wrapper')].every(w=>w.querySelectorAll('.pdf-text-layer').length<=1)", timeout=10)
# instant: a smooth-scroll animation still in flight when the pinch gesture
# below starts (worse under CI's more variable scheduling than local) would
# make the anchor math race against a moving scroll position.
c.js("navigateToPdfPage(2, {instant:true})"); settle()
check('illustration page',"els.pages.textContent.includes('Illustration caption')", timeout=10); settle()
c.js('window.__before=__renders; window.__anchor=pdfZoomAnchor(450,500)')
touch('touchStart',[(1,350,500),(2,550,500)])
for d in [120,150,180,200]: touch('touchMove',[(1,450-d,500),(2,450+d,500)]); pause(.04)
pause(.1)
check('no PDF render during pinch', '__renders===__before && state.pdfZoom>1.8')
check('center focal anchor stable', 'Math.abs(pdfZoomAnchor(450,500).x-__anchor.x)<.004 && Math.abs(pdfZoomAnchor(450,500).y-__anchor.y)<.004')
c.js('window.__preSwap=pdfZoomAnchor()')
touch('touchEnd',[]); settle()
check('render(s) at gesture end', '__renders>__before && Math.abs(state.pdfScale-2)<.05 && state.pdfZoom===1')
check('atomic swap retains center','Math.abs(pdfZoomAnchor().x-__preSwap.x)<.004 && Math.abs(pdfZoomAnchor().y-__preSwap.y)<.004')
# After a pinch takes ownership, the remaining finger must still pan in both
# axes (not merely remain in a pointer map). Real touch events prove movement.
touch('touchStart',[(1,600,600),(2,800,600)])
touch('touchMove',[(1,500,600),(2,800,600)]); pause(.08)
touch('touchEnd',[(1,500,600)])
c.js('window.__panBefore={x:els.container.scrollLeft,y:els.container.scrollTop}')
touch('touchMove',[(2,650,550)]); pause(.08)
check('remaining finger pans horizontally and vertically after pinch',
      'els.container.scrollLeft>__panBefore.x+100 && els.container.scrollTop>__panBefore.y+25')
touch('touchEnd',[]); settle()
c.js('window.__beforeScrollIndex=state.currentIndex; els.container.scrollTop += 5000'); settle()
check('scroll after pinch still tracks active page', 'state.currentIndex>__beforeScrollIndex', timeout=3)
for scale in [2,3,4]:
    c.js(f'setPdfScale({scale})'); settle()
    check(f'{scale*100}% bounded raster and no duplicate layers',f"Math.abs(state.pdfScale-{scale})<.01 && [...document.querySelectorAll('.pdf-page-wrapper')].every(w=>w.querySelectorAll('.pdf-text-layer').length<=1) && activeInkCanvas().width*activeInkCanvas().height<=8000000")
# Edge focal test at high zoom.
c.js('els.container.scrollLeft=300;els.container.scrollTop=600;window.__anchor=pdfZoomAnchor(100,200);window.__before=__renders')
touch('touchStart',[(1,50,200),(2,150,200)])
touch('touchMove',[(1,65,220),(2,135,220)]); pause(.1)
check('edge pinch and moving midpoint','Math.abs(pdfZoomAnchor(100,220).x-__anchor.x)<.004 && Math.abs(pdfZoomAnchor(100,220).y-__anchor.y)<.004')
touch('touchEnd',[]);settle()
# Ink screen width and rollback of a first-finger stroke when second finger
# arrives. Coordinates are computed from the ACTIVE page's own ink canvas
# rect (not hardcoded) — after several zoom/pan gestures above, a page can be
# scrolled/scaled anywhere, and continuous scroll (unlike the old single
# always-centered page) makes a fixed screen point unreliable across runs.
# Reset to a clean, predictable geometry before ink testing — the preceding
# gesture sequence can leave scroll/zoom in a state where the active page's
# canvas is partly or wholly outside the viewport (wider-than-viewport pages
# at high zoom, off-center scroll), which is a property of THAT test's own
# checks, not something ink interaction needs to fight.
# Several async measure/render chains from the preceding zoom-heavy tests can
# still be in flight, each with its own scroll-compensating adjustment (see
# correctPlaceholderSize in pdf-continuous.js) — rather than racing them,
# fully re-initialize the continuous view for the same already-loaded
# document. setupContinuousPdf disconnects the old IntersectionObservers and
# builds entirely fresh tracking state, so no stale in-flight promise from
# before can interfere with what follows.
c.js("state.pdfFit='width';state.pdfScale=1;persistPdfZoom()")
c.js("(async()=>{await setupContinuousPdf(state.pdfDoc,1,null)})()")
c.wait("pdfActivePage===1 && !!activeInkCanvas() && pdfPageWrappers[1].querySelector('canvas.pdf-canvas') && els.container.scrollTop===0", timeout=10)
c.js("state.inkMode=true;document.body.classList.add('ink-mode');inkWidth.value='0.5';window.__n=inkStrokes().length")
# Defensive: clamp the computed point into the actual viewport regardless of
# exactly where scroll settled, so a residual few-px offset can't push the
# touch point off-screen the way a raw r.top/r.left would.
ink_pt = c.js("""(()=>{
  const r=activeInkCanvas().getBoundingClientRect();
  return {x:Math.max(20,Math.min(innerWidth-20,r.left+r.width*0.3)),
          y:Math.max(20,Math.min(innerHeight-20,r.top+r.height*0.3))};
})()""")
p1x, p1y = ink_pt['x'], ink_pt['y']
touch('touchStart',[(1,p1x,p1y)]); touch('touchMove',[(1,p1x+70,p1y+15)]); touch('touchEnd',[])
check('fine ink stored in page coordinates',"inkStrokes().length===__n+1 && Math.abs(inkStrokes().at(-1).w*activeInkCanvas().getBoundingClientRect().width-.5)<.01")
c.js('window.__ink=JSON.stringify(inkStrokes());window.__n=inkStrokes().length')
touch('touchStart',[(1,p1x,p1y+50)])
touch('touchMove',[(1,p1x+15,p1y+55)])
touch('touchStart',[(1,p1x+15,p1y+55),(2,p1x+250,p1y+50)])
touch('touchMove',[(1,p1x-30,p1y+50),(2,p1x+300,p1y+50)]);touch('touchEnd',[]);settle()
check('pinch rolls back accidental ink', 'JSON.stringify(inkStrokes())===__ink')
c.js('setPdfScale(4)');settle()
c.wait('__pendingRenders===0 && performance.now()-window.__lastRenderAt>400', timeout=30)
check('ink unchanged after rerender', 'JSON.stringify(inkStrokes())===__ink')
# Avoid speech and network: intercept only the lookup dispatch, exercise actual word hit testing.
c.js("state.inkMode=false;document.body.classList.remove('ink-mode');state.translateMode=true;els.pages.classList.add('mode-translate');window.__lookup='';window.__realLookup=handleWordOrSelection;handleWordOrSelection=(word,x,y)=>{__lookup=word;els.ttOriginal.textContent=word;els.ttTranslation.textContent='Translation '.repeat(80);els.tooltip.style.display='flex';positionTooltip(x,y)}; els.container.scrollLeft=0;els.container.scrollTop=0")
pos=c.js("(()=>{const r=els.pages.querySelector('.pdf-text-layer span').getBoundingClientRect();return {x:r.left+20,y:r.top+r.height/2}})()")
touch('touchStart',[(1,pos['x'],pos['y'])]);touch('touchEnd',[]);settle()
check('tap word at 400% opens translation','__lookup.length>0 && els.tooltip.style.display==="flex"', timeout=5)
check('real PDF word tap records one exact help occurrence','calculateCurrentPageStats().helped===1')
check('translation screen overlay bounded',"(()=>{const r=els.tooltip.getBoundingClientRect();return els.tooltip.parentElement===document.body && r.left>=0 && r.top>=0 && r.right<=innerWidth && r.bottom<=innerHeight})()")
# Crop capture includes ink; actual crop selection through pointer stream.
c.js("invalidateSelection();document.getElementById('btn-region').click();window.__vision=0;callAIVision=async(prompt,data)=>{__vision++;window.__visionData=data;return 'Test response'}")
touch('touchStart',[(1,200,350)]);touch('touchMove',[(1,620,650)]);touch('touchEnd',[]);settle()
check('crop preview without AI','cropDialog.open && cropBlob.type==="image/png" && __vision===0')
# Verify Save payload, Share and Copy API branches without platform UI.
c.js("window.__download='';HTMLAnchorElement.prototype.click=function(){__download=this.download};document.getElementById('crop-save').click()")
check('crop Save PNG',"__download==='pdf-page-1.png'")
c.js("Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shared=data.files[0]}});document.getElementById('crop-share').click()")
check('crop Share file',"__shared.type==='image/png' && __shared.size>0")
c.js("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items=>{window.__copied=items[0]}}});document.getElementById('crop-copy').click()")
check('crop Copy PNG',"__copied.types.includes('image/png')")
# Before AI test: preserve cropData, mock aiAvailable() to return true
c.js("window.__savedCropData=cropData;window.__realAiAvailable=aiAvailable;aiAvailable=()=>true")
c.js("document.getElementById('crop-ai').click()")
# Wait for async checkExerciseImage to complete, close dialog, and update DOM
# Poll for expected state instead of fixed sleep
result=c.js('''(()=>{
  const checks={
    vision: __vision,
    hasData: typeof __visionData,
    startsWith: __visionData?.startsWith("data:image/jpeg;"),
    dialogOpen: cropDialog.open,
    blobNull: cropBlob===null
  };
  return checks;
})()''')
deadline=time.monotonic()+2
while result['vision']!=1 or not result['startsWith'] or result['dialogOpen'] or not result['blobNull']:
    if time.monotonic()>deadline: break
    pause(.1)
    result=c.js('''(()=>{
  const checks={
    vision: __vision,
    hasData: typeof __visionData,
    startsWith: __visionData?.startsWith("data:image/jpeg;"),
    dialogOpen: cropDialog.open,
    blobNull: cropBlob===null
  };
  return checks;
})()''')
print(f"AI check results: {result}")
check('AI only after explicit action','__vision===1 && __visionData.startsWith("data:image/jpeg;") && !cropDialog.open && cropBlob===null')
# Restore original aiAvailable and verify guard works with no AI config
c.js("aiAvailable=window.__realAiAvailable;delete window.__realAiAvailable;__vision=0;window.__visionData=null")
# Re-open crop dialog for second test using saved cropData
c.js("openCropPreview(window.__savedCropData)")
check('crop preview reopened', "cropDialog.open && cropBlob.type==='image/png'")
# Mock aiAvailable to false and verify no AI call is made and status message appears
c.js("aiAvailable=()=>false;document.getElementById('crop-ai').click()")
pause(.2)
status_check=c.js("({dialogOpen: cropDialog.open, blobType: cropBlob?.type, statusText: document.getElementById('crop-status').textContent, vision: __vision})")
print(f"No AI key check results: {status_check}")
check('crop preserved when no AI key','cropDialog.open && cropBlob.type==="image/png" && document.getElementById("crop-status").textContent.length>0 && __vision===0')
# Restore original aiAvailable
c.js("aiAvailable=()=>true")
c.js("els.askPanel.classList.remove('expanded')")
# Closing the panel changes #reader-container's width, which (correctly,
# per spec §8) triggers a DEBOUNCED (250ms, navigation.js) relayout that
# resizes pages and restores the reading position — give that its own
# settle window before treating state as static, rather than letting it
# land unpredictably mid-way through the unrelated scrubber test below.
settle(); c.wait("performance.now()-window.__lastRenderAt>400", timeout=3)
# Scrubber input previews only, commit once at pointer release.
c.js("navigateToPdfPage(1, {instant:true})"); settle()
c.js("window.__before=__renders;scrubDragging=true;for(let i=3;i<=110;i++){pdfPageRange.value=i;pdfPageRange.dispatchEvent(new Event('input'))}")
check('scrubber previews 108 values without rendering', '__renders===__before && state.currentIndex===1')
c.js("pdfPageRange.dispatchEvent(new PointerEvent('pointerup'))");settle()
check('scrubber commits distant page', '__renders>__before && state.currentIndex===110', timeout=10)
# Landscape resize retains center and tablet breakpoint.
c.js('window.__focus=pdfAnchor()')
c.call('Emulation.setDeviceMetricsOverride',width=1180,height=820,deviceScaleFactor=2,mobile=True);settle();settle()
check('landscape render and focus',"state.currentIndex===110 && Math.abs(pdfAnchor().x-__focus.x)<.03 && [...document.querySelectorAll('.pdf-page-wrapper')].every(w=>w.querySelectorAll('.pdf-text-layer').length<=1)", timeout=10)
# Real slider drag must not leak an edge-navigation click into the reader.
coords=c.js("(()=>{const r=pdfPageRange.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height*.25,z:r.top+r.height*.7}})()")
touch('touchStart',[(1,coords['x'],coords['y'])]);touch('touchMove',[(1,coords['x'],coords['z'])]);touch('touchEnd',[]);settle()
check('real scrubber touch matches preview page', 'state.currentIndex===Number(pdfPageRange.value) && !pdfBlockClick')
# Both fit modes coexist with the free scale.
c.js("document.getElementById('pdf-fit').value='page';document.getElementById('pdf-fit').dispatchEvent(new Event('change'))");settle()
c.wait('__pendingRenders===0')
# 'fit page' means each INDIVIDUAL page fits the viewport, not the whole
# stacked document (which spans all 120 pages in continuous scroll — fitting
# THAT in one viewport height would defeat the point of continuous scroll).
check('fit page in landscape', "(()=>{const r=pdfPageWrappers[pdfActivePage].getBoundingClientRect();return r.height<=els.container.clientHeight+1 && r.width<=els.container.clientWidth+1})()")
c.js("document.getElementById('pdf-fit').value='width';document.getElementById('pdf-fit').dispatchEvent(new Event('change'))");settle()
c.wait('__pendingRenders===0')
check('fit width restores 100%', "state.pdfScale===1 && els.container.scrollWidth<=els.container.clientWidth+1")
# Native modal joins Claude's Android Back overlay stack.
c.js("openCropPreview(cropPdfRegion({left:100,top:100,width:300,height:300}))");settle()
check('crop tracked by Android Back stack', "topOpenOverlay()==='crop' && overlayHistoryDepth>0")
c.js('history.back()');settle()
check('Back closes crop without leaving reader', "!cropDialog.open && state.format==='pdf'")
# Crop clipping correctly intersects a selection starting outside the canvas.
# Reference the SAME page's canvas throughout — continuous scroll can have
# several pages rendered at once, and the first '.pdf-canvas' match in DOM
# order isn't necessarily state.currentIndex, which is what cropPdfRegion's
# no-wrapper-given fallback actually targets.
check('crop clips both left and top edges', "(async()=>{const cv=pdfPageWrappers[state.currentIndex].querySelector('canvas.pdf-canvas');const r=cv.getBoundingClientRect();const d=cropPdfRegion({left:r.left-100,top:r.top-100,width:120,height:130});const im=new Image();im.src=d;await im.decode();const k=cv.width/r.width;return Math.abs(im.width-20*k)<=1 && Math.abs(im.height-30*k)<=1})()")
# Repeated zooms must release detached DOM/listeners after garbage collection.
c.call('HeapProfiler.collectGarbage'); baseline=c.call('Memory.getDOMCounters')
c.js("(async()=>{for(let i=0;i<24;i++){state.pdfFit='free';state.pdfScale=1+i%4;relayoutContinuousPdfAtScale();await new Promise(r=>setTimeout(r,20))}})()")
# The 24th cycle's own render is legitimate (not superseded by anything) and
# may still be finishing its rasterization right as the loop above returns —
# waiting it out here (like pdf_rendering_audit_browser.py's __pdfSettled)
# avoids snapshotting DOM counts mid-render, which would count real
# in-progress work as if it were unreleased garbage.
c.js("(async()=>{for(let i=0;i<200&&pdfInFlightRenders>0;i++)await new Promise(r=>setTimeout(r,50))})()")
c.call('HeapProfiler.collectGarbage'); after=c.call('Memory.getDOMCounters')
assert after['jsEventListeners']<=baseline['jsEventListeners']+3,(baseline,after)
assert after['nodes']<=baseline['nodes']+20,(baseline,after)
print('PASS 24 zoom cycles: DOM/listeners bounded',baseline,after)
# Portrait phone bottom sheet remains inside the viewport at maximum PDF zoom.
c.js('window.__before=__renders')
c.call('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=2,mobile=True)
c.wait('__renders>__before && __pendingRenders===0', timeout=45)
c.js("els.ttOriginal.textContent='Example';els.ttTranslation.textContent='Translation '.repeat(100);els.tooltip.style.display='flex';positionTooltip(380,820)")
check('phone original text visible', 'els.ttOriginal.getBoundingClientRect().width>=70')
check('phone bottom sheet bounded', "(()=>{const r=els.tooltip.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight})()")
c.js("els.ttOriginal.textContent='Ils (plaindre) la pauvre femme et ils ne savaient pas quoi faire pour aider dans cette situation.';positionTooltip(195,400)")
check('phone long selection original truncated', "els.ttOriginal.scrollWidth > els.ttOriginal.clientWidth")
check('phone action buttons within tooltip bounds', "(()=>{const tr=els.tooltip.getBoundingClientRect();const btns=[els.ttReplayBtn,els.ttExpandBtn,els.ttSvoBtn,els.ttAskBtn,els.ttAiBtn];return btns.every(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=tr.left-1&&r.right<=tr.right+1&&r.top>=tr.top-1&&r.bottom<=tr.bottom+1;})})()")
# Background aborts pending PDF work; state remains persisted.
c.js("window.__task=beginAsyncTask('test-background');window.__before=__renders;setPdfScale(3);document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'))")
settle()
check('background cancels render/tasks and persists',"__task.signal.aborted && pdfTasks.render===null && pdfTasks.text===null && pdfPointers.size===0 && Number(localStorage.reader_pdf_scale)===3")
check('no application errors','__errors.length===0')
print('ALL CHECKS PASSED')
