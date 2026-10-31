/* Сканер документів (власник, 2026-10-30: «застосунок сканер, який з фото робить зручні формати для друку»).
 * Фото з камери чи галереї → краї аркуша (знаходяться самі, кути можна підправити пальцем) → вирівнювання перспективи →
 * покращення («Документ» — білий фон без тіней, «Ч/Б», «Сірий», «Оригінал») → PDF (A4, Letter або за розміром фото),
 * JPG чи PNG; друк, «Поділитися», зберегти на пристрій, відкрити в читалці.
 * Усе на цьому пристрої: фото нікуди не надсилаються, нічого не зберігається між сеансами. Без бібліотек: PDF складає
 * scanBuildPdf, кілька JPG/PNG пакуються в ZIP (JSZip, уже є в застосунку). */
Object.assign(I18N, {
    mScan: { uk: 'Сканер документів', en: 'Document scanner', fr: 'Scanner de documents', ru: 'Сканер документов', zh: '文档扫描', ko: '문서 스캐너', hi: 'दस्तावेज़ स्कैनर', ga: 'Scanóir doiciméad' },
    mScanDesc: { uk: 'Фото сторінок → PDF для друку, JPG чи PNG', en: 'Photos of pages → PDF for printing, JPG or PNG', fr: 'Photos de pages → PDF à imprimer, JPG ou PNG',
                 ru: 'Фото страниц → PDF для печати, JPG или PNG', zh: '页面照片 → 可打印的 PDF、JPG 或 PNG', ko: '페이지 사진 → 인쇄용 PDF, JPG 또는 PNG',
                 hi: 'पृष्ठों की फ़ोटो → प्रिंट के लिए PDF, JPG या PNG', ga: 'Grianghraif leathanach → PDF le priontáil, JPG nó PNG' },
    wheelScan: { uk: 'Сканер', en: 'Scanner', fr: 'Scanner', ru: 'Сканер', zh: '扫描', ko: '스캐너', hi: 'स्कैनर', ga: 'Scanóir' },
    scanTitle: { uk: '📷 Сканер документів', en: '📷 Document scanner', fr: '📷 Scanner de documents', ru: '📷 Сканер документов' },
    scanCamera: { uk: '📷 Зняти', en: '📷 Take photo', fr: '📷 Photographier', ru: '📷 Снять' },
    scanGallery: { uk: '🖼 З галереї', en: '🖼 From gallery', fr: '🖼 Depuis la galerie', ru: '🖼 Из галереи' },
    scanEmpty: { uk: 'Зніміть сторінку або виберіть фото з галереї. Краї аркуша знайдуться самі — їх можна підправити.',
                 en: 'Take a photo of a page or pick photos from the gallery. The edges of the sheet are found automatically and can be adjusted.',
                 fr: 'Photographiez une page ou choisissez des photos dans la galerie. Les bords de la feuille sont trouvés automatiquement et peuvent être ajustés.',
                 ru: 'Снимите страницу или выберите фото из галереи. Края листа найдутся сами — их можно подправить.' },
    scanPrivacy: { uk: 'Фото обробляються на цьому пристрої й нікуди не надсилаються.', en: 'Photos are processed on this device and are not sent anywhere.',
                   fr: 'Les photos sont traitées sur cet appareil et ne sont envoyées nulle part.', ru: 'Фото обрабатываются на этом устройстве и никуда не отправляются.' },
    scanProcessing: { uk: 'Обробка {n} з {total}…', en: 'Processing {n} of {total}…', fr: 'Traitement {n} sur {total}…', ru: 'Обработка {n} из {total}…' },
    scanPage: { uk: 'Сторінка {n}', en: 'Page {n}', fr: 'Page {n}', ru: 'Страница {n}' },
    scanPages: { uk: 'Сторінок: {n}', en: 'Pages: {n}', fr: 'Pages : {n}', ru: 'Страниц: {n}' },
    scanEdit: { uk: 'Обрізати й покращити', en: 'Crop and enhance', fr: 'Recadrer et améliorer', ru: 'Обрезать и улучшить' },
    scanDelete: { uk: 'Видалити сторінку', en: 'Delete page', fr: 'Supprimer la page', ru: 'Удалить страницу' },
    scanMoveLeft: { uk: 'Перемістити раніше', en: 'Move earlier', fr: 'Déplacer avant', ru: 'Переместить раньше' },
    scanMoveRight: { uk: 'Перемістити пізніше', en: 'Move later', fr: 'Déplacer après', ru: 'Переместить позже' },
    scanCorners: { uk: 'Перетягніть кути до країв аркуша', en: 'Drag the corners to the edges of the sheet', fr: 'Faites glisser les coins vers les bords de la feuille', ru: 'Перетащите углы к краям листа' },
    scanAuto: { uk: 'Знайти краї', en: 'Find edges', fr: 'Trouver les bords', ru: 'Найти края' },
    scanFull: { uk: 'Усе фото', en: 'Whole photo', fr: 'Photo entière', ru: 'Всё фото' },
    scanRotL: { uk: 'Повернути ліворуч', en: 'Rotate left', fr: 'Pivoter à gauche', ru: 'Повернуть влево' },
    scanRotR: { uk: 'Повернути праворуч', en: 'Rotate right', fr: 'Pivoter à droite', ru: 'Повернуть вправо' },
    scanDone: { uk: 'Готово', en: 'Done', fr: 'Terminé', ru: 'Готово' },
    scanCancel: { uk: 'Скасувати', en: 'Cancel', fr: 'Annuler', ru: 'Отмена' },
    scanFilterOrig: { uk: 'Оригінал', en: 'Original', fr: 'Original', ru: 'Оригинал' },
    scanFilterDoc: { uk: 'Документ', en: 'Document', fr: 'Document', ru: 'Документ' },
    scanFilterBw: { uk: 'Ч/Б', en: 'B/W', fr: 'N/B', ru: 'Ч/Б' },
    scanFilterGray: { uk: 'Сірий', en: 'Grey', fr: 'Gris', ru: 'Серый' },
    scanFormat: { uk: 'Формат файлу', en: 'File format', fr: 'Format du fichier', ru: 'Формат файла' },
    scanPdfA4: { uk: 'PDF · A4', en: 'PDF · A4', fr: 'PDF · A4', ru: 'PDF · A4' },
    scanPdfLetter: { uk: 'PDF · Letter (США)', en: 'PDF · Letter (US)', fr: 'PDF · Letter (US)', ru: 'PDF · Letter (США)' },
    scanPdfFit: { uk: 'PDF · за розміром фото', en: 'PDF · photo size', fr: 'PDF · taille de la photo', ru: 'PDF · по размеру фото' },
    scanJpg: { uk: 'JPG (картинки)', en: 'JPG (images)', fr: 'JPG (images)', ru: 'JPG (картинки)' },
    scanPng: { uk: 'PNG (картинки)', en: 'PNG (images)', fr: 'PNG (images)', ru: 'PNG (картинки)' },
    scanPrint: { uk: '🖨 Друк', en: '🖨 Print', fr: '🖨 Imprimer', ru: '🖨 Печать' },
    scanShare: { uk: '📤 Поділитися', en: '📤 Share', fr: '📤 Partager', ru: '📤 Поделиться' },
    scanSave: { uk: '⬇ Зберегти', en: '⬇ Save', fr: '⬇ Enregistrer', ru: '⬇ Сохранить' },
    scanOpen: { uk: '📖 Відкрити в читалці', en: '📖 Open in the reader', fr: '📖 Ouvrir dans la liseuse', ru: '📖 Открыть в читалке' },
    scanClear: { uk: 'Очистити', en: 'Clear', fr: 'Effacer', ru: 'Очистить' },
    scanClearSure: { uk: 'Ще раз — і все зникне', en: 'Tap again to clear all', fr: 'Encore une fois pour tout effacer', ru: 'Ещё раз — и всё исчезнет' },
    scanSaved: { uk: 'Збережено.', en: 'Saved.', fr: 'Enregistré.', ru: 'Сохранено.' },
    scanSavedDownloads: { uk: 'Збережено в «Завантаження».', en: 'Saved to Downloads.', fr: 'Enregistré dans Téléchargements.', ru: 'Сохранено в «Загрузки».' },
    scanBadImage: { uk: 'Не вдалося відкрити фото «{name}». Спробуйте JPG або PNG.', en: 'Could not open the photo «{name}». Try JPG or PNG.',
                    fr: 'Impossible d’ouvrir la photo « {name} ». Essayez JPG ou PNG.', ru: 'Не удалось открыть фото «{name}». Попробуйте JPG или PNG.' },
    scanFailed: { uk: 'Не вдалося створити файл. Спробуйте ще раз.', en: 'Could not create the file. Try again.', fr: 'Impossible de créer le fichier. Réessayez.', ru: 'Не удалось создать файл. Попробуйте ещё раз.' }
});

