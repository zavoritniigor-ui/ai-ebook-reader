/* core-state.js — the shared `state` object, `els` (cached elements) and the contents sidebar toggling.
 * Split out of core.js on 2026-11-14 without changes. */
const state = {
    format: null, currentIndex: 0, totalPages: 0,
    // Масштаб PDF, розмір шрифту й режим "Вивчення" переживають перезапуск застосунку —
    // раніше кожен холодний старт (у т.ч. після повернення з фону, коли Android
    // вивантажив сторінку) скидав їх до типових значень.
    pdfScale: readStoredNumber('reader_pdf_scale', 1, 0.25, 4),
    pdfFit: ['width', 'page', 'free'].includes(readStored('reader_pdf_fit')) ? readStored('reader_pdf_fit') : 'width',
    fontSize: clampReaderFontSize(parseFloat(readStored('reader_font_size'))),
    epubZip: null, spine: [], txtLines: [],
    translateMode: readStored('reader_translate_mode') === '1', extractedTextForTTS: "", currentLangCode: 'en-US',
    // The voice list was removed from the menu (owner, 2026-10-18: «it does not work»): loadVoices picks the best voice of each
    // language on every start. Voices saved by the old list (some chosen by hand) would stay with no way to change them: forgotten.
    selectedVoiceURIByLang: (() => {
        try { localStorage.removeItem('reader_voices'); localStorage.removeItem('reader_voices_manual'); } catch (e) { /* storage unavailable */ }
        return Object.fromEntries(TARGET_LANGUAGE_CODES.map(code => [code, null]));
    })(),
    voiceChosenByUser: {},
    apiKey: readStored('reader_gemini_key') || '', groqKey: readStored('reader_groq_key') || '',
    openaiKey: readStored('reader_openai_key') || '',
    // Task routing: with 'auto' EVERY task goes to Groq first (own key or the site's), OpenAI / the active provider only as the backup (js/ai-client.js).
    aiRouting: readStored('reader_ai_routing') === 'off' ? 'off' : 'auto',
    activeAiProvider: (() => {
        const saved = readStored('reader_active_ai_provider');
        if (['openai', 'groq', 'gemini'].includes(saved)) return saved;
        // One-time migration preserves the old text-provider preference. Never
        // reselect based on keys once an explicit provider has been stored.
        const provider = readStored('reader_groq_key') ? 'groq' : 'gemini';
        writeStored('reader_active_ai_provider', provider);
        return provider;
    })(),
    translationCache: {}, lastAskContext: "",
    pageInChapter: 0, totalPagesInChapter: 1, bookKey: null, bookFileName: '', suppressNextClick: false,
    ttsQueue: [], ttsIndex: 0, ttsPaused: false, ttsGen: 0, pdfZoom: 1, lastTapPoint: null, expandLevel: 0, lastWordNode: null,
    targetLang: storedLanguage('reader_target_lang', systemTargetLanguage(), TARGET_LANGUAGE_CODES),
    uiLang: storedLanguage('reader_ui_lang', systemUiLanguage()),
    speakSide: readStored('reader_speak_side') || 'original',
    lastGrammarSentence: '', lastAskParagraph: '', docChapters: null,
    // One-shot: set only by a PDF drag that spans a bilingual page's two columns, consumed (and
    // cleared) by the very next handleWordOrSelection so it can never leak into a later tap — see
    // js/selection.js's pointerup handler and js/translation.js's ttAiBtn.onclick.
    lastGrammarSourceText: null,
    selectionContext: '',   // the sentence around a dragged part of it (js/selection.js), read once by the translation
    refinedKeys: new Set(),
    sourceLang: 'en-US', ctxSentence: '', demoMode: false,
    ink: {}, inkMode: false, inkErase: false, inkEraseWhole: false, inkMarker: false, inkColor: '#1a56db', inkMarkerColor: '#f2c200',
    // Continuous PDF viewer (js/pdf-continuous.js et al.): pdfDoc set by initPdf,
    // pdfPageMeta[n] caches {width,height} natural size once page n is measured,
    // pdfOutline/pdfPageLabels cached from getOutline()/getPageLabels().
    pdfDoc: null, pdfPageMeta: [], pdfOutline: null, pdfPageLabels: null,
    pdfPrintedPageLabels: null, pdfLabelToPhysical: null, pdfLabelsFullyScanned: false,
    measuredStep: 0, animTimer: null, dragRange: null, lookupToken: 0, selSpans: [], touchSelecting: false, speakingSide: null, speakingId: 0, speakPos: 0, speakBase: 0, speakResume: null,
    altVoices: readStored('reader_alt_voices') === '1'
};

