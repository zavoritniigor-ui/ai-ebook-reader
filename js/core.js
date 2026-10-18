/* core.js — спільний фундамент застосунку: state/els, i18n, безпечне збереження
 * в localStorage, санітизація HTML (safeHtml/escapeHtml), керування async-задачами
 * (beginAsyncTask/cancelAsyncTasks), мережеві хелпери (fetchWithTimeout тощо),
 * мутовні контейнери епох/PDF-задач (readerEpoch/pdfTasks).
 *
 * НАВМИСНО звичайний класичний <script>, а НЕ ES-модуль: якщо це стане type="module",
 * воно виконається в defer-таймінгу (після повного парсингу документа), тоді як решта
 * застосунку лишається класичним інлайн-скриптом, що виконується СИНХРОННО одразу по
 * досягненні парсером — тобто РАНІШЕ за будь-який модуль. Класичні <script>-теги без
 * атрибутів (як цей) виконуються в порядку документа й ДІЛЯТЬ один спільний
 * script-scope — усе, що оголошено тут через let/const, лишається звичайним глобальним
 * ідентифікатором для решти файлів застосунку (і для CDP Runtime.evaluate в тестах),
 * так само, як і сьогодні в одному файлі. Це і є весь механізм модуляризації: розбиття
 * на файли за відповідальністю без зміни того, як виконується код. Свідомо БЕЗ
 * 'use strict' — оригінальний файл ніколи не був strict mode, і додавати його зараз
 * означало б непередбачену зміну поведінки, а не суто механічне перенесення коду.
 */

let storageWarningShown = false;
function readStored(key) {
    try { return localStorage.getItem(key); } catch (err) { return null; }
}
function writeStored(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (err) {
        if (!storageWarningShown) {
            storageWarningShown = true;
            alert('Браузер не зміг зберегти налаштування або позначки. Після закриття сторінки останні зміни можуть бути втрачені. Перевірте вільне місце та дозвіл на збереження даних.');
        }
        return false;
    }
}

// Rebuild untrusted markup from an inert template using an explicit allowlist.
function safeHtml(value, ai = false) {
    const source = document.createElement('template');
    source.innerHTML = String(value || '');
    const output = document.createElement('div');
    const tags = new Set('p div span section article header footer main aside h1 h2 h3 h4 h5 h6 b strong i em u s del ins small sub sup br hr blockquote pre code ul ol li dl dt dd table caption thead tbody tfoot tr th td colgroup col a img figure figcaption ruby rt rp abbr button'.split(' '));
    const drop = new Set('script style link meta base title iframe frame frameset object embed applet svg math template noscript textarea select input audio video source form'.split(' '));
    // verb-card/verb-head/verb-forme/verb-chips/verb-chip retired with the old raw-HTML
    // Grammar-panel contract: the redesigned panel builds its DOM from structured JSON
    // fields via createElement/textContent, never from innerHTML of AI text (see
    // js/grammar-svo.js), so those classes are no longer needed here.
    const classes = new Set('lvl lvl-block tt-note'.split(' '));
    const styles = new Set('color background-color font-size font-weight font-style font-family text-align text-decoration line-height white-space border border-color border-width border-style border-collapse padding padding-left padding-right padding-top padding-bottom margin margin-left margin-right margin-top margin-bottom'.split(' '));
    function copy(node, parent) {
        if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(document.createTextNode(node.nodeValue)); return; }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const tag = node.localName;
        if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml' || drop.has(tag)) return;
        if (!tags.has(tag) || (tag === 'button' && !ai)) {
            Array.from(node.childNodes).forEach(child => copy(child, parent)); return;
        }
        const el = document.createElement(tag);
        for (const attr of ['title', 'lang', 'dir', 'alt']) {
            if (node.hasAttribute(attr)) el.setAttribute(attr, node.getAttribute(attr));
        }
        for (const attr of ['colspan', 'rowspan', 'span', 'start', 'width', 'height']) {
            const v = node.getAttribute(attr);
            if (v && /^\d{1,4}$/.test(v)) el.setAttribute(attr, v);
        }
        if (ai) {
            el.className = Array.from(node.classList).filter(c => classes.has(c)).join(' ');
            if (/^[ABC][12]$/.test(node.getAttribute('data-l') || '')) el.dataset.l = node.getAttribute('data-l');
            if (node.hasAttribute('data-v')) el.dataset.v = node.getAttribute('data-v').slice(0, 120);
        }
        if (tag === 'button') el.type = 'button';
        if (!ai && node.id) el.id = 'book-' + node.id;
        if (tag === 'a') {
            const href = (node.getAttribute('href') || '').trim();
            if (href.startsWith('#') && !ai) el.setAttribute('href', '#book-' + href.slice(1));
            else if (/^https?:\/\/|^mailto:/i.test(href) && !/[\u0000-\u0020]/.test(href)) {
                el.setAttribute('href', href); el.target = '_blank'; el.rel = 'noopener noreferrer';
            }
        }
        if (tag === 'img' && !ai) {
            const src = (node.getAttribute('src') || '').trim();
            // Відносний шлях (для зображень усередині EPUB) дозволяємо, але НЕ
            // protocol-relative "//host/..." — де-факто зовнішнє посилання
            // (успадковує https: поточної сторінки) і непомітний спосіб влаштувати
            // трекінг-піксель у книзі: підвантажиться з чужого домену щоразу,
            // як читач відкриє розділ, і видасть сам факт читання цієї книги.
            if ((src && !/[:\\\u0000-\u0020]/.test(src) && !src.startsWith('//')) || /^https?:\/\//i.test(src) || /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(src)) {
                el.setAttribute('src', src); el.referrerPolicy = 'no-referrer';
            }
        }
        for (const prop of Array.from(node.style)) {
            const v = node.style.getPropertyValue(prop);
            // No URLs, escapes, functions, positioning or application CSS variables.
            // CSSOM normalizes ordinary hex colors to rgb(...). Preserve those
            // numeric colors without admitting URLs, variables or other functions.
            const numericColor = /^(?:color|background-color|border-color)$/.test(prop)
                && /^(?:rgba?|hsla?)\([\d\s.,%+\/-]+\)$/i.test(v);
            if (styles.has(prop) && (/^[#%.,\s\w-]+$/.test(v) || numericColor)) el.style.setProperty(prop, v);
        }
        Array.from(node.childNodes).forEach(child => copy(child, el));
        parent.appendChild(el);
    }
    Array.from(source.content.childNodes).forEach(node => copy(node, output));
    return output.innerHTML;
}

// Мутовний контейнер (а не окремі let), щоб майбутні ES-модулі могли імпортувати
// об'єкт і читати/писати його поля напряму — на відміну від голого let,
// імпортований binding не можна переприсвоїти ззовні модуля.
const readerEpoch = { book: 0, render: 0 };
// Той самий патерн: один мутовний об'єкт замість трьох окремих let, які раніше
// переприсвоювались із трьох різних логічних ділянок коду (рендер PDF,
// скасування zoom/pan-взаємодії, фонове призупинення застосунку).
const pdfTasks = { render: null, loading: null, text: null };
const asyncTasks = new Map();
function beginAsyncTask(key) {
    asyncTasks.get(key)?.controller.abort();
    const controller = new AbortController();
    const epoch = readerEpoch.book, target = state.targetLang;
    const task = { controller, signal: controller.signal,
        current: () => asyncTasks.get(key) === task && epoch === readerEpoch.book && target === state.targetLang && !controller.signal.aborted };
    asyncTasks.set(key, task);
    return task;
}
function cancelAsyncTasks(keys = Array.from(asyncTasks.keys())) {
    for (const key of keys) { asyncTasks.get(key)?.controller.abort(); asyncTasks.delete(key); }
}
function invalidateSelection() {
    cancelDragSelection();
    state.lookupToken++;
    structToken++;
    cancelAsyncTasks(['lookup', 'structure', 'structureDeep']);
    cancelTooltipHide();
    els.tooltip.style.display = 'none';
    clearSelectionHighlight();
    state.lastSelectedRange = null; state.ctxSentenceRange = null;
    state.lastTapPoint = null; state.lastWordNode = null; state.ctxSentence = '';
}
function showReaderError(err) {
    els.pages.textContent = 'Помилка відкриття документа: ' + (err.message || String(err));
    els.progress.textContent = t('error');
}
function waitForResult(promise, signal, timeoutMs) {
    return new Promise((resolve, reject) => {
        let timer;
        const finish = (fn, value) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); fn(value); };
        const abort = () => finish(reject, new DOMException('Cancelled', 'AbortError'));
        timer = setTimeout(() => finish(reject, new Error('Перевищено час очікування перекладу.')), timeoutMs);
        signal?.addEventListener('abort', abort, { once: true });
        promise.then(value => finish(resolve, value), err => finish(reject, err));
        if (signal?.aborted) abort();
    });
}
async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const signal = options.signal;
    let timedOut = false;
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        // Keep the timeout active while the response body is downloading as well.
        const body = await response.arrayBuffer();
        return new Response([204, 205, 304].includes(response.status) ? null : body, { status: response.status, statusText: response.statusText, headers: response.headers });
    } catch (err) {
        if (timedOut) { const e = new Error('Сервер не відповів вчасно. Спробуйте ще раз.'); e.reason = 'timeout'; throw e; }
        if (err.name === 'AbortError') throw err;
        if (err instanceof TypeError) throw new Error(t('errNoConnection'));
        throw err;
    } finally {
        clearTimeout(timer); signal?.removeEventListener('abort', abort);
    }
}
async function readResponseJson(response) {
    try { return await response.json(); }
    catch (err) { throw new Error('Сервер повернув некоректну відповідь. Спробуйте ще раз.'); }
}
function aiText(value) {
    const text = sanitizeAI(value);
    if (!text) throw new Error('AI повернув порожню відповідь. Спробуйте ще раз.');
    return text;
}

// Захисне зчитування невеликого числа з localStorage: пошкоджене чи чуже значення
// не повинне ламати запуск — просто повертаємось до типового.
// Reader font size for text formats, in px: ONE range for A-/A+ (js/main.js) and for restoring the saved
// preference. An out-of-range saved value (older builds let A+ grow without limit) is clamped to the nearest
// limit, not thrown away for the default.
const READER_FONT_MIN = 12, READER_FONT_MAX = 40, READER_FONT_STEP = 2, READER_FONT_DEFAULT = 18;
function clampReaderFontSize(n) {
    return Number.isFinite(n) ? Math.min(READER_FONT_MAX, Math.max(READER_FONT_MIN, n)) : READER_FONT_DEFAULT;
}
function readStoredNumber(key, fallback, min, max) {
    const n = parseFloat(readStored(key));
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}
// One registry drives selectors, translation/AI language names and TTS locales.
// Browser-provided translation and speech engines may still report a pair/voice
// unavailable; callers keep their existing graceful fallback behavior.
const LANGUAGE_CONFIG = {
    uk: { locale: 'uk-UA', aiName: 'українською', promptName: 'Ukrainian' },
    en: { locale: 'en-US', aiName: 'англійською', promptName: 'English' },
    fr: { locale: 'fr-FR', aiName: 'французькою', promptName: 'French' },
    ru: { locale: 'ru-RU', aiName: 'російською', promptName: 'Russian' },
    zh: { locale: 'zh-CN', aiName: 'китайською (спрощеною)', promptName: 'Simplified Chinese' },
    ko: { locale: 'ko-KR', aiName: 'корейською', promptName: 'Korean' },
    hi: { locale: 'hi-IN', aiName: 'гінді', promptName: 'Hindi' },
    ga: { locale: 'ga-IE', aiName: 'ірландською', promptName: 'Irish' },
    // Німецька — лише МОВА ПЕРЕКЛАДУ та озвучення (targetOnly): не стає мовою меню, граматичного розбору чи правил.
    de: { locale: 'de-DE', aiName: 'німецькою', promptName: 'German', targetOnly: true },
    // Іспанська — і мова перекладу, і мова меню (рядки меню — js/i18n-es.js).
    es: { locale: 'es-ES', aiName: 'іспанською', promptName: 'Spanish' }
};
// Мови меню / вивчення (мають повний набір рядків і граматичні налаштування).
const SUPPORTED_LANGUAGE_CODES = Object.keys(LANGUAGE_CONFIG).filter(code => !LANGUAGE_CONFIG[code].targetOnly);
// Мови, якими можна перекладати й озвучувати переклад (+ німецька та іспанська); голоси для них теж підбираються й запам'ятовуються.
const TARGET_LANGUAGE_CODES = Object.keys(LANGUAGE_CONFIG);

