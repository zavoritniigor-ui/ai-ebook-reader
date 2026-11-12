/* local-speech.js — озвучення через ЛОКАЛЬНИЙ мовний сервер (Kokoro для
 * англійської/французької), сервер на 127.0.0.1:8880. Українська — системним голосом.
 *
 * Вимкнено за замовчуванням. Вмикається прапорцем localStorage `reader_local_speech`
 * = '1' (його ставить власник на своєму ПК). Без сервера або без прапорця кожна фраза
 * іде через браузерний speechSynthesis, як і раніше — жодна поведінка не змінюється.
 *
 * Що покриває: одна фраза за раз — динаміки у спливаючому вікні (оригінал/переклад),
 * озвучка перекладу мовою (speakInLang), читання сторінки й виділення (speakCurrentSentence).
 * Серверне аудіо зберігає підсвітку речення; часових меж окремих слів сервер не повертає.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Викликається з js/tts.js
 * (speakText/speakInLang) і cancelSpeech() зупиняє поточне локальне відтворення.
 */

// На ПК власника сторінка йде прямо до сервера; з телефона/планшета (і з самого сайту) — через Pages Function
// /api/speech, яка передає запит на сервер через тунель (functions/api/speech/[[path]].js).
const LOCAL_SPEECH_URL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8880' : '/api/speech';
const LOCAL_SPEECH_LANGS = new Set(['en', 'fr']);
const LOCAL_SPEECH_HEALTH_TTL_MS = 30000;
const LOCAL_SPEECH_HEALTH_TIMEOUT_MS = 1500;
const LOCAL_SPEECH_REQUEST_TIMEOUT_MS = 20000;
const LOCAL_SPEECH_CHUNK_MAX = 260;

let localSpeechHealth = { at: 0, ok: false };
let localSpeechInFlight = null;   // AbortController запиту, що ще чекає на аудіо
let localSpeechPrefetch = null;   // AbortController фонового передзавантаження наступного уривка
let localSpeechAudio = null;      // поточний <audio>, що програється
let localSpeechAudioUrl = null;   // його blob: URL, звільняється при зупинці

function localSpeechEnabled() {
    try { return localStorage.getItem('reader_local_speech') === '1'; }
    catch (err) { return false; }
}

// Оновлює кеш доступності сервера у фоні. Сам виклик speakText не чекає відповіді:
// він бере стан з кеша, тож перша фраза після відкриття може піти браузерним голосом.
function refreshLocalSpeech() {
    if (!localSpeechEnabled()) return;
    if (Date.now() - localSpeechHealth.at < LOCAL_SPEECH_HEALTH_TTL_MS) return;
    localSpeechHealth.at = Date.now();   // не запускати дубльовані перевірки
    fetch(LOCAL_SPEECH_URL + '/health', { signal: AbortSignal.timeout(LOCAL_SPEECH_HEALTH_TIMEOUT_MS) })
        .then(r => { localSpeechHealth = { at: Date.now(), ok: r.ok }; })
        .catch(() => { localSpeechHealth = { at: Date.now(), ok: false }; });
}

// Health is advisory: do not send the first tap to the system voice while it is pending.
// The speech request itself establishes availability and has a bounded fallback.
function localSpeechReady(langCode) {
    if (!localSpeechEnabled() || !LOCAL_SPEECH_LANGS.has(langCode)) return false;
    const recentlyFailed = localSpeechHealth.failed && Date.now() - localSpeechHealth.at < LOCAL_SPEECH_HEALTH_TTL_MS;
    refreshLocalSpeech();
    return !recentlyFailed;
}

// Зупиняє все локальне: запит, що чекає, і поточне відтворення. Викликається з cancelSpeech(),
// тож усі існуючі місця зупинки (stopTooltipSpeech, startTTS тощо) зупиняють і локальний голос.
function stopLocalSpeech() {
    if (localSpeechInFlight) { localSpeechInFlight.abort(); localSpeechInFlight = null; }
    if (localSpeechPrefetch) { localSpeechPrefetch.abort(); localSpeechPrefetch = null; }
    if (localSpeechAudio) {
        localSpeechAudio.onended = null;
        localSpeechAudio.onerror = null;
        try { localSpeechAudio.pause(); } catch (err) {}
        localSpeechAudio = null;
    }
    if (localSpeechAudioUrl) { URL.revokeObjectURL(localSpeechAudioUrl); localSpeechAudioUrl = null; }
}

