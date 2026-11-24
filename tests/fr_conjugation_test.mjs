// Unit test of js/grammar-conjugation.js with dict/fr-verbs.json: the tables the Grammar panel shows without AI.
// Every cell of every tense of a sample of 178 verbs is compared with the French Wiktionary's own table
// (tests/fixtures/fr_verbs_check.json, written by tools/build_fr_verbs.py). Run: node tests/fr_conjugation_test.mjs
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, runInContext } from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'js', 'grammar-conjugation.js'), 'utf8');
const data = readFileSync(join(root, 'dict', 'fr-verbs.json'));
const PERSONS = ['je', 'tu', 'il / elle / on', 'nous', 'vous', 'ils / elles'];
const ctx = createContext({
    console, Map, Promise, JSON,
    Set, Object, Intl, navigator: { languages: ['fr'] }, window: {},
    fetch: async url => ({ ok: url.startsWith('dict/fr-verbs.json?v='), json: async () => JSON.parse(data.toString('utf8')) }),
});
runInContext(readFileSync(join(root, 'js', 'core-languages.js'), 'utf8'), ctx);   // the real French grammar config (persons, endings)
runInContext(src + '\nthis.api = { loadFrVerbTables, localVerbParadigm, frVerbAnalyses, frVerbTablesReady, frVerbIsParticipleOf, frVerbEntry, localFrSentenceVerbs, FR_VERB_TABLES_VERSION };', ctx);
const api = ctx.api;
let failed = 0;
const ok = (name, cond, extra = '') => { if (cond) console.log('PASS', name); else { failed++; console.log('FAIL', name, extra); } };

ok('the version in the script is the data file\'s own (tools/build_fr_verbs.py rebuilt → update FR_VERB_TABLES_VERSION)',
    api.FR_VERB_TABLES_VERSION === createHash('sha256').update(data).digest('hex').slice(0, 12), api.FR_VERB_TABLES_VERSION);
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
ok('the offline shell (sw.js) keeps this very version of the tables, so the panel works offline from the first start', sw.includes(`'./dict/fr-verbs.json?v=${api.FR_VERB_TABLES_VERSION}'`));
ok('not loaded before it is asked for', !api.frVerbTablesReady() && api.localVerbParadigm('fr', 'manger', 'indicatif_present') === null);
await api.loadFrVerbTables();
ok('loaded', api.frVerbTablesReady());

// ---- every cell of the sample against Wiktionary
const sample = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'fr_verbs_check.json'), 'utf8')).verbs;
const SIMPLE = { present: 'indicatif_present', imparfait: 'indicatif_imparfait', futur: 'indicatif_futur', conditionnel: 'conditionnel_present',
    subjonctif: 'subjonctif_present', passe_simple: 'passe_simple', subjonctif_imparfait: 'subjonctif_imparfait', imperatif: 'imperatif' };
let cells = 0, wrong = [];
for (const [lemma, want] of Object.entries(sample)) {
    for (const [tense, list] of Object.entries(want.simple)) {
        const got = api.localVerbParadigm('fr', lemma, SIMPLE[tense]) || {};
        const keys = tense === 'imperatif' ? ['tu', 'nous', 'vous'] : PERSONS;
        list.forEach((form, i) => { if (!form) return; cells++; if (got[keys[i]] !== form) wrong.push([lemma, tense, keys[i], got[keys[i]], form]); });
    }
    for (const [tense, list] of Object.entries(want.compound)) {
        const got = api.localVerbParadigm('fr', lemma, tense) || {};
        list.forEach((form, i) => { if (!form) return; cells++; if (got[PERSONS[i]] !== form) wrong.push([lemma, tense, PERSONS[i], got[PERSONS[i]], form]); });
    }
}
ok(`all ${cells} cells of ${Object.keys(sample).length} verbs (simple and compound tenses) are Wiktionary's own`, cells > 13000 && wrong.length === 0, JSON.stringify(wrong.slice(0, 8)));

