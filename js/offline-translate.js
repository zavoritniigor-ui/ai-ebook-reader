/* offline-translate.js — переклад слів і речень БЕЗ інтернету, силами самого пристрою.
 *
 * Рушій — Bergamot (Marian NMT, зібраний у WebAssembly; той самий, що в перекладачі Firefox) у Web Worker. Мовні моделі читач
 * завантажує один раз у Налаштуваннях (🔑 → 📴 Офлайн-переклад). Працює на будь-якій платформі: вбудований перекладач Chrome
 * (translateLocally у js/translation.js) є лише в Chrome на комп'ютері й ніколи — на Android.
 *
 *   js/offline-catalog.js          закріплений перелік рушія й моделей (адреса, розмір, SHA-256); генерує tools/offline_models_catalog.py
 *   vendor/bergamot-3.0/           рушій: glue (в оболонці застосунку) і wasm (качається разом із першим пакетом)
 *   functions/api/offline-model.js віддає файл моделі зі сховища Mozilla (воно не шле CORS-заголовків); кожен байт перевіряє застосунок
 *   Cache Storage 'reader-offline-translation'  wasm, файли моделей і один запис стану. Окремий кеш: activate у sw.js чистить лише
 *                                  ai-reader-shell-*, тож оновлення застосунку не викидає пакет на 70 МБ
 *
 * Пакет — це НАПРЯМОК (мова книги → мова перекладу). Усі моделі Mozilla парні з англійською, тому напрямок без прямої моделі йде
 * через англійську (fr → en → uk): дві моделі, перекладені одна за одною. Рушій тримає ~300 МБ пам'яті, тож worker стартує з першим
 * перекладом і зупиняється через OFFLINE_TR_IDLE_MS. js/translation.js кличе offlineTranslate() лише коли відповіді AI нема
 * (нема мережі чи ключа, AI не відповів або мовчить занадто довго).
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується після js/offline-catalog.js і js/dictation.js; усе, що
 * потрібне з інших файлів (t, state, applyI18n, I18N), визначене раніше, а translation.js бачить цей файл лише всередині функцій.
 */
const OFFLINE_TR_CACHE = 'reader-offline-translation';
const OFFLINE_TR_IDLE_MS = 60000;
const OFFLINE_TR_PREVIEW_MS = 5000;   // стільки js/translation.js чекає на AI, перш ніж показати переклад встановленого пакета
const OFFLINE_TR_MAX_CHARS = 4000;
// Для кнопки «Перевірити»: коротке речення мовою оригіналу.
const OFFLINE_TR_SAMPLES = {
    en: 'The old man is reading a book in the garden.', fr: 'Le vieil homme lit un livre dans le jardin.', es: 'El anciano lee un libro en el jardín.',
    de: 'Der alte Mann liest ein Buch im Garten.', it: 'Il vecchio legge un libro in giardino.', pt: 'O velho lê um livro no jardim.',
    nl: 'De oude man leest een boek in de tuin.', pl: 'Stary człowiek czyta książkę w ogrodzie.', uk: 'Старий чоловік читає книгу в саду.',
    ru: 'Старик читает книгу в саду.', zh: '老人在花园里读书。', ko: '노인이 정원에서 책을 읽고 있습니다.', hi: 'बूढ़ा आदमी बगीचे में किताब पढ़ रहा है।'
};

let offlineTrPack = null;            // запис стану з Cache Storage: { v, engine, models: { id: { version, gemm, types, at } }, directions: ['fr>uk'] }
let offlineTrWorker = null, offlineTrBoot = null, offlineTrIdleTimer = 0, offlineTrSeq = 0, offlineTrQueue = Promise.resolve();
let offlineTrFailure = '', offlineTrLast = null, offlineTrLog = [];   // для діагностики: чому рушій не запрацював, останній переклад, останні рядки рушія
const offlineTrWaiting = new Map();

function offlineTrSupported() {
    try {
        return typeof Worker === 'function' && typeof caches === 'object' && !!(self.crypto && crypto.subtle) && typeof WebAssembly === 'object'
            && WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));   // SIMD
    } catch (e) { return false; }
}
function offlineTrError(kind, status) {
    const e = new Error('offline translator: ' + kind + (status ? ' ' + status : ''));
    e.offlineTr = kind; e.status = status;
    return e;
}

// ========== МАРШРУТ ==========
function offlineTrCode(code) { return OFFLINE_CATALOG.codes[code] || code; }
// Ідентифікатори моделей напрямку: [пряма] або [src→en, en→tgt]; null, якщо Mozilla не має моделі для цієї пари.
function offlineTrRoute(src, tgt) {
    const a = offlineTrCode(src), b = offlineTrCode(tgt), models = OFFLINE_CATALOG.models;
    if (!a || !b || a === b) return null;
    if (models[a + '>' + b]) return [a + '>' + b];
    return models[a + '>en'] && models['en>' + b] ? [a + '>en', 'en>' + b] : null;
}
// Рушій мусить збігатися з glue з оболонки застосунку (це пара); модель, що вже стоїть, працює, навіть коли каталог згодом оновили:
// новіша версія моделі не відбирає в читача пакет, який він завантажив.
function offlineTrReady(pack, route) {
    return !!route && pack.engine === OFFLINE_CATALOG.engine.version && route.every(id => pack.models[id]);
}
function offlineTrModelBytes(id) { return OFFLINE_CATALOG.models[id].files.reduce((sum, f) => sum + f.size, 0); }
// Скільки ще треба завантажити для напрямку (з рушієм, якщо його ще нема).
function offlineTrMissingBytes(pack, route) {
    let bytes = pack.engine === OFFLINE_CATALOG.engine.version ? 0 : OFFLINE_CATALOG.engine.wasm.size;
    for (const id of route) if (!pack.models[id]) bytes += offlineTrModelBytes(id);
    return bytes;
}

