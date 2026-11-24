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
const FR_VERB_TABLES_VERSION = '4edcca1917b5';
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
            frVerbHomograph = new Map(Object.entries(raw.homographs || {}).map(([w, v]) => [frVerbFold(w), Number(v)]));
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
// Words after which a noun comes, whatever the form: un, une, des, possessives, toute… (le / la / les / l’ can be object pronouns:
// «la laissait» -- for them the form's homograph share decides).
const FR_NOUN_DETERMINERS = new Set(['un', 'une', 'des', 'du', 'au', 'aux', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos',
    'votre', 'vos', 'leurs', 'cet', 'cette', 'ces', 'quel', 'quelle', 'quels', 'quelles', 'chaque', 'toute', 'toutes', 'aucun', 'aucune', 'plusieurs',
    'quelques', 'certains', 'certaines', 'nul', 'nulle', 'cette']);
function frNounBefore(prev, form) {
    if (!prev) return false;
    if (FR_NOUN_DETERMINERS.has(prev.fold)) return true;
    return (FR_ARTICLES.has(prev.fold) || prev.fold === 'de' || prev.fold === "d'") && frHomographShare(form) >= 0.2;
}
// A past participle, feminine / plural included (devenue, allés, mises).
function frIsParticipleForm(word) {
    const w = frVerbFold(word);
    if (FR_BETWEEN_AUX.has(w)) return false;
    for (const v of new Set([w, w.replace(/es$/, ''), w.replace(/e$/, ''), w.replace(/s$/, '')])) {
        for (const a of frVerbAnalyses(v)) if (a.tense === 'participe_passe' && frVerbIsParticipleOf(word, frVerbEntry(a.lemma))) return true;
    }
    return false;
}
const FR_SKIP_BEFORE_VERB = new Set(['ne', "n'", 'y', 'en', 'me', "m'", 'te', "t'", 'se', "s'", 'le', 'la', 'les', "l'", 'lui', 'leur', 'nous', 'vous']);
const FR_BETWEEN_AUX = new Set(['pas', 'plus', 'jamais', 'rien', 'déjà', 'bien', 'encore', 'toujours', 'souvent', 'beaucoup', 'trop', 'vraiment', 'point']);
const FR_LOCAL_TENSE_ID = { present: 'indicatif_present', imparfait: 'indicatif_imparfait', futur: 'indicatif_futur', conditionnel: 'conditionnel_present',
    subjonctif: 'subjonctif_present', imperatif: 'imperatif', passe_simple: 'passe_simple', subjonctif_imparfait: 'subjonctif_imparfait' };
const FR_COMPOUND_ID = { present: 'indicatif_passe_compose', imparfait: 'plus_que_parfait', futur: 'futur_anterieur', conditionnel: 'conditionnel_passe',
    subjonctif: 'subjonctif_passe', passe_simple: 'passe_anterieur', participe_present: 'participe_passe_compose' };   // ayant terminé
