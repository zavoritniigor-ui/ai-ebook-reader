// Cloudflare Pages Function: /api/library
// Тонкий проксі до безкоштовної бібліотеки Project Gutenberg (офіційне дзеркало gutenberg.pglaf.org; сам каталог — статичний library-catalog.json), бо вони не віддають CORS,
// а CSP застосунку дозволяє лише власний origin. НЕ відкритий проксі: сервер сам складає адреси лише до фіксованих хостів (дзеркала Gutenberg gutenberg.nabasny.com і gutenberg.pglaf.org)
// із числових id.
//   ?op=file&id=<number>                                              -> EPUB книги
//   ?op=cover&id=<number>                                             -> обкладинка (jpg)
//   ?op=ws-search&lang=<uk|fr|en|de|es|it>&q=<text>[&cats=<A|B>][&page=<n>] -> пошук творів у Wikisource (MediaWiki Action API, JSON);
//                                                                       cats — категорії жанру (лише прямі члени), тоді q може бути порожнім
//   ?op=ws-page&lang=<…>&title=<title>                                -> HTML сторінки Wikisource (REST API; твір або його розділ)
//   ?op=ws-subpages&lang=<…>&title=<title>                            -> список підсторінок-розділів твору (JSON)
// Wikisource: лише хост <lang>.wikisource.org з білого списку мов, назва сторінки — звичайний рядок, кодується тут.
//   ?op=ia-search&lang=<ukr|eng|fre|…|>&q=<text>&page=<n>[&genre=<key>] -> пошук книг Internet Archive (лише вільне надбання / вільні ліцензії);
//                                                                       genre — ключ жанру бібліотеки (IA_GENRES), тоді q може бути порожнім
//   ?op=ia-files&id=<identifier>                                      -> PDF/EPUB файли книги (JSON)
//   ?op=ia-file&id=<identifier>&name=<file.pdf|file.epub>             -> сам файл
//   ?op=ia-cover&id=<identifier>                                      -> обкладинка
// Internet Archive: лише archive.org, ідентифікатор і назва файлу перевіряються тут; позичальні книги (access-restricted) відкинуто.
//   ?op=bnr-search&q=<text>&page=<n>[&genre=<key>]                    -> пошук у Bibliothèque numérique romande (французька класика, EPUB)
//   ?op=bnr-file&id=<slug>                                            -> EPUB книги (адреса файла береться зі сторінки книги)
//   ?op=bnr-cover&path=<yyyy/mm/name.jpg>                             -> обкладинка
//   ?op=se-search&q=<text>&page=<n>[&genre=<key>]                     -> пошук у Standard Ebooks (англійська класика, EPUB)
//   ?op=se-file&id=<author/title[/translator]>                        -> EPUB книги
//   ?op=se-cover&path=<name/hash/cover.jpg>                           -> обкладинка
// Обидві бібліотеки не мають API: результати розбираються з HTML їхнього пошуку тут, клієнт отримує лише JSON.
const UA = 'AI-Ebook-Reader/1.0 (+https://ai-ebook-reader.pages.dev)';
const WS_LANGS = new Set(['uk', 'fr', 'en', 'de', 'es', 'it']);
// Мови Internet Archive: поле language містить то код MARC (fre), то назву (French).
const IA_LANGS = { ukr: 'Ukrainian', eng: 'English', fre: 'French', ger: 'German', spa: 'Spanish', ita: 'Italian', rus: 'Russian', pol: 'Polish' };
const IA_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
// Вільне надбання (видання до 1930 р.) або явна вільна ліцензія; лише тексти, що мають PDF з текстовим шаром чи EPUB.
const IA_FREE = 'mediatype:texts AND NOT access-restricted-item:true AND format:("Text PDF" OR "Additional Text PDF" OR EPUB)'
    + ' AND (year:[1 TO 1929] OR licenseurl:*creativecommons* OR licenseurl:*publicdomain*)';
