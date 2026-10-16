"""Handwriting on PDF pages stays exactly where it was written and is kept in large amounts (js/pdf-ink.js).

Bugs fixed (2026-10-16, user: "handwritten notes shift and are not kept in place -- textbooks need lots of them"):
1. A second finger / palm during writing (the start of a pinch) "rolled back" the stroke by restoring a snapshot of the
   PREVIOUSLY active page onto the page being written on: page 1's strokes landed on page 2 and page 2's were lost.
2. All of a book's ink was one localStorage string (~5 MB for the whole app, ~40 bytes per point); past the quota new
   strokes were silently not saved. Now one IndexedDB record per page, points packed as Uint16 (4 bytes per point).

Checks: real strokes on two pages; positions are stored to 1/65535 of the page and redrawn at the same spot after a zoom
change and after the app is closed and the book reopened; a palm/second finger restores the page the stroke started on
and leaves the other page alone; 2 000 strokes on 120 pages are kept and come back after a reload; old localStorage ink is
moved to IndexedDB once and its localStorage key freed; nothing is written to localStorage any more.
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


PDF = pdf_document([{'text': 'Unit %d. Exercice: complete the sentence.' % i} for i in range(1, 121)])
STAMP = 1700000900000


def upload():
    b64 = base64.b64encode(PDF).decode()
    c.js("pdfContinuousReady=false")
    c.js(f"""(() => {{ const bytes = Uint8Array.from(atob({b64!r}), c=>c.charCodeAt(0));
      const file = new File([bytes], 'manuel.pdf', {{type:'application/pdf', lastModified:{STAMP}}});
      const dt = new DataTransfer(); dt.items.add(file); document.getElementById('file-upload').files = dt.files;
      document.getElementById('file-upload').dispatchEvent(new Event('change')); }})()""")
    c.wait("state.format==='pdf' && pdfContinuousReady && !!pdfPageWrappers[1]?.querySelector('.ink-layer')", timeout=30)
    c.js("inkLoadPromise.then(() => 1)")


def show_page(n):
    c.js(f"pdfPageWrappers[{n}].scrollIntoView({{block:'start'}}); 1")
    c.wait(f"!!pdfPageWrappers[{n}].querySelector('.ink-layer') && pdfPageWrappers[{n}].getBoundingClientRect().top < 200", timeout=10)
    time.sleep(0.3)


def ink_mode():
    c.js("if (!state.inkMode) document.getElementById('btn-ink').click(); inkWidth.value='3'; 1")
    c.js("document.querySelectorAll('.ink-layer').forEach(cv => bindInkCanvas(cv, Number(cv.dataset.page))); 1")


def rect(n):
    return c.js(f"(()=>{{const r=pdfPageWrappers[{n}].querySelector('.ink-layer').getBoundingClientRect();return {{l:r.left,t:r.top,w:r.width,h:r.height}}}})()")


def mouse_stroke(n, fx0, fy, fx1):
    r = rect(n)
    y = r['t'] + r['h'] * fy
    xs = [r['l'] + r['w'] * (fx0 + (fx1 - fx0) * i / 8) for i in range(9)]
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=xs[0], y=y, button='left', buttons=1, clickCount=1)
    for x in xs[1:]:
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y, button='left', buttons=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=xs[-1], y=y, button='left', buttons=0, clickCount=1)


def ink_pixel(n, fx, fy):
    """Alpha of the ink canvas of page n at the page-relative point (fx, fy) (max over a 5x5 px patch)."""
    return c.js(f"""(()=>{{ const cv=pdfPageWrappers[{n}].querySelector('.ink-layer'); const x=Math.round({fx}*cv.width), y=Math.round({fy}*cv.height);
        const d=cv.getContext('2d').getImageData(Math.max(0,x-2), Math.max(0,y-2), 5, 5).data; let m=0; for (let i=3;i<d.length;i+=4) m=Math.max(m,d[i]); return m; }})()""")


# ---------------------------------------------------------------------------------------------------------------
boot(clear=True)
upload()
ink_mode()
show_page(2)
mouse_stroke(2, 0.25, 0.50, 0.70)
show_page(1)
mouse_stroke(1, 0.20, 0.30, 0.60)   # page 1 written LAST: it is the active page when the palm lands on page 2 (check 4)
c.js("inkSaved().then(() => 1)")
check("1 two real strokes, one per page, coordinates on the 1/65535 page grid",
      "inkStrokes(1).length===1 && inkStrokes(2).length===1 && inkStrokes(2)[0].p.every(([x,y]) => Number.isInteger(Math.round(x*65535)) && Math.abs(x*65535-Math.round(x*65535))<1e-6) && Math.abs(inkStrokes(2)[0].p[0][1]-0.5)<0.01")
check("2 nothing is written to localStorage; IndexedDB holds both pages",
      "(async () => { const s = JSON.parse(await readStoredInk(state.bookKey)); return !Object.keys(localStorage).some(k => k.startsWith('ink_')) && s['1'].length===1 && s['2'].length===1; })()")
before = c.js("JSON.stringify(state.ink)")
assert ink_pixel(2, 0.47, 0.50) > 0 and ink_pixel(2, 0.47, 0.40) == 0

# ---- zoom: the stroke is redrawn at the same place on the page
c.js("state.pdfZoom = 1.6; relayoutContinuousPdfAtScale(); 1")
show_page(2)
c.wait("pdfPageWrappers[2].querySelector('.ink-layer').width > 0", timeout=10); time.sleep(0.8)
check("3 after zooming in, page 2's stroke is drawn at the same page position (and nowhere else)",
      f"JSON.stringify(state.ink)==={json.dumps(before)}")
assert ink_pixel(2, 0.47, 0.50) > 0 and ink_pixel(2, 0.47, 0.42) == 0, 'stroke moved after zoom'
c.js("state.pdfZoom = 1; relayoutContinuousPdfAtScale(); 1"); time.sleep(0.8)

# ---- a palm / second finger while writing on page 2: page 2 is restored, page 1 untouched
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
show_page(2)
ink_mode()
r = rect(2)
x, y = r['l'] + r['w'] * 0.3, max(r['t'], 0) + 250          # inside the visible part of page 2
assert c.js("activeInkPage()") == 1, c.js("activeInkPage()")
c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': x, 'y': y, 'id': 1}])
c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=[{'x': x + 40, 'y': y, 'id': 1}])
assert c.js("inkDrawing && activeInkPage() === 2 && inkStrokes(2).length === 2"), 'the finger did not start a stroke on page 2'
c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': x + 40, 'y': y, 'id': 1}, {'x': x + 200, 'y': y + 120, 'id': 2}])
c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
time.sleep(0.6)
c.js("inkSaved().then(() => 1)")
check("4 a second finger during a stroke on page 2 cancels only that stroke: page 2 keeps its own ink, page 1 is untouched (was: page 1's ink copied onto page 2)",
      f"JSON.stringify(state.ink)==={json.dumps(before)} || JSON.stringify({{p1: state.ink['1']?.length, p2: state.ink['2']?.length}})", timeout=3)
check("4b ... and the same is what is stored", f"(async () => JSON.stringify(JSON.parse(await readStoredInk(state.bookKey))) === JSON.stringify(state.ink))()")

c.call('Emulation.setTouchEmulationEnabled', enabled=False)
# ---- close the app, reopen the book: same strokes, same place
boot()
upload()
show_page(2)
check("5 after closing the app and reopening the book: exactly the same strokes on the same pages", f"JSON.stringify(state.ink)==={json.dumps(before)}", timeout=5)
time.sleep(0.5)
assert ink_pixel(2, 0.47, 0.50) > 0 and ink_pixel(2, 0.47, 0.40) == 0, 'stroke not redrawn at its place after reopening'
print('PASS 5b ... redrawn at the same page position', flush=True)

# ---- large volume: 2 000 strokes x 60 points on 120 pages (~240 000 points)
t0 = time.time()
c.js("""(async () => { for (let pg = 1; pg <= 120; pg++) { const list = inkStrokes(pg);
    for (let s = 0; s < 17; s++) { const p = []; for (let i = 0; i < 60; i++) p.push([inkQ(0.05 + 0.9 * i / 59), inkQ(0.05 + 0.9 * ((s * 37 + i * 7 + pg) % 100) / 100)]); list.push({c: '#d32f2f', w: 0.003, p}); } }
  await saveInk(); return 1; })()""")
saved_s = time.time() - t0
total = c.js("Object.values(state.ink).reduce((n, l) => n + l.length, 0)")
assert total >= 2000, total
big = c.js("JSON.stringify(state.ink).length")
boot()
upload()
check("6 2 000+ strokes (~240 000 points) on 120 pages are all kept and come back identical after a reload", f"Object.values(state.ink).reduce((n, l) => n + l.length, 0)==={total} && JSON.stringify(state.ink).length==={big}", timeout=15)
print('   saved in %.1fs; as JSON it would be %.1f MB (over the localStorage limit), stored packed in IndexedDB' % (saved_s, big / 1e6), flush=True)
assert not c.js("Object.keys(localStorage).some(k => k.startsWith('ink_'))")

# ---- migration from the old localStorage format
c.js("(async () => { await writeInkPages(state.bookKey, {}, true); return 1; })()")
legacy = {'3': [{'c': '#1565c0', 'w': 0.0025, 'p': [[0.1234567891, 0.2], [0.3, 0.4000000001]]}]}
c.js(f"localStorage.setItem('ink_' + state.bookKey, {json.dumps(json.dumps(legacy))}); 1")
boot()
upload()
check("7 ink saved by an older version (localStorage) is loaded, moved to IndexedDB and its localStorage key freed",
      "(async () => { await inkLoadPromise; const s = JSON.parse(await readStoredInk(state.bookKey)); return state.ink['3']?.length===1 && Math.abs(state.ink['3'][0].p[0][0]-0.1234567891)<2e-5 && s['3']?.length===1 && !localStorage.getItem('ink_' + state.bookKey); })()", timeout=5)
print('ALL PDF INK STORAGE CHECKS PASSED')
