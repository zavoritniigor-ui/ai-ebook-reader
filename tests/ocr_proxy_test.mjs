// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// Unit test of the OCR proxy (functions/api/ocr/[[path]].js) with the owner's OCR backend mocked: fixed routes and
// methods only, the app's own pages only, the bearer token never reaches the browser, upstream bodies/redirects are
// never passed through, uploads and downloads are bounded while streaming, deadlines and cancellation stop the upstream.
// Run: node tests/ocr_proxy_test.mjs
import { loadFunction } from './functions_loader.mjs';

const { onRequest } = await loadFunction('api/ocr/[[path]].js');
const O = 'https://ai-ebook-reader.pages.dev';
// A test token, not a secret (built from words so a secret scanner does not mistake it for one).
const TOKEN = ['unit', 'test', 'ocr', 'token', 'value'].join('-');
const ENV = { OCR_TUNNEL_URL: 'https://ocr.example.test/', OCR_TOKEN: TOKEN };
const ID = 'a'.repeat(32);
let failed = 0;
const ok = (name, cond) => { if (cond) console.log('PASS', name); else { failed++; console.log('FAIL', name); } };

let calls = [], reply = null;
globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return reply(String(url), init);
};
const jsonReply = (value, status = 200, headers = {}) => () => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
function req(path, { method = 'GET', headers = { 'sec-fetch-site': 'same-origin', origin: O }, body, cf, signal, base = O } = {}) {
    const init = { method, headers, signal };
    if (body !== undefined) { init.body = body; init.duplex = 'half'; }
    const request = new Request(base + '/api/ocr/' + path, init);
    if (cf) Object.defineProperty(request, 'cf', { value: cf });
    return request;
}
const call = (request, env = ENV) => onRequest({ request, env });
async function text(response) { return response.body ? await response.text() : ''; }

// --- Routes and methods
reply = jsonReply({ status: 'ready', configured_device: 'gpu:0', model_loaded: true, secret: 'x' });
calls = [];
let r = await call(req('health'));
let body = await r.json();
ok('health maps to /health with the bearer token and returns only known fields',
    r.status === 200 && calls[0].url === 'https://ocr.example.test/health' && calls[0].init.headers.get('authorization') === 'Bearer ' + TOKEN
    && calls[0].init.redirect === 'manual' && JSON.stringify(Object.keys(body)) === '["status","configured_device","model_loaded"]');
ok('responses are no-store and nosniff', r.headers.get('cache-control') === 'no-store' && r.headers.get('x-content-type-options') === 'nosniff');

for (const [path, method, status] of [
    ['health', 'POST', 405], ['jobs', 'GET', 405], ['jobs/' + ID, 'GET', 405], ['jobs/' + ID + '/pdf', 'DELETE', 405],
    ['jobs/' + ID + '/pages/3', 'GET', 405], ['jobs/' + ID + '/pages/20', 'PUT', 404], ['jobs/' + ID.toUpperCase(), 'DELETE', 404],
    ['jobs/abc', 'DELETE', 404], ['jobs/' + ID + '/pages%2F3', 'PUT', 404], ['jobs/' + ID + '%2Fpdf', 'GET', 404], ['v1/jobs', 'POST', 404], ['', 'GET', 404],
    ['jobs/' + ID + '/pdf?x=1', 'GET', 400], ['health/', 'GET', 404], ['jobs/' + ID + '/other', 'GET', 404],
]) {
    calls = [];
    r = await call(req(path, { method, body: ['POST', 'PUT'].includes(method) ? '{}' : undefined }));
    ok(`${method} /api/ocr/${path} → ${status}, no upstream call`, r.status === status && calls.length === 0);
}

