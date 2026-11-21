// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
/* pdf-qr.js — QR-коди на сторінках PDF (власник, 2026-11-21: «хочу щоб він підсвічував кюар і відкривав одразу після
 * натискання; також потрібне швидке повернення назад на сторінку книги»).
 *
 * Щойно сторінка намальована (js/pdf-render.js викликає attachPdfQrLayer), її полотно у вільну хвилину браузера
 * переглядається на QR-коди: BarcodeDetector (Chrome на Android, ChromeOS, macOS), інакше jsQR — той самий
 * vendor/jsqr-1.4.0.js, що й для фрагмента в js/pdf-crop.js (loadJsQr). Кожен код дістає рамку поверх сторінки —
 * звичайне посилання <a target=_blank>, тож один дотик відкриває його без блокування спливних вікон. Адреса http(s)
 * відкривається сама; будь-який інший вміст коду шукається як текст (webSearchUrl, js/grammar-svo.js); інші схеми
 * (javascript:, intent:…) ніколи не стають посиланням. Перед відкриттям місце в книзі запам'ятовується
 * (rememberReadingSpot, js/book-shelf.js): якщо, поки читач на сайті, браузер вивантажить вкладку, книга сама
 * відкриється на тій самій сторінці.
 *
 * Коли шукати (власник, 2026-11-21: «кюар код шукався тільки тоді коли немає гортання або прокрутки, наприклад через
 * пів секунди після того як сторінка промальована»): сторінку читаємо, лише коли вона намальована щонайменше
 * PDF_QR_QUIET_MS тому (1 с — власник: «можна ще збільшити час щоб напевно»), стільки ж не було прокрутки, коліщатка, дотиків, перетягування чи клавіш, і сторінку видно на
 * екрані. Сторінки, намальовані наперед поза екраном, чекають, доки до них догорнуть. jsQR читає сторінку частинами
 * (уся, потім чотири чверті); між частинами браузер вільний, і якщо читач знову гортає, читання кидається й
 * починається спочатку, коли знову стане тихо.
 *
 * Результат зберігається для сторінки в частках її розміру, тож масштабування й повторний рендер не сканують заново
 * (лише якщо на дрібнішому полотні нічого не знайшлося, а нове помітно більше).
 */
Object.assign(I18N, {
    pdfQrOpen: { uk: 'QR-код: відкрити', en: 'QR code: open', fr: 'Code QR : ouvrir', ru: 'QR-код: открыть', zh: '二维码：打开', ko: 'QR 코드: 열기', hi: 'QR कोड: खोलें', ga: 'Cód QR: oscail', es: 'Código QR: abrir' },
    pdfQrSearch: { uk: 'QR-код: шукати в інтернеті', en: 'QR code: search the web', fr: 'Code QR : rechercher sur le web', ru: 'QR-код: искать в интернете', zh: '二维码：网络搜索', ko: 'QR 코드: 웹 검색', hi: 'QR कोड: वेब पर खोजें', ga: 'Cód QR: cuardaigh an gréasán', es: 'Código QR: buscar en la web' },
});

const PDF_QR_MAX_SIDE = 1200;   // jsQR on a phone: ~1 MP stays well under a frame budget per idle slice
const PDF_QR_MAX_CODES = 4;
const pdfQrCache = new Map();   // pageNum → { width, codes: [{ value, x, y, w, h }] } (fractions of the page)
let pdfQrCacheDoc = null;
const pdfQrQueue = [];
let pdfQrBusy = false;
const PDF_QR_QUIET_MS = 1000;   // after the page is drawn, and after the last scroll / swipe / wheel / key
let pdfQrLastActivity = 0, pdfQrTimer = 0;
const pdfQrNow = () => performance.now();
const pdfQrQuiet = () => pdfQrNow() - pdfQrLastActivity >= PDF_QR_QUIET_MS;

