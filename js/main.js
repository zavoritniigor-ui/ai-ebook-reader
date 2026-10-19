/* main.js — фінальне складання: усе, що лишилось після Кроків 1-17 і не належить
 * жодному окремому фіче-модулю. Загальні налаштування читалки (мова інтерфейсу/
 * тема/цільова мова перекладу/вибір голосу — відновлення збереженого стану й
 * onchange-обробники), перемикач режиму "Вивчення", кнопки Ask-панелі (мікрофон/
 * відправити), кросмодульний диспетчер завантаження файлу книги (визначає формат
 * за розширенням і викликає initEpub/initPdf/initTxt/initRichDoc з відповідного
 * модуля — саме ця функція названа в MODULARIZATION_PLAN.md як головна
 * відповідальність main.js), кнопки масштабу/навігації, і стартові виклики, що
 * мають виконатись ОСТАННІМИ (updateDictationUI/applyI18n — після того, як усі
 * функції з усіх інших модулів вже визначені).
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується
 * передостаннім, одразу після js/onboarding.js і перед js/pwa-lifecycle.js —
 * НАВМИСНО не раніше: applyI18n() усередині викликає updateAltVoicesBtn/
 * updateTtsButtons (js/tts.js), updateProgressText (js/navigation.js),
 * updateDictationUI (js/dictation.js) — усі як ТОП-РІВНЕВІ негайні виклики, тому
 * цей файл мусить завантажуватись після них усіх. Це та сама позиція, де раніше
 * фізично стояв бекстрап-блок у монолітному index.html — переміщення файлу
 * раніше відтворило б інцидент Кроків 1-3 (ReferenceError на щось із пізнішого
 * модуля).
 *
 * Решта коду тут — лише реєстрація onchange/onclick-обробників, а не негайні
 * виклики: порядок їхньої реєстрації відносно решти застосунку не впливає на
 * поведінку, бо document.body.inert (js/pwa-lifecycle.js) блокує будь-яку
 * взаємодію користувача, доки не завершиться завантаження геть усіх скриптів.
 */

// Мова інтерфейсу: застосовуємо збережений вибір і перемальовуємо всі написи.
els.uiLang.value = state.uiLang;
els.uiLang.onchange = (e) => {
    state.uiLang = e.target.value;
    writeStored('reader_ui_lang', state.uiLang);
    document.documentElement.lang = state.uiLang;
    applyI18n();
};

// Тема оформлення й режим "Вивчення" — теж переживають перезапуск/повернення з
// фону, а не скидаються щоразу до світлої теми й вимкненого режиму.
(() => {
    const savedTheme = readStored('reader_theme');
    if (savedTheme) document.body.setAttribute('data-theme', savedTheme);
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = document.body.getAttribute('data-theme') || 'light';
})();
if (state.translateMode) {
    setMenuSwitch(els.translateBtn, true);
    els.container.classList.add('mode-translate'); document.body.classList.add('mode-translate-on');
}

els.targetLang.value = state.targetLang;
els.targetLang.onchange = (e) => {
    state.targetLang = e.target.value;
    cancelAsyncTasks(); invalidateSelection();
    [els.askPanel, els.grammarPanel].forEach(panel => {
        if (panel.classList.contains('loading')) panel.querySelector('.panel-content').textContent = t('selectFirst');
        panel.classList.remove('loading');
    });
    els.grammarContent.querySelectorAll('.verb-focus').forEach(n => n.remove());
    writeStored('reader_target_lang', state.targetLang);
    // Кеш не скидаємо: ключі містять мову, тому переклади різними мовами не змішуються
    // і при поверненні до попередньої мови показуються миттєво.
    // Нова цільова мова — новий напрямок пари для локального перекладача; той самий
    // "розігрів" мовного пакета, що й у updateSourceLang() (js/lang-detect.js).
    warmLocalTranslator(pageLang(), state.targetLang);
};


