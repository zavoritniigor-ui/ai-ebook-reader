/* Безкоштовна бібліотека (Project Gutenberg через власний проксі /api/library): пошук за назвою/автором, мовою й жанром,
 * завантаження EPUB одним тапом і відкриття в рідері. Каталог і файли ходять лише на свій origin (CSP), див. functions/api/library.js. */
Object.assign(I18N, {
    wheelLibrary:{ uk: 'Бібліотека', en: 'Library', fr: 'Bibliothèque', ru: 'Библиотека', zh: '图书馆', ko: '도서관', hi: 'पुस्तकालय', ga: 'Leabharlann' },
    tLibrary:    { uk: 'Безкоштовна бібліотека', en: 'Free library', fr: 'Bibliothèque gratuite', ru: 'Бесплатная библиотека' },
    libTitle:    { uk: '📚 Безкоштовна бібліотека', en: '📚 Free library', fr: '📚 Bibliothèque gratuite', ru: '📚 Бесплатная библиотека' },
    libSearch:   { uk: 'Назва або автор…', en: 'Title or author…', fr: 'Titre ou auteur…', ru: 'Название или автор…' },
    libAllLangs: { uk: 'Усі мови', en: 'All languages', fr: 'Toutes les langues', ru: 'Все языки' },
    libRead:     { uk: 'Читати', en: 'Read', fr: 'Lire', ru: 'Читать' },
    libMore:     { uk: 'Показати ще', en: 'Show more', fr: 'Afficher plus', ru: 'Показать ещё' },
    libLoading:  { uk: 'Завантаження…', en: 'Loading…', fr: 'Chargement…', ru: 'Загрузка…' },
    libEmpty:    { uk: 'Нічого не знайдено.', en: 'Nothing found.', fr: 'Aucun résultat.', ru: 'Ничего не найдено.' },
    libError:    { uk: 'Бібліотека недоступна. Перевірте інтернет і спробуйте ще раз.', en: 'The library is unavailable. Check your connection and try again.',
                   fr: 'La bibliothèque est indisponible. Vérifiez votre connexion et réessayez.', ru: 'Библиотека недоступна. Проверьте интернет и попробуйте ещё раз.' },
    libBookError:{ uk: 'Не вдалося завантажити книгу. Спробуйте ще раз.', en: 'Could not download the book. Try again.',
                   fr: "Impossible de télécharger le livre. Réessayez.", ru: 'Не удалось скачать книгу. Попробуйте ещё раз.' },
    libSource:   { uk: 'Книги з Project Gutenberg — вільне надбання.', en: 'Books from Project Gutenberg — public domain.',
                   fr: 'Livres de Project Gutenberg — domaine public.', ru: 'Книги Project Gutenberg — общественное достояние.' },
    genAll: { uk: 'Усі жанри', en: 'All genres', fr: 'Tous les genres', ru: 'Все жанры' },
    genFiction: { uk: 'Проза', en: 'Fiction', fr: 'Fiction', ru: 'Проза' },
    genAdventure: { uk: 'Пригоди', en: 'Adventure', fr: 'Aventure', ru: 'Приключения' },
    genDetective: { uk: 'Детектив', en: 'Detective', fr: 'Policier', ru: 'Детектив' },
    genScifi: { uk: 'Фантастика', en: 'Science fiction', fr: 'Science-fiction', ru: 'Фантастика' },
    genLove: { uk: 'Романтика', en: 'Romance', fr: 'Romance', ru: 'Романтика' },
    genPoetry: { uk: 'Поезія', en: 'Poetry', fr: 'Poésie', ru: 'Поэзия' },
    genDrama: { uk: 'Драма', en: 'Drama', fr: 'Théâtre', ru: 'Драма' },
    genChildren: { uk: 'Дітям', en: "Children's", fr: 'Jeunesse', ru: 'Детям' },
    genPhilosophy: { uk: 'Філософія', en: 'Philosophy', fr: 'Philosophie', ru: 'Философия' },
    genHistory: { uk: 'Історія', en: 'History', fr: 'Histoire', ru: 'История' },
    genHumor: { uk: 'Гумор', en: 'Humor', fr: 'Humour', ru: 'Юмор' }
});
const LIBRARY_GENRES = [['', 'genAll'], ['fiction', 'genFiction'], ['adventure', 'genAdventure'], ['detective', 'genDetective'], ['science fiction', 'genScifi'],
    ['love', 'genLove'], ['poetry', 'genPoetry'], ['drama', 'genDrama'], ['children', 'genChildren'], ['philosophy', 'genPhilosophy'], ['history', 'genHistory'], ['humor', 'genHumor']];
const LIBRARY_LANGS = [['fr', 'Français'], ['en', 'English'], ['uk', 'Українська'], ['ru', 'Русский'], ['de', 'Deutsch'], ['es', 'Español'], ['it', 'Italiano'], ['', null]];

const libraryState = { page: 1, hasMore: false, abort: null, timer: 0, busy: false };
function libraryEl(id) { return document.getElementById(id); }