// Language-aware grammar configuration for the redesigned Grammar panel
// (Verbs/Adjectives contextual-learning modes). One entry per SUPPORTED_LANGUAGE_CODES
// member. Each entry declares:
//   - labels: the Verbs/Adjectives tab text IN THAT LANGUAGE ITSELF (not the interface
//     language — the panel names its own subject matter, e.g. "Verbes" for French text
//     no matter what the reader's UI language is set to);
//   - verb/adjective.features: the ONLY grammatical dimensions the AI is allowed to
//     report for that part of speech in that language. This is the actual mechanism
//     behind "don't show meaningless categories" (task section 5/7): normalizeGrammar-
//     Features() strips anything not in this list before it ever reaches the UI, so a
//     language with no grammatical gender can never get a fabricated gender badge;
//   - verb.tenses: the enumerated tense/mood list driving the Verbs-mode control bar
//     (replaces the old hardcoded EN/FR-only TENSE_SYSTEMS — every other language used
//     to silently reuse the English tense bar, which was simply wrong for its grammar);
//   - verb.persons / adjective.forms: the paradigm slots requested when a learner clicks
//     a specific lemma (conjugation table / agreement grid).
// A language with no explicit entry falls back to DEFAULT_GRAMMAR_LANG rather than
// crashing; callers that must NOT silently analyse a language with another language's
// categories check hasGrammarConfig() first.
const GRAMMAR_LANG_CONFIG = {
    en: {
        labels: { verbs: 'Verbs', adjectives: 'Adjectives' },
        verb: {
            features: ['tense', 'aspect', 'person', 'number', 'auxiliary'],
            // Features whose bare value is not self-explanatory on a chip ("has" alone could be anything):
            // shown as "label: value", in the source language's own term.
            featureLabels: { auxiliary: 'auxiliary' },
            tenses: [
                { id: 'present_simple', label: 'Present Simple' },
                { id: 'present_continuous', label: 'Present Continuous' },
                { id: 'past_simple', label: 'Past Simple' },
                { id: 'past_continuous', label: 'Past Continuous' },
                { id: 'present_perfect', label: 'Present Perfect' },
                { id: 'past_perfect', label: 'Past Perfect' },
                { id: 'future_simple', label: 'Future Simple' },
                { id: 'conditional', label: 'Conditional' }
            ],
            persons: ['I', 'you', 'he / she / it', 'we', 'you (plural)', 'they'],
            // Regular English inflection only ever adds one of these to a stem (walk+ed,
            // stud+ies, runn+ing); a "stem/ending" split ending in anything else is bogus.
            endings: ['s', 'es', 'ed', 'd', 'ing', 'ies', 'ied'],
            // When true, a conjugation table the model returns with an analysis must contain
            // the analysed surface form in one of its rows, or the table is discarded.
            verifyForms: true,
            // Irregular verbs have no teachable stem+ending split (went, taken, been).
            irregularRe: /^(?:be|have|do|go|say|get|make|know|think|take|see|come|give|find|tell|become|leave|feel|put|bring|begin|keep|hold|write|stand|hear|let|mean|set|meet|run|pay|sit|speak|lie|lead|read|grow|lose|fall|send|build|understand|draw|break|spend|cut|rise|drive|buy|wear|choose|eat|drink|sing|swim|fly|forget|sleep|wake|win|throw|catch|teach|sell|fight|hit|hide|shake|steal|tear|bear|ring|sink|swing|shoot|shut|split|spread|strike|swear|sweep|feed|flee|forgive|freeze|hang|lay|lend|ride|seek|show|shrink|slide|stick|sting|bite|blow|bind|bleed|breed|burst|cast|cling|creep|deal|dig|dive|fit|kneel|leap|overcome|undo|weave|withdraw|can|could|may|might|must|shall|should|will|would|ought)$/i,
            auxiliaries: ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must'],
            promptNote: 'English: the lemma is the bare base form without "to" (walk, be, give up). When an auxiliary and its main verb are ADJACENT in the text (has been eating, did not know, will go) use the whole contiguous group as "surface", otherwise the main verb alone with features.auxiliary. A phrasal verb whose particle is adjacent (give up) uses both words as surface. Never tag a gerund or participle that is only a noun or a plain adjective as a verb. Explain WHY this tense/aspect is used here (e.g. present perfect for a past action with present relevance).'
        },
        adjective: {
            features: ['degree'], forms: [],
            promptNote: 'English adjectives do not agree with the noun. Give the plain positive form as lemma (big for bigger/biggest) and report features.degree only for a comparative or superlative form. A participle counts as an adjective only when it modifies a noun or follows a linking verb (a tired man, I am tired). Set "agreesWith" to the noun or pronoun the adjective describes.'
        }
    },
    fr: {
        // Dictionary forms are lower case, but headings in books are ALL CAPS ("PRÉPARER LES TRAVAUX"): a model echoing
        // the capitals as the lemma must not create a second card next to "préparer".
        lemmaCase: 'lower',
        labels: { verbs: 'Verbes', adjectives: 'Adjectifs' },
        verb: {
            features: ['tense', 'mood', 'person', 'number', 'auxiliary', 'participle'],
            // "être" / "allé" alone beside "3e personne" do not say WHICH role they play in a compound tense.
            featureLabels: { auxiliary: 'auxiliaire', participle: 'participe' },
            tenses: [
                { id: 'indicatif_present', label: 'Présent' },
                { id: 'indicatif_imparfait', label: 'Imparfait' },
                { id: 'indicatif_passe_compose', label: 'Passé composé' },
                { id: 'indicatif_futur', label: 'Futur simple' },
                { id: 'conditionnel_present', label: 'Conditionnel' },
                { id: 'subjonctif_present', label: 'Subjonctif' },
                { id: 'imperatif', label: 'Impératif' },
                { id: 'plus_que_parfait', label: 'Plus-que-parfait' }
            ],
            persons: ['je', 'tu', 'il / elle / on', 'nous', 'vous', 'ils / elles'],
            // A French dictionary form is an infinitive: -er, -ir, -re or -oir, optionally
            // reflexive (se lever, s'asseoir, s'en aller). A finite form given as the lemma
            // (parlait, mange) is a model error and the item is rejected.
            verifyForms: true,
            lemmaRe: /^(?:s['’]|se\s+)?(?:en\s+)?\p{L}+(?:er|ir|re|oir)$/u,
            // Irregular verbs (and their prefixed derivatives) have no honest "stem + ending"
            // split — nous sommes, ils vont, il fait — so any split is discarded.
            irregularRe: /(?:^|[\s'’])(?:être|avoir|aller)$|(?:aire|dire|voir|loir|seoir|venir|tenir|mettre|prendre|duire|struire|cevoir|courir|mourir|vivre|suivre|rire|crire|lire|croire|boire|aître|aitre|aindre|eindre|oindre|vaincre|battre|partir|sortir|dormir|servir|sentir|mentir|cueillir|frir|vrir|clure|luire|nuire|coudre|moudre|soudre|fuir|vêtir|quérir|bouillir|saillir|haïr)$/u,
            // Every legitimate French verb ending (present, imparfait, futur, conditionnel,
            // subjonctif, impératif, passé simple, participles). A stem/ending split whose
            // ending is not one of these is not a real, teachable pattern.
            endings: ['e', 'es', 'ent', 'ons', 'ez', 'ai', 'as', 'a', 'ont', 'ais', 'ait', 'aient', 'ions', 'iez', 'âmes', 'âtes', 'èrent',
                'is', 'it', 'issons', 'issez', 'issent', 'issais', 'issait', 'issions', 'issiez', 'issaient', 'isse', 'isses', 'issant', 'ant',
                's', 't', 'd', 'x', 'é', 'ée', 'és', 'ées', 'i', 'ie', 'is', 'ies', 'u', 'ue', 'us', 'ues', 'îmes', 'îtes', 'irent', 'ut', 'ûmes', 'ûtes', 'urent',
                'rai', 'ras', 'ra', 'rons', 'rez', 'ront', 'rais', 'rait', 'rions', 'riez', 'raient',
                'erai', 'eras', 'era', 'erons', 'erez', 'eront', 'erais', 'erait', 'erions', 'eriez', 'eraient',
                'irai', 'iras', 'ira', 'irons', 'irez', 'iront', 'irais', 'irait', 'irions', 'iriez', 'iraient',
                'ent', 'er', 'ir', 're', 'îs', 'ît', 'ât'],
            // First token of a compound-tense group (a mangé, est allée, avait fini, aurait pu).
            auxiliaries: ['ai', 'as', 'a', 'avons', 'avez', 'ont', 'avais', 'avait', 'avions', 'aviez', 'avaient', 'aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront',
                'aurais', 'aurait', 'aurions', 'auriez', 'auraient', 'aie', 'aies', 'ait', 'ayons', 'ayez', 'aient', 'eus', 'eut', 'eûmes', 'eûtes', 'eurent',
                'suis', 'es', 'est', 'sommes', 'êtes', 'sont', 'étais', 'était', 'étions', 'étiez', 'étaient', 'serai', 'seras', 'sera', 'serons', 'serez', 'seront',
                'serais', 'serait', 'serions', 'seriez', 'seraient', 'sois', 'soit', 'soyons', 'soyez', 'soient', 'fus', 'fut', 'fûmes', 'fûtes', 'furent'],
            promptNote: 'French verbs: the lemma is the INFINITIVE (parler, être, se lever). For a compound tense (passé composé, plus-que-parfait, futur antérieur, conditionnel passé, subjonctif passé…) whose auxiliary and participle are ADJACENT in the text use the whole group as "surface" (e.g. "a mangé", "est allée") and set features.auxiliary to the auxiliary\'s infinitive (avoir / être) and features.participle to the participle; if a pronoun or adverb separates them, use the past participle alone as surface. Report features.mood in standard French terms (indicatif, subjonctif, conditionnel, impératif) and person as "1re / 2e / 3e personne". Explain WHY this tense or mood is used here (imparfait for a habitual or background past action, passé composé for a completed event, subjonctif after "il faut que" / "bien que", agreement of a participle with a preceding direct object or with the subject after être). For irregular verbs (être, avoir, aller, faire, pouvoir, vouloir, savoir, venir, prendre, mettre, dire, voir…) set stemBreakdown to null.'
        },
        adjective: {
            features: ['gender', 'number'],
            forms: [
                { id: 'ms', label: 'masculin singulier' }, { id: 'fs', label: 'féminin singulier' },
                { id: 'mp', label: 'masculin pluriel' }, { id: 'fp', label: 'féminin pluriel' },
                { id: 'ms_vowel', label: 'masculin sing. devant voyelle' }
            ],
            // Slot ids the regular-transformation display is derived from: each derived
            // form is described relative to the base (petit → petite: +e; heureux → heureuse:
            // −x +se), computed from the grid itself rather than asserted by the model.
            paradigm: { base: 'ms', derived: ['fs', 'mp', 'fp'] },
            // The agreement grid the model returns must contain the analysed surface form,
            // and its masculine-singular cell must be the lemma, or the grid is discarded.
            verifyForms: true,
            // The only five adjectives with a distinct masculine form before a vowel or
            // mute h (un bel homme, un nouvel ami, un vieil arbre, un fol espoir, un mol effort).
            specialForms: { ms_vowel: { beau: 'bel', nouveau: 'nouvel', vieux: 'vieil', fou: 'fol', mou: 'mol' } },
            promptNote: 'French adjectives: the lemma is the MASCULINE SINGULAR (petit, heureux, beau, nouveau). features.gender and features.number describe THIS exact form. Set "agreesWith" to the noun or pronoun in the sentence the adjective modifies, copied exactly. The "forms" grid MUST contain this exact surface and follow French orthography: regular +e / +s / +es; and the irregular patterns heureux→heureuse, blanc→blanche, beau→belle/beaux, vieux→vieille, nouveau→nouvelle/nouveaux, cher→chère, doux→douce, long→longue, favori→favorite, actif→active, bon→bonne, gentil→gentille; an invariable adjective (marron, orange, rouge in the masculine/feminine singular) repeats the same string. Add "ms_vowel" ONLY for beau→bel, nouveau→nouvel, vieux→vieil, fou→fol, mou→mol — never for any other adjective. Explain WHY this form: which noun it agrees with, that noun\'s gender and number, and (when it matters) why the adjective precedes or follows the noun.'
        }
    },
    uk: {
        labels: { verbs: 'Дієслова', adjectives: 'Прикметники' },
        verb: {
            features: ['aspect', 'tense', 'mood', 'person', 'number', 'gender'],
            tenses: [
                { id: 'present', label: 'Теперішній час' },
                { id: 'past', label: 'Минулий час' },
                { id: 'future', label: 'Майбутній час' },
                { id: 'imperative', label: 'Наказовий спосіб' },
                { id: 'conditional', label: 'Умовний спосіб' }
            ],
            persons: ['я', 'ти', 'він / вона / воно', 'ми', 'ви', 'вони']
        },
        adjective: {
            features: ['gender', 'number', 'case'],
            forms: [
                { id: 'nom_ms', label: 'чол. рід, називний' }, { id: 'nom_fs', label: 'жін. рід, називний' },
                { id: 'nom_ns', label: 'сер. рід, називний' }, { id: 'nom_pl', label: 'множина, називний' }
            ]
        }
    },
    ru: {
        labels: { verbs: 'Глаголы', adjectives: 'Прилагательные' },
        verb: {
            features: ['aspect', 'tense', 'mood', 'person', 'number', 'gender'],
            tenses: [
                { id: 'present', label: 'Настоящее время' },
                { id: 'past', label: 'Прошедшее время' },
                { id: 'future', label: 'Будущее время' },
                { id: 'imperative', label: 'Повелительное наклонение' },
                { id: 'conditional', label: 'Условное наклонение' }
            ],
            persons: ['я', 'ты', 'он / она / оно', 'мы', 'вы', 'они']
        },
        adjective: {
            features: ['gender', 'number', 'case'],
            forms: [
                { id: 'nom_ms', label: 'муж. род, именительный' }, { id: 'nom_fs', label: 'жен. род, именительный' },
                { id: 'nom_ns', label: 'ср. род, именительный' }, { id: 'nom_pl', label: 'мн. число, именительный' }
            ]
        }
    },
    zh: {
        labels: { verbs: '动词', adjectives: '形容词' },
        verb: {
            features: ['aspect'],
            tenses: [
                { id: 'default', label: '一般' }, { id: 'le', label: '了（完成）' },
                { id: 'zhe', label: '着（进行/持续）' }, { id: 'guo', label: '过（经历）' }
            ],
            persons: []
        },
        adjective: { features: ['degree'], forms: [] }
    },
    ko: {
        labels: { verbs: '동사', adjectives: '형용사' },
        verb: {
            features: ['tense', 'honorific'],
            tenses: [
                { id: 'present', label: '현재' }, { id: 'past', label: '과거' }, { id: 'future', label: '미래' }
            ],
            persons: []
        },
        adjective: { features: ['tense', 'honorific'], forms: [] }
    },
    hi: {
        labels: { verbs: 'क्रिया', adjectives: 'विशेषण' },
        verb: {
            features: ['tense', 'aspect', 'gender', 'number', 'person'],
            tenses: [
                { id: 'present', label: 'वर्तमान काल' }, { id: 'past', label: 'भूत काल' }, { id: 'future', label: 'भविष्य काल' }
            ],
            persons: ['मैं', 'तुम', 'वह', 'हम', 'आप', 'वे']
        },
        adjective: {
            features: ['gender', 'number'],
            forms: [
                { id: 'ms', label: 'पुल्लिंग एकवचन' }, { id: 'fs', label: 'स्त्रीलिंग एकवचन' },
                { id: 'mp', label: 'पुल्लिंग बहुवचन' }, { id: 'fp', label: 'स्त्रीलिंग बहुवचन' }
            ]
        }
    },
    es: {
        lemmaCase: 'lower',
        labels: { verbs: 'Verbos', adjectives: 'Adjetivos' },
        verb: {
            features: ['tense', 'mood', 'person', 'number'],
            tenses: [
                { id: 'presente', label: 'Presente' }, { id: 'preterito_indefinido', label: 'Pretérito indefinido' },
                { id: 'preterito_imperfecto', label: 'Pretérito imperfecto' }, { id: 'preterito_perfecto', label: 'Pretérito perfecto' },
                { id: 'futuro', label: 'Futuro' }, { id: 'condicional', label: 'Condicional' },
                { id: 'subjuntivo_presente', label: 'Presente de subjuntivo' }, { id: 'imperativo', label: 'Imperativo' }
            ],
            persons: ['yo', 'tú', 'él / ella / usted', 'nosotros', 'vosotros', 'ellos / ellas / ustedes'],
            promptNote: 'Spanish: the lemma is the infinitive (-ar, -er, -ir, optionally reflexive: levantarse). A compound tense (he comido, había dicho) or a periphrasis written together (voy a ir, estoy leyendo) uses the whole contiguous group as "surface".'
        },
        adjective: {
            features: ['gender', 'number', 'degree'],
            forms: [
                { id: 'ms', label: 'masculino singular' }, { id: 'fs', label: 'femenino singular' },
                { id: 'mp', label: 'masculino plural' }, { id: 'fp', label: 'femenino plural' }
            ]
        }
    },
    ga: {
        labels: { verbs: 'Briathra', adjectives: 'Aidiachtaí' },
        verb: {
            features: ['tense', 'mood', 'person', 'number'],
            tenses: [
                { id: 'present', label: 'Aimsir Láithreach' }, { id: 'past', label: 'Aimsir Chaite' },
                { id: 'future', label: 'Aimsir Fháistineach' }, { id: 'conditional', label: 'Modh Coinníollach' }
            ],
            persons: ['mé', 'tú', 'sé / sí', 'muid', 'sibh', 'siad']
        },
        adjective: {
            features: ['gender', 'number'],
            forms: [
                { id: 'ms', label: 'firinscneach uatha' }, { id: 'fs', label: 'baininscneach uatha' },
                { id: 'pl', label: 'iolra' }
            ]
        }
    }
};
const DEFAULT_GRAMMAR_LANG = 'en';
function grammarConfigFor(langCode) {
    return GRAMMAR_LANG_CONFIG[langCode] || GRAMMAR_LANG_CONFIG[DEFAULT_GRAMMAR_LANG];
}
// The actual fix for fabricated/meaningless grammar categories (task section 7): the
// model may propose any key, but only dimensions this language's config lists for this
// part of speech ever survive to the UI. Also drops null/empty values outright.
function normalizeGrammarFeatures(pos, langCode, rawFeatures) {
    const cfg = grammarConfigFor(langCode)[pos === 'adjective' ? 'adjective' : 'verb'];
    const out = {};
    if (rawFeatures && typeof rawFeatures === 'object') {
        for (const key of cfg.features) {
            const v = rawFeatures[key];
            if (v === undefined || v === null || v === '') continue;
            if (typeof v === 'string' || typeof v === 'number') out[key] = v;
        }
    }
    return out;
}

// The model is asked to echo the language of the text it analysed. Accepts the bare code, a
// regional tag ("fr-FR"), or the language's English name ("French", "Simplified Chinese").
function languageEchoMatches(echoed, langCode) {
    const value = String(echoed == null ? '' : echoed).trim().toLowerCase();
    const name = (LANGUAGE_CONFIG[langCode]?.promptName || '').toLowerCase();
    return value.slice(0, 2) === langCode || (value.length >= 4 && (value === name || name.includes(value)));
}

function hasGrammarConfig(langCode) {
    return Object.prototype.hasOwnProperty.call(GRAMMAR_LANG_CONFIG, langCode);
}

// NFC + collapsed whitespace: PDF text layers deliver decomposed diacritics (e + U+0301
// instead of é) and line-break whitespace, and either makes an otherwise exact surface
// form fail a literal match. Grammar and Practice normalise BOTH sides the same way.
function normalizeGrammarText(text) {
    return String(text == null ? '' : text).normalize('NFC').replace(/\s+/g, ' ').trim();
}

// Word-boundary-aware occurrence search. A plain includes()/indexOf() treats "is" as
// present inside "this" and French "est" as present inside "reste", which both fabricates
// a match and highlights the wrong span. Boundaries are enforced only for
// scripts that separate words with spaces; Han/Hangul run words together, so there a
// plain substring match is the only meaningful one. A surface whose own edge is not a
// letter (e.g. "qu'") skips the check on that edge.
const GRAMMAR_SPACED_SCRIPT_RE = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Devanagari}]/u;
const GRAMMAR_WORD_CHAR_RE = /[\p{L}\p{M}\p{N}]/u;
function findSurfaceOccurrences(text, surface) {
    const found = [];
    if (!text || !surface) return found;
    const strict = GRAMMAR_SPACED_SCRIPT_RE.test(surface);
    const firstChar = Array.from(surface)[0], lastChar = Array.from(surface).pop();
    const checkBefore = strict && GRAMMAR_WORD_CHAR_RE.test(firstChar);
    const checkAfter = strict && GRAMMAR_WORD_CHAR_RE.test(lastChar);
    let from = 0;
    for (;;) {
        const idx = text.indexOf(surface, from);
        if (idx === -1) break;
        from = idx + 1;
        if (checkBefore && idx > 0 && GRAMMAR_WORD_CHAR_RE.test(Array.from(text.slice(Math.max(0, idx - 2), idx)).pop())) continue;
        const end = idx + surface.length;
        if (checkAfter && end < text.length && GRAMMAR_WORD_CHAR_RE.test(String.fromCodePoint(text.codePointAt(end)))) continue;
        found.push(idx);
    }
    return found;
}

// ---- Tolerant JSON extraction for structured AI replies ----------------------------------------------
// The AI is asked for bare JSON but real models routinely: wrap it in a code fence or a sentence of
// preamble/epilogue, leave a trailing comma, put a raw newline inside a string, and — most damaging —
// write an unescaped double quote INSIDE a string value (an `explanation` quoting the French word it
// explains). Strict JSON.parse then rejects the WHOLE reply for one cosmetic slip. Only FORMATTING is
// repaired here; every repaired value still goes through the same semantic validation as any other
// (a fabricated surface/lemma/sentence is still rejected). A reply that is cut off mid-way (token cap) is
// closed at the last COMPLETE element so the complete items before the cut survive.
//
// scanAiJson(text, start) walks the text once, string-aware, and returns
//   { text: repaired JSON of the root value (only if complete), complete, salvage: repaired JSON closed at the
//     last complete element (when incomplete), notes: [repairs applied] }.
function scanAiJson(src, start) {
    const out = [], notes = new Set(), stack = [];   // stack entries: { type:'{'|'[', expectKey:boolean }
    let inStr = false, isKey = false, i = start, safe = null, lastSig = -1;
    const n = src.length;
    const top = () => stack[stack.length - 1];
    // A safe point is where the reply may be closed if it is cut off. ONLY at element boundaries: after a complete
    // member of a root-level object, or a complete element of an array. A half-built array element (an item cut
    // mid-way) is not an item and is never kept.
    const markSafe = () => {
        if (!stack.length) return;
        if (top().type === '[' || stack.every(e => e.type === '{')) safe = { len: out.length, stack: stack.map(e => e.type) };
    };
    const emit = ch => { out.push(ch); if (!inStr && !/\s/.test(ch)) lastSig = out.length - 1; };
    const valueDone = () => { const t = top(); if (t && t.type === '{') t.expectKey = false; };
    // What may legitimately follow a string's closing quote: , } ] : (and end of text). After a comma the next
    // significant char must start another member/value, otherwise the quote was an inner one.
    const closesString = j => {
        while (j < n && /\s/.test(src[j])) j++;
        if (j >= n) return true;
        const c = src[j];
        if (c === '}' || c === ']' || c === ':') return true;
        if (c !== ',') return false;
        j++;
        while (j < n && /\s/.test(src[j])) j++;
        if (j >= n) return true;
        const d = src[j];
        if (d === '"' || d === '{' || d === '[' || d === '}' || d === ']' || d === '-' || (d >= '0' && d <= '9')) return true;
        if (d === '/' && (src[j + 1] === '/' || src[j + 1] === '*')) return true;   // a comment follows
        return /^(?:true|false|null)\b/.test(src.slice(j, j + 6));
    };
    while (i < n) {
        const ch = src[i];
        if (inStr) {
            if (ch === '\\') {
                const nx = src[i + 1];
                if (nx === undefined) { i++; break; }
                if ('"\\/bfnrtu'.includes(nx)) { out.push(ch, nx); } else { out.push(nx); notes.add('bad_escape'); }
                i += 2; continue;
            }
            if (ch === '"') {
                if (closesString(i + 1)) {
                    inStr = false; out.push('"');
                    if (isKey) { top().expectKey = false; top().awaitColon = true; } else { valueDone(); markSafe(); }
                } else { out.push('\\', '"'); notes.add('inner_quotes'); }
                i++; continue;
            }
            const code = ch.charCodeAt(0);
            if (code < 0x20) { out.push(ch === '\n' ? '\\n' : ch === '\t' ? '\\t' : ch === '\r' ? '\\r' : '\\u' + code.toString(16).padStart(4, '0')); notes.add('control_chars'); i++; continue; }
            out.push(ch); i++; continue;
        }
        if (/\s/.test(ch)) { out.push(ch); i++; continue; }
        if (ch === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; notes.add('comments'); continue; }
        if (ch === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e === -1 ? n : e + 2; notes.add('comments'); continue; }
        if (ch === '"') { inStr = true; isKey = !!(top() && top().type === '{' && top().expectKey); emit(ch); i++; continue; }
        if (ch === '{' || ch === '[') { stack.push({ type: ch, expectKey: ch === '{' }); emit(ch); i++; continue; }
        if (ch === '}' || ch === ']') {
            const t = top();
            if (!t || t.type !== (ch === '}' ? '{' : '[')) return { text: null, complete: false, salvage: null, notes: [...notes], error: 'mismatched_bracket' };
            if (out[lastSig] === ',') { out.splice(lastSig, 1); lastSig = -1; notes.add('trailing_comma'); }
            stack.pop(); emit(ch);
            if (!stack.length) return { text: out.join(''), complete: true, salvage: null, notes: [...notes] };
            valueDone(); markSafe(); i++; continue;
        }
        if (ch === ',') { const t = top(); if (t && t.type === '{') t.expectKey = true; emit(ch); i++; continue; }
        if (ch === ':') { emit(ch); i++; continue; }
        // number / true / false / null (also tolerate the Python spellings)
        let j = i; while (j < n && /[^\s,\]}:"]/.test(src[j])) j++;
        let tok = src.slice(i, j);
        if (tok === 'None') { tok = 'null'; notes.add('python_literals'); } else if (tok === 'True') { tok = 'true'; notes.add('python_literals'); } else if (tok === 'False') { tok = 'false'; notes.add('python_literals'); }
        if (!/^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)$/.test(tok)) {
            if (j >= n) break;                                    // cut off inside a token: incomplete
            return { text: null, complete: false, salvage: null, notes: [...notes], error: 'bad_token' };
        }
        for (const c of tok) emit(c);
        i = j;
        if (i < n) { valueDone(); markSafe(); }                   // only complete when a delimiter follows it
    }
    // Ran out of text: incomplete. Close at the last complete element.
    let salvage = null;
    if (safe) salvage = out.slice(0, safe.len).join('') + safe.stack.slice().reverse().map(t => t === '{' ? '}' : ']').join('');
    return { text: null, complete: false, salvage, notes: [...notes] };
}

// Strips fences / zero-width characters and locates the root value. `array:true` also accepts a bare
// top-level array. Returns { ok, value, notes, truncated, error }.
function parseAiJson(raw, options = {}) {
    let text = String(raw == null ? '' : raw).replace(/^﻿/, '').replace(/[​-‍⁠]/g, '').trim();
    const notes = [];
    if (!text) return { ok: false, value: null, notes, truncated: false, error: 'empty' };
    if (!options.array && /^\[/.test(text.replace(/^```[a-zA-Z0-9_-]*[ \t]*\r?\n?/, ''))) return { ok: false, value: null, notes, truncated: false, error: 'array_root' };
    if (/```/.test(text)) { text = text.replace(/```[a-zA-Z0-9_-]*[ \t]*\r?\n?/g, '').trim(); notes.push('fence'); }
    const accept = v => v && typeof v === 'object' && (options.array || !Array.isArray(v));
    const firstObj = text.indexOf('{'), firstArr = options.array ? text.indexOf('[') : -1;
    const start = firstArr !== -1 && (firstObj === -1 || firstArr < firstObj) ? firstArr : firstObj;
    if (start === -1) return { ok: false, value: null, notes, truncated: false, error: 'no_json' };
    if (start > 0) notes.push('preamble');
    // 1) plain JSON — the overwhelmingly common case — first from `start` to the last matching closer
    const lastClose = text.lastIndexOf(text[start] === '{' ? '}' : ']');
    if (lastClose > start) {
        try { const v = JSON.parse(text.slice(start, lastClose + 1)); if (accept(v)) return { ok: true, value: v, notes: lastClose < text.length - 1 ? notes.concat('epilogue') : notes, truncated: false }; } catch (e) { /* repair below */ }
    }
    // 2) formatting repair, string-aware
    const scanned = scanAiJson(text, start);
    for (const n of scanned.notes) notes.push(n);
    if (scanned.complete) {
        try { const v = JSON.parse(scanned.text); if (accept(v)) return { ok: true, value: v, notes, truncated: false }; } catch (e) { return { ok: false, value: null, notes, truncated: false, error: 'unparsable' }; }
    }
    // 3) cut off mid-reply: keep everything up to the last complete element
    if (!scanned.complete && scanned.salvage) {
        try { const v = JSON.parse(scanned.salvage); if (accept(v)) return { ok: true, value: v, notes: notes.concat('truncated_salvaged'), truncated: true }; } catch (e) { /* fall through */ }
    }
    return { ok: false, value: null, notes, truncated: !scanned.complete && !scanned.error, error: scanned.error || (scanned.complete ? 'unparsable' : 'truncated') };
}

// The parsed OBJECT, or null when nothing parseable (or not an object) can be recovered. Used by every
// caller that predates parseAiJson (Practice, conjugation lookup, tests).
function parseAiJsonObject(raw) {
    const r = parseAiJson(raw);
    return r.ok ? r.value : null;
}

// A lemma that is written in a different script from its own surface form is a
// translation or transliteration, not a lemma (Latin surface -> Cyrillic lemma, etc.).
// Only checked for space-delimited scripts, where romanisation is not a convention.
function lemmaScriptMatchesSurface(lemma, surface) {
    if (!GRAMMAR_SPACED_SCRIPT_RE.test(surface)) return true;
    const scriptOf = ch => /\p{Script=Latin}/u.test(ch) ? 'L' : /\p{Script=Cyrillic}/u.test(ch) ? 'C' : /\p{Script=Devanagari}/u.test(ch) ? 'D' : /\p{L}/u.test(ch) ? 'X' : '';
    const surfaceScripts = new Set(Array.from(surface).map(scriptOf).filter(Boolean));
    return Array.from(lemma).map(scriptOf).filter(Boolean).every(sc => surfaceScripts.has(sc));
}

function storedLanguage(key, fallback, codes = SUPPORTED_LANGUAGE_CODES) {
    const value = readStored(key);
    return codes.includes(value) ? value : fallback;
}
// Перший запуск (мови ще не збережено): мова меню — перша з мов системи (navigator.languages,
// за пріоритетом), що є серед підтримуваних; якщо жодної немає — англійська.
function systemUiLanguage() {
    try {
        const prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
        for (const tag of prefs) {
            const code = String(tag || '').toLowerCase().split(/[-_]/)[0];
            if (SUPPORTED_LANGUAGE_CODES.includes(code)) return code;
        }
    } catch (e) { /* navigator недоступний — типова мова */ }
    return 'en';
}
// Мова перекладу при першому запуску — мова системи, якщо це не мова, яку тут вивчають (англійська, французька): на
// російському телефоні переклад одразу російською, а не завжди українською. Інакше — українська, як і раніше.
function systemTargetLanguage() {
    try {
        const prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
        for (const tag of prefs) {
            const code = String(tag || '').toLowerCase().split(/[-_]/)[0];
            if (code === 'en' || code === 'fr') return 'uk';
            if (TARGET_LANGUAGE_CODES.includes(code)) return code;
        }
    } catch (e) {}
    return 'uk';
}
const state = {
    format: null, currentIndex: 0, totalPages: 0,
    // Масштаб PDF, розмір шрифту й режим "Вивчення" переживають перезапуск застосунку —
    // раніше кожен холодний старт (у т.ч. після повернення з фону, коли Android
    // вивантажив сторінку) скидав їх до типових значень.
    pdfScale: readStoredNumber('reader_pdf_scale', 1, 0.25, 4),
    pdfFit: ['width', 'page', 'free'].includes(readStored('reader_pdf_fit')) ? readStored('reader_pdf_fit') : 'width',
    fontSize: clampReaderFontSize(parseFloat(readStored('reader_font_size'))),
    epubZip: null, spine: [], txtLines: [],
    translateMode: readStored('reader_translate_mode') === '1', extractedTextForTTS: "", currentLangCode: 'en-US',
    // The voice list was removed from the menu (owner, 2026-10-18: «it does not work»): loadVoices picks the best voice of each
    // language on every start. Voices saved by the old list (some chosen by hand) would stay with no way to change them: forgotten.
    selectedVoiceURIByLang: (() => {
        try { localStorage.removeItem('reader_voices'); localStorage.removeItem('reader_voices_manual'); } catch (e) { /* storage unavailable */ }
        return Object.fromEntries(TARGET_LANGUAGE_CODES.map(code => [code, null]));
    })(),
    voiceChosenByUser: {},
    apiKey: readStored('reader_gemini_key') || '', groqKey: readStored('reader_groq_key') || '',
    openaiKey: readStored('reader_openai_key') || '',
    // Task routing: with 'auto' EVERY task goes to Groq first (own key or the site's), OpenAI / the active provider only as the backup (js/ai-client.js).
    aiRouting: readStored('reader_ai_routing') === 'off' ? 'off' : 'auto',
    activeAiProvider: (() => {
        const saved = readStored('reader_active_ai_provider');
        if (['openai', 'groq', 'gemini'].includes(saved)) return saved;
        // One-time migration preserves the old text-provider preference. Never
        // reselect based on keys once an explicit provider has been stored.
        const provider = readStored('reader_groq_key') ? 'groq' : 'gemini';
        writeStored('reader_active_ai_provider', provider);
        return provider;
    })(),
    translationCache: {}, lastAskContext: "",
    pageInChapter: 0, totalPagesInChapter: 1, bookKey: null, suppressNextClick: false,
    ttsQueue: [], ttsIndex: 0, ttsPaused: false, ttsGen: 0, pdfZoom: 1, lastTapPoint: null, expandLevel: 0, lastWordNode: null,
    targetLang: storedLanguage('reader_target_lang', systemTargetLanguage(), TARGET_LANGUAGE_CODES),
    uiLang: storedLanguage('reader_ui_lang', systemUiLanguage()),
    speakSide: readStored('reader_speak_side') || 'original',
    lastGrammarSentence: '', lastAskParagraph: '', docChapters: null,
    // One-shot: set only by a PDF drag that spans a bilingual page's two columns, consumed (and
    // cleared) by the very next handleWordOrSelection so it can never leak into a later tap — see
    // js/selection.js's pointerup handler and js/translation.js's ttAiBtn.onclick.
    lastGrammarSourceText: null,
    refinedKeys: new Set(),
    sourceLang: 'en-US', ctxSentence: '',
    ink: {}, inkMode: false, inkErase: false, inkColor: '#1a56db',
    // Continuous PDF viewer (js/pdf-continuous.js et al.): pdfDoc set by initPdf,
    // pdfPageMeta[n] caches {width,height} natural size once page n is measured,
    // pdfOutline/pdfPageLabels cached from getOutline()/getPageLabels().
    pdfDoc: null, pdfPageMeta: [], pdfOutline: null, pdfPageLabels: null,
    pdfPrintedPageLabels: null, pdfLabelToPhysical: null, pdfLabelsFullyScanned: false,
    measuredStep: 0, animTimer: null, dragRange: null, lookupToken: 0, selSpans: [], touchSelecting: false, speakingSide: null, speakingId: 0, speakPos: 0, speakBase: 0, speakResume: null,
    altVoices: readStored('reader_alt_voices') === '1'
};

const els = {
    upload: document.getElementById('file-upload'), container: document.getElementById('reader-container'), pages: document.getElementById('reader-pages'),
    toc: document.getElementById('toc-list'), progress: document.getElementById('progress-indicator'),
    tooltip: document.getElementById('word-tooltip'), ttOriginal: document.getElementById('tt-original'),
    ttReplayBtn: document.getElementById('tt-replay-btn'), ttExpandBtn: document.getElementById('tt-expand-btn'), ttTranslation: document.getElementById('tt-translation'),
    ttSpeakTranslation: document.getElementById('tt-speak-translation'),
    ttAiBtn: document.getElementById('tt-ai-btn'), ttAskBtn: document.getElementById('tt-ask-btn'),
    ttStructBtn: document.getElementById('tt-struct-btn'), ttStructHost: document.getElementById('tt-struct-host'),
    ttCloseBtn: document.getElementById('tt-close-btn'),
    mainArea: document.getElementById('main-area'), translateBtn: document.getElementById('btn-translate-mode'),
    sidebar: document.getElementById('sidebar'),
    ttsBtn: document.getElementById('btn-tts'), ttsStopBtn: document.getElementById('btn-tts-stop'), grammarPanel: document.getElementById('grammar-panel'),
    targetLang: document.getElementById('target-lang'), uiLang: document.getElementById('ui-lang'),
    askPanel: document.getElementById('ask-panel'), grammarTab: document.getElementById('grammar-tab'),
    askTab: document.getElementById('ask-tab'), grammarContent: document.getElementById('grammar-content'),
    askContent: document.getElementById('ask-content'), askInput: document.getElementById('ask-input'),
    askSendBtn: document.getElementById('ask-send-btn'), micBtn: document.getElementById('mic-btn'), micLang: document.getElementById('mic-lang'),
    footerHandle: document.getElementById('footer-handle'), menuHandle: document.getElementById('menu-handle'),
    ttsToggle: document.getElementById('tts-toggle'), ttsPrev: document.getElementById('tts-prev'), ttsNext: document.getElementById('tts-next'),
    altVoicesBtn: document.getElementById('btn-alt-voices')
};
els.pages.style.fontSize = `${state.fontSize}px`;

const toggleTocDesktopBtn = document.getElementById('toggle-toc-desktop');
const openToc = () => { els.sidebar.classList.toggle('collapsed'); };

if(toggleTocDesktopBtn) toggleTocDesktopBtn.onclick = openToc;

// TTS
let ttsSynth = window.speechSynthesis;
let voices = [];
// Евристика якості голосу — імена рушіїв відрізняються за платформою (Android/iOS/десктоп),
// тому перевіряємо кілька поширених маркерів "преміальних"/нейромереж голосів одразу.
const VOICE_QUALITY_RE = /neural|natural|enhanced|premium|wavenet|studio/i;
// Оцінка якості голосу: нейромережеві/серверні голоси звучать помітно краще за
// локальні синтетичні, тому localService === false дає найбільший бал.
// Явні ознаки НИЗЬКОЇ якості: старі формантні синтезатори, які звучать
// «по-роботизованому». Такий голос не має обиратись автоматично, навіть якщо
// він єдиний із правильною локаллю.
const VOICE_POOR_RE = /compact|eloquence|espeak|pico|festival|sapi\s?4|robot|classic|legacy/i;
// Найвища якість — нейромережеві голоси конкретних платформ.
// «network» — серверні голоси Google TTS на Android (ru-ru-x-dfc-network): помітно кращі за -local того ж рушія.
const VOICE_TOP_RE  = /neural|natural|wavenet|studio|journey|siri|premium|enhanced|network/i;
// Улюблена локаль для кожної мови: fr-FR звучить звичніше за fr-CA, en-US за en-IN.
const PREFERRED_LOCALE = { fr: ['fr-fr', 'fr-ca'], en: ['en-us', 'en-gb'], uk: ['uk-ua'], ru: ['ru-ru'], zh: ['zh-cn', 'zh-tw'], ko: ['ko-kr'], hi: ['hi-in'], ga: ['ga-ie'],
    de: ['de-de', 'de-at', 'de-ch'], es: ['es-es', 'es-mx', 'es-us'], it: ['it-it'], pt: ['pt-br', 'pt-pt'], nl: ['nl-nl', 'nl-be'], pl: ['pl-pl'] };
// Голос формально тієї ж мови, але читає НЕ ТАК: переклад китайською — спрощений путунхуа, а кантонський
// голос (zh-HK / yue) вимовляє ці ієрогліфи зовсім інакше. Такий голос — лише якщо іншого немає.
const VOICE_WRONG_VARIANT_RE = /^(zh-hk|zh-mo|yue)|cantonese|粤|粵/i;

function voiceQualityScore(v) {
    let s = 0;
    const name = v.name || '';
    // Android WebView інколи дає «zh_CN» — приводимо до «zh-cn».
    const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');

    if (VOICE_TOP_RE.test(name)) s += 8;          // нейромережевий
    else if (VOICE_QUALITY_RE.test(name)) s += 4; // просто «покращений»
    if (v.localService === false) s += 6;         // серверний — майже завжди найкращий
    if (/google/i.test(name)) s += 3;
    if (/microsoft/i.test(name)) s += 2;

    // Локаль: точний збіг з улюбленою — плюс, інший регіон тієї ж мови — менше.
    const base = lang.slice(0, 2);
    const pref = PREFERRED_LOCALE[base];
    if (pref) {
        const idx = pref.indexOf(lang);
        if (idx === 0) s += 4;
        else if (idx > 0) s += 2;
    }
    if (v.default) s += 1;                        // системний типовий — легкий плюс

    if (VOICE_POOR_RE.test(name)) s -= 10;        // старий синтезатор — у самий кінець
    if (VOICE_WRONG_VARIANT_RE.test(lang) || VOICE_WRONG_VARIANT_RE.test(name)) s -= 20;
    return s;
}

// Стать голосу Web Speech API не повідомляє — визначаємо за відомими іменами
// французьких голосів Android / iOS / Windows / macOS, з запасним варіантом по
// службових позначках у назві.
const FR_MALE_RE   = /\b(henri|thomas|paul|claude|nicolas|mathieu|jean|yves|guillaume|rémy|remy|alain|male|homme)\b/i;
const FR_FEMALE_RE = /\b(denise|amélie|amelie|aurélie|aurelie|audrey|marie|virginie|julie|céline|celine|hortense|chantal|charlotte|female|femme)\b/i;
function voiceGender(v) {
    if (FR_MALE_RE.test(v.name)) return 'male';
    if (FR_FEMALE_RE.test(v.name)) return 'female';
    return null;
}
// Дві найкращі АЛЬТЕРНАТИВНІ доріжки для читання: за можливості чоловічий + жіночий,
// інакше просто два різні найкращі голоси, щоб чергування все одно було чутним.
function pickVoicePair(langPrefix) {
    const pool = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix))
                       .sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
    if (!pool.length) return null;
    const male = pool.find(v => voiceGender(v) === 'male');
    const female = pool.find(v => voiceGender(v) === 'female');
    if (male && female) return [male, female];
    // Стать визначити не вдалось — беремо два найкращі різні голоси.
    const distinct = pool.filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);
    return distinct.length >= 2 ? [distinct[0], distinct[1]] : [distinct[0], distinct[0]];
}

function pickBestVoice(langPrefix, pool) {
    const candidates = pool.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
    if (!candidates.length) return null;
    candidates.sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
    return candidates[0];
}
function loadVoices() {
    if (!ttsSynth) return;
    voices = ttsSynth.getVoices();
    if (voices.length === 0) {
        if (!window.voicesRetryCount) window.voicesRetryCount = 0;
        if (window.voicesRetryCount < 10) {
            window.voicesRetryCount++;
            setTimeout(loadVoices, 200 * window.voicesRetryCount);
            return;
        }
        // Fallback: the system picks the voice by the utterance's language
        if (!window.voicesChangedListenerAdded) {
            window.voicesChangedListenerAdded = true;
            ttsSynth.addEventListener('voiceschanged', () => { window.voicesRetryCount = 0; loadVoices(); });
        }
        return;
    }
    window.voicesRetryCount = 0;
    // Автовибір найкращого голосу для кожної мови. Система часто підвантажує
    // якісні (серверні) голоси із запізненням, тому автовибір ПЕРЕГЛЯДАЄТЬСЯ, поки
    // користувач не зробив власний вибір: якщо з'явився кращий — беремо його.
    TARGET_LANGUAGE_CODES.forEach(code => {
        if (state.voiceChosenByUser[code]) return;      // ручний вибір не чіпаємо
        const best = pickBestVoice(code, voices);
        if (!best) return;
        const cur = voices.find(v => v.voiceURI === state.selectedVoiceURIByLang[code]);
        if (!cur || voiceQualityScore(best) > voiceQualityScore(cur)) {
            state.selectedVoiceURIByLang[code] = best.voiceURI;
        }
    });
}
// Виклик loadVoices() — у кінці lang-detect.js (див. коментар там).
// ========== МОВА ІНТЕРФЕЙСУ ==========
// Написи задаються атрибутами data-i18n / data-i18n-title / data-i18n-ph у розмітці,
// а тут лежать усі переклади. Динамічні написи (кнопки-перемикачі, індикатор
// сторінок, повідомлення) беруться через t().
const I18N = {
    toc:            { uk: '☰ Зміст',        en: '☰ Contents',     fr: '☰ Sommaire',     ru: '☰ Содержание' },
    open:           { uk: '📂 Відкрити книгу', en: '📂 Open book', fr: '📂 Ouvrir un livre', ru: '📂 Открыть книгу' },
    loading:        { uk: 'Завантаження...', en: 'Loading...',    fr: 'Chargement...',  ru: 'Загрузка...' },
    read:           { uk: '🔊 Читати вголос', en: '🔊 Read aloud', fr: '🔊 Lire à voix haute', ru: '🔊 Читать вслух' },
    pause:          { uk: '⏸ Пауза',        en: '⏸ Pause',        fr: '⏸ Pause',        ru: '⏸ Пауза' },
    resume:         { uk: '▶ Продовжити',   en: '▶ Resume',       fr: '▶ Reprendre',    ru: '▶ Продолжить' },
    altVoicesOn:    { uk: '👥 Два голоси: УВІМК', en: '👥 Two voices: ON',  fr: '👥 Deux voix : ON',  ru: '👥 Два голоса: ВКЛ' },
    altVoicesOff:   { uk: '👥 Два голоси: ВИМК', en: '👥 Two voices: OFF', fr: '👥 Deux voix : OFF', ru: '👥 Два голоса: ВЫКЛ' },
    learnOn:        { uk: '🔮 Вивчення слів: УВІМК', en: '🔮 Word study: ON', fr: '🔮 Étude des mots : ON', ru: '🔮 Изучение слов: ВКЛ' },
    learnOff:       { uk: '🔮 Вивчення слів: ВИМК', en: '🔮 Word study: OFF', fr: '🔮 Étude des mots : OFF', ru: '🔮 Изучение слов: ВЫКЛ' },
    themeLight:     { uk: 'Світла',         en: 'Light',          fr: 'Clair',          ru: 'Светлая' },
    themeSepia:     { uk: 'Сепія',          en: 'Sepia',          fr: 'Sépia',          ru: 'Сепия' },
    themeDark:      { uk: 'Темна',          en: 'Dark',           fr: 'Sombre',         ru: 'Тёмная' },
    aiKey:          { uk: '🔑 AI Ключ',     en: '🔑 AI Key',      fr: '🔑 Clé IA',      ru: '🔑 AI Ключ' },
    noBook:         { uk: 'Книгу не завантажено', en: 'No book loaded', fr: 'Aucun livre chargé', ru: 'Книга не загружена' },
    welcome:        { uk: 'Натисніть «Відкрити», щоб завантажити книгу (EPUB, PDF, DOCX, FB2, TXT, MD, HTML або RTF).',
                      en: 'Press "Open" to load a book (EPUB, PDF, DOCX, FB2, TXT, MD, HTML or RTF).',
                      fr: 'Appuyez sur « Ouvrir » pour charger un livre (EPUB, PDF, DOCX, FB2, TXT, MD, HTML ou RTF).',
                      ru: 'Нажмите «Открыть», чтобы загрузить книгу (EPUB, PDF, DOCX, FB2, TXT, MD, HTML или RTF).' },
    btnSentence:    { uk: 'речення ⤢',      en: 'sentence ⤢',     fr: 'phrase ⤢',       ru: 'предложение ⤢' },
    btnAsk:         { uk: '🤖 Запитай AI',  en: '🤖 Ask AI',      fr: "🤖 Demander à l'IA", ru: '🤖 Спросить AI' },
    btnGrammar:     { uk: '✨ Граматика',   en: '✨ Grammar',     fr: '✨ Grammaire',   ru: '✨ Грамматика' },
    practice:       { uk: '📚 Практика',    en: '📚 Practice',    fr: '📚 Pratique',    ru: '📚 Практика' },
    // The collapsed Practice tab's own short label (getPracticePanel's #practice-restore) -- distinct
    // from `practice` above (which carries the 📚 emoji for the in-panel button) so the tab stays a
    // plain word, and so it is never left as hard-coded English across a UI language change.
    practiceTabLabel: { uk: 'Практика',      en: 'Practice',       fr: 'Pratique',       ru: 'Практика' },
    translating:    { uk: 'Переклад...',    en: 'Translating...', fr: 'Traduction...',  ru: 'Перевод...' },
    panelAsk:       { uk: '🤖 Пояснення слова', en: '🤖 Word explanation', fr: '🤖 Explication du mot', ru: '🤖 Объяснение слова' },
    panelGrammar:   { uk: '📝 Граматика',   en: '📝 Grammar',     fr: '📝 Grammaire',   ru: '📝 Грамматика' },
    close:          { uk: '✕',               en: '✕',              fr: '✕',              ru: '✕' },
    tClose:         { uk: 'Закрити',         en: 'Close',          fr: 'Fermer',         ru: 'Закрыть' },
    cancel:         { uk: 'Скасувати',       en: 'Cancel',         fr: 'Annuler',        ru: 'Отмена' },
    askHint:        { uk: 'Тапніть слово й натисніть «Запитай AI» — значення, вживання та сталі сполучення.',
                      en: 'Tap a word and press "Ask AI" — meaning, usage and common collocations.',
                      fr: "Touchez un mot et appuyez sur « Demander à l'IA » — sens, usage et expressions courantes.",
                      ru: 'Нажмите на слово и выберите «Спросить AI» — значение, употребление и устойчивые сочетания.' },
    grammarHint:    { uk: 'Виділіть слово і натисніть «Граматика» для аналізу.',
                      en: 'Select a word and press "Grammar" to analyse it.',
                      fr: "Sélectionnez un mot et appuyez sur « Grammaire » pour l'analyser.",
                      ru: 'Выделите слово и нажмите «Грамматика» для анализа.' },
    prev:           { uk: '◀ Назад',        en: '◀ Back',         fr: '◀ Précédent',    ru: '◀ Назад' },
    next:           { uk: 'Вперед ▶',       en: 'Next ▶',         fr: 'Suivant ▶',      ru: 'Вперёд ▶' },
    waiting:        { uk: 'Очікування...',  en: 'Waiting...',     fr: 'En attente...',  ru: 'Ожидание...' },
    keyTitle:       { uk: '🔑 Ключ Google AI Studio (Gemini)', en: '🔑 Google AI Studio (Gemini) key', fr: '🔑 Clé Google AI Studio (Gemini)', ru: '🔑 Ключ Google AI Studio (Gemini)' },
    save:           { uk: 'Зберегти',       en: 'Save',           fr: 'Enregistrer',    ru: 'Сохранить' },
    ask:            { uk: 'Запитайте будь-що...', en: 'Ask anything...', fr: 'Demandez ce que vous voulez...', ru: 'Спросите что угодно...' },
    generating:     { uk: 'Генерація...',   en: 'Generating...',  fr: 'Génération...',  ru: 'Генерация...' },
    error:          { uk: 'Помилка',        en: 'Error',          fr: 'Erreur',         ru: 'Ошибка' },
    chapter:        { uk: 'Розділ',         en: 'Chapter',        fr: 'Chapitre',       ru: 'Глава' },
    block:          { uk: 'Блок',           en: 'Block',          fr: 'Bloc',           ru: 'Блок' },
    of:             { uk: 'із',             en: 'of',             fr: 'sur',            ru: 'из' },
    page:           { uk: 'стор.',          en: 'p.',             fr: 'p.',             ru: 'стр.' },
    // Підказки (title)
    tMenu:          { uk: 'Показати / сховати меню', en: 'Show / hide menu', fr: 'Afficher / masquer le menu', ru: 'Показать / скрыть меню' },
    tMainMenu:      { uk: 'Головне меню',   en: 'Main menu',      fr: 'Menu principal', ru: 'Главное меню' },
    tocIcon:        { uk: '☰', en: '☰', fr: '☰', ru: '☰' },
    pdfTabThumbs:   { uk: 'Ескізи',         en: 'Thumbnails',     fr: 'Miniatures',     ru: 'Эскизы' },
    pdfTabContents: { uk: 'Зміст',          en: 'Contents',       fr: 'Sommaire',       ru: 'Содержание' },
    tToc:           { uk: 'Зміст',          en: 'Contents',       fr: 'Sommaire',       ru: 'Содержание' },
    tBookContents:  { uk: 'Зміст та ескізи книги', en: 'Book contents and thumbnails', fr: "Sommaire et miniatures du livre", ru: 'Содержание и эскизы книги' },
    tAiKey:         { uk: 'Ключ AI (Gemini / Groq)', en: 'AI key (Gemini / Groq)', fr: 'Clé IA (Gemini / Groq)', ru: 'Ключ AI (Gemini / Groq)' },
    tExitApp:       { uk: 'Вийти із застосунку',    en: 'Exit app',        fr: "Quitter l'application", ru: 'Выйти из приложения' },
    tUpdateApp:     { uk: 'Оновити застосунок', en: 'Update the app', fr: "Mettre à jour l'application", ru: 'Обновить приложение' },
    updateLatest:   { uk: 'У вас остання версія.', en: 'You have the latest version.', fr: 'Vous avez la dernière version.', ru: 'У вас последняя версия.' },
    updateOffline:  { uk: 'Немає інтернету — оновити не вдалося.', en: 'No internet — could not update.', fr: 'Pas de connexion — mise à jour impossible.', ru: 'Нет интернета — обновить не удалось.' },
    exitChecking:   { uk: 'Перевіряю оновлення…', en: 'Checking for updates…', fr: 'Recherche de mises à jour…', ru: 'Проверяю обновления…' },
    exitUpdated:    { uk: 'Знайдено нову версію — перезапускаю вже оновлений застосунок.', en: 'New version found — restarting into the updated app.',
                      fr: "Nouvelle version trouvée — redémarrage dans l'application mise à jour.", ru: 'Найдена новая версия — перезапускаю обновлённое приложение.' },
    exitFallback:   { uk: 'Дані збережено. Застосунок можна закрити системною кнопкою або жестом.',
                      en: 'Data saved. You can close the app with the system button or gesture.',
                      fr: "Données enregistrées. Vous pouvez fermer l'application avec le bouton ou le geste système.",
                      ru: 'Данные сохранены. Приложение можно закрыть системной кнопкой или жестом.' },
    updateAvailable:{ uk: 'Доступна нова версія застосунку.', en: 'A new version of the app is available.',
                      fr: "Une nouvelle version de l'application est disponible.", ru: 'Доступна новая версия приложения.' },
    sentenceNeedsAi:     { uk: 'Речення перекладається лише через AI (потрібен контекст). Додайте AI-ключ у налаштуваннях.', en: 'Sentences are translated by AI only (context is needed). Add an AI key in settings.',
                      fr: "Les phrases ne sont traduites que par l'IA (le contexte est nécessaire). Ajoutez une clé IA dans les réglages.", ru: 'Предложения переводятся только через AI (нужен контекст). Добавьте AI-ключ в настройках.' },
    sentenceNeedsOnline: { uk: 'Для перекладу речення потрібен інтернет (AI).', en: 'Translating a sentence needs an internet connection (AI).',
                      fr: "La traduction d'une phrase nécessite Internet (IA).", ru: 'Для перевода предложения нужен интернет (AI).' },
    sentenceAiFailed:    { uk: 'AI не зміг перекласти речення. Спробуйте ще раз.', en: 'The AI could not translate the sentence. Try again.',
                      fr: "L'IA n'a pas pu traduire la phrase. Réessayez.", ru: 'AI не смог перевести предложение. Попробуйте ещё раз.' },
    updateReload:   { uk: 'Оновити', en: 'Update', fr: 'Mettre à jour', ru: 'Обновить' },
    archiveGuardFailed: { uk: 'Не вдалося перевірити безпеку файла. Спробуйте ще раз або перезавантажте сторінку.',
                      en: "Could not verify the file's safety. Try again or reload the page.",
                      fr: 'Impossible de vérifier la sécurité du fichier. Réessayez ou rechargez la page.',
                      ru: 'Не удалось проверить безопасность файла. Попробуйте снова или перезагрузите страницу.' },
    tAltVoices:     { uk: 'Чергувати два голоси під час читання', en: 'Alternate two voices while reading', fr: 'Alterner deux voix pendant la lecture', ru: 'Чередовать два голоса при чтении' },
    tStudyMode:     { uk: 'Режим вивчення: слова стають клікабельними', en: 'Study mode: words become tappable', fr: 'Mode étude : les mots deviennent cliquables', ru: 'Режим изучения: слова становятся кликабельными' },
    tZoomOut:       { uk: 'Зменшити текст',  en: 'Smaller text',   fr: 'Texte plus petit', ru: 'Уменьшить текст' },
    tZoomIn:        { uk: 'Збільшити текст', en: 'Larger text',    fr: 'Texte plus grand', ru: 'Увеличить текст' },
    tTheme:         { uk: 'Тема оформлення', en: 'Theme',          fr: 'Thème',          ru: 'Тема оформления' },
    tVoice:         { uk: 'Голос',          en: 'Voice',          fr: 'Voix',           ru: 'Голос' },
    tTargetLang:    { uk: 'Мова перекладу', en: 'Translation language', fr: 'Langue de traduction', ru: 'Язык перевода' },
    tUiLang:        { uk: 'Мова інтерфейсу', en: 'Interface language', fr: "Langue de l'interface", ru: 'Язык интерфейса' },
    tExpand:        { uk: 'Розширити: до кінця речення → усе речення → абзац', en: 'Expand: to end of sentence → whole sentence → paragraph', fr: "Étendre : jusqu'à la fin de la phrase → phrase entière → paragraphe", ru: 'Расширить: до конца предложения → всё предложение → абзац' },
    tSvo:           { uk: 'Показати підмет, присудок і додаток', en: 'Show subject, verb and object', fr: 'Afficher sujet, verbe et complément', ru: 'Показать подлежащее, сказуемое и дополнение' },
    tSpeakTr:       { uk: 'Озвучити переклад', en: 'Speak the translation', fr: 'Lire la traduction', ru: 'Озвучить перевод' },
    tSpeakOrig:     { uk: 'Озвучити оригінал', en: 'Speak the original', fr: "Lire l'original", ru: 'Озвучить оригинал' },
    tAskPanel:      { uk: 'AI Помічник',    en: 'AI assistant',   fr: 'Assistant IA',   ru: 'AI Помощник' },
    tGrammarPanel:  { uk: 'Граматика',      en: 'Grammar',        fr: 'Grammaire',      ru: 'Грамматика' },
    tPrevSent:      { uk: 'Попереднє речення', en: 'Previous sentence', fr: 'Phrase précédente', ru: 'Предыдущее предложение' },
    tPlayPause:     { uk: 'Пауза / продовжити', en: 'Pause / resume', fr: 'Pause / reprendre', ru: 'Пауза / продолжить' },
    tNextSent:      { uk: 'Наступне речення', en: 'Next sentence', fr: 'Phrase suivante', ru: 'Следующее предложение' },
    tFooter:        { uk: 'Розділ · сторінка · вперед/назад', en: 'Chapter · page · back/forward', fr: 'Chapitre · page · précédent/suivant', ru: 'Глава · страница · назад/вперёд' },
    tStop:          { uk: 'Зупинити читання', en: 'Stop reading', fr: 'Arrêter la lecture', ru: 'Остановить чтение' },
    // Повідомлення
    unsupportedFormat:{ uk: 'Формат не підтримується.', en: 'Format not supported.', fr: 'Format non pris en charge.', ru: 'Формат не поддерживается.' },
    fileTooLarge:   { uk: 'Файл завеликий (максимум 300 МБ). Спробуйте інший файл.',
                      en: 'File is too large (300 MB maximum). Try a different file.',
                      fr: 'Fichier trop volumineux (300 Mo maximum). Essayez un autre fichier.',
                      ru: 'Файл слишком большой (максимум 300 МБ). Попробуйте другой файл.' },
    emptyDoc:       { uk: 'У файлі не знайдено тексту.', en: 'No text found in the file.', fr: 'Aucun texte trouvé dans le fichier.', ru: 'В файле не найден текст.' },
    imageUnavailable: { uk: 'Зображення в документі не вдалося завантажити, а іншого тексту в ньому немає.', en: 'The image in this document could not be loaded, and it has no other text.', fr: "L'image de ce document n'a pas pu être chargée, et il ne contient pas d'autre texte.", ru: 'Не удалось загрузить изображение в документе, а другого текста в нём нет.' },
    pickVerb:       { uk: 'Спершу оберіть дієслово у розборі.', en: 'First pick a verb in the analysis.', fr: "Choisissez d'abord un verbe dans l'analyse.", ru: 'Сначала выберите глагол в разборе.' },
    btnInk:         { uk: '✏️ Писати',   en: '✏️ Write',       fr: '✏️ Écrire',     ru: '✏️ Писать' },
    done:           { uk: 'Готово',       en: 'Done',           fr: 'Terminé',        ru: 'Готово' },
    clearPageAsk:   { uk: 'Стерти все написане на цій сторінці?', en: 'Erase everything written on this page?', fr: 'Effacer tout ce qui est écrit sur cette page ?', ru: 'Стереть всё написанное на этой странице?' },
    btnRegion:      { uk: '✂️ Фрагмент',  en: '✂️ Region',      fr: '✂️ Zone',        ru: '✂️ Фрагмент' },
    regionHint:     { uk: 'Обведіть фрагмент PDF', en: 'Select a PDF region', fr: 'Sélectionnez une zone PDF', ru: 'Выделите фрагмент PDF' },
    regionPdfOnly:  { uk: 'Виділення області працює у форматі PDF.', en: 'Region capture works in PDF.', fr: 'La capture de zone fonctionne en PDF.', ru: 'Выделение области работает в формате PDF.' },
    regionFail:     { uk: 'Не вдалося вирізати цю ділянку.', en: 'Could not capture that area.', fr: 'Impossible de capturer cette zone.', ru: 'Не удалось вырезать этот участок.' },
    checking:       { uk: 'Перевіряю вправу…', en: 'Checking the exercise…', fr: "Vérification de l'exercice…", ru: 'Проверяю упражнение…' },
    btnExplain:     { uk: '📖 Пояснення',  en: '📖 Explain',     fr: '📖 Explication', ru: '📖 Пояснение' },
    btnTranslatePanel:{ uk: '🌐 Перекласти', en: '🌐 Translate',  fr: '🌐 Traduire',   ru: '🌐 Перевести' },
    btnLangLevel:   { uk: '📘 Мовний розбір', en: '📘 Language analysis', fr: '📘 Analyse linguistique', ru: '📘 Языковой разбор' },
    selectFirst:    { uk: 'Спершу тапніть слово або виділіть речення в тексті.',
                      en: 'First tap a word or select a sentence in the text.',
                      fr: "Touchez d'abord un mot ou sélectionnez une phrase dans le texte.",
                      ru: 'Сначала нажмите на слово или выделите предложение в тексте.' },
    keyFaster:      { uk: '(швидший)',      en: '(faster)',       fr: '(plus rapide)',  ru: '(быстрее)' },
    keyNote:        { uk: 'Якщо вказано ключ Groq, він використовується для всіх запитів AI — відповідь приходить помітно швидше. Інакше працює Gemini.',
                      en: 'When a Groq key is set it is used for all AI requests — responses arrive noticeably faster. Otherwise Gemini is used.',
                      fr: 'Si une clé Groq est renseignée, elle est utilisée pour toutes les requêtes IA — les réponses arrivent nettement plus vite. Sinon, Gemini est utilisé.',
                      ru: 'Если указан ключ Groq, он используется для всех запросов AI — ответ приходит заметно быстрее. Иначе работает Gemini.' },
    errKey400:      { uk: 'перевірте, чи правильно вставлено ключ.', en: 'check that the key is pasted correctly.', fr: 'vérifiez que la clé est correctement collée.', ru: 'проверьте, правильно ли вставлен ключ.' },
    errKey403:      { uk: 'ключ недійсний або немає доступу.', en: 'the key is invalid or access is denied.', fr: 'clé invalide ou accès refusé.', ru: 'ключ недействителен или нет доступа.' },
    errKey404:      { uk: 'модель не знайдена.', en: 'model not found.', fr: 'modèle introuvable.', ru: 'модель не найдена.' },
    errTooLarge:    { uk: 'Ділянка завелика або вичерпано ліміт запитів. Обведіть меншу область і спробуйте ще раз.',
                      en: 'The area is too large or the rate limit was hit. Select a smaller area and try again.',
                      fr: 'La zone est trop grande ou la limite de requêtes est atteinte. Sélectionnez une zone plus petite.',
                      ru: 'Область слишком большая или исчерпан лимит запросов. Обведите меньшую область и попробуйте снова.' },
    errKey429:      { uk: 'перевищено ліміт запитів, спробуйте пізніше.', en: 'rate limit exceeded, try again later.', fr: 'limite de requêtes dépassée, réessayez plus tard.', ru: 'превышен лимит запросов, попробуйте позже.' },
    errNoConnection:{ uk: 'Не вдалося з\'єднатися із сервером AI. Найчастіші причини: файл відкрито з диска (file://), немає інтернету, або запит блокує розширення браузера.',
                      en: 'Could not reach the AI server. Common causes: the file was opened from disk (file://), no internet, or a browser extension is blocking the request.',
                      fr: "Impossible de joindre le serveur IA. Causes fréquentes : fichier ouvert depuis le disque (file://), pas d'internet, ou une extension bloque la requête.",
                      ru: 'Не удалось соединиться с сервером AI. Частые причины: файл открыт с диска (file://), нет интернета, или запрос блокирует расширение браузера.' },
    needKey:        { uk: 'Введіть ключ AI у налаштуваннях!', en: 'Enter the AI key in settings!', fr: 'Saisissez la clé IA dans les réglages !', ru: 'Введите ключ AI в настройках!' },
    needKeySvo:     { uk: 'Для розбору речення потрібен ключ AI.', en: 'Sentence analysis needs the AI key.', fr: "L'analyse de la phrase nécessite la clé IA.", ru: 'Для разбора предложения нужен ключ AI.' },
    analysing:      { uk: 'Розбираю речення…', en: 'Analysing the sentence…', fr: 'Analyse de la phrase…', ru: 'Разбираю предложение…' },
    approx:         { uk: '(приблизно, без мережі)', en: '(approximate, offline)', fr: '(approximatif, hors ligne)', ru: '(приблизительно, офлайн)' },
    svoSubject:     { uk: 'підмет',         en: 'subject',        fr: 'sujet',          ru: 'подлежащее' },
    svoVerb:        { uk: 'присудок',       en: 'verb',           fr: 'verbe',          ru: 'сказуемое' },
    svoObject:      { uk: 'додаток (COD)',  en: 'object',         fr: 'COD',            ru: 'дополнение (COD)' },
    svoCoi:         { uk: 'непрямий додаток (COI)', en: 'indirect object', fr: 'COI',    ru: 'косвенное дополнение (COI)' },
    more:           { uk: 'ще',             en: 'more',           fr: 'aussi',          ru: 'ещё' },
    alreadyIn:      { uk: 'текст уже',      en: 'text is already in', fr: 'texte déjà en', ru: 'текст уже' },
    synthUnavailable: { uk: 'Озвучення недоступне', en: 'Speech Synthesis unavailable', fr: 'Synthèse vocale indisponible', ru: 'Синтез речи недоступен' },
    oneVoice:       { uk: 'На цьому пристрої лише один французький голос — чергування буде непомітним.',
                      en: 'This device has only one French voice — alternating will not be noticeable.',
                      fr: "Cet appareil n'a qu'une seule voix française — l'alternance sera imperceptible.",
                      ru: 'На этом устройстве только один французский голос — чередование будет незаметным.' },
    micDenied:      { uk: 'Доступ до мікрофона заборонено.', en: 'Microphone access denied.', fr: 'Accès au microphone refusé.', ru: 'Доступ к микрофону запрещён.' },
    micNoSpeech:    { uk: 'Мовлення не розпізнано, спробуйте ще раз.', en: 'No speech detected, try again.', fr: 'Aucune parole détectée, réessayez.', ru: 'Речь не распознана, попробуйте ещё раз.' },
    micNotFound:    { uk: 'Мікрофон не знайдено.', en: 'Microphone not found.', fr: 'Microphone introuvable.', ru: 'Микрофон не найден.' },
    dictationStart: { uk: 'Почати диктовку', en: 'Start dictation', fr: 'Démarrer la dictée', ru: 'Начать диктовку' },
    dictationStop: { uk: 'Зупинити диктовку', en: 'Stop dictation', fr: 'Arrêter la dictée', ru: 'Остановить диктовку' },
    dictationListening: { uk: 'Слухаю… Можна робити паузи. ■ — зупинити.', en: 'Listening… Pauses are fine. ■ to stop.', fr: "À l'écoute… Vous pouvez faire des pauses. ■ pour arrêter.", ru: 'Слушаю… Можно делать паузы. ■ — остановить.' },
    dictationStopped: { uk: 'Диктовку зупинено. Текст збережено в полі; натисніть 🎤, щоб продовжити.', en: 'Dictation stopped. Your text is still in the field; tap 🎤 to continue.', fr: 'Dictée arrêtée. Le texte reste dans le champ ; touchez 🎤 pour continuer.', ru: 'Диктовка остановлена. Текст остался в поле; нажмите 🎤 для продолжения.' },
    micNetwork:     { uk: 'Проблема з мережею під час розпізнавання.', en: 'Network problem during recognition.', fr: 'Problème réseau pendant la reconnaissance.', ru: 'Проблема с сетью при распознавании.' },
    noChapters:     { uk: 'Розділи не знайдено.', en: 'No chapters found.', fr: 'Aucun chapitre trouvé.', ru: 'Разделы не найдены.' },
    chapterMissing: { uk: 'Розділ не знайдено в архіві.', en: 'Chapter not found in the archive.', fr: "Chapitre introuvable dans l'archive.", ru: 'Раздел не найден в архиве.' },
    voicesFr:       { uk: 'Французька',     en: 'French',         fr: 'Français',       ru: 'Французский' },
    voicesEn:       { uk: 'Англійська',     en: 'English',        fr: 'Anglais',        ru: 'Английский' },
    voicesUk:       { uk: 'Українська',     en: 'Ukrainian',      fr: 'Ukrainien',      ru: 'Украинский' },
    voicesRu:       { uk: 'Російська',      en: 'Russian',        fr: 'Russe',           ru: 'Русский' },
    voicesZh:       { uk: 'Китайська (спрощена)', en: 'Chinese (Simplified)', fr: 'Chinois (simplifié)', ru: 'Китайский (упрощённый)' },
    voicesKo:       { uk: 'Корейська',       en: 'Korean',         fr: 'Coréen',          ru: 'Корейский' },
    voicesHi:       { uk: 'Гінді',           en: 'Hindi',          fr: 'Hindi',           ru: 'Хинди' },
    voicesDe:       { uk: 'Німецька',        en: 'German',         fr: 'Allemand',        ru: 'Немецкий' },
    voicesEs:       { uk: 'Іспанська',       en: 'Spanish',        fr: 'Espagnol',        ru: 'Испанский' },
    voicesGa:       { uk: 'Ірландська',      en: 'Irish',          fr: 'Irlandais',       ru: 'Ирландский' },
    statsTitle:     { uk: 'Допомога під час читання', en: 'Reading help', fr: 'Aide à la lecture', ru: 'Помощь при чтении' },
    statsReading:   { uk: 'Прочитано без допомоги', en: 'Read without help', fr: 'Lu sans aide', ru: 'Прочитано без помощи' },
    statsReadWithoutHelp: { uk: 'Прочитано без допомоги', en: 'Read without help', fr: 'Lu sans aide', ru: 'Прочитано без помощи' },
    statsHelpRequested: { uk: 'Запитано допомогу', en: 'Help requested', fr: 'Aide demandée', ru: 'Запрошена помощь' },
    statsPageWords: { uk: 'Слів на сторінці', en: 'Words on page', fr: 'Mots sur la page', ru: 'Слов на странице' },
    statsIndependentWords: { uk: 'Без допомоги', en: 'Without help', fr: 'Sans aide', ru: 'Без помощи' },
    statsUniqueTapped: { uk: 'Унікальних слів із запитом', en: 'Unique words tapped', fr: 'Mots uniques touchés', ru: 'Уникальных слов с запросом' },
    statsTappedVocabulary: { uk: 'Розуміння за рівнями', en: 'Understanding by level', fr: 'Compréhension par niveau', ru: 'Понимание по уровням' },
    statsWordsShort: { uk: 'сл.', en: 'w.', fr: 'm.', ru: 'сл.' },
    statsUnknown: { uk: 'Не класифіковано', en: 'Unclassified', fr: 'Non classé', ru: 'Не классифицировано' },
    statsUnknownShort: { uk: 'Інше', en: 'Other', fr: 'Autre', ru: 'Другое' },
    statsNoHelp: { uk: 'Ще немає запитів допомоги', en: 'No help requests yet', fr: "Aucune demande d'aide", ru: 'Запросов помощи пока нет' },
    // Practice Studio UI strings
    practiceSource:     { uk: 'Джерело:', en: 'Source:', fr: 'Source:', ru: 'Источник:' },
    practiceFocus:      { uk: 'Слова:', en: 'Words:', fr: 'Mots :', ru: 'Слова:' },
    practiceTopicLabel: { uk: 'Тема речень', en: 'Topic of the sentences', fr: 'Thème des phrases', ru: 'Тема предложений', zh: '句子主题', ko: '문장 주제', hi: 'वाक्यों का विषय', ga: 'Ábhar na n-abairtí' },
    practiceTopicPlaceholder: { uk: 'Своя тема…', en: 'Your topic…', fr: 'Votre thème…', ru: 'Своя тема…', zh: '自定主题…', ko: '내 주제…', hi: 'अपना विषय…', ga: 'Do théama…' },
    grammarLookupPlaceholder: { uk: 'Дієслово чи прикметник своєю мовою → {lang}', en: 'A verb or adjective in your language → {lang}', fr: 'Un verbe ou un adjectif dans votre langue → {lang}', ru: 'Глагол или прилагательное на своём языке → {lang}', zh: '用你的语言输入动词或形容词 → {lang}', ko: '내 언어로 동사나 형용사 → {lang}', hi: 'अपनी भाषा में क्रिया या विशेषण → {lang}', ga: 'Briathar nó aidiacht i do theanga féin → {lang}' },
    grammarLookupLabel: { uk: 'Знайти відмінювання свого слова', en: 'Find the forms of your own word', fr: 'Trouver les formes de votre mot', ru: 'Найти формы своего слова', zh: '查找自己输入的词的变化形式', ko: '내 단어의 활용형 찾기', hi: 'अपने शब्द के रूप खोजें', ga: 'Aimsigh foirmeacha d’fhocail féin' },
    grammarLookupBtn: { uk: 'Знайти', en: 'Find', fr: 'Chercher', ru: 'Найти', zh: '查找', ko: '찾기', hi: 'खोजें', ga: 'Aimsigh' },
    grammarLookupEmpty: { uk: 'Напишіть дієслово чи прикметник.', en: 'Type a verb or an adjective.', fr: 'Écrivez un verbe ou un adjectif.', ru: 'Напишите глагол или прилагательное.', zh: '请输入一个动词或形容词。', ko: '동사나 형용사를 입력하세요.', hi: 'कोई क्रिया या विशेषण लिखें।', ga: 'Scríobh briathar nó aidiacht.' },
    grammarLookupNotFound: { uk: 'Це не схоже на дієслово чи прикметник. Спробуйте інше слово.', en: 'That does not look like a verb or an adjective. Try another word.', fr: 'Cela ne ressemble pas à un verbe ni à un adjectif. Essayez un autre mot.', ru: 'Это не похоже на глагол или прилагательное. Попробуйте другое слово.', zh: '这看起来不是动词或形容词，请换一个词。', ko: '동사나 형용사가 아닌 것 같습니다. 다른 단어를 입력해 보세요.', hi: 'यह क्रिया या विशेषण नहीं लगता। कोई दूसरा शब्द आज़माएँ।', ga: 'Ní cosúil gur briathar ná aidiacht é sin. Bain triail as focal eile.' },
    grammarLookupAlso: { uk: 'Також: ', en: 'Also: ', fr: 'Aussi : ', ru: 'Также: ', zh: '另见：', ko: '다른 단어: ', hi: 'और भी: ', ga: 'Freisin: ' },
    grammarAbout: { uk: 'Про слово', en: 'About the word', fr: 'À propos du mot', ru: 'О слове', zh: '关于该词', ko: '단어 설명', hi: 'शब्द के बारे में', ga: 'Faoin bhfocal' },
    practiceTopicMeta: { uk: 'Тема:', en: 'Topic:', fr: 'Thème :', ru: 'Тема:', zh: '主题：', ko: '주제:', hi: 'विषय:', ga: 'Ábhar:' },
    practiceRegenerate: { uk: 'Регенерувати', en: 'Regenerate', fr: 'Régénérer', ru: 'Перегенерировать' },
    // Sentence-level learning actions in Practice (js/practice-worksheet.js buildPracticeSentenceRow):
    // small, secondary [listen]/[translate] buttons on every generated sentence/paragraph.
    practiceSpeakSentence:     { uk: 'Прослухати речення', en: 'Listen to sentence', fr: 'Écouter la phrase', ru: 'Прослушать предложение' },
    practiceTranslateSentence: { uk: 'Перекласти речення', en: 'Translate sentence', fr: 'Traduire la phrase', ru: 'Перевести предложение' },
    practiceError:      { uk: 'Помилка практики', en: 'Practice Error', fr: 'Erreur de pratique', ru: 'Ошибка практики' },
    practiceUnknownError: { uk: 'Невідома помилка', en: 'Unknown error', fr: 'Erreur inconnue', ru: 'Неизвестная ошибка' },
    // Shown (once per failure episode) when Practice could not be written to storage -- js/practice-session.js.
    practiceSaveFailed: { uk: 'Практику не вдалося зберегти на пристрої — після перезавантаження її буде втрачено. Звільніть місце й повторіть.', en: 'Practice could not be saved on this device — it will be lost on reload. Free up space and retry.', fr: 'La pratique n’a pas pu être enregistrée sur cet appareil — elle sera perdue au rechargement. Libérez de l’espace et réessayez.', ru: 'Практику не удалось сохранить на устройстве — после перезагрузки она будет потеряна. Освободите место и повторите.' },
    practiceSaveRetry:  { uk: 'Зберегти ще раз', en: 'Retry save', fr: 'Réessayer l’enregistrement', ru: 'Сохранить ещё раз' },
    hint:               { uk: 'Підказка', en: 'Hint', fr: 'Indice', ru: 'Подсказка' },
    // Redesigned Grammar/Practice UI strings (contextual Verbs/Adjectives panel + reading Practice).
    grammarEmptyVerbs:      { uk: 'У цьому фрагменті дієслів не знайдено.', en: 'No verbs found in this selection.', fr: 'Aucun verbe trouvé dans cette sélection.', ru: 'В этом фрагменте глаголов не найдено.' },
    grammarEmptyAdjectives: { uk: 'У цьому фрагменті прикметників не знайдено.', en: 'No adjectives found in this selection.', fr: 'Aucun adjectif trouvé dans cette sélection.', ru: 'В этом фрагменте прилагательных не найдено.' },
    // Main-menu group captions and field labels.
    grpBook: { uk: 'Книга', en: 'Book', fr: 'Livre', ru: 'Книга' },
    grpSpeech: { uk: 'Озвучення', en: 'Read aloud', fr: 'Lecture à voix haute', ru: 'Озвучка' },
    grpStudy: { uk: 'Вивчення та переклад', en: 'Study & translation', fr: 'Étude et traduction', ru: 'Изучение и перевод' },
    grpView: { uk: 'Налаштування', en: 'Settings', fr: 'Réglages', ru: 'Настройки' },
    grpText: { uk: 'Текст і нотатки', en: 'Text & notes', fr: 'Texte et notes', ru: 'Текст и заметки' },
    lblVoice: { uk: 'Голос', en: 'Voice', fr: 'Voix', ru: 'Голос' },
    lblTranslateTo: { uk: 'Переклад на', en: 'Translate to', fr: 'Traduire en', ru: 'Перевод на' },
    lblUiLang: { uk: 'Мова меню', en: 'Menu language', fr: 'Langue du menu', ru: 'Язык меню' },
    lblInk: { uk: 'Писати', en: 'Write', fr: 'Écrire', ru: 'Писать' },
    lblRegion: { uk: 'Фрагмент', en: 'Region', fr: 'Zone', ru: 'Фрагмент' },
    lblAiKey: { uk: 'AI-ключ', en: 'AI key', fr: 'Clé AI', ru: 'AI-ключ' },
    // Grammar rules panel (js/grammar-rules.js).
    btnRules: { uk: '📚 Правила', en: '📚 Rules', fr: '📚 Règles', ru: '📚 Правила' },
    tRules: { uk: 'Правила граматики: знайти їх у тексті сторінки', en: 'Grammar rules: find them in the page text', fr: 'Règles de grammaire : les repérer dans le texte de la page', ru: 'Правила грамматики: найти их в тексте страницы' },
    panelRules: { uk: '📚 Правила граматики', en: '📚 Grammar rules', fr: '📚 Règles de grammaire', ru: '📚 Правила грамматики' },
    rulesLangLabel: { uk: 'Мова правил', en: 'Rules language', fr: 'Langue des règles', ru: 'Язык правил' },
    rulesSearchPlaceholder: { uk: 'Пошук теми…', en: 'Search topics…', fr: 'Chercher un thème…', ru: 'Поиск темы…' },
    rulesScan: { uk: 'Пошук у виділеному', en: 'Search the selection', fr: 'Chercher dans la sélection', ru: 'Поиск в выделенном', zh: '在所选内容中查找', ko: '선택한 부분에서 찾기', hi: 'चयन में खोजें', ga: 'Cuardaigh an roghnú' },
    rulesScanFound: { uk: 'Знайдено розділів: {n} — оберіть розділ, щоб підсвітити приклади', en: 'Topics found: {n} — pick one to highlight its examples', fr: 'Thèmes trouvés : {n} — choisissez-en un pour surligner ses exemples', ru: 'Найдено разделов: {n} — выберите раздел, чтобы подсветить примеры', zh: '找到的主题：{n} — 选择一个以高亮其例句', ko: '찾은 주제: {n} — 하나를 선택하면 예문이 강조됩니다', hi: 'मिले विषय: {n} — उदाहरण हाइलाइट करने के लिए एक चुनें', ga: 'Topaicí aimsithe: {n} — roghnaigh ceann chun a samplaí a aibhsiú' },
    rulesScanNone: { uk: 'У виділеному прикладів правил не знайдено', en: 'No rule examples in the selection', fr: 'Aucun exemple de règle dans la sélection', ru: 'В выделенном примеров правил не найдено', zh: '所选内容中没有规则例句', ko: '선택한 부분에 규칙 예문이 없습니다', hi: 'चयन में नियमों के उदाहरण नहीं मिले', ga: 'Níl sampla riail sa roghnú' },
    rulesScanHint: { uk: "Виділіть одне-два речення в книзі й відкрийте Правила — тут з'являться всі правила з них", en: 'Select a sentence or two in the book and open Rules -- every rule they contain shows up here', fr: 'Sélectionnez une ou deux phrases du livre puis ouvrez les Règles : toutes leurs règles apparaissent ici', ru: 'Выделите одно-два предложения в книге и откройте Правила — здесь появятся все правила из них', zh: '在书中选中一两句话再打开“规则”，其中的所有规则都会显示在这里', ko: '책에서 한두 문장을 선택하고 규칙을 열면 그 안의 모든 규칙이 여기에 표시됩니다', hi: 'किताब में एक-दो वाक्य चुनें और नियम खोलें — उनमें आए सभी नियम यहाँ दिखेंगे', ga: 'Roghnaigh abairt nó dhó sa leabhar agus oscail na Rialacha -- taispeántar gach riail atá iontu anseo' },
    rulesCatalogueSoon: { uk: 'Каталог цієї мови з’явиться в наступному оновленні.', en: 'The catalogue for this language is coming in the next update.', fr: 'Le catalogue de cette langue arrive dans la prochaine mise à jour.', ru: 'Каталог этого языка появится в следующем обновлении.' },
    rulesNoTopics: { uk: 'Нічого не знайдено.', en: 'Nothing found.', fr: 'Aucun résultat.', ru: 'Ничего не найдено.' },
    rulesBack: { uk: 'До розділів', en: 'All topics', fr: 'Tous les thèmes', ru: 'К разделам' },
    rulesTheory: { uk: 'Теорія', en: 'Theory', fr: 'Théorie', ru: 'Теория' },
    rulesFind: { uk: 'Знайти на сторінці', en: 'Find on this page', fr: 'Chercher sur la page', ru: 'Найти на странице' },
    rulesClear: { uk: 'Прибрати підсвітку', en: 'Clear highlights', fr: 'Effacer le surlignage', ru: 'Убрать подсветку' },
    rulesRunning: { uk: 'Шукаю в тексті сторінки…', en: 'Searching the page text…', fr: 'Recherche dans le texte de la page…', ru: 'Ищу в тексте страницы…' },
    rulesFound: { uk: 'Знайдено на сторінці: {n}', en: 'Found on this page: {n}', fr: 'Trouvé sur la page : {n}', ru: 'Найдено на странице: {n}' },
    rulesNone: { uk: 'На видимій частині сторінки такого немає.', en: 'Nothing of this kind in the visible part of the page.', fr: 'Rien de tel dans la partie visible de la page.', ru: 'В видимой части страницы такого нет.' },
    rulesFailed: { uk: 'Не вдалося. Спробуйте ще раз.', en: 'Something went wrong. Try again.', fr: 'Échec. Réessayez.', ru: 'Не получилось. Попробуйте ещё раз.' },
    rulesNoText: { uk: 'На екрані немає тексту для пошуку.', en: 'There is no text on screen to search.', fr: 'Aucun texte à l’écran à analyser.', ru: 'На экране нет текста для поиска.' },
    rulesChanged: { uk: 'Сторінка змінилась — повторіть пошук.', en: 'The page changed — search again.', fr: 'La page a changé — relancez la recherche.', ru: 'Страница изменилась — повторите поиск.' },
    rulesExplain: { uk: 'Розібрати за теорією', en: 'Explain using the theory', fr: 'Expliquer d’après la théorie', ru: 'Разобрать по теории' },
    rulesAskPlaceholder: { uk: 'Запитати AI про це…', en: 'Ask AI about this…', fr: 'Poser une question à l’IA…', ru: 'Спросить AI об этом…' },
    rulesAskBtn: { uk: 'Запитати', en: 'Ask', fr: 'Demander', ru: 'Спросить' },
    // Sentence breakdown painted in the text (js/sentence-structure.js).
    needKeyStruct:  { uk: 'Для розбору речення потрібен ключ AI.', en: 'Sentence analysis needs the AI key.', fr: "L'analyse de la phrase nécessite la clé AI.", ru: 'Для разбора предложения нужен ключ AI.' },
    structTooLong:  { uk: 'Виберіть коротше речення для розбору (до 400 символів).', en: 'Select a shorter sentence to break down (up to 400 characters).', fr: 'Sélectionnez une phrase plus courte (400 caractères max).', ru: 'Выберите предложение покороче (до 400 символов).' },
    structUnsupported: { uk: 'Розбір поки недоступний для цієї мови.', en: 'Breakdown is not available for this language yet.', fr: "L'analyse n'est pas encore disponible pour cette langue.", ru: 'Разбор пока недоступен для этого языка.' },
    structDeepHint: { uk: 'Натисніть частину для глибокого розбору', en: 'Tap a part for a deeper breakdown', fr: 'Touchez une partie pour une analyse plus poussée', ru: 'Нажмите на часть для глубокого разбора' },
    structDeepTitle: { uk: 'Глибокий розбір', en: 'Deep breakdown', fr: 'Analyse approfondie', ru: 'Глубокий разбор' },
    structFailed: { uk: 'Не вдалося розібрати речення. Спробуйте ще раз.', en: 'Could not analyse this sentence. Try again.', fr: 'Impossible d’analyser cette phrase. Réessayez.', ru: 'Не удалось разобрать предложение. Попробуйте ещё раз.' },
    structRole_subject: { uk: 'Підмет', en: 'Subject', fr: 'Sujet', ru: 'Подлежащее' },
    structRole_verb: { uk: 'Присудок', en: 'Verb', fr: 'Verbe', ru: 'Сказуемое' },
    structRole_object: { uk: 'Додаток', en: 'Object', fr: 'Complément d’objet', ru: 'Дополнение' },
    structRole_indirect: { uk: 'Непрямий додаток', en: 'Indirect object', fr: 'Objet indirect', ru: 'Косвенное дополнение' },
    structRole_complement: { uk: 'Означення / іменна частина', en: 'Complement', fr: 'Attribut', ru: 'Определение / именная часть' },
    structRole_time: { uk: 'Час', en: 'Time', fr: 'Temps', ru: 'Время' },
    structRole_place: { uk: 'Місце', en: 'Place', fr: 'Lieu', ru: 'Место' },
    structRole_manner: { uk: 'Спосіб', en: 'Manner', fr: 'Manière', ru: 'Образ действия' },
    structRole_reason: { uk: 'Причина / мета', en: 'Reason / purpose', fr: 'Cause / but', ru: 'Причина / цель' },
    structRole_connector: { uk: 'Сполучник', en: 'Connector', fr: 'Connecteur', ru: 'Союз' },
    structKind_past: { uk: 'минуле', en: 'past', fr: 'passé', ru: 'прошлое' },
    structKind_present: { uk: 'теперішнє', en: 'present', fr: 'présent', ru: 'настоящее' },
    structKind_future: { uk: 'майбутнє', en: 'future', fr: 'futur', ru: 'будущее' },
    structKind_duration: { uk: 'тривалість', en: 'duration', fr: 'durée', ru: 'длительность' },
    structKind_frequency: { uk: 'частота', en: 'frequency', fr: 'fréquence', ru: 'частота' },
    structKind_sequence: { uk: 'послідовність', en: 'sequence', fr: 'succession', ru: 'последовательность' },
    structSub_noun: { uk: 'іменник', en: 'noun', fr: 'nom', ru: 'существительное' },
    structSub_pronoun: { uk: 'займенник', en: 'pronoun', fr: 'pronom', ru: 'местоимение' },
    structSub_determiner: { uk: 'артикль / означник', en: 'determiner', fr: 'déterminant', ru: 'артикль / определитель' },
    structSub_adjective: { uk: 'прикметник', en: 'adjective', fr: 'adjectif', ru: 'прилагательное' },
    structSub_verb: { uk: 'дієслово', en: 'verb', fr: 'verbe', ru: 'глагол' },
    structSub_auxiliary: { uk: 'допоміжне дієслово', en: 'auxiliary', fr: 'auxiliaire', ru: 'вспомогательный глагол' },
    structSub_adverb: { uk: 'прислівник', en: 'adverb', fr: 'adverbe', ru: 'наречие' },
    structSub_preposition: { uk: 'прийменник', en: 'preposition', fr: 'préposition', ru: 'предлог' },
    structSub_conjunction: { uk: 'сполучник', en: 'conjunction', fr: 'conjonction', ru: 'союз' },
    structSub_negation: { uk: 'заперечення', en: 'negation', fr: 'négation', ru: 'отрицание' },
    structSub_other: { uk: 'інше', en: 'other', fr: 'autre', ru: 'другое' },
    btnStruct:      { uk: '🧩 Розбір', en: '🧩 Parts', fr: '🧩 Analyse', ru: '🧩 Разбор' },
    tStruct:        { uk: 'Розбір речення: частини речення кольорами в тексті', en: 'Sentence breakdown: colour the parts in the text', fr: 'Analyse de la phrase : parties en couleur dans le texte', ru: 'Разбор предложения: части цветом в тексте' },
    // AI task routing (settings).
    aiRoutingLabel: { uk: 'Спершу Groq (швидко); якщо не відповів — OpenAI', en: 'Groq first (fast); OpenAI only if Groq does not answer', fr: 'Groq d’abord (rapide) ; OpenAI seulement si Groq ne répond pas', ru: 'Сначала Groq (быстро); если не ответил — OpenAI' },
    aiRoutingHint: { uk: 'Усі запити спершу йдуть у Groq; OpenAI — лише запасний, коли Groq не відповів. Працює для збережених ключів (або ключа сайту). Вимкніть, щоб усе йшло через один «Активний AI».', en: 'Every request goes to Groq first; OpenAI is only the backup when Groq does not answer. Uses the saved keys (or the site key). Turn off to send everything through the single active AI.', fr: 'Chaque requête va d’abord à Groq ; OpenAI n’est qu’un secours quand Groq ne répond pas. Utilise les clés enregistrées (ou la clé du site). Désactivez pour tout envoyer à l’IA active.', ru: 'Все запросы сначала идут в Groq; OpenAI — только запасной, когда Groq не ответил. Работает с сохранёнными ключами (или ключом сайта). Выключите, чтобы всё шло через один «Активный AI».' },
    // Rules panel: hide / readiness pill / exceptions.
    rulesHide: { uk: 'Сховати вікно (підсвітка лишається)', en: 'Hide window (highlights stay)', fr: 'Masquer la fenêtre (le surlignage reste)', ru: 'Скрыть окно (подсветка остаётся)' },
    rulesBgStarted: { uk: 'Шукаю правила у виділеному… Коли кнопка «Правила» стане зеленою — натисніть її ще раз.', en: 'Searching the selection for rules… When the Rules button turns green, tap it again.',
                      fr: 'Recherche des règles dans la sélection… Quand le bouton Règles devient vert, touchez-le à nouveau.', ru: 'Ищу правила в выделенном… Когда кнопка «Правила» станет зелёной, нажмите её ещё раз.' },
    rulesBgWait:    { uk: 'Ще шукаю правила — зачекайте, поки кнопка стане зеленою.', en: 'Still searching — wait until the Rules button turns green.',
                      fr: 'Recherche en cours — attendez que le bouton devienne vert.', ru: 'Ещё ищу — подождите, пока кнопка станет зелёной.' },
    rulesPillRunning: { uk: 'Шукаю…', en: 'Searching…', fr: 'Recherche…', ru: 'Ищу…' },
    rulesPillReady: { uk: 'Знайдено: {n}', en: 'Found: {n}', fr: 'Trouvé : {n}', ru: 'Найдено: {n}' },
    rulesPillFailed: { uk: 'Не вдалося', en: 'Failed', fr: 'Échec', ru: 'Не получилось' },
    rulesDetails: { uk: 'Докладно: правила та винятки', en: 'In detail: rules and exceptions', fr: 'En détail : règles et exceptions', ru: 'Подробно: правила и исключения' },
    rulesException: { uk: 'Виняток', en: 'Exception', fr: 'Exception', ru: 'Исключение' },
    rulesExceptionsCount: { uk: 'винятків: {n}', en: 'exceptions: {n}', fr: 'exceptions : {n}', ru: 'исключений: {n}' },
    wheelRules: { uk: 'Правила', en: 'Rules', fr: 'Règles', ru: 'Правила' },
    grammarWhy:              { uk: 'Чому', en: 'Why', fr: 'Pourquoi', ru: 'Почему' },
    grammarAgreesWith:       { uk: 'Узгоджується з', en: 'Agrees with', fr: 'Accord avec', ru: 'Согласуется с' },
    grammarNoParadigm:       { uk: 'таблиця форм недоступна', en: 'no form table available', fr: 'tableau de formes indisponible', ru: 'таблица форм недоступна' },
    grammarUnsupportedLanguage: { uk: 'Граматичний розбір для цієї мови ще не підтримується.', en: 'Grammar analysis is not supported for this language yet.', fr: "L'analyse grammaticale n'est pas encore disponible pour cette langue.", ru: 'Грамматический разбор для этого языка пока не поддерживается.' },
    aiTruncated:            { uk: 'Відповідь AI обірвалась через обмеження довжини. Виділіть менше тексту й спробуйте ще раз.', en: 'The AI reply was cut off. Select less text and try again.', fr: 'La réponse IA a été coupée. Sélectionnez moins de texte et réessayez.', ru: 'Ответ AI оборвался из-за ограничения длины. Выделите меньше текста и повторите.' },
    grammarPartial:         { uk: 'Неповний розбір: відповідь AI обірвалась. Виділіть менше тексту для повного розбору.', en: 'Partial analysis: the AI reply was cut off. Select less text for a complete analysis.', fr: 'Analyse partielle : la réponse IA a été coupée. Sélectionnez moins de texte pour une analyse complète.', ru: 'Неполный разбор: ответ AI оборвался. Выделите меньше текста для полного разбора.' },
    grammarTrimmed:         { uk: 'Проаналізовано перші {n} із {m} речень виділення.', en: 'Analysed the first {n} of {m} sentences of the selection.', fr: 'Les {n} premières phrases sur {m} de la sélection ont été analysées.', ru: 'Проанализированы первые {n} из {m} предложений выделения.' },
    grammarBudgetLimited:   { uk: 'Показано перші {n} із {m} знайдених форм у цьому виділенні.', en: 'Showing the first {n} of {m} forms found in this selection.', fr: 'Affichage des {n} premières formes sur {m} trouvées dans cette sélection.', ru: 'Показаны первые {n} из {m} найденных форм в этом выделении.' },
    grammarNoUsableForms:   { uk: 'Відповідь AI не містила придатних форм. Спробуйте ще раз.', en: 'The AI reply contained no usable forms. Please try again.', fr: 'La réponse IA ne contenait aucune forme exploitable. Réessayez.', ru: 'Ответ AI не содержал пригодных форм. Попробуйте ещё раз.' },
    retry:                   { uk: 'Повторити', en: 'Retry', fr: 'Réessayer', ru: 'Повторить' },
};

// Additional interface locales extend the existing dictionary. Keys not yet
// given a locale-specific diagnostic safely fall back to English, never to a
// misleading or broken placeholder.
const I18N_EXTRA = {
    zh: {
        toc:'☰ 目录',open:'📂 打开',loading:'加载中…',read:'🔊 朗读',pause:'⏸ 暂停',resume:'▶ 继续',altVoicesOn:'👥 双语音：开',altVoicesOff:'👥 双语音：关',learnOn:'🔮 学习：开',learnOff:'🔮 学习：关',themeLight:'浅色',themeSepia:'棕褐色',themeDark:'深色',aiKey:'🔑 AI 密钥',noBook:'尚未加载图书',welcome:'点击"打开"加载图书（EPUB、PDF、DOCX、FB2、TXT、MD、HTML 或 RTF）。',btnSentence:'句子 ⤢',btnAsk:'🤖 询问 AI',btnGrammar:'✨ 语法',translating:'翻译中…',panelAsk:'🤖 词语解释',panelGrammar:'📝 语法',tClose:'关闭',cancel:'取消',askHint:'点击词语并选择"询问 AI"，查看含义、用法和常见搭配。',grammarHint:'选择词语并点击"语法"进行分析。',prev:'◀ 上一页',next:'下一页 ▶',waiting:'等待中…',keyTitle:'🔑 Google AI Studio (Gemini) 密钥',save:'保存',ask:'输入问题…',generating:'生成中…',error:'错误',chapter:'章节',block:'段落',of:'共',page:'页',tMenu:'显示/隐藏菜单',tToc:'目录',tAiKey:'AI 密钥（Gemini / Groq）',tExitApp:'退出应用',exitFallback:'数据已保存。你可以使用系统按钮或手势关闭应用。',updateAvailable:'有新版本可用。',updateReload:'更新',archiveGuardFailed:'无法验证文件安全性。请重试或重新加载页面。',tAltVoices:'朗读时交替使用两个语音',tStudyMode:'学习模式：可点击词语',tZoomOut:'缩小文字',tZoomIn:'放大文字',tTheme:'主题',tVoice:'语音',tTargetLang:'翻译语言',tUiLang:'界面语言',tExpand:'扩展：句末 → 整句 → 段落',tSvo:'显示主语、谓语和宾语',tSpeakTr:'朗读翻译',tSpeakOrig:'朗读原文',tAskPanel:'AI 助手',tGrammarPanel:'语法',tPrevSent:'上一句',tPlayPause:'暂停/继续',tNextSent:'下一句',tFooter:'章节 · 页面 · 前后翻页',tStop:'停止朗读',unsupportedFormat:'不支持此格式。',fileTooLarge:'文件过大（最大 300 MB）。',emptyDoc:'文件中未找到文本。',pickVerb:'请先在分析中选择动词。',btnInk:'✏️ 书写',done:'完成',clearPageAsk:'清除此页上的全部书写内容？',btnRegion:'✂️ 区域',regionHint:'选择 PDF 区域',regionPdfOnly:'区域截取仅适用于 PDF。',regionFail:'无法截取该区域。',checking:'正在检查练习…',btnExplain:'📖 解释',btnTranslatePanel:'🌐 翻译',btnLangLevel:'📘 语言分析',selectFirst:'请先点击词语或选择文本中的句子。',keyFaster:'（更快）',needKey:'请在设置中输入 AI 密钥！',needKeySvo:'句子分析需要 AI 密钥。',analysing:'正在分析句子…',approx:'（离线近似）',svoSubject:'主语',svoVerb:'谓语',svoObject:'宾语',svoCoi:'间接宾语',more:'更多',alreadyIn:'文本已经是',oneVoice:'此设备只有一个法语语音，交替效果可能不明显。',micDenied:'麦克风访问被拒绝。',micNoSpeech:'未检测到语音，请重试。',micNotFound:'未找到麦克风。',dictationStart:'开始听写',dictationStop:'停止听写',dictationListening:'正在聆听… 可以暂停。■ 停止。',dictationStopped:'听写已停止。文字仍保留在输入框中。',micNetwork:'语音识别时出现网络问题。',noChapters:'未找到章节。',chapterMissing:'归档中未找到章节。',voicesFr:'法语',voicesEn:'英语',voicesUk:'乌克兰语',voicesRu:'俄语',voicesZh:'中文（简体）',voicesKo:'韩语',voicesHi:'印地语',voicesGa:'爱尔兰语',statsTitle:'阅读理解',statsReading:'无需帮助阅读',statsReadWithoutHelp:'无需帮助阅读',statsHelpRequested:'请求帮助',statsPageWords:'本页词数',statsIndependentWords:'无需帮助',statsUniqueTapped:'点击的唯一词语',statsTappedVocabulary:'按级别理解',statsWordsShort:'词',statsUnknown:'未分类',statsUnknownShort:'其他',statsNoHelp:'尚未请求帮助'
    },
    ko: {
        toc:'☰ 목차',open:'📂 열기',loading:'불러오는 중…',read:'🔊 읽기',pause:'⏸ 일시정지',resume:'▶ 계속',altVoicesOn:'👥 두 음성: 켬',altVoicesOff:'👥 두 음성: 끔',learnOn:'🔮 학습: 켬',learnOff:'🔮 학습: 끔',themeLight:'밝게',themeSepia:'세피아',themeDark:'어둡게',aiKey:'🔑 AI 키',noBook:'책을 불러오지 않았습니다',welcome:'"열기"를 눌러 책(EPUB, PDF, DOCX, FB2, TXT, MD, HTML 또는 RTF)을 불러오세요.',btnSentence:'문장 ⤢',btnAsk:'🤖 AI에게 묻기',btnGrammar:'✨ 문법',translating:'번역 중…',panelAsk:'🤖 단어 설명',panelGrammar:'📝 문법',tClose:'닫기',cancel:'취소',askHint:'단어를 탭하고 "AI에게 묻기"를 눌러 뜻과 용법을 확인하세요.',grammarHint:'단어를 선택하고 "문법"을 눌러 분석하세요.',prev:'◀ 이전',next:'다음 ▶',waiting:'대기 중…',keyTitle:'🔑 Google AI Studio (Gemini) 키',save:'저장',ask:'무엇이든 물어보세요…',generating:'생성 중…',error:'오류',chapter:'장',block:'블록',of:'중',page:'쪽',tMenu:'메뉴 표시/숨기기',tToc:'목차',tAiKey:'AI 키 (Gemini / Groq)',tExitApp:'앱 종료',exitFallback:'데이터가 저장되었습니다. 시스템 버튼이나 제스처로 앱을 닫을 수 있습니다.',updateAvailable:'새 앱 버전을 사용할 수 있습니다.',updateReload:'업데이트',archiveGuardFailed:'파일 안전성을 확인할 수 없습니다. 다시 시도하거나 페이지를 새로고침하세요.',tAltVoices:'읽는 동안 두 음성 번갈아 사용',tStudyMode:'학습 모드: 단어를 탭할 수 있습니다',tZoomOut:'글자 작게',tZoomIn:'글자 크게',tTheme:'테마',tVoice:'음성',tTargetLang:'번역 언어',tUiLang:'인터페이스 언어',tExpand:'확장: 문장 끝 → 전체 문장 → 문단',tSvo:'주어, 동사, 목적어 표시',tSpeakTr:'번역 읽기',tSpeakOrig:'원문 읽기',tAskPanel:'AI 도우미',tGrammarPanel:'문법',tPrevSent:'이전 문장',tPlayPause:'일시정지/계속',tNextSent:'다음 문장',tFooter:'장 · 쪽 · 이전/다음',tStop:'읽기 중지',unsupportedFormat:'지원되지 않는 형식입니다.',fileTooLarge:'파일이 너무 큽니다(최대 300MB).',emptyDoc:'파일에서 텍스트를 찾지 못했습니다.',pickVerb:'먼저 분석에서 동사를 선택하세요.',btnInk:'✏️ 쓰기',done:'완료',clearPageAsk:'이 페이지의 필기를 모두 지울까요?',btnRegion:'✂️ 영역',regionHint:'PDF 영역을 선택하세요',regionPdfOnly:'영역 캡처는 PDF에서만 작동합니다.',regionFail:'해당 영역을 캡처할 수 없습니다.',checking:'연습 문제 확인 중…',btnExplain:'📖 설명',btnTranslatePanel:'🌐 번역',btnLangLevel:'📘 언어 분석',selectFirst:'먼저 단어를 탭하거나 문장을 선택하세요.',keyFaster:'(더 빠름)',needKey:'설정에서 AI 키를 입력하세요!',needKeySvo:'문장 분석에는 AI 키가 필요합니다.',analysing:'문장 분석 중…',approx:'(오프라인 근사)',svoSubject:'주어',svoVerb:'동사',svoObject:'목적어',svoCoi:'간접 목적어',more:'더 보기',alreadyIn:'텍스트 언어:',oneVoice:'이 기기에는 프랑스어 음성이 하나뿐이라 교대 효과가 없을 수 있습니다.',micDenied:'마이크 접근이 거부되었습니다.',micNoSpeech:'음성이 감지되지 않았습니다. 다시 시도하세요.',micNotFound:'마이크를 찾을 수 없습니다.',dictationStart:'받아쓰기 시작',dictationStop:'받아쓰기 중지',dictationListening:'듣는 중… 잠시 멈춰도 됩니다. ■ 중지.',dictationStopped:'받아쓰기가 중지되었습니다. 텍스트는 입력란에 남아 있습니다.',micNetwork:'음성 인식 중 네트워크 문제가 발생했습니다.',noChapters:'장을 찾지 못했습니다.',chapterMissing:'보관 파일에서 장을 찾지 못했습니다.',voicesFr:'프랑스어',voicesEn:'영어',voicesUk:'우크라이나어',voicesRu:'러시아어',voicesZh:'중국어(간체)',voicesKo:'한국어',voicesHi:'힌디어',voicesGa:'아일랜드어',statsTitle:'독해',statsReading:'도움 없이 읽음',statsReadWithoutHelp:'도움 없이 읽음',statsHelpRequested:'도움 요청',statsPageWords:'페이지 단어 수',statsIndependentWords:'도움 없이',statsUniqueTapped:'탭한 고유 단어',statsTappedVocabulary:'수준별 이해',statsWordsShort:'단어',statsUnknown:'미분류',statsUnknownShort:'기타',statsNoHelp:'아직 도움 요청이 없습니다'
    },
    hi: {
        toc:'☰ विषय-सूची',open:'📂 खोलें',loading:'लोड हो रहा है…',read:'🔊 पढ़ें',pause:'⏸ रोकें',resume:'▶ जारी रखें',altVoicesOn:'👥 दो आवाज़ें: चालू',altVoicesOff:'👥 दो आवाज़ें: बंद',learnOn:'🔮 अध्ययन: चालू',learnOff:'🔮 अध्ययन: बंद',themeLight:'हल्का',themeSepia:'सेपिया',themeDark:'गहरा',aiKey:'🔑 AI कुंजी',noBook:'कोई पुस्तक लोड नहीं है',welcome:'पुस्तक (EPUB, PDF, DOCX, FB2, TXT, MD, HTML या RTF) लोड करने के लिए "खोलें" दबाएँ।',btnSentence:'वाक्य ⤢',btnAsk:'🤖 AI से पूछें',btnGrammar:'✨ व्याकरण',translating:'अनुवाद हो रहा है…',panelAsk:'🤖 शब्द की व्याख्या',panelGrammar:'📝 व्याकरण',tClose:'बंद करें',cancel:'रद्द करें',askHint:'शब्द पर टैप करके अर्थ और प्रयोग के लिए "AI से पूछें" दबाएँ।',grammarHint:'शब्द चुनें और विश्लेषण के लिए "व्याकरण" दबाएँ।',prev:'◀ पीछे',next:'आगे ▶',waiting:'प्रतीक्षा…',keyTitle:'🔑 Google AI Studio (Gemini) कुंजी',save:'सहेजें',ask:'कुछ भी पूछें…',generating:'बनाया जा रहा है…',error:'त्रुटि',chapter:'अध्याय',block:'खंड',of:'में से',page:'पृष्ठ',tMenu:'मेनू दिखाएँ/छिपाएँ',tToc:'विषय-सूची',tAiKey:'AI कुंजी (Gemini / Groq)',tExitApp:'ऐप से बाहर निकलें',exitFallback:'डेटा सहेज लिया गया है। सिस्टम बटन या जेस्चर से ऐप बंद करें।',updateAvailable:'ऐप का नया संस्करण उपलब्ध है।',updateReload:'अपडेट करें',archiveGuardFailed:'फ़ाइल की सुरक्षा जाँची नहीं जा सकी। फिर प्रयास करें।',tAltVoices:'पढ़ते समय दो आवाज़ें बदलें',tStudyMode:'अध्ययन मोड: शब्द टैप किए जा सकते हैं',tZoomOut:'छोटा पाठ',tZoomIn:'बड़ा पाठ',tTheme:'थीम',tVoice:'आवाज़',tTargetLang:'अनुवाद भाषा',tUiLang:'इंटरफ़ेस भाषा',tExpand:'बढ़ाएँ: वाक्य का अंत → पूरा वाक्य → अनुच्छेद',tSvo:'कर्ता, क्रिया और कर्म दिखाएँ',tSpeakTr:'अनुवाद सुनाएँ',tSpeakOrig:'मूल पाठ सुनाएँ',tAskPanel:'AI सहायक',tGrammarPanel:'व्याकरण',tPrevSent:'पिछला वाक्य',tPlayPause:'रोकें/जारी रखें',tNextSent:'अगला वाक्य',tFooter:'अध्याय · पृष्ठ · पीछे/आगे',tStop:'पढ़ना बंद करें',unsupportedFormat:'फ़ॉर्मेट समर्थित नहीं है।',fileTooLarge:'फ़ाइल बहुत बड़ी है (अधिकतम 300 MB)।',emptyDoc:'फ़ाइल में कोई पाठ नहीं मिला।',pickVerb:'पहले विश्लेषण में कोई क्रिया चुनें।',btnInk:'✏️ लिखें',done:'पूर्ण',clearPageAsk:'इस पृष्ठ की सारी लिखावट मिटाएँ?',btnRegion:'✂️ क्षेत्र',regionHint:'PDF का क्षेत्र चुनें',regionPdfOnly:'क्षेत्र कैप्चर केवल PDF में काम करता है।',regionFail:'वह क्षेत्र कैप्चर नहीं हो सका।',checking:'अभ्यास जाँचा जा रहा है…',btnExplain:'📖 व्याख्या',btnTranslatePanel:'🌐 अनुवाद',btnLangLevel:'📘 भाषा विश्लेषण',selectFirst:'पहले किसी शब्द पर टैप करें या वाक्य चुनें।',keyFaster:'(तेज़)',needKey:'सेटिंग में AI कुंजी दर्ज करें!',needKeySvo:'वाक्य विश्लेषण के लिए AI कुंजी चाहिए।',analysing:'वाक्य का विश्लेषण…',approx:'(ऑफ़लाइन अनुमान)',svoSubject:'कर्ता',svoVerb:'क्रिया',svoObject:'कर्म',svoCoi:'अप्रत्यक्ष कर्म',more:'और',alreadyIn:'पाठ पहले से',oneVoice:'इस डिवाइस पर केवल एक फ़्रेंच आवाज़ है—बदलाव सुनाई नहीं देगा।',micDenied:'माइक्रोफ़ोन की अनुमति नहीं मिली।',micNoSpeech:'कोई आवाज़ नहीं मिली, फिर प्रयास करें।',micNotFound:'माइक्रोफ़ोन नहीं मिला।',dictationStart:'डिक्टेशन शुरू करें',dictationStop:'डिक्टेशन रोकें',dictationListening:'सुन रहा है… विराम ले सकते हैं। ■ रोकें।',dictationStopped:'डिक्टेशन रुक गया। पाठ इनपुट में सुरक्षित है।',micNetwork:'वाणी पहचान के दौरान नेटवर्क समस्या।',noChapters:'कोई अध्याय नहीं मिला।',chapterMissing:'आर्काइव में अध्याय नहीं मिला।',voicesFr:'फ़्रेंच',voicesEn:'अंग्रेज़ी',voicesUk:'यूक्रेनी',voicesRu:'रूसी',voicesZh:'चीनी (सरलीकृत)',voicesKo:'कोरियाई',voicesHi:'हिन्दी',voicesGa:'आयरिश',statsTitle:'पठन-बोध',statsReading:'बिना सहायता पढ़ा',statsReadWithoutHelp:'बिना सहायता पढ़ा',statsHelpRequested:'सहायता माँगी',statsPageWords:'पृष्ठ पर शब्द',statsIndependentWords:'बिना सहायता',statsUniqueTapped:'टैप किए गए अनोखे शब्द',statsTappedVocabulary:'स्तर अनुसार समझ',statsWordsShort:'श.',statsUnknown:'अवर्गीकृत',statsUnknownShort:'अन्य',statsNoHelp:'अभी कोई सहायता अनुरोध नहीं'
    },
    ga: {
        toc:'☰ Clár',open:'📂 Oscail',loading:'Á luchtú…',read:'🔊 Léigh',pause:'⏸ Cuir ar sos',resume:'▶ Lean ar aghaidh',altVoicesOn:'👥 Dhá ghuth: ANN',altVoicesOff:'👥 Dhá ghuth: AS',learnOn:'🔮 Staidéar: ANN',learnOff:'🔮 Staidéar: AS',themeLight:'Geal',themeSepia:'Seipia',themeDark:'Dorcha',aiKey:'🔑 Eochair AI',noBook:'Níl leabhar luchtaithe',welcome:'Brúigh "Oscail" chun leabhar (EPUB, PDF, DOCX, FB2, TXT, MD, HTML nó RTF) a luchtú.',btnSentence:'abairt ⤢',btnAsk:'🤖 Fiafraigh de AI',btnGrammar:'✨ Gramadach',translating:'Á aistriú…',panelAsk:'🤖 Míniú focal',panelGrammar:'📝 Gramadach',tClose:'Dún',cancel:'Cealaigh',askHint:'Tapáil focal agus brúigh "Fiafraigh de AI" chun brí agus úsáid a fheiceáil.',grammarHint:'Roghnaigh focal agus brúigh "Gramadach" chun anailís a dhéanamh air.',prev:'◀ Siar',next:'Ar aghaidh ▶',waiting:'Ag fanacht…',keyTitle:'🔑 Eochair Google AI Studio (Gemini)',save:'Sábháil',ask:'Cuir ceist…',generating:'Á ghiniúint…',error:'Earráid',chapter:'Caibidil',block:'Bloc',of:'as',page:'lch.',tMenu:'Taispeáin/folaigh an roghchlár',tToc:'Clár',tAiKey:'Eochair AI (Gemini / Groq)',tExitApp:'Scoir den aip',exitFallback:'Sábháladh na sonraí. Is féidir an aip a dhúnadh leis an gcnaipe córais nó gotha.',updateAvailable:'Tá leagan nua den aip ar fáil.',updateReload:'Nuashonraigh',archiveGuardFailed:'Níorbh fhéidir sábháilteacht an chomhaid a dheimhniú. Bain triail eile as.',tAltVoices:'Malartaigh dhá ghuth agus tú ag léamh',tStudyMode:'Mód staidéir: is féidir focail a thapáil',tZoomOut:'Téacs níos lú',tZoomIn:'Téacs níos mó',tTheme:'Téama',tVoice:'Guth',tTargetLang:'Teanga aistriúcháin',tUiLang:'Teanga an chomhéadain',tExpand:'Leathnaigh: deireadh abairte → abairt iomlán → alt',tSvo:'Taispeáin ainmní, briathar agus cuspóir',tSpeakTr:'Léigh an t-aistriúchán',tSpeakOrig:'Léigh an buntéacs',tAskPanel:'Cúntóir AI',tGrammarPanel:'Gramadach',tPrevSent:'An abairt roimhe',tPlayPause:'Sos / lean ar aghaidh',tNextSent:'An chéad abairt eile',tFooter:'Caibidil · leathanach · siar/ar aghaidh',tStop:'Stop ag léamh',unsupportedFormat:'Ní thacaítear leis an bhformáid.',fileTooLarge:'Tá an comhad rómhór (uasmhéid 300 MB).',emptyDoc:'Níor aimsíodh téacs sa chomhad.',pickVerb:'Roghnaigh briathar san anailís ar dtús.',btnInk:'✏️ Scríobh',done:'Déanta',clearPageAsk:'Scrios gach rud scríofa ar an leathanach seo?',btnRegion:'✂️ Réigiún',regionHint:'Roghnaigh réigiún PDF',regionPdfOnly:'Ní oibríonn gabháil réigiúin ach le PDF.',regionFail:'Níorbh fhéidir an réigiún sin a ghabháil.',checking:'An cleachtadh á sheiceáil…',btnExplain:'📖 Mínigh',btnTranslatePanel:'🌐 Aistrigh',btnLangLevel:'📘 Anailís teanga',selectFirst:'Tapáil focal nó roghnaigh abairt sa téacs ar dtús.',keyFaster:'(níos tapúla)',needKey:'Cuir an eochair AI isteach sna socruithe!',needKeySvo:'Tá eochair AI de dhíth le haghaidh anailís abairte.',analysing:'An abairt á hanailísiú…',approx:'(meastachán as líne)',svoSubject:'ainmní',svoVerb:'briathar',svoObject:'cuspóir',svoCoi:'cuspóir indíreach',more:'tuilleadh',alreadyIn:'tá an téacs cheana i',oneVoice:'Níl ach guth Fraincise amháin ar an ngléas seo—ní bheidh an malartú soiléir.',micDenied:'Diúltaíodh rochtain ar an micreafón.',micNoSpeech:'Níor braitheadh caint; bain triail eile as.',micNotFound:'Níor aimsíodh micreafón.',dictationStart:'Tosaigh deachtú',dictationStop:'Stop deachtú',dictationListening:'Ag éisteacht… Is féidir sosanna a ghlacadh. ■ chun stopadh.',dictationStopped:'Stopadh an deachtú. Tá an téacs fós sa réimse.',micNetwork:'Fadhb líonra le linn aithint cainte.',noChapters:'Níor aimsíodh caibidlí.',chapterMissing:'Níor aimsíodh an chaibidil sa chartlann.',voicesFr:'Fraincis',voicesEn:'Béarla',voicesUk:'Úcráinis',voicesRu:'Rúisis',voicesZh:'Sínis Shimplithe',voicesKo:'Cóiréis',voicesHi:'Hiondúis',voicesGa:'Gaeilge',statsTitle:'Tuiscint léitheoireachta',statsReading:'Léite gan chabhair',statsReadWithoutHelp:'Léite gan chabhair',statsHelpRequested:'Cabhair iarrtha',statsPageWords:'Focail ar an leathanach',statsIndependentWords:'Gan chabhair',statsUniqueTapped:'Focail uathúla tapáilte',statsTappedVocabulary:'Tuiscint de réir leibhéil',statsWordsShort:'f.',statsUnknown:'Gan rangú',statsUnknownShort:'Eile',statsNoHelp:'Níl aon iarratas cabhrach fós'
    }
};
// Main-menu captions for the UI languages that live in I18N_EXTRA.
for (const [locale, values] of Object.entries({
    zh: {
        grpBook: '图书',
        grpSpeech: '朗读',
        grpStudy: '学习与翻译',
        grpView: '设置',
        grpText: '文字与笔记',
        lblVoice: '语音',
        lblTranslateTo: '翻译成',
        lblUiLang: '菜单语言',
        lblInk: '书写',
        lblRegion: '区域',
        lblAiKey: 'AI 密钥',
    },
    ko: {
        grpBook: '책',
        grpSpeech: '소리 내어 읽기',
        grpStudy: '학습 및 번역',
        grpView: '설정',
        grpText: '텍스트 및 메모',
        lblVoice: '음성',
        lblTranslateTo: '번역 언어',
        lblUiLang: '메뉴 언어',
        lblInk: '쓰기',
        lblRegion: '영역',
        lblAiKey: 'AI 키',
    },
    hi: {
        grpBook: 'पुस्तक',
        grpSpeech: 'ज़ोर से पढ़ना',
        grpStudy: 'अध्ययन और अनुवाद',
        grpView: 'सेटिंग',
        grpText: 'पाठ और नोट्स',
        lblVoice: 'आवाज़',
        lblTranslateTo: 'अनुवाद भाषा',
        lblUiLang: 'मेनू भाषा',
        lblInk: 'लिखें',
        lblRegion: 'क्षेत्र',
        lblAiKey: 'AI कुंजी',
    },
    ga: {
        grpBook: 'Leabhar',
        grpSpeech: 'Léamh os ard',
        grpStudy: 'Staidéar agus aistriúchán',
        grpView: 'Socruithe',
        grpText: 'Téacs agus nótaí',
        lblVoice: 'Guth',
        lblTranslateTo: 'Aistrigh go',
        lblUiLang: 'Teanga roghchláir',
        lblInk: 'Scríobh',
        lblRegion: 'Réigiún',
        lblAiKey: 'Eochair AI',
    },
})) Object.assign(I18N_EXTRA[locale], values);
// Grammar-rules strings for the UI languages that live in I18N_EXTRA.
for (const [locale, values] of Object.entries({
    zh: {
        btnRules: '📚 规则',
        tRules: '语法规则：在页面文本中查找',
        panelRules: '📚 语法规则',
        rulesLangLabel: '规则语言',
        rulesSearchPlaceholder: '搜索主题…',
        rulesCatalogueSoon: '该语言的目录将在下一次更新中推出。',
        rulesNoTopics: '没有结果。',
        rulesBack: '返回主题',
        rulesTheory: '理论',
        rulesFind: '在本页查找',
        rulesClear: '清除高亮',
        rulesRunning: '正在页面文本中查找…',
        rulesFound: '本页找到：{n}',
        rulesNone: '页面可见部分没有此类内容。',
        rulesFailed: '失败，请重试。',
        rulesNoText: '屏幕上没有可查找的文本。',
        rulesChanged: '页面已变化，请重新查找。',
        rulesExplain: '按理论讲解',
        rulesAskPlaceholder: '就此询问 AI…',
        rulesAskBtn: '提问',
    },
    ko: {
        btnRules: '📚 규칙',
        tRules: '문법 규칙: 페이지 본문에서 찾기',
        panelRules: '📚 문법 규칙',
        rulesLangLabel: '규칙 언어',
        rulesSearchPlaceholder: '주제 검색…',
        rulesCatalogueSoon: '이 언어의 목록은 다음 업데이트에서 제공됩니다.',
        rulesNoTopics: '결과가 없습니다.',
        rulesBack: '주제 목록',
        rulesTheory: '이론',
        rulesFind: '이 페이지에서 찾기',
        rulesClear: '강조 해제',
        rulesRunning: '페이지 본문에서 찾는 중…',
        rulesFound: '이 페이지에서 찾음: {n}',
        rulesNone: '페이지의 보이는 부분에는 없습니다.',
        rulesFailed: '실패했습니다. 다시 시도하세요.',
        rulesNoText: '화면에 검색할 텍스트가 없습니다.',
        rulesChanged: '페이지가 바뀌었습니다. 다시 검색하세요.',
        rulesExplain: '이론에 따라 설명',
        rulesAskPlaceholder: '이에 대해 AI에게 질문…',
        rulesAskBtn: '질문',
    },
    hi: {
        btnRules: '📚 नियम',
        tRules: 'व्याकरण नियम: पृष्ठ के पाठ में खोजें',
        panelRules: '📚 व्याकरण नियम',
        rulesLangLabel: 'नियमों की भाषा',
        rulesSearchPlaceholder: 'विषय खोजें…',
        rulesCatalogueSoon: 'इस भाषा की सूची अगले अपडेट में आएगी।',
        rulesNoTopics: 'कुछ नहीं मिला।',
        rulesBack: 'सभी विषय',
        rulesTheory: 'सिद्धांत',
        rulesFind: 'इस पृष्ठ पर खोजें',
        rulesClear: 'हाइलाइट हटाएँ',
        rulesRunning: 'पृष्ठ के पाठ में खोज रहे हैं…',
        rulesFound: 'इस पृष्ठ पर मिले: {n}',
        rulesNone: 'पृष्ठ के दिखाई देने वाले भाग में ऐसा कुछ नहीं है।',
        rulesFailed: 'विफल रहा। फिर से प्रयास करें।',
        rulesNoText: 'खोजने के लिए स्क्रीन पर पाठ नहीं है।',
        rulesChanged: 'पृष्ठ बदल गया — फिर से खोजें।',
        rulesExplain: 'सिद्धांत के अनुसार समझाएँ',
        rulesAskPlaceholder: 'इस बारे में AI से पूछें…',
        rulesAskBtn: 'पूछें',
    },
    ga: {
        btnRules: '📚 Rialacha',
        tRules: 'Rialacha gramadaí: aimsigh iad i dtéacs an leathanaigh',
        panelRules: '📚 Rialacha gramadaí',
        rulesLangLabel: 'Teanga na rialacha',
        rulesSearchPlaceholder: 'Cuardaigh topaic…',
        rulesCatalogueSoon: 'Beidh catalóg na teanga seo ar fáil sa chéad nuashonrú eile.',
        rulesNoTopics: 'Níor aimsíodh tada.',
        rulesBack: 'Gach topaic',
        rulesTheory: 'Teoiric',
        rulesFind: 'Aimsigh ar an leathanach',
        rulesClear: 'Glan aibhsithe',
        rulesRunning: 'Ag cuardach i dtéacs an leathanaigh…',
        rulesFound: 'Aimsithe ar an leathanach: {n}',
        rulesNone: 'Níl aon rud den sórt sin sa chuid infheicthe den leathanach.',
        rulesFailed: 'Theip air. Bain triail eile as.',
        rulesNoText: 'Níl téacs ar an scáileán le cuardach.',
        rulesChanged: 'D’athraigh an leathanach — cuardaigh arís.',
        rulesExplain: 'Mínigh de réir na teoirice',
        rulesAskPlaceholder: 'Ceisteanna AI faoi seo…',
        rulesAskBtn: 'Fiafraigh',
    },
})) Object.assign(I18N_EXTRA[locale], values);
// Sentence-breakdown strings (js/sentence-structure.js) for the UI languages that live in I18N_EXTRA.
for (const [locale, values] of Object.entries({
    zh: {
        btnStruct: '🧩 分析',
        tStruct: '句子分析：在文中用颜色标出句子成分',
        needKeyStruct: '句子分析需要 AI 密钥。',
        structTooLong: '请选择更短的句子进行分析（最多 400 个字符）。',
        structUnsupported: '该语言暂不支持句子分析。',
        structDeepHint: '点击某个成分查看更深入的分析',
        structDeepTitle: '深入分析',
        structFailed: '无法分析这个句子，请重试。',
        structRole_subject: '主语',
        structRole_verb: '谓语',
        structRole_object: '宾语',
        structRole_indirect: '间接宾语',
        structRole_complement: '补语 / 表语',
        structRole_time: '时间',
        structRole_place: '地点',
        structRole_manner: '方式',
        structRole_reason: '原因 / 目的',
        structRole_connector: '连词',
        structKind_past: '过去',
        structKind_present: '现在',
        structKind_future: '将来',
        structKind_duration: '持续时间',
        structKind_frequency: '频率',
        structKind_sequence: '先后顺序',
        structSub_noun: '名词',
        structSub_pronoun: '代词',
        structSub_determiner: '限定词 / 冠词',
        structSub_adjective: '形容词',
        structSub_verb: '动词',
        structSub_auxiliary: '助动词',
        structSub_adverb: '副词',
        structSub_preposition: '介词',
        structSub_conjunction: '连词',
        structSub_negation: '否定',
        structSub_other: '其他',
    },
    ko: {
        btnStruct: '🧩 분석',
        tStruct: '문장 분석: 본문에서 문장 성분을 색으로 표시',
        needKeyStruct: '문장 분석에는 AI 키가 필요합니다.',
        structTooLong: '더 짧은 문장을 선택하세요 (최대 400자).',
        structUnsupported: '이 언어는 아직 문장 분석을 지원하지 않습니다.',
        structDeepHint: '성분을 누르면 더 자세히 분석합니다',
        structDeepTitle: '심층 분석',
        structFailed: '문장을 분석하지 못했습니다. 다시 시도하세요.',
        structRole_subject: '주어',
        structRole_verb: '서술어',
        structRole_object: '목적어',
        structRole_indirect: '간접 목적어',
        structRole_complement: '보어',
        structRole_time: '시간',
        structRole_place: '장소',
        structRole_manner: '방법',
        structRole_reason: '이유 / 목적',
        structRole_connector: '접속어',
        structKind_past: '과거',
        structKind_present: '현재',
        structKind_future: '미래',
        structKind_duration: '기간',
        structKind_frequency: '빈도',
        structKind_sequence: '순서',
        structSub_noun: '명사',
        structSub_pronoun: '대명사',
        structSub_determiner: '한정사 / 관사',
        structSub_adjective: '형용사',
        structSub_verb: '동사',
        structSub_auxiliary: '조동사',
        structSub_adverb: '부사',
        structSub_preposition: '전치사',
        structSub_conjunction: '접속사',
        structSub_negation: '부정',
        structSub_other: '기타',
    },
    hi: {
        btnStruct: '🧩 विश्लेषण',
        tStruct: 'वाक्य विश्लेषण: पाठ में वाक्य के भाग रंगों में दिखाएँ',
        needKeyStruct: 'वाक्य विश्लेषण के लिए AI कुंजी चाहिए।',
        structTooLong: 'कृपया छोटा वाक्य चुनें (अधिकतम 400 अक्षर)।',
        structUnsupported: 'इस भाषा के लिए विश्लेषण अभी उपलब्ध नहीं है।',
        structDeepHint: 'गहन विश्लेषण के लिए किसी भाग पर टैप करें',
        structDeepTitle: 'गहन विश्लेषण',
        structFailed: 'वाक्य का विश्लेषण नहीं हो सका। फिर से प्रयास करें।',
        structRole_subject: 'कर्ता',
        structRole_verb: 'क्रिया',
        structRole_object: 'कर्म',
        structRole_indirect: 'अप्रत्यक्ष कर्म',
        structRole_complement: 'पूरक',
        structRole_time: 'समय',
        structRole_place: 'स्थान',
        structRole_manner: 'रीति',
        structRole_reason: 'कारण / उद्देश्य',
        structRole_connector: 'योजक',
        structKind_past: 'भूतकाल',
        structKind_present: 'वर्तमान',
        structKind_future: 'भविष्य',
        structKind_duration: 'अवधि',
        structKind_frequency: 'आवृत्ति',
        structKind_sequence: 'क्रम',
        structSub_noun: 'संज्ञा',
        structSub_pronoun: 'सर्वनाम',
        structSub_determiner: 'निर्धारक / उपपद',
        structSub_adjective: 'विशेषण',
        structSub_verb: 'क्रिया',
        structSub_auxiliary: 'सहायक क्रिया',
        structSub_adverb: 'क्रिया-विशेषण',
        structSub_preposition: 'संबंधबोधक',
        structSub_conjunction: 'समुच्चयबोधक',
        structSub_negation: 'निषेध',
        structSub_other: 'अन्य',
    },
    ga: {
        btnStruct: '🧩 Anailís',
        tStruct: 'Anailís abairte: dathaigh codanna den abairt sa téacs',
        needKeyStruct: 'Teastaíonn eochair AI chun abairt a anailísiú.',
        structTooLong: 'Roghnaigh abairt níos giorra (400 carachtar ar a mhéad).',
        structUnsupported: 'Níl anailís abairte ar fáil don teanga seo go fóill.',
        structDeepHint: 'Tapáil cuid le haghaidh anailís níos doimhne',
        structDeepTitle: 'Anailís dhomhain',
        structFailed: 'Níorbh fhéidir an abairt a anailísiú. Bain triail eile as.',
        structRole_subject: 'Ainmní',
        structRole_verb: 'Briathar',
        structRole_object: 'Réad',
        structRole_indirect: 'Réad indíreach',
        structRole_complement: 'Comhlánú',
        structRole_time: 'Am',
        structRole_place: 'Áit',
        structRole_manner: 'Modh',
        structRole_reason: 'Cúis / cuspóir',
        structRole_connector: 'Cónasc',
        structKind_past: 'Am caite',
        structKind_present: 'Am láithreach',
        structKind_future: 'Am atá le teacht',
        structKind_duration: 'Fad ama',
        structKind_frequency: 'Minicíocht',
        structKind_sequence: 'Seicheamh',
        structSub_noun: 'Ainmfhocal',
        structSub_pronoun: 'Forainm',
        structSub_determiner: 'Cinnteoir / alt',
        structSub_adjective: 'Aidiacht',
        structSub_verb: 'Briathar',
        structSub_auxiliary: 'Briathar cúnta',
        structSub_adverb: 'Dobhriathar',
        structSub_preposition: 'Réamhfhocal',
        structSub_conjunction: 'Cónasc',
        structSub_negation: 'Diúltú',
        structSub_other: 'Eile',
    },
})) Object.assign(I18N_EXTRA[locale], values);
// AI task routing strings for the I18N_EXTRA languages.
for (const [locale, values] of Object.entries({
    zh: {
        aiRoutingLabel: '先用 Groq（快）；Groq 无响应时才用 OpenAI',
        aiRoutingHint: '所有请求先发给 Groq；只有 Groq 无响应时才改用 OpenAI。使用已保存的密钥（或网站密钥）。关闭后所有请求都走当前 AI。',
    },
    ko: {
        aiRoutingLabel: '먼저 Groq(빠름), 응답이 없을 때만 OpenAI',
        aiRoutingHint: '모든 요청은 먼저 Groq로 가고, Groq가 응답하지 않을 때만 OpenAI를 사용합니다. 저장된 키(또는 사이트 키)를 사용합니다. 끄면 모든 요청이 활성 AI로 갑니다.',
    },
    hi: {
        aiRoutingLabel: 'पहले Groq (तेज़); जवाब न मिले तभी OpenAI',
        aiRoutingHint: 'हर अनुरोध पहले Groq को जाता है; Groq जवाब न दे तभी OpenAI इस्तेमाल होता है। सहेजी गई कुंजियाँ (या साइट की कुंजी) इस्तेमाल होती हैं। बंद करने पर सब कुछ सक्रिय AI से जाएगा।',
    },
    ga: {
        aiRoutingLabel: 'Groq ar dtús (tapa); OpenAI ach mura bhfreagraíonn Groq',
        aiRoutingHint: 'Téann gach iarratas chuig Groq ar dtús; ní úsáidtear OpenAI ach mura bhfreagraíonn Groq. Úsáidtear na heochracha sábháilte (nó eochair an tsuímh). Múch chun gach rud a sheoladh tríd an AI gníomhach.',
    },
})) Object.assign(I18N_EXTRA[locale], values);
// Rules panel (hide / pill / exceptions) strings for the I18N_EXTRA languages.
for (const [locale, values] of Object.entries({
    zh: {
        rulesHide: '隐藏窗口（高亮保留）',
        rulesPillRunning: '查找中…',
        rulesPillReady: '找到：{n}',
        rulesPillFailed: '失败',
        rulesDetails: '详解：规则与例外',
        rulesException: '例外',
        rulesExceptionsCount: '例外：{n}',
        wheelRules: '规则',
    },
    ko: {
        rulesHide: '창 숨기기 (강조 유지)',
        rulesPillRunning: '검색 중…',
        rulesPillReady: '찾음: {n}',
        rulesPillFailed: '실패',
        rulesDetails: '자세히: 규칙과 예외',
        rulesException: '예외',
        rulesExceptionsCount: '예외: {n}',
        wheelRules: '규칙',
    },
    hi: {
        rulesHide: 'विंडो छिपाएँ (हाइलाइट रहेंगे)',
        rulesPillRunning: 'खोज रहे हैं…',
        rulesPillReady: 'मिले: {n}',
        rulesPillFailed: 'विफल',
        rulesDetails: 'विस्तार से: नियम और अपवाद',
        rulesException: 'अपवाद',
        rulesExceptionsCount: 'अपवाद: {n}',
        wheelRules: 'नियम',
    },
    ga: {
        rulesHide: 'Folaigh an fhuinneog (fanann na haibhsithe)',
        rulesPillRunning: 'Ag cuardach…',
        rulesPillReady: 'Aimsithe: {n}',
        rulesPillFailed: 'Theip',
        rulesDetails: 'Go mion: rialacha agus eisceachtaí',
        rulesException: 'Eisceacht',
        rulesExceptionsCount: 'eisceachtaí: {n}',
        wheelRules: 'Rialacha',
    },
})) Object.assign(I18N_EXTRA[locale], values);
for (const [locale, values] of Object.entries(I18N_EXTRA)) {
    for (const [key, value] of Object.entries(values)) if (I18N[key]) I18N[key][locale] = value;
}
for (const entry of Object.values(I18N)) {
    for (const locale of SUPPORTED_LANGUAGE_CODES) if (!entry[locale]) entry[locale] = entry.en || entry.uk;
}

// BYOK settings and safe provider errors, in every supported UI language.
Object.assign(I18N, {
    "openaiKeyTitle": {
        "en": "🔑 OpenAI API",
        "uk": "🔑 OpenAI API",
        "fr": "🔑 API OpenAI",
        "ru": "🔑 OpenAI API",
        "zh": "🔑 OpenAI API",
        "ko": "🔑 OpenAI API",
        "hi": "🔑 OpenAI API",
        "ga": "🔑 API OpenAI"
    },
    "groqKeyTitle": {
        "en": "⚡ Groq API key",
        "uk": "⚡ Ключ Groq",
        "fr": "⚡ Clé API Groq",
        "ru": "⚡ Ключ Groq",
        "zh": "⚡ Groq API 密钥",
        "ko": "⚡ Groq API 키",
        "hi": "⚡ Groq API कुंजी",
        "ga": "⚡ Eochair API Groq"
    },
    "aiProviderLabel": {
        "en": "AI provider",
        "uk": "Активний AI",
        "fr": "Fournisseur IA actif",
        "ru": "Активный AI",
        "zh": "当前 AI 提供商",
        "ko": "활성 AI 제공업체",
        "hi": "सक्रिय AI प्रदाता",
        "ga": "Soláthraí AI gníomhach"
    },
    "aiAddKey": {
        "en": "Add a {provider} API key first.",
        "uk": "Спочатку додайте API-ключ {provider}.",
        "fr": "Ajoutez d'abord une clé API {provider}.",
        "ru": "Сначала добавьте API-ключ {provider}.",
        "zh": "请先添加 {provider} API 密钥。",
        "ko": "먼저 {provider} API 키를 추가하세요.",
        "hi": "पहले {provider} API कुंजी जोड़ें।",
        "ga": "Cuir eochair API {provider} leis ar dtús."
    },
    "aiAuthError": {
        "en": "{provider}: the API key is invalid or access is denied.",
        "uk": "{provider}: API-ключ недійсний або доступ заборонено.",
        "fr": "{provider} : clé API invalide ou accès refusé.",
        "ru": "{provider}: API-ключ недействителен или доступ запрещён.",
        "zh": "{provider}：API 密钥无效或访问被拒绝。",
        "ko": "{provider}: API 키가 유효하지 않거나 접근이 거부되었습니다.",
        "hi": "{provider}: API कुंजी अमान्य है या पहुँच अस्वीकृत है।",
        "ga": "{provider}: tá an eochair API neamhbhailí nó diúltaíodh rochtain."
    },
    "aiRateError": {
        "en": "{provider}: rate or usage limit reached. Check your quota or try again later.",
        "uk": "{provider}: досягнуто ліміту запитів або використання. Перевірте квоту або спробуйте пізніше.",
        "fr": "{provider} : limite de requêtes ou quota atteint. Vérifiez votre quota ou réessayez plus tard.",
        "ru": "{provider}: достигнут лимит запросов или использования. Проверьте квоту или попробуйте позже.",
        "zh": "{provider}：已达到请求或使用限额。请检查配额或稍后重试。",
        "ko": "{provider}: 요청 또는 사용 한도에 도달했습니다. 할당량을 확인하거나 나중에 다시 시도하세요.",
        "hi": "{provider}: अनुरोध या उपयोग सीमा पूरी हो गई। कोटा जाँचें या बाद में प्रयास करें।",
        "ga": "{provider}: baineadh teorainn iarratas nó úsáide amach. Seiceáil do chuóta nó bain triail eile as níos déanaí."
    },
    "aiRequestError": {
        "en": "{provider}: the request failed. Please try again.",
        "uk": "{provider}: запит не виконано. Спробуйте ще раз.",
        "fr": "{provider} : la requête a échoué. Réessayez.",
        "ru": "{provider}: запрос не выполнен. Попробуйте ещё раз.",
        "zh": "{provider}：请求失败，请重试。",
        "ko": "{provider}: 요청에 실패했습니다. 다시 시도하세요.",
        "hi": "{provider}: अनुरोध विफल हुआ। फिर प्रयास करें।",
        "ga": "{provider}: theip ar an iarratas. Bain triail eile as."
    },
    "aiNetworkError": {
        "en": "Could not reach the AI provider. Check your connection and try again.",
        "uk": "Не вдалося зв'язатися з AI-провайдером. Перевірте з'єднання та спробуйте ще раз.",
        "fr": "Impossible de joindre le fournisseur IA. Vérifiez la connexion et réessayez.",
        "ru": "Не удалось связаться с AI-провайдером. Проверьте соединение и попробуйте снова.",
        "zh": "无法连接 AI 提供商。请检查网络后重试。",
        "ko": "AI 제공업체에 연결할 수 없습니다. 연결을 확인하고 다시 시도하세요.",
        "hi": "AI प्रदाता से संपर्क नहीं हो सका। कनेक्शन जाँचें और फिर प्रयास करें।",
        "ga": "Níorbh fhéidir an soláthraí AI a bhaint amach. Seiceáil an nasc agus bain triail eile as."
    },
    "aiInvalidResponse": {
        "en": "The AI response was invalid or incomplete. Please try again.",
        "uk": "Відповідь AI некоректна або неповна. Спробуйте ще раз.",
        "fr": "La réponse IA est invalide ou incomplète. Réessayez.",
        "ru": "Ответ AI некорректен или неполон. Попробуйте ещё раз.",
        "zh": "AI 回复无效或不完整，请重试。",
        "ko": "AI 응답이 유효하지 않거나 불완전합니다. 다시 시도하세요.",
        "hi": "AI उत्तर अमान्य या अधूरा था। फिर प्रयास करें।",
        "ga": "Bhí an freagra AI neamhbhailí nó neamhiomlán. Bain triail eile as."
    },
    "aiEmptyResponse": {
        "en": "The AI returned no text. Please try again.",
        "uk": "AI не повернув тексту. Спробуйте ще раз.",
        "fr": "L'IA n'a renvoyé aucun texte. Réessayez.",
        "ru": "AI не вернул текст. Попробуйте ещё раз.",
        "zh": "AI 未返回文本，请重试。",
        "ko": "AI가 텍스트를 반환하지 않았습니다. 다시 시도하세요.",
        "hi": "AI ने कोई पाठ नहीं लौटाया। फिर प्रयास करें।",
        "ga": "Níor sheol an AI aon téacs ar ais. Bain triail eile as."
    },
    "keyNote": {
        "en": "Save your keys and choose the provider for all AI requests. Providers never switch automatically.",
        "uk": "Збережіть ключі та виберіть провайдера для всіх запитів AI. Автоматичного перемикання немає.",
        "fr": "Enregistrez vos clés et choisissez le fournisseur pour toutes les requêtes IA. Aucun changement automatique.",
        "ru": "Сохраните ключи и выберите провайдера для всех запросов AI. Автоматического переключения нет.",
        "zh": "保存密钥并为所有 AI 请求选择提供商。系统不会自动切换。",
        "ko": "키를 저장하고 모든 AI 요청에 사용할 제공업체를 선택하세요. 자동 전환되지 않습니다.",
        "hi": "कुंजियाँ सहेजें और सभी AI अनुरोधों के लिए प्रदाता चुनें। प्रदाता अपने आप नहीं बदलता।",
        "ga": "Sábháil do chuid eochracha agus roghnaigh soláthraí do gach iarratas AI. Ní athraítear soláthraí go huathoibríoch."
    },
    "aiUpdateKey": {
        "en": "Update AI key",
        "uk": "Оновити ключ AI",
        "fr": "Mettre à jour la clé IA",
        "ru": "Обновить ключ AI",
        "zh": "更新 AI 密钥",
        "ko": "AI 키 업데이트",
        "hi": "AI कुंजी अपडेट करें",
        "ga": "Nuashonraigh an eochair AI"
    },
    "aiRemoveKey": {
        "en": "Remove key",
        "uk": "Видалити ключ",
        "fr": "Supprimer la clé",
        "ru": "Удалить ключ",
        "zh": "删除密钥",
        "ko": "키 삭제",
        "hi": "कुंजी हटाएँ",
        "ga": "Bain an eochair"
    },
    "aiKeyRemovePending": {
        "en": "The key will be removed when you press Save.",
        "uk": "Ключ буде видалено після натискання «Зберегти».",
        "fr": "La clé sera supprimée quand vous appuierez sur Enregistrer.",
        "ru": "Ключ будет удалён после нажатия «Сохранить».",
        "zh": "按“保存”后将删除此密钥。",
        "ko": "저장을 누르면 키가 삭제됩니다.",
        "hi": "सहेजें दबाने पर कुंजी हटा दी जाएगी।",
        "ga": "Bainfear an eochair nuair a bhrúnn tú Sábháil."
    },
    "aiSiteKeyActive": {
        "en": "✅ AI works through the site's key — you don't need your own.",
        "uk": "✅ AI працює через ключ сайту — власний вводити не потрібно.",
        "fr": "✅ L'IA fonctionne avec la clé du site — inutile d'avoir la vôtre.",
        "ru": "✅ AI работает через ключ сайта — свой вводить не нужно.",
        "zh": "✅ AI 使用网站的密钥运行——无需自己的密钥。",
        "ko": "✅ AI가 사이트 키로 작동합니다 — 직접 키를 넣을 필요가 없습니다.",
        "hi": "✅ AI साइट की कुंजी से चलता है — अपनी कुंजी की ज़रूरत नहीं।",
        "ga": "✅ Oibríonn AI le heochair an tsuímh — níl d'eochair féin de dhíth."
    },
    "aiSiteKeyOwnSaved": {
        "en": "Your own keys are saved. With “Groq first” on, every request goes to Groq (your own key or the site's) and your other keys are only the backup.",
        "uk": "Ваші власні ключі збережено. Зі ввімкненою опцією «Спершу Groq» усі запити йдуть у Groq (ваш ключ або ключ сайту), а інші ваші ключі — лише запасні.",
        "fr": "Vos propres clés sont enregistrées. Avec « Groq d’abord », chaque requête va à Groq (votre clé ou celle du site) ; vos autres clés ne servent que de secours.",
        "ru": "Ваши собственные ключи сохранены. При включённой опции «Сначала Groq» все запросы идут в Groq (ваш ключ или ключ сайта), а остальные ваши ключи — только запасные.",
        "zh": "已保存您自己的密钥。开启“先用 Groq”后，所有请求都先发给 Groq（您的密钥或网站密钥），其他密钥仅作备用。",
        "ko": "직접 입력한 키가 저장되어 있습니다. ‘먼저 Groq’를 켜면 모든 요청이 Groq(내 키 또는 사이트 키)로 먼저 가고, 다른 키는 예비로만 쓰입니다.",
        "hi": "आपकी अपनी कुंजियाँ सहेजी हैं। “पहले Groq” चालू होने पर हर अनुरोध पहले Groq (आपकी या साइट की कुंजी) को जाता है; आपकी बाकी कुंजियाँ सिर्फ़ बैकअप हैं।",
        "ga": "Tá d’eochracha féin sábháilte. Nuair atá “Groq ar dtús” ar siúl, téann gach iarratas chuig Groq (d’eochair féin nó eochair an tsuímh) ar dtús; ní úsáidtear d’eochracha eile ach mar chúltaca."
    },
    "aiUseSiteKey": {
        "en": "Use the site's key",
        "uk": "Використовувати ключ сайту",
        "fr": "Utiliser la clé du site",
        "ru": "Использовать ключ сайта",
        "zh": "使用网站密钥",
        "ko": "사이트 키 사용",
        "hi": "साइट की कुंजी इस्तेमाल करें",
        "ga": "Úsáid eochair an tsuímh"
    },
    "aiSiteKeyNow": {
        "en": "Your keys were removed — AI now works through the site's key.",
        "uk": "Власні ключі видалено — тепер AI працює через ключ сайту.",
        "fr": "Vos clés ont été supprimées — l'IA utilise maintenant la clé du site.",
        "ru": "Собственные ключи удалены — теперь AI работает через ключ сайта.",
        "zh": "已删除您的密钥——AI 现在使用网站密钥。",
        "ko": "직접 입력한 키를 삭제했습니다 — 이제 AI가 사이트 키로 작동합니다.",
        "hi": "आपकी कुंजियाँ हटा दी गईं — अब AI साइट की कुंजी से चलता है।",
        "ga": "Baineadh d'eochracha — oibríonn AI anois le heochair an tsuímh."
    },
    "aiKeySavedHint": {
        "en": "Key saved — type a new key to replace it.",
        "uk": "Ключ збережено — введіть новий, щоб замінити.",
        "fr": "Clé enregistrée — saisissez une nouvelle clé pour la remplacer.",
        "ru": "Ключ сохранён — введите новый, чтобы заменить.",
        "zh": "密钥已保存——输入新密钥即可替换。",
        "ko": "키가 저장되었습니다 — 바꾸려면 새 키를 입력하세요.",
        "hi": "कुंजी सहेजी गई — बदलने के लिए नई कुंजी लिखें।",
        "ga": "Eochair sábháilte — clóscríobh eochair nua chun í a athsholáthar."
    },
    "aiKeyInvalid": {
        "en": "{provider}: the key contains invalid characters (spaces inside, dots or symbols such as •). Paste the full key again.",
        "uk": "{provider}: ключ містить недопустимі символи (пробіли, крапки чи символи на кшталт •). Вставте повний ключ ще раз.",
        "fr": "{provider} : la clé contient des caractères invalides (espaces, points ou symboles comme •). Collez à nouveau la clé complète.",
        "ru": "{provider}: ключ содержит недопустимые символы (пробелы, точки или символы вроде •). Вставьте полный ключ ещё раз.",
        "zh": "{provider}：密钥包含无效字符（空格、圆点或 • 等符号）。请重新粘贴完整密钥。",
        "ko": "{provider}: 키에 잘못된 문자(공백, 점 또는 • 같은 기호)가 있습니다. 전체 키를 다시 붙여넣으세요.",
        "hi": "{provider}: कुंजी में अमान्य वर्ण हैं (रिक्त स्थान, बिंदु या • जैसे चिह्न)। पूरी कुंजी फिर से चिपकाएँ।",
        "ga": "{provider}: tá carachtair neamhbhailí san eochair (spásanna, poncanna nó siombailí cosúil le •). Greamaigh an eochair iomlán arís."
    },
    "tAiKey": {
        "en": "AI API keys (OpenAI / Groq / Gemini)",
        "uk": "API-ключі AI (OpenAI / Groq / Gemini)",
        "fr": "Clés API IA (OpenAI / Groq / Gemini)",
        "ru": "API-ключи AI (OpenAI / Groq / Gemini)",
        "zh": "AI API 密钥（OpenAI / Groq / Gemini）",
        "ko": "AI API 키 (OpenAI / Groq / Gemini)",
        "hi": "AI API कुंजियाँ (OpenAI / Groq / Gemini)",
        "ga": "Eochracha API AI (OpenAI / Groq / Gemini)"
    },
    "practiceTab": {
        "en": "Practice",
        "uk": "Практика",
        "fr": "Pratique",
        "ru": "Практика",
        "zh": "练习",
        "ko": "연습",
        "hi": "अभ्यास",
        "ga": "Cleachtadh"
    },
    "tRestorePractice": {
        "en": "Restore Practice workspace",
        "uk": "Відновити робочу область Практики",
        "fr": "Restaurer l'espace Pratique",
        "ru": "Восстановить область Практики",
        "zh": "恢复练习工作区",
        "ko": "연습 작업 영역 복원",
        "hi": "अभ्यास कार्यस्थान पुनर्स्थापित करें",
        "ga": "Athchóirigh an spás oibre Cleachtais"
    }
});

function formatWordsSelected(count) {
    const n = Math.max(0, Math.round(count));
    const lang = (state.uiLang || 'uk').toLowerCase();
    if (lang === 'uk') {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return `${n} слово виділено`;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} слова виділено`;
        return `${n} слів виділено`;
    }
    if (lang === 'ru') {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return `${n} слово выделено`;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} слова выделено`;
        return `${n} слов выделено`;
    }
    if (lang === 'fr') {
        return n === 1 ? `1 mot sélectionné` : `${n} mots sélectionnés`;
    }
    if (lang === 'de') {
        return n === 1 ? `1 Wort ausgewählt` : `${n} Wörter ausgewählt`;
    }
    if (lang === 'es') {
        return n === 1 ? `1 palabra seleccionada` : `${n} palabras seleccionadas`;
    }
    return n === 1 ? `1 word selected` : `${n} words selected`;
}

function t(key) {
    const e = I18N[key];
    return e ? (e[state.uiLang] || e.en || e.uk) : key;
}
// Головне меню (бічна панель, index.html): назви розділів і рядків та однорядкові пояснення під ними. Іспанська — у js/i18n-es.js.
Object.assign(I18N, {
    mTagline: { uk: "Читання з перекладом, граматикою й озвученням", en: "Read with translation, grammar and audio", fr: "Lire avec traduction, grammaire et voix", ru: "Чтение с переводом, грамматикой и озвучкой", zh: "带翻译、语法和朗读的阅读", ko: "번역·문법·음성과 함께 읽기", hi: "अनुवाद, व्याकरण और आवाज़ के साथ पढ़ें", ga: "Léigh le haistriúchán, gramadach agus guth" },
    mSecBook: { uk: "Книга", en: "Book", fr: "Livre", ru: "Книга", zh: "图书", ko: "책", hi: "पुस्तक", ga: "Leabhar" },
    mOpen: { uk: "Відкрити файл", en: "Open a file", fr: "Ouvrir un fichier", ru: "Открыть файл", zh: "打开文件", ko: "파일 열기", hi: "फ़ाइल खोलें", ga: "Oscail comhad" },
    mOpenDesc: { uk: "EPUB, PDF, FB2, DOCX, TXT з пристрою", en: "EPUB, PDF, FB2, DOCX, TXT from this device", fr: "EPUB, PDF, FB2, DOCX, TXT depuis l’appareil", ru: "EPUB, PDF, FB2, DOCX, TXT с устройства", zh: "从设备打开 EPUB、PDF、FB2、DOCX、TXT", ko: "기기에서 EPUB, PDF, FB2, DOCX, TXT 열기", hi: "डिवाइस से EPUB, PDF, FB2, DOCX, TXT", ga: "EPUB, PDF, FB2, DOCX, TXT ón ngléas" },
    mShelf: { uk: "Мої книги", en: "My books", fr: "Mes livres", ru: "Мои книги", zh: "我的图书", ko: "내 책", hi: "मेरी पुस्तकें", ga: "Mo leabhair" },
    mShelfDesc: { uk: "Нещодавні й збережені на пристрої", en: "Recent and saved on this device", fr: "Récents et enregistrés sur l’appareil", ru: "Недавние и сохранённые на устройстве", zh: "最近阅读和保存在设备上的图书", ko: "최근 읽은 책과 기기에 저장된 책", hi: "हाल की और डिवाइस पर सहेजी गई", ga: "Le déanaí agus sábháilte ar an ngléas" },
    mLibrary: { uk: "Безкоштовна бібліотека", en: "Free library", fr: "Bibliothèque gratuite", ru: "Бесплатная библиотека", zh: "免费图书馆", ko: "무료 도서관", hi: "मुफ़्त पुस्तकालय", ga: "Leabharlann saor in aisce" },
    mLibraryDesc: { uk: "Gutenberg, Вікіджерела, Internet Archive", en: "Gutenberg, Wikisource and Internet Archive", fr: "Gutenberg, Wikisource et Internet Archive", ru: "Gutenberg, Викитека, Internet Archive", zh: "古腾堡、维基文库、互联网档案馆", ko: "구텐베르크, 위키문헌, 인터넷 아카이브", hi: "गुटेनबर्ग, विकिस्रोत, इंटरनेट आर्काइव", ga: "Gutenberg, Vicífhoinse agus Internet Archive" },
    mToc: { uk: "Зміст", en: "Contents", fr: "Sommaire", ru: "Оглавление", zh: "目录", ko: "목차", hi: "विषय-सूची", ga: "Clár ábhair" },
    mTocDesc: { uk: "Розділи та мініатюри сторінок", en: "Chapters and page thumbnails", fr: "Chapitres et miniatures des pages", ru: "Главы и миниатюры страниц", zh: "章节和页面缩略图", ko: "장과 페이지 미리보기", hi: "अध्याय और पृष्ठों के थंबनेल", ga: "Caibidlí agus mionsamhlacha leathanach" },
    mSecReading: { uk: "Читання", en: "Reading", fr: "Lecture", ru: "Чтение", zh: "阅读", ko: "읽기", hi: "पढ़ना", ga: "Léitheoireacht" },
    mRead: { uk: "Читати вголос", en: "Read aloud", fr: "Lire à voix haute", ru: "Читать вслух", zh: "朗读", ko: "소리 내어 읽기", hi: "ज़ोर से पढ़ें", ga: "Léigh os ard" },
    mPause: { uk: "Пауза", en: "Pause", fr: "Mettre en pause", ru: "Пауза", zh: "暂停", ko: "일시정지", hi: "रोकें", ga: "Sos" },
    mResume: { uk: "Продовжити читання", en: "Resume reading", fr: "Reprendre la lecture", ru: "Продолжить чтение", zh: "继续朗读", ko: "이어서 읽기", hi: "पढ़ना जारी रखें", ga: "Lean ar aghaidh ag léamh" },
    mReadDesc: { uk: "Озвучує сторінку й підсвічує речення", en: "Reads the page and highlights each sentence", fr: "Lit la page et surligne chaque phrase", ru: "Озвучивает страницу и подсвечивает предложения", zh: "朗读本页并高亮每个句子", ko: "페이지를 읽고 문장을 강조 표시", hi: "पृष्ठ पढ़ता है और हर वाक्य को हाइलाइट करता है", ga: "Léann sé an leathanach agus aibhsíonn sé gach abairt" },
    mTwoVoices: { uk: "Два голоси", en: "Two voices", fr: "Deux voix", ru: "Два голоса", zh: "双语音", ko: "두 목소리", hi: "दो आवाज़ें", ga: "Dhá ghuth" },
    mTwoVoicesDesc: { uk: "Різні голоси для реплік під час читання вголос", en: "Different voices for dialogue when reading aloud", fr: "Des voix différentes pour les répliques en lecture", ru: "Разные голоса для реплик при чтении вслух", zh: "朗读时对话使用不同语音", ko: "소리 내어 읽을 때 대사마다 다른 목소리", hi: "ज़ोर से पढ़ते समय संवादों के लिए अलग आवाज़ें", ga: "Guthanna éagsúla don chomhrá agus é á léamh os ard" },
    mFontSize: { uk: "Розмір тексту", en: "Text size", fr: "Taille du texte", ru: "Размер текста", zh: "文字大小", ko: "글자 크기", hi: "पाठ का आकार", ga: "Méid an téacs" },
    mFontSizeDesc: { uk: "Менше чи більше — текст і сторінки PDF", en: "Smaller or larger — text and PDF pages", fr: "Plus petit ou plus grand — texte et pages PDF", ru: "Меньше или больше — текст и страницы PDF", zh: "缩小或放大——文本和 PDF 页面", ko: "작게 또는 크게 — 텍스트와 PDF 페이지", hi: "छोटा या बड़ा — पाठ और PDF पृष्ठ", ga: "Níos lú nó níos mó — téacs agus leathanaigh PDF" },
    mPdfFit: { uk: "Масштаб сторінки PDF", en: "PDF page fit", fr: "Ajustement de la page PDF", ru: "Масштаб страницы PDF", zh: "PDF 页面缩放", ko: "PDF 페이지 맞춤", hi: "PDF पृष्ठ का माप", ga: "Oiriúnú leathanach PDF" },
    mPdfFitDesc: { uk: "Як сторінка вписується в екран", en: "How the page fits the screen", fr: "Comment la page s’adapte à l’écran", ru: "Как страница помещается на экран", zh: "页面如何适应屏幕", ko: "페이지를 화면에 맞추는 방식", hi: "पृष्ठ स्क्रीन में कैसे समाए", ga: "Conas a oireann an leathanach don scáileán" },
    mFitWidth: { uk: "По ширині", en: "Fit width", fr: "Pleine largeur", ru: "По ширине", zh: "适合宽度", ko: "너비에 맞춤", hi: "चौड़ाई में फ़िट", ga: "Leithead iomlán" },
    mFitPage: { uk: "Сторінка цілком", en: "Whole page", fr: "Page entière", ru: "Страница целиком", zh: "整页", ko: "페이지 전체", hi: "पूरा पृष्ठ", ga: "Leathanach iomlán" },
    mFitFree: { uk: "Вільний", en: "Free zoom", fr: "Zoom libre", ru: "Свободный", zh: "自由缩放", ko: "자유 확대", hi: "मुक्त ज़ूम", ga: "Súmáil shaor" },
    mTheme: { uk: "Тема", en: "Theme", fr: "Thème", ru: "Тема", zh: "主题", ko: "테마", hi: "थीम", ga: "Téama" },
    mThemeDesc: { uk: "Кольори сторінки й меню", en: "Colours of the page and menus", fr: "Couleurs de la page et des menus", ru: "Цвета страницы и меню", zh: "页面和菜单的颜色", ko: "페이지와 메뉴 색상", hi: "पृष्ठ और मेनू के रंग", ga: "Dathanna an leathanaigh agus na roghchlár" },
    mSecLearning: { uk: "Навчання", en: "Learning", fr: "Apprentissage", ru: "Обучение", zh: "学习", ko: "학습", hi: "सीखना", ga: "Foghlaim" },
    mStudy: { uk: "Режим вивчення", en: "Study mode", fr: "Mode étude", ru: "Режим изучения", zh: "学习模式", ko: "학습 모드", hi: "अध्ययन मोड", ga: "Mód staidéir" },
    mStudyDesc: { uk: "Торкніться слова — переклад, граматика, озвучення", en: "Tap a word — translation, grammar, audio", fr: "Touchez un mot : traduction, grammaire, voix", ru: "Коснитесь слова — перевод, грамматика, озвучка", zh: "点按单词：翻译、语法、朗读", ko: "단어를 탭하면 번역·문법·음성", hi: "किसी शब्द को छुएँ — अनुवाद, व्याकरण, आवाज़", ga: "Tapáil focal — aistriúchán, gramadach, guth" },
    mTargetLang: { uk: "Мова перекладу", en: "Translation language", fr: "Langue de traduction", ru: "Язык перевода", zh: "翻译语言", ko: "번역 언어", hi: "अनुवाद की भाषा", ga: "Teanga an aistriúcháin" },
    mTargetLangDesc: { uk: "Слова й речення перекладаються на неї", en: "Words and sentences are translated into it", fr: "Les mots et les phrases sont traduits dans cette langue", ru: "Слова и предложения переводятся на него", zh: "单词和句子将翻译成此语言", ko: "단어와 문장을 이 언어로 번역", hi: "शब्दों और वाक्यों का इसी भाषा में अनुवाद होता है", ga: "Aistrítear focail agus abairtí go dtí í" },
    mRules: { uk: "Граматичні правила", en: "Grammar rules", fr: "Règles de grammaire", ru: "Грамматические правила", zh: "语法规则", ko: "문법 규칙", hi: "व्याकरण के नियम", ga: "Rialacha gramadaí" },
    mRulesDesc: { uk: "Правила з прикладами з цієї сторінки", en: "Rules with examples from this page", fr: "Règles avec des exemples de cette page", ru: "Правила с примерами с этой страницы", zh: "规则及本页中的例句", ko: "이 페이지의 예문과 함께 보는 규칙", hi: "इस पृष्ठ के उदाहरणों के साथ नियम", ga: "Rialacha le samplaí ón leathanach seo" },
    mStats: { uk: "Розуміння сторінки", en: "Page comprehension", fr: "Compréhension de la page", ru: "Понимание страницы", zh: "本页理解度", ko: "페이지 이해도", hi: "पृष्ठ की समझ", ga: "Tuiscint an leathanaigh" },
    mStatsDesc: { uk: "Скільки слів ви знали без перекладу", en: "How many words you knew without translating", fr: "Combien de mots vous connaissiez sans traduction", ru: "Сколько слов вы знали без перевода", zh: "不查翻译就认识的单词比例", ko: "번역 없이 안 단어의 비율", hi: "बिना अनुवाद के आप कितने शब्द जानते थे", ga: "Cé mhéad focal a bhí ar eolas agat gan aistriúchán" },
    mSecTools: { uk: "Інструменти", en: "Tools", fr: "Outils", ru: "Инструменты", zh: "工具", ko: "도구", hi: "उपकरण", ga: "Uirlisí" },
    mInk: { uk: "Писати від руки", en: "Handwriting", fr: "Écriture manuscrite", ru: "Писать от руки", zh: "手写", ko: "손글씨", hi: "हाथ से लिखें", ga: "Lámhscríbhneoireacht" },
    mInkDesc: { uk: "Нотатки пальцем або стилусом поверх сторінки", en: "Notes with a finger or stylus on the page", fr: "Notes au doigt ou au stylet sur la page", ru: "Заметки пальцем или стилусом поверх страницы", zh: "用手指或手写笔在页面上做笔记", ko: "손가락이나 스타일러스로 페이지에 메모", hi: "उंगली या स्टाइलस से पृष्ठ पर नोट्स", ga: "Nótaí le méar nó stíleas ar an leathanach" },
    mRegion: { uk: "Фрагмент сторінки", en: "Page region", fr: "Zone de la page", ru: "Фрагмент страницы", zh: "页面区域", ko: "페이지 영역", hi: "पृष्ठ का हिस्सा", ga: "Réigiún leathanaigh" },
    mRegionDesc: { uk: "Обведіть частину сторінки — AI її пояснить", en: "Draw around part of the page — AI explains it", fr: "Entourez une partie de la page : l’IA l’explique", ru: "Обведите часть страницы — AI её объяснит", zh: "圈出页面的一部分，AI 为你讲解", ko: "페이지 일부를 표시하면 AI가 설명", hi: "पृष्ठ के हिस्से को घेरें — AI समझाएगा", ga: "Tarraing timpeall ar chuid den leathanach — míneoidh AI é" },
    mPrint: { uk: "Друк сторінки", en: "Print page", fr: "Imprimer la page", ru: "Печать страницы", zh: "打印本页", ko: "페이지 인쇄", hi: "पृष्ठ प्रिंट करें", ga: "Priontáil an leathanach" },
    mPrintDesc: { uk: "Надрукувати або зберегти як PDF", en: "Print or save as PDF", fr: "Imprimer ou enregistrer en PDF", ru: "Напечатать или сохранить как PDF", zh: "打印或另存为 PDF", ko: "인쇄하거나 PDF로 저장", hi: "प्रिंट करें या PDF के रूप में सहेजें", ga: "Priontáil nó sábháil mar PDF" },
    mSecSettings: { uk: "Налаштування", en: "Settings", fr: "Réglages", ru: "Настройки", zh: "设置", ko: "설정", hi: "सेटिंग्स", ga: "Socruithe" },
    mUiLang: { uk: "Мова меню", en: "Menu language", fr: "Langue du menu", ru: "Язык меню", zh: "菜单语言", ko: "메뉴 언어", hi: "मेनू की भाषा", ga: "Teanga an roghchláir" },
    mUiLangDesc: { uk: "Мова кнопок і пояснень AI", en: "Language of buttons and AI explanations", fr: "Langue des boutons et des explications de l’IA", ru: "Язык кнопок и объяснений AI", zh: "按钮和 AI 讲解所用的语言", ko: "버튼과 AI 설명의 언어", hi: "बटन और AI व्याख्याओं की भाषा", ga: "Teanga na gcnaipí agus mhínithe AI" },
    mAi: { uk: "AI та офлайн-переклад", en: "AI and offline translation", fr: "IA et traduction hors ligne", ru: "AI и офлайн-перевод", zh: "AI 与离线翻译", ko: "AI 및 오프라인 번역", hi: "AI और ऑफ़लाइन अनुवाद", ga: "AI agus aistriúchán as líne" },
    mAiDesc: { uk: "Ключі AI, пакети без інтернету, діагностика", en: "AI keys, offline packs, diagnostics", fr: "Clés IA, packs hors ligne, diagnostic", ru: "Ключи AI, офлайн-пакеты, диагностика", zh: "AI 密钥、离线语言包、诊断", ko: "AI 키, 오프라인 팩, 진단", hi: "AI कुंजियाँ, ऑफ़लाइन पैक, जाँच", ga: "Eochracha AI, pacáistí as líne, diagnóisic" },
    mUpdate: { uk: "Оновити застосунок", en: "Update the app", fr: "Mettre à jour l’app", ru: "Обновить приложение", zh: "更新应用", ko: "앱 업데이트", hi: "ऐप अपडेट करें", ga: "Nuashonraigh an aip" },
    mUpdateDesc: { uk: "Перевірити й встановити нову версію", en: "Check for and install a new version", fr: "Rechercher et installer une nouvelle version", ru: "Проверить и установить новую версию", zh: "检查并安装新版本", ko: "새 버전 확인 및 설치", hi: "नया संस्करण जाँचें और इंस्टॉल करें", ga: "Seiceáil agus suiteáil leagan nua" },
    mExit: { uk: "Вийти із застосунку", en: "Exit the app", fr: "Quitter l’app", ru: "Выйти из приложения", zh: "退出应用", ko: "앱 종료", hi: "ऐप से बाहर निकलें", ga: "Scoir den aip" }
});
// Головне меню: перемикач показує стан повзунком (role="switch" + aria-checked), а не словами «УВІМК/ВИМК» у назві;
// рядок-дія міняє лише свою назву (.mr-title), не чіпаючи значок і пояснення.
function setMenuSwitch(btn, on) {
    if (!btn) return;
    btn.setAttribute('aria-checked', String(!!on));
    btn.classList.toggle('active-mode', !!on);
}
function setMenuRowTitle(btn, text) {
    const title = btn && btn.querySelector('.mr-title');
    if (title) title.textContent = text; else if (btn) btn.textContent = text;
}
function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    // Написи, що залежать від стану
    updateAltVoicesBtn();
    updateTtsButtons();
    setMenuSwitch(els.translateBtn, state.translateMode);
    updateProgressText();
    updateDictationUI();
    els.askTab.setAttribute('aria-label', t('tAskPanel'));
    els.grammarTab.setAttribute('aria-label', t('tGrammarPanel'));
    if (typeof renderGrammarLookupLabels === 'function') renderGrammarLookupLabels();
    if (typeof syncBookLangSelect === 'function') syncBookLangSelect();
    const practiceRestore = document.getElementById('practice-restore');
    if (practiceRestore) {
        const span = practiceRestore.querySelector('span');
        if (span) span.textContent = t('practiceTabLabel') || t('practiceTab');
        practiceRestore.title = t('tRestorePractice');
        practiceRestore.setAttribute('aria-label', t('tRestorePractice'));
    }
    if (typeof loadVoices === 'function') loadVoices();   // назви груп голосів
    if (typeof refreshReadingStats === 'function') refreshReadingStats();
}


// Обрана мова застосовується скрізь: і до перекладу слів/речень, і до відповідей AI.
const LANG_NAMES = Object.fromEntries(Object.entries(LANGUAGE_CONFIG).map(([code, config]) => [code, config.aiName]));
// Мова ПОЯСНЕНЬ AI («Запитай AI», мовний розбір, граматика, правила, розбір речення) — мова меню: на телефоні з російським
// меню пояснення йшли українською, бо брались за мовою ПЕРЕКЛАДУ (типово українська). Самі переклади — як і раніше мовою перекладу.
function explainLangName() { return LANG_NAMES[state.uiLang] || LANG_NAMES[state.targetLang] || 'українською'; }

// escapeHtml перенесено сюди з мовно-нейтральної секції нижче в основному
// файлі (raw HTML-екранування для довіреного тексту в innerHTML) — суто
// утилітарна функція без залежностей, природне місце — поруч із safeHtml.
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// МЕЖІ РЕЧЕНЬ — одне правило для озвучення, тапу по реченню (текст і PDF), розбору й Практики.
// Раніше кінцем речення була будь-яка «. ! ?» перед пробілом, тож «Mr. Smith», «M. Dupont», «J. K. Rowling», «т. зв.»,
// «etc. and» і «"Go." she said» розривались на два речення. Тепер кінець — це знак (або їх ряд «?!», «...») разом із
// закривальними лапками/дужками (і французьким «. »»), після якого — пробіл або кінець тексту, і НЕ:
//  • наступне слово починається з малої літери («etc. and», «т. зв. ...», «"Oh!" she said») або з цифри після скорочення
//    номера («p. 12», «ст. 5»; а «He left. 1990 was…» — два речення);
//  • перед крапкою — одна літера (ініціал «J.», «M.», «м. Київ»);
//  • перед крапкою — звертання/титул, а далі велика літера («Mr. Smith», «Mme Bovary», «проф. Іваненко»).
// CJK-знаки «。！？» завершують речення й без пробілу. Мови без регістру (китайська, корейська, гінді) різати не заважає:
// там немає малих літер. Повертає множину індексів символів, ПІСЛЯ яких закінчується речення.
const SENTENCE_TITLES = new Set(['mr', 'mrs', 'ms', 'mx', 'dr', 'prof', 'st', 'rev', 'hon', 'gen', 'col', 'capt', 'lt', 'sgt', 'maj', 'messrs',
    'mme', 'mlle', 'mmes', 'mlles', 'mgr', 'ste', 'hr', 'hrn', 'frl', 'sra', 'srta', 'dña', 'dott', 'sig', 'pan', 'пан', 'пані', 'ім', 'св', 'акад',
    'проф', 'доц', 'тов', 'вул', 'пров', 'просп', 'ул', 'им', 'гр', 'г-н', 'г-жа']);
// Скорочення, після яких іде номер («p. 12», «ст. 5», «vol. 2»): лише після них цифра не починає нового речення.
const SENTENCE_NUM_ABBR = new Set(['p', 'pp', 'vol', 'no', 'nr', 'ch', 'chap', 'fig', 'art', 'sec', 'para', 's', 'ss', 'bd', 'n', 'nº', 'núm', 'pág', 'págs',
    'cap', 't', 'tome', 'éd', 'ст', 'стор', 'с', 'сс', 'т', 'тт', 'р', 'рр', 'гл', 'ч', 'розд', 'рис', 'табл', 'п', 'пп', 'вип', 'стр', 'см']);
const SENTENCE_TERM = /[.!?…]/, SENTENCE_CJK_TERM = /[。！？]/, SENTENCE_CLOSER = /["'»”’)\]]/, SENTENCE_OPENER = /["'«“‘(\[—–-]/;
function sentenceCuts(str) {
    const cuts = new Set();
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (SENTENCE_CJK_TERM.test(ch) || ch === '।') {
            let j = i + 1;
            while (j < str.length && (SENTENCE_CJK_TERM.test(str[j]) || /[」』”"）)]/.test(str[j]))) j++;
            cuts.add(j - 1); i = j - 1; continue;
        }
        if (!SENTENCE_TERM.test(ch)) continue;
        const dot = i;
        let j = i + 1;
        while (j < str.length && SENTENCE_TERM.test(str[j])) j++;
        const single = j === dot + 1 && ch === '.';
        // закривальні лапки/дужки — частина речення, навіть після пробілу перед «»» у французькій
        for (;;) {
            if (j < str.length && SENTENCE_CLOSER.test(str[j])) { j++; continue; }
            let k = j; while (k < str.length && /[   ]/.test(str[k])) k++;
            if (k > j && k < str.length && /[»”)\]]/.test(str[k])) { j = k + 1; continue; }
            break;
        }
        i = j - 1;
        if (j < str.length && !/\s/.test(str[j])) continue;   // «3.5», «e.g.x», адреса — не кінець
        let n = j; while (n < str.length && (/\s/.test(str[n]) || SENTENCE_OPENER.test(str[n]))) n++;
        // Номер пункту списку «3. appliquer…» (1–3 цифри після пробілу/початку) завершує попередній пункт, як і раніше —
        // у PDF списки часто без розділових знаків, і без цього всі пункти злипались в одне «речення».
        let d = dot; while (d > 0 && /\d/.test(str[d - 1])) d--;
        const listNumber = single && dot - d >= 1 && dot - d <= 3 && (d === 0 || /\s/.test(str[d - 1]));
        if (!listNumber && n < str.length && /\p{Ll}/u.test(str[n])) continue;   // далі мала літера — речення триває
        if (single && !listNumber) {
            let b = dot; while (b > 0 && /[\p{L}\p{M}º-]/u.test(str[b - 1])) b--;
            const token = str.slice(b, dot);
            if (n < str.length && /\p{N}/u.test(str[n]) && SENTENCE_NUM_ABBR.has(token.toLowerCase())) continue;
            if (token.length === 1 && /\p{L}/u.test(token)) continue;   // ініціал
            if (n < str.length && SENTENCE_TITLES.has(token.toLowerCase()) && /\p{Lu}/u.test(str[n])) continue;
        }
        cuts.add(i);
    }
    return cuts;
}
// Речення рядка як пари [від, до) без пробілів по краях — за тими самими межами sentenceCuts.
function sentenceSpans(str) {
    const out = [], push = (a, b) => { while (a < b && /\s/.test(str[a])) a++; while (b > a && /\s/.test(str[b - 1])) b--; if (b > a) out.push([a, b]); };
    let a = 0;
    for (const c of [...sentenceCuts(str)].sort((x, y) => x - y)) { push(a, c + 1); a = c + 1; }
    push(a, str.length);
    return out;
}
