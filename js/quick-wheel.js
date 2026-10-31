/* Lower-right Quick Menu: a curved scrollable wheel with 13 real actions,
 * inertia, detent snapping, and synchronized roulette ticking sound.
 * Thumb-reachable on tablets, expands inward/leftward from launcher.
 *
 * Loaded before main.js (i18n bootstrap) and pwa-lifecycle.js (overlay history). */

// Global context snapshot for Quick Wheel actions - accessible to button handlers
let quickWheelContext = null;
function getQuickWheelLearningContext() {
    const ctx = quickWheelContext;
    quickWheelContext = null;  // Consume once
    return ctx;
}

I18N.wheelOpen = Object.fromEntries(Object.entries(I18N.open).map(([lang, label]) => [lang, label.replace(/^[^\p{L}]+/u, '')]));
I18N.wheelTitle = { en:'Quick wheel', uk:'Швидке колесо', fr:'Roue rapide', ru:'Быстрое колесо', zh:'快速轮盘', ko:'빠른 휠', hi:'त्वरित पहिया', ga:'Rothar tapa' };
I18N.wheelStats = {en:'Statistics',uk:'Статистика',fr:'Statistiques',ru:'Статистика',zh:'统计',ko:'통계',hi:'आँकड़े',ga:'Staitisticí'};
I18N.wheelStudy = {en:'Study mode',uk:'Вивчення',fr:'Étude',ru:'Изучение',zh:'学习模式',ko:'학습 모드',hi:'अध्ययन',ga:'Staidéar'};
I18N.wheelFull = { en:'Full menu', uk:'Повне меню', fr:'Menu complet', ru:'Полное меню', zh:'完整菜单', ko:'전체 메뉴', hi:'पूरा मेनू', ga:'Roghchlár iomlán' };
I18N.printPage = {en:'Print',uk:'Друк',fr:'Imprimer',ru:'Печать',zh:'打印',ko:'인쇄',hi:'प्रिंट',ga:'Priontáil'};
I18N.printError = {en:'Could not print. Try again.',uk:'Не вдалось надрукувати. Спробуйте ще.',fr:'Impression échouée. Réessayez.',ru:'Не удалось печать. Повторите.',zh:'无法打印。请重试。',ko:'인쇄 실패. 다시 시도하세요.',hi:'प्रिंट विफल। पुनः प्रयास करें।',ga:'Theip ar phriontáil. Bain triail eile as.'};
I18N.wheelInk = {en:'Draw',uk:'Малювання',fr:'Dessiner',ru:'Рисовать',zh:'绘制',ko:'그리기',hi:'ड्रा करें',ga:'Tarraing'};
I18N.wheelRegion = {en:'Region',uk:'Область',fr:'Région',ru:'Область',zh:'区域',ko:'영역',hi:'क्षेत्र',ga:'Réigiún'};
I18N.wheelVoices = {en:'Alt Voices',uk:'Голоси',fr:'Voix',ru:'Голоса',zh:'声音',ko:'목소리',hi:'आवाजें',ga:'Guthanna'};
I18N.wheelRules = I18N.wheelRules || { en:'Rules',uk:'Правила',fr:'Règles',ru:'Правила' };
I18N.wheelLevel = {en:'Language Level',uk:'Рівень',fr:'Niveau',ru:'Уровень',zh:'等级',ko:'레벨',hi:'स्तर',ga:'Leibhéal'};

