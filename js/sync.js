/* sync.js — синхронізація між пристроями за кодом (без облікових записів). У налаштуваннях (🔑) читач створює код
 * на одному пристрої й вводить його на іншому. Переносяться: місце читання (закладка й стрічка), виділення й нотатки,
 * мова книги, а також тема, мова меню й мова перекладу (розмір шрифту — ні: він залежить від екрана). Самі книги й ключі AI НЕ переносяться.
 *
 * Безпека: з коду (20 випадкових байтів) на пристрої виводяться три незалежні значення (HKDF): id сховища, ключ запису
 * й ключ шифрування AES-GCM. Сервер (functions/api/sync.js, Cloudflare KV) отримує лише id, ключ запису й ЗАШИФРОВАНИЙ
 * блок; прочитати дані без коду неможливо. Код лежить лише в localStorage цього пристрою.
 *
 * Книги на різних пристроях мають різний lastModified (а отже й різний ключ закладки), тому елементи книги
 * синхронізуються за «назва + розмір». Кожен елемент — { v: рядок | null (видалено), at: час зміни }; при злитті перемагає
 * новіший. Час зміни локального значення визначається порівнянням із хешем, запам'ятаним під час минулої синхронізації.
 * Дані для книги, якої на цьому пристрої ще не відкривали, чекають у reader_sync_pending і записуються, щойно її відкриють
 * (applySyncedBook із openBookFile, до читання закладки).
 */
const SYNC_CODE_KEY = 'reader_sync_code', SYNC_META_KEY = 'reader_sync_meta', SYNC_PENDING_KEY = 'reader_sync_pending', SYNC_LAST_KEY = 'reader_sync_last';
// Розмір шрифту НЕ переноситься: на телефоні й планшеті зручний розмір різний.
const SYNC_SETTINGS = ['reader_theme', 'reader_ui_lang', 'reader_target_lang',
    // Вигляд книжкового тексту (js/core.js TEXT_LAYOUT): як і тема, застосовується одразу — читач налаштував його раз.
    'reader_text_font', 'reader_line_height', 'reader_margin', 'reader_align', 'reader_hyphens'];
// Ключі книги: префікс локального ключа → коротка назва типу в синхронізації. Ключ закладки — сам bookKey.
const SYNC_BOOK_TYPES = [['reader_marks_v1:', 'mk'], ['reader_readpos_v1:', 'rp'], ['reader_book_lang:', 'bl'], ['', 'bm']];
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
let syncBusy = null, syncTimer = 0;

