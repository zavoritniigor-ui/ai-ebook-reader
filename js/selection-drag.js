/* selection-drag.js (split out of selection.js on 2026-11-14 without changes; loads right after selection-highlight.js)
 * — виділення перетягуванням значком по словах
 * (стилус/миша): wordBoundsAt знаходить межі слова під точкою, три
 * pointerdown/pointermove/pointerup-обробники ведуть drag-виділення по словах
 * (а не по системних Range-межах, які "стрибають" цілими рядками),
 * rangeBetweenWords будує остаточний діапазон від першого до останнього
 * зачепленого слова, у правильному документному порядку.
 *
 * Класичний <script src>, продовжує js/selection.js (одна відповідальність,
 * два append-и через розмір — оригінальний файл фізично перемежовував цей
 * блок з navigation.js/pdf-zoom-pan.js кодом між ним і основним блоком
 * selection.js, тому переносився окремим кроком, а не одним шматком).
 */

// ========== ВИДІЛЕННЯ ПЕРЕТЯГУВАННЯМ ЗІ ЗНАЧКОМ ПО СЛОВАХ (стилус / миша) ==========
// Системне виділення має власну зернистість і при переході на наступний рядок
// стрибком захоплює цілі рядки — звідси й "гра в кота і мишку". Тут діапазон
// будується вручну й обидва кінці притягуються до меж слів, тому виділення росте
// рівно по одному слову.

// Утиліта для суворої перевірки: чи потрапляє клік дійсно у межі слова,
// а не у відступ (margin/padding) абзацу на рівні блоку.
function isPointInRects(clientX, clientY, rects, margin = 2) {
    for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.width && r.height &&
            clientX >= r.left - margin && clientX <= r.right + margin &&
            clientY >= r.top - margin && clientY <= r.bottom + margin) {
            return true;
        }
    }
    return false;
}

