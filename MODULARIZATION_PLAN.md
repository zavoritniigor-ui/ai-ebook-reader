Модульна архітектура AI Ebook Reader — аудит і план (read-only)
Аудит зроблено виключно читанням поточного index.html (5576 рядків, 201 named function, 111 інлайнових addEventListener/.onclick=, sw.js — 119 рядків, вже окремий файл). Нічого не редаговано.

ВИПРАВЛЕННЯ МЕХАНІЗМУ (зроблено на початку Step 1, під час фактичної реалізації): нижче в цьому документі скрізь, де йдеться про ES-модулі (import/export, window-експорт для тестів, ризик "тести — глобальні виклики"), МЕХАНІЗМ ЗАВАНТАЖЕННЯ файлів насправді буде іншим — звичайні класичні <script src="js/xxx.js"></script> БЕЗ type="module", а не ES-модулі. Причина: головний inline-скрипт застосунку — класичний (без defer/type=module), тобто виконується СИНХРОННО одразу, щойно парсер його досягає. Модуль (type="module") завжди виконується в defer-таймінгу — ПІСЛЯ повного парсингу документа. Якби core.js/інші файли стали ES-модулями, а решту коду (ще не перенесену) лишили класичним інлайн-скриптом, цей інлайн-скрипт виконався б РАНІШЕ, ніж модуль встиг би визначити state/els — миттєвий ReferenceError при кожному завантаженні сторінки. `defer` не рятує: він не діє на inline-скрипти (лише на зовнішні із src).
Рішення: усі перенесені файли — звичайні класичні `<script src="...">` (без type="module", без defer), підключені в document order ПЕРЕД рештою інлайн-скрипта — точно як jszip/mammoth підключені сьогодні. Класичні `<script>`-теги в одному документі ДІЛЯТЬ один спільний "script scope": `let`/`const`, оголошені в одному класичному `<script src>`, залишаються звичайними глобальними ідентифікаторами для БУДЬ-ЯКОГО наступного класичного `<script>` у тому самому документі — так само, як сьогодні через глобальну область самого файла. Це ПОВНІСТЮ знімає і ризик "ES-module live-bindings" (пункт нижче про readerEpoch/pdfTasks), і ризик "тести — глобальні виклики" (window-експорт не потрібен: усе й так лишається глобальним, як і зараз) — обидва описані нижче ризики стосувалися б лише СПРАВЖНІХ ES-модулів і тепер неактуальні для жодного з файлів у цьому плані. PDF.js лишається єдиним ES-модулем у проєкті (він і сьогодні type="module", і це не змінюється).

Ключові структурні факти, що визначають план
Один execution scope. Все — це один класичний <script> без модулів (окрім PDF.js, який вже type="module"). Будь-яка функція бачить будь-яку іншу й усі спільні змінні без import.
Дві "хребтові" спільні структури — state (об'єкт) і els (об'єкт з getElementById-посиланнями) — вже спроєктовані як мутовні об'єкти, а не примітиви. Це ідеальний патерн для модуляризації: об'єкт можна import-нути й мутувати його властивості з будь-якого файлу без проблем з ES-module live-bindings.
Небезпечний патерн: кілька голих let-змінних мутуються з функцій, які в новій структурі опиняться в різних файлах — найкритичніші: bookEpoch/renderEpoch (інкрементуються і в обробнику завантаження файлу, і в cancelPdfRender()), pdfRenderTask/pdfLoadingTask/pdfTextTask (мутуються з рендеру, з zoom/pan-скасування, і з PWA-lifecycle при згортанні застосунку). ES-модуль не дозволяє імпортувати let і переприсвоювати його ззовні — це синтаксична помилка. Потрібно обгорнути такі кластери в маленький мутовний об'єкт-контейнер (export const pdfTasks = {render:null, loading:null, text:null}), як уже зроблено для state/els. Це найризикованіша механічна деталь усієї міграції.
111 інлайнових обробників подій не прив'язані до жодної named-функції — вони й є значною частиною реальної логіки (pointermove/pointerup для pinch-zoom, wheel для Ctrl+zoom, click для десятків кнопок). План переносить кожен такий блок разом із функціями, яких він стосується (а не окремо в main.js), інакше файл "власника" виявиться неповним.
Тести — глобальні виклики. tests/pdf_ux_browser.py і tests/learning_ux_browser.py викликають initPdf, renderPdfPage, state, applyPdfZoom, sentenceRangeAt, pdfAnchor тощо як глобальні символи через Runtime.evaluate (CDP). ES-модуль не створює глобалів автоматично — функція, оголошена в модулі, недоступна ззовні, якщо явно не покласти її на window. Це найважливіший ризик для збереження зеленого baseline (деталі — у розділі "Ризики").
Запропонована файлова структура

