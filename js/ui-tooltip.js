/* ui-tooltip.js — спливаюча підказка перекладу й підменю нижньої ручки: закриття
 * "тапом деінде" (одна pointerdown-функція закриває і підказку, і футер-меню —
 * вони обидва транзитні оверлеї з тим самим "зникають при тапі повз" правилом,
 * тому лишаються разом, а не розділені за формальною назвою функції),
 * positionTooltip/repositionTooltip (розміщення підказки відносно visualViewport,
 * з урахуванням мобільної клавіатури), scheduleTooltipHide/cancelTooltipHide
 * (автозникнення), openFooterMenu/closeFooterMenu/enterMobileFullScreenIfNeeded,
 * і панель налаштувань ключів (openKeySettings/closeKeySettings/saveApiKey).
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/pdf-zoom-pan.js. stopTooltipSpeech/clearSelectionHighlight/
 * alignmentSourceAt (з js/tts.js та js/translation.js, уже завантажені раніше)
 * викликаються лише всередині pointerdown-колбека — відкладено, безпечно
 * незалежно від порядку файлів.
 *
 * Примітка щодо MODULARIZATION_PLAN.md: план відносив openFooterMenu/
 * closeFooterMenu/enterMobileFullScreenIfNeeded до navigation.js (Крок 9), але
 * після факту переносу (Крок 15) виявилось, що вони фізично переплетені з
 * логікою закриття підказки перекладу в одній функції — тому лишились тут,
 * а не в navigation.js, як і задокументовано в MIGRATION_STATUS.md.
 */

// pointerup (а не лише mouseup) — щоб виділення, зроблене СТИЛУСОМ, теж одразу
// перекладалося, так само як мишею. Палець сюди не потрапляє: ним не виділяють,
// ним гортають, а речення береться утриманням.
// (Виділення перетягуванням значком по словах — wordBoundsAt/rangeBetweenWords/
// pointerdown-move-up — перенесено в js/selection.js разом з рештою selection.js;
// цей коментар лишається як орієнтир, де воно фізично було в оригінальному файлі.)

// ========== ПІДМЕНЮ "РОЗДІЛ/СТОРІНКА/ВПЕРЕД/НАЗАД" ЗА ПРОЗОРОЮ РУЧКОЮ (мобільний/планшет) ==========
let footerAutoHideTimer;
function openFooterMenu() {
    document.body.classList.add('footer-open');
    clearTimeout(footerAutoHideTimer);
    footerAutoHideTimer = setTimeout(() => document.body.classList.remove('footer-open'), 4000);
}
function closeFooterMenu() { document.body.classList.remove('footer-open'); clearTimeout(footerAutoHideTimer); }
if (els.footerHandle) {
    els.footerHandle.addEventListener('click', (e) => { e.stopPropagation(); openFooterMenu(); });
}
// Тап деінде — закриває підменю (так само, як зараз ховається підказка перекладу)
// pointerdown, а не mousedown: на сенсорному екрані mousedown приходить із затримкою
// (а подекуди не приходить зовсім), і "залипле" вікно перекладу речення не закривалось.
// Системне меню Android ("Копіювати / Надіслати / Вибрати все") з'являється лише
// на виділення, зроблене САМИМ користувачем. Подія selectstart виникає тільки для
// таких жестів і не виникає для програмного виділення, тому блокуємо її на дотик —
// пошук слова через Selection.modify() при цьому працює як і раніше.
// Тип вказівника вирішує, чи дозволяти системне виділення: палець — ні (інакше поверх
// сторінки вискакує власне вікно пошуку/перекладу Chrome), стилус і миша — так.
let lastPointerType = 'mouse';
document.addEventListener('pointerdown', (e) => {
    lastPointerType = e.pointerType || 'mouse';
    document.body.classList.toggle('finger-input', lastPointerType === 'touch');
}, true);
document.addEventListener('selectstart', (e) => {
    if (lastPointerType === 'touch' && e.target && e.target.closest && e.target.closest('#reader-pages')) e.preventDefault();
});
document.addEventListener('contextmenu', (e) => {
    if (lastPointerType === 'touch' && e.target && e.target.closest && e.target.closest('#reader-pages')) e.preventDefault();
});

