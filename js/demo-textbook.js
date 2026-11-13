/* demo-textbook.js — guided interactive tour on a real CC-BY textbook.
 *
 * Principle: Show -> Try it yourself -> Next feature.
 * Each section prepares the exact reader state, waits for real UI readiness
 * (never relying on bare fixed delays), runs the real reader controls, and
 * then hands control to the user for optional hands-on practice.
 */
Object.assign(I18N, {
    mDemoTextbook: { uk: 'Демо-підручник', en: 'Demo textbook', fr: 'Manuel de démonstration', ru: 'Демо-учебник', es: 'Libro de demostración' },
    mDemoTextbookDesc: { uk: 'Справжній PDF: переклад, озвучка, граматика, практика, аудіо й письмо', en: 'Real PDF: translation, speech, grammar, Practice, audio and writing', fr: 'PDF réel : traduction, voix, grammaire, pratique, audio et écriture', ru: 'Настоящий PDF: перевод, озвучка, грамматика, практика, аудио и письмо', es: 'PDF real: traducción, voz, gramática, práctica, audio y escritura' },
    demoKicker: { uk: 'Навчальний огляд', en: 'Guided tour', fr: 'Visite guidée', ru: 'Обучающий обзор', es: 'Recorrido guiado' },
    demoTitle: { uk: 'Français interactif', en: 'Français interactif', fr: 'Français interactif', ru: 'Français interactif', es: 'Français interactif' },
    demoAttribution: { uk: 'Відкритий матеріал COERLL, CC BY 4.0. Огляд використовує справжні функції, панелі, аудіоплеєр і письмо рідера.', en: 'Open COERLL material, CC BY 4.0. This tour uses the real reader features, panels, audio player and handwriting.', fr: 'Matériel COERLL ouvert, CC BY 4.0. Cette visite utilise les vraies fonctions, panneaux, lecteur audio et écriture.', ru: 'Открытый материал COERLL, CC BY 4.0. Обзор использует настоящие функции, панели, аудиоплеер и письмо ридера.', es: 'Material abierto de COERLL, CC BY 4.0. Este recorrido usa las funciones, paneles, reproductor y escritura reales.' },
    demoWelcome: { uk: 'Огляд покаже кожну можливість рідера на реальній сторінці: спершу автоматичний показ із підказкою місця дотику, а потім — вільна спроба без обмежень.', en: 'This tour demonstrates every reader capability on a real page: first an automatic walkthrough with touch cues, then free hands-on practice.', fr: 'Cette visite montre chaque fonction sur une vraie page : démonstration guidée puis essai libre.', ru: 'Обзор покажет каждую возможность ридера на реальной странице: сначала показ с подсказкой касания, затем — свободная проба.', es: 'Este recorrido muestra cada función en una página real: primero una demostración y luego prueba libre.' },
    demoStart: { uk: 'Почати огляд', en: 'Start tour', fr: 'Commencer', ru: 'Начать обзор', es: 'Iniciar recorrido' },
    demoExit: { uk: 'Завершити', en: 'Finish', fr: 'Terminer', ru: 'Завершить', es: 'Finalizar' },
    demoAudio: { uk: '▶ Діалог', en: '▶ Dialogue', fr: '▶ Dialogue', ru: '▶ Диалог', es: '▶ Diálogo' },
    demoLoading: { uk: 'Відкриваю справжній PDF…', en: 'Opening the real PDF…', fr: 'Ouverture du vrai PDF…', ru: 'Открываю настоящий PDF…', es: 'Abriendo el PDF real…' },
    demoShowing: { uk: 'Показ…', en: 'Showing…', fr: 'Démonstration…', ru: 'Показ…', es: 'Mostrando…' },
    demoTryState: { uk: 'Спробуйте самі — або натисніть «Далі»', en: 'Try it yourself — or press “Next”', fr: 'Essayez par vous-même — ou appuyez sur « Suivant »', ru: 'Попробуйте сами — или нажмите «Далее»', es: 'Pruébalo tú mismo — o pulsa «Siguiente»' },
    demoNext: { uk: 'Далі', en: 'Next', fr: 'Suivant', ru: 'Далее', es: 'Siguiente' },
    demoReplay: { uk: 'Показати ще раз', en: 'Show again', fr: 'Revoir', ru: 'Показать ещё раз', es: 'Ver de nuevo' },
    demoPause: { uk: 'Пауза', en: 'Pause', fr: 'Pause', ru: 'Пауза', es: 'Pausa' },
    demoResume: { uk: 'Продовжити', en: 'Resume', fr: 'Reprendre', ru: 'Продолжить', es: 'Reanudar' },
    demoTry: { uk: 'Спробувати', en: 'Try it', fr: 'Essayer', ru: 'Попробовать', es: 'Probar' },
    demoRetry: { uk: 'Повторити', en: 'Retry', fr: 'Réessayer', ru: 'Повторить', es: 'Reintentar' },
    demoSkip: { uk: 'Пропустити', en: 'Skip', fr: 'Passer', ru: 'Пропустить', es: 'Omitir' },
    demoPlayBlocked: { uk: 'Браузер заблокував автозапуск звуку. Натисніть «▶ Відтворити» у плеєрі або «Спробувати».', en: 'Browser blocked autoplay. Press Play in the player or “Try it”.', fr: 'Lecture bloquée par le navigateur. Appuyez sur Lecture ou « Essayer ».', ru: 'Браузер заблокировал автозапуск звука. Нажмите Play в плеере или «Попробовать».', es: 'El navegador bloqueó la reproducción automática. Pulsa Play o «Probar».' },
    demoAiUnavailable: { uk: 'AI-сервіс зараз недоступний (немає ключа або мережі). Можете повторити чи перейти до наступного розділу.', en: 'AI service is currently unavailable (no key or network). You can retry or skip to the next section.', fr: 'Service IA indisponible (clé ou réseau manquant). Vous pouvez réessayer ou passer.', ru: 'AI-сервис сейчас недоступен (нет ключа или сети). Можно повторить или пропустить.', es: 'Servicio IA no disponible (sin clave o red). Puedes reintentar o saltar.' },
    demoStepWordTitle: { uk: 'Слово', en: 'Word', fr: 'Mot', ru: 'Слово', es: 'Palabra' },
    demoStepWordCopy: { uk: 'Торкніться будь-якого слова, щоб побачити переклад і озвучку. Зараз покажемо на прикладі — далі можете тапати інші слова на сторінці.', en: 'Tap any word for instant translation and speech. After the cue, tap any other words on the page.', fr: 'Touchez un mot pour le traduire et l’écouter. Ensuite, essayez d’autres mots.', ru: 'Нажмите любое слово для перевода и озвучки. После показа можете нажимать другие слова.', es: 'Toca cualquier palabra para traducirla y oírla. Luego prueba otras palabras.' },
    demoStepSentenceTitle: { uk: 'Речення', en: 'Sentence', fr: 'Phrase', ru: 'Предложение', es: 'Frase' },
    demoStepSentenceCopy: { uk: 'Кнопка розширення (↔) у вікні слова розширює виділення до цілого речення й озвучує його. Спробуйте розширити або послухати 🔊 ще раз.', en: 'The expand button (↔) in the word popup extends the selection to the whole sentence and reads it aloud. Try expanding or pressing 🔊.', fr: 'Le bouton d’extension (↔) étend la sélection à toute la phrase et la lit à voix haute.', ru: 'Кнопка расширения (↔) в окне слова выделяет всё предложение и озвучивает его.', es: 'El botón expandir (↔) amplía la selección a toda la frase y la lee en voz alta.' },
    demoStepGrammarTitle: { uk: 'Граматика', en: 'Grammar', fr: 'Grammaire', ru: 'Грамматика', es: 'Gramática' },
    demoStepGrammarCopy: { uk: 'Кнопка «Граматика» відкриває розбір структури речення та граматичних форм для вибраного фрагмента.', en: '“Grammar” opens a breakdown of sentence structure and grammatical forms for the selected text.', fr: '« Grammaire » ouvre l’analyse de la structure et des formes de la phrase.', ru: 'Кнопка «Грамматика» открывает разбор структуры предложения и форм.', es: '«Gramática» abre el análisis de la estructura y formas de la frase.' },
    demoStepAskTitle: { uk: 'Запит AI', en: 'Ask AI', fr: 'Demander à l’IA', ru: 'Запрос AI', es: 'Preguntar IA' },
    demoStepAskCopy: { uk: '«Запит до AI» прив’язаний до вибраного речення: тут можна поставити власне запитання й отримати пояснення.', en: '“Ask AI” is anchored to the selected sentence: ask your own question and get an explanation.', fr: '« Demander à l’IA » est lié à la phrase sélectionnée : posez votre question.', ru: '«Запрос к AI» привязан к выбранному предложению: задайте свой вопрос.', es: '«Preguntar a la IA» está vinculado a la frase elegida: haz tu propia pregunta.' },
    demoStepRulesTitle: { uk: 'Правила', en: 'Rules', fr: 'Règles', ru: 'Правила', es: 'Reglas' },
    demoStepRulesCopy: { uk: 'Каталог граматичних правил знаходить теми з цієї сторінки, показує приклади й веде прямо до практики.', en: 'The Grammar Rules catalogue finds topics on this page, shows examples and links straight to Practice.', fr: 'Le catalogue de grammaire relie les règles de cette page aux exercices.', ru: 'Каталог правил находит темы этой страницы, показывает примеры и ведёт к практике.', es: 'El catálogo de reglas muestra temas de esta página y lleva a la práctica.' },
    demoStepPracticeTitle: { uk: 'Практика', en: 'Practice', fr: 'Pratique', ru: 'Практика', es: 'Práctica' },
    demoStepPracticeCopy: { uk: '«Практика» генерує інтерактивну вправу за правилом і текстом сторінки. Можете спробувати відповісти або перейти далі.', en: '“Practice” creates an interactive exercise from the rule and page text. Try answering or continue.', fr: '« Pratique » crée un exercice interactif à partir de la règle. Essayez de répondre.', ru: '«Практика» создаёт интерактивное упражнение по правилу и странице.', es: '«Práctica» crea un ejercicio interactivo sobre la regla y la página.' },
    demoStepAudioTitle: { uk: 'Аудіо книги', en: 'Book audio', fr: 'Audio du livre', ru: 'Аудио книги', es: 'Audio del libro' },
    demoStepAudioCopy: { uk: 'Власні записи підключаються в меню «Аудіо до книги». Позначка біля тексту (piste 1) відкриває штатний плеєр із паузою, перемоткою й швидкістю. Це окремо від синхронізованої озвучки та TTS.', en: 'Your recordings connect via “Book audio”. Tapping a mark near the text (piste 1) opens the reader player with pause, seek and speed — distinct from synced narration and TTS.', fr: 'Les pistes se connectent via « Audio du livre ». La marque (piste 1) ouvre le lecteur intégré.', ru: 'Записи подключаются в «Аудио к книге». Метка у текста (piste 1) открывает штатный плеер с паузой, перемоткой и скоростью.', es: 'Las pistas se conectan en «Audio del libro». La marca (piste 1) abre el reproductor con pausa, búsqueda y velocidad.' },
    demoStepInkTitle: { uk: 'Письмо', en: 'Writing', fr: 'Écriture', ru: 'Письмо', es: 'Escritura' },
    demoStepInkCopy: { uk: 'Режим письма дозволяє робити рукописні нотатки пером і маркером поверх PDF, скасовувати (↶) й повторювати (↷). Позначки зберігаються окремо для книги. Спробуйте намалювати самі!', en: 'Handwriting lets you draw notes with pen and marker over the PDF, undo (↶) and redo (↷). Notes save per book. Try drawing!', fr: 'L’écriture permet d’annoter le PDF au stylo et au surligneur, annuler (↶) et rétablir (↷). Essayez !', ru: 'Режим письма позволяет делать рукописные заметки пером и маркером, отменять (↶) и повторять (↷). Попробуйте порисовать!', es: 'La escritura permite anotar sobre el PDF con lápiz y marcador, deshacer (↶) y rehacer (↷). ¡Prueba a dibujar!' },
    demoStepWheelTitle: { uk: 'Кругове меню', en: 'Quick wheel', fr: 'Molette', ru: 'Колесо', es: 'Ruleta' },
    demoStepWheelCopy: { uk: 'Кругове меню дає швидкий доступ до перекладу, письма, фрагмента, сканера й друку одним рухом.', en: 'The Quick Wheel gives one-handed access to translation, writing, fragment, scanner and print.', fr: 'La molette donne un accès rapide à la traduction, l’écriture, l’extrait, le scanner et l’impression.', ru: 'Круговое меню даёт быстрый доступ к переводу, письму, фрагменту, сканеру и печати.', es: 'La ruleta da acceso rápido a traducción, escritura, fragmento, escáner e impresión.' },
    demoStepSidebarTitle: { uk: 'Бічне меню', en: 'Side menu', fr: 'Menu latéral', ru: 'Боковое меню', es: 'Menú lateral' },
    demoStepSidebarCopy: { uk: 'Бічне меню містить вибір мови книги, зміст і ескізи сторінок для швидкого переходу.', en: 'The side menu holds book language, table of contents and page thumbnails for quick navigation.', fr: 'Le menu latéral contient la langue du livre, le sommaire et les vignettes.', ru: 'Боковое меню содержит язык книги, оглавление и эскизы страниц.', es: 'El menú lateral incluye el idioma del libro, índice y miniaturas.' },
    demoStepScannerTitle: { uk: 'Сканер (дод.)', en: 'Scanner (extra)', fr: 'Scanner (extra)', ru: 'Сканер (доп.)', es: 'Escáner (extra)' },
    demoStepScannerCopy: { uk: 'Додатково: Сканер приймає звичайні фото й фотодокументи, перемикає фільтри (Документ / Ч/Б / Оригінал), розпізнає текст (OCR) і зберігає чи друкує PDF.', en: 'Extra: Scanner accepts regular photos and document shots, switches filters (Doc / B&W / Original), runs OCR and prints or saves PDF.', fr: 'Extra : le scanner traite photos et documents, change les filtres, lance l’OCR et exporte en PDF.', ru: 'Дополнительно: Сканер принимает обычные фото и фотодокументы, переключает фильтры, распознаёт текст (OCR) и печатает PDF.', es: 'Extra: el escáner procesa fotos y documentos, cambia filtros, aplica OCR e imprime PDF.' },
    demoStepRegionTitle: { uk: 'Фрагмент (дод.)', en: 'Fragment (extra)', fr: 'Extrait (extra)', ru: 'Фрагмент (доп.)', es: 'Fragmento (extra)' },
    demoStepRegionCopy: { uk: 'Додатково: «Фрагмент сторінки» дозволяє обвести частину сторінки — зберегти зображення, скопіювати або надіслати AI. Натисніть «Спробувати», щоб обвести область.', en: 'Extra: “Page fragment” lets you circle any part of the page to save, copy or send to AI. Press “Try it” to select an area.', fr: 'Extra : « Extrait de page » permet d’entourer une zone pour l’enregistrer ou l’envoyer à l’IA.', ru: 'Дополнительно: «Фрагмент страницы» позволяет обвести часть страницы и сохранить или отправить AI.', es: 'Extra: «Fragmento» permite rodear un área para guardarla o enviarla a la IA.' },
    demoStepPrintTitle: { uk: 'Друк (дод.)', en: 'Print (extra)', fr: 'Imprimer (extra)', ru: 'Печать (доп.)', es: 'Imprimir (extra)' },
    demoStepPrintCopy: { uk: 'Додатково: «Друк сторінки» друкує поточну сторінку або фрагмент разом із вашими рукописними нотатками. Натисніть «Спробувати», щоб відкрити попередній перегляд.', en: 'Extra: “Print page” prints the current page or fragment together with your handwritten notes. Press “Try it” to preview.', fr: 'Extra : « Imprimer » imprime la page avec vos notes manuscrites.', ru: 'Дополнительно: «Печать» печатает текущую страницу вместе с рукописными заметками.', es: 'Extra: «Imprimir» imprime la página actual junto con tus notas manuscritas.' },
    demoStepNotesTitle: { uk: 'Текстові нотатки (дод.)', en: 'Text notes (extra)', fr: 'Notes texte (extra)', ru: 'Текстовые заметки (доп.)', es: 'Notas de texto (extra)' },
    demoStepNotesCopy: { uk: 'Додатково: У текстових книгах (EPUB, FB2, TXT) замість малювання поверх PDF доступні текстові нотатки й закладки прямо у вікні перекладу.', en: 'Extra: In text books (EPUB, FB2, TXT), instead of PDF ink, you can attach text notes and bookmarks right inside the translation popup.', fr: 'Extra : dans les livres texte (EPUB, FB2, TXT), vous pouvez ajouter des notes et signets depuis la fenêtre de traduction.', ru: 'Дополнительно: в текстовых книгах (EPUB, FB2, TXT) доступны текстовые заметки и закладки прямо в окне перевода.', es: 'Extra: en libros de texto (EPUB, FB2, TXT) puedes añadir notas y marcadores desde la ventana de traducción.' },
    demoDone: { uk: 'Огляд завершено! Можете повернутися до будь-якого розділу вище або натиснути «Завершити», щоб повернутися до своєї книги.', en: 'Tour complete! Jump to any section above or press “Finish” to return to your book.', fr: 'Visite terminée ! Choisissez une section ci-dessus ou appuyez sur « Terminer ».', ru: 'Обзор завершён! Можно вернуться к любому разделу выше или нажать «Завершить».', es: '¡Recorrido completado! Elige cualquier sección arriba o pulsa «Finalizar».' },
    demoNoTarget: { uk: 'Не знайшов текстовий шар сторінки. Спробуйте ще раз після завантаження.', en: 'The page text layer was not ready. Try again after loading.', fr: 'Le texte de la page n’est pas prêt. Réessayez après le chargement.', ru: 'Текстовый слой страницы ещё не готов. Повторите после загрузки.', es: 'La capa de texto aún no está lista. Inténtalo de nuevo tras la carga.' },
    demoAudioError: { uk: 'Аудіо не відтворилося на цьому пристрої.', en: 'The audio could not play on this device.', fr: 'La lecture audio a échoué sur cet appareil.', ru: 'Аудио не воспроизвелось на этом устройстве.', es: 'No se pudo reproducir el audio en este dispositivo.' }
});

