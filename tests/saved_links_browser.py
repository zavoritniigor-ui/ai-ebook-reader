# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""«Мої книги → Посилання» (owner, 2026-11-21: «в застосунку мати закладку зі збереженими QR-кодами сайтів або їхніх
сторінок, де знаходяться ті вправи, які мені цікаві, і на які я в будь-який момент можу перейти»).

☆ on a QR code frame (js/pdf-qr.js) keeps the code with its book and page; the shelf's third tab lists the saved links
(js/saved-links.js): «Відкрити ↗» is a plain new-tab link, «📖» reopens the book on the page with the code, 🗑 removes,
an address can be pasted by hand. Only http(s) is ever saved or shown. The list syncs as a setting (js/sync.js).

Real PDF with vector QR codes (tests/qr_pdf_fixture.py), real mouse clicks; new tabs are not opened (the click is
recorded and its default stopped).
"""
import base64, json, os, time
from browser_cdp import CDP
from qr_pdf_fixture import qr_pdf

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__errors = []; addEventListener('error', e => __errors.push(e.message));
addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));
window.__clicked = [];
addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[target="_blank"]');
  if (a) { __clicked.push(a.href); e.preventDefault(); } }, true);
''')


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.15); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({clicked: window.__clicked, errors: window.__errors, toasts: window.__toasts, book: state.bookKey, links: localStorage.getItem('reader_saved_links'), home: document.getElementById('recent-books')?.innerHTML.slice(0, 400)})"))
    print('PASS', name, flush=True)


def click_at(selector):
    r = c.js(f"(r => r && ({{x: r.left + r.width / 2, y: r.top + r.height / 2}}))(document.querySelector({json.dumps(selector)})?.getBoundingClientRect())")
    assert r, ('nothing to click', selector)
    c.call('Input.dispatchMouseEvent', type='mousePressed', x=r['x'], y=r['y'], button='left', clickCount=1)
    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=r['x'], y=r['y'], button='left', clickCount=1)
    pause(.3)


c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof saveLink==='function'", timeout=30)
c.js("localStorage.clear(); sessionStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); "
     "window.__toasts = []; const st = showToast; showToast = m => { __toasts.push(m); st(m); }; 1")
b64 = base64.b64encode(qr_pdf()).decode()
c.js(f"""(() => {{ const bytes = Uint8Array.from(atob({b64!r}), c => c.charCodeAt(0));
  const dt = new DataTransfer(); dt.items.add(new File([bytes], 'qr-book.pdf', {{type: 'application/pdf', lastModified: 1700000000000}}));
  const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); }})()""")
c.wait("state.format === 'pdf' && pdfContinuousReady && !!state.pdfDoc", timeout=60)
c.js("goToPhysicalPage(2, {instant: true}); 1"); c.wait("state.currentIndex === 2", timeout=10)
c.wait("!!pdfPageWrappers[2]?.querySelector('.pdf-qr-save')", timeout=20)
c.js("pdfPageWrappers[2].querySelector('.pdf-qr-save').id = 'star2'; 1")

# ---------------------------------------------------------------- ☆ on the QR code frame
check('1 a found QR code has a ☆ next to its frame, not yet saved',
      "(b => b.textContent === '☆' && b.getAttribute('aria-pressed') === 'false' && b.getAttribute('aria-label') === t('linksSaveQr'))(document.getElementById('star2'))")
click_at('#star2')
check('2 a real tap on ☆ saves the code, says so, and turns into ★', """(() => { const l = listSavedLinks();
   return l.length === 1 && l[0].url === 'https://example.com/qr-test?a=1' && l[0].bookKey === state.bookKey && l[0].bookName === 'qr-book.pdf' && l[0].page === 2
     && document.getElementById('star2').textContent === '★' && __toasts.includes(t('linksSaved')) || JSON.stringify(l); })()""")
check('2b the tap on ☆ does not open the link and is not a word tap', "__clicked.length === 0 && !document.getElementById('word-tooltip').classList.contains('visible')")
click_at('#star2')
check('2c tapped again, it is removed', "listSavedLinks().length === 0 && document.getElementById('star2').textContent === '☆' && __toasts.includes(t('linksUnsaved'))")
click_at('#star2')
check('2d and saved again', "listSavedLinks().length === 1")
check('2e the list is synced between devices like a setting', "SYNC_SETTINGS.includes('reader_saved_links')")

# ---------------------------------------------------------------- the «Посилання» tab of «Мої книги»
c.js("goToPhysicalPage(4, {instant: true}); openLibrary('shelf'); 1")
c.wait("document.getElementById('library-modal').classList.contains('open') && !!document.querySelector('#library-status .shelf-tab[data-kind=\"link\"]')", timeout=10)
check('3 «Мої книги» has a third tab «Посилання» with the count', "(b => b.textContent.startsWith(t('shelfLinks')) && b.textContent.endsWith('(1)'))(document.querySelector('#library-status .shelf-tab[data-kind=\"link\"]'))")
click_at('#library-status .shelf-tab[data-kind="link"]')
check('3b the tab lists the saved code: its address, its book and page', """(card => !!card && card.querySelector('.library-name').textContent === 'example.com/qr-test'
   && card.querySelector('.library-author').textContent.includes('example.com') && card.querySelector('.library-author').textContent.includes('qr-book')
   && card.querySelector('.library-author').textContent.includes(t('page') + ' 2'))(document.querySelector('#library-list .saved-link'))""", timeout=5)
click_at('#library-list .saved-link .saved-link-open')
check('4 «Відкрити ↗» opens the address in a new tab, and the reading place is kept', "__clicked.length === 1 && __clicked[0] === 'https://example.com/qr-test?a=1' && !!sessionStorage.getItem('reader_return_book')")
c.js("__clicked.length = 0; 1")
check('4b the book is on page 4 before going back', "state.currentIndex === 4", timeout=5)
click_at('#library-list .saved-link .saved-link-page')
check('5 «📖» closes the shelf and goes to the page with the code', "!document.getElementById('library-modal').classList.contains('open') && state.currentIndex === 2", timeout=10)

# ---------------------------------------------------------------- an address pasted by hand
c.js("openLibrary('shelf'); 1"); c.wait("!!document.querySelector('#library-status .links-add')", timeout=10)
c.js("""(f => { f.querySelector('.links-url').value = 'javascript:alert(1)'; f.requestSubmit(); })(document.querySelector('#library-status .links-add')); 1""")
check('6 a javascript: address is refused', "listSavedLinks().length === 1 && __toasts.includes(t('linksBadUrl'))")
c.js("""(f => { f.querySelector('.links-url').value = 'https://example.org/exercices/1'; f.querySelector('.links-name').value = 'Exercice 1'; f.requestSubmit(); })(document.querySelector('#library-status .links-add')); 1""")
check('6b a pasted https address with a name goes to the top of the list', """(cards => cards.length === 2 && cards[0].querySelector('.library-name').textContent === 'Exercice 1'
   && cards[0].querySelector('.saved-link-open').href === 'https://example.org/exercices/1' && !cards[0].querySelector('.saved-link-page'))([...document.querySelectorAll('#library-list .saved-link')])""", timeout=5)
click_at('#library-list .saved-link .saved-link-remove')
check('7 🗑 removes a link', "listSavedLinks().length === 1 && listSavedLinks()[0].url === 'https://example.com/qr-test?a=1' && document.querySelectorAll('#library-list .saved-link').length === 1", timeout=5)

# ---------------------------------------------------------------- what comes from storage (another device, hand edits)
c.js("""localStorage.setItem('reader_saved_links', JSON.stringify([{url: 'javascript:alert(1)', title: 'x'}, {url: 'intent://x#Intent;end', title: 'y'}, ...listSavedLinks()])); runShelfList(); 1""")
check('8 only http(s) entries are ever listed or linked', "listSavedLinks().length === 1 && [...document.querySelectorAll('#library-list a')].every(a => /^https?:/.test(a.href))", timeout=5)
c.js("closeLibrary(); sessionStorage.clear(); 1")   # no return mark (4 left one): the reload shows the start screen

# ---------------------------------------------------------------- the start screen
c.call('Page.reload')
c.wait("document.readyState==='complete' && !document.body.inert && typeof saveLink==='function'", timeout=30); pause(1.5)
c.js("shelfView = 'link'; renderRecentBooks(); 1")
check('9 the start screen shows the same tab with the saved links', "!!document.querySelector('#recent-books .shelf-tab[data-kind=\"link\"][aria-pressed=\"true\"]') && document.querySelectorAll('#recent-books .saved-link').length === 1 && !!document.querySelector('#recent-books .links-add')", timeout=5)

check('10 the new labels are localized in every menu language', """(() => { const bad = [];
   for (const k of ['shelfLinks','linksEmpty','linksUrlPlaceholder','linksNamePlaceholder','linksAdd','linksBadUrl','linksOpen','linksToBook','linksRemove','linksSaved','linksUnsaved','linksSaveQr','linksFromBook'])
     for (const l of ['uk','en','fr','ru','zh','ko','hi','ga','es']) { const v = I18N[k] && I18N[k][l]; if (!v || v === k) bad.push(k + ':' + l); }
   return bad.length === 0 || JSON.stringify(bad); })()""")
check('11 no page errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL PASS')