index.html                 — тільки розмітка + <style> (без змін) + <script type="module" src="js/main.js">
sw.js                       — без змін структурно; APP_SHELL отримає нові js/*.js записи
js/
  core.js                   — state, els, константи (LANG_NAMES), epoch-контейнер, storage, safeHtml/escapeHtml,
                              async-tasks (asyncTasks/beginAsyncTask/cancelAsyncTasks), net-helpers, i18n (I18N/t/applyI18n)
  lang-detect.js            — мішана EN/FR евристика (detectLang/langForText/сегментація)
  tts.js                    — голоси, speakText/speakInLang, sentence playback/highlight, TTS-кнопки
  selection.js              — caret/hit-testing, sentenceRangeAt, PDF visual-order (pdfNearestSpan/pdfVisualGroup),
                              підсвітка виділення, тап по слову
  pdf-render.js             — initPdf, renderPdfPage, scrubber
  pdf-zoom-pan.js           — pinch/zoom/pan/gestures + їхні pointer/wheel-листенери
  pdf-ink.js                — перо/малювання
  pdf-crop.js               — область/кроп
  navigation.js             — пагінація, bookmarks, goNext/goPrev, footer-меню, TOC
  formats.js                — EPUB/DOCX/RTF/FB2/TXT завантажувачі + archive-guard wiring
  translation.js            — machineTranslate/aiTranslateText/локальний перекладач + alignment (підсвітка збігів слів)
  grammar-svo.js            — SVO-аналіз, дієслівна панель, побудова граматичних промптів
  ai-client.js              — callAI/callAIVision/vision-провайдери/aiAvailable/startAiTask
  dictation.js              — розпізнавання мовлення
  ui-tooltip.js             — позиціонування тултипа, handleWordOrSelection (оркестратор), панель налаштувань ключів
  onboarding.js             — discovery-підказки Ask/Grammar/TOC
  pwa-lifecycle.js          — standalone-детекція, Exit, фон/сон, overlay-стек (Android Back), update-банер
  main.js                   — bootstrap: import усіх модулів у правильному порядку, крос-модульний wiring
                              (обробник завантаження файлу, що диспетчерить у formats.js/pdf-render.js), реєстрація SW
18 JS-файлів — по одному на кожну з 14 названих категорій плюс 4 інфраструктурні (core, lang-detect, ai-client, formats), яких вимагає сам код. formats.js можна пізніше розбити на formats-epub.js/formats-richdoc.js/formats-txt.js, якщо виявиться завеликим — не обов'язково зараз, бо це не одна з явно названих категорій.

1. Map: функції → цільові файли
Цільовий файл	Функції з поточного index.html (рядки)
core.js	readStored(885), writeStored(888), safeHtml(900), beginAsyncTask(964), cancelAsyncTasks(973), invalidateSelection(976)†, showReaderError(986), waitForResult(990), fetchWithTimeout(1001), readResponseJson(1023), aiText(1027), readStoredNumber(1035), t(1381), applyI18n(1385), escapeHtml(3223) + об'єкти state(1039), els(1072), I18N(1227), LANG_NAMES(1402), asyncTasks Map(963), епох-контейнер (bookEpoch/renderEpoch, 961)
lang-detect.js	scoreWord(1484), tokenizeForLang(1500), classifyTokens(1504), sentenceBaseLang(1522), findForeignRuns(1557), buildLanguageSegments(1596), cyrillicLang(1622), detectLang(1628), updateSourceLang(1641), pageLang(1648), langForText(1654), voiceForLangCode(1677), voiceForText(1685)
tts.js	voiceQualityScore(1115), voiceGender(1145), pickVoicePair(1152), pickBestVoice(1164), loadVoices(1170), restoreVoiceSelectValue(1211), saveVoiceChoices(1216), stopTooltipSpeech(1692), updateSpeakerIcons(1703), bindUtterance(1711), speakText(1732), speakInLang(1744), setSpeakSide(2799), updateSpeakSideUI(2804), ttsHighlightSupported(5070), setTtsHighlight(5071), clearTtsHighlight(5075), buildSentenceRanges(5081)‡, pageIndexForRange(5124), updateTtsButtons(5136), stopGlobalTTS(5151), pauseTTS(5159), resumeTTS(5169), speakCurrentSentence(5174), stepSentence(5228), startTTS(5246), updateAltVoicesBtn(5265)
selection.js	caretRangeAt(1778), blockAncestorOf(1797), anchorCaret(1819), paragraphRangeAt(1829), pdfNearestSpan(1856), pdfTextSpans(1869), pdfVisualGroup(1873), buildSentenceRangesFromSpans(1918), sentenceRangeAt(1948), wrapRangeInSpans(1988), unwrapSpans(2012), showSelectionHighlight(2021), clearSelectionHighlight(2032), wordToSentenceEndRangeAt(2043), selectRangeAndTranslate(2076), selectWordAtPoint(2094), wordBoundsAt(2601), rangeBetweenWords(2717), clearLongPress(2296) + touch-стан (dragSel, touchStartX/Y)
pdf-render.js	initPdf(4600), renderPdfPage(4623), updatePdfScrubber(4740), commitPdfScrub(4746)
pdf-zoom-pan.js	rerenderPdfAtCurrentZoom(2380), rememberPdfFocus(2427), pdfBaseScale(2437), pdfAnchor(2438), restorePdfAnchor(2446), layoutPdfZoom(2453), applyPdfZoom(2463), persistPdfZoom(2467), setPdfScale(2472), cancelPdfRender(2478), cancelPdfInteraction(2483), pinchMetrics(2489), paintPdfGesture(2493), endPdfPointer(2550) + pdfPointers Map(2424), pointer/wheel-листенери
pdf-ink.js	inkCanvas(4260), inkPageKey(4261), inkStrokes(4262), saveInk(4266), loadInk(4270), redrawInk(4275), inkPoint(4296), updateInkWidth(4302), bindInkCanvas(4308), inkEraseAt(4340), updateInkTools(4358)
pdf-crop.js	exitRegionMode(4392), closeCropPreview(4433), openCropPreview(4437), cropPdfRegion(4487), checkExerciseImage(4516)§
navigation.js	columnStep(2149), paginateContainer(2157), goToPageInChapter(2180), updateProgressText(2201), bookKeyFor(2208), saveBookmark(2209), loadBookmark(2214), goNext(2223), goPrev(2230), openFooterMenu(2738), closeFooterMenu(2743), enterMobileFullScreenIfNeeded(2781), buildToc(5034)
formats.js	runArchiveGuard(4784), initEpub(4810), loadEpubChapter(4852), initRichDoc(4902), splitIntoChapters(4945), renderDocChapter(4960), fb2ToHtml(4978), rtfToHtml(4994), initTxt(5008), renderTxtPage(5018)
translation.js	mainTranslationText(3217), buildTranslationExtras(3229), machineTranslate(3576), aiTranslateText(3604), sanitizeAI(3643), localTranslationSupported(3715), getLocalTranslator(3717), translateLocally(3747) + alignment-кластер: exactSpan(2858), validateAlignment(2866), rangeAtTextOffsets(2881), clearAlignmentFlash(2895), clearAlignment(2899), sourceAlignmentRanges(2900), installAlignment(2907), flashAlignment(2924), alignmentSourceAt(2938), flattenRange(3267), rangeForSlice(3284)
grammar-svo.js	clearSvoHighlights(3296), localSVO(3323), buildSvoPrompt(3366), showSvoFailureNote(3400), analyzeSVO(3409), applySVOParts(3463), verbBaseForms(3832), detectPhrasalVerb(3852), buildGrammarPrompt(3889), buildConjugationPrompt(3925), buildAskPrompt(3948), buildLanguageLevelPrompt(3972), collectVerbsFromAnalysis(4163), renderVerbBar(4185), highlightActiveVerb(4200), showVerb(4211), selectVerb(4246)
ai-client.js	dataUrlMime(3515), visionViaGemini(3517), visionViaGroq(3533), callAIVision(3558), sanitizeAI†† повторно не переносити, aiAvailable(3664), callAI(3666), startAiTask(3164)
dictation.js	updateDictationUI(4003), stopDictation(4011), startDictationSession(4029), toggleDictation(4074)
ui-tooltip.js	scheduleTooltipHide(2810), cancelTooltipHide(2814), positionTooltip(2825), repositionTooltip(2848), handleWordOrSelection(2964), translatePanelPoint(4098), openKeySettings(5043), closeKeySettings(5049), saveApiKey(5052)
onboarding.js	stopOnboarding(5315), rememberOnboarding(5319), scheduleReaderOnboarding(5323) + onboardingGroups/ONBOARDING_KEY
pwa-lifecycle.js	isStandalonePwa(5367), stopBackgroundActivity(5375), persistCriticalState(5388), exitApp(5448), showToast(5456), topOpenOverlay(5494), countOpenOverlays(5495), closeTopOverlay(5496), syncOverlayHistory(5512), showUpdateBanner(5531) + OVERLAY_LAYERS, swRegistration
main.js	немає власних named-функцій сьогодні — увесь код завантаження файлу (els.upload.addEventListener('change', ...)), побудова els, стартова послідовність, реєстрація SW
† invalidateSelection логічно "selection", але торкається els.tooltip/state без виклику інших selection-функцій — залишаю в core.js, щоб уникнути циклу core → selection; альтернатива — залишити в selection.js й імпортувати звідти у core-споживачів (менш чисто). Вирішувати на місці під час переносу, це не змінює поведінку.
‡ buildSentenceRanges використовується і TTS (крокування реченнями), і selection.js (не-PDF гілка sentenceRangeAt) — коуплінг задокументовано нижче в графі залежностей.
§ checkExerciseImage викликає AI vision — фактично належить і crop, і ai-client; лишаю в pdf-crop.js, бо викликається лише з кроп-флоу, але у графі показано як споживача ai-client.js.
†† sanitizeAI вже врахована в translation.js.

2. Граф залежностей (хто кого імпортує)

core.js  ← (без залежностей, корінь)
   ↑
   ├── lang-detect.js
   ├── ai-client.js
   ├── selection.js ────────────────┐
   ├── pdf-render.js                │ (buildSentenceRanges,
   ├── onboarding.js                │  не-PDF гілка)
   │                                │
   ├── tts.js  ──────────────────────┘  (voiceForText ← lang-detect)
   │      ↑
   ├── translation.js  ← ai-client.js, lang-detect.js
   ├── grammar-svo.js  ← ai-client.js, selection.js (flattenRange/rangeForSlice)
   ├── navigation.js   ← pdf-render.js (goNext/goPrev вибирають шлях)
   ├── formats.js      ← navigation.js, core.js
   │
   ├── pdf-zoom-pan.js ← pdf-render.js
   ├── pdf-ink.js      ← pdf-render.js
   ├── pdf-crop.js     ← pdf-render.js, pdf-ink.js, ai-client.js (checkExerciseImage)
   │
   ├── dictation.js    ← core.js, ui-tooltip.js (мікрофон у ask-панелі)
   ├── ui-tooltip.js   ← selection.js, translation.js, tts.js, grammar-svo.js, ai-client.js
   │                     (handleWordOrSelection — головний оркестратор, найбільше вхідних ребер)
   │
   └── pwa-lifecycle.js ← pdf-zoom-pan.js, pdf-crop.js, tts.js, dictation.js, ui-tooltip.js, core.js
          (stopBackgroundActivity/closeTopOverlay зупиняють/закривають усе перелічене)

main.js ← імпортує всі модулі (порядок нижче), містить лише "клей", якого нема в жодному модулі
ui-tooltip.js і pwa-lifecycle.js — два вузли з найбільшою вхідною/вихідною валентністю відповідно; це і визначає, що вони мігрують останніми.

3. Порядок міграції (знизу вгору за глибиною залежностей)
Крок	Файл	Чому саме тут
0	Підготовчий, без переносу файлів: обгорнути bookEpoch/renderEpoch та pdfRenderTask/pdfLoadingTask/pdfTextTask у мутовні об'єкти-контейнери (як уже зроблено для state/els) — ще в межах поточного index.html, без розбиття на файли	Найризикованіша механічна зміна (live-binding проблема) — ізолювати й перевірити її ОКРЕМО від переносу файлів
1	core.js	Корінь графа, від нього залежить усе
2	lang-detect.js	Чиста текстова логіка, нуль DOM-залежностей, найнижчий ризик
3	ai-client.js	Залежить лише від core; від нього далі залежать translation/grammar-svo
4	selection.js	Залежить лише від core; не залежить від pdf-render (тільки CSS-клас .pdf-text-layer)
5	pdf-render.js	Залежить лише від core; незалежний від selection.js (нема ребра)
6	tts.js	Залежить від core + lang-detect + buildSentenceRanges уже є в tts.js власним (не з selection)
7	translation.js	Залежить від ai-client + lang-detect
8	grammar-svo.js	Залежить від ai-client + selection
9	navigation.js	Залежить від pdf-render (вибір шляху рендеру)
10	formats.js	Залежить від navigation + core
11	pdf-zoom-pan.js	Залежить від pdf-render
12	pdf-ink.js	Залежить від pdf-render
13	pdf-crop.js	Залежить від pdf-render + pdf-ink + ai-client
14	dictation.js	Залежить від core (+ м'яка залежність від ui-tooltip — мігрує до нього)
15	ui-tooltip.js	Найбільший споживач (selection+translation+tts+grammar+ai) — тільки після п.4,6,7,8,3
16	onboarding.js	Залежить лише від core, але логічно "закриває" список фіч, про які розповідає
17	pwa-lifecycle.js	Залежить від pdf-zoom-pan, pdf-crop, tts, dictation, ui-tooltip — обов'язково останній фічовий модуль
18	main.js + видалення старого коду з index.html	Фінальний крок: bootstrap, SW-реєстрація, апдейт sw.js APP_SHELL
19	ARCHITECTURE.md	Пишеться в кінці, коли структура вже стабільна й перевірена
Після кожного кроку файл index.html лишається робочим (перенесений модуль підключається через <script type="module">, а решта коду тимчасово лишається в старому inline-скрипті) — це дозволяє котитись назад одним git-revert без "напівпорізаного" стану.

4. Ризики
Глобальна доступність для тестів (найважливіше). tests/*.py викликають initPdf, renderPdfPage, state, applyPdfZoom, sentenceRangeAt, pdfAnchor, pdfVisualGroup, pdfTextSpans та ще з десяток символів як глобали через CDP Runtime.evaluate. ES-модуль нічого не кладе в window автоматично. Обов'язково: кожен модуль, чиї символи використовують тести (звірити напряму по tests/*.py, grep -o усіх ідентифікаторів, яких там викликають), в кінці явно робить window.initPdf = initPdf; тощо — це не "новий глобальний забруднювач", а буквально збереження поточної (вже глобальної) поведінки. Пропустити цей крок хоч для одного символу — і відповідний тест впаде з ReferenceError, як це вже сталося один раз під час попередньої роботи в цій сесії (кешований index.html без нової функції).
Live-binding vs контейнер-об'єкт для мутовних module-level змінних. Описано вище (п.0 плану) — якщо пропустити, отримаємо SyntaxError: Assignment to constant variable або мовчазне розходження стану між файлами (одна копія pdfRenderTask в одному модулі, інша — стара — в іншому).
Порядок виконання топ-рівневого коду. 111 інлайн-обробників подій виконуються сьогодні в певному текстовому порядку одного скрипта. Модулі виконуються по одному разу в порядку, який визначає граф залежностей (топологічне сортування), а не порядок import у main.js — це самокоригувальна властивість ES-модулів, але порядок РЕГІСТРАЦІЇ листенерів на ОДНОМУ й тому ж елементі (якщо такий випадок є) міг би змінитися. Перевірити: чи є місця, де ДВА різні модулі вішають listener на той самий елемент і порядок їх спрацювання має значення (за першим переглядом коду — не виявлено, але слід звірити при фактичному переносі).
sw.js APP_SHELL. Кожен новий js/*.js файл — новий ресурс, потрібний офлайн. Забути додати його в APP_SHELL (і підняти CACHE_NAME) — і встановлений PWA після оновлення матиме частину функціоналу відсутньою офлайн, хоча онлайн усе працюватиме (мовчазний баг, важко відловити без офлайн-тесту).
MIME/CSP для нових .js-файлів. Уже підтверджено під час міграції PDF.js, що і локальний python -m http.server, і Cloudflare Pages коректно віддають .js/.mjs — низький ризик, але варто перевірити ще раз для кожного нового файлу під час першого деплою.
invalidateSelection та інші "прикордонні" функції. Кілька функцій логічно належать одній категорії, але фізично зачіпають стан іншої (приклад: invalidateSelection у "core", хоча концептуально "selection"). Неправильний вибір файлу не зламає поведінку (це не залежить від файлової структури), але зменшить користь від "знайти по назві" — рекомендую явний коментар-покажчик у файлі, де очікується (наприклад, коментар у selection.js: "invalidateSelection живе в core.js, бо...").
Обсяг diff на кожному кроці. Навіть "мінімальний ризик" перенесення ~300-line файлу — це великий diff. Рекомендую переносити текст без жодних інших правок (copy-paste, не "покращувати по дорозі") — будь-яке одночасне рефакторення code-style під час переносу зробить регресію важчою для локалізації.
CSS не займаний. Явно поза межами цього плану (користувач просив розбиття тільки за категоріями поведінки) — не чіпати <style> в index.html.
5. Тести після кожного етапу
Після кроку	Обов'язково запустити	Додатково перевірити вручну
0 (епох/task-контейнери)	pdf_ux_browser.py + learning_ux_browser.py (повний прогін, без змін файлової структури — суто регресія на мутацію способу зберігання стану)	grep на всі місця, де bookEpoch++/renderEpoch++/pdfRenderTask = — переконатись, що жодного пропущеного прямого присвоєння не лишилось
1 core.js	Обидва набори тестів	typeof state, typeof els, typeof t, typeof safeHtml — усі 'object'/'function' у консолі
2 lang-detect.js	learning_ux_browser.py (містить detectLang-залежні кейси: French/Ukrainian structured translation)	—
3 ai-client.js	pdf_ux_browser.py (AI only after explicit action) + learning_ux_browser.py (grammar shared lookup)	Ручна перевірка: запит без ключа все ще показує needKey alert, а не ReferenceError
4 selection.js	pdf_ux_browser.py (tap word at 400%, translation screen overlay) + свіжий синтетичний 2-column PDF тест з попередньої задачі (10 тапів)	typeof sentenceRangeAt, typeof pdfVisualGroup, typeof pdfNearestSpan на window
5 pdf-render.js	Повний pdf_ux_browser.py (найбільш зачеплений файл)	canvas/text-layer exact-match тест (×1/×2/×4) з попереднього завдання — обов'язково повторити
6 tts.js	learning_ux_browser.py (dictation-незалежні TTS-кейси відсутні явно, але stepSentence/updateTtsButtons торкаються панелі)	Ручний прогін: TTS кнопка старт/пауза/продовжити на реальній сторінці
7 translation.js	learning_ux_browser.py (усі "structured translation"/"alignment" кейси — їх там більшість)	—
8 grammar-svo.js	learning_ux_browser.py (grammar shared lookup en/fr, grammar phrase preserves table)	Ручний SVO-запит на реченні з попередньої задачі
9 navigation.js	pdf_ux_browser.py (scrubber-кейси, landscape render and focus)	—
10 formats.js	Немає явних Python-тестів на EPUB/RTF/FB2/TXT у поточному наборі — ручна перевірка обов'язкова: відкрити реальний EPUB/DOCX/TXT файл	Розглянути додавання нового tests/formats_browser.py за тим самим CDP-патерном, якщо буде час
11 pdf-zoom-pan.js	Повний pdf_ux_browser.py (pinch/pan-кейсів там більшість)	Pinch→pan→tap і Ctrl+wheel→AI race тести з попереднього завдання
12 pdf-ink.js	pdf_ux_browser.py (fine ink stored in page coordinates, pinch rolls back accidental ink, ink unchanged after rerender)	—
13 pdf-crop.js	pdf_ux_browser.py (усі crop-кейси: preview/Save/Share/Copy, crop tracked by Back stack)	—
14 dictation.js	learning_ux_browser.py (усі dictation-кейси — їх там 11)	—
15 ui-tooltip.js	Обидва набори повністю (найбільший ризик регресії — handleWordOrSelection зачіпає майже все)	Stale-tap-point і multi-column тести з попередньої задачі — повторити обидва
16 onboarding.js	learning_ux_browser.py (усі 7 onboarding-кейсів)	Онбординг-тест Ask/Grammar/TOC з попередньої задачі
17 pwa-lifecycle.js	pdf_ux_browser.py ("background cancels render/tasks and persists")	Delayed standalone/minimal-ui/fullscreen тест з попередньої задачі; ручна офлайн-перевірка SW
18 main.js + прибирання старого коду	Повний прогін обох наборів + усі ручні тести з попередньої задачі одним заходом (це фінальна точка, де вперше все дійсно розбите)	15 швидких перегортань сторінок, нуль помилок консолі — фінальний smoke-test
19 ARCHITECTURE.md	— (документація, коду не чіпає)	Звірити, що кожен описаний у документі шлях справді існує
Загальне правило для кожного кроку: перед переносом — grep -n фінального стану функцій/змінних, які переносяться (код може дрейфувати між кроками); після переносу — git diff --stat має показувати вилучення рівно перенесеного блоку з index.html і появу нового файлу без інших змін; обидва тестові набори мають лишитись 100% зеленими (34/34 та 58/58) — будь-яке зменшення числа PASS — стоп-сигнал відкату кроку.