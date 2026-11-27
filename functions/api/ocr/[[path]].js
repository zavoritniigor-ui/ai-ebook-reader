// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// Fixed-route proxy to the owner's loopback OCR service. Browser credentials and
// upstream error bodies are never forwarded. OCR_TOKEN lives only in Pages secrets.
const IMAGE_LIMIT = 20 * 1024 * 1024, PDF_LIMIT = 100 * 1024 * 1024;
const MANIFEST_LIMIT = 16 * 1024 * 1024, JSON_LIMIT = 64 * 1024;
const ID = /^[0-9a-f]{32}$/;
const COMMON = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

class ProxyFault extends Error {
    constructor(status, code) { super(code); this.status = status; this.code = code; }
}
const fault = (status, code) => { throw new ProxyFault(status, code); };
function json(value, status = 200, headers = {}) {
    return new Response(JSON.stringify(value), { status, headers: { ...COMMON, 'content-type': 'application/json; charset=utf-8', ...headers } });
}
function stop(body) { try { body?.cancel().catch(() => {}); } catch (e) {} }
function local(url) { return url.hostname === 'localhost' || url.hostname === '127.0.0.1'; }
function sameOrigin(request, url) {
    const own = ['ai-ebook-reader.uk', 'ai-ebook-reader.pages.dev'].includes(url.hostname)
        || /^[a-z0-9-]+\.ai-ebook-reader\.pages\.dev$/.test(url.hostname);
    if (!(local(url) && ['http:', 'https:'].includes(url.protocol)) && !(own && url.protocol === 'https:' && !url.port)) return false;
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin') return false;
    const origin = request.headers.get('origin'), referer = request.headers.get('referer');
    if (!origin && !referer) return false;
    try {
        if (origin) {
            const parsed = new URL(origin);
            if (origin !== parsed.origin || parsed.origin !== url.origin) return false;
        }
        if (referer) {
            const parsed = new URL(referer);
            if (parsed.username || parsed.password || parsed.origin !== url.origin) return false;
        }
    } catch (e) { return false; }
    return true;
}
function route(url, method) {
    if (url.search || url.hash) fault(400, 'invalid-request');
    const path = url.pathname.replace(/^\/api\/ocr\//, '');
    let allowed, target, kind, index, id;
    if (path === 'health') { allowed = 'GET'; target = '/health'; kind = 'health'; }
    else if (path === 'jobs') { allowed = 'POST'; target = '/v1/jobs'; kind = 'create'; }
    else {
        const match = path.match(/^jobs\/([0-9a-f]{32})(?:\/(pages\/(?:[0-9]|1[0-9])|pdf|manifest))?$/);
        if (!match) fault(404, 'not-found');
        id = match[1];
        if (!match[2]) { allowed = 'DELETE'; kind = 'delete'; }
        else if (match[2] === 'pdf' || match[2] === 'manifest') { allowed = 'GET'; kind = match[2]; }
        else { allowed = 'PUT'; kind = 'page'; index = Number(match[2].split('/')[1]); }
        target = '/v1/' + path;
    }
    if (!url.pathname.startsWith('/api/ocr/')) fault(404, 'not-found');
    if (method !== allowed) fault(405, 'method-not-allowed');
    return { target, kind, index, id };
}
function configuration(env, requestURL) {
    if (!env?.OCR_TUNNEL_URL || !env?.OCR_TOKEN) fault(503, 'not-configured');
    if (typeof env.OCR_TUNNEL_URL !== 'string' || typeof env.OCR_TOKEN !== 'string') fault(502, 'configuration');
    const token = env.OCR_TOKEN.trim(), raw = env.OCR_TUNNEL_URL.trim();
    if (!raw || !token) fault(503, 'not-configured');
    let base;
    try { base = new URL(raw); } catch (e) { fault(502, 'configuration'); }
    const development = local(requestURL) && base.protocol === 'http:' && base.hostname === '127.0.0.1';
    if ((!development && base.protocol !== 'https:') || base.username || base.password || base.search || base.hash
        || !/^[A-Za-z0-9._~+/=-]{1,512}$/.test(token)) fault(502, 'configuration');
    return { base: base.href.replace(/\/+$/, ''), token };
}
function trustedIP(request) {
    // Incoming request.cf is supplied by the Cloudflare runtime, never a browser header.
    if (!request.cf || !Number.isInteger(request.cf.asn) || request.cf.asn <= 0) return null;
    const value = request.headers.get('cf-connecting-ip') || '';
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every(x => Number(x) <= 255)) return value;
    if (value.length <= 45 && /^[0-9a-f:.]+$/i.test(value) && value.includes(':')) {
        try { return new URL('http://[' + value + ']/').hostname.slice(1, -1); } catch (e) {}
    }
    return null;
}
function length(headers, limit, status = 502) {
    const value = headers.get('content-length');
    if (value === null) return null;
    if (!/^\d{1,12}$/.test(value)) fault(status, 'invalid-length');
    const size = Number(value);
    if (size > limit) fault(413, 'too-large');
    return size;
}
function deadline(request, milliseconds) {
    const controller = new AbortController();
    const abort = () => controller.abort(new ProxyFault(499, 'cancelled'));
    const timer = setTimeout(() => controller.abort(new ProxyFault(502, 'timeout')), milliseconds);
    request.signal.addEventListener('abort', abort, { once: true });
    if (request.signal.aborted) abort();
    return { signal: controller.signal, abort, finish() { clearTimeout(timer); request.signal.removeEventListener('abort', abort); } };
}
async function guarded(promise, signal) {
    if (signal.aborted) throw signal.reason;
    let rejectAbort;
    const aborted = new Promise((_, reject) => { rejectAbort = () => reject(signal.reason); signal.addEventListener('abort', rejectAbort, { once: true }); });
    try { return await Promise.race([promise, aborted]); }
    finally { signal.removeEventListener('abort', rejectAbort); }
}
async function bounded(body, limit, signal) {
    if (!body) return new Uint8Array();
    const reader = body.getReader(), chunks = [];
    let size = 0, complete = false;
    try {
        while (true) {
            const { done, value } = await guarded(reader.read(), signal);
            if (done) { complete = true; break; }
            if (!(value instanceof Uint8Array)) fault(502, 'upstream');
            size += value.byteLength;
            if (size > limit) fault(413, 'too-large');
            chunks.push(value);
        }
        const joined = new Uint8Array(size);
        let at = 0;
        for (const chunk of chunks) { joined.set(chunk, at); at += chunk.byteLength; }
        return joined;
    } finally {
        if (!complete) { try { reader.cancel().catch(() => {}); } catch (e) {} }
        try { reader.releaseLock(); } catch (e) {}
    }
}
function parseJSON(bytes, status) {
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch (e) { fault(status, status === 400 ? 'invalid-request' : 'upstream'); }
}
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function documentOptions(value) {
    if (!object(value) || Object.keys(value).some(k => !['paper', 'nup', 'dewarp'].includes(k))) fault(422, 'invalid-request');
    const { paper = 'fit', nup = 1, dewarp = false } = value;
    if (!['fit', 'a4', 'letter'].includes(paper) || ![1, 2, 4, 6, 9].includes(nup) || typeof dewarp !== 'boolean'
        || (paper === 'fit' && nup !== 1)) fault(422, 'invalid-request');
    return { paper, nup, dewarp };
}
function pageOptions(raw) {
    if (raw.length > 2048) fault(413, 'too-large');
    let value;
    try { value = JSON.parse(raw); } catch (e) { fault(422, 'invalid-request'); }
    if (!object(value) || Object.keys(value).some(k => !['corners', 'rotation', 'filter'].includes(k))) fault(422, 'invalid-request');
    if (value.rotation !== undefined && ![0, 90, 180, 270].includes(value.rotation)) fault(422, 'invalid-request');
    if (value.filter !== undefined && !['orig', 'doc', 'bw', 'gray'].includes(value.filter)) fault(422, 'invalid-request');
    if (value.corners !== undefined && (!Array.isArray(value.corners) || value.corners.length !== 4
        || value.corners.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !Number.isFinite(n) || n < 0 || n > 1)))) fault(422, 'invalid-request');
    return JSON.stringify(value);
}
function pageSummary(value, index) {
    if (!object(value) || value.index !== index || !Number.isInteger(value.width) || value.width < 1 || value.width > 4000
        || !Number.isInteger(value.height) || value.height < 1 || value.height > 4000
        || !Number.isInteger(value.word_count) || value.word_count < 0 || value.word_count > 100000) fault(502, 'upstream');
    return { index, width: value.width, height: value.height, word_count: value.word_count };
}
function manifest(value, id) {
    if (!object(value) || value.schema !== 1 || value.id !== id || value.coordinate_space !== 'final_image_top_left_pixels'
        || !Array.isArray(value.pages) || value.pages.length > 20) fault(502, 'upstream');
    let options;
    try { options = documentOptions({ paper: value.paper, nup: value.nup, dewarp: value.dewarp }); }
    catch (e) { fault(502, 'upstream'); }
    const pages = value.pages.map((page, index) => {
        if (!object(page) || !Array.isArray(page.words)) fault(502, 'upstream');
        pageSummary({ ...page, word_count: page.words.length }, index);
        const words = page.words.map(word => {
            const point = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && p[0] >= 0 && p[0] <= page.width && p[1] >= 0 && p[1] <= page.height;
            if (!object(word) || typeof word.text !== 'string' || !word.text || word.text.length > 4096
                || !Number.isInteger(word.line) || word.line < 0 || word.line > 100000
                || !Array.isArray(word.bbox) || word.bbox.length !== 4 || !point(word.bbox.slice(0, 2)) || !point(word.bbox.slice(2))
                || word.bbox[2] <= word.bbox[0] || word.bbox[3] <= word.bbox[1]
                || !Array.isArray(word.polygon) || word.polygon.length !== 4 || !word.polygon.every(point)) fault(502, 'upstream');
            return { text: word.text, line: word.line, bbox: word.bbox, polygon: word.polygon };
        });
        return { index, width: page.width, height: page.height, words };
    });
    return { schema: 1, id, ...options, coordinate_space: 'final_image_top_left_pixels', pages };
}
async function pdfResponse(upstream, clock) {
    const expected = length(upstream.headers, PDF_LIMIT);
    if (!upstream.body) fault(502, 'upstream');
    const reader = upstream.body.getReader(), initial = [];
    let size = 0, closed = false, streamController;
    function finish() {
        if (closed) return;
        closed = true;
        clock.signal.removeEventListener('abort', interrupted);
        try { reader.cancel().catch(() => {}); } catch (e) {}
        try { reader.releaseLock(); } catch (e) {}
        clock.finish();
    }
    function interrupted() { if (!closed) { streamController?.error(new Error('OCR PDF interrupted')); finish(); } }
    async function next() {
        const part = await guarded(reader.read(), clock.signal);
        if (!part.done) {
            if (!(part.value instanceof Uint8Array)) fault(502, 'upstream');
            size += part.value.byteLength;
            if (size > PDF_LIMIT) fault(413, 'too-large');
            if (expected !== null && size > expected) fault(502, 'upstream');
        } else if (expected !== null && size !== expected) fault(502, 'upstream');
        return part;
    }
    try {
        while (size < 5) {
            const part = await next();
            if (part.done) fault(502, 'upstream');
            initial.push(part.value);
        }
        const prefix = initial.flatMap(chunk => [...chunk.subarray(0, 5)]).slice(0, 5);
        if (String.fromCharCode(...prefix) !== '%PDF-') fault(502, 'upstream');
    } catch (e) { finish(); throw e; }
    const body = new ReadableStream({
        start(controller) {
            streamController = controller;
            clock.signal.addEventListener('abort', interrupted, { once: true });
            if (clock.signal.aborted) interrupted();
        },
        async pull(controller) {
            if (closed) return;
            try {
                if (initial.length) { controller.enqueue(initial.shift()); return; }
                const part = await next();
                if (closed) return;
                if (part.done) { controller.close(); finish(); }
                else controller.enqueue(part.value);
            } catch (e) { if (!closed) { controller.error(new Error('OCR PDF interrupted')); finish(); } }
        },
        cancel() { clock.abort(); finish(); },
    }, { highWaterMark: 0 });
    const headers = { ...COMMON, 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="scan.pdf"' };
    if (expected !== null) headers['content-length'] = String(expected);
    return new Response(body, { headers });
}

export async function onRequest({ request, env }) {
    let clock, upstream, streaming = false;
    try {
        const url = new URL(request.url);
        if (!sameOrigin(request, url)) fault(403, 'forbidden');
        const selected = route(url, request.method), config = configuration(env, url);
        const headers = new Headers({ authorization: 'Bearer ' + config.token, accept: selected.kind === 'pdf' ? 'application/pdf' : 'application/json' });
        const ip = trustedIP(request);
        if (ip) headers.set('X-Client-IP', ip);
        let body;
        clock = deadline(request, selected.kind === 'health' ? 3000 : 120000);
        if (selected.kind === 'page') {
            const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
            if (!['application/octet-stream', 'image/jpeg', 'image/png', 'image/webp'].includes(type)) fault(415, 'invalid-type');
            length(request.headers, IMAGE_LIMIT, 400);
            headers.set('X-OCR-Options', pageOptions(request.headers.get('x-ocr-options') || '{}'));
            headers.set('content-type', 'application/octet-stream');
            body = await bounded(request.body, IMAGE_LIMIT, clock.signal);
            if (!body.byteLength) fault(422, 'invalid-request');
        } else if (selected.kind === 'create') {
            if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) fault(415, 'invalid-type');
            length(request.headers, 4096, 400);
            body = JSON.stringify(documentOptions(parseJSON(await bounded(request.body, 4096, clock.signal), 400)));
            headers.set('content-type', 'application/json');
        } else if (request.body) fault(400, 'invalid-request');
        upstream = await guarded(fetch(config.base + selected.target, { method: request.method, headers, body,
            redirect: 'manual', signal: clock.signal }), clock.signal);
        const wanted = selected.kind === 'create' ? 201 : selected.kind === 'delete' ? 204 : 200;
        if (upstream.status !== wanted || upstream.redirected) {
            const codes = { 404: 'not-found', 409: 'conflict', 413: 'too-large', 422: 'invalid-request', 429: 'busy' };
            if (upstream.status === 429) {
                const raw = upstream.headers.get('retry-after') || '';
                const retry = /^\d{1,4}$/.test(raw) ? Math.max(1, Math.min(120, Number(raw))) : 2;
                return json({ error: 'busy' }, 429, { 'retry-after': String(retry) });
            }
            fault(codes[upstream.status] ? upstream.status : 502, codes[upstream.status] || 'offline');
        }
        if (selected.kind === 'delete') return new Response(null, { status: 204, headers: COMMON });
        const contentType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (contentType !== (selected.kind === 'pdf' ? 'application/pdf' : 'application/json')) fault(502, 'upstream');
        if (selected.kind === 'pdf') {
            const response = await pdfResponse(upstream, clock);
            streaming = true;
            return response;
        }
        const maximum = selected.kind === 'manifest' ? MANIFEST_LIMIT : JSON_LIMIT;
        length(upstream.headers, maximum);
        const value = parseJSON(await bounded(upstream.body, maximum, clock.signal), 502);
        if (selected.kind === 'manifest') return json(manifest(value, selected.id));
        if (selected.kind === 'page') return json(pageSummary(value, selected.index));
        if (selected.kind === 'create') {
            if (!object(value) || !ID.test(value.id)) fault(502, 'upstream');
            return json({ id: value.id }, 201);
        }
        if (!object(value) || !['cold', 'ready'].includes(value.status) || typeof value.model_loaded !== 'boolean'
            || !/^(?:gpu:\d{1,2}|cpu)$/.test(value.configured_device)) fault(502, 'upstream');
        return json({ status: value.status, configured_device: value.configured_device, model_loaded: value.model_loaded });
    } catch (error) {
        const reason = clock?.signal.aborted ? clock.signal.reason : error;
        return json({ error: reason instanceof ProxyFault ? reason.code : 'offline' }, reason instanceof ProxyFault ? reason.status : 502);
    } finally {
        if (!streaming) { stop(upstream?.body); clock?.finish(); }
    }
}
