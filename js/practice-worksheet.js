/* practice-worksheet.js — Practice reading rendering and Practice workspace UI.
 * Renders the generated reading — per-word example sentences and connected paragraphs — safely
 * (createElement/textContent throughout, never innerHTML of AI text) with every target form
 * highlighted and clickable (see focusGrammarItem in js/grammar-svo.js). There is NOTHING to answer
 * here: no inputs, no hints, no check/submit, no grading — and no renderer for the retired exercise
 * worksheet exists any more. The three-mode workspace positioning (expanded/collapsed-bottom/
 * bookmark) below is unrelated to the content model.
 */

// UI state deliberately lives outside the persisted PracticeSession.
let practiceWorkspaceMode = 'expanded';
let practiceWorkspaceFrame = 0;

function schedulePracticeWorkspaceLayout() {
    if (practiceWorkspaceFrame) return;
    practiceWorkspaceFrame = requestAnimationFrame(() => {
        practiceWorkspaceFrame = 0;
        layoutPracticeWorkspace();
    });
}

function layoutPracticeWorkspace(dockDrawers = false) {
    const panel = document.getElementById('practice-panel');
    if (!panel || panel.hidden) return;
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0;
    const top = viewport?.offsetTop || 0;
    const width = viewport?.width || innerWidth;
    const height = viewport?.height || innerHeight;
    const main = document.getElementById('main-area').getBoundingClientRect();
    const grammar = document.getElementById('grammar-panel');
    const ask = document.getElementById('ask-panel');
    const nav = document.querySelector('nav');
    const grammarWidth = grammar.classList.contains('expanded') ? grammar.offsetWidth : 0;
    const askWidth = ask.classList.contains('expanded') ? ask.offsetWidth : 0;
    const navWidth = nav && !nav.classList.contains('collapsed') ? nav.offsetWidth : 0;
    let start = Math.max(left, askWidth, navWidth);
    let end = Math.min(left + width, innerWidth - grammarWidth);
    // When drawers leave no usable worksheet, retain their contents in the existing tabs.
    if (end - start < Math.min(width, 288)) {
        if (practiceWorkspaceMode === 'expanded' && !dockDrawers) {
            setPracticeWorkspaceMode('collapsed-bottom');
            return;
        }
        if (practiceWorkspaceMode === 'expanded') {
            grammar.classList.remove('expanded');
            ask.classList.remove('expanded');
        }
        start = left;
        end = left + width;
    }
    const y = Math.max(top, main.top);
    const bottom = Math.min(top + height, main.bottom);
    panel.style.left = start + 'px';
    panel.style.top = y + 'px';
    panel.style.width = Math.max(0, end - start) + 'px';
    panel.style.height = Math.max(0, bottom - y) + 'px';
    const restore = document.getElementById('practice-restore');
    if (practiceWorkspaceMode === 'bookmark') {
        // The tab is a child of Grammar, so it follows the drawer's edge even in motion.
        restore.style.left = '-44px';
        restore.style.top = Math.max(12, Math.min(grammar.offsetHeight - 112,
            (grammar.querySelector('.panel-header')?.offsetHeight || 56) + 16)) + 'px';
        restore.style.width = '44px';
    } else {
        restore.style.left = start + 'px';
        restore.style.top = bottom - 44 + 'px';
        restore.style.width = Math.max(0, end - start) + 'px';
    }
}

// Exposes the actual Practice session's status on the collapsed tab (bookmark/collapsed-bottom
// restore button) as `.ready` / `.loading` / `.error` + `data-status`, reusing the SAME green/red
// convention already used for the Grammar/Ask panel tabs (index.html's `.side-panel.ready .panel-tab`
// / `.loading`) rather than inventing a second readiness state. This is deliberately the ONLY place
// that derives it, from `getCurrentPracticeSession()` -- never a separate flag that could drift from
// the session -- so a UI (this file's own default styling, or Gemini's own collapsed-tab component)
// can style the tab purely from `#practice-restore[data-status]`/its classes.
function practiceRestoreStatus() {
    const session = getCurrentPracticeSession();
    if (!session || !isValidPracticeSession(session)) return 'error';
    return session.status === 'ready' ? 'ready' : session.status === 'generating' ? 'loading' : 'error';
}
function syncPracticeRestore(panel) {
    const restore = document.getElementById('practice-restore');
    const grammar = document.getElementById('grammar-panel');
    const bookmarked = !panel.hidden && practiceWorkspaceMode === 'bookmark';
    grammar.classList.toggle('practice-bookmark-dock', bookmarked);
    const parent = bookmarked ? grammar : document.body;
    if (restore.parentElement !== parent) parent.appendChild(restore);
    restore.dataset.mode = practiceWorkspaceMode;
    restore.hidden = practiceWorkspaceMode === 'expanded' || panel.hidden;
    const status = practiceRestoreStatus();
    restore.dataset.status = status;
    restore.classList.toggle('ready', status === 'ready');
    restore.classList.toggle('loading', status === 'loading');
    restore.classList.toggle('error', status === 'error');
}

