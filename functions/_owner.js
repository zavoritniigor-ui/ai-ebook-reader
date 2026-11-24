// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// Who is the app's owner (owner, 2026-11-23: «Тільки я користуюся усіма функціями без ліміту»). The paid server
// functions — the shared AI key (api/ai.js), the voice (api/speech), the reading proxy (p/[[path]].js) — serve ONLY the
// owner, with no rate limit; everyone else gets the app without them (own AI key, the browser's voice, sites opened
// directly). Not a route: this module exports no onRequest handler, so Pages makes no URL of it.
// The owner is recognised by either of two Cloudflare Pages secrets:
//   OWNER_KEY  a long random password (≥ 16 characters). Typed once per browser on /api/owner, which sets the cookie
//              below: an HMAC of the key, never the key itself; HttpOnly, so no page script can read it; changing the
//              key signs every browser out.
//   OWNER_IPS  optional: addresses or ranges, comma separated («203.0.113.7, 2a02:1234:5678:9abc::/64»). Home and mobile
//              addresses change, so the key is the main way and this one an extra.
// Neither set → nobody is the owner, and those functions are closed to everyone (fail closed).
export const OWNER_COOKIE = 'reader_owner';
export const OWNER_COOKIE_MAX_AGE = 400 * 24 * 3600;   // the longest a browser keeps a cookie
const enc = new TextEncoder();

async function hmacHex(key, message) {
    const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
    return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function safeEqual(a, b) {
    a = String(a); b = String(b);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}
const ownerKey = env => { const k = String((env && env.OWNER_KEY) || '').trim(); return k.length >= 16 ? k : ''; };
export const ownerConfigured = env => !!ownerKey(env) || !!String((env && env.OWNER_IPS) || '').trim();
// The cookie's value: a signature made with the key, so the cookie never carries the key itself.
export async function ownerToken(env) { const k = ownerKey(env); return k ? hmacHex(k, 'ai-ebook-reader owner v1') : ''; }
// Is the typed password the key? Both are signed first, so the comparison takes the same time whatever was typed.
export async function ownerKeyMatches(env, typed) {
    const k = ownerKey(env), given = String(typed || '').trim();
    if (!k || !given) return false;
    const [a, b] = await Promise.all([hmacHex(k, 'check'), hmacHex(given, 'check')]);
    return safeEqual(a, b);
}

function parseIp(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s.includes(':')) {
        const halves = s.split('::');
        if (halves.length > 2) return null;
        const head = halves[0] ? halves[0].split(':') : [];
        const tail = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : null;
        let parts = head;
        if (tail) { const fill = 8 - head.length - tail.length; if (fill < 1) return null; parts = [...head, ...Array(fill).fill('0'), ...tail]; }
        if (parts.length !== 8 || !parts.every(p => /^[0-9a-f]{1,4}$/.test(p))) return null;
        return { bits: 128, n: parts.reduce((acc, p) => (acc << 16n) | BigInt(parseInt(p, 16)), 0n) };
    }
    const parts = s.split('.');
    if (parts.length !== 4 || !parts.every(p => /^\d{1,3}$/.test(p) && Number(p) < 256)) return null;
    return { bits: 32, n: parts.reduce((acc, p) => (acc << 8n) | BigInt(Number(p)), 0n) };
}
// Is the address in the list? Entries are single addresses or ranges («10.1.2.0/24», «2a02:1234::/48»).
export function ipInList(ip, list) {
    const a = parseIp(ip);
    if (!a) return false;
    for (const entry of String(list || '').split(/[\s,]+/)) {
        if (!entry) continue;
        const [addr, len] = entry.split('/');
        const b = parseIp(addr);
        if (!b || b.bits !== a.bits) continue;
        const prefix = len === undefined ? a.bits : Number(len);
        if (!Number.isInteger(prefix) || prefix < 0 || prefix > a.bits) continue;
        const shift = BigInt(a.bits - prefix);
        if ((a.n >> shift) === (b.n >> shift)) return true;
    }
    return false;
}
function readCookie(request, name) {
    for (const part of (request.headers.get('cookie') || '').split(';')) {
        const i = part.indexOf('=');
        if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
    }
    return '';
}
// cf-connecting-ip is set by Cloudflare's edge itself (a visitor's own value is replaced), so it can be trusted here.
export async function isOwner(request, env) {
    if (!request || !env) return false;
    if (ipInList(request.headers.get('cf-connecting-ip'), env.OWNER_IPS)) return true;
    const got = readCookie(request, OWNER_COOKIE);
    if (!got) return false;
    const want = await ownerToken(env);
    return !!want && safeEqual(got, want);
}
// On ai-ebook-reader.uk the cookie covers its subdomains too (web.ai-ebook-reader.uk: the reading proxy and its voice).
// A pages.dev address keeps it to itself: pages.dev is a shared domain, no cookie may cover it.
export function ownerCookieHeader(hostname, value, maxAge = OWNER_COOKIE_MAX_AGE) {
    const domain = hostname === 'ai-ebook-reader.uk' || hostname.endsWith('.ai-ebook-reader.uk') ? '; Domain=ai-ebook-reader.uk' : '';
    return `${OWNER_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax${domain}`;
}
