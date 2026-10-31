/* navigation.js — гортання сторінок: справжня пагінація через CSS-колонки
 * (columnStep/paginateContainer/goToPageInChapter/updateProgressText),
 * закладка (bookKeyFor/saveBookmark/loadBookmark), goNext/goPrev, свайп/колесо-
 * гортання для телефона/планшета/десктопа (touchstart/touchmove/touchend/wheel
 * на els.mainArea), і переналаштування пагінації при зміні розміру екрана.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/selection.js. Останній шматок (window resize) зумисно лишається тут,
 * а не в майбутньому pdf-zoom-pan.js: обробник один на обидва формати (гілка PDF
 * викликає cancelPdfInteraction/renderPdfPage, гілка тексту — paginateContainer/
 * goToPageInChapter), і саме нетекстова гілка була описана як "navigation-
 * adjacent" ще під час розвідки Кроку 4 — розбивати один listener на два файли
 * заради формальної чистоти небезпечніше, ніж корисно. pdfViewFocus/
 * cancelPdfInteraction/renderPdfPage (js/pdf-render.js та поки що inline
 * pdf-zoom-pan-матеріал, Крок 11) — forward-виклики лише всередині callback'а,
 * це безпечно, той самий механізм, що вже описаний у js/pdf-render.js для
 * pdfAnchor.
 */

// ========== СПРАВЖНЯ ПАГІНАЦІЯ (окремі сторінки замість безкінечного скролу) ==========
// Для epub/txt текст розкладається в CSS-колонку шириною на весь контейнер: кожна
// "колонка" — це рівно один екран тексту. Гортання = зсув по горизонталі на ширину
// однієї сторінки. Нумерація рахується в межах поточного розділу (Розділ N, стор. X з Y),
// оскільки порахувати абсолютний номер сторінки по всій книзі наперед без завантаження
// й розкладки взагалі всіх розділів одразу неможливо.
const PAGE_GAP = 48; // px — найменша відстань між "сторінками"-колонками
// Проміжок між колонками має бути не меншим за бічні поля контейнера: інакше сусідня сторінка заходить у поле й її край
// видно збоку (планшет горизонтально: поле 56px > 48px — читач бачив обрізані рядки попередньої й наступної сторінок).
function pageGap() {
    const cs = getComputedStyle(els.container);
    return Math.max(PAGE_GAP, Math.ceil(parseFloat(cs.paddingLeft) || 0), Math.ceil(parseFloat(cs.paddingRight) || 0)) + 8;
}
function columnStep() {
    // Крок беремо ВИМІРЯНИЙ, а не обчислений з ширини елемента: браузер просуває
    // колонку на дробову величину, і різниця накопичувалась з кожним гортанням,
    // аж поки зсув не ставав на частину колонки — тоді дві сторінки накладались.
    if (state.measuredStep > 0) return state.measuredStep;
    return Math.round(els.pages.clientWidth) + pageGap();
}

