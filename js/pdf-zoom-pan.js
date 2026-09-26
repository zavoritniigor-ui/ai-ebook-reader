/* pdf-zoom-pan.js — керування масштабом/панорамуванням PDF: колесо+Ctrl і pinch
 * (двома пальцями) міняють масштаб відносно точки курсора/центру жесту, ліва
 * кнопка миші панорамує зображення, рендер у повній роздільності повертається
 * лише після зупинки жесту. Один потік вказівника (pdfPointers Map) володіє
 * усіма PDF-жестами, включно з оверлеєм кропу; pdfBlockClick притлумлює клік
 * одразу після панорамування/пінчу; #pdf-fit перемикає width/page/free.
 *
 * Continuous-scroll rewrite: a single page transform:scale() no longer makes
 * sense with many stacked pages — the LIVE gesture now scales #reader-pages
 * (the whole stack) as one GPU-composited unit (with an explicit pixel
 * width/height matching the scaled visual size, so the container's native
 * scroll RANGE stays correct during the gesture — the same trick the old
 * single-page code used, just applied to the stack instead of one wrapper).
 * On settle, the virtualization window re-renders at the committed scale and
 * the explicit size is cleared back to auto (normal layout resumes).
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Залежить від
 * js/pdf-continuous.js (pdfPageWrappers/navigateToPdfPage/updatePdfRenderWindow
 * — forward-виклики лише всередині callback'ів) та js/core.js
 * (state/els/writeStored/invalidateSelection/saveBookmark).
 */

// ========== КЕРУВАННЯ PDF МИШЕЮ (тільки десктоп) ==========
els.mainArea.addEventListener('wheel', (e) => {
    if (e.target.closest('#word-tooltip') || e.target.closest('.side-panel')) return;
    if (state.format !== 'pdf') return;
    // Звичайне колесо тепер НАТИВНО прокручує безкінечний документ (немає
    // жодного JS-обробника, що б це блокував) — масштаб лишається за
    // колесом ІЗ затиснутим Ctrl, як у переглядачах документів.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const base = pdfBaseScale();
    const target = Math.min(4, Math.max(0.25, base * state.pdfZoom * factor)) / base;
    if (Math.abs(target - state.pdfZoom) < 0.001) return;
    applyPdfZoom(target, e.clientX, e.clientY);
    clearTimeout(wheelZoomTimer);
    wheelZoomTimer = setTimeout(rerenderPdfAtCurrentZoom, 220);
}, { passive: false });

let wheelZoomTimer, isPanning = false, panMoved = false, panStartX = 0, panStartY = 0, panScrollX = 0, panScrollY = 0;

function rerenderPdfAtCurrentZoom(anchor) {
    if (state.format !== 'pdf' || document.hidden) return;
    state.pdfScale = pdfBaseScale() * state.pdfZoom;
    state.pdfFit = 'free';
    persistPdfZoom();
    relayoutContinuousPdfAtScale(anchor);
}

els.mainArea.addEventListener('pointerdown', (e) => {
    if (state.format === 'pdf' && !els.container.contains(e.target)) return;
    if (state.format !== 'pdf' || e.pointerType !== 'mouse' || e.button !== 0) return;
    if (state.inkMode) return;
    if (state.translateMode) return;
    if (e.target.closest('#word-tooltip') || e.target.closest('.side-panel') || e.target.closest('#tts-controls') || e.target.closest('.pdf-link-annotation')) return;
    const canPan = els.container.scrollWidth > els.container.clientWidth + 2 ||
                   els.container.scrollHeight > els.container.clientHeight + 2;
    if (!canPan) return;
    e.preventDefault();
    isPanning = true; panMoved = false;
    panStartX = e.clientX; panStartY = e.clientY;
    panScrollX = els.container.scrollLeft; panScrollY = els.container.scrollTop;
    els.container.style.cursor = 'grabbing';
});
window.addEventListener('pointermove', (e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartX, dy = e.clientY - panStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panMoved = true;
    els.container.scrollLeft = panScrollX - dx;
    els.container.scrollTop = panScrollY - dy;
});
window.addEventListener('pointerup', () => {
    if (!isPanning) return;
    isPanning = false;
    els.container.style.cursor = '';
    if (panMoved) state.suppressNextClick = true;
    panMoved = false;
});

// One pointer stream owns PDF touch gestures (including the crop overlay).
const pdfPointers = new Map();
let pdfGesture = null, pdfBlockClick = false, pdfFrame = 0, pdfInkSnapshot = null;
els.container.addEventListener('scroll', () => {
    if (state.format !== 'pdf') return;
    if (typeof invalidatePendingPdfResizeAnchor === 'function') invalidatePendingPdfResizeAnchor();
    if (typeof updatePdfActivePageOnScroll === 'function') updatePdfActivePageOnScroll();
    if (els.tooltip.style.display === 'flex') invalidateSelection();
}, { passive: true });