// Розбиває довгий виділений фрагмент (абзац або цілу сторінку) на речення/частини до LOCAL_SPEECH_CHUNK_MAX символів,
// щоб перше речення звучало вже за ~0.25 с, а наступні підвантажувалися фоново під час програвання без перевищення
// ліміту символів чи 20-секундного таймауту при паралельних запитах із кількох гаджетів.
function splitLocalSpeechChunks(spoken) {
    if (!spoken || spoken.length <= LOCAL_SPEECH_CHUNK_MAX) return [{ text: spoken, offset: 0 }];
    const cuts = typeof sentenceCuts === 'function' ? sentenceCuts(spoken) : [];
    const raw = [];
    let prev = 0;
    for (const c of cuts) {
        if (c > prev) raw.push({ text: spoken.slice(prev, c), offset: prev });
        prev = c;
    }
    if (prev < spoken.length) raw.push({ text: spoken.slice(prev), offset: prev });
    const pieces = [];
    for (const seg of raw) {
        let s = seg.text, base = seg.offset;
        while (s.length > LOCAL_SPEECH_CHUNK_MAX) {
            const slice = s.slice(0, LOCAL_SPEECH_CHUNK_MAX);
            let cut = Math.max(slice.lastIndexOf(', '), slice.lastIndexOf('; '), slice.lastIndexOf(': '), slice.lastIndexOf(' — '), slice.lastIndexOf(' – '));
            if (cut >= 80) cut += 1;
            else {
                cut = slice.lastIndexOf(' ');
                if (cut < 60) cut = LOCAL_SPEECH_CHUNK_MAX;
            }
            const head = s.slice(0, cut).trim();
            if (head) pieces.push({ text: head, offset: base });
            const adv = cut < s.length && s[cut] === ' ' ? cut + 1 : cut;
            s = s.slice(adv);
            base += adv;
        }
        const tail = s.trim();
        if (tail) pieces.push({ text: tail, offset: base });
    }
    if (!pieces.length) return [{ text: spoken, offset: 0 }];
    const merged = [pieces[0]];
    for (let i = 1; i < pieces.length; i++) {
        const last = merged[merged.length - 1];
        if (merged.length > 1 && last.text.length + 1 + pieces[i].text.length <= LOCAL_SPEECH_CHUNK_MAX) {
            last.text += ' ' + pieces[i].text;
        } else {
            merged.push({ text: pieces[i].text, offset: pieces[i].offset });
        }
    }
    return merged;
}

function fetchLocalSpeechChunk(chunkText, langCode, isPrefetch) {
    const controller = new AbortController();
    if (isPrefetch) localSpeechPrefetch = controller;
    else localSpeechInFlight = controller;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, LOCAL_SPEECH_REQUEST_TIMEOUT_MS);
    const promise = fetch(LOCAL_SPEECH_URL + '/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunkText, lang: langCode }),
        signal: controller.signal
    })
        .then(r => {
            if (!r.ok) {
                const err = new Error('local speech HTTP ' + r.status);
                err.httpStatus = r.status;
                throw err;
            }
            return r.blob();
        })
        .then(blob => {
            clearTimeout(timeout);
            if (isPrefetch) { if (localSpeechPrefetch === controller) localSpeechPrefetch = null; }
            else { if (localSpeechInFlight === controller) localSpeechInFlight = null; }
            return blob;
        })
        .catch(err => {
            clearTimeout(timeout);
            if (isPrefetch) { if (localSpeechPrefetch === controller) localSpeechPrefetch = null; }
            else { if (localSpeechInFlight === controller) localSpeechInFlight = null; }
            if (controller.signal.aborted && !timedOut) {
                const abortErr = new Error('cancelled');
                abortErr.cancelled = true;
                throw abortErr;
            }
            throw err;
        });
    return { controller, promise };
}

// Озвучує фразу локально. Повертає false, якщо локальний шлях недоступний (тоді викликач
// одразу робить браузерне озвучення). Якщо сервер відмовив уже після старту, викликається
// fallback() — браузерне озвучення тієї самої фрази. gen — state.ttsGen на момент запуску:
// якщо за час запиту фразу скасували (новий тап, stopTooltipSpeech), аудіо не програється.
function speakViaLocal(text, langCode, side, offset, onEnd, gen, fallback) {
    if (!localSpeechReady(langCode)) return false;
    // Soft hyphens are layout hints, not pronunciation or word boundaries.
    // Keep source DOM/selection offsets intact and remove them only from server input.
    const spoken = (offset ? text.slice(offset) : text).replace(/\u00ad/g, '');
    const chunks = splitLocalSpeechChunks(spoken);
    if (chunks.length <= 1) {
        const { controller, promise } = fetchLocalSpeechChunk(spoken, langCode, false);
        promise
            .then(blob => {
                if (controller.signal.aborted || state.ttsGen !== gen) return;
                localSpeechHealth = { at: Date.now(), ok: true };
                playLocalBlob(blob, side, text, offset, onEnd, gen, fallback);
            })
            .catch(err => {
                if (err.cancelled || state.ttsGen !== gen) return;
                if (err.httpStatus !== 400) localSpeechHealth = { at: Date.now(), ok: false, failed: true };
                console.warn('Local speech unavailable, using browser voice:', err);
                fallback();
            });
        return true;
    }

    // Багатореченнєвий виділений фрагмент (абзац або сторінка): програємо частинами з фоновим передзавантаженням.
    const u = {};
    let bound = false;
    let prefetched = null;
    const playChunkAt = (idx, blobPromise) => {
        blobPromise
            .then(blob => {
                if (state.ttsGen !== gen) return;
                localSpeechHealth = { at: Date.now(), ok: true };
                stopLocalSpeech();
                if (!bound) {
                    bound = true;
                    if (side) bindUtterance(u, side, text, offset, onEnd);
                    else u.onend = onEnd;
                }
                if (u.onboundary) u.onboundary({ charIndex: chunks[idx].offset });
                if (typeof pauseBookAudio === 'function') pauseBookAudio();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                localSpeechAudio = audio;
                localSpeechAudioUrl = url;
                if (idx + 1 < chunks.length) {
                    prefetched = fetchLocalSpeechChunk(chunks[idx + 1].text, langCode, true);
                } else {
                    prefetched = null;
                }
                let settled = false;
                const current = () => !settled && state.ttsGen === gen && localSpeechAudio === audio;
                audio.onended = () => {
                    if (!current()) return;
                    settled = true;
                    if (idx + 1 < chunks.length) {
                        const nextPromise = prefetched ? prefetched.promise : fetchLocalSpeechChunk(chunks[idx + 1].text, langCode, false).promise;
                        prefetched = null;
                        playChunkAt(idx + 1, nextPromise);
                    } else {
                        stopLocalSpeech();
                        if (u.onend) u.onend();
                    }
                };
                const playbackFailed = err => {
                    if (!current()) return;
                    settled = true;
                    stopLocalSpeech();
                    console.warn('Local speech playback failed, using browser voice:', err);
                    fallback((offset || 0) + chunks[idx].offset);
                };
                audio.onerror = playbackFailed;
                audio.play().catch(playbackFailed);
            })
            .catch(err => {
                if (err.cancelled || state.ttsGen !== gen) return;
                stopLocalSpeech();
                if (err.httpStatus !== 400) localSpeechHealth = { at: Date.now(), ok: false, failed: true };
                console.warn('Local speech unavailable, using browser voice:', err);
                fallback((offset || 0) + chunks[idx].offset);
            });
    };
    playChunkAt(0, fetchLocalSpeechChunk(chunks[0].text, langCode, false).promise);
    return true;
}

