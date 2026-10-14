"""Reopening a book lands where the reader stopped, even when the page is repaginated WHILE the book is still opening.
Bug: a big library EPUB (Pride and Prejudice, 25 MB) takes seconds to unpack; meanwhile the tablet hides the menu → resize →
repaginateBook → goToPageInChapter(0) → saveBookmark overwrote the real bookmark with «chapter 0, page 0», so the book reopened
at its start. Now nothing writes the bookmark until the open has restored the place. No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=800, deviceScaleFactor=1, mobile=False)
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"
c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


MK = """(() => { let s = ''; for (let i = 0; i < 600; i++) s += 'Line ' + i + ' of the restored book, long enough to fill the pages of every block.\\n';
  return new File([s], 'Restore.txt', {type: 'text/plain', lastModified: 99}); })()"""
c.js("window.__ok = 0; openBookFile(%s).then(() => { window.__ok = 1; }); 1" % MK); c.wait("window.__ok === 1", timeout=30); time.sleep(1)
c.js("for (let i = 0; i < 8; i++) goNext(); 1"); time.sleep(1.5)
saved = json.loads(c.js("localStorage.getItem(state.bookKey)"))
assert saved['currentIndex'] >= 1, saved
print('   saved', saved, flush=True)
c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.5)
# A slow open: the layout changes (repagination) BEFORE the book's own restore runs, as on a tablet with a big EPUB.
c.js("""(() => { const real = initTxt; initTxt = async function (...args) { await new Promise(r => setTimeout(r, 300)); repaginateBook(); goToPageInChapter(0, false); await new Promise(r => setTimeout(r, 300)); return real.apply(this, args); };
  window.__ok = 0; openBookFile(%s).then(() => { window.__ok = 1; }); return 1; })()""" % MK)
c.wait("window.__ok === 1", timeout=30); time.sleep(1.5)
check('1 the bookmark is not overwritten while the book is opening', "(() => { const b = JSON.parse(localStorage.getItem(state.bookKey)); return b.currentIndex === %d && b.pageInChapter === %d; })()" % (saved['currentIndex'], saved['pageInChapter']))
check('2 the book reopens at the saved block and page', "state.currentIndex === %d && state.pageInChapter === %d" % (saved['currentIndex'], saved['pageInChapter']))
c.js("goNext(); 1"); time.sleep(1)
check('3 after the open, turning a page saves the bookmark again', "JSON.parse(localStorage.getItem(state.bookKey)).pageInChapter !== %d || JSON.parse(localStorage.getItem(state.bookKey)).currentIndex !== %d" % (saved['pageInChapter'], saved['currentIndex']))
print('ALL PASS')
