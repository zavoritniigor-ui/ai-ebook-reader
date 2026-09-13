"""Real pointer drag followed by provider settings: neither dispatches a wheel action."""
import json
import time
from browser_cdp import CDP

c = CDP()
c.sock.settimeout(60)
c.call('Page.enable')
c.call('Network.enable')
c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=800, deviceScaleFactor=1, mobile=False)
c.call('Emulation.setTouchEmulationEnabled', enabled=False)
c.call('Emulation.setEmulatedMedia', features=[])
c.call('Page.navigate', url='http://127.0.0.1:8765/index.html')
c.wait("document.readyState==='complete' && !document.body.inert && typeof quickMenu==='object'")
c.js("showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove();window.__dragErrors=[];addEventListener('error',e=>__dragErrors.push(e.message));quickMenu.open()")
c.wait("(()=>{const b=document.querySelector('.qm-active');return !!b && Math.abs(new DOMMatrix(getComputedStyle(b).transform).a-1)<.00001})()")

def check(name, expression):
    value = c.js(expression)
    assert value is True, (name, value)
    print('PASS', name, flush=True)

def positions():
    c.js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    return json.loads(c.js("JSON.stringify([...document.querySelectorAll('.qm-item:not([hidden])')].map(el=>({action:el.dataset.action,y:el.getBoundingClientRect().y})))"))

check('all twelve current actions persist in DOM', "document.querySelectorAll('.qm-item').length===12")
c.js("window.__dragActions=[];document.addEventListener('click',e=>{if(e.target.closest('.qm-item'))__dragActions.push(e.target.closest('.qm-item').dataset.action)},true)")
x, y = c.js("(()=>{const r=document.querySelector('.qm-active').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
before = positions()
c.call('Input.dispatchMouseEvent', type='mousePressed', x=x, y=y, button='left', clickCount=1)
for offset in [10, 22, 34]:
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y-offset, button='left', buttons=1)
    time.sleep(.025)
during = positions()
assert sum(abs(a['y']-b['y'])>1 for a in before for b in during if a['action']==b['action']) >= 3, (before, during)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=x, y=y-34, button='left', clickCount=1)
time.sleep(2.3)
check('drag does not dispatch an action or close wheel', "__dragActions.length===0 && !document.getElementById('quick-menu').hidden")
check('modal backdrop remains active after drag', "!document.getElementById('qm-backdrop').hidden")
check('Print still exists after drag', "!!document.querySelector('.qm-item[data-action=\"btn-print\"]')")
c.js('openKeySettings()')
c.wait("document.getElementById('quick-menu').hidden")
check('provider settings close wheel and its backdrop', "document.getElementById('qm-backdrop').hidden && document.getElementById('settings-modal').style.display==='flex'")
check('all three provider inputs available after wheel drag', "Object.values(AI_PROVIDERS).every(p=>document.getElementById(p.input).checkVisibility())")
c.js('closeKeySettings();quickMenu.open()')
c.wait("(()=>{const b=document.querySelector('.qm-active');return !!b && Math.abs(new DOMMatrix(getComputedStyle(b).transform).a-1)<.00001})()")
check('wheel reopens after provider settings', "!document.getElementById('quick-menu').hidden && !document.getElementById('qm-backdrop').hidden")
c.js('quickMenu.close()')
check('no runtime errors', '__dragErrors.length===0')
c.call('Emulation.clearDeviceMetricsOverride')
print('PASS Quick Wheel drag/settings integration', flush=True)
