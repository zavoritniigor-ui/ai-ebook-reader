/* pwa-lifecycle.js — життєвий цикл встановленого PWA: фонова активність
 * (stopBackgroundActivity — один рубильник для TTS/озвучення/мікрофона/AI-
 * запитів/рендеру PDF, викликається і з подій видимості, і з кнопки "Вийти"),
 * збереження стану ДО можливого вивантаження сторінки Android (persistCriticalState),
 * standalone-детекція (isStandalonePwa), кнопка "Вийти із застосунку" (exitApp,
 * showToast — window.close() дозволений лише для вкладок, відкритих скриптом,
 * тому чесна спроба плюс fallback-повідомлення), стек оверлеїв для системного
 * Android Back (OVERLAY_LAYERS/topOpenOverlay/countOpenOverlays/closeTopOverlay/
 * syncOverlayHistory — фіктивні записи в історії браузера, по одному на кожен
 * відкритий шар), банер "доступна нова версія" (showUpdateBanner), реєстрація
 * service worker (лише на http(s)-origin, після 'load'), і зняття body.inert
 * (вхід вмикається лише після повного завантаження застосунку — класичні
 * <script> віддають callback'и раніше, ніж встигає домовантажитись PDF.js-модуль).
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується
 * останнім, після js/onboarding.js — саме тому MutationObserver тут може прямо
 * (без forward-виклику в колбеку) звертатись до cropDialog (js/pdf-crop.js) в
 * масиві спостережуваних елементів: усі інші класичні <script> вже виконались
 * на момент, коли цей файл завантажується. swRegistration/OVERLAY_LAYERS/
 * overlayHistoryDepth/suppressPopstate/updateBannerShown — власний стан лише
 * цього файлу, ніде більше не читається й не пишеться. js/dictation.js
 * forward-викликає showToast() лише всередині власних callback'ів
 * (recognition.onerror/onend) — та сама безпечна схема, що вже описана для
 * pdfAnchor.
 */

// ========== PWA: ЖИТТЄВИЙ ЦИКЛ ЗАСТОСУНКУ ==========
// Встановлений PWA поводиться як застосунок лише почасти: Android/Chrome самі
// вирішують, коли заморозити чи вивантажити сторінку у фоні, і жодного API "закрити
// застосунок" для вікна, відкритого з ярлика (а не через window.open), браузер
// свідомо не дає — обійти це неможливо, і ми навіть не намагаємось. Нижче — усе,
// що дійсно в наших руках: вчасно зупинити фонову активність, надійно зберегти
// стан і чесно сказати користувачу, коли системного способу "закрити" немає.
function isStandalonePwa() {
    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;
}

// Один рубильник для всього, що не має сенсу продовжувати поза екраном: TTS,
// озвучення у вікні перекладу, мікрофон, активні AI-запити, рендер PDF-сторінки.
// Викликається і з подій видимості, і з кнопки "Вийти" — тому кожен крок тут
// навмисно самодостатній і безпечний при повторному виклику.
function stopBackgroundActivity() {
    cancelDragSelection();
    if (pdfTasks.loading && !state.pdfDoc) {
        ++readerEpoch.book;
        pdfTasks.loading.destroy().catch(() => {}); pdfTasks.loading = null;
        state.format = null; state.totalPages = 0;
        els.pages.textContent = 'Відкриття PDF скасовано. Відкрийте файл повторно.';
    }
    cancelPdfInteraction(); cancelPdfRender();
    clearTimeout(resizeTimer); clearTimeout(scrubTimer); scrubDragging = false;
    regionStart = null; regionBox.style.display = 'none';
    saveInk();
    if (isSpeakingGlobal) stopGlobalTTS();
    stopTooltipSpeech();
    stopDictation(); clearAlignment(); stopOnboarding();
    cancelAsyncTasks();
    pdfTasks.render?.cancel(); pdfTasks.render = null;
}
// Усе, що варто мати збереженим ДО того, як Android може вивантажити сторінку з
// пам'яті. Дешево й безпечно викликати повторно — просто перезаписує ті самі ключі.
function persistCriticalState() {
    try {
        if (state.format === 'pdf') {
            state.pdfScale = pdfBaseScale()*state.pdfZoom;
            if (Math.abs(state.pdfZoom-1) > .001) state.pdfFit = 'free';
            persistPdfZoom(); saveInk();
        }
        saveBookmark();
        writeStored('reader_theme', document.body.getAttribute('data-theme') || 'light');
        writeStored('reader_font_size', state.fontSize);
        writeStored('reader_pdf_scale', state.pdfScale);
        writeStored('reader_translate_mode', state.translateMode ? '1' : '0');
    } catch (e) {}
}