const FR_TENSE_FEATURES = {   // [tense, mood] as French grammars name them (the AI writes the same labels)
    indicatif_present: ['présent', 'indicatif'], indicatif_imparfait: ['imparfait', 'indicatif'], indicatif_futur: ['futur simple', 'indicatif'],
    conditionnel_present: ['présent', 'conditionnel'], subjonctif_present: ['présent', 'subjonctif'], imperatif: ['présent', 'impératif'],
    passe_simple: ['passé simple', 'indicatif'], subjonctif_imparfait: ['imparfait', 'subjonctif'], indicatif_passe_compose: ['passé composé', 'indicatif'],
    plus_que_parfait: ['plus-que-parfait', 'indicatif'], futur_anterieur: ['futur antérieur', 'indicatif'], conditionnel_passe: ['passé', 'conditionnel'],
    subjonctif_passe: ['passé', 'subjonctif'], passe_anterieur: ['passé antérieur', 'indicatif'], infinitif: [null, 'infinitif'],
    participe_present: ['présent', 'participe'], participe_passe_compose: ['passé', 'participe']
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
const FR_SUBJONCTIF_TRIGGERS = new Set(['faut', 'fallait', 'faudra', 'faudrait', 'fallut', 'veux', 'veut', 'voulons', 'voulez', 'veulent', 'voulais',
    'voulait', 'voudrais', 'voudrait', 'voudrions', 'voudriez', 'voudraient', 'souhaite', 'souhaites', 'souhaitons', 'souhaitez', 'souhaitent', 'souhaiterais',
    'aimerais', 'aimerait', 'préfère', 'préfères', 'préférons', 'préférez', 'préfèrent', 'exige', 'exigent', 'doute', 'doutons', 'crains', 'craint', 'ordonne',
    'pour', 'afin', 'avant', 'sans', 'bien', 'quoique', "jusqu'", 'moins', 'peur', 'crainte', 'important', 'nécessaire', 'possible', 'impossible', 'dommage',
    'normal', 'essentiel', 'urgent', 'temps', 'content', 'contente', 'heureux', 'heureuse', 'ravi', 'ravie', 'désolé', 'désolée', 'triste', 'étonné',
    'surprenant', 'regrette', 'accepte', 'attends', 'attend', 'suffit', 'vaut', 'semble']);
const FR_NEVER_VERB = new Set(['point', 'puis', 'pas', 'plus', 'jamais', 'rien', 'bien', 'or', 'si']);   // «ne… point», «et puis»: no verb forms here
const FR_INVERTED = new Set(['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'ce', 't', 'moi', 'toi', 'le', 'la', 'les', 'lui', 'leur', 'en', 'y']);
function frTokens(text) {
    const out = [], re = /(?:qu|[jlmtsdnc])['’](?=\p{L})|\p{L}+(?:[-]\p{L}+)*/giu;
    let m;
    while ((m = re.exec(text))) {
        // «est-il», «demanda-t-il», «préparez-moi»: the verb, then its inverted subject / object pronouns (inverted: true)
        const parts = m[0].split('-');
        let cut = parts.length;
        while (cut > 1 && FR_INVERTED.has(frVerbFold(parts[cut - 1]))) cut--;
        const head = parts.slice(0, cut).join('-');
        out.push({ text: head, fold: frVerbFold(head), start: m.index, end: m.index + head.length });
        let at = m.index + head.length;
        for (const part of parts.slice(cut)) { at += 1; out.push({ text: part, fold: frVerbFold(part), start: at, end: at + part.length, inverted: true }); at += part.length; }
    }
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
    if (auxWord) { features.auxiliary = reading.passive ? 'être' : entry.aux === 'e' ? 'être' : 'avoir'; features.participle = focusToken.text; }
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
        forms: reading.passive ? null : frEntryParadigm(entry, tenseId === 'infinitif' || tenseId === 'participe_present' ? 'indicatif_present' : tenseId)
    };
}
function localFrTappedVerb(focus, text, atIndex) {   // atIndex: the token to read (else the first occurrence of `focus`)
    if (!frVerbData) return null;
    const tokens = frTokens(text), want = frTokens(focus);
    if (!want.length || want.length > 3) return null;
    const last = want[want.length - 1];
    const at = Number.isInteger(atIndex) ? atIndex : tokens.findIndex((tk, i) => tk.fold === last.fold && want.every((w, k) => tokens[i - want.length + 1 + k]?.fold === w.fold));
    if (at < 0) return null;
    const tk = tokens[at];
    const before = (from, n, skip) => { const out = []; for (let i = from - 1; i >= 0 && out.length < n; i--) { if (skip && skip.has(tokens[i].fold)) continue; out.push(tokens[i]); } return out; };
    // The subject pronoun: before the verb (object pronouns and «ne» between are skipped; a skipped nous / vous with no other
    // subject before it is the subject: «vous allez»), or inverted after it («est-il», «demanda-t-il»).
    let subjTok = null, nousVous = null;
    for (let i = at - 1; i >= 0; i--) {
        const f = tokens[i].fold;
        if (tokens[i].inverted) continue;
        if (FR_SKIP_BEFORE_VERB.has(f)) { if (!nousVous && (f === 'nous' || f === 'vous')) nousVous = tokens[i]; continue; }
        subjTok = tokens[i]; break;
    }
    if (!(subjTok && Object.hasOwn(FR_SUBJECT_PERSON, subjTok.fold)) && nousVous) subjTok = nousVous;
    const after1 = tokens[at + 1]?.inverted ? (tokens[at + 1].fold === 't' ? tokens[at + 2] : tokens[at + 1]) : null;
    if (after1 && Object.hasOwn(FR_SUBJECT_PERSON, after1.fold) && after1.fold !== 'ce') subjTok = after1;
    else if (after1 && after1.fold === 'ce') subjTok = after1;
    const imperativePronoun = !!after1 && ['moi', 'toi', 'le', 'la', 'les', 'lui', 'leur', 'en', 'y'].includes(after1.fold);
    let subjPerson = subjTok && Object.hasOwn(FR_SUBJECT_PERSON, subjTok.fold) ? FR_SUBJECT_PERSON[subjTok.fold] : null;
    // the relative «qui» is a subject too: «toi qui fus» (tu), «moi qui suis» (je), «l’homme qui parle» (3rd person)
    let quiSubject = false;
    if (subjPerson === null && subjTok && subjTok.fold === 'qui') {
        const head = tokens[tokens.indexOf(subjTok) - 1];
        const QUI_HEAD = { moi: 0, toi: 1, nous: 3, vous: 4 };
        if (head && Object.hasOwn(QUI_HEAD, head.fold)) subjPerson = QUI_HEAD[head.fold];
        quiSubject = true;
    }
    // «que» before the subject asks for the subjonctif only after a word that requires it (il faut que, pour que, bien que, vouloir
    // que…); «ce que je mange», «Est-ce qu’il consomme», «je pense que» take the indicatif.
    const afterQue = (() => {
        const i = subjTok ? tokens.indexOf(subjTok) : at; const q = tokens[i - 1];
        if (!q || (q.fold !== 'que' && q.fold !== "qu'")) return false;
        return tokens.slice(Math.max(0, i - 4), i - 1).some(t => FR_SUBJONCTIF_TRIGGERS.has(t.fold));
    })();
    const readings = [];
    // a past participle after avoir / être: a compound tense
    const ppEntries = new Set();
    if (!FR_BETWEEN_AUX.has(tk.fold)) for (const v of new Set([tk.fold, tk.fold.replace(/es$/, ''), tk.fold.replace(/e$/, ''), tk.fold.replace(/s$/, '')])) {
        for (const a of frVerbAnalyses(v)) if (a.tense === 'participe_passe') { const e = frVerbEntry(a.lemma); if (e && frVerbIsParticipleOf(tk.text, e)) ppEntries.add(e); }
    }
    if (ppEntries.size) {
        let j = at - 1;
        while (j >= 0 && (FR_BETWEEN_AUX.has(tokens[j].fold) || tokens[j].inverted)) j--;   // «t’aurait-elle affecté»
        const auxTok = tokens[j];
        // «ai été admis»: avoir + été + the participle -- the passive in a compound tense
        if (auxTok && auxTok.fold === 'été' && frHomographShare(tk.text) < 0.5) {
            let h = j - 1;
            while (h >= 0 && FR_BETWEEN_AUX.has(tokens[h].fold)) h--;
            for (const a of tokens[h] ? frVerbAnalyses(tokens[h].text) : []) {
                if (a.lemma !== 'avoir' || !FR_COMPOUND_ID[a.tense]) continue;
                const contiguous = h === j - 1 && j === at - 1;
                for (const e of ppEntries) readings.push({ entry: e, tenseId: FR_COMPOUND_ID[a.tense], person: a.person, surface: contiguous ? text.slice(tokens[h].start, tk.end) : tk.text, auxWord: 'été', passive: true });
            }
        }
        for (const a of auxTok ? frVerbAnalyses(auxTok.text) : []) {
            if ((a.lemma !== 'avoir' && a.lemma !== 'être') || !FR_COMPOUND_ID[a.tense]) continue;
            const pronominal = a.lemma === 'être' && frIsReflexiveAt(tokens, j - 1, a.person);   // «je me suis levé»: with être
            for (const plain of ppEntries) {
                const e = pronominal && !plain.reflexive ? frVerbEntry('se ' + plain.lemma) : plain;
                const adjacent = j === at - 1 && /^\s+$/.test(text.slice(auxTok.end, tk.start));
                const surface = adjacent ? text.slice(auxTok.start, tk.end) : tk.text;
                if ((e.aux === 'e') !== (a.lemma === 'être')) {
                    // être + the participle of an avoir verb: the passive («fut adouci», «est écrit»), in être's own tense
                    if (a.lemma === 'être' && e.aux === 'a' && !pronominal && FR_LOCAL_TENSE_ID[a.tense] && frHomographShare(tk.text) < 0.5) readings.push({ entry: e, tenseId: FR_LOCAL_TENSE_ID[a.tense], tense: a.tense, person: a.person, surface, auxWord: auxTok.text, passive: true });
                    continue;
                }
                readings.push({ entry: e, tenseId: FR_COMPOUND_ID[a.tense], person: a.person, surface, auxWord: auxTok.text });
            }
        }
        // no auxiliary: «il écrit», «il fait» are also finite forms; a participle alone is an adjective (the Adjectives tab)
    }
    if (!readings.length) {
        const prev = tokens[at - 1];
        // «la porte»: a noun; but «la laissait», «l’amena»: an object pronoun before a form that is rarely anything but a verb
        if (frNounBefore(prev, tk.text) && !(tokens[at - 2] && Object.hasOwn(FR_SUBJECT_PERSON, tokens[at - 2].fold))) return null;
        // «je me lève» (same person as the subject): se lever; «il me parle»: an object, parler
        for (const a of frVerbAnalyses(tk.text)) {
            if (!FR_LOCAL_TENSE_ID[a.tense]) continue;
            const pronominal = subjPerson !== null && a.person === subjPerson && frIsReflexiveAt(tokens, at - 1, a.person);
            const e = frVerbEntry(pronominal && !FR_VERB_REFLEXIVE_RE.test(a.lemma) ? 'se ' + a.lemma : a.lemma);
            if (e) readings.push({ entry: e, tenseId: FR_LOCAL_TENSE_ID[a.tense], tense: a.tense, person: a.person, surface: tk.text });
        }
        for (const a of frVerbAnalyses(tk.text)) {   // «en faisant», «songeant»: the present participle
            if (a.tense !== 'participe_present' || readings.length) continue;
            const e = frVerbEntry(a.lemma);
            if (e) readings.push({ entry: e, tenseId: 'participe_present', tense: 'participe_present', person: -1, surface: tk.text });
        }
        const inf = frVerbEntry(tk.fold);
        if (!readings.length && inf && frVerbFold(inf.lemma.replace(FR_VERB_REFLEXIVE_RE, '')) === tk.fold) readings.push({ entry: inf, tenseId: 'infinitif', person: -1, surface: tk.text });
    }
    if (!readings.length) return null;
    // the most likely reading first: the subject's person; «que» -> subjonctif; no subject at the start of a sentence -> impératif
    // Where an impératif stands with no subject: the start of a sentence (after . ! ? : « –), or of a clause (after , ; et mais)
    // for a nous / vous form only («Mais non, tenez»); «…, et espère nous imiter» is a 3rd person whose subject was said before.
    const bt = text.slice(0, tk.start).replace(/(?:\b(?:ne|n['’]|y|en|me|m['’]|te|t['’]|se|s['’]|le|la|les|l['’]|lui|leur|nous|vous)\s*)+$/i, '').replace(/\s+$/, '');
    const sentenceStart = bt === '' || /[.!?…:«"–—•·▪‣*]$/.test(bt);
    const clauseStart = !sentenceStart && /(?:[,;]|\b(?:et|mais|ou|puis))$/i.test(bt);
    const score = r => {
        let s = 0;
        if (subjPerson !== null) s += r.person === subjPerson ? 100 : (r.person >= 0 ? -100 : 0);
        else if (r.tenseId === 'imperatif') s += imperativePronoun ? 150 : sentenceStart || (clauseStart && (r.person === 3 || r.person === 4)) ? 50 : -50;
        else if (r.person === 2 || r.person === 5) s += quiSubject ? 60 : 10;      // a noun subject / «qui» is a 3rd person
        if (r.tenseId === 'imperatif' && subjPerson !== null) s -= 200;
        const isSubj = /subjonctif/.test(r.tenseId);
        s += afterQue ? (isSubj ? 30 : 0) : (isSubj ? -30 : 0);
        s -= FR_TENSE_ORDER.indexOf(r.tense || '') > 0 ? FR_TENSE_ORDER.indexOf(r.tense) : 0;
        return s - (r.entry.index || 0) * 1e-4;   // a tie goes to the more common verb («suis»: être, not suivre)
    };
    readings.sort((a, b) => score(b) - score(a));
    const seen = new Set(), unique = readings.filter(r => { const k = r.entry.lemma + r.tenseId + r.person + r.surface; if (seen.has(k)) return false; seen.add(k); return true; });
    const subject = subjPerson !== null || quiSubject ? subjTok.text : null;
    return { readings: unique.slice(0, 6), item: frLocalItem(unique[0], text, tk, subject), subject, focusToken: tk, text, sentenceStart, imperativePronoun };
}

// ---- every verb of a French text, without AI (a selected sentence or paragraph) ----
// A word counts as a verb when something says so: its subject pronoun before it, avoir / être before it (a compound tense), or
// the form itself is rarely anything else (FR_VERB_HOMOGRAPH: how often Lexique reads it as another word -- «porte» 0.87,
// «livre» 0.94, «est» 0.01). An article, a possessive or «de» before it makes it a noun. An infinitive counts after a
// preposition or a verb. A past participle without its auxiliary is left to the Adjectives tab.
const FR_PREPOSITIONS_BEFORE_INF = new Set(['à', 'de', "d'", 'pour', 'sans', 'par', 'après', 'avant']);
let frVerbHomograph = null;   // form -> share of its uses that are not a verb (dict/fr-verbs.json "homographs")
function frHomographShare(form) {
    const k = frVerbFold(form);
    return frVerbHomograph && frVerbHomograph.has(k) ? frVerbHomograph.get(k) : 0;
}
function localFrSentenceVerbs(text, limit = 20) {
    if (!frVerbData) return [];
    const tokens = frTokens(text), items = [], claimed = new Set();
    for (let i = 0; i < tokens.length && items.length < limit; i++) {
        if (claimed.has(i)) continue;
        const tk = tokens[i];
        if ((tk.text.length < 2 && !/^[aàyo]$/i.test(tk.text)) || FR_NEVER_VERB.has(tk.fold) || tk.inverted) continue;
        // an auxiliary whose participle follows is read with that participle
        let k = i + 1;
        while (k < tokens.length && (FR_BETWEEN_AUX.has(tokens[k].fold) || tokens[k].inverted)) k++;
        if ((frVerbAnalyses(tk.text).some(a => a.lemma === 'avoir' || a.lemma === 'être')) && tokens[k] && frIsParticipleForm(tokens[k].text)) {
            let k2 = k + 1;   // «ai été admis»: the participle after «été»
            while (k2 < tokens.length && FR_BETWEEN_AUX.has(tokens[k2].fold)) k2++;
            const second = tokens[k].fold === 'été' && tokens[k2] && frIsParticipleForm(tokens[k2].text) ? localFrTappedVerb(tokens[k2].text, text, k2) : null;
            if (second && second.item.features.auxiliary) { claimed.add(i); claimed.add(k); claimed.add(k2); items.push(second); continue; }
            const r = localFrTappedVerb(tokens[k].text, text, k);
            if (r && r.item.features.auxiliary) { claimed.add(i); claimed.add(k); items.push(r); continue; }
        }
        const r = localFrTappedVerb(tk.text, text, i);
        if (!r) continue;
        const item = r.item, prev = tokens[i - 1];
        const confirmed = item.agreesWith || item.features.auxiliary || r.readings.length === 1 && r.readings[0].tenseId === 'imperatif';
        const share = frHomographShare(tk.text);
        // a capitalised word inside a sentence with no subject before it is a name («Marie nous a raconté»), not «marier»
        if (!confirmed && /^\p{Lu}/u.test(tk.text) && !r.sentenceStart) continue;
        let isVerb;
        if (item.features.mood === 'infinitif') isVerb = !frNounBefore(prev, tk.text) && (share < 0.5 || (prev && (FR_PREPOSITIONS_BEFORE_INF.has(prev.fold) || items.some(x => x.focusToken.start === prev.start))));
        else if (item.features.mood === 'impératif') isVerb = share < 0.3;   // the reading's own score already asked for a sentence / clause start
        else if (item.features.mood === 'participe') isVerb = share < 0.3;
        // a rare verb (cousiner, typer, celer) needs its subject: «une cousine», «ce type», «Cela» are no verbs
        else isVerb = !!confirmed || (share < 0.5 && (r.readings[0].entry.index || 0) < 2500 && !frNounBefore(prev, tk.text));
        if (isVerb) { claimed.add(i); items.push(r); }
    }
    return items;
}
