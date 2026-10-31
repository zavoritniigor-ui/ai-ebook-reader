/* Безкоштовна бібліотека (Project Gutenberg): вбудований каталог library-catalog.json (tools/build_library_catalog.py) фільтрується
 * локально — пошук за назвою/автором, мова, тема; EPUB і обкладинки йдуть через свій проксі /api/library (CSP: лише свій origin). */
Object.assign(I18N, {
    wheelLibrary:{ uk: 'Бібліотека', en: 'Library', fr: 'Bibliothèque', ru: 'Библиотека', zh: '图书馆', ko: '도서관', hi: 'पुस्तकालय', ga: 'Leabharlann' },
    tLibrary:    { uk: 'Безкоштовна бібліотека', en: 'Free library', fr: 'Bibliothèque gratuite', ru: 'Бесплатная библиотека' },
    libTitle:    { uk: '📚 Безкоштовна бібліотека', en: '📚 Free library', fr: '📚 Bibliothèque gratuite', ru: '📚 Бесплатная библиотека' },
    libSearch:   { uk: 'Назва або автор…', en: 'Title or author…', fr: 'Titre ou auteur…', ru: 'Название или автор…' },
    libAllLangs: { uk: 'Усі мови', en: 'All languages', fr: 'Toutes les langues', ru: 'Все языки' },
    libRead:     { uk: 'Читати', en: 'Read', fr: 'Lire', ru: 'Читать' },
    libSave:     { uk: '⬇ Зберегти', en: '⬇ Save', fr: '⬇ Enregistrer', ru: '⬇ Сохранить' },
    libSaveTitle:{ uk: 'Зберегти книгу на пристрій (вибрана тека або «Завантаження»)', en: 'Save the book to the device (chosen folder or Downloads)',
                   fr: "Enregistrer le livre sur l'appareil (dossier choisi ou Téléchargements)", ru: 'Сохранить книгу на устройство (выбранная папка или «Загрузки»)' },
    libSaved:    { uk: 'Книгу збережено.', en: 'Book saved.', fr: 'Livre enregistré.', ru: 'Книга сохранена.' },
    libSavedDownloads: { uk: 'Книгу збережено в «Завантаження».', en: 'Book saved to Downloads.', fr: 'Livre enregistré dans Téléchargements.', ru: 'Книга сохранена в «Загрузки».' },
    libSourceGutenberg: { uk: 'Project Gutenberg', en: 'Project Gutenberg', fr: 'Project Gutenberg', ru: 'Project Gutenberg' },
    libSourceWikisource:{ uk: 'Вікіджерела (Wikisource)', en: 'Wikisource', fr: 'Wikisource', ru: 'Викитека (Wikisource)' },
    libSourceLabel: { uk: 'Джерело книг', en: 'Book source', fr: 'Source des livres', ru: 'Источник книг' },
    libWsHint:   { uk: 'Введіть назву твору чи автора або виберіть жанр — пошук у Вікіджерелах.', en: 'Type a title or an author, or pick a genre, to search Wikisource.',
                   fr: 'Saisissez un titre ou un auteur, ou choisissez un genre, pour chercher dans Wikisource.', ru: 'Введите название или автора либо выберите жанр — поиск в Викитеке.' },
    libWsChapters: { uk: 'Завантаження розділів: {n} / {total}…', en: 'Loading chapters: {n} / {total}…', fr: 'Chargement des chapitres : {n} / {total}…', ru: 'Загрузка глав: {n} / {total}…' },
    libWsWords:  { uk: 'слів у першій частині: {n}', en: 'words in the first part: {n}', fr: 'mots dans la première partie : {n}', ru: 'слов в первой части: {n}' },
    libWsSource: { uk: 'Тексти з Вікіджерел — вільне надбання або вільні ліцензії; укладачі — волонтери Вікімедіа.', en: 'Texts from Wikisource — public domain or free licences, prepared by Wikimedia volunteers.',
                   fr: 'Textes de Wikisource — domaine public ou licences libres, préparés par des bénévoles de Wikimédia.', ru: 'Тексты из Викитеки — общественное достояние или свободные лицензии; составители — волонтёры Викимедиа.' },
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
    genHumor: { uk: 'Гумор', en: 'Humor', fr: 'Humour', ru: 'Юмор' },
    libSourceArchive: { uk: 'Internet Archive (PDF, EPUB)', en: 'Internet Archive (PDF, EPUB)', fr: 'Internet Archive (PDF, EPUB)', ru: 'Internet Archive (PDF, EPUB)' },
    libIaHint: { uk: 'Введіть назву чи автора або виберіть жанр — пошук у Internet Archive (скани старих видань і вільні книги).', en: 'Type a title or an author, or pick a genre, to search Internet Archive (scans of old editions and free books).',
                 fr: "Saisissez un titre ou un auteur, ou choisissez un genre, pour chercher dans Internet Archive (scans d'éditions anciennes et livres libres).", ru: 'Введите название или автора либо выберите жанр — поиск в Internet Archive (сканы старых изданий и свободные книги).' },
    libIaSource: { uk: 'Книги з Internet Archive: видання до 1930 року (вільне надбання) і книги з вільними ліцензіями. Скановані книги відкриваються як PDF.',
                   en: 'Books from Internet Archive: editions before 1930 (public domain) and books under free licences. Scanned books open as PDF.',
                   fr: 'Livres d’Internet Archive : éditions antérieures à 1930 (domaine public) et livres sous licence libre. Les livres numérisés s’ouvrent en PDF.',
                   ru: 'Книги из Internet Archive: издания до 1930 года (общественное достояние) и книги со свободными лицензиями. Сканы открываются как PDF.' },
    libSourceBnr: { uk: 'Bibliothèque numérique romande (французькою)', en: 'Bibliothèque numérique romande (French)', fr: 'Bibliothèque numérique romande (français)', ru: 'Bibliothèque numérique romande (по-французски)' },
    libBnrSource: { uk: 'Книги з Bibliothèque numérique romande — французька класика, вільне надбання, вичитана волонтерами.', en: 'Books from Bibliothèque numérique romande — French classics, public domain, proofread by volunteers.',
                    fr: 'Livres de la Bibliothèque numérique romande — classiques français du domaine public, relus par des bénévoles.', ru: 'Книги из Bibliothèque numérique romande — французская классика, общественное достояние, вычитана волонтёрами.' },
    libSourceLoc: { uk: 'Бібліотека Конгресу США (PDF, EPUB)', en: 'Library of Congress (PDF, EPUB)', fr: 'Bibliothèque du Congrès (PDF, EPUB)', ru: 'Библиотека Конгресса США (PDF, EPUB)' },
    libLocSource: { uk: 'Книги, оцифровані Бібліотекою Конгресу США (їхня колекція в Internet Archive): старі видання, вільне надбання. Скановані книги відкриваються як PDF.',
                    en: 'Books digitised by the Library of Congress (its collection on Internet Archive): old editions in the public domain. Scanned books open as PDF.',
                    fr: 'Livres numérisés par la Bibliothèque du Congrès (sa collection sur Internet Archive) : éditions anciennes du domaine public. Les livres scannés s’ouvrent en PDF.',
                    ru: 'Книги, оцифрованные Библиотекой Конгресса США (их коллекция в Internet Archive): старые издания, общественное достояние. Сканы открываются как PDF.' },
    libSourceSe: { uk: 'Standard Ebooks (англійською)', en: 'Standard Ebooks (English)', fr: 'Standard Ebooks (anglais)', ru: 'Standard Ebooks (по-английски)' },
    libSeSource: { uk: 'Книги з Standard Ebooks — англійська класика, вільне надбання, ретельно вичитані видання.', en: 'Books from Standard Ebooks — English classics, public domain, carefully proofread editions.',
                   fr: 'Livres de Standard Ebooks — classiques anglais du domaine public, éditions soigneusement relues.', ru: 'Книги из Standard Ebooks — английская классика, общественное достояние, тщательно вычитанные издания.' },
    libDownloading: { uk: 'Завантаження книги: {n} з {total} МБ…', en: 'Downloading the book: {n} of {total} MB…', fr: 'Téléchargement du livre : {n} sur {total} Mo…', ru: 'Загрузка книги: {n} из {total} МБ…' },
    libTooBig: { uk: 'Книга завелика для застосунку ({n} МБ, найбільше 300 МБ).', en: 'The book is too large for the app ({n} MB, 300 MB maximum).',
                 fr: 'Le livre est trop volumineux pour l’application ({n} Mo, 300 Mo maximum).', ru: 'Книга слишком большая для приложения ({n} МБ, максимум 300 МБ).' }
});
// Ключ теми = ключ у library-catalog.json (themes[]); бітова маска книги збігається з порядком там.
const LIBRARY_GENRES = [['', 'genAll'], ['fiction', 'genFiction'], ['adventure', 'genAdventure'], ['detective', 'genDetective'], ['historical', 'genHistorical'],
    ['love', 'genLove'], ['scifi', 'genScifi'], ['stories', 'genStories'], ['poetry', 'genPoetry'], ['drama', 'genDrama'], ['children', 'genChildren'],
    ['humor', 'genHumor'], ['biography', 'genBiography'], ['history', 'genHistory'], ['philosophy', 'genPhilosophy'], ['myth', 'genMyth'], ['travel', 'genTravel']];
