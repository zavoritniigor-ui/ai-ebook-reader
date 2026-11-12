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
    busy: false
};

function demoSetCopy(text, { status = '' } = {}) {
    if (demoTour.copy) demoTour.copy.textContent = text;
    if (demoTour.status) demoTour.status.textContent = status;
}
function demoSleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
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
    const spans = [...document.querySelectorAll('#pages .pdf-text-layer span')].filter(span => {
        const text = span.textContent.trim(); if (text.length < 3) return false;
        const r = span.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight;
    });
    return spans.find(s => /bonjour|salut|comment|monsieur|madame/i.test(s.textContent)) || spans[0] || null;
}
function demoRealTap(target) {
    const r = target.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: 1, view: window };
    try { target.dispatchEvent(new PointerEvent('pointerdown', { ...init, pointerId: 1, pointerType: 'touch' })); } catch (e) {}
    try { target.dispatchEvent(new PointerEvent('pointerup', { ...init, pointerId: 1, pointerType: 'touch', buttons: 0 })); } catch (e) {}
    target.dispatchEvent(new MouseEvent('click', init));
}
async function demoRunRoute() {
    if (demoTour.busy) return;
    demoTour.busy = true; demoTour.root.hidden = true; demoClearTarget();
    demoSetCopy(t('demoRunning'));
    if (!state.translateMode) els.translateBtn?.click();
    // Touch the reader's non-AI controls too: zoom, page navigation, contents,
    // page speech, the book-audio surface and the region tool all remain the
    // production handlers. Each is opened and returned to the reading surface.
    document.getElementById('zoom-in')?.click();
    document.getElementById('zoom-out')?.click();
    const pageRange = document.getElementById('pdf-page-range');
    if (pageRange && Number(pageRange.max) > 1) {
        pageRange.value = '2'; pageRange.dispatchEvent(new Event('input', { bubbles: true }));
        pageRange.value = '1'; pageRange.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.getElementById('toggle-toc-desktop')?.click();
    await demoSleep(250);
    document.getElementById('toggle-toc-desktop')?.click();
    document.getElementById('btn-tts')?.click();
    await demoSleep(450);
    document.getElementById('btn-tts-stop')?.click();
    document.getElementById('btn-book-audio')?.click();
    await demoSleep(250);
    document.getElementById('book-audio-dialog')?.close();
    document.getElementById('btn-region')?.click();
    await demoSleep(180);
    document.getElementById('region-cancel')?.click();
    const target = await demoWaitFor(demoVisibleTextTarget, 12000);
    if (!target) { demoTour.busy = false; demoTour.root.hidden = false; demoSetCopy(t('demoNoTarget')); demoTour.next.hidden = false; return; }
    demoTour.target = target; target.classList.add('demo-tour-target'); target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await demoSleep(650); demoRealTap(target);
    const tooltip = await demoWaitFor(() => els.tooltip.style.display === 'flex', 12000);
    if (tooltip) {
        await demoSleep(500);
        document.getElementById('tt-struct-btn')?.click();
        await demoSleep(850);
        // The word popup also exposes Ask AI and contextual Grammar. Opening
        // and closing both exercises their real panel lifecycle without making
        // an unsolicited AI request during a public demo.
        els.askTab?.click(); await demoSleep(220); els.askTab?.click();
        els.grammarTab?.click(); await demoSleep(220); els.grammarTab?.click();
        document.getElementById('btn-rules')?.click();
        await demoSleep(800);
        // With an AI key the first Rules tap may intentionally start its background
        // scan. A second real tap opens the panel, just as it does for a learner.
        if (!document.getElementById('rules-panel')?.classList.contains('expanded')) {
            document.getElementById('btn-rules')?.click();
            await demoSleep(650);
        }
        // Rules exposes the same Practice entry used by a learner. The click is
        // intentional even when no AI key is configured: the reader then shows its
        // normal, honest "key required" state instead of a fake demo panel.
        document.getElementById('rules-practice')?.click();
        await demoSleep(1200);
        if (typeof closePractice === 'function' && document.getElementById('practice-panel') && !document.getElementById('practice-panel').hidden) closePractice();
        closeRulesPanel?.();
        // Exercise the actual handwriting surface with a short stylus-like stroke.
        document.getElementById('btn-ink')?.click();
        const ink = await demoWaitFor(() => document.querySelector('.pdf-page-wrapper .ink-layer'), 3000);
        if (ink) {
            const r = ink.getBoundingClientRect(), x = r.left + Math.min(80, r.width / 3), y = r.top + Math.min(90, r.height / 3);
            const init = { bubbles: true, cancelable: true, composed: true, pointerId: 17, pointerType: 'pen', clientX: x, clientY: y, buttons: 1, view: window };
            ink.dispatchEvent(new PointerEvent('pointerdown', init));
            ink.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: x + 42, clientY: y + 18 }));
            ink.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: x + 42, clientY: y + 18, buttons: 0 }));
        }
        document.getElementById('ink-done')?.click();
    }
    demoTour.busy = false; demoShowDone();
}
async function openDemoTextbook() {
    if (demoTour.busy) return;
    try {
        closeFullMenu?.();
        demoTour.busy = true; demoTour.root.hidden = false; demoTour.next.hidden = true; demoTour.audio.hidden = true; demoTour.exit.hidden = false;
        demoSetCopy(t('demoWelcome'), { status: t('demoLoading') });
        const response = await fetch(DEMO_TEXTBOOK_PDF, { credentials: 'same-origin', cache: 'force-cache' });
        if (!response.ok) throw new Error('demo PDF HTTP ' + response.status);
        const file = new File([await response.blob()], 'Français interactif - Démo.pdf', { type: 'application/pdf', lastModified: 2019 });
        Object.defineProperty(file, '__readerDemo', { value: true });
        demoTour.previousTranslate = state.translateMode;
        demoSetTargetLanguage();
        await openBookFile(file);
        await demoWaitFor(() => state.pdfDoc && state.format === 'pdf', 12000);
        demoTour.busy = false; demoShowWelcome();
    } catch (error) {
        demoTour.busy = false; demoTour.next.hidden = false; demoTour.audio.hidden = true;
        demoSetCopy(t('demoNoTarget'), { status: error.message || String(error) });
    }
}
function closeDemoTextbook() {
    demoClearTarget(); demoTour.root.hidden = true; demoTour.player.pause(); demoTour.player.currentTime = 0;
    stopTooltipSpeech?.(); stopGlobalTTS?.(); closeRulesPanel?.();
    demoRestoreSettings();
}
demoTour.next.addEventListener('click', demoRunRoute);
demoTour.exit.addEventListener('click', closeDemoTextbook);
demoTour.audio.addEventListener('click', () => {
    demoTour.player.src = DEMO_TEXTBOOK_AUDIO;
    demoTour.player.play().catch(() => { demoTour.status.textContent = t('demoAudioError'); });
});
document.getElementById('btn-demo-textbook')?.addEventListener('click', openDemoTextbook);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !demoTour.root.hidden) closeDemoTextbook(); });
applyI18n();
