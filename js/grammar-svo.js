/* grammar-svo.js — панелі "Граматика"/"Запитай AI": вкладки, startAiTask (запит до
 * AI й вивід у панель; forward-called з index.html та js/translation.js, тому
 * перенесено сюди разом із самою функцією), побудова промптів для "Запитай AI"
 * (buildAskPrompt/buildLanguageLevelPrompt), і розбір речення на члени
 * (flattenRange/rangeForSlice: flat text of a DOM range, shared by the sentence breakdown and the rules search)
 * через CSS Custom Highlight API.
 *
 * Redesigned contextual Grammar panel (Verbs/Adjectives modes): grammarContext,
 * buildGrammarAnalysisPrompt/normalizeGrammarAnalysis (structured JSON, not raw
 * HTML), renderGrammarPanel/renderGrammarFocusDetail (card rendering), focusGrammarItem
 * (shared with js/practice-worksheet.js — a clicked highlighted word in Practice's
 * contextual reading calls this same function), fetchVerbParadigm (per-lemma
 * conjugation/agreement lookup), and runGrammarAnalysis (the startAiTask('grammar')
 * entry point). Language-specific dimensions/tenses/labels live in
 * GRAMMAR_LANG_CONFIG (js/core-languages.js), not hardcoded here.
 * 2026-11-14: split without changes into grammar-svo.js (Ask AI tasks, startAiTask, flattenRange), grammar-analysis.js,
 * grammar-prompts.js, grammar-panel.js, grammar-lookup.js and grammar-run.js, loaded one after another in that order.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/translation.js (яка forward-викликає startAiTask лише зсередини onclick-
 * колбеків — та сама безпечна схема, що вже описана в js/pdf-render.js для
 * pdfAnchor). callAI/aiAvailable (js/ai-client.js, завантажується ПІЗНІШЕ за цей
 * файл) викликаються лише всередині async-функцій, тобто відкладено — файл
 * завантажується раніше, ніж використовується.
 */

// Canonical grammar context: tracks source language, active Verbs/Adjectives mode,
// the current normalized analysis and the currently-focused occurrence. A single
// module-level object (not per-field state.* fields) so it can be reset atomically
// whenever a new book/selection invalidates everything at once (resetGrammarState()).
let grammarContext = {
    sourceLanguage: null,   // 'en', 'fr', etc. — detected from the analyzed sentence
    sentence: null,         // full sentence/selection context last analyzed
    selectedText: null,     // raw selected/tapped text
    mode: 'verbs',          // 'verbs' | 'adjectives' — active Grammar panel mode
    analysis: null,         // normalized {language, items:[...]} for the CURRENT context
    focused: null,          // the currently focused verb/adjective occurrence, or null
    activeTenseId: null,    // last-picked tense/mood id in Verbs mode
    paradigmCache: new Map() // `${lemma}|${tenseId}` -> {persons: {...}} for the focused verb
};

// Cross-selection cache: reusing a normalized analysis when the learner only
// switches Verbs <-> Adjectives, or re-taps the same passage, avoids resending the
// source text to AI (task section 6/19/20). Bounded FIFO so repeated browsing of a
// long book cannot grow this without limit.
const grammarAnalysisCache = new Map();
const GRAMMAR_ANALYSIS_CACHE_MAX = 20;
function grammarAnalysisCacheKey(text, sourceLang, targetLang) {
    return (state.bookKey || '') + '|' + sourceLang + '|' + targetLang + '|' + text;
}
function cacheGrammarAnalysis(key, value) {
    grammarAnalysisCache.set(key, value);
    if (grammarAnalysisCache.size > GRAMMAR_ANALYSIS_CACHE_MAX) {
        grammarAnalysisCache.delete(grammarAnalysisCache.keys().next().value);
    }
}

// Called when a new book opens (js/main.js) so a stale analysis/cache from the
// previous book can never leak into the next one (task section 18).
function resetGrammarState() {
    grammarContext = {
        sourceLanguage: null, sentence: null, selectedText: null, mode: 'verbs',
        analysis: null, focused: null, activeTenseId: null, paradigmCache: new Map()
    };
    grammarAnalysisCache.clear();
    if (typeof renderGrammarModeBar === 'function') renderGrammarModeBar(DEFAULT_GRAMMAR_LANG);
}

