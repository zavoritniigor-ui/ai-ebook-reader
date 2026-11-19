// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
/* pdf-flow.js — the reading flow of a PDF page: its paragraphs, taken from the order the PDF itself writes its text in
 * (the content stream), checked against the geometry and the fonts of every line.
 *
 * Why the stream: a book made in a layout program (InDesign, every Par Ici book) writes each text frame's story from its
 * first word to its last; a table, a side box, a caption or a speech bubble is a frame of its own and is written apart.
 * The page's geometry alone cannot tell a paragraph from a table printed two line heights beside it (a «Mémo» frame: the
 * rule on the left, «moi + en = [mwazã]» rows on the right), nor an exercise item from the next one, nor a heading from
 * the text under it -- the visual columns (selection-pdf-order.js) fused them, and a tapped «sentence» ran on into the
 * table rows, the next exercise items, the heading. In the stream they are apart.
 * The stream is not trusted blindly: an item joins the text before it only where it CONTINUES it on the page -- further
 * along the same line, or at the start of the next line of the same paragraph (same size, same line pitch, same left
 * edge, same font unless the line before wraps into it). Everything else starts a new block. A page whose stream jumps
 * around on the page (pdfFlowIsOrderly) is left to the visual columns.
 *
 * Fonts: pdf-render.js writes each item's font name into its span (data-font). Without it (an OCR layer) all fonts are
 * equal and only the geometry decides.
 *
 * Loads right after selection-pdf-order.js (pdfTextSpans, pdfSpanRect) and registers itself in its PDF_FLOW hook, which
 * sentenceRangeAt and resolveCanonicalPdfSelection there use (so the two files do not call each other). */

// A unit (a heading, a table cell, a list item) ends with one of these.
const PDF_FLOW_UNIT_END = /[.!?…:;»"”)\]]\s*$/;
const PDF_FLOW_SENTENCE_END = /[.!?…]["»”)\]]*\s*$/;
// A list or exercise item at the start of a line: «a.», «b)», «12.», «•», «–», «→», «(c)». Upper-case letters only with
// a parenthesis: «M. Dupont» at the start of a wrapped line is a name, not an item.
const PDF_FLOW_MARKER = /^\s*(?:\d{1,3}[.)]|[a-z][.)]|[A-Z]\)|[•–—→▶■□☐*-]|\(\w\))(?:\s|$)/;
const PDF_FLOW_ITEM_IN_LINE = /^\s*(?:\d{1,3}[.)]|[a-z][.)]|[A-Z]\)|[•■□☐]|\(\w\))(?:\s|$)/;
const PDF_FLOW_LOWER_START = /^[\p{Ll}]/u;

function pdfFlowMedian(values) {
    const s = values.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
}
// The font that prints most of the characters of these items.
function pdfFlowDominantFont(spans, idx) {
    const count = new Map();
    for (const i of idx) {
        const f = spans[i].dataset.font || '';
        count.set(f, (count.get(f) || 0) + spans[i].textContent.length);
    }
    let best = '', most = -1;
    for (const [f, n] of count) if (n > most) { best = f; most = n; }
    return best;
}
// Same line: the vertical middles of two boxes are within 0.45 of the smaller height.
function pdfFlowSameLine(a, b) {
    return Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) <= Math.max(1, Math.min(a.height ?? a.h, b.height ?? b.h)) * 0.45;
}

