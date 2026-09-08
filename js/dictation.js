/* dictation.js — розпізнавання мовлення для панелі "Запитай AI":
 * updateDictationUI малює стан мікрофона (запис/іконка/aria), stopDictation
 * фіналізує накопичений розпізнаний текст рівно один раз (interim-текст живе
 * ОКРЕМО від поля вводу, тому паузи/ручне редагування/перезапуски розпізнавання
 * ніколи його не стирають), startDictationSession запускає SpeechRecognition і
 * керує авто-перезапуском (з обмеженням на порожні цикли), toggleDictation —
 * кнопка мікрофона.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/ai-client.js (SpeechRecognitionCtor/dictation-стан і всі функції —
 * самодостатній кластер, нічого іншого в цьому блоці не було).
 */

// Dictation commits each final result once. Interim speech lives outside the
// editable field, so pauses, manual edits and recognition restarts cannot erase it.
let recognition;
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
const micSecureOk = window.isSecureContext !== false;
const dictation = { wanted: false, finishing: false, timer: null, finishTimer: null, emptyEnds: 0, generation: 0 };
const dictationStatus = document.getElementById('dictation-status');
function updateDictationUI(interim = '') {
    els.micBtn.classList.toggle('recording', dictation.wanted);
    els.micBtn.textContent = dictation.wanted ? '■' : '🎤';
    els.micBtn.setAttribute('aria-pressed', String(dictation.wanted));
    els.micBtn.setAttribute('aria-label', t(dictation.wanted ? 'dictationStop' : 'dictationStart'));
    els.micBtn.title = t(dictation.wanted ? 'dictationStop' : 'dictationStart');
    dictationStatus.textContent = dictation.wanted ? (interim || t('dictationListening')) : '';
}
function stopDictation(finish = false) {
    dictation.wanted = false;
    clearTimeout(dictation.timer); dictation.timer = null;
    clearTimeout(dictation.finishTimer);
    if (finish && recognition) {
        dictation.finishing = true;
        try {
            recognition.stop(); // Let the engine finalize the last spoken fragment.
            if (recognition) dictation.finishTimer = setTimeout(() => stopDictation(), 2000);
            updateDictationUI(); return;
        } catch (e) { /* A stopped/broken engine is aborted below. */ }
    }
    dictation.finishing = false; dictation.generation++;
    clearTimeout(dictation.timer); dictation.timer = null;
    const old = recognition; recognition = null;
    if (old) { try { old.abort(); } catch (e) {} }
    updateDictationUI();
}
function startDictationSession() {
    if (!dictation.wanted || document.hidden || !SpeechRecognitionCtor || !micSecureOk) return;
    const generation = ++dictation.generation;
    const session = new SpeechRecognitionCtor(); recognition = session;
    const current = () => generation === dictation.generation && recognition === session && (dictation.wanted || dictation.finishing) && !document.hidden;
    session.lang = els.micLang.value; session.continuous = true; session.interimResults = true;
    const committed = new Set(); let hadFinal = false;
    session.onresult = e => {
        if (!current()) return;
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const result = e.results[i], text = result[0]?.transcript?.trim();
            if (!text) continue;
            if (result.isFinal) {
                if (committed.has(i)) continue;
                committed.add(i); hadFinal = true; dictation.emptyEnds = 0;
                // Always use the live value, including any edits since the last event.
                const value = els.askInput.value;
                els.askInput.value = value + (value && !/\s$/.test(value) ? ' ' : '') + text;
                els.askInput.dispatchEvent(new Event('input', { bubbles: true }));
            } else interim += (interim ? ' ' : '') + text;
        }
        updateDictationUI(interim);
    };
    session.onerror = e => {
        if (!current()) return;
        if (e.error === 'no-speech') return; // Normal silence; onend owns the bounded restart.
        const messages = { 'not-allowed': t('micDenied'), 'service-not-allowed': t('micDenied'),
            'audio-capture': t('micNotFound'), 'network': t('micNetwork') };
        stopDictation();
        if (e.error !== 'aborted') showToast(messages[e.error] || t('dictationStopped'));
    };
    session.onend = () => {
        if (!current()) return;
        recognition = null;
        if (!dictation.wanted) { dictation.finishing = false; clearTimeout(dictation.finishTimer); updateDictationUI(); return; }
        dictation.emptyEnds = hadFinal ? 0 : dictation.emptyEnds + 1;
        // Broken engines must not produce an endless permission/start loop.
        if (dictation.emptyEnds > 3) { stopDictation(); showToast(t('dictationStopped')); return; }
        const delay = Math.min(3000, 600 * 2 ** dictation.emptyEnds);
        dictation.timer = setTimeout(() => { dictation.timer = null; startDictationSession(); }, delay);
    };
    try { session.start(); updateDictationUI(); }
    catch (e) { stopDictation(); showToast(t('dictationStopped')); }
}
function toggleDictation() {
    if (dictation.wanted) { stopDictation(true); return; }
    if (!SpeechRecognitionCtor || !micSecureOk || document.hidden) return;
    if (dictation.finishing) stopDictation();
    dictation.wanted = true; dictation.emptyEnds = 0; startDictationSession();
}
if (!SpeechRecognitionCtor || !micSecureOk) els.micBtn.style.display = 'none';
els.micLang.addEventListener('change', () => stopDictation());
// Covers the close button, panel switching and Android Back alike.
new MutationObserver(() => {
    if (!els.askPanel.classList.contains('expanded') && (dictation.wanted || dictation.finishing)) stopDictation();
}).observe(els.askPanel, { attributes: true, attributeFilter: ['class'] });
