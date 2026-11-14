/* grammar-run.js — the Practice button after an analysis, AI debug/error views, sentence recovery from the tap point,
 * runGrammarAnalysis (the startAiTask('grammar') entry point). Split out of grammar-svo.js on 2026-11-14 without changes. */
// Adds the "Practice" button after a successful analysis, grounding the reading-
// generation request in the lemmas actually detected for the CURRENT mode
// (task section 21: ground AI-generated examples in detected target lemmas).
const PRACTICE_TOPIC_STORAGE_KEY = 'reader_practice_topic';
// The Practice button: line icon + plain label (no emoji), like the rest of the panel; `withIcon` false = label only (the «generating» state).
// Updated IN PLACE: its click handler calls this, and the click still bubbles to the reader's tap handler (selection.js), which
// must still find the target inside the side panel -- a replaced child would be detached and the label read as a tapped word.
function setPracticeButtonLabel(btn, key, withIcon = true) {
    let svg = btn.querySelector('svg'), label = btn.querySelector('span');
    if (!svg || !label) { svg = iconSvg('practice'); label = document.createElement('span'); btn.replaceChildren(svg, label); }
    label.textContent = plainLabel(t(key));
    svg.style.display = withIcon ? '' : 'none';
}
// 🎤 for the topic field: one spoken phrase replaces the field (the learner's own topic, any language). Uses the dictation
// language the learner picked for Ask AI; a running Ask dictation is stopped first so two recognizers never compete.
function buildPracticeTopicMic(input) {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor || window.isSecureContext === false) return null;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'icon-btn grammar-practice-topic-mic'; setIconButton(btn, 'mic');
    btn.setAttribute('aria-label', t('dictationStart')); btn.title = t('dictationStart'); btn.setAttribute('aria-pressed', 'false');
    let rec = null;
    const setListening = on => {
        setIconButton(btn, on ? 'stop' : 'mic'); btn.classList.toggle('recording', on); btn.setAttribute('aria-pressed', String(on));
        btn.setAttribute('aria-label', t(on ? 'dictationStop' : 'dictationStart')); btn.title = t(on ? 'dictationStop' : 'dictationStart');
    };
    btn.onclick = () => {
        if (rec) { try { rec.stop(); } catch (e) {} return; }
        if (typeof dictationBusy === 'function' && dictationBusy()) stopDictation();
        try {
            rec = new Ctor();
            rec.lang = (els.micLang && els.micLang.value) || 'uk-UA';
            rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = 1;
            rec.onresult = e => {
                const heard = [...e.results].map(r => r[0] && r[0].transcript || '').join(' ').trim();
                if (heard) { input.value = sanitizePracticeTopic(heard); input.dispatchEvent(new Event('input', { bubbles: true })); }
            };
            rec.onerror = e => { if (e && e.error && e.error !== 'no-speech' && e.error !== 'aborted') showToast(t('error')); };
            rec.onend = () => { rec = null; setListening(false); };
            rec.start();
            setListening(true);
        } catch (e) { rec = null; setListening(false); showToast(t('error')); }
    };
    return btn;
}

