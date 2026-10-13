/* reading-ribbon.js — закладка-стрічка «місце читання»: кольорова риска на лівому полі навпроти речення, на якому
 * читач зупинився (останнє натиснуте слово або речення, до якого дійшло читання вголос). Запам'ятовується для кожної
 * книги окремо й показується знову після відкриття книги, гортання чи зміни розміру шрифту.
 *
 * Текстові формати (EPUB/FB2/DOCX/TXT/MD/HTML): точка — номер розділу/блоку + символьні зсуви речення в тексті
 * розділу (та сама модель, що й закладка сторінки в js/navigation.js), тому стрічка переживає перерозкладку колонок.
 * PDF: номер сторінки + верх/низ речення у частках висоти сторінки — стрічка лежить у самій обгортці сторінки й
 * масштабується разом із нею. Класичний <script src>; DOM сторінки книги не змінюється (стрічка — окремий елемент).
 */
const READING_RIBBON_PREFIX = 'reader_readpos_v1:';
let readingPoint = null, readingPointBook = null;

function readingPointKey() { return state.bookKey ? READING_RIBBON_PREFIX + state.bookKey : null; }
function loadReadingPoint() {
    const key = readingPointKey();
    readingPoint = null; readingPointBook = state.bookKey || null;
    if (!key) return null;
    try {
        const value = JSON.parse(readStored(key) || 'null');
        if (value && Number.isInteger(value.chapter) && Number.isFinite(value.start) && Number.isFinite(value.end)) readingPoint = value;
    } catch (e) {}
    return readingPoint;
}
// Символьний зсув точки (node, offset) у тексті розділу — так само, як рахує bookTextOffsetAtPage.
function textOffsetOfPoint(node, offset) {
    const walker = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT);
    let n, total = 0;
    while ((n = walker.nextNode())) {
        if (n === node) return total + offset;
        total += n.length;
    }
    return null;
}
function textPointAtOffset(offset) {
    const walker = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
        if (offset <= n.length) return { node: n, offset };
        offset -= n.length;
    }
    return null;
}
// Запам'ятати місце читання за діапазоном речення (або слова), що лежить на сторінці книги.
function markReadingPoint(range) {
    if (!state.bookKey || !range || !range.startContainer || !els.pages.contains(range.startContainer)) return;
    let point = null;
    if (state.format === 'pdf') {
        const el = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
        const wrapper = el && el.closest('.pdf-page-wrapper');
        const page = wrapper ? Number(wrapper.dataset.page) : NaN;
        const wr = wrapper && wrapper.getBoundingClientRect(), rr = range.getBoundingClientRect();
        if (!Number.isInteger(page) || !wr || !wr.height || !rr.height) return;
        point = { chapter: page, start: (rr.top - wr.top) / wr.height, end: (rr.bottom - wr.top) / wr.height, pdf: true };
    } else {
        if (range.startContainer.nodeType !== Node.TEXT_NODE || range.endContainer.nodeType !== Node.TEXT_NODE) return;
        const start = textOffsetOfPoint(range.startContainer, range.startOffset), end = textOffsetOfPoint(range.endContainer, range.endOffset);
        if (start === null || end === null || end <= start) return;
        point = { chapter: state.currentIndex, start, end };
    }
    point.at = Date.now();
    readingPoint = point; readingPointBook = state.bookKey;
    try { writeStored(readingPointKey(), JSON.stringify(point)); } catch (e) {}
    renderReadingRibbon();
}
function readingRibbonEl() {
    let el = document.getElementById('reading-ribbon');
    if (!el) {
        el = document.createElement('div');
        el.id = 'reading-ribbon'; el.className = 'reading-ribbon'; el.setAttribute('aria-hidden', 'true');
    }
    return el;
}
function hideReadingRibbon() { const el = document.getElementById('reading-ribbon'); if (el) el.hidden = true; }
// Показати стрічку навпроти збереженого речення, якщо воно на видимій сторінці.
function renderReadingRibbon() {
    if (readingPointBook !== (state.bookKey || null)) loadReadingPoint();
    const p = readingPoint;
    if (!p || !state.bookKey) { hideReadingRibbon(); return; }
    const el = readingRibbonEl();
    if (state.format === 'pdf') {
        if (!p.pdf) { hideReadingRibbon(); return; }
        const wrapper = document.querySelector(`.pdf-page-wrapper[data-page="${p.chapter}"]`);
        if (!wrapper) { hideReadingRibbon(); return; }
        if (el.parentElement !== wrapper) wrapper.appendChild(el);
        el.classList.add('pdf');
        el.style.left = ''; el.style.top = `${(p.start * 100).toFixed(3)}%`;
        el.style.height = `${Math.max(0.6, (p.end - p.start) * 100).toFixed(3)}%`;
        el.hidden = false;
        return;
    }
    if (p.pdf || p.chapter !== state.currentIndex) { hideReadingRibbon(); return; }
    const a = textPointAtOffset(p.start), b = textPointAtOffset(p.end);
    if (!a || !b) { hideReadingRibbon(); return; }
    const range = document.createRange();
    try { range.setStart(a.node, a.offset); range.setEnd(b.node, b.offset); } catch (e) { hideReadingRibbon(); return; }
    // Лише рядки речення на ПОТОЧНІЙ сторінці-колонці. Зсуви рахуються від #reader-pages, тож анімація гортання
    // (transform) на результат не впливає.
    const pagesRect = els.pages.getBoundingClientRect(), step = columnStep();
    let top = Infinity, bottom = -Infinity;
    for (const r of range.getClientRects()) {
        if (!r.height) continue;
        const relX = r.left - pagesRect.left;
        if (Math.floor((relX + 1) / step) !== state.pageInChapter) continue;
        top = Math.min(top, r.top - pagesRect.top); bottom = Math.max(bottom, r.bottom - pagesRect.top);
    }
    if (!Number.isFinite(top)) { hideReadingRibbon(); return; }
    if (el.parentElement !== els.container) els.container.appendChild(el);
    el.classList.remove('pdf');
    el.style.left = `${Math.max(2, els.pages.offsetLeft - 16)}px`;
    el.style.top = `${els.pages.offsetTop + top}px`;
    el.style.height = `${Math.max(12, bottom - top)}px`;
    el.hidden = false;
}
