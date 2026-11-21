// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
/* saved-links.js — «Мої посилання»: збережені QR-коди й адреси сторінок із вправами (власник, 2026-11-21: «в застосунку
 * мати закладку зі збереженими QR-кодами сайтів або їхніх сторінок, де знаходяться ті вправи, які мені цікаві, і на
 * які я в будь-який момент можу перейти»).
 *
 * Звідки беруться: ☆ на рамці QR-коду сторінки PDF (js/pdf-qr.js) — разом із книгою й сторінкою, де код надруковано;
 * або адреса, вставлена вручну у вкладці. Де видно: третя вкладка полиці «Мої книги» (js/book-shelf.js — стартовий
 * екран і вікно бібліотеки). Посилання відкривається звичайним <a target=_blank> (місце в книзі запам'ятовується,
 * rememberReadingSpot); «📖» відкриває книгу на сторінці з цим QR-кодом. Лише http(s). Список лежить у localStorage
 * (reader_saved_links) і синхронізується між пристроями як налаштування (js/sync.js SYNC_SETTINGS).
 */
Object.assign(I18N, {
    shelfLinks: { uk: 'Посилання', en: 'Links', fr: 'Liens', ru: 'Ссылки', zh: '链接', ko: '링크', hi: 'लिंक', ga: 'Naisc', es: 'Enlaces' },
    linksEmpty: { uk: 'Тут будуть сайти й сторінки з вправами. Натисніть ☆ на рамці QR-коду в книзі або вставте адресу нижче.', en: 'Sites and exercise pages will be here. Tap ☆ on a QR code frame in a book or paste an address below.', fr: "Les sites et pages d'exercices apparaîtront ici. Touchez ☆ sur le cadre d'un code QR dans un livre ou collez une adresse ci-dessous.", ru: 'Здесь будут сайты и страницы с упражнениями. Нажмите ☆ на рамке QR-кода в книге или вставьте адрес ниже.', zh: '这里会显示网站和练习页面。点按书中二维码框上的 ☆，或在下方粘贴网址。', ko: '사이트와 연습 페이지가 여기에 표시됩니다. 책의 QR 코드 테두리에서 ☆ 를 누르거나 아래에 주소를 붙여넣으세요.', hi: 'यहाँ साइटें और अभ्यास पृष्ठ होंगे। किताब में QR कोड के फ्रेम पर ☆ दबाएँ या नीचे पता चिपकाएँ।', ga: 'Beidh suíomhanna agus leathanaigh chleachtaí anseo. Brúigh ☆ ar fhráma cód QR i leabhar nó greamaigh seoladh thíos.', es: 'Aquí estarán los sitios y páginas de ejercicios. Toca ☆ en el marco de un código QR de un libro o pega una dirección abajo.' },
    linksUrlPlaceholder: { uk: 'Адреса сторінки (https://…)', en: 'Page address (https://…)', fr: 'Adresse de la page (https://…)', ru: 'Адрес страницы (https://…)', zh: '页面地址（https://…）', ko: '페이지 주소 (https://…)', hi: 'पृष्ठ का पता (https://…)', ga: 'Seoladh an leathanaigh (https://…)', es: 'Dirección de la página (https://…)' },
    linksNamePlaceholder: { uk: 'Назва (необов’язково)', en: 'Name (optional)', fr: 'Nom (facultatif)', ru: 'Название (необязательно)', zh: '名称（可选）', ko: '이름 (선택)', hi: 'नाम (वैकल्पिक)', ga: 'Ainm (roghnach)', es: 'Nombre (opcional)' },
    linksAdd: { uk: '+ Додати', en: '+ Add', fr: '+ Ajouter', ru: '+ Добавить', zh: '+ 添加', ko: '+ 추가', hi: '+ जोड़ें', ga: '+ Cuir leis', es: '+ Añadir' },
    linksBadUrl: { uk: 'Потрібна адреса, що починається з https:// або http://', en: 'An address starting with https:// or http:// is needed', fr: 'Il faut une adresse commençant par https:// ou http://', ru: 'Нужен адрес, начинающийся с https:// или http://', zh: '需要以 https:// 或 http:// 开头的地址', ko: 'https:// 또는 http:// 로 시작하는 주소가 필요합니다', hi: 'https:// या http:// से शुरू होने वाला पता चाहिए', ga: 'Teastaíonn seoladh a thosaíonn le https:// nó http://', es: 'Hace falta una dirección que empiece por https:// o http://' },
    linksOpen: { uk: 'Відкрити ↗', en: 'Open ↗', fr: 'Ouvrir ↗', ru: 'Открыть ↗', zh: '打开 ↗', ko: '열기 ↗', hi: 'खोलें ↗', ga: 'Oscail ↗', es: 'Abrir ↗' },
    linksToBook: { uk: 'До сторінки в книзі', en: 'Go to the page in the book', fr: 'Aller à la page du livre', ru: 'К странице в книге', zh: '转到书中的该页', ko: '책의 해당 페이지로', hi: 'किताब के पृष्ठ पर जाएँ', ga: 'Téigh go dtí an leathanach sa leabhar', es: 'Ir a la página del libro' },
    linksRemove: { uk: 'Прибрати посилання', en: 'Remove the link', fr: 'Retirer le lien', ru: 'Убрать ссылку', zh: '移除链接', ko: '링크 삭제', hi: 'लिंक हटाएँ', ga: 'Bain an nasc', es: 'Quitar el enlace' },
    linksSaved: { uk: 'Збережено в «Мої книги → Посилання»', en: 'Saved to «My books → Links»', fr: 'Enregistré dans « Mes livres → Liens »', ru: 'Сохранено в «Мои книги → Ссылки»', zh: '已保存到「我的书 → 链接」', ko: '«내 책 → 링크»에 저장했습니다', hi: '«मेरी किताबें → लिंक» में सहेजा गया', ga: 'Sábháilte i «Mo leabhair → Naisc»', es: 'Guardado en «Mis libros → Enlaces»' },
    linksUnsaved: { uk: 'Прибрано з посилань', en: 'Removed from links', fr: 'Retiré des liens', ru: 'Убрано из ссылок', zh: '已从链接中移除', ko: '링크에서 삭제했습니다', hi: 'लिंक से हटाया गया', ga: 'Bainte de na naisc', es: 'Quitado de los enlaces' },
    linksSaveQr: { uk: 'Зберегти в «Мої посилання»', en: 'Save to «My links»', fr: 'Enregistrer dans « Mes liens »', ru: 'Сохранить в «Мои ссылки»', zh: '保存到「我的链接」', ko: '«내 링크»에 저장', hi: '«मेरे लिंक» में सहेजें', ga: 'Sábháil i «Mo naisc»', es: 'Guardar en «Mis enlaces»' },
    linksFromBook: { uk: 'з книги', en: 'from', fr: 'du livre', ru: 'из книги', zh: '来自', ko: '출처', hi: 'किताब से', ga: 'ón leabhar', es: 'del libro' },
});

