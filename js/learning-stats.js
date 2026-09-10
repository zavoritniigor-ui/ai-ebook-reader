/* learning-stats.js — compact current-page reading/vocabulary statistics.
 *
 * The source model is deliberately position-based rather than DOM-wrapper-based:
 * help is stored against stable word occurrences inside a PDF page or a
 * reflowable chapter/block.  The current-page view is then derived from live
 * geometry, so page turns and book changes cannot mix records and a font-size
 * reflow can still reconnect a saved tap to the same source word.
 *
 * Data stays in localStorage. CEFR lookup is conservative and synchronous: a
 * small reviewed EN/FR starter lexicon is cached; anything not in it is stored
 * as "unknown". Opening the popover never makes an AI/network request.
 */

const LEARNING_STATS_VERSION = 1;
const LEARNING_STATS_PREFIX = 'reader_learning_stats_v1:';
const CEFR_CACHE_KEY = 'reader_cefr_cache_v1';
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'unknown'];
const LEARNING_HELP_SOURCES = new Set(['word_tap', 'phrase_translation', 'sentence_translation', 'paragraph_translation', 'ask_ai', 'grammar']);
const READING_BLOCK_TAGS = new Set('ADDRESS ARTICLE ASIDE BLOCKQUOTE DIV DL FIELDSET FIGCAPTION FIGURE FOOTER FORM H1 H2 H3 H4 H5 H6 HEADER HR LI MAIN NAV OL P PRE SECTION TABLE TD TH TR UL'.split(' '));

// Approximate learner vocabulary bands only where a reviewed local entry exists.
// Inflected/unknown words intentionally remain unclassified instead of being guessed.
const CEFR_WORDS = (() => {
    const out = { en: Object.create(null), fr: Object.create(null) };
    const add = (lang, level, words) => words.split(/\s+/).filter(Boolean).forEach(word => { out[lang][word] = level; });
    add('en', 'A1', 'a an and answer apple ask be book boy cat child city class come day do eat family father friend girl go good have hello help here home house i in is it know like live look make man mother my name new no not of on one open page read school see she speak study teacher text the this time to two want we what where who woman word work write yes you your');
    add('en', 'A2', 'about after again always arrive because before begin believe better bring buy call change country different early easy enough every explain feel find first food give important last learn leave little love mean money more most need never next often old only other people place play problem remember right same say sentence should sometimes start still than thing think together understand use usually very wait way week well without world would');
    add('en', 'B1', 'although already approach available choice compare condition decide describe develop difference during education environment experience however improve include information instead language likely manage opinion perhaps provide reason relationship result since situation suggest though through while');
    add('en', 'B2', 'achieve acknowledge acquire adapt adequate assume benefit complex consequence considerable contrast contribute despite establish evidence factor furthermore impact indicate issue maintain occur perspective require significant specific therefore whereas');
    add('en', 'C1', 'albeit ambiguous coherent compelling comprehensive convey crucial elaborate enhance facilitate framework imply inherent insight nevertheless notion perceive prevalent reinforce subtle undergo');
    add('en', 'C2', 'abstruse albeit apocryphal cogent conundrum deleterious dichotomy ephemeral equivocal fastidious idiosyncratic ineffable intransigent perspicacious ubiquitous');
    add('fr', 'A1', 'à ai aime aller ami an ans appartement après au avec avoir beau bon bonjour ça chat chez comment dans de des deux école elle en enfant est et être famille femme fille garçon habiter ici il je jour la le les livre maison mais maman manger merci mon ne non nous où oui page parler père petit pour professeur qui rue salut se suis sur texte tu un une vous vouloir');
    add('fr', 'A2', 'alors apprendre arriver assez aussi avant beaucoup besoin bien chercher choisir commencer comprendre connaître continuer demander devoir dire donner encore entrer faire facile finir fois grand heure important jamais laisser lire maintenant même mettre monde nouveau parce penser personne pouvoir prendre problème quand regarder rester savoir seulement sortir souvent temps toujours trouver venir voir vrai');
    add('fr', 'B1', 'ailleurs améliorer atteindre aucun cependant changement comprendre condition décider décrire devenir différence durant empêcher expérience expliquer pourtant puisque raison relation résultat réussir sans sembler situation tandis utiliser');
    add('fr', 'B2', 'aboutir adapter avantage conséquence considérable contribuer davantage malgré néanmoins objectif permettre perspective preuve produire représenter résoudre spécifique tandis valeur');
    add('fr', 'C1', 'ambigu cohérent contraignant crucial élaborer enjeu faciliter inhérent néanmoins notion pertinent prépondérant renforcer subtil');
    add('fr', 'C2', 'abscons apocryphe circonspect délétère dichotomie éphémère équivoque idiosyncrasique ineffable ubiquitaire');
    return out;
})();

