// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
/* proxy-assets/dict-worker.js — the app's offline French → Ukrainian dictionary (dict/fr-uk.json, built by
 * tools/build_dict_fr_uk.py) for pages shown through the reading proxy (proxy-assets/translate.js).
 *
 * Owner, 2026-11-21: a tapped word should not wait for the network. The file (7.8 MB, ~2 MB on the wire) is fetched
 * once into this host's Cache Storage and refreshed at most weekly; parsing it here keeps the page responsive. Lookup
 * is the same as js/offline-dict.js offlineDictLookup: binary search over the blocks' first keys, then the front-coded
 * block; a form gives its lemmas (part of speech, gender, meanings).
 *
 * Messages: { id, word } → { id, entries: [{ lemma, pos, gender, meanings: [uk] }] } (empty when unknown or not loaded).
 */
const DICT_URL = '/dict/fr-uk.json', CACHE = 'pp-dict-v1', MAX_AGE_MS = 7 * 24 * 3600 * 1000;
let dict = null;

async function fetchDict() {
    let cache = null;
    try { cache = await caches.open(CACHE); } catch (e) {}
    const cached = cache && await cache.match(DICT_URL);
    const age = cached ? Date.now() - Number(cached.headers.get('x-pp-saved') || 0) : Infinity;
    if (cached && age < MAX_AGE_MS) return cached.json();
    try {
        const res = await fetch(DICT_URL, { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const body = await res.blob();
        if (cache) await cache.put(DICT_URL, new Response(body, { headers: { 'content-type': 'application/json', 'x-pp-saved': String(Date.now()) } }));
        return JSON.parse(await body.text());
    } catch (e) {
        if (cached) return cached.json();   // offline: last week's copy is still a dictionary
        throw e;
    }
}
const ready = fetchDict().then(data => {
    if (!data || data.format !== 1 || !Array.isArray(data.heads) || !Array.isArray(data.index)) return null;
    dict = { heads: data.heads, blocks: data.index, lemmas: data.lemmas, pos: data.pos };
    return dict;
}).catch(() => null);

// As tools/build_dict_fr_uk.py norm().
const norm = w => String(w).trim().toLowerCase().normalize('NFC').replace(/’/g, "'").replace(/œ/g, 'oe').replace(/æ/g, 'ae');
function lemmaAt(i) {
    const [lemma, pos, gender, freq, meanings] = String(dict.lemmas[i] || '').split('\t');
    return { lemma, pos, gender, freq: +freq || 0, meanings: meanings ? meanings.split(';').map(m => m.split('|').map(x => x.trim()).filter(Boolean).join(' / ')).filter(Boolean) : [] };
}
function lookup(word) {
    if (!dict) return [];
    const key = norm(word), heads = dict.heads;
    let lo = 0, hi = heads.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (heads[mid] <= key) lo = mid; else hi = mid - 1; }
    if (!heads.length || heads[lo] > key) return [];
    let prev = '';
    for (const [n, row] of dict.blocks[lo].split('\n').entries()) {
        const full = n ? prev.slice(0, parseInt(row[0], 36)) + row.slice(1) : row;
        prev = full;
        const tab = full.indexOf('\t'), form = full.slice(0, tab);
        // The most frequent reading first: «féminins» is «жіночий» (adjective) before «жіночий рід».
        if (form === key) return full.slice(tab + 1).split(',').map(x => lemmaAt(parseInt(x, 16))).filter(e => e.lemma && e.meanings.length).sort((a, b) => b.freq - a.freq);
        if (form > key) break;
    }
    return [];
}
self.onmessage = async e => {
    const { id, word } = e.data || {};
    await ready;
    let entries = lookup(word);
    // «L'école», «qu'il»: the word after an elided article or pronoun.
    if (!entries.length && /^[a-z]{1,3}['’]/i.test(word)) entries = lookup(String(word).replace(/^[a-z]{1,3}['’]/i, ''));
    self.postMessage({ id, entries: entries.slice(0, 3), loaded: !!dict });
};