// Character offsets are stable across font/viewport changes and highlight spans.
// Geometry only resolves the offset to a screen column at render time.
function bookTextOffsetAtPage() {
    const left = els.pages.getBoundingClientRect().left;
    const target = state.pageInChapter * columnStep();
    const walker = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT);
    let node, offset = 0;
    while ((node = walker.nextNode())) {
        if (!node.length) continue;
        const r = document.createRange(); r.selectNodeContents(node);
        const visible = Array.from(r.getClientRects()).find(rect => rect.width && rect.left - left >= target - 1);
        if (visible) {
            if (visible.left - left >= target + columnStep() - 1) return null;
            let lo = 0, hi = node.length - 1;
            while (lo < hi) {
                const mid = Math.floor((lo + hi) / 2);
                r.setStart(node, mid); r.setEnd(node, mid + 1);
                if (r.getBoundingClientRect().left - left < target - 1) lo = mid + 1;
                else hi = mid;
            }
            return offset + lo;
        }
        offset += node.length;
    }
    return null;
}
function pageForBookTextOffset(offset) {
    if (!Number.isInteger(offset) || offset < 0) return null;
    const left = els.pages.getBoundingClientRect().left;
    const walker = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
        if (offset < node.length) {
            const r = document.createRange(); r.setStart(node, offset); r.setEnd(node, offset + 1);
            return Math.max(0, Math.floor((r.getBoundingClientRect().left - left + 1) / columnStep()));
        }
        offset -= node.length;
    }
    return null;
}
// Поки висота тексту зафіксована на час зміни розміру (див. containerResizeObserver), номери сторінок належать ще
// СТАРОМУ макету. Перехід на сторінку в цей момент (гортання, «перейти до…») спершу завершує відкладене переразбиття —
// інакше після нього сторінка зсувалась і читач опинявся не там, куди гортав.
function flushPendingResize() {
    if (!state.format || state.format === 'pdf' || !resizeTimer || els.pages.style.height === '100%') return;
    clearTimeout(resizeTimer); resizeTimer = null;
    repaginateBook();
}
function repaginateBook() {
    const offset = state.bookTextOffset;
    paginateContainer();
    goToPageInChapter(pageForBookTextOffset(offset) ?? state.pageInChapter, false, offset);
}

