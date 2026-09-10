/* translation.js — переклад слова/фрагмента у спливаючій підказці й у панелях AI:
 * вирівнювання оригінал↔переклад (exactSpan/validateAlignment/installAlignment/
 * flashAlignment/alignmentSourceAt через CSS Custom Highlight API), головний
 * обробник тапу/виділення (handleWordOrSelection — дістає й показує переклад,
 * а також підключає кнопки підказки: озвучення, SVO, AI/Ask, розгортання —
 * самі ці функції лишаються в інших модулях, викликаються лише з onclick, тобто
 * відкладено, а не одразу під час завантаження), mainTranslationText/
 * buildTranslationExtras, локальний перекладач Chrome (Translator API, офлайн),
 * розпізнавання англійських фразових дієслів для якості перекладу, і переклад
 * прямо в панелях AI (translatePanelPoint, кнопка "Перекласти").
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/selection.js: залежить від її sentenceRangeAt/paragraphRangeAt/
 * selectRangeAndTranslate/wordToSentenceEndRangeAt/showSelectionHighlight (уже
 * визначені раніше) та від js/tts.js (speakText/speakInLang/setSpeakSide/
 * stopTooltipSpeech, теж уже завантажені). aiTranslateText/machineTranslate
 * (js/ai-client.js) та startAiTask/analyzeSVO (поки що в index.html, Крок 8) —
 * форвард-виклики лише всередині callback'ів/async-функцій, це безпечно, бо
 * викликаються не одразу — той самий механізм, що вже описаний у
 * js/pdf-render.js для pdfAnchor. selection.js, зі свого боку, так само
 * форвард-викликає handleWordOrSelection із цього файлу (визначений нижче за
 * документом, ніж її власний тег) — теж лише всередині callback'ів.
 */