// Scale currently "baked into" the active page's rendered canvas (what a live
// zoom gesture multiplies from). Falls back to state.pdfScale before any page
// has rendered yet.
function pdfBaseScale() {
    return Number(pdfPageWrappers[pdfActivePage]?.dataset.scale) || state.pdfScale;
}

// Live-gesture anchor: a point within the WHOLE STACK (#reader-pages), used
// only while a pinch/wheel-zoom gesture is in progress (transform:scale on
// the stack as a single unit — see module doc comment above).
function pdfZoomAnchor(x, y) {
    const r = els.pages.getBoundingClientRect();
    x ??= (els.container.getBoundingClientRect().left + els.container.clientWidth / 2);
    y ??= (els.container.getBoundingClientRect().top + els.container.clientHeight / 2);
    return { x: (x - r.left) / r.width, y: (y - r.top) / r.height, clientX: x, clientY: y };
}
function pdfDocumentAnchor(clientX, clientY) {
    const page = getPdfPageAtClientY(clientY), w = pdfPageWrappers[page];
    if (!w) return null;
    const r = w.getBoundingClientRect();
    return { page, x: (clientX-r.left)/r.width, y: (clientY-r.top)/r.height, clientX, clientY };
}
function restorePdfDocumentAnchor(a) {
    const w = a && pdfPageWrappers[a.page];
    if (!w) return;
    const r = w.getBoundingClientRect();
    els.container.scrollLeft += r.left + a.x*r.width - a.clientX;
    els.container.scrollTop += r.top + a.y*r.height - a.clientY;
}
function restorePdfZoomAnchor(a) {
    if (!a) return;
    const r = els.pages.getBoundingClientRect();
    els.container.scrollLeft += r.left + a.x * r.width - a.clientX;
    els.container.scrollTop += r.top + a.y * r.height - a.clientY;
}

// Bookmark-persistence anchor: {page, x, y} relative to the ACTIVE PAGE's own
// wrapper — stable across reopening the book even if viewport size changed,
// unlike a raw scroll pixel offset. Used by saveBookmark()/navigateToPdfPage's
// options.focus (not by the live zoom gesture above).
//
// containerW/containerH: optional override for the "viewport center" this is
// measured against. Every normal caller wants the CURRENT container size —
// but the one caller that doesn't (navigation.js's ResizeObserver) needs the
// container's size from just BEFORE the resize it's reacting to: by the time
// that observer fires, els.container has already been laid out at its NEW
// size (that's what triggered it), while the page wrapper's own explicit
// pixel size is still untouched (old). Reading clientWidth/Height fresh here
// would pair the new container size with the old wrapper size and silently
// mis-capture which point was actually centered on screen.
function pdfAnchor(containerW, containerH) {
    const page = (typeof getPdfPageAtViewportCenter === 'function' && pdfContinuousReady && pdfPageWrappers?.length > 1)
        ? getPdfPageAtViewportCenter(containerH) : pdfActivePage;
    const w = pdfPageWrappers[page];
    if (!w) return null;
    const r = w.getBoundingClientRect(), c = els.container.getBoundingClientRect();
    const cw = containerW ?? els.container.clientWidth, ch = containerH ?? els.container.clientHeight;
    const clientX = c.left + cw / 2, clientY = c.top + ch / 2;
    return { page, x: (clientX - r.left) / Math.max(1, r.width), y: (clientY - r.top) / Math.max(1, r.height) };
}