function maybeShowPracticeButton() {
    if (typeof generatePracticeReading !== 'function') return;
    const sourceLang = grammarContext.sourceLanguage || DEFAULT_GRAMMAR_LANG;
    const content = els.grammarContent;
    const practiceBtn = document.createElement('button');
    practiceBtn.className = 'btn-secondary grammar-practice-btn';
    setPracticeButtonLabel(practiceBtn, 'practice');
    // The learner's topic for the generated sentences (optional, remembered between sessions).
    // One row with the button (never pushes it lower: on phones the bottom-docked word popup covers the panel's lower part).
    const topicWrap = document.createElement('div');
    topicWrap.className = 'grammar-practice-row';
    const topicInput = document.createElement('input');
    topicInput.type = 'text'; topicInput.id = 'grammar-practice-topic'; topicInput.maxLength = 80;
    topicInput.autocomplete = 'off'; topicInput.placeholder = t('practiceTopicPlaceholder');
    topicInput.className = 'grammar-practice-topic';
    topicInput.setAttribute('aria-label', t('practiceTopicLabel')); topicInput.title = t('practiceTopicLabel');
    try { topicInput.value = localStorage.getItem(PRACTICE_TOPIC_STORAGE_KEY) || ''; } catch (e) { /* storage blocked: start empty */ }
    topicWrap.appendChild(topicInput);
    const topicMic = buildPracticeTopicMic(topicInput);
    if (topicMic) topicWrap.appendChild(topicMic);
    topicInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); practiceBtn.click(); } });
    topicInput.addEventListener('input', () => { try { localStorage.setItem(PRACTICE_TOPIC_STORAGE_KEY, sanitizePracticeTopic(topicInput.value)); } catch (e) {} });
    practiceBtn.onclick = () => {
        if (!aiAvailable()) return showToast(t('needKey'));
        // A generation is already running (e.g. a fast double-click, or Practice was reopened while its
        // first request was still in flight): just bring the existing generating/ready panel back to the
        // front rather than firing a second identical provider request.
        const inFlight = getCurrentPracticeSession();
        if (inFlight && inFlight.status === 'generating') { displayPracticeSession(inFlight); return; }
        const mode = grammarContext.mode;
        const wantPos = mode === 'adjectives' ? 'adjective' : 'verb';
        const items = (grammarContext.analysis?.items || []).filter(it => it.pos === wantPos);
        // The focused word's lemma first, then the tapped/detected order: priority, never exclusivity --
        // every other detected lemma of this mode still rides along (sanitizePracticeLemmas is the one
        // place that bounds the total, up to PRACTICE_MAX_LEMMAS).
        const focused = grammarContext.focused && grammarContext.focused.pos === wantPos ? [grammarContext.focused] : [];
        const practiceContext = {
            sourceText: grammarContext.sentence || grammarContext.selectedText || '',
            sourceLanguage: sourceLang,
            targetLanguage: state.targetLang,
            bookId: state.bookKey,
            mode,
            lemmas: Array.from(new Set([...focused, ...items].map(it => it.lemma))),
            seenForms: [...focused, ...items].slice(0, 12).map(it => ({ surface: it.surface, lemma: it.lemma })),
            level: null,
            topic: topicInput.value
        };
        try { localStorage.setItem(PRACTICE_TOPIC_STORAGE_KEY, sanitizePracticeTopic(topicInput.value)); } catch (e) { /* not remembered */ }
        // Immediate, visible feedback on the button itself (not just the Practice panel elsewhere on
        // screen) so a click never looks dead, and re-entrancy stays impossible for the life of this
        // button even before the session's own 'generating' status has had a chance to be read back.
        practiceBtn.disabled = true;
        setPracticeButtonLabel(practiceBtn, 'generating', false);
        const restoreBtn = () => { practiceBtn.disabled = false; setPracticeButtonLabel(practiceBtn, 'practice'); };
        const generatePromise = generatePracticeReading(practiceContext);
        const generatingSession = getCurrentPracticeSession();
        if (generatingSession) displayPracticeSession(generatingSession);
        generatePromise.then(session => {
            const finalSession = session || getCurrentPracticeSession();
            if (finalSession) displayPracticeSession(finalSession);
        }).catch(err => {
            console.error('Practice generation failed:', err);
            const updated = getCurrentPracticeSession();
            if (updated) displayPracticeSession(updated);
        }).finally(restoreBtn);
    };
    topicWrap.appendChild(practiceBtn);
    content.appendChild(topicWrap);
}

// The language a tapped fragment is written in: read from ITS OWN position inside the sentence
// (a French word next to a longer English gloss must not inherit the gloss's language), falling
// back to the whole text. Returns the bare 2-letter code.
function grammarSourceLanguageFor(contextText, analysisText) {
    let detected = null;
    if (analysisText !== contextText && typeof fragmentLangInContext === 'function') detected = fragmentLangInContext(contextText, analysisText);
    if (!detected) detected = detectLang(analysisText);
    return String(detected || 'en').slice(0, 2).toLowerCase();
}

