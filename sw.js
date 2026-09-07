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

// Змінюйте цей номер версії щоразу, коли міняється склад APP_SHELL — стара
// версія кешу видаляється при активації нового service worker'а (крок "activate").
const CACHE_NAME = 'ai-reader-shell-v1';

const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './vendor/jszip-3.10.1.min.js',
    './vendor/mammoth-1.6.0.browser.min.js',
    './vendor/pdf-3.11.174.min.js',
    './vendor/pdf-3.11.174.worker.min.js'
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

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Ніколи не чіпаємо нічого, крім звичайного GET, і ніколи — чужі домени.
    // Це і є той бар'єр, що не дає в кеш потрапити запитам до AI/перекладу чи
    // будь-чому, що несе API-ключ чи відповідь моделі.
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req).then((res) => {
                // Оновлюємо кеш свіжою копією статичного файла — наступного разу
                // офлайн-версія буде вже не застарілою (без окремого механізму
                // "оновлень", просто тихе доповнення кешу на льоту).
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