// Meaning links contain exact, unique substrings, never positional guesses.
function exactSpan(text, piece) {
    if (typeof piece !== 'string' || !piece.trim()) return null;
    const start = text.indexOf(piece), end = start + piece.length;
    if (start < 0 || text.indexOf(piece, start + 1) !== -1) return null;
    const letter = c => c && /[\p{L}\p{N}]/u.test(c);
    if ((letter(text[start-1]) && letter(piece[0])) || (letter(text[end]) && letter(piece.at(-1)))) return null;
    return { start, end };
}
function validateAlignment(source, translation, links) {
    if (!Array.isArray(links)) return [];
    const valid = [];
    for (const link of links.slice(0, 40)) {
        if (!link || link.confidence !== 'high' || !Array.isArray(link.source) || !link.source.length || link.source.length > 6) continue;
        const target = exactSpan(translation, link.target);
        const sourceSpans = link.source.map(piece => exactSpan(source, piece));
        if (!target || sourceSpans.some(span => !span)) continue;
        const sorted = [...sourceSpans].sort((a,b) => a.start-b.start);
        if (sorted.some((span,i) => i && span.start < sorted[i-1].end)) continue;
        valid.push({ source: sourceSpans, target });
    }
    // Conflicting targets are ambiguous: discard all conflicting links.
    return valid.filter((link,i) => !valid.some((other,j) => i !== j && link.target.start < other.target.end && other.target.start < link.target.end));
}
function rangeAtTextOffsets(root, start, end) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange(); let offset = 0, began = false, node;
    while (node = walker.nextNode()) {
        const next = offset + node.length;
        if (!began && start < next) { range.setStart(node, Math.max(0, start-offset)); began = true; }
        if (began && end <= next) { range.setEnd(node, end-offset); return range; }
        offset = next;
    }
    return null;
}
let activeAlignment = null, alignmentTimer, lastReaderHelpContext = null;
const alignmentFlash = document.createElement('div'); alignmentFlash.id = 'alignment-flash';
alignmentFlash.setAttribute('aria-hidden', 'true'); document.body.appendChild(alignmentFlash);
function clearAlignmentFlash() {
    clearTimeout(alignmentTimer); alignmentFlash.replaceChildren();
    els.ttTranslation.querySelectorAll('.alignment-active').forEach(el => el.classList.remove('alignment-active'));
}
function clearAlignment() { activeAlignment = null; clearAlignmentFlash(); }
function sourceAlignmentRanges(link) {
    if (!activeAlignment?.root.isConnected) return [];
    const { root, source } = activeAlignment;
    const location = exactSpan(root.textContent, source);
    if (!location) return [];
    return link.source.map(span => rangeAtTextOffsets(root, location.start+span.start, location.start+span.end)).filter(Boolean);
}
function installAlignment(source, result, root) {
    if (!result.alignment?.length || !root?.isConnected || !exactSpan(root.textContent, source)) return;
    activeAlignment = { source, root, links: result.alignment };
    const fragment = document.createDocumentFragment(); let cursor = 0;
    const ordered = result.alignment.map((link,index) => ({ ...link, index })).sort((a,b) => a.target.start-b.target.start);
    for (const link of ordered) {
        fragment.append(document.createTextNode(result.translation.slice(cursor, link.target.start)));
        const span = document.createElement('span'); span.className = 'alignment-word';
        span.dataset.alignment = link.index; span.tabIndex = 0; span.setAttribute('role','button');
        span.textContent = result.translation.slice(link.target.start, link.target.end);
        span.title = link.source.map(part => source.slice(part.start,part.end)).join(' … ');
        fragment.append(span); cursor = link.target.end;
    }
    fragment.append(document.createTextNode(result.translation.slice(cursor)));
    const note = document.createElement('span'); note.className = 'tt-note'; note.textContent = ' ⚡';
    els.ttTranslation.replaceChildren(fragment, note);
}
function flashAlignment(index) {
    const link = activeAlignment?.links[index]; if (!link) return;
    const ranges = sourceAlignmentRanges(link); if (ranges.length !== link.source.length) return;
    clearAlignmentFlash(); cancelTooltipHide();
    const button = els.ttTranslation.querySelector(`[data-alignment="${index}"]`);
    button?.classList.add('alignment-active');
    for (const range of ranges) for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue;
        const mark = document.createElement('i');
        Object.assign(mark.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
        alignmentFlash.append(mark);
    }
    alignmentTimer = setTimeout(clearAlignmentFlash, 1000);
}
function alignmentSourceAt(x,y) {
    if (!activeAlignment || els.tooltip.style.display !== 'flex' || state.inkMode || document.body.classList.contains('region-mode')) return null;
    const hit = document.elementFromPoint(x,y);
    if (!hit || !activeAlignment.root.contains(hit)) return null;
    for (let i=0; i<activeAlignment.links.length; i++) {
        const ranges = sourceAlignmentRanges(activeAlignment.links[i]);
        if (ranges.some(range => [...range.getClientRects()].some(r => x>=r.left && x<=r.right && y>=r.top && y<=r.bottom))) return i;
    }
    return null;
}
els.ttTranslation.addEventListener('click', e => {
    const word = e.target.closest('[data-alignment]');
    if (word) { e.stopPropagation(); flashAlignment(Number(word.dataset.alignment)); }
});
els.ttTranslation.addEventListener('keydown', e => {
    const word = e.target.closest('[data-alignment]');
    if (word && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flashAlignment(Number(word.dataset.alignment)); }
});
document.addEventListener('click', e => {
    if (state.suppressNextClick || (state.format === 'pdf' && pdfBlockClick)) return;
    const index = alignmentSourceAt(e.clientX,e.clientY);
    if (index !== null) { e.preventDefault(); e.stopPropagation(); flashAlignment(index); }
}, true);
document.addEventListener('scroll', clearAlignmentFlash, true);
window.addEventListener('resize', clearAlignmentFlash);