function setPracticeWorkspaceMode(mode) {
    if (!['expanded', 'collapsed-bottom', 'bookmark'].includes(mode)) return;
    const panel = getPracticePanel();
    practiceWorkspaceMode = mode;
    panel.dataset.mode = mode;
    panel.inert = mode !== 'expanded';
    panel.setAttribute('aria-hidden', String(mode !== 'expanded'));
    const restore = document.getElementById('practice-restore');
    syncPracticeRestore(panel);
    layoutPracticeWorkspace(mode === 'expanded');
    if (mode !== 'expanded') restore.focus({ preventScroll: true });
    else panel.querySelector('#practice-collapse')?.focus({ preventScroll: true });
}

function mountPracticeWorkspaceControls(panel) {
    const header = panel.querySelector('.practice-header');
    if (!header || header.querySelector('#practice-collapse')) return;
    for (const [id, icon, label, mode] of [
        ['practice-collapse', '↓', 'Collapse Practice down', 'collapsed-bottom'],
        ['practice-bookmark', '▯', 'Minimize Practice to bookmark', 'bookmark']
    ]) {
        const button = document.createElement('button');
        button.id = id;
        button.type = 'button';
        button.textContent = icon;
        if (mode === 'bookmark') {
            button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>';
        }
        button.title = label;
        button.setAttribute('aria-label', label);
        button.onclick = () => setPracticeWorkspaceMode(mode);
        header.appendChild(button);
    }
    // One bounded scroll container keeps controls visible even in short viewports.
    const body = document.createElement('div');
    body.className = 'practice-scroll';
    while (header.nextSibling) body.appendChild(header.nextSibling);
    panel.appendChild(body);
}

// Create or get practice panel
function getPracticePanel() {
    let panel = document.getElementById('practice-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'practice-panel';
        panel.className = 'side-panel';
        panel.hidden = true;
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-label', 'Practice Studio');

        // Insert into document near other panels (grammar, ask)
        const askPanel = document.getElementById('ask-panel');
        if (askPanel && askPanel.parentElement) {
            askPanel.parentElement.insertBefore(panel, askPanel.nextSibling);
        } else {
            document.body.appendChild(panel);
        }
    }
    if (!document.getElementById('practice-restore')) {
        const restore = document.createElement('button');
        restore.id = 'practice-restore';
        restore.className = 'side-panel practice-restore';
        restore.type = 'button';
        restore.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 6v15M3 3h4a5 5 0 0 1 5 3 5 5 0 0 1 5-3h4v15h-4a5 5 0 0 0-5 3 5 5 0 0 0-5-3H3Z"/></svg><span data-i18n="practiceTabLabel">' + t('practiceTabLabel') + '</span>';
        restore.title = 'Restore Practice workspace';
        restore.setAttribute('aria-label', 'Restore Practice workspace');
        restore.setAttribute('aria-controls', 'practice-panel');
        restore.hidden = true;
        restore.onclick = () => setPracticeWorkspaceMode('expanded');
        document.body.appendChild(restore);
        const observer = new MutationObserver(schedulePracticeWorkspaceLayout);
        const resize = new ResizeObserver(schedulePracticeWorkspaceLayout);
        for (const element of [document.getElementById('grammar-panel'), document.getElementById('ask-panel'), document.querySelector('nav'), document.getElementById('main-area')]) {
            observer.observe(element, { attributes: true, attributeFilter: ['class', 'style'] });
            resize.observe(element);
        }
        window.addEventListener('resize', schedulePracticeWorkspaceLayout);
        window.visualViewport?.addEventListener('resize', schedulePracticeWorkspaceLayout);
        window.visualViewport?.addEventListener('scroll', schedulePracticeWorkspaceLayout);
    }
    return panel;
}

