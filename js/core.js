/* core.js — спільний фундамент застосунку: state/els, i18n, безпечне збереження
 * в localStorage, санітизація HTML (safeHtml/escapeHtml), керування async-задачами
 * (beginAsyncTask/cancelAsyncTasks), мережеві хелпери (fetchWithTimeout тощо),
 * мутовні контейнери епох/PDF-задач (readerEpoch/pdfTasks).
 *
 * НАВМИСНО звичайний класичний <script>, а НЕ ES-модуль: якщо це стане type="module",
 * воно виконається в defer-таймінгу (після повного парсингу документа), тоді як решта
 * застосунку лишається класичним інлайн-скриптом, що виконується СИНХРОННО одразу по
 * досягненні парсером — тобто РАНІШЕ за будь-який модуль. Класичні <script>-теги без
 * атрибутів (як цей) виконуються в порядку документа й ДІЛЯТЬ один спільний
 * script-scope — усе, що оголошено тут через let/const, лишається звичайним глобальним
 * ідентифікатором для решти файлів застосунку (і для CDP Runtime.evaluate в тестах),
 * так само, як і сьогодні в одному файлі. Це і є весь механізм модуляризації: розбиття
 * на файли за відповідальністю без зміни того, як виконується код. Свідомо БЕЗ
 * 'use strict' — оригінальний файл ніколи не був strict mode, і додавати його зараз
 * означало б непередбачену зміну поведінки, а не суто механічне перенесення коду.
 */

let storageWarningShown = false;
function readStored(key) {
    try { return localStorage.getItem(key); } catch (err) { return null; }
}
function writeStored(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (err) {
        if (!storageWarningShown) {
            storageWarningShown = true;
            alert('Браузер не зміг зберегти налаштування або позначки. Після закриття сторінки останні зміни можуть бути втрачені. Перевірте вільне місце та дозвіл на збереження даних.');
        }
        return false;
    }
}

// Rebuild untrusted markup from an inert template using an explicit allowlist.
function safeHtml(value, ai = false) {
    const source = document.createElement('template');
    source.innerHTML = String(value || '');
    const output = document.createElement('div');
    const tags = new Set('p div span section article header footer main aside h1 h2 h3 h4 h5 h6 b strong i em u s del ins small sub sup br hr blockquote pre code ul ol li dl dt dd table caption thead tbody tfoot tr th td colgroup col a img figure figcaption ruby rt rp abbr button'.split(' '));
    const drop = new Set('script style link meta base title iframe frame frameset object embed applet svg math template noscript textarea select input audio video source form'.split(' '));
    const classes = new Set('verb-card verb-head verb-forme verb-chips verb-chip lvl lvl-block tt-note'.split(' '));
    const styles = new Set('color background-color font-size font-weight font-style font-family text-align text-decoration line-height white-space border border-color border-width border-style border-collapse padding padding-left padding-right padding-top padding-bottom margin margin-left margin-right margin-top margin-bottom'.split(' '));
    function copy(node, parent) {
        if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(document.createTextNode(node.nodeValue)); return; }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const tag = node.localName;
        if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml' || drop.has(tag)) return;
        if (!tags.has(tag) || (tag === 'button' && !ai)) {
            Array.from(node.childNodes).forEach(child => copy(child, parent)); return;
        }
        const el = document.createElement(tag);
        for (const attr of ['title', 'lang', 'dir', 'alt']) {
            if (node.hasAttribute(attr)) el.setAttribute(attr, node.getAttribute(attr));
        }
        for (const attr of ['colspan', 'rowspan', 'span', 'start', 'width', 'height']) {
            const v = node.getAttribute(attr);
            if (v && /^\d{1,4}$/.test(v)) el.setAttribute(attr, v);
        }
        if (ai) {
            el.className = Array.from(node.classList).filter(c => classes.has(c)).join(' ');
            if (/^[ABC][12]$/.test(node.getAttribute('data-l') || '')) el.dataset.l = node.getAttribute('data-l');
            if (node.hasAttribute('data-v')) el.dataset.v = node.getAttribute('data-v').slice(0, 120);
        }
        if (tag === 'button') el.type = 'button';
        if (!ai && node.id) el.id = 'book-' + node.id;
        if (tag === 'a') {
            const href = (node.getAttribute('href') || '').trim();
            if (href.startsWith('#') && !ai) el.setAttribute('href', '#book-' + href.slice(1));
            else if (/^https?:\/\/|^mailto:/i.test(href) && !/[\u0000-\u0020]/.test(href)) {
                el.setAttribute('href', href); el.target = '_blank'; el.rel = 'noopener noreferrer';
            }
        }
        if (tag === 'img' && !ai) {
            const src = (node.getAttribute('src') || '').trim();
            // Відносний шлях (для зображень усередині EPUB) дозволяємо, але НЕ
            // protocol-relative "//host/..." — де-факто зовнішнє посилання
            // (успадковує https: поточної сторінки) і непомітний спосіб влаштувати
            // трекінг-піксель у книзі: підвантажиться з чужого домену щоразу,
            // як читач відкриє розділ, і видасть сам факт читання цієї книги.
            if ((src && !/[:\\\u0000-\u0020]/.test(src) && !src.startsWith('//')) || /^https?:\/\//i.test(src) || /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(src)) {
                el.setAttribute('src', src); el.referrerPolicy = 'no-referrer';
            }
        }
        for (const prop of Array.from(node.style)) {
            const v = node.style.getPropertyValue(prop);
            // No URLs, escapes, functions, positioning or application CSS variables.
            // CSSOM normalizes ordinary hex colors to rgb(...). Preserve those
            // numeric colors without admitting URLs, variables or other functions.
            const numericColor = /^(?:color|background-color|border-color)$/.test(prop)
                && /^(?:rgba?|hsla?)\([\d\s.,%+\/-]+\)$/i.test(v);
            if (styles.has(prop) && (/^[#%.,\s\w-]+$/.test(v) || numericColor)) el.style.setProperty(prop, v);
        }
        Array.from(node.childNodes).forEach(child => copy(child, el));
        parent.appendChild(el);
    }
    Array.from(source.content.childNodes).forEach(node => copy(node, output));
    return output.innerHTML;
}

// Мутовний контейнер (а не окремі let), щоб майбутні ES-модулі могли імпортувати
// об'єкт і читати/писати його поля напряму — на відміну від голого let,
// імпортований binding не можна переприсвоїти ззовні модуля.
const readerEpoch = { book: 0, render: 0 };
// Той самий патерн: один мутовний об'єкт замість трьох окремих let, які раніше
// переприсвоювались із трьох різних логічних ділянок коду (рендер PDF,
// скасування zoom/pan-взаємодії, фонове призупинення застосунку).
const pdfTasks = { render: null, loading: null, text: null };
const asyncTasks = new Map();
function beginAsyncTask(key) {
    asyncTasks.get(key)?.controller.abort();
    const controller = new AbortController();
    const epoch = readerEpoch.book, target = state.targetLang;
    const task = { controller, signal: controller.signal,
        current: () => asyncTasks.get(key) === task && epoch === readerEpoch.book && target === state.targetLang && !controller.signal.aborted };
    asyncTasks.set(key, task);
    return task;
}
function cancelAsyncTasks(keys = Array.from(asyncTasks.keys())) {
    for (const key of keys) { asyncTasks.get(key)?.controller.abort(); asyncTasks.delete(key); }
}
function invalidateSelection() {
    cancelDragSelection();
    state.lookupToken++;
    svoToken++;
    cancelAsyncTasks(['lookup', 'svo']);
    cancelTooltipHide();
    els.tooltip.style.display = 'none';
    clearSelectionHighlight();
    state.lastSelectedRange = null;
    state.lastTapPoint = null; state.lastWordNode = null; state.ctxSentence = '';
}
function showReaderError(err) {
    els.pages.textContent = 'Помилка відкриття документа: ' + (err.message || String(err));
    els.progress.textContent = t('error');
}
function waitForResult(promise, signal, timeoutMs) {
    return new Promise((resolve, reject) => {
        let timer;
        const finish = (fn, value) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); fn(value); };
        const abort = () => finish(reject, new DOMException('Cancelled', 'AbortError'));
        timer = setTimeout(() => finish(reject, new Error('Перевищено час очікування перекладу.')), timeoutMs);
        signal?.addEventListener('abort', abort, { once: true });
        promise.then(value => finish(resolve, value), err => finish(reject, err));
        if (signal?.aborted) abort();
    });
}
async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const signal = options.signal;
    let timedOut = false;
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        // Keep the timeout active while the response body is downloading as well.
        const body = await response.arrayBuffer();
        return new Response([204, 205, 304].includes(response.status) ? null : body, { status: response.status, statusText: response.statusText, headers: response.headers });
    } catch (err) {
        if (timedOut) throw new Error('Сервер не відповів вчасно. Спробуйте ще раз.');
        if (err.name === 'AbortError') throw err;
        if (err instanceof TypeError) throw new Error(t('errNoConnection'));
        throw err;
    } finally {
        clearTimeout(timer); signal?.removeEventListener('abort', abort);
    }
}
async function readResponseJson(response) {
    try { return await response.json(); }
    catch (err) { throw new Error('Сервер повернув некоректну відповідь. Спробуйте ще раз.'); }
}
function aiText(value) {
    const text = sanitizeAI(value);
    if (!text) throw new Error('AI повернув порожню відповідь. Спробуйте ще раз.');
    return text;
}

