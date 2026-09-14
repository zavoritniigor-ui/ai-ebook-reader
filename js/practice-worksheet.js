/* practice-worksheet.js — Worksheet rendering and Practice Studio UI.
 * Displays worksheets safely without executing AI-generated HTML.
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

function syncPracticeRestore(panel) {
    const restore = document.getElementById('practice-restore');
    const grammar = document.getElementById('grammar-panel');
    const bookmarked = !panel.hidden && practiceWorkspaceMode === 'bookmark';
    grammar.classList.toggle('practice-bookmark-dock', bookmarked);
    const parent = bookmarked ? grammar : document.body;
    if (restore.parentElement !== parent) parent.appendChild(restore);
    restore.dataset.mode = practiceWorkspaceMode;
    restore.hidden = practiceWorkspaceMode === 'expanded' || panel.hidden;

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
        restore.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 6v15M3 3h4a5 5 0 0 1 5 3 5 5 0 0 1 5-3h4v15h-4a5 5 0 0 0-5 3 5 5 0 0 0-5-3H3Z"/></svg><span>Practice</span>';
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

// Show practice panel with worksheet
function displayPracticeSession(session) {
    const panel = getPracticePanel();
    const opening = panel.hidden;

    if (session.status === 'generating') {
        displayPracticeGenerating(panel, session);
    } else if (session.status === 'ready' && session.worksheet) {
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

// Show ready state with worksheet
function displayPracticeReady(panel, session) {
    const worksheet = session.worksheet;
    if (!worksheet) return;

    const metadata = worksheet.metadata || {};
    const exercises = worksheet.exercises || [];
    const maxPage = Math.ceil(exercises.length / getExercisesPerPage());

    let html = `
        <div class="practice-header">
            <button id="practice-close" class="icon-btn" title="${t('tClose')}" aria-label="${t('tClose')}">←</button>
            <h2>${escapeHtml(metadata.title)}</h2>
        </div>
        <div class="practice-meta">
            <div class="meta-row">
                <span class="meta-label">${t('practiceSource')}</span>
                <span class="meta-value">${session.sourceText ? escapeHtml(session.sourceText.substring(0, 50)) + (session.sourceText.length > 50 ? '...' : '') : '(no context)'}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">${t('practiceLevel')}</span>
                <span class="meta-value">${escapeHtml(session.level)}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">${t('practiceExercises')}</span>
                <span class="meta-value">${exercises.length}</span>
            </div>
        </div>
    `;

    // Render worksheet pages
    html += '<div class="practice-worksheet">';
    html += renderWorksheetPages(worksheet, session.currentPage);
    html += '</div>';

    // Page navigation and actions
    if (maxPage > 1) {
        html += `
            <div class="practice-pagination">
                <button id="practice-prev-page" ${session.currentPage === 0 ? 'disabled' : ''}>${t('practicePrevious')}</button>
                <span>${t('practicePage')} ${session.currentPage + 1}/${maxPage}</span>
                <button id="practice-next-page" ${session.currentPage >= maxPage - 1 ? 'disabled' : ''}>${t('practiceNext')}</button>
            </div>
        `;
    }

    html += `
        <div class="practice-actions">
            <button id="practice-retry" class="btn-secondary">${t('retry')}</button>
            <button id="practice-regenerate" class="btn-secondary">${t('practiceRegenerate')}</button>
            <button id="practice-check" class="btn-primary" disabled title="${t('practiceComingSoon')}">${t('practiceCheck')} (${t('practiceComingSoon')})</button>
        </div>
    `;

    panel.innerHTML = html;

    // Attach event handlers
    document.getElementById('practice-close').onclick = closePractice;
    mountPracticeWorkspaceControls(panel);
    document.getElementById('practice-retry').onclick = retryPractice;
    document.getElementById('practice-regenerate').onclick = regeneratePractice;

    if (session.currentPage > 0) {
        document.getElementById('practice-prev-page').onclick = () => {
            session.currentPage--;
            displayPracticeSession(session);
        };
    }

    if (session.currentPage < maxPage - 1) {
        document.getElementById('practice-next-page').onclick = () => {
            session.currentPage++;
            displayPracticeSession(session);
        };
    }

    // Phase 3B: Attach hint reveal handlers
    setupHintControls();

    // Phase 3C: Attach answer checking handlers
    setupAnswerControls();
}

// Setup hint reveal controls for all exercises
function setupHintControls() {
    const hintButtons = document.querySelectorAll('.hint-reveal-btn');
    const session = getCurrentPracticeSession();

    hintButtons.forEach(btn => {
        const exerciseId = btn.closest('.exercise-hints')?.dataset.exerciseId;

        // Restore previously revealed hints for this exercise
        if (session && exerciseId && session.revealedHints[exerciseId]) {
            const revealedCount = session.revealedHints[exerciseId];
            const hints = btn.parentElement.querySelector('.hints-container')?.querySelectorAll('.hint') || [];

            // Show container and previously revealed hints
            if (revealedCount > 0) {
                btn.parentElement.querySelector('.hints-container').style.display = 'block';
                for (let i = 0; i < revealedCount && i < hints.length; i++) {
                    hints[i].style.display = 'block';
                }

                // Update button state if all hints revealed
                if (revealedCount >= hints.length) {
                    btn.textContent = `✓ ${t('hint')}`;
                    btn.disabled = true;
                }
            }
        }

        btn.onclick = (e) => {
            e.preventDefault();
            revealNextHint(btn);
        };
    });
}

// Reveal next hint progressively for an exercise
function revealNextHint(button) {
    const hintsContainer = button.parentElement.querySelector('.hints-container');
    const hints = hintsContainer.querySelectorAll('.hint');
    const exerciseId = button.closest('.exercise-hints')?.dataset.exerciseId;
    const session = getCurrentPracticeSession();

    // Show container on first reveal
    if (hintsContainer.style.display === 'none') {
        hintsContainer.style.display = 'block';
    }

    // Find first hidden hint
    let revealedCount = 0;
    for (let i = 0; i < hints.length; i++) {
        if (hints[i].style.display === 'none') {
            // Reveal this hint
            hints[i].style.display = 'block';
            revealedCount = i + 1;

            // Update button text when all hints shown
            if (i === hints.length - 1) {
                button.textContent = `✓ ${t('hint')}`;
                button.disabled = true;
            }

            // Persist hint reveal state to session
            if (session && exerciseId) {
                session.revealedHints[exerciseId] = revealedCount;
                persistPracticeSession(session);
            }

            return;
        } else {
            revealedCount++;
        }
    }
}

// Setup answer input and checking controls (Phase 3C)
function setupAnswerControls() {
    const session = getCurrentPracticeSession();
    if (!session) return;

    const checkButtons = document.querySelectorAll('.answer-check-btn');
    const answerInputs = document.querySelectorAll('.answer-input');

    // Persist answer when user types
    answerInputs.forEach(input => {
        input.addEventListener('input', () => {
            const exerciseEl = input.closest('.exercise');
            if (exerciseEl) {
                const exerciseId = exerciseEl.dataset.id;
                if (!session.answers) session.answers = {};
                if (!session.answers[exerciseId]) session.answers[exerciseId] = {};
                session.answers[exerciseId].answer = input.value;
                persistPracticeSession(session);
            }
        });

        // Allow checking with Enter key for single-line inputs
        if (input.tagName === 'INPUT') {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const btn = input.closest('.exercise-input').querySelector('.answer-check-btn');
                    if (btn) btn.click();
                }
            });
        }
    });

    // Attach check button handlers
    checkButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const exerciseId = btn.dataset.exerciseId;
            const hasExpectedAnswer = btn.dataset.hasAnswer === 'true';
            const exerciseEl = document.querySelector(`.exercise[data-id="${CSS.escape(exerciseId)}"]`);
            const inputEl = exerciseEl?.querySelector('.answer-input');

            if (!exerciseEl || !inputEl) return;

            const userAnswer = inputEl.value;
            const exercise = session.worksheet?.exercises?.find(ex => ex.id === exerciseId);
            if (!exercise) return;

            // Grade the answer
            const feedback = gradeExerciseAnswer(exercise, userAnswer);

            // Store feedback in session
            if (!session.answers) session.answers = {};
            if (!session.answers[exerciseId]) session.answers[exerciseId] = {};
            session.answers[exerciseId].answer = userAnswer;
            session.answers[exerciseId].feedback = feedback;
            persistPracticeSession(session);

            // Show feedback
            const feedbackEl = exerciseEl.querySelector('.exercise-feedback');
            if (feedbackEl) {
                feedbackEl.remove();
            }

            const feedbackClass = feedback.isCorrect ? 'feedback-correct' : 'feedback-incorrect';
            const feedbackIcon = feedback.needsReview ? '📝' : (feedback.isCorrect ? '✓' : '✗');
            const feedbackHtml = `
                <div class="exercise-feedback ${feedbackClass}">
                    ${feedbackIcon}
                    ${escapeHtml(feedback.feedback)}
                </div>
            `;

            // Insert feedback before hints
            const hintsEl = exerciseEl.querySelector('.exercise-hints');
            if (hintsEl) {
                hintsEl.insertAdjacentHTML('beforebegin', feedbackHtml);
            } else {
                exerciseEl.insertAdjacentHTML('beforeend', feedbackHtml);
            }
        });
    });
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

// Get exercises per page (responsive) - compact layout
function getExercisesPerPage() {
    // Mobile: show more with compact layout
    // Tablet+: show many exercises per page
    return window.innerWidth < 768 ? 8 : 20;
}

// Render worksheet pages
function renderWorksheetPages(worksheet, currentPage) {
    const exercises = worksheet.exercises || [];
    const perPage = getExercisesPerPage();
    const startIdx = currentPage * perPage;
    const endIdx = Math.min(startIdx + perPage, exercises.length);
    const pageExercises = exercises.slice(startIdx, endIdx);

    let html = '<div class="worksheet-page">';
    html += `<h3 class="worksheet-title">${escapeHtml(worksheet.metadata?.title || '')}</h3>`;

    pageExercises.forEach((ex, idx) => {
        const actualNumber = startIdx + idx + 1;
        html += renderExercise(ex, actualNumber);
    });

    html += '</div>';
    return html;
}

// Render single exercise with compact layout and answer input
function renderExercise(exercise, number) {
    const typeIcon = getExerciseTypeIcon(exercise.type);
    const hasHints = exercise.hints && exercise.hints.length > 0;
    const session = getCurrentPracticeSession();
    const savedAnswer = session?.answers?.[exercise.id]?.answer || '';
    const savedFeedback = session?.answers?.[exercise.id]?.feedback || null;

    // Build answer input control based on exercise type
    let answerControl = buildAnswerControl(exercise, savedAnswer);

    let html = `
        <div class="exercise" data-id="${escapeHtml(exercise.id)}" data-type="${escapeHtml(exercise.type)}">
            <div class="exercise-header">
                <span class="exercise-number">${number}</span>
                <span class="exercise-type-icon" title="${exercise.type}">${typeIcon}</span>
                <span class="exercise-instruction">${escapeHtml(exercise.instruction)}</span>
            </div>
            <div class="exercise-prompt">${escapeHtml(exercise.prompt)}</div>
            <div class="exercise-input">
                ${answerControl}
            </div>
    `;

    // Show feedback if answer was checked
    if (savedFeedback) {
        const feedbackClass = savedFeedback.isCorrect ? 'feedback-correct' : 'feedback-incorrect';
        html += `
            <div class="exercise-feedback ${feedbackClass}">
                ${savedFeedback.needsReview ? '📝' : (savedFeedback.isCorrect ? '✓' : '✗')}
                ${escapeHtml(savedFeedback.feedback)}
            </div>
        `;
    }

    // Phase 3B/3C: Progressive hints
    if (hasHints) {
        html += `
            <div class="exercise-hints" data-exercise-id="${escapeHtml(exercise.id)}">
                <button class="hint-reveal-btn" type="button" title="Show hint">💡 ${t('hint')}</button>
                <div class="hints-container" style="display:none;">
        `;

        exercise.hints.forEach((hint, idx) => {
            html += `
                <div class="hint hint-${idx + 1}" style="display:none;">
                    <span class="hint-level">Hint ${idx + 1}:</span>
                    <span class="hint-text">${escapeHtml(hint)}</span>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

// Build answer input control appropriate for exercise type
function buildAnswerControl(exercise, savedValue) {
    const id = `answer_${escapeHtml(exercise.id)}`;
    const types = {
        'fill_form': 'text',
        'auxiliary': 'text',
        'conjugation': 'text',
        'transform': 'textarea',
        'correct_error': 'text',
        'translate': 'text',
        'short_production': 'textarea',
        'contextual_usage': 'textarea'
    };

    const inputType = types[exercise.type] || 'text';
    const checkButtonLabel = exercise.expectedAnswer ? 'Check' : 'Submit';

    if (inputType === 'textarea') {
        return `
            <textarea id="${id}" class="answer-input" placeholder="Your answer..." rows="2">${escapeHtml(savedValue)}</textarea>
            <button class="answer-check-btn" data-exercise-id="${escapeHtml(exercise.id)}" data-has-answer="${!!exercise.expectedAnswer}">${checkButtonLabel}</button>
        `;
    } else {
        return `
            <input type="text" id="${id}" class="answer-input" placeholder="Your answer..." value="${escapeHtml(savedValue)}" />
            <button class="answer-check-btn" data-exercise-id="${escapeHtml(exercise.id)}" data-has-answer="${!!exercise.expectedAnswer}">${checkButtonLabel}</button>
        `;
    }
}

// Get icon for exercise type
function getExerciseTypeIcon(type) {
    const icons = {
        'fill_form': '✏️',
        'auxiliary': '◎',
        'conjugation': '→',
        'transform': '↻',
        'correct_error': '✓',
        'translate': '⇄',
        'short_production': '💬',
        'contextual_usage': '◆'
    };
    return icons[type] || '◆';
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

    const context = {
        sourceLanguage: session.sourceLanguage,
        targetLanguage: session.targetLanguage,
        bookId: session.bookId,
        sourceText: session.sourceText,
        sourceContext: session.sourceContext,
        level: session.level
    };

    const panel = getPracticePanel();

    try {
        // Show generating state immediately
        displayPracticeGenerating(panel, { status: 'generating' });

        // Generate entirely new worksheet
        const newSession = await regeneratePracticeWorksheet(context);
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
#practice-panel .practice-worksheet, #practice-panel .practice-content,
#practice-panel .practice-error { overflow: visible; }
#practice-panel .practice-header { padding: 6px; min-width: 0; }
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

.practice-worksheet {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
}

.worksheet-page {
    background: var(--panel-bg);
    padding: 0;
    border-radius: 0;
    box-shadow: none;
}

.worksheet-title {
    font-size: 16px;
    font-weight: bold;
    margin: 0 0 12px 0;
    padding: 0 8px;
    color: var(--text-color);
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 8px;
}

.exercise {
    margin-bottom: 12px;
    padding: 10px 8px;
    border-bottom: 1px solid var(--border-color);
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
}

.exercise:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.exercise-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
}

.exercise-number {
    font-weight: 600;
    font-size: 12px;
    min-width: 24px;
    color: var(--text-color);
    background: var(--surface-2);
    padding: 2px 6px;
    border-radius: 3px;
    text-align: center;
}

.exercise-type-icon {
    font-size: 12px;
    color: var(--text-muted);
}

.exercise-instruction {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
    flex: 1;
}

.exercise-prompt {
    font-size: 13px;
    margin: 0;
    padding: 6px 8px;
    background: var(--surface-2);
    border-left: 3px solid var(--accent-color);
    border-radius: 2px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.4;
}

.exercise-input {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px;
    align-items: center;
}

.answer-input {
    font-size: 13px;
    padding: 6px 8px;
    border: 1px solid var(--border-color);
    border-radius: 3px;
    background: var(--panel-bg);
    color: var(--text-color);
    font-family: inherit;
    min-height: 32px;
}

.answer-input:focus {
    outline: 2px solid var(--accent-color);
    outline-offset: -1px;
}

.answer-input[type="text"] {
    min-width: 150px;
}

.answer-input[type="text"]::placeholder,
.answer-input[type="textarea"]::placeholder {
    color: var(--text-muted);
}

.answer-check-btn {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    transition: opacity 0.2s;
    white-space: nowrap;
}

.answer-check-btn:hover {
    opacity: 0.9;
}

.answer-check-btn:active {
    opacity: 0.8;
}

.exercise-feedback {
    font-size: 12px;
    padding: 6px 8px;
    border-radius: 3px;
    display: flex;
    gap: 6px;
    align-items: flex-start;
    margin-top: 4px;
}

.feedback-correct {
    background: #e8f5e9;
    color: #2e7d32;
    border-left: 3px solid #4caf50;
}

.feedback-incorrect {
    background: #ffebee;
    color: #c62828;
    border-left: 3px solid #f44336;
}

@media (prefers-color-scheme: dark) {
    .feedback-correct {
        background: color-mix(in srgb, #4caf50 15%, var(--panel-bg));
        color: #81c784;
    }

    .feedback-incorrect {
        background: color-mix(in srgb, #f44336 15%, var(--panel-bg));
        color: #e57373;
    }
}

/* Phase 3B: Hint controls with theme support */
.exercise-hints {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border-color);
}