document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#menu-handle, #quick-wheel')) return;
    let closedPopup = false;
    if (!e.target.closest('#word-tooltip') && !e.target.closest('.side-panel') && !e.target.closest('header') && alignmentSourceAt(e.clientX, e.clientY) === null) {
        if (els.tooltip.style.display !== 'none') closedPopup = true;
        cancelTooltipHide();
        els.tooltip.style.display = 'none';
        state.tooltipPersistent = false;
        stopTooltipSpeech();     // закрили вікно — озвучення теж зупиняємо
        clearSelectionHighlight();
    }
    if (document.body.classList.contains('footer-open') && !e.target.closest('#app-footer') && !e.target.closest('#footer-handle')) {
        closeFooterMenu();
        closedPopup = true;
    }
    if (closedPopup) {
        state.tooltipJustClosed = true;
        setTimeout(() => state.tooltipJustClosed = false, 100);
    }
});

// Повноекранний режим на телефоні/планшеті: після відкриття книги ховаємо header —
// футер на мобільному вже прихований за замовчуванням через CSS.
function enterMobileFullScreenIfNeeded() {
    if (window.innerWidth <= 1180) document.body.classList.add('immersive-mode');
}
// Підказка зникає сама приблизно за 1,8 с — щоб можна було читати далі, не тапаючи
// спеціально в інше місце. Таймер зупиняється, поки палець/курсор на самій підказці,
// інакше кнопки "Запитай AI" та "Граматика" встигали б зникнути з-під пальця.

let tooltipHideTimer;
function scheduleTooltipHide(delay = 1800) {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = setTimeout(() => { els.tooltip.style.display = 'none'; clearSelectionHighlight(); }, delay);
}
function cancelTooltipHide() { clearTimeout(tooltipHideTimer); }
els.tooltip.addEventListener('pointerenter', cancelTooltipHide);
els.tooltip.addEventListener('pointerdown', cancelTooltipHide);
els.tooltip.addEventListener('pointerleave', () => {
    // Для речення вікно не закриваємо — воно має лишатись, поки читаєш оригінал.
    if (!state.tooltipPersistent) scheduleTooltipHide(1200);
});

// Розміщення вікна перекладу. Викликається двічі: одразу і ще раз після приходу
// перекладу — бо саме тоді вікно набуває остаточного розміру.
document.body.appendChild(els.tooltip);
function positionTooltip(clientX, clientY, anchorRect) {
    const vv = window.visualViewport;
    const left = vv?.offsetLeft || 0, top = vv?.offsetTop || 0;
    const width = vv?.width || innerWidth, height = vv?.height || innerHeight;
    const margin = 10, gap = 12;
    els.tooltip.style.maxWidth = `${Math.max(0, Math.min(560, width - 2*margin))}px`;
    els.tooltip.style.maxHeight = `${Math.max(0, Math.min(height - 2*margin, width <= 600 ? height*.7 : height))}px`;
    els.tooltip.style.height = '';
    const w = els.tooltip.offsetWidth, h = els.tooltip.offsetHeight;
    let r = anchorRect;
    if (!r || r.height > height/2) r = { left: clientX, right: clientX, top: clientY, bottom: clientY };
    let x = (r.left+r.right)/2, y = r.bottom+gap;
    const above = r.top-gap-h >= top+margin;
    els.tooltip.classList.toggle('tooltip-above', above);
    if (width <= 600) { x = left+width/2; y = top+height-h-margin; }
    else if (above) y = r.top-gap-h;
    else if (y+h > top+height-margin && r.right+gap+w < left+width-margin) {
        x = r.right+gap+w/2; y = r.top;
    }
    x = Math.max(left+margin+w/2, Math.min(x,left+width-margin-w/2));
    y = Math.max(top+margin, Math.min(y,top+height-margin-h));
    els.tooltip.style.left = `${x}px`; els.tooltip.style.top = `${y}px`;
}
function repositionTooltip() {
    if (els.tooltip.style.display !== 'flex') return;
    const a = state.tooltipAnchor;
    if (a) positionTooltip(a.clientX, a.clientY, a.anchorRect);
}
window.visualViewport?.addEventListener('resize', repositionTooltip);
window.visualViewport?.addEventListener('scroll', repositionTooltip);

function openKeySettings() {
    // Показуємо вже збережені ключі, щоб їх було видно й можна було замінити.
    document.getElementById('api-key-input').value = state.apiKey || '';
    document.getElementById('groq-key-input').value = state.groqKey || '';
    document.getElementById('settings-modal').style.display = 'flex';
}
function closeKeySettings() {
    document.getElementById('settings-modal').style.display = 'none';
}
function saveApiKey() {
    state.apiKey = document.getElementById('api-key-input').value.trim();
    state.groqKey = document.getElementById('groq-key-input').value.trim();
    writeStored('reader_gemini_key', state.apiKey);
    writeStored('reader_groq_key', state.groqKey);
    document.getElementById('settings-modal').style.display = 'none';
}