async function handleWordOrSelection(text, clientX, clientY, anchorRect, helpContext = null, helpSource = null) {
    const cleanText = text.trim(); if (!cleanText) return;
    clearAlignment();
    const isMultiWord = cleanText.split(/\s+/).length > 1;
    const lookupNode = state.lastSelectedRange?.startContainer || state.lastWordNode;
    const lookupRoot = [els.pages, els.askContent, els.grammarContent].find(root => lookupNode && root.contains(lookupNode)) || els.pages;
    // Normal callers resolve the span before highlighting mutates it. This fallback
    // keeps direct/future translation entry points on the same centralized API.
    if (!helpContext) {
        const selected = state.lastSelectedRange;
        const readerTarget = selected && els.pages.contains(selected.startContainer) && els.pages.contains(selected.endContainer)
            ? selected : state.lastWordNode && els.pages.contains(state.lastWordNode) ? state.lastWordNode : null;
        if (readerTarget) helpContext = recordHelpForSpan(readerTarget, helpSource || (isMultiWord ? 'phrase_translation' : 'word_tap'));
    }
    if (helpContext) lastReaderHelpContext = helpContext;
    const task = beginAsyncTask('lookup');
    svoToken++; cancelAsyncTasks(['svo']);
    const contextSentence = state.ctxSentence;
    const targetLang = state.targetLang;
    // Контекст для кнопок "AI"/"Ask" беремо ОДРАЗУ тут, поки clientX/clientY ще
    // відповідають реальному положенню тексту на екрані — а не пізніше, у самих
    // onclick, де це були б stale screen-координати з моменту тапу. Якщо між тапом і
    // натисканням кнопки сторінка встигла проскролитись/перезумитись/перерендеритись
    // (найпомітніше — Ctrl+колесо: transform застосовується одразу, а renderPdfPage
    // лише за 220мс), повторний sentenceRangeAt(тими самими x,y) поцілив би вже в інший
    // фрагмент тексту. Рядок-текст, на відміну від координат чи Range, лишається
    // коректним незалежно від того, що станеться з DOM/зумом далі.
    let tapContextSentence = '';
    try {
        const r = sentenceRangeAt(clientX, clientY);
        if (r) tapContextSentence = r.toString().trim().slice(0, 400);
    } catch (e) {}
    let tapContextParagraph = '';
    try {
        const pr = paragraphRangeAt(clientX, clientY);
        if (pr) tapContextParagraph = pr.toString().trim().slice(0, 1000);
    } catch (e) {}
    // Переклад кількох слів або цілого речення читається довше, тому таке вікно НЕ
    // закривається саме — воно лишається, доки не тапнути наступне слово чи вбік.
    state.tooltipPersistent = isMultiWord;
    state.speakResume = null;      // нове слово — стара позиція вже не має сенсу
    // Автоозвучення йде тією стороною, чий динамік натискали останнім: оригінал —
    // одразу, переклад — після того, як він надійде (нижче).
    if (state.speakSide === 'original') speakText(cleanText, 'orig');
    updateSpeakSideUI();
    
    // Спочатку заповнюємо вміст, і ЛИШЕ ПОТІМ міряємо. Раніше розмір знімався, поки
    // у вікні ще стояло "Переклад...", тому довгий переклад речення розсовував вікно
    // вже після позиціонування — і воно виїжджало за край екрана.
    els.ttOriginal.textContent = cleanText;
    els.ttTranslation.textContent = t('translating');
    els.tooltip.style.visibility = 'hidden';
    els.tooltip.style.display = 'flex';
    positionTooltip(clientX, clientY, anchorRect);
    els.tooltip.style.visibility = 'visible';
    state.tooltipAnchor = { clientX, clientY, anchorRect };
    if (isMultiWord) cancelTooltipHide(); else scheduleTooltipHide();

    // Динамік оригіналу: озвучує оригінал і робить його активною стороною.
    // Динамік оригіналу — перемикач: клац читає, повторний клац зупиняє, наступний
    // продовжує з місця зупинки.
    els.ttReplayBtn.onclick = (e) => {
        e.stopPropagation();
        cancelTooltipHide();
        if (state.speakingSide === 'orig') { stopTooltipSpeech(); return; }
        setSpeakSide('original');
        const r = state.speakResume;
        const from = (r && r.side === 'orig' && r.pos < cleanText.length - 1) ? r.pos : 0;
        state.speakResume = null;
        speakText(cleanText, 'orig', from);
    };
    // Кнопка потрібна лише для довгих фрагментів: окреме слово нема куди "зв'язувати",
    // а токени витрачались би ті самі. Для слів працює словникова стаття.
    // Розбір на члени речення — теж лише для фрагмента з кількох слів.
    els.ttSvoBtn.style.display = '';
    els.ttSvoBtn.onclick = (e) => {
        e.stopPropagation();
        cancelTooltipHide();
        if (helpContext) recordHelpForSpan(helpContext, 'grammar');
        analyzeSVO(state.ctxSentence || cleanText);
    };
    // Динамік перекладу: озвучує переклад ОБРАНОЮ мовою і робить його активною стороною.
    els.ttSpeakTranslation.onclick = (e) => {
        e.stopPropagation();
        cancelTooltipHide();
        if (state.speakingSide === 'tr') { stopTooltipSpeech(); return; }
        setSpeakSide('translation');
        const txt = mainTranslationText();
        const r2 = state.speakResume;
        const from2 = (r2 && r2.side === 'tr' && r2.pos < txt.length - 1) ? r2.pos : 0;
        state.speakResume = null;
        speakInLang(txt, state.targetLang, 'tr', from2);
    };
    // Кнопка розширення: слово → речення → абзац (альтернатива утриманню пальця).
    // Кнопка виділення: 1-е натискання — від слова ДО КІНЦЯ РЕЧЕННЯ (до крапки),
    // 2-е — усе речення повністю, 3-є — весь абзац.
    els.ttExpandBtn.onclick = (e) => {
        e.stopPropagation();
        cancelTooltipHide();
        const p = state.lastTapPoint;
        if (!p) return;
        if (state.expandLevel === 0) {
            state.expandLevel = 1;
            selectRangeAndTranslate(wordToSentenceEndRangeAt(p.x, p.y), p.x, p.y, 'phrase_translation');
        } else if (state.expandLevel === 1) {
            state.expandLevel = 2;
            selectRangeAndTranslate(sentenceRangeAt(p.x, p.y), p.x, p.y, 'sentence_translation');
        } else {
            state.expandLevel = 3;
            selectRangeAndTranslate(paragraphRangeAt(p.x, p.y), p.x, p.y, 'paragraph_translation');
        }
    };

    els.ttAiBtn.onclick = (e) => {
        e.stopPropagation();
        cancelTooltipHide();
        els.tooltip.style.display = 'none';
        if (helpContext) recordHelpForSpan(helpContext, 'grammar');
        // Передаємо речення, у якому стоїть слово: без контексту неможливо визначити,
        // яка саме це форма (час, особа), а саме це й потрібно для навчання. Контекст —
        // tapContextSentence, зібраний ще В МОМЕНТ ТАПУ (замкнення вище), а НЕ повторний
        // sentenceRangeAt(state.lastTapPoint) тут: до натискання кнопки сторінка могла
        // прокрутитись/перезумитись, і ті самі координати вказували б уже на інший текст.
        state.lastGrammarSentence = (tapContextSentence && tapContextSentence !== cleanText) ? tapContextSentence : '';
        startAiTask(cleanText, 'grammar');
    };
    els.ttAskBtn.onclick = (e) => {
        e.stopPropagation();
        cancelTooltipHide();
        els.tooltip.style.display = 'none';
        if (helpContext) recordHelpForSpan(helpContext, 'ask_ai');
        // Те саме речення-контекст, що й для граматики (з моменту тапу, не stale-координат).
        state.lastGrammarSentence = (tapContextSentence && tapContextSentence !== cleanText) ? tapContextSentence : '';
        state.lastAskParagraph = tapContextParagraph;
        // Пріоритет — мовний розбір: саме він потрібен найчастіше. Енциклопедичне
        // пояснення лишається окремою кнопкою в самій панелі, за запитом.
        startAiTask(cleanText, 'level');
    };

    // Мова оригіналу — за САМИМ фрагментом і його контекстом, а не за сторінкою.
    // У двомовній книзі (і в панелі AI, де текст може бути іншою мовою) сторінка не
    // показник: французьке "par" на англійській сторінці перекладалось як англійське.
    const srcCode = langForText(cleanText).slice(0, 2);
    // Ключ кешу містить і мову ОРИГІНАЛУ. Без цього слово, перекладене раз в
    // англійській книзі, поверталося з того ж кешу у французькій — саме тому
    // "car" (фр. "оскільки") показувалось як "автомобіль", і саме з другого разу.
    // Переклад слова тепер залежить від речення, тому в ключ кешу входить і контекст:
    // "fait" у різних реченнях — це різні значення, і одне не має підміняти інше.
    const ctxKey = isMultiWord ? '' : '@' + (state.ctxSentence || '').slice(0, 80).toLowerCase();
    const cacheKey = srcCode + '>' + state.targetLang + '|' + (isMultiWord ? cleanText : cleanText.toLowerCase()) + ctxKey;
    const myLookup = ++state.lookupToken;   // щоб пізня відповідь не перебила новий тап

    let alignmentResult = null;
    if (state.translationCache[cacheKey]) {
        const cached = state.translationCache[cacheKey];
        els.ttTranslation.innerHTML = typeof cached === 'string' ? cached : cached.html;
        alignmentResult = typeof cached === 'object' ? cached : null;
    } else {
        // Groq відповідає настільки швидко, що змагатися з машинним перекладом
        // немає сенсу: онлайн усе перекладає AI — і слова, і речення. Машинний
        // лишається виключно як запасний варіант, коли немає мережі або ключа.
        let html = null;
        const ai = await aiTranslateText(cleanText, srcCode, task.signal, targetLang, contextSentence, isMultiWord && cleanText.length <= 2000);
        if (myLookup !== state.lookupToken || !task.current()) return;
        if (ai) {
            alignmentResult = typeof ai === 'object' ? ai : null;
            html = escapeHtml(alignmentResult ? ai.translation : ai) + ' <span class="tt-note">⚡</span>';
            els.ttTranslation.innerHTML = html;
            // Для окремого слова додаємо словникові значення: вони не дублюють
            // переклад, а показують інші можливі значення.
            if (!isMultiWord) {
                try {
                    const m = await machineTranslate(cleanText, srcCode, isMultiWord, task.signal, targetLang);
                    if (myLookup !== state.lookupToken || !task.current()) return;
                    if (m.extras) html += m.extras;
                } catch (e) {}
            }
        } else {
            try {
                const m = await machineTranslate(cleanText, srcCode, isMultiWord, task.signal, targetLang);
                if (myLookup !== state.lookupToken || !task.current()) return;
                html = m.html;
            } catch (e) {
                if (myLookup !== state.lookupToken || !task.current()) return;
                els.ttTranslation.textContent = e.message || t('error');
            }
        }
        if (!task.current()) return;
        if (html) {
            els.ttTranslation.innerHTML = html;
            state.translationCache[cacheKey] = alignmentResult ? { ...alignmentResult, html } : html;
        }
    }
    if (task.current() && alignmentResult) installAlignment(cleanText, alignmentResult, lookupRoot);
    // Якщо активна сторона — переклад, озвучуємо його саме зараз: раніше тексту
    // ще не існувало, бо він приходить із мережі.
    if (task.current() && els.tooltip.style.display !== 'none' && state.speakSide === 'translation') speakInLang(mainTranslationText(), targetLang, 'tr');
    // Переклад прийшов і змінив розмір вікна — розміщуємо його заново вже за
    // фактичними розмірами, інакше довгий текст виштовхував би вікно за край.
    const a = state.tooltipAnchor;
    if (a) positionTooltip(a.clientX, a.clientY, a.anchorRect);
    // Для одного слова відлік починаємо заново від моменту, коли переклад справді
    // з'явився на екрані. Для речення таймера немає взагалі — вікно лишається відкритим.
    if (!isMultiWord) scheduleTooltipHide();


}

