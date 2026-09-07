/* lang-detect.js — евристика визначення мови (EN/FR) для мішаного тексту.
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
// Слабкі орфографічні ознаки (закінчення/буквосполучення) — самі по собі НЕ
// достатні, щоб вважати слово "певним" (див. STRONG_MIN нижче), лише додатковий бал.
const FR_SHAPE_RE = /(eaux?$|eux$|oir$|oire$|aient$|ais$|ez$|ent$|ique$|té$|tion$|aison$|ance$|ence$|euse$|ette$|eur$|ère$|ien$|ienne$|ois$|elle$|ille|ouill|jour|oux$|ault$|gn[aeiou]|^qu[aeiou])/i;
const EN_SHAPE_RE = /(ing$|ed$|ly$|ness$|ship$|ough|augh|^wh|ck|^sh|oo|ee|y$)/i;
// Поріг "сильного" сигналу: службове слово / елізія / діакритика (4-5 балів) — а не
// орфографічна здогадка (1 бал). Тільки сильні токени можуть відкрити новий "острівець".
const STRONG_MIN = 4;

function scoreWord(w) {
    let fr = 0, en = 0;
    if (FR_ELISION_RE.test(w)) fr += 5;
    if (FR_DIACRITIC_RE.test(w)) fr += 5;
    const core = w.replace(FR_ELISION_RE, '');
    if (FR_WORDS.has(w) || (core !== w && FR_WORDS.has(core))) fr += 4;
    if (EN_WORDS.has(w)) en += 4;
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
// Базова мова речення: голосуємо не за окремими якорями, а за КЛАСТЕРАМИ сильних
// якорів (сусідні токени тієї самої мови, розрив ≤1, рахуються як один голос).
// Так короткий французький вкраплений вислів на 2-3 службових слова (напр. "tout
// le") не переважує єдине "the" перед ним лише тому, що в ньому більше слів —
// а речення, де французьких кластерів справді більше, коректно визначається як
// французьке навіть без жодного діакритичного знака.
function sentenceBaseLang(classified, priorLang2) {
    let frClusters = 0, enClusters = 0, curLang = null, gap = 0;
    for (const tok of classified) {
        if (!tok.isWord) continue;
        const lang = tok.tier === 'strong-fr' ? 'fr' : tok.tier === 'strong-en' ? 'en' : null;
        if (lang) {
            if (lang !== curLang || gap > 1) { if (lang === 'fr') frClusters++; else enClusters++; }
            curLang = lang; gap = 0;
        } else if (curLang) {
            gap++;
            if (gap > 1) curLang = null;
        }
    }
    if (!frClusters && !enClusters) {
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
    if (frClusters === enClusters) return priorLang2 === 'fr' ? 'fr' : 'en';
    return frClusters > enClusters ? 'fr' : 'en';
}
// Шукає в реченні "острівці" мови, ПРОТИЛЕЖНОЇ до базової: ядро — суцільний прогін
// сильних/слабких токенів іноземної мови (у будь-який бік від першого знайденого
// сильного якоря), плюс одне "пільгове" сусіднє нейтральне слово з боку, де ядро
// впирається саме в СИЛЬНИЙ якір (так "bonjour tout le monde" ловиться цілком:
// "tout"/"le" — сильні, "bonjour" тягнеться як слабкий, "monde" — пільгове сусіднє).
function findForeignRuns(classified, base) {
    const otherStrong = base === 'fr' ? 'strong-en' : 'strong-fr';
    const otherWeak = base === 'fr' ? 'weak-en' : 'weak-fr';
    const idx = [];
    classified.forEach((t, i) => { if (t.isWord) idx.push(i); });
    const runs = [];
    let k = 0;
    while (k < idx.length) {
        if (classified[idx[k]].tier !== otherStrong) { k++; continue; }
        let lo = k, hi = k;
        while (hi + 1 < idx.length) {
            const tier = classified[idx[hi + 1]].tier;
            if (tier === otherStrong || tier === otherWeak) hi++; else break;
        }
        while (lo - 1 >= 0) {
            const tier = classified[idx[lo - 1]].tier;
            if (tier === otherStrong || tier === otherWeak) lo--; else break;
        }
        // Пільгу (сусіднє нейтральне слово без жодного власного сигналу) даємо лише
        // багатослівному ядру — одне-єдине іноземне слово (напр. "château" саме
        // серед англійського тексту) не повинно тягнути за собою сусіда без причини.
        if (hi > lo && classified[idx[lo]].tier === otherStrong && lo - 1 >= 0 && classified[idx[lo - 1]].tier === 'neutral') lo--;
        if (hi > lo && classified[idx[hi]].tier === otherStrong && hi + 1 < idx.length && classified[idx[hi + 1]].tier === 'neutral') hi++;
        runs.push({ from: idx[lo], to: idx[hi] });
        k = hi + 1;
    }
    // Ядра, що впритул чи майже впритул одне до одного — об'єднуємо.
    const merged = [];
    for (const r of runs) {
        const last = merged[merged.length - 1];
        if (last && r.from <= last.to + 2) last.to = r.to; else merged.push(Object.assign({}, r));
    }
    const lang = base === 'fr' ? 'en' : 'fr';
    return merged.map(r => Object.assign({ lang }, r));
}
// Головна функція: ділить довільний текст на впорядковані мовні відрізки
// {lang:'fr'|'en', text}, зберігаючи оригінальні пробіли й пунктуацію. Використовується
// і для визначення мови (детект = найдовший за символами відрізок), і для TTS
// (кожен відрізок озвучується власним голосом).
function buildLanguageSegments(text, priorLang2) {
    const classified = classifyTokens(tokenizeForLang(text));
    if (!classified.some(t => t.isWord)) return [{ lang: priorLang2 === 'fr' ? 'fr' : 'en', text }];
    const base = sentenceBaseLang(classified, priorLang2);
    const runs = findForeignRuns(classified, base);
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
    // Захисне злиття сусідніх відрізків однієї мови (на межі це рідко, але дешево).
    const out = [];
    for (const s of segments) {
        const last = out[out.length - 1];
        if (last && last.lang === s.lang) last.text += s.text; else out.push(Object.assign({}, s));
    }
    return out;
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
}
function pageLang() { return state.sourceLang || 'en-US'; }
// Мова КОНКРЕТНОГО тапнутого слова чи виділеного фрагмента. Якщо він є всередині
// відомого речення-контексту (state.ctxSentence) — шукаємо його точну позицію там і
// беремо мову саме того відрізка (найточніше: "car" у "Il reste car il pleut" і
// "car" у "I love my car" отримають РІЗНУ мову, хоч слово те саме). Якщо контексту
// немає або фрагмент довший за нього — фрагмент говорить сам за себе.
function langForText(text) {
    const clean = text.trim();
    if (!clean) return pageLang();
    const ctx = state.ctxSentence;
    if (ctx && ctx.length >= clean.length) {
        const idx = ctx.toLowerCase().indexOf(clean.toLowerCase());
        if (idx !== -1) {
            const cyr = cyrillicLang(ctx);
            if (cyr) return cyr;
            const segs = buildLanguageSegments(ctx, pageLang().slice(0, 2));
            const from = idx, to = idx + clean.length;
            let pos = 0, best = null, bestOverlap = 0;
            for (const s of segs) {
                const segEnd = pos + s.text.length;
                const overlap = Math.min(segEnd, to) - Math.max(pos, from);
                if (overlap > bestOverlap) { bestOverlap = overlap; best = s.lang; }
                pos = segEnd;
            }
            if (best) return best === 'fr' ? 'fr-FR' : 'en-US';
        }
    }
    return detectLang(clean);
}
function voiceForLangCode(lang2) {
    const fullLang = lang2 === 'fr' ? 'fr-FR' : lang2 === 'uk' ? 'uk-UA' : lang2 === 'ru' ? 'ru-RU' : 'en-US';
    const uri = state.selectedVoiceURIByLang[lang2];
    // Запасний варіант — НАЙКРАЩИЙ голос мови, а не перший-ліпший зі списку:
    // першим у системі часто стоїть старий низькоякісний голос, через що англійська
    // звучала помітно гірше за французьку.
    return { lang: fullLang, voice: voices.find(v => v.voiceURI === uri) || pickBestVoice(lang2, voices) };
}
function voiceForText(text) {
    const lang = langForText(text);
    const key = lang.startsWith('fr') ? 'fr' : lang.startsWith('uk') ? 'uk' : lang.startsWith('ru') ? 'ru' : 'en';
    return { lang, voice: voiceForLangCode(key).voice };
}
