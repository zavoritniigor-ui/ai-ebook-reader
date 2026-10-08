/* tts.js — читання вголос: спливаюча підказка (stopTooltipSpeech/updateSpeakerIcons/
 * bindUtterance/speakText/speakInLang), яка сторона озвучується (setSpeakSide/
 * updateSpeakSideUI), і сам плеєр читання сторінки/виділення (buildSentenceRanges,
 * підсвітка речення через CSS Custom Highlight API, пауза/продовження/крок, кнопки
 * керування — startTTS/stopGlobalTTS/pauseTTS/resumeTTS/stepSentence — та перемикач
 * "два голоси по черзі").
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Вибір/якість голосів
 * (voiceQualityScore/pickBestVoice/pickVoicePair/loadVoices/voices/ttsSynth тощо)
 * навмисно лишається в js/core.js (перенесено туди механічним розрізом Кроку 1,
 * рухати вдруге ризиковано без користі) — цей файл лише споживає їх як глобали.
 * Залежить також від js/lang-detect.js (pageLang/buildLanguageSegments/
 * voiceForLangCode/voiceForText) та від columnStep/goToPageInChapter, що поки що
 * лишаються в index.html (navigation.js, Крок 9) — виклики всередині функцій, це
 * безпечно, бо на момент фактичного виклику (взаємодія користувача) всі класичні
 * <script> вже виконались.
 */

