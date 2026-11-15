/* core-text.js — escapeHtml and sentence boundaries (sentenceCuts / sentenceSpans).
 * Split out of core.js on 2026-11-14 without changes. */
// escapeHtml перенесено сюди з мовно-нейтральної секції нижче в основному
// файлі (raw HTML-екранування для довіреного тексту в innerHTML) — суто
// утилітарна функція без залежностей, природне місце — поруч із safeHtml.
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// МЕЖІ РЕЧЕНЬ — одне правило для озвучення, тапу по реченню (текст і PDF), розбору й Практики.
// Раніше кінцем речення була будь-яка «. ! ?» перед пробілом, тож «Mr. Smith», «M. Dupont», «J. K. Rowling», «т. зв.»,
// «etc. and» і «"Go." she said» розривались на два речення. Тепер кінець — це знак (або їх ряд «?!», «...») разом із
// закривальними лапками/дужками (і французьким «. »»), після якого — пробіл або кінець тексту, і НЕ:
//  • наступне слово починається з малої літери («etc. and», «т. зв. ...», «"Oh!" she said») або з цифри після скорочення
//    номера («p. 12», «ст. 5»; а «He left. 1990 was…» — два речення);
//  • перед крапкою — одна літера (ініціал «J.», «M.», «м. Київ»);
//  • перед крапкою — звертання/титул, а далі велика літера («Mr. Smith», «Mme Bovary», «проф. Іваненко»).
// CJK-знаки «。！？» завершують речення й без пробілу. Мови без регістру (китайська, корейська, гінді) різати не заважає:
// там немає малих літер. Повертає множину індексів символів, ПІСЛЯ яких закінчується речення.
const SENTENCE_TITLES = new Set(['mr', 'mrs', 'ms', 'mx', 'dr', 'prof', 'st', 'rev', 'hon', 'gen', 'col', 'capt', 'lt', 'sgt', 'maj', 'messrs',
    'mme', 'mlle', 'mmes', 'mlles', 'mgr', 'ste', 'hr', 'hrn', 'frl', 'sra', 'srta', 'dña', 'dott', 'sig', 'pan', 'sr', 'sres', 'пан', 'пані', 'ім', 'св', 'акад',
    'проф', 'доц', 'тов', 'вул', 'пров', 'просп', 'ул', 'им', 'гр', 'г-н', 'г-жа']);
// Скорочення, після яких іде номер («p. 12», «ст. 5», «vol. 2»): лише після них цифра не починає нового речення.
const SENTENCE_NUM_ABBR = new Set(['p', 'pp', 'vol', 'no', 'nr', 'ch', 'chap', 'fig', 'art', 'sec', 'para', 's', 'ss', 'bd', 'n', 'nº', 'núm', 'pág', 'págs',
    'cap', 't', 'tome', 'éd', 'ст', 'стор', 'с', 'сс', 'т', 'тт', 'р', 'рр', 'гл', 'ч', 'розд', 'рис', 'табл', 'п', 'пп', 'вип', 'стр', 'см']);