// ========== ЄДИНЕ ДЖЕРЕЛО ІСТИНИ ДЛЯ ПОВНОГО МЕНЮ ==========
// The menu is a side drawer over the book (index.html, header#app-header): the dimmed backdrop, ✕, Escape or a tap beside it close it;
// an action that shows something on the page (contents, rules, pen, region, print, reading aloud) closes it too, so its result is seen.
// Other code opens/closes it by toggling body.immersive-mode directly -- the backdrop follows the class (observer below).
function isFullMenuOpen() { return !document.body.classList.contains('immersive-mode'); }
function syncFullMenuControls() {
    const open = isFullMenuOpen();
    els.menuHandle.setAttribute('aria-expanded', String(open));
    const backdrop = document.getElementById('menu-backdrop');
    if (backdrop) backdrop.hidden = !open;
}
function openFullMenu() {
    document.body.classList.remove('immersive-mode');
    syncFullMenuControls();
    // Focus moves into the menu (keyboard, screen readers) without drawing a focus ring after a tap.
    document.getElementById('menu-close').focus({ preventScroll: true, focusVisible: false });
}
function closeFullMenu() {
    document.body.classList.add('immersive-mode');
    syncFullMenuControls();
}
function toggleFullMenu() { isFullMenuOpen() ? closeFullMenu() : openFullMenu(); }
els.menuHandle.addEventListener('click', toggleFullMenu);
document.getElementById('menu-close').addEventListener('click', closeFullMenu);
document.getElementById('menu-backdrop').addEventListener('click', closeFullMenu);
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !isFullMenuOpen() || e.defaultPrevented) return;
    if (document.querySelector('#settings-modal[style*="flex"], #library-modal.open, #book-audio-dialog[open]')) return;   // Escape closes the dialog on top first
    closeFullMenu();
});
const MENU_CLOSING_ACTIONS = ['toggle-toc-desktop', 'btn-book-audio', 'btn-rules', 'btn-ink', 'btn-region', 'btn-print-page', 'btn-tts'];
document.getElementById('header-controls').addEventListener('click', e => {
    const row = e.target.closest('button');
    if (row && MENU_CLOSING_ACTIONS.includes(row.id)) setTimeout(closeFullMenu, 0);   // after the action's own handler
});
document.getElementById('btn-free-library').addEventListener('click', () => openLibrary());
document.getElementById('home-library').addEventListener('click', () => openLibrary());
document.getElementById('btn-print-page').addEventListener('click', () => printCurrentReaderPage());
new MutationObserver(syncFullMenuControls).observe(document.body, { attributes: true, attributeFilter: ['class'] });
syncFullMenuControls();

// Меню саме закривається після кількох секунд бездіяльності. Будь-яка взаємодія з меню (курсор над ним, дотик, прокрутка,
// клавіша, фокус у списку/полі) відкладає закриття; відкрите меню на стартовому екрані (книги ще немає) не чіпаємо.
// 10 с, а не 4: у кожному рядку тепер є пояснення, і його треба встигнути прочитати. Вимкнути: localStorage reader_menu_autohide = 'off'.
const MENU_AUTOHIDE_MS = 10000;
let menuIdleTimer = 0;
function menuAutoHideEnabled() { return readStored('reader_menu_autohide') !== 'off'; }
function scheduleMenuAutoHide() {
    clearTimeout(menuIdleTimer); menuIdleTimer = 0;
    if (!isFullMenuOpen() || !menuAutoHideEnabled()) return;
    menuIdleTimer = setTimeout(() => {
        const header = document.getElementById('app-header');
        const a = document.activeElement;
        const busy = !header || !state.format || header.matches(':hover') || document.getElementById('quick-menu')?.hidden === false
            || (a && header.contains(a) && /^(SELECT|INPUT|TEXTAREA)$/.test(a.tagName));
        if (busy) { scheduleMenuAutoHide(); return; }
        closeFullMenu();
    }, MENU_AUTOHIDE_MS);
}
new MutationObserver(scheduleMenuAutoHide).observe(document.body, { attributes: true, attributeFilter: ['class'] });
// 'scroll': on a phone the open menu scrolls inside itself; reading down to 🔑 must not let it close under the finger.
['pointerdown', 'pointermove', 'keydown', 'focusin', 'touchstart', 'wheel', 'scroll'].forEach(type =>
    document.getElementById('app-header')?.addEventListener(type, scheduleMenuAutoHide, { passive: true }));
scheduleMenuAutoHide();

