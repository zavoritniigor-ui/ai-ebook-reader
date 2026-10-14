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
c.js("document.querySelector('#library-list .library-card .library-save').click(); 1"); time.sleep(0.8)
check('6 remove deletes it from the device', "listShelfBooks().then(b => b.length === 0 && document.querySelectorAll('#library-list .library-card').length === 0)")
c.js("closeLibrary(); 1")
c.js("""(async () => { for (let i = 0; i < 14; i++) { await shelveBook(new File(['book ' + i], 'b' + i + '.txt', {lastModified: i + 1}), 'k' + i); await new Promise(r => setTimeout(r, 5)); } return 1; })()""")
check('7 at most 12 books are kept; the oldest opened go first', "listShelfBooks().then(b => b.length === 12 && b[0].key === 'k13' && !b.some(x => x.key === 'k0' || x.key === 'k1'))")
print('ALL PASS')
