"""Handwriting tools on PDF pages (js/pdf-ink.js): marker, colours, Redo, the partial eraser.

Owner (2026-10-30): «Функція писати потрібно удосконалити до рівня проф» — tools part. Before: no marker, four colours,
Undo without Redo, and the eraser could only remove a whole stroke.

Checks: a marker stroke is see-through, wide, has no pressure, lies UNDER the pen's writing and keeps its flag after a
reload; pen and marker remember their own colours; the partial eraser cuts a line in two and leaves the rest; that whole
gesture is one Undo step and Redo puts it back; a second tap on 🧽 switches to the whole-stroke eraser; Undo/Redo
buttons are greyed out when there is nothing to undo/redo.
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
STAMP = 1700000960000


def upload():
    b64 = base64.b64encode(PDF).decode()
    c.js("pdfContinuousReady=false")
    c.js(f"""(() => {{ const bytes = Uint8Array.from(atob({b64!r}), c=>c.charCodeAt(0));
      const file = new File([bytes], 'outils.pdf', {{type:'application/pdf', lastModified:{STAMP}}});
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



def mouse_stroke(n, fx0, fy, fx1, steps=8):
    r = rect(n)
    y = r['t'] + r['h'] * fy
    xs = [r['l'] + r['w'] * (fx0 + (fx1 - fx0) * i / steps) for i in range(steps + 1)]
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=xs[0], y=y, button='left', buttons=1, clickCount=1)
    for x in xs[1:]:
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y, button='left', buttons=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=xs[-1], y=y, button='left', buttons=0, clickCount=1)


def mouse_vertical(n, fx, fy0, fy1, steps=6):
    r = rect(n)
    x = r['l'] + r['w'] * fx
    ys = [r['t'] + r['h'] * (fy0 + (fy1 - fy0) * i / steps) for i in range(steps + 1)]
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=x, y=ys[0], button='left', buttons=1, clickCount=1)
    for y in ys[1:]:
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y, button='left', buttons=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=x, y=ys[-1], button='left', buttons=0, clickCount=1)


def rgba(n, fx, fy):
    return c.js(f"""(()=>{{ const cv=pdfPageWrappers[{n}].querySelector('.ink-layer');
        return Array.from(cv.getContext('2d').getImageData(Math.round({fx}*cv.width), Math.round({fy}*cv.height), 1, 1).data); }})()""")


click = lambda el: c.js(f"document.getElementById('{el}').click(); 1")

# ---------------------------------------------------------------------------------------------------------------
boot(clear=True)
upload()
show_page(1)
ink_mode('2')
check("0 nothing to undo or redo yet: both buttons greyed out", "document.getElementById('ink-undo').disabled && document.getElementById('ink-redo').disabled")

# ---- 1 marker: see-through, wide, under the pen, its own colour
click('ink-marker')
c.js("document.querySelector('.ink-color[data-c=\"#f2c200\"]').click(); 1")
mouse_stroke(1, 0.2, 0.30, 0.7)
click('ink-pen')
c.js("document.querySelector('.ink-color[data-c=\"#d1242f\"]').click(); 1")
mouse_stroke(1, 0.2, 0.30, 0.7)
check("1 a marker stroke: flag m, no pressure, 6x the slider width, its colour; then a red pen stroke on the same line",
      "inkStrokes(1).length===2 && inkStrokes(1)[0].m===1 && inkStrokes(1)[0].c==='#f2c200' && inkStrokes(1)[0].p.every(pt => pt.length===2) && Math.abs(inkStrokes(1)[0].w / inkStrokes(1)[1].w - 6) < 1e-9 && !inkStrokes(1)[1].m && inkStrokes(1)[1].c==='#d1242f'")
on_line, beside = rgba(1, 0.45, 0.30), rgba(1, 0.45, 0.30 + 4 / c.js("rect=pdfPageWrappers[1].querySelector('.ink-layer').getBoundingClientRect().height"))
assert on_line[0] > 150 and on_line[1] < 120 and on_line[3] > 200, ('the pen line is not on top of the marker', on_line)
assert 60 < beside[3] < 120 and beside[0] > 200 and beside[1] > 150, ('the marker beside the pen line is not see-through yellow', beside)
print('PASS 1b the pen line is drawn on top; the marker around it is see-through yellow', flush=True)
check("1c pen and marker remember their own colours", "localStorage.getItem('reader_ink_color')==='#d1242f' && localStorage.getItem('reader_ink_marker_color')==='#f2c200'")
check("1d Undo is available after a stroke, Redo is not", "!document.getElementById('ink-undo').disabled && document.getElementById('ink-redo').disabled")

