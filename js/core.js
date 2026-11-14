/* core.js — спільний фундамент застосунку: безпечне збереження в localStorage, санітизація HTML (safeHtml),
 * керування async-задачами (beginAsyncTask/cancelAsyncTasks), мережеві хелпери (fetchWithTimeout тощо),
 * мутовні контейнери епох/PDF-задач (readerEpoch/pdfTasks).
 * 2026-11-14: решту колишнього core.js рознесено без змін у файли, що вантажаться одразу після нього, у тому ж
 * порядку: core-text-layout.js (вигляд тексту), core-languages.js (мови, граматика, JSON відповідей AI),
 * core-state.js (state/els), core-voices.js (голоси), core-i18n.js (тексти інтерфейсу, t/applyI18n),
 * core-text.js (escapeHtml, межі речень).
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
// Коротка вібрація під пальцем там, де телефон її вміє (Android Chrome); інакше — нічого.
function haptic(ms = 10) {
    try { if (navigator.vibrate && !document.hidden) navigator.vibrate(ms); } catch (e) {}
}
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
    // verb-card/verb-head/verb-forme/verb-chips/verb-chip retired with the old raw-HTML
    // Grammar-panel contract: the redesigned panel builds its DOM from structured JSON
    // fields via createElement/textContent, never from innerHTML of AI text (see
    // js/grammar-svo.js), so those classes are no longer needed here.
    const classes = new Set('lvl lvl-block tt-note'.split(' '));
    const styles = new Set('color background-color font-size font-weight font-style font-family text-align text-decoration text-indent text-transform font-variant-caps line-height white-space border border-color border-width border-style border-collapse padding padding-left padding-right padding-top padding-bottom margin margin-left margin-right margin-top margin-bottom'.split(' '));
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
            // Зображення з чужого сайту (https://…) — теж трекінг-піксель, тож його немає (CSP img-src і так його не завантажив би).
            if ((src && !/[:\\\u0000-\u0020]/.test(src) && !src.startsWith('//')) || /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(src)) {
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
// A book is about to open / has opened (js/main.js openBookFile). Features that react register here instead of being
// called by name from openBookFile (2026-11-14): onBookOpening(fn): fn(file) before anything is torn down;
// onBookOpened(fn): fn(file) once the book is shown and still the current one.
const BOOK_OPENING = [], BOOK_OPENED = [];
function onBookOpening(listener) { BOOK_OPENING.push(listener); }
function onBookOpened(listener) { BOOK_OPENED.push(listener); }
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
        if (timedOut) { const e = new Error('Сервер не відповів вчасно. Спробуйте ще раз.'); e.reason = 'timeout'; throw e; }
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
