/* device-llm.js — AI на самому пристрої: переклад і пояснення, коли інтернету немає.
 *
 * Модель — Gemma 4 E2B для веба (Google, Apache-2.0, ~2 ГБ), рушій — MediaPipe LLM Inference (@mediapipe/tasks-genai) на WebGPU.
 * Читач завантажує її один раз у Налаштуваннях (🔑 → 🧠 AI на пристрої). Онлайн, як і раніше, відповідають Groq → OpenAI; модель на
 * пристрої відповідає лише тоді, коли хмарного AI немає: нема мережі чи ключа або обидва не відповіли (requestAI у js/ai-client.js,
 * переклад у js/translation.js). Вона слабша за хмарний AI і помиляється частіше, тому відповідь позначена 📱.
 *
 *   js/device-llm-catalog.js            закріплені файли (розмір, SHA-256 рушія і кожної частини моделі по 64 МіБ); генерує tools/device_llm_catalog.py
 *   vendor/mediapipe-genai-<v>/          ES-модуль рушія і завантажувач wasm (в оболонці застосунку)
 *   functions/api/device-llm.js          віддає модель (Hugging Face) і wasm рушія (npm): CSP сторінки дозволяє лише свій домен
 *   Cache Storage 'reader-device-llm'    wasm, частини моделі й один запис стану; activate у sw.js його не чіпає
 *
 * Модель займає ~2 ГБ пам'яті відеокарти, тому рушій стартує з першим запитом і зупиняється через DEVICE_LLM_IDLE_MS або коли
 * застосунок згорнули. Класичний <script src>, НЕ ES-модуль (див. js/core.js); рушій MediaPipe — ES-модуль, його бере import().
 */
const DEVICE_LLM_CACHE = 'reader-device-llm';
const DEVICE_LLM_IDLE_MS = 5 * 60000;
const DEVICE_LLM_MAX_TOKENS = 4096;      // вхід + відповідь; більше контексту — більше пам'яті відеокарти
const DEVICE_LLM_MIN_ANSWER = 512;       // стільки токенів лишається на відповідь, решту може зайняти запит

let deviceLlmState = null;               // запис у Cache Storage: { v, engine, model, at }
let deviceLlmEngine = null, deviceLlmBoot = null, deviceLlmIdleTimer = 0, deviceLlmQueue = Promise.resolve(), deviceLlmBusy = 0;
let deviceLlmFailure = '', deviceLlmLast = null, deviceLlmLoadMs = 0, deviceLlmGpuInfo = null;

function deviceLlmError(kind, status) {
    const e = new Error('device AI: ' + kind + (status ? ' ' + status : ''));
    e.deviceLlm = kind; e.status = status;
    return e;
}
// Чи браузер узагалі має WebGPU і сховище (без звернення до відеокарти; саму відеокарту перевіряє deviceLlmGpu).
function deviceLlmSupported() {
    return typeof navigator === 'object' && !!navigator.gpu && typeof caches === 'object' && !!(self.crypto && crypto.subtle);
}
// Відеокарта: є адаптер WebGPU і він дає буфери, у які лягає модель. Результат запам'ятовується (і показується в 📋).
async function deviceLlmGpu() {
    if (deviceLlmGpuInfo) return deviceLlmGpuInfo;
    let info = { ok: false, reason: 'no WebGPU' };
    try {
        const adapter = navigator.gpu && await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (adapter) {
            const limits = adapter.limits, i = adapter.info || {};
            info = { ok: limits.maxBufferSize >= 256 * 1024 * 1024, vendor: i.vendor || '', architecture: i.architecture || '', maxBufferSize: limits.maxBufferSize,
                maxStorageBufferBindingSize: limits.maxStorageBufferBindingSize, fallback: !!adapter.isFallbackAdapter };
            if (!info.ok) info.reason = 'GPU buffers too small';
            if (adapter.isFallbackAdapter) { info.ok = false; info.reason = 'software GPU only'; }
        } else if (navigator.gpu) info.reason = 'no GPU adapter';
    } catch (e) { info = { ok: false, reason: String(e && e.message || e) }; }
    return deviceLlmGpuInfo = info;
}