// Захисне зчитування невеликого числа з localStorage: пошкоджене чи чуже значення
// не повинне ламати запуск — просто повертаємось до типового.
function readStoredNumber(key, fallback, min, max) {
    const n = parseFloat(readStored(key));
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}
// One registry drives selectors, translation/AI language names and TTS locales.
// Browser-provided translation and speech engines may still report a pair/voice
// unavailable; callers keep their existing graceful fallback behavior.
const LANGUAGE_CONFIG = {
    uk: { locale: 'uk-UA', aiName: 'українською', promptName: 'Ukrainian' },
    en: { locale: 'en-US', aiName: 'англійською', promptName: 'English' },
    fr: { locale: 'fr-FR', aiName: 'французькою', promptName: 'French' },
    ru: { locale: 'ru-RU', aiName: 'російською', promptName: 'Russian' },
    zh: { locale: 'zh-CN', aiName: 'китайською (спрощеною)', promptName: 'Simplified Chinese' },
    ko: { locale: 'ko-KR', aiName: 'корейською', promptName: 'Korean' },
    hi: { locale: 'hi-IN', aiName: 'гінді', promptName: 'Hindi' },
    ga: { locale: 'ga-IE', aiName: 'ірландською', promptName: 'Irish' }
};
const SUPPORTED_LANGUAGE_CODES = Object.keys(LANGUAGE_CONFIG);
function storedLanguage(key, fallback) {
    const value = readStored(key);
    return SUPPORTED_LANGUAGE_CODES.includes(value) ? value : fallback;
}
const state = {
    format: null, currentIndex: 0, totalPages: 0,
    // Масштаб PDF, розмір шрифту й режим "Вивчення" переживають перезапуск застосунку —
    // раніше кожен холодний старт (у т.ч. після повернення з фону, коли Android
    // вивантажив сторінку) скидав їх до типових значень.
    pdfScale: readStoredNumber('reader_pdf_scale', 1, 0.25, 4),
    pdfFit: ['width', 'page', 'free'].includes(readStored('reader_pdf_fit')) ? readStored('reader_pdf_fit') : 'width',
    fontSize: readStoredNumber('reader_font_size', 18, 12, 40),
    epubZip: null, spine: [], txtLines: [],
    translateMode: readStored('reader_translate_mode') === '1', extractedTextForTTS: "", currentLangCode: 'en-US',
    selectedVoiceURIByLang: (() => {
        // Голоси, обрані користувачем, зберігаються між сеансами — раніше вибір
        // жив лише до перезавантаження сторінки.
        try { return Object.assign(Object.fromEntries(SUPPORTED_LANGUAGE_CODES.map(code => [code, null])), JSON.parse(readStored('reader_voices') || '{}')); }
        catch (e) { return Object.fromEntries(SUPPORTED_LANGUAGE_CODES.map(code => [code, null])); }
    })(),
    voiceChosenByUser: (() => {
        try { const value = JSON.parse(readStored('reader_voices_manual') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch (e) { return {}; }
    })(),
    apiKey: readStored('reader_gemini_key') || '', groqKey: readStored('reader_groq_key') || '',
    openaiKey: readStored('reader_openai_key') || '',
    activeAiProvider: (() => {
        const saved = readStored('reader_active_ai_provider');
        if (['openai', 'groq', 'gemini'].includes(saved)) return saved;
        // One-time migration preserves the old text-provider preference. Never
        // reselect based on keys once an explicit provider has been stored.
        const provider = readStored('reader_groq_key') ? 'groq' : 'gemini';
        writeStored('reader_active_ai_provider', provider);
        return provider;
    })(),
    translationCache: {}, lastAskContext: "",
    pageInChapter: 0, totalPagesInChapter: 1, bookKey: null, suppressNextClick: false,
    ttsQueue: [], ttsIndex: 0, ttsPaused: false, ttsGen: 0, pdfZoom: 1, lastTapPoint: null, expandLevel: 0, lastWordNode: null,
    targetLang: storedLanguage('reader_target_lang', 'uk'),
    uiLang: storedLanguage('reader_ui_lang', 'uk'),
    speakSide: readStored('reader_speak_side') || 'original',
    lastGrammarSentence: '', lastAskParagraph: '', activeVerb: null, activeTense: 'indicatif présent', verbs: [], docChapters: null,
    refinedKeys: new Set(),
    sourceLang: 'en-US', ctxSentence: '',
    ink: {}, inkMode: false, inkErase: false, inkColor: '#1a56db',
    measuredStep: 0, animTimer: null, dragRange: null, lookupToken: 0, selSpans: [], touchSelecting: false, speakingSide: null, speakingId: 0, speakPos: 0, speakBase: 0, speakResume: null,
    altVoices: readStored('reader_alt_voices') === '1'
};

const els = {
    upload: document.getElementById('file-upload'), container: document.getElementById('reader-container'), pages: document.getElementById('reader-pages'),
    toc: document.getElementById('toc-list'), progress: document.getElementById('progress-indicator'),
    tooltip: document.getElementById('word-tooltip'), ttOriginal: document.getElementById('tt-original'),
    ttReplayBtn: document.getElementById('tt-replay-btn'), ttExpandBtn: document.getElementById('tt-expand-btn'), ttTranslation: document.getElementById('tt-translation'),
    ttSpeakTranslation: document.getElementById('tt-speak-translation'), ttSvoBtn: document.getElementById('tt-svo-btn'),
    ttAiBtn: document.getElementById('tt-ai-btn'), ttAskBtn: document.getElementById('tt-ask-btn'),
    mainArea: document.getElementById('main-area'), translateBtn: document.getElementById('btn-translate-mode'),
    sidebar: document.getElementById('sidebar'), voiceSelect: document.getElementById('voice-select'),
    ttsBtn: document.getElementById('btn-tts'), ttsStopBtn: document.getElementById('btn-tts-stop'), grammarPanel: document.getElementById('grammar-panel'),
    targetLang: document.getElementById('target-lang'), uiLang: document.getElementById('ui-lang'),
    askPanel: document.getElementById('ask-panel'), grammarTab: document.getElementById('grammar-tab'),
    askTab: document.getElementById('ask-tab'), grammarContent: document.getElementById('grammar-content'),
    askContent: document.getElementById('ask-content'), askInput: document.getElementById('ask-input'),
    askSendBtn: document.getElementById('ask-send-btn'), micBtn: document.getElementById('mic-btn'), micLang: document.getElementById('mic-lang'),
    footerHandle: document.getElementById('footer-handle'), menuHandle: document.getElementById('menu-handle'),
    ttsToggle: document.getElementById('tts-toggle'), ttsPrev: document.getElementById('tts-prev'), ttsNext: document.getElementById('tts-next'),
    altVoicesBtn: document.getElementById('btn-alt-voices')
};
els.pages.style.fontSize = `${state.fontSize}px`;

const toggleTocDesktopBtn = document.getElementById('toggle-toc-desktop');
const openToc = () => { els.sidebar.classList.toggle('collapsed'); };

if(toggleTocDesktopBtn) toggleTocDesktopBtn.onclick = openToc;

// TTS
let ttsSynth = window.speechSynthesis;
let voices = [];
// Евристика якості голосу — імена рушіїв відрізняються за платформою (Android/iOS/десктоп),
// тому перевіряємо кілька поширених маркерів "преміальних"/нейромереж голосів одразу.
const VOICE_QUALITY_RE = /neural|natural|enhanced|premium|wavenet|studio/i;
// Оцінка якості голосу: нейромережеві/серверні голоси звучать помітно краще за
// локальні синтетичні, тому localService === false дає найбільший бал.
// Явні ознаки НИЗЬКОЇ якості: старі формантні синтезатори, які звучать
// «по-роботизованому». Такий голос не має обиратись автоматично, навіть якщо
// він єдиний із правильною локаллю.
const VOICE_POOR_RE = /compact|eloquence|espeak|pico|festival|sapi\s?4|robot|classic|legacy/i;
// Найвища якість — нейромережеві голоси конкретних платформ.
const VOICE_TOP_RE  = /neural|natural|wavenet|studio|journey|siri|premium|enhanced/i;
// Улюблена локаль для кожної мови: fr-FR звучить звичніше за fr-CA, en-US за en-IN.
const PREFERRED_LOCALE = { fr: ['fr-fr', 'fr-ca'], en: ['en-us', 'en-gb'], uk: ['uk-ua'], ru: ['ru-ru'], zh: ['zh-cn', 'zh-tw'], ko: ['ko-kr'], hi: ['hi-in'], ga: ['ga-ie'] };

function voiceQualityScore(v) {
    let s = 0;
    const name = v.name || '';
    const lang = (v.lang || '').toLowerCase();

    if (VOICE_TOP_RE.test(name)) s += 8;          // нейромережевий
    else if (VOICE_QUALITY_RE.test(name)) s += 4; // просто «покращений»
    if (v.localService === false) s += 6;         // серверний — майже завжди найкращий
    if (/google/i.test(name)) s += 3;
    if (/microsoft/i.test(name)) s += 2;

    // Локаль: точний збіг з улюбленою — плюс, інший регіон тієї ж мови — менше.
    const base = lang.slice(0, 2);
    const pref = PREFERRED_LOCALE[base];
    if (pref) {
        const idx = pref.indexOf(lang);
        if (idx === 0) s += 4;
        else if (idx > 0) s += 2;
    }
    if (v.default) s += 1;                        // системний типовий — легкий плюс

    if (VOICE_POOR_RE.test(name)) s -= 10;        // старий синтезатор — у самий кінець
    return s;
}

// Стать голосу Web Speech API не повідомляє — визначаємо за відомими іменами
// французьких голосів Android / iOS / Windows / macOS, з запасним варіантом по
// службових позначках у назві.
const FR_MALE_RE   = /\b(henri|thomas|paul|claude|nicolas|mathieu|jean|yves|guillaume|rémy|remy|alain|male|homme)\b/i;
const FR_FEMALE_RE = /\b(denise|amélie|amelie|aurélie|aurelie|audrey|marie|virginie|julie|céline|celine|hortense|chantal|charlotte|female|femme)\b/i;
function voiceGender(v) {
    if (FR_MALE_RE.test(v.name)) return 'male';
    if (FR_FEMALE_RE.test(v.name)) return 'female';
    return null;
}
// Дві найкращі АЛЬТЕРНАТИВНІ доріжки для читання: за можливості чоловічий + жіночий,
// інакше просто два різні найкращі голоси, щоб чергування все одно було чутним.
function pickVoicePair(langPrefix) {
    const pool = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix))
                       .sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
    if (!pool.length) return null;
    const male = pool.find(v => voiceGender(v) === 'male');
    const female = pool.find(v => voiceGender(v) === 'female');
    if (male && female) return [male, female];
    // Стать визначити не вдалось — беремо два найкращі різні голоси.
    const distinct = pool.filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);
    return distinct.length >= 2 ? [distinct[0], distinct[1]] : [distinct[0], distinct[0]];
}

