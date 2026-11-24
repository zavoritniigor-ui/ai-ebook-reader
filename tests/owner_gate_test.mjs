// Unit test of the owner gate (functions/_owner.js), the owner's sign-in page (functions/api/owner.js) and the reading
// proxy host's root (functions/index.js). Run: node tests/owner_gate_test.mjs
import { loadFunction, OWNER_KEY, ownerCookie } from './functions_loader.mjs';

const ok = (name, cond, extra = '') => { if (!cond) { console.error('FAIL', name, extra); process.exit(1); } console.log('PASS', name); };
const gate = await loadFunction('_owner.js');
const env = { OWNER_KEY };
const OWNER = await ownerCookie();

// ---- addresses (OWNER_IPS)
const list = '198.51.100.7, 10.1.2.0/24 2a02:1234:5678:9abc::/64,::1';
for (const [ip, want] of [['198.51.100.7', true], ['198.51.100.8', false], ['10.1.2.255', true], ['10.1.3.1', false],
    ['2a02:1234:5678:9abc:1:2:3:4', true], ['2A02:1234:5678:9ABC::99', true], ['2a02:1234:5678:9abd::1', false], ['::1', true],
    ['', false], ['not-an-ip', false], ['1.2.3.4.5', false], ['300.1.1.1', false], ['1::2::3', false]]) {
    ok(`OWNER_IPS: ${ip || '(empty)'} → ${want}`, gate.ipInList(ip, list) === want);
}
ok('an IPv4 address never matches an IPv6 range and back', !gate.ipInList('10.1.2.3', '::/0') && !gate.ipInList('::1', '0.0.0.0/0'));
ok('a broken range is skipped, not treated as «everyone»', !gate.ipInList('8.8.8.8', '8.8.8.8/33, 8.8.8.0/x'));

// ---- who is the owner
const req = (headers = {}) => new Request('https://ai-ebook-reader.uk/api/ai', { headers });
ok('the cookie from /api/owner is the owner', await gate.isOwner(req({ cookie: 'a=1; ' + OWNER + '; b=2' }), env));
ok('no cookie: not the owner', !(await gate.isOwner(req(), env)));
ok('the key itself as a cookie is not the owner (the cookie carries a signature, not the key)', !(await gate.isOwner(req({ cookie: 'reader_owner=' + OWNER_KEY }), env)));
ok('an address from OWNER_IPS is the owner', await gate.isOwner(req({ 'cf-connecting-ip': '198.51.100.7' }), { OWNER_IPS: list }));
ok('a short OWNER_KEY (< 16 characters) is not accepted at all', !gate.ownerConfigured({ OWNER_KEY: 'short' }) && !(await gate.isOwner(req({ cookie: 'reader_owner=' + await gate.ownerToken({ OWNER_KEY: 'short' }) }), { OWNER_KEY: 'short' })));
ok('nothing configured: nobody, with any cookie or address', !(await gate.isOwner(req({ cookie: OWNER, 'cf-connecting-ip': '198.51.100.7' }), {})));
ok('the cookie never holds the key', !OWNER.includes(OWNER_KEY));
const c = gate.ownerCookieHeader('ai-ebook-reader.uk', 'v');
ok('on ai-ebook-reader.uk the cookie covers web.ai-ebook-reader.uk too; HttpOnly, Secure, SameSite=Lax, 400 days',
    /Domain=ai-ebook-reader\.uk/.test(c) && /HttpOnly/.test(c) && /Secure/.test(c) && /SameSite=Lax/.test(c) && /Max-Age=34560000/.test(c), c);
ok('on pages.dev (a shared domain) the cookie stays on its own host', !/Domain=/.test(gate.ownerCookieHeader('ai-ebook-reader.pages.dev', 'v')));

// ---- the sign-in page
const page = await loadFunction('api/owner.js');
const form = (fields, host = 'ai-ebook-reader.uk', headers = {}) => page.onRequestPost({ request: new Request(`https://${host}/api/owner`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams(fields).toString() }), env });
let r = await page.onRequestGet({ request: new Request('https://ai-ebook-reader.uk/api/owner'), env });
let html = await r.text();
ok('GET: a password field, posted by a form (the key never goes in an address)', r.status === 200 && html.includes('type="password"') && html.includes('method="post"') && !html.includes('<script'));
ok('... with its own strict CSP and no caching', /default-src 'none'/.test(r.headers.get('content-security-policy')) && r.headers.get('cache-control') === 'no-store');
r = await form({ action: 'login', key: OWNER_KEY });
ok('the right key: the owner\'s cookie and back to the app', r.status === 303 && r.headers.get('location') === '/' && r.headers.get('set-cookie').startsWith(OWNER + ';'));
r = await form({ action: 'login', key: ' ' + OWNER_KEY + '\n' });
ok('spaces around a pasted key do not matter', r.status === 303);
r = await form({ action: 'login', key: OWNER_KEY + 'x' });
ok('a wrong key: no cookie', r.status === 403 && !r.headers.has('set-cookie'));
r = await form({ action: 'login', key: OWNER_KEY }, 'ai-ebook-reader.uk', { origin: 'https://evil.example' });
ok('a form posted from another site is refused', r.status === 403 && !r.headers.has('set-cookie'));
r = await form({ action: 'logout' });
ok('sign out removes the cookie', r.status === 303 && /reader_owner=;.*Max-Age=0/.test(r.headers.get('set-cookie')));
r = await page.onRequestGet({ request: new Request('https://ai-ebook-reader.uk/api/owner', { headers: { cookie: OWNER } }), env });
html = await r.text();
ok('GET as the owner: says so and offers to sign out', html.includes('✅') && html.includes('value="logout"'));
r = await page.onRequestGet({ request: new Request('https://ai-ebook-reader.uk/api/owner'), env: {} });
ok('no OWNER_KEY yet: says what to set, no form', (await r.text()).includes('OWNER_KEY'));
r = await page.onRequestGet({ request: new Request('https://copy.example/api/owner'), env });
ok('not on a copied site', r.status === 404);

// ---- the reading proxy's host does not show the app
const root = await loadFunction('index.js');
let nexted = 0;
const next = () => { nexted++; return new Response('the app'); };
r = await root.onRequest({ request: new Request('https://web.ai-ebook-reader.uk/'), next });
ok('web.ai-ebook-reader.uk/ goes to the app\'s own address (its data never sits next to proxied sites\' scripts)', r.status === 302 && r.headers.get('location') === 'https://ai-ebook-reader.uk/' && nexted === 0);
for (const host of ['ai-ebook-reader.uk', 'ai-ebook-reader.pages.dev', 'dev.ai-ebook-reader.pages.dev', 'localhost']) {
    nexted = 0; r = await root.onRequest({ request: new Request(`https://${host}/`), next });
    ok(`${host}/ shows the app unchanged`, nexted === 1 && (await r.text()) === 'the app');
}
console.log('ALL OWNER GATE CHECKS PASSED');
