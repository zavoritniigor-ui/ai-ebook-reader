/* selection.js — виділення тексту й пошук меж слова/речення/абзаца під тапом чи
 * курсором: caret hit-testing (caretRangeAt/anchorCaret/blockAncestorOf),
 * видимий порядок фрагментів PDF-текстового шару (pdfNearestSpan/pdfVisualGroup —
 * колонки/рядки за геометрією, а не за DOM/content-stream порядком), побудова meж
 * речення (sentenceRangeAt/buildSentenceRangesFromSpans), підсвітка виділеного
 * фрагмента, і тап-по-слову (selectWordAtPoint).
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Залежить від core.js
 * (state/els/invalidateSelection) і ai-client.js/lang-detect.js НЕ потребує напряму.
 * Drag і click listeners також тут; navigation/PDF gesture callbacks лишаються
 * в index.html. invalidateSelection живе в core.js і скасовує drag перед reset.
 */

// ========== ВИДІЛЕННЯ РЕЧЕННЯ / АБЗАЦУ ПАЛЬЦЕМ ==========
// Тягнути виділення пальцем по екрану незручно, тому речення й абзац виділяються
// автоматично: досить утримати палець на будь-якому слові. Показуємо результат як
// звичайне виділення браузера — знайома візуальна реакція, і жодних змін у DOM.
function caretRangeAt(clientX, clientY) {
    let range = null;
    if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(clientX, clientY);
    else if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(clientX, clientY);
        if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); range.collapse(true); }
    }
    // During transformed PDF hit-testing Chrome may return the layer element,
    // not a text offset. Recover the nearest glyph within that PDF item only.
    if (range && range.startContainer.nodeType === Node.ELEMENT_NODE) {
        const layer = range.startContainer.closest('.pdf-text-layer');
        const span = layer && pdfNearestSpan(layer, clientX, clientY);
        if (span) return pdfCaretInSpan(span, clientX, clientY) || range;
    }
    return range;
}
function pdfCaretInSpan(span, x, y) {
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    const glyph = document.createRange();
    let node, best = null, distance = Infinity;
    while (node = walker.nextNode()) {
        for (let offset = 0; offset < node.length; offset++) {
            glyph.setStart(node, offset); glyph.setEnd(node, offset + 1);
            for (const rect of glyph.getClientRects()) {
                if (!rect.width || !rect.height) continue;
                const dx = Math.max(rect.left - x, 0, x - rect.right);
                const dy = Math.max(rect.top - y, 0, y - rect.bottom);
                const d = dx * dx + dy * dy;
                if (d < distance) { distance = d; best = { node, offset }; }
                if (d === 0) break;
            }
            if (distance === 0) break;
        }
        if (distance === 0) break;
    }
    if (!best) return null;
    glyph.setStart(best.node, best.offset); glyph.collapse(true);
    return glyph;
}
// Найближчий БЛОК, у межах якого шукаємо речення. Визначаємо за реальним display,
// а не за списком тегів: після тапу слово загорнуте у власний <span class="word-visited">,
// і саме він раніше ставав "блоком" — через це "речення" дорівнювало одному слову,
// і кнопка виділення не давала жодного ефекту.
const PARAGRAPH_MAX_CHARS = 1500;
// Захисна стеля для будь-якого ВРУЧНУ виділеного фрагмента, що йде в AI-промпт
// (граматика/рівень/запитання/S-V-O). "Розгорнути до абзацу" вже обмежене вище
// (PARAGRAPH_MAX_CHARS), а панельний переклад — своїм власним лімітом; це ж —
// запобіжник саме на випадок ручного протягування виділення на кілька сторінок:
// без нього туди пішов би весь текст без жодного обмеження.
const AI_PROMPT_TEXT_MAX = 4000;
function blockAncestorOf(node) {
    let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return els.pages;

    // PDF: pdf.js малює КОЖЕН фрагмент рядка окремим <span> з position:absolute, а
    // абсолютне позиціонування робить елемент блоковим. Тому звичайний пошук "блоку"
    // повертав один короткий фрагмент, тоді як речення в PDF майже завжди розбите на
    // кілька таких фрагментів. Беремо весь текстовий шар — і речення знаходиться цілим.
    const pdfLayer = el.closest && el.closest('.pdf-text-layer');
    if (pdfLayer) return pdfLayer;

    while (el && el !== els.pages) {
        let display = '';
        try { display = window.getComputedStyle(el).display; } catch (e) {}
        // Пропускаємо рядкові обгортки (span, em, b, a, наш .word-visited тощо)
        if (display && !/^(inline|inline-block|contents|ruby|ruby-text)$/.test(display)) return el;
        el = el.parentElement;
    }
    return els.pages;
}
// Опорна точка для виділення: спершу — запам'ятований вузол слова (надійно, бо не
// залежить від того, чи не накрило вікно перекладу точку тапу), інакше — координати.
// Шукаємо ПЕРШИЙ текстовий вузол ВСЕРЕДИНІ node через TreeWalker, а не перевіряємо
// node.firstChild напряму: у PDF кнопка "виділити" (wordToSentenceEndRangeAt →
// showSelectionHighlight → wrapRangeInSpans) обгортає щойно виділений текст ще одним
// span.sel-word — і якщо перше натискання виділило рівно тапнуте слово, цей новий
// span опиняється ВСЕРЕДИНІ .word-visited, підмінюючи його firstChild з текстового
// вузла на елемент. Пряма перевірка firstChild після цього провалювалась, і другий
// клік "виділити" непомітно скочувався з надійного якоря на неточний пошук за
// координатами (caretRangeAt) — звідси й неправильне виділення речення саме при
// ПОВТОРНОМУ натисканні. TreeWalker знаходить перший текстовий вузол незалежно від
// будь-якої додаткової обгортки всередині.
function anchorCaret(clientX, clientY) {
    const node = state.lastWordNode;
    if (node && node.isConnected) {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const textNode = walker.nextNode();
        if (textNode) {
            const r = document.createRange();
            r.setStart(textNode, 0);
            r.collapse(true);
            return r;
        }
    }
    return caretRangeAt(clientX, clientY);
}
function paragraphRangeAt(clientX, clientY) {
    const caret = anchorCaret(clientX, clientY);
    if (!caret) return null;
    const block = blockAncestorOf(caret.startContainer);
    if (!block) return null;
    // Запобіжник: якщо "абзац" завеликий — це контейнер розділу, а не абзац.
    if ((block.textContent || '').length > PARAGRAPH_MAX_CHARS) return null;
    const r = document.createRange();
    r.selectNodeContents(block);
    return r;
}
// ===== PDF: візуальний, а не content-stream порядок фрагментів =====
// pdf.js кладе кожен фрагмент рядка в окремий <span> у порядку текстових операторів
// вихідного PDF. Для простого одноколонкового тексту цей порядок зазвичай і є порядком
// читання, але для багатоколонкових макетів, підписів під малюнками чи колонтитулів —
// ні. Раніше "блоком" для пошуку речення був увесь .pdf-text-layer сторінки, і
// buildSentenceRanges йшла по ньому в DOM-порядку — тому тап у першій колонці міг
// притягнути слова з другої (перевірено на синтетичному 2-колонковому PDF). Нижче
// фрагменти групуються за РЕАЛЬНОЮ геометрією (колонка — по X, розрив по Y — інший
// абзац/підпис/колонтитул), і речення будуються лише з фрагментів навколо тапнутого,
// у тій самій видимій колонці.
// document.caretRangeFromPoint() інколи влучає не в конкретний текстовий вузол, а в сам
// .pdf-text-layer (проміжок між гліфами) — особливо під час CSS-масштабування при
// pinch-zoom (transform:scale на .pdf-page-wrapper), коли реальна геометрія гліфів між
// кадрами трохи "плаває". У такому разі шукаємо найближчий до точки тапу фрагмент напряму
// за rect'ами, а НЕ відкочуємось до всього шару без фільтра за колонкою — інакше знову
// повертається саме та помилка (змішування колонок), яку цей код мав виправити.
function pdfNearestSpan(layer, x, y) {
    const spans = pdfTextSpans(layer);
    let best = null, bestDist = Infinity;
    for (const s of spans) {
        const r = s.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s;
        const dx = Math.max(r.left - x, 0, x - r.right);
        const dy = Math.max(r.top - y, 0, y - r.bottom);
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) { bestDist = dist; best = s; }
    }
    return best;
}
function pdfTextSpans(layer) {
    return Array.from(layer.querySelectorAll('span')).filter(s =>
        !s.classList.contains('markedContent') && s.textContent.trim() &&
        !s.parentElement.closest('span:not(.markedContent)'));
}
function pdfVisualGroup(layer, targetSpan) {
    const spans = pdfTextSpans(layer);
    if (!spans.length) return [];
    const targetIdx = spans.indexOf(targetSpan);
    if (targetIdx < 0) return spans;
    const rects = spans.map(s => s.getBoundingClientRect());
    // Колонки визначаються у ДВА кроки, не за лівими межами окремих фрагментів
    // напряму: рядок часто розбитий на кілька фрагментів через зміну стилю ПОСЕРЕД
    // рядка (напівжирне "Premièrement," посеред речення тощо, як у навчальних
    // двомовних книгах) — такий фрагмент починається глибоко ВСЕРЕДИНІ рядка, і його
    // власна ліва межа нічого не каже про те, до якої колонки належить рядок. А
    // просте групування "спершу за Y" (без урахування X) теж не підходить: у
    // двомовній книзі рядок оригіналу й рядок перекладу зазвичай лежать РІВНО на
    // тій самій висоті (переклад надруковано навпроти, рядок у рядок) — тож звичайне
    // Y-групування об'єднало б обидві колонки в один "рядок".
    // Крок 1 — Y-СМУГИ: фрагменти на приблизно однаковій висоті (це можуть бути
    // фрагменти з ОБОХ колонок одразу, якщо рядки вирівняні один навпроти одного).
    // Крок 2 — усередині кожної Y-смуги фрагменти сортуються за X і розрізаються на
    // "сегменти" там, де проміжок між ПРАВИМ краєм одного фрагмента й ЛІВИМ краєм
    // наступного помітно більший за звичайний міжслівний — це і є межа колонок.
    // Фрагменти одного стильового розриву посеред рядка (з попереднім вони СТИКУються
    // впритул, без такого розриву) лишаються в ОДНОМУ сегменті, а не поділяються.
    // Лише СТАРТОВА X-позиція кожного такого сегмента (не кожного фрагмента) далі йде
    // в кластеризацію колонок — тому текст перед стильовим розривом більше не отруює
    // її випадковими серединними X-значеннями.
    const layerWidth = layer.getBoundingClientRect().width || 1;
    const columnGapThreshold = Math.max(24, layerWidth * 0.08);
    const bands = [];
    for (const i of rects.map((_, idx) => idx).sort((a, b) => rects[a].top - rects[b].top)) {
        const r = rects[i];
        const band = bands.find(band => Math.abs(r.top - band.top) <= Math.min(r.height, band.height) * 0.6);
        if (band) band.indices.push(i);
        else bands.push({ top: r.top, height: r.height, indices: [i] });
    }
    const segments = []; // { left, indices: [] }
    for (const band of bands) {
        const byLeft = band.indices.slice().sort((a, b) => rects[a].left - rects[b].left);
        let seg = null;
        for (const i of byLeft) {
            const r = rects[i];
            if (seg && r.left - seg.right <= columnGapThreshold) { seg.indices.push(i); seg.right = Math.max(seg.right, r.right); }
            else { seg = { left: r.left, right: r.right, indices: [i] }; segments.push(seg); }
        }
    }
    const segLeft = segments.map(s => s.left);
    const segsByLeft = segLeft.map((_, i) => i).sort((a, b) => segLeft[a] - segLeft[b]);
    const segColumn = new Array(segments.length).fill(0);
    for (let k = 1; k < segsByLeft.length; k++) {
        const prev = segsByLeft[k - 1], cur = segsByLeft[k];
        segColumn[cur] = segColumn[prev] + (segLeft[cur] - segLeft[prev] > columnGapThreshold ? 1 : 0);
    }
    const spanSeg = new Array(spans.length);
    segments.forEach((seg, si) => seg.indices.forEach(i => spanSeg[i] = si));
    const targetColumn = segColumn[spanSeg[targetIdx]];
    const sameColumn = [];
    const sameColumnRects = [];
    spans.forEach((s, i) => { if (segColumn[spanSeg[i]] === targetColumn) { sameColumn.push(s); sameColumnRects.push(rects[i]); } });
    // У межах колонки — справжній порядок читання (рядок згори вниз, у рядку зліва
    // направо), а не DOM/content-stream порядок.
    const order = sameColumn.map((_, i) => i).sort((a, b) => {
        const ra = sameColumnRects[a], rb = sameColumnRects[b];
        if (Math.abs(ra.top - rb.top) > Math.min(ra.height, rb.height) * 0.6) return ra.top - rb.top;
        return ra.left - rb.left;
    });
    const sorted = order.map(i => sameColumn[i]);
    const sortedRects = order.map(i => sameColumnRects[i]);
    // Розрив по Y, помітно більший за міжрядковий, — це вже інший абзац/підпис/
    // колонтитул: лишаємо лише суцільний прогін рядків навколо самого тапнутого фрагмента.
    const targetSortedIdx = sorted.indexOf(targetSpan);
    if (targetSortedIdx < 0) return sorted;
    let from = targetSortedIdx, to = targetSortedIdx;
    const lineGap = sortedRects[targetSortedIdx].height * 2.2;
    while (from > 0 && (sortedRects[from].top - sortedRects[from - 1].top) < lineGap) from--;
    while (to < sorted.length - 1 && (sortedRects[to + 1].top - sortedRects[to].top) < lineGap) to++;
    return sorted.slice(from, to + 1);
}
// Той самий алгоритм пошуку меж речення (крапка/знак+пробіл), що й buildSentenceRanges,
// але джерело символів — заздалегідь відсортований у ВІЗУАЛЬНОМУ порядку список
// фрагментів PDF, а не TreeWalker по DOM. range.toString() свідомо перевизначений на
// точний зібраний текст: звичайний Range.toString() однаково пройшовся б по DOM/
// content-stream порядку між startContainer і endContainer і міг би знову зачепити
// фрагмент іншої колонки, що лежить між ними в розмітці.
function buildSentenceRangesFromSpans(spans) {
    const chars = [];
    for (const span of spans) {
        const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
            const text = node.nodeValue || '';
            for (let i = 0; i < text.length; i++) chars.push({ node, offset: i, ch: text[i], span });
        }
        // PDF text items/lines need a separator even when the stream omits spaces.
        if (chars.length && !/\s/.test(chars.at(-1).ch)) chars.push({ ...chars.at(-1), ch: ' ', separator: true });
    }
    const sentences = [];
    let buffer = '', startNode = null, startOffset = 0, nodes = [], pieces = [];
    for (let k = 0; k < chars.length; k++) {
        const { node, offset, ch } = chars[k];
        if (buffer === '') { startNode = node; startOffset = offset; nodes = []; pieces = []; }
        buffer += ch;
        if (!chars[k].separator) {
            const last = pieces.at(-1);
            if (last && last.node === node) last.end = offset + 1;
            else pieces.push({ node, start: offset, end: offset + 1, span: chars[k].span });
        }
        if (!nodes.includes(node)) nodes.push(node);
        const next = chars[k + 1];
        const atSentenceEnd = /[.!?]/.test(ch) && (!next || /\s/.test(next.ch));
        const atEnd = k === chars.length - 1;
        if (atSentenceEnd || atEnd) {
            const trimmed = buffer.trim();
            if (trimmed) {
                const r = document.createRange();
                try { r.setStart(startNode, startOffset); r.setEnd(node, offset + 1); } catch (e) {}
                r._pdfPieces = pieces.map(p => ({ ...p }));
                r.toString = () => trimmed;
                sentences.push({ text: trimmed, range: r, nodes: nodes.slice() });
            }
            buffer = '';
        }
    }
    return sentences;
}
function sentenceRangeAt(clientX, clientY) {
    const caret = anchorCaret(clientX, clientY);
    if (!caret) return null;
    const block = blockAncestorOf(caret.startContainer);
    if (!block) return null;

    if (block.classList && block.classList.contains('pdf-text-layer')) {
        const startEl = caret.startContainer.nodeType === Node.TEXT_NODE ? caret.startContainer.parentElement : caret.startContainer;
        let targetSpan = pdfTextSpans(block).find(s => s === startEl || s.contains(startEl));
        if (!targetSpan) targetSpan = pdfNearestSpan(block, clientX, clientY);
        if (!targetSpan) return null;
        const group = pdfVisualGroup(block, targetSpan);
        const sentences = buildSentenceRangesFromSpans(group);
        const hitNode = caret.startContainer.nodeType === Node.TEXT_NODE ? caret.startContainer : targetSpan.firstChild;
        for (const s of sentences) {
            if (s.range._pdfPieces.some(p => p.node === hitNode && (hitNode !== caret.startContainer || (caret.startOffset >= p.start && caret.startOffset < p.end)))) { s.range._pdfNodes = s.nodes; return s.range; }
        }
        if (sentences.length) { sentences[0].range._pdfNodes = sentences[0].nodes; return sentences[0].range; }
        return null;
    }

    const blockRange = document.createRange();
    blockRange.selectNodeContents(block);

    const sentences = buildSentenceRanges(blockRange);
    for (const s of sentences) {
        try {
            if (s.range.isPointInRange(caret.startContainer, caret.startOffset)) return s.range;
        } catch (e) { /* вузол поза цим Range — пробуємо наступне речення */ }
    }
    return sentences.length ? sentences[0].range : null;
}
const SEL_HL_NAME = 'sel-current';

