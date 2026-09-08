/* pdf-zoom-pan.js — керування масштабом/панорамуванням PDF: колесо+Ctrl і pinch
 * (двома пальцями) міняють масштаб відносно точки курсора/центру жесту
 * (pdfAnchor/restorePdfAnchor/layoutPdfZoom/applyPdfZoom/pinchMetrics/
 * paintPdfGesture), ліва кнопка миші панорамує зображення, рендер у повній
 * роздільності повертається лише після зупинки жесту (rerenderPdfAtCurrentZoom).
 * Один потік вказівника (pdfPointers Map) володіє усіма PDF-жестами, включно з
 * оверлеєм кропу; pdfBlockClick притлумлює клік одразу після панорамування/
 * пінчу; #pdf-fit перемикає width/page/free.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/navigation.js. Залежить від js/pdf-render.js (renderPdfPage — forward-
 * виклик лише всередині callback'ів, той самий безпечний механізм, що вже
 * описаний у js/pdf-render.js для pdfAnchor) та js/navigation.js/core.js (state/
 * els/readerEpoch/pdfTasks/writeStored/invalidateSelection/saveBookmark).
 * pdfViewFocus/pdfViewWidth/pdfViewHeight лишаються глобалами тут (не в
 * navigation.js) — саме тут вони й записуються (rememberPdfFocus); resize-
 * обробник у navigation.js лише читає pdfViewFocus як forward-посилання.
 */

// ========== КЕРУВАННЯ PDF МИШЕЮ (тільки десктоп) ==========
// Колесо — масштаб до позиції курсора; ліва кнопка + рух — перетягування зображення.
// Усе обмежене форматом PDF і мишею, тому сенсорна поведінка (pinch, свайпи) не змінюється.
els.mainArea.addEventListener('wheel', (e) => {
    if (e.target.closest('#word-tooltip') || e.target.closest('.side-panel')) return;
    if (state.format !== 'pdf') return;
    // Колесо ПРОКРУЧУЄ сторінку — це головний спосіб рухатись по збільшеному PDF
    // на комп'ютері. Масштаб міняється колесом із затиснутим Ctrl (як у переглядачах
    // документів), щоб одне не заважало іншому.
    if (!e.ctrlKey && !e.metaKey) return;      // звичайне колесо — нативна прокрутка
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const base = pdfBaseScale();
    const target = Math.min(4, Math.max(0.25, base * state.pdfZoom * factor)) / base;
    if (Math.abs(target - state.pdfZoom) < 0.001) return;
    cancelPdfRender();
    applyPdfZoom(target, e.clientX, e.clientY);
    // Після зупинки колеса перемальовуємо сторінку в повній роздільності —
    // сам жест лише розтягує готове зображення.
    clearTimeout(wheelZoomTimer);
    wheelZoomTimer = setTimeout(rerenderPdfAtCurrentZoom, 220);
}, { passive: false });

let wheelZoomTimer, isPanning = false, panMoved = false, panStartX = 0, panStartY = 0, panScrollX = 0, panScrollY = 0;

function rerenderPdfAtCurrentZoom() {
    if (state.format !== 'pdf' || document.hidden) return;
    state.pdfScale = pdfBaseScale() * state.pdfZoom;
    state.pdfFit = 'free';
    persistPdfZoom();
    renderPdfPage(state.currentIndex, { preserve: true });
}

