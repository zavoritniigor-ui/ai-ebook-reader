/* pdf-thumbnails.js — left sidebar thumbnail list: one placeholder per page
 * built immediately (correct sidebar scroll height from the start), actual
 * low-resolution canvases generated lazily (only once scrolled into view in
 * the SIDEBAR, via IntersectionObserver) through a small sequential queue —
 * a 657-page book must never freeze the main thread by rendering hundreds of
 * thumbnails at once.
 *
 * Classic <script src>, not an ES module — see js/core.js. Depends on
 * js/pdf-continuous.js (navigateToPdfPage — forward-call inside the click
 * handler only, the same safe pattern used throughout the PDF modules).
 */

const PDF_THUMB_SCALE_TARGET = 120; // px, target thumbnail width
let pdfThumbItems = [];  // 1-indexed: pageNum -> <li> element
let pdfThumbObserver = null;
let pdfThumbQueue = [];
let pdfThumbQueueRunning = false;
let pdfThumbGeneration = 0; // bumped on new document load, invalidates stale queue entries

function setupPdfThumbnailSidebar(doc) {
    const generation = ++pdfThumbGeneration;
    const list = document.getElementById('pdf-thumb-list');
    list.replaceChildren();
    if (pdfThumbObserver) pdfThumbObserver.disconnect();
    pdfThumbItems = new Array(state.totalPages + 1).fill(null);
    pdfThumbQueue = [];

    const estimate = state.pdfPageMeta[1] || { width: 612, height: 792 };
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

    pdfThumbObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const n = Number(e.target.dataset.page);
            if (n) enqueuePdfThumbnail(doc, n, generation);
        });
    }, { root: list, rootMargin: '200px 0px' });
    pdfThumbItems.forEach(li => li && pdfThumbObserver.observe(li));

    syncActiveThumbnail(state.currentIndex);
}

function enqueuePdfThumbnail(doc, pageNum, generation) {
    const li = pdfThumbItems[pageNum];
    if (!li || li.dataset.thumbQueued) return;
    li.dataset.thumbQueued = '1';
    pdfThumbQueue.push({ pageNum, generation });
    runPdfThumbQueue(doc);
}

async function runPdfThumbQueue(doc) {
    if (pdfThumbQueueRunning) return;
    pdfThumbQueueRunning = true;
    try {
        while (pdfThumbQueue.length) {
            if (els.sidebar.classList.contains('collapsed')) {
                pdfThumbQueue.length = 0;
                return;
            }
            while (typeof pdfInFlightRenders !== 'undefined' && pdfInFlightRenders > 0) {
                await new Promise(r => setTimeout(r, 60));
                if (document.hidden) return;
            }
            const { pageNum, generation } = pdfThumbQueue.shift();
            if (generation !== pdfThumbGeneration || document.hidden) continue;
            const li = pdfThumbItems[pageNum];
            if (!li || !li.isConnected) continue;
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
                const ph = li.querySelector('.pdf-thumb-placeholder');
                if (ph) ph.replaceWith(c); else li.prepend(c);
            } catch (e) { /* one failed thumbnail must not stop the rest */ }
            await new Promise(r => setTimeout(r, 20));
        }
    } finally { pdfThumbQueueRunning = false; }
}

function syncActiveThumbnail(pageNum) {
    pdfThumbItems.forEach((li, n) => { if (li) li.classList.toggle('active', n === pageNum); });
    const active = pdfThumbItems[pageNum];
    if (active) active.scrollIntoView({ block: 'nearest' });
}

function updatePdfThumbnailLabel(pageNum) {
    const li = pdfThumbItems?.[pageNum];
    if (!li) return;
    const label = li.querySelector('.pdf-thumb-num');
    if (label && typeof pdfDisplayLabel === 'function') {
        label.textContent = pdfDisplayLabel(pageNum);
    }
}
