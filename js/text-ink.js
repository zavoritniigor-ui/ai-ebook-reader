/* text-ink.js — writing by hand over the pages of TEXT books (EPUB, Word, FB2, TXT, HTML, RTF, Markdown).
 *
 * A text book has no fixed pages: the text flows again for another font size, screen or window. So a stroke is tied to
 * the TEXT, not to the screen: to the character nearest to where it starts (its offset in the chapter, the same anchor
 * model as highlights and the reading ribbon, js/reading-ribbon.js), with every point stored relative to that
 * character in units of its font size (em). Same layout = exactly where it was written; bigger font = the note grows
 * with the text and moves with its character to wherever that character now is.
 *
 * The writing itself (stylus, pressure, palm, marker, eraser, Undo/Redo) is js/pdf-ink.js, unchanged: this file shows
 * the strokes of the visible page as ONE "page" of that code (key TEXT_INK_PAGE, coordinates 0..1 of a canvas over
 * #reader-container) and converts them back to anchored strokes whenever pdf-ink.js saves (saveInk → saveTextInk).
 * Strokes whose character is on another page of the chapter are kept aside and written back with them.
 *
 * Storage: IndexedDB `reader-text-ink` / `chapters`, one record per chapter [bookKey, chapter], points as Int16
 * (1/64 em) plus the pressure byte `q` and the marker flag `m`, like PDF ink. Classic <script>, loaded after
 * js/pdf-ink.js; hooks: goToPageInChapter (js/navigation.js) → layoutTextInk, loadInk → loadTextInk.
 */

const TEXT_INK_DB = 'reader-text-ink', TEXT_INK_STORE = 'chapters', TEXT_INK_EM_Q = 64;
const textInkQ = v => Math.round(v * TEXT_INK_EM_Q) / TEXT_INK_EM_Q;
let textInkDbPromise = null, textInkDbBroken = false;
// state.textInk: { '<chapter>': [{ c, w, m?, a, p: [[dx, dy, pressure?], ...] }] } — a = the character's offset in the
// chapter's text (-1: a page without text; then pg = the page and the points are relative to the page's corner), w and
// dx/dy in em of that character.
let textInkOwner = null, textInkLoadPromise = Promise.resolve(), textInkSaveChain = Promise.resolve();
let textInkShown = null;   // what the visible page shows: { chapter, page, aside: [anchored strokes not on it], source: WeakMap }
let textInkLayoutTimer = 0;

function textInkDb() {
    if (textInkDbBroken || typeof indexedDB === 'undefined') return Promise.resolve(null);
    if (!textInkDbPromise) {
        textInkDbPromise = new Promise(resolve => {
            let req;
            try { req = indexedDB.open(TEXT_INK_DB, 1); } catch (e) { textInkDbBroken = true; resolve(null); return; }
            req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(TEXT_INK_STORE)) req.result.createObjectStore(TEXT_INK_STORE); };
            req.onsuccess = () => { const db = req.result; db.onversionchange = () => { db.close(); textInkDbPromise = null; }; resolve(db); };
            req.onerror = req.onblocked = () => { textInkDbBroken = true; resolve(null); };
        });
    }
    return textInkDbPromise;
}
function encodeTextInk(strokes) {
    return (strokes || []).filter(st => st && st.p && st.p.length).map(st => {
        const flat = new Int16Array(st.p.length * 2);
        st.p.forEach((pt, i) => { flat[2 * i] = Math.round(pt[0] * TEXT_INK_EM_Q); flat[2 * i + 1] = Math.round(pt[1] * TEXT_INK_EM_Q); });
        const rec = { c: st.c, w: st.w, a: st.a, p: flat };
        if (st.a < 0) rec.pg = st.pg;
        if (st.m) rec.m = 1;
        if (inkHasPressure(st)) rec.q = Uint8Array.from(st.p, pt => Math.round(inkPressureQ(pt[2]) * 255));
        return rec;
    });
}
function decodeTextInk(records) {
    return (Array.isArray(records) ? records : []).map(r => {
        const flat = r && r.p, q = r && r.q && flat && r.q.length * 2 === flat.length ? r.q : null, p = [];
        if (flat && typeof flat.length === 'number') for (let i = 0; i + 1 < flat.length; i += 2) {
            const pt = [flat[i] / TEXT_INK_EM_Q, flat[i + 1] / TEXT_INK_EM_Q];
            if (q) pt.push(q[i / 2] / 255);
            p.push(pt);
        }
        return textInkStroke(r.c, r.w, r.m, Number.isInteger(r.a) ? r.a : -1, r.pg, p);
    }).filter(st => st.p.length);
}
// One field order everywhere (memory = what comes back from storage).
function textInkStroke(c, w, m, a, pg, p) {
    const st = { c, w };
    if (m) st.m = 1;
    st.a = a;
    if (a < 0) st.pg = Number(pg) || 0;
    st.p = p;
    return st;
}

// ---- Load / save -------------------------------------------------------------------------------------------------
function loadTextInk() {
    state.textInk = {};
    textInkShown = null;
    textInkOwner = state.bookKey || null;
    const bookKey = textInkOwner;
    if (!bookKey) { textInkLoadPromise = Promise.resolve(); return; }
    textInkLoadPromise = (async () => {
        const db = await textInkDb();
        if (!db) return;
        const pages = await new Promise(resolve => {
            const out = {};
            try {
                const req = db.transaction(TEXT_INK_STORE, 'readonly').objectStore(TEXT_INK_STORE).openCursor(IDBKeyRange.bound([bookKey, ''], [bookKey, '￿']));
                req.onsuccess = () => { const cur = req.result; if (!cur) { resolve(out); return; } out[cur.key[1]] = decodeTextInk(cur.value); cur.continue(); };
                req.onerror = () => resolve(out);
            } catch (e) { resolve(out); }
        });
        if (textInkOwner !== bookKey || state.bookKey !== bookKey) return;
        // Strokes written while this was loading stay, on top of the stored ones.
        for (const [chapter, strokes] of Object.entries(pages)) state.textInk[chapter] = strokes.concat(state.textInk[chapter] || []);
        textInkShown = null;
        layoutTextInk();
    })().catch(() => {});
}
// pdf-ink.js saved the visible page (after a stroke, an erase, Undo/Redo, Clear): turn its strokes back into anchored
// ones (an unchanged stroke keeps its anchor) and write the chapter.
function saveTextInk() {
    const shown = textInkShown;
    if (!shown || !state.bookKey || textInkOwner !== state.bookKey || inkOwner !== state.bookKey) return;
    const geo = textInkGeometry();
    if (!geo) return;
    const list = shown.aside.slice();
    for (const st of state.ink[TEXT_INK_PAGE] || []) {
        let anchored = shown.source.get(st);
        if (!anchored) { anchored = anchorTextStroke(st, geo); if (!anchored) continue; shown.source.set(st, anchored); }
        list.push(anchored);
    }
    state.textInk[shown.chapter] = list;
    const bookKey = state.bookKey, chapter = String(shown.chapter), records = encodeTextInk(list);
    textInkSaveChain = textInkSaveChain.then(() => textInkLoadPromise).then(async () => {
        if (textInkOwner !== bookKey) return;
        const db = await textInkDb();
        if (!db) return;
        await new Promise(resolve => {
            try {
                const tx = db.transaction(TEXT_INK_STORE, 'readwrite'), store = tx.objectStore(TEXT_INK_STORE);
                if (records.length) store.put(records, [bookKey, chapter]); else store.delete([bookKey, chapter]);
                tx.oncomplete = tx.onerror = tx.onabort = () => resolve();
            } catch (e) { resolve(); }
        });
    }).catch(() => {});
}
// For tests: every queued write done.
function textInkSaved() { return textInkSaveChain; }

// ---- Geometry ----------------------------------------------------------------------------------------------------
// The canvas covers #reader-container's padding box. The text is laid out in CSS columns moved by a transform (page
// turns animate), so positions are measured relative to #reader-pages and placed where its CURRENT page sits when the
// turn has finished: the result does not depend on the animation frame it was measured in.
function textInkGeometry() {
    if (!inkOnText() || !els.pages || !els.container) return null;
    const step = columnStep(), page = state.pageInChapter || 0;
    return {
        W: els.container.clientWidth, H: els.container.clientHeight, step, page,
        pages: els.pages.getBoundingClientRect(),
        baseX: els.pages.offsetLeft - page * step, baseY: els.pages.offsetTop,
        canvas: els.container.getBoundingClientRect(),
    };
}
// Where character `offset` of the chapter is on the canvas, its font size, and whether it is on the visible page.
function textInkCharBox(node, offset, geo) {
    const r = document.createRange();
    const at = Math.min(offset, Math.max(0, node.length - 1));
    try { r.setStart(node, at); r.setEnd(node, Math.min(node.length, at + 1)); } catch (e) { return null; }
    const rect = Array.from(r.getClientRects()).find(x => x.width || x.height) || r.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return null;
    const inPages = rect.left - geo.pages.left;
    const fs = parseFloat(getComputedStyle(node.parentElement || els.pages).fontSize) || 18;
    return { x: inPages + geo.baseX, y: rect.top - geo.pages.top + geo.baseY, fs,
             onPage: inPages >= geo.page * geo.step - 1 && inPages < (geo.page + 1) * geo.step - 1 };
}
// Anchor boxes for many offsets in ONE walk over the chapter's text.
function textInkCharBoxes(offsets, geo) {
    const want = [...new Set(offsets.filter(o => o >= 0))].sort((a, b) => a - b), out = new Map();
    if (!want.length) return out;
    const walker = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT);
    let node, base = 0, i = 0;
    while (i < want.length && (node = walker.nextNode())) {
        while (i < want.length && want[i] < base + node.length) { out.set(want[i], textInkCharBox(node, want[i] - base, geo)); i++; }
        base += node.length;
    }
    return out;
}
// A page without text (a picture): strokes are relative to the page's corner, in em of the book's font.
function textInkPageBox(geo) {
    return { x: els.pages.offsetLeft, y: geo.baseY, fs: parseFloat(getComputedStyle(els.pages).fontSize) || 18, onPage: true };
}
// A stroke on the canvas (0..1) → anchored to the character under / nearest its first point.
function anchorTextStroke(st, geo) {
    const first = st.p[0];
    if (!first) return null;
    const cx = first[0] * geo.W, cy = first[1] * geo.H;
    let offset = null, box = null;
    const cv = textInkCanvas();
    const was = cv.style.pointerEvents;
    cv.style.pointerEvents = 'none';   // hit-test the text under the canvas
    try {
        const range = caretRangeAt(geo.canvas.left + els.container.clientLeft + cx, geo.canvas.top + els.container.clientTop + cy);
        if (range && range.startContainer.nodeType === Node.TEXT_NODE && els.pages.contains(range.startContainer) && range.startContainer.length) {
            const node = range.startContainer, at = Math.min(range.startOffset, node.length - 1);   // a caret after the last letter: that letter
            const o = textOffsetOfPoint(node, at);
            const b = o === null ? null : textInkCharBox(node, at, geo);
            if (b && b.onPage) { offset = o; box = b; }
        }
    } finally { cv.style.pointerEvents = was; }
    if (offset === null && Number.isInteger(state.bookTextOffset)) {   // a margin, a gap: the page's first character
        const pt = textPointAtOffset(state.bookTextOffset);
        const b = pt && pt.node ? textInkCharBox(pt.node, pt.offset, geo) : null;
        if (b && b.onPage) { offset = state.bookTextOffset; box = b; }
    }
    if (offset === null) box = textInkPageBox(geo);
    const fs = box.fs;
    return textInkStroke(st.c, textInkQ(st.w * geo.W / fs), st.m, offset === null ? -1 : offset, geo.page,
        st.p.map(pt => {
            const q = [textInkQ((pt[0] * geo.W - box.x) / fs), textInkQ((pt[1] * geo.H - box.y) / fs)];
            if (typeof pt[2] === 'number') q.push(pt[2]);
            return q;
        }));
}

