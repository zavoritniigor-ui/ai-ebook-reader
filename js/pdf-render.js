/* pdf-render.js — рендер PDF.js: initPdf (відкриття документа, тепер будує
 * безкінечний вертикальний скрол через setupContinuousPdf з js/pdf-continuous.js
 * замість однієї сторінки) і renderPdfPageInto — рендер ОДНІЄЇ конкретної
 * сторінки В ЗАДАНУ обгортку (canvas + текстовий шар + шар посилань + шар
 * письма), придатний для виклику для БУДЬ-ЯКОЇ сторінки, а не лише "поточної" —
 * основа віртуалізації в pdf-continuous.js. Старий скрубер (повзунок сторінок)
 * лишається другорядною навігацією через navigateToPdfPage.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Залежить від core.js
 * (state/els/readerEpoch/pdfTasks/invalidateSelection) та js/pdf-continuous.js
 * (setupContinuousPdf/navigateToPdfPage — forward-виклики лише всередині
 * callback'ів, той самий безпечний механізм, що вже описаний у цьому файлі
 * раніше для pdfAnchor).
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
    // PDF.js 6 moved JPEG2000, JBIG2 and CCITT decoding into separate files.
    // Without this directory the worker resolves failed image resources to null,
    // so page.render() can succeed with a completely white scanned page.
    const loading = pdfjsLib.getDocument({
        data,
        wasmUrl: new URL('vendor/pdfjs-6.3.289/wasm/', document.baseURI).href
    });
    pdfTasks.loading = loading;
    let doc;
    try { doc = await loading.promise; }
    catch (err) { if (pdfTasks.loading === loading) pdfTasks.loading = null; throw err; }
    if (epoch !== readerEpoch.book) { await loading.destroy(); return; }
    state.pdfDoc = doc; state.totalPages = doc.numPages;
    const bm = loadBookmark();
    const startPage = (bm && bm.format === 'pdf' && bm.currentIndex >= 1 && bm.currentIndex <= state.totalPages) ? bm.currentIndex : 1;
    await setupContinuousPdf(doc, startPage, bm);
    if (epoch !== readerEpoch.book) return;
    enterMobileFullScreenIfNeeded();
}

// Renders ONE page into a GIVEN wrapper element — page-agnostic, callable for
// any page number, any number of times concurrently for different pages. This
// is the primitive continuous scroll's virtualization window calls for every
// page that enters the render buffer; it does NOT touch state.currentIndex,
// scroll position, or the bookmark — pdf-continuous.js owns those concerns.
// `isWanted()` lets the caller cancel mid-flight if the page scrolls back out
// of the render window before this finishes (same epoch/cancellation shape as
// the rest of the reader, just parameterized per page instead of per document).
// Lightweight in-flight counter — the old single pdfTasks.render/text flags
// no longer mean "is anything rendering" once multiple pages can render
// concurrently; this replaces that role for callers (tests, "is the reader
// busy" UI) that need to know when the virtualization window has settled.
let pdfInFlightRenders = 0;
async function renderPdfPageInto(pageNum, wrapperEl, scale, isWanted) {
    if (document.hidden || !state.pdfDoc || pageNum < 1 || pageNum > state.totalPages) return false;
    pdfInFlightRenders++;
    try {
        return await renderPdfPageIntoImpl(pageNum, wrapperEl, scale, isWanted);
    } finally {
        pdfInFlightRenders--;
    }
}
// isWanted() alone only stops THIS call from touching the DOM once it's
// already finished a step — it does nothing to stop pdf.js from spending
// real CPU/time finishing a text-layer or canvas rasterization nobody wants
// anymore. Rapid repeated re-render requests for the SAME page (a fast zoom
// drag, or updatePdfRenderWindow being called many times before any one
// settles) would otherwise stack up several full in-flight renders per page
// before any of them naturally resolve — wasted work, and each one briefly
// builds (and only eventually discards) a full canvas+text-layer+link-layer+
// ink-layer DOM subtree. pdfPageActiveTask tracks whichever pdf.js task is
// currently running for a given page so a superseding request can cancel it
// immediately via cancelPdfPageRenderTask() instead of letting it run to
// completion first.
const pdfPageActiveTask = new Map(); // pageNum -> {cancel()}
function cancelPdfPageRenderTask(pageNum) {
    const t = pdfPageActiveTask.get(pageNum);
    if (!t) return;
    pdfPageActiveTask.delete(pageNum);
    t.cancel();
}
function pdfPagesWithActiveRenderTask() { return [...pdfPageActiveTask.keys()]; }
async function renderPdfPageIntoImpl(pageNum, wrapperEl, scale, isWanted) {
    const activeTask = { current: null, cancel() { try { this.current?.cancel(); } catch (e) {} } };
    pdfPageActiveTask.set(pageNum, activeTask);
    try {
        const page = await state.pdfDoc.getPage(pageNum);
        if (!isWanted()) return false;
        const vp = page.getViewport({ scale });
        wrapperEl.style.width = `${vp.width}px`;
        wrapperEl.style.height = `${vp.height}px`;
        // dataset.scale stores the MULTIPLIER (state.pdfScale, relative to
        // fit — e.g. 1 = 100% of fit-width), NOT the absolute combined scale
        // passed to getViewport(). pdfBaseScale() in pdf-zoom-pan.js reads
        // this to compute the next zoom gesture relative to "what's on
        // screen now" — storing the absolute value here double-counts
        // fit-scale on every subsequent zoom settle (compounding runaway).
        wrapperEl.dataset.scale = state.pdfScale;
        wrapperEl.dataset.naturalWidth = page.getViewport({ scale: 1 }).width;
        wrapperEl.dataset.naturalHeight = page.getViewport({ scale: 1 }).height;

        const c = document.createElement('canvas'); c.className = 'pdf-canvas';
        // Щільність пікселів екрана (на телефонах зазвичай 2–3). Без цього canvas
        // малювався в CSS-пікселях і потім розтягувався на втричі щільніший екран —
        // саме через це схеми й текст виглядали розмитими.
        const outputScale = Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(8_000_000 / (vp.width * vp.height)), 8192 / Math.max(vp.width, vp.height));
        c.width = Math.floor(vp.width * outputScale);
        c.height = Math.floor(vp.height * outputScale);
        c.style.width = `${vp.width}px`;
        c.style.height = `${vp.height}px`;

        const tl = document.createElement('div'); tl.className = 'pdf-text-layer';
        // ОБОВ'ЯЗКОВО: pdfjsLib.TextLayer (PDF.js 6.x) сам виставляє на контейнері лише
        // --min-font-size, а на кожному span — --font-height; решту (--total-scale-factor,
        // --scale-round-*) в офіційному в'юері дає web/pdf_viewer.css, якого ми не
        // підключаємо, тому виставляємо тут самі.
        tl.style.setProperty('--scale-factor', vp.scale);
        tl.style.setProperty('--total-scale-factor', vp.scale);
        tl.style.setProperty('--scale-round-x', '1px');
        tl.style.setProperty('--scale-round-y', '1px');

        let textTask = null;
        try {
            const textContent = await page.getTextContent();
            if (!isWanted()) return false;
            const textLayer = new pdfjsLib.TextLayer({ textContentSource: textContent, container: tl, viewport: vp });
            textTask = textLayer; activeTask.current = textLayer;
            try { await textLayer.render(); } finally { if (textTask === textLayer) textTask = null; if (activeTask.current === textLayer) activeTask.current = null; }
            if (!isWanted()) return false;
            tl.style.width = `${vp.rotation % 180 === 0 ? vp.width : vp.height}px`;
            tl.style.height = `${vp.rotation % 180 === 0 ? vp.height : vp.width}px`;
        } catch (err) {
            if (!isWanted()) return false;
            tl.replaceChildren();
            console.warn('PDF text layer unavailable for page', pageNum, err);
        }

        const renderTask = page.render({
            canvasContext: c.getContext('2d'),
            viewport: vp,
            transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
        });
        activeTask.current = renderTask;
        try { await renderTask.promise; } catch (err) {
            if (err.name === 'RenderingCancelledException') return false;
            throw err;
        } finally { if (activeTask.current === renderTask) activeTask.current = null; }
        if (!isWanted()) return false;

        // Native PDF link annotations — clickable overlay from real annotation
        // rects, never a visually-detected link (see js/pdf-outline.js).
        let linkLayer = null;
        try { linkLayer = await buildPdfLinkLayer(page, vp); } catch (e) { /* annotations optional */ }
        if (!isWanted()) return false;

        const ink = document.createElement('canvas');
        ink.className = 'ink-layer'; ink.dataset.page = pageNum;
        ink.width = c.width; ink.height = c.height;
        ink.style.width = `${vp.width}px`; ink.style.height = `${vp.height}px`;

        wrapperEl.replaceChildren(c, tl, ...(linkLayer ? [linkLayer] : []), ink);
        wrapperEl.classList.remove('pdf-placeholder');
        wrapperEl.dataset.rendered = '1';
        redrawInk(ink, pageNum); bindInkCanvas(ink, pageNum);
        return true;
    } catch (err) {
        if (err.name === 'RenderingCancelledException' || err.name === 'AbortException') return false;
        if (!isWanted()) return false;
        console.warn('PDF page render failed', pageNum, err);
        return false;
    } finally {
        if (pdfPageActiveTask.get(pageNum) === activeTask) pdfPageActiveTask.delete(pageNum);
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
        scrubPendingPage = page;
        // Instant, not smooth: a scrubber release can jump 100+ pages away —
        // smoothly animating through every intermediate page would both look
        // wrong and (worse) have the IntersectionObserver keep reporting
        // whatever page the animation is currently passing, overwriting the
        // target for as long as the multi-second scroll is still in transit.
        navigateToPdfPage(page, { instant: true });
        scrubPendingPage = null;
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
