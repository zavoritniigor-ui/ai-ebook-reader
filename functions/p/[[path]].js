// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// Cloudflare Pages Function: /p/<host>/<path> — a reading proxy for exercise sites, so a word or sentence on them can be
// translated (owner, 2026-11-21: «проксі сервер на нашому домені … щоб переклад працював на сайті, який ми будемо
// відкривати через цей проксі сервер»).
//
// Safety rules (each one load-bearing):
// - NEVER on the app's own origins (PROXY_OFF_HOSTS): a proxied site's scripts would run next to the reader's books, AI
//   keys and sync code. It answers only on a separate host (a branch preview now, later its own subdomain).
// - Only the hosts in PROXY_HOSTS: not an open proxy. Everything else on the page loads directly in the browser.
// - An ordinary request with the app's honest User-Agent: no cookies are sent or kept, no browser disguise, nothing that
//   gets around a site's protection. A site that refuses the server simply stays unavailable here.
// - The site's own framing and CSP headers are dropped (the page is shown on our host), cookies are never set.
// HTML gets its links to allowed hosts and its root-relative links rewritten to /p/<host>/…, and two scripts of ours:
// proxy-assets/translate.js (select a word or a sentence → translation, 🔊) — injected first in <head>.
export const PROXY_HOSTS = new Set(['francaisfacile.rfi.fr', 's.francaisfacile.rfi.fr', 'fle-rfi.h5p.com']);
export const PROXY_OFF_HOSTS = new Set(['ai-ebook-reader.pages.dev', 'ai-ebook-reader.uk', 'www.ai-ebook-reader.uk']);
const UA = 'AI-Ebook-Reader/1.0 (reading proxy; +https://ai-ebook-reader.pages.dev)';
const DROP_HEADERS = ['content-security-policy', 'content-security-policy-report-only', 'x-frame-options', 'set-cookie', 'clear-site-data',
    'cross-origin-embedder-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy', 'content-length', 'content-encoding',
    'strict-transport-security', 'report-to', 'nel', 'permissions-policy', 'alt-svc'];
const PASS_REQUEST_HEADERS = ['accept', 'accept-language', 'content-type', 'range', 'if-none-match', 'if-modified-since'];

// An URL as the page wrote it → where the browser must ask for it on our host (unchanged when it is not ours to proxy).
export function proxiedUrl(raw, currentHost) {
    const v = String(raw || '').trim();
    if (!v || /^(#|data:|blob:|javascript:|mailto:|tel:|about:)/i.test(v)) return raw;
    if (v.startsWith('//')) return proxiedUrl('https:' + v, currentHost);
    if (v.startsWith('/')) return v.startsWith('/p/') ? v : `/p/${currentHost}${v}`;
    if (/^https?:\/\//i.test(v)) {
        try { const u = new URL(v); if (PROXY_HOSTS.has(u.host)) return `/p/${u.host}${u.pathname}${u.search}${u.hash}`; } catch (e) {}
    }
    return raw;   // relative paths resolve against /p/<host>/… by themselves; other sites load directly
}
const srcset = (value, host) => value.split(',').map(part => { const [u, ...d] = part.trim().split(/\s+/); return [proxiedUrl(u, host), ...d].join(' '); }).join(', ');

class AttrRewriter {
    constructor(host, attr) { this.host = host; this.attr = attr; }
    element(el) {
        const v = el.getAttribute(this.attr);
        if (v === null) return;
        const out = this.attr === 'srcset' ? srcset(v, this.host) : proxiedUrl(v, this.host);
        if (out !== v) el.setAttribute(this.attr, out);
    }
}
class HeadInjector {
    constructor(host) { this.host = host; }
    element(el) {
        // First in <head>, not deferred: it must wrap fetch / XMLHttpRequest before the site's own scripts run.
        el.prepend(`<script src="/proxy-assets/translate.js" data-host="${this.host}" data-hosts="${[...PROXY_HOSTS].join(' ')}"></script>`, { html: true });
    }
}

export async function onRequest({ request, params }) {
    const here = new URL(request.url);
    if (PROXY_OFF_HOSTS.has(here.hostname)) return new Response('Not here', { status: 404 });
    if (!['GET', 'HEAD', 'POST'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const parts = Array.isArray(params.path) ? params.path : String(params.path || '').split('/');
    const host = parts[0] || '';
    if (!PROXY_HOSTS.has(host)) return new Response('This site is not on the list', { status: 403 });
    const upstream = new URL(`https://${host}/${parts.slice(1).map(encodeURIComponent).join('/')}${here.search}`);
    if (here.pathname.endsWith('/') && !upstream.pathname.endsWith('/')) upstream.pathname += '/';

    const headers = new Headers({ 'user-agent': UA });
    for (const h of PASS_REQUEST_HEADERS) { const v = request.headers.get(h); if (v) headers.set(h, v); }
    // The page that asked, as the site would see it (embeds such as H5P check where they are shown).
    const ref = request.headers.get('referer');
    if (ref) { try { const r = new URL(ref); const m = r.pathname.match(/^\/p\/([^/]+)(\/.*)?$/); if (m && PROXY_HOSTS.has(m[1])) headers.set('referer', `https://${m[1]}${m[2] || '/'}${r.search}`); } catch (e) {} }
    let res;
    try {
        res = await fetch(upstream.href, { method: request.method, headers, body: request.method === 'POST' ? await request.arrayBuffer() : undefined, redirect: 'manual' });
    } catch (e) { return new Response('The site did not answer', { status: 502 }); }

    const out = new Headers(res.headers);
    for (const h of DROP_HEADERS) out.delete(h);
    out.set('x-robots-tag', 'noindex, nofollow');
    out.set('referrer-policy', 'same-origin');
    const loc = res.headers.get('location');
    if (loc) out.set('location', proxiedUrl(new URL(loc, upstream).href, host));
    const type = res.headers.get('content-type') || '';
    if (/text\/html/i.test(type) && request.method !== 'HEAD') {
        let rw = new HTMLRewriter().on('head', new HeadInjector(host));
        for (const [sel, attr] of [['a', 'href'], ['link', 'href'], ['script', 'src'], ['img', 'src'], ['img', 'srcset'], ['source', 'src'], ['source', 'srcset'],
            ['audio', 'src'], ['video', 'src'], ['video', 'poster'], ['iframe', 'src'], ['form', 'action'], ['track', 'src']]) rw = rw.on(`${sel}[${attr}]`, new AttrRewriter(host, attr));
        return rw.transform(new Response(res.body, { status: res.status, statusText: res.statusText, headers: out }));
    }
    if (/text\/css/i.test(type) && request.method !== 'HEAD') {
        const css = (await res.text()).replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => `url(${q}${proxiedUrl(u, host)}${q})`);
        return new Response(css, { status: res.status, headers: out });
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}