const els = {
    upload: document.getElementById('file-upload'), container: document.getElementById('reader-container'), pages: document.getElementById('reader-pages'),
    toc: document.getElementById('toc-list'), progress: document.getElementById('progress-indicator'),
    tooltip: document.getElementById('word-tooltip'), ttOriginal: document.getElementById('tt-original'),
    ttReplayBtn: document.getElementById('tt-replay-btn'), ttExpandBtn: document.getElementById('tt-expand-btn'), ttTranslation: document.getElementById('tt-translation'),
    ttSpeakTranslation: document.getElementById('tt-speak-translation'),
    ttAiBtn: document.getElementById('tt-ai-btn'), ttAskBtn: document.getElementById('tt-ask-btn'),
    ttStructBtn: document.getElementById('tt-struct-btn'), ttStructHost: document.getElementById('tt-struct-host'),
    ttCloseBtn: document.getElementById('tt-close-btn'),
    mainArea: document.getElementById('main-area'), translateBtn: document.getElementById('btn-translate-mode'),
    sidebar: document.getElementById('sidebar'),
    ttsBtn: document.getElementById('btn-tts'), ttsStopBtn: document.getElementById('btn-tts-stop'), grammarPanel: document.getElementById('grammar-panel'),
    targetLang: document.getElementById('target-lang'), uiLang: document.getElementById('ui-lang'),
    askPanel: document.getElementById('ask-panel'), grammarTab: document.getElementById('grammar-tab'),
    askTab: document.getElementById('ask-tab'), grammarContent: document.getElementById('grammar-content'),
    askContent: document.getElementById('ask-content'), askInput: document.getElementById('ask-input'),
    askSendBtn: document.getElementById('ask-send-btn'), micBtn: document.getElementById('mic-btn'), micLang: document.getElementById('mic-lang'),
    footerHandle: document.getElementById('footer-handle'), menuHandle: document.getElementById('menu-handle'),
    ttsToggle: document.getElementById('tts-toggle'), ttsPrev: document.getElementById('tts-prev'), ttsNext: document.getElementById('tts-next'),
    altVoicesBtn: document.getElementById('btn-alt-voices')
};
els.pages.style.fontSize = `${state.fontSize}px`;
applyTextLayout();   // шрифт, інтервал, поля, вирівнювання й переноси книжкового тексту — до першої книги

const toggleTocDesktopBtn = document.getElementById('toggle-toc-desktop');
const openToc = () => { els.sidebar.classList.toggle('collapsed'); };

if(toggleTocDesktopBtn) toggleTocDesktopBtn.onclick = openToc;
// The Contents / thumbnails panel hides by itself as soon as the reader works with the book again (owner, 2026-10-26: «вибрав
// сторінку… при першому тапі на слово, при збільшенні чи прокрутці зміст має швиденько ховатися»): a tap (finger, stylus,
// mouse) on the book, a scroll of it (wheel, keys) closes it at once. A zoom (two-finger pinch, Ctrl + wheel) does not: the
// book would widen under the fingers in the middle of the zoom and the page would jump; the first tap or scroll after it
// closes the panel. A finger's touch waits 180 ms to tell a tap from the first finger of a pinch. Only the reader's own input
// counts (the panel's jump to the chosen page does not close it), and nothing done inside the panel does.
let tocHideTimer = 0;
function tocOnBook(e) { return !!(e.target && e.target.closest && e.target.closest('#reader-container') && !e.target.closest('#sidebar')); }
function hideToc() { clearTimeout(tocHideTimer); if (!els.sidebar.classList.contains('collapsed')) els.sidebar.classList.add('collapsed'); }
function hideTocOnReading(e) {
    if (els.sidebar.classList.contains('collapsed')) return;
    if (e.type === 'keydown') {
        if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) return;
        if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable], #sidebar')) return;
        return hideToc();
    }
    if (!tocOnBook(e)) return;
    if (e.type === 'touchstart') {
        clearTimeout(tocHideTimer);
        if (e.touches.length > 1) return;   // a pinch: keep the layout still while it zooms
        tocHideTimer = setTimeout(hideToc, 180);
        return;
    }
    if (e.type === 'touchmove') { if (e.touches.length === 1) hideToc(); return; }   // a one-finger scroll
    if (e.type === 'pointerdown') { if (e.pointerType !== 'touch') hideToc(); return; }   // mouse, stylus; a finger goes by touchstart
    if (e.type === 'wheel') { if (!e.ctrlKey) hideToc(); }   // Ctrl + wheel is a zoom
}
for (const type of ['pointerdown', 'touchstart', 'touchmove', 'wheel']) document.addEventListener(type, hideTocOnReading, { capture: true, passive: true });
document.addEventListener('keydown', hideTocOnReading, true);
