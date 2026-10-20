// Cloudflare Pages Function: /api/speech/health и /api/speech/speak — проксі до локального мовного сервера на ПК власника
// (tts-server, 127.0.0.1:8880), щоб телефон і планшет могли озвучувати через нього.
// Адреса тунелю (SPEECH_TUNNEL_URL) і спільний токен (SPEECH_TOKEN) лежать ЛИШЕ в секретах Cloudflare Pages і ніколи не
// потрапляють у браузер. Без обох секретів функція відповідає 503, і застосунок переходить на браузерний голос.
// НЕ відкритий проксі: лише запити зі сторінок самого застосунку (Origin/Referer), лише два маршрути, обмежений розмір тіла.
const ALLOWED = new Set(['health', 'speak']);
const MAX_BODY_BYTES = 16 * 1024;   // фраза для озвучки коротка; сервер і так обмежує MAX_CHARS

function sameOrigin(request, url) {
    const origin = request.headers.get('origin');
    if (origin) return origin === url.origin;
    const referer = request.headers.get('referer');
    try { return !!referer && new URL(referer).origin === url.origin; } catch (e) { return false; }
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
            headers: { 'Content-Type': 'application/json', 'X-Speech-Token': token },
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
