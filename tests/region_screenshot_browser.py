"""Real mouse/touch region gestures in a paginated text book produce the visible
PNG, not translation. Compare against Chrome's own pixels on a later page,
including theme, an illustration, crop coordinates and DPR; test cancellation.
All rendering is local and the Google action is not pressed in this suite.
"""
import base64, json, os, time
from pathlib import Path
from browser_cdp import CDP

c=CDP();c.call('Page.enable');c.call('Runtime.enable');c.call('Network.enable')
c.call('Network.setBypassServiceWorker',bypass=True);c.call('Network.setCacheDisabled',cacheDisabled=True)
c.call('Page.addScriptToEvaluateOnNewDocument',source="""
window.__cropErrors=[];window.__translations=0;window.__regionEvents=[];
for(const type of ['pointerdown','pointerup'])addEventListener(type,e=>__regionEvents.push({type,target:e.target.id,x:e.clientX,y:e.clientY,hidden:document.hidden}),true);
addEventListener('error',e=>__cropErrors.push(e.message));
addEventListener('unhandledrejection',e=>__cropErrors.push(String(e.reason)));
""")
URL=os.environ.get('READER_TEST_URL','http://127.0.0.1:8765/index.html')
BOOK='# Capture test\n\n'+'\n\n'.join('Paragraph %d: '%i+('Visible words belong to this page and must remain an image. '*22) for i in range(35))

def check(name,expr):
 value=c.js(expr)
 assert value is True,(name,value,c.js('({errors:__cropErrors,translations:__translations,page:state.pageInChapter,before:window.__pageBefore,tooltip:els.tooltip.style.display,selection:getSelection().toString()})'))
 print('PASS',name,flush=True)

def drag(rect,mobile=False,reverse=False):
 x0,y0=rect['left'],rect['top'];x1,y1=x0+rect['width'],y0+rect['height']
 if reverse:x0,y0,x1,y1=x1,y1,x0,y0
 if mobile:
  c.call('Input.dispatchTouchEvent',type='touchStart',touchPoints=[dict(x=x0,y=y0,id=1)])
  for i in range(1,7):c.call('Input.dispatchTouchEvent',type='touchMove',touchPoints=[dict(x=x0+(x1-x0)*i/6,y=y0+(y1-y0)*i/6,id=1)])
  c.call('Input.dispatchTouchEvent',type='touchEnd',touchPoints=[])
 else:
  c.call('Input.dispatchMouseEvent',type='mousePressed',x=x0,y=y0,button='left',buttons=1,clickCount=1)
  for i in range(1,7):c.call('Input.dispatchMouseEvent',type='mouseMoved',x=x0+(x1-x0)*i/6,y=y0+(y1-y0)*i/6,button='left',buttons=1)
  c.call('Input.dispatchMouseEvent',type='mouseReleased',x=x1,y=y1,button='left',buttons=0,clickCount=1)

