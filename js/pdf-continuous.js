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
let pdfWantedPages = new Set();
let pdfContinuousGeneration = 0;
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
let pdfSuppressActiveTracking = false;
let pdfStackBaseWidth = 0, pdfStackBaseHeight = 0; // sum/max at zoom=1 (relative to fit), for live-zoom sizing

async function measurePdfPage(doc, pageNum) {
    const metadata = state.pdfPageMeta;
    const epoch = readerEpoch.book;
    if (doc !== state.pdfDoc || state.format !== 'pdf') return null;
    if (metadata[pageNum]) return metadata[pageNum];
    const page = await doc.getPage(pageNum);
    if (doc !== state.pdfDoc || epoch !== readerEpoch.book || metadata !== state.pdfPageMeta) return null;
    const natural = page.getViewport({ scale: 1 });
    metadata[pageNum] = { width: natural.width, height: natural.height };
    return metadata[pageNum];
}

// ===================== CENTRAL PDF WORKSPACE GEOMETRY =====================
// One shared presentation policy for the side surfaces (nav#sidebar, #ask-panel, #grammar-panel):
// an open surface is DOCKED (the book is laid out beside it) only while the book keeps at least
// READER_MIN_DOCKED_WIDTH px next to every docked surface and the viewport is not a short landscape
// phone; otherwise it is an OVERLAY over a book that keeps its own geometry. The CSS breakpoints
// (full-screen phone panel, 62vw tablet sheet, 500px desktop panel) only decide how a panel LOOKS;
// reserving its width regardless shrank an 800px portrait tablet to 360px and a phone to 0px -- a
// full relayout of every page behind a panel that covers the book anyway. Decided from the remaining
// readable width, not from device names, so a wide split view stays available where it fits.
const READER_MIN_DOCKED_WIDTH = 400;   // a docked panel must leave at least a phone-width book column
const READER_MIN_DOCKED_HEIGHT = 480;  // short landscape phones (e.g. 844x390): overlay, never a split
const READER_SIDE_SURFACES = [
    { id: 'sidebar', side: 'left', open: el => !el.classList.contains('collapsed') },
    { id: 'ask-panel', side: 'left', open: el => el.classList.contains('expanded') },
    { id: 'grammar-panel', side: 'right', open: el => el.classList.contains('expanded') }
];

function readerMainRect() {
    const mainEl = els.mainArea || document.getElementById('main-area');
    return mainEl ? mainEl.getBoundingClientRect() : {
        left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight,
        width: window.innerWidth, height: window.innerHeight
    };
}

// Left/right reserves of the DOCKED surfaces plus every open surface's presentation. With
// includeOverlays the overlays are subtracted too: the part of the book still visible, which is what
// popup placement needs (a popup must not open underneath a panel), as opposed to its layout width.
function readerPanelLayout(mainRect = readerMainRect(), includeOverlays = false) {
    let left = 0, right = 0, visibleLeft = 0, visibleRight = 0;
    const presentation = {};
    const tallEnough = (window.innerHeight || 0) >= READER_MIN_DOCKED_HEIGHT;
    for (const surface of READER_SIDE_SURFACES) {
        const el = document.getElementById(surface.id);
        if (!el || !surface.open(el)) continue;
        const w = el.offsetWidth || el.getBoundingClientRect().width;
        if (!(w > 0)) continue;
        if (surface.side === 'left') visibleLeft = Math.max(visibleLeft, w); else visibleRight = Math.max(visibleRight, w);
        const nextLeft = surface.side === 'left' ? Math.max(left, w) : left;
        const nextRight = surface.side === 'right' ? Math.max(right, w) : right;
        if (tallEnough && mainRect.width - nextLeft - nextRight >= READER_MIN_DOCKED_WIDTH) {
            left = nextLeft; right = nextRight; presentation[surface.id] = 'dock';
        } else {
            presentation[surface.id] = 'overlay';
        }
    }
    return includeOverlays ? { left: visibleLeft, right: visibleRight, presentation } : { left, right, presentation };
}

