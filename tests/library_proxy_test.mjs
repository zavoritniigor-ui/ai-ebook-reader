// Unit test of the library proxy (functions/api/library.js) with the upstream libraries mocked: it answers only the app's own pages
// (Sec-Fetch-Site: same-origin, or an Origin / Referer of the site), so nobody else can use it as a free proxy and use up the site's
// daily quota of functions. Run: node tests/library_proxy_test.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Copied to .mjs so any Node version loads it as an ES module (the Pages Function is a plain .js file).
const copy = join(mkdtempSync(join(tmpdir(), 'library-')), 'library.mjs');
writeFileSync(copy, readFileSync(join(root, 'functions', 'api', 'library.js')));
const { onRequestGet } = await import(pathToFileURL(copy).href);
const O = 'https://ai-ebook-reader.pages.dev';
let sent = 0;
globalThis.fetch = async () => { sent++; return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/jpeg' } }); };
const req = (headers) => new Request(O + '/api/library?op=cover&id=1342', { headers });
function ok(name, cond) { if (!cond) { console.error('FAIL', name); process.exit(1); } console.log('PASS', name); }

let r = await onRequestGet({ request: req({}) });
ok('no Sec-Fetch-Site, Origin or Referer (a script, not the app) -> 403, nothing fetched', r.status === 403 && sent === 0);
r = await onRequestGet({ request: req({ origin: 'https://evil.example' }) });
ok('a foreign Origin -> 403', r.status === 403 && sent === 0);
r = await onRequestGet({ request: req({ referer: 'https://evil.example/page' }) });
ok('a foreign Referer -> 403', r.status === 403 && sent === 0);
r = await onRequestGet({ request: req({ 'sec-fetch-site': 'cross-site', referer: 'https://evil.example/' }) });
ok('a cross-site request -> 403', r.status === 403 && sent === 0);
r = await onRequestGet({ request: req({ 'sec-fetch-site': 'same-origin' }) });
ok('a cover <img> of the app (Sec-Fetch-Site: same-origin) is served', r.status === 200 && sent > 0);
sent = 0; r = await onRequestGet({ request: req({ referer: O + '/index.html' }) });
ok('a request with the site as Referer is served', r.status === 200 && sent > 0);
sent = 0; r = await onRequestGet({ request: req({ origin: O }) });
ok('a request with the site as Origin is served', r.status === 200 && sent > 0);

// Bibliothèque numérique romande and Standard Ebooks: only their own hosts, ids and paths checked here; results parsed from their HTML.
const asked = [];
const pages = {
    'https://ebooks-bnr.com/page/1/?s=goriot': '<article class="post"><h2><a href="https://ebooks-bnr.com/balzac-le-pere-goriot/" rel="bookmark">Balzac Honoré de &#8211; Le Père Goriot</a></h2><img src="https://ebooks-bnr.com/wp-content/uploads/2022/07/goriot.jpg" /></article><a class="next page-numbers" href="#">',
    'https://ebooks-bnr.com/balzac-le-pere-goriot/': '<a href="https://ebooks-bnr.com/?fdsb_dl=ebooks/epub/balzac_goriot.epub">EPUB</a>',
    'https://standardebooks.org/ebooks?query=&sort=popularity&page=2&tags[]=mystery': '<li typeof="schema:Book" about="/ebooks/agatha-christie/the-secret-adversary"><img src="/images/covers/agatha-christie_the-secret-adversary/' + 'a'.repeat(40) + '/cover.jpg"/><span property="schema:name">The Secret Adversary</span><p class="author"><span property="schema:name">Agatha Christie</span></p></li>'
};
globalThis.fetch = async (u) => { u = String(u); asked.push(u); return u in pages ? new Response(pages[u], { status: 200 }) : new Response(new Uint8Array([80, 75]), { status: 200 }); };
const call = q => onRequestGet({ request: new Request(O + '/api/library?' + q, { headers: { 'sec-fetch-site': 'same-origin' } }) });
let j = await (await call('op=bnr-search&q=goriot')).json();
ok('BNR search: «Author – Title» split, slug and cover path kept, next page seen',
   j.more === true && j.results.length === 1 && j.results[0].id === 'balzac-le-pere-goriot' && j.results[0].title === 'Le Père Goriot' && j.results[0].author === 'Balzac Honoré de' && j.results[0].cover === '2022/07/goriot.jpg');
r = await call('op=bnr-file&id=balzac-le-pere-goriot');
ok('BNR file: the EPUB link is taken from the book page', r.status === 200 && r.headers.get('content-type') === 'application/epub+zip' && asked.at(-1) === 'https://ebooks-bnr.com/?fdsb_dl=ebooks/epub/balzac_goriot.epub');
j = await (await call('op=se-search&q=&genre=detective&page=2')).json();
ok('Standard Ebooks search: genre → its subject, title, author, cover',
   j.more === false && j.results[0].id === 'agatha-christie/the-secret-adversary' && j.results[0].title === 'The Secret Adversary' && j.results[0].author === 'Agatha Christie' && j.results[0].cover.endsWith('/cover.jpg'));
r = await call('op=se-file&id=agatha-christie/the-secret-adversary');
ok('Standard Ebooks file: the download address is built from the id', r.status === 200 && asked.at(-1) === 'https://standardebooks.org/ebooks/agatha-christie/the-secret-adversary/downloads/agatha-christie_the-secret-adversary.epub?source=download');
const before = asked.length;
for (const q of ['op=bnr-file&id=../x', 'op=bnr-file&id=a/b', 'op=se-file&id=a', 'op=se-file&id=a/../../b', 'op=se-file&id=A/B%3Fx', 'op=bnr-cover&path=../../wp-config.php',
                 'op=se-cover&path=x/y/cover.jpg', 'op=se-search&q=x&genre=love', 'op=bnr-search&q=x&genre=history'])
    ok('rejected without fetching: ' + q, (await call(q)).status === 400 && asked.length === before);
console.log('ALL PASS library_proxy_test');
