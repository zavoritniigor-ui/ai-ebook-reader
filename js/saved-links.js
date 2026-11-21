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
    linksEmpty: { uk: 'Тут будуть сайти й сторінки з вправами. Натисніть «+ Додати» або ☆ на рамці QR-коду в книзі.', en: 'Sites and exercise pages will be here. Tap «+ Add» or ☆ on a QR code frame in a book.', fr: "Les sites et pages d'exercices apparaîtront ici. Touchez « + Ajouter » ou ☆ sur le cadre d'un code QR dans un livre.", ru: 'Здесь будут сайты и страницы с упражнениями. Нажмите «+ Добавить» или ☆ на рамке QR-кода в книге.', zh: '这里会显示网站和练习页面。点按「+ 添加」或书中二维码框上的 ☆。', ko: '사이트와 연습 페이지가 여기에 표시됩니다. «+ 추가» 또는 책의 QR 코드 테두리에서 ☆ 를 누르세요.', hi: 'यहाँ साइटें और अभ्यास पृष्ठ होंगे। «+ जोड़ें» या किताब में QR कोड के फ्रेम पर ☆ दबाएँ।', ga: 'Beidh suíomhanna agus leathanaigh chleachtaí anseo. Brúigh «+ Cuir leis» nó ☆ ar fhráma cód QR i leabhar.', es: 'Aquí estarán los sitios y páginas de ejercicios. Toca «+ Añadir» o ☆ en el marco de un código QR de un libro.' },
    linksNewTitle: { uk: 'Нове посилання', en: 'New link', fr: 'Nouveau lien', ru: 'Новая ссылка', zh: '新链接', ko: '새 링크', hi: 'नया लिंक', ga: 'Nasc nua', es: 'Nuevo enlace' },
    linksUrlLabel: { uk: 'Адреса сайту', en: 'Site address', fr: 'Adresse du site', ru: 'Адрес сайта', zh: '网站地址', ko: '사이트 주소', hi: 'साइट का पता', ga: 'Seoladh an tsuímh', es: 'Dirección del sitio' },
    linksNameLabel: { uk: 'Назва (підставляється з адреси)', en: 'Name (filled in from the address)', fr: "Nom (repris de l'adresse)", ru: 'Название (подставляется из адреса)', zh: '名称（根据地址自动填写）', ko: '이름 (주소에서 자동 입력)', hi: 'नाम (पते से भरा जाता है)', ga: 'Ainm (ón seoladh)', es: 'Nombre (se toma de la dirección)' },
    linksPaste: { uk: 'Вставити', en: 'Paste', fr: 'Coller', ru: 'Вставить', zh: '粘贴', ko: '붙여넣기', hi: 'चिपकाएँ', ga: 'Greamaigh', es: 'Pegar' },
    linksSave: { uk: 'Зберегти', en: 'Save', fr: 'Enregistrer', ru: 'Сохранить', zh: '保存', ko: '저장', hi: 'सहेजें', ga: 'Sábháil', es: 'Guardar' },
    linksCancel: { uk: 'Скасувати', en: 'Cancel', fr: 'Annuler', ru: 'Отмена', zh: '取消', ko: '취소', hi: 'रद्द करें', ga: 'Cealaigh', es: 'Cancelar' },
    linksTranslated: { uk: 'з перекладом', en: 'with translation', fr: 'avec traduction', ru: 'с переводом', zh: '可翻译', ko: '번역 포함', hi: 'अनुवाद के साथ', ga: 'le haistriúchán', es: 'con traducción' },
    linksAdd: { uk: '+ Додати', en: '+ Add', fr: '+ Ajouter', ru: '+ Добавить', zh: '+ 添加', ko: '+ 추가', hi: '+ जोड़ें', ga: '+ Cuir leis', es: '+ Añadir' },
    linksBadUrl: { uk: 'Потрібна адреса, що починається з https:// або http://', en: 'An address starting with https:// or http:// is needed', fr: 'Il faut une adresse commençant par https:// ou http://', ru: 'Нужен адрес, начинающийся с https:// или http://', zh: '需要以 https:// 或 http:// 开头的地址', ko: 'https:// 또는 http:// 로 시작하는 주소가 필요합니다', hi: 'https:// या http:// से शुरू होने वाला पता चाहिए', ga: 'Teastaíonn seoladh a thosaíonn le https:// nó http://', es: 'Hace falta una dirección que empiece por https:// o http://' },
    linksOpen: { uk: 'Відкрити ↗', en: 'Open ↗', fr: 'Ouvrir ↗', ru: 'Открыть ↗', zh: '打开 ↗', ko: '열기 ↗', hi: 'खोलें ↗', ga: 'Oscail ↗', es: 'Abrir ↗' },
    linksToBook: { uk: 'До сторінки в книзі', en: 'Go to the page in the book', fr: 'Aller à la page du livre', ru: 'К странице в книге', zh: '转到书中的该页', ko: '책의 해당 페이지로', hi: 'किताब के पृष्ठ पर जाएँ', ga: 'Téigh go dtí an leathanach sa leabhar', es: 'Ir a la página del libro' },
    linksRemove: { uk: 'Прибрати посилання', en: 'Remove the link', fr: 'Retirer le lien', ru: 'Убрать ссылку', zh: '移除链接', ko: '링크 삭제', hi: 'लिंक हटाएँ', ga: 'Bain an nasc', es: 'Quitar el enlace' },
    linksSaved: { uk: 'Збережено в «Мої книги → Посилання»', en: 'Saved to «My books → Links»', fr: 'Enregistré dans « Mes livres → Liens »', ru: 'Сохранено в «Мои книги → Ссылки»', zh: '已保存到「我的书 → 链接」', ko: '«내 책 → 링크»에 저장했습니다', hi: '«मेरी किताबें → लिंक» में सहेजा गया', ga: 'Sábháilte i «Mo leabhair → Naisc»', es: 'Guardado en «Mis libros → Enlaces»' },
    linksUnsaved: { uk: 'Прибрано з посилань', en: 'Removed from links', fr: 'Retiré des liens', ru: 'Убрано из ссылок', zh: '已从链接中移除', ko: '링크에서 삭제했습니다', hi: 'लिंक से हटाया गया', ga: 'Bainte de na naisc', es: 'Quitado de los enlaces' },
    linksSaveQr: { uk: 'Зберегти в «Мої посилання»', en: 'Save to «My links»', fr: 'Enregistrer dans « Mes liens »', ru: 'Сохранить в «Мои ссылки»', zh: '保存到「我的链接」', ko: '«내 링크»에 저장', hi: '«मेरे लिंक» में सहेजें', ga: 'Sábháil i «Mo naisc»', es: 'Guardar en «Mis enlaces»' },
});

