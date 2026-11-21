# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""proxy-assets/translate.js — the script the reading proxy (functions/p/[[path]].js) puts first into every page.

A local page stands in for a proxied one (tests/fixtures/proxy/page.html). Checked: the site's run-time requests
(root-relative, or to a listed site) go to /p/<host>/…, other sites are left alone; a frame added later with a listed
site's address is pointed at the proxy; a selected word or sentence opens the bottom panel with its translation
(Google Translate stubbed) and 🔊; a plain tap opens nothing (the exercises keep their taps); a frame's selection sent
up with postMessage shows the same panel; ✕ closes it; the chosen language is remembered.
"""
import json, os, time
from browser_cdp import CDP

BASE = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html').rsplit('/', 1)[0]
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
c.call('Network.setCacheDisabled', cacheDisabled=True); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Emulation.setDeviceMetricsOverride', width=412, height=860, deviceScaleFactor=1, mobile=True)
c.call('Page.addScriptToEvaluateOnNewDocument', source=r'''
window.__errors = []; addEventListener('error', e => __errors.push(e.message));
window.__asked = []; window.__tr = [];
const realFetch = window.fetch;
// Every request leaves through here (after translate.js's own wrapper): record it; answer Google Translate with a stub.
window.fetch = (input, init) => { const u = typeof input === 'string' ? input : input.url; __asked.push(u);
  if (/translate\.googleapis\.com/.test(u)) { const q = new URL(u); __tr.push({ tl: q.searchParams.get('tl'), q: q.searchParams.get('q') });
    return Promise.resolve(new Response(JSON.stringify([[['[' + q.searchParams.get('tl') + '] ' + q.searchParams.get('q'), q.searchParams.get('q')]], null, 'fr']), { headers: { 'content-type': 'application/json' } })); }
  return Promise.resolve(new Response('{}', { status: 404 })); };
const realOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (m, u, ...r) { __asked.push(String(u)); return realOpen.call(this, m, u, ...r); };
''')
c.call('Page.navigate', url=BASE + '/tests/fixtures/proxy/page.html')
c.wait("document.readyState === 'complete'", timeout=20)


def pause(s): c.js(f'new Promise(r => setTimeout(r, {int(s * 1000)}))')


def check(name, expression, timeout=0):
    deadline = time.monotonic() + timeout
    result = c.js(expression)
    while result is not True and time.monotonic() < deadline:
        time.sleep(.15); result = c.js(expression)
    assert result is True, (name, result, c.js("JSON.stringify({asked: __asked, tr: __tr, errors: __errors})"))
    print('PASS', name, flush=True)


PANEL = "document.querySelector('[data-pp]')"
SHOWN = f"(p => !!p && p.style.display === 'block')({PANEL})"
TR = f"({PANEL}?.shadowRoot.querySelector('.tr').textContent || '')"


def select(sel):
    c.js(f"(e => {{ const r = document.createRange(); r.selectNodeContents(e); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }})(document.querySelector({json.dumps(sel)})); 1")


# ---------------------------------------------------------------- the site's own requests
c.js("""fetch('/build/data.json'); fetch('https://fle-rfi.h5p.com/ajax/x?y=1'); fetch('https://www.rfi.fr/other');
  const x = new XMLHttpRequest(); x.open('GET', '/api/thing'); 1""")
check('1 root-relative and listed-site requests go through /p/<host>/; other sites are left alone', """JSON.stringify(__asked.slice(0, 4)) === JSON.stringify(
   ['/p/francaisfacile.rfi.fr/build/data.json', '/p/fle-rfi.h5p.com/ajax/x?y=1', 'https://www.rfi.fr/other', '/p/francaisfacile.rfi.fr/api/thing'])""")
c.js("""const f = document.createElement('iframe'); f.id = 'ex'; f.src = 'https://fle-rfi.h5p.com/content/1/embed'; document.body.append(f);
  const g = document.createElement('iframe'); g.id = 'other'; g.src = 'about:blank'; document.body.append(g); 1""")
check('2 an exercise frame added later is pointed at the proxy (so it gets this script too)', "document.getElementById('ex').getAttribute('src') === '/p/fle-rfi.h5p.com/content/1/embed' && document.getElementById('other').getAttribute('src') === 'about:blank'", timeout=2)

# ---------------------------------------------------------------- selection → translation
c.js("document.getElementById('b').click(); 1"); pause(.8)
check('3 a plain tap opens nothing (the exercise keeps its taps)', f"!{SHOWN} && __tr.length === 0")
select('#t')
check('4 a selected sentence opens the panel with its translation', f"{SHOWN} && {TR} === '[uk] Le prix Goncourt' && {PANEL}.shadowRoot.querySelector('.src').textContent === 'Le prix Goncourt'", timeout=3)
check('4b the panel has 🔊 and a language choice, Ukrainian first', f"!!{PANEL}.shadowRoot.querySelector('.speak') && {PANEL}.shadowRoot.querySelector('.tl').value === 'uk'")
c.js(f"(s => {{ s.value = 'en'; s.dispatchEvent(new Event('change')); }})({PANEL}.shadowRoot.querySelector('.tl')); 1")
check('5 another language translates again and is remembered', f"{TR} === '[en] Le prix Goncourt' && localStorage.getItem('pp_target_lang') === 'en'", timeout=3)
c.js(f"{PANEL}.shadowRoot.querySelector('.close').click(); 1")
check('6 ✕ closes the panel', f"!{SHOWN}")
c.js("getSelection().removeAllRanges(); window.postMessage({ pp: 'translate', text: '  Bonjour  ' }, location.origin); 1")
check('7 a selection sent up from an exercise frame shows the same panel', f"{SHOWN} && {TR} === '[en] Bonjour'", timeout=3)
c.js("window.postMessage({ pp: 'translate', text: '1234 ...' }, location.origin); 1"); pause(.5)
check('7b text without letters is ignored', f"{PANEL}.shadowRoot.querySelector('.src').textContent === 'Bonjour'")
check('8 no page errors', "__errors.length === 0 || JSON.stringify(__errors)")
print('ALL PASS')