const SCAN_WORK_SIDE = 4000;   // фото зменшується до цього перед обробкою: аркуш на фото 12 МП лишається ~250 dpi для A4
const SCAN_OUT_SIDE = 3300;    // довша сторона готової сторінки: A4 при ~280 dpi
const SCAN_FILTERS = [['doc', 'scanFilterDoc'], ['bw', 'scanFilterBw'], ['gray', 'scanFilterGray'], ['orig', 'scanFilterOrig']];
const SCAN_FORMATS = [['pdf-a4', 'scanPdfA4'], ['pdf-letter', 'scanPdfLetter'], ['pdf-fit', 'scanPdfFit'], ['jpg', 'scanJpg'], ['png', 'scanPng']];
// Сторінка: { file, corners: [[x,y]×4] частки фото (ЛВ, ПВ, ПН, ЛН), rotation (0/90/180/270), filter, out: JPEG Blob, w, h, thumb: blob-URL }.
const scanState = { pages: [], busy: false, edit: null, nextId: 1 };
function scanEl(id) { return document.getElementById(id); }
function scanStored(key, fallback, allowed) { try { const v = localStorage.getItem(key); return allowed.some(([k]) => k === v) ? v : fallback; } catch (e) { return fallback; } }
function scanStore(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

// ---------- обробка зображення ----------
// Фото (з поворотом за EXIF) → canvas, довша сторона не більша за maxSide.
async function scanLoad(file, maxSide) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
        const k = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * k)); canvas.height = Math.max(1, Math.round(bitmap.height * k));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return canvas;
    } finally { bitmap.close(); }
}
function scanLuma(data, n) {
    const out = new Uint8ClampedArray(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) out[i] = (data[j] * 77 + data[j + 1] * 150 + data[j + 2] * 29) >> 8;
    return out;
}
const SCAN_FULL = [[0, 0], [1, 0], [1, 1], [0, 1]];
// Краї аркуша: аркуш світліший за тло. На зменшеній копії поріг Оцу відділяє світле, найбільша світла пляма — аркуш, її
// крайні точки (мінімум і максимум x+y та x−y) — чотири кути. Пляма замала (менше 15% кадру) чи це майже весь кадр
// (аркуш на білому столі, фото вже обрізане) — повертається все фото, кути читач підправить сам.
function scanDetectCorners(canvas) {
    const k = Math.min(1, 256 / Math.max(canvas.width, canvas.height));
    const w = Math.max(8, Math.round(canvas.width * k)), h = Math.max(8, Math.round(canvas.height * k));
    const small = document.createElement('canvas'); small.width = w; small.height = h;
    const sctx = small.getContext('2d', { willReadFrequently: true });
    sctx.filter = 'blur(1px)'; sctx.drawImage(canvas, 0, 0, w, h);
    const lum = scanLuma(sctx.getImageData(0, 0, w, h).data, w * h);
    const hist = new Array(256).fill(0); for (const v of lum) hist[v]++;
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, thr = 128;
    for (let i = 0; i < 256; i++) {
        wB += hist[i]; if (!wB) continue;
        const wF = w * h - wB; if (!wF) break;
        sumB += i * hist[i];
        const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
        if (between > best) { best = between; thr = i; }
    }
    const label = new Int32Array(w * h), stack = [];
    let bestId = 0, bestSize = 0, id = 0;
    for (let p = 0; p < w * h; p++) {
        if (label[p] || lum[p] <= thr) continue;
        id++; let size = 0; label[p] = id; stack.push(p);
        while (stack.length) {
            const q = stack.pop(); size++;
            const x = q % w, y = (q - x) / w;
            if (x > 0 && !label[q - 1] && lum[q - 1] > thr) { label[q - 1] = id; stack.push(q - 1); }
            if (x < w - 1 && !label[q + 1] && lum[q + 1] > thr) { label[q + 1] = id; stack.push(q + 1); }
            if (y > 0 && !label[q - w] && lum[q - w] > thr) { label[q - w] = id; stack.push(q - w); }
            if (y < h - 1 && !label[q + w] && lum[q + w] > thr) { label[q + w] = id; stack.push(q + w); }
        }
        if (size > bestSize) { bestSize = size; bestId = id; }
    }
    if (!bestId || bestSize < w * h * 0.15 || bestSize > w * h * 0.97) return SCAN_FULL.map(c => c.slice());
    let tl = [0, 0, Infinity], tr = [0, 0, -Infinity], br = [0, 0, -Infinity], bl = [0, 0, Infinity];
    for (let p = 0; p < w * h; p++) {
        if (label[p] !== bestId) continue;
        const x = p % w, y = (p - x) / w;
        if (x + y < tl[2]) tl = [x, y, x + y];
        if (x + y > br[2]) br = [x, y, x + y];
        if (x - y > tr[2]) tr = [x, y, x - y];
        if (x - y < bl[2]) bl = [x, y, x - y];
    }
    const corners = [tl, tr, br, bl].map(([x, y]) => [Math.min(1, Math.max(0, (x + .5) / w)), Math.min(1, Math.max(0, (y + .5) / h))]);
    return scanQuadArea(corners) < 0.15 ? SCAN_FULL.map(c => c.slice()) : corners;
}
function scanQuadArea(c) {
    let a = 0; for (let i = 0; i < 4; i++) { const [x1, y1] = c[i], [x2, y2] = c[(i + 1) % 4]; a += x1 * y2 - x2 * y1; }
    return Math.abs(a) / 2;
}
// Гомографія, що переводить точки прямокутника 0..w×0..h (результат) у чотирикутник на фото: розв'язок 8 рівнянь.
function scanHomography(w, h, quad) {
    const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [];
    for (let i = 0; i < 4; i++) {
        const [u, v] = src[i], [x, y] = quad[i];
        A.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
        A.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
    }
    for (let c = 0; c < 8; c++) {
        let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        [A[c], A[p]] = [A[p], A[c]];
        for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]; }
    }
    return [...A.map((row, i) => row[8] / row[i]), 1];
}
const scanDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// Вирівнювання: чотирикутник аркуша → прямокутник (білінійна вибірка), розмір — за довжинами сторін аркуша на фото.
function scanWarp(canvas, corners) {
    const quad = corners.map(([x, y]) => [x * canvas.width, y * canvas.height]);
    let ow = Math.max(scanDist(quad[0], quad[1]), scanDist(quad[3], quad[2]));
    let oh = Math.max(scanDist(quad[0], quad[3]), scanDist(quad[1], quad[2]));
    const k = Math.min(1, SCAN_OUT_SIDE / Math.max(ow, oh));
    ow = Math.max(16, Math.round(ow * k)); oh = Math.max(16, Math.round(oh * k));
    const H = scanHomography(ow, oh, quad);
    const sw = canvas.width, sh = canvas.height;
    const src = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
    const out = new ImageData(ow, oh), d = out.data;
    for (let v = 0, o = 0; v < oh; v++) {
        for (let u = 0; u < ow; u++, o += 4) {
            const z = H[6] * u + H[7] * v + 1;
            let x = (H[0] * u + H[1] * v + H[2]) / z - .5, y = (H[3] * u + H[4] * v + H[5]) / z - .5;
            x = x < 0 ? 0 : x > sw - 1.001 ? sw - 1.001 : x; y = y < 0 ? 0 : y > sh - 1.001 ? sh - 1.001 : y;
            const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
            const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
            for (let c = 0; c < 3; c++) {
                const top = src[i00 + c] + (src[i10 + c] - src[i00 + c]) * fx, bot = src[i01 + c] + (src[i11 + c] - src[i01 + c]) * fx;
                d[o + c] = top + (bot - top) * fy;
            }
            d[o + 3] = 255;
        }
    }
    return out;
}
// Яскравість «паперу» навколо кожної точки: максимум у клітинках сітки (текст темніший — він не потрапляє), згладжений.
function scanBackground(lum, w, h) {
    const cell = Math.max(8, Math.round(Math.min(w, h) / 40)), gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
    let grid = new Float32Array(gw * gh);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const g = ((y / cell) | 0) * gw + ((x / cell) | 0), v = lum[y * w + x]; if (v > grid[g]) grid[g] = v; }
    for (let pass = 0; pass < 2; pass++) {
        const next = new Float32Array(gw * gh);
        for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
            let s = 0, n = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = gy + dy, xx = gx + dx; if (yy >= 0 && yy < gh && xx >= 0 && xx < gw) { s += grid[yy * gw + xx]; n++; } }
            next[gy * gw + gx] = Math.max(grid[gy * gw + gx] * .5 + s / n * .5, 24);
        }
        grid = next;
    }
    return { grid, gw, gh, cell };
}
function scanBgAt(bg, x, y) {
    const gx = Math.min(bg.gw - 1.001, Math.max(0, x / bg.cell - .5)), gy = Math.min(bg.gh - 1.001, Math.max(0, y / bg.cell - .5));
    const x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0, x1 = Math.min(bg.gw - 1, x0 + 1), y1 = Math.min(bg.gh - 1, y0 + 1), g = bg.grid;
    const top = g[y0 * bg.gw + x0] * (1 - fx) + g[y0 * bg.gw + x1] * fx, bot = g[y1 * bg.gw + x0] * (1 - fx) + g[y1 * bg.gw + x1] * fx;
    return top * (1 - fy) + bot * fy;
}
// «Документ»: колір кожної точки ділиться на яскравість паперу навколо неї — тіні й жовтизна зникають, фон стає білим,
// текст і кольорові позначки лишаються. «Ч/Б» — те саме, потім поріг. «Сірий» — лише яскравість.
function scanFilter(img, mode) {
    if (mode === 'orig') return img;
    const { width: w, height: h, data: d } = img, n = w * h;
    const lum = scanLuma(d, n);
    if (mode === 'gray') { for (let i = 0, j = 0; i < n; i++, j += 4) d[j] = d[j + 1] = d[j + 2] = lum[i]; return img; }
    const bg = scanBackground(lum, w, h);
    const paper = [0, 0, 0]; let papers = 0;
    for (let y = 0, i = 0; y < h; y++) {
        for (let x = 0; x < w; x++, i++) {
            const j = i * 4, f = 255 / scanBgAt(bg, x, y);
            if (mode === 'bw') { const v = lum[i] * f; d[j] = d[j + 1] = d[j + 2] = v < 175 ? 0 : 255; continue; }
            for (let c = 0; c < 3; c++) d[j + c] = d[j + c] * f;
            if (lum[i] * f > 225) { paper[0] += d[j]; paper[1] += d[j + 1]; paper[2] += d[j + 2]; papers++; }
        }
    }
    if (mode === 'bw') return img;
    // Баланс білого: папір під жовтою лампою чи в синій тіні стає білим, а не кремовим; далі — трохи контрасту тексту.
    const gain = paper.map(s => papers ? Math.min(1.4, 255 / Math.max(1, s / papers)) : 1);
    for (let j = 0; j < d.length; j += 4) for (let c = 0; c < 3; c++) { const v = d[j + c] * gain[c]; d[j + c] = v >= 246 ? 255 : (v - 12) * 1.06; }
    return img;
}
function scanRotate(img, rotation) {
    const src = document.createElement('canvas'); src.width = img.width; src.height = img.height;
    src.getContext('2d').putImageData(img, 0, 0);
    if (!rotation) return src;
    const out = document.createElement('canvas'), turn = rotation % 180 !== 0;
    out.width = turn ? src.height : src.width; out.height = turn ? src.width : src.height;
    const ctx = out.getContext('2d');
    ctx.translate(out.width / 2, out.height / 2); ctx.rotate(rotation * Math.PI / 180); ctx.drawImage(src, -src.width / 2, -src.height / 2);
    src.width = 0;
    return out;
}
const scanBlob = (canvas, type, quality) => new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('encode')), type, quality));
// Готова сторінка: вирівняна, покращена, повернута → JPEG і мініатюра. source — уже завантажене фото (у редакторі).
async function scanRender(page, source = null) {
    const canvas = source || await scanLoad(page.file, SCAN_WORK_SIDE);
    try {
        const out = scanRotate(scanFilter(scanWarp(canvas, page.corners), page.filter), page.rotation);
        page.out = await scanBlob(out, 'image/jpeg', page.filter === 'bw' ? 0.82 : 0.88);
        page.w = out.width; page.h = out.height;
        const k = 240 / Math.max(out.width, out.height), thumb = document.createElement('canvas');
        thumb.width = Math.max(1, Math.round(out.width * k)); thumb.height = Math.max(1, Math.round(out.height * k));
        thumb.getContext('2d').drawImage(out, 0, 0, thumb.width, thumb.height);
        if (page.thumb) URL.revokeObjectURL(page.thumb);
        page.thumb = URL.createObjectURL(await scanBlob(thumb, 'image/jpeg', 0.8));
        out.width = 0; thumb.width = 0;
    } finally { if (!source) canvas.width = 0; }
}

