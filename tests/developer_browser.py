# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
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
# The owner's hidden sign-in (owner, 2026-11-23): five quick taps on the logo; /api/owner is mocked (no server here).
c.js("""state.uiLang = 'uk'; applyI18n(); document.getElementById('developer-dialog').close(); openDeveloperDialog();
window.__ownerCalls = []; window.__nativeFetch = window.__nativeFetch || window.fetch; const nf = window.__nativeFetch;
window.fetch = async (u, o) => {
    if (String(u) !== '/api/owner') return nf(u, o);
    const body = o && o.body ? JSON.parse(o.body) : null; __ownerCalls.push(body);
    let status = 200, data = { owner: false, configured: true };
    if (body && body.action === 'login') { if (body.key === 'right-password-0123456') data = { owner: true }; else { status = 403; data = { owner: false }; } }
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}; 1""")
time.sleep(0.2)
check('10 the owner box is hidden until the logo is tapped five times',
      "(() => { const b = document.querySelector('#developer-dialog .dev-owner'); const logo = document.querySelector('#developer-dialog .dev-logo'); for (let i = 0; i < 4; i++) logo.click(); return b.hidden === true && getComputedStyle(b).display === 'none'; })()")
c.js("document.querySelector('#developer-dialog .dev-logo').click(); 1"); time.sleep(0.3)
check('11 the fifth tap shows it: a password field and «Увійти»',
      "(() => { const d = document.querySelector('#developer-dialog'); return d.querySelector('.dev-owner').hidden === false && d.querySelector('.dev-owner-key').type === 'password' && d.querySelector('.dev-owner-in').textContent === 'Увійти' && /Введіть пароль власника/.test(d.querySelector('.dev-owner-state').textContent); })()")
c.js("{ const d = document.querySelector('#developer-dialog'); d.querySelector('.dev-owner-key').value = 'wrong'; d.querySelector('.dev-owner-form').requestSubmit(); } 1"); time.sleep(0.3)
check('12 a wrong password says so', "/Пароль не підходить/.test(document.querySelector('#developer-dialog .dev-owner-state').textContent)")
c.js("{ const d = document.querySelector('#developer-dialog'); d.querySelector('.dev-owner-key').value = 'right-password-0123456'; d.querySelector('.dev-owner-form').requestSubmit(); } 1"); time.sleep(0.3)
check('13 the right one: «власник», a «Вийти» button, the field emptied and the password kept nowhere in the app',
      "(() => { const d = document.querySelector('#developer-dialog'); return /власник/.test(d.querySelector('.dev-owner-state').textContent) && d.querySelector('.dev-owner-out').hidden === false && d.querySelector('.dev-owner-form').hidden === true && d.querySelector('.dev-owner-key').value === '' && !Object.values(localStorage).some(v => String(v).includes('right-password')); })()")
c.js("document.querySelector('#developer-dialog .dev-owner-out').click(); 1"); time.sleep(0.3)
check('14 «Вийти» signs out', "__ownerCalls.at(-1).action === 'logout' && document.querySelector('#developer-dialog .dev-owner-form').hidden === false")
check('15 reopened, the box is hidden again', "(() => { const d = document.getElementById('developer-dialog'); d.close(); openDeveloperDialog(); return d.querySelector('.dev-owner').hidden === true; })()")
check('9 the logo is the Z / I icon at 512 px', "new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth === 512 && i.naturalHeight === 512); i.onerror = () => r(false); i.src = 'icons/icon-512.png?' + Date.now(); })")
print('ALL DEVELOPER CHECKS PASSED')
