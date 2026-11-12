/* demo-textbook.js — the guided, real-reader demonstration book.
 *
 * The demo opens a real CC-BY PDF through openBookFile, enables the normal study
 * mode, taps a real PDF text-layer word, invokes the normal sentence breakdown and
 * opens the normal grammar-rules panel, starts the normal Practice action, and draws
 * one real ink stroke. It is deliberately a thin tour layer: the reader's translation,
 * speech, grammar, practice and writing code remain the code being exercised.
 */
Object.assign(I18N, {
    mDemoTextbook: { uk: 'Демо-підручник', en: 'Demo textbook', fr: 'Manuel de démonstration', ru: 'Демо-учебник', es: 'Libro de demostración' },
    mDemoTextbookDesc: { uk: 'Справжній PDF: переклад, озвучка, граматика, практика', en: 'Real PDF: translation, speech, grammar, Practice', fr: 'PDF réel : traduction, voix, grammaire, pratique', ru: 'Настоящий PDF: перевод, озвучка, грамматика, практика', es: 'PDF real: traducción, voz, gramática y práctica' },
    demoKicker: { uk: 'Демонстрація', en: 'Guided demo', fr: 'Démonstration guidée', ru: 'Демонстрация', es: 'Demostración guiada' },
    demoTitle: { uk: 'Français interactif', en: 'Français interactif', fr: 'Français interactif', ru: 'Français interactif', es: 'Français interactif' },
    demoAttribution: { uk: 'Відкритий матеріал COERLL, CC BY 4.0. Це демо показує роботу рідера на реальному підручнику.', en: 'Open COERLL material, CC BY 4.0. This demo shows the reader on a real textbook.', fr: 'Matériel COERLL ouvert, CC BY 4.0. Cette démo montre le lecteur sur un vrai manuel.', ru: 'Открытый материал COERLL, CC BY 4.0. Демо показывает ридер на настоящем учебнике.', es: 'Material abierto de COERLL, CC BY 4.0. Esta demo muestra el lector en un libro real.' },
    demoWelcome: { uk: 'Це справжні дії рідера: відкриття PDF, тап по слову, переклад, озвучка, розбір речення, граматика, практика та письмо.', en: 'This uses the real reader flow: opening a PDF, tapping a word, translation, speech, sentence breakdown, grammar, Practice and writing.', fr: 'Cette démo utilise le vrai lecteur : PDF, mot, traduction, voix, analyse, grammaire, pratique et écriture.', ru: 'Здесь работают настоящие функции ридера: PDF, тап по слову, перевод, озвучка, разбор, грамматика, практика и письмо.', es: 'Usa el flujo real del lector: PDF, palabra, traducción, voz, análisis, gramática, práctica y escritura.' },
    demoStart: { uk: 'Почати демо', en: 'Start demo', fr: 'Commencer', ru: 'Начать демо', es: 'Empezar demo' },
    demoExit: { uk: 'Вийти', en: 'Exit', fr: 'Quitter', ru: 'Выйти', es: 'Salir' },
    demoAudio: { uk: '▶ Діалог', en: '▶ Dialogue', fr: '▶ Dialogue', ru: '▶ Диалог', es: '▶ Diálogo' },
    demoLoading: { uk: 'Відкриваю справжній PDF…', en: 'Opening the real PDF…', fr: 'Ouverture du vrai PDF…', ru: 'Открываю настоящий PDF…', es: 'Abriendo el PDF real…' },
    demoRunning: { uk: 'Рідер виконує маршрут: тап → переклад → озвучка → розбір → граматика → практика → письмо.', en: 'The reader is running the route: tap → translation → speech → breakdown → grammar → Practice → writing.', fr: 'Le lecteur suit le parcours : mot → traduction → voix → analyse → grammaire → pratique → écriture.', ru: 'Ридер выполняет маршрут: тап → перевод → озвучка → разбор → грамматика → практика → письмо.', es: 'El lector ejecuta la ruta: toque → traducción → voz → análisis → gramática → práctica → escritura.' },
    demoNext: { uk: 'Далі', en: 'Next', fr: 'Suivant', ru: 'Далее', es: 'Siguiente' },
    demoStepCover: { uk: 'Крок 1. Це перша сторінка підручника. Подивіться на обкладинку, потім натисніть «Далі».', en: 'Step 1. This is the textbook cover. Look at it, then press “Next”.', fr: 'Étape 1. Voici la couverture. Regardez-la, puis appuyez sur « Suivant ».', ru: 'Шаг 1. Это обложка учебника. Посмотрите, затем нажмите «Далее».', es: 'Paso 1. Esta es la portada. Mírala y pulsa «Siguiente».' },
    demoStepPage: { uk: 'Крок 2. Переходимо до сторінки з текстом і вправами.', en: 'Step 2. We are moving to a page with text and exercises.', fr: 'Étape 2. Nous passons à une page avec du texte et des exercices.', ru: 'Шаг 2. Переходим на страницу с текстом и упражнениями.', es: 'Paso 2. Pasamos a una página con texto y ejercicios.' },
    demoStepWord: { uk: 'Крок 3. Слово підсвічене. Подивіться, де воно, потім натисніть «Далі» — рідер зробить один реальний тап.', en: 'Step 3. The word is highlighted. Look at it, then press “Next” for one real reader tap.', fr: 'Étape 3. Le mot est surligné. Regardez-le, puis appuyez sur « Suivant » pour un vrai toucher.', ru: 'Шаг 3. Слово подсвечено. Посмотрите, затем нажмите «Далее» — ридер сделает один тап.', es: 'Paso 3. La palabra está resaltada. Mírala y pulsa «Siguiente» para un toque real.' },
    demoStepWordResult: { uk: 'Крок 4. Переклад слова відкритий. Натисніть 🔊 у вікні, якщо хочете почути слово, і «Далі», коли переглянете результат.', en: 'Step 4. The word translation is open. Press 🔊 in the popup if you want to hear it, then press “Next”.', fr: 'Étape 4. La traduction du mot est ouverte. Appuyez sur 🔊 si vous voulez l’écouter, puis sur « Suivant ».', ru: 'Шаг 4. Перевод слова открыт. Нажмите 🔊 в окне, затем «Далее».', es: 'Paso 4. La traducción está abierta. Pulsa 🔊 si quieres oírla y luego «Siguiente».' },
    demoStepSentence: { uk: 'Крок 5. Виділяємо ціле речення та відкриваємо його переклад і озвучення.', en: 'Step 5. We select the whole sentence and open its translation and speech.', fr: 'Étape 5. Nous sélectionnons toute la phrase et ouvrons sa traduction et sa voix.', ru: 'Шаг 5. Выделяем всё предложение и открываем перевод и озвучку.', es: 'Paso 5. Seleccionamos la frase completa y abrimos su traducción y voz.' },
    demoStepGrammar: { uk: 'Крок 6. Натискаємо «Граматика». Вікно залишається відкритим — перегляньте його перед «Далі».', en: 'Step 6. We press “Grammar”. The panel stays open — review it before “Next”.', fr: 'Étape 6. Nous ouvrons « Grammaire ». Le panneau reste ouvert — regardez-le avant « Suivant ».', ru: 'Шаг 6. Нажимаем «Грамматика». Окно остаётся открытым — просмотрите его.', es: 'Paso 6. Abrimos «Gramática». El panel queda abierto: revísalo antes de continuar.' },
    demoStepAsk: { uk: 'Крок 7. Тепер окремо відкриваємо «Запит до AI». Тут також є пауза для перегляду.', en: 'Step 7. Now we open “Ask AI” separately. This panel also stays open for review.', fr: 'Étape 7. Nous ouvrons maintenant « Demander à l’IA » séparément.', ru: 'Шаг 7. Теперь отдельно открываем «Запрос к AI».', es: 'Paso 7. Ahora abrimos «Preguntar a la IA» por separado.' },
    demoStepRules: { uk: 'Крок 8. Відкриваємо правила граматики. Перегляньте каталог і приклади, потім натисніть «Далі».', en: 'Step 8. We open Grammar Rules. Review the catalogue and examples, then press “Next”.', fr: 'Étape 8. Nous ouvrons les règles de grammaire. Regardez le catalogue et les exemples.', ru: 'Шаг 8. Открываем правила грамматики. Просмотрите каталог и примеры.', es: 'Paso 8. Abrimos las reglas gramaticales. Revisa el catálogo y los ejemplos.' },
    demoStepPractice: { uk: 'Крок 9. Натискаємо «Практика» окремо. Якщо AI-ключа немає, рідер чесно покаже штатне повідомлення.', en: 'Step 9. We press “Practice” separately. Without an AI key, the reader shows its normal honest message.', fr: 'Étape 9. Nous ouvrons « Pratique » séparément. Sans clé IA, le lecteur affiche son message normal.', ru: 'Шаг 9. Отдельно нажимаем «Практика». Без AI-ключа ридер покажет штатное сообщение.', es: 'Paso 9. Abrimos «Práctica» por separado. Sin clave de IA se muestra el mensaje normal.' },
    demoStepInk: { uk: 'Крок 10. Відкриваємо письмо, показуємо один штрих і залишаємо його на екрані.', en: 'Step 10. We open handwriting, draw one stroke and leave it visible.', fr: 'Étape 10. Nous ouvrons l’écriture, traçons un trait et le laissons visible.', ru: 'Шаг 10. Открываем письмо, рисуем один штрих и оставляем его видимым.', es: 'Paso 10. Abrimos escritura, dibujamos un trazo y lo dejamos visible.' },
    demoStepAudio: { uk: 'Крок 11. Окремо запускаємо аудіо діалогу. Прослухайте кілька секунд.', en: 'Step 11. We start the dialogue audio separately. Listen for a few seconds.', fr: 'Étape 11. Nous lançons séparément l’audio du dialogue. Écoutez quelques secondes.', ru: 'Шаг 11. Отдельно запускаем аудио диалога. Послушайте несколько секунд.', es: 'Paso 11. Iniciamos el audio del diálogo por separado. Escucha unos segundos.' },
    demoDone: { uk: 'Готово: демо пройшло PDF, переклад, озвучку, граматику, практику та письмо. Натисніть «Діалог», щоб почути файл.', en: 'Done: the demo covered PDF, translation, speech, grammar, Practice and writing. Press “Dialogue” to hear the audio file.', fr: 'Terminé : la démo a couvert le PDF, la traduction, la voix, la grammaire, la pratique et l’écriture. Appuyez sur « Dialogue » pour écouter le fichier.', ru: 'Готово: демо прошло PDF, перевод, озвучку, грамматику, практику и письмо. Нажмите «Диалог», чтобы услышать файл.', es: 'Listo: la demo cubrió PDF, traducción, voz, gramática, práctica y escritura. Pulsa «Diálogo» para oír el archivo.' },
    demoNoTarget: { uk: 'Не знайшов текстовий шар сторінки. Спробуйте ще раз після завантаження.', en: 'The page text layer was not ready. Try again after loading.', fr: 'Le texte de la page n’est pas prêt. Réessayez après le chargement.', ru: 'Текстовый слой страницы ещё не готов. Повторите после загрузки.', es: 'La capa de texto aún no está lista. Inténtalo de nuevo tras la carga.' },
    demoAudioError: { uk: 'Аудіо не відтворилося на цьому пристрої.', en: 'The audio could not play on this device.', fr: 'La lecture audio a échoué sur cet appareil.', ru: 'Аудио не воспроизвелось на этом устройстве.', es: 'No se pudo reproducir el audio en este dispositivo.' }
});