// Хто зараз озвучується у вікні перекладу: 'orig' | 'tr' | null. Потрібно, щоб
// повторне натискання того самого динаміка зупиняло відтворення.
function stopTooltipSpeech() {
    // Запам'ятовуємо, де саме зупинились, щоб наступне натискання продовжило звідти.
    if (state.speakingSide) {
        state.speakResume = { side: state.speakingSide, pos: (state.speakBase || 0) + (state.speakPos || 0) };
    }
    state.speakingId = -1;      // знецінюємо поточну фразу, щоб її onend нічого не скинув
    state.ttsGen++;             // і щоб вона не зрушила чергу читання вголос
    cancelSpeech();
    state.speakingSide = null;
    updateSpeakerIcons();
}
function updateSpeakerIcons() {
    if (els.ttReplayBtn) els.ttReplayBtn.textContent = state.speakingSide === 'orig' ? '■' : '🔊';
    if (els.ttSpeakTranslation) els.ttSpeakTranslation.textContent = state.speakingSide === 'tr' ? '■' : '🔊';
    const origEl = document.getElementById('tt-original');
    if (origEl) {
        if (state.speakingSide === 'orig' && origEl.parentElement) {
            const containerW = origEl.parentElement.clientWidth;
            if (origEl.scrollWidth > containerW + 2) {
                origEl.style.setProperty('--ticker-container-w', `${containerW}px`);
                origEl.classList.add('speaking-ticker');
            } else {
                origEl.classList.remove('speaking-ticker');
            }
        } else {
            origEl.classList.remove('speaking-ticker');
        }
    }
}
// Кожна фраза має власний номер. Без нього onend від ПОПЕРЕДНЬОЇ, обірваної через
// cancel(), приходив із запізненням, бачив ту саму сторону ('orig') і скидав щойно
// виставлену позначку — через це кнопка зупинки для оригіналу не спрацьовувала.
let utterSeq = 0;
// Скільки чекати між cancel() і наступним speak() (мс). На Android/Chrome негайний
// speak() одразу після cancel() інколи встигає заграти РАЗОМ із "хвостом" щойно
// скасованої фрази — почута людиною як той самий голос, що звучить двічі з
// мілісекундною затримкою (саме так і був описаний цей дефект). Коротка затримка дає
// платформі дійсно зупинити попередню фразу, перш ніж почати нову — непомітна для
// вуха пауза, зате без накладання. Використовується скрізь, де новий speak() іде
// одразу за cancel() (speakText/speakInLang нижче, stepSentence(), і проба голосу в
// js/main.js) — саме ці місця, а НЕ ланцюжок speakSegment→onend→speakSegment у
// speakCurrentSentence(), бо там speak() нового відрізка йде без жодного cancel().
const TTS_CANCEL_SPEAK_DELAY_MS = 80;
// Idle synthesizer: speak NOW, inside the tap. Every tap used to send one or two cancel() (= Android
// TextToSpeech.stop()) and then speak() from an 80 ms timer, even when nothing was playing: the first
// request after load could be dropped (silent first tap) and a stop() still being processed by the engine
// could cut the head of the new audio (clipped first syllable). Only a busy synthesizer is cancelled, and
// only then does the next speak() wait out the rest of TTS_CANCEL_SPEAK_DELAY_MS.
let lastSpeechCancelAt = -Infinity;
// Lifecycle trace for on-device diagnosis (`ttsTrace` in the console): did the engine start, end, fail?
// With Web Speech the audio never reaches the page, so this is what distinguishes "engine dropped the
// request" (no start) from "platform output lost the audio" (start + end, nothing heard).
const ttsTrace = [];
function traceTts(event, text) {
    ttsTrace.push({ t: Math.round(performance.now()), event, text: text ? String(text).slice(0, 40) : '' });
    if (ttsTrace.length > 60) ttsTrace.shift();
}
function cancelSpeech(force) {
    if (!ttsSynth || !(force || ttsSynth.speaking || ttsSynth.pending || ttsSynth.paused)) return false;
    ttsSynth.cancel();
    lastSpeechCancelAt = performance.now();
    traceTts('cancel');
    return true;
}
// An utterance the engine never starts (dropped first request) or that fails with a transient audio error
// is spoken once more -- the "second tap" the reader otherwise had to do by hand. Other errors are logged,
// never swallowed.
const TTS_START_TIMEOUT_MS = 2500;
const TTS_RETRYABLE_ERRORS = new Set(['audio-busy', 'audio-hardware', 'synthesis-failed', 'synthesis-unavailable']);
function startUtterance(u, gen, mayRetry = true) {
    const wait = lastSpeechCancelAt + TTS_CANCEL_SPEAK_DELAY_MS - performance.now();
    if (wait > 0) setTimeout(() => { if (gen === state.ttsGen) speakWithRecovery(u, gen, mayRetry); }, wait);
    else speakWithRecovery(u, gen, mayRetry);
}
function speakWithRecovery(u, gen, mayRetry) {
    const onEnd = u.onend, onError = u.onerror;
    let started = false, settled = false, watchdog = 0;
    const retry = (why) => {
        settled = true; clearTimeout(watchdog);
        traceTts('retry:' + why, u.text);
        const again = new SpeechSynthesisUtterance(u.text);
        if (u.voice) again.voice = u.voice;
        again.lang = u.lang; again.rate = u.rate;
        again.onboundary = u.onboundary; again.onend = onEnd; again.onerror = onError;
        cancelSpeech(true);   // the dropped request may still sit in the engine's queue
        startUtterance(again, gen, false);
    };
    u.onstart = () => { started = true; clearTimeout(watchdog); traceTts('start', u.text); };
    u.onend = (e) => {
        if (settled) return;
        settled = true; clearTimeout(watchdog); traceTts('end', u.text);
        if (onEnd) onEnd.call(u, e);
    };
    u.onerror = (e) => {
        if (settled) return;
        const error = e && e.error;
        if (mayRetry && !started && gen === state.ttsGen && TTS_RETRYABLE_ERRORS.has(error)) { retry(error); return; }
        settled = true; clearTimeout(watchdog); traceTts('error:' + error, u.text);
        if (error !== 'interrupted' && error !== 'canceled') console.warn('[tts] speech failed:', error, u.text.slice(0, 60));
        if (onError) onError.call(u, e);
    };
    if (mayRetry) watchdog = setTimeout(() => {
        if (!settled && !started && gen === state.ttsGen && !ttsSynth.speaking) retry('no-start');
    }, TTS_START_TIMEOUT_MS);
    traceTts('speak', u.text);
    try { ttsSynth.speak(u); } catch (err) { u.onerror({ error: 'synthesis-failed' }); }
}
// Узгоджує utterance.lang із САМИМ ГОЛОСОМ, а не з нашою власною канонічною назвою
// мови ('fr-FR'/'uk-UA' тощо): якщо голос уже вибрано, синтезатор орієнтується САМЕ
// на utterance.voice, а utterance.lang, що йому суперечить (ми ставимо канонічне
// 'fr-FR', а реальний обраний голос насправді має власний .lang 'fr-CA' чи якийсь
// інший варіант, бо pickBestVoice/voiceForLangCode шукають голос лише за ПРЕФІКСОМ
// мови, не за точним її кодом) — на Android це відомий спосіб заплутати міст до
// системного синтезатора: він намагається задовольнити ОБИДВІ вказівки одразу (і
// голос, і lang) і в підсумку озвучує фразу ДВІЧІ — той самий голос ніби з луною,
// майже без затримки між копіями. Саме це описав користувач, і саме тому окремий
// TTS_CANCEL_SPEAK_DELAY_MS вище (для cancel()+speak() поспіль) не усував ефект:
// причина цього дефекту геть інша, і трапляється й там, де жодного cancel() перед
// speak() немає (сам ланцюжок speakSegment у speakCurrentSentence()). Коли голосу
// нема (voice===null) — синтезатор сам підбирає системний голос САМЕ ЗА
// utterance.lang, тому в цьому єдиному випадку лишаємо нашу канонічну назву мови.
function setUtteranceVoice(u, lang, voice) {
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    else u.lang = lang;
}
// onEnd (optional): an extra completion hook alongside the built-in cleanup below — added for
// Practice's own per-sentence speaker buttons (js/practice-worksheet.js togglePracticeSpeak), so a
// THIRD consumer (beyond the tooltip's 'orig'/'tr' sides) can reset its own UI on natural completion
// without a second TTS implementation or polling; existing callers omit it and are unaffected.
function bindUtterance(u, side, fullText, offset, onEnd) {
    if (!side) return;
    const myId = ++utterSeq;
    state.speakingId = myId;
    state.speakingSide = side;
    state.speakBase = offset || 0;   // з якого символу почали цю фразу
    state.speakPos = 0;
    updateSpeakerIcons();
    // onboundary дає позицію вимовленого слова — саме за нею продовжуємо з місця,
    // де зупинились, а не з початку довгого речення.
    u.onboundary = (e) => {
        if (state.speakingId !== myId) return;
        if (typeof e.charIndex === 'number') state.speakPos = e.charIndex;
    };
    let completed = false;
    const handleEnd = () => {
        if (completed) return;
        completed = true;
        if (state.speakingId !== myId) return;   // це відгомін старої фрази
        state.speakingSide = null;
        state.speakResume = null;                // дочитали до кінця
        updateSpeakerIcons();
        if (onEnd) onEnd();
    };
    u.onend = handleEnd;
    u.onerror = handleEnd;
}
function speakText(text, side, offset, onEnd) {
    state.ttsGen++;    // наш cancel не має рухати чергу читання вголос
    const gen = state.ttsGen;
    cancelSpeech();
    const u = new SpeechSynthesisUtterance(offset ? text.slice(offset) : text);
    const { lang, voice } = voiceForText(text);
    setUtteranceVoice(u, lang, voice); u.rate = 0.95;
    bindUtterance(u, side, text, offset, onEnd);
    // Одразу, якщо синтезатор вільний; після справжнього cancel() — лише залишок TTS_CANCEL_SPEAK_DELAY_MS.
    // Перевірка gen: якщо за цей час фразу вже скасували (ще один tap, stopTooltipSpeech) — не озвучуємо.
    startUtterance(u, gen);
}
// Озвучення ЗАДАНОЮ мовою — для перекладу, бо його мову ми знаємо точно й вона не
// залежить від мови книги (автовизначення тут дало б хибний голос).
const LANG_TAGS = Object.fromEntries(Object.entries(LANGUAGE_CONFIG).map(([code, config]) => [code, config.locale]));
function speakInLang(text, langCode, side, offset, onEnd) {
    if (!text) return;
    state.ttsGen++;
    const gen = state.ttsGen;
    cancelSpeech();
    const u = new SpeechSynthesisUtterance(offset ? text.slice(offset) : text);
    const voice = voices.find(v => v.voiceURI === state.selectedVoiceURIByLang[langCode]) || pickBestVoice(langCode, voices);
    setUtteranceVoice(u, LANG_TAGS[langCode] || langCode, voice);
    u.rate = 0.95;
    bindUtterance(u, side, text, offset, onEnd);
    startUtterance(u, gen);
}