// Canonical measurement function for the central PDF workspace between the DOCKED side surfaces:
// availableLeft  = mainArea.left + docked left reserve (nav / Ask)
// availableRight = mainArea.right - docked right reserve (Grammar)   (Practice overlays this gap; see below)
// availableWidth = max(1, availableRight - availableLeft)
// availableHeight = max(1, mainArea.bottom - mainArea.top)
// options.visible: subtract overlay panels as well (the uncovered part of the book).
function getReaderWorkspaceRect(options = {}) {
    const mainRect = readerMainRect();
    const reserve = readerPanelLayout(mainRect, !!options.visible);
    const availableLeft = mainRect.left + reserve.left;
    const availableRight = mainRect.right - reserve.right;
    const availableTop = mainRect.top;
    const availableBottom = mainRect.bottom;
    // #practice-panel is deliberately NOT a reserve: layoutPracticeWorkspace (practice-worksheet.js)
    // always lays the expanded worksheet OVER this same central gap (start = max(nav, ask),
    // end = innerWidth - Grammar), never beside it. Clamping to its left edge collapsed the book
    // underneath to ~0px — a full relayout of every page at zero width plus a reading anchor taken
    // from that collapsed stack — and its collapsed/bookmark tab must never reserve width either.

    const availableWidth = Math.max(1, availableRight - availableLeft);
    const availableHeight = Math.max(1, availableBottom - availableTop);

    return {
        left: availableLeft,
        right: availableRight,
        top: availableTop,
        bottom: availableBottom,
        width: availableWidth,
        height: availableHeight
    };
}

function pdfContainerAvailWidth() {
    const pad = parseFloat(getComputedStyle(els.container).paddingLeft) || 0;
    return Math.max(1, els.container.clientWidth - 2 * pad);
}