// Show practice panel with the current session's reading passage
function displayPracticeSession(session) {
    const panel = getPracticePanel();
    const opening = panel.hidden;

    if (!isValidPracticeSession(session)) {
        // A session of another schema (e.g. the retired exercise worksheet) or a broken payload is never
        // rendered — not even partially. The learner gets a clear, retryable error instead.
        displayPracticeError(panel, { lastError: { message: t('practiceUnknownError') } });
    } else if (session.status === 'generating') {
        displayPracticeGenerating(panel, session);
    } else if (session.status === 'ready') {
        displayPracticeReady(panel, session);
    } else if (session.status === 'error') {
        displayPracticeError(panel, session);
    }

    panel.hidden = false;
    mountPracticeWorkspaceControls(panel);
    if (opening) practiceWorkspaceMode = 'expanded';
    panel.dataset.mode = practiceWorkspaceMode;
    panel.inert = practiceWorkspaceMode !== 'expanded';
    panel.setAttribute('aria-hidden', String(panel.inert));
    syncPracticeRestore(panel);
    layoutPracticeWorkspace(opening);
}

// Show generating state
function displayPracticeGenerating(panel, session) {
    panel.innerHTML = `
        <div class="practice-header">
            <button id="practice-close" class="icon-btn" title="${t('tClose')}" aria-label="${t('tClose')}">←</button>
            <h2>${t('generating')}</h2>
        </div>
        <div class="practice-content">
            <div class="practice-spinner">
                <div class="spinner-large"></div>
                <p style="margin-top: 20px; color: gray;">${t('generating')}</p>
            </div>
        </div>
    `;

    document.getElementById('practice-close').onclick = closePractice;
    mountPracticeWorkspaceControls(panel);
}

// Show ready state with the reading passage
function displayPracticeReady(panel, session) {
    const reading = session.reading;
    if (!reading) return;

    panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'practice-header';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'practice-close'; closeBtn.className = 'icon-btn';
    closeBtn.title = t('tClose'); closeBtn.setAttribute('aria-label', t('tClose')); closeBtn.textContent = '←';
    const h2 = document.createElement('h2');
    h2.textContent = reading.title;
    header.append(closeBtn, h2);
    panel.appendChild(header);

    // What is being practised — the words, NOT the raw selection: that is often a book exercise
    // ("Ils (plaindre) …") and must not appear on a reading surface.
    const focusWords = (session.lemmas && session.lemmas.length ? session.lemmas : [...new Set(reading.targets.map(x => x.lemma))]).slice(0, PRACTICE_MAX_LEMMAS);
    if (focusWords.length) {
        const meta = document.createElement('div');
        meta.className = 'practice-meta';
        const row = document.createElement('div'); row.className = 'meta-row';
        const label = document.createElement('span'); label.className = 'meta-label'; label.textContent = t('practiceFocus');
        const value = document.createElement('span'); value.className = 'meta-value'; value.textContent = focusWords.join(' · ');
        row.append(label, value);
        meta.appendChild(row);
        panel.appendChild(meta);
    }

    panel.appendChild(renderPracticeReading(reading));

    const actions = document.createElement('div');
    actions.className = 'practice-actions';
    const retryBtn = document.createElement('button'); retryBtn.id = 'practice-retry'; retryBtn.className = 'btn-secondary'; retryBtn.textContent = t('retry');
    const regenBtn = document.createElement('button'); regenBtn.id = 'practice-regenerate'; regenBtn.className = 'btn-secondary'; regenBtn.textContent = t('practiceRegenerate');
    actions.append(retryBtn, regenBtn);
    panel.appendChild(actions);

    // Attach event handlers
    closeBtn.onclick = closePractice;
    mountPracticeWorkspaceControls(panel);
    retryBtn.onclick = retryPractice;
    regenBtn.onclick = regeneratePractice;
}

