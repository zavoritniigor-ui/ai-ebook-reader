/* learning-stats.js — compact current-page reading/vocabulary statistics.
 *
 * The source model is deliberately position-based rather than DOM-wrapper-based:
 * taps are stored against a stable character offset inside a PDF page or a
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
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
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
        if (segmenter) for (const part of segmenter.segment(text)) {
            if (part.isWordLike) tokens.push({ word: part.segment, start: part.index, end: part.index + part.segment.length });
        }
    }
    if (!tokens.length) {
        const re = /[\p{L}\p{M}]+(?:['’ʼ-][\p{L}\p{M}]+)*/gu;
        let match;
        while ((match = re.exec(text))) tokens.push({ word: match[0], start: match.index, end: match.index + match[0].length });
    }
    return tokens.filter(token => {
        const word = normalizedLearningWord(token.word);
        return word && word.length <= 40 && !/(.)\1{4,}/u.test(word) && /\p{L}/u.test(word);
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
function tokenIsOnCurrentPage(pieces) {
    if (!pieces.length) return false;
    if (state.format === 'pdf') return true;
    const viewport = els.container.getBoundingClientRect();
    for (const piece of pieces) {
        try {
            const range = document.createRange();
            range.setStart(piece.node, piece.start); range.setEnd(piece.node, piece.end);
            for (const rect of range.getClientRects()) {
                if (rect.width > 0 && rect.height > 0 && rect.right > viewport.left + 1 && rect.left < viewport.right - 1 && rect.bottom > viewport.top + 1 && rect.top < viewport.bottom - 1) return true;
            }
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

function trackWordHelp(word, wordNode = state.lastWordNode) {
    if (!state.bookKey || !wordNode) return false;
    const page = currentPageVocabulary();
    let occurrence = page.words.find(entry => entry.pieces.some(piece => wordNode === piece.node || wordNode.contains?.(piece.node)));
    if (!occurrence) {
        const normalized = normalizedLearningWord(word);
        occurrence = page.words.find(entry => entry.normalized === normalized);
    }
    if (!occurrence || !page.scope) return false;
    const lang = langForText(occurrence.word).slice(0, 2);
    const taps = learningStatsBook.scopes[page.scope] || (learningStatsBook.scopes[page.scope] = {});
    if (!taps[occurrence.id]) {
        taps[occurrence.id] = { word: occurrence.word.slice(0, 80), normalized: occurrence.normalized, lang, cefr: cachedCefrLevel(occurrence.word, lang), at: Date.now() };
        saveLearningStatsForBook();
    }
    refreshReadingStats();
    return true;
}

function calculateCurrentPageStats() {
    const page = currentPageVocabulary();
    const visibleIds = new Set(page.words.map(word => word.id));
    const rawTaps = page.scope ? learningStatsBook.scopes[page.scope] || {} : {};
    const unique = new Map();
    for (const [id, tap] of Object.entries(rawTaps)) {
        if (!visibleIds.has(id) || !tap || !tap.normalized) continue;
        const key = `${tap.lang || ''}:${tap.normalized}`;
        if (!unique.has(key)) unique.set(key, { ...tap, cefr: CEFR_LEVELS.includes(tap.cefr) ? tap.cefr : 'unknown' });
    }
    const total = page.words.length;
    const helped = Math.min(total, unique.size);
    const helpPercent = total ? Math.round(helped * 100 / total) : 0;
    const readingPercent = total ? 100 - helpPercent : 0;
    const distribution = Object.fromEntries(CEFR_LEVELS.map(level => [level, 0]));
    for (const tap of unique.values()) distribution[tap.cefr || 'unknown']++;
    return { total, helped, independent: Math.max(0, total - helped), helpPercent, readingPercent, distribution, tapped: Array.from(unique.values()) };
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
function updateReadingStatsNow() {
    readingStatsFrame = 0;
    const button = document.getElementById('reading-stats-button');
    const popover = document.getElementById('reading-stats-popover');
    if (!button || !popover) return;
    const stats = calculateCurrentPageStats();
    const value = document.getElementById('reading-stats-value');
    value.textContent = stats.total ? `${stats.readingPercent}%` : '—';
    button.style.setProperty('--coverage', `${stats.readingPercent * 3.6}deg`);
    button.disabled = !state.bookKey || !stats.total;
    button.setAttribute('aria-label', `${t('statsReading')}: ${stats.readingPercent}%`);
    document.getElementById('stats-reading-pct').textContent = `${stats.readingPercent}%`;
    document.getElementById('stats-reading-pct-label').textContent = `${stats.readingPercent}%`;
    document.getElementById('stats-help-pct').textContent = `${stats.helpPercent}%`;
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
