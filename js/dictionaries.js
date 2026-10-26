// ========== FREE DICTIONARIES (Wiktionary, Wikipedia) ==========
// Owner, 2026-10-26: free dictionaries that work by themselves, no switch and no key. After a word's translation is shown,
// the word popup gets the Wiktionary entry of the word in the book's language (part of speech and its first meanings;
// a conjugated form says what it is a form of: «suis» → «first-person singular present indicative of être»), and, for a
// name (a capitalised word) or a word Wiktionary lacks, the first lines of its Wikipedia article. Online only; any failure is
// silent (the translation stays as it is). Both APIs are public, keyless and send CORS headers (connect-src in _headers).
// Their HTML is never inserted: it is reduced to plain text and escaped.

const DICT_TIMEOUT_MS = 6000;
const DICT_MIN_ROOM = 48;   // px on the block's side of the popup, at least
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

// The Wiktionary entry of word in the first of langs (two letters each) that has one: { html, lang } or null.
async function dictWiktionary(word, langs, signal) {
    const data = await dictFetchJson('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(word), signal);
    for (const lang of langs) {
        const entries = data && Array.isArray(data[lang]) ? data[lang] : [];
        const rows = [];
        for (const entry of entries.slice(0, DICT_MAX_POS)) {
            const senses = (entry.definitions || []).map(d => dictPlain(d.definition)).filter(Boolean).slice(0, DICT_MAX_SENSES);
            if (senses.length) rows.push(`<div class="tt-sense"><span class="tt-pos">${escapeHtml(entry.partOfSpeech || '')}</span> ${escapeHtml(senses.join('; '))}</div>`);
        }
        if (rows.length) return { html: rows.join(''), lang };
    }
    return null;
}

// The first lines of the Wikipedia article titled word in lang, or ''.
async function dictWikipedia(word, lang, signal) {
    const data = await dictFetchJson(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/` + encodeURIComponent(word), signal);
    if (!data || data.type !== 'standard' || !data.extract) return '';
    let text = String(data.extract).replace(/\s+/g, ' ').trim();
    if (text.length > DICT_WIKI_CHARS) text = text.slice(0, DICT_WIKI_CHARS).replace(/\s+\S*$/, '') + '…';
    return `<div class="tt-sense">${escapeHtml(text)}</div>`;
}

// The dictionaries' block for one word, or '' (cached per word and languages). langs: the word's language first, then the
// book's (one short word is often detected wrongly: «suis» alone looks English).
async function dictBlock(word, langs, signal) {
    const w = String(word || '').trim();
    langs = [...new Set((Array.isArray(langs) ? langs : [langs]).map(l => String(l || '').slice(0, 2).toLowerCase()))].filter(l => /^[a-z]{2}$/.test(l));
    if (!w || !langs.length || !/^[\p{L}'’-]{2,40}$/u.test(w)) return '';
    const key = langs.join(',') + '|' + w;
    if (dictCache.has(key)) return dictCache.get(key);
    const name = /^\p{Lu}/u.test(w);
    let wikt = await dictWiktionary(w, langs, signal).catch(() => null);
    if (!wikt && name) wikt = await dictWiktionary(w.toLowerCase(), langs, signal).catch(() => null);
    const wikiLang = wikt ? wikt.lang : langs[langs.length - 1];
    const wiki = name || !wikt ? await dictWikipedia(w, wikiLang, signal).catch(() => '') : '';
    let html = '';
    if (wikt) html += `<div class="tt-extra tt-dict"><div class="tt-dict-src">📖 Wiktionary</div>${wikt.html}</div>`;
    if (wiki) html += `<div class="tt-extra tt-dict"><div class="tt-dict-src">🌐 Wikipedia</div>${wiki}</div>`;
    if (!signal || !signal.aborted) dictCache.set(key, html);
    if (dictCache.size > 500) dictCache.delete(dictCache.keys().next().value);
    return html;
}

function dictHost() { return document.getElementById('tt-dict-host'); }
// Clears the block; a popup that grew upwards for it goes back down by as much (its buttons stay where they were).
function clearDictionaries() {
    const host = dictHost();
    if (!host || !host.firstChild) return;
    const shift = Number(host.dataset.shift || 0);
    host.textContent = '';
    host.dataset.shift = '';
    if (shift) els.tooltip.style.top = (parseFloat(els.tooltip.style.top) + shift) + 'px';
}
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
    const book = typeof pageLang === 'function' ? pageLang() : '';
    let html = '';
    try { html = await dictBlock(word, [lang, book], signal); } catch (e) { return; }
    const host = dictHost();
    if (!html || !host || lookupToken !== state.lookupToken || (signal && signal.aborted)) return;
    if (els.tooltip.style.display === 'none' || dictPanelOpen()) return;
    // The popup's buttons and translation never move (a late block must not shift a button under the finger or the
    // pointer): the block grows AWAY from the word. A popup above the word (or docked at the foot of a phone) gets it
    // on top and grows upwards; a popup below the word gets it at the foot and grows downwards. Only the room left on
    // that side is used (scrolling inside); with too little room it is not shown.
    const box = els.tooltip.getBoundingClientRect();
    const up = els.tooltip.classList.contains('tooltip-above') || innerWidth <= 600;
    const room = Math.min(innerHeight * 0.3, up ? box.top - 10 : innerHeight - 10 - box.bottom);
    if (room < DICT_MIN_ROOM) return;
    host.classList.toggle('tt-dict-up', up);
    host.style.maxHeight = Math.floor(room) + 'px';
    host.innerHTML = html;
    if (up) {
        const shift = els.tooltip.getBoundingClientRect().height - box.height;
        host.dataset.shift = String(shift);
        els.tooltip.style.top = (parseFloat(els.tooltip.style.top) - shift) + 'px';
    }
}