const IS_WORD_CH = (ch) => ch && /[\p{L}\p{N}'’-]/u.test(ch);
// Index the current block across inline formatting. Rebuild after highlight
// mutations, keeping DOM UTF-16 offsets while matching Unicode code points.
function reflowWordBounds(node, offset) {
    const root = blockAncestorOf(node);
    const pieces = []; let text = '', point = -1;
    function walk(el) {
        if (el.nodeType === Node.TEXT_NODE) {
            if (el === node) point = text.length + offset;
            pieces.push({ node: el, start: text.length, end: text.length + el.length });
            text += el.nodeValue; return;
        }
        if (el.nodeType !== Node.ELEMENT_NODE) return;
        const boundary = el !== root && /^(BR|IMG|P|DIV|SECTION|LI|TD|TH|H[1-6])$/.test(el.tagName);
        if (boundary) text += '\n';
        for (const child of el.childNodes) walk(child);
        if (boundary) text += '\n';
    }
    walk(root);
    if (point < 0) return null;
    for (const match of text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\p{M}\u00ad]*(?:['’\u02bc-][\p{L}\p{N}][\p{L}\p{N}\p{M}\u00ad]*)*/gu)) {
        const start = match.index, end = start + match[0].length;
        if (point < start) return null;
        if (point > end) continue;
        const first = pieces.find(p => start >= p.start && start < p.end);
        const last = pieces.find(p => end > p.start && end <= p.end);
        return first && last ? { node: first.node, start: start - first.start, endNode: last.node, end: end - last.start } : null;
    }
    return null;
}
// anchor (optional): the word a drag started from. A point in the space between two words then takes the word on the anchor's
// side, so a drag never highlights past the point where the finger stopped; without one, the nearer word. With an anchor the
// result is false when the only word found lies beyond the finger (in another text item, on the far side of the space): the
// drag keeps what it has rather than reach a word the finger has not touched.
function wordBoundsAt(clientX, clientY, anchor = null) {
    const r = caretRangeAt(clientX, clientY);
    if (!r || r.startContainer.nodeType !== Node.TEXT_NODE) return null;
    if (state.format !== 'pdf' && els.pages.contains(r.startContainer)) {
        const wBounds = reflowWordBounds(r.startContainer, r.startOffset);
        if (!wBounds) return null;
        const rTest = document.createRange();
        rTest.setStart(wBounds.node, wBounds.start);
        rTest.setEnd(wBounds.endNode || wBounds.node, wBounds.end);
        if (!isPointInRects(clientX, clientY, rTest.getClientRects(), 2)) return null;
        return wBounds;
    }
    const node = r.startContainer, text = node.nodeValue || '';
    // The words of this text item and where they are on screen. The word under the point wins. A point in the space between two
    // words (the caret then sits at the edge of one of them) takes the word on the anchor's side: a drag that ended in the space
    // after its last word used to highlight the next word too («dorée» → «dorée pour»). Without an anchor: the nearer word.
    const words = [];
    for (let i = 0; i < text.length; ) {
        if (!IS_WORD_CH(text[i])) { i++; continue; }
        let j = i; while (j < text.length && IS_WORD_CH(text[j])) j++;
        const probe = document.createRange(); probe.setStart(node, i); probe.setEnd(node, j);
        const box = probe.getBoundingClientRect();
        // only words on the finger's line: the caret of a point beside a line can come from text elsewhere on the page
        const slack = box.height * 0.35;
        if (box.width && clientY >= box.top - slack && clientY <= box.bottom + slack) words.push({ start: i, end: j, left: box.left, right: box.right });
        i = j;
    }
    if (!words.length && /[\p{L}\p{N}]/u.test(text)) return null;
    let s = r.startOffset, e = r.startOffset;
    const hit = words.find(w => w.right > w.left && clientX >= w.left && clientX <= w.right);
    if (hit) { s = hit.start; e = hit.end; }
    else if (words.length) {
        const left = words.filter(w => w.right > w.left && w.right < clientX).pop(), right = words.find(w => w.right > w.left && w.left > clientX);
        let pick = !left ? right : !right ? left : (clientX - left.right <= right.left - clientX ? left : right);
        if (anchor && left && right) {
            try {
                const here = document.createRange(); here.setStart(node, right.start); here.collapse(true);
                const from = document.createRange(); from.setStart(anchor.node, anchor.start); from.collapse(true);
                pick = from.compareBoundaryPoints(Range.START_TO_START, here) < 0 ? left : right;   // a forward drag stops before the space
            } catch (err) { /* the nearer word */ }
        }
        if (pick) { s = pick.start; e = pick.end; }
        // the finger on the punctuation right after the word («illustration.»): it is selected with it, never the next word
        if (pick && pick.right < clientX) {
            let p = pick.end; while (p < text.length && !IS_WORD_CH(text[p]) && !/\s/.test(text[p])) p++;
            if (p > pick.end) {
                const probe = document.createRange(); probe.setStart(node, pick.end); probe.setEnd(node, p);
                if (clientX <= probe.getBoundingClientRect().right + 1) e = p;
            }
        }
        if (pick && anchor) {
            try {
                // the drag's direction: the anchor before or after the finger (its word may be the one picked)
                const here = document.createRange(); here.setStart(node, r.startOffset); here.collapse(true);
                const from = document.createRange(); from.setStart(anchor.node, anchor.start); from.collapse(true);
                const forward = from.compareBoundaryPoints(Range.START_TO_START, here) < 0;
                if (forward ? pick.left > clientX : pick.right < clientX) return false;   // not reached yet
            } catch (err) { /* the word found */ }
        }
    }
    const wBounds = { node, start: s, end: e };
    const rTest = document.createRange();
    rTest.setStart(wBounds.node, wBounds.start);
    rTest.setEnd(wBounds.endNode || wBounds.node, wBounds.end);
    if (!isPointInRects(clientX, clientY, rTest.getClientRects(), state.format === 'pdf' ? 10 : 2)) {
        if (state.format === 'pdf' && node.parentElement) {
            const parentRect = node.parentElement.getBoundingClientRect();
            if (!isPointInRects(clientX, clientY, [parentRect], 14)) return null;
        } else {
            return null;
        }
    }
    return wBounds;
}

let lastDragClientX = 0, lastDragClientY = 0;
let reflowTouchTap = null;
// A finger drag holds on to the LINE its end is on: on a phone a PDF line is ~7 px tall with the next one 8 px below, and a
// fingertip lands a few pixels lower than the reader aims, so the end used to jump to the line below («une cuisinière»
// dragged right-to-left came out «cuisinière o une»). The end moves to another line only once the finger is more than a
// line height away from the middle of the line it is on. { y: the line's middle, h: its height } of the current end word.
let dragLine = null;
function dragLineOf(w) {
    try {
        const r = document.createRange();
        r.setStart(w.node, w.start); r.setEnd(w.endNode || w.node, w.end);
        const b = Array.from(r.getClientRects()).find(x => x.width && x.height) || r.getBoundingClientRect();
        return b && b.height ? { y: b.top + b.height / 2, h: b.height } : null;
    } catch (e) { return null; }
}
let pdfSelectionTouch = null;
// A stylus selects on the mouse path (immediately, no long-press), but browsers give pen drags the same
// touch-action panning as fingers (and on Android also dispatch them as touch events): without a guard the
// first pen move over the PDF became a native scroll, fired pointercancel and dropped the selection.
let penSelectionActive = false;

function cancelDragSelection() {
    reflowTouchTap = null;
    const hadDragHighlight = !!state.dragRange;
    clearTimeout(touchSelTimer); touchSelTimer = null;
    dragSel = null; dragMoved = false; state.dragRange = null; dragLine = null;
    state.touchSelecting = false;
    pdfSelectionTouch = null;
    penSelectionActive = false;
    document.body.classList.remove('touch-selecting');
    els.container.style.touchAction = '';
    if (hadDragHighlight && typeof CSS !== 'undefined' && CSS.highlights) CSS.highlights.delete(SEL_HL_NAME);
}
document.addEventListener('pointercancel', cancelDragSelection);
// Register before touchstart: adding a blocking listener after the hold is too late on
// real touchscreens. Small pre-hold moves must not hand the gesture to native scrolling.
// Touch coordinates remain authoritative even on browsers that coalesce pointer moves.
function startPdfSelectionTouch(e) {
    reflowTouchTap = null;
    if (e.touches.length === 1 && state.format && state.format !== 'pdf' &&
        state.translateMode && !state.inkMode && els.pages.contains(e.target) &&
        !document.body.classList.contains('region-mode') &&
        !e.target.closest('a, button, input, textarea, select, audio, video, [contenteditable]')) {
        const t = e.touches[0];
        reflowTouchTap = { id: t.identifier, x: t.clientX, y: t.clientY, at: Date.now() };
    }
    if (e.touches.length !== 1) { cancelDragSelection(); return; }
    // The validated pointerdown armed this timer. Popup dismissal can unwrap
    // its old highlighted target before touchstart; that detached target no
    // longer passes contains(), but its touch stream still needs ownership.
    if (state.format !== 'pdf' || !touchSelTimer) return;
    const t = e.touches[0];
    pdfSelectionTouch = { id: t.identifier, x: t.clientX, y: t.clientY, blocked: false, scrolling: false };
}
document.addEventListener('touchstart', startPdfSelectionTouch, { passive: true });
function guardTouchSelectionMove(e) {
    if (reflowTouchTap && (e.touches.length !== 1 ||
        Math.hypot(e.touches[0].clientX - reflowTouchTap.x, e.touches[0].clientY - reflowTouchTap.y) > 18)) reflowTouchTap = null;
    if (penSelectionActive && e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();   // the pen's own touch stream: keep it a selection drag
        return;
    }
    const gesture = pdfSelectionTouch;
    if (!gesture) {
        if (state.touchSelecting && e.cancelable && e.touches.length === 1 && els.mainArea.contains(e.target)) e.preventDefault();
        return;
    }
    if (e.touches.length !== 1) { cancelDragSelection(); return; }
    const t = Array.from(e.touches).find(t => t.identifier === gesture.id);
    if (!t) return;
    const dx = t.clientX - gesture.x, dy = t.clientY - gesture.y;
    gesture.x = t.clientX; gesture.y = t.clientY;
    if (!state.touchSelecting && !gesture.scrolling && Math.hypot(t.clientX - dragStartX, t.clientY - dragStartY) > 18) {
        clearTimeout(touchSelTimer); touchSelTimer = null;
        if (!gesture.blocked) { pdfSelectionTouch = null; return; } // ordinary swipe: native scrolling
        // A cancelled jitter move can suppress native scrolling for the entire touch on
        // some engines. Finish only that gesture as a pan; the next swipe stays native.
        gesture.scrolling = true;
    }
    if (!e.cancelable) { cancelDragSelection(); return; }
    e.preventDefault();
    gesture.blocked = true;
    if (gesture.scrolling) {
        els.container.scrollLeft -= dx;
        els.container.scrollTop -= dy;
        state.suppressNextClick = true;
    } else if (state.touchSelecting) {
        updateDragSelection(t);
    }
}
// A previous selection's wrapper can be removed by popup dismissal on this
// pointerdown. Touch events keep that original target for the whole gesture and
// then stop bubbling to document. Retain the same handlers on that target only
// while it is detached; connected targets still use the document handlers once.
function retainPdfSelectionTouchTarget(target) {
    const start = e => { if (!target.isConnected) startPdfSelectionTouch(e); };
    const move = e => { if (!target.isConnected) guardTouchSelectionMove(e); };
    const cleanup = () => {
        target.removeEventListener('touchstart', start);
        target.removeEventListener('touchmove', move);
        target.removeEventListener('touchend', end);
        target.removeEventListener('touchcancel', cancel);
    };
    const end = e => { if (!target.isConnected) finishPdfSelectionTouch(e); cleanup(); };
    const cancel = () => { if (!target.isConnected) cancelDragSelection(); cleanup(); };
    target.addEventListener('touchstart', start, { passive: true });
    target.addEventListener('touchmove', move, { passive: false });
    target.addEventListener('touchend', end, { passive: false });
    target.addEventListener('touchcancel', cancel);
}
document.addEventListener('touchmove', guardTouchSelectionMove, { passive: false });
document.addEventListener('touchcancel', cancelDragSelection);
els.mainArea.addEventListener('contextmenu', e => {
    if (state.touchSelecting || pdfSelectionTouch) e.preventDefault();
});
document.addEventListener('pointerup', e => {
    if (state.touchSelecting || dragSel) {
        const cx = e.clientX || lastDragClientX || dragStartX;
        const cy = e.clientY || lastDragClientY || dragStartY;
        commitDragSelection(cx, cy);
    } else if (!els.mainArea.contains(e.target)) {
        cancelDragSelection();
    }
});
window.addEventListener('blur', cancelDragSelection);

let dragSel = null;   // { node, start, end } — слово, з якого почалось виділення
let dragStartX = 0, dragStartY = 0, dragMoved = false, touchSelTimer = null;

// The start screen (no book open) is not a text to translate: its buttons, the app's name and the list of recent books.
const onStartScreen = (target) => !state.format || !!target?.closest?.('#home-screen, #recent-books');

els.mainArea.addEventListener('pointerdown', (e) => {
    // A swipe may emit no compatibility click. Its old guard must not consume
    // the next deliberate tap; a fresh primary down starts a new gesture.
    if (e.pointerType === 'touch' && e.isPrimary !== false && els.pages.contains(e.target)) state.suppressNextClick = false;
    if (state.touchJustCommitted && Date.now() - state.touchJustCommitted < 700) return;
    if (e.pointerType === 'touch' && !e.isPrimary) { cancelDragSelection(); return; }
    if (state.format === 'pdf' && !els.container.contains(e.target)) return;
    if (state.inkMode) return;
    if (!state.translateMode) return;
    if (e.button !== 0) return;
    if (onStartScreen(e.target)) return;
    if (e.target.closest('#word-tooltip') || e.target.closest('.side-panel') ||
        e.target.closest('.pdf-audio-marker') || e.target.closest('#audio-player') || e.target.closest('#book-audio-dialog') ||
        e.target.closest('#tts-controls') || e.target.closest('nav') || e.target.closest('header')) return;

    cancelDragSelection();
    // Unwrap the previous PDF selection before retaining the new drag's text
    // node. The document's popup-dismiss listener runs later in bubbling order;
    // letting it unwrap afterwards disconnects the mouse/pen anchor.
    if (e.pointerType !== 'touch' && state.selSpans.length) clearSelectionHighlight();
    dragStartX = e.clientX; dragStartY = e.clientY; dragMoved = false;

    if (e.pointerType === 'touch') {
        if (state.format === 'pdf') retainPdfSelectionTouchTarget(e.target);
        // Пальцем виділяємо через УТРИМАННЯ: короткий рух пальцем — це гортання
        // сторінки, і плутати ці два жести не можна. Потримав — почалось виділення.
        clearTimeout(touchSelTimer);
        const px = e.clientX, py = e.clientY;
        touchSelTimer = setTimeout(() => {
            touchSelTimer = null;
            if (state.format === 'pdf' && typeof pdfPointers !== 'undefined' && pdfPointers.size > 1) return;
            let w = wordBoundsAt(px, py);
            if (!w && state.format === 'pdf') {
                for (const dy of [-8, 8, -16, 16, -24, 24]) {
                    w = wordBoundsAt(px, py + dy);
                    if (w) break;
                }
                if (!w) {
                    for (const dx of [-8, 8, -16, 16]) {
                        w = wordBoundsAt(px + dx, py);
                        if (w) break;
                    }
                }
            }
            if (!w) return;
            dragSel = w;
            dragLine = dragLineOf(w);
            dragMoved = true;                 // підсвітка з першого ж слова
            state.touchSelecting = true;      // свайпи гортання на час виділення вимкнені
            document.body.classList.add('touch-selecting');
            state.suppressNextClick = true;
            // Забороняємо браузеру трактувати рух як прокрутку — інакше він
            // перехопить жест і виділення обірветься на першому ж русі пальця.
            els.container.style.touchAction = 'none';
            if (navigator.vibrate) navigator.vibrate(12);
            const r = rangeBetweenWords(w, w);
            if (r) {
                state.dragRange = r;
                if (typeof Highlight !== 'undefined' && window.CSS && CSS.highlights) {
                    try {
                        if (state.format === 'pdf') {
                            resolveCanonicalPdfSelection(r, { isDragging: true });
                            if (r._pdfPieces && r._pdfPieces.length) {
                                const pieceRanges = r._pdfPieces.map(p => {
                                    const pr = document.createRange();
                                    pr.setStart(p.node, p.start);
                                    pr.setEnd(p.node, p.end);
                                    return pr;
                                });
                                CSS.highlights.set(SEL_HL_NAME, new Highlight(...pieceRanges));
                            } else {
                                CSS.highlights.set(SEL_HL_NAME, new Highlight(r));
                            }
                        } else {
                            CSS.highlights.set(SEL_HL_NAME, new Highlight(r));
                        }
                    } catch (err) {}
                }
            }
        }, 380);
        return;
    }

    // Миша й перо: виділення починається одразу, поріг руху нижче.
    let w = wordBoundsAt(e.clientX, e.clientY);
    if (!w && state.format === 'pdf') {
        for (const dy of [-6, 6, -12, 12]) {
            w = wordBoundsAt(e.clientX, e.clientY + dy);
            if (w) break;
        }
    }
    if (!w) return;
    dragSel = w;
    penSelectionActive = e.pointerType === 'pen';
    e.preventDefault();               // глушимо системне виділення разом з його стрибками
});

els.mainArea.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && pdfSelectionTouch) return;
    updateDragSelection(e);
});
function updateDragSelection(e) {
    // Палець зрушив раніше, ніж спрацювало утримання — це гортання, не виділення.
    // Використовуємо радіальний поріг (18px) для ємнісних тачскринів планшетів.
    if (touchSelTimer && !dragSel && Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 18) {
        clearTimeout(touchSelTimer); touchSelTimer = null;
    }
    if (state.touchSelecting && e.cancelable) e.preventDefault();
    if (!dragSel) return;
    lastDragClientX = e.clientX; lastDragClientY = e.clientY;
    // Поріг руху: тремтіння пера чи миші під час звичайного тапу не має вважатись
    // протягуванням — інакше слово підсвічувалось зеленим (виділення) замість сірого.
    if (!dragMoved) {
        if (Math.abs(e.clientX - dragStartX) < 6 && Math.abs(e.clientY - dragStartY) < 6) return;
        dragMoved = true;
    }
    // A finger near the line the end is on stays on that line (see dragLine).
    const y = state.touchSelecting && dragLine && Math.abs(e.clientY - dragLine.y) < dragLine.h ? dragLine.y : e.clientY;
    let w = wordBoundsAt(e.clientX, y, dragSel);
    if (w === false) return;   // the finger is in the space before the next word: the selection stays as it is
    if (!w && state.format === 'pdf' && dragSel) {
        // between two lines: the nearest line above or below, but never a word the finger has not reached on it
        for (const dy of [-8, 8, -16, 16, -24, 24]) {
            w = wordBoundsAt(e.clientX, y + dy, dragSel);
            if (w !== null) break;
        }
    }
    if (!w) return;
    const r = rangeBetweenWords(dragSel, w);
    if (!r) return;
    state.dragRange = r;
    if (state.touchSelecting) dragLine = dragLineOf(w) || dragLine;
    // ПІД ЧАС протягування підсвічуємо лише накладним шаром: обгортання в span
    // змінює DOM, розрізає текстові вузли — і вузол, з якого почалось виділення,
    // ставав недійсним. Саме через це виділення мишею й перестало працювати.
    if (typeof Highlight !== 'undefined' && window.CSS && CSS.highlights) {
        try {
            if (state.format === 'pdf') {
                resolveCanonicalPdfSelection(r, { isDragging: true });
                if (r._pdfPieces && r._pdfPieces.length) {
                    const pieceRanges = r._pdfPieces.map(p => {
                        const pr = document.createRange();
                        pr.setStart(p.node, p.start);
                        pr.setEnd(p.node, p.end);
                        return pr;
                    });
                    CSS.highlights.set(SEL_HL_NAME, new Highlight(...pieceRanges));
                } else {
                    CSS.highlights.set(SEL_HL_NAME, new Highlight(r));
                }
            } else {
                CSS.highlights.set(SEL_HL_NAME, new Highlight(r));
            }
        } catch (err) {}
    }
    window.getSelection()?.removeAllRanges();
}