// 1. Pieces: stream-consecutive items on one line, in order of position, with no gap wider than a word gap
// (pdfFlowWordGap: a word space, a style change, an accent printed as an item of its own). A wider gap -- a gap-fill
// blank, a table's next cell, a tab stop, the other column of a parallel text -- ends the piece; pdfFlowReadsOn decides
// whether the next piece reads on.
function pdfFlowPieces(spans, rects) {
    const wordGap = pdfFlowWordGap(rects);
    // The items the stream writes in a row on one line. Usually left to right; some generators (a page printed from
    // Firefox) write a line's plain text first, leaving holes, and then the words in another style that fill them
    // («— Pardon, mais ____ sont-ils au courant…», then «les médecins») -- such a run is put in order of position, so the
    // holes close before the line is cut at its real gaps.
    const runs = [];
    for (let i = 0; i < spans.length; i++) {
        const run = runs[runs.length - 1];
        if (run && pdfFlowSameLine(rects[i], rects[run[run.length - 1]])) run.push(i);
        else runs.push([i]);
    }
    const pieces = [];
    for (const run of runs) {
        if (run.some((i, k) => k && rects[i].left < rects[run[k - 1]].left - 2)) run.sort((a, b) => rects[a].left - rects[b].left || a - b);
        let cur = null;
        for (const i of run) {
            const r = rects[i];
            if (cur) {
                const h = Math.max(1, Math.min(r.height, rects[cur.idx[cur.idx.length - 1]].height));
                if (r.left - cur.right <= h * wordGap) { cur.idx.push(i); cur.right = Math.max(cur.right, r.right); continue; }
            }
            cur = { idx: [i], left: r.left, right: r.right };
            pieces.push(cur);
        }
    }
    for (const p of pieces) {
        // The line's box is that of the items carrying its letters: a tick box or an icon printed twice as tall beside
        // the text («☐ les informations…») is not the size of the line.
        const lettered = p.idx.filter(i => /\p{L}/u.test(spans[i].textContent));
        const own = lettered.length ? lettered : p.idx;
        p.top = pdfFlowMedian(own.map(i => rects[i].top));
        p.h = pdfFlowMedian(own.map(i => rects[i].height));
        p.bottom = p.top + p.h;
        p.font = pdfFlowDominantFont(spans, p.idx);
        p.firstFont = spans[p.idx[0]].dataset.font || '';
        p.text = p.idx.map(i => spans[i].textContent).join(' ').replace(/\s+/g, ' ').trim();
    }
    return pieces;
}

// The widest gap (in line heights) that still separates two words of one line on this page. A typeset page spaces its
// words by about a quarter of a line height: 1.2 lets a justified line stretch. An OCR layer (Internet Archive scans)
// places each word where the scan shows it, and a sentence often ends with a gap of 1.3 line heights -- the cut at 1.2
// broke «…before one has data.  Insensibly one begins…» into two blocks. The page's own spacing raises the limit, never
// above 2 line heights: a gloss beside its word («tu es    you are») stays apart.
function pdfFlowWordGap(rects) {
    const gaps = [];
    for (let i = 1; i < rects.length; i++) {
        const a = rects[i - 1], b = rects[i], h = Math.max(1, Math.min(a.height, b.height)), g = (b.left - a.right) / h;
        if (pdfFlowSameLine(a, b) && g > 0.05 && g < 3) gaps.push(g);
    }
    return gaps.length >= 20 ? Math.min(2, Math.max(1.2, pdfFlowMedian(gaps) * 2.5)) : 1.2;
}

// The usual distance from one line to the next on this page, in line heights: about 1.2 in typeset text, about 1.8 in
// double-spaced text. The limits below for «the next line of the same paragraph» grow with it.
function pdfFlowLinePitch(pieces) {
    const ratios = [];
    for (let k = 1; k < pieces.length; k++) {
        const a = pieces[k - 1], b = pieces[k], h = Math.max(1, Math.min(a.h, b.h)), r = (b.top - a.top) / h;
        if (r >= 0.7 && r <= 3 && Math.abs(b.left - a.left) <= h * 4) ratios.push(r);
    }
    return ratios.length >= 6 ? pdfFlowMedian(ratios) : 1.2;
}