const LIBRARY_LANGS = [['fr', '🇫🇷 Français'], ['en', '🇬🇧 English'], ['de', '🇩🇪 Deutsch'], ['es', '🇪🇸 Español'], ['it', '🇮🇹 Italiano'], ['', null]];
const LIBRARY_PAGE = 30;
// Вікіджерела (Wikisource): живий пошук через свій проксі; твір збирається з розділів-підсторінок в одну HTML-книгу.
const LIBRARY_WS_LANGS = [['uk', '🇺🇦 Українська'], ['fr', '🇫🇷 Français'], ['en', '🇬🇧 English'], ['de', '🇩🇪 Deutsch'], ['es', '🇪🇸 Español'], ['it', '🇮🇹 Italiano']];
const WS_MAX_CHAPTERS = 150, WS_CONCURRENCY = 6, WS_PAGE = 40;
// Жанри Вікіджерел — справжні категорії кожного мовного розділу (назви з «_» замість пробілів; пошук бере лише прямих членів
// категорії, тож підкатегорії перелічено явно). Жанру, якого в розділі немає (напр. детективів в українських), у списку не буде.
// Перевірено 2026-10-15 через categoryinfo: у кожній категорії є твори.
const LIBRARY_WS_GENRES = {
    uk: { stories: 'Оповідання', poetry: 'Поезія|Вірші|Поеми|Українська_поезія|Балади|Українські_балади', history: 'Історія|Історія_України',
          children: 'Казки|Українські_народні_казки|Дитяча_література|Дитячий_фольклор', biography: 'Спогади',
          myth: 'Легенди|Українські_народні_легенди|Міфи|Скандинавські_міфи|Байки' },
    fr: { fiction: 'Romans|Romans_français|Romans_de_mœurs', adventure: 'Romans_d’aventures', detective: 'Romans_policiers', historical: 'Romans_historiques',
          love: 'Romans_d’amour|Poèmes_d\'amour', scifi: 'Science-fiction', stories: 'Nouvelles|Contes', poetry: 'Poésie|Poèmes', drama: 'Théâtre|Comédies|Tragédies',
          children: 'Littérature_jeunesse', humor: 'Humour', biography: 'Biographies|Mémoires', history: 'Histoire', philosophy: 'Philosophie|Contes_philosophiques',
          myth: 'Mythologie|Fables', travel: 'Récits_de_voyage|Voyages' },
    en: { fiction: 'Novels|Novellas|Fiction', adventure: 'Adventure_novels|Adventure_short_stories|Adventure|Nautical_fiction|Sea_stories',
          detective: 'Detective_novels|Detective_short_stories|Mystery_novels|Mystery_short_stories|Mystery|Mystery_novellas',
          historical: 'Historical_fiction|Historical_fiction_novels|Historical_fiction_short_stories', love: 'Romance|Romance_novels|Love_poetry',
          scifi: 'Science_fiction|Science_fiction_novels|Science_fiction_short_stories|Science_fiction_novellas', stories: 'Short_stories', poetry: 'Poems|Poetry',
          drama: 'Plays|Drama|Comedy_plays', children: 'Children\'s_books|Children\'s_literature|Fairy_tales', humor: 'Humor|Humorous_short_stories|Humorous_poetry',
          biography: 'Biographies|Memoirs|Autobiographies', history: 'History', philosophy: 'Philosophy', myth: 'Mythology|Folk_tales|Fables', travel: 'Travel|Travelogues' },
    de: { fiction: 'Roman|Novelle', stories: 'Erzählung|Novelle|Anekdote|Schwank', poetry: 'Gedicht|Ballade', drama: 'Drama|Komödie', children: 'Märchen',
          humor: 'Humoreske|Satire|Schwank', biography: 'Biographie|Autobiographie', history: 'Geschichte', philosophy: 'Philosophie|Philosophische_Erzaehlungen',
          myth: 'Sage|Fabel', travel: 'Reisebericht' },
    es: { fiction: 'Novelas', scifi: 'Ciencia_ficción', stories: 'Cuentos', poetry: 'Poesías', drama: 'Teatro|Comedias', biography: 'Biografías|Memorias',
          history: 'Historia', philosophy: 'Filosofía|Ensayos', myth: 'Leyendas|Fábulas|Mitología', travel: 'Viajes_y_exploración' },
    it: { fiction: 'Romanzi|Novelle', adventure: 'Avventura', scifi: 'Fantascienza', stories: 'Racconti|Novelle', poetry: 'Poesie', drama: 'Teatro|Commedie|Tragedie',
          children: 'Fiabe|Letteratura_per_ragazzi', biography: 'Biografie|Memorie', history: 'Storia', philosophy: 'Filosofia', myth: 'Mitologia|Mitologia_greca|Favole' }
};
// Internet Archive: живий пошук через свій проксі; коди мов — як у самому архіві (MARC).
const LIBRARY_IA_LANGS = [['ukr', '🇺🇦 Українська'], ['eng', '🇬🇧 English'], ['fre', '🇫🇷 Français'], ['ger', '🇩🇪 Deutsch'], ['spa', '🇪🇸 Español'], ['ita', '🇮🇹 Italiano'], ['pol', '🇵🇱 Polski'], ['rus', '🇷🇺 Русский'], ['', null]];
const LIBRARY_MAX_BYTES = 300 * 1024 * 1024;
// Bibliothèque numérique romande і Standard Ebooks: живий пошук через свій проксі (він розбирає HTML їхнього пошуку); кожна — однією
// мовою, жанри — лише ті, що мають свої рубрики/теми там (той самий перелік, що BNR_GENRES і SE_GENRES у functions/api/library.js).
const LIBRARY_CATALOGS = {
    bnr: { langs: [['fr', '🇫🇷 Français']], genres: ['fiction', 'adventure', 'detective', 'historical', 'love', 'scifi', 'stories', 'poetry', 'drama', 'children', 'humor', 'biography', 'philosophy', 'travel'], note: 'libBnrSource' },
    se: { langs: [['en', '🇬🇧 English']], genres: ['fiction', 'adventure', 'detective', 'scifi', 'stories', 'poetry', 'drama', 'children', 'humor', 'biography', 'philosophy', 'travel'], note: 'libSeSource' }
};
const LIBRARY_SOURCES = ['gutenberg', 'wikisource', 'archive', 'loc', 'bnr', 'se', 'shelf'];
// Standard Ebooks відповідає серверам Cloudflare кодом 403, але дозволяє браузерам (Access-Control-Allow-Origin: *): пошук, обкладинки
// й EPUB беруться прямо з пристрою (CSP у _headers дозволяє лише https://standardebooks.org — для даних і картинок, не для коду).
// Теми — ті самі, що SE_GENRES у functions/api/library.js; id і шлях обкладинки перевіряються тими самими виразами.
const SE_SITE = 'https://standardebooks.org';
const SE_TAGS = { fiction: 'fiction', adventure: 'adventure', detective: 'mystery', scifi: 'science-fiction', stories: 'shorts', poetry: 'poetry',
    drama: 'drama', children: 'childrens', humor: 'comedy', biography: 'biography', philosophy: 'philosophy', travel: 'travel' };
