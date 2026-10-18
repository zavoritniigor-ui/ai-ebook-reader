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
const env = { GROQ_API_KEY: ' gsk_TESTabcdefghijklmnopqrstuvwxyz\n', OPENAI_API_KEY: '' };
const ok = (name, cond) => { if (!cond) { console.log('FAIL', name); process.exit(1); } console.log('PASS', name); };
let r = await onRequestGet({ env }); ok('GET says which shared keys exist and whether they look right (no key values)', JSON.stringify(await r.json()) === '{"groq":true,"openai":false,"format":{"groq":true,"openai":false}}');
r = await onRequestGet({ env: { GROQ_API_KEY: 'sk-proj-abcdefghijklmnopqrstuvwxyz', OPENAI_API_KEY: 'sk-proj-abcdefghijklmnopqrstuvwxyz' } });
ok('an OpenAI key stored as GROQ_API_KEY is reported as the wrong format', JSON.stringify((await r.json()).format) === '{"groq":false,"openai":true}');
r = await onRequestPost({ request: req('?provider=groq', { model: 'openai/gpt-oss-120b', max_completion_tokens: 99999, messages: [], tools: [1] }), env });
ok('allowed request is forwarded with the server key (spaces/newline around it trimmed)', r.status === 200 && sent.url.includes('api.groq.com') && sent.opt.headers.authorization === 'Bearer gsk_TESTabcdefghijklmnopqrstuvwxyz');
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
// Groq's 429 names the limit that was hit and when to come back: that (and nothing else of its text) reaches the app.
const GROQ_429 = (kind, what, wait) => `{"error":{"message":"Rate limit reached for model \`openai/gpt-oss-120b\` in organization \`org_01secretaccount\` service tier \`on_demand\` on ${what} (${kind}): Limit 8000, Used 6905, Requested 1500. Please try again in ${wait}. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}`;
const limited = async (body, headers = {}, status = 429) => {
    globalThis.fetch = async () => new Response(body, { status, headers });
    const res = await onRequestPost({ request: req('?provider=groq', { model: 'openai/gpt-oss-120b' }, { origin: O, 'cf-connecting-ip': '8.8.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }), env });
    return { status: res.status, text: await res.text() };
};
let lim = await limited(GROQ_429('TPM', 'tokens per minute', '5.25s'), { 'retry-after': '2' });
let json = JSON.parse(lim.text);
ok('a 429 passes on WHICH limit, its numbers and the wait (the retry-after header wins over the text)', lim.status === 429 && json.error === 'upstream' && json.status === 429
    && JSON.stringify(json.rate) === '{"kind":"TPM","limit":8000,"used":6905,"requested":1500,"retryAfterSec":2}');
ok('... and nothing else of the provider text: no account name, no upgrade link', !lim.text.includes('org_01') && !lim.text.includes('console.groq.com') && !lim.text.includes('Rate limit reached'));
for (const [wait, seconds] of [['5.25s', 5.25], ['2m3.5s', 123.5], ['16m33.552s', 993.55], ['450ms', 0.45], ['1h2m3s', 3723], ['59s', 59]]) {
    lim = await limited(GROQ_429('RPD', 'requests per day', wait));
    ok(`the wait written as "${wait}" is ${seconds} s and the limit is the daily request one`, JSON.parse(lim.text).rate.retryAfterSec === seconds && JSON.parse(lim.text).rate.kind === 'RPD');
}
lim = await limited('quota exceeded', {}, 429);
ok('a 429 whose text cannot be read has no rate details, the status is still 429', lim.status === 429 && JSON.parse(lim.text).rate === undefined);
lim = await limited(GROQ_429('TPM', 'tokens per minute', '3s'), {}, 500);
ok('a 500 gets no rate details even if the text looks like a 429', lim.status === 502 && JSON.parse(lim.text).rate === undefined);
lim = await limited('{"error":{"message":"model not found"}}', {}, 404);
ok('a 404 keeps its status and shows no provider text', lim.status === 404 && !lim.text.includes('model not found'));
for (const model of ['openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'qwen/qwen3.8-27b']) {
    sent = null; globalThis.fetch = async (url, opt) => { sent = { url, opt, body: JSON.parse(opt.body) }; return new Response('{}'); };
    r = await onRequestPost({ request: req('?provider=groq', { model }, { origin: O, 'cf-connecting-ip': '7.7.7.7' }), env });
    ok(`${model} is allowed (Groq keeps a separate limit per model)`, r.status === 200 && sent.body.model === model);
}
sent = null; r = await onRequestPost({ request: req('?provider=groq', { model: 'qwen/qwen3.6-27b' }, { origin: O, 'cf-connecting-ip': '7.7.7.7' }), env });
ok('the retired qwen3.6 is no longer allowed', r.status === 400 && !sent);
for (const model of ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.6-luna']) {
    sent = null; globalThis.fetch = async (url, opt) => { sent = { url, opt, body: JSON.parse(opt.body) }; return new Response('{}'); };
    r = await onRequestPost({ request: req('?provider=openai', { model, max_output_tokens: 300 }, { origin: O, 'cf-connecting-ip': '6.6.6.6' }), env: { OPENAI_API_KEY: 'sk-proj-abcdefghijklmnopqrstuvwxyz' } });
    ok(`OpenAI ${model} is allowed`, r.status === 200 && sent.url.includes('api.openai.com') && sent.body.model === model && sent.body.store === false);
}
for (const model of ['gpt-5.5', 'gpt-4o', 'o3']) {
    sent = null; r = await onRequestPost({ request: req('?provider=openai', { model }, { origin: O, 'cf-connecting-ip': '6.6.6.6' }), env: { OPENAI_API_KEY: 'sk-proj-abcdefghijklmnopqrstuvwxyz' } });
    ok(`OpenAI ${model} is not allowed`, r.status === 400 && !sent);
}
const openaiErr = async (body, status) => {
    globalThis.fetch = async () => new Response(body, { status });
    const res = await onRequestPost({ request: req('?provider=openai', { model: 'gpt-5.4-mini' }, { origin: O, 'cf-connecting-ip': '5.5.5.' + Math.floor(Math.random() * 250) }), env: { OPENAI_API_KEY: 'sk-proj-abcdefghijklmnopqrstuvwxyz' } });
    return { status: res.status, text: await res.text() };
};
let oe = await openaiErr('{"error":{"message":"Unsupported value: \'reasoning.effort\' does not support \'none\' with this model. org-SECRET","type":"invalid_request_error","param":"reasoning.effort","code":"unsupported_value"}}', 400);
ok('an OpenAI 400 passes its machine code and parameter, not its text', oe.status === 400 && JSON.parse(oe.text).code === 'unsupported_value' && JSON.parse(oe.text).param === 'reasoning.effort' && !oe.text.includes('org-SECRET') && !oe.text.includes('Unsupported'));
oe = await openaiErr('{"error":{"message":"You exceeded your current quota, org-SECRET","type":"insufficient_quota","code":"insufficient_quota"}}', 429);
ok('an OpenAI quota refusal says insufficient_quota', oe.status === 429 && JSON.parse(oe.text).code === 'insufficient_quota' && !oe.text.includes('org-SECRET'));
oe = await openaiErr('{"error":{"message":"x","code":"Has Spaces <b>org-1</b>","param":"a b"}}', 400);
ok('a code or param that does not look like one is dropped', oe.status === 400 && JSON.parse(oe.text).code === undefined && JSON.parse(oe.text).param === undefined);
globalThis.fetch = async () => new Response('{}');
let last; for (let i = 0; i < 45; i++) last = await onRequestPost({ request: req('?provider=groq', { model: 'openai/gpt-oss-120b' }, { origin: O, 'cf-connecting-ip': '9.9.9.9' }), env });
ok('more than 40 requests a minute from one IP -> 429', last.status === 429);
console.log('ALL SHARED AI PROXY CHECKS PASSED');