// Any sign of reading in motion postpones the scan. Capture + passive: seen for every scrolling element, never delays it.
function notePdfQrActivity(e) {
    if (e.type === 'pointermove' && !e.buttons) return;   // a mouse merely hovering is not scrolling
    pdfQrLastActivity = pdfQrNow();
    if (pdfQrQueue.length) schedulePdfQrPump();
}
for (const type of ['scroll', 'wheel', 'pointerdown', 'pointermove', 'touchstart', 'touchmove', 'keydown'])
    document.addEventListener(type, notePdfQrActivity, { capture: true, passive: true });

// A plain http(s) address is the link itself; anything else in the code is searched as text.
function pdfQrLink(value) {
    const v = String(value || '').trim();
    if (!/^https?:\/\/\S+$/i.test(v)) return '';
    try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : ''; } catch (e) { return ''; }
}
function pdfQrHref(value) {
    const v = String(value || '').trim();
    return !v ? '' : pdfQrLink(v) || (typeof webSearchUrl === 'function' ? webSearchUrl(v) : '');
}

// interrupted(): checked between jsQR passes; when it says yes the read is dropped (null) and the page queued again.
async function detectPdfQrCodes(canvas, interrupted = () => false) {
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return [];
    if ('BarcodeDetector' in window) {
        try {
            const found = await new BarcodeDetector({ formats: ['qr_code'] }).detect(canvas);
            return found.filter(c => c.rawValue && c.boundingBox).slice(0, PDF_QR_MAX_CODES).map(c => ({
                value: c.rawValue, x: c.boundingBox.x / W, y: c.boundingBox.y / H, w: c.boundingBox.width / W, h: c.boundingBox.height / H }));
        } catch (e) { /* no QR support in this detector: jsQR below */ }
    }
    if (typeof loadJsQr !== 'function') return [];
    const jsQR = await loadJsQr();
    const codes = [];
    const work = document.createElement('canvas');
    const ctx = work.getContext('2d', { willReadFrequently: true });
    // One region of the page (fractions), drawn from the full-resolution canvas at most PDF_QR_MAX_SIDE wide. jsQR reads
    // one code at a time: every code already known is painted over first, so the next read finds another one.
    const scan = (fx, fy, fw, fh) => {
        const sx = fx * W, sy = fy * H, sw = fw * W, sh = fh * H;
        const k = Math.min(1, PDF_QR_MAX_SIDE / Math.max(sw, sh));
        const w = work.width = Math.max(1, Math.round(sw * k)), h = work.height = Math.max(1, Math.round(sh * k));
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);   // a transparent page area reads as white paper, not black
        ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, w, h);
        for (let n = 0; n < PDF_QR_MAX_CODES && codes.length < PDF_QR_MAX_CODES; n++) {
            for (const c of codes) {
                const pad = c.w * 0.15;
                ctx.fillRect(((c.x - pad) - fx) / fw * w, ((c.y - pad) - fy) / fh * h, (c.w + 2 * pad) / fw * w, (c.h + 2 * pad) / fh * h);
            }
            const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
            if (!hit || !hit.location || !hit.data) return;
            const L = hit.location, xs = [L.topLeftCorner.x, L.topRightCorner.x, L.bottomLeftCorner.x, L.bottomRightCorner.x],
                ys = [L.topLeftCorner.y, L.topRightCorner.y, L.bottomLeftCorner.y, L.bottomRightCorner.y];
            const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
            const code = { value: hit.data, x: fx + x0 / w * fw, y: fy + y0 / h * fh, w: (x1 - x0) / w * fw, h: (y1 - y0) / h * fh };
            const cx = code.x + code.w / 2, cy = code.y + code.h / 2;
            if (codes.some(c => cx > c.x && cx < c.x + c.w && cy > c.y && cy < c.y + c.h)) return;   // the same code again
            codes.push(code);
        }
    };
    // Two codes side by side confuse jsQR's finder-pattern search, and a small code is lost when the page is shrunk:
    // after the whole page, overlapping quarters, each from the full-resolution canvas (unless several codes were found).
    // Between passes the browser gets a turn (a scroll that starts now is seen) and the read stops if the reader moved.
    const passes = [[0, 0, 1, 1], [0, 0, 0.55, 0.55], [0.45, 0, 0.55, 0.55], [0, 0.45, 0.55, 0.55], [0.45, 0.45, 0.55, 0.55]];
    for (let i = 0; i < passes.length; i++) {
        if (i === 1 && codes.length >= 2) break;
        if (interrupted()) return null;
        scan(...passes[i]);
        await new Promise(r => setTimeout(r, 0));
    }
    return interrupted() ? null : codes;
}

