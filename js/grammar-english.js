// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// ========== ENGLISH VERBS AND ADJECTIVES WITHOUT AI ==========
// The same for English as js/grammar-conjugation.js is for French (owner, 2026-11-24: the Grammar panel must be immediate and need
// no big AI request). The data is dict/en-verbs.json (built by tools/build_en_verbs.py from the English Wiktionary, CC BY-SA, see
// dict/NOTICE): ~7 800 verbs as their lemma + only the forms the spelling rules below do not give (go: goes||went|gone), ~5 700
// adjectives with their comparative / superlative, and how often a form is used as something else (a noun: «book», «light»).
// Every tense of the Grammar panel is built from these four forms with be / have / will / would, the way grammars teach it.
//   loadEnVerbTables()                     loads the data once (a Promise; null when the file cannot be had: the AI answers as before)
//   enVerbParadigm(lemma, tenseId)         {person: form} for a Grammar tense button (GRAMMAR_LANG_CONFIG.en.verb.tenses), or null
//   enVerbAnalyses(word)                   what a written form can be: [{lemma, slot}] (slot base / s / ing / past / pp)
//   localEnSentenceVerbs(text)             every verb group of a text: «has been eating», «did not call», «to see», «Ask»
//   localEnSentenceAdjectives(text, verbs) every adjective: before its noun, after a linking verb or very / more / most
//   localEnTappedVerb / localEnTappedAdjective (focus, text)   the tapped word's own item, read inside its sentence
const EN_VERB_TABLES_VERSION = '1b938c1f32fa';
const EN_VERB_TABLES_URL = 'dict/en-verbs.json?v=' + EN_VERB_TABLES_VERSION;
let enData = null, enLoading = null;
const enFold = v => String(v || '').replace(/[’ʼ‘]/g, "'").toLowerCase().trim();

function enVerbTablesReady() { return !!enData; }
function loadEnVerbTables() {
    if (enData) return Promise.resolve(enData);
    if (!enLoading) {
        enLoading = fetch(EN_VERB_TABLES_URL).then(r => (r.ok ? r.json() : null)).then(raw => {
            if (!raw || raw.format !== 1 || !Array.isArray(raw.verbs)) return null;
            const verbs = new Map(), irregular = new Map();
            const addIrregular = (form, lemma) => { const l = irregular.get(form); if (l) { if (!l.includes(lemma)) l.push(lemma); } else irregular.set(form, [lemma]); };
            raw.verbs.forEach((line, index) => {
                const [lemma, code = ''] = line.split('\t');
                if (verbs.has(lemma)) return;
                verbs.set(lemma, { lemma, code, index });
                if (code) code.split('|').forEach(cell => cell && cell.split(',').forEach(f => addIrregular(f, lemma)));
            });
            const adjectives = new Map(), adjIrregular = new Map();
            (raw.adjectives || []).forEach((line, index) => {
                const [lemma, code = ''] = line.split('\t');
                const key = enFold(lemma);   // «American» is looked up as «american»; «red» wins over «Red»
                if (adjectives.has(key) && !(/^\p{Lu}/u.test(adjectives.get(key).lemma) && !/^\p{Lu}/u.test(lemma))) return;
                adjectives.set(key, { lemma, code, index });
                if (code && code !== 'r' && code !== 'm') code.split('|').forEach((cell, k) => cell.split(',').forEach(f => adjIrregular.set(f, { lemma: key, degree: k ? 'superlative' : 'comparative' })));
            });
            enData = { verbs, irregular, adjectives, adjIrregular,
                homographs: new Map(Object.entries(raw.homographs || {})), adjHomographs: new Map(Object.entries(raw.adj_homographs || {})),
                adjParticiples: new Set(raw.adj_participles || []) };
            return enData;
        }).catch(() => null).finally(() => { if (!enData) enLoading = null; });
    }
    return enLoading;
}

// ---- the spelling rules (tools/build_en_verbs.py regular_verb / regular_adj are the same; the build checks every verb with them) ----
function enDoubles(w) {   // stop -> stopping, big -> bigger: one syllable, consonant + one vowel + consonant (not w, x, y)
    return /(?:^|[^aeiou])[aeiou][bcdfgklmnprstvz]$/.test(w) && (w.slice(0, -1) + 'x').match(/[aeiouy]+/g).length === 1 && !w.endsWith('qu');
}
function enRegularForms(w) {
    const s = /(?:s|x|z|ch|sh|o)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's';
    const st = enDoubles(w) ? w + w.slice(-1) : w;
    const ing = w.endsWith('ie') ? w.slice(0, -2) + 'ying' : /[^aeioy]e$/.test(w) ? w.slice(0, -1) + 'ing' : st + 'ing';
    const past = w.endsWith('e') ? w + 'd' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ied' : st + 'ed';
    return [s, ing, past, past];
}
function enRegularAdj(w) {
    if (w.endsWith('e')) return [w + 'r', w + 'st'];
    if (/[^aeiou]y$/.test(w)) return [w.slice(0, -1) + 'ier', w.slice(0, -1) + 'iest'];
    const st = enDoubles(w) ? w + w.slice(-1) : w;
    return [st + 'er', st + 'est'];
}
// be and the modals are not in the data: their forms are few and irregular in every person.
const EN_BE = { base: 'be', present: ['am', 'are', 'is', 'are', 'are', 'are'], past: ['was', 'were', 'was', 'were', 'were', 'were'], ing: 'being', pp: 'been' };
const EN_MODALS = { can: 'could', may: 'might', shall: 'should', will: 'would', must: null, could: null, might: null, should: null, would: null, ought: null };
// The four forms of a verb, each a list (the main spelling first): {base, s, ing, past, pp}
function enVerbForms(lemma) {
    if (lemma === 'be') return { base: 'be', s: ['is'], ing: ['being'], past: ['was', 'were'], pp: ['been'] };
    const e = enData && enData.verbs.get(lemma);
    if (!e) return null;
    const reg = enRegularForms(lemma);
    const cells = e.code ? e.code.split('|').map((c, i) => (c ? c.split(',') : [reg[i]])) : reg.map(c => [c]);
    return { base: lemma, s: cells[0], ing: cells[1], past: cells[2], pp: cells[3] };
}
// What a written form can be. Only the stems a regular ending can come from are looked up (walked -> walk, stopped -> stop,
// studies -> study, loving -> love), and the few irregular forms by themselves -- no index of every form.
function enVerbAnalyses(word) {
    if (!enData) return [];
    const w = enFold(word);
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(w)) return [];
    if (Object.hasOwn(EN_BE_FORMS, w)) return [{ lemma: 'be', slot: EN_BE_FORMS[w], index: -1 }];
    const cands = new Set([w, ...(enData.irregular.get(w) || [])]);
    const strip = (suffix, add) => { if (w.length > suffix.length && w.endsWith(suffix)) cands.add(w.slice(0, -suffix.length) + add); };
    strip('s', ''); strip('es', ''); strip('ies', 'y');
    for (const end of ['ing', 'ed']) {
        strip(end, ''); strip(end, 'e');
        if (w.length > end.length + 2 && w.endsWith(end) && w[w.length - end.length - 1] === w[w.length - end.length - 2]) cands.add(w.slice(0, -end.length - 1));
    }
    strip('ied', 'y'); strip('ying', 'ie'); strip('d', '');
    const out = [];
    for (const lemma of cands) {
        const f = enVerbForms(lemma);
        if (!f) continue;
        const index = enData.verbs.get(lemma).index;
        if (f.base === w) out.push({ lemma, slot: 'base', index });
        for (const slot of ['s', 'ing', 'past', 'pp']) if (f[slot].includes(w)) out.push({ lemma, slot, index });
    }
    return out.sort((a, b) => a.index - b.index);
}
const EN_BE_FORMS = { be: 'base', am: 'present', is: 's', are: 'present', was: 'past', were: 'past', been: 'pp', being: 'ing', "'m": 'present', "'re": 'present' };