function buildLibrary() {
    if (libraryEl('library-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'library-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.addEventListener('click', e => { if (e.target === modal) closeLibrary(); });
    const box = document.createElement('div'); box.className = 'library-box';
    const head = document.createElement('div'); head.className = 'library-head';
    const title = document.createElement('h3'); title.dataset.i18n = 'libTitle';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'close-panel-btn'; close.textContent = '✕';
    close.dataset.i18nTitle = 'tClose'; close.addEventListener('click', closeLibrary);
    head.append(title, close);
    const tools = document.createElement('div'); tools.className = 'library-tools';
    const q = document.createElement('input'); q.type = 'search'; q.id = 'library-q'; q.autocomplete = 'off'; q.spellcheck = false;
    const lang = document.createElement('select'); lang.id = 'library-lang';
    for (const [code, label] of LIBRARY_LANGS) { const o = document.createElement('option'); o.value = code; if (label) o.textContent = label; else o.dataset.i18n = 'libAllLangs'; lang.append(o); }
    const genre = document.createElement('select'); genre.id = 'library-genre';
    for (const [topic, key] of LIBRARY_GENRES) { const o = document.createElement('option'); o.value = topic; o.dataset.i18n = key; genre.append(o); }
    tools.append(q, lang, genre);
    const status = document.createElement('div'); status.id = 'library-status'; status.setAttribute('aria-live', 'polite');
    const list = document.createElement('div'); list.id = 'library-list';
    const more = document.createElement('button'); more.type = 'button'; more.id = 'library-more'; more.className = 'btn'; more.hidden = true; more.dataset.i18n = 'libMore';
    more.addEventListener('click', () => runLibrarySearch(libraryState.page + 1));
    const source = document.createElement('div'); source.className = 'library-source'; source.dataset.i18n = 'libSource';
    box.append(head, tools, status, list, more, source); modal.append(box); document.body.append(modal);
    const saved = (() => { try { return JSON.parse(localStorage.getItem('reader_library_filters') || '{}'); } catch (e) { return {}; } })();
    lang.value = saved.lang !== undefined && [...lang.options].some(o => o.value === saved.lang) ? saved.lang : 'fr';
    genre.value = saved.topic && [...genre.options].some(o => o.value === saved.topic) ? saved.topic : '';
    const restart = () => {
        try { localStorage.setItem('reader_library_filters', JSON.stringify({ lang: lang.value, topic: genre.value })); } catch (e) {}
        clearTimeout(libraryState.timer); libraryState.timer = setTimeout(() => runLibrarySearch(1), 350);
    };
    q.addEventListener('input', restart); lang.addEventListener('change', restart); genre.addEventListener('change', restart);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && libraryEl('library-modal')?.classList.contains('open')) closeLibrary(); });
    applyI18n(); q.placeholder = t('libSearch');
}

function openLibrary() {
    buildLibrary();
    libraryEl('library-modal').classList.add('open');
    libraryEl('library-q').placeholder = t('libSearch');
    if (!libraryEl('library-list').children.length) runLibrarySearch(1);
    libraryEl('library-q').focus({ preventScroll: true });
}
function closeLibrary() {
    libraryEl('library-modal')?.classList.remove('open');
    libraryState.abort?.abort();
}

async function runLibrarySearch(page) {
    libraryState.abort?.abort();
    const abort = libraryState.abort = new AbortController();
    const status = libraryEl('library-status'), list = libraryEl('library-list'), more = libraryEl('library-more');
    if (page === 1) list.replaceChildren();
    more.hidden = true; status.textContent = t('libLoading');
    const params = new URLSearchParams({ op: 'search', q: libraryEl('library-q').value.trim(), lang: libraryEl('library-lang').value, topic: libraryEl('library-genre').value, page: String(page) });
    try {
        const res = await fetch('/api/library?' + params, { signal: abort.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (abort.signal.aborted) return;
        libraryState.page = page; libraryState.hasMore = !!data.hasMore;
        for (const book of data.results) list.append(libraryCard(book));
        status.textContent = list.children.length ? '' : t('libEmpty');
        more.hidden = !data.hasMore;
    } catch (e) {
        if (e.name === 'AbortError') return;
        status.textContent = t('libError');
    }
}

function libraryCard(book) {
    const card = document.createElement('div'); card.className = 'library-card';
    const cover = document.createElement('img'); cover.loading = 'lazy'; cover.alt = ''; cover.src = '/api/library?op=cover&id=' + book.id;
    cover.addEventListener('error', () => cover.style.visibility = 'hidden');
    const info = document.createElement('div'); info.className = 'library-info';
    const name = document.createElement('div'); name.className = 'library-name'; name.textContent = book.title;
    const by = document.createElement('div'); by.className = 'library-author'; by.textContent = (book.authors || []).join(', ');
    info.append(name, by);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn-primary'; btn.textContent = t('libRead');
    btn.addEventListener('click', () => downloadLibraryBook(book, btn));
    card.append(cover, info, btn);
    return card;
}

async function downloadLibraryBook(book, btn) {
    if (libraryState.busy) return;
    libraryState.busy = true; btn.disabled = true; btn.textContent = t('libLoading');
    try {
        const res = await fetch('/api/library?op=file&id=' + encodeURIComponent(book.id));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        // Той самий id → той самий «ключ книги» (назва+розмір+lastModified): позиція читання переживає повторне завантаження.
        const file = new File([blob], book.title.replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80).trim() + '.epub', { type: 'application/epub+zip', lastModified: book.id });
        closeLibrary();
        await openBookFile(file);
    } catch (e) {
        libraryEl('library-status').textContent = t('libBookError');
    } finally {
        libraryState.busy = false; btn.disabled = false; btn.textContent = t('libRead');
    }
}
buildLibrary();
