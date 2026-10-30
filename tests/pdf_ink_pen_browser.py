"""Handwriting with a stylus on PDF pages (js/pdf-ink.js): pressure, smooth lines, finger and palm.

Owner (2026-10-30): «Функція писати потрібно удосконалити до рівня проф». Before: one width for the whole stroke, a
polyline through the raw points, the whole page redrawn on every move, and a finger or palm drew just like the stylus
(a palm landing during a stroke even cancelled it as the start of a pinch).

Checks: a stylus stroke keeps its pressure (one byte per point) and comes back identical after a reload; the line is
wider where the stylus pressed harder; the line is a curve through the midpoints, not a polyline through the points; a
stroke is on the canvas while it is still being written; after the stylus was seen a finger scrolls the page instead of
writing; a palm while the stylus writes neither cuts the stroke nor zooms; ☝️ lets a finger write again; the stylus's
side button (or eraser end) erases.
"""
import base64, json, os, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(120)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=900, deviceScaleFactor=1, mobile=False)


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def boot(clear=False):
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof loadInk==='function'", timeout=30)
    if clear:
        c.js("localStorage.clear(); indexedDB.deleteDatabase('reader-ink'); 1")
        c.call('Page.reload')
        c.wait("document.readyState==='complete' && !document.body.inert && typeof loadInk==='function'", timeout=30)
    c.js("showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); window.confirm=()=>true; 1")


PDF = pdf_document([{'text': 'Unit %d. Exercice: complete the sentence.' % i} for i in range(1, 9)])
STAMP = 1700000950000


def upload():
    b64 = base64.b64encode(PDF).decode()
    c.js("pdfContinuousReady=false")
    c.js(f"""(() => {{ const bytes = Uint8Array.from(atob({b64!r}), c=>c.charCodeAt(0));
      const file = new File([bytes], 'cahier.pdf', {{type:'application/pdf', lastModified:{STAMP}}});
      const dt = new DataTransfer(); dt.items.add(file); document.getElementById('file-upload').files = dt.files;
      document.getElementById('file-upload').dispatchEvent(new Event('change')); }})()""")
    c.wait("state.format==='pdf' && pdfContinuousReady && !!pdfPageWrappers[1]?.querySelector('.ink-layer')", timeout=30)
    c.js("inkLoadPromise.then(() => 1)")


def show_page(n):
    c.js(f"pdfPageWrappers[{n}].scrollIntoView({{block:'start'}}); 1")
    c.wait(f"!!pdfPageWrappers[{n}].querySelector('.ink-layer') && pdfPageWrappers[{n}].getBoundingClientRect().top < 200", timeout=10)
    time.sleep(0.3)


def ink_mode(width='4'):
    c.js(f"if (!state.inkMode) document.getElementById('btn-ink').click(); inkWidth.value='{width}'; 1")
    c.js("document.querySelectorAll('.ink-layer').forEach(cv => bindInkCanvas(cv, Number(cv.dataset.page))); 1")


def rect(n):
    return c.js(f"(()=>{{const r=pdfPageWrappers[{n}].querySelector('.ink-layer').getBoundingClientRect();return {{l:r.left,t:r.top,w:r.width,h:r.height}}}})()")


def pen(kind, x, y, force=0.5, buttons=1):
    c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left' if kind != 'mouseMoved' else 'none',
           buttons=buttons if kind != 'mouseReleased' else 0, clickCount=1 if kind != 'mouseMoved' else 0,
           pointerType='pen', force=force)


def pen_stroke(n, fx0, fy, fx1, forces, buttons=1):
    r = rect(n)
    y = r['t'] + r['h'] * fy
    steps = len(forces) - 1
    xs = [r['l'] + r['w'] * (fx0 + (fx1 - fx0) * i / steps) for i in range(steps + 1)]
    pen('mousePressed', xs[0], y, forces[0], buttons)
    for x, f in zip(xs[1:], forces[1:]):
        pen('mouseMoved', x, y, f, buttons)
    pen('mouseReleased', xs[-1], y, forces[-1], buttons)


