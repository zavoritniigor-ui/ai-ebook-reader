"""Corner page arrows ‹ › (index.html .page-arrow, js/main.js setPageArrows): one-page turning is always at hand when the
«◀ page ▶» footer is hidden (menu-less/immersive mode). Bug they fix: on 641-1180px screens the footer hid right after a
book opened and there was not even a handle to bring it back. The arrows sit 56px in from the bottom corners so they cover
neither the Ask AI / Grammar edge tabs nor the ✦ launcher nor the footer handle; they are absent without a book, while the
footer itself is visible, and in ink/region modes. Text and PDF. No network."""
import json, os, time
from browser_cdp import CDP, pdf_bytes
import base64

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


MD = '# T\n\n' + '\n\n'.join('Paragraph %d. ' % i + 'Une phrase française assez longue pour remplir la page. ' * 8 for i in range(40))
VISIBLE = "(id => { const e = document.getElementById(id); return getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; })"
NO_OVERLAP = """(() => { const hits = []; for (const a of ['page-arrow-prev', 'page-arrow-next']) { const r = document.getElementById(a).getBoundingClientRect();
  for (const id of ['ask-tab', 'grammar-tab', 'qm-launcher', 'footer-handle', 'rules-tab', 'menu-handle']) { const e = document.getElementById(id); if (!e || getComputedStyle(e).display === 'none') continue;
    const b = e.getBoundingClientRect(); if (b.width && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top) hits.push(a + '/' + id); }
  if (r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) hits.push(a + ' off-screen'); }
  return hits.length === 0 || JSON.stringify(hits); })()"""

for (w, h, mobile) in ((390, 844, True), (844, 390, True), (820, 1180, True), (1100, 700, False), (1180, 820, True), (1366, 768, False)):
    c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=mobile)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof setPageArrows==='function'", timeout=30)
    c.js("localStorage.clear(); 1")
    check('%dx%d: no book -> no arrows' % (w, h), "!%s('page-arrow-next')" % VISIBLE)
    c.js("openBookFile(new File([%s],'arrows.md',{lastModified:%d})); 1" % (json.dumps(MD), w))
    c.wait("state.bookKey && state.totalPagesInChapter > 2", timeout=30); time.sleep(1.2)
    c.js("document.body.classList.add('immersive-mode'); document.body.classList.remove('footer-open'); 1"); time.sleep(0.4)
    check('%dx%d: footer hidden (menu-less mode) -> both arrows are on screen' % (w, h), "%s('page-arrow-prev') && %s('page-arrow-next')" % (VISIBLE, VISIBLE))
    check('%dx%d: they cover none of the edge tabs, the ✦ launcher, the footer handle' % (w, h), NO_OVERLAP)
    check('%dx%d: no line of the book text lies under ☰ (top) or under the arrows (bottom)' % (w, h), """(() => {
      const c = els.container.getBoundingClientRect(), menu = document.getElementById('menu-handle').getBoundingClientRect();
      const arrows = ['page-arrow-prev', 'page-arrow-next'].map(id => document.getElementById(id).getBoundingClientRect());
      const hit = (a, b) => a.width && b.width && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const w = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const r = document.createRange(); r.selectNodeContents(n);
        for (const b of r.getClientRects()) { if (!b.width || b.left < c.left - 1 || b.right > c.right + 1) continue;
          if (hit(b, menu) || arrows.some(a => hit(b, a))) return 'covered: ' + n.nodeValue.trim().slice(0, 30); } }
      return true; })()""", timeout=3)
    c.js("goToPageInChapter(1, false); 1")
    c.js("document.getElementById('page-arrow-next').click(); 1"); time.sleep(0.3)
    check('%dx%d: › turns ONE page forward' % (w, h), "state.pageInChapter === 2", timeout=2)
    check('%dx%d: ... and the tap does not bring the menu back' % (w, h), "document.body.classList.contains('immersive-mode')")
    c.js("document.getElementById('page-arrow-prev').click(); 1"); time.sleep(0.3)
    check('%dx%d: ‹ turns ONE page back' % (w, h), "state.pageInChapter === 1", timeout=2)
    c.js("document.body.classList.add('footer-open'); 1")
    check('%dx%d: while the «◀ page ▶» footer is open the arrows step aside' % (w, h), "!%s('page-arrow-next')" % VISIBLE)
    c.js("document.body.classList.remove('footer-open', 'immersive-mode'); 1")
    if w >= 1181:
        check('%dx%d: with the menu shown the footer is on screen and the arrows are not' % (w, h),
              "(r => r.top < innerHeight && r.bottom > 0)(document.querySelector('.footer-nav-group').getBoundingClientRect()) && !%s('page-arrow-next')" % VISIBLE, timeout=2)

# ink mode hides them; PDF works too
c.js("document.body.classList.add('immersive-mode', 'ink-mode'); 1")
check('ink mode: no arrows over the writing surface', "!%s('page-arrow-next')" % VISIBLE)
c.js("document.body.classList.remove('ink-mode'); 1")
c.js("openBookFile(new File([Uint8Array.from(atob(%s),ch=>ch.charCodeAt(0))],'arrows.pdf',{lastModified:5})); 1" % json.dumps(base64.b64encode(pdf_bytes()).decode()))
c.wait("state.format === 'pdf' && state.totalPages > 2 && state.currentIndex === 1", timeout=30); time.sleep(1.5)
c.js("document.body.classList.add('immersive-mode'); 1")
c.js("document.getElementById('page-arrow-next').click(); 1")
check('PDF: › goes to the next page', "state.currentIndex === 2", timeout=5)
print('ALL PAGE ARROW CHECKS PASSED')