// --- Origin checks
for (const [name, headers] of [
    ['foreign Origin', { origin: 'https://evil.example' }], ['cross-site fetch', { 'sec-fetch-site': 'cross-site', origin: O }],
    ['same-site (not same-origin) fetch', { 'sec-fetch-site': 'same-site', origin: O }], ['no Origin or Referer', {}],
    ['Origin with a suffix trick', { origin: O + '.evil.example' }], ['foreign Referer', { referer: 'https://evil.example/' + O }],
    ['Referer carrying credentials', { referer: 'https://user:pw@ai-ebook-reader.pages.dev/' }],
    ['Origin "null"', { origin: 'null' }],
]) {
    calls = [];
    r = await call(req('health', { headers }));
    ok('refused: ' + name, r.status === 403 && calls.length === 0);
}
calls = [];
r = await call(req('health', { base: 'https://ai-ebook-reader.evil.example', headers: { origin: 'https://ai-ebook-reader.evil.example' } }));
ok('refused: a foreign host serving the same path', r.status === 403 && calls.length === 0);
r = await call(req('health', { base: 'https://preview-1.ai-ebook-reader.pages.dev', headers: { origin: 'https://preview-1.ai-ebook-reader.pages.dev' } }));
ok('a preview deploy of the app is accepted', r.status === 200);
r = await call(req('health', { headers: { referer: O + '/index.html' } }));
ok('own Referer without Origin is accepted', r.status === 200);

// --- Configuration
for (const [name, env, status] of [
    ['no secrets', {}, 503], ['empty token', { ...ENV, OCR_TOKEN: '  ' }, 503],
    ['plain-HTTP tunnel from production', { ...ENV, OCR_TUNNEL_URL: 'http://127.0.0.1:8765' }, 502],
    ['tunnel URL with credentials', { ...ENV, OCR_TUNNEL_URL: 'https://u:p@ocr.example.test' }, 502],
    ['tunnel URL with a query', { ...ENV, OCR_TUNNEL_URL: 'https://ocr.example.test/?a=1' }, 502],
    ['token with a header-breaking character', { ...ENV, OCR_TOKEN: 'abc\r\nX: y' }, 502],
]) {
    calls = [];
    r = await call(req('health'), env);
    body = await text(r);
    ok('configuration refused: ' + name, r.status === status && calls.length === 0 && !body.includes('ocr.example') && !body.includes(TOKEN));
}
calls = [];
r = await call(req('health', { base: 'http://localhost:8788', headers: { origin: 'http://localhost:8788' } }), { ...ENV, OCR_TUNNEL_URL: 'http://127.0.0.1:8765' });
ok('local development may use the loopback HTTP backend', r.status === 200 && calls[0].url === 'http://127.0.0.1:8765/health');

// --- Upstream errors, redirects and token leaks
for (const [name, make, status, code] of [
    ['redirect is not followed', () => new Response(null, { status: 302, headers: { location: 'https://evil.example/' + TOKEN } }), 502, 'offline'],
    ['HTML error page is not passed through', () => new Response('<html>' + TOKEN + ' trace</html>', { status: 500, headers: { 'content-type': 'text/html' } }), 502, 'offline'],
    ['tunnel 404 becomes not-found', () => new Response('job gone ' + TOKEN, { status: 404 }), 404, 'not-found'],
    ['wrong content type on success', () => new Response('{"status":"ready"}', { status: 200, headers: { 'content-type': 'text/html' } }), 502, 'upstream'],
    ['unknown health fields/values', jsonReply({ status: 'evil', configured_device: 'gpu:0', model_loaded: true }), 502, 'upstream'],
    ['invalid JSON', () => new Response('{', { headers: { 'content-type': 'application/json' } }), 502, 'upstream'],
]) {
    reply = make;
    r = await call(req('health'));
    body = await text(r);
    ok('upstream: ' + name, r.status === status && JSON.parse(body).error === code && !body.includes(TOKEN) && !r.headers.get('location'));
}
reply = () => { throw new TypeError('connect ECONNREFUSED ' + TOKEN); };
r = await call(req('health'));
body = await text(r);
ok('unreachable tunnel reports offline without the error text', r.status === 502 && JSON.parse(body).error === 'offline' && !body.includes(TOKEN));
reply = () => new Response('slow down', { status: 429, headers: { 'retry-after': '99999' } });
r = await call(req('health'));
ok('busy backend: 429 with a clamped Retry-After', r.status === 429 && r.headers.get('retry-after') === '2' && (await r.json()).error === 'busy');
reply = () => new Response('', { status: 429, headers: { 'retry-after': '7' } });
r = await call(req('health'));
ok('busy backend: a sane Retry-After is kept', r.status === 429 && r.headers.get('retry-after') === '7');

