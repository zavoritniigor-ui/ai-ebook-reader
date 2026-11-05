"""A swipe can end without a compatibility click (Safari/iPhone and other touch
browsers). Its suppression must not swallow the next deliberate word tap.
Exercise real touch gestures, popup switching and same-gesture ghost clicks;
only translation providers and speech are mocked.
"""
import json,os,time
from pathlib import Path
from browser_cdp import CDP
c=CDP();c.call('Page.enable');c.call('Runtime.enable');c.call('Network.enable')
c.call('Network.setBypassServiceWorker',bypass=True);c.call('Network.setCacheDisabled',cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=3,mobile=True)
c.call('Emulation.setTouchEmulationEnabled',enabled=True)
c.call('Page.addScriptToEvaluateOnNewDocument',source="window.__tapErrors=[];addEventListener('error',e=>__tapErrors.push(e.message));")
c.call('Page.navigate',url=os.environ.get('READER_TEST_URL','http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete'&&!document.body.inert&&typeof openBookFile==='function'",timeout=35)
TEXT='\n\n'.join('Curious travelers enjoy beautiful stories beside the river. '*16 for _ in range(36))
c.js("localStorage.setItem('reader_onboarding_done','1');window.__bookReady=0;openBookFile(new File(["+json.dumps(TEXT)+"],'word-tap.txt',{type:'text/plain',lastModified:37})).then(()=>__bookReady=1);true")
c.wait('__bookReady===1',timeout=30)
c.js("""state.translateMode=true;state.targetLang='uk';document.body.classList.add('immersive-mode','mode-translate-on');
speakText=()=>{};speakInLang=()=>{};aiAvailable=()=>true;appendDictionaries=()=>{};window.__providerHold=true;window.__providerRelease=null;callAI=()=>__providerHold?new Promise(resolve=>{__providerRelease=()=>{__providerHold=false;resolve(JSON.stringify({direct:'переклад',context:null}));};}):Promise.resolve(JSON.stringify({direct:'переклад',context:null}));machineTranslate=async()=>({plain:'переклад',html:'переклад',extras:''});
window.__wordCalls=[];const originalWordHandler=handleWordOrSelection;handleWordOrSelection=(...args)=>{__wordDispatchAt=performance.now();__wordCalls.push(args[0]);return originalWordHandler(...args);};
window.__popupShownAt=0;window.__tapStartedAt=0;window.__lastClickAt=0;window.__wordDispatchAt=0;new MutationObserver(()=>{if(!__popupShownAt&&els.tooltip.style.display==='flex')__popupShownAt=performance.now();}).observe(els.tooltip,{attributes:true,attributeFilter:['style']});
window.__tapTrace=[];addEventListener('click',()=>__lastClickAt=performance.now(),true);addEventListener('pointerdown',()=>__tapStartedAt=performance.now(),true);for(const kind of ['pointerdown','pointerup','touchend','click'])addEventListener(kind,e=>__tapTrace.push({type:kind,pointer:e.pointerType,suppress:state.suppressNextClick,target:e.target.id,book:els.pages.contains(e.target),prevented:e.defaultPrevented}),true);true""")

def point(word):
 p=c.js("""((word)=>{const b=els.container.getBoundingClientRect(),it=document.createTreeWalker(els.pages,NodeFilter.SHOW_TEXT);let n;
 while(n=it.nextNode()){let i=-1;while((i=n.nodeValue.indexOf(word,i+1))!==-1){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+word.length);const q=r.getBoundingClientRect();
 if(q.width&&q.left>=b.left+4&&q.right<=b.right-4&&q.top>b.top+95&&q.bottom<b.bottom-120)return {x:q.left+q.width/2,y:q.top+q.height/2};}}return null;})("""+json.dumps(word)+")")
 assert p,('visible word missing',word)
 return p

def tap(word):
 p=point(word);c.touch_tap(p['x'],p['y']);return p

def check(name,expression,timeout=0):
 until=time.monotonic()+timeout
 while True:
  value=c.js(expression)
  if value is True:break
  if time.monotonic()>=until:
   raise AssertionError((name,value,c.js('({popup:els.tooltip.style.display,word:els.ttOriginal.textContent,calls:__wordCalls,suppress:state.suppressNextClick,page:state.pageInChapter,events:__tapTrace,errors:__tapErrors})')))
  time.sleep(.05)
 print('PASS',name,flush=True)

def swipe():
 c.js("els.ttCloseBtn.click();window.__page=state.pageInChapter;__tapTrace=[];true")
 b=c.js("(()=>{const r=els.container.getBoundingClientRect();return {x:r.left+r.width*.78,y:r.top+r.height*.45,w:r.width};})()")
 c.call('Input.dispatchTouchEvent',type='touchStart',touchPoints=[dict(x=b['x'],y=b['y'],id=1)])
 for i in range(1,7):c.call('Input.dispatchTouchEvent',type='touchMove',touchPoints=[dict(x=b['x']-b['w']*.5*i/6,y=b['y'],id=1)])
 c.call('Input.dispatchTouchEvent',type='touchEnd',touchPoints=[])
 c.wait('state.pageInChapter===__page+1',timeout=8)
 c.js('new Promise(resolve=>setTimeout(resolve,400))')
 check('swipe ends with its click guard armed','state.suppressNextClick===true')

tap('river')
check('popup appears while the translation provider is still pending',"els.tooltip.style.display==='flex'&&els.ttOriginal.textContent==='river'&&typeof __providerRelease==='function'&&els.ttTranslation.textContent.includes(t('translating'))",timeout=5)
latency=c.js('__popupShownAt-__tapStartedAt');Path('/tmp/iphone-popup-timing.json').write_text(json.dumps(c.js('({browserTapToPopupMs:__popupShownAt-__tapStartedAt,pointerToClickMs:__lastClickAt-__tapStartedAt,clickToDispatchMs:__wordDispatchAt-__lastClickAt,dispatchToPopupMs:__popupShownAt-__wordDispatchAt,providerHeld:true})')));print('Tap-to-popup ms (provider held):',round(latency,1),flush=True)
c.js('__providerRelease();true')
check('first word tap receives its translation',"els.tooltip.style.display==='flex'&&els.ttOriginal.textContent==='river'&&els.ttTranslation.textContent.includes('переклад')",timeout=5)
swipe()
tap('beautiful')
check('the first deliberate word tap after a swipe opens translation',"els.tooltip.style.display==='flex'&&els.ttOriginal.textContent==='beautiful'&&__wordCalls.length===2",timeout=4)
tap('travelers')
check('one tap switches the open popup to another word',"els.tooltip.style.display==='flex'&&els.ttOriginal.textContent==='travelers'&&__wordCalls.length===3",timeout=4)
swipe()
p=point('river')
c.js("(()=>{const e=document.elementFromPoint("+str(p['x'])+","+str(p['y'])+");e.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:"+str(p['x'])+",clientY:"+str(p['y'])+",button:0}));return true;})()")
check('a compatibility click without a new gesture still opens no popup',"els.tooltip.style.display!=='flex'&&__wordCalls.length===3")
tap('river')
check('a real tap following the swallowed ghost click works once',"els.tooltip.style.display==='flex'&&els.ttOriginal.textContent==='river'&&__wordCalls.length===4",timeout=4)
check('no application error','__tapErrors.length===0')
print('ALL IPHONE WORD TAP CHECKS PASSED',flush=True)
