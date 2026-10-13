// Unit test of the shared-AI-key proxy (functions/api/ai.js) with the provider mocked: forwards only the app's own requests,
// adds the server key, caps the reply budget, never returns key or provider account details. Run: node tests/shared_ai_proxy_test.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Copied to .mjs so any Node version loads it as an ES module (the Pages Function is a plain .js file).
const copy = join(mkdtempSync(join(tmpdir(), 'ai-proxy-')), 'ai.mjs');
writeFileSync(copy, readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'functions', 'api', 'ai.js')));
const { onRequestGet, onRequestPost } = await import(pathToFileURL(copy).href);
let sent = null;
globalThis.fetch = async (url, opt) => { sent = { url, opt, body: JSON.parse(opt.body) }; return new Response(JSON.stringify({ ok: 1 }), { headers: { 'content-type': 'application/json' } }); };
const O = 'https://ai-ebook-reader.pages.dev';
const req = (q, body, h = { origin: O }) => new Request(O + '/api/ai' + q, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, h), body: typeof body === 'string' ? body : JSON.stringify(body) });
const env = { GROQ_API_KEY: 'gsk_TEST', OPENAI_API_KEY: '' };
const ok = (name, cond) => { if (!cond) { console.log('FAIL', name); process.exit(1); } console.log('PASS', name); };
let r = await onRequestGet({ env }); ok('GET says which shared keys exist (no key values)', JSON.stringify(await r.json()) === '{"groq":true,"openai":false}');
r = await onRequestPost({ request: req('?provider=groq', { model: 'openai/gpt-oss-120b', max_completion_tokens: 99999, messages: [], tools: [1] }), env });
ok('allowed request is forwarded with the server key', r.status === 200 && sent.url.includes('api.groq.com') && sent.opt.headers.authorization === 'Bearer gsk_TEST');
ok('reply budget is capped, tools dropped', sent.body.max_completion_tokens === 16000 && !('tools' in sent.body));
ok('reply body is passed through', JSON.stringify(await r.json()) === '{"ok":1}');
sent = null;
r = await onRequestPost({ request: req('?provider=openai', { model: 'gpt-5.6-luna' }), env }); ok('provider without a shared key -> 503, nothing sent', r.status === 503 && !sent);
r = await onRequestPost({ request: req('?provider=groq', { model: 'llama-huge' }), env }); ok('other models refused', r.status === 400 && !sent);
r = await onRequestPost({ request: req('?provider=groq', { model: 'openai/gpt-oss-120b' }, { origin: 'https://evil.example' }), env }); ok('foreign Origin refused', r.status === 403 && !sent);
r = await onRequestPost({ request: req('?provider=groq', { model: 'openai/gpt-oss-120b' }, {}), env }); ok('no Origin/Referer refused', r.status === 403 && !sent);
r = await onRequestPost({ request: req('?provider=groq', { model: 'openai/gpt-oss-120b' }, { referer: O + '/index.html' }), env }); ok('same-site Referer accepted', r.status === 200);
r = await onRequestPost({ request: req('?provider=x', {}), env }); ok('unknown provider refused', r.status === 400);
r = await onRequestPost({ request: req('?provider=groq', 'not json'), env }); ok('bad JSON refused', r.status === 400);
globalThis.fetch = async () => new Response('{"error":{"message":"account org-123 quota"}}', { status: 401 });
r = await onRequestPost({ request: req('?provider=groq', { model: 'openai/gpt-oss-120b' }), env }); const t = await r.text(); ok('provider error: status only, no account details', r.status === 401 && !t.includes('org-123'));
globalThis.fetch = async () => new Response('{}');
let last; for (let i = 0; i < 45; i++) last = await onRequestPost({ request: req('?provider=groq', { model: 'openai/gpt-oss-120b' }, { origin: O, 'cf-connecting-ip': '9.9.9.9' }), env });
ok('more than 40 requests a minute from one IP -> 429', last.status === 429);
console.log('ALL SHARED AI PROXY CHECKS PASSED');
