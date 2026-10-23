// Cloudflare Pages Function: GET /api/device-llm?f=model|wasm — the files of the on-device AI (js/device-llm.js): the Gemma 4 E2B web
// model (Hugging Face, Apache-2.0, pinned to a commit) and the MediaPipe LLM Inference engine binary (npm via jsDelivr, Apache-2.0).
// The page's Content-Security-Policy lets it fetch only its own origin, and the engine binary (27 MB) is over the Pages file limit, so
// this function streams them. NOT an open proxy: two fixed addresses, GET only, requests from the app's own pages only, a byte range
// of the form bytes=A-B passed on (the model comes in 64 MiB parts, js/device-llm-catalog.js), a rough per-IP rate limit. The app
// checks every part against the size and SHA-256 pinned in js/device-llm-catalog.js, so a changed upstream cannot alter what it installs.
const FILES = {
    model: 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/a790a852d433991c0c0a41c1154cf9b3850300fa/gemma-4-E2B-it-web.task',
    wasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.29/wasm/genai_wasm_internal.wasm',
};
const RANGE = /^bytes=(\d{1,12})-(\d{1,12})$/;
const RATE_WINDOW_MS = 60000, RATE_MAX = 60;
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
    const target = FILES[url.searchParams.get('f') || ''];
    if (!target) return json({ error: 'bad file' }, 400);
    if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
    if (rateLimited(request.headers.get('cf-connecting-ip') || 'unknown')) return json({ error: 'rate limited' }, 429);
    const range = request.headers.get('range');
    const m = range && RANGE.exec(range);
    if (range && (!m || Number(m[2]) < Number(m[1]))) return json({ error: 'bad range' }, 416);
    // Hugging Face answers with a redirect to its file storage; both addresses above are fixed, so following it is safe.
    const upstream = await fetch(target, { headers: m ? { range } : {}, redirect: 'follow' });
    if (upstream.status !== (m ? 206 : 200)) return json({ error: 'upstream', status: upstream.status }, upstream.status === 404 ? 404 : 502);
    const headers = { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
    for (const h of ['content-length', 'content-range']) { const v = upstream.headers.get(h); if (v) headers[h] = v; }
    return new Response(upstream.body, { status: upstream.status, headers });
}
