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
        paginateContainer();
        goToPageInChapter(page === -1 ? state.totalPagesInChapter - 1 : (pageForBookTextOffset(offset) ?? page), false);
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
    state.epubZip = zip; 
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
    
    buildToc(state.totalPages, "Розділ", (i) => { loadEpubChapter(i); if(window.innerWidth <= 1180) els.sidebar.classList.add('collapsed'); });
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
            const tempDoc = new DOMParser().parseFromString(data, "text/html");
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
            data = tempDoc.body.innerHTML;
            if (!current()) return;
            
            els.pages.innerHTML = safeHtml(data);
            if (!bookContentPresent(els.pages)) throw new Error(t('emptyDoc'));
        }
        state.extractedTextForTTS = els.pages.innerText;
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
        bodyHtml = new DOMParser().parseFromString(await file.text(), 'text/html').body.innerHTML;
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
