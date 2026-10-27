/* lang-detect.js — евристика визначення мови для тексту читача.
 * Книга може бути двомовною, і навіть ОДНЕ речення може мішати англійську з
 * французькою — тому мова визначається не для сторінки чи речення в цілому,
 * а для кожного "острівця" тексту окремо (детальніше — у коментарі нижче).
 * Використовується і перекладом (напрям переклад-мова), і TTS (вибір голосу).
 *
 * Класичний <script src>, НЕ ES-модуль — див. пояснення в js/core.js. Залежить
 * лише від core.js (readStored тут не потрібен, а detectLang/langForText читають
 * лише свої власні регулярки/множини нижче) і не має власних DOM-звернень, крім
 * updateSourceLang(), яка читає/пише state.sourceLang.
 */

// ========== РОЗПІЗНАВАННЯ МОВИ (EN/FR, зі змішаними фрагментами) ==========
// Книга може бути двомовною, і навіть ОДНЕ речення може мішати англійську з
// французькою (пояснення англійською + приклад чи слово французькою). Тому мова
// визначається не для сторінки чи навіть речення в цілому, а для кожного "острівця"
// тексту окремо: спершу шукаємо НАДІЙНІ ознаки (діакритика, апострофи-елізії,
// службові слова) на рівні окремого слова, тоді збираємо сусідні слова однієї мови
// в один відрізок, і лише коли доказів немає взагалі — використовуємо мову книги
// як підказку (а не як остаточну відповідь).
//
// Апострофи-елізії — l'ami, d'accord, j'aime, qu'il, c'est, n'est, s'il, t'aime —
// безпомильна ознака французької, навіть якщо решта слова невідома.
const FR_ELISION_RE = /^(?:qu|jusqu|lorsqu|puisqu|quoiqu|l|d|j|c|n|s|t|m)['’ʼ]/i;
// Діакритика — в англійській її практично не буває, тому це теж сильний сигнал.
const FR_DIACRITIC_RE = /[àâäéèêëïîôöùûüçœæ]/i;
// Службові слова. Свідомо БЕЗ короткої "нічиєї" лексики (a, an, in, me, on, car,
// son) — вона існує в обох мовах, і визначати її мову ІЗОЛЬОВАНО означає вгадувати;
// такі слова нехай успадковують мову сусіднього відрізка (див. buildLanguageSegments).
const FR_WORDS = new Set(('le la les un une des du de et est sont était étaient dans pour avec sans sur sous qui que quoi ce cette ces cet au aux par plus très tu je vous nous ils elles il elle ne pas sa ses leur leurs mais donc si comme tout tous toute toutes bien aussi encore déjà chez vers entre où quand comment pourquoi alors toujours jamais peu beaucoup assez trop chaque quel quelle quels quelles celui celle ceux celles voici voilà afin lorsque puisque malgré parmi depuis pendant être avoir fait faire cela ça ici là oui non').split(' '));
const EN_WORDS = new Set(('the and is are was were of for with without off that this these those to at by from you we they he she it not his her their its but so as all very also still about into over than then i will would can could should must shall do does did have has had been being there here when where why how because although though while during each every which whose who whom what no yes hello').split(' '));
// Поза службовими словами — невелика, свідомо КОРОТКА добірка звичайної лексики,
// яка в навчальних (двомовних) текстах трапляється постійно і при цьому НІКОЛИ
// не є двозначною (на відміну від "restaurant"/"important"/"menu" — тих самих
// когнатів в обох мовах, які нижче розпізнаються через контекст, а не список).
// bonjour/merci/maison — базова лексика будь-якого підручника французької;
// means — англійське дієслово саме для пояснень-глос на кшталт "X means Y",
// які й є типовим способом дати переклад БЕЗ дужок.
const FR_COMMON_WORDS = new Set('bonjour bonsoir merci salut maison madame monsieur mademoiselle'.split(' '));
const EN_COMMON_WORDS = new Set('means'.split(' '));
// Слабкі орфографічні ознаки (закінчення/буквосполучення) — самі по собі НЕ
// достатні, щоб вважати слово "певним" (див. STRONG_MIN нижче), лише додатковий бал.
const FR_SHAPE_RE = /(eaux?$|eux$|oir$|oire$|aient$|ais$|ez$|ent$|ique$|té$|tion$|aison$|ance$|ence$|euse$|ette$|eur$|ère$|ien$|ienne$|ois$|elle$|ille|ouill|jour|oux$|ault$|gn[aeiou]|^qu[aeiou])/i;
const EN_SHAPE_RE = /(ing$|ed$|ly$|ness$|ship$|ough|augh|^wh|ck|^sh|oo|ee|y$)/i;
// Французькі вправи "поставте дієслово у потрібну форму" друкують інфінітив у дужках
// прямо в реченні: "Ils (plaindre) le vieux voisin." Це французька ПІДКАЗКА, а не англійська
// глоса, яку зазвичай містять дужки "слово (переклад)" — тож їй не можна давати підказку
// протилежної мови. САМА ФОРМА слова цього не розрізняє: père (father), eau (water),
// le dîner (dinner) закінчуються на -er/-re так само, як французькі інфінітиви. Тому
// підказка визнається лише за СТРУКТУРНИМИ ознаками:
//  * прямо перед "(" стоїть французький підмет-займенник — "Ils (plaindre)", "Est-ce que
//    vous (savoir)", "Il me (tendre)" (англійська глоса займенника — службове слово EN_WORDS,
//    тож вона сюди не потрапляє), або
//  * підказка зворотна — "(se lever)", "(s'appeler)": англійська глоса не починається з se/s' —, або
//  * закінчення дієслова, якого не має жодне англійське слово (-dre, -ttre, -uire, -ivre,
//    -oir, приголосна+-ir, або être/avoir/aller…) — для іменних підметів: "Le mur
//    (ceindre) le jardin."
// Іменний підмет із звичайним -er ("Les enfants (manger)") свідомо НЕ визнається: без
// словника його не відрізнити від "le professeur (teacher)", а глоса — безпечне
// значення за замовчуванням, яке зберігає двомовні тексти правильними.
const FR_CUE_SUBJECTS = new Set('je tu il elle on nous vous ils elles ce ça cela ceci qui que où dont'.split(' '));
const FR_CUE_CLITICS = new Set('me te se lui leur y en ne n m t s'.split(' '));
const FR_CUE_IRREGULAR = new Set('être avoir aller faire dire lire rire boire croire plaire taire'.split(' '));
const FR_CUE_INFINITIVE_RE = /^[a-zà-öø-ÿ]{2,}(?:er|ir|re|oir)$/u;
const FR_CUE_ONLY_ENDING_RE = /(?:dre|ttre|(?<!q)uire|ivre|oir|[^aeiou]ir)$/u;
const FR_CUE_NOT_INFINITIVES = new Set('stir emir elixir nadir choir memoir reservoir boudoir'.split(' '));
function isFrenchExerciseCue(inner, textBefore) {
    let t = String(inner || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!t || t.length > 40) return false;
    // "(ne pas être)", "(se plaindre)", "(s'asseoir)": the negation/reflexive is part of the cue.
    t = t.replace(/^(?:ne|n['’])\s*(?:pas|plus|jamais|rien|point)\s+/, '');
    const reflexive = /^(?:se\s+|s['’]\s*)/.test(t);
    if (reflexive) t = t.replace(/^(?:se\s+|s['’]\s*)/, '');
    if (t.length < 4 || !FR_CUE_INFINITIVE_RE.test(t)) return false;
    if (EN_WORDS.has(t) || EN_COMMON_WORDS.has(t) || FR_CUE_NOT_INFINITIVES.has(t)) return false;
    if (reflexive || FR_CUE_IRREGULAR.has(t) || FR_CUE_ONLY_ENDING_RE.test(t)) return true;
    // Any other infinitive shape (mostly -er) counts only directly after a French subject.
    const words = String(textBefore || '').match(/\p{L}+(?:['’-]\p{L}+)*/gu) || [];
    const core = w => w.toLowerCase().split(/['’-]/).pop();
    let i = words.length - 1;
    while (i >= 0 && FR_CUE_CLITICS.has(core(words[i]))) i--;
    return i >= 0 && FR_CUE_SUBJECTS.has(core(words[i]));
}
// Поріг "сильного" сигналу: службове слово / елізія / діакритика (4-5 балів) — а не
// орфографічна здогадка (1 бал). Тільки сильні токени можуть відкрити новий "острівець".
const STRONG_MIN = 4;
const GA_STRONG_WORDS = new Set('agus bhfuil raibh bheidh bhí tá seo sin anseo ansin freisin nuair conas dia duit maith liom linn agaibh acu orthu isteach amach anois riamh féidir gaeilge focal leabhar léamh scríobh'.split(' '));

// Han/Hangul/Devanagari are unambiguous at script level. Irish shares Latin
// script with EN/FR, so it is selected only from strong function/common words
// (or an Irish-only fada plus a strong word), never from a generic accent guess.
function specialLanguage(text) {
    const letters = (text.match(/\p{L}/gu) || []).length;
    if (!letters) return null;
    const scripts = [
        ['zh-CN', (text.match(/\p{Script=Han}/gu) || []).length],
        ['ko-KR', (text.match(/\p{Script=Hangul}/gu) || []).length],
        ['hi-IN', (text.match(/\p{Script=Devanagari}/gu) || []).length]
    ];
    const dominant = scripts.find(([, count]) => count && count * 2 >= letters);
    if (dominant) return dominant[0];
    const words = (text.toLocaleLowerCase().match(/[a-záéíóú]+/gu) || []);
    const gaHits = words.filter(word => GA_STRONG_WORDS.has(word)).length;
    if (!gaHits) return null;
    // Іспанська теж має «sin» і á/í/ó/ú: раніше одного «sin» з наголосом вистачало, щоб іспанський розділ став ірландським
    // (і читався англійським/французьким голосом). Тепер ірландська — лише коли її слова переважають службові слова інших
    // латинських мов і (у довшому тексті) становлять помітну частку слів.
    const otherHits = Math.max(...Object.values(latinStopwordScores(words)));
    if (gaHits <= otherHits || /[ñ¿¡]/.test(text)) return null;
    if (words.length > 8 && gaHits < words.length * 0.08) return null;
    if (gaHits >= 2 || (gaHits >= 1 && /[áíóú]/iu.test(text))) return 'ga-IE';
    return null;
}

function scoreWord(w) {
    let fr = 0, en = 0;
    if (FR_ELISION_RE.test(w)) fr += 5;
    if (FR_DIACRITIC_RE.test(w)) fr += 5;
    const core = w.replace(FR_ELISION_RE, '');
    const isFrWord = x => FR_WORDS.has(x) || FR_COMMON_WORDS.has(x);
    const isEnWord = x => EN_WORDS.has(x) || EN_COMMON_WORDS.has(x);
    if (isFrWord(w) || (core !== w && isFrWord(core))) fr += 4;
    if (isEnWord(w)) en += 4;
    // Дефісні конструкції (allez-vous, peut-être, est-ce, y-a-t-il) LANG_TOKEN_RE
    // лишає ОДНИМ токеном — жодна з частин ізольовано ніколи не звіряється зі
    // словником. Перевіряємо кожну частину окремо: так "vous" у "allez-vous"
    // впізнається як службове слово, навіть якщо ціле дефісне слово в жоден
    // список не входить.
    if (w.indexOf('-') !== -1) {
        const parts = w.split('-');
        if (parts.some(isFrWord)) fr = Math.max(fr, 4);
        if (parts.some(isEnWord)) en = Math.max(en, 4);
    }
    if (FR_SHAPE_RE.test(w)) fr += 1;
    if (EN_SHAPE_RE.test(w)) en += 1;
    return { fr, en };
}
// Токенізуємо на "слова" (літери, з апострофом чи дефісом усередині — l'ami,
// qu'il, well-known лишаються ОДНИМ токеном) і "розділювачі" (пробіли, пунктуація,
// цифри). Розділювачі зберігаються як є, тому конкатенація токенів дає вихідний
// текст без жодних змін — це і дозволяє потім озвучувати відрізки без спотворень.
const LANG_TOKEN_RE = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’ʼ-][A-Za-zÀ-ÖØ-öø-ÿ]+)*|[^A-Za-zÀ-ÖØ-öø-ÿ]+/g;
function tokenizeForLang(text) {
    const pieces = text.match(LANG_TOKEN_RE) || [];
    return pieces.map(p => ({ text: p, isWord: /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(p) }));
}
function classifyTokens(tokens) {
    return tokens.map(tok => {
        if (!tok.isWord) return Object.assign({ fr: 0, en: 0, tier: 'sep' }, tok);
        const { fr, en } = scoreWord(tok.text.toLowerCase());
        let tier = 'neutral';
        if (fr >= STRONG_MIN && fr > en) tier = 'strong-fr';
        else if (en >= STRONG_MIN && en > fr) tier = 'strong-en';
        else if (fr > en) tier = 'weak-fr';
        else if (en > fr) tier = 'weak-en';
        return Object.assign({ fr, en, tier }, tok);
    });
}
// Контекстне вікно: скільки поспіль НЕЙТРАЛЬНИХ (без жодного власного сигналу)
// токенів можна "перестрибнути" всередині одного мовного кластера, перш ніж
// вважати його завершеним — це і є контекст 1-3 сусідніх токенів для
// двозначних когнатів (restaurant, important, menu: самі по собі 0/0, але
// коли кластер ПІДТВЕРДЖУЄТЬСЯ токеном тієї самої мови по інший бік розриву,
// вони потрапляють у той самий відрізок). Токен ПРОТИЛЕЖНОЇ мови (навіть
// слабкий) — це реальний доказ проти, а не просто відсутність доказу, тому
// одразу завершує поточний кластер і починає новий, незалежно від розриву.
const MAX_CLUSTER_GAP = 2;
// Один прохід по словах реченняня збирає їх у кластери ОДНІЄЇ мови: сусідні
// токени тієї самої мови (сильні чи слабкі — обидва вважаються "доказом",
// слабкий лише не може ВІДКРИТИ кластер сам по собі, якщо це єдиний доказ у
// реченні, див. pickBaseLang) зливаються в один кластер. Кластер, що так і не
// отримав жодного СИЛЬНОГО токена (hasStrong=false), — це саме той випадок
// одного випадкового слабкого орфографічного збігу (напр. "information" зі
// своїм "-tion" в англійському реченні): він лишається кластером для повноти
// картини, але ніколи не переважує базову мову і ніколи не вирізається як
// "острівець" чужої мови (див. pickBaseLang/findForeignRuns).
function computeClusters(classified) {
    const idx = [];
    classified.forEach((t, i) => { if (t.isWord) idx.push(i); });
    const clusters = [];
    let cur = null;
    const closeCur = () => { if (cur) { clusters.push({ lang: cur.lang, from: cur.from, to: cur.to, hasStrong: cur.hasStrong }); cur = null; } };
    for (const i of idx) {
        const tier = classified[i].tier;
        const lang = tier === 'strong-fr' || tier === 'weak-fr' ? 'fr' : tier === 'strong-en' || tier === 'weak-en' ? 'en' : null;
        if (lang === null) {
            if (cur) { cur.gap++; if (cur.gap > MAX_CLUSTER_GAP) closeCur(); }
            continue;
        }
        if (cur && cur.lang === lang) {
            cur.to = i; cur.gap = 0;
            if (tier.startsWith('strong')) cur.hasStrong = true;
        } else {
            closeCur();
            cur = { lang, from: i, to: i, hasStrong: tier.startsWith('strong'), gap: 0 };
        }
    }
    closeCur();
    return clusters;
}
// Базова мова речення: голосуємо не за окремими якорями, а за КЛАСТЕРАМИ з
// принаймні одним СИЛЬНИМ токеном (кластери лише зі слабким орфографічним
// збігом у голосуванні участі не беруть — див. коментар вище). Так короткий
// французький вкраплений вислів на 2-3 службових слова не переважує єдине
// "the" перед ним лише тому, що в ньому більше слів, а речення, де французьких
// кластерів справді більше, коректно визначається як французьке. При РІВНОСТІ
// (типова "навчальна" структура — фраза однією мовою, за нею пояснення чи
// переклад іншою) перемагає мова ПЕРШОГО за текстом кластера: те, чим речення
// відкривається, — граматичний "хребет", а рівнозначний кластер після нього —
// швидше вставлена глоса/переклад, ніж продовження тієї самої думки.
function pickBaseLang(clusters, classified, priorLang2) {
    let frCount = 0, enCount = 0, firstLang = null;
    for (const c of clusters) {
        if (!c.hasStrong) continue;
        if (c.lang === 'fr') frCount++; else enCount++;
        if (!firstLang) firstLang = c.lang;
    }
    if (!frCount && !enCount) {
        // Жодного НАДІЙНОГО якоря в реченні — це трапляється з короткими репліками
        // на кшталт "Bonjour !", де саме слово впізнається лише слабко (без
        // діакритики й поза словником службових слів). Тоді порівнюємо навіть
        // слабкі орфографічні ознаки між собою — і тільки як зовсім останній
        // резерв, за їхньої повної відсутності, беремо мову книги.
        let wfr = 0, wen = 0;
        for (const tok of classified) {
            if (tok.tier === 'weak-fr') wfr += tok.fr;
            else if (tok.tier === 'weak-en') wen += tok.en;
        }
        if (wfr !== wen) return wfr > wen ? 'fr' : 'en';
        return priorLang2 === 'fr' ? 'fr' : 'en';
    }
    if (frCount === enCount) return firstLang;
    return frCount > enCount ? 'fr' : 'en';
}
// "Острівці" мови, ПРОТИЛЕЖНОЇ до базової: усі кластери іншої мови, що мають
// принаймні один сильний якір. Кластер без жодного сильного токена (лише
// випадковий слабкий орфографічний збіг) НІКОЛИ не вирізається — інакше кожне
// англійське слово з "-tion"/"-ance" в суто англійському реченні ставало б
// хибним французьким "острівцем".
function findForeignRuns(clusters, base) {
    const other = base === 'fr' ? 'en' : 'fr';
    return clusters.filter(c => c.lang === other && c.hasStrong).map(c => ({ lang: other, from: c.from, to: c.to }));
}
// Аналізує текст як ОДИН суцільний потік токенів (без урахування дужок) і ділить
// його на впорядковані мовні відрізки {lang:'fr'|'en', text}, зберігаючи оригінальні
// пробіли й пунктуацію. Це те, чим раніше була buildLanguageSegments цілком — тепер
// це внутрішній "плоский" крок, який buildLanguageSegments викликає для кожної
// дужкової дільниці окремо (див. нижче чому).
function buildFlatSegments(text, priorLang2) {
    const classified = classifyTokens(tokenizeForLang(text));
    if (!classified.some(t => t.isWord)) return [{ lang: priorLang2 === 'fr' ? 'fr' : 'en', text }];
    const clusters = computeClusters(classified);
    const base = pickBaseLang(clusters, classified, priorLang2);
    const runs = findForeignRuns(clusters, base);
    const segments = [];
    let curLang = base, buf = '', runPtr = 0;
    const flush = () => { if (buf) segments.push({ lang: curLang, text: buf }); buf = ''; };
    for (let i = 0; i < classified.length; i++) {
        const tok = classified[i];
        if (tok.isWord && runPtr < runs.length && i === runs[runPtr].from) { flush(); curLang = runs[runPtr].lang; }
        buf += tok.text;
        if (tok.isWord && runPtr < runs.length && i === runs[runPtr].to) { flush(); curLang = base; runPtr++; }
    }
    flush();
    return mergeAdjacentSameLang(segments);
}
// Захисне злиття сусідніх відрізків однієї мови (на межі це рідко, але дешево) —
// використовується і всередині одного "плоского" аналізу, і після складання
// дужкових дільниць докупи.
function mergeAdjacentSameLang(segments) {
    const out = [];
    for (const s of segments) {
        const last = out[out.length - 1];
        if (last && last.lang === s.lang) last.text += s.text; else out.push(Object.assign({}, s));
    }
    return out;
}
// Ділить текст на дільниці верхнього рівня: звичайний текст і дужкові групи
// "(...)" (з урахуванням вкладеності — вкладені дужки лишаються ВСЕРЕДИНІ inner
// і розбираються рекурсією, а не тут). Дужка сама по собі ніколи не входить у
// слово (LANG_TOKEN_RE), тому сканувати сирий текст посимвольно безпечно.
function splitTopLevelParens(text) {
    const parts = [];
    let i = 0, start = 0;
    while (i < text.length) {
        if (text[i] !== '(') { i++; continue; }
        if (i > start) parts.push({ paren: false, text: text.slice(start, i) });
        let depth = 1, j = i + 1;
        while (j < text.length && depth > 0) {
            if (text[j] === '(') depth++;
            else if (text[j] === ')') depth--;
            j++;
        }
        const closed = depth === 0;
        parts.push({ paren: true, open: '(', close: closed ? ')' : '', inner: text.slice(i + 1, closed ? j - 1 : j) });
        i = start = j;
    }
    if (start < text.length) parts.push({ paren: false, text: text.slice(start) });
    return parts;
}
// Приклеює дужки назад до першого/останнього відрізка вмісту — так, щоб
// конкатенація відрізків завжди давала точно вихідний текст.
function wrapParenSegments(segs, open, close, fallbackLang) {
    if (!segs.length) return [{ lang: fallbackLang === 'fr' ? 'fr' : 'en', text: open + close }];
    const wrapped = segs.map(s => Object.assign({}, s));
    wrapped[0].text = open + wrapped[0].text;
    wrapped[wrapped.length - 1].text += close;
    return wrapped;
}
// Інші мови латиницею (німецька, іспанська, італійська, португальська, нідерландська, польська). Решта евристики вміє
// лише «французька чи англійська», тож німецька книга читалась французьким або англійським голосом. Тут — визначення
// за найчастішими службовими словами (у будь-якому тексті вони становлять чверть-третину слів) і характерними літерами.
// Спрацьовує лише за явної переваги: короткий фрагмент без ознак (одне слово) успадковує мову книги.
const LATIN_LANG_LOCALES = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', nl: 'nl-NL', pl: 'pl-PL' };
const OTHER_LATIN_LANGS = ['de', 'es', 'it', 'pt', 'nl', 'pl'];
const LATIN_STOPWORDS = Object.fromEntries(Object.entries({
    en: 'the and of to a in is it that was he for on are as with his they at be this have from or one had by but not what all were we when your can said there an which she do their if will up other about out many then them these so some her would make like him into has two more no way could my than been who its now people did',
    fr: 'le la les de des du et est un une en dans que qui pour pas sur au aux avec il elle ils elles nous vous je ne se ce son sa ses mais ou par plus été était sont cette tout comme on leur lui fait bien aussi même très',
    de: 'der die das und ist nicht ein eine einen einem einer zu den von mit sich des auf für im dem es ich sie er wir ihr auch als an war wird werden bei noch nach wie aus aber hat oder wenn nur doch so schon mir mich ihn uns dass sind zum zur über vor dann kann',
    es: 'el la los las de del y que en un una es por con no para se lo le su sus al más pero como este esta está son fue ha muy sin sobre también hay ya yo todo cuando entre porque qué él ella hasta desde nos a me mi te había era eso esto así otro otra pues donde mismo después',
    it: 'il lo la gli le di del della dei delle e che è un una per non in con si da al alla ma come più sono anche ci questo questa ha ho mi ti del nel nella io lui lei loro tutto quando perché già a ne se tutti tutta era erano dopo poi così ancora sempre ogni quello quella quel suo sua cosa qui gli',
    pt: 'o a os as de do da dos das e que em um uma é não para com por se no na nos mais mas como ao foi ele ela seu sua são está também já eu muito isso quando sem pelo pela você então',
    nl: 'de het een en van in is dat op te zijn met voor niet aan er die maar om ook als bij of uit wat hij zij ze wij we ik je naar dan nog wel kan door over dit deze heeft hebben werd geen',
    pl: 'i w nie na się z że do to jest jak o a co po ale tak za od przez jego jej ich go już tylko być był była było są mnie mi ty ja on ona może dla czy też pan'
}).map(([lang, list]) => [lang, new Set(list.split(' '))]));
// Лише літери, яких нема ні в англійській, ні у французькій (è/à є і в італійській, і у французькій — не ознака).
const LATIN_LETTER_HINTS = { de: /[äöüß]/, es: /[ñ¿¡]/, pt: /[ãõ]/, pl: /[ąćęłńśźż]/ };
function latinStopwordScores(words) {
    const scores = {};
    for (const lang of Object.keys(LATIN_STOPWORDS)) {
        const set = LATIN_STOPWORDS[lang];
        scores[lang] = words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
    }
    return scores;
}
function latinLanguageScores(text) {
    const words = String(text || '').toLocaleLowerCase().match(/[\p{L}']+/gu) || [];
    const scores = latinStopwordScores(words);
    const lower = String(text).toLocaleLowerCase();
    for (const [lang, re] of Object.entries(LATIN_LETTER_HINTS)) if (scores[lang] >= 1 && re.test(lower)) scores[lang] += 1;
    return { words, scores };
}
function identifyLatinLanguage(text) {
    const { words, scores } = latinLanguageScores(text);
    if (words.length < 5) return null;
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [best, top] = ranked[0], second = ranked[1][1];
    // Явна перевага: щонайменше 2 службові слова, не менше ~12% слів, і на третину більше за другу мову.
    if (top < 2 || top < words.length * 0.12 || top < second * 1.34) return null;
    return best;
}
// Речення в книзі відомою мовою (не en/fr): інша мова — лише коли вона ЯВНО переважає мову книги. Коротке італійське речення
// «A poco a poco tutti se ne andarono» має спільні службові слова з португальською/іспанською і раніше читалось чужим голосом.
function sentenceBeatsBookLang(text, guess, bookLang2) {
    if (!guess || guess === bookLang2) return false;
    const { scores } = latinLanguageScores(text);
    return scores[guess] >= 3 && scores[guess] >= (scores[bookLang2] || 0) * 2;
}
// Книга іншою латинською мовою (не en/fr): вся текстова евристика en/fr для неї не підходить.
function isOtherLatinLang(lang2) { return OTHER_LATIN_LANGS.includes(lang2); }

// Головна функція: ділить довільний текст на впорядковані мовні відрізки. Текст у
// дужках у навчальних книгах зазвичай є ПЕРЕКЛАДОМ сусіднього слова/фрази —
// "bonjour (hello)", "hello (bonjour)" — а не продовженням тієї самої мови. Плоский
// аналіз цього не бачить: один сильний якір деінде в реченні визначає ЄДИНУ базову
// мову для всього рядка, і коротке слово в дужках без власного сильного сигналу
// (як "bonjour" чи "house") просто успадковує її. Тому кожна дужкова дільниця
// аналізується ОКРЕМО, і якщо в ній самій немає жодного надійного сигналу (нічия
// між fr/en) — вважаємо її перекладом сусіда: підказка мови для такого випадку —
// мова, ПРОТИЛЕЖНА щойно визначеній мові попередньої дільниці, а не мова книги.
function buildLanguageSegments(text, priorLang2) {
    const special = specialLanguage(text);
    if (special) return [{ lang: special.slice(0, 2), text }];
    // Німецька/іспанська/… — увесь текст однією мовою; у книзі такою мовою текст без явних ознак англійської чи французької
    // (коротке речення, одне слово) теж читається мовою книги, а не вгадується між en і fr.
    const latin = identifyLatinLanguage(text);
    // Книга німецькою/іспанською/…: речення лишається мовою книги, якщо інша мова його явно не переважає (англійський
    // службовий текст Gutenberg переважає — і читається англійською).
    if (isOtherLatinLang(priorLang2) && !sentenceBeatsBookLang(text, latin, priorLang2)) return [{ lang: priorLang2, text }];
    // Англійська/французька книга: речення іншою мовою — лише коли та мова явно переважає (у французькій теж є «a», «se», «ne»).
    if (latin && isOtherLatinLang(latin) && (!LATIN_STOPWORDS[priorLang2] || sentenceBeatsBookLang(text, latin, priorLang2))) return [{ lang: latin, text }];
    const parts = splitTopLevelParens(text);
    if (parts.length === 1 && !parts[0].paren) return buildFlatSegments(text, priorLang2);
    const out = [];
    let lastLang = null;
    let before = '';
    for (const part of parts) {
        let segs;
        if (part.paren) {
            if (isFrenchExerciseCue(part.inner, before)) {
                // Вправа: французький інфінітив-підказка, а не переклад сусіда.
                segs = wrapParenSegments([{ lang: 'fr', text: part.inner }], part.open, part.close, 'fr');
            } else {
                const innerPrior = lastLang ? (lastLang === 'fr' ? 'en' : 'fr') : priorLang2;
                segs = wrapParenSegments(buildLanguageSegments(part.inner, innerPrior), part.open, part.close, innerPrior);
            }
        } else {
            if (!part.text) continue;
            // Звичайний текст (не в дужках) — це не переклад сусіда, а продовження
            // того самого речення, тому на нічиї він орієнтується на мову КНИГИ, а
            // не на "протилежну" (та підказка — лише для вмісту дужок).
            segs = buildFlatSegments(part.text, priorLang2);
        }
        for (const s of segs) out.push(s);
        before += part.paren ? part.open + part.inner + part.close : part.text;
        // Порожній чи суто пунктуаційний фрагмент (сама дужка, розділювач) не несе
        // жодного слова — не даємо йому підмінити "останню реальну мову" для протилежної
        // підказки наступній дільниці.
        if (/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(part.paren ? part.inner : part.text)) lastLang = segs[segs.length - 1].lang;
    }
    return mergeAdjacentSameLang(out);
}

// Кирилицю (українська/російська) відсіюємо ще до аналізу FR/EN — інша писемність,
// плутати нема з чим. і/ї/є/ґ трапляються лише в українській.
function cyrillicLang(text) {
    const cyr = (text.match(/[а-яёіїєґ]/gi) || []).length;
    const lat = (text.match(/[a-zà-öø-ÿ]/gi) || []).length;
    if (cyr < 2 || cyr <= lat) return null;
    return /[іїєґ]/i.test(text) ? 'uk-UA' : 'ru-RU';
}
function detectLang(text) {
    const special = specialLanguage(text);
    if (special) return special;
    const cyr = cyrillicLang(text);
    if (cyr) return cyr;
    const prior = (state.ctxPanelLang && LATIN_LANG_LOCALES[state.ctxPanelLang]) ? state.ctxPanelLang : pageLang().slice(0, 2);
    const segs = buildLanguageSegments(text, prior);
    const tally = {};
    for (const s of segs) { const lang = LATIN_LANG_LOCALES[s.lang] ? s.lang : 'en'; tally[lang] = (tally[lang] || 0) + s.text.trim().length; }
    const ranked = Object.entries(tally).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return (state.ctxPanelLang && LATIN_LANG_LOCALES[state.ctxPanelLang]) || pageLang();
    // Нічия en/fr лишається як раніше — на користь англійської.
    if (ranked.length > 1 && ranked[0][1] === ranked[1][1] && ranked.some(([l]) => l === 'en')) return 'en-US';
    return LATIN_LANG_LOCALES[ranked[0][0]];
}

// Мова книги. Визначається ОДИН РАЗ на сторінку/розділ і далі використовується як
// ПІДКАЗКА (не остаточна відповідь!) для перекладу й вибору голосу — конкретний
// фрагмент завжди має пріоритет над нею, якщо в ньому є власні надійні ознаки.
// Мова книги, задана явно: вибір користувача в меню (на книгу) або метадані файлу (dc:language в EPUB, lang у HTML/FB2 —
// у книжках бібліотеки вони завжди є). '' — визначати автоматично.
const BOOK_LANG_CHOICES = ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'pl'];
function normalizeBookLang(value) {
    const code = String(value || '').trim().toLowerCase().slice(0, 2);
    return BOOK_LANG_CHOICES.includes(code) ? code : '';
}
function explicitBookLang() { return state.bookLangManual || state.bookLangMeta || ''; }
const BOOK_LANG_STORE = 'reader_book_lang:';
const BOOK_LANG_NAMES = { en: '🇬🇧 English', fr: '🇫🇷 Français', es: '🇪🇸 Español', de: '🇩🇪 Deutsch', it: '🇮🇹 Italiano', pt: '🇵🇹 Português', nl: '🇳🇱 Nederlands', pl: '🇵🇱 Polski' };
Object.assign(I18N, {
    bookLangLabel: { uk: '📖 Мова книги', en: '📖 Book language', fr: '📖 Langue du livre', ru: '📖 Язык книги', zh: '📖 书籍语言', ko: '📖 책 언어', hi: '📖 पुस्तक की भाषा', ga: '📖 Teanga an leabhair' },
    bookLangAuto: { uk: 'Автоматично', en: 'Automatic', fr: 'Automatique', ru: 'Автоматически', zh: '自动', ko: '자동', hi: 'स्वचालित', ga: 'Uathoibríoch' },
});
// Поле «Мова книги» у бічній панелі (змісті): «Автоматично (мова з файлу)» або явна мова; вибір пам'ятається для кожної книги.
function syncBookLangSelect() {
    const sel = document.getElementById('book-lang-select');
    if (!sel) return;
    sel.disabled = !state.bookKey;
    sel.value = state.bookLangManual || '';
    sel.options[0].textContent = t('bookLangAuto') + (state.bookLangMeta ? ` (${BOOK_LANG_NAMES[state.bookLangMeta]})` : '');
}
document.getElementById('book-lang-select')?.addEventListener('change', (e) => {
    if (!state.bookKey) return;
    state.bookLangManual = normalizeBookLang(e.target.value);
    try { if (state.bookLangManual) writeStored(BOOK_LANG_STORE + state.bookKey, state.bookLangManual); else localStorage.removeItem(BOOK_LANG_STORE + state.bookKey); } catch (err) {}
    if (typeof isSpeakingGlobal !== 'undefined' && isSpeakingGlobal) stopGlobalTTS();
    if (state.format && state.format !== 'pdf') updateSourceLang(); else state.sourceLang = null;
    state.translationCache = {};
    syncBookLangSelect();
});
// Зразок розділу для визначення мови — не лише його початок: у книжках бібліотеки розділ часто починається англійським
// службовим текстом Gutenberg, і перші 6000 символів робили іспанський розділ «англійським». Беремо кілька вікон по всьому тексту.
function chapterLangSample(text) {
    if (text.length <= 6000) return text;
    const win = 1500, parts = [];
    for (const f of [0.08, 0.3, 0.5, 0.7, 0.92]) { const at = Math.floor((text.length - win) * f); parts.push(text.slice(at, at + win)); }
    return parts.join('\n');
}
function updateSourceLang() {
    const text = els.pages.innerText || '';
    const book = explicitBookLang();
    state.sourceLang = book ? LATIN_LANG_LOCALES[book] : (text.trim() ? detectLang(chapterLangSample(text)) : 'en-US');
    syncBookLangSelect();
    // Атрибут lang потрібен для автоматичних переносів: браузер переносить слова
    // за правилами конкретної мови й без нього не переносить узагалі.
    els.pages.lang = state.sourceLang.slice(0, 2);
    // Заздалегідь "розігріваємо" локальний перекладач Chrome (js/translation.js,
    // завантажується пізніше — forward-виклик безпечний, бо викликається лише
    // зсередини цієї функції, а не одразу під час завантаження скрипта, той самий
    // механізм, що й у pdf-render.js для pdfAnchor). Саме тут, а не лише коли AI
    // недоступний: якщо чекати першої СПРАВЖНЬОЇ потреби в офлайн-перекладі,
    // користувач уже сидітиме без інтернету, і мовний пакет завантажити ніде.
    warmLocalTranslator(state.sourceLang, state.targetLang);
}
function pageLang() { return state.sourceLang || (explicitBookLang() && LATIN_LANG_LOCALES[explicitBookLang()]) || 'en-US'; }
// Мова КОНКРЕТНОГО фрагмента в межах ЯВНО переданого контексту (речення чи ширше):
// шукаємо точну позицію фрагмента в контексті й беремо мову САМЕ ТОГО відрізка за
// найбільшим перекриттям (найточніше: "car" у "Il reste car il pleut" і "car" у "I
// love my car" отримають РІЗНУ мову, хоч слово те саме). Це і є те, чого не дає
// detectLang(context) — детект мови ВСЬОГО контексту "за більшістю символів": для
// двомовного речення з перекладом у дужках ("The house is big (La maison est
// grande)."), де переклад довший за оригінал, detectLang(context) поверне мову
// ПЕРЕКЛАДУ, хоча користувача цікавить мова САМЕ виділеного фрагмента. Повертає
// 'fr'/'en'/код кирилиці, або null — якщо фрагмент не знайдено чи контексту нема
// (виклик має тоді сам вирішити запасний варіант, напр. detectLang(fragment)).
function fragmentLangInContext(fragment, context) {
    const clean = (fragment || '').trim();
    if (!clean || !context || context.length < clean.length) return null;
    const special = specialLanguage(clean);
    if (special) return special;
    if (/[а-яёіїєґ]/i.test(clean)) return cyrillicLang(clean) || cyrillicLang(context) || (/[іїєґ]/i.test(clean + ' ' + context) ? 'uk-UA' : 'ru-RU');
    const idx = context.toLowerCase().indexOf(clean.toLowerCase());
    if (idx === -1) return null;
    const prior = (state.ctxPanelLang && LATIN_LANG_LOCALES[state.ctxPanelLang]) ? state.ctxPanelLang : pageLang().slice(0, 2);
    const segs = buildLanguageSegments(context, prior);
    const from = idx, to = idx + clean.length;
    let pos = 0, best = null, bestOverlap = 0;
    for (const s of segs) {
        const segEnd = pos + s.text.length;
        const overlap = Math.min(segEnd, to) - Math.max(pos, from);
        if (overlap > bestOverlap) { bestOverlap = overlap; best = s.lang; }
        pos = segEnd;
    }
    return best;
}
// Мова КОНКРЕТНОГО тапнутого слова чи виділеного фрагмента, у контексті речення,
// в якому воно стоїть (state.ctxSentence) — тонкий виклик fragmentLangInContext
// вище. Якщо контексту немає, фрагмент довший за нього, чи позицію не знайдено —
// фрагмент говорить сам за себе (detectLang).
function langForText(text) {
    const clean = text.trim();
    if (!clean) return pageLang();
    const found = fragmentLangInContext(clean, state.ctxSentence);
    if (found && LATIN_LANG_LOCALES[found]) return LATIN_LANG_LOCALES[found];
    if (found) return found; // код кирилиці (uk-UA/ru-RU) чи zh/ko/hi/ga
    return detectLang(clean);
}
function voiceForLangCode(lang2) {
    // Мова без власного налаштування (італійська, польська…) — голос просто за її кодом, а не англійський.
    const fullLang = LANGUAGE_CONFIG[lang2]?.locale || LATIN_LANG_LOCALES[lang2] || LANGUAGE_CONFIG.en.locale;
    const uri = state.selectedVoiceURIByLang[lang2];
    // Запасний варіант — НАЙКРАЩИЙ голос мови, а не перший-ліпший зі списку:
    // першим у системі часто стоїть старий низькоякісний голос, через що англійська
    // звучала помітно гірше за французьку.
    return { lang: fullLang, voice: voices.find(v => v.voiceURI === uri) || pickBestVoice(lang2, voices) };
}
function voiceForText(text) {
    const lang = langForText(text);
    const detected = lang.slice(0, 2).toLowerCase();
    const key = LANGUAGE_CONFIG[detected] || LATIN_LANG_LOCALES[detected] ? detected : 'en';
    return { lang, voice: voiceForLangCode(key).voice };
}

// ТІЛЬКИ ДЛЯ ТЕСТІВ: детальна діагностика мовної евристики — token-level
// EN/FR бали й обраний тип (tier), знайдені кластери, підсумкові сегменти з
// межами (символьні офсети у вихідному тексті) та TTS locale, обраний для
// кожного сегмента. У жодному UI-шляху не використовується — існує лише щоб
// тестам було що звіряти окрім самого фінального результату.
function debugLanguageSegments(text, priorLang2) {
    const tokens = classifyTokens(tokenizeForLang(text)).map(t =>
        t.isWord ? { token: t.text, en: t.en, fr: t.fr, tier: t.tier } : { token: t.text, isSeparator: true });
    const segments = buildLanguageSegments(text, priorLang2);
    let pos = 0;
    const segmentInfo = segments.map(s => {
        const from = pos, to = pos + s.text.length;
        pos = to;
        return { lang: s.lang, text: s.text, from, to, ttsLocale: voiceForLangCode(s.lang).lang };
    });
    return { tokens, segments: segmentInfo };
}

// Перший виклик loadVoices() (js/core.js) — тут, у кінці lang-detect.js: усередині він доходить до pageLang(), визначеної
// вище в цьому файлі (у core.js її ще немає). Раніше це був вбудований <script> в index.html — CSP тепер такі забороняє.
if (ttsSynth) { ttsSynth.onvoiceschanged = loadVoices; loadVoices(); }