function layoutPdfZoom(zoom) {
    // A live gesture calls this every frame; keep active-page tracking
    // suppressed for its whole duration (see pdfSuppressActiveTracking's
    // doc comment in pdf-continuous.js) — cleared once by
    // relayoutContinuousPdfAtScale() after the gesture settles.
    pdfSuppressActiveTracking = true;
    state.pdfZoom = zoom;
    els.pages.style.transformOrigin = '0 0';
    els.pages.style.transform = `scale(${zoom})`;
    // Deliberately NOT resizing width/height here. #reader-pages already sits
    // at its committed pdfStackBaseWidth/Height (set by setupContinuousPdf/
    // relayoutContinuousPdfAtScale and left untouched by this function) —
    // Chrome already extends the scroll container's scrollable-overflow
    // region to cover the transformed (post-scale) box on its own, so the
    // transform alone gives the container the correct scrollWidth/Height
    // during a live gesture. Also setting an explicit *zoom pixel size here
    // would inflate this same box's own layout size by zoom and THEN
    // transform-scale that already-inflated box again, compounding to zoom²
    // visually while state.pdfScale only ever commits a single zoom factor —
    // exactly the mismatch that broke the post-gesture anchor restore.
    els.pages.style.margin = '0 auto';
}
function applyPdfZoom(zoom, x, y) {
    const anchor = pdfZoomAnchor(x, y);
    layoutPdfZoom(zoom); restorePdfZoomAnchor(anchor);
}
function persistPdfZoom() {
    writeStored('reader_pdf_scale', state.pdfScale);
    writeStored('reader_pdf_fit', state.pdfFit);
    document.getElementById('pdf-fit').value = state.pdfFit;
}
function setPdfScale(scale) {
    cancelPdfInteraction();
    // Button zoom (A+/A-): take the page-relative reading anchor BEFORE the live transform. Re-reading it
    // afterwards (relayout's default) measured the transformed stack and shifted the view by ~20% of a page
    // per step, eventually onto the previous page.
    const anchor = pdfContinuousReady ? pdfAnchor() : null;
    state.pdfFit = 'free';
    applyPdfZoom(Math.max(.25, Math.min(4, scale)) / pdfBaseScale());
    rerenderPdfAtCurrentZoom(anchor);
}

// After a zoom gesture settles: re-layout every wrapper at the new base
// scale (cheap — style writes, not renders) and re-render just the
// currently-visible window at full resolution, preserving the on-screen
// anchor point. Clears the live transform/explicit size back to normal flow.
//
// explicitAnchor preserves a pre-captured page-local point. Gestures also
// supply clientX/clientY for their focal point; button zoom and resize restore
// to the viewport center. A fresh capture is safe only before layout changes.
// Pinch release (and any other relayout) resizes every page wrapper to the new scale and drops the live stack
// transform, but a page's current render keeps the fixed CSS size it was drawn at until its re-render swaps in.
// Visible pages therefore snapped back to their pre-zoom size inside an enlarged white wrapper -- the "white
// flash" on tablets, where the sharp re-render takes a moment. Stretch that stale render to the wrapper instead
// (the same look as the gesture's last frame); renderPdfPageIntoImpl replaces these elements when it is ready.
function stretchStalePdfPageContent(w, width, height) {
    const canvas = w.querySelector(':scope > canvas.pdf-canvas');
    if (!canvas) return;
    if (!canvas.dataset.drawnWidth) {
        canvas.dataset.drawnWidth = parseFloat(canvas.style.width) || canvas.getBoundingClientRect().width;
        canvas.dataset.drawnHeight = parseFloat(canvas.style.height) || canvas.getBoundingClientRect().height;
    }
    const drawnW = parseFloat(canvas.dataset.drawnWidth);
    if (!drawnW) return;
    const k = width / drawnW;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    for (const layer of w.querySelectorAll(':scope > .pdf-text-layer, :scope > .pdf-link-layer, :scope > .ink-layer')) {
        layer.style.transformOrigin = '0 0';
        layer.style.transform = Math.abs(k - 1) < 1e-4 ? '' : `scale(${k})`;
    }
}

