/* pdf-outline.js — PDF outline (Contents sidebar), page-label mapping, and
 * native PDF link annotations. Three related but distinct pieces of the spec:
 *
 * 1. loadPdfOutline/renderPdfOutline: getOutline() → nested Contents tree in
 *    the left sidebar; clicking an entry navigates the MAIN viewer.
 * 2. loadPdfPageLabels: getPageLabels() → printed/book page number display,
 *    falling back to the physical 1-based PDF page index when absent.
 *    Navigation itself always uses the stable physical index internally —
 *    labels are display-only.
 * 3. buildPdfLinkLayer (called from js/pdf-render.js per rendered page):
 *    page.getAnnotations() → real clickable overlays for Link annotations
 *    with a destination, never a visually-detected link.
 *
 * Classic <script src>, not an ES module — see js/core.js. Depends on
 * js/pdf-continuous.js (navigateToPdfPage — forward-call inside click
 * handlers only, the same safe pattern used throughout the PDF modules).
 */

// ===================== PAGE IDENTITY & LABELS =====================
// Internal navigation always uses 1-based physicalPdfPage (1..totalPages).
// User-facing UI displays bookPageLabel (e.g. "210", "ix", or null for unnumbered).
// There is NO constant global offset (e.g. page - 11 is forbidden).

function extractPrintedPageLabel(items, vp) {
    if (!items || !items.length) return null;
    const allText = items.map(i => i.str.trim()).filter(Boolean).join(' ');
    if (!allText || /intentionally left blank/i.test(allText)) return null;

    const footerItems = [];
    const headerItems = [];
    const height = vp?.height || 792;

    for (const item of items) {
        const s = item.str.trim();
        if (!s) continue;
        const yRel = item.transform[5] / height;
        if (yRel <= 0.08) footerItems.push(s);
        else if (yRel >= 0.92) headerItems.push(s);
    }

    const isArabic = s => /^\d{1,4}$/.test(s);
    const isRoman = s => /^(?=[ivxlcdm]+$)(m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3}))$/i.test(s);

    for (const s of footerItems) {
        if (isArabic(s)) return s;
        if (isRoman(s)) return s.toLowerCase();
    }
    for (const s of headerItems) {
        if (isArabic(s)) return s;
        if (isRoman(s)) return s.toLowerCase();
    }

    return null;
}

function recordPdfPageLabel(pageNum, label) {
    if (!state.pdfPrintedPageLabels) {
        state.pdfPrintedPageLabels = new Array(state.totalPages + 1).fill(undefined);
    }
    state.pdfPrintedPageLabels[pageNum] = label;
    if (label && state.pdfLabelToPhysical) {
        const key = String(label).trim().toLowerCase();
        if (!state.pdfLabelToPhysical.has(key)) {
            state.pdfLabelToPhysical.set(key, pageNum);
        }
    }
    if (typeof updatePdfThumbnailLabel === 'function') {
        updatePdfThumbnailLabel(pageNum);
    }
    if (pageNum === state.currentIndex) {
        if (typeof updatePdfProgressText === 'function') updatePdfProgressText(pageNum);
        if (typeof updatePdfScrubber === 'function') updatePdfScrubber();
    }
}

let pdfLabelScanGeneration = 0;

function resetPdfPageLabels() {
    pdfLabelScanGeneration++;
    state.pdfPageLabels = null;
    state.pdfPrintedPageLabels = null;
    state.pdfLabelToPhysical = new Map();
    state.pdfLabelsFullyScanned = false;
}

let pdfLabelScanTimer = null;
function schedulePrintedPageLabelScan(doc) {
    clearTimeout(pdfLabelScanTimer);
    pdfLabelScanTimer = setTimeout(() => {
        startPrintedPageLabelScan(doc);
    }, 4000);
}

async function startPrintedPageLabelScan(doc) {
    const gen = ++pdfLabelScanGeneration;
    state.pdfLabelsFullyScanned = false;
    if (gen !== pdfLabelScanGeneration || state.format !== 'pdf') return;

    for (let p = 1; p <= state.totalPages; p++) {
        if (gen !== pdfLabelScanGeneration || state.format !== 'pdf') return;
        while (typeof pdfInFlightRenders !== 'undefined' && pdfInFlightRenders > 0) {
            await new Promise(r => setTimeout(r, 100));
            if (gen !== pdfLabelScanGeneration || state.format !== 'pdf') return;
        }
        if (!state.pdfPrintedPageLabels || state.pdfPrintedPageLabels[p] === undefined) {
            try {
                const page = await doc.getPage(p);
                if (gen !== pdfLabelScanGeneration) return;
                const vp = page.getViewport({ scale: 1 });
                const tc = await page.getTextContent();
                const label = extractPrintedPageLabel(tc.items, vp);
                recordPdfPageLabel(p, label);
            } catch (e) {
                recordPdfPageLabel(p, null);
            }
            await new Promise(r => setTimeout(r, 60));
        }
    }
    if (gen === pdfLabelScanGeneration) {
        state.pdfLabelsFullyScanned = true;
    }
}

