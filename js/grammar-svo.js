/* grammar-svo.js — панелі "Граматика"/"Запитай AI": вкладки, startAiTask (запит до
 * AI й вивід у панель; forward-called з index.html та js/translation.js, тому
 * перенесено сюди разом із самою функцією), побудова промптів (buildGrammarPrompt,
 * buildConjugationPrompt, buildAskPrompt, buildLanguageLevelPrompt), кнопки
 * "Мовний розбір"/"Пояснення", список і відмінювання дієслів (collectVerbsFromAnalysis/
 * renderVerbBar/highlightActiveVerb/showVerb/selectVerb), і розбір речення на члени
 * (SVO: flattenRange/rangeForSlice/localSVO/buildSvoPrompt/analyzeSVO/applySVOParts)
 * через CSS Custom Highlight API.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується одразу
 * після js/translation.js (яка forward-викликає startAiTask лише зсередини onclick-
 * колбеків — та сама безпечна схема, що вже описана в js/pdf-render.js для
 * pdfAnchor). callAI/aiAvailable (js/ai-client.js, завантажується ПІЗНІШЕ за цей
 * файл) викликаються лише всередині async-функцій (startAiTask/showVerb), тобто
 * відкладено — файл завантажується раніше, ніж використовується.
 */

// AI ПАНЕЛІ (ЯЗИЧКИ)
els.grammarTab.onclick = () => { els.grammarPanel.classList.toggle('expanded'); els.askPanel.classList.remove('expanded'); els.grammarPanel.classList.remove('loading', 'ready'); };
els.askTab.onclick = () => { els.askPanel.classList.toggle('expanded'); els.grammarPanel.classList.remove('expanded'); els.askPanel.classList.remove('loading', 'ready'); };

async function startAiTask(contextText, mode, userPrompt = "") {
    if (!aiAvailable()) return alert(t('needKey'));
    // Ручне виділення (на відміну від тапу по слову чи кнопки "розгорнути до
    // абзацу") нічим не обмежене на вході — без цього протягнутих кілька сторінок
    // пішло б у промпт цілком.
    contextText = (contextText || '').slice(0, AI_PROMPT_TEXT_MAX);
    const task = beginAsyncTask(mode === 'grammar' ? 'grammar' : 'ask');
    if (mode === 'grammar') cancelAsyncTasks(['conjugation']);
    else cancelAsyncTasks(['panelTranslate']);
    const panel = mode === 'grammar' ? els.grammarPanel : els.askPanel; 
    const content = mode === 'grammar' ? els.grammarContent : els.askContent;
    
    panel.classList.remove('expanded'); // Залишаємо панель згорнутою!
    if (mode === 'ask' || mode === 'level') state.lastAskContext = contextText;

    if (mode === 'grammar') { state.activeVerb = null; state.verbs = []; document.getElementById('verb-bar').innerHTML = ''; }
    panel.classList.remove('ready'); panel.classList.add('loading'); // Вмикаємо червоний неон
    content.innerHTML = `<div style="text-align:center;margin-top:50px;"><div class="spinner-large"></div><p style="margin-top:20px;color:gray;">${t('generating')}<br><b style="color:var(--text-color);">${escapeHtml(contextText.length>40?contextText.substring(0,40)+'...':contextText)}</b></p></div>`;

    const langName = LANG_NAMES[state.targetLang] || 'українською';
    const prompt = mode === 'grammar' 
        ? buildGrammarPrompt(contextText, state.lastGrammarSentence)
        : mode === 'level'
            ? buildLanguageLevelPrompt(contextText, state.lastGrammarSentence, langName)
            : buildAskPrompt(contextText, state.lastGrammarSentence, userPrompt, langName);

    try {
        const text = await callAI(prompt, task.signal);
        if (!task.current()) return;
        panel.classList.remove('loading'); panel.classList.add('ready'); // Вмикаємо зелений неон!
        // Без обгортки <p>: відповідь тепер містить таблицю відмінювання й списки,
        // а таблиця всередині <p> — невалідний HTML, браузер розриває розмітку.
        content.innerHTML = safeHtml(text, true);
        // Одразу будуємо ряд дієслів унизу панелі з отриманого розбору.
        if (mode === 'grammar') renderVerbBar();
    } catch (err) {
        if (!task.current()) {
            if (!asyncTasks.has(mode === 'grammar' ? 'grammar' : 'ask')) {
                panel.classList.remove('loading');
                content.innerHTML = `<span class="tt-note">Запит скасовано</span>`;
            }
            return;
        }
        panel.classList.remove('loading');
        let msg = err.message;
        // "Failed to fetch" — збій на рівні браузера: запит навіть не пішов до сервера.
        if (err instanceof TypeError && /fetch/i.test(err.message)) msg = t('errNoConnection');
        content.innerHTML = `<span style="color:red">${escapeHtml(msg)}</span>`;
    }
}