// ========== СХОВИЩЕ (Cache Storage) ==========
const offlineTrKey = (...parts) => location.origin + '/__offline-translation/' + parts.map(encodeURIComponent).join('/');
async function offlineTrLoad() {
    if (offlineTrPack) return offlineTrPack;
    let pack = { v: 1, engine: '', models: {}, directions: [] };
    try {
        // caches.has, не open: сам запуск застосунку не створює порожній кеш (і не стає першим у caches.keys() перед кешем оболонки).
        const res = await caches.has(OFFLINE_TR_CACHE) && await (await caches.open(OFFLINE_TR_CACHE)).match(offlineTrKey('state'));
        const saved = res && await res.json();
        if (saved && saved.v === 1 && saved.models && typeof saved.models === 'object' && Array.isArray(saved.directions)
            && Object.values(saved.models).every(m => m && m.gemm && Array.isArray(m.types))) pack = saved;
    } catch (e) { /* нема Cache Storage (приватне вікно, небезпечний контекст): нічого не встановлено */ }
    return offlineTrPack = pack;
}
async function offlineTrSave(pack) {
    offlineTrPack = pack;
    await (await caches.open(OFFLINE_TR_CACHE)).put(offlineTrKey('state'), new Response(JSON.stringify(pack), { headers: { 'content-type': 'application/json' } }));
}
// Файли, яких не знає запис стану (обірване завантаження, видалений напрямок, старіша версія рушія/моделі), зайвих місця не займають.
async function offlineTrCollectGarbage(pack) {
    const cache = await caches.open(OFFLINE_TR_CACHE), keep = new Set([offlineTrKey('state')]);
    if (pack.engine) keep.add(offlineTrKey('engine', pack.engine));
    for (const [id, model] of Object.entries(pack.models)) for (const type of model.types) keep.add(offlineTrKey('file', id, type));
    for (const request of await cache.keys()) if (!keep.has(request.url)) await cache.delete(request);
}

// ========== ЗАВАНТАЖЕННЯ ==========
async function offlineTrDownload(url, file, onBytes, signal) {
    let res;
    try { res = await fetch(url, { cache: 'no-store', signal }); }
    catch (e) { throw offlineTrError(signal && signal.aborted ? 'aborted' : 'network'); }
    if (!res.ok) throw offlineTrError(res.status === 429 || res.status >= 500 ? 'busy' : 'server', res.status);
    const data = new Uint8Array(file.size);
    let at = 0;
    try {
        const reader = res.body.getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (at + value.length > file.size) throw offlineTrError('checksum');
            data.set(value, at); at += value.length; onBytes(value.length);
        }
    } catch (e) { throw e && e.offlineTr ? e : offlineTrError(signal && signal.aborted ? 'aborted' : 'network'); }
    if (at !== file.size) throw offlineTrError('checksum');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    if (Array.from(digest, b => b.toString(16).padStart(2, '0')).join('') !== file.sha256) throw offlineTrError('checksum');
    return data;
}
// Завантажує те, чого бракує для напрямку src → tgt, перевіряє кожен файл (розмір і SHA-256) і лише тоді записує його в стан.
// Уже завантажений і перевірений файл (x-sha256) повторно не качається, тож обрив зв'язку не коштує всього пакета.
async function offlineTrInstall(src, tgt, { onProgress, signal } = {}) {
    const route = offlineTrRoute(src, tgt);
    if (!route) throw offlineTrError('route');
    if (!offlineTrSupported()) throw offlineTrError('unsupported');
    const cache = await caches.open(OFFLINE_TR_CACHE), pack = await offlineTrLoad(), engine = OFFLINE_CATALOG.engine, jobs = [];
    if (pack.engine !== engine.version) jobs.push({ key: offlineTrKey('engine', engine.version), url: new URL(engine.wasm.path, location.href).href, file: engine.wasm, engine: true });
    for (const id of route) {
        const model = OFFLINE_CATALOG.models[id];
        if (pack.models[id]) continue;
        model.files.forEach((file, i) => jobs.push({ key: offlineTrKey('file', id, file.type), url: '/api/offline-model?f=' + encodeURIComponent(file.path), file, id, last: i === model.files.length - 1 }));
    }
    const total = jobs.reduce((sum, job) => sum + job.file.size, 0);
    let done = 0;
    if (onProgress) onProgress(0, total);
    try {
        for (const job of jobs) {
            const have = await cache.match(job.key);
            if (have && have.headers.get('x-sha256') === job.file.sha256) { done += job.file.size; if (onProgress) onProgress(done, total); }
            else {
                const data = await offlineTrDownload(job.url, job.file, n => { done += n; if (onProgress) onProgress(done, total); }, signal);
                try { await cache.put(job.key, new Response(data, { headers: { 'content-type': 'application/octet-stream', 'x-sha256': job.file.sha256 } })); }
                catch (e) { throw offlineTrError(e && e.name === 'QuotaExceededError' ? 'quota' : 'storage'); }
            }
            if (job.engine) { pack.engine = engine.version; await offlineTrSave(pack); }
            else if (job.last) {
                const model = OFFLINE_CATALOG.models[job.id];
                pack.models[job.id] = { version: model.version, gemm: model.gemm, types: model.files.map(f => f.type), at: Date.now() };
                await offlineTrSave(pack);
            }
        }
    } catch (e) {
        throw e && e.offlineTr ? e : offlineTrError('storage');
    }
    if (!pack.directions.includes(src + '>' + tgt)) pack.directions.push(src + '>' + tgt);
    await offlineTrSave(pack);
    await offlineTrCollectGarbage(pack);
    offlineTrStop();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* лише прохання не чистити пакет за браком місця */ }
}
async function offlineTrRemove(src, tgt) {
    const pack = await offlineTrLoad(), needed = new Set();
    pack.directions = pack.directions.filter(d => d !== src + '>' + tgt);
    for (const d of pack.directions) for (const id of offlineTrRoute(...d.split('>')) || []) needed.add(id);
    for (const id of Object.keys(pack.models)) if (!needed.has(id)) delete pack.models[id];
    if (!Object.keys(pack.models).length) pack.engine = '';
    offlineTrStop();
    await offlineTrSave(pack);
    await offlineTrCollectGarbage(pack);
}

