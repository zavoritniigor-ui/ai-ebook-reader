/* practice-worksheet.js — Worksheet rendering and Practice Studio UI.
 * Displays worksheets safely without executing AI-generated HTML.
 */

// Create or get practice panel
function getPracticePanel() {
    let panel = document.getElementById('practice-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'practice-panel';
        panel.className = 'side-panel';
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
    return panel;
}

// Show practice panel with worksheet
function displayPracticeSession(session) {
    const panel = getPracticePanel();

    if (session.status === 'generating') {
        displayPracticeGenerating(panel, session);
    } else if (session.status === 'ready' && session.worksheet) {
        displayPracticeReady(panel, session);
    } else if (session.status === 'error') {
        displayPracticeError(panel, session);
    }

    panel.hidden = false;
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
    hintButtons.forEach(btn => {
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

    // Find first hidden hint
    for (let i = 0; i < hints.length; i++) {
        if (hints[i].style.display === 'none') {
            // Reveal this hint
            hints[i].style.display = 'block';

            // Update button text when all hints shown
            if (i === hints.length - 1) {
                button.textContent = `✓ ${t('hint')}`;
                button.disabled = true;
            }
            return;
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
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    padding: 0;
    background: var(--background-color);
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