let learningStatsBook = { version: LEARNING_STATS_VERSION, scopes: {} };
let cefrCache = readLearningJson(CEFR_CACHE_KEY, {});
let readingStatsFrame = 0;

function readLearningJson(key, fallback) {
    try {
        const value = JSON.parse(readStored(key) || 'null');
        return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
    } catch (e) { return fallback; }
}
function learningStatsStorageKey() { return state.bookKey ? LEARNING_STATS_PREFIX + state.bookKey : null; }
function loadLearningStatsForBook() {
    const key = learningStatsStorageKey();
    const value = key ? readLearningJson(key, null) : null;
    learningStatsBook = value && value.version === LEARNING_STATS_VERSION && value.scopes && typeof value.scopes === 'object'
        ? value : { version: LEARNING_STATS_VERSION, scopes: {} };
    if (typeof lastReaderHelpContext !== 'undefined') lastReaderHelpContext = null;
    closeReadingStats();
    refreshReadingStats();
}
function saveLearningStatsForBook() {
    const key = learningStatsStorageKey();
    if (!key) return;
    // Bound retained history so one unusually large textbook cannot exhaust the origin quota.
    const scopes = Object.entries(learningStatsBook.scopes);
    let total = scopes.reduce((sum, [, taps]) => sum + Object.keys(taps || {}).length, 0);
    if (total > 2500) {
        const oldest = [];
        for (const [scope, taps] of scopes) for (const [id, tap] of Object.entries(taps || {})) oldest.push({ scope, id, at: tap.at || 0 });
        oldest.sort((a, b) => a.at - b.at);
        for (const item of oldest.slice(0, total - 2500)) delete learningStatsBook.scopes[item.scope][item.id];
    }
    writeStored(key, JSON.stringify(learningStatsBook));
}

