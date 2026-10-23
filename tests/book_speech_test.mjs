// Checks the pure matching helpers of js/book-speech.js (no browser): which sentence and which word occurrence a tap means.
// Run: node tests/book_speech_test.mjs
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'js', 'book-speech.js'), 'utf8');
const ctx = createContext({ I18N: {}, console });
runInContext(source, ctx);

// The JSON format of tools/book_tts/generate.py, for two sentences on page 20 and one on page 21.
const sentences = [
    {
        page: 20, text: 'Je viens du Maroc.', duration: 2.0,
        words: [{ s: 0, e: 2, start: 100, end: 300 }, { s: 3, e: 8, start: 320, end: 500 }, { s: 9, e: 11, start: 520, end: 600 }, { s: 12, e: 17, start: 620, end: 900 }],
    },
    {
        page: 20, text: 'Je suis espagnol et je viens de Madrid.', duration: 3.5,
        words: [
            { s: 0, e: 2, start: 0, end: 200 }, { s: 3, e: 7, start: 220, end: 500 }, { s: 8, e: 16, start: 520, end: 900 },
            { s: 17, e: 19, start: 920, end: 1000 }, { s: 20, e: 22, start: 1020, end: 1100 }, { s: 23, e: 28, start: 1120, end: 1500 },
            { s: 29, e: 31, start: 1520, end: 1600 }, { s: 32, e: 38, start: 1620, end: 2000 },
        ],
    },
    {
        page: 21, text: 'Je suis canadienne.', duration: 1.8,
        words: [{ s: 0, e: 2, start: 0, end: 150 }, { s: 3, e: 7, start: 170, end: 400 }],
    },
];

let failed = 0;
function check(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a === e) console.log('ok  ', name);
    else { failed++; console.log('FAIL', name, '\n     got', a, '\n     want', e); }
}
const run = (expr, extra = {}) => runInContext(`(${expr})`, Object.assign(ctx, { sentences, ...extra }));

// Normalisation: case, punctuation and apostrophe variants
check('bsWordKey drops punctuation and case', run('bsWordKey("Maroc.")'), 'maroc');
check('bsWordKey keeps accents', run('bsWordKey("école,")'), 'école');
check('bsKeys: a word as a tap takes it (apostrophes and hyphens inside)', run('bsKeys("« L\'école, c\'est-à-dire… » 12")'), ['lécole', 'cestàdire', '12']);
check('bsSameWord: elision «l\'école» matches «école»', run('bsSameWord(bsWordKey("l\'école"), bsWordKey("école"))'), true);
check('bsSameWord: two letters do not match an elision', run('bsSameWord("de", "rede")'), false);

// Word occurrences: «je» is in sentences 0 and 1 (and on page 21), in reading order on the page
const cues = run('bsWordCues(sentences, 20, "je")');
check('occurrences of «je» on page 20', cues.map(c => c.i), [0, 1, 1]);
check('an occurrence keeps its word span', cues[1].w, { s: 0, e: 2, start: 0, end: 200 });
check('a word on another page is not in the list', run('bsWordCues(sentences, 21, "maroc")').length, 0);
check('a word that is not in the text', run('bsWordCues(sentences, 20, "Paris")').length, 0);
check('the same word only: «viens» is not «vient»', run('bsWordCues(sentences, 20, "viens").length'), 2);

// «est» on a page that also has «c'est» and «ouest»: only the word itself
const est = [{ page: 5, text: "C'est à l'ouest, il est là.", duration: 2, words: [
    { s: 0, e: 6, start: 0, end: 300 }, { s: 7, e: 8, start: 300, end: 400 }, { s: 9, e: 15, start: 400, end: 800 },
    { s: 17, e: 19, start: 800, end: 900 }, { s: 20, e: 23, start: 900, end: 1100 }, { s: 24, e: 26, start: 1100, end: 1400 }] }];
check('«est» is not «c\'est» nor «l\'ouest»', run('bsWordCues(est, 5, "est").map(c => c.w.start)', { est }), [900]);
check('an elision is used when the page has no exact match', run('bsWordCues(est, 5, "ouest").map(c => c.w.start)', { est }), [400]);

// Which occurrence a tap means: the neighbours on the printed page decide, not the order of earlier taps
const words20 = 'bsPageWords(sentences, 20)';
const dom = ['je', 'viens', 'du', 'maroc', 'je', 'suis', 'espagnol', 'et', 'je', 'viens', 'de', 'madrid'];
check('the third «je» of the page (after «et») is the third in the narration', run(`bsPickCue(${words20}, dom, 8, "je")`, { dom }), 8);
check('the second «je» (before «suis»)', run(`bsPickCue(${words20}, dom, 4, "je")`, { dom }), 4);
check('the second «viens» (before «de»)', run(`bsPickCue(${words20}, dom, 9, "viens")`, { dom }), 9);
check('a page with a heading the voice skips still finds «madrid»',
    run(`bsPickCue(${words20}, ["leçon", "un"].concat(dom), 13, "madrid")`, { dom }), 11);
check('a word the narration lacks gives -1', run(`bsPickCue(${words20}, dom, 0, "paris")`, { dom }), -1);

// Selections: the run of narration words they cover
const run20 = (sel, pos = -1) => run(`bsPhraseRun(${words20}, bsKeys(${JSON.stringify(sel)}), ${pos})`);
check('a whole sentence', run20('Je viens du Maroc.'), { from: 0, to: 3 });
check('part of a sentence plays exactly its words', run20('espagnol et je viens'), { from: 6, to: 9 });
check('a word cut by the selection edge still counts', run20('ens du Mar'), { from: 1, to: 3 });
check('two sentences', run20('du Maroc. Je suis espagnol'), { from: 2, to: 6 });
check('a repeated phrase: the one at the selection\'s place', run20('je viens', 0.7), { from: 8, to: 9 });
check('a text the narration does not read is not played', run20('Leçon un : les nationalités'), null);
check('empty selection', run20('  '), null);

if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nall book_speech checks passed');
