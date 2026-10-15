// Cloudflare Pages Function: /api/sync — сховище синхронізації між пристроями (js/sync.js).
// Потрібне KV-сховище, прив'язане до сайту під іменем SYNC (Cloudflare → Pages → Settings → Bindings). Без нього — 501.
// Сервер бачить лише ЗАШИФРОВАНИЙ блок: ключ шифрування виводиться з коду синхронізації на самому пристрої й сюди не
// потрапляє. id і ключ запису (x-sync-auth) теж виводяться з коду; сервер зберігає лише хеш ключа запису, тож чужий код
// не перезапише й не прочитає блок. Запис — з перевіркою версії (base = at, отриманий під час читання): якщо інший
// пристрій устиг записати раніше — 409, і пристрій зливає дані ще раз.
//   GET  /api/sync?id=<64 hex>          (x-sync-auth)  -> { blob, at } | 404
//   PUT  /api/sync?id=<64 hex>          (x-sync-auth)  { blob, base } -> { at } | 409 { at }
const HEX64 = /^[a-f0-9]{64}$/;
const MAX_BLOB = 700000;   // base64 зашифрованих даних (~500 КБ) — тексти позицій, нотаток і налаштувань, без книг

function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
async function sha256hex(text) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest({ request, env }) {
    if (request.method !== 'GET' && request.method !== 'PUT') return json({ error: 'method' }, 405);
    if (!env || !env.SYNC) return json({ error: 'not_configured' }, 501);
    const id = new URL(request.url).searchParams.get('id') || '';
    const auth = request.headers.get('x-sync-auth') || '';
    if (!HEX64.test(id) || !HEX64.test(auth)) return json({ error: 'bad request' }, 400);
    const authHash = await sha256hex(auth);
    const key = 'sync:' + id;
    const stored = await env.SYNC.get(key, { type: 'json' });
    if (stored && stored.auth !== authHash) return json({ error: 'forbidden' }, 403);
    if (request.method === 'GET') {
        if (!stored) return json({ error: 'not_found' }, 404);
        return json({ blob: stored.blob, at: stored.at });
    }
    let body;
    try { body = JSON.parse(await request.text()); } catch (e) { return json({ error: 'bad body' }, 400); }
    if (!body || typeof body.blob !== 'string' || !body.blob || body.blob.length > MAX_BLOB || !/^[A-Za-z0-9+/=]+$/.test(body.blob)) return json({ error: 'bad blob' }, 400);
    const base = body.base == null ? null : Number(body.base);
    if ((stored ? stored.at : null) !== base) return json({ error: 'conflict', at: stored ? stored.at : null }, 409);
    const at = Math.max(Date.now(), (stored ? stored.at : 0) + 1);
    await env.SYNC.put(key, JSON.stringify({ auth: authHash, blob: body.blob, at }));
    return json({ at });
}