// 2. Blocks: stream-consecutive pieces that read on. A block keeps its lines: { left, right, top, text, font }.
function pdfFlowBlocks(pieces) {
    const blocks = [];
    const pitch = pdfFlowLinePitch(pieces);
    for (const p of pieces) {
        p.maxPitch = Math.max(1.75, pitch * 1.25);       // the next line of a paragraph lies no further down than this
        p.maxInterleavedPitch = Math.max(1.45, pitch * 1.2);
        const b = blocks[blocks.length - 1];
        if (b && pdfFlowReadsOn(b, p)) { pdfFlowAddPiece(b, p); continue; }
        const earlier = pdfFlowInterleavedBlock(blocks, p);
        if (earlier) { pdfFlowAddPiece(earlier, p); continue; }
        const nb = { pieces: [], lines: [], left: p.left, right: p.right, top: p.top, h: p.h, font: p.font, marker: PDF_FLOW_MARKER.test(p.text) };
        pdfFlowAddPiece(nb, p);
        blocks.push(nb);
    }
    return blocks;
}
// Parallel texts (a bilingual book: the French line, then the English line beside it, then the next French line …) write
// two columns line by line in turn. The next line of a block then comes after the line of the other column, not right
// after its own. A piece goes on with an earlier block (up to three blocks back) when every block written in between lies
// beside that block's last line -- the other column of the same line -- and the piece is the block's next line at a text
// line pitch (at most 1.45 line heights in typeset text: the rows of a table stand further apart and stay cells of their own).
function pdfFlowInterleavedBlock(blocks, p) {
    for (let k = blocks.length - 2; k >= Math.max(0, blocks.length - 4); k--) {
        const b = blocks[k], line = b.lines[b.lines.length - 1];
        const beside = blocks.slice(k + 1).every(o => {
            const ol = o.lines[o.lines.length - 1];
            return pdfFlowSameLine(ol, line) && (ol.left >= line.right || ol.right <= line.left);
        });
        if (!beside) return null;
        if (p.top - line.top <= b.h * p.maxInterleavedPitch && pdfFlowReadsOn(b, p)) return b;
    }
    return null;
}
function pdfFlowAddPiece(b, p) {
    const line = b.lines[b.lines.length - 1];
    if (line && pdfFlowSameLine(line, p)) {
        line.right = Math.max(line.right, p.right);
        line.text += ' ' + p.text;
    } else b.lines.push({ left: p.left, right: p.right, top: p.top, bottom: p.bottom, h: p.h, text: p.text, font: p.font });
    b.pieces.push(p);
    b.left = Math.min(b.left, p.left); b.right = Math.max(b.right, p.right);
}
// Does piece p, next in the stream, continue block b?
function pdfFlowReadsOn(b, p) {
    const last = b.pieces[b.pieces.length - 1], line = b.lines[b.lines.length - 1], h = b.h;
    if (Math.abs(p.h - h) > h * 0.2) return false;                                   // another type size
    if (pdfFlowSameLine(last, p)) {
        // The same line after a wide gap reads on only inside an exercise item («a. Ce serait bien que tu ____ rendez-vous
        // avec la ____ .»): the item began with a marker, the text before the blank does not end a unit, the same font goes on.
        // A table row's next cell, the gloss of a bilingual line, the next item of a row of items are units of their own.
        // (Only an enumeration or a bullet starts the next item on the same line; an arrow or a dash there goes on with the
        // row: «e. attentif → attentive → attentivement».)
        return p.left > last.right && b.marker && p.font === b.font
            && !PDF_FLOW_UNIT_END.test(last.text) && !PDF_FLOW_ITEM_IN_LINE.test(p.text);
    }
    // The next line: one line pitch below, not a new item. Once the block has two lines, no wider than its closest pitch
    // so far: a wider one is the space between two paragraphs. (A closer one is fine -- the block may have begun with a
    // paragraph space: «… le soir.» / «Les personnes qui …» / «recevoir une contravention.».)
    const pitch = p.top - line.top;
    if (pitch < h * 0.7 || pitch > h * (p.maxPitch || 1.75)) return false;
    if (b.lines.length >= 2) {
        let own = Infinity;
        for (let k = 1; k < b.lines.length; k++) own = Math.min(own, b.lines[k].top - b.lines[k - 1].top);
        if (pitch > own + h * 0.3) return false;
    }
    if (PDF_FLOW_MARKER.test(p.text)) return false;
    // It starts at the block's left edge (up to a hanging indent; a block of one indented line may go on further left, the
    // first line of a paragraph being indented), or both lines are centred on one axis; never to the right of where the
    // line above ends.
    const atEdge = p.left >= b.left - h * (b.lines.length === 1 ? 4 : 1) && p.left <= b.left + h * 3.5;
    const centred = Math.abs((p.left + p.right) / 2 - (line.left + line.right) / 2) <= h;
    if (!(atEdge || centred) || p.left > line.right) return false;
    // Another font starts a new unit (a bold heading over its text, a bold instruction over a word table) -- unless the
    // text wraps into this line: the line above does not end a sentence and the first word of this one would not have
    // fitted at its end («… comme : d'abord,» / «premièrement, ensuite, …» in bold).
    const firstWord = (p.text.match(/^\S+/) || [''])[0];
    const firstWordWidth = (p.right - p.left) * firstWord.length / Math.max(1, p.text.length);
    // (The frame is as wide as its widest line so far, this one included: a one-line heading has nothing else to show it.)
    const wraps = Math.max(b.right, p.right) - line.right <= firstWordWidth + h && !PDF_FLOW_SENTENCE_END.test(line.text);
    if (p.font !== line.font && !wraps) return false;
    // After a finished sentence, a line that opens in another font (the audio icon of «i piste 8», a label) starts anew.
    if (PDF_FLOW_SENTENCE_END.test(line.text) && p.firstFont !== b.font && p.firstFont !== p.font) return false;
    return true;
}

