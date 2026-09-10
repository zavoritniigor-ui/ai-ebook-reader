PDF/tablet UX перевірки

`pdf_ux_browser.py` використовує Python 3 без сторонніх залежностей і Chrome DevTools Protocol. Генерує PDF на 120 сторінок із текстом та ілюстрацією, виконує справжні touch-жести через CDP. Потрібен окремий тимчасовий профіль Chrome: тест очищає localStorage тестового origin.

Запуск із кореня проєкту, у трьох терміналах:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

```sh
google-chrome --headless --remote-debugging-port=9222 --user-data-dir=/tmp/pdf-ux-test-profile about:blank
```

```sh
python3 -u tests/pdf_ux_browser.py
```

`learning_stats_languages_grammar_browser.py` covers the compact current-page
statistics model/UI, local persistence isolation, added languages and the
French/English grammar-rule prompt contract. It uses the same local server and
headless Chrome session.

Перевіряються pinch у центрі та біля краю, рух середини жесту, перехід із двох пальців на один, zoom 200–400%, відсутність рендеру під час pinch, атомарна заміна canvas, тонке перо та скасування випадкового штриха, tap по слову, межі popup, crop і його дії, scrubber, fit режими, поворот екрана, Back для crop, зупинка фонової роботи. Після 24 zoom циклів перевіряються DOM-вузли та слухачі подій після GC.

Тест оминає service worker кеш лише через CDP, щоб перевіряти актуальний HTML. Продуктовий service worker не змінено. Share/Clipboard/AI та download dispatch перевіряються через моки: жодних платних AI-запитів або системного Share під час тесту.

Вручну на Android-планшеті:

- Pinch біля країв, pan, поворот, перехід між пальцем і стилусом, письмо 0.5 px при 400%.
- Save: відкриття PNG у галереї; Share: вибір застосунку; Copy: вставлення зображення в сумісний застосунок; Send to AI: реальний запит після натискання.
- Згорнути standalone PWA під час TTS, мікрофона, AI, pinch та рендеру; повернутися й перевірити стан та відсутність самовільного продовження мовлення.
- Android Back із preview crop, перекладу й панелей; холодний запуск, повторне відкриття тієї самої книги, відновлення масштабу/позиції/нотаток.
- Тривале читання великого сканованого PDF: автоматичний тест контролює DOM/listeners, але не доводить відсутність витоків GPU/пам’яті на фізичному пристрої.

Новий штрих має вибрану товщину в екранних CSS pixels; після запису координати й товщина зберігаються відносно сторінки, тож існуюче чорнило масштабується разом із PDF. Растрові полотна обмежені 8 млн пікселів кожне; це обмежує пам’ять на великому zoom. Export PNG — до 2400 px, AI-копія — JPEG до 1000 px.