const SAVED_LINKS_KEY = 'reader_saved_links', SAVED_LINKS_MAX = 300;
// The reading proxy (functions/p/[[path]].js): exercise sites listed there open through it, so a selected word or
// sentence on them is translated. The same hosts as PROXY_HOSTS there (tests/reading_proxy_test.mjs compares them).
const READING_PROXY_ORIGIN = 'https://web.ai-ebook-reader.uk';
const READING_PROXY_HOSTS = ['francaisfacile.rfi.fr', 's.francaisfacile.rfi.fr', 'fle-rfi.h5p.com'];
function readingProxyUrl(url) {
    try { const u = new URL(url); if (u.protocol === 'https:' && READING_PROXY_HOSTS.includes(u.host)) return `${READING_PROXY_ORIGIN}/p/${u.host}${u.pathname}${u.search}${u.hash}`; } catch (e) {}
    return '';
}

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
    const link = { url, title: String(entry.title || '').trim().slice(0, 200) || savedLinkAutoTitle(url) || host, at: Date.now() };
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

// A readable name from the address alone (the page itself cannot be read from here: other sites send no CORS, some block
// servers): the site — its subdomain and main name, short names in capitals (RFI, BBC) — and the last meaningful part
// of the path. https://francaisfacile.rfi.fr/fr/exercices/passe-compose → «Francaisfacile RFI — Passe compose».
const LINK_TWO_PART_SUFFIXES = new Set(['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.ua', 'org.ua', 'in.ua', 'gov.ua', 'kiev.ua', 'com.au',
    'co.jp', 'com.br', 'gouv.fr', 'co.kr', 'co.nz', 'com.mx', 'com.ar', 'co.in', 'com.cn', 'com.tr', 'com.pl']);
