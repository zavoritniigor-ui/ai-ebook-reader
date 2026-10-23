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
// Вправа "поставте дієслово у потрібну форму" друкує підказку в дужках і лишає широкий
// пропуск перед рештою речення: "3. Ils (plaindre)            la pauvre femme." Пропуск
// ширший за міжколонковий, але обидва фрагменти — ОДИН рядок. Тому рядок продовжується лише
// коли ліворуч безсумнівна ознака вправи: французька дієслівна підказка (той самий предикат
// isFrenchExerciseCue з js/lang-detect.js, що й для визначення мови) або явна лінія-пропуск.
// Усе інше — справжня межа колонок: "l'allemand (m.)   German" (рід у дужках у словнику),
// звичайний текст у двох колонках, наступний нумерований пункт праворуч.
const EXERCISE_ITEM_RE = /^\s*(?:\d+[.)]|[a-zA-Z][.)]|•)\s/;
function isExerciseBlankContinuation(leftText, rightText) {
    const left = (leftText || '').trim(), right = (rightText || '').trim();
    if (!left || !right || EXERCISE_ITEM_RE.test(right)) return false;   // наступний пункт — не продовження
    if (/(?:_{2,}|\.{4,}|…)$/.test(left)) return true;                    // явна лінія-пропуск
    const cue = /^([\s\S]*)\(([^()]{1,40})\)$/.exec(left);
    return !!cue && typeof isFrenchExerciseCue === 'function' && isFrenchExerciseCue(cue[2], cue[1]);
}
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
// Спільне для pdfVisualGroup (одна колонка навколо тапнутого фрагмента) і
// pdfPartitionColumns (УСІ колонки одразу — для виділення, що навмисно захоплює і
// оригінал, і переклад): саме групування спільне, розрізняється лише те, що
// повертається — одна колонка чи всі.
// Horizontal line bands -> per-line segments split at column gaps. `columnStarts` are x positions of column
// edges confirmed elsewhere on the page (see pdfLayerColumnStarts).
// Text lines of a PDF text layer. A word belongs to a line when its box overlaps the line's MEAN box by at least half its
// own height -- not when its TOP is within 0.6 line height of the first word's top, as before. OCR word boxes of a scanned
// book (Internet Archive) start at different heights (ascenders: «No» vs «just») and a slightly rotated scan drifts along
// the line: the old rule cut such lines into pieces, a piece starting mid-page then counted as a second «column», and a
// long selection dropped its words. Returns bands top to bottom: { top, bottom, indices }.
function pdfLineBands(rects, indices) {
    const order = indices.slice().sort((a, b) => (rects[a].top + rects[a].bottom) - (rects[b].top + rects[b].bottom));
    const bands = [];
    for (const i of order) {
        const r = rects[i], h = Math.max(1, r.bottom - r.top);
        let best = null, bestOverlap = 0;
        for (let k = Math.max(0, bands.length - 4); k < bands.length; k++) {   // only the nearest lines can match (sorted by centre)
            const b = bands[k];
            const overlap = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
            if (overlap >= 0.5 * Math.min(h, b.bottom - b.top) && overlap > bestOverlap) { best = b; bestOverlap = overlap; }
        }
        if (best) {
            best.indices.push(i); best.n++; best.sumTop += r.top; best.sumBottom += r.bottom;
            best.top = best.sumTop / best.n; best.bottom = best.sumBottom / best.n;
        } else bands.push({ top: r.top, bottom: r.bottom, sumTop: r.top, sumBottom: r.bottom, n: 1, indices: [i] });
    }
    return bands.sort((a, b) => (a.top + a.bottom) - (b.top + b.bottom));
}
// Reading order of a set of spans (one column): line by line from the top, left to right inside a line.
function pdfReadingOrder(rects) {
    const out = [];
    for (const band of pdfLineBands(rects, rects.map((_, i) => i))) out.push(...band.indices.sort((a, b) => rects[a].left - rects[b].left));
    return out;
}
function pdfLineSegments(spans, rects, layerWidth, columnStarts, narrowStarts = []) {
    const columnGapThreshold = Math.max(24, layerWidth * 0.08);
    const bands = pdfLineBands(rects, rects.map((_, idx) => idx));
    const segments = []; // { left, right, indices: [], first, line }
    for (const [line, band] of bands.entries()) {
        const byLeft = band.indices.slice().sort((a, b) => rects[a].left - rects[b].left);
        let seg = null;
        for (const i of byLeft) {
            const r = rects[i];
            const gap = seg ? r.left - seg.right : 0;
            const isExerciseGap = seg && gap > columnGapThreshold && isExerciseBlankContinuation(
                seg.indices.map(k => spans[k].textContent).join(' ').trim(),
                spans[i].textContent.trim()
            );
            // A narrower-than-threshold gap still separates columns when the span resumes exactly at a column
            // edge other rows confirm -- e.g. the real "tu es  you are (familiar)  vous êtes  you are" row,
            // whose long gloss narrows the gutter to ~2 line heights and used to fuse into the left column.
            // A narrow gutter (pdfNarrowGutterStarts) is only ~1 line height wide, so it is taken from 0.8 of one.
            const near = xs => xs.some(x => Math.abs(r.left - x) <= Math.max(4, r.height * 0.5));
            const atColumnEdge = seg && gap <= columnGapThreshold &&
                ((gap >= r.height * 1.2 && near(columnStarts)) || (gap >= r.height * 0.8 && near(narrowStarts))) &&
                !isExerciseBlankContinuation(seg.indices.map(k => spans[k].textContent).join(' ').trim(), spans[i].textContent.trim());
            if (seg && !atColumnEdge && (gap <= columnGapThreshold || isExerciseGap)) {
                seg.indices.push(i);
                seg.right = Math.max(seg.right, r.right);
            } else {
                seg = { left: r.left, right: r.right, indices: [i], first: !seg, line };
                segments.push(seg);
            }
        }
    }
    return segments;
}
// Column edges (x of a segment that is not the first one of its line) shared by at least two lines of the
// WHOLE page -- a drag range alone often holds just one such line -- and how many lines the page has (a page with
// only one or two lines cannot show a second row, see pdfComputeColumns). Cached per text layer and width.
const pdfColumnStartCache = new WeakMap();
function pdfLayerColumnInfo(layer, layerWidth) {
    if (!layer) return { starts: [], lines: 0 };
    const hit = pdfColumnStartCache.get(layer);
    const all = pdfTextSpans(layer);
    if (hit && hit.width === layerWidth && hit.count === all.length && hit.left === layer.getBoundingClientRect().left) return hit;
    const rects = all.map(s => s.getBoundingClientRect());
    const segments = pdfLineSegments(all, rects, layerWidth, []);
    const inner = segments.filter(s => !s.first).map(s => s.left).sort((a, b) => a - b);
    const starts = [];
    for (let k = 0; k < inner.length;) {
        let j = k;
        while (j + 1 < inner.length && inner[j + 1] - inner[k] <= 6) j++;
        if (j > k) starts.push(inner[k]);
        k = j + 1;
    }
    const narrow = pdfNarrowGutterStarts(rects, layerWidth);
    for (const x of narrow) if (!starts.some(s => Math.abs(s - x) <= 6)) starts.push(x);
    const info = { width: layerWidth, count: all.length, left: layer.getBoundingClientRect().left, starts, narrow, lines: new Set(segments.map(s => s.line)).size };
    pdfColumnStartCache.set(layer, info);
    return info;
}
// Column edges behind a gutter narrower than the column gap threshold: a three-column article (livre 56, p. 67, «L'essentiel
// sur la vitamine D») leaves 21 px between columns of a 1085 px page, about one line height, and its lines of all three columns
// used to fuse into one, so the «sentence» button selected the neighbouring columns too. A gap of at least 0.8 line height
// between two lines of text, after which the text resumes at the same x on three or more lines, is such a gutter when it runs
// down the page like a river: hardly any line between the first and the last of them has text across it. The run-in items
// of an answer key («7. En courant …   8. En prenant …») line up at some x by chance, but the lines around them cross it.
function pdfNarrowGutterStarts(rects, layerWidth) {
    const columnGapThreshold = Math.max(24, layerWidth * 0.08);
    const bands = pdfLineBands(rects, rects.map((_, i) => i));
    const gaps = [];   // { left, right, line }
    for (const [line, band] of bands.entries()) {
        const byLeft = band.indices.slice().sort((a, b) => rects[a].left - rects[b].left);
        for (let k = 1; k < byLeft.length; k++) {
            const a = rects[byLeft[k - 1]], b = rects[byLeft[k]], h = Math.min(a.height, b.height);
            const gap = b.left - a.right;
            // Lines of text on both sides (at least 6 line heights wide), not the cells of a table: «je | faisais» rows would
            // confirm so many edges that the columns of the page chain into one.
            if (gap >= h * 0.8 && gap <= columnGapThreshold && a.width >= h * 6 && b.width >= h * 6) gaps.push({ left: b.left, right: a.right, line });
        }
    }
    gaps.sort((a, b) => a.left - b.left);
    const starts = [];
    for (let k = 0; k < gaps.length;) {
        let j = k;
        while (j + 1 < gaps.length && gaps[j + 1].left - gaps[k].left <= 3) j++;
        const group = gaps.slice(k, j + 1);
        const lines = new Set(group.map(g => g.line)), left = gaps[k].left;
        const first = Math.min(...lines), last = Math.max(...lines);
        let crossed = 0;   // lines whose text runs on past the column edge
        for (let ln = first; ln <= last; ln++) {
            if (!lines.has(ln) && bands[ln].indices.some(i => rects[i].left < left - 2 && rects[i].right > left + 2)) crossed++;
        }
        if (lines.size >= 3 && crossed <= lines.size / 4) starts.push(left);
        k = j + 1;
    }
    return starts;
}
function pdfLayerColumnStarts(layer, layerWidth) {
    return pdfLayerColumnInfo(layer, layerWidth).starts;
}
// The spans of a whole text layer and their columns, kept while nothing about the page changes: a drag asks for them on EVERY
// pointer move, and the page does not move under it. The key is cheap (the live span count, the first / last child, the layer's
// own box -- a scroll, a zoom or a re-render changes at least one of them).
const pdfPageColumnsCache = new WeakMap();
function pdfPageColumns(layer, layerWidth) {
    const box = layer.getBoundingClientRect(), count = layer.getElementsByTagName('span').length;
    const hit = pdfPageColumnsCache.get(layer);
    if (hit && hit.count === count && hit.first === layer.firstElementChild && hit.last === layer.lastElementChild
        && hit.left === box.left && hit.top === box.top && hit.width === box.width && hit.height === box.height) return hit;
    const spans = pdfTextSpans(layer);
    const entry = { count, first: layer.firstElementChild, last: layer.lastElementChild, left: box.left, top: box.top, width: box.width, height: box.height, spans, cols: pdfComputeColumns(spans, layerWidth) };
    pdfPageColumnsCache.set(layer, entry);
    return entry;
}
function pdfComputeColumns(spans, layerWidth) {
    const rects = spans.map(s => s.getBoundingClientRect());
    const columnGapThreshold = Math.max(24, layerWidth * 0.08);
    const layer = spans[0]?.closest?.('.pdf-text-layer');
    const info = layer ? pdfLayerColumnInfo(layer, layerWidth) : null;
    const segments = pdfLineSegments(spans, rects, layerWidth, info ? info.starts : [], info ? info.narrow : []);
    const segLeft = segments.map(s => s.left);
    const segsByLeft = segLeft.map((_, i) => i).sort((a, b) => segLeft[a] - segLeft[b]);
    const segColumn = new Array(segments.length).fill(0);
    // The sorted left edges fall into clusters wherever two neighbours differ by more than the gap threshold. A cluster
    // starts a NEW column only when something in it proves a column edge: a left edge the PAGE confirms (pdfLayerColumnStarts:
    // lines resuming there after a gutter, on two or more lines), or -- on a page with only one or two lines, which has no
    // room for a second row to confirm anything -- a segment that follows another one on its own line. A cluster that is
    // only first-on-its-line segments at an unconfirmed x -- a centred heading, a page number, a verse line, an indented
    // paragraph, a scanned line's tail -- is not a column, and neither is one speaker label followed by a gap on a page of
    // prose: that used to split one-column pages of scanned books into several «columns», and a selection then dropped the
    // words of the «other» ones. The proof is looked for in the whole cluster, not in its leftmost member, so the verdict
    // does not depend on which of two nearly equal edges sorts first.
    const pageStarts = info ? info.starts : [];
    const provesColumnEdge = si => {
        if (!info) return true;
        const seg = segments[si], h = rects[seg.indices[0]].height || 10;
        if (pageStarts.some(c => Math.abs(seg.left - c) <= Math.max(6, h * 0.5))) return true;
        return !seg.first && info.lines <= 2;
    };
    let column = 0;
    const clusters = [];
    segsByLeft.forEach((si, k) => {
        if (k === 0 || segLeft[si] - segLeft[segsByLeft[k - 1]] > columnGapThreshold) clusters.push([si]);
        else clusters[clusters.length - 1].push(si);
    });
    clusters.forEach((members, ci) => {
        if (ci > 0 && members.some(provesColumnEdge)) column++;
        members.forEach(si => { segColumn[si] = column; });
    });
    const spanSeg = new Array(spans.length);
    segments.forEach((seg, si) => seg.indices.forEach(i => spanSeg[i] = si));
    return { rects, segColumn, spanSeg, columnCount: segColumn.length ? Math.max(...segColumn) + 1 : 0 };
}
// Усі фрагменти (не лише один навколо тапнутого), згруповані по колонках — колонка
// 0 лівіша, і так далі; кожна група — у справжньому порядку читання. Для звичайного
// одноколонкового тексту завжди повертає РІВНО одну групу. Використовується для
// виділення, що навмисно тягнеться через ОБИДВІ колонки двомовної сторінки: перш
// ніж вирішувати, яка з них — мова вивчення, треба знати, де саме проходить межа.
function pdfPartitionColumns(spans) {
    if (!spans.length) return [];
    const layer = spans[0].closest('.pdf-text-layer');
    const layerWidth = (layer && layer.getBoundingClientRect().width) || 1;
    const { rects, segColumn, spanSeg, columnCount } = pdfComputeColumns(spans, layerWidth);
    const groups = Array.from({ length: columnCount }, () => ({ spans: [], rects: [] }));
    spans.forEach((s, i) => { const g = groups[segColumn[spanSeg[i]]]; g.spans.push(s); g.rects.push(rects[i]); });
    return groups.filter(g => g.spans.length).map(g => pdfReadingOrder(g.rects).map(i => g.spans[i]));
}
function pdfVisualGroup(layer, targetSpan) {
    const spans = pdfTextSpans(layer);
    if (!spans.length) return [];
    const targetIdx = spans.indexOf(targetSpan);
    if (targetIdx < 0) return spans;
    const layerWidth = layer.getBoundingClientRect().width || 1;
    const { rects, segColumn, spanSeg } = pdfComputeColumns(spans, layerWidth);
    const targetColumn = segColumn[spanSeg[targetIdx]];
    const sameColumn = [];
    const sameColumnRects = [];
    spans.forEach((s, i) => { if (segColumn[spanSeg[i]] === targetColumn) { sameColumn.push(s); sameColumnRects.push(rects[i]); } });
    // У межах колонки — справжній порядок читання (рядок згори вниз, у рядку зліва
    // направо), а не DOM/content-stream порядок.
    const order = pdfReadingOrder(sameColumnRects);
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
// Ті самі межі речення (sentenceCuts у core.js), що й у buildSentenceRanges,
// але джерело символів — заздалегідь відсортований у ВІЗУАЛЬНОМУ порядку список
// фрагментів PDF, а не TreeWalker по DOM. range.toString() свідомо перевизначений на
// точний зібраний текст: звичайний Range.toString() однаково пройшовся б по DOM/
// content-stream порядку між startContainer і endContainer і міг би знову зачепити
// фрагмент іншої колонки, що лежить між ними в розмітці.
// PDFs split ONE word into several text items: a detached first letter ("a" + "ppliquer"), small-caps
// headings cut mid-word ("Pr","ÉP","ar","E","r"). Such an item starts exactly where the previous one ends,
// on the same line. Joining those (and only those) keeps the word whole; a word space, a bullet, another
// line or another column always leaves a real gap, so those still separate. The tolerance is a fraction of
// the glyph height, well below a space (~0.25em), so a stream that omitted its space chars still separates.
const PDF_SPAN_JOIN_GAP = 0.12;
function pdfSpansContinueWord(prev, next) {
    if (!prev || !next) return false;
    const a = prev.getBoundingClientRect(), b = next.getBoundingClientRect();
    const h = Math.min(a.height, b.height);
    if (!(h > 0) || Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) > h * 0.4) return false;   // another line
    const gap = b.left - a.right;
    return gap <= h * PDF_SPAN_JOIN_GAP && gap >= -h * 0.6;       // continues the run (a little overlap is normal); not a big backwards jump
}
// Плоский потік символів набору фрагментів PDF, з роздільником там, де його не
// вистачає в тексті (див. pdfSpansContinueWord) — спільне для buildSentenceRangesFromSpans
// (ділить далі на речення) і pdfSpansToText (просто зшиває — для виділення, що
// свідомо охоплює кілька колонок і не є одним "реченням").
function pdfSpansToChars(spans) {
    const chars = [];
    for (let s = 0; s < spans.length; s++) {
        const span = spans[s];
        const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
            const text = node.nodeValue || '';
            for (let i = 0; i < text.length; i++) chars.push({ node, offset: i, ch: text[i], span });
        }
        // PDF text items/lines need a separator even when the stream omits spaces -- unless the next item merely
        // CONTINUES this one's word (see pdfSpansContinueWord).
        if (chars.length && !/\s/.test(chars.at(-1).ch) && !pdfSpansContinueWord(span, spans[s + 1])) chars.push({ ...chars.at(-1), ch: ' ', separator: true });
    }
    return chars;
}
// Просто зшитий текст набору фрагментів — без розбиття на речення (звичайне
// протягування мишею через кілька колонок не є "одним реченням").
function pdfSpansToText(spans) {
    return pdfSpansToChars(spans).map(c => c.ch).join('').trim();
}
function buildSentenceRangesFromSpans(spans) {
    const chars = pdfSpansToChars(spans);
    const cuts = sentenceCuts(chars.map(c => c.ch).join(''));   // core.js: скорочення, ініціали, лапки
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
        const atSentenceEnd = cuts.has(k);
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
// Plain text of an ARBITRARY PDF Range (a mouse drag, not built from whole spans like
// pdfVisualGroup's group): clips partial start/end nodes correctly, and inserts a
// separator wherever pdfSpansContinueWord says the next item is NOT a continuation of the
// same word -- the same rule that already fixed the sentence/tap paths, now applied to a
// raw drag range too, since a bare Range.toString() over a PDF text layer has NO
// separator between items AT ALL (real page: a rectangle dragged across a bilingual
// table's rows used to read "...having seenayant compris having understood...").
function pdfRangeText(range) {
    const root = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(n) { return n.nodeValue && range.intersectsNode(n) && !n.parentElement?.closest('.markedContent') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    let text = '', prevSpan = null, n;
    while (n = walker.nextNode()) {
        const from = (n === range.startContainer) ? range.startOffset : 0;
        const to = (n === range.endContainer) ? range.endOffset : n.nodeValue.length;
        if (to <= from) continue;
        const span = n.parentElement?.closest('span') || null;
        if (text && !/\s$/.test(text) && !pdfSpansContinueWord(prevSpan, span)) text += ' ';
        text += n.nodeValue.slice(from, to);
        prevSpan = span || prevSpan;
    }
    return text.trim();
}
// Every PDF text-layer span the range touches, for column partitioning (pdfPartitionColumns) --
// whole-span granularity is enough there (a column decision is never made mid-word).
function pdfRangeSpans(range) {
    const startEl = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
    const layer = startEl && startEl.closest && startEl.closest('.pdf-text-layer');
    if (!layer) return [];
    return pdfTextSpans(layer).filter(s => range.intersectsNode(s));
}

// The word a range end sits in (word characters as wordBoundsAt sees them): where it starts / where it ends.
function pdfWordStartAt(node, offset) {
    const text = (node && node.nodeValue) || '';
    let start = Math.min(Math.max(0, offset), text.length);
    while (start > 0 && IS_WORD_CH(text[start - 1])) start--;
    return start;
}
function pdfWordEndAt(node, offset) {
    const text = (node && node.nodeValue) || '';
    let end = Math.min(Math.max(0, offset), text.length);
    while (end < text.length && IS_WORD_CH(text[end])) end++;
    return end;
}
// Canonical PDF selection resolver: ensures geometry-based column isolation,
// study-language priority for multi-column / bilingual PDFs, and structured result object.
function resolveCanonicalPdfSelection(range, options = {}) {
    if (!range) return null;
    const rawSpans = pdfRangeSpans(range);
    if (!rawSpans.length) {
        const text = (range.toString() || '').trim();
        const studyLang = (typeof pageLang === 'function' ? pageLang() : 'en').slice(0, 2).toLowerCase();
        const fallback = {
            text,
            grammarText: text,
            sourceLanguage: studyLang,
            targetLanguage: state.targetLang || 'uk',
            isCrossColumn: false,
            columns: [],
            studyColumnIndex: -1,
            spans: [],
            range,
            rect: null,
            sourceType: options.sourceType || 'phrase_translation'
        };
        state.canonicalSelection = fallback;
        return fallback;
    }

    const layer = rawSpans[0].closest('.pdf-text-layer');
    const layerWidth = (layer && layer.getBoundingClientRect().width) || 1;
    const studyLang = (typeof pageLang === 'function' ? pageLang() : 'en').slice(0, 2).toLowerCase();

    // Columns are judged on the whole page, so a drag within one column of a two-column page stays there.
    const page = layer ? pdfPageColumns(layer, layerWidth) : null;
    const pageSpans = page ? page.spans : rawSpans;
    const pageCols = page ? page.cols : pdfComputeColumns(pageSpans, layerWidth);
    const spanOf = node => { const el = node && (node.nodeType === Node.TEXT_NODE ? node.parentElement : node); return el ? pageSpans.find(sp => sp === el || sp.contains(el)) || null : null; };
    const startSpan = spanOf(range.startContainer), endSpan = spanOf(range.endContainer);
    const colOf = sp => { const i = sp ? pageSpans.indexOf(sp) : -1; return i >= 0 ? pageCols.segColumn[pageCols.spanSeg[i]] : -1; };
    const startCol = colOf(startSpan), endCol = colOf(endSpan);

    // Which words lie between the two ends. The order the text layer lists them in is trusted while it never climbs back up the
    // page: an OCR engine emits its lines in reading order even when the boxes of two neighbouring lines overlap vertically (then
    // sorting by position would interleave the two lines word by word). Only a layer that jumps around -- blocks listed in another
    // order than they are read, the stanzas of two columns interleaved -- is read by where its words are ON THE PAGE; a DOM range
    // from the first to the last word then held a fraction of what the reader selected (a long selection «skipped words»).
    const sameColumn = !!(startSpan && endSpan && startCol >= 0 && (pageCols.columnCount <= 1 || startCol === endCol));
    let selectedSpans = null, layerInOrder = false;
    if (sameColumn) {
        const colIdx = pageSpans.map((_, i) => i).filter(i => pageCols.segColumn[pageCols.spanSeg[i]] === startCol);   // DOM order
        const p1 = colIdx.indexOf(pageSpans.indexOf(startSpan)), p2 = colIdx.indexOf(pageSpans.indexOf(endSpan));
        const run = colIdx.slice(Math.min(p1, p2), Math.max(p1, p2) + 1);
        const climbs = run.some((i, k) => k && pageCols.rects[i].top < pageCols.rects[run[k - 1]].top - pageCols.rects[run[k - 1]].height * 0.8);
        if (!climbs) { layerInOrder = true; selectedSpans = run.map(i => pageSpans[i]); }
        else {
            const colSpans = pdfReadingOrder(colIdx.map(i => pageCols.rects[i])).map(k => pageSpans[colIdx[k]]);
            const i1 = colSpans.indexOf(startSpan), i2 = colSpans.indexOf(endSpan);
            selectedSpans = colSpans.slice(Math.min(i1, i2), Math.max(i1, i2) + 1);
        }
    }

    // CASE A: a drag inside ONE column of a multi-column page, or inside a one-column page whose layer lists its words out of order.
    // A one-column page whose layer is in order is the plain DOM range (CASE B below), exactly as before.
    if (selectedSpans && !(layerInOrder && pageCols.columnCount <= 1)) {
        // A drag can go upwards: the range's start node is then the LAST span in reading order.
        const firstSpan = selectedSpans[0], lastSpan = selectedSpans[selectedSpans.length - 1];
        const rangeStartsFirst = selectedSpans.indexOf(startSpan) <= selectedSpans.indexOf(endSpan);
        // A DOM range runs from the START of its earlier word to the END of its later one. When the page order is the opposite of
        // the DOM order the two ends swap roles, and each must be widened/narrowed to ITS word: the word that is first on the
        // page is selected from its start, the last one up to its end (the offsets of the range would give them empty).
        const headNode = rangeStartsFirst ? range.startContainer : range.endContainer, tailNode = rangeStartsFirst ? range.endContainer : range.startContainer;
        const headOffset = rangeStartsFirst ? range.startOffset : pdfWordStartAt(range.endContainer, range.endOffset);
        const tailOffset = rangeStartsFirst ? range.endOffset : pdfWordEndAt(range.startContainer, range.startOffset);

        const pieces = [];
        for (const sp of selectedSpans) {
            const walker = document.createTreeWalker(sp, NodeFilter.SHOW_TEXT);
            let n, foundText = false;
            while ((n = walker.nextNode())) {
                foundText = true;
                const pStart = (sp === firstSpan && n === headNode) ? headOffset : 0;
                const pEnd = (sp === lastSpan && n === tailNode) ? tailOffset : n.nodeValue.length;
                if (pEnd > pStart) pieces.push({ node: n, start: pStart, end: pEnd, span: sp });
            }
            if (!foundText && sp.textContent) pieces.push({ node: sp.firstChild || sp, start: 0, end: (sp.textContent || '').length, span: sp });
        }
        range._pdfPieces = pieces;
        // The text the reader sees selected: the spans in reading order, words joined the PDF way (pdfSpansToChars), cut at
        // the first / last character of the selection (a born-digital span is often a whole line). A drag inside one column
        // of a multi-column page used to read whole fragments: two words selected in livre 56 p.67 were translated and
        // narrated as their whole lines («palement fabriquée par notre peau à» for «fabriquée par notre»).
        const byNode = new Map(pieces.map(p => [p.node, p]));
        const cleanText = pdfSpansToChars(selectedSpans)
            .filter(c => c.separator || (byNode.has(c.node) && c.offset >= byNode.get(c.node).start && c.offset < byNode.get(c.node).end))
            .map(c => c.ch).join('').replace(/\s+/g, ' ').trim();
        range.toString = () => cleanText;

        let rect = null;
        try { const b = range.getBoundingClientRect(); if (b && (b.width || b.height)) rect = b; } catch (e) {}
        const lang = (typeof detectLang === 'function' ? String(detectLang(cleanText) || '') : '').slice(0, 2).toLowerCase();
        const column = { index: startCol, spans: selectedSpans, text: cleanText, lang };
        const canonical = {
            text: cleanText,
            grammarText: cleanText,
            sourceLanguage: lang || studyLang,
            targetLanguage: state.targetLang || 'uk',
            isCrossColumn: false,
            columns: [column],
            studyColumnIndex: lang === studyLang ? 0 : -1,
            spans: selectedSpans,
            range,
            rect,
            sourceType: options.sourceType || 'phrase_translation'
        };
        state.canonicalSelection = canonical;
        return canonical;
    }

    // A drag ACROSS the columns of a two-column (bilingual) page: the columns of the dragged spans, as before.
    const { rects, segColumn, spanSeg, columnCount } = pdfComputeColumns(rawSpans, layerWidth);
    const colGroups = Array.from({ length: columnCount }, () => ({ spans: [], rects: [] }));
    rawSpans.forEach((sp, i) => {
        const c = segColumn[spanSeg[i]];
        if (colGroups[c]) { colGroups[c].spans.push(sp); colGroups[c].rects.push(rects[i]); }
    });
    const partitionedColumns = colGroups.filter(g => g.spans.length).map((g, colIdx) => {
        const spans = pdfReadingOrder(g.rects).map(i => g.spans[i]);
        const text = pdfSpansToText(spans);
        const lang = (typeof detectLang === 'function' ? String(detectLang(text) || '') : '').slice(0, 2).toLowerCase();
        return { index: colIdx, spans, text, lang };
    });

    // CASE B: Ambiguous cross-column drag, or normal single-column layout.
    const isCrossColumn = partitionedColumns.length > 1;
    const fullText = pdfRangeText(range);
    let studyCol = null;
    let studyColIdx = -1;
    if (isCrossColumn) {
        studyColIdx = partitionedColumns.findIndex(c => c.lang === studyLang);
        if (studyColIdx >= 0) studyCol = partitionedColumns[studyColIdx];
    }

    const grammarText = studyCol ? studyCol.text : fullText;
    let rect = null;
    try { const b = range.getBoundingClientRect(); if (b && (b.width || b.height)) rect = b; } catch (e) {}

    const canonical = {
        text: fullText,
        grammarText,
        sourceLanguage: (studyCol && studyCol.lang) || studyLang,
        targetLanguage: state.targetLang || 'uk',
        isCrossColumn,
        columns: partitionedColumns,
        studyColumnIndex: studyColIdx,
        spans: rawSpans,
        range,
        rect,
        sourceType: options.sourceType || 'phrase_translation'
    };
    state.canonicalSelection = canonical;
    return canonical;
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
let pdfSelectionTouch = null;
// A stylus selects on the mouse path (immediately, no long-press), but browsers give pen drags the same
// touch-action panning as fingers (and on Android also dispatch them as touch events): without a guard the
// first pen move over the PDF became a native scroll, fired pointercancel and dropped the selection.
let penSelectionActive = false;

function cancelDragSelection() {
    const hadDragHighlight = !!state.dragRange;
    clearTimeout(touchSelTimer); touchSelTimer = null;
    dragSel = null; dragMoved = false; state.dragRange = null;
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
document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { cancelDragSelection(); return; }
    if (state.format !== 'pdf' || !touchSelTimer || !els.container.contains(e.target) || e.target.closest('.pdf-audio-marker')) return;
    const t = e.touches[0];
    pdfSelectionTouch = { id: t.identifier, x: t.clientX, y: t.clientY, blocked: false, scrolling: false };
}, { passive: true });
function guardTouchSelectionMove(e) {
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

els.mainArea.addEventListener('pointerdown', (e) => {
    if (state.touchJustCommitted && Date.now() - state.touchJustCommitted < 700) return;
    if (e.pointerType === 'touch' && !e.isPrimary) { cancelDragSelection(); return; }
    if (state.format === 'pdf' && !els.container.contains(e.target)) return;
    if (state.inkMode) return;
    if (!state.translateMode) return;
    if (e.button !== 0) return;
    if (e.target.closest('#word-tooltip') || e.target.closest('.side-panel') ||
        e.target.closest('.pdf-audio-marker') || e.target.closest('#audio-player') || e.target.closest('#book-audio-dialog') ||
        e.target.closest('#tts-controls') || e.target.closest('nav') || e.target.closest('header')) return;

    cancelDragSelection();
    dragStartX = e.clientX; dragStartY = e.clientY; dragMoved = false;

    if (e.pointerType === 'touch') {
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
    let w = wordBoundsAt(e.clientX, e.clientY);
    if (!w && state.format === 'pdf' && dragSel) {
        for (const dy of [-8, 8, -16, 16, -24, 24]) {
            w = wordBoundsAt(e.clientX, e.clientY + dy);
            if (w) break;
        }
    }
    if (!w) return;
    const r = rangeBetweenWords(dragSel, w);
    if (!r) return;
    state.dragRange = r;
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
    const start = dragSel; dragSel = null;
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

document.addEventListener('touchend', (e) => {
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
}, { passive: false });

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

els.mainArea.addEventListener('click', (e) => {
    if (e.target.closest('#pdf-scrubber')) return;
    if (state.inkMode) return;   // у режимі письма тап малює, а не перекладає
    if (state.suppressNextClick) { state.suppressNextClick = false; return; } // клік після свайпу — ігноруємо
    if(e.target.closest('#word-tooltip') || e.target.closest('.side-panel') || e.target.closest('nav') || e.target.closest('#menu-handle') || e.target.closest('#footer-handle') || e.target.closest('#tts-controls') || e.target.closest('.pdf-audio-marker') || e.target.closest('#audio-player') || e.target.closest('#book-audio-dialog')) return;
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
});
