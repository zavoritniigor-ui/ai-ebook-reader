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
c.call('Emulation.setDeviceMetricsOverride', width=400, height=860, deviceScaleFactor=1, mobile=True)
open_app(None)
check('10 on a tall phone screen the book and the title fill most of the width (the picture is enlarged, its middle 60 % shown), on the video’s own dark blue', """(() => {
    const s = document.getElementById('app-welcome'), r = s.querySelector('video').getBoundingClientRect();
    return !s.hidden && Math.abs(r.width - innerWidth * 1.65) < 2 && Math.abs(r.left + r.width / 2 - innerWidth / 2) < 2 && r.height < innerHeight
        && getComputedStyle(s).backgroundColor === 'rgb(1, 4, 10)' || JSON.stringify({ w: r.width, left: r.left, h: r.height });
})()""")
print('ALL WELCOME VIDEO CHECKS PASSED')
