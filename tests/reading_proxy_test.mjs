// Unit test of the reading proxy (functions/p/[[path]].js) with the sites mocked. Run: node tests/reading_proxy_test.mjs
// (CI runs it from tests/reading_proxy_browser.py.)
// What must hold: never on the app's own origins; only the listed sites; the path is passed on exactly as the browser
// sent it (accented addresses); no cookies either way, an honest User-Agent; the site's framing / CSP headers dropped;
// links, redirects, preloads, CSS urls and inline-script addresses pointed at /p/<host>/.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const copy = join(mkdtempSync(join(tmpdir(), 'reading-proxy-')), 'proxy.mjs');
writeFileSync(copy, readFileSync(join(root, 'functions', 'p', '[[path]].js')));
const { onRequest, proxiedUrl, InlineScriptRewriter, PROXY_HOSTS, proxyServedHere } = await import(pathToFileURL(copy).href);
function ok(name, cond, extra = '') { if (!cond) { console.error('FAIL', name, extra); process.exit(1); } console.log('PASS', name); }

let asked = [], reply = () => new Response('ok', { headers: { 'content-type': 'text/plain' } });
globalThis.fetch = async (url, init = {}) => { asked.push({ url: String(url), init }); return reply(url, init); };
const P = 'https://web.ai-ebook-reader.uk';
const call = (path, init = {}) => {
    const request = new Request(P + path, init);
    const rest = new URL(request.url).pathname.replace(/^\/p\//, '');
    return onRequest({ request, params: { path: rest.split('/').map(decodeURIComponent) } });
};

// ---- where it answers
for (const host of ['ai-ebook-reader.pages.dev', 'ai-ebook-reader.uk', 'www.ai-ebook-reader.uk', 'reader.example', 'evil.ai-ebook-reader.pages.dev.example.com']) {
    asked = [];
    const r = await onRequest({ request: new Request(`https://${host}/p/francaisfacile.rfi.fr/fr/`), params: { path: ['francaisfacile.rfi.fr', 'fr', ''] } });
    ok(`never on the app's own origin or any other host: ${host} (404, nothing fetched)`, r.status === 404 && asked.length === 0);
}
ok('served on its own subdomain and on branch previews only', proxyServedHere('web.ai-ebook-reader.uk') && proxyServedHere('ccr-4ef0a697-6v6q0m.ai-ebook-reader.pages.dev')
    && !proxyServedHere('ai-ebook-reader.pages.dev') && !proxyServedHere('a.b.ai-ebook-reader.pages.dev'));
asked = []; let r = await call('/p/evil.example/x');
ok('a site not on the list -> 403, nothing fetched', r.status === 403 && asked.length === 0);
asked = []; r = await call('/p/francaisfacile.rfi.fr/fr/', { method: 'PUT' });
ok('only GET, HEAD and POST', r.status === 405 && asked.length === 0);
ok('the list is the exercise sites only', [...PROXY_HOSTS].sort().join(' ') === 'fle-rfi.h5p.com francaisfacile.rfi.fr s.francaisfacile.rfi.fr');

// ---- the request it makes
asked = []; r = await call('/p/francaisfacile.rfi.fr/fr/actualit%C3%A9/20261106-france-le-prix-goncourt-2026?x=1', {
    headers: { cookie: 'secret=1', 'accept-language': 'fr', referer: P + '/p/francaisfacile.rfi.fr/fr/exercices/a1/' } });
const sent = asked[0];
ok('the path goes on exactly as sent (é stays %C3%A9, not %25C3%25A9), with the query',
    sent && sent.url === 'https://francaisfacile.rfi.fr/fr/actualit%C3%A9/20261106-france-le-prix-goncourt-2026?x=1', sent && sent.url);
const h = new Headers(sent.init.headers);
ok('no cookie is sent; the User-Agent says who asks; the language is passed on', !h.has('cookie') && /AI-Ebook-Reader/.test(h.get('user-agent')) && h.get('accept-language') === 'fr');
ok('the referring page is given as the site\'s own address (H5P checks where it is shown)', h.get('referer') === 'https://francaisfacile.rfi.fr/fr/exercices/a1/');
ok('redirects are not followed blindly (manual)', sent.init.redirect === 'manual');

// ---- the answer it gives
reply = () => new Response('body{}', { status: 302, headers: {
    'content-type': 'text/plain', location: 'https://francaisfacile.rfi.fr/fr/next', 'set-cookie': 'a=1', 'x-frame-options': 'DENY',
    'content-security-policy': "default-src 'self'", 'cross-origin-opener-policy': 'same-origin', link: '</build/css/root.css>; rel="preload"; as="style"' } });
r = await call('/p/francaisfacile.rfi.fr/fr/old');
ok('no cookie is ever set; the site\'s framing, CSP and isolation headers are dropped',
    !r.headers.has('set-cookie') && !r.headers.has('x-frame-options') && !r.headers.has('content-security-policy') && !r.headers.has('cross-origin-opener-policy'));
ok('a redirect stays inside the proxy', r.status === 302 && r.headers.get('location') === '/p/francaisfacile.rfi.fr/fr/next');
ok('preload links point at the proxy', r.headers.get('link') === '</p/francaisfacile.rfi.fr/build/css/root.css>; rel="preload"; as="style"');
ok('pages through the proxy are not indexed', /noindex/.test(r.headers.get('x-robots-tag')));
reply = () => new Response('a{background:url(/img/a.png)} b{background:url("https://fle-rfi.h5p.com/x.png")} c{background:url(https://other.example/y.png)}', { headers: { 'content-type': 'text/css' } });
r = await call('/p/francaisfacile.rfi.fr/build/a.css');
const css = await r.text();
ok('CSS urls: root-relative and listed sites through the proxy, others untouched',
    css.includes('url(/p/francaisfacile.rfi.fr/img/a.png)') && css.includes('url("/p/fle-rfi.h5p.com/x.png")') && css.includes('url(https://other.example/y.png)'), css);

// ---- address rewriting
const cases = [
    ['/build/js/main.js', '/p/francaisfacile.rfi.fr/build/js/main.js'], ['https://fle-rfi.h5p.com/content/1/embed', '/p/fle-rfi.h5p.com/content/1/embed'],
    ['//francaisfacile.rfi.fr/fr/', '/p/francaisfacile.rfi.fr/fr/'], ['https://www.rfi.fr/fr/', 'https://www.rfi.fr/fr/'], ['page/2', 'page/2'],
    ['#top', '#top'], ['javascript:alert(1)', 'javascript:alert(1)'], ['/p/fle-rfi.h5p.com/x', '/p/fle-rfi.h5p.com/x'], ['data:image/png;base64,AA', 'data:image/png;base64,AA']];
const bad = cases.filter(([a, b]) => proxiedUrl(a, 'francaisfacile.rfi.fr') !== b).map(([a]) => a + ' → ' + proxiedUrl(a, 'francaisfacile.rfi.fr'));
ok('addresses: listed sites and root-relative into the proxy, everything else as it was', bad.length === 0, bad.join(', '));

// Inline script text arrives in chunks; JSON-escaped and plain addresses of listed sites are rewritten once it is whole.
const rw = new InlineScriptRewriter(); rw.element({ hasAttribute: () => false });
const outs = [];
const chunk = (text, last) => ({ text, lastInTextNode: last, remove() { outs.push(['remove']); }, replace(t) { outs.push(['replace', t]); } });
rw.text(chunk('var a = "<iframe src=\\"https:\\/\\/fle-rf', false));
rw.text(chunk('i.h5p.com\\/content\\/9\\/embed\\">"; var b = "https://fle-rfi.h5p.com/js"; var c = "https://www.rfi.fr/x";', true));
const done = outs.find(o => o[0] === 'replace')?.[1] || '';
ok('inline scripts: an address split across chunks is rewritten (JSON-escaped and plain); other sites untouched',
    done.includes('\\/p\\/fle-rfi.h5p.com\\/content\\/9\\/embed') && done.includes('"/p/fle-rfi.h5p.com/js"') && done.includes('https://www.rfi.fr/x') && outs[0][0] === 'remove', done);
// The app opens these hosts through the proxy (js/saved-links.js READING_PROXY_HOSTS): the two lists must be the same.
const appHosts = JSON.parse(readFileSync(join(root, 'js', 'saved-links.js'), 'utf8').match(/READING_PROXY_HOSTS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
ok('the app opens through the proxy exactly the sites the proxy serves', appHosts.slice().sort().join(' ') === [...PROXY_HOSTS].sort().join(' '), appHosts.join(' '));
const appOrigin = readFileSync(join(root, 'js', 'saved-links.js'), 'utf8').match(/READING_PROXY_ORIGIN = '([^']+)'/)[1];
ok('the app sends them to the host the proxy serves on', proxyServedHere(new URL(appOrigin).hostname), appOrigin);
console.log('ALL PASS');