for mobile,theme,dpr in [(False,'sepia',1),(True,'dark',2)]:
 c.call('Emulation.setDeviceMetricsOverride',width=412 if mobile else 1100,height=900,deviceScaleFactor=dpr,mobile=mobile)
 c.call('Emulation.setTouchEmulationEnabled',enabled=mobile)
 c.call('Page.navigate',url=URL)
 c.wait("document.readyState==='complete'&&!document.body.inert&&typeof openBookFile==='function'",timeout=35)
 c.js("localStorage.setItem('reader_onboarding_done','1');showUpdateBanner=()=>{};window.__loaded=0;openBookFile(new File(["+json.dumps(BOOK)+"],'capture.md',{lastModified:42})).then(()=>__loaded=1);true")
 c.wait('__loaded===1',timeout=30)
 c.js("document.body.dataset.theme="+json.dumps(theme)+";for(let i=0;i<4;i++)goNext();true")
 time.sleep(.7)
 c.js("window.__pageBefore=state.pageInChapter;selectRangeAndTranslate=()=>{__translations++;return true;};els.tooltip.style.display='flex';document.getElementById('btn-region').click();true")
 c.wait("document.body.classList.contains('region-mode')&&typeof window.html2canvas==='function'",timeout=20)
 c.js("window.__captureOriginal=window.html2canvas;window.__regionRenderError='';window.html2canvas=(...args)=>__captureOriginal(...args).catch(e=>{__regionRenderError=String(e);throw e;});true")
 check('capture hides obsolete panel tabs, menu and wheel',"['#menu-handle','#quick-menu-dock','.panel-tab','#page-arrows'].every(s=>[...document.querySelectorAll(s)].every(e=>getComputedStyle(e).visibility==='hidden'))")
 check('old tooltip and native selection are cleared',"els.tooltip.style.display==='none'&&!getSelection().toString()")
 # An image in the visible book area, without changing pagination.
 c.js("""(()=>{const b=els.container.getBoundingClientRect(),im=new Image(),cv=document.createElement('canvas');
 cv.width=64;cv.height=24;const x=cv.getContext('2d');x.fillStyle='#e43b21';x.fillRect(0,0,32,24);x.fillStyle='#318cff';x.fillRect(32,0,32,24);
 im.src=cv.toDataURL();im.width=64;im.height=24;im.id='capture-illustration';im.style.cssText='position:absolute;left:60px;top:160px;z-index:2';els.container.appendChild(im);})()""")
 c.wait("!!document.getElementById('capture-illustration')?.complete")
 time.sleep(.3)
 c.js('window.__pageBefore=state.pageInChapter;true')
 rect=c.js("(()=>{const b=els.container.getBoundingClientRect();return {left:Math.ceil(b.left+20),top:Math.ceil(b.top+80),width:Math.floor(Math.min(b.width-40,650)),height:Math.floor(Math.min(b.height-160,460))};})()")
 # Chrome's screenshot is the independent visual reference, without the tint.
 c.js("regionOverlay.style.visibility='hidden';true")
 before=c.call('Page.captureScreenshot',format='png',clip=dict(x=rect['left'],y=rect['top'],width=rect['width'],height=rect['height'],scale=1))['data']
 c.js("regionOverlay.style.visibility='';true")
 drag(rect,mobile=mobile,reverse=mobile)
 try:
  c.wait("cropDialog.open&&document.getElementById('crop-preview').naturalWidth>0",timeout=25)
 except Exception:
  print('REGION CAPTURE DIAGNOSTICS',c.js("({events:__regionEvents,errors:__cropErrors,hidden:document.hidden,format:state.format,book:state.bookKey,page:state.pageInChapter,before:__pageBefore,chapter:state.currentIndex,region:document.body.classList.contains('region-mode'),start:regionStart,capturing:regionCapturing,seq:regionCaptureSeq,pdfPointers:pdfPointers.size,toast:document.getElementById('reader-toast')?.textContent,renderer:typeof window.html2canvas,renderError:window.__regionRenderError,clones:document.querySelectorAll('iframe.html2canvas-container').length})"),flush=True)
  raise
 check('framing never requests translation or changes reading page',"__translations===0&&els.tooltip.style.display!=='flex'&&!getSelection().toString()&&state.pageInChapter===__pageBefore")
 result=c.js("cropData.split(',')[1]")
 # Compare in browser canvas: no image-processing package is needed in CI.
 stats=c.js("""(async()=>{const a=new Image(),b=new Image();a.src='data:image/png;base64,'+"""+json.dumps(before)+""";b.src='data:image/png;base64,'+"""+json.dumps(result)+""";await Promise.all([a.decode(),b.decode()]);
 if(a.width!==b.width||a.height!==b.height)return {sameSize:false,a:[a.width,a.height],b:[b.width,b.height]};
 const cv=document.createElement('canvas');cv.width=a.width;cv.height=a.height;const x=cv.getContext('2d',{willReadFrequently:true});
 x.drawImage(a,0,0);const pa=x.getImageData(0,0,cv.width,cv.height).data;x.clearRect(0,0,cv.width,cv.height);x.drawImage(b,0,0);const pb=x.getImageData(0,0,cv.width,cv.height).data;
 let diff=0,red=0,blue=0,min=255,max=0;for(let i=0;i<pa.length;i+=4){diff+=Math.abs(pa[i]-pb[i])+Math.abs(pa[i+1]-pb[i+1])+Math.abs(pa[i+2]-pb[i+2]);
 if(pb[i]>170&&pb[i+1]<90&&pb[i+2]<90)red++;if(pb[i+2]>170&&pb[i]<100&&pb[i+1]<180)blue++;min=Math.min(min,pb[i]);max=Math.max(max,pb[i]);}
 return {sameSize:true,error:diff/(cv.width*cv.height*3),red,blue,range:max-min};})()""")
 Path('/tmp/region-reference-'+theme+'.png').write_bytes(base64.b64decode(before))
 Path('/tmp/region-capture-'+theme+'.png').write_bytes(base64.b64decode(result))
 assert stats['sameSize'],('crop coordinates/DPR',stats)
 print('Visual comparison',mobile,theme,stats,flush=True)
 assert stats['error']<16,('crop must match visible later page',stats)
 assert stats['range']>20,'capture is blank'
 assert stats['red']>300*dpr*dpr and stats['blue']>300*dpr*dpr,('book illustration missing or incomplete',stats)
 print('PASS real '+('touch' if mobile else 'mouse')+' crop matches visible page pixels',flush=True)
 c.js("closeCropPreview();document.getElementById('btn-region').click();window.__renderActual=window.html2canvas;window.__releaseRender=null;window.html2canvas=(...args)=>new Promise(resolve=>{__releaseRender=()=>resolve(__renderActual(...args));});true")
 drag(rect,mobile=mobile)
 c.wait("regionCapturing&&typeof __releaseRender==='function'")
 c.js("exitRegionMode();__releaseRender();window.html2canvas=__renderActual;true")
 time.sleep(1)
 check('cancelling a pending render cannot reopen its crop',"!cropDialog.open&&!document.body.classList.contains('region-mode')")
 c.js("document.getElementById('btn-region').click();true")
 drag(dict(left=rect['left'],top=rect['top'],width=8,height=8),mobile=mobile)
 check('an accidental tap does not capture or translate',"!cropDialog.open&&!document.body.classList.contains('region-mode')&&__translations===0")
 check('menus become available again after capture',"getComputedStyle(document.getElementById('menu-handle')).visibility!=='hidden'")
 check('capture renderer leaves no clone frames behind',"document.querySelectorAll('iframe.html2canvas-container').length===0")
 check('no unhandled error',"__cropErrors.length===0")
print('ALL REGION SCREENSHOT CHECKS PASSED',flush=True)
