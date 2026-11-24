// Unit test of js/grammar-english.js with dict/en-verbs.json: English verbs and adjectives without AI.
// 1) The four forms of every verb of a sample (533: the 150 most common, every irregular one of the first 2 000, every 40th after)
//    and the comparative / superlative of 362 adjectives are compared with the English Wiktionary's own forms
//    (tests/fixtures/en_verbs_check.json, written by tools/build_en_verbs.py); every tense button of the Grammar panel is built from them.
// 2) One sentence per rule (our own sentences): which words are verbs / adjectives, lemma, tense, person, number, degree.
// Run: node tests/en_conjugation_test.mjs
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, runInContext } from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = readFileSync(join(root, 'dict', 'en-verbs.json'));
const ctx = createContext({
    console, Map, Promise, JSON, Set, Object, Intl, navigator: { languages: ['en'] }, window: {},
    fetch: async url => ({ ok: url.startsWith('dict/en-verbs.json?v='), json: async () => JSON.parse(data.toString('utf8')) }),
});
runInContext(readFileSync(join(root, 'js', 'core-languages.js'), 'utf8'), ctx);   // the real English grammar config (persons, tenses, endings)
runInContext('function grammarSplitSentences(t) { return t.split(/(?<=[.!?])\\s+/); }', ctx);
runInContext(readFileSync(join(root, 'js', 'grammar-english.js'), 'utf8') + `
this.api = { loadEnVerbTables, enVerbTablesReady, enVerbParadigm, enVerbForms, enVerbAnalyses, enAdjDegrees, enAdjAnalyses,
    localEnSentenceVerbs, localEnSentenceAdjectives, localEnTappedVerb, localEnTappedAdjective, EN_VERB_TABLES_VERSION, cfg: grammarConfigFor('en') };`, ctx);
const api = ctx.api;
let failed = 0;
const ok = (name, cond, extra = '') => { if (cond) console.log('PASS', name); else { failed++; console.log('FAIL', name, extra); } };

ok('the version in the script is the data file\'s own (tools/build_en_verbs.py rebuilt → update EN_VERB_TABLES_VERSION)',
    api.EN_VERB_TABLES_VERSION === createHash('sha256').update(data).digest('hex').slice(0, 12), api.EN_VERB_TABLES_VERSION);
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
ok('the offline shell (sw.js) keeps this very version of the data, so the panel works offline from the first start', sw.includes(`'./dict/en-verbs.json?v=${api.EN_VERB_TABLES_VERSION}'`));
ok('not loaded before it is asked for', !api.enVerbTablesReady() && api.enVerbParadigm('walk', 'present_simple') === null);
const t0 = Date.now();
await api.loadEnVerbTables();
ok(`loaded in ${Date.now() - t0} ms`, api.enVerbTablesReady());

// ---- 1. the forms against Wiktionary ----
const check = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'en_verbs_check.json'), 'utf8'));
const P = api.cfg.verb.persons;
let cells = 0, bad = [];
for (const [lemma, [s, ing, past, pp]] of Object.entries(check.verbs)) {
    const f = api.enVerbForms(lemma);
    const got = f ? [f.s[0], f.ing[0], f.past[0], f.pp[0]] : null;
    cells += 4;
    if (JSON.stringify(got) !== JSON.stringify([s, ing, past, pp])) { bad.push(`${lemma}: ${got} ≠ ${[s, ing, past, pp]}`); continue; }
    // every tense button: the person's own form
    const t = id => api.enVerbParadigm(lemma, id) || {};
    const want = {
        present_simple: [lemma, lemma, s, lemma, lemma, lemma], present_continuous: ['am', 'are', 'is', 'are', 'are', 'are'].map(b => b + ' ' + ing),
        past_simple: Array(6).fill(past), past_continuous: ['was', 'were', 'was', 'were', 'were', 'were'].map(b => b + ' ' + ing),
        present_perfect: ['have', 'have', 'has', 'have', 'have', 'have'].map(b => b + ' ' + pp), past_perfect: Array(6).fill('had ' + pp),
        future_simple: Array(6).fill('will ' + lemma), conditional: Array(6).fill('would ' + lemma)
    };
    for (const [id, forms] of Object.entries(want)) { cells += 6; if (JSON.stringify(P.map(p => t(id)[p])) !== JSON.stringify(forms)) bad.push(`${lemma} ${id}: ${JSON.stringify(t(id))}`); }
}
ok(`${Object.keys(check.verbs).length} verbs: ${cells} forms and tense cells, all as Wiktionary gives them`, !bad.length, bad.slice(0, 5).join('; '));
ok('every tense of the Grammar panel has a table', api.cfg.verb.tenses.every(tn => api.enVerbParadigm('go', tn.id)));
ok('be: am / are / is, was / were in every tense', JSON.stringify(Object.values(api.enVerbParadigm('be', 'present_simple'))) === JSON.stringify(['am', 'are', 'is', 'are', 'are', 'are'])
    && JSON.stringify(Object.values(api.enVerbParadigm('be', 'past_simple'))) === JSON.stringify(['was', 'were', 'was', 'were', 'were', 'were'])
    && api.enVerbParadigm('be', 'present_perfect')[P[2]] === 'has been' && api.enVerbParadigm('be', 'present_continuous')[P[0]] === 'am being');
ok('a modal: one form for every person, no continuous', api.enVerbParadigm('can', 'present_simple')[P[2]] === 'can' && api.enVerbParadigm('can', 'past_simple')[P[5]] === 'could'
    && api.enVerbParadigm('must', 'present_continuous') === null);
ok('another language or an unknown verb: null (the AI answers as before)', api.enVerbParadigm('blorpify', 'present_simple') === null && api.enVerbParadigm('walk', 'indicatif_present') === null);
let adjBad = [];
for (const [lemma, want] of Object.entries(check.adjectives)) {
    const got = api.enAdjDegrees(lemma);
    if (JSON.stringify(got) !== JSON.stringify(want)) adjBad.push(`${lemma}: ${got} ≠ ${want}`);
}
ok(`${Object.keys(check.adjectives).length} adjectives: comparative and superlative as Wiktionary gives them (or none)`, !adjBad.length, adjBad.slice(0, 5).join('; '));
const an = w => JSON.stringify(api.enVerbAnalyses(w).map(a => a.lemma + ':' + a.slot));
ok('what a form is: stopped -> stop (past, pp), studies -> study, loving -> love, went -> go, lying -> lie',
    an('stopped') === '["stop:past","stop:pp"]' && an('studies') === '["study:s"]' && an('loving').includes('love:ing') && an('went') === '["go:past"]' && an('lying').includes('lie:ing'));

// ---- 2. one sentence per rule ----
const verbs = s => api.localEnSentenceVerbs(s).map(v => [v.item.surface, v.item.lemma, v.item.features.tense || null, v.item.features.person || null, v.item.features.number || null]);
const same = (got, want) => JSON.stringify(got) === JSON.stringify(want);
const RULES = [
    ['present simple, 3rd person -s', 'She walks to school every day.', [['walks', 'walk', 'present simple', '3rd person', 'singular']]],
    ['present simple with a noun subject in the plural', 'The children play in the garden.', [['play', 'play', 'present simple', '3rd person', 'plural']]],
    ['present continuous: am / is / are + -ing', 'They are reading a book.', [['are reading', 'read', 'present continuous', '3rd person', 'plural']]],
    ['past simple of an irregular verb', 'I went home early.', [['went', 'go', 'past simple', '1st person', 'singular']]],
    ['past continuous', 'We were watching the rain.', [['were watching', 'watch', 'past continuous', '1st person', 'plural']]],
    ['present perfect', 'He has eaten the cake.', [['has eaten', 'eat', 'present perfect', '3rd person', 'singular']]],
    ['past perfect with an adverb inside, then a past simple', 'She had already left when we arrived.',
        [['had already left', 'leave', 'past perfect', '3rd person', 'singular'], ['arrived', 'arrive', 'past simple', '1st person', 'plural']]],
    ['future simple: will + the base form', 'I will call you tomorrow.', [['will call', 'call', 'future simple', '1st person', 'singular']]],
    ['conditional: would + the base form', 'It would be nice.', [['would be', 'be', 'conditional', '3rd person', 'singular']]],
    ['present perfect continuous', 'They have been waiting for hours.', [['have been waiting', 'wait', 'present perfect continuous', '3rd person', 'plural']]],
    ['the passive: be + the past participle', 'The letter was written by my uncle.', [['was written', 'write', 'past simple', '3rd person', 'singular']]],
    ['contractions: don\'t = do + not', 'I don\'t know.', [['don\'t know', 'know', 'present simple', '1st person', 'singular']]],
    ['a question: did + the subject + the base form', 'Did you see the film?', [['see', 'see', 'past simple', '2nd person', null]]],
    ['an imperative at the start of a sentence', 'Open the window, please.', [['Open', 'open', 'imperative', null, null]]],
    ['to + the infinitive after a verb', 'He wants to learn French.', [['wants', 'want', 'present simple', '3rd person', 'singular'], ['learn', 'learn', 'infinitive', null, null]]],
    ['a gerund after a verb', 'She enjoys reading old books.', [['enjoys', 'enjoy', 'present simple', '3rd person', 'singular'], ['reading', 'read', 'gerund', null, null]]],
    ['used to + the base form', 'We used to live here.', [['used to live', 'live', 'past simple', '1st person', 'plural']]],
    ['the subject before a relative clause', 'The man who lives here is kind.', [['lives', 'live', 'present simple', '3rd person', 'singular'], ['is', 'be', 'present simple', '3rd person', 'singular']]],
    ['a noun after a determiner is no verb', 'The book is on the table.', [['is', 'be', 'present simple', '3rd person', 'singular']]],
];
for (const [name, s, want] of RULES) { const got = verbs(s); ok(`${name}: «${s}»`, same(got, want), JSON.stringify(got)); }
const modal = api.localEnSentenceVerbs('You can\'t stop now.')[0];
ok('a modal: can\'t stop, the modal is the auxiliary, no tense of its own', modal && modal.item.surface === 'can\'t stop' && modal.item.lemma === 'stop' && modal.item.features.auxiliary === 'can' && !modal.item.features.tense && modal.item.rule === 'modal-verbs');
const passive = api.localEnSentenceVerbs('The house is being painted.')[0];
ok('the passive in a continuous tense links the passive rule', passive && passive.item.surface === 'is being painted' && passive.item.features.tense === 'present continuous' && passive.item.rule === 'passive-voice');
const adjs = s => api.localEnSentenceAdjectives(s, api.localEnSentenceVerbs(s)).map(a => [a.item.surface, a.item.lemma, a.item.features.degree || null, a.item.agreesWith]);
const ADJ = [
    ['before its noun', 'She enjoys reading old books.', [['old', 'old', null, 'books']]],
    ['after a linking verb, and after «but»', 'I\'m tired but happy.', [['tired', 'tired', null, 'I'], ['happy', 'happy', null, null]]],
    ['a superlative', 'This is the biggest house in the street.', [['biggest', 'big', 'superlative', 'house']]],
    ['a comparative after be', 'My sister is taller than me.', [['taller', 'tall', 'comparative', 'sister']]],
    ['more + an adjective is a comparative', 'It is a more beautiful city.', [['beautiful', 'beautiful', 'comparative', 'city']]],
    ['an irregular comparative', 'This is a better idea.', [['better', 'good', 'comparative', 'idea']]],
    ['a noun after a determiner is no adjective, a verb neither', 'The light was on.', []],
];
for (const [name, s, want] of ADJ) { const got = adjs(s); ok(`adjective ${name}: «${s}»`, same(got, want), JSON.stringify(got)); }
const tap = api.localEnTappedVerb('eaten', 'He has eaten the cake.');
ok('a tapped participle opens its whole group (has eaten, present perfect)', tap && tap.item.surface === 'has eaten' && tap.item.features.tense === 'present perfect' && !!tap.item.forms && tap.item.forms[P[2]] === 'has eaten');
const tapAdj = api.localEnTappedAdjective('biggest', 'This is the biggest house in the street.');
ok('a tapped adjective is read from the tables', tapAdj && tapAdj.item.lemma === 'big' && tapAdj.item.features.degree === 'superlative');
ok('a tapped noun is not a verb (the AI decides)', api.localEnTappedVerb('table', 'The book is on the table.') === null);
// speed: a long paragraph at once
const para = Array(10).fill('She had already left when we arrived, and the children were playing in the garden while their parents talked.').join(' ');
const t1 = Date.now(); api.localEnSentenceAdjectives(para, api.localEnSentenceVerbs(para, 200), 200);
ok(`a ${para.length}-character paragraph read in ${Date.now() - t1} ms (under 300)`, Date.now() - t1 < 300);

console.log(failed ? `${failed} ENGLISH CHECKS FAILED` : 'ALL ENGLISH CONJUGATION CHECKS PASSED');
process.exit(failed ? 1 : 0);
