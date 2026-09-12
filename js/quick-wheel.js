/* Lower-right Quick Menu: a curved scrollable wheel with 11 real actions,
 * inertia, detent snapping, and synchronized roulette ticking sound.
 * Thumb-reachable on tablets, expands inward/leftward from launcher.
 *
 * Loaded before main.js (i18n bootstrap) and pwa-lifecycle.js (overlay history). */
I18N.wheelOpen = Object.fromEntries(Object.entries(I18N.open).map(([lang, label]) => [lang, label.replace(/^[^\p{L}]+/u, '')]));
I18N.wheelTitle = { en:'Quick wheel', uk:'Швидке колесо', fr:'Roue rapide', ru:'Быстрое колесо', zh:'快速轮盘', ko:'빠른 휠', hi:'त्वरित पहिया', ga:'Rothar tapa' };
I18N.wheelStats = {en:'Statistics',uk:'Статистика',fr:'Statistiques',ru:'Статистика',zh:'统计',ko:'통계',hi:'आँकड़े',ga:'Staitisticí'};
I18N.wheelStudy = {en:'Study mode',uk:'Вивчення',fr:'Étude',ru:'Изучение',zh:'学习模式',ko:'학습 모드',hi:'अध्ययन',ga:'Staidéar'};
I18N.wheelFull = { en:'Full menu', uk:'Повне меню', fr:'Menu complet', ru:'Полное меню', zh:'完整菜单', ko:'전체 메뉴', hi:'पूरा मेनू', ga:'Roghchlár iomlán' };
I18N.printPage = {en:'Print',uk:'Друк',fr:'Imprimer',ru:'Печать',zh:'打印',ko:'인쇄',hi:'प्रिंट',ga:'Priontáil'};
I18N.printError = {en:'Could not print. Try again.',uk:'Не вдалось надрукувати. Спробуйте ще.',fr:'Impression échouée. Réessayez.',ru:'Не удалось печать. Повторите.',zh:'无法打印。请重试。',ko:'인쇄 실패. 다시 시도하세요.',hi:'प्रिंट विफल। पुनः प्रयास करें।',ga:'Theip ar phriontáil. Bain triail eile as.'};
I18N.wheelInk = {en:'Draw',uk:'Малювання',fr:'Dessiner',ru:'Рисовать',zh:'绘制',ko:'그리기',hi:'ड्रा करें',ga:'Tarraing'};
I18N.wheelRegion = {en:'Region',uk:'Область',fr:'Région',ru:'Область',zh:'区域',ko:'영역',hi:'क्षेत्र',ga:'Réigiún'};
I18N.wheelVoices = {en:'Voices',uk:'Голоси',fr:'Voix',ru:'Голоса',zh:'声音',ko:'목소리',hi:'आवाजें',ga:'Guthanna'};
I18N.wheelLevel = {en:'Level',uk:'Рівень',fr:'Niveau',ru:'Уровень',zh:'等级',ko:'레벨',hi:'स्तर',ga:'Leibhéal'};

// ========== ЄДИНЕ ДЖЕРЕЛО ІСТИНИ ДЛЯ ПОВНОГО МЕНЮ ==========
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

