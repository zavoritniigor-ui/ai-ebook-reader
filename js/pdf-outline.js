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
    // Text transforms use PDF user coordinates, independent of render zoom.
    // The viewport's unscaled viewBox also accounts for a nonzero CropBox.
    const bottom = vp?.viewBox?.[1] || 0;
    const height = vp?.viewBox ? vp.viewBox[3] - bottom : (vp?.height || 792) / (vp?.scale || 1);

    for (const item of items) {
        const s = item.str.trim();
        if (!s) continue;
        const yRel = (item.transform[5] - bottom) / height;
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
    const hadBookScheme = !!state.pdfPageLabels || !!state.pdfLabelToPhysical?.size;
    if (!state.pdfPrintedPageLabels) {
        state.pdfPrintedPageLabels = new Array(state.totalPages + 1).fill(undefined);
    }
    state.pdfPrintedPageLabels[pageNum] = label;
    if (label && state.pdfLabelToPhysical) {
        const key = String(label).trim().toLowerCase();
        if (!state.pdfLabelToPhysical.has(key) || pageNum < state.pdfLabelToPhysical.get(key)) {
            state.pdfLabelToPhysical.set(key, pageNum);
        }
    }
    if (!hadBookScheme && state.pdfLabelToPhysical?.size) {
        // Previously scanned unnumbered thumbnails need their physical fallback
        // replaced now that this document's printed numbering is established.
        refreshPdfPageLabelUI();
    } else if (typeof updatePdfThumbnailLabel === 'function') {
        updatePdfThumbnailLabel(pageNum);
    }
    if (pageNum === state.currentIndex) {
        if (typeof updatePdfProgressText === 'function') updatePdfProgressText(pageNum);
        if (typeof updatePdfScrubber === 'function') updatePdfScrubber();
    }
}

let pdfLabelScanGeneration = 0;
let pdfBookNavigationGeneration = 0;
let pdfLabelScanTimer = null;

function cancelPdfBookNavigation() { pdfBookNavigationGeneration++; }

function pdfLabelDocumentIsCurrent(doc, generation) {
    return state.format === 'pdf' && state.pdfDoc === doc && generation === pdfLabelScanGeneration;
}

function refreshPdfPageLabelUI() {
    if (typeof updatePdfThumbnailLabel === 'function') {
        for (let p = 1; p <= state.totalPages; p++) updatePdfThumbnailLabel(p);
    }
    if (typeof updatePdfProgressText === 'function') updatePdfProgressText(state.currentIndex);
    if (typeof updatePdfScrubber === 'function') updatePdfScrubber();
}

function resetPdfPageLabels() {
    pdfLabelScanGeneration++;
    cancelPdfBookNavigation();
    clearTimeout(pdfLabelScanTimer);
    pdfLabelScanTimer = null;
    state.pdfPageLabels = null;
    state.pdfPrintedPageLabels = null;
    state.pdfLabelToPhysical = new Map();
    state.pdfLabelsFullyScanned = false;
}

function schedulePrintedPageLabelScan(doc) {
    const generation = pdfLabelScanGeneration;
    clearTimeout(pdfLabelScanTimer);
    pdfLabelScanTimer = setTimeout(() => {
        pdfLabelScanTimer = null;
        if (pdfLabelDocumentIsCurrent(doc, generation)) startPrintedPageLabelScan(doc, generation);
    }, 10000);
}

async function startPrintedPageLabelScan(doc, gen = pdfLabelScanGeneration) {
    const isCurrent = () => pdfLabelDocumentIsCurrent(doc, gen);
    if (!isCurrent()) return;
    state.pdfLabelsFullyScanned = false;

    for (let p = 1; p <= doc.numPages; p++) {
        if (!isCurrent()) return;
        while ((typeof pdfInFlightRenders !== 'undefined' && pdfInFlightRenders > 0) ||
               (typeof resizeTimer !== 'undefined' && resizeTimer !== null) ||
               (typeof pdfPointers !== 'undefined' && pdfPointers.size > 0) ||
               (typeof scrubDragging !== 'undefined' && scrubDragging)) {
            await new Promise(r => setTimeout(r, 150));
            if (!isCurrent()) return;
        }
        if (!state.pdfPrintedPageLabels || state.pdfPrintedPageLabels[p] === undefined) {
            try {
                const page = await doc.getPage(p);
                if (!isCurrent()) return;
                const vp = page.getViewport({ scale: 1 });
                const tc = await page.getTextContent();
                if (!isCurrent()) return;
                const label = extractPrintedPageLabel(tc.items, vp);
                recordPdfPageLabel(p, label);
            } catch (e) {
                if (!isCurrent()) return;
                recordPdfPageLabel(p, null);
            }
            await new Promise(r => setTimeout(r, 100));
        }
    }
    if (isCurrent()) {
        state.pdfLabelsFullyScanned = true;
    }
}

