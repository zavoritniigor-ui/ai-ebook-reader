/* Bottom-center Quick Menu: a separate, thumb-reach convenience control for the
 * six existing reader actions, plus a shared Full-menu toggle. Existing controls
 * remain the sole source of action behavior — nothing here duplicates business
 * logic. The top/full menu (#menu-handle → body.immersive-mode) is completely
 * independent: opening/closing the Quick Menu never touches it, and the ONLY
 * connection is the Quick Menu's own central "Full menu" button, which calls the
 * exact same toggleFullMenu() the top control calls.
 *
 * Loaded before main.js (i18n bootstrap) and pwa-lifecycle.js (overlay history). */
I18N.wheelOpen = Object.fromEntries(Object.entries(I18N.open).map(([lang, label]) => [lang, label.replace(/^[^\p{L}]+/u, '')]));
I18N.wheelTitle = { en:'Quick actions', uk:'Швидкі дії', fr:'Actions rapides', ru:'Быстрые действия', zh:'快捷操作', ko:'빠른 작업', hi:'त्वरित कार्य', ga:'Gníomhartha tapa' };
I18N.wheelStats = {en:'Statistics',uk:'Статистика',fr:'Statistiques',ru:'Статистика',zh:'统计',ko:'통계',hi:'आँकड़े',ga:'Staitisticí'};
I18N.wheelStudy = {en:'Study mode',uk:'Вивчення',fr:'Étude',ru:'Изучение',zh:'学习模式',ko:'학습 모드',hi:'अध्ययन',ga:'Staidéar'};
I18N.wheelFull = { en:'Full menu', uk:'Повне меню', fr:'Menu complet', ru:'Полное меню', zh:'完整菜单', ko:'전체 메뉴', hi:'पूरा मेनू', ga:'Roghchlár iomlán' };

// ========== ЄДИНЕ ДЖЕРЕЛО ІСТИНИ ДЛЯ ПОВНОГО МЕНЮ ==========
// Той самий перемикач, що працював ДО появи Quick Menu: просто ховає/показує
// header+footer через body.immersive-mode. Верхня кнопка (#menu-handle) і
// центральна кнопка всередині відкритого Quick Menu (#qm-full) викликають РІВНО
// ЦЮ функцію — друга не існує і не може розійтись зі станом першої.
function isFullMenuOpen() { return !document.body.classList.contains('immersive-mode'); }
function syncFullMenuControls() { els.menuHandle.setAttribute('aria-expanded', String(isFullMenuOpen())); }
function openFullMenu() {
    document.body.classList.remove('immersive-mode');
    syncFullMenuControls();
    document.getElementById('toggle-toc-desktop').focus({ preventScroll: true });
}
function closeFullMenu() {
    document.body.classList.add('immersive-mode');
    syncFullMenuControls();
}
function toggleFullMenu() { isFullMenuOpen() ? closeFullMenu() : openFullMenu(); }
els.menuHandle.addEventListener('click', toggleFullMenu);
syncFullMenuControls();

