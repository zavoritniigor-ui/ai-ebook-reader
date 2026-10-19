"""The menu closes by itself 10 s after the last interaction (each row now has a description to read; it was 4 s for the old
toolbar); interaction postpones it; it never closes with no book open, while a menu field has focus, or when the user switched it
off. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && typeof closeFullMenu==='function'", timeout=30)
c.js("localStorage.removeItem('reader_menu_autohide'); 1")


def check(name, ok):
    assert ok is True, (name, ok)
    print('PASS', name, flush=True)


def opened():
    c.js("state.format = 'txt'; openFullMenu(); document.activeElement && document.activeElement.blur(); document.body.dispatchEvent(new Event('x')); 1")
    time.sleep(0.1)


is_open = "isFullMenuOpen()"
opened()
check('1 menu is open right after opening', c.js(is_open))
time.sleep(6)
c.js("document.getElementById('app-header').dispatchEvent(new Event('pointermove'))")
time.sleep(6)
check('2 interaction at 6s postponed the close (still open at 12s)', c.js(is_open))
time.sleep(5)
check('3 closes ~10s after the last interaction', c.js("!isFullMenuOpen()"))

opened(); c.js("document.getElementById('ui-lang').focus(); 1"); time.sleep(11)
check('4 a focused menu select keeps the menu open', c.js(is_open))
c.js("document.activeElement.blur(); 1"); time.sleep(11)
check('5 closes after the select loses focus', c.js("!isFullMenuOpen()"))

c.js("state.format = null; openFullMenu(); document.activeElement.blur(); 1"); time.sleep(11)
check('6 no book open: the menu stays', c.js(is_open))

c.js("localStorage.setItem('reader_menu_autohide','off'); state.format='txt'; closeFullMenu(); openFullMenu(); document.activeElement.blur(); 1"); time.sleep(11)
check('7 switched off: the menu stays', c.js(is_open))
c.js("localStorage.removeItem('reader_menu_autohide'); 1")
print('ALL PASS')