// ===== Service worker: реєстрація й виявлення оновлень (нижче, після load) =====
// swRegistration потрібен і для банера "нова версія" (через controllerchange),
// і для throttled перевірки оновлень при поверненні з фону.
let swRegistration = null;
let lastSwUpdateCheck = 0;
// Не частіше ніж раз на 15 хв — повернення з фону не повинне щоразу турбувати
// сервер новим запитом на sw.js.
const SW_UPDATE_THROTTLE_MS = 15 * 60 * 1000;

// visibilitychange — головний, найнадійніший сигнал "застосунок пішов у фон" і на
// Android, і на десктопі (на відміну від застарілого й ненадійного на мобільних
// beforeunload, який тут свідомо НЕ використовується).
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { persistCriticalState(); stopBackgroundActivity(); }
    else if (document.visibilityState === 'visible' && swRegistration) {
        // Повернення з фону — нагода дізнатись про оновлення, АЛЕ без примусового
        // reload: якщо нова версія знайдеться й активується, користувач дізнається
        // про це банером (нижче), а не миттєвим непроханим перезавантаженням.
        const now = Date.now();
        if (now - lastSwUpdateCheck >= SW_UPDATE_THROTTLE_MS) {
            lastSwUpdateCheck = now;
            swRegistration.update().catch(() => {});
        }
    }
});
// pagehide — "останній шанс" зберегти стан, якщо сторінку зараз вивантажать із
// пам'яті (а не просто згорнуть): на відміну від beforeunload, спрацьовує надійно
// й на мобільних браузерах.
window.addEventListener('pagehide', () => { persistCriticalState(); stopBackgroundActivity(); });
// pageshow з persisted===true означає відновлення з bfcache — сам скрипт при цьому
// ПОВТОРНО НЕ виконується (тож нема ризику задвоїти обробники чи service worker),
// тут лише легка звірка кнопок TTS, без жодного нового мережевого запиту.
window.addEventListener('pageshow', (e) => { if (e.persisted) updateTtsButtons(); });
// Page Lifecycle API: Chrome/Android можуть "заморозити" фонову вкладку ще до
// повного вивантаження — де це підтримується, реагуємо так само, як на приховання.
if ('onfreeze' in document) {
    document.addEventListener('freeze', () => { persistCriticalState(); stopBackgroundActivity(); });
}

// ===== Кнопка "Вийти із застосунку" =====
// window.close() браузер дозволяє лише для вкладок, відкритих СКРИПТОМ
// (window.open). Для головного вікна встановленого PWA, запущеного з ярлика на
// екрані, Android/Chrome це свідомо забороняють — жодного легального обхідного
// шляху не існує. Тому: чесно пробуємо, а якщо за секунду сторінка й далі видима —
// прямо кажемо, що закрити застосунок може лише сама система.
function exitApp() {
    persistCriticalState();
    stopBackgroundActivity();
    try { window.close(); } catch (e) {}
    setTimeout(() => {
        if (document.visibilityState !== 'hidden') showToast(t('exitFallback'));
    }, 400);
}
function showToast(msg) {
    let toast = document.getElementById('reader-toast');
    if (!toast) { toast = document.createElement('div'); toast.id = 'reader-toast'; document.body.appendChild(toast); }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 3500);
}
// Кнопка потрібна лише в реально встановленому standalone-застосунку: у звичайній
// вкладці браузера користувач і так закриває її звичним чином.
if (document.getElementById('btn-exit-app')) {
    const updateExitBtnVisibility = () => { document.getElementById('btn-exit-app').style.display = isStandalonePwa() ? '' : 'none'; };
    updateExitBtnVisibility();
    // isStandalonePwa() визнає standalone/fullscreen/minimal-ui рівнозначними, але раніше
    // на "change" слухався лише display-mode:standalone — якщо холодний старт з ярлика на
    // Android на мить осідав у minimal-ui/fullscreen і лише згодом переходив у справжній
    // standalone (або навпаки), кнопка не оновлювалась до перезавантаження сторінки.
    // Слухаємо всі три display-mode-запити, які реально перевіряє сама функція.
    ['standalone', 'fullscreen', 'minimal-ui'].forEach(mode => {
        window.matchMedia(`(display-mode: ${mode})`).addEventListener('change', updateExitBtnVisibility);
    });
}