function relayoutContinuousPdfAtScale(explicitAnchor) {
    if (!pdfContinuousReady) return;
    if (typeof invalidatePendingPdfResizeAnchor === 'function') invalidatePendingPdfResizeAnchor();
    const anchor = explicitAnchor && pdfPageWrappers[explicitAnchor.page] ? explicitAnchor : pdfAnchor();
    pdfSuppressActiveTracking = true;
    let stackHeight = 0, stackWidth = 0;
    for (let n = 1; n <= state.totalPages; n++) {
        const w = pdfPageWrappers[n];
        if (!w) continue;
        const meta = state.pdfPageMeta[n] || state.pdfPageMeta[pdfActivePage] || { width: 612, height: 792 };
        const scale = pdfScaleForPage(meta);
        w.style.width = `${meta.width * scale}px`;
        w.style.height = `${meta.height * scale}px`;
        w.dataset.scale = state.pdfScale; // multiplier, not the absolute scale — see pdf-render.js
        if (w.dataset.rendered) stretchStalePdfPageContent(w, meta.width * scale, meta.height * scale);
        stackHeight += meta.height * scale + 20;
        stackWidth = Math.max(stackWidth, meta.width * scale);
    }
    pdfStackBaseWidth = stackWidth; pdfStackBaseHeight = stackHeight;
    els.pages.style.transform = 'none';
    // #reader-pages is a plain block box: width:auto takes the CONTAINING
    // block's width, not its children's — it does NOT grow to fit a page
    // wrapper wider than the container (e.g. any zoom over 100% in free-fit
    // mode). Clearing width here (as the live-gesture path's own explicit
    // width does) would silently narrow #reader-pages back to container
    // width, corrupting anchor math (pdfZoomAnchor reads its rect) and the
    // horizontal scroll range alike. Keep it explicit, matching actual
    // content width, the same way the live transform already did.
    els.pages.style.width = `${stackWidth}px`; els.pages.style.height = ''; els.pages.style.margin = '0 auto';
    // The new render IS already at the committed absolute scale — no extra
    // transform multiplier needed on top (mirrors the old single-page
    // renderer's layoutPdfZoom(1) reset after swapping in a freshly-rendered
    // page). Leaving this at its gesture-end value would double-apply zoom
    // the next time a live gesture reads state.pdfZoom as its starting point.
    state.pdfZoom = 1;
    // Force the active window's canvases to re-render at the new scale even
    // though the page NUMBERS in the window haven't changed.
    pdfVisibleRatios.clear();
    // Restore the EXACT pixel the anchor pointed at — not a "jump to this
    // page" navigation. navigateToPdfPage()'s yFraction option deliberately
    // subtracts a 15% context margin (right for a thumbnail/outline/link
    // jump, which should show a little of what's above the destination);
    // a zoom settle instead must put back precisely what the live gesture
    // was already showing under the cursor, or the page visibly hops by
    // that same margin the instant the gesture ends. Same math as the old
    // single-page restorePdfAnchor(), generalized to the page's offset
    // within the whole continuous stack.
    if (anchor) {
        const w = pdfPageWrappers[anchor.page];
        if (w) {
            // Delta-adjust off the wrapper's live getBoundingClientRect (like
            // restorePdfZoomAnchor above), not offsetTop/offsetLeft — those
            // are measured relative to w's offsetParent's padding edge, which
            // does not line up 1:1 with #reader-container's scrollLeft/Top
            // coordinate space whenever the container (or an ancestor in the
            // offsetParent chain) has its own padding, and silently mis-
            // restores the anchor by that padding amount.
            const c = els.container.getBoundingClientRect();
            const targetX = anchor.clientX ?? c.left + els.container.clientWidth / 2;
            const targetY = anchor.clientY ?? c.top + els.container.clientHeight / 2;
            const r = w.getBoundingClientRect();
            els.container.scrollLeft += r.left + anchor.x * r.width - targetX;
            els.container.scrollTop += r.top + anchor.y * r.height - targetY;
            pdfActivePage = anchor.page; state.currentIndex = anchor.page;
            updatePdfScrubber();
            syncActiveThumbnail(anchor.page);
        }
    }
    pdfSuppressActiveTracking = false;
    updatePdfActivePageOnScroll();
    updatePdfRenderWindow(pdfActivePage, true);
    // navigateToPdfPage() (used elsewhere) already schedules a debounced
    // bookmark save — mirror that here rather than an immediate save, which
    // was redundant and could fire scheduleReaderOnboarding() (saveBookmark's
    // own side effect) at an unpredictable moment relative to whatever the
    // reader is doing right after a resize/zoom settles.
    scheduleBookmarkSave();
}