// ---- The canvas over the page ------------------------------------------------------------------------------------
function textInkCanvas() {
    let cv = document.getElementById('text-ink-layer');
    if (!cv) {
        cv = document.createElement('canvas');
        cv.id = 'text-ink-layer'; cv.className = 'ink-layer'; cv.dataset.page = TEXT_INK_PAGE;
        cv.style.width = '100%'; cv.style.height = '100%'; cv.style.zIndex = '5';
        cv.setAttribute('aria-hidden', 'true');
    }
    if (cv.parentElement !== els.container) els.container.appendChild(cv);
    return cv;
}
// Shows the strokes whose character is on the visible page. Called on every page shown (goToPageInChapter), after a
// load, and when the pen is taken. History (Undo/Redo) belongs to one page: it starts again here.
function layoutTextInk() {
    clearTimeout(textInkLayoutTimer); textInkLayoutTimer = 0;
    const cv = document.getElementById('text-ink-layer');
    if (!inkOnText() || state.format === 'cbz' || !state.bookKey || textInkOwner !== state.bookKey) {
        if (cv) cv.hidden = true;
        return;
    }
    if (inkDrawing) { textInkLayoutTimer = setTimeout(layoutTextInk, 150); return; }   // never under a stroke being written
    const chapter = state.currentIndex;
    const all = (state.textInk && state.textInk[chapter]) || [];
    if (!all.length && !state.inkMode) {
        if (cv) { cv.hidden = true; cv.width = 0; cv.height = 0; }
        state.ink[TEXT_INK_PAGE] = []; textInkShown = { chapter, page: state.pageInChapter, aside: [], source: new WeakMap() };
        return;
    }
    const canvas = textInkCanvas(), geo = textInkGeometry();
    canvas.hidden = false;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(geo.W * dpr)), h = Math.max(1, Math.round(geo.H * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const boxes = textInkCharBoxes(all.map(st => st.a), geo);
    const shown = [], aside = [], source = new WeakMap();
    for (const st of all) {
        const box = st.a < 0 ? (st.pg === geo.page ? textInkPageBox(geo) : null) : boxes.get(st.a);
        if (!box || !box.onPage) { aside.push(st); continue; }
        const v = { c: st.c, w: st.w * box.fs / geo.W };
        if (st.m) v.m = 1;
        v.p = st.p.map(pt => {
            const q = [inkQ((box.x + pt[0] * box.fs) / geo.W), inkQ((box.y + pt[1] * box.fs) / geo.H)];
            if (typeof pt[2] === 'number') q.push(pt[2]);
            return q;
        });
        source.set(v, st);
        shown.push(v);
    }
    state.ink[TEXT_INK_PAGE] = shown;
    textInkShown = { chapter, page: geo.page, aside, source };
    inkHistory = {}; inkRedoStack = {};
    redrawInk(canvas, TEXT_INK_PAGE);
    if (state.inkMode) updateInkTools();
}
// The pen was taken in a text book.
function enterTextInk() {
    const cv = textInkCanvas();
    bindInkCanvas(cv, TEXT_INK_PAGE);
    layoutTextInk();
}
// A finger swipe on the writing layer (only the stylus writes) turns the page.
function textInkSwipe(dx, dy) {
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) goNext(); else goPrev();
}
document.getElementById('ink-prev').onclick = () => goPrev();
document.getElementById('ink-next').onclick = () => goNext();
