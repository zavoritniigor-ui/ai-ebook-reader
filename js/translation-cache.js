/* translation-cache.js — persistent Book Translation Cache (L0) for word taps, in IndexedDB.
 *
 * Structured records only (never rendered HTML, never provider keys or request data). Two kinds per book:
 *   word    — `v1|<book>|<src>><tgt>|<word>`             provisional: the last AI direct translation of the word
 *   context — `v1|<book>|<src>><tgt>|<word>|<ctxHash>`   final: the AI translation of the word IN that sentence
 * The sentence itself is not stored: only a hash of its normalized form. Book = hash of state.bookKey (file name +
 * size + lastModified, the identity bookmarks/ink/stats already use). Bounded: past `maxEntries` the least recently
 * used entries are evicted. Every failure (no IndexedDB, private mode, quota, blocked upgrade) degrades to "miss":
 * translation must keep working without this cache. Service-worker Cache Storage is deliberately NOT used.
 *
 * Classic <script>, not an ES module -- see js/core.js. Loaded before js/translation.js.
 */
const translationCacheConfig = { maxEntries: 10000, evictTo: 0.9, dbName: 'reader-translations', version: 1 };
const translationCacheStatus = { available: null, persisted: null, quota: null, usage: null, error: null };
const TC_VERSION = 'v1';
let tcDbPromise = null;

// 64-bit FNV-1a as two 32-bit halves (different offsets): deterministic, fast, synchronous, no crypto needed.
function tcHash(text) {
    let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        a = Math.imul(a ^ c, 0x01000193) >>> 0;
        b = Math.imul(b ^ c, 0x01000193 + 2) >>> 0;
    }
    return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}