// Renders the whole reading: for each section a quiet heading, then either its example sentences (one
// per line) or its connected paragraphs, with every target form highlighted and clickable. Built with
// createElement/textContent throughout — the AI response is untrusted input and is NEVER assigned via
// innerHTML. There is no numbering and nothing to fill in.
function renderPracticeReading(reading) {
    const wrap = document.createElement('div');
    wrap.className = 'practice-reading';

    const targetsByParagraph = new Map();
    (reading.targets || []).forEach(target => {
        if (!targetsByParagraph.has(target.paragraphIndex)) targetsByParagraph.set(target.paragraphIndex, []);
        targetsByParagraph.get(target.paragraphIndex).push(target);
    });

    (reading.sections || []).forEach(section => {
        const block = document.createElement('section');
        block.className = 'practice-section practice-section-' + section.kind;
        if (section.heading) {
            const h = document.createElement('h3');
            h.className = 'practice-section-title';
            h.textContent = section.heading;
            block.appendChild(h);
        }
        for (let idx = section.start; idx < section.end; idx++) {
            block.appendChild(buildPracticeSentenceRow(idx, reading.paragraphs[idx], targetsByParagraph.get(idx) || [], reading.language, section.kind));
        }
        wrap.appendChild(block);
    });

    return wrap;
}

// One reading row: the sentence/paragraph text with its clickable highlighted targets (unchanged —
// renderParagraphWithTargets below is untouched and still focuses the exact Grammar occurrence with
// zero extra AI calls, independent of anything below), plus a small, visually secondary [listen]
// [translate] action pair and a collapsible translation slot directly under it. These reuse the
// EXISTING TTS system (speakInLang, js/tts.js) and the EXISTING translation engine (aiTranslateText /
// machineTranslate, js/ai-client.js) exactly as the reader's own translation tooltip does — never a
// second implementation of either, and neither action calls Grammar or regenerates the session.
function buildPracticeSentenceRow(idx, text, targets, langCode, kind) {
    const row = document.createElement('div');
    row.className = kind === 'story' ? 'practice-paragraph' : 'practice-sentence';
    row.dataset.paragraph = String(idx);

    const textSpan = document.createElement('span');
    textSpan.className = 'practice-sentence-text';
    renderParagraphWithTargets(textSpan, text, targets, langCode);
    row.appendChild(textSpan);

    const actions = document.createElement('span');
    actions.className = 'practice-sentence-actions';

    const speakBtn = document.createElement('button');
    speakBtn.type = 'button';
    speakBtn.className = 'practice-action-btn practice-speak-btn';
    speakBtn.textContent = '🔊';
    speakBtn.title = t('practiceSpeakSentence');
    speakBtn.setAttribute('aria-label', t('practiceSpeakSentence'));
    speakBtn.onclick = (e) => { e.stopPropagation(); togglePracticeSpeak(text, langCode, speakBtn); };
    actions.appendChild(speakBtn);

    const translateBtn = document.createElement('button');
    translateBtn.type = 'button';
    translateBtn.className = 'practice-action-btn practice-translate-btn';
    translateBtn.textContent = '🌐';
    translateBtn.title = t('practiceTranslateSentence');
    translateBtn.setAttribute('aria-label', t('practiceTranslateSentence'));
    actions.appendChild(translateBtn);
    row.appendChild(actions);

    const translationEl = document.createElement('div');
    translationEl.className = 'practice-sentence-translation';
    translationEl.hidden = true;
    row.appendChild(translationEl);

    // First press fetches and shows the translation; every later press just hides/reopens the SAME
    // result (no re-fetch, no regenerating the Practice session, no Grammar call) — see
    // fetchPracticeTranslation's own cache below.
    let requested = false;
    translateBtn.onclick = (e) => {
        e.stopPropagation();
        if (requested) {
            translationEl.hidden = !translationEl.hidden;
            translateBtn.classList.toggle('active', !translationEl.hidden);
            return;
        }
        requested = true;
        translationEl.hidden = false;
        translationEl.textContent = t('translating');
        translateBtn.classList.add('active');
        fetchPracticeTranslation(text, langCode).then(result => {
            translationEl.textContent = result || t('error');
        });
    };

    return row;
}