function getGrammarSourceLanguage() {
    return grammarContext.sourceLanguage;
}

// AI ПАНЕЛІ (ЯЗИЧКИ)
els.grammarTab.onclick = () => { els.grammarPanel.classList.toggle('expanded'); els.askPanel.classList.remove('expanded'); els.grammarPanel.classList.remove('loading', 'ready'); if (typeof renderGrammarLookupLabels === 'function') renderGrammarLookupLabels(); if (els.grammarPanel.classList.contains('expanded') && grammarContext.focused) ensureAdjectiveForms(grammarContext.focused, grammarContext.sourceLanguage || DEFAULT_GRAMMAR_LANG); };
els.askTab.onclick = () => { els.askPanel.classList.toggle('expanded'); els.grammarPanel.classList.remove('expanded'); els.askPanel.classList.remove('loading', 'ready'); };

// INCREMENTAL STREAMING CALLBACK FOR ASK AI AND LANGUAGE LEVEL
// Accumulates streamed deltas and safely updates DOM incrementally
// ========== ЗАПИТ "ЗАПИТАЙ AI" СКАСОВАНО (A3) ==========
// A request that ends cancelled -- aborted when the app goes to the background, superseded by a newer request,
// its book or page changed under it -- used to return silently and leave the panel "generating" forever.
// Ownership decides who may touch the panel: every Ask request (startAiTask, the crop's checkExerciseImage) holds
// the single 'ask' task slot and marks its own view with its request id. A cancelled request may leave the loading
// state only while no NEWER Ask request holds the slot, and may show "cancelled" + Retry only while the panel still
// shows its own view -- so a newer loading state, answer, error, crop request or the book-change hint is never
// overwritten.
Object.assign(I18N, {
    sendLabel: { uk: 'Надіслати', en: 'Send', fr: 'Envoyer', ru: 'Отправить', zh: '发送', ko: '보내기', hi: 'भेजें', ga: 'Seol' },
    aiRequestCancelled: { uk: 'Запит скасовано.', en: 'Request cancelled.', fr: 'Demande annulée.', ru: 'Запрос отменён.', zh: '请求已取消。', ko: '요청이 취소되었습니다.', hi: 'अनुरोध रद्द किया गया।', ga: 'Cealaíodh an t-iarratas.' },
});
let askRequestSeq = 0;
function isAskAbort(err, task) { return !task.current() || (err && err.name === 'AbortError'); }
function askRequestView(requestId, html) {
    const view = document.createElement('div');
    view.dataset.askRequest = String(requestId);
    view.innerHTML = html;
    return view;
}
// Returns false when a newer Ask request owns the panel (nothing was touched).
function settleCancelledAskRequest(task, requestId, retry) {
    const owner = asyncTasks.get('ask');
    if (owner && owner !== task) return false;
    els.askPanel.classList.remove('loading');
    const view = els.askContent.querySelector(`[data-ask-request="${requestId}"]`);
    if (view) {
        const note = document.createElement('p');
        note.className = 'tt-note ask-cancelled';
        note.textContent = t('aiRequestCancelled');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ask-retry-btn btn-primary';
        button.textContent = t('retry');
        button.onclick = retry;
        els.askContent.replaceChildren(askRequestView(requestId, ''));
        els.askContent.firstChild.append(note, button);
    }
    return true;
}

function createStreamingUpdater(content, task, panel, mode, requestId) {
    let lastRenderTime = 0;
    const RENDER_THROTTLE_MS = 100; // Update UI max every 100ms to avoid jank

    return function onDelta(delta, accumulated) {
        // Guard: verify task is still current (not stale, not aborted)
        if (!task.current()) return;

        const now = performance.now();

        // Throttle rendering for performance: only update DOM every 100ms
        if (now - lastRenderTime < RENDER_THROTTLE_MS) return;
        lastRenderTime = now;

        try {
            // Incrementally render accumulated text with safeHtml
            // This is safe: each update passes through the allowlist sanitizer
            content.replaceChildren(askRequestView(requestId, safeHtml(accumulated, true)));   // keeps this request's ownership mark
        } catch (_) {
            // Malformed intermediate HTML: skip this render, next delta will retry
        }
    };
}

