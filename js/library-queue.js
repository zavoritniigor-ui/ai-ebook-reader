/* One network download at a time: bounded staging/memory on tablets. A failed
 * publication stays in the queue with its own retry; it never cancels its peers. */
Object.assign(I18N, {
    publicationStorageFull: { en: 'Not enough device storage to save this publication. Free space and retry.', uk: 'Недостатньо місця для видання. Звільніть місце й повторіть.', fr: 'Espace insuffisant. Libérez de la place et réessayez.', ru: 'Недостаточно места. Освободите место и повторите.' },
    publicationIncomplete: { en: 'The download was interrupted or incomplete. Retry this file.', uk: 'Завантаження неповне. Повторіть цей файл.', fr: 'Téléchargement incomplet. Réessayez ce fichier.', ru: 'Загрузка неполная. Повторите этот файл.' },
    libBatch: { en: 'Download selected to My books', uk: 'Завантажити вибране в Мої книги', fr: 'Télécharger la sélection dans Mes livres', ru: 'Загрузить выбранное в Мои книги' },
    libQueue: { en: 'Downloads', uk: 'Завантаження', fr: 'Téléchargements', ru: 'Загрузки' },
    libQueued: { en: 'Queued', uk: 'У черзі', fr: 'En attente', ru: 'В очереди' },
    libDownloadingOne: { en: 'Downloading…', uk: 'Завантаження…', fr: 'Téléchargement…', ru: 'Загрузка…' },
    libSavedShelf: { en: 'Saved in My books', uk: 'Збережено в Моїх книгах', fr: 'Enregistré dans Mes livres', ru: 'Сохранено в Моих книгах' },
    libRetry: { en: 'Retry', uk: 'Повторити', fr: 'Réessayer', ru: 'Повторить' },
    libFiles: { en: 'Issues / volumes / files', uk: 'Випуски / томи / файли', fr: 'Numéros / volumes / fichiers', ru: 'Выпуски / тома / файлы' },
    libSelect: { en: 'Select publication', uk: 'Вибрати видання', fr: 'Sélectionner la publication', ru: 'Выбрать издание' }
});
const librarySelection = new Map(), libraryDownloads = new Map();
let libraryQueueRunning = false;
function libraryBookId(book) {
    const base = book.ws ? 'ws:' + book.lang + ':' + book.title : book.ia ? 'ia:' + book.id : book.cat ? book.cat + ':' + book.id : book.id;
    return book.file ? base + ':' + book.file.name : base;
}
function buildLibraryQueue(box) {
    const batch = document.createElement('button'); batch.type = 'button'; batch.id = 'library-batch'; batch.dataset.i18n = 'libBatch'; batch.textContent = t('libBatch'); batch.disabled = true;
    batch.onclick = () => { for (const book of librarySelection.values()) enqueueLibraryBook(book); };
    const queue = document.createElement('section'); queue.id = 'library-downloads'; queue.hidden = true; queue.dataset.i18nAria = 'libQueue'; queue.setAttribute('aria-label', t('libQueue'));
    box.append(batch, queue);
}
function librarySelectControl(book) {
    const input = document.createElement('input'); input.type = 'checkbox'; input.className = 'library-select'; input.setAttribute('aria-label', t('libSelect') + ': ' + book.title);
    const id = libraryBookId(book); input.checked = librarySelection.has(id);
    input.onchange = () => {
        if (input.checked) librarySelection.set(id, book); else librarySelection.delete(id);
        document.getElementById('library-batch').disabled = !librarySelection.size;
    };
    return input;
}
function renderLibraryDownloads() {
    const host = document.getElementById('library-downloads'); if (!host) return;
    host.hidden = !libraryDownloads.size; host.replaceChildren();
    for (const item of libraryDownloads.values()) {
        const row = document.createElement('div'); row.className = 'library-download'; row.dataset.state = item.state;
        const name = document.createElement('strong'); name.textContent = item.book.title;
        const status = document.createElement('span'); status.className = 'library-download-status'; status.setAttribute('role', 'status');
        status.textContent = item.error || t(item.state === 'saved' ? 'libSavedShelf' : item.state === 'queued' ? 'libQueued' : 'libDownloadingOne');
        row.append(name, status);
        if (item.state === 'downloading') {
            const progress = document.createElement('progress'); progress.max = item.total || 1; progress.setAttribute('aria-label', item.book.title);
            if (item.total) progress.value = item.got || 0;
            row.append(progress);
            if (item.got) status.textContent += ' ' + (item.got / 1048576).toFixed(1) + (item.total ? ' / ' + (item.total / 1048576).toFixed(1) : '') + ' MB';
        }
        if (item.state === 'failed') {
            const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = t('libRetry');
            retry.onclick = () => { item.state = 'queued'; item.error = ''; renderLibraryDownloads(); runLibraryDownloads(); }; row.append(retry);
        }
        host.append(row);
    }
}
function enqueueLibraryBook(book) {
    const id = libraryBookId(book), old = libraryDownloads.get(id);
    if (old && old.state !== 'failed') return;
    libraryDownloads.set(id, { book, state: 'queued', got: 0, total: 0 });
    renderLibraryDownloads(); runLibraryDownloads();
}
async function runLibraryDownloads() {
    if (libraryQueueRunning) return;
    libraryQueueRunning = true;
    try {
        for (;;) {
            const item = [...libraryDownloads.values()].find(i => i.state === 'queued'); if (!item) break;
            item.state = 'downloading'; item.got = 0; item.total = 0; renderLibraryDownloads();
            try {
                let shown = 0;
                const file = await fetchLibraryFile(item.book, (got, total) => {
                    item.got = got; item.total = total;
                    if (performance.now() - shown > 150 || got === total) { shown = performance.now(); renderLibraryDownloads(); }
                });
                publicationMetadata.set(file, { series: item.book.series || '', volume: item.book.volume || '', issue: item.book.issue || '', sourceId: item.book.id, ...publicationMetadata.get(file) });
                if (!await shelveBook(file, bookKeyFor(file))) throw new Error(t('publicationStorageFull'));
                // Large files are not cached or open in the reader: IndexedDB now owns
                // its durable Blob, so release the temporary disk copy immediately.
                if (file.size > 32 * 1024 * 1024) await releasePublicationStaging(file);
                item.state = 'saved';
            } catch (err) { item.state = 'failed'; item.error = err?.libraryMessage || (t('libBookError') + (err?.message ? ' (' + err.message + ')' : '')); }
            renderLibraryDownloads();
        }
    } finally { libraryQueueRunning = false; }
}
async function showLibraryFiles(book, host, btn) {
    if (host.childElementCount) { host.hidden = !host.hidden; return; }
    btn.disabled = true;
    try {
        const res = await fetch('/api/library?op=ia-files&id=' + encodeURIComponent(book.id));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const info = await res.json();
        for (const file of info.files || []) {
            const entry = { ...book, series: info.series || book.series || book.title, volume: info.volume || book.volume, issue: info.issue || book.issue,
                file, title: book.title + ' · ' + file.name };
            const label = document.createElement('label'); label.className = 'library-file'; label.append(librarySelectControl(entry), document.createTextNode(file.name)); host.append(label);
        }
        host.hidden = false;
    } catch (err) { libraryEl('library-status').textContent = err.message || t('libBookError'); }
    finally { btn.disabled = false; }
}
