// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
/* proxy-assets/translate.js — injected by functions/p/[[path]].js first into every page shown through the reading proxy.
 *
 * 1. Requests the site's own scripts build at run time («/build/x.json», «https://<allowed host>/…») are sent to
 *    /p/<host>/… too: fetch and XMLHttpRequest are wrapped before those scripts run.
 * 2. One tap on a word (owner, 2026-11-21: «полегшити виділення слів та речень», the system long press was too fiddly)
 *    → the word is highlighted and a panel at the bottom shows its translation (Google Translate, the same request the
 *    reader makes), 🔊 (the device's voice) and «Речення ⤢» — the whole sentence around the word, translated. Taps on
 *    the page's own controls (links, buttons, answers, fields, things to drag, anything drawn as clickable) are left to
 *    the exercise; «⇄» in the corner turns tap-to-translate off for an exercise whose words are themselves to be tapped.
 *    A selection made the system way (long press, drag) is still translated.
 * 3. Inside an embedded exercise (an H5P frame, also proxied) the word and its sentence are sent up to the top page,
 *    which shows the one panel; a frame too small for it never has to hold it.
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
        // Addresses set by the site's scripts (webpack loads its chunks with script.src = '/build/…'): mapped at the moment
        // they are set, before the browser starts loading — fixing them after insertion is too late for a script.
        const wrapUrlProp = (proto, prop) => {
            const d = proto && Object.getOwnPropertyDescriptor(proto, prop);
            if (!d || !d.set) return;
            Object.defineProperty(proto, prop, { ...d, set(v) { d.set.call(this, typeof v === 'string' ? map(v) : v); } });
        };
        for (const [ctor, prop] of [[window.HTMLScriptElement, 'src'], [window.HTMLIFrameElement, 'src'], [window.HTMLImageElement, 'src'],
            [window.HTMLMediaElement, 'src'], [window.HTMLSourceElement, 'src'], [window.HTMLLinkElement, 'href'], [window.HTMLFormElement, 'action']]) wrapUrlProp(ctor?.prototype, prop);
        const setAttr = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function (name, value) {
            const n = String(name).toLowerCase();
            if ((n === 'src' && /^(SCRIPT|IFRAME|IMG|AUDIO|VIDEO|SOURCE|TRACK)$/.test(this.tagName)) || (n === 'href' && this.tagName === 'LINK') || (n === 'action' && this.tagName === 'FORM')) value = map(String(value));
            return setAttr.call(this, name, value);
        };
        // The site's service worker would install itself over this whole host: never through the proxy.
        if (navigator.serviceWorker) {
            try { Object.defineProperty(navigator.serviceWorker, 'register', { value: () => Promise.reject(new DOMException('Not through the reading proxy', 'SecurityError')) }); } catch (e) {}
        }
        // Frames, scripts and images the page adds later with an allowed host or a root-relative address (an exercise
        // frame whose address the server could not see): pointed at /p/… as they arrive, so the frame gets this script too.
        const fix = el => {
            for (const attr of ['src', 'href']) {
                if (!el.hasAttribute || !el.hasAttribute(attr) || (attr === 'href' && el.tagName !== 'LINK')) continue;
                const v = el.getAttribute(attr), m = map(v);
                if (m !== v) el.setAttribute(attr, m);
            }
        };
        new MutationObserver(list => {
            for (const rec of list) for (const n of rec.addedNodes) {
                if (n.nodeType !== 1) continue;
                if (/^(IFRAME|SCRIPT|IMG|LINK|AUDIO|VIDEO|SOURCE)$/.test(n.tagName)) fix(n);
                if (n.querySelectorAll) n.querySelectorAll('iframe[src], script[src], img[src], link[href], audio[src], video[src], source[src]').forEach(fix);
            }
        }).observe(document.documentElement, { childList: true, subtree: true });
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

    // ---------- the word under a tap, its sentence, a highlight ----------
    const TAP_KEY = 'pp_tap';
    const tapOn = () => { try { return localStorage.getItem(TAP_KEY) !== '0'; } catch (e) { return true; } };
    // Taps that belong to the page: links, buttons, answers, fields, things to drag, anything drawn as clickable.
    const INTERACTIVE = 'a[href],button,input,select,textarea,label,summary,option,[contenteditable=""],[contenteditable="true"],[role=button],[role=link],'
        + '[role=radio],[role=checkbox],[role=option],[role=tab],[role=menuitem],[role=switch],[role=slider],[role=textbox],[draggable="true"],'
        + '.ui-draggable,.ui-droppable,.h5p-joubelui-button,[onclick],[data-pp]';
    const BLOCK = 'p,li,h1,h2,h3,h4,h5,h6,td,th,dd,dt,blockquote,figcaption,caption,pre';
    const LETTER = /[\p{L}\p{M}\p{N}\-]/u, APOS = /['’]/;
    function caretAt(x, y) {
        if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r && { node: r.startContainer, offset: r.startOffset }; }
        if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p && { node: p.offsetNode, offset: p.offset }; }
        return null;
    }
    // The word around offset in a text node. An apostrophe joins only a long left part (aujourd'hui), so «l'école» gives «école».
    function wordAround(text, offset) {
        let s = offset, e = offset;
        const inWord = i => i >= 0 && i < text.length && (LETTER.test(text[i]) || (APOS.test(text[i]) && LETTER.test(text[i + 1] || '') && /[\p{L}]{4,}$/u.test(text.slice(0, i))));
        if (!inWord(s) && inWord(s - 1)) s--;
        if (!inWord(s)) return null;
        while (inWord(s - 1)) s--;
        e = s; while (inWord(e)) e++;
        const w = text.slice(s, e).replace(/^-+|-+$/g, '');
        return /\p{L}/u.test(w) ? { start: s + text.slice(s, e).indexOf(w), end: s + text.slice(s, e).indexOf(w) + w.length, word: w } : null;
    }
    // The block's text nodes in order, to find the sentence around a word and to highlight it.
    function blockTexts(block) {
        const parts = [], w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('script,style,noscript,[data-pp]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
        let n, at = 0;
        while ((n = w.nextNode())) { parts.push({ node: n, at }); at += n.data.length; }
        return { parts, text: parts.map(p => p.node.data).join('') };
    }
    function rangeOf(parts, from, to) {
        const r = document.createRange();
        const place = (pos, setter) => { for (const p of parts) if (pos <= p.at + p.node.data.length) { setter.call(r, p.node, Math.max(0, pos - p.at)); return true; } return false; };
        return place(from, r.setStart) && place(to, r.setEnd) ? r : null;
    }
    function sentenceAround(text, from, to) {
        let s = from, e = to;
        while (s > 0 && !(/[.!?…]/.test(text[s - 1]) && /\s/.test(text[s] || ' '))) s--;
        while (e < text.length && !/[.!?…]/.test(text[e])) e++;
        while (e < text.length && /[.!?…»"”)]/.test(text[e])) e++;
        while (s < e && /\s/.test(text[s])) s++;
        return { start: s, end: e };
    }
    let marked = null;
    const highlightCss = document.createElement('style');
    highlightCss.textContent = '::highlight(pp-word){background-color:rgba(26,86,219,.24)} ::highlight(pp-sentence){background-color:rgba(26,86,219,.12)}';
    (document.head || document.documentElement).appendChild(highlightCss);
    function mark(range, name) {
        try { if (!window.CSS || !CSS.highlights) return; CSS.highlights.delete('pp-word'); CSS.highlights.delete('pp-sentence'); if (range) CSS.highlights.set(name, new Highlight(range)); } catch (e) {}
    }
    function tapTarget(e) {
        if (!tapOn() || e.defaultPrevented || e.button > 0) return null;
        const sel = getSelection(); if (sel && !sel.isCollapsed) return null;   // a selection is translated by itself
        const t = e.target;
        if (!(t instanceof Element) || t.closest(INTERACTIVE)) return null;
        for (let el = t; el && el !== document.body; el = el.parentElement) if (getComputedStyle(el).cursor === 'pointer') return null;
        const c = caretAt(e.clientX, e.clientY);
        if (!c || !c.node || c.node.nodeType !== 3) return null;
        const found = wordAround(c.node.data, c.offset);
        if (!found) return null;
        const wr = document.createRange(); wr.setStart(c.node, found.start); wr.setEnd(c.node, found.end);
        // The caret is the nearest one even in empty space: the tap must be on the word itself.
        if (![...wr.getClientRects()].some(b => e.clientX >= b.left - 4 && e.clientX <= b.right + 4 && e.clientY >= b.top - 4 && e.clientY <= b.bottom + 4)) return null;
        const block = c.node.parentElement.closest(BLOCK) || c.node.parentElement;
        const bt = blockTexts(block);
        const p = bt.parts.find(x => x.node === c.node);
        let sentence = '', sRange = null;
        if (p) {
            const sp = sentenceAround(bt.text, p.at + found.start, p.at + found.end);
            sentence = clean(bt.text.slice(sp.start, sp.end));
            sRange = rangeOf(bt.parts, sp.start, sp.end);
        }
        return { word: found.word, wordRange: wr, sentence: sentence !== found.word ? sentence : '', sentenceRange: sRange };
    }
    document.addEventListener('click', e => {
        const hit = tapTarget(e);
        if (!hit) return;
        // The tap is ours: marking it handled keeps Chrome's own «Touch to Search» sheet (Android) from opening over the
        // panel for the same word (owner's screenshot, 2026-11-21). Only plain text gets here, never a control of the page.
        e.preventDefault();
        marked = hit; mark(hit.wordRange, 'pp-word');
        if (inFrame) window.top.postMessage({ pp: 'translate', text: hit.word, sentence: hit.sentence, frame: true }, ORIGIN);
        else show(hit.word, hit.sentence);
    });
    // The top page asks a frame to mark its sentence when «Речення» is chosen there.
    window.addEventListener('message', e => {
        if (e.origin !== ORIGIN || !e.data) return;
        if (e.data.pp === 'mark-sentence' && marked) mark(marked.sentenceRange, 'pp-sentence');
        if (e.data.pp === 'unmark') { marked = null; mark(null); }
    });

    // ---------- the panel ----------
    let panel = null, view = null, token = 0, chip = null, current = { sentence: '', fromFrame: false };
    function ensurePanel() {
        if (panel) return;
        panel = document.createElement('div');
        panel.setAttribute('data-pp', '');
        Object.assign(panel.style, { position: 'fixed', left: '0', right: '0', bottom: '0', zIndex: '2147483647', display: 'none' });
        const root = panel.attachShadow({ mode: 'open' });   // open: styles stay isolated; tests can read it
        root.innerHTML = `<style>
            .box { margin: 0 auto; max-width: 720px; background: #fff; color: #1c1d21; border-radius: 16px 16px 0 0;
                box-shadow: 0 -8px 30px rgba(0,0,0,.25); padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); font: 16px/1.45 system-ui, sans-serif; }
            .top { display: flex; align-items: center; gap: 8px; }
            .src { flex: 1; font-weight: 650; overflow-wrap: anywhere; max-height: 7.5em; overflow: auto; }
            .tr { margin-top: 6px; font-size: 17px; color: #1a56db; overflow-wrap: anywhere; min-height: 1.4em; max-height: 9em; overflow: auto; }
            .tr.err { color: #b42318; font-size: 14px; }
            button, select { font: inherit; min-height: 40px; border: 1px solid #d7dbe3; border-radius: 10px; background: #fff; color: inherit; padding: 0 10px; }
            button.icon { width: 40px; padding: 0; font-size: 18px; flex: none; }
            button.sent { border-color: #1a56db; color: #1a56db; font-weight: 600; }
            button[hidden] { display: none; }
            .row { display: flex; gap: 8px; margin-top: 10px; align-items: center; flex-wrap: wrap; }
            .brand { margin-left: auto; font-size: 12px; color: #6b7280; }
            @media (prefers-color-scheme: dark) { .box { background: #1f2024; color: #f1f2f4; } .tr { color: #8fb0ff; }
                button, select { background: #2a2b30; border-color: #3a3c43; } button.sent { color: #8fb0ff; border-color: #8fb0ff; } }
        </style>
        <div class="box" role="dialog" aria-live="polite">
            <div class="top"><div class="src"></div><button class="icon speak" type="button" aria-label="Слухати">🔊</button><button class="icon close" type="button" aria-label="Закрити">✕</button></div>
            <div class="tr"></div>
            <div class="row"><button class="sent" type="button">Речення ⤢</button><select class="tl" aria-label="Мова перекладу">${LANGS.map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select><span class="brand">AI E-book Reader</span></div>
        </div>`;
        view = { src: root.querySelector('.src'), tr: root.querySelector('.tr'), tl: root.querySelector('.tl'), speak: root.querySelector('.speak'),
            close: root.querySelector('.close'), sent: root.querySelector('.sent'), lang: 'fr' };
        view.tl.value = readTl();
        view.close.addEventListener('click', hide);
        view.speak.addEventListener('click', () => speak(view.src.textContent, view.lang));
        view.tl.addEventListener('change', () => { try { localStorage.setItem(TL_KEY, view.tl.value); } catch (e) {} translateInto(view.src.textContent); });
        view.sent.addEventListener('click', () => {
            const s = current.sentence; if (!s) return;
            current.sentence = '';
            if (current.fromFrame) for (const f of document.querySelectorAll('iframe')) { try { f.contentWindow.postMessage({ pp: 'mark-sentence' }, ORIGIN); } catch (e) {} }
            else if (marked) mark(marked.sentenceRange, 'pp-sentence');
            show(s, '', current.fromFrame);
        });
        // A tap inside the panel is ours, not the exercise's (and does not clear the selection that opened it).
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'click']) panel.addEventListener(type, e => e.stopPropagation());
        document.documentElement.appendChild(panel);
    }
    async function translateInto(text) {
        const my = ++token;
        view.src.textContent = text; view.tr.textContent = '…'; view.tr.classList.remove('err');
        try {
            const r = await translate(text, view.tl.value);
            if (my !== token) return;
            view.tr.textContent = r.text; view.lang = r.from || 'fr';
        } catch (e) {
            if (my !== token) return;
            view.tr.textContent = 'Переклад зараз недоступний.'; view.tr.classList.add('err');
        }
    }
    function show(text, sentence = '', fromFrame = false) {
        ensurePanel();
        current = { sentence, fromFrame };
        view.sent.hidden = !sentence;
        panel.style.display = 'block';
        if (chip) chip.style.display = 'none';
        translateInto(text);
    }
    function hide() {
        if (panel) panel.style.display = 'none'; token++;
        if (chip) chip.style.display = '';
        marked = null; mark(null);
        for (const f of document.querySelectorAll('iframe')) { try { f.contentWindow.postMessage({ pp: 'unmark' }, ORIGIN); } catch (e) {} }
    }

    // ---------- a selection made the system way (long press) still works ----------
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
            if (worth(text)) show(text, clean(e.data.sentence || ''), !!e.data.frame);
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
        // «⇄» in the corner: tap-to-translate on or off (an exercise whose own words are to be tapped).
        const addChip = () => {
            chip = document.createElement('button');
            chip.type = 'button'; chip.setAttribute('data-pp', ''); chip.textContent = '⇄';
            const sync = () => { const on = tapOn(); chip.setAttribute('aria-pressed', String(on)); chip.title = on ? 'Переклад дотиком: увімкнено' : 'Переклад дотиком: вимкнено';
                chip.setAttribute('aria-label', chip.title); chip.style.background = on ? '#1a56db' : '#9aa1ad'; };
            // Above the bottom bars sites put there (RFI: «Accueil … Menu»), not on them.
            Object.assign(chip.style, { position: 'fixed', right: '12px', bottom: 'calc(88px + env(safe-area-inset-bottom))', zIndex: '2147483646', width: '46px', height: '46px',
                borderRadius: '50%', border: '0', color: '#fff', font: '700 20px/46px system-ui, sans-serif', boxShadow: '0 4px 14px rgba(0,0,0,.25)', cursor: 'pointer', padding: '0' });
            sync();
            chip.addEventListener('click', e => { e.stopPropagation(); try { localStorage.setItem(TAP_KEY, tapOn() ? '0' : '1'); } catch (err) {} sync(); });
            document.documentElement.appendChild(chip);
        };
        if (document.body) addChip(); else document.addEventListener('DOMContentLoaded', addChip);
    }
})();
