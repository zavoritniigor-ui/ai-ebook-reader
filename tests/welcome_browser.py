"""The welcome video (js/welcome.js, owner 2026-10-28): it plays over the whole screen when the app is opened for the first time
or after a long time unused (30 minutes), then gets out of the way. Put aside and brought back sooner — a new start of the page
or a return from the background — it does not play. A tap skips it; with «reduce motion» or without the video file the app is
there at once."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=c.no_welcome)   # this suite checks the video itself
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=800, deviceScaleFactor=1, mobile=False)
SHOWN = "(() => { const w = document.getElementById('app-welcome'); return !!w && !w.hidden && !w.classList.contains('welcome-out'); })()"
GONE = "(async () => { for (let i = 0; i < %d && !document.getElementById('app-welcome').hidden; i++) await new Promise(r => setTimeout(r, 100)); return document.getElementById('app-welcome').hidden; })()"


def check(name, expr):
    v = c.js(expr)
    assert v is True, (name, v)
    print('PASS', name, flush=True)


def open_app(last_seen_minutes_ago=None):
    """A new start of the page; None = the app was never used on this device. The time is set before the page's own scripts
    run (leaving the previous page writes its own «last seen»)."""
    value = "localStorage.removeItem('reader_last_seen')" if last_seen_minutes_ago is None else \
        f"localStorage.setItem('reader_last_seen', String(Date.now() - {last_seen_minutes_ago} * 60000))"
    sid = c.call('Page.addScriptToEvaluateOnNewDocument', source=f"try {{ if (location.pathname.endsWith('index.html')) {value}; }} catch (e) {{}}")['identifier']
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState === 'complete'")
    c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=sid)


open_app(None)
check('1 opened for the first time: the video plays over the whole screen (WebM where the browser takes it)', """(async () => {
    const s = document.getElementById('app-welcome'), v = s && s.querySelector('video');
    if (!s || s.hidden) return 'no welcome video';
    const r = s.getBoundingClientRect(), z = Number(getComputedStyle(s).zIndex);
    for (let i = 0; i < 30 && v.currentTime < 0.5; i++) await new Promise(r => setTimeout(r, 100));
    return r.width === innerWidth && r.height === innerHeight && z > 1e9 && v.currentTime >= 0.5 && v.muted && /welcome\\.(webm|mp4)$/.test(v.currentSrc) || JSON.stringify({ w: r.width, z, t: v.currentTime, src: v.currentSrc });
})()""")
check('2 after the video the app is there and can be used', (GONE % 80).replace('return document', 'return !document.body.inert && !!document.querySelector(\'.home-title\') && document'))
open_app(10)
check('3 opened again 10 minutes after it was last used: no video', "document.getElementById('app-welcome').hidden")
open_app(31)
check('4 opened after more than 30 minutes unused: the video plays', SHOWN)
time.sleep(0.6)
for t in ('mouseMoved', 'mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=t, x=640, y=400, button='left', clickCount=1)
check('5 a tap skips it at once', GONE % 8)
# put aside and brought back without a reload (YouTube, the files): the page is hidden, then visible again
SET_VIS = "Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => '%s' }); document.dispatchEvent(new Event('visibilitychange')); 1"
c.js(SET_VIS % 'hidden')
c.js("localStorage.setItem('reader_last_seen', String(Date.now() - 5 * 60000)); 1")
c.js(SET_VIS % 'visible')
check('6 brought back from the background after 5 minutes: no video', "document.getElementById('app-welcome').hidden")
c.js(SET_VIS % 'hidden')
c.js("localStorage.setItem('reader_last_seen', String(Date.now() - 45 * 60000)); 1")
c.js(SET_VIS % 'visible')
check('7 brought back after 45 minutes away: the video plays again', SHOWN)
c.js("document.getElementById('app-welcome').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); 1")
check('7b and a tap skips it like the first time', GONE % 8)
c.call('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
open_app(None)
check('8 with «reduce motion» there is no video', "document.getElementById('app-welcome').hidden")
c.call('Emulation.setEmulatedMedia', features=[])
c.call('Network.setBlockedURLs', urls=['*media/welcome*'])
open_app(None)
check('9 without the video file (offline: it is not in the offline cache) the app is there within a second', GONE % 15)
c.call('Network.setBlockedURLs', urls=[])
WIDTH = "(() => { const w = document.getElementById('app-welcome'); return !w.hidden && Math.round(w.querySelector('video').getBoundingClientRect().width); })()"
for (w, h, dpr, want, what) in [(1280, 800, 1, 1280, 'a 1280-pixel monitor: the whole width'), (1280, 800, 2, 640, 'a dense tablet screen (2 pixels a point): 1280 pixels = 640 points, never stretched'),
                               (400, 860, 2.6, 400, 'a phone: the screen width, smaller than its pixels'), (1920, 1080, 1, 1280, 'a big monitor: its own 1280 pixels in the middle')]:
    c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=dpr, mobile=w < 800)
    open_app(None)
    got = c.js(WIDTH)
    assert got == want, (what, got, want)
    print(f'PASS 10 the video is never enlarged past its own pixels — {what}: {got} points wide', flush=True)
check('11 on its own dark blue, its edges fading into it', """(() => { const s = document.getElementById('app-welcome'), v = s.querySelector('video'), cs = getComputedStyle(v);
    return getComputedStyle(s).backgroundColor === 'rgb(1, 4, 10)' && /gradient/.test(cs.maskImage || cs.webkitMaskImage) && cs.objectFit === 'contain'; })()""")
print('ALL WELCOME VIDEO CHECKS PASSED')
