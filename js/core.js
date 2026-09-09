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
    const drop = new Set('script style link meta base iframe frame frameset object embed applet svg math template noscript textarea select input audio video source form'.split(' '));
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
            if (styles.has(prop) && /^[#%.,\s\w-]+$/.test(v)) el.style.setProperty(prop, v);
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
        try { return Object.assign({ en: null, fr: null, uk: null, ru: null }, JSON.parse(readStored('reader_voices') || '{}')); }
        catch (e) { return { en: null, fr: null, uk: null, ru: null }; }
    })(),
    voiceChosenByUser: (() => {
        try { const value = JSON.parse(readStored('reader_voices_manual') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch (e) { return {}; }
    })(),
    apiKey: readStored('reader_gemini_key') || '', groqKey: readStored('reader_groq_key') || '', translationCache: {}, lastAskContext: "",
    pageInChapter: 0, totalPagesInChapter: 1, bookKey: null, suppressNextClick: false,
    ttsQueue: [], ttsIndex: 0, ttsPaused: false, ttsGen: 0, pdfZoom: 1, lastTapPoint: null, expandLevel: 0, lastWordNode: null,
    targetLang: readStored('reader_target_lang') || 'uk',
    uiLang: readStored('reader_ui_lang') || 'uk',
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
const PREFERRED_LOCALE = { fr: ['fr-fr', 'fr-ca'], en: ['en-us', 'en-gb'], uk: ['uk-ua'], ru: ['ru-ru'] };

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
    const groups = { fr: t('voicesFr'), en: t('voicesEn'), uk: t('voicesUk'), ru: t('voicesRu') };
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
    ['fr', 'en', 'uk', 'ru'].forEach(code => {
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
    const key = pageLang().startsWith('fr') ? 'fr' : 'en';
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
    welcome:        { uk: 'Натисніть «Відкрити», щоб завантажити книгу (EPUB, PDF або TXT).',
                      en: 'Press “Open” to load a book (EPUB, PDF or TXT).',
                      fr: 'Appuyez sur « Ouvrir » pour charger un livre (EPUB, PDF ou TXT).',
                      ru: 'Нажмите «Открыть», чтобы загрузить книгу (EPUB, PDF или TXT).' },
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
    voicesRu:       { uk: 'Російська',      en: 'Russian',        fr: 'Russe',          ru: 'Русский' }
};
function t(key) {
    const e = I18N[key];
    return e ? (e[state.uiLang] || e.uk) : key;
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
}


// Обрана мова застосовується скрізь: і до перекладу слів/речень, і до відповідей AI.
const LANG_NAMES = { uk: 'українською', en: 'англійською', fr: 'французькою', ru: 'російською' };

// escapeHtml перенесено сюди з мовно-нейтральної секції нижче в основному
// файлі (raw HTML-екранування для довіреного тексту в innerHTML) — суто
// утилітарна функція без залежностей, природне місце — поруч із safeHtml.
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
