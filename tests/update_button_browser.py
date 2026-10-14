"""🔄 update button (js/pwa-lifecycle.js updateApp / activatePendingSwUpdate). Bug: the whole check waited only 8 s, but a new version
is ~50 files (~6 MB); on a phone the download took longer, so 🔄 said «you have the latest version» while the update was still
downloading (it then installed by itself a minute later — «не завжди спрацьовує»). Now: up to 15 s for the check itself, up to 2 min
once the new version is downloading (with a «downloading…» toast), honest «could not check» on errors, and a press before the
service worker is registered uses the existing registration. The service worker registration is faked; no network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=1100, height=850, deviceScaleFactor=1, mobile=False)


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.1); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def load():
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState==='complete' && !document.body.inert && typeof updateApp==='function'", timeout=30)
    # the REAL service worker's first install ends with clients.claim() -> controllerchange; let it settle before faking updates
    c.wait("!!navigator.serviceWorker.controller", timeout=90)
    c.js("""(() => { localStorage.setItem('reader_ui_lang', 'uk'); state.uiLang = 'uk'; updateBannerShown = false; window.__reloads = 0;
      window.__fakeWorker = (state0) => { const w = new EventTarget(); w.state = state0; w.go = (s) => { w.state = s; w.dispatchEvent(new Event('statechange')); }; return w; };
      // a fake registration whose update() behaves as the test says
      window.__reg = { installing: null, waiting: null, update: async () => { await new Promise(r => setTimeout(r, 200)); if (__reg.next === 'reject') throw new Error('net');
        if (__reg.next === 'new') { __reg.installing = __fakeWorker('installing'); } return __reg; } };
      swRegistration = __reg; return 1; })()""")


toast = "document.getElementById('reader-toast') && document.getElementById('reader-toast').textContent"

# 1. a slow download (longer than the old 8 s) still ends in a restart into the new version
load()
c.js("__reg.next = 'new'; updateApp(); 1")
check('1 a new version is found: the toast says it is downloading', "%s === t('updateDownloading')" % toast, timeout=3)
time.sleep(9)   # longer than the old 8 s limit
check('2 after 9 s of downloading it does NOT claim «latest version»', "%s === t('updateDownloading')" % toast)
c.js("window.__marker = 1; __reg.installing.go('installed'); __reg.installing.go('activated'); navigator.serviceWorker.dispatchEvent(new Event('controllerchange')); 1")
check('3 once installed it restarts into the new version', "%s === t('exitUpdated')" % toast, timeout=3)
check('4 ... and the page really reloads', "window.__marker === undefined", timeout=5)

# 2. no new version
load()
c.js("__reg.next = 'none'; updateApp(); 1")
check('5 no new version: «you have the latest version»', "%s === t('updateLatest')" % toast, timeout=4)

# 3. the check fails (network) -> honest message, not «latest»
load()
c.js("__reg.next = 'reject'; updateApp(); 1")
check('6 the check fails: «could not check or download», not «latest»', "%s === t('updateFailed')" % toast, timeout=4)

# 4. the download breaks off -> failed
load()
c.js("__reg.next = 'new'; updateApp(); 1")
check('7 downloading...', "%s === t('updateDownloading')" % toast, timeout=3)
c.js("__reg.installing.go('redundant'); 1")
check('8 a broken-off download says so (try again)', "%s === t('updateFailed')" % toast, timeout=3)

# 5. pressed before the app registered its service worker: the existing registration is used
load()
c.js("swRegistration = null; __reg.next = 'none'; window.__gotReg = 0; const orig = navigator.serviceWorker.getRegistration.bind(navigator.serviceWorker); navigator.serviceWorker.getRegistration = async () => { __gotReg++; return __reg; }; updateApp(); 1")
check('9 pressed before registration finished: the existing registration is checked (not a silent «latest»)', "__gotReg === 1 && swRegistration === __reg && %s === t('updateLatest')" % toast, timeout=4)
check('10 the new texts exist in all 8 UI languages', "['updateDownloading','updateFailed'].every(k => ['uk','en','fr','ru','zh','ko','hi','ga'].every(l => I18N[k][l]))")
print('ALL UPDATE BUTTON CHECKS PASSED')