// Лише основний переклад, без переліку значень і службової позначки — саме його
// озвучуємо, інакше динамік зачитував би весь словниковий список.
function mainTranslationText() {
    const clone = els.ttTranslation.cloneNode(true);
    clone.querySelectorAll('.tt-extra, .tt-note, .tt-ai-line').forEach(n => n.remove());
    return clone.textContent.trim();
}

// Розбирає додаткові секції відповіді перекладача: для окремого слова — словникову
// статтю (усі значення за частинами мови), для фрагмента — альтернативні варіанти.
// Саме брак переліку значень і робив переклад окремого слова неоднозначним.
function buildTranslationExtras(data, mainTranslation) {
    const main = (mainTranslation || '').trim().toLowerCase();
    let out = '';

    // data[1] — словникова стаття: [частина мови, [значення...], ...]
    const dict = Array.isArray(data[1]) ? data[1] : null;
    if (dict && dict.length) {
        const rows = [];
        dict.forEach(entry => {
            const pos = entry && entry[0];
            const terms = Array.isArray(entry && entry[1]) ? entry[1] : [];
            const list = terms.filter(t => t && t.trim().toLowerCase() !== main).slice(0, 6);
            if (list.length) rows.push(`<div class="tt-sense"><span class="tt-pos">${escapeHtml(pos || '')}</span> ${escapeHtml(list.join(', '))}</div>`);
        });
        if (rows.length) out += `<div class="tt-extra">${rows.join('')}</div>`;
        return out;
    }

    // data[5] — альтернативні переклади фрагмента
    let alts = [];
    try {
        (data[5] || []).forEach(seg => {
            (seg[2] || []).forEach(a => { if (a && a[0]) alts.push(a[0]); });
        });
    } catch (e) {}
    alts = [...new Set(alts.filter(a => a.trim().toLowerCase() !== main))].slice(0, 2);
    if (alts.length) out += `<div class="tt-extra"><div class="tt-sense"><span class="tt-pos">${t('more')}</span> ${escapeHtml(alts.join(' · '))}</div></div>`;
    return out;
}

