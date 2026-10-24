/* book-speech.js — the narration of a book made offline (tools/book_tts/generate.py, edge-tts): tap a word in a PDF and
 * hear that word from the chapter's audio; select a sentence and hear the sentence. The two files of one voice (the MP3 and
 * its JSON) are imported on this device from the book-audio dialog; they are kept in IndexedDB store «speech» of
 * reader-book-audio. Only the bytes of the sentence that is needed are decoded (Web Audio), never the whole book.
 *
 * The JSON holds, for every sentence: page, text, bytes [start, end) in the MP3, duration (s) and for every word the
 * character span in the sentence (s, e) and its time span in ms (start, end) from the sentence start.
 * "lexicon" (tools/book_tts/words.py): every word said on its own, appended to the MP3 — a tap on a word plays that, the
 * natural word, and a selected part of a sentence plays its words said alone, one after another. Only a whole sentence plays
 * the sentence narration: a piece cut out of it carries the melody of the whole sentence (falling, rising) and sounds broken.
 * A word the lexicon lacks is never cut from its sentence: the system voice reads that tap or selection instead.
 * "timing": "aligned" (tools/book_tts/align.py) means the spans were measured on the audio and cut at the quiet point
 * between two words: they are played exactly. Older files carry the edge-tts estimates and get a small margin.
 * The pure helpers (bsWordKey, bsKeys, bsWordCues, bsPickCue, bsPhraseRun) are checked by tests/book_speech_test.mjs. */

