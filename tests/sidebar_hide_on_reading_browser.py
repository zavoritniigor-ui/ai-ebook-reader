"""The Contents panel hides by itself once the reader works with the book again (owner, 2026-10-26): after a page is
chosen in it, the first tap on a word, a zoom (wheel / pinch) or a scroll of the book closes it. The book scrolled by the
panel's own jump, and anything done inside the panel, do not. A wide screen (the panel beside the book) is used, where a
chosen chapter alone does not close it.
"""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1400, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && !document.body.inert && typeof openBookFile === 'function'")
c.js("localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); 1")
text = '\\n\\n'.join(f'Chapitre {n}\\n\\n' + ' '.join(['Le chat dort sur le canapé.'] * 400) for n in range(1, 6))
c.js(f"openBookFile(new File([{text!r}.replace(/\\\\n/g, '\\n')], 'livre.txt', {{ type: 'text/plain' }})); 1")
c.wait("state.format === 'txt' && document.querySelectorAll('#toc-list li, #toc-list a, #toc-list button, .toc-item').length > 0", timeout=30)
time.sleep(0.5)


def check(name, expr):
    v = c.js(expr)
    assert v is True, (name, v)
    print('PASS', name, flush=True)


def open_toc():
    c.js("els.sidebar.classList.remove('collapsed'); 1"); time.sleep(0.2)


def point(sel):
    return c.js(f"(() => {{ const r = document.querySelector({sel!r}).getBoundingClientRect(); return {{ x: r.left + r.width / 2, y: r.top + Math.min(40, r.height / 2) }}; }})()")


open_toc()
toc = c.js("(() => { const e = document.querySelector('#toc-list li, #toc-list a, #toc-list button, .toc-item'); const r = e.getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2 }; })()")
for t in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=t, x=toc['x'], y=toc['y'], button='left', clickCount=1)
time.sleep(0.5)
check('1 choosing a chapter in the panel (wide screen) leaves it open', "!els.sidebar.classList.contains('collapsed')")
c.js("els.container.scrollTop += 300; 1"); time.sleep(0.3)
check('2 the book scrolled by the app itself does not close it', "!els.sidebar.classList.contains('collapsed')")
p = point('#reader-pages')
for t in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=t, x=p['x'], y=p['y'], button='left', clickCount=1)
time.sleep(0.3)
check('3 the first tap on the book closes it', "els.sidebar.classList.contains('collapsed')")

open_toc()
c.call('Input.dispatchMouseEvent', type='mouseWheel', x=p['x'], y=p['y'], deltaX=0, deltaY=200)
time.sleep(0.3)
check('4 scrolling the book with the wheel (or zooming with it) closes it', "els.sidebar.classList.contains('collapsed')")

open_toc()
c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': p['x'], 'y': p['y']}, {'x': p['x'] + 60, 'y': p['y'] + 60}])
c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
time.sleep(0.3)
check('5 a pinch (two fingers) on the book closes it', "els.sidebar.classList.contains('collapsed')")

open_toc()
q = point('#sidebar')
c.call('Input.dispatchMouseEvent', type='mouseWheel', x=q['x'], y=q['y'], deltaX=0, deltaY=200)
for t in ('mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=t, x=q['x'], y=q['y'], button='left', clickCount=1)
time.sleep(0.3)
check('6 scrolling or tapping inside the panel keeps it open', "!els.sidebar.classList.contains('collapsed')")

c.js("document.activeElement?.blur?.(); 1")
c.call('Input.dispatchKeyEvent', type='keyDown', key='PageDown', code='PageDown', windowsVirtualKeyCode=34)
c.call('Input.dispatchKeyEvent', type='keyUp', key='PageDown', code='PageDown', windowsVirtualKeyCode=34)
time.sleep(0.3)
check('7 the keys that scroll the book close it', "els.sidebar.classList.contains('collapsed')")
print('ALL SIDEBAR HIDE-ON-READING CHECKS PASSED')