async function loadPdfPageLabels(doc) {
    if (state.format !== 'pdf' || state.pdfDoc !== doc) return;
    resetPdfPageLabels();
    const gen = pdfLabelScanGeneration;
    try {
        const labels = await doc.getPageLabels();
        if (!pdfLabelDocumentIsCurrent(doc, gen)) return;
        if (Array.isArray(labels) && labels.length === state.totalPages) {
            state.pdfPageLabels = labels;
            state.pdfLabelToPhysical.clear();
            labels.forEach((l, i) => {
                const key = l && String(l).trim().toLowerCase();
                if (key && !state.pdfLabelToPhysical.has(key)) state.pdfLabelToPhysical.set(key, i + 1);
            });
            state.pdfLabelsFullyScanned = true;
            refreshPdfPageLabelUI();
            return;
        }
    } catch (e) { /* labels are optional */ }

    if (!pdfLabelDocumentIsCurrent(doc, gen)) return;
    if (!state.pdfPrintedPageLabels) state.pdfPrintedPageLabels = new Array(state.totalPages + 1).fill(undefined);
    schedulePrintedPageLabelScan(doc);
}

// Display label for a physical (1-based) page index — printed book page
// number when present, '—' for unnumbered pages, otherwise physical index.
function pdfDisplayLabel(pageIndex) {
    if (state.pdfPageLabels) return state.pdfPageLabels[pageIndex - 1] || '—';
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
    if (state.pdfPageLabels) return state.pdfPageLabels[pageIndex - 1] || null;
    if (state.pdfPrintedPageLabels) {
        const l = state.pdfPrintedPageLabels[pageIndex];
        return (l !== undefined) ? l : null;
    }
    return null;
}

// Canonical API: Navigate by 1-based physical PDF page index
function goToPhysicalPage(physicalPdfPage, options = {}) {
    cancelPdfBookNavigation();
    return navigateToPdfPage(physicalPdfPage, options);
}

// Canonical API: Navigate by user-facing logical book page label
async function goToBookPage(bookPageLabel, options = {}) {
    if (bookPageLabel === null || bookPageLabel === undefined) return false;
    const target = String(bookPageLabel).trim().toLowerCase();
    if (!target) return false;
    const doc = state.pdfDoc;
    const gen = pdfLabelScanGeneration;
    const navigation = ++pdfBookNavigationGeneration;
    const isCurrent = () => pdfLabelDocumentIsCurrent(doc, gen) && navigation === pdfBookNavigationGeneration;
    if (!doc || !isCurrent()) return false;

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
    if (!state.pdfLabelsFullyScanned) {
        if (!state.pdfPrintedPageLabels) {
            state.pdfPrintedPageLabels = new Array(state.totalPages + 1).fill(undefined);
        }
        const inspectPage = async (p) => {
            if (p < 1 || p > doc.numPages) return null;
            if (state.pdfPrintedPageLabels[p] !== undefined) return state.pdfPrintedPageLabels[p];
            try {
                const page = await doc.getPage(p);
                if (!isCurrent()) return null;
                const vp = page.getViewport({ scale: 1 });
                const tc = await page.getTextContent();
                if (!isCurrent()) return null;
                const label = extractPrintedPageLabel(tc.items, vp);
                recordPdfPageLabel(p, label);
                return label;
            } catch (e) {
                if (isCurrent()) recordPdfPageLabel(p, null);
                return null;
            }
        };

        const targetNum = parseInt(target, 10);
        if (Number.isFinite(targetNum)) {
            let probe = Math.max(1, Math.min(doc.numPages, targetNum));
            for (let attempt = 0; attempt < 5; attempt++) {
                if (!isCurrent()) return false;
                if (state.pdfLabelToPhysical.has(target)) {
                    goToPhysicalPage(state.pdfLabelToPhysical.get(target), options);
                    return true;
                }
                const label = await inspectPage(probe);
                if (!isCurrent()) return false;
                if (label && String(label).trim().toLowerCase() === target) {
                    goToPhysicalPage(probe, options);
                    return true;
                }
                const parsedLabel = parseInt(label, 10);
                if (Number.isFinite(parsedLabel)) {
                    const diff = targetNum - parsedLabel;
                    if (diff === 0) {
                        goToPhysicalPage(probe, options);
                        return true;
                    }
                    const nextProbe = probe + diff;
                    if (nextProbe === probe || nextProbe < 1 || nextProbe > doc.numPages) break;
                    probe = nextProbe;
                } else {
                    break;
                }
            }
            if (state.pdfLabelToPhysical.has(target)) {
                goToPhysicalPage(state.pdfLabelToPhysical.get(target), options);
                return true;
            }
        }

        for (let p = 1; p <= doc.numPages; p++) {
            if (!isCurrent()) return false;
            // A concurrent background scan may have resolved the target while
            // this request was awaiting a different page's text.
            if (state.pdfLabelToPhysical.has(target)) {
                goToPhysicalPage(state.pdfLabelToPhysical.get(target), options);
                return true;
            }
            if (state.pdfPrintedPageLabels[p] === undefined) {
                const label = await inspectPage(p);
                if (!isCurrent()) return false;
                if (label && String(label).trim().toLowerCase() === target) {
                    goToPhysicalPage(p, options);
                    return true;
                }
            }
        }
    }

    return false;
}

