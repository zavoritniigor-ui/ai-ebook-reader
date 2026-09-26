/* pdf-crop.js — виділення області сторінки PDF (пером/мишею/пальцем) і перевірка
 * вправи через AI vision: regionStart/regionBox — стан обведення (region-mode),
 * exitRegionMode виходить без захоплення, cropPdfRegion вирізає саме обведену
 * ділянку з canvas сторінки, openCropPreview/closeCropPreview показують/ховають
 * попередній перегляд (Save PNG / Share / Copy PNG / надіслати AI), і
 * checkExerciseImage надсилає обрізане зображення на перевірку.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/pdf-ink.js. checkExerciseImage викликає callAIVision (js/ai-client.js,
 * завантажується пізніше за цей файл) — forward-виклик лише всередині async-
 * функції, викликається виключно з крoп-флоу, тому лишається тут, а не в
 * ai-client.js (той самий підхід, що вже описаний для pdfAnchor).
 */

// ========== ВИДІЛЕННЯ ОБЛАСТІ СТОРІНКИ Й ПЕРЕВІРКА ЧЕРЕЗ AI ==========
// Обводиш пером (або мишею чи пальцем) фрагмент вправи — програма вирізає саме цю
// ділянку зі сторінки PDF. Надсилання AI — лише окрема явна дія після preview.
const regionOverlay = document.getElementById('region-overlay');
const regionBox = document.getElementById('region-box');
let regionStart = null;
document.getElementById('region-cancel').onclick = exitRegionMode;

document.getElementById('btn-region').onclick = () => {
    if (state.format !== 'pdf') { showToast(t('regionPdfOnly')); return; }
    state.inkMode = false; document.body.classList.remove('ink-mode');
    document.body.classList.add('region-mode');
    document.body.classList.add('immersive-mode');   // прибираємо меню з дороги
};
function exitRegionMode() {
    document.body.classList.remove('region-mode');
    regionBox.style.display = 'none';
    regionStart = null;
}
// Escape або тап поза межами — вихід без захоплення.
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('region-mode')) exitRegionMode();
});
regionOverlay.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || regionStart || pdfPointers.size > 1) return;
    regionStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
    regionBox.style.display = 'block';
    regionBox.style.left = e.clientX + 'px'; regionBox.style.top = e.clientY + 'px';
    regionBox.style.width = '0px'; regionBox.style.height = '0px';
    regionOverlay.setPointerCapture(e.pointerId);
    e.preventDefault();
});
regionOverlay.addEventListener('pointermove', (e) => {
    if (!regionStart || regionStart.id !== e.pointerId) return;
    const x = Math.min(e.clientX, regionStart.x), y = Math.min(e.clientY, regionStart.y);
    regionBox.style.left = x + 'px'; regionBox.style.top = y + 'px';
    regionBox.style.width = Math.abs(e.clientX - regionStart.x) + 'px';
    regionBox.style.height = Math.abs(e.clientY - regionStart.y) + 'px';
});
regionOverlay.addEventListener('pointerup', async (e) => {
    if (!regionStart || regionStart.id !== e.pointerId) return;
    const rect = {
        left: Math.min(e.clientX, regionStart.x), top: Math.min(e.clientY, regionStart.y),
        width: Math.abs(e.clientX - regionStart.x), height: Math.abs(e.clientY - regionStart.y)
    };
    // Resolve WHICH page the gesture started on — continuous scroll can have
    // several pages rendered at once, unlike the old single-page layout.
    const startWrapper = document.elementFromPoint(regionStart.x, regionStart.y)?.closest('.pdf-page-wrapper');
    exitRegionMode();
    if (rect.width < 20 || rect.height < 20) return;   // випадковий тап
    const dataUrl = cropPdfRegion(rect, startWrapper);
    if (!dataUrl) { showToast(t('regionFail')); return; }
    openCropPreview(dataUrl);
});

