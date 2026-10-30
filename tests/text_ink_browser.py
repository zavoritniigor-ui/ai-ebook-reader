"""Handwriting in text books (js/text-ink.js): the pen works in EPUB (and every other text format) and the writing is tied
to the TEXT, so it stays with its words when the text flows again.

Owner (2026-10-30): «Писати і в EPUB/книгах». Before: the pen was PDF-only («Вибір області працює лише з PDF»).

Checks: the pen opens in an EPUB without the text moving; an underline is anchored to the character under its start and
stored per chapter (em units, IndexedDB `reader-text-ink`, nothing in localStorage); it is not on the next page and is
back on returning; after A+ (bigger font, the text flows again) it is still under the same word and grows with it; it
comes back after closing the app; Undo removes it and the chapter's record; after a stylus, a finger swipe turns the page.
"""
import base64, io, json, os, time, zipfile
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=850, deviceScaleFactor=1, mobile=False)
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def arch(files):
    o = io.BytesIO()
    with zipfile.ZipFile(o, 'w') as z:
        for n, d in files.items(): z.writestr(n, d)
    return o.getvalue()


PARAS = ''.join('<p>Paragraphe %d : le vent souffle sur la plaine et les arbres chantent doucement.</p>' % i for i in range(1, 60))
EPUB = arch({'META-INF/container.xml': '<container><rootfiles><rootfile full-path="OPS/p.opf"/></rootfiles></container>',
             'OPS/p.opf': '<package><manifest><item id="a" href="a.xhtml"/><item id="b" href="b.xhtml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>',
             'OPS/a.xhtml': '<html><body><h1>Un</h1><p>Le chat dort sur le tapis. Le mot CLEF est ici.</p>' + PARAS + '</body></html>',
             'OPS/b.xhtml': '<html><body><h1>Deux</h1><p>Le deuxième chapitre commence ici.</p></body></html>'})
B64 = base64.b64encode(EPUB).decode()


def boot(clear=False):
    c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
    if clear:
        c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); indexedDB.deleteDatabase('reader-text-ink'); 1")
        c.call('Page.reload'); c.wait(READY, timeout=30)
    c.js("showUpdateBanner=()=>{}; document.getElementById('sw-update-banner')?.remove(); window.confirm=()=>true; 1")


def open_book():
    c.js("window.__ok = 0; openBookFile(new File([Uint8Array.from(atob(%s), ch => ch.charCodeAt(0))], 'livre.epub', {type: 'application/epub+zip', lastModified: 78})).then(() => { window.__ok = 1; }); 1" % json.dumps(B64))
    c.wait("window.__ok === 1", timeout=30); time.sleep(1.2)
    c.js("textInkLoadPromise.then(() => 1)")


def word_box(word):
    return c.js("""(w => { const it = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
      while ((n = it.nextNode())) { const i = n.nodeValue.indexOf(w); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + w.length);
        const b = r.getBoundingClientRect(); return {l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height, off: textOffsetOfPoint(n, i)}; } } return null; })(%s)""" % json.dumps(word))


def ink_alpha(x, y):
    """Alpha of the text writing layer at the screen point (x, y)."""
    return c.js(f"""(()=>{{ const cv=document.getElementById('text-ink-layer'); if (!cv || cv.hidden || !cv.width) return 0; const r=cv.getBoundingClientRect(), k=cv.width/r.width;
        return cv.getContext('2d').getImageData(Math.round(({x}-r.left)*k), Math.round(({y}-r.top)*k), 1, 1).data[3]; }})()""")


def underline(word):
    b = word_box(word)
    y = b['b'] + 2
    xs = [b['l'] + (b['r'] - b['l']) * i / 6 for i in range(7)]
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=xs[0], y=y, button='left', buttons=1, clickCount=1)
    for x in xs[1:]:
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y, button='left', buttons=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=xs[-1], y=y, button='left', buttons=0, clickCount=1)
    return b


# ---------------------------------------------------------------------------------------------------------------
boot(clear=True)
open_book()
pages_before = c.js("state.totalPagesInChapter")
assert pages_before >= 3, pages_before
c.js("document.getElementById('btn-ink').click(); inkWidth.value='3'; 1")
time.sleep(0.5)
check("1 the pen opens in an EPUB: writing layer over the page, ‹ › in the toolbar, the text did not flow again",
      f"state.inkMode && !!document.getElementById('text-ink-layer') && !document.getElementById('text-ink-layer').hidden && !document.getElementById('ink-next').hidden && state.totalPagesInChapter==={pages_before} && state.pageInChapter===0")

b = underline('CLEF')
c.js("textInkSaved().then(() => 1)")
check("2 the underline is anchored to the letter under its start (the C of CLEF) and kept for chapter 0, in em",
      f"state.textInk[0]?.length===1 && Math.abs(state.textInk[0][0].a - {b['off']}) <= 1 && state.textInk[0][0].p.every(pt => Math.abs(pt[0]*64 - Math.round(pt[0]*64)) < 1e-9) && state.ink.text.length===1")