// Developer diagnostics (only with the switch on: localStorage.reader_ai_debug='1' or ?aiDebug=1): the last few AI attempts,
// WITHOUT prompts or keys — the exact reason a reply was rejected. Normal users see only the simple message.
function appendAiDebug(parent) {
    if (typeof aiDebugEnabled !== 'function' || !aiDebugEnabled()) return;
    const entries = readerAiDiagnostics().slice(-3);
    if (!entries.length) return;
    const details = document.createElement('details');
    details.className = 'ai-debug'; details.open = true;
    const summary = document.createElement('summary'); summary.textContent = 'AI diagnostics (developer)';
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(entries, null, 2);
    pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:11px;max-height:260px;overflow:auto;text-align:left;';
    const copy = document.createElement('button');
    copy.type = 'button'; copy.textContent = 'Copy';
    copy.onclick = () => { try { navigator.clipboard.writeText(pre.textContent); } catch (e) { /* clipboard unavailable */ } };
    details.append(summary, copy, pre);
    parent.appendChild(details);
}
function showGrammarError(message, retry, err) {
    const content = els.grammarContent;
    content.innerHTML = '';
    const wrap = aiErrorView(message, retry, err);
    appendAiDebug(wrap);
    content.appendChild(wrap);
}

// A tapped word normally arrives with its own sentence (translation.js captures it at tap time).
// selection.js can, however, leave state.lastWordNode pointing at the WHOLE block when it fails to
// wrap the word, and sentenceRangeAt() then returns the block's FIRST sentence — which does not
// contain the tapped word, so the word would be analysed bare, with no context at all. This
// re-derives the sentence from the real caret at the recorded tap point (bypassing lastWordNode).
// The caller still requires the result to contain the tapped text; PDF text layers have their own
// sentence model and are deliberately left alone.
function recoverSentenceFromTapPoint() {
    try {
        const point = state.lastTapPoint;
        if (!point || typeof caretRangeAt !== 'function' || typeof blockAncestorOf !== 'function' || typeof buildSentenceRanges !== 'function') return '';
        const caret = caretRangeAt(point.x, point.y);
        if (!caret) return '';
        const block = blockAncestorOf(caret.startContainer);
        if (!block || (block.classList && block.classList.contains('pdf-text-layer'))) return '';
        const blockRange = document.createRange();
        blockRange.selectNodeContents(block);
        for (const s of buildSentenceRanges(blockRange)) {
            if (s.range.isPointInRange(caret.startContainer, caret.startOffset)) return normalizeGrammarText(s.range.toString()).slice(0, 400);
        }
    } catch (e) { /* recovery is best-effort */ }
    return '';
}