// ===== Кнопка/жест "Назад" Android: закриваємо верхній відкритий шар, а не весь
// застосунок =====
// Без цього системний Back під час відкритої панелі/спливайки одразу виходив би із
// PWA — саме та "неправильна" поведінка, яку тут і виправляємо. Черга пріоритету —
// від найвищого шару (модалка) до найглибшого (бічна панель зі змістом книги).
const OVERLAY_LAYERS = [
    { name: 'crop', test: () => cropDialog.open },
    { name: 'modal', test: () => document.getElementById('settings-modal').style.display === 'flex' },
    { name: 'region', test: () => document.body.classList.contains('region-mode') },
    { name: 'ink', test: () => document.body.classList.contains('ink-mode') },
    { name: 'tooltip', test: () => els.tooltip.style.display === 'flex' },
    { name: 'ask', test: () => els.askPanel.classList.contains('expanded') },
    { name: 'grammar', test: () => els.grammarPanel.classList.contains('expanded') },
    { name: 'nav', test: () => !els.sidebar.classList.contains('collapsed') }
];
function topOpenOverlay() { for (const l of OVERLAY_LAYERS) if (l.test()) return l.name; return null; }
function countOpenOverlays() { return OVERLAY_LAYERS.reduce((n, l) => n + (l.test() ? 1 : 0), 0); }
function closeTopOverlay(name) {
    switch (name) {
        case 'crop': closeCropPreview(); break;
        case 'modal': closeKeySettings(); break;
        case 'region': exitRegionMode(); break;
        case 'ink': state.inkMode = false; document.body.classList.remove('ink-mode'); break;
        case 'tooltip': cancelTooltipHide(); els.tooltip.style.display = 'none'; break;
        case 'ask': els.askPanel.classList.remove('expanded'); break;
        case 'grammar': els.grammarPanel.classList.remove('expanded'); break;
        case 'nav': els.sidebar.classList.add('collapsed'); break;
    }
}
// Тримаємо в історії браузера рівно стільки "фіктивних" записів, скільки зараз
// відкрито шарів — тоді системний Back послідовно закриває їх один за одним, і лише
// коли нічого не відкрито, поводиться як завжди (згортає/закриває застосунок).
let overlayHistoryDepth = 0, suppressPopstate = false;
function syncOverlayHistory() {
    const n = countOpenOverlays();
    if (n > overlayHistoryDepth) { overlayHistoryDepth = n; history.pushState({ readerOverlay: overlayHistoryDepth }, ''); }
    else if (n < overlayHistoryDepth) { overlayHistoryDepth = n; suppressPopstate = true; history.back(); }
}
window.addEventListener('popstate', () => {
    if (suppressPopstate) { suppressPopstate = false; return; }
    const top = topOpenOverlay();
    if (top) { closeTopOverlay(top); overlayHistoryDepth = Math.max(0, overlayHistoryDepth - 1); }
});
try {
    const overlayObserver = new MutationObserver(syncOverlayHistory);
    [cropDialog, document.body, els.tooltip, els.askPanel, els.grammarPanel, els.sidebar, document.getElementById('settings-modal')]
        .forEach((el) => el && overlayObserver.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'open'] }));
} catch (e) {}

// Ненав'язлива persistent-смуга "доступна нова версія". На відміну від toast сама
// не ховається — висить, доки не оновити. Показуємо рівно один раз за сеанс.
let updateBannerShown = false;
function showUpdateBanner() {
    if (updateBannerShown) return;
    updateBannerShown = true;
    const bar = document.createElement('div');
    bar.id = 'sw-update-banner';
    const label = document.createElement('span');
    label.textContent = t('updateAvailable');
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.textContent = t('updateReload');
    btn.onclick = () => {
        // Спершу зберігаємо все критичне (книга/сторінка/масштаб/тема/режим), і
        // лише ПОТІМ перезавантажуємось — інакше оновлення "з'їло" б поточну
        // позицію читання.
        persistCriticalState();
        location.reload();
    };
    bar.appendChild(label); bar.appendChild(btn);
    document.body.appendChild(bar);
}

// PWA: реєструємо service worker лише на справжньому http(s)-походженні —
// під file:// (як під час локальної розробки з диска) браузер узагалі не
// дає його зареєструвати, тож перевіряємо протокол заздалегідь, аби не
// засмічувати консоль очікуваною помилкою. Реєстрація — після повного
// завантаження сторінки, щоб не забирати час у першого рендеру й читання.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // clients.claim() also sends controllerchange on the first installation.
    // Only replacing an existing controller means an update is available.
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        const isUpdate = hadController;
        hadController = !!navigator.serviceWorker.controller;
        if (isUpdate && hadController) showUpdateBanner();
    });
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then((registration) => {
            swRegistration = registration;
        }).catch(() => {});
    });
}
// Classic files expose callbacks before later files/module PDF.js finish.
// Enable input only after the entire application has initialized.
window.addEventListener('load', () => { document.body.inert = false; }, { once: true });