function pickBestVoice(langPrefix, pool) {
    const candidates = pool.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
    if (!candidates.length) return null;
    candidates.sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
    return candidates[0];
}
function loadVoices() {
    if (!ttsSynth) return;
    voices = ttsSynth.getVoices(); if (voices.length === 0) return;
    els.voiceSelect.innerHTML = '';
    // Показуємо мови книги (англійська/французька) + українську для озвучення перекладу.
    const groups = Object.fromEntries(SUPPORTED_LANGUAGE_CODES.map(code => [code, t('voices' + code[0].toUpperCase() + code.slice(1))]));
    for (const [code, title] of Object.entries(groups)) {
        const list = voices.filter(v => v.lang.toLowerCase().startsWith(code))
                           .sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
        if (!list.length) continue;
        const og = document.createElement('optgroup');
        og.label = title;
        list.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.voiceURI;
            // Зірочки показують рівень якості: ★★★ — нейромережевий/серверний,
            // ★★ — покращений, ★ — звичайний, ⚠ — застарілий синтезатор.
            const q = voiceQualityScore(v);
            const mark = q < 0 ? '⚠ ' : q >= 12 ? '★★★ ' : q >= 7 ? '★★ ' : q >= 3 ? '★ ' : '';
            opt.textContent = `${mark}${v.name} (${v.lang})`;
            og.appendChild(opt);
        });
        els.voiceSelect.appendChild(og);
    }

    // Автовибір найкращого голосу для кожної мови. Система часто підвантажує
    // якісні (серверні) голоси із запізненням, тому автовибір ПЕРЕГЛЯДАЄТЬСЯ, поки
    // користувач не зробив власний вибір: якщо з'явився кращий — беремо його.
    SUPPORTED_LANGUAGE_CODES.forEach(code => {
        if (state.voiceChosenByUser[code]) return;      // ручний вибір не чіпаємо
        const best = pickBestVoice(code, voices);
        if (!best) return;
        const cur = voices.find(v => v.voiceURI === state.selectedVoiceURIByLang[code]);
        if (!cur || voiceQualityScore(best) > voiceQualityScore(cur)) {
            state.selectedVoiceURIByLang[code] = best.voiceURI;
        }
    });
    // Відновлюємо показаний вибір: список перебудовується щоразу, коли система
    // повідомляє про зміну набору голосів, і без цього видимий вибір щоразу скидався.
    restoreVoiceSelectValue();
}
// У полі показуємо голос тієї мови, якою зараз книга — саме його й буде чути.
function restoreVoiceSelectValue() {
    const key = pageLang().slice(0, 2).toLowerCase();
    const uri = state.selectedVoiceURIByLang[key];
    if (uri) els.voiceSelect.value = uri;
}
function saveVoiceChoices() {
    try {
        writeStored('reader_voices', JSON.stringify(state.selectedVoiceURIByLang));
        writeStored('reader_voices_manual', JSON.stringify(state.voiceChosenByUser));
    } catch (e) {}
}
// Виклик loadVoices() (нижче за визначенням) навмисно НЕ тут: loadVoices -> ...
// -> restoreVoiceSelectValue -> pageLang(), а pageLang визначена в lang-detect.js,
// який завантажується ПІСЛЯ core.js (окремий класичний <script>, без спільного
// hoisting між файлами). Сам виклик перенесено в index.html одразу після
// підключення lang-detect.js — див. коментар там.
// ========== МОВА ІНТЕРФЕЙСУ ==========
// Написи задаються атрибутами data-i18n / data-i18n-title / data-i18n-ph у розмітці,
// а тут лежать усі переклади. Динамічні написи (кнопки-перемикачі, індикатор
// сторінок, повідомлення) беруться через t().
const I18N = {
    toc:            { uk: '☰ Зміст',        en: '☰ Contents',     fr: '☰ Sommaire',     ru: '☰ Содержание' },
    open:           { uk: '📂 Відкрити',    en: '📂 Open',        fr: '📂 Ouvrir',      ru: '📂 Открыть' },
    loading:        { uk: 'Завантаження...', en: 'Loading...',    fr: 'Chargement...',  ru: 'Загрузка...' },
    read:           { uk: '🔊 Читати',      en: '🔊 Read',        fr: '🔊 Lire',        ru: '🔊 Читать' },
    pause:          { uk: '⏸ Пауза',        en: '⏸ Pause',        fr: '⏸ Pause',        ru: '⏸ Пауза' },
    resume:         { uk: '▶ Продовжити',   en: '▶ Resume',       fr: '▶ Reprendre',    ru: '▶ Продолжить' },
    altVoicesOn:    { uk: '👥 Два голоси: УВІМК', en: '👥 Two voices: ON',  fr: '👥 Deux voix : ON',  ru: '👥 Два голоса: ВКЛ' },
    altVoicesOff:   { uk: '👥 Два голоси: ВИМК', en: '👥 Two voices: OFF', fr: '👥 Deux voix : OFF', ru: '👥 Два голоса: ВЫКЛ' },
    learnOn:        { uk: '🔮 Вивчення: УВІМК', en: '🔮 Study: ON',   fr: '🔮 Étude : ON',  ru: '🔮 Изучение: ВКЛ' },
    learnOff:       { uk: '🔮 Вивчення: ВИМК', en: '🔮 Study: OFF',  fr: '🔮 Étude : OFF', ru: '🔮 Изучение: ВЫКЛ' },
    themeLight:     { uk: 'Світла',         en: 'Light',          fr: 'Clair',          ru: 'Светлая' },
    themeSepia:     { uk: 'Сепія',          en: 'Sepia',          fr: 'Sépia',          ru: 'Сепия' },
    themeDark:      { uk: 'Темна',          en: 'Dark',           fr: 'Sombre',         ru: 'Тёмная' },
    aiKey:          { uk: '🔑 AI Ключ',     en: '🔑 AI Key',      fr: '🔑 Clé IA',      ru: '🔑 AI Ключ' },
    noBook:         { uk: 'Книгу не завантажено', en: 'No book loaded', fr: 'Aucun livre chargé', ru: 'Книга не загружена' },
    welcome:        { uk: 'Натисніть «Відкрити», щоб завантажити книгу (EPUB, PDF, DOCX, FB2, TXT, MD, HTML або RTF).',
                      en: 'Press “Open” to load a book (EPUB, PDF, DOCX, FB2, TXT, MD, HTML or RTF).',
                      fr: 'Appuyez sur « Ouvrir » pour charger un livre (EPUB, PDF, DOCX, FB2, TXT, MD, HTML ou RTF).',
                      ru: 'Нажмите «Открыть», чтобы загрузить книгу (EPUB, PDF, DOCX, FB2, TXT, MD, HTML или RTF).' },
    btnSentence:    { uk: 'речення ⤢',      en: 'sentence ⤢',     fr: 'phrase ⤢',       ru: 'предложение ⤢' },
    btnAsk:         { uk: '🤖 Запитай AI',  en: '🤖 Ask AI',      fr: '🤖 Demander à l’IA', ru: '🤖 Спросить AI' },
    btnGrammar:     { uk: '✨ Граматика',   en: '✨ Grammar',     fr: '✨ Grammaire',   ru: '✨ Грамматика' },
    translating:    { uk: 'Переклад...',    en: 'Translating...', fr: 'Traduction...',  ru: 'Перевод...' },
    panelAsk:       { uk: '🤖 Пояснення слова', en: '🤖 Word explanation', fr: '🤖 Explication du mot', ru: '🤖 Объяснение слова' },
    panelGrammar:   { uk: '📝 Граматика',   en: '📝 Grammar',     fr: '📝 Grammaire',   ru: '📝 Грамматика' },
    close:          { uk: '✕',               en: '✕',              fr: '✕',              ru: '✕' },
    tClose:         { uk: 'Закрити',         en: 'Close',          fr: 'Fermer',         ru: 'Закрыть' },
    cancel:         { uk: 'Скасувати',       en: 'Cancel',         fr: 'Annuler',        ru: 'Отмена' },
    askHint:        { uk: 'Тапніть слово й натисніть «Запитай AI» — значення, вживання та сталі сполучення.',
                      en: 'Tap a word and press “Ask AI” — meaning, usage and common collocations.',
                      fr: 'Touchez un mot et appuyez sur « Demander à l’IA » — sens, usage et expressions courantes.',
                      ru: 'Нажмите на слово и выберите «Спросить AI» — значение, употребление и устойчивые сочетания.' },
    grammarHint:    { uk: 'Виділіть слово і натисніть «Граматика» для аналізу.',
                      en: 'Select a word and press “Grammar” to analyse it.',
                      fr: 'Sélectionnez un mot et appuyez sur « Grammaire » pour l’analyser.',
                      ru: 'Выделите слово и нажмите «Грамматика» для анализа.' },
    prev:           { uk: '◀ Назад',        en: '◀ Back',         fr: '◀ Précédent',    ru: '◀ Назад' },
    next:           { uk: 'Вперед ▶',       en: 'Next ▶',         fr: 'Suivant ▶',      ru: 'Вперёд ▶' },
    waiting:        { uk: 'Очікування...',  en: 'Waiting...',     fr: 'En attente...',  ru: 'Ожидание...' },
    keyTitle:       { uk: '🔑 Ключ Google AI Studio (Gemini)', en: '🔑 Google AI Studio (Gemini) key', fr: '🔑 Clé Google AI Studio (Gemini)', ru: '🔑 Ключ Google AI Studio (Gemini)' },
    save:           { uk: 'Зберегти',       en: 'Save',           fr: 'Enregistrer',    ru: 'Сохранить' },
    ask:            { uk: 'Запитайте будь-що...', en: 'Ask anything...', fr: 'Demandez ce que vous voulez...', ru: 'Спросите что угодно...' },
    generating:     { uk: 'Генерація...',   en: 'Generating...',  fr: 'Génération...',  ru: 'Генерация...' },
    error:          { uk: 'Помилка',        en: 'Error',          fr: 'Erreur',         ru: 'Ошибка' },
    chapter:        { uk: 'Розділ',         en: 'Chapter',        fr: 'Chapitre',       ru: 'Глава' },
    block:          { uk: 'Блок',           en: 'Block',          fr: 'Bloc',           ru: 'Блок' },
    of:             { uk: 'із',             en: 'of',             fr: 'sur',            ru: 'из' },
    page:           { uk: 'стор.',          en: 'p.',             fr: 'p.',             ru: 'стр.' },
    // Підказки (title)
    tMenu:          { uk: 'Показати / сховати меню', en: 'Show / hide menu', fr: 'Afficher / masquer le menu', ru: 'Показать / скрыть меню' },
    tocIcon:        { uk: '☰', en: '☰', fr: '☰', ru: '☰' },
    tToc:           { uk: 'Зміст',          en: 'Contents',       fr: 'Sommaire',       ru: 'Содержание' },
    tAiKey:         { uk: 'Ключ AI (Gemini / Groq)', en: 'AI key (Gemini / Groq)', fr: 'Clé IA (Gemini / Groq)', ru: 'Ключ AI (Gemini / Groq)' },
    tExitApp:       { uk: 'Вийти із застосунку',    en: 'Exit app',        fr: 'Quitter l’application', ru: 'Выйти из приложения' },
    exitFallback:   { uk: 'Дані збережено. Застосунок можна закрити системною кнопкою або жестом.',
                      en: 'Data saved. You can close the app with the system button or gesture.',
                      fr: 'Données enregistrées. Vous pouvez fermer l’application avec le bouton ou le geste système.',
                      ru: 'Данные сохранены. Приложение можно закрыть системной кнопкой или жестом.' },
    updateAvailable:{ uk: 'Доступна нова версія застосунку.', en: 'A new version of the app is available.',
                      fr: 'Une nouvelle version de l’application est disponible.', ru: 'Доступна новая версия приложения.' },
    updateReload:   { uk: 'Оновити', en: 'Update', fr: 'Mettre à jour', ru: 'Обновить' },
    archiveGuardFailed: { uk: 'Не вдалося перевірити безпеку файла. Спробуйте ще раз або перезавантажте сторінку.',
                      en: 'Could not verify the file’s safety. Try again or reload the page.',
                      fr: 'Impossible de vérifier la sécurité du fichier. Réessayez ou rechargez la page.',
                      ru: 'Не удалось проверить безопасность файла. Попробуйте снова или перезагрузите страницу.' },
    tAltVoices:     { uk: 'Чергувати два голоси під час читання', en: 'Alternate two voices while reading', fr: 'Alterner deux voix pendant la lecture', ru: 'Чередовать два голоса при чтении' },
    tStudyMode:     { uk: 'Режим вивчення: слова стають клікабельними', en: 'Study mode: words become tappable', fr: 'Mode étude : les mots deviennent cliquables', ru: 'Режим изучения: слова становятся кликабельными' },
    tZoomOut:       { uk: 'Зменшити текст',  en: 'Smaller text',   fr: 'Texte plus petit', ru: 'Уменьшить текст' },
    tZoomIn:        { uk: 'Збільшити текст', en: 'Larger text',    fr: 'Texte plus grand', ru: 'Увеличить текст' },
    tTheme:         { uk: 'Тема оформлення', en: 'Theme',          fr: 'Thème',          ru: 'Тема оформления' },
    tVoice:         { uk: 'Голос',          en: 'Voice',          fr: 'Voix',           ru: 'Голос' },
    tTargetLang:    { uk: 'Мова перекладу', en: 'Translation language', fr: 'Langue de traduction', ru: 'Язык перевода' },
    tUiLang:        { uk: 'Мова інтерфейсу', en: 'Interface language', fr: 'Langue de l’interface', ru: 'Язык интерфейса' },
    tExpand:        { uk: 'Розширити: до кінця речення → усе речення → абзац', en: 'Expand: to end of sentence → whole sentence → paragraph', fr: 'Étendre : jusqu’à la fin de la phrase → phrase entière → paragraphe', ru: 'Расширить: до конца предложения → всё предложение → абзац' },
    tSvo:           { uk: 'Показати підмет, присудок і додаток', en: 'Show subject, verb and object', fr: 'Afficher sujet, verbe et complément', ru: 'Показать подлежащее, сказуемое и дополнение' },
    tSpeakTr:       { uk: 'Озвучити переклад', en: 'Speak the translation', fr: 'Lire la traduction', ru: 'Озвучить перевод' },
    tSpeakOrig:     { uk: 'Озвучити оригінал', en: 'Speak the original', fr: 'Lire l’original', ru: 'Озвучить оригинал' },
    tAskPanel:      { uk: 'AI Помічник',    en: 'AI assistant',   fr: 'Assistant IA',   ru: 'AI Помощник' },
    tGrammarPanel:  { uk: 'Граматика',      en: 'Grammar',        fr: 'Grammaire',      ru: 'Грамматика' },
    tPrevSent:      { uk: 'Попереднє речення', en: 'Previous sentence', fr: 'Phrase précédente', ru: 'Предыдущее предложение' },
    tPlayPause:     { uk: 'Пауза / продовжити', en: 'Pause / resume', fr: 'Pause / reprendre', ru: 'Пауза / продолжить' },
    tNextSent:      { uk: 'Наступне речення', en: 'Next sentence', fr: 'Phrase suivante', ru: 'Следующее предложение' },
    tFooter:        { uk: 'Розділ · сторінка · вперед/назад', en: 'Chapter · page · back/forward', fr: 'Chapitre · page · précédent/suivant', ru: 'Глава · страница · назад/вперёд' },
    tStop:          { uk: 'Зупинити читання', en: 'Stop reading', fr: 'Arrêter la lecture', ru: 'Остановить чтение' },
    // Повідомлення
    unsupportedFormat:{ uk: 'Формат не підтримується.', en: 'Format not supported.', fr: 'Format non pris en charge.', ru: 'Формат не поддерживается.' },
    fileTooLarge:   { uk: 'Файл завеликий (максимум 300 МБ). Спробуйте інший файл.',
                      en: 'File is too large (300 MB maximum). Try a different file.',
                      fr: 'Fichier trop volumineux (300 Mo maximum). Essayez un autre fichier.',
                      ru: 'Файл слишком большой (максимум 300 МБ). Попробуйте другой файл.' },
    emptyDoc:       { uk: 'У файлі не знайдено тексту.', en: 'No text found in the file.', fr: 'Aucun texte trouvé dans le fichier.', ru: 'В файле не найден текст.' },
    imageUnavailable: { uk: 'Зображення в документі не вдалося завантажити, а іншого тексту в ньому немає.', en: 'The image in this document could not be loaded, and it has no other text.', fr: 'L’image de ce document n’a pas pu être chargée, et il ne contient pas d’autre texte.', ru: 'Не удалось загрузить изображение в документе, а другого текста в нём нет.' },
    pickVerb:       { uk: 'Спершу оберіть дієслово у розборі.', en: 'First pick a verb in the analysis.', fr: 'Choisissez d’abord un verbe dans l’analyse.', ru: 'Сначала выберите глагол в разборе.' },
    btnInk:         { uk: '✏️ Писати',   en: '✏️ Write',       fr: '✏️ Écrire',     ru: '✏️ Писать' },
    done:           { uk: 'Готово',       en: 'Done',           fr: 'Terminé',        ru: 'Готово' },
    clearPageAsk:   { uk: 'Стерти все написане на цій сторінці?', en: 'Erase everything written on this page?', fr: 'Effacer tout ce qui est écrit sur cette page ?', ru: 'Стереть всё написанное на этой странице?' },
    btnRegion:      { uk: '✂️ Фрагмент',  en: '✂️ Region',      fr: '✂️ Zone',        ru: '✂️ Фрагмент' },
    regionHint:     { uk: 'Обведіть фрагмент PDF', en: 'Select a PDF region', fr: 'Sélectionnez une zone PDF', ru: 'Выделите фрагмент PDF' },
    regionPdfOnly:  { uk: 'Виділення області працює у форматі PDF.', en: 'Region capture works in PDF.', fr: 'La capture de zone fonctionne en PDF.', ru: 'Выделение области работает в формате PDF.' },
    regionFail:     { uk: 'Не вдалося вирізати цю ділянку.', en: 'Could not capture that area.', fr: 'Impossible de capturer cette zone.', ru: 'Не удалось вырезать этот участок.' },
    checking:       { uk: 'Перевіряю вправу…', en: 'Checking the exercise…', fr: 'Vérification de l’exercice…', ru: 'Проверяю упражнение…' },
    btnExplain:     { uk: '📖 Пояснення',  en: '📖 Explain',     fr: '📖 Explication', ru: '📖 Пояснение' },
    btnTranslatePanel:{ uk: '🌐 Перекласти', en: '🌐 Translate',  fr: '🌐 Traduire',   ru: '🌐 Перевести' },
    btnLangLevel:   { uk: '📘 Мовний розбір', en: '📘 Language analysis', fr: '📘 Analyse linguistique', ru: '📘 Языковой разбор' },
    selectFirst:    { uk: 'Спершу тапніть слово або виділіть речення в тексті.',
                      en: 'First tap a word or select a sentence in the text.',
                      fr: 'Touchez d’abord un mot ou sélectionnez une phrase dans le texte.',
                      ru: 'Сначала нажмите на слово или выделите предложение в тексте.' },
    keyFaster:      { uk: '(швидший)',      en: '(faster)',       fr: '(plus rapide)',  ru: '(быстрее)' },
    keyNote:        { uk: 'Якщо вказано ключ Groq, він використовується для всіх запитів AI — відповідь приходить помітно швидше. Інакше працює Gemini.',
                      en: 'When a Groq key is set it is used for all AI requests — responses arrive noticeably faster. Otherwise Gemini is used.',
                      fr: 'Si une clé Groq est renseignée, elle est utilisée pour toutes les requêtes IA — les réponses arrivent nettement plus vite. Sinon, Gemini est utilisé.',
                      ru: 'Если указан ключ Groq, он используется для всех запросов AI — ответ приходит заметно быстрее. Иначе работает Gemini.' },
    errKey400:      { uk: 'перевірте, чи правильно вставлено ключ.', en: 'check that the key is pasted correctly.', fr: 'vérifiez que la clé est correctement collée.', ru: 'проверьте, правильно ли вставлен ключ.' },
    errKey403:      { uk: 'ключ недійсний або немає доступу.', en: 'the key is invalid or access is denied.', fr: 'clé invalide ou accès refusé.', ru: 'ключ недействителен или нет доступа.' },
    errKey404:      { uk: 'модель не знайдена.', en: 'model not found.', fr: 'modèle introuvable.', ru: 'модель не найдена.' },
    errTooLarge:    { uk: 'Ділянка завелика або вичерпано ліміт запитів. Обведіть меншу область і спробуйте ще раз.',
                      en: 'The area is too large or the rate limit was hit. Select a smaller area and try again.',
                      fr: 'La zone est trop grande ou la limite de requêtes est atteinte. Sélectionnez une zone plus petite.',
                      ru: 'Область слишком большая или исчерпан лимит запросов. Обведите меньшую область и попробуйте снова.' },
    errKey429:      { uk: 'перевищено ліміт запитів, спробуйте пізніше.', en: 'rate limit exceeded, try again later.', fr: 'limite de requêtes dépassée, réessayez plus tard.', ru: 'превышен лимит запросов, попробуйте позже.' },
    errNoConnection:{ uk: 'Не вдалося з\'єднатися із сервером AI. Найчастіші причини: файл відкрито з диска (file://), немає інтернету, або запит блокує розширення браузера.',
                      en: 'Could not reach the AI server. Common causes: the file was opened from disk (file://), no internet, or a browser extension is blocking the request.',
                      fr: 'Impossible de joindre le serveur IA. Causes fréquentes : fichier ouvert depuis le disque (file://), pas d’internet, ou une extension bloque la requête.',
                      ru: 'Не удалось соединиться с сервером AI. Частые причины: файл открыт с диска (file://), нет интернета, или запрос блокирует расширение браузера.' },
    needKey:        { uk: 'Введіть ключ AI у налаштуваннях!', en: 'Enter the AI key in settings!', fr: 'Saisissez la clé IA dans les réglages !', ru: 'Введите ключ AI в настройках!' },
    needKeySvo:     { uk: 'Для розбору речення потрібен ключ AI.', en: 'Sentence analysis needs the AI key.', fr: 'L’analyse de la phrase nécessite la clé IA.', ru: 'Для разбора предложения нужен ключ AI.' },
    analysing:      { uk: 'Розбираю речення…', en: 'Analysing the sentence…', fr: 'Analyse de la phrase…', ru: 'Разбираю предложение…' },
    approx:         { uk: '(приблизно, без мережі)', en: '(approximate, offline)', fr: '(approximatif, hors ligne)', ru: '(приблизительно, офлайн)' },
    svoSubject:     { uk: 'підмет',         en: 'subject',        fr: 'sujet',          ru: 'подлежащее' },
    svoVerb:        { uk: 'присудок',       en: 'verb',           fr: 'verbe',          ru: 'сказуемое' },
    svoObject:      { uk: 'додаток (COD)',  en: 'object',         fr: 'COD',            ru: 'дополнение (COD)' },
    svoCoi:         { uk: 'непрямий додаток (COI)', en: 'indirect object', fr: 'COI',    ru: 'косвенное дополнение (COI)' },
    more:           { uk: 'ще',             en: 'more',           fr: 'aussi',          ru: 'ещё' },
    alreadyIn:      { uk: 'текст уже',      en: 'text is already in', fr: 'texte déjà en', ru: 'текст уже' },
    oneVoice:       { uk: 'На цьому пристрої лише один французький голос — чергування буде непомітним.',
                      en: 'This device has only one French voice — alternating will not be noticeable.',
                      fr: 'Cet appareil n’a qu’une seule voix française — l’alternance sera imperceptible.',
                      ru: 'На этом устройстве только один французский голос — чередование будет незаметным.' },
    micDenied:      { uk: 'Доступ до мікрофона заборонено.', en: 'Microphone access denied.', fr: 'Accès au microphone refusé.', ru: 'Доступ к микрофону запрещён.' },
    micNoSpeech:    { uk: 'Мовлення не розпізнано, спробуйте ще раз.', en: 'No speech detected, try again.', fr: 'Aucune parole détectée, réessayez.', ru: 'Речь не распознана, попробуйте ещё раз.' },
    micNotFound:    { uk: 'Мікрофон не знайдено.', en: 'Microphone not found.', fr: 'Microphone introuvable.', ru: 'Микрофон не найден.' },
    dictationStart: { uk: 'Почати диктовку', en: 'Start dictation', fr: 'Démarrer la dictée', ru: 'Начать диктовку' },
    dictationStop: { uk: 'Зупинити диктовку', en: 'Stop dictation', fr: 'Arrêter la dictée', ru: 'Остановить диктовку' },
    dictationListening: { uk: 'Слухаю… Можна робити паузи. ■ — зупинити.', en: 'Listening… Pauses are fine. ■ to stop.', fr: 'À l’écoute… Vous pouvez faire des pauses. ■ pour arrêter.', ru: 'Слушаю… Можно делать паузы. ■ — остановить.' },
    dictationStopped: { uk: 'Диктовку зупинено. Текст збережено в полі; натисніть 🎤, щоб продовжити.', en: 'Dictation stopped. Your text is still in the field; tap 🎤 to continue.', fr: 'Dictée arrêtée. Le texte reste dans le champ ; touchez 🎤 pour continuer.', ru: 'Диктовка остановлена. Текст остался в поле; нажмите 🎤 для продолжения.' },
    micNetwork:     { uk: 'Проблема з мережею під час розпізнавання.', en: 'Network problem during recognition.', fr: 'Problème réseau pendant la reconnaissance.', ru: 'Проблема с сетью при распознавании.' },
    noChapters:     { uk: 'Розділи не знайдено.', en: 'No chapters found.', fr: 'Aucun chapitre trouvé.', ru: 'Разделы не найдены.' },
    chapterMissing: { uk: 'Розділ не знайдено в архіві.', en: 'Chapter not found in the archive.', fr: 'Chapitre introuvable dans l’archive.', ru: 'Раздел не найден в архиве.' },
    voicesFr:       { uk: 'Французька',     en: 'French',         fr: 'Français',       ru: 'Французский' },
    voicesEn:       { uk: 'Англійська',     en: 'English',        fr: 'Anglais',        ru: 'Английский' },
    voicesUk:       { uk: 'Українська',     en: 'Ukrainian',      fr: 'Ukrainien',      ru: 'Украинский' },
    voicesRu:       { uk: 'Російська',      en: 'Russian',        fr: 'Russe',           ru: 'Русский' },
    voicesZh:       { uk: 'Китайська (спрощена)', en: 'Chinese (Simplified)', fr: 'Chinois (simplifié)', ru: 'Китайский (упрощённый)' },
    voicesKo:       { uk: 'Корейська',       en: 'Korean',         fr: 'Coréen',          ru: 'Корейский' },
    voicesHi:       { uk: 'Гінді',           en: 'Hindi',          fr: 'Hindi',           ru: 'Хинди' },
    voicesGa:       { uk: 'Ірландська',      en: 'Irish',          fr: 'Irlandais',       ru: 'Ирландский' },
    statsTitle:     { uk: 'Розуміння прочитаного', en: 'Reading comprehension', fr: 'Compréhension écrite', ru: 'Понимание прочитанного' },
    statsReading:   { uk: 'Прочитано без допомоги', en: 'Read without help', fr: 'Lu sans aide', ru: 'Прочитано без помощи' },
    statsReadWithoutHelp: { uk: 'Прочитано без допомоги', en: 'Read without help', fr: 'Lu sans aide', ru: 'Прочитано без помощи' },
    statsHelpRequested: { uk: 'Запитано допомогу', en: 'Help requested', fr: 'Aide demandée', ru: 'Запрошена помощь' },
    statsPageWords: { uk: 'Слів на сторінці', en: 'Words on page', fr: 'Mots sur la page', ru: 'Слов на странице' },
    statsIndependentWords: { uk: 'Без допомоги', en: 'Without help', fr: 'Sans aide', ru: 'Без помощи' },
    statsUniqueTapped: { uk: 'Унікальних слів із запитом', en: 'Unique words tapped', fr: 'Mots uniques touchés', ru: 'Уникальных слов с запросом' },
    statsTappedVocabulary: { uk: 'Лексика із запитом', en: 'Tapped vocabulary', fr: 'Vocabulaire touché', ru: 'Лексика с запросом' },
    statsUnknown: { uk: 'Не класифіковано', en: 'Unclassified', fr: 'Non classé', ru: 'Не классифицировано' },
    statsUnknownShort: { uk: 'Інше', en: 'Other', fr: 'Autre', ru: 'Другое' },
    statsNoHelp: { uk: 'Ще немає запитів допомоги', en: 'No help requests yet', fr: 'Aucune demande d’aide', ru: 'Запросов помощи пока нет' }
};