// ---- the paradigm of a Grammar tense button ----
// persons: I, you, he / she / it, we, you (plural), they (GRAMMAR_LANG_CONFIG.en.verb.persons)
const EN_TENSE_BUILD = {
    present_simple: (f, p, be) => (be ? EN_BE.present[p] : p === 2 ? f.s[0] : f.base),
    present_continuous: (f, p) => EN_BE.present[p] + ' ' + f.ing[0],
    past_simple: (f, p, be) => (be ? EN_BE.past[p] : f.past[0]),
    past_continuous: (f, p) => EN_BE.past[p] + ' ' + f.ing[0],
    present_perfect: (f, p) => (p === 2 ? 'has ' : 'have ') + f.pp[0],
    past_perfect: f => 'had ' + f.pp[0],
    future_simple: f => 'will ' + f.base,
    conditional: f => 'would ' + f.base
};
function enVerbParadigm(lemma, tenseId) {
    const persons = grammarConfigFor('en').verb.persons, build = EN_TENSE_BUILD[tenseId];
    const l = enFold(lemma).replace(/^to\s+/, '');
    if (!enData || !build || !persons.length) return null;
    const out = {};
    if (Object.hasOwn(EN_MODALS, l)) {   // can / could…: one form for every person, a past only for can, may, shall, will
        const v = tenseId === 'present_simple' ? l : tenseId === 'past_simple' ? EN_MODALS[l] : null;
        if (!v) return null;
        persons.forEach(k => { out[k] = v; });
        return out;
    }
    const f = enVerbForms(l);
    if (!f) return null;
    persons.forEach((k, p) => { out[k] = build(f, p, l === 'be'); });
    return out;
}

// ---- tokens: words, and the contractions split into the words they stand for (don't = do + not, I'm = I + am) ----
const EN_CONTRACTED = { "n't": 'not', "'m": 'am', "'re": 'are', "'ve": 'have', "'ll": 'will' };
const EN_WHOLE_CONTRACTIONS = { cannot: ['can', 'can'], "can't": ['ca', 'can'], "won't": ['wo', 'will'], "shan't": ['sha', 'shall'], "ain't": ['ai', 'am'] };
function enTokens(text) {
    const out = [], re = /\p{L}+(?:['’]\p{L}+)*(?:-\p{L}+)*/gu;
    let m;
    while ((m = re.exec(text))) {
        const raw = m[0], fold = enFold(raw), at = m.index;
        const push = (t, start, extra) => out.push(Object.assign({ text: t, fold: enFold(t), start, end: start + t.length, w: enFold(t) }, extra || {}));
        if (EN_WHOLE_CONTRACTIONS[fold]) {
            const [head, word] = EN_WHOLE_CONTRACTIONS[fold];
            push(raw.slice(0, head.length), at, { w: word });
            push(raw.slice(head.length), at + head.length, { w: 'not', contracted: true });
            continue;
        }
        const cm = /^(.+?)(n['’]t|['’](?:m|re|ve|ll|d|s))$/i.exec(raw);
        if (cm) {
            const part = enFold(cm[2]);
            push(cm[1], at);
            push(cm[2], at + cm[1].length, { w: EN_CONTRACTED[part] || part, contracted: true });
            continue;
        }
        push(raw, at);
    }
    // what 's and 'd stand for: is / has / a possessive, had / would -- from the word after them
    for (let i = 0; i < out.length; i++) {
        const t = out[i];
        if (t.w !== "'s" && t.w !== "'d") continue;
        const next = nextWord(out, i);
        const an = next ? enVerbAnalyses(next.text) : [];
        if (t.w === "'d") { t.w = an.some(a => a.slot === 'pp' || a.lemma === 'better') && !an.some(a => a.slot === 'base') ? 'had' : an.some(a => a.slot === 'base') ? 'would' : 'had'; continue; }
        const prev = out[i - 1];
        if (!next || /[,;:.!?]/.test(text.slice(t.end, next.start))) { t.w = prev && /^(?:he|she|it|that|there|what|who|here|this)$/.test(prev.fold) ? 'is' : 'POSS'; continue; }
        const pron = prev && /^(?:he|she|it|that|there|what|who|here|where|how|this|which|everyone|everything|nobody|someone|something)$/.test(prev.fold);
        if (pron || (next && (an.some(a => a.slot === 'ing') || /^(?:not|been|got|going|never|always|just|already|a|an|the|very|so)$/.test(next.fold)))) {
            t.w = next && an.some(a => a.slot === 'pp' && a.lemma !== 'be') && !an.some(a => a.slot === 'ing' || a.slot === 'base') && next.fold !== 'got' ? 'has' : next && next.fold === 'been' ? 'has' : next && next.fold === 'got' ? 'has' : 'is';
        } else t.w = 'POSS';   // the artist's: a possessive, no verb
    }
    return out;
}
const nextWord = (tokens, i) => tokens[i + 1] || null;

// ---- closed classes ----
const EN_SUBJECT = { i: [0, 'singular'], you: [1, null], he: [2, 'singular'], she: [2, 'singular'], it: [2, 'singular'], we: [3, 'plural'], they: [5, 'plural'],
    this: [2, 'singular'], that: [2, 'singular'], there: [2, null], one: [2, 'singular'], these: [5, 'plural'], those: [5, 'plural'], everyone: [2, 'singular'],
    everybody: [2, 'singular'], someone: [2, 'singular'], somebody: [2, 'singular'], nobody: [2, 'singular'], everything: [2, 'singular'], something: [2, 'singular'],
    nothing: [2, 'singular'], anyone: [2, 'singular'], anything: [2, 'singular'], who: [2, null], which: [2, null], what: [2, 'singular'], all: [5, 'plural'] };
const EN_RELATIVE = new Set(['who', 'which', 'that']);
const EN_DETERMINERS = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'some', 'any', 'no', 'every',
    'each', 'many', 'much', 'few', 'several', 'both', 'either', 'neither', 'another', 'other', 'such', 'whose', 'what', 'which', 'more', 'most', 'less', 'all',
    'POSS', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'first', 'last', 'next', 'own', 'same']);
const EN_PREPOSITIONS = new Set(['of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'onto', 'upon', 'about', 'over', 'under', 'after', 'before', 'between',
    'through', 'during', 'without', 'within', 'against', 'among', 'towards', 'toward', 'across', 'behind', 'beyond', 'near', 'since', 'until', 'till', 'than', 'per',
    'via', 'off', 'around', 'along', 'despite', 'like', 'as', 'beside', 'besides', 'inside', 'outside', 'throughout', 'concerning', 'regarding', 'including', 'except']);
const EN_CONJUNCTIONS = new Set(['and', 'or', 'but', 'nor', 'so', 'yet', 'because', 'although', 'though', 'if', 'unless', 'while', 'whereas', 'whether', 'when',
    'where', 'why', 'how', 'once', 'whenever', 'wherever', 'since', 'until', 'till', 'as', 'that', 'which', 'who', 'whom', 'what', 'after', 'before', 'then', 'than']);
// words that may stand inside a verb group (has NOT been, will ALSO go, did he EVER know)
const EN_BETWEEN = new Set(['not', 'never', 'also', 'always', 'just', 'already', 'still', 'even', 'ever', 'only', 'really', 'probably', 'certainly', 'surely',
    'often', 'usually', 'soon', 'yet', 'all', 'both', 'now', 'then', 'actually', 'simply', 'definitely', 'indeed', 'hardly', 'rarely', 'sometimes', 'almost',
    'quite', 'once', 'merely', 'barely', 'scarcely', 'perhaps', 'possibly', 'nearly', 'seldom', 'mostly', 'further', 'thus', 'therefore', 'again', 'long', 'so']);
const enIsAdverb = t => !!t && (EN_BETWEEN.has(t.fold) || (t.fold.length > 4 && t.fold.endsWith('ly') && !enData.adjectives.has(t.fold) && !enVerbAnalyses(t.text).length));
const EN_INTENSIFIERS = new Set(['very', 'so', 'too', 'quite', 'rather', 'extremely', 'really', 'more', 'most', 'less', 'least', 'fairly', 'pretty', 'incredibly',
    'highly', 'truly', 'particularly', 'especially', 'remarkably', 'increasingly', 'completely', 'totally', 'absolutely', 'entirely', 'slightly', 'somewhat', 'fully',
    'deeply', 'perfectly', 'how', 'as', 'that', 'utterly', 'terribly', 'awfully', 'unusually', 'surprisingly', 'relatively', 'reasonably', 'equally', 'newly', 'not']);
