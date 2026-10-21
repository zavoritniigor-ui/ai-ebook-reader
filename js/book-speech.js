/* book-speech.js — the narration of a book made offline (tools/book_tts/generate.py, edge-tts): tap a word in a PDF and
 * hear that word from the chapter's audio; select a sentence and hear the sentence. The two files of one voice (the MP3 and
 * its JSON) are imported on this device from the book-audio dialog; they are kept in IndexedDB store «speech» of
 * reader-book-audio. Only the bytes of the sentence that is needed are decoded (Web Audio), never the whole book.
 *
 * The JSON holds, for every sentence: page, text, bytes [start, end) in the MP3, duration (s) and for every word the
 * character span in the sentence (s, e) and its time span in ms (start, end) from the sentence start.
 * The pure helpers (bsNorm, bsWordKey, bsSentenceIndex, bsWordCues) are checked by tests/book_speech_test.mjs. */

const BS_STORE = 'speech';
const BS_MARGIN = 0.04;   // seconds of the neighbouring sound kept on each side of a word
const BS_FADE = 0.012;    // a short fade in/out so the cut makes no click
const BS_DECODED_MAX = 24;
const bsSets = { key: null, list: [] };   // the speech sets of the open book: { id, voice, audioName, sentences, blob }
const bsDecoded = new Map();              // «set#sentence» -> AudioBuffer, least recently used first
let bsCtx = null, bsCurrent = null;