// РЕЖИМ ВИВЧЕННЯ ТА ZERO-MEMORY
els.translateBtn.onclick = () => {
    state.translateMode = !state.translateMode;
    setMenuSwitch(els.translateBtn, state.translateMode);
    if (state.translateMode) { els.container.classList.add('mode-translate'); document.body.classList.add('mode-translate-on'); }
    else { els.container.classList.remove('mode-translate'); document.body.classList.remove('mode-translate-on'); }
    // Back to the page so the next tap can be a word -- a moment later, so the switch is seen to move first.
    setTimeout(() => document.body.classList.add('immersive-mode'), 350);
    writeStored('reader_translate_mode', state.translateMode ? '1' : '0');
};

// ========== ВИЗНАЧЕННЯ СЛОВА ПІД КУРСОРОМ/ТАПОМ (той самий спосіб, що й нативний
// подвійний клік у браузері та більшість читалок і словникових розширень) ==========
// Замість ручного підрахунку меж слова через regex (що ламається на дефісах, апострофах,
// не-латиниці тощо) використовуємо справжній Selection API: ставимо курсор у точку кліку,
// а тоді Selection.modify() розширює виділення до меж слова так само, як це робить сам
// браузер при подвійному кліку. Це коректно працює й у PDF-шарі тексту, до якого
// pdfjsLib.TextLayer застосовує CSS-трансформації (scaleX/rotate) — бо Selection API
// завжди звіряється з реально відмальованою геометрією, а не з "плоскою" розкладкою.

els.micBtn.onclick = toggleDictation;
// Send while dictating: finish recognition first -- the last spoken words are still interim and would be dropped
// (audit A11) -- then send exactly what is in the field. Without dictation, or without AI, Send is unchanged.
function sendAskFromField() {
    const q = els.askInput.value.trim();
    if (askAttachment) { sendAskAttachment(q); return; }
    if (!q) return;
    if (!aiAvailable()) { showToast(t('needKey')); els.askInput.focus(); return; }
    stopDictation();
    els.askInput.value = "";
    // One-shot: a context set by an earlier explicit selection (ttAskBtn/btn-explain/btn-lang-level)
    // is used for THIS question only, then cleared -- an unrelated LATER question must never inherit
    // a stale passage (startAiTask itself no longer re-remembers it; see the note there).
    const context = state.lastAskContext;
    state.lastAskContext = '';
    startAiTask(context, 'ask', q);
}
els.askSendBtn.onclick = () => {
    if (dictationBusy() && aiAvailable() && !(askAttachment && askAttachment.sending)) { finishDictationThen(sendAskFromField); return; }
    sendAskFromField();
};
els.askInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') els.askSendBtn.click(); });