// Кеш загубив файл, який обіцяв запис стану (браузер почистив частину сховища): забуваємо запис, щоб Налаштування знову запропонували
// завантаження, а не показували «встановлено» пакет, що не перекладає.
async function offlineTrForget() {
    const pack = await offlineTrLoad();
    pack.engine = ''; pack.models = {}; pack.directions = [];
    try { await offlineTrSave(pack); await offlineTrCollectGarbage(pack); } catch (e) { /* сховище недоступне: запис у пам'яті вже порожній */ }
}

// ========== РУШІЙ (Web Worker) ==========
// Тіло worker'а: його текст іде у Blob (див. offlineTrBoot), тож усе потрібне має бути визначене всередині.
function offlineTrWorkerMain() {
    let bergamot = null, service = null, loaded = [];   // loaded: моделі останнього маршруту [{ id, model }]
    const ALIGN = { model: 256, lex: 64, vocab: 64, srcvocab: 64, trgvocab: 64 };
    const log = [];
    const note = (text) => { log.push(String(text)); if (log.length > 12) log.shift(); };
    const stored = async (cache, key) => {
        const res = await (await caches.open(cache)).match(key);
        if (!res) throw new Error('missing ' + key);
        return res.arrayBuffer();
    };
    async function init({ glue, cache, wasm }) {
        importScripts(glue);
        const wasmBinary = await stored(cache, wasm);
        bergamot = await new Promise((resolve, reject) => {
            const engine = loadBergamot({ INITIAL_MEMORY: 234291200, print: note, printErr: note, wasmBinary,
                onAbort() { reject(new Error('the engine aborted')); },
                onRuntimeInitialized: async () => { await Promise.resolve(); resolve(engine); } });
        });
        service = new bergamot.BlockingService({ cacheSize: 0 });
    }
    async function load(step, cache) {   // step: { id: 'fr>en', gemm, keys: { model, lex, vocab | srcvocab + trgvocab } }
        const memory = {};
        for (const [type, key] of Object.entries(step.keys)) {
            const bytes = new Uint8Array(await stored(cache, key));
            memory[type] = new bergamot.AlignedMemory(bytes.byteLength, ALIGN[type]);
            memory[type].getByteArrayView().set(bytes);
        }
        const vocabs = new bergamot.AlignedMemoryList();
        if (memory.vocab) vocabs.push_back(memory.vocab); else { vocabs.push_back(memory.srcvocab); vocabs.push_back(memory.trgvocab); }
        const config = ['beam-size: 1', 'normalize: 1.0', 'word-penalty: 0', 'max-length-break: 128', 'mini-batch-words: 1024', 'workspace: 128',
            'max-length-factor: 2.0', 'skip-cost: true', 'cpu-threads: 0', 'quiet: true', 'quiet-translation: true', 'gemm-precision: ' + step.gemm, 'alignment: soft'].join('\n');
        const [from, to] = step.id.split('>');
        return new bergamot.TranslationModel(from, to, config, memory.model, memory.lex || null, vocabs, null);
    }
    function translate(text, html) {
        const parts = text.split('\n'), messages = new bergamot.VectorString(), options = new bergamot.VectorResponseOptions();
        let responses = null;
        try {
            // html: the engine carries the markup onto the words it translated them to (its own alignment) -- a word in its sentence
            for (const part of parts) if (part.trim()) { messages.push_back(part); options.push_back({ qualityScores: false, alignment: !!html, html: !!html }); }
            if (!messages.size()) return text;
            responses = loaded.length === 1 ? service.translate(loaded[0].model, messages, options)
                : service.translateViaPivoting(loaded[0].model, loaded[1].model, messages, options);
            let n = 0;
            return parts.map(part => part.trim() ? responses.get(n++).getTranslatedText() : part).join('\n');
        } finally {
            messages.delete(); options.delete(); if (responses) responses.delete();
        }
    }
    self.onmessage = async ({ data }) => {
        const { id, cmd } = data;
        try {
            if (cmd === 'init') { await init(data); self.postMessage({ id, ok: true }); return; }
            const started = performance.now();
            if (loaded.map(m => m.id).join() !== data.steps.map(s => s.id).join()) {
                for (const m of loaded) m.model.delete();
                loaded = [];
                for (const step of data.steps) loaded.push({ id: step.id, model: await load(step, data.cache) });
            }
            const text = translate(data.text, data.html);
            self.postMessage({ id, ok: true, text, ms: Math.round(performance.now() - started), log: log.slice(-4) });
        } catch (e) {
            for (const m of loaded) { try { m.model.delete(); } catch (err) { /* already gone */ } }
            loaded = [];
            self.postMessage({ id, error: String(e && e.message || e) });
        }
    };
}
function offlineTrStop() {
    clearTimeout(offlineTrIdleTimer);
    offlineTrBoot = null;
    if (offlineTrWorker) { offlineTrWorker.terminate(); offlineTrWorker = null; }
    for (const waiting of offlineTrWaiting.values()) waiting.reject(offlineTrError('stopped'));
    offlineTrWaiting.clear();
}
function offlineTrCall(message) {
    return new Promise((resolve, reject) => {
        const id = ++offlineTrSeq;
        offlineTrWaiting.set(id, { resolve, reject });
        offlineTrWorker.postMessage({ ...message, id });
    });
}
function offlineTrStart() {
    if (offlineTrBoot) return offlineTrBoot;
    const url = URL.createObjectURL(new Blob(['(' + offlineTrWorkerMain + ')()'], { type: 'text/javascript' }));
    const worker = offlineTrWorker = new Worker(url);
    worker.onmessage = ({ data }) => {
        const waiting = offlineTrWaiting.get(data.id);
        if (!waiting) return;
        offlineTrWaiting.delete(data.id);
        if (data.error) waiting.reject(new Error(data.error)); else waiting.resolve(data);
    };
    worker.onerror = (e) => { offlineTrFailure = e.message || 'worker error'; offlineTrStop(); };
    const engine = OFFLINE_CATALOG.engine;
    const boot = offlineTrBoot = offlineTrCall({ cmd: 'init', glue: new URL(engine.glue, location.href).href, cache: OFFLINE_TR_CACHE, wasm: offlineTrKey('engine', engine.version) });
    boot.then(() => URL.revokeObjectURL(url), () => URL.revokeObjectURL(url));
    return boot;
}
// Переклад встановленим пакетом: рядок або null (нема пакета для напрямку, пристрій не потягне, рушій збоїть). Одна задача за раз;
// скасований signal знімає задачу з черги, але вже запущений переклад не переривається.
function offlineTranslate(text, src, tgt, signal, html = false) {
    const run = async () => {
        clearTimeout(offlineTrIdleTimer);   // a minute of silence ends the engine -- never one that is about to translate
        if (signal && signal.aborted) return null;
        try {   // запасний шлях ніколи не ламає основний: що б не сталося, відповідь — null
            const route = offlineTrRoute(src, tgt), clean = String(text || '').trim().slice(0, OFFLINE_TR_MAX_CHARS);
            if (!clean || !offlineTrSupported() || !offlineTrReady(await offlineTrLoad(), route)) return null;
            await offlineTrStart();
            if (signal && signal.aborted) return null;
            const pack = await offlineTrLoad();
            const steps = route.map(id => ({ id, gemm: pack.models[id].gemm, keys: Object.fromEntries(pack.models[id].types.map(type => [type, offlineTrKey('file', id, type)])) }));
            const res = await offlineTrCall({ cmd: 'translate', cache: OFFLINE_TR_CACHE, steps, text: clean, html });
            offlineTrFailure = ''; offlineTrLast = { route: route.join(' ; '), chars: clean.length, ms: res.ms, at: Date.now() }; offlineTrLog = res.log || [];
            return String(res.text || '').trim() || null;
        } catch (e) {
            offlineTrFailure = String(e && e.message || e);
            offlineTrStop();
            if (/^missing /.test(offlineTrFailure)) await offlineTrForget();
            return null;
        } finally {
            clearTimeout(offlineTrIdleTimer);
            offlineTrIdleTimer = setTimeout(offlineTrStop, OFFLINE_TR_IDLE_MS);
        }
    };
    const job = offlineTrQueue.then(run, run);
    offlineTrQueue = job.catch(() => {});
    return job;
}
// ========== СЛОВО В КОНТЕКСТІ (owner, 2026-10-29) ==========
// A tapped word translated alone loses its sense («rendu» → «рендеровано», «temps» → «час» in «il fait beau temps»). So the pack
// translates the word's SENTENCE with the word marked, and the engine puts the mark on the words it became («s'est <b>rendu</b>
// compte» → «<b>зрозуміла</b>»): the meaning here. Measured on a textbook: most words read better. Where the mark is lost or lands on
// a scrap («та» for «associez»), the word alone is the answer, as before. Both differ: the sentence's meaning first, the word's own
// after it. Returns { text, alone } (alone: the word's own translation when it differs) or null.
const offlineTrEscape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const offlineTrUnescape = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
// The sentence with the first whole-word occurrence of the word marked, as HTML; null when the word is not in it.
function offlineTrMarked(word, sentence) {
    const esc = String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = String(sentence || '').match(new RegExp('(^|[^\\p{L}\\p{N}])(' + esc + ')(?![\\p{L}\\p{N}])', 'iu'));
    if (!m) return null;
    const at = m.index + m[1].length, s = String(sentence);
    return offlineTrEscape(s.slice(0, at)) + '<b>' + offlineTrEscape(m[2]) + '</b>' + offlineTrEscape(s.slice(at + m[2].length));
}
// What the mark landed on in the translated sentence, cleaned; null when it is lost, empty, a scrap or most of the sentence.
function offlineTrPicked(translated, word) {
    const m = String(translated || '').match(/<b>([\s\S]*?)<\/b>/i);
    if (!m) return null;
    const picked = offlineTrUnescape(m[1].replace(/<[^>]*>/g, '')).replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '');
    const letters = (picked.match(/\p{L}/gu) || []).length, wordLetters = (String(word).match(/\p{L}/gu) || []).length;
    if (!letters || (letters <= 2 && wordLetters >= 4) || picked.split(/\s+/).length > 5) return null;
    return picked;
}
// The case of the book's word: «Ключі» for «clés» is «ключі» (a word alone comes out capitalised).
const offlineTrCase = (out, word) => out && /^\p{Ll}/u.test(String(word)) && /^\p{Lu}\p{Ll}/u.test(out) ? out[0].toLocaleLowerCase() + out.slice(1) : out;
async function offlineTranslateWord(word, sentence, src, tgt, signal) {
    const aloneRaw = await offlineTranslate(word, src, tgt, signal);
    if (!aloneRaw) return null;
    const alone = offlineTrCase(aloneRaw.replace(/[\s.!?…]+$/u, ''), word);
    const marked = sentence && String(sentence).trim() !== String(word).trim() ? offlineTrMarked(word, sentence) : null;
    let inContext = null;
    if (marked) inContext = offlineTrPicked(await offlineTranslate(marked, src, tgt, signal, true), word);
    if (signal && signal.aborted) return null;
    if (!inContext) return { text: alone, alone: null };
    inContext = offlineTrCase(inContext, word);
    return { text: inContext, alone: inContext.toLocaleLowerCase() === alone.toLocaleLowerCase() ? null : alone };
}
// The popup's line for it: the meaning here, the word's own after it, the ⌂ mark.
function offlineTrWordHtml(result) {
    return escapeHtml(result.text) + (result.alone ? ` <span class="tt-context">(${escapeHtml(t('offAlone'))}: ${escapeHtml(result.alone)})</span>` : '') + ' <span class="tt-note">⌂</span>';
}
// js/translation.js кличе це, коли переклад не вдався: пакет для цього напрямку існує, але не встановлений — один раз за запуск на
// напрямок показуємо підказку, куди йти. Не в самому тексті вікна: його повідомлення (потрібен AI / потрібен інтернет) лишаються як були.
const offlineTrSuggested = new Set();
async function offlineTrSuggest(src, tgt) {
    try {
        const route = offlineTrRoute(src, tgt), key = src + '>' + tgt;
        if (!route || offlineTrSuggested.has(key) || !offlineTrSupported() || offlineTrReady(await offlineTrLoad(), route)) return;
        offlineTrSuggested.add(key);
        showToast(t('offNeedsPack'));
    } catch (e) { /* лише підказка */ }
}
// Для 📋 діагностики: без ключів і текстів.
function offlineTrReport() {
    const pack = offlineTrPack;
    return { supported: offlineTrSupported(), engine: pack ? pack.engine : 'not read yet', catalogEngine: OFFLINE_CATALOG.engine.version, models: pack ? Object.fromEntries(Object.entries(pack.models).map(([id, m]) => [id, m.version])) : null,
        directions: pack ? pack.directions : null, workerRunning: !!offlineTrWorker, failure: offlineTrFailure, last: offlineTrLast, engineLog: offlineTrLog };
}

