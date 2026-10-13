// Cloudflare Pages Function: /api/library
// Тонкий проксі до безкоштовної бібліотеки Project Gutenberg (офіційне дзеркало gutenberg.pglaf.org; сам каталог — статичний library-catalog.json), бо вони не віддають CORS,
// а CSP застосунку дозволяє лише власний origin. НЕ відкритий проксі: сервер сам складає адреси лише до одного фіксованого хоста (gutenberg.pglaf.org)
// із числових id.
//   ?op=file&id=<number>                                              -> EPUB книги
//   ?op=cover&id=<number>                                             -> обкладинка (jpg)
//   ?op=ws-search&lang=<uk|fr|en|de|es|it>&q=<text>                   -> пошук творів у Wikisource (MediaWiki Action API, JSON)
//   ?op=ws-page&lang=<…>&title=<title>                                -> HTML сторінки Wikisource (REST API; твір або його розділ)
//   ?op=ws-subpages&lang=<…>&title=<title>                            -> список підсторінок-розділів твору (JSON)
// Wikisource: лише хост <lang>.wikisource.org з білого списку мов, назва сторінки — звичайний рядок, кодується тут.
const UA = 'AI-Ebook-Reader/1.0 (+https://ai-ebook-reader.pages.dev)';
const MAX_ILLUSTRATED_BYTES = 6 * 1024 * 1024;
const WS_LANGS = new Set(['uk', 'fr', 'en', 'de', 'es', 'it']);

function json(body, status = 200, maxAge = 0) {
    return new Response(JSON.stringify(body), { status, headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
        'x-content-type-options': 'nosniff' } });
}

// Тайм-аут лише на ОЧІКУВАННЯ відповіді (заголовків): раніше AbortSignal.timeout(30000) діяв і на передавання тіла, тож
// велика книга (напр. «Pride and Prejudice» з ілюстраціями, 25 МБ) обривалась на 30-й секунді й відкривалась як «зіпсований ZIP».
async function upstream(url, accept) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try { return await fetch(url, { headers: { 'user-agent': UA, accept }, redirect: 'follow', signal: ctrl.signal, cf: { cacheTtl: 86400, cacheEverything: true } }); }
    finally { clearTimeout(timer); }
}

export async function onRequestGet({ request }) {
    const url = new URL(request.url);
    const op = url.searchParams.get('op');
    try {
        if (op === 'file' || op === 'cover') {
            const id = url.searchParams.get('id') || '';
            if (!/^\d{1,8}$/.test(id)) return json({ error: 'bad id' }, 400);
            // Офіційне дзеркало Gutenberg: www.gutenberg.org з хмарних IP часто віддає 504, дзеркало відповідає за секунди.
            let targets = op === 'file'
                ? [`https://gutenberg.pglaf.org/cache/epub/${id}/pg${id}-images-3.epub`, `https://gutenberg.pglaf.org/cache/epub/${id}/pg${id}.epub`]
                : [`https://gutenberg.pglaf.org/cache/epub/${id}/pg${id}.cover.medium.jpg`];
            // Версія з ілюстраціями буває 15–25 МБ і з дзеркала тягнеться хвилинами (14 МБ — ~3 хв); тоді беремо версію без
            // ілюстрацій (той самий текст, ~0,5 МБ).
            if (op === 'file') {
                try {
                    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 10000);
                    const head = await fetch(targets[0], { method: 'HEAD', headers: { 'user-agent': UA }, signal: ctrl.signal });
                    clearTimeout(timer);
                    if (Number(head.headers.get('content-length') || 0) > MAX_ILLUSTRATED_BYTES) targets = [targets[1], targets[0]];
                } catch (e) { /* без розміру — як і раніше */ }
            }
            let res = null;
            for (const target of targets) {
                res = await upstream(target, op === 'file' ? 'application/epub+zip' : 'image/jpeg');
                if (res.ok) break;
            }
            if (!res || !res.ok) return json({ error: 'upstream', status: res ? res.status : 0 }, 502);
            return new Response(res.body, { status: 200, headers: {
                'content-type': op === 'file' ? 'application/epub+zip' : 'image/jpeg',
                'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } });
        }
        if (op === 'ws-search' || op === 'ws-page' || op === 'ws-subpages') {
            const lang = url.searchParams.get('lang') || '';
            if (!WS_LANGS.has(lang)) return json({ error: 'bad lang' }, 400);
            const host = `https://${lang}.wikisource.org`;
            if (op === 'ws-search') {
                const q = (url.searchParams.get('q') || '').trim();
                if (!q || q.length > 200) return json({ error: 'bad query' }, 400);
                const api = `${host}/w/api.php?action=query&list=search&srnamespace=0&srlimit=40&srprop=wordcount&format=json&formatversion=2&srsearch=${encodeURIComponent(q)}`;
                const res = await upstream(api, 'application/json');
                if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
                const data = await res.json();
                const results = ((data.query && data.query.search) || []).map(x => ({ title: x.title, words: x.wordcount || 0 }));
                return json({ results }, 200, 3600);
            }
            const title = (url.searchParams.get('title') || '').trim();
            if (!title || title.length > 300 || /[\u0000-\u001f#<>\[\]{}|]/.test(title)) return json({ error: 'bad title' }, 400);
            const key = title.replace(/ /g, '_');
            if (op === 'ws-subpages') {
                const api = `${host}/w/api.php?action=query&list=allpages&apnamespace=0&aplimit=200&format=json&formatversion=2&apprefix=${encodeURIComponent(key + '/')}`;
                const res = await upstream(api, 'application/json');
                if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
                const data = await res.json();
                return json({ pages: ((data.query && data.query.allpages) || []).map(x => x.title) }, 200, 3600);
            }
            const res = await upstream(`${host}/api/rest_v1/page/html/${encodeURIComponent(key)}?redirect=true`, 'text/html');
            if (!res.ok) return json({ error: 'upstream', status: res.status }, res.status === 404 ? 404 : 502);
            return new Response(res.body, { status: 200, headers: {
                'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff',
                'content-security-policy': "default-src 'none'; sandbox" } });
        }
        return json({ error: 'unknown op' }, 400);
    } catch (e) {
        return json({ error: 'fetch failed', detail: String(e && e.name || 'error') + ': ' + String(e && e.message || '').slice(0, 120) }, 502);
    }
}
