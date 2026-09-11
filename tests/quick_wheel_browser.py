"""Quick wheel: real CDP input, bounded snapping, UI state and viewport regressions."""
import math
import time
from browser_cdp import CDP

c = CDP()
c.sock.settimeout(40)
c.call('Page.enable')
c.call('Emulation.setDeviceMetricsOverride',width=1280,height=800,deviceScaleFactor=1,mobile=False)
c.call('Emulation.setTouchEmulationEnabled',enabled=False)
c.call('Emulation.setEmulatedMedia',features=[])
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source="window.__wheelErrors=[];addEventListener('error',e=>__wheelErrors.push(e.message));")
c.call('Page.navigate', url='http://127.0.0.1:8765/index.html')
c.wait("document.readyState==='complete' && !document.body.inert && typeof quickWheel==='object'")
c.js("showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove();document.body.classList.add('immersive-mode')")
time.sleep(.8)
c.js("document.getElementById('sw-update-banner')?.remove()")

def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)

def point(selector):
    return c.js(f"(()=>{{const r=document.querySelector('{selector}').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}})()")

def mouse(kind, xy, **kw):
    c.call('Input.dispatchMouseEvent', type=kind, x=xy[0], y=xy[1], **kw)

def tap(selector):
    xy=point(selector)
    mouse('mousePressed',xy,button='left',clickCount=1)
    mouse('mouseReleased',xy,button='left',clickCount=1)

def opened():
    c.wait("!document.getElementById('quick-wheel').hidden")
    time.sleep(.25)

def closed():
    c.wait("document.getElementById('quick-wheel').hidden")
    time.sleep(.12)

tap('#menu-handle'); opened()
check('short tap opens without changing immersive mode', "document.body.classList.contains('immersive-mode') && els.menuHandle.getAttribute('aria-expanded')==='true'")
tap('#menu-handle'); closed()
xy=point('#menu-handle'); mouse('mousePressed',xy,button='left',clickCount=1)
time.sleep(.65)
check('hold opens full toolbar', "!document.body.classList.contains('immersive-mode') && document.getElementById('quick-wheel').hidden")
mouse('mouseReleased',xy,button='left',clickCount=1); closed()
check('release after hold does not open wheel', "document.getElementById('quick-wheel').hidden")
tap('#menu-handle'); opened()
mouse('mousePressed',[700,450],button='left',clickCount=1);mouse('mouseReleased',[700,450],button='left',clickCount=1);closed()
tap('#menu-handle');opened()
c.call('Input.dispatchKeyEvent', type='keyDown', key='Escape', code='Escape');closed()
check('Escape returns focus', "document.activeElement===els.menuHandle")

# Selection and book state survive UI open/close, including the popup dismiss listener.
c.js("els.pages.innerHTML='<p>Selection remains intact while the menu opens.</p>';const r=document.createRange();r.selectNodeContents(els.pages.firstChild);getSelection().removeAllRanges();getSelection().addRange(r);window.__selection=getSelection().toString();window.__before=JSON.stringify([state.bookKey,state.pageInChapter,state.pdfZoom,state.translateMode]);")
tap('#menu-handle');opened();tap('#menu-handle');closed()
check('selection and reader state unchanged', "getSelection().toString()===__selection && JSON.stringify([state.bookKey,state.pageInChapter,state.pdfZoom,state.translateMode])===__before")

# Every proxy reaches the existing control exactly once, without running file/voice dialogs.
c.js("window.__hits={};document.querySelectorAll('.wheel-item').forEach(b=>document.getElementById(b.dataset.action).addEventListener('click',e=>{__hits[b.dataset.action]=(__hits[b.dataset.action]||0)+1;e.preventDefault();e.stopImmediatePropagation()},true));document.getElementById('reading-stats-button').disabled=false;")
for target in ['file-upload','btn-tts','btn-translate-mode','reading-stats-button','toggle-toc-desktop']:
    tap('#menu-handle');opened();tap(f'[data-action="{target}"]');closed()
    check('existing action '+target, f"__hits['{target}']===1")
