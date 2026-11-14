/* selection-pdf-order.js — PDF text in visual order: spans, rotation, line bands, columns and gutters, word joining,
 * sentence ranges from spans, resolveCanonicalPdfSelection, sentenceRangeAt.
 * Split out of selection.js on 2026-11-14 without changes; loads right after it. */
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
function pdfNearestSpan(layer, x0, y0) {
    const spans = pdfTextSpans(layer);
    let best = null, bestDist = Infinity;
    for (const s of spans) {
        // a rotated item: the point is turned into the item's own frame (pdfSpanRect), else the tall screen box of a tilted
        // line catches taps on the line below it
        const r = pdfSpanRect(s), [x, y] = pdfPointInSpanFrame(s, x0, y0);
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
// пропуск перед рештою речення: "3. Ils (plaindre)            le vieux voisin." Пропуск
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
// Box of a text-layer item for grouping into lines and columns. A rotated item (a «Mémo» frame printed at 3.5° on a
// textbook page) has a screen bounding box much taller than its line -- a long line tilted by 3.5° grows by 6% of its
// width -- so neighbouring lines overlapped, fused into one «line» and the tapped sentence skipped a line. Here the
// item's own box is taken in the frame of its rotation: its origin (PDF.js rotates each item about its top-left corner)
// is turned back about the middle of the items with that rotation (pdfRotationPivot), its width is the laid-out width times --scale-x. Items without rotation, and
// vertical text (more than 20°), keep their screen box.
// Pivot of each rotation on a layer: the mean origin of its items with that angle. Turning them back about their own
// middle keeps the frame where it is on the page, next to the straight text around it (about the layer's corner the
// frame would move by tens of pixels and fuse with a neighbouring column).
const pdfRotationPivots = new WeakMap();
function pdfRotationPivot(layer, rot) {
    const count = layer.childElementCount;
    let hit = pdfRotationPivots.get(layer);
    if (!hit || hit.count !== count) { hit = { count, pivots: new Map() }; pdfRotationPivots.set(layer, hit); }
    const key = rot.toFixed(3);
    if (!hit.pivots.has(key)) {
        let sx = 0, sy = 0, n = 0;
        for (const el of layer.querySelectorAll('span[style*="--rotate"]')) {
            const r = parseFloat(el.style.getPropertyValue('--rotate')) || 0;
            if (Math.abs(r - rot) < 1e-3) { sx += el.offsetLeft; sy += el.offsetTop; n++; }
        }
        hit.pivots.set(key, n ? [sx / n, sy / n] : [0, 0]);
    }
    return hit.pivots.get(key);
}
function pdfSpanRect(span) {
    const rot = parseFloat(span.style && span.style.getPropertyValue('--rotate')) || 0;
    const layer = span.offsetParent;
    if (!rot || Math.abs(rot) > 20 || !layer || !layer.classList || !layer.classList.contains('pdf-text-layer')) return span.getBoundingClientRect();
    const lr = layer.getBoundingClientRect(), k = (layer.offsetWidth ? lr.width / layer.offsetWidth : 1) || 1;
    const sx = parseFloat(span.style.getPropertyValue('--scale-x')) || 1;
    const [px, py] = pdfRotationPivot(layer, rot);
    const a = -rot * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), dx = span.offsetLeft - px, dy = span.offsetTop - py;
    const x = px + dx * c - dy * sn, y = py + dx * sn + dy * c;
    const w = span.offsetWidth * sx * k, h = span.offsetHeight * k, left = lr.left + x * k, top = lr.top + y * k;
    return { left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top };
}
// A client point in the frame pdfSpanRect uses for this item (unchanged for an item without rotation).
function pdfPointInSpanFrame(span, x, y) {
    const rot = parseFloat(span.style && span.style.getPropertyValue('--rotate')) || 0;
    const layer = span.offsetParent;
    if (!rot || Math.abs(rot) > 20 || !layer || !layer.classList || !layer.classList.contains('pdf-text-layer')) return [x, y];
    const lr = layer.getBoundingClientRect(), k = (layer.offsetWidth ? lr.width / layer.offsetWidth : 1) || 1;
    const [px, py] = pdfRotationPivot(layer, rot), a = -rot * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    const dx = (x - lr.left) / k - px, dy = (y - lr.top) / k - py;
    return [lr.left + (px + dx * c - dy * sn) * k, lr.top + (py + dx * sn + dy * c) * k];
}
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
    const rects = all.map(pdfSpanRect);
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
// Column edges behind a gutter narrower than the column gap threshold: a three-column article on a textbook page leaves 21 px between columns of a 1085 px page, about one line height, and its lines of all three columns
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
    const rects = spans.map(pdfSpanRect);
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
    // A block printed at another angle than the cluster before it (a tilted «Mémo» frame beside straight text) is a
    // column of its own: nothing else can prove it, its lines no longer share bands with the straight ones.
    const segRot = si => Math.round((parseFloat(spans[segments[si].indices[0]].style?.getPropertyValue('--rotate')) || 0) * 10);
    const clusterRot = members => { const n = new Map(); for (const si of members) n.set(segRot(si), (n.get(segRot(si)) || 0) + 1); return [...n].sort((a, b) => b[1] - a[1])[0][0]; };
    clusters.forEach((members, ci) => {
        if (ci > 0 && (members.some(provesColumnEdge) || clusterRot(members) !== clusterRot(clusters[ci - 1]))) column++;
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
    const a = pdfSpanRect(prev), b = pdfSpanRect(next);
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
        const span = n.parentElement?.closest('.pdf-text-layer > span, .markedContent > span') || n.parentElement?.closest('span') || null;
        // Highlight wrappers split an item, not its printed text.
        if (text && span !== prevSpan && !/\s$/.test(text) && !/^\s/.test(n.nodeValue.slice(from, to)) && !pdfSpansContinueWord(prevSpan, span)) text += ' ';
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
        // Endpoints can be adjacent in the content stream while all intervening lines
        // are stored later. Inspect the whole column, not just the endpoint run.
        const climbs = colIdx.some((i, k) => k && pageCols.rects[i].top < pageCols.rects[colIdx[k - 1]].top - pageCols.rects[colIdx[k - 1]].height * 0.8);
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

        // A visited word splits one PDF item into several text nodes. Clip in
        // the item's coordinates, then resolve only the nodes inside that window;
        // clipping just headNode/tailNode also included their unselected siblings.
        const headStart = pdfOffsetInSpan(firstSpan, headNode) + headOffset;
        const tailEnd = pdfOffsetInSpan(lastSpan, tailNode) + tailOffset;
        const pieces = [];
        for (const sp of selectedSpans) {
            pieces.push(...pdfResolveSpanPieces(sp,
                sp === firstSpan ? headStart : 0,
                sp === lastSpan ? tailEnd : sp.textContent.length));
        }
        range._pdfPieces = pieces;
        // The text the reader sees selected: the spans in reading order, words joined the PDF way (pdfSpansToChars), cut at
        // the first / last character of the selection (a born-digital span is often a whole line). A drag inside one column
        // of a multi-column page used to read whole fragments: two words selected in book 56 p.67 were translated and
        // narrated as their whole lines (three words came back as the whole line they stand in).
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
