/* pdf-thumbnails.js — left sidebar thumbnail list: one placeholder per page
 * built immediately (correct sidebar scroll height from the start), low-resolution
 * canvases generated via a bounded predictive prefetch queue [currentIndex - 10 ... currentIndex + 10]
 * with fast-scroll debouncing, stale offscreen task purging on jumps, and an LRU canvas cache.
 *
 * Classic <script src>, not an ES module — see js/core.js. Depends on
 * js/pdf-continuous.js (navigateToPdfPage — forward-call inside the click
 * handler only, the same safe pattern used throughout the PDF modules).
 */

const PDF_THUMB_SCALE_TARGET = 120; // px, target thumbnail width
const PDF_THUMB_WINDOW_RADIUS = 10; // prefetch window radius: [center - 10, center + 10]
const PDF_THUMB_CACHE_MAX = 80;    // maximum canvases cached in LRU cache
const PDF_THUMB_DEBOUNCE_MS = 100; // fast-scroll debounce duration in ms

let pdfThumbItems = [];  // 1-indexed: pageNum -> <li> element
let pdfThumbObserver = null;
let pdfThumbQueue = [];
let pdfThumbQueueRunning = false;
let pdfThumbGeneration = 0; // bumped on new document load, invalidates stale queue entries
let pdfThumbDoc = null;
let pdfThumbActiveCenter = 1;
let pdfThumbScrollTimer = null;
let pdfThumbFastScrolling = false;
const pdfThumbCache = new Map(); // pageNum -> HTMLCanvasElement

function setupPdfThumbnailSidebar(doc) {
    const generation = ++pdfThumbGeneration;
    pdfThumbDoc = doc;
    const list = document.getElementById('pdf-thumb-list');
    if (!list) return;
    list.replaceChildren();
    if (pdfThumbObserver) {
        pdfThumbObserver.disconnect();
        pdfThumbObserver = null;
    }
    pdfThumbCache.clear();
    pdfThumbQueue = [];
    pdfThumbItems = new Array((state.totalPages || 0) + 1).fill(null);
    pdfThumbActiveCenter = state.currentIndex || 1;

    const estimate = (state.pdfPageMeta && state.pdfPageMeta[1]) || { width: 612, height: 792 };
    const thumbW = PDF_THUMB_SCALE_TARGET;
    const thumbH = Math.round(thumbW * estimate.height / estimate.width);

    const frag = document.createDocumentFragment();
    for (let n = 1; n <= state.totalPages; n++) {
        const li = document.createElement('li');
        li.className = 'pdf-thumb-item';
        li.dataset.page = n;
        const ph = document.createElement('div');
        ph.className = 'pdf-thumb-placeholder';
        ph.style.width = `${thumbW}px`; ph.style.height = `${thumbH}px`;
        const label = document.createElement('div');
        label.className = 'pdf-thumb-num';
        label.textContent = pdfDisplayLabel(n);
        li.append(ph, label);
        li.onclick = () => navigateToPdfPage(n, { instant: true });
        pdfThumbItems[n] = li;
        frag.appendChild(li);
    }
    list.appendChild(frag);

    // Debounced fast-scroll listener on the thumbnail list itself
    list.onscroll = onPdfThumbListScroll;

    // Initial sync & immediate render around currentIndex
    syncActiveThumbnail(state.currentIndex || 1);
}

let pdfThumbProgrammaticScroll = false;

function getVisibleThumbCenterPage() {
    const list = document.getElementById('pdf-thumb-list');
    if (!list || !state.totalPages) return pdfThumbActiveCenter;
    if (list.scrollTop <= 20) return 1;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 20) return state.totalPages;
    const midY = list.scrollTop + list.clientHeight / 2;
    let low = 1, high = state.totalPages, best = pdfThumbActiveCenter;
    while (low <= high) {
        const mid = (low + high) >> 1;
        const li = pdfThumbItems[mid];
        if (!li) break;
        const top = li.offsetTop;
        const h = li.offsetHeight || 200;
        if (midY >= top && midY <= top + h) {
            return mid;
        }
        if (midY < top) {
            best = mid;
            high = mid - 1;
        } else {
            best = mid;
            low = mid + 1;
        }
    }
    return best;
}