// ---- sentence-level TTS -------------------------------------------------------------------------
// Reuses speakInLang (js/tts.js) exactly as the translation tooltip's own translation speaker does —
// same voice selection, same cancel-then-speak race handling, same 'speakingSide' bookkeeping — just
// with a THIRD side value ('practice') and a completion hook instead of the tooltip's own icons.
// Exactly one Practice speaker button is ever marked "playing": starting a different one resets the
// previous, pressing the SAME one again stops it (mirrors the tooltip's own toggle idiom via the
// existing stopTooltipSpeech, which is a generic "stop whatever is speaking" primitive despite its
// name), and natural completion resets it via the onEnd hook. No overlapping speech is possible: every
// speakInLang call cancels the shared synthesizer first, exactly as it already does for every caller.
let practiceSpeakingBtn = null;
function resetPracticeSpeakBtn() {
    if (practiceSpeakingBtn) { practiceSpeakingBtn.textContent = '🔊'; practiceSpeakingBtn.classList.remove('speak-active'); }
    practiceSpeakingBtn = null;
}
function togglePracticeSpeak(text, langCode, btn) {
    if (practiceSpeakingBtn === btn) { stopTooltipSpeech(); resetPracticeSpeakBtn(); return; }
    resetPracticeSpeakBtn();
    practiceSpeakingBtn = btn;
    btn.textContent = '■'; btn.classList.add('speak-active');
    speakInLang(text, langCode, 'practice', 0, () => { if (practiceSpeakingBtn === btn) resetPracticeSpeakBtn(); });
}

// ---- sentence-level translation ------------------------------------------------------------------
// The SAME two-step engine the translation tooltip uses (aiTranslateText first, machineTranslate as
// its own existing fallback -- js/ai-client.js), called with the exact Practice sentence as input and
// its own text as context (task: "translate exactly that sentence"). Source language is the READING'S
// OWN validated language (never re-detected -- the language-isolation contract from the bilingual
// selection fix applies here too); target language is the reader's existing state.targetLang, per the
// same rule the tooltip itself follows. Cached (source+target+text) for the life of the page: a
// Practice-scoped plain-text cache, kept separate from the tooltip's own HTML-annotated cache (which
// carries markup like the ⚡/⌂ provenance notes) rather than fragile reverse-parsing it.
const practiceTranslationCache = new Map();
async function fetchPracticeTranslation(text, srcLang) {
    const targetLang = state.targetLang;
    const key = srcLang + '>' + targetLang + '|' + text;
    if (practiceTranslationCache.has(key)) return practiceTranslationCache.get(key);
    let result = null;
    try { result = await aiTranslateText(text, srcLang, undefined, targetLang, text, false); } catch (e) {}
    if (!result) {
        try { const m = await machineTranslate(text, srcLang, true, undefined, targetLang); result = m && m.plain; } catch (e) {}
    }
    if (result) practiceTranslationCache.set(key, result);
    return result;
}

// Places each target at its OWN occurrence in the paragraph — the offsets validated when the
// reading was accepted (validatePracticeReading), or, for a session persisted before offsets
// existed, the first WHOLE-WORD match (never a bare substring: "est" inside "reste") — and rebuilds
// the paragraph as text nodes with a clickable <button> wrapped around ONLY that exact occurrence,
// never every occurrence of the word, since each target's explanation is tied to one specific
// sentence (task section 12/13).
function renderParagraphWithTargets(container, text, targets, langCode) {
    const positioned = [];
    for (const target of targets) {
        let start = Number.isInteger(target.start) && target.start >= 0 && text.startsWith(target.surface, target.start) ? target.start : -1;
        if (start === -1) {
            const found = findSurfaceOccurrences(text, target.surface);
            start = found.length ? found[0] : -1;
        }
        if (start === -1) continue;
        positioned.push({ target, start, end: start + target.surface.length });
    }
    positioned.sort((a, b) => a.start - b.start);

    let cursor = 0;
    for (const { target, start, end } of positioned) {
        if (start < cursor) continue; // overlapping targets guard
        if (start > cursor) container.appendChild(document.createTextNode(text.slice(cursor, start)));
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'practice-target practice-target-' + target.pos;
        btn.textContent = text.slice(start, end);
        btn.dataset.lemma = target.lemma;
        btn.onclick = () => {
            const span = sentenceSpanAround(text, start, end);
            focusGrammarItem({
                pos: target.pos, lemma: target.lemma, surface: target.surface,
                sentence: text.slice(span.from, span.to), start: start - span.from, end: end - span.from,
                features: target.features || {}, explanation: target.explanation || '',
                stemBreakdown: null, forms: target.forms || null,
                transformations: target.transformations || null, irregularForms: target.irregularForms || null
            }, langCode);
        };
        container.appendChild(btn);
        cursor = end;
    }
    if (cursor < text.length) container.appendChild(document.createTextNode(text.slice(cursor)));
}

