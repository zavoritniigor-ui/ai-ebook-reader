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
    if (state.touchJustCommitted && Date.now() - state.touchJustCommitted < 700) return;
    if (e.target.closest('#menu-handle, #quick-menu-dock')) return;
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

// The header wraps to two toolbar rows on narrower desktop/tablet widths (~97px), but .workspace used a fixed
// 58px offset, so the header covered the top of the book and the sidebar's Thumbnails/Contents tabs. Keep the
// workspace offset equal to the header's real height (phones keep their own collapsible-menu offset).
const appHeaderEl = document.getElementById('app-header');
if (appHeaderEl && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
        document.documentElement.style.setProperty('--app-header-h', `${Math.ceil(appHeaderEl.getBoundingClientRect().height)}px`);
    }).observe(appHeaderEl);
}

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
    if (!state.tooltipPersistent && !state.tooltipLoading) scheduleTooltipHide(1200);
});

// Розміщення вікна перекладу. Викликається двічі: одразу і ще раз після приходу
// перекладу — бо саме тоді вікно набуває остаточного розміру.
document.body.appendChild(els.tooltip);
function positionTooltip(clientX, clientY, anchorRect) {
    const vv = window.visualViewport;
    const viewWidth = vv?.width || innerWidth;
    const viewHeight = vv?.height || innerHeight;
    const viewLeft = vv?.offsetLeft || 0;
    const viewTop = vv?.offsetTop || 0;
    const margin = 10, gap = 12;

    let left = viewLeft, top = viewTop, width = viewWidth, height = viewHeight;
    if (typeof getReaderWorkspaceRect === 'function' && state.format === 'pdf' && viewWidth > 600) {
        const ws = getReaderWorkspaceRect();
        if (ws && ws.width >= 320) {
            left = ws.left;
            top = ws.top;
            width = ws.width;
            height = ws.height;
        }
    }
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

// The text the learner currently has in front of them in the popup: the whole selection for a multi-word
// selection (verbatim, however long), or the sentence around a single tapped word. Level / Explain use it, so the
// Quick Wheel acts on the live selection instead of on whatever an earlier AI action analysed.
function currentReaderSelectionText() {
    if (!els.tooltip || els.tooltip.style.display === 'none') return '';
    const shown = (state.lastSelectionText || els.ttOriginal?.textContent || '').trim();
    if (!shown) return '';
    return /\s/.test(shown) ? shown : ((state.ctxSentence || '').trim() || shown);
}

// Dismiss the reader's translation popup and its selection -- the popup's own close button, and anything that
// takes over the reading area (the Practice worksheet overlays the text the popup refers to).
function dismissReaderPopup() {
    cancelTooltipHide();
    els.tooltip.style.display = 'none';
    state.tooltipPersistent = false;
    stopTooltipSpeech();
    clearSelectionHighlight();
}
if (els.ttCloseBtn) {
    els.ttCloseBtn.onclick = (e) => {
        e.stopPropagation();
        dismissReaderPopup();
    };
}

// Key dialog contract. Each field is pre-filled with that provider's saved key (masked, type=password),
// so what the learner sees is exactly what Save stores -- never a placeholder. Per provider on Save:
//   typed value -> trimmed new key;  blank field -> keep the saved key (a cleared field is never a deletion);
//   "Remove key" -> delete (state and storage).
// The provider radio is a DRAFT choice that can be made before its key is typed; Save refuses to make a
// provider active without a key. Everything is applied to state + storage synchronously, so the very next
// request (aiProviderKey reads state at call time) uses the new provider/key -- no reload.
let keySettingsProvider, keySettingsLoaded = false;
function updateProviderRadios() {
    document.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
        radio.checked = radio.value === keySettingsProvider;
    });
}
function providerSettingsError(provider, message = missingAiKey(provider)) {
    const error = document.getElementById('ai-provider-error');
    error.textContent = message; error.hidden = false;
}
function keyField(provider) { return document.getElementById(AI_PROVIDERS[provider].input); }
// Trimmed key, '' for blank, or null when it cannot be a key: anything outside printable ASCII (control
// characters, inner whitespace, the • of a masked display, a pasted "…") or only dots/asterisks. The
// provider's own authentication stays the real validation -- no prefix/format rules here.
function normalizeAiKeyInput(value) {
    const key = String(value || '').trim();
    if (!key) return '';
    return /[^\x21-\x7E]/.test(key) || /^[.*]+$/.test(key) ? null : key;
}
function setKeyRemovePending(provider, pending) {
    const field = keyField(provider);
    if (pending) { field.value = ''; field.dataset.remove = '1'; }
    else delete field.dataset.remove;
    field.placeholder = pending ? t('aiKeyRemovePending') : aiProviderKey(provider) ? t('aiKeySavedHint') : field.dataset.example;
    const remove = document.getElementById(field.id + '-remove');
    if (remove) remove.hidden = pending || !aiProviderKey(provider);
}
// Key the provider will have if Save is pressed now.
function draftAiKey(provider) {
    const field = keyField(provider);
    if (field.dataset.remove) return '';
    const typed = normalizeAiKeyInput(field.value);
    return typed === '' ? aiProviderKey(provider) || '' : typed;
}
function openKeySettings() {
    bindKeyFields();
    Object.entries(AI_PROVIDERS).forEach(([provider, config]) => {
        const field = document.getElementById(config.input);
        field.dataset.example ??= field.placeholder;
        field.value = aiProviderKey(provider) || '';
        setKeyRemovePending(provider, false);
    });
    keySettingsProvider = state.activeAiProvider;
    keySettingsLoaded = true;
    updateProviderRadios();
    document.getElementById('ai-provider-error').hidden = true;
    document.getElementById('settings-modal').style.display = 'flex';
}
function closeKeySettings() {
    document.getElementById('settings-modal').style.display = 'none';
    keySettingsLoaded = false;
    // Preserve password masking while editing; remove key values from closed UI.
    Object.values(AI_PROVIDERS).forEach(config => { const field = document.getElementById(config.input); field.value = ''; delete field.dataset.remove; });
}
document.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
    radio.addEventListener('change', () => {
        keySettingsProvider = radio.value;
        updateProviderRadios();
        // A hint, not a refusal: the learner usually picks the provider first and pastes its key next.
        if (draftAiKey(radio.value)) document.getElementById('ai-provider-error').hidden = true;
        else providerSettingsError(radio.value);
    });
});
// Bound on first open: AI_PROVIDERS is declared in js/ai-client.js, which loads after this file.
let keyFieldsBound = false;
function bindKeyFields() {
    if (keyFieldsBound) return;
    keyFieldsBound = true;
    Object.entries(AI_PROVIDERS).forEach(([provider, config]) => {
        const field = document.getElementById(config.input);
        field.addEventListener('input', () => {
            if (field.dataset.remove && field.value) setKeyRemovePending(provider, false);
            if (provider === keySettingsProvider && draftAiKey(provider)) document.getElementById('ai-provider-error').hidden = true;
        });
        const remove = document.createElement('button');
        remove.type = 'button'; remove.id = config.input + '-remove'; remove.className = 'btn-ghost key-remove';
        remove.dataset.i18n = 'aiRemoveKey'; remove.textContent = t('aiRemoveKey'); remove.hidden = true;
        remove.onclick = () => setKeyRemovePending(provider, true);
        field.after(remove);
    });
}
function saveApiKey() {
    if (!keySettingsLoaded) return; // fields were never filled from state: saving them could wipe saved keys
    const provider = keySettingsProvider || state.activeAiProvider;
    const next = {};
    for (const [name, config] of Object.entries(AI_PROVIDERS)) {
        const field = document.getElementById(config.input);
        if (!field.dataset.remove && normalizeAiKeyInput(field.value) === null) {
            providerSettingsError(name, t('aiKeyInvalid').replace('{provider}', config.name)); field.focus(); return;
        }
        next[name] = draftAiKey(name);
    }
    // A new choice is committed only together with a key. Removing the CURRENT provider's key is allowed:
    // it disables AI, it never falls back to another provider.
    if (provider !== state.activeAiProvider && !next[provider]) { providerSettingsError(provider); return; }
    if (provider !== state.activeAiProvider || next[provider] !== aiProviderKey(provider)) cancelAIRequests();
    for (const [name, config] of Object.entries(AI_PROVIDERS)) {
        state[config.key] = next[name];
        if (next[name]) writeStored(config.storage, next[name]);
        else try { localStorage.removeItem(config.storage); } catch (e) { /* storage unavailable: state is still cleared */ }
    }
    state.activeAiProvider = provider;
    writeStored('reader_active_ai_provider', provider);
    closeKeySettings();
}
// The action offered next to a 401/403: opens the key dialog. A Retry afterwards re-reads the key from
// state (requests never capture it), so it uses the replacement.
function aiUpdateKeyButton() {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn-secondary ai-update-key';
    button.textContent = t('aiUpdateKey');
    button.onclick = () => openKeySettings();
    return button;
}
function isAiAuthError(err) { return !!err && (err.status === 401 || err.status === 403); }