function cancelPdfRender() {
    cancelContinuousPdfRenders();
}
function cancelPdfInteraction(keepTrackingSuppressed = false) {
    clearTimeout(wheelZoomTimer); cancelAnimationFrame(pdfFrame); pdfFrame = 0;
    pdfPointers.clear(); pdfGesture = null; pdfInkSnapshot = null;
    if (inkDrawing) { inkDrawing = false; inkCurrent = null; redrawInk(activeInkCanvas(), activeInkPage()); saveInk(); }
    els.pages.style.removeProperty('will-change');
    // Safety net: every gesture-end path reaches here, including the "zoom
    // ended back at 1x" case where relayoutContinuousPdfAtScale() (the other
    // place this clears) is deliberately skipped — without this, that path
    // would leave active-page tracking suppressed forever.
    pdfSuppressActiveTracking = keepTrackingSuppressed;
    if (typeof updatePdfActivePageOnScroll === 'function') updatePdfActivePageOnScroll();
}
function pinchMetrics() {
    const [a,b] = [...pdfPointers.values()];
    return { x: (a.x+b.x)/2, y: (a.y+b.y)/2, distance: Math.max(1, Math.hypot(a.x-b.x,a.y-b.y)) };
}
function paintPdfGesture() {
    pdfFrame = 0;
    if (!pdfGesture || pdfPointers.size < 2) return;
    const m = pinchMetrics();
    const scale = Math.max(.25, Math.min(4, pdfGesture.scale * m.distance / pdfGesture.distance));
    layoutPdfZoom(scale / pdfBaseScale());
    restorePdfDocumentAnchor({ ...pdfGesture.anchor, clientX: m.x, clientY: m.y });
    pdfGesture.clientX = m.x; pdfGesture.clientY = m.y;
}
document.addEventListener('pointerdown', e => {
    if (state.format !== 'pdf' ||
        !(els.container.contains(e.target) || e.target.closest('#region-overlay')) || e.target.closest('#region-cancel')) return;
    if (e.pointerType !== 'touch') { pdfBlockClick = false; return; }
    if (!pdfContinuousReady) return;
    if (!pdfPointers.size) {
        clearTimeout(wheelZoomTimer);
        pdfBlockClick = false; state.suppressNextClick = false;
        pdfGesture = { moved: false, multi: false };
        pdfInkSnapshot = state.inkMode ? structuredClone(inkStrokes(activeInkPage())) : null;
    }
    pdfPointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });
    if (pdfPointers.size >= 2) {
        const m = pinchMetrics();
        pdfGesture = { ...m, scale: pdfBaseScale() * state.pdfZoom, anchor: pdfDocumentAnchor(m.x,m.y), multi: true, moved: true };
        pdfBlockClick = true;
        clearTimeout(touchSelTimer); dragSel = null; state.touchSelecting = false;
        invalidateSelection(); window.getSelection()?.removeAllRanges();
        if (pdfInkSnapshot) { state.ink[inkPageKey(activeInkPage())] = pdfInkSnapshot; redrawInk(activeInkCanvas(), activeInkPage()); saveInk(); }
        inkDrawing = false; inkCurrent = null; regionStart = null; regionBox.style.display = 'none';
        els.pages.style.willChange = 'transform';
        e.preventDefault(); e.stopPropagation();
    }
}, true);
document.addEventListener('pointermove', e => {
    const p = pdfPointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pdfPointers.size >= 2) {
        if (!pdfFrame) pdfFrame = requestAnimationFrame(paintPdfGesture);
        e.preventDefault(); e.stopPropagation(); return;
    }
    // Native scrolling cannot resume within a gesture after our pinch handler
    // took ownership. Keep the remaining finger panning until it lifts.
    if (pdfGesture?.multi) {
        els.container.scrollLeft -= dx;
        els.container.scrollTop -= dy;
        pdfBlockClick = true;
        e.preventDefault(); e.stopPropagation();
        return;
    }
    // Fresh single-finger gestures use native scrolling in both axes. Ink and
    // crop layers retain their own touch-action:none and drawing handlers.

}, { capture: true, passive: false });
function endPdfPointer(e) {
    if (!pdfPointers.has(e.pointerId)) return;
    if (pdfFrame) { cancelAnimationFrame(pdfFrame); paintPdfGesture(); }
    const multi = pdfGesture?.multi;
    pdfPointers.delete(e.pointerId);
    if (multi) { e.preventDefault(); e.stopPropagation(); }
    if (!pdfPointers.size) {
        const dirty = Math.abs(state.pdfZoom - 1) > .001;
        // Capture before releasing tracking or clearing the transformed stack.
        // Re-read the local point to include panning by the remaining finger.
        const anchor = multi ? pdfDocumentAnchor(pdfGesture.clientX ?? pdfGesture.x, pdfGesture.clientY ?? pdfGesture.y) : pdfAnchor();
        cancelPdfInteraction(dirty);
        if (e.type === 'pointercancel') pdfBlockClick = true;
        if (dirty && !document.hidden) rerenderPdfAtCurrentZoom(anchor);
        saveBookmark();
    } else if (pdfPointers.size >= 2) {
        const m = pinchMetrics();
        pdfGesture = { ...m, scale: pdfBaseScale()*state.pdfZoom, anchor: pdfDocumentAnchor(m.x,m.y), multi: true, moved: true };
    }
}
document.addEventListener('pointerup', endPdfPointer, true);
document.addEventListener('pointercancel', endPdfPointer, true);
els.mainArea.addEventListener('click', e => {
    if (state.format === 'pdf' && pdfBlockClick && els.container.contains(e.target)) {
        e.preventDefault(); e.stopImmediatePropagation();
    }
}, true);
document.getElementById('pdf-fit').onchange = e => {
    cancelPdfInteraction();
    state.pdfFit = e.target.value;
    if (state.pdfFit === 'free') return;
    state.pdfScale = 1; persistPdfZoom(); relayoutContinuousPdfAtScale();
};
