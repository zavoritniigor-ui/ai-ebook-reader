/* grammar-prompts.js — the prompts of the Ask AI panel and of Language level (buildAskPrompt, buildLanguageLevelPrompt).
 * Split out of grammar-svo.js on 2026-11-14 without changes. */
// ========== ЗАПИТ ДЛЯ ПАНЕЛІ "ЗАПИТАЙ AI" ==========
// Панель працює ВИКЛЮЧНО в контексті вивчення мови: значення слова, коли воно
// вживається, сталі сполучення й коротка граматична нота. Жодних енциклопедичних
// довідок про предмет — для цього є інші джерела.
function buildAskPrompt(term, sentence, userPrompt, langName) {
    // Передаємо не лише речення, а й абзац: за двома-трьома словами жанр не визначити,
    // а від жанру залежить, ЯК пояснювати — художній образ, науковий термін чи реалія.
    const para = state.lastAskParagraph && state.lastAskParagraph !== sentence
        ? `\nАбзац навколо: "${state.lastAskParagraph}".` : '';
    const ctx = sentence ? `\nРечення з тексту: "${sentence}".` : '';

    // Користувач ввів/наговорив своє запитання (typed/dictated question): ЦЕ і є головний
    // запит, а не "поясни вираз" — "Переклади це французькою" має перекласти, не отримати
    // розбір жанру. Фрагмент (якщо є) — лише матеріал для відповіді, не окрема вимога.
    if (userPrompt && term) {
        return `Читач книги виділив фрагмент тексту і ставить щодо нього запитання.
Фрагмент з книги (матеріал для відповіді, не окреме завдання): "${term}".${ctx}${para}
Запитання читача: "${userPrompt}"
Виконай САМЕ це запитання читача, використовуючи наведений фрагмент як матеріал/контекст. Відповідай ВИКЛЮЧНО ${langName}, у форматі HTML (без markdown, без \`\`\`). Не нав'язуй жодної фіксованої структури відповіді, якої читач сам не просив.`;
    }
    // Запитання без виділеного фрагмента: звичайне вільне запитання, без "поясни вираз".
    if (userPrompt) {
        return `Читач книги ставить запитання: "${userPrompt}"
Відповідай ВИКЛЮЧНО ${langName}, у форматі HTML (без markdown, без \`\`\`). Стисло й по суті, без зайвої структури, якої читач не просив.`;
    }

    // Лише виділений фрагмент, без запитання: попереднє незмінне пояснення вислову.
    return `Поясни вираз "${term}" читачеві книги.${ctx}${para}
Відповідай ВИКЛЮЧНО ${langName}, у форматі HTML (без markdown, без \`\`\`). Усі заголовки та текст також переклади ${langName}. Стисло — до 5 коротких пунктів. Виділяй ключове тегом <b>.

СПОЧАТКУ сам визнач за контекстом, ЯКОГО РОДУ цей текст і що саме перед тобою — навіть якщо вирвано лише два-три слова. Почни відповідь одним рядком: <b>Контекст:</b> (переклади слово "Контекст" на ${langName}) і тип (художній текст / науковий чи технічний / історичний / юридичний чи офіційний / побутовий / граматична конструкція).

Далі дай пояснення, що відповідає САМЕ цьому типу:
• художній — образ, метафора, відтінок, що автор хотів передати;
• науковий або технічний — що це таке й принцип дії простими словами;
• історичний — хто/що це, коли, чим важливе;
• юридичний або офіційний — що означає на практиці;
• побутовий — реалія, звичай, як це виглядає в житті;
• граматична конструкція — що це за конструкція і як вона працює.

Якщо вираз багатозначний, спершу дай значення, яке підходить до цього контексту, і лише потім згадай інші одним рядком.`;
}

