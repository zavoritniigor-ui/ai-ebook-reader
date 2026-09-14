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

// Get exercises per page (responsive)
function getExercisesPerPage() {
    // Mobile: 5 per page
    // Tablet+: 12-15 per page
    return window.innerWidth < 768 ? 5 : 12;
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

// Render single exercise
function renderExercise(exercise, number) {
    const typeIcon = getExerciseTypeIcon(exercise.type);
    const difficulty = '●'.repeat(exercise.difficulty) + '○'.repeat(5 - exercise.difficulty);
    const hasHints = exercise.hints && exercise.hints.length > 0;

    let html = `
        <div class="exercise" data-id="${escapeHtml(exercise.id)}">
            <div class="exercise-number">${number}. ${typeIcon}</div>
            <div class="exercise-instruction">${escapeHtml(exercise.instruction)}</div>
            <div class="exercise-prompt">${escapeHtml(exercise.prompt)}</div>
            <div class="exercise-answer-space"></div>
            <div class="exercise-meta">
                <span class="exercise-difficulty" title="Difficulty">${difficulty}</span>
                <span class="exercise-concept">${escapeHtml(exercise.expectedConcept)}</span>
            </div>
    `;

    // Phase 3B: Progressive hints
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

    html += `
        </div>
    `;

    return html;
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
    position: absolute; height: 112px; min-height: 44px;
    flex-direction: column; gap: 8px; padding: 10px 0;
    background: color-mix(in srgb, var(--panel-bg) 90%, #6383e8);
    color: var(--text-color); border: 1px solid color-mix(in srgb, var(--border-color) 75%, #6383e8);
    border-right: 3px solid #6383e8; border-radius: 8px 0 0 8px;
    box-shadow: -3px 2px 8px #0001; font-size: 12px;
}
#practice-restore[data-mode="bookmark"] span { writing-mode: vertical-rl; }
#practice-restore[data-mode="bookmark"]:hover { background: color-mix(in srgb, var(--panel-bg) 80%, #6383e8); }
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
    padding: 10px 15px;
    background: var(--background-color-alt);
    font-size: 13px;
    flex-shrink: 0;
}

.meta-row {
    display: flex;
    gap: 8px;
    margin: 4px 0;
}

.meta-label {
    font-weight: bold;
    min-width: 70px;
}

.meta-value {
    color: var(--text-color-secondary);
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
    padding: 15px;
}

.worksheet-page {
    background: white;
    padding: 20px;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.worksheet-title {
    font-size: 18px;
    font-weight: bold;
    margin: 0 0 20px 0;
    color: var(--text-color);
}

.exercise {
    margin-bottom: 25px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.exercise:last-child {
    border-bottom: none;
}

.exercise-number {
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 5px;
}

.exercise-instruction {
    font-size: 13px;
    color: #666;
    margin-bottom: 8px;
}

.exercise-prompt {
    font-size: 14px;
    margin-bottom: 15px;
    padding: 8px;
    background: #f5f5f5;
    border-radius: 3px;
    font-family: monospace;
}

.exercise-answer-space {
    min-height: 40px;
    border-bottom: 2px solid #333;
    margin: 15px 0;
}

.exercise-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #999;
}

.exercise-difficulty {
    font-size: 12px;
    letter-spacing: 1px;
}

.exercise-concept {
    color: #666;
    font-style: italic;
}

/* Phase 3B: Hint controls */
.exercise-hints {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
}

.hint-reveal-btn {
    background: none;
    border: 1px solid #ddd;
    color: #0066cc;
    padding: 6px 12px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s;
}

.hint-reveal-btn:hover:not(:disabled) {
    background: #f0f7ff;
    border-color: #0066cc;
}

.hint-reveal-btn:disabled {
    color: #999;
    border-color: #ddd;
    cursor: not-allowed;
}

.hints-container {
    margin-top: 8px;
    padding-left: 12px;
    border-left: 3px solid #ffc107;
}

.hint {
    margin: 6px 0;
    padding: 6px 8px;
    background: #fffbf0;
    border-radius: 3px;
    font-size: 12px;
    line-height: 1.4;
}

.hint-level {
    font-weight: bold;
    color: #ff8c00;
    margin-right: 4px;
}

.hint-text {
    color: #333;
}

@media (prefers-color-scheme: dark) {
    .hint {
        background: #3d2a00;
        color: #ffd700;
    }
    .hint-text {
        color: #ffd700;
    }
    .hint-reveal-btn {
        border-color: #444;
        color: #4da6ff;
    }
    .hint-reveal-btn:hover:not(:disabled) {
        background: #0d1b33;
        border-color: #4da6ff;
    }
}

.practice-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
    font-size: 13px;
}

.practice-pagination button {
    padding: 6px 12px;
    background: #007AFF;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
}

.practice-pagination button:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.practice-actions {
    display: flex;
    gap: 8px;
    padding: 15px;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
    flex-wrap: wrap;
}

.practice-actions button {
    flex: 1;
    min-width: 100px;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
}

.btn-primary {
    background: #007AFF;
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: #0051cc;
}

.btn-secondary {
    background: #f0f0f0;
    color: #333;
    border: 1px solid #ddd;
}

.btn-secondary:hover {
    background: #e0e0e0;
}

.btn-primary:disabled {
    background: #ccc;
    color: #999;
    cursor: not-allowed;
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
