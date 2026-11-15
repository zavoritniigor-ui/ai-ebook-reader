"""Full screen on phones and tablets (owner, 2026-11-15: «щоб застосунок відкривався на весь екран на телефоні і планшеті
при цьому легко переходив в режим з доступними системними кнопками»; js/pwa-lifecycle.js, the «На весь екран» switch).

A wished-for full screen (default on a touch device, else what the switch stored) starts at the first tap — a browser enters
it only from a gesture — and again at the first tap after the system left it; the switch off leaves it at once and keeps the
system bars; the switch on enters at once; the choice is remembered. No network.
"""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=915, deviceScaleFactor=1, mobile=True)
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"


def check(name, expression, timeout=0):
    end = time.time() + timeout
    while True:
        result = c.js(expression)
        if result is True or time.time() >= end: break
        time.sleep(0.2)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def tap(x=200, y=300):
    for kind in ('mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left', clickCount=1)


def gesture(expression):   # as a real tap on the switch: the click carries a user gesture
    c.call('Runtime.evaluate', expression=expression, userGesture=True, awaitPromise=True)


def boot(stored):
    c.call('Page.navigate', url=URL); c.wait(READY, timeout=30)
    c.js("localStorage.clear(); localStorage.setItem('reader_onboarding_done','1'); %s 1" % ("localStorage.setItem('reader_fullscreen', %r);" % stored if stored else ''))
    c.call('Page.reload'); c.wait(READY, timeout=30); time.sleep(0.4)


boot('1')
check('1 the switch is in the menu and shown on (the reader wants full screen); not yet full screen before any gesture',
      "!document.getElementById('btn-fullscreen').hidden && document.getElementById('btn-fullscreen').getAttribute('aria-checked') === 'true' && !document.fullscreenElement")
tap()
check('2 the first tap enters full screen', "!!document.fullscreenElement", timeout=3)
c.js("document.exitFullscreen(); 1")   # what the system Back gesture does
check('3 the system can leave it (Back): the page is no longer full screen', "!document.fullscreenElement", timeout=3)
tap()
check('4 the next tap enters it again, because the reader still wants it', "!!document.fullscreenElement", timeout=3)
gesture("document.getElementById('btn-fullscreen').click()")
check('5 the switch off leaves full screen at once and is remembered', "!document.fullscreenElement && localStorage.getItem('reader_fullscreen') === '0' && document.getElementById('btn-fullscreen').getAttribute('aria-checked') === 'false'", timeout=3)
tap()
check('6 ... and a later tap no longer enters it: the system bars stay', "!document.fullscreenElement")
boot(None)
c.js("Object.defineProperty(window, 'matchMedia', { value: q => ({ matches: q === '(pointer: coarse)', addEventListener() {}, removeEventListener() {} }) }); 1")
check('7 nothing stored: a touch device wants full screen by default', "fullscreenWanted() === true")
gesture("document.getElementById('btn-fullscreen').click()")
check('8 the switch then turns it off (stores 0)', "localStorage.getItem('reader_fullscreen') === '0' && !document.fullscreenElement", timeout=3)
gesture("document.getElementById('btn-fullscreen').click()")
check('9 the switch on enters at once (its click is the gesture) and stores 1', "!!document.fullscreenElement && localStorage.getItem('reader_fullscreen') === '1'", timeout=3)
check('10 the texts exist in every menu language', "['mFullscreen', 'mFullscreenDesc'].every(k => ['uk','en','fr','ru','zh','ko','hi','ga'].every(l => I18N[k][l]))")
print('ALL FULLSCREEN CHECKS PASSED')