// ========== QUICK MENU (нижній, по центру, розкривається вгору віялом) ==========
const quickMenu = (() => {
    const launcher = document.getElementById('qm-launcher');
    const panel = document.getElementById('quick-menu');
    const full = document.getElementById('qm-full');
    const actions = [
        ['wheelOpen', 'file-upload', '⌑'], ['read', 'btn-tts', '▷'],
        ['wheelStudy', 'btn-translate-mode', '文'], ['wheelStats', 'reading-stats-button', '◴'],
        ['tTheme', 'theme-select', '◐'], ['tToc', 'toggle-toc-desktop', '☷']
    ];
    // Кути від вертикалі (0° = прямо вгору), зліва направо; #qm-full завжди займає
    // вільну вершину (0°) між лівою та правою половинами віяла.
    const angles = [-90, -54, -18, 18, 54, 90];
    let previousFocus = null, navigationState = '', closeTimer = 0;
    const navigationKey = () => JSON.stringify([state.bookKey, readerEpoch.book, state.currentIndex, state.pageInChapter]);
    const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    const buttons = actions.map(([key, id, icon], i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'qm-item';
        b.dataset.action = id;
        b.style.setProperty('--a', angles[i] + 'deg');
        const symbol = document.createElement('span'); symbol.className = 'qm-icon'; symbol.textContent = icon; symbol.setAttribute('aria-hidden', 'true');
        if (i === 0) symbol.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7V4h6l3 3h9v13H3V7Z"/><path d="M3 9h18"/></svg>';
        const label = document.createElement('span'); label.className = 'qm-label'; label.dataset.i18n = key;
        b.append(symbol, label); panel.append(b);
        b.addEventListener('click', () => {
            close();
            const target = document.getElementById(id);
            // These controls live inside the header; reveal it before opening/focusing them.
            if (id === 'theme-select' || id === 'reading-stats-button') openFullMenu();
            if (id === 'theme-select' || id === 'reading-stats-button') target.focus();
            if (id !== 'theme-select') target.click();
        });
        return b;
    });

    // Responsive fan geometry: a single radius derived from the smaller viewport
    // dimension, so it shrinks automatically on narrow phones and short landscape
    // screens alike — no breakpoint table, no hardcoded tablet coordinate. Also
    // capped by viewport WIDTH alone so the outermost items (±90°, level with the
    // launcher) never reach the Ask AI / Grammar side-panel tabs pinned to the
    // screen edges (44px wide); 40 is half the item's own max CSS width and 56 a
    // safety gap — both intentionally conservative, since real item width can only
    // be smaller (measuring it live would read 0 while the panel is still hidden).
    function place() {
        const vmin = Math.min(innerWidth, innerHeight);
        let radius = Math.max(76, Math.min(148, vmin * 0.20));
        const maxByWidth = innerWidth / 2 - 40 - 56;
        radius = Math.max(56, Math.min(radius, maxByWidth));
        const fullRadius = radius * 0.72;
        buttons.forEach((b, i) => {
            const rad = angles[i] * Math.PI / 180;
            b.style.setProperty('--dx', (radius * Math.sin(rad)).toFixed(1) + 'px');
            b.style.setProperty('--dy', (-radius * Math.cos(rad)).toFixed(1) + 'px');
        });
        full.style.setProperty('--dx', '0px');
        full.style.setProperty('--dy', (-fullRadius).toFixed(1) + 'px');
    }

    function clearCloseTimer() { clearTimeout(closeTimer); closeTimer = 0; }

    function close(restore = true) {
        clearCloseTimer();
        if (panel.hidden) return;
        panel.classList.remove('qm-open');
        launcher.setAttribute('aria-expanded', 'false');
        const finish = () => { panel.hidden = true; };
        if (reducedMotion()) finish(); else closeTimer = setTimeout(finish, 240);
        // document.body is technically "connected" but focusing it is a no-op — treat
        // it the same as no prior focus and land back on the launcher instead.
        if (restore && panel.contains(document.activeElement)) (previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : launcher).focus({ preventScroll: true });
    }

    function open() {
        if (!panel.hidden) { close(); return; }
        // Editing modes and modal dialogs own input until explicitly dismissed.
        if (cropDialog.open || document.body.matches('.ink-mode, .region-mode') || document.getElementById('settings-modal').style.display === 'flex') return;
        clearCloseTimer();
        previousFocus = document.activeElement;
        navigationState = navigationKey();
        els.askPanel.classList.remove('expanded'); els.grammarPanel.classList.remove('expanded');
        els.sidebar.classList.add('collapsed'); closeReadingStats(); closeFooterMenu();
        // Hide only popup UI; preserve selection, speech, and translation state.
        els.tooltip.style.display = 'none';
        buttons.forEach((b, i) => {
            const source = document.getElementById(actions[i][1]);
            b.disabled = source.disabled;
            if (i === 1) b.lastElementChild.textContent = source.textContent.replace(/^[^\p{L}]+/u, '');
            if (i === 2) b.setAttribute('aria-pressed', String(state.translateMode));
        });
        panel.setAttribute('aria-label', t('wheelTitle'));
        place();
        panel.hidden = false;
        // Add the open class a frame later so the collapsed→expanded transform/opacity
        // transition actually runs (it needs to observe the "before" state first).
        requestAnimationFrame(() => panel.classList.add('qm-open'));
        launcher.setAttribute('aria-expanded', 'true');
        (buttons.find(b => !b.disabled) || full).focus({ preventScroll: true });
    }

    launcher.addEventListener('click', open);
    // The only connection to the top/full menu: close the Quick Menu, then defer
    // to the exact same toggle the top control uses. Avoids two large menus open
    // at once; never opens a second, separate full menu.
    full.addEventListener('click', () => { close(false); toggleFullMenu(); });

    panel.addEventListener('keydown', e => {
        const enabled = buttons.filter(b => !b.disabled);
        if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            const order = [...enabled, full];
            const i = order.indexOf(document.activeElement);
            let next;
            if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = order.length - 1;
            else if (['ArrowRight', 'ArrowDown'].includes(e.key)) next = (i + 1 + order.length) % order.length;
            else next = (i - 1 + order.length) % order.length;
            order[next].focus();
        }
        if (e.key === 'Tab') {
            const targets = [...enabled, full, launcher];
            const i = targets.indexOf(document.activeElement);
            e.preventDefault(); targets[(i + (e.shiftKey ? targets.length - 1 : 1)) % targets.length].focus();
        }
    });
    document.addEventListener('pointerdown', e => { if (!panel.hidden && !panel.contains(e.target) && !launcher.contains(e.target)) close(false); }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
    window.addEventListener('resize', place);
    window.addEventListener('pagehide', () => close(false));
    document.addEventListener('visibilitychange', () => { if (document.hidden) close(false); });
    // Observe only UI/navigation signals, never text spans or selection mutations.
    const observer = new MutationObserver(() => {
        if (panel.hidden) return;
        if (cropDialog.open || document.body.matches('.ink-mode, .region-mode') ||
            els.askPanel.classList.contains('expanded') || els.grammarPanel.classList.contains('expanded') ||
            !els.sidebar.classList.contains('collapsed') || els.tooltip.style.display === 'flex' ||
            document.getElementById('settings-modal').style.display === 'flex') close(false);
    });
    [document.body, els.askPanel, els.grammarPanel, els.sidebar, els.tooltip, cropDialog, document.getElementById('settings-modal')].forEach(el => observer.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'open'] }));
    const navigationObserver = new MutationObserver(() => { if (navigationKey() !== navigationState) close(false); });
    navigationObserver.observe(els.progress, { childList: true, characterData: true, subtree: true });
    els.upload.addEventListener('change', () => close(false));

    launcher.setAttribute('aria-label', t('wheelTitle'));
    els.uiLang.addEventListener('change', () => { launcher.setAttribute('aria-label', t('wheelTitle')); panel.setAttribute('aria-label', t('wheelTitle')); });

    place();
    return { open, close };
})();