// Entry point invoked from startAiTask('grammar'): detects the source language,
// reuses a cached normalized analysis when available (switching Verbs<->Adjectives
// or re-tapping the same passage never re-sends the source text — section 6/19/20),
// otherwise runs one structured AI call covering both parts of speech.
async function runGrammarAnalysis(contextText, sentenceText) {
    const context = normalizeGrammarText(contextText);
    // A tapped word/phrase is analyzed INSIDE its sentence so "why this form here" can
    // be answered contextually; a longer selection (which the tap sentence does not
    // contain) is analyzed as-is. Both sides are NFC/whitespace-normalised first, so a
    // decomposed accent or a line break in the page text cannot silently drop the sentence.
    let sentence = normalizeGrammarText(sentenceText);
    if (sentence && sentence !== context && !sentence.includes(context)) {
        // A sentence was supplied but does not contain the tapped text: context was lost upstream.
        const recovered = recoverSentenceFromTapPoint();
        if (recovered && recovered.includes(context)) sentence = recovered;
    }
    const analysisText = (sentence && sentence !== context && sentence.includes(context)) ? sentence : context;
    const sourceLang = grammarSourceLanguageFor(context, analysisText);
    const key = grammarAnalysisCacheKey(analysisText + '\u0000' + context, sourceLang, state.uiLang);
    // Retry re-sends the ALREADY RESOLVED sentence: a later tap (which rewrites
    // state.lastGrammarSentence / lastTapPoint) can never swap the context under a Retry button.
    const retry = () => runGrammarAnalysis(context, analysisText);

    // A new request supersedes EVERYTHING still in flight — including when it is answered from
    // the cache below, otherwise a slow earlier reply would land on top of it.
    cancelAsyncTasks(['grammar', 'grammarParadigm', 'grammarLookup']);
    setGrammarLookupStatus('');
    grammarContext.sourceLanguage = sourceLang;
    grammarContext.sentence = analysisText;
    grammarContext.selectedText = context;
    grammarContext.focused = null;
    // Drop the previous selection's results NOW: if this request fails or is cancelled
    // they must not resurface (or leak another language) on a later mode switch.
    grammarContext.analysis = null;
    grammarContext.activeTenseId = null;
    grammarContext.paradigmCache = new Map();
    if (!grammarContext.mode) grammarContext.mode = 'verbs';

    const panel = els.grammarPanel, content = els.grammarContent;
    renderGrammarModeBar(sourceLang);

    if (!hasGrammarConfig(sourceLang)) {
        panel.classList.remove('loading');
        showGrammarError(t('grammarUnsupportedLanguage'), null);
        return;
    }

    const cached = grammarAnalysisCache.get(key);
    if (cached) {
        grammarContext.analysis = cached;
        presentGrammarAnalysis(cached, sourceLang);
        panel.classList.remove('loading'); panel.classList.add('ready');
        return;
    }

    const task = beginAsyncTask('grammar');
    panel.classList.remove('expanded'); // Залишаємо панель згорнутою, як і раніше
    panel.classList.remove('ready'); panel.classList.add('loading');
    content.innerHTML = aiLoadingHtml(t('generating'), context);
    renderGrammarControlsBar(sourceLang);

    const langName = explainLangName();
    // The bounded text actually analysed (whole sentences, capped). A tapped word inside a sentence is unaffected.
    let attemptText = analysisText;
    let focus = context;
    let scope = boundGrammarText(analysisText, GRAMMAR_TEXT_CAP_CHARS, analysisText !== context ? context : '');   // a tapped word stays inside the analysed text
    if (scope.trimmed && analysisText === context) { attemptText = scope.text; focus = scope.text; }
    else if (scope.trimmed) attemptText = scope.text;
    const fail = (message, reason) => {
        panel.classList.remove('loading');
        showGrammarError(message, retry);
    };
    try {
        let analysis = null, truncated = false;
        for (let attempt = 0; attempt < 2; attempt++) {
            const profile = grammarProfile(attemptText, attempt > 0);
            const prompt = buildGrammarAnalysisPrompt(attemptText, sourceLang, langName, focus, profile);
            const meta = {};
            let out = '';
            truncated = false;
            try {
                out = await callAI(prompt, task.signal, 'grammar_analysis', undefined, { maxOutputTokens: profile.maxOutputTokens, timeoutMs: profile.timeoutMs, meta });
            } catch (err) {
                // A reply cut off by the token cap keeps what arrived: the complete leading items are recoverable.
                if (err && err.reason === 'truncated') { truncated = true; out = err.partial || ''; } else throw err;
            }
            if (!task.current()) { panel.classList.remove('loading'); return; }
            analysis = normalizeGrammarAnalysis(out, sourceLang, attemptText, focus);
            if (truncated) { analysis.partial = true; if (!analysis.ok) analysis.error = 'truncated'; }   // the provider's word beats an empty/garbled partial
            const category = analysis.ok ? (analysis.suspect ? 'no_valid_items' : analysis.partial ? 'partial' : (analysis.notes.length || analysis.adjusted.length ? 'ok_recovered' : 'ok'))
                : (GRAMMAR_REASON_CATEGORY[analysis.error] || analysis.error);
            recordAiDiagnostic(Object.assign({
                task: 'grammar_analysis', phase: 'validation', outcome: analysis.ok && !analysis.suspect ? (analysis.partial ? 'partial' : 'ok') : 'error', reason: category, attempt: attempt + 1,
                provider: meta.provider, model: meta.model, finish: meta.finish, usage: meta.usage, elapsedMs: meta.elapsedMs,
                sourceLanguage: sourceLang, selection: { chars: attemptText.length, words: profile.words, sentences: grammarSplitSentences(attemptText).length, lite: profile.lite, trimmed: scope.trimmed },
                budget: { maxOutputTokens: profile.maxOutputTokens, itemBudget: profile.itemBudget }, truncatedByProvider: truncated,
                parseNotes: analysis.notes, counts: summarizeGrammarResult(analysis)
            }, aiRawExcerpts(out), { capture: { sourceLanguage: sourceLang, text: attemptText, raw: out } }));
            // Cut off with nothing usable: ONE bounded retry on the first half of the text (lite contract).
            if (truncated && attempt === 0 && (!analysis.ok || !analysis.items.length)) {
                const half = halveGrammarText(attemptText, focus !== attemptText ? focus : '');   // the half that holds the tapped word
                if (half) {
                    attemptText = half.text; if (focus !== context) focus = half.text;
                    scope = { text: half.text, trimmed: true, sentencesKept: half.sentencesKept, sentencesTotal: scope.sentencesTotal > 1 ? Math.max(scope.sentencesTotal, half.sentencesTotal) : half.sentencesTotal };
                    continue;
                }
            }
            break;
        }
        if (!analysis.ok) {
            // Unusable reply (not JSON / wrong shape / wrong language / cut off with nothing usable): a retryable error, never
            // "no verbs found", and never cached. The learner sees one simple message; the reason is in the diagnostics.
            return fail(t(analysis.error === 'truncated' ? 'aiTruncated' : 'aiInvalidResponse'), analysis.error);
        }
        if (analysis.suspect) return fail(t('grammarNoUsableForms'), 'no_valid_items');
        // A selection may legitimately contain more distinct verbs/adjectives than the budget (grammarItemBudget)
        // allows through: the model was TOLD the limit and (when honest) simply stopped there, so this is not a
        // validation failure -- but the learner should still be told the list is not everything that was found,
        // not shown a silently-incomplete one. Deterministic per a given model reply (see ARCHITECTURE.md).
        const overBudgetCount = analysis.rejected.filter(r => r.reason === 'over_budget').length;
        const keptLemmaCount = new Set(analysis.items.map(i => i.pos + '|' + i.lemma.toLowerCase())).size;
        analysis.notice = {
            partial: !!analysis.partial, trimmed: scope.trimmed && scope.sentencesTotal > scope.sentencesKept ? { n: scope.sentencesKept, m: scope.sentencesTotal } : null,
            budgetLimited: overBudgetCount ? { n: keptLemmaCount, m: keptLemmaCount + overBudgetCount } : null
        };
        if (!analysis.partial) cacheGrammarAnalysis(key, analysis);      // a partial analysis is not cached: a retry deserves a fresh chance
        grammarContext.analysis = analysis;
        panel.classList.remove('loading'); panel.classList.add('ready');
        presentGrammarAnalysis(analysis, sourceLang);
    } catch (err) {
        if (!task.current()) { panel.classList.remove('loading'); return; }
        panel.classList.remove('loading');
        let msg = err.message;
        if (err instanceof TypeError && /fetch/i.test(err.message)) msg = t('errNoConnection');
        window.lastAiRetryContext = { contextText, mode: 'grammar', userPrompt: '' };
        showGrammarError(msg, retry, err);
    }
}
