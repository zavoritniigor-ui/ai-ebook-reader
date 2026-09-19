/* grammar-adjectives-ui.js — Wires French adjective analysis into the
 * Grammar/Learning panel. Deliberately kept separate from grammar-svo.js
 * (existing, tested AI-driven flows) to avoid unrelated refactors — this is
 * a self-contained new feature bolted onto the existing panel.
 *
 * Deterministic analysis runs immediately (no AI call, no network). Rows
 * that remain ambiguous after the deterministic pass show a per-row
 * "Уточнити" (resolve) button that triggers the AI fallback for ONLY that
 * unit, using the existing task-cancellation / callAI infrastructure.
 */

let lastAdjectiveAnalysis = null;

function runAdjectiveAnalysis() {
    const sourceText = (typeof grammarContext !== 'undefined' && grammarContext.sentence) || state.lastGrammarSentence || '';
    if (!sourceText) {
        alert('Немає виділеного французького тексту для аналізу.');
        return;
    }

    const analysis = analyzeFrenchAdjectives(sourceText);
    lastAdjectiveAnalysis = analysis;

    const content = document.getElementById('grammar-content');
    const box = document.createElement('div');
    box.className = 'adj-analysis-box adj-focus';
    content.querySelectorAll('.adj-focus').forEach(n => n.remove());
    content.prepend(box);
    content.scrollTop = 0;

    renderAdjectiveAnalysisUI(analysis, box);
    wireAdjectiveResolveButtons(box, analysis, sourceText);
}

function wireAdjectiveResolveButtons(container, analysis, sourceText) {
    container.querySelectorAll('.adj-row').forEach(row => {
        const unitId = row.dataset.id;
        const unit = analysis.units.find(u => u.id === unitId);
        if (!unit) return;
        if (unit.confidence === 'confirmed' || unit.confidence === 'high_confidence' || unit.confidence === 'ai_assisted') return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'adj-resolve-btn';
        btn.textContent = 'Уточнити через AI';
        btn.onclick = () => resolveAdjectiveViaAI(unit, sourceText, row, analysis);
        row.appendChild(btn);
    });
}

async function resolveAdjectiveViaAI(unit, sourceText, rowEl, analysis) {
    if (typeof aiAvailable === 'function' && !aiAvailable()) {
        alert(t ? t('needKey') : 'AI key required');
        return;
    }
    const task = beginAsyncTask('adjectiveResolve');
    const btn = rowEl.querySelector('.adj-resolve-btn');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    try {
        const prompt = buildAdjectiveAIFallbackPrompt(unit, sourceText);
        const answer = await callAI(prompt, task.signal, 'grammar');
        if (!task.current()) return;

        const applied = applyAdjectiveAIFallback(unit, answer, sourceText);
        if (applied) {
            rowEl.outerHTML = renderSingleAdjectiveRow(unit);
        } else if (btn) {
            btn.disabled = false;
            btn.textContent = 'Не вдалося — спробувати ще раз';
        }
    } catch (e) {
        if (!task.current()) return;
        if (btn) { btn.disabled = false; btn.textContent = 'Помилка — спробувати ще раз'; }
    }
}

// Re-render just one row after AI resolution (avoids re-running the whole analysis)
function renderSingleAdjectiveRow(u) {
    const tmp = document.createElement('div');
    const fakeAnalysis = { sourceText: '', units: [u] };
    renderAdjectiveAnalysisUI(fakeAnalysis, tmp);
    // renderAdjectiveAnalysisUI also renders a sentence div; strip it, keep only the row
    const row = tmp.querySelector('.adj-row');
    return row ? row.outerHTML : '';
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('adjective-analysis-btn');
    if (btn) btn.onclick = runAdjectiveAnalysis;
});
// In case this script runs after DOMContentLoaded already fired (defer/classic script timing)
if (document.readyState !== 'loading') {
    const btn = document.getElementById('adjective-analysis-btn');
    if (btn) btn.onclick = runAdjectiveAnalysis;
}
