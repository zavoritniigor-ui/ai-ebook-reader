/* pdf-continuous.js — continuous vertical PDF scrolling: builds one placeholder
 * wrapper per page up front (correct scroll height from the start, even for a
 * 657-page book), virtualizes actual rendering to a small window around the
 * active page (IntersectionObserver-driven), and exposes the ONE canonical
 * navigation entry point every other source (thumbnails, outline, PDF
 * internal links, page-number entry, Prev/Next) calls through:
 * navigateToPdfPage(pageIndex, options).
 *
 * Classic <script src>, not an ES module — see js/core.js. Loaded right before
 * js/pdf-render.js, which calls setupContinuousPdf() from initPdf() and
 * renderPdfPageInto() from updatePdfRenderWindow() below (forward-calls inside
 * callbacks only — the same safe pattern documented in js/pdf-render.js).
 */

const PDF_RENDER_BUFFER = 2; // pages beyond the viewport kept rendered at full res
let pdfPageWrappers = [];    // 1-indexed: pdfPageWrappers[pageNum] -> wrapper element
let pdfPageTokens = [];      // 1-indexed: bumped to invalidate an in-flight render
let pdfRenderedPages = new Set();
let pdfPageObserver = null;
let pdfVisibleRatios = new Map(); // pageNum -> intersectionRatio, maintained across callbacks
let pdfActivePage = 1;
let pdfContinuousReady = false;
// While a live pinch/wheel-zoom gesture is in progress, #reader-pages' width/
// height changes every animation frame (see layoutPdfZoom in pdf-zoom-pan.js)
// — that alone retriggers IntersectionObserver callbacks continuously (any
// geometry change of a watched target fires it, independent of scrolling),
// which would otherwise start real page renders mid-gesture and defeat the
// "live transform only, real render after settling" design. Set by
// pdf-zoom-pan.js around each gesture.
let pdfSuppressActiveTracking = false;
let pdfStackBaseWidth = 0, pdfStackBaseHeight = 0; // sum/max at zoom=1 (relative to fit), for live-zoom sizing

async function measurePdfPage(doc, pageNum) {
    if (state.pdfPageMeta[pageNum]) return state.pdfPageMeta[pageNum];
    const page = await doc.getPage(pageNum);
    const natural = page.getViewport({ scale: 1 });
    state.pdfPageMeta[pageNum] = { width: natural.width, height: natural.height };
    return state.pdfPageMeta[pageNum];
}

function pdfContainerAvailWidth() {
    const pad = parseFloat(getComputedStyle(els.container).paddingLeft) || 0;
    return Math.max(1, els.container.clientWidth - 2 * pad);
}

// Scale for one page: same "fit width / fit page / free zoom" semantics as the
// old single-page renderer, generalized so each page can (rarely) differ in
// natural size — a uniform book computes the same scale for every page.
function pdfScaleForPage(natural) {
    const avail = pdfContainerAvailWidth();
    const fitScale = avail > 0 && natural.width > 0 ? avail / natural.width : 1;
    if (state.pdfFit === 'page') {
        const pad = parseFloat(getComputedStyle(els.container).paddingTop) || 0;
        return Math.min(1, (els.container.clientHeight - 2 * pad) / (natural.height * fitScale)) * fitScale;
    }
    return fitScale * state.pdfScale;
}

function pdfWrapperEstimate(doc) {
    // Reference size for placeholders not yet individually measured — the
    // start page's own size, corrected the moment each page is first
    // actually rendered (see updatePdfRenderWindow). Correct for the very
    // common uniform-page-size case with zero correction ever needed.
    return state.pdfPageMeta[state.currentIndex] || state.pdfPageMeta[1] || { width: 612, height: 792 };
}

