"""User-reported bug: after installing the PWA from Chrome ("Install app"), the
resulting desktop/home-screen shortcut later opens a dead address.

Full traced chain, production (https://ai-ebook-reader.pages.dev/):
  index.html -> <link rel="manifest" href="manifest.webmanifest"> -> manifest's
  start_url ("./index.html", resolved against the MANIFEST's own URL, not the
  document's) -> Chrome computes the installed app's start_url as exactly
  ".../index.html" (confirmed via CDP's Page.getAppManifest against production:
  zero installability errors, startUrl: ".../index.html") -> Cloudflare Pages
  serves a 308 Permanent Redirect for that literal URL to "/" (its own
  "clean URL" behavior for any file named index.html; confirmed via curl -- no
  _redirects/_headers file in this repo causes it, it's a Pages platform
  default) -> sw.js's service worker (which controls every navigation once
  installed) intercepts that navigation and, in networkFirstForNavigation(),
  ends up handing event.respondWith() a Response whose OWN `.redirected` flag
  is true -- EITHER the live fetch(event.request) (event.request.redirect is
  forced to 'manual' for navigation requests, so a redirecting target resolves
  to an opaqueredirect Response, discarded since .ok is false) OR, far more
  consistently, the cached copy of './index.html': `cache.addAll()` fetched it
  at install time, followed the SAME 308, and Cache Storage preserves that
  Response's `redirected:true` forever.

  Root cause, confirmed empirically (see the two-tab BroadcastChannel repro
  used while diagnosing this, against a from-scratch local server that mimics
  Cloudflare's exact redirect): Chrome refuses to use a Response with
  `redirected:true` to satisfy a NAVIGATION FetchEvent's respondWith() --
  not a JS exception (the async function completes and resolves cleanly with
  a normal 200/ok Response), but the browser silently fails the WHOLE
  navigation with net::ERR_FAILED / "chrome-error://chromewebdata/" ("this
  page may have moved to a new address") instead of ever painting it. This
  reproduces on EVERY navigation to that exact URL, online or offline, not
  intermittently -- exactly matching the shortcut being permanently dead.

Fix, two parts:
  1. manifest.webmanifest: start_url is now "./" instead of "./index.html".
     Cloudflare never redirects "/", so future installs never enter this
     situation at all. `id` stays "/" (unchanged) so Chrome treats this as an
     UPDATE to the same installed app identity, not a new one.
  2. sw.js: networkFirstForNavigation() now passes every candidate Response
     (network or cached) through stripRedirectHistory(), which reconstructs a
     plain `new Response(await res.clone().blob(), {status, statusText,
     headers})` whenever `res.redirected` is true. A freshly-constructed
     Response has no redirect history, so respondWith() always succeeds --
     this heals ANY navigation URL the worker is asked to handle, which is
     exactly why an ALREADY-installed shortcut (still permanently pointing at
     the old "/index.html" start_url baked in at its original install time)
     self-heals the moment the updated sw.js activates: no reinstall needed,
     confirmed below by navigating to that exact stale URL under the fixed
     worker, online and offline.

This suite runs its OWN tiny local server (not the shared CI one on 8765,
which doesn't redirect anything) that serves this repo's real files and adds
the one Cloudflare-specific redirect this bug depends on, so the reproduction
and the fix are both exercised against the actual shipped manifest.webmanifest
and sw.js -- not a stand-in.
"""
import atexit
import http.server
import json
import os
import socketserver
import threading
import time
import urllib.parse
import urllib.request
import base64
import socket
import sys

sys.path.insert(0, os.path.dirname(__file__))
from browser_cdp import CDP

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8767
ORIGIN = f'http://127.0.0.1:{PORT}'


