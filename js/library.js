/* Безкоштовна бібліотека (Project Gutenberg): вбудований каталог library-catalog.json (tools/build_library_catalog.py) фільтрується
 * локально — пошук за назвою/автором, мова, тема; EPUB і обкладинки йдуть через свій проксі /api/library (CSP: лише свій origin). */
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
    genHistorical: { uk: 'Історичні романи', en: 'Historical novels', fr: 'Romans historiques', ru: 'Исторические романы' },
    genStories: { uk: 'Оповідання', en: 'Short stories', fr: 'Nouvelles', ru: 'Рассказы' },
    genBiography: { uk: 'Біографії та мемуари', en: 'Biographies & memoirs', fr: 'Biographies et mémoires', ru: 'Биографии и мемуары' },
    genMyth: { uk: 'Міфи та легенди', en: 'Myths & legends', fr: 'Mythes et légendes', ru: 'Мифы и легенды' },
    genTravel: { uk: 'Подорожі', en: 'Travel', fr: 'Voyages', ru: 'Путешествия' },
    genHumor: { uk: 'Гумор', en: 'Humor', fr: 'Humour', ru: 'Юмор' }
});
// Ключ теми = ключ у library-catalog.json (themes[]); бітова маска книги збігається з порядком там.
const LIBRARY_GENRES = [['', 'genAll'], ['fiction', 'genFiction'], ['adventure', 'genAdventure'], ['detective', 'genDetective'], ['historical', 'genHistorical'],
    ['love', 'genLove'], ['scifi', 'genScifi'], ['stories', 'genStories'], ['poetry', 'genPoetry'], ['drama', 'genDrama'], ['children', 'genChildren'],
    ['humor', 'genHumor'], ['biography', 'genBiography'], ['history', 'genHistory'], ['philosophy', 'genPhilosophy'], ['myth', 'genMyth'], ['travel', 'genTravel']];
const LIBRARY_LANGS = [['fr', 'Français'], ['en', 'English'], ['de', 'Deutsch'], ['es', 'Español'], ['it', 'Italiano'], ['', null]];
const LIBRARY_PAGE = 30;

const libraryState = { page: 1, hasMore: false, timer: 0, busy: false, catalog: null, loading: null, matches: [] };
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
}

function libraryNorm(text) { return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function loadLibraryCatalog() {
    if (libraryState.catalog) return Promise.resolve(libraryState.catalog);
    if (!libraryState.loading) {
        libraryState.loading = fetch('library-catalog.json').then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); }).then(data => {
            data.books.forEach(b => { b.hay = libraryNorm(b[1] + ' ' + b[2]); });
            return (libraryState.catalog = data);
        }).catch(err => { libraryState.loading = null; throw err; });
    }
    return libraryState.loading;
}

async function runLibrarySearch(page) {
    const status = libraryEl('library-status'), list = libraryEl('library-list'), more = libraryEl('library-more');
    more.hidden = true;
    let catalog;
    try { status.textContent = libraryState.catalog ? '' : t('libLoading'); catalog = await loadLibraryCatalog(); }
    catch (e) { status.textContent = t('libError'); return; }
    if (page === 1) {
        const words = libraryNorm(libraryEl('library-q').value).split(/\s+/).filter(Boolean);
        const lang = libraryEl('library-lang').value, topic = libraryEl('library-genre').value;
        const bit = topic ? 1 << catalog.themes.indexOf(topic) : 0;
        libraryState.matches = catalog.books.filter(b => (!lang || b[3] === lang) && (!bit || (b[4] & bit)) && words.every(w => b.hay.includes(w)));
        list.replaceChildren();
    }
    libraryState.page = page;
    for (const [id, title, author] of libraryState.matches.slice((page - 1) * LIBRARY_PAGE, page * LIBRARY_PAGE)) list.append(libraryCard({ id, title, authors: [author] }));
    status.textContent = libraryState.matches.length ? '' : t('libEmpty');
    more.hidden = page * LIBRARY_PAGE >= libraryState.matches.length;
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