// ========== ПІДСВІТКА ВИДІЛЕНОГО ФРАГМЕНТА ==========
// У PDF кожен фрагмент рядка має CSS-трансформацію (scaleX) для точного суміщення
// з намальованою сторінкою. Накладна підсвітка ::highlight() цієї трансформації не
// враховує — звідси й сильне зміщення. Тому в PDF підсвічуємо так само, як сірі
// слова: обгортаємо текст у span всередині того самого фрагмента, і він рухається
// разом із ним.
function wrapRangeInSpans(range, className) {
    const spans = [];
    if (range._pdfPieces) {
        for (const p of range._pdfPieces.slice().reverse()) {
            const part = document.createRange();
            part.setStart(p.node, p.start); part.setEnd(p.node, p.end);
            spans.push(...wrapRangeInSpans(part, className));
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
}
function showSelectionHighlight(range) {
    clearSelectionHighlight();
    if (state.format === 'pdf') {
        state.selSpans = wrapRangeInSpans(range, 'sel-word');
        return;
    }
    if (typeof Highlight !== 'undefined' && window.CSS && CSS.highlights) {
        try { CSS.highlights.set(SEL_HL_NAME, new Highlight(range)); } catch (e) {}
    }
}
// Знімає підсвітку виділеного фрагмента (при закритті вікна перекладу).
function clearSelectionHighlight() {
    clearAlignment();
    svoToken++; cancelAsyncTasks(['svo']);
    if (typeof CSS !== 'undefined' && CSS.highlights) CSS.highlights.delete(SEL_HL_NAME);
    unwrapSpans(state.selSpans);
    state.selSpans = [];
    clearSvoHighlights();
    state.lastSelectionText = null;
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

function selectRangeAndTranslate(range, clientX, clientY) {
    if (!range) return false;
    const text = range.toString().trim();
    if (!text) return false;
    // Власна підсвітка, а не системне виділення: воно викликає вікно пошуку Chrome.
    showSelectionHighlight(range);
    state.lastSelectionText = text;
    state.ctxSentence = text.slice(0, 400);
    state.lastSelectedRange = range.cloneRange();
    state.lastTapPoint = { x: clientX, y: clientY };
    state.programmaticSelectionAt = Date.now();
    // Межі самого виділення — за ними вікно перекладу стане над або під реченням.
    let rect = null;
    try { const r = range.getBoundingClientRect(); if (r && (r.width || r.height)) rect = r; } catch (e) {}
    handleWordOrSelection(text, clientX, clientY, rect);
    return true;
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



/* selection.js (продовження) — виділення перетягуванням значком по словах
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
    for (const match of text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’\u02bc-][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu)) {
        const start = match.index, end = start + match[0].length;
        if (point < start) return null;
        if (point > end) continue;
        const first = pieces.find(p => start >= p.start && start < p.end);
        const last = pieces.find(p => end > p.start && end <= p.end);
        return first && last ? { node: first.node, start: start - first.start, endNode: last.node, end: end - last.start } : null;
    }
    return null;
}
function wordBoundsAt(clientX, clientY) {
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
    let s = r.startOffset, e = r.startOffset;
    while (s > 0 && IS_WORD_CH(text[s - 1])) s--;
    while (e < text.length && IS_WORD_CH(text[e])) e++;
    if (s === e) {                     // потрапили в пробіл — беремо найближче слово
        while (e < text.length && !IS_WORD_CH(text[e])) e++;
        s = e;
        while (e < text.length && IS_WORD_CH(text[e])) e++;
    }
    const wBounds = { node, start: s, end: e };
    const rTest = document.createRange();
    rTest.setStart(wBounds.node, wBounds.start);
    rTest.setEnd(wBounds.endNode || wBounds.node, wBounds.end);
    if (!isPointInRects(clientX, clientY, rTest.getClientRects(), state.format === 'pdf' ? 10 : 2)) return null;
    return wBounds;
}

function cancelDragSelection() {
    const hadDragHighlight = !!state.dragRange;
    clearTimeout(touchSelTimer); touchSelTimer = null;
    dragSel = null; dragMoved = false; state.dragRange = null;
    state.touchSelecting = false;
    els.container.style.touchAction = '';
    if (hadDragHighlight && typeof CSS !== 'undefined' && CSS.highlights) CSS.highlights.delete(SEL_HL_NAME);
}
document.addEventListener('pointercancel', cancelDragSelection);
document.addEventListener('pointerup', e => {
    if (!els.mainArea.contains(e.target)) cancelDragSelection();
});
window.addEventListener('blur', cancelDragSelection);

let dragSel = null;   // { node, start, end } — слово, з якого почалось виділення
let dragStartX = 0, dragStartY = 0, dragMoved = false, touchSelTimer = null;

els.mainArea.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && !e.isPrimary) { cancelDragSelection(); return; }
    if (state.format === 'pdf' && !els.container.contains(e.target)) return;
    if (state.inkMode || (state.format === 'pdf' && e.pointerType === 'touch')) return;      // PDF touch belongs to zoom/pan
    if (state.inkMode) return;
    if (!state.translateMode) return;
    if (e.button !== 0) return;
    if (e.target.closest('#word-tooltip') || e.target.closest('.side-panel') ||
        e.target.closest('#tts-controls') || e.target.closest('nav') || e.target.closest('header')) return;

    cancelDragSelection();
    dragStartX = e.clientX; dragStartY = e.clientY; dragMoved = false;

    if (e.pointerType === 'touch') {
        // Пальцем виділяємо через УТРИМАННЯ: короткий рух пальцем — це гортання
        // сторінки, і плутати ці два жести не можна. Потримав — почалось виділення.
        clearTimeout(touchSelTimer);
        const px = e.clientX, py = e.clientY;
        touchSelTimer = setTimeout(() => {
            if (state.format === 'pdf' && pdfPointers.size > 1) return;
            const w = wordBoundsAt(px, py);
            if (!w) return;
            dragSel = w;
            dragMoved = true;                 // підсвітка з першого ж слова
            state.touchSelecting = true;      // свайпи гортання на час виділення вимкнені
            state.suppressNextClick = true;
            // Забороняємо браузеру трактувати рух як прокрутку — інакше він
            // перехопить жест і виділення обірветься на першому ж русі пальця.
            els.container.style.touchAction = 'none';
            if (navigator.vibrate) navigator.vibrate(12);
            const r = rangeBetweenWords(w, w);
            if (r && typeof Highlight !== 'undefined' && window.CSS && CSS.highlights) {
                state.dragRange = r;
                try { CSS.highlights.set(SEL_HL_NAME, new Highlight(r)); } catch (err) {}
            }
        }, 380);
        return;
    }

    // Миша й перо: виділення починається одразу, поріг руху нижче.
    const w = wordBoundsAt(e.clientX, e.clientY);
    if (!w) return;
    dragSel = w;
    e.preventDefault();               // глушимо системне виділення разом з його стрибками
});

els.mainArea.addEventListener('pointermove', (e) => {
    // Палець зрушив раніше, ніж спрацювало утримання — це гортання, не виділення.
    if (touchSelTimer && !dragSel &&
        (Math.abs(e.clientX - dragStartX) > 10 || Math.abs(e.clientY - dragStartY) > 10)) {
        clearTimeout(touchSelTimer); touchSelTimer = null;
    }
    if (!dragSel) return;
    // Поріг руху: тремтіння пера чи миші під час звичайного тапу не має вважатись
    // протягуванням — інакше слово підсвічувалось зеленим (виділення) замість сірого.
    if (!dragMoved) {
        if (Math.abs(e.clientX - dragStartX) < 6 && Math.abs(e.clientY - dragStartY) < 6) return;
        dragMoved = true;
    }
    const w = wordBoundsAt(e.clientX, e.clientY);
    if (!w) return;
    const r = rangeBetweenWords(dragSel, w);
    if (!r) return;
    state.dragRange = r;
    // ПІД ЧАС протягування підсвічуємо лише накладним шаром: обгортання в span
    // змінює DOM, розрізає текстові вузли — і вузол, з якого почалось виділення,
    // ставав недійсним. Саме через це виділення мишею й перестало працювати.
    if (typeof Highlight !== 'undefined' && window.CSS && CSS.highlights) {
        try { CSS.highlights.set(SEL_HL_NAME, new Highlight(r)); } catch (err) {}
    }
});

els.mainArea.addEventListener('pointerup', (e) => {
    clearTimeout(touchSelTimer); touchSelTimer = null;
    if (state.touchSelecting) {
        touchStartTime = 0; // pointerup precedes touchend: do not turn the page after selection
        state.touchSelecting = false;
        els.container.style.touchAction = (state.format === 'pdf') ? '' : 'pan-y';
    }
    if (!dragSel) return;
    const start = dragSel; dragSel = null;
    const r = state.dragRange;
    state.dragRange = null;
    // Протягування не відбулось (кінець там само, де початок) — лишаємо звичайному
    // обробнику кліку, щоб слово опрацювалось як тап зі словниковою статтею.
    if (!r) return;
    const text = r.toString().trim();
    if (!text) return;
    state.suppressNextClick = true;   // інакше слідом спрацює ще й тап по слову
    // Одне слово — звичайний шлях (зі словниковою статтею); кілька — як фрагмент.
    state.lastTapPoint = { x: e.clientX, y: e.clientY };
    state.expandLevel = 0;
    state.lastSelectedRange = r.cloneRange();
    // Протягування завершено — тепер можна перемалювати точно (у PDF обгорткою).
    showSelectionHighlight(r);
    state.lastWordNode = null; state.ctxSentence = text.slice(0, 400);
    state.lastSelectionText = text;
    let rect = null;
    try { const b = r.getBoundingClientRect(); if (b && (b.width || b.height)) rect = b; } catch (err) {}
    handleWordOrSelection(text, e.clientX, e.clientY, rect);
});

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

els.mainArea.addEventListener('click', (e) => {
    if (e.target.closest('#pdf-scrubber')) return;
    if (state.inkMode) return;   // у режимі письма тап малює, а не перекладає
    if (state.suppressNextClick) { state.suppressNextClick = false; return; } // клік після свайпу — ігноруємо
    if(e.target.closest('#word-tooltip') || e.target.closest('.side-panel') || e.target.closest('nav') || e.target.closest('#menu-handle') || e.target.closest('#footer-handle') || e.target.closest('#tts-controls')) return;
    // Зона язичка меню (лівий верхній кут) — тут ніколи не спрацьовує переклад слова.
    if (els.menuHandle) {
        const h = els.menuHandle.getBoundingClientRect();
        if (e.clientX <= h.right && e.clientY <= h.bottom) return;
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
            // Record the exact source occurrence before phrasal-verb expansion changes
            // the lookup text. The statistics module deduplicates repeat taps locally.
            trackWordHelp(word, state.lastWordNode);
            // Новий тап скидає підсвітку попереднього фрагмента.
            clearSelectionHighlight();
            state.lastTapPoint = { x: e.clientX, y: e.clientY };
            state.expandLevel = 0;

            // Речення, у якому стоїть слово, потрібне двічі: за ним визначається мова
            // (у двомовній книзі сторінка не показник) і в ньому шукаються фразові
            // дієслова англійської.
            let lookup = word;
            try {
                const sr = sentenceRangeAt(e.clientX, e.clientY);
                state.ctxSentence = sr ? sr.toString().trim().slice(0, 400) : '';
                if (state.ctxSentence && detectLang(state.ctxSentence).startsWith('en')) {
                    const phrasal = detectPhrasalVerb(word, state.ctxSentence);
                    if (phrasal) lookup = phrasal;
                }
            } catch (err) { state.ctxSentence = ''; }
            let rect = null;
            try { if (state.lastWordNode && state.lastWordNode.getBoundingClientRect) rect = state.lastWordNode.getBoundingClientRect(); } catch (err) {}
            handleWordOrSelection(lookup, e.clientX, e.clientY, rect);
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
    else {
        document.body.classList.toggle('immersive-mode');
        if(window.innerWidth <= 1180) document.body.classList.add('immersive-mode');
    }
});