const DEMO_TEXTBOOK_PDF = 'media/demo-textbook/francais-interactif-chapter-1.pdf';
const DEMO_TEXTBOOK_AUDIO = 'media/demo-textbook/francais-interactif-chapter-1-dialogue.mp3';
const DEMO_PISTE_AUDIO = 'media/demo-textbook/piste-1.mp3';

const demoTour = {
    root: document.getElementById('demo-tour'),
    badge: document.getElementById('demo-tour-badge'),
    nav: document.getElementById('demo-tour-nav'),
    copy: document.getElementById('demo-tour-copy'),
    status: document.getElementById('demo-tour-status'),
    next: document.getElementById('demo-tour-next'),
    replay: document.getElementById('demo-tour-replay'),
    tryBtn: document.getElementById('demo-tour-try'),
    pause: document.getElementById('demo-tour-pause'),
    voice: document.getElementById('demo-tour-voice'),
    audio: document.getElementById('demo-tour-audio'),
    exit: document.getElementById('demo-tour-exit'),
    player: document.getElementById('demo-tour-player'),
    target: null,
    previousTarget: null,
    previousTranslate: false,
    previousBook: null,
    step: 0,
    busy: false,
    voiceEnabled: false,
    tryAction: null,
    generation: 0
};

function demoSetCopy(text, { status = '' } = {}) {
    if (demoTour.copy) demoTour.copy.textContent = text;
    if (demoTour.status) demoTour.status.textContent = status;
}

