/* pdf-contrast.js — автоматичний контраст сторінки сканованої книги (власник, 2026-10-31:
 * «для таких книг потрібно автоматично підганяти контраст»).
 *
 * Старі скани віддають бліду сіру фарбу на кремовому папері: найтемніше чорне в них десь 90–130
 * замість 0, а папір 230–245 замість 255. Через це сторінка читається важко на будь-якій темі, а
 * просвічений із звороту текст лишається видимим.
 *
 * Що робимо. Після кожного рендера сторінки знімаємо гістограму ЗМЕНШЕНОЇ копії полотна
 * (PDF_CONTRAST_SAMPLE по довгій стороні — близько 35 тисяч пікселів замість шести мільйонів) і
 * знаходимо дві точки: «чорне» — рівень, нижче якого лежить PDF_CONTRAST_BLACK_SHARE пікселів
 * (сама фарба), і «папір» — найбільший стовпчик у світлій половині. Далі розтягуємо [чорне, папір]
 * у [0, 255].
 *
 * Чому CSS-фільтр, а не прохід по пікселях. Розтяг рівнів без гами — це афінне перетворення
 * out = a·v + b, а саме його дають brightness() і contrast() разом:
 *     brightness(m) → m·v,   contrast(c) → c·v + ½(1 − c);   разом a = c·m, b = ½(1 − c).
 * Звідси c = 1 − 2b і m = a/c. Фільтр рахує відеокарта під час компонування, тож сторінка не
 * платить ні мілісекунди на перемальовування, а полотно лишається недоторканим: виділення слів,
 * текстовий шар і рукописний шар працюють із тими самими координатами, що й раніше.
 *
 * Розмиті літери: окремо перевіряємо вузькі смуги у вихідній роздільності. Якщо більшість
 * текстових країв м’які, додаємо слабкий просторовий фільтр різкості перед контрастом.
 * Чіткий цифровий текст не загострюємо; результати аналізу зникають разом із полотном.
 *
 * Чого НЕ робимо. Кольорову сторінку (ілюстрація, мапа, обкладинка) не чіпаємо взагалі —
 * її видно за середньою насиченістю. Сторінку, яка вже контрастна (чорне нижче
 * PDF_CONTRAST_SKIP_BLACK і розмах від PDF_CONTRAST_SKIP_RANGE), теж лишаємо як є: підсилювати
 * нормальний PDF означало б вигоряння тонких ліній. Підсилення обмежене PDF_CONTRAST_MAX_GAIN,
 * інакше майже порожня сторінка перетворюється на шум зі слідів сканера.
 */
const PDF_CONTRAST_KEY = 'reader_pdf_contrast';
const PDF_CONTRAST_MODES = ['auto', 'off', 'strong', 'dark'];
const PDF_CONTRAST_SAMPLE = 180;          // довга сторона зменшеної копії, пікселів
const PDF_CONTRAST_BLACK_SHARE = 0.004;   // частка найтемніших пікселів = «чорне» сторінки
const PDF_CONTRAST_PAPER_SHARE = 0.08;    // менший пік паперу = сторінка не схожа на текст
const PDF_CONTRAST_MIN_RANGE = 24;        // менший розмах = порожня сторінка, нема що тягнути
const PDF_CONTRAST_MAX_GAIN = 3.2;        // стеля підсилення
const PDF_CONTRAST_SKIP_BLACK = 64;       // сторінка вже має темну фарбу
const PDF_CONTRAST_SKIP_RANGE = 170;      // ...і достатній розмах
const PDF_CONTRAST_COLOR = 42;            // середня насиченість: вище = кольорова сторінка
const PDF_CONTRAST_STRONG = 0.18;         // «Сильніше» піднімає чорну точку на цю частку розмаху
const PDF_CONTRAST_HISTORY = 5;           // по скількох сторінках усереднюємо рівні

let pdfContrastHistory = [];   // [[чорне, папір], ...] останніх надійних сторінок цієї книги
let pdfContrastLast = null;    // для 📋 діагностики
const pdfSharpnessCache = new WeakMap(); // immutable rendered canvases; no retained page bitmaps

