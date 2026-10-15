// Шлях до воркера PDF.js. Раніше це був вбудований <script type="module"> в index.html; винесено в окремий файл, щоб
// CSP могла заборонити вбудовані скрипти ('unsafe-inline'). Модулі виконуються по черзі, тож pdfjsLib уже є.
if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf-6.3.289.worker.min.mjs';
