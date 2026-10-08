"""PDF ink undo is owned by the document it was created in (Phase A, P0).

Reproduced data loss before the fix: book A page 1 had ink, the user cleared it (an undoable 'clear'),
opened book B (which loaded its own ink correctly) and pressed Undo -- the page-keyed history
('history_1') still held A's 'clear', so Undo wrote A's strokes into B's page and saveInk() persisted
them as ink_<B>. Undo history, the active ink page, in-progress strokes and every bound canvas are now
scoped to the document whose ink loadInk() loaded; nothing from A can mutate or persist into B.

Strokes are drawn with real mouse input (CDP Input.dispatchMouseEvent) on the page's own ink canvas.
Each fixture PDF has a fixed lastModified so reopening it yields the SAME bookKey (A -> B -> A).
"""
import base64, json, os, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1200, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")
c.js("localStorage.clear();showUpdateBanner=()=>{};document.getElementById('sw-update-banner')?.remove()")
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof loadInk==='function'")
c.js("window.confirm=()=>true")  # the Clear button asks first

def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.monotonic() + timeout
    while result is not True and time.monotonic() < deadline:
        time.sleep(0.1)
        result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name)

PDF_A = pdf_document([{'text': 'Book A page one'}, {'text': 'Book A page two'}])
PDF_B = pdf_document([{'text': 'Book B page one, different text'}, {'text': 'Book B page two'}, {'text': 'Book B page three'}])
STAMP = {'a.pdf': 1700000000000, 'b.pdf': 1700000500000}

def upload(pdf_bytes, name):
    b64 = base64.b64encode(pdf_bytes).decode()
    c.js("pdfContinuousReady=false")
    c.js(f"""(() => {{
      const bytes = Uint8Array.from(atob({b64!r}), c=>c.charCodeAt(0));
      const file = new File([bytes], {name!r}, {{type:'application/pdf', lastModified:{STAMP[name]}}});
      const dt = new DataTransfer(); dt.items.add(file);
      document.getElementById('file-upload').files = dt.files;
      document.getElementById('file-upload').dispatchEvent(new Event('change'));
    }})()""")
    c.wait("state.format==='pdf' && pdfContinuousReady && !!state.pdfDoc && !!pdfPageWrappers[1]?.querySelector('.ink-layer')", timeout=20)
    c.js("els.container.scrollTop=0;document.getElementById('btn-ink').click();inkWidth.value='2'")
    c.wait("state.inkMode && !!pdfPageWrappers[1].querySelector('.ink-layer').dataset.bound", timeout=5)

def key(name):
    return c.js(f"'ink_'+bookKeyFor({{name:{name!r},size:{len(PDF_A if name == 'a.pdf' else PDF_B)},lastModified:{STAMP[name]}}})")

def draw(fx, fy, dx=.15, dy=.04, page=1):
    """One real mouse stroke on `page`'s ink canvas: fx is a fraction of the canvas width, fy a fraction
    of the canvas part that is inside the viewport (a fit-width page is taller than the window)."""
    r = c.js(f"""(()=>{{const r=pdfPageWrappers[{page}].querySelector('.ink-layer').getBoundingClientRect();
        const top=Math.max(r.top,0), bottom=Math.min(r.bottom,innerHeight);return {{l:r.left,t:top,w:r.width,h:bottom-top}}}})()""")
    x0, y0 = r['l'] + r['w'] * fx, r['t'] + r['h'] * fy
    pts = [(x0 + r['w'] * dx * i / 6, y0 + r['h'] * min(dy, .9 - fy) * i / 6) for i in range(7)]
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=pts[0][0], y=pts[0][1], button='left', buttons=1, clickCount=1)
    for x, y in pts[1:]:
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y, button='left', buttons=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=pts[-1][0], y=pts[-1][1], button='left', buttons=0, clickCount=1)

def erase_at(fx, fy, page=1):
    c.js("state.inkErase=true")
    r = c.js(f"(()=>{{const r=pdfPageWrappers[{page}].querySelector('.ink-layer').getBoundingClientRect();return {{l:r.left,t:r.top,w:r.width,h:r.height}}}})()")
    x, y = r['l'] + r['w'] * fx, r['t'] + r['h'] * fy
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=x, y=y, button='left', buttons=1, clickCount=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=x, y=y, button='left', buttons=0, clickCount=1)
    c.js("state.inkErase=false")

