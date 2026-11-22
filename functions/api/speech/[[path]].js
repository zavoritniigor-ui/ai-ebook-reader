// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// Cloudflare Pages Function: /api/speech/health и /api/speech/speak — проксі до локального мовного сервера на ПК власника
// (tts-server, 127.0.0.1:8880), щоб телефон і планшет могли озвучувати через нього.
// Адреса тунелю (SPEECH_TUNNEL_URL) і спільний токен (SPEECH_TOKEN) лежать ЛИШЕ в секретах Cloudflare Pages і ніколи не
// потрапляють у браузер. Без обох секретів функція відповідає 503, і застосунок переходить на браузерний голос.
// Передає IP відвідувача (cf-connecting-ip) для ліміту запитів на сервері; сервер довіряє йому лише з валідним токеном.
// НЕ відкритий проксі: лише запити зі сторінок самого застосунку (Origin/Referer), лише два маршрути, обмежений розмір тіла.
const ALLOWED = new Set(['health', 'speak']);
const MAX_BODY_BYTES = 16 * 1024;   // фраза для озвучки коротка; сервер і так обмежує MAX_CHARS

// web.ai-ebook-reader.uk: the reading proxy's host (functions/p/[[path]].js) — a word tapped on an exercise site is read
// in the owner's voice too (owner, 2026-11-22). Sites shown there get nothing more than any visitor of the app already has.
const ALLOWED_HOSTS = ['ai-ebook-reader.uk', 'ai-ebook-reader.pages.dev', 'web.ai-ebook-reader.uk'];
// The app's own hosts. The backend refuses to serve any other deployment (a copied site). Add a host here for a new domain.
function allowedHost(h) {
    return !!h && (ALLOWED_HOSTS.includes(h) || h.endsWith('.ai-ebook-reader.pages.dev') || h === 'localhost' || h === '127.0.0.1');
}
function sameOrigin(request, url) {
    if (!allowedHost(url.hostname)) return false;   // this deployment must be one of the app's own hosts
    const origin = request.headers.get('origin');
    if (origin) { try { return allowedHost(new URL(origin).hostname); } catch (e) { return false; } }
    const referer = request.headers.get('referer');
    try { return !!referer && allowedHost(new URL(referer).hostname); } catch (e) { return false; }
}

export async function onRequest({ request, env, params }) {
    const url = new URL(request.url);
    const path = [].concat(params.path || []).join('/');
    if (!ALLOWED.has(path) || (request.method !== 'GET' && request.method !== 'POST')) {
        return new Response('not found', { status: 404 });
    }
    if (!sameOrigin(request, url)) return new Response('forbidden', { status: 403 });
    const base = String(env.SPEECH_TUNNEL_URL || '').trim().replace(/\/+$/, '');
    const token = String(env.SPEECH_TOKEN || '').trim();
    if (!base || !token) return new Response('local speech is not configured', { status: 503 });
    if (request.method === 'POST' && Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
        return new Response('too large', { status: 413 });
    }
    const body = request.method === 'POST' ? await request.arrayBuffer() : undefined;
    if (body && body.byteLength > MAX_BODY_BYTES) return new Response('too large', { status: 413 });
    let upstream;
    try {
        upstream = await fetch(base + '/' + path, {
            method: request.method,
            headers: { 'Content-Type': 'application/json', 'X-Speech-Token': token, 'X-Client-IP': request.headers.get('cf-connecting-ip') || 'unknown' },
            body,
            signal: AbortSignal.timeout(20000),
        });
    } catch (err) {
        return new Response('local speech server is offline', { status: 502 });
    }
    return new Response(upstream.body, { status: upstream.status, headers: {
        'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
        'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
