// Cloudflare Pages Function: /api/library
// Тонкий проксі до безкоштовної бібліотеки Project Gutenberg (каталог Gutendex + офіційне дзеркало gutenberg.pglaf.org), бо вони не віддають CORS,
// а CSP застосунку дозволяє лише власний origin. НЕ відкритий проксі: сервер сам складає адреси лише до двох фіксованих хостів (gutendex.com, gutenberg.pglaf.org)
// із числових id та дозволених параметрів пошуку.
//   ?op=search&q=<text>&lang=<fr|en|uk|ru|...>&topic=<word>&page=<n>  -> стислий JSON каталогу
//   ?op=file&id=<number>                                              -> EPUB книги
//   ?op=cover&id=<number>                                             -> обкладинка (jpg)
const UA = 'AI-Ebook-Reader/1.0 (+https://ai-ebook-reader.pages.dev)';
const LANGS = new Set(['fr', 'en', 'uk', 'ru', 'de', 'es', 'it', 'pt', 'zh', 'ko', 'hi', 'ga']);

function json(body, status = 200, maxAge = 0) {
    return new Response(JSON.stringify(body), { status, headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
        'x-content-type-options': 'nosniff' } });
}
function cleanText(value, max) { return String(value || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }

async function upstream(url, accept, signal) {
    return fetch(url, { headers: { 'user-agent': UA, accept }, redirect: 'follow', signal, cf: { cacheTtl: 86400, cacheEverything: true } });
}

export async function onRequestGet({ request }) {
    const url = new URL(request.url);
    const op = url.searchParams.get('op');
    // Каталог Gutendex на холодний (ще не кешований) запит іноді відповідає майже хвилину — даємо йому час; далі відповідь кешується.
    const signal = AbortSignal.timeout(55000);
    try {
        if (op === 'search') {
            const q = new URL('https://gutendex.com/books/');
            const text = cleanText(url.searchParams.get('q'), 100);
            const topic = cleanText(url.searchParams.get('topic'), 40);
            const lang = cleanText(url.searchParams.get('lang'), 2).toLowerCase();
            const page = Math.min(500, Math.max(1, parseInt(url.searchParams.get('page'), 10) || 1));
            if (text) q.searchParams.set('search', text);
            if (topic) q.searchParams.set('topic', topic);
            if (LANGS.has(lang)) q.searchParams.set('languages', lang);
            if (page > 1) q.searchParams.set('page', String(page));
            const res = await upstream(q.href, 'application/json', signal);
            if (!res.ok) return json({ error: 'catalog', status: res.status }, 502);
            const data = await res.json();
            const results = (data.results || []).filter(b => b.formats && Object.keys(b.formats).some(k => k.startsWith('application/epub+zip'))).map(b => ({
                id: b.id, title: cleanText(b.title, 200), authors: (b.authors || []).map(a => cleanText(a.name, 80)).slice(0, 3),
                lang: (b.languages || [])[0] || '', downloads: b.download_count || 0 }));
            return json({ count: data.count || 0, hasMore: !!data.next, page, results }, 200, 3600);
        }
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
