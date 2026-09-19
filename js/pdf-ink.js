/* pdf-ink.js — письмо поверх сторінки PDF: canvas-шар ПЕР сторінка (клас
 * .ink-layer + data-page, а не єдиний #ink-layer — continuous-scroll рендерить
 * кілька сторінок одночасно), штрихи у ВІДНОСНИХ координатах (0..1, не в
 * пікселях), збереження/завантаження (saveInk/loadInk через state.ink, ключ —
 * inkPageKey(pageNum)), перемальовування (redrawInk(canvas, pageNum)),
 * малювання пером/пальцем/мишею (bindInkCanvas(canvas, pageNum)/inkPoint),
 * гумка (inkEraseAt), товщина/колір (updateInkWidth/updateInkTools) і кнопки
 * інструментів (перо/гумка/колір/undo/очистити/готово) — усі діють на
 * "активну" сторінку письма (activeInkPage), тобто ту, на якій востаннє
 * почався штрих.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/ai-client.js. inkDrawing/inkCurrent — власний глобальний стан цього
 * файлу (не спільний з іншими модулями попри те, що js/pdf-zoom-pan.js читає
 * їх усередині cancelPdfInteraction/touch-жестів — лише forward-посилання
 * всередині callback'ів, той самий безпечний механізм, що вже описаний для
 * pdfAnchor).
 */