async function startAiTask(contextText, mode, userPrompt = "") {
    // Without a cloud key the on-device model (js/device-llm.js) still answers, if it is installed.
    const deviceFirst = typeof deviceLlmReady === 'function' && deviceLlmReady() && (navigator.onLine === false || !aiAvailable());
    if (!aiCanAnswer()) return showToast(t('needKey'));
    // Ручне виділення (на відміну від тапу по слову чи кнопки "розгорнути до
    // абзацу") нічим не обмежене на вході — без цього протягнутих кілька сторінок
    // пішло б у промпт цілком.
    contextText = (contextText || '').slice(0, AI_PROMPT_TEXT_MAX);
    // Grammar mode is handled entirely by the redesigned Verbs/Adjectives engine
    // below (runGrammarAnalysis) — structured JSON + cache + cross-panel focus,
    // not the free-text HTML dump the rest of this function still uses for Ask/
    // Language-level, which are unchanged and out of scope for this redesign.
    if (mode === 'grammar') return runGrammarAnalysis(contextText, state.lastGrammarSentence || contextText);

    const task = beginAsyncTask('ask');
    const requestId = ++askRequestSeq;
    const retry = () => startAiTask(contextText, mode, userPrompt);
    cancelAsyncTasks(['panelTranslate']);
    const panel = els.askPanel;
    const content = els.askContent;

    panel.classList.remove('expanded'); // Залишаємо панель згорнутою!
    // state.lastAskContext is set by the SELECTION-driven callers themselves (ttAskBtn,
    // btn-explain, btn-lang-level), never unconditionally here: this function also runs for a
    // typed/dictated question with no selection, and remembering THAT as "context" is exactly
    // the stale-context leak a later unrelated question must not inherit (sendAskFromField
    // consumes state.lastAskContext once and clears it).

    panel.classList.remove('ready'); panel.classList.add('loading'); // Вмикаємо червоний неон
    setPanelSubtitle('ask-subtitle', contextText || userPrompt);
    content.replaceChildren(askRequestView(requestId, aiLoadingHtml(t('generating'), contextText || userPrompt)));

    const langName = explainLangName();
    const prompt = mode === 'level'
        ? buildLanguageLevelPrompt(contextText, state.lastGrammarSentence, langName)
        : buildAskPrompt(contextText, state.lastGrammarSentence, userPrompt, langName);
    const taskType = mode === 'level' ? 'language_level' : 'ask';

    // Ask and Language level show their answer as it is written: OpenAI, Groq (since 2026-10-31) and the on-device model stream;
    // a provider that does not stream simply never calls back. A Groq answer cut mid-stream that falls back to OpenAI restarts
    // the text from the beginning, since every update renders the accumulated reply, not a delta.
    const isStreaming = mode === 'ask' || mode === 'level';
    const onDelta = isStreaming ? createStreamingUpdater(content, task, panel, mode, requestId) : undefined;

    try {
        const meta = {};
        const text = await callAI(prompt, task.signal, taskType, onDelta, { meta });
        if (!task.current()) { settleCancelledAskRequest(task, requestId, retry); return; }   // see A3 above
        panel.classList.remove('loading'); panel.classList.add('ready'); // Вмикаємо зелений неон!
        // Final render with safeHtml (even if streaming already updated incrementally,
        // this ensures the final state is properly sanitized)
        content.innerHTML = safeHtml(text, true);
        // The on-device model is weaker than the cloud AI: the reader sees who answered.
        if (meta.provider === 'device') content.append(Object.assign(document.createElement('p'), { className: 'tt-note device-llm-mark', textContent: t('dlMark') + ' · ' + DEVICE_LLM_CATALOG.model.name }));
    } catch (err) {
        // Cancelled (incl. the page/book changing under the request): not a server error -- see A3 above.
        if (isAskAbort(err, task)) { settleCancelledAskRequest(task, requestId, retry); return; }
        // Реальна помилка на активному запиті
        panel.classList.remove('loading');
        let msg = err.message;
        // "Failed to fetch" — збій на рівні браузера: запит навіть не пішов до сервера.
        if (err instanceof TypeError && /fetch/i.test(err.message)) msg = t('errNoConnection');
        // Зберігаємо контекст для повтору у глобальній змінній
        window.lastAiRetryContext = { contextText, mode, userPrompt };
        // Кнопка повтору — справжній обробник, а не рядок onclick (CSP забороняє вбудовані скрипти).
        content.replaceChildren(aiErrorView(msg, () => { const ctx = window.lastAiRetryContext; startAiTask(ctx.contextText, ctx.mode, ctx.userPrompt); }, err));
    }
}