// Окремий розбір "для вивчення мови": рівень CEFR і спрощення до потрібного рівня.
function buildLanguageLevelPrompt(fragment, sentence, langName) {
    const ctx = (sentence && sentence !== fragment) ? `\nПовне речення: "${sentence}".` : '';
    // Мова оригіналу визначає, якою мовою робити спрощення: англійське речення
    // спрощується англійською, французьке — французькою. Раніше спрощення завжди
    // видавалось французькою, навіть для англійського тексту.
    //
    // detectLang(sentence||fragment) визначає мову ВСЬОГО контексту "за більшістю
    // символів" — і саме тому ламався якраз на двомовних реченнях із перекладом У
    // ДУЖКАХ ("The house is big (La maison est grande)."): переклад часто ДОВШИЙ за
    // оригінал, тож detectLang діставав мову ПЕРЕКЛАДУ, а не самого фрагмента, який
    // тапнув/виділив користувач — фрагмент англійською йшов у AI як "французькою", і
    // навпаки. fragmentLangInContext шукає позицію САМЕ фрагмента в контексті й бере
    // мову лише того відрізка; на detectLang лишаємось тільки коли фрагмент не
    // знайдено в контексті (позиційний метод незастосовний).
    const found = fragmentLangInContext(fragment, sentence || fragment);
    const src = found === 'fr' ? 'fr-FR' : found === 'en' ? 'en-US' : detectLang(sentence || fragment);
    const srcName = src.startsWith('fr') ? 'французькою' : 'англійською';
    // Англійський фрагмент у підручнику ФРАНЦУЗЬКОЇ (пояснення чи завдання англійською, як у a bilingual French/English grammar workbook):
    // учень вивчає французьку, тож варіанти A2/B1 — французькою (той самий зміст), а не англійською (скарга користувача).
    // Мову навчання сторінки визначає та сама rulesStudyLang, що й у вікні «Правила» (js/grammar-rules.js).
    const pageText = typeof collectVisibleText === 'function' ? collectVisibleText().text : '';
    const studyFr = !src.startsWith('fr') && typeof rulesStudyLang === 'function' && rulesStudyLang(pageText) === 'fr';
    const exName = studyFr ? 'французькою' : srcName;
    const sameLang = studyFr
        ? `ВАЖЛИВО: це текст із підручника ФРАНЦУЗЬКОЇ мови, читач вивчає французьку. Рівень і «що складного» оціни для того, як цей зміст звучить ФРАНЦУЗЬКОЮ; спрощені варіанти A2 і B1 пиши ФРАНЦУЗЬКОЮ — той самий зміст, переданий французькою, — а не ${srcName}.`
        : `ВАЖЛИВО: спрощені варіанти мають бути ТІЄЮ САМОЮ мовою, що й оригінал — ${srcName}. Не перекладай сам фрагмент іншою мовою.`;
    return `Мовний розбір фрагмента ${srcName}: "${fragment}".${ctx}
Пояснення давай ВИКЛЮЧНО ${langName}, у форматі HTML (без markdown, без \`\`\`). Усі заголовки тексту також переклади ${langName}. Стисло, без води.

${sameLang}

РОЗМІТКА (обов'язково саме така, вона потрібна для кольорового виділення):
• позначку рівня став як <span class="lvl" data-l="B1">B1</span>, підставляючи потрібний рівень;
• кожен варіант спрощення обгортай як <div class="lvl-block" data-l="A2"> … </div>.

Дай саме цю структуру (але слова "Рівень" та "Що складного" обов'язково переклади ${langName}):
1. <b>Рівень:</b> <span class="lvl" data-l="…">…</span> — і <b>чому</b> саме такий: назви конкретно, що піднімає рівень (час дієслова, спосіб, конструкція, лексика).
2. <b>Що складного</b> — 1–3 конкретні місця, які ускладнюють розуміння.
3. <div class="lvl-block" data-l="A2"> спрощення до A2 ${exName}, а поруч у дужках переклад ${langName} </div>
4. <div class="lvl-block" data-l="B1"> те саме на рівні B1, так само ${exName} з перекладом </div>
Зміст у спрощеннях має лишитись тим самим — міняється лише складність мови.`;
}

// Мовний розбір: рівень CEFR і спрощення до A2/B1 для останнього виділеного фрагмента.
document.getElementById('btn-lang-level').onclick = () => {
    // Get context from Quick Wheel if action was triggered through it, otherwise use current state
    const wheelContext = typeof getQuickWheelLearningContext === 'function' ? getQuickWheelLearningContext() : null;
    const context = wheelContext || {
        selectionText: typeof currentReaderSelectionText === 'function' ? currentReaderSelectionText() : '',
        lastAskContext: state.lastAskContext,
        lastGrammarSentence: state.lastGrammarSentence,
        lastReaderHelpContext
    };
    const frag = context.selectionText || context.lastAskContext || context.lastGrammarSentence;
    if (!frag) { showToast(t('selectFirst')); return; }
    // No AI configured: say so and change nothing -- the reader's typed Ask question stays in the field and no
    // "help requested" is recorded for a request that never happened (audit P1-3). The panel still opens.
    if (!aiCanAnswer()) { showToast(t('needKey')); els.askPanel.classList.add('expanded'); return; }
    if (context.lastReaderHelpContext) recordHelpForSpan(context.lastReaderHelpContext, 'ask_ai');
    if (els.askInput) els.askInput.value = '';
    // An explicit selection action: this IS the new context a typed follow-up question may use.
    state.lastAskContext = frag;
    startAiTask(frag, 'level');
    els.askPanel.classList.add('expanded');
};



document.getElementById('btn-explain').onclick = () => {
    // Get context from Quick Wheel if action was triggered through it, otherwise use current state
    const wheelContext = typeof getQuickWheelLearningContext === 'function' ? getQuickWheelLearningContext() : null;
    const context = wheelContext || {
        selectionText: typeof currentReaderSelectionText === 'function' ? currentReaderSelectionText() : '',
        lastAskContext: state.lastAskContext,
        lastGrammarSentence: state.lastGrammarSentence,
        lastReaderHelpContext
    };
    const frag = context.selectionText || context.lastAskContext || context.lastGrammarSentence;
    if (!frag) { showToast(t('selectFirst')); return; }
    // No AI configured: say so and change nothing -- the reader's typed Ask question stays in the field and no
    // "help requested" is recorded for a request that never happened (audit P1-3). The panel still opens.
    if (!aiCanAnswer()) { showToast(t('needKey')); els.askPanel.classList.add('expanded'); return; }
    if (context.lastReaderHelpContext) recordHelpForSpan(context.lastReaderHelpContext, 'ask_ai');
    if (els.askInput) els.askInput.value = '';
    // An explicit selection action: this IS the new context a typed follow-up question may use.
    state.lastAskContext = frag;
    startAiTask(frag, 'ask');
    els.askPanel.classList.add('expanded');
};
