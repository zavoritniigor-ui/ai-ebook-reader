/* offline-dict.js — the offline dictionary of a direction (French → Ukrainian), working TOGETHER with the offline translator.
 *
 * The models of js/offline-translate.js translate French through English, so a word with several English senses comes out in the
 * wrong one («file» → «файл» instead of «черга», «ménage» → «домогосподарство»), and a set expression is translated word by word.
 * A dictionary alone translates no sentence. So the engine translates, and this file only corrects it where it is sure:
 *
 *   a word      its lemma and meanings (dict/fr-uk.json, built by tools/build_dict_fr_uk.py); the meaning first is the one the engine
 *               put in the sentence, else the set expression the word belongs to, else — when the engine's word is a known pivot
 *               mistake for it — the dictionary's main meaning for the part of speech the word has here; the other meanings below.
 *   a sentence  a set expression translated word by word gets the dictionary's translation; a word the engine turned into a known
 *               pivot mistake gets the dictionary's meaning, when the context leaves one reading. The substituted Ukrainian word is
 *               put into the case, number, gender, person or tense of the word it replaces (dict/uk-forms.json, from VESUM).
 *               Anything less certain keeps the engine's translation.
 *
 * Installed with the direction's pack (js/offline-translate.js offlineTrInstall: same cache, same state record, size and SHA-256 from
 * js/offline-dict-catalog.js), removed with it. Only the offline path uses it; the AI path is untouched.
 *
 * Classic <script src>, NOT an ES module — see js/core.js. Loaded after js/offline-translate.js.
 */
const OFFLINE_DICT_MAX_TARGETS = 3;           // marks in one sentence (each a different tag, so one engine call carries all)
const OFFLINE_DICT_TAGS = ['b', 'i', 'u'];
let offlineDictLast = null;                   // for 📋 diagnostics: what the dictionary did last (no text of the book)
const offlineDictLoaded = new Map();          // direction → Promise of the parsed dictionary (or null)

