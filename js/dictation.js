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
const dictation = { wanted: false, finishing: false, timer: null, finishTimer: null, emptyEnds: 0, generation: 0,
    pendingInterim: '', afterFinish: null };
const dictationStatus = document.getElementById('dictation-status');
// Android (and iOS/iPadOS) recognizers are single-utterance engines; their emulated `continuous` mode re-emits a
// final result at the NEXT result index (results[0] "one" final, then results[1] "one" final), which the per-index
// commit below appended twice ("one" -> "one one"). There each session asks for ONE utterance -- so one utterance
// yields one final result -- and the restart loop in onend keeps dictation going. Desktop keeps continuous mode.
const dictationSingleUtterance = /Android|iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// Lifecycle trace for on-device diagnosis (`sttTrace` in the console): tells apart a duplicate emitted by the
// browser (two results/indices), one result committed twice by the app, two live sessions, or one tap starting
// twice. Holds recognized text only while the page is open; never keys or prompts.
const sttTrace = [];
let sttSessionSeq = 0;
function traceStt(event, data) {
    sttTrace.push(Object.assign({ t: Math.round(performance.now()), event }, data || {}));
    if (sttTrace.length > 400) sttTrace.shift();   // a few minutes of dictation (interim results are frequent)
}
// Restart-boundary replay (Android): every utterance is its own session and the next session starts at once, but the
// recognizer can hand the tail of the PREVIOUS utterance back as the start of the new one ("пошукай в інтернеті" ->
// "в інтернеті яка погода"), or the whole phrase again. Decided on a session's FIRST final, shortly after the previous
// session ended: the longest exact overlap (>= 2 words, <= 32) between what earlier sessions typed and the start of the
// new result is dropped -- from that final and from the session's later (cumulative) finals alike; a whole repeated
// phrase of 2+ words too. A single repeated word across utterances ("ні" … "ні") is kept: it is ordinary speech, and
// repetition INSIDE one utterance ("дуже дуже добре") never reaches this check.
const DICTATION_REPLAY_WINDOW_MS = 2500, DICTATION_REPLAY_MAX_WORDS = 32;
const dictationBoundary = { heard: '', endedAt: 0 };
const dictationNorm = s => s.toLocaleLowerCase().replace(/[\s.,!?;:…"'«»-]+/g, ' ').trim();
function dictationWords(text) { return text.split(/\s+/).filter(Boolean).map(w => ({ w, n: dictationNorm(w) })).filter(x => x.n); }
// How many leading words of `text` replay the end of `base` (0 = none).
function dictationReplayWords(base, text) {
    const prev = dictationWords(base).slice(-DICTATION_REPLAY_MAX_WORDS), next = dictationWords(text);
    for (let k = Math.min(prev.length, next.length); k >= 1; k--) {
        let same = true;
        for (let j = 0; j < k && same; j++) same = prev[prev.length - k + j].n === next[j].n;
        if (same) return k >= 2 ? k : 0;   // one shared word ("ні" … "ні") is ordinary speech, not a replay
    }
    return 0;
}
function dictationDropWords(base, text, k) {
    const next = dictationWords(text), prev = dictationWords(base).slice(-k);
    if (next.length < k || prev.length < k || next.slice(0, k).some((x, j) => x.n !== prev[j].n)) return text;
    return next.slice(k).map(x => x.w).join(' ');
}
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
            traceStt('stop');
            recognition.stop(); // Let the engine finalize the last spoken fragment.
            if (recognition) dictation.finishTimer = setTimeout(() => stopDictation(), 2000);
            updateDictationUI(); return;
        } catch (e) { /* A stopped/broken engine is aborted below. */ }
    }
    dictation.finishing = false; dictation.generation++;
    clearTimeout(dictation.timer); dictation.timer = null;
    const old = recognition; recognition = null;
    if (old) { traceStt('abort'); try { old.abort(); } catch (e) {} }
    settleDictationFinish();
    updateDictationUI();
}
// Send while dictating (audit A11): the words being spoken are still INTERIM -- shown in the status, not yet in the
// field -- and abort() throws them away. Finish recognition the way the Stop button does (stop -> the engine
// finalizes the pending words -> end, bounded by the finish timeout above), THEN run `then` once. Words the engine
// never finalized in time are committed as heard; anything arriving later is stale (generation) and ignored.
function dictationBusy() { return !!recognition && (dictation.wanted || dictation.finishing); }
function finishDictationThen(then) {
    if (dictation.afterFinish) return;               // a send is already waiting for this finish: one send only
    dictation.afterFinish = then;
    traceStt('finish-then-send');
    if (dictation.wanted) stopDictation(true);
    if (!dictation.finishing) settleDictationFinish();   // nothing left to finish (no live session)
}
function settleDictationFinish() {
    const then = dictation.afterFinish, heard = dictation.pendingInterim;
    dictation.afterFinish = null; dictation.pendingInterim = '';
    if (!then) return;
    if (heard) {
        traceStt('commit-pending', { text: heard });
        const value = els.askInput.value;
        els.askInput.value = value + (value && !/\s$/.test(value) ? ' ' : '') + heard;
        els.askInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    then();
}
function startDictationSession() {
    if (!dictation.wanted || document.hidden || !SpeechRecognitionCtor || !micSecureOk) return;
    const generation = ++dictation.generation;
    const session = new SpeechRecognitionCtor(); recognition = session;
    const id = ++sttSessionSeq;
    dictation.pendingInterim = '';
    const current = () => generation === dictation.generation && recognition === session && (dictation.wanted || dictation.finishing) && !document.hidden;
    session.lang = els.micLang.value; session.continuous = !dictationSingleUtterance; session.interimResults = true;
    const committed = new Set(); let hadFinal = false;
    let dictationSessionHeard = '';
    // Single-utterance sessions: the engine can still emit a SECOND final in the same session whose text repeats or
    // extends the first (cumulative "пошукай" -> "пошукай в інтернеті"). One session = one utterance, so such a
    // result REPLACES what this session already typed instead of being appended. Desktop (continuous) sessions
    // legitimately produce separate finals, so this only applies to dictationSingleUtterance.
    let sessionTyped = null;   // { heard, inserted }
    // What EARLIER sessions of this dictation typed, frozen for this session (see dictationReplayWords above).
    // The time check happens when the FIRST final arrives (the session itself starts immediately after the previous one).
    const replayBase = dictationBoundary.heard, replayEndedAt = dictationBoundary.endedAt;
    let replayK = null;
    const cmp = s => s.toLocaleLowerCase().replace(/[\s.,!?;:…"'«»-]+/g, ' ').trim();
    session.onresult = e => {
        traceStt('result', { session: id, stale: !current(), resultIndex: e.resultIndex,
            results: Array.from(e.results, (r, i) => ({ i, final: r.isFinal, text: r[0]?.transcript })) });
        if (!current()) return;
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const result = e.results[i];
            let text = result[0]?.transcript?.trim();
            if (!text) continue;
            if (result.isFinal && dictationSingleUtterance && replayBase) {
                if (replayK === null) replayK = performance.now() - replayEndedAt <= DICTATION_REPLAY_WINDOW_MS ? dictationReplayWords(replayBase, text) : 0;
                if (replayK) {
                    const fresh = dictationDropWords(replayBase, text, replayK);
                    if (fresh !== text) traceStt('skip-boundary-replay', { session: id, i, text, kept: fresh });
                    text = fresh;
                    if (!text) { committed.add(i); hadFinal = true; dictation.emptyEnds = 0; continue; }
                }
            }
            if (result.isFinal) {
                if (committed.has(i)) continue;
                committed.add(i); hadFinal = true; dictation.emptyEnds = 0;
                traceStt('commit', { session: id, i, text });
                // Always use the live value, including any edits since the last event.
                let value = els.askInput.value, add = text;
                if (dictationSingleUtterance && sessionTyped) {
                    const prev = cmp(sessionTyped.heard), next = cmp(text);
                    if (next === prev) { traceStt('skip-repeat', { session: id, i, text }); continue; }
                    if (prev && next.startsWith(prev + ' ')) {
                        // Cumulative result: drop our earlier insertion if the field still ends with it.
                        if (value.endsWith(sessionTyped.inserted)) value = value.slice(0, value.length - sessionTyped.inserted.length).replace(/\s+$/, '');
                        else add = text.split(/\s+/).slice(sessionTyped.heard.trim().split(/\s+/).length).join(' ');
                        traceStt('replace-cumulative', { session: id, i, text });
                    }
                }
                if (!add) continue;
                const inserted = (value && !/\s$/.test(value) ? ' ' : '') + add;
                els.askInput.value = value + inserted;
                sessionTyped = { heard: text, inserted };
                dictationSessionHeard = text;
                traceStt('field', { session: id, tail: els.askInput.value.slice(-160) });   // what the reader now sees
                els.askInput.dispatchEvent(new Event('input', { bubbles: true }));
            } else interim += (interim ? ' ' : '') + text;
        }
        dictation.pendingInterim = interim;
        updateDictationUI(interim);
    };
    session.onerror = e => {
        traceStt('error', { session: id, error: e.error, stale: !current() });
        if (!current()) return;
        if (e.error === 'no-speech') return; // Normal silence; onend owns the bounded restart.
        const messages = { 'not-allowed': t('micDenied'), 'service-not-allowed': t('micDenied'),
            'audio-capture': t('micNotFound'), 'network': t('micNetwork') };
        stopDictation();
        if (e.error !== 'aborted') showToast(messages[e.error] || t('dictationStopped'));
    };
    session.onend = () => {
        traceStt('end', { session: id, stale: !current() });
        if (!current()) return;
        recognition = null;
        if (dictationSessionHeard) dictationBoundary.heard = (dictationBoundary.heard + ' ' + dictationSessionHeard).trim().split(/\s+/).slice(-DICTATION_REPLAY_MAX_WORDS).join(' ');
        if (hadFinal) dictationBoundary.endedAt = performance.now();
        if (!dictation.wanted) { dictation.finishing = false; clearTimeout(dictation.finishTimer); settleDictationFinish(); updateDictationUI(); return; }
        dictation.emptyEnds = hadFinal ? 0 : dictation.emptyEnds + 1;
        // Broken engines must not produce an endless permission/start loop.
        if (dictation.emptyEnds > 3) { stopDictation(); showToast(t('dictationStopped')); return; }
        // A session that ended WITH a final result is an ORDINARY utterance boundary: every session is
        // single-utterance on Android/iOS (dictationSingleUtterance above), so this restart happens after
        // EVERY spoken clause during normal continuous dictation, not just on a broken engine. Restarting
        // at once -- instead of making the speaker wait out the same backoff a silent/broken engine needs --
        // avoids losing the next words to an artificial gap where nothing is listening; a real multi-clause
        // sentence has pauses well under the old flat 600ms, which is exactly what this used to eat. The
        // escalating backoff (previously applied even here, at emptyEnds already reset to 0) still protects
        // a genuinely empty/failing engine, now counted from its OWN first empty ending.
        const delay = dictation.emptyEnds === 0 ? 0 : Math.min(3000, 600 * 2 ** (dictation.emptyEnds - 1));
        dictation.timer = setTimeout(() => { dictation.timer = null; startDictationSession(); }, delay);
    };
    try { session.start(); traceStt('start', { session: id, continuous: session.continuous, lang: session.lang }); updateDictationUI(); }
    catch (e) { stopDictation(); showToast(t('dictationStopped')); }
}
function toggleDictation(e) {
    traceStt('toggle', { via: e ? e.type + (e.pointerType ? ':' + e.pointerType : '') : 'call', wanted: dictation.wanted, finishing: dictation.finishing });
    if (dictation.wanted) { stopDictation(true); return; }
    if (!SpeechRecognitionCtor || !micSecureOk || document.hidden) return;
    if (dictation.finishing) stopDictation();
    dictation.wanted = true; dictation.emptyEnds = 0;
    dictationBoundary.heard = ''; dictationBoundary.endedAt = 0;   // a new dictation never trims against an old one
    startDictationSession();
}
if (!SpeechRecognitionCtor || !micSecureOk) els.micBtn.style.display = 'none';
els.micLang.addEventListener('change', () => stopDictation());
// Covers the close button, panel switching and Android Back alike.
new MutationObserver(() => {
    if (!els.askPanel.classList.contains('expanded') && (dictation.wanted || dictation.finishing)) stopDictation();
}).observe(els.askPanel, { attributes: true, attributeFilter: ['class'] });


// ========== 🩺 ДІАГНОСТИКА ЗВУКУ Й МІКРОФОНА (Налаштування) ==========
// Web Speech never shows its audio or results to anyone but the page, so a problem on the reader's own device
// (silence, doubled dictated words) can only be seen through these traces. The reader reproduces the problem, presses
// «Скопіювати діагностику» and pastes the text to the developer. Holds no AI keys and no prompts -- only what the
// recognizer heard, the engine events, voices and settings.
function buildDiagnosticsReport() {
    const synth = typeof ttsSynth !== 'undefined' && ttsSynth ? ttsSynth : null;
    const shell = document.querySelector('script[src*="js/core.js"]')?.getAttribute('src')?.split('v=')[1] || '';
    const report = {
        when: new Date().toISOString(), app: 'core.js v=' + shell, userAgent: navigator.userAgent, online: navigator.onLine,
        standalone: window.matchMedia('(display-mode: standalone)').matches, visible: document.visibilityState,
        languages: { menu: state.uiLang, translation: state.targetLang, microphone: els.micLang?.value, system: navigator.languages },
        speech: {
            engine: synth ? { speaking: synth.speaking, pending: synth.pending, paused: synth.paused } : 'none',
            voices: typeof voices !== 'undefined' ? voices.length : 0,
            voiceList: (typeof voices !== 'undefined' ? voices : []).slice(0, 80).map(v => [v.lang, v.name, v.localService ? 'local' : 'net', v.default ? 'default' : ''].join(' | ')),
            chosenVoices: state.selectedVoiceURIByLang, speakSide: state.speakSide, readingAloud: typeof isSpeakingGlobal !== 'undefined' ? isSpeakingGlobal : null,
            trace: typeof ttsTrace !== 'undefined' ? ttsTrace : []
        },
        dictation: {
            supported: !!SpeechRecognitionCtor, secure: micSecureOk, singleUtterancePerSession: dictationSingleUtterance,
            wanted: dictation.wanted, finishing: dictation.finishing, trace: sttTrace
        }
    };
    return JSON.stringify(report, null, 1);
}
function buildDiagnosticsBox() {
    const content = document.querySelector('#settings-modal .modal-content');
    if (!content || document.getElementById('diag-box')) return;
    const box = document.createElement('section'); box.id = 'diag-box'; box.className = 'sync-box';
    const h = document.createElement('h3'); h.dataset.i18n = 'diagTitle';
    const hint = document.createElement('p'); hint.className = 'key-hint'; hint.dataset.i18n = 'diagHint';
    const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'diag-copy'; btn.className = 'btn-secondary'; btn.dataset.i18n = 'diagCopy';
    const status = document.createElement('p'); status.id = 'diag-status'; status.setAttribute('role', 'status');
    const area = document.createElement('textarea'); area.id = 'diag-text'; area.readOnly = true; area.rows = 6; area.hidden = true;
    area.style.cssText = 'width:100%;font-size:11px;margin-top:8px;';
    btn.addEventListener('click', async () => {
        const text = buildDiagnosticsReport();
        area.value = text;
        try { await navigator.clipboard.writeText(text); status.textContent = t('diagCopied'); area.hidden = true; }
        catch (e) {   // clipboard refused: the text is shown, selected, for a manual copy
            status.textContent = t('diagCopyManual'); area.hidden = false; area.focus(); area.select();
        }
    });
    box.append(h, hint, btn, status, area);
    content.append(box);
    applyI18n();
}
window.addEventListener('load', buildDiagnosticsBox, { once: true });
Object.assign(I18N, {
    diagTitle: { uk: '🩺 Діагностика звуку й мікрофона', en: '🩺 Sound and microphone diagnostics', fr: '🩺 Diagnostic du son et du micro', ru: '🩺 Диагностика звука и микрофона', zh: '🩺 声音和麦克风诊断', ko: '🩺 소리 및 마이크 진단', hi: '🩺 आवाज़ और माइक्रोफ़ोन जाँच', ga: '🩺 Diagnóisic fuaime agus micreafóin' },
    diagHint: { uk: 'Якщо пропав звук або диктування дублює слова: спершу повторіть проблему, потім натисніть кнопку й вставте текст у чат розробнику. Ключі AI сюди не потрапляють.', en: 'If the sound is gone or dictation doubles words: reproduce the problem first, then press the button and paste the text to the developer. AI keys are never included.', fr: 'Si le son a disparu ou si la dictée double les mots : reproduisez d’abord le problème, puis appuyez sur le bouton et collez le texte au développeur. Les clés IA ne sont jamais incluses.', ru: 'Если пропал звук или диктовка дублирует слова: сначала повторите проблему, затем нажмите кнопку и вставьте текст в чат разработчику. Ключи AI сюда не попадают.', zh: '如果声音消失或听写重复词语：请先重现问题，然后点击按钮并把文本粘贴给开发者。不包含 AI 密钥。', ko: '소리가 사라졌거나 받아쓰기가 단어를 중복하면: 먼저 문제를 재현한 다음 버튼을 누르고 텍스트를 개발자에게 붙여 넣으세요. AI 키는 포함되지 않습니다.', hi: 'अगर आवाज़ चली गई है या डिक्टेशन शब्द दोहराता है: पहले समस्या दोहराएँ, फिर बटन दबाएँ और टेक्स्ट डेवलपर को चिपकाएँ। AI कुंजियाँ शामिल नहीं होतीं।', ga: 'Má d’imigh an fhuaim nó má dhúblálann an deachtú focail: atáirg an fhadhb ar dtús, ansin brúigh an cnaipe agus greamaigh an téacs don fhorbróir. Ní chuirtear eochracha AI isteach riamh.' },
    diagCopy: { uk: '📋 Скопіювати діагностику', en: '📋 Copy diagnostics', fr: '📋 Copier le diagnostic', ru: '📋 Скопировать диагностику', zh: '📋 复制诊断信息', ko: '📋 진단 정보 복사', hi: '📋 जाँच जानकारी कॉपी करें', ga: '📋 Cóipeáil an diagnóisic' },
    diagCopied: { uk: 'Скопійовано. Вставте в чат розробнику.', en: 'Copied. Paste it to the developer.', fr: 'Copié. Collez-le au développeur.', ru: 'Скопировано. Вставьте в чат разработчику.', zh: '已复制。请粘贴给开发者。', ko: '복사했습니다. 개발자에게 붙여 넣으세요.', hi: 'कॉपी हो गया। डेवलपर को चिपकाएँ।', ga: 'Cóipeáilte. Greamaigh don fhorbróir é.' },
    diagCopyManual: { uk: 'Не вдалося скопіювати автоматично — текст виділено нижче: скопіюйте його вручну.', en: 'Could not copy automatically — the text is selected below: copy it by hand.', fr: 'Copie automatique impossible — le texte est sélectionné ci-dessous : copiez-le à la main.', ru: 'Не удалось скопировать автоматически — текст выделен ниже: скопируйте его вручную.', zh: '无法自动复制——下方文本已选中，请手动复制。', ko: '자동으로 복사하지 못했습니다. 아래 텍스트가 선택되어 있으니 직접 복사하세요.', hi: 'अपने आप कॉपी नहीं हुआ — नीचे टेक्स्ट चुना गया है: उसे खुद कॉपी करें।', ga: 'Níorbh fhéidir cóipeáil go huathoibríoch — tá an téacs roghnaithe thíos: cóipeáil de láimh é.' }
});