.hint-reveal-btn {
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    color: var(--accent-color);
    padding: 4px 8px;
    border-radius: 2px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    transition: all 0.2s;
}

.hint-reveal-btn:hover:not(:disabled) {
    background: var(--surface-2);
    border-color: var(--accent-color);
}

.hint-reveal-btn:disabled {
    color: var(--text-muted);
    border-color: var(--border-color);
    cursor: not-allowed;
    opacity: 0.6;
}

.hints-container {
    margin-top: 6px;
    padding-left: 8px;
    border-left: 3px solid var(--accent-color);
}

.hint {
    margin: 4px 0;
    padding: 4px 6px;
    background: var(--surface-2);
    border-radius: 2px;
    font-size: 11px;
    line-height: 1.4;
    color: var(--text-color);
}

.hint-level {
    font-weight: 600;
    color: var(--accent-color);
    margin-right: 4px;
}

.hint-text {
    color: var(--text-color);
}

.practice-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
    font-size: 12px;
    gap: 8px;
}

.practice-pagination button {
    padding: 4px 10px;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    transition: opacity 0.2s;
}

.practice-pagination button:hover {
    opacity: 0.9;
}

.practice-pagination button:disabled {
    background: var(--border-color);
    color: var(--text-muted);
    cursor: not-allowed;
    opacity: 0.6;
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
    .worksheet-page {
        padding: 15px;
    }

    .practice-header {
        padding: 12px 10px;
    }

    .practice-meta {
        padding: 8px 10px;
    }

    .exercise {
        margin-bottom: 20px;
        padding-bottom: 15px;
    }

    .exercise-answer-space {
        min-height: 30px;
    }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
    .worksheet-page {
        background: #222;
        color: #fff;
    }

    .exercise-prompt {
        background: #333;
        color: #ddd;
    }

    .exercise {
        border-bottom-color: #444;
    }

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