// ========== LOADING ==========
function offlineDictRelease() { offlineDictLoaded.clear(); }
function offlineDictForget(direction) { offlineDictLoaded.delete(direction); }
function offlineDictLoad(src, tgt) {
    const direction = src + '>' + tgt;
    if (!offlineDictLoaded.has(direction)) {
        const job = (async () => {
            const pack = await offlineTrLoad(), have = pack.dicts && pack.dicts[direction];
            if (!have || !offlineTrDictReady(pack, direction)) return null;
            const cache = await caches.open(OFFLINE_TR_CACHE), parts = {};
            for (const [type, version] of Object.entries(have.versions)) {
                const res = await cache.match(offlineTrKey('dict', direction, type, version));
                if (!res) {   // the browser dropped the file: forget the dictionary, Settings offers the download again
                    delete pack.dicts[direction];
                    await offlineTrSave(pack);
                    return null;
                }
                parts[type] = await res.json();
            }
            return offlineDictParse(parts.data, parts.forms);
        })().catch(() => null);
        offlineDictLoaded.set(direction, job);
        job.then(d => { if (!d) offlineDictLoaded.delete(direction); });
    }
    return offlineDictLoaded.get(direction);
}
// The French key of a word: as tools/build_dict_fr_uk.py norm().
const offlineDictNorm = (w) => String(w).trim().toLowerCase().normalize('NFC').replace(/’/g, "'").replace(/œ/g, 'oe').replace(/æ/g, 'ae');
const offlineDictUkNorm = (w) => String(w).toLowerCase().replace(/[’ʼ`]/g, "'");
function offlineDictParse(data, forms) {
    if (!data || data.format !== 1 || !Array.isArray(data.lemmas) || !Array.isArray(data.index)) return null;
    const d = { data, lemmas: data.lemmas, heads: data.heads, blocks: data.index, cache: new Map(), uk: new Map(), paradigms: [], alias: {}, guess: {}, expr: [] };
    if (forms && forms.format === 1) {
        for (const line of forms.uk) {
            const [lemma, pos, pid, cut] = line.split('\t');
            if (!d.uk.has(lemma)) d.uk.set(lemma, []);
            d.uk.get(lemma).push({ pos, pid: +pid, cut: +cut });
        }
        d.paradigms = forms.paradigms;
        d.alias = forms.alias || {};
        d.guess = forms.guess || {};
    }
    for (const line of data.expr || []) {
        const [fr, uk, src] = line.split('\t');
        const words = offlineDictTokens(fr, d).map(t => t.norm);   // the same glued words as a sentence («aujourd'hui»)
        if (words.length >= 2) d.expr.push({ fr, uk, src, words });
    }
    // Longest first: «avoir besoin de» before «avoir besoin».
    d.expr.sort((a, b) => b.words.length - a.words.length);
    return d;
}
// One lemma line → { i, lemma, pos, gender, freq, meanings: [{ uk, src }], confusions: [] }.
function offlineDictLemma(d, i) {
    if (d.cache.has(i)) return d.cache.get(i);
    const [lemma, pos, gender, freq, meanings, srcs, confusions] = d.lemmas[i].split('\t');
    const e = { i, lemma, pos, gender, freq: +freq || 0, meanings: (meanings ? meanings.split(';') : []).map((uk, k) => ({ uk, src: (srcs || '')[k] === 'w' ? 'wiktionary' : 'written' })),
        confusions: confusions ? confusions.split(';') : [] };
    d.cache.set(i, e);
    return e;
}
// The lemmas a French word form belongs to: binary search over the first keys of the blocks, then the front-coded block.
function offlineDictLookup(d, word) {
    const key = offlineDictNorm(word);
    let lo = 0, hi = d.heads.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (d.heads[mid] <= key) lo = mid; else hi = mid - 1;
    }
    if (!d.heads.length || d.heads[lo] > key) return [];
    let prev = '';
    for (const [n, row] of d.blocks[lo].split('\n').entries()) {
        const full = n ? prev.slice(0, parseInt(row[0], 36)) + row.slice(1) : row;
        prev = full;
        const tab = full.indexOf('\t'), form = full.slice(0, tab);
        if (form === key) return full.slice(tab + 1).split(',').map(x => offlineDictLemma(d, parseInt(x, 16)));
        if (form > key) break;
    }
    return [];
}

// ========== UKRAINIAN FORMS (VESUM) ==========
// Every form of a Ukrainian lemma: [{ pos, slots: Map(slot → form) }] (homographs give several).
function offlineDictUkForms(d, word) {
    const w = offlineDictUkNorm(word), lemma = d.uk.has(w) ? w : d.alias[w] || w;   // «гарна» in a meaning is a form of «гарний»
    return (d.uk.get(lemma) || []).map(({ pos, pid, cut }) => {
        const stem = cut ? lemma.slice(0, lemma.length - cut) : lemma, slots = new Map();
        for (const pair of String(d.paradigms[pid] || '').split(' ')) {
            const eq = pair.indexOf('=');
            if (eq > 0) slots.set(pair.slice(0, eq), stem + pair.slice(eq + 1));
        }
        return { pos, slots };
    });
}
// The slots in which `word` is a form of `lemma` ([{ pos, slot }], pos like 'N:f', 'V:perf', 'A'), [] when it is not one.
function offlineDictUkAnalyze(d, word, lemma) {
    const w = offlineDictUkNorm(word), out = [];
    for (const entry of offlineDictUkForms(d, lemma))
        for (const [slot, form] of entry.slots) if (form === w) out.push({ pos: entry.pos, slot });
    return out;
}
const offlineDictKind = (pos) => String(pos || '').split(':')[0];
function offlineDictUkInflect(d, lemma, slot, kind) {
    for (const entry of offlineDictUkForms(d, lemma)) if ((!kind || offlineDictKind(entry.pos) === kind) && entry.slots.has(slot)) return entry.slots.get(slot);
    return null;
}
// A verb form of the engine's translation that is not in the dictionary: its slot from its ending, when VESUM never reads it otherwise.
function offlineDictUkGuess(d, word) {
    const w = offlineDictUkNorm(word);
    for (const n of [4, 3, 2]) if (w.length > n + 1 && d.guess[w.slice(-n)]) return d.guess[w.slice(-n)];
    return null;
}
// The alternatives of a meaning «іти|піти» and the words of each.
const offlineDictAlternatives = (meaning) => String(meaning).split('|').map(a => a.trim()).filter(Boolean);
const offlineDictHead = (alternative) => alternative.split(/\s+/)[0];

// ========== FRENCH CONTEXT ==========
const OFFLINE_DICT_DET_M = new Set(['le', 'un', 'ce', 'cet', 'mon', 'ton', 'son', 'du', 'au', 'quel', 'aucun', 'chaque', 'notre', 'votre', 'leur']);
const OFFLINE_DICT_DET_F = new Set(['la', 'une', 'cette', 'ma', 'ta', 'sa', 'quelle', 'aucune']);
const OFFLINE_DICT_DET = new Set([...OFFLINE_DICT_DET_M, ...OFFLINE_DICT_DET_F, "l'", 'les', 'des', 'ces', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'aux', 'quelques', 'plusieurs', 'quels', 'quelles']);
const OFFLINE_DICT_SUBJECT = new Set(['je', "j'", 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles']);
const OFFLINE_DICT_OBJECT = new Set(['me', "m'", 'te', "t'", 'se', "s'", 'le', 'la', 'les', "l'", 'lui', 'leur', 'y', 'en', 'ne', "n'"]);
const OFFLINE_DICT_REFLEXIVE = new Set(['me', "m'", 'te', "t'", 'se', "s'", 'nous', 'vous', 'toi', 'moi']);
const OFFLINE_DICT_AFTER_VERB = new Set(['toi', 'moi', 'nous', 'vous']);
// Words that may stand between the words of a set expression: negation, pronouns, adverbs, the auxiliaries of compound tenses.
const OFFLINE_DICT_FILLER = new Set(['ne', "n'", 'pas', 'plus', 'jamais', 'rien', 'bien', 'déjà', 'toujours', 'vraiment', 'encore', 'aussi', 'très', 'trop', 'enfin',
    'me', "m'", 'te', "t'", 'se', "s'", 'nous', 'vous', 'lui', 'leur', 'le', 'la', 'les', "l'", 'y', 'en']);
const OFFLINE_DICT_ELIDED = { "d'": 'de', "l'": 'le', "qu'": 'que', "s'": 'se', "m'": 'me', "t'": 'te', "j'": 'je', "n'": 'ne', "c'": 'ce' };

// The words of a French text with their places: [{ text, norm, start, end }]. «l'homme» is «l'» + «homme», «aujourd'hui» one word.
function offlineDictTokens(text, d) {
    const out = [], re = /[\p{L}\p{M}\p{N}]+(?:['’](?=[\p{L}]))?|-(?=\p{L})/gu, s = String(text);
    let m;
    while ((m = re.exec(s))) {
        if (m[0] === '-') continue;
        let tok = { text: m[0], start: m.index, end: m.index + m[0].length };
        // a word with an apostrophe or a hyphen inside that the dictionary knows as ONE word (aujourd'hui, peut-être, est-ce)
        const glue = d && s.slice(tok.start).match(/^[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)+/u);
        // — never an elided clitic with its verb: Lexique lists «s'est», but the expression needs «se» + «être»
        if (glue && glue[0].length > tok.text.length && !OFFLINE_DICT_ELIDED[offlineDictNorm(tok.text)] && offlineDictLookup(d, glue[0]).length) {
            tok = { text: glue[0], start: tok.start, end: tok.start + glue[0].length };
            re.lastIndex = tok.end;
        }
        tok.norm = offlineDictNorm(tok.text);
        out.push(tok);
    }
    return out;
}
// The part of speech of the word at `at` read from its neighbours; null when they leave several.
function offlineDictPosHere(tokens, at, entries) {
    const kinds = [...new Set(entries.map(e => e.pos))];
    if (kinds.length === 1) return kinds[0];
    const p = at > 0 ? tokens[at - 1].norm : '', pp = at > 1 ? tokens[at - 2].norm : '';
    const has = (pos) => kinds.includes(pos) ? pos : null;
    if ((p === 'le' || p === 'la' || p === 'les' || p === "l'") && (OFFLINE_DICT_SUBJECT.has(pp) || pp === 'ne' || pp === "n'")) return has('V');
    if (OFFLINE_DICT_DET.has(p)) return has('N') || has('A');
    if (OFFLINE_DICT_SUBJECT.has(p) || (OFFLINE_DICT_OBJECT.has(p) && OFFLINE_DICT_SUBJECT.has(pp))) return has('V');
    return null;
}
function offlineDictGenderHere(tokens, at) {
    const p = at > 0 ? tokens[at - 1].norm : '';
    return OFFLINE_DICT_DET_M.has(p) ? 'm' : OFFLINE_DICT_DET_F.has(p) ? 'f' : '';
}
// The entries the word at `at` can be here: by part of speech and, for nouns, by the article's gender.
function offlineDictEntriesHere(d, tokens, at) {
    let entries = offlineDictLookup(d, tokens[at].text).filter(e => e.meanings.length);
    if (!entries.length) return { entries, pos: null };
    const pos = offlineDictPosHere(tokens, at, entries);
    if (pos) entries = entries.filter(e => e.pos === pos);
    const gender = pos === 'N' ? offlineDictGenderHere(tokens, at) : '';
    if (gender && entries.length > 1 && entries.some(e => e.gender.includes(gender))) entries = entries.filter(e => e.gender.includes(gender));
    return { entries, pos };
}

// ========== SET EXPRESSIONS ==========
// The possessives of an expression stand for any person: «faire ses devoirs» is also «je fais mes devoirs».
const OFFLINE_DICT_POSSESSIVE = [new Set(['mon', 'ton', 'son', 'notre', 'votre', 'leur']), new Set(['ma', 'ta', 'sa', 'notre', 'votre', 'leur']),
    new Set(['mes', 'tes', 'ses', 'nos', 'vos', 'leurs'])];
function offlineDictWordMatches(d, token, pattern, before) {
    const t = OFFLINE_DICT_ELIDED[token.norm] || token.norm, p = OFFLINE_DICT_ELIDED[pattern] || pattern;
    if (t === p) return true;
    if (OFFLINE_DICT_POSSESSIVE.some(set => set.has(t) && set.has(p))) return true;
    if (before && before.norm === 'y' && p === 'avoir') return false;   // «il y a un chat dans la gorge» is not «avoir un chat…»
    if (p === 'se') return OFFLINE_DICT_REFLEXIVE.has(token.norm);
    const own = offlineDictLookup(d, pattern), there = offlineDictLookup(d, token.text);
    // a word that has its own content (a noun, a verb…): any of its forms; a grammatical word only as written
    const content = own.filter(e => OFFLINE_DICT_CONTENT.includes(e.pos));
    return !!content.length && there.some(e => content.some(c => c.lemma === e.lemma && c.pos === e.pos));
}
const OFFLINE_DICT_CONTENT = ['N', 'V', 'A', 'ADV'], OFFLINE_DICT_GRAMMAR = ['PRE', 'DET', 'PRO', 'CON'];
// Set expressions found in the sentence: [{ expr, from, to, aux, content, verb }] (token indexes), longest first, never overlapping;
// `content` counts its words with a meaning of their own (nouns, verbs…), `verb` is its French verb as written.
function offlineDictFindExpressions(d, tokens) {
    const found = [], used = new Set();
    for (const expr of d.expr) {
        for (let start = 0; start < tokens.length; start++) {
            if (used.has(start)) continue;
            let at = start, k = 0, gaps = 0, aux = false, reflexive = expr.words[0] !== 'se', ok = true;
            const take = [];
            while (k < expr.words.length && at < tokens.length) {
                if (used.has(at)) { ok = false; break; }
                if (expr.words[k] === 'se') {
                    // the reflexive pronoun: here, or after the verb of an imperative («rends-toi compte»)
                    if (OFFLINE_DICT_REFLEXIVE.has(tokens[at].norm)) { reflexive = true; take.push(at); at++; k++; continue; }
                    k++; continue;
                }
                if (offlineDictWordMatches(d, tokens[at], expr.words[k], tokens[at - 1])) { take.push(at); at++; k++; continue; }
                if (!take.length) { ok = false; break; }
                const norm = tokens[at].norm, lemmas = offlineDictLookup(d, norm);
                const auxiliary = lemmas.some(e => e.pos === 'V' && (e.lemma === 'avoir' || e.lemma === 'être'));
                if (gaps < 3 && (OFFLINE_DICT_FILLER.has(norm) || auxiliary || OFFLINE_DICT_REFLEXIVE.has(norm))) {
                    if (auxiliary) aux = true;
                    if (OFFLINE_DICT_REFLEXIVE.has(norm)) reflexive = true;
                    gaps++; at++; continue;
                }
                ok = false; break;
            }
            // an imperative ends with its reflexive pronoun: «lève-toi»
            if (ok && !reflexive && k >= expr.words.length && at < tokens.length && OFFLINE_DICT_AFTER_VERB.has(tokens[at].norm)) { reflexive = true; take.push(at); }
            if (!ok || k < expr.words.length || !reflexive || !take.length) continue;
            if (take[0] !== start) continue;
            const from = take[0], to = take[take.length - 1];
            for (let i = from; i <= to; i++) used.add(i);
            // «ils ont pendu la crémaillère»: the auxiliary of a compound tense before the expression
            for (let i = from - 1; i >= Math.max(0, from - 2) && !aux; i--)
                if (offlineDictLookup(d, tokens[i].text).some(e => e.pos === 'V' && (e.lemma === 'avoir' || e.lemma === 'être'))) aux = true;
            // a grammatical word never counts, though Lexique also lists rare nouns for some («un», «de», «la»)
            const content = take.filter(i => { const es = offlineDictLookup(d, tokens[i].text);
                return es.some(e => OFFLINE_DICT_CONTENT.includes(e.pos)) && !es.some(e => OFFLINE_DICT_GRAMMAR.includes(e.pos)); });
            const verb = take.map(i => tokens[i]).find(t => offlineDictLookup(d, t.text).some(e => e.pos === 'V'));
            found.push({ expr, from, to, aux, content: content.length, verb: verb ? verb.norm : '' });
        }
    }
    return found.sort((a, b) => a.from - b.from);
}

// ========== CHOOSING AND SUBSTITUTING ==========
// Which meaning of `entries` the engine's Ukrainian `picked` (one or a few words) is: the meaning, or null.
function offlineDictMeaningOf(d, entries, picked) {
    const words = String(picked || '').split(/[^\p{L}'’ʼ-]+/u).filter(Boolean);
    for (const e of entries) for (const m of e.meanings) for (const alt of offlineDictAlternatives(m.uk)) {
        const head = offlineDictHead(alt);
        if (offlineDictUkNorm(alt) === offlineDictUkNorm(picked)) return { entry: e, meaning: m, alt };
        if (words.some(w => offlineDictUkAnalyze(d, w, head).length)) return { entry: e, meaning: m, alt };
    }
    return null;
}
// Whether the engine's word is a known pivot mistake of the entry: { word, slots } of the engine's word, or null.
function offlineDictConfusionOf(d, entries, picked) {
    const words = String(picked || '').split(/[^\p{L}'’ʼ-]+/u).filter(Boolean);
    if (words.length !== 1) return null;
    for (const e of entries) for (const c of e.confusions) {
        const slots = offlineDictUkAnalyze(d, words[0], c);
        if (slots.length) return { entry: e, word: words[0], slots };
    }
    return null;
}
// The meaning `alt` («черга», «залізна дорога», «іти|піти» already split) in the form of the engine's word it replaces, read from
// that word's `slots`: a noun takes its case and number, an adjective before it agrees, a verb takes the person/tense. null when
// the slots allow different forms (the engine's word is ambiguous) or a form is missing.
function offlineDictFit(d, alt, slots) {
    const words = alt.split(/\s+/), outs = new Set();
    const kinds = words.map(w => offlineDictUkForms(d, w).map(e => e.pos));
    const noun = kinds.findIndex(k => k.some(p => offlineDictKind(p) === 'N'));
    for (const { pos, slot } of slots) {
        if (!slot) return null;
        const kind = offlineDictKind(pos);
        let caseOf = '', number = '', out = null;
        if (kind === 'N') { caseOf = slot[0]; number = slot[1]; }
        else if (kind === 'A') { caseOf = slot[1]; number = slot[0] === 'p' ? 'p' : 's'; }
        if (kind === 'V') {
            if (!kinds[0].some(p => offlineDictKind(p) === 'V')) return null;
            const verb = offlineDictUkInflect(d, words[0], slot, 'V');
            out = verb && [verb, ...words.slice(1)];
        } else if (noun >= 0) {
            const nounPos = kinds[noun].find(p => offlineDictKind(p) === 'N'), gender = nounPos.split(':')[1] || 'm';
            const nounForm = offlineDictUkInflect(d, words[noun], caseOf + number, 'N');
            const adjSlot = (number === 'p' ? 'p' : gender === 'p' ? 'p' : gender) + caseOf;
            const before = words.slice(0, noun).map(w => offlineDictUkInflect(d, w, adjSlot, 'A'));
            out = nounForm && before.every(Boolean) ? [...before, nounForm, ...words.slice(noun + 1)] : null;
        } else if (kind === 'A' && kinds[0].some(p => p === 'A')) {
            const adj = offlineDictUkInflect(d, words[0], slot, 'A');
            out = adj && [adj, ...words.slice(1)];
        }
        if (!out) return null;
        outs.add(out.join(' '));
    }
    return outs.size === 1 ? [...outs][0] : null;
}
const offlineDictCaseLike = (out, like) => /^\p{Lu}/u.test(String(like)) ? out.charAt(0).toLocaleUpperCase('uk') + out.slice(1) : out;
// The aspect to use for a verb slot: present → imperfective, future → perfective, past → perfective after a French compound tense.
function offlineDictAspect(alts, slot, aux) {
    if (alts.length < 2) return slot && slot[0] === 'f' ? null : alts[0];
    if (!slot || slot === 'inf') return aux ? alts[1] : alts[0];
    if (slot[0] === 'r' || slot[0] === 'i') return alts[0];
    if (slot[0] === 'f') return alts[1];
    return aux ? alts[1] : alts[0];
}
// The engine's verb among its words for an expression: { slot, aspect } — exactly when it is a form of a dictionary meaning of the
// expression's words (a literal translation), else from its ending (only endings VESUM reads one way); null without a verb.
function offlineDictEngineVerb(d, tokens, hit, picked) {
    const words = String(picked).split(/[^\p{L}'’ʼ-]+/u).filter(Boolean);
    for (let i = hit.from; i <= hit.to; i++)
        for (const e of offlineDictLookup(d, tokens[i].text)) if (e.pos === 'V')
            for (const m of e.meanings) for (const alt of offlineDictAlternatives(m.uk)) for (const w of words)
                for (const a of offlineDictUkAnalyze(d, w, offlineDictHead(alt))) if (offlineDictKind(a.pos) === 'V') return { slot: a.slot, aspect: a.pos.split(':')[1] };
    for (const w of words) if (w.length >= 4) { const slot = offlineDictUkGuess(d, w); if (slot) return { slot, aspect: '' }; }
    return null;
}
// The dictionary's translation of a set expression in the form of the engine's words for it; null when not sure.
function offlineDictExpressionText(d, tokens, hit, picked) {
    const alts = offlineDictAlternatives(hit.expr.uk);
    const verbal = offlineDictUkForms(d, offlineDictHead(alts[0])).some(e => offlineDictKind(e.pos) === 'V');
    if (!verbal) return alts[0];
    const verb = offlineDictEngineVerb(d, tokens, hit, picked);
    // no verb in the engine's words: the infinitive only where French has one («avant de faire le ménage»), never for a tense
    if (!verb) return !hit.aux && offlineDictLookup(d, hit.verb).some(e => e.pos === 'V' && offlineDictNorm(e.lemma) === hit.verb) ? alts[0] : null;
    let alt = offlineDictAspect(alts, verb.slot, hit.aux || verb.aspect === 'perf');
    if (!alt) return null;
    const form = verb.slot === 'inf' ? offlineDictHead(alt) : offlineDictUkInflect(d, offlineDictHead(alt), verb.slot, 'V');
    return form ? [form, ...alt.split(/\s+/).slice(1)].join(' ') : null;
}
// Whether the engine translated the expression word by word: its words are meanings of the expression's own words.
function offlineDictLiteral(d, tokens, hit, picked) {
    if (offlineDictMeaningOf(d, [{ meanings: [{ uk: hit.expr.uk }] }], picked)) return false;   // the engine got it
    for (let i = hit.from; i <= hit.to; i++) {
        const entries = offlineDictLookup(d, tokens[i].text).filter(e => ['N', 'V', 'A', 'ADV'].includes(e.pos) && e.meanings.length);
        if (entries.length && (offlineDictMeaningOf(d, entries, picked) || offlineDictConfusionOf(d, entries, picked))) return true;
    }
    return false;
}

// ========== THE WORD (popup) ==========
// `result` is what js/offline-translate.js already has ({ text, alone }); `picked` the engine's word for it in the sentence.
// Returns the result with the dictionary's main meaning, its note and the other meanings, or null for a word it does not know.
async function offlineDictWord(word, sentence, src, tgt, result, picked) {
    try {
        const d = await offlineDictLoad(src, tgt);
        if (!d) return null;
        const tokens = offlineDictTokens(sentence || word, d);
        let at = tokens.findIndex(t => t.norm === offlineDictNorm(word));
        let ctxTokens = tokens;
        if (at < 0) { ctxTokens = offlineDictTokens(word, d); at = 0; }
        if (!ctxTokens.length) return null;
        const { entries } = offlineDictEntriesHere(d, ctxTokens, at);
        const all = offlineDictLookup(d, word).filter(e => e.meanings.length);
        const lemmaNote = (e) => offlineDictNorm(e.lemma) !== offlineDictNorm(word) ? e.lemma : '';
        // 1) a set expression around the word
        const hit = ctxTokens === tokens ? offlineDictFindExpressions(d, tokens).find(h => at >= h.from && at <= h.to) : null;
        let main = null, note = '', chosen = null, how = '';
        if (!all.length && !hit) return null;
        if (hit) { main = offlineDictAlternatives(hit.expr.uk)[0]; note = hit.expr.fr; how = 'expression'; }
        const pool = entries.length ? entries : all;
        if (!main && picked) {
            const known = offlineDictMeaningOf(d, pool, picked);
            if (known) { main = known.alt; chosen = known.meaning; how = 'engine'; }
            else if (offlineDictConfusionOf(d, pool, picked) && entries.length && new Set(entries.map(e => e.pos)).size === 1) {
                chosen = entries[0].meanings[0]; main = offlineDictAlternatives(chosen.uk)[0]; how = 'corrected';
            }
        }
        if (!main && !picked && entries.length === 1) { chosen = entries[0].meanings[0]; main = chosen.uk; how = 'dictionary'; }   // a verb: both aspects
        const senses = [];
        for (const e of (entries.length ? [...entries, ...all.filter(x => !entries.includes(x))] : all))
            senses.push({ lemma: e.lemma, pos: e.pos, gender: e.gender, note: lemmaNote(e), meanings: e.meanings.filter(m => m !== chosen).map(m => m.uk.replace('|', ' / ')) });
        offlineDictLast = { kind: 'word', how: how || 'engine-kept', senses: senses.length, at: Date.now() };
        const text = main ? offlineTrCase(main.replace('|', ' / '), word) : result.text;
        if (!main) note = '';
        const lemmaOf = !hit && (chosen ? pool.find(e => e.meanings.includes(chosen)) : pool[0]);
        if (!note && lemmaOf && lemmaNote(lemmaOf)) note = lemmaOf.lemma;
        return { text, alone: main && result.alone && offlineDictUkNorm(result.alone) !== offlineDictUkNorm(text) ? result.alone : main ? null : result.alone,
            note, senses: senses.filter(s => s.meanings.length) };
    } catch (e) { return null; }
}
const OFFLINE_DICT_POS_KEYS = { N: 'offPosN', V: 'offPosV', A: 'offPosA', ADV: 'offPosAdv', PRE: 'offPosPre', CON: 'offPosCon', PRO: 'offPosPro', DET: 'offPosDet', NUM: 'offPosNum', INTJ: 'offPosIntj' };
function offlineDictSensesHtml(result) {
    const rows = result.senses.slice(0, 4).map(s => `<div class="tt-sense"><span class="tt-pos">${escapeHtml(s.lemma)} · ${escapeHtml(t(OFFLINE_DICT_POS_KEYS[s.pos] || 'offPosN'))}${s.gender && s.pos === 'N' ? ' ' + escapeHtml(s.gender) : ''}</span> ${escapeHtml(s.meanings.slice(0, 4).join('; '))}</div>`);
    return `<div class="tt-extra"><div class="tt-dict-src">📖 ${escapeHtml(t('offDictTitle'))}</div>${rows.join('')}</div>`;
}

// ========== THE SENTENCE ==========
// The engine's translation of a sentence with the dictionary's corrections, or the engine's translation as it is. Without the
// direction's dictionary it is exactly offlineTranslate().
async function offlineTranslateSentence(text, src, tgt, signal) {
    const d = await offlineDictLoad(src, tgt).catch(() => null);
    if (!d) return offlineTranslate(text, src, tgt, signal);
    const tokens = offlineDictTokens(text, d), targets = [];
    for (const hit of offlineDictFindExpressions(d, tokens)) targets.push({ kind: 'expr', hit, from: hit.from, to: hit.to });
    for (let i = 0; i < tokens.length && targets.length < OFFLINE_DICT_MAX_TARGETS * 2; i++) {
        if (targets.some(x => i >= x.from && i <= x.to)) continue;
        const { entries, pos } = offlineDictEntriesHere(d, tokens, i);
        // a word the engine is known to get wrong, with one reading here
        if (pos && entries.length && entries.every(e => e.pos === pos) && entries.some(e => e.confusions.length)) targets.push({ kind: 'word', entries, from: i, to: i });
    }
    targets.sort((a, b) => a.from - b.from);
    const chosen = targets.slice(0, OFFLINE_DICT_MAX_TARGETS);
    if (!chosen.length) return offlineTranslate(text, src, tgt, signal);
    let html = '', last = 0;
    const s = String(text);
    chosen.forEach((x, k) => {
        const a = tokens[x.from].start, b = tokens[x.to].end, tag = OFFLINE_DICT_TAGS[k];
        html += offlineTrEscape(s.slice(last, a)) + `<${tag}>` + offlineTrEscape(s.slice(a, b)) + `</${tag}>`;
        last = b;
    });
    html += offlineTrEscape(s.slice(last));
    const out = await offlineTranslate(html, src, tgt, signal, true);
    if (!out) return null;
    const changes = [];
    let result = out.replace(/<(b|i|u)>([\s\S]*?)<\/\1>/gi, (all, tag, inner) => {
        const x = chosen[OFFLINE_DICT_TAGS.indexOf(tag.toLowerCase())], picked = offlineTrUnescape(inner.replace(/<[^>]*>/g, ''));
        const word = picked.replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '');
        if (!x || !word) return inner;
        let fixed = null;
        if (x.kind === 'expr') {
            // the engine's words must cover the whole expression: «<b>вішаю</b> стійку» marks one word of two, and replacing it
            // would leave the rest of the literal translation behind
            const covers = word.split(/\s+/).length >= x.hit.content;
            if (covers && offlineDictLiteral(d, tokens, x.hit, word)) fixed = offlineDictExpressionText(d, tokens, x.hit, word);
        } else if (!offlineDictMeaningOf(d, x.entries, word)) {
            const wrong = offlineDictConfusionOf(d, x.entries, word);
            const alts = wrong && offlineDictAlternatives(x.entries[0].meanings[0].uk);   // a verb keeps the aspect of the engine's word
            if (wrong) fixed = offlineDictFit(d, alts[1] && wrong.slots[0].pos === 'V:perf' ? alts[1] : alts[0], wrong.slots);
        }
        if (!fixed) return inner;
        changes.push(x.kind);
        return inner.replace(word, offlineDictCaseLike(fixed, word));
    });
    result = offlineTrUnescape(result.replace(/<[^>]*>/g, '')).replace(/\s{2,}/g, ' ').trim();
    offlineDictLast = { kind: 'sentence', targets: chosen.length, changed: changes, at: Date.now() };
    return result || null;
}

Object.assign(I18N, {
    offWithDict: { uk: 'зі словником', en: 'with dictionary', fr: 'avec dictionnaire', ru: 'со словарём', zh: '含词典', ko: '사전 포함', hi: 'शब्दकोश सहित', ga: 'le foclóir', es: 'con diccionario' },
    offDictTitle: { uk: 'Словник', en: 'Dictionary', fr: 'Dictionnaire', ru: 'Словарь', zh: '词典', ko: '사전', hi: 'शब्दकोश', ga: 'Foclóir', es: 'Diccionario' },
    offPosN: { uk: 'ім.', en: 'n.', fr: 'n.', ru: 'сущ.', zh: '名词', ko: '명사', hi: 'संज्ञा', ga: 'ainm.', es: 's.' },
    offPosV: { uk: 'дієсл.', en: 'v.', fr: 'v.', ru: 'гл.', zh: '动词', ko: '동사', hi: 'क्रिया', ga: 'br.', es: 'verbo' },
    offPosA: { uk: 'прикм.', en: 'adj.', fr: 'adj.', ru: 'прил.', zh: '形容词', ko: '형용사', hi: 'विशेषण', ga: 'aid.', es: 'adjetivo' },
    offPosAdv: { uk: 'присл.', en: 'adv.', fr: 'adv.', ru: 'нареч.', zh: '副词', ko: '부사', hi: 'क्रियाविशेषण', ga: 'dobh.', es: 'adverbio' },
    offPosPre: { uk: 'прийм.', en: 'prep.', fr: 'prép.', ru: 'предл.', zh: '介词', ko: '전치사', hi: 'संबंधसूचक', ga: 'réamhfh.', es: 'preposición' },
    offPosCon: { uk: 'спол.', en: 'conj.', fr: 'conj.', ru: 'союз', zh: '连词', ko: '접속사', hi: 'समुच्चय', ga: 'cónasc', es: 'conjunción' },
    offPosPro: { uk: 'займ.', en: 'pron.', fr: 'pron.', ru: 'мест.', zh: '代词', ko: '대명사', hi: 'सर्वनाम', ga: 'forainm', es: 'pronombre' },
    offPosDet: { uk: 'означ.', en: 'det.', fr: 'dét.', ru: 'определ.', zh: '限定词', ko: '한정사', hi: 'निर्धारक', ga: 'cinnt.', es: 'determinante' },
    offPosNum: { uk: 'числ.', en: 'num.', fr: 'num.', ru: 'числ.', zh: '数词', ko: '수사', hi: 'संख्या', ga: 'uimh.', es: 'numeral' },
    offPosIntj: { uk: 'виг.', en: 'interj.', fr: 'interj.', ru: 'межд.', zh: '叹词', ko: '감탄사', hi: 'विस्मयादि', ga: 'intriacht', es: 'interjección' }
});
