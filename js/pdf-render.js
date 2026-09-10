/* pdf-render.js — рендер PDF.js: initPdf (відкриття документа), renderPdfPage
 * (рендер сторінки: canvas + текстовий шар + чорнильний шар, з epoch/render-
 * токенами проти застарілих асинхронних відповідей), і сам повзунок-скрубер
 * сторінок (updatePdfScrubber/commitPdfScrub + його pointerdown/input/pointerup/
 * pointercancel/change-обробники).
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Залежить від core.js
 * (state/els/readerEpoch/pdfTasks/invalidateSelection) та js/selection.js
 * (pdfAnchor використовується лише як forward-виклик усередині callback'ів —
 * функція ще визначена в index.html, це безпечно, бо викликається не одразу).
 */

async function initPdf(file, epoch = readerEpoch.book) {
    if (!window.pdfjsLib) throw new Error('Не завантажено бібліотеку PDF. Перевірте з’єднання та оновіть сторінку.');
    // Track the file-read phase too, before PDF.js has a loading task to destroy.
    let cancelled = false;
    const reading = { destroy: async () => { cancelled = true; } };
    pdfTasks.loading = reading;
    let data;
    try { data = await file.arrayBuffer(); }
    finally { if (pdfTasks.loading === reading) pdfTasks.loading = null; }
    if (cancelled || epoch !== readerEpoch.book) return;
    // isEvalSupported прибрано разом з переходом на PDF.js 6.x: єдиний код, що колись
    // використовував eval (PostScriptCompiler для PDF-функцій), сама бібліотека видалила
    // як мертвий — тепер eval у PDF.js не використовується взагалі, і цей прапорець
    // нізвідки не читається (тож заборона eval гарантована безумовно, без опції).
    const loading = pdfjsLib.getDocument({ data });
    pdfTasks.loading = loading;
    let doc;
    try { doc = await loading.promise; }
    catch (err) { if (pdfTasks.loading === loading) pdfTasks.loading = null; throw err; }
    if (epoch !== readerEpoch.book) { await loading.destroy(); return; }
    state.pdfDoc = doc; state.totalPages = doc.numPages;
    const bm = loadBookmark();
    const startPage = (bm && bm.format === 'pdf' && bm.currentIndex >= 1 && bm.currentIndex <= state.totalPages) ? bm.currentIndex : 1;
    await renderPdfPage(startPage);
    if (epoch === readerEpoch.book && bm?.pdfFocus && Number.isFinite(bm.pdfFocus.x) && Number.isFinite(bm.pdfFocus.y)) {
        const center = pdfAnchor();
        if (center) restorePdfAnchor({ ...center, x: Math.max(0,Math.min(1,bm.pdfFocus.x)), y: Math.max(0,Math.min(1,bm.pdfFocus.y)) });
    }
    if (epoch !== readerEpoch.book) return;
    enterMobileFullScreenIfNeeded();
}
async function renderPdfPage(pageNum, options = {}) {
    if (document.hidden || !state.pdfDoc || state.format !== 'pdf' || pageNum < 1 || pageNum > state.totalPages) return false;
    if (isSpeakingGlobal) stopGlobalTTS();
    invalidateSelection();
    if (!options.preserve) cancelPdfInteraction();
    const epoch = readerEpoch.book, render = ++readerEpoch.render, doc = state.pdfDoc;
    const current = () => !document.hidden && epoch === readerEpoch.book && render === readerEpoch.render && doc === state.pdfDoc;
    pdfTasks.render?.cancel(); pdfTasks.render = null;
    pdfTasks.text?.cancel(); pdfTasks.text = null;
    const requestedScale = state.pdfScale, requestedFit = state.pdfFit;
    try {
    const page = await doc.getPage(pageNum);
    if (!current()) return false;
    // Базовий масштаб підбираємо так, щоб сторінка ВМІЩАЛАСЬ по ширині екрана.
    // Раніше тут стояло фіксоване 1.5 — на телефоні сторінка виходила значно ширшою
    // за екран, а горизонтальної прокрутки не було, тому правий край був недосяжним.
    const natural = page.getViewport({ scale: 1 });
    const avail = els.container.clientWidth - 2 * (parseFloat(getComputedStyle(els.container).paddingLeft) || 0);
    const fitScale = avail > 0 ? avail / natural.width : 1;
    const pad = parseFloat(getComputedStyle(els.container).paddingTop) || 0;
    const scale = requestedFit === 'page' ? Math.min(1, (els.container.clientHeight - 2*pad) / (natural.height*fitScale)) : requestedScale;
    const vp = page.getViewport({ scale: fitScale * scale });
    const w = document.createElement('div'); w.className = 'pdf-page-wrapper'; w.style.width = `${vp.width}px`; w.style.height = `${vp.height}px`;
    w.dataset.scale = scale;
    const c = document.createElement('canvas'); c.className = 'pdf-canvas';
    // Щільність пікселів екрана (на телефонах зазвичай 2–3). Без цього canvas
    // малювався в CSS-пікселях і потім розтягувався на втричі щільніший екран —
    // саме через це схеми й текст виглядали розмитими.
    const outputScale = Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(8_000_000 / (vp.width * vp.height)), 8192 / Math.max(vp.width, vp.height));
    c.width = Math.floor(vp.width * outputScale);
    c.height = Math.floor(vp.height * outputScale);
    c.style.width = `${vp.width}px`;
    c.style.height = `${vp.height}px`;
    w.appendChild(c);
    const tl = document.createElement('div'); tl.className = 'pdf-text-layer';
    // ОБОВ'ЯЗКОВО: pdfjsLib.TextLayer (PDF.js 6.x) сам виставляє на контейнері лише
    // --min-font-size, а на кожному span — --font-height (і, за потреби, --scale-x/
    // --rotate); решту (--total-scale-factor, --scale-round-*) в офіційному в'юері дає
    // web/pdf_viewer.css, якого ми не підключаємо, тому виставляємо тут самі — інакше
    // calc() у нашому CSS невалідний і весь шар "звалюється" в нульову точку: текст
    // невидимий (і так задумано), але й НЕКЛІКАБЕЛЬНИЙ, бо в кожного span нульовий
    // розмір/позиція. --scale-factor лишаємо для сумісності з рештою коду проєкту.
    tl.style.setProperty('--scale-factor', vp.scale);
    tl.style.setProperty('--total-scale-factor', vp.scale);
    tl.style.setProperty('--scale-round-x', '1px');
    tl.style.setProperty('--scale-round-y', '1px');
    const textContent = await page.getTextContent();
    if (!current()) return false;
    // pdfjsLib.renderTextLayer (стара функція) видалено з PDF.js ще в 4.x — замість неї
    // клас pdfjsLib.TextLayer з .render()/.cancel(). Саме він коректно масштабує кожен
    // фрагмент тексту під реальну ширину гліфів вбудованого шрифту PDF, тому невидимий
    // текст лягає точно поверх намальованого.
    const textLayer = new pdfjsLib.TextLayer({ textContentSource: textContent, container: tl, viewport: vp });
    // Конструктор TextLayer щойно сам викликав setLayerDimensions() і виставив
    // tl.style.width/height через CSS round(down, var(--total-scale-factor)*pageWidth, 1px) —
    // тобто ОКРУГЛЕНО ВНИЗ до цілого CSS-пікселя. canvas і .pdf-page-wrapper лишаються з
    // точним дробовим vp.width/vp.height. Різниця в частку пікселя на 100% зумі виглядає
    // непомітною, але той самий контейнер далі масштабується через transform:scale() при
    // pinch-zoom — і похибка множиться на масштаб (0.47px на zoom×1 → майже 2px на zoom×4),
    // через що текстовий шар "спливає" від намальованої сторінки. Ставити точне значення
    // ДО new TextLayer(...) марно: конструктор все одно перезапише його своїм round(). Тому
    // перезаписуємо ТОЧНИМ vp.width/vp.height (з тим самим свопом при повороті сторінки,
    // що й сам pdf.js застосовує для data-main-rotation) ПІСЛЯ конструктора.
    tl.style.width = `${vp.rotation % 180 === 0 ? vp.width : vp.height}px`;
    tl.style.height = `${vp.rotation % 180 === 0 ? vp.height : vp.width}px`;
    pdfTasks.text = textLayer;
    try { await textLayer.render(); }
    finally { if (pdfTasks.text === textLayer) pdfTasks.text = null; }
    if (!current()) return false;
    w.appendChild(tl);

    // Шар для письма: полотно того самого розміру й щільності поверх сторінки.
    // Додається ОСТАННІМ, тому лежить над текстовим шаром і приймає дотик пера.
    const ink = document.createElement('canvas');
    ink.id = 'ink-layer';
    ink.width = c.width; ink.height = c.height;
    ink.style.width = `${vp.width}px`; ink.style.height = `${vp.height}px`;
    w.appendChild(ink);

    const task = page.render({
        canvasContext: c.getContext('2d'),
        viewport: vp,
        // Малюємо у збільшений (за щільністю екрана) буфер — інакше pdf.js відрендерив би
        // сторінку в лівому верхньому куті canvas'а замість того, щоб заповнити його.
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
    });
    pdfTasks.render = task;
    try { await task.promise; }
    finally { if (pdfTasks.render === task) pdfTasks.render = null; }
    if (!current()) return false;

    // Keep the old transformed page until both new layers are ready. Capture
    // the latest center here, so a pan during rendering also survives the swap.
    const anchor = options.preserve ? pdfAnchor() : null;
    if (anchor && options.focus) { anchor.x = options.focus.x; anchor.y = options.focus.y; }
    state.currentIndex = pageNum; state.pdfScale = scale;
    els.pages.style.transform = 'none'; els.pages.classList.add('no-anim');
    els.pages.style.columnWidth = 'auto'; els.pages.style.columnGap = 'normal';
    els.pages.replaceChildren(w); layoutPdfZoom(1);
    redrawInk(); bindInkCanvas();
    els.container.scrollLeft = 0; els.container.scrollTop = 0;
    restorePdfAnchor(anchor); rememberPdfFocus();
    updatePdfScrubber(); persistPdfZoom();
    els.progress.textContent = `${pageNum} ${t('of')} ${state.totalPages}`;
    updateSourceLang();   // текстовий шар PDF готовий — визначаємо мову сторінки
    refreshReadingStats();
    saveBookmark();
    return true;
    } catch (err) {
        // RenderingCancelledException — скасований canvas-рендер (page.render()); AbortException —
        // скасований текстовий шар (pdfTasks.text?.cancel() у TextLayer, PDF.js 6.x). Обидва — очікуване
        // самоскасування при швидкому гортанні сторінок, а не реальна помилка.
        if (!current() || err.name === 'RenderingCancelledException' || err.name === 'AbortException') return false;
        pdfTasks.render = null; showReaderError(err); return false;
    }
}