// ========== ПЛОСКИЙ ТЕКСТ ДІАПАЗОНУ (для розбору речення й пошуку правил) ==========
// Підсвічуємо частини прямо в тексті через CSS Custom Highlight API: він малює
// поверх наявного тексту й не змінює DOM, що тут критично — у реченні вже є сірі
// span'и відкритих слів, і будь-яке перезагортання їх поламало б.
// Межі частин визначає модель, бо французький синтаксис (складені часи, зворотні
// дієслова, займенники перед дієсловом) надійно не розбирається простими правилами.

// Плоский текст діапазону + карта відповідності позицій текстовим вузлам.
function flattenRange(range) {
    if (range._pdfPieces && range._pdfPieces.length) {
        let text = '', segs = [], prevSpan = null;
        for (const p of range._pdfPieces) {
            let candidates = [p];
            if ((!p.node || !p.node.isConnected || !p.node.nodeValue) && p.span && p.span.isConnected && typeof pdfResolveSpanPieces === 'function' && typeof p.spanStart === 'number') {
                candidates = pdfResolveSpanPieces(p.span, p.spanStart, p.spanEnd);
            }
            for (const c of candidates) {
                const node = c.node, from = c.start, to = c.end;
                if (!node || !node.isConnected || !node.nodeValue || to <= from) continue;
                const slice = node.nodeValue.slice(from, to);
                const span = c.span || (node.parentElement && (node.parentElement.closest('.pdf-text-layer > span, .markedContent > span') || node.parentElement.closest('span'))) || null;
                if (text && !/\s$/.test(text) && !/^\s/.test(slice) && span !== prevSpan
                    && !(typeof pdfSpansContinueWord === 'function' && pdfSpansContinueWord(prevSpan, span))) text += ' ';
                prevSpan = span || prevSpan;
                segs.push({ node, nodeStart: from, textStart: text.length, len: to - from });
                text += slice;
            }
        }
        if (segs.length) return { text, segs };
    }
    const root = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(n) { return n.nodeValue && range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    // Текстовий шар PDF не має пробілів між елементами (кінець рядка, сусідня клітинка): без роздільника слова з різних
    // рядків склеювались («headles cheveux»), і AI-пошук Правил та граматика отримували текст, у якому знайдені фрагменти
    // з пробілами вже не збігались. Пробіл ставиться за тим самим правилом, що й у pdfRangeText (pdfSpansContinueWord).
    const pdfLayer = root.closest && root.closest('.pdf-text-layer') || (root.querySelector && root.querySelector('.pdf-text-layer'));
    let text = '', segs = [], n, prevSpan = null;
    while (n = walker.nextNode()) {
        const from = (n === range.startContainer) ? range.startOffset : 0;
        const to = (n === range.endContainer) ? range.endOffset : n.nodeValue.length;
        if (to <= from) continue;
        if (pdfLayer) {
            const span = n.parentElement && (n.parentElement.closest('.pdf-text-layer > span, .markedContent > span') || n.parentElement.closest('span')) || null;
            if (text && !/\s$/.test(text) && !/^\s/.test(n.nodeValue.slice(from, to)) && span !== prevSpan
                && !(typeof pdfSpansContinueWord === 'function' && pdfSpansContinueWord(prevSpan, span))) text += ' ';
            prevSpan = span || prevSpan;
        }
        segs.push({ node: n, nodeStart: from, textStart: text.length, len: to - from });
        text += n.nodeValue.slice(from, to);
    }
    return { text, segs };
}
// Range для підрядка плоского тексту (може перетинати кілька вузлів).
function rangeForSlice(flat, start, end) {
    let sN = null, sO = 0, eN = null, eO = 0;
    for (const s of flat.segs) {
        const segEnd = s.textStart + s.len;
        if (sN === null && start >= s.textStart && start < segEnd) { sN = s.node; sO = s.nodeStart + (start - s.textStart); }
        if (end > s.textStart && end <= segEnd) { eN = s.node; eO = s.nodeStart + (end - s.textStart); }
    }
    if (!sN || !eN) return null;
    const r = document.createRange();
    r.setStart(sN, sO); r.setEnd(eN, eO);
    return r;
}
