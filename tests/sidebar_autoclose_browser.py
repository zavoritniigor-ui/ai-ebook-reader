"""The Contents / thumbnails side panel closes itself (owner, 2026-10-18: «the book menu stays open; to close it I have to go to the main
menu or the scroll menu -- unhandy; after I drag to a page and tap it, it should close by itself in about three seconds, and the page
must get its full size back»).

Before: only the main-menu / scroll-menu controls closed it, PDF thumbnails never did, and on a wide screen (>1180px) not even a chosen
contents entry. Now (js/quick-wheel.js): 3 s after a page / chapter / outline entry was chosen, 5 s after the last scroll / touch / key
inside the panel, 8 s after it was opened and left alone; never while the book-language list is open; the tabs are not a "choice";
the same off switch as the main menu (reader_menu_autohide = 'off'). Closing hands the width back to the book. The 3-second case runs
with the real delay, the others with shortened ones. No network."""
import base64, json, os, sys, time
from browser_cdp import CDP
from pdf_audit_fixtures import pdf_document

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(90)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Network.enable'); c.call('Network.setCacheDisabled', cacheDisabled=True)


def check(name, expression, timeout=0):
    result = c.js(expression); end = time.time() + timeout
    while result is not True and time.time() < end:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def load(width, height, mobile=False):
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=mobile)
    c.call('Emulation.setTouchEmulationEnabled', enabled=mobile, maxTouchPoints=5)
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof scheduleSidebarClose==='function'", timeout=30)
    c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); document.getElementById('sw-update-banner')?.remove(); 1")


def open_pdf(pages=30):
    b64 = base64.b64encode(pdf_document([{'text': f'Page {n}', 'size': (600, 800)} for n in range(1, pages + 1)])).decode()
    c.js("""(() => { const bytes = Uint8Array.from(atob(%r), c => c.charCodeAt(0)); const dt = new DataTransfer(); dt.items.add(new File([bytes], 'side.pdf', {type: 'application/pdf'}));
      const i = document.getElementById('file-upload'); i.files = dt.files; i.dispatchEvent(new Event('change')); return 1; })()""" % b64)
    c.wait("state.format==='pdf' && pdfContinuousReady && pdfRenderedPages.has(1)", timeout=40); time.sleep(0.8)


def open_sidebar():
    c.js("els.sidebar.classList.remove('collapsed'); 1"); time.sleep(0.5)


OPEN = "!els.sidebar.classList.contains('collapsed')"
PAGE_W = "Math.round(pdfPageWrappers[1].getBoundingClientRect().width)"

# ---------------------------------------------------------------- a wide screen, a PDF
load(1440, 900)
open_pdf()
full = c.js(PAGE_W)
open_sidebar(); time.sleep(0.8)
narrow = c.js(PAGE_W)
check('1 with the panel open the page is narrower (the panel takes its width)', f"{narrow} < {full}")
c.js("document.querySelectorAll('.pdf-thumb-item')[4].click(); 1"); t0 = time.time()
check('2 a thumbnail was chosen: the page is shown', "state.currentIndex === 5", timeout=5)
time.sleep(max(0, 2.4 - (time.time() - t0)))
check('3 ... the panel is still open at 2.4 s (the reader can pick again)', OPEN)
check('4 ... and gone by ~3.6 s after the choice (real 3 s delay)', f"!({OPEN})", timeout=max(0.1, 3.7 - (time.time() - t0)))
time.sleep(0.9)
check('5 closing gives the page its full width back (as before it was opened)', f"{PAGE_W} === {full} || {PAGE_W}", timeout=3)

# shortened delays for the rest
c.js("SIDEBAR_IDLE_MS.open = 2500; SIDEBAR_IDLE_MS.scroll = 1500; SIDEBAR_IDLE_MS.pick = 500; 1")
open_sidebar()
check('6 opened and left alone: closes by itself', f"!({OPEN})", timeout=4)

open_sidebar()
for _ in range(4):
    c.js("document.getElementById('pdf-thumb-list').dispatchEvent(new Event('scroll')); 1"); time.sleep(0.7)
check('7 scrolling the thumbnail list keeps it open (4 x 0.7 s = 2.8 s > the 2.5 s open delay)', OPEN)
check('7b ... and 1.5 s after the last scroll it closes', f"!({OPEN})", timeout=3)

open_sidebar(); c.js("document.getElementById('pdf-tab-thumbs').click(); 1")
time.sleep(0.9)
check('8 the tabs are not a choice: no short 0.5 s timer (still open 0.9 s after the tap)', OPEN)
check('8b ... it closes on the normal delay', f"!({OPEN})", timeout=4)

open_sidebar(); c.js("els.sidebar.querySelector('#book-lang-select').focus(); 1"); time.sleep(3.5)
check('9 while the book-language list is focused it stays open (past every delay)', OPEN)
c.js("document.activeElement.blur(); 1")
check('9b ... and closes once it is released', f"!({OPEN})", timeout=4)

c.js("localStorage.setItem('reader_menu_autohide', 'off'); 1")
open_sidebar(); time.sleep(3.2)
check('10 switched off (the same switch as the main menu): it stays open', OPEN)
c.js("localStorage.removeItem('reader_menu_autohide'); els.sidebar.classList.add('collapsed'); 1")

# ---------------------------------------------------------------- outline entry + a text book on the wide screen
c.js("""(() => { openFullMenu(); closeFullMenu(); els.sidebar.classList.remove('collapsed'); const t = document.getElementById('pdf-tab-outline'); return 1; })()""")
c.js("els.sidebar.classList.add('collapsed'); 1")

TXT = "# Livre\n\n" + "\n\n".join(f"Chapitre {i}. " + "Le petit prince regardait les étoiles. " * 60 for i in range(1, 8))
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof scheduleSidebarClose==='function'", timeout=30)
c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); SIDEBAR_IDLE_MS.pick = 500; window.__ok = 0; openBookFile(new File([%s], 'side.md')).then(() => window.__ok = 1); 1" % json.dumps(TXT))
c.wait("window.__ok === 1", timeout=30); time.sleep(1.0)
open_sidebar()
c.js("document.querySelector('#toc-list li:nth-child(2)').click(); 1")
check('11 a wide screen, a text book: a chosen chapter closes the panel after the short delay (it used to stay open)', f"!({OPEN})", timeout=2.5)

# ---------------------------------------------------------------- a phone: the panel is a full-screen sheet; same timing
load(390, 844, mobile=True)
open_pdf()
c.js("SIDEBAR_IDLE_MS.pick = 500; 1")
open_sidebar()
c.js("document.querySelectorAll('.pdf-thumb-item')[6].click(); 1")
check('12 phone: a thumbnail closes the sheet too (it used to stay)', f"state.currentIndex >= 7 && !({OPEN})", timeout=3)   # the tall phone viewport may call a neighbouring page «current"
check('13 closing the panel leaves nothing behind it (no scroll lock, back layer gone)', "topOpenOverlay() !== 'nav'")
print('ALL PASS')
