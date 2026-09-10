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
c.call('Page.navigate',url='http://127.0.0.1:8765/index.html');c.wait("document.readyState==='complete' && !document.body.inert")
pause(1)
print('app loaded:', c.js('typeof renderPdfPage'))
data=base64.b64encode(pdf_bytes()).decode()
print('loaded PDF:',c.js(f'''(async()=>{{
 localStorage.clear(); state.pdfScale=1; state.pdfFit='width'; state.format='pdf'; state.bookKey='pdf-ux-test';
 document.body.classList.add('pdf-mode','immersive-mode');
 window.__errors=[]; window.addEventListener('error',e=>__errors.push(e.message));
 window.__renders=0; window.__pendingRenders=0; window.__realRender=renderPdfPage;
 renderPdfPage=async(...args)=>{{__renders++;__pendingRenders++;try{{return await __realRender(...args)}}finally{{__pendingRenders--}}}};
 const file=new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'fixture.pdf');
 await initPdf(file);return {{pages:state.totalPages,text:els.pages.textContent, canvases:els.pages.querySelectorAll('canvas').length}};
}})()'''))

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

def settle(): pause(.5)
check('plain text and single text layer',"els.pages.textContent.includes('Hello world') && document.querySelectorAll('.pdf-text-layer').length===1", timeout=10)
check('illustration page',"(async()=>await renderPdfPage(2) && els.pages.textContent.includes('Illustration caption'))()")
c.js("Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))")
c.js('window.__before=__renders; window.__anchor=pdfAnchor(450,500)')
touch('touchStart',[(1,350,500),(2,550,500)])
for d in [120,150,180,200]: touch('touchMove',[(1,450-d,500),(2,450+d,500)]); pause(.04)
c.js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
check('no PDF render during pinch', '__renders===__before && state.pdfZoom>1.8')
check('center focal anchor stable', 'Math.abs(pdfAnchor(450,500).x-__anchor.x)<.004 && Math.abs(pdfAnchor(450,500).y-__anchor.y)<.004')
c.js('window.__preSwap=pdfAnchor()')
touch('touchEnd',[]); settle()
check('one render at gesture end', '__renders===__before+1 && Math.abs(state.pdfScale-2)<.05 && state.pdfZoom===1')
check('atomic swap retains center','Math.abs(pdfAnchor().x-__preSwap.x)<.004 && Math.abs(pdfAnchor().y-__preSwap.y)<.004')
# One remaining finger continues panning after pinch.
touch('touchStart',[(1,600,600),(2,800,600)])
touch('touchMove',[(1,500,600),(2,800,600)]); pause(.08)
touch('touchEnd',[(2,800,600)])
c.js('window.__scroll=els.container.scrollTop')
touch('touchMove',[(1,460,450)]); touch('touchEnd',[]); settle()
check('pan after pinch with remaining finger', 'els.container.scrollTop>__scroll+100 && state.currentIndex===2')
for scale in [2,3,4]:
    c.js(f'setPdfScale({scale})'); settle()
    check(f'{scale*100}% bounded raster and no duplicate layers',f"Math.abs(state.pdfScale-{scale})<.01 && document.querySelectorAll('.pdf-text-layer').length===1 && inkCanvas().width*inkCanvas().height<=8000000")
