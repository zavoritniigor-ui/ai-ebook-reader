/* book-marks.js — виділення й нотатки в текстових книгах (EPUB/FB2/DOCX/TXT/MD/HTML/RTF; у PDF є власне письмо поверх
 * сторінки, js/pdf-ink.js). Кнопка «📝» у вікні перекладу виділяє вибраний фрагмент (або речення натиснутого слова) і
 * відкриває поле нотатки; повторне натискання на вже виділеному місці відкриває ту саму нотатку з кнопкою «Прибрати».
 * Список усіх виділень книги — у бічній панелі під змістом (перехід, нотатка, видалення).
 *
 * Модель — та сама, що й у закладки та стрічки «місце читання» (js/reading-ribbon.js): номер розділу + символьні зсуви
 * в тексті розділу, тому виділення переживає перерозкладку колонок і зміну шрифту. Якщо текст за зсувами не збігається
 * (інша версія файлу), фрагмент шукається в розділі за самим текстом. Малюється через CSS Custom Highlight API
 * (::highlight(book-mark)) — DOM книги не змінюється. Зберігається в localStorage окремо для кожної книги.
 */
const BOOK_MARKS_PREFIX = 'reader_marks_v1:';
let bookMarks = [], bookMarksBook = null, openMarkId = null;

Object.assign(I18N, {
    tMark: { uk: 'Виділити й додати нотатку', en: 'Highlight and add a note', fr: 'Surligner et ajouter une note', ru: 'Выделить и добавить заметку', es: 'Resaltar y añadir una nota' },
    markNotePlaceholder: { uk: 'Нотатка (необов\'язково)…', en: 'Note (optional)…', fr: 'Note (facultative)…', ru: 'Заметка (необязательно)…', es: 'Nota (opcional)…' },
    markRemove: { uk: 'Прибрати виділення', en: 'Remove highlight', fr: 'Retirer le surlignage', ru: 'Убрать выделение', es: 'Quitar el resaltado' },
    marksTitle: { uk: '📝 Виділення й нотатки', en: '📝 Highlights & notes', fr: '📝 Surlignages et notes', ru: '📝 Выделения и заметки', es: '📝 Resaltados y notas' },
    marksEmpty: { uk: 'Ще немає. Торкніться слова чи виділіть фрагмент і натисніть 📝.', en: 'None yet. Tap a word or select a passage and press 📝.',
                  fr: 'Aucun pour l’instant. Touchez un mot ou sélectionnez un passage et appuyez sur 📝.', ru: 'Пока нет. Коснитесь слова или выделите фрагмент и нажмите 📝.',
                  es: 'Todavía no hay. Toca una palabra o selecciona un fragmento y pulsa 📝.' },
    markGo: { uk: 'Перейти', en: 'Go to', fr: 'Aller', ru: 'Перейти', es: 'Ir' },
    markPdfOnly: { uk: 'У PDF пишіть прямо на сторінці (✍️).', en: 'In a PDF, write right on the page (✍️).', fr: 'Dans un PDF, écrivez directement sur la page (✍️).',
                   ru: 'В PDF пишите прямо на странице (✍️).', es: 'En un PDF, escribe directamente en la página (✍️).' }
});

function bookMarksKey() { return state.bookKey ? BOOK_MARKS_PREFIX + state.bookKey : null; }
function loadBookMarks() {
    bookMarksBook = state.bookKey || null; bookMarks = [];
    const key = bookMarksKey();
    if (!key) return bookMarks;
    try {
        const list = JSON.parse(readStored(key) || '[]');
        if (Array.isArray(list)) bookMarks = list.filter(m => m && typeof m.id === 'string' && Number.isInteger(m.chapter) && Number.isInteger(m.start) && Number.isInteger(m.end) && m.end > m.start && typeof m.text === 'string');
    } catch (e) {}
    return bookMarks;
}
function currentBookMarks() { if (bookMarksBook !== (state.bookKey || null)) loadBookMarks(); return bookMarks; }
function saveBookMarks() {
    const key = bookMarksKey();
    if (!key) return;
    try { if (bookMarks.length) writeStored(key, JSON.stringify(bookMarks)); else localStorage.removeItem(key); } catch (e) {}
}

