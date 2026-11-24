// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// ========== ВІДМІНЮВАННЯ ДІЄСЛІВ БЕЗ AI (французька) ==========
// Owner, 2026-11-23: selecting a verb to see its conjugation must be immediate («запит за 10 секунд не дочекався»). The tables
// are data (dict/fr-verbs.json, built by tools/build_fr_verbs.py from the French Wiktionary's own conjugation tables, CC BY-SA,
// see dict/NOTICE): 6 341 verbs, every simple tense; the compound tenses are the auxiliary's own forms + the past participle,
// built the same way the build checks against Wiktionary (189 930 compound forms, none different).
//   frVerbTablesReady()            the tables are loaded (sync)
//   loadFrVerbTables()             loads them once (a Promise; null when the file cannot be had: the AI then answers as before)
//   localVerbParadigm(lang, lemma, tenseId)   {person: form} for a Grammar tense button, or null
//   frVerbAnalyses(word)           what a written form can be: [{lemma, tense, person}] (person 0..5, or -1 for a participle)
const FR_VERB_TABLES_VERSION = 'a593d1dea33c';
const FR_VERB_TABLES_URL = 'dict/fr-verbs.json?v=' + FR_VERB_TABLES_VERSION;
let frVerbData = null, frVerbLoading = null, frVerbReverse = null;
const frVerbFold = v => String(v || '').replace(/[’ʼ]/g, "'").replace(/œ/g, 'oe').toLocaleLowerCase().trim();
const FR_VERB_REFLEXIVE_RE = /^(?:se\s+|s['’]\s*)/i;

function frVerbTablesReady() { return !!frVerbData; }
function loadFrVerbTables() {
    if (frVerbData) return Promise.resolve(frVerbData);
    if (!frVerbLoading) {
        frVerbLoading = fetch(FR_VERB_TABLES_URL).then(r => (r.ok ? r.json() : null)).then(raw => {
            if (!raw || raw.format !== 1 || !Array.isArray(raw.verbs)) return null;
            const tenses = raw.tenses.map(([id, n]) => ({ id, n }));
            const patterns = raw.patterns.map(p => p.split('|'));
            const byLemma = new Map();
            raw.verbs.forEach((line, i) => {
                const [lemma, stem, pattern, aux] = line.split('\t');
                const entry = { lemma, stem, pattern: patterns[Number(pattern)], aux, reflexive: FR_VERB_REFLEXIVE_RE.test(lemma), index: i };
                const bare = frVerbFold(lemma.replace(FR_VERB_REFLEXIVE_RE, ''));
                if (!byLemma.has(bare) || !entry.reflexive) byLemma.set(bare, entry);
                if (entry.reflexive) byLemma.set(frVerbFold(lemma), entry);
            });
            frVerbData = { tenses, byLemma, entries: [...byLemma.values()] };
            return frVerbData;
        }).catch(() => null).finally(() => { if (!frVerbData) frVerbLoading = null; });
    }
    return frVerbLoading;
}
// A pronominal lemma («se lever») of a verb the tables hold as plain (lever): the same forms with the reflexive pronoun, être.
function frVerbEntry(lemma) {
    if (!frVerbData) return null;
    const key = frVerbFold(lemma);
    const found = frVerbData.byLemma.get(key) || frVerbData.byLemma.get(key.replace(FR_VERB_REFLEXIVE_RE, '')) || null;
    if (!found || found.reflexive || !FR_VERB_REFLEXIVE_RE.test(String(lemma).trim())) return found;
    const bare = found.lemma, lemmaOut = (/^[aeiouyéèêhâ]/i.test(bare) ? 's’' : 'se ') + bare;
    return Object.assign({}, found, { lemma: lemmaOut, aux: 'e', reflexive: true, virtual: true });
}
function frWithReflexive(form, person) {
    const pron = FR_REFLEXIVE_PRONOUNS[person];
    if (pron === undefined) return form;
    return (pron.length === 2 && /^[aeiouyéèêhâ]/i.test(form) ? pron[0] + '’' : pron + ' ') + form;
}
// The forms of one simple tense (an array of 6, or 3 for the impératif: tu, nous, vous), and the two participles.
function frVerbSimple(entry, tense) {
    let at = 0;
    for (const tn of frVerbData.tenses) {
        if (tn.id === tense) {
            const cells = entry.pattern.slice(at, at + tn.n).map(s => (s === '~' ? null : entry.stem + s));
            if (!entry.virtual) return cells;
            return cells.map((c, i) => !c ? null : tn.n === 3 ? c + '-' + ['toi', 'nous', 'vous'][i] : frWithReflexive(c, i));
        }
        at += tn.n;
    }
    return null;
}
function frVerbParticiples(entry) {
    const total = frVerbData.tenses.reduce((n, tn) => n + tn.n, 0);
    const cell = s => (s === undefined || s === '~' ? null : entry.stem + s);
    return { past: cell(entry.pattern[total]), present: cell(entry.pattern[total + 1]) };
}
// A compound tense: the auxiliary (avoir / être) in `auxTense` + the past participle, which takes -s in the plural with être;
// a pronominal verb keeps its reflexive pronoun in front (je me suis levé). The same rule tools/build_fr_verbs.py checks.
const FR_REFLEXIVE_PRONOUNS = ['me', 'te', 'se', 'nous', 'vous', 'se'];
function frVerbCompound(entry, auxTense, person) {
    const aux = frVerbEntry(entry.aux === 'e' ? 'être' : 'avoir');
    const auxForm = aux && frVerbSimple(aux, auxTense)?.[person];
    const pp = frVerbParticiples(entry).past;
    if (!auxForm || !pp) return null;
    const part = pp + (entry.aux === 'e' && person >= 3 && !pp.endsWith('s') ? 's' : '');
    if (!entry.reflexive) return auxForm + ' ' + part;
    const pron = FR_REFLEXIVE_PRONOUNS[person];
    const elided = (pron === 'me' || pron === 'te' || pron === 'se') && /^[aeiouyéèêhâ]/i.test(auxForm);   // t’es, s’est, m’étais
    return (elided ? pron[0] + '’' + auxForm : pron + ' ' + auxForm) + ' ' + part;
}
// The Grammar panel's tense ids (GRAMMAR_LANG_CONFIG.fr.verb.tenses) and a few more a text can hold.
const FR_TENSE_SOURCES = {
    indicatif_present: { simple: 'present' }, indicatif_imparfait: { simple: 'imparfait' }, indicatif_futur: { simple: 'futur' },
    conditionnel_present: { simple: 'conditionnel' }, subjonctif_present: { simple: 'subjonctif' }, imperatif: { simple: 'imperatif' },
    passe_simple: { simple: 'passe_simple' }, subjonctif_imparfait: { simple: 'subjonctif_imparfait' },
    indicatif_passe_compose: { aux: 'present' }, plus_que_parfait: { aux: 'imparfait' }, futur_anterieur: { aux: 'futur' },
    conditionnel_passe: { aux: 'conditionnel' }, subjonctif_passe: { aux: 'subjonctif' }, passe_anterieur: { aux: 'passe_simple' }
};
function localVerbParadigm(langCode, lemma, tenseId) {
    if (langCode !== 'fr' || !frVerbData) return null;
    return frEntryParadigm(frVerbEntry(lemma), tenseId);
}
function frEntryParadigm(entry, tenseId) {
    const src = FR_TENSE_SOURCES[tenseId], persons = grammarConfigFor('fr').verb.persons;
    if (!entry || !src || !persons.length) return null;
    const forms = {};
    if (src.simple === 'imperatif') {
        const cells = frVerbSimple(entry, 'imperatif') || [];
        [1, 3, 4].forEach((p, i) => { if (cells[i]) forms[persons[p]] = cells[i]; });
    } else {
        persons.forEach((key, p) => {
            const v = src.simple ? frVerbSimple(entry, src.simple)?.[p] : frVerbCompound(entry, src.aux, p);
            if (v) forms[key] = v;
        });
    }
    return Object.keys(forms).length ? forms : null;
}
// What a written form can be. Every form of a verb starts with its stem (the common start of all its forms), so a word is
// compared only with the verbs whose stem it starts with -- no index of the ~280 000 forms (that took 330 ms and 78 MB).
const FR_PRONOUN_START_RE = /^(?:me|te|se|nous|vous)\s+|^[mts]['’]\s*/i;
function frVerbAnalyses(word) {
    if (!frVerbData) return [];
    if (!frVerbReverse) {   // folded stem -> entries; a pronominal-only verb (stem '') is compared form by form
        frVerbReverse = new Map();
        for (const entry of frVerbData.entries) {
            const k = frVerbFold(entry.stem);
            const list = frVerbReverse.get(k);
            if (list) list.push(entry); else frVerbReverse.set(k, [entry]);
        }
    }
    const w = frVerbFold(String(word || '').replace(FR_PRONOUN_START_RE, ''));
    if (!w) return [];
    const out = [];
    const total = frVerbData.tenses.reduce((n, tn) => n + tn.n, 0);
    const slotOf = cell => {   // pattern cell index -> {tense, person}
        let at = 0;
        for (const tn of frVerbData.tenses) {
            if (cell < at + tn.n) return { tense: tn.id, person: tn.n === 3 ? [1, 3, 4][cell - at] : cell - at };
            at += tn.n;
        }
        return { tense: cell === total ? 'participe_passe' : 'participe_present', person: -1 };
    };
    for (let len = Math.min(w.length, 40); len >= 0; len--) {
        for (const entry of frVerbReverse.get(w.slice(0, len)) || []) {
            entry.pattern.forEach((suffix, cell) => {
                if (suffix === '~') return;
                if (frVerbFold((entry.stem + suffix).replace(FR_PRONOUN_START_RE, '')) !== w) return;
                const slot = slotOf(cell);
                out.push({ lemma: entry.lemma, aux: entry.aux, tense: slot.tense, person: slot.person });
            });
        }
    }
    return out;
}
// The past participle of a lemma, its feminine / plural forms included (for «a mangé», «est allée», «sont partis»).
function frVerbIsParticipleOf(word, entry) {
    const pp = entry && frVerbParticiples(entry).past;
    if (!pp) return false;
    const w = frVerbFold(word), base = frVerbFold(pp);
    return [base, base + 'e', base + 's', base + 'es'].includes(w) || (base.endsWith('s') && w === base.slice(0, -1) + 'es');
}

// ---- a tapped French verb, read without AI (runGrammarAnalysis, one tapped word) ----
// Which verb, tense and person the tapped word is, from the tables and its neighbours: the subject pronoun before it, «que»
// before that (subjonctif), avoir / être before a past participle (a compound tense), an article before it (then it is a noun:
// «la porte» -- left to the AI). The result goes through normalizeGrammarAnalysis like an AI reply; the explanation «why this
// form here» is asked of the AI afterwards in a few hundred characters (explainLocalGrammarItem in grammar-run.js).
const FR_SUBJECT_PERSON = { je: 0, "j'": 0, tu: 1, il: 2, elle: 2, on: 2, ce: 2, "c'": 2, nous: 3, vous: 4, ils: 5, elles: 5 };
const FR_REFLEXIVE_PERSON = { me: [0], "m'": [0], te: [1], "t'": [1], se: [2, 5], "s'": [2, 5], nous: [3], vous: [4] };
const FR_ARTICLES = new Set(['le', 'la', 'les', "l'", 'un', 'une', 'des', 'du', 'au', 'aux', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'cet', 'cette', 'ces', 'quel', 'quelle', 'chaque']);
const FR_SKIP_BEFORE_VERB = new Set(['ne', "n'", 'y', 'en', 'me', "m'", 'te', "t'", 'se', "s'", 'le', 'la', 'les', "l'", 'lui', 'leur', 'nous', 'vous']);
const FR_BETWEEN_AUX = new Set(['pas', 'plus', 'jamais', 'rien', 'déjà', 'bien', 'encore', 'toujours', 'souvent', 'beaucoup', 'trop', 'vraiment', 'point']);
const FR_LOCAL_TENSE_ID = { present: 'indicatif_present', imparfait: 'indicatif_imparfait', futur: 'indicatif_futur', conditionnel: 'conditionnel_present',
    subjonctif: 'subjonctif_present', imperatif: 'imperatif', passe_simple: 'passe_simple', subjonctif_imparfait: 'subjonctif_imparfait' };
const FR_COMPOUND_ID = { present: 'indicatif_passe_compose', imparfait: 'plus_que_parfait', futur: 'futur_anterieur', conditionnel: 'conditionnel_passe',
    subjonctif: 'subjonctif_passe', passe_simple: 'passe_anterieur' };
const FR_TENSE_FEATURES = {   // [tense, mood] as French grammars name them (the AI writes the same labels)
    indicatif_present: ['présent', 'indicatif'], indicatif_imparfait: ['imparfait', 'indicatif'], indicatif_futur: ['futur simple', 'indicatif'],
    conditionnel_present: ['présent', 'conditionnel'], subjonctif_present: ['présent', 'subjonctif'], imperatif: ['présent', 'impératif'],
    passe_simple: ['passé simple', 'indicatif'], subjonctif_imparfait: ['imparfait', 'subjonctif'], indicatif_passe_compose: ['passé composé', 'indicatif'],
    plus_que_parfait: ['plus-que-parfait', 'indicatif'], futur_anterieur: ['futur antérieur', 'indicatif'], conditionnel_passe: ['passé', 'conditionnel'],
    subjonctif_passe: ['passé', 'subjonctif'], passe_anterieur: ['passé antérieur', 'indicatif'], infinitif: [null, 'infinitif']
};
const FR_TENSE_ORDER = ['present', 'imparfait', 'futur', 'conditionnel', 'passe_simple', 'subjonctif', 'subjonctif_imparfait', 'imperatif'];
const FR_PERSON_LABEL = ['1re personne', '2e personne', '3e personne'];
// A reflexive pronoun at tokens[i] for `person`: me / te / se (same person as the form), or nous / vous only when doubled
// («nous nous sommes levés»; a single «nous sommes allés» is the subject).
function frIsReflexiveAt(tokens, i, person) {
    const tk = tokens[i];
    if (!tk || !(FR_REFLEXIVE_PERSON[tk.fold] || []).includes(person)) return false;
    return (tk.fold !== 'nous' && tk.fold !== 'vous') || tokens[i - 1]?.fold === tk.fold;
}
function frTokens(text) {
    const out = [], re = /(?:qu|[jlmtsdnc])['’](?=\p{L})|\p{L}+(?:[-]\p{L}+)*/giu;
    let m;
    while ((m = re.exec(text))) out.push({ text: m[0], fold: frVerbFold(m[0]), start: m.index, end: m.index + m[0].length });
    return out;
}
function frReadingLabel(r) {
    const [tense, mood] = FR_TENSE_FEATURES[r.tenseId] || [];
    const who = r.person >= 0 ? ` ${['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'][r.person]}` : '';
    return [mood, tense].filter(Boolean).join(' ') + who;
}
// The reply for one reading (the shape the AI is asked for).
function frLocalItem(reading, text, focusToken, subject) {
    const { entry, tenseId, person, surface, auxWord } = reading;
    const [tense, mood] = FR_TENSE_FEATURES[tenseId] || [null, null];
    const features = {};
    if (tense) features.tense = tense;
    if (mood) features.mood = mood;
    if (person >= 0) { features.person = FR_PERSON_LABEL[person % 3]; features.number = person < 3 ? 'singulier' : 'pluriel'; }
    if (auxWord) { features.auxiliary = entry.aux === 'e' ? 'être' : 'avoir'; features.participle = focusToken.text; }
    let stemBreakdown = null;
    const cfg = grammarConfigFor('fr').verb;
    const bare = entry.lemma.replace(FR_VERB_REFLEXIVE_RE, '');
    if (!auxWord && /(?:er|ir)$/.test(bare) && !(cfg.irregularRe && cfg.irregularRe.test(bare))) {
        const stem = bare.slice(0, -2), ending = surface.slice(stem.length);
        if (frVerbFold(surface).startsWith(frVerbFold(stem)) && ending && (cfg.endings || []).includes(ending.toLowerCase())) stemBreakdown = { stem: surface.slice(0, stem.length), ending };
    }
    const sentences = typeof grammarSplitSentences === 'function' ? grammarSplitSentences(text) : [text];
    const sentence = sentences.find(s => s.includes(surface)) || text;
    return {
        pos: 'verb', lemma: entry.lemma, surface, sentence, occurrence: 1, agreesWith: subject || null, features,
        explanation: '', rule: null, stemBreakdown,
        forms: frEntryParadigm(entry, tenseId === 'infinitif' ? 'indicatif_present' : tenseId)
    };
}
function localFrTappedVerb(focus, text) {
    if (!frVerbData) return null;
    const tokens = frTokens(text), want = frTokens(focus);
    if (!want.length || want.length > 3) return null;
    const last = want[want.length - 1];
    const at = tokens.findIndex((tk, i) => tk.fold === last.fold && want.every((w, k) => tokens[i - want.length + 1 + k]?.fold === w.fold));
    if (at < 0) return null;
    const tk = tokens[at];
    const before = (from, n, skip) => { const out = []; for (let i = from - 1; i >= 0 && out.length < n; i--) { if (skip && skip.has(tokens[i].fold)) continue; out.push(tokens[i]); } return out; };
    // the subject pronoun before the verb (object pronouns and «ne» between them are skipped)
    const subjTok = before(at, 1, FR_SKIP_BEFORE_VERB)[0];
    const subjPerson = subjTok && Object.hasOwn(FR_SUBJECT_PERSON, subjTok.fold) ? FR_SUBJECT_PERSON[subjTok.fold] : null;
    const afterQue = (() => { const i = subjTok ? tokens.indexOf(subjTok) : at; const q = tokens[i - 1]; return !!q && (q.fold === 'que' || q.fold === "qu'"); })();
    const readings = [];
    // a past participle after avoir / être: a compound tense
    const ppEntries = new Set();
    for (const v of new Set([tk.fold, tk.fold.replace(/es$/, ''), tk.fold.replace(/e$/, ''), tk.fold.replace(/s$/, '')])) {
        for (const a of frVerbAnalyses(v)) if (a.tense === 'participe_passe') { const e = frVerbEntry(a.lemma); if (e && frVerbIsParticipleOf(tk.text, e)) ppEntries.add(e); }
    }
    if (ppEntries.size) {
        let j = at - 1;
        while (j >= 0 && FR_BETWEEN_AUX.has(tokens[j].fold)) j--;
        const auxTok = tokens[j];
        for (const a of auxTok ? frVerbAnalyses(auxTok.text) : []) {
            if ((a.lemma !== 'avoir' && a.lemma !== 'être') || !FR_COMPOUND_ID[a.tense]) continue;
            const pronominal = a.lemma === 'être' && frIsReflexiveAt(tokens, j - 1, a.person);   // «je me suis levé»: with être
            for (const plain of ppEntries) {
                const e = pronominal && !plain.reflexive ? frVerbEntry('se ' + plain.lemma) : plain;
                if ((e.aux === 'e') !== (a.lemma === 'être')) continue;
                const adjacent = j === at - 1 && /^\s+$/.test(text.slice(auxTok.end, tk.start));
                readings.push({ entry: e, tenseId: FR_COMPOUND_ID[a.tense], person: a.person, surface: adjacent ? text.slice(auxTok.start, tk.end) : tk.text, auxWord: auxTok.text });
            }
        }
        if (!readings.length) return null;   // a participle without its auxiliary: an adjective or a passive -- the AI says which
    }
    if (!readings.length) {
        const prev = tokens[at - 1];
        if (prev && FR_ARTICLES.has(prev.fold) && !(tokens[at - 2] && Object.hasOwn(FR_SUBJECT_PERSON, tokens[at - 2].fold))) return null;   // «la porte»: a noun
        // «je me lève» (same person as the subject): se lever; «il me parle»: an object, parler
        for (const a of frVerbAnalyses(tk.text)) {
            if (!FR_LOCAL_TENSE_ID[a.tense]) continue;
            const pronominal = subjPerson !== null && a.person === subjPerson && frIsReflexiveAt(tokens, at - 1, a.person);
            const e = frVerbEntry(pronominal && !FR_VERB_REFLEXIVE_RE.test(a.lemma) ? 'se ' + a.lemma : a.lemma);
            if (e) readings.push({ entry: e, tenseId: FR_LOCAL_TENSE_ID[a.tense], tense: a.tense, person: a.person, surface: tk.text });
        }
        const inf = frVerbEntry(tk.fold);
        if (!readings.length && inf && frVerbFold(inf.lemma.replace(FR_VERB_REFLEXIVE_RE, '')) === tk.fold) readings.push({ entry: inf, tenseId: 'infinitif', person: -1, surface: tk.text });
    }
    if (!readings.length) return null;
    // the most likely reading first: the subject's person; «que» -> subjonctif; no subject at the start of a sentence -> impératif
    const sentenceStart = !before(at, 1, FR_SKIP_BEFORE_VERB).length || /[.!?;:]\s*$/.test(text.slice(0, (before(at, 1, FR_SKIP_BEFORE_VERB)[0] || { end: 0 }).end + 1));
    const score = r => {
        let s = 0;
        if (subjPerson !== null) s += r.person === subjPerson ? 100 : (r.person >= 0 ? -100 : 0);
        else if (r.tenseId === 'imperatif') s += sentenceStart ? 50 : -50;
        else if (r.person === 2 || r.person === 5) s += 10;      // a noun subject is a 3rd person
        if (r.tenseId === 'imperatif' && subjPerson !== null) s -= 200;
        const isSubj = /subjonctif/.test(r.tenseId);
        s += afterQue ? (isSubj ? 30 : 0) : (isSubj ? -30 : 0);
        s -= FR_TENSE_ORDER.indexOf(r.tense || '') > 0 ? FR_TENSE_ORDER.indexOf(r.tense) : 0;
        return s;
    };
    readings.sort((a, b) => score(b) - score(a));
    const seen = new Set(), unique = readings.filter(r => { const k = r.entry.lemma + r.tenseId + r.person + r.surface; if (seen.has(k)) return false; seen.add(k); return true; });
    const subject = subjPerson !== null ? subjTok.text : null;
    return { readings: unique.slice(0, 6), item: frLocalItem(unique[0], text, tk, subject), subject, focusToken: tk, text };
}
