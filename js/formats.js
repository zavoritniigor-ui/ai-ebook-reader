/* formats.js — завантажувачі форматів книги: перевірка ZIP-архіва (EPUB/DOCX) у
 * окремому Worker'і (runArchiveGuard) ДО того, як його побачить JSZip/Mammoth на
 * головному потоці, EPUB (initEpub/loadEpubChapter), DOCX/ODT/інші rich-документи
 * через Mammoth (initRichDoc/splitIntoChapters/renderDocChapter), FictionBook
 * (fb2ToHtml), RTF (rtfToHtml) і звичайний текст (initTxt/renderTxtPage).
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/pdf-render.js. Залежить від js/navigation.js (paginateContainer/
 * goToPageInChapter/buildToc — buildToc навмисно лишили в navigation.js, а не тут,
 * бо однаково використовується всіма трьома форматами як загальний TOC-хелпер,
 * не специфічний для жодного з них) та core.js (state/els/readerEpoch/
 * showReaderError/safeHtml). archive-guard.worker.js — окремий Worker-файл,
 * запускається лише на http(s)-origin (на file:// Chrome забороняє Worker для
 * opaque-origin сторінок — єдиний легітимний випадок, коли перевірка свідомо
 * пропускається).
 */

// Перевірка ZIP-контейнера (EPUB/DOCX) в окремому Worker'і ДО того, як його
// побачить JSZip/Mammoth на головному потоці: справжні (а не заявлені в
// заголовку) розмір і CRC кожного файла, межі каталогу ZIP, кількість і сумарний
// розпакований обсяг записів, шляхи на zip-slip (../, абсолютні шляхи). Без цього
// спеціально сформований архів міг би вичерпати пам'ять вкладки (zip bomb) —
// особливо відчутно на планшеті з обмеженою пам'яттю.
//
// На file:// (відкриття файла прямо з диска, без сервера) Worker узагалі не може
// завантажитись — Chrome забороняє це для opaque-origin сторінок (origin === "null").
// Це ЄДИНИЙ легітимний випадок, коли перевірку свідомо пропускаємо: середовище
// фізично не дає її виконати, це не ознака проблеми з архівом.
//
// На будь-якому справжньому origin (http/https — і локальний сервер розробки, і
// прод, і майбутній мобільний WebView) Worker має запускатись. Якщо там він усе
// одно не зміг стартувати чи впав — це вже ознака зламаного деплою/CSP, а не
// "нормальна" відсутність підтримки, тому тут fail-CLOSED: відмовляємо у файлі з
// чіткою помилкою, а не тихо пропускаємо захист від zip bomb на проді.
function runArchiveGuard(file, epoch) {
    const opaqueOrigin = location.protocol === 'file:' || location.origin === 'null';
    if (opaqueOrigin) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
        let worker;
        try { worker = new Worker('archive-guard.worker.js'); }
        catch (e) { reject(new Error(t('archiveGuardFailed'))); return; }
        let settled = false;
        const finish = (fn, val) => { if (settled) return; settled = true; clearTimeout(timer); worker.terminate(); fn(val); };
        const timer = setTimeout(() => finish(reject, new Error('Перевірку архіву перервано за часом.')), 30000);
        worker.onmessage = ({ data }) => {
            if (epoch !== readerEpoch.book) { finish(reject, new DOMException('Cancelled', 'AbortError')); return; }
            if (data && data.buffer) finish(resolve, data.buffer);
            else finish(reject, new Error((data && data.error) || t('archiveGuardFailed')));
        };
        // На справжньому origin будь-яка відмова самого Worker'а (не встиг
        // завантажитись, помилка в importScripts, заблокований CSP тощо) — це
        // привід ВІДМОВИТИ у файлі, а не тихо пропустити перевірку.
        worker.onerror = () => finish(reject, new Error(t('archiveGuardFailed')));
        file.arrayBuffer().then((buf) => { if (!settled) worker.postMessage(buf, [buf]); })
            .catch((e) => finish(reject, e));
    });
}