// 3. Paragraphs: a block that continues the story of the block before it in the stream, in another frame -- up and to the
// right (the next column) or lower down on the same left edge (text interrupted by a picture) -- when the text before
// does not end a unit and the next one starts in lower case, in the same font and size.
function pdfFlowParagraphs(blocks) {
    const paras = [];
    const text = blk => blk.pieces.map(p => p.text).join(' ');
    for (const blk of blocks) {
        const prev = paras[paras.length - 1], pb = prev && prev[prev.length - 1];
        // A drop cap: one or two letters at least twice the size of the text, which starts beside them, within their
        // height («C» + «omme tous les matins, …»). Wherever the stream wrote them, they open that text's paragraph.
        const capAt = paras.findIndex(ps => ps.length === 1 && ps[0].pieces.length === 1 && /^\p{L}{1,2}$/u.test(ps[0].pieces[0].text)
            && ps[0].h >= blk.h * 2 && blk.left >= ps[0].right - blk.h && blk.left <= ps[0].right + blk.h * 2
            && blk.top >= ps[0].top - blk.h && blk.top <= ps[0].top + ps[0].h);
        if (capAt >= 0) { const [cap] = paras.splice(capAt, 1); paras.push([cap[0], blk]); continue; }
        if (pb) {
            const pl = pb.lines[pb.lines.length - 1], h = pb.h;
            const threaded = (blk.top < pl.top - h && blk.left >= pb.right - h)
                || (blk.top > pl.top + h * (blk.pieces[0].maxPitch || 1.75) && Math.abs(blk.left - pb.left) <= h);
            const t = text(blk);
            // Text that flows on fills its frame: a column of prose (at least 12 line heights wide) whose last line runs
            // to its right edge -- the next word did not fit. A list or a conjugation column («… ils/elles prévaudront»
            // beside «j'aurai prévalu …») has short lines and ends where it ends.
            const firstWord = (t.match(/^\S+/) || [''])[0], fl = blk.lines[0];
            const fills = pb.right - pb.left >= h * 12
                && pb.right - pl.right <= (fl.right - fl.left) * firstWord.length / Math.max(1, fl.text.length) + h;
            if (threaded && fills && !PDF_FLOW_UNIT_END.test(text(pb)) && !PDF_FLOW_MARKER.test(t) && PDF_FLOW_LOWER_START.test(t)
                && Math.abs(blk.h - h) <= h * 0.2 && blk.font === pb.font) { prev.push(blk); continue; }
        }
        paras.push([blk]);
    }
    return paras;
}