// Scale for one page: same "fit width / fit page / free zoom" semantics as continuous PDF,
// adapting dynamically to the central workspace width.
function pdfScaleForPage(natural) {
    if (!natural || !natural.width || !natural.height) return 1;
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

function updatePdfProgressText(pageIndex) {
    if (state.format !== 'pdf') return;
    const bookLabel = typeof pdfBookPageLabel === 'function' ? pdfBookPageLabel(pageIndex) : null;
    const hasBookScheme = state.pdfPageLabels || (state.pdfLabelToPhysical && state.pdfLabelToPhysical.size > 0);
    if (bookLabel !== null) {
        els.progress.textContent = `p. ${bookLabel} (${pageIndex}/${state.totalPages})`;
    } else if (hasBookScheme && (state.pdfPageLabels || state.pdfPrintedPageLabels?.[pageIndex] === null)) {
        els.progress.textContent = `— (${pageIndex}/${state.totalPages})`;
    } else {
        els.progress.textContent = `${pageIndex} ${t('of')} ${state.totalPages}`;
    }
}

async function setupContinuousPdf(doc, startPage, bookmark) {
    const generation = ++pdfContinuousGeneration;
    const epoch = readerEpoch.book;
    const isCurrent = () => generation === pdfContinuousGeneration && epoch === readerEpoch.book && state.pdfDoc === doc && state.format === 'pdf';
    pdfContinuousReady = false;
    pdfSuppressActiveTracking = false;
    state.activeSelectionAnchor = null;
    if (typeof invalidatePendingPdfResizeAnchor === 'function') invalidatePendingPdfResizeAnchor();
    clearTimeout(bookmarkSaveTimer);
    pdfPagesWithActiveRenderTask().forEach(cancelPdfPageRenderTask);
    if (pdfPageObserver) { pdfPageObserver.disconnect(); pdfPageObserver = null; }
    pdfPageWrappers = new Array(state.totalPages + 1).fill(null);
    pdfPageTokens = new Array(state.totalPages + 1).fill(0);
    pdfRenderedPages.clear();
    pdfWantedPages.clear();
    pdfVisibleRatios.clear();
    state.pdfPageMeta = new Array(state.totalPages + 1).fill(null);
    if (typeof resetPdfPageLabels === 'function') {
        resetPdfPageLabels();
    } else {
        state.pdfPageLabels = null;
        state.pdfPrintedPageLabels = null;
        state.pdfLabelToPhysical = new Map();
        state.pdfLabelsFullyScanned = false;
    }
    state.currentIndex = startPage; pdfActivePage = startPage;
    updatePdfWorkspaceLayout({ immediate: true, force: true });

    await measurePdfPage(doc, startPage);
    if (!isCurrent()) return;
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
    // #reader-pages is a plain block box — width:auto takes the CONTAINING
    // block's width, not its widest child's, so a restored bookmark that
    // reopens already zoomed past 100% (free fit) would otherwise leave
    // #reader-pages narrower than its own content. See the matching
    // explanation in relayoutContinuousPdfAtScale (pdf-zoom-pan.js).
    els.pages.style.width = `${stackWidth}px`; els.pages.style.margin = '0 auto';
    state.pdfScale = state.pdfScale; // unchanged; kept for clarity at call site
    persistPdfZoom();

    pdfPageObserver = new IntersectionObserver(entries => {
        if (isCurrent()) handlePdfIntersection(entries);
    }, {
        root: els.container, threshold: [0, .1, .25, .5, .75, .9, 1]
    });
    pdfPageWrappers.forEach(w => w && pdfPageObserver.observe(w));

    updatePdfScrubber();
    updatePdfProgressText(startPage);
    pdfContinuousReady = true;

    // Background, best-effort — never blocks first paint.
    loadPdfOutline(doc);
    loadPdfPageLabels(doc);
    setupPdfThumbnailSidebar(doc);

    // Initial scroll BEFORE the observer has settled, so there is no visible
    // jump once it fires. The START page is explicitly AWAITED — callers of
    // initPdf() (including first paint) get a document with real, visible
    // content on screen, not a blank placeholder; its buffer neighbors render
    // concurrently without blocking this.
    navigateToPdfPage(startPage, { instant: true, focus: bookmark?.pdfFocus, skipHistory: true });
    const renders = updatePdfRenderWindow(startPage);
    await renders.get(startPage);
}

function handlePdfIntersection(entries) {
    if (!pdfContinuousReady || state.format !== 'pdf' || pdfSuppressActiveTracking) return;
    entries.forEach(e => {
        const n = Number(e.target.dataset.page);
        if (!n) return;
        pdfVisibleRatios.set(n, e.isIntersecting ? e.intersectionRatio : 0);
    });
    const center = getPdfPageAtViewportCenter();
    let best = center || pdfActivePage, bestRatio = -1;
    pdfVisibleRatios.forEach((ratio, n) => { if (ratio > bestRatio) { bestRatio = ratio; best = n; } });
    if (bestRatio <= 0 || (center && Math.abs(best - center) > 1)) {
        if (center && center !== pdfActivePage) best = center;
        else if (best === pdfActivePage) return;
    } else if (best === pdfActivePage) return;
    if (typeof invalidatePendingPdfResizeAnchor === 'function') invalidatePendingPdfResizeAnchor();
    pdfActivePage = best; state.currentIndex = best;
    updatePdfProgressText(best);
    updatePdfScrubber();
    updatePdfRenderWindow(best);
    syncActiveThumbnail(best);
    scheduleBookmarkSave();
}

function getPdfPageAtViewportCenter(containerH) {
    if (!pdfPageWrappers || pdfPageWrappers.length <= 1) return pdfActivePage;
    const center = els.container.getBoundingClientRect().top + (containerH ?? els.container.clientHeight) / 2;
    return getPdfPageAtClientY(center);
}

// Client geometry includes the live stack transform; offsetTop does not.
function getPdfPageAtClientY(center) {
    let low = 1, high = state.totalPages;
    while (low <= high) {
        const mid = (low + high) >> 1;
        const w = pdfPageWrappers[mid];
        if (!w) break;
        const { top, bottom } = w.getBoundingClientRect();
        if (center < top) {
            high = mid - 1;
        } else if (center > bottom) {
            low = mid + 1;
        } else {
            return mid;
        }
    }
    return Math.max(1, Math.min(state.totalPages, low <= state.totalPages ? low : high));
}

function updatePdfActivePageOnScroll() {
    if (!pdfContinuousReady || state.format !== 'pdf' || pdfSuppressActiveTracking) return;
    const centerPage = getPdfPageAtViewportCenter();
    if (centerPage && centerPage !== pdfActivePage) {
        pdfActivePage = centerPage; state.currentIndex = centerPage;
        updatePdfProgressText(centerPage);
        updatePdfScrubber();
        syncActiveThumbnail(centerPage);
        updatePdfRenderWindow(centerPage);
        scheduleBookmarkSave();
    }
}

let bookmarkSaveTimer = null;
function scheduleBookmarkSave() {
    clearTimeout(bookmarkSaveTimer);
    const epoch = readerEpoch.book;
    const doc = state.pdfDoc;
    bookmarkSaveTimer = setTimeout(() => {
        if (state.format === 'pdf' && readerEpoch.book === epoch && state.pdfDoc === doc) saveBookmark();
    }, 400);
}

function cancelContinuousPdfRenders() {
    // Keep completed pages mounted, but invalidate work still measuring or
    // rendering. A later window update can retry every unfinished page.
    pdfWantedPages.forEach(n => { pdfPageTokens[n]++; });
    pdfWantedPages.clear();
    pdfPagesWithActiveRenderTask().forEach(cancelPdfPageRenderTask);
}

function updatePdfRenderWindow(activePage, rerenderWanted = false) {
    if (!pdfContinuousReady || state.format !== 'pdf' || !state.pdfDoc) return new Map();
    const doc = state.pdfDoc, epoch = readerEpoch.book, generation = pdfContinuousGeneration;
    const lo = Math.max(1, activePage - PDF_RENDER_BUFFER);
    const hi = Math.min(state.totalPages, activePage + PDF_RENDER_BUFFER);
    const wanted = new Set();
    for (let n = lo; n <= hi; n++) wanted.add(n);
    // getPage()/measurement can still be pending before a cancelable PDF.js
    // render task exists. Invalidate those requests when their page leaves.
    pdfWantedPages.forEach(n => { if (!wanted.has(n)) pdfPageTokens[n]++; });
    pdfWantedPages = wanted;

    // Drop pages that fell outside the window: cancel any in-flight render
    // and collapse back to a lightweight placeholder (keeps its measured
    // height, so scroll position never jumps). This also covers pages that
    // are STILL mid-render (not yet in pdfRenderedPages) but no longer
    // wanted — pdfRenderedPages alone only tracks completed ones.
    pdfPagesWithActiveRenderTask().forEach(n => {
        if (!wanted.has(n)) {
            cancelPdfPageRenderTask(n);
            const w = pdfPageWrappers[n];
            if (w && !pdfRenderedPages.has(n) && w.children.length > 0) {
                w.replaceChildren();
                w.classList.add('pdf-placeholder');
                delete w.dataset.rendered;
            }
        }
    });
    pdfRenderedPages.forEach(n => {
        if (wanted.has(n)) return;
        pdfPageTokens[n]++;
        const w = pdfPageWrappers[n];
        if (w) {
            w.replaceChildren();
            w.classList.add('pdf-placeholder');
            delete w.dataset.rendered;
            // Keep the measured CSS dimensions. dataset.scale is only the
            // relative zoom multiplier, so multiplying natural page sizes by
            // it here would lose the fit scale and shift every later page.
        }
        pdfRenderedPages.delete(n);
    });

    const pending = new Map(); // pageNum -> Promise<boolean>, for callers that need to await a specific page
    wanted.forEach(n => {
        if (!rerenderWanted && pdfRenderedPages.has(n)) { pending.set(n, Promise.resolve(true)); return; }
        const w = pdfPageWrappers[n];
        if (!w) return;
        // A still-wanted page can ALSO have a stale in-flight render — e.g.
        // this same function called again (new scale, scroll settle) before
        // the previous call's render for this page finished. Cancel it
        // outright instead of leaving it to run to completion only to be
        // discarded by the token check below: rapid repeated calls would
        // otherwise stack up many full in-flight renders per page.
        cancelPdfPageRenderTask(n);
        const token = ++pdfPageTokens[n];
        const isWanted = () => state.pdfDoc === doc && readerEpoch.book === epoch && pdfContinuousGeneration === generation &&
            pdfPageWrappers[n] === w && pdfWantedPages.has(n) && pdfPageTokens[n] === token && state.format === 'pdf' && !document.hidden;
        const promise = measurePdfPage(doc, n).then(meta => {
            if (!meta || !isWanted()) return false;
            const scale = pdfScaleForPage(meta);
            correctPlaceholderSize(n, meta, scale);
            return renderPdfPageInto(n, w, scale, isWanted).then(ok => {
                if (ok && isWanted()) pdfRenderedPages.add(n);
                return ok && isWanted();
            });
        }).catch(err => {
            if (isWanted()) console.warn('PDF page measurement failed', n, err);
            return false;
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
    if (typeof cancelPdfBookNavigation === 'function') cancelPdfBookNavigation();
    if (typeof invalidatePendingPdfResizeAnchor === 'function') invalidatePendingPdfResizeAnchor();
    pageIndex = Math.max(1, Math.min(state.totalPages, Math.trunc(pageIndex)));
    const w = pdfPageWrappers[pageIndex];
    if (!w) return;
    const doc = state.pdfDoc, epoch = readerEpoch.book, generation = pdfContinuousGeneration;
    const isCurrent = () => state.pdfDoc === doc && readerEpoch.book === epoch && pdfContinuousGeneration === generation &&
        state.format === 'pdf' && pdfPageWrappers[pageIndex] === w;
    invalidateSelection();
    updatePdfRenderWindow(pageIndex); // render target (+neighbors) right away, don't wait for scroll to settle
    let top = w.offsetTop;
    if (Number.isFinite(options.yFraction)) {
        top += options.yFraction * w.offsetHeight;
        top -= els.container.clientHeight * 0.15; // keep a little context above the destination, like Chrome
    }
    top = Math.max(0, top);
    // An INSTANT jump (thumbnail/outline/link/scrubber/initial-open — every
    // caller except goNext/goPrev's single-page smooth step) can land far
    // from where the viewport just was. pdfVisibleRatios is deliberately
    // kept "across callbacks" for cheap incremental updates during normal
    // scrolling, but that means a stale high-ratio entry for a page nowhere
    // near the new position can still be sitting in it — IntersectionObserver
    // only reports a page once ITS OWN intersection actually changes, so a
    // batch delivered shortly after this jump is not guaranteed to already
    // include that stale page's "no longer intersecting" update. Left alone,
    // handlePdfIntersection's next firing could pick that stale entry as
    // "best" and silently override the page we just explicitly navigated to.
    // Suppressing tracking + dropping the stale bookkeeping for one frame
    // gives the browser a chance to deliver a batch reflecting the NEW
    // position before tracking (and the Map) resume from a clean slate.
    if (options.instant) {
        pdfVisibleRatios.clear();
    }
    els.container.scrollTo({ top, left: 0, behavior: options.instant ? 'auto' : 'smooth' });
    pdfActivePage = pageIndex; state.currentIndex = pageIndex;
    updatePdfProgressText(pageIndex);
    updatePdfScrubber();
    syncActiveThumbnail(pageIndex);
    if (options.focus && Number.isFinite(options.focus.x) && Number.isFinite(options.focus.y)) {
        // Restore the fine-grained anchor saved by rememberPdfFocus() (bookmark).
        requestAnimationFrame(() => {
            if (!isCurrent()) return;
            const r = w.getBoundingClientRect();
            const c = els.container.getBoundingClientRect();
            els.container.scrollLeft += r.left + options.focus.x * r.width - c.left - els.container.clientWidth / 2;
            els.container.scrollTop += r.top + options.focus.y * r.height - c.top - els.container.clientHeight / 2;
        });
    }
    if (!options.skipHistory) scheduleBookmarkSave();
}

// ===================== CENTRAL PDF WORKSPACE SIZING & ALIGNMENT =====================
let pdfWorkspaceLayoutFrame = 0;
let lastPdfWorkspaceLeftReserve = null;
let lastPdfWorkspaceRightReserve = null;

function updatePdfWorkspaceLayout(options = {}) {
    if (state.format !== 'pdf' || !els.container) return;
    const immediate = options.immediate || false;

    const applyLayout = () => {
        if (state.format !== 'pdf' || !els.container) return;
        const mainRect = readerMainRect();
        const ws = getReaderWorkspaceRect();
        // Expose the decision (styling hooks, tests); not an observed attribute, so no feedback loop.
        const { presentation } = readerPanelLayout(mainRect);
        READER_SIDE_SURFACES.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (presentation[id]) el.dataset.presentation = presentation[id];
            else delete el.dataset.presentation;
        });
        // Floating reader chrome follows the UNCOVERED book, so an overlay panel does not hide it -- unless the
        // overlay leaves too little (phone full-screen panel). The page pill needs ~320px; the 46px scrubber
        // only needs room for itself, and must never end up underneath an open Grammar panel.
        const visible = getReaderWorkspaceRect({ visible: true });
        const pill = visible.width >= 320 ? visible : ws;
        const rail = visible.width >= 60 ? visible : ws;
        document.documentElement.style.setProperty('--ws-left', `${Math.round(pill.left)}px`);
        document.documentElement.style.setProperty('--ws-width', `${Math.round(pill.width)}px`);
        document.documentElement.style.setProperty('--ws-right', `${Math.max(0, Math.round(mainRect.right - rail.right))}px`);
        const leftReserve = Math.max(0, Math.round(ws.left - mainRect.left));
        const rightReserve = Math.max(0, Math.round(mainRect.right - ws.right));

        const changed = (lastPdfWorkspaceLeftReserve === null) ||
                        (Math.abs(lastPdfWorkspaceLeftReserve - leftReserve) >= 1) ||
                        (Math.abs(lastPdfWorkspaceRightReserve - rightReserve) >= 1);

        if (changed || options.force) {
            lastPdfWorkspaceLeftReserve = leftReserve;
            lastPdfWorkspaceRightReserve = rightReserve;

            if (leftReserve > 0 || rightReserve > 0) {
                els.container.style.marginLeft = `${leftReserve}px`;
                els.container.style.marginRight = `${rightReserve}px`;
                els.container.style.width = `calc(100% - ${leftReserve + rightReserve}px)`;
            } else {
                els.container.style.marginLeft = '';
                els.container.style.marginRight = '';
                els.container.style.width = '';
            }

            // Geometry only. Moving the margins resizes #reader-container, and navigation.js's
            // containerResizeObserver re-lays the continuous stack out ONCE (debounced), with the reading
            // anchor measured at the pre-resize size -- the same split main has always used. Relaying out here
            // as well meant two back-to-back relayouts per panel toggle, each cancelling/restarting the page
            if (typeof repositionTooltip === 'function') repositionTooltip();
        }
    };

    if (immediate) {
        if (pdfWorkspaceLayoutFrame) {
            cancelAnimationFrame(pdfWorkspaceLayoutFrame);
            pdfWorkspaceLayoutFrame = 0;
        }
        applyLayout();
    } else {
        // No layout read here: this runs inside MutationObserver callbacks, and the side panels are fixed
        // overlays, so #reader-container cannot change size before applyLayout() itself moves its margins --
        // applyLayout() takes the reading anchor at exactly that point. (A synchronous pdfAnchor() in the
        // observer callback, on every panel attribute write, crashed CI's software-raster renderer.)
        if (!pdfWorkspaceLayoutFrame) {
            pdfWorkspaceLayoutFrame = requestAnimationFrame(() => {
                pdfWorkspaceLayoutFrame = 0;
                applyLayout();
            });
        }
    }
}

const layoutPdfForPanels = updatePdfWorkspaceLayout;

// Only opening/closing a drawer changes the free workspace: watch class/hidden, not inline style (which
// these panels rewrite constantly while positioning themselves). #practice-panel is not a reserve at all
// (it overlays the book -- see getReaderWorkspaceRect), so it is not observed.
const PDF_PANEL_ATTRIBUTES = { attributes: true, attributeFilter: ['class', 'hidden'] };
const pdfPanelObserver = new MutationObserver(() => updatePdfWorkspaceLayout());
['sidebar', 'grammar-panel', 'ask-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) pdfPanelObserver.observe(el, PDF_PANEL_ATTRIBUTES);
});

function registerPdfPanel(el) {
    if (!el) return;
    if (typeof pdfPanelObserver !== 'undefined' && pdfPanelObserver) {
        try {
            pdfPanelObserver.observe(el, PDF_PANEL_ATTRIBUTES);
        } catch (e) {}
    }
    el.addEventListener('transitionend', (e) => {
        if (e.target === el && (e.propertyName === 'transform' || e.propertyName === 'width' || e.propertyName === 'visibility' || e.propertyName === 'opacity')) {
            updatePdfWorkspaceLayout({ immediate: true, force: true });
        }
    });
}
window.registerPdfPanel = registerPdfPanel;

function initPdfPanelListeners() {
    const nav = document.getElementById('sidebar') || document.querySelector('nav');
    if (nav) {
        pdfPanelObserver.observe(nav, PDF_PANEL_ATTRIBUTES);
    }
    ['sidebar', 'grammar-panel', 'ask-panel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) registerPdfPanel(el);
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPdfPanelListeners);
} else {
    initPdfPanelListeners();
}
window.addEventListener('resize', () => {
    if (state.format === 'pdf') {
        updatePdfWorkspaceLayout();
    }
}, { passive: true });
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        if (state.format === 'pdf') updatePdfWorkspaceLayout();
    }, { passive: true });
}
