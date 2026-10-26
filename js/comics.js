/* comics.js — CBZ: комікси й журнали-архіви (ZIP із зображеннями сторінок).
 * Кожна сторінка книги — одне зображення, розпаковане через JSZip (vendor/jszip-3.10.1.min.js) під час показу.
 * Тексту в коміксів немає, тож переклад слів і озвучка тут не працюють. Порядок сторінок — за номерами в іменах файлів
 * (2.jpg раніше за 10.jpg). Класичний <script src>, а не ES-модуль (див. js/core.js). */

const CBZ_IMAGE = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;
let cbzObjectUrl = null;

async function initCbz(file, epoch = readerEpoch.book) {
    if (typeof JSZip === 'undefined') throw new Error(t('unsupportedFormat'));
    const zip = await JSZip.loadAsync(file);
    if (epoch !== readerEpoch.book) return;
    const names = Object.keys(zip.files)
        .filter(n => !zip.files[n].dir && CBZ_IMAGE.test(n) && !n.startsWith('__MACOSX/'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    if (!names.length) throw new Error(t('emptyDoc'));
    state.cbzZip = zip; state.cbzNames = names;
    state.totalPages = names.length; state.totalPagesInChapter = 1; state.pageInChapter = 0;
    buildToc(names.length, 'Сторінка', i => renderCbzPage(i));
    const bm = loadBookmark();
    const start = (bm && bm.format === 'cbz' && bm.currentIndex >= 0 && bm.currentIndex < names.length) ? bm.currentIndex : 0;
    await renderCbzPage(start);
    if (epoch !== readerEpoch.book) return;
    enterMobileFullScreenIfNeeded();
}

async function renderCbzPage(index) {
    if (!state.cbzZip || index < 0 || index >= state.totalPages) return;
    const render = ++readerEpoch.render;
    invalidateSelection();
    if (isSpeakingGlobal) stopGlobalTTS();
    const blob = await state.cbzZip.file(state.cbzNames[index]).async('blob');
    if (render !== readerEpoch.render) return;   // гортання встигло піти далі
    if (cbzObjectUrl) URL.revokeObjectURL(cbzObjectUrl);
    cbzObjectUrl = URL.createObjectURL(blob);
    const img = document.createElement('img');
    img.className = 'cbz-page'; img.alt = `${index + 1} / ${state.totalPages}`; img.src = cbzObjectUrl;
    els.pages.replaceChildren(img);
    state.currentIndex = index; state.pageInChapter = 0; state.totalPagesInChapter = 1;
    state.extractedTextForTTS = '';
}
