// Unit test of the offline-model proxy (functions/api/offline-model.js) with Mozilla's storage mocked: serves only translation-model
// files from the one fixed host, only to the app's own pages, rate-limited, never follows a redirect, and accepts every file the pinned
// catalog (js/offline-catalog.js) can ask for. Run: node tests/offline_model_proxy_test.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Copied to .mjs so any Node version loads it as an ES module (the Pages Function is a plain .js file).
const copy = join(mkdtempSync(join(tmpdir(), 'offline-model-')), 'offline-model.mjs');
writeFileSync(copy, readFileSync(join(root, 'functions', 'api', 'offline-model.js')));
const { onRequestGet, onRequestPost } = await import(pathToFileURL(copy).href);
const catalog = new Function(readFileSync(join(root, 'js', 'offline-catalog.js'), 'utf8') + '\nreturn OFFLINE_CATALOG;')();
const O = 'https://ai-ebook-reader.pages.dev';
const FILE = 'main-workspace/translations-models/f44b1b1b-9df6-4ece-971e-0e5ce96fae54.bin';
let sent = null, upstreamStatus = 200;
globalThis.fetch = async (url, init) => {
    sent = { url, init };
    return new Response(upstreamStatus === 200 ? new Uint8Array([1, 2, 3, 4]) : 'account details', { status: upstreamStatus, headers: upstreamStatus === 200 ? { 'content-length': '4' } : {} });
};
const req = (file, headers = { 'sec-fetch-site': 'same-origin' }) => new Request(O + '/api/offline-model?f=' + encodeURIComponent(file), { headers });
const ok = (name, cond) => { if (!cond) { console.log('FAIL', name); process.exit(1); } console.log('PASS', name); };

let r = await onRequestGet({ request: req(FILE) });
ok('a translation-model file is streamed from the fixed Mozilla host, nothing else is added to the address',
    r.status === 200 && sent.url === 'https://firefox-settings-attachments.cdn.mozilla.net/' + FILE && sent.init.redirect === 'manual');
ok('body passed through, binary type, never cached by the browser, length kept', [...new Uint8Array(await r.arrayBuffer())].join() === '1,2,3,4'
    && r.headers.get('content-type') === 'application/octet-stream' && r.headers.get('cache-control') === 'no-store' && r.headers.get('content-length') === '4');
ok('only GET is exported', typeof onRequestPost === 'undefined');

const bad = ['', '../etc/passwd', 'main-workspace/translations-models/../x.bin', 'main-workspace/translations-wasm/f44b1b1b-9df6-4ece-971e-0e5ce96fae54.wasm',
    'main-workspace/translations-models/a/b.bin', 'main-workspace/translations-models/f44b1b1b-9df6-4ece-971e-0e5ce96fae54.exe', 'https://evil.example/x.bin',
    '//evil.example/x.bin', FILE + '?x=1', FILE + '#x', 'main-workspace/translations-models/short.bin', 'main-workspace/translations-models/' + 'a'.repeat(300) + '.bin',
    'main-workspace%2Ftranslations-models%2Ff44b1b1b-9df6-4ece-971e-0e5ce96fae54.bin', 'main-workspace/translations-models/f44b1b1b-9df6-4ece-971e-0e5ce96fae54.bin\n'];
for (const file of bad) {
    sent = null;
    r = await onRequestGet({ request: req(file) });
    ok('refused: ' + JSON.stringify(file.slice(0, 60)), r.status === 400 && !sent);
}
sent = null;
r = await onRequestGet({ request: new Request(O + '/api/offline-model', { headers: { 'sec-fetch-site': 'same-origin' } }) });
ok('no file given', r.status === 400 && !sent);

for (const [name, headers, expected] of [
    ['foreign Origin refused', { origin: 'https://evil.example' }, 403], ['cross-site fetch refused', { 'sec-fetch-site': 'cross-site' }, 403],
    ['no Origin / Referer / Fetch-Site refused', {}, 403], ['same-site Referer accepted', { referer: O + '/index.html' }, 200],
    ['own Origin accepted', { origin: O }, 200], ['foreign Referer refused', { referer: 'https://evil.example/' + O }, 403]]) {
    sent = null;
    r = await onRequestGet({ request: req(FILE, headers) });
    ok(name, r.status === expected && (expected === 200 ? !!sent : !sent));
}

for (const [status, expected] of [[404, 404], [500, 502], [302, 502], [403, 502]]) {
    upstreamStatus = status;
    r = await onRequestGet({ request: req(FILE) });
    const text = await r.text();
    ok(`upstream ${status} -> ${expected}, upstream body not shown`, r.status === expected && !text.includes('account details'));
}
upstreamStatus = 200;

// Everything the app may download is accepted (a catalog path the proxy refused would make that language pack impossible to install).
let files = 0;
for (const [key, model] of Object.entries(catalog.models)) {
    for (const f of model.files) {
        files++;
        r = await onRequestGet({ request: req(f.path, { 'sec-fetch-site': 'same-origin', 'cf-connecting-ip': 'catalog-' + files }) });
        if (r.status !== 200) ok(`catalog file ${key} ${f.type} ${f.path} is accepted`, false);
        if (!(f.size > 0) || !/^[0-9a-f]{64}$/.test(f.sha256)) ok(`catalog file ${key} ${f.type} has a size and a SHA-256`, false);
    }
}
ok(`all ${files} catalog files of ${Object.keys(catalog.models).length} models are accepted and pinned`, files > 50);

const burst = { 'sec-fetch-site': 'same-origin', 'cf-connecting-ip': '9.9.9.9' };
let last; for (let i = 0; i < 45; i++) last = await onRequestGet({ request: req(FILE, burst) });
ok('more than 40 requests a minute from one IP -> 429', last.status === 429);
console.log('ALL OFFLINE MODEL PROXY CHECKS PASSED');