const SAVED_LINKS_KEY = 'reader_saved_links', SAVED_LINKS_MAX = 300;

function savedLinkUrl(value) {
    const v = String(value || '').trim();
    if (!/^https?:\/\/\S+$/i.test(v)) return '';
    try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : ''; } catch (e) { return ''; }
}
function listSavedLinks() {
    try {
        const list = JSON.parse(readStored(SAVED_LINKS_KEY) || '[]');
        // Synced from another device or edited by hand: only well-formed http(s) entries are ever shown or opened.
        return Array.isArray(list) ? list.filter(l => l && savedLinkUrl(l.url) === l.url) : [];
    } catch (e) { return []; }
}
function writeSavedLinks(list) {
    try { writeStored(SAVED_LINKS_KEY, JSON.stringify(list.slice(0, SAVED_LINKS_MAX))); } catch (e) { showToast(t('publicationStorageFull')); return false; }
    if (typeof renderRecentBooks === 'function' && shelfView === 'link') renderRecentBooks();
    if (typeof libraryState !== 'undefined' && libraryState.source === 'shelf' && shelfView === 'link' && typeof runShelfList === 'function') runShelfList();
    return true;
}
const isLinkSaved = url => listSavedLinks().some(l => l.url === url);
// { url, title, bookKey?, bookName?, page? } — the same address again moves to the top with the newest details.
function saveLink(entry) {
    const url = savedLinkUrl(entry.url);
    if (!url) return false;
    const rest = listSavedLinks().filter(l => l.url !== url);
    const host = new URL(url).host;
    const link = { url, title: String(entry.title || '').trim().slice(0, 200) || host + new URL(url).pathname.replace(/\/$/, ''), at: Date.now() };
    if (entry.bookKey) Object.assign(link, { bookKey: entry.bookKey, bookName: String(entry.bookName || '').slice(0, 200), page: Number(entry.page) || 0 });
    return writeSavedLinks([link, ...rest]);
}
function removeSavedLink(url) { return writeSavedLinks(listSavedLinks().filter(l => l.url !== url)); }