function commitDragSelection(clientX, clientY) {
    clearTimeout(touchSelTimer); touchSelTimer = null;
    penSelectionActive = false;
    if (state.touchSelecting) {
        touchStartTime = 0; // pointerup precedes touchend: do not turn the page after selection
        state.touchSelecting = false;
        document.body.classList.remove('touch-selecting');
        els.container.style.touchAction = (state.format === 'pdf') ? '' : 'pan-y';
    }
    window.getSelection()?.removeAllRanges();
    if (!dragSel) return;
    const start = dragSel; dragSel = null; dragLine = null;
    const r = state.dragRange;
    state.dragRange = null;
    // Протягування не відбулось (кінець там само, де початок) — лишаємо звичайному
    // обробнику кліку, щоб слово опрацювалось як тап зі словниковою статтею.
    if (!r) return;
    let text;
    let canonical = null;
    if (state.format === 'pdf') {
        try {
            canonical = resolveCanonicalPdfSelection(r, { sourceType: 'phrase_translation' });
        } catch (err) {}
        text = canonical ? canonical.text : pdfRangeText(r).trim();
        state.lastGrammarSourceText = (canonical && canonical.grammarText !== text) ? canonical.grammarText : null;
    } else {
        text = r.toString().trim();
        state.lastGrammarSourceText = null;
        state.canonicalSelection = null;
    }
    if (!text) return;

    // Capture source occurrence IDs while the drag Range still references the
    // untouched reader text layer.
    const helpContext = recordHelpForSpan(r, 'phrase_translation');
    state.selectionContext = selectionContextSentence(r, text);
    state.suppressNextClick = true;   // інакше слідом спрацює ще й тап по слову
    state.ctxPanelLang = '';
    // Одне слово — звичайний шлях (зі словниковою статтею); кілька — як фрагмент.
    state.lastTapPoint = { x: clientX, y: clientY };
    state.expandLevel = 0;
    state.lastSelectedRange = r.cloneRange();
    if (r._pdfPieces) state.lastSelectedRange._pdfPieces = r._pdfPieces;
    if (Object.prototype.hasOwnProperty.call(r, 'toString')) state.lastSelectedRange.toString = r.toString;
    // Протягування завершено — тепер можна перемалювати точно (у PDF обгорткою).
    showSelectionHighlight(r);
    state.lastWordNode = null; state.ctxSentence = text.slice(0, 400);
    state.lastSelectionText = text;
    let rect = canonical?.rect || null;
    if (!rect) {
        try { const b = r.getBoundingClientRect(); if (b && (b.width || b.height)) rect = b; } catch (err) {}
    }
    state.touchJustCommitted = Date.now();
    state.bookSpeechTap = bsSpeakTap(r.startContainer, text, false);   // the book's narration (js/book-speech.js)
    handleWordOrSelection(text, clientX, clientY, rect, helpContext, 'phrase_translation');
}