# Edge focal test at high zoom.
c.js('els.container.scrollLeft=300;els.container.scrollTop=600;window.__anchor=pdfAnchor(100,200);window.__before=__renders')
touch('touchStart',[(1,50,200),(2,150,200)])
touch('touchMove',[(1,65,220),(2,135,220)]); pause(.1)
check('edge pinch and moving midpoint','Math.abs(pdfAnchor(100,220).x-__anchor.x)<.004 && Math.abs(pdfAnchor(100,220).y-__anchor.y)<.004')
touch('touchEnd',[]);settle()
# Ink screen width and rollback of a first-finger stroke when second finger arrives.
c.js("state.inkMode=true;document.body.classList.add('ink-mode');inkWidth.value='0.5';window.__n=inkStrokes().length")
touch('touchStart',[(1,350,450)]); touch('touchMove',[(1,420,465)]); touch('touchEnd',[])
check('fine ink stored in page coordinates',"inkStrokes().length===__n+1 && Math.abs(inkStrokes().at(-1).w*inkCanvas().getBoundingClientRect().width-.5)<.01")
c.js('window.__ink=JSON.stringify(inkStrokes());window.__n=inkStrokes().length')
touch('touchStart',[(1,350,500)])
touch('touchMove',[(1,365,505)])
touch('touchStart',[(1,365,505),(2,600,500)])
touch('touchMove',[(1,320,500),(2,650,500)]);touch('touchEnd',[]);settle()
check('pinch rolls back accidental ink', 'JSON.stringify(inkStrokes())===__ink')
c.js('setPdfScale(4)');settle()
check('ink unchanged after rerender', 'JSON.stringify(inkStrokes())===__ink')
# Avoid speech and network: intercept only the lookup dispatch, exercise actual word hit testing.
c.js("state.inkMode=false;document.body.classList.remove('ink-mode');state.translateMode=true;els.pages.classList.add('mode-translate');window.__lookup='';window.__realLookup=handleWordOrSelection;handleWordOrSelection=(word,x,y)=>{__lookup=word;els.ttOriginal.textContent=word;els.ttTranslation.textContent='Translation '.repeat(80);els.tooltip.style.display='flex';positionTooltip(x,y)}; els.container.scrollLeft=0;els.container.scrollTop=0")
pos=c.js("(()=>{const r=els.pages.querySelector('.pdf-text-layer span').getBoundingClientRect();return {x:r.left+20,y:r.top+r.height/2}})()")
touch('touchStart',[(1,pos['x'],pos['y'])]);touch('touchEnd',[]);settle()
check('tap word at 400% opens translation','__lookup.length>0 && els.tooltip.style.display==="flex"')
check('real PDF word tap records one exact help occurrence','calculateCurrentPageStats().helped===1')
check('translation screen overlay bounded',"(()=>{const r=els.tooltip.getBoundingClientRect();return els.tooltip.parentElement===document.body && r.left>=0 && r.top>=0 && r.right<=innerWidth && r.bottom<=innerHeight})()")
# Crop capture includes ink; actual crop selection through pointer stream.
c.js("invalidateSelection();document.getElementById('btn-region').click();window.__vision=0;callAIVision=async(prompt,data)=>{__vision++;window.__visionData=data;return 'Test response'}")
touch('touchStart',[(1,200,350)]);touch('touchMove',[(1,620,650)]);touch('touchEnd',[]);settle()
check('crop preview without AI','cropDialog.open && cropBlob.type==="image/png" && __vision===0')
# Verify Save payload, Share and Copy API branches without platform UI.
c.js("window.__download='';HTMLAnchorElement.prototype.click=function(){__download=this.download};document.getElementById('crop-save').click()")
check('crop Save PNG',"__download==='pdf-page-2.png'")
c.js("Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shared=data.files[0]}});document.getElementById('crop-share').click()")
check('crop Share file',"__shared.type==='image/png' && __shared.size>0")
c.js("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items=>{window.__copied=items[0]}}});document.getElementById('crop-copy').click()")
check('crop Copy PNG',"__copied.types.includes('image/png')")
c.js("document.getElementById('crop-ai').click()")
check('AI only after explicit action','__vision===1 && __visionData.startsWith("data:image/jpeg;") && !cropDialog.open && cropBlob===null')
c.js("els.askPanel.classList.remove('expanded')");settle()
# Scrubber input previews only, commit once at pointer release.
c.js("window.__before=__renders;scrubDragging=true;for(let i=3;i<=110;i++){pdfPageRange.value=i;pdfPageRange.dispatchEvent(new Event('input'))}")
check('scrubber previews 108 values without rendering', '__renders===__before && state.currentIndex===2')
c.js("pdfPageRange.dispatchEvent(new PointerEvent('pointerup'))");settle()
check('scrubber commits distant page once', '__renders===__before+1 && state.currentIndex===110', timeout=10)
# Landscape resize retains center and tablet breakpoint.
c.js('window.__focus=pdfAnchor()')
c.call('Emulation.setDeviceMetricsOverride',width=1180,height=820,deviceScaleFactor=2,mobile=True);settle();settle()
check('landscape render and focus',"state.currentIndex===110 && Math.abs(pdfAnchor().x-__focus.x)<.03 && document.querySelectorAll('.pdf-text-layer').length===1", timeout=10)
# Real slider drag must not leak an edge-navigation click into the reader.
coords=c.js("(()=>{const r=pdfPageRange.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height*.25,z:r.top+r.height*.7}})()")
touch('touchStart',[(1,coords['x'],coords['y'])]);touch('touchMove',[(1,coords['x'],coords['z'])]);touch('touchEnd',[]);settle()
check('real scrubber touch matches preview page', 'state.currentIndex===Number(pdfPageRange.value) && !pdfBlockClick')
# Both fit modes coexist with the free scale.
c.js("document.getElementById('pdf-fit').value='page';document.getElementById('pdf-fit').dispatchEvent(new Event('change'))");settle()
c.wait('__pendingRenders===0')
check('fit page in landscape', "(()=>{const r=els.pages.getBoundingClientRect();return r.height<=els.container.clientHeight && r.width<=els.container.clientWidth})()")
c.js("document.getElementById('pdf-fit').value='width';document.getElementById('pdf-fit').dispatchEvent(new Event('change'))");settle()
c.wait('__pendingRenders===0')
check('fit width restores 100%', "state.pdfScale===1 && els.container.scrollWidth<=els.container.clientWidth+1")
# Native modal joins Claude's Android Back overlay stack.
c.js("openCropPreview(cropPdfRegion({left:100,top:100,width:300,height:300}))");settle()
check('crop tracked by Android Back stack', "topOpenOverlay()==='crop' && overlayHistoryDepth>0")
c.js('history.back()');settle()
check('Back closes crop without leaving reader', "!cropDialog.open && state.format==='pdf'")
# Crop clipping correctly intersects a selection starting outside the canvas.
check('crop clips both left and top edges', "(async()=>{const r=els.pages.querySelector('.pdf-canvas').getBoundingClientRect();const d=cropPdfRegion({left:r.left-100,top:r.top-100,width:120,height:130});const im=new Image();im.src=d;await im.decode();const k=els.pages.querySelector('.pdf-canvas').width/r.width;return Math.abs(im.width-20*k)<=1 && Math.abs(im.height-30*k)<=1})()")
# Repeated zooms must release detached DOM/listeners after garbage collection.
c.call('HeapProfiler.collectGarbage'); baseline=c.call('Memory.getDOMCounters')
c.js("(async()=>{for(let i=0;i<24;i++){state.pdfFit='free';state.pdfScale=1+i%4;await renderPdfPage(state.currentIndex,{preserve:true})}})()")
c.call('HeapProfiler.collectGarbage'); after=c.call('Memory.getDOMCounters')
assert after['jsEventListeners']<=baseline['jsEventListeners']+3,(baseline,after)
assert after['nodes']<=baseline['nodes']+20,(baseline,after)
print('PASS 24 zoom cycles: DOM/listeners bounded',baseline,after)
# Portrait phone bottom sheet remains inside the viewport at maximum PDF zoom.
c.js('window.__before=__renders')
c.call('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=2,mobile=True)
c.wait('__renders>__before && __pendingRenders===0')
c.js("els.ttOriginal.textContent='Example';els.ttTranslation.textContent='Translation '.repeat(100);els.tooltip.style.display='flex';positionTooltip(380,820)")
check('phone original text visible', 'els.ttOriginal.getBoundingClientRect().width>=70')
check('phone bottom sheet bounded', "(()=>{const r=els.tooltip.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight})()")
# Background aborts pending PDF work; state remains persisted.
c.js("window.__task=beginAsyncTask('test-background');window.__before=__renders;setPdfScale(3);document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'))")
settle()
check('background cancels render/tasks and persists',"__task.signal.aborted && pdfTasks.render===null && pdfTasks.text===null && pdfPointers.size===0 && Number(localStorage.reader_pdf_scale)===3")
check('no application errors','__errors.length===0')
print('ALL CHECKS PASSED')