// ========== ЯКА СТОРОНА ОЗВУЧУЄТЬСЯ (оригінал чи переклад) ==========
// Активною стає та, чий динамік натиснули останнім, і надалі саме вона озвучується
// автоматично при кожному новому слові. Вибір зберігається між сеансами.
function setSpeakSide(side) {
    state.speakSide = side;
    writeStored('reader_speak_side', side);
    updateSpeakSideUI();
}
function updateSpeakSideUI() {
    els.ttReplayBtn.classList.toggle('speak-active', state.speakSide === 'original');
    els.ttSpeakTranslation.classList.toggle('speak-active', state.speakSide === 'translation');
}

// ========== ЧИТАННЯ ВГОЛОС: межі, синхронна підсвітка, пауза/продовження ==========
// Якщо перед натисканням "Читати" є активне виділення тексту — читаємо тільки його
// (тобто: виділив пальцем/мишею від початку сторінки до потрібного місця — межі задані).
// Немає виділення — читаємо всю поточну сторінку.
//
// Підсвітка речення, що зараз звучить, зроблена через CSS Custom Highlight API
// (CSS.highlights) — це НЕ змінює DOM (на відміну від обгортання слів у <span>), тому не
// може пошкодити структуру тексту чи збити нумерацію сторінок. Якщо браузер застарілий і
// API недоступне — читання й пауза все одно працюють, просто без візуальної підсвітки.
const TTS_HL_NAME = 'tts-current';
function ttsHighlightSupported() { return typeof Highlight !== 'undefined' && window.CSS && CSS.highlights; }
function setTtsHighlight(range) {
    if (!ttsHighlightSupported()) return;
    try { CSS.highlights.set(TTS_HL_NAME, new Highlight(range)); } catch (e) {}
}
function clearTtsHighlight() {
    if (ttsHighlightSupported()) CSS.highlights.delete(TTS_HL_NAME);
}