// ---- the Grammar panel's tense buttons
const t = (lemma, tense) => JSON.stringify(api.localVerbParadigm('fr', lemma, tense));
ok('manger, présent', t('manger', 'indicatif_present') === JSON.stringify({ je: 'mange', tu: 'manges', 'il / elle / on': 'mange', nous: 'mangeons', vous: 'mangez', 'ils / elles': 'mangent' }));
ok('aller, passé composé (être, plural -s)', t('aller', 'indicatif_passe_compose') === JSON.stringify({ je: 'suis allé', tu: 'es allé', 'il / elle / on': 'est allé', nous: 'sommes allés', vous: 'êtes allés', 'ils / elles': 'sont allés' }));
ok('finir, plus-que-parfait', JSON.parse(t('finir', 'plus_que_parfait'))['nous'] === 'avions fini');
ok('être, impératif: tu, nous, vous only', t('être', 'imperatif') === JSON.stringify({ tu: 'sois', nous: 'soyons', vous: 'soyez' }));
ok('falloir: only «il»', t('falloir', 'indicatif_present') === JSON.stringify({ 'il / elle / on': 'faut' }));
ok('a pronominal lemma («se lever») of a plain verb: the reflexive pronoun and être', JSON.parse(t('se lever', 'indicatif_present'))['je'] === 'me lève'
    && JSON.parse(t('se lever', 'indicatif_passe_compose'))['il / elle / on'] === 's’est levé' && JSON.parse(t('se lever', 'imperatif'))['tu'] === 'lève-toi'
    && JSON.parse(t('lever', 'indicatif_present'))['je'] === 'lève' && JSON.parse(t('s’habiller', 'indicatif_present'))['je'] === 'm’habille', t('se lever', 'indicatif_present'));
ok('œ / oe spelled either way', t('manœuvrer', 'indicatif_present') === t('manoeuvrer', 'indicatif_present') && !!api.localVerbParadigm('fr', 'manoeuvrer', 'indicatif_present'));
ok('another language or an unknown verb: null (the AI answers as before)', api.localVerbParadigm('en', 'walk', 'indicatif_present') === null && api.localVerbParadigm('fr', 'blorpir', 'indicatif_present') === null);

