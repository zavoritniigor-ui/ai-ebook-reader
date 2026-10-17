// Cloudflare Pages Function: GET /api/offline-model?f=<path> — language-model files for the on-device translator (js/offline-translate.js).
// The files are Mozilla's public translation models (MPL-2.0). Their storage sends no CORS headers, so a page cannot fetch them
// itself; this function streams a file from there. NOT an open proxy: one fixed host, a strict path pattern (translation-model files
// only), GET only, requests from the app's own pages only, a rough per-IP rate limit. The app checks every file against the size and
// SHA-256 pinned in js/offline-catalog.js, so a changed upstream cannot alter what gets installed.
const ORIGIN = 'https://firefox-settings-attachments.cdn.mozilla.net/';
const PATH = /^main-workspace\/translations-models\/[A-Za-z0-9-]{8,200}\.(?:bin|spm)$/;
const RATE_WINDOW_MS = 60000, RATE_MAX = 40;
const hits = new Map();

function json(body, status) {
    return new Response(JSON.stringify(body), { status, headers: {
        'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
function sameOrigin(request, url) {
    if (request.headers.get('sec-fetch-site') === 'same-origin') return true;
    const origin = request.headers.get('origin');
    if (origin) return origin === url.origin;
    const referer = request.headers.get('referer');
    try { return !!referer && new URL(referer).origin === url.origin; } catch (e) { return false; }
}
function rateLimited(ip) {
    const now = Date.now();
    const list = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
    list.push(now); hits.set(ip, list);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > RATE_WINDOW_MS) hits.delete(k);
    return list.length > RATE_MAX;
}

export async function onRequestGet({ request }) {
    const url = new URL(request.url);
    const file = url.searchParams.get('f') || '';
    if (!PATH.test(file)) return json({ error: 'bad file' }, 400);
    if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
    if (rateLimited(request.headers.get('cf-connecting-ip') || 'unknown')) return json({ error: 'rate limited' }, 429);
    // Mozilla's files never change under their address, so the edge keeps them: the storage is hit once per file, not once per reader.
    // A redirect is not followed: the answer must come from that host.
    const upstream = await fetch(ORIGIN + file, { redirect: 'manual', cf: { cacheEverything: true, cacheTtl: 31536000 } });
    if (!upstream.ok) return json({ error: 'upstream', status: upstream.status }, upstream.status === 404 ? 404 : 502);
    const headers = { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
    const length = upstream.headers.get('content-length');
    if (length) headers['content-length'] = length;
    return new Response(upstream.body, { status: 200, headers });
}
