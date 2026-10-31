"""The bottom reading row «‹ · ☰ · ✦ · 3/553 · ›» (index.html, js/quick-wheel.js place()).

Owner (2026-10-30): «кнопки потрібно переносити в низ екрану із збереженням функціоналу, єдине потрібен грамотний дизайн» and
«Меню прокрутки повинно з'являтися над кнопкою як сонечко також кнопка меню зверху має переїхати вниз». Before, the page-number
pill sat on the right edge in the middle of the page, ✦ at 76% of the height (both over the ends of lines) and ☰ top left.

Checks (phones portrait/landscape, a small phone, a tablet, a desktop; text and PDF): ‹, ☰, ✦, the page number and › stand in
one row at the bottom, in that order, with gaps, ✦ in the middle, at most 480px wide, clear of the Ask AI / Grammar tabs and the screen edges, and the text ends above the
row; the invisible footer handle is not under them; a tap on the number expands a horizontal slider across the row (✦ hidden
meanwhile) that still turns pages and collapses again; ✦ opens the wheel ABOVE the row as a «sun» — a fan
centred on ✦, the active action straight above it, the others symmetric — inside the screen, and every action stays reachable
(also by a sideways swipe); ☰ in the row still opens the side menu and does not jump to the top-left corner meanwhile; after closing, ✦ is back in the row; while the «◀ page ▶» footer shows, the row gives way to it (number and ✦ hidden).
"""
import base64, json, os, time
from browser_cdp import CDP, pdf_bytes

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


MD = '# T\n\n' + '\n\n'.join('Paragraph %d. ' % i + 'Une phrase française assez longue pour remplir la page. ' * 8 for i in range(60))
RECT = "(id => document.getElementById(id).getBoundingClientRect())"
ROW = f"""(() => {{ const ids = ['page-arrow-prev', 'menu-handle', 'qm-launcher', 'pdf-scrubber', 'page-arrow-next'], r = ids.map({RECT});
  const bad = [];
  if (r.some(x => Math.abs(x.top - r[0].top) > 1 || Math.abs(x.height - 44) > 1)) bad.push('not one 44px row');
  for (let i = 1; i < 5; i++) if (r[i].left - r[i - 1].right < 6) bad.push('gap ' + ids[i - 1] + '/' + ids[i]);
  if (r[4].bottom > innerHeight || r[0].left < 0 || r[4].right > innerWidth) bad.push('off-screen');
  if (Math.abs(r[2].left + r[2].width / 2 - innerWidth / 2) > 1) bad.push('✦ not in the middle');
  if (r[4].right - r[0].left > 482) bad.push('row wider than 480px');
  for (const t of ['ask-tab', 'grammar-tab']) {{ const b = {RECT}(t); if (r.some(x => x.left < b.right && x.right > b.left && x.top < b.bottom && x.bottom > b.top)) bad.push('over ' + t); }}
  if (getComputedStyle(document.getElementById('footer-handle')).display !== 'none') bad.push('footer handle under the row');
  return bad.length === 0 || JSON.stringify({{bad, r}}); }})()"""
TEXT_ABOVE = f"""(() => {{ const top = {RECT}('page-arrow-prev').top, col = els.pages.getBoundingClientRect(); let low = 0;
  const it = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT); let n;
  while ((n = it.nextNode())) {{ const rg = document.createRange(); rg.selectNodeContents(n);
    for (const b of rg.getClientRects()) if (b.width && b.left >= col.left - 1 && b.right <= innerWidth && b.left < innerWidth && b.right > 0) low = Math.max(low, b.bottom); }}
  return low <= top || JSON.stringify({{low, top}}); }})()"""


def boot(w, h, mobile):
    c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=2 if mobile else 1, mobile=mobile)
    c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
    c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); 1"); c.call('Page.reload'); c.wait(READY, timeout=30)
    c.js("showUpdateBanner=()=>{}; callAI = async () => { throw new Error('offline'); }; 1")


