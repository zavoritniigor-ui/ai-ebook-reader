// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// TEMPORARY feasibility probe (branch only, not for main): does an exercise site answer a request from Cloudflare's
// servers at all? One ordinary GET with the app's honest User-Agent — no browser disguise, no retries. Fixed hosts only
// (not a proxy): the answer is the status and a few headers, never the page.
const HOSTS = new Set(['francaisfacile.rfi.fr']);
const UA = 'AI-Ebook-Reader/1.0 (+https://ai-ebook-reader.pages.dev)';
export async function onRequest({ request }) {
    const host = new URL(request.url).searchParams.get('host') || '';
    if (!HOSTS.has(host)) return new Response(JSON.stringify({ error: 'host not allowed' }), { status: 400, headers: { 'content-type': 'application/json' } });
    let out;
    try {
        const r = await fetch(`https://${host}${new URL(request.url).searchParams.get('path') || '/fr/'}`, { headers: { 'user-agent': UA }, redirect: 'manual' });
        const body = await r.text();
        const pick = ['content-type', 'server', 'location', 'x-frame-options', 'content-security-policy', 'set-cookie', 'cf-ray', 'akamai-grn'];
        out = { host, status: r.status, headers: Object.fromEntries(pick.filter(h => r.headers.get(h)).map(h => [h, r.headers.get(h).slice(0, 300)])),
            bytes: body.length, hosts: [...new Set([...body.matchAll(/(?:src|href|action)=["'](https?:)?\/\/([^\/"']+)/g)].map(m => m[2]))].slice(0, 40), scripts: [...body.matchAll(/<script[^>]*src=["']([^"']+)/g)].map(m => m[1]).slice(0, 30), sample: [...body.matchAll(/href=["'](\/fr\/[^"']+)/g)].map(m => m[1]).filter(u => /exerc|quiz|test|apprendre/i.test(u)).slice(0, 15), title: (body.match(/<title[^>]*>([^<]{0,200})/i) || [])[1] || '', denied: /Access denied/i.test(body) };
    } catch (e) { out = { host, error: String(e).slice(0, 300) }; }
    return new Response(JSON.stringify(out, null, 1), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