// Розбиває довільний Range на послідовність речень, кожне зі своїм Range —
// без жодної мутації DOM (ніяких обгорток/розрізання текстових вузлів).
function buildSentenceRanges(range) {
    const root = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.nodeValue) return NodeFilter.FILTER_SKIP;
            return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });
    const sentences = [];
    let buffer = '', startNode = null, startOffset = 0, lastNode = null, lastOffset = 0, node;
    while (node = walker.nextNode()) {
        const text = node.nodeValue;
        const from = (node === range.startContainer) ? range.startOffset : 0;
        const to = (node === range.endContainer) ? range.endOffset : text.length;
        for (let i = from; i < to; i++) {
            if (buffer === '') { startNode = node; startOffset = i; }
            buffer += text[i];
            lastNode = node; lastOffset = i + 1;
            const atSentenceEnd = /[.!?]/.test(text[i]) && (i + 1 >= text.length || /\s/.test(text[i + 1]));
            const atRangeEnd = (i === to - 1) && (node === range.endContainer);
            if (atSentenceEnd || atRangeEnd) {
                const trimmed = buffer.trim();
                if (trimmed) {
                    const r = document.createRange();
                    r.setStart(startNode, startOffset);
                    r.setEnd(node, i + 1);
                    sentences.push({ text: trimmed, range: r });
                }
                buffer = ''; startNode = null;
            }
        }
    }
    if (buffer.trim() && startNode && lastNode) {
        const tail = document.createRange();
        tail.setStart(startNode, startOffset); tail.setEnd(lastNode, lastOffset);
        sentences.push({ text: buffer.trim(), range: tail });
    }
    return sentences;
}

// Визначає, на яку "сторінку" (колонку) припадає даний Range, з урахуванням поточного
// transform-зсуву — щоб під час читання гортати сторінки автоматично слідом за текстом.
function pageIndexForRange(range) {
    try {
        const rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) return state.pageInChapter;
        const containerRect = els.container.getBoundingClientRect();
        const currentShift = state.pageInChapter * columnStep();
        const untransformedLeft = (rect.left - containerRect.left) + currentShift;
        return Math.max(0, Math.floor(untransformedLeft / columnStep()));
    } catch (e) { return state.pageInChapter; }
}