// Inspect a few native-resolution strips, not the thumbnail used for paper levels:
// downsampling would hide the very blur we need to find. A sharp edge crosses the
// middle half of the ink/paper range in 1–2 screen pixels; a soft scan takes more.
function pdfContrastSoftText(canvas, black, paper) {
    if (pdfSharpnessCache.has(canvas)) return pdfSharpnessCache.get(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width < 32 || canvas.height < 32) return false;
    const density = Math.max(0.5, canvas.width / (parseFloat(canvas.style.width) || canvas.width));
    const low = black + (paper - black) * 0.25;
    const high = black + (paper - black) * 0.75;
    let edges = 0, soft = 0;
    try {
        for (let strip = 1; strip <= 7; strip++) {
            const y = Math.min(canvas.height - 8, Math.floor(canvas.height * strip / 8));
            const data = ctx.getImageData(0, y, canvas.width, 8).data;
            for (let row = 0; row < 8; row += 2) {
                let side = 0, last = 0;
                for (let x = 0; x < canvas.width; x++) {
                    const i = (row * canvas.width + x) * 4;
                    const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const next = v <= low ? -1 : v >= high ? 1 : 0;
                    if (!next) continue;
                    if (side && next !== side) {
                        const width = x - last;
                        // Broad gradients/photos and near-flat scanner noise are not text edges.
                        if (width <= 12 * density) {
                            edges++;
                            if (width > 2 * density) soft++;
                        }
                    }
                    side = next; last = x;
                }
            }
        }
    } catch (e) { return false; }
    const result = edges >= 80 && soft / edges >= 0.6;
    pdfSharpnessCache.set(canvas, result);
    return result;
}

function pdfContrastSharpenFilter() {
    const id = 'reader-pdf-sharpen';
    if (!document.getElementById(id)) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.position = 'absolute'; svg.style.pointerEvents = 'none';
        const filter = document.createElementNS(ns, 'filter');
        filter.id = id;
        filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
        filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%');
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        const kernel = document.createElementNS(ns, 'feConvolveMatrix');
        kernel.setAttribute('order', '3');
        // Mild unsharp mask; weights sum to one so flat paper stays unchanged.
        kernel.setAttribute('kernelMatrix', '0 -0.35 0 -0.35 2.4 -0.35 0 -0.35 0');
        kernel.setAttribute('edgeMode', 'duplicate');
        kernel.setAttribute('preserveAlpha', 'true');
        filter.appendChild(kernel); svg.appendChild(filter); document.body.appendChild(svg);
    }
    return 'url("#' + id + '")';
}

function pdfContrastChoice() {
    const saved = readStored(PDF_CONTRAST_KEY);
    return PDF_CONTRAST_MODES.includes(saved) ? saved : 'auto';
}
// Нова книга — свої рівні: середнє від попередньої книги тут ні до чого.
function pdfContrastReset() { pdfContrastHistory = []; pdfContrastLast = null; }

// Гістограма світлості зменшеної копії полотна: { black, paper, saturation, reliable } або null.
function pdfContrastMeasure(canvas) {
    const long = Math.max(canvas.width || 0, canvas.height || 0);
    if (!long) return null;
    const k = Math.min(1, PDF_CONTRAST_SAMPLE / long);
    const w = Math.max(1, Math.round(canvas.width * k)), h = Math.max(1, Math.round(canvas.height * k));
    const small = document.createElement('canvas');
    small.width = w; small.height = h;
    const ctx = small.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    let data;
    try {
        ctx.drawImage(canvas, 0, 0, w, h);
        data = ctx.getImageData(0, 0, w, h).data;
    } catch (e) { return null; }   // полотно «забруднене» або контекст втрачено
    const hist = new Uint32Array(256);
    let saturation = 0;
    const pixels = w * h;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = r > g ? (r > b ? r : b) : (g > b ? g : b);
        const min = r < g ? (r < b ? r : b) : (g < b ? g : b);
        hist[(max + min) >> 1]++;   // світлість HSL: не залежить від відтінку паперу
        saturation += max - min;
    }
    let acc = 0, black = 0;
    const need = pixels * PDF_CONTRAST_BLACK_SHARE;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= need) { black = v; break; } }
    let paper = 255, peak = -1;
    for (let v = 128; v < 256; v++) if (hist[v] > peak) { peak = hist[v]; paper = v; }
    return {
        black: black,
        paper: paper,
        saturation: saturation / pixels,
        reliable: peak >= pixels * PDF_CONTRAST_PAPER_SHARE
    };
}

