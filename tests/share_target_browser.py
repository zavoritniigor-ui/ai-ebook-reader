"""«Share → AI Reader» (Web Share Target): the manifest declares a POST share_target with text and book files; the service
worker receives the POST, keeps the shared file/text in the «reader-share» cache and opens the app with ?shared=1; the app
opens the shared book at once (and forgets it: cache deleted, address cleaned) or shows the shared text in the translation
popup. Without a service worker functions/share-target.js answers: ?shared=text&text=… and ?shared=nofile are handled too.
Runs WITH the service worker (no bypass). No network."""
import json, os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
BASE = URL.rsplit('/', 1)[0] + '/'
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=1000, height=800, deviceScaleFactor=1, mobile=False)
READY = "document.readyState==='complete' && !document.body.inert && typeof openBookFile==='function'"


def check(name, expression, timeout=0):
    result = c.js(expression)
    deadline = time.time() + timeout
    while result is not True and time.time() < deadline:
        time.sleep(0.2); result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


def go(url):
    c.call('Page.navigate', url=url); c.wait(READY, timeout=30); time.sleep(0.5)


go(URL)
c.js("localStorage.setItem('reader_onboarding_done','1'); 1")
c.wait("navigator.serviceWorker && navigator.serviceWorker.controller !== undefined", timeout=10)
for _ in range(3):   # the first visit installs the worker; it controls the page after a reload
    if c.js("!!navigator.serviceWorker.controller"): break
    time.sleep(2); go(URL)
check('0 the service worker controls the page', "!!navigator.serviceWorker.controller", timeout=10)

check('1 the manifest declares a POST share target taking text and book files (EPUB, PDF, FB2…)',
      """fetch('manifest.webmanifest').then(r => r.json()).then(m => { const s = m.share_target, f = s && s.params.files && s.params.files[0];
         return !!s && s.method === 'POST' && s.enctype === 'multipart/form-data' && s.params.text === 'text' && f.name === 'book'
           && ['.epub', '.pdf', '.fb2', '.txt', '.md'].every(x => f.accept.includes(x)) || JSON.stringify(s); })""")

POST = """(async (text, fileText, fileName) => { const fd = new FormData(); if (text) fd.append('text', text);
  if (fileText) fd.append('book', new File([fileText], fileName, {type: 'text/markdown'}));
  const r = await fetch('share-target', {method: 'POST', body: fd}); return r.url; })"""
BOOK = "# Partagé\n\nBonjour le monde partagé."
check('2 the worker takes a shared book and opens the app with ?shared=1',
      "%s('', %s, 'partage.md').then(u => u.endsWith('?shared=1') || u)" % (POST, json.dumps(BOOK)))
check('3 the book waits in the «reader-share» cache', "caches.open('reader-share').then(c => c.keys()).then(k => k.length === 1 && k[0].url.endsWith('__share/file') || k.map(x => x.url).join())")
go(BASE + '?shared=1')
check('4 the app opens the shared book at once', "!!state.format && els.pages.textContent.includes('Bonjour le monde partagé')", timeout=15)
check('5 …and forgets it: the address is clean and the cache is gone (a reload does not open it again)',
      "location.search === '' && caches.has('reader-share').then(h => !h)")
check('6 the same shared book has the same book key every time (lastModified 0): it reopens at its place', "state.bookKey === 'reader_bookmark_partage.md_' + new Blob([%s]).size + '_0'" % json.dumps(BOOK))

go(URL)
c.js("aiAvailable = () => false; 1")
check('7 shared text goes through the worker too', "%s('Le chat dort sur le tapis.', '', '').then(u => u.endsWith('?shared=1') || u)" % POST)
go(BASE + '?shared=1')
check('8 shared text opens in the translation popup (with its Ask AI / Grammar buttons)',
      "els.tooltip.style.display === 'flex' && els.ttOriginal.textContent === 'Le chat dort sur le tapis.' && location.search === ''", timeout=10)

go(BASE + '?shared=text&text=' + 'Bonjour%20tout%20le%20monde.')
check('9 without the worker (fallback function): text from the address opens in the popup', "els.ttOriginal.textContent === 'Bonjour tout le monde.' && location.search === ''", timeout=10)
go(BASE + '?shared=nofile')
check('10 a file the fallback could not pass on: the reader is asked to share it again', "(document.getElementById('reader-toast') || {}).textContent === t('shareNoFile')", timeout=5)
print('ALL PASS')