class CloudflareLikeHandler(http.server.SimpleHTTPRequestHandler):
    """Serves this repo's real files, reproducing ONLY the one Cloudflare Pages
    behavior this bug depends on: a literal request for /index.html gets a 308
    Permanent Redirect to /, exactly as curl against production shows (no
    _redirects/_headers file causes this -- it's a Pages platform default for
    any file named index.html)."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _maybe_redirect(self):
        path = self.path.split('?', 1)[0]
        if path == '/index.html':
            self.send_response(308)
            self.send_header('Location', '/')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return True
        return False

    def do_GET(self):
        if self._maybe_redirect(): return
        super().do_GET()

    def do_HEAD(self):
        if self._maybe_redirect(): return
        super().do_HEAD()

    def log_message(self, *args): pass

    # A browser aborting an in-flight resource fetch (normal -- e.g. a
    # cancelled navigation, or Page.navigate() interrupting the previous
    # document's own trailing requests) surfaces here as a benign
    # ConnectionResetError; the default handler prints an alarming traceback
    # for it that has nothing to do with this suite's actual assertions.
    def handle_error(self, request, client_address):
        pass


socketserver.ThreadingTCPServer.allow_reuse_address = True
# Per-request handler threads (ThreadingMixIn spawns one per connection) are
# NON-daemon by default -- a keep-alive connection the browser never closes
# would then keep the whole test process alive past its own last print.
socketserver.ThreadingTCPServer.daemon_threads = True
httpd = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), CloudflareLikeHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()


CDP_PORT = os.environ.get("READER_CDP_PORT", "9222")
_opened_tabs = []


def new_tab(url):
    req = urllib.request.Request(
        f'http://127.0.0.1:{CDP_PORT}/json/new?{urllib.parse.quote(url)}',
        method='PUT')
    data = json.load(urllib.request.urlopen(req, timeout=10))
    # CI runs every *_browser.py suite against the SAME Chrome instance in one
    # session (see .github/workflows/ci.yml) -- an extra tab left open here
    # keeps running the real app indefinitely, including its own
    # pwa-lifecycle.js background-persistence writes to the SHARED origin
    # localStorage, silently overwriting whatever a LATER suite just cleared
    # (confirmed directly: reader_font_size kept reappearing after
    # localStorage.clear() + reload in another suite, traced back to exactly
    # this). Track every tab this file opens so it can close them all again.
    _opened_tabs.append(data['id'])
    return data['webSocketDebuggerUrl']


def close_opened_tabs():
    for target_id in _opened_tabs:
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{CDP_PORT}/json/close/{target_id}', timeout=5)
        except Exception:
            pass
    _opened_tabs.clear()


# Registered via atexit (not just a final call before ALL PWA START_URL CHECKS
# PASSED) specifically so a FAILING check still closes every tab this file
# opened -- an assertion failure must not leave the exact same pollution
# behind that this cleanup exists to prevent.
atexit.register(close_opened_tabs)


def connect(ws_url):
    c = CDP.__new__(CDP)
    u = urllib.parse.urlparse(ws_url)
    c.sock = socket.create_connection((u.hostname, u.port), timeout=10)
    c.seq = 0
    key = base64.b64encode(os.urandom(16)).decode()
    c.sock.sendall(
        f'GET {u.path} HTTP/1.1\r\nHost: {u.netloc}\r\nUpgrade: websocket\r\n'
        f'Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'.encode())
    h = b''
    while not h.endswith(b'\r\n\r\n'): h += c.read(1)
    assert b'101 ' in h, h
    return c


def check(name, value):
    assert value is True, (name, value)
    print('PASS', name, flush=True)


# ==== A: confirm the local server genuinely mimics Cloudflare's redirect =====
# urlopen() follows redirects transparently by default (it only raises
# HTTPError for 4xx/5xx), so the way to observe the 308 happened is comparing
# the FINAL url it landed on against the one actually requested.
opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler)
resp = opener.open(f'{ORIGIN}/index.html', timeout=5)
check('A: local server reproduces the 308 redirect for /index.html', resp.status == 200 and resp.geturl() == f'{ORIGIN}/')

# ==== B: manifest / start_url / scope / id resolution (the real repo file) ===
main = connect(new_tab(f'{ORIGIN}/'))
main.call('Page.enable'); main.call('Runtime.enable')
main.wait("document.readyState==='complete'", timeout=10)


def pause(s): main.js(f'new Promise(r=>setTimeout(r,{s * 1000}))')


manifest = main.js("fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json())")
check('B: manifest id is stable ("/") -- required so Chrome treats this as an update, not a new app', manifest['id'] == '/')
check('B: manifest start_url no longer points at the file Cloudflare redirects', manifest['start_url'] != './index.html')

resolved_start = main.js(f"new URL({manifest['start_url']!r}, document.querySelector('link[rel=manifest]').href).href")
check('B: resolved start_url is exactly the origin root', resolved_start == f'{ORIGIN}/')

app_manifest = main.call('Page.getAppManifest')
check('B: Chrome reports zero installability errors', app_manifest['errors'] == [] and app_manifest['manifest'].get('installableIgnoringIcons', True) is not False)
chrome_start_url = app_manifest['manifest']['startUrl']
check("B: Chrome's OWN computed start_url matches (this is what gets baked into the shortcut)", chrome_start_url == f'{ORIGIN}/')

# The actual regression guard for "no FUTURE install ever hits this again":
# the URL Chrome would bake into a NEW shortcut must resolve with zero
# redirects.
direct = main.js(f"fetch({chrome_start_url!r}).then(r=>({{status:r.status, redirected:r.redirected}}))")
check('B: the start_url Chrome would install resolves directly, no redirect', direct['status'] == 200 and direct['redirected'] is False)

# ==== C: SW registers and precaches the real shell =============================
main.js("navigator.serviceWorker.register('./sw.js', {scope: './'})")
main.wait("navigator.serviceWorker.ready && true", timeout=10)
main.js("navigator.serviceWorker.ready")
for _ in range(40):
    if main.js("caches.keys()"): break
    pause(0.5)
check('C: app shell cache populated', bool(main.js("caches.keys()")))
check('C: cached entry exists for the OLD stale start_url path too', main.js(
    "(async()=>{ const keys = await caches.keys(); const c = await caches.open(keys[0]); return !!(await c.match('./index.html')); })()"))

# ==== D: NEW install -- navigating the current (fixed) start_url works =========
new_install = connect(new_tab('about:blank'))
new_install.call('Page.enable'); new_install.call('Runtime.enable')
new_install.call('Page.navigate', url=f'{ORIGIN}/')
time.sleep(2)
check('D: new-install start_url loads (no chrome-error)', new_install.js("location.href") == f'{ORIGIN}/')
check('D: new-install renders real app content, not an error page', new_install.js("document.title") == 'AI Ebook Reader' or new_install.js("!!document.querySelector('#reader-pages')"))

# ==== E: OLD install self-heals -- the stale "/index.html" start_url now works,
# under the SAME already-active worker, with ZERO reinstall/user action =========
old_install = connect(new_tab('about:blank'))
old_install.call('Page.enable'); old_install.call('Runtime.enable')
old_install.call('Page.navigate', url=f'{ORIGIN}/index.html')
time.sleep(2)
check('E: old-shortcut start_url ("/index.html") no longer dead (this IS the reported bug)', old_install.js("location.href") != 'chrome-error://chromewebdata/')
check('E: old-shortcut start_url actually renders the app', old_install.js("!!document.querySelector('#reader-pages')"))

# ==== F: same self-heal holds OFFLINE too (the whole point of the SW) ==========
offline = connect(new_tab('about:blank'))
offline.call('Page.enable'); offline.call('Runtime.enable'); offline.call('Network.enable')
offline.call('Network.emulateNetworkConditions', offline=True, latency=0, downloadThroughput=0, uploadThroughput=0)
offline.call('Page.navigate', url=f'{ORIGIN}/index.html')
time.sleep(2)
check('F: old-shortcut start_url works OFFLINE too', offline.js("location.href") != 'chrome-error://chromewebdata/' and offline.js("!!document.querySelector('#reader-pages')"))

offline2 = connect(new_tab('about:blank'))
offline2.call('Page.enable'); offline2.call('Runtime.enable'); offline2.call('Network.enable')
offline2.call('Network.emulateNetworkConditions', offline=True, latency=0, downloadThroughput=0, uploadThroughput=0)
offline2.call('Page.navigate', url=f'{ORIGIN}/')
time.sleep(2)
check('F: new start_url ("/") also still works offline (no regression)', offline2.js("!!document.querySelector('#reader-pages')"))

print('ALL PWA START_URL CHECKS PASSED', flush=True)
# Best-effort only: the server thread is a daemon, so the process exits
# cleanly on its own even if a lingering keep-alive connection makes
# shutdown() block -- never let cleanup risk masking a real PASS above.
threading.Thread(target=httpd.shutdown, daemon=True).start()