// --- Client IP
reply = jsonReply({ status: 'ready', configured_device: 'cpu', model_loaded: false });
calls = [];
await call(req('health', { headers: { origin: O, 'cf-connecting-ip': '203.0.113.7', 'x-client-ip': '1.1.1.1' } }));
ok('without the Cloudflare runtime no client IP is forwarded, and a browser X-Client-IP is dropped', !calls[0].init.headers.has('x-client-ip'));
calls = [];
await call(req('health', { headers: { origin: O, 'cf-connecting-ip': '203.0.113.7' }, cf: { asn: 64500 } }));
ok('the Cloudflare-supplied client IP is forwarded as X-Client-IP', calls[0].init.headers.get('x-client-ip') === '203.0.113.7');
calls = [];
await call(req('health', { headers: { origin: O, 'cf-connecting-ip': '999.1.1.1' }, cf: { asn: 64500 } }));
ok('an invalid client IP is not forwarded', !calls[0].init.headers.has('x-client-ip'));
calls = [];
await call(req('health', { headers: { origin: O }, cf: { asn: 64500 } }));
ok('browser cookies and credentials are never forwarded', [...calls[0].init.headers.keys()].sort().join() === 'accept,authorization');

// --- Create a job
reply = jsonReply({ id: ID, extra: 'x' }, 201);
calls = [];
r = await call(req('jobs', { method: 'POST', headers: { origin: O, 'content-type': 'application/json' }, body: '{"paper":"a4","nup":2,"dewarp":true}' }));
ok('create: options are re-serialised and only the id comes back', r.status === 201 && JSON.stringify(await r.json()) === `{"id":"${ID}"}`
    && calls[0].url === 'https://ocr.example.test/v1/jobs' && calls[0].init.body === '{"paper":"a4","nup":2,"dewarp":true}');
for (const [name, raw, type, status] of [
    ['unknown option', '{"paper":"fit","path":"/etc"}', 'application/json', 422], ['fit with several pages per sheet', '{"paper":"fit","nup":2}', 'application/json', 422],
    ['not JSON', 'paper=fit', 'application/json', 400], ['form content type', '{}', 'application/x-www-form-urlencoded', 415],
    ['oversized body', JSON.stringify({ paper: 'fit', pad: 'x'.repeat(5000) }), 'application/json', 413],
]) {
    calls = [];
    r = await call(req('jobs', { method: 'POST', headers: { origin: O, 'content-type': type }, body: raw }));
    ok('create refused: ' + name, r.status === status && calls.length === 0);
}
reply = jsonReply({ id: '../x' }, 201);
r = await call(req('jobs', { method: 'POST', headers: { origin: O, 'content-type': 'application/json' }, body: '{}' }));
ok('create: an invalid upstream id is rejected', r.status === 502);