function demoSleep(ms) {
    const generation = demoTour.generation;
    return new Promise((resolve, reject) => setTimeout(() => generation === demoTour.generation
        ? resolve() : reject(new DOMException('Demo closed', 'AbortError')), ms));
}

async function demoWaitFor(predicate, timeout = 9000, interval = 80) {
    const generation = demoTour.generation;
    const until = Date.now() + timeout;
    while (Date.now() < until) {
        if (generation !== demoTour.generation) throw new DOMException('Demo closed', 'AbortError');
        const value = predicate();
        if (value) return value;
        await demoSleep(interval);
    }
    return null;
}

function demoClearTarget() {
    demoTour.target?.classList.remove('demo-tour-target');
    demoTour.target = null;
}

function demoSetTarget(el) {
    demoClearTarget();
    if (!el) return;
    demoTour.target = el;
    el.classList.add('demo-tour-target');
}

function demoShowTapAt(target) {
    if (!target || typeof target.getBoundingClientRect !== 'function') return;
    const r = target.getBoundingClientRect();
    if (!r.width && !r.height) return;
    const ring = document.createElement('div');
    ring.className = 'demo-tap-ring';
    ring.style.left = (r.left + r.width / 2) + 'px';
    ring.style.top = (r.top + r.height / 2) + 'px';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 700);
}

