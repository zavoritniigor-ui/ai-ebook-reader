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
// Canonical measurement function for the visible central workspace between side surfaces:
// availableLeft  = max(mainArea.left, visible nav.right, visible askPanel.right)
// availableRight = min(mainArea.right, visible grammarPanel.left)   (Practice overlays this gap; see below)
// availableWidth = max(1, availableRight - availableLeft)
// availableHeight = max(1, mainArea.bottom - mainArea.top)
function getReaderWorkspaceRect() {
    const mainEl = els.mainArea || document.getElementById('main-area');
    const mainRect = mainEl ? mainEl.getBoundingClientRect() : {
        left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight,
        width: window.innerWidth, height: window.innerHeight
    };

    let availableLeft = mainRect.left;
    let availableRight = mainRect.right;
    const availableTop = mainRect.top;
    const availableBottom = mainRect.bottom;

    // 1. Left sidebar (nav#sidebar for thumbnails/contents, or #ask-panel)
    const nav = document.getElementById('sidebar');
    if (nav && !nav.classList.contains('collapsed')) {
        const w = nav.offsetWidth || nav.getBoundingClientRect().width;
        if (w > 0) {
            availableLeft = Math.max(availableLeft, mainRect.left + w);
        }
    }
    const ask = document.getElementById('ask-panel');
    if (ask && ask.classList.contains('expanded')) {
        const w = ask.offsetWidth || ask.getBoundingClientRect().width;
        if (w > 0) {
            availableLeft = Math.max(availableLeft, mainRect.left + w);
        }
    }

    // 2. Right panel (#grammar-panel)
    const grammar = document.getElementById('grammar-panel');
    if (grammar && grammar.classList.contains('expanded')) {
        const w = grammar.offsetWidth || grammar.getBoundingClientRect().width;
        if (w > 0) {
            availableRight = Math.min(availableRight, mainRect.right - w);
        }
    }
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
    const center = els.container.scrollTop + (containerH ?? els.container.clientHeight) / 2;
    let low = 1, high = state.totalPages;
    while (low <= high) {
        const mid = (low + high) >> 1;
        const w = pdfPageWrappers[mid];
        if (!w) break;
        const top = w.offsetTop;
        const bottom = top + w.offsetHeight;
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

function updatePdfRenderWindow(activePage) {
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
    pdfPagesWithActiveRenderTask().forEach(n => { if (!wanted.has(n)) cancelPdfPageRenderTask(n); });
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
        if (pdfRenderedPages.has(n)) { pending.set(n, Promise.resolve(true)); return; }
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
let pdfWorkspaceAnchor = null;
let pdfWorkspaceLayoutFrame = 0;
let lastPdfWorkspaceLeftReserve = null;
let lastPdfWorkspaceRightReserve = null;

function updatePdfWorkspaceLayout(options = {}) {
    if (state.format !== 'pdf' || !els.container) return;
    const immediate = options.immediate || false;

    const applyLayout = () => {
        if (state.format !== 'pdf' || !els.container) return;
        const mainEl = els.mainArea || document.getElementById('main-area');
        const mainRect = mainEl ? mainEl.getBoundingClientRect() : {
            left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight,
            width: window.innerWidth, height: window.innerHeight
        };
        const ws = getReaderWorkspaceRect();
        document.documentElement.style.setProperty('--ws-left', `${Math.round(ws.left)}px`);
        document.documentElement.style.setProperty('--ws-width', `${Math.round(ws.width)}px`);
        const leftReserve = Math.max(0, Math.round(ws.left - mainRect.left));
        const rightReserve = Math.max(0, Math.round(mainRect.right - ws.right));

        const changed = (lastPdfWorkspaceLeftReserve === null) ||
                        (Math.abs(lastPdfWorkspaceLeftReserve - leftReserve) >= 1) ||
                        (Math.abs(lastPdfWorkspaceRightReserve - rightReserve) >= 1);

        if (changed || options.force) {
            lastPdfWorkspaceLeftReserve = leftReserve;
            lastPdfWorkspaceRightReserve = rightReserve;

            const anchor = pdfWorkspaceAnchor || (pdfContinuousReady && typeof pdfAnchor === 'function' ? pdfAnchor() : null);
            pdfWorkspaceAnchor = null;

            if (leftReserve > 0 || rightReserve > 0) {
                els.container.style.marginLeft = `${leftReserve}px`;
                els.container.style.marginRight = `${rightReserve}px`;
                els.container.style.width = `calc(100% - ${leftReserve + rightReserve}px)`;
            } else {
                els.container.style.marginLeft = '';
                els.container.style.marginRight = '';
                els.container.style.width = '';
            }

            // Only trigger immediate continuous stack relayout if not mid-gesture (pinch/zoom)
            // and active tracking is not suppressed. During pinch or scroll, let gesture end or ResizeObserver handle it.
            if (pdfContinuousReady && state.pdfZoom === 1 && !pdfSuppressActiveTracking && typeof relayoutContinuousPdfAtScale === 'function') {
                relayoutContinuousPdfAtScale(anchor);
            }
        } else {
            pdfWorkspaceAnchor = null;
        }
    };

    if (immediate) {
        if (pdfWorkspaceLayoutFrame) {
            cancelAnimationFrame(pdfWorkspaceLayoutFrame);
            pdfWorkspaceLayoutFrame = 0;
        }
        applyLayout();
    } else {
        if (!pdfWorkspaceAnchor && pdfContinuousReady && typeof pdfAnchor === 'function') {
            pdfWorkspaceAnchor = pdfAnchor();
        }
        if (!pdfWorkspaceLayoutFrame) {
            pdfWorkspaceLayoutFrame = requestAnimationFrame(() => {
                pdfWorkspaceLayoutFrame = 0;
                applyLayout();
            });
        }
    }
}

const layoutPdfForPanels = updatePdfWorkspaceLayout;

const pdfPanelObserver = new MutationObserver(() => updatePdfWorkspaceLayout());
['sidebar', 'grammar-panel', 'ask-panel', 'practice-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) pdfPanelObserver.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'data-mode'] });
});

function registerPdfPanel(el) {
    if (!el) return;
    if (typeof pdfPanelObserver !== 'undefined' && pdfPanelObserver) {
        try {
            pdfPanelObserver.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'data-mode'] });
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
        pdfPanelObserver.observe(nav, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    ['sidebar', 'grammar-panel', 'ask-panel', 'practice-panel'].forEach(id => {
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
