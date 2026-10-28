"""«Від розробника» (js/developer.js, owner 2026-10-26) and the app's name «AI E-book Reader».

The Settings section of the main menu has the row; it opens a dialog that says the app is free, runs on AI keys the
developer provides (no tip request), that OpenAI may train on the texts (its key is in a data-sharing programme) while Groq does not,
how to avoid it, and «Написати розробнику»: a mailto link to the developer with a subject and the app version filled in.
The texts follow the menu language. The page, the menu and the start screen say «AI E-book Reader».
"""
import os, time
from urllib.parse import unquote
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP()
c.call('Page.enable'); c.call('Runtime.enable')
c.call('Emulation.setDeviceMetricsOverride', width=420, height=900, deviceScaleFactor=1, mobile=False)
c.call('Page.navigate', url=URL)
c.wait("document.readyState === 'complete' && !document.body.inert && typeof openDeveloperDialog === 'function'")
c.js("localStorage.clear(); showUpdateBanner = () => {}; document.getElementById('sw-update-banner')?.remove(); state.uiLang = 'uk'; applyI18n(); 1")


def check(name, expr):
    v = c.js(expr)
    assert v is True, (name, v)
    print('PASS', name, flush=True)


check('1 the app is called «AI E-book Reader» (page title, menu, start screen)',
      "document.title === 'AI E-book Reader' && document.getElementById('menu-heading').textContent === 'AI E-book Reader' && document.querySelector('.home-title').textContent === 'AI E-book Reader'")
check('2 the Settings section of the main menu has «Від розробника»',
      "(() => { const b = document.getElementById('btn-developer'); return !!b && !!b.closest('.menu-section[aria-labelledby=\"ms-settings\"]') && b.querySelector('.mr-title').textContent === 'Від розробника'; })()")
c.js("document.getElementById('btn-developer').click(); 1"); time.sleep(0.3)
check('3 the row opens the dialog', "document.getElementById('developer-dialog').open === true")
check('4 it says the app is free, runs on the developer\'s AI keys and asks for no tips',
      "(() => { const t = document.querySelector('#developer-dialog').textContent; return /безкоштовний застосунок/.test(document.querySelector('#developer-dialog .dev-free').textContent) && /ключі AI, які надає розробник/.test(t) && !/чайов/.test(t); })()")
check('4b it asks to send all wishes by email',
      "/побажання[^.]*надсилайте мені на пошту/.test(document.querySelector('#developer-dialog .dev-write-note').textContent)")
check('5 it says OpenAI may train on the texts and Groq does not',
      "(() => { const t = document.querySelector('#developer-dialog .dev-data-text').textContent; return /OpenAI може використовувати ці тексти для навчання/.test(t) && /Groq[^.]*не використовує/.test(t); })()")
href = c.js("document.querySelector('#developer-dialog .dev-write').getAttribute('href')")
assert href.startswith('mailto:zavoritniigor@gmail.com?subject='), href
body = unquote(href.split('&body=', 1)[1])
assert 'AI%20E-book%20Reader' in href and 'Версія:' in body and 'Пристрій:' in body, (href, body)
print('PASS 6 «Написати розробнику» opens the mail app: to the developer, a subject, the version and the device filled in', flush=True)
check('7 the dialog closes with ✕', "(() => { document.querySelector('#developer-dialog .dev-close').click(); return document.getElementById('developer-dialog').open === false; })()")
c.js("state.uiLang = 'en'; applyI18n(); openDeveloperDialog(); 1"); time.sleep(0.2)
check('8 the texts follow the menu language (English)',
      "document.querySelector('#developer-dialog .dev-title').textContent === 'From the developer' && /OpenAI may use these texts/.test(document.querySelector('#developer-dialog .dev-data-text').textContent) && document.getElementById('mr-dev-t').textContent === 'From the developer'")
check('9 the logo is the Z / I icon at 512 px', "new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth === 512 && i.naturalHeight === 512); i.onerror = () => r(false); i.src = 'icons/icon-512.png?' + Date.now(); })")
print('ALL DEVELOPER CHECKS PASSED')