// Діапазон виділення в поточному розділі; якщо текст за зсувами інший — шукаємо сам текст (найближчий до старого місця).
function bookMarkRange(mark) {
    const a = textPointAtOffset(mark.start), b = textPointAtOffset(mark.end);
    const make = (x, y) => { const r = document.createRange(); try { r.setStart(x.node, x.offset); r.setEnd(y.node, y.offset); return r; } catch (e) { return null; } };
    let range = a && b ? make(a, b) : null;
    if (range && range.toString() === mark.text) return range;
    const full = els.pages.textContent || '';
    let best = -1;
    for (let i = full.indexOf(mark.text); i !== -1; i = full.indexOf(mark.text, i + 1)) if (best === -1 || Math.abs(i - mark.start) < Math.abs(best - mark.start)) best = i;
    if (best === -1) return null;
    const x = textPointAtOffset(best), y = textPointAtOffset(best + mark.text.length);
    return x && y ? make(x, y) : null;
}
function paintBookMarks() {
    if (bookMarksBook !== (state.bookKey || null)) { loadBookMarks(); closeMarkEditor(); renderBookMarksList(); }   // інша книга
    if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return;
    if (!state.format || state.format === 'pdf') { CSS.highlights.delete('book-mark'); return; }
    const ranges = currentBookMarks().filter(m => m.chapter === state.currentIndex).map(bookMarkRange).filter(Boolean);
    if (ranges.length) CSS.highlights.set('book-mark', new Highlight(...ranges)); else CSS.highlights.delete('book-mark');
}

// Що виділяти: явне виділення в книзі, інакше — речення натиснутого слова.
function bookMarkTargetRange() {
    for (const r of [state.lastSelectedRange, state.ctxSentenceRange]) {
        if (r && !r.collapsed && els.pages.contains(r.startContainer) && els.pages.contains(r.endContainer)
            && r.startContainer.nodeType === Node.TEXT_NODE && r.endContainer.nodeType === Node.TEXT_NODE) return r;
    }
    return null;
}
function addBookMark(range) {
    let start = textOffsetOfPoint(range.startContainer, range.startOffset), end = textOffsetOfPoint(range.endContainer, range.endOffset);
    if (start === null || end === null || end <= start) return null;
    // Діапазон речення часто захоплює пробіл перед ним: виділення — без пробілів по краях.
    const raw = range.toString(), text = raw.trim();
    if (!text) return null;
    start += raw.length - raw.trimStart().length; end -= raw.length - raw.trimEnd().length;
    const marks = currentBookMarks();
    // Те саме місце (перетин) — це вже наявне виділення: відкриваємо його нотатку, а не плодимо копії.
    const same = marks.find(m => m.chapter === state.currentIndex && m.start < end && start < m.end);
    if (same) return same;
    const mark = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), chapter: state.currentIndex, start, end,
                   text, note: '', at: Date.now() };
    marks.push(mark);
    marks.sort((x, y) => x.chapter - y.chapter || x.start - y.start);
    saveBookMarks(); paintBookMarks(); renderBookMarksList();
    return mark;
}
function removeBookMark(id) {
    bookMarks = currentBookMarks().filter(m => m.id !== id);
    if (openMarkId === id) closeMarkEditor();
    saveBookMarks(); paintBookMarks(); renderBookMarksList();
}
function setBookMarkNote(id, note) {
    const mark = currentBookMarks().find(m => m.id === id);
    if (!mark) return;
    mark.note = String(note || '').slice(0, 5000);
    saveBookMarks(); renderBookMarksList(id);
}

// Поле нотатки у вікні перекладу (під кнопками), для щойно виділеного або вже наявного місця.
function markEditorHost() {
    let host = document.getElementById('tt-mark-host');
    if (!host) {
        host = document.createElement('div'); host.id = 'tt-mark-host'; host.className = 'tt-mark-host'; host.hidden = true;
        const area = document.createElement('textarea'); area.id = 'tt-mark-note'; area.rows = 2; area.maxLength = 5000;
        area.addEventListener('input', () => { if (openMarkId) setBookMarkNote(openMarkId, area.value); });
        area.addEventListener('pointerdown', e => e.stopPropagation());
        const remove = document.createElement('button'); remove.type = 'button'; remove.id = 'tt-mark-remove'; remove.className = 'tt-mark-remove';
        remove.addEventListener('click', (e) => { e.stopPropagation(); if (openMarkId) removeBookMark(openMarkId); });
        host.append(area, remove);
        const actions = els.tooltip.querySelector('.tt-actions');
        actions.after(host);
    }
    return host;
}
function openMarkEditor(mark) {
    const host = markEditorHost();
    openMarkId = mark.id;
    const area = host.querySelector('textarea');
    area.placeholder = t('markNotePlaceholder'); area.value = mark.note || '';
    host.querySelector('#tt-mark-remove').textContent = '✕ ' + t('markRemove');
    host.hidden = false;
    state.tooltipPersistent = true;   // нотатку пишуть довше, ніж триває звичайний відлік закриття
    if (typeof cancelTooltipHide === 'function') cancelTooltipHide();
    const a = state.tooltipAnchor; if (a && typeof positionTooltip === 'function') positionTooltip(a.clientX, a.clientY, a.anchorRect);
}
function closeMarkEditor() {
    openMarkId = null;
    const host = document.getElementById('tt-mark-host');
    if (host) host.hidden = true;
}
function onMarkButton(e) {
    e.stopPropagation();
    if (state.format === 'pdf') { showToast(t('markPdfOnly')); return; }
    const range = bookMarkTargetRange();
    if (!range) return;
    const mark = addBookMark(range);
    if (mark) { openMarkEditor(mark); setTimeout(() => document.getElementById('tt-mark-note')?.focus({ preventScroll: true }), 0); }
}