const EN_LINKING = new Set(['be', 'seem', 'become', 'look', 'feel', 'remain', 'get', 'sound', 'appear', 'stay', 'grow', 'turn', 'prove', 'keep', 'go', 'come', 'smell', 'taste']);
const EN_PARTICLES = new Set(['up', 'down', 'out', 'off', 'away', 'back', 'in', 'on', 'over', 'around', 'about', 'through', 'along', 'forward', 'apart', 'aside']);
const EN_AUX = { do: 'do', does: 'do', did: 'do', have: 'have', has: 'have', had: 'have', having: 'have', "'ve": 'have',
    am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', be: 'be', been: 'be', being: 'be', "'m": 'be', "'re": 'be',
    will: 'modal', would: 'modal', shall: 'modal', should: 'modal', can: 'modal', could: 'modal', may: 'modal', might: 'modal', must: 'modal', ought: 'modal' };
const enAuxOf = t => (t ? EN_AUX[t.w] || null : null);
const enHomograph = form => (enData && Number(enData.homographs.get(enFold(form)))) || 0;
const enAdjHomograph = form => (enData && Number(enData.adjHomographs.get(enFold(form)))) || 0;
const enIsName = (t, i, tokens, text) => /^\p{Lu}/u.test(t.text) && !enSentenceStartAt(tokens, i, text) && t.fold !== 'i';
function enSentenceStartAt(tokens, i, text) {
    const before = text.slice(i > 0 ? tokens[i - 1].end : 0, tokens[i].start);
    return i === 0 ? !/\p{L}/u.test(text.slice(0, tokens[i].start)) : /[.!?…:]["”’)\]]?\s*["“‘(\[]?\s*$/.test(before) || /["“]\s*$/.test(before);
}
function enClauseBreakBefore(tokens, i, text) {
    if (i === 0) return true;
    return /[,;:—–()"“”!?.]/.test(text.slice(tokens[i - 1].end, tokens[i].start));
}

// ---- verb groups ----
// The labels the AI is asked for (GRAMMAR_LANG_CONFIG.en.verb.features), and the Grammar panel tense each one shows.
const EN_TENSE_ID = { 'present simple': 'present_simple', 'present continuous': 'present_continuous', 'past simple': 'past_simple',
    'past continuous': 'past_continuous', 'present perfect': 'present_perfect', 'past perfect': 'past_perfect', 'future simple': 'future_simple', conditional: 'conditional' };
const EN_PERSON_LABEL = ['1st person', '2nd person', '3rd person'];
// The tense of a chain of auxiliaries + its main verb: [will, have] + pp = future perfect; [was, being] + pp = past continuous,
// passive. The first word carries the time (was, has, will, could…); have / been / being / be the aspect and the voice.
const EN_PRESENT_AUX = new Set(['am', 'is', 'are', "'m", "'re", 'have', 'has', "'ve", 'do', 'does']), EN_PAST_AUX = new Set(['was', 'were', 'had', 'did']);
function enChainTense(auxes, mainSlot) {
    const words = auxes.map(a => a.w), first = words[0], last = words[words.length - 1];
    const passive = mainSlot === 'pp' && EN_AUX[last] === 'be';
    const continuous = (mainSlot === 'ing' && EN_AUX[last] === 'be') || (passive && words.includes('being'));
    const perfect = words.some(w => EN_AUX[w] === 'have') && (mainSlot === 'pp' || words.includes('been'));
    const aspect = perfect && continuous ? 'perfect continuous' : perfect ? 'perfect' : continuous ? 'continuous' : 'simple';
    let tense = null, modal = null;
    if (first === 'will' || first === 'shall') tense = 'future ' + aspect;
    else if (first === 'would') tense = aspect === 'simple' ? 'conditional' : 'conditional ' + aspect;
    else if (EN_AUX[first] === 'modal') modal = first;
    else if (EN_PAST_AUX.has(first)) tense = 'past ' + aspect;
    else if (EN_PRESENT_AUX.has(first)) tense = 'present ' + aspect;
    return { tense, aspect, passive, modal };
}
// The person / number of a subject, its own text, from the words before the group (a pronoun, a noun, «who» after a noun).
// A noun inside «of …» / «in …» is not the subject: «the advantages of flying cars outweigh» -> advantages.
const EN_LY_ADJECTIVES = new Set(['likely', 'only', 'early', 'daily', 'weekly', 'monthly', 'yearly', 'hourly', 'lonely', 'lively', 'deadly', 'elderly', 'friendly', 'lovely', 'ugly', 'holy', 'silly', 'costly', 'orderly', 'kindly', 'sickly', 'timely', 'unlikely', 'manly', 'womanly', 'leisurely', 'cowardly', 'scholarly', 'beastly', 'ghastly', 'homely', 'jolly', 'bodily', 'worldly', 'unruly', 'curly', 'burly', 'surly', 'smelly', 'chilly', 'hilly', 'oily', 'woolly', 'bully', 'brotherly', 'motherly', 'fatherly', 'sisterly', 'heavenly', 'lowly', 'stately', 'comely', 'portly', 'courtly', 'saintly', 'shapely', 'sprightly', 'gentlemanly', 'neighbourly', 'neighborly', 'northerly', 'southerly', 'easterly', 'westerly']);
const EN_QUANTITY = new Set(['majority', 'number', 'lot', 'lots', 'half', 'rest', 'plenty', 'couple', 'percent', 'minority', 'most', 'some', 'many', 'all', 'none', 'kind', 'sort', 'type', 'variety', 'range', 'group']);
const EN_OBJECT_PRONOUNS = new Set(['me', 'him', 'her', 'us', 'them']);
function enNounNumber(t, j, tokens, text) {
    return /^\p{Lu}/u.test(t.text) ? 'singular' : /[^s'u]s$/.test(t.fold) || ['people', 'children', 'men', 'women', 'police', 'feet', 'teeth', 'mice'].includes(t.fold) ? 'plural' : 'singular';
}
function enSubjectBefore(tokens, i, text) {
    for (let j = i - 1, n = 0; j >= 0 && n < 10; j--, n++) {
        const t = tokens[j];
        // «Hi, thanks», «John, come here»: one word and a comma at the start of a sentence is someone spoken to, not the subject
        if (enClauseBreakBefore(tokens, j + 1, text) && j + 1 <= i && /,/.test(text.slice(t.end, tokens[j + 1].start)) && (enSentenceStartAt(tokens, j, text) || (j > 0 && enSentenceStartAt(tokens, j - 1, text) && /^(?:hello|hi|hey|oh|well|yes|no|dear|thanks)$/.test(tokens[j - 1].fold)))) return null;
        // existential «there» is the subject of be (there is), seem, appear… -- not of «Hello there, friend»
        if (t.fold === 'there' && !enAuxOf(tokens[i]) && !/^(?:seem|seems|seemed|appear|appears|appeared|exist|exists|existed|remain|remains|remained|come|comes|came|live|lived|stand|stands|stood|lie|lies|lay|follow|follows|followed)$/.test(tokens[i].fold)) return null;
        if (enIsAdverb(t) || t.w === 'not') continue;
        if (Object.hasOwn(EN_SUBJECT, t.fold) && !(t.fold === 'that' && j + 1 < i && !enIsAdverb(tokens[j + 1]) && !EN_RELATIVE.has(t.fold))) {
            const head = tokens[j - 1];
            if (EN_RELATIVE.has(t.fold) && head && !EN_SUBJECT[head.fold] && !enAuxOf(head) && !EN_CONJUNCTIONS.has(head.fold) && !EN_PREPOSITIONS.has(head.fold) && head.w !== 'not') {
                // «a man who is», «the cars that are», «targets, which have»
                return { person: 2, number: enNounNumber(head, j - 1, tokens, text), text: head.text, relative: true, at: j };
            }
            const [person, number] = EN_SUBJECT[t.fold];
            return { person, number, text: t.text, pronoun: true, at: j };
        }
        if (EN_OBJECT_PRONOUNS.has(t.fold) || EN_PREPOSITIONS.has(t.fold) || EN_CONJUNCTIONS.has(t.fold) || enAuxOf(t) || t.fold === 'to') return null;
        if (EN_DETERMINERS.has(t.w) || t.w === 'POSS') continue;
        if (/^(?:here|there|now|then|today|tonight|yesterday|tomorrow|too|instead|anyway)$/.test(t.fold)) continue;
        // a verb of a relative clause: the subject is the noun before «who / which / that» («The man who lives here is kind»)
        if (enVerbAnalyses(t.text).length && !/^\p{Lu}/u.test(t.text)) {
            let r = j - 1;
            while (r > 0 && enIsAdverb(tokens[r])) r--;
            if (r > 0 && EN_RELATIVE.has(tokens[r].fold)) return enSubjectBefore(tokens, r, text);   // «who lives», «which always seemed»
            if (enHomograph(t.text) < 0.5) return null;
        }
        // a noun (or a name); when a preposition stands before its phrase, the noun before that preposition is the subject
        let k = j - 1;
        while (k >= 0 && k >= j - 3 && (EN_DETERMINERS.has(tokens[k].w) || tokens[k].w === 'POSS' || enAdjAnalyses(tokens[k].text).length || enVerbAnalyses(tokens[k].text).some(a => a.slot === 'ing')) && !EN_PREPOSITIONS.has(tokens[k].fold)) k--;
        if (k >= 1 && ['of', 'in', 'on', 'for', 'with', 'from', 'at', 'about', 'behind', 'by', 'between', 'among', 'like'].includes(tokens[k].fold) && !enClauseBreakBefore(tokens, k, text)) {
            const head = enSubjectBefore(tokens, k, text);
            if (head && head.noun && !EN_QUANTITY.has(enFold(head.text))) return head;
            if (head && tokens[k].fold === 'of') return { person: 2, number: enNounNumber(t, j, tokens, text), text: t.text, at: j, noun: true };
            return null;
        }
        return { person: 2, number: enNounNumber(t, j, tokens, text), text: t.text, at: j, noun: true };
    }
    return null;
}
function enVerbItem(g, text) {
    const { lemma, tense, aspect, person, number, auxWords, surface, subject, kind, passive, modal, main } = g;
    const features = {};
    if (tense) features.tense = tense;
    if (aspect && kind === 'finite' && !modal) features.aspect = aspect;
    if (person !== null && person !== undefined && kind === 'finite') {
        features.person = EN_PERSON_LABEL[person % 3];
        if (number) features.number = number;
    }
    if (auxWords.length) features.auxiliary = auxWords.join(' ');
    const sentences = typeof grammarSplitSentences === 'function' ? grammarSplitSentences(text) : [text];
    const sentence = sentences.find(s => s.includes(surface)) || text;
    const before = text.slice(0, g.start), sStart = text.indexOf(sentence) >= 0 && text.indexOf(sentence) <= g.start ? text.indexOf(sentence) : 0;
    let occurrence = 1;
    for (let at = before.indexOf(surface, sStart); at >= 0 && at < g.start; at = before.indexOf(surface, at + 1)) occurrence++;
    const tenseId = EN_TENSE_ID[tense] || 'present_simple';
    let stemBreakdown = null;
    if (!auxWords.length && !surface.includes(' ') && lemma !== 'be') {
        const f = enVerbForms(lemma), reg = enRegularForms(lemma), w = enFold(surface);
        if (f && [reg[0], reg[1], reg[2]].includes(w) && w !== lemma) {
            let k = 0; while (k < lemma.length && k < w.length && lemma[k] === w[k]) k++;
            let ending = w.slice(k);
            if (!(grammarConfigFor('en').verb.endings || []).includes(ending) && ending.length > 1 && ending[0] === w[k - 1]) { k++; ending = ending.slice(1); }
            if ((grammarConfigFor('en').verb.endings || []).includes(ending)) stemBreakdown = { stem: surface.slice(0, k), ending: surface.slice(k) };
        }
    }
    const rule = g.rule ? g.rule : passive ? 'passive-voice' : modal ? 'modal-verbs' : kind === 'infinitive' || kind === 'gerund' ? 'infinitive-gerund' : kind === 'participle' ? 'participle-clauses' : null;
    return {
        pos: 'verb', lemma, surface, sentence, occurrence, agreesWith: subject || null, features, explanation: '', rule, stemBreakdown,
        forms: enVerbParadigm(lemma, tenseId)
    };
}

// Reads every verb group of a text. Each group: {start, end, main (token index), lemma, tense, aspect, person, number, kind, …}
function enReadGroups(text) {
    const tokens = enTokens(text), groups = [], used = new Set();
    let clauseFinite = false, lastSubject = null;
    // a new clause: after punctuation, or a conjunction -- «and» / «or» only when a subject or a verb follows (not «markets and supermarkets»)
    const breakAt = i => {
        if (enClauseBreakBefore(tokens, i, text)) return true;
        const p = tokens[i - 1];
        if (!p || !EN_CONJUNCTIONS.has(p.fold) || ['than', 'as'].includes(p.fold)) return false;
        if (!['and', 'or', 'but', 'nor'].includes(p.fold)) return true;
        const t = tokens[i];
        return !!(EN_SUBJECT[t.fold] || EN_DETERMINERS.has(t.fold) || enAuxOf(t) || (enVerbAnalyses(t.text).some(a => a.slot === 'past' || a.slot === 's') && enHomograph(t.text) < 0.5) || enIsAdverb(t));
    };
    const skipBetween = (k, allowSubject) => {   // past adverbs / not (and, in a question, the subject: «Do you think», «Did the man go»)
        let subj = null;
        for (let n = 0; k < tokens.length && n < 5; n++) {
            const t = tokens[k];
            if (enIsAdverb(t) || t.w === 'not') { k++; continue; }
            if (allowSubject && !subj && Object.hasOwn(EN_SUBJECT, t.fold) && !EN_RELATIVE.has(t.fold) && t.fold !== 'there' || (allowSubject && !subj && t.fold === 'there')) { subj = { tok: t, at: k }; k++; continue; }
            if (allowSubject && !subj && (EN_DETERMINERS.has(t.fold) || /^\p{Lu}/u.test(t.text))) {   // «does the car need», «Are Flying Cars About»
                let e = k + (EN_DETERMINERS.has(t.fold) ? 1 : 0);
                while (e < tokens.length && e - k < 3 && !enVerbAnalyses(tokens[e].text).some(a => a.slot === 'base' || a.slot === 'ing' || a.slot === 'pp') && !EN_PREPOSITIONS.has(tokens[e].fold)) e++;
                if (e > k && e < tokens.length && e - k <= 3 && tokens[e - 1] && !EN_DETERMINERS.has(tokens[e - 1].fold)) { subj = { tok: tokens[e - 1], at: e - 1, noun: true }; k = e; continue; }
                if (EN_DETERMINERS.has(t.fold) && tokens[k + 1] && tokens[k + 2]) { subj = { tok: tokens[k + 1], at: k + 1, noun: true }; k += 2; continue; }
            }
            break;
        }
        return { k, subj };
    };
    for (let i = 0; i < tokens.length; i++) {
        if (used.has(i)) continue;
        const t = tokens[i];
        if (breakAt(i)) clauseFinite = false;
        if (t.w === 'POSS' || t.w === 'not') continue;
        const aux = enAuxOf(t);
        // «had better go», «'d better»: one modal group
        if ((t.w === 'had' || t.fold === "'d") && tokens[i + 1] && ['better', 'best'].includes(tokens[i + 1].fold)) {
            const k = skipBetween(i + 2, false).k, a = tokens[k] && enVerbAnalyses(tokens[k].text).find(x => x.slot === 'base');
            if (a) {
                const sb = enSubjectBefore(tokens, i, text);
                for (let q = i; q <= k; q++) used.add(q);
                groups.push({ start: t.start, end: tokens[k].end, mainTok: tokens[k], main: k, lemma: a.lemma, tense: null, aspect: 'simple', passive: false, modal: 'had ' + tokens[i + 1].fold,
                    person: sb ? sb.person : null, number: sb ? sb.number : null, kind: 'finite', subject: sb ? sb.text : null, auxWords: ['had', tokens[i + 1].fold], surface: text.slice(t.start, tokens[k].end) });
                clauseFinite = true; i = k; continue;
            }
        }
        if (aux && !(t.fold === 'that')) {
            // ---- a chain of auxiliaries, then (maybe) its main verb ----
            const chain = [{ i, w: t.w, tok: t }];
            const question = enSentenceStartAt(tokens, i, text) || breakAt(i) || (i > 0 && /^(?:what|why|how|where|when|who|which)$/.test(tokens[i - 1].fold));
            let k = i + 1, subj = null;
            const nextP = tokens[skipBetween(k, false).k];
            const first = skipBetween(k, (question && !enSubjectBefore(tokens, i, text)) || !!(nextP && (EN_SUBJECT[nextP.fold] && !EN_RELATIVE.has(nextP.fold) && !['this', 'that', 'all', 'one', 'what'].includes(nextP.fold) || nextP.fold === 'there')));
            k = first.k; subj = first.subj;
            for (;;) {
                const nt = tokens[k];
                const nAux = enAuxOf(nt);
                const prevW = chain[chain.length - 1].w;
                // only the auxiliaries that can follow: will -> be / have; have -> been; be -> being; to «ought to»
                const canFollow = nt && nAux && (
                    (EN_AUX[prevW] === 'modal' && (nt.w === 'be' || nt.w === 'have')) ||
                    (EN_AUX[prevW] === 'have' && nt.w === 'been') || (EN_AUX[prevW] === 'be' && nt.w === 'being') ||
                    (prevW === 'been' && nt.w === 'being'));
                if (!canFollow) break;
                // «have» after a modal is the perfect only when a past participle follows («would have made»), «be» likewise
                const look = skipBetween(k + 1, false).k;
                const after = tokens[look] ? enVerbAnalyses(tokens[look].text) : [];
                if (nt.w === 'have' && !after.some(a => a.slot === 'pp') && tokens[look]?.w !== 'been') break;
                chain.push({ i: k, w: nt.w, tok: nt });
                k = skipBetween(k + 1, false).k;
            }
            if (chain[0].w === 'ought' && tokens[k] && tokens[k].fold === 'to') k++;
            const last = chain[chain.length - 1].w, lastKind = EN_AUX[last];
            const want = lastKind === 'modal' || lastKind === 'do' ? ['base'] : lastKind === 'have' ? ['pp'] : last === 'being' ? ['pp'] : lastKind === 'be' ? ['ing', 'pp'] : [];
            // «were very well justified», «is most certainly leading»: past very / well / most to a participle used as a verb
            for (let look = k, n = 0; lastKind === 'be' && tokens[look] && n < 3 && /^(?:very|well|most|so|too|quite|much|more)$/.test(tokens[look].fold); n++) {
                look = skipBetween(look + 1, false).k;
                const w = tokens[look];
                if (w && enVerbAnalyses(w.text).some(a => want.includes(a.slot)) && !enData.adjParticiples.has(w.fold)) { k = look; break; }
            }
            const mt = tokens[k];
            let main = null;
            if (mt && !used.has(k) && mt.w !== 'POSS') {
                const an = enVerbAnalyses(mt.text).filter(a => want.includes(a.slot));
                // be + an adjective that is also a participle: «was tired», «is interesting» -- the adjective, unless «by» follows (passive)
                const adjLike = lastKind === 'be' && an.length && enData.adjParticiples.has(enFold(mt.text)) && !(tokens[k + 1] && tokens[k + 1].fold === 'by');
                // be + -ing of a word mostly used as a noun with a determiner before it is no verb: «is the building»
                if (an.length && !adjLike && !(lastKind === 'have' && an.every(a => a.slot === 'pp') && enHomograph(mt.text) > 0.9 && !enVerbAnalyses(mt.text).some(a => a.slot === 'pp' && a.lemma !== 'be' && enIrregularPP(a.lemma)))) {
                    // the most common verb, the base reading after a modal
                    an.sort((a, b) => (a.slot === want[0] ? 0 : 1) - (b.slot === want[0] ? 0 : 1) || a.index - b.index);
                    main = { k, a: an[0] };
                }
            }
            if (!main && lastKind === 'modal' && chain.length === 1) continue;    // «I can.»: an ellipsis
            if (!main && (lastKind === 'have' || lastKind === 'be' || lastKind === 'do') && chain.length > 1) {
                // «has been»: be is the main verb (has been happy); «would have» + noun: have
                const m = chain.pop();
                main = { k: m.i, a: { lemma: EN_AUX[m.w] === 'be' ? 'be' : EN_AUX[m.w] === 'have' ? 'have' : 'do', slot: m.w === 'been' ? 'pp' : m.w === 'being' ? 'ing' : m.w === 'have' ? 'base' : m.w === 'be' ? 'base' : 'x' } };
            }
            if (!main) {
                // the auxiliary alone is the main verb: «It was not yet three», «he has a hat», «I did»
                if (lastKind === 'modal') continue;
                chain.pop();
                main = { k: i, a: { lemma: aux === 'be' ? 'be' : aux === 'have' ? 'have' : 'do', slot: /^(?:did|was|were|had)$/.test(t.w) ? 'past' : 'present' } };
            }
            const auxes = chain;
            const mainSlot = main.a.slot;
            const ct = auxes.length ? enChainTense(auxes, mainSlot) : { tense: mainSlot === 'past' ? 'past simple' : 'present simple', aspect: 'simple', passive: false, modal: null };
            // the subject: before the group, or inside it (a question)
            let s = subj ? (Object.hasOwn(EN_SUBJECT, subj.tok.fold) && !subj.noun ? { person: EN_SUBJECT[subj.tok.fold][0], number: EN_SUBJECT[subj.tok.fold][1], text: subj.tok.text }
                : { person: 2, number: /[^s']s$/.test(subj.tok.fold) ? 'plural' : 'singular', text: subj.tok.text }) : enSubjectBefore(tokens, i, text);
            const firstW = auxes.length ? auxes[0].w : t.w;
            const n = enNumberOfForm(firstW);
            let person = s ? s.person : (n ? 2 : null), number = n || (s ? s.number : null);
            if (firstW === 'am' || firstW === "'m") { person = 0; number = 'singular'; }
            if (s && s.person === 1 && !n) number = null;
            if (s && (s.person === 0 || s.person === 3)) number = s.person === 0 ? 'singular' : 'plural';
            if (s && s.person === 5 && !n) number = 'plural';
            const from = auxes.length ? auxes[0].i : main.k, to = main.k;
            const contiguous = to - from <= 3 && !tokens.slice(from, to + 1).some((x, q) => q > 0 && /[,;:()"“”]/.test(text.slice(tokens[from + q - 1].end, x.start)))
                && !(subj && subj.at > from && subj.at < to);
            const surface = contiguous ? text.slice(tokens[from].start, tokens[to].end) : tokens[to].text;
            const auxWords = auxes.map(a => (/^(?:ca|wo|sha|ai)$/i.test(a.tok.text) || a.tok.contracted ? a.w : a.tok.text.toLowerCase()));
            for (let q = from; q <= to; q++) used.add(q);
            // «to be», «to be done», «to have seen»: an infinitive, no tense or person of its own
            if (tokens[from - 1] && tokens[from - 1].fold === 'to' && /^(?:be|have)$/.test(tokens[from].w)) {
                groups.push({ start: tokens[contiguous ? from : to].start, end: tokens[to].end, mainTok: tokens[to], main: to, lemma: main.a.lemma, tense: null, aspect: null,
                    passive: ct.passive, modal: null, person: null, number: null, kind: 'infinitive', subject: null, auxWords, surface });
                continue;
            }
            groups.push({ start: tokens[contiguous ? from : to].start, end: tokens[to].end, mainTok: tokens[to], main: to, lemma: main.a.lemma, tense: ct.modal ? null : ct.tense, aspect: ct.aspect,
                passive: ct.passive, modal: ct.modal, person, number, kind: 'finite', subject: s ? s.text : null, auxWords, surface });
            clauseFinite = true; if (s) lastSubject = s;
            continue;
        }
        // ---- a verb form with no auxiliary ----
        if (t.fold.length < 2 && t.fold !== 'i') continue;
        // «used to be»: a past habit, one group
        if (t.fold === 'used' && tokens[i + 1] && tokens[i + 1].fold === 'to' && tokens[i + 2] && enVerbAnalyses(tokens[i + 2].text).some(a => a.slot === 'base')) {
            const a = enVerbAnalyses(tokens[i + 2].text).find(x => x.slot === 'base');
            const s = enSubjectBefore(tokens, i, text);
            used.add(i); used.add(i + 1); used.add(i + 2);
            groups.push({ start: t.start, end: tokens[i + 2].end, mainTok: tokens[i + 2], main: i + 2, lemma: a.lemma, tense: 'past simple', aspect: 'simple', passive: false, modal: null,
                person: s ? s.person : 2, number: s ? s.number : null, kind: 'finite', subject: s ? s.text : null, auxWords: ['used to'], surface: text.slice(t.start, tokens[i + 2].end), rule: 'used-to-would' });
            clauseFinite = true; i += 2; continue;
        }
        const an = enVerbAnalyses(t.text);
        if (!an.length || (EN_SUBJECT[t.fold] && t.fold !== 'one') || EN_DETERMINERS.has(t.fold) || (EN_PREPOSITIONS.has(t.fold) && t.fold !== 'like') || EN_CONJUNCTIONS.has(t.fold) || enIsAdverb(t)) continue;
        const prev = (() => { for (let j = i - 1; j >= 0; j--) { if (enIsAdverb(tokens[j]) && !EN_DETERMINERS.has(tokens[j].fold)) continue; return { tok: tokens[j], j }; } return null; })();
        const pt = prev && prev.tok, pj = prev ? prev.j : -1;
        const direct = tokens[i - 1];
        const share = enHomograph(t.text);
        const has = slot => an.find(a => a.slot === slot);
        // a capitalised word inside a sentence is a name («Miss Turner», «the Serpentine»), unless «to» / a modal asks for a verb (a title)
        if (enIsName(t, i, tokens, text) && !(pt && (pt.fold === 'to' || EN_AUX[pt.w] === 'modal'))) continue;
        const sentStart = enSentenceStartAt(tokens, i, text);
        const clauseStart = sentStart || (pj >= 0 ? enClauseBreakBefore(tokens, pj + 1, text) : true);
        let reading = null;
        // after a determiner / possessive (past adverbs: «this newly created piece»), an adjective, a preposition: a noun
        const possVerb = direct && direct.w === 'POSS' && (has('past') || has('s')) && share < 0.5;   // «Sotheby’s stated»: the name is the subject
        const nounBefore = pt && !possVerb && (EN_DETERMINERS.has(pt.w) || pt.w === 'POSS' || (EN_PREPOSITIONS.has(pt.fold) && !has('ing') && !(has('pp') && pt.fold === 'by')));
        const adjBefore = direct && enAdjAnalyses(direct.text).length && !enVerbAnalyses(direct.text).length && !EN_SUBJECT[direct.fold] && !EN_DETERMINERS.has(direct.fold) && !enIsAdverb(direct);
        const objectBefore = pt && (EN_OBJECT_PRONOUNS.has(pt.fold) || pt.fold === 'it' || pt.fold === 'you');
        const verbBefore = groups.find(g => g.main === pj);
        if (pt && pt.fold === 'to' && has('base') && share < 0.995) {
            // «to see», «in order to ensure»; «to work» / «to school» after go / come is a place
            const nx = tokens[i + 1], placeVerb = pj > 0 && ['go', 'come', 'went', 'came', 'goes', 'back', 'return', 'returned', 'way', 'due', 'according', 'next', 'close', 'up', 'down', 'similar'].includes(tokens[pj - 1].fold);
            if (!placeVerb && (share < 0.8 || (nx && !/[.,;!?]/.test(text.slice(t.end, nx.start)) && (EN_DETERMINERS.has(nx.fold) || EN_SUBJECT[nx.fold] || EN_OBJECT_PRONOUNS.has(nx.fold) || EN_PARTICLES.has(nx.fold) || EN_PREPOSITIONS.has(nx.fold))))) reading = { a: has('base'), kind: 'infinitive' };
        }
        if (!reading && has('base') && objectBefore && pj >= 1 && groups.some(g => g.main === pj - 1 && ['see', 'hear', 'watch', 'let', 'make', 'help', 'feel', 'have', 'notice', 'bid'].includes(g.lemma)) && share < 0.995) {
            // «I saw him motion», «let me congratulate»: the bare infinitive after the object
            reading = { a: has('base'), kind: 'infinitive' };
        }
        if (!reading && has('base') && verbBefore && ['help', 'let', 'make', 'dare'].includes(verbBefore.lemma) && direct === pt && share < 0.9) reading = { a: has('base'), kind: 'infinitive' };   // «helps keep»
        const subj = !reading ? enSubjectBefore(tokens, i, text) : null;
        if (!reading && !nounBefore && !adjBefore && subj && (subj.pronoun || subj.relative || !clauseFinite) && (subj.at === i - 1 || subj.relative || subj.noun || tokens.slice(subj.at + 1, i).every(x => enIsAdverb(x) || x.w === 'POSS'))) {
            // after its subject: «I saw», «Musk promises», «hotels provide», «the painting increased»
            const p = has('past'), s3 = has('s'), base = has('base');
            const sing3 = subj.person === 2 && subj.number === 'singular';
            let pick = null;
            if (p && (!base || p.index <= base.index || sing3)) pick = p;
            else if (sing3) pick = s3 || (p && !base ? p : null);
            else pick = (base && !(subj.person === 2 && subj.number === 'singular')) ? base : p || null;
            if (!pick && s3 && subj.person === 2 && !subj.number) pick = s3;   // «There seems»: the form tells the number
            const limit = subj.pronoun ? 1 : subj.relative ? 0.97 : pick === p ? 0.97 : 0.9;
            if (pick && share < limit) reading = { a: pick, kind: 'finite', subject: subj };
        }
        if (!reading && has('base') && share < 0.85 && !nounBefore && !(direct && enIsName(direct, i - 1, tokens, text))) {
            // a sentence with no subject: an imperative («Allow students…», «Then tell them», «…, then ask them»)
            const lead = direct && /^(?:then|please|and|also|now|first|finally|so|just|but|or)$/.test(direct.fold) ? i - 1 : i;
            const atStart = lead === i ? sentStart : (enSentenceStartAt(tokens, lead, text) || enClauseBreakBefore(tokens, lead, text));
            const nx = tokens[i + 1];
            const imperativeSentence = groups.some(g => g.imperative) || lead === i || enSentenceStartAt(tokens, lead, text) || direct.fold === 'please';
            if (nx && /^\s*:/.test(text.slice(t.end, nx.start))) { /* «Witness: …» is a heading */ }
            else
            if (atStart && imperativeSentence && !(nx && enAuxOf(nx)) && !(nx && enVerbAnalyses(nx.text).some(a => a.slot === 's' || a.slot === 'past') && share > 0.3)
                && !(lead === i && subj && subj.pronoun)) reading = { a: has('base'), kind: 'imperative' };
        }
        if (!reading && has('ing') && !nounBefore && !adjBefore) {
            // «after visiting», «enjoy reading», «Walking home, …», «…, taking a picture»: a gerund / participle
            const ing = has('ing');
            const afterPrep = direct && (EN_PREPOSITIONS.has(direct.fold) || direct.fold === 'to');
            const lastGerund = groups.length && ['gerund', 'participle'].includes(groups[groups.length - 1].kind);
            // «of flying cars»: an -ing adjective before a bare noun
            const nx = tokens[i + 1];
            const adjBeforeNoun = enData.adjectives.has(t.fold) && nx && !/[.,;:!?]/.test(text.slice(t.end, nx.start)) && !EN_DETERMINERS.has(nx.fold) && !EN_SUBJECT[nx.fold] && !EN_OBJECT_PRONOUNS.has(nx.fold)
                && !EN_PREPOSITIONS.has(nx.fold) && !EN_PARTICLES.has(nx.fold) && !enIsAdverb(nx) && !enAuxOf(nx) && nx.fold !== 'to' && !EN_CONJUNCTIONS.has(nx.fold);
            if (adjBeforeNoun) { /* the Adjectives tab */ }
            else if (share < 0.995 && (afterPrep || verbBefore && direct === pt && !EN_LINKING.has(verbBefore.lemma))) reading = { a: ing, kind: 'gerund' };
            else if (share < 0.95 && lastGerund && (clauseStart || (pt && ['and', 'or'].includes(pt.fold)))) reading = { a: ing, kind: groups[groups.length - 1].kind };
            else if (share < 0.7 && clauseStart && !breakAfterIsEnd(tokens, i, text)) reading = { a: ing, kind: 'participle' };
            else if (share < 0.6 && pt && !EN_DETERMINERS.has(pt.fold) && clauseFinite && tokens[i + 1] && (EN_DETERMINERS.has(tokens[i + 1].fold) || EN_PREPOSITIONS.has(tokens[i + 1].fold) || EN_OBJECT_PRONOUNS.has(tokens[i + 1].fold))) reading = { a: ing, kind: 'participle' };
        }
        if (!reading && has('pp') && !nounBefore && !adjBefore && share < 0.7) {
            // «Directed by Banksy, …», «the man called John», «a piece written by»: a past participle after its noun
            const nx = tokens[i + 1];
            if (sentStart && nx && nx.fold === 'by') reading = { a: has('pp'), kind: 'participle' };
            else if (clauseFinite && direct && !enData.adjectives.has(t.fold) && nx && (nx.fold === 'by' || /^\p{Lu}/u.test(nx.text))) reading = { a: has('pp'), kind: 'participle' };
        }
        if (!reading && !nounBefore && (has('past') || has('s')) && lastSubject && direct && /^(?:and|but|or|then)$/.test(direct.fold) && share < 0.6) {
            // «…, and congratulated me»: a second verb of the same subject
            reading = { a: has('past') || has('s'), kind: 'finite', subject: lastSubject };
        }
        if (!reading) continue;
        const a = reading.a;
        // a phrasal verb: the particle right after it (give up, fix it all up is left as fix)
        let to = i;
        const s = reading.subject || null;
        let person = null, number = null, tense = null;
        if (reading.kind === 'finite') {
            tense = a.slot === 'past' ? 'past simple' : 'present simple';
            person = s ? s.person : 2;
            number = a.slot === 's' ? 'singular' : s ? s.number : null;
            if (s && s.person === 0) number = 'singular';
            if (s && (s.person === 3 || s.person === 5)) number = 'plural';
            if (a.slot === 'base' && s && s.person === 2 && s.number === 'singular') number = 'plural';
            if (s && s.person === 1) number = null;
        } else if (reading.kind === 'imperative') { tense = null; }
        used.add(i);
        groups.push({ start: t.start, end: tokens[to].end, mainTok: t, main: i, lemma: a.lemma, tense, aspect: reading.kind === 'finite' ? 'simple' : null, passive: false, modal: null,
            person, number, kind: reading.kind, subject: s ? s.text : null, auxWords: [], surface: t.text, imperative: reading.kind === 'imperative' });
        if (reading.kind === 'finite') { clauseFinite = true; if (s) lastSubject = s; }
        if (reading.kind === 'imperative') clauseFinite = true;
    }
    return { tokens, groups };
}
function enIrregularPP(lemma) { const f = enVerbForms(lemma); return !!f && f.pp[0] !== enRegularForms(lemma)[3]; }
function breakAfterIsEnd(tokens, i, text) { return !tokens[i + 1] || /[.!?]/.test(text.slice(tokens[i].end, tokens[i + 1].start)); }
function enNumberOfForm(w) {
    if (['is', 'was', 'has', 'does', "'s"].includes(w)) return 'singular';
    if (['are', 'were', "'re"].includes(w)) return 'plural';
    return null;
}
function enGroupLabel(g) {
    const what = g.kind === 'finite' ? (g.modal ? `modal ${g.modal}` : g.tense || '') : g.kind;
    return [what, g.passive ? 'passive' : '', g.person !== null && g.person !== undefined && g.kind === 'finite' ? `${EN_PERSON_LABEL[g.person % 3]}${g.number ? ' ' + g.number : ''}` : ''].filter(Boolean).join(', ');
}
function enLocalOf(g, text, tokens) {
    const item = enVerbItem(Object.assign({}, g, { tense: g.kind === 'finite' ? g.tense : g.kind === 'imperative' ? 'imperative' : g.kind }), text);
    // «it can be»: features say what the group is; «imperative» etc. are written as the tense so the learner sees them
    const reading = { label: enGroupLabel(g), item, lemma: g.lemma };
    return { readings: [reading], item, focusToken: g.mainTok, text, subject: g.subject, english: true, group: g };
}
function localEnSentenceVerbs(text, limit = 20) {
    if (!enData) return [];
    const { tokens, groups } = enReadGroups(text);
    return groups.slice(0, limit).map(g => enLocalOf(g, text, tokens));
}
function localEnTappedVerb(focus, text) {
    if (!enData) return null;
    const want = enTokens(focus);
    if (!want.length || want.length > 3) return null;
    const { tokens, groups } = enReadGroups(text);
    const at = tokens.findIndex((tk, i) => want.every((w, k) => tokens[i + k] && tokens[i + k].fold === w.fold));
    if (at < 0) return null;
    const span = [tokens[at].start, tokens[at + want.length - 1].end];
    const g = groups.find(x => x.start <= span[0] && span[1] <= x.end) || groups.find(x => x.main >= at && x.main < at + want.length);
    return g ? enLocalOf(g, text, tokens) : null;
}

// ---- adjectives ----
// What a written form can be as an adjective: [{lemma, degree}] (degree null for the plain form)
function enAdjAnalyses(word) {
    if (!enData) return [];
    const w = enFold(word), out = [];
    const add = (key, degree) => { const e = enData.adjectives.get(key); if (e && !out.some(o => o.lemma === e.lemma && o.degree === degree)) out.push({ lemma: e.lemma, degree, index: e.index }); };
    if (enData.adjectives.has(w)) add(w, null);
    const irr = enData.adjIrregular.get(w);
    if (irr) add(irr.lemma, irr.degree);
    for (const [end, degree] of [['er', 'comparative'], ['est', 'superlative']]) {
        if (!w.endsWith(end) || w.length < end.length + 2) continue;
        const stem = w.slice(0, -end.length);
        for (const lemma of [stem, stem + 'e', stem.endsWith('i') ? stem.slice(0, -1) + 'y' : null, stem.length > 2 && stem.slice(-1) === stem.slice(-2, -1) ? stem.slice(0, -1) : null]) {
            if (!lemma || !enData.adjectives.has(lemma)) continue;
            if (enRegularAdj(lemma)[degree === 'comparative' ? 0 : 1] === w && enData.adjectives.get(lemma).code === 'r') add(lemma, degree);
        }
    }
    return out.sort((a, b) => a.index - b.index);
}
// An adjective's comparative and superlative ([comparative, superlative], 'more X' / 'most X' spelled out), or null (not comparable).
function enAdjDegrees(lemma) {
    const e = enData && enData.adjectives.get(enFold(lemma));
    if (!e || !e.code) return null;
    if (e.code === 'm') return ['more ' + e.lemma, 'most ' + e.lemma];
    if (e.code === 'r') return enRegularAdj(e.lemma);
    return e.code.split('|').map(c => c.split(',')[0]);
}
function enIsNounLike(t, i, tokens, text, verbMain) {
    if (!t || verbMain.has(i) || EN_DETERMINERS.has(t.fold) || EN_PREPOSITIONS.has(t.fold) || EN_CONJUNCTIONS.has(t.fold) || EN_SUBJECT[t.fold] || enAuxOf(t) || t.w === 'not') return false;
    if (enIsAdverb(t) || EN_PARTICLES.has(t.fold) || ['him', 'her', 'them', 'me', 'us', 'it', 'to', 'there', 'here', 'too', 'very', 'so', 'enough'].includes(t.fold)) return false;
    return true;
}
function localEnSentenceAdjectives(text, verbs, limit = 20) {
    if (!enData) return [];
    const tokens = enTokens(text), verbMain = new Map();
    for (const v of verbs || []) {
        const g = v.group;
        tokens.forEach((t, i) => { if (t.start >= g.start && t.end <= g.end) verbMain.set(i, v); });
    }
    const out = [], sentences = typeof grammarSplitSentences === 'function' ? grammarSplitSentences(text) : [text];
    for (let i = 0; i < tokens.length && out.length < limit; i++) {
        const t = tokens[i];
        if (verbMain.has(i) || t.fold.length < 2 || EN_DETERMINERS.has(t.fold) || EN_SUBJECT[t.fold] || EN_PREPOSITIONS.has(t.fold) || EN_CONJUNCTIONS.has(t.fold)) continue;
        let an = enAdjAnalyses(t.text);
        // a capitalised word inside a sentence is a name («So Frank took»), unless the adjective itself is written so (American)
        if (/^\p{Lu}/u.test(t.text) && t.fold !== 'i' && an.length && !/^\p{Lu}/u.test(an[0].lemma) && (enIsName(t, i, tokens, text) || (tokens[i + 1] && verbMain.has(i + 1)))) continue;
        // «freely», «happily»: an adverb made from an adjective
        if (/ly$/.test(t.fold) && (enData.adjectives.has(t.fold.slice(0, -2)) || enData.adjectives.has(t.fold.slice(0, -3) + 'y') || enData.adjectives.has(t.fold.slice(0, -2) + 'e')) && !EN_LY_ADJECTIVES.has(t.fold)) continue;
        // «this newly created piece», «the developed world»: a participle between a determiner / an adverb and its noun
        if (!an.length && tokens[i + 1] && enVerbAnalyses(t.text).some(a => a.slot === 'pp' || a.slot === 'ing') && tokens[i - 1] && (EN_DETERMINERS.has(tokens[i - 1].w) || (/ly$/.test(tokens[i - 1].fold) && enIsAdverb(tokens[i - 1])))
            && enIsNounLike(tokens[i + 1], i + 1, tokens, text, verbMain) && !enVerbAnalyses(tokens[i + 1].text).some(a => a.slot === 'base' || a.slot === 'past') && enHomograph(t.text) < 0.99) an = [{ lemma: t.fold, degree: null, index: 1e6 }];
        if (!an.length) continue;
        // «a little pale»: «a little» says how much, it is no adjective of its own
        if (t.fold === 'little' && tokens[i - 1] && tokens[i - 1].fold === 'a' && tokens[i + 1] && enAdjAnalyses(tokens[i + 1].text).length) continue;
        const prev = tokens[i - 1], next = tokens[i + 1];
        const nextNoun = next && !/[.,;:!?]/.test(text.slice(t.end, next.start)) && enIsNounLike(next, i + 1, tokens, text, verbMain);
        // the word it describes: the next word when it is a noun (a big house), skipping more adjectives (a big old house)
        let target = null, via = null;
        if (nextNoun) {
            let j = i + 1;
            while (tokens[j + 1] && enAdjAnalyses(tokens[j].text).length && enIsNounLike(tokens[j + 1], j + 1, tokens, text, verbMain) && !/[.,;:!?]/.test(text.slice(tokens[j].end, tokens[j + 1].start))) j++;
            target = tokens[j]; via = 'noun';
        }
        // after a linking verb (it is big, she seemed tired), past very / so / more
        let b = i - 1;
        while (b >= 0 && (EN_INTENSIFIERS.has(tokens[b].fold) || (enIsAdverb(tokens[b]) && tokens[b].fold !== 'then'))) b--;
        const v = b >= 0 ? verbMain.get(b) : null;
        if (!via && v && EN_LINKING.has(v.item.lemma) && v.group.main === b) { via = 'copula'; target = v.item.agreesWith ? { text: v.item.agreesWith } : null; }
        if (!via && prev && EN_INTENSIFIERS.has(prev.fold) && prev.fold !== 'that' && prev.fold !== 'as' && prev.fold !== 'not') via = 'degree';
        if (!via && prev && prev.fold === 'little' && tokens[i - 2] && tokens[i - 2].fold === 'a') via = 'degree';
        // «anything dishonorable», «something new»: after an indefinite pronoun
        if (!via && prev && /^(?:anything|something|nothing|everything|someone|anyone|everyone|somebody|anybody|nobody)$/.test(prev.fold)) { via = 'noun'; target = prev; }
        // «positives or negatives», «hot and cold»: after and / or / a comma, the same kind as the adjective before
        const last = out[out.length - 1];
        if (!via && last && prev && ['and', 'or', 'but'].includes(prev.fold) && last.focusToken.end === tokens[i - 2]?.end) via = 'coordinated';
        if (!via) continue;
        const a = an.find(x => x.degree) || an[0];
        const share = enAdjHomograph(t.text);
        // «the light», «a right»: a noun after a determiner with nothing to describe
        if (via === 'noun' && prev && EN_DETERMINERS.has(prev.w) && share >= 0.6 && !EN_INTENSIFIERS.has(prev.fold)) continue;
        // a verb form before a noun is mostly the verb («made his money»): only after a determiner / an intensifier / be
        if (via === 'noun' && enVerbAnalyses(t.text).some(x => x.slot === 'past' || x.slot === 's' || x.slot === 'base') && !(prev && (EN_DETERMINERS.has(prev.w) || EN_INTENSIFIERS.has(prev.fold) || enData.adjectives.has(prev.fold) || EN_PREPOSITIONS.has(prev.fold)))) continue;
        const features = {};
        if (a.degree) features.degree = a.degree;
        // «more beautiful», «the most important»: the degree is the word before
        if (!a.degree && prev && (prev.fold === 'more' || prev.fold === 'less')) features.degree = 'comparative';
        if (!a.degree && prev && (prev.fold === 'most' || prev.fold === 'least')) features.degree = 'superlative';
        const sentence = sentences.find(sn => sn.includes(t.text)) || text;
        out.push({ item: { pos: 'adjective', lemma: a.lemma, surface: t.text, sentence, occurrence: enOccurrence(text, sentence, t), agreesWith: target ? target.text : null,
            features, explanation: '', rule: features.degree === 'comparative' ? 'comparatives' : features.degree === 'superlative' ? 'superlatives' : null, stemBreakdown: null, forms: null },
            focusToken: t, text, adjective: true, readings: [], english: true });
    }
    return out;
}
function enOccurrence(text, sentence, t) {
    const sStart = Math.max(0, text.indexOf(sentence));
    let n = 1;
    for (let at = text.indexOf(t.text, sStart); at >= 0 && at < t.start; at = text.indexOf(t.text, at + 1)) n++;
    return n;
}
function localEnTappedAdjective(focus, text) {
    if (!enData) return null;
    const want = enTokens(focus);
    if (want.length !== 1) return null;
    const verbs = localEnSentenceVerbs(text, 60);
    const t = enTokens(text).find(x => x.fold === want[0].fold);
    if (!t) return null;
    return localEnSentenceAdjectives(text, verbs, 60).find(r => r.focusToken.start === t.start) || null;
}