// ===================== OUTLINE (CONTENTS) =====================
async function loadPdfOutline(doc) {
    const isCurrent = () => state.format === 'pdf' && state.pdfDoc === doc;
    if (!isCurrent()) return;
    state.pdfOutline = null;
    document.getElementById('pdf-tab-outline').disabled = true;
    try {
        const raw = await doc.getOutline();
        if (!isCurrent() || !raw || !raw.length) return;
        const outline = await resolveOutlineDestinations(doc, raw);
        if (!isCurrent()) return;
        state.pdfOutline = outline;
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
            const resolved = await resolvePdfDestination(doc, item.dest);
            if (resolved) ({ pageIndex, yFraction } = resolved);
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
    if (mode === 'thumbnails' && typeof schedulePrefetchWindow === 'function') {
        const vis = typeof getVisibleThumbCenterPage === 'function' ? (getVisibleThumbCenterPage() || 1) : 1;
        schedulePrefetchWindow(vis);
    }
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
    const doc = state.pdfDoc;
    const gen = pdfLabelScanGeneration;
    const navigation = ++pdfBookNavigationGeneration;
    try {
        if (!doc || !pdfLabelDocumentIsCurrent(doc, gen)) return;
        const resolved = await resolvePdfDestination(doc, dest);
        if (!resolved || !pdfLabelDocumentIsCurrent(doc, gen) || navigation !== pdfBookNavigationGeneration) return;
        navigateToPdfPage(resolved.pageIndex, { yFraction: resolved.yFraction ?? undefined, instant: true });
    } catch (e) { /* unresolvable link destination — no-op rather than a broken jump */ }
}

async function resolvePdfDestination(doc, dest) {
    const d = typeof dest === 'string' ? await doc.getDestination(dest) : dest;
    if (!Array.isArray(d) || d[0] === null || d[0] === undefined) return null;
    const ref = d[0];
    const index = typeof ref === 'object' ? await doc.getPageIndex(ref) : ref;
    if (!Number.isInteger(index) || index < 0 || index >= doc.numPages) return null;
    const pageIndex = index + 1;
    const kind = d[1]?.name;
    // XYZ: [page, XYZ, left, top, zoom]; FitH/FitBH: [page, kind, top].
    const y = kind === 'XYZ' ? d[3] : (kind === 'FitH' || kind === 'FitBH' ? d[2] : null);
    let yFraction = null;
    if (typeof y === 'number' && Number.isFinite(y)) {
        const page = await doc.getPage(pageIndex);
        const vp = page.getViewport({ scale: 1 });
        const x = kind === 'XYZ' && typeof d[2] === 'number' ? d[2] : vp.viewBox[0];
        const point = vp.convertToViewportPoint(x, y);
        yFraction = Math.max(0, Math.min(1, point[1] / vp.height));
    }
    return { pageIndex, yFraction };
}
