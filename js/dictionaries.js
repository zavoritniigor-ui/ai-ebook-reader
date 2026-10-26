// ========== FREE DICTIONARIES (Wiktionary, Wikipedia) ==========
// Owner, 2026-10-26: free dictionaries that work by themselves, no switch and no key. After a word's translation is shown,
// the word popup gets the Wiktionary entry of the word in the book's language (part of speech and its first meanings;
// a conjugated form says what it is a form of: «suis» → «first-person singular present indicative of être»), and, for a
// name (a capitalised word) or a word Wiktionary lacks, the first lines of its Wikipedia article. Online only; any failure is
// silent (the translation stays as it is). Both APIs are public, keyless and send CORS headers (connect-src in _headers).
// Their HTML is never inserted: it is reduced to plain text and escaped.

const DICT_TIMEOUT_MS = 6000;
const DICT_MIN_ROOM = 64;   // px below the popup, at least, for the block
const DICT_MAX_POS = 2, DICT_MAX_SENSES = 3, DICT_WIKI_CHARS = 220;
const dictCache = new Map();   // 'lang|word' → html ('' = nothing found)

function dictPlain(html) {
    const doc = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
    doc.body.querySelectorAll('style, script').forEach(n => n.remove());   // Wiktionary inlines its CSS in definitions
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

async function dictFetchJson(url, signal) {
    const ctrl = new AbortController();
    const stop = () => ctrl.abort();
    if (signal) { if (signal.aborted) stop(); else signal.addEventListener('abort', stop, { once: true }); }
    const timer = setTimeout(stop, DICT_TIMEOUT_MS);
    try {
        const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
        return r.ok ? await r.json() : null;
    } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', stop);
    }
}

// The Wiktionary entry of word in lang (two letters) as html rows, or ''.
async function dictWiktionary(word, lang, signal) {
    const data = await dictFetchJson('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(word), signal);
    const entries = data && Array.isArray(data[lang]) ? data[lang] : [];
    const rows = [];
    for (const entry of entries.slice(0, DICT_MAX_POS)) {
        const senses = (entry.definitions || []).map(d => dictPlain(d.definition)).filter(Boolean).slice(0, DICT_MAX_SENSES);
        if (senses.length) rows.push(`<div class="tt-sense"><span class="tt-pos">${escapeHtml(entry.partOfSpeech || '')}</span> ${escapeHtml(senses.join('; '))}</div>`);
    }
    return rows.join('');
}

// The first lines of the Wikipedia article titled word in lang, or ''.
async function dictWikipedia(word, lang, signal) {
    const data = await dictFetchJson(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/` + encodeURIComponent(word), signal);
    if (!data || data.type !== 'standard' || !data.extract) return '';
    let text = String(data.extract).replace(/\s+/g, ' ').trim();
    if (text.length > DICT_WIKI_CHARS) text = text.slice(0, DICT_WIKI_CHARS).replace(/\s+\S*$/, '') + '…';
    return `<div class="tt-sense">${escapeHtml(text)}</div>`;
}

// The dictionaries' block for one word, or '' (cached per word and language).
async function dictBlock(word, lang, signal) {
    const w = String(word || '').trim();
    if (!w || !/^[a-z]{2}$/.test(lang || '') || !/^[\p{L}'’-]{2,40}$/u.test(w)) return '';
    const key = lang + '|' + w;
    if (dictCache.has(key)) return dictCache.get(key);
    const name = /^\p{Lu}/u.test(w);
    const [wikt, wiki] = await Promise.all([
        dictWiktionary(w, lang, signal).catch(() => '')
            .then(html => html || (name ? dictWiktionary(w.toLowerCase(), lang, signal).catch(() => '') : '')),
        name ? dictWikipedia(w, lang, signal).catch(() => '') : Promise.resolve(''),
    ]);
    const wikiNow = wiki || (!wikt && !name ? await dictWikipedia(w, lang, signal).catch(() => '') : '');
    let html = '';
    if (wikt) html += `<div class="tt-extra tt-dict"><div class="tt-dict-src">📖 Wiktionary</div>${wikt}</div>`;
    if (wikiNow) html += `<div class="tt-extra tt-dict"><div class="tt-dict-src">🌐 Wikipedia</div>${wikiNow}</div>`;
    if (!signal || !signal.aborted) dictCache.set(key, html);
    if (dictCache.size > 500) dictCache.delete(dictCache.keys().next().value);
    return html;
}

function dictHost() { return document.getElementById('tt-dict-host'); }
function clearDictionaries() { const host = dictHost(); if (host) host.textContent = ''; }
// A side panel (Ask AI, Grammar) open: the reader has moved on from the word; on a phone a taller popup would cover the panel.
function dictPanelOpen() {
    return ['ask-panel', 'grammar-panel'].some(id => { const p = document.getElementById(id); return !!p && p.classList.contains('expanded'); });
}
// A button of the popup (Ask AI, Grammar, Structure) takes the reader on: the dictionaries step aside at once.
// (pointerdown: a touch tap on these buttons gives no click.) A side panel opening by any way does the same.
document.addEventListener('pointerdown', e => { if (e.target && e.target.closest && e.target.closest('#word-tooltip .tt-actions')) clearDictionaries(); }, true);
if (typeof MutationObserver === 'function') {
    const watch = () => ['ask-panel', 'grammar-panel'].forEach(id => {
        const p = document.getElementById(id);
        if (p) new MutationObserver(() => { if (dictPanelOpen()) clearDictionaries(); }).observe(p, { attributes: true, attributeFilter: ['class'] });
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch, { once: true }); else watch();
}

// Adds the dictionaries at the foot of the word popup (#tt-dict-host, below its buttons, outside #tt-translation: the translation's
// own text, spoken and cached, stays as it is), when that lookup is still the one shown.
async function appendDictionaries(word, lang, lookupToken, signal) {
    clearDictionaries();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    let html = '';
    try { html = await dictBlock(word, lang, signal); } catch (e) { return; }
    const host = dictHost();
    if (!html || !host || lookupToken !== state.lookupToken || (signal && signal.aborted)) return;
    if (els.tooltip.style.display === 'none' || dictPanelOpen()) return;
    // The popup never moves for the dictionaries (a moved popup would stay over what the reader taps next): the block takes
    // only the room left below it, scrolling inside; with too little room it is not shown.
    // A popup above the word must not grow over it (the word, and the pointer resting on it, would be covered).
    const bottom = els.tooltip.getBoundingClientRect().bottom, a = state.tooltipAnchor;
    const wordTop = a ? (a.anchorRect ? a.anchorRect.top : a.clientY - 12) : Infinity;
    const limit = wordTop >= bottom - 1 ? wordTop - 8 : innerHeight - 12;
    const room = Math.min(innerHeight * 0.32, limit - bottom);
    if (room < DICT_MIN_ROOM) return;
    host.style.maxHeight = Math.floor(room) + 'px';
    host.innerHTML = html;
}