// ========== LOWER-RIGHT CURVED SCROLLABLE QUICK WHEEL ==========
const quickMenu = (() => {
    const launcher = document.getElementById('qm-launcher');
    const panel = document.getElementById('quick-menu');
    const full = document.getElementById('qm-full');
    const backdrop = document.getElementById('qm-backdrop');

    // 11 real actions, no empty slots
    // 'btn-print' is a virtual action (no actual button element, handled specially in click handler)
    const allActions = [
        ['wheelOpen', 'file-upload', '⌑'],
        ['read', 'btn-tts', '▷'],
        ['wheelStudy', 'btn-translate-mode', '文'],
        ['wheelStats', 'reading-stats-button', '◴'],
        ['tTheme', 'theme-select', '◐'],
        ['tToc', 'toggle-toc-desktop', '☷'],
        ['printPage', 'btn-print', '🖨'],
        ['wheelInk', 'btn-ink', '✏'],
        ['wheelRegion', 'btn-region', '◻'],
        ['wheelVoices', 'btn-alt-voices', '♪'],
        ['wheelLevel', 'btn-lang-level', '📊']
    ];

    // Start with 6 primary actions, allow scrolling to see all 11
    const visibleCount = 6;
    let scrollOffset = 0; // in action units (0–5 for cycling through the 11 actions)
    let velocity = 0;
    let lastAngle = 0;
    let isDragging = false;
    let dragStartAngle = 0;
    let dragStartTime = 0;

    let previousFocus = null, navigationState = '', closeTimer = 0;
    const navigationKey = () => JSON.stringify([state.bookKey, readerEpoch.book, state.currentIndex, state.pageInChapter]);
    const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Roulette sound: simple oscillator-based beep
    let audioContext = null;
    function playTick(frequency = 800, duration = 50) {
        try {
            if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') audioContext.resume();
            const now = audioContext.currentTime;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = frequency;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);
            osc.start(now);
            osc.stop(now + duration / 1000);
        } catch (err) { /* audio not supported */ }
    }

    // Get currently visible 6 actions (scrollable subset)
    function getVisibleActions() {
        const indices = [];
        for (let i = 0; i < visibleCount; i++) {
            indices.push((scrollOffset + i) % allActions.length);
        }
        return indices.map(i => allActions[i]);
    }

    // Create button elements for currently visible actions
    const buttons = getVisibleActions().map(([key, id, icon], i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'qm-item';
        b.dataset.action = id;
        b.dataset.index = i;
        const symbol = document.createElement('span');
        symbol.className = 'qm-icon';
        symbol.textContent = icon;
        symbol.setAttribute('aria-hidden', 'true');
        if (i === 0 && id === 'file-upload') {
            symbol.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7V4h6l3 3h9v13H3V7Z"/><path d="M3 9h18"/></svg>';
        }
        const label = document.createElement('span');
        label.className = 'qm-label';
        label.dataset.i18n = key;
        b.append(symbol, label);
        panel.append(b);
        b.addEventListener('click', () => {
            close();
            // Handle virtual Print action
            if (id === 'btn-print') {
                printCurrentReaderPage();
                return;
            }
            const target = document.getElementById(id);
            // Theme and stats live in header; open full menu first
            if (id === 'theme-select' || id === 'reading-stats-button') openFullMenu();
            if (id === 'theme-select' || id === 'reading-stats-button') target.focus();
            if (id !== 'theme-select') target.click();
        });
        return b;
    });

    // Right-side semicircular arc geometry: radius responsive, items expand inward/leftward
    // Arc spans from bottom-left, up around to top-left
    function place() {
        const vmin = Math.min(innerWidth, innerHeight);
        let radius = Math.max(76, Math.min(148, vmin * 0.20));
        // Cap by right-side space to avoid Ask AI / Grammar controls
        const maxByWidth = innerWidth - 100 - 40 - 56; // launcher width, item width, safety gap
        radius = Math.max(56, Math.min(radius, maxByWidth));
        const fullRadius = radius * 0.72;

        // Arrange 6 visible items in a semicircular arc expanding leftward/upward from launcher
        // Using standard math angles: 0° = right, 90° = down, 180° = left, 270° = up
        // For right-side menu: use 180-250° arc (left and up-left, avoiding direct vertical)
        buttons.forEach((b, i) => {
            // Spread 6 items across 70° from 180° (left) to 250° (up-left)
            const angle = 180 + (i / (buttons.length - 1)) * 70;
            const rad = angle * Math.PI / 180;
            // cos(180-250°) is negative, sin(180-250°) is negative, giving left and up movement
            b.style.setProperty('--dx', (radius * Math.cos(rad)).toFixed(1) + 'px');
            b.style.setProperty('--dy', (radius * Math.sin(rad)).toFixed(1) + 'px');
        });
        // Full menu button goes directly left
        full.style.setProperty('--dx', (-fullRadius).toFixed(1) + 'px');
        full.style.setProperty('--dy', '0px');
    }

    function clearCloseTimer() { clearTimeout(closeTimer); closeTimer = 0; }

    function close(restore = true) {
        clearCloseTimer();
        if (panel.hidden) return;
        panel.classList.remove('qm-open');
        launcher.setAttribute('aria-expanded', 'false');
        backdrop.hidden = true;
        isDragging = false;
        velocity = 0;
        const finish = () => { panel.hidden = true; };
        if (reducedMotion()) finish(); else closeTimer = setTimeout(finish, 240);
        if (restore && panel.contains(document.activeElement)) {
            (previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : launcher).focus({ preventScroll: true });
        }
    }

    function open() {
        if (!panel.hidden) { close(); return; }
        if (cropDialog.open || document.body.matches('.ink-mode, .region-mode') || document.getElementById('settings-modal').style.display === 'flex') return;
        clearCloseTimer();
        previousFocus = document.activeElement;
        navigationState = navigationKey();
        els.askPanel.classList.remove('expanded');
        els.grammarPanel.classList.remove('expanded');
        els.sidebar.classList.add('collapsed');
        closeReadingStats();
        closeFooterMenu();
        els.tooltip.style.display = 'none';
        backdrop.hidden = false;

        // Update button states
        buttons.forEach((b, i) => {
            const actionId = getVisibleActions()[i][1];
            // Virtual Print action is always enabled (no source element)
            if (actionId === 'btn-print') {
                b.disabled = false;
                return;
            }
            const source = document.getElementById(actionId);
            b.disabled = source?.disabled ?? false;
            if (actionId === 'btn-tts') {
                b.lastElementChild.textContent = source.textContent.replace(/^[^\p{L}]+/u, '');
            }
            if (actionId === 'btn-translate-mode') {
                b.setAttribute('aria-pressed', String(state.translateMode));
            }
        });

        panel.setAttribute('aria-label', t('wheelTitle'));
        place();
        panel.hidden = false;
        requestAnimationFrame(() => panel.classList.add('qm-open'));
        launcher.setAttribute('aria-expanded', 'true');
        (buttons.find(b => !b.disabled) || full).focus({ preventScroll: true });
    }

    launcher.addEventListener('click', open);

    // Backdrop: blocks all background interaction while menu is open
    ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend', 'wheel', 'contextmenu'].forEach(type => {
        backdrop.addEventListener(type, e => {
            if (!panel.hidden) { e.preventDefault(); e.stopImmediatePropagation(); }
        }, true);
    });

    // Drag to scroll through actions
    let dragStartY = 0;
    panel.addEventListener('pointerdown', e => {
        if (panel.hidden || e.target.closest('button')) return; // Don't interfere with button clicks
        isDragging = true;
        dragStartY = e.clientY;
        dragStartTime = Date.now();
        dragStartAngle = lastAngle;
        velocity = 0;
    }, true);

    document.addEventListener('pointermove', e => {
        if (!isDragging || panel.hidden) return;
        const deltaY = e.clientY - dragStartY;
        const dragAngle = -deltaY / 3; // Convert pixels to angle
        lastAngle = dragStartAngle + dragAngle;
        updateWheelPosition();
    }, true);

    function updateWheelPosition() {
        // Convert angle to action offset (each action ≈ 30° for 11 actions)
        const anglePerAction = 360 / allActions.length;
        const newOffset = Math.round(lastAngle / anglePerAction);
        if (newOffset !== scrollOffset) {
            scrollOffset = ((newOffset % allActions.length) + allActions.length) % allActions.length;
            playTick(600 + Math.abs(velocity) * 2, Math.max(30, 100 - Math.abs(velocity) * 2));
        }
    }

    document.addEventListener('pointerup', e => {
        if (!isDragging) return;
        isDragging = false;
        const timeDelta = Date.now() - dragStartTime;
        const angleDelta = lastAngle - dragStartAngle;
        velocity = (timeDelta > 0) ? angleDelta / timeDelta * 10 : 0;

        // Inertia: gradually slow down
        const decayInterval = setInterval(() => {
            if (Math.abs(velocity) < 0.1) {
                clearInterval(decayInterval);
                velocity = 0;
                snapToNearestAction();
                return;
            }
            velocity *= 0.92;
            lastAngle += velocity;
            updateWheelPosition();
        }, 16);
    }, true);

    function snapToNearestAction() {
        const anglePerAction = 360 / allActions.length;
        const rounded = Math.round(lastAngle / anglePerAction) * anglePerAction;
        lastAngle = rounded;
        scrollOffset = ((Math.round(lastAngle / anglePerAction) % allActions.length) + allActions.length) % allActions.length;
        playTick(900, 80); // Final snap click
    }

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
            e.preventDefault();
            targets[(i + (e.shiftKey ? targets.length - 1 : 1)) % targets.length].focus();
        }
    });

    document.addEventListener('pointerdown', e => {
        if (!panel.hidden && !panel.contains(e.target) && !launcher.contains(e.target)) close(false);
    }, true);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !panel.hidden) close();
    });

    window.addEventListener('resize', place);
    window.addEventListener('pagehide', () => close(false));
    document.addEventListener('visibilitychange', () => { if (document.hidden) close(false); });

    const observer = new MutationObserver(() => {
        if (panel.hidden) return;
        if (cropDialog.open || document.body.matches('.ink-mode, .region-mode') ||
            els.askPanel.classList.contains('expanded') || els.grammarPanel.classList.contains('expanded') ||
            !els.sidebar.classList.contains('collapsed') || els.tooltip.style.display === 'flex' ||
            document.getElementById('settings-modal').style.display === 'flex') close(false);
    });
    [document.body, els.askPanel, els.grammarPanel, els.sidebar, els.tooltip, cropDialog, document.getElementById('settings-modal')].forEach(el => {
        observer.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'open'] });
    });

    const navigationObserver = new MutationObserver(() => {
        if (navigationKey() !== navigationState) close(false);
    });
    navigationObserver.observe(els.progress, { childList: true, characterData: true, subtree: true });
    els.upload.addEventListener('change', () => close(false));

    launcher.setAttribute('aria-label', t('wheelTitle'));
    els.uiLang.addEventListener('change', () => {
        launcher.setAttribute('aria-label', t('wheelTitle'));
        panel.setAttribute('aria-label', t('wheelTitle'));
    });

    place();
    return { open, close };
})();