// ========== НАЛАШТУВАННЯ: секція в діалозі 🔑 ==========
const offlineTrUi = { controller: null, lastPaint: 0 };
function offlineTrLangName(code, flag = true) {
    let name = code;
    try { name = new Intl.DisplayNames([state.uiLang], { type: 'language' }).of(code) || code; } catch (e) { /* без Intl.DisplayNames лишається код */ }
    name = name.charAt(0).toLocaleUpperCase(state.uiLang) + name.slice(1);
    return flag && langFlag(code) ? langFlag(code) + ' ' + name : name;
}
const offlineTrMb = (bytes) => Math.max(1, Math.round(bytes / 1e6));   // як у файловому менеджері Android: десяткові мегабайти
const offlineTrUnitMb = () => ' ' + t('offUnitMb');
// Мови книги, з яких є маршрут на мову перекладу.
function offlineTrSources(tgt) {
    const back = Object.fromEntries(Object.entries(OFFLINE_CATALOG.codes).map(([app, catalog]) => [catalog, app]));
    const langs = new Set();
    for (const key of Object.keys(OFFLINE_CATALOG.models)) for (const code of key.split('>')) langs.add(back[code] || code);
    return [...langs].filter(code => offlineTrRoute(code, tgt)).sort((a, b) => offlineTrLangName(a, false).localeCompare(offlineTrLangName(b, false), state.uiLang));
}
function offlineTrBuildBox() {
    const content = document.querySelector('#settings-modal .modal-content');
    if (!content || document.getElementById('offline-box')) return;
    const make = (tag, props = {}) => Object.assign(document.createElement(tag), props);
    const box = make('section', { id: 'offline-box', className: 'sync-box' });
    const title = make('h3'); title.dataset.i18n = 'offTitle';
    const hint = make('p', { className: 'key-hint' }); hint.dataset.i18n = 'offHint';
    const row = make('label', { className: 'offline-row' }), rowText = make('span'); rowText.dataset.i18n = 'offBookLang';
    const select = make('select', { id: 'offline-src' });
    row.append(rowText, select);
    const target = make('p', { id: 'offline-target', className: 'key-hint' });
    const note = make('p', { id: 'offline-note', className: 'key-hint' });
    const actions = make('div', { className: 'sync-actions' });
    const install = make('button', { type: 'button', id: 'offline-install', className: 'btn-secondary' });
    const cancel = make('button', { type: 'button', id: 'offline-cancel', className: 'btn-ghost', hidden: true }); cancel.dataset.i18n = 'cancel';
    actions.append(install, cancel);
    const progress = make('progress', { id: 'offline-progress', max: 100, value: 0, hidden: true });
    const status = make('p', { id: 'offline-status' }); status.setAttribute('role', 'status');
    const list = make('ul', { id: 'offline-list' });
    box.append(title, hint, row, target, note, actions, progress, status, list);
    // Одразу під ключами AI, а не в кінці вікна (після діагностики й синхронізації): інакше цю секцію ніхто б не знайшов.
    const form = content.querySelector('#api-keys-form');
    if (form) form.after(box); else content.append(box);
    select.addEventListener('change', offlineTrRefreshBox);
    install.addEventListener('click', offlineTrStartInstall);
    cancel.addEventListener('click', () => { if (offlineTrUi.controller) offlineTrUi.controller.abort(); });
    list.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-act]');
        if (!button) return;
        const [src, tgt] = button.closest('li').dataset.direction.split('>');
        if (button.dataset.act === 'remove') offlineTrRemove(src, tgt).then(() => offlineTrRefreshBox(true), () => offlineTrRefreshBox(true));
        else offlineTrSelfTest(src, tgt, status);
    });
    applyI18n();
    offlineTrRefreshBox();
}
async function offlineTrRefreshBox(clearStatus = false) {
    const box = document.getElementById('offline-box');
    if (!box) return;
    const select = box.querySelector('#offline-src'), install = box.querySelector('#offline-install'), status = box.querySelector('#offline-status');
    if (clearStatus === true && !offlineTrUi.controller) status.textContent = '';
    const tgt = state.targetLang, busy = !!offlineTrUi.controller, pack = await offlineTrLoad(), sources = offlineTrSources(tgt);
    const keep = select.value || (state.sourceLang || '').slice(0, 2);
    select.replaceChildren(...sources.map(code => Object.assign(document.createElement('option'), { value: code, textContent: offlineTrLangName(code) })));
    select.value = sources.includes(keep) ? keep : (sources.includes('fr') ? 'fr' : sources.includes('en') ? 'en' : (sources[0] || ''));
    box.querySelector('#offline-target').textContent = t('offTarget').replace('{lang}', offlineTrLangName(tgt));
    const route = select.value ? offlineTrRoute(select.value, tgt) : null;
    select.disabled = busy || !sources.length;
    const supported = offlineTrSupported();
    box.querySelector('#offline-note').textContent = !supported ? t('offUnsupported') : (route ? '' : t('offNoRoute'));
    install.hidden = !supported || !route;
    if (route && offlineTrReady(pack, route)) { install.disabled = true; install.textContent = t('offHave'); }
    else if (route) { install.disabled = busy; install.textContent = t('offDownload').replace('{mb}', offlineTrMb(offlineTrMissingBytes(pack, route))); }
    box.querySelector('#offline-cancel').hidden = !busy;
    box.querySelector('#offline-progress').hidden = !busy;
    const list = box.querySelector('#offline-list');
    list.replaceChildren(...(pack.directions.length ? [Object.assign(document.createElement('li'), { textContent: t('offInstalled'), className: 'offline-head' })] : []));
    for (const direction of pack.directions) {
        const [src, dst] = direction.split('>'), ids = offlineTrRoute(src, dst) || [];
        const li = document.createElement('li'); li.dataset.direction = direction;
        const label = document.createElement('span');
        label.textContent = `${offlineTrLangName(src)} → ${offlineTrLangName(dst)} · ${offlineTrMb(ids.reduce((sum, id) => sum + offlineTrModelBytes(id), 0))}${offlineTrUnitMb()}`;
        const test = Object.assign(document.createElement('button'), { type: 'button', className: 'btn-ghost', textContent: t('offTest') }); test.dataset.act = 'test';
        const remove = Object.assign(document.createElement('button'), { type: 'button', className: 'btn-ghost', textContent: t('offRemove') }); remove.dataset.act = 'remove';
        li.append(label, test, remove);
        list.append(li);
    }
}
async function offlineTrStartInstall() {
    const box = document.getElementById('offline-box'), status = box.querySelector('#offline-status'), progress = box.querySelector('#offline-progress');
    const src = box.querySelector('#offline-src').value, tgt = state.targetLang, controller = offlineTrUi.controller = new AbortController();
    status.textContent = t('offProgress').replace('{done}', 0).replace('{total}', '…');
    offlineTrRefreshBox();
    try {
        await offlineTrInstall(src, tgt, { signal: controller.signal, onProgress: (done, total) => {
            const now = Date.now();
            if (done < total && now - offlineTrUi.lastPaint < 150) return;   // не перемальовувати на кожен шматок
            offlineTrUi.lastPaint = now;
            progress.max = total || 1; progress.value = done;
            status.textContent = t('offProgress').replace('{done}', offlineTrMb(done)).replace('{total}', offlineTrMb(total));
        } });
        status.textContent = t('offDone').replace('{pair}', `${offlineTrLangName(src)} → ${offlineTrLangName(tgt)}`);
    } catch (e) {
        const kind = e && e.offlineTr;
        status.textContent = t(kind === 'aborted' ? 'offCancelled' : kind === 'network' ? 'offErrNetwork' : kind === 'quota' || kind === 'storage' ? 'offErrQuota'
            : kind === 'unsupported' ? 'offUnsupported' : kind === 'checksum' ? 'offErrChecksum' : kind === 'route' ? 'offNoRoute' : 'offErrServer');
    } finally {
        offlineTrUi.controller = null;
        offlineTrRefreshBox();
    }
}
// «Перевірити»: переклад зразка пакетом, з часом — щоб на самому пристрої було видно, чи рушій працює й наскільки швидко.
async function offlineTrSelfTest(src, tgt, status) {
    const sample = OFFLINE_TR_SAMPLES[src] || '';
    status.textContent = t('translating');
    const t0 = performance.now(), out = sample ? await offlineTranslate(sample, src, tgt) : null;
    status.textContent = out ? t('offTestResult').replace('{src}', sample).replace('{out}', out).replace('{sec}', ((performance.now() - t0) / 1000).toFixed(1))
        : t('offTestFail').replace('{why}', offlineTrFailure || '—');
}