// Тап у вже виділеному місці відкриває його нотатку (і кнопку «Прибрати»); інакше поле нотатки закрите.
function showBookMarkForTap() {
    closeMarkEditor();
    if (!state.format || state.format === 'pdf') return;
    const range = bookMarkTargetRange();
    if (!range) return;
    const start = textOffsetOfPoint(range.startContainer, range.startOffset), end = textOffsetOfPoint(range.endContainer, range.endOffset);
    if (start === null || end === null) return;
    const mark = currentBookMarks().find(m => m.chapter === state.currentIndex && m.start < end && start < m.end);
    if (mark) openMarkEditor(mark);
}

// Перехід до виділення: інший розділ — відкрити його на цьому місці; той самий — на сторінку з ним.
async function goToBookMark(mark) {
    if (window.innerWidth <= 1180) els.sidebar.classList.add('collapsed');   // як і перехід за змістом
    if (mark.chapter !== state.currentIndex) {
        if (state.format === 'epub') await loadEpubChapter(mark.chapter, false, null, mark.start);
        else if (state.docChapters) await renderDocChapter(mark.chapter, false, null, mark.start);
        else await renderTxtPage(mark.chapter, false, null, mark.start);
        return;
    }
    const page = pageForBookTextOffset(mark.start);
    if (page !== null) goToPageInChapter(page, true, mark.start);
}

// Список у бічній панелі (під змістом). keepNote — id нотатки, що зараз редагується в самому списку: її поле не
// перебудовується, щоб не збивати курсор.
function renderBookMarksList(keepNote = null) {
    const section = document.getElementById('marks-section');
    if (!section) return;
    const list = section.querySelector('#marks-list');
    section.hidden = !state.format || state.format === 'pdf';
    if (section.hidden) return;
    if (keepNote && list.querySelector(`[data-mark="${keepNote}"] textarea`) === document.activeElement) return;
    const marks = currentBookMarks();
    list.replaceChildren();
    if (!marks.length) {
        const empty = document.createElement('li'); empty.className = 'marks-empty'; empty.textContent = t('marksEmpty'); list.append(empty); return;
    }
    for (const mark of marks) {
        const li = document.createElement('li'); li.className = 'mark-item'; li.dataset.mark = mark.id;
        const quote = document.createElement('button'); quote.type = 'button'; quote.className = 'mark-quote'; quote.title = t('markGo');
        quote.textContent = mark.text.length > 160 ? mark.text.slice(0, 157) + '…' : mark.text;
        quote.addEventListener('click', () => goToBookMark(mark));
        const note = document.createElement('textarea'); note.className = 'mark-note'; note.rows = 1; note.maxLength = 5000;
        note.placeholder = t('markNotePlaceholder'); note.value = mark.note || '';
        note.addEventListener('input', () => setBookMarkNote(mark.id, note.value));
        const del = document.createElement('button'); del.type = 'button'; del.className = 'mark-del'; del.textContent = '🗑'; del.title = t('markRemove');
        del.setAttribute('aria-label', t('markRemove'));
        del.addEventListener('click', () => removeBookMark(mark.id));
        li.append(quote, note, del);
        list.append(li);
    }
}
function buildBookMarksSection() {
    if (document.getElementById('marks-section')) return;
    const toc = document.getElementById('toc-list');
    if (!toc) return;
    const section = document.createElement('section'); section.id = 'marks-section'; section.hidden = true;
    const h = document.createElement('h4'); h.dataset.i18n = 'marksTitle'; h.textContent = t('marksTitle');
    const list = document.createElement('ul'); list.id = 'marks-list';
    section.append(h, list);
    toc.after(section);
}

// Кнопка 📝 серед значків угорі вікна перекладу (🔊, речення, ✕): у рядку великих кнопок на телефоні вже немає місця.
(function setUpBookMarks() {
    buildBookMarksSection();
    const close = document.getElementById('tt-close-btn');
    if (close && !document.getElementById('tt-mark-btn')) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'tt-mark-btn'; btn.className = 'tt-replay-btn'; btn.textContent = '📝';
        btn.dataset.i18nTitle = 'tMark'; btn.dataset.i18nAria = 'tMark'; btn.title = t('tMark'); btn.setAttribute('aria-label', t('tMark'));
        btn.addEventListener('click', onMarkButton);
        close.before(btn);
    }
})();