async function loadPdfPageLabels(doc) {
    resetPdfPageLabels();
    try {
        const labels = await doc.getPageLabels();
        if (Array.isArray(labels) && labels.length === state.totalPages) {
            state.pdfPageLabels = labels;
            labels.forEach((l, i) => {
                if (l) state.pdfLabelToPhysical.set(String(l).trim().toLowerCase(), i + 1);
            });
            state.pdfLabelsFullyScanned = true;
            return;
        }
    } catch (e) { /* labels are optional */ }

    state.pdfPrintedPageLabels = new Array(state.totalPages + 1).fill(undefined);
    schedulePrintedPageLabelScan(doc);
}

// Display label for a physical (1-based) page index — printed book page
// number when present, '—' for unnumbered pages, otherwise physical index.
function pdfDisplayLabel(pageIndex) {
    if (state.pdfPageLabels) return state.pdfPageLabels[pageIndex - 1] ?? String(pageIndex);
    if (state.pdfPrintedPageLabels) {
        const l = state.pdfPrintedPageLabels[pageIndex];
        if (l) return l;
        if (l === null && state.pdfLabelToPhysical && state.pdfLabelToPhysical.size > 0) {
            return '—';
        }
    }
    return String(pageIndex);
}

// User-facing book page label (e.g. "210", "ix", or null for unnumbered / unknown)
function pdfBookPageLabel(pageIndex) {
    if (state.pdfPageLabels) return state.pdfPageLabels[pageIndex - 1] ?? null;
    if (state.pdfPrintedPageLabels) {
        const l = state.pdfPrintedPageLabels[pageIndex];
        return (l !== undefined) ? l : null;
    }
    return null;
}

// Canonical API: Navigate by 1-based physical PDF page index
function goToPhysicalPage(physicalPdfPage, options = {}) {
    return navigateToPdfPage(physicalPdfPage, options);
}

// Canonical API: Navigate by user-facing logical book page label
async function goToBookPage(bookPageLabel, options = {}) {
    if (bookPageLabel === null || bookPageLabel === undefined) return false;
    const target = String(bookPageLabel).trim().toLowerCase();
    if (!target) return false;

    // 1. Native PageLabels lookup
    if (state.pdfPageLabels) {
        const idx = state.pdfPageLabels.findIndex(l => l && String(l).trim().toLowerCase() === target);
        if (idx !== -1) {
            goToPhysicalPage(idx + 1, options);
            return true;
        }
    }

    // 2. Already mapped printed label
    if (state.pdfLabelToPhysical && state.pdfLabelToPhysical.has(target)) {
        const physical = state.pdfLabelToPhysical.get(target);
        goToPhysicalPage(physical, options);
        return true;
    }

    // 3. On-demand search through un-scanned pages
    if (state.pdfDoc && !state.pdfLabelsFullyScanned) {
        if (!state.pdfPrintedPageLabels) {
            state.pdfPrintedPageLabels = new Array(state.totalPages + 1).fill(undefined);
        }
        for (let p = 1; p <= state.totalPages; p++) {
            if (state.pdfPrintedPageLabels[p] === undefined) {
                try {
                    const page = await state.pdfDoc.getPage(p);
                    const vp = page.getViewport({ scale: 1 });
                    const tc = await page.getTextContent();
                    const label = extractPrintedPageLabel(tc.items, vp);
                    recordPdfPageLabel(p, label);
                    if (label && label.trim().toLowerCase() === target) {
                        goToPhysicalPage(p, options);
                        return true;
                    }
                } catch (e) {
                    recordPdfPageLabel(p, null);
                }
            }
        }
    }

    return false;
}

// ===================== OUTLINE (CONTENTS) =====================
async function loadPdfOutline(doc) {
    state.pdfOutline = null;
    document.getElementById('pdf-tab-outline').disabled = true;
    try {
        const raw = await doc.getOutline();
        if (!raw || !raw.length) return;
        state.pdfOutline = await resolveOutlineDestinations(doc, raw);
        document.getElementById('pdf-tab-outline').disabled = false;
        renderPdfOutline();
    } catch (e) { /* outline is optional */ }
}

// Resolves each outline entry's destination (explicit array, or a named
// destination string requiring getDestination()) down to a plain physical
// page index + optional Y offset, so click handlers never touch PDF.js
// destination objects directly.
async function resolveOutlineDestinations(doc, items) {
    const out = [];
    for (const item of items) {
        let pageIndex = null, yFraction = null;
        try {
            let dest = item.dest;
            if (typeof dest === 'string') dest = await doc.getDestination(dest);
            if (Array.isArray(dest) && dest[0]) {
                const ref = dest[0];
                const pageNum0 = typeof ref === 'object' ? await doc.getPageIndex(ref) : ref;
                pageIndex = pageNum0 + 1;
                // dest[1] is a name like {name:'XYZ'}, dest[2..] are the params;
                // for XYZ/FitH the Y coordinate (PDF space, bottom-up) is dest[3]/dest[2].
                const y = dest[2] ?? dest[3];
                if (typeof y === 'number') {
                    const page = await doc.getPage(pageIndex);
                    const vp = page.getViewport({ scale: 1 });
                    yFraction = Math.max(0, Math.min(1, 1 - y / vp.height));
                }
            }
        } catch (e) { /* unresolvable entry: keep as a label-only, non-navigable node */ }
        out.push({
            title: item.title || '',
            pageIndex, yFraction,
            items: item.items && item.items.length ? await resolveOutlineDestinations(doc, item.items) : []
        });
    }
    return out;
}