// ========== ЛОКАЛЬНИЙ ПЕРЕКЛАДАЧ CHROME (офлайн, без ключа) ==========
// Chrome має вбудовану модель перекладу, що працює прямо на пристрої. Важливо:
// вона доступна ЛИШЕ в Chrome на комп'ютері — на Android та iOS її немає. Тому це
// додатковий прошарок: де він є, працює миттєво й офлайн; де немає — усе як раніше.
const localTranslators = new Map();     // 'fr>uk' → Promise<Translator>
function localTranslationSupported() { return typeof self !== 'undefined' && 'Translator' in self; }

// showProgress: чи писати відсоток завантаження в els.progress — це той самий
// елемент, що й "сторінка X з Y". Годиться лише коли користувач АКТИВНО чекає на
// переклад (справжній виклик з translateLocally); тихий фоновий "розігрів" з
// warmLocalTranslator() нижче не повинен на мить підмінювати індикатор читання
// довільним відсотком завантаження мовного пакета, поки людина просто читає.
async function getLocalTranslator(src, tgt, showProgress = false) {
    if (!localTranslationSupported() || src === tgt) return null;
    const key = `${src}>${tgt}`;
    if (localTranslators.has(key)) return localTranslators.get(key);

    const epoch = readerEpoch.book;
    const p = (async () => {
        try {
            const availability = await Translator.availability({ sourceLanguage: src, targetLanguage: tgt });
            if (availability === 'unavailable') return null;
            // 'downloadable' — мовний пакет ще не завантажений; показуємо поступ,
            // бо перше завантаження може тривати помітно довго.
            return await Translator.create({
                sourceLanguage: src, targetLanguage: tgt,
                monitor(m) {
                    if (!showProgress) return;
                    m.addEventListener('downloadprogress', (e) => {
                        if (epoch !== readerEpoch.book) return;
                        const pct = Math.round((e.loaded || 0) * 100);
                        els.progress.textContent = `${t('loading')} ${pct}%`;
                    });
                }
            });
        } catch (e) { return null; }
    })();
    localTranslators.set(key, p);
    p.then(tr => { if (!tr && localTranslators.get(key) === p) localTranslators.delete(key); });
    return p;
}

