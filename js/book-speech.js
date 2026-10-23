/* book-speech.js — the narration of a book made offline (tools/book_tts/generate.py, edge-tts): tap a word in a PDF and
 * hear that word from the chapter's audio; select a sentence and hear the sentence. The two files of one voice (the MP3 and
 * its JSON) are imported on this device from the book-audio dialog; they are kept in IndexedDB store «speech» of
 * reader-book-audio. Only the bytes of the sentence that is needed are decoded (Web Audio), never the whole book.
 *
 * The JSON holds, for every sentence: page, text, bytes [start, end) in the MP3, duration (s) and for every word the
 * character span in the sentence (s, e) and its time span in ms (start, end) from the sentence start.
 * "lexicon" (tools/book_tts/words.py): every word said on its own, appended to the MP3 — a tap on a word plays that, the
 * natural word; a selected sentence or fragment plays the sentence narration.
 * "timing": "aligned" (tools/book_tts/align.py) means the spans were measured on the audio and cut at the quiet point
 * between two words: they are played exactly. Older files carry the edge-tts estimates and get a small margin.
 * The pure helpers (bsWordKey, bsKeys, bsWordCues, bsPickCue, bsPhraseRun) are checked by tests/book_speech_test.mjs. */

const BS_STORE = 'speech';
const BS_MARGIN = 0.04;   // seconds of the neighbouring sound kept on each side of a word (estimated timings only)
const BS_FADE = 0.008;    // a short fade in/out so the cut makes no click
const BS_GAP = 0.25;      // the pause between two sentences of one selection
const BS_DECODED_MAX = 24;
const bsSets = { key: null, list: [] };   // the speech sets of the open book: { id, voice, audioName, sentences, blob }
const bsDecoded = new Map();              // «set#sentence» -> AudioBuffer, least recently used first
const bsPageCache = new Map();            // «set#page» -> the narration's words on that page, in reading order
let bsCtx = null, bsCurrent = null, bsLast = null;   // bsLast: what was played last ([{ i, from, to }]), for the tests
let bsSeq = 0;   // each tap or stop takes a number; a decode that ends after a newer one plays nothing
// What the narration and the piste marks decided on this device (the 📋 report, js/dictation.js): taps that played or
// fell to the system voice and why, imports, stored narrations. A tablet's problem can only be seen through this.
const bsTrace = [];
const bsStored = { speech: [], tracks: [], quota: null };   // book keys that have a narration / tracks on this device
function bsNote(ev, data) {
    bsTrace.push(Object.assign({ at: new Date().toISOString().slice(11, 23), ev }, data));
    if (bsTrace.length > 40) bsTrace.shift();
}
// A word as a tap takes it (js/selection.js isWordChar): letters and digits, with apostrophes and hyphens inside.
const BS_WORD = /[\p{L}\p{N}](?:[\p{L}\p{N}]|['’-](?=[\p{L}\p{N}]))*/gu;

// ---------- pure helpers ------------------------------------------------------------------------------------------------------------
// A word without its punctuation and spaces: «L'école,» -> «lécole».
function bsWordKey(s) { return String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''); }
// Keys of the same word: equal, or one ends with the other when the shorter one is at least 3 letters (an elision).
function bsSameWord(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    const [short, long] = a.length <= b.length ? [a, b] : [b, a];
    return short.length >= 3 && long.endsWith(short);
}
// The words of a text, as keys, in order.
function bsKeys(text) { return (String(text || '').match(BS_WORD) || []).map(bsWordKey).filter(Boolean); }
// The narration's words on a page, in reading order: [{ i (sentence index), j (word index), w (word entry), key }].
function bsPageWords(sentences, page) {
    const out = [];
    sentences.forEach((s, i) => {
        if (s.page !== page || !Array.isArray(s.words)) return;
        s.words.forEach((w, j) => { const key = bsWordKey(s.text.slice(w.s, w.e)); if (key) out.push({ i, j, w, key }); });
    });
    return out;
}
// Every occurrence of a word on a page, in reading order: [{ i (sentence index), w (word entry) }]. The same word only;
// an elision («l'école» for «école») is used when the page has no exact match.
function bsWordCues(sentences, page, word) {
    const key = bsWordKey(word);
    if (!key) return [];
    const words = bsPageWords(sentences, page);
    let hits = words.filter(x => x.key === key);
    if (!hits.length) hits = words.filter(x => bsSameWord(key, x.key));
    return hits.map(({ i, w }) => ({ i, w }));
}
// Which occurrence of the tapped word is meant: the one whose neighbours on the page match the neighbours of the tap
// (up to 4 words each side), then the one at the nearest relative place on the page. dom: the page's words as keys,
// at: the tapped word's index there (-1 when unknown). Returns an index into words, or -1.
function bsPickCue(words, dom, at, key) {
    let cand = [];
    words.forEach((x, n) => { if (x.key === key) cand.push(n); });
    if (!cand.length) words.forEach((x, n) => { if (bsSameWord(key, x.key)) cand.push(n); });
    if (!cand.length) return -1;
    if (cand.length === 1 || at < 0 || !dom.length) return cand[0];
    let best = cand[0], bestScore = -Infinity;
    for (const n of cand) {
        let score = 0;
        for (let d = 1; d <= 4; d++) {
            if (at - d >= 0 && n - d >= 0 && dom[at - d] === words[n - d].key) score += 1 / d;
            if (at + d < dom.length && n + d < words.length && dom[at + d] === words[n + d].key) score += 1 / d;
        }
        score -= Math.abs(n / words.length - at / dom.length);
        if (score > bestScore) { best = n; bestScore = score; }
    }
    return best;
}
// The run of the page's narration words that a selection covers: { from, to } (indices into words, inclusive), or null.
// The longest common run of words wins; a word cut by the selection's edge still counts when it begins or ends the same.
// Ties go to the run at the nearest relative place (pos: 0…1 on the page, or -1).
function bsPhraseRun(words, sel, pos) {
    if (!sel.length || !words.length) return null;
    let best = null;
    const prev = new Array(sel.length + 1).fill(0);
    for (let n = 1; n <= words.length; n++) {
        let diag = 0;
        for (let m = 1; m <= sel.length; m++) {
            const keep = prev[m];
            prev[m] = words[n - 1].key === sel[m - 1] ? diag + 1 : 0;
            diag = keep;
            const len = prev[m];
            if (!len) continue;
            const run = { from: n - len, to: n - 1, selFrom: m - len, selTo: m - 1, len };
            const place = pos < 0 ? 0 : Math.abs(run.from / words.length - pos);
            if (!best || len > best.len || (len === best.len && place < best.place)) best = { ...run, place };
        }
    }
    if (!best) return null;
    // a word half selected at either edge
    if (best.selFrom === 1 && best.from > 0 && words[best.from - 1].key.endsWith(sel[0])) { best.from--; best.selFrom--; best.len++; }
    const last = sel.length - 1;
    if (best.selTo === last - 1 && best.to < words.length - 1 && words[best.to + 1].key.startsWith(sel[last])) { best.to++; best.selTo++; best.len++; }
    // most of the selection must be in the narration (a heading or a caption the voice does not read is not played)
    if (best.len < Math.max(1, Math.ceil(sel.length * 0.6))) return null;
    return { from: best.from, to: best.to };
}

// ---------- storage -----------------------------------------------------------------------------------------------------------------
async function bsPut(record) {
    const db = await baDb(), tx = db.transaction(BS_STORE, 'readwrite');
    tx.objectStore(BS_STORE).put(record);
    await baTxDone(tx);
}
async function bsList(bookKey) {
    const db = await baDb();
    return baReq(db.transaction(BS_STORE, 'readonly').objectStore(BS_STORE).index('book').getAll(IDBKeyRange.only(bookKey)));
}
async function bsDelete(bookKey) {
    const db = await baDb(), tx = db.transaction(BS_STORE, 'readwrite'), store = tx.objectStore(BS_STORE);
    const ids = (await baReq(store.index('book').getAllKeys(IDBKeyRange.only(bookKey)))) || [];
    for (const id of ids) store.delete(id);
    await baTxDone(tx);
}

// Loads the speech sets of the open book; called after the book's audio has been refreshed.
async function bsRefresh() {
    const key = state.bookKey;
    bsSets.key = key;
    bsDecoded.clear();
    bsPageCache.clear();
    bsReadStored();
    if (!key) { bsSets.list = []; return; }
    try {
        const rows = await bsList(key);
        if (bsSets.key !== key) return;
        bsSets.list = rows.filter(r => r && Array.isArray(r.sentences) && r.blob);
        bsNote('refresh', { book: key, rows: rows.length, usable: bsSets.list.length });
    } catch (e) { bsSets.list = []; bsNote('refresh', { book: key, error: String(e && (e.name || e.message) || e) }); }
}
// For the report: which books have a narration or tracks here (the ids start with the book key), and the storage quota.
async function bsReadStored() {
    const bookOf = id => String(id).split('\u0000')[0];
    try {
        const db = await baDb();
        const ids = async store => (await baReq(db.transaction(store, 'readonly').objectStore(store).getAllKeys())) || [];
        bsStored.speech = (await ids(BS_STORE)).map(id => String(id).replace('\u0000', ' | '));
        bsStored.tracks = [...new Set((await ids(BA_STORE)).map(bookOf))];
    } catch (e) { bsStored.speech = ['error: ' + (e && (e.name || e.message))]; }
    try {
        const q = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
        if (q) bsStored.quota = { usedMB: Math.round(q.usage / 1048576), quotaMB: Math.round(q.quota / 1048576) };
    } catch (e) { /* unknown */ }
}
function bsReport() {
    const set = bsActiveSet();
    return {
        format: state.format, book: state.bookKey || null, pages: state.totalPages || null,
        narrations: bsSets.list.map(s => ({ voice: s.voice, sentences: s.sentences.length, timing: s.timing,
            words: s.lexicon ? Object.keys(s.lexicon).length : 0, mb: s.blob ? Math.round(s.blob.size / 1048576) : null })),
        active: set ? set.voice : null, audio: bsCtx ? bsCtx.state : 'not started',
        markers: document.querySelectorAll('.pdf-audio-marker').length,
        tracks: typeof bookAudio !== 'undefined' ? bookAudio.tracks.length : null,
        stored: bsStored, trace: bsTrace.slice()
    };
}
// The voice to use: the one chosen last on this device, else the first set.
function bsActiveSet() {
    if (!bsSets.list.length) return null;
    let voice = null;
    try { voice = localStorage.getItem('reader_speech_voice'); } catch (e) { /* not remembered */ }
    return bsSets.list.find(s => s.voice === voice) || bsSets.list[0];
}

// ---------- importing -----------------------------------------------------------------------------------------------------------------
// One file per voice (tools/book_tts/pack.py): an MP3 whose ID3v2 tag holds the JSON in a GEOB frame described
// «ai-ebook-reader-narration». Returns { meta, blob (the audio after the tag) } or null for any other file.
async function bsUnpack(file) {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (head.length < 10 || head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return null;   // «ID3»
    const safe = (u, i) => (u[i] << 21) | (u[i + 1] << 14) | (u[i + 2] << 7) | u[i + 3];
    const size = safe(head, 6), end = 10 + size;
    const tag = new Uint8Array(await file.slice(10, end).arrayBuffer());
    for (let i = 0; i + 10 <= tag.length && tag[i]; ) {
        const id = String.fromCharCode(tag[i], tag[i + 1], tag[i + 2], tag[i + 3]);
        const len = head[3] >= 4 ? safe(tag, i + 4) : ((tag[i + 4] << 24) | (tag[i + 5] << 16) | (tag[i + 6] << 8) | tag[i + 7]) >>> 0;
        const body = tag.subarray(i + 10, i + 10 + len);
        if (id === 'GEOB') {
            // encoding byte, then mime, file name and description, each ended by a zero byte (UTF-8), then the data
            let at = 1;
            const field = () => { const z = body.indexOf(0, at); const v = new TextDecoder().decode(body.subarray(at, z)); at = z + 1; return v; };
            field(); field();
            if (field() === 'ai-ebook-reader-narration') {
                try { return { meta: JSON.parse(new TextDecoder().decode(body.subarray(at))), blob: file.slice(end) }; } catch (e) { return null; }
            }
        }
        i += 10 + len;
    }
    return null;
}
function bsValidMeta(meta) { return !!meta && Array.isArray(meta.sentences) && meta.sentences.length > 0 && !!meta.voice; }

let bsImporting = false;
// Imports narrations for the open book: one-file narrations (several voices at once) or an MP3 + JSON pair.
async function bsImport(fileList) {
    const key = state.bookKey;
    const files = Array.from(fileList || []);
    bsNote('import', { book: key || null, busy: bsImporting, files: files.map(f => [f.name, f.type, Math.round(f.size / 1048576) + ' MB']) });
    if (!key || bsImporting) return;
    const jsonFile = files.find(f => /\.json$/i.test(f.name)), mp3s = files.filter(f => /\.mp3$/i.test(f.name));
    bsImporting = true;
    try {
        const items = [];
        if (jsonFile) {
            let meta = null;
            try { meta = JSON.parse(await jsonFile.text()); } catch (e) { meta = null; }
            if (!bsValidMeta(meta)) { showToast(t('spkBadJson')); return; }
            const mp3 = mp3s.find(f => f.name === meta.audio);
            if (!mp3) { showToast(t('spkMismatch').replace('{audio}', meta.audio || '?')); return; }
            items.push({ meta, blob: mp3, name: mp3.name });
        }
        for (const f of mp3s) {
            if (items.some(x => x.name === f.name)) continue;
            const packed = await bsUnpack(f);
            if (packed && bsValidMeta(packed.meta)) items.push({ ...packed, name: f.name });
        }
        if (!items.length) { bsNote('import-refused', { why: 'not a narration' }); showToast(t('spkNeedBoth')); return; }
        // a narration made for another book: its page count differs from the open PDF's
        const other = items.find(x => x.meta.pdf && x.meta.pdf.pages && state.format === 'pdf' && state.totalPages && x.meta.pdf.pages !== state.totalPages);
        if (other) { bsNote('import-refused', { why: 'another book', its: other.meta.pdf, open: state.totalPages }); showToast(t('spkWrongBook').replace('{book}', other.meta.pdf.name || '?')); return; }
        for (const { meta, blob, name } of items) {
            await bsPut({ id: key + '\u0000' + meta.voice, bookKey: key, voice: meta.voice, audioName: name,
                timing: meta.timing === 'aligned' ? 'aligned' : 'estimated', sentences: meta.sentences,
                lexicon: meta.lexicon && typeof meta.lexicon === 'object' ? meta.lexicon : null, blob });
        }
        await bsRefresh();
        bsNote('import-saved', { voices: items.map(x => x.meta.voice) });
        const last = items[items.length - 1].meta;
        renderBookAudioDialog(t('spkSaved').replace('{voice}', items.map(x => x.meta.voice).join(', ')).replace('{n}', last.sentences.length));
    } catch (e) {
        bsNote('import-failed', { error: String(e && (e.name + ': ' + e.message) || e) });
        showToast(t('spkFailed'));
    } finally { bsImporting = false; }
}

// ---------- playing -------------------------------------------------------------------------------------------------------------------
function bsContext() {
    if (!bsCtx) bsCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (bsCtx.state === 'suspended') bsCtx.resume().catch(() => {});
    return bsCtx;
}
// index: a sentence; or a word said on its own, given as its key («@maroc», the set's lexicon).
async function bsDecode(set, index) {
    const id = set.id + '#' + index;
    if (bsDecoded.has(id)) { const buf = bsDecoded.get(id); bsDecoded.delete(id); bsDecoded.set(id, buf); return buf; }
    const [a, b] = typeof index === 'string' ? set.lexicon[index.slice(1)].bytes : set.sentences[index].bytes;
    const buf = await bsContext().decodeAudioData(await set.blob.slice(a, b).arrayBuffer());
    bsDecoded.set(id, buf);
    if (bsDecoded.size > BS_DECODED_MAX) bsDecoded.delete(bsDecoded.keys().next().value);
    return buf;
}
function bsStop() {
    bsSeq++;   // a tap still decoding must not start after the stop
    if (!bsCurrent) return;
    for (const src of bsCurrent) { try { src.stop(); } catch (e) { /* already ended */ } }
    bsCurrent = null;
}
// Plays pieces of decoded sentences one after another: [{ buf, from, to }] in seconds of each buffer.
function bsPlay(pieces) {
    const ctx = bsContext();
    bsStop();
    const sources = [];
    let at = ctx.currentTime + 0.01;
    for (const { buf, from, to } of pieces) {
        const start = Math.max(0, from), dur = Math.max(0.05, Math.min(to, buf.duration) - start);
        const src = ctx.createBufferSource(), gain = ctx.createGain(), fade = Math.min(BS_FADE, dur / 3);
        src.buffer = buf;
        src.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(1, at + fade);
        gain.gain.setValueAtTime(1, at + dur - fade);
        gain.gain.linearRampToValueAtTime(0, at + dur);
        src.start(at, start, dur);
        sources.push(src);
        at += dur + BS_GAP;
    }
    const last = sources[sources.length - 1];
    if (last) last.onended = () => { if (bsCurrent === sources) bsCurrent = null; };
    bsCurrent = sources;
}
function bsPageOf(node) {
    const el = node && node.nodeType === 3 ? node.parentElement : node;
    const wrap = el && el.closest ? el.closest('.pdf-page-wrapper') : null;
    return wrap ? { wrap, page: Number(wrap.dataset.page) } : null;
}
function bsWordsOn(set, page) {
    const id = set.id + '#' + page;
    if (!bsPageCache.has(id)) {
        if (bsPageCache.size > 64) bsPageCache.clear();
        bsPageCache.set(id, bsPageWords(set.sentences, page));
    }
    return bsPageCache.get(id);
}
// The page's printed words (its text layer) as keys, and the index of the first word inside node (-1 when not found).
// glued[k]: word k follows word k-1 with no space between them (a word printed in pieces, e.g. «fin» + a coloured «is»).
function bsDomWords(wrap, node) {
    const root = wrap.querySelector('.pdf-text-layer') || wrap;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const keys = [], glued = [];
    let at = -1, open = false;   // open: the text so far ends inside a word
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        const text = t.nodeValue || '';
        if (!text) continue;
        const inside = at < 0 && node && (node === t || (node.contains && node.contains(t)));
        if (inside) at = keys.length;
        for (const m of text.matchAll(BS_WORD)) {
            const key = bsWordKey(m[0]);
            if (!key) continue;
            glued.push(m.index === 0 && open && keys.length > 0);
            keys.push(key);
        }
        open = /[\p{L}\p{N}]$/u.test(text);
    }
    return { keys, at, glued };
}
// The start and the end (s) of narration word x as it is played.
function bsSpan(set, x) {
    const margin = set.timing === 'aligned' ? 0 : BS_MARGIN;
    return [x.w.start / 1000 - margin, x.w.end / 1000 + margin];
}

// The cue of the tapped word in the active narration, or null: { set, x } (x: one of bsPageWords).
function bsWordCue(node, word) {
    const set = bsActiveSet();
    const where = bsPageOf(node);
    const key = bsWordKey(word);
    if (!set || !where || !key) return null;
    const words = bsWordsOn(set, where.page);
    if (!words.length) return null;
    const dom = bsDomWords(where.wrap, node);
    let n = bsPickCue(words, dom.keys, dom.at, key);
    if (n < 0 && dom.at >= 0) {
        // a piece of a word printed in pieces: the narration reads the whole word
        let a = dom.at, b = dom.at;
        while (a > 0 && dom.glued[a]) a--;
        while (b + 1 < dom.keys.length && dom.glued[b + 1]) b++;
        if (a < b) n = bsPickCue(words, dom.keys, a, dom.keys.slice(a, b + 1).join(''));
    }
    return n < 0 ? null : { set, x: words[n] };
}
// Synchronous: does the narration cover this tap? (The app's own voice must then stay silent: translation.js.)
function bsCanWord(node, word) { return !!bsWordCue(node, word) || !!bsAlone(bsActiveSet(), node, bsWordKey(word)); }
// The word said on its own (tools/book_tts/words.py), for a tap in a PDF page: { key, entry } or null.
function bsAlone(set, node, key) {
    const entry = set && set.lexicon && key && Object.prototype.hasOwnProperty.call(set.lexicon, key) ? set.lexicon[key] : null;
    return entry && bsPageOf(node) ? { key, entry } : null;
}

// Plays the tapped word: said on its own when the narration has it so (as if there were no other text), else cut from
// the speech of its sentence. Returns false when the narration does not cover the word.
async function bsTapWord(node, word) {
    const found = bsWordCue(node, word);
    const set = found ? found.set : bsActiveSet();
    const alone = bsAlone(set, node, found ? found.x.key : bsWordKey(word));
    if (!found && !alone) return false;
    const seq = ++bsSeq;
    try {
        if (alone) {
            const buf = await bsDecode(set, '@' + alone.key), from = alone.entry.start / 1000, to = alone.entry.end / 1000;
            if (seq !== bsSeq) return true;   // a newer tap (the expand button, another word) plays instead
            bsPlay([{ buf, from, to }]);
            bsLast = [{ word: alone.key, from, to }];
            return true;
        }
        const buf = await bsDecode(found.set, found.x.i);
        if (seq !== bsSeq) return true;
        const [from, to] = bsSpan(found.set, found.x);
        bsPlay([{ buf, from, to }]);
        bsLast = [{ i: found.x.i, from, to }];
        return true;
    } catch (e) { bsNote('play-failed', { word, error: String(e && (e.name + ': ' + e.message) || e) }); return false; }
}

// What a selection plays: [{ i (sentence), from, to (s) }] in reading order, or null when the narration does not cover it.
// A whole sentence plays from its first sound to its last; a part of a sentence plays exactly its words.
function bsPhrasePlan(node, text) {
    const set = bsActiveSet();
    const where = bsPageOf(node);
    if (!set || !where) return null;
    const words = bsWordsOn(set, where.page), sel = bsKeys(text);
    if (!words.length || !sel.length) return null;
    const dom = bsDomWords(where.wrap, node);
    const run = bsPhraseRun(words, sel, dom.at < 0 || !dom.keys.length ? -1 : dom.at / dom.keys.length);
    if (!run) return null;
    const plan = [];
    for (let n = run.from; n <= run.to; n++) {
        const x = words[n], [from, to] = bsSpan(set, x), last = plan[plan.length - 1];
        if (last && last.i === x.i) last.to = to;
        else plan.push({ i: x.i, from, to });
    }
    // a whole sentence of estimated timings keeps its own start and end (the estimates are least sure at the edges)
    if (set.timing !== 'aligned') {
        for (const p of plan) {
            const s = set.sentences[p.i];
            const covered = words.filter(x => x.i === p.i);
            if (bsSpan(set, covered[0])[0] === p.from && bsSpan(set, covered[covered.length - 1])[1] === p.to) { p.from = 0; p.to = s.duration; }
        }
    }
    return { set, plan };
}
function bsCanPhrase(node, text) { return !!bsPhrasePlan(node, text); }

// Plays a selection (a part of a sentence, a sentence or several). Returns false when the narration does not cover it.
async function bsTapPhrase(node, text) {
    const found = bsPhrasePlan(node, text);
    if (!found) return false;
    const seq = ++bsSeq;
    try {
        const pieces = [];
        for (const p of found.plan) pieces.push({ buf: await bsDecode(found.set, p.i), from: p.from, to: p.to });
        if (seq !== bsSeq) return true;
        bsPlay(pieces);
        bsLast = found.plan;
        return true;
    } catch (e) { bsNote('play-failed', { text: String(text).slice(0, 40), error: String(e && (e.name + ': ' + e.message) || e) }); return false; }
}

// One entry for the reader (js/selection.js): plays what a PDF tap or selection means in the narration and returns,
// synchronously, whether it does — the app's own voice then stays silent for it (translation.js).
function bsSpeakTap(node, text, isWord) {
    const note = why => bsNote('tap', { word: !!isWord, text: String(text || '').slice(0, 40), why });
    if (state.format !== 'pdf') return false;
    if (!bsSets.list.length) { note('no narration for this book'); return false; }
    if (!bsPageOf(node)) { note('not on a PDF page'); return false; }
    if (isWord ? !bsCanWord(node, text) : !bsCanPhrase(node, text)) { note('not in the narration'); return false; }
    note('narration');
    if (isWord) bsTapWord(node, text); else bsTapPhrase(node, text);
    return true;
}

// ---------- i18n ----------------------------------------------------------------------------------------------------------------------------
Object.assign(I18N, {
    spkPick: { uk: '🗣️ Озвучка книги', en: '🗣️ Book narration', fr: '🗣️ Narration du livre', ru: '🗣️ Озвучка книги', es: '🗣️ Narración del libro' },
    spkRemove: { uk: 'Видалити озвучку', en: 'Remove narration', fr: 'Supprimer la narration', ru: 'Удалить озвучку', es: 'Eliminar la narración' },
    spkNeedBoth: { uk: 'Це не файл озвучки. Виберіть файл озвучки .mp3 (або пару .mp3 + .json).', en: 'Not a narration file. Choose a narration .mp3 (or an .mp3 + .json pair).', fr: 'Ce n’est pas un fichier de narration. Choisissez un .mp3 de narration (ou une paire .mp3 + .json).', ru: 'Это не файл озвучки. Выберите файл озвучки .mp3 (или пару .mp3 + .json).', es: 'No es un archivo de narración. Elija un .mp3 de narración (o un par .mp3 + .json).' },
    spkWrongBook: { uk: 'Ця озвучка для іншої книги: {book}. Відкрийте її і підключіть там.', en: 'This narration belongs to another book: {book}. Open that book and add it there.', fr: 'Cette narration appartient à un autre livre : {book}. Ouvrez ce livre et ajoutez-la là.', ru: 'Эта озвучка для другой книги: {book}. Откройте её и подключите там.', es: 'Esta narración es de otro libro: {book}. Abra ese libro y añádala allí.' },
    spkBadJson: { uk: 'Це не файл озвучки: не вдалося прочитати JSON.', en: 'Not a narration file: the JSON could not be read.', fr: 'Ce n’est pas un fichier de narration : JSON illisible.', ru: 'Это не файл озвучки: JSON не читается.', es: 'No es un archivo de narración: no se pudo leer el JSON.' },
    spkMismatch: { uk: 'JSON описує файл {audio}. Виберіть саме цей MP3.', en: 'The JSON describes the file {audio}. Choose that MP3.', fr: 'Le JSON décrit le fichier {audio}. Choisissez ce MP3.', ru: 'JSON описывает файл {audio}. Выберите этот MP3.', es: 'El JSON describe el archivo {audio}. Elija ese MP3.' },
    spkSaved: { uk: 'Озвучку збережено: голос {voice}, речень: {n}.', en: 'Narration saved: voice {voice}, sentences: {n}.', fr: 'Narration enregistrée : voix {voice}, phrases : {n}.', ru: 'Озвучка сохранена: голос {voice}, предложений: {n}.', es: 'Narración guardada: voz {voice}, frases: {n}.' },
    spkFailed: { uk: 'Не вдалося зберегти озвучку на цьому пристрої.', en: 'The narration could not be saved on this device.', fr: 'La narration n’a pas pu être enregistrée sur cet appareil.', ru: 'Озвучку не удалось сохранить на этом устройстве.', es: 'No se pudo guardar la narración en este dispositivo.' },
    spkCount: { uk: 'Озвучка: {n} речень', en: 'Narration: {n} sentences', fr: 'Narration : {n} phrases', ru: 'Озвучка: {n} предложений', es: 'Narración: {n} frases' },
});

// ---------- dialog wiring (called from book-audio.js) ------------------------------------------------------------------------------------
async function bsRemoveFromDialog() {
    if (!state.bookKey) return;
    stopBookAudio();
    bsStop();
    try { await bsDelete(state.bookKey); } catch (e) { /* nothing to remove */ }
    await bsRefresh();
    renderBookAudioDialog('');
}