// ---------- pure helpers ------------------------------------------------------------------------------------------------------------
function bsNorm(s) { return String(s || '').normalize('NFC').toLowerCase().replace(/[’`]/g, '\'').replace(/\s+/g, ' ').trim(); }
// A word without its punctuation and spaces. «l'école» and «école» share the key «école» (the elision «l'» is cut off).
function bsWordKey(s) { return String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''); }
// Keys of the same word: equal, or one ends with the other when the shorter one is at least 3 letters (an elision).
function bsSameWord(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    const [short, long] = a.length <= b.length ? [a, b] : [b, a];
    return short.length >= 3 && long.endsWith(short);
}
// The sentence of the set that a selected text belongs to, on the same page. An exact match wins; otherwise the longest
// overlap of at least 12 letters (a selection that starts or ends inside the sentence).
function bsSentenceIndex(sentences, page, text) {
    const want = bsWordKey(text);
    if (!want) return -1;
    let best = -1, bestLen = 0;
    sentences.forEach((s, i) => {
        if (s.page !== page) return;
        const have = bsWordKey(s.text);
        if (!have) return;
        if (have === want) { best = i; bestLen = Infinity; return; }
        if (bestLen === Infinity) return;
        const common = have.includes(want) ? want.length : want.includes(have) ? have.length : 0;
        if (common >= 12 && common > bestLen) { best = i; bestLen = common; }
    });
    return best;
}
// Every occurrence of a word on a page, in reading order: [{ i (sentence index), w (word entry) }].
function bsWordCues(sentences, page, word) {
    const key = bsWordKey(word), cues = [];
    if (!key) return cues;
    sentences.forEach((s, i) => {
        if (s.page !== page) return;
        for (const w of s.words) if (bsSameWord(key, bsWordKey(s.text.slice(w.s, w.e)))) cues.push({ i, w });
    });
    return cues;
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
    if (!key) { bsSets.list = []; return; }
    try {
        const rows = await bsList(key);
        if (bsSets.key !== key) return;
        bsSets.list = rows.filter(r => r && Array.isArray(r.sentences) && r.blob);
    } catch (e) { bsSets.list = []; }
}
// The voice to use: the one chosen last on this device, else the first set.
function bsActiveSet() {
    if (!bsSets.list.length) return null;
    let voice = null;
    try { voice = localStorage.getItem('reader_speech_voice'); } catch (e) { /* not remembered */ }
    return bsSets.list.find(s => s.voice === voice) || bsSets.list[0];
}

// ---------- importing -----------------------------------------------------------------------------------------------------------------
let bsImporting = false;
async function bsImport(fileList) {
    const key = state.bookKey;
    if (!key || bsImporting) return;
    const files = Array.from(fileList || []);
    const jsonFile = files.find(f => /\.json$/i.test(f.name)), mp3 = files.find(f => /\.mp3$/i.test(f.name));
    if (!jsonFile || !mp3) { showToast(t('spkNeedBoth')); return; }
    let meta = null;
    try { meta = JSON.parse(await jsonFile.text()); } catch (e) { meta = null; }
    if (!meta || !Array.isArray(meta.sentences) || !meta.sentences.length || !meta.voice) { showToast(t('spkBadJson')); return; }
    if (meta.audio !== mp3.name) { showToast(t('spkMismatch').replace('{audio}', meta.audio || '?')); return; }
    bsImporting = true;
    try {
        await bsPut({ id: key + '\u0000' + meta.voice, bookKey: key, voice: meta.voice, audioName: mp3.name,
            sentences: meta.sentences, blob: mp3 });
        await bsRefresh();
        renderBookAudioDialog(t('spkSaved').replace('{voice}', meta.voice).replace('{n}', meta.sentences.length));
    } catch (e) {
        showToast(t('spkFailed'));
    } finally { bsImporting = false; }
}

// ---------- playing -------------------------------------------------------------------------------------------------------------------
function bsContext() {
    if (!bsCtx) bsCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (bsCtx.state === 'suspended') bsCtx.resume().catch(() => {});
    return bsCtx;
}
async function bsDecode(set, index) {
    const id = set.id + '#' + index;
    if (bsDecoded.has(id)) { const buf = bsDecoded.get(id); bsDecoded.delete(id); bsDecoded.set(id, buf); return buf; }
    const [a, b] = set.sentences[index].bytes;
    const buf = await bsContext().decodeAudioData(await set.blob.slice(a, b).arrayBuffer());
    bsDecoded.set(id, buf);
    if (bsDecoded.size > BS_DECODED_MAX) bsDecoded.delete(bsDecoded.keys().next().value);
    return buf;
}
function bsStop() {
    if (!bsCurrent) return;
    try { bsCurrent.stop(); } catch (e) { /* already ended */ }
    bsCurrent = null;
}
function bsPlay(buf, from, to) {
    const ctx = bsContext();
    bsStop();
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    const dur = Math.max(0.05, Math.min(to, buf.duration) - Math.max(0, from));
    const at = ctx.currentTime, fade = Math.min(BS_FADE, dur / 3);
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(1, at + fade);
    gain.gain.setValueAtTime(1, at + dur - fade);
    gain.gain.linearRampToValueAtTime(0, at + dur);
    src.onended = () => { if (bsCurrent === src) bsCurrent = null; };
    src.start(at, Math.max(0, from), dur);
    bsCurrent = src;
}
// The page and the tapped occurrence: the nth text node of this word on the page, as the page lists them.
function bsPageOf(node) {
    const wrap = node && node.closest ? node.closest('.pdf-page-wrapper') : null;
    return wrap ? { wrap, page: Number(wrap.dataset.page) } : null;
}
function bsOccurrence(wrap, node, word) {
    const key = bsWordKey(word);
    const same = [...wrap.querySelectorAll('span')].filter(n => n.childElementCount === 0 && bsSameWord(key, bsWordKey(n.textContent)));
    return same.indexOf(node);
}

// Plays the tapped word from the speech of its sentence. Returns false when the book has no speech or the word is not found,
// so the caller can carry on as before (the translation popup opens in every case).
async function bsTapWord(node, word) {
    const set = bsActiveSet();
    const where = bsPageOf(node);
    if (!set || !where || !bsWordKey(word)) return false;
    try {
        const cues = bsWordCues(set.sentences, where.page, word);
        if (!cues.length) return false;
        const k = bsOccurrence(where.wrap, node, word);
        const cue = cues[k >= 0 && k < cues.length ? k : 0];
        const buf = await bsDecode(set, cue.i);
        bsPlay(buf, cue.w.start / 1000 - BS_MARGIN, cue.w.end / 1000 + BS_MARGIN);
        return true;
    } catch (e) { return false; }
}

// Plays a selected sentence (or the part of it that the speech covers). Returns false when there is no matching sentence.
async function bsTapPhrase(node, text) {
    const set = bsActiveSet();
    const where = bsPageOf(node);
    if (!set || !where) return false;
    try {
        const index = bsSentenceIndex(set.sentences, where.page, text);
        if (index < 0) return false;
        const buf = await bsDecode(set, index);
        bsPlay(buf, 0, set.sentences[index].duration + BS_MARGIN);
        return true;
    } catch (e) { return false; }
}

// ---------- i18n ----------------------------------------------------------------------------------------------------------------------------
Object.assign(I18N, {
    spkPick: { uk: 'Озвучка книги (MP3 + JSON)', en: 'Book narration (MP3 + JSON)', fr: 'Narration du livre (MP3 + JSON)', ru: 'Озвучка книги (MP3 + JSON)' },
    spkRemove: { uk: 'Видалити озвучку', en: 'Remove narration', fr: 'Supprimer la narration', ru: 'Удалить озвучку' },
    spkNeedBoth: { uk: 'Виберіть файл .mp3 і файл .json цього самого голосу.', en: 'Choose one .mp3 and one .json file of the same voice.', fr: 'Choisissez un fichier .mp3 et un fichier .json de la même voix.', ru: 'Выберите файл .mp3 и файл .json одного голоса.' },
    spkBadJson: { uk: 'Це не файл озвучки: не вдалося прочитати JSON.', en: 'Not a narration file: the JSON could not be read.', fr: 'Ce n’est pas un fichier de narration : JSON illisible.', ru: 'Это не файл озвучки: JSON не читается.' },
    spkMismatch: { uk: 'JSON описує файл {audio}. Виберіть саме цей MP3.', en: 'The JSON describes the file {audio}. Choose that MP3.', fr: 'Le JSON décrit le fichier {audio}. Choisissez ce MP3.', ru: 'JSON описывает файл {audio}. Выберите этот MP3.' },
    spkSaved: { uk: 'Озвучку збережено: голос {voice}, речень: {n}.', en: 'Narration saved: voice {voice}, sentences: {n}.', fr: 'Narration enregistrée : voix {voice}, phrases : {n}.', ru: 'Озвучка сохранена: голос {voice}, предложений: {n}.' },
    spkFailed: { uk: 'Не вдалося зберегти озвучку на цьому пристрої.', en: 'The narration could not be saved on this device.', fr: 'La narration n’a pas pu être enregistrée sur cet appareil.', ru: 'Озвучку не удалось сохранить на этом устройстве.' },
    spkCount: { uk: 'Озвучка: {n} речень', en: 'Narration: {n} sentences', fr: 'Narration : {n} phrases', ru: 'Озвучка: {n} предложений' },
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