def alpha(n, fx, fy, dy_css=0.0):
    """Alpha of ONE canvas pixel of page n at the page-relative point (fx, fy), moved dy_css CSS pixels down."""
    return c.js(f"""(()=>{{ const cv=pdfPageWrappers[{n}].querySelector('.ink-layer'); const k=cv.width/cv.getBoundingClientRect().width;
        const x=Math.round({fx}*cv.width), y=Math.round({fy}*cv.height+{dy_css}*k);
        return cv.getContext('2d').getImageData(x, y, 1, 1).data[3]; }})()""")


# ---------------------------------------------------------------------------------------------------------------
boot(clear=True)
upload()
show_page(1)
ink_mode()
assert c.js("document.getElementById('ink-finger').hidden"), 'the ☝️ button is shown before any stylus was used'

# ---- 1 pressure is kept: hard in the first half of the stroke, light in the second
forces = [1.0] * 9 + [0.1] * 9
pen_stroke(1, 0.15, 0.30, 0.75, forces)
c.js("inkSaved().then(() => 1)")
check("1 a stylus stroke keeps a pressure per point, on the 1/255 grid",
      "inkStrokes(1).length===1 && inkStrokes(1)[0].p.every(pt => pt.length===3 && Math.abs(pt[2]*255-Math.round(pt[2]*255))<1e-9) && inkStrokes(1)[0].p[0][2]===1 && inkStrokes(1)[0].p.at(-1)[2]===Math.round(0.1*255)/255")
check("1b the stylus was noticed: only it writes now, ☝️ shown (off), remembered on this device",
      "inkPenSeen && !inkFingerWrites && !document.getElementById('ink-finger').hidden && localStorage.getItem('reader_ink_pen_seen')==='1'")
before = c.js("JSON.stringify(state.ink)")

# ---- 2 the line is wider where the stylus pressed harder (width 4 px: x1.65 = 6.6 px, x0.48 = 1.9 px)
thick, thin = alpha(1, 0.30, 0.30, 2.6), alpha(1, 0.62, 0.30, 2.6)
assert thick > 0 and thin == 0, ('pressure does not change the width', thick, thin)
assert alpha(1, 0.62, 0.30) > 0, 'the light part of the stroke is not drawn'
print('PASS 2 hard pressure draws a wider line than light pressure', flush=True)

# ---- 3 smooth: a curve through the midpoints, not a polyline through the points
c.js("""(() => { const w = 2 / pdfPageWrappers[2].querySelector('.ink-layer').getBoundingClientRect().width;
    state.ink['2'] = [{c: '#111111', w, p: [[0.2, 0.5], [0.3, 0.4], [0.4, 0.5]]}]; return 1; })()""")
show_page(2)
c.js("redrawInk(pdfPageWrappers[2].querySelector('.ink-layer'), 2); 1")
assert alpha(2, 0.3, 0.4) == 0 and alpha(2, 0.3, 0.425) > 0, ('not a smooth curve', alpha(2, 0.3, 0.4), alpha(2, 0.3, 0.425))
print('PASS 3 the corner point is rounded off (curve through the midpoints)', flush=True)
c.js("state.ink['2'] = []; redrawInk(pdfPageWrappers[2].querySelector('.ink-layer'), 2); 1")

# ---- 4 the stroke is visible while it is still being written (drawn per frame, not only at the end)
r = rect(2)
y = r['t'] + r['h'] * 0.6
pen('mousePressed', r['l'] + r['w'] * 0.2, y)
for i in range(1, 9):
    pen('mouseMoved', r['l'] + r['w'] * (0.2 + 0.05 * i), y)
time.sleep(0.2)
live = alpha(2, 0.35, 0.6)
drawing = c.js("inkDrawing && inkPointerType==='pen'")
pen('mouseReleased', r['l'] + r['w'] * 0.6, y)
assert drawing and live > 0, ('nothing on the canvas while writing', drawing, live)
print('PASS 4 the stroke appears while it is being written', flush=True)

# ---- 5 a finger scrolls the page instead of writing
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
time.sleep(0.5)
n2 = c.js("inkStrokes(2).length")
top0 = c.js("els.container.scrollTop")
x0, y0 = r['l'] + r['w'] * 0.5, 600
c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': x0, 'y': y0, 'id': 1}])
for i in range(1, 6):
    c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=[{'x': x0, 'y': y0 - 40 * i, 'id': 1}])