const IA_SCAN_FORMATS = new Set(['Scandata', 'Abbyy GZ', 'Single Page Processed JP2 ZIP', 'Single Page Original JP2 Tar']);
const IA_BOOK_FORMATS = new Set(['Text PDF', 'Additional Text PDF', 'EPUB']);
// Жанри бібліотеки → теми (subject) Internet Archive. Теми там пишуть різними мовами, тож кожен жанр — набір слів
// англійською, французькою, німецькою, іспанською, італійською, польською, українською й російською.
const IA_GENRES = {
    fiction: 'fiction OR novel OR novels OR roman OR romans OR romane OR novela OR novelas OR romanzi OR powieść OR проза OR роман OR романи OR повість',
    adventure: 'adventure OR adventures OR aventures OR abenteuer OR aventuras OR avventura OR przygodowa OR пригоди OR приключения',
    detective: 'detective OR "detective and mystery stories" OR policier OR policiers OR "romans policiers" OR kriminalroman OR policíaca OR giallo OR kryminał OR детектив',
    historical: '"historical fiction" OR "romans historiques" OR "historischer roman" OR "novela histórica" OR "romanzo storico" OR "історичний роман" OR "исторический роман"',
    love: 'love OR romance OR "love stories" OR amour OR liebe OR amor OR amore OR кохання OR любовь',
    scifi: '"science fiction" OR "science-fiction" OR "ciencia ficción" OR fantascienza OR utopie OR фантастика',
    stories: '"short stories" OR nouvelles OR contes OR erzählungen OR cuentos OR racconti OR opowiadania OR оповідання OR новели OR рассказы',
    poetry: 'poetry OR poems OR poésie OR poèmes OR gedichte OR lyrik OR poesía OR poesie OR poezja OR wiersze OR поезія OR вірші OR поэзия OR стихи',
    drama: 'drama OR plays OR théâtre OR theater OR teatro OR dramat OR драма OR пʼєси OR "п\'єси" OR пьесы',
    children: 'juvenile OR children OR "fairy tales" OR jeunesse OR kinderbücher OR märchen OR infantil OR ragazzi OR казки OR сказки OR дитяча',
    humor: 'humor OR humour OR wit OR satire OR humorismo OR umorismo OR гумор OR сатира OR юмор',
    biography: 'biography OR autobiography OR memoirs OR mémoires OR biographie OR biografía OR biografia OR memorie OR біографія OR спогади OR мемуари OR биография',
    history: 'history OR histoire OR geschichte OR historia OR storia OR історія OR история',
    philosophy: 'philosophy OR philosophie OR filosofía OR filosofia OR filozofia OR філософія OR философия',
    myth: 'mythology OR folklore OR legends OR mythes OR légendes OR sagen OR leyendas OR leggende OR міфи OR легенди OR фольклор OR мифы',
    travel: 'travel OR voyages OR "description and travel" OR reisen OR viajes OR viaggi OR podróże OR подорожі OR путешествия'
};
// Жанри бібліотеки → рубрики Bibliothèque numérique romande і теми Standard Ebooks (жанру, якого там немає, у списку немає й у клієнті).
const BNR_GENRES = { fiction: 'roman', adventure: 'aventures', detective: 'policier-mystere', historical: 'historique', love: 'amour',
    scifi: 'fantastique-science-fiction-anticipation', stories: 'nouvelles', poetry: 'poesie', drama: 'theatre', children: 'litterature-pour-la-jeunesse',
    humor: 'humour', biography: 'biographie-autobiographie', philosophy: 'philosophie', travel: 'recit-de-voyage' };
const SE_GENRES = { fiction: 'fiction', adventure: 'adventure', detective: 'mystery', scifi: 'science-fiction', stories: 'shorts', poetry: 'poetry',
    drama: 'drama', children: 'childrens', humor: 'comedy', biography: 'biography', philosophy: 'philosophy', travel: 'travel' };
