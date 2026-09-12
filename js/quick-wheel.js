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
I18N.wheelVoices = {en:'Alt Voices',uk:'Голоси',fr:'Voix',ru:'Голоса',zh:'声音',ko:'목소리',hi:'आवाजें',ga:'Guthanna'};
I18N.wheelLevel = {en:'Language Level',uk:'Рівень',fr:'Niveau',ru:'Уровень',zh:'等级',ko:'레벨',hi:'स्तर',ga:'Leibhéal'};

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

    let wheelPosition = 2, velocity = 0, isDragging = false;
    let frame = 0, frameTime = 0, reveal = 0, revealTarget = 0;
    let pointer = null, lastY = 0, lastMove = 0, startY = 0, dragged = false;
    let suppressClickUntil = 0, radius = 220, arcOffset = -100, slots = 5;
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
            close();
            if (id === 'btn-print') { printCurrentReaderPage(); return; }
            const target = document.getElementById(id);
            if (id === 'theme-select' || id === 'reading-stats-button') { openFullMenu(); target.focus(); }
            if (id !== 'theme-select') target.click();
        });
        return b;
    });

    function place() {
        const v = window.visualViewport;
        const height = v?.height || innerHeight;
        dock.style.top = ((v?.offsetTop || 0) + Math.max(100, Math.min(height * .76, height - 100))) + 'px';
        slots = height < 540 ? 3 : 5;
        radius = 220;
        arcOffset = slots === 3 ? -Math.min(100, height * .22) : -100;
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
        const ease = 1 - Math.pow(1 - reveal, 3);
        buttons.forEach((b, i) => {
            const d = (((i - wheelPosition) % 11 + 16.5) % 11) - 5.5;
            const distance = Math.abs(d), visible = distance < slots / 2;
            const delay = Math.min(distance, 2) * .04;
            const progress = Math.max(0, (reveal - delay) / (1 - delay));
            const itemEase = 1 - Math.pow(1 - progress, 3);
            const angle = d * step;
            const scale = 1 - .10 * Math.min(distance, 2.5);
            const opacity = Math.min(1, (slots / 2 - distance) * 3) * (1 - distance * .16);
            b.hidden = !visible;
            b.tabIndex = visible && revealTarget ? 0 : -1;
            b.style.transform = `translate(${(65 - radius * Math.cos(angle)) * itemEase}px, ${(arcOffset + radius * Math.sin(angle)) * itemEase}px) translate(-50%, -50%) scale(${scale * (.5 + .5 * itemEase)})`;
            b.style.opacity = Math.max(0, opacity * itemEase);
            b.style.zIndex = Math.round(20 - distance * 4);
            b.classList.toggle('qm-active', distance < .5);
        });
        full.style.transform = `translate(0px, ${-68 * ease}px) translate(-50%, -50%) scale(${.5 + .5 * ease})`;
        full.style.opacity = ease;
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
        if (!reveal && !revealTarget) { panel.hidden = true; backdrop.hidden = true; return; }
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
        if (reducedMotion()) { reveal = 0; render(); panel.hidden = true; backdrop.hidden = true; }
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
        els.sidebar.classList.add('collapsed');
        closeReadingStats();
        closeFooterMenu();
        els.tooltip.style.display = 'none';
        backdrop.hidden = false;

        // Update button states
        buttons.forEach((b, i) => {
            const actionId = allActions[i][1];
            // Print is available once a reader document is loaded.
            if (actionId === 'btn-print') {
                b.disabled = !state.format;
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
        panel.inert = false; revealTarget = 1;
        panel.classList.add('qm-open'); frameTime = performance.now(); schedule();
        launcher.setAttribute('aria-expanded', 'true');
        (buttons.find(b => !b.disabled && !b.hidden) || full).focus({ preventScroll: true });
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
        if (pointer !== null || !revealTarget || e.target.closest('#qm-full') || (e.pointerType === 'mouse' && e.button !== 0)) return;
        pointer = e.pointerId; isDragging = true; dragged = false;
        startY = lastY = e.clientY; lastMove = performance.now(); velocity = 0;
        frameTime = lastMove; schedule();
    });
    window.addEventListener('pointermove', e => {
        if (e.pointerId !== pointer || !isDragging) return;
        const now = performance.now(), dt = Math.max(8, now - lastMove);
        if (Math.abs(e.clientY - startY) > 6) dragged = true;
        if (dragged) {
            panel.setPointerCapture(pointer); e.preventDefault();
            const delta = -(e.clientY - lastY) / pixelsPerAction;
            velocity = Math.max(-.025, Math.min(.025, delta / dt));
            setPosition(wheelPosition + delta); schedule();
        }
        lastY = e.clientY; lastMove = now;
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

    full.addEventListener('click', () => { close(false); toggleFullMenu(); });

    panel.addEventListener('keydown', e => {
        const enabled = buttons.filter(b => !b.disabled && !b.hidden);
        if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            velocity = 0;
            setPosition(e.key === 'Home' ? 0 : e.key === 'End' ? 10 : Math.round(wheelPosition) + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1));
            render(); schedule();
            buttons[((Math.round(wheelPosition) % 11) + 11) % 11].focus({preventScroll:true});
        }
        if (e.key === 'Tab') {
            const targets = [...enabled, full, launcher];
            const i = targets.indexOf(document.activeElement);
            e.preventDefault();
            targets[(i + (e.shiftKey ? targets.length - 1 : 1)) % targets.length].focus();
        }
    });

    document.addEventListener('pointerdown', e => {
        if (!panel.hidden && !panel.contains(e.target) && !launcher.contains(e.target) && e.target !== backdrop) close(false);
    }, true);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !panel.hidden) close();
        if (e.key === 'Tab' && revealTarget && !panel.contains(e.target)) {
            e.preventDefault();
            (e.shiftKey ? full : buttons.find(b => !b.hidden && !b.disabled) || full).focus();
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
                const natural = page.getViewport({ scale: 1 });
                const scale = Math.min(3, Math.sqrt(8000000 / (natural.width * natural.height)));
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