function buildPdfQrLayer(codes, canvas, pageNum) {
    const layer = document.createElement('div');
    layer.className = 'pdf-link-layer pdf-qr-layer';
    // The page's CSS size, like the other layers: a pinch stretches them all by one transform (js/pdf-zoom-pan.js).
    layer.style.width = canvas.style.width; layer.style.height = canvas.style.height;
    for (const code of codes) {
        const href = pdfQrHref(code.value);
        if (!href) continue;
        const a = document.createElement('a');
        // pdf-link-annotation: a tap on it is a link, not a word tap or a pan (js/selection-drag.js, js/pdf-zoom-pan.js).
        a.className = 'pdf-link-annotation pdf-qr-link';
        a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
        const pad = 0.006;
        a.style.left = `${(code.x - pad) * 100}%`; a.style.top = `${(code.y - pad) * 100}%`;
        a.style.width = `${(code.w + 2 * pad) * 100}%`; a.style.height = `${(code.h + 2 * pad) * 100}%`;
        const label = `${t(pdfQrLink(code.value) ? 'pdfQrOpen' : 'pdfQrSearch')} ${code.value.length > 120 ? code.value.slice(0, 120) + '…' : code.value}`;
        a.title = label; a.setAttribute('aria-label', label);
        a.dataset.qr = code.value;
        const badge = document.createElement('span'); badge.className = 'pdf-qr-badge'; badge.setAttribute('aria-hidden', 'true'); badge.textContent = 'QR ↗';
        a.appendChild(badge);
        a.addEventListener('click', e => {
            e.stopPropagation();
            if (typeof rememberReadingSpot === 'function') rememberReadingSpot();
        });
        layer.appendChild(a);
        if (typeof saveLink === 'function') layer.appendChild(pdfQrSaveButton(code, href, pageNum));
    }
    return layer.childElementCount ? layer : null;
}

// ☆ over the frame's top-left corner: keep this code in «Мої книги → Посилання» (js/saved-links.js) with this book and
// page, so the exercise is one tap away later and «📖» there comes back to this very page. Tap again to remove.
function pdfQrSaveButton(code, href, pageNum) {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'pdf-link-annotation pdf-qr-save';   // a tap on it is not a word tap or a pan, like the frame
    const pad = 0.006;
    b.style.left = `${(code.x - pad) * 100}%`; b.style.top = `${(code.y - pad) * 100}%`;
    const sync = () => { const on = isLinkSaved(href); b.textContent = on ? '★' : '☆'; b.setAttribute('aria-pressed', String(on)); };
    b.title = t('linksSaveQr'); b.setAttribute('aria-label', t('linksSaveQr'));
    sync();
    b.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        if (isLinkSaved(href)) { removeSavedLink(href); showToast(t('linksUnsaved')); }
        else if (saveLink({ url: href, title: pdfQrLink(code.value) ? '' : code.value, bookKey: state.bookKey, bookName: state.bookFileName, page: pageNum })) showToast(t('linksSaved'));
        sync();
    });
    return b;
}