// Рівні → рядок для style.filter. Порожній рядок = сторінку не чіпаємо.
function pdfContrastFilter(black, paper, saturation, mode) {
    const invert = mode === 'dark';
    if (mode === 'off') return '';
    if (saturation > PDF_CONTRAST_COLOR) return '';   // ілюстрація, мапа, кольорова обкладинка
    if (mode === 'strong') black = Math.round(black + (paper - black) * PDF_CONTRAST_STRONG);
    if (paper - black < PDF_CONTRAST_MIN_RANGE) return '';
    if (!invert && black <= PDF_CONTRAST_SKIP_BLACK && paper - black >= PDF_CONTRAST_SKIP_RANGE) return '';
    const gain = Math.min(PDF_CONTRAST_MAX_GAIN, 255 / (paper - black));
    const offset = -(black / 255) * gain;
    const contrast = 1 - 2 * offset;      // c = 1 − 2b
    const brightness = gain / contrast;   // m = a / c
    // Та сама пара множиться й на різницю каналів, тому кремовий папір став би помаранчевим:
    // saturate(1/gain) повертає насиченість, якою вона була до розтягу.
    const parts = [
        'brightness(' + brightness.toFixed(3) + ')',
        'contrast(' + contrast.toFixed(3) + ')',
        'saturate(' + Math.min(1, Math.max(0.3, 1 / gain)).toFixed(3) + ')'
    ];
    if (invert) { parts.unshift('grayscale(1)'); parts.push('invert(1)'); }
    return parts.join(' ');
}

// Рівні цієї сторінки, згладжені по останніх сторінках книги: сусідні сторінки одного скану майже
// однакові, і без згладжування кожен перехід ледь помітно міняв яскравість сусідньої сторінки.
function pdfContrastFor(canvas) {
    const mode = pdfContrastChoice();
    if (mode === 'off') { pdfContrastLast = { mode: mode, filter: '' }; return ''; }
    const m = pdfContrastMeasure(canvas);
    if (!m) { pdfContrastLast = { mode: mode, filter: '', why: 'no sample' }; return ''; }
    if (!m.reliable) { pdfContrastLast = { mode: mode, filter: '', why: 'no paper peak', black: m.black, paper: m.paper }; return ''; }
    if (m.saturation <= PDF_CONTRAST_COLOR) {
        pdfContrastHistory.push([m.black, m.paper]);
        if (pdfContrastHistory.length > PDF_CONTRAST_HISTORY) pdfContrastHistory.shift();
    }
    const n = pdfContrastHistory.length || 1;
    const black = pdfContrastHistory.length ? Math.round(pdfContrastHistory.reduce((s, p) => s + p[0], 0) / n) : m.black;
    const paper = pdfContrastHistory.length ? Math.round(pdfContrastHistory.reduce((s, p) => s + p[1], 0) / n) : m.paper;
    let filter = pdfContrastFilter(black, paper, m.saturation, mode);
    const sharpened = m.saturation <= PDF_CONTRAST_COLOR && m.paper - m.black >= PDF_CONTRAST_MIN_RANGE
        && pdfContrastSoftText(canvas, m.black, m.paper);
    if (sharpened) filter = [pdfContrastSharpenFilter(), filter].filter(Boolean).join(' ');
    pdfContrastLast = { mode: mode, black: black, paper: paper, saturation: Math.round(m.saturation), pages: pdfContrastHistory.length, sharpened: sharpened, filter: filter };
    return filter;
}

// Зміна налаштування не перемальовує сторінки: фільтр перераховується просто на вже готових полотнах.
function pdfContrastRefreshRendered() {
    const canvases = document.querySelectorAll('#reader-pages .pdf-canvas');
    for (const canvas of canvases) {
        try { canvas.style.filter = pdfContrastFor(canvas); } catch (e) { /* одне полотно не ламає решту */ }
    }
}

function pdfContrastReport() {
    return { mode: pdfContrastChoice(), last: pdfContrastLast, pagesAveraged: pdfContrastHistory.length };
}
