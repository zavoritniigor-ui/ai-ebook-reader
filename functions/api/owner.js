// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// Cloudflare Pages Function: /api/owner — the owner's hidden sign-in (functions/_owner.js; the box is in js/developer.js).
//   GET                          -> { owner: bool, configured: bool }
//   POST { action: 'login', key } -> 200 { owner: true } + the owner's cookie (400 days) | 403 { owner: false }
//   POST { action: 'logout' }     -> 200 { owner: false }, the cookie removed
// Only from the app's own pages (Origin), so another site cannot sign a visitor in or out.
import { isOwner, ownerConfigured, ownerKeyMatches, ownerToken, ownerCookieHeader } from '../_owner.js';

function json(body, status = 200, extra = {}) {
    return new Response(JSON.stringify(body), { status, headers: {
        'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra } });
}

export async function onRequestGet({ request, env }) {
    return json({ owner: await isOwner(request, env), configured: ownerConfigured(env) });
}

export async function onRequestPost({ request, env }) {
    const url = new URL(request.url), origin = request.headers.get('origin');
    if (!origin || origin !== url.origin) return json({ error: 'forbidden' }, 403);
    let body;
    try { body = JSON.parse(await request.text()); } catch (e) { return json({ error: 'bad json' }, 400); }
    if (body && body.action === 'logout') return json({ owner: false }, 200, { 'set-cookie': ownerCookieHeader('', 0) });
    if (!body || body.action !== 'login') return json({ error: 'bad action' }, 400);
    if (!ownerConfigured(env)) return json({ owner: false, configured: false }, 503);
    if (!(await ownerKeyMatches(env, body.key))) return json({ owner: false }, 403);
    return json({ owner: true }, 200, { 'set-cookie': ownerCookieHeader(await ownerToken(env)) });
}
