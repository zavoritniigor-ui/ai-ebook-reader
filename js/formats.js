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

// ОНОВЛЕНИЙ НАДІЙНИЙ ПАРСЕР EPUB
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
    const rootfile = docXml.getElementsByTagName('rootfile')[0];
    if (!rootfile || docXml.querySelector('parsererror')) throw new Error('Некоректний опис EPUB.');
    const opfPath = rootfile.getAttribute('full-path');
    if (!opfPath || !zip.file(opfPath)) throw new Error('Не знайдено опис книги EPUB.');
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : "";
    const doc = parser.parseFromString(await zip.file(opfPath).async("text"), "text/xml");
    if (epoch !== readerEpoch.book) return;
    if (doc.querySelector('parsererror')) throw new Error('Некоректний опис книги EPUB.');
    state.epubZip = zip; 
    const man = Object.create(null); const items = doc.getElementsByTagName("item");
    for(let i=0; i<items.length; i++) man[items[i].getAttribute("id")] = items[i].getAttribute("href");
    
    state.spine = []; const refs = doc.getElementsByTagName("itemref");
    for(let i=0; i<refs.length; i++) { 
        const id = refs[i].getAttribute("idref"); 
        if(man[id]) {
            let cleanPath = man[id].split('#')[0].split('?')[0];
            state.spine.push(opfDir + cleanPath); 
        }
    }
    if(state.spine.length === 0) throw new Error(t('noChapters'));
    state.totalPages = state.spine.length; 
    
    buildToc(state.totalPages, "Розділ", (i) => { loadEpubChapter(i); if(window.innerWidth <= 1180) els.sidebar.classList.add('collapsed'); });
    const bm = loadBookmark();
    const startIdx = (bm && bm.format === 'epub' && bm.currentIndex >= 0 && bm.currentIndex < state.spine.length) ? bm.currentIndex : 0;
    await loadEpubChapter(startIdx, false, bm ? bm.pageInChapter : null);
    if (epoch !== readerEpoch.book) return;
    enterMobileFullScreenIfNeeded();
}

async function loadEpubChapter(idx, toEnd = false, startPage = null) {
    if(idx < 0 || idx >= state.spine.length || !state.epubZip) return;
    const epoch = readerEpoch.book, render = ++readerEpoch.render;
    const current = () => epoch === readerEpoch.book && render === readerEpoch.render;
    invalidateSelection();
    if (isSpeakingGlobal) stopGlobalTTS();
    state.currentIndex = idx;

    try {
        const rawPath = state.spine[idx];
        let filePath = rawPath;
        // decodeURIComponent throws on malformed sequences (e.g. a literal "%" in a filename).
        // That used to abort the whole function silently — now we just fall back to the raw path.
        try { filePath = decodeURIComponent(rawPath); } catch (e) { filePath = rawPath; }

        let fileObj = state.epubZip.file(filePath) || state.epubZip.file(rawPath);

        if(!fileObj) {
            const allFiles = Object.keys(state.epubZip.files);
            const fuzzyMatch = allFiles.find(name => name.endsWith(filePath) || name.endsWith(rawPath));
            if(fuzzyMatch) fileObj = state.epubZip.file(fuzzyMatch);
        }

        if(!fileObj) {
            els.pages.innerHTML = `<div style="color:red;text-align:center;padding:50px;">${t('chapterMissing')}</div>`;
        } else {
            const data = await fileObj.async("text");
            if (!current()) return;
            els.pages.innerHTML = safeHtml(data);
        }
        state.extractedTextForTTS = els.pages.innerText;
        updateSourceLang();   // мова книги — перевизначається на кожному розділі
        requestAnimationFrame(() => {
            if (!current()) return;
            paginateContainer();
            const target = toEnd ? state.totalPagesInChapter - 1 : (startPage != null ? startPage : 0);
            goToPageInChapter(target, false);
        });
    } catch (err) {
        if (!current()) return;
        // Any unexpected failure now shows a message instead of leaving the reader
        // in a broken, unresponsive state (which looked like "everything got kicked out").
        els.pages.innerHTML = `<div style="color:red;text-align:center;padding:50px;">Помилка завантаження розділу: ${escapeHtml(err.message)}</div>`;
        els.progress.textContent = `${idx + 1} із ${state.totalPages}`;
    }
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
    } else if (ext === 'fb2') {
        // FictionBook — це XML: беремо <body> і перетворюємо його теги на HTML.
        const xml = new DOMParser().parseFromString(await file.text(), 'application/xml');
        const body = xml.querySelector('body');
        bodyHtml = body ? fb2ToHtml(body) : '';
    } else if (ext === 'html' || ext === 'htm') {
        bodyHtml = await file.text();
    } else if (ext === 'rtf') {
        bodyHtml = rtfToHtml(await file.text());
    }

    if (epoch !== readerEpoch.book) return;
    if (!bodyHtml.trim()) throw new Error(t('emptyDoc'));

    // Розбиваємо на розділи по заголовках — щоб працював зміст і навігація.
    const holder = document.createElement('div');
    holder.innerHTML = safeHtml(bodyHtml);
    state.docChapters = splitIntoChapters(holder);
    state.totalPages = state.docChapters.length;

    buildToc(state.totalPages, t('chapter'), i => {
        renderDocChapter(i);
        if (window.innerWidth <= 1180) els.sidebar.classList.add('collapsed');
    });
    const bm = loadBookmark();
    const startIdx = (bm && bm.currentIndex >= 0 && bm.currentIndex < state.totalPages) ? bm.currentIndex : 0;
    renderDocChapter(startIdx, false, bm ? bm.pageInChapter : null);
    enterMobileFullScreenIfNeeded();
}