const SE_BOOK_ID = /^[a-z0-9_-]{1,120}(\/[a-z0-9_-]{1,120}){1,4}$/, SE_COVER_PATH = /^[a-z0-9_-]{1,300}\/[0-9a-f]{40}\/cover\.jpg$/;

const libraryState = { source: 'gutenberg', topic: '', wsSeen: null, wsToken: 0, page: 1, hasMore: false, timer: 0, busy: false, catalog: null, loading: null, matches: [] };
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
    const src = document.createElement('select'); src.id = 'library-source'; src.dataset.i18nTitle = 'libSourceLabel';
    for (const [value, key] of [['shelf', 'shelfSource'], ['gutenberg', 'libSourceGutenberg'], ['wikisource', 'libSourceWikisource'], ['archive', 'libSourceArchive'], ['loc', 'libSourceLoc'], ['bnr', 'libSourceBnr'], ['se', 'libSourceSe']]) { const o = document.createElement('option'); o.value = value; o.dataset.i18n = key; src.append(o); }
    const q = document.createElement('input'); q.type = 'search'; q.id = 'library-q'; q.autocomplete = 'off'; q.spellcheck = false;
    const lang = document.createElement('select'); lang.id = 'library-lang';
    for (const [code, label] of LIBRARY_LANGS) { const o = document.createElement('option'); o.value = code; if (label) o.textContent = label; else o.dataset.i18n = 'libAllLangs'; lang.append(o); }
    const genre = document.createElement('select'); genre.id = 'library-genre';
    tools.append(src, q, lang, genre);
    const status = document.createElement('div'); status.id = 'library-status'; status.setAttribute('aria-live', 'polite');
    const list = document.createElement('div'); list.id = 'library-list';
    const more = document.createElement('button'); more.type = 'button'; more.id = 'library-more'; more.className = 'btn'; more.hidden = true; more.dataset.i18n = 'libMore';
    more.addEventListener('click', () => runLibrarySearch(libraryState.page + 1));
    const source = document.createElement('div'); source.className = 'library-source'; source.dataset.i18n = 'libSource';
    box.append(head, tools, status, list, more, source); modal.append(box); document.body.append(modal);
    const saved = (() => { try { return JSON.parse(localStorage.getItem('reader_library_filters') || '{}'); } catch (e) { return {}; } })();
    libraryState.source = LIBRARY_SOURCES.includes(saved.source) ? saved.source : 'gutenberg';
    libraryState.langBySource = { gutenberg: saved.lang !== undefined ? saved.lang : 'fr', wikisource: saved.wsLang || 'uk', archive: saved.iaLang !== undefined ? saved.iaLang : 'ukr', loc: saved.locLang || '' };
    src.value = libraryState.source;
    libraryState.topic = LIBRARY_GENRES.some(([topic]) => topic && topic === saved.topic) ? saved.topic : '';
    fillLibraryLangs();
    // Жанр зберігається один на всі джерела: якщо в цьому джерелі/мові його немає, список показує «Усі жанри», але вибір не губиться.
    const persist = () => { try { localStorage.setItem('reader_library_filters', JSON.stringify({ source: libraryState.source, lang: libraryState.langBySource.gutenberg, wsLang: libraryState.langBySource.wikisource, iaLang: libraryState.langBySource.archive, locLang: libraryState.langBySource.loc, topic: libraryState.topic })); } catch (e) {} };
    const restart = (e) => {
        libraryState.langBySource[libraryState.source] = lang.value;
        if (e && e.target === genre) libraryState.topic = genre.value;
        if (e && e.target === lang) fillLibraryGenres();   // жанри Вікіджерел залежать від мови розділу
        persist();
        clearTimeout(libraryState.timer); libraryState.timer = setTimeout(() => runLibrarySearch(1), libraryState.source === 'gutenberg' ? 350 : 600);
    };
    src.addEventListener('change', () => { libraryState.source = src.value; fillLibraryLangs(); persist(); libraryEl('library-list').replaceChildren(); runLibrarySearch(1); });
    q.addEventListener('input', restart); lang.addEventListener('change', restart); genre.addEventListener('change', restart);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && libraryEl('library-modal')?.classList.contains('open')) closeLibrary(); });
    applyI18n(); q.placeholder = t('libSearch');
}

