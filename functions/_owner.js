// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// Is this browser the app's owner? (owner, 2026-11-23: the app works for everyone as before; on the owner's devices the
// server's own limits are lifted.) Not a route: this module exports no onRequest handler, so Pages makes no URL of it.
// OWNER_KEY: the owner's password, a Cloudflare Pages secret (≥ 16 characters). Typed once per device in a hidden box of
// «Від розробника» (js/developer.js) → /api/owner sets the cookie below: an HMAC of the password, never the password
// itself; HttpOnly, so no page script can read it; a new password signs every device out. No OWNER_KEY → nobody is
// the owner, and everyone simply has the usual limits.
export const OWNER_COOKIE = 'reader_owner';
export const OWNER_COOKIE_MAX_AGE = 400 * 24 * 3600;   // the longest a browser keeps a cookie
const enc = new TextEncoder();

async function hmacHex(key, message) {
    const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
    return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function safeEqual(a, b) {
    a = String(a); b = String(b);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}
const ownerKey = env => { const k = String((env && env.OWNER_KEY) || '').trim(); return k.length >= 16 ? k : ''; };
export const ownerConfigured = env => !!ownerKey(env);
// The cookie's value: a signature made with the password, so the cookie never carries the password.
export async function ownerToken(env) { const k = ownerKey(env); return k ? hmacHex(k, 'ai-ebook-reader owner v1') : ''; }
// Is the typed password the right one? Both are signed first, so the comparison takes the same time whatever was typed.
export async function ownerKeyMatches(env, typed) {
    const k = ownerKey(env), given = String(typed || '').trim();
    if (!k || !given) return false;
    const [a, b] = await Promise.all([hmacHex(k, 'check'), hmacHex(given, 'check')]);
    return safeEqual(a, b);
}
function readCookie(request, name) {
    for (const part of (request.headers.get('cookie') || '').split(';')) {
        const i = part.indexOf('=');
        if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
    }
    return '';
}
export async function isOwner(request, env) {
    if (!request || !env) return false;
    const got = readCookie(request, OWNER_COOKIE);
    if (!got) return false;
    const want = await ownerToken(env);
    return !!want && safeEqual(got, want);
}
export const ownerCookieHeader = (value, maxAge = OWNER_COOKIE_MAX_AGE) =>
    `${OWNER_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
