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
// Stylus pressure (0..1) is kept on a 1/255 grid: a third number in a point, one byte per point in storage (`q`).
// Strokes from a finger or a mouse have no pressure (two-number points, no `q`), as in older versions.
const inkPressureQ = v => Math.round(Math.min(1, Math.max(0, v)) * 255) / 255;
const inkHasPressure = st => st.p.length > 0 && st.p.every(pt => typeof pt[2] === 'number');
function encodeInkPage(strokes) {
    return (strokes || []).filter(st => st && Array.isArray(st.p) && st.p.length).map(st => {
        const flat = new Uint16Array(st.p.length * 2);
        st.p.forEach((pt, i) => { flat[2 * i] = Math.round(inkQ(pt[0]) * INK_Q); flat[2 * i + 1] = Math.round(inkQ(pt[1]) * INK_Q); });
        const rec = { c: st.c, w: st.w, p: flat };
        if (inkHasPressure(st)) rec.q = Uint8Array.from(st.p, pt => Math.round(inkPressureQ(pt[2]) * 255));
        return rec;
    });
}
function decodeInkPage(records) {
    return (Array.isArray(records) ? records : []).map(r => {
        const p = [];
        const flat = r && r.p;
        if (flat && typeof flat.length === 'number' && !Array.isArray(flat)) {
            const q = r.q && r.q.length * 2 === flat.length ? r.q : null;
            for (let i = 0; i + 1 < flat.length; i += 2) p.push(q ? [flat[i] / INK_Q, flat[i + 1] / INK_Q, q[i / 2] / 255] : [flat[i] / INK_Q, flat[i + 1] / INK_Q]);
        }
        else if (Array.isArray(flat)) flat.forEach(pt => p.push(typeof pt[2] === 'number' ? [inkQ(pt[0]), inkQ(pt[1]), inkPressureQ(pt[2])] : [inkQ(pt[0]), inkQ(pt[1])]));   // plain arrays (legacy / fallback)
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
    for (const [page, strokes] of Object.entries(state.ink)) if (strokes && strokes.length) compact[page] = strokes.map(st => ({ c: st.c, w: st.w, p: st.p.map(pt => typeof pt[2] === 'number' ? [inkQ(pt[0]), inkQ(pt[1]), inkPressureQ(pt[2])] : [inkQ(pt[0]), inkQ(pt[1])]) }));
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
    inkDrawing = false; inkCurrent = null; inkPointerId = null; inkTouchPan = null;
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
// Gives a page's ink canvas its full-size buffer (it is created empty while the page has no ink; js/pdf-render.js).
function ensureInkCanvas(cv) {
    if (cv && cv.width === 0 && Number(cv.dataset.fullWidth) > 0) { cv.width = Number(cv.dataset.fullWidth); cv.height = Number(cv.dataset.fullHeight); }
    return cv;
}
function redrawInk(cv, pageNum) {
    cv ??= activeInkCanvas(); pageNum ??= activeInkPage();
    if (!cv) return;
    const strokesHere = state.ink[inkPageKey(pageNum)];
    if (cv.width === 0 && !(strokesHere && strokesHere.length)) return;   // nothing to draw on an unallocated layer
    ensureInkCanvas(cv);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    (state.ink[inkPageKey(pageNum)] || []).forEach(st => inkDrawStroke(ctx, st, cv.width, cv.height));
}
// ---- One stroke on the canvas: smooth curves, width from the stylus pressure ----------------------------------------
// The line runs through the MIDPOINTS of consecutive points with the points themselves as control points (quadratic
// curves), so a fast stroke is round instead of a polyline with corners. Segment k of an n-point stroke: 0 = from the
// first point to the first midpoint, 1..n-2 = midpoint to midpoint around point k, n-1 = last midpoint to the last point.
// A stroke with pressure is drawn segment by segment, each as wide as the pressure there (averaged with its neighbours,
// so the width changes smoothly); pressure 0.5 = the width set on the slider.
const inkPressureWidth = pr => 0.35 + 1.3 * pr;
function inkSegmentWidth(st, k, W) {
    const p = st.p, n = p.length, pr = i => p[Math.max(0, Math.min(n - 1, i))][2];
    if (typeof pr(k) !== 'number') return st.w * W;
    return st.w * W * inkPressureWidth((pr(k - 1) + 2 * pr(k) + pr(k + 1)) / 4);
}
// Draws segments from..to-1 (to ≤ n). While a stroke is being written, segments up to n-2 are final (each needs the next
// point), so the live drawing adds only those and the last one is drawn when the stroke ends.
function inkDrawSegments(ctx, st, from, to, W, H) {
    const p = st.p, n = p.length;
    const pt = k => [p[k][0] * W, p[k][1] * H];
    const mid = k => [(p[k][0] + p[k + 1][0]) / 2 * W, (p[k][1] + p[k + 1][1]) / 2 * H];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = st.c;
    for (let k = Math.max(0, from); k < Math.min(to, n); k++) {
        ctx.lineWidth = inkSegmentWidth(st, k, W);
        ctx.beginPath();
        if (k === 0) { ctx.moveTo(...pt(0)); ctx.lineTo(...(n > 1 ? mid(0) : pt(0))); }
        else if (k === n - 1) { ctx.moveTo(...mid(k - 1)); ctx.lineTo(...pt(k)); }
        else { ctx.moveTo(...mid(k - 1)); ctx.quadraticCurveTo(...pt(k), ...mid(k)); }
        ctx.stroke();
    }
}
function inkDrawDot(ctx, st, W, H) {
    ctx.fillStyle = st.c;
    ctx.beginPath(); ctx.arc(st.p[0][0] * W, st.p[0][1] * H, inkSegmentWidth(st, 0, W) / 2, 0, Math.PI * 2); ctx.fill();
}
function inkDrawStroke(ctx, st, W, H) {
    const p = st.p, n = p ? p.length : 0;
    if (!n) return;
    if (n === 1) { inkDrawDot(ctx, st, W, H); return; }
    if (inkHasPressure(st)) { inkDrawSegments(ctx, st, 0, n, W, H); return; }
    // No pressure: one path, one width.
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = st.c; ctx.lineWidth = st.w * W;
    ctx.beginPath();
    ctx.moveTo(p[0][0] * W, p[0][1] * H);
    ctx.lineTo((p[0][0] + p[1][0]) / 2 * W, (p[0][1] + p[1][1]) / 2 * H);
    for (let k = 1; k < n - 1; k++) ctx.quadraticCurveTo(p[k][0] * W, p[k][1] * H, (p[k][0] + p[k + 1][0]) / 2 * W, (p[k][1] + p[k + 1][1]) / 2 * H);
    ctx.lineTo(p[n - 1][0] * W, p[n - 1][1] * H);
    ctx.stroke();
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
// The stroke being written: its pointer type, the canvas box at its start (the page does not move while a stroke is
// written: the layer has touch-action:none), how many of its segments are already on the canvas, and whether this
// gesture erases (the eraser tool, or a stylus's eraser end / side button).
let inkPointerType = '', inkStrokeRect = null, inkDrawnSegments = 0, inkErasing = false, inkPaintFrame = 0;
function inkPoint(e, cv, r) {
    r ??= cv.getBoundingClientRect();
    const pt = [inkQ((e.clientX - r.left) / r.width), inkQ((e.clientY - r.top) / r.height)];
    if (e.pointerType === 'pen') pt.push(inkPressureQ(e.pressure > 0 ? e.pressure : 0.5));
    return pt;
}
// ---- Stylus and palm ----------------------------------------------------------------------------------------------
// Once a stylus has written here, only the stylus writes (auto-detected, remembered on this device): a finger scrolls the
// page, two fingers zoom, and a palm resting on the screen while writing does nothing — before, it drew, or (as the start
// of a pinch) cancelled the stroke being written. The ☝️ button lets a finger write again.
let inkPenSeen = readStored('reader_ink_pen_seen') === '1';
let inkFingerWrites = !inkPenSeen || readStored('reader_ink_finger') === '1';
let inkPenUpAt = -1e9, inkTouchPan = null;
const INK_PALM_GRACE_MS = 400;   // a palm still on the screen just after the stylus lifted is not a gesture either
// True while a stylus is writing (or just lifted): fingers then do not draw, scroll or zoom (js/pdf-zoom-pan.js asks).
function inkPenBusy() {
    return !!state.inkMode && ((inkDrawing && inkPointerType === 'pen') || performance.now() - inkPenUpAt < INK_PALM_GRACE_MS);
}
function inkNotePen() {
    if (inkPenSeen) return;
    inkPenSeen = true; inkFingerWrites = false;
    writeStored('reader_ink_pen_seen', '1'); writeStored('reader_ink_finger', '0');
    updateInkTools();
    if (typeof showToast === 'function') showToast(t('inkPenFound'));
}
// The newest finished segments of the stroke being written, once per frame (not the whole page on every move).
function paintInkStroke() {
    inkPaintFrame = 0;
    if (!inkDrawing || !inkCurrent || inkErasing) return;
    const cv = activeInkCanvas();
    if (!cv || !cv.width) return;
    const upTo = inkCurrent.p.length - 1;
    if (upTo > inkDrawnSegments) {
        inkDrawSegments(cv.getContext('2d'), inkCurrent, inkDrawnSegments, upTo, cv.width, cv.height);
        inkDrawnSegments = upTo;
    }
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
        if (owner !== inkOwner || !state.inkMode) return;
        const pen = e.pointerType === 'pen';
        if (e.pointerType === 'touch' && (!inkFingerWrites || inkPenBusy())) {
            // A finger scrolls the page (the layer is touch-action:none, so the browser does not); a palm while the
            // stylus writes does nothing at all.
            e.preventDefault();
            if (!inkFingerWrites && !inkPenBusy() && !inkTouchPan) inkTouchPan = { id: e.pointerId, x: e.clientX, y: e.clientY };
            return;
        }
        if (inkDrawing || (!pen && pdfPointers.size > 1)) return;
        if (pen) { inkNotePen(); inkTouchPan = null; }
        ensureInkCanvas(cv);
        inkActivePage = pageNum;
        inkPointerId = e.pointerId;
        inkPointerType = e.pointerType;
        inkStrokeRect = cv.getBoundingClientRect();
        // A second finger (pinch / palm) turns this into a zoom gesture: rollbackInkGesture() restores THIS page.
        inkGestureSnapshot = { page: inkPageKey(pageNum), owner, strokes: inkStrokes(pageNum).slice() };
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        inkDrawing = true;
        inkErasing = state.inkErase || (pen && (e.buttons & 34) !== 0);   // 32 = eraser end, 2 = the stylus side button
        if (inkErasing) { inkEraseAt(inkPoint(e, cv, inkStrokeRect), cv, pageNum); return; }
        inkCurrent = { c: state.inkColor, w: Number(inkWidth.value) / inkStrokeRect.width, p: [inkPoint(e, cv, inkStrokeRect)] };
        inkStrokes(pageNum).push(inkCurrent);
        inkDrawnSegments = 0;
        inkDrawDot(cv.getContext('2d'), inkCurrent, cv.width, cv.height);
        getInkRedoStack(pageNum).length = 0;
    });
    cv.addEventListener('pointermove', (e) => {
        if (owner !== inkOwner || !state.inkMode) return;
        if (inkTouchPan && inkTouchPan.id === e.pointerId) {
            const dx = e.clientX - inkTouchPan.x, dy = e.clientY - inkTouchPan.y;
            inkTouchPan.x = e.clientX; inkTouchPan.y = e.clientY;
            if (inkPenBusy() || pdfPointers.size > 1 || pdfGesture?.multi) return;   // two fingers: js/pdf-zoom-pan.js zooms
            els.container.scrollLeft -= dx; els.container.scrollTop -= dy;
            return;
        }
        if (!inkDrawing || inkPointerId !== e.pointerId || (inkPointerType !== 'pen' && pdfPointers.size > 1)) return;
        const r = inkStrokeRect || cv.getBoundingClientRect();
        // Every point the device reported since the last event (a stylus gives 120–240 per second, events come per frame).
        const all = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
        for (const ev of all.length ? all : [e]) {
            const pt = inkPoint(ev, cv, r);
            if (inkErasing) { inkEraseAt(pt, cv, pageNum); continue; }
            const last = inkCurrent.p[inkCurrent.p.length - 1];
            if (Math.hypot((pt[0] - last[0]) * r.width, (pt[1] - last[1]) * r.height) < 0.5) continue;   // < half a pixel apart
            inkCurrent.p.push(pt);
        }
        if (!inkErasing && !inkPaintFrame) inkPaintFrame = requestAnimationFrame(paintInkStroke);
    });
    const finishStroke = (e) => {
        if (owner !== inkOwner) return;
        if (inkTouchPan && inkTouchPan.id === e.pointerId) { inkTouchPan = null; return; }
        if (e.pointerId !== inkPointerId || !inkDrawing) return;
        if (inkCurrent && inkCurrent.p.length > 0) {
            getInkHistory(pageNum).push({ type: 'draw', stroke: inkCurrent, owner });
            const hist = getInkHistory(pageNum);
            if (hist.length > 50) hist.shift();
        }
        if (inkPointerType === 'pen') inkPenUpAt = performance.now();
        if (inkPaintFrame) { cancelAnimationFrame(inkPaintFrame); inkPaintFrame = 0; }
        inkDrawing = false; inkCurrent = null; inkErasing = false; inkStrokeRect = null;
        redrawInk(cv, pageNum); saveInk(pageNum);
    };
    cv.addEventListener('contextmenu', e => { if (state.inkMode) e.preventDefault(); });   // the side button erases, no menu
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
    document.querySelectorAll('.ink-layer').forEach(cv => { ensureInkCanvas(cv); bindInkCanvas(cv, Number(cv.dataset.page)); });
    updateInkTools();
};
function updateInkTools() {
    document.getElementById('ink-pen').classList.toggle('active', !state.inkErase);
    document.getElementById('ink-erase').classList.toggle('active', state.inkErase);
    const finger = document.getElementById('ink-finger');
    finger.hidden = !inkPenSeen;
    finger.classList.toggle('active', inkFingerWrites);
    finger.setAttribute('aria-pressed', String(inkFingerWrites));
    document.querySelectorAll('.ink-color').forEach(b => b.classList.toggle('active', b.dataset.c === state.inkColor));
}
document.getElementById('ink-pen').onclick = () => { state.inkErase = false; updateInkTools(); };
document.getElementById('ink-erase').onclick = () => { state.inkErase = true; updateInkTools(); };
document.getElementById('ink-finger').onclick = () => {
    inkFingerWrites = !inkFingerWrites; inkTouchPan = null;
    writeStored('reader_ink_finger', inkFingerWrites ? '1' : '0');
    updateInkTools();
};
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