const BNR = 'https://ebooks-bnr.com', SE = 'https://standardebooks.org';
const BNR_SLUG = /^[a-z0-9][a-z0-9-]{0,199}$/;
const BNR_COVER = /^\d{4}\/\d{2}\/[A-Za-z0-9_.-]{1,150}\.(jpe?g|png|webp)$/;
const SE_ID = /^[a-z0-9_-]{1,120}(\/[a-z0-9_-]{1,120}){1,4}$/;
const SE_COVER = /^[a-z0-9_-]{1,300}\/[0-9a-f]{40}\/cover\.jpg$/;
const htmlText = s => String(s || '').replace(/<[^>]*>/g, '').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&(rsquo|lsquo);/g, '’').replace(/&(rdquo|ldquo|quot);/g, '"')
    .replace(/&hellip;/g, '…').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const WS_CAT = /^[^\u0000-\u001f#<>\[\]{}|"\\:]{1,80}$/;
const iaQuote = s => s.replace(/[\\"():\[\]{}^~*?!+\-&|\/]/g, ' ').trim();

// Лише запити зі сторінок самого застосунку (як /api/offline-model): обкладинки <img> приходять з Sec-Fetch-Site: same-origin або
// з Referer цього сайту. Інакше будь-хто користувався б функцією як безкоштовним проксі й вичерпував спільну денну квоту функцій.
function sameOrigin(request, url) {
    if (request.headers.get('sec-fetch-site') === 'same-origin') return true;
    const origin = request.headers.get('origin');
    if (origin) return origin === url.origin;
    const referer = request.headers.get('referer');
    try { return !!referer && new URL(referer).origin === url.origin; } catch (e) { return false; }
}

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
    if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
    try {
        if (op === 'file' || op === 'cover') {
            const id = url.searchParams.get('id') || '';
            if (!/^\d{1,8}$/.test(id)) return json({ error: 'bad id' }, 400);
            // www.gutenberg.org з хмарних IP часто віддає 504. Офіційне дзеркало gutenberg.pglaf.org повне, але повільне
            // (~90 КБ/с: ілюстрована «Pride and Prejudice», 25 МБ, — хвилини), а дзеркало gutenberg.nabasny.com віддає ті самі
            // 25 МБ за кілька секунд, проте оновлюється рідше (нових книг може не мати). Тому: nabasny → pglaf з ілюстраціями →
            // версія без ілюстрацій як остання можливість. Ілюстрації залишаємо завжди, коли їх можна дістати.
            const mirrors = ['https://gutenberg.nabasny.com', 'https://gutenberg.pglaf.org'];
            const targets = op === 'file'
                ? [...mirrors.map(m => `${m}/cache/epub/${id}/pg${id}-images-3.epub`), `https://gutenberg.pglaf.org/cache/epub/${id}/pg${id}.epub`]
                : mirrors.map(m => `${m}/cache/epub/${id}/pg${id}.cover.medium.jpg`);
            let res = null;
            for (const target of targets) {
                try { res = await upstream(target, op === 'file' ? 'application/epub+zip' : 'image/jpeg'); }
                catch (e) { res = null; continue; }
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
                // Категорії жанру: кожна — звичайна назва (без службових знаків пошуку), не більше 12; «A|B» = твір у будь-якій із них.
                const cats = (url.searchParams.get('cats') || '').split('|').map(c => c.trim().replace(/ /g, '_')).filter(Boolean);
                if (cats.length > 12 || cats.some(c => !WS_CAT.test(c))) return json({ error: 'bad cats' }, 400);
                if ((!q && !cats.length) || q.length > 200) return json({ error: 'bad query' }, 400);
                const page = Math.min(25, Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1));
                const search = [q, cats.length ? 'incategory:' + cats.join('|') : ''].filter(Boolean).join(' ');
                const api = `${host}/w/api.php?action=query&list=search&srnamespace=0&srlimit=40&sroffset=${(page - 1) * 40}&srprop=wordcount&format=json&formatversion=2&srsearch=${encodeURIComponent(search)}`;
                const res = await upstream(api, 'application/json');
                if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
                const data = await res.json();
                const results = ((data.query && data.query.search) || []).map(x => ({ title: x.title, words: x.wordcount || 0 }));
                return json({ results, total: (data.query && data.query.searchinfo && data.query.searchinfo.totalhits) || 0 }, 200, 3600);
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
        if (op === 'ia-search') {
            const q = iaQuote((url.searchParams.get('q') || '').slice(0, 200));
            const lang = url.searchParams.get('lang') || '';
            const genre = url.searchParams.get('genre') || '';
            const page = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1));
            if (genre && !Object.prototype.hasOwnProperty.call(IA_GENRES, genre)) return json({ error: 'bad genre' }, 400);
            if (!q && !genre) return json({ error: 'bad query' }, 400);
            if (lang && !IA_LANGS[lang]) return json({ error: 'bad lang' }, 400);
            // Кожне слово — або в назві, або в автора: «voltaire candide» знаходить «Candide» Вольтера (раніше обидва слова мали бути
            // в одному полі, і таких книг майже не було).
            const words = q.split(/\s+/).filter(Boolean).slice(0, 8);
            let query = IA_FREE + words.map(w => ` AND (title:(${w}) OR creator:(${w}))`).join('');
            if (genre) query += ` AND subject:(${IA_GENRES[genre]})`;
            if (lang) query += ` AND language:(${lang} OR ${IA_LANGS[lang]})`;
            const api = new URL('https://archive.org/advancedsearch.php');
            api.searchParams.set('q', query);
            for (const f of ['identifier', 'title', 'creator', 'year', 'language', 'format']) api.searchParams.append('fl[]', f);
            api.searchParams.append('sort[]', 'downloads desc');
            api.searchParams.set('rows', '30'); api.searchParams.set('page', String(page)); api.searchParams.set('output', 'json');
            const res = await upstream(api.toString(), 'application/json');
            if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
            const data = await res.json();
            const one = v => Array.isArray(v) ? v[0] : v;
            const results = ((data.response && data.response.docs) || []).filter(d => IA_ID.test(d.identifier || '')).map(d => {
                const formats = [].concat(d.format || []);
                return { id: d.identifier, title: String(one(d.title) || d.identifier).slice(0, 300), creator: [].concat(d.creator || []).slice(0, 3).map(String),
                    year: String(one(d.year) || ''), lang: String(one(d.language) || ''),
                    pdf: formats.includes('Text PDF') || formats.includes('Additional Text PDF'), epub: formats.includes('EPUB') };
            });
            return json({ results, total: (data.response && data.response.numFound) || 0 }, 200, 3600);
        }
        if (op === 'ia-files' || op === 'ia-file' || op === 'ia-cover') {
            const id = url.searchParams.get('id') || '';
            if (!IA_ID.test(id)) return json({ error: 'bad id' }, 400);
            if (op === 'ia-cover') {
                const res = await upstream(`https://archive.org/services/img/${id}`, 'image/*');
                if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
                const type = res.headers.get('content-type') || '';
                return new Response(res.body, { status: 200, headers: { 'content-type': /^image\/(jpeg|png|gif|webp)$/.test(type) ? type : 'image/jpeg',
                    'cache-control': 'public, max-age=604800', 'x-content-type-options': 'nosniff' } });
            }
            if (op === 'ia-files') {
                const res = await upstream(`https://archive.org/metadata/${id}`, 'application/json');
                if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
                const data = await res.json();
                const meta = data.metadata || {};
                if (String(meta['access-restricted-item']) === 'true') return json({ error: 'restricted' }, 403);
                const all = data.files || [];
                const files = all.filter(f => IA_BOOK_FORMATS.has(f.format) && /\.(pdf|epub)$/i.test(f.name || '') && !String(f.name).includes('..'))
                    .map(f => ({ name: String(f.name), format: f.format, size: Number(f.size) || 0 }));
                return json({ scan: all.some(f => IA_SCAN_FORMATS.has(f.format)), files }, 200, 3600);
            }
            const name = url.searchParams.get('name') || '';
            if (!/\.(pdf|epub)$/i.test(name) || name.length > 300 || name.includes('..') || /[\u0000-\u001f\\]/.test(name)) return json({ error: 'bad name' }, 400);
            const isPdf = /\.pdf$/i.test(name);
            const res = await upstream(`https://archive.org/download/${id}/${name.split('/').map(encodeURIComponent).join('/')}`, isPdf ? 'application/pdf' : 'application/epub+zip');
            if (!res.ok) return json({ error: 'upstream', status: res.status }, res.status === 404 ? 404 : 502);
            const headers = { 'content-type': isPdf ? 'application/pdf' : 'application/epub+zip', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' };
            const length = res.headers.get('content-length');
            if (length) headers['content-length'] = length;
            return new Response(res.body, { status: 200, headers });
        }
        if (op === 'bnr-search' || op === 'se-search') {
            const q = (url.searchParams.get('q') || '').trim();
            const genre = url.searchParams.get('genre') || '';
            const page = Math.min(200, Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1));
            const genres = op === 'bnr-search' ? BNR_GENRES : SE_GENRES;
            if (q.length > 200) return json({ error: 'bad query' }, 400);
            if (genre && !Object.prototype.hasOwnProperty.call(genres, genre)) return json({ error: 'bad genre' }, 400);
            const results = [];
            let html;
            if (op === 'bnr-search') {
                // Порожній запит теж працює: тоді це найновіші книги (усі або рубрики).
                const res = await upstream(`${BNR}/page/${page}/?s=${encodeURIComponent(q)}` + (genre ? '&category_name=' + BNR_GENRES[genre] : ''), 'text/html');
                if (res.status === 404) return json({ results, more: false }, 200, 3600);   // сторінка за останньою
                if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
                html = await res.text();
                for (const part of html.split('<article').slice(1)) {
                    const m = part.match(/href="https:\/\/(?:www\.)?ebooks-bnr\.com\/([a-z0-9-]+)\/" rel="bookmark">([\s\S]*?)<\/a>/);
                    if (!m || !BNR_SLUG.test(m[1])) continue;
                    // Назва на сайті — «Автор – Твір».
                    const full = htmlText(m[2]), at = full.indexOf(' – ');
                    const cover = part.match(/wp-content\/uploads\/(\d{4}\/\d{2}\/[A-Za-z0-9_.-]{1,150}\.(?:jpe?g|png|webp))"/);
                    results.push({ id: m[1], title: (at > 0 ? full.slice(at + 3) : full).slice(0, 300), author: at > 0 ? full.slice(0, at).slice(0, 200) : '',
                        cover: cover && BNR_COVER.test(cover[1]) ? cover[1] : '' });
                }
                return json({ results, more: /class="next page-numbers"/.test(html) }, 200, 3600);
            }
            // tags[] — саме з дужками: закодовані %5B%5D сайт переадресовує на сторінку теми й губить запит.
            const res = await upstream(`${SE}/ebooks?query=${encodeURIComponent(q)}&sort=${q ? 'relevance' : 'popularity'}&page=${page}` + (genre ? '&tags[]=' + SE_GENRES[genre] : ''), 'text/html');
            if (res.status === 404) return json({ results, more: false }, 200, 3600);
            if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
            html = await res.text();
            for (const part of html.split('<li typeof="schema:Book"').slice(1)) {
                const m = part.match(/^\s*about="\/ebooks\/([^"]+)"/);
                if (!m || !SE_ID.test(m[1])) continue;
                const names = [...part.matchAll(/property="schema:name">([^<]*)</g)].map(x => htmlText(x[1]));
                const cover = part.match(/\/images\/covers\/([a-z0-9_-]{1,300}\/[0-9a-f]{40}\/cover\.jpg)/);
                results.push({ id: m[1], title: (names[0] || m[1]).slice(0, 300), author: names.slice(1, 4).join(', ').slice(0, 200), cover: cover ? cover[1] : '' });
            }
            return json({ results, more: /rel="next"/.test(html) }, 200, 3600);
        }
        if (op === 'bnr-cover' || op === 'se-cover') {
            const path = url.searchParams.get('path') || '';
            if (!(op === 'bnr-cover' ? BNR_COVER : SE_COVER).test(path)) return json({ error: 'bad path' }, 400);
            const res = await upstream(op === 'bnr-cover' ? `${BNR}/wp-content/uploads/${path}` : `${SE}/images/covers/${path}`, 'image/*');
            if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
            const type = res.headers.get('content-type') || '';
            return new Response(res.body, { status: 200, headers: { 'content-type': /^image\/(jpeg|png|webp)$/.test(type) ? type : 'image/jpeg',
                'cache-control': 'public, max-age=604800', 'x-content-type-options': 'nosniff' } });
        }
        if (op === 'bnr-file' || op === 'se-file') {
            const id = url.searchParams.get('id') || '';
            let target;
            if (op === 'bnr-file') {
                if (!BNR_SLUG.test(id)) return json({ error: 'bad id' }, 400);
                const page = await upstream(`${BNR}/${id}/`, 'text/html');
                if (!page.ok) return json({ error: 'upstream', status: page.status }, page.status === 404 ? 404 : 502);
                const m = (await page.text()).match(/fdsb_dl=ebooks\/epub\/([A-Za-z0-9_.-]{1,200}\.epub)/);
                if (!m || m[1].includes('..')) return json({ error: 'no epub' }, 404);
                target = `${BNR}/?fdsb_dl=ebooks/epub/${m[1]}`;
            } else {
                if (!SE_ID.test(id)) return json({ error: 'bad id' }, 400);
                target = `${SE}/ebooks/${id}/downloads/${id.replace(/\//g, '_')}.epub?source=download`;
            }
            const res = await upstream(target, 'application/epub+zip');
            if (!res.ok) return json({ error: 'upstream', status: res.status }, res.status === 404 ? 404 : 502);
            const headers = { 'content-type': 'application/epub+zip', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' };
            const length = res.headers.get('content-length');
            if (length) headers['content-length'] = length;
            return new Response(res.body, { status: 200, headers });
        }
        return json({ error: 'unknown op' }, 400);
    } catch (e) {
        return json({ error: 'fetch failed', detail: String(e && e.name || 'error') + ': ' + String(e && e.message || '').slice(0, 120) }, 502);
    }
}
