/* «Мої книги»: кожна відкрита книга (з бібліотеки чи з пристрою) зберігається на пристрої в IndexedDB, щоб не губитися,
 * коли Android вивантажує застосунок із фону чи його закривають: раніше зберігалась лише позиція читання, а сам файл жив
 * у пам'яті сторінки — книгу з бібліотеки доводилося шукати й завантажувати знову. Ключ запису = state.bookKey (назва +
 * розмір + lastModified), тож відкрита звідси книга продовжується з тієї самої сторінки. Старі книги витісняються:
 * не більше SHELF_MAX_BOOKS і SHELF_MAX_BYTES разом, найдавніше відкриті — першими. */
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
    shelfRemove: { uk: 'Видалити з пристрою', en: 'Remove from device', fr: 'Supprimer de l’appareil', ru: 'Удалить с устройства', es: 'Quitar del dispositivo' },
    shelfMissing: { uk: 'Цієї книги вже немає на пристрої.', en: 'This book is no longer on the device.', fr: 'Ce livre n’est plus sur l’appareil.', ru: 'Этой книги уже нет на устройстве.', es: 'Este libro ya no está en el dispositivo.' }
});
const SHELF_DB = 'reader-books', SHELF_STORE = 'books', SHELF_MAX_BOOKS = 12, SHELF_MAX_BYTES = 600 * 1024 * 1024, SHELF_MAX_BOOK_BYTES = 300 * 1024 * 1024;
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
async function listShelfBooks() {
    const all = await shelfTx('readonly', async (store, done) => done(await shelfReq(store.getAll())));
    return (all || []).map(({ blob, ...meta }) => meta).sort((a, b) => b.openedAt - a.openedAt);
}
function shelfTitle(name) { return String(name || '').replace(/\.(epub|pdf|fb2(\.zip)?|txt|md|markdown|html?|docx|rtf)$/i, ''); }
// Зберігає щойно відкриту книгу (або оновлює час відкриття) і витісняє найдавніші, коли їх забагато.
async function shelveBook(file, key = state.bookKey) {
    if (!file || !key || file.size > SHELF_MAX_BOOK_BYTES) return;
    try {
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        await shelfTx('readwrite', async store => {
            const old = await shelfReq(store.get(key));
            store.put({ key, name: file.name, type: file.type || '', size: file.size, lastModified: file.lastModified || 0,
                title: shelfTitle(file.name), openedAt: Date.now(), blob: old && old.blob && old.size === file.size ? old.blob : file });
        });
        const books = await listShelfBooks();
        let total = 0;
        const evict = books.filter((b, i) => { total += b.size; return i >= SHELF_MAX_BOOKS || (i > 0 && total > SHELF_MAX_BYTES); });
        if (evict.length) await shelfTx('readwrite', store => { for (const b of evict) store.delete(b.key); });
        renderRecentBooks();
    } catch (e) { /* немає місця чи IndexedDB заборонено — книга просто не збережеться, читання не страждає */ }
}
// Запис великого файлу (PDF на десятки МБ) не має змагатися з першим відмальовуванням книги: зберігаємо за кілька секунд,
// коли браузер вільний, і лише якщо ця книга досі відкрита.
let shelfPendingKey = null;
function scheduleShelveBook(file) {
    const key = shelfPendingKey = state.bookKey;
    const run = () => { if (shelfPendingKey === key && state.bookKey === key) { shelfPendingKey = null; shelveBook(file, key); } };
    setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(run, { timeout: 5000 }) : run()), 2500);
}
async function removeShelfBook(key) {
    if (shelfPendingKey === key) shelfPendingKey = null;   // щойно видалену книгу відкладене збереження не повертає
    try { await shelfTx('readwrite', store => { store.delete(key); }); } catch (e) {}
    renderRecentBooks();
}
async function openShelfBook(key) {
    const rec = await shelfTx('readonly', async (store, done) => done(await shelfReq(store.get(key))));
    if (!rec || !rec.blob) { showToast(t('shelfMissing')); renderRecentBooks(); return false; }
    // Ті самі name/size/lastModified → той самий state.bookKey → читання продовжується з тієї ж сторінки.
    await openBookFile(new File([rec.blob], rec.name, { type: rec.type, lastModified: rec.lastModified }));
    return true;
}
function shelfCardMeta(b) {
    const mb = b.size / 1048576;
    return [b.name.split('.').pop().toUpperCase(), (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' MB', new Date(b.openedAt).toLocaleDateString(state.uiLang)].join(' · ');
}
// Стартовий екран (книгу ще не відкрито): кілька останніх книг одним натисканням.
async function renderRecentBooks() {
    const host = document.getElementById('recent-books');
    if (!host) return;
    let books = [];
    try { books = await listShelfBooks(); } catch (e) {}
    host.replaceChildren();
    if (!books.length) return;
    const head = document.createElement('h3'); head.dataset.i18n = 'shelfRecent'; head.textContent = t('shelfRecent');
    host.append(head);
    for (const b of books.slice(0, 5)) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'recent-book';
        const name = document.createElement('b'); name.textContent = b.title || b.name;
        const meta = document.createElement('small'); meta.textContent = shelfCardMeta(b);
        btn.append(name, meta);
        btn.addEventListener('click', () => openShelfBook(b.key));
        host.append(btn);
    }
}
// Джерело «Мої книги» у вікні бібліотеки (js/library.js викликає, коли вибрано це джерело).
async function runShelfList() {
    const status = libraryEl('library-status'), list = libraryEl('library-list');
    list.replaceChildren();
    let books = [];
    try { books = await listShelfBooks(); } catch (e) {}
    if (libraryState.source !== 'shelf') return;
    status.textContent = books.length ? t('shelfNote').replace('{n}', SHELF_MAX_BOOKS) : t('shelfEmpty');
    for (const b of books) {
        const card = document.createElement('div'); card.className = 'library-card';
        const info = document.createElement('div'); info.className = 'library-info';
        const name = document.createElement('div'); name.className = 'library-name'; name.textContent = b.title || b.name;
        const by = document.createElement('div'); by.className = 'library-author'; by.textContent = shelfCardMeta(b);
        info.append(name, by);
        const read = document.createElement('button'); read.type = 'button'; read.className = 'btn-primary'; read.textContent = t('libRead');
        read.addEventListener('click', async () => { closeLibrary(); await openShelfBook(b.key); });
        const del = document.createElement('button'); del.type = 'button'; del.className = 'library-save'; del.textContent = '🗑'; del.title = t('shelfRemove');
        del.setAttribute('aria-label', t('shelfRemove'));
        del.addEventListener('click', async () => { await removeShelfBook(b.key); runShelfList(); });
        const actions = document.createElement('div'); actions.className = 'library-actions'; actions.append(read, del);
        card.append(info, actions);
        list.append(card);
    }
}
renderRecentBooks();
// «📖 Мої книги» в меню: бібліотека одразу на збережених книгах, без перемикання джерела.
// Дві кнопки: у групі «Книга» (телефон, комп'ютер) і значок у налаштуваннях (планшет) — показується одна з них.
document.querySelectorAll('.my-books-btn').forEach(b => b.addEventListener('click', () => openLibrary('shelf')));