// ---------- PDF ----------
// Мінімальний PDF: кожна сторінка — одне JPEG-зображення (DCTDecode), уписане з полями й по центру.
// paper: 'a4' | 'letter' — орієнтація аркуша за сторінкою; 'fit' — аркуш у пропорціях фото, довша сторона як у A4.
async function scanBuildPdf(pages, paper) {
    const enc = new TextEncoder(), parts = [], offsets = [];
    let length = 0;
    const push = chunk => { const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk; parts.push(bytes); length += bytes.length; };
    const obj = (num, body) => { offsets[num] = length; push(`${num} 0 obj\n`); for (const b of [].concat(body)) push(b); push('\nendobj\n'); };
    const f = n => (Math.round(n * 100) / 100).toString();
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
    for (let i = 0; i < pages.length; i++) {
        const p = pages[i], num = 3 + i * 3, landscape = p.w > p.h;
        let W, H, margin;
        if (paper === 'fit') { const k = 841.89 / Math.max(p.w, p.h); W = p.w * k; H = p.h * k; margin = 0; }
        else { const [a, b] = paper === 'letter' ? [612, 792] : [595.28, 841.89]; [W, H] = landscape ? [b, a] : [a, b]; margin = 18; }
        const k = Math.min((W - 2 * margin) / p.w, (H - 2 * margin) / p.h), dw = p.w * k, dh = p.h * k;
        const content = `q ${f(dw)} 0 0 ${f(dh)} ${f((W - dw) / 2)} ${f((H - dh) / 2)} cm /Im0 Do Q`;
        const jpeg = new Uint8Array(await p.out.arrayBuffer());
        obj(num, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /Resources << /XObject << /Im0 ${num + 2} 0 R >> >> /Contents ${num + 1} 0 R >>`);
        obj(num + 1, [`<< /Length ${content.length} >>\nstream\n`, content, '\nendstream']);
        obj(num + 2, [`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, '\nendstream']);
    }
    const info = 3 + pages.length * 3;
    obj(info, '<< /Producer (AI E-book Reader scanner) >>');
    const xref = length;
    push(`xref\n0 ${info + 1}\n0000000000 65535 f \n`);
    for (let i = 1; i <= info; i++) push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    push(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
}