tap('#menu-handle');opened();tap('[data-action="theme-select"]');closed()
check('theme exposes existing chooser', "document.activeElement.id==='theme-select' && !document.body.classList.contains('immersive-mode')")

tap('#menu-handle');opened()
start=c.js("Number(document.getElementById('quick-wheel').dataset.rotation)")
cx,cy=point('#quick-wheel')
mouse('mousePressed',[cx+110,cy],button='left',clickCount=1)
for angle in [.2,.5,.8,1.1,1.4]:
    mouse('mouseMoved',[cx+110*math.cos(angle),cy+110*math.sin(angle)],button='left',buttons=1)
check('drag rotates', f"Math.abs(Number(document.getElementById('quick-wheel').dataset.rotation)-({start}))>.5")
mouse('mouseReleased',[cx+110*math.cos(1.4),cy+110*math.sin(1.4)],button='left',clickCount=1)
check('release snaps and stays open', "!document.getElementById('quick-wheel').hidden && Math.abs(Number(document.getElementById('quick-wheel').dataset.rotation)/(Math.PI/3)-Math.round(Number(document.getElementById('quick-wheel').dataset.rotation)/(Math.PI/3)))<1e-8 && !document.getElementById('quick-wheel').classList.contains('dragging')")
start=c.js("Number(document.getElementById('quick-wheel').dataset.rotation)")
mouse('mousePressed',[cx+110,cy],button='left',clickCount=1)
mouse('mouseMoved',[cx+220,cy+220],button='left',buttons=1)
check('capture keeps fast drags working outside wheel', f"Math.abs(Number(document.getElementById('quick-wheel').dataset.rotation)-({start}))>.5")
mouse('mouseReleased',[cx+220,cy+220],button='left',clickCount=1)
for _ in range(8):
    mouse('mousePressed',[cx+105,cy],button='left',clickCount=1)
    mouse('mouseMoved',[cx,cy+105],button='left',buttons=1)
    mouse('mouseReleased',[cx,cy+105],button='left',clickCount=1)
time.sleep(.3)
rotation=c.js("document.getElementById('quick-wheel').dataset.rotation")
time.sleep(.3)
check('rapid releases leave no continuing inertia', f"document.getElementById('quick-wheel').dataset.rotation==='{rotation}'")
c.js('quickWheel.close()');closed()

