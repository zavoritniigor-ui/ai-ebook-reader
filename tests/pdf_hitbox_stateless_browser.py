"""User-reported bug: in the PDF reader, tapping/clicking blank white space near a
word does nothing — UNTIL that word has been tapped once (selected). After that,
the SAME blank spot (and any blank space within a large radius — reported as
3-4 cm) reopens the translation popup for that word, even after the popup has
been closed. Multiple previously-tapped words near the page's edges leave behind
multiple such dead zones.

Root cause: js/selection.js's selectWordAtPoint() has an "already-highlighted
word tapped again" fast path — meant only for the case of literally re-tapping
the SAME already-selected word — that returns the word immediately once
caretRangeAt()/pdfNearestSpan() resolves anywhere inside its `.word-visited`
wrapper span, with NO check that the tap was actually near that word. Elsewhere
in the same function, a FRESH (never-yet-selected) word is only ever returned
after an isPointInRects() distance check (10px tolerance in PDF). Since
`.word-visited` is intentionally permanent (it's the app's "already looked up"
reading aid, never removed when the popup closes) and pdfNearestSpan() has no
maximum search distance (by design, to recover from pdf.js's coordinate
snapping during pinch-zoom), ANY blank-space tap for which that word happens to
be the geometrically nearest text — no matter how far away, and regardless of
whether the popup was ever reopened in between — falls through this unguarded
fast path and "reactivates" it.

Confirmed empirically before writing the fix: calling caretRangeAt() at the
exact same blank point before vs. after selecting the nearby word resolves to
plain, unwrapped text before selection (correctly rejected by
isPointInRects() downstream) and to text inside `.word-visited` after selection
(bypassing that check entirely) — the state-dependent asymmetry the user
described.

Fix: the fast path now runs the SAME isPointInRects() check (using the
highlighted word's own rects) before returning it, exactly matching how a
fresh word is validated. This makes hit-testing stateless with respect to
which words were previously selected: a `.word-visited` word is now just as
easy or hard to hit as one that was never tapped.

Uses edge_words_pdf_bytes() (tests/browser_cdp.py) — one word hard against the
left margin, one hard against the right margin (same line), and one isolated
word lower on the page — to cover edge-of-text-block cases specifically.
Exercises both real touch dispatch (the actual mobile tap-to-translate path,
which also drives the popup-close pointerdown listener in js/ui-tooltip.js)
and direct selectWordAtPoint() calls (for exact, repeatable margin distances).
READER_TTS_URL can target production.
"""
import base64, os
from browser_cdp import CDP, edge_words_pdf_bytes

c = CDP()
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=900, height=1200, deviceScaleFactor=2, mobile=True)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")


def pause(seconds): c.js(f'new Promise(resolve=>setTimeout(resolve,{seconds * 1000}))')
def touch(kind, points): c.call('Input.dispatchTouchEvent', type=kind, touchPoints=[dict(x=x, y=y, id=i, radiusX=3, radiusY=3, force=1) for i, x, y in points])
def tap(x, y):
    touch('touchStart', [(1, x, y)]); touch('touchEnd', [])
    pause(0.15)


def check(name, expr):
    value = c.js(expr)
    assert value is True, (name, value)
    print('PASS', name, flush=True)


pause(1)
data = base64.b64encode(edge_words_pdf_bytes()).decode()
loaded = c.js(f'''(async()=>{{
    localStorage.clear(); state.pdfScale=1; state.pdfFit='width'; state.format='pdf'; state.bookKey='hitbox-stateless-test';
    document.body.classList.add('pdf-mode','immersive-mode');
    state.translateMode=true; els.pages.classList.add('mode-translate');
    window.__errors=[]; window.addEventListener('error',e=>__errors.push(e.message));
    window.__opened=[]; window.__realHandle=handleWordOrSelection;
    handleWordOrSelection=(word,x,y)=>{{__opened.push(word); els.tooltip.style.display='flex';}};
    window.__pendingPdfRenders=0; window.__lastPdfRender=performance.now();
    const originalRender=renderPdfPage;
    renderPdfPage=async(...args)=>{{
        __pendingPdfRenders++; __lastPdfRender=performance.now();
        try {{ return await originalRender(...args); }}
        finally {{ __pendingPdfRenders--; __lastPdfRender=performance.now(); }}
    }};
    const file=new File([Uint8Array.from(atob('{data}'),c=>c.charCodeAt(0))],'fixture.pdf');
    await initPdf(file); return {{text: els.pages.textContent}};
}})()''')
assert 'LeftEdge' in loaded['text'] and 'RightEdge' in loaded['text'] and 'MiddleWord' in loaded['text'], loaded
pause(0.5)

# Match the reselect suite: viewport setup may queue a delayed resize render.
c.wait('__pendingPdfRenders===0 && performance.now()-__lastPdfRender>400')


