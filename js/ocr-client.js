// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. See LICENSE.
// Same-origin transport only. Server credentials never belong in this browser module.
const OcrClient = (() => {
    const BASE = '/api/ocr', MAX_IMAGE = 20 * 1024 * 1024, MAX_PDF = 100 * 1024 * 1024;
    function failure(code, status = 0) { const e = new Error(code); e.code = code; e.status = status; return e; }
    function cancelled() { return new DOMException('Cancelled', 'AbortError'); }
    async function readBounded(response, limit, signal) {
        if (Number(response.headers.get('Content-Length')) > limit) throw failure('too_large', 413);
        const reader = response.body.getReader(), chunks = []; let size = 0;
        try {
            for (;;) {
                if (signal.aborted) throw cancelled();
                const { value, done } = await reader.read(); if (done) break;
                size += value.byteLength;
                if (size > limit) throw failure('too_large', 413);
                chunks.push(value);
            }
            return new Blob(chunks);
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
    async function request(path, init = {}, signal, kind = 'json') {
        const ctl = new AbortController(), abort = () => ctl.abort();
        if (signal?.aborted) throw cancelled();
        signal?.addEventListener('abort', abort, { once: true });
        const timeout = setTimeout(abort, 125000);
        try {
            const res = await fetch(BASE + path, { ...init, signal: ctl.signal, credentials: 'same-origin', redirect: 'error', cache: 'no-store' });
            if (!res.ok) {
                const code = ({ 413: 'too_large', 422: 'invalid_image', 429: 'busy', 503: 'unavailable', 502: 'offline', 504: 'offline' })[res.status] || 'failed';
                await res.body?.cancel(); throw failure(code, res.status);
            }
            if (kind === 'empty') { await res.body?.cancel(); return null; }
            const type = (res.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
            if (type !== (kind === 'pdf' ? 'application/pdf' : 'application/json')) throw failure('failed');
            const blob = await readBounded(res, kind === 'pdf' ? MAX_PDF : 16 * 1024 * 1024, ctl.signal);
            if (kind === 'pdf') {
                if (await blob.slice(0, 5).text() !== '%PDF-') throw failure('failed');
                return blob;
            }
            return JSON.parse(await blob.text());
        } catch (e) {
            if (signal?.aborted) throw cancelled();
            if (e.code) throw e;
            throw failure('offline');
        } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); ctl.abort(); }
    }
    async function createPdf(pages, options, { signal, onProgress = () => {} } = {}) {
        if (!pages.length || pages.length > 20 || pages.some(p => !p.file?.size || p.file.size > MAX_IMAGE)) throw failure('too_large', 413);
        // Snapshot the editing metadata before the first network operation.
        const inputs = pages.map(p => ({ file: p.file, options: { corners: p.corners.map(c => c.slice()), rotation: p.rotation, filter: p.filter } }));
        let id;
        try {
            onProgress({ stage: 'start', n: 0, total: inputs.length });
            const job = await request('/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options) }, signal);
            if (!/^[a-f0-9]{32}$/.test(job.id)) throw failure('failed');
            id = job.id;
            for (let i = 0; i < inputs.length; i++) {
                onProgress({ stage: 'page', n: i + 1, total: inputs.length });
                await request('/jobs/' + id + '/pages/' + i, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'X-OCR-Options': JSON.stringify(inputs[i].options) }, body: inputs[i].file }, signal);
            }
            onProgress({ stage: 'pdf', n: inputs.length, total: inputs.length });
            const pdf = await request('/jobs/' + id + '/pdf', {}, signal, 'pdf');
            const manifest = await request('/jobs/' + id + '/manifest', {}, signal);
            return { file: new File([pdf], 'scan-' + new Date().toISOString().slice(0, 10) + '.pdf', { type: 'application/pdf' }), manifest };
        } finally {
            // A cancelled request also releases its job; this cleanup has its own short deadline.
            if (id) {
                const cleanup = new AbortController(), timer = setTimeout(() => cleanup.abort(), 5000);
                try { await request('/jobs/' + id, { method: 'DELETE' }, cleanup.signal, 'empty'); } catch (e) { /* The server TTL is the fallback. */ }
                finally { clearTimeout(timer); }
            }
        }
    }
    return Object.freeze({ createPdf });
})();
