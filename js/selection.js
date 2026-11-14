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
  * 2026-11-14: split without changes into selection.js (caret and paragraph under a point), selection-pdf-order.js,
 * selection-highlight.js and selection-drag.js, loaded one after another in that order.
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
    // page wrapper, or canvas instead of a text offset. Recover the nearest glyph.
    if ((!range || range.startContainer.nodeType === Node.ELEMENT_NODE) && state.format === 'pdf') {
        const el = (range && range.startContainer.nodeType === Node.ELEMENT_NODE) ? range.startContainer : document.elementFromPoint(clientX, clientY);
        const hitEl = document.elementFromPoint(clientX, clientY);
        if (!el?.closest?.('.side-panel, #practice-panel') && !hitEl?.closest?.('.side-panel, #practice-panel')) {
            let layer = el?.closest?.('.pdf-text-layer');
            if (!layer) {
                const pageEl = el?.closest?.('.pdf-page-wrapper') ||
                               hitEl?.closest?.('.pdf-page-wrapper') ||
                               pdfPageWrappers?.[pdfActivePage] || document.querySelector('.pdf-page-wrapper');
                if (pageEl) layer = pageEl.querySelector('.pdf-text-layer');
            }
            const span = layer && pdfNearestSpan(layer, clientX, clientY);
            if (span) {
                const caret = pdfCaretInSpan(span, clientX, clientY);
                if (caret) return caret;
            }
        }
    } else if (range && range.startContainer.nodeType === Node.ELEMENT_NODE) {
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
        // The first text that is not empty: the selection highlight leaves an empty text node at the start of the word,
        // and a caret there is in no sentence (sentenceRangeAt then fell back to the page's first sentence).
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, { acceptNode: t => t.nodeValue ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
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
    // TXT keeps a whole import block in one div to preserve source whitespace
    // and bookmark offsets. Select the source paragraph around the caret, not
    // the entire block (which commonly exceeds the paragraph safety limit).
    if (block.classList?.contains('txt-block')) {
        const text = block.textContent || '';
        const prefix = document.createRange();
        prefix.selectNodeContents(block);
        prefix.setEnd(caret.startContainer, caret.startOffset);
        const offset = prefix.toString().length;
        const breaks = /\r?\n[ \t]*\r?\n/.test(text) ? /\r?\n[ \t]*\r?\n/g : /\r?\n/g;
        let start = 0, end = text.length, match;
        while ((match = breaks.exec(text))) {
            if (match.index >= offset) { end = match.index; break; }
            start = match.index + match[0].length;
        }
        if (end - start > PARAGRAPH_MAX_CHARS || !text.slice(start, end).trim()) return null;
        return rangeAtTextOffsets(block, start, end);
    }
    // Запобіжник: якщо "абзац" завеликий — це контейнер розділу, а не абзац.
    if ((block.textContent || '').length > PARAGRAPH_MAX_CHARS) return null;
    const r = document.createRange();
    r.selectNodeContents(block);
    return r;
}