# ---- 2 partial eraser: the pen line is cut in two, the marker under it too, the rest stays
click('ink-erase')
check("2 the eraser removes only what is under it by default", "state.inkErase && !state.inkEraseWhole && !document.getElementById('ink-erase').classList.contains('whole')")
before = c.js("JSON.stringify(state.ink['1'])")
mouse_vertical(1, 0.45, 0.25, 0.35)
check("2b one vertical rub through the middle: the pen stroke and the marker are each cut into two pieces, nothing else changes",
      "inkStrokes(1).length===4 && inkStrokes(1).filter(s => s.m).length===2 && inkStrokes(1).every(s => s.p.every(pt => Math.abs(pt[0]-0.45) > 0.005)) && inkStrokes(1).some(s => !s.m && s.p[0][0] < 0.21) && inkStrokes(1).some(s => !s.m && s.p.at(-1)[0] > 0.69) || JSON.stringify(inkStrokes(1).map(s => [s.m||0, s.p[0][0], s.p.at(-1)[0]]))")
assert rgba(1, 0.45, 0.30)[3] == 0, 'ink left under the eraser'
assert rgba(1, 0.30, 0.30)[3] > 200 and rgba(1, 0.60, 0.30)[3] > 200, 'the eraser removed more than what was under it'
print('PASS 2c the canvas is empty under the eraser and inked on both sides', flush=True)
after = c.js("JSON.stringify(state.ink['1'])")

# ---- 3 the whole rub is ONE Undo step; Redo puts it back
click('ink-undo')
check("3 Undo brings the two whole strokes back in one step", f"JSON.stringify(state.ink['1'])==={json.dumps(before)}")
check("3b ... and Redo is available", "!document.getElementById('ink-redo').disabled")
click('ink-redo')
check("3c Redo cuts them again", f"JSON.stringify(state.ink['1'])==={json.dumps(after)}")
click('ink-undo'); click('ink-undo')
check("3d Undo twice more: the red stroke is gone too (marker only)", "inkStrokes(1).length===1 && inkStrokes(1)[0].m===1")
click('ink-redo')
check("3e Redo returns the red stroke", f"JSON.stringify(state.ink['1'])==={json.dumps(before)}")

# ---- 4 second tap on 🧽: whole-stroke eraser
click('ink-erase')
check("4 a second tap on 🧽 switches to whole strokes (marked, remembered)", "state.inkEraseWhole && document.getElementById('ink-erase').classList.contains('whole') && localStorage.getItem('reader_ink_erase_whole')==='1'")
r = rect(1)
c.call('Input.dispatchMouseEvent', type='mousePressed', x=r['l'] + r['w'] * 0.30, y=r['t'] + r['h'] * 0.30, button='left', buttons=1, clickCount=1)
c.call('Input.dispatchMouseEvent', type='mouseMoved', x=r['l'] + r['w'] * 0.30, y=r['t'] + r['h'] * 0.30, button='left', buttons=1)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=r['l'] + r['w'] * 0.30, y=r['t'] + r['h'] * 0.30, button='left', buttons=0, clickCount=1)
check("4b a tap of the whole-stroke eraser removes the topmost stroke there entirely (the pen line), not the marker under it", "inkStrokes(1).length===1 && inkStrokes(1)[0].m===1 || JSON.stringify(inkStrokes(1).map(s => s.m||0))")
click('ink-erase')
check("4c a third tap: back to erasing only what is under it", "!state.inkEraseWhole && localStorage.getItem('reader_ink_erase_whole')==='0'")

# ---- 5 stored with the marker flag, back identical after closing the app
click('ink-pen')
mouse_stroke(1, 0.2, 0.6, 0.5)
c.js("inkSaved().then(() => 1)")
expected = c.js("JSON.stringify(state.ink)")
boot()
upload()
check("5 after closing the app and reopening the book: the marker stroke is still a marker, everything identical",
      f"JSON.stringify(state.ink)==={json.dumps(expected)} && state.ink['1'].some(s => s.m===1)", timeout=5)
print('ALL PDF INK TOOLS CHECKS PASSED')
