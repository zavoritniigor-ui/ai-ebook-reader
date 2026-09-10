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
    const parts = splitTopLevelParens(text);
    if (parts.length === 1 && !parts[0].paren) return buildFlatSegments(text, priorLang2);
    const out = [];
    let lastLang = null;
    for (const part of parts) {
        let segs;
        if (part.paren) {
            const innerPrior = lastLang ? (lastLang === 'fr' ? 'en' : 'fr') : priorLang2;
            segs = wrapParenSegments(buildLanguageSegments(part.inner, innerPrior), part.open, part.close, innerPrior);
        } else {
            if (!part.text) continue;
            // Звичайний текст (не в дужках) — це не переклад сусіда, а продовження
            // того самого речення, тому на нічиї він орієнтується на мову КНИГИ, а
            // не на "протилежну" (та підказка — лише для вмісту дужок).
            segs = buildFlatSegments(part.text, priorLang2);
        }
        for (const s of segs) out.push(s);
        // Порожній чи суто пунктуаційний фрагмент (сама дужка, розділювач) не несе
        // жодного слова — не даємо йому підмінити "останню реальну мову" для протилежної
        // підказки наступній дільниці.
        if (/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(part.paren ? part.inner : part.text)) {
            lastLang = segs[segs.length - 1].lang;
        }
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
    const segs = buildLanguageSegments(text, pageLang().slice(0, 2));
    let fr = 0, en = 0;
    for (const s of segs) { if (s.lang === 'fr') fr += s.text.trim().length; else en += s.text.trim().length; }
    if (!fr && !en) return pageLang();
    return fr > en ? 'fr-FR' : 'en-US';
}

// Мова книги. Визначається ОДИН РАЗ на сторінку/розділ і далі використовується як
// ПІДКАЗКА (не остаточна відповідь!) для перекладу й вибору голосу — конкретний
// фрагмент завжди має пріоритет над нею, якщо в ньому є власні надійні ознаки.
function updateSourceLang() {
    const sample = (els.pages.innerText || '').slice(0, 6000);
    state.sourceLang = sample.trim() ? detectLang(sample) : 'en-US';
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
function pageLang() { return state.sourceLang || 'en-US'; }
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
    const idx = context.toLowerCase().indexOf(clean.toLowerCase());
    if (idx === -1) return null;
    const cyr = cyrillicLang(context);
    if (cyr) return cyr;
    const segs = buildLanguageSegments(context, pageLang().slice(0, 2));
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
    if (found === 'fr' || found === 'en') return found === 'fr' ? 'fr-FR' : 'en-US';
    if (found) return found; // код кирилиці (uk-UA/ru-RU)
    return detectLang(clean);
}
function voiceForLangCode(lang2) {
    const fullLang = LANGUAGE_CONFIG[lang2]?.locale || LANGUAGE_CONFIG.en.locale;
    const uri = state.selectedVoiceURIByLang[lang2];
    // Запасний варіант — НАЙКРАЩИЙ голос мови, а не перший-ліпший зі списку:
    // першим у системі часто стоїть старий низькоякісний голос, через що англійська
    // звучала помітно гірше за французьку.
    return { lang: fullLang, voice: voices.find(v => v.voiceURI === uri) || pickBestVoice(lang2, voices) };
}
function voiceForText(text) {
    const lang = langForText(text);
    const detected = lang.slice(0, 2).toLowerCase();
    const key = LANGUAGE_CONFIG[detected] ? detected : 'en';
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
