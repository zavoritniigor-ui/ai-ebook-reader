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
check('bsSameWord: elision «l\'école» matches «école»', run('bsSameWord(bsWordKey("l\'école"), bsWordKey("école"))'), true);
check('bsSameWord: two letters do not match an elision', run('bsSameWord("de", "rede")'), false);

// Sentence lookup
check('exact sentence on its page', run('bsSentenceIndex(sentences, 20, "Je viens du Maroc.")'), 0);
check('selection inside a sentence (≥12 letters) finds it', run('bsSentenceIndex(sentences, 20, "suis espagnol et je viens")'), 1);
check('same text on another page is not used', run('bsSentenceIndex(sentences, 21, "Je viens du Maroc.")'), -1);
check('a short fragment («Je») does not pick a sentence', run('bsSentenceIndex(sentences, 20, "Je")'), -1);
check('empty text picks nothing', run('bsSentenceIndex(sentences, 20, "   ")'), -1);

// Word occurrences: «je» is in sentences 0 and 1 (and on page 21), in reading order on the page
const cues = run('bsWordCues(sentences, 20, "je")');
check('occurrences of «je» on page 20', cues.map(c => c.i), [0, 1, 1]);
check('an occurrence keeps its word span', cues[1].w, { s: 0, e: 2, start: 0, end: 200 });
check('a word on another page is not in the list', run('bsWordCues(sentences, 21, "maroc")').length, 0);
check('a word that is not in the text', run('bsWordCues(sentences, 20, "Paris")').length, 0);
check('elided word is found', run('bsWordCues(sentences, 20, "viens").length'), 2);

if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nall book_speech checks passed');