// The book this link was found in, opened on that page (a saved book from «Мої книги»).
async function openSavedLinkPage(link) {
    if (typeof closeLibrary === 'function' && typeof libraryState !== 'undefined' && libraryState.source) closeLibrary();
    if (state.bookKey !== link.bookKey && !(await openShelfBook(link.bookKey))) return;
    if (state.bookKey === link.bookKey && state.format === 'pdf' && link.page) goToPhysicalPage(link.page, { instant: true });
}

function savedLinkMeta(link) {
    let host = ''; try { host = new URL(link.url).host; } catch (e) {}
    const from = link.bookName ? `📖 ${t('linksFromBook')} ${shelfTitle(link.bookName)}${link.page ? ', ' + t('page') + ' ' + link.page : ''}` : '';
    return [host, from].filter(Boolean).join(' · ');
}
function savedLinkAddForm() {
    const form = document.createElement('form'); form.className = 'links-add';
    const url = document.createElement('input'); url.type = 'url'; url.inputMode = 'url'; url.required = true; url.className = 'links-url';
    url.placeholder = t('linksUrlPlaceholder'); url.setAttribute('aria-label', t('linksUrlPlaceholder')); url.autocomplete = 'off';
    const name = document.createElement('input'); name.type = 'text'; name.className = 'links-name'; name.maxLength = 200;
    name.placeholder = t('linksNamePlaceholder'); name.setAttribute('aria-label', t('linksNamePlaceholder'));
    const add = document.createElement('button'); add.type = 'submit'; add.className = 'btn-primary'; add.textContent = t('linksAdd');
    form.append(url, name, add);
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!savedLinkUrl(url.value)) { showToast(t('linksBadUrl')); url.focus(); return; }
        if (saveLink({ url: url.value, title: name.value })) showToast(t('linksSaved'));
    });
    return form;
}
function savedLinkCard(link) {
    const card = document.createElement('div'); card.className = 'library-card saved-link';
    const icon = document.createElement('span'); icon.className = 'saved-link-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = '🔗';
    const info = document.createElement('div'); info.className = 'library-info';
    const name = document.createElement('div'); name.className = 'library-name'; name.textContent = link.title;
    const by = document.createElement('div'); by.className = 'library-author'; by.textContent = savedLinkMeta(link);
    info.append(name, by);
    const actions = document.createElement('div'); actions.className = 'library-actions';
    const open = document.createElement('a'); open.className = 'btn-primary saved-link-open'; open.textContent = t('linksOpen');
    open.href = link.url; open.target = '_blank'; open.rel = 'noopener noreferrer';
    open.addEventListener('click', () => { if (typeof rememberReadingSpot === 'function') rememberReadingSpot(); });
    actions.append(open);
    if (link.bookKey) {
        const page = document.createElement('button'); page.type = 'button'; page.className = 'library-save saved-link-page'; page.textContent = '📖';
        page.title = t('linksToBook'); page.setAttribute('aria-label', t('linksToBook'));
        page.addEventListener('click', () => openSavedLinkPage(link));
        actions.append(page);
    }
    const del = document.createElement('button'); del.type = 'button'; del.className = 'library-save saved-link-remove'; del.textContent = '🗑';
    del.title = t('linksRemove'); del.setAttribute('aria-label', t('linksRemove'));
    del.addEventListener('click', () => removeSavedLink(link.url));
    actions.append(del);
    card.append(icon, info, actions);
    return card;
}
// The «Посилання» tab of the shelf (js/book-shelf.js registerShelfTab): on the start screen and in the library window.
function renderSavedLinks(list, note) {
    const links = listSavedLinks();
    if (note) note.textContent = links.length ? '' : t('linksEmpty');
    list.replaceChildren(...links.map(savedLinkCard));
}
registerShelfTab({
    kind: 'link', label: 'shelfLinks',
    count: () => listSavedLinks().length,
    renderHome(host) {
        const note = document.createElement('p'); note.className = 'recent-empty';
        const list = document.createElement('div'); list.className = 'saved-links-list';
        host.append(note, savedLinkAddForm(), list);
        renderSavedLinks(list, note);
    },
    renderLibrary(status, list, tabs) {
        const note = document.createElement('p'); note.className = 'shelf-note';
        status.replaceChildren(tabs, note, savedLinkAddForm());
        renderSavedLinks(list, note);
    },
});
renderRecentBooks();   // the shelf drew the start screen before this tab registered (links but no books yet)