// ========== ПИСЬМО ПОВЕРХ СТОРІНКИ (per-page canvases) ==========
// Штрихи зберігаються у ВІДНОСНИХ координатах (0..1, не в пікселях): сторінку
// можна масштабувати й перевідкривати — написане лишається на своєму місці й
// не розмивається, бо перемальовується заново у поточній роздільності.
let inkActivePage = 0; // last page a stroke was drawn/erased on — toolbar (undo/clear/done) targets this
function activeInkPage() { return inkActivePage || state.currentIndex; }
function activeInkCanvas() {
    const w = typeof pdfPageWrappers !== 'undefined' ? pdfPageWrappers[activeInkPage()] : null;
    return w ? w.querySelector('.ink-layer') : null;
}
function inkPageKey(pageNum) { return String(pageNum ?? activeInkPage()); }
function inkStrokes(pageNum) {
    const key = inkPageKey(pageNum);
    if (!state.ink[key]) state.ink[key] = [];
    return state.ink[key];
}
// Історія операцій для Undo/Redo: кожна операція — draw, erase або clear, ключ per-сторінка
let inkHistory = {}, inkRedoStack = {};
function inkHistoryKey(pageNum) { return 'history_' + inkPageKey(pageNum); }
function getInkHistory(pageNum) {
    const key = inkHistoryKey(pageNum);
    if (!inkHistory[key]) inkHistory[key] = [];
    return inkHistory[key];
}
function getInkRedoStack(pageNum) {
    const key = inkHistoryKey(pageNum);
    if (!inkRedoStack[key]) inkRedoStack[key] = [];
    return inkRedoStack[key];
}
function saveInk() {
    if (!state.bookKey) return;
    try { writeStored('ink_' + state.bookKey, JSON.stringify(state.ink)); } catch (e) {}
}
function loadInk() {
    state.ink = {};
    if (!state.bookKey) return;
    try {
        let raw = readStored('ink_' + state.bookKey);
        if (!raw && state.oldBookKey) {
            raw = readStored('ink_' + state.oldBookKey);
            if (raw) {
                try { writeStored('ink_' + state.bookKey, raw); localStorage.removeItem('ink_' + state.oldBookKey); } catch (e) {}
            }
        }
        state.ink = JSON.parse(raw || '{}');
    } catch (e) { state.ink = {}; }
}
function redrawInk(cv, pageNum) {
    cv ??= activeInkCanvas(); pageNum ??= activeInkPage();
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    (state.ink[inkPageKey(pageNum)] || []).forEach(st => {
        if (!st.p || st.p.length < 1) return;
        ctx.strokeStyle = st.c;
        ctx.lineWidth = st.w * cv.width;
        ctx.beginPath();
        st.p.forEach((pt, i) => {
            const x = pt[0] * cv.width, y = pt[1] * cv.height;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        if (st.p.length === 1) { ctx.fillStyle = st.c; ctx.arc(st.p[0][0]*cv.width, st.p[0][1]*cv.height, ctx.lineWidth/2, 0, Math.PI*2); ctx.fill(); }
        else ctx.stroke();
    });
}
// Redraws every currently-rendered page's ink layer — used after a document-
// wide change (e.g. zoom re-render) where several pages' canvases were
// recreated at once.
function redrawAllVisibleInk() {
    if (typeof pdfPageWrappers === 'undefined') return;
    pdfPageWrappers.forEach((w, n) => {
        if (!w) return;
        const cv = w.querySelector('.ink-layer');
        if (cv) redrawInk(cv, n);
    });
}

let inkDrawing = false, inkCurrent = null;
function inkPoint(e, cv) {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
}
const inkWidth = document.getElementById('ink-width');
inkWidth.value = readStoredNumber('reader_ink_width', 1.5, .5, 6);
function updateInkWidth() {
    document.getElementById('ink-width-value').value = inkWidth.value;
    writeStored('reader_ink_width', inkWidth.value);
}
inkWidth.oninput = updateInkWidth; updateInkWidth();
let inkPointerId = null;
// Helper: точка до лінійного відрізка (не просто до точок)
function distanceToSegment(pt, p1, p2) {
    const x = pt[0], y = pt[1];
    const x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1];
    const dx = x2 - x1, dy = y2 - y1;
    let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    const closestX = x1 + t * dx, closestY = y1 + t * dy;
    return Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
}
// Bound once per rendered canvas (continuous mode re-creates canvases as
// pages enter/leave the render window, so this is called per page-render,
// not once globally — cv.dataset.bound still prevents double-binding the
// SAME canvas instance).
function bindInkCanvas(cv, pageNum) {
    if (!cv || cv.dataset.bound) return;
    cv.dataset.bound = '1';
    cv.addEventListener('pointerdown', (e) => {
        if (!state.inkMode || inkDrawing || pdfPointers.size > 1) return;
        inkActivePage = pageNum;
        inkPointerId = e.pointerId;
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        inkDrawing = true;
        if (state.inkErase) { inkEraseAt(inkPoint(e, cv), cv, pageNum); return; }
        inkCurrent = { c: state.inkColor, w: Number(inkWidth.value) / cv.getBoundingClientRect().width, p: [inkPoint(e, cv)] };
        inkStrokes(pageNum).push(inkCurrent); redrawInk(cv, pageNum);
        getInkRedoStack(pageNum).length = 0;
    });
    cv.addEventListener('pointermove', (e) => {
        if (!state.inkMode || !inkDrawing || inkPointerId !== e.pointerId || pdfPointers.size > 1) return;
        const pt = inkPoint(e, cv);
        if (state.inkErase) { inkEraseAt(pt, cv, pageNum); return; }
        inkCurrent.p.push(pt);
        redrawInk(cv, pageNum);
    });
    const finishStroke = (e) => {
        if (e.pointerId !== inkPointerId) return;
        if (!inkDrawing) return;
        if (inkCurrent && inkCurrent.p.length > 0) {
            getInkHistory(pageNum).push({ type: 'draw', stroke: { ...inkCurrent } });
            const hist = getInkHistory(pageNum);
            if (hist.length > 50) hist.shift();
        }
        inkDrawing = false; inkCurrent = null;
        redrawInk(cv, pageNum); saveInk();
    };
    cv.addEventListener('pointerup', finishStroke);
    cv.addEventListener('pointercancel', finishStroke);
    cv.addEventListener('lostpointercapture', finishStroke);
}
// Гумка стирає штрих цілком — перевіряє відстань як до точок, так і до сегментів лінії
function inkEraseAt(pt, cv, pageNum) {
    const list = inkStrokes(pageNum);
    const R = 0.02;
    for (let i = list.length - 1; i >= 0; i--) {
        const stroke = list[i];
        let erased = false;
        if (stroke.p.some(p => Math.abs(p[0] - pt[0]) < R && Math.abs(p[1] - pt[1]) < R)) erased = true;
        if (!erased && stroke.p.length > 1) {
            for (let j = 0; j < stroke.p.length - 1; j++) {
                if (distanceToSegment(pt, stroke.p[j], stroke.p[j + 1]) < R) { erased = true; break; }
            }
        }
        if (erased) {
            const erasedStroke = list.splice(i, 1)[0];
            redrawInk(cv, pageNum); saveInk();
            getInkHistory(pageNum).push({ type: 'erase', stroke: erasedStroke, index: i });
            const hist = getInkHistory(pageNum);
            if (hist.length > 50) hist.shift();
            getInkRedoStack(pageNum).length = 0;
            return;
        }
    }
}

document.getElementById('btn-ink').onclick = () => {
    if (state.format !== 'pdf') { showToast(t('regionPdfOnly')); return; }
    exitRegionMode();
    state.inkMode = true;
    document.body.classList.add('ink-mode', 'immersive-mode');
    document.querySelectorAll('.ink-layer').forEach(cv => bindInkCanvas(cv, Number(cv.dataset.page)));
    updateInkTools();
};
function updateInkTools() {
    document.getElementById('ink-pen').classList.toggle('active', !state.inkErase);
    document.getElementById('ink-erase').classList.toggle('active', state.inkErase);
    document.querySelectorAll('.ink-color').forEach(b => b.classList.toggle('active', b.dataset.c === state.inkColor));
}
document.getElementById('ink-pen').onclick = () => { state.inkErase = false; updateInkTools(); };
document.getElementById('ink-erase').onclick = () => { state.inkErase = true; updateInkTools(); };
document.querySelectorAll('.ink-color').forEach(b => {
    b.onclick = () => { state.inkColor = b.dataset.c; state.inkErase = false; updateInkTools(); };
});
document.getElementById('ink-undo').onclick = () => {
    const pageNum = activeInkPage();
    const hist = getInkHistory(pageNum);
    if (hist.length === 0) return;
    const op = hist.pop();
    const list = inkStrokes(pageNum);

    if (op.type === 'draw') {
        list.splice(list.indexOf(op.stroke), 1);
        getInkRedoStack(pageNum).push({ type: 'draw', stroke: op.stroke });
    } else if (op.type === 'erase') {
        list.splice(op.index, 0, op.stroke);
        getInkRedoStack(pageNum).push({ type: 'erase', stroke: op.stroke, index: op.index });
    } else if (op.type === 'clear') {
        state.ink[inkPageKey(pageNum)] = op.strokes || [];
        getInkRedoStack(pageNum).push({ type: 'clear', strokes: op.strokes });
    }
    const redo = getInkRedoStack(pageNum);
    if (redo.length > 50) redo.shift();

    redrawInk(activeInkCanvas(), pageNum); saveInk();
};
document.getElementById('ink-clear').onclick = () => {
    if (!confirm(t('clearPageAsk'))) return;
    const pageNum = activeInkPage();
    const clearedStrokes = inkStrokes(pageNum);
    getInkHistory(pageNum).push({ type: 'clear', strokes: clearedStrokes.slice() });
    const hist = getInkHistory(pageNum);
    if (hist.length > 50) hist.shift();
    state.ink[inkPageKey(pageNum)] = [];
    getInkRedoStack(pageNum).length = 0;
    redrawInk(activeInkCanvas(), pageNum); saveInk();
};
document.getElementById('ink-done').onclick = () => {
    state.inkMode = false;
    document.body.classList.remove('ink-mode');
};