regionOverlay.addEventListener('pointercancel', () => { regionStart = null; regionBox.style.display = 'none'; });
const cropDialog = document.getElementById('crop-dialog');
Object.assign(I18N, {
    cropAttached: { uk: 'Фрагмент сторінки додано. Поставте запитання й натисніть ➤', en: 'Page crop attached. Ask your question and press ➤', fr: 'Extrait de page joint. Posez votre question et appuyez sur ➤', ru: 'Фрагмент страницы добавлен. Задайте вопрос и нажмите ➤' },
    cropRemove: { uk: 'Прибрати зображення', en: 'Remove image', fr: "Retirer l'image", ru: 'Убрать изображение' },
    cropAskPlaceholder: { uk: 'Запитання про зображення (порожнє — перевірити вправу)', en: 'Question about the image (empty = check the exercise)', fr: "Question sur l'image (vide = vérifier l'exercice)", ru: 'Вопрос об изображении (пусто — проверить упражнение)' },
    shareNeedsHttps: { uk: 'Поділитися можна лише на сторінці https://. Скористайтеся Save PNG.', en: 'Sharing needs the https:// page. Use Save PNG.', fr: 'Le partage nécessite la page https://. Utilisez Save PNG.', ru: 'Поделиться можно только на странице https://. Используйте Save PNG.' },
    shareUnsupported: { uk: 'Цей браузер не має системного меню «Поділитися». Скористайтеся Save PNG або Copy image.', en: 'This browser has no system Share menu. Use Save PNG or Copy image.', fr: "Ce navigateur n'a pas de menu Partager. Utilisez Save PNG ou Copy image.", ru: 'В этом браузере нет системного меню «Поделиться». Используйте Save PNG или Copy image.' },
    shareFilesUnsupported: { uk: 'Цей браузер не може поділитися зображенням. Скористайтеся Save PNG або Copy image.', en: 'This browser cannot share images. Use Save PNG or Copy image.', fr: "Ce navigateur ne peut pas partager d'images. Utilisez Save PNG ou Copy image.", ru: 'Этот браузер не может поделиться изображением. Используйте Save PNG или Copy image.' },
    shareFailed: { uk: 'Не вдалося поділитися', en: 'Sharing failed', fr: 'Échec du partage', ru: 'Не удалось поделиться' },
});
let cropData = null, cropBlob = null;
function closeCropPreview() {
    cropDialog.close(); cropData = null; cropBlob = null;
    document.getElementById('crop-preview').removeAttribute('src');
}
function openCropPreview(dataUrl) {
    cropData = dataUrl;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    cropBlob = new Blob([bytes], { type: 'image/png' });
    document.getElementById('crop-preview').src = dataUrl;
    document.getElementById('crop-status').textContent = '';
    cropDialog.showModal();
    document.getElementById('crop-cancel').focus();
}
const cropFile = () => new File([cropBlob], `pdf-page-${state.currentIndex}.png`, { type: 'image/png' });
document.getElementById('crop-cancel').onclick = closeCropPreview;
cropDialog.addEventListener('cancel', e => { e.preventDefault(); closeCropPreview(); });
document.getElementById('crop-save').onclick = () => {
    if (!cropBlob) return;
    const url = URL.createObjectURL(cropBlob), a = document.createElement('a');
    a.href = url; a.download = cropFile().name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.getElementById('crop-share').onclick = async () => {
    if (!cropBlob) return;
    const files = [cropFile()];
    const status = document.getElementById('crop-status');
    status.textContent = '';
    // The OS share sheet lists the apps that accept images (including AI apps, if installed); the page never
    // chooses or enumerates them. share() runs synchronously inside the click: the File is built from a Blob made
    // when the preview opened, so the tap's user activation is still valid.
    const reason = !window.isSecureContext ? 'shareNeedsHttps' : !navigator.share ? 'shareUnsupported'
        : !navigator.canShare?.({ files }) ? 'shareFilesUnsupported' : null;
    if (reason) { status.textContent = t(reason); return; }
    try { await navigator.share({ files }); }
    catch (e) { if (e.name !== 'AbortError') status.textContent = `${t('shareFailed')} (${e.name}: ${e.message})`; }
};
document.getElementById('crop-copy').onclick = async () => {
    if (!cropBlob) return;
    try {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('Copy image недоступний. Скористайтеся Save PNG.');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': cropBlob })]);
        document.getElementById('crop-status').textContent = '✓ Copied';
    } catch (e) { document.getElementById('crop-status').textContent = e.message; }
};
document.getElementById('crop-ai').onclick = () => {
    if (!cropData || document.hidden) return;
    // No key: say so here and keep the dialog (and the crop) instead of attaching something that cannot be sent.
    if (!aiAvailable()) { document.getElementById('crop-status').textContent = t('needKey'); return; }
    const preview = document.getElementById('crop-preview');
    if (!preview.complete || !preview.naturalWidth) return;
    const canvas = document.createElement('canvas');
    const k = Math.min(1, 1000 / Math.max(preview.naturalWidth, preview.naturalHeight));
    canvas.width = Math.round(preview.naturalWidth*k); canvas.height = Math.round(preview.naturalHeight*k);
    canvas.getContext('2d').drawImage(preview, 0, 0, canvas.width, canvas.height);
    // Attach, don't ask yet: the crop dialog is modal, so anything shown in Ask AI while it stays open (spinner,
    // errors) was invisible behind it. Close it, show the crop in Ask AI and let the reader ask their question.
    const data = canvas.toDataURL('image/jpeg', .85);
    closeCropPreview();
    attachToAsk(data);
};

// ========== КРОП ЯК ВКЛАДЕННЯ ДО "ЗАПИТАЙ AI" ==========
// One attachment at a time: a new crop replaces it, ✕ or closing Ask AI removes it, a successful answer consumes
// it (it is never sent again with a later question); on an error it stays for a retry.
let askAttachment = null;
function renderAskAttachment() {
    const box = document.getElementById('ask-attachment');
    box.hidden = !askAttachment;
    document.getElementById('ask-attachment-img').src = askAttachment ? askAttachment.dataUrl : '';
    document.getElementById('ask-attachment-label').textContent = askAttachment ? t('cropAttached') : '';
    document.getElementById('ask-attachment-remove').setAttribute('aria-label', t('cropRemove'));
    els.askInput.placeholder = askAttachment ? t('cropAskPlaceholder') : t('ask');
}
function attachToAsk(dataUrl) {
    askAttachment = { dataUrl };
    renderAskAttachment();
    els.askPanel.classList.add('expanded');
    // A collapsed panel turns visible only once its slide-in (visibility transition) starts, a few frames later;
    // until then the input cannot take focus. Try each frame until it does (bounded).
    let frames = 0;
    const focusInput = () => {
        els.askInput.focus();
        if (document.activeElement !== els.askInput && askAttachment && ++frames < 30) requestAnimationFrame(focusInput);
    };
    focusInput();
}
function clearAskAttachment() { if (!askAttachment) return; askAttachment = null; renderAskAttachment(); }
document.getElementById('ask-attachment-remove').onclick = () => { clearAskAttachment(); els.askInput.focus(); };
new MutationObserver(() => { if (!els.askPanel.classList.contains('expanded')) clearAskAttachment(); })
    .observe(els.askPanel, { attributes: true, attributeFilter: ['class'] });
// Send in Ask AI while a crop is attached: the question and the image go together. No question = the existing
// exercise check.
// Idempotent while its request runs: ➤ is a submit button whose form submit clicks ➤ again, and Enter both
// clicks it and submits -- the text-only path is protected by its emptied input, but an empty question is
// valid here (= exercise check), so the second activation would send a second vision request.
function sendAskAttachment(question) {
    if (!askAttachment || askAttachment.sending) return;
    if (!aiAvailable()) { showToast(t('needKey')); els.askInput.focus(); return; }
    stopDictation();
    els.askInput.value = '';
    askAttachment.sending = true;
    checkExerciseImage(askAttachment.dataUrl, question);
}

// Вирізає ділянку з полотна сторінки PDF у власній роздільності полотна,
// а не екрана — тому дрібний рукописний текст лишається читабельним.
// `pageWrapper` — обгортка сторінки, на якій почався жест (continuous scroll
// рендерить кілька сторінок одночасно, тому querySelector-по-першій-сторінці
// вже недостатній); якщо не визначено, беремо активну сторінку як і раніше.
function cropPdfRegion(rect, pageWrapper) {
    // Fall back to the currently VISIBLE page (state.currentIndex), not
    // activeInkPage() — that tracks "last page ink was drawn on" for the ink
    // undo/clear toolbar, a different page entirely once the reader has
    // since scrolled/jumped elsewhere without drawing again.
    const wrapper = pageWrapper || pdfPageWrappers?.[state.currentIndex] || els.pages.querySelector('.pdf-page-wrapper');
    const canvas = wrapper?.querySelector('canvas.pdf-canvas');
    if (!canvas) return null;
    const cr = canvas.getBoundingClientRect();
    const kx = canvas.width / cr.width, ky = canvas.height / cr.height;
    const sx = Math.max(0, (rect.left - cr.left) * kx);
    const sy = Math.max(0, (rect.top - cr.top) * ky);
    const sw = Math.min(canvas.width, (rect.left + rect.width - cr.left) * kx) - sx;
    const sh = Math.min(canvas.height, (rect.top + rect.height - cr.top) * ky) - sy;
    if (sw < 5 || sh < 5) return null;
    // Обмежуємо буфер експорту, зберігаючи достатню якість для дрібного письма.
    const MAX_SIDE = 2400; // Bound export memory while preserving small handwriting.
    const k = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const out = document.createElement('canvas');
    out.width = Math.round(sw * k); out.height = Math.round(sh * k);
    const octx = out.getContext('2d');
    octx.imageSmoothingQuality = 'high';
    octx.fillStyle = '#fff';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
    // Накладаємо написане від руки — саме воно й має піти на перевірку разом із вправою.
    const ink = wrapper.querySelector('.ink-layer');
    if (ink && ink.width === canvas.width) {
        octx.drawImage(ink, sx, sy, sw, sh, 0, 0, out.width, out.height);
    }
    // PNG без втрат також підтримується ClipboardItem.
    return out.toDataURL('image/png');
}

async function checkExerciseImage(dataUrl, question = '') {
    const task = beginAsyncTask('ask');
    const requestId = ++askRequestSeq;   // panel ownership, see settleCancelledAskRequest (js/grammar-svo.js)
    // Retry resends the same question with the same image, once: the attachment counts as sending again.
    const retry = () => {
        if (askAttachment && askAttachment.dataUrl === dataUrl) askAttachment.sending = true;
        checkExerciseImage(dataUrl, question);
    };
    cancelAsyncTasks(['panelTranslate']);
    els.askPanel.classList.remove('loading', 'ready');
    const langName = LANG_NAMES[state.targetLang] || 'українською';
    els.askPanel.classList.add('expanded', 'loading');
    els.askContent.replaceChildren(askRequestView(requestId, `<div style="text-align:center;margin-top:40px;"><div class="spinner-large"></div><p class="tt-note">${t(question ? 'generating' : 'checking')}</p>${question ? `<p><b>${escapeHtml(question)}</b></p>` : ''}</div>`));
    // Запит навмисно короткий: кожен зайвий рядок інструкції — це витрачені токени,
    // а їхній ліміт тут головне обмеження.
    const prompt = question
        ? `${question}\n\nЗображення — фрагмент сторінки книги, яку читає користувач. Відповідай ${langName}, HTML без markdown, стисло.`
        : `Вправа з підручника, відповіді вписані учнем. Відповідай ${langName}, HTML без markdown.
Для кожної відповіді один рядок: відповідь — ✅ або ❌ — правильний варіант і правило (3–5 слів).
Наприкінці: <b>підсумок</b> N/M. Нерозбірливе познач як «?». Без вступу й без повторення завдання.`;
    try {
        const out = await callAIVision(prompt, dataUrl, task.signal, { anyPosition: true });
        if (!task.current()) { settleCancelledCrop(); return; }
        els.askPanel.classList.remove('loading'); els.askPanel.classList.add('ready');
        els.askContent.innerHTML = safeHtml(out, true);
        if (askAttachment && askAttachment.dataUrl === dataUrl) clearAskAttachment();   // answered: not re-sent later
    } catch (err) {
        if (isAskAbort(err, task)) { settleCancelledCrop(); return; }
        els.askPanel.classList.remove('loading');
        if (askAttachment && askAttachment.dataUrl === dataUrl) askAttachment.sending = false;
        // The attachment stays; Retry resends the same question with the same image.
        const button = document.createElement('button');
        button.textContent = t('retry');
        button.style.cssText = 'margin-top:10px;padding:8px 16px;background:#007AFF;color:white;border:0;border-radius:4px;cursor:pointer;';
        button.onclick = retry;
        els.askContent.innerHTML = `<div><span style="color:red">${escapeHtml(err.message || t('error'))}</span><br/></div>`;
        els.askContent.firstChild.append(button);
    }
    // Cancelled: leave "generating" (unless a newer Ask request owns the panel); the crop stays attached and can
    // be sent again -- by Retry or by Send.
    function settleCancelledCrop() {
        if (settleCancelledAskRequest(task, requestId, retry) && askAttachment && askAttachment.dataUrl === dataUrl) askAttachment.sending = false;
    }
}