undo = lambda: c.js("document.getElementById('ink-undo').click()")
clear = lambda: c.js("document.getElementById('ink-clear').click()")
mem = lambda page=1: c.js(f"JSON.stringify(state.ink['{page}']||[])")
stored = lambda name: c.js(f"localStorage.getItem({key(name)!r})")
def stored_page(name, page=1):
    raw = stored(name)
    return json.dumps(json.loads(raw).get(str(page), []), separators=(',', ':')) if raw else '[]'

def seed_b():
    """B gets its own existing ink (drawn in B, top-left) and is reopened so it starts with no history."""
    upload(PDF_B, 'b.pdf')
    c.js("state.ink={};saveInk()")
    draw(.1, .1, dy=0)
    assert c.js("inkStrokes(1).length") == 1
    upload(PDF_B, 'b.pdf')
    return mem(), stored('b.pdf')

def seed_a(n=2):
    upload(PDF_A, 'a.pdf')
    c.js("state.ink={};saveInk()")
    for i in range(n):
        draw(.3, .4 + i * .15)
    assert c.js("inkStrokes(1).length") == n, c.js("inkStrokes(1).length")

# ---- TEST 1: A clear -> open B (existing ink) -> Undo: B unchanged (the audited reproduction) -------------
b_mem, b_raw = seed_b()
seed_a()
a_ink = mem()
clear()
check('T1 setup: A cleared, undo history holds the clear', "inkStrokes(1).length===0 && getInkHistory(1).at(-1)?.type==='clear'")
upload(PDF_B, 'b.pdf')
check('T1 B loads its own ink', f"JSON.stringify(state.ink['1'])==={json.dumps(b_mem)}")
undo()
check('T1 Undo after switch leaves B in memory unchanged', f"JSON.stringify(state.ink['1']||[])==={json.dumps(b_mem)}")
assert stored('b.pdf') == b_raw, ('T1 ink_B rewritten', stored('b.pdf'))
assert stored_page('b.pdf') != a_ink
print('PASS T1 persisted ink_B unchanged (never A\'s strokes)')
check('T1 B has no undo history inherited from A', "Object.values(inkHistory).every(h=>h.length===0)")

# ---- TEST 2: A draw -> open B -> Undo: A's draw cannot remove B's stroke -----------------------------------
seed_a(1)
draw(.3, .7)  # the undoable A draw
upload(PDF_B, 'b.pdf')
undo()
check('T2 A draw-undo cannot remove B\'s stroke', f"JSON.stringify(state.ink['1']||[])==={json.dumps(b_mem)}")
assert stored('b.pdf') == b_raw
print('PASS T2 ink_B unchanged')

# ---- TEST 3: A erase -> open B -> Undo: A's erase cannot reinsert A's stroke into B -------------------------
seed_a(1)
c.js("window.__aStroke=JSON.stringify(inkStrokes(1)[0])")
p0 = c.js("inkStrokes(1)[0].p[0]")
erase_at(p0[0], p0[1])
check('T3 setup: A stroke erased, erase op recorded', "inkStrokes(1).length===0 && getInkHistory(1).at(-1)?.type==='erase'")
upload(PDF_B, 'b.pdf')
undo()
check('T3 A erase-undo cannot insert into B', f"JSON.stringify(state.ink['1']||[])==={json.dumps(b_mem)}")
assert stored('b.pdf') == b_raw
print('PASS T3 ink_B unchanged')

# ---- TEST 4: A clear -> open B -> NEW B draw -> Undo: only B's new stroke is undone -------------------------
seed_a()
clear()
upload(PDF_B, 'b.pdf')
draw(.5, .8)
check('T4 setup: B has its own stroke + the new one', "inkStrokes(1).length===2")
undo()
check('T4 Undo removes only B\'s new stroke', f"JSON.stringify(state.ink['1'])==={json.dumps(b_mem)}")
assert stored('b.pdf') == b_raw, stored('b.pdf')
undo()  # nothing left that belongs to B: no-op, never A's clear
check('T4 second Undo is a no-op in B', f"JSON.stringify(state.ink['1'])==={json.dumps(b_mem)}")
assert stored('b.pdf') == b_raw
print('PASS T4 ink_B unchanged after both Undos')