// The [from, to) slice of `text` that is the sentence a [start,end) span sits in (trimmed),
// for the Grammar focus card's "used in context" display when a Practice target is clicked.
// Terminators include the CJK / Devanagari full stops so non-Latin readings split correctly.
const PRACTICE_SENTENCE_END = ['.', '!', '?', '。', '！', '？', '।'];
function sentenceSpanAround(text, start, end) {
    let from = 0;
    for (const p of PRACTICE_SENTENCE_END) {
        const i = text.lastIndexOf(p, start - 1);
        if (i !== -1) from = Math.max(from, i + 1);
    }
    let to = text.length;
    for (const p of PRACTICE_SENTENCE_END) {
        const i = text.indexOf(p, end);
        if (i !== -1) to = Math.min(to, i + 1);
    }
    while (from < start && /\s/.test(text[from])) from++;
    while (to > end && /\s/.test(text[to - 1])) to--;
    return { from, to };
}
function sentenceAround(text, start, end) {
    const span = sentenceSpanAround(text, start, end);
    return text.slice(span.from, span.to);
}

// Show error state
function displayPracticeError(panel, session) {
    const error = session.lastError || { message: t('practiceUnknownError') };

    panel.innerHTML = `
        <div class="practice-header">
            <button id="practice-close" class="icon-btn" title="${t('tClose')}" aria-label="${t('tClose')}">←</button>
            <h2>${t('practiceError')}</h2>
        </div>
        <div class="practice-error">
            <p style="color: red; margin: 20px 0;">⚠️ ${escapeHtml(error.message)}</p>
            <div class="practice-actions">
                <button id="practice-retry" class="btn-primary">${t('retry')}</button>
                <button id="practice-close-error" class="btn-secondary">${t('tClose')}</button>
            </div>
        </div>
    `;

    document.getElementById('practice-retry').onclick = retryPractice;
    document.getElementById('practice-close').onclick = closePractice;
    mountPracticeWorkspaceControls(panel);
    document.getElementById('practice-close-error').onclick = closePractice;
}

// Close practice panel
function closePractice() {
    const panel = document.getElementById('practice-panel');
    if (panel) {
        panel.hidden = true;
    }
    document.getElementById('practice-restore')?.setAttribute('hidden', '');
    document.getElementById('grammar-panel').classList.remove('practice-bookmark-dock');
    closePracticeSession();
}

// Retry current practice
async function retryPractice() {
    const session = getCurrentPracticeSession();
    if (!session) return;

    const panel = getPracticePanel();

    try {
        // Show generating state immediately
        displayPracticeGenerating(panel, session);

        // Retry with same context
        const newSession = await retryPracticeGeneration();
        if (newSession) {
            displayPracticeSession(newSession);
        }
    } catch (err) {
        // Error will have been persisted and displayed
        const updated = getCurrentPracticeSession();
        if (updated) {
            displayPracticeSession(updated);
        }
    }
}

// Regenerate practice completely
async function regeneratePractice() {
    const session = getCurrentPracticeSession();
    if (!session) return;

    const context = practiceContextFromSession(session);

    const panel = getPracticePanel();

    try {
        // Show generating state immediately
        displayPracticeGenerating(panel, { status: 'generating' });

        // Generate an entirely new reading passage
        const newSession = await regeneratePracticeReading(context);
        if (newSession) {
            displayPracticeSession(newSession);
        }
    } catch (err) {
        // Error will have been persisted
        const updated = getCurrentPracticeSession();
        if (updated) {
            displayPracticeSession(updated);
        }
    }
}