function finishPdfSelectionTouch(e) {
    const tap = reflowTouchTap; reflowTouchTap = null;
    const gesture = pdfSelectionTouch;
    pdfSelectionTouch = null;
    clearTimeout(touchSelTimer); touchSelTimer = null;
    if (gesture?.blocked && e.cancelable) e.preventDefault();
    if (state.touchSelecting) {
        if (e.cancelable) e.preventDefault();
        if (dragSel && state.dragRange) {
            const touch = e.changedTouches?.[0];
            commitDragSelection(touch ? touch.clientX : (lastDragClientX || dragStartX), touch ? touch.clientY : (lastDragClientY || dragStartY));
        }
    }
    const touch = e.changedTouches?.[0];
    // A browser may omit/delay the compatibility click on EPUB's inline text.
    // Handle this completed short tap once, while retaining its user activation;
    // cancelling touchend prevents a second lookup from a later native click.
    if (tap && touch && touch.identifier === tap.id && e.touches.length === 0 &&
        e.changedTouches.length === 1 && e.cancelable && !e.defaultPrevented &&
        Date.now() - tap.at < 380 && Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) <= 18 &&
        state.format !== 'pdf' && state.translateMode && !state.inkMode && !state.suppressNextClick &&
        !state.touchSelecting && !(state.touchJustCommitted && Date.now() - state.touchJustCommitted < 700) &&
        els.pages.contains(e.target) && !document.body.classList.contains('region-mode')) {
        e.preventDefault();
        const alignment = alignmentSourceAt(touch.clientX, touch.clientY);
        if (alignment !== null) flashAlignment(alignment);
        else handleReadingClick({ target: e.target, clientX: touch.clientX, clientY: touch.clientY });
    }
}
document.addEventListener('touchend', finishPdfSelectionTouch, { passive: false });