// Ділимо документ на розділи по заголовках; якщо їх немає — по обсягу тексту,
// щоб дуже довгий файл не розкладався в одну гігантську колонку.
function splitIntoChapters(holder) {
    const nodes = Array.from(holder.childNodes);
    const chapters = [];
    let cur = [], curLen = 0;
    const flush = () => { if (cur.length) { chapters.push(cur.map(n => n.nodeType === Node.TEXT_NODE ? escapeHtml(n.textContent) : (n.outerHTML || '')).join('')); cur = []; curLen = 0; } };
    for (const n of nodes) {
        const isHeading = n.nodeType === Node.ELEMENT_NODE && /^H[1-3]$/.test(n.tagName);
        if ((isHeading && cur.length) || curLen > 12000) flush();
        cur.push(n);
        curLen += (n.textContent || '').length;
    }
    flush();
    return chapters.length ? chapters : [holder.innerHTML];
}

function renderDocChapter(idx, toEnd = false, startPage = null) {
    if (isSpeakingGlobal) stopGlobalTTS();
    if (!state.docChapters || idx < 0 || idx >= state.docChapters.length) return;
    const render = ++readerEpoch.render;
    invalidateSelection();
    state.currentIndex = idx;
    els.pages.innerHTML = state.docChapters[idx];
    state.extractedTextForTTS = els.pages.innerText;
    updateSourceLang();
    requestAnimationFrame(() => {
        if (render !== readerEpoch.render) return;
        paginateContainer();
        const target = toEnd ? state.totalPagesInChapter - 1 : (startPage != null ? startPage : 0);
        goToPageInChapter(target, false);
    });
}

// FB2 → HTML: у FictionBook свої назви тегів, зіставляємо їх зі звичайними.
function fb2ToHtml(node) {
    const map = { section: 'div', title: 'h2', p: 'p', emphasis: 'em', strong: 'b',
                  subtitle: 'h3', epigraph: 'blockquote', 'empty-line': 'br', poem: 'div', stanza: 'p', v: 'div' };
    let out = '';
    node.childNodes.forEach(ch => {
        if (ch.nodeType === Node.TEXT_NODE) { out += escapeHtml(ch.nodeValue); return; }
        if (ch.nodeType !== Node.ELEMENT_NODE) return;
        const tag = map[ch.tagName.toLowerCase()];
        if (!tag) { out += fb2ToHtml(ch); return; }
        out += tag === 'br' ? '<br>' : `<${tag}>${fb2ToHtml(ch)}</${tag}>`;
    });
    return out;
}

// RTF: витягуємо чистий текст — розмітку RTF повністю відтворити тут неможливо,
// але для читання й перекладу потрібен саме текст.
function rtfToHtml(rtf) {
    let s = rtf
        .replace(/\\'([0-9a-f]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\u(-?\d+)\s?\??/g, (m, n) => String.fromCharCode(parseInt(n, 10) & 0xFFFF))
        // Службові групи заголовка RTF (таблиця шрифтів, кольорів, стилі, метадані) —
        // інакше в текст просочується сміття на кшталт "Times;".
        .replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|generator|\*)[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/gi, '')
        .replace(/\\par[d]?\b/g, '\n')
        .replace(/\\[a-z]+-?\d*\s?/gi, '')
        .replace(/[{}]/g, '');
    return s.split(/\n{1,}/).map(p => p.trim()).filter(Boolean)
            .map(p => `<p>${escapeHtml(p)}</p>`).join('');
}

async function initTxt(file, epoch = readerEpoch.book) {
    const text = await file.text();
    if (epoch !== readerEpoch.book) return;
    state.txtLines = text.split(/\r?\n/); state.totalPages = Math.ceil(state.txtLines.length / 50);
    buildToc(state.totalPages, "Блок", i => { renderTxtPage(i); if(window.innerWidth <= 1180) els.sidebar.classList.add('collapsed'); });
    const bm = loadBookmark();
    const startIdx = (bm && bm.format === 'txt' && bm.currentIndex >= 0 && bm.currentIndex < state.totalPages) ? bm.currentIndex : 0;
    renderTxtPage(startIdx, false, bm ? bm.pageInChapter : null);
    enterMobileFullScreenIfNeeded();
}
function renderTxtPage(pageIdx, toEnd = false, startPage = null) {
    if (pageIdx < 0 || pageIdx >= state.totalPages) return;
    const render = ++readerEpoch.render;
    invalidateSelection();
    if (isSpeakingGlobal) stopGlobalTTS();
    state.currentIndex = pageIdx; const chunk = state.txtLines.slice(pageIdx * 50, (pageIdx + 1) * 50).join('\n');
    els.pages.replaceChildren();
    const block = document.createElement('div'); block.className = 'txt-block'; block.textContent = chunk; els.pages.appendChild(block); state.extractedTextForTTS = chunk;
    updateSourceLang();
    requestAnimationFrame(() => {
        if (render !== readerEpoch.render) return;
        paginateContainer();
        const target = toEnd ? state.totalPagesInChapter - 1 : (startPage != null ? startPage : 0);
        goToPageInChapter(target, false);
    });
}