// ========== СХОВИЩЕ (Cache Storage) ==========
const deviceLlmKey = (...parts) => location.origin + '/__device-llm/' + parts.map(encodeURIComponent).join('/');
async function deviceLlmLoad() {
    if (deviceLlmState) return deviceLlmState;
    let saved = null;
    try {
        // caches.has, не open: сам запуск застосунку не створює порожній кеш.
        const res = await caches.has(DEVICE_LLM_CACHE) && await (await caches.open(DEVICE_LLM_CACHE)).match(deviceLlmKey('state'));
        saved = res && await res.json();
    } catch (e) { /* нема Cache Storage (приватне вікно): нічого не встановлено */ }
    return deviceLlmState = saved && saved.v === 1 ? saved : { v: 1, engine: '', model: '' };
}
async function deviceLlmSave(st) {
    deviceLlmState = st;
    await (await caches.open(DEVICE_LLM_CACHE)).put(deviceLlmKey('state'), new Response(JSON.stringify(st), { headers: { 'content-type': 'application/json' } }));
}
// Встановлено саме те, що в каталозі (рушій і модель цієї версії). Синхронно: стан читається під час запуску.
function deviceLlmInstalled() {
    const st = deviceLlmState;
    return !!st && st.engine === DEVICE_LLM_CATALOG.engine.version && st.model === DEVICE_LLM_CATALOG.model.id;
}
// Чи може модель відповісти зараз: встановлена, і браузер має WebGPU (сама відеокарта перевіряється під час запуску рушія).
function deviceLlmReady() { return deviceLlmSupported() && deviceLlmInstalled() && deviceLlmFailure !== 'gpu'; }
const deviceLlmPartKey = (i) => deviceLlmKey('model', DEVICE_LLM_CATALOG.model.id, String(i));
const deviceLlmWasmKey = () => deviceLlmKey('engine', DEVICE_LLM_CATALOG.engine.version);
// Файли, яких не знає каталог (стара версія моделі чи рушія), місця не займають.
async function deviceLlmCollectGarbage() {
    const cache = await caches.open(DEVICE_LLM_CACHE), keep = new Set([deviceLlmKey('state'), deviceLlmWasmKey()]);
    DEVICE_LLM_CATALOG.model.parts.forEach((_, i) => keep.add(deviceLlmPartKey(i)));
    for (const request of await cache.keys()) if (!keep.has(request.url)) await cache.delete(request);
}