// The sentence a dragged selection stands in, when the selection is a part of it: the translation then renders only the
// selected words, in the sense they have in that sentence (js/translation.js). '' for a whole sentence or several.
function selectionContextSentence(range, text) {
    try {
        // a PDF selection's first piece in reading order (the DOM order of its range can differ)
        const piece = range._pdfPieces && range._pdfPieces[0];
        let probe = range;
        if (piece) { probe = document.createRange(); probe.setStart(piece.node, piece.start); probe.setEnd(piece.node, piece.end); }
        const first = Array.from(probe.getClientRects()).find(b => b.width && b.height);
        if (!first) return '';
        const sentence = sentenceRangeAt(first.left + Math.min(4, first.width / 2), first.top + first.height / 2);
        const whole = sentence ? sentence.toString().replace(/\s+/g, ' ').trim() : '';
        const key = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
        return whole && key(whole) !== key(text) && key(whole).includes(key(text)) ? whole.slice(0, 400) : '';
    } catch (e) { return ''; }
}

// Діапазон від слова A до слова B у правильному порядку, з межами по словах.
function rangeBetweenWords(a, b) {
    try {
        const probe = document.createRange();
        probe.setStart(a.node, a.start);
        probe.setEnd(a.node, a.start);
        const other = document.createRange();
        other.setStart(b.node, b.start);
        other.setEnd(b.node, b.start);
        // Визначаємо, яке слово раніше в документі.
        const aFirst = probe.compareBoundaryPoints(Range.START_TO_START, other) <= 0;
        const first = aFirst ? a : b, last = aFirst ? b : a;
        const r = document.createRange();
        r.setStart(first.node, first.start);
        r.setEnd(last.endNode || last.node, last.end);
        return r.collapsed ? null : r;
    } catch (e) { return null; }
}