// ========== РОЗБІР РЕЧЕННЯ: ПІДМЕТ / ПРИСУДОК / ДОДАТОК ==========
// Підсвічуємо частини прямо в тексті через CSS Custom Highlight API: він малює
// поверх наявного тексту й не змінює DOM, що тут критично — у реченні вже є сірі
// span'и відкритих слів, і будь-яке перезагортання їх поламало б.
// Межі частин визначає модель, бо французький синтаксис (складені часи, зворотні
// дієслова, займенники перед дієсловом) надійно не розбирається простими правилами.

// Плоский текст діапазону + карта відповідності позицій текстовим вузлам.
function flattenRange(range) {
    const root = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(n) { return n.nodeValue && range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    let text = '', segs = [], n;
    while (n = walker.nextNode()) {
        const from = (n === range.startContainer) ? range.startOffset : 0;
        const to = (n === range.endContainer) ? range.endOffset : n.nodeValue.length;
        if (to <= from) continue;
        segs.push({ node: n, nodeStart: from, textStart: text.length, len: to - from });
        text += n.nodeValue.slice(from, to);
    }
    return { text, segs };
}
// Range для підрядка плоского тексту (може перетинати кілька вузлів).
function rangeForSlice(flat, start, end) {
    let sN = null, sO = 0, eN = null, eO = 0;
    for (const s of flat.segs) {
        const segEnd = s.textStart + s.len;
        if (sN === null && start >= s.textStart && start < segEnd) { sN = s.node; sO = s.nodeStart + (start - s.textStart); }
        if (end > s.textStart && end <= segEnd) { eN = s.node; eO = s.nodeStart + (end - s.textStart); }
    }
    if (!sN || !eN) return null;
    const r = document.createRange();
    r.setStart(sN, sO); r.setEnd(eN, eO);
    return r;
}
function clearSvoHighlights() {
    if (typeof CSS !== 'undefined' && CSS.highlights) {
        ['svo-subject', 'svo-verb', 'svo-object', 'svo-coi'].forEach(n => CSS.highlights.delete(n));
    }
}

// Місцевий (без мережі) розбір: приблизний, за формою слів. Підмет — усе до
// першого особового дієслова, присудок — сама дієслівна група, решта — додаток.
// Для французької спираємось на ЯВНІ дієслівні форми й лише на однозначні
// закінчення. Загальні -e/-es/-é сюди не входять: на них закінчується безліч
// іменників і прикметників, через що присудком ставало перше-ліпше слово.
const FR_VERB_RE = /^(est|sont|es|suis|sommes|êtes|était|étaient|étais|sera|seront|a|as|ai|ont|avons|avez|avait|avaient|aura|auront|fait|font|va|vont|vais|allez|peut|peuvent|peux|doit|doivent|dois|veut|veulent|veux|sait|savent|vient|viennent|prend|prennent|met|mettent|dit|disent|voit|voient)$|(ons|ez|ent|ait|aient|ais|era|eras|erez|eront|iront|rait|raient|rons)$/i;
const EN_VERB_RE = /^(is|are|was|were|has|have|had|do|does|did|will|would|can|could|must|should|may|might|be|been|being)$|(s|ed|ing)$/i;
// Службові слова окремо для КОЖНОЇ мови: спільний список плутав мови — французьке
// "a" (має) виключалось як англійський артикль, і присудок зміщувався.
const NOT_VERB_FR = new Set(('le la les l un une des du de d ce cet cette ces mon ma mes ton ta tes ' +
    'son sa ses notre nos votre vos leur leurs je tu il elle on nous vous ils elles me te se y en ' +
    'que qui quoi dont ne pas plus très comme dans pour avec sans sur sous aux au par et ou mais donc car').split(' '));
const NOT_VERB_EN = new Set(('the a an this that these those my your his her its our their and or but so ' +
    'of in on for with to at by from some any no not very as than then there here').split(' '));
// Означники: слово після них — майже завжди іменник, а не дієслово. Саме це
// відрізняє "le séisme" (іменник) від "il pense" (дієслово) для закінчення -e.
const FR_DET = new Set('le la les l un une des du de d ce cet cette ces mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs quelques plusieurs'.split(' '));
const FR_PRON = new Set('me te se le la les lui leur nous vous y en m t s l'.split(' '));
// Закінчення 3-ї особи однини (-e, -es) допускаємо лише поза позицією після означника.
const FR_SOFT_VERB_RE = /(e|es)$/i;

function localSVO(sentence) {
    const isFr = detectLang(sentence).startsWith('fr');
    const re = isFr ? FR_VERB_RE : EN_VERB_RE;
    const stop = isFr ? NOT_VERB_FR : NOT_VERB_EN;
    const words = sentence.split(/\s+/).filter(Boolean);
    const clean = i => (words[i] || '').replace(/[^\p{L}''-]/gu, '').toLowerCase();

    let vi = -1;
    for (let i = 0; i < words.length; i++) {
        const w = clean(i);
        if (!w || stop.has(w)) continue;
        if (re.test(w)) { vi = i; break; }
        // М'яке правило для французької: -e/-es вважаємо дієсловом, лише якщо
        // попереднє слово не означник (інакше це іменник на кшталт "séisme").
        if (isFr && i > 0 && FR_SOFT_VERB_RE.test(w) && !FR_DET.has(clean(i - 1)) && w.length > 3) {
            vi = i; break;
        }
    }
    if (vi <= 0) return null;

    let ve = vi;
    while (ve + 1 < words.length) {
        const nx = clean(ve + 1);
        if (!nx || stop.has(nx) || !re.test(nx)) break;
        ve++;
    }

    // Займенники-додатки перед дієсловом ("te voient") належать до присудка.
    let sEnd = vi;
    if (isFr) while (sEnd > 1 && FR_PRON.has(clean(sEnd - 1))) sEnd--;

    return {
        sujet: words.slice(0, sEnd).join(' ').replace(/^[«"']+/, ''),
        verbe: words.slice(sEnd, ve + 1).join(' '),
        objet: words.slice(ve + 1).join(' ').replace(/[.!?»"']+$/, '')
    };
}

// Промпт для AI-розбору. Схема свідомо трохи багатша за "класичний" S-V-O:
// cod/coi розрізняють прямий і непрямий додаток (важливо для французької), а
// "note" — це саме те місце, куди модель виносить усе, що НЕ вкладається в
// просту схему (заперечення, пасив, питання, відсутність додатка), замість того
// щоб штучно натягувати відповідь на S-V-O там, де його нема.
function buildSvoPrompt(sentence, isFr) {
    if (isFr) {
        return `Analyse la structure grammaticale de cette phrase française : "${sentence}"
Retourne UNIQUEMENT du JSON strict, sans markdown, sans commentaire, exactement dans ce format :
{"sujet":"...","verbe":"...","cod":"...","coi":"...","note":"..."}

Règles :
- "sujet", "verbe", "cod", "coi" sont des sous-chaînes EXACTES copiées littéralement dans la phrase (mêmes mots, casse, apostrophes). Mets "" si cette partie n'existe pas.
- "verbe" est le groupe verbal complet : auxiliaire + verbe + négation + pronom complément collé juste avant (ex. "s'est levé", "ne mange pas", "lui donne" si le pronom précède immédiatement). Pour l'inversion avec trait d'union (ex. "Aimes-tu"), copie le bloc entier.
- "cod" = complément d'objet direct (répond à qui/quoi, sans préposition, ex. "une pomme", "le livre"). "coi" = complément d'objet indirect (répond à à qui/à quoi/de qui — souvent un pronom "lui/leur/y/en" ou un groupe avec à/de, ex. "lui" dans "Je lui donne le livre").
- Les compléments circonstanciels (temps, lieu, manière — ex. "pendant deux heures", "hier", "dans le jardin") ne sont JAMAIS cod/coi : laisse-les vides, mentionne-les dans "note" si utile.
- À la voix passive, le complément d'agent ("par Marie") n'est ni cod ni coi.
- S'il n'y a pas de complément d'objet direct, laisse "cod" vide — ne force rien.
- Si la phrase ne suit pas du tout un schéma sujet-verbe-objet (fragment, interjection, phrase nominale), remplis seulement ce qui existe vraiment et explique dans "note".
- "note" : UNE courte note en UKRAINIEN (une phrase brève, ou "" si rien de particulier) signalant négation, voix passive, question/inversion/"est-ce que", absence de complément, ou structure non-SVO. Laisse "" pour une phrase simple sans particularité.`;
    }
    return `Analyse the grammatical structure of this English sentence: "${sentence}"
Return STRICT JSON only, no markdown, no explanation, exactly in this format:
{"sujet":"...","verbe":"...","cod":"...","coi":"...","note":"..."}

Rules:
- "sujet", "verbe", "cod", "coi" must be EXACT substrings copied literally from the sentence (same words, case, punctuation). Use "" if that part does not exist.
- "verbe" is the complete verb group: main verb + all auxiliaries (be/have/do/modal) + negation ("not"/"n't"), e.g. "has been reading", "does not come", "was opened". If an auxiliary is separated from the main verb by the subject (question inversion, e.g. "Do you like"), put only the CONTIGUOUS main verb in "verbe" (e.g. "like") and mention the inversion in "note" instead — never invent a non-contiguous substring.
- "cod" is the direct object (what/whom directly receives the action, no preposition, e.g. "the door", "this book"). "coi" is the indirect object (usually introduced by "to"/"for", or a person receiving something, e.g. "her" in "I give her the book").
- Adverbials of time, place, manner, frequency or duration (e.g. "for two hours", "yesterday", "in the garden") are NEVER the object — leave cod/coi empty for these; mention them in "note" only if useful.
- In passive voice, the "by ..." agent is NOT the object.
- If the sentence has no direct object at all, leave "cod" empty — do not force one.
- If the sentence does not follow a Subject-Verb-Object pattern at all (fragment, interjection, subject+adjective, imperative with no subject), fill in only what genuinely exists and explain in "note".
- "note": a SHORT note in UKRAINIAN (one brief sentence, or "" if nothing special) mentioning negation, passive voice, question/inversion, missing object, or a non-SVO structure, when relevant. Leave "" for a plain simple sentence with nothing notable.`;
}

// Дуже рідкісний збіг: AI не дав придатної відповіді, а місцевий резерв теж не
// впорався з реченням (напр. незнайомий формі дієслова). Без цього користувач
// бачив би просто зникнення індикатора "Розбираю…" без жодного пояснення.
function showSvoFailureNote() {
    const line = document.createElement('div');
    line.className = 'tt-svo-line';
    line.innerHTML = `<span class="tt-note">${escapeHtml(t('error'))}</span>`;
    els.ttTranslation.appendChild(line);
    const a = state.tooltipAnchor;
    if (a) positionTooltip(a.clientX, a.clientY, a.anchorRect);
}
let svoToken = 0;
async function analyzeSVO(sentence) {
    // Те саме обмеження, що й у startAiTask: ручне виділення нічим не обмежене
    // на вході, S-V-O-кнопка доступна і для дуже довгого фрагмента.
    sentence = (sentence || '').slice(0, AI_PROMPT_TEXT_MAX);
    const myToken = ++svoToken;
    const task = beginAsyncTask('svo');
    // Місцевий розбір без мережі: спрощений, лише S-V-O, без COD/COI й без "note".
    // Використовується як РЕЗЕРВ — коли немає ключа/мережі, або коли сам запит до
    // AI не вдався чи повернув щось, що не вдалося застосувати до тексту.
    const tryLocalFallback = () => {
        const parts = localSVO(sentence);
        return !!parts && applySVOParts(parts, true);
    };
    if (!aiAvailable() || !navigator.onLine) {
        if (!tryLocalFallback()) alert(t('needKeySvo'));
        return;
    }
    if (!state.lastSelectedRange) return;

    // Знімаємо зелену підсвітку виділення: разом із кольорами членів речення вона
    // зливалася й заважала розрізняти підмет, присудок і додаток.
    if (typeof CSS !== 'undefined' && CSS.highlights) CSS.highlights.delete(SEL_HL_NAME);
    unwrapSpans(state.selSpans); state.selSpans = [];

    const legend = document.createElement('div');
    legend.className = 'tt-svo-line';
    legend.innerHTML = `<span class="tt-note">${t('analysing')}</span>`;
    els.ttTranslation.appendChild(legend);

    const isFr = detectLang(sentence).startsWith('fr');
    const prompt = buildSvoPrompt(sentence, isFr);

    try {
        const answer = await callAI(prompt, task.signal);
        if (myToken !== svoToken || !task.current()) return;
        const raw = answer.replace(/```json|```/g, '').trim();
        let parts = null;
        try { parts = JSON.parse(raw); } catch (e) { parts = null; }
        legend.remove();
        // AI відповів, але або не дав валідний JSON, або жоден фрагмент не
        // знайшовся дослівно в тексті (перефразував) — це помилка розбору, а не
        // "немає ключа", тому тут доречний саме резервний МІСЦЕВИЙ розбір, а не
        // мовчазне зникнення індикатора.
        if (!applySVOParts(parts) && !tryLocalFallback()) showSvoFailureNote();
    } catch (e) {
        if (myToken !== svoToken || !task.current()) return;
        legend.remove();
        if (!tryLocalFallback()) showSvoFailureNote();
    }
}

// Підсвічує знайдені члени речення й показує легенду. Спільна для розбору через AI
// (sujet/verbe/cod/coi/note) і для місцевого розбору без мережі (sujet/verbe/objet,
// старий формат теж підтримується — objet трактується як cod).
function applySVOParts(parts, approximate) {
    if (!state.lastSelectedRange || !parts || typeof parts !== 'object') return false;
    if (typeof CSS !== 'undefined' && CSS.highlights) CSS.highlights.delete(SEL_HL_NAME);
    unwrapSpans(state.selSpans); state.selSpans = [];

    const flat = flattenRange(state.lastSelectedRange);
    const found = {};
    const map = {
        sujet: 'svo-subject', verbe: 'svo-verb',
        cod: 'svo-object', coi: 'svo-coi'
    };
    const values = {
        sujet: parts.sujet, verbe: parts.verbe,
        cod: parts.cod ?? parts.objet,   // старий локальний розбір і, про всяк випадок, старий формат AI
        coi: parts.coi
    };
    for (const [key, hlName] of Object.entries(map)) {
        const frag = typeof values[key] === 'string' ? values[key].trim() : '';
        if (!frag) continue;
        const idx = flat.text.indexOf(frag);
        if (idx === -1) continue;           // модель перефразувала — пропускаємо
        const r = rangeForSlice(flat, idx, idx + frag.length);
        if (!r) continue;
        try { CSS.highlights.set(hlName, new Highlight(r)); found[key] = frag; } catch (e) {}
    }
    const note = typeof parts.note === 'string' ? parts.note.trim() : '';
    // Нема жодного підсвіченого члена речення І нема пояснення — по суті, розбір
    // нічого не дав; хай викликач спробує резервний варіант.
    if (!Object.keys(found).length && !note) return false;

    const line = document.createElement('div');
    line.className = 'tt-svo-line';
    line.innerHTML =
        (found.sujet ? `<span class="svo-key svo-s">${t('svoSubject')}</span>` : '') +
        (found.verbe ? `<span class="svo-key svo-v">${t('svoVerb')}</span>` : '') +
        (found.cod ? `<span class="svo-key svo-o">${t('svoObject')}</span>` : '') +
        (found.coi ? `<span class="svo-key svo-coi">${t('svoCoi')}</span>` : '') +
        (approximate ? `<span class="tt-note">${t('approx')}</span>` : '') +
        // Довільний текст від AI — лише як textContent через escapeHtml, ніколи як HTML.
        (note ? `<span class="tt-svo-note">${escapeHtml(note)}</span>` : '');
    els.ttTranslation.appendChild(line);
    const a = state.tooltipAnchor;
    if (a) positionTooltip(a.clientX, a.clientY, a.anchorRect);
    return true;
}

// ========== ЗАПИТ ДЛЯ ПАНЕЛІ "ГРАМАТИКА" ==========
// Тільки те, що справді потрібно для французького дієслова: визначити спосіб і час
// (indicatif / conditionnel / subjonctif / impératif / infinitif), допоміжне дієслово
// та стан — і провідміняти саме в цьому часі за особами. Нічого зайвого.
function buildGrammarPrompt(word, sentence) {
    const lang = detectLang(sentence || word);

    // АНГЛІЙСЬКА — ультракороткий розбір за схемою: час, структура, головне правило.
    if (lang.startsWith('en')) {
        return `Make an ultra-short grammar analysis of this sentence: "${sentence || word}".
Answer in English, raw HTML (no markdown, no \`\`\`). Give ONLY this list, nothing else:
1. <b>Tense / construction</b>: name of the tense + its formula
2. <b>Sentence structure</b>: e.g. S + V + O
3. <b>Key rule</b>: why this word order or verb form is used here
Then, for each verb in the sentence, one line: <div class="verb-card"><b>infinitive</b> — form used, tense</div>
Be brief. No examples, no extra commentary.`;
    }

    // ФРАНЦУЗЬКА — детальний розбір із відмінюванням, як і був.
    const ctx = sentence ? ` Phrase : "${sentence}".` : '';
    return `Analyse grammaticale. Mot touché : "${word}".${ctx}
Réponds uniquement en français, en HTML brut (sans markdown, sans \`\`\`). Aucune explication superflue, style dictionnaire, abrégé.

1. Si "${word}" est un verbe, traite-le en premier. Puis traite CHAQUE AUTRE VERBE de la phrase, dans l'ordre d'apparition.
2. Pour chaque verbe, donne ce bloc :
<div class="verb-card">
<b>infinitif</b> — groupe (1er/2e/3e), aux. avoir|être, voix active|passive
<b>Forme</b> : mode, temps, personne, nombre
<b>Conjugaison</b> : tableau HTML de ce mode et ce temps, 6 lignes. Colonne « personne » = les pronoms (je, tu, il/elle/on, nous, vous, ils/elles) et JAMAIS « 1er sg ». Colonne « forme » = la forme conjuguée, différente à chaque ligne, jamais l'infinitif répété (ex. je suis, tu es, il est, nous sommes, vous êtes, ils sont). Si le mot touché est un infinitif ou un participe, conjugue-le à l'indicatif présent
</div>
3. Termine par la liste des verbes sous cette forme exacte, pour les boutons :
<div class="verb-chips">
<button class="verb-chip" data-v="INFINITIF">INFINITIF</button>
</div>
(un bouton par verbe, avec l'infinitif)

Si aucun verbe : une seule ligne — catégorie grammaticale, genre et nombre si pertinent.`;
}

// Відмінювання конкретного дієслова в обраному часі — для кнопок під панеллю.
function buildConjugationPrompt(verb, tense) {
    return `Conjugue le verbe français "${verb}" au ${tense}.
Réponds uniquement en français, en HTML brut (sans markdown, sans \`\`\`), sans commentaire.

Format EXACT :
<b>${verb}</b> — <b>${tense}</b>
<table><tr><th>personne</th><th>forme</th></tr>
<tr><td>je</td><td>suis</td></tr><tr><td>tu</td><td>es</td></tr>
<tr><td>il, elle, on</td><td>est</td></tr><tr><td>nous</td><td>sommes</td></tr>
<tr><td>vous</td><td>êtes</td></tr><tr><td>ils, elles</td><td>sont</td></tr></table>

RÈGLES IMPÉRATIVES :
• la colonne « personne » contient les PRONOMS (je, tu, il/elle/on, nous, vous, ils/elles), jamais « 1er sg » ;
• la colonne « forme » contient la forme CONJUGUÉE et différente à chaque ligne — ne répète jamais l'infinitif ;
• temps composé : écris l'auxiliaire conjugué + le participe passé (ex. « j'ai fait », « je suis allé(e) ») ;
• impératif : seulement 2e sg, 1re pl, 2e pl.`;
}


// ========== ЗАПИТ ДЛЯ ПАНЕЛІ "ЗАПИТАЙ AI" ==========
// Панель працює ВИКЛЮЧНО в контексті вивчення мови: значення слова, коли воно
// вживається, сталі сполучення й коротка граматична нота. Жодних енциклопедичних
// довідок про предмет — для цього є інші джерела.
function buildAskPrompt(term, sentence, userPrompt, langName) {
    // Передаємо не лише речення, а й абзац: за двома-трьома словами жанр не визначити,
    // а від жанру залежить, ЯК пояснювати — художній образ, науковий термін чи реалія.
    const para = state.lastAskParagraph && state.lastAskParagraph !== sentence
        ? `\nАбзац навколо: "${state.lastAskParagraph}".` : '';
    const ctx = sentence ? `\nРечення з тексту: "${sentence}".` : '';
    const q = userPrompt ? `\nЗапитання користувача: "${userPrompt}".` : '';
    return `Поясни вираз "${term}" читачеві книги.${ctx}${para}${q}
Відповідай ${langName}, у форматі HTML (без markdown, без \`\`\`). Стисло — до 5 коротких пунктів. Виділяй ключове тегом <b>.

СПОЧАТКУ сам визнач за контекстом, ЯКОГО РОДУ цей текст і що саме перед тобою — навіть якщо вирвано лише два-три слова. Почни відповідь одним рядком: <b>Контекст:</b> і тип (художній текст / науковий чи технічний / історичний / юридичний чи офіційний / побутовий / граматична конструкція).

Далі дай пояснення, що відповідає САМЕ цьому типу:
• художній — образ, метафора, відтінок, що автор хотів передати;
• науковий або технічний — що це таке й принцип дії простими словами;
• історичний — хто/що це, коли, чим важливе;
• юридичний або офіційний — що означає на практиці;
• побутовий — реалія, звичай, як це виглядає в житті;
• граматична конструкція — що це за конструкція і як вона працює.

Якщо вираз багатозначний, спершу дай значення, яке підходить до цього контексту, і лише потім згадай інші одним рядком.`;
}

// Окремий розбір "для вивчення мови": рівень CEFR і спрощення до потрібного рівня.
function buildLanguageLevelPrompt(fragment, sentence, langName) {
    const ctx = (sentence && sentence !== fragment) ? `\nПовне речення: "${sentence}".` : '';
    // Мова оригіналу визначає, якою мовою робити спрощення: англійське речення
    // спрощується англійською, французьке — французькою. Раніше спрощення завжди
    // видавалось французькою, навіть для англійського тексту.
    const src = detectLang(sentence || fragment);
    const srcName = src.startsWith('fr') ? 'французькою' : 'англійською';
    return `Мовний розбір фрагмента ${srcName}: "${fragment}".${ctx}
Пояснення давай ${langName}, у форматі HTML (без markdown, без \`\`\`). Стисло, без води.

ВАЖЛИВО: спрощені варіанти мають бути ТІЄЮ САМОЮ мовою, що й оригінал — ${srcName}. Не перекладай фрагмент іншою мовою.

РОЗМІТКА (обов'язково саме така, вона потрібна для кольорового виділення):
• позначку рівня став як <span class="lvl" data-l="B1">B1</span>, підставляючи потрібний рівень;
• кожен варіант спрощення обгортай як <div class="lvl-block" data-l="A2"> … </div>.

Дай саме це:
1. <b>Рівень:</b> <span class="lvl" data-l="…">…</span> — і <b>чому</b> саме такий: назви конкретно, що піднімає рівень (час дієслова, спосіб, конструкція, лексика).
2. <b>Що складного</b> — 1–3 конкретні місця, які ускладнюють розуміння.
3. <div class="lvl-block" data-l="A2"> спрощення до A2 ${srcName}, а поруч у дужках переклад ${langName} </div>
4. <div class="lvl-block" data-l="B1"> те саме на рівні B1, так само ${srcName} з перекладом </div>
Зміст у спрощеннях має лишитись тим самим — міняється лише складність мови.`;
}

// Мовний розбір: рівень CEFR і спрощення до A2/B1 для останнього виділеного фрагмента.
document.getElementById('btn-lang-level').onclick = () => {
    const frag = state.lastAskContext || state.lastGrammarSentence;
    if (!frag) { alert(t('selectFirst')); return; }
    startAiTask(frag, 'level');
    els.askPanel.classList.add('expanded');
};



document.getElementById('btn-explain').onclick = () => {
    const frag = state.lastAskContext || state.lastGrammarSentence;
    if (!frag) { alert(t('selectFirst')); return; }
    startAiTask(frag, 'ask');
    els.askPanel.classList.add('expanded');
};

// ========== ДІЄСЛОВА: ВИБІР І ВІДМІНЮВАННЯ В РІЗНИХ ЧАСАХ ==========
// Список дієслів будуємо САМІ з готового розбору, а не покладаємось на те, що модель
// виведе кнопки — раніше саме через їхню відсутність часи лишались непрацездатними.
function collectVerbsFromAnalysis() {
    const cards = els.grammarContent.querySelectorAll('.verb-card');
    const verbs = [];
    cards.forEach(card => {
        const b = card.querySelector('b');
        if (!b) return;
        const inf = (b.textContent || '').trim().split(/[\s—,(]/)[0];
        if (!inf || verbs.some(v => v.inf === inf)) return;
        // Рядок "Forme : ..." — це стан дієслова саме в реченні; показуємо його зверху.
        const txt = (card.innerText || '').replace(/\s+/g, ' ');
        const m = txt.match(/Forme\s*:\s*([^]*?)(?:Conjugaison|$)/i);
        verbs.push({ inf, forme: m ? m[1].trim().replace(/[\s:—]+$/, '') : '' });
    });
    // Запасний варіант: модель усе-таки вивела кнопки — беремо їх.
    if (!verbs.length) {
        els.grammarContent.querySelectorAll('.verb-chip').forEach(c => {
            if (!verbs.some(v => v.inf === c.dataset.v)) verbs.push({ inf: c.dataset.v, forme: '' });
        });
    }
    return verbs;
}

function renderVerbBar() {
    const bar = document.getElementById('verb-bar');
    bar.innerHTML = '';
    state.verbs = collectVerbsFromAnalysis();
    state.verbs.forEach(v => {
        const b = document.createElement('button');
        b.className = 'verb-chip';
        b.dataset.v = v.inf;
        b.textContent = v.inf;
        b.onclick = () => selectVerb(v.inf);
        bar.appendChild(b);
    });
    if (state.verbs.length && !state.activeVerb) state.activeVerb = state.verbs[0].inf;
    highlightActiveVerb();
}
function highlightActiveVerb() {
    document.querySelectorAll('#verb-bar .verb-chip').forEach(b => {
        b.classList.toggle('active', b.dataset.v === state.activeVerb);
    });
    document.querySelectorAll('#tense-bar button').forEach(b => {
        b.classList.toggle('active', b.dataset.t === state.activeTense);
    });
}

// Показує обране дієслово: спершу його стан у реченні, під ним — відмінювання
// в обраному часі за всіма особами.
async function showVerb(verb, tense) {
    const task = beginAsyncTask('conjugation');
    els.grammarContent.querySelectorAll('.verb-focus').forEach(n => n.remove());
    state.activeVerb = verb;
    state.activeTense = tense;
    highlightActiveVerb();

    const info = state.verbs.find(v => v.inf === verb);
    const box = document.createElement('div');
    box.className = 'verb-card verb-focus';
    box.innerHTML = `<div class="verb-head"><b>${escapeHtml(verb)}</b>` +
        (info && info.forme ? ` <span class="verb-forme">${escapeHtml(info.forme)}</span>` : '') +
        `</div><div class="tt-note">${t('generating')}</div>`;
    els.grammarContent.prepend(box);
    els.grammarContent.scrollTop = 0;

    try {
        const out = await callAI(buildConjugationPrompt(verb, tense), task.signal);
        if (!task.current() || !box.isConnected) return;
        box.innerHTML = `<div class="verb-head"><b>${escapeHtml(verb)}</b>` +
            (info && info.forme ? ` <span class="verb-forme">${escapeHtml(info.forme)}</span>` : '') +
            `</div>` + safeHtml(out, true);
    } catch (err) {
        if (!task.current() || !box.isConnected) return;
        if (!task.current()) {
            if (!asyncTasks.has('conjugation') && box.isConnected) {
                box.innerHTML = `<span class="tt-note">Запит скасовано</span>`;
            }
            return;
        }
        if (!box.isConnected) return;
        box.innerHTML = `<span style="color:red">${escapeHtml(err.message || t('error'))}</span>`;
    }
}

function selectVerb(verb) { showVerb(verb, state.activeTense || 'indicatif présent'); }

document.getElementById('tense-bar').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const verb = state.activeVerb || (state.verbs[0] && state.verbs[0].inf);
    if (!verb) { alert(t('pickVerb')); return; }
    showVerb(verb, btn.dataset.t);
});

