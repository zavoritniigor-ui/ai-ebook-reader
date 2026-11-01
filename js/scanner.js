/* Сканер документів (власник, 2026-10-30: «застосунок сканер, який з фото робить зручні формати для друку»).
 * Фото з камери чи галереї → краї аркуша (знаходяться самі, кути можна підправити пальцем) → вирівнювання перспективи →
 * покращення («Кольоровий» — білий папір без тіней, кольори тексту, печаток і маркера лишаються; «Ч/Б», «Сірий»; «Оригінал» — фото як є) → PDF (A4, Letter або за розміром фото),
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
    scanCameraNext: { uk: '📷 Наступна сторінка', en: '📷 Next page', fr: '📷 Page suivante', ru: '📷 Следующая страница' },
    scanAllFilter: { uk: 'Для всіх сторінок:', en: 'For all pages:', fr: 'Pour toutes les pages :', ru: 'Для всех страниц:' },
    scanOcr: { uk: '🔤 Розпізнати текст — PDF стане клікабельним', en: '🔤 Recognise text — the PDF becomes clickable', fr: '🔤 Reconnaître le texte — le PDF devient cliquable', ru: '🔤 Распознать текст — PDF станет кликабельным' },
    scanOcrLang: { uk: 'Мова тексту', en: 'Text language', fr: 'Langue du texte', ru: 'Язык текста' },
    scanOcrBusy: { uk: 'Розпізнавання тексту {n} з {total}…', en: 'Recognising text {n} of {total}…', fr: 'Reconnaissance du texte {n} sur {total}…', ru: 'Распознавание текста {n} из {total}…' },
    scanOcrFailed: { uk: 'Текст не розпізнано — PDF буде без нього.', en: 'Text was not recognised — the PDF will be without it.', fr: 'Texte non reconnu — le PDF sera sans texte.', ru: 'Текст не распознан — PDF будет без него.' },
    scanJpgOne: { uk: 'JPG · усі сторінки одним зображенням', en: 'JPG · all pages as one image', fr: 'JPG · toutes les pages en une image', ru: 'JPG · все страницы одним изображением' },
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
    scanFilterDoc: { uk: 'Кольоровий', en: 'Colour', fr: 'Couleur', ru: 'Цветной' },
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

// Фото зменшується до SCAN_WORK_SIDE перед обробкою (аркуш на фото 12 МП лишається ~250 dpi для A4), готова сторінка —
// до SCAN_OUT_SIDE (A4 при ~280 dpi). На телефоні з малою пам'яттю (navigator.deviceMemory ≤ 4 ГБ) — менше: повнорозмірне
// фото, вирівняна копія й маски разом займають сотні МБ, і браузер на другому-третьому фото серії відмовляв у полотні.
// Телефон теж: власник (2026-11-01) — «сканер лягає, коли додати багато фото». Android повідомляє deviceMemory до 8 ГБ навіть
// на телефоні, де вкладці дістається кілька сотень МБ, а в режимі «версія для комп'ютера» ще й видає себе за Linux; тож
// дотиковий екран із грубим вказівником — теж «мало пам'яті». 2600 px — це ~220 dpi для A4, розпізнавання бере 2200.
const SCAN_LOW_MEMORY = typeof navigator !== 'undefined' && ((navigator.deviceMemory > 0 && navigator.deviceMemory <= 4)
    || (navigator.maxTouchPoints > 0 && typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches));
const SCAN_WORK_SIDE = SCAN_LOW_MEMORY ? 3000 : 4000;
const SCAN_OUT_SIDE = SCAN_LOW_MEMORY ? 2600 : 3300;   // A4 при ~220 dpi — для друку й читання досить
const SCAN_FILTERS = [['doc', 'scanFilterDoc'], ['bw', 'scanFilterBw'], ['gray', 'scanFilterGray'], ['orig', 'scanFilterOrig']];
const SCAN_FORMATS = [['pdf-a4', 'scanPdfA4'], ['pdf-letter', 'scanPdfLetter'], ['pdf-fit', 'scanPdfFit'], ['jpg', 'scanJpg'], ['jpg-one', 'scanJpgOne'], ['png', 'scanPng']];
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
// Краї аркуша. На зменшеній копії (до 320 px) будуються дві маски: «світліше за поріг Оцу» (білий аркуш на темному) і
// «колір не як у тла» (тло — медіана рамки кадру; аркуш на світлому, сірому чи візерунчастому столі). Для кожної маски
// найбільша пляма → її опукла оболонка → чотирикутник найбільшої площі на ній (так кути правильні й для аркуша, повернутого
// на 45°) → кожна сторона уточнюється прямою за точками краю плями між кутами, кути — перетини цих прямих (кут, перекритий
// пальцем чи загнутий, відновлюється продовженням сторін). Перемагає маска, чия пляма найкраще заповнює свій чотирикутник.
// Нічого схожого на аркуш (менше 15% кадру, майже весь кадр, неправильна форма) — усе фото, кути читач підправить сам.
function scanDetectCorners(canvas) {
    const k = Math.min(1, 320 / Math.max(canvas.width, canvas.height));
    const w = Math.max(8, Math.round(canvas.width * k)), h = Math.max(8, Math.round(canvas.height * k)), n = w * h;
    const small = document.createElement('canvas'); small.width = w; small.height = h;
    const sctx = small.getContext('2d', { willReadFrequently: true });
    sctx.filter = 'blur(1.5px)'; sctx.drawImage(canvas, 0, 0, w, h);
    const rgb = sctx.getImageData(0, 0, w, h).data; small.width = 0;
    const lum = scanLuma(rgb, n);
    // тло: медіана кожного каналу в рамці шириною 3% кадру
    const ring = Math.max(2, Math.round(Math.min(w, h) * .03)), chans = [[], [], []];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (x >= ring && x < w - ring && y >= ring && y < h - ring) continue;
        const j = (y * w + x) * 4; chans[0].push(rgb[j]); chans[1].push(rgb[j + 1]); chans[2].push(rgb[j + 2]);
    }
    const bgc = chans.map(c => c.sort((a, b) => a - b)[c.length >> 1]);
    const dist = new Uint8ClampedArray(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) dist[i] = (Math.abs(rgb[j] - bgc[0]) + Math.abs(rgb[j + 1] - bgc[1]) + Math.abs(rgb[j + 2] - bgc[2])) / 2;
    // третя маска: світліше за тло (білий аркуш на світлому столі, де темні візерунки столу заважають масці кольору)
    const bgl = (bgc[0] * 77 + bgc[1] * 150 + bgc[2] * 29) >> 8, brighter = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) brighter[i] = Math.max(0, lum[i] - bgl) * 3;
    let best = null;
    for (const values of [lum, dist, brighter]) {
        const thr = scanOtsu(values);
        const mask = new Uint8Array(n); for (let i = 0; i < n; i++) mask[i] = values[i] > thr ? 1 : 0;
        const quad = scanQuadFromMask(scanOpen(mask, w, h, 2), w, h);
        if (quad && (!best || quad.fill > best.fill)) best = quad;
    }
    if (!best || best.fill < .8) return SCAN_FULL.map(c => c.slice());
    const corners = best.corners.map(([x, y]) => [Math.min(1, Math.max(0, (x + .5) / w)), Math.min(1, Math.max(0, (y + .5) / h))]);
    return scanQuadArea(corners) < 0.15 || scanQuadArea(corners) > 0.97 ? SCAN_FULL.map(c => c.slice()) : corners;
}
function scanOtsu(values) {
    const hist = new Array(256).fill(0); for (const v of values) hist[v]++;
    const total = values.length;
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, thr = 128;
    for (let i = 0; i < 256; i++) {
        wB += hist[i]; if (!wB) continue;
        const wF = total - wB; if (!wF) break;
        sumB += i * hist[i];
        const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
        if (between > best) { best = between; thr = i; }
    }
    return thr;
}
// Морфологічне «відкриття» (стиснути на r пікселів, потім розширити назад): тонкі ланцюжки плям столу, що зливаються з
// аркушем, і дрібні цятки зникають, а великий аркуш лишається того самого розміру.
function scanOpen(mask, w, h, r) {
    let cur = mask;
    // спершу «закриття» (розширити, стиснути): рядки тексту, що на зменшеній копії тонші за проміжки, не розрізають аркуш на смуги
    for (const keep of [0, 1, 1, 0]) for (let pass = 0; pass < r; pass++) {
        const next = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const p = y * w + x;
            const nb = [cur[p], x > 0 ? cur[p - 1] : keep, x < w - 1 ? cur[p + 1] : keep, y > 0 ? cur[p - w] : keep, y < h - 1 ? cur[p + w] : keep];
            next[p] = keep ? (nb.every(v => v) ? 1 : 0) : (nb.some(v => v) ? 1 : 0);
        }
        cur = next;
    }
    return cur;
}
// Найбільша пляма маски → {corners у пікселях зменшеної копії, fill = площа плями / площа чотирикутника}.
function scanQuadFromMask(mask, w, h) {
    const thr = 0, values = mask;
    const n = w * h, label = new Int32Array(n), stack = [];
    let bestId = 0, bestSize = 0, id = 0;
    for (let p = 0; p < n; p++) {
        if (label[p] || values[p] <= thr) continue;
        id++; let size = 0; label[p] = id; stack.push(p);
        while (stack.length) {
            const q = stack.pop(); size++;
            const x = q % w, y = (q - x) / w;
            if (x > 0 && !label[q - 1] && values[q - 1] > thr) { label[q - 1] = id; stack.push(q - 1); }
            if (x < w - 1 && !label[q + 1] && values[q + 1] > thr) { label[q + 1] = id; stack.push(q + 1); }
            if (y > 0 && !label[q - w] && values[q - w] > thr) { label[q - w] = id; stack.push(q - w); }
            if (y < h - 1 && !label[q + w] && values[q + w] > thr) { label[q + w] = id; stack.push(q + w); }
        }
        if (size > bestSize) { bestSize = size; bestId = id; }
    }
    if (!bestId || bestSize < n * 0.12 || bestSize > n * 0.985) return null;
    // Край плями: крайні ліва й права точки кожного рядка та верхня й нижня кожного стовпця (дірки від тексту всередині не заважають).
    const edge = [], top = new Int32Array(w).fill(-1), bot = new Int32Array(w).fill(-1);
    for (let y = 0; y < h; y++) {
        let l = -1, r = -1;
        for (let x = 0; x < w; x++) if (label[y * w + x] === bestId) { if (l < 0) l = x; r = x; if (top[x] < 0) top[x] = y; bot[x] = y; }
        if (l >= 0) { edge.push([l, y]); if (r !== l) edge.push([r, y]); }
    }
    for (let x = 0; x < w; x++) if (top[x] >= 0) { edge.push([x, top[x]]); if (bot[x] !== top[x]) edge.push([x, bot[x]]); }
    const hull = scanHull(edge);
    if (hull.length < 4) return null;
    const pts = hull.length > 90 ? hull.filter((_, i) => i % Math.ceil(hull.length / 90) === 0) : hull;
    const m = pts.length, area = (a, b, c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    let bestQ = null, bestA = -1;
    for (let i = 0; i < m; i++) for (let kk = i + 2; kk < m; kk++) {
        let a1 = -1, j1 = -1, a2 = -1, l2 = -1;
        for (let j = i + 1; j < kk; j++) { const a = area(pts[i], pts[j], pts[kk]); if (a > a1) { a1 = a; j1 = j; } }
        for (let l = kk + 1; l < m + i; l++) { const a = area(pts[kk], pts[l % m], pts[i]); if (a > a2) { a2 = a; l2 = l % m; } }
        if (j1 >= 0 && l2 >= 0 && a1 + a2 > bestA) { bestA = a1 + a2; bestQ = [pts[i], pts[j1], pts[kk], pts[l2]]; }
    }
    if (!bestQ || bestA <= 0) return null;
    // Порядок ЛВ, ПВ, ПН, ЛН: за кутом навколо центру, починаючи з найближчого до лівого верхнього кута кадру.
    const cx = bestQ.reduce((s, p) => s + p[0], 0) / 4, cy = bestQ.reduce((s, p) => s + p[1], 0) / 4;
    let quad = bestQ.slice().sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
    const start = quad.reduce((bi, p, i, q) => (p[0] + p[1] < q[bi][0] + q[bi][1] ? i : bi), 0);
    quad = [0, 1, 2, 3].map(i => quad[(start + i) % 4]);
    quad = scanRefineQuad(quad, edge) || quad;
    // Пляма на весь кадр — це світлий стіл, а не аркуш: хай вирішує інша маска.
    if (scanQuadArea(quad) > n * 0.9) return null;
    return { corners: quad, fill: bestSize / Math.max(1, scanQuadArea(quad)) };
}
function scanHull(points) {
    const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
}
// Кожна сторона — пряма найменших квадратів через точки краю поблизу відрізка між кутами (середні 80% довжини, щоб
// заокруглений чи перекритий кут її не тягнув); кути — перетини сусідніх прямих. Невдалий перетин — null (лишаються кути оболонки).
function scanRefineQuad(quad, edge) {
    const lines = [];
    for (let s = 0; s < 4; s++) {
        const a = quad[s], b = quad[(s + 1) % 4], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        if (len < 4) return null;
        const ux = dx / len, uy = dy / len, tol = Math.max(2, len * .03);
        let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, cnt = 0;
        for (const [x, y] of edge) {
            const tpos = ((x - a[0]) * ux + (y - a[1]) * uy) / len, d = Math.abs((x - a[0]) * uy - (y - a[1]) * ux);
            if (tpos < .1 || tpos > .9 || d > tol) continue;
            sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; cnt++;
        }
        if (cnt < 6) return null;
        const mx = sx / cnt, my = sy / cnt, cxx = sxx / cnt - mx * mx, cyy = syy / cnt - my * my, cxy = sxy / cnt - mx * my;
        const ang = .5 * Math.atan2(2 * cxy, cxx - cyy);   // напрям прямої (головна вісь)
        lines.push([mx, my, Math.cos(ang), Math.sin(ang)]);
    }
    const out = [];
    for (let s = 0; s < 4; s++) {
        const [x1, y1, dx1, dy1] = lines[(s + 3) % 4], [x2, y2, dx2, dy2] = lines[s];
        const den = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(den) < 1e-3) return null;
        const tt = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / den, p = [x1 + tt * dx1, y1 + tt * dy1];
        if (scanDist(p, quad[s]) > 25) return null;   // перетин далеко від кута оболонки — сторону знайдено погано
        out.push(p);
    }
    return out;
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
// Читаються лише пікселі прямокутника навколо аркуша (не все фото), а з release полотно фото звільняється одразу після
// цього: раніше фото, його повна копія в пам'яті JS і вирівняна сторінка жили водночас — найвищий пік пам'яті сканера.
function scanWarp(canvas, corners, release = false) {
    const quad = corners.map(([x, y]) => [x * canvas.width, y * canvas.height]);
    let ow = Math.max(scanDist(quad[0], quad[1]), scanDist(quad[3], quad[2]));
    let oh = Math.max(scanDist(quad[0], quad[3]), scanDist(quad[1], quad[2]));
    const k = Math.min(1, SCAN_OUT_SIDE / Math.max(ow, oh));
    ow = Math.max(16, Math.round(ow * k)); oh = Math.max(16, Math.round(oh * k));
    const H = scanHomography(ow, oh, quad);
    const bx = Math.max(0, Math.floor(Math.min(...quad.map(q => q[0]))) - 1), by = Math.max(0, Math.floor(Math.min(...quad.map(q => q[1]))) - 1);
    const sw = Math.min(canvas.width, Math.ceil(Math.max(...quad.map(q => q[0]))) + 2) - bx, sh = Math.min(canvas.height, Math.ceil(Math.max(...quad.map(q => q[1]))) + 2) - by;
    const src = canvas.getContext('2d', { willReadFrequently: true }).getImageData(bx, by, Math.max(1, sw), Math.max(1, sh)).data;
    if (release) canvas.width = canvas.height = 0;
    const out = new ImageData(ow, oh), d = out.data;
    for (let v = 0, o = 0; v < oh; v++) {
        for (let u = 0; u < ow; u++, o += 4) {
            const z = H[6] * u + H[7] * v + 1;
            let x = (H[0] * u + H[1] * v + H[2]) / z - .5 - bx, y = (H[3] * u + H[4] * v + H[5]) / z - .5 - by;   // у вирізаному прямокутнику
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
    // Максимум ще й серед сусідів (±3 клітинки, ≈⅙ сторінки): печатка, маркер чи фото на сторінці більші за клітинку, і без
    // цього їх самих було б узято за «папір» — кольори вибілювалися б (червона печатка ставала рожевою).
    const R = 3, wide = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
        let m = 0;
        for (let yy = Math.max(0, gy - R); yy <= Math.min(gh - 1, gy + R); yy++) for (let xx = Math.max(0, gx - R); xx <= Math.min(gw - 1, gx + R); xx++) if (grid[yy * gw + xx] > m) m = grid[yy * gw + xx];
        wide[gy * gw + gx] = m;
    }
    grid = wide;
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
// «Кольоровий» (filter 'doc'): колір кожної точки ділиться на яскравість паперу навколо неї — тіні й жовтизна зникають, фон стає білим,
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
// release: source більше не потрібне (додавання фото) — його полотно звільняється, щойно пікселі аркуша прочитано.
async function scanRender(page, source = null, release = false) {
    const canvas = source || await scanLoad(page.file, SCAN_WORK_SIDE);
    try {
        const out = scanRotate(scanFilter(scanWarp(canvas, page.corners, release || !source), page.filter), page.rotation);
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
    const push = chunk => { const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk; parts.push(bytes); length += bytes instanceof Blob ? bytes.size : bytes.length; };
    const obj = (num, body) => { offsets[num] = length; push(`${num} 0 obj\n`); for (const b of [].concat(body)) push(b); push('\nendobj\n'); };
    const f = n => (Math.round(n * 100) / 100).toString();
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    // 3–6: невидимий шрифт текстового шару (якщо текст розпізнано): Type0 / Identity-H, код символу = його UTF-16, ToUnicode
    // повертає ті самі коди — PDF.js і будь-яка читалка дістають з нього текст, тож слова клікабельні й шукаються.
    const FIRST = 7, kids = pages.map((_, i) => `${FIRST + i * 3} 0 R`).join(' ');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
    obj(3, '<< /Type /Font /Subtype /Type0 /BaseFont /GlyphLessFont /Encoding /Identity-H /DescendantFonts [4 0 R] /ToUnicode 6 0 R >>');
    obj(4, '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /GlyphLessFont /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 5 0 R /DW 500 /CIDToGIDMap /Identity >>');
    obj(5, '<< /Type /FontDescriptor /FontName /GlyphLessFont /Flags 5 /FontBBox [0 -200 500 800] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 >>');
    const ranges = [];
    for (let hi = 0; hi < 256; hi++) { if (hi >= 0xd8 && hi <= 0xdf) continue; const h = hi.toString(16).padStart(2, '0').toUpperCase(); ranges.push(`<${h}00> <${h}FF> <${h}00>`); }
    let bf = '';
    for (let i = 0; i < ranges.length; i += 100) { const chunk = ranges.slice(i, i + 100); bf += `${chunk.length} beginbfrange\n${chunk.join('\n')}\nendbfrange\n`; }   // не більше 100 в одному блоці
    const cmap = '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n'
        + '/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' + bf
        + 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
    obj(6, [`<< /Length ${cmap.length} >>\nstream\n`, cmap, '\nendstream']);
    const hex = text => { let h = ''; for (const ch of text) { const c = ch.codePointAt(0); if (c <= 0xffff && (c < 0xd800 || c > 0xdfff)) h += c.toString(16).padStart(4, '0'); } return h; };
    for (let i = 0; i < pages.length; i++) {
        const p = pages[i], num = FIRST + i * 3, landscape = p.w > p.h * 1.05;   // майже квадратна сторінка — книжкова
        let W, H, margin;
        if (paper === 'fit') { const k = 841.89 / Math.max(p.w, p.h); W = p.w * k; H = p.h * k; margin = 0; }
        else { const [a, b] = paper === 'letter' ? [612, 792] : [595.28, 841.89]; [W, H] = landscape ? [b, a] : [a, b]; margin = 18; }
        const k = Math.min((W - 2 * margin) / p.w, (H - 2 * margin) / p.h), dw = p.w * k, dh = p.h * k, ox = (W - dw) / 2, oy = (H - dh) / 2;
        let content = `q ${f(dw)} 0 0 ${f(dh)} ${f(ox)} ${f(oy)} cm /Im0 Do Q`;
        // Невидимий текст (режим 3) точно над словами картинки: висота шрифту — висота рядка, ширина — розтягом Tz.
        const words = p.ocr && p.ocr.out === p.out ? p.ocr.words : [];
        if (words.length) {
            content += '\nBT 3 Tr';
            for (const wd of words) {
                const code = hex(wd.t); if (!code) continue;
                const fs = Math.max(1, (wd.ly1 - wd.ly0) * k), width = (wd.x1 - wd.x0) * k, natural = code.length / 4 * 0.5 * fs;
                const x = ox + wd.x0 * k, y = oy + dh - wd.ly1 * k + fs * 0.2;
                content += `\n/F1 ${f(fs)} Tf ${f(Math.max(1, 100 * width / natural))} Tz 1 0 0 1 ${f(x)} ${f(y)} Tm <${code}> Tj`;
            }
            content += '\nET';
        }
        // Сам Blob сторінки, а не його копія в пам'яті JS: на 30 сторінках це десятки МБ, і разом з готовим PDF — вдвічі більше.
        const jpeg = p.out;
        const fonts = words.length ? ' /Font << /F1 3 0 R >>' : '';
        obj(num, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /Resources << /XObject << /Im0 ${num + 2} 0 R >>${fonts} >> /Contents ${num + 1} 0 R >>`);
        obj(num + 1, [`<< /Length ${content.length} >>\nstream\n`, content, '\nendstream']);
        obj(num + 2, [`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.size} >>\nstream\n`, jpeg, '\nendstream']);
    }
    const info = FIRST + pages.length * 3;
    obj(info, '<< /Producer (AI E-book Reader scanner) >>');
    const xref = length;
    push(`xref\n0 ${info + 1}\n0000000000 65535 f \n`);
    for (let i = 1; i <= info; i++) push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    push(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
}

// ---------- розпізнавання тексту (Tesseract, на пристрої) ----------
// Щоб PDF зі сканера був клікабельним, як книги з текстовим шаром: кожна сторінка розпізнається, і слова з їхніми рамками
// лягають у PDF невидимим текстом. Бібліотека й мовні дані — у vendor/tesseract-7.0.0 (завантажуються лише тут), фото
// нікуди не надсилаються. Результат кешується на сторінці, поки її зображення (page.out) те саме.
const SCAN_OCR_DIR = 'vendor/tesseract-7.0.0/', SCAN_OCR_SIDE = 2200;
const SCAN_OCR_LANGS = [['fra', 'Français'], ['eng', 'English'], ['ukr', 'Українська'], ['deu', 'Deutsch'], ['spa', 'Español']];
let scanOcrScript = null, scanOcrWorker = null, scanOcrWorkerLang = '';
function scanLoadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    if (!scanOcrScript) scanOcrScript = new Promise((resolve, reject) => {
        const el = document.createElement('script'); el.src = SCAN_OCR_DIR + 'tesseract.min.js';
        el.onload = resolve; el.onerror = () => { scanOcrScript = null; el.remove(); reject(new Error('ocr script')); };
        document.head.append(el);
    });
    return scanOcrScript;
}
// SIMD у WebAssembly (той самий байт-код перевірки, що в wasm-feature-detect): з ним розпізнавання помітно швидше.
function scanWasmSimd() {
    try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); }
    catch (e) { return false; }
}
async function scanOcrWorkerFor(lang) {
    await scanLoadTesseract();
    if (scanOcrWorker && scanOcrWorkerLang === lang) return scanOcrWorker;
    if (scanOcrWorker) { try { await scanOcrWorker.terminate(); } catch (e) {} scanOcrWorker = null; }
    const base = new URL(SCAN_OCR_DIR, document.baseURI).href;
    scanOcrWorker = await window.Tesseract.createWorker(lang, 1, {
        workerPath: base + 'worker.min.js', corePath: base + (scanWasmSimd() ? 'tesseract-core-simd-lstm.js' : 'tesseract-core-lstm.js'),
        langPath: base + 'lang', gzip: true, workerBlobURL: false
    });
    scanOcrWorkerLang = lang;
    return scanOcrWorker;
}
function scanOcrLangDefault() {
    const map = { uk: 'ukr', fr: 'fra', en: 'eng', de: 'deu', es: 'spa' };
    return map[state.bookLangMeta] || map[state.uiLang] || 'eng';
}
// Слова сторінки з рамками в пікселях page.out; висота кожного слова — висота його рядка (рівний текстовий шар).
async function scanOcrPage(page, lang) {
    if (page.ocr && page.ocr.out === page.out && page.ocr.lang === lang) return;
    const worker = await scanOcrWorkerFor(lang);
    // Розпізнається зменшена копія (довша сторона до SCAN_OCR_SIDE, ~200 dpi для A4): текст читається так само, а на
    // телефоні це в кілька разів швидше й легше для пам'яті, ніж сторінка 3300 px. Рамки слів множаться назад.
    let image = page.out, back = 1;
    const k = SCAN_OCR_SIDE / Math.max(page.w, page.h);
    if (k < 1) {
        const bitmap = await createImageBitmap(page.out), canvas = document.createElement('canvas');
        canvas.width = Math.round(page.w * k); canvas.height = Math.round(page.h * k);
        const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
        try { image = await scanBlob(canvas, 'image/jpeg', 0.9); } finally { canvas.width = canvas.height = 0; }
        back = page.w / Math.round(page.w * k);
    }
    const { data } = await worker.recognize(image, {}, { blocks: true, text: false });
    const words = [];
    for (const block of data.blocks || []) for (const para of block.paragraphs || []) for (const line of para.lines || []) for (const w of line.words || []) {
        const text = (w.text || '').trim();
        if (!text || w.confidence < 20) continue;
        words.push({ t: text, x0: w.bbox.x0 * back, y0: w.bbox.y0 * back, x1: w.bbox.x1 * back, y1: w.bbox.y1 * back, ly0: line.bbox.y0 * back, ly1: line.bbox.y1 * back });
    }
    page.ocr = { out: page.out, lang, words };
}
// Пам'ять WebAssembly розпізнавача лише росте й назад не віддається, тож на довгій серії робітник перезапускається кожні
// SCAN_OCR_RECYCLE сторінок, а після останньої — закривається (наступний експорт підніме його знову за секунду-дві).
const SCAN_OCR_RECYCLE = 8;
async function scanOcrStop() {
    const worker = scanOcrWorker; scanOcrWorker = null; scanOcrWorkerLang = '';
    if (worker) { try { await worker.terminate(); } catch (e) {} }
}
async function scanOcrAll(lang) {
    const pages = scanState.pages;
    try {
        for (let i = 0, done = 0; i < pages.length; i++) {
            scanStatus(t('scanOcrBusy').replace('{n}', i + 1).replace('{total}', pages.length));
            if (pages[i].ocr && pages[i].ocr.out === pages[i].out && pages[i].ocr.lang === lang) continue;
            if (done && done % SCAN_OCR_RECYCLE === 0) await scanOcrStop();
            // сторінка, яку не вдалося розпізнати, лишається без тексту; решта розпізнається далі
            try { await scanOcrPage(pages[i], lang); done++; } catch (e) { if (i === 0 && !window.Tesseract) throw e; }
        }
    } finally { await scanOcrStop(); }
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
// Усі сторінки одним довгим зображенням (одна під одною, однакової ширини, з тонким проміжком). Висота обмежена тим,
// що браузер ще може намалювати (SCAN_STITCH_MAX_SIDE): якщо сторінок багато, вони зменшуються.
const SCAN_STITCH_MAX_SIDE = 16000, SCAN_STITCH_MAX_PIXELS = 64e6;
async function scanStitch(pages) {
    const gap = 24;
    let width = Math.min(2000, Math.max(...pages.map(p => p.w)));
    const heightAt = w => pages.reduce((s, p) => s + Math.round(p.h * w / p.w), 0) + gap * (pages.length - 1);
    while (width > 300 && (heightAt(width) > SCAN_STITCH_MAX_SIDE || heightAt(width) * width > SCAN_STITCH_MAX_PIXELS)) width = Math.floor(width * .9);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = heightAt(width);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    let y = 0;
    for (const p of pages) {
        const bitmap = await createImageBitmap(p.out), h = Math.round(p.h * width / p.w);
        ctx.drawImage(bitmap, 0, y, width, h); bitmap.close(); y += h + gap;
    }
    try { return await scanBlob(canvas, 'image/jpeg', 0.88); } finally { canvas.width = 0; }
}
// Файл у вибраному форматі: PDF — один файл; JPG/PNG — одна сторінка як є, кілька — ZIP; «одним зображенням» — склеєні.
async function scanMakeFile(format) {
    const pages = scanState.pages, base = scanBaseName();
    if (format.startsWith('pdf')) return new File([await scanBuildPdf(pages, format.slice(4))], base + '.pdf', { type: 'application/pdf' });
    if (format === 'jpg-one') return new File([pages.length === 1 ? pages[0].out : await scanStitch(pages)], base + '.jpg', { type: 'image/jpeg' });
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
    const shoot = scanButton('scanCamera', () => camera.click(), 'btn-primary'); shoot.id = 'scan-shoot';
    add.append(shoot, scanButton('scanGallery', () => gallery.click()), camera, gallery);
    // Фото можна й перетягнути у вікно чи вставити (Ctrl+V) — усі одразу стають сторінками.
    modal.addEventListener('dragover', e => { if ([...(e.dataTransfer?.items || [])].some(i => i.kind === 'file')) { e.preventDefault(); modal.classList.add('scan-dropping'); } });
    modal.addEventListener('dragleave', e => { if (e.target === modal) modal.classList.remove('scan-dropping'); });
    modal.addEventListener('drop', e => {
        e.preventDefault(); modal.classList.remove('scan-dropping');
        const files = [...(e.dataTransfer?.files || [])].filter(f => /^image\//.test(f.type));
        if (files.length && !scanState.edit) scanAddFiles(files, false);
    });
    document.addEventListener('paste', e => {
        if (!scanIsOpen() || scanState.edit) return;
        const files = [...(e.clipboardData?.files || [])].filter(f => /^image\//.test(f.type));
        if (files.length) { e.preventDefault(); scanAddFiles(files, false); }
    });
    // Один фільтр на всі сторінки серії одним натиском.
    const allRow = document.createElement('div'); allRow.className = 'scan-row scan-all'; allRow.id = 'scan-all';
    const allLabel = document.createElement('span'); allLabel.dataset.i18n = 'scanAllFilter';
    allRow.append(allLabel);
    for (const [value, key] of SCAN_FILTERS) {
        const b = scanButton(key, () => scanFilterAll(value), 'scan-all-filter'); b.dataset.filter = value; allRow.append(b);
    }
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
    const ocrRow = document.createElement('label'); ocrRow.className = 'scan-ocr'; ocrRow.id = 'scan-ocr-row';
    const ocr = document.createElement('input'); ocr.type = 'checkbox'; ocr.id = 'scan-ocr';
    ocr.checked = (() => { try { return localStorage.getItem('reader_scan_ocr') !== '0'; } catch (e) { return true; } })();
    ocr.addEventListener('change', () => scanStore('reader_scan_ocr', ocr.checked ? '1' : '0'));
    const ocrText = document.createElement('span'); ocrText.dataset.i18n = 'scanOcr';
    const ocrLang = document.createElement('select'); ocrLang.id = 'scan-ocr-lang'; ocrLang.dataset.i18nTitle = 'scanOcrLang';
    for (const [value, name] of SCAN_OCR_LANGS) { const o = document.createElement('option'); o.value = value; o.textContent = name; ocrLang.append(o); }
    ocrLang.value = scanStored('reader_scan_ocr_lang', scanOcrLangDefault(), SCAN_OCR_LANGS);
    ocrLang.addEventListener('change', () => scanStore('reader_scan_ocr_lang', ocrLang.value));
    ocrRow.append(ocr, ocrText, ocrLang);
    const syncOcr = () => { ocrRow.hidden = !format.value.startsWith('pdf'); };
    format.addEventListener('change', syncOcr); syncOcr();
    out.append(allRow, format, ocrRow, actions);
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
            // Збій одного фото (браузеру забракло пам'яті на полотно, файл зіпсований) — лише це фото пропускається, решта серії
            // обробляється далі; раніше виняток виривав увесь цикл, і з кількох вибраних фото додавалось одне або жодного.
            try { page.corners = scanDetectCorners(source); await scanRender(page, source, true); }
            catch (e) { failed.push(files[i].name || '?'); continue; }
            finally { source.width = source.height = 0; }
            scanState.pages.push(page); added.push(page);
            scanRenderList();
            await new Promise(r => setTimeout(r, 30));   // між фото браузер встигає звільнити пам'ять попереднього
        }
    } finally { scanState.busy = false; }
    scanStatus(failed.length ? t('scanBadImage').replace('{name}', failed.join(', ')) : '');
    scanRenderList();
    // Серія: після знімка — одразу «📷 Наступна сторінка», без редактора (краї знаходяться самі, кожну сторінку можна
    // відкрити з її картки). Редактор відкривається лише тоді, коли аркуша на фото не знайдено.
    if (fromCamera && added.length === 1 && added[0].corners.every((c, i) => c[0] === SCAN_FULL[i][0] && c[1] === SCAN_FULL[i][1])) scanOpenEditor(added[0]);
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
    const shoot = scanEl('scan-shoot'); if (shoot) { shoot.dataset.i18n = has ? 'scanCameraNext' : 'scanCamera'; shoot.textContent = t(shoot.dataset.i18n); }
    const common = has && scanState.pages.every(p => p.filter === scanState.pages[0].filter) ? scanState.pages[0].filter : '';
    for (const b of document.querySelectorAll('#scan-all .scan-all-filter')) b.classList.toggle('active', b.dataset.filter === common);
    scanEl('scan-empty').hidden = has;
    scanEl('scan-out').hidden = !has;
    if (has && !scanState.busy && !scanEl('scan-status').textContent) scanStatus(t('scanPages').replace('{n}', scanState.pages.length));
}
async function scanFilterAll(filter) {
    if (!scanState.pages.length || scanState.edit) return;
    while (scanState.busy) await new Promise(r => setTimeout(r, 100));
    scanState.busy = true; scanStore('reader_scan_filter', filter);
    const todo = scanState.pages.filter(p => p.filter !== filter);
    try {
        for (let i = 0; i < todo.length; i++) {
            scanStatus(t('scanProcessing').replace('{n}', i + 1).replace('{total}', todo.length));
            await new Promise(r => setTimeout(r, 0));
            todo[i].filter = filter;
            try { await scanRender(todo[i]); } catch (e) {}
            scanRenderList();
        }
    } finally { scanState.busy = false; scanStatus(''); scanRenderList(); }
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
        const target = action === 'open' && !format.startsWith('pdf') ? 'pdf-fit' : format;
        if (target.startsWith('pdf') && scanEl('scan-ocr')?.checked) {
            try { await scanOcrAll(scanEl('scan-ocr-lang').value); }
            catch (e) { scanStatus(t('scanOcrFailed')); await new Promise(r => setTimeout(r, 1200)); }   // PDF буде, лише без тексту
        }
        const file = await scanMakeFile(target);
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
