// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
/* «Мої книги»: кожна відкрита книга (з бібліотеки чи з пристрою) зберігається на пристрої в IndexedDB, щоб не губитися,
 * коли Android вивантажує застосунок із фону чи його закривають: раніше зберігалась лише позиція читання, а сам файл жив
 * у пам'яті сторінки — книгу з бібліотеки доводилося шукати й завантажувати знову. Ключ запису = state.bookKey (назва +
 * розмір + lastModified), тож відкрита звідси книга продовжується з тієї самої сторінки. Книги та документи зі сканера
 * мають окремі списки й обсяги зберігання; ліміт SHELF_MAX_BOOKS стосується лише книг. */
Object.assign(I18N, {
    myBooksLabel: { uk: 'Мої книги', en: 'My books', fr: 'Mes livres', ru: 'Мои книги', es: 'Mis libros', zh: '我的书', ko: '내 책', hi: 'मेरी किताबें', ga: 'Mo leabhair' },
    tMyBooks: { uk: 'Книги, які ви вже відкривали (збережені на цьому пристрої)', en: 'Books you have opened before (kept on this device)', fr: 'Les livres déjà ouverts (gardés sur cet appareil)',
                ru: 'Книги, которые вы уже открывали (сохранены на этом устройстве)', es: 'Libros que ya abriste (guardados en este dispositivo)' },
    shelfSource: { uk: '📖 Мої книги', en: '📖 My books', fr: '📖 Mes livres', ru: '📖 Мои книги', es: '📖 Mis libros' },
    shelfRecent: { uk: 'Нещодавні книги', en: 'Recent books', fr: 'Livres récents', ru: 'Недавние книги', es: 'Libros recientes' },
    shelfEmpty: { uk: 'Тут з’являться книги, які ви відкривали: вони зберігаються на пристрої.', en: 'Books you open will appear here: they are kept on this device.',
                  fr: 'Les livres que vous ouvrez apparaîtront ici : ils sont conservés sur cet appareil.', ru: 'Здесь появятся книги, которые вы открывали: они хранятся на устройстве.',
                  es: 'Aquí aparecerán los libros que abras: se guardan en este dispositivo.' },
    shelfNote: { uk: 'Книги збережено на цьому пристрої (найбільше {n}); найдавніші видаляються самі.', en: 'Books are kept on this device (up to {n}); the oldest are removed automatically.',
                 fr: 'Les livres sont conservés sur cet appareil (jusqu’à {n}) ; les plus anciens sont supprimés automatiquement.', ru: 'Книги хранятся на этом устройстве (до {n}); самые старые удаляются сами.',
                 es: 'Los libros se guardan en este dispositivo (hasta {n}); los más antiguos se eliminan solos.' },
    shelfCollections: { uk: 'Збережене на пристрої', en: 'Saved on this device', fr: 'Sur cet appareil', ru: 'Сохранено на устройстве', es: 'Guardado en este dispositivo', zh: '本机保存', ko: '기기에 저장됨', hi: 'डिवाइस पर सहेजा गया', ga: 'Sábháilte ar an ngléas' },
    shelfScans: { uk: 'Скани', en: 'Scans', fr: 'Numérisations', ru: 'Сканы', es: 'Escaneos', zh: '扫描件', ko: '스캔', hi: 'स्कैन', ga: 'Scananna' },
    shelfScansEmpty: { uk: 'Тут з’являться документи, які ви відкрили зі сканера.', en: 'Documents you open from the scanner will appear here.', fr: 'Les documents ouverts depuis le scanner apparaîtront ici.', ru: 'Здесь появятся документы, открытые из сканера.', es: 'Aquí aparecerán los documentos que abras desde el escáner.', zh: '从扫描仪打开的文档将显示在这里。', ko: '스캐너에서 연 문서가 여기에 표시됩니다.', hi: 'स्कैनर से खोले गए दस्तावेज़ यहाँ दिखेंगे।', ga: 'Beidh cáipéisí a osclaíonn tú ón scanóir anseo.' },
    shelfScansNote: { uk: 'Скани збережено окремо (до 600 МБ); найдавніші видаляються автоматично.', en: 'Scans are kept separately (up to 600 MB); the oldest are removed automatically.', fr: 'Les numérisations sont conservées séparément (600 Mo maximum) ; les plus anciennes sont supprimées automatiquement.', ru: 'Сканы хранятся отдельно (до 600 МБ); самые старые удаляются автоматически.', es: 'Los escaneos se guardan por separado (hasta 600 MB); los más antiguos se eliminan automáticamente.', zh: '扫描件单独保存（最多600 MB），最旧的会自动删除。', ko: '스캔은 별도로 최대 600MB까지 저장되며 오래된 항목부터 자동 삭제됩니다.', hi: 'स्कैन अलग रखे जाते हैं (600 MB तक); सबसे पुराने अपने आप हटा दिए जाते हैं।', ga: 'Coinnítear scananna ar leith (suas le 600 MB); baintear na cinn is sine go huathoibríoch.' },
    shelfFolderSaveAll: { uk: 'Зберегти всі ({n}) в папку', en: 'Save all ({n}) to a folder', fr: 'Tout enregistrer ({n}) dans un dossier', ru: 'Сохранить все ({n}) в папку', es: 'Guardar todos ({n}) en una carpeta' },
    shelfFolderName: { uk: 'Назва папки', en: 'Folder name', fr: 'Nom du dossier', ru: 'Название папки', es: 'Nombre de la carpeta' },
    shelfFolderOrOne: { uk: 'Або відкрити один файл:', en: 'Or open one file:', fr: 'Ou ouvrir un seul fichier :', ru: 'Или открыть один файл:', es: 'O abrir un solo archivo:' },
    shelfFolderFiles: { uk: '{n} файлів', en: '{n} files', fr: '{n} fichiers', ru: '{n} файлов', es: '{n} archivos' },
    shelfFolderSaved: { uk: 'Збережено {n} файлів у папку «{name}».', en: 'Saved {n} files to the folder “{name}”.', fr: '{n} fichiers enregistrés dans le dossier « {name} ».', ru: 'Сохранено {n} файлов в папку «{name}».', es: 'Se guardaron {n} archivos en la carpeta «{name}».' },
    shelfFolderBack: { uk: 'Назад до всіх книг', en: 'Back to all books', fr: 'Retour à tous les livres', ru: 'Назад ко всем книгам', es: 'Volver a todos los libros' },
    shelfFolderOpen: { uk: 'Відкрити', en: 'Open', fr: 'Ouvrir', ru: 'Открыть', es: 'Abrir' },
    shelfFolderRemove: { uk: 'Видалити папку з пристрою', en: 'Remove the folder from the device', fr: 'Supprimer le dossier de l’appareil', ru: 'Удалить папку с устройства', es: 'Quitar la carpeta del dispositivo' },
    shelfAll: { uk: 'Усі', en: 'All', fr: 'Tous', ru: 'Все', es: 'Todos' },
    shelfRemove: { uk: 'Видалити з пристрою', en: 'Remove from device', fr: 'Supprimer de l’appareil', ru: 'Удалить с устройства', es: 'Quitar del dispositivo' },
    shelfMissing: { uk: 'Цієї книги вже немає на пристрої.', en: 'This book is no longer on the device.', fr: 'Ce livre n’est plus sur l’appareil.', ru: 'Этой книги уже нет на устройстве.', es: 'Este libro ya no está en el dispositivo.' }
});
const SHELF_DB = 'reader-books', SHELF_STORE = 'books', SHELF_MAX_BOOKS = 15, SHELF_MAX_BYTES = 600 * 1024 * 1024;
// Keep the existing DB and keys: bookmarks and files survive without copying or renaming them.
const shelfScanFiles = new WeakSet();
function markShelfScan(file) { shelfScanFiles.add(file); return file; }
function shelfKind(record) {
    if (record.kind === 'book' || record.kind === 'scan') return record.kind;
    // Older scanner exports had no provenance field; only its exact generated PDF name is recognised.
    return /^scan-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/i.test(record.name || '') ? 'scan' : 'book';
}
let shelfView = 'book';
let shelfDbPromise = null;
function shelfDb() {
    if (!shelfDbPromise) shelfDbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
        const req = indexedDB.open(SHELF_DB, 1);
        req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(SHELF_STORE)) req.result.createObjectStore(SHELF_STORE, { keyPath: 'key' }); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }).catch(err => { shelfDbPromise = null; throw err; });
    return shelfDbPromise;
}
function shelfTx(mode, run) {
    return shelfDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(SHELF_STORE, mode), store = tx.objectStore(SHELF_STORE);
        let result;
        Promise.resolve(run(store, value => { result = value; })).catch(reject);
        tx.oncomplete = () => resolve(result);
        tx.onerror = tx.onabort = () => reject(tx.error);
    }));
}
const shelfReq = req => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
// Список без самих файлів (лише опис), найсвіжіші першими.
async function listShelfBooks(kind = 'book') {
    const all = await shelfTx('readonly', async (store, done) => done(await shelfReq(store.getAll())));
    return (all || []).map(({ blob, ...meta }) => ({ ...meta, kind: shelfKind(meta) }))
        .filter(b => !kind || b.kind === kind).sort((a, b) => b.openedAt - a.openedAt);
}
function shelfTitle(name) { return String(name || '').replace(/\.(epub|pdf|fb2(\.zip)?|txt|md|markdown|html?|docx|rtf)$/i, ''); }
// Обкладинка — маленький JPEG у тому самому записі: з EPUB (зображення з маніфесту, позначене як обкладинка) або перша
// сторінка PDF. Береться з уже відкритої й перевіреної книги (state.epubZip / state.pdfDoc), а не з файлу заново.
const SHELF_COVER_W = 240, SHELF_COVER_MAX_BYTES = 12 * 1024 * 1024;
async function epubCoverBlob(zip) {
    const parser = new DOMParser(), container = zip.file('META-INF/container.xml');
    if (!container) return null;
    const opfPath = parser.parseFromString(await container.async('text'), 'text/xml').getElementsByTagNameNS('*', 'rootfile')[0]?.getAttribute('full-path');
    if (!opfPath || !zip.file(opfPath)) return null;
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
    const opf = parser.parseFromString(await zip.file(opfPath).async('text'), 'text/xml');
    const items = [...opf.getElementsByTagNameNS('*', 'item')].filter(i => /^image\//i.test(i.getAttribute('media-type') || ''));
    const metaId = [...opf.getElementsByTagNameNS('*', 'meta')].find(m => m.getAttribute('name') === 'cover')?.getAttribute('content');
    const item = items.find(i => /(^|\s)cover-image(\s|$)/.test(i.getAttribute('properties') || ''))
        || items.find(i => metaId && i.getAttribute('id') === metaId)
        || items.find(i => /cover/i.test((i.getAttribute('id') || '') + ' ' + (i.getAttribute('href') || '')));
    if (!item) return null;
    const entry = zip.file(resolveEpubPath(opfDir, item.getAttribute('href').split('#')[0]));
    if (!entry || (entry._data && entry._data.uncompressedSize > SHELF_COVER_MAX_BYTES)) return null;
    const blob = await entry.async('blob');
    return blob.size <= SHELF_COVER_MAX_BYTES ? blob : null;
}
async function shrinkCover(source, w, h) {
    const scale = Math.min(1, SHELF_COVER_W / w), canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
}
async function makeShelfCover() {
    try {
        if (state.format === 'epub' && state.epubZip) {
            const raw = await epubCoverBlob(state.epubZip);
            if (!raw) return null;
            const bmp = await createImageBitmap(raw);
            try { return await shrinkCover(bmp, bmp.width, bmp.height); } finally { bmp.close && bmp.close(); }
        }
        if (state.format === 'pdf' && state.pdfDoc) {
            const page = await state.pdfDoc.getPage(1), base = page.getViewport({ scale: 1 });
            const vp = page.getViewport({ scale: SHELF_COVER_W / base.width }), canvas = document.createElement('canvas');
            canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
            try {
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
                return await shrinkCover(canvas, canvas.width, canvas.height);
            } finally {
                if (typeof pdfWantedPages !== 'undefined' && !pdfWantedPages.has(1)) { try { page.cleanup(); } catch (e) {} }
                canvas.width = canvas.height = 0;
            }
        }
    } catch (e) { /* без обкладинки картка покаже назву на кольоровому тлі */ }
    return null;
}
// Зберігає щойно відкриту книгу (або оновлює час відкриття) і витісняє найдавніші, коли їх забагато.
async function shelveBook(file, key = state.bookKey) {
    if (!file || !key) return false;
    try {
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        const old = await shelfTx('readonly', async (store, done) => done(await shelfReq(store.get(key))));
        const kind = shelfScanFiles.has(file) ? 'scan' : shelfKind(old || file);
        const cover = old && old.cover ? old.cover : (key === state.bookKey ? await makeShelfCover() : null);
        await shelfTx('readwrite', store => {
            store.put({ key, kind, name: file.name, type: file.type || '', size: file.size, lastModified: file.lastModified || 0,
                folder: old?.folder || '', series: old?.series || '', volume: old?.volume || '', issue: old?.issue || '', sourceId: old?.sourceId || '',
                ...publicationMetadata.get(file), title: old && old.folder && old.title ? old.title : shelfTitle(file.name), openedAt: Date.now(), cover: cover || null, blob: old && old.blob && old.size === file.size ? old.blob : file });
        });
        const books = (await listShelfBooks(kind)).filter(b => !b.folder);   // a folder's files are kept until the learner removes the folder
        let total = 0;
        const evict = books.filter((b, i) => { total += b.size; return (kind === 'book' && i >= SHELF_MAX_BOOKS) || (kind === 'scan' && i > 0 && total > SHELF_MAX_BYTES); });
        if (evict.length) await shelfTx('readwrite', store => { for (const b of evict) store.delete(b.key); });
        renderRecentBooks();
        return true;
    } catch (e) { showToast(t('publicationStorageFull')); return false; }
}
// Запис великого файлу (PDF на десятки МБ) не має змагатися з першим відмальовуванням книги: зберігаємо за кілька секунд,
// коли браузер вільний, і лише якщо ця книга досі відкрита.
let shelfPendingKey = null, shelfPendingFile = null;
function scheduleShelveBook(file) {
    const key = shelfPendingKey = state.bookKey;
    shelfPendingFile = file;
    const run = () => { if (shelfPendingKey === key && state.bookKey === key) { shelfPendingKey = null; shelfPendingFile = null; shelveBook(file, key); } };
    setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(run, { timeout: 5000 }) : run()), 2500);
}
// Перед тим як читач піде за посиланням (QR-код на сторінці, пошук фрагмента) — js/pdf-qr.js, js/pdf-crop.js: місце
// збережено, книга вже на полиці, а ключ книги лежить у sessionStorage цієї вкладки. Якщо, поки читач на сайті, браузер
// вивантажить вкладку (Android робить так із фоновими), після повернення книга сама відкриється на тій самій сторінці.
const READING_RETURN_KEY = 'reader_return_book', READING_RETURN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
function rememberReadingSpot() {
    if (!state.bookKey || state.demoMode) return;
    try { saveBookmark(); } catch (e) {}
    if (shelfPendingKey === state.bookKey && shelfPendingFile) { const file = shelfPendingFile; shelfPendingKey = null; shelfPendingFile = null; shelveBook(file, state.bookKey); }
    try { sessionStorage.setItem(READING_RETURN_KEY, JSON.stringify({ key: state.bookKey, at: Date.now() })); } catch (e) {}
}
function takeReadingReturn() {
    try {
        const raw = sessionStorage.getItem(READING_RETURN_KEY);
        sessionStorage.removeItem(READING_RETURN_KEY);
        const spot = raw && JSON.parse(raw);
        return spot && spot.key && Date.now() - spot.at < READING_RETURN_MAX_AGE_MS ? spot.key : null;
    } catch (e) { return null; }
}
// Повернулися без перезавантаження — книга й так на місці, позначка більше не потрібна.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.bookKey) try { sessionStorage.removeItem(READING_RETURN_KEY); } catch (e) {} });
// Вкладку перезавантажено: відкрити ту саму книгу (місце читання відновлює її закладка).
window.addEventListener('load', () => {
    const key = takeReadingReturn();
    if (key && !state.bookKey) openShelfBook(key).catch(() => {});
});
async function removeShelfBook(key) {
    if (shelfPendingKey === key) shelfPendingKey = null;   // щойно видалену книгу відкладене збереження не повертає
    try { await shelfTx('readwrite', store => { store.delete(key); }); } catch (e) {}
    renderRecentBooks();
}
async function openShelfBook(key) {
    const rec = await shelfTx('readonly', async (store, done) => done(await shelfReq(store.get(key))));
    if (!rec || !rec.blob) { showToast(t('shelfMissing')); renderRecentBooks(); return false; }
    // Ті самі name/size/lastModified → той самий state.bookKey → читання продовжується з тієї ж сторінки.
    const file = new File([rec.blob], rec.name, { type: rec.type, lastModified: rec.lastModified });
    publicationMetadata.set(file, { series: rec.series, volume: rec.volume, issue: rec.issue, sourceId: rec.sourceId });
    await openBookFile(shelfKind(rec) === 'scan' ? markShelfScan(file) : file);
    return true;
}
// Папки: файли з одного архіву лежать разом (поле folder у записі). Порожнє folder — звичайна книга.
let shelfFolder = null;
// Зберегти всі файли архіву в папку й одразу показати її.
async function shelveBundle(folder, files, titles = []) {
    const now = Date.now();
    try {
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        await shelfTx('readwrite', store => {
            files.forEach((file, i) => store.put({ key: bookKeyFor(file), kind: 'book', folder, name: file.name, type: file.type || '', size: file.size,
                lastModified: file.lastModified || 0, series: '', volume: '', issue: '', sourceId: '', title: titles[i] || shelfTitle(file.name),
                openedAt: now - i, cover: null, blob: file }));
        });
    } catch (e) { showToast(t('publicationStorageFull')); return false; }
    shelfView = 'book'; shelfFolder = folder;
    renderRecentBooks();
    showToast(t('shelfFolderSaved').replace('{n}', files.length).replace('{name}', folder));
    return true;
}
async function removeShelfFolder(folder) {
    try {
        const all = await listShelfBooks(null);
        await shelfTx('readwrite', store => { for (const b of all) if (b.folder === folder) store.delete(b.key); });
    } catch (e) {}
    if (shelfFolder === folder) shelfFolder = null;
    renderRecentBooks();
}
// Що показати: усередині папки — її файли за назвою; нагорі — книги й по одній картці на папку.
function shelfFolderView(books) {
    if (shelfFolder) {
        const inside = books.filter(b => b.folder === shelfFolder).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        if (inside.length) return { inFolder: true, items: inside.map(book => ({ book })) };
        shelfFolder = null;
    }
    const items = [], seen = new Map();
    for (const b of books) {
        if (!b.folder) { items.push({ book: b }); continue; }
        let f = seen.get(b.folder);
        if (!f) { f = { folder: b.folder, books: [] }; seen.set(b.folder, f); items.push(f); }
        f.books.push(b);
    }
    return { inFolder: false, items };
}
function shelfFolderCoverEl(item) {
    const box = document.createElement('span'); box.className = 'recent-cover plain'; box.setAttribute('aria-hidden', 'true');
    let h = 0; for (const ch of item.folder) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    box.style.setProperty('--cover-hue', h % 360);
    const title = document.createElement('span'); title.textContent = item.folder;
    const mark = document.createElement('i'); mark.textContent = '📁 ' + item.books.length;
    box.append(title, mark);
    return box;
}
const shelfBackButton = () => {
    const back = document.createElement('button'); back.type = 'button'; back.className = 'recent-all';
    back.textContent = '‹ ' + t('shelfFolderBack');
    back.addEventListener('click', () => { shelfFolder = null; renderRecentBooks(); if (typeof libraryState !== 'undefined' && libraryState.source === 'shelf') runShelfList(); });
    return back;
};
function shelfCardMeta(b) {
    const mb = b.size / 1048576;
    return [b.series, b.volume && 'Vol. ' + b.volume, b.issue && 'No. ' + b.issue, b.name.split('.').pop().toUpperCase(), (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' MB', new Date(b.openedAt).toLocaleDateString(state.uiLang)].filter(Boolean).join(' · ');
}
// Обкладинка картки: збережене зображення або назва на кольоровому тлі (колір сталий для книги).
const shelfCoverUrls = new Map();
function shelfCoverEl(b) {
    const box = document.createElement('span'); box.className = 'recent-cover'; box.setAttribute('aria-hidden', 'true');
    if (b.cover) {
        let url = shelfCoverUrls.get(b.key);
        if (!url) { url = URL.createObjectURL(b.cover); shelfCoverUrls.set(b.key, url); }
        const img = document.createElement('img'); img.src = url; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
        box.append(img);
    } else {
        let h = 0; for (const ch of String(b.key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        box.style.setProperty('--cover-hue', h % 360);
        box.classList.add('plain');
        const title = document.createElement('span'); title.textContent = b.title || b.name;
        const fmt = document.createElement('i'); fmt.textContent = b.name.split('.').pop().toUpperCase();
        box.append(title, fmt);
    }
    return box;
}
function shelfTabs(all) {
    const tabs = document.createElement('div'); tabs.className = 'shelf-tabs';
    tabs.setAttribute('role', 'group'); tabs.dataset.i18nAria = 'shelfCollections'; tabs.setAttribute('aria-label', t('shelfCollections'));
    for (const [kind, label] of [['book', 'myBooksLabel'], ['scan', 'shelfScans']]) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'shelf-tab'; btn.dataset.kind = kind;
        const text = document.createElement('span'); text.dataset.i18n = label; text.textContent = t(label);
        btn.append(text, ' (' + all.filter(b => b.kind === kind).length + ')');
        btn.setAttribute('aria-pressed', String(shelfView === kind));
        btn.addEventListener('click', () => {
            shelfView = kind; shelfFolder = null; renderRecentBooks();
            if (typeof libraryState !== 'undefined' && libraryState.source === 'shelf') runShelfList();
        });
        tabs.append(btn);
    }
    return tabs;
}
// Стартовий екран: книги й скани в окремих списках, з однаковим доступом до читання.
async function renderRecentBooks() {
    const host = document.getElementById('recent-books');
    if (!host) return;
    let all = [];
    try { all = await listShelfBooks(null); } catch (e) {}
    const books = all.filter(b => b.kind === shelfView);
    host.replaceChildren();
    for (const [key, url] of shelfCoverUrls) if (!all.some(b => b.key === key && b.cover)) { URL.revokeObjectURL(url); shelfCoverUrls.delete(key); }
    if (!all.length) return;
    host.append(shelfTabs(all));
    if (!books.length) {
        const empty = document.createElement('p'); empty.className = 'recent-empty'; empty.dataset.i18n = shelfView === 'scan' ? 'shelfScansEmpty' : 'shelfEmpty'; empty.textContent = t(empty.dataset.i18n);
        host.append(empty); return;
    }
    const view = shelfFolderView(books);
    const head = document.createElement('div'); head.className = 'recent-head';
    const h = document.createElement('h3');
    if (view.inFolder) h.textContent = '📁 ' + shelfFolder; else { h.dataset.i18n = shelfView === 'scan' ? 'shelfScans' : 'shelfRecent'; h.textContent = t(h.dataset.i18n); }
    head.append(h);
    if (view.inFolder) head.append(shelfBackButton());
    else {
        const all = document.createElement('button'); all.type = 'button'; all.className = 'recent-all'; all.id = 'home-my-books';
        all.textContent = t('shelfAll') + ' (' + books.length + ') ›';
        all.addEventListener('click', () => openLibrary('shelf'));
        head.append(all);
    }
    const grid = document.createElement('div'); grid.className = 'recent-list';
    for (const item of view.items) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'recent-book';
        const name = document.createElement('b'), meta = document.createElement('small');
        if (item.folder) {
            name.textContent = item.folder; meta.textContent = t('shelfFolderFiles').replace('{n}', item.books.length);
            btn.append(shelfFolderCoverEl(item), name, meta);
            btn.addEventListener('click', () => { shelfFolder = item.folder; renderRecentBooks(); });
        } else {
            const b = item.book;
            name.textContent = b.title || b.name; meta.textContent = shelfCardMeta(b);
            btn.append(shelfCoverEl(b), name, meta);
            btn.addEventListener('click', () => openShelfBook(b.key));
        }
        grid.append(btn);
    }
    host.append(head, grid);
    drumBind(grid);
    drumFrame(grid);
}
// Список прокручується у своїй висоті, верх і низ зникають прозоро (маска в index.html), картки не нахиляються.
// Кнопки над списком лишаються на місці.
// Стан кожного барабана: стартовий екран і «Мої книги» в бібліотеці.
const drumState = new WeakMap();
const drumOf = list => { let d = drumState.get(list); if (!d) { d = { raf: 0, scrolled: false, center: -1 }; drumState.set(list, d); } return d; };
// Звук лопнутої бульбашки, коли під центр барабана підходить наступна книга: короткий синус, що швидко злітає вгору й
// згасає (Web Audio, без файлів), і легка вібрація. Лише від прокрутки пальцем, не під час першого показу списку.
let drumAudio = null;
function drumPop() {
    try {
        if (!drumAudio) drumAudio = new (window.AudioContext || window.webkitAudioContext)();
        if (drumAudio.state === 'suspended') drumAudio.resume();
        const now = drumAudio.currentTime, osc = drumAudio.createOscillator(), gain = drumAudio.createGain();
        const base = 380 + Math.random() * 160;   // кожна бульбашка трохи інша
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 3.2, now + 0.045);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        osc.connect(gain).connect(drumAudio.destination);
        osc.start(now); osc.stop(now + 0.08);
    } catch (e) {}
    if (typeof haptic === 'function') haptic(4);
}
function drumBind(list) {
    const d = drumOf(list); d.center = -1;
    if (!d.bound) { d.bound = true; list.addEventListener('scroll', () => { d.scrolled = true; drumFrame(list); }, { passive: true }); }
}
function drumFrame(list) {
    const st = drumOf(list);
    if (st.raf) return;
    st.raf = requestAnimationFrame(() => {
        st.raf = 0;
        // список бібліотеки став іншим джерелом — барабан вимкнено
        if (list.id === 'library-list' && !list.classList.contains('shelf-drum')) { st.center = -1; return; }
        // висота стартового барабана — до низу екрана (з полем), щоб він не виходив за край і сторінка не прокручувалась;
        // у вікні бібліотеки висоту задає саме вікно
        if (list.id !== 'library-list') list.style.maxHeight = Math.max(220, Math.floor(innerHeight - list.getBoundingClientRect().top - 16)) + 'px';
        const scrollable = list.scrollHeight > list.clientHeight + 2;
        list.classList.toggle('drum', scrollable);
        list.classList.toggle('drum-top', scrollable && list.scrollTop > 8);
        list.classList.toggle('drum-bottom', scrollable && list.scrollTop + list.clientHeight < list.scrollHeight - 8);
        const box = list.getBoundingClientRect(), mid = box.top + box.height / 2;
        let nearest = -1, nearestD = Infinity;
        [...list.children].forEach((card, i) => { const r = card.getBoundingClientRect(), dd = Math.abs(r.top + r.height / 2 - mid); if (dd < nearestD) { nearestD = dd; nearest = i; } });
        if (scrollable && st.scrolled && st.center >= 0 && nearest !== st.center) drumPop();
        st.center = nearest; st.scrolled = false;
    });
}
addEventListener('resize', () => { const l = document.querySelector('#recent-books .recent-list'); if (l) drumFrame(l); });
// Джерело «Мої книги» у вікні бібліотеки (js/library.js викликає, коли вибрано це джерело).
let shelfListToken = 0;
async function runShelfList() {
    const token = ++shelfListToken;
    const status = libraryEl('library-status'), list = libraryEl('library-list');
    list.replaceChildren();
    let all = [];
    try { all = await listShelfBooks(null); } catch (e) {}
    if (token !== shelfListToken || libraryState.source !== 'shelf') return;
    const books = all.filter(b => b.kind === shelfView);
    const note = document.createElement('p'); note.className = 'shelf-note';
    note.textContent = shelfView === 'scan' ? t(books.length ? 'shelfScansNote' : 'shelfScansEmpty')
        : books.length ? t('shelfNote').replace('{n}', SHELF_MAX_BOOKS) : t('shelfEmpty');
    const view = shelfFolderView(books);
    status.replaceChildren(shelfTabs(all), ...(view.inFolder ? [shelfBackButton(), Object.assign(document.createElement('p'), { className: 'shelf-note', textContent: '📁 ' + shelfFolder })] : [note]));   // the «up to 15 books» note does not apply inside a folder
    for (const item of view.items) {
        const card = document.createElement('div'); card.className = 'library-card';
        const info = document.createElement('div'); info.className = 'library-info';
        const name = document.createElement('div'); name.className = 'library-name';
        const by = document.createElement('div'); by.className = 'library-author';
        const read = document.createElement('button'); read.type = 'button'; read.className = 'btn-primary';
        const del = document.createElement('button'); del.type = 'button'; del.className = 'library-save'; del.textContent = '🗑';
        if (item.folder) {
            name.textContent = '📁 ' + item.folder; by.textContent = t('shelfFolderFiles').replace('{n}', item.books.length);
            card.append(shelfFolderCoverEl(item));
            read.textContent = t('shelfFolderOpen'); read.addEventListener('click', () => { shelfFolder = item.folder; renderRecentBooks(); runShelfList(); });
            del.title = t('shelfFolderRemove'); del.setAttribute('aria-label', t('shelfFolderRemove'));
            del.addEventListener('click', async () => { await removeShelfFolder(item.folder); runShelfList(); });
        } else {
            const b = item.book;
            name.textContent = b.title || b.name; by.textContent = shelfCardMeta(b);
            card.append(shelfCoverEl(b));
            read.textContent = t('libRead'); read.addEventListener('click', async () => { closeLibrary(); await openShelfBook(b.key); });
            del.title = t('shelfRemove'); del.setAttribute('aria-label', t('shelfRemove'));
            del.addEventListener('click', async () => { await removeShelfBook(b.key); runShelfList(); });
        }
        info.append(name, by);
        const actions = document.createElement('div'); actions.className = 'library-actions'; actions.append(read, del);
        card.append(info, actions);
        list.append(card);
    }
    drumBind(list); drumFrame(list);
}
renderRecentBooks();
// «📖 Мої книги» в меню: бібліотека одразу на збережених книгах, без перемикання джерела.
// Дві кнопки: рядок меню (розділ «Книга») і кнопка стартового екрана.
document.querySelectorAll('.my-books-btn').forEach(b => b.addEventListener('click', () => openLibrary('shelf')));

// Every opened book goes to «Мої книги» — except the demo textbook (js/main.js openBookFile, onBookOpened).
onBookOpened(file => { if (!file.__readerDemo) scheduleShelveBook(file); });
onBookBundleSave(async (folder, files, titles) => { if (await shelveBundle(folder, files, titles)) openLibrary('shelf'); });
