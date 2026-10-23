// Unit test of the on-device AI proxy (functions/api/device-llm.js) with the upstreams mocked: two fixed files only (the pinned Gemma
// model, the pinned MediaPipe engine binary), only to the app's own pages, a byte range passed on only in the form bytes=A-B,
// upstream errors hidden, and the addresses match js/device-llm-catalog.js and tools/device_llm_catalog.py. Run: node tests/device_llm_proxy_test.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const copy = join(mkdtempSync(join(tmpdir(), 'device-llm-')), 'device-llm.mjs');
writeFileSync(copy, readFileSync(join(root, 'functions', 'api', 'device-llm.js')));
const { onRequestGet, onRequestPost } = await import(pathToFileURL(copy).href);
const catalogSource = readFileSync(join(root, 'js', 'device-llm-catalog.js'), 'utf8');
const catalog = new Function(catalogSource + '\nreturn DEVICE_LLM_CATALOG;')();
const O = 'https://ai-ebook-reader.pages.dev';
let sent = null, upstreamStatus = 200;
globalThis.fetch = async (url, init) => {
    sent = { url, init };
    const ok = upstreamStatus === 200 || upstreamStatus === 206;
    return new Response(ok ? new Uint8Array([1, 2, 3, 4]) : 'account details', { status: upstreamStatus,
        headers: ok ? { 'content-length': '4', ...(upstreamStatus === 206 ? { 'content-range': 'bytes 0-3/2003697664' } : {}) } : {} });
};
const req = (f, headers = { 'sec-fetch-site': 'same-origin' }) => new Request(O + '/api/device-llm?f=' + encodeURIComponent(f), { headers });
const ok = (name, cond) => { if (!cond) { console.log('FAIL', name); process.exit(1); } console.log('PASS', name); };

const modelLine = catalogSource.match(/^\/\/ Model: (\S+)$/m)[1], wasmLine = catalogSource.match(/^\/\/ Engine: (\S+)$/m)[1];
let r = await onRequestGet({ request: req('wasm') });
ok('the engine binary comes from the pinned npm address of the catalog', r.status === 200 && sent.url === wasmLine && !('range' in (sent.init.headers || {})));
ok('body passed through, binary type, never cached by the browser, length kept', [...new Uint8Array(await r.arrayBuffer())].join() === '1,2,3,4'
    && r.headers.get('content-type') === 'application/octet-stream' && r.headers.get('cache-control') === 'no-store' && r.headers.get('content-length') === '4');
upstreamStatus = 206;
r = await onRequestGet({ request: req('model', { 'sec-fetch-site': 'same-origin', range: 'bytes=0-3' }) });
ok('a part of the model: the pinned Hugging Face address (a commit, not a branch), the range passed on, 206 with Content-Range',
    r.status === 206 && sent.url === modelLine && /\/resolve\/[0-9a-f]{40}\//.test(sent.url) && sent.init.headers.range === 'bytes=0-3' && r.headers.get('content-range') === 'bytes 0-3/2003697664');
ok('the catalog pins the same model and engine as the generator', catalog.model.id.includes(sent.url.split('/resolve/')[1].slice(0, 12)) && wasmLine.includes('@' + catalog.engine.version + '/')
    && readFileSync(join(root, 'tools', 'device_llm_catalog.py'), 'utf8').includes(sent.url.split('/resolve/')[1].split('/')[0]));
ok('only GET is exported', typeof onRequestPost === 'undefined');

for (const f of ['', 'models', 'MODEL', 'model?x', '../model', 'https://evil.example/x', 'wasm\n', 'loader']) {
    sent = null;
    r = await onRequestGet({ request: req(f) });
    ok('refused file: ' + JSON.stringify(f), r.status === 400 && !sent);
}
for (const range of ['bytes=5-1', 'bytes=0-', 'bytes=-5', 'bytes=0-1,4-5', 'items=0-3', 'bytes=0-9999999999999']) {
    sent = null;
    r = await onRequestGet({ request: req('model', { 'sec-fetch-site': 'same-origin', range }) });
    ok('refused range: ' + range, r.status === 416 && !sent);
}
for (const [name, headers, expected] of [
    ['foreign Origin refused', { origin: 'https://evil.example' }, 403], ['cross-site fetch refused', { 'sec-fetch-site': 'cross-site' }, 403],
    ['no Origin / Referer / Fetch-Site refused', {}, 403], ['own Origin accepted', { origin: O }, 200], ['foreign Referer refused', { referer: 'https://evil.example/' + O }, 403]]) {
    upstreamStatus = 200; sent = null;
    r = await onRequestGet({ request: req('wasm', headers) });
    ok(name, r.status === expected && (expected === 200 ? !!sent : !sent));
}
for (const [status, expected] of [[404, 404], [500, 502], [403, 502], [200, 502]]) {
    upstreamStatus = status;
    r = await onRequestGet({ request: req('model', { 'sec-fetch-site': 'same-origin', range: 'bytes=0-3' }) });   // a range answered with the whole file is refused too
    const text = await r.text();
    ok(`upstream ${status} for a range -> ${expected}, upstream body not shown`, r.status === expected && !text.includes('account details'));
}
console.log('ALL DEVICE LLM PROXY CHECKS PASSED');