// ПАРСЕРИ ФОРМАТІВ
// Стеля розміру файла ДО будь-якого парсингу: жоден із форматів нижче (EPUB/ZIP,
// PDF, DOCX, TXT) сам по собі розмір не перевіряє, а всі вони зрештою читають
// файл цілком у пам'ять (file.arrayBuffer()/file.text()). Без цієї перевірки
// випадково чи навмисно підсунутий файл на кілька гігабайт міг би підвісити
// вкладку — особливо помітно на планшеті з обмеженою пам'яттю.
const MAX_BOOK_FILE_BYTES = 300 * 1024 * 1024;
// Єдина точка входу "відкрити книгу файлом" — скид усього стану читання й
// диспетчер форматів за розширенням, окремо від самого обробника <input
// type=file> нижче.
async function openBookFile(file) {
    if (!file) return;
    stopDictation(); stopOnboarding();
    if (file.size > MAX_BOOK_FILE_BYTES) { showReaderError(new Error(t('fileTooLarge'))); return; }
    const epoch = ++readerEpoch.book; ++readerEpoch.render;
    clearTimeout(wheelZoomTimer); clearTimeout(resizeTimer);
    clearLongPress(); clearTimeout(touchSelTimer);
    dragSel = null; state.dragRange = null; state.touchSelecting = false;
    isPanning = false; inkDrawing = false; inkCurrent = null; regionStart = null;
    cancelPdfInteraction(); closeCropPreview(); pdfTasks.text?.cancel(); pdfTasks.text = null; state.pdfZoom = 1;
    cancelAsyncTasks(); invalidateSelection();
    stopGlobalTTS(); stopTooltipSpeech();
    cancelPdfRender();
    pdfTasks.render?.cancel(); pdfTasks.render = null;
    if (pdfTasks.loading) { pdfTasks.loading.destroy().catch(() => {}); pdfTasks.loading = null; }
    else if (state.pdfDoc) state.pdfDoc.loadingTask.destroy().catch(() => {});
    // Continuous PDF viewer: stop the previous document's observers before
    // its wrapper elements are wiped below — an IntersectionObserver whose
    // targets are already removed from the DOM is harmless, but disconnecting
    // explicitly avoids a stray callback referencing the old page count.
    pdfContinuousReady = false;
    pdfPageObserver?.disconnect(); pdfPageObserver = null;
    pdfThumbObserver?.disconnect(); pdfThumbObserver = null;
    document.getElementById('pdf-thumb-list').replaceChildren();
    document.getElementById('pdf-outline-list').replaceChildren();
    setPdfSidebarMode('thumbnails');
    state.pdfDoc = null; state.pdfOutline = null; state.epubZip = null; state.spine = []; state.txtLines = [];
    if (typeof resetPdfPageLabels === 'function') resetPdfPageLabels();
    state.bookTextOffset = null; state.blockWeights = null;
    state.bookLangMeta = ''; state.sourceLang = null;
    state.totalPages = 0; state.pageInChapter = 0; state.totalPagesInChapter = 1;
    state.currentIndex = 0; state.lastAskContext = ''; state.lastGrammarSentence = ''; state.lastAskParagraph = ''; state.lastGrammarSourceText = null;
    state.inkMode = false; setPageArrows(false);
    document.body.classList.remove('ink-mode', 'region-mode', 'pdf-pannable', 'pdf-dragging');
    els.askPanel.classList.remove('loading', 'ready'); els.grammarPanel.classList.remove('loading', 'ready');
    showPanelEmpty(els.askContent, 'askHint', 'sparkle'); showPanelEmpty(els.grammarContent, 'grammarHint', 'grammar');
    setPanelSubtitle('ask-subtitle', ''); setPanelSubtitle('grammar-subtitle', '');
    document.getElementById('grammar-controls-bar').replaceChildren();
    if (typeof resetGrammarState === 'function') resetGrammarState(); // no stale analysis/cache across books (section 18)
    els.toc.replaceChildren();
    els.pages.innerHTML = `<div style="text-align:center;">${t('loading')}</div>`;
    document.body.classList.add('immersive-mode');   // the menu (a drawer over the page) gives way to the book on every screen
    state.bookKey = bookKeyFor(file);
    state.oldBookKey = oldBookKeyFor(file);
    if (typeof applySyncedBook === 'function') applySyncedBook(state.bookKey);   // місце/нотатки з іншого пристрою (js/sync.js)
    state.bookLangManual = normalizeBookLang(readStored(BOOK_LANG_STORE + state.bookKey));
    syncBookLangSelect();
    loadLearningStatsForBook();
    state.docChapters = null;
    loadInk();
    const ext = /\.fb2\.zip$/i.test(file.name) ? 'fb2.zip' : file.name.split('.').pop().toLowerCase();
    state.bookOpening = true;   // saveBookmark мовчить, доки місце читання не відновлено (js/navigation.js)
    try {
        if (ext === 'epub') { state.format = 'epub'; document.body.classList.remove('pdf-mode'); await initEpub(file, epoch); }
        else if (ext === 'pdf') { state.format = 'pdf'; document.body.classList.add('pdf-mode'); await initPdf(file, epoch); }
        else if (ext === 'txt') { state.format = 'txt'; document.body.classList.remove('pdf-mode'); await initTxt(file, epoch); }
        // Формати, що зводяться до готового HTML: Word, FictionBook, веб-сторінка, RTF.
        else if (['docx', 'fb2', 'fb2.zip', 'md', 'markdown', 'html', 'htm', 'rtf'].includes(ext)) {
            state.format = 'txt'; document.body.classList.remove('pdf-mode');
            await initRichDoc(file, ext, epoch);
        }
        else throw new Error(t('unsupportedFormat'));
        if (epoch === readerEpoch.book) { state.bookOpening = false; saveBookmark(); }
        if (epoch === readerEpoch.book) { setPageArrows(true); scheduleShelveBook(file); }   // «Мої книги» (js/book-shelf.js): книга не губиться після закриття
    } catch (err) {
        if (epoch !== readerEpoch.book) return;
        state.bookOpening = false;
        state.format = null; state.totalPages = 0; els.toc.replaceChildren();
        setPageArrows(false);
        showReaderError(err);
    }
}
// Стрілки ‹ › у нижніх кутах (index.html .page-arrow): є лише з відкритою книгою; видно — коли сховано смугу «◀ сторінка ▶».
function setPageArrows(on) { document.getElementById('page-arrows').hidden = !on; }
document.getElementById('page-arrow-prev').onclick = (e) => { e.stopPropagation(); goPrev(); };
document.getElementById('page-arrow-next').onclick = (e) => { e.stopPropagation(); goNext(); };
els.upload.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = ''; // Permit retrying the same file after an error.
    await openBookFile(file);
});