// A unit written after a number that can end a sentence («народився 1814 р. Він…», «il est 10 h. Le train…»).
const SENTENCE_UNIT_AFTER_NUMBER = new Set(['р', 'рр', 'г', 'h']);
const SENTENCE_TERM = /[.!?…]/, SENTENCE_CJK_TERM = /[。！？]/, SENTENCE_CLOSER = /["'»”’)\]]/, SENTENCE_OPENER = /["'«“‘(\[—–-]/;
function sentenceCuts(str) {
    const cuts = new Set();
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (SENTENCE_CJK_TERM.test(ch) || ch === '।') {
            let j = i + 1;
            while (j < str.length && (SENTENCE_CJK_TERM.test(str[j]) || /[」』”"）)]/.test(str[j]))) j++;
            cuts.add(j - 1); i = j - 1; continue;
        }
        if (!SENTENCE_TERM.test(ch)) continue;
        const dot = i;
        let j = i + 1;
        while (j < str.length && SENTENCE_TERM.test(str[j])) j++;
        const single = j === dot + 1 && ch === '.';
        // закривальні лапки/дужки — частина речення, навіть після пробілу перед «»» у французькій
        for (;;) {
            if (j < str.length && SENTENCE_CLOSER.test(str[j])) { j++; continue; }
            let k = j; while (k < str.length && /[   ]/.test(str[k])) k++;
            if (k > j && k < str.length && /[»”)\]]/.test(str[k])) { j = k + 1; continue; }
            break;
        }
        i = j - 1;
        if (j < str.length && !/\s/.test(str[j])) continue;   // «3.5», «e.g.x», адреса — не кінець
        let n = j; while (n < str.length && (/\s/.test(str[n]) || SENTENCE_OPENER.test(str[n]))) n++;
        // Номер пункту списку «3. appliquer…» (1–3 цифри після пробілу/початку) завершує попередній пункт, як і раніше —
        // у PDF списки часто без розділових знаків, і без цього всі пункти злипались в одне «речення».
        let d = dot; while (d > 0 && /\d/.test(str[d - 1])) d--;
        const listNumber = single && dot - d >= 1 && dot - d <= 3 && (d === 0 || /\s/.test(str[d - 1]));
        // The number belongs to the item it opens: the cut goes BEFORE it (the previous item ends), not after it —
        // otherwise «1.» became a sentence of its own (linguistic review, 2026-11-15).
        // A list marker stands at the start, on a new line or after the end of the previous sentence («texte. 2. Répondez»);
        // a number after a word ends its own sentence as before («le chapitre 2. Puis…»).
        if (listNumber) {
            let k = d - 1; while (k >= 0 && /\s/.test(str[k])) k--;
            // …after a full stop only when it really ended a sentence («vol. 2. He left» — «vol.» did not).
            if (k < 0 || cuts.has(k) || /[!?:;…]/.test(str[k]) || str.slice(k + 1, d).includes('\n')) {
                if (k >= 0) cuts.add(k);
                continue;
            }
        }
        if (!listNumber && n < str.length && /\p{Ll}/u.test(str[n])) continue;   // далі мала літера — речення триває
        if (single && !listNumber) {
            let b = dot; while (b > 0 && /[\p{L}\p{M}º-]/u.test(str[b - 1])) b--;
            const token = str.slice(b, dot);
            if (n < str.length && /\p{N}/u.test(str[n]) && SENTENCE_NUM_ABBR.has(token.toLowerCase())) continue;
            const before = str.slice(0, b);
            const capitalNext = n < str.length && /\p{Lu}/u.test(str[n]);
            // Not initials, though a single letter before the dot: a lower-case dotted abbreviation (5 p.m. He…, a.m.,
            // i.e.), «і т. д.» / «т. п.», a unit after a number (1814 р., 10 h.) — before a capital they end the sentence.
            const endsAbbreviation = capitalNext && (
                (/^\p{Ll}$/u.test(token) && /(?:^|[\s(])\p{Ll}\.$/u.test(before))
                || (/^[дп]$/i.test(token) && /(?:^|\s)т\.\s?$/i.test(before))
                || (SENTENCE_UNIT_AFTER_NUMBER.has(token.toLowerCase()) && /\d\s?$/.test(before)));
            if (!endsAbbreviation && token.length === 1 && /\p{L}/u.test(token)) continue;   // ініціал
            if (n < str.length && SENTENCE_TITLES.has(token.toLowerCase()) && /\p{Lu}/u.test(str[n])) continue;
        }
        cuts.add(i);
    }
    return cuts;
}
// Речення рядка як пари [від, до) без пробілів по краях — за тими самими межами sentenceCuts.
function sentenceSpans(str) {
    const out = [], push = (a, b) => { while (a < b && /\s/.test(str[a])) a++; while (b > a && /\s/.test(str[b - 1])) b--; if (b > a) out.push([a, b]); };
    let a = 0;
    for (const c of [...sentenceCuts(str)].sort((x, y) => x - y)) { push(a, c + 1); a = c + 1; }
    push(a, str.length);
    return out;
}