// Переклад локальною моделлю. Повертає рядок або null, якщо недоступно.
async function translateLocally(text, src, tgt) {
    try {
        const tr = await getLocalTranslator(src, tgt, true);
        if (!tr) return null;
        const out = await tr.translate(text);
        return (out || '').trim() || null;
    } catch (e) { return null; }
}
// Заздалегідь запускає завантаження мовного пакета — щоб офлайн-переклад
// (Translator API) справді був готовий, коли зникне мережа. Без цього
// getLocalTranslator() практично ніколи не викликався, поки був онлайн: коли є
// ключ AI й мережа, aiTranslateText() завжди встигає першим, і machineTranslate/
// translateLocally узагалі не доходили до виконання — а самé завантаження
// моделі теж потребує мережі, тому "перший офлайн-переклад" завжди програвав.
// Викликається з updateSourceLang() (js/lang-detect.js, щоразу коли визначається
// мова книги/розділу) і зі зміни цільової мови (js/main.js) — двох єдиних місць,
// де відомі ОБИДВІ мови пари заздалегідь. Fire-and-forget: результат не потрібен,
// важливо лише дати старт завантаженню якомога раніше.
function warmLocalTranslator(srcLang, tgtLang) {
    if (!localTranslationSupported() || !navigator.onLine) return;
    const src = (srcLang || '').slice(0, 2), tgt = (tgtLang || '').slice(0, 2);
    if (!src || !tgt || src === tgt) return;
    getLocalTranslator(src, tgt).catch(() => {});
}

