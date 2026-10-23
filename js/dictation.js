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
// The user agent is NOT enough: Chrome's «Desktop site» on an Android phone says «X11; Linux x86_64» while the recognizer is
// still Android's (CONFIRMED 2026-10-18 from a phone's 📋 report: continuous sessions, every final repeated and growing --
// «Так», «Так», «Так почнемо», «Так почнемо розмову» -- all typed). So also: a Linux «desktop» whose main pointer is a finger,
// and, whatever the platform says, an engine SEEN to repeat itself (dictationNoteCumulative), remembered on the device.
const DICTATION_SINGLE_KEY = 'reader_stt_single_utterance';
let dictationSingleUtterance = /Android|iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    || (/\bLinux\b/.test(navigator.userAgent) && navigator.maxTouchPoints > 0 && !!window.matchMedia && matchMedia('(pointer: coarse)').matches)
    || readStored(DICTATION_SINGLE_KEY) === '1';
function dictationNoteCumulative(session) {
    if (dictationSingleUtterance) return;
    dictationSingleUtterance = true;   // the next sessions ask for one utterance each
    try { localStorage.setItem(DICTATION_SINGLE_KEY, '1'); } catch (e) { /* this run only */ }
    traceStt('engine-repeats', { session });
}
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
    setIconButton(els.micBtn, dictation.wanted ? 'stop' : 'mic');
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
    // legitimately produce separate finals («very», «very», «good»), so there only a CHAIN of three or more finals, each
    // repeating or extending the one before, is taken for Android's engine behind a desktop user agent («Так», «Так», «Так»,
    // «Так почнемо»…): the chain is collapsed to its newest text and the next sessions ask for one utterance.
    let sessionTyped = null;   // { heard, inserted }
    let chain = null;          // continuous sessions: { count, inserted } -- consecutive finals repeating/extending the previous one
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
                if (session.continuous && sessionTyped) {
                    const prev = cmp(sessionTyped.heard), next = cmp(text);
                    chain = next === prev || (prev && next.startsWith(prev + ' ')) ? { count: chain ? chain.count + 1 : 2, inserted: chain ? chain.inserted : sessionTyped.inserted } : null;
                    if (chain && chain.count >= 3) {
                        dictationNoteCumulative(id);
                        if (value.endsWith(chain.inserted)) { value = value.slice(0, value.length - chain.inserted.length).replace(/\s+$/, ''); chain.inserted = ''; }
                        else add = next === prev ? '' : text.split(/\s+/).slice(sessionTyped.heard.trim().split(/\s+/).length).join(' ');   // the reader edited: only the new words
                        traceStt('replace-cumulative', { session: id, i, text });
                    }
                } else if (!session.continuous && sessionTyped) {
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
                if (chain) chain.inserted = chain.count >= 3 ? inserted : chain.inserted + inserted;
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
        // Which AI provider each request really used and how fast: routing, WHICH keys exist (yes / no -- never the keys), what a
        // task would start on, and the last requests (task, provider, shared-or-own, ok, ms). No prompts, no answers.
        ai: {
            routing: state.aiRouting, active: state.activeAiProvider,
            ownKeys: { openai: !!state.openaiKey, groq: !!state.groqKey, gemini: !!state.apiKey },
            sharedOnSite: typeof sharedAiProviders !== 'undefined' ? Object.assign({}, sharedAiProviders) : null,
            startsOn: typeof aiProviderForTask === 'function' ? { translation: aiProviderForTask('translation'), grammar: aiProviderForTask('grammar_analysis'), breakdown: aiProviderForTask('sentence_structure'), ask: aiProviderForTask('ask') } : null,
            openaiPools: typeof openaiPoolReport === 'function' ? openaiPoolReport() : null,   // today's tokens per free OpenAI pool on this device
            recent: typeof readerAiRequests === 'function' ? readerAiRequests().slice(-30) : []
        },
        offline: typeof offlineTrReport === 'function' ? offlineTrReport() : null,   // js/offline-translate.js: installed packs, why the engine failed, last speed
        bookSpeech: typeof bsReport === 'function' ? bsReport() : null,   // js/book-speech.js: the book's narration and piste marks, what each tap decided
        speech: {
            engine: synth ? { speaking: synth.speaking, pending: synth.pending, paused: synth.paused } : 'none',
            voices: typeof voices !== 'undefined' ? voices.length : 0,
            voiceList: (typeof voices !== 'undefined' ? voices : []).slice(0, 80).map(v => [v.lang, v.name, v.localService ? 'local' : 'net', v.default ? 'default' : ''].join(' | ')),
            chosenVoices: state.selectedVoiceURIByLang, speakSide: state.speakSide, readingAloud: typeof isSpeakingGlobal !== 'undefined' ? isSpeakingGlobal : null,
            trace: typeof ttsTrace !== 'undefined' ? ttsTrace : [],
            selfTest: ttsSelfTest   // «🔊 Перевірити озвучення»: what each test phrase did and whether the reader heard it
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
    box.append(h, hint, buildTtsSelfTestUI(), btn, status, area);
    content.append(box);
    applyI18n();
}

// ========== 🔊 ПЕРЕВІРКА ОЗВУЧЕННЯ (у діагностиці) ==========
// The trace alone cannot say what the reader HEARD: the engine can report start → end while the phone stays silent. Three
// phrases are spoken one after another and the reader answers ✅ / ❌ for each; the answers and what the engine did go into
// the 📋 report (speech.selfTest): 1) the book's language, the voice the app picks; 2) the translation language, the voice the
// app picks; 3) the translation language WITHOUT choosing a voice, straight to the system engine (no app code in between) --
// so «2 silent, 3 heard» points at the chosen voice, «all silent» at the phone (media volume, Text-to-speech engine).
const TTS_SELF_TEST_TEXT = { fr: 'Bonjour, ceci est un test du son.', en: 'Hello, this is a sound test.', uk: 'Привіт, це перевірка звуку.',
    ru: 'Привет, это проверка звука.', de: 'Hallo, das ist ein Tontest.', es: 'Hola, esto es una prueba de sonido.', it: 'Ciao, questa è una prova del suono.',
    pl: 'Cześć, to jest test dźwięku.', zh: '你好，这是声音测试。', ko: '안녕하세요, 소리 테스트입니다.', hi: 'नमस्ते, यह आवाज़ की जाँच है।', ga: 'Dia duit, is tástáil fuaime í seo.' };
let ttsSelfTest = null;
function ttsSelfTestLangs() {
    const book = (typeof explicitBookLang === 'function' && explicitBookLang()) || state.sourceLang || 'fr';
    return { book: String(book).slice(0, 2).toLowerCase(), tr: state.targetLang || 'uk' };
}
const ttsVoiceInfo = v => v ? { name: v.name, lang: v.lang, local: v.localService, uri: v.voiceURI } : null;
// One phrase through the app's own path (speakInLang: chosen voice, retry/watchdog) -- or, `system`, a bare utterance with only
// a language. Resolves with what the engine reported; never longer than `limitMs`.
function ttsSelfTestPhrase(code, system, limitMs = 15000) {
    const text = TTS_SELF_TEST_TEXT[code] || TTS_SELF_TEST_TEXT.en;
    const r = { lang: code, how: system ? 'system-default-voice' : 'app-voice', text, events: [], startMs: null, ms: null, heard: null };
    const t0 = performance.now(), mark = ev => r.events.push({ ev, at: Math.round(performance.now() - t0) });
    return new Promise(resolve => {
        let done = false, poll = 0;
        const finish = why => { if (done) return; done = true; clearTimeout(limit); clearInterval(poll); for (const x of r.events) delete x.t; if (why) mark(why); r.ms = Math.round(performance.now() - t0); resolve(r); };
        const limit = setTimeout(() => finish('timeout'), limitMs);
        if (!ttsSynth) { finish('no-speech-synthesis'); return; }
        if (system) {
            r.voice = null;
            try { ttsSynth.cancel(); } catch (e) {}
            const u = new SpeechSynthesisUtterance(text);
            u.lang = (typeof LANG_TAGS !== 'undefined' && LANG_TAGS[code]) || code;
            u.onstart = () => { r.startMs = Math.round(performance.now() - t0); mark('start'); };
            u.onend = () => finish('end');
            u.onerror = e => finish('error:' + (e && e.error));
            ttsSelfTestPhrase.live = u;   // held until it ends (Chrome may collect an utterance only the engine holds)
            setTimeout(() => { try { ttsSynth.speak(u); mark('speak'); } catch (e) { finish('speak-threw'); } }, 300);
            return;
        }
        r.voice = ttsVoiceInfo(voices.find(v => v.voiceURI === state.selectedVoiceURIByLang[code]) || pickBestVoice(code, voices));
        const from = ttsTrace.length;
        poll = setInterval(() => {
            for (const e of ttsTrace.slice(from)) if (e.text && text.startsWith(e.text) && !r.events.some(x => x.ev === e.event && x.t === e.t)) {
                r.events.push({ ev: e.event, at: Math.round(e.t - t0), t: e.t });
                if (e.event === 'start' && r.startMs === null) r.startMs = Math.round(e.t - t0);
            }
        }, 100);
        speakInLang(text, code, 'diag', 0, () => { setTimeout(() => finish(''), 150); });   // after the poll saw the last trace events
    });
}
function buildTtsSelfTestUI() {
    const wrap = document.createElement('div'); wrap.id = 'tts-test';
    const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'tts-test-run'; btn.className = 'btn-secondary'; btn.dataset.i18n = 'ttsTestRun';
    const rows = document.createElement('div'); rows.id = 'tts-test-rows';
    const note = document.createElement('p'); note.id = 'tts-test-status'; note.className = 'key-hint'; note.setAttribute('role', 'status');
    btn.addEventListener('click', async () => {
        btn.disabled = true; rows.replaceChildren();
        const langs = ttsSelfTestLangs();
        ttsSelfTest = { at: new Date().toISOString(), voices: typeof voices !== 'undefined' ? voices.length : 0,
            engine: ttsSynth ? { speaking: ttsSynth.speaking, pending: ttsSynth.pending, paused: ttsSynth.paused } : 'none', phrases: [] };
        const plan = [[langs.book, false], [langs.tr, false], [langs.tr, true]];
        for (let k = 0; k < plan.length; k++) {
            note.textContent = t('ttsTestPlaying').replace('{n}', k + 1).replace('{total}', plan.length);
            const r = await ttsSelfTestPhrase(plan[k][0], plan[k][1]);
            ttsSelfTest.phrases.push(r);
            rows.append(ttsSelfTestRow(k, r));
            await new Promise(res => setTimeout(res, 500));
        }
        note.textContent = t('ttsTestAnswer');
        btn.disabled = false;
    });
    wrap.append(btn, note, rows);
    return wrap;
}
function ttsSelfTestRow(k, r) {
    const row = document.createElement('div'); row.className = 'tts-test-row';
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;';
    const label = document.createElement('span'); label.style.flex = '1 1 160px';
    const name = document.querySelector(`#target-lang option[value="${r.lang}"]`)?.textContent || r.lang;
    label.textContent = `${k + 1}. ${name} · ${r.how === 'system-default-voice' ? t('ttsTestSystem') : (r.voice ? r.voice.name : t('ttsTestNoVoice'))}`;
    const answer = (heard, b) => { r.heard = heard; for (const x of row.querySelectorAll('button')) { x.setAttribute('aria-pressed', String(x === b)); x.style.outline = x === b ? '3px solid var(--focus-color)' : ''; } };
    const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'btn-secondary'; yes.textContent = '✅ ' + t('ttsTestHeard');
    const no = document.createElement('button'); no.type = 'button'; no.className = 'btn-secondary'; no.textContent = '❌ ' + t('ttsTestNotHeard');
    yes.addEventListener('click', () => answer(true, yes)); no.addEventListener('click', () => answer(false, no));
    row.append(label, yes, no);
    return row;
}
window.addEventListener('load', buildDiagnosticsBox, { once: true });
Object.assign(I18N, {
    ttsTestRun: { uk: '🔊 Перевірити озвучення', en: '🔊 Test the voice', fr: '🔊 Tester la voix', ru: '🔊 Проверить озвучку', zh: '🔊 测试朗读', ko: '🔊 음성 테스트', hi: '🔊 आवाज़ जाँचें', ga: '🔊 Tástáil an guth' },
    ttsTestPlaying: { uk: 'Звучить фраза {n} з {total}… слухайте.', en: 'Playing phrase {n} of {total}… listen.', fr: 'Phrase {n} sur {total}… écoutez.', ru: 'Звучит фраза {n} из {total}… слушайте.', zh: '正在播放第 {n}/{total} 句…请听。', ko: '{total}개 중 {n}번째 문장 재생 중… 들어 보세요.', hi: 'वाक्य {n} / {total} चल रहा है… सुनें।', ga: 'Abairt {n} as {total}… éist.' },
    ttsTestAnswer: { uk: 'Позначте, які фрази ви почули, потім натисніть «📋 Скопіювати діагностику».', en: 'Mark which phrases you heard, then press «📋 Copy diagnostics».', fr: 'Indiquez les phrases entendues, puis appuyez sur « 📋 Copier le diagnostic ».', ru: 'Отметьте, какие фразы вы услышали, затем нажмите «📋 Скопировать диагностику».', zh: '标记你听到的句子，然后点击“📋 复制诊断信息”。', ko: '들린 문장을 표시한 뒤 «📋 진단 정보 복사»를 누르세요.', hi: 'जो वाक्य सुने उन्हें चिह्नित करें, फिर «📋 जाँच जानकारी कॉपी करें» दबाएँ।', ga: 'Marcáil na habairtí a chuala tú, ansin brúigh «📋 Cóipeáil an diagnóisic».' },
    ttsTestHeard: { uk: 'чув', en: 'heard', fr: 'entendu', ru: 'слышал', zh: '听到了', ko: '들림', hi: 'सुना', ga: 'chuala' },
    ttsTestNotHeard: { uk: 'не чув', en: 'not heard', fr: 'pas entendu', ru: 'не слышал', zh: '没听到', ko: '안 들림', hi: 'नहीं सुना', ga: 'níor chuala' },
    ttsTestSystem: { uk: 'голос системи', en: 'system voice', fr: 'voix du système', ru: 'голос системы', zh: '系统语音', ko: '시스템 음성', hi: 'सिस्टम आवाज़', ga: 'guth an chórais' },
    ttsTestNoVoice: { uk: 'голосу немає', en: 'no voice', fr: 'pas de voix', ru: 'голоса нет', zh: '没有语音', ko: '음성 없음', hi: 'आवाज़ नहीं', ga: 'gan ghuth' },
    diagTitle: { uk: '🩺 Діагностика звуку й мікрофона', en: '🩺 Sound and microphone diagnostics', fr: '🩺 Diagnostic du son et du micro', ru: '🩺 Диагностика звука и микрофона', zh: '🩺 声音和麦克风诊断', ko: '🩺 소리 및 마이크 진단', hi: '🩺 आवाज़ और माइक्रोफ़ोन जाँच', ga: '🩺 Diagnóisic fuaime agus micreafóin' },
    diagHint: { uk: 'Якщо пропав звук або диктування дублює слова: спершу повторіть проблему, потім натисніть кнопку й вставте текст у чат розробнику. Ключі AI сюди не потрапляють.', en: 'If the sound is gone or dictation doubles words: reproduce the problem first, then press the button and paste the text to the developer. AI keys are never included.', fr: 'Si le son a disparu ou si la dictée double les mots : reproduisez d’abord le problème, puis appuyez sur le bouton et collez le texte au développeur. Les clés IA ne sont jamais incluses.', ru: 'Если пропал звук или диктовка дублирует слова: сначала повторите проблему, затем нажмите кнопку и вставьте текст в чат разработчику. Ключи AI сюда не попадают.', zh: '如果声音消失或听写重复词语：请先重现问题，然后点击按钮并把文本粘贴给开发者。不包含 AI 密钥。', ko: '소리가 사라졌거나 받아쓰기가 단어를 중복하면: 먼저 문제를 재현한 다음 버튼을 누르고 텍스트를 개발자에게 붙여 넣으세요. AI 키는 포함되지 않습니다.', hi: 'अगर आवाज़ चली गई है या डिक्टेशन शब्द दोहराता है: पहले समस्या दोहराएँ, फिर बटन दबाएँ और टेक्स्ट डेवलपर को चिपकाएँ। AI कुंजियाँ शामिल नहीं होतीं।', ga: 'Má d’imigh an fhuaim nó má dhúblálann an deachtú focail: atáirg an fhadhb ar dtús, ansin brúigh an cnaipe agus greamaigh an téacs don fhorbróir. Ní chuirtear eochracha AI isteach riamh.' },
    diagCopy: { uk: '📋 Скопіювати діагностику', en: '📋 Copy diagnostics', fr: '📋 Copier le diagnostic', ru: '📋 Скопировать диагностику', zh: '📋 复制诊断信息', ko: '📋 진단 정보 복사', hi: '📋 जाँच जानकारी कॉपी करें', ga: '📋 Cóipeáil an diagnóisic' },
    diagCopied: { uk: 'Скопійовано. Вставте в чат розробнику.', en: 'Copied. Paste it to the developer.', fr: 'Copié. Collez-le au développeur.', ru: 'Скопировано. Вставьте в чат разработчику.', zh: '已复制。请粘贴给开发者。', ko: '복사했습니다. 개발자에게 붙여 넣으세요.', hi: 'कॉपी हो गया। डेवलपर को चिपकाएँ।', ga: 'Cóipeáilte. Greamaigh don fhorbróir é.' },
    diagCopyManual: { uk: 'Не вдалося скопіювати автоматично — текст виділено нижче: скопіюйте його вручну.', en: 'Could not copy automatically — the text is selected below: copy it by hand.', fr: 'Copie automatique impossible — le texte est sélectionné ci-dessous : copiez-le à la main.', ru: 'Не удалось скопировать автоматически — текст выделен ниже: скопируйте его вручную.', zh: '无法自动复制——下方文本已选中，请手动复制。', ko: '자동으로 복사하지 못했습니다. 아래 텍스트가 선택되어 있으니 직접 복사하세요.', hi: 'अपने आप कॉपी नहीं हुआ — नीचे टेक्स्ट चुना गया है: उसे खुद कॉपी करें।', ga: 'Níorbh fhéidir cóipeáil go huathoibríoch — tá an téacs roghnaithe thíos: cóipeáil de láimh é.' }
});
