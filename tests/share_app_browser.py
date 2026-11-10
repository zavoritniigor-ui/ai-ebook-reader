"""Тести для функцій «Поділитися застосунком» (модалка, QR-код, копіювання посилання)
та «Назва книги» (плашка book-title-bar)."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__errors = []; addEventListener('error', e => __errors.push(e.message));
''')


def check(name, expression, timeout=10):
    deadline = time.time() + timeout
    result = c.js(expression)
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


# ---------------------------------------------------------------- Start screen & Share modal
c.call('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=1, mobile=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openFullMenu==='function'", timeout=30)
c.js("localStorage.clear(); state.uiLang='uk'; applyI18n(); 1")

check('1 share button exists in book section with icon and title',
      """(() => {
          const btn = document.getElementById('btn-share-app');
          if (!btn) return 'no btn';
          const t = btn.querySelector('.mr-title');
          const d = btn.querySelector('.mr-desc');
          return t && t.textContent.trim() === 'Поділитися застосунком' && d && d.textContent.includes('QR');
      })()""")

check('2 book-title-bar is hidden before any book is loaded',
      """(() => {
          const bar = document.getElementById('book-title-bar');
          return bar && bar.hidden === true;
      })()""")

check('3 clicking share button opens app-share-modal with QR and URL',
      """(() => {
          document.getElementById('btn-share-app').click();
          const modal = document.getElementById('app-share-modal');
          if (!modal || modal.hidden) return 'modal hidden';
          const qr = document.getElementById('app-share-qr');
          const url = document.getElementById('app-share-url');
          return qr && qr.getAttribute('src') === 'ai-ebook-reader-qr.png' &&
                 url && url.textContent.includes('ai-ebook-reader.uk');
      })()""")

check('4 clicking copy button updates status message',
      """(() => {
          document.getElementById('app-share-copy').click();
          const st = document.getElementById('app-share-status');
          return st && st.textContent.trim().length > 0;
      })()""")

check('5 pressing Escape closes app-share-modal',
      """(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          const modal = document.getElementById('app-share-modal');
          return modal && modal.hidden === true;
      })()""")

check('6 opening share modal and clicking close button closes it',
      """(() => {
          document.getElementById('btn-share-app').click();
          document.getElementById('app-share-close').click();
          const modal = document.getElementById('app-share-modal');
          return modal && modal.hidden === true;
      })()""")

check('7 opening share modal and clicking backdrop closes it',
      """(() => {
          document.getElementById('btn-share-app').click();
          const modal = document.getElementById('app-share-modal');
          modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return modal.hidden === true;
      })()""")

# ---------------------------------------------------------------- Book title bar on loaded book
BOOK = "# Le Petit Prince\n\nChapitre premier.\n"
c.js("window.__bookLoaded = 0; openBookFile(new File([%s], 'Le Petit Prince.md')).then(() => window.__bookLoaded = 1); 1" % json.dumps(BOOK))
c.wait("window.__bookLoaded === 1", timeout=30)

check('8 book-title-bar displays the book title without extension',
      """(() => {
          const bar = document.getElementById('book-title-bar');
          if (!bar || bar.hidden) return 'hidden';
          return bar.textContent.trim() === 'Le Petit Prince' &&
                 bar.getAttribute('aria-label').includes('Le Petit Prince');
      })()""")

check('9 switching language updates book-title-bar aria-label',
      """(() => {
          state.uiLang = 'en';
          applyI18n();
          setBookTitle(state.bookFileName);
          const bar = document.getElementById('book-title-bar');
          return bar && bar.getAttribute('aria-label').startsWith('Current book:');
      })()""")

print('ALL SHARE AND TITLE BAR TESTS PASSED')
