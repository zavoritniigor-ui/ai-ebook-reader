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
    const NATIVE_FETCH = window.fetch.bind(window);   // our own calls (the owner's voice), never mapped into /p/…
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

    // Speed (owner, 2026-11-21: «чому швидкість перекладу така низька»; measured 0.7 s for the first word, 2.4 s for the
    // first sentence): the connection to Google is opened as the page loads, translations are kept (memory + this
    // site's storage, so a word seen before is instant), and a tapped word's sentence is translated in the background.
    const TR_HOST = 'https://translate.googleapis.com';
    try {
        const pre = document.createElement('link'); pre.rel = 'preconnect'; pre.href = TR_HOST; pre.crossOrigin = 'anonymous';
        (document.head || document.documentElement).appendChild(pre);
    } catch (e) {}
    const CACHE_KEY = 'pp_tr_cache', CACHE_MAX = 400;
    let cache = null;
    const loadCache = () => { if (cache) return cache; try { cache = new Map(Object.entries(JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'))); } catch (e) { cache = new Map(); } return cache; };
    let saveTimer = 0;
    const saveCache = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => {
        try { const c = loadCache(); while (c.size > CACHE_MAX) c.delete(c.keys().next().value); localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(c))); } catch (e) {}
    }, 300); };
    const pending = new Map();   // the same text asked twice at once (a prefetch, then the tap) shares one request
    // Chrome's own on-device translator (Translator API: Chrome on computers and Chromebook Plus, not on Android yet):
    // when it has the language pair, it translates here, at once, with nothing sent anywhere. A pair still to download
    // is fetched in the background (a tap is the user activation it asks for); Google answers meanwhile.
    const SRC = /^[a-z]{2}/.test(document.documentElement.lang || '') ? document.documentElement.lang.slice(0, 2) : 'fr';
    const onDevice = new Map(), onDeviceReady = new Map();
    function startOnDevice(tl) {
        if (!('Translator' in self) || onDevice.has(tl) || tl === SRC) return;
        const opts = { sourceLanguage: SRC, targetLanguage: tl };
        onDevice.set(tl, (async () => {
            const a = await self.Translator.availability(opts);
            if (a === 'unavailable' || a === 'no') return null;
            const t = await self.Translator.create(opts);
            onDeviceReady.set(tl, t);
            return t;
        })().catch(() => { onDevice.delete(tl); return null; }));
    }
    // A pair already on the device needs no tap to start: set it up as the page opens (a download waits for a tap).
    try { if ('Translator' in self) startOnDevice(readTl()); } catch (e) {}
    async function translate(text, tl) {
        const key = tl + '|' + text, c = loadCache();
        if (c.has(key)) { const hit = c.get(key); c.delete(key); c.set(key, hit); return hit; }
        if (pending.has(key)) return pending.get(key);
        startOnDevice(tl);
        // Still being set up (the page has just opened): a short wait beats a trip to Google.
        if (!onDeviceReady.has(tl) && onDevice.has(tl)) await Promise.race([onDevice.get(tl), new Promise(r => setTimeout(r, 400))]);
        const local = onDeviceReady.get(tl);
        if (local) {
            // A translator whose model is still downloading answers only when the download ends (seen on a computer whose
            // Chrome had the API but no model): never wait for it longer than this, Google answers instead.
            try {
                const text2 = await Promise.race([local.translate(text), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 1500))]);
                const out = { text: text2, from: SRC, onDevice: true }; c.set(key, out); saveCache(); return out;
            } catch (e) { /* Google below */ }
        }
        const job = (async () => {
            const url = `${TR_HOST}/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(url);   // not wrapped: another site
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const out = { text: (data[0] || []).map(p => p[0]).join(''), from: data[2] || '' };
            c.set(key, out); saveCache();
            return out;
        })();
        pending.set(key, job);
        try { return await job; } finally { pending.delete(key); }
    }
    // Speech (owner, 2026-11-21: «озвучення слова не працює … хочу щоб озвучення було автоматично»): the phone's own
    // voices were silent when no French voice is installed, or when Chrome on Android left the engine stuck. Google
    // Translate's voice is the first choice (an MP3 played here, the same for every device; ≤ 180 characters a piece,
    // read in turn); the device's voice is the fallback (offline, or the audio refused). A tapped word is read at once
    // while «Авто 🔊» is on (the default), a sentence when «Речення ⤢» is chosen; 🔊 reads again.
    const SPEAK_KEY = 'pp_autospeak';
    const autoSpeak = () => { try { return localStorage.getItem(SPEAK_KEY) !== '0'; } catch (e) { return true; } };
    let player = null, speakSeq = 0;
    function ttsChunks(text) {
        const out = []; let rest = String(text).replace(/\s+/g, ' ').trim();
        while (rest.length > 180) {
            let cut = Math.max(rest.lastIndexOf('. ', 180), rest.lastIndexOf(', ', 180), rest.lastIndexOf('; ', 180));
            if (cut < 60) cut = rest.lastIndexOf(' ', 180);
            if (cut < 60) cut = 180;
            out.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 1).trim();
        }
        if (rest) out.push(rest);
        return out;
    }
    // Edge on a computer has Microsoft's natural voices built in («Microsoft Denise Online (Natural) - French (France)»):
    // free, the quality of the Azure voices. Where the browser has one for the language it reads FIRST (owner,
    // 2026-11-23: «якщо браузер має природний голос … читати ним першим»); without one (Chrome, phones) nothing changes.
    // Such a voice needs the network: when it fails or does not start in NATURAL_START_MS, the chain below reads.
    const NATURAL_VOICE = /natural|neural/i, NATURAL_START_MS = 3000;
    const MAIN_LOCALE = { fr: 'fr-fr', en: 'en-gb', uk: 'uk-ua', es: 'es-es', de: 'de-de', it: 'it-it', pt: 'pt-pt' };
    let voiceList = [];
    const loadVoices = () => { try { voiceList = speechSynthesis.getVoices() || []; } catch (e) {} };
    try { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); } catch (e) {}
    const voiceLang = v => String(v.lang || '').toLowerCase().replace('_', '-');
    function langVoices(lang) {
        loadVoices();   // read afresh each time: cheap, and right even when «voiceschanged» never came
        const code = String(lang).slice(0, 2).toLowerCase();
        return voiceList.filter(v => voiceLang(v).startsWith(code));
    }
    function naturalVoice(lang) {
        const all = langVoices(lang).filter(v => NATURAL_VOICE.test(v.name || ''));
        return all.find(v => voiceLang(v) === MAIN_LOCALE[String(lang).slice(0, 2).toLowerCase()]) || all[0] || null;
    }
    function naturalSpeak(my, text, voice, fallback) {
        let started = false, over = false;
        const giveUp = () => { if (over || my !== speakSeq) return; over = true; try { speechSynthesis.cancel(); } catch (e) {} fallback(); };
        try {
            speechSynthesis.cancel(); speechSynthesis.resume();
            const u = new SpeechSynthesisUtterance(text);
            u.voice = voice; u.lang = voice.lang;
            u.onstart = () => { started = true; };
            u.onend = () => { over = true; };
            // «interrupted» / «canceled»: our own cancel() for the next word, not a failure of the voice
            u.onerror = e => { if (!(e && /interrupted|canceled/.test(e.error || ''))) giveUp(); };
            window.__ppUtterance = u;
            speechSynthesis.speak(u);
            setTimeout(() => { if (!started) giveUp(); }, NATURAL_START_MS);
        } catch (e) { giveUp(); }
    }
    // The last resort, reached when the network voices failed: a voice on the device itself first (works offline),
    // so an online natural voice that just failed is not tried again.
    function systemSpeak(text, lang) {
        try {
            speechSynthesis.cancel(); speechSynthesis.resume();   // resume(): Chrome on Android can be left paused
            const u = new SpeechSynthesisUtterance(text);
            u.lang = lang === 'fr' ? 'fr-FR' : lang;
            const own = langVoices(lang);
            const v = own.find(x => x.localService) || own[0];
            if (v) u.voice = v;
            window.__ppUtterance = u;   // kept referenced: Chrome may drop an utterance held only by its queue
            speechSynthesis.speak(u);
        } catch (e) {}
    }
    // The owner's own voice first (owner, 2026-11-22: «чому не працює хороша озвучка на сайтах»): the speech server on
    // their computer (Kokoro for French and English, Piper for Ukrainian), reached through /api/speech like the reader
    // does (js/local-speech.js). The computer off, the tunnel down or no answer in 4 s → Google's voice, and the server
    // is left alone for two minutes so every next word does not wait for it again. Played sound is kept for a repeat.
    const LOCAL_LANGS = new Set(['fr', 'en', 'uk']), LOCAL_WAIT_MS = 4000, LOCAL_REST_MS = 120000;
    let localDownUntil = 0;
    const localAudio = new Map();
    async function localSpeechUrl(text, lang) {
        if (!LOCAL_LANGS.has(lang) || Date.now() < localDownUntil) return null;
        const key = lang + '|' + text;
        if (localAudio.has(key)) return localAudio.get(key);
        try {
            const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), LOCAL_WAIT_MS);
            const res = await NATIVE_FETCH('/api/speech/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, lang }), signal: ctl.signal });
            const blob = res.ok ? await res.blob() : null;
            clearTimeout(timer);
            if (!blob || !blob.size) throw new Error('HTTP ' + res.status);
            const url = URL.createObjectURL(blob);
            localAudio.set(key, url);
            if (localAudio.size > 60) { const [k, u] = localAudio.entries().next().value; URL.revokeObjectURL(u); localAudio.delete(k); }
            return url;
        } catch (e) { localDownUntil = Date.now() + LOCAL_REST_MS; return null; }
    }
    function speak(text, lang = SRC) {
        const my = ++speakSeq, chunks = ttsChunks(text), clean = String(text).replace(/\s+/g, ' ').trim();
        try { speechSynthesis.cancel(); } catch (e) {}
        if (player) { try { player.pause(); } catch (e) {} player = null; }
        const natural = naturalVoice(lang);
        // Started here, in the tap itself: the browser lets a page speak only right after a user's gesture.
        if (natural) naturalSpeak(my, clean, natural, () => ownOrGoogle(my, clean, chunks, lang));
        else ownOrGoogle(my, clean, chunks, lang);
    }
    async function ownOrGoogle(my, clean, chunks, lang) {
        const own = await localSpeechUrl(clean, lang);
        if (my !== speakSeq) return;
        if (own) {
            const a = new Audio(own); player = a;
            const played = a.play();
            if (played && played.catch) played.catch(() => { if (my === speakSeq) googleSpeak(my, chunks, lang); });
            return;
        }
        googleSpeak(my, chunks, lang);
    }
    function googleSpeak(my, chunks, lang) {
        let i = 0;
        const fallback = () => { if (my === speakSeq) systemSpeak(chunks.slice(Math.max(0, i - 1)).join(' '), lang); };
        const next = () => {
            if (my !== speakSeq || i >= chunks.length) return;
            const a = new Audio(`${TR_HOST}/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(chunks[i++])}`);
            player = a;
            a.onended = next;
            a.onerror = fallback;
            const played = a.play();
            if (played && played.catch) played.catch(fallback);
        };
        next();
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
    const onWord = (range, x, y) => [...range.getClientRects()].some(b => x >= b.left - 4 && x <= b.right + 4 && y >= b.top - 4 && y <= b.bottom + 4);
    // The word under a point. The caret first; text the page made unselectable (exercise cards, answers) gives none, so
    // then the text nodes under the finger are measured word by word.
    function wordAtPoint(x, y, target) {
        const c = caretAt(x, y);
        if (c && c.node && c.node.nodeType === 3) {
            const f = wordAround(c.node.data, c.offset);
            if (f) { const r = document.createRange(); r.setStart(c.node, f.start); r.setEnd(c.node, f.end); if (onWord(r, x, y)) return { node: c.node, ...f, range: r }; }
        }
        const root = target instanceof Element ? target : null;
        if (!root) return null;
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let n, seen = 0;
        while ((n = w.nextNode()) && seen++ < 300) {
            const re = /[\p{L}\p{M}\p{N}'’-]+/gu; let m;
            while ((m = re.exec(n.data))) {
                const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
                if (!onWord(r, x, y)) continue;
                for (let k = m.index; k < m.index + m[0].length; k++) {   // the part of «l'école» under the finger
                    const cr = document.createRange(); cr.setStart(n, k); cr.setEnd(n, k + 1);
                    if (onWord(cr, x, y)) { const f = wordAround(n.data, k); if (f) { const fr = document.createRange(); fr.setStart(n, f.start); fr.setEnd(n, f.end); return { node: n, ...f, range: fr }; } }
                }
            }
        }
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
    // The page's own controls: links, buttons, answers, fields, things to drag; and anything drawn as clickable when it is
    // small (a card, an answer) — a whole clickable column of text is not one.
    function ownedByPage(t) {
        if (t.closest(INTERACTIVE)) return true;
        for (let el = t; el && el !== document.body; el = el.parentElement)
            if (getComputedStyle(el).cursor === 'pointer' && el.getBoundingClientRect().height <= 160) return true;
        return false;
    }
    // anyControl: a long press translates even the words of buttons, answers and links (a tap there is the exercise's).
    function tapTarget(e, anyControl = false) {
        if (!tapOn() || e.defaultPrevented || e.button > 0) return null;
        const sel = getSelection(); if (!anyControl && sel && !sel.isCollapsed) return null;   // a selection is translated by itself
        const t = e.target;
        if (!(t instanceof Element) || t.closest('[data-pp]')) return null;
        if (!anyControl && ownedByPage(t)) return null;
        const hit = wordAtPoint(e.clientX, e.clientY, t);
        if (!hit) return null;
        const c = { node: hit.node }, found = hit, wr = hit.range;
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
    function translateHit(hit) {
        marked = hit; mark(hit.wordRange, 'pp-word');
        if (autoSpeak()) speak(hit.word);   // here, in the frame that was touched: the tap allows the sound
        if (inFrame) window.top.postMessage({ pp: 'translate', text: hit.word, sentence: hit.sentence, frame: true }, ORIGIN);
        else show(hit.word, hit.sentence);
    }
    document.addEventListener('click', e => {
        if (dragEndedAt && Date.now() - dragEndedAt < 600) { dragEndedAt = 0; return; }   // the click a drag ends with
        const hit = tapTarget(e);
        if (!hit) return;
        // The tap is ours: marking it handled keeps Chrome's own «Touch to Search» sheet (Android) from opening over the
        // panel for the same word (owner's screenshot, 2026-11-21). Only plain text gets here, never a control of the page.
        e.preventDefault();
        translateHit(hit);
    });
    // A long press on a button, an answer or a link translates its word instead of the system menu; the exercise does
    // not get a tap from it. (On plain text a long press selects, and the selection is translated below.)
    document.addEventListener('contextmenu', e => {
        const hit = tapTarget(e, true);
        if (!hit) return;
        e.preventDefault();
        translateHit(hit);
    });
    // ---------- drag with a pen or a mouse: the selection grows word by word, as in the reader ----------
    // (owner, 2026-11-23: «чому не можу робити виділення стилусом так само легко, як в застосунку»; js/selection-drag.js
    // is the reader's version.) The system selection jumps whole lines and a pen drag on a scrolling site scrolls it.
    // Here: a press on a word starts; each word reached extends the selection to whole words, in document order; the
    // release translates and reads it and leaves it as a real selection (it can be copied). A finger is left as it was.
    let drag = null, dragEndedAt = 0;
    const rangeFromTo = (a, b) => {
        const r = document.createRange();
        const aFirst = a.compareBoundaryPoints(Range.START_TO_START, b) <= 0;
        const first = aFirst ? a : b, lastR = aFirst ? b : a;
        r.setStart(first.startContainer, first.startOffset);
        r.setEnd(lastR.endContainer, lastR.endOffset);
        return r;
    };
    document.addEventListener('pointerdown', e => {
        drag = null;
        if ((e.pointerType !== 'pen' && e.pointerType !== 'mouse') || e.button !== 0 || !tapOn()) return;
        const t = e.target;
        if (!(t instanceof Element) || t.closest('[data-pp]') || ownedByPage(t)) return;
        const hit = wordAtPoint(e.clientX, e.clientY, t);
        if (!hit) return;   // empty space: the browser's own selection, or a pen scroll
        e.preventDefault();   // no system selection with its jumps (the click of a plain tap still comes)
        try { getSelection().removeAllRanges(); } catch (err) {}
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, from: hit.range, range: hit.range, moved: false };
    });
    document.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.moved) {
            if (Math.abs(e.clientX - drag.x) < 6 && Math.abs(e.clientY - drag.y) < 6) return;   // a pen's tremble is still a tap
            drag.moved = true;
        }
        const hit = wordAtPoint(e.clientX, e.clientY, e.target instanceof Element ? e.target : null);
        if (!hit) return;   // between words: the selection stays as it is
        drag.range = rangeFromTo(drag.from, hit.range);
        mark(drag.range, 'pp-word');
        if (e.cancelable) e.preventDefault();
    });
    const endDrag = e => {
        if (!drag || e.pointerId !== drag.id) return;
        const d = drag; drag = null;
        if (!d.moved) return;   // a tap: the click below translates the word
        dragEndedAt = Date.now();
        const text = clean(d.range.toString());
        if (!worth(text)) { mark(null); return; }
        last = text;   // the selection set below must not be translated a second time
        try { const s = getSelection(); s.removeAllRanges(); s.addRange(d.range); } catch (err) {}
        marked = { wordRange: d.range, sentenceRange: null };
        if (autoSpeak()) speak(text);   // in the gesture itself: the browser allows the sound
        if (inFrame) window.top.postMessage({ pp: 'translate', text }, ORIGIN);
        else show(text);
    };
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) { drag = null; mark(null); } });
    // A pen hovering over a word: touching down must select, not scroll the page — so while it hovers over text the page
    // does not pan (touch-action is read when the pen touches). Over empty space, and a moment after the pen has gone,
    // panning is back; a finger never hovers, so it scrolls as always.
    let penRaf = 0, penTimer = 0, penX = 0, penY = 0, penTarget = null;
    const panBack = () => { document.documentElement.style.touchAction = ''; };
    document.addEventListener('pointermove', e => {
        if (e.pointerType !== 'pen' || e.buttons || drag) return;
        penX = e.clientX; penY = e.clientY; penTarget = e.target;
        clearTimeout(penTimer); penTimer = setTimeout(panBack, 1500);
        if (penRaf) return;
        penRaf = requestAnimationFrame(() => {
            penRaf = 0;
            const t = penTarget instanceof Element ? penTarget : null;
            const overWord = tapOn() && t && !t.closest('[data-pp]') && !ownedByPage(t) && !!wordAtPoint(penX, penY, t);
            document.documentElement.style.touchAction = overWord ? 'none' : '';
        });
    });
    document.addEventListener('pointerout', e => { if (e.pointerType === 'pen' && !e.relatedTarget && !drag) { clearTimeout(penTimer); panBack(); } });

    // The top page asks a frame to mark its sentence when «Речення» is chosen there.
    window.addEventListener('message', e => {
        if (e.origin !== ORIGIN || !e.data) return;
        if (e.data.pp === 'mark-sentence' && marked) mark(marked.sentenceRange, 'pp-sentence');
        if (e.data.pp === 'unmark') { marked = null; mark(null); }
    });

    // ---------- the panel ----------
    // The offline dictionary (proxy-assets/dict-worker.js): a single word's lemma and meanings, before Google answers.
    // French → Ukrainian only; loaded in the background a moment after the page, in the top page only.
    let dictWorker = null, dictSeq = 0;
    const dictWaiting = new Map();
    function startDict() {
        if (dictWorker || inFrame || !window.Worker) return;
        try {
            dictWorker = new Worker(`/proxy-assets/dict-worker.js${me && me.src.includes('?') ? me.src.slice(me.src.indexOf('?')) : ''}`);
            dictWorker.onmessage = e => { const w = dictWaiting.get(e.data.id); if (w) { dictWaiting.delete(e.data.id); w(e.data.entries || []); } };
            dictWorker.onerror = () => { dictWorker = null; };
        } catch (e) { dictWorker = null; }
    }
    const lookupDict = word => new Promise(resolve => {
        startDict();
        if (!dictWorker) return resolve([]);
        const id = ++dictSeq; dictWaiting.set(id, resolve); dictWorker.postMessage({ id, word });
    });
    if (!inFrame) {
        const later = () => { if (readTl() === 'uk') startDict(); };
        if (document.readyState === 'complete') setTimeout(later, 1500); else window.addEventListener('load', () => setTimeout(later, 1500));
    }
    const POS_UK = { N: 'ім.', V: 'дієсл.', A: 'прикм.', ADV: 'присл.', PRE: 'прийм.', CON: 'спол.', PRO: 'займ.', DET: 'детерм.', NUM: 'числ.', INTJ: 'вигук' };
    function renderDict(entries) {
        view.dict.replaceChildren();
        for (const e of entries.slice(0, 2)) {
            const row = document.createElement('div'); row.className = 'd';
            const lem = document.createElement('b'); lem.textContent = e.lemma;
            const pos = document.createElement('i'); pos.textContent = ' ' + (POS_UK[e.pos] || e.pos || '') + (e.gender ? ' ' + e.gender : '') + ' ';
            const m = document.createElement('span'); m.textContent = e.meanings.slice(0, 4).join('; ');
            row.append(lem, pos, m); view.dict.append(row);
        }
        view.dict.hidden = !view.dict.childElementCount;
    }

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
            .dict { margin-top: 6px; font-size: 14.5px; line-height: 1.4; color: #374151; max-height: 6em; overflow: auto; }
            .dict[hidden] { display: none; }
            .dict .d + .d { margin-top: 2px; }
            .dict i { color: #6b7280; font-size: 13px; }
            button, select { font: inherit; min-height: 40px; border: 1px solid #d7dbe3; border-radius: 10px; background: #fff; color: inherit; padding: 0 10px; }
            button.icon { width: 40px; padding: 0; font-size: 18px; flex: none; }
            button.sent { border-color: #1a56db; color: #1a56db; font-weight: 600; }
            button.auto[aria-pressed="true"] { background: #1a56db; border-color: #1a56db; color: #fff; }
            button[hidden] { display: none; }
            .row { display: flex; gap: 8px; margin-top: 10px; align-items: center; flex-wrap: wrap; }
            .brand { margin-left: auto; font-size: 12px; color: #6b7280; }
            @media (prefers-color-scheme: dark) { .box { background: #1f2024; color: #f1f2f4; } .tr { color: #8fb0ff; } .dict { color: #d1d5db; } .dict i { color: #9ca3af; }
                button, select { background: #2a2b30; border-color: #3a3c43; } button.sent { color: #8fb0ff; border-color: #8fb0ff; } }
        </style>
        <div class="box" role="dialog" aria-live="polite">
            <div class="top"><div class="src"></div><button class="icon speak" type="button" aria-label="Слухати">🔊</button><button class="icon close" type="button" aria-label="Закрити">✕</button></div>
            <div class="tr"></div>
            <div class="dict" hidden></div>
            <div class="row"><button class="sent" type="button">Речення ⤢</button><button class="auto" type="button" aria-pressed="true">Авто 🔊</button><select class="tl" aria-label="Мова перекладу">${LANGS.map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select><span class="brand">AI E-book Reader</span></div>
        </div>`;
        view = { src: root.querySelector('.src'), tr: root.querySelector('.tr'), tl: root.querySelector('.tl'), speak: root.querySelector('.speak'),
            close: root.querySelector('.close'), sent: root.querySelector('.sent'), dict: root.querySelector('.dict'), auto: root.querySelector('.auto'), lang: 'fr' };
        const syncAuto = () => { const on = autoSpeak(); view.auto.setAttribute('aria-pressed', String(on)); view.auto.title = on ? 'Автоматичне озвучення: увімкнено' : 'Автоматичне озвучення: вимкнено'; };
        syncAuto();
        view.auto.addEventListener('click', () => { try { localStorage.setItem(SPEAK_KEY, autoSpeak() ? '0' : '1'); } catch (e) {} syncAuto(); });
        view.tl.value = readTl();
        view.close.addEventListener('click', hide);
        view.speak.addEventListener('click', () => speak(view.src.textContent, view.lang || SRC));
        view.tl.addEventListener('change', () => { try { localStorage.setItem(TL_KEY, view.tl.value); } catch (e) {} translateInto(view.src.textContent); });
        view.sent.addEventListener('click', () => {
            const s = current.sentence; if (!s) return;
            current.sentence = '';
            if (current.fromFrame) for (const f of document.querySelectorAll('iframe')) { try { f.contentWindow.postMessage({ pp: 'mark-sentence' }, ORIGIN); } catch (e) {} }
            else if (marked) mark(marked.sentenceRange, 'pp-sentence');
            show(s, '', current.fromFrame);
            if (autoSpeak()) speak(s);
        });
        // A tap inside the panel is ours, not the exercise's (and does not clear the selection that opened it).
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'click']) panel.addEventListener(type, e => e.stopPropagation());
        document.documentElement.appendChild(panel);
    }
    async function translateInto(text) {
        const my = ++token;
        view.src.textContent = text; view.tr.textContent = '…'; view.tr.classList.remove('err');
        view.dict.hidden = true;
        if (view.tl.value === 'uk' && !/\s/.test(text)) lookupDict(text).then(entries => { if (my === token) renderDict(entries); });
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
        if (sentence) translate(sentence, view.tl.value).catch(() => {});   // ready before «Речення ⤢» is pressed
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
            if (autoSpeak()) speak(text);
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