function demoRealTap(target) {
    demoShowTapAt(target);
    const r = target.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: 1, view: window };
    target.dispatchEvent(new MouseEvent('click', init));
}

function demoPlaceCard(avoidEl = null) {
    demoTour.root.classList.remove('demo-pos-tl', 'demo-pos-tr', 'demo-pos-bl', 'demo-pos-br');
    const blockers = [avoidEl, document.getElementById('word-tooltip'), document.getElementById('audio-player')]
        .filter(el => el && el.offsetParent !== null && !el.hidden && getComputedStyle(el).display !== 'none')
        .map(el => el.getBoundingClientRect());
    if (!blockers.length) { demoTour.root.classList.add('demo-pos-tr'); return; }
    const w = Math.min(440, innerWidth - 24), h = Math.min(260, innerHeight * 0.44);
    const candidates = [
        ['demo-pos-tr', { left: innerWidth - w - 18, top: 18, right: innerWidth - 18, bottom: 18 + h }],
        ['demo-pos-tl', { left: 18, top: 18, right: 18 + w, bottom: 18 + h }],
        ['demo-pos-br', { left: innerWidth - w - 18, top: innerHeight - h - 18, right: innerWidth - 18, bottom: innerHeight - 18 }],
        ['demo-pos-bl', { left: 18, top: innerHeight - h - 18, right: 18 + w, bottom: innerHeight - 18 }]
    ];
    let best = candidates[0][0], bestOverlap = Infinity;
    for (const [cls, box] of candidates) {
        let area = 0;
        for (const b of blockers) {
            const ox = Math.max(0, Math.min(box.right, b.right) - Math.max(box.left, b.left));
            const oy = Math.max(0, Math.min(box.bottom, b.bottom) - Math.max(box.top, b.top));
            area += ox * oy;
        }
        if (area < bestOverlap) { bestOverlap = area; best = cls; }
    }
    demoTour.root.classList.add(best);
}

function demoSetTargetLanguage() {
    const select = els.targetLang, wanted = state.uiLang;
    if (!select || ![...select.options].some(o => o.value === wanted)) return;
    demoTour.previousTarget = state.targetLang;
    if (wanted !== state.targetLang) { select.value = wanted; select.dispatchEvent(new Event('change', { bubbles: true })); }
}

function demoRestoreSettings() {
    if (demoTour.previousTarget && els.targetLang && demoTour.previousTarget !== state.targetLang) {
        els.targetLang.value = demoTour.previousTarget; els.targetLang.dispatchEvent(new Event('change', { bubbles: true }));
    }
    demoTour.previousTarget = null;
    if (state.translateMode !== demoTour.previousTranslate) els.translateBtn?.click();
    state.demoMode = false;
}