const LINK_SKIP_PARTS = new Set(['www', 'm', 'index', 'home', 'html', 'htm', 'php', 'aspx', 'pdf', 'article', 'articles', 'page', 'pages', 'post', 'posts', 'amp']);
function savedLinkAutoTitle(value) {
    const url = savedLinkUrl(value);
    if (!url) return '';
    const u = new URL(url);
    const labels = u.hostname.replace(/^www\./, '').split('.');
    const cut = labels.length > 2 && LINK_TWO_PART_SUFFIXES.has(labels.slice(-2).join('.')) ? 2 : 1;
    const names = labels.slice(0, -cut).filter(l => !LINK_SKIP_PARTS.has(l));
    const word = w => w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1);
    const site = names.length > 1 ? [...names.slice(0, -1), names.at(-1)].map(word).join(' ') : names.map(word).join(' ') || u.hostname;
    let part = '';
    for (const seg of u.pathname.split('/').reverse()) {
        let s = ''; try { s = decodeURIComponent(seg); } catch (e) { s = seg; }
        s = s.replace(/\.[a-z0-9]{2,5}$/i, '');
        if (s.length <= 2 || /^\d+$/.test(s) || /^[0-9a-f-]{16,}$/i.test(s) || LINK_SKIP_PARTS.has(s.toLowerCase())) continue;
        part = s.replace(/[-_+]+/g, ' ').trim();
        break;
    }
    return (part ? `${site} — ${part[0].toUpperCase()}${part.slice(1)}` : site).slice(0, 120);
}

// The site's logo: its favicon from Google's favicon service (it knows sites that refuse servers, like RFI), shown over a
// coloured tile with the site's first letter. No logo, offline, or only the tiny default globe (< 32 px) → the tile stays.
const LINK_LOGO_URL = host => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
function savedLinkLogo(url, title) {
    const box = document.createElement('span'); box.className = 'link-logo'; box.setAttribute('aria-hidden', 'true');
    let host = ''; try { host = new URL(url).hostname; } catch (e) {}
    let h = 0; for (const ch of host) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    box.style.setProperty('--logo-hue', h % 360);
    const letter = document.createElement('b'); letter.textContent = (String(title || host).trim()[0] || '•').toUpperCase();
    box.append(letter);
    if (host) {
        const img = document.createElement('img'); img.alt = ''; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
        img.addEventListener('load', () => { if (img.naturalWidth >= 32) box.classList.add('has-img'); else img.remove(); });
        img.addEventListener('error', () => img.remove());
        img.src = box.dataset.logo = LINK_LOGO_URL(host);
        box.append(img);
    }
    return box;
}

// One «+ Додати» button; it opens the form in place: the address (with «Вставити» from the clipboard), the name filled in
// from the address until the reader types their own, and a live preview of the card.
function savedLinkAdder() {
    const box = document.createElement('div'); box.className = 'links-adder';
    const open = document.createElement('button'); open.type = 'button'; open.className = 'btn-primary links-add-btn'; open.textContent = t('linksAdd');
    const form = document.createElement('form'); form.className = 'links-form'; form.hidden = true; form.noValidate = true;
    const head = document.createElement('h4'); head.textContent = t('linksNewTitle');
    const urlLabel = document.createElement('label'); urlLabel.textContent = t('linksUrlLabel');
    const urlRow = document.createElement('div'); urlRow.className = 'links-row';
    const url = document.createElement('input'); url.type = 'url'; url.inputMode = 'url'; url.className = 'links-url'; url.autocomplete = 'off';
    url.placeholder = 'https://…'; url.setAttribute('aria-label', t('linksUrlLabel'));
    const paste = document.createElement('button'); paste.type = 'button'; paste.className = 'links-paste'; paste.textContent = '📋 ' + t('linksPaste');
    urlRow.append(url, paste); urlLabel.append(urlRow);
    const nameLabel = document.createElement('label'); nameLabel.textContent = t('linksNameLabel');
    const name = document.createElement('input'); name.type = 'text'; name.className = 'links-name'; name.maxLength = 200;
    name.setAttribute('aria-label', t('linksNameLabel'));
    nameLabel.append(name);
    const preview = document.createElement('div'); preview.className = 'links-preview';
    const buttons = document.createElement('div'); buttons.className = 'links-buttons';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'links-cancel'; cancel.textContent = t('linksCancel');
    const save = document.createElement('button'); save.type = 'submit'; save.className = 'btn-primary links-save'; save.textContent = t('linksSave');
    buttons.append(cancel, save);
    form.append(head, urlLabel, nameLabel, preview, buttons);
    box.append(open, form);

    let named = false;   // the reader typed a name: the address no longer overwrites it
    const refresh = () => {
        const link = savedLinkUrl(url.value);
        if (!named) name.value = link ? savedLinkAutoTitle(link) : '';
        preview.replaceChildren(...(link ? [savedLinkCard({ url: link, title: name.value.trim() || savedLinkAutoTitle(link) }, true)] : []));
        save.disabled = !link;
    };
    url.addEventListener('input', refresh);
    name.addEventListener('input', () => { named = name.value.trim() !== ''; refresh(); });
    paste.hidden = !navigator.clipboard?.readText;
    paste.addEventListener('click', async () => {
        try { const text = (await navigator.clipboard.readText()).trim(); if (text) { url.value = text; refresh(); } } catch (e) { url.focus(); }
    });
    open.addEventListener('click', () => { open.hidden = true; form.hidden = false; named = false; url.value = ''; refresh(); url.focus(); });
    cancel.addEventListener('click', () => { form.hidden = true; open.hidden = false; });
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!savedLinkUrl(url.value)) { showToast(t('linksBadUrl')); url.focus(); return; }
        if (saveLink({ url: url.value, title: name.value })) showToast(t('linksSaved'));   // the list redraws: the form closes
    });
    return box;
}

