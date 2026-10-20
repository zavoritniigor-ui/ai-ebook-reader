/* local-speech.js — озвучення окремих фраз через ЛОКАЛЬНИЙ мовний сервер (Kokoro для
 * англійської/французької, Piper для української), сервер на 127.0.0.1:8880.
 *
 * Вимкнено за замовчуванням. Вмикається прапорцем localStorage `reader_local_speech`
 * = '1' (його ставить власник на своєму ПК). Без сервера або без прапорця кожна фраза
 * іде через браузерний speechSynthesis, як і раніше — жодна поведінка не змінюється.
 *
 * Що покриває: одна фраза за раз — динаміки у спливаючому вікні (оригінал/переклад),
 * озвучка перекладу мовою (speakInLang). Неперервне читання сторінки (speakCurrentSentence)
 * і підсвітка за onboundary лишаються на браузерному синтезаторі.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Викликається з js/tts.js
 * (speakText/speakInLang) і cancelSpeech() зупиняє поточне локальне відтворення.
 */

// На ПК власника сторінка йде прямо до сервера; з телефона/планшета (і з самого сайту) — через Pages Function
// /api/speech, яка передає запит на сервер через тунель (functions/api/speech/[[path]].js).
const LOCAL_SPEECH_URL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8880' : '/api/speech';
const LOCAL_SPEECH_LANGS = new Set(['en', 'fr', 'uk']);
const LOCAL_SPEECH_HEALTH_TTL_MS = 30000;
const LOCAL_SPEECH_HEALTH_TIMEOUT_MS = 1500;

let localSpeechHealth = { at: 0, ok: false };
let localSpeechInFlight = null;   // AbortController запиту, що ще чекає на аудіо
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

// Чи можна зараз озвучити цією мовою локально (синхронно, за кешем).
function localSpeechReady(langCode) {
    if (!localSpeechEnabled() || !LOCAL_SPEECH_LANGS.has(langCode)) return false;
    refreshLocalSpeech();
    return localSpeechHealth.ok;
}

// Зупиняє все локальне: запит, що чекає, і поточне відтворення. Викликається з cancelSpeech(),
// тож усі існуючі місця зупинки (stopTooltipSpeech, startTTS тощо) зупиняють і локальний голос.
function stopLocalSpeech() {
    if (localSpeechInFlight) { localSpeechInFlight.abort(); localSpeechInFlight = null; }
    if (localSpeechAudio) {
        localSpeechAudio.onended = null;
        localSpeechAudio.onerror = null;
        try { localSpeechAudio.pause(); } catch (err) {}
        localSpeechAudio = null;
    }
    if (localSpeechAudioUrl) { URL.revokeObjectURL(localSpeechAudioUrl); localSpeechAudioUrl = null; }
}

// Озвучує фразу локально. Повертає false, якщо локальний шлях недоступний (тоді викликач
// одразу робить браузерне озвучення). Якщо сервер відмовив уже після старту, викликається
// fallback() — браузерне озвучення тієї самої фрази. gen — state.ttsGen на момент запуску:
// якщо за час запиту фразу скасували (новий тап, stopTooltipSpeech), аудіо не програється.
function speakViaLocal(text, langCode, side, offset, onEnd, gen, fallback) {
    if (!localSpeechReady(langCode)) return false;
    const spoken = offset ? text.slice(offset) : text;
    const controller = new AbortController();
    localSpeechInFlight = controller;
    fetch(LOCAL_SPEECH_URL + '/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spoken, lang: langCode }),
        signal: controller.signal
    })
        .then(r => {
            if (!r.ok) throw new Error('local speech HTTP ' + r.status);
            return r.blob();
        })
        .then(blob => {
            if (controller.signal.aborted || state.ttsGen !== gen) return;
            localSpeechInFlight = null;
            playLocalBlob(blob, side, text, offset, onEnd, gen, fallback);
        })
        .catch(err => {
            if (controller.signal.aborted || state.ttsGen !== gen) return;
            localSpeechInFlight = null;
            localSpeechHealth = { at: Date.now(), ok: false };
            console.warn('Local speech unavailable, using browser voice:', err);
            fallback();
        });
    return true;
}

// Відтворює готове аудіо і веде стан динаміка тим самим bindUtterance, що й браузерний шлях,
// тож іконка «стоп», кнопки і onEnd працюють однаково для обох рушіїв.
function playLocalBlob(blob, side, text, offset, onEnd, gen, fallback) {
    stopLocalSpeech();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const u = {};   // bindUtterance лише вішає onboundary/onend/onerror на цей об'єкт
    bindUtterance(u, side, text, offset, onEnd);
    if (typeof pauseBookAudio === 'function') pauseBookAudio();
    localSpeechAudio = audio;
    localSpeechAudioUrl = url;
    audio.onended = () => { stopLocalSpeech(); if (u.onend) u.onend(); };
    audio.onerror = () => { stopLocalSpeech(); if (u.onerror) u.onerror(); };
    audio.play().catch(err => {
        // Автовідтворення заборонене або файл не відкрився: прибираємо стан і переходимо на браузерний голос.
        if (state.ttsGen !== gen) return;
        stopLocalSpeech();
        if (u.onerror) u.onerror();
        console.warn('Local speech playback failed, using browser voice:', err);
        fallback();
    });
}