for (w, h, mobile) in ((412, 915, True), (360, 640, True), (844, 390, True), (820, 1180, True), (1366, 768, False)):
    tag = '%dx%d' % (w, h)
    boot(w, h, mobile)
    c.js("openBookFile(new File([%s], 'row.md', {lastModified: %d})); 1" % (json.dumps(MD), w)); c.wait("state.bookKey && state.totalPagesInChapter > 2", timeout=30); time.sleep(1.2)
    check(tag + ' 1 ‹ · page number · ✦ · › in one bottom row, in order, with gaps, clear of the side tabs; no footer handle under it', ROW)
    check(tag + ' 1b the text ends above the row', TEXT_ABOVE)
    check(tag + ' 1c the number shows the page', "document.getElementById('pdf-page-preview').value === (bookPageModel().page + 1) + '\\n/ ' + bookPageModel().total")
    # ---- the number expands a horizontal slider
    c.js("document.getElementById('pdf-scrubber').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); 1"); time.sleep(0.4)
    check(tag + ' 2 a tap on the number expands a horizontal slider across the row between the side tabs; ✦ is hidden meanwhile',
          f"""(() => {{ const s = {RECT}('pdf-scrubber'), r = {RECT}('pdf-page-range'), a = {RECT}('ask-tab'), g = {RECT}('grammar-tab');
             return !document.getElementById('pdf-scrubber').classList.contains('collapsed') && r.width > r.height * 4 && s.left >= a.right - 1 && s.right <= g.left + 1
                 && Math.abs(s.top - {RECT}('page-arrow-prev').top) <= 1 && getComputedStyle(document.getElementById('qm-launcher')).visibility === 'hidden' || JSON.stringify({{s, r}}); }})()""")
    before = c.js("bookPageModel().page")
    c.js("(() => { const r = document.getElementById('pdf-page-range'); r.value = Math.round(Number(r.max) * 0.5); r.dispatchEvent(new Event('input')); r.dispatchEvent(new PointerEvent('pointerup')); return 1; })()")
    check(tag + ' 2b moving it turns the pages', "bookPageModel().page > %d" % before, timeout=5)
    check(tag + ' 2c it collapses back into the row after a few idle seconds, ✦ visible again',
          "document.getElementById('pdf-scrubber').classList.contains('collapsed') && getComputedStyle(document.getElementById('qm-launcher')).visibility === 'visible'", timeout=6)
    check(tag + ' 2d ... and the row is intact', ROW)
    # ---- the wheel opens above the row
    c.js("document.getElementById('qm-launcher').click(); 1"); time.sleep(0.7)
    check(tag + ' 3 ✦ opens a «sun» above the row: the active action straight above ✦, the others symmetric on both sides, inside the screen, none overlapping',
          f"""(() => {{ const l = {RECT}('qm-launcher'), cx = l.left + l.width / 2, items = [...document.querySelectorAll('.qm-item:not([hidden])')];
             const r = items.map(b => b.getBoundingClientRect()), act = document.querySelector('.qm-item.qm-active').getBoundingClientRect(), mid = b => b.left + b.width / 2;
             const left = r.filter(b => mid(b) < cx - 2).length, right = r.filter(b => mid(b) > cx + 2).length;
             const hit = r.some((a, i) => r.slice(i + 1).some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
             const ok = document.getElementById('qm-launcher').getAttribute('aria-expanded') === 'true' && items.length === 5 && Math.abs(mid(act) - cx) < 2
                 && act.top === Math.min(...r.map(b => b.top)) && left === 2 && right === 2 && !hit
                 && r.every(b => b.bottom <= l.top - 4 && b.top >= 0 && b.left >= 0 && b.right <= innerWidth);
             return ok || JSON.stringify({{cx, act, r, left, right, hit}}); }})()""")
    c.js("document.getElementById('qm-launcher').click(); 1"); time.sleep(0.7)
    check(tag + ' 3b after closing, ✦ is in the row again', ROW)