// ========== ЗАВАНТАЖЕННЯ ==========
// Один файл або один шматок моделі завантажується, перевіряється (розмір і SHA-256) і кладеться в сховище у Web Worker: SHA-256 і
// копіювання 64 МіБ у головному потоці на ~0,3 с (на планшеті — довше) зупиняли сторінку на кожній частині. Тіло worker'а йде в Blob,
// тож усе потрібне визначене всередині.
function deviceLlmFetchWorkerMain() {
    let controller = null;
    const hex = (buf) => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
    const fail = (kind, status) => { const e = new Error(kind); e.kind = kind; e.status = status; return e; };
    self.onmessage = async ({ data }) => {
        if (data.cmd === 'abort') { if (controller) controller.abort(); return; }
        const { url, from, size, sha256, cache, key } = data;
        controller = new AbortController();
        const signal = controller.signal;
        try {
            let res;
            try { res = await fetch(url, { cache: 'no-store', headers: from === null ? {} : { range: `bytes=${from}-${from + size - 1}` }, signal }); }
            catch (e) { throw fail(signal.aborted ? 'aborted' : 'network'); }
            if (res.status !== (from === null ? 200 : 206)) throw fail(res.status === 429 || res.status >= 500 ? 'busy' : 'server', res.status);
            const buf = new Uint8Array(size);
            let at = 0, told = 0;
            try {
                const reader = res.body.getReader();
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (at + value.length > size) throw fail('checksum');
                    buf.set(value, at); at += value.length;
                    if (at - told >= 1 << 20) { self.postMessage({ bytes: at - told }); told = at; }
                }
            } catch (e) { throw e.kind ? e : fail(signal.aborted ? 'aborted' : 'network'); }
            if (at !== size || hex(await crypto.subtle.digest('SHA-256', buf)) !== sha256) throw fail('checksum');
            try { await (await caches.open(cache)).put(key, new Response(buf, { headers: { 'content-type': 'application/octet-stream', 'x-sha256': sha256 } })); }
            catch (e) { throw fail(e && e.name === 'QuotaExceededError' ? 'quota' : 'storage'); }
            self.postMessage({ bytes: at - told, done: true });
        } catch (e) {
            self.postMessage({ error: e.kind || 'network', status: e.status });
        } finally { controller = null; }
    };
}
function deviceLlmFetchWorker() {
    const url = URL.createObjectURL(new Blob(['(' + deviceLlmFetchWorkerMain + ')()'], { type: 'text/javascript' }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
}
function deviceLlmFetch(worker, job, onBytes, signal) {
    return new Promise((resolve, reject) => {
        const abort = () => worker.postMessage({ cmd: 'abort' });
        signal?.addEventListener('abort', abort, { once: true });
        const end = (fn, value) => { signal?.removeEventListener('abort', abort); worker.onmessage = worker.onerror = null; fn(value); };
        worker.onmessage = ({ data }) => {
            if (data.bytes) onBytes(data.bytes);
            if (data.error) end(reject, deviceLlmError(signal && signal.aborted ? 'aborted' : data.error, data.status));
            else if (data.done) end(resolve);
        };
        worker.onerror = (e) => end(reject, deviceLlmError('storage', e && e.message));
        worker.postMessage({ url: location.origin + '/api/device-llm?f=' + job.file, from: job.from, size: job.size, sha256: job.sha256, cache: DEVICE_LLM_CACHE, key: job.key });
    });
}
// Завантажує рушій і модель. Уже завантажені й перевірені частини (x-sha256) повторно не качаються: обрив зв'язку коштує одну
// частину на 64 МіБ, а не 2 ГБ.
async function deviceLlmInstall({ onProgress, signal } = {}) {
    if (!deviceLlmSupported()) throw deviceLlmError('unsupported');
    const gpu = await deviceLlmGpu();
    if (!gpu.ok) throw deviceLlmError('gpu');
    const { engine, model } = DEVICE_LLM_CATALOG;
    const jobs = [{ key: deviceLlmWasmKey(), file: engine.wasm.file, from: null, size: engine.wasm.size, sha256: engine.wasm.sha256 }];
    model.parts.forEach((sha256, i) => jobs.push({ key: deviceLlmPartKey(i), file: model.file, from: i * model.part,
        size: Math.min(model.part, model.size - i * model.part), sha256 }));
    const total = jobs.reduce((sum, job) => sum + job.size, 0);
    const cache = await caches.open(DEVICE_LLM_CACHE);
    let done = 0, missing = 0;
    const have = [];
    for (const job of jobs) {
        const res = await cache.match(job.key);
        const ok = !!res && res.headers.get('x-sha256') === job.sha256;
        have.push(ok);
        if (ok) done += job.size; else missing += job.size;
    }
    try {
        const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
        if (est && est.quota && est.quota - (est.usage || 0) < missing + 50e6) throw deviceLlmError('quota');
    } catch (e) { if (e && e.deviceLlm) throw e; }
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* лише прохання не чистити модель за браком місця */ }
    if (onProgress) onProgress(done, total);
    const worker = deviceLlmFetchWorker();
    try {
        for (const [i, job] of jobs.entries()) {
            if (have[i]) continue;
            for (let attempt = 0; ; attempt++) {   // мобільна мережа рве довгі завантаження: частина пробується ще двічі
                const before = done;
                try { await deviceLlmFetch(worker, job, n => { done += n; if (onProgress) onProgress(done, total); }, signal); break; }
                catch (e) {
                    done = before;
                    if (e.deviceLlm === 'aborted' || (signal && signal.aborted) || attempt >= 2 || !['network', 'busy', 'checksum'].includes(e.deviceLlm)) throw e;
                    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                }
            }
        }
    } finally { worker.terminate(); }
    await deviceLlmSave({ v: 1, engine: engine.version, model: model.id, at: Date.now() });
    await deviceLlmCollectGarbage();
    deviceLlmFailure = '';
}
async function deviceLlmRemove() {
    deviceLlmStop();
    deviceLlmState = { v: 1, engine: '', model: '' };
    try { await caches.delete(DEVICE_LLM_CACHE); } catch (e) { /* сховище недоступне: запис у пам'яті вже порожній */ }
}
// Сховище загубило частину моделі (браузер почистив місце): забуваємо встановлення, щоб Налаштування знову запропонували завантаження.
async function deviceLlmForget() {
    deviceLlmStop();
    deviceLlmState = { v: 1, engine: '', model: '' };
    try { await deviceLlmSave(deviceLlmState); } catch (e) { /* нема сховища */ }
}

// ========== РУШІЙ ==========
// Модель іде в рушій потоком, частина за частиною: 2 ГБ одним масивом не виділити на планшеті.
function deviceLlmModelStream(cache) {
    let i = 0;
    const n = DEVICE_LLM_CATALOG.model.parts.length;
    return new ReadableStream({
        async pull(controller) {
            if (i >= n) { controller.close(); return; }
            const res = await cache.match(deviceLlmPartKey(i));
            if (!res) { controller.error(new Error('missing part ' + i)); return; }
            controller.enqueue(new Uint8Array(await res.arrayBuffer()));
            i++;
        }
    });
}
// Тести підміняють це фабрикою, що не потребує відеокарти.
let deviceLlmCreateEngine = async (cache) => {
    const { engine } = DEVICE_LLM_CATALOG;
    const genai = await import(new URL(engine.module, location.href).href);
    const wasm = await cache.match(deviceLlmWasmKey());
    if (!wasm) throw new Error('missing engine');
    const wasmUrl = URL.createObjectURL(await wasm.blob());
    try {
        const fileset = { wasmLoaderPath: new URL(engine.loader, location.href).href, wasmBinaryPath: wasmUrl };
        return await genai.LlmInference.createFromOptions(fileset, {
            baseOptions: { modelAssetBuffer: deviceLlmModelStream(cache).getReader() },
            maxTokens: DEVICE_LLM_MAX_TOKENS, topK: 1, temperature: 0, randomSeed: 1 });   // greedy: a translation must not change from tap to tap
    } finally { URL.revokeObjectURL(wasmUrl); }
};
async function deviceLlmStart() {
    if (deviceLlmEngine) return deviceLlmEngine;
    if (deviceLlmBoot) return deviceLlmBoot;
    const boot = deviceLlmBoot = (async () => {
        const gpu = await deviceLlmGpu();
        if (!gpu.ok) { deviceLlmFailure = 'gpu'; throw deviceLlmError('gpu'); }
        const t0 = performance.now();
        const engine = await deviceLlmCreateEngine(await caches.open(DEVICE_LLM_CACHE));
        deviceLlmLoadMs = Math.round(performance.now() - t0);
        if (deviceLlmBoot !== boot) { try { engine.close(); } catch (e) { /* зупинено, поки вантажилось */ } throw deviceLlmError('stopped'); }
        return deviceLlmEngine = engine;
    })();
    try { return await boot; }
    finally { if (deviceLlmBoot === boot) deviceLlmBoot = null; }
}
function deviceLlmStop() {
    clearTimeout(deviceLlmIdleTimer);
    deviceLlmBoot = null;
    if (deviceLlmEngine) { try { deviceLlmEngine.close(); } catch (e) { /* уже закритий */ } deviceLlmEngine = null; }
}
// Шаблон розмови Gemma 4. Без <|think|> у системній репліці модель не розмірковує вголос; якщо все ж почала — канал думок прибирається.
function deviceLlmPrompt(user, system) {
    return (system ? '<|turn>system\n' + system + '<turn|>\n' : '') + '<|turn>user\n' + user + '<turn|>\n<|turn>model\n';
}
function deviceLlmClean(text) {
    return String(text || '').replace(/<\|channel>[\s\S]*?<channel\|>/g, '').replace(/<\|?turn\|?>|<turn\|>|<\|turn>/g, '').trim();
}
// Відповідь моделі на пристрої: рядок. Одна задача за раз (рушій так уміє); скасований signal зупиняє генерацію.
// options: { system, onDelta(delta, accumulated), task }.
function deviceLlmGenerate(prompt, signal, options = {}) {
    const run = async () => {
        clearTimeout(deviceLlmIdleTimer);
        if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        deviceLlmBusy++;
        const abort = () => { try { deviceLlmEngine && deviceLlmEngine.cancelProcessing(); } catch (e) { /* нема що зупиняти */ } };
        signal?.addEventListener('abort', abort, { once: true });
        try {
            let engine;
            try { engine = await deviceLlmStart(); }
            catch (e) {
                if (!e.deviceLlm) deviceLlmFailure = String(e && e.message || e);
                if (/^missing /.test(String(e && e.message))) await deviceLlmForget();
                throw e.deviceLlm ? e : deviceLlmError('engine');
            }
            if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
            const full = deviceLlmPrompt(prompt, options.system);
            let size = 0;
            try { size = engine.sizeInTokens(full); } catch (e) { /* лише для обмеження */ }
            if (size > DEVICE_LLM_MAX_TOKENS - DEVICE_LLM_MIN_ANSWER) throw deviceLlmError('too long', size);
            const t0 = performance.now();
            let first = 0, acc = '';
            const out = await engine.generateResponse(full, (part, done) => {
                if (!part) return;
                if (!first) first = performance.now() - t0;
                acc += part;
                if (options.onDelta && !(signal && signal.aborted)) { try { options.onDelta(part, deviceLlmClean(acc)); } catch (e) { /* відображення не зупиняє генерацію */ } }
            });
            if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
            const text = deviceLlmClean(out);
            let outTokens = 0;
            try { outTokens = engine.sizeInTokens(out); } catch (e) { /* лише для діагностики */ }
            const ms = performance.now() - t0;
            deviceLlmLast = { task: options.task || '', inTokens: size, outTokens, ms: Math.round(ms), firstMs: Math.round(first),
                tokensPerSec: outTokens && ms > first ? Math.round(outTokens / ((ms - first) / 1000) * 10) / 10 : null, at: Date.now() };
            deviceLlmFailure = '';
            if (!text) throw deviceLlmError('empty');
            return text;
        } finally {
            signal?.removeEventListener('abort', abort);
            deviceLlmBusy--;
            clearTimeout(deviceLlmIdleTimer);
            deviceLlmIdleTimer = setTimeout(() => { if (!deviceLlmBusy) deviceLlmStop(); }, DEVICE_LLM_IDLE_MS);
        }
    };
    const job = deviceLlmQueue.then(run, run);
    deviceLlmQueue = job.catch(() => {});
    return job;
}
// Переклад моделлю на пристрої (js/translation.js): рядок або null — запасний шлях ніколи не ламає основний.
async function deviceLlmTranslate(text, src, tgt, contextSentence, signal) {
    if (!deviceLlmReady()) return null;
    const name = (code) => { try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code; } catch (e) { return code; } };
    const clean = String(text || '').trim().slice(0, 2000);
    const ctx = String(contextSentence || '').trim();
    const word = !/\s/.test(clean) && ctx && ctx !== clean;
    // A word alone: the model first translates the whole sentence and then names the word's translation in it. Asked for the word
    // directly, the small model guessed from the word's look (carence → «недосконалість», apport → «додаток»); through its own
    // translation of the sentence it found the sense (нестача, надходження) — measured on book 56 sentences.
    const prompt = word
        ? `${name(src)} sentence: ${ctx.slice(0, 400)}\nFirst translate the whole sentence into ${name(tgt)}. Then, on the last line, write only the ${name(tgt)} translation of the word «${clean}» as used in it, in the form: WORD: <translation>`
        : ctx && ctx !== clean
            // a part of a sentence: only those words, in the sense the sentence gives them
            ? `${name(src)} sentence: ${ctx.slice(0, 400)}\nTranslate into ${name(tgt)} only this part of it, as used there: ${clean}\nAnswer with the translation of that part only.`
            : `Translate this ${name(src)} text into ${name(tgt)}. Answer with the translation only.\n\n${clean}`;
    try {
        let out = await deviceLlmGenerate(prompt, signal, { task: 'translation' });
        if (word) {
            const lines = out.split('\n').map(l => l.trim()).filter(Boolean);
            const last = lines.reverse().find(l => /^\**\s*(WORD|«?[^:\s]{1,40}»?)\s*\**\s*:/i.test(l)) || lines[0] || '';
            // «WORD: надходження», «WORD: apport: надходження», «carence: нестача», «Книга: книга» — the translation is after the last label.
            out = last.replace(/\*\*/g, '').replace(/^\s*WORD\s*:\s*/i, '');
            const own = out.toLowerCase().indexOf(clean.toLowerCase());
            if (own >= 0 && own < 3 && /^[«"]?\s*[:—-]/.test(out.slice(own + clean.length).replace(/^»/, ''))) out = out.slice(own + clean.length).replace(/^»?\s*[:—-]\s*/, '');
            else if (/^[^:]{1,40}:\s*\S/.test(out)) out = out.replace(/^[^:]{1,40}:\s*/, '');
        }
        out = out.replace(/\*\*/g, '').trim();
        return (word ? out.replace(/^["«“]|["»”.]$/g, '') : out.replace(/^["«“]([\s\S]*)["»”]$/, '$1')).trim() || null;   // a sentence keeps its full stop
    } catch (e) { if (e && e.name === 'AbortError') throw e; return null; }
}
// Для 📋 діагностики: без текстів.
function deviceLlmReport() {
    const st = deviceLlmState;
    return { supported: deviceLlmSupported(), gpu: deviceLlmGpuInfo, installed: deviceLlmInstalled(), state: st ? { engine: st.engine, model: st.model, at: st.at } : 'not read yet',
        catalog: { engine: DEVICE_LLM_CATALOG.engine.version, model: DEVICE_LLM_CATALOG.model.id }, running: !!deviceLlmEngine, loadMs: deviceLlmLoadMs,
        failure: deviceLlmFailure, last: deviceLlmLast };
}

// ========== НАЛАШТУВАННЯ: секція в діалозі 🔑 ==========
const deviceLlmUi = { controller: null, lastPaint: 0 };
const deviceLlmGb = (bytes) => (bytes / 1e9).toFixed(1);
function deviceLlmBuildBox() {
    const content = document.querySelector('#settings-modal .modal-content');
    if (!content || document.getElementById('device-llm-box')) return;
    const make = (tag, props = {}) => Object.assign(document.createElement(tag), props);
    const box = make('section', { id: 'device-llm-box', className: 'sync-box' });
    const title = make('h3'); title.dataset.i18n = 'dlTitle';
    const hint = make('p', { className: 'key-hint' }); hint.dataset.i18n = 'dlHint';
    const note = make('p', { id: 'device-llm-note', className: 'key-hint' });
    const actions = make('div', { className: 'sync-actions' });
    const install = make('button', { type: 'button', id: 'device-llm-install', className: 'btn-secondary' });
    const cancel = make('button', { type: 'button', id: 'device-llm-cancel', className: 'btn-ghost', hidden: true }); cancel.dataset.i18n = 'cancel';
    const test = make('button', { type: 'button', id: 'device-llm-test', className: 'btn-ghost', hidden: true }); test.dataset.i18n = 'offTest';
    const remove = make('button', { type: 'button', id: 'device-llm-remove', className: 'btn-ghost', hidden: true }); remove.dataset.i18n = 'offRemove';
    actions.append(install, cancel, test, remove);
    const progress = make('progress', { id: 'device-llm-progress', max: 100, value: 0, hidden: true });
    const status = make('p', { id: 'device-llm-status' }); status.setAttribute('role', 'status');
    box.append(title, hint, note, actions, progress, status);
    // Під секцією офлайн-перекладу: обидві — про роботу без інтернету.
    const after = content.querySelector('#offline-box') || content.querySelector('#api-keys-form');
    if (after) after.after(box); else content.append(box);
    install.addEventListener('click', deviceLlmStartInstall);
    cancel.addEventListener('click', () => { if (deviceLlmUi.controller) deviceLlmUi.controller.abort(); });
    test.addEventListener('click', deviceLlmSelfTest);
    remove.addEventListener('click', () => deviceLlmRemove().then(() => deviceLlmRefreshBox(true), () => deviceLlmRefreshBox(true)));
    applyI18n();
    deviceLlmRefreshBox();
}
async function deviceLlmRefreshBox(clearStatus = false) {
    const box = document.getElementById('device-llm-box');
    if (!box) return;
    const status = box.querySelector('#device-llm-status'), install = box.querySelector('#device-llm-install');
    if (clearStatus === true && !deviceLlmUi.controller) status.textContent = '';
    await deviceLlmLoad();
    const busy = !!deviceLlmUi.controller, installed = deviceLlmInstalled(), supported = deviceLlmSupported();
    const gpu = supported && !installed ? await deviceLlmGpu() : deviceLlmGpuInfo;
    const usable = supported && (!gpu || gpu.ok);
    box.querySelector('#device-llm-note').textContent = !supported ? t('dlUnsupported') : !usable ? t('dlNoGpu').replace('{why}', gpu.reason || '—') : '';
    install.hidden = !usable || installed;
    install.disabled = busy;
    install.textContent = t('dlDownload').replace('{gb}', deviceLlmGb(DEVICE_LLM_CATALOG.model.size + DEVICE_LLM_CATALOG.engine.wasm.size));
    box.querySelector('#device-llm-cancel').hidden = !busy;
    box.querySelector('#device-llm-progress').hidden = !busy;
    box.querySelector('#device-llm-test').hidden = !installed || busy;
    box.querySelector('#device-llm-remove').hidden = !installed || busy;
    if (installed && !busy && !status.textContent) status.textContent = t('dlInstalled').replace('{name}', DEVICE_LLM_CATALOG.model.name).replace('{gb}', deviceLlmGb(DEVICE_LLM_CATALOG.model.size));
}
async function deviceLlmStartInstall() {
    const box = document.getElementById('device-llm-box'), status = box.querySelector('#device-llm-status'), progress = box.querySelector('#device-llm-progress');
    const controller = deviceLlmUi.controller = new AbortController();
    status.textContent = t('dlProgress').replace('{done}', '0').replace('{total}', '…');
    deviceLlmRefreshBox();
    try {
        await deviceLlmInstall({ signal: controller.signal, onProgress: (done, total) => {
            const now = Date.now();
            if (done < total && now - deviceLlmUi.lastPaint < 250) return;
            deviceLlmUi.lastPaint = now;
            progress.max = total || 1; progress.value = done;
            status.textContent = t('dlProgress').replace('{done}', deviceLlmGb(done)).replace('{total}', deviceLlmGb(total));
        } });
        status.textContent = t('dlDone');
    } catch (e) {
        const kind = e && e.deviceLlm;
        status.textContent = t(kind === 'aborted' ? 'offCancelled' : kind === 'network' ? 'offErrNetwork' : kind === 'quota' || kind === 'storage' ? 'dlErrQuota'
            : kind === 'unsupported' ? 'dlUnsupported' : kind === 'gpu' ? 'dlNoGpuShort' : kind === 'checksum' ? 'offErrChecksum' : 'offErrServer');
    } finally {
        deviceLlmUi.controller = null;
        deviceLlmRefreshBox();
    }
}
// «Перевірити»: переклад зразка, з часом — щоб на самому пристрої було видно, чи модель працює й наскільки швидко.
async function deviceLlmSelfTest() {
    const status = document.querySelector('#device-llm-status');
    status.textContent = t('dlLoading');
    const sample = 'Le vieil homme lit un livre dans le jardin.', t0 = performance.now();
    let out = null;
    try { out = await deviceLlmTranslate(sample, 'fr', state.targetLang || 'uk', '', null); } catch (e) { /* показано нижче */ }
    status.textContent = out ? t('offTestResult').replace('{src}', sample).replace('{out}', out).replace('{sec}', ((performance.now() - t0) / 1000).toFixed(1))
        : t('offTestFail').replace('{why}', deviceLlmFailure || '—');
}

// The section is no longer shown in Settings (owner, 2026-10-26: «тільки цю функцію потрібно видалити… код залишається»).
// The code stays: deviceLlmBuildBox() builds the section when called (tests/device_llm_browser.py does), an installed model
// still answers offline.
// У фоні ~2 ГБ пам'яті відеокарти першими коштували б вкладці життя: щойно застосунок згорнули й модель нічого не робить — відпускаємо.
document.addEventListener('visibilitychange', () => { if (document.hidden && !deviceLlmBusy) deviceLlmStop(); });
deviceLlmLoad().catch(() => {});   // стан потрібен синхронно (deviceLlmReady) вже після першого запуску

Object.assign(I18N, {
    dlTitle: { uk: '🧠 AI на пристрої', en: '🧠 On-device AI', fr: "🧠 IA sur l'appareil", ru: '🧠 AI на устройстве', zh: '🧠 设备端 AI', ko: '🧠 기기 내 AI', hi: '🧠 डिवाइस पर AI', ga: '🧠 AI ar an ngléas' },
    dlHint: { uk: 'Переклад і пояснення без інтернету: модель Gemma 4 (Google) працює на відеокарті самого пристрою. Один раз завантажте ~2 ГБ (краще через Wi-Fi). Онлайн, як і раніше, відповідає хмарний AI; модель на пристрої вмикається, коли мережі немає або AI не відповідає. Вона слабша й інколи помиляється — її відповіді позначені 📱.',
        en: 'Translation and explanations without internet: the Gemma 4 model (Google) runs on the device\'s own graphics chip. Download ~2 GB once (preferably over Wi-Fi). Online the cloud AI answers as before; the on-device model steps in when there is no network or the AI does not answer. It is weaker and sometimes wrong; its answers are marked 📱.',
        fr: "Traduction et explications sans internet : le modèle Gemma 4 (Google) tourne sur la puce graphique de l'appareil. Téléchargez ~2 Go une fois (de préférence en Wi-Fi). En ligne, l'IA du cloud répond comme avant ; le modèle local prend le relais sans réseau ou quand l'IA ne répond pas. Il est moins bon et se trompe parfois ; ses réponses sont marquées 📱.",
        ru: 'Перевод и объяснения без интернета: модель Gemma 4 (Google) работает на видеочипе самого устройства. Один раз скачайте ~2 ГБ (лучше по Wi-Fi). Онлайн, как и раньше, отвечает облачный AI; модель на устройстве включается, когда сети нет или AI не отвечает. Она слабее и иногда ошибается — её ответы помечены 📱.',
        zh: '无需网络的翻译和讲解：Gemma 4 模型（Google）在设备自身的显卡上运行。请下载一次约 2 GB（建议使用 Wi-Fi）。联网时仍由云端 AI 回答；没有网络或 AI 无响应时由设备端模型接替。它较弱，有时会出错，其回答标有 📱。',
        ko: '인터넷 없이 번역과 설명: Gemma 4 모델(Google)이 기기 자체의 그래픽 칩에서 실행됩니다. 약 2 GB를 한 번 내려받으세요(Wi-Fi 권장). 온라인에서는 이전처럼 클라우드 AI가 답하고, 네트워크가 없거나 AI가 응답하지 않을 때 기기 모델이 대신합니다. 성능이 낮고 가끔 틀리며, 답변에는 📱 표시가 붙습니다.',
        hi: 'बिना इंटरनेट अनुवाद और व्याख्या: Gemma 4 मॉडल (Google) डिवाइस की अपनी ग्राफ़िक्स चिप पर चलता है। लगभग 2 GB एक बार डाउनलोड करें (बेहतर है Wi-Fi पर)। ऑनलाइन पहले की तरह क्लाउड AI जवाब देता है; नेटवर्क न होने या AI के जवाब न देने पर डिवाइस मॉडल काम आता है। यह कमज़ोर है और कभी-कभी गलत होता है; इसके जवाबों पर 📱 का निशान होता है।',
        ga: 'Aistriúchán agus mínithe gan idirlíon: ritheann an tsamhail Gemma 4 (Google) ar shlis ghrafaicí an ghléis féin. Íoslódáil ~2 GB uair amháin (go Wi-Fi más féidir). Ar líne freagraíonn AI na scamall mar a rinne sé riamh; glacann an tsamhail ar an ngléas seilbh nuair nach bhfuil líonra ann nó nuair nach bhfreagraíonn an AI. Tá sí níos laige agus bíonn sí mícheart uaireanta; tá 📱 ar a cuid freagraí.' },
    dlDownload: { uk: '⬇ Завантажити ≈ {gb} ГБ', en: '⬇ Download ≈ {gb} GB', fr: '⬇ Télécharger ≈ {gb} Go', ru: '⬇ Скачать ≈ {gb} ГБ', zh: '⬇ 下载 ≈ {gb} GB', ko: '⬇ 내려받기 ≈ {gb} GB', hi: '⬇ डाउनलोड ≈ {gb} GB', ga: '⬇ Íoslódáil ≈ {gb} GB' },
    dlProgress: { uk: 'Завантаження: {done} з {total} ГБ…', en: 'Downloading: {done} of {total} GB…', fr: 'Téléchargement : {done} sur {total} Go…', ru: 'Загрузка: {done} из {total} ГБ…',
        zh: '下载中：{done} / {total} GB…', ko: '내려받는 중: {done} / {total} GB…', hi: 'डाउनलोड हो रहा है: {total} में से {done} GB…', ga: 'Ag íoslódáil: {done} de {total} GB…' },
    dlDone: { uk: 'Готово: переклад і пояснення працюватимуть і без інтернету. Натисніть «Перевірити».', en: 'Done: translation and explanations will work without internet too. Press Test.',
        fr: "Terminé : traduction et explications fonctionneront aussi sans internet. Appuyez sur Tester.", ru: 'Готово: перевод и объяснения будут работать и без интернета. Нажмите «Проверить».',
        zh: '完成：翻译和讲解在没有网络时也能使用。请点击“测试”。', ko: '완료: 번역과 설명이 인터넷 없이도 동작합니다. 테스트를 누르세요.', hi: 'हो गया: अनुवाद और व्याख्या बिना इंटरनेट भी काम करेंगे। जाँचें दबाएँ।', ga: 'Déanta: oibreoidh aistriúchán agus mínithe gan idirlíon freisin. Brúigh Tástáil.' },
    dlInstalled: { uk: 'Встановлено: {name}, {gb} ГБ.', en: 'Installed: {name}, {gb} GB.', fr: 'Installé : {name}, {gb} Go.', ru: 'Установлено: {name}, {gb} ГБ.', zh: '已安装：{name}，{gb} GB。', ko: '설치됨: {name}, {gb} GB.', hi: 'इंस्टॉल: {name}, {gb} GB।', ga: 'Suiteáilte: {name}, {gb} GB.' },
    dlLoading: { uk: 'Модель запускається (перший раз — до хвилини)…', en: 'Starting the model (the first time takes up to a minute)…', fr: "Démarrage du modèle (la première fois, jusqu'à une minute)…", ru: 'Модель запускается (первый раз — до минуты)…',
        zh: '正在启动模型（首次最多需要一分钟）…', ko: '모델을 시작하는 중(처음에는 최대 1분)…', hi: 'मॉडल शुरू हो रहा है (पहली बार एक मिनट तक)…', ga: 'Ag tosú na samhla (suas le nóiméad an chéad uair)…' },
    dlUnsupported: { uk: 'Цей браузер не може запустити AI на пристрої: потрібен сучасний Chrome з WebGPU.', en: 'This browser cannot run on-device AI: a current Chrome with WebGPU is needed.',
        fr: "Ce navigateur ne peut pas exécuter l'IA sur l'appareil : il faut un Chrome récent avec WebGPU.", ru: 'Этот браузер не может запустить AI на устройстве: нужен современный Chrome с WebGPU.',
        zh: '此浏览器无法运行设备端 AI：需要支持 WebGPU 的新版 Chrome。', ko: '이 브라우저는 기기 내 AI를 실행할 수 없습니다. WebGPU를 지원하는 최신 Chrome이 필요합니다.',
        hi: 'यह ब्राउज़र डिवाइस पर AI नहीं चला सकता: WebGPU वाला नया Chrome चाहिए।', ga: 'Ní féidir leis an mbrabhsálaí seo AI a rith ar an ngléas: is gá Chrome reatha le WebGPU.' },
    dlNoGpu: { uk: 'Відеочип цього пристрою не підходить для моделі ({why}).', en: 'This device\'s graphics chip cannot run the model ({why}).', fr: "La puce graphique de cet appareil ne peut pas exécuter le modèle ({why}).",
        ru: 'Видеочип этого устройства не подходит для модели ({why}).', zh: '此设备的显卡无法运行该模型（{why}）。', ko: '이 기기의 그래픽 칩으로는 모델을 실행할 수 없습니다({why}).',
        hi: 'इस डिवाइस की ग्राफ़िक्स चिप यह मॉडल नहीं चला सकती ({why})।', ga: 'Ní féidir le slis ghrafaicí an ghléis seo an tsamhail a rith ({why}).' },
    dlNoGpuShort: { uk: 'Відеочип цього пристрою не підходить для моделі.', en: 'This device\'s graphics chip cannot run the model.', fr: "La puce graphique de cet appareil ne peut pas exécuter le modèle.",
        ru: 'Видеочип этого устройства не подходит для модели.', zh: '此设备的显卡无法运行该模型。', ko: '이 기기의 그래픽 칩으로는 모델을 실행할 수 없습니다.', hi: 'इस डिवाइस की ग्राफ़िक्स चिप यह मॉडल नहीं चला सकती।', ga: 'Ní féidir le slis ghrafaicí an ghléis seo an tsamhail a rith.' },
    dlErrQuota: { uk: 'Не вистачає місця: потрібно ~2,1 ГБ вільних. Звільніть місце й спробуйте ще раз — уже завантажене збережено.', en: 'Not enough space: ~2.1 GB free is needed. Free some space and try again; what was downloaded is kept.',
        fr: "Pas assez d'espace : il faut ~2,1 Go libres. Libérez de la place et réessayez ; ce qui est téléchargé est conservé.", ru: 'Не хватает места: нужно ~2,1 ГБ свободных. Освободите место и попробуйте снова — скачанное сохранено.',
        zh: '空间不足：需要约 2.1 GB 可用空间。释放空间后重试，已下载的部分会保留。', ko: '공간이 부족합니다. 약 2.1 GB가 필요합니다. 공간을 확보한 뒤 다시 시도하세요. 받은 부분은 보관됩니다.',
        hi: 'जगह कम है: लगभग 2.1 GB खाली चाहिए। जगह खाली करके फिर कोशिश करें; डाउनलोड किया हिस्सा सुरक्षित है।', ga: 'Níl go leor spáis: tá ~2.1 GB saor de dhíth. Saor spás agus bain triail eile as; coinnítear a bhfuil íoslódáilte.' },
    dlMark: { uk: '📱 на пристрої', en: '📱 on device', fr: "📱 sur l'appareil", ru: '📱 на устройстве', zh: '📱 设备端', ko: '📱 기기', hi: '📱 डिवाइस पर', ga: '📱 ar an ngléas' },
    dlTooLong: { uk: 'Фрагмент задовгий для AI на пристрої. Виділіть коротший.', en: 'The passage is too long for the on-device AI. Select a shorter one.', fr: "Le passage est trop long pour l'IA sur l'appareil. Sélectionnez-en un plus court.",
        ru: 'Фрагмент слишком длинный для AI на устройстве. Выделите покороче.', zh: '片段对设备端 AI 来说太长。请选择更短的。', ko: '기기 내 AI에는 너무 긴 구절입니다. 더 짧게 선택하세요.',
        hi: 'डिवाइस वाले AI के लिए अंश बहुत लंबा है। छोटा अंश चुनें।', ga: 'Tá an sliocht rófhada don AI ar an ngléas. Roghnaigh ceann níos giorra.' }
});