// Жанри: Gutenberg і Internet Archive — усі; Вікіджерела — лише ті, що мають категорії в розділі вибраної мови.
function fillLibraryGenres() {
    const genre = libraryEl('library-genre'), src = libraryState.source;
    const ws = src === 'wikisource' ? LIBRARY_WS_GENRES[libraryEl('library-lang').value] || {} : null;
    const cat = LIBRARY_CATALOGS[src];
    genre.replaceChildren();
    for (const [topic, key] of LIBRARY_GENRES) {
        if (ws && topic && !ws[topic]) continue;
        if (cat && topic && !cat.genres.includes(topic)) continue;
        const o = document.createElement('option'); o.value = topic; o.dataset.i18n = key; o.textContent = t(key); genre.append(o);
    }
    genre.value = [...genre.options].some(o => o.value === libraryState.topic) ? libraryState.topic : '';
    genre.hidden = src === 'shelf';
}
// Список мов — за джерелом (мови в кожного джерела свої), за ним — жанри.
function fillLibraryLangs() {
    const lang = libraryEl('library-lang'), src = libraryState.source;
    lang.replaceChildren();
    for (const [code, label] of src === 'wikisource' ? LIBRARY_WS_LANGS : src === 'archive' || src === 'loc' ? LIBRARY_IA_LANGS : LIBRARY_CATALOGS[src] ? LIBRARY_CATALOGS[src].langs : LIBRARY_LANGS) { const o = document.createElement('option'); o.value = code; if (label) o.textContent = label; else { o.dataset.i18n = 'libAllLangs'; o.textContent = t('libAllLangs'); } lang.append(o); }
    const want = libraryState.langBySource[libraryState.source];
    lang.value = [...lang.options].some(o => o.value === want) ? want : lang.options[0].value;
    fillLibraryGenres();
    // «Мої книги» — збережені на пристрої книги: без пошуку, мов і підпису джерела.
    lang.hidden = src === 'shelf'; libraryEl('library-q').hidden = src === 'shelf';
    const source = document.querySelector('#library-modal .library-source');
    if (source) { source.hidden = src === 'shelf'; source.dataset.i18n = src === 'wikisource' ? 'libWsSource' : src === 'archive' ? 'libIaSource' : src === 'loc' ? 'libLocSource' : LIBRARY_CATALOGS[src] ? LIBRARY_CATALOGS[src].note : 'libSource'; source.textContent = t(source.dataset.i18n); }
}