Object.assign(I18N, {
    syncTitle: { uk: '🔄 Синхронізація пристроїв', en: '🔄 Sync between devices', fr: '🔄 Synchronisation des appareils', ru: '🔄 Синхронизация устройств', es: '🔄 Sincronización entre dispositivos' },
    syncHint: { uk: 'Місце читання, виділення й нотатки, налаштування — на телефоні й планшеті однакові. Книги й ключі AI не пересилаються. Код — це ваш ключ: зберігайте його в таємниці.',
                en: 'Reading place, highlights and notes, settings — the same on phone and tablet. Books and AI keys are not sent. The code is your key: keep it secret.',
                fr: 'Position de lecture, surlignages et notes, réglages — identiques sur téléphone et tablette. Les livres et les clés IA ne sont pas envoyés. Le code est votre clé : gardez-le secret.',
                ru: 'Место чтения, выделения и заметки, настройки — одинаковые на телефоне и планшете. Книги и ключи AI не пересылаются. Код — это ваш ключ: храните его в тайне.',
                es: 'Posición de lectura, resaltados y notas, ajustes: iguales en el móvil y la tableta. Los libros y las claves de IA no se envían. El código es tu clave: guárdalo en secreto.' },
    syncCreate: { uk: 'Створити код', en: 'Create a code', fr: 'Créer un code', ru: 'Создать код', es: 'Crear un código' },
    syncEnterPlaceholder: { uk: 'Код з іншого пристрою', en: 'Code from another device', fr: 'Code d’un autre appareil', ru: 'Код с другого устройства', es: 'Código de otro dispositivo' },
    syncJoin: { uk: 'Підключити', en: 'Connect', fr: 'Connecter', ru: 'Подключить', es: 'Conectar' },
    syncNow: { uk: 'Синхронізувати зараз', en: 'Sync now', fr: 'Synchroniser', ru: 'Синхронизировать', es: 'Sincronizar ahora' },
    syncCopy: { uk: 'Копіювати', en: 'Copy', fr: 'Copier', ru: 'Копировать', es: 'Copiar' },
    syncOff: { uk: 'Вимкнути на цьому пристрої', en: 'Turn off on this device', fr: 'Désactiver sur cet appareil', ru: 'Выключить на этом устройстве', es: 'Desactivar en este dispositivo' },
    syncCodeLabel: { uk: 'Ваш код (введіть його на іншому пристрої):', en: 'Your code (enter it on the other device):', fr: 'Votre code (saisissez-le sur l’autre appareil) :', ru: 'Ваш код (введите его на другом устройстве):', es: 'Tu código (escríbelo en el otro dispositivo):' },
    syncDone: { uk: 'Синхронізовано: {time}', en: 'Synced: {time}', fr: 'Synchronisé : {time}', ru: 'Синхронизировано: {time}', es: 'Sincronizado: {time}' },
    syncWorking: { uk: 'Синхронізація…', en: 'Syncing…', fr: 'Synchronisation…', ru: 'Синхронизация…', es: 'Sincronizando…' },
    syncBadCode: { uk: 'Код неправильний: 32 літери й цифри.', en: 'Wrong code: 32 letters and digits.', fr: 'Code incorrect : 32 lettres et chiffres.', ru: 'Неверный код: 32 буквы и цифры.', es: 'Código incorrecto: 32 letras y cifras.' },
    syncNotFound: { uk: 'За цим кодом ще нічого не збережено. Перевірте код або спершу синхронізуйте пристрій, де його створили.', en: 'Nothing is stored under this code yet. Check the code or sync the device that created it first.',
                    fr: 'Rien n’est encore enregistré sous ce code. Vérifiez le code ou synchronisez d’abord l’appareil qui l’a créé.', ru: 'По этому коду ещё ничего не сохранено. Проверьте код или сначала синхронизируйте устройство, где его создали.',
                    es: 'Aún no hay nada guardado con este código. Comprueba el código o sincroniza primero el dispositivo que lo creó.' },
    syncNotConfigured: { uk: 'Синхронізацію ще не ввімкнено на сайті (немає сховища).', en: 'Sync is not enabled on the site yet (no storage).', fr: 'La synchronisation n’est pas encore activée sur le site (pas de stockage).',
                         ru: 'Синхронизация ещё не включена на сайте (нет хранилища).', es: 'La sincronización aún no está activada en el sitio (sin almacenamiento).' },
    syncFailed: { uk: 'Не вдалося синхронізувати. Перевірте інтернет.', en: 'Sync failed. Check your connection.', fr: 'Échec de la synchronisation. Vérifiez votre connexion.', ru: 'Не удалось синхронизировать. Проверьте интернет.', es: 'No se pudo sincronizar. Comprueba la conexión.' },
    syncForbidden: { uk: 'Цей код не підходить до збережених даних.', en: 'This code does not match the stored data.', fr: 'Ce code ne correspond pas aux données enregistrées.', ru: 'Этот код не подходит к сохранённым данным.', es: 'Este código no corresponde a los datos guardados.' }
});

// ---------- код і ключі ----------
const SYNC_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // без 0/O та 1/I — їх легко сплутати, переписуючи код
function newSyncCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return [...bytes].map(b => SYNC_ALPHABET[b % 32]).join('');
}
function normalizeSyncCode(text) {
    const code = String(text || '').toUpperCase().replace(/[\s-]+/g, '').replace(/O/g, '0').replace(/I/g, '1');
    return /^[A-HJ-NP-Z2-9]{32}$/.test(code) ? code : null;
}
function formatSyncCode(code) { return code.match(/.{1,4}/g).join('-'); }
function syncCode() { try { return normalizeSyncCode(readStored(SYNC_CODE_KEY)); } catch (e) { return null; } }
const syncHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function syncKeys(code) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'HKDF', false, ['deriveBits', 'deriveKey']);
    const params = info => ({ name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode('ai-ebook-reader-sync-v1'), info: new TextEncoder().encode(info) });
    const id = syncHex(await crypto.subtle.deriveBits(params('id'), base, 256));
    const auth = syncHex(await crypto.subtle.deriveBits(params('auth'), base, 256));
    const key = await crypto.subtle.deriveKey(params('enc'), base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return { id, auth, key };
}
async function syncEncrypt(key, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
    const all = new Uint8Array(iv.length + ct.length); all.set(iv); all.set(ct, iv.length);
    let bin = ''; for (let i = 0; i < all.length; i += 0x8000) bin += String.fromCharCode(...all.subarray(i, i + 0x8000));
    return btoa(bin);
}
async function syncDecrypt(key, b64) {
    const all = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, key, all.subarray(12));
    return JSON.parse(new TextDecoder().decode(pt));
}

