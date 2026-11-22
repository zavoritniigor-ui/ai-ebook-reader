// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// Cloudflare Pages Function: /api/speech/health and /api/speech/speak — a voice for the reader and the reading proxy.
// 1. The owner's computer (tts-server, 127.0.0.1:8880: Kokoro / Piper) through a tunnel: SPEECH_TUNNEL_URL + SPEECH_TOKEN.
// 2. When it does not answer (5xx, 530, timeout) or is not configured: Microsoft's neural voices through the official
//    Azure AI Speech service (AZURE_SPEECH_KEY + AZURE_SPEECH_REGION, optional AZURE_SPEECH_VOICES), see azureSpeak.
// Every key and address lives ONLY in Cloudflare secrets, never in the browser. Neither configured → 503, and the
// app uses the browser's voice. The visitor's IP (cf-connecting-ip) goes to the computer for its rate limit.
// NOT an open proxy: only the app's own pages (Origin/Referer), two routes, a bounded body and text.
const ALLOWED = new Set(['health', 'speak']);
const MAX_BODY_BYTES = 16 * 1024;   // фраза для озвучки коротка; сервер і так обмежує MAX_CHARS

// web.ai-ebook-reader.uk: the reading proxy's host (functions/p/[[path]].js) — a word tapped on an exercise site is read
// in the owner's voice too (owner, 2026-11-22). Sites shown there get nothing more than any visitor of the app already has.
const ALLOWED_HOSTS = ['ai-ebook-reader.uk', 'ai-ebook-reader.pages.dev', 'web.ai-ebook-reader.uk'];
// The app's own hosts. The backend refuses to serve any other deployment (a copied site). Add a host here for a new domain.
function allowedHost(h) {
    return !!h && (ALLOWED_HOSTS.includes(h) || h.endsWith('.ai-ebook-reader.pages.dev') || h === 'localhost' || h === '127.0.0.1');
}
function sameOrigin(request, url) {
    if (!allowedHost(url.hostname)) return false;   // this deployment must be one of the app's own hosts
    const origin = request.headers.get('origin');
    if (origin) { try { return allowedHost(new URL(origin).hostname); } catch (e) { return false; } }
    const referer = request.headers.get('referer');
    try { return !!referer && allowedHost(new URL(referer).hostname); } catch (e) { return false; }
}