// Text formats: A-/A+ step the reader font within READER_FONT_MIN..READER_FONT_MAX (js/core.js) and are disabled at
// the limit. In PDF mode the same buttons zoom the page (setPdfScale has its own range), so they stay enabled there;
// the body's pdf-mode class switches with the format, so the observer below keeps the disabled state right.
const zoomInBtn = document.getElementById('zoom-in'), zoomOutBtn = document.getElementById('zoom-out');
function updateFontSizeControls() {
    const text = !document.body.classList.contains('pdf-mode');
    zoomInBtn.disabled = text && state.fontSize >= READER_FONT_MAX;
    zoomOutBtn.disabled = text && state.fontSize <= READER_FONT_MIN;
}
function setReaderFontSize(size) {
    const next = clampReaderFontSize(size);
    if (next !== state.fontSize) {
        state.fontSize = next;
        writeStored('reader_font_size', state.fontSize);
        els.pages.style.fontSize = `${state.fontSize}px`;
        repaginateBook();
    }
    updateFontSizeControls();
}
zoomInBtn.onclick = () => { if (state.format === 'pdf') setPdfScale(pdfBaseScale()*state.pdfZoom + 0.25); else setReaderFontSize(state.fontSize + READER_FONT_STEP); };
zoomOutBtn.onclick = () => { if (state.format === 'pdf') setPdfScale(pdfBaseScale()*state.pdfZoom - 0.25); else setReaderFontSize(state.fontSize - READER_FONT_STEP); };
new MutationObserver(updateFontSizeControls).observe(document.body, { attributes: true, attributeFilter: ['class'] });
updateFontSizeControls();
document.getElementById('theme-select').onchange = (e) => {
    document.body.setAttribute('data-theme', e.target.value);
    writeStored('reader_theme', e.target.value);
};


document.getElementById('prev-btn').onclick = goPrev; document.getElementById('next-btn').onclick = goNext;

updateDictationUI();

// Застосовуємо мову інтерфейсу на старті — уже після того, як усі функції визначені.
document.documentElement.lang = state.uiLang;
applyI18n();

// Обробники кнопок, що раніше стояли атрибутами onclick/onsubmit в index.html: CSP забороняє вбудовані скрипти
// ('unsafe-inline'), тож навіть помилка в очищенні HTML не дасть виконати чужий onclick. Функції шукаються в момент
// натискання (updateApp/exitApp визначає js/pwa-lifecycle.js, що завантажується пізніше).
document.getElementById('btn-ai-key').addEventListener('click', () => openKeySettings());
document.getElementById('btn-update-app').addEventListener('click', () => updateApp());
document.getElementById('btn-exit-app').addEventListener('click', () => exitApp());
document.querySelectorAll('[data-close-panel]').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.closePanel).classList.remove('expanded')));
document.getElementById('ask-chat-form').addEventListener('submit', e => { e.preventDefault(); els.askSendBtn.click(); });
document.getElementById('settings-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeKeySettings(); });
document.querySelectorAll('[data-close-settings]').forEach(btn => btn.addEventListener('click', () => closeKeySettings()));
document.getElementById('api-keys-form').addEventListener('submit', e => { e.preventDefault(); saveApiKey(); });
document.getElementById('btn-use-site-key').addEventListener('click', () => useSiteAiKey());