// ---------- локальні елементи ----------
// bookKey = 'reader_bookmark_' + назва + '_' + розмір + '_' + lastModified (js/navigation.js bookKeyFor).
function syncBookPart(bookKey) {
    const m = /^reader_bookmark_(.*)_(\d+)_(-?\d+)$/.exec(bookKey || '');
    return m ? m[1] + '|' + m[2] : null;
}
// Локальний ключ → ключ синхронізації (або null, якщо не синхронізується).
function syncItemKey(localKey) {
    if (SYNC_SETTINGS.includes(localKey)) return 's|' + localKey;
    for (const [prefix, type] of SYNC_BOOK_TYPES) {
        if (prefix && !localKey.startsWith(prefix)) continue;
        const book = syncBookPart(prefix ? localKey.slice(prefix.length) : localKey);
        if (book) return type + '|' + book;
        if (prefix) return null;
    }
    return null;
}
function syncHash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + text.length; }
function syncReadJson(key, fallback) { try { const v = JSON.parse(readStored(key) || 'null'); return v && typeof v === 'object' ? v : fallback; } catch (e) { return fallback; } }
// Усі локальні елементи з часом зміни; meta оновлюється (нове/змінене значення — at = зараз, зникле — видалення).
function collectSyncItems() {
    const meta = syncReadJson(SYNC_META_KEY, {}), items = {}, now = Date.now();
    const keys = [];
    try { for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch (e) {}
    for (const localKey of keys) {
        const item = syncItemKey(localKey);
        if (!item) continue;
        const v = readStored(localKey);
        if (v == null) continue;
        const h = syncHash(v), m = meta[item];
        const at = m && m.h === h ? m.at : now;
        meta[item] = { h, at };
        // Та сама книга з іншим lastModified на цьому пристрої — беремо новіше значення.
        if (!items[item] || items[item].at < at) items[item] = { v, at };
    }
    for (const [item, m] of Object.entries(meta)) {
        if (items[item]) continue;
        if (m.h !== null) meta[item] = { h: null, at: now };   // було — зникло: видалення
        items[item] = { v: null, at: meta[item].at };
    }
    writeStored(SYNC_META_KEY, JSON.stringify(meta));
    return items;
}
// Локальні ключі, що відповідають елементу (для книги — усі відкриті тут версії файлу з тією ж назвою й розміром).
function syncLocalKeysFor(item) {
    const [type, ...rest] = item.split('|');
    if (type === 's') return SYNC_SETTINGS.includes(rest[0]) ? [rest[0]] : [];
    const prefix = (SYNC_BOOK_TYPES.find(([, t]) => t === type) || [])[0];
    if (prefix === undefined) return [];
    const out = [], book = rest.join('|');
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('reader_bookmark_') && syncBookPart(k) === book) out.push(prefix + k);
        }
    } catch (e) {}
    return [...new Set(out)];
}
function applySyncItem(item, entry, meta, pending) {
    const keys = syncLocalKeysFor(item);
    if (!keys.length && !item.startsWith('s|')) { pending[item] = entry; return; }   // книги тут ще не відкривали
    for (const k of keys) { try { if (entry.v === null) localStorage.removeItem(k); else writeStored(k, entry.v); } catch (e) {} }
    meta[item] = { h: entry.v === null ? null : syncHash(entry.v), at: entry.at };
    delete pending[item];
}
// Відкриття книги: дочекані дані для неї (назва + розмір) записуються під її ключ до того, як читається закладка.
function applySyncedBook(bookKey) {
    const book = syncBookPart(bookKey);
    if (!book) return;
    const pending = syncReadJson(SYNC_PENDING_KEY, {}), meta = syncReadJson(SYNC_META_KEY, {});
    let changed = false;
    for (const [item, entry] of Object.entries(pending)) {
        const [type, ...rest] = item.split('|');
        if (rest.join('|') !== book) continue;
        const prefix = (SYNC_BOOK_TYPES.find(([, t]) => t === type) || [])[0];
        if (prefix === undefined) continue;
        try { if (entry.v === null) localStorage.removeItem(prefix + bookKey); else writeStored(prefix + bookKey, entry.v); } catch (e) {}
        meta[item] = { h: entry.v === null ? null : syncHash(entry.v), at: entry.at };
        delete pending[item]; changed = true;
    }
    if (changed) { writeStored(SYNC_PENDING_KEY, JSON.stringify(pending)); writeStored(SYNC_META_KEY, JSON.stringify(meta)); }
}