// CSS styles for practice panel and worksheet
const practiceStyles = `
#practice-panel {
    position: fixed;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    max-height: 100dvh;
    overflow: hidden;
    padding: 0;
    right: auto;
    border-radius: 8px;
    background: var(--panel-bg);
    z-index: 10001;
    transition: transform 180ms ease, opacity 180ms ease, visibility 180ms;
}
#practice-panel[hidden], #practice-restore[hidden] { display: none; }
#practice-panel:not([hidden])[data-mode="collapsed-bottom"] {
    transform: translateY(35%); opacity: 0; visibility: hidden; pointer-events: none;
}
#practice-panel:not([hidden])[data-mode="bookmark"] {
    transform: translateX(12%); opacity: 0; visibility: hidden; pointer-events: none;
}
.practice-scroll {
    flex: 1; min-height: 0; min-width: 0; overflow-y: auto;
    overflow-x: hidden; overscroll-behavior: contain; overflow-wrap: anywhere;
}
#practice-panel .practice-reading, #practice-panel .practice-content,
#practice-panel .practice-error { overflow: visible; }
/* The floating menu handle (#menu-handle, fixed 44px circle at the top-left, z-index above every panel) sits
   over the panel's left edge; the app's own toolbar reserves 60px for it, and so must this header, otherwise the
   Close button underneath is covered and cannot be clicked. */
#practice-panel .practice-header { padding: 6px 6px 6px max(60px, calc(env(safe-area-inset-left, 0px) + 52px)); min-width: 0; }
#practice-panel .practice-header h2 {
    min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#practice-panel .practice-header button {
    flex: 0 0 44px; min-height: 44px; cursor: pointer;
    background: var(--panel-bg); color: var(--text-color);
    border: 1px solid var(--border-color); border-radius: 6px; font-size: 22px;
}
#practice-restore {
    position: fixed; height: 44px; min-height: 44px;
    display: flex; align-items: center; justify-content: center;
    visibility: visible; transform: none; z-index: 20001;
    background: var(--panel-bg); color: var(--text-color);
    border: 1px solid var(--border-color); border-radius: 8px 8px 0 0;
    cursor: pointer; box-shadow: 0 -2px 10px #0002;
}
#practice-restore { flex-direction: row; gap: 8px; font-weight: 600; }
/* Reserve a slim outside rail and provide positioning context for bookmark tab. */
#grammar-panel.practice-bookmark-dock {
    max-width: calc(100vw - 44px);
    position: relative;
}
#practice-restore[data-mode="bookmark"] {
    position: absolute; height: auto; width: 44px; min-height: 100px; max-height: 120px;
    flex-direction: column; gap: 4px; padding: 8px 4px;
    background: var(--panel-bg);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-left: 3px solid var(--accent-color);
    border-radius: 0;
    box-shadow: 2px 2px 6px #0002;
    font-size: 10px;
    font-weight: 600;
    justify-content: flex-start;
}
#practice-restore[data-mode="bookmark"] svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}
#practice-restore[data-mode="bookmark"] span {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    word-break: break-word;
    text-align: center;
    flex: 1;
}
#practice-restore[data-mode="bookmark"]:hover {
    background: var(--surface-2);
    border-left-color: var(--accent-color);
}
#practice-restore:focus-visible { outline: 2px solid #6383e8; outline-offset: -3px; }
/* Same green/red convention as the Grammar/Ask panel tabs (.side-panel.ready/.loading .panel-tab in
   index.html) -- ready = a session is generated and waiting to be read; loading = generating; error =
   the last attempt failed. A default so the state is visible even before any richer tab styling exists;
   easy to override, since it is plain class + data-status, not inline style. */
#practice-restore.ready { background: rgba(25, 135, 84, 0.14); border-color: rgba(25, 135, 84, 0.5); }
#practice-restore.loading { background: rgba(220, 53, 69, 0.14); border-color: rgba(220, 53, 69, 0.5); }
#practice-restore.error { background: rgba(220, 53, 69, 0.14); border-color: rgba(220, 53, 69, 0.5); }
@media (prefers-reduced-motion: reduce) {
    #practice-panel { transition: none; }
}

.practice-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.practice-header h2 {
    margin: 0;
    flex: 1;
    font-size: 18px;
}

#practice-close {
    background: none;
    border: none;
    color: var(--text-color);
    cursor: pointer;
    font-size: 20px;
    padding: 5px;
}

#practice-close:hover {
    opacity: 0.7;
}

.practice-meta {
    padding: 8px 12px;
    background: var(--surface-2);
    font-size: 12px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border-color);
}

.meta-row {
    display: flex;
    gap: 8px;
    margin: 3px 0;
    align-items: center;
}

.meta-label {
    font-weight: 600;
    min-width: 60px;
    color: var(--text-color);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.meta-value {
    color: var(--text-muted);
    font-size: 12px;
}

.practice-content,
.practice-error {
    flex: 1;
    overflow-y: auto;
    padding: 20px 15px;
}

.practice-spinner {
    text-align: center;
}

/* Contextual reading passage: comfortable prose, not an exercise grid (task
   section 9/10/16) — target forms get a restrained accent underline rather than a
   noisy highlight, per section 12. */
.practice-reading {
    flex: 1;
    overflow-y: auto;
    padding: 12px 14px;
}

/* Now a <div> (was <p>), since it can hold a per-sentence translation block below the text without
   invalid block-inside-inline markup; unchanged class name, so pre-existing selectors elsewhere are
   unaffected. display:flex/wrap lets the [listen][translate] actions sit at the end of the same
   visual line as the sentence text, wrapping onto their own line only when the text is long. */
.practice-paragraph, .practice-sentence {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 8px;
    row-gap: 2px;
}
.practice-sentence-text {
    flex: 1 1 auto;
    min-width: 55%;
}

.practice-paragraph {
    font-size: 15px;
    line-height: 1.7;
    margin: 0 0 14px 0;
    color: var(--text-color);
}

/* One section per practised word (or one connected story): a quiet heading, then its sentences, one
   per line. No numbering, no boxes — reading material, not a worksheet. */
.practice-section {
    margin: 0 0 20px 0;
}
.practice-section-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .03em;
    color: var(--text-muted);
    margin: 0 0 8px 0;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--border-color);
}
.practice-sentence {
    font-size: 15px;
    line-height: 1.65;
    margin: 0 0 8px 0;
    color: var(--text-color);
}

.practice-target {
    background: none;
    border: none;
    padding: 0 1px;
    margin: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    border-bottom: 2px solid #10a37f;
    font-weight: 600;
}

.practice-target:hover, .practice-target:focus-visible {
    background: color-mix(in srgb, #10a37f 16%, transparent);
    outline: none;
}

.practice-target-adjective {
    border-bottom-color: #0d6efd;
}

/* Sentence-level learning actions: compact and visually secondary (task requirement) — muted until
   hovered/focused, never a full toolbar. flex:0 0 auto keeps them from stretching or wrapping apart
   from each other; the row above wraps them as a UNIT onto their own line for a long sentence. */
.practice-sentence-actions {
    display: inline-flex;
    flex: 0 0 auto;
    gap: 1px;
    opacity: .5;
}
.practice-sentence-actions:hover, .practice-sentence-actions:focus-within {
    opacity: 1;
}
.practice-action-btn {
    background: none;
    border: none;
    padding: 3px 5px;
    margin: 0;
    font-size: 13px;
    line-height: 1;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 4px;
    min-width: 26px;
    min-height: 22px;
}
.practice-action-btn:hover, .practice-action-btn:focus-visible {
    background: var(--surface-2);
    color: var(--text-color);
    outline: none;
}
.practice-action-btn.speak-active, .practice-action-btn.active {
    color: #10a37f;
}
.practice-sentence-translation {
    flex: 1 0 100%;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--text-muted);
    padding: 2px 0 2px 8px;
    margin-top: -1px;
    border-left: 2px solid var(--border-color);
}
.practice-sentence-translation[hidden] {
    display: none;
}
/* Comfortable touch targets without enlarging the icons themselves (still "compact"). */
@media (max-width: 480px) {
    .practice-action-btn {
        min-width: 34px;
        min-height: 32px;
        font-size: 15px;
    }
}

.practice-actions {
    display: flex;
    gap: 6px;
    padding: 8px 12px;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
    flex-wrap: wrap;
}

.practice-actions button {
    flex: 1;
    min-width: 80px;
    padding: 6px 10px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: opacity 0.2s;
}

.btn-primary {
    background: var(--accent-color);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    opacity: 0.9;
}

.btn-secondary {
    background: var(--surface-2);
    color: var(--text-color);
    border: 1px solid var(--border-color);
}

.btn-secondary:hover {
    background: var(--border-color);
}

.btn-primary:disabled {
    background: var(--border-color);
    color: var(--text-muted);
    cursor: not-allowed;
    opacity: 0.6;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
    .practice-reading {
        padding: 15px;
    }

    .practice-header {
        padding: 12px 10px;
    }

    .practice-meta {
        padding: 8px 10px;
    }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
    .btn-secondary {
        background: #333;
        color: #ddd;
        border-color: #555;
    }

    .btn-secondary:hover {
        background: #444;
    }
}
`;

// Inject styles into document head
function injectPracticeStyles() {
    if (!document.getElementById('practice-stylesheet')) {
        const style = document.createElement('style');
        style.id = 'practice-stylesheet';
        style.textContent = practiceStyles;
        document.head.appendChild(style);
    }
}

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
    injectPracticeStyles();
});
