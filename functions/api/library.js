// Cloudflare Pages Function: /api/library
// Тонкий проксі до безкоштовної бібліотеки Project Gutenberg (офіційне дзеркало gutenberg.pglaf.org; сам каталог — статичний library-catalog.json), бо вони не віддають CORS,
// а CSP застосунку дозволяє лише власний origin. НЕ відкритий проксі: сервер сам складає адреси лише до одного фіксованого хоста (gutenberg.pglaf.org)
// із числових id.
//   ?op=file&id=<number>                                              -> EPUB книги
//   ?op=cover&id=<number>                                             -> обкладинка (jpg)
const UA = 'AI-Ebook-Reader/1.0 (+https://ai-ebook-reader.pages.dev)';

function json(body, status = 200, maxAge = 0) {
    return new Response(JSON.stringify(body), { status, headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
        'x-content-type-options': 'nosniff' } });
}

async function upstream(url, accept, signal) {
    return fetch(url, { headers: { 'user-agent': UA, accept }, redirect: 'follow', signal, cf: { cacheTtl: 86400, cacheEverything: true } });
}

export async function onRequestGet({ request }) {
    const url = new URL(request.url);
    const op = url.searchParams.get('op');
    const signal = AbortSignal.timeout(30000);
    try {
        if (op === 'file' || op === 'cover') {
            const id = url.searchParams.get('id') || '';
            if (!/^\d{1,8}$/.test(id)) return json({ error: 'bad id' }, 400);
            // Офіційне дзеркало Gutenberg: www.gutenberg.org з хмарних IP часто віддає 504, дзеркало відповідає за секунди.
            const targets = op === 'file'
                ? [`https://gutenberg.pglaf.org/cache/epub/${id}/pg${id}-images-3.epub`, `https://gutenberg.pglaf.org/cache/epub/${id}/pg${id}.epub`]
                : [`https://gutenberg.pglaf.org/cache/epub/${id}/pg${id}.cover.medium.jpg`];
            let res = null;
            for (const target of targets) {
                res = await upstream(target, op === 'file' ? 'application/epub+zip' : 'image/jpeg', signal);
                if (res.ok) break;
            }
            if (!res || !res.ok) return json({ error: 'upstream', status: res ? res.status : 0 }, 502);
            return new Response(res.body, { status: 200, headers: {
                'content-type': op === 'file' ? 'application/epub+zip' : 'image/jpeg',
                'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } });
        }
        return json({ error: 'unknown op' }, 400);
    } catch (e) {
        return json({ error: 'fetch failed', detail: String(e && e.name || 'error') + ': ' + String(e && e.message || '').slice(0, 120) }, 502);
    }
}