/* selection.js (продовження) — головний тап-обробник "переклад слова АБО гортання
 * сторінки": у режимі "Вивчення" тап по слову шукає слово/речення й відкриває
 * переклад (selectWordAtPoint/sentenceRangeAt/handleWordOrSelection); якщо слова
 * під пальцем нема (чи режим вимкнений) — тап трактується як гортання сторінки
 * за зоною екрана (goPrev/goNext) або перемикач "immersive mode".
 *
 * Дійсно мішана відповідальність (selection+navigation+UI) — лишається як ОДИН
 * listener (не можна розділити без дублювання проверок e.target.closest(...) і
 * порядку early-return), перенесена в selection.js, бо тап-по-слову — це її
 * власний пріоритет за коментарем у самому коді. goPrev/goNext/handleWordOrSelection
 * ще визначені в index.html (навігація/ui-tooltip.js — майбутні кроки) — це safe,
 * бо виклик відбувається лише в момент реального кліку користувача, вже ПІСЛЯ
 * того, як весь застосунок довантажився, а не одразу при виконанні цього файлу.
 *
 * Перевірено окремо: інший click-listener на els.mainArea (index.html, capture-
 * фаза, придушення кліку під час PDF-жестів) спрацьовує РАНІШЕ цього незалежно
 * від порядку реєстрації чи файлу — капчур-фаза завжди випереджає bubble-фазу
 * для одного й того самого елемента, коли реальна ціль кліку — його нащадок.
 */