function demoSetPage(page) {
    const range = document.getElementById('pdf-page-range');
    if (!range) return;
    const clamped = Math.max(1, Math.min(Number(range.max) || page, page));
    range.value = String(clamped);
    range.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector(`.pdf-page-wrapper[data-page="${clamped}"]`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
}

function demoVisibleTextTarget() {
    const spans = [...els.pages.querySelectorAll('.pdf-text-layer span')].filter(span => {
        const text = span.textContent.trim(); if (text.length < 3) return false;
        const r = span.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight;
    });
    return spans.find(s => /C[’']est une salle de classe/i.test(s.textContent)) ||
        spans.find(s => /bonjour|comment|monsieur|madame/i.test(s.textContent)) || spans[0] || null;
}

async function demoEnsurePageReady(page = 3) {
    if (!state.pdfDoc || state.format !== 'pdf') return false;
    const switched = state.currentIndex !== page;
    if (switched) demoSetPage(page);
    const ready = await demoWaitFor(() => {
        const w = document.querySelector(`.pdf-page-wrapper[data-page="${page}"]`);
        const span = w?.querySelector('.pdf-text-layer span');
        if (!w || !span) return null;
        const r = w.getBoundingClientRect();
        return r.width > 0 && r.height > 0 ? w : null;
    }, 10000);
    if (ready) {
        const r = ready.getBoundingClientRect();
        if (switched || r.bottom < 80 || r.top > innerHeight - 80) {
            ready.scrollIntoView({ block: 'center', behavior: 'instant' });
            await demoSleep(80);
        }
    }
    return !!ready;
}

async function demoEnsureWordTooltip() {
    if (!state.translateMode) els.translateBtn?.click();
    await demoEnsurePageReady(3);
    if (els.tooltip.style.display === 'flex') return true;
    const target = await demoWaitFor(demoVisibleTextTarget, 10000);
    if (!target) return false;
    demoSetTarget(target);
    demoRealTap(target);
    const opened = await demoWaitFor(() => els.tooltip.style.display === 'flex' && els.ttOriginal.textContent.trim().length > 0, 10000);
    if (opened) holdTooltip?.();
    return !!opened;
}

async function demoEnsureSentenceTooltip() {
    if (!await demoEnsureWordTooltip()) return false;
    if ((els.ttOriginal?.textContent || '').trim().split(/\s+/).length < 3) {
        els.ttExpandBtn?.click();
        await demoWaitFor(() => (els.ttOriginal?.textContent || '').trim().split(/\s+/).length >= 2, 1500);
        els.ttExpandBtn?.click();
        await demoWaitFor(() => (els.ttOriginal?.textContent || '').trim().split(/\s+/).length >= 3, 2000);
    }
    holdTooltip?.();
    return els.tooltip.style.display === 'flex';
}

function demoCleanupTransientTools({ keep = [] } = {}) {
    demoClearTarget();
    demoTour.tryAction = null;
    if (demoTour.tryBtn) demoTour.tryBtn.hidden = true;
    if (!keep.includes('grammar')) els.grammarPanel?.classList.remove('expanded');
    if (!keep.includes('ask')) els.askPanel?.classList.remove('expanded');
    if (!keep.includes('rules') && document.getElementById('rules-panel')?.classList.contains('expanded') && typeof closeRulesPanel === 'function') closeRulesPanel();
    if (!keep.includes('practice') && !document.getElementById('practice-panel')?.hidden && typeof closePractice === 'function') closePractice();
    if (!keep.includes('ink') && state.inkMode) document.getElementById('ink-done')?.click();
    if (!keep.includes('audio')) {
        demoTour.player.pause();
        demoTour.player.currentTime = 0;
        if (typeof bookAudio !== 'undefined' && bookAudio.playing && typeof stopBookAudio === 'function') stopBookAudio();
    }
    if (!keep.includes('wheel') && typeof quickWheel !== 'undefined' && quickWheel?.close) quickWheel.close();
    if (!keep.includes('sidebar')) document.getElementById('sidebar')?.classList.add('collapsed');
    if (!keep.includes('scanner') && document.getElementById('scanner')?.classList.contains('open') && typeof closeScanner === 'function') closeScanner();
    if (!keep.includes('region') && document.body.classList.contains('region-mode') && typeof exitRegionMode === 'function') exitRegionMode();
    if (!keep.includes('tooltip')) dismissReaderPopup?.();
}

function demoVisibleInkCanvas() {
    return [...els.pages.querySelectorAll('.ink-layer')].find(layer => {
        const r = layer.getBoundingClientRect();
        return r.width > 40 && r.height > 40 && r.bottom > 80 && r.top < innerHeight;
    }) || null;
}

function demoDrawInk() {
    const ink = demoVisibleInkCanvas();
    if (!ink) return false;
    const page = Number(ink.dataset.page), r = ink.getBoundingClientRect();
    if (!r.width || inkOwner !== state.bookKey) return false;
    ensureInkCanvas(ink);
    inkActivePage = page;
    const stroke = { c: state.inkColor, w: Number(inkWidth.value) / r.width, p: [[.14, .16], [.20, .18], [.27, .15]] };
    inkStrokes(page).push(stroke);
    inkPushHistory(page, { type: 'draw', stroke, owner: inkOwner });
    getInkRedoStack(page).length = 0;
    redrawInk(ink, page); saveInk(page); updateInkTools();
    return true;
}

async function demoEnsureBookAudioMarker(page = 6) {
    await demoEnsurePageReady(page);
    if (typeof bookAudio !== 'undefined' && !bookAudio.tracks.some(tr => tr.track === 1)) {
        const resp = await fetch(DEMO_PISTE_AUDIO, { credentials: 'same-origin', cache: 'force-cache' });
        if (!resp.ok) throw new Error('demo audio HTTP ' + resp.status);
        const file = new File([await resp.blob()], 'piste 1.mp3', { type: 'audio/mpeg' });
        if (typeof importBookAudio === 'function') {
            await importBookAudio([file]);
            await demoWaitFor(() => bookAudio.tracks.some(tr => tr.track === 1), 8000);
        }
    }
    const wrapper = document.querySelector(`.pdf-page-wrapper[data-page="${page}"]`);
    if (!wrapper) return null;
    let marker = wrapper.querySelector('.pdf-audio-marker[data-track="1"]');
    if (!marker) {
        let layer = wrapper.querySelector('.pdf-audio-layer');
        if (!layer) {
            layer = document.createElement('div');
            layer.className = 'pdf-audio-layer';
            layer.style.width = wrapper.style.width || '100%';
            layer.style.height = wrapper.style.height || '100%';
            wrapper.appendChild(layer);
        }
        marker = document.createElement('button');
        marker.type = 'button';
        marker.className = 'pdf-audio-marker';
        marker.dataset.cd = '';
        marker.dataset.track = '1';
        marker.dataset.kind = 'piste';
        marker.dataset.ref = '';
        marker.dataset.page = String(page);
        marker.textContent = '▶ piste 1';
        marker.style.left = '24px';
        marker.style.top = '18px';
        marker.style.width = '86px';
        marker.style.height = '30px';
        marker.addEventListener('pointerdown', e => e.stopPropagation());
        marker.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            if (typeof tapBookAudioMark === 'function') tapBookAudioMark(marker);
        });
        layer.appendChild(marker);
        if (typeof syncAudioMarkers === 'function') syncAudioMarkers(layer);
    }
    return marker;
}

const DEMO_STEPS = [
    {
        id: 'word', titleKey: 'demoStepWordTitle', copyKey: 'demoStepWordCopy',
        async run() {
            demoCleanupTransientTools();
            if (!state.translateMode) els.translateBtn?.click();
            if (!await demoEnsurePageReady(3)) return { error: t('demoNoTarget') };
            const target = await demoWaitFor(demoVisibleTextTarget, 10000);
            if (!target) return { error: t('demoNoTarget') };
            target.scrollIntoView({ block: 'center', behavior: 'instant' });
            demoSetTarget(target);
            demoPlaceCard(target);
            await demoSleep(250);
            demoRealTap(target);
            const opened = await demoWaitFor(() => els.tooltip.style.display === 'flex'
                && els.ttOriginal.textContent.trim().length > 0
                && els.ttTranslation.textContent.trim().length > 0
                && !/(?:\.\.\.|…)$/.test(els.ttTranslation.textContent.trim()), 8000)
                || (els.tooltip.style.display === 'flex' ? els.tooltip : null);
            if (!opened) return { error: t('demoNoTarget') };
            holdTooltip?.();
            demoSetTarget(els.tooltip);
            demoPlaceCard(els.tooltip);
            return { ok: true };
        }
    },
    {
        id: 'sentence', titleKey: 'demoStepSentenceTitle', copyKey: 'demoStepSentenceCopy',
        async run() {
            demoCleanupTransientTools({ keep: ['tooltip'] });
            if (!await demoEnsureWordTooltip()) return { error: t('demoNoTarget') };
            demoShowTapAt(els.ttExpandBtn);
            if (!await demoEnsureSentenceTooltip()) return { error: t('demoNoTarget') };
            const replay = document.getElementById('tt-replay-btn');
            if (replay) demoRealTap(replay);
            demoSetTarget(els.tooltip);
            demoPlaceCard(els.tooltip);
            return { ok: true };
        }
    },
    {
        id: 'grammar', titleKey: 'demoStepGrammarTitle', copyKey: 'demoStepGrammarCopy',
        async run() {
            demoCleanupTransientTools({ keep: ['tooltip'] });
            if (!await demoEnsureSentenceTooltip()) return { error: t('demoNoTarget') };
            const aiBtn = document.getElementById('tt-ai-btn');
            if (aiBtn) demoRealTap(aiBtn);
            await demoWaitFor(() => els.grammarPanel?.classList.contains('expanded'), 6000);
            if (!els.grammarPanel?.classList.contains('expanded')) els.grammarTab?.click();
            const ready = await demoWaitFor(() => els.grammarPanel?.classList.contains('expanded'), 4000);
            if (!ready) return { error: t('demoAiUnavailable') };
            demoSetTarget(els.grammarPanel);
            demoPlaceCard(els.grammarPanel);
            return { ok: true };
        }
    },
    {
        id: 'ask', titleKey: 'demoStepAskTitle', copyKey: 'demoStepAskCopy',
        async run() {
            demoCleanupTransientTools({ keep: ['tooltip'] });
            if (!await demoEnsureSentenceTooltip()) return { error: t('demoNoTarget') };
            const askBtn = document.getElementById('tt-ask-btn');
            if (askBtn) demoRealTap(askBtn);
            await demoWaitFor(() => els.askPanel?.classList.contains('expanded'), 6000);
            if (!els.askPanel?.classList.contains('expanded')) els.askTab?.click();
            const input = document.getElementById('ask-input') || els.askPanel?.querySelector('input, textarea');
            if (input && !input.value) {
                input.value = state.uiLang === 'uk' ? 'Поясни конструкцію C’est у цьому реченні' : 'Explain C’est in this sentence';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            demoSetTarget(els.askPanel);
            demoPlaceCard(els.askPanel);
            return { ok: true };
        }
    },
    {
        id: 'rules', titleKey: 'demoStepRulesTitle', copyKey: 'demoStepRulesCopy',
        async run() {
            demoCleanupTransientTools();
            if (!await demoEnsurePageReady(3)) return { error: t('demoNoTarget') };
            const btnRules = document.getElementById('btn-rules');
            if (btnRules) demoRealTap(btnRules);
            const panel = await demoWaitFor(() => {
                const p = document.getElementById('rules-panel');
                return p && p.classList.contains('expanded') ? p : null;
            }, 6000);
            if (!panel) return { error: t('demoNoTarget') };
            demoSetTarget(panel);
            demoPlaceCard(panel);
            return { ok: true };
        }
    },
    {
        id: 'practice', titleKey: 'demoStepPracticeTitle', copyKey: 'demoStepPracticeCopy',
        async run() {
            demoCleanupTransientTools({ keep: ['rules'] });
            const rulesPanel = document.getElementById('rules-panel');
            if (!rulesPanel?.classList.contains('expanded')) document.getElementById('btn-rules')?.click();
            await demoWaitFor(() => document.getElementById('rules-panel')?.classList.contains('expanded'), 4000);
            const practiceBtn = document.getElementById('rules-practice') || document.querySelector('.rules-section-practice, .grammar-practice-btn');
            if (practiceBtn) demoRealTap(practiceBtn);
            const practicePanel = await demoWaitFor(() => {
                const p = document.getElementById('practice-panel');
                return p && !p.hidden ? p : null;
            }, 5000);
            if (practicePanel) {
                demoSetTarget(practicePanel);
                demoPlaceCard(practicePanel);
                return { ok: true };
            }
            return { ok: true, status: t('demoAiUnavailable') };
        }
    },
    {
        id: 'audio', titleKey: 'demoStepAudioTitle', copyKey: 'demoStepAudioCopy',
        async run() {
            demoCleanupTransientTools();
            const marker = await demoEnsureBookAudioMarker(6);
            if (!marker) return { error: t('demoNoTarget') };
            demoSetTarget(marker);
            demoPlaceCard(marker);
            await demoSleep(350);
            demoRealTap(marker);
            const player = await demoWaitFor(() => {
                const p = document.getElementById('audio-player');
                return p && !p.hidden ? p : null;
            }, 6000);
            if (!player) return { error: t('demoAudioError') };
            demoSetTarget(player);
            demoPlaceCard(player);
            const rateBtn = document.getElementById('ap-rate');
            if (rateBtn) {
                await demoSleep(400);
                demoShowTapAt(rateBtn);
            }
            const blocked = typeof baAudio !== 'undefined' && baAudio.paused;
            demoTour.tryAction = () => { document.getElementById('ap-toggle')?.click(); };
            return { ok: true, status: blocked ? t('demoPlayBlocked') : '' };
        }
    },
    {
        id: 'ink', titleKey: 'demoStepInkTitle', copyKey: 'demoStepInkCopy',
        async run() {
            demoCleanupTransientTools();
            if (!await demoEnsurePageReady(3)) return { error: t('demoNoTarget') };
            const practicePanel = document.getElementById('practice-panel');
            if (practicePanel && !practicePanel.hidden && typeof closePractice === 'function') closePractice();
            const inkBtn = document.getElementById('btn-ink');
            if (inkBtn) demoRealTap(inkBtn);
            const ready = await demoWaitFor(() => state.inkMode && inkOwner === state.bookKey && demoVisibleInkCanvas(), 5000);
            if (!ready) return { error: t('demoNoTarget') };
            demoDrawInk();
            const undoBtn = document.getElementById('ink-undo');
            const redoBtn = document.getElementById('ink-redo');
            if (undoBtn && redoBtn) {
                await demoSleep(300);
                demoShowTapAt(undoBtn);
                undoBtn.click();
                await demoSleep(250);
                demoShowTapAt(redoBtn);
                redoBtn.click();
            }
            const toolbar = document.getElementById('ink-toolbar') || document.getElementById('ink-marker');
            if (toolbar) { demoSetTarget(toolbar); demoPlaceCard(toolbar); }
            return { ok: true };
        }
    },
    {
        id: 'wheel', titleKey: 'demoStepWheelTitle', copyKey: 'demoStepWheelCopy',
        async run() {
            demoCleanupTransientTools();
            if (!await demoEnsurePageReady(3)) return { error: t('demoNoTarget') };
            if (typeof quickWheel !== 'undefined' && quickWheel?.open) quickWheel.open();
            const dock = await demoWaitFor(() => document.getElementById('quick-menu-dock'), 3000);
            if (dock) { demoSetTarget(dock); demoPlaceCard(dock); }
            return { ok: true };
        }
    },
    {
        id: 'sidebar', titleKey: 'demoStepSidebarTitle', copyKey: 'demoStepSidebarCopy',
        async run() {
            demoCleanupTransientTools();
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('collapsed');
                demoSetTarget(sidebar);
                demoPlaceCard(sidebar);
            }
            return { ok: true };
        }
    },
    {
        id: 'scanner', titleKey: 'demoStepScannerTitle', copyKey: 'demoStepScannerCopy', isExtra: true,
        async run() {
            demoCleanupTransientTools();
            if (typeof openScanner === 'function') openScanner();
            const modal = await demoWaitFor(() => document.getElementById('scanner')?.classList.contains('open') ? document.getElementById('scanner') : null, 4000);
            if (modal && typeof scanState !== 'undefined' && scanState.pages.length === 0 && typeof scanAddFiles === 'function') {
                const cv = document.querySelector('.pdf-page-wrapper[data-page="3"] canvas');
                if (cv && cv.width > 0) {
                    const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.85));
                    if (blob) await scanAddFiles([new File([blob], 'demo-page.jpg', { type: 'image/jpeg' })], false);
                }
            }
            const allFilters = document.getElementById('scan-all');
            if (allFilters) demoSetTarget(allFilters);
            demoPlaceCard(allFilters);
            return { ok: true };
        }
    },
    {
        id: 'region', titleKey: 'demoStepRegionTitle', copyKey: 'demoStepRegionCopy', isExtra: true,
        async run() {
            demoCleanupTransientTools();
            if (!await demoEnsurePageReady(3)) return { error: t('demoNoTarget') };
            const btn = document.getElementById('btn-region');
            if (btn) demoSetTarget(btn);
            demoTour.tryAction = () => { document.getElementById('btn-region')?.click(); };
            demoPlaceCard();
            return { ok: true };
        }
    },
    {
        id: 'print', titleKey: 'demoStepPrintTitle', copyKey: 'demoStepPrintCopy', isExtra: true,
        async run() {
            demoCleanupTransientTools();
            if (!await demoEnsurePageReady(3)) return { error: t('demoNoTarget') };
            const btn = document.getElementById('btn-print-page');
            if (btn) demoSetTarget(btn);
            demoTour.tryAction = () => { if (typeof printCurrentReaderPage === 'function') printCurrentReaderPage(); };
            demoPlaceCard();
            return { ok: true };
        }
    },
    {
        id: 'notes', titleKey: 'demoStepNotesTitle', copyKey: 'demoStepNotesCopy', isExtra: true,
        async run() {
            demoCleanupTransientTools();
            if (!await demoEnsureWordTooltip()) return { error: t('demoNoTarget') };
            const markBtn = document.getElementById('tt-mark-btn');
            if (markBtn) demoSetTarget(markBtn);
            demoPlaceCard(els.tooltip);
            return { ok: true };
        }
    }
];