function resolveEpubPath(baseDir, relativePath) {
    try { relativePath = decodeURIComponent(relativePath.split(/[?#]/)[0]); } catch (e) {}
    if (/^[a-z][a-z0-9+.-]*:|^[\/\\]|[\u0000-\u001f\\]/i.test(relativePath)) return '';
    const parts = baseDir.split('/').filter(Boolean);
    const relParts = relativePath.split('/').filter(Boolean);
    for (const p of relParts) {
        if (p === '..') { if (!parts.length) return ''; parts.pop(); }
        else if (p !== '.') parts.push(p);
    }
    return parts.join('/');
}

// All reflowable loaders wait for actual image decoding and fonts. The timeout
// prevents a dead remote image from blocking reading; late loads reflow again.
async function settleBookLayout(current, target, textOffset = null) {
    let ready = false;
    const reflow = () => {
        if (!current()) return;
        const offset = ready ? state.bookTextOffset : textOffset;
        const page = ready ? state.pageInChapter : target;
        // Перша розкладка відкритої книги — це і є відновлення місця: відтепер закладку знову можна записувати (js/main.js
        // вмикає state.bookOpening на час розпакування; гортання після появи сторінок мусить зберігатись одразу).
        if (!ready) state.bookOpening = false;
        paginateContainer();
        goToPageInChapter(page === -1 ? state.totalPagesInChapter - 1 : (pageForBookTextOffset(offset) ?? page), false, page === -1 ? null : offset);
    };
    const images = Array.from(els.pages.querySelectorAll('img'));
    const pending = images.map(img => {
        img.loading = 'eager';
        img.addEventListener('load', () => { if (ready) reflow(); }, { once: true });
        return img.decode().catch(() => {});
    });
    pending.push(document.fonts.ready.then(() => { if (ready) reflow(); }));
    let timer;
    await Promise.race([Promise.all(pending), new Promise(resolve => { timer = setTimeout(resolve, 3000); })]);
    clearTimeout(timer);
    if (!current()) return;
    // A missing/corrupt illustration must not masquerade as an empty page.
    // Keep valid image-only chapters: their pixels are independent of prose.
    if (images.length && !els.pages.textContent.trim() && images.every(img => img.complete && !img.naturalWidth)) {
        throw new Error(t('imageUnavailable'));
    }
    await new Promise(requestAnimationFrame);
    reflow(); ready = true;
}

function parseFb2(text) {
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror') || xml.documentElement.localName !== 'FictionBook') throw new Error('Некоректний FB2.');
    state.bookLangMeta = normalizeBookLang(xml.getElementsByTagNameNS('*', 'lang')[0]?.textContent);
    const images = new Map();
    for (const binary of xml.getElementsByTagNameNS('*', 'binary')) {
        const mime = (binary.getAttribute('content-type') || '').toLowerCase();
        const data = binary.textContent.replace(/\s/g, '');
        if (/^image\/(png|jpeg|gif|webp|avif)$/.test(mime) && /^[a-z0-9+/]+={0,2}$/i.test(data)) {
            images.set(binary.id || binary.getAttribute('id'), `data:${mime};base64,${data}`);
        }
    }
    // FictionBook stores the cover in description/title-info, outside every
    // body. Reading bodies alone silently discarded a legitimate embedded cover.
    const cover = xml.getElementsByTagNameNS('*', 'coverpage')[0];
    return (cover ? fb2ToHtml(cover, images) : '') +
        Array.from(xml.getElementsByTagNameNS('*', 'body')).map(body => fb2ToHtml(body, images)).join('');
}

async function readBookXml(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let encoding = 'utf-8';
    if (bytes[0] === 255 && bytes[1] === 254) encoding = 'utf-16le';
    else if (bytes[0] === 254 && bytes[1] === 255) encoding = 'utf-16be';
    else encoding = new TextDecoder().decode(bytes.slice(0, 200)).match(/<\?xml[^>]*encoding\s*=\s*["']([^"']+)/i)?.[1] || encoding;
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
}

// Rasterize a deliberately small, inert SVG subset. No foreignObject, scripts,
// CSS, URLs, animation or external references ever reach the image decoder.
async function bookSvgPng(source) {
    const xml = new DOMParser().parseFromString(source, 'image/svg+xml');
    if (xml.querySelector('parsererror') || xml.documentElement.localName !== 'svg') return '';
    const ns = 'http://www.w3.org/2000/svg';
    const tags = new Set('svg g path rect circle ellipse line polyline polygon text tspan title desc'.split(' '));
    const attrs = new Set('viewBox width height x y x1 x2 y1 y2 cx cy r rx ry d points fill stroke stroke-width opacity fill-opacity stroke-opacity transform font-size text-anchor'.split(' '));
    function copy(node) {
        if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue);
        if (node.nodeType !== Node.ELEMENT_NODE || node.namespaceURI !== ns || !tags.has(node.localName)) return null;
        const out = document.createElementNS(ns, node.localName);
        for (const attr of node.attributes) {
            if (attrs.has(attr.name) && /^[\w\s.,#%()+-]+$/.test(attr.value) && !/url/i.test(attr.value)) out.setAttribute(attr.name, attr.value);
        }
        for (const child of node.childNodes) { const clean = copy(child); if (clean) out.appendChild(clean); }
        return out;
    }
    const svg = copy(xml.documentElement);
    if (!svg) return '';
    const view = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    let width = parseFloat(svg.getAttribute('width')) || view[2] || 800;
    let height = parseFloat(svg.getAttribute('height')) || view[3] || 600;
    if (!(Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)) return '';
    if (!svg.hasAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const scale = Math.min(1, 2048 / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale)); height = Math.max(1, Math.round(height * scale));
    svg.setAttribute('width', width); svg.setAttribute('height', height);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    try {
        const img = new Image(); img.src = url; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        return canvas.toDataURL('image/png');
    } catch (e) { return ''; }
    finally { URL.revokeObjectURL(url); }
}

async function epubImage(zip, chapterDir, src) {
    if (/^data:image\/(png|jpeg|gif|webp|avif);base64,/i.test(src)) return src;
    const path = resolveEpubPath(chapterDir, src);
    const entry = path && zip.file(path);
    if (!entry) return '';
    const ext = path.split('.').pop().toLowerCase();
    if (ext === 'svg') return bookSvgPng(await entry.async('text'));
    const mime = { png: 'png', jpg: 'jpeg', jpeg: 'jpeg', gif: 'gif', webp: 'webp', avif: 'avif' }[ext];
    return mime ? `data:image/${mime};base64,${await entry.async('base64')}` : '';
}

// Стилі самої книги до сторінки не потрапляють (safeHtml відкидає класи, <style> і <link>), тож курсив, жирний і вирівнювання
// через класи губилися: у книгах Bibliothèque numérique romande курсив — це <span class="T6"> (сотні місць на книгу), а
// присвяти й підписи — <p class="Centre">. Тому з CSS книги беремо лише ці три властивості з фіксованими значеннями й
// переносимо їх у style елементів; safeHtml пропускає їх як звичайні дозволені стилі. Розмір, шрифт, колір і відступи
// книги не беремо: ними керують налаштування читача (A+/A−, тема).
const epubSheetCache = new WeakMap();
const EPUB_STYLE_MAX_RULES = 3000;
function epubStyleDeclarations(style) {
    const out = [];
    const fs = style.getPropertyValue('font-style');
    if (fs === 'italic' || fs === 'oblique') out.push(['font-style', 'italic']); else if (fs === 'normal') out.push(['font-style', 'normal']);
    const fw = style.getPropertyValue('font-weight');
    if (fw === 'bold' || fw === 'bolder' || +fw >= 600) out.push(['font-weight', 'bold']); else if (fw === 'normal' || (fw && +fw <= 400)) out.push(['font-weight', 'normal']);
    const ta = style.getPropertyValue('text-align');
    if (ta === 'center') out.push(['text-align', 'center']); else if (ta === 'right' || ta === 'end') out.push(['text-align', 'right']);
    return out;
}
async function epubBookSheets(zip, chapterDir, doc) {
    let cache = epubSheetCache.get(zip);
    if (!cache) epubSheetCache.set(zip, cache = new Map());
    const texts = [];
    for (const link of doc.querySelectorAll('link[href]')) {
        if (!/stylesheet/i.test(link.getAttribute('rel') || '')) continue;
        const path = resolveEpubPath(chapterDir, link.getAttribute('href'));
        if (!path) continue;
        if (!cache.has(path)) { const entry = zip.file(path); cache.set(path, entry ? await entry.async('text') : ''); }
        texts.push(cache.get(path));
    }
    for (const style of doc.querySelectorAll('style')) texts.push(style.textContent || '');
    const rules = [];
    for (const text of texts) {
        if (!text) continue;
        try {
            // Розібраний, але НЕ застосований до сторінки аркуш: лише щоб прочитати селектори й властивості.
            const sheet = new CSSStyleSheet(); sheet.replaceSync(text);
            for (const rule of sheet.cssRules) if (rule.selectorText && rule.style) rules.push(rule);
        } catch (e) {}
    }
    return rules.slice(0, EPUB_STYLE_MAX_RULES);
}
async function applyEpubBookStyles(zip, chapterDir, doc) {
    const rules = await epubBookSheets(zip, chapterDir, doc);
    const own = new Map();   // властивості, які елемент мав у власному style: вони важливіші за аркуш
    for (const rule of rules) {
        const decls = epubStyleDeclarations(rule.style);
        if (!decls.length) continue;
        let matched;
        try { matched = doc.body.querySelectorAll(rule.selectorText); } catch (e) { continue; }
        for (const el of matched) {
            if (!own.has(el)) own.set(el, new Set(Array.from(el.style)));
            for (const [prop, value] of decls) if (!own.get(el).has(prop)) el.style.setProperty(prop, value);
        }
    }
    // Абзаци застосунок вирівнює за шириною власним правилом для p, тож вирівнювання блока-обгортки («div.center» з
    // абзацами всередині) переносимо на його абзаци й заголовки, які свого не мають.
    for (const el of doc.body.querySelectorAll('[style*="text-align"]')) {
        if (/^(p|h[1-6])$/i.test(el.localName)) continue;
        for (const inner of el.querySelectorAll('p, h1, h2, h3, h4, h5, h6')) if (!inner.style.getPropertyValue('text-align')) inner.style.setProperty('text-align', el.style.getPropertyValue('text-align'));
    }
}

// ОНОВЛЕНИЙ НАДІЙНИЙ ПАРСЕР EPUB
// ========== ЗМІСТ EPUB (власник, 2026-10-31: «стандарт ебук не відповідає») ==========
// Раніше зміст був порядком файлів книги: «Розділ 1, 2, 3…» — без назв, а один файл часто не дорівнює одному розділу.
// Стандарт дає справжній зміст двома способами: EPUB 3 — навігаційний документ (елемент маніфесту з properties="nav",
// усередині <nav epub:type="toc">), EPUB 2 — toc.ncx (на нього вказує <spine toc="…">). Беремо перший, за його
// відсутності — другий, а якщо немає жодного або він зіпсований — повертаємось до старого списку файлів.
// Пункт змісту — посилання «файл#якір»: файл зводимо до номера в порядку читання (spine), якір шукаємо після
// завантаження розділу (safeHtml зберігає id як «book-<id>»). Назви ставимо лише як текст: зміст — дані книги, не розмітка.
const EPUB_TOC_MAX_ITEMS = 2000;   // більше пунктів — це вже не зміст, а сміття або атака на сторінку
const EPUB_TOC_MAX_DEPTH = 6;
const EPUB_TOC_TITLE_MAX = 200;
const epubTocTitle = (text) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, EPUB_TOC_TITLE_MAX);

// «файл#якір» відносно теки документа змісту → { index, fragment } або null, коли файл не входить у порядок читання.
function epubTocTarget(baseDir, href) {
    const raw = String(href || '');
    if (!raw) return null;
    const hash = raw.indexOf('#');
    const pathPart = hash >= 0 ? raw.slice(0, hash) : raw;
    let fragment = hash >= 0 ? raw.slice(hash + 1) : '';
    try { fragment = decodeURIComponent(fragment); } catch (e) { /* лишаємо як є */ }
    const path = pathPart ? resolveEpubPath(baseDir, pathPart) : '';
    if (!path) return null;
    const index = state.spine.indexOf(path);
    return index >= 0 ? { index, fragment } : null;
}

// EPUB 3: <nav epub:type="toc"><ol><li><a href>…</a><ol>…</ol></li></ol></nav>. Заголовок без посилання — <span>.
function parseEpubNav(text, baseDir) {
    let doc = new DOMParser().parseFromString(text, 'application/xhtml+xml');
    if (doc.querySelector('parsererror')) doc = new DOMParser().parseFromString(expandSelfClosingTags(text), 'text/html');
    const navs = Array.from(doc.getElementsByTagNameNS('*', 'nav'));
    const isToc = (n) => /(^|\s)toc(\s|$)/.test(n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') || n.getAttribute('epub:type') || '');
    const nav = navs.find(isToc) || navs[0];
    if (!nav) return [];
    const out = [];
    const walk = (list, depth) => {
        if (!list || depth >= EPUB_TOC_MAX_DEPTH) return;
        for (const li of Array.from(list.children)) {
            if (out.length >= EPUB_TOC_MAX_ITEMS) return;
            if (li.localName !== 'li') continue;
            const head = Array.from(li.children).find(c => c.localName === 'a' || c.localName === 'span');
            const title = epubTocTitle(head && head.textContent);
            const target = head && head.localName === 'a' ? epubTocTarget(baseDir, head.getAttribute('href')) : null;
            if (title) out.push({ title, depth, index: target ? target.index : -1, fragment: target ? target.fragment : '' });
            walk(Array.from(li.children).find(c => c.localName === 'ol' || c.localName === 'ul'), depth + 1);
        }
    };
    walk(Array.from(nav.children).find(c => c.localName === 'ol' || c.localName === 'ul'), 0);
    return out;
}

// EPUB 2: <navMap><navPoint><navLabel><text>…</text></navLabel><content src="…"/><navPoint>…</navPoint></navPoint></navMap>.
function parseEpubNcx(text, baseDir) {
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    if (doc.querySelector('parsererror')) return [];
    const navMap = doc.getElementsByTagNameNS('*', 'navMap')[0];
    if (!navMap) return [];
    const out = [];
    const walk = (parent, depth) => {
        if (depth >= EPUB_TOC_MAX_DEPTH) return;
        for (const point of Array.from(parent.children)) {
            if (out.length >= EPUB_TOC_MAX_ITEMS) return;
            if (point.localName !== 'navPoint') continue;
            const label = Array.from(point.children).find(c => c.localName === 'navLabel');
            const content = Array.from(point.children).find(c => c.localName === 'content');
            const title = epubTocTitle(label && label.textContent);
            const target = content ? epubTocTarget(baseDir, content.getAttribute('src')) : null;
            if (title) out.push({ title, depth, index: target ? target.index : -1, fragment: target ? target.fragment : '' });
            walk(point, depth + 1);
        }
    };
    walk(navMap, 0);
    return out;
}

// Зміст книги з її опису (OPF): спершу навігаційний документ EPUB 3, тоді NCX з EPUB 2. Порожній масив = нема змісту.
async function readEpubToc(zip, opfDoc, opfDir) {
    const items = Array.from(opfDoc.getElementsByTagNameNS('*', 'item'));
    const sources = [];
    const nav = items.find(i => /(^|\s)nav(\s|$)/.test(i.getAttribute('properties') || ''));
    if (nav) sources.push({ href: nav.getAttribute('href'), parse: parseEpubNav });
    const spineEl = opfDoc.getElementsByTagNameNS('*', 'spine')[0];
    const ncxId = spineEl && spineEl.getAttribute('toc');
    const ncx = items.find(i => ncxId && i.getAttribute('id') === ncxId) || items.find(i => (i.getAttribute('media-type') || '') === 'application/x-dtbncx+xml');
    if (ncx) sources.push({ href: ncx.getAttribute('href'), parse: parseEpubNcx });
    for (const source of sources) {
        try {
            const path = resolveEpubPath(opfDir, source.href || '');
            const entry = path && zip.file(path);
            if (!entry) continue;
            const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
            const entries = source.parse(await entry.async('text'), dir);
            if (entries.some(e => e.index >= 0)) return entries;
        } catch (e) { /* зіпсований зміст — пробуємо наступне джерело, а тоді старий список */ }
    }
    return [];
}

// Перехід на пункт змісту: розділ, а тоді — сторінка з якорем, якщо він є в розділі.
async function openEpubTocEntry(entry) {
    if (entry.index < 0) return;
    if (entry.index !== state.currentIndex || !els.pages.childNodes.length) await loadEpubChapter(entry.index);
    if (entry.fragment) {
        const target = document.getElementById('book-' + entry.fragment);
        if (target && els.pages.contains(target)) {
            const range = document.createRange();
            range.selectNodeContents(target);
            goToPageInChapter(pageIndexForRange(range), false);
        }
    } else if (state.pageInChapter !== 0) goToPageInChapter(0, false);
    if (window.innerWidth <= 1180) els.sidebar.classList.add('collapsed');
}

// Бічна панель: пункт = текст назви з відступом за вкладеністю; пункт без файлу в порядку читання — неактивний.
function renderEpubToc(entries) {
    els.toc.replaceChildren();
    for (const entry of entries) {
        const li = document.createElement('li');
        li.className = 'epub-toc-item';
        li.dataset.depth = String(Math.min(entry.depth, 5));
        li.dataset.index = String(entry.index);
        li.textContent = entry.title;
        if (entry.index < 0) li.classList.add('disabled');
        else li.onclick = () => openEpubTocEntry(entry);
        els.toc.appendChild(li);
    }
    markEpubTocCurrent();
}

// Поточний розділ підсвічений у змісті: перший пункт, що веде в цей файл.
function markEpubTocCurrent() {
    if (state.format !== 'epub' || !els.toc) return;
    let marked = false;
    for (const li of els.toc.querySelectorAll('.epub-toc-item')) {
        const here = !marked && li.dataset.index === String(state.currentIndex);
        li.classList.toggle('current', here);
        if (here) { li.setAttribute('aria-current', 'true'); marked = true; } else li.removeAttribute('aria-current');
    }
}

// ========== ВИНОСКИ Й ВНУТРІШНІ ПОСИЛАННЯ EPUB (власник, 2026-10-31: «починай виноски») ==========
// Раніше посилання «#id» усередині розділу лишались, але тап по них ніхто не обробляв (тап ішов у переклад цифри), а
// посилання в інший файл книги (notes.xhtml#n1 — так влаштовано більшість приміток) safeHtml відкидав. І ознаку
// «це виноска» (epub:type="noteref") safeHtml теж не пропускає, тому все розпізнаємо ДО нього: кожне внутрішнє
// посилання стає якорем «#epubref-<n|l>-<закодовані [файл, якір]>», який safeHtml зберігає як «#book-epubref-…».
// Виноска (n) — ознаки стандарту (epub:type noteref, role doc-noteref), звичні класи (Gutenberg: fnanchor) або
// коротка позначка «1», «[2]», «*», «†» у верхньому індексі. Тап по ній показує текст примітки у вікні поряд, не
// гортаючи книгу; решта внутрішніх посилань (l) переходить до свого місця. Текст сторінки не змінюється — лише адреси
// посилань, тож збережені місця читання (символьні відступи) лишаються дійсними.
const EPUB_NOTE_MAX_CHARS = 4000;   // довше — це вже не примітка, а розділ: тоді перехід, а не вікно
const EPUB_REF = 'epubref-';
const epubNoteDocs = new Map();     // шлях файлу → розібраний документ (у межах книги)
function epubLooksLikeNoteref(a) {
    const marks = `${a.getAttribute('epub:type') || ''} ${a.getAttribute('role') || ''} ${a.getAttribute('class') || ''}`;
    if (/(^|\s)(noteref|doc-noteref)(\s|$)|fnanchor|footnote|noteref|endnote/i.test(marks)) return true;
    const text = a.textContent.trim();
    const short = /^[\[(]?(\d{1,3}[a-z]?|[*†‡§¶]{1,3}|[ivxlc]{1,5})[\])]?$/i.test(text);
    return short && !!(a.closest('sup') || a.querySelector('sup') || /vertical-align\s*:\s*super/i.test(a.getAttribute('style') || ''));
}
function rewriteEpubLinks(doc, chapterDir, chapterPath) {
    for (const a of doc.querySelectorAll('a[href]')) {
        const href = (a.getAttribute('href') || '').trim();
        if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) continue;   // зовнішні посилання — як і було
        const hash = href.indexOf('#');
        const pathPart = hash >= 0 ? href.slice(0, hash) : href;
        let fragment = hash >= 0 ? href.slice(hash + 1) : '';
        try { fragment = decodeURIComponent(fragment); } catch (e) { /* як є */ }
        const path = pathPart ? resolveEpubPath(chapterDir, pathPart) : chapterPath;
        if (!path) continue;
        const kind = fragment && epubLooksLikeNoteref(a) ? 'n' : 'l';
        a.setAttribute('href', '#' + EPUB_REF + kind + '-' + encodeURIComponent(JSON.stringify([path, fragment])));
    }
}
function epubDecodeRef(href) {
    const m = /^#book-epubref-([nl])-(.+)$/.exec(href || '');
    if (!m) return null;
    try {
        const [path, fragment] = JSON.parse(decodeURIComponent(m[2]));
        return typeof path === 'string' && typeof fragment === 'string' ? { note: m[1] === 'n', path, fragment } : null;
    } catch (e) { return null; }
}
async function epubDocAt(path) {
    if (epubNoteDocs.has(path)) return epubNoteDocs.get(path);
    const entry = state.epubZip && state.epubZip.file(path);
    if (!entry) return null;
    const doc = new DOMParser().parseFromString(expandSelfClosingTags(await entry.async('text')), 'text/html');
    epubNoteDocs.set(path, doc);
    if (epubNoteDocs.size > 8) epubNoteDocs.delete(epubNoteDocs.keys().next().value);
    return doc;
}
// Текст примітки: сам елемент з якорем, а якщо якір — порожня мітка в рядку (так у Gutenberg: <a id="Footnote_1_1"/>),
// то найближчий блок навколо. Посилання всередині розгортаються в текст, зображення відкидаються, далі — safeHtml.
async function epubNoteHtml(path, fragment) {
    const doc = await epubDocAt(path);
    const target = doc && fragment ? doc.getElementById(fragment) : null;
    if (!target) return null;
    let box = target;
    const blockTags = /^(p|li|aside|div|section|dd|dt|td|blockquote|footer)$/i;
    if (!blockTags.test(box.localName) || box.textContent.trim().length < 3) {
        const up = target.closest('p, li, aside, div, section, dd, dt, td, blockquote, footer');
        if (up && up !== doc.body) box = up;
    }
    if (box.textContent.trim().length > EPUB_NOTE_MAX_CHARS) return null;
    const clone = box.cloneNode(true);
    clone.querySelectorAll('img, svg, script, style').forEach(n => n.remove());
    clone.querySelectorAll('a').forEach(n => n.replaceWith(...n.childNodes));
    const html = safeHtml(clone.outerHTML);
    return html.replace(/<[^>]+>/g, '').trim() ? html : null;
}
async function openEpubRef(ref, anchorEl) {
    const index = state.spine.indexOf(ref.path);
    if (ref.note) {
        const html = await epubNoteHtml(ref.path, ref.fragment);
        if (html) { showEpubNote(html, anchorEl, index >= 0 ? { index, fragment: ref.fragment } : null); return; }
    }
    hideEpubNote();
    if (index >= 0) await openEpubTocEntry({ index, fragment: ref.fragment });
}
// Вікно примітки — у <body>, поза областю книги: тап у ньому не перекладає й не гортає.
function hideEpubNote() { const box = document.getElementById('epub-note'); if (box) box.hidden = true; }
function showEpubNote(html, anchorEl, goTo) {
    let box = document.getElementById('epub-note');
    if (!box) {
        box = document.createElement('section');
        box.id = 'epub-note'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-labelledby', 'epub-note-title');
        box.innerHTML = '<header><strong id="epub-note-title"></strong><button type="button" class="epub-note-close"></button></header><div class="epub-note-body"></div><footer><button type="button" class="epub-note-go"></button></footer>';
        document.body.appendChild(box);
        box.querySelector('.epub-note-close').onclick = hideEpubNote;
    }
    box.querySelector('#epub-note-title').textContent = t('noteTitle');
    const close = box.querySelector('.epub-note-close');
    close.textContent = '✕'; close.setAttribute('aria-label', t('tClose')); close.title = t('tClose');
    box.querySelector('.epub-note-body').innerHTML = html;   // уже пройшло safeHtml
    const go = box.querySelector('.epub-note-go');
    go.textContent = t('noteGo'); go.hidden = !goTo;
    go.onclick = goTo ? () => { hideEpubNote(); openEpubTocEntry(goTo); } : null;
    box.hidden = false;
    // Під позначкою, а якщо внизу мало місця — над нею; по ширині — в межах екрана.
    const r = anchorEl.getBoundingClientRect(), w = Math.min(420, innerWidth - 24);
    box.style.width = w + 'px';
    box.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
    const h = box.offsetHeight, below = r.bottom + 10;
    box.style.top = (below + h < innerHeight - 12 ? below : Math.max(12, r.top - h - 10)) + 'px';
    close.focus({ preventScroll: true });
}
// Перехоплення раніше за обробник тапу (selection.js): фаза перехоплення на mainArea спрацьовує до його звичайного click.
els.mainArea.addEventListener('click', (e) => {
    if (state.format !== 'epub') return;
    const a = e.target.closest && e.target.closest('#reader-pages a[href^="#book-epubref-"]');
    if (!a) return;
    const ref = epubDecodeRef(a.getAttribute('href'));
    e.preventDefault(); e.stopImmediatePropagation();
    if (ref) openEpubRef(ref, a);
}, true);
document.addEventListener('click', (e) => {
    const box = document.getElementById('epub-note');
    if (box && !box.hidden && !box.contains(e.target) && !(e.target.closest && e.target.closest('a[href^="#book-epubref-"]'))) hideEpubNote();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideEpubNote(); });
Object.assign(I18N, {
    noteTitle: { uk: 'Примітка', en: 'Note', fr: 'Note', ru: 'Примечание', zh: '注释', ko: '주석', hi: 'टिप्पणी', ga: 'Nóta', es: 'Nota' },
    noteGo: { uk: 'Перейти до примітки', en: 'Go to the note', fr: 'Aller à la note', ru: 'Перейти к примечанию', zh: '转到注释', ko: '주석으로 이동', hi: 'टिप्पणी पर जाएँ', ga: 'Téigh chuig an nóta', es: 'Ir a la nota' }
});

async function initEpub(file, epoch = readerEpoch.book) {
    if (typeof JSZip === 'undefined') throw new Error('Не завантажено бібліотеку EPUB. Перевірте з’єднання та оновіть сторінку.');
    const verified = await runArchiveGuard(file, epoch);
    if (epoch !== readerEpoch.book) return;
    const zip = await new JSZip().loadAsync(verified || file);
    if (epoch !== readerEpoch.book) return;
    const container = zip.file('META-INF/container.xml');
    if (!container) throw new Error('Некоректний EPUB: відсутній container.xml.');
    const xml = await container.async("text");
    if (epoch !== readerEpoch.book) return; 
    const parser = new DOMParser(); const docXml = parser.parseFromString(xml, "text/xml");
    // XML prefixes are arbitrary: ocf:rootfile and opf:item are as valid as
    // unprefixed elements in the default EPUB namespaces.
    const rootfile = docXml.getElementsByTagNameNS('*', 'rootfile')[0];
    if (!rootfile || docXml.querySelector('parsererror')) throw new Error('Некоректний опис EPUB.');
    const opfPath = rootfile.getAttribute('full-path');
    if (!opfPath || !zip.file(opfPath)) throw new Error('Не знайдено опис книги EPUB.');
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : "";
    const doc = parser.parseFromString(await zip.file(opfPath).async("text"), "text/xml");
    if (epoch !== readerEpoch.book) return;
    if (doc.querySelector('parsererror')) throw new Error('Некоректний опис книги EPUB.');
    state.epubZip = zip; epubNoteDocs.clear(); hideEpubNote();
    // Мова книги з метаданих (dc:language): книжки бібліотеки (Gutenberg) її мають завжди.
    state.bookLangMeta = normalizeBookLang(doc.getElementsByTagNameNS('*', 'language')[0]?.textContent);
    const man = Object.create(null); const items = doc.getElementsByTagNameNS('*', 'item');
    for(let i=0; i<items.length; i++) man[items[i].getAttribute("id")] = items[i].getAttribute("href");
    
    state.spine = []; const refs = doc.getElementsByTagNameNS('*', 'itemref');
    for(let i=0; i<refs.length; i++) { 
        const id = refs[i].getAttribute("idref"); 
        if(man[id]) {
            let cleanPath = man[id].split('#')[0].split('?')[0];
            state.spine.push(resolveEpubPath(opfDir, cleanPath)); 
        }
    }
    if(state.spine.length === 0) throw new Error(t('noChapters'));
    state.totalPages = state.spine.length; 
    
    computeBookWeights(epoch);
    const tocEntries = await readEpubToc(zip, doc, opfDir);
    if (epoch !== readerEpoch.book) return;
    state.epubToc = tocEntries;
    if (tocEntries.length) renderEpubToc(tocEntries);
    else buildToc(state.totalPages, "Розділ", (i) => { loadEpubChapter(i); if(window.innerWidth <= 1180) els.sidebar.classList.add('collapsed'); });
    const bm = loadBookmark();
    const startIdx = (bm && bm.format === 'epub' && bm.currentIndex >= 0 && bm.currentIndex < state.spine.length) ? bm.currentIndex : 0;
    await loadEpubChapter(startIdx, false, bm ? bm.pageInChapter : null, bm?.textOffset);
    if (epoch !== readerEpoch.book) return;
    enterMobileFullScreenIfNeeded();
}

async function loadEpubChapter(idx, toEnd = false, startPage = null, textOffset = null) {
    if(idx < 0 || idx >= state.spine.length || !state.epubZip) return;
    const epoch = readerEpoch.book, render = ++readerEpoch.render;
    const current = () => epoch === readerEpoch.book && render === readerEpoch.render;
    invalidateSelection();
    if (isSpeakingGlobal) stopGlobalTTS();
    state.currentIndex = idx;

    try {
        // resolveEpubPath already decoded the URI once. A second decode would
        // select the wrong entry for names containing literal percent escapes.
        const fileObj = state.epubZip.file(state.spine[idx]);

        if(!fileObj) {
            els.pages.innerHTML = `<div style="color:red;text-align:center;padding:50px;">${t('chapterMissing')}</div>`;
        } else {
            let data = await fileObj.async("text");
            if (!current()) return;
            
            const zip = state.epubZip;
            const chapterDir = fileObj.name.includes('/') ? fileObj.name.substring(0, fileObj.name.lastIndexOf('/') + 1) : "";
            const tempDoc = new DOMParser().parseFromString(expandSelfClosingTags(data), "text/html");
            // Common EPUB covers wrap a raster image in SVG. Resolve that image
            // through the archive; standalone vector art uses the inert subset.
            for (const svg of Array.from(tempDoc.querySelectorAll('svg'))) {
                const embedded = svg.querySelector('image');
                const src = embedded ? await epubImage(zip, chapterDir, embedded.getAttribute('href') || embedded.getAttribute('xlink:href') || '') : await bookSvgPng(svg.outerHTML);
                const img = tempDoc.createElement('img');
                if (src) img.setAttribute('src', src);
                img.alt = svg.querySelector('title')?.textContent || '';
                svg.replaceWith(img);
                if (!current()) return;
            }
            const imgs = tempDoc.getElementsByTagName('img');
            for (const img of imgs) {
                const src = await epubImage(zip, chapterDir, img.getAttribute('src') || '');
                img.removeAttribute('src'); img.removeAttribute('srcset');
                if (src) img.setAttribute('src', src);
                if (!current()) return;
            }
            await applyEpubBookStyles(zip, chapterDir, tempDoc);
            rewriteEpubLinks(tempDoc, chapterDir, fileObj.name);
            if (!current()) return;
            data = tempDoc.body.innerHTML;
            if (!current()) return;
            
            els.pages.innerHTML = safeHtml(data);
            if (!bookContentPresent(els.pages)) throw new Error(t('emptyDoc'));
        }
        state.extractedTextForTTS = els.pages.innerText;
        if (state.epubToc && state.epubToc.length) markEpubTocCurrent();
        updateSourceLang();   // мова книги — перевизначається на кожному розділі
        await settleBookLayout(current, toEnd ? -1 : (startPage ?? 0), textOffset);
    } catch (err) {
        if (!current()) return;
        // Any unexpected failure now shows a message instead of leaving the reader
        // in a broken, unresponsive state (which looked like "everything got kicked out").
        els.pages.innerHTML = `<div style="color:red;text-align:center;padding:50px;">Помилка завантаження розділу: ${escapeHtml(err.message)}</div>`;
        els.progress.textContent = `${idx + 1} із ${state.totalPages}`;
    }
}

// Розділи EPUB — це XHTML, а розбираємо їх як HTML. У XHTML «<pre/>» чи «<a id="x"/>» — порожній елемент, а HTML-розбір
// бачить у них ВІДКРИТИЙ тег: у книгах Gutenberg (Les Misérables) після «<pre/>» увесь розділ ставав неперенесеним
// текстом і вилазив за сторінку, а «<a id/>» загортав у посилання все до кінця блоку. Тому самозакриті НЕ порожні
// за природою теги розгортаються в пару; br/img/hr та інші порожні лишаються як є. Тег з «>» усередині атрибута
// регулярний вираз не зачепить — він лишається без змін, як і раніше.
const VOID_HTML_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
function expandSelfClosingTags(markup) {
    return String(markup).replace(/<([A-Za-z][\w:-]*)(\s[^<>]*?)?\s*\/>/g,
        (whole, tag, attrs = '') => VOID_HTML_TAGS.has(tag.toLowerCase()) ? whole : `<${tag}${attrs}></${tag}>`);
}

// ========== ІНШІ ФОРМАТИ КНИЖОК ==========
// Усі вони зводяться до одного: отримати HTML і показати його сторінками так само,
// як розділ EPUB. Тому далі працює вже наявна пагінація, переклад і озвучення.
async function initRichDoc(file, ext, epoch = readerEpoch.book) {
    let bodyHtml = '';

    if (ext === 'docx') {
        if (typeof mammoth === 'undefined') throw new Error(t('unsupportedFormat'));
        // DOCX теж ZIP-контейнер — та сама перевірка, що й для EPUB.
        const verifiedDocx = await runArchiveGuard(file, epoch);
        if (epoch !== readerEpoch.book) return;
        const docxBuffer = verifiedDocx || await file.arrayBuffer();
        const res = await mammoth.convertToHtml({ arrayBuffer: docxBuffer });
        bodyHtml = res.value || '';
    } else if (ext === 'fb2' || ext === 'fb2.zip') {
        if (ext === 'fb2.zip') {
            const verified = await runArchiveGuard(file, epoch);
            if (epoch !== readerEpoch.book) return;
            const zip = await JSZip.loadAsync(verified || file);
            const books = Object.values(zip.files).filter(entry => !entry.dir && /\.fb2$/i.test(entry.name));
            if (books.length !== 1) throw new Error('FB2.ZIP має містити рівно одну книгу FB2.');
            file = new Blob([await books[0].async('uint8array')]);
        }
        if (epoch !== readerEpoch.book) return;
        bodyHtml = parseFb2(await readBookXml(file));
    } else if (ext === 'md' || ext === 'markdown') {
        bodyHtml = marked.parse(await file.text(), { async: false, gfm: true });
    } else if (ext === 'html' || ext === 'htm') {
        // A real-world .html upload is very often a FULL saved page (<html><head>
        // <title>...</title>...</head><body>...), not a bare fragment — parsing it
        // as a document and keeping only <body> mirrors what loadEpubChapter()
        // already does for spine XHTML, and for the same reason: passing the raw
        // text straight into safeHtml() left <title> (allowed-nor-dropped, so its
        // text got silently kept) as the page's FIRST "chapter" ahead of the real
        // content, since splitIntoChapters() below starts a new chapter at the
        // next heading — the reader opened on a near-empty page showing only the
        // leaked title, with the actual content one chapter further in.
        const page = new DOMParser().parseFromString(expandSelfClosingTags(await file.text()), 'text/html');
        state.bookLangMeta = normalizeBookLang(page.documentElement.getAttribute('lang'));   // книги Wikisource з бібліотеки мають <html lang>
        bodyHtml = page.body.innerHTML;
    } else if (ext === 'rtf') {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const header = new TextDecoder().decode(bytes.subarray(0, 1024));
        const codepage = header.match(/\\ansicpg(\d+)\b/)?.[1] || '1252';
        bodyHtml = rtfToHtml(new TextDecoder(codepage === '65001' ? 'utf-8' : 'windows-' + codepage).decode(bytes));
    }

    if (epoch !== readerEpoch.book) return;
    if (!bodyHtml.trim()) throw new Error(t('emptyDoc'));

    // Розбиваємо на розділи по заголовках — щоб працював зміст і навігація.
    const holder = document.createElement('div');
    holder.innerHTML = safeHtml(bodyHtml);
    if (!bookContentPresent(holder)) throw new Error(t('emptyDoc'));
    state.docChapters = splitIntoChapters(holder);
    state.totalPages = state.docChapters.length;
    computeBookWeights(epoch);

    buildToc(state.totalPages, t('chapter'), i => {
        renderDocChapter(i);
        if (window.innerWidth <= 1180) els.sidebar.classList.add('collapsed');
    });
    const bm = loadBookmark();
    const startIdx = (bm && bm.currentIndex >= 0 && bm.currentIndex < state.totalPages) ? bm.currentIndex : 0;
    await renderDocChapter(startIdx, false, bm ? bm.pageInChapter : null, bm?.textOffset);
    if (epoch !== readerEpoch.book) return;
    enterMobileFullScreenIfNeeded();
}

// Ділимо документ на розділи по заголовках; якщо їх немає — по обсягу тексту,
// щоб дуже довгий файл не розкладався в одну гігантську колонку.
function bookContentPresent(node) {
    return !!node.textContent.trim() || (node.nodeType === Node.ELEMENT_NODE &&
        (node.matches('img[src],hr') || !!node.querySelector('img[src],hr')));
}

function splitIntoChapters(holder) {
    const nodes = Array.from(holder.childNodes);
    const chapters = [];
    let cur = [], curLen = 0;
    const flush = () => { if (cur.length) { chapters.push(cur.map(n => n.nodeType === Node.TEXT_NODE ? escapeHtml(n.textContent) : (n.outerHTML || '')).join('')); cur = []; curLen = 0; } };
    for (const n of nodes) {
        const isHeading = n.nodeType === Node.ELEMENT_NODE && /^H[1-3]$/.test(n.tagName);
        // A heading only starts a NEW chapter if something more than insignificant
        // whitespace came before it — otherwise a source file's own indentation
        // (a lone text node like "\n" between <body> and its first <h1>, common in
        // hand-formatted HTML/exported documents) produced a spurious near-empty
        // first "chapter", and the reader opened straight onto it instead of the
        // real content one chapter further in.
        const hasContent = cur.some(bookContentPresent);
        if ((isHeading && hasContent) || curLen > 12000) flush();
        cur.push(n);
        curLen += (n.textContent || '').length;
    }
    flush();
    return chapters.length ? chapters : [holder.innerHTML];
}

async function renderDocChapter(idx, toEnd = false, startPage = null, textOffset = null) {
    if (isSpeakingGlobal) stopGlobalTTS();
    if (!state.docChapters || idx < 0 || idx >= state.docChapters.length) return;
    const render = ++readerEpoch.render;
    invalidateSelection();
    state.currentIndex = idx;
    els.pages.innerHTML = state.docChapters[idx];
    state.extractedTextForTTS = els.pages.innerText;
    updateSourceLang();
    await settleBookLayout(() => render === readerEpoch.render, toEnd ? -1 : (startPage ?? 0), textOffset);
}

// FB2 → HTML: у FictionBook свої назви тегів, зіставляємо їх зі звичайними.
function fb2ToHtml(node, images = new Map()) {
    const map = { section: 'div', title: 'h2', p: 'p', emphasis: 'em', strong: 'b',
                  subtitle: 'h3', epigraph: 'blockquote', 'empty-line': 'br', poem: 'div', stanza: 'p', v: 'div' };
    let out = '';
    node.childNodes.forEach(ch => {
        if (ch.nodeType === Node.TEXT_NODE) { out += escapeHtml(ch.nodeValue); return; }
        if (ch.nodeType !== Node.ELEMENT_NODE) return;
        const name = ch.localName.toLowerCase();
        const href = ch.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || ch.getAttribute('href') || '';
        if (name === 'image') {
            const src = images.get(href.slice(1));
            if (href.startsWith('#') && src) out += `<img src="${src}" alt="${escapeHtml(ch.getAttribute('title') || '')}">`;
            return;
        }
        const tag = name === 'a' ? 'a' : map[name];
        if (!tag) { out += fb2ToHtml(ch, images); return; }
        const attrs = (ch.getAttribute('id') ? ` id="${escapeHtml(ch.getAttribute('id'))}"` : '') + (tag === 'a' ? ` href="${escapeHtml(href)}"` : '');
        out += tag === 'br' ? '<br>' : `<${tag}${attrs}>${fb2ToHtml(ch, images)}</${tag}>`;
    });
    return out;
}

// RTF: витягуємо чистий текст — розмітку RTF повністю відтворити тут неможливо,
// але для читання й перекладу потрібен саме текст.
function rtfToHtml(rtf) {
    if (!/^\s*\{\\rtf1\b/.test(rtf)) throw new Error('Некоректний RTF.');
    // RTF is grouped, not a sequence of independent regex replacements. Group
    // scope controls Unicode fallbacks/code pages and suppresses picture bytes,
    // font tables and ignorable destinations. Formatting remains plain text.
    const ignored = new Set('fonttbl colortbl stylesheet info generator pict object objdata shppict nonshppict listtable listoverridetable listtext pntext datastore themedata colorschememapping xmlnstbl fldinst'.split(' '));
    const symbols = { '~': '\u00a0', '_': '\u2011', '-': '' };
    const words = { par: '\n', line: '\n', tab: '\t', emdash: '—', endash: '–', bullet: '•', lquote: '‘', rquote: '’', ldblquote: '“', rdblquote: '”' };
    let context = { skip: false, uc: 1, codepage: 'windows-1252' };
    const stack = [], output = [];
    let fallback = 0;
    const literal = value => {
        if (fallback) { fallback--; return; }
        if (!context.skip) output.push(value);
    };
    for (let i = 0; i < rtf.length;) {
        const ch = rtf[i++];
        if (ch === '{') { stack.push(context); context = { ...context }; continue; }
        if (ch === '}') { context = stack.pop() || context; fallback = 0; continue; }
        if (ch === '\r' || ch === '\n') continue;
        if (ch !== '\\') { literal(ch); continue; }
        const next = rtf[i++];
        if (next === '\\' || next === '{' || next === '}') { literal(next); continue; }
        if (next === '*') { context.skip = true; continue; }
        if (next in symbols) { literal(symbols[next]); continue; }
        if (next === "'") {
            const bytes = [];
            do {
                const hex = rtf.slice(i, i + 2);
                if (!/^[a-f\d]{2}$/i.test(hex)) throw new Error('Некоректний RTF.');
                bytes.push(parseInt(hex, 16)); i += 2;
                if (rtf.slice(i, i + 2) !== "\\'") break;
                i += 2;
            } while (i < rtf.length);
            const skip = Math.min(fallback, bytes.length); fallback -= skip;
            if (!context.skip && skip < bytes.length) output.push(new TextDecoder(context.codepage).decode(new Uint8Array(bytes.slice(skip))));
            continue;
        }
        if (!/[a-z]/i.test(next || '')) continue;
        let word = next;
        while (/[a-z]/i.test(rtf[i] || '')) word += rtf[i++];
        let digits = '';
        if (rtf[i] === '-') digits += rtf[i++];
        while (/\d/.test(rtf[i] || '')) digits += rtf[i++];
        const number = Number(digits);
        if (rtf[i] === ' ') i++;
        if (word === 'bin') { i += Math.max(0, number); continue; }
        if (ignored.has(word)) { context.skip = true; continue; }
        if (word === 'ansicpg') { context.codepage = number === 65001 ? 'utf-8' : 'windows-' + number; continue; }
        if (word === 'uc') { context.uc = Math.max(0, number); continue; }
        if (word === 'u') {
            if (!context.skip) output.push(String.fromCharCode(number & 0xffff));
            fallback = context.uc; continue;
        }
        if (word in words) literal(words[word]);
    }
    if (stack.length) throw new Error('Некоректний RTF.');
    return output.join('').split(/\n{1,}/).map(p => p.trim()).filter(Boolean)
            .map(p => `<p>${escapeHtml(p)}</p>`).join('');
}

async function initTxt(file, epoch = readerEpoch.book) {
    const text = await file.text();
    if (epoch !== readerEpoch.book) return;
    // Same "no text found" guard initRichDoc already has for the other formats —
    // an empty .txt used to silently "succeed" into a blank, single-page reader
    // instead of the clear error every other empty/unusable file gets.
    if (!text.trim()) throw new Error(t('emptyDoc'));
    state.txtLines = text.split(/\r?\n/); state.totalPages = Math.ceil(state.txtLines.length / 50);
    computeBookWeights(epoch);
    buildToc(state.totalPages, "Блок", i => { renderTxtPage(i); if(window.innerWidth <= 1180) els.sidebar.classList.add('collapsed'); });
    const bm = loadBookmark();
    const startIdx = (bm && bm.format === 'txt' && bm.currentIndex >= 0 && bm.currentIndex < state.totalPages) ? bm.currentIndex : 0;
    await renderTxtPage(startIdx, false, bm ? bm.pageInChapter : null, bm?.textOffset);
    if (epoch !== readerEpoch.book) return;
    enterMobileFullScreenIfNeeded();
}
async function renderTxtPage(pageIdx, toEnd = false, startPage = null, textOffset = null) {
    if (pageIdx < 0 || pageIdx >= state.totalPages) return;
    const render = ++readerEpoch.render;
    invalidateSelection();
    if (isSpeakingGlobal) stopGlobalTTS();
    state.currentIndex = pageIdx; const chunk = state.txtLines.slice(pageIdx * 50, (pageIdx + 1) * 50).join('\n');
    els.pages.replaceChildren();
    const block = document.createElement('div'); block.className = 'txt-block'; block.textContent = chunk; els.pages.appendChild(block); state.extractedTextForTTS = chunk;
    updateSourceLang();
    await settleBookLayout(() => render === readerEpoch.render, toEnd ? -1 : (startPage ?? 0), textOffset);
}