els.mainArea.addEventListener('click', handleReadingClick);
function handleReadingClick(e) {
    if (e.target.closest('#pdf-scrubber')) return;
    if (state.inkMode) return;   // у режимі письма тап малює, а не перекладає
    if (onStartScreen(e.target)) return;   // стартовий екран: кнопки, назви, список книг — не текст для перекладу
    if (state.suppressNextClick) { state.suppressNextClick = false; return; } // клік після свайпу — ігноруємо
    if(e.target.closest('#word-tooltip') || e.target.closest('.side-panel') || e.target.closest('nav') || e.target.closest('#menu-handle') || e.target.closest('#footer-handle') || e.target.closest('#tts-controls') || e.target.closest('.pdf-audio-marker') || e.target.closest('#audio-player') || e.target.closest('#book-audio-dialog') || e.target.closest('.pdf-link-annotation')) return;   // посилання PDF веде на свою сторінку, це не дотик по слову
    // Зона язичка меню (лівий верхній кут) — тут ніколи не спрацьовує переклад слова. У нижньому ряду читання ☰ стоїть унизу,
    // і тоді кут не потрібен (інакше ігнорувалася б уся ліва частина сторінки).
    if (els.menuHandle) {
        const h = els.menuHandle.getBoundingClientRect();
        if (h.top < innerHeight / 2 && e.clientX <= h.right && e.clientY <= h.bottom) return;
    }
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        if (r.startContainer && !document.contains(r.startContainer)) sel.removeAllRanges();
        else if (sel.toString().trim().length > 0) return;
    }

    if (state.translateMode) {
        let word = selectWordAtPoint(e.clientX, e.clientY);
        if (word) {
            // Resolve the exact occurrence before phrasal-verb expansion changes the
            // lookup text. Repeated taps remain the same source occurrence.
            const helpContext = recordHelpForSpan(state.lastWordNode, 'word_tap');
            // Новий тап скидає підсвітку попереднього фрагмента.
            clearSelectionHighlight();
            state.ctxPanelLang = '';
            state.lastSelectedRange = null;
            state.ctxSentenceRange = null;
            state.lastTapPoint = { x: e.clientX, y: e.clientY };
            state.expandLevel = 0;

            // Речення, у якому стоїть слово, потрібне двічі: за ним визначається мова
            // (у двомовній книзі сторінка не показник) і в ньому шукаються фразові
            // дієслова англійської.
            let lookup = word;
            try {
                const sr = sentenceRangeAt(e.clientX, e.clientY);
                state.ctxSentence = sr ? sr.toString().trim().slice(0, 400) : '';
                if (sr) {
                    const cr = sr.cloneRange();
                    if (sr._pdfPieces) cr._pdfPieces = sr._pdfPieces.map(p => ({ ...p }));
                    if (Object.prototype.hasOwnProperty.call(sr, 'toString')) cr.toString = sr.toString;
                    state.ctxSentenceRange = cr;   // для розбору речення прямо в тексті (js/sentence-structure.js)
                } else {
                    state.ctxSentenceRange = null;
                }
                if (sr && typeof markReadingPoint === 'function') markReadingPoint(sr);   // стрічка «місце читання»
                if (state.ctxSentence && detectLang(state.ctxSentence).startsWith('en')) {
                    const phrasal = detectPhrasalVerb(word, state.ctxSentence);
                    if (phrasal) lookup = phrasal;
                }
            } catch (err) { state.ctxSentence = ''; state.ctxSentenceRange = null; }
            let rect = null;
            try { if (state.lastWordNode && state.lastWordNode.getBoundingClientRect) rect = state.lastWordNode.getBoundingClientRect(); } catch (err) {}
            // The book's own narration reads a covered word; the app's voice then stays silent (translation.js).
            state.bookSpeechTap = bsSpeakTap(state.lastWordNode, word, true);
            handleWordOrSelection(lookup, e.clientX, e.clientY, rect, helpContext, 'word_tap');
            state.tooltipJustClosed = false; // успішний виклик перекладу — скасовуємо блокування
            return;
        }
        if (state.format === 'pdf') return; // клік в режимі вивчення по PDF не повинен ще й гортати сторінку
    }

    if (state.tooltipJustClosed) {
        state.tooltipJustClosed = false;
        return; // тапнули на чисте поле, щоб ТІЛЬКИ закрити вікно перекладу (не гортати сторінку)
    }

    const rect = els.mainArea.getBoundingClientRect(); const x = e.clientX - rect.left;
    if (x < rect.width * 0.20) goPrev(); 
    else if (x > rect.width * 0.80) goNext();
    // The middle of the page shows the «◀ page ▶» bar for a few seconds (as in other readers); the menu has its ☰ button.
    else openFooterMenu();
}