// ---------- файли ----------
function scanBaseName() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `scan-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
async function scanPageImage(page, type) {
    if (type === 'image/jpeg') return page.out;
    const bitmap = await createImageBitmap(page.out), canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close();
    try { return await scanBlob(canvas, type); } finally { canvas.width = 0; }
}
// Файл у вибраному форматі: PDF — один файл; JPG/PNG — одна сторінка як є, кілька — ZIP.
async function scanMakeFile(format) {
    const pages = scanState.pages, base = scanBaseName();
    if (format.startsWith('pdf')) return new File([await scanBuildPdf(pages, format.slice(4))], base + '.pdf', { type: 'application/pdf' });
    const [type, ext] = format === 'png' ? ['image/png', 'png'] : ['image/jpeg', 'jpg'];
    if (pages.length === 1) return new File([await scanPageImage(pages[0], type)], `${base}.${ext}`, { type });
    const zip = new JSZip();
    for (let i = 0; i < pages.length; i++) zip.file(`${base}-${String(i + 1).padStart(2, '0')}.${ext}`, await scanPageImage(pages[i], type));
    return new File([await zip.generateAsync({ type: 'blob' })], base + '.zip', { type: 'application/zip' });
}

// ---------- вікно ----------
function scanStatus(text) { const s = scanEl('scan-status'); if (s) s.textContent = text || ''; }
function scanButton(label, onClick, cls = '') {
    const b = document.createElement('button'); b.type = 'button'; if (cls) b.className = cls;
    b.dataset.i18n = label; b.textContent = t(label); b.addEventListener('click', onClick); return b;
}
function buildScanner() {
    if (scanEl('scanner')) return;
    const modal = document.createElement('div'); modal.id = 'scanner'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'scan-title');
    const box = document.createElement('div'); box.className = 'scan-box';
    // Список сторінок
    const head = document.createElement('div'); head.className = 'scan-head';
    const title = document.createElement('h3'); title.id = 'scan-title'; title.dataset.i18n = 'scanTitle';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'close-panel-btn'; close.textContent = '✕'; close.dataset.i18nTitle = 'tClose';
    close.addEventListener('click', closeScanner);
    head.append(title, close);
    const add = document.createElement('div'); add.className = 'scan-add';
    const camera = document.createElement('input'); camera.type = 'file'; camera.accept = 'image/*'; camera.setAttribute('capture', 'environment'); camera.id = 'scan-camera-input'; camera.hidden = true;
    const gallery = document.createElement('input'); gallery.type = 'file'; gallery.accept = 'image/*'; gallery.multiple = true; gallery.id = 'scan-gallery-input'; gallery.hidden = true;
    for (const input of [camera, gallery]) input.addEventListener('change', () => { const files = [...input.files]; input.value = ''; scanAddFiles(files, input === camera); });
    add.append(scanButton('scanCamera', () => camera.click(), 'btn-primary'), scanButton('scanGallery', () => gallery.click()), camera, gallery);
    const status = document.createElement('div'); status.id = 'scan-status'; status.setAttribute('aria-live', 'polite');
    const list = document.createElement('div'); list.id = 'scan-pages';
    const empty = document.createElement('p'); empty.id = 'scan-empty'; empty.dataset.i18n = 'scanEmpty';
    const out = document.createElement('div'); out.className = 'scan-out'; out.id = 'scan-out';
    const format = document.createElement('select'); format.id = 'scan-format'; format.dataset.i18nTitle = 'scanFormat';
    for (const [value, key] of SCAN_FORMATS) { const o = document.createElement('option'); o.value = value; o.dataset.i18n = key; format.append(o); }
    format.value = scanStored('reader_scan_format', 'pdf-a4', SCAN_FORMATS);
    format.addEventListener('change', () => scanStore('reader_scan_format', format.value));
    const actions = document.createElement('div'); actions.className = 'scan-actions';
    const clear = scanButton('scanClear', () => {
        if (clear.dataset.sure !== '1') { clear.dataset.sure = '1'; clear.textContent = t('scanClearSure'); setTimeout(() => { clear.dataset.sure = ''; clear.textContent = t('scanClear'); }, 3000); return; }
        clear.dataset.sure = ''; clear.textContent = t('scanClear'); scanClearAll();
    }, 'scan-clear');
    clear.id = 'scan-clear';
    actions.append(scanButton('scanPrint', () => scanExport('print')), scanButton('scanShare', () => scanExport('share')), scanButton('scanSave', () => scanExport('save')),
        scanButton('scanOpen', () => scanExport('open')), clear);
    for (const [i, b] of [...actions.children].entries()) b.id = ['scan-print', 'scan-share', 'scan-save', 'scan-open', 'scan-clear'][i];
    out.append(format, actions);
    const privacy = document.createElement('p'); privacy.className = 'scan-privacy'; privacy.dataset.i18n = 'scanPrivacy';
    const listView = document.createElement('div'); listView.id = 'scan-list-view'; listView.className = 'scan-view';
    listView.append(add, status, empty, list, out, privacy);
    // Редактор однієї сторінки
    const editView = document.createElement('div'); editView.id = 'scan-edit-view'; editView.className = 'scan-view'; editView.hidden = true;
    const hint = document.createElement('div'); hint.className = 'scan-hint'; hint.dataset.i18n = 'scanCorners';
    const stage = document.createElement('div'); stage.id = 'scan-stage';
    const photo = document.createElement('canvas'); photo.id = 'scan-photo';
    const outline = document.createElement('canvas'); outline.id = 'scan-outline';
    stage.append(photo, outline);
    for (let i = 0; i < 4; i++) { const h = document.createElement('div'); h.className = 'scan-handle'; h.dataset.i = i; h.setAttribute('role', 'slider'); h.setAttribute('aria-label', '↖↗↘↙'[i]); h.tabIndex = 0; stage.append(h); }
    const tools = document.createElement('div'); tools.className = 'scan-tools';
    const edges = document.createElement('div'); edges.className = 'scan-row';
    edges.append(scanButton('scanAuto', () => { const e = scanState.edit; if (e) { e.corners = scanDetectCorners(e.source); scanDrawEditor(); } }),
        scanButton('scanFull', () => { const e = scanState.edit; if (e) { e.corners = SCAN_FULL.map(c => c.slice()); scanDrawEditor(); } }));
    const rot = document.createElement('div'); rot.className = 'scan-row';
    const rl = document.createElement('button'); rl.type = 'button'; rl.textContent = '⟲'; rl.dataset.i18nTitle = 'scanRotL'; rl.dataset.i18nAria = 'scanRotL';
    const rr = document.createElement('button'); rr.type = 'button'; rr.textContent = '⟳'; rr.dataset.i18nTitle = 'scanRotR'; rr.dataset.i18nAria = 'scanRotR';
    rl.addEventListener('click', () => { const e = scanState.edit; if (e) { e.rotation = (e.rotation + 270) % 360; scanEditPreview(); } });
    rr.addEventListener('click', () => { const e = scanState.edit; if (e) { e.rotation = (e.rotation + 90) % 360; scanEditPreview(); } });
    rot.append(rl, rr);
    edges.append(rot);
    const filters = document.createElement('div'); filters.className = 'scan-row scan-filters'; filters.setAttribute('role', 'radiogroup');
    for (const [value, key] of SCAN_FILTERS) {
        const b = scanButton(key, () => { const e = scanState.edit; if (!e) return; e.filter = value; scanStore('reader_scan_filter', value); scanSyncFilters(); scanEditPreview(); }, 'scan-filter');
        b.dataset.filter = value; b.setAttribute('role', 'radio'); filters.append(b);
    }
    const preview = document.createElement('img'); preview.id = 'scan-preview'; preview.alt = '';
    const done = document.createElement('div'); done.className = 'scan-row scan-done';
    const cancel = scanButton('scanCancel', () => scanCloseEditor(false)); cancel.id = 'scan-edit-cancel';
    const ok = scanButton('scanDone', () => scanCloseEditor(true), 'btn-primary'); ok.id = 'scan-edit-done';
    done.append(cancel, ok);
    tools.append(edges, filters, preview, done);
    editView.append(hint, stage, tools);
    box.append(head, listView, editView); modal.append(box); document.body.append(modal);
    scanBindHandles(stage);
    window.addEventListener('resize', () => { if (scanState.edit) scanDrawEditor(); });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || !scanEl('scanner')?.classList.contains('open')) return;
        e.preventDefault(); if (scanState.edit) scanCloseEditor(false); else closeScanner();
    });
    applyI18n();
}
function openScanner() {
    buildScanner();
    scanEl('scanner').classList.add('open');
    if (typeof closeFullMenu === 'function' && typeof isFullMenuOpen === 'function' && isFullMenuOpen() && state.format) closeFullMenu();
    scanRenderList();
}
function closeScanner() {
    if (scanState.edit) scanCloseEditor(false);
    scanEl('scanner')?.classList.remove('open');
}
function scanIsOpen() { return !!scanEl('scanner')?.classList.contains('open'); }

async function scanAddFiles(files, fromCamera) {
    if (!files.length) return;
    while (scanState.busy) await new Promise(r => setTimeout(r, 100));
    scanState.busy = true;
    const filter = scanStored('reader_scan_filter', 'doc', SCAN_FILTERS), added = [], failed = [];
    try {
        for (let i = 0; i < files.length; i++) {
            scanStatus(t('scanProcessing').replace('{n}', i + 1).replace('{total}', files.length));
            await new Promise(r => setTimeout(r, 0));   // статус устигає намалюватися
            const page = { id: scanState.nextId++, file: files[i], rotation: 0, filter, corners: null, out: null, thumb: '' };
            let source;
            try { source = await scanLoad(files[i], SCAN_WORK_SIDE); }
            catch (e) { failed.push(files[i].name || '?'); continue; }
            try { page.corners = scanDetectCorners(source); await scanRender(page, source); } finally { source.width = 0; }
            scanState.pages.push(page); added.push(page);
            scanRenderList();
        }
    } finally { scanState.busy = false; }
    scanStatus(failed.length ? t('scanBadImage').replace('{name}', failed.join(', ')) : '');
    scanRenderList();
    // Одне фото з камери — одразу на перевірку кутів, як у сканерах; кілька з галереї — лише список (кожну можна відкрити).
    if (fromCamera && added.length === 1) scanOpenEditor(added[0]);
}
function scanRenderList() {
    const list = scanEl('scan-pages'); if (!list) return;
    list.replaceChildren();
    scanState.pages.forEach((page, i) => {
        const card = document.createElement('div'); card.className = 'scan-card'; card.dataset.id = page.id;
        const img = document.createElement('img'); img.src = page.thumb; img.alt = t('scanPage').replace('{n}', i + 1);
        const open = document.createElement('button'); open.type = 'button'; open.className = 'scan-thumb'; open.title = t('scanEdit'); open.append(img);
        open.addEventListener('click', () => scanOpenEditor(page));
        const num = document.createElement('span'); num.className = 'scan-num'; num.textContent = i + 1;
        const bar = document.createElement('div'); bar.className = 'scan-card-bar';
        const mk = (text, key, fn, disabled) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.title = t(key); b.setAttribute('aria-label', t(key)); b.disabled = disabled; b.addEventListener('click', fn); return b; };
        bar.append(mk('◀', 'scanMoveLeft', () => scanMove(i, -1), i === 0), mk('✎', 'scanEdit', () => scanOpenEditor(page), false),
            mk('🗑', 'scanDelete', () => scanDelete(page), false), mk('▶', 'scanMoveRight', () => scanMove(i, 1), i === scanState.pages.length - 1));
        card.append(open, num, bar); list.append(card);
    });
    const has = scanState.pages.length > 0;
    scanEl('scan-empty').hidden = has;
    scanEl('scan-out').hidden = !has;
    if (has && !scanState.busy && !scanEl('scan-status').textContent) scanStatus(t('scanPages').replace('{n}', scanState.pages.length));
}
function scanMove(i, step) {
    const j = i + step, p = scanState.pages;
    if (j < 0 || j >= p.length) return;
    [p[i], p[j]] = [p[j], p[i]]; scanRenderList();
}
function scanDelete(page) {
    const i = scanState.pages.indexOf(page); if (i < 0) return;
    scanState.pages.splice(i, 1); if (page.thumb) URL.revokeObjectURL(page.thumb);
    scanStatus(''); scanRenderList();
}
function scanClearAll() {
    for (const p of scanState.pages) if (p.thumb) URL.revokeObjectURL(p.thumb);
    scanState.pages = []; scanStatus(''); scanRenderList();
}

// ---------- редактор кутів ----------
async function scanOpenEditor(page) {
    if (scanState.busy) return;
    let source;
    try { source = await scanLoad(page.file, SCAN_WORK_SIDE); } catch (e) { scanStatus(t('scanBadImage').replace('{name}', page.file.name || '?')); return; }
    scanState.edit = { page, source, corners: page.corners.map(c => c.slice()), rotation: page.rotation, filter: page.filter, token: 0 };
    scanEl('scan-list-view').hidden = true; scanEl('scan-edit-view').hidden = false;
    scanSyncFilters(); scanDrawEditor(); scanEditPreview();
    scanEl('scan-edit-done').focus({ preventScroll: true });
}
async function scanCloseEditor(apply) {
    const e = scanState.edit; if (!e) return;
    scanState.edit = null;
    scanEl('scan-edit-view').hidden = true; scanEl('scan-list-view').hidden = false;
    if (apply) {
        Object.assign(e.page, { corners: e.corners, rotation: e.rotation, filter: e.filter });
        scanState.busy = true; scanStatus(t('scanProcessing').replace('{n}', 1).replace('{total}', 1));
        try { await scanRender(e.page, e.source); } finally { scanState.busy = false; scanStatus(''); }
    }
    e.source.width = 0;
    scanRenderList();
}
function scanSyncFilters() {
    const e = scanState.edit; if (!e) return;
    for (const b of document.querySelectorAll('#scanner .scan-filter')) { const on = b.dataset.filter === e.filter; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); }
}
// Фото вписується в сцену; кути — маркери поверх нього; контур аркуша — на прозорому canvas над фото.
function scanDrawEditor() {
    const e = scanState.edit; if (!e) return;
    const stage = scanEl('scan-stage'), photo = scanEl('scan-photo'), outline = scanEl('scan-outline');
    const r = stage.getBoundingClientRect(), k = Math.min(r.width / e.source.width, r.height / e.source.height);
    const w = Math.max(1, Math.round(e.source.width * k)), h = Math.max(1, Math.round(e.source.height * k));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [photo, outline]) { c.style.width = w + 'px'; c.style.height = h + 'px'; c.style.left = (r.width - w) / 2 + 'px'; c.style.top = (r.height - h) / 2 + 'px'; }
    if (photo.width !== Math.round(w * dpr) || photo.dataset.src !== String(e.page.id)) {
        photo.width = Math.round(w * dpr); photo.height = Math.round(h * dpr); photo.dataset.src = e.page.id;
        const ctx = photo.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(e.source, 0, 0, photo.width, photo.height);
    }
    outline.width = photo.width; outline.height = photo.height;
    const ctx = outline.getContext('2d'), pts = e.corners.map(([x, y]) => [x * outline.width, y * outline.height]);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, outline.width, outline.height);
    ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#4c8dff'; ctx.lineWidth = 2 * dpr; ctx.stroke();
    const left = (r.width - w) / 2, top = (r.height - h) / 2;
    stage.querySelectorAll('.scan-handle').forEach((hd, i) => {
        hd.style.left = (left + e.corners[i][0] * w) + 'px'; hd.style.top = (top + e.corners[i][1] * h) + 'px';
        hd.setAttribute('aria-valuetext', e.corners[i].map(v => Math.round(v * 100) + '%').join(' '));
    });
    e.box = { left: r.left + left, top: r.top + top, w, h };
}
function scanBindHandles(stage) {
    let drag = null;
    stage.addEventListener('pointerdown', ev => {
        const hd = ev.target.closest('.scan-handle'); const e = scanState.edit; if (!e) return;
        // Дотик поруч із маркером теж його бере: на телефоні 44px-зона, а не лише кружечок.
        let i = hd ? +hd.dataset.i : -1;
        if (i < 0) {
            let best = 1e9;
            e.corners.forEach(([x, y], j) => { const d = Math.hypot(e.box.left + x * e.box.w - ev.clientX, e.box.top + y * e.box.h - ev.clientY); if (d < best) { best = d; i = j; } });
            if (best > 44) return;
        }
        drag = { i, id: ev.pointerId }; stage.setPointerCapture(ev.pointerId); ev.preventDefault();
        stage.querySelectorAll('.scan-handle')[i].classList.add('dragging');
    });
    stage.addEventListener('pointermove', ev => {
        const e = scanState.edit; if (!drag || ev.pointerId !== drag.id || !e) return;
        e.corners[drag.i] = [Math.min(1, Math.max(0, (ev.clientX - e.box.left) / e.box.w)), Math.min(1, Math.max(0, (ev.clientY - e.box.top) / e.box.h))];
        scanDrawEditor();
    });
    const end = ev => {
        if (!drag || ev.pointerId !== drag.id) return;
        stage.querySelectorAll('.scan-handle')[drag.i].classList.remove('dragging'); drag = null; scanEditPreview();
    };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('keydown', ev => {
        const hd = ev.target.closest('.scan-handle'), e = scanState.edit; if (!hd || !e) return;
        const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key]; if (!step) return;
        ev.preventDefault(); const c = e.corners[+hd.dataset.i];
        c[0] = Math.min(1, Math.max(0, c[0] + step[0] * .005)); c[1] = Math.min(1, Math.max(0, c[1] + step[1] * .005));
        scanDrawEditor(); scanEditPreview();
    });
}
// Маленький попередній вигляд результату (зменшене фото — миттєво), щоб видно було дію фільтра й повороту.
async function scanEditPreview() {
    const e = scanState.edit; if (!e) return;
    const token = ++e.token;
    await new Promise(r => setTimeout(r, 30));
    if (scanState.edit !== e || token !== e.token) return;
    const k = 700 / Math.max(e.source.width, e.source.height), small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(e.source.width * Math.min(1, k))); small.height = Math.max(1, Math.round(e.source.height * Math.min(1, k)));
    small.getContext('2d', { willReadFrequently: true }).drawImage(e.source, 0, 0, small.width, small.height);
    const out = scanRotate(scanFilter(scanWarp(small, e.corners), e.filter), e.rotation);
    const blob = await scanBlob(out, 'image/jpeg', 0.8); out.width = 0; small.width = 0;
    if (scanState.edit !== e || token !== e.token) return;
    const img = scanEl('scan-preview'); if (img.src) URL.revokeObjectURL(img.src); img.src = URL.createObjectURL(blob);
}

// ---------- друк, «Поділитися», зберегти, відкрити ----------
async function scanExport(action) {
    if (!scanState.pages.length || scanState.busy) return;
    const format = scanEl('scan-format').value;
    if (action === 'print') { scanPrint(format); return; }
    scanState.busy = true; scanStatus(t('libLoading'));
    try {
        const file = await scanMakeFile(action === 'open' && !format.startsWith('pdf') ? 'pdf-fit' : format);
        if (action === 'open') { closeScanner(); scanStatus(''); await openBookFile(file); return; }
        if (action === 'share' && navigator.canShare && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ files: [file], title: file.name }); scanStatus(''); return; }
            catch (e) { if (e && e.name === 'AbortError') { scanStatus(''); return; } }
        }
        scanStatus(await scanSaveFile(file));
    } catch (e) {
        scanStatus(t('scanFailed'));
    } finally { scanState.busy = false; }
}
async function scanSaveFile(file) {
    if (typeof window.showSaveFilePicker === 'function') {
        const ext = file.name.split('.').pop();
        let handle;
        try { handle = await window.showSaveFilePicker({ suggestedName: file.name, types: [{ description: ext.toUpperCase(), accept: { [file.type]: ['.' + ext] } }] }); }
        catch (e) { if (e && e.name === 'AbortError') return ''; handle = null; }
        if (handle) { const w = await handle.createWritable(); await w.write(file); await w.close(); return t('scanSaved'); }
    }
    const url = URL.createObjectURL(file), a = document.createElement('a');
    a.href = url; a.download = file.name; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return t('scanSavedDownloads');
}
// Друк: кожна сторінка — окремий аркуш, уписана по центру. Розмір аркуша — як у вибраному PDF (A4 / Letter), інакше — принтера.
function scanPrint(format) {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;border:0;opacity:0;';
    frame.title = t('scanPrint');
    document.body.append(frame);
    const size = format === 'pdf-a4' ? 'A4' : format === 'pdf-letter' ? 'letter' : 'auto', margin = format === 'pdf-fit' ? '0' : '6mm';
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${size};margin:${margin}}html,body{margin:0;padding:0;background:#fff}
        .p{width:100%;height:100vh;display:flex;align-items:center;justify-content:center;break-after:page;page-break-after:always;overflow:hidden}
        .p:last-child{break-after:auto;page-break-after:auto}img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body></body></html>`);
    doc.close();
    const urls = scanState.pages.map(p => URL.createObjectURL(p.out));
    const loads = urls.map(url => new Promise(resolve => {
        const wrap = doc.createElement('div'); wrap.className = 'p';
        const img = doc.createElement('img'); img.onload = img.onerror = resolve; img.src = url;
        wrap.append(img); doc.body.append(wrap);
    }));
    Promise.all(loads).then(() => {
        const cleanup = () => { try { frame.remove(); } catch (e) {} urls.forEach(u => URL.revokeObjectURL(u)); };
        frame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
        setTimeout(cleanup, 120000);
        frame.contentWindow.focus(); frame.contentWindow.print();
    });
}

document.getElementById('btn-scanner')?.addEventListener('click', () => openScanner());
document.getElementById('home-scanner')?.addEventListener('click', () => openScanner());