// ---- what a written form can be
const an = w => api.frVerbAnalyses(w).map(a => `${a.lemma}:${a.tense}:${a.person}`).sort().join(' ');
ok('regardait = regarder, imparfait, 3rd person', an('regardait') === 'regarder:imparfait:2', an('regardait'));
ok('parle: présent je/il, subjonctif je/il, impératif tu', an('parle') === 'parler:imperatif:1 parler:present:0 parler:present:2 parler:subjonctif:0 parler:subjonctif:2', an('parle'));
ok('allions = aller, imparfait, nous', an('allions').includes('aller:imparfait:3'));
ok('sois = être, subjonctif tu / impératif tu', an('sois').includes('être:subjonctif:1') && an('sois').includes('être:imperatif:1'));
ok('mangé = past participle of manger', an('mangé') === 'manger:participe_passe:-1');
ok('accents and apostrophes are matched either way (J’allai / allai)', an('Allai') === 'aller:passe_simple:0');
ok('a feminine / plural participle belongs to its verb', api.frVerbIsParticipleOf('allées', api.frVerbEntry('aller')) && !api.frVerbIsParticipleOf('allons', api.frVerbEntry('aller')));
ok('a pronominal-only verb: «souviens» = se souvenir, and its table keeps the pronoun', an('souviens').includes('se souvenir:present:0') && JSON.parse(t('se souvenir', 'indicatif_present'))['je'] === 'me souviens' && JSON.parse(t('se souvenir', 'indicatif_passe_compose'))['tu'] === 't’es souvenu', an('souviens'));
ok('the lookup needs no index of every form (fast, small)', (() => { const t0 = Date.now(); for (let i = 0; i < 50; i++) api.frVerbAnalyses('regardaient'); return Date.now() - t0 < 500; })());
ok('a word that is no verb form: nothing', an('fenêtre') === '' && an('rouge') === '');
// ---- every verb of a sentence (a selection), each rule of js/grammar-conjugation.js localFrSentenceVerbs
// Measured on 120 sentences of two novels' and two textbooks' pages against a careful AI list (2026-11-24): 95 % / 93 % of
// the verbs found (tuning / held-out set), 97 % / 95 % of the finds right, lemma 99 %, tense 98 % / 94 %, person 99 % / 96 %.
const verbs = s => api.localFrSentenceVerbs(s).map(r => `${r.item.surface}=${r.item.lemma}:${r.item.features.tense || ''}:${r.item.features.mood}${r.item.features.person ? ':' + r.item.features.person[0] + (r.item.features.number === 'pluriel' ? 'p' : 's') : ''}`).join(' | ');
const CASES = [
    ['Hier soir, nous sommes allés au cinéma, puis nous avons mangé une pizza et Marie nous a raconté son voyage.',
        'sommes allés=aller:passé composé:indicatif:1p | avons mangé=manger:passé composé:indicatif:1p | a raconté=raconter:passé composé:indicatif:3s', 'compound tenses; «Marie» is a name, not marier'],
    ['La porte de la maison est ouverte et le livre est sur la table.', 'est=être:présent:indicatif:3s | est=être:présent:indicatif:3s', '«la porte», «le livre» are nouns'],
    ['Il porte un sac et il livre des pizzas le soir.', 'porte=porter:présent:indicatif:3s | livre=livrer:présent:indicatif:3s', 'the same words with a subject are verbs'],
    ['Est-il venu ? Demanda-t-il en souriant.', 'venu=venir:passé composé:indicatif:3s | Demanda=demander:passé simple:indicatif:3s | souriant=sourire:présent:participe', 'inversion: «est-il venu» is a passé composé, demanda-t-il'],
    ['Mais non, tenez, préparez-moi mes habits et partez.', 'tenez=tenir:présent:impératif:2p | préparez=préparer:présent:impératif:2p | partez=partir:présent:impératif:2p', 'impératif after a comma, before -moi'],
    ['Je pense que tu viens, et il faut que tu viennes.', 'pense=penser:présent:indicatif:1s | viens=venir:présent:indicatif:2s | faut=falloir:présent:indicatif:3s | viennes=venir:présent:subjonctif:2s', 'subjonctif only after «il faut que»'],
    ['Est-ce qu’il consomme des produits laitiers ?', 'Est=être:présent:indicatif:3s | consomme=consommer:présent:indicatif:3s', '«est-ce que» takes the indicatif'],
    ['Toi qui fus si bonne, tu ne la laissais jamais seule.', 'fus=être:passé simple:indicatif:2s | laissais=laisser:imparfait:indicatif:2s', '«toi qui» = tu; «la laissais»: an object pronoun'],
    ['Mon chagrin en fut adouci, et nous avons été admis.', 'fut adouci=adoucir:passé simple:indicatif:3s | avons été admis=admettre:passé composé:indicatif:1p', 'the passive'],
    ['Je ne veux point partir avant de manger.', 'veux=vouloir:présent:indicatif:1s | partir=partir::infinitif | manger=manger::infinitif', '«ne… point» is no verb; infinitives'],
    ['Au coucher du soleil, toute offre fut refusée.', 'fut refusée=refuser:passé simple:indicatif:3s', '«au coucher», «toute offre» are nouns'],
];
for (const [text, want, why] of CASES) ok(`sentence: ${why}`, verbs(text) === want, '\n      got  ' + verbs(text) + '\n      want ' + want);
if (failed) { console.log(failed, 'FAILED'); process.exit(1); }
console.log('ALL FRENCH CONJUGATION CHECKS PASSED');
