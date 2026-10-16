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
// Історія операцій для Undo/Redo: кожна операція — draw, erase або clear, ключ per-сторінка.
// Ownership boundary: history, active page and canvas handlers belong to ONE document — the one
// whose ink loadInk() last loaded (inkOwner). Page keys alone repeat across books ("3" in A is
// "3" in B), so loadInk() starts a fresh history and every op/canvas/save is checked against
// inkOwner: a stale op from book A can never mutate or persist into book B.
let inkHistory = {}, inkRedoStack = {}, inkOwner = null;
// The page a touch gesture started on, as it was BEFORE the gesture (see rollbackInkGesture).
let inkGestureSnapshot = null;
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
// ---- Storage: IndexedDB, one record per page, compact ------------------------------------------------------------
// Textbooks collect a LOT of handwriting. All of a book's ink used to be one JSON string in localStorage (≈5 MB for the
// whole app, ~40 bytes per point): past the quota every later stroke was silently lost on the next launch. Now each page
// is its own IndexedDB record ['<bookKey>', '<page>'] (hundreds of MB available), points packed as a Uint16Array
// (0..65535 of the page width/height, 4 bytes per point). Coordinates are quantised to that grid when drawn
// (inkPoint), so what is on screen is exactly what is stored. localStorage ink from older versions is moved over once.
const INK_DB = 'reader-ink', INK_STORE = 'pages', INK_Q = 65535;
let inkDbPromise = null, inkDbBroken = false;
function inkDb() {
    if (inkDbBroken || typeof indexedDB === 'undefined') return Promise.resolve(null);
    if (!inkDbPromise) {
        inkDbPromise = new Promise(resolve => {
            let req;
            try { req = indexedDB.open(INK_DB, 1); } catch (e) { inkDbBroken = true; resolve(null); return; }
            req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(INK_STORE)) req.result.createObjectStore(INK_STORE); };
            req.onsuccess = () => {
                const db = req.result;
                db.onversionchange = () => { db.close(); inkDbPromise = null; };
                resolve(db);
            };
            req.onerror = req.onblocked = () => { inkDbBroken = true; resolve(null); };
        });
    }
    return inkDbPromise;
}
const inkQ = v => Math.round(Math.min(1, Math.max(0, v)) * INK_Q) / INK_Q;
function encodeInkPage(strokes) {
    return (strokes || []).filter(st => st && Array.isArray(st.p) && st.p.length).map(st => {
        const flat = new Uint16Array(st.p.length * 2);
        st.p.forEach((pt, i) => { flat[2 * i] = Math.round(inkQ(pt[0]) * INK_Q); flat[2 * i + 1] = Math.round(inkQ(pt[1]) * INK_Q); });
        return { c: st.c, w: st.w, p: flat };
    });
}
function decodeInkPage(records) {
    return (Array.isArray(records) ? records : []).map(r => {
        const p = [];
        const flat = r && r.p;
        if (flat && typeof flat.length === 'number' && !Array.isArray(flat)) { for (let i = 0; i + 1 < flat.length; i += 2) p.push([flat[i] / INK_Q, flat[i + 1] / INK_Q]); }
        else if (Array.isArray(flat)) flat.forEach(pt => p.push([inkQ(pt[0]), inkQ(pt[1])]));   // plain arrays (legacy / fallback)
        return { c: r.c, w: r.w, p };
    }).filter(st => st.p.length);
}
const inkBookRange = bookKey => IDBKeyRange.bound([bookKey, ''], [bookKey, '￿']);
// Every page of a book, decoded: { '<page>': strokes }.
async function readInkPages(bookKey) {
    const db = await inkDb();
    if (!db || !bookKey) return null;
    return new Promise(resolve => {
        const out = {};
        try {
            const req = db.transaction(INK_STORE, 'readonly').objectStore(INK_STORE).openCursor(inkBookRange(bookKey));
            req.onsuccess = () => { const cur = req.result; if (!cur) { resolve(out); return; } out[cur.key[1]] = decodeInkPage(cur.value); cur.continue(); };
            req.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
    });
}
// Writes the given pages ({page: strokes}; an empty page is deleted); replaceAll also deletes this book's other pages.
async function writeInkPages(bookKey, pages, replaceAll = false) {
    const db = await inkDb();
    if (!db) return false;
    return new Promise(resolve => {
        try {
            const tx = db.transaction(INK_STORE, 'readwrite'), store = tx.objectStore(INK_STORE);
            if (replaceAll) {
                const keysReq = store.getAllKeys(inkBookRange(bookKey));
                keysReq.onsuccess = () => { for (const k of keysReq.result) if (!pages[k[1]] || !pages[k[1]].length) store.delete(k); };
            }
            for (const [page, strokes] of Object.entries(pages)) {
                const enc = encodeInkPage(strokes);
                if (enc.length) store.put(enc, [bookKey, String(page)]); else store.delete([bookKey, String(page)]);
            }
            tx.oncomplete = () => resolve(true);
            tx.onerror = tx.onabort = () => resolve(false);
        } catch (e) { resolve(false); }
    });
}
// No IndexedDB at all (very old / locked-down browsers): the old localStorage key, at least quantised.
function saveInkFallback() {
    const compact = {};
    for (const [page, strokes] of Object.entries(state.ink)) if (strokes && strokes.length) compact[page] = strokes.map(st => ({ c: st.c, w: st.w, p: st.p.map(pt => [inkQ(pt[0]), inkQ(pt[1])]) }));
    writeStored('ink_' + state.bookKey, JSON.stringify(compact));
}
let inkSaveChain = Promise.resolve();
// saveInk(page): persists that page of the CURRENT book. saveInk() with no page: the whole in-memory ink of this book
// (pages that are no longer there are deleted). Saves run one after another, so an older write never lands last.
function saveInk(pageNum) {
    if (!state.bookKey || inkOwner !== state.bookKey) return inkSaveChain; // in-memory ink is not this book's
    const bookKey = state.bookKey;
    const whole = pageNum === undefined;
    const page = whole ? null : inkPageKey(pageNum);
    // Never before this book's stored ink has been read: a page written now would replace the strokes it already had.
    // The pages are taken at write time, after the load merged everything in.
    inkSaveChain = inkSaveChain.then(() => inkLoadPromise).then(async () => {
        if (inkOwner !== bookKey || state.bookKey !== bookKey) return;
        const pages = {};
        if (whole) for (const [p, strokes] of Object.entries(state.ink)) pages[p] = (strokes || []).slice();
        else pages[page] = (state.ink[page] || []).slice();
        const ok = await writeInkPages(bookKey, pages, whole);
        if (!ok && inkOwner === bookKey && state.bookKey === bookKey) saveInkFallback();
    }).catch(() => {});
    return inkSaveChain;
}
// Waits for every queued write (tests; the app never needs to).
function inkSaved() { return inkSaveChain; }
// For tests and diagnostics: what is actually stored for a book, as JSON ({page: strokes}).
async function readStoredInk(bookKey) {
    await inkSaveChain;
    const pages = await readInkPages(bookKey);
    if (pages) return JSON.stringify(pages);
    try { return readStored('ink_' + bookKey); } catch (e) { return null; }
}
let inkLoadPromise = Promise.resolve();
function loadInk() {
    state.ink = {};
    inkOwner = state.bookKey || null;
    inkHistory = {}; inkRedoStack = {}; inkActivePage = 0; inkGestureSnapshot = null;
    inkDrawing = false; inkCurrent = null; inkPointerId = null;
    if (!state.bookKey) { inkLoadPromise = Promise.resolve(); return; }
    const bookKey = state.bookKey, oldKey = state.oldBookKey;
    inkLoadPromise = (async () => {
        // 1) what older versions kept in localStorage (this book's key, or the key it had before)
        let legacy = {}, legacyKey = null;
        for (const k of [bookKey, oldKey]) {
            if (!k) continue;
            try { const raw = readStored('ink_' + k); if (raw) { legacy = JSON.parse(raw) || {}; legacyKey = k; break; } } catch (e) { /* unreadable: ignore */ }
        }
        // 2) IndexedDB (this key; else records still under the book's previous key)
        let pages = await readInkPages(bookKey);
        if (pages && !Object.keys(pages).length && oldKey) {
            const old = await readInkPages(oldKey);
            if (old && Object.keys(old).length) { pages = old; if (await writeInkPages(bookKey, old)) await writeInkPages(oldKey, {}, true); }
        }
        const loaded = {};
        for (const [page, strokes] of Object.entries(legacy)) loaded[page] = decodeInkPage(strokes);
        if (pages) Object.assign(loaded, pages);           // IndexedDB is newer than any leftover localStorage copy
        if (pages && legacyKey) {
            const missing = {};
            for (const page of Object.keys(legacy)) if (!pages[page]) missing[page] = loaded[page];
            if (!Object.keys(missing).length || await writeInkPages(bookKey, missing)) { try { localStorage.removeItem('ink_' + legacyKey); } catch (e) {} }
        }
        if (inkOwner !== bookKey || state.bookKey !== bookKey) return;   // another book was opened meanwhile
        // Strokes drawn while the stored ink was still loading are kept, on top of it.
        for (const [page, strokes] of Object.entries(loaded)) state.ink[page] = strokes.concat(state.ink[page] || []);
        if (typeof redrawAllVisibleInk === 'function') redrawAllVisibleInk();
    })().catch(() => {});
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

// A second finger landed while the first one was drawing/erasing: that touch was the start of a pinch, not ink. The
// page the gesture STARTED on gets its strokes back exactly as they were (it used to be the previously active page,
// so one page's handwriting could land on another and the current page's was lost).
function rollbackInkGesture() {
    const snap = inkGestureSnapshot;
    inkGestureSnapshot = null;
    inkDrawing = false; inkCurrent = null;
    if (!snap || snap.owner !== inkOwner) return;   // a snapshot from another document never lands here (saveInk guards the book)
    state.ink[snap.page] = snap.strokes;
    const w = typeof pdfPageWrappers !== 'undefined' ? pdfPageWrappers[Number(snap.page)] : null;
    const cv = w && w.querySelector('.ink-layer');
    if (cv) redrawInk(cv, Number(snap.page));
    saveInk(Number(snap.page));
}
let inkDrawing = false, inkCurrent = null;
function inkPoint(e, cv) {
    const r = cv.getBoundingClientRect();
    return [inkQ((e.clientX - r.left) / r.width), inkQ((e.clientY - r.top) / r.height)];
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
    const owner = inkOwner; // a canvas left over from a previous book must never draw into this one
    cv.addEventListener('pointerdown', (e) => {
        if (owner !== inkOwner || !state.inkMode || inkDrawing || pdfPointers.size > 1) return;
        inkActivePage = pageNum;
        inkPointerId = e.pointerId;
        // A second finger (pinch / palm) turns this into a zoom gesture: rollbackInkGesture() restores THIS page.
        inkGestureSnapshot = { page: inkPageKey(pageNum), owner, strokes: inkStrokes(pageNum).slice() };
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        inkDrawing = true;
        if (state.inkErase) { inkEraseAt(inkPoint(e, cv), cv, pageNum); return; }
        inkCurrent = { c: state.inkColor, w: Number(inkWidth.value) / cv.getBoundingClientRect().width, p: [inkPoint(e, cv)] };
        inkStrokes(pageNum).push(inkCurrent); redrawInk(cv, pageNum);
        getInkRedoStack(pageNum).length = 0;
    });
    cv.addEventListener('pointermove', (e) => {
        if (owner !== inkOwner || !state.inkMode || !inkDrawing || inkPointerId !== e.pointerId || pdfPointers.size > 1) return;
        const pt = inkPoint(e, cv);
        if (state.inkErase) { inkEraseAt(pt, cv, pageNum); return; }
        inkCurrent.p.push(pt);
        redrawInk(cv, pageNum);
    });
    const finishStroke = (e) => {
        if (owner !== inkOwner || e.pointerId !== inkPointerId) return;
        if (!inkDrawing) return;
        if (inkCurrent && inkCurrent.p.length > 0) {
            getInkHistory(pageNum).push({ type: 'draw', stroke: inkCurrent, owner });
            const hist = getInkHistory(pageNum);
            if (hist.length > 50) hist.shift();
        }
        inkDrawing = false; inkCurrent = null;
        redrawInk(cv, pageNum); saveInk(pageNum);
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
            redrawInk(cv, pageNum); saveInk(pageNum);
            getInkHistory(pageNum).push({ type: 'erase', stroke: erasedStroke, index: i, owner: inkOwner });
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
    if (op.owner !== inkOwner || inkOwner !== state.bookKey) return; // never replay another book's op
    const list = inkStrokes(pageNum);

    if (op.type === 'draw') {
        // By identity, else by content (a pinch rollback restores a structuredClone of the page's strokes).
        // Not found: never splice(-1) — that would delete an unrelated stroke.
        let at = list.indexOf(op.stroke);
        if (at < 0) { const sig = JSON.stringify(op.stroke); at = list.findIndex(st => JSON.stringify(st) === sig); }
        if (at < 0) return;
        list.splice(at, 1);
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

    redrawInk(activeInkCanvas(), pageNum); saveInk(pageNum);
};
document.getElementById('ink-clear').onclick = () => {
    if (!confirm(t('clearPageAsk'))) return;
    const pageNum = activeInkPage();
    const clearedStrokes = inkStrokes(pageNum);
    getInkHistory(pageNum).push({ type: 'clear', strokes: clearedStrokes.slice(), owner: inkOwner });
    const hist = getInkHistory(pageNum);
    if (hist.length > 50) hist.shift();
    state.ink[inkPageKey(pageNum)] = [];
    getInkRedoStack(pageNum).length = 0;
    redrawInk(activeInkCanvas(), pageNum); saveInk(pageNum);
};
document.getElementById('ink-done').onclick = () => {
    state.inkMode = false;
    document.body.classList.remove('ink-mode');
};
