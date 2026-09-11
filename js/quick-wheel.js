/* UI-only quick access. Existing controls remain the source of action behavior.
 * Loaded before main.js (i18n bootstrap) and pwa-lifecycle.js (overlay history). */
I18N.wheelOpen = Object.fromEntries(Object.entries(I18N.open).map(([lang, label]) => [lang, label.replace(/^[^\p{L}]+/u, '')]));
I18N.wheelTitle = { en:'Quick actions', uk:'Швидкі дії', fr:'Actions rapides', ru:'Быстрые действия', zh:'快捷操作', ko:'빠른 작업', hi:'त्वरित कार्य', ga:'Gníomhartha tapa' };
I18N.wheelStats = {en:'Statistics',uk:'Статистика',fr:'Statistiques',ru:'Статистика',zh:'统计',ko:'통계',hi:'आँकड़े',ga:'Staitisticí'};
I18N.wheelStudy = {en:'Study mode',uk:'Вивчення',fr:'Étude',ru:'Изучение',zh:'学习模式',ko:'학습 모드',hi:'अध्ययन',ga:'Staidéar'};
I18N.wheelFull = { en:'Full menu', uk:'Повне меню', fr:'Menu complet', ru:'Полное меню', zh:'完整菜单', ko:'전체 메뉴', hi:'पूरा मेनू', ga:'Roghchlár iomlán' };
I18N.wheelHint = { en:'Quick actions. Hold for full menu; keyboard: Shift+Enter.', uk:'Швидкі дії. Утримуйте для повного меню; клавіатура: Shift+Enter.', fr:'Actions rapides. Maintenir pour le menu complet ; clavier : Maj+Entrée.', ru:'Быстрые действия. Удерживайте для полного меню; клавиатура: Shift+Enter.', zh:'快捷操作。长按打开完整菜单；键盘：Shift+Enter。', ko:'빠른 작업. 길게 눌러 전체 메뉴; 키보드: Shift+Enter.', hi:'त्वरित कार्य। पूरे मेनू के लिए दबाए रखें; कीबोर्ड: Shift+Enter।', ga:'Gníomhartha tapa. Coinnigh don roghchlár iomlán; méarchlár: Shift+Enter.' };
const quickWheel = (() => {
    const launcher = els.menuHandle, wheel = document.getElementById('quick-wheel');
    const full = document.getElementById('wheel-full');
    const actions = [
        ['wheelOpen', 'file-upload', '⌑'], ['read', 'btn-tts', '▷'],
        ['wheelStudy', 'btn-translate-mode', '文'], ['wheelStats', 'reading-stats-button', '◴'],
        ['tTheme', 'theme-select', '◐'], ['tToc', 'toggle-toc-desktop', '☷']
    ];
    const step = Math.PI / 3;
    let rotation = 0, active = 0, radius = 103, drag = null, press = null, timer = 0;
    let suppressClick = false, dragged = false, previousFocus = null, navigationState = "";
    const navigationKey = () => JSON.stringify([state.bookKey, readerEpoch.book, state.currentIndex, state.pageInChapter]);
    const buttons = actions.map(([key, id, icon], i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'wheel-item';
        b.dataset.action = id;
        const symbol = document.createElement('span'); symbol.className = 'wheel-icon'; symbol.textContent = icon; symbol.setAttribute('aria-hidden', 'true');
        if (i === 0) symbol.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7V4h6l3 3h9v13H3V7Z"/><path d="M3 9h18"/></svg>';
        const label = document.createElement('span'); label.className = 'wheel-label'; label.dataset.i18n = key;
        b.append(symbol, label); wheel.append(b);
        b.addEventListener('click', e => {
            if (dragged && e.detail !== 0) return;
            close();
            const target = document.getElementById(id);
            // These controls live inside the header; reveal it before opening/focusing them.
            if (id === 'theme-select' || id === 'reading-stats-button') openFullMenu();
            if (id === 'theme-select' || id === 'reading-stats-button') target.focus();
            if (id !== 'theme-select') target.click();
        });
        b.addEventListener('focus', () => { if (!drag) { rotation = -i * step; render(); } });
        return b;
    });
    function render(haptic = false) {
        const next = ((Math.round(-rotation / step) % 6) + 6) % 6;
        if (next !== active && haptic && navigator.vibrate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            try { navigator.vibrate(6); } catch (_) {}
        }
        active = next;
        buttons.forEach((b, i) => {
            const angle = i * step + rotation - Math.PI / 2;
            const distance = Math.min((i - active + 6) % 6, (active - i + 6) % 6);
            b.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle)*radius}px, ${Math.sin(angle)*radius}px) scale(${distance ? 1 : 1.06})`;
            b.style.opacity = [1, .85, .68, .6][distance];
            b.classList.toggle('active', i === active);
        });
        wheel.dataset.position = String(active);
        wheel.dataset.rotation = String(rotation);
    }
    function place() {
        const v = window.visualViewport;
        const width = v ? v.width : innerWidth, height = v ? v.height : innerHeight;
        const ox = v ? v.offsetLeft : 0, oy = v ? v.offsetTop : 0;
        const style = getComputedStyle(wheel);
        const inset = side => Math.max(12, parseFloat(style.getPropertyValue('--safe-' + side)) || 0);
        const left = inset('left'), right = inset('right'), top = inset('top'), bottom = inset('bottom');
        const size = Math.max(0, Math.min(320, width - left - right, height - top - bottom));
        wheel.style.width = wheel.style.height = size + 'px'; radius = size / 2 - 57;
        const rect = launcher.getBoundingClientRect();
        wheel.style.left = (ox + Math.max(left, Math.min(rect.left - ox, width - size - right))) + 'px';
        wheel.style.top = (oy + Math.max(top, Math.min(rect.bottom + 10 - oy, height - size - bottom))) + 'px';
        render();
    }
    function clearPress() { clearTimeout(timer); timer = 0; press = null; }
    function endDrag() {
        if (drag && drag.target.hasPointerCapture(drag.id)) drag.target.releasePointerCapture(drag.id);
        drag = null; wheel.classList.remove('dragging');
    }
    function close(restore = true) {
        clearPress(); endDrag();
        if (wheel.hidden) return;
        wheel.hidden = true; document.body.classList.remove('quick-wheel-open');
        launcher.setAttribute('aria-expanded', 'false');
        if (restore && wheel.contains(document.activeElement)) (previousFocus?.isConnected ? previousFocus : launcher).focus({preventScroll:true});
    }
    function open() {
        if (!wheel.hidden) { close(); return; }
        // Editing modes and modal dialogs own input until explicitly dismissed.
        if (cropDialog.open || document.body.matches('.ink-mode, .region-mode') || document.getElementById('settings-modal').style.display === 'flex') return;
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
        launcher.setAttribute('aria-label', t('wheelHint')); wheel.setAttribute('aria-label', t('wheelTitle'));
        wheel.hidden = false; document.body.classList.add('quick-wheel-open');
        launcher.setAttribute('aria-expanded', 'true'); dragged = false; place();
        (buttons[active].disabled ? full : buttons[active]).focus({preventScroll:true});
    }
    launcher.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (e.button !== 0 || !e.isPrimary) return;
        clearPress(); suppressClick = false; press = {id:e.pointerId, x:e.clientX, y:e.clientY};
        launcher.setPointerCapture(e.pointerId);
        timer = setTimeout(() => { suppressClick = true; clearPress(); openFullMenu(); }, 520);
    });
    launcher.addEventListener('pointermove', e => {
        if (press && Math.hypot(e.clientX-press.x, e.clientY-press.y) > 10) { suppressClick = true; clearPress(); }
    });
    launcher.addEventListener('pointerup', clearPress);
    launcher.addEventListener('pointercancel', () => { suppressClick = true; clearPress(); });
    launcher.addEventListener('lostpointercapture', clearPress);
    launcher.addEventListener('contextmenu', e => e.preventDefault());
    launcher.addEventListener('click', e => { e.stopPropagation(); if (suppressClick && e.detail !== 0) { suppressClick = false; return; } open(); });
    launcher.addEventListener('keydown', e => {
        if ((e.shiftKey && e.key === 'Enter') || e.key === 'ContextMenu') { e.preventDefault(); openFullMenu(); }
    });
    full.addEventListener('click', e => { if (!dragged || e.detail === 0) openFullMenu(); });
    const angleAt = e => { const r = wheel.getBoundingClientRect(); return Math.atan2(e.clientY-r.top-r.height/2, e.clientX-r.left-r.width/2); };
    wheel.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (e.button !== 0 || !e.isPrimary) return;
        dragged = false;
        drag = {id:e.pointerId, target:e.target, x:e.clientX, y:e.clientY, angle:angleAt(e), time:e.timeStamp, velocity:0};
        // Capture the original target: direct taps still click their button, and
        // fast drags keep delivering moves even after leaving the wheel.
        e.target.setPointerCapture(e.pointerId);
        // Keep pointer focus from snapping an item before a possible drag.
        e.preventDefault();
    });
    wheel.addEventListener('pointermove', e => {
        if (!drag || drag.id !== e.pointerId) return;
        if (!dragged && Math.hypot(e.clientX-drag.x,e.clientY-drag.y) < 7) return;
        dragged = true; wheel.classList.add('dragging');
        const angle = angleAt(e), delta = Math.atan2(Math.sin(angle-drag.angle),Math.cos(angle-drag.angle));
        drag.velocity = delta / Math.max(16,e.timeStamp-drag.time);
        rotation += delta; drag.angle = angle; drag.time = e.timeStamp; render(true);
    });
    function release(e) {
        if (!drag || drag.id !== e.pointerId) return;
        if (dragged) {
            const velocity = e.timeStamp-drag.time < 90 ? drag.velocity : 0;
            const inertia = e.type !== 'pointerup' || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.max(-step*.45,Math.min(step*.45,velocity*70));
            rotation = Math.round((rotation+inertia)/step)*step;
        }
        endDrag(); render();
    }
    wheel.addEventListener('pointerup', release); wheel.addEventListener('pointercancel', release);
    wheel.addEventListener('lostpointercapture', e => { if (drag) release(e); });
    wheel.addEventListener('wheel', e => { e.preventDefault(); rotation += Math.sign(e.deltaY || e.deltaX)*step; render(true); }, {passive:false});
    wheel.addEventListener('keydown', e => {
        if (['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key)) {
            e.preventDefault();
            let i = e.key === 'Home' ? 0 : e.key === 'End' ? 5 : (active + (['ArrowRight','ArrowDown'].includes(e.key) ? 1 : 5)) % 6;
            while (buttons[i].disabled) i = (i+1)%6;
            buttons[i].focus();
        }
        if (e.key === 'Tab') {
            const targets = [...buttons.filter(b => !b.disabled), full, launcher];
            const i = targets.indexOf(document.activeElement);
            e.preventDefault(); targets[(i+(e.shiftKey ? targets.length-1 : 1))%targets.length].focus();
        }
    });
    document.addEventListener('pointerdown', e => { if (!wheel.hidden && !wheel.contains(e.target) && !launcher.contains(e.target)) close(false); }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { clearPress(); if (!wheel.hidden) { endDrag(); rotation = Math.round(rotation/step)*step; place(); } });
    window.visualViewport?.addEventListener('resize', () => { if (!wheel.hidden) place(); });
    window.visualViewport?.addEventListener('scroll', () => { if (!wheel.hidden) place(); });
    window.addEventListener('pagehide', () => close(false));
    window.addEventListener('blur', () => { clearPress(); if (drag) { rotation = Math.round(rotation/step)*step; endDrag(); render(); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) close(false); });
    // Observe only UI/navigation signals, never text spans or selection mutations.
    const observer = new MutationObserver(() => {
        if (wheel.hidden) return;
        if (cropDialog.open || document.body.matches('.ink-mode, .region-mode') ||
            els.askPanel.classList.contains('expanded') || els.grammarPanel.classList.contains('expanded') ||
            !els.sidebar.classList.contains('collapsed') || els.tooltip.style.display === 'flex' ||
            document.getElementById('settings-modal').style.display === 'flex') close(false);
    });
    [document.body, els.askPanel, els.grammarPanel, els.sidebar, els.tooltip, cropDialog, document.getElementById('settings-modal')].forEach(el => observer.observe(el,{attributes:true,attributeFilter:['class','style','open']}));
    const navigationObserver = new MutationObserver(() => { if (navigationKey() !== navigationState) close(false); });
    navigationObserver.observe(els.progress,{childList:true,characterData:true,subtree:true});
    els.upload.addEventListener('change', () => close(false));
    launcher.setAttribute('aria-label', t('wheelHint'));
    els.uiLang.addEventListener('change', () => launcher.setAttribute('aria-label', t('wheelHint')));
    return {open, close};
})();
function openFullMenu() {
    quickWheel.close(false);
    els.askPanel.classList.remove('expanded'); els.grammarPanel.classList.remove('expanded');
    els.sidebar.classList.add('collapsed'); closeReadingStats(); closeFooterMenu();
    els.tooltip.style.display = 'none';
    document.body.classList.remove('immersive-mode');
    document.getElementById('toggle-toc-desktop').focus({preventScroll:true});
}