// A card: the whole left part (logo, name, site) is the link; 📖 and 🗑 are small icons on the right.
function savedLinkCard(link, preview = false) {
    const card = document.createElement('div'); card.className = 'saved-link';
    const main = document.createElement(preview ? 'div' : 'a'); main.className = 'saved-link-main';
    if (!preview) {
        main.href = readingProxyUrl(link.url) || link.url; main.target = '_blank'; main.rel = 'noopener noreferrer';
        main.addEventListener('click', () => { if (typeof rememberReadingSpot === 'function') rememberReadingSpot(); });
    }
    const text = document.createElement('span'); text.className = 'saved-link-text';
    const name = document.createElement('b'); name.className = 'saved-link-title'; name.textContent = link.title;
    const sub = document.createElement('small'); sub.className = 'saved-link-host';
    let host = ''; try { host = new URL(link.url).hostname.replace(/^www\./, ''); } catch (e) {}
    sub.textContent = host + (readingProxyUrl(link.url) ? ` · 🌐 ${t('linksTranslated')}` : '') + (link.page ? ` · 📖 ${t('page')} ${link.page}` : '');
    text.append(name, sub);
    const go = document.createElement('span'); go.className = 'saved-link-go'; go.setAttribute('aria-hidden', 'true'); go.textContent = '↗';
    main.append(savedLinkLogo(link.url, link.title), text, go);
    if (!preview) main.setAttribute('aria-label', `${t('linksOpen')} ${link.title}`);
    card.append(main);
    if (preview) return card;
    if (link.bookKey) {
        const page = document.createElement('button'); page.type = 'button'; page.className = 'saved-link-icon-btn saved-link-page'; page.textContent = '📖';
        page.title = `${t('linksToBook')}: ${shelfTitle(link.bookName || '')}${link.page ? ', ' + t('page') + ' ' + link.page : ''}`; page.setAttribute('aria-label', page.title);
        page.addEventListener('click', () => openSavedLinkPage(link));
        card.append(page);
    }
    const del = document.createElement('button'); del.type = 'button'; del.className = 'saved-link-icon-btn saved-link-remove'; del.textContent = '🗑';
    del.title = t('linksRemove'); del.setAttribute('aria-label', t('linksRemove'));
    del.addEventListener('click', () => removeSavedLink(link.url));
    card.append(del);
    return card;
}
// The «Посилання» tab of the shelf (js/book-shelf.js registerShelfTab): on the start screen and in the library window.
function renderSavedLinks(list, note) {
    const links = listSavedLinks();
    if (note) note.textContent = links.length ? '' : t('linksEmpty');
    list.replaceChildren(...links.map(link => savedLinkCard(link)));   // not map(savedLinkCard): the index would be «preview»
}
registerShelfTab({
    kind: 'link', label: 'shelfLinks',
    count: () => listSavedLinks().length,
    renderHome(host) {
        const note = document.createElement('p'); note.className = 'recent-empty';
        const list = document.createElement('div'); list.className = 'saved-links-list';
        host.append(savedLinkAdder(), note, list);
        renderSavedLinks(list, note);
    },
    renderLibrary(status, list, tabs) {
        const note = document.createElement('p'); note.className = 'shelf-note';
        status.replaceChildren(tabs, savedLinkAdder(), note);
        renderSavedLinks(list, note);
    },
});
renderRecentBooks();   // the shelf drew the start screen before this tab registered (links but no books yet)