function tcNormWord(word) {
    return String(word || '').normalize('NFC').toLowerCase().replace(/[’`ʼ]/g, "'")
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();
}
function tcNormContext(sentence) {
    return String(sentence || '').normalize('NFC').toLowerCase().replace(/[’`ʼ]/g, "'").replace(/[«»“”„"]/g, '"')
        .replace(/\s+/g, ' ').replace(/^[\s"'(\[]+|[\s"')\].,;:!?…]+$/g, '').trim();
}
function tcBookId(bookKey = state.bookKey) { return bookKey ? 'b' + tcHash(String(bookKey)) : 'nobook'; }
function tcWordKey(book, src, tgt, word) { return `${TC_VERSION}|${book}|${src}>${tgt}|${word}`; }
function tcContextKey(book, src, tgt, word, ctxHash) { return `${tcWordKey(book, src, tgt, word)}|${ctxHash}`; }

function tcOpen() {
    if (tcDbPromise) return tcDbPromise;
    tcDbPromise = new Promise(resolve => {
        try {
            if (typeof indexedDB === 'undefined' || !indexedDB) { translationCacheStatus.available = false; return resolve(null); }
            const req = indexedDB.open(translationCacheConfig.dbName, translationCacheConfig.version);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('entries')) {
                    const store = db.createObjectStore('entries', { keyPath: 'key' });
                    store.createIndex('book', 'book');
                    store.createIndex('accessed', 'accessed');
                }
            };
            req.onsuccess = () => {
                const db = req.result;
                db.onversionchange = () => { try { db.close(); } catch (e) {} tcDbPromise = null; };
                translationCacheStatus.available = true; resolve(db);
            };
            req.onerror = () => { translationCacheStatus.available = false; translationCacheStatus.error = String(req.error && req.error.name || 'error'); resolve(null); };
            req.onblocked = () => { translationCacheStatus.available = false; translationCacheStatus.error = 'blocked'; resolve(null); };
        } catch (e) { translationCacheStatus.available = false; translationCacheStatus.error = String(e && e.name || e); resolve(null); }
    });
    return tcDbPromise;
}
function tcTx(db, mode, run) {
    return new Promise(resolve => {
        try {
            const tx = db.transaction('entries', mode);
            const store = tx.objectStore('entries');
            let result;
            Promise.resolve(run(store, value => { result = value; })).catch(() => {});
            tx.oncomplete = () => resolve(result);
            tx.onerror = tx.onabort = () => resolve(result === undefined ? null : result);
        } catch (e) { resolve(null); }
    });
}
const tcReq = r => new Promise(res => { r.onsuccess = () => res(r.result); r.onerror = () => res(undefined); });

// Both layers for one tap in one transaction; hits are touched (LRU).
async function tcLookup(book, src, tgt, word, ctxHash) {
    const db = await tcOpen();
    if (!db) return { exact: null, word: null };
    return (await tcTx(db, 'readwrite', async (store, done) => {
        const [exact, generic] = await Promise.all([
            ctxHash ? tcReq(store.get(tcContextKey(book, src, tgt, word, ctxHash))) : undefined,
            tcReq(store.get(tcWordKey(book, src, tgt, word)))
        ]);
        const now = Date.now();
        for (const hit of [exact, generic]) if (hit) { hit.accessed = now; store.put(hit); }
        done({ exact: exact || null, word: generic || null });
    })) || { exact: null, word: null };
}

// Stores an AI translation: the context entry (final for that sentence) and the word entry (provisional elsewhere).
// A lower-ranked result never replaces a higher-ranked one (e.g. a fast answer arriving after the refinement).
async function tcStore({ book, src, tgt, word, ctxHash, translation, note, provider, rank }) {
    if (!translation || !word || !book) return false;
    const db = await tcOpen();
    if (!db) return false;
    const now = Date.now();
    const base = { v: TC_VERSION, book, src, tgt, word, translation: String(translation).slice(0, 200), provider: provider || '', rank, created: now, accessed: now };
    const stored = await tcTx(db, 'readwrite', async (store, done) => {
        const records = [];
        if (ctxHash) records.push({ ...base, key: tcContextKey(book, src, tgt, word, ctxHash), kind: 'context', ctx: ctxHash, note: note ? String(note).slice(0, 300) : null });
        records.push({ ...base, key: tcWordKey(book, src, tgt, word), kind: 'word' });
        let wrote = 0;
        for (const record of records) {
            const existing = await tcReq(store.get(record.key));
            if (existing && existing.rank > record.rank) continue;
            record.size = JSON.stringify(record).length;
            store.put(record); wrote++;
        }
        done(wrote);
    });
    if (stored) { tcMaybeEvict(db); tcRequestPersistenceOnce(); }
    return !!stored;
}

let tcEvicting = false;
async function tcMaybeEvict(db) {
    if (tcEvicting) return;
    tcEvicting = true;
    try {
        const count = await tcTx(db, 'readonly', async (store, done) => done(await tcReq(store.count())));
        const max = translationCacheConfig.maxEntries;
        if (!(count > max)) return;
        let remove = count - Math.floor(max * translationCacheConfig.evictTo);
        await tcTx(db, 'readwrite', (store, done) => new Promise(resolve => {
            const cursorReq = store.index('accessed').openCursor();   // oldest access first
            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (!cursor || remove <= 0) { done(true); return resolve(); }
                cursor.delete(); remove--; cursor.continue();
            };
            cursorReq.onerror = () => { done(false); resolve(); };
        }));
    } finally { tcEvicting = false; }
}

async function translationCacheStats(book = null) {
    const db = await tcOpen();
    const out = { available: !!db, entries: 0, bytes: 0, books: 0 };
    if (db) {
        await tcTx(db, 'readonly', (store, done) => new Promise(resolve => {
            const books = new Set();
            const cursorReq = (book ? store.index('book').openCursor(IDBKeyRange.only(book)) : store.openCursor());
            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (!cursor) { out.books = books.size; done(out); return resolve(); }
                out.entries++; out.bytes += cursor.value.size || 0; books.add(cursor.value.book); cursor.continue();
            };
            cursorReq.onerror = () => { done(out); resolve(); };
        }));
    }
    await tcUpdateStorageEstimate();
    return { ...out, persisted: translationCacheStatus.persisted, quota: translationCacheStatus.quota, usage: translationCacheStatus.usage };
}
async function clearBookTranslationCache(book = tcBookId()) {
    const db = await tcOpen();
    if (!db) return 0;
    return tcTx(db, 'readwrite', (store, done) => new Promise(resolve => {
        let removed = 0;
        const cursorReq = store.index('book').openCursor(IDBKeyRange.only(book));
        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) { done(removed); return resolve(); }
            cursor.delete(); removed++; cursor.continue();
        };
        cursorReq.onerror = () => { done(removed); resolve(); };
    }));
}
async function clearAllTranslationCaches() {
    const db = await tcOpen();
    if (!db) return false;
    return !!(await tcTx(db, 'readwrite', async (store, done) => { await tcReq(store.clear()); done(true); }));
}

// Ask once per device (never nag): persistent storage makes eviction under storage pressure less likely -- it is not
// a guarantee. Denial or absence of the API changes nothing.
async function tcUpdateStorageEstimate() {
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const e = await navigator.storage.estimate();
            translationCacheStatus.quota = e.quota ?? null; translationCacheStatus.usage = e.usage ?? null;
        }
        if (navigator.storage && navigator.storage.persisted) translationCacheStatus.persisted = await navigator.storage.persisted();
    } catch (e) {}
}
let tcPersistRequested = false;
async function tcRequestPersistenceOnce() {
    if (tcPersistRequested) return;
    tcPersistRequested = true;
    try {
        if (!navigator.storage || !navigator.storage.persist) return;
        if (readStored('reader_storage_persist_asked') === '1') { await tcUpdateStorageEstimate(); return; }
        writeStored('reader_storage_persist_asked', '1');
        translationCacheStatus.persisted = await navigator.storage.persist();
        await tcUpdateStorageEstimate();
    } catch (e) {}
}