// Additional interface locales extend the existing dictionary. Keys not yet
// given a locale-specific diagnostic safely fall back to English, never to a
// misleading or broken placeholder.
const I18N_EXTRA = {
    zh: {
        toc:'☰ 目录',open:'📂 打开',loading:'加载中…',read:'🔊 朗读',pause:'⏸ 暂停',resume:'▶ 继续',altVoicesOn:'👥 双语音：开',altVoicesOff:'👥 双语音：关',learnOn:'🔮 学习：开',learnOff:'🔮 学习：关',themeLight:'浅色',themeSepia:'棕褐色',themeDark:'深色',aiKey:'🔑 AI 密钥',noBook:'尚未加载图书',welcome:'点击“打开”加载图书（EPUB、PDF、DOCX、FB2、TXT、MD、HTML 或 RTF）。',btnSentence:'句子 ⤢',btnAsk:'🤖 询问 AI',btnGrammar:'✨ 语法',translating:'翻译中…',panelAsk:'🤖 词语解释',panelGrammar:'📝 语法',tClose:'关闭',cancel:'取消',askHint:'点击词语并选择“询问 AI”，查看含义、用法和常见搭配。',grammarHint:'选择词语并点击“语法”进行分析。',prev:'◀ 上一页',next:'下一页 ▶',waiting:'等待中…',keyTitle:'🔑 Google AI Studio (Gemini) 密钥',save:'保存',ask:'输入问题…',generating:'生成中…',error:'错误',chapter:'章节',block:'段落',of:'共',page:'页',tMenu:'显示/隐藏菜单',tToc:'目录',tAiKey:'AI 密钥（Gemini / Groq）',tExitApp:'退出应用',exitFallback:'数据已保存。你可以使用系统按钮或手势关闭应用。',updateAvailable:'有新版本可用。',updateReload:'更新',archiveGuardFailed:'无法验证文件安全性。请重试或重新加载页面。',tAltVoices:'朗读时交替使用两个语音',tStudyMode:'学习模式：可点击词语',tZoomOut:'缩小文字',tZoomIn:'放大文字',tTheme:'主题',tVoice:'语音',tTargetLang:'翻译语言',tUiLang:'界面语言',tExpand:'扩展：句末 → 整句 → 段落',tSvo:'显示主语、谓语和宾语',tSpeakTr:'朗读翻译',tSpeakOrig:'朗读原文',tAskPanel:'AI 助手',tGrammarPanel:'语法',tPrevSent:'上一句',tPlayPause:'暂停/继续',tNextSent:'下一句',tFooter:'章节 · 页面 · 前后翻页',tStop:'停止朗读',unsupportedFormat:'不支持此格式。',fileTooLarge:'文件过大（最大 300 MB）。',emptyDoc:'文件中未找到文本。',pickVerb:'请先在分析中选择动词。',btnInk:'✏️ 书写',done:'完成',clearPageAsk:'清除此页上的全部书写内容？',btnRegion:'✂️ 区域',regionHint:'选择 PDF 区域',regionPdfOnly:'区域截取仅适用于 PDF。',regionFail:'无法截取该区域。',checking:'正在检查练习…',btnExplain:'📖 解释',btnTranslatePanel:'🌐 翻译',btnLangLevel:'📘 语言分析',selectFirst:'请先点击词语或选择文本中的句子。',keyFaster:'（更快）',needKey:'请在设置中输入 AI 密钥！',needKeySvo:'句子分析需要 AI 密钥。',analysing:'正在分析句子…',approx:'（离线近似）',svoSubject:'主语',svoVerb:'谓语',svoObject:'宾语',svoCoi:'间接宾语',more:'更多',alreadyIn:'文本已经是',oneVoice:'此设备只有一个法语语音，交替效果可能不明显。',micDenied:'麦克风访问被拒绝。',micNoSpeech:'未检测到语音，请重试。',micNotFound:'未找到麦克风。',dictationStart:'开始听写',dictationStop:'停止听写',dictationListening:'正在聆听… 可以暂停。■ 停止。',dictationStopped:'听写已停止。文字仍保留在输入框中。',micNetwork:'语音识别时出现网络问题。',noChapters:'未找到章节。',chapterMissing:'归档中未找到章节。',voicesFr:'法语',voicesEn:'英语',voicesUk:'乌克兰语',voicesRu:'俄语',voicesZh:'中文（简体）',voicesKo:'韩语',voicesHi:'印地语',voicesGa:'爱尔兰语',statsTitle:'阅读理解',statsReading:'无需帮助阅读',statsReadWithoutHelp:'无需帮助阅读',statsHelpRequested:'请求帮助',statsPageWords:'本页词数',statsIndependentWords:'无需帮助',statsUniqueTapped:'点击的唯一词语',statsTappedVocabulary:'点击词汇',statsUnknown:'未分类',statsUnknownShort:'其他',statsNoHelp:'尚未请求帮助'
    },
    ko: {
        toc:'☰ 목차',open:'📂 열기',loading:'불러오는 중…',read:'🔊 읽기',pause:'⏸ 일시정지',resume:'▶ 계속',altVoicesOn:'👥 두 음성: 켬',altVoicesOff:'👥 두 음성: 끔',learnOn:'🔮 학습: 켬',learnOff:'🔮 학습: 끔',themeLight:'밝게',themeSepia:'세피아',themeDark:'어둡게',aiKey:'🔑 AI 키',noBook:'책을 불러오지 않았습니다',welcome:'“열기”를 눌러 책(EPUB, PDF, DOCX, FB2, TXT, MD, HTML 또는 RTF)을 불러오세요.',btnSentence:'문장 ⤢',btnAsk:'🤖 AI에게 묻기',btnGrammar:'✨ 문법',translating:'번역 중…',panelAsk:'🤖 단어 설명',panelGrammar:'📝 문법',tClose:'닫기',cancel:'취소',askHint:'단어를 탭하고 “AI에게 묻기”를 눌러 뜻과 용법을 확인하세요.',grammarHint:'단어를 선택하고 “문법”을 눌러 분석하세요.',prev:'◀ 이전',next:'다음 ▶',waiting:'대기 중…',keyTitle:'🔑 Google AI Studio (Gemini) 키',save:'저장',ask:'무엇이든 물어보세요…',generating:'생성 중…',error:'오류',chapter:'장',block:'블록',of:'중',page:'쪽',tMenu:'메뉴 표시/숨기기',tToc:'목차',tAiKey:'AI 키 (Gemini / Groq)',tExitApp:'앱 종료',exitFallback:'데이터가 저장되었습니다. 시스템 버튼이나 제스처로 앱을 닫을 수 있습니다.',updateAvailable:'새 앱 버전을 사용할 수 있습니다.',updateReload:'업데이트',archiveGuardFailed:'파일 안전성을 확인할 수 없습니다. 다시 시도하거나 페이지를 새로고침하세요.',tAltVoices:'읽는 동안 두 음성 번갈아 사용',tStudyMode:'학습 모드: 단어를 탭할 수 있습니다',tZoomOut:'글자 작게',tZoomIn:'글자 크게',tTheme:'테마',tVoice:'음성',tTargetLang:'번역 언어',tUiLang:'인터페이스 언어',tExpand:'확장: 문장 끝 → 전체 문장 → 문단',tSvo:'주어, 동사, 목적어 표시',tSpeakTr:'번역 읽기',tSpeakOrig:'원문 읽기',tAskPanel:'AI 도우미',tGrammarPanel:'문법',tPrevSent:'이전 문장',tPlayPause:'일시정지/계속',tNextSent:'다음 문장',tFooter:'장 · 쪽 · 이전/다음',tStop:'읽기 중지',unsupportedFormat:'지원되지 않는 형식입니다.',fileTooLarge:'파일이 너무 큽니다(최대 300MB).',emptyDoc:'파일에서 텍스트를 찾지 못했습니다.',pickVerb:'먼저 분석에서 동사를 선택하세요.',btnInk:'✏️ 쓰기',done:'완료',clearPageAsk:'이 페이지의 필기를 모두 지울까요?',btnRegion:'✂️ 영역',regionHint:'PDF 영역을 선택하세요',regionPdfOnly:'영역 캡처는 PDF에서만 작동합니다.',regionFail:'해당 영역을 캡처할 수 없습니다.',checking:'연습 문제 확인 중…',btnExplain:'📖 설명',btnTranslatePanel:'🌐 번역',btnLangLevel:'📘 언어 분석',selectFirst:'먼저 단어를 탭하거나 문장을 선택하세요.',keyFaster:'(더 빠름)',needKey:'설정에서 AI 키를 입력하세요!',needKeySvo:'문장 분석에는 AI 키가 필요합니다.',analysing:'문장 분석 중…',approx:'(오프라인 근사)',svoSubject:'주어',svoVerb:'동사',svoObject:'목적어',svoCoi:'간접 목적어',more:'더 보기',alreadyIn:'텍스트 언어:',oneVoice:'이 기기에는 프랑스어 음성이 하나뿐이라 교대 효과가 없을 수 있습니다.',micDenied:'마이크 접근이 거부되었습니다.',micNoSpeech:'음성이 감지되지 않았습니다. 다시 시도하세요.',micNotFound:'마이크를 찾을 수 없습니다.',dictationStart:'받아쓰기 시작',dictationStop:'받아쓰기 중지',dictationListening:'듣는 중… 잠시 멈춰도 됩니다. ■ 중지.',dictationStopped:'받아쓰기가 중지되었습니다. 텍스트는 입력란에 남아 있습니다.',micNetwork:'음성 인식 중 네트워크 문제가 발생했습니다.',noChapters:'장을 찾지 못했습니다.',chapterMissing:'보관 파일에서 장을 찾지 못했습니다.',voicesFr:'프랑스어',voicesEn:'영어',voicesUk:'우크라이나어',voicesRu:'러시아어',voicesZh:'중국어(간체)',voicesKo:'한국어',voicesHi:'힌디어',voicesGa:'아일랜드어',statsTitle:'독해',statsReading:'도움 없이 읽음',statsReadWithoutHelp:'도움 없이 읽음',statsHelpRequested:'도움 요청',statsPageWords:'페이지 단어 수',statsIndependentWords:'도움 없이',statsUniqueTapped:'탭한 고유 단어',statsTappedVocabulary:'탭한 어휘',statsUnknown:'미분류',statsUnknownShort:'기타',statsNoHelp:'아직 도움 요청이 없습니다'
    },
    hi: {
        toc:'☰ विषय-सूची',open:'📂 खोलें',loading:'लोड हो रहा है…',read:'🔊 पढ़ें',pause:'⏸ रोकें',resume:'▶ जारी रखें',altVoicesOn:'👥 दो आवाज़ें: चालू',altVoicesOff:'👥 दो आवाज़ें: बंद',learnOn:'🔮 अध्ययन: चालू',learnOff:'🔮 अध्ययन: बंद',themeLight:'हल्का',themeSepia:'सेपिया',themeDark:'गहरा',aiKey:'🔑 AI कुंजी',noBook:'कोई पुस्तक लोड नहीं है',welcome:'पुस्तक (EPUB, PDF, DOCX, FB2, TXT, MD, HTML या RTF) लोड करने के लिए “खोलें” दबाएँ।',btnSentence:'वाक्य ⤢',btnAsk:'🤖 AI से पूछें',btnGrammar:'✨ व्याकरण',translating:'अनुवाद हो रहा है…',panelAsk:'🤖 शब्द की व्याख्या',panelGrammar:'📝 व्याकरण',tClose:'बंद करें',cancel:'रद्द करें',askHint:'शब्द पर टैप करके अर्थ और प्रयोग के लिए “AI से पूछें” दबाएँ।',grammarHint:'शब्द चुनें और विश्लेषण के लिए “व्याकरण” दबाएँ।',prev:'◀ पीछे',next:'आगे ▶',waiting:'प्रतीक्षा…',keyTitle:'🔑 Google AI Studio (Gemini) कुंजी',save:'सहेजें',ask:'कुछ भी पूछें…',generating:'बनाया जा रहा है…',error:'त्रुटि',chapter:'अध्याय',block:'खंड',of:'में से',page:'पृष्ठ',tMenu:'मेनू दिखाएँ/छिपाएँ',tToc:'विषय-सूची',tAiKey:'AI कुंजी (Gemini / Groq)',tExitApp:'ऐप से बाहर निकलें',exitFallback:'डेटा सहेज लिया गया है। सिस्टम बटन या जेस्चर से ऐप बंद करें।',updateAvailable:'ऐप का नया संस्करण उपलब्ध है।',updateReload:'अपडेट करें',archiveGuardFailed:'फ़ाइल की सुरक्षा जाँची नहीं जा सकी। फिर प्रयास करें।',tAltVoices:'पढ़ते समय दो आवाज़ें बदलें',tStudyMode:'अध्ययन मोड: शब्द टैप किए जा सकते हैं',tZoomOut:'छोटा पाठ',tZoomIn:'बड़ा पाठ',tTheme:'थीम',tVoice:'आवाज़',tTargetLang:'अनुवाद भाषा',tUiLang:'इंटरफ़ेस भाषा',tExpand:'बढ़ाएँ: वाक्य का अंत → पूरा वाक्य → अनुच्छेद',tSvo:'कर्ता, क्रिया और कर्म दिखाएँ',tSpeakTr:'अनुवाद सुनाएँ',tSpeakOrig:'मूल पाठ सुनाएँ',tAskPanel:'AI सहायक',tGrammarPanel:'व्याकरण',tPrevSent:'पिछला वाक्य',tPlayPause:'रोकें/जारी रखें',tNextSent:'अगला वाक्य',tFooter:'अध्याय · पृष्ठ · पीछे/आगे',tStop:'पढ़ना बंद करें',unsupportedFormat:'फ़ॉर्मेट समर्थित नहीं है।',fileTooLarge:'फ़ाइल बहुत बड़ी है (अधिकतम 300 MB)।',emptyDoc:'फ़ाइल में कोई पाठ नहीं मिला।',pickVerb:'पहले विश्लेषण में कोई क्रिया चुनें।',btnInk:'✏️ लिखें',done:'पूर्ण',clearPageAsk:'इस पृष्ठ की सारी लिखावट मिटाएँ?',btnRegion:'✂️ क्षेत्र',regionHint:'PDF का क्षेत्र चुनें',regionPdfOnly:'क्षेत्र कैप्चर केवल PDF में काम करता है।',regionFail:'वह क्षेत्र कैप्चर नहीं हो सका।',checking:'अभ्यास जाँचा जा रहा है…',btnExplain:'📖 व्याख्या',btnTranslatePanel:'🌐 अनुवाद',btnLangLevel:'📘 भाषा विश्लेषण',selectFirst:'पहले किसी शब्द पर टैप करें या वाक्य चुनें।',keyFaster:'(तेज़)',needKey:'सेटिंग में AI कुंजी दर्ज करें!',needKeySvo:'वाक्य विश्लेषण के लिए AI कुंजी चाहिए।',analysing:'वाक्य का विश्लेषण…',approx:'(ऑफ़लाइन अनुमान)',svoSubject:'कर्ता',svoVerb:'क्रिया',svoObject:'कर्म',svoCoi:'अप्रत्यक्ष कर्म',more:'और',alreadyIn:'पाठ पहले से',oneVoice:'इस डिवाइस पर केवल एक फ़्रेंच आवाज़ है—बदलाव सुनाई नहीं देगा।',micDenied:'माइक्रोफ़ोन की अनुमति नहीं मिली।',micNoSpeech:'कोई आवाज़ नहीं मिली, फिर प्रयास करें।',micNotFound:'माइक्रोफ़ोन नहीं मिला।',dictationStart:'डिक्टेशन शुरू करें',dictationStop:'डिक्टेशन रोकें',dictationListening:'सुन रहा है… विराम ले सकते हैं। ■ रोकें।',dictationStopped:'डिक्टेशन रुक गया। पाठ इनपुट में सुरक्षित है।',micNetwork:'वाणी पहचान के दौरान नेटवर्क समस्या।',noChapters:'कोई अध्याय नहीं मिला।',chapterMissing:'आर्काइव में अध्याय नहीं मिला।',voicesFr:'फ़्रेंच',voicesEn:'अंग्रेज़ी',voicesUk:'यूक्रेनी',voicesRu:'रूसी',voicesZh:'चीनी (सरलीकृत)',voicesKo:'कोरियाई',voicesHi:'हिन्दी',voicesGa:'आयरिश',statsTitle:'पठन-बोध',statsReading:'बिना सहायता पढ़ा',statsReadWithoutHelp:'बिना सहायता पढ़ा',statsHelpRequested:'सहायता माँगी',statsPageWords:'पृष्ठ पर शब्द',statsIndependentWords:'बिना सहायता',statsUniqueTapped:'टैप किए गए अनोखे शब्द',statsTappedVocabulary:'टैप की गई शब्दावली',statsUnknown:'अवर्गीकृत',statsUnknownShort:'अन्य',statsNoHelp:'अभी कोई सहायता अनुरोध नहीं'
    },
    ga: {
        toc:'☰ Clár',open:'📂 Oscail',loading:'Á luchtú…',read:'🔊 Léigh',pause:'⏸ Cuir ar sos',resume:'▶ Lean ar aghaidh',altVoicesOn:'👥 Dhá ghuth: ANN',altVoicesOff:'👥 Dhá ghuth: AS',learnOn:'🔮 Staidéar: ANN',learnOff:'🔮 Staidéar: AS',themeLight:'Geal',themeSepia:'Seipia',themeDark:'Dorcha',aiKey:'🔑 Eochair AI',noBook:'Níl leabhar luchtaithe',welcome:'Brúigh “Oscail” chun leabhar (EPUB, PDF, DOCX, FB2, TXT, MD, HTML nó RTF) a luchtú.',btnSentence:'abairt ⤢',btnAsk:'🤖 Fiafraigh de AI',btnGrammar:'✨ Gramadach',translating:'Á aistriú…',panelAsk:'🤖 Míniú focal',panelGrammar:'📝 Gramadach',tClose:'Dún',cancel:'Cealaigh',askHint:'Tapáil focal agus brúigh “Fiafraigh de AI” chun brí agus úsáid a fheiceáil.',grammarHint:'Roghnaigh focal agus brúigh “Gramadach” chun anailís a dhéanamh air.',prev:'◀ Siar',next:'Ar aghaidh ▶',waiting:'Ag fanacht…',keyTitle:'🔑 Eochair Google AI Studio (Gemini)',save:'Sábháil',ask:'Cuir ceist…',generating:'Á ghiniúint…',error:'Earráid',chapter:'Caibidil',block:'Bloc',of:'as',page:'lch.',tMenu:'Taispeáin/folaigh an roghchlár',tToc:'Clár',tAiKey:'Eochair AI (Gemini / Groq)',tExitApp:'Scoir den aip',exitFallback:'Sábháladh na sonraí. Is féidir an aip a dhúnadh leis an gcnaipe córais nó gotha.',updateAvailable:'Tá leagan nua den aip ar fáil.',updateReload:'Nuashonraigh',archiveGuardFailed:'Níorbh fhéidir sábháilteacht an chomhaid a dheimhniú. Bain triail eile as.',tAltVoices:'Malartaigh dhá ghuth agus tú ag léamh',tStudyMode:'Mód staidéir: is féidir focail a thapáil',tZoomOut:'Téacs níos lú',tZoomIn:'Téacs níos mó',tTheme:'Téama',tVoice:'Guth',tTargetLang:'Teanga aistriúcháin',tUiLang:'Teanga an chomhéadain',tExpand:'Leathnaigh: deireadh abairte → abairt iomlán → alt',tSvo:'Taispeáin ainmní, briathar agus cuspóir',tSpeakTr:'Léigh an t-aistriúchán',tSpeakOrig:'Léigh an buntéacs',tAskPanel:'Cúntóir AI',tGrammarPanel:'Gramadach',tPrevSent:'An abairt roimhe',tPlayPause:'Sos / lean ar aghaidh',tNextSent:'An chéad abairt eile',tFooter:'Caibidil · leathanach · siar/ar aghaidh',tStop:'Stop ag léamh',unsupportedFormat:'Ní thacaítear leis an bhformáid.',fileTooLarge:'Tá an comhad rómhór (uasmhéid 300 MB).',emptyDoc:'Níor aimsíodh téacs sa chomhad.',pickVerb:'Roghnaigh briathar san anailís ar dtús.',btnInk:'✏️ Scríobh',done:'Déanta',clearPageAsk:'Scrios gach rud scríofa ar an leathanach seo?',btnRegion:'✂️ Réigiún',regionHint:'Roghnaigh réigiún PDF',regionPdfOnly:'Ní oibríonn gabháil réigiúin ach le PDF.',regionFail:'Níorbh fhéidir an réigiún sin a ghabháil.',checking:'An cleachtadh á sheiceáil…',btnExplain:'📖 Mínigh',btnTranslatePanel:'🌐 Aistrigh',btnLangLevel:'📘 Anailís teanga',selectFirst:'Tapáil focal nó roghnaigh abairt sa téacs ar dtús.',keyFaster:'(níos tapúla)',needKey:'Cuir an eochair AI isteach sna socruithe!',needKeySvo:'Tá eochair AI de dhíth le haghaidh anailís abairte.',analysing:'An abairt á hanailísiú…',approx:'(meastachán as líne)',svoSubject:'ainmní',svoVerb:'briathar',svoObject:'cuspóir',svoCoi:'cuspóir indíreach',more:'tuilleadh',alreadyIn:'tá an téacs cheana i',oneVoice:'Níl ach guth Fraincise amháin ar an ngléas seo—ní bheidh an malartú soiléir.',micDenied:'Diúltaíodh rochtain ar an micreafón.',micNoSpeech:'Níor braitheadh caint; bain triail eile as.',micNotFound:'Níor aimsíodh micreafón.',dictationStart:'Tosaigh deachtú',dictationStop:'Stop deachtú',dictationListening:'Ag éisteacht… Is féidir sosanna a ghlacadh. ■ chun stopadh.',dictationStopped:'Stopadh an deachtú. Tá an téacs fós sa réimse.',micNetwork:'Fadhb líonra le linn aithint cainte.',noChapters:'Níor aimsíodh caibidlí.',chapterMissing:'Níor aimsíodh an chaibidil sa chartlann.',voicesFr:'Fraincis',voicesEn:'Béarla',voicesUk:'Úcráinis',voicesRu:'Rúisis',voicesZh:'Sínis Shimplithe',voicesKo:'Cóiréis',voicesHi:'Hiondúis',voicesGa:'Gaeilge',statsTitle:'Tuiscint léitheoireachta',statsReading:'Léite gan chabhair',statsReadWithoutHelp:'Léite gan chabhair',statsHelpRequested:'Cabhair iarrtha',statsPageWords:'Focail ar an leathanach',statsIndependentWords:'Gan chabhair',statsUniqueTapped:'Focail uathúla tapáilte',statsTappedVocabulary:'Stór focal tapáilte',statsUnknown:'Gan rangú',statsUnknownShort:'Eile',statsNoHelp:'Níl aon iarratas cabhrach fós'
    }
};
for (const [locale, values] of Object.entries(I18N_EXTRA)) {
    for (const [key, value] of Object.entries(values)) if (I18N[key]) I18N[key][locale] = value;
}
for (const entry of Object.values(I18N)) {
    for (const locale of SUPPORTED_LANGUAGE_CODES) if (!entry[locale]) entry[locale] = entry.en || entry.uk;
}