function onPdfThumbListScroll() {
    if (pdfThumbProgrammaticScroll) return;
    pdfThumbFastScrolling = true;
    clearTimeout(pdfThumbScrollTimer);
    pdfThumbScrollTimer = setTimeout(() => {
        pdfThumbFastScrolling = false;
        if (pdfThumbProgrammaticScroll) return;
        const page = getVisibleThumbCenterPage();
        schedulePrefetchWindow(page);
    }, PDF_THUMB_DEBOUNCE_MS);
}

function schedulePrefetchWindow(centerPage) {
    const doc = pdfThumbDoc || state.pdfDoc;
    if (!doc || !state.totalPages) return;
    if (els.sidebar && els.sidebar.classList.contains('collapsed')) {
        purgePdfThumbQueue();
        return;
    }
    const center = Math.max(1, Math.min(state.totalPages, Math.round(centerPage || 1)));
    pdfThumbActiveCenter = center;

    const minPage = Math.max(1, center - PDF_THUMB_WINDOW_RADIUS);
    const maxPage = Math.min(state.totalPages, center + PDF_THUMB_WINDOW_RADIUS);

    // 1. Purge stale tasks outside [minPage - 2, maxPage + 2]
    const validMin = Math.max(1, minPage - 2);
    const validMax = Math.min(state.totalPages, maxPage + 2);
    const keptQueue = [];
    for (const task of pdfThumbQueue) {
        if (task.generation === pdfThumbGeneration && task.pageNum >= validMin && task.pageNum <= validMax) {
            keptQueue.push(task);
        } else {
            const li = pdfThumbItems[task.pageNum];
            if (li) delete li.dataset.thumbQueued;
        }
    }
    pdfThumbQueue = keptQueue;

    // 2. Candidate pages ordered from center outwards: 0, 1, -1, 2, -2...
    const candidatePages = [];
    for (let p = minPage; p <= maxPage; p++) {
        candidatePages.push(p);
    }
    candidatePages.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));

    // 3. Queue candidates or restore from LRU cache
    for (const p of candidatePages) {
        const li = pdfThumbItems[p];
        if (!li || !li.isConnected) continue;

        if (li.querySelector('canvas')) {
            continue;
        }

        if (pdfThumbCache.has(p)) {
            const cachedCanvas = pdfThumbCache.get(p);
            pdfThumbCache.delete(p);
            pdfThumbCache.set(p, cachedCanvas);
            const ph = li.querySelector('.pdf-thumb-placeholder');
            if (ph) ph.replaceWith(cachedCanvas); else li.prepend(cachedCanvas);
            delete li.dataset.thumbQueued;
            continue;
        }

        if (!li.dataset.thumbQueued) {
            li.dataset.thumbQueued = '1';
            pdfThumbQueue.push({ pageNum: p, generation: pdfThumbGeneration });
        }
    }

    // Prioritize tasks closest to center
    pdfThumbQueue.sort((a, b) => Math.abs(a.pageNum - center) - Math.abs(b.pageNum - center));

    // Bound queue length to (2 * radius + 1)
    const maxQueueLen = 2 * PDF_THUMB_WINDOW_RADIUS + 1;
    if (pdfThumbQueue.length > maxQueueLen) {
        const dropped = pdfThumbQueue.splice(maxQueueLen);
        for (const task of dropped) {
            const li = pdfThumbItems[task.pageNum];
            if (li) delete li.dataset.thumbQueued;
        }
    }

    runPdfThumbQueue(doc);
}

function purgePdfThumbQueue() {
    for (const task of pdfThumbQueue) {
        const li = pdfThumbItems[task.pageNum];
        if (li) delete li.dataset.thumbQueued;
    }
    pdfThumbQueue = [];
}

function enqueuePdfThumbnail(doc, pageNum, generation) {
    if (generation !== pdfThumbGeneration) return;
    schedulePrefetchWindow(pageNum);
}

