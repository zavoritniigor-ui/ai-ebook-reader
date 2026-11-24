// Unit test of the owner's hidden sign-in: functions/_owner.js (who is the owner) and functions/api/owner.js (signing a
// device in and out). Run: node tests/owner_gate_test.mjs
import { loadFunction, OWNER_KEY, ownerCookie } from './functions_loader.mjs';

const ok = (name, cond, extra = '') => { if (!cond) { console.error('FAIL', name, extra); process.exit(1); } console.log('PASS', name); };
const gate = await loadFunction('_owner.js');
const env = { OWNER_KEY };
const OWNER = await ownerCookie();
const O = 'https://ai-ebook-reader.uk';

// ---- who is the owner
const req = (headers = {}) => new Request(O + '/api/ai', { headers });
ok('the cookie from /api/owner is the owner', await gate.isOwner(req({ cookie: 'a=1; ' + OWNER + '; b=2' }), env));
ok('no cookie: not the owner', !(await gate.isOwner(req(), env)));
ok('the password itself as a cookie is not the owner (the cookie carries a signature)', !(await gate.isOwner(req({ cookie: 'reader_owner=' + OWNER_KEY }), env)));
ok('the cookie never holds the password', !OWNER.includes(OWNER_KEY));
ok('a short OWNER_KEY (< 16 characters) is not used at all', !gate.ownerConfigured({ OWNER_KEY: 'short' }) && !(await gate.ownerToken({ OWNER_KEY: 'short' })));
ok('no OWNER_KEY: nobody is the owner, whatever the cookie', !(await gate.isOwner(req({ cookie: OWNER }), {})));
ok('a new OWNER_KEY signs every device out', !(await gate.isOwner(req({ cookie: OWNER }), { OWNER_KEY: 'another-password-0123456789' })));
const c = gate.ownerCookieHeader('v');
ok('the cookie: HttpOnly, Secure, SameSite=Strict, 400 days', /HttpOnly/.test(c) && /Secure/.test(c) && /SameSite=Strict/.test(c) && /Max-Age=34560000/.test(c), c);

// ---- /api/owner
const api = await loadFunction('api/owner.js');
const post = (body, headers = { origin: O }, e = env) => api.onRequestPost({ request: new Request(O + '/api/owner', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }), env: e });
let r = await api.onRequestGet({ request: req(), env });
ok('GET: not the owner yet, a password is set on the site', JSON.stringify(await r.json()) === '{"owner":false,"configured":true}');
r = await api.onRequestGet({ request: req({ cookie: OWNER }), env });
ok('GET with the cookie: the owner', (await r.json()).owner === true);
r = await post({ action: 'login', key: OWNER_KEY });
ok('the right password: the owner\'s cookie', r.status === 200 && (await r.json()).owner === true && r.headers.get('set-cookie').startsWith(OWNER + ';'));
r = await post({ action: 'login', key: '  ' + OWNER_KEY + '\n' });
ok('spaces around a pasted password do not matter', r.status === 200);
r = await post({ action: 'login', key: OWNER_KEY + 'x' });
ok('a wrong password: 403, no cookie', r.status === 403 && !r.headers.has('set-cookie'));
r = await post({ action: 'login', key: OWNER_KEY }, { origin: 'https://evil.example' });
ok('from another site\'s page: refused', r.status === 403 && !r.headers.has('set-cookie'));
r = await post({ action: 'login', key: OWNER_KEY }, {});
ok('without Origin (a script, not the app): refused', r.status === 403 && !r.headers.has('set-cookie'));
r = await post({ action: 'login', key: OWNER_KEY }, { origin: O }, {});
ok('no OWNER_KEY on the site: says so, no cookie', r.status === 503 && (await r.json()).configured === false && !r.headers.has('set-cookie'));
r = await post({ action: 'logout' });
ok('sign out removes the cookie', r.status === 200 && /reader_owner=;.*Max-Age=0/.test(r.headers.get('set-cookie')));
r = await post({ action: 'other' });
ok('an unknown action: 400', r.status === 400);
console.log('ALL OWNER GATE CHECKS PASSED');