check("2b stored in IndexedDB, nothing in localStorage",
      "(async () => { const db = await textInkDb(); const v = await new Promise(r => { const q = db.transaction('chapters').objectStore('chapters').get([state.bookKey, '0']); q.onsuccess = () => r(q.result); }); const bad = Object.keys(localStorage).filter(k => k.startsWith('ink_') || k.includes(state.bookKey) && /ink/i.test(k)); return Array.isArray(v) && v.length===1 && v[0].p instanceof Int16Array && !bad.length || JSON.stringify({n: v && v.length, int16: v && v[0] && v[0].p && v[0].p.constructor.name, bad}); })()")
mid = (b['l'] + b['r']) / 2
assert ink_alpha(mid, b['b'] + 2) > 0, 'the underline is not drawn'
print('PASS 2c drawn under the word', flush=True)
stored = c.js("JSON.stringify(state.textInk)")

c.js("document.getElementById('ink-next').click(); 1"); time.sleep(0.6)
check("3 next page (‹ › in the toolbar): the underline is not shown there", "state.pageInChapter===1 && state.ink.text.length===0")
assert ink_alpha(mid, b['b'] + 2) == 0
c.js("document.getElementById('ink-prev').click(); 1"); time.sleep(0.6)
check("3b back: shown again at the same place", "state.pageInChapter===0 && state.ink.text.length===1")
assert ink_alpha(mid, b['b'] + 2) > 0
print('PASS 3c redrawn under the word', flush=True)

# ---- bigger font: the text flows again, the underline goes with its word and grows with it
w0 = c.js("state.ink.text[0].w * document.getElementById('text-ink-layer').getBoundingClientRect().width")
c.js("document.getElementById('zoom-in').click(); document.getElementById('zoom-in').click(); 1"); time.sleep(1.2)
b2 = word_box('CLEF')
assert b2 and (b2['r'] - b2['l']) > (b['r'] - b['l']) * 1.05, ('the font did not grow', b, b2)
check("4 after A+ A+ the underline is still shown, wider (it grows with the text)",
      f"state.ink.text.length===1 && state.ink.text[0].w * document.getElementById('text-ink-layer').getBoundingClientRect().width > {w0} * 1.05")
mid2 = (b2['l'] + b2['r']) / 2
under = max(ink_alpha(mid2, b2['b'] + d) for d in (1, 2, 3, 4, 5))
assert under > 0, ('not under the word after the text flowed again', b2)
check("4b ... and the stored stroke did not change", f"JSON.stringify(state.textInk)==={json.dumps(stored)}")
c.js("document.getElementById('zoom-out').click(); document.getElementById('zoom-out').click(); 1"); time.sleep(1.0)

# ---- close the app, reopen the book
boot()
open_book()
check("5 after closing the app and reopening the book: the same handwriting, drawn under the word",
      f"JSON.stringify(state.textInk)==={json.dumps(stored)} && state.ink.text.length===1", timeout=5)
b3 = word_box('CLEF')
assert ink_alpha((b3['l'] + b3['r']) / 2, b3['b'] + 2) > 0
print('PASS 5b redrawn without opening the pen', flush=True)

# ---- Undo
c.js("document.getElementById('btn-ink').click(); 1"); time.sleep(0.4)
b4 = underline('tapis')
c.js("textInkSaved().then(() => 1)")
check("6 a second underline on the same page", "state.textInk[0].length===2 && state.ink.text.length===2")
c.js("document.getElementById('ink-undo').click(); textInkSaved().then(() => 1)")
check("6b Undo removes only it, also from storage",
      f"JSON.stringify(state.textInk)==={json.dumps(stored)} && (async () => {{ const db = await textInkDb(); const v = await new Promise(r => {{ const q = db.transaction('chapters').objectStore('chapters').get([state.bookKey, '0']); q.onsuccess = () => r(q.result); }}); return v.length===1; }})()")

# ---- stylus seen: a finger swipe turns the page
c.call('Input.dispatchMouseEvent', type='mousePressed', x=300, y=600, button='left', buttons=1, clickCount=1, pointerType='pen', force=0.5)
c.call('Input.dispatchMouseEvent', type='mouseMoved', x=340, y=600, button='none', buttons=1, pointerType='pen', force=0.5)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=340, y=600, button='left', buttons=0, clickCount=1, pointerType='pen', force=0.5)
time.sleep(0.6)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
n = c.js("state.textInk[0].length")
c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': 800, 'y': 400, 'id': 1}])
for i in range(1, 6):
    c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=[{'x': 800 - 60 * i, 'y': 405, 'id': 1}])
c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
time.sleep(0.6)
check("7 after the stylus, a finger swipe on the page turns it and writes nothing",
      f"state.pageInChapter===1 && state.textInk[0].length==={n}")
c.call('Emulation.setTouchEmulationEnabled', enabled=False)
print('ALL TEXT INK CHECKS PASSED')