# ---- TEST 5: A -> B -> A ownership --------------------------------------------------------------------------
seed_a()
a_raw = stored('a.pdf')
upload(PDF_B, 'b.pdf')
draw(.5, .6)
b2_raw = stored('b.pdf')
assert b2_raw != b_raw
upload(PDF_A, 'a.pdf')
check('T5 back in A: A\'s own ink, owner is A', f"inkOwner===state.bookKey && state.bookKey==={key('a.pdf')[4:]!r} && inkStrokes(1).length===2")
undo()  # B's draw must not act on A
check('T5 B\'s draw-undo cannot touch A', "inkStrokes(1).length===2")
assert stored('a.pdf') == a_raw and stored('b.pdf') == b2_raw
draw(.6, .2)
undo()
check('T5 A\'s own new op still undoes in A', "inkStrokes(1).length===2")
assert stored('a.pdf') == a_raw and stored('b.pdf') == b2_raw
print('PASS T5 A and B storage each keep their own ink')

# ---- TEST 6: stale async/late paths from A cannot save into B -----------------------------------------------
upload(PDF_A, 'a.pdf')
c.js("window.__aCanvas=pdfPageWrappers[1].querySelector('.ink-layer')")
upload(PDF_B, 'b.pdf')
b3_mem, b3_raw = mem(), stored('b.pdf')
check('T6 A canvas is detached', "!__aCanvas.isConnected")
# Late pointer events delivered to A's (now detached) canvas -- e.g. lostpointercapture after the wipe.
c.js("""for (const t of ['pointerdown','pointermove','pointerup','lostpointercapture'])
    __aCanvas.dispatchEvent(new PointerEvent(t,{pointerId:1,bubbles:true,clientX:10,clientY:10}))""")
check('T6 late A canvas events do not touch B', f"JSON.stringify(state.ink['1']||[])==={json.dumps(b3_mem)} && !inkDrawing && Object.values(inkHistory).every(h=>h.length===0)")
# The window in openBookFile where bookKey already names the next book but its ink is not loaded yet:
# a save in that window (pagehide, cancelPdfInteraction, pinch rollback) must not write A's ink as B's.
c.js(f"""(()=>{{const k=state.bookKey;state.bookKey={key('a.pdf')[4:]!r};loadInk();state.bookKey=k;saveInk();}})()""")
assert stored('b.pdf') == b3_raw, ('T6 A ink saved under B', stored('b.pdf'))
print('PASS T6 save while bookKey names B but ink is A\'s is refused')
upload(PDF_B, 'b.pdf')

# ---- TEST 7: normal same-document Undo still works ----------------------------------------------------------
seed_a(0)
draw(.3, .3); draw(.3, .5)
check('T7 two strokes', "inkStrokes(1).length===2")
s0 = c.js("JSON.stringify(inkStrokes(1)[0])")
undo()
check('T7 Undo draw removes the LAST stroke only', f"inkStrokes(1).length===1 && JSON.stringify(inkStrokes(1)[0])==={json.dumps(s0)}")
assert stored_page('a.pdf') == mem()
p0 = c.js("inkStrokes(1)[0].p[0]")
erase_at(p0[0], p0[1])
check('T7 erase', "inkStrokes(1).length===0")
undo()
check('T7 Undo erase restores the stroke', f"inkStrokes(1).length===1 && JSON.stringify(inkStrokes(1)[0])==={json.dumps(s0)}")
draw(.5, .7)
before_clear = mem()
clear()
check('T7 clear', "inkStrokes(1).length===0")
undo()
check('T7 Undo clear restores the page', f"JSON.stringify(state.ink['1'])==={json.dumps(before_clear)}")
assert stored_page('a.pdf') == before_clear
# Undo of a draw after a pinch-style rollback (strokes replaced by a structuredClone) still finds it by content.
draw(.6, .85)
c.js("state.ink['1']=structuredClone(state.ink['1'])")
undo()
check('T7 Undo after clone-restore removes the right stroke', f"JSON.stringify(state.ink['1'])==={json.dumps(before_clear)}")
print('PASS T7 persisted ink matches memory')

print('ALL PDF INK OWNERSHIP TESTS PASSED')
