"""Lower-right curved scrollable Quick Wheel: real CDP input, collision geometry (measured
via getBoundingClientRect, not visual guesses), drag/scroll/inertia/detent/sound,
modal backdrop, print functionality, and modal blocking verification.
"""
import base64
import json
import time
from browser_cdp import CDP, pdf_bytes

c = CDP()
c.sock.settimeout(40)
c.call('Page.enable')
c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=800, deviceScaleFactor=1, mobile=False)
c.call('Emulation.setTouchEmulationEnabled', enabled=False)
c.call('Emulation.setEmulatedMedia', features=[])
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source="window.__wheelErrors=[];addEventListener('error',e=>__wheelErrors.push(e.message));")
c.call('Page.navigate', url='http://127.0.0.1:8765/index.html')
c.wait("document.readyState==='complete' && !document.body.inert && typeof quickMenu==='object'")
c.js("showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
time.sleep(.3)
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
    xy = point(selector)
    mouse('mousePressed', xy, button='left', clickCount=1)
    mouse('mouseReleased', xy, button='left', clickCount=1)


def opened():
    c.wait("!document.getElementById('quick-menu').hidden")
    # The .qm-open class is added a frame later, then opacity/transform transitions
    # settle over .16s/.22s respectively. Real user taps land after animations complete.
    c.wait("Number(getComputedStyle(document.getElementById('qm-full')).opacity) >= .999")


def closed(timeout=20):
    # If already hidden, return immediately; otherwise wait for close animation
    # (240ms delay before hidden attribute is cleared in normal mode, synchronous
    # under prefers-reduced-motion). Timeout accommodates external closures
    # (navigation, modal, etc.) that might happen while we're waiting.
    try:
        c.wait("document.getElementById('quick-menu').hidden", timeout=timeout)
    except TimeoutError:
        raise
    time.sleep(.05)


def rect(selector):
    return json.loads(c.js(f"JSON.stringify(document.querySelector('{selector}').getBoundingClientRect())"))


def rects_overlap(a, b):
    return not (a['right'] <= b['left'] or a['left'] >= b['right'] or a['bottom'] <= b['top'] or a['top'] >= b['bottom'])


# Geometry is measured from rendered, visible DOM; no assertions about internal offsets.
VISIBLE = "[...document.querySelectorAll('.qm-item:not([hidden])')]"
def boxes():
    return c.js(f"Object.fromEntries({VISIBLE}.map(b=>[b.dataset.action,{{...b.getBoundingClientRect().toJSON(),label:b.innerText}}]))")
def moved(a, b):
    return sum(abs(a[k]['x']-b[k]['x']) + abs(a[k]['y']-b[k]['y']) > 1 for k in a.keys() & b.keys())
def open_wheel():
    tap('#qm-launcher'); opened()
def close_wheel():
    tap('#qm-launcher'); closed()
def detent():
    xy = point('.qm-item.qm-active')
    c.call('Input.dispatchMouseEvent', type='mouseWheel', x=xy[0], y=xy[1], deltaX=0, deltaY=66)
    c.js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
def seek(action):
    for _ in range(12):
        if c.js(f"!!document.querySelector('.qm-item[data-action=\"{action}\"]:not([hidden])')"):
            return
        detent()
    raise AssertionError('Action never visible: '+action)

open_wheel()
initial = boxes()
detent()
assert set(initial) != set(boxes()), 'One detent must change visible action labels'
print('PASS one detent changes visible labels', flush=True)
detent()
assert 'btn-print' in boxes(), boxes()
print('PASS Print appears after two detents from initial opening',flush=True)
seen = set(boxes())
for _ in range(11):
    detent(); seen.update(boxes())
assert len(seen) == 11, seen
print('PASS all 11 actions visibly reachable:', sorted(seen), flush=True)

# A drag starts ON an action, moves multiple boxes, and continues after release.
xy = point('.qm-item.qm-active'); before = boxes()
mouse('mousePressed', xy, button='left', clickCount=1)
for offset in [10, 22, 34]:
    mouse('mouseMoved', [xy[0], xy[1]-offset], button='left', buttons=1); time.sleep(.025)
during = boxes()
assert moved(before, during) >= 3, (before, during)
mouse('mouseReleased', [xy[0], xy[1]-34], button='left', clickCount=1)
after_up = boxes(); time.sleep(.085); inertia = boxes()
assert moved(after_up, inertia) >= 2, (after_up, inertia)
time.sleep(2)
stopped = boxes(); time.sleep(.25)
assert moved(stopped, boxes()) == 0
check('wheel snaps to a centered active item', "(()=>{const b=document.querySelector('.qm-active'); return !!b && Math.abs(new DOMMatrix(getComputedStyle(b).transform).a-1)<.001})()")
print('PASS drag moves >=3 boxes, inertia moves after release, then stops', flush=True)
print('DRAG displacement px:',{k:[round(during[k]['x']-before[k]['x'],2),round(during[k]['y']-before[k]['y'],2)] for k in before.keys() & during.keys()},flush=True)
close_wheel()

# Observe calls at the existing controls while using physical taps on visible actions.
# Prevent downstream dialogs here; print has a separate real-function test below.
c.js("window.__hits={}; document.addEventListener('click',e=>{if(e.target.id && ['file-upload','btn-tts','btn-translate-mode','reading-stats-button','toggle-toc-desktop','btn-ink','btn-region','btn-alt-voices','btn-lang-level'].includes(e.target.id)){__hits[e.target.id]=(__hits[e.target.id]||0)+1;e.stopImmediatePropagation();e.preventDefault()}},true); window.__realPrint=printCurrentReaderPage; printCurrentReaderPage=()=>{__hits['btn-print']=(__hits['btn-print']||0)+1}; state.format='txt';")
for action in ['file-upload','btn-tts','btn-translate-mode','reading-stats-button','toggle-toc-desktop','btn-print','btn-ink','btn-region','btn-alt-voices','btn-lang-level']:
    c.js(f"document.getElementById('{action}')?.removeAttribute('disabled')")
    open_wheel(); seek(action)
    assert action in boxes()
    tap(f'.qm-item[data-action="{action}"]'); closed()
    check('visible tap invokes '+action, f"__hits['{action}']===1")
# Theme focuses the actual selector.
open_wheel(); seek('theme-select'); tap('.qm-item[data-action="theme-select"]'); closed()
check('Theme focuses existing selector', "document.activeElement.id==='theme-select'")

# Print remains a real system-print call (intercept the browser API, not the handler).
c.js("printCurrentReaderPage=__realPrint; window.__systemPrint=0; window.__append=document.body.append; document.body.append=function(...nodes){__append.apply(this,nodes);for(const n of nodes)if(n.tagName==='IFRAME')n.contentWindow.print=()=>__systemPrint++}; els.pages.textContent='Printable reader page';")
open_wheel(); seek('btn-print'); tap('.qm-item[data-action="btn-print"]'); closed()
check('visible Print reaches browser print API', '__systemPrint===1')
# Exercise the PDF branch too, with a real PDF.js page and real print rendering.
data = base64.b64encode(pdf_bytes()).decode()
c.js(f"""(async()=>{{state.pdfScale=1;state.pdfFit='width';state.format='pdf';state.bookKey='wheel-print-pdf';document.body.classList.add('pdf-mode');await initPdf(new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'wheel.pdf'));}})()""")
c.wait('!!state.pdfDoc && state.totalPages>0')
time.sleep(.5)
open_wheel();seek('btn-print');tap('.qm-item[data-action="btn-print"]');closed()
c.wait('__systemPrint===2')
print('PASS visible Print renders PDF then reaches browser print API',flush=True)
c.js('document.body.append=__append')

# Sample real animation frames, including fractional positions, for overlaps.
c.js("window.__geometry=()=>{const items=[...document.querySelectorAll('.qm-item:not([hidden])')];const rects=items.map(b=>b.getBoundingClientRect());const labels=items.map(b=>b.querySelector('.qm-label').getBoundingClientRect());const overlap=(a,b)=>a.width&&b.width&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;const pair=rs=>rs.some((a,i)=>rs.slice(i+1).some(b=>overlap(a,b)));const controls=['#qm-full','#qm-launcher','#ask-tab','#grammar-tab','#pdf-scrubber','#footer-handle'].map(s=>document.querySelector(s)).filter(b=>b&&getComputedStyle(b).display!=='none').map(b=>b.getBoundingClientRect());return {pair:pair(rects),labels:pair(labels),controls:rects.some(a=>controls.some(b=>overlap(a,b))),bounds:rects.every(r=>r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight),launcher:!controls.slice(2).some(b=>overlap(controls[1],b)),full:!controls.slice(1).some(b=>overlap(controls[0],b))}}")
measurements=[]
for width,height in [(320,568),(390,844),(844,390),(768,1024),(1024,768),(1280,800)]:
    c.call('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=1,mobile=True)
    c.js('new Promise(resolve=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)),700))')
    for theme in ['light','dark']:
        c.js(f"document.body.dataset.theme='{theme}'")
        open_wheel()
        result=c.js('__geometry()')
        assert result == dict(pair=False,labels=False,controls=False,bounds=True,launcher=True,full=True), (width,height,result,boxes())
        check('reader side tabs blocked by modal backdrop', "['ask-tab','grammar-tab'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.id==='qm-backdrop'})")
        r=rect('#qm-launcher'); pct=(r['y']+r['height']/2)/height*100
        assert 70 <= pct <= 82, pct
        check('active scale larger than neighbor', f"(()=>{{const a=document.querySelector('.qm-active');return {VISIBLE}.some(b=>new DOMMatrix(getComputedStyle(b).transform).a<new DOMMatrix(getComputedStyle(a).transform).a-.05)}})()")
        xy=point('.qm-active'); mouse('mousePressed',xy,button='left',clickCount=1)
        for dy in range(8,67,8):
            mouse('mouseMoved',[xy[0],xy[1]-dy],button='left',buttons=1);time.sleep(.02)
            result=c.js('__geometry()'); assert not result['pair'] and not result['labels'] and not result['controls'],(width,height,dy,result)
        time.sleep(.12);mouse('mouseReleased',[xy[0],xy[1]-64],button='left',clickCount=1);time.sleep(.6)
        measurements.append(dict(viewport=[width,height],theme=theme,launcherPercent=round(pct,2),visible=len(boxes()),radius=c.js('document.getElementById("quick-menu").dataset.radius'),arc=c.js('document.getElementById("quick-menu").dataset.arcRange')))
        if width==390:
            from pathlib import Path
            Path('/tmp/quick-wheel-'+theme+'.png').write_bytes(base64.b64decode(c.call('Page.captureScreenshot',format='png')['data']))
        close_wheel()
print('PASS geometry matrix:',json.dumps(measurements),flush=True)

# Real touch input (not synthetic DOM events) follows the same curved motion.
open_wheel()
c.call('Emulation.setTouchEmulationEnabled',enabled=True,maxTouchPoints=1)
xy=point('.qm-active');before=boxes()
c.call('Input.dispatchTouchEvent',type='touchStart',touchPoints=[dict(x=xy[0],y=xy[1],id=1)])
for dy in [12,24,36]:
    c.call('Input.dispatchTouchEvent',type='touchMove',touchPoints=[dict(x=xy[0],y=xy[1]-dy,id=1)])
    c.js('new Promise(resolve=>requestAnimationFrame(resolve))')
assert moved(before,boxes())>=3
c.call('Input.dispatchTouchEvent',type='touchEnd',touchPoints=[])
time.sleep(2)
close_wheel()
c.call('Emulation.setTouchEmulationEnabled',enabled=False)
print('PASS touch drag moves at least three action rectangles',flush=True)

# Sample in the browser's animation clock; host sleeps can miss a whole animation.
def record_motion():
    c.js("window.__motion=[];window.__recordMotion=true;requestAnimationFrame(function sample(){if(!__recordMotion)return;__motion.push([...document.querySelectorAll('.qm-item')].map(b=>b.style.transform).join('|'));requestAnimationFrame(sample)})")
def assert_motion(name):
    frames=c.js('(__recordMotion=false,[...new Set(__motion)])')
    assert len(frames)>=3,(name,len(frames))
    print('PASS',name,'distinct frame geometries:',len(frames),flush=True)
record_motion();open_wheel();assert_motion('opening animation')
record_motion();close_wheel();assert_motion('closing animation')
open_wheel();tap('#qm-backdrop')
check('backdrop tap stays modal', "!document.getElementById('quick-menu').hidden")
c.call('Input.dispatchKeyEvent',type='keyDown',key='Escape',code='Escape');closed()
open_wheel();c.js('history.back()');closed()
open_wheel();tap('#qm-full');closed()
check('Full Menu controls share state', "document.getElementById('menu-handle').getAttribute('aria-expanded')===String(isFullMenuOpen())")
c.call('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'reduce'}])
open_wheel();close_wheel()
c.call('Emulation.setEmulatedMedia',features=[])
check('11 stable DOM actions', "document.querySelectorAll('.qm-item').length===11")
check('no runtime errors','__wheelErrors.length===0')
print('PASS Quick Wheel behavioral suite',flush=True)
