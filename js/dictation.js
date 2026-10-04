/* Speech recognition for Ask AI. Classic script; see ARCHITECTURE.md.
 * The field is a projection of committed text + current final/interim slots.
 * Only an ended engine may be replaced; callbacks belong to one generation.
 */
let recognition;
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
const micSecureOk = window.isSecureContext !== false;
const dictation = { wanted: false, finishing: false, phase: 'IDLE', timer: null, finishTimer: null,
    emptyEnds: 0, generation: 0, afterFinish: null, retiring: null,
    committedText: '', sessionFinalText: '', sessionInterimText: '', slots: [], ignoredSlots: 0,
    boundaryReplay: false, renderedText: '', rendering: false };
const dictationStatus = document.getElementById('dictation-status');
// Bounded, in-memory diagnostic trace; never persisted or sent to a service.
const sttTrace = [];
let sttSessionSeq = 0;
function traceStt(event, data) {
    sttTrace.push(Object.assign({ t: Math.round(performance.now()), event }, data || {}));
    if (sttTrace.length > 80) sttTrace.shift();
}
function updateDictationUI(interim = dictation.sessionInterimText) {
    els.micBtn.classList.toggle('recording', dictation.wanted);
    els.micBtn.textContent = dictation.wanted ? '■' : '🎤';
    els.micBtn.setAttribute('aria-pressed', String(dictation.wanted));
    els.micBtn.setAttribute('aria-label', t(dictation.wanted ? 'dictationStop' : 'dictationStart'));
    els.micBtn.title = t(dictation.wanted ? 'dictationStop' : 'dictationStart');
    dictationStatus.textContent = dictation.wanted ? (interim || t('dictationListening')) : '';
}
function joinDictationText(left, right) {
    return left + (left && right && !/\s$/.test(left) ? ' ' : '') + right;
}
function dictationSessionSuffix(text) {
    if (!dictation.boundaryReplay || !text) return text;
    // Only the boundary of an automatic restart is eligible. Never deduplicate
    // words inside an utterance or adjacent results in the same session.
    const normalize = token => token.normalize('NFKC').toLowerCase().replace(/^[\p{P}]+|[\p{P}]+$/gu, '');
    const before = dictation.committedText.trim().split(/\s+/).slice(-32).map(normalize);
    const after = Array.from(text.matchAll(/\S+/g));
    for (let n = Math.min(before.length, after.length, 32); n > 0; n--) {
        if (before.slice(-n).every((token, i) => token && token === normalize(after[i][0]))) {
            return text.slice(after[n - 1].index + after[n - 1][0].length).trimStart();
        }
    }
    return text;
}
function syncDictationEdit() {
    if (dictation.rendering || els.askInput.value === dictation.renderedText) return;
    // Treat an explicit field edit as the new baseline, retiring already shown
    // slots so replay cannot overwrite the edit. New result slots still append.
    dictation.committedText = els.askInput.value;
    dictation.ignoredSlots = dictation.slots.length;
    dictation.sessionFinalText = ''; dictation.sessionInterimText = '';
    dictation.boundaryReplay = false;
    dictation.renderedText = els.askInput.value;
}
function renderDictation() {
    const sessionText = joinDictationText(dictation.sessionFinalText, dictation.sessionInterimText);
    const value = joinDictationText(dictation.committedText, dictationSessionSuffix(sessionText));
    dictation.renderedText = value;
    if (els.askInput.value !== value) {
        dictation.rendering = true;
        els.askInput.value = value;
        els.askInput.dispatchEvent(new Event('input', { bubbles: true }));
        dictation.rendering = false;
    }
    updateDictationUI();
}
function commitDictationSession(preserveInterim = false) {
    syncDictationEdit();
    const text = joinDictationText(dictation.sessionFinalText, preserveInterim ? dictation.sessionInterimText : '');
    dictation.committedText = joinDictationText(dictation.committedText, dictationSessionSuffix(text));
    dictation.slots = []; dictation.ignoredSlots = 0;
    dictation.sessionFinalText = ''; dictation.sessionInterimText = '';
    renderDictation();
}
function settleDictationFinish() {
    const then = dictation.afterFinish;
    dictation.afterFinish = null;
    if (then) then();
}
function stopDictation(finish = false) {
    dictation.wanted = false;
    clearTimeout(dictation.timer); dictation.timer = null;
    if (finish && dictation.finishing) return;
    clearTimeout(dictation.finishTimer); dictation.finishTimer = null;
    if (finish && recognition) {
        dictation.finishing = true; dictation.phase = 'STOPPING';
        try {
            traceStt('stop');
            recognition.stop(); // Explicit Stop/Send only; ordinary results never stop the engine.
            if (recognition) dictation.finishTimer = setTimeout(() => stopDictation(), 2000);
            updateDictationUI(); return;
        } catch (e) { /* Abort a broken engine below; wait for its end before another start. */ }
    }
    // Explicit Stop/Send preserves the visible question even if finalization
    // times out. An unexpected automatic restart commits finals only.
    commitDictationSession(dictation.finishing || !!dictation.afterFinish);
    dictation.finishing = false; dictation.generation++;
    const old = recognition; recognition = null;
    if (old) {
        dictation.retiring = old; dictation.phase = 'STOPPING';
        traceStt('abort'); try { old.abort(); } catch (e) {}
    } else if (!dictation.retiring) dictation.phase = 'IDLE';
    settleDictationFinish(); updateDictationUI();
}
function dictationBusy() { return dictation.wanted || dictation.finishing; }
function finishDictationThen(then) {
    if (dictation.afterFinish) return;
    dictation.afterFinish = then;
    traceStt('finish-then-send');
    if (dictation.wanted) stopDictation(true);
    if (!dictation.finishing) settleDictationFinish();
}
function scheduleDictationRestart(delay) {
    if (!dictation.wanted || recognition || dictation.retiring || dictation.timer !== null) return;
    dictation.phase = 'RESTART_PENDING';
    dictation.timer = setTimeout(() => {
        dictation.timer = null; dictation.phase = 'IDLE'; startDictationSession();
    }, delay);
}
function startDictationSession() {
    if (!dictation.wanted || document.hidden || !SpeechRecognitionCtor || !micSecureOk
        || recognition || dictation.retiring || dictation.timer !== null || dictation.phase !== 'IDLE') return;
    const generation = ++dictation.generation;
    const session = new SpeechRecognitionCtor(); recognition = session;
    const id = ++sttSessionSeq;
    dictation.phase = 'STARTING';
    const current = () => generation === dictation.generation && recognition === session
        && (dictation.wanted || dictation.finishing) && !document.hidden;
    session.lang = els.micLang.value; session.continuous = true; session.interimResults = true;
    let hadFinal = false;
    session.onstart = () => { if (current() && dictation.phase === 'STARTING') dictation.phase = 'LISTENING'; };
    session.onresult = e => {
        traceStt('result', { session: id, stale: !current(), resultIndex: e.resultIndex,
            results: Array.from(e.results, (r, i) => ({ i, final: r.isFinal, text: r[0]?.transcript })) });
        if (!current()) return;
        syncDictationEdit();
        // results is a session snapshot, NOT a new chunk to append. Preserve
        // unchanged slots before resultIndex and remove withdrawn interim slots.
        dictation.slots.length = e.results.length;
        for (let i = 0; i < e.results.length; i++) {
            if (i < e.resultIndex && dictation.slots[i]) continue;
            const result = e.results[i];
            dictation.slots[i] = { text: result[0]?.transcript?.trim() || '', final: !!result.isFinal };
        }
        const active = dictation.slots.slice(dictation.ignoredSlots);
        dictation.sessionFinalText = active.filter(r => r.final).map(r => r.text).filter(Boolean).join(' ');
        dictation.sessionInterimText = active.filter(r => !r.final).map(r => r.text).filter(Boolean).join(' ');
        if (dictation.sessionFinalText) hadFinal = true;
        traceStt('commit', { session: id, text: dictation.sessionFinalText });
        renderDictation();
    };
    session.onerror = e => {
        traceStt('error', { session: id, error: e.error, stale: !current() });
        if (!current()) return;
        if (e.error === 'no-speech') return; // onend alone owns restart scheduling.
        const messages = { 'not-allowed': t('micDenied'), 'service-not-allowed': t('micDenied'),
            'audio-capture': t('micNotFound'), 'network': t('micNetwork') };
        stopDictation();
        if (e.error !== 'aborted') showToast(messages[e.error] || t('dictationStopped'));
    };
    session.onend = () => {
        traceStt('end', { session: id, stale: !current() });
        if (dictation.retiring === session) {
            dictation.retiring = null; dictation.phase = 'IDLE';
            if (dictation.wanted) scheduleDictationRestart(0);
            return;
        }
        if (!current()) return;
        const before = dictation.committedText;
        commitDictationSession(dictation.finishing);
        const progressed = hadFinal && dictation.committedText !== before;
        recognition = null; dictation.generation++; dictation.phase = 'IDLE';
        if (!dictation.wanted) {
            dictation.finishing = false; clearTimeout(dictation.finishTimer); dictation.finishTimer = null;
            settleDictationFinish(); updateDictationUI(); return;
        }
        // Empty or replay-only cycles are bounded too, so duplicate finals cannot
        // keep a broken engine in an endless immediate restart/beep loop.
        dictation.emptyEnds = progressed ? 0 : dictation.emptyEnds + 1;
        if (dictation.emptyEnds > 3) { stopDictation(); showToast(t('dictationStopped')); return; }
        dictation.boundaryReplay = true;
        scheduleDictationRestart(progressed ? 0 : Math.min(3000, 600 * 2 ** (dictation.emptyEnds - 1)));
    };
    try { session.start(); traceStt('start', { session: id, continuous: session.continuous, lang: session.lang }); updateDictationUI(); }
    catch (e) {
        recognition = null; dictation.phase = 'IDLE';
        stopDictation(); showToast(t('dictationStopped'));
    }
}
function toggleDictation(e) {
    traceStt('toggle', { via: e ? e.type + (e.pointerType ? ':' + e.pointerType : '') : 'call', wanted: dictation.wanted, finishing: dictation.finishing });
    if (dictation.wanted) { stopDictation(true); return; }
    if (!SpeechRecognitionCtor || !micSecureOk || document.hidden) return;
    // A quick second tap queues intent; it cannot overlap a stopping engine.
    if (dictation.finishing) stopDictation();
    dictation.committedText = els.askInput.value; dictation.renderedText = els.askInput.value;
    dictation.boundaryReplay = false;
    dictation.wanted = true; dictation.emptyEnds = 0;
    startDictationSession(); updateDictationUI();
}
if (!SpeechRecognitionCtor || !micSecureOk) els.micBtn.style.display = 'none';
els.askInput.addEventListener('input', () => { if (dictationBusy()) syncDictationEdit(); });
els.micLang.addEventListener('change', () => stopDictation());
new MutationObserver(() => {
    if (!els.askPanel.classList.contains('expanded') && (dictation.wanted || dictation.finishing)) stopDictation();
}).observe(els.askPanel, { attributes: true, attributeFilter: ['class'] });