function demoRenderChips(activeIdx = -1) {
    if (!demoTour.nav) return;
    demoTour.nav.hidden = false;
    if (!demoTour.nav.childElementCount) {
        DEMO_STEPS.forEach((step, idx) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'demo-tour-chip';
            chip.dataset.stepIndex = String(idx + 1);
            chip.addEventListener('click', () => demoJumpToStep(idx + 1));
            demoTour.nav.appendChild(chip);
        });
    }
    [...demoTour.nav.children].forEach((chip, idx) => {
        chip.textContent = t(DEMO_STEPS[idx].titleKey);
        chip.classList.toggle('active', idx + 1 === activeIdx);
    });
    const activeChip = demoTour.nav.children[activeIdx - 1];
    activeChip?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
}

function demoUpdateBadge(stepNum) {
    if (!demoTour.badge) return;
    if (stepNum < 1) { demoTour.badge.hidden = true; return; }
    demoTour.badge.hidden = false;
    demoTour.badge.textContent = `${stepNum} / ${DEMO_STEPS.length}`;
}

function demoShowWelcome() {
    demoCleanupTransientTools();
    demoTour.step = 0;
    demoTour.root.classList.remove('demo-active', 'demo-pos-tl', 'demo-pos-tr', 'demo-pos-bl', 'demo-pos-br');
    demoTour.root.hidden = false;
    if (demoTour.nav) demoTour.nav.hidden = true;
    demoUpdateBadge(0);
    demoSetCopy(t('demoWelcome'));
    demoTour.next.hidden = false; demoTour.next.textContent = t('demoStart');
    if (demoTour.replay) demoTour.replay.hidden = true;
    if (demoTour.tryBtn) demoTour.tryBtn.hidden = true;
    if (demoTour.pause) demoTour.pause.hidden = true;
    if (demoTour.voice) demoTour.voice.hidden = true;
    demoTour.audio.hidden = false;
    demoTour.exit.hidden = false;
}