const DEMO_TEXTBOOK_PDF = 'media/demo-textbook/francais-interactif-chapter-1.pdf';
const DEMO_TEXTBOOK_AUDIO = 'media/demo-textbook/francais-interactif-chapter-1-dialogue.mp3';
const demoTour = {
    root: document.getElementById('demo-tour'),
    copy: document.getElementById('demo-tour-copy'),
    status: document.getElementById('demo-tour-status'),
    next: document.getElementById('demo-tour-next'),
    audio: document.getElementById('demo-tour-audio'),
    exit: document.getElementById('demo-tour-exit'),
    player: document.getElementById('demo-tour-player'),
    target: null,
    previousTarget: null,
    previousTranslate: false,
    step: 0,
    busy: false,
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
async function demoWaitFor(predicate, timeout = 9000, interval = 100) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
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
function demoShowWelcome() {
    demoClearTarget();
    demoTour.root.classList.remove('demo-active');
    demoTour.root.hidden = false;
    demoSetCopy(t('demoWelcome'));
    demoTour.next.hidden = false; demoTour.next.textContent = t('demoStart');
    demoTour.audio.hidden = false; demoTour.exit.hidden = false;
}
function demoShowDone() {
    demoClearTarget(); demoTour.root.hidden = false;
    demoSetCopy(t('demoDone'));
    demoTour.next.hidden = true; demoTour.audio.hidden = false; demoTour.exit.hidden = false;
}
function demoVisibleTextTarget() {
    const spans = [...els.pages.querySelectorAll('.pdf-text-layer span')].filter(span => {
        const text = span.textContent.trim(); if (text.length < 3) return false;
        const r = span.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight;
    });
    return spans.find(s => /C[’']est une salle de classe/i.test(s.textContent)) ||
        spans.find(s => /bonjour|comment|monsieur|madame/i.test(s.textContent)) || spans[0] || null;
}
function demoRealTap(target) {
    const r = target.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: 1, view: window };
    target.dispatchEvent(new MouseEvent('click', init));
}
function demoSetStep(text, { next = true } = {}) {
    demoTour.root.classList.add('demo-active');
    demoTour.root.hidden = false;
    demoSetCopy(text, { status: t('demoRunning') });
    demoTour.next.hidden = !next;
    demoTour.next.textContent = t('demoNext');
}
function demoSetPage(page) {
    const range = document.getElementById('pdf-page-range');
    if (!range) return;
    range.value = String(Math.max(1, Math.min(Number(range.max) || page, page)));
    range.dispatchEvent(new Event('input', { bubbles: true }));
}
function demoDrawInk() {
    const ink = [...els.pages.querySelectorAll('.ink-layer')].find(layer => {
        const r = layer.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight && r.bottom > 80;
    });
    if (!ink) return;
    const page = Number(ink.dataset.page), r = ink.getBoundingClientRect();
    if (!r.width || inkOwner !== state.bookKey) return;
    // Use the reader's stroke renderer/history. Synthetic pen events cannot
    // acquire browser pointer capture because no physical pen is active.
    ensureInkCanvas(ink);
    inkActivePage = page;
    const stroke = { c: state.inkColor, w: Number(inkWidth.value) / r.width,
        p: [[.12, .12], [.17, .14], [.23, .12]] };
    inkStrokes(page).push(stroke);
    inkPushHistory(page, { type: 'draw', stroke, owner: inkOwner });
    getInkRedoStack(page).length = 0;
    redrawInk(ink, page); saveInk(page); updateInkTools();
}
async function demoRunRoute() {
    if (demoTour.busy) return;
    demoTour.busy = true;
    const generation = demoTour.generation;
    try {
        if (!state.translateMode) els.translateBtn?.click();
        if (demoTour.step === 0) {
            demoTour.step = 1; demoSetStep(t('demoStepCover')); return;
        }
        if (demoTour.step === 1) {
            demoSetPage(3); await demoSleep(500);
            document.querySelector('.pdf-page-wrapper[data-page="3"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            await demoSleep(1300); demoTour.step = 2; demoSetStep(t('demoStepPage')); return;
        }
        if (demoTour.step === 2) {
            const target = await demoWaitFor(demoVisibleTextTarget, 12000);
            if (!target) { demoSetCopy(t('demoNoTarget')); return; }
            demoClearTarget(); demoTour.target = target; target.classList.add('demo-tour-target'); target.scrollIntoView({ block: 'center', behavior: 'smooth' });
            await demoSleep(800);
            demoTour.step = 3; demoSetStep(t('demoStepWord')); return;
        }
        if (demoTour.step === 3) {
            demoRealTap(demoTour.target); await demoWaitFor(() => els.tooltip.style.display === 'flex', 12000); holdTooltip?.(); await demoSleep(700);
            demoTour.step = 4; demoSetStep(t('demoStepWordResult')); return;
        }
        if (demoTour.step === 4) {
            // The normal expand action goes word → sentence end → whole sentence.
            els.ttExpandBtn.click(); await demoSleep(150);
            els.ttExpandBtn.click(); await demoSleep(700);
            document.getElementById('tt-replay-btn')?.click();
            await demoSleep(900); demoTour.step = 5; demoSetStep(t('demoStepSentence')); return;
        }
        if (demoTour.step === 5) {
            document.getElementById('tt-ai-btn')?.click(); await demoSleep(1200);
            if (!els.grammarPanel.classList.contains('expanded')) els.grammarTab.click();
            demoTour.step = 6; demoSetStep(t('demoStepGrammar')); return;
        }
        if (demoTour.step === 6) {
            els.grammarPanel?.classList.remove('expanded'); document.getElementById('tt-ask-btn')?.click(); await demoSleep(700);
            if (!els.askPanel.classList.contains('expanded')) els.askTab.click();
            demoTour.step = 7; demoSetStep(t('demoStepAsk')); return;
        }
        if (demoTour.step === 7) {
            els.askPanel?.classList.remove('expanded'); document.getElementById('btn-rules')?.click(); await demoSleep(900);
            if (!document.getElementById('rules-panel')?.classList.contains('expanded')) document.getElementById('btn-rules')?.click();
            await demoSleep(700); demoTour.step = 8; demoSetStep(t('demoStepRules')); return;
        }
        if (demoTour.step === 8) {
            (document.getElementById('rules-practice') || document.querySelector('.rules-section-practice, .grammar-practice-btn'))?.click(); await demoSleep(900); demoTour.step = 9; demoSetStep(t('demoStepPractice')); return;
        }
        if (demoTour.step === 9) {
            closeRulesPanel?.(); document.getElementById('btn-ink')?.click(); await demoWaitFor(() => document.querySelector('.pdf-page-wrapper .ink-layer'), 3000); demoDrawInk(); await demoSleep(500); demoTour.step = 10; demoSetStep(t('demoStepInk')); return;
        }
        if (demoTour.step === 10) {
            document.getElementById('ink-done')?.click(); demoTour.player.src = DEMO_TEXTBOOK_AUDIO; demoTour.player.play().catch(() => {}); await demoSleep(3500); demoTour.step = 11; demoSetStep(t('demoStepAudio')); return;
        }
        demoTour.player.pause(); demoTour.player.currentTime = 0; demoTour.busy = false; demoShowDone();
    } catch (error) {
        if (error.name !== 'AbortError') throw error;
    } finally {
        if (generation === demoTour.generation) demoTour.busy = false;
    }
}
async function openDemoTextbook() {
    if (demoTour.busy) return;
    const generation = ++demoTour.generation;
    demoTour.previousTranslate = state.translateMode;
    try {
        closeFullMenu?.();
        demoTour.busy = true; demoTour.step = 0; demoTour.root.classList.remove('demo-active'); demoTour.root.hidden = false; demoTour.next.hidden = true; demoTour.audio.hidden = true; demoTour.exit.hidden = false;
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
        demoTour.busy = false; demoShowWelcome();
    } catch (error) {
        if (generation !== demoTour.generation) return;
        demoTour.busy = false; demoTour.next.hidden = false; demoTour.audio.hidden = true;
        demoSetCopy(t('demoNoTarget'), { status: error.message || String(error) });
    }
}
function closeDemoTextbook() {
    demoTour.generation++; demoTour.busy = false;
    demoClearTarget(); demoTour.root.classList.remove('demo-active'); demoTour.root.hidden = true; demoTour.player.pause(); demoTour.player.currentTime = 0; demoTour.step = 0;
    stopTooltipSpeech?.(); stopGlobalTTS?.(); closeRulesPanel?.();
    if (state.inkMode) document.getElementById('ink-done')?.click();
    els.grammarPanel.classList.remove('expanded'); els.askPanel.classList.remove('expanded');
    dismissReaderPopup();
    demoRestoreSettings();
}
// Tour controls must not bubble into the reader's outside-popup dismissal.
demoTour.root.addEventListener('click', e => e.stopPropagation());
demoTour.root.addEventListener('pointerdown', e => e.stopPropagation());
demoTour.next.addEventListener('click', demoRunRoute);
demoTour.exit.addEventListener('click', closeDemoTextbook);
demoTour.audio.addEventListener('click', () => {
    demoTour.player.src = DEMO_TEXTBOOK_AUDIO;
    demoTour.player.play().catch(() => { demoTour.status.textContent = t('demoAudioError'); });
});
document.getElementById('btn-demo-textbook')?.addEventListener('click', openDemoTextbook);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !demoTour.root.hidden) closeDemoTextbook(); });
applyI18n();
