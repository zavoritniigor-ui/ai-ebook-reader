/* core-text-layout.js — the reader's text look (font, spacing, margins, alignment, hyphens) and the font-size range.
 * Split out of core.js on 2026-11-14 without changes; loads right after it. */

// Захисне зчитування невеликого числа з localStorage: пошкоджене чи чуже значення
// не повинне ламати запуск — просто повертаємось до типового.
// Reader font size for text formats, in px: ONE range for A-/A+ (js/main.js) and for restoring the saved
// preference. An out-of-range saved value (older builds let A+ grow without limit) is clamped to the nearest
// limit, not thrown away for the default.
// ========== ВИГЛЯД ТЕКСТУ КНИГИ (owner: як у Moon+ / KOReader) ==========
// Розмір тексту (A− / A+) був єдиним налаштуванням верстки; шрифт, інтервал, поля, вирівнювання й переноси були жорстко
// вписані в CSS. Тепер кожне з них — ЗНАЧЕННЯ-ТОКЕН у localStorage, а не готовий CSS: у сторінку потрапляє лише те, що
// є в таблиці нижче (нічого з пам'яті не вставляється в стилі як текст), і стара збережена назва, якої вже немає,
// просто читається як типова. Застосовує їх applyTextLayout() — виставляє змінні --reader-* на <body>, звідки їх беруть
// #reader-container і #reader-pages (index.html). PDF має власну фіксовану верстку: ці змінні на його шар не впливають.
const TEXT_LAYOUT = {
    font: {
        key: 'reader_text_font', prop: '--reader-font', def: 'serif',
        values: {
            serif: "Georgia, 'Noto Serif', 'Times New Roman', 'Liberation Serif', serif",
            book: "'Iowan Old Style', Palatino, 'Palatino Linotype', 'Book Antiqua', 'URW Palladio L', Georgia, serif",
            sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', 'DejaVu Sans', sans-serif"
        }
    },
    line: { key: 'reader_line_height', prop: '--reader-line', def: 'normal', values: { tight: '1.35', normal: '1.7', loose: '2.1' } },
    margin: { key: 'reader_margin', prop: '--reader-margin', def: 'normal', values: { narrow: '0.45', normal: '1', wide: '1.6' } },
    align: { key: 'reader_align', prop: '--reader-align', def: 'justify', values: { justify: 'justify', left: 'start' } },
    hyphens: { key: 'reader_hyphens', prop: '--reader-hyphens', def: 'auto', values: { auto: 'auto', manual: 'manual' } }
};
// Назва варіанта, збережена на цьому пристрої; невідома (стара версія, зіпсований запис) читається як типова.
function textLayoutChoice(name) {
    const spec = TEXT_LAYOUT[name], saved = readStored(spec.key);
    return Object.prototype.hasOwnProperty.call(spec.values, saved) ? saved : spec.def;
}
// Виставляє всі змінні разом: на старті, після кожної зміни в меню й після синхронізації з іншого пристрою. Повертає true,
// якщо хоч одна змінна справді змінилася: саме це вирішує, чи потрібне переразбиття (синхронізація приходить і тоді, коли
// вигляд той самий, а зайве переразбиття посеред читання — видимий стрибок сторінки).
function applyTextLayout() {
    let changed = false;
    for (const [name, spec] of Object.entries(TEXT_LAYOUT)) {
        const value = spec.values[textLayoutChoice(name)];
        if (document.body.style.getPropertyValue(spec.prop) !== value) { document.body.style.setProperty(spec.prop, value); changed = true; }
    }
    return changed;
}

const READER_FONT_MIN = 12, READER_FONT_MAX = 40, READER_FONT_STEP = 2, READER_FONT_DEFAULT = 18;
function clampReaderFontSize(n) {
    return Number.isFinite(n) ? Math.min(READER_FONT_MAX, Math.max(READER_FONT_MIN, n)) : READER_FONT_DEFAULT;
}
function readStoredNumber(key, fallback, min, max) {
    const n = parseFloat(readStored(key));
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}