let isSpeakingGlobal = false;
function updateTtsButtons() {
    if (!isSpeakingGlobal) {
        els.ttsBtn.textContent = t('read'); els.ttsBtn.classList.remove('tts-active');
        els.ttsStopBtn.style.display = 'none';
    } else if (state.ttsPaused) {
        els.ttsBtn.textContent = t('resume'); els.ttsBtn.classList.remove('tts-active');
        els.ttsStopBtn.style.display = '';
    } else {
        els.ttsBtn.textContent = t('pause'); els.ttsBtn.classList.add('tts-active');
        els.ttsStopBtn.style.display = '';
    }
    // Плаваюче керування поверх тексту — тільки поки читання активне.
    document.body.classList.toggle('tts-active-ui', isSpeakingGlobal);
    if (els.ttsToggle) els.ttsToggle.textContent = state.ttsPaused ? '▶' : '❚❚';
}
function stopGlobalTTS() {
    state.ttsGen++;
    isSpeakingGlobal = false; state.ttsPaused = false;
    cancelSpeech();
    clearTtsHighlight();
    state.ttsQueue = []; state.ttsIndex = 0;
    updateTtsButtons();
}
function pauseTTS() {
    state.ttsGen++;                 // обриваємо своє речення, не рухаючи чергу
    // speechSynthesis.pause()/resume() відомі своєю ненадійністю на Android/Chrome
    // (часто просто не спрацьовують), тому пауза реалізована надійніше: зупиняємо
    // мовлення повністю (cancel), запам'ятовуючи індекс поточного речення, і при
    // продовженні просто починаємо те саме речення заново.
    state.ttsPaused = true;
    cancelSpeech();
    updateTtsButtons();
}
function resumeTTS() {
    state.ttsPaused = false;
    updateTtsButtons();
    speakCurrentSentence();
}
function speakCurrentSentence() {
    if (!isSpeakingGlobal || state.ttsPaused) return;
    if (state.ttsIndex >= state.ttsQueue.length) { stopGlobalTTS(); return; }
    const item = state.ttsQueue[state.ttsIndex];
    setTtsHighlight(item.range);
    if (state.format !== 'pdf') {
        const targetPage = pageIndexForRange(item.range);
        if (targetPage !== state.pageInChapter) goToPageInChapter(targetPage);
    }
    // Речення саме собі контекст: у двомовній книзі сусідні речення можуть бути
    // різними мовами, тому кожне озвучується власною.
    state.ctxSentence = item.text;
    // Речення може бути мовно неоднорідним (двомовна книга: пояснення однією мовою
    // й приклад чи слово — іншою). Ділимо його на впорядковані відрізки однієї мови
    // й читаємо їх один за одним окремими голосами, без розриву самого читання —
    // підсвітка й перегортання сторінки лишаються на рівні цілого речення.
    const segments = buildLanguageSegments(item.text, pageLang().slice(0, 2));
    // Синтезатор мовлення один на всю сторінку, тому cancel() з ІНШОГО місця (напр.
    // з вікна перекладу) обриває поточну фразу й викликає onend — і читання самовільно
    // йшло далі. Покоління дозволяє відрізнити природне завершення від чужого обриву.
    const gen = ++state.ttsGen;
    // Чергування "два голоси" — за НОМЕРОМ речення (не відрізка й не лічильником
    // викликів), тому крок стрілками назад-вперед лишає той самий голос, а кожен
    // мовний відрізок усередині речення чергується у своєму власному пулі голосів.
    const sentenceIndex = state.ttsIndex;

    const advanceSentence = () => {
        if (gen !== state.ttsGen || !isSpeakingGlobal || state.ttsPaused) return;
        state.ttsIndex++;
        if (state.ttsIndex >= state.ttsQueue.length) {
            stopGlobalTTS();
            return;
        }
        // Microtask queueing ensures call stack stays flat even across many fast/empty sentences
        queueMicrotask(() => {
            if (gen === state.ttsGen && isSpeakingGlobal && !state.ttsPaused) {
                speakCurrentSentence();
            }
        });
    };

    let segIdx = 0;
    const playNextSegment = () => {
        while (segIdx < segments.length) {
            if (gen !== state.ttsGen || !isSpeakingGlobal || state.ttsPaused) return;
            const seg = segments[segIdx++];
            const text = seg.text ? seg.text.trim() : '';
            if (!text) continue; // Loop iteratively instead of recursing on empty segments

            const utterance = new SpeechSynthesisUtterance(text);
            const { lang, voice } = voiceForLangCode(seg.lang);
            let chosen = voice;
            if (state.altVoices) {
                const pair = pickVoicePair(seg.lang);
                if (pair) chosen = pair[sentenceIndex % 2];
            }
            setUtteranceVoice(utterance, lang, chosen);
            utterance.rate = 0.95;

            let handled = false;
            const onSegmentDone = () => {
                if (handled) return;
                handled = true;
                if (gen !== state.ttsGen || !isSpeakingGlobal || state.ttsPaused) return;
                // Schedule continuation asynchronously to guard against synchronous onerror loops
                queueMicrotask(() => {
                    if (gen === state.ttsGen && isSpeakingGlobal && !state.ttsPaused) {
                        playNextSegment();
                    }
                });
            };

            utterance.onend = onSegmentDone;
            utterance.onerror = onSegmentDone;
            startUtterance(utterance, gen);
            return;
        }

        advanceSentence();
    };

    playNextSegment();
}
// Крок по реченнях. Під час читання — переходить і читає далі з нового речення.
// На паузі — лише переносить підсвітку (і гортає сторінку, якщо треба), не озвучуючи.
function stepSentence(delta) {
    if (!isSpeakingGlobal || !state.ttsQueue.length) return;
    const next = state.ttsIndex + delta;
    if (next < 0 || next >= state.ttsQueue.length) return;
    state.ttsIndex = next;
    const item = state.ttsQueue[next];
    setTtsHighlight(item.range);
    if (state.format !== 'pdf') {
        const targetPage = pageIndexForRange(item.range);
        if (targetPage !== state.pageInChapter) goToPageInChapter(targetPage);
    }
    if (!state.ttsPaused) {
        state.ttsGen++;             // поточну фразу обриваємо свідомо
        const gen = state.ttsGen;
        cancelSpeech();
        // Затримка перед новим speakCurrentSentence() — див. TTS_CANCEL_SPEAK_DELAY_MS.
        setTimeout(() => { if (gen === state.ttsGen) speakCurrentSentence(); }, TTS_CANCEL_SPEAK_DELAY_MS);
    }
}