function demoShowDone() {
    demoCleanupTransientTools();
    demoTour.step = DEMO_STEPS.length + 1;
    demoTour.root.classList.add('demo-active');
    demoTour.root.hidden = false;
    demoRenderChips(-1);
    demoUpdateBadge(DEMO_STEPS.length);
    demoSetCopy(t('demoDone'));
    demoTour.next.hidden = true;
    if (demoTour.replay) demoTour.replay.hidden = false;
    if (demoTour.tryBtn) demoTour.tryBtn.hidden = true;
    if (demoTour.pause) demoTour.pause.hidden = true;
    demoTour.audio.hidden = false;
    demoTour.exit.hidden = false;
}

async function demoExecuteStep(stepNumber) {
    if (demoTour.busy) return;
    if (stepNumber > DEMO_STEPS.length) { demoShowDone(); return; }
    const def = DEMO_STEPS[stepNumber - 1];
    const generation = ++demoTour.generation;
    demoTour.busy = true;
    demoTour.step = stepNumber;
    demoTour.root.classList.add('demo-active');
    demoTour.root.hidden = false;
    demoRenderChips(stepNumber);
    demoUpdateBadge(stepNumber);
    demoSetCopy(t(def.copyKey), { status: t('demoShowing') });
    demoTour.next.hidden = false; demoTour.next.textContent = t('demoNext');
    if (demoTour.replay) demoTour.replay.hidden = false;
    if (demoTour.pause) demoTour.pause.hidden = true;
    if (demoTour.voice) demoTour.voice.hidden = false;
    demoTour.audio.hidden = true;
    demoTour.exit.hidden = false;
    try {
        const res = await def.run(generation);
        if (generation !== demoTour.generation) return;
        if (demoTour.tryBtn) demoTour.tryBtn.hidden = !demoTour.tryAction;
        if (res?.error) {
            demoSetCopy(t(def.copyKey), { status: res.error });
            if (demoTour.replay) demoTour.replay.textContent = t('demoRetry');
        } else {
            demoSetCopy(t(def.copyKey), { status: res?.status || t('demoTryState') });
            if (demoTour.replay) demoTour.replay.textContent = t('demoReplay');
        }
    } catch (error) {
        if (error.name !== 'AbortError') throw error;
    } finally {
        if (generation === demoTour.generation) demoTour.busy = false;
    }
}