const BS_STORE = 'speech';
const BS_MARGIN = 0.04;   // seconds of the neighbouring sound kept on each side of a word (estimated timings only)
const BS_FADE = 0.008;    // a short fade in/out so the cut makes no click
const BS_GAP = 0.25;      // the pause between two sentences of one selection
const BS_WORD_GAP = 0.08; // the pause between two words said alone (a selected part of a sentence)
const BS_DECODED_MAX = 24;
const bsSets = { key: null, list: [], global: [] };   // the speech sets of the open book: { id, voice, audioName, sentences, blob };
// global: narrations imported as pronunciation dictionaries for every book (Bescherelle), stored under BS_GLOBAL
const BS_GLOBAL = '\u0001dictionary';
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
    try { bsSets.global = (await bsList(BS_GLOBAL)).filter(r => r && Array.isArray(r.sentences) && r.blob); }
    catch (e) { bsSets.global = []; }
    if (!key) { bsSets.list = []; return; }
    try {
        const rows = await bsList(key);
        if (bsSets.key !== key) return;
        bsSets.list = rows.filter(r => r && Array.isArray(r.sentences) && r.blob);
        bsNote('refresh', { book: key, rows: rows.length, usable: bsSets.list.length, dictionaries: bsSets.global.length });
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
        dictionaries: bsSets.global.map(s => ({ voice: s.voice, name: s.audioName, sentences: s.sentences.length, words: s.lexicon ? Object.keys(s.lexicon).length : 0 })),
        active: set ? set.voice : null, audio: bsCtx ? bsCtx.state : 'not started',
        markers: document.querySelectorAll('.pdf-audio-marker').length,
        tracks: typeof bookAudio !== 'undefined' ? bookAudio.tracks.length : null,
        stored: bsStored, trace: bsTrace.slice()
    };
}
// The language a narration's voice speaks: «fr-CA-SylvieNeural» → fr, Kokoro «kokoro:ff_siwis» → fr, «kokoro:af_heart» → en.
function bsVoiceLang(voice) {
    const v = String(voice || '').replace(/^kokoro:/, '');
    const m = v.match(/^([a-z]{2})-[A-Z]{2}-/);
    if (m) return m[1];
    return ({ a: 'en', b: 'en', f: 'fr', e: 'es', i: 'it', p: 'pt', h: 'hi', j: 'ja', z: 'zh' })[v[0]] || '';
}
// The language of what is being read now (a bilingual book has a narration per language): set by bsSpeakTap.
let bsLangHint = '';
// The voice to use: among the narrations in the language of the text read (when the book has narrations in several), the
// one chosen last on this device, else the first.
function bsActiveSet() {
    if (!bsSets.list.length) return null;
    let voice = null;
    try { voice = localStorage.getItem('reader_speech_voice'); } catch (e) { /* not remembered */ }
    const sameLang = bsLangHint ? bsSets.list.filter(s => bsVoiceLang(s.voice) === bsLangHint) : [];
    const pool = sameLang.length ? sameLang : bsSets.list;
    return pool.find(s => s.voice === voice) || pool[0];
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
// Is the open PDF the book this narration was made from? Its page count alone is not enough («Par ici» 3-4, 5-6 and 7-8
// all have 203 pages): a few sentences spread over the narration must be printed on their pages. Returns 'same', 'other',
// or 'unknown' when the pages have no text to compare (a scan).
async function bsSameBook(meta) {
    const doc = state.pdfDoc;
    if (state.format !== 'pdf' || !doc) return 'unknown';
    const long = meta.sentences.filter(s => s.page >= 1 && s.page <= doc.numPages && bsKeys(s.text).length >= 4);
    if (!long.length) return 'unknown';
    const pick = [...new Set([0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map(f => long[Math.floor(f * (long.length - 1))]))];
    let checked = 0, found = 0;
    for (const s of pick) {
        let printed;
        try { printed = new Set(bsKeys((await (await doc.getPage(s.page)).getTextContent()).items.map(it => it.str).join(' '))); }
        catch (e) { continue; }
        if (printed.size < 3) continue;   // a scanned or picture page
        const keys = bsKeys(s.text);
        checked++;
        if (keys.filter(k => printed.has(k)).length >= keys.length * 0.6) found++;
    }
    if (!checked) return 'unknown';
    return found * 2 >= checked ? 'same' : 'other';
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
        for (const x of items) {
            const same = await bsSameBook(x.meta);
            if (same !== 'other') continue;
            bsNote('import-refused', { why: 'another book (text differs)', its: x.meta.pdf || null, open: state.totalPages });
            showToast(t('spkWrongBook').replace('{book}', (x.meta.pdf && x.meta.pdf.name) || x.name));
            return;
        }
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
    for (const { buf, from, to, gap } of pieces) {
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
        at += dur + (gap === undefined ? BS_GAP : gap);
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
// Synchronous: does the narration cover this tap? Only with the word said on its own (The app's own voice must then stay silent: translation.js.)
function bsCanWord(node, word) {
    const found = bsWordCue(node, word);
    return !!bsTapAlone(found ? found.set : bsActiveSet(), node, found, word);
}
// The tapped word said alone; half of a word broken at a line end plays the whole word.
function bsTapAlone(set, node, found, word) {
    const split = found && bsSplitWord(set, found.x);
    return (split && bsAlone(set, node, split.key)) || bsAlone(set, node, found ? found.x.key : bsWordKey(word));
}
// A word the book breaks at the end of a line («contri- buer»): the narration has its two halves as two words. The whole
// word's key («contribuer») when x is one half and the other half is its neighbour, else null. first: x is the first half.
function bsSplitWord(set, x) {
    const s = set.sentences[x.i], words = s && s.words;
    if (!words) return null;
    const join = (a, b) => /^-\s+$/.test(s.text.slice(a.e, b.s)) ? bsWordKey(s.text.slice(a.s, a.e) + s.text.slice(b.s, b.e)) : null;
    if (x.j + 1 < words.length) { const key = join(words[x.j], words[x.j + 1]); if (key) return { key, first: true }; }
    if (x.j > 0) { const key = join(words[x.j - 1], words[x.j]); if (key) return { key, first: false }; }
    return null;
}
// The word said on its own (tools/book_tts/words.py), for a tap in a PDF page: { key, entry } or null.
function bsAlone(set, node, key) {
    const entry = set && set.lexicon && key && Object.prototype.hasOwnProperty.call(set.lexicon, key) ? set.lexicon[key] : null;
    return entry && bsPageOf(node) ? { key, entry } : null;
}

// Plays the tapped word said on its own (as if there were no other text). Never cut from the speech of its sentence: returns
// false when the narration has no such word (the system voice reads it).
async function bsTapWord(node, word) {
    const found = bsWordCue(node, word);
    const set = found ? found.set : bsActiveSet();
    const alone = bsTapAlone(set, node, found, word);
    if (!alone) return false;
    return bsPlayPlan(set, [{ word: alone.key, from: alone.entry.start / 1000, to: alone.entry.end / 1000 }], word);
}

// The last thing the narration was asked to play ({ set, plan }): the 🔊 of the translation window plays it again.
let bsReplayable = null;
// Plays a plan [{ i (sentence) | word (lexicon key), from, to (s) }]. A newer tap or a stop while it decodes wins.
async function bsPlayPlan(set, plan, what) {
    const seq = ++bsSeq;
    bsReplayable = { set, plan };
    try {
        const pieces = [];
        for (const p of plan) pieces.push({ buf: await bsDecode(p.set || set, p.word !== undefined ? '@' + p.word : p.i), from: p.from, to: p.to,
            gap: p.word !== undefined ? BS_WORD_GAP : BS_GAP });
        if (seq !== bsSeq) return true;   // a newer tap (the expand button, another word) plays instead
        bsPlay(pieces);
        bsLast = plan;
        return true;
    } catch (e) { bsNote('play-failed', { text: String(what || '').slice(0, 40), error: String(e && (e.name + ': ' + e.message) || e) }); return false; }
}
// The replay for the lookup just shown, or null when the narration did not play it (taken once by translation.js).
function bsTakeReplay() { const r = bsReplayable; bsReplayable = null; return r; }
// The translation window's 🔊: plays that word or passage again, from its start (also when pressed while it plays).
function bsReplay(r) {
    if (!r || !(bsSets.list.includes(r.set) || bsSets.global.includes(r.set))) return false;
    bsNote('replay', { pieces: r.plan.length });
    bsPlayPlan(r.set, r.plan, 'replay');
    return true;
}

// What a selection plays, in reading order, or null when the narration does not cover it: a sentence selected whole plays its
// speech, from its first sound to its last ({ i, from, to }); the words of a part of a sentence play said alone, one after
// another ({ word, from, to }). A word of that part the lexicon lacks: null (never a piece cut from the sentence).
function bsPhrasePlan(node, text) {
    const set = bsActiveSet();
    const where = bsPageOf(node);
    if (!set || !where) return null;
    const words = bsWordsOn(set, where.page), sel = bsKeys(text);
    if (!words.length || !sel.length) return null;
    const dom = bsDomWords(where.wrap, node);
    const run = bsPhraseRun(words, sel, dom.at < 0 || !dom.keys.length ? -1 : dom.at / dom.keys.length);
    if (!run) return null;
    const covered = words.slice(run.from, run.to + 1);
    const plan = [];
    for (let k = 0; k < covered.length; ) {
        const i = covered[k].i;
        let end = k;
        while (end + 1 < covered.length && covered[end + 1].i === i) end++;
        const part = covered.slice(k, end + 1);
        if (part.length === words.filter(x => x.i === i).length) {
            const [from] = bsSpan(set, part[0]), [, to] = bsSpan(set, part[part.length - 1]);
            // estimated timings are least sure at the edges: a whole sentence keeps its own start and end
            plan.push(set.timing === 'aligned' ? { i, from, to } : { i, from: 0, to: set.sentences[i].duration });
        } else {
            for (let n = 0; n < part.length; n++) {
                const x = part[n], split = bsSplitWord(set, x);
                // a word broken at a line end: said once, whole (when the selection has both halves, the second is skipped)
                const alone = (split && bsAlone(set, node, split.key)) || bsAlone(set, node, x.key);
                if (!alone) return null;
                plan.push({ word: alone.key, from: alone.entry.start / 1000, to: alone.entry.end / 1000 });
                if (split && split.first && alone.key === split.key && part[n + 1] && part[n + 1].j === x.j + 1) n++;
            }
        }
        k = end + 1;
    }
    return { set, plan };
}
function bsCanPhrase(node, text) { return !!bsPhrasePlan(node, text); }

// Plays a selection (a part of a sentence, a sentence or several). Returns false when the narration does not cover it.
async function bsTapPhrase(node, text) {
    const found = bsPhrasePlan(node, text);
    if (!found) return false;
    return bsPlayPlan(found.set, found.plan, text);
}

// One entry for the reader (js/selection.js): plays what a PDF tap or selection means in the narration and returns,
// synchronously, whether it does — the app's own voice then stays silent for it (translation.js).
function bsSpeakTap(node, text, isWord) {
    // the language of the sentence decides which narration of a bilingual book reads it (taken only when it has two languages)
    const langs = new Set(bsSets.list.map(s => bsVoiceLang(s.voice)));
    bsLangHint = langs.size > 1 && typeof langForText === 'function' ? String(langForText(isWord ? (state.ctxSentence || text) : text) || '').slice(0, 2) : '';
    try { return bsSpeakTapIn(node, text, isWord); } finally { bsLangHint = ''; }
}
function bsSpeakTapIn(node, text, isWord) {
    const note = why => bsNote('tap', { word: !!isWord, text: String(text || '').slice(0, 40), why, lang: bsLangHint || undefined });
    if (state.format !== 'pdf') return false;
    if (!bsSets.list.length) { note('no narration for this book'); return false; }
    if (!bsPageOf(node)) { note('not on a PDF page'); return false; }
    if (isWord ? !bsCanWord(node, text) : !bsCanPhrase(node, text)) { note('not in the narration'); return false; }
    note('narration');
    if (isWord) bsTapWord(node, text); else bsTapPhrase(node, text);
    return true;
}

// ---------- a phrase from anywhere (the Grammar panel's conjugation rows) ----------------------------------------------------------
// The narrations to read a phrase from: the open book's (the chosen voice first), then the dictionaries, the same voice first.
function bsSpeechSources() {
    const book = bsActiveSet(), voice = book ? book.voice : null;
    const rest = bsSets.list.filter(x => x !== book);
    const dict = bsSets.global.slice().sort((a, b) => (b.voice === voice) - (a.voice === voice));
    return [book, ...rest, ...dict].filter(Boolean);
}
const bsSentenceIndexes = new WeakMap();   // set -> Map(«key key key» -> sentence index)
function bsSentenceIndex(set) {
    if (!bsSentenceIndexes.has(set)) {
        const map = new Map();
        set.sentences.forEach((x, i) => { const k = bsKeys(x.text).join(' '); if (k && !map.has(k)) map.set(k, i); });
        bsSentenceIndexes.set(set, map);
    }
    return bsSentenceIndexes.get(set);
}
// What a phrase that is not on the page plays («tu gis», «nous recevons»): a recorded sentence saying exactly it, whole;
// else its words said alone, one after another; null when a word has no recording anywhere (the system voice reads it).
// Never a piece cut out of a longer sentence.
function bsPhraseAnywhere(text) {
    const keys = bsKeys(text), sources = bsSpeechSources();
    if (!keys.length || !sources.length) return null;
    for (const set of sources) {
        const i = bsSentenceIndex(set).get(keys.join(' '));
        if (i === undefined) continue;
        const s = set.sentences[i], words = (s.words || []).filter(w => bsWordKey(s.text.slice(w.s, w.e)));
        const whole = set.timing === 'aligned' && words.length
            ? { from: words[0].start / 1000, to: words[words.length - 1].end / 1000 } : { from: 0, to: s.duration };
        return { set, plan: [{ set, i, ...whole }] };
    }
    const plan = [];
    for (const key of keys) {
        const set = sources.find(x => x.lexicon && Object.prototype.hasOwnProperty.call(x.lexicon, key));
        if (!set) return null;
        const entry = set.lexicon[key];
        plan.push({ set, word: key, from: entry.start / 1000, to: entry.end / 1000 });
    }
    return { set: plan[0].set, plan };
}
// Plays a phrase from the narrations; false when they do not have it (the caller reads it with the system voice).
function bsSpeakPhrase(text) {
    const found = bsPhraseAnywhere(text);
    bsNote('phrase', { text: String(text || '').slice(0, 40), how: found ? (found.plan[0].word !== undefined ? 'words' : 'sentence') : 'system voice' });
    if (!found) return false;
    bsPlayPlan(found.set, found.plan, text);
    return true;
}

// ---------- pronunciation dictionaries (a narration for every book, e.g. Bescherelle) ---------------------------------------------
async function bsImportDictionary(fileList) {
    const files = Array.from(fileList || []).filter(f => /\.mp3$/i.test(f.name));
    bsNote('dictionary-import', { files: files.map(f => [f.name, Math.round(f.size / 1048576) + ' MB']) });
    if (bsImporting) return;
    bsImporting = true;
    try {
        const items = [];
        for (const f of files) { const packed = await bsUnpack(f); if (packed && bsValidMeta(packed.meta)) items.push({ ...packed, name: f.name }); }
        if (!items.length) { showToast(t('spkNeedBoth')); return; }
        for (const { meta, blob, name } of items) {
            await bsPut({ id: BS_GLOBAL + '\u0000' + name, bookKey: BS_GLOBAL, voice: meta.voice, audioName: name,
                timing: meta.timing === 'aligned' ? 'aligned' : 'estimated', sentences: meta.sentences,
                lexicon: meta.lexicon && typeof meta.lexicon === 'object' ? meta.lexicon : null, blob });
        }
        await bsRefresh();
        renderBookAudioDialog(t('spkDictSaved').replace('{name}', items.map(x => x.name).join(', ')));
    } catch (e) {
        bsNote('dictionary-import-failed', { error: String(e && (e.name + ': ' + e.message) || e) });
        showToast(t('spkFailed'));
    } finally { bsImporting = false; }
}
async function bsRemoveDictionaries() {
    bsStop();
    try { await bsDelete(BS_GLOBAL); } catch (e) { /* nothing to remove */ }
    await bsRefresh();
    renderBookAudioDialog('');
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
    spkDictPick: { uk: '📚 Словник вимови (для всіх книг)', en: '📚 Pronunciation dictionary (all books)', fr: '📚 Dictionnaire de prononciation (tous les livres)', ru: '📚 Словарь произношения (для всех книг)', es: '📚 Diccionario de pronunciación (todos los libros)' },
    spkDictRemove: { uk: 'Видалити словники вимови', en: 'Remove pronunciation dictionaries', fr: 'Supprimer les dictionnaires de prononciation', ru: 'Удалить словари произношения', es: 'Eliminar los diccionarios de pronunciación' },
    spkDictSaved: { uk: 'Словник вимови підключено: {name}. Він звучить у «Граматиці» для всіх книг.', en: 'Pronunciation dictionary added: {name}. Grammar uses it in every book.', fr: 'Dictionnaire de prononciation ajouté : {name}. La grammaire l’utilise dans tous les livres.', ru: 'Словарь произношения подключён: {name}. Он звучит в «Грамматике» для всех книг.', es: 'Diccionario de pronunciación añadido: {name}. La gramática lo usa en todos los libros.' },
    spkDictCount: { uk: 'Словники вимови: {n}', en: 'Pronunciation dictionaries: {n}', fr: 'Dictionnaires de prononciation : {n}', ru: 'Словари произношения: {n}', es: 'Diccionarios de pronunciación: {n}' },
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
