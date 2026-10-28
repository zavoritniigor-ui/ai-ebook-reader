"""The welcome video (js/welcome.js, owner 2026-10-28): it plays over the whole screen every time the app is opened and then gets
out of the way; a reload of the same session does not play it again; a tap skips it; with «reduce motion» or without the video
file the app is there at once."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.removeScriptToEvaluateOnNewDocument', identifier=c.no_welcome)   # this suite checks the video itself
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1280, height=800, deviceScaleFactor=1, mobile=False)


def check(name, expr):
    v = c.js(expr)
    assert v is True, (name, v)
    print('PASS', name, flush=True)


def fresh(clear=True):
    if clear:
        c.call('Page.navigate', url=URL); c.wait("document.readyState !== 'loading'")
        c.js("sessionStorage.clear(); 1")   # a new opening of the app = a new session
    c.call('Page.navigate', url=URL)
    c.wait("document.readyState === 'complete'")


fresh()
check('1 opening the app shows the video over the whole screen, and it really plays (WebM where the browser takes it)', """(async () => {
    const s = document.getElementById('app-welcome'), v = s && s.querySelector('video');
    if (!s || s.hidden) return 'no welcome video';
    const r = s.getBoundingClientRect(), z = Number(getComputedStyle(s).zIndex);
    for (let i = 0; i < 30 && v.currentTime < 0.5; i++) await new Promise(r => setTimeout(r, 100));
    return r.width === innerWidth && r.height === innerHeight && z > 1e9 && v.currentTime >= 0.5 && v.muted && /welcome\\.(webm|mp4)$/.test(v.currentSrc) || JSON.stringify({ w: r.width, z, t: v.currentTime, src: v.currentSrc });
})()""")
check('2 after the video the app is there: the video is gone and the start screen can be used', """(async () => {
    for (let i = 0; i < 80 && document.getElementById('app-welcome'); i++) await new Promise(r => setTimeout(r, 100));
    return !document.getElementById('app-welcome') && !document.body.inert && !!document.querySelector('.home-title');
})()""")
fresh(clear=False)
check('3 a reload of the same session plays it no more (the «Оновити» banner, Android bringing a page back from the background)', "!document.getElementById('app-welcome')")
fresh()
time.sleep(0.8)
for t in ('mouseMoved', 'mousePressed', 'mouseReleased'):
    c.call('Input.dispatchMouseEvent', type=t, x=640, y=400, button='left', clickCount=1)
check('4 a tap skips it at once', """(async () => {
    for (let i = 0; i < 8 && document.getElementById('app-welcome'); i++) await new Promise(r => setTimeout(r, 100));
    return !document.getElementById('app-welcome');
})()""")
c.call('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
fresh()
check('5 with «reduce motion» there is no video', "!document.getElementById('app-welcome')")
c.call('Emulation.setEmulatedMedia', features=[])
c.call('Network.setBlockedURLs', urls=['*media/welcome*'])
fresh()
check('6 without the video file (offline: it is not in the offline cache) the app is there within a second', """(async () => {
    for (let i = 0; i < 15 && document.getElementById('app-welcome'); i++) await new Promise(r => setTimeout(r, 100));
    return !document.getElementById('app-welcome');
})()""")
c.call('Network.setBlockedURLs', urls=[])
c.call('Emulation.setDeviceMetricsOverride', width=400, height=860, deviceScaleFactor=1, mobile=True)
fresh()
check('7 on a tall phone screen the book and the title fill most of the width (the picture is enlarged, its middle 60 % shown), on the video’s own dark blue', """(() => {
    const s = document.getElementById('app-welcome'), r = s && s.querySelector('video').getBoundingClientRect();
    return !!s && Math.abs(r.width - innerWidth * 1.65) < 2 && Math.abs(r.left + r.width / 2 - innerWidth / 2) < 2 && r.height < innerHeight
        && getComputedStyle(s).backgroundColor === 'rgb(1, 4, 10)' || JSON.stringify({ w: r && r.width, left: r && r.left, h: r && r.height });
})()""")
fresh()
check('8 the next opening of the app plays it again', "!!document.getElementById('app-welcome') && !document.getElementById('app-welcome').hidden")
print('ALL WELCOME VIDEO CHECKS PASSED')