window.addEventListener('load', offlineTrBuildBox, { once: true });
// У фоні на телефоні ~300 МБ рушія першими коштували б вкладці життя: щойно застосунок згорнули й нічого не перекладається — відпускаємо.
document.addEventListener('visibilitychange', () => { if (document.hidden && !offlineTrWaiting.size) offlineTrStop(); });
offlineTrLoad().catch(() => {});   // стан потрібен синхронно для діагностики вже після першого запуску

Object.assign(I18N, {
    offTitle: { uk: '📴 Офлайн-переклад', en: '📴 Offline translation', fr: '📴 Traduction hors ligne', ru: '📴 Офлайн-перевод', zh: '📴 离线翻译', ko: '📴 오프라인 번역', hi: '📴 ऑफ़लाइन अनुवाद', ga: '📴 Aistriúchán as líne' },
    offHint: { uk: 'Переклад слів і речень без інтернету — на самому пристрої. Один раз завантажте мовну пару (краще через Wi-Fi). Якість нижча, ніж у AI, тому онлайн перекладає AI, а пакет вмикається, коли мережі немає або AI не відповідає.',
        en: 'Translate words and sentences without internet, on the device itself. Download a language pair once (preferably over Wi-Fi). The quality is lower than the AI, so online the AI translates and the pack steps in when there is no network or the AI does not answer.',
        fr: "Traduisez mots et phrases sans internet, directement sur l'appareil. Téléchargez une paire de langues une fois (de préférence en Wi-Fi). La qualité est inférieure à celle de l'IA : en ligne c'est l'IA qui traduit, le pack prend le relais sans réseau ou quand l'IA ne répond pas.",
        ru: 'Перевод слов и предложений без интернета — на самом устройстве. Один раз скачайте языковую пару (лучше по Wi-Fi). Качество ниже, чем у AI, поэтому онлайн переводит AI, а пакет включается, когда сети нет или AI не отвечает.',
        zh: '无需网络，直接在设备上翻译单词和句子。请先下载一次语言包（建议使用 Wi-Fi）。其质量低于 AI，因此联网时由 AI 翻译，没有网络或 AI 无响应时才使用语言包。',
        ko: '인터넷 없이 기기에서 직접 단어와 문장을 번역합니다. 언어 쌍을 한 번 내려받으세요(Wi-Fi 권장). 품질은 AI보다 낮으므로 온라인에서는 AI가 번역하고, 네트워크가 없거나 AI가 응답하지 않을 때 이 팩이 대신합니다.',
        hi: 'बिना इंटरनेट के शब्दों और वाक्यों का अनुवाद सीधे डिवाइस पर। भाषा-जोड़ी एक बार डाउनलोड करें (बेहतर है Wi-Fi पर)। गुणवत्ता AI से कम है, इसलिए ऑनलाइन AI अनुवाद करता है और नेटवर्क न होने या AI के जवाब न देने पर यह पैक काम आता है।',
        ga: 'Aistrigh focail agus abairtí gan idirlíon, ar an ngléas féin. Íoslódáil péire teangacha uair amháin (go Wi-Fi más féidir). Tá an cháilíocht níos ísle ná an AI, mar sin aistríonn an AI ar líne agus glacann an pacáiste seo seilbh nuair nach bhfuil líonra ann nó nuair nach bhfreagraíonn an AI.' },
    offBookLang: { uk: 'Мова книги', en: 'Book language', fr: 'Langue du livre', ru: 'Язык книги', zh: '书籍语言', ko: '책 언어', hi: 'पुस्तक की भाषा', ga: 'Teanga an leabhair' },
    offTarget: { uk: 'Переклад на: {lang} (мову перекладу вибирають у меню: Навчання → Мова перекладу)', en: 'Translate into: {lang} (choose the translation language in the menu: Learning → Translation language)',
        fr: 'Traduire en : {lang} (choisissez la langue de traduction dans le menu : Apprentissage → Langue de traduction)', ru: 'Перевод на: {lang} (язык перевода выбирают в меню: Обучение → Язык перевода)',
        zh: '翻译成：{lang}（在菜单中选择翻译语言：学习 → 翻译语言）', ko: '번역 언어: {lang} (메뉴의 학습 → 번역 언어에서 선택)',
        hi: 'अनुवाद की भाषा: {lang} (मेनू में चुनें: सीखना → अनुवाद की भाषा)', ga: 'Aistrigh go: {lang} (roghnaigh an teanga sa roghchlár: Foghlaim → Teanga an aistriúcháin)' },
    offDownload: { uk: '⬇ Завантажити ≈ {mb} МБ', en: '⬇ Download ≈ {mb} MB', fr: '⬇ Télécharger ≈ {mb} Mo', ru: '⬇ Скачать ≈ {mb} МБ', zh: '⬇ 下载 ≈ {mb} MB', ko: '⬇ 내려받기 ≈ {mb} MB', hi: '⬇ डाउनलोड ≈ {mb} MB', ga: '⬇ Íoslódáil ≈ {mb} MB' },
    offHave: { uk: '✓ Вже встановлено', en: '✓ Already installed', fr: '✓ Déjà installé', ru: '✓ Уже установлено', zh: '✓ 已安装', ko: '✓ 이미 설치됨', hi: '✓ पहले से इंस्टॉल है', ga: '✓ Suiteáilte cheana' },
    offProgress: { uk: 'Завантаження: {done} з {total} МБ…', en: 'Downloading: {done} of {total} MB…', fr: 'Téléchargement : {done} sur {total} Mo…', ru: 'Загрузка: {done} из {total} МБ…',
        zh: '下载中：{done} / {total} MB…', ko: '내려받는 중: {done} / {total} MB…', hi: 'डाउनलोड हो रहा है: {total} में से {done} MB…', ga: 'Ag íoslódáil: {done} de {total} MB…' },
    offDone: { uk: 'Готово: {pair} працює без інтернету.', en: 'Done: {pair} works without internet.', fr: 'Terminé : {pair} fonctionne sans internet.', ru: 'Готово: {pair} работает без интернета.',
        zh: '完成：{pair} 现可离线使用。', ko: '완료: {pair} 번역이 인터넷 없이 동작합니다.', hi: 'हो गया: {pair} अब बिना इंटरनेट के काम करेगा।', ga: 'Déanta: oibríonn {pair} gan idirlíon.' },
    offCancelled: { uk: 'Завантаження скасовано. Те, що вже завантажено, збережено й повторно не качатиметься.', en: 'Download cancelled. What was already downloaded is kept and will not be downloaded again.',
        fr: 'Téléchargement annulé. Ce qui est déjà téléchargé est conservé et ne sera pas retéléchargé.', ru: 'Загрузка отменена. Уже скачанное сохранено и повторно скачиваться не будет.',
        zh: '下载已取消。已下载的部分会保留，不会重复下载。', ko: '내려받기를 취소했습니다. 이미 받은 파일은 보관되며 다시 받지 않습니다.',
        hi: 'डाउनलोड रद्द किया गया। जो पहले से डाउनलोड हो चुका है वह सुरक्षित है और दोबारा डाउनलोड नहीं होगा।', ga: 'Cealaíodh an íoslódáil. Coinnítear an méid a íoslódáladh cheana agus ní dhéanfar é a íoslódáil arís.' },
    offErrNetwork: { uk: "Зв'язок перервався. Натисніть «Завантажити» ще раз — уже завантажене не качатиметься заново.", en: 'The connection dropped. Press Download again; the part already downloaded is kept.',
        fr: "La connexion s'est interrompue. Appuyez de nouveau sur Télécharger ; la partie déjà reçue est conservée.", ru: 'Связь прервалась. Нажмите «Скачать» ещё раз — уже скачанное сохранено.',
        zh: '连接中断。请再次点击“下载”，已下载的部分会保留。', ko: '연결이 끊겼습니다. 내려받기를 다시 누르세요. 받은 부분은 보관됩니다.',
        hi: 'कनेक्शन टूट गया। डाउनलोड फिर दबाएँ; जितना डाउनलोड हो चुका है वह सुरक्षित है।', ga: 'Briseadh an nasc. Brúigh Íoslódáil arís; coinnítear an chuid a íoslódáladh cheana.' },
    offErrServer: { uk: 'Сервер моделей зараз недоступний. Спробуйте пізніше.', en: 'The model server is not available right now. Try again later.', fr: 'Le serveur de modèles est indisponible pour le moment. Réessayez plus tard.',
        ru: 'Сервер моделей сейчас недоступен. Попробуйте позже.', zh: '模型服务器暂时不可用，请稍后再试。', ko: '모델 서버를 지금은 사용할 수 없습니다. 나중에 다시 시도하세요.',
        hi: 'मॉडल सर्वर अभी उपलब्ध नहीं है। बाद में फिर कोशिश करें।', ga: 'Níl freastalaí na samhlacha ar fáil faoi láthair. Bain triail eile as níos déanaí.' },
    offErrChecksum: { uk: 'Завантажений файл не пройшов перевірку цілісності. Спробуйте ще раз.', en: 'A downloaded file failed its integrity check. Try again.',
        fr: "Un fichier téléchargé a échoué à la vérification d'intégrité. Réessayez.", ru: 'Скачанный файл не прошёл проверку целостности. Попробуйте ещё раз.',
        zh: '下载的文件未通过完整性校验，请重试。', ko: '내려받은 파일이 무결성 검사를 통과하지 못했습니다. 다시 시도하세요.',
        hi: 'डाउनलोड की गई फ़ाइल अखंडता जाँच में विफल रही। फिर कोशिश करें।', ga: 'Theip ar chomhad íoslódáilte an seiceáil sláine. Bain triail eile as.' },
    offErrQuota: { uk: 'Не вистачає місця на пристрої. Звільніть місце й спробуйте ще раз.', en: 'Not enough storage space on the device. Free some space and try again.',
        fr: "Pas assez d'espace de stockage sur l'appareil. Libérez de la place et réessayez.", ru: 'Не хватает места на устройстве. Освободите место и попробуйте снова.',
        zh: '设备存储空间不足。请释放空间后重试。', ko: '기기 저장 공간이 부족합니다. 공간을 확보한 뒤 다시 시도하세요.',
        hi: 'डिवाइस में पर्याप्त जगह नहीं है। जगह खाली करके फिर कोशिश करें।', ga: 'Níl go leor spáis stórála ar an ngléas. Saor spás agus bain triail eile as.' },
    offUnsupported: { uk: 'Цей браузер не підтримує офлайн-переклад (потрібен сучасний Chrome з WebAssembly).', en: 'This browser cannot run the offline translator (a current Chrome with WebAssembly is needed).',
        fr: 'Ce navigateur ne peut pas exécuter le traducteur hors ligne (il faut un Chrome récent avec WebAssembly).', ru: 'Этот браузер не поддерживает офлайн-перевод (нужен современный Chrome с WebAssembly).',
        zh: '此浏览器无法运行离线翻译（需要支持 WebAssembly 的新版 Chrome）。', ko: '이 브라우저는 오프라인 번역을 실행할 수 없습니다(WebAssembly를 지원하는 최신 Chrome 필요).',
        hi: 'यह ब्राउज़र ऑफ़लाइन अनुवादक नहीं चला सकता (WebAssembly वाला नया Chrome चाहिए)।', ga: 'Ní féidir leis an mbrabhsálaí seo an t-aistritheoir as líne a rith (is gá Chrome reatha le WebAssembly).' },
    offNoRoute: { uk: 'Для цієї пари мов офлайн-пакета немає.', en: 'There is no offline pack for this language pair.', fr: "Il n'existe pas de pack hors ligne pour cette paire de langues.",
        ru: 'Для этой пары языков офлайн-пакета нет.', zh: '此语言对没有离线语言包。', ko: '이 언어 쌍에는 오프라인 팩이 없습니다.', hi: 'इस भाषा-जोड़ी के लिए ऑफ़लाइन पैक उपलब्ध नहीं है।', ga: 'Níl pacáiste as líne ann don phéire teangacha seo.' },
    offInstalled: { uk: 'Встановлено:', en: 'Installed:', fr: 'Installé :', ru: 'Установлено:', zh: '已安装：', ko: '설치됨:', hi: 'इंस्टॉल किए गए:', ga: 'Suiteáilte:' },
    offRemove: { uk: '🗑 Видалити', en: '🗑 Remove', fr: '🗑 Supprimer', ru: '🗑 Удалить', zh: '🗑 删除', ko: '🗑 삭제', hi: '🗑 हटाएँ', ga: '🗑 Bain' },
    offTest: { uk: '🧪 Перевірити', en: '🧪 Test', fr: '🧪 Tester', ru: '🧪 Проверить', zh: '🧪 测试', ko: '🧪 테스트', hi: '🧪 जाँचें', ga: '🧪 Tástáil' },
    offTestResult: { uk: '«{src}» → «{out}» · {sec} с', en: '“{src}” → “{out}” · {sec} s', fr: '« {src} » → « {out} » · {sec} s', ru: '«{src}» → «{out}» · {sec} с',
        zh: '“{src}” → “{out}” · {sec} 秒', ko: '“{src}” → “{out}” · {sec}초', hi: '“{src}” → “{out}” · {sec} सेकंड', ga: '“{src}” → “{out}” · {sec} s' },
    offTestFail: { uk: 'Не вдалося перекласти на цьому пристрої: {why}', en: 'Could not translate on this device: {why}', fr: "Impossible de traduire sur cet appareil : {why}", ru: 'Не удалось перевести на этом устройстве: {why}',
        zh: '无法在此设备上翻译：{why}', ko: '이 기기에서 번역하지 못했습니다: {why}', hi: 'इस डिवाइस पर अनुवाद नहीं हो सका: {why}', ga: 'Níorbh fhéidir aistriú ar an ngléas seo: {why}' },
    offAlone: { uk: 'окремо', en: 'on its own', fr: 'seul', ru: 'отдельно', zh: '单独', ko: '단독', hi: 'अकेले', ga: 'leis féin', es: 'sola' },
    offNeedsPack: { uk: 'Щоб перекладати без інтернету, завантажте мовний пакет: Налаштування (🔑) → 📴 Офлайн-переклад.', en: 'To translate without internet, download a language pack: Settings (🔑) → 📴 Offline translation.',
        fr: 'Pour traduire sans internet, téléchargez un pack de langue : Réglages (🔑) → 📴 Traduction hors ligne.', ru: 'Чтобы переводить без интернета, скачайте языковой пакет: Настройки (🔑) → 📴 Офлайн-перевод.',
        zh: '要离线翻译，请下载语言包：设置（🔑）→ 📴 离线翻译。', ko: '인터넷 없이 번역하려면 언어 팩을 내려받으세요: 설정(🔑) → 📴 오프라인 번역.',
        hi: 'बिना इंटरनेट अनुवाद के लिए भाषा पैक डाउनलोड करें: सेटिंग्स (🔑) → 📴 ऑफ़लाइन अनुवाद।', ga: 'Chun aistriú gan idirlíon, íoslódáil pacáiste teanga: Socruithe (🔑) → 📴 Aistriúchán as líne.' },
    offUnitMb: { uk: 'МБ', en: 'MB', fr: 'Mo', ru: 'МБ', zh: 'MB', ko: 'MB', hi: 'MB', ga: 'MB' }
});
