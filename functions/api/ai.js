// Cloudflare Pages Function: /api/ai — спільний ключ AI для тих, хто не ввів власного (js/ai-client.js, SHARED_AI_KEY).
// Ключі лежать ЛИШЕ в секретах Cloudflare Pages (Settings → Variables and Secrets: GROQ_API_KEY, OPENAI_API_KEY) і ніколи
// не потрапляють у браузер, у репозиторій чи в код застосунку.
//   GET                          -> {"groq":bool,"openai":bool,"format":{"groq":bool,"openai":bool}} — які спільні ключі налаштовані
//                                   і чи вони схожі на ключ свого провайдера (gsk_… / sk-…); самих ключів не розкриває
//   POST ?provider=groq|openai   -> тіло запиту провайдера (те саме, що застосунок надсилає напряму з власним ключем);
//                                   відповідь провайдера (JSON або потік SSE) передається як є
// НЕ відкритий проксі: лише запити зі сторінок самого застосунку (Origin), лише моделі застосунку, обмежені розмір запиту й
// бюджет відповіді, грубе обмеження частоти на IP (у межах одного екземпляра функції). Ліміт витрат варто поставити й у
// кабінеті провайдера — це єдиний справжній запобіжник від рахунку.
const URLS = { groq: 'https://api.groq.com/openai/v1/chat/completions', openai: 'https://api.openai.com/v1/responses' };
const SECRETS = { groq: 'GROQ_API_KEY', openai: 'OPENAI_API_KEY' };
// Ті самі моделі, що в js/ai-client.js (GROQ_MODEL, GROQ_VISION_MODEL, OPENAI_MODEL) — змінюючи там, змініть і тут.
const MODELS = { groq: new Set(['openai/gpt-oss-120b', 'qwen/qwen3.6-27b']), openai: new Set(['gpt-5.6-luna']) };
const MAX_BODY_BYTES = 6 * 1024 * 1024;   // запит із вирізаним фрагментом сторінки (data URL) буває кілька МБ
const MAX_OUTPUT_TOKENS = 16000;
const RATE_WINDOW_MS = 60000, RATE_MAX = 40;
const hits = new Map();
// Ключ, вставлений із телефона, часто має пробіл чи перенесення рядка на краю — провайдер тоді відповідає 401.
const secret = (env, provider) => String(env[SECRETS[provider]] || '').trim();
const KEY_FORMAT = { groq: /^gsk_[A-Za-z0-9]{20,}$/, openai: /^sk-[A-Za-z0-9_-]{20,}$/ };

function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: {
        'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
function sameOrigin(request, url) {
    const origin = request.headers.get('origin');
    if (origin) return origin === url.origin;
    // Без Origin (деякі браузери для same-origin) — дивимось Referer; без обох — відмова: так ходять скрипти, не застосунок.
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

export async function onRequestGet({ env }) {
    const groq = secret(env, 'groq'), openai = secret(env, 'openai');
    return json({ groq: !!groq, openai: !!openai, format: { groq: KEY_FORMAT.groq.test(groq), openai: KEY_FORMAT.openai.test(openai) } });
}

export async function onRequestPost({ request, env }) {
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider') || '';
    if (!Object.hasOwn(URLS, provider)) return json({ error: 'bad provider' }, 400);
    const key = secret(env, provider);
    if (!key) return json({ error: 'no shared key' }, 503);
    if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
    if (rateLimited(request.headers.get('cf-connecting-ip') || 'unknown')) return json({ error: 'rate limited' }, 429);
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) return json({ error: 'too large' }, 413);
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: 'too large' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch (e) { return json({ error: 'bad json' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !MODELS[provider].has(body.model)) return json({ error: 'bad model' }, 400);
    // Бюджет відповіді — не більший за найбільший, що його просить застосунок; без нього провайдер узяв би свій максимум.
    const budgetField = provider === 'openai' ? 'max_output_tokens' : 'max_completion_tokens';
    const budget = Number(body[budgetField]);
    body[budgetField] = Number.isFinite(budget) && budget > 0 ? Math.min(Math.floor(budget), MAX_OUTPUT_TOKENS) : 2048;
    for (const k of ['tools', 'tool_choice', 'n', 'background', 'previous_response_id', 'conversation']) delete body[k];
    if (provider === 'openai') body.store = false;
    const upstream = await fetch(URLS[provider], {
        method: 'POST', body: JSON.stringify(body),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }
    });
    // Тіло помилки провайдера не пересилаємо: воно може містити подробиці акаунта. Лише статус — застосунок покаже своє повідомлення.
    if (!upstream.ok) return json({ error: 'upstream', status: upstream.status }, upstream.status === 429 ? 429 : upstream.status >= 500 ? 502 : upstream.status);
    return new Response(upstream.body, { status: 200, headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
