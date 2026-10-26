/* book-speech.js — the narration of a book made offline (tools/book_tts/generate.py, edge-tts): tap a word in a PDF and
 * hear that word from the chapter's audio; select a sentence and hear the sentence. The two files of one voice (the MP3 and
 * its JSON) are imported on this device from the book-audio dialog; they are kept in IndexedDB store «speech» of
 * reader-book-audio. Only the bytes of the sentence that is needed are decoded (Web Audio), never the whole book.
 *
 * The JSON holds, for every sentence: page, text, bytes [start, end) in the MP3, duration (s) and for every word the
 * character span in the sentence (s, e) and its time span in ms (start, end) from the sentence start.
 * "lexicon" (tools/book_tts/words.py): every word said on its own, appended to the MP3 — a tap on a word plays that, the
 * natural word. Only a whole sentence plays the sentence narration: a piece cut out of it carries the melody of the whole
 * sentence (falling, rising) and sounds broken. A part of a sentence of two words or more (a pair) is read by the system voice:
 * words said alone one after another sound choppy (owner, 2026-10-24). A word the lexicon lacks is never cut from its
 * sentence: the system voice reads that tap instead.
 * "timing": "aligned" (tools/book_tts/align.py) means the spans were measured on the audio and cut at the quiet point
 * between two words: they are played exactly. Older files carry the edge-tts estimates and get a small margin.
 * The pure helpers (bsWordKey, bsKeys, bsWordCues, bsPickCue, bsPhraseRun) are checked by tests/book_speech_test.mjs. */

const BS_STORE = 'speech';
const BS_MARGIN = 0.04;   // seconds of the neighbouring sound kept on each side of a word (estimated timings only)
const BS_FADE = 0.008;    // a short fade in/out so the cut makes no click
const BS_GAP = 0.25;      // the pause between two sentences of one selection
const BS_WORD_GAP = 0.08; // the pause before a word said alone that follows a sentence in one selection
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
    if (!key) { showToast(t('spkNoBook')); return; }
    if (bsImporting) { showToast(t('spkBusy')); return; }
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
        // a big file takes a while to be stored on the device (a phone: tens of seconds): say so, never look idle
        const mb = Math.round(items.reduce((n, x) => n + (x.blob ? x.blob.size : 0), 0) / 1048576);
        if (mb >= 20) showToast(t('spkLoading').replace('{mb}', mb));
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
        const saved = t('spkSaved').replace('{voice}', items.map(x => x.meta.voice).join(', ')).replace('{n}', last.sentences.length);
        renderBookAudioDialog(saved);
        showToast(saved);   // also seen with the dialog closed (a narration found in the folder)
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
    if (!r || !bsSets.list.includes(r.set)) return false;
    bsNote('replay', { pieces: r.plan.length });
    bsPlayPlan(r.set, r.plan, 'replay');
    return true;
}