function learningSourceScope() {
    if (!state.bookKey || !state.format) return null;
    return state.format === 'pdf' ? `pdf:${state.currentIndex}` : `${state.format}:${state.currentIndex}`;
}
function normalizedLearningWord(word) {
    return String(word || '').normalize('NFKC').toLocaleLowerCase().replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '');
}
function textNodeBlock(node) {
    let el = node.parentElement;
    while (el && el !== els.pages) {
        if (READING_BLOCK_TAGS.has(el.tagName)) return el;
        el = el.parentElement;
    }
    return els.pages;
}
function pdfTextItem(node, root) {
    let el = node.parentElement;
    while (el && el.parentElement !== root) el = el.parentElement;
    return el;
}
function readableTextModel() {
    const root = state.format === 'pdf' ? els.pages.querySelector('.pdf-text-layer') : els.pages;
    if (!root || !state.bookKey || !state.format) return { text: '', segments: [], root };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            // Whitespace-only inline nodes are source separators, not chrome. Dropping
            // them joins "one <em>two</em>" into "onetwo" and shifts every later ID.
            if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent || parent.closest('[hidden],[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    let text = '', previous = null, node;
    const segments = [];
    while ((node = walker.nextNode())) {
        const value = node.nodeValue || '';
        const itemBoundary = state.format === 'pdf'
            ? previous && pdfTextItem(previous, root) !== pdfTextItem(node, root)
            : previous && textNodeBlock(previous) !== textNodeBlock(node);
        if (itemBoundary && !/\s$/u.test(text) && !/^\s/u.test(value)) text += ' ';
        const start = text.length;
        text += value;
        segments.push({ node, start, end: text.length });
        previous = node;
    }
    return { text, segments, root };
}

function vocabularyTokens(text, lang = pageLang().slice(0, 2)) {
    const tokens = [];
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        let segmenter;
        try { segmenter = new Intl.Segmenter(LANGUAGE_CONFIG[lang]?.locale || lang || 'en', { granularity: 'word' }); } catch (e) {}
        if (segmenter) {
            const parts = Array.from(segmenter.segment(text));
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (!part.isWordLike) continue;
                let word = part.segment, end = part.index + part.segment.length;
                // Segmenters disagree about apostrophes and hyphens. Join only an
                // adjacent word-separator-word chain so Latin contractions/compounds
                // have the same identity in every supported browser.
                while (i + 2 < parts.length && /^[\u002d'\u2019\u02bc]$/u.test(parts[i + 1].segment) &&
                    parts[i + 1].index === end && parts[i + 2].isWordLike && parts[i + 2].index === end + 1) {
                    word += parts[i + 1].segment + parts[i + 2].segment;
                    end = parts[i + 2].index + parts[i + 2].segment.length;
                    i += 2;
                }
                tokens.push({ word, start: part.index, end });
            }
        }
    }
    if (!tokens.length) {
        const re = /[\p{L}\p{M}]+(?:['’ʼ-][\p{L}\p{M}]+)*/gu;
        let match;
        while ((match = re.exec(text))) tokens.push({ word: match[0], start: match.index, end: match.index + match[0].length });
    }
    return tokens.filter(token => {
        const word = normalizedLearningWord(token.word);
        return word && word.length <= 40 && !/(.)\1{4,}/u.test(word) &&
            /^[\p{L}\p{M}]+(?:['’ʼ-][\p{L}\p{M}]+)*$/u.test(word);
    });
}
function modelPiecesForToken(model, token) {
    const pieces = [];
    for (const seg of model.segments) {
        const from = Math.max(token.start, seg.start), to = Math.min(token.end, seg.end);
        if (to > from) pieces.push({ node: seg.node, start: from - seg.start, end: to - seg.start });
    }
    return pieces;
}
// НАВМИСНО не за перетином з els.container.getBoundingClientRect() (поточним
// видимим вікном): "поточна сторінка" для нерозгорнутих форматів (EPUB/DOCX/TXT) —
// це CSS-колонка з фіксованим горизонтальним зсувом (state.pageInChapter *
// columnStep()), а НЕ те, що зараз потрапляє у видиму область екрана. Якщо
// сторінка вища за контейнер (збільшений шрифт, специфічний масштаб) і всередині
// неї можливий вертикальний скрол, перевірка "потрапляє у viewport" змінювала
// відповідь залежно від поточної позиції прокрутки — і статистика "скидалась"
// чи "стрибала", коли просто гортали в межах ТІЄЇ Ж сторінки, а не переходили на
// іншу. pageIndexForRange() (js/tts.js) — той самий обчислений (не спостережний)
// індекс сторінки, яким уже користується автогортання під час читання вголос:
// повертає ЛОГІЧНИЙ номер колонки з урахуванням поточного transform-зсуву, а не
// поточної прокрутки, тож відповідь стабільна незалежно від того, де саме зараз
// прокручено чи яке слово востаннє чіпали.
function tokenIsOnCurrentPage(pieces) {
    if (!pieces.length) return false;
    if (state.format === 'pdf') return true;
    for (const piece of pieces) {
        try {
            const range = document.createRange();
            range.setStart(piece.node, piece.start); range.setEnd(piece.node, piece.end);
            if (pageIndexForRange(range) === state.pageInChapter) return true;
        } catch (e) {}
    }
    return false;
}
function currentPageVocabulary() {
    const model = readableTextModel();
    const scope = learningSourceScope();
    const words = [];
    for (const token of vocabularyTokens(model.text)) {
        const pieces = modelPiecesForToken(model, token);
        if (!tokenIsOnCurrentPage(pieces)) continue;
        const normalized = normalizedLearningWord(token.word);
        words.push({ ...token, normalized, id: `${token.start}:${normalized}`, pieces });
    }
    return { model, scope, words };
}

function cachedCefrLevel(word, lang) {
    const normalized = normalizedLearningWord(word);
    const key = `${lang}:${normalized}`;
    if (Object.prototype.hasOwnProperty.call(cefrCache, key)) return CEFR_LEVELS.includes(cefrCache[key]) ? cefrCache[key] : 'unknown';
    const level = CEFR_WORDS[lang]?.[normalized] || 'unknown';
    cefrCache[key] = level;
    const entries = Object.entries(cefrCache);
    if (entries.length > 2000) cefrCache = Object.fromEntries(entries.slice(-2000));
    writeStored(CEFR_CACHE_KEY, JSON.stringify(cefrCache));
    return level;
}

function rangesOverlap(range, piece) {
    try {
        const pieceRange = document.createRange();
        pieceRange.setStart(piece.node, piece.start); pieceRange.setEnd(piece.node, piece.end);
        return range.compareBoundaryPoints(Range.END_TO_START, pieceRange) < 0 &&
            range.compareBoundaryPoints(Range.START_TO_END, pieceRange) > 0;
    } catch (e) { return false; }
}
function occurrenceTouchesSpan(occurrence, span) {
    if (!span) return false;
    if (span.nodeType) return occurrence.pieces.some(piece =>
        span === piece.node || (span.nodeType === Node.ELEMENT_NODE && span.contains(piece.node)));
    const explicitPieces = Array.isArray(span._pdfPieces) ? span._pdfPieces : null;
    if (explicitPieces) return occurrence.pieces.some(piece => explicitPieces.some(selected =>
        selected.node === piece.node && selected.start < piece.end && selected.end > piece.start));
    return span.startContainer ? occurrence.pieces.some(piece => rangesOverlap(span, piece)) : false;
}
function statsForOccurrenceIds(scope, occurrenceIds) {
    const ids = new Set(occurrenceIds);
    const records = scope ? learningStatsBook.scopes[scope] || {} : {};
    const tapped = [];
    for (const id of ids) {
        const record = records[id];
        if (record?.normalized) tapped.push({ ...record, cefr: CEFR_LEVELS.includes(record.cefr) ? record.cefr : 'unknown' });
    }
    const total = ids.size, helped = tapped.length;
    const helpPercent = total ? helped * 100 / total : 0;
    const independent = Math.max(0, total - helped);
    const distribution = Object.fromEntries(CEFR_LEVELS.map(level => [level, 0]));
    for (const record of tapped) distribution[record.cefr || 'unknown']++;
    return { total, helped, independent, helpPercent,
        readingPercent: total ? independent * 100 / total : 0, distribution, tapped };
}

// The only write API for learning help. `span` may be a reader DOM Range/node or
// the stable descriptor returned by an earlier call (used by delayed Ask/Grammar).
function recordHelpForSpan(span, sourceType = 'phrase_translation') {
    if (!state.bookKey || !span) return null;
    if (span.bookKey && span.bookKey !== state.bookKey) return null;
    const source = LEARNING_HELP_SOURCES.has(sourceType) ? sourceType : 'phrase_translation';
    let scope, pageWords, occurrenceIds;
    if (span.scope && Array.isArray(span.occurrences) && Array.isArray(span.pageOccurrenceIds)) {
        scope = span.scope;
        pageWords = span.occurrences;
        occurrenceIds = span.pageOccurrenceIds;
    } else {
        const page = currentPageVocabulary();
        scope = page.scope;
        pageWords = page.words.filter(occurrence => occurrenceTouchesSpan(occurrence, span));
        occurrenceIds = page.words.map(occurrence => occurrence.id);
    }
    if (!scope || !pageWords.length) return null;

    const records = learningStatsBook.scopes[scope] || (learningStatsBook.scopes[scope] = {});
    const addedOccurrenceIds = [];
    let changed = false;
    for (const occurrence of pageWords) {
        let record = records[occurrence.id];
        if (!record) {
            const lang = langForText(occurrence.word).slice(0, 2);
            record = records[occurrence.id] = {
                word: occurrence.word.slice(0, 80), normalized: occurrence.normalized, lang,
                cefr: cachedCefrLevel(occurrence.word, lang), sources: [source], at: Date.now()
            };
            addedOccurrenceIds.push(occurrence.id); changed = true;
        } else {
            const sources = Array.isArray(record.sources) ? record.sources : [];
            if (!sources.includes(source)) { record.sources = [...sources, source]; changed = true; }
        }
    }
    if (changed) saveLearningStatsForBook();
    refreshReadingStats();
    const stats = statsForOccurrenceIds(scope, occurrenceIds);
    const descriptor = {
        bookKey: state.bookKey, scope, occurrences: pageWords.map(({ id, word, normalized }) => ({ id, word, normalized })),
        pageOccurrenceIds: occurrenceIds, matchedOccurrenceIds: pageWords.map(word => word.id),
        addedOccurrenceIds, sourceType: source,
        stats: { total: stats.total, helped: stats.helped, independent: stats.independent,
            readingPercent: stats.readingPercent, helpPercent: stats.helpPercent }
    };
    console.debug('[learning-stats] help coverage', {
        scope, sourceType: source, total: stats.total, helped: stats.helped,
        independent: stats.independent, readingPercent: stats.readingPercent,
        helpPercent: stats.helpPercent, addedOccurrenceIds
    });
    return descriptor;
}

function calculateCurrentPageStats() {
    const page = currentPageVocabulary();
    return statsForOccurrenceIds(page.scope, page.words.map(word => word.id));
}

function renderCefrDistribution(stats) {
    const bar = document.getElementById('reading-stats-cefr-bar');
    const list = document.getElementById('reading-stats-cefr-list');
    if (!bar || !list) return;
    bar.replaceChildren(); list.replaceChildren();
    const total = stats.tapped.length;
    for (const level of CEFR_LEVELS) {
        const count = stats.distribution[level];
        if (!count) continue;
        const pct = total ? Math.round(count * 100 / total) : 0;
        const segment = document.createElement('span');
        segment.className = `cefr-segment cefr-${level.toLowerCase()}`;
        segment.style.width = `${pct}%`; segment.title = `${level === 'unknown' ? t('statsUnknown') : level}: ${pct}%`;
        bar.appendChild(segment);
        const item = document.createElement('span');
        item.innerHTML = `<b>${level === 'unknown' ? t('statsUnknownShort') : level}</b> ${pct}%`;
        list.appendChild(item);
    }
    bar.classList.toggle('empty', !total);
    if (!total) {
        const empty = document.createElement('span'); empty.className = 'stats-empty'; empty.textContent = t('statsNoHelp'); list.appendChild(empty);
    }
}
function displayedLearningPercent(value) {
    return `${Math.round(value * 10) / 10}%`;
}
function updateReadingStatsNow() {
    readingStatsFrame = 0;
    const button = document.getElementById('reading-stats-button');
    const popover = document.getElementById('reading-stats-popover');
    if (!button || !popover) return;
    const stats = calculateCurrentPageStats();
    const value = document.getElementById('reading-stats-value');
    value.textContent = stats.total ? displayedLearningPercent(stats.readingPercent) : '—';
    button.style.setProperty('--coverage', `${stats.readingPercent * 3.6}deg`);
    button.disabled = !state.bookKey || !stats.total;
    button.setAttribute('aria-label', `${t('statsReading')}: ${displayedLearningPercent(stats.readingPercent)}`);
    document.getElementById('stats-reading-pct').textContent = displayedLearningPercent(stats.readingPercent);
    document.getElementById('stats-reading-pct-label').textContent = displayedLearningPercent(stats.readingPercent);
    document.getElementById('stats-help-pct').textContent = displayedLearningPercent(stats.helpPercent);
    document.getElementById('stats-total').textContent = stats.total;
    document.getElementById('stats-independent').textContent = stats.independent;
    document.getElementById('stats-helped').textContent = stats.helped;
    document.getElementById('reading-stats-ring').style.setProperty('--coverage', `${stats.readingPercent * 3.6}deg`);
    renderCefrDistribution(stats);
}
function refreshReadingStats() {
    cancelAnimationFrame(readingStatsFrame);
    readingStatsFrame = requestAnimationFrame(updateReadingStatsNow);
}
function closeReadingStats() {
    const button = document.getElementById('reading-stats-button');
    const popover = document.getElementById('reading-stats-popover');
    if (!button || !popover) return;
    popover.hidden = true; button.setAttribute('aria-expanded', 'false');
}

const readingStatsButton = document.getElementById('reading-stats-button');
const readingStatsPopover = document.getElementById('reading-stats-popover');
readingStatsButton?.addEventListener('click', event => {
    event.stopPropagation();
    const opening = readingStatsPopover.hidden;
    readingStatsPopover.hidden = !opening;
    readingStatsButton.setAttribute('aria-expanded', String(opening));
    if (opening) updateReadingStatsNow();
});
document.addEventListener('pointerdown', event => {
    if (!readingStatsPopover?.hidden && !event.target.closest('.reading-stats-control')) closeReadingStats();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeReadingStats(); });
refreshReadingStats();