function demoJumpToStep(stepNumber) {
    demoTour.generation++;
    demoTour.busy = false;
    demoExecuteStep(stepNumber);
}

async function openDemoTextbook() {
    if (demoTour.busy) return;
    if (state.format && !state.demoMode) {
        demoTour.previousBook = {
            bookKey: state.bookKey,
            page: state.currentIndex,
            pageInChapter: state.pageInChapter
        };
    } else if (!state.format) {
        demoTour.previousBook = null;
    }
    const generation = ++demoTour.generation;
    demoTour.previousTranslate = state.translateMode;
    try {
        closeFullMenu?.();
        demoTour.busy = true; demoTour.step = 0;
        demoTour.root.classList.remove('demo-active'); demoTour.root.hidden = false;
        demoTour.next.hidden = true; demoTour.audio.hidden = true; demoTour.exit.hidden = false;
        if (demoTour.replay) demoTour.replay.hidden = true;
        if (demoTour.tryBtn) demoTour.tryBtn.hidden = true;
        if (demoTour.nav) demoTour.nav.hidden = true;
        demoSetCopy(t('demoWelcome'), { status: t('demoLoading') });
        const response = await fetch(DEMO_TEXTBOOK_PDF, { credentials: 'same-origin', cache: 'force-cache' });
        if (generation !== demoTour.generation) return;
        if (!response.ok) throw new Error('demo PDF HTTP ' + response.status);
        const file = new File([await response.blob()], 'Français interactif - Démo.pdf', { type: 'application/pdf', lastModified: 2019 });
        if (generation !== demoTour.generation) return;
        Object.defineProperty(file, '__readerDemo', { value: true });
        demoSetTargetLanguage();
        await openBookFile(file);
        if (generation !== demoTour.generation) return;
        await demoWaitFor(() => state.pdfDoc && state.format === 'pdf', 12000);
        demoTour.busy = false;
        demoShowWelcome();
    } catch (error) {
        if (generation !== demoTour.generation) return;
        demoTour.busy = false; demoTour.next.hidden = false; demoTour.audio.hidden = true;
        demoSetCopy(t('demoNoTarget'), { status: error.message || String(error) });
    }
}

function closeDemoTextbook() {
    demoTour.generation++;
    demoTour.busy = false;
    demoTour.step = 0;
    demoCleanupTransientTools();
    demoTour.root.classList.remove('demo-active', 'demo-pos-tl', 'demo-pos-tr', 'demo-pos-bl', 'demo-pos-br');
    demoTour.root.hidden = true;
    stopTooltipSpeech?.(); stopGlobalTTS?.();
    demoRestoreSettings();
    const prev = demoTour.previousBook;
    demoTour.previousBook = null;
    if (prev?.bookKey && typeof openShelfBook === 'function') {
        openShelfBook(prev.bookKey).catch(() => {});
    }
}

// Tour controls must not bubble into the reader's outside-popup dismissal.
demoTour.root.addEventListener('click', e => e.stopPropagation());
demoTour.root.addEventListener('pointerdown', e => e.stopPropagation());
demoTour.next.addEventListener('click', () => demoExecuteStep(demoTour.step + 1));
demoTour.replay?.addEventListener('click', () => demoJumpToStep(Math.min(Math.max(1, demoTour.step), DEMO_STEPS.length)));
demoTour.tryBtn?.addEventListener('click', () => { demoTour.tryAction?.(); });
demoTour.voice?.addEventListener('click', () => {
    demoTour.voiceEnabled = !demoTour.voiceEnabled;
    demoTour.voice.setAttribute('aria-pressed', String(demoTour.voiceEnabled));
    demoTour.voice.textContent = demoTour.voiceEnabled ? '🔊' : '🔇';
});
demoTour.exit.addEventListener('click', closeDemoTextbook);
demoTour.audio.addEventListener('click', () => {
    demoTour.player.src = DEMO_TEXTBOOK_AUDIO;
    demoTour.player.play().catch(() => { demoTour.status.textContent = t('demoAudioError'); });
});
document.getElementById('btn-demo-textbook')?.addEventListener('click', openDemoTextbook);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !demoTour.root.hidden) closeDemoTextbook(); });
applyI18n();