# ---- every wheel action stays reachable (phone): spin through all of them, each lands in the visible arc
boot(412, 915, True)
c.js("openBookFile(new File([%s], 'row.md', {lastModified: 7})); 1" % json.dumps(MD)); c.wait("state.bookKey && state.totalPagesInChapter > 2", timeout=30); time.sleep(1.2)
c.js("document.getElementById('qm-launcher').click(); 1"); time.sleep(0.7)
seen = set()
for _ in range(14):
    seen.add(c.js("document.querySelector('.qm-item.qm-active')?.dataset.action"))
    p = c.js("(b => [b.left + b.width / 2, b.top + b.height / 2])(document.querySelector('.qm-item.qm-active').getBoundingClientRect())")
    c.call('Input.dispatchMouseEvent', type='mouseWheel', x=p[0], y=p[1], deltaX=0, deltaY=66); time.sleep(0.5)
assert len(seen) == c.js("document.querySelectorAll('.qm-item').length"), seen
print('PASS 4 every wheel action comes round to the middle of the arc', flush=True)
first = c.js("document.querySelector('.qm-item.qm-active').dataset.action")
p = c.js("(b => [b.left + b.width / 2, b.top + b.height / 2])(document.querySelector('.qm-item.qm-active').getBoundingClientRect())")
c.call('Input.dispatchMouseEvent', type='mousePressed', x=p[0], y=p[1], button='left', buttons=1, clickCount=1)
for i in range(1, 9):
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=p[0] - 12 * i, y=p[1], button='left', buttons=1); time.sleep(0.02)
c.call('Input.dispatchMouseEvent', type='mouseReleased', x=p[0] - 96, y=p[1], button='left', buttons=0, clickCount=1); time.sleep(1.2)
check('4b a sideways swipe turns the sun (another action comes to the top) and opens nothing', "document.querySelector('.qm-item.qm-active').dataset.action !== %s && document.getElementById('qm-launcher').getAttribute('aria-expanded') === 'true'" % json.dumps(first))
c.js("document.getElementById('qm-launcher').click(); 1"); time.sleep(0.7)

# ---- ☰ in the row opens the side menu; it does not jump to the top-left corner meanwhile
c.js("document.getElementById('menu-handle').click(); 1"); time.sleep(0.6)
check('4c ☰ in the row opens the side menu and hides meanwhile (the menu has its own ✕)',
      "isFullMenuOpen() && getComputedStyle(document.getElementById('menu-handle')).visibility === 'hidden'")
c.js("closeFullMenu(); 1"); time.sleep(0.6)
check('4d after the menu closes ☰ is back in the row', ROW)

# ---- the «◀ page ▶» footer takes the whole row while it shows
c.js("openFooterMenu(); 1"); time.sleep(0.5)
check('5 while the footer shows, the number, ☰ and ✦ give way to it',
      "getComputedStyle(document.getElementById('menu-handle')).visibility === 'hidden' && getComputedStyle(document.getElementById('qm-launcher')).visibility === 'hidden' && getComputedStyle(document.getElementById('pdf-scrubber')).visibility === 'hidden' && getComputedStyle(document.getElementById('page-arrow-prev')).display === 'none'")
c.js("closeFooterMenu(); 1"); time.sleep(0.4)
check('5b and come back when it hides', ROW)

# ---- PDF: the same row
boot(412, 915, True)
c.js("window.__ok=0; openBookFile(new File([Uint8Array.from(atob(%s), ch => ch.charCodeAt(0))], 'row.pdf', {type:'application/pdf', lastModified: 8})).then(() => { window.__ok=1; }); 1"
     % json.dumps(base64.b64encode(pdf_bytes()).decode()))
c.wait("window.__ok===1 && state.format==='pdf' && pdfContinuousReady", timeout=30); time.sleep(1.2)
if c.js("state.totalPages > 1"):
    check('6 PDF: the same bottom row', ROW)
print('ALL READING BOTTOM ROW CHECKS PASSED')