// ========== ФРАЗОВІ ДІЄСЛОВА (англійська) ==========
// Найслабше місце англійської: значення конструкції не виводиться зі слів. Тап на
// "up" у "give up" давав "вгору" — безглуздо. Тут знаходимо всю конструкцію навколо
// тапнутого слова й перекладаємо саме її.
const PHRASAL_VERBS = {
    back: ['up','down','off','out','away'],
    break: ['down','up','in','out','into','off','through'],
    bring: ['up','back','about','in','out','down','along','over'],
    call: ['off','back','up','on','out','for','in'],
    carry: ['on','out','off','over'],
    check: ['in','out','up','on','off'],
    clean: ['up','out','off'],
    come: ['back','in','out','up','across','along','over','down','apart','about','round','by','through'],
    cut: ['off','out','down','back','up','in'],
    do: ['up','over','without','away'],
    draw: ['up','on','out','back'],
    drop: ['off','out','in','by'],
    end: ['up'],
    fall: ['apart','behind','through','out','back','over','for','down'],
    figure: ['out'],
    fill: ['in','out','up'],
    find: ['out'],
    get: ['up','out','in','on','off','away','back','over','through','along','by','around','into','rid'],
    give: ['up','in','out','back','away','off'],
    go: ['on','out','back','over','through','up','down','off','away','ahead','along','by','for'],
    grow: ['up','into','out'],
    hand: ['in','out','over','down'],
    hang: ['on','up','out','around','over'],
    hold: ['on','up','back','out','off','down'],
    keep: ['on','up','out','away','off','back'],
    knock: ['out','down','over','off'],
    let: ['down','in','out','off'],
    look: ['up','after','for','into','out','over','forward','down','around','through','back'],
    make: ['up','out','off','over','for'],
    move: ['on','in','out','over','back'],
    pass: ['out','away','on','by','up'],
    pay: ['off','back','for','up'],
    pick: ['up','out','on'],
    point: ['out'],
    pull: ['over','up','out','off','through','down','apart'],
    put: ['on','off','up','out','down','away','back','through','together','aside'],
    run: ['out','into','over','away','through','up','down','off'],
    set: ['up','off','out','down','aside','back'],
    settle: ['down','in','for'],
    show: ['up','off','around'],
    shut: ['down','up','off'],
    sit: ['down','up','back','through'],
    sort: ['out'],
    stand: ['up','out','by','for','back'],
    start: ['over','out','up'],
    stay: ['up','out','in','away','behind'],
    take: ['off','on','out','up','over','back','down','in','apart','after','away'],
    talk: ['about','over','into','out','through','down'],
    think: ['about','over','through','up','of'],
    throw: ['away','out','up','off'],
    try: ['on','out'],
    turn: ['on','off','up','down','out','over','into','around','back','away'],
    wake: ['up'],
    watch: ['out','over'],
    work: ['out','on','off','through','up'],
    write: ['down','up','off','out']
};
const PHRASAL_PARTICLES = new Set(
    Object.values(PHRASAL_VERBS).reduce((a, b) => a.concat(b), [])
);
// Неправильні форми найпоширеніших дієслів — без них "gave up" не розпізналось би.
const IRREGULAR_TO_BASE = {
    gave:'give', given:'give', took:'take', taken:'take', came:'come', went:'go', gone:'go',
    got:'get', gotten:'get', made:'make', ran:'run', run:'run', brought:'bring', thought:'think',
    put:'put', set:'set', cut:'cut', let:'let', shut:'shut', held:'hold', kept:'keep',
    found:'find', fell:'fall', fallen:'fall', broke:'break', broken:'break', drew:'draw', drawn:'draw',
    grew:'grow', grown:'grow', threw:'throw', thrown:'throw', wrote:'write', written:'write',
    woke:'wake', woken:'wake', stood:'stand', sat:'sit', paid:'pay', hung:'hang',
    knocked:'knock', showed:'show', shown:'show'
};
// Можливі початкові форми слова: knows→know, running→run, tried→try тощо.
function verbBaseForms(w) {
    const s = w.toLowerCase();
    const out = new Set([s]);
    if (IRREGULAR_TO_BASE[s]) out.add(IRREGULAR_TO_BASE[s]);
    if (s.endsWith('ies') && s.length > 4) out.add(s.slice(0, -3) + 'y');
    if (s.endsWith('es') && s.length > 3) out.add(s.slice(0, -2));
    if (s.endsWith('s') && s.length > 2) out.add(s.slice(0, -1));
    if (s.endsWith('ied') && s.length > 4) out.add(s.slice(0, -3) + 'y');
    if (s.endsWith('ed') && s.length > 3) { out.add(s.slice(0, -2)); out.add(s.slice(0, -1)); }
    if (s.endsWith('ing') && s.length > 4) {
        out.add(s.slice(0, -3));
        out.add(s.slice(0, -3) + 'e');
        // running → run (подвоєна приголосна)
        const st = s.slice(0, -3);
        if (st.length > 2 && st[st.length - 1] === st[st.length - 2]) out.add(st.slice(0, -1));
    }
    return [...out];
}
// Шукає фразове дієслово навколо тапнутого слова в межах його речення.
// Повертає початкову форму конструкції ("give up") або null.
function detectPhrasalVerb(word, sentenceText) {
    if (!sentenceText || !word) return null;
    const tokens = sentenceText.split(/[^A-Za-z']+/).filter(Boolean);
    const lw = word.toLowerCase();

    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].toLowerCase() !== lw) continue;

        // Випадок 1: тапнули саме дієслово — шукаємо частку далі.
        for (const base of verbBaseForms(tokens[i])) {
            const particles = PHRASAL_VERBS[base];
            if (!particles) continue;
            // Дозволяємо до двох слів між дієсловом і часткою: "give it up".
            for (let gap = 1; gap <= 3 && i + gap < tokens.length; gap++) {
                const cand = tokens[i + gap].toLowerCase();
                if (particles.includes(cand)) return `${base} ${cand}`;
                if (gap === 1 && PHRASAL_PARTICLES.has(cand)) break; // інша частка — не наш випадок
            }
        }

        // Випадок 2: тапнули частку — шукаємо дієслово позаду.
        if (PHRASAL_PARTICLES.has(lw)) {
            for (let back = 1; back <= 3 && i - back >= 0; back++) {
                for (const base of verbBaseForms(tokens[i - back])) {
                    const particles = PHRASAL_VERBS[base];
                    if (particles && particles.includes(lw)) return `${base} ${lw}`;
                }
            }
        }
    }
    return null;
}

