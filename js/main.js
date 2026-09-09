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
    els.translateBtn.textContent = t('learnOn'); els.translateBtn.classList.add('active-mode');
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

els.voiceSelect.onchange = e => {
    const v = voices.find(v => v.voiceURI === e.target.value);
    if (!v) return;
    // Зберігаємо голос під ЙОГО власною мовою. Раніше все, що не французьке,
    // потрапляло у слот англійської — тому вибір українського голосу мовчки
    // затирав англійський, а сам вибір здавався таким, що ні на що не впливає.
    const code = v.lang.toLowerCase().slice(0, 2);
    state.selectedVoiceURIByLang[code] = v.voiceURI;
    state.voiceChosenByUser[code] = true;   // далі автовибір цю мову не перевизначає
    saveVoiceChoices();
    // Коротка проба — щоб одразу почути, який голос обрано.
    const samples = { fr: 'Bonjour, ceci est ma voix.', en: 'Hello, this is my voice.', uk: 'Вітаю, це мій голос.', ru: 'Здравствуйте, это мой голос.' };
    const u = new SpeechSynthesisUtterance(samples[code] || 'Test');
    u.voice = v; u.lang = v.lang; u.rate = 0.95;
    ttsSynth.cancel();
    // Затримка перед speak() — див. TTS_CANCEL_SPEAK_DELAY_MS у js/tts.js (той самий
    // "подвійний голос" на Android/Chrome, якщо speak() іде відразу за cancel()).
    setTimeout(() => ttsSynth.speak(u), TTS_CANCEL_SPEAK_DELAY_MS);
};

// РЕЖИМ ВИВЧЕННЯ ТА ZERO-MEMORY
els.translateBtn.onclick = () => {
    state.translateMode = !state.translateMode;
    if (state.translateMode) { els.translateBtn.textContent = t('learnOn'); els.translateBtn.classList.add('active-mode'); els.container.classList.add('mode-translate'); document.body.classList.add('mode-translate-on'); }
    else { els.translateBtn.textContent = t('learnOff'); els.translateBtn.classList.remove('active-mode'); els.container.classList.remove('mode-translate'); document.body.classList.remove('mode-translate-on'); }
    if(window.innerWidth <= 1180) document.body.classList.add('immersive-mode');
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
els.askSendBtn.onclick = () => { const q = els.askInput.value.trim(); if(q) { stopDictation(); els.askInput.value = ""; startAiTask(state.lastAskContext || q, 'ask', q); } };
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
    pdfTasks.render?.cancel(); pdfTasks.render = null;
    if (pdfTasks.loading) { pdfTasks.loading.destroy().catch(() => {}); pdfTasks.loading = null; }
    else if (state.pdfDoc) state.pdfDoc.loadingTask.destroy().catch(() => {});
    state.pdfDoc = null; state.epubZip = null; state.spine = []; state.txtLines = [];
    state.totalPages = 0; state.pageInChapter = 0; state.totalPagesInChapter = 1;
    state.currentIndex = 0; state.lastAskContext = ''; state.lastGrammarSentence = ''; state.lastAskParagraph = '';
    state.activeVerb = null; state.verbs = []; state.inkMode = false;
    document.body.classList.remove('ink-mode', 'region-mode', 'pdf-pannable', 'pdf-dragging');
    els.askPanel.classList.remove('loading', 'ready'); els.grammarPanel.classList.remove('loading', 'ready');
    els.askContent.textContent = t('askHint'); els.grammarContent.textContent = t('grammarHint');
    document.getElementById('verb-bar').replaceChildren(); els.toc.replaceChildren();
    els.pages.innerHTML = `<div style="text-align:center;">${t('loading')}</div>`;
    if(window.innerWidth <= 1180) document.body.classList.add('immersive-mode');
    state.bookKey = bookKeyFor(file);
    state.docChapters = null;
    loadInk();
    const ext = file.name.split('.').pop().toLowerCase();
    try {
        if (ext === 'epub') { state.format = 'epub'; document.body.classList.remove('pdf-mode'); await initEpub(file, epoch); }
        else if (ext === 'pdf') { state.format = 'pdf'; document.body.classList.add('pdf-mode'); await initPdf(file, epoch); }
        else if (ext === 'txt' || ext === 'md') { state.format = 'txt'; document.body.classList.remove('pdf-mode'); await initTxt(file, epoch); }
        // Формати, що зводяться до готового HTML: Word, FictionBook, веб-сторінка, RTF.
        else if (['docx', 'fb2', 'html', 'htm', 'rtf'].includes(ext)) {
            state.format = 'txt'; document.body.classList.remove('pdf-mode');
            await initRichDoc(file, ext, epoch);
        }
        else throw new Error(t('unsupportedFormat'));
    } catch (err) {
        if (epoch !== readerEpoch.book) return;
        state.format = null; state.totalPages = 0; els.toc.replaceChildren();
        showReaderError(err);
    }
}
els.upload.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = ''; // Permit retrying the same file after an error.
    await openBookFile(file);
});

document.getElementById('zoom-in').onclick = () => { if (state.format === 'pdf') { setPdfScale(pdfBaseScale()*state.pdfZoom + 0.25); } else { state.fontSize += 2; writeStored('reader_font_size', state.fontSize); els.pages.style.fontSize = `${state.fontSize}px`; paginateContainer(); goToPageInChapter(state.pageInChapter, false); } };
document.getElementById('zoom-out').onclick = () => { if (state.format === 'pdf') { setPdfScale(pdfBaseScale()*state.pdfZoom - 0.25); } else { state.fontSize = Math.max(12, state.fontSize - 2); writeStored('reader_font_size', state.fontSize); els.pages.style.fontSize = `${state.fontSize}px`; paginateContainer(); goToPageInChapter(state.pageInChapter, false); } };
document.getElementById('theme-select').onchange = (e) => {
    document.body.setAttribute('data-theme', e.target.value);
    writeStored('reader_theme', e.target.value);
};


document.getElementById('prev-btn').onclick = goPrev; document.getElementById('next-btn').onclick = goNext;

updateDictationUI();

// Застосовуємо мову інтерфейсу на старті — уже після того, як усі функції визначені.
document.documentElement.lang = state.uiLang;
applyI18n();

