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
const PAGE_GAP = 48; // px — відстань між "сторінками"-колонками, єдине джерело правди
function columnStep() {
    // Крок беремо ВИМІРЯНИЙ, а не обчислений з ширини елемента: браузер просуває
    // колонку на дробову величину, і різниця накопичувалась з кожним гортанням,
    // аж поки зсув не ставав на частину колонки — тоді дві сторінки накладались.
    if (state.measuredStep > 0) return state.measuredStep;
    return Math.round(els.pages.clientWidth) + PAGE_GAP;
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
function repaginateBook() {
    const offset = state.bookTextOffset;
    paginateContainer();
    goToPageInChapter(pageForBookTextOffset(offset) ?? state.pageInChapter, false);
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
    els.pages.style.columnGap = PAGE_GAP + 'px';
    els.pages.style.columnWidth = els.pages.clientWidth + 'px';
    els.pages.style.height = '100%';

    const rough = Math.round(els.pages.clientWidth) + PAGE_GAP;
    const total = Math.max(1, Math.round(els.pages.scrollWidth / rough));
    state.totalPagesInChapter = total;
    // Точний крок, узгоджений із реальною шириною розкладки.
    state.measuredStep = total > 1 ? (els.pages.scrollWidth + PAGE_GAP) / total : rough;
}
function goToPageInChapter(p, animate = true) {
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
    state.bookTextOffset = bookTextOffsetAtPage();
    updateProgressText();
    refreshReadingStats();
    saveBookmark();
}
function updateProgressText() {
    if (state.format === 'pdf') { els.progress.textContent = `${state.currentIndex} ${t('of')} ${state.totalPages}`; return; }
    const label = t(state.format === 'epub' ? 'chapter' : 'block');
    els.progress.textContent = `${label} ${state.currentIndex + 1}/${state.totalPages} · ${t('page')} ${state.pageInChapter + 1} ${t('of')} ${state.totalPagesInChapter}`;
}

// ========== ЗАКЛАДКА (запам'ятовує місце в книзі) ==========
function bookKeyFor(file) { return 'reader_bookmark_' + file.name + '_' + file.size + '_' + (file.lastModified || 0); }
function oldBookKeyFor(file) { return 'reader_bookmark_' + file.name + '_' + file.size; }
function saveBookmark() {
    if (!state.bookKey) return;
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
    invalidateSelection();
    if (isSpeakingGlobal) stopGlobalTTS();
    if (state.format === 'pdf') { if (state.currentIndex < state.totalPages) renderPdfPage(state.currentIndex + 1); return; }
    if (state.pageInChapter < state.totalPagesInChapter - 1) goToPageInChapter(state.pageInChapter + 1);
    else if (state.currentIndex < state.totalPages - 1) { if (state.format === 'epub') loadEpubChapter(state.currentIndex + 1); else if (state.docChapters) renderDocChapter(state.currentIndex + 1); else renderTxtPage(state.currentIndex + 1); }
}
function goPrev() {
    invalidateSelection();
    if (isSpeakingGlobal) stopGlobalTTS();
    if (state.format === 'pdf') { if (state.currentIndex > 1) renderPdfPage(state.currentIndex - 1); return; }
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
let resizeTimer;
let lastContainerResizeSize = null;
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
    if (lastContainerResizeSize && Math.abs(lastContainerResizeSize.w - w) < 1 && Math.abs(lastContainerResizeSize.h - h) < 1) return;
    lastContainerResizeSize = { w, h };
    const focus = pdfViewFocus;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (state.format === 'pdf') { if (state.pdfDoc && !document.hidden) { cancelPdfInteraction(); renderPdfPage(state.currentIndex, { preserve: true, focus }); } }
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