// --- Page upload
const photo = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
reply = jsonReply({ index: 3, width: 1200, height: 1600, word_count: 42, words: ['leak'] });
calls = [];
r = await call(req(`jobs/${ID}/pages/3`, { method: 'PUT', body: photo, headers: { origin: O, 'content-type': 'image/jpeg', 'x-ocr-options': '{"rotation":90,"filter":"bw","corners":[[0,0],[1,0],[1,1],[0,1]]}' } }));
ok('page: bytes and checked options are forwarded, only the summary comes back',
    r.status === 200 && JSON.stringify(await r.json()) === '{"index":3,"width":1200,"height":1600,"word_count":42}'
    && calls[0].url === `https://ocr.example.test/v1/jobs/${ID}/pages/3` && calls[0].init.body.byteLength === photo.byteLength
    && calls[0].init.headers.get('content-type') === 'application/octet-stream'
    && JSON.parse(calls[0].init.headers.get('x-ocr-options')).rotation === 90);
for (const [name, headers, data, status] of [
    ['HTML content type', { 'content-type': 'text/html' }, photo, 415], ['empty photo', { 'content-type': 'image/jpeg' }, new Uint8Array(), 422],
    ['bad rotation', { 'content-type': 'image/jpeg', 'x-ocr-options': '{"rotation":45}' }, photo, 422],
    ['corner outside the photo', { 'content-type': 'image/jpeg', 'x-ocr-options': '{"corners":[[0,0],[2,0],[1,1],[0,1]]}' }, photo, 422],
    ['unknown option', { 'content-type': 'image/jpeg', 'x-ocr-options': '{"url":"https://evil.example"}' }, photo, 422],
    ['declared length over the limit', { 'content-type': 'image/jpeg', 'content-length': String(21 * 1024 * 1024) }, photo, 413],
]) {
    calls = [];
    r = await call(req(`jobs/${ID}/pages/0`, { method: 'PUT', headers: { origin: O, ...headers }, body: data }));
    ok('page refused: ' + name, r.status === status && calls.length === 0);
}
// A body with no length that streams past 20 MiB is stopped while reading, before anything is sent upstream.
let pulled = 0, cancelledUpload = false;
const flood = new ReadableStream({
    // Ends at 30 MiB so a missing limit shows up as a failed check rather than a hang.
    pull(controller) { if (pulled >= 30 * 1024 * 1024) return controller.close(); pulled += 1024 * 1024; controller.enqueue(new Uint8Array(1024 * 1024)); },
    cancel() { cancelledUpload = true; },
});
calls = [];
r = await call(req(`jobs/${ID}/pages/0`, { method: 'PUT', headers: { origin: O, 'content-type': 'image/jpeg' }, body: flood }));
ok('page: an unbounded upload stream is cut at the limit and cancelled', r.status === 413 && calls.length === 0 && cancelledUpload && pulled <= 22 * 1024 * 1024);
reply = jsonReply({ index: 4, width: 1200, height: 1600, word_count: 1 });
r = await call(req(`jobs/${ID}/pages/3`, { method: 'PUT', body: photo, headers: { origin: O, 'content-type': 'image/jpeg' } }));
ok('page: a summary for another page is rejected', r.status === 502);

// --- Manifest
const manifestValue = { schema: 1, id: ID, paper: 'fit', nup: 1, dewarp: false, coordinate_space: 'final_image_top_left_pixels', debug: TOKEN,
    pages: [{ index: 0, width: 100, height: 50, path: '/tmp/x', words: [{ text: 'école', line: 0, bbox: [1, 2, 30, 20], polygon: [[1, 2], [30, 2], [30, 20], [1, 20]], conf: 0.9 }] }] };
reply = jsonReply(manifestValue);
r = await call(req(`jobs/${ID}/manifest`));
body = await text(r);
ok('manifest: only the documented fields pass, accents kept', r.status === 200 && !body.includes(TOKEN) && !body.includes('/tmp/x') && !body.includes('conf')
    && JSON.parse(body).pages[0].words[0].text === 'école');
