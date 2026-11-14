/* selection-highlight.js — highlighting the selected fragment (PDF span pieces, wrap/unwrap), PDF selection anchors,
 * word-to-sentence ranges, selectRangeAndTranslate, selectWordAtPoint. Split out of selection.js on 2026-11-14 without changes. */
// ========== ПІДСВІТКА ВИДІЛЕНОГО ФРАГМЕНТА ==========
// У PDF кожен фрагмент рядка має CSS-трансформацію (scaleX) для точного суміщення
// з намальованою сторінкою. Накладна підсвітка ::highlight() цієї трансформації не
// враховує — звідси й сильне зміщення. Тому в PDF підсвічуємо так само, як сірі
// слова: обгортаємо текст у span всередині того самого фрагмента, і він рухається
// разом із ним.
function pdfOffsetInSpan(pdfSpan, targetNode) {
    let offset = 0, n;
    const w = document.createTreeWalker(pdfSpan, NodeFilter.SHOW_TEXT);
    while ((n = w.nextNode())) {
        if (n === targetNode) return offset;
        offset += n.nodeValue.length;
    }
    return 0;
}
function pdfResolveSpanPieces(pdfSpan, spanStart, spanEnd) {
    const out = [];
    let offset = 0, n;
    const w = document.createTreeWalker(pdfSpan, NodeFilter.SHOW_TEXT);
    while ((n = w.nextNode())) {
        const len = n.nodeValue.length;
        const from = Math.max(0, spanStart - offset);
        const to = Math.min(len, spanEnd - offset);
        if (to > from) {
            out.push({ node: n, start: from, end: to, span: pdfSpan, spanStart: offset + from, spanEnd: offset + to });
        }
        offset += len;
    }
    return out;
}
function wrapRangeInSpans(range, className) {
    const spans = [];
    if (range._pdfPieces) {
        for (const p of range._pdfPieces.slice().reverse()) {
            const part = document.createRange();
            part.setStart(p.node, p.start); part.setEnd(p.node, p.end);
            spans.unshift(...wrapRangeInSpans(part, className));
        }
        return spans;
    }
    const root = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: n => (n.nodeValue && range.intersectsNode(n)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const nodes = [];
    let n; while (n = walker.nextNode()) nodes.push(n);
    for (const node of nodes) {
        const from = (node === range.startContainer) ? range.startOffset : 0;
        const to = (node === range.endContainer) ? range.endOffset : node.nodeValue.length;
        if (to <= from) continue;
        try {
            const r = document.createRange();
            r.setStart(node, from); r.setEnd(node, to);
            const s = document.createElement('span');
            s.className = className;
            r.surroundContents(s);
            spans.push(s);
        } catch (e) { /* фрагмент не обгортається — пропускаємо */ }
    }
    return spans;
}
function unwrapSpans(spans) {
    (spans || []).forEach(s => {
        if (!s.parentNode) return;
        const parent = s.parentNode;
        while (s.firstChild) parent.insertBefore(s.firstChild, s);
        parent.removeChild(s);
        parent.normalize();
    });
    for (const r of [state.lastSelectedRange, state.ctxSentenceRange]) {
        if (!r || !r._pdfPieces || !r._pdfPieces.length) continue;
        const nextPieces = [];
        let changed = false;
        for (const p of r._pdfPieces) {
            if (p.node && p.node.isConnected && p.node.nodeValue && p.end <= p.node.nodeValue.length) {
                nextPieces.push(p);
            } else if (p.span && p.span.isConnected && typeof p.spanStart === 'number' && typeof p.spanEnd === 'number') {
                const resolved = pdfResolveSpanPieces(p.span, p.spanStart, p.spanEnd);
                if (resolved.length) { nextPieces.push(...resolved); changed = true; }
            }
        }
        if (changed && nextPieces.length) {
            r._pdfPieces = nextPieces;
            const first = nextPieces[0], last = nextPieces.at(-1);
            try { r.setStart(first.node, first.start); r.setEnd(last.node, last.end); } catch (e) {}
        }
    }
}
function capturePdfSelectionAnchor(range) {
    if (!range || state.format !== 'pdf') return null;
    const startNode = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
    const wrapper = startNode?.closest ? startNode.closest('.pdf-page-wrapper') : null;
    if (!wrapper) return null;
    const pageNum = Number(wrapper.dataset.page);
    const layer = wrapper.querySelector('.pdf-text-layer');
    if (!layer) return null;
    const allSpans = pdfTextSpans(layer);
    const text = state.lastSelectionText || (range.toString ? range.toString().trim() : '');

    if (range._pdfPieces && range._pdfPieces.length > 0) {
        const pieces = [];
        for (const p of range._pdfPieces) {
            const spanIdx = p.span ? allSpans.indexOf(p.span) : -1;
            if (spanIdx >= 0) {
                pieces.push({ spanIndex: spanIdx, start: p.start, end: p.end });
            }
        }
        if (pieces.length > 0) {
            return { pageNum, pieces, text };
        }
    }

    const endNode = range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer;
    const startSpan = startNode?.closest ? startNode.closest('span') : null;
    const endSpan = endNode?.closest ? endNode.closest('span') : null;
    const startSpanIndex = startSpan ? allSpans.indexOf(startSpan) : -1;
    const endSpanIndex = endSpan ? allSpans.indexOf(endSpan) : -1;

    if (startSpanIndex >= 0 && endSpanIndex >= 0) {
        return {
            pageNum,
            startSpanIndex,
            startOffset: range.startOffset,
            endSpanIndex,
            endOffset: range.endOffset,
            text
        };
    }
    return { pageNum, text };
}

function restorePdfSelection(pageNum, wrapperEl) {
    const anchor = state.activeSelectionAnchor;
    if (!anchor || anchor.pageNum !== pageNum) return;
    if (!state.tooltipPersistent && els.tooltip.style.display === 'none') {
        state.activeSelectionAnchor = null;
        return;
    }
    const layer = wrapperEl.querySelector('.pdf-text-layer');
    if (!layer) return;
    const allSpans = pdfTextSpans(layer);
    if (!allSpans.length) return;

    let newRange = null;
    let targetSpans = [];

    if (anchor.pieces && anchor.pieces.length > 0) {
        const reconstructedPieces = [];
        for (const p of anchor.pieces) {
            const s = allSpans[p.spanIndex];
            if (!s) continue;
            targetSpans.push(s);
            const walker = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
            const node = walker.nextNode() || s.firstChild || s;
            const textLen = (node.nodeValue || s.textContent || '').length;
            reconstructedPieces.push({
                node,
                start: Math.min(p.start, textLen),
                end: Math.min(p.end, textLen),
                span: s
            });
        }
        if (reconstructedPieces.length > 0) {
            newRange = document.createRange();
            newRange._pdfPieces = reconstructedPieces;
            const first = reconstructedPieces[0], last = reconstructedPieces.at(-1);
            newRange.setStart(first.node, first.start);
            newRange.setEnd(last.node, last.end);
            newRange.toString = () => anchor.text;
        }
    } else if (anchor.startSpanIndex >= 0 && anchor.endSpanIndex >= 0) {
        const sSpan = allSpans[anchor.startSpanIndex];
        const eSpan = allSpans[anchor.endSpanIndex];
        if (sSpan && eSpan) {
            const sNode = sSpan.firstChild || sSpan;
            const eNode = eSpan.firstChild || eSpan;
            newRange = document.createRange();
            newRange.setStart(sNode, Math.min(anchor.startOffset, (sNode.nodeValue || '').length));
            newRange.setEnd(eNode, Math.min(anchor.endOffset, (eNode.nodeValue || '').length));
            newRange.toString = () => anchor.text;
            targetSpans = allSpans.slice(anchor.startSpanIndex, anchor.endSpanIndex + 1);
        }
    }

    if (!newRange && anchor.text) {
        const matchingSpans = allSpans.filter(s => s.textContent.trim() && anchor.text.includes(s.textContent.trim()));
        if (matchingSpans.length > 0) {
            const pieces = matchingSpans.map(s => ({
                node: s.firstChild || s,
                start: 0,
                end: (s.textContent || '').length,
                span: s
            }));
            newRange = document.createRange();
            newRange._pdfPieces = pieces;
            newRange.setStart(pieces[0].node, pieces[0].start);
            newRange.setEnd(pieces.at(-1).node, pieces.at(-1).end);
            newRange.toString = () => anchor.text;
            targetSpans = matchingSpans;
        }
    }

    if (newRange) {
        state.lastSelectedRange = newRange;
        if (state.canonicalSelection) {
            state.canonicalSelection.range = newRange;
            state.canonicalSelection.spans = targetSpans;
        }
        unwrapSpans(state.selSpans);
        state.selSpans = wrapRangeInSpans(newRange, 'sel-word');
    }
}

function showSelectionHighlight(range) {
    const startEl = range?.startContainer?.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range?.startContainer;
    const inPdfBook = state.format === 'pdf' && !!startEl?.closest?.('.pdf-page-wrapper, .pdf-text-layer');
    const origText = range ? range.toString() : '';
    let anchor = null;
    if (inPdfBook) {
        anchor = capturePdfSelectionAnchor(range);
    }
    const savedCanonical = state.canonicalSelection;
    clearSelectionHighlight();
    if (savedCanonical) state.canonicalSelection = savedCanonical;
    if (anchor) state.activeSelectionAnchor = anchor;
    if (inPdfBook) {
        state.selSpans = wrapRangeInSpans(range, 'sel-word');
        const pieces = state.selSpans.map(s => {
            const node = s.firstChild;
            const span = s.parentElement?.closest('.pdf-text-layer > span, .markedContent > span') || s.parentElement?.closest('span') || s.parentElement;
            const spanStart = span && node ? pdfOffsetInSpan(span, node) : 0;
            const len = node?.nodeValue ? node.nodeValue.length : 0;
            return { node, start: 0, end: len, span, spanStart, spanEnd: spanStart + len };
        }).filter(p => p.node && p.end > p.start);
        if (pieces.length) {
            range._pdfPieces = pieces;
            try {
                range.setStart(pieces[0].node, pieces[0].start);
                range.setEnd(pieces.at(-1).node, pieces.at(-1).end);
            } catch (e) {}
            if (origText) range.toString = () => origText;
            if (state.lastSelectedRange) {
                state.lastSelectedRange = range.cloneRange();
                state.lastSelectedRange._pdfPieces = pieces.map(p => ({ ...p }));
                if (origText) state.lastSelectedRange.toString = () => origText;
            }
        }
        return;
    }
    if (typeof Highlight !== 'undefined' && window.CSS && CSS.highlights) {
        try { CSS.highlights.set(SEL_HL_NAME, new Highlight(range)); } catch (e) {}
    }
}
// Знімає підсвітку виділеного фрагмента (при закритті вікна перекладу).
function clearSelectionHighlight() {
    clearAlignment();
    structToken++; cancelAsyncTasks(['structure', 'structureDeep']); clearStructureHighlights();
    if (typeof CSS !== 'undefined' && CSS.highlights) CSS.highlights.delete(SEL_HL_NAME);
    unwrapSpans(state.selSpans);
    state.selSpans = [];
    state.lastSelectionText = null;
    state.activeSelectionAnchor = null;
    state.canonicalSelection = null;
}
// Від КЛІКНУТОГО СЛОВА до кінця речення (до крапки) — саме те, що робить
// кнопка виділення у вікні перекладу.
function wordToSentenceEndRangeAt(clientX, clientY) {
    const caret = anchorCaret(clientX, clientY);
    if (!caret || caret.startContainer.nodeType !== Node.TEXT_NODE) return null;
    const sentence = sentenceRangeAt(clientX, clientY);
    if (!sentence) return null;

    // Початок — від початку слова, на яке тапнули (а не від середини).
    const textNode = caret.startContainer;
    const text = textNode.nodeValue || '';
    const isWordChar = (ch) => ch && /[\p{L}\p{N}'’-]/u.test(ch);
    let start = caret.startOffset;
    while (start > 0 && isWordChar(text[start - 1])) start--;

    try {
        const r = document.createRange();
        if (sentence._pdfPieces) {
            const idx = sentence._pdfPieces.findIndex(p => p.node === textNode && start < p.end);
            if (idx < 0) return sentence;
            r._pdfPieces = sentence._pdfPieces.slice(idx).map(p => ({ ...p }));
            r._pdfPieces[0].start = Math.max(start, r._pdfPieces[0].start);
            const first = r._pdfPieces[0], last = r._pdfPieces.at(-1);
            r.setStart(first.node, first.start); r.setEnd(last.node, last.end);
            const joined = r._pdfPieces.map((p, i, all) => (i && p.span !== all[i - 1].span ? ' ' : '') + p.node.nodeValue.slice(p.start, p.end)).join('').trim();
            r.toString = () => joined;
            return r;
        }

        r.setStart(textNode, start);
        r.setEnd(sentence.endContainer, sentence.endOffset);
        if (r.collapsed) return sentence;
        // PDF: sentence._pdfNodes зберігає той самий візуальний порядок фрагментів, на
        // якому побудований .toString() у sentenceRangeAt. Без цього r.toString() тут
        // знову пішов би DOM/content-stream порядком і міг притягнути чужу колонку.
        if (sentence._pdfNodes) {
            const nodes = sentence._pdfNodes;
            const idx = nodes.indexOf(textNode);
            const parts = [text.slice(start)];
            if (idx >= 0) for (let i = idx + 1; i < nodes.length; i++) parts.push(nodes[i].nodeValue || '');
            const joined = parts.join('').trim();
            r.toString = () => joined;
        }
        return r;
    } catch (e) { return sentence; }
}

function selectRangeAndTranslate(range, clientX, clientY, sourceType = 'phrase_translation') {
    if (!range) return false;
    const text = range.toString().trim();
    if (!text) return false;
    state.ctxPanelLang = '';
    // Resolve source offsets before PDF highlighting splits the text-layer nodes.
    const helpContext = recordHelpForSpan(range, sourceType);
    // Власна підсвітка, а не системне виділення: воно викликає вікно пошуку Chrome.
    showSelectionHighlight(range);
    state.lastSelectionText = text;
    state.ctxSentence = text.slice(0, 400);
    state.lastSelectedRange = range.cloneRange();
    if (range._pdfPieces) state.lastSelectedRange._pdfPieces = range._pdfPieces.map(p => ({ ...p }));
    if (Object.prototype.hasOwnProperty.call(range, 'toString')) state.lastSelectedRange.toString = range.toString;
    state.lastTapPoint = { x: clientX, y: clientY };
    state.programmaticSelectionAt = Date.now();
    // Межі самого виділення — за ними вікно перекладу стане над або під реченням.
    let rect = null;
    try { const r = range.getBoundingClientRect(); if (r && (r.width || r.height)) rect = r; } catch (e) {}
    state.bookSpeechTap = bsSpeakTap(state.lastSelectedRange.startContainer, text, false);   // the book's narration (js/book-speech.js)
    handleWordOrSelection(text, clientX, clientY, rect, helpContext, sourceType);
    return true;
}

// The characters of a PDF text item (the layer's span), in order, with their text nodes (earlier highlights split a span's text).
function pdfSpanChars(span) {
    const chars = [], walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) for (let i = 0; i < (node.nodeValue || '').length; i++) chars.push({ node, offset: i, ch: node.nodeValue[i] });
    return chars;
}
// The whole word around a caret in a PDF text layer, across the text items it is cut into (an item that continues the word
// starts where the previous one ends, on the same line: pdfSpansContinueWord, the rule the sentences use). Returns
// { word, pieces: [{ node, start, end }] } or null.
function pdfWordPieces(textNode, offset) {
    const layer = textNode.parentElement && textNode.parentElement.closest('.pdf-text-layer');
    if (!layer) return null;
    const spans = pdfTextSpans(layer), own = spans.findIndex(sp => sp.contains(textNode));
    if (own < 0) return null;
    const isWordChar = ch => !!ch && /[\p{L}\p{N}'’-]/u.test(ch);
    const ownChars = pdfSpanChars(spans[own]);
    let at = ownChars.findIndex(c => c.node === textNode && c.offset === offset);
    if (at < 0) at = ownChars.findIndex(c => c.node === textNode && c.offset === offset - 1);
    if (at < 0) return null;
    if (!isWordChar(ownChars[at] && ownChars[at].ch) && isWordChar(ownChars[at - 1] && ownChars[at - 1].ch)) at--;   // the caret just after the word
    if (!isWordChar(ownChars[at].ch)) return null;
    let chars = ownChars, from = at, to = at;
    while (from > 0 && isWordChar(chars[from - 1].ch)) from--;
    while (to < chars.length - 1 && isWordChar(chars[to + 1].ch)) to++;
    let word = chars.slice(from, to + 1);
    // to the left: the previous item continues into this one, and both sides of the joint are letters
    for (let i = own, steps = 0; from === 0 && i > 0 && steps < 8; i--, steps++) {
        const prev = pdfSpanChars(spans[i - 1]);
        if (!prev.length || !isWordChar(prev[prev.length - 1].ch) || !pdfSpansContinueWord(spans[i - 1], spans[i])) break;
        let k = prev.length - 1;
        while (k > 0 && isWordChar(prev[k - 1].ch)) k--;
        word = prev.slice(k).concat(word);
        if (k > 0) break;
    }
    for (let i = own, steps = 0; to === chars.length - 1 && i < spans.length - 1 && steps < 8; i++, steps++) {
        const next = pdfSpanChars(spans[i + 1]);
        if (!next.length || !isWordChar(next[0].ch) || !pdfSpansContinueWord(spans[i], spans[i + 1])) break;
        let k = 0;
        while (k < next.length - 1 && isWordChar(next[k + 1].ch)) k++;
        word = word.concat(next.slice(0, k + 1));
        if (k < next.length - 1) break;
    }
    const pieces = [];
    for (const c of word) {
        const last = pieces[pieces.length - 1];
        if (last && last.node === c.node && last.end === c.offset) last.end++;
        else pieces.push({ node: c.node, start: c.offset, end: c.offset + 1 });
    }
    return { word: word.map(c => c.ch).join(''), pieces };
}
// Every piece of the word marked as visited; a piece already marked is left as it is.
function pdfWrapWordPieces(pieces) {
    const out = [];
    for (const p of pieces.slice().reverse()) {
        const parent = p.node.parentElement;
        if (parent && parent.classList.contains('word-visited') && p.start === 0 && p.end === p.node.nodeValue.length) { out.unshift(parent); continue; }
        try {
            const r = document.createRange(); r.setStart(p.node, p.start); r.setEnd(p.node, p.end);
            const span = document.createElement('span'); span.className = 'word-visited';
            r.surroundContents(span); out.unshift(span);
        } catch (e) { /* a piece that cannot be wrapped stays unmarked */ }
    }
    return out;
}
function selectWordAtPoint(clientX, clientY) {
    const range = caretRangeAt(clientX, clientY);
    if (!range || !range.startContainer || range.startContainer.nodeType !== Node.TEXT_NODE) return null;
    if (state.format !== 'pdf' && els.pages.contains(range.startContainer)) {
        const bounds = reflowWordBounds(range.startContainer, range.startOffset);
        if (!bounds) return null;
        const wordRange = rangeBetweenWords(bounds, bounds);
        if (!wordRange) return null;
        // A caret can snap to nearby text even when the tap is in a margin.
        // Keep the whitespace-dismissal fix on this cross-node path as well.
        if (!isPointInRects(clientX, clientY, wordRange.getClientRects(), 2)) return null;
        const word = wordRange.toString();
        const spans = wrapRangeInSpans(wordRange, 'word-visited');
        state.lastWordNode = spans[0] || null;
        return word;
    }

    // Уже підсвічене слово клікнули повторно — повертаємо його, але ОБОВ'ЯЗКОВО
    // оновлюємо якір. Без цього якір лишався на слові з попереднього тапу, і
    // виділення речення починалося не звідти, куди щойно натиснули.
    //
    // ОБОВ'ЯЗКОВО з тією ж перевіркою відстані isPointInRects, що й звичайний шлях
    // нижче: caretRangeAt/pdfNearestSpan у PDF не мають верхньої межі відстані —
    // вони завжди повертають НАЙБЛИЖЧИЙ гліф, хай там на скільки сантиметрів білого
    // поля довелось "дотягнутись". Поки слово ще НЕ підсвічене, це нешкідливо: сам
    // збіг попадає в звичайний пошук межі слова нижче, і той відкидає його через
    // isPointInRects. Але щойно слово підсвічене (.word-visited) — оцей "ярлик"
    // повертав його ОДРАЗУ, і саме без цієї перевірки: клік будь-де в білому полі,
    // з якого немає жодного ближчого фрагмента тексту, "притягувався" назад до вже
    // підсвіченого слова, іноді за кілька сантиметрів — ефект, що зникав лише коли
    // це саме слово переставало бути НАЙБЛИЖЧИМ. Ідентична перевірка тут прибирає
    // цю відмінність: підсвічене слово, як і будь-яке інше, вимагає реального
    // влучення (з тим самим допуском), а не просто "найближче знайшлось".
    const existingHighlight = range.startContainer.parentElement && range.startContainer.parentElement.closest('.word-visited');
    // A PDF word cut into several text items is joined below (pdfWordPieces): a highlighted piece alone is not the word.
    if (existingHighlight && state.format === 'pdf') {
        if (!isPointInRects(clientX, clientY, existingHighlight.getClientRects(), 10)) return null;
        const joined = pdfWordPieces(range.startContainer, range.startOffset);
        if (joined) { state.lastWordNode = existingHighlight; pdfWrapWordPieces(joined.pieces); return joined.word; }
    }
    if (existingHighlight) {
        if (!isPointInRects(clientX, clientY, existingHighlight.getClientRects(), state.format === 'pdf' ? 10 : 2)) return null;
        state.lastWordNode = existingHighlight;
        return existingHighlight.textContent.trim() || null;
    }

    // Межі слова рахуємо напряму по текстовому вузлу, БЕЗ Selection API. Це принципово:
    // виділення пальцем на Android доводиться вимикати (інакше система показує свої
    // маркери й власне вікно перекладу), а лише-Range підхід від цього не залежить.
    const textNode = range.startContainer;
    const text = textNode.nodeValue || '';
    const offset = range.startOffset;
    const isWordChar = (ch) => ch && /[\p{L}\p{N}'’-]/u.test(ch);
    // PDF: the word may run on into the next text item («é» + «tudier», «ga» + «gner»: a textbook prints a verb's stem in another
    // font, so the file cuts the word there). The whole word is the answer, and every piece of it is marked.
    if (state.format === 'pdf') {
        const joined = pdfWordPieces(textNode, offset);
        if (joined && joined.pieces.length > 1) {
            const rects = joined.pieces.flatMap(p => { const r = document.createRange(); r.setStart(p.node, p.start); r.setEnd(p.node, p.end); return Array.from(r.getClientRects()); });
            if (!isPointInRects(clientX, clientY, rects, 10)) return null;
            const marked = pdfWrapWordPieces(joined.pieces);
            state.lastWordNode = marked[0] || textNode.parentElement || null;
            return joined.word;
        }
    }

    let start = offset, end = offset;
    while (start > 0 && isWordChar(text[start - 1])) start--;
    while (end < text.length && isWordChar(text[end])) end++;
    if (start === end) {
        // Влучили в пробіл чи розділовий знак — беремо найближче слово праворуч.
        while (end < text.length && !isWordChar(text[end])) end++;
        start = end;
        while (end < text.length && isWordChar(text[end])) end++;
    }
    const word = text.substring(start, end).trim();
    if (!word) return null;

    try {
        const wordRange = document.createRange();
        wordRange.setStart(textNode, start);
        wordRange.setEnd(textNode, end);
        
        if (!isPointInRects(clientX, clientY, wordRange.getClientRects(), state.format === 'pdf' ? 10 : 2)) return null;

        const span = document.createElement('span');
        span.className = 'word-visited';
        wordRange.surroundContents(span);
        state.lastWordNode = span;   // точний вузол слова — для кнопки виділення
    } catch (e) {
        state.lastWordNode = textNode.parentElement || null;
    }

    return word;
}