function renderPdfOutline() {
    const root = document.getElementById('pdf-outline-list');
    root.replaceChildren();
    if (!state.pdfOutline) return;
    root.appendChild(buildOutlineLevel(state.pdfOutline));
}

function buildOutlineLevel(items) {
    const ul = document.createElement('ul');
    ul.className = 'pdf-outline-children';
    items.forEach(item => {
        const li = document.createElement('li');
        const row = document.createElement('div');
        row.className = 'pdf-outline-item' + (item.pageIndex ? '' : ' disabled');
        row.textContent = item.title;
        if (item.pageIndex) {
            row.onclick = () => {
                navigateToPdfPage(item.pageIndex, { yFraction: item.yFraction ?? undefined, instant: true });
                if (window.innerWidth <= 1180) els.sidebar.classList.add('collapsed');
            };
        }
        li.appendChild(row);
        if (item.items.length) li.appendChild(buildOutlineLevel(item.items));
        ul.appendChild(li);
    });
    return ul;
}

// ===================== SIDEBAR TAB SWITCHING =====================
function setPdfSidebarMode(mode) {
    if (mode === 'outline' && document.getElementById('pdf-tab-outline').disabled) return;
    state.pdfSidebarMode = mode;
    document.getElementById('pdf-tab-thumbs').classList.toggle('active', mode === 'thumbnails');
    document.getElementById('pdf-tab-outline').classList.toggle('active', mode === 'outline');
    document.getElementById('pdf-thumb-list').hidden = mode !== 'thumbnails';
    document.getElementById('pdf-outline-list').hidden = mode !== 'outline';
}
document.getElementById('pdf-tab-thumbs').onclick = () => setPdfSidebarMode('thumbnails');
document.getElementById('pdf-tab-outline').onclick = () => setPdfSidebarMode('outline');

// ===================== NATIVE PDF LINK ANNOTATIONS =====================
// Called from renderPdfPageInto() for every rendered page. Reads the PAGE'S
// OWN annotation data (never visual/OCR detection) and renders an invisible
// clickable overlay positioned at each Link annotation's real rect. Supports
// explicit page destinations, named destinations (resolved via
// doc.getDestination), and external URLs (opened normally, not intercepted).
async function buildPdfLinkLayer(page, viewport) {
    const annotations = await page.getAnnotations({ intent: 'display' });
    const links = annotations.filter(a => a.subtype === 'Link' && (a.dest || a.url));
    if (!links.length) return null;
    const layer = document.createElement('div');
    layer.className = 'pdf-link-layer';
    layer.style.width = `${viewport.width}px`;
    layer.style.height = `${viewport.height}px`;
    for (const ann of links) {
        const rect = pdfjsLib.Util.normalizeRect(ann.rect);
        const [x1, y1] = viewport.convertToViewportPoint(rect[0], rect[1]);
        const [x2, y2] = viewport.convertToViewportPoint(rect[2], rect[3]);
        const div = document.createElement('a');
        div.className = 'pdf-link-annotation';
        div.style.left = `${Math.min(x1, x2)}px`;
        div.style.top = `${Math.min(y1, y2)}px`;
        div.style.width = `${Math.abs(x2 - x1)}px`;
        div.style.height = `${Math.abs(y2 - y1)}px`;
        if (ann.url) {
            div.href = ann.url; div.target = '_blank'; div.rel = 'noopener noreferrer';
        } else if (ann.dest) {
            div.href = 'javascript:void(0)';
            div.onclick = (e) => { e.preventDefault(); navigatePdfLinkDestination(ann.dest); };
        }
        layer.appendChild(div);
    }
    return layer;
}

async function navigatePdfLinkDestination(dest) {
    try {
        let d = dest;
        if (typeof d === 'string') d = await state.pdfDoc.getDestination(d);
        if (!Array.isArray(d) || !d[0]) return;
        const ref = d[0];
        const pageIndex = (typeof ref === 'object' ? await state.pdfDoc.getPageIndex(ref) : ref) + 1;
        let yFraction;
        const y = d[2] ?? d[3];
        if (typeof y === 'number') {
            const page = await state.pdfDoc.getPage(pageIndex);
            const vp = page.getViewport({ scale: 1 });
            yFraction = Math.max(0, Math.min(1, 1 - y / vp.height));
        }
        navigateToPdfPage(pageIndex, { yFraction, instant: true });
    } catch (e) { /* unresolvable link destination — no-op rather than a broken jump */ }
}