// ---------- обмін із сервером ----------
class SyncError extends Error { constructor(kind) { super(kind); this.kind = kind; } }
async function syncRequest(method, keys, body, keepalive = false) {
    let res;
    try {
        res = await fetch('/api/sync?id=' + keys.id, { method, keepalive, headers: { 'x-sync-auth': keys.auth, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    } catch (e) { throw new SyncError('network'); }
    if (res.status === 501) throw new SyncError('not_configured');
    if (res.status === 403) throw new SyncError('forbidden');
    if (res.status === 404 && method === 'GET') return null;
    if (res.status === 409) return { conflict: true };
    if (!res.ok) throw new SyncError('network');
    return res.json();
}
// Один повний обмін: прочитати, злити (новіше перемагає), записати локально й на сервер. joining — пристрій щойно ввів код:
// якщо за кодом нічого немає, це помилка (найімовірніше, код переписали з помилкою).
async function runSync({ joining = false } = {}) {
    const code = syncCode();
    if (!code) return null;
    if (syncBusy) return syncBusy;
    syncBusy = (async () => {
        const keys = await syncKeys(code);
        for (let attempt = 0; attempt < 3; attempt++) {
            const local = collectSyncItems();
            const remote = await syncRequest('GET', keys);
            if (!remote && joining) throw new SyncError('not_found');
            const remoteItems = remote ? ((await syncDecrypt(keys.key, remote.blob).catch(() => { throw new SyncError('forbidden'); })).items || {}) : {};
            const merged = { ...remoteItems }, meta = syncReadJson(SYNC_META_KEY, {}), pending = syncReadJson(SYNC_PENDING_KEY, {});
            let remoteChanged = !remote;
            for (const [item, entry] of Object.entries(local)) {
                const r = remoteItems[item];
                if (!r || entry.at > r.at) { merged[item] = entry; if (!r || r.v !== entry.v) remoteChanged = true; }
            }
            for (const [item, entry] of Object.entries(remoteItems)) {
                const l = local[item];
                if (!l || entry.at > l.at) { if (!l || l.v !== entry.v) applySyncItem(item, entry, meta, pending); }
            }
            writeStored(SYNC_META_KEY, JSON.stringify(meta)); writeStored(SYNC_PENDING_KEY, JSON.stringify(pending));
            if (remoteChanged) {
                const put = await syncRequest('PUT', keys, { blob: await syncEncrypt(keys.key, { v: 1, items: merged }), base: remote ? remote.at : null });
                if (put && put.conflict) continue;   // інший пристрій записав між нашим читанням і записом — зливаємо ще раз
            }
            writeStored(SYNC_LAST_KEY, String(Date.now()));
            applyStoredSyncSettings();
            return true;
        }
        throw new SyncError('network');
    })().finally(() => { syncBusy = null; renderSyncBox(); });
    return syncBusy;
}
// Тема з іншого пристрою застосовується одразу; мови меню й перекладу — з наступного запуску (вони перебудовують багато
// частин інтерфейсу, і міняти їх посеред читання було б несподівано).
function applyStoredSyncSettings() {
    try {
        const theme = readStored('reader_theme');
        if (theme && theme !== document.body.getAttribute('data-theme')) {
            document.body.setAttribute('data-theme', theme);
            const select = document.getElementById('theme-select'); if (select) select.value = theme;
        }
        if (applyTextLayout()) {
            if (typeof syncTextLayoutControls === 'function') syncTextLayoutControls();
            if (state.format && state.format !== 'pdf') repaginateBook();
        }
    } catch (e) {}
}

// ---------- інтерфейс (у вікні налаштувань) ----------
function syncStatusText(kind) {
    return t({ not_configured: 'syncNotConfigured', forbidden: 'syncForbidden', not_found: 'syncNotFound', bad_code: 'syncBadCode' }[kind] || 'syncFailed');
}
async function syncWithStatus(opts) {
    const status = document.getElementById('sync-status');
    if (status) status.textContent = t('syncWorking');
    try { await runSync(opts); return true; }
    catch (e) {
        // Код, який нічого не зберіг (чужий/хибний або на сайті ще немає сховища), не лишається «увімкненим».
        if ((opts && opts.joining) || (opts && opts.creating && e && e.kind === 'not_configured')) { try { localStorage.removeItem(SYNC_CODE_KEY); } catch (err) {} }
        renderSyncBox();
        const s = document.getElementById('sync-status'); if (s) s.textContent = syncStatusText(e && e.kind);
        return false;
    }
}
function renderSyncBox() {
    const box = document.getElementById('sync-box');
    if (!box) return;
    const code = syncCode();
    box.querySelector('.sync-off').hidden = !!code;
    box.querySelector('.sync-on').hidden = !code;
    if (code) box.querySelector('#sync-code').textContent = formatSyncCode(code);
    const last = Number(readStored(SYNC_LAST_KEY) || 0);
    const status = box.querySelector('#sync-status');
    if (!syncBusy) status.textContent = code && last ? t('syncDone').replace('{time}', new Date(last).toLocaleString(state.uiLang || undefined)) : '';
}
function buildSyncBox() {
    const content = document.querySelector('#settings-modal .modal-content');
    if (!content || document.getElementById('sync-box')) return;
    const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
    const box = el('section', { id: 'sync-box', className: 'sync-box' });
    const h = el('h3'); h.dataset.i18n = 'syncTitle';
    const hint = el('p', { className: 'key-hint' }); hint.dataset.i18n = 'syncHint';
    const create = el('button', { type: 'button', id: 'sync-create', className: 'btn-secondary' }); create.dataset.i18n = 'syncCreate';
    const input = el('input', { type: 'text', id: 'sync-code-input', autocomplete: 'off', spellcheck: false, autocapitalize: 'characters' }); input.dataset.i18nPh = 'syncEnterPlaceholder';
    const join = el('button', { type: 'button', id: 'sync-join', className: 'btn-secondary' }); join.dataset.i18n = 'syncJoin';
    const off = el('div', { className: 'sync-off' }, create, el('div', { className: 'sync-join-row' }, input, join));
    const label = el('p', { className: 'key-hint' }); label.dataset.i18n = 'syncCodeLabel';
    const code = el('div', { id: 'sync-code', className: 'sync-code' });   // текст, що переноситься: 39 знаків не влазять у поле на телефоні
    const copy = el('button', { type: 'button', id: 'sync-copy', className: 'btn-ghost' }); copy.dataset.i18n = 'syncCopy';
    const now = el('button', { type: 'button', id: 'sync-now', className: 'btn-primary' }); now.dataset.i18n = 'syncNow';
    const stop = el('button', { type: 'button', id: 'sync-stop', className: 'btn-ghost' }); stop.dataset.i18n = 'syncOff';
    const on = el('div', { className: 'sync-on' }, label, el('div', { className: 'sync-join-row' }, code, copy), el('div', { className: 'sync-actions' }, now, stop));
    const status = el('p', { id: 'sync-status', role: 'status' });
    box.append(h, hint, off, on, status);
    content.append(box);
    create.addEventListener('click', async () => { writeStored(SYNC_CODE_KEY, newSyncCode()); renderSyncBox(); await syncWithStatus({ creating: true }); });
    join.addEventListener('click', async () => {
        const c = normalizeSyncCode(input.value);
        if (!c) { status.textContent = t('syncBadCode'); return; }
        writeStored(SYNC_CODE_KEY, c); renderSyncBox();
        if (await syncWithStatus({ joining: true })) input.value = '';
    });
    copy.addEventListener('click', () => {
        navigator.clipboard?.writeText(code.textContent).catch(() => {});
        const r = document.createRange(); r.selectNodeContents(code); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    });
    now.addEventListener('click', () => syncWithStatus());
    stop.addEventListener('click', () => { for (const k of [SYNC_CODE_KEY, SYNC_META_KEY, SYNC_PENDING_KEY, SYNC_LAST_KEY]) { try { localStorage.removeItem(k); } catch (e) {} } renderSyncBox(); });
    applyI18n(); renderSyncBox();
}

// Коли: після запуску, кожні 5 хвилин, поки застосунок відкритий, і коли його згортають (щоб інший пристрій побачив
// найсвіжіше місце читання).
function scheduleSync() {
    clearInterval(syncTimer);
    syncTimer = setInterval(() => { if (syncCode() && document.visibilityState === 'visible' && navigator.onLine) runSync().catch(() => {}); }, SYNC_INTERVAL_MS);
}
buildSyncBox();
window.addEventListener('load', () => { setTimeout(() => { if (syncCode() && navigator.onLine) runSync().catch(() => {}); }, 2500); scheduleSync(); }, { once: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && syncCode() && navigator.onLine) runSync().catch(() => {}); });
