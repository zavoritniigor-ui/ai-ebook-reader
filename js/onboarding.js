/* onboarding.js — discovery-підказки для кнопок "Запитай AI"/"Граматика"/зміст:
 * ONBOARDING_KEY/onboardingState зберігають, які підказки вже показані (раз на
 * профіль/контрол, а не щоразу), onboardingGroups мапить ключ на DOM-елементи,
 * scheduleReaderOnboarding запускає підказку із затримкою лише на перших
 * сторінках книги (і одразу забуває решту, якщо читач пішов далі),
 * stopOnboarding/rememberOnboarding прибирають візуальний натяк (звичайний або
 * статичний — залежно від prefers-reduced-motion) при кліку/зникненні книги.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/formats.js.
 */

// Once per control/profile. State is recorded before the cue starts, so a
// reload, a new book or an interrupted animation never loops the onboarding.
const ONBOARDING_KEY = 'reader_controls_onboarding_v1';
let onboardingState;
try { onboardingState = JSON.parse(readStored(ONBOARDING_KEY) || '{}') || {}; }
catch (e) { onboardingState = {}; }
if (typeof onboardingState !== 'object' || Array.isArray(onboardingState)) onboardingState = {};
const onboardingGroups = { ask: [els.askTab], grammar: [els.grammarTab], toc: [els.menuHandle, toggleTocDesktopBtn] };
let onboardingTimer, onboardingEndTimer;
function stopOnboarding() {
    clearTimeout(onboardingTimer); clearTimeout(onboardingEndTimer);
    Object.values(onboardingGroups).flat().filter(Boolean).forEach(el => el.classList.remove('onboarding-cue','onboarding-static'));
}
function rememberOnboarding(key) {
    onboardingState[key] = true; writeStored(ONBOARDING_KEY, JSON.stringify(onboardingState));
    (onboardingGroups[key] || []).filter(Boolean).forEach(el => el.classList.remove('onboarding-cue','onboarding-static'));
}
function scheduleReaderOnboarding() {
    clearTimeout(onboardingTimer);
    if (!state.bookKey || !state.format || document.hidden) return;
    const early = state.format === 'pdf' ? state.currentIndex <= 3 : state.currentIndex === 0 && state.pageInChapter <= 2;
    if (!early) { stopOnboarding(); Object.keys(onboardingGroups).forEach(rememberOnboarding); return; }
    onboardingTimer = setTimeout(() => {
        if (document.hidden) return;
        for (const [key, group] of Object.entries(onboardingGroups)) {
            if (onboardingState[key]) continue;
            const el = group.filter(Boolean).find(el => {
                const r = el.getBoundingClientRect();
                return r.width && r.height && r.bottom>0 && r.top<innerHeight && r.right>0 && r.left<innerWidth;
            });
            if (!el || el.closest('.loading, .ready, .expanded')) continue;
            rememberOnboarding(key);
            el.classList.add(matchMedia('(prefers-reduced-motion: reduce)').matches ? 'onboarding-static' : 'onboarding-cue');
        }
        clearTimeout(onboardingEndTimer); onboardingEndTimer = setTimeout(stopOnboarding, 4900);
    }, 650);
}
for (const [key, group] of Object.entries(onboardingGroups)) for (const el of group.filter(Boolean)) {
    el.addEventListener('click', () => rememberOnboarding(key), true);
    el.addEventListener('animationend', () => el.classList.remove('onboarding-cue'));
}
for (const panel of [els.askPanel, els.grammarPanel]) {
    new MutationObserver(() => {
        if (panel.classList.contains('loading') || panel.classList.contains('ready')) {
            const key = panel === els.askPanel ? 'ask' : 'grammar'; rememberOnboarding(key);
        }
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
}