// What a selection plays, in reading order, or null when the narration does not cover it: a sentence selected whole plays its
// speech, from its first sound to its last ({ i, from, to }); one word of a sentence plays that word said alone ({ word, from,
// to }). A part of a sentence of two words or more, or a word the lexicon lacks: null — the system voice reads the selection
// (never a piece cut from the sentence, never words said alone strung together).
// A number, an ordinal («1er», «2e», «16e») or a bare label letter is printed differently in the PDF's text layer and in the
// narration («1er» / «1 er», «2e étage» / «2 étage»), and labels («a.», «1.», «x», «o») are not read at all: none of them
// decides whether a sentence is in the narration.
function bsContentKeys(keys) {
    const out = [];
    for (let k = 0; k < keys.length; k++) {
        const w = keys[k];
        if (/^\d+(?:er|re|e|ème|eme|es|ers|[a-z])?$/.test(w)) continue;   // also an exercise label «1c», «4a»
        if (/^(?:er|re|e|ème|eme)$/.test(w) && k > 0 && /^\d+$/.test(keys[k - 1])) continue;
        if (w.length < 2 && !/^[àaôy]$/.test(w)) continue;
        out.push({ w, k });
    }
    return out;
}
// The narration's units a selection holds WHOLE (owner, 2026-10-26: «кожне повне речення — озвучкою»): every unit of the
// page whose words all appear, in order, among the selection's words. Labels, numbers and words of a box beside the text
// that the app's sentence takes in are skipped; a unit only partly selected is never played (never a piece of a sentence).
// Played in the narration's order when they hold most of the selection's words; else null.
function bsWholeUnitsPlan(set, words, text) {
    const sel = bsContentKeys(bsKeys(text)).map(x => x.w);
    if (sel.length < 2) return null;
    const units = new Map();
    for (const x of words) { if (!units.has(x.i)) units.set(x.i, []); units.get(x.i).push(x); }
    const used = new Array(sel.length).fill(false), whole = [];
    const candidates = [...units].map(([i, ws]) => ({ i, ws, keys: bsContentKeys(ws.map(x => x.key)).map(x => x.w) }))
        .filter(u => u.keys.length && u.keys.length <= sel.length).sort((a, b) => b.keys.length - a.keys.length);
    for (const u of candidates) {
        // the unit's words, in order, on positions of the selection not taken by another unit: the most compact such
        // place (a sentence's first word «je» may also begin the sentence before it)
        let at = null;
        for (let start = 0; start < sel.length; start++) {
            if (used[start] || !bsSameWord(sel[start], u.keys[0])) continue;
            const got = [start];
            let p = start + 1;
            for (let n = 1; n < u.keys.length; n++) {
                while (p < sel.length && (used[p] || !bsSameWord(sel[p], u.keys[n]))) p++;
                if (p >= sel.length) break;
                got.push(p++);
            }
            if (got.length === u.keys.length && (!at || got[got.length - 1] - got[0] < at[at.length - 1] - at[0])) at = got;
        }
        if (!at) continue;
        // a unit's words spread over the whole selection would be a coincidence of common words, not this unit
        if (u.keys.length > 1 && at[at.length - 1] - at[0] + 1 > u.keys.length * 2 + 4) continue;
        at.forEach(q => { used[q] = true; });
        whole.push(u);
    }
    const covered = used.filter(Boolean).length;
    if (!whole.length || covered < Math.max(2, Math.ceil(sel.length * 0.6))) return null;
    // two words or more left over that go on together in another unit are a piece of a sentence (owner: pairs of words →
    // the system voice): the selection is then not whole sentences
    const pieceOf = (a, b) => candidates.concat([...units].map(([i, ws]) => ({ keys: bsContentKeys(ws.map(x => x.key)).map(x => x.w) })))
        .some(u => u.keys.some((k, n) => n + 1 < u.keys.length && bsSameWord(k, a) && bsSameWord(u.keys[n + 1], b)));
    for (let q = 0; q + 1 < sel.length; q++) if (!used[q] && !used[q + 1] && pieceOf(sel[q], sel[q + 1])) return null;
    whole.sort((a, b) => a.i - b.i);
    return whole.map(u => {
        const [from] = bsSpan(set, u.ws[0]), [, to] = bsSpan(set, u.ws[u.ws.length - 1]);
        return set.timing === 'aligned' ? { i: u.i, from, to } : { i: u.i, from: 0, to: set.sentences[u.i].duration };
    });
}
function bsPhrasePlan(node, text) {
    const found = bsPhrasePlanRun(node, text);
    if (found) return found;
    const set = bsActiveSet(), where = bsPageOf(node);
    if (!set || !where) return null;
    const plan = bsWholeUnitsPlan(set, bsWordsOn(set, where.page), text);
    return plan ? { set, plan } : null;
}
function bsPhrasePlanRun(node, text) {
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
            // two words or more of a sentence (a pair): the system voice says them as one phrase; a word broken at a line
            // end («contri- buer») is one word in two pieces
            const split = part.length === 2 && bsSplitWord(set, part[0]);
            if (part.length > 1 && !(split && split.first)) return null;
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
    const langs = [...new Set(bsSets.list.map(s => bsVoiceLang(s.voice)))];
    const lang = langs.length > 1 && typeof langForText === 'function' ? String(langForText(isWord ? (state.ctxSentence || text) : text) || '').slice(0, 2) : '';
    // each narration of a bilingual book reads only its language's sentences (tools/book_tts/generate.py --lang): when the one in
    // the sentence's language does not have it (the two language checks disagree), the other one may
    const order = lang ? [lang, ...langs.filter(l => l !== lang)] : [''];
    try {
        for (const l of order) {
            bsLangHint = l;
            if (bsSpeakTapIn(node, text, isWord)) return true;
        }
        return false;
    } finally { bsLangHint = ''; }
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
// The narrations to read a phrase from: the open book's, the chosen voice first.
function bsSpeechSources() {
    const book = bsActiveSet();
    return [book, ...bsSets.list.filter(x => x !== book)].filter(Boolean);
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
// else one word said alone; null for several words no sentence says, or a word with no recording anywhere (the system voice
// reads it). Never a piece cut out of a longer sentence, never words said alone strung together.
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
    if (keys.length > 1) return null;
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

// ---------- a folder of books: the narration is found by itself ------------------------------------------------------------------
// The folder the user gave once (browsers with the File System Access API: Chrome, Edge on a computer). A book opened later
// looks for its narration there and in its subfolders: an MP3 whose tag names this book (the PDF's name, or its page count
// and text) is imported exactly as if it had been chosen by hand. The folder's handle is kept in IndexedDB on this device.
// BF_DEPTH: how deep the remembered folder is searched. A whole storage chosen as the folder (Android: «Internal storage» →
// Download → Books → Par ici 5-6) is four levels down from the book's files (owner, 2026-10-26: «знаходить папку, і все»).
const BF_ID = 'books', BF_DEPTH = 4;
let bfBusy = false;
const bfSupported = () => typeof window.showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined';
// The record lives in its own database: a version change of the narrations' database would wait for every other window
// that still has it open, and the narrations would stop with it.
const BF_DB = 'reader-books-folder', BF_STORE = 'folders';
let bfDbPromise = null;
function bfDb() {
    if (!bfDbPromise) bfDbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(BF_DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(BF_STORE, { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }).catch(err => { bfDbPromise = null; throw err; });
    return bfDbPromise;
}
async function bfGet() { const db = await bfDb(); return baReq(db.transaction(BF_STORE, 'readonly').objectStore(BF_STORE).get(BF_ID)); }
async function bfSet(record) { const db = await bfDb(), tx = db.transaction(BF_STORE, 'readwrite'); tx.objectStore(BF_STORE).put(record); await baTxDone(tx); }
async function bfDelete() { const db = await bfDb(), tx = db.transaction(BF_STORE, 'readwrite'); tx.objectStore(BF_STORE).delete(BF_ID); await baTxDone(tx); }
// The MP3 files of a folder and of its subfolders (BF_DEPTH levels down), one at a time.
async function* bfMp3s(dir, depth = 0) {
    for await (const [name, entry] of dir.entries()) {
        if (entry.kind === 'directory') { if (depth < BF_DEPTH && !name.startsWith('.')) yield* bfMp3s(entry, depth + 1); }
        else if (/\.mp3$/i.test(name)) yield await entry.getFile();
    }
}
// Reading needs the user's permission: asked for only from a click (a browser refuses it when nobody clicked).
async function bfGranted(handle, interactive) {
    if (await handle.queryPermission({ mode: 'read' }) === 'granted') return true;
    return !!interactive && await handle.requestPermission({ mode: 'read' }) === 'granted';
}
// Imports the open PDF's narration from the remembered folder when the book has none yet. Quiet unless interactive
// (then the permission may be asked for). Returns true when a narration was imported.
async function bsAutoImportFromFolder(interactive = false) {
    const key = state.bookKey;
    if (!bfSupported() || !key || state.format !== 'pdf' || !state.totalPages || bfBusy || bsImporting) return false;
    let record = null;
    try { record = await bfGet(); } catch (e) { return false; }
    if (!record || !record.handle) return false;
    bfBusy = true;
    let imported = false, found = false;
    try {
        await bsRefresh();
        if (state.bookKey !== key) return false;
        if (!(await bfGranted(record.handle, interactive))) { if (interactive) showToast(t('bfNeedAllow')); return false; }
        if (interactive) showToast(t('bfSearching').replace('{name}', record.name || ''));
        for await (const file of bfMp3s(record.handle)) {
            if (state.bookKey !== key) return false;
            let packed = null;
            try { packed = await bsUnpack(file); } catch (e) { packed = null; }
            const pdf = packed && packed.meta && packed.meta.pdf;
            if (!pdf || pdf.pages !== state.totalPages) continue;   // a narration of another book (or a music file)
            if (pdf.name !== state.bookFileName && await bsSameBook(packed.meta) !== 'same') continue;
            found = true;
            // the book has this very file already (same name and size): nothing to do; an older or another file is replaced
            const have = bsSets.list.find(r => r.voice === packed.meta.voice);
            if (have && have.audioName === file.name && have.blob && have.blob.size === packed.blob.size) {
                bsNote('folder', { up_to_date: file.name });
                if (interactive) showToast(t('bfUpToDate'));
                break;
            }
            bsNote('folder', { importing: file.name, mb: Math.round(file.size / 1048576), replaces: have ? have.audioName : null });
            await bsImport([file]);
            if (bsSets.list.some(r => r.voice === packed.meta.voice && r.audioName === file.name)) { imported = true; showToast(t('bfFound')); }
            break;
        }
        if (!found) {
            bsNote('folder', { not_found: state.bookFileName, pages: state.totalPages, folder: record.name || '' });
            if (interactive) showToast(t('bfNotFound').replace('{name}', record.name || '').replace('{book}', state.bookFileName || ''));
        }
    } catch (e) {
        bsNote('folder', { error: String(e && (e.name || e.message) || e) });
        if (interactive) showToast(t('spkFailed'));
    } finally {
        bfBusy = false;
        bsRenderFolderRow();
    }
    return imported;
}
// The dialog's folder row: which folder is remembered, and whether the permission to read it is still needed.
async function bsRenderFolderRow() {
    const dialog = bookAudioDialog(), row = dialog && dialog.querySelector('.ba-books');
    if (!row) return;
    if (!bfSupported()) { row.hidden = true; return; }
    let record = null, granted = false;
    try {
        record = await bfGet();
        if (record && record.handle) granted = await record.handle.queryPermission({ mode: 'read' }) === 'granted';
    } catch (e) { record = null; }
    row.hidden = false;
    row.querySelector('.ba-books-text').textContent = record
        ? t('bfHave').replace('{name}', record.name || '') + (granted ? '' : ' ' + t('bfNeedAllow'))
        : t('bfNone');
    row.querySelector('.ba-books-pick').textContent = record ? t('bfChange') : t('bfChoose');
    row.querySelector('.ba-books-allow').textContent = t('bfAllow');
    row.querySelector('.ba-books-allow').hidden = !record || granted;
    row.querySelector('.ba-books-forget').textContent = t('bfForget');
    row.querySelector('.ba-books-forget').hidden = !record;
}
// The button «Вибрати папку»: the folder is chosen by the user, remembered, and searched for this book's narration at once.
async function bsChooseBooksFolder() {
    if (!bfSupported()) return;
    let handle = null;
    try { handle = await window.showDirectoryPicker({ id: 'reader-books', mode: 'read' }); } catch (e) { return; }   // cancelled
    try { await bfSet({ id: BF_ID, handle, name: handle.name, at: Date.now() }); }
    catch (e) { showToast(t('spkFailed')); return; }
    showToast(t('bfSaved').replace('{name}', handle.name));
    await bfAutoImportFromFolder(true);   // the narration and the dialogue tracks
    bsRenderFolderRow();
}
async function bsAllowBooksFolder() { await bfAutoImportFromFolder(true); }
async function bsForgetBooksFolder() { try { await bfDelete(); } catch (e) { /* nothing remembered */ } bsRenderFolderRow(); }

// The package: a folder with the book's PDF, its «audio …» folders (the dialogue tracks, CD by CD) and its narration. A book
// opened from the remembered folder gets its dialogue tracks from its package too, when it has none yet: the same import as
// a folder chosen by hand (importBookAudio), with the paths the track names come from.
let bfTracksBusy = false;
const BF_AUDIO_EXT = /\.(m4a|mp3|ogg|oga|opus|wav|flac|aac)$/i;
// The folder (within BF_DEPTH levels) that holds a file with this name, or null.
async function bfFindFolderWith(dir, name, depth = 0) {
    for await (const [entryName, entry] of dir.entries()) {
        if (entry.kind === 'file' && entryName === name) return dir;
    }
    if (depth < BF_DEPTH) {
        for await (const [entryName, entry] of dir.entries()) {
            if (entry.kind === 'directory' && !entryName.startsWith('.')) {
                const found = await bfFindFolderWith(entry, name, depth + 1);
                if (found) return found;
            }
        }
    }
    return null;
}
// The audio files inside the package's «audio …» folders, each with the path it has in the package (the CD folder is in it).
async function bfPackageTracks(pkg) {
    const out = [];
    const walk = async (dir, path, depth) => {
        for await (const [name, entry] of dir.entries()) {
            if (entry.kind === 'file' && BF_AUDIO_EXT.test(name)) {
                const file = await entry.getFile();
                Object.defineProperty(file, 'webkitRelativePath', { value: `${path}/${name}` });
                out.push(file);
            } else if (entry.kind === 'directory' && depth < BF_DEPTH + 1 && !name.startsWith('.')) {
                await walk(entry, `${path}/${name}`, depth + 1);
            }
        }
    };
    for await (const [name, entry] of pkg.entries()) {
        if (entry.kind === 'directory' && /^audio/i.test(name)) await walk(entry, name, 1);
    }
    return out;
}
// The dialogue tracks of the open book, from its package in the remembered folder. Quiet unless interactive.
async function bfAutoTracks(interactive = false) {
    const key = state.bookKey;
    if (!bfSupported() || !key || state.format !== 'pdf' || bfTracksBusy) return false;
    let record = null;
    try { record = await bfGet(); } catch (e) { return false; }
    if (!record || !record.handle) return false;
    bfTracksBusy = true;
    try {
        if ((await baList(key)).length) return false;   // the book has its tracks already
        if (!(await bfGranted(record.handle, interactive))) return false;
        const pkg = await bfFindFolderWith(record.handle, state.bookFileName);
        if (!pkg || state.bookKey !== key) return false;
        const files = await bfPackageTracks(pkg);
        if (!files.length || state.bookKey !== key) return false;
        await importBookAudio(files);
        return true;
    } catch (e) {
        bsNote('folder-tracks', { error: String(e && (e.name || e.message) || e) });
        return false;
    } finally { bfTracksBusy = false; }
}
// Everything the folder gives an opened book: its narration, then its dialogue tracks.
async function bfAutoImportFromFolder(interactive = false) {
    await bsAutoImportFromFolder(interactive);
    await bfAutoTracks(interactive);
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
    bfChoose: { uk: 'Вибрати папку з книгами', en: 'Choose the books folder', fr: 'Choisir le dossier des livres', ru: 'Выбрать папку с книгами', es: 'Elegir la carpeta de libros' },
    bfChange: { uk: 'Змінити папку', en: 'Change folder', fr: 'Changer de dossier', ru: 'Сменить папку', es: 'Cambiar carpeta' },
    bfAllow: { uk: 'Дозволити доступ', en: 'Allow access', fr: 'Autoriser l’accès', ru: 'Разрешить доступ', es: 'Permitir el acceso' },
    bfForget: { uk: 'Забути папку', en: 'Forget the folder', fr: 'Oublier le dossier', ru: 'Забыть папку', es: 'Olvidar la carpeta' },
    bfNone: { uk: 'Папку з книгами не вибрано: озвучка з цієї папки не підтягуватиметься сама.', en: 'No books folder chosen: the narration is not found there by itself.', fr: 'Aucun dossier de livres choisi : la narration n’est pas trouvée automatiquement.', ru: 'Папка с книгами не выбрана: озвучка из неё не подтягивается сама.', es: 'No hay carpeta de libros: la narración no se busca sola.' },
    bfHave: { uk: 'Папка з книгами: {name}', en: 'Books folder: {name}', fr: 'Dossier des livres : {name}', ru: 'Папка с книгами: {name}', es: 'Carpeta de libros: {name}' },
    bfNeedAllow: { uk: 'Дозвольте доступ, щоб знайти озвучку книги.', en: 'Allow access to find the book’s narration.', fr: 'Autorisez l’accès pour trouver la narration du livre.', ru: 'Разрешите доступ, чтобы найти озвучку книги.', es: 'Permita el acceso para encontrar la narración del libro.' },
    bfSaved: { uk: 'Папку з книгами запам’ятано: {name}', en: 'Books folder remembered: {name}', fr: 'Dossier des livres mémorisé : {name}', ru: 'Папка с книгами запомнена: {name}', es: 'Carpeta de libros guardada: {name}' },
    bfFound: { uk: 'Озвучку книги знайдено в папці й підключено.', en: 'The book’s narration was found in the folder and connected.', fr: 'La narration du livre a été trouvée dans le dossier et ajoutée.', ru: 'Озвучка книги найдена в папке и подключена.', es: 'La narración del libro se encontró en la carpeta y se conectó.' },
    bfSearching: { uk: 'Шукаю озвучку книги в папці «{name}»…', en: 'Looking for the book’s narration in «{name}»…', fr: 'Recherche de la narration du livre dans « {name} »…', ru: 'Ищу озвучку книги в папке «{name}»…', es: 'Buscando la narración del libro en «{name}»…' },
    bfNotFound: { uk: 'У папці «{name}» немає озвучки для «{book}». Покладіть файл озвучки (.mp3) поруч із книгою.', en: 'No narration for «{book}» in «{name}». Put the narration file (.mp3) next to the book.', fr: 'Aucune narration pour « {book} » dans « {name} ». Placez le fichier de narration (.mp3) à côté du livre.', ru: 'В папке «{name}» нет озвучки для «{book}». Положите файл озвучки (.mp3) рядом с книгой.', es: 'No hay narración para «{book}» en «{name}». Ponga el archivo de narración (.mp3) junto al libro.' },
    bfUpToDate: { uk: 'Озвучку цієї книги вже підключено.', en: 'This book’s narration is already connected.', fr: 'La narration de ce livre est déjà ajoutée.', ru: 'Озвучка этой книги уже подключена.', es: 'La narración de este libro ya está conectada.' },
    spkLoading: { uk: 'Підключаю озвучку ({mb} МБ)… це може тривати до хвилини.', en: 'Connecting the narration ({mb} MB)… this can take up to a minute.', fr: 'Ajout de la narration ({mb} Mo)… cela peut prendre jusqu’à une minute.', ru: 'Подключаю озвучку ({mb} МБ)… это может занять до минуты.', es: 'Conectando la narración ({mb} MB)… puede tardar hasta un minuto.' },
    spkBusy: { uk: 'Озвучка ще підключається, зачекайте.', en: 'The narration is still being connected, please wait.', fr: 'La narration est encore en cours d’ajout, patientez.', ru: 'Озвучка ещё подключается, подождите.', es: 'La narración aún se está conectando, espere.' },
    spkNoBook: { uk: 'Спершу відкрийте книгу, потім підключайте озвучку.', en: 'Open the book first, then add its narration.', fr: 'Ouvrez d’abord le livre, puis ajoutez sa narration.', ru: 'Сначала откройте книгу, потом подключайте озвучку.', es: 'Abra primero el libro y luego añada su narración.' },
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