async function setupContinuousPdf(doc, startPage, bookmark) {
    pdfContinuousReady = false;
    if (pdfPageObserver) { pdfPageObserver.disconnect(); pdfPageObserver = null; }
    pdfPageWrappers = new Array(state.totalPages + 1).fill(null);
    pdfPageTokens = new Array(state.totalPages + 1).fill(0);
    pdfRenderedPages.clear();
    pdfVisibleRatios.clear();
    state.pdfPageMeta = new Array(state.totalPages + 1).fill(null);
    state.currentIndex = startPage; pdfActivePage = startPage;

    await measurePdfPage(doc, startPage);
    const estimate = pdfWrapperEstimate(doc);
    const scale = pdfScaleForPage(estimate);

    els.pages.replaceChildren();
    els.pages.classList.add('no-anim');
    els.pages.style.transform = 'none'; els.pages.style.width = ''; els.pages.style.height = '';
    els.pages.style.columnWidth = 'auto'; els.pages.style.columnGap = 'normal';
    const frag = document.createDocumentFragment();
    let stackHeight = 0, stackWidth = 0;
    for (let n = 1; n <= state.totalPages; n++) {
        const meta = state.pdfPageMeta[n] || estimate;
        const w = document.createElement('div');
        w.className = 'pdf-page-wrapper pdf-placeholder';
        w.dataset.page = n;
        w.style.width = `${meta.width * scale}px`;
        w.style.height = `${meta.height * scale}px`;
        w.dataset.scale = state.pdfScale; // multiplier, not the absolute scale — see pdf-render.js
        pdfPageWrappers[n] = w;
        frag.appendChild(w);
        stackHeight += meta.height * scale + 20; // 20px = .pdf-page-wrapper margin-bottom
        stackWidth = Math.max(stackWidth, meta.width * scale);
    }
    els.pages.appendChild(frag);
    pdfStackBaseWidth = stackWidth; pdfStackBaseHeight = stackHeight;
    state.pdfScale = state.pdfScale; // unchanged; kept for clarity at call site
    persistPdfZoom();

    pdfPageObserver = new IntersectionObserver(handlePdfIntersection, {
        root: els.container, threshold: [0, .1, .25, .5, .75, .9, 1]
    });
    pdfPageWrappers.forEach(w => w && pdfPageObserver.observe(w));

    updatePdfScrubber();
    els.progress.textContent = `${startPage} ${t('of')} ${state.totalPages}`;
    pdfContinuousReady = true;

    // Initial scroll BEFORE the observer has settled, so there is no visible
    // jump once it fires. The START page is explicitly AWAITED — callers of
    // initPdf() (including first paint) get a document with real, visible
    // content on screen, not a blank placeholder; its buffer neighbors render
    // concurrently without blocking this.
    navigateToPdfPage(startPage, { instant: true, focus: bookmark?.pdfFocus, skipHistory: true });
    const renders = updatePdfRenderWindow(startPage);
    await renders.get(startPage);

    // Background, best-effort — never blocks first paint.
    loadPdfOutline(doc);
    loadPdfPageLabels(doc);
    setupPdfThumbnailSidebar(doc);
}

function handlePdfIntersection(entries) {
    if (pdfSuppressActiveTracking) return;
    entries.forEach(e => {
        const n = Number(e.target.dataset.page);
        if (!n) return;
        pdfVisibleRatios.set(n, e.isIntersecting ? e.intersectionRatio : 0);
    });
    let best = pdfActivePage, bestRatio = -1;
    pdfVisibleRatios.forEach((ratio, n) => { if (ratio > bestRatio) { bestRatio = ratio; best = n; } });
    if (bestRatio <= 0 || best === pdfActivePage) return;
    pdfActivePage = best; state.currentIndex = best;
    els.progress.textContent = `${best} ${t('of')} ${state.totalPages}`;
    updatePdfScrubber();
    updatePdfRenderWindow(best);
    syncActiveThumbnail(best);
    scheduleBookmarkSave();
}

let bookmarkSaveTimer = null;
function scheduleBookmarkSave() {
    clearTimeout(bookmarkSaveTimer);
    bookmarkSaveTimer = setTimeout(() => { if (state.format === 'pdf') saveBookmark(); }, 400);
}

function updatePdfRenderWindow(activePage) {
    if (!state.pdfDoc) return;
    const lo = Math.max(1, activePage - PDF_RENDER_BUFFER);
    const hi = Math.min(state.totalPages, activePage + PDF_RENDER_BUFFER);
    const wanted = new Set();
    for (let n = lo; n <= hi; n++) wanted.add(n);

    // Drop pages that fell outside the window: cancel any in-flight render
    // and collapse back to a lightweight placeholder (keeps its measured
    // height, so scroll position never jumps).
    pdfRenderedPages.forEach(n => {
        if (wanted.has(n)) return;
        pdfPageTokens[n]++;
        const w = pdfPageWrappers[n];
        if (w) {
            const meta = state.pdfPageMeta[n];
            w.replaceChildren();
            w.classList.add('pdf-placeholder');
            delete w.dataset.rendered;
            if (meta) { w.style.width = `${meta.width * (Number(w.dataset.scale) || 1)}px`; w.style.height = `${meta.height * (Number(w.dataset.scale) || 1)}px`; }
        }
        pdfRenderedPages.delete(n);
    });

    const pending = new Map(); // pageNum -> Promise<boolean>, for callers that need to await a specific page
    wanted.forEach(n => {
        if (pdfRenderedPages.has(n)) { pending.set(n, Promise.resolve(true)); return; }
        const w = pdfPageWrappers[n];
        if (!w) return;
        const token = ++pdfPageTokens[n];
        const isWanted = () => pdfPageTokens[n] === token && state.format === 'pdf' && !document.hidden;
        const promise = measurePdfPage(state.pdfDoc, n).then(meta => {
            if (!isWanted()) return false;
            const scale = pdfScaleForPage(meta);
            correctPlaceholderSize(n, meta, scale);
            return renderPdfPageInto(n, w, scale, isWanted).then(ok => { if (ok) pdfRenderedPages.add(n); return ok; });
        });
        pending.set(n, promise);
    });
    return pending;
}