// Відтворює готове аудіо і веде стан динаміка тим самим bindUtterance, що й браузерний шлях,
// тож іконка «стоп», кнопки і onEnd працюють однаково для обох рушіїв.
function playLocalBlob(blob, side, text, offset, onEnd, gen, fallback) {
    stopLocalSpeech();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const u = {};   // bindUtterance лише вішає onboundary/onend/onerror на цей об'єкт
    if (side) bindUtterance(u, side, text, offset, onEnd);
    else u.onend = onEnd;  // page/selection queue, without changing popup speaker state
    if (typeof pauseBookAudio === 'function') pauseBookAudio();
    localSpeechAudio = audio;
    localSpeechAudioUrl = url;
    let settled = false;
    const current = () => !settled && state.ttsGen === gen && localSpeechAudio === audio;
    audio.onended = () => {
        if (!current()) return;
        settled = true;
        stopLocalSpeech();
        if (u.onend) u.onend();
    };
    const playbackFailed = err => {
        if (!current()) return;
        settled = true;
        stopLocalSpeech();
        // Finish only after the fallback speaks; advancing here would skip this segment.
        console.warn('Local speech playback failed, using browser voice:', err);
        fallback();
    };
    audio.onerror = playbackFailed;
    audio.play().catch(playbackFailed);
}

// Перемикач у «Налаштуваннях» (index.html, #btn-local-speech) — той самий прапорець reader_local_speech, що й раніше.
// Так його можна ввімкнути з телефона й планшета без консолі розробника.
Object.assign(I18N, {
    mLocalSpeech: { uk: "Локальний голос", en: "Local voice", fr: "Voix locale", ru: "Локальный голос", zh: "本地语音", ko: "로컬 음성", hi: "लोकल आवाज़", ga: "Guth áitiúil", es: "Voz local" },
    mLocalSpeechDesc: { uk: "Озвучка через ваш сервер; без нього — голос браузера", en: "Speech from your server; without it, the browser voice", fr: "Voix de votre serveur ; sinon la voix du navigateur", ru: "Озвучка через ваш сервер; без него — голос браузера", zh: "通过您的服务器朗读；否则使用浏览器语音", ko: "내 서버를 통한 음성; 없으면 브라우저 음성", hi: "आपके सर्वर से आवाज़; वरना ब्राउज़र की आवाज़", ga: "Guth ó do fhreastalaí; murach sin, guth an bhrabhsálaí", es: "Voz del servidor; sin él, la voz del navegador" }
});
(function initLocalSpeechSwitch() {
    const btn = document.getElementById('btn-local-speech');
    if (!btn) return;
    const paint = () => setMenuSwitch(btn, localSpeechEnabled());
    btn.onclick = () => {
        const on = !localSpeechEnabled();
        writeStored('reader_local_speech', on ? '1' : '0');
        if (!on) {
            if (isSpeakingGlobal && !state.ttsPaused) {
                state.ttsGen++;
                cancelSpeech();
                // Restart this sentence with the browser voice instead of leaving its queue waiting.
                speakCurrentSentence();
            } else stopTooltipSpeech();
        }
        localSpeechHealth = { at: 0, ok: false };   // перевірити доступність заново при наступній фразі
        paint();
    };
    paint();
})();