function startTTS() {
    let range;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed && els.pages.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        range = sel.getRangeAt(0).cloneRange();
        sel.removeAllRanges();
    } else {
        if (!els.pages.textContent.trim()) return;
        range = document.createRange();
        range.selectNodeContents(els.pages);
    }
    const queue = buildSentenceRanges(range);
    if (!queue.length) return;
    state.ttsQueue = queue; state.ttsIndex = 0; state.ttsPaused = false;
    isSpeakingGlobal = true;
    updateTtsButtons();
    speakCurrentSentence();
}
// ========== ДВА ГОЛОСИ ПО ЧЕРЗІ ==========
function updateAltVoicesBtn() {
    els.altVoicesBtn.textContent = t(state.altVoices ? 'altVoicesOn' : 'altVoicesOff');
    els.altVoicesBtn.classList.toggle('active-mode', state.altVoices);
}
els.altVoicesBtn.onclick = () => {
    state.altVoices = !state.altVoices;
    writeStored('reader_alt_voices', state.altVoices ? '1' : '0');
    updateAltVoicesBtn();
    if (state.altVoices) {
        // Попереджаємо одразу, якщо чергувати нема чим — інакше різниці не було б чути.
        const pair = pickVoicePair('fr');
        if (!pair || pair[0].name === pair[1].name) {
            showToast(t('oneVoice'));
        }
    }
};
updateAltVoicesBtn();

els.ttsBtn.onclick = () => {
    if (!isSpeakingGlobal) {
        startTTS();
        // Меню одразу згортається — читання йде по чистому тексту, а керування
        // лишається на плаваючих кнопках унизу.
        if (isSpeakingGlobal) document.body.classList.add('immersive-mode');
    }
    else if (state.ttsPaused) resumeTTS();
    else pauseTTS();
};
els.ttsStopBtn.onclick = stopGlobalTTS;

// Плаваюче керування поверх тексту
els.ttsToggle.onclick = (e) => {
    e.stopPropagation();
    if (!isSpeakingGlobal) return;
    state.ttsPaused ? resumeTTS() : pauseTTS();
};
els.ttsPrev.onclick = (e) => { e.stopPropagation(); stepSentence(-1); };
els.ttsNext.onclick = (e) => { e.stopPropagation(); stepSentence(1); };
