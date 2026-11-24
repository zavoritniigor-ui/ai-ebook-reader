// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// Cloudflare Pages Function: /api/owner — the owner signs a browser in once (functions/_owner.js explains why).
//   GET   -> a page: is this browser the owner, a password field or a «sign out» button
//   POST  form action=login&key=… -> the owner's cookie (400 days), back to the app | action=logout -> the cookie removed
// One page, no script: the key is typed into a form and never travels in a URL (no history, no logs).
import { isOwner, ownerConfigured, ownerKeyMatches, ownerToken, ownerCookieHeader } from '../_owner.js';

const APP_HOST = h => h === 'ai-ebook-reader.uk' || h.endsWith('.ai-ebook-reader.uk') || h === 'ai-ebook-reader.pages.dev'
    || h.endsWith('.ai-ebook-reader.pages.dev') || h === 'localhost' || h === '127.0.0.1';

function page(body, status = 200, extra = {}) {
    const html = `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>AI E-book Reader — власник</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font:17px/1.45 system-ui,sans-serif;background:#eef4ff;color:#1d2433}
main{background:#fff;border-radius:18px;padding:28px 24px;max-width:380px;width:calc(100% - 32px);box-shadow:0 6px 24px #1d243322;text-align:center}
h1{font-size:21px;margin:0 0 12px}p{margin:0 0 16px}input{width:100%;box-sizing:border-box;font:inherit;padding:12px;border:2px solid #b9c8ee;border-radius:12px;margin-bottom:14px}
button{font:inherit;font-weight:600;border:0;border-radius:12px;padding:12px 22px;cursor:pointer;background:#4f7cff;color:#fff}
button.out{background:#ffb347;color:#1d2433}a{color:#2f5be0}.ok{color:#14833b;font-weight:600}.no{color:#b3261e;font-weight:600}
</style></head><body><main><h1>🔑 Власник застосунку</h1>${body}</main></body></html>`;
    return new Response(html, { status, headers: {
        'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin',
        'x-frame-options': 'DENY', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
        ...extra } });
}
const loginForm = note => `${note}<form method="post"><input type="hidden" name="action" value="login">
<input type="password" name="key" autocomplete="current-password" placeholder="Ключ власника" required autofocus>
<button type="submit">Увійти</button></form>`;
const signedIn = `<p class="ok">✅ Цей браузер — власник: спільний AI, голос і проксі працюють без обмежень.</p>
<p><a href="/">Відкрити застосунок</a></p><form method="post"><input type="hidden" name="action" value="logout"><button class="out" type="submit">Вийти</button></form>`;

export async function onRequestGet({ request, env }) {
    if (!APP_HOST(new URL(request.url).hostname)) return new Response('not found', { status: 404 });
    if (!ownerConfigured(env)) return page('<p class="no">Ключ власника ще не задано: секрет OWNER_KEY у Cloudflare Pages.</p>');
    return page(await isOwner(request, env) ? signedIn : loginForm('<p>Введіть ключ один раз у кожному браузері.</p>'));
}

export async function onRequestPost({ request, env }) {
    const url = new URL(request.url);
    if (!APP_HOST(url.hostname)) return new Response('not found', { status: 404 });
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return page('<p class="no">Запит з іншого сайту.</p>', 403);
    let form;
    try { form = await request.formData(); } catch (e) { return page(loginForm('<p class="no">Порожній запит.</p>'), 400); }
    const back = { location: '/', 'cache-control': 'no-store' };
    if (form.get('action') === 'logout') {
        return new Response(null, { status: 303, headers: { ...back, 'set-cookie': ownerCookieHeader(url.hostname, '', 0) } });
    }
    if (!(await ownerKeyMatches(env, form.get('key')))) return page(loginForm('<p class="no">Ключ не підходить.</p>'), 403);
    return new Response(null, { status: 303, headers: { ...back, 'set-cookie': ownerCookieHeader(url.hostname, await ownerToken(env)) } });
}