// Print current page: PDF renders current page, text formats render current logical page
function printCurrentReaderPage() {
    try {
        if (!state.format) throw new Error('No book loaded');
        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;left:-10000px;width:1px;height:1px;border:0';
        frame.title = t('printPage');
        document.body.append(frame);
        const doc = frame.contentDocument;
        doc.open();
        doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
        doc.close();

        if (state.format === 'pdf' && state.pdfDoc) {
            // PDF: render only current page
            const pageNum = state.currentIndex;
            state.pdfDoc.getPage(pageNum).then(page => {
                const scale = Math.min(8, Math.sqrt(8000000 / (page.width * page.height)));
                const viewport = page.getViewport({ scale });
                const canvas = doc.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style.cssText = 'display:block;width:100%;height:100%';
                doc.body.append(canvas);
                return page.render({ canvasContext: canvas.getContext('2d'), viewport, intent: 'print' }).promise;
            }).then(() => {
                frame.contentWindow.print();
                setTimeout(() => frame.remove(), 1000);
            }).catch(err => {
                showToast(t('printError'));
                frame.remove();
            });
        } else {
            // Text formats: render current logical column only
            const container = doc.createElement('div');
            container.style.cssText = 'width:100%;height:100%;overflow:hidden;white-space:pre-wrap;word-wrap:break-word;padding:20px';
            const columnStart = state.pageInChapter * columnStep?.() ?? state.pageInChapter * 400;
            const columnWidth = els.pages.clientWidth || 400;
            let content = '';
            for (const node of els.pages.querySelectorAll('*')) {
                const rect = node.getBoundingClientRect();
                const relLeft = rect.left + window.scrollX - els.pages.getBoundingClientRect().left;
                if (relLeft >= columnStart && relLeft < columnStart + columnWidth) {
                    if (node.textContent) content += node.textContent + '\n';
                }
            }
            container.textContent = content || els.pages.textContent;
            doc.body.append(container);
            frame.contentWindow.print();
            setTimeout(() => frame.remove(), 1000);
        }
    } catch (err) {
        showToast(t('printError'));
    }
}