// ========== LOWER-RIGHT CURVED SCROLLABLE QUICK WHEEL ==========
const quickMenu = (() => {
    const launcher = document.getElementById('qm-launcher');
    const panel = document.getElementById('quick-menu');
    const backdrop = document.getElementById('qm-backdrop');

    // 13 real actions, no empty slots
    // 'btn-print', 'btn-library' and 'wheelFull' are virtual actions (no source element, handled specially in click handler)
    const allActions = [
        ['wheelOpen', 'file-upload', '📂'],
        ['read', 'btn-tts', '🔊'],
        ['wheelStudy', 'btn-translate-mode', '🎓'],
        ['wheelStats', 'reading-stats-button', '📈'],
        ['tTheme', 'theme-select', '🎨'],
        ['tToc', 'toggle-toc-desktop', '📑'],
        ['printPage', 'btn-print', '🖨️'],
        ['wheelInk', 'btn-ink', '✏️'],
        ['wheelRegion', 'btn-region', '✂️'],
        // «Голоси» (two alternating voices) was removed from the wheel (owner, 2026-10-26): the voices list is gone
        ['wheelLevel', 'btn-lang-level', '📊'],
        ['wheelLibrary', 'btn-library', '🏛️'],
        ['wheelRules', 'btn-rules', '📚'],
        ['wheelFull', 'wheelFull', '⚙️']
    ];

    let wheelPosition = 2, velocity = 0, isDragging = false;
    let frame = 0, frameTime = 0, reveal = 0, revealTarget = 0;
    let pointer = null, lastY = 0, lastMove = 0, startY = 0, dragged = false;
    let suppressClickUntil = 0, radius = 220, arcOffset = -100, slots = 5;
    // «Сонечко» (✦ у нижньому ряду читання): дії віялом над кнопкою, активна — прямо над нею. sunRx — горизонтальний радіус
    // (крайні дії не виходять за екран), sunRy — вертикальний (сусідні дії не налягають).
    let sun = false, sunRx = 200, sunRy = 210, startX = 0, lastX = 0;
    const sunStep = .5;
    let wheelSelectionText = '';
    const step = .30, pixelsPerAction = 66;
    const dock = document.getElementById('quick-menu-dock');
    let previousFocus = null, navigationState = '';
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

    // Capture learning context before action dispatch (uses global getQuickWheelLearningContext)
    function captureLearningContext() {
        return {
            selectionText: wheelSelectionText,
            lastGrammarSentence: state.lastGrammarSentence,
            lastAskContext: state.lastAskContext,
            lastReaderHelpContext: typeof lastReaderHelpContext !== 'undefined' ? lastReaderHelpContext : null,
            targetLang: state.targetLang,
            pageInChapter: state.pageInChapter,
            bookKey: state.bookKey,
            epoch: readerEpoch.book
        };
    }

    // One stable element and closure per real action. Nothing is recycled on rotation.
    const buttons = allActions.map(([key, id, icon]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'qm-item'; b.dataset.action = id;
        const symbol = document.createElement('span');
        symbol.className = 'qm-icon'; symbol.textContent = icon;
        symbol.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'qm-label'; label.dataset.i18n = key;
        b.append(symbol, label); panel.append(b);
        b.addEventListener('click', e => {
            if (performance.now() < suppressClickUntil || !revealTarget) { e.preventDefault(); return; }

            // Capture context BEFORE closing wheel or changing any state
            quickWheelContext = captureLearningContext();

            close();
            if (id === 'btn-print') { printCurrentReaderPage(); quickWheelContext = null; return; }
            if (id === 'btn-library') { openLibrary(); quickWheelContext = null; return; }
            if (id === 'wheelFull') { toggleFullMenu(); quickWheelContext = null; return; }
            const target = document.getElementById(id);
            if (id === 'theme-select' || id === 'reading-stats-button') { openFullMenu(); target.focus(); }
            if (id !== 'theme-select' && target) target.click();
            quickWheelContext = null;
        });
        return b;
    });

    // Колесо закрилося: якщо його опора стояла над ✦ у нижньому ряду, вона повертається на своє місце з CSS, інакше ✦ без ряду
    // (відкрита смуга «◀ сторінка ▶») опинився б унизу посередині.
    let dockMoved = false;
    function restoreDock() { if (dockMoved) { dock.style.top = ''; dock.style.right = ''; dockMoved = false; } }
    function place(opening) {
        const v = window.visualViewport;
        const height = v?.height || innerHeight;
        dock.style.top = ((v?.offsetTop || 0) + Math.max(100, Math.min(height * .76, height - 100))) + 'px';
        slots = height < 540 ? 3 : 5;
        radius = 220;
        arcOffset = slots === 3 ? -Math.min(100, height * .22) : -100;
        // ✦ у нижньому ряду читання (index.html, position: fixed): колесо розкривається над ним. Центр дуги — над кнопкою, найнижча
        // дія — над рядом; по горизонталі дуга лягає ліворуч від ✦, але не виходить за лівий край вузького екрана.
        sun = (opening === true || !panel.hidden) && getComputedStyle(launcher).position === 'fixed';
        if (sun) {
            const lb = launcher.getBoundingClientRect(), cx = lb.left + lb.width / 2, cy = lb.top + lb.height / 2;
            const w = innerWidth < 400 ? 72 : 80, edge = Math.min(cx, innerWidth - cx) - 4 - w / 2;
            slots = 5;
            sunRx = Math.max(90, Math.min(200, edge / Math.sin(2 * sunStep)));
            sunRy = Math.min(Math.max(sunRx, 210), cy - 8 - 32);
            dock.style.top = cy + 'px';
            dock.style.right = (innerWidth - cx) + 'px';
            panel.style.setProperty('--sun-w', w + 'px');
            dockMoved = true;
        } else { dock.style.right = ''; dockMoved = false; }
        panel.classList.toggle('qm-sun', sun);
        panel.dataset.radius = radius;
        panel.dataset.arcRange = (slots * step * 180 / Math.PI).toFixed(1);
        render();
    }
    function setPosition(value) {
        const oldDetent = Math.round(wheelPosition), nextDetent = Math.round(value);
        for (let i = 0; i < Math.abs(nextDetent - oldDetent); i++) playTick(720, 18);
        wheelPosition = value;
    }
    function render() {
        buttons.forEach((b, i) => {
            const n = allActions.length, d = (((i - wheelPosition) % n + n * 1.5) % n) - n / 2;   // shortest cyclic offset in (-n/2, n/2]
            const distance = Math.abs(d), visible = distance < slots / 2;
            const delay = Math.min(distance, 2) * .04;
            const progress = Math.max(0, (reveal - delay) / (1 - delay));
            const itemEase = 1 - Math.pow(1 - progress, 3);
            const angle = d * step;
            const scale = 1 - .10 * Math.min(distance, 2.5);
            const opacity = Math.min(1, (slots / 2 - distance) * 3) * (sun ? 1 : 1 - distance * .16);
            b.hidden = !visible;
            b.tabIndex = visible && revealTarget ? 0 : -1;
            const x = sun ? sunRx * Math.sin(d * sunStep) : 65 - radius * Math.cos(angle);
            const y = sun ? -sunRy * Math.cos(d * sunStep) : arcOffset + radius * Math.sin(angle);
            b.style.transform = `translate(${x * itemEase}px, ${y * itemEase}px) translate(-50%, -50%) scale(${scale * (.5 + .5 * itemEase)})`;
            b.style.opacity = Math.max(0, opacity * itemEase);
            b.style.zIndex = Math.round(20 - distance * 4);
            b.classList.toggle('qm-active', distance < .5);
        });
        panel.dataset.position = wheelPosition.toFixed(4);
    }
    function animate(now) {
        frame = 0;
        const elapsed = now - (frameTime || now), dt = Math.min(32, elapsed); frameTime = now;
        reveal = reducedMotion() ? revealTarget : Math.max(0, Math.min(1, reveal + (revealTarget ? 1 : -1) * elapsed / 220));
        if (!isDragging && revealTarget) {
            if (Math.abs(velocity) > .00015 && !reducedMotion()) {
                setPosition(wheelPosition + velocity * dt);
                velocity *= Math.exp(-dt / 190);
            } else {
                velocity = 0;
                const target = Math.round(wheelPosition);
                setPosition(Math.abs(target - wheelPosition) < .001 ? target : wheelPosition + (target - wheelPosition) * (1 - Math.exp(-dt / 65)));
            }
        }
        render();
        if (!reveal && !revealTarget) { panel.hidden = true; backdrop.hidden = true; restoreDock(); return; }
        if (isDragging || reveal !== revealTarget || velocity || wheelPosition !== Math.round(wheelPosition)) schedule();
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(animate); }


    function close(restore = true) {
        if (panel.hidden) return;
        if (!revealTarget) return;
        revealTarget = 0;
        panel.classList.remove('qm-open'); panel.inert = true;
        launcher.setAttribute('aria-expanded', 'false');
        isDragging = false; pointer = null; velocity = 0;
        frameTime = performance.now();
        if (reducedMotion() || !reveal) { reveal = 0; render(); panel.hidden = true; backdrop.hidden = true; restoreDock(); }
        else schedule();
        if (restore && panel.contains(document.activeElement)) {
            (previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : launcher).focus({ preventScroll: true });
        }
    }

    function open() {
        if (revealTarget) { close(); return; }
        if (cropDialog.open || document.body.matches('.ink-mode, .region-mode') || document.getElementById('settings-modal').style.display === 'flex') return;
        previousFocus = document.activeElement;
        navigationState = navigationKey();
        els.askPanel.classList.remove('expanded');
        els.grammarPanel.classList.remove('expanded');
        if (typeof minimizeRulesPanel === 'function') minimizeRulesPanel();
        els.sidebar.classList.add('collapsed');
        closeReadingStats();
        closeFooterMenu();
        // Opening the wheel hides the popup: remember what it showed first, so Level / Explain act on it.
        wheelSelectionText = typeof currentReaderSelectionText === 'function' ? currentReaderSelectionText() : '';
        els.tooltip.style.display = 'none';
        backdrop.hidden = false;

        // Update button states
        buttons.forEach((b, i) => {
            const actionId = allActions[i][1];
            // Print and Full Menu are virtual actions (always enabled)
            if (actionId === 'btn-print' || actionId === 'wheelFull') {
                b.disabled = actionId === 'btn-print' ? !state.format : false;
                return;
            }
            const source = document.getElementById(actionId);
            b.disabled = source?.disabled ?? false;
            if (actionId === 'btn-tts') {
                // The menu row is icon + title + description: the wheel shows only the title («Read aloud» / «Pause» / «Resume»).
                const title = source.querySelector('.mr-title');
                b.lastElementChild.textContent = (title ? title.textContent : source.textContent).replace(/^[^\p{L}]+/u, '');
            }
            if (actionId === 'btn-translate-mode') {
                b.setAttribute('aria-pressed', String(state.translateMode));
            }
        });

        panel.setAttribute('aria-label', t('wheelTitle'));
        place(true);
        panel.hidden = false;
        panel.inert = false; revealTarget = 1;
        panel.classList.add('qm-open'); frameTime = performance.now(); schedule();
        launcher.setAttribute('aria-expanded', 'true');
        // Focus the visually active (centered) action, not the first button
        const activeIndex = ((Math.round(wheelPosition) % allActions.length) + allActions.length) % allActions.length;
        buttons[activeIndex].focus({ preventScroll: true });
    }

    launcher.addEventListener('click', open);

    // Backdrop: blocks all background interaction while menu is open
    ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend', 'wheel', 'contextmenu'].forEach(type => {
        backdrop.addEventListener(type, e => {
            if (!panel.hidden) { e.preventDefault(); e.stopImmediatePropagation(); }
        }, true);
    });

    // Capture only once a drag is recognized, preserving ordinary button taps.
    panel.addEventListener('pointerdown', e => {
        if (pointer !== null || !revealTarget || (e.pointerType === 'mouse' && e.button !== 0)) return;
        pointer = e.pointerId; isDragging = true; dragged = false;
        startY = lastY = e.clientY; startX = lastX = e.clientX; lastMove = performance.now(); velocity = 0;
        frameTime = lastMove; schedule();
    });
    window.addEventListener('pointermove', e => {
        if (e.pointerId !== pointer || !isDragging) return;
        const now = performance.now(), dt = Math.max(8, now - lastMove);
        if (Math.abs(sun ? e.clientX - startX : e.clientY - startY) > 6) dragged = true;
        if (dragged) {
            panel.setPointerCapture(pointer); e.preventDefault();
            // «Сонечко» крутиться пальцем уздовж: рух праворуч несе дії праворуч (до активної підходить ліва сусідка).
            const delta = sun ? -(e.clientX - lastX) / (sunRx * sunStep * .9) : -(e.clientY - lastY) / pixelsPerAction;
            velocity = Math.max(-.025, Math.min(.025, delta / dt));
            setPosition(wheelPosition + delta); schedule();
        }
        lastY = e.clientY; lastX = e.clientX; lastMove = now;
    }, true);
    function release(e) {
        if (e.pointerId !== pointer) return;
        if (dragged) suppressClickUntil = performance.now() + 350;
        if (e.type === 'pointercancel' || performance.now() - lastMove > 100) velocity = 0;
        if (panel.hasPointerCapture(pointer)) panel.releasePointerCapture(pointer);
        pointer = null; isDragging = false; schedule();
    }
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    panel.addEventListener('lostpointercapture', e => { if (isDragging) release(e); });
    panel.addEventListener('wheel', e => {
        if (!revealTarget) return;
        e.preventDefault(); velocity = 0;
        setPosition(wheelPosition + Math.sign(e.deltaY)); frameTime = performance.now(); schedule();
    }, {passive:false});

    // Helper: find next available (non-disabled, non-hidden) action from a starting index, in a direction
    function findNextAvailableIndex(startIndex, direction) {
        let idx = startIndex;
        let checked = 0;
        while (checked < allActions.length) {
            if (!buttons[idx].disabled && !buttons[idx].hidden) return idx;
            idx = (idx + direction + allActions.length) % allActions.length;
            checked++;
        }
        return startIndex; // Fallback if all are disabled/hidden
    }

    panel.addEventListener('keydown', e => {
        const enabled = buttons.filter(b => !b.disabled && !b.hidden);
        if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            velocity = 0;
            let newPos;
            if (e.key === 'Home') {
                newPos = findNextAvailableIndex(0, 1);
            } else if (e.key === 'End') {
                newPos = findNextAvailableIndex(allActions.length - 1, -1);
            } else {
                const direction = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1;
                const currentPos = ((Math.round(wheelPosition) % allActions.length) + allActions.length) % allActions.length;
                newPos = findNextAvailableIndex((currentPos + direction + allActions.length) % allActions.length, direction);
            }
            setPosition(newPos);
            render(); schedule();
            buttons[newPos].focus({preventScroll:true});
        }
        if (e.key === 'Tab') {
            const targets = [...enabled, launcher];
            const i = targets.indexOf(document.activeElement);
            e.preventDefault();
            targets[(i + (e.shiftKey ? targets.length - 1 : 1)) % targets.length].focus();
        }
        if ((e.key === 'Enter' || e.key === ' ') && revealTarget) {
            e.preventDefault();
            // Trigger the visually active (centered) action
            const activeIndex = ((Math.round(wheelPosition) % allActions.length) + allActions.length) % allActions.length;
            if (!buttons[activeIndex].disabled && !buttons[activeIndex].hidden) {
                buttons[activeIndex].click();
            }
        }
    });

    document.addEventListener('pointerdown', e => {
        if (!panel.hidden && !panel.contains(e.target) && !launcher.contains(e.target) && e.target !== backdrop) close(false);
    }, true);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !panel.hidden) close();
        if (e.key === 'Tab' && revealTarget && !panel.contains(e.target)) {
            e.preventDefault();
            const visible = buttons.find(b => !b.hidden && !b.disabled);
            (e.shiftKey ? [...buttons].reverse().find(b => !b.hidden && !b.disabled) : visible)?.focus();
        }
    });

    window.addEventListener('resize', place);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
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
        frame.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;border:0;opacity:0;';
        frame.title = t('printPage');
        document.body.append(frame);
        const doc = frame.contentDocument;
        doc.open();
        doc.write('<!doctype html><html><head><meta charset="utf-8"><style>@page{size:auto;margin:0mm;}html,body{margin:0;padding:0;background:#fff;}img{display:block;width:100%;height:auto;max-width:100%;margin:0 auto;page-break-inside:avoid;}</style></head><body></body></html>');
        doc.close();

        const triggerPrint = () => {
            const cleanup = () => { try { frame.remove(); } catch (e) {} };
            frame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
            setTimeout(cleanup, 60000);
            frame.contentWindow.focus();
            frame.contentWindow.print();
        };

        if (state.format === 'pdf' && state.pdfDoc) {
            // PDF: render only current page з рукописними позначками (ink)
            const pageNum = state.currentIndex || 1;
            state.pdfDoc.getPage(pageNum).then(async page => {
                const natural = page.getViewport({ scale: 1 });
                // One PDF page = one printed page, in the page's own size and orientation (as PDF.js's print service
                // does); the browser scales it to the paper chosen in Print Preview. With size:auto + width:100%, a
                // page proportionally taller than the paper (6x9 in, A5) spilled its bottom onto a second sheet.
                const pageStyle = doc.createElement('style');
                pageStyle.textContent = `@page{size:${natural.width}pt ${natural.height}pt;margin:0}html,body{width:100%;height:100%;overflow:hidden}`;
                doc.head.append(pageStyle);
                const scale = Math.min(3, Math.sqrt(8000000 / (natural.width * natural.height)));
                const viewport = page.getViewport({ scale });
                // ОБОВ'ЯЗКОВО: canvas створюється в ГОЛОВНОМУ document, а не в iframe (doc),
                // тому що шрифти PDF.js завантажуються в document.fonts головного вікна.
                // Створення canvas у документі iframe спричиняє відсутність шрифтів і рендер "тофу" (квадратів).
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport, intent: 'print' }).promise;
                if (typeof pdfWantedPages === 'undefined' || !pdfWantedPages.has(pageNum)) { try { page.cleanup(); } catch (e) {} }

                // Додаємо ink-шар поверх PDF, якщо є рукописні позначки
                const key = typeof inkPageKey === 'function' ? inkPageKey(pageNum) : String(pageNum);
                const strokes = state.ink && state.ink[key];
                if (strokes && strokes.length > 0) {
                    const ctx = canvas.getContext('2d');
                    ctx.save();
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    strokes.forEach(st => {
                        if (!st.p || st.p.length < 1) return;
                        ctx.strokeStyle = st.c || '#000';
                        ctx.lineWidth = (st.w || 0.005) * canvas.width;
                        ctx.beginPath();
                        st.p.forEach((pt, i) => {
                            const x = pt[0] * canvas.width, y = pt[1] * canvas.height;
                            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                        });
                        if (st.p.length === 1) {
                            ctx.fillStyle = st.c || '#000';
                            ctx.arc(st.p[0][0] * canvas.width, st.p[0][1] * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2);
                            ctx.fill();
                        } else {
                            ctx.stroke();
                        }
                    });
                    ctx.restore();
                }

                // Tofu-free print: rasterize to img data URL inside host document, then append to iframe
                const img = doc.createElement('img');
                img.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;';
                await new Promise((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = canvas.toDataURL('image/png');
                    doc.body.append(img);
                });
                if (img.decode) {
                    await img.decode().catch(() => {});
                }
            }).then(() => {
                triggerPrint();
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
            const walker = document.createTreeWalker(els.pages, NodeFilter.SHOW_TEXT, null, false);
            let textNode;
            while ((textNode = walker.nextNode())) {
                if (!textNode.data.trim().length) continue;
                const rect = textNode.parentElement.getBoundingClientRect();
                const relLeft = rect.left + window.scrollX - els.pages.getBoundingClientRect().left;
                if (relLeft >= columnStart && relLeft < columnStart + columnWidth) {
                    content += textNode.data;
                }
            }
            container.textContent = content.trim();
            doc.body.append(container);
            triggerPrint();
        }
    } catch (err) {
        showToast(t('printError'));
    }
}

document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if (state.format) {
            e.preventDefault();
            printCurrentReaderPage();
        }
    }
});
