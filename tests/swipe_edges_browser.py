"""Swipes and the screen edges (js/navigation.js touch handlers).

Owner, 2026-11-15: «при проведенні пальцем з гори екрану вниз застосунок видає чорний екран та перегортає сторінку». A swipe
down from the very top opened the menu drawer over a dimmed backdrop (and, in full screen, Chrome leaves full screen on that
gesture), and one starting a little lower turned the page back. The edges belong to the system — the status bar / leaving
full screen at the top, the system buttons at the bottom, Back at the sides — so a swipe that starts at an edge turns no page
and opens nothing; an ordinary swipe in the page still turns it. Real touch events (CDP Input.dispatchTouchEvent).
"""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
W, H = 412, 915
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=1, mobile=True)
c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'", timeout=30)
c.js("localStorage.setItem('reader_onboarding_done','1'); localStorage.setItem('reader_fullscreen','0'); showUpdateBanner = () => {}; 1")
MD = '# Swipes\n\n' + '\n\n'.join('Paragraph %d of a book long enough for several pages on a phone, so that swipes can turn them.' % i for i in range(1, 60))
c.js("openBookFile(new File([%s], 'swipe.md')); 1" % json.dumps(MD))
c.wait("state.bookKey && state.totalPagesInChapter > 4", timeout=30); time.sleep(1)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def swipe(x0, y0, x1, y1):
    c.call('Input.dispatchTouchEvent', type='touchStart', touchPoints=[{'x': x0, 'y': y0}])
    for i in range(1, 7):
        c.call('Input.dispatchTouchEvent', type='touchMove', touchPoints=[{'x': x0 + (x1 - x0) * i / 6, 'y': y0 + (y1 - y0) * i / 6}])
        time.sleep(0.02)
    c.call('Input.dispatchTouchEvent', type='touchEnd', touchPoints=[])
    time.sleep(0.5)


def at_page(n):
    c.js("goToPageInChapter(%d, false); document.body.classList.add('immersive-mode'); 1" % n); time.sleep(0.3)


at_page(2)
swipe(W / 2, 4, W / 2, 400)
check('1 a swipe down from the very top edge turns no page and opens no menu (the system shows its bar / leaves full screen)',
      "state.pageInChapter === 2 && !isFullMenuOpen() || JSON.stringify([state.pageInChapter, isFullMenuOpen()])")
swipe(W / 2, 40, W / 2, 400)
check('2 ... nor one starting a little below the edge (still the top system zone)', "state.pageInChapter === 2 || state.pageInChapter")
swipe(W / 2, H - 6, W / 2, H - 400)
check('3 a swipe up from the bottom edge (system buttons) turns no page', "state.pageInChapter === 2 || state.pageInChapter")
swipe(4, H / 2, 300, H / 2)
check('4 a swipe from the left edge (the Back gesture) turns no page', "state.pageInChapter === 2 || state.pageInChapter")
swipe(W / 2, 300, W / 2, 650)
check('5 an ordinary swipe down in the page still turns it back', "state.pageInChapter === 1 || state.pageInChapter")
swipe(300, H / 2, 60, H / 2)
check('6 an ordinary swipe to the left still turns it forward', "state.pageInChapter === 2 || state.pageInChapter")
print('ALL SWIPE EDGE CHECKS PASSED')