// ========== ПЕРЕКЛАД ПРЯМО В ПАНЕЛІ AI ==========
// Розбір пропонує спрощені варіанти французькою, і їх теж треба вміти перекласти.
// Тому тап по слову в самій панелі працює так само, як у тексті книги.
function translatePanelPoint(e, root) {
    if (e.target.closest('button, a, input, select, textarea') || root.closest('.loading')) return;
    const selection = window.getSelection();
    let text = '', range = null;
    if (selection?.rangeCount && !selection.isCollapsed) {
        const selected = selection.getRangeAt(0);
        if (root.contains(selected.startContainer) && root.contains(selected.endContainer)) {
            range = selected.cloneRange(); text = range.toString().trim().slice(0, AI_PROMPT_TEXT_MAX);
        }
    }
    // A displayed conjugated form/cell is a useful phrase, not separate words.
    const phrase = e.target.closest('.verb-forme, td');
    if (!text && phrase && root.contains(phrase) && phrase.textContent.trim().length <= 120) {
        range = document.createRange(); range.selectNodeContents(phrase); text = range.toString().trim();
    }
    const host = e.target.closest('.verb-forme, .lvl-block, tr, p, li, .verb-head, .verb-card') || e.target;
    state.ctxSentence = (host.textContent || '').trim().slice(0, 400);
    if (!text) text = selectWordAtPoint(e.clientX, e.clientY);
    if (!text) return;
    state.lastSelectedRange = range;
    state.lastSelectionText = range ? text : null;
    state.lastTapPoint = { x: e.clientX, y: e.clientY }; state.expandLevel = 0;
    if (range) { showSelectionHighlight(range); state.lastSelectionText = text; selection?.removeAllRanges(); }
    handleWordOrSelection(text, e.clientX, e.clientY, range?.getBoundingClientRect());
}
els.askContent.addEventListener('click', e => translatePanelPoint(e, els.askContent));
els.grammarContent.addEventListener('click', e => translatePanelPoint(e, els.grammarContent));