def word_rect(word):
    return c.js('''(()=>{
        const spans = pdfTextSpans(document.querySelector('.pdf-text-layer'));
        const target = spans.find(s => s.textContent.includes(''' + repr(word) + '''));
        const range = document.createRange();
        range.selectNodeContents(target);
        const r = range.getBoundingClientRect();
        return { left: r.left, top: r.top, bottom: r.bottom, right: r.right, midY: (r.top + r.bottom) / 2 };
    })()''')


def close_popup_via_neutral_tap():
    # A tap far from every word — the app's real "tap elsewhere closes the
    # popup" gesture (document-level pointerdown listener in ui-tooltip.js).
    tap(20, 20)


def opened():
    return c.js('window.__opened.slice()')


def reset_opened():
    c.js('window.__opened.length=0')


left = word_rect('LeftEdge')
right = word_rect('RightEdge')
middle = word_rect('MiddleWord')

# ---- A: blank-space tap BEFORE any selection -> no popup -------------------
blank_near_left = (left['left'], left['top'] - 40)  # 40px straight above LeftEdge
reset_opened()
tap(*blank_near_left)
check('A: blank space before any selection opens nothing', 'window.__opened.length===0')

# ---- Valid tap on the word still works --------------------------------------
reset_opened()
tap(left['left'] + 10, left['midY'])
check('valid tap on LeftEdge opens it', "window.__opened.length===1 && window.__opened[0]==='LeftEdge'")

# ---- B: close popup, then the EXACT SAME blank spot as step A --------------
close_popup_via_neutral_tap()
reset_opened()
tap(*blank_near_left)
check('B: same blank spot after selecting+closing opens nothing (the reported bug)', 'window.__opened.length===0')

# ---- C: outside the existing 10px PDF touch tolerance -----------------------
reset_opened()
tap(left['left'] + 10, left['top'] - 12)
check('C: 12px above LeftEdge glyphs opens nothing', 'window.__opened.length===0')

# ---- D: outside the 10px glyph margin ---------------------------------------
for dist in (13, 20, 40, 300):
    reset_opened()
    tap(left['left'] + 10, left['top'] - dist)
    check(f'D: {dist}px above LeftEdge opens nothing', 'window.__opened.length===0')

# ---- E: repeat with the LEFT-edge word specifically -------------------------
reset_opened()
tap(left['left'] + 10, left['midY'])
check('E: re-select LeftEdge (left margin word) still works', "window.__opened.length===1 && window.__opened[0]==='LeftEdge'")
close_popup_via_neutral_tap()
reset_opened()
tap(left['left'] - 30, left['midY'])  # blank space just outside the left margin, same line
check('E: blank space beside the left-edge word opens nothing after selection', 'window.__opened.length===0')

# ---- F: repeat with the RIGHT-edge word -------------------------------------
reset_opened()
tap(right['left'] + 10, right['midY'])
check('F: select RightEdge (right margin word) works', "window.__opened.length===1 && window.__opened[0]==='RightEdge'")
close_popup_via_neutral_tap()
reset_opened()
tap(right['right'] + 30, right['midY'])  # blank space just past the right margin
check('F: blank space beside the right-edge word opens nothing after selection', 'window.__opened.length===0')
reset_opened()
tap(right['left'] + 10, right['top'] - 40)
check('F: blank space above the right-edge word opens nothing after selection', 'window.__opened.length===0')

# ---- G: select several different edge words, then tap a blank page area ----
reset_opened()
tap(middle['left'] + 10, middle['midY'])
check('G: select MiddleWord too (third previously-selected word)', "window.__opened.length===1 && window.__opened[0]==='MiddleWord'")
close_popup_via_neutral_tap()
# A blank spot roughly between all three previously-selected words.
reset_opened()
tap((left['right'] + right['left']) / 2, (left['midY'] + middle['midY']) / 2)
check('G: blank page area near several previously-selected words opens nothing', 'window.__opened.length===0')

# ---- H: touchstart/pointerdown on blank space after prior selection --------
# A bare touchstart+touchEnd (no click synthesis assumed) still must not invoke
# selectWordAtPoint's stale fast path — checked directly, independent of
# whatever click synthesis this Chrome build does for a tap.
direct = c.js(f"selectWordAtPoint({blank_near_left[0]},{blank_near_left[1]})")
assert direct is None, ('H: direct selectWordAtPoint on stale blank spot', direct)
print('PASS H: touchstart/pointerdown-level hit-test (selectWordAtPoint) rejects the stale blank spot', flush=True)

check('no application errors', 'window.__errors.length===0 || JSON.stringify(window.__errors)')
print('ALL PDF HITBOX STATELESS CHECKS PASSED', flush=True)