// Microsoft's neural voices when the owner's computer does not answer (owner, 2026-11-22: «Добав голос від Майкрософт»):
// the official Azure AI Speech service (key and region only in Cloudflare secrets AZURE_SPEECH_KEY / AZURE_SPEECH_REGION),
// the same voices as the books' narration (tools/book_tts: fr-FR-DeniseNeural, en-GB-SoniaNeural). Not edge-tts's
// endpoint: that one sits behind Microsoft's own DRM token, which an app must not get around. AZURE_SPEECH_VOICES
// («fr=fr-CA-SylvieNeural,uk=uk-UA-OstapNeural») changes a voice without a deploy. Answers are cached (same text, same
// voice → no second request against the free 500 000 characters a month).
const AZURE_VOICES = { fr: 'fr-FR-DeniseNeural', en: 'en-GB-SoniaNeural', uk: 'uk-UA-PolinaNeural', de: 'de-DE-KatjaNeural', es: 'es-ES-ElviraNeural', ru: 'ru-RU-SvetlanaNeural' };
const AZURE_MAX_CHARS = 1000;
const TUNNEL_WAIT_MS = 8000;
const xmlEscape = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
function azureConfig(env) {
    const key = String(env.AZURE_SPEECH_KEY || '').trim(), region = String(env.AZURE_SPEECH_REGION || '').trim().toLowerCase();
    if (!key || !/^[a-z0-9]+$/.test(region)) return null;
    const voices = { ...AZURE_VOICES };
    for (const pair of String(env.AZURE_SPEECH_VOICES || '').split(',')) {
        const m = pair.trim().match(/^([a-z]{2})=([A-Za-z]{2}-[A-Za-z]{2}-[A-Za-z]+Neural)$/);
        if (m) voices[m[1]] = m[2];
    }
    return { key, region, voices };
}
export async function azureSpeak(cfg, text, lang) {
    const code = String(lang || '').slice(0, 2).toLowerCase(), voice = cfg.voices[code];
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!voice || !clean || clean.length > AZURE_MAX_CHARS) return null;
    const cacheKey = new Request(`https://speech-cache.ai-ebook-reader.invalid/${voice}/${encodeURIComponent(clean)}`);
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    if (cache) { const hit = await cache.match(cacheKey); if (hit) return hit; }
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.slice(0, 5)}"><voice name="${voice}">${xmlEscape(clean)}</voice></speak>`;
    let res;
    try {
        res = await fetch(`https://${cfg.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: 'POST',
            headers: { 'Ocp-Apim-Subscription-Key': cfg.key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'ai-ebook-reader' },
            body: ssml, signal: AbortSignal.timeout(15000),
        });
    } catch (e) { return null; }
    if (!res.ok) return null;
    const out = new Response(await res.arrayBuffer(), { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=2592000', 'x-speech-voice': voice } });
    if (cache) { try { await cache.put(cacheKey, out.clone()); } catch (e) {} }
    return out;
}
const finish = (res, extra = {}) => new Response(res.body, { status: res.status, headers: {
    'content-type': res.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra } });

export async function onRequest({ request, env, params }) {
    const url = new URL(request.url);
    const path = [].concat(params.path || []).join('/');
    if (!ALLOWED.has(path) || (request.method !== 'GET' && request.method !== 'POST')) {
        return new Response('not found', { status: 404 });
    }
    if (!sameOrigin(request, url)) return new Response('forbidden', { status: 403 });
    const base = String(env.SPEECH_TUNNEL_URL || '').trim().replace(/\/+$/, '');
    const token = String(env.SPEECH_TOKEN || '').trim();
    const azure = azureConfig(env);
    if ((!base || !token) && !azure) return new Response('local speech is not configured', { status: 503 });
    if (request.method === 'POST' && Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
        return new Response('too large', { status: 413 });
    }
    const body = request.method === 'POST' ? await request.arrayBuffer() : undefined;
    if (body && body.byteLength > MAX_BODY_BYTES) return new Response('too large', { status: 413 });
    // The owner's computer first (Kokoro / Piper).
    if (base && token) {
        try {
            const upstream = await fetch(base + '/' + path, {
                method: request.method,
                headers: { 'Content-Type': 'application/json', 'X-Speech-Token': token, 'X-Client-IP': request.headers.get('cf-connecting-ip') || 'unknown' },
                body,
                // health: the app waits 1.5 s for it (js/local-speech.js), so the computer gets 1 s and Azure the rest.
                signal: AbortSignal.timeout(path === 'health' ? 1000 : TUNNEL_WAIT_MS),
            });
            // A 4xx is the server's real answer (a text it refuses); 5xx / 530 means the computer or the tunnel is down.
            if (upstream.status < 500 || !azure) return finish(upstream);
        } catch (err) {
            if (!azure) return new Response('local speech server is offline', { status: 502 });
        }
    }
    // Then Microsoft's voices (Azure).
    if (path === 'health') {
        const languages = Object.fromEntries(Object.keys(azure.voices).map(l => [l, 'azure']));
        return new Response(JSON.stringify({ ok: true, languages, device: 'azure' }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    let text = '', lang = '';
    try { const j = JSON.parse(new TextDecoder().decode(body || new ArrayBuffer(0))); text = j.text; lang = j.lang; } catch (e) {}
    const spoken = await azureSpeak(azure, text, lang);
    if (!spoken) return new Response('microsoft voice unavailable', { status: 502 });
    return finish(spoken, { 'x-speech-engine': 'azure', 'x-speech-voice': spoken.headers.get('x-speech-voice') || '' });
}
