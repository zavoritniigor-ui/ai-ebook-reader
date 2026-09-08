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
    if (state.format !== 'pdf') { alert(t('regionPdfOnly')); return; }
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
    exitRegionMode();
    if (rect.width < 20 || rect.height < 20) return;   // випадковий тап
    const dataUrl = cropPdfRegion(rect);
    if (!dataUrl) { alert(t('regionFail')); return; }
    openCropPreview(dataUrl);
});

regionOverlay.addEventListener('pointercancel', () => { regionStart = null; regionBox.style.display = 'none'; });
const cropDialog = document.getElementById('crop-dialog');
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
    try {
        if (!navigator.canShare?.({ files })) throw new Error('Share image недоступний. Скористайтеся Save PNG.');
        await navigator.share({ files });
    } catch (e) {
        if (e.name !== 'AbortError') document.getElementById('crop-status').textContent = e.message;
    }
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
    const preview = document.getElementById('crop-preview');
    if (!preview.complete || !preview.naturalWidth) return;
    const canvas = document.createElement('canvas');
    const k = Math.min(1, 1000 / Math.max(preview.naturalWidth, preview.naturalHeight));
    canvas.width = Math.round(preview.naturalWidth*k); canvas.height = Math.round(preview.naturalHeight*k);
    canvas.getContext('2d').drawImage(preview, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', .85);
    closeCropPreview(); checkExerciseImage(data);
};

// Вирізає ділянку з полотна сторінки PDF у власній роздільності полотна,
// а не екрана — тому дрібний рукописний текст лишається читабельним.
function cropPdfRegion(rect) {
    const canvas = els.pages.querySelector('canvas.pdf-canvas');
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
    const ink = inkCanvas();
    if (ink && ink.width === canvas.width) {
        octx.drawImage(ink, sx, sy, sw, sh, 0, 0, out.width, out.height);
    }
    // PNG без втрат також підтримується ClipboardItem.
    return out.toDataURL('image/png');
}

async function checkExerciseImage(dataUrl) {
    const task = beginAsyncTask('ask');
    cancelAsyncTasks(['panelTranslate']);
    els.askPanel.classList.remove('loading', 'ready');
    const langName = LANG_NAMES[state.targetLang] || 'українською';
    els.askPanel.classList.add('expanded');
    els.askContent.innerHTML = `<div style="text-align:center;margin-top:40px;"><div class="spinner-large"></div><p class="tt-note">${t('checking')}</p></div>`;
    // Запит навмисно короткий: кожен зайвий рядок інструкції — це витрачені токени,
    // а їхній ліміт тут головне обмеження.
    const prompt = `Вправа з підручника, відповіді вписані учнем. Відповідай ${langName}, HTML без markdown.
Для кожної відповіді один рядок: відповідь — ✅ або ❌ — правильний варіант і правило (3–5 слів).
Наприкінці: <b>підсумок</b> N/M. Нерозбірливе познач як «?». Без вступу й без повторення завдання.`;
    try {
        const out = await callAIVision(prompt, dataUrl, task.signal);
        if (!task.current()) return;
        els.askContent.innerHTML = safeHtml(out, true);
    } catch (err) {
        if (!task.current()) return;
        if (!task.current()) {
            if (!asyncTasks.has('ask')) els.askContent.innerHTML = `<span class="tt-note">Запит скасовано</span>`;
            return;
        }
        els.askContent.innerHTML = `<span style="color:red">${escapeHtml(err.message || t('error'))}</span>`;
    }
}