const pdfPageRange = document.getElementById('pdf-page-range');
let scrubDragging = false, scrubTimer, scrubPendingPage = null;
function updatePdfScrubber() {
    document.getElementById('pdf-scrubber').classList.toggle('available', state.totalPages > 1);
    pdfPageRange.max = state.totalPages; pdfPageRange.value = state.currentIndex;
    document.getElementById('pdf-page-preview').value = state.currentIndex;
    pdfPageRange.setAttribute('aria-valuetext', `${state.currentIndex} / ${state.totalPages}`);
}
function commitPdfScrub() {
    clearTimeout(scrubTimer);
    const page = Number(pdfPageRange.value);
    if (!document.hidden && state.format === 'pdf' && page !== state.currentIndex && page !== scrubPendingPage) {
        cancelPdfInteraction(); scrubPendingPage = page;
        renderPdfPage(page).finally(() => { if (scrubPendingPage === page) scrubPendingPage = null; });
    }
}
pdfPageRange.addEventListener('pointerdown', e => {
    scrubDragging = true; clearTimeout(scrubTimer); pdfPageRange.setPointerCapture(e.pointerId);
});
pdfPageRange.addEventListener('input', () => {
    document.getElementById('pdf-page-preview').value = pdfPageRange.value;
    pdfPageRange.setAttribute('aria-valuetext', `${pdfPageRange.value} / ${state.totalPages}`);
});
pdfPageRange.addEventListener('pointerup', () => { scrubDragging = false; commitPdfScrub(); });
pdfPageRange.addEventListener('pointercancel', () => { scrubDragging = false; clearTimeout(scrubTimer); updatePdfScrubber(); });
pdfPageRange.addEventListener('change', () => {
    if (!scrubDragging) { clearTimeout(scrubTimer); scrubTimer = setTimeout(commitPdfScrub, 180); }
});
