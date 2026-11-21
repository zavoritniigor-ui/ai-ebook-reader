// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
/* proxy-assets/translate.js — injected by functions/p/[[path]].js first into every page shown through the reading proxy.
 *
 * 1. Requests the site's own scripts build at run time («/build/x.json», «https://<allowed host>/…») are sent to
 *    /p/<host>/… too: fetch and XMLHttpRequest are wrapped before those scripts run.
 * 2. Select a word or a sentence (a long press on a phone, a double click or a drag on a computer) → a panel at the
 *    bottom: the text, its translation (Google Translate, the same request the reader makes), 🔊 (the device's French
 *    voice) and the target language. A plain tap is left alone, so the exercises keep working.
 * 3. Inside an embedded exercise (an H5P frame, also proxied) the selection is sent up to the top page, which shows the
 *    one panel; a frame too small for it never has to hold it.
 * Nothing here reads or sends anything but the selected text.
 */
(() => {
    const me = document.currentScript;
    const HOST = me?.dataset.host || '';
    const HOSTS = new Set(String(me?.dataset.hosts || '').split(' ').filter(Boolean));
    const ORIGIN = location.origin;

    // ---------- 1. run-time requests of the site ----------
    const map = raw => {
        if (typeof raw !== 'string') return raw;
        const v = raw.trim();
        if (v.startsWith('//')) return map('https:' + v);
        if (v.startsWith('/') && !v.startsWith('/p/') && !v.startsWith('/proxy-assets/')) return `/p/${HOST}${v}`;
        if (/^https?:\/\//i.test(v)) {
            try {
                const u = new URL(v);
                if (HOSTS.has(u.host)) return `/p/${u.host}${u.pathname}${u.search}${u.hash}`;
                if (u.origin === ORIGIN && !u.pathname.startsWith('/p/') && !u.pathname.startsWith('/proxy-assets/')) return `/p/${HOST}${u.pathname}${u.search}${u.hash}`;
            } catch (e) {}
        }
        return raw;
    };
    if (HOST) {
        const realFetch = window.fetch;
        window.fetch = function (input, init) {
            if (typeof input === 'string') input = map(input);
            else if (input instanceof URL) input = map(input.href);
            else if (input && typeof input.url === 'string' && map(input.url) !== input.url) input = new Request(map(input.url), input);
            return realFetch.call(this, input, init);
        };
        const open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, ...rest) { return open.call(this, method, map(url instanceof URL ? url.href : url), ...rest); };
    }

    // ---------- 2–3. selection → translation ----------
    const TL_KEY = 'pp_target_lang';
    const LANGS = [['uk', 'Українська'], ['en', 'English'], ['ru', 'Русский'], ['es', 'Español'], ['de', 'Deutsch'], ['pl', 'Polski']];
    const readTl = () => { try { return localStorage.getItem(TL_KEY) || 'uk'; } catch (e) { return 'uk'; } };
    const inFrame = window.top !== window;
    const clean = text => String(text || '').replace(/\s+/g, ' ').trim().slice(0, 400);
    const worth = text => text.length > 0 && /\p{L}/u.test(text);

    async function translate(text, tl) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);   // not wrapped: another site
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return { text: (data[0] || []).map(p => p[0]).join(''), from: data[2] || '' };
    }
    function speak(text, lang) {
        try {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = lang && lang.length === 2 ? lang : 'fr-FR';
            const v = speechSynthesis.getVoices().find(x => x.lang.toLowerCase().startsWith(u.lang.slice(0, 2)));
            if (v) u.voice = v;
            speechSynthesis.speak(u);
        } catch (e) {}
    }

    let panel = null, view = null, token = 0;
    function ensurePanel() {
        if (panel) return;
        panel = document.createElement('div');
        panel.setAttribute('data-pp', '');
        Object.assign(panel.style, { position: 'fixed', left: '0', right: '0', bottom: '0', zIndex: '2147483647', display: 'none' });
        const root = panel.attachShadow({ mode: 'closed' });
        root.innerHTML = `<style>
            .box { margin: 0 auto; max-width: 640px; background: #fff; color: #1c1d21; border-radius: 16px 16px 0 0;
                box-shadow: 0 -8px 30px rgba(0,0,0,.25); padding: 12px 16px 16px; font: 16px/1.45 system-ui, sans-serif; }
            .top { display: flex; align-items: center; gap: 8px; }
            .src { flex: 1; font-weight: 650; overflow-wrap: anywhere; }
            .tr { margin-top: 6px; font-size: 17px; color: #1a56db; overflow-wrap: anywhere; min-height: 1.4em; }
            .tr.err { color: #b42318; font-size: 14px; }
            button, select { font: inherit; min-height: 40px; border: 1px solid #d7dbe3; border-radius: 10px; background: #fff; color: inherit; padding: 0 10px; }
            button.icon { width: 40px; padding: 0; font-size: 18px; }
            .row { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
            .brand { margin-left: auto; font-size: 12px; color: #6b7280; }
            @media (prefers-color-scheme: dark) { .box { background: #1f2024; color: #f1f2f4; } .tr { color: #8fb0ff; }
                button, select { background: #2a2b30; border-color: #3a3c43; } }
        </style>
        <div class="box" role="dialog" aria-live="polite">
            <div class="top"><div class="src"></div><button class="icon speak" type="button" aria-label="Listen">🔊</button><button class="icon close" type="button" aria-label="Close">✕</button></div>
            <div class="tr"></div>
            <div class="row"><select class="tl" aria-label="Translate to">${LANGS.map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select><span class="brand">AI E-book Reader</span></div>
        </div>`;
        view = { src: root.querySelector('.src'), tr: root.querySelector('.tr'), tl: root.querySelector('.tl'), speak: root.querySelector('.speak'), close: root.querySelector('.close'), lang: 'fr' };
        view.tl.value = readTl();
        view.close.addEventListener('click', hide);
        view.speak.addEventListener('click', () => speak(view.src.textContent, view.lang));
        view.tl.addEventListener('change', () => { try { localStorage.setItem(TL_KEY, view.tl.value); } catch (e) {} show(view.src.textContent); });
        // A tap inside the panel is ours, not the exercise's (and does not clear the selection that opened it).
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'click']) panel.addEventListener(type, e => e.stopPropagation());
        document.documentElement.appendChild(panel);
    }
    async function show(text) {
        ensurePanel();
        const my = ++token;
        view.src.textContent = text; view.tr.textContent = '…'; view.tr.classList.remove('err');
        panel.style.display = 'block';
        try {
            const r = await translate(text, view.tl.value);
            if (my !== token) return;
            view.tr.textContent = r.text; view.lang = r.from || 'fr';
        } catch (e) {
            if (my !== token) return;
            view.tr.textContent = 'Translation is not available right now.'; view.tr.classList.add('err');
        }
    }
    function hide() { if (panel) panel.style.display = 'none'; token++; }

    let timer = 0, last = '';
    function onSelection() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const sel = getSelection();
            const text = clean(sel && !sel.isCollapsed ? sel.toString() : '');
            if (!worth(text) || text === last) return;
            last = text;
            if (inFrame) window.top.postMessage({ pp: 'translate', text }, ORIGIN);
            else show(text);
        }, 450);
    }
    document.addEventListener('selectionchange', () => { if (getSelection()?.isCollapsed) last = ''; onSelection(); });
    if (!inFrame) {
        window.addEventListener('message', e => {
            if (e.origin !== ORIGIN || !e.data || e.data.pp !== 'translate') return;
            const text = clean(e.data.text);
            if (worth(text)) show(text);
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
    }
})();
