/* pdf-ink.js — письмо поверх сторінки PDF: canvas-шар (inkCanvas), штрихи у
 * ВІДНОСНИХ координатах (0..1, не в пікселях — сторінку можна масштабувати й
 * перевідкривати, написане лишається на місці й не розмивається, бо
 * перемальовується заново у поточній роздільності), збереження/завантаження
 * (saveInk/loadInk через state.ink, ключ — inkPageKey), перемальовування
 * (redrawInk), малювання пером/пальцем/мишею (bindInkCanvas/inkPoint), гумка
 * (inkEraseAt), товщина/колір (updateInkWidth/updateInkTools) і кнопки
 * інструментів (перо/гумка/колір/undo/очистити/готово).
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/ai-client.js. inkDrawing/inkCurrent — власний глобальний стан цього
 * файлу (не спільний з іншими модулями попри те, що js/pdf-zoom-pan.js читає
 * їх усередині cancelPdfInteraction/touch-жестів — лише forward-посилання
 * всередині callback'ів, той самий безпечний механізм, що вже описаний для
 * pdfAnchor).
 */

// ========== ПИСЬМО ПОВЕРХ СТОРІНКИ ==========
// Штрихи зберігаються у ВІДНОСНИХ координатах (0..1), а не в пікселях: сторінку можна
// масштабувати й перевідкривати — написане лишається на своєму місці й не розмивається,
// бо перемальовується заново у поточній роздільності.
function inkCanvas() { return els.pages.querySelector('#ink-layer'); }
function inkPageKey() { return String(state.currentIndex); }
function inkStrokes() {
    if (!state.ink[inkPageKey()]) state.ink[inkPageKey()] = [];
    return state.ink[inkPageKey()];
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
function redrawInk() {
    const cv = inkCanvas();
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    (state.ink[inkPageKey()] || []).forEach(st => {
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
function bindInkCanvas() {
    const cv = inkCanvas();
    if (!cv || cv.dataset.bound) return;
    cv.dataset.bound = '1';
    cv.addEventListener('pointerdown', (e) => {
        if (!state.inkMode || inkDrawing || pdfPointers.size > 1) return;
        inkPointerId = e.pointerId;
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        inkDrawing = true;
        if (state.inkErase) { inkEraseAt(inkPoint(e, cv)); return; }
        inkCurrent = { c: state.inkColor, w: Number(inkWidth.value) / cv.getBoundingClientRect().width, p: [inkPoint(e, cv)] };
        inkStrokes().push(inkCurrent); redrawInk();
    });
    cv.addEventListener('pointermove', (e) => {
        if (!state.inkMode || !inkDrawing || inkPointerId !== e.pointerId || pdfPointers.size > 1) return;
        const pt = inkPoint(e, cv);
        if (state.inkErase) { inkEraseAt(pt); return; }
        inkCurrent.p.push(pt);
        redrawInk();
    });
    const finishStroke = (e) => {
        if (e.pointerId !== inkPointerId) return;
        if (!inkDrawing) return;
        inkDrawing = false; inkCurrent = null;
        redrawInk(); saveInk();
    };
    cv.addEventListener('pointerup', finishStroke);
    cv.addEventListener('pointercancel', finishStroke);
    cv.addEventListener('lostpointercapture', finishStroke);
}
// Гумка стирає штрих цілком — так простіше й передбачуваніше, ніж стирати частинами.
function inkEraseAt(pt) {
    const list = inkStrokes();
    const R = 0.02;
    for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].p.some(p => Math.abs(p[0] - pt[0]) < R && Math.abs(p[1] - pt[1]) < R)) {
            list.splice(i, 1); redrawInk(); saveInk(); return;
        }
    }
}

document.getElementById('btn-ink').onclick = () => {
    if (state.format !== 'pdf') { alert(t('regionPdfOnly')); return; }
    exitRegionMode();
    state.inkMode = true;
    document.body.classList.add('ink-mode', 'immersive-mode');
    bindInkCanvas();
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
document.getElementById('ink-undo').onclick = () => { inkStrokes().pop(); redrawInk(); saveInk(); };
document.getElementById('ink-clear').onclick = () => {
    if (!confirm(t('clearPageAsk'))) return;
    state.ink[inkPageKey()] = []; redrawInk(); saveInk();
};
document.getElementById('ink-done').onclick = () => {
    state.inkMode = false;
    document.body.classList.remove('ink-mode');
};