// A placeholder was sized from an estimate (start page's dimensions); once a
// page's REAL size is known, correct it. If the page is ABOVE the viewport,
// compensate scrollTop by the delta so nothing visually jumps.
function correctPlaceholderSize(pageNum, meta, scale) {
    const w = pdfPageWrappers[pageNum];
    if (!w) return;
    const newH = meta.height * scale, newW = meta.width * scale;
    const oldH = parseFloat(w.style.height) || newH;
    if (Math.abs(newH - oldH) < 1 && Math.abs((parseFloat(w.style.width) || newW) - newW) < 1) return;
    const delta = newH - oldH;
    const aboveViewport = w.offsetTop + w.offsetHeight <= els.container.scrollTop;
    w.style.width = `${newW}px`; w.style.height = `${newH}px`; w.dataset.scale = state.pdfScale;
    if (aboveViewport && delta !== 0) els.container.scrollTop += delta;
}

// ===================== CANONICAL NAVIGATION API =====================
// Every navigation source (thumbnail click, outline click, PDF internal link,
// page-number entry, Prev/Next, scrubber) calls this — never scroll/render
// directly, so there is exactly one page-navigation code path.
function navigateToPdfPage(pageIndex, options = {}) {
    if (!pdfContinuousReady || state.format !== 'pdf') return;
    pageIndex = Math.max(1, Math.min(state.totalPages, Math.trunc(pageIndex)));
    const w = pdfPageWrappers[pageIndex];
    if (!w) return;
    invalidateSelection();
    updatePdfRenderWindow(pageIndex); // render target (+neighbors) right away, don't wait for scroll to settle
    let top = w.offsetTop;
    if (Number.isFinite(options.yFraction)) {
        top += options.yFraction * w.offsetHeight;
        top -= els.container.clientHeight * 0.15; // keep a little context above the destination, like Chrome
    }
    top = Math.max(0, top);
    els.container.scrollTo({ top, left: 0, behavior: options.instant ? 'auto' : 'smooth' });
    pdfActivePage = pageIndex; state.currentIndex = pageIndex;
    els.progress.textContent = `${pageIndex} ${t('of')} ${state.totalPages}`;
    updatePdfScrubber();
    syncActiveThumbnail(pageIndex);
    if (options.focus && Number.isFinite(options.focus.x) && Number.isFinite(options.focus.y)) {
        // Restore the fine-grained anchor saved by rememberPdfFocus() (bookmark).
        requestAnimationFrame(() => {
            const r = w.getBoundingClientRect();
            els.container.scrollTop += r.top + options.focus.y * r.height - els.container.getBoundingClientRect().top - els.container.clientHeight / 2;
        });
    }
    if (!options.skipHistory) scheduleBookmarkSave();
}

// ===================== SIDE PANEL GEOMETRY =====================
// #reader-container does not shrink on its own when Grammar/Ask/nav open —
// they are position:fixed/absolute overlays (see layoutPracticeWorkspace in
// practice-worksheet.js for the same problem solved the same way for the
// Practice panel), not flex siblings #main-area reflows around. Left
// unhandled, PDF pages would render at full width and sit UNDERNEATH those
// panels rather than beside them. Mirrors layoutPracticeWorkspace's exact
// width math (nav/ask reserve space on the left, Grammar on the right) so
// all three side surfaces agree on what counts as "available".
function layoutPdfForPanels() {
    if (state.format !== 'pdf') return;
    const grammar = document.getElementById('grammar-panel');
    const ask = document.getElementById('ask-panel');
    const nav = document.querySelector('nav');
    const grammarWidth = grammar?.classList.contains('expanded') ? grammar.offsetWidth : 0;
    const askWidth = ask?.classList.contains('expanded') ? ask.offsetWidth : 0;
    const navWidth = nav && !nav.classList.contains('collapsed') ? nav.offsetWidth : 0;
    const leftReserve = Math.max(askWidth, navWidth);
    const rightReserve = grammarWidth;
    if (leftReserve || rightReserve) {
        els.container.style.marginLeft = `${leftReserve}px`;
        els.container.style.marginRight = `${rightReserve}px`;
        els.container.style.width = `calc(100% - ${leftReserve + rightReserve}px)`;
    } else {
        els.container.style.marginLeft = '';
        els.container.style.marginRight = '';
        els.container.style.width = '';
    }
    // #reader-container's own size just changed — the existing
    // containerResizeObserver (navigation.js) picks this up and calls
    // relayoutContinuousPdfAtScale() to re-fit pages at the new width; no
    // separate re-render trigger needed here.
}
const pdfPanelObserver = new MutationObserver(() => layoutPdfForPanels());
['grammar-panel', 'ask-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) pdfPanelObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
});
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('nav');
    if (nav) pdfPanelObserver.observe(nav, { attributes: true, attributeFilter: ['class'] });
});
if (document.querySelector('nav')) pdfPanelObserver.observe(document.querySelector('nav'), { attributes: true, attributeFilter: ['class'] });