function placePdfQrLayer(wrapperEl, canvas, codes, pageNum) {
    wrapperEl.querySelector(':scope > .pdf-qr-layer')?.remove();
    const layer = codes.length ? buildPdfQrLayer(codes, canvas, pageNum) : null;
    if (!layer) return;
    // Under the ink canvas (the pen still draws over the code), over the text and the PDF's own links.
    const ink = wrapperEl.querySelector(':scope > .ink-layer');
    wrapperEl.insertBefore(layer, ink || null);
}

// Called by js/pdf-render.js right after a page is put on screen.
function attachPdfQrLayer(pageNum, wrapperEl, canvas) {
    if (pdfQrCacheDoc !== state.pdfDoc) { pdfQrCache.clear(); pdfQrQueue.length = 0; pdfQrCacheDoc = state.pdfDoc; }
    const known = pdfQrCache.get(pageNum);
    if (known) {
        placePdfQrLayer(wrapperEl, canvas, known.codes, pageNum);
        if (known.codes.length || canvas.width < known.width * 1.5) return;   // a bigger canvas may show a code a small one missed
    }
    const doc = state.pdfDoc;
    for (let i = pdfQrQueue.length - 1; i >= 0; i--) if (pdfQrQueue[i].pageNum === pageNum) pdfQrQueue.splice(i, 1);
    pdfQrQueue.push({ pageNum, wrapperEl, canvas, doc, readyAt: pdfQrNow() + PDF_QR_QUIET_MS });
    schedulePdfQrPump();
}

const pdfQrJobLive = job => job.doc === state.pdfDoc && job.canvas.isConnected && job.canvas.parentNode === job.wrapperEl;
function pdfQrJobVisible(job) {
    const r = job.wrapperEl.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}
// Wake up when both the newest drawn page and the last movement are PDF_QR_QUIET_MS old.
function schedulePdfQrPump() {
    clearTimeout(pdfQrTimer);
    if (pdfQrBusy || !pdfQrQueue.length) return;
    const now = pdfQrNow();
    const ready = Math.min(...pdfQrQueue.map(j => j.readyAt));
    const wait = Math.max(ready - now, pdfQrLastActivity + PDF_QR_QUIET_MS - now, 0);
    pdfQrTimer = setTimeout(pumpPdfQrQueue, wait + 16);
}

async function pumpPdfQrQueue() {
    if (pdfQrBusy) return;
    for (let i = pdfQrQueue.length - 1; i >= 0; i--) if (!pdfQrJobLive(pdfQrQueue[i])) pdfQrQueue.splice(i, 1);   // re-rendered or gone
    if (!pdfQrQueue.length) return;
    if (!pdfQrQuiet()) { schedulePdfQrPump(); return; }
    const now = pdfQrNow();
    const index = pdfQrQueue.findIndex(j => j.readyAt <= now && pdfQrJobVisible(j));
    if (index < 0) {
        // Not yet PDF_QR_QUIET_MS old: wait for it. Only pages off screen: the next scroll that stops brings them back here.
        if (pdfQrQueue.some(j => j.readyAt > now)) schedulePdfQrPump();
        return;
    }
    const [job] = pdfQrQueue.splice(index, 1);
    pdfQrBusy = true;
    const startedAt = pdfQrNow();
    try {
        const codes = await detectPdfQrCodes(job.canvas, () => pdfQrLastActivity > startedAt || !pdfQrJobLive(job));
        if (codes === null) { if (pdfQrJobLive(job)) pdfQrQueue.unshift(job); }   // the reader moved: read it again later
        else if (job.doc === state.pdfDoc) {
            pdfQrCache.set(job.pageNum, { width: job.canvas.width, codes });
            if (pdfQrJobLive(job)) placePdfQrLayer(job.wrapperEl, job.canvas, codes, job.pageNum);
        }
    } catch (e) { /* a QR code is a bonus: a failed read never touches the page */ }
    pdfQrBusy = false;
    schedulePdfQrPump();
}
