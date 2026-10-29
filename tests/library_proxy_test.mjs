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
console.log('ALL PASS library_proxy_test');