// BYOK settings and safe provider errors, in every supported UI language.
Object.assign(I18N, {
    "openaiKeyTitle": {
        "en": "🔑 OpenAI API",
        "uk": "🔑 OpenAI API",
        "fr": "🔑 API OpenAI",
        "ru": "🔑 OpenAI API",
        "zh": "🔑 OpenAI API",
        "ko": "🔑 OpenAI API",
        "hi": "🔑 OpenAI API",
        "ga": "🔑 API OpenAI"
    },
    "groqKeyTitle": {
        "en": "⚡ Groq API key",
        "uk": "⚡ Ключ Groq",
        "fr": "⚡ Clé API Groq",
        "ru": "⚡ Ключ Groq",
        "zh": "⚡ Groq API 密钥",
        "ko": "⚡ Groq API 키",
        "hi": "⚡ Groq API कुंजी",
        "ga": "⚡ Eochair API Groq"
    },
    "aiProviderLabel": {
        "en": "AI provider",
        "uk": "Активний AI",
        "fr": "Fournisseur IA actif",
        "ru": "Активный AI",
        "zh": "当前 AI 提供商",
        "ko": "활성 AI 제공업체",
        "hi": "सक्रिय AI प्रदाता",
        "ga": "Soláthraí AI gníomhach"
    },
    "aiAddKey": {
        "en": "Add a {provider} API key first.",
        "uk": "Спочатку додайте API-ключ {provider}.",
        "fr": "Ajoutez d’abord une clé API {provider}.",
        "ru": "Сначала добавьте API-ключ {provider}.",
        "zh": "请先添加 {provider} API 密钥。",
        "ko": "먼저 {provider} API 키를 추가하세요.",
        "hi": "पहले {provider} API कुंजी जोड़ें।",
        "ga": "Cuir eochair API {provider} leis ar dtús."
    },
    "aiAuthError": {
        "en": "{provider}: the API key is invalid or access is denied.",
        "uk": "{provider}: API-ключ недійсний або доступ заборонено.",
        "fr": "{provider} : clé API invalide ou accès refusé.",
        "ru": "{provider}: API-ключ недействителен или доступ запрещён.",
        "zh": "{provider}：API 密钥无效或访问被拒绝。",
        "ko": "{provider}: API 키가 유효하지 않거나 접근이 거부되었습니다.",
        "hi": "{provider}: API कुंजी अमान्य है या पहुँच अस्वीकृत है।",
        "ga": "{provider}: tá an eochair API neamhbhailí nó diúltaíodh rochtain."
    },
    "aiRateError": {
        "en": "{provider}: rate or usage limit reached. Check your quota or try again later.",
        "uk": "{provider}: досягнуто ліміту запитів або використання. Перевірте квоту або спробуйте пізніше.",
        "fr": "{provider} : limite de requêtes ou quota atteint. Vérifiez votre quota ou réessayez plus tard.",
        "ru": "{provider}: достигнут лимит запросов или использования. Проверьте квоту или попробуйте позже.",
        "zh": "{provider}：已达到请求或使用限额。请检查配额或稍后重试。",
        "ko": "{provider}: 요청 또는 사용 한도에 도달했습니다. 할당량을 확인하거나 나중에 다시 시도하세요.",
        "hi": "{provider}: अनुरोध या उपयोग सीमा पूरी हो गई। कोटा जाँचें या बाद में प्रयास करें।",
        "ga": "{provider}: baineadh teorainn iarratas nó úsáide amach. Seiceáil do chuóta nó bain triail eile as níos déanaí."
    },
    "aiRequestError": {
        "en": "{provider}: the request failed. Please try again.",
        "uk": "{provider}: запит не виконано. Спробуйте ще раз.",
        "fr": "{provider} : la requête a échoué. Réessayez.",
        "ru": "{provider}: запрос не выполнен. Попробуйте ещё раз.",
        "zh": "{provider}：请求失败，请重试。",
        "ko": "{provider}: 요청에 실패했습니다. 다시 시도하세요.",
        "hi": "{provider}: अनुरोध विफल हुआ। फिर प्रयास करें।",
        "ga": "{provider}: theip ar an iarratas. Bain triail eile as."
    },
    "aiNetworkError": {
        "en": "Could not reach the AI provider. Check your connection and try again.",
        "uk": "Не вдалося зв’язатися з AI-провайдером. Перевірте з’єднання та спробуйте ще раз.",
        "fr": "Impossible de joindre le fournisseur IA. Vérifiez la connexion et réessayez.",
        "ru": "Не удалось связаться с AI-провайдером. Проверьте соединение и попробуйте снова.",
        "zh": "无法连接 AI 提供商。请检查网络后重试。",
        "ko": "AI 제공업체에 연결할 수 없습니다. 연결을 확인하고 다시 시도하세요.",
        "hi": "AI प्रदाता से संपर्क नहीं हो सका। कनेक्शन जाँचें और फिर प्रयास करें।",
        "ga": "Níorbh fhéidir an soláthraí AI a bhaint amach. Seiceáil an nasc agus bain triail eile as."
    },
    "aiInvalidResponse": {
        "en": "The AI response was invalid or incomplete. Please try again.",
        "uk": "Відповідь AI некоректна або неповна. Спробуйте ще раз.",
        "fr": "La réponse IA est invalide ou incomplète. Réessayez.",
        "ru": "Ответ AI некорректен или неполон. Попробуйте ещё раз.",
        "zh": "AI 回复无效或不完整，请重试。",
        "ko": "AI 응답이 유효하지 않거나 불완전합니다. 다시 시도하세요.",
        "hi": "AI उत्तर अमान्य या अधूरा था। फिर प्रयास करें।",
        "ga": "Bhí an freagra AI neamhbhailí nó neamhiomlán. Bain triail eile as."
    },
    "aiEmptyResponse": {
        "en": "The AI returned no text. Please try again.",
        "uk": "AI не повернув тексту. Спробуйте ще раз.",
        "fr": "L’IA n’a renvoyé aucun texte. Réessayez.",
        "ru": "AI не вернул текст. Попробуйте ещё раз.",
        "zh": "AI 未返回文本，请重试。",
        "ko": "AI가 텍스트를 반환하지 않았습니다. 다시 시도하세요.",
        "hi": "AI ने कोई पाठ नहीं लौटाया। फिर प्रयास करें।",
        "ga": "Níor sheol an AI aon téacs ar ais. Bain triail eile as."
    },
    "keyNote": {
        "en": "Save your keys and choose the provider for all AI requests. Providers never switch automatically.",
        "uk": "Збережіть ключі та виберіть провайдера для всіх запитів AI. Автоматичного перемикання немає.",
        "fr": "Enregistrez vos clés et choisissez le fournisseur pour toutes les requêtes IA. Aucun changement automatique.",
        "ru": "Сохраните ключи и выберите провайдера для всех запросов AI. Автоматического переключения нет.",
        "zh": "保存密钥并为所有 AI 请求选择提供商。系统不会自动切换。",
        "ko": "키를 저장하고 모든 AI 요청에 사용할 제공업체를 선택하세요. 자동 전환되지 않습니다.",
        "hi": "कुंजियाँ सहेजें और सभी AI अनुरोधों के लिए प्रदाता चुनें। प्रदाता अपने आप नहीं बदलता।",
        "ga": "Sábháil do chuid eochracha agus roghnaigh soláthraí do gach iarratas AI. Ní athraítear soláthraí go huathoibríoch."
    },
    "tAiKey": {
        "en": "AI API keys (OpenAI / Groq / Gemini)",
        "uk": "API-ключі AI (OpenAI / Groq / Gemini)",
        "fr": "Clés API IA (OpenAI / Groq / Gemini)",
        "ru": "API-ключи AI (OpenAI / Groq / Gemini)",
        "zh": "AI API 密钥（OpenAI / Groq / Gemini）",
        "ko": "AI API 키 (OpenAI / Groq / Gemini)",
        "hi": "AI API कुंजियाँ (OpenAI / Groq / Gemini)",
        "ga": "Eochracha API AI (OpenAI / Groq / Gemini)"
    }
});

function t(key) {
    const e = I18N[key];
    return e ? (e[state.uiLang] || e.en || e.uk) : key;
}
function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    // Написи, що залежать від стану
    updateAltVoicesBtn();
    updateTtsButtons();
    els.translateBtn.textContent = state.translateMode ? t('learnOn') : t('learnOff');
    updateProgressText();
    updateDictationUI();
    els.askTab.setAttribute('aria-label', t('tAskPanel'));
    els.grammarTab.setAttribute('aria-label', t('tGrammarPanel'));
    if (typeof loadVoices === 'function') loadVoices();   // назви груп голосів
    if (typeof refreshReadingStats === 'function') refreshReadingStats();
}


// Обрана мова застосовується скрізь: і до перекладу слів/речень, і до відповідей AI.
const LANG_NAMES = Object.fromEntries(Object.entries(LANGUAGE_CONFIG).map(([code, config]) => [code, config.aiName]));

// escapeHtml перенесено сюди з мовно-нейтральної секції нижче в основному
// файлі (raw HTML-екранування для довіреного тексту в innerHTML) — суто
// утилітарна функція без залежностей, природне місце — поруч із safeHtml.
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
