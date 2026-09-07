/* Мінімальний service worker AI Ebook Reader.
 * Єдина мета — щоб застосунок встановлювався як PWA і відкривав свою "оболонку"
 * (HTML/CSS/JS-бібліотеки, іконки) навіть без мережі. Нічого динамічного тут не
 * кешується: жодних AI-запитів, жодного тексту книги, жодних ключів.
 *
 * Правило безпеки: кешуємо ЛИШЕ GET-запити ДО ВЛАСНОГО ПОХОДЖЕННЯ (свій сайт).
 * Усе інше — запити до generativelanguage.googleapis.com (Gemini), api.groq.com
 * (Groq), translate.googleapis.com (переклад), будь-які POST — завжди йде напряму
 * в мережу в обхід service worker'а й ніколи не потрапляє в кеш. API-ключі
 * зберігаються лише в localStorage сторінки, який service worker узагалі не бачить.
 */
'use strict';

// Змінюйте цей номер версії щоразу, коли міняється склад APP_SHELL або логіка
// fetch-обробника — стара версія кешу видаляється при активації нового
// service worker'а (крок "activate").
const CACHE_NAME = 'ai-reader-shell-v8';

// Скільки чекати на мережу для НАВІГАЦІЇ (сама сторінка), перш ніж показати
// закешовану версію. Досить коротко, щоб застосунок відчувався швидким навіть на
// поганому зв'язку, і досить довго, щоб не відкидати мережу заради кешу вже за
// секунду. Це і є той запобіжник, що не дає встановленому PWA надовго застрягти
// на старій (потенційно вразливій) версії index.html.
const NAVIGATION_TIMEOUT_MS = 3500;

const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './js/core.js',
    './js/lang-detect.js',
    './js/ai-client.js',
    './js/selection.js',
    './archive-guard.worker.js',
    './vendor/jszip-3.10.1.min.js',
    './vendor/mammoth-1.6.0.browser.min.js',
    './vendor/pdf-6.3.289.min.mjs',
    './vendor/pdf-6.3.289.worker.min.mjs'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

// Навігація (сам HTML-документ, включно зі стартом standalone-PWA) — мережа-спочатку
// з коротким таймаутом: онлайн-користувач завжди отримує code з сервера (а не вчорашню
// версію з кешу), офлайн чи повільна мережа — останню робочу закешовану. Саме тут жив
// ризик, що встановлений на планшеті PWA місяцями працює зі старою версією index.html.
async function networkFirstForNavigation(req) {
    const networkPromise = fetch(req).then((res) => {
        if (res && res.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
        }
        return res;
    }).catch(() => null);

    const timedOut = await Promise.race([
        networkPromise.then(() => false),
        new Promise((resolve) => setTimeout(() => resolve(true), NAVIGATION_TIMEOUT_MS))
    ]);

    if (!timedOut) {
        const res = await networkPromise;
        if (res && res.ok) return res;
    }

    // Мережа не встигла вчасно, впала або відповіла помилкою — власний кеш, а якщо
    // саме цього шляху там ще нема, фолбек на закешований index.html (той самий "app
    // shell" для будь-якої навігації). networkPromise й далі виконується у фоні й сам
    // оновить кеш, коли (якщо) таки відповість, — наступний запуск уже буде свіжим.
    const cached = (await caches.match(req)) || (await caches.match('./index.html')) || (await caches.match('./'));
    if (cached) return cached;
    const late = await networkPromise;
    return late || new Response('Offline', { status: 503, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Ніколи не чіпаємо нічого, крім звичайного GET, і ніколи — чужі домени.
    // Це і є той бар'єр, що не дає в кеш потрапити запитам до AI/перекладу чи
    // будь-чому, що несе API-ключ чи відповідь моделі.
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    if (req.mode === 'navigate') {
        event.respondWith(networkFirstForNavigation(req));
        return;
    }

    // Versioned/статичні файли (vendor-бібліотеки з номером версії в імені, іконки,
    // архів-воркер): кеш-спочатку — застаріла версія тут не страшна, оновлення
    // бібліотеки й так означає нову назву файла.
    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req).then((res) => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                }
                return res;
            }).catch(() => cached);
            return cached || network;
        })
    );
});