els.mainArea.addEventListener('pointerdown', (e) => {
    if (state.format === 'pdf' && !els.container.contains(e.target)) return;
    if (state.format !== 'pdf' || e.pointerType !== 'mouse' || e.button !== 0) return;
    if (state.inkMode) return;      // у режимі письма перетягування малює, а не рухає сторінку
    // Перетягування і виділення тексту мишею — той самий жест, тому розділяємо їх
    // за режимом: при вимкненому "Вивченні" тягнемо зображення, при увімкненому
    // ліва кнопка, як і раніше, виділяє текст для перекладу.
    if (state.translateMode) return;
    if (e.target.closest('#word-tooltip') || e.target.closest('.side-panel') || e.target.closest('#tts-controls')) return;
    const canPan = els.container.scrollWidth > els.container.clientWidth + 2 ||
                   els.container.scrollHeight > els.container.clientHeight + 2;
    if (!canPan) return;
    e.preventDefault();               // без цього браузер почне виділяти текст
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
    // Прапорець ставимо лише якщо миша справді рухалась: звичайний клік без руху
    // має, як і раніше, перекладати слово під курсором.
    if (panMoved) state.suppressNextClick = true;
    panMoved = false;
});

// One pointer stream owns PDF touch gestures (including the crop overlay).
const pdfPointers = new Map();
let pdfGesture = null, pdfBlockClick = false, pdfFrame = 0, pdfInkSnapshot = null;
let pdfViewFocus = null, pdfViewWidth = 0, pdfViewHeight = 0;
function rememberPdfFocus() {
    pdfViewFocus = pdfAnchor();
    pdfViewWidth = els.container.clientWidth; pdfViewHeight = els.container.clientHeight;
}
els.container.addEventListener('scroll', () => {
    if (state.format !== 'pdf') return;
    // A resize must not overwrite the focus measured in the old orientation.
    if (els.container.clientWidth === pdfViewWidth && els.container.clientHeight === pdfViewHeight) rememberPdfFocus();
    if (els.tooltip.style.display === 'flex') invalidateSelection();
}, { passive: true });
function pdfBaseScale() { return Number(els.pages.querySelector('.pdf-page-wrapper')?.dataset.scale) || state.pdfScale; }
function pdfAnchor(x, y) {
    const w = els.pages.querySelector('.pdf-page-wrapper');
    if (!w) return null;
    const r = w.getBoundingClientRect(), c = els.container.getBoundingClientRect();
    x ??= c.left + els.container.clientWidth / 2;
    y ??= c.top + els.container.clientHeight / 2;
    return { x: (x - r.left) / r.width, y: (y - r.top) / r.height, clientX: x, clientY: y };
}
function restorePdfAnchor(a) {
    if (!a) return;
    const r = els.pages.querySelector('.pdf-page-wrapper')?.getBoundingClientRect();
    if (!r) return;
    els.container.scrollLeft += r.left + a.x * r.width - a.clientX;
    els.container.scrollTop += r.top + a.y * r.height - a.clientY;
}
function layoutPdfZoom(zoom) {
    const w = els.pages.querySelector('.pdf-page-wrapper');
    if (!w) return;
    state.pdfZoom = zoom;
    w.style.transformOrigin = '0 0'; w.style.transform = `scale(${zoom})`;
    els.pages.style.width = `${parseFloat(w.style.width) * zoom}px`;
    els.pages.style.height = `${parseFloat(w.style.height) * zoom}px`;
    els.pages.style.margin = '0 auto';
    els.container.style.overflow = 'auto';
}
function applyPdfZoom(zoom, x, y) {
    const anchor = pdfAnchor(x, y);
    layoutPdfZoom(zoom); restorePdfAnchor(anchor);
}
function persistPdfZoom() {
    writeStored('reader_pdf_scale', state.pdfScale);
    writeStored('reader_pdf_fit', state.pdfFit);
    document.getElementById('pdf-fit').value = state.pdfFit;
}
function setPdfScale(scale) {
    cancelPdfInteraction();
    state.pdfFit = 'free';
    applyPdfZoom(Math.max(.25, Math.min(4, scale)) / pdfBaseScale());
    rerenderPdfAtCurrentZoom();
}
function cancelPdfRender() {
    ++readerEpoch.render;
    pdfTasks.render?.cancel(); pdfTasks.render = null;
    pdfTasks.text?.cancel(); pdfTasks.text = null;
}
function cancelPdfInteraction() {
    clearTimeout(wheelZoomTimer); cancelAnimationFrame(pdfFrame); pdfFrame = 0;
    pdfPointers.clear(); pdfGesture = null; pdfInkSnapshot = null;
    if (inkDrawing) { inkDrawing = false; inkCurrent = null; redrawInk(); saveInk(); }
    els.pages.querySelector('.pdf-page-wrapper')?.style.removeProperty('will-change');
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
    restorePdfAnchor({ ...pdfGesture.anchor, clientX: m.x, clientY: m.y });
}
document.addEventListener('pointerdown', e => {
    if (state.format !== 'pdf' ||
        !(els.container.contains(e.target) || e.target.closest('#region-overlay')) || e.target.closest('#region-cancel')) return;
    if (e.pointerType !== 'touch') { pdfBlockClick = false; return; }
    if (!els.pages.querySelector('.pdf-page-wrapper')) return;
    if (!pdfPointers.size) {
        cancelPdfRender(); clearTimeout(wheelZoomTimer);
        pdfBlockClick = false; state.suppressNextClick = false;
        pdfGesture = { moved: false, multi: false };
        pdfInkSnapshot = state.inkMode ? structuredClone(inkStrokes()) : null;
    }
    pdfPointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });
    if (pdfPointers.size >= 2) {
        const m = pinchMetrics();
        pdfGesture = { ...m, scale: pdfBaseScale() * state.pdfZoom, anchor: pdfAnchor(m.x,m.y), multi: true, moved: true };
        pdfBlockClick = true;
        clearTimeout(touchSelTimer); dragSel = null; state.touchSelecting = false;
        invalidateSelection(); window.getSelection()?.removeAllRanges();
        if (pdfInkSnapshot) { state.ink[inkPageKey()] = pdfInkSnapshot; redrawInk(); saveInk(); }
        inkDrawing = false; inkCurrent = null; regionStart = null; regionBox.style.display = 'none';
        els.pages.querySelector('.pdf-page-wrapper').style.willChange = 'transform';
        e.preventDefault(); e.stopPropagation();
    } else if (!state.inkMode && !document.body.classList.contains('region-mode')) {
        els.container.setPointerCapture(e.pointerId);
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
    if (state.inkMode || document.body.classList.contains('region-mode')) {
        if (pdfGesture?.multi) { e.preventDefault(); e.stopPropagation(); }
        return;
    }
    if (Math.hypot(p.x-p.startX,p.y-p.startY) > 6) pdfGesture.moved = true;
    if (state.touchSelecting) return;
    if (Math.hypot(p.x-p.startX,p.y-p.startY) > 10) {
        pdfGesture.moved = true;
        if (touchSelTimer) { clearTimeout(touchSelTimer); touchSelTimer = null; }
    }
    if (pdfGesture.moved) {
        pdfBlockClick = true; els.container.scrollLeft -= dx; els.container.scrollTop -= dy;
        e.preventDefault(); e.stopPropagation();
    }
}, { capture: true, passive: false });
function endPdfPointer(e) {
    if (!pdfPointers.has(e.pointerId)) return;
    if (pdfFrame) { cancelAnimationFrame(pdfFrame); paintPdfGesture(); }
    const multi = pdfGesture?.multi;
    pdfPointers.delete(e.pointerId);
    if (multi) { e.preventDefault(); e.stopPropagation(); }
    if (!pdfPointers.size) {
        const dirty = Math.abs(state.pdfZoom - 1) > .001;
        cancelPdfInteraction();
        if (e.type === 'pointercancel') pdfBlockClick = true;
        if (dirty && !document.hidden) rerenderPdfAtCurrentZoom();
        saveBookmark();
    } else if (pdfPointers.size >= 2) {
        const m = pinchMetrics();
        pdfGesture = { ...m, scale: pdfBaseScale()*state.pdfZoom, anchor: pdfAnchor(m.x,m.y), multi: true, moved: true };
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
    state.pdfScale = 1; persistPdfZoom(); renderPdfPage(state.currentIndex);
};