async function runPdfThumbQueue(doc) {
    if (pdfThumbQueueRunning) return;
    pdfThumbQueueRunning = true;
    try {
        while (pdfThumbQueue.length) {
            if (els.sidebar && els.sidebar.classList.contains('collapsed')) {
                purgePdfThumbQueue();
                return;
            }
            while (typeof pdfInFlightRenders !== 'undefined' && pdfInFlightRenders > 0) {
                await new Promise(r => setTimeout(r, 60));
                if (document.hidden) return;
            }
            const item = pdfThumbQueue.shift();
            if (!item) break;
            const { pageNum, generation } = item;
            if (generation !== pdfThumbGeneration || document.hidden) continue;
            const li = pdfThumbItems[pageNum];
            if (!li || !li.isConnected) continue;
            if (li.querySelector('canvas')) {
                delete li.dataset.thumbQueued;
                continue;
            }

            try {
                const page = await doc.getPage(pageNum);
                if (generation !== pdfThumbGeneration) return;
                const natural = page.getViewport({ scale: 1 });
                const scale = PDF_THUMB_SCALE_TARGET / natural.width;
                const vp = page.getViewport({ scale });
                const c = document.createElement('canvas');
                c.width = Math.round(vp.width); c.height = Math.round(vp.height);
                c.style.width = `${vp.width}px`; c.style.height = `${vp.height}px`;
                const task = page.render({ canvasContext: c.getContext('2d'), viewport: vp });
                await task.promise;
                if (generation !== pdfThumbGeneration || !li.isConnected) continue;

                if (pdfThumbCache.size >= PDF_THUMB_CACHE_MAX) {
                    const oldest = pdfThumbCache.keys().next().value;
                    const oldCanvas = pdfThumbCache.get(oldest);
                    pdfThumbCache.delete(oldest);
                    const oldLi = pdfThumbItems[oldest];
                    if (oldLi && oldCanvas && oldLi.contains(oldCanvas) && Math.abs(oldest - pdfThumbActiveCenter) > PDF_THUMB_WINDOW_RADIUS + 5) {
                        const ph = document.createElement('div');
                        ph.className = 'pdf-thumb-placeholder';
                        ph.style.width = oldCanvas.style.width;
                        ph.style.height = oldCanvas.style.height;
                        oldCanvas.replaceWith(ph);
                        delete oldLi.dataset.thumbQueued;
                    }
                }
                pdfThumbCache.set(pageNum, c);

                const ph = li.querySelector('.pdf-thumb-placeholder');
                if (ph) ph.replaceWith(c); else li.prepend(c);
            } catch (e) {
                /* one failed thumbnail must not stop the rest */
            } finally {
                delete li.dataset.thumbQueued;
            }
            await new Promise(r => setTimeout(r, 20));
        }
    } finally {
        pdfThumbQueueRunning = false;
    }
}

function syncActiveThumbnail(pageNum) {
    if (!pageNum || !pdfThumbItems) return;
    pdfThumbActiveCenter = pageNum;
    pdfThumbItems.forEach((li, n) => { if (li) li.classList.toggle('active', n === pageNum); });
    const active = pdfThumbItems[pageNum];
    if (active) {
        pdfThumbProgrammaticScroll = true;
        active.scrollIntoView({ block: 'nearest' });
        setTimeout(() => { pdfThumbProgrammaticScroll = false; }, PDF_THUMB_DEBOUNCE_MS + 60);
    }
    schedulePrefetchWindow(pageNum);
}

function updatePdfThumbnailLabel(pageNum) {
    const li = pdfThumbItems?.[pageNum];
    if (!li) return;
    const label = li.querySelector('.pdf-thumb-num');
    if (label && typeof pdfDisplayLabel === 'function') {
        label.textContent = pdfDisplayLabel(pageNum);
    }
}

if (typeof els !== 'undefined' && els.sidebar) {
    const sidebarObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.attributeName === 'class') {
                if (!els.sidebar.classList.contains('collapsed')) {
                    if (state.format === 'pdf' && (state.pdfDoc || pdfThumbDoc)) {
                        schedulePrefetchWindow(state.currentIndex || 1);
                    }
                } else {
                    purgePdfThumbQueue();
                }
            }
        }
    });
    sidebarObserver.observe(els.sidebar, { attributes: true, attributeFilter: ['class'] });
}

window.__pdfThumbQueueState = () => ({
    queueLength: pdfThumbQueue.length,
    isRendering: pdfThumbQueueRunning,
    cacheSize: pdfThumbCache.size,
    activeCenter: pdfThumbActiveCenter,
    activeWindow: [
        Math.max(1, pdfThumbActiveCenter - PDF_THUMB_WINDOW_RADIUS),
        Math.min((state && state.totalPages) || 0, pdfThumbActiveCenter + PDF_THUMB_WINDOW_RADIUS)
    ]
});