c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
time.sleep(0.3)
check("5 after the stylus, a finger drag scrolls the page and writes nothing",
      f"inkStrokes(2).length==={n2} && Math.abs(els.container.scrollTop - {top0} - 200) < 30 || JSON.stringify({{n: inkStrokes(2).length, d: els.container.scrollTop - {top0}}})")

# ---- 6 a palm (two contacts) while the stylus writes: no zoom, the stroke goes on to the end
show_page(3)
r = rect(3)
y = r['t'] + r['h'] * 0.3
zoom0 = c.js("state.pdfZoom")
pen('mousePressed', r['l'] + r['w'] * 0.2, y)
pen('mouseMoved', r['l'] + r['w'] * 0.3, y)
c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': r['l'] + r['w'] * 0.5, 'y': y + 150, 'id': 1}, {'x': r['l'] + r['w'] * 0.7, 'y': y + 260, 'id': 2}])
c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=[{'x': r['l'] + r['w'] * 0.45, 'y': y + 130, 'id': 1}, {'x': r['l'] + r['w'] * 0.8, 'y': y + 300, 'id': 2}])
pen('mouseMoved', r['l'] + r['w'] * 0.4, y)
pen('mouseMoved', r['l'] + r['w'] * 0.5, y)
c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
pen('mouseMoved', r['l'] + r['w'] * 0.6, y)
pen('mouseReleased', r['l'] + r['w'] * 0.6, y)
time.sleep(0.3)
check("6 a palm during a stylus stroke: one whole stroke (0.2 → 0.6), nothing zoomed, nothing else drawn",
      f"inkStrokes(3).length===1 && Math.abs(inkStrokes(3)[0].p.at(-1)[0]-0.6)<0.01 && Math.abs(inkStrokes(3)[0].p[0][0]-0.2)<0.01 && state.pdfZoom==={zoom0} || JSON.stringify({{n: inkStrokes(3).length, last: inkStrokes(3)[0]?.p.at(-1), zoom: state.pdfZoom}})")

# ---- 7 ☝️: a finger writes again
time.sleep(0.5)
c.js("document.getElementById('ink-finger').click(); 1")
r = rect(3)
y = r['t'] + r['h'] * 0.5
c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': r['l'] + r['w'] * 0.2, 'y': y, 'id': 1}])
for i in range(1, 6):
    c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=[{'x': r['l'] + r['w'] * (0.2 + 0.08 * i), 'y': y, 'id': 1}])
c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
check("7 ☝️ on: a finger stroke is written again (no pressure: two numbers per point), remembered",
      "inkFingerWrites && inkStrokes(3).length===2 && inkStrokes(3)[1].p.every(pt => pt.length===2) && localStorage.getItem('reader_ink_finger')==='1'", timeout=2)
c.js("document.getElementById('ink-finger').click(); 1")
c.call('Emulation.setTouchEmulationEnabled', enabled=False)

# ---- 8 the stylus side button erases the stroke it crosses (CDP cannot send the eraser end, buttons 32; same path)
time.sleep(0.5)
r = rect(3)
x = r['l'] + r['w'] * 0.4
c.call('Input.dispatchMouseEvent', type='mousePressed', x=x, y=r['t'] + r['h'] * 0.25, button='right', buttons=2, clickCount=1, pointerType='pen', force=0.5)
for i in range(1, 6):
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=r['t'] + r['h'] * (0.25 + 0.02 * i), button='none', buttons=2, pointerType='pen', force=0.5)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=x, y=r['t'] + r['h'] * 0.35, button='right', buttons=0, clickCount=1, pointerType='pen', force=0.5)
check("8 the stylus side button erases the stroke it crosses (and draws nothing)",
      "inkStrokes(3).length===1 && inkStrokes(3)[0].p.every(pt => pt.length===2) || JSON.stringify(inkStrokes(3).map(s => s.p.length))", timeout=2)

# ---- 9 the pressure is stored and comes back identical after closing the app
c.js("inkSaved().then(() => 1)")
expected = c.js("JSON.stringify(state.ink)")
assert json.loads(expected)['1'] == json.loads(before)['1']
boot()
upload()
check("9 after closing the app and reopening the book: the same strokes, pressure included",
      f"JSON.stringify(state.ink)==={json.dumps(expected)}", timeout=5)
print('ALL PDF INK PEN CHECKS PASSED')