reply = jsonReply({ ...manifestValue, pages: [{ ...manifestValue.pages[0], words: [{ ...manifestValue.pages[0].words[0], bbox: [1, 2, 300, 20] }] }] });
r = await call(req(`jobs/${ID}/manifest`));
ok('manifest: a word box outside the page is rejected', r.status === 502);
reply = jsonReply({ ...manifestValue, id: 'b'.repeat(32) });
r = await call(req(`jobs/${ID}/manifest`));
ok('manifest: another job\'s manifest is rejected', r.status === 502);

// --- PDF download
const pdfBytes = new TextEncoder().encode('%PDF-1.7\n' + 'x'.repeat(100) + '\n%%EOF');
reply = () => new Response(pdfBytes, { headers: { 'content-type': 'application/pdf', 'content-length': String(pdfBytes.byteLength) } });
r = await call(req(`jobs/${ID}/pdf`));
let got = new Uint8Array(await r.arrayBuffer());
ok('pdf: streamed byte for byte as an attachment', r.status === 200 && got.byteLength === pdfBytes.byteLength && got.every((b, i) => b === pdfBytes[i])
    && r.headers.get('content-type') === 'application/pdf' && /attachment/.test(r.headers.get('content-disposition')));
reply = () => new Response('<html>not a pdf</html>', { headers: { 'content-type': 'application/pdf' } });
r = await call(req(`jobs/${ID}/pdf`));
ok('pdf: a body that is not a PDF is rejected', r.status === 502);
reply = () => new Response(pdfBytes, { headers: { 'content-type': 'application/pdf', 'content-length': String(101 * 1024 * 1024) } });
r = await call(req(`jobs/${ID}/pdf`));
ok('pdf: a declared size over 100 MiB is rejected before streaming', r.status === 413);
let upstreamCancelled = false, served = 0;
reply = () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('%PDF-1.7\n')); },
    pull(controller) { if (served >= 120 * 1024 * 1024) return controller.close(); served += 4 * 1024 * 1024; controller.enqueue(new Uint8Array(4 * 1024 * 1024)); },
    cancel() { upstreamCancelled = true; },
}), { headers: { 'content-type': 'application/pdf' } });
r = await call(req(`jobs/${ID}/pdf`));
let streamFailed = false;
try { await r.arrayBuffer(); } catch (e) { streamFailed = true; }
ok('pdf: an undeclared stream past 100 MiB errors and the upstream is cancelled', r.status === 200 && streamFailed && upstreamCancelled && served <= 108 * 1024 * 1024);
reply = () => new Response(pdfBytes.slice(0, 50), { headers: { 'content-type': 'application/pdf', 'content-length': String(pdfBytes.byteLength) } });
r = await call(req(`jobs/${ID}/pdf`));
streamFailed = false;
try { await r.arrayBuffer(); } catch (e) { streamFailed = true; }
ok('pdf: a body shorter than its declared length errors', streamFailed);

// --- Delete
reply = () => new Response(null, { status: 204 });
calls = [];
r = await call(req(`jobs/${ID}`, { method: 'DELETE' }));
ok('delete maps to DELETE /v1/jobs/{id}', r.status === 204 && calls[0].init.method === 'DELETE' && calls[0].url === `https://ocr.example.test/v1/jobs/${ID}`);

// --- Deadlines and cancellation
let upstreamAborted = false;
reply = (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => { upstreamAborted = true; reject(init.signal.reason); }, { once: true }));
const started = Date.now();
r = await call(req('health'));
ok('health: a hanging tunnel times out after about 3 s and the upstream fetch is aborted',
    r.status === 502 && (await r.json()).error === 'timeout' && upstreamAborted && Date.now() - started < 6000);
upstreamAborted = false;
const user = new AbortController();
const pending = call(req(`jobs/${ID}/manifest`, { signal: user.signal }));
setTimeout(() => user.abort(), 50);
r = await pending;
ok('a browser cancel aborts the upstream request', upstreamAborted && r.status === 499);

if (failed) { console.log(`\n${failed} check(s) FAILED`); process.exit(1); }
console.log('\nAll OCR proxy checks passed');
