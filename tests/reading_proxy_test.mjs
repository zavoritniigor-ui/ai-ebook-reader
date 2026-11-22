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
const { onRequest, proxiedUrl, InlineScriptRewriter, PROXY_HOSTS, proxyServedHere, TRANSLATE_JS_VERSION } = await import(pathToFileURL(copy).href);
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
ok('the list is the exercise sites only', [...PROXY_HOSTS].sort().join(' ') === 'c.h5p.io eu-west-1.cdn.h5p.com fle-rfi.h5p.com francaisfacile.rfi.fr s.francaisfacile.rfi.fr');

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
const { createHash } = await import('node:crypto');
const scriptHash = createHash('sha256').update(readFileSync(join(root, 'proxy-assets', 'translate.js'))).update(readFileSync(join(root, 'proxy-assets', 'dict-worker.js'))).digest('hex').slice(0, 12);
ok('the injected script address carries the version of proxy-assets/translate.js + dict-worker.js (update TRANSLATE_JS_VERSION after editing them)', TRANSLATE_JS_VERSION === scriptHash, TRANSLATE_JS_VERSION + ' != ' + scriptHash);
// The owner's speech server (functions/api/speech/[[path]].js) answers the proxy's host too, and still no other site.
const speechCopy = join(mkdtempSync(join(tmpdir(), 'speech-')), 'speech.mjs');
writeFileSync(speechCopy, readFileSync(join(root, 'functions', 'api', 'speech', '[[path]].js')));
const speech = await import(pathToFileURL(speechCopy).href);
const speak = (host, origin) => speech.onRequest({ request: new Request(`https://${host}/api/speech/speak`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{"text":"chat","lang":"fr"}' }), env: {}, params: { path: ['speak'] } });
let sr = await speak('web.ai-ebook-reader.uk', 'https://web.ai-ebook-reader.uk');
ok('the speech server lets the reading proxy\'s pages in (503 here only because no tunnel is configured in the test)', sr.status === 503, String(sr.status));
sr = await speak('web.ai-ebook-reader.uk', 'https://evil.example');
ok('... but not another site\'s page', sr.status === 403, String(sr.status));
// Microsoft's neural voices (Azure AI Speech) when the owner's computer does not answer — same function, mocked network.
{
    const calls = [];
    let tunnel = () => new Response('', { status: 530 });
    const store = new Map();
    globalThis.caches = { default: { match: async r => store.get(r.url)?.clone(), put: async (r, res) => { store.set(r.url, res); } } };
    globalThis.fetch = async (url, init = {}) => {
        const u = String(url); calls.push({ u, init });
        if (u.startsWith('https://tunnel.example/')) return tunnel();
        if (u === 'https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1') return new Response(new Uint8Array([0xff, 0xf3, 1, 2]), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
        throw new Error('unexpected ' + u);
    };
    const env = { SPEECH_TUNNEL_URL: 'https://tunnel.example', SPEECH_TOKEN: 't', AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'westeurope' };
    const say = (body, e = env, path = 'speak') => speech.onRequest({ request: new Request('https://ai-ebook-reader.pages.dev/api/speech/' + path, { method: path === 'speak' ? 'POST' : 'GET', headers: { origin: 'https://ai-ebook-reader.pages.dev', 'content-type': 'application/json' }, body: path === 'speak' ? JSON.stringify(body) : undefined }), env: e, params: { path: [path] } });
    let r = await say({ text: "l'école <b>", lang: 'fr' });
    const az = calls.find(c => c.u.includes('tts.speech.microsoft.com'));
    ok('the computer down (530): Microsoft\'s voice answers with MP3', r.status === 200 && r.headers.get('content-type') === 'audio/mpeg' && r.headers.get('x-speech-engine') === 'azure');
    ok('... asked officially (Azure key header, SSML with the books\' French voice, the text escaped)', az && new Headers(az.init.headers).get('ocp-apim-subscription-key') === 'k'
        && az.init.body.includes('<voice name="fr-FR-DeniseNeural">l&apos;école &lt;b&gt;</voice>'), az && az.init.body);
    calls.length = 0; r = await say({ text: "l'école <b>", lang: 'fr' });
    ok('the same text again comes from the cache (no second Azure request)', r.status === 200 && !calls.some(c => c.u.includes('microsoft')));
    tunnel = () => new Response(new Uint8Array([82, 73, 70, 70]), { status: 200, headers: { 'content-type': 'audio/wav' } });
    calls.length = 0; r = await say({ text: 'bonjour', lang: 'fr' });
    ok('the computer up: its voice (Kokoro), Azure not asked', r.status === 200 && r.headers.get('content-type') === 'audio/wav' && !calls.some(c => c.u.includes('microsoft')));
    tunnel = () => new Response('too long', { status: 400 });
    calls.length = 0; r = await say({ text: 'x', lang: 'fr' });
    ok('a real refusal of the computer (4xx) is passed on, not replaced', r.status === 400 && !calls.some(c => c.u.includes('microsoft')));
    calls.length = 0; r = await say({ text: 'hello', lang: 'en' }, { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'westeurope', AZURE_SPEECH_VOICES: 'en=en-US-JennyNeural, fr=fr-CA-SylvieNeural' });
    ok('no tunnel configured: Azure alone; AZURE_SPEECH_VOICES picks the voice', r.status === 200 && calls.length === 1 && calls[0].init.body.includes('en-US-JennyNeural'));
    r = await say({ text: 'x'.repeat(1001), lang: 'fr' }, { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'westeurope' });
    ok('an over-long text is not sent to Azure (quota)', r.status === 502);
    r = await say({ text: 'x', lang: 'zz' }, { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'westeurope' });
    ok('a language without a voice → 502 (the app falls back)', r.status === 502);
    tunnel = () => new Response('', { status: 530 });
    r = await say(null, env, 'health');
    const h = await r.json();
    ok('health with the computer down says Microsoft\'s voices are there (the app keeps «Локальний голос» working)', h.ok === true && h.device === 'azure' && h.languages.fr === 'azure' && h.languages.uk === 'azure');
    r = await say({ text: 'x', lang: 'fr' }, {});
    ok('nothing configured → 503, as before', r.status === 503);
    r = await say({ text: 'x', lang: 'fr' }, { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'west europe; evil' });
    ok('a malformed region is not used in the address', r.status === 503);
    delete globalThis.caches;
}
console.log('ALL PASS');