// The flow of a whole text layer, kept while the layer does not change. Paragraphs do not depend on where the page
// is on screen (a scroll moves every box alike) -- only on its items and its zoom.
const pdfFlowCache = new WeakMap();
function pdfFlowOf(layer) {
    if (!layer) return null;
    const spans = pdfTextSpans(layer);
    if (!spans.length) return null;
    const hit = pdfFlowCache.get(layer);
    if (hit && hit.count === spans.length && hit.first === spans[0] && hit.last === spans[spans.length - 1] && hit.width === layer.offsetWidth) return hit;
    const rects = spans.map(pdfSpanRect);
    const pieces = pdfFlowPieces(spans, rects);
    const paras = pdfFlowParagraphs(pdfFlowBlocks(pieces));
    const paraOf = new Map();
    const paraSpans = paras.map((ps, k) => {
        const idx = ps.flatMap(blk => blk.pieces.flatMap(p => p.idx));
        for (const i of idx) paraOf.set(spans[i], k);
        return idx.map(i => spans[i]);
    });
    const flow = {
        count: spans.length, first: spans[0], last: spans[spans.length - 1], width: layer.offsetWidth,
        spans, paras: paraSpans, paraOf, orderly: pdfFlowIsOrderly(spans, rects, pieces)
    };
    pdfFlowCache.set(layer, flow);
    return flow;
}
// Is the stream a reading order made by a layout program? Such a page sets its text in at least two fonts (body and bold,
// italic, headings), and nearly every item goes on along its line or starts the next one; frames and table cells add
// jumps, but few. Left to the visual columns: a page in one font -- an OCR layer (Internet Archive's invisible
// GlyphLessFont, the reader's own OCR without fonts), whose word boxes jump in height and whose verse half-lines are
// scattered over the page, or a plain one-font novel, which the columns already read right -- and a stream that is
// mostly jumps (glyphs drawn in arbitrary order, two columns interleaved line by line).
function pdfFlowIsOrderly(spans, rects, pieces) {
    if (spans.length < 4) return true;
    const chars = new Map();
    for (const s of spans) { const f = s.dataset.font || ''; chars.set(f, (chars.get(f) || 0) + s.textContent.length); }
    const total = [...chars.values()].reduce((a, b) => a + b, 0), most = Math.max(...chars.values());
    if (chars.has('') || most > total * 0.97) return false;   // no font names, or one font prints nearly everything
    let reads = 0;
    for (let i = 1; i < rects.length; i++) {
        const a = rects[i - 1], b = rects[i], h = Math.max(1, Math.min(a.height, b.height));
        if (pdfFlowSameLine(a, b) ? b.left >= a.left - 2 : (b.top - a.top >= h * 0.5 && b.top - a.top <= h * 3 && b.left <= a.left + 2)) reads++;
    }
    return reads / (rects.length - 1) >= 0.7;
}
// The paragraph a tapped span belongs to, as spans in reading order -- or null when the stream cannot be trusted here.
function pdfFlowGroup(layer, targetSpan) {
    const flow = pdfFlowOf(layer);
    if (!flow || !flow.orderly || !flow.paraOf.has(targetSpan)) return null;
    return flow.paras[flow.paraOf.get(targetSpan)];
}
// The spans a drag from one span to another selects, in reading order, or null (left to the visual columns). Inside one
// paragraph: the stretch between the two. Across paragraphs: from the first one's span to the end of its paragraph, the
// paragraphs the stream lists in between that lie within the drag's height and across the same width (not a side box
// or a table beside them), and the last one up to its span.
function pdfFlowSelection(layer, startSpan, endSpan) {
    const flow = pdfFlowOf(layer);
    if (!flow || !flow.orderly || !flow.paraOf.has(startSpan) || !flow.paraOf.has(endSpan)) return null;
    let a = flow.paraOf.get(startSpan), b = flow.paraOf.get(endSpan), s = startSpan, e = endSpan;
    if (a > b || (a === b && flow.paras[a].indexOf(s) > flow.paras[a].indexOf(e))) { [a, b] = [b, a]; [s, e] = [e, s]; }
    if (a === b) {
        const para = flow.paras[a];
        return para.slice(para.indexOf(s), para.indexOf(e) + 1);
    }
    const box = spans => {
        const rs = spans.map(pdfSpanRect);
        return { left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)), top: Math.min(...rs.map(r => r.top)), bottom: Math.max(...rs.map(r => r.bottom)) };
    };
    const ba = box(flow.paras[a]), bb = box(flow.paras[b]);
    const top = Math.min(ba.top, bb.top), bottom = Math.max(ba.bottom, bb.bottom);
    const left = Math.min(ba.left, bb.left), right = Math.max(ba.right, bb.right);
    const out = flow.paras[a].slice(flow.paras[a].indexOf(s));
    for (let k = a + 1; k < b; k++) {
        const bx = box(flow.paras[k]);
        const overlap = Math.min(bx.right, right) - Math.max(bx.left, left);
        const inside = bx.top >= top - 2 && bx.bottom <= bottom + 2 && overlap >= Math.min(bx.right - bx.left, right - left) * 0.5;
        if (inside) out.push(...flow.paras[k]);
    }
    out.push(...flow.paras[b].slice(0, flow.paras[b].indexOf(e) + 1));
    return out;
}
PDF_FLOW.group = pdfFlowGroup;
PDF_FLOW.selection = pdfFlowSelection;