// source — одразу відкрити це джерело (кнопка «📖 Мої книги» в меню відкриває збережені на пристрої книги).
function openLibrary(source = null) {
    buildLibrary();
    if (source && LIBRARY_SOURCES.includes(source) && source !== libraryState.source) {
        const select = libraryEl('library-source'); select.value = source; select.dispatchEvent(new Event('change'));
    }
    libraryEl('library-modal').classList.add('open');
    libraryEl('library-q').placeholder = t('libSearch');
    if (!libraryEl('library-list').children.length || libraryState.source === 'shelf') runLibrarySearch(1);
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
    if (libraryState.source === 'wikisource') { await runWikisourceSearch(page); return; }
    if (libraryState.source === 'archive' || libraryState.source === 'loc') { await runArchiveSearch(page); return; }
    if (LIBRARY_CATALOGS[libraryState.source]) { await runCatalogSearch(libraryState.source, page); return; }
    if (libraryState.source === 'shelf') { await runShelfList(); return; }
    let catalog;
    try { status.textContent = libraryState.catalog ? '' : t('libLoading'); catalog = await loadLibraryCatalog(); }
    catch (e) { status.textContent = t('libError'); return; }
    if (libraryState.source !== 'gutenberg') return;   // поки вантажився каталог, читач перемкнувся на інше джерело
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
    const cover = document.createElement('img'); cover.loading = 'lazy'; cover.alt = '';
    if (book.ia) cover.src = '/api/library?op=ia-cover&id=' + encodeURIComponent(book.id);
    else if (book.cat === 'se') { if (SE_COVER_PATH.test(book.cover || '')) { cover.referrerPolicy = 'no-referrer'; cover.src = `${SE_SITE}/images/covers/${book.cover}`; } else cover.style.visibility = 'hidden'; }
    else if (book.cat) { if (book.cover) cover.src = `/api/library?op=${book.cat}-cover&path=` + encodeURIComponent(book.cover); else cover.style.visibility = 'hidden'; }
    else if (book.ws) { cover.className = 'library-ws-cover'; cover.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="64"><rect width="44" height="64" rx="4" fill="#6b7a8f"/><text x="22" y="40" font-size="22" text-anchor="middle" fill="#fff">W</text></svg>'); }
    else cover.src = '/api/library?op=cover&id=' + book.id;
    cover.addEventListener('error', () => cover.style.visibility = 'hidden');
    const info = document.createElement('div'); info.className = 'library-info';
    const name = document.createElement('div'); name.className = 'library-name'; name.textContent = book.title;
    const by = document.createElement('div'); by.className = 'library-author';
    by.textContent = book.ws ? 'Wikisource · ' + book.lang.toUpperCase()
        : book.ia ? [(book.authors || []).join('; '), book.year, [book.pdf && 'PDF', book.epub && 'EPUB'].filter(Boolean).join(' · ')].filter(Boolean).join(' · ')
        : (book.authors || []).join(', ');
    info.append(name, by);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn-primary'; btn.textContent = t('libRead');
    btn.addEventListener('click', () => downloadLibraryBook(book, btn));
    const save = document.createElement('button'); save.type = 'button'; save.className = 'library-save'; save.textContent = t('libSave'); save.title = t('libSaveTitle');
    save.addEventListener('click', () => saveLibraryBook(book, save));
    const actions = document.createElement('div'); actions.className = 'library-actions'; actions.append(btn, save);
    card.append(cover, info, actions);
    return card;
}

// Файл книги: завантажується один раз за сеанс (і для читання, і для збереження).
const libraryFiles = new Map();
const wsProgress = book => (n, total) => { libraryEl('library-status').textContent = t('libWsChapters').replace('{n}', n).replace('{total}', total); };
function libraryFileName(book, ext = 'epub') { return book.title.replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80).trim() + '.' + ext; }
async function fetchLibraryFile(book, onProgress = () => {}) {
    const cacheKey = book.ws ? 'ws:' + book.lang + ':' + book.title : book.ia ? 'ia:' + book.id : book.cat ? book.cat + ':' + book.id : book.id;
    if (libraryFiles.has(cacheKey)) return libraryFiles.get(cacheKey);
    if (book.cat) {
        if (book.cat === 'se' && !SE_BOOK_ID.test(book.id)) throw new Error('bad id');
        const res = await fetch(book.cat === 'se' ? `${SE_SITE}/ebooks/${book.id}/downloads/${book.id.replace(/\//g, '_')}.epub?source=download`
            : `/api/library?op=${book.cat}-file&id=` + encodeURIComponent(book.id), { credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        let h = 0; for (const ch of cacheKey) h = (h * 31 + ch.codePointAt(0)) >>> 0;
        // Той самий id → той самий «ключ книги»: позиція читання переживає повторне завантаження.
        const file = new File([blob], libraryFileName(book), { type: 'application/epub+zip', lastModified: h });
        libraryFiles.set(cacheKey, file);
        if (libraryFiles.size > 3) libraryFiles.delete(libraryFiles.keys().next().value);
        return file;
    }
    if (book.ia) {
        const file = await fetchArchiveBook(book);
        libraryFiles.set(cacheKey, file);
        if (libraryFiles.size > 3) libraryFiles.delete(libraryFiles.keys().next().value);
        return file;
    }
    if (book.ws) {
        const file = await buildWikisourceBook(book, onProgress);
        libraryFiles.set(cacheKey, file);
        if (libraryFiles.size > 3) libraryFiles.delete(libraryFiles.keys().next().value);
        return file;
    }
    const res = await fetch('/api/library?op=file&id=' + encodeURIComponent(book.id));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    // Той самий id → той самий «ключ книги» (назва+розмір+lastModified): позиція читання переживає повторне завантаження.
    const file = new File([blob], libraryFileName(book), { type: 'application/epub+zip', lastModified: book.id });
    libraryFiles.set(book.id, file);
    if (libraryFiles.size > 3) libraryFiles.delete(libraryFiles.keys().next().value);
    return file;
}
// Зберегти книгу на пристрій: де браузер уміє (комп'ютер) — у теку, яку читач вибере сам; інакше (Android) — звичайним
// завантаженням у теку «Завантаження».
async function saveLibraryBook(book, btn) {
    if (btn.disabled) return;
    btn.disabled = true; const label = btn.textContent; btn.textContent = t('libLoading');
    const status = libraryEl('library-status');
    try {
        const file = await fetchLibraryFile(book, wsProgress(book));
        if (typeof window.showSaveFilePicker === 'function') {
            let handle;
            const types = /\.pdf$/i.test(file.name) ? [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }] : [{ description: 'EPUB', accept: { 'application/epub+zip': ['.epub'] } }];
            try { handle = await window.showSaveFilePicker({ suggestedName: file.name, types }); }
            catch (e) { if (e && e.name === 'AbortError') return; handle = null; }
            if (handle) {
                const w = await handle.createWritable(); await w.write(file); await w.close();
                status.textContent = t('libSaved'); return;
            }
        }
        const url = URL.createObjectURL(file), a = document.createElement('a');
        a.href = url; a.download = file.name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        status.textContent = t('libSavedDownloads');
    } catch (e) {
        status.textContent = e && e.libraryMessage || t('libBookError');
    } finally {
        btn.disabled = false; btn.textContent = label;
    }
}

async function downloadLibraryBook(book, btn) {
    if (libraryState.busy) return;
    libraryState.busy = true; btn.disabled = true; btn.textContent = t('libLoading');
    try {
        const file = await fetchLibraryFile(book, wsProgress(book));
        libraryEl('library-status').textContent = '';
        closeLibrary();
        await openBookFile(file);
    } catch (e) {
        libraryEl('library-status').textContent = e && e.libraryMessage || t('libBookError');
    } finally {
        libraryState.busy = false; btn.disabled = false; btn.textContent = t('libRead');
    }
}
// ---------- Вікіджерела ----------
// Результати пошуку часто є розділами («Твір/II»): показуємо сам твір (корінь назви) один раз, у порядку релевантності.
// Жанр — категорії розділу (LIBRARY_WS_GENRES); з жанром пошук працює й без запиту: тоді це просто перелік творів жанру.
async function runWikisourceSearch(page = 1) {
    const status = libraryEl('library-status'), list = libraryEl('library-list'), more = libraryEl('library-more');
    const q = libraryEl('library-q').value.trim(), lang = libraryEl('library-lang').value;
    const cats = (LIBRARY_WS_GENRES[lang] || {})[libraryEl('library-genre').value] || '';
    const token = ++libraryState.wsToken;
    if (page === 1) { list.replaceChildren(); libraryState.wsSeen = new Set(); }
    if (!q && !cats) { status.textContent = t('libWsHint'); return; }
    status.textContent = t('libLoading');
    let data;
    try {
        const res = await fetch(`/api/library?op=ws-search&lang=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}` + (cats ? '&cats=' + encodeURIComponent(cats) : '') + (page > 1 ? '&page=' + page : ''));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json();
    } catch (e) { if (token === libraryState.wsToken) status.textContent = t('libError'); return; }
    if (token !== libraryState.wsToken || libraryState.source !== 'wikisource') return;
    libraryState.page = page;
    // Твір показуємо один раз на весь перелік, навіть якщо його розділи трапляються на різних сторінках результатів.
    for (const r of data.results || []) {
        const root = String(r.title || '').split('/')[0];
        if (!root || libraryState.wsSeen.has(root)) continue;
        libraryState.wsSeen.add(root);
        list.append(libraryCard({ ws: true, lang, title: root, words: r.title === root ? r.words : 0 }));
    }
    status.textContent = list.children.length ? '' : t('libEmpty');
    more.hidden = page * WS_PAGE >= (data.total || 0);
}
async function wsPage(lang, title) {
    const res = await fetch(`/api/library?op=ws-page&lang=${encodeURIComponent(lang)}&title=${encodeURIComponent(title)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return new DOMParser().parseFromString(await res.text(), 'text/html');
}
// Посилання сторінки на її власні підсторінки (розділи) — у порядку тексту.
function wsSubpageLinks(doc, title) {
    const prefix = title.replace(/ /g, '_') + '/', out = [];
    for (const a of doc.querySelectorAll('a[href^="./"]')) {
        let target = decodeURIComponent(a.getAttribute('href').slice(2).split('#')[0]);
        if (target.startsWith(prefix) && !out.includes(target.replace(/_/g, ' '))) out.push(target.replace(/_/g, ' '));
    }
    return out;
}
// Чистий текст розділу: без шапки-навігації Вікіджерел, номерів сторінок, посилань для редагування, зображень і скриптів.
function wsCleanBody(doc) {
    const body = doc.body.cloneNode(true);
    body.querySelectorAll('script, style, link, meta, img, figure, .ws-noexport, .noprint, .wst-header, .ws-header, #headertemplate, .headertemplate, .mw-editsection, .pagenum, .ws-pagenum, .mw-cite-backlink, .navbox, .metadata').forEach(n => n.remove());
    body.querySelectorAll('a').forEach(a => a.replaceWith(...a.childNodes));
    body.querySelectorAll('[style]').forEach(n => n.removeAttribute('style'));
    body.querySelectorAll('section, div').forEach(n => { if (!n.textContent.trim()) n.remove(); });
    return body.innerHTML;
}
// Список підсторінок від API іде за абеткою («Chapter 1, Chapter 10, Chapter 11…»): впорядковуємо за числом, римські — за значенням.
function wsRoman(s) { const v = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }; let n = 0; s = s.toLowerCase(); for (let i = 0; i < s.length; i++) { const a = v[s[i]], b = v[s[i + 1]] || 0; n += a < b ? -a : a; } return n; }
function wsNaturalOrder(pages, title) {
    const key = p => p.slice(title.length + 1);
    if (pages.length && pages.every(p => /^[ivxlcdm]+\.?$/i.test(key(p)))) return pages.slice().sort((a, b) => wsRoman(key(a).replace('.', '')) - wsRoman(key(b).replace('.', '')));
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return pages.slice().sort((a, b) => collator.compare(key(a), key(b)));
}
const wsEscape = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
// Збирає твір: сторінка-зміст → її розділи (до 2 рівнів вкладеності, не більше WS_MAX_CHAPTERS) → одна HTML-книга з <h1> на розділ.
async function buildWikisourceBook(book, onProgress) {
    const root = await wsPage(book.lang, book.title);
    let chapters = wsSubpageLinks(root, book.title);
    if (!chapters.length) {
        try { const r = await fetch(`/api/library?op=ws-subpages&lang=${encodeURIComponent(book.lang)}&title=${encodeURIComponent(book.title)}`); if (r.ok) chapters = wsNaturalOrder((await r.json()).pages || [], book.title); } catch (e) {}
    }
    // Сторінка версій: підсторінки — це різні ВИДАННЯ того самого твору («Beuchot 1829», «Garnier 1877»), а не томи. Беремо
    // одне видання (останнє — зазвичай повніше вичитане), інакше книга містила б той самий текст двічі.
    if (chapters.length >= 2 && chapters.length <= 6 && chapters.every(c => /\b(1[5-9]|20)\d\d\b/.test(c.slice(book.title.length + 1)))) chapters = [chapters[chapters.length - 1]];
    const parts = [];
    if (!chapters.length) parts.push({ title: '', html: wsCleanBody(root) });
    else {
        const queue = chapters.slice(0, WS_MAX_CHAPTERS).map(title => ({ title, depth: 1 }));
        const results = new Map();
        let done = 0, i = 0;
        const worker = async () => {
            while (i < queue.length) {
                const item = queue[i++];
                try {
                    const doc = await wsPage(book.lang, item.title);
                    const subs = item.depth < 3 ? wsSubpageLinks(doc, item.title) : [];
                    // Сторінка-зміст тому («Том 1» зі списком книг) — замість неї її власні розділи.
                    if ((subs.length >= 3 || (subs.length && doc.body.textContent.trim().length < 3000)) && queue.length < WS_MAX_CHAPTERS) {
                        const at = queue.indexOf(item);
                        queue.splice(at + 1, 0, ...subs.slice(0, WS_MAX_CHAPTERS - queue.length).map(title => ({ title, depth: item.depth + 1 })));
                        item.container = true;
                        results.set(item, null);
                    } else results.set(item, wsCleanBody(doc));
                } catch (e) { results.set(item, null); }
                done++; onProgress(done, queue.length);
            }
        };
        await Promise.all(Array.from({ length: WS_CONCURRENCY }, worker));
        for (const item of queue) {
            const html = results.get(item);
            if (html) parts.push({ title: item.title.split('/').pop(), html, depth: item.depth - 1 });
            else if (item.container) parts.push({ title: item.title.split('/').pop(), html: null, depth: item.depth - 1 });
        }
    }
    if (!parts.some(p => p.html && p.html.replace(/<[^>]+>/g, '').trim().length > 40)) throw new Error('empty');
    const author = (root.querySelector('#ws-author') || {}).textContent;
    return wsEpubFile(book, parts, { author: author ? author.replace(/\s+/g, ' ').trim().slice(0, 200) : '' });
}

// ---------- Вікіджерела → справжній EPUB 3 (власник, 2026-10-31: «бібліотека стандарт ебук не відповідає») ----------
// Раніше розділи склеювались в один HTML-файл: без змісту за стандартом, без автора й джерела, і збережена книга не
// відкривалась у інших читалках як книга. Тепер збирається EPUB 3 в браузері (JSZip уже в застосунку): кожен розділ —
// окремий XHTML у порядку читання, nav.xhtml і toc.ncx (для старих читалок) з назв розділів зі збереженою вкладеністю
// (том без власного тексту — заголовок-<span> над своїми розділами), опис з назвою, мовою, автором, адресою джерела.
// Файл ДЕТЕРМІНОВАНИЙ: однаковий текст дає однаковий розмір (дата в описі фіксованої довжини, опис і mimetype без
// стиснення, сталі дати записів архіву) — «ключ книги» (назва + розмір + lastModified) не змінюється від повторного
// завантаження, і місце читання переживає його, як і раніше.
const WS_EPUB_ENTRY_DATE = new Date(Date.UTC(2000, 0, 1));
const wsXml = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
// HTML розділу → коректний XHTML: розбір як HTML, серіалізація як XML. Обробники подій і javascript:-посилання
// прибираються ще й тут: файл можуть відкрити інші читалки, де нашого safeHtml немає.
function wsChapterXhtml(title, html, lang) {
    const doc = new DOMParser().parseFromString('<!DOCTYPE html><html><head><title></title></head><body></body></html>', 'text/html');
    doc.documentElement.setAttribute('lang', lang);
    doc.title = title;
    doc.body.innerHTML = (title ? `<h1>${wsEscape(title)}</h1>\n` : '') + html;
    for (const el of doc.body.querySelectorAll('*')) {
        for (const attr of Array.from(el.attributes)) {
            if (/^on/i.test(attr.name) || /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
        }
    }
    const xml = new XMLSerializer().serializeToString(doc.documentElement).replace('<html ', `<html xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${wsXml(lang)}" `);
    return '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n' + xml;
}
// Плаский список {title, href|null, depth} → вкладені <ol> навігаційного документа. Заголовок без файлу — <span>,
// і стандарт вимагає, щоб у нього був вкладений список: заголовок без жодного розділу під ним відкидається.
function wsNavEntries(entries) {
    return entries.filter((e, i) => e.href || (entries[i + 1] && entries[i + 1].depth > e.depth));
}
function wsNavOl(entries) {
    let html = '', depth = -1;
    for (const e of entries) {
        const d = Math.min(e.depth, depth + 1);
        if (d > depth) html += '<ol>';
        else { html += '</li>'; for (let k = depth; k > d; k--) html += '</ol></li>'; }
        html += '<li>' + (e.href ? `<a href="${e.href}">${wsXml(e.title)}</a>` : `<span>${wsXml(e.title)}</span>`);
        depth = d;
    }
    if (depth >= 0) { html += '</li>'; for (let k = depth; k > 0; k--) html += '</ol></li>'; html += '</ol>'; }
    return html;
}
function wsNcxPoints(entries) {
    let xml = '', depth = -1, order = 0;
    entries.forEach((e, i) => {
        const d = Math.min(e.depth, depth + 1);
        if (d <= depth) { xml += '</navPoint>'; for (let k = depth; k > d; k--) xml += '</navPoint>'; }
        // Заголовок тому веде на свій перший розділ: у NCX кожен пункт мусить мати адресу.
        const src = e.href || (entries.slice(i + 1).find(x => x.href) || {}).href;
        order++;
        xml += `<navPoint id="np${order}" playOrder="${order}"><navLabel><text>${wsXml(e.title)}</text></navLabel><content src="${src}"/>`;
        depth = d;
    });
    for (let k = depth; k >= 0; k--) xml += '</navPoint>';
    return xml;
}
async function wsEpubFile(book, parts, meta) {
    const lang = book.lang, source = `https://${lang}.wikisource.org/wiki/${encodeURIComponent(book.title.replace(/ /g, '_'))}`;
    const zip = new JSZip();
    const opts = { date: WS_EPUB_ENTRY_DATE };
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE', date: WS_EPUB_ENTRY_DATE });
    zip.file('META-INF/container.xml', '<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>', opts);
    const chapters = [], entries = [];
    for (const part of parts) {
        if (!part.html) { entries.push({ title: part.title, href: null, depth: part.depth || 0 }); continue; }
        const name = `c${String(chapters.length + 1).padStart(3, '0')}.xhtml`;
        const title = part.title || book.title;
        chapters.push(name);
        zip.file('OEBPS/' + name, wsChapterXhtml(part.title ? title : '', part.html, lang), opts);
        entries.push({ title, href: name, depth: part.depth || 0 });
    }
    const nav = wsNavEntries(entries);
    zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${wsXml(lang)}" xml:lang="${wsXml(lang)}"><head><title>${wsXml(book.title)}</title></head><body><nav epub:type="toc" id="toc"><h1>${wsXml(book.title)}</h1>${wsNavOl(nav)}</nav></body></html>`, opts);
    zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="utf-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${wsXml(lang)}"><head><meta name="dtb:uid" content="${wsXml(source)}"/></head><docTitle><text>${wsXml(book.title)}</text></docTitle><navMap>${wsNcxPoints(nav)}</navMap></ncx>`, opts);
    const modified = new Date().toISOString().replace(/\.\d+Z$/, 'Z');   // завжди 20 знаків: розмір опису від дати не залежить
    const manifest = chapters.map((c, i) => `<item id="c${i + 1}" href="${c}" media-type="application/xhtml+xml"/>`).join('');
    const spine = chapters.map((c, i) => `<itemref idref="c${i + 1}"/>`).join('');
    const opf = `<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${wsXml(lang)}">`
        + `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">${wsXml(source)}</dc:identifier><dc:title>${wsXml(book.title)}</dc:title>`
        + `<dc:language>${wsXml(lang)}</dc:language>${meta.author ? `<dc:creator>${wsXml(meta.author)}</dc:creator>` : ''}<dc:source>${wsXml(source)}</dc:source>`
        + `<dc:publisher>Wikisource</dc:publisher><meta property="dcterms:modified">${modified}</meta></metadata>`
        + `<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>${manifest}</manifest>`
        + `<spine toc="ncx">${spine}</spine></package>`;
    zip.file('OEBPS/content.opf', opf, { compression: 'STORE', date: WS_EPUB_ENTRY_DATE });
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    let h = 0; for (const ch of book.lang + ':' + book.title) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return new File([blob], libraryFileName(book), { type: 'application/epub+zip', lastModified: h });
}

// ---------- Internet Archive ----------
async function runArchiveSearch(page) {
    const status = libraryEl('library-status'), list = libraryEl('library-list'), more = libraryEl('library-more');
    const q = libraryEl('library-q').value.trim(), lang = libraryEl('library-lang').value, topic = libraryEl('library-genre').value;
    const src = libraryState.source;   // 'archive' — увесь архів; 'loc' — лише книги Бібліотеки Конгресу (їх можна гортати й без запиту)
    const token = ++libraryState.wsToken;
    if (page === 1) list.replaceChildren();
    if (!q && !topic && src !== 'loc') { status.textContent = t('libIaHint'); return; }
    status.textContent = t('libLoading');
    let data;
    try {
        const res = await fetch(`/api/library?op=ia-search&lang=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}&page=${page}` + (topic ? '&genre=' + topic : '') + (src === 'loc' ? '&coll=loc' : ''));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json();
    } catch (e) { if (token === libraryState.wsToken) status.textContent = t('libError'); return; }
    if (token !== libraryState.wsToken || libraryState.source !== src) return;
    libraryState.page = page;
    for (const r of data.results || []) list.append(libraryCard({ ia: true, id: r.id, title: r.title, authors: r.creator, year: r.year, pdf: r.pdf, epub: r.epub }));
    status.textContent = list.children.length ? '' : t('libEmpty');
    more.hidden = page * 30 >= (data.total || 0);
}
// ---------- Bibliothèque numérique romande, Standard Ebooks ----------
// Без запиту й жанру — найновіші (BNR) чи найпопулярніші (Standard Ebooks) книги, тож бібліотеку можна просто гортати.
async function runCatalogSearch(kind, page) {
    const status = libraryEl('library-status'), list = libraryEl('library-list'), more = libraryEl('library-more');
    const q = libraryEl('library-q').value.trim(), topic = libraryEl('library-genre').value;
    const token = ++libraryState.wsToken;
    if (page === 1) list.replaceChildren();
    status.textContent = t('libLoading');
    let data;
    try {
        if (kind === 'se') data = await searchStandardEbooks(q, topic, page);
        else {
            const res = await fetch(`/api/library?op=${kind}-search&q=${encodeURIComponent(q)}&page=${page}` + (topic ? '&genre=' + topic : ''));
            if (!res.ok) throw new Error('HTTP ' + res.status);
            data = await res.json();
        }
    } catch (e) { if (token === libraryState.wsToken) status.textContent = t('libError'); return; }
    if (token !== libraryState.wsToken || libraryState.source !== kind) return;
    libraryState.page = page;
    for (const r of data.results || []) list.append(libraryCard({ cat: kind, id: r.id, title: r.title, authors: r.author ? [r.author] : [], cover: r.cover }));
    status.textContent = list.children.length ? '' : t('libEmpty');
    more.hidden = !data.more;
}
// Сторінка пошуку Standard Ebooks (у них немає API) розбирається як ТЕКСТ тими самими виразами, що й у проксі: нічого з неї не
// вставляється в сторінку як HTML, назви проходять через DOMParser лише для розкодування сутностей (&amp; тощо).
async function searchStandardEbooks(q, topic, page) {
    const res = await fetch(`${SE_SITE}/ebooks?query=${encodeURIComponent(q)}&sort=${q ? 'relevance' : 'popularity'}&page=${page}`
        + (SE_TAGS[topic] ? '&tags[]=' + SE_TAGS[topic] : ''), { credentials: 'omit', referrerPolicy: 'no-referrer' });   // tags[] — саме з дужками
    if (res.status === 404) return { results: [], more: false };
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text(), results = [];
    const text = s => new DOMParser().parseFromString(String(s), 'text/html').documentElement.textContent.replace(/\s+/g, ' ').trim();
    for (const part of html.split('<li typeof="schema:Book"').slice(1)) {
        const m = part.match(/^\s*about="\/ebooks\/([^"]+)"/);
        if (!m || !SE_BOOK_ID.test(m[1])) continue;
        const names = [...part.matchAll(/property="schema:name">([^<]*)</g)].map(x => text(x[1]));
        const cover = part.match(/\/images\/covers\/([a-z0-9_-]{1,300}\/[0-9a-f]{40}\/cover\.jpg)/);
        results.push({ id: m[1], title: (names[0] || m[1]).slice(0, 300), author: names.slice(1, 4).join(', ').slice(0, 200), cover: cover ? cover[1] : '' });
    }
    return { results, more: /rel="next"/.test(html) };
}
// Скановані книги — «Text PDF» (сторінки як в оригіналі + текстовий шар, тож слова можна торкати), бо EPUB архіву для них —
// автоматичний OCR зі зламаною версткою. Книги, що від початку електронні, — EPUB.
function pickArchiveFile(info) {
    const files = (info.files || []).filter(f => f.size > 0);
    const pdf = files.filter(f => f.format === 'Text PDF' || f.format === 'Additional Text PDF').sort((a, b) => a.size - b.size)[0];
    const epub = files.filter(f => f.format === 'EPUB').sort((a, b) => a.size - b.size)[0];
    return info.scan ? (pdf || epub) : (epub || pdf);
}
async function fetchArchiveBook(book) {
    const status = libraryEl('library-status');
    const infoRes = await fetch('/api/library?op=ia-files&id=' + encodeURIComponent(book.id));
    if (!infoRes.ok) throw new Error('HTTP ' + infoRes.status);
    const chosen = pickArchiveFile(await infoRes.json());
    if (!chosen) throw new Error('no file');
    const mb = n => (n / 1048576).toFixed(n < 10485760 ? 1 : 0);
    if (chosen.size > LIBRARY_MAX_BYTES) throw Object.assign(new Error('too big'), { libraryMessage: t('libTooBig').replace('{n}', mb(chosen.size)) });
    const res = await fetch(`/api/library?op=ia-file&id=${encodeURIComponent(book.id)}&name=${encodeURIComponent(chosen.name)}`);
    if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
    // Скани бувають десятки мегабайтів: показуємо, скільки вже завантажено.
    const reader = res.body.getReader(), chunks = [];
    let got = 0, shown = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        if (got - shown > 262144) { shown = got; status.textContent = t('libDownloading').replace('{n}', mb(got)).replace('{total}', mb(chosen.size)); }
    }
    const isPdf = /\.pdf$/i.test(chosen.name);
    let h = 0; for (const ch of 'ia:' + book.id) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    // Той самий id → той самий «ключ книги»: позиція читання переживає повторне завантаження.
    return new File(chunks, libraryFileName(book, isPdf ? 'pdf' : 'epub'), { type: isPdf ? 'application/pdf' : 'application/epub+zip', lastModified: h });
}

buildLibrary();
