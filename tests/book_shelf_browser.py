"""«Мої книги»: an opened book (from the library or the device) is kept on the device (IndexedDB), so it is not lost when
Android unloads the app or it is closed — before, only the reading position survived and a library book had to be found and
downloaded again. After a reload the start screen lists it; one tap reopens it at the same page. The library window has a
«My books» source with Read / remove, and old books are evicted (at most 12). No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=800, deviceScaleFactor=1, mobile=False)
READY = "document.readyState==='complete' && !document.body.inert && typeof shelveBook==='function'"
c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); new Promise(r => { const q = indexedDB.deleteDatabase('reader-books'); q.onsuccess = q.onerror = q.onblocked = () => r(1); })")
c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.8)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


check('1 nothing kept yet: the start screen has no recent books', "document.querySelectorAll('#recent-books .recent-book').length === 0")
c.js("""(() => { let s = ''; for (let i = 0; i < 400; i++) s += 'Line ' + i + ' of the kept book. The quick brown fox jumps over the lazy dog again and again.\\n';
  window.__ok = 0; openBookFile(new File([s], 'Kept Book.txt', {type: 'text/plain', lastModified: 4242})).then(() => { window.__ok = 1; }); return 1; })()""")
c.wait("window.__ok === 1 && state.totalPagesInChapter >= 3", timeout=30); time.sleep(0.8)
c.wait("listShelfBooks().then(b => b.length === 1)", timeout=10)
check('2 the opened book is kept on the device', "listShelfBooks().then(b => b[0].title === 'Kept Book' && b[0].name === 'Kept Book.txt' && b[0].size > 10000)")
c.js("goNext(); goNext(); 1"); time.sleep(1)
c.js("saveBookmark(); 1"); time.sleep(0.3)
key_before = c.js("state.bookKey"); saved = json.loads(c.js("localStorage.getItem(state.bookKey)"))
assert saved['pageInChapter'] > 0, saved
c.call('Page.reload'); c.wait(READY, timeout=30)
c.wait("document.querySelectorAll('#recent-books .recent-book').length === 1", timeout=10)
check('3 after a restart the start screen lists it (title, format, size)', "(() => { const b = document.querySelector('#recent-books .recent-book'); return b.querySelector('b').textContent === 'Kept Book' && /^TXT · /.test(b.querySelector('small').textContent); })()")
c.js("document.querySelector('#recent-books .recent-book').click(); 1")
c.wait("state.format === 'txt' && state.totalPagesInChapter >= 3", timeout=30); time.sleep(1)
check('4 one tap reopens it at the saved page (same book key, so the position is restored)', "state.bookKey === %s && state.currentIndex === %d && state.pageInChapter === %d" % (json.dumps(key_before), saved['currentIndex'], saved['pageInChapter']))
c.js("openLibrary(); const s = document.getElementById('library-source'); s.value = 'shelf'; s.dispatchEvent(new Event('change')); 1"); time.sleep(0.8)
check('5 the library window has «My books»: the kept book with Read and remove, no search field or languages',
      "document.querySelectorAll('#library-list .library-card').length === 1 && document.querySelector('#library-list .library-name').textContent === 'Kept Book' && document.getElementById('library-q').hidden && document.getElementById('library-lang').hidden")
c.js("(() => { closeLibrary(); const s = document.getElementById('library-source'); s.value = 'gutenberg'; s.dispatchEvent(new Event('change')); closeLibrary(); return 1; })()"); time.sleep(0.5)
c.js("document.getElementById('btn-my-books').click(); 1"); time.sleep(0.8)
check('5b the menu button «📖 My books» opens the library straight on the kept books (even if another source was chosen last)',
      "document.getElementById('library-modal').classList.contains('open') && document.getElementById('library-source').value === 'shelf' && document.querySelector('#library-list .library-name').textContent === 'Kept Book' && document.getElementById(document.getElementById('btn-my-books').getAttribute('aria-labelledby')).textContent === t('mShelf')")
c.js("document.querySelector('#library-list .library-card .library-save').click(); 1"); time.sleep(0.8)
check('6 remove deletes it from the device', "listShelfBooks().then(b => b.length === 0 && document.querySelectorAll('#library-list .library-card').length === 0)")
c.js("closeLibrary(); 1")
c.js("""(async () => { const r = await fetch('tests/fixtures/pdf/reportlab-multilingual-illustrated.pdf'); const b = await r.blob();
  window.__ok = 0; await openBookFile(new File([b], 'Illustrated.pdf', {type: 'application/pdf', lastModified: 77})); window.__ok = 1; return 1; })()""")
c.wait("window.__ok === 1 && state.format === 'pdf'", timeout=40); time.sleep(1)
c.js("""(async () => { const r = await fetch('tests/fixtures/pdf/reportlab-multilingual-illustrated.pdf'); const b = await r.blob();
  await shelveBook(new File([b], 'Illustrated.pdf', {type: 'application/pdf', lastModified: 77}), state.bookKey); return 1; })()""")
check('6b a PDF gets its first page as a small JPEG cover', "listShelfBooks().then(b => { const x = b.find(k => k.name === 'Illustrated.pdf'); return !!x && x.cover instanceof Blob && x.cover.type === 'image/jpeg' && x.cover.size > 500; })")
c.js("""(async () => { const cv = document.createElement('canvas'); cv.width = 300; cv.height = 450; const g = cv.getContext('2d'); g.fillStyle = '#c03'; g.fillRect(0, 0, 300, 450);
  const png = await new Promise(r => cv.toBlob(r, 'image/png')); const z = new JSZip();
  z.file('mimetype', 'application/epub+zip', {compression: 'STORE'});
  z.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  z.file('OEBPS/content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">x</dc:identifier><dc:title>Cover test</dc:title><dc:language>en</dc:language></metadata><manifest><item id="c" href="c1.xhtml" media-type="application/xhtml+xml"/><item id="img" href="images/front.png" media-type="image/png" properties="cover-image"/></manifest><spine><itemref idref="c"/></spine></package>');
  z.file('OEBPS/c1.xhtml', '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>c</title></head><body><p>Hello cover world. This is the first chapter.</p></body></html>');
  z.file('OEBPS/images/front.png', png);
  const blob = await z.generateAsync({type: 'blob', mimeType: 'application/epub+zip'});
  window.__ok = 0; await openBookFile(new File([blob], 'Cover test.epub', {type: 'application/epub+zip', lastModified: 88})); window.__ok = 1;
  await shelveBook(new File([blob], 'Cover test.epub', {type: 'application/epub+zip', lastModified: 88}), state.bookKey); return 1; })()""")
c.wait("window.__ok === 1 && state.format === 'epub'", timeout=40)
check('6c an EPUB gets the image its manifest marks as cover-image (red), shrunk to 240 px wide',
      "listShelfBooks().then(async b => { const x = b.find(k => k.name === 'Cover test.epub'); if (!x || !(x.cover instanceof Blob)) return 'no cover'; const bm = await createImageBitmap(x.cover); const cv = document.createElement('canvas'); cv.width = 4; cv.height = 4; const g = cv.getContext('2d'); g.drawImage(bm, 0, 0, 4, 4); const d = g.getImageData(1, 1, 1, 1).data; return bm.width === 240 && d[0] > 150 && d[1] < 60 || [bm.width, ...d].join(); })")
c.call('Page.reload'); c.wait(READY, timeout=30)
c.wait("document.querySelectorAll('#recent-books .recent-book').length === 2", timeout=10); time.sleep(0.5)
check('6d the start screen shows both books with their cover images; the side tabs and ✦ are hidden there',
      "(() => { const imgs = [...document.querySelectorAll('#recent-books .recent-cover img')]; const hidden = id => { const e = document.getElementById(id); return !e || getComputedStyle(e).display === 'none'; }; return imgs.length === 2 && imgs.every(i => i.complete && i.naturalWidth > 0) && hidden('quick-menu-dock') && hidden('ask-tab') && hidden('grammar-tab') && hidden('rules-tab'); })()")
for k in c.js("listShelfBooks().then(b => JSON.stringify(b.map(x => x.key)))") and json.loads(c.js("listShelfBooks().then(b => JSON.stringify(b.map(x => x.key)))")):
    c.js("removeShelfBook(%s).then(() => 1)" % json.dumps(k))
c.js("""(async () => { for (let i = 0; i < 14; i++) { await shelveBook(new File(['book ' + i], 'b' + i + '.txt', {lastModified: i + 1}), 'k' + i); await new Promise(r => setTimeout(r, 5)); } return 1; })()""")
check('7 at most 12 books are kept; the oldest opened go first', "listShelfBooks().then(b => b.length === 12 && b[0].key === 'k13' && !b.some(x => x.key === 'k0' || x.key === 'k1'))")
c.call('Emulation.setDeviceMetricsOverride', width=412, height=860, deviceScaleFactor=1, mobile=True)
c.call('Page.reload'); c.wait(READY, timeout=30)
c.wait("document.querySelectorAll('#recent-books .recent-book').length === 12", timeout=10); time.sleep(0.6)
check('8 many books: the list scrolls in its own height like a drum, the buttons above stay on screen, the bottom fades',
      "(() => { const l = document.querySelector('#recent-books .recent-list'), b = document.getElementById('home-scanner').getBoundingClientRect(); return l.scrollHeight > l.clientHeight && l.getBoundingClientRect().bottom <= innerHeight + 1 && b.bottom < innerHeight && l.classList.contains('drum-bottom') && !l.classList.contains('drum-top') && getComputedStyle(l).maskImage.includes('gradient') || JSON.stringify({sh: l.scrollHeight, ch: l.clientHeight, lb: l.getBoundingClientRect().bottom, ih: innerHeight, bb: b.bottom, cls: l.className, st: l.scrollTop}); })()")
c.js("window.__pops = 0; const realPop = drumPop; drumPop = () => { __pops++; }; 1")
for y in (40, 80, 120):
    c.js("document.querySelector('#recent-books .recent-list').scrollTop = %d; 1" % y); time.sleep(0.25)
check('8b scrolled: the top fades too, and the cards near the edges tilt while the middle one stays flat',
      "(() => { const l = document.querySelector('#recent-books .recent-list'); const box = l.getBoundingClientRect(), mid = box.top + box.height / 2; const cards = [...l.children]; const near = cards.reduce((a, c) => Math.abs(c.getBoundingClientRect().top + c.offsetHeight / 2 - mid) < Math.abs(a.getBoundingClientRect().top + a.offsetHeight / 2 - mid) ? c : a); return l.classList.contains('drum-top') && /rotateX/.test(cards[0].style.transform) && cards[0].style.transform !== near.style.transform; })()")
check('8c a bubble pops each time the next book reaches the drum\'s centre while scrolling (none on the first show)', "__pops >= 1 && __pops <= 3 || __pops")
c.js("window.__pops = 0; renderRecentBooks().then(() => 1)"); time.sleep(0.5)
check('8d re-drawing the list makes no sound', "__pops === 0 || __pops")
c.js("openLibrary('shelf'); 1"); time.sleep(1.0)
check('9 «My books» in the menu: every kept book has its cover; the list scrolls like the drum and its bottom fades',
      "(() => { const l = document.getElementById('library-list'), cards = [...l.querySelectorAll('.library-card')]; return cards.length === 12 && cards.every(c => c.firstElementChild.classList.contains('recent-cover')) && l.classList.contains('shelf-drum') && l.scrollHeight > l.clientHeight && l.classList.contains('drum-bottom') && getComputedStyle(l).maskImage.includes('gradient') && getComputedStyle(document.getElementById('library-more')).display === 'none' || JSON.stringify({n: cards.length, cls: l.className, sh: l.scrollHeight, ch: l.clientHeight}); })()")
c.js("window.__pops = 0; 1")
for y in (60, 120, 180):
    c.js("document.getElementById('library-list').scrollTop = %d; 1" % y); time.sleep(0.25)
check('9b scrolling «My books» pops bubbles and fades the top; the cards stay flat (no barrel)', "__pops >= 1 && [...document.querySelectorAll('#library-list .library-card')].every(c => !c.style.transform) && document.getElementById('library-list').classList.contains('drum-top') || __pops")
if os.environ.get('SHELF_SHOT2'):
    import base64; open(os.environ['SHELF_SHOT2'], 'wb').write(base64.b64decode(c.call('Page.captureScreenshot')['data']))
c.js("(() => { const s = document.getElementById('library-source'); s.value = 'gutenberg'; s.dispatchEvent(new Event('change')); return 1; })()"); time.sleep(1.0)
check('9c another source: a plain list again (no drum, no fade)', "(l => !l.classList.contains('shelf-drum') && !l.classList.contains('drum-top') && !l.classList.contains('drum-bottom'))(document.getElementById('library-list'))")
c.js("closeLibrary(); 1")
if os.environ.get('SHELF_SHOT'):
    import base64; open(os.environ['SHELF_SHOT'], 'wb').write(base64.b64decode(c.call('Page.captureScreenshot')['data']))
print('ALL PASS')