function paginateContainer() {
    if (state.format === 'pdf') return;
    state.measuredStep = 0;   // старий крок від попереднього розділу більше не дійсний
    // Скидаємо все, що могло лишитись від PDF: інакше контейнер лишається
    // прокручуваним і перестає обрізати сусідні колонки.
    els.container.style.overflow = 'hidden';
    els.container.style.overflowX = '';
    els.container.style.overflowY = '';
    els.container.style.touchAction = 'pan-y';
    els.pages.style.margin = '';
    els.pages.style.width = '';

    els.pages.style.transform = 'none'; els.pages.classList.add('no-anim'); // не міряємо "на льоту" зі зсувом
    els.pages.style.columnGap = pageGap() + 'px';
    els.pages.style.columnWidth = els.pages.clientWidth + 'px';
    els.pages.style.height = '100%';
    state.pagedHeight = els.pages.clientHeight;   // висота, за якою щойно розбито сторінки (див. containerResizeObserver)

    const rough = Math.round(els.pages.clientWidth) + pageGap();
    const total = Math.max(1, Math.round(els.pages.scrollWidth / rough));
    state.totalPagesInChapter = total;
    // Точний крок, узгоджений із реальною шириною розкладки.
    state.measuredStep = total > 1 ? (els.pages.scrollWidth + pageGap()) / total : rough;
    noteCharsPerPage(total);
}
// anchor — символ, за яким сторінку щойно знайдено (відкриття книги, зміна розміру): він і лишається місцем читання, якщо
// стоїть на цій сторінці. Інакше місцем ставав початок сторінки, і кожне переразбиття (на планшеті меню ховається одразу
// після відкриття книги) відсувало закладку на сторінку назад: збережено 2-гу, відкривалась 1-ша.
function goToPageInChapter(p, animate = true, anchor = null) {
    flushPendingResize();
    p = Number.isFinite(p) ? Math.trunc(p) : 0;
    p = Math.max(0, Math.min(p, state.totalPagesInChapter - 1));
    state.pageInChapter = p;
    // Пересуваємо ВЕСЬ блок через translate3d (GPU-композиція), а не scrollLeft —
    // scrollLeft на CSS-колонках змушує браузер перераховувати видиму область контенту
    // при кожному кліку, і на телефоні це не встигає за швидкими свайпами ("ефект
    // уповільненого кіно"). transform лише зсуває вже готове зображення — швидко за
    // визначенням, незалежно від того, як часто гортати сторінки.
    els.pages.classList.toggle('no-anim', !animate);
    if (animate) {
        els.pages.classList.add('anim');
        clearTimeout(state.animTimer);
        state.animTimer = setTimeout(() => els.pages.classList.remove('anim'), 320);
    } else {
        els.pages.classList.remove('anim');
    }
    els.pages.style.transform = `translate3d(${-(p * columnStep())}px, 0, 0)`;
    state.bookTextOffset = Number.isInteger(anchor) && pageForBookTextOffset(anchor) === p ? anchor : bookTextOffsetAtPage();
    updateProgressText();
    refreshReadingStats();
    saveBookmark();
    if (typeof renderReadingRibbon === 'function') renderReadingRibbon();
    if (typeof paintBookMarks === 'function') paintBookMarks();   // виділення й нотатки (js/book-marks.js)
    if (typeof layoutTextInk === 'function') layoutTextInk();     // письмо від руки на цій сторінці (js/text-ink.js)
}
// ========== СТОРІНКИ ВСІЄЇ КНИГИ (оцінка) ==========
// Розкладено лише поточний розділ, тож сторінки інших оцінюємо: літери розділу / літери на сторінку + ілюстрації (≈ пів
// сторінки кожна). Літери розділів рахуються у фоні після відкриття книги (computeBookWeights), «літер на сторінку» —
// на найбільшому з уже показаних розділів за поточних шрифту й розміру екрана (до першого виміру — оцінка з площі).
const BOOK_IMG_PAGE = 0.5;
const textLength = s => String(s || '').replace(/\s+/g, ' ').trim().length;
function blockWeightFromHtml(html) {
    const body = String(html || '').replace(/<(head|script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/^[\s\S]*?<body\b[^>]*>/i, '');
    const imgs = (body.match(/<(img|image)\b/gi) || []).length;
    const text = body.replace(/<\/?(p|div|h\d|li|br|tr|td|th|blockquote|section|dd|dt|pre|hr)\b[^>]*>/gi, ' ')
        .replace(/<[^>]*>/g, '').replace(/&[#\w]+;/g, 'x');
    return { chars: textLength(text), imgs };
}
async function computeBookWeights(epoch) {
    state.blockWeights = null;
    try {
        let weights;
        if (state.format === 'epub' && state.epubZip) {
            weights = [];
            for (const path of state.spine) {
                const file = state.epubZip.file(path);
                weights.push(file ? blockWeightFromHtml(await file.async('text')) : { chars: 0, imgs: 0 });
                if (epoch !== readerEpoch.book) return;
            }
        } else if (state.docChapters) {
            weights = state.docChapters.map(blockWeightFromHtml);
        } else if (state.txtLines && state.txtLines.length) {
            weights = [];
            for (let i = 0; i < state.totalPages; i++) weights.push({ chars: textLength(state.txtLines.slice(i * 50, (i + 1) * 50).join('\n')), imgs: 0 });
        } else return;
        if (epoch !== readerEpoch.book) return;
        state.blockWeights = weights;
        updateProgressText();
    } catch (e) { /* без оцінки — лишаються відсотки */ }
}
function noteCharsPerPage(pages) {
    const cs = getComputedStyle(els.pages);
    const key = `${els.pages.clientWidth}x${els.pages.clientHeight}|${cs.fontSize}|${cs.lineHeight}|${cs.fontFamily}`;
    if (state.cppKey !== key) { state.cppKey = key; state.charsPerPage = 0; state.cppChars = 0; }
    const chars = textLength(els.pages.textContent);
    const textPages = pages - els.pages.querySelectorAll('img').length * BOOK_IMG_PAGE;
    // >= : той самий розділ після довантаження ілюстрацій перерозкладається — новий вимір точніший.
    if (pages >= 2 && textPages >= 1 && chars >= (state.cppChars || 0)) { state.cppChars = chars; state.charsPerPage = chars / textPages; }
}
function fallbackCharsPerPage() {
    const cs = getComputedStyle(els.pages), fs = parseFloat(cs.fontSize) || 18;
    const lh = parseFloat(cs.lineHeight) || fs * 1.5;
    return Math.max(200, (els.pages.clientWidth / (fs * 0.5)) * (els.pages.clientHeight / lh) * 0.85);
}
function bookPageModel() {
    const weights = state.blockWeights, cur = state.currentIndex || 0;
    if (state.format === 'pdf' || !weights || weights.length !== state.totalPages) return null;
    const cpp = state.charsPerPage || fallbackCharsPerPage();
    const pages = weights.map((w, i) => i === cur ? Math.max(1, state.totalPagesInChapter || 1)
        : (w.chars || w.imgs ? Math.max(1, Math.ceil(w.chars / cpp + w.imgs * BOOK_IMG_PAGE)) : 0));
    const before = []; let sum = 0;
    for (const n of pages) { before.push(sum); sum += n; }
    return { pages, before, total: Math.max(1, sum), page: before[cur] + (state.pageInChapter || 0) };
}

// ========== ШВИДКЕ ГОРТАННЯ ДЛЯ ТЕКСТОВИХ ФОРМАТІВ ==========
// Той самий повзунок, що й у PDF (#pdf-scrubber, js/pdf-render.js), але позиція — частка ВСІЄЇ книги. Коли відомі обсяги
// розділів (bookPageModel), шкала пропорційна оціненим сторінкам; до того кожен розділ/блок займає рівну частину шкали.
// Сторінки іншого розділу наперед невідомі (він не розкладений), тому при переході в нього сторінка обирається за часткою.
const TEXT_SCRUB_MAX = 1000;
function textScrubPosition() {
    const model = bookPageModel();
    if (model) return model.total > 1 ? Math.round(model.page / (model.total - 1) * TEXT_SCRUB_MAX) : 0;
    const blocks = Math.max(1, state.totalPages || 1), pages = Math.max(1, state.totalPagesInChapter || 1);
    return Math.round(((state.currentIndex || 0) + (state.pageInChapter || 0) / pages) / blocks * TEXT_SCRUB_MAX);
}
function textScrubTarget(value) {
    const v = Math.max(0, Math.min(TEXT_SCRUB_MAX, value)) / TEXT_SCRUB_MAX;
    const model = bookPageModel();
    if (model) {
        const page = Math.round(v * (model.total - 1));
        let block = model.pages.length - 1;
        for (let i = 0; i < model.pages.length; i++) if (model.pages[i] && page < model.before[i] + model.pages[i]) { block = i; break; }
        const n = Math.max(1, model.pages[block]);
        // Кінець шкали — завжди остання сторінка: справжня кількість сторінок розділу може бути більшою за оцінку.
        const frac = v >= 1 ? 0.9999 : Math.min(0.9999, (page - model.before[block] + 0.5) / n);
        return { block, frac, page, total: model.total };
    }
    const blocks = Math.max(1, state.totalPages || 1);
    const g = v * blocks;
    const block = Math.min(blocks - 1, Math.floor(g));
    return { block, frac: Math.min(0.9999, g - block) };
}
function textScrubLabel(value) {
    const { block, frac, page, total } = textScrubTarget(value);
    if (total) return `${page + 1}\n/${total}`;
    if (block === state.currentIndex) {
        const pages = Math.max(1, state.totalPagesInChapter || 1);
        const page = Math.min(pages - 1, Math.floor(frac * pages));
        return state.totalPages > 1 ? `${block + 1}·${page + 1}/${pages}` : `${page + 1}/${pages}`;
    }
    return `${t(state.format === 'epub' ? 'chapter' : 'block')} ${block + 1}`;
}
function updateTextScrubber() {
    const scrubber = document.getElementById('pdf-scrubber'), range = document.getElementById('pdf-page-range');
    if (!scrubber || !range) return;
    const total = (state.totalPages || 0) > 1 || (state.totalPagesInChapter || 0) > 1;
    scrubber.classList.toggle('available', !!state.bookKey && total);
    if (typeof scrubDragging !== 'undefined' && scrubDragging) return;
    range.min = 0; range.max = TEXT_SCRUB_MAX; range.step = 1;
    const value = textScrubPosition();
    range.value = value;
    const model = bookPageModel();
    const preview = document.getElementById('pdf-page-preview');
    if (preview) preview.value = model ? `${model.page + 1}\n/${model.total}` : `${Math.round(value / TEXT_SCRUB_MAX * 100)}%`;
    range.setAttribute('aria-valuetext', model ? `${model.page + 1} / ${model.total}` : textScrubLabel(value));
}
function previewTextScrub(value) {
    const preview = document.getElementById('pdf-page-preview');
    if (preview) preview.value = textScrubLabel(value);
    document.getElementById('pdf-page-range')?.setAttribute('aria-valuetext', textScrubLabel(value).replace('\n', ' '));
}
let textScrubToken = 0;
async function commitTextScrub(value) {
    if (state.format === 'pdf' || !state.bookKey) return;
    const { block, frac } = textScrubTarget(value);
    const token = ++textScrubToken;
    invalidateSelection();
    if (isSpeakingGlobal) stopGlobalTTS();
    if (block !== state.currentIndex) {
        if (state.format === 'epub') await loadEpubChapter(block, false, 0);
        else if (state.docChapters) await renderDocChapter(block, false, 0);
        else await renderTxtPage(block, false, 0);
        if (token !== textScrubToken) return;
    }
    const pages = Math.max(1, state.totalPagesInChapter || 1);
    goToPageInChapter(Math.min(pages - 1, Math.floor(frac * pages)), false);
}

function updateProgressText() {
    if (typeof updateTextScrubber === 'function' && state.format !== 'pdf') updateTextScrubber();
    if (state.format === 'pdf') {
        if (typeof updatePdfProgressText === 'function') updatePdfProgressText(state.currentIndex);
        else els.progress.textContent = `${state.currentIndex} ${t('of')} ${state.totalPages}`;
        return;
    }
    const label = t(state.format === 'epub' ? 'chapter' : 'block');
    const model = bookPageModel();
    els.progress.textContent = `${label} ${state.currentIndex + 1}/${state.totalPages} · ${t('page')} ${state.pageInChapter + 1} ${t('of')} ${state.totalPagesInChapter}`
        + (model ? ` · ≈${model.page + 1}/${model.total}` : '');
}

// ========== ЗАКЛАДКА (запам'ятовує місце в книзі) ==========
function bookKeyFor(file) { return 'reader_bookmark_' + file.name + '_' + file.size + '_' + (file.lastModified || 0); }
function oldBookKeyFor(file) { return 'reader_bookmark_' + file.name + '_' + file.size; }
function saveBookmark() {
    // Поки книга відкривається, її місце ще не відновлено: велика EPUB (25 МБ) розпаковується секунди, а тим часом на планшеті
    // ховається меню → переразбиття → goToPageInChapter(0) затирав справжню закладку «розділ 0, сторінка 0». Тоді книга
    // відкривалась з початку.
    if (!state.bookKey || state.bookOpening) return;
    scheduleReaderOnboarding();
    try { writeStored(state.bookKey, JSON.stringify({ format: state.format, currentIndex: state.currentIndex, pageInChapter: state.pageInChapter, textOffset: state.format !== 'pdf' ? state.bookTextOffset : undefined, pdfFocus: state.format === 'pdf' ? pdfAnchor() : undefined })); } catch (e) {}
}
function loadBookmark() {
    if (!state.bookKey) return null;
    try {
        let raw = readStored(state.bookKey);
        if (!raw && state.oldBookKey) {
            raw = readStored(state.oldBookKey);
            if (raw) {
                try { writeStored(state.bookKey, raw); localStorage.removeItem(state.oldBookKey); } catch (e) {}
            }
        }
        const bm = raw ? JSON.parse(raw) : null;
        return bm && Number.isInteger(bm.currentIndex) && Number.isInteger(bm.pageInChapter) && bm.pageInChapter >= 0 ? bm : null;
    } catch (e) { return null; }
}

// НАВІГАЦІЯ ТА КЛІКИ
function goNext() {
    flushPendingResize();   // гортаємо від того, що видно, у вже остаточному макеті
    invalidateSelection();
    if (isSpeakingGlobal) stopGlobalTTS();
    // PDF Prev/Next remain secondary navigation (spec §12) but now scroll
    // through the SAME continuous viewer via the canonical navigateToPdfPage,
    // instead of rebuilding the document view through a separate path.
    if (state.format === 'pdf') { if (state.currentIndex < state.totalPages) navigateToPdfPage(state.currentIndex + 1); return; }
    if (state.format === 'cbz') { if (state.currentIndex < state.totalPages - 1) renderCbzPage(state.currentIndex + 1); return; }
    if (state.pageInChapter < state.totalPagesInChapter - 1) goToPageInChapter(state.pageInChapter + 1);
    else if (state.currentIndex < state.totalPages - 1) { if (state.format === 'epub') loadEpubChapter(state.currentIndex + 1); else if (state.docChapters) renderDocChapter(state.currentIndex + 1); else renderTxtPage(state.currentIndex + 1); }
}
function goPrev() {
    flushPendingResize();
    invalidateSelection();
    if (isSpeakingGlobal) stopGlobalTTS();
    if (state.format === 'pdf') { if (state.currentIndex > 1) navigateToPdfPage(state.currentIndex - 1); return; }
    if (state.format === 'cbz') { if (state.currentIndex > 0) renderCbzPage(state.currentIndex - 1); return; }
    if (state.pageInChapter > 0) goToPageInChapter(state.pageInChapter - 1);
    else if (state.currentIndex > 0) { if (state.format === 'epub') loadEpubChapter(state.currentIndex - 1, true); else if (state.docChapters) renderDocChapter(state.currentIndex - 1, true); else renderTxtPage(state.currentIndex - 1, true); }
}

// ========== ЖЕСТИ ДЛЯ ТЕЛЕФОНА/ПЛАНШЕТА ==========
// Свайп вліво/вправо АБО вгору/вниз гортає сторінку; протягування пальцем вниз від
// самого верху екрана відкриває сховане меню (без потреби тапати саме по порожньому місцю,
// що конфліктує з тапом по слову в режимі вивчення).
let touchStartX = 0, touchStartY = 0, touchStartTime = 0, touchFromTopEdge = false;
let longPressTimer = null;
function clearLongPress() { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } }
els.mainArea.addEventListener('touchstart', (e) => {
    if (state.format === 'pdf') return;
    if (e.touches.length !== 1) return;
    if (state.inkMode) return;      // пишемо — сторінку не гортаємо
    if (e.target.closest('#word-tooltip') || e.target.closest('.side-panel') || e.target.closest('nav') || e.target.closest('#tts-controls')) return;
    const t = e.touches[0];
    touchStartX = t.clientX; touchStartY = t.clientY; touchStartTime = Date.now();
    touchFromTopEdge = t.clientY < 28;

    // Власне довге утримання прибрано: цей самий жест тепер запускає системне
    // виділення Chrome з маркерами, і два виділення конфліктували б між собою.
    // Речення й абзац лишились на кнопці ⤢ у вікні перекладу.
    clearLongPress();
}, { passive: true });

els.mainArea.addEventListener('touchmove', (e) => {
    if (state.format === 'pdf') return;
    // Палець зрушив помітно — це свайп або панорамування, а не утримання.
    if (longPressTimer && e.touches.length === 1) {
        const t = e.touches[0];
        if (Math.abs(t.clientX - touchStartX) > 10 || Math.abs(t.clientY - touchStartY) > 10) clearLongPress();
    }
    if (e.touches.length > 1) clearLongPress();
}, { passive: true });

els.mainArea.addEventListener('touchend', (e) => {
    if (state.format === 'pdf') return;
    clearLongPress(); // палець піднято — утримання не відбулось
    // Під час виділення пальцем гортати не можна: рух пальця — це розтягування
    // виділення, а не свайп сторінки.
    if (state.touchSelecting) { state.suppressNextClick = true; return; }
    if (e.touches.length > 0) return; // ще є пальці на екрані — це не завершення жесту

    if (e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const dt = Date.now() - touchStartTime;

    if (touchFromTopEdge && dy > 40 && ady > adx) {
        document.body.classList.remove('immersive-mode');
        state.suppressNextClick = true;
        return;
    }
    if (dt > 700) return; // задовге торкання — не свайп

    if (adx > 55 && adx > ady * 1.3) { state.suppressNextClick = true; dx < 0 ? goNext() : goPrev(); return; }
    if (state.format !== 'pdf' && ady > 70 && ady > adx * 1.3) { state.suppressNextClick = true; dy < 0 ? goNext() : goPrev(); return; }
}, { passive: true });

// Прокрутка колесом миші / трекпадом теж гортає сторінку (замість природного скролу)
els.mainArea.addEventListener('wheel', (e) => {
    // Над вікном перекладу колесо має прокручувати сам переклад, а не гортати книгу.
    if (e.target.closest('#word-tooltip') || e.target.closest('.side-panel')) return;
    if (state.format === 'pdf' || Math.abs(e.deltaY) < 30) return;
    e.deltaY > 0 ? goNext() : goPrev();
}, { passive: true });

// Переналаштування пагінації при зміні розміру КОНТЕЙНЕРА читалки (не лише вікна).
// window 'resize' саме по собі НЕ покриває всі способи, якими #reader-container
// може змінити розмір: перемикання immersive-mode (ховає/показує шапку й футер),
// згортання бічної панелі, показ/приховання адресного рядка мобільного браузера —
// усе це міняє розмір #reader-container через самі лише CSS-класи, без жодної
// події window 'resize'. А браузерна CSS-розкладка колонок (#reader-pages має
// height:100%) все одно тихо перерозподіляє текст під НОВИЙ розмір контейнера,
// незалежно від того, чи дізналась про це JS-логіка — саме тому state.pageInChapter/
// totalPagesInChapter розходились із реально показаною колонкою після перемикання
// immersive-mode (задокументований дефект, HANDOFF.md). ResizeObserver на самому
// #reader-container — правильний, повний тригер: він спрацьовує на БУДЬ-ЯКУ зміну
// РЕАЛЬНОГО розміру цього елемента, хай би що її викликало (сам window 'resize' теж,
// оскільки в цій розкладці він завжди або міняє розмір контейнера — тоді
// ResizeObserver і так спрацює, — або не міняє його зовсім, у якому разі
// репагінація й не була б потрібна). Тому цей ResizeObserver ПОВНІСТЮ замінює
// колишній window.addEventListener('resize', ...), а не доповнює його.
let resizeTimer = null;
let lastContainerResizeSize = null;
let pendingPdfResizeAnchor = null;
function invalidatePendingPdfResizeAnchor() {
    if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
        resizeTimer = null;
    }
    pendingPdfResizeAnchor = null;
}
const containerResizeObserver = new ResizeObserver((entries) => {
    if (document.body.inert) return;
    const entry = entries[0];
    if (!entry) return;
    const box = entry.contentBoxSize?.[0];
    const w = box ? box.inlineSize : entry.contentRect.width;
    const h = box ? box.blockSize : entry.contentRect.height;
    // Ігноруємо субпіксельні коливання округлення — щоб не ганяти репагінацію
    // (а з нею — TTS-переривання, скидання highlight-підсвітки тощо) на кожен
    // кадр CSS-переходу .workspace (margin-top/height, 0.3s), де розмір насправді
    // ще не змінився відносно попереднього виміру.
    const widthChanged = !lastContainerResizeSize || Math.abs(lastContainerResizeSize.w - w) >= 1;
    const heightChanged = !lastContainerResizeSize || Math.abs(lastContainerResizeSize.h - h) >= 1;
    if (!widthChanged && !heightChanged) return;
    // У вертикальному PDF-режимі (fit: width або free zoom) розкладка сторінок залежить
    // ТІЛЬКИ від ширини контейнера. Зміна лише висоти (поява/зникнення горизонтального скролбара
    // при zoom) не повинна скидати масштаб чи фокус читання.
    if (state.format === 'pdf' && state.pdfFit !== 'page' && !widthChanged) {
        lastContainerResizeSize = { w, h };
        return;
    }
    // Capture the PDF anchor using the container size from just BEFORE this
    // resize (still in lastContainerResizeSize, about to be overwritten) —
    // by the time the debounced relayout below runs, els.container is
    // already at its NEW size, so a fresh pdfAnchor() there would pair that
    // new size with the still-old page-wrapper size and mis-locate the point
    // that was actually centered on screen pre-resize. See pdfAnchor()'s doc
    // comment in pdf-zoom-pan.js.
    // Текстові книги: поки розмір змінюється (анімація меню 0,3 с), колонки з висотою 100% перетікали б на КОЖНОМУ кадрі,
    // а зсув сторінки лишається тим самим — на екрані миготів то один, то інший текст («хаотичне перемальовування»).
    // Тримаємо висоту, за якою сторінки розбито востаннє; репагінація після анімації (finishResize) повертає 100% один раз.
    // Обробник ResizeObserver спрацьовує до відмальовування кадру, тож перетікання не видно зовсім.
    if (state.format && state.format !== 'pdf' && state.pagedHeight > 0) els.pages.style.height = state.pagedHeight + 'px';
    pendingPdfResizeAnchor = (state.format === 'pdf' && state.pdfDoc && pdfContinuousReady && lastContainerResizeSize)
        ? pdfAnchor(lastContainerResizeSize.w, lastContainerResizeSize.h) : null;
    lastContainerResizeSize = { w, h };
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function finishResize() {
        // A workspace transition must not cancel a live pinch or commit its
        // transform with a stale pre-gesture anchor. Wait until fingers lift.
        if (state.format === 'pdf' && pdfPointers.size) {
            pendingPdfResizeAnchor = null;
            resizeTimer = setTimeout(finishResize, 100);
            return;
        }
        resizeTimer = null;
        // A resize can change the fit-width scale for every page (side panel
        // opened/closed, orientation change) — re-layout the whole continuous
        // stack rather than just re-rendering one page.
        if (state.format === 'pdf') {
            if (state.pdfDoc && !document.hidden && pdfContinuousReady) {
                const anchor = pendingPdfResizeAnchor;
                pendingPdfResizeAnchor = null;
                if (anchor) {
                    cancelPdfInteraction();
                    relayoutContinuousPdfAtScale(anchor);
                }
            }
        }
        else if (state.format) repaginateBook();
    }, 250);
});
containerResizeObserver.observe(els.container);

// Будує список змісту (розділ/сторінка/блок) для бічної панелі — спільний хелпер
// для всіх трьох завантажувачів форматів (js/formats.js), не специфічний для
// жодного з них, тому лишається тут разом з рештою навігації.
function buildToc(count, prefix, callback) {
    els.toc.innerHTML = ""; for (let i = 0; i < count; i++) { const li = document.createElement("li"); li.textContent = `${prefix} ${i + 1}`; li.onclick = () => callback(i); els.toc.appendChild(li); }
}