for width,height in [(390,844),(844,390),(568,320),(768,1024),(1024,768),(320,568),(1280,800)]:
    c.call('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=1,mobile=True)
    time.sleep(.6)
    for theme in ['light','dark']:
        c.js(f"document.body.dataset.theme='{theme}';document.body.classList.add('immersive-mode')")
        tap('#menu-handle');opened()
        check(f'wheel and targets inside {width}x{height} {theme}', "[document.getElementById('quick-wheel'),...document.querySelectorAll('.wheel-item')].every(b=>{const r=b.getBoundingClientRect(),v=visualViewport;return r.left>=v.offsetLeft && r.top>=v.offsetTop && r.right<=v.offsetLeft+v.width && r.bottom<=v.offsetTop+v.height})")
        tap('#menu-handle');closed()
c.call('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'reduce'}])
tap('#menu-handle');opened()
check('reduced motion disables animation', "getComputedStyle(document.getElementById('quick-wheel')).animationName==='none' && getComputedStyle(document.querySelector('.wheel-item')).transitionDuration==='0s'")
c.call('Input.dispatchKeyEvent',type='keyDown',key='ArrowRight',code='ArrowRight')
check('keyboard selects wheel item', "document.activeElement.classList.contains('wheel-item') && document.activeElement.classList.contains('active')")
c.js('quickWheel.close()');closed()
c.call('Emulation.setEmulatedMedia',features=[])
c.call('Emulation.clearDeviceMetricsOverride')
# Observer/listener counts remain constant; no new DOM per open.
before=c.call('Memory.getDOMCounters')
for _ in range(30):
    c.js('quickWheel.open();quickWheel.close()')
time.sleep(.3)
after=c.call('Memory.getDOMCounters')
assert after['jsEventListeners']==before['jsEventListeners'], (before,after)
check('stable DOM after repeated opening', "document.querySelectorAll('#quick-wheel').length===1 && document.querySelectorAll('.wheel-item').length===6")
print('PASS stable listener count',flush=True)
tap('#menu-handle');opened()
c.js("state.pageInChapter++;els.progress.textContent='page changed'");closed()
check('navigation closes stale wheel', "document.getElementById('quick-wheel').hidden")
# Cancelled/moved presses cannot become a long press or accidental tap.
c.js("document.body.classList.add('immersive-mode')")
time.sleep(.6)
xy=point('#menu-handle');mouse('mousePressed',xy,button='left',clickCount=1)
mouse('mouseMoved',[xy[0]+30,xy[1]+30],button='left',buttons=1)
time.sleep(.6)
mouse('mouseReleased',[xy[0]+30,xy[1]+30],button='left',clickCount=1)
check('moved press cancelled', "document.body.classList.contains('immersive-mode') && document.getElementById('quick-wheel').hidden")
c.call('Emulation.setTouchEmulationEnabled',enabled=True,maxTouchPoints=5)
def touch(kind, points):
    c.call('Input.dispatchTouchEvent',type=kind,touchPoints=[dict(x=x,y=y,id=i,radiusX=3,radiusY=3,force=1) for i,x,y in points])
xy=point('#menu-handle')
touch('touchStart',[(1,*xy)]);touch('touchCancel',[]);time.sleep(.6)
check('touch cancellation clears hold timer', "document.body.classList.contains('immersive-mode') && document.getElementById('quick-wheel').hidden")
touch('touchStart',[(1,*xy)]);touch('touchEnd',[]);opened()
print('PASS real touch tap opens',flush=True)
cx,cy=point('#quick-wheel')
touch('touchStart',[(1,cx+100,cy)])
touch('touchMove',[(1,cx+70,cy+70)])
touch('touchMove',[(1,cx,cy+100)])
touch('touchEnd',[])
check('touch rotation releases capture', "!document.getElementById('quick-wheel').classList.contains('dragging') && !document.getElementById('quick-wheel').hidden")
c.call('Input.dispatchKeyEvent',type='keyDown',key='ArrowRight',code='ArrowRight')
c.js("window.__keyboardAction=document.activeElement.dataset.action;window.__oldHit=__hits[__keyboardAction]||0")
c.call('Input.dispatchKeyEvent',type='keyDown',key='Enter',code='Enter',windowsVirtualKeyCode=13,text='\r',unmodifiedText='\r')
c.call('Input.dispatchKeyEvent',type='keyUp',key='Enter',code='Enter',windowsVirtualKeyCode=13)
closed()
check('keyboard activation works after dragging', "__keyboardAction==='theme-select' ? document.activeElement.id==='theme-select' : __hits[__keyboardAction]===__oldHit+1")
c.call('Emulation.setTouchEmulationEnabled',enabled=False)
time.sleep(.5)
tap('#menu-handle');opened()
c.js('history.back()');closed()
check('Back closes wheel through existing overlay stack', "!document.body.classList.contains('quick-wheel-open') && document.getElementById('quick-wheel').hidden")
c.js("els.menuHandle.focus()")
c.call('Input.dispatchKeyEvent',type='keyDown',key='Enter',code='Enter',modifiers=8,windowsVirtualKeyCode=13)
c.call('Input.dispatchKeyEvent',type='keyUp',key='Enter',code='Enter',modifiers=8,windowsVirtualKeyCode=13)
check('keyboard full-menu shortcut', "!document.body.classList.contains('immersive-mode') && document.getElementById('quick-wheel').hidden")
check('no runtime errors', '__wheelErrors.length===0')
print('PASS quick wheel suite', flush=True)
