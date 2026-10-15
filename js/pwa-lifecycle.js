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
        if (typeof setPageArrows === 'function') setPageArrows(false);
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
        if (typeof retryPracticeSave === 'function') retryPracticeSave(); // last chance for a Practice save that failed earlier
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
// Не частіше ніж раз на хвилину (sw.js крихітний, запит дешевий) — щоб про нову версію
// дізнаватись швидко: при поверненні з фону, фокусі, появі мережі й раз на 5 хв, поки застосунок відкритий.
const SW_UPDATE_THROTTLE_MS = 60 * 1000;
const SW_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
function checkForSwUpdate() {
    if (!swRegistration || document.visibilityState !== 'visible' || navigator.onLine === false) return;
    const now = Date.now();
    if (now - lastSwUpdateCheck < SW_UPDATE_THROTTLE_MS) return;
    lastSwUpdateCheck = now;
    swRegistration.update().catch(() => {});
}

// visibilitychange — головний, найнадійніший сигнал "застосунок пішов у фон" і на
// Android, і на десктопі (на відміну від застарілого й ненадійного на мобільних
// beforeunload, який тут свідомо НЕ використовується).
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { persistCriticalState(); stopBackgroundActivity(); }
    else if (document.visibilityState === 'visible' && swRegistration) {
        // Повернення з фону — нагода дізнатись про оновлення, АЛЕ без примусового
        // reload: якщо нова версія знайдеться й активується, користувач дізнається
        // про це банером (нижче), а не миттєвим непроханим перезавантаженням.
        checkForSwUpdate();
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
// Закрити встановлений PWA з коду не можна, але мета кнопки — щоб наступне відкриття було вже НОВОЮ версією. Тому «Вихід»
// спершу перевіряє оновлення: якщо воно є (чи вже скачане), застосунок одразу перезавантажується в нову версію — виходити
// «в диспетчер вікон» заради оновлення не треба. Якщо оновлень нема — зберігаємо стан і пробуємо window.close().
// Повертає true — нова версія активувалась (час перезапускатись); false — оновлень нема; 'failed' — не вдалося перевірити чи
// докачати. Раніше чекали лише 8 с ЗАГАЛОМ: нова версія — це ~50 файлів (~6 МБ), і на телефоні їх докачування тривало довше, тож
// 🔄 казала «у вас остання версія», а оновлення ставало за хвилину саме (користувач: «не завжди спрацьовує»). Тепер: до 15 с на
// саму перевірку, а коли нова версія вже качається — до 2 хв, з повідомленням «Завантажую оновлення…».
const SW_CHECK_TIMEOUT_MS = 15000, SW_INSTALL_TIMEOUT_MS = 120000;
function activatePendingSwUpdate({ onDownloading } = {}) {
    return new Promise(async resolve => {
        if (navigator.onLine === false || !('serviceWorker' in navigator)) { resolve(false); return; }
        let reg = swRegistration;
        // Натиснули, поки застосунок ще не зареєстрував service worker (одразу після запуску) — беремо наявну реєстрацію.
        if (!reg) { try { reg = await navigator.serviceWorker.getRegistration(); } catch (e) {} if (reg) swRegistration = reg; }
        if (!reg) { resolve(false); return; }
        let done = false, tracked = null, timer = 0;
        const finish = (v) => { if (done) return; done = true; navigator.serviceWorker.removeEventListener('controllerchange', onChange); clearTimeout(timer); resolve(v); };
        const onChange = () => finish(true);
        navigator.serviceWorker.addEventListener('controllerchange', onChange);
        timer = setTimeout(() => finish('failed'), SW_CHECK_TIMEOUT_MS);
        const track = (worker) => {
            if (!worker || tracked === worker) return;
            tracked = worker;
            clearTimeout(timer); timer = setTimeout(() => finish('failed'), SW_INSTALL_TIMEOUT_MS);
            if (onDownloading) onDownloading();
            const onState = () => {
                if (worker.state === 'redundant') finish('failed');                       // докачування не вдалося (мережа обірвалась)
                else if (worker.state === 'activated') setTimeout(() => finish(true), 1500);   // controllerchange зазвичай приходить раніше
            };
            worker.addEventListener('statechange', onState);
            onState();
        };
        if (reg.installing) track(reg.installing);
        reg.update().then(() => {
            const worker = reg.installing || reg.waiting;
            if (worker) track(worker);
            else if (!tracked) finish(false);
        }).catch(() => { if (!tracked) finish('failed'); });
    });
}
let exitInProgress = false;
async function exitApp() {
    if (exitInProgress) return;
    exitInProgress = true;
    persistCriticalState();
    stopBackgroundActivity();
    let updated = updateBannerShown;      // нова версія вже скачана й чекає на перезавантаження
    if (!updated) {
        showToast(t('exitChecking'));
        try { updated = await activatePendingSwUpdate({ onDownloading: () => showToast(t('updateDownloading')) }); } catch (e) {}
    }
    if (updated === true) {
        showToast(t('exitUpdated'));
        persistCriticalState();
        setTimeout(() => location.reload(), 700);
        return;
    }
    exitInProgress = false;
    try { window.close(); } catch (e) {}
    setTimeout(() => {
        if (document.visibilityState !== 'hidden') showToast(t('exitFallback'));
    }, 400);
}
// Кнопка 🔄 у шапці: перевіряє оновлення й, якщо воно є (чи вже скачане), одразу перезапускає застосунок у новій версії.
let updateInProgress = false;
async function updateApp() {
    if (updateInProgress) return;
    if (navigator.onLine === false) { showToast(t('updateOffline')); return; }
    updateInProgress = true;
    persistCriticalState();
    let updated = updateBannerShown;
    if (!updated) {
        showToast(t('exitChecking'));
        try { updated = await activatePendingSwUpdate({ onDownloading: () => showToast(t('updateDownloading')) }); } catch (e) { updated = 'failed'; }
    }
    updateInProgress = false;
    if (updated === true) {
        showToast(t('exitUpdated'));
        persistCriticalState();
        setTimeout(() => location.reload(), 700);
    } else showToast(t(updated === 'failed' ? 'updateFailed' : 'updateLatest'));
}
Object.assign(I18N, {
    updateDownloading: { uk: 'Знайдено нову версію — завантажую…', en: 'New version found — downloading…', fr: 'Nouvelle version trouvée — téléchargement…', ru: 'Найдена новая версия — загружаю…', zh: '发现新版本——正在下载…', ko: '새 버전 발견 — 다운로드 중…', hi: 'नया संस्करण मिला — डाउनलोड हो रहा है…', ga: 'Leagan nua aimsithe — á íoslódáil…' },
    updateFailed: { uk: 'Не вдалося перевірити чи завантажити оновлення. Спробуйте ще раз.', en: 'Could not check or download the update. Please try again.', fr: 'Impossible de vérifier ou de télécharger la mise à jour. Réessayez.', ru: 'Не удалось проверить или загрузить обновление. Попробуйте ещё раз.', zh: '无法检查或下载更新，请重试。', ko: '업데이트를 확인하거나 다운로드할 수 없습니다. 다시 시도하세요.', hi: 'अपडेट जाँचा या डाउनलोड नहीं हो सका। फिर प्रयास करें।', ga: 'Níorbh fhéidir an nuashonrú a sheiceáil ná a íoslódáil. Bain triail eile as.' },
});
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
    { name: 'library', test: () => !!document.getElementById('library-modal')?.classList.contains('open') },
    { name: 'quickMenu', test: () => !document.getElementById('quick-menu').hidden },
    { name: 'crop', test: () => cropDialog.open },
    { name: 'modal', test: () => document.getElementById('settings-modal').style.display === 'flex' },
    { name: 'region', test: () => document.body.classList.contains('region-mode') },
    { name: 'ink', test: () => document.body.classList.contains('ink-mode') },
    { name: 'tooltip', test: () => els.tooltip.style.display === 'flex' },
    { name: 'ask', test: () => els.askPanel.classList.contains('expanded') },
    { name: 'rules', test: () => document.getElementById('rules-panel').classList.contains('expanded') },
    { name: 'grammar', test: () => els.grammarPanel.classList.contains('expanded') },
    { name: 'nav', test: () => !els.sidebar.classList.contains('collapsed') }
];
function topOpenOverlay() { for (const l of OVERLAY_LAYERS) if (l.test()) return l.name; return null; }
function countOpenOverlays() { return OVERLAY_LAYERS.reduce((n, l) => n + (l.test() ? 1 : 0), 0); }
function closeTopOverlay(name) {
    switch (name) {
        case 'library': closeLibrary(); break;
        case 'quickMenu': quickMenu.close(); break;
        case 'crop': closeCropPreview(); break;
        case 'modal': closeKeySettings(); break;
        case 'region': exitRegionMode(); break;
        case 'ink': state.inkMode = false; document.body.classList.remove('ink-mode'); break;
        case 'tooltip': cancelTooltipHide(); els.tooltip.style.display = 'none'; break;
        case 'ask': els.askPanel.classList.remove('expanded'); break;
        case 'rules': minimizeRulesPanel(); break;
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
    [document.getElementById('quick-menu'), cropDialog, document.body, els.tooltip, els.askPanel, els.grammarPanel, document.getElementById('rules-panel'), els.sidebar, document.getElementById('settings-modal'), document.getElementById('library-modal')]
        .forEach((el) => el && overlayObserver.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'open', 'hidden'] }));
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
            checkForSwUpdate();
            setInterval(checkForSwUpdate, SW_UPDATE_INTERVAL_MS);
            window.addEventListener('focus', checkForSwUpdate);
            window.addEventListener('online', checkForSwUpdate);
        }).catch(() => {});
    });
}
// «Поділитися → AI Reader» (share_target у manifest.webmanifest; приймає sw.js або functions/share-target.js).
// Файл книги відкривається одразу (lastModified 0 — та сама книга, надіслана ще раз, має той самий ключ і відкривається
// на своєму місці); текст — у вікні перекладу посеред екрана, з тими самими кнопками (Запитай AI, Граматика…).
Object.assign(I18N, {
    shareNoFile: { uk: 'Застосунок ще не встановився до кінця — файл не дійшов. Поділіться ним ще раз.', en: 'The app was not fully installed yet, so the file did not arrive. Share it once more.',
                   fr: "L'application n'était pas encore complètement installée : le fichier n'est pas arrivé. Partagez-le encore une fois.", ru: 'Приложение ещё не установилось до конца — файл не дошёл. Поделитесь им ещё раз.',
                   es: 'La aplicación aún no estaba instalada del todo y el archivo no llegó. Compártelo otra vez.' },
    shareFailed: { uk: 'Не вдалося прийняти те, чим ви поділилися.', en: 'Could not receive what you shared.', fr: "Impossible de recevoir ce que vous avez partagé.",
                   ru: 'Не удалось принять то, чем вы поделились.', es: 'No se pudo recibir lo que compartiste.' }
});
async function receiveSharedContent() {
    const params = new URLSearchParams(location.search);
    const kind = params.get('shared');
    if (!kind) return;
    try { history.replaceState(null, '', location.pathname); } catch (e) {}   // перезавантаження не відкриває те саме вдруге
    let file = null, text = kind === 'text' ? (params.get('text') || '').trim() : '';
    if (kind === 'nofile') { showToast(t('shareNoFile')); return; }
    if (kind === 'error') { showToast(t('shareFailed')); return; }
    if (kind === '1' && typeof caches !== 'undefined') {
        try {
            const cache = await caches.open('reader-share');
            const fileRes = await cache.match(new URL('__share/file', location.href).href);
            const textRes = await cache.match(new URL('__share/text', location.href).href);
            if (fileRes) {
                let name = 'book'; try { name = decodeURIComponent(fileRes.headers.get('x-name') || 'book'); } catch (e) {}
                const blob = await fileRes.blob();
                file = new File([blob], name, { type: fileRes.headers.get('content-type') || blob.type, lastModified: 0 });
            }
            if (textRes) text = (await textRes.text()).trim();
            await caches.delete('reader-share');
        } catch (e) { showToast(t('shareFailed')); return; }
    }
    if (file) { await openBookFile(file); return; }
    if (text) {
        state.ctxSentence = text.length <= 400 ? text : '';
        handleWordOrSelection(text, Math.round(innerWidth / 2), Math.round(innerHeight / 3));
    }
}
window.addEventListener('load', () => { setTimeout(receiveSharedContent, 0); }, { once: true });

// Classic files expose callbacks before later files/module PDF.js finish.
// Enable input only after the entire application has initialized.
window.addEventListener('load', () => { document.body.inert = false; }, { once: true });
