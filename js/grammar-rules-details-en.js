// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
/* grammar-rules-details-en.js — розгорнуті пояснення правил і ВИНЯТКІВ для тем англійського каталогу
 * (js/grammar-rules-data-en.js). Формат такий самий, як у js/grammar-rules-details-fr.js. Класичний <script src>. */
(function () {
    const en = {};
    const D = (id, texts) => { en[id] = texts; };

    D('present-simple', {
        uk: `Правила:
• Ствердження: основа дієслова; в 3-й особі однини +s/-es (he works, she watches).
• Заперечення й питання — do/does + основа: she doesn’t work, does he work?
• Вживається для звичок, фактів, розкладів (the train leaves at nine) і з прислівниками частоти.
Винятки:
• Be, have: I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes); приголосна + y → -ies (studies), але голосна + y → +s (plays).
• Після does/doesn’t закінчення -s зникає: she doesn’t work (а не works).
• Модальні дієслова не мають -s: she can swim.`,
        en: `Rules:
• Positive: the base verb; third person singular adds -s/-es (he works, she watches).
• Negatives and questions — do/does + base verb: she doesn’t work, does he work?
• Used for habits, facts, timetables (the train leaves at nine) and with frequency adverbs.
Exceptions:
• Be, have: I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes); consonant + y → -ies (studies), but vowel + y → +s (plays).
• After does/doesn’t the -s disappears: she doesn’t work (not works).
• Modal verbs take no -s: she can swim.`,
        fr: `Règles:
• Forme affirmative : base verbale ; à la troisième personne du singulier, on ajoute -s/-es (he works, she watches).
• Formes négative et interrogative : do/does + base verbale : she doesn’t work, does he work?
• Utilisé pour les habitudes, les faits, les horaires (the train leaves at nine) et avec les adverbes de fréquence.
Exceptions:
• Be, have : I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes) ; consonne + y → -ies (studies), mais voyelle + y → +s (plays).
• Après does/doesn’t disparaît le -s : she doesn’t work (et non works).
• Les verbes modaux ne prennent pas de -s : she can swim.
Conjugaison (personne, nombre):
| Personne | work | be | have | do | go |
| I | work | am | have | do | go |
| you | work | are | have | do | go |
| he / she / it | works | is | has | does | goes |
| we / you / they | work | are | have | do | go |`,
        ru: `Правила:
• Утвердительная форма: начальная форма глагола; в третьем лице единственного числа добавляется -s/-es (he works, she watches).
• Отрицания и вопросы: do/does + начальная форма глагола: she doesn’t work, does he work?
• Используется для обозначения привычек, фактов, расписаний (the train leaves at nine) и частотных наречий.
Исключения:
• Be, have: I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes); согласная + y → -ies (studies), но гласная + y → +s (plays).
• После does/doesn’t -s исчезает: she doesn’t work (не works).
• Модальные глаголы не принимают -s: she can swim.
Спряжение (лицо, число):
| Лицо | work | be | have | do | go |
| I | work | am | have | do | go |
| you | work | are | have | do | go |
| he / she / it | works | is | has | does | goes |
| we / you / they | work | are | have | do | go |`,
        es: `Reglas:
• Forma afirmativa: forma base del verbo; en tercera persona del singular se añade -s/-es (he works, she watches).
• Negaciones y preguntas: do/does + forma base del verbo: she doesn’t work, does he work?
• Usado para hábitos, hechos, horarios (the train leaves at nine) y con adverbios de frecuencia.
Excepciones:
• Be, have: I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes); consonante + y → -ies (studies), pero vocal + y → +s (plays).
• Después de does/doesn’t, el -s desaparece: she doesn’t work (no works).
• Los verbos modales no llevan -s: she can swim.
Conjugación (persona, número):
| Persona | work | be | have | do | go |
| I | work | am | have | do | go |
| you | work | are | have | do | go |
| he / she / it | works | is | has | does | goes |
| we / you / they | work | are | have | do | go |`,
        zh: `规则:
• 肯定句用动词原形；第三人称单数加 -s/-es (he works, she watches)。
• 否定句和疑问句用 do/does + 动词原形：she doesn’t work, does he work?
• 用于习惯、事实、时间表 (the train leaves at nine) 以及频率副词。
例外:
• Be, have：I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes);辅音 + y → -ies (studies)，但元音 + y → +s (plays)。
• 在 does/doesn’t 之后，-s 消失：she doesn’t work（不是 works）。
• 情态动词不带-s：she can swim.
变位（人称、数）:
| 人称 | work | be | have | do | go |
| I | work | am | have | do | go |
| you | work | are | have | do | go |
| he / she / it | works | is | has | does | goes |
| we / you / they | work | are | have | do | go |`,
        ko: `규칙:
• 긍정문은 동사원형을 사용하며, 3인칭 단수에서는 -s/-es를 붙입니다 (he works, she watches).
• 부정문과 의문문은 do/does + 동사원형을 사용합니다: she doesn’t work, does he work?
• 습관, 사실, 시간표 (the train leaves at nine) 및 빈도 부사와 함께 사용됩니다.
예외:
• Be, have: I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes); 자음 + y → -ies (studies), 모음 + y → +s (plays).
• does/doesn’t 이후에는 -s가 사라집니다: she doesn’t work(works 아님)
• 조동사는 -s를 취하지 않습니다: she can swim.
활용(인칭, 수):
| 인칭 | work | be | have | do | go |
| I | work | am | have | do | go |
| you | work | are | have | do | go |
| he / she / it | works | is | has | does | goes |
| we / you / they | work | are | have | do | go |`,
        hi: `नियम:
• सकारात्मक वाक्य में क्रिया का मूल रूप आता है; तृतीय पुरुष एकवचन में -s/-es जुड़ता है (he works, she watches)।
• नकारात्मक और प्रश्नवाचक वाक्यों में do/does + क्रिया का मूल रूप आता है: she doesn’t work, does he work?
• आदतों, तथ्यों, समय सारिणी (the train leaves at nine) और आवृत्ति क्रियाविशेषणों के लिए उपयोग किया जाता है।
अपवाद:
• Be, have: I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes); व्यंजन + y → -ies (studies), लेकिन स्वर + y → +s (plays)।
• does/doesn’t के बाद -s गायब हो जाता है: she doesn’t work (works नहीं)।
• भाववाचक सहायक क्रियाएँ कोई -s नहीं लेती हैं: she can swim.
क्रिया-रूप (पुरुष, वचन):
| पुरुष | work | be | have | do | go |
| I | work | am | have | do | go |
| you | work | are | have | do | go |
| he / she / it | works | is | has | does | goes |
| we / you / they | work | are | have | do | go |`,
        ga: `Rialacha:
• Foirm dhearfach: bunfhoirm an bhriathair; cuirtear -s/-es leis sa tríú pearsa uatha (he works, she watches).
• Diúltú agus ceisteanna: do/does + bunfhoirm an bhriathair: she doesn’t work, does he work?
• Le nósanna, fíricí, amchláir (the train leaves at nine) agus dobhriathra minicíochta.
Eisceachtaí:
• Be, have: I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes); consan + y → -ies (studies), ach guta + y → +s (plays).
• Tar éis does/doesn’t, imíonn an -s: she doesn’t work (seachas works).
• Ní ghlacann briathra módúla -s: she can swim.
Réimniú (pearsa, uimhir):
| Pearsa | work | be | have | do | go |
| I | work | am | have | do | go |
| you | work | are | have | do | go |
| he / she / it | works | is | has | does | goes |
| we / you / they | work | are | have | do | go |`
    });

    D('present-continuous', {
        uk: `Правила:
• Am/is/are + дієслово з -ing: I am reading, they are playing.
• Дія зараз, тимчасова ситуація, домовленість на найближче майбутнє (we are meeting tomorrow).
• Для роздратування з always: he is always losing his keys.
Винятки:
• Дієслова стану зазвичай без continuous: know, like, love, want, believe, understand, need, belong, own, seem (I know, не I am knowing).
• Деякі дієслова мають обидва значення: I think it’s good (думка) / I’m thinking about it (процес); I see (бачу) / I’m seeing him (зустрічаюсь).
• Орфографія -ing: make → making, run → running, lie → lying.`,
        en: `Rules:
• Am/is/are + verb-ing: I am reading, they are playing.
• An action now, a temporary situation, an arranged plan (we are meeting tomorrow).
• For annoyance with always: he is always losing his keys.
Exceptions:
• State verbs normally avoid the continuous: know, like, love, want, believe, understand, need, belong, own, seem (I know, not I am knowing).
• Some verbs have both meanings: I think it’s good (opinion) / I’m thinking about it (process); I see (understand) / I’m seeing him (meeting).
• -ing spelling: make → making, run → running, lie → lying.`,
        fr: `Règles:
• Am/is/are + verbe en -ing : I am reading, they are playing.
• Une action maintenant, une situation temporaire, un plan arrangé (we are meeting tomorrow).
• En cas de gêne avec always : he is always losing his keys.
Exceptions:
• Les verbes statifs évitent normalement le continuous : know, like, love, want, believe, understand, need, belong, own, seem (I know, pas I am knowing).
• Certains verbes ont les deux sens : I think it’s good (opinion) / I’m thinking about it (processus) ; I see (comprendre) / I’m seeing him (réunion).
• Orthographe de -ing : make → making, run → running, lie → lying.
Conjugaison (personne, nombre):
| Personne | be + working |
| I | am working |
| you | are working |
| he / she / it | is working |
| we / you / they | are working |`,
        ru: `Правила:
• Am/is/are + глагол на -ing: I am reading, they are playing.
• Действие сейчас, временная ситуация, продуманный план (we are meeting tomorrow).
• За раздражение на always: he is always losing his keys.
Исключения:
• Стативные глаголы обычно избегают continuous: know, like, love, want, believe, understand, need, belong, own, seem (I know, а не I am knowing).
• Некоторые глаголы имеют оба значения: I think it’s good (мнение) / I’m thinking about it (процесс); I see (понимание) / I’m seeing him (встреча).
• Написание -ing: make → making, run → running, lie → lying.
Спряжение (лицо, число):
| Лицо | be + working |
| I | am working |
| you | are working |
| he / she / it | is working |
| we / you / they | are working |`,
        es: `Reglas:
• Am/is/are + verbo en -ing: I am reading, they are playing.
• Una acción ahora, una situación temporal, un plan arreglado (we are meeting tomorrow).
• Para molestias con always: he is always losing his keys.
Excepciones:
• Los verbos estativos normalmente evitan el continuous: know, like, love, want, believe, understand, need, belong, own, seem (I know, no I am knowing).
• Algunos verbos tienen ambos significados: I think it’s good (opinión) / I’m thinking about it (proceso); I see (comprender) / I’m seeing him (reunión).
• Ortografía -ing: make → making, run → running, lie → lying.
Conjugación (persona, número):
| Persona | be + working |
| I | am working |
| you | are working |
| he / she / it | is working |
| we / you / they | are working |`,
        zh: `规则:
• Am/is/are + 动词的 -ing 形式：I am reading, they are playing.
• 现在的行动，临时的情况，安排好的计划(we are meeting tomorrow)。
• 对于 always 的烦恼：he is always losing his keys.
例外:
• 静态动词通常避免 continuous：know, like, love, want, believe, understand, need, belong, own, seem（I know，而不是 I am knowing）。
• 一些动词具有两种含义：I think it’s good（意见）/I’m thinking about it（过程）； I see（理解）/I’m seeing him（会议）。
• -ing 拼写：make → making, run → running, lie → lying.
变位（人称、数）:
| 人称 | be + working |
| I | am working |
| you | are working |
| he / she / it | is working |
| we / you / they | are working |`,
        ko: `규칙:
• Am/is/are + 동사의 -ing형: I am reading, they are playing.
• 지금의 행동, 일시적인 상황, 정해진 계획 (we are meeting tomorrow).
• always에 대한 불만사항: he is always losing his keys.
예외:
• 상태 동사는 일반적으로 continuous: know, like, love, want, believe, understand, need, belong, own, seem(I know, I am knowing 아님)를 피합니다.
• 일부 동사에는 두 가지 의미가 모두 있습니다: I think it’s good(의견) / I’m thinking about it(과정); I see(이해) / I’m seeing him(회의).
• -ing 철자: make → making, run → running, lie → lying.
활용(인칭, 수):
| 인칭 | be + working |
| I | am working |
| you | are working |
| he / she / it | is working |
| we / you / they | are working |`,
        hi: `नियम:
• Am/is/are + क्रिया का -ing रूप: I am reading, they are playing.
• अभी एक कार्रवाई, एक अस्थायी स्थिति, एक व्यवस्थित योजना (we are meeting tomorrow)।
• always से परेशानी के लिए: he is always losing his keys.
अपवाद:
• स्थितिसूचक क्रियाएँ आमतौर पर continuous से बचती हैं: know, like, love, want, believe, understand, need, belong, own, seem (I know, I am knowing नहीं)।
• कुछ क्रियाओं के दोनों अर्थ होते हैं: I think it’s good (राय) / I’m thinking about it (प्रक्रिया); I see (समझें) / I’m seeing him (बैठक)।
• -ing वर्तनी: make → making, run → running, lie → lying.
क्रिया-रूप (पुरुष, वचन):
| पुरुष | be + working |
| I | am working |
| you | are working |
| he / she / it | is working |
| we / you / they | are working |`,
        ga: `Rialacha:
• Am/is/are + foirm -ing an bhriathair: I am reading, they are playing.
• Gníomh anois, staid shealadach nó socrú atá déanta (we are meeting tomorrow).
• Le always chun crá a léiriú: he is always losing his keys.
Eisceachtaí:
• De ghnáth ní úsáidtear briathra staide sa continuous: know, like, love, want, believe, understand, need, belong, own, seem (I know, seachas I am knowing).
• Tá an dá bhrí ag roinnt briathra: I think it’s good (tuairim) / I’m thinking about it (próiseas); I see (tuigim) / I’m seeing him (ag bualadh leis).
• Litriú -ing: make → making, run → running, lie → lying.
Réimniú (pearsa, uimhir):
| Pearsa | be + working |
| I | am working |
| you | are working |
| he / she / it | is working |
| we / you / they | are working |`
    });

    D('present-perfect', {
        uk: `Правила:
• Have/has + past participle: I have seen, she has finished.
• Досвід (I have been to Rome), результат (I have lost my keys), дія до цього часу з for/since (we have lived here for years).
• Маркери: already, yet, just, ever, never, recently, so far, since, for.
Винятки:
• З конкретним минулим часом — не present perfect, а past simple: I saw him yesterday (не I have seen him yesterday).
• Неправильні participles: be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone (пішов і ще там) ≠ have been (був і повернувся).
• Брит. і амер. англійська: американці частіше вживають past simple з already/just/yet.`,
        en: `Rules:
• Have/has + past participle: I have seen, she has finished.
• Experience (I have been to Rome), result (I have lost my keys), an action up to now with for/since (we have lived here for years).
• Markers: already, yet, just, ever, never, recently, so far, since, for.
Exceptions:
• With a definite past time use the past simple: I saw him yesterday (not I have seen him yesterday).
• Irregular participles: be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone (went and is still there) ≠ have been (went and came back).
• British vs American: Americans often use the past simple with already/just/yet.`,
        fr: `Règles:
• Have/has + participe passé : I have seen, she has finished.
• Expérience (I have been to Rome), résultat (I have lost my keys), une action jusqu'à présent avec for/since (we have lived here for years).
• Marqueurs : already, yet, just, ever, never, recently, so far, since, for.
Exceptions:
• Avec une heure passée définie, utilisez le past simple : I saw him yesterday (pas I have seen him yesterday).
• Participes irréguliers : be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone (y est allé et est toujours là) ≠ have been (y est allé et est revenu).
• Britanniques contre Américains : les Américains utilisent souvent le past simple avec le already/just/yet.
Conjugaison (personne, nombre):
| Personne | have/has + worked | have/has + gone |
| I / you / we / they | have worked | have gone |
| he / she / it | has worked | has gone |`,
        ru: `Правила:
• Have/has + причастие прошедшего времени: I have seen, she has finished.
• Опыт (I have been to Rome), результат (I have lost my keys), действие до сих пор с for/since (we have lived here for years).
• Маркеры: already, yet, just, ever, never, recently, so far, since, for.
Исключения:
• Для определенного времени прошлого используйте past simple: I saw him yesterday (не I have seen him yesterday).
• Неправильные причастия: be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone (ушел и остался там) ≠ have been (ушел и вернулся).
• Британцы против американцев: американцы часто используют past simple с already/just/yet.
Спряжение (лицо, число):
| Лицо | have/has + worked | have/has + gone |
| I / you / we / they | have worked | have gone |
| he / she / it | has worked | has gone |`,
        es: `Reglas:
• Have/has + participio pasado: I have seen, she has finished.
• Experimenta (I have been to Rome), resultado (I have lost my keys), una acción hasta ahora con for/since (we have lived here for years).
• Marcadores: already, yet, just, ever, never, recently, so far, since, for.
Excepciones:
• Con un pasado definido utilizar el past simple: I saw him yesterday (no I have seen him yesterday).
• Participios irregulares: be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone (fue y sigue allí) ≠ have been (fue y volvió).
• Británico versus estadounidense: los estadounidenses suelen utilizar el past simple con el already/just/yet.
Conjugación (persona, número):
| Persona | have/has + worked | have/has + gone |
| I / you / we / they | have worked | have gone |
| he / she / it | has worked | has gone |`,
        zh: `规则:
• Have/has + 过去分词：I have seen, she has finished.
• 体验(I have been to Rome)，结果(I have lost my keys)，迄今为止与for/since (we have lived here for years)的动作。
• 标记：already, yet, just, ever, never, recently, so far, since, for.
例外:
• 对于明确的过去时间，请使用 past simple：I saw him yesterday（而不是 I have seen him yesterday）。
• 不规则分词：be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone（去了并且还在）≠ have been（去了又回来了）。
• 英国 vs 美国：美国人经常使用 past simple 和 already/just/yet.
变位（人称、数）:
| 人称 | have/has + worked | have/has + gone |
| I / you / we / they | have worked | have gone |
| he / she / it | has worked | has gone |`,
        ko: `규칙:
• Have/has + 과거분사: I have seen, she has finished.
• (I have been to Rome)를 경험하고 결과는 (I have lost my keys)이며 for/since (we have lived here for years)로 지금까지의 작업입니다.
• 마커: already, yet, just, ever, never, recently, so far, since, for.
예외:
• 확실한 과거 시간에는 past simple: I saw him yesterday(I have seen him yesterday 아님)를 사용하세요.
• 불규칙 분사: be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone(갔다가 아직 있음) ≠ have been(갔다가 돌아옴)
• 영국 대 미국: 미국인은 종종 past simple를 already/just/yet.와 함께 사용합니다.
활용(인칭, 수):
| 인칭 | have/has + worked | have/has + gone |
| I / you / we / they | have worked | have gone |
| he / she / it | has worked | has gone |`,
        hi: `नियम:
• Have/has + भूतकालिक कृदंत: I have seen, she has finished.
• अनुभव (I have been to Rome), परिणाम (I have lost my keys), for/since (we have lived here for years) के साथ अब तक की एक कार्रवाई।
• मार्कर: already, yet, just, ever, never, recently, so far, since, for.
अपवाद:
• एक निश्चित भूतकाल के साथ past simple: I saw him yesterday (I have seen him yesterday नहीं) का उपयोग करें।
• अनियमित कृदंत: be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone (गया और अभी भी वहीं है) ≠ have been (गया और वापस आया)।
• ब्रिटिश बनाम अमेरिकी: अमेरिकी अक्सर already/just/yet. के साथ past simple का उपयोग करते हैं
क्रिया-रूप (पुरुष, वचन):
| पुरुष | have/has + worked | have/has + gone |
| I / you / we / they | have worked | have gone |
| he / she / it | has worked | has gone |`,
        ga: `Rialacha:
• Have/has + rangabháil chaite: I have seen, she has finished.
• Taithí (I have been to Rome), toradh (I have lost my keys), gníomh a mhaireann go dtí seo le for/since (we have lived here for years).
• Focail chomhartha: already, yet, just, ever, never, recently, so far, since, for.
Eisceachtaí:
• Le ham cinnte san am atá caite, úsáidtear an past simple: I saw him yesterday (seachas I have seen him yesterday).
• Rangabhálacha neamhrialta: be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone (chuaigh agus tá fós ann) ≠ have been (chuaigh agus tháinig ar ais).
• Béarla na Breataine agus Mheiriceá: is minice a úsáideann Meiriceánaigh an past simple le already/just/yet.
Réimniú (pearsa, uimhir):
| Pearsa | have/has + worked | have/has + gone |
| I / you / we / they | have worked | have gone |
| he / she / it | has worked | has gone |`
    });

    D('present-perfect-continuous', {
        uk: `Правила:
• Have/has been + verb-ing: I have been waiting for an hour.
• Підкреслює ТРИВАЛІСТЬ дії, що почалась у минулому і триває або щойно завершилась; видимий результат (your eyes are red — you have been crying).
• Часто з for і since.
Винятки:
• З дієсловами стану — present perfect simple: I have known him for years (не have been knowing).
• Коли важлива кількість або завершеність — simple: I have read three books (не have been reading).
• Always/lately/recently — допускають обидва.`,
        en: `Rules:
• Have/has been + verb-ing: I have been waiting for an hour.
• Stresses DURATION of an action that began in the past and continues or has just stopped; visible result (your eyes are red — you have been crying).
• Often with for and since.
Exceptions:
• With state verbs use the present perfect simple: I have known him for years (not have been knowing).
• When quantity or completion matters, use the simple form: I have read three books (not have been reading).
• Always/lately/recently allow both.`,
        fr: `Règles:
• Have/has been + verbe en -ing : I have been waiting for an hour.
• Insiste sur la DURÉE d'une action qui a commencé dans le passé et qui se poursuit ou vient de s'arrêter ; résultat visible (your eyes are red — you have been crying).
• Souvent avec for et since.
Exceptions:
• Avec les verbes d'état, utilisez le present perfect simple : I have known him for years (pas have been knowing).
• Lorsque la quantité ou l'achèvement sont importants, utilisez le formulaire simple : I have read three books (et non have been reading).
• Always/lately/recently autorise les deux.`,
        ru: `Правила:
• Have/has been + глагол на -ing: I have been waiting for an hour.
• Подчеркивает ПРОДОЛЖИТЕЛЬНОСТЬ действия, которое началось в прошлом и продолжается или только что прекратилось; видимый результат (your eyes are red — you have been crying).
• Часто с for и since.
Исключения:
• С глаголами состояния используйте present perfect simple: I have known him for years (не have been knowing).
• Если количество или завершение имеют значение, используйте форму simple: I have read three books (не have been reading).
• Always/lately/recently разрешает и то, и другое.`,
        es: `Reglas:
• Have/has been + verbo en -ing: I have been waiting for an hour.
• Destaca la DURACIÓN de una acción que comenzó en el pasado y continúa o acaba de detenerse; resultado visible (your eyes are red — you have been crying).
• A menudo con for y since.
Excepciones:
• Con verbos de estado use present perfect simple: I have known him for years (no have been knowing).
• Cuando la cantidad o la finalización sean importantes, utilice el formulario simple: I have read three books (no have been reading).
• Always/lately/recently permite ambos.`,
        zh: `规则:
• Have/has been + 动词的 -ing 形式：I have been waiting for an hour.
• 强调过去开始并持续或刚刚停止的动作的持续时间；可见结果(your eyes are red — you have been crying)。
• 通常与 for 和 since. 一起使用
例外:
• 状态动词使用 present perfect simple：I have known him for years（不是 have been knowing）。
• 当数量或完成情况很重要时，请使用 simple 形式：I have read three books（而不是 have been reading）。
• Always/lately/recently 两者都允许。`,
        ko: `규칙:
• Have/has been + 동사의 -ing형: I have been waiting for an hour.
• 과거에 시작되어 계속되거나 방금 중지된 작업의 DURATION을 강조합니다. 보이는 결과 (your eyes are red — you have been crying).
• 종종 for 및 since.와 함께
예외:
• 상태 동사에는 present perfect simple: I have known him for years(have been knowing 아님)를 사용하세요.
• 수량이나 완성도가 중요한 경우 simple 형식(I have read three books(have been reading 아님))을 사용하세요.
• Always/lately/recently는 둘 다 허용합니다.`,
        hi: `नियम:
• Have/has been + क्रिया का -ing रूप: I have been waiting for an hour.
• किसी कार्य की अवधि पर जोर देता है जो अतीत में शुरू हुआ और जारी है या अभी रुका है; दृश्यमान परिणाम (your eyes are red — you have been crying)।
• अक्सर for और since. के साथ
अपवाद:
• स्थितिसूचक क्रियाओं के साथ present perfect simple का उपयोग करें: I have known him for years (have been knowing नहीं)।
• जब मात्रा या पूर्णता मायने रखती है, तो simple फॉर्म का उपयोग करें: I have read three books (have been reading नहीं)।
• Always/lately/recently दोनों की अनुमति देता है।`,
        ga: `Rialacha:
• Have/has been + foirm -ing an bhriathair: I have been waiting for an hour.
• Cuireann sé béim ar FHAD gnímh a thosaigh san am atá caite agus atá ar siúl fós nó atá díreach stoptha; toradh infheicthe (your eyes are red — you have been crying).
• Go minic le for agus since.
Eisceachtaí:
• Le briathra staide, úsáidtear an present perfect simple: I have known him for years (seachas have been knowing).
• Nuair is tábhachtach an méid nó an críochnú, úsáidtear an fhoirm simple: I have read three books (seachas have been reading).
• Ceadaíonn Always/lately/recently an dá fhoirm.`
    });

    D('past-simple', {
        uk: `Правила:
• Правильні дієслова: +ed (walked); неправильні — окремі форми (go → went, see → saw).
• Заперечення й питання — did + основа: I didn’t go, did you see him?
• Завершена дія в минулому з відомим часом (yesterday, last year, in 2010, ago).
Винятки:
• Орфографія: stop → stopped, study → studied, love → loved, play → played.
• Вимова -ed: /t/ (walked), /d/ (played), /ɪd/ (wanted).
• Be: was/were; з did не вживається (did you be — помилка).
• Після did основа без -ed: I didn’t walk.`,
        en: `Rules:
• Regular verbs: +ed (walked); irregular verbs have special forms (go → went, see → saw).
• Negatives and questions — did + base verb: I didn’t go, did you see him?
• A completed past action with a known time (yesterday, last year, in 2010, ago).
Exceptions:
• Spelling: stop → stopped, study → studied, love → loved, play → played.
• -ed pronunciation: /t/ (walked), /d/ (played), /ɪd/ (wanted).
• Be: was/were; not used with did (did you be is wrong).
• After did the base form has no -ed: I didn’t walk.`,
        fr: `Règles:
• Verbes réguliers : +ed (walked) ; les verbes irréguliers ont des formes spéciales (go → went, see → saw).
• Phrases et questions négatives — did + forme de base du verbe : I didn’t go, did you see him?
• Une action passée terminée avec une heure connue (yesterday, last year, in 2010, ago).
Exceptions:
• Orthographe : stop → stopped, study → studied, love → loved, play → played.
• Prononciation de -ed : /t/ (walked), /d/ (played), /ɪd/ (wanted).
• Be : was/were ; non utilisé avec did (did you be est faux).
• Après did, le formulaire de base n'a pas de -ed : I didn’t walk.
Conjugaison (personne, nombre):
| Personne | work (régulier) | go (irrégulier) | be | have | do |
| I | worked | went | was | had | did |
| you | worked | went | were | had | did |
| he / she / it | worked | went | was | had | did |
| we / you / they | worked | went | were | had | did |`,
        ru: `Правила:
• Правильные глаголы: +ed (walked); неправильные глаголы имеют особые формы (go → went, see → saw).
• Отрицательные предложения и вопросы — did + базовая форма глагола: I didn’t go, did you see him?
• Завершенное прошлое действие с известным временем (yesterday, last year, in 2010, ago).
Исключения:
• Правописание: stop → stopped, study → studied, love → loved, play → played.
• Произношение -ed: /t/ (walked), /d/ (played), /ɪd/ (wanted).
• Be: was/were; не используется с did (did you be неверен).
• После did в базовой форме нет -ed: I didn’t walk.
Спряжение (лицо, число):
| Лицо | work (правильный) | go (неправильный) | be | have | do |
| I | worked | went | was | had | did |
| you | worked | went | were | had | did |
| he / she / it | worked | went | was | had | did |
| we / you / they | worked | went | were | had | did |`,
        es: `Reglas:
• Verbos regulares: +ed (walked); los verbos irregulares tienen formas especiales (go → went, see → saw).
• Oraciones negativas y preguntas — did + forma base del verbo: I didn’t go, did you see him?
• Una acción pasada completada con un tiempo conocido (yesterday, last year, in 2010, ago).
Excepciones:
• Ortografía: stop → stopped, study → studied, love → loved, play → played.
• Pronunciación de -ed: /t/ (walked), /d/ (played), /ɪd/ (wanted).
• Be: was/were; no se usa con did (did you be es incorrecto).
• Después de did el formulario base no tiene -ed: I didn’t walk.
Conjugación (persona, número):
| Persona | work (regular) | go (irregular) | be | have | do |
| I | worked | went | was | had | did |
| you | worked | went | were | had | did |
| he / she / it | worked | went | was | had | did |
| we / you / they | worked | went | were | had | did |`,
        zh: `规则:
• 规则动词：+ed (walked)；不规则动词有特殊形式(go → went, see → saw)。
• 否定句和疑问句 - did + 动词的基本形式：I didn’t go, did you see him?
• 过去完成的动作，时间已知为 (yesterday, last year, in 2010, ago)。
例外:
• 拼写：stop → stopped, study → studied, love → loved, play → played.
• -ed 发音：/t/ (walked)、/d/ (played)、/ɪd/ (wanted)。
• Be: was/were;不与did一起使用（did you be是错误的）。
• 在did之后，基本形式没有-ed：I didn’t walk.
变位（人称、数）:
| 人称 | work（规则动词） | go（不规则动词） | be | have | do |
| I | worked | went | was | had | did |
| you | worked | went | were | had | did |
| he / she / it | worked | went | was | had | did |
| we / you / they | worked | went | were | had | did |`,
        ko: `규칙:
• 일반 동사: +ed (walked); 불규칙 동사는 특별한 형태인 (go → went, see → saw)를 가집니다.
• 부정문 및 의문문 — did + 동사 기본형: I didn’t go, did you see him?
• 알려진 시간 (yesterday, last year, in 2010, ago)로 완료된 과거 작업.
예외:
• 철자: stop → stopped, study → studied, love → loved, play → played.
• -ed 발음: /t/ (walked), /d/ (played), /ɪd/ (wanted).
• Be: was/were; did와 함께 사용되지 않습니다(did you be가 잘못되었습니다).
• did 이후 기본 양식에는 -ed가 없습니다: I didn’t walk.
활용(인칭, 수):
| 인칭 | work (규칙 동사) | go (불규칙 동사) | be | have | do |
| I | worked | went | was | had | did |
| you | worked | went | were | had | did |
| he / she / it | worked | went | was | had | did |
| we / you / they | worked | went | were | had | did |`,
        hi: `नियम:
• नियमित क्रियाएँ: +ed (walked); अनियमित क्रियाओं के विशेष रूप (go → went, see → saw) होते हैं।
• नकारात्मक वाक्य और प्रश्न - did + क्रिया का मूल रूप: I didn’t go, did you see him?
• ज्ञात समय (yesterday, last year, in 2010, ago) के साथ पूर्ण की गई पिछली कार्रवाई।
अपवाद:
• वर्तनी: stop → stopped, study → studied, love → loved, play → played.
• -ed उच्चारण: /t/ (walked), /d/ (played), /ɪd/ (wanted)।
• Be: was/were; did के साथ प्रयोग नहीं किया गया (did you be गलत है)।
• did के बाद आधार फॉर्म में कोई -ed नहीं है: I didn’t walk.
क्रिया-रूप (पुरुष, वचन):
| पुरुष | work (नियमित) | go (अनियमित) | be | have | do |
| I | worked | went | was | had | did |
| you | worked | went | were | had | did |
| he / she / it | worked | went | was | had | did |
| we / you / they | worked | went | were | had | did |`,
        ga: `Rialacha:
• Briathra rialta: +ed (walked); tá foirmeacha speisialta ag briathra neamhrialta (go → went, see → saw).
• Diúltú agus ceisteanna: did + bunfhoirm an bhriathair: I didn’t go, did you see him?
• Gníomh críochnaithe san am atá caite le ham aitheanta (yesterday, last year, in 2010, ago).
Eisceachtaí:
• Litriú: stop → stopped, study → studied, love → loved, play → played.
• Fuaimniú -ed: /t/ (walked), /d/ (played), /ɪd/ (wanted).
• Be: was/were; ní úsáidtear le did é (tá did you be mícheart).
• Tar éis did, níl -ed ar an mbunfhoirm: I didn’t walk.
Réimniú (pearsa, uimhir):
| Pearsa | work (rialta) | go (neamhrialta) | be | have | do |
| I | worked | went | was | had | did |
| you | worked | went | were | had | did |
| he / she / it | worked | went | was | had | did |
| we / you / they | worked | went | were | had | did |`
    });

    D('past-continuous', {
        uk: `Правила:
• Was/were + verb-ing: I was reading, they were playing.
• Дія в процесі в певний момент у минулому (at 8 pm I was cooking) або фон для короткої дії в past simple: I was walking when it started to rain.
• Дві тривалі дії одночасно: while she was cooking, he was reading.
Винятки:
• Дієслова стану: not was knowing — просто knew.
• Послідовні короткі дії — past simple, не continuous: he opened the door and walked in.
• Після when/while: while + continuous, when + simple (when the phone rang, I was sleeping).`,
        en: `Rules:
• Was/were + verb-ing: I was reading, they were playing.
• An action in progress at a moment in the past (at 8 pm I was cooking) or the background to a short past-simple action: I was walking when it started to rain.
• Two simultaneous long actions: while she was cooking, he was reading.
Exceptions:
• State verbs: not was knowing — simply knew.
• Consecutive short actions use the past simple, not the continuous: he opened the door and walked in.
• After when/while: while + continuous, when + simple (when the phone rang, I was sleeping).`,
        fr: `Règles:
• Was/were + verbe en -ing : I was reading, they were playing.
• Une action en cours à un instant du passé (at 8 pm I was cooking) ou l'arrière-plan d'une action au passé simple : I was walking when it started to rain.
• Deux actions longues simultanées : while she was cooking, he was reading.
Exceptions:
• Verbes statifs : not was knowing — simplement knew.
• Les actions courtes consécutives utilisent le past simple, pas le continuous : he opened the door and walked in.
• Après when/while : while + continuous, when + simple (when the phone rang, I was sleeping).
Conjugaison (personne, nombre):
| Personne | was/were + working |
| I / he / she / it | was working |
| you / we / they | were working |`,
        ru: `Правила:
• Was/were + глагол на -ing: I was reading, they were playing.
• Действие, происходящее в определенный момент в прошлом (at 8 pm I was cooking) или фон короткого простого действия в прошедшем времени: I was walking when it started to rain.
• Два одновременных длинных действия: while she was cooking, he was reading.
Исключения:
• Стативные глаголы: not was knowing — просто knew.
• Последовательные короткие действия используют past simple, а не continuous: he opened the door and walked in.
• После when/while: while + continuous, when + simple (when the phone rang, I was sleeping).
Спряжение (лицо, число):
| Лицо | was/were + working |
| I / he / she / it | was working |
| you / we / they | were working |`,
        es: `Reglas:
• Was/were + verbo en -ing: I was reading, they were playing.
• Una acción en progreso en un momento del pasado (at 8 pm I was cooking) o el fondo de una acción de pasado simple breve: I was walking when it started to rain.
• Dos acciones largas simultáneas: while she was cooking, he was reading.
Excepciones:
• Verbos estátivos: not was knowing — simplemente knew.
• Las acciones cortas consecutivas utilizan el past simple, no el continuous: he opened the door and walked in.
• Después de when/while: while + continuous, when + simple (when the phone rang, I was sleeping).
Conjugación (persona, número):
| Persona | was/were + working |
| I / he / she / it | was working |
| you / we / they | were working |`,
        zh: `规则:
• Was/were + 动词的 -ing 形式：I was reading, they were playing.
• 过去时某个时刻正在进行的动作 (at 8 pm I was cooking) 或过去简单动作的背景：I was walking when it started to rain.
• 两个同时进行的长动作：while she was cooking, he was reading.
例外:
• 静态动词：not was knowing — 只是 knew.
• 连续的短操作使用 past simple，而不是 continuous：he opened the door and walked in.
• when/while 之后：while + continuous, when + simple (when the phone rang, I was sleeping)。
变位（人称、数）:
| 人称 | was/were + working |
| I / he / she / it | was working |
| you / we / they | were working |`,
        ko: `규칙:
• Was/were + 동사의 -ing형: I was reading, they were playing.
• 과거 (at 8 pm I was cooking)의 한 순간에 진행 중인 작업 또는 짧은 과거-단순 작업의 배경: I was walking when it started to rain.
• 두 개의 동시 긴 동작: while she was cooking, he was reading.
예외:
• 상태 동사: not was knowing — 간단히 knew.
• 연속적인 짧은 동작은 continuous가 아닌 past simple를 사용합니다: he opened the door and walked in.
• when/while 이후: while + continuous, when + simple (when the phone rang, I was sleeping).
활용(인칭, 수):
| 인칭 | was/were + working |
| I / he / she / it | was working |
| you / we / they | were working |`,
        hi: `नियम:
• Was/were + क्रिया का -ing रूप: I was reading, they were playing.
• अतीत में एक पल में प्रगति पर एक कार्रवाई (at 8 pm I was cooking) या एक संक्षिप्त अतीत-सरल कार्रवाई की पृष्ठभूमि: I was walking when it started to rain.
• दो एक साथ लंबी क्रियाएं: while she was cooking, he was reading.
अपवाद:
• स्थितिसूचक क्रियाएँ: not was knowing - बस knew.
• लगातार छोटी कार्रवाइयां past simple का उपयोग करती हैं, continuous का नहीं: he opened the door and walked in.
• when/while के बाद: while + continuous, when + simple (when the phone rang, I was sleeping)।
क्रिया-रूप (पुरुष, वचन):
| पुरुष | was/were + working |
| I / he / she / it | was working |
| you / we / they | were working |`,
        ga: `Rialacha:
• Was/were + foirm -ing an bhriathair: I was reading, they were playing.
• Gníomh ar siúl ag pointe san am atá caite (at 8 pm I was cooking), nó cúlra do ghníomh gearr sa past simple: I was walking when it started to rain.
• Dhá ghníomh fhada chomhuaineacha: while she was cooking, he was reading.
Eisceachtaí:
• Briathra staide: not was knowing — úsáidtear knew. go simplí.
• Le gníomhartha gearra as a chéile, úsáidtear an past simple, ní an continuous: he opened the door and walked in.
• Tar éis when/while: while + continuous, when + simple (when the phone rang, I was sleeping).
Réimniú (pearsa, uimhir):
| Pearsa | was/were + working |
| I / he / she / it | was working |
| you / we / they | were working |`
    });

    D('past-perfect', {
        uk: `Правила:
• Had + past participle: I had finished, she had left.
• Дія, що сталася ДО іншої минулої дії або моменту (when I arrived, the film had started).
• У третьому conditional та після wish про минуле: if I had known…; I wish I had gone.
Винятки:
• Якщо послідовність очевидна (after, before, as soon as), часто достатньо past simple: after he left, I called.
• ’d може означати had або would — розрізняйте за формою після нього: she’d left (had), she’d leave (would).
• Для довготривалості до моменту в минулому — past perfect continuous.`,
        en: `Rules:
• Had + past participle: I had finished, she had left.
• An action that happened BEFORE another past action or moment (when I arrived, the film had started).
• In the third conditional and after wish about the past: if I had known…; I wish I had gone.
Exceptions:
• When the order is obvious (after, before, as soon as) the past simple is often enough: after he left, I called.
• ’d can mean had or would — decide by the form that follows: she’d left (had), she’d leave (would).
• For duration up to a past moment use the past perfect continuous.`,
        fr: `Règles:
• Had + participe passé : I had finished, she had left.
• Une action qui s'est produite AVANT une autre action ou moment passé (when I arrived, the film had started).
• Au troisième conditionnel et après wish sur le passé : if I had known…; I wish I had gone.
Exceptions:
• Quand l'ordre est évident (after, before, as soon as) le past simple suffit souvent : after he left, I called.
• ’d peut signifier had ou would — décidez par la forme qui suit : she’d left (had), she’d leave (would).
• Pour une durée allant jusqu'à un instant passé, utilisez le past perfect continuous.
Conjugaison (personne, nombre):
| Personne | had + participe passé |
| I / you / he / she / it / we / they | had worked · had gone · had been |`,
        ru: `Правила:
• Had + причастие прошедшего времени: I had finished, she had left.
• Действие, которое произошло ДО другого прошлого действия или момента (when I arrived, the film had started).
• В третьем условном и после wish о прошлом: if I had known…; I wish I had gone.
Исключения:
• Когда порядок (after, before, as soon as) очевиден, часто достаточно past simple: after he left, I called.
• ’d может означать had или would — решите по следующей форме: she’d left (had), she’d leave (would).
• Для продолжительности до прошлого момента используйте past perfect continuous.
Спряжение (лицо, число):
| Лицо | had + причастие прошедшего времени |
| I / you / he / she / it / we / they | had worked · had gone · had been |`,
        es: `Reglas:
• Had + participio pasado: I had finished, she had left.
• Una acción que ocurrió ANTES de otra acción pasada o momento (when I arrived, the film had started).
• En el tercer condicional y después de wish sobre el pasado: if I had known…; I wish I had gone.
Excepciones:
• Cuando el orden es obvio (after, before, as soon as), el past simple suele ser suficiente: after he left, I called.
• ’d puede significar had o would; decídalo por la siguiente forma: she’d left (had), she’d leave (would).
• Para duración hasta un momento pasado utilice el past perfect continuous.
Conjugación (persona, número):
| Persona | had + participio pasado |
| I / you / he / she / it / we / they | had worked · had gone · had been |`,
        zh: `规则:
• Had + 过去分词：I had finished, she had left.
• 在另一个过去的动作或时刻 (when I arrived, the film had started) 之前发生的动作。
• 在第三个条件句中，在关于过去的 wish 之后：if I had known…; I wish I had gone.
例外:
• 当顺序很明显 (after, before, as soon as) 时，past simple 通常就足够了：after he left, I called.
• ’d 可以表示 had 或 would - 由以下形式决定：she’d left (had)、she’d leave (would)。
• 对于过去一刻的持续时间，请使用 past perfect continuous.
变位（人称、数）:
| 人称 | had + 过去分词 |
| I / you / he / she / it / we / they | had worked · had gone · had been |`,
        ko: `규칙:
• Had + 과거분사: I had finished, she had left.
• 다른 과거 행동이나 순간 (when I arrived, the film had started) 이전에 발생한 행동.
• 세 번째 조건부 및 과거에 대한 wish 이후: if I had known…; I wish I had gone.
예외:
• 순서가 분명한 경우 (after, before, as soon as) past simple로도 충분할 때가 많습니다: after he left, I called.
• ’d는 had 또는 would를 의미할 수 있습니다. 다음 형식에 따라 결정하세요. she’d left (had), she’d leave (would).
• 지난 순간까지 지속하려면 past perfect continuous.를 사용하세요
활용(인칭, 수):
| 인칭 | had + 과거분사 |
| I / you / he / she / it / we / they | had worked · had gone · had been |`,
        hi: `नियम:
• Had + भूतकालिक कृदंत: I had finished, she had left.
• एक क्रिया जो किसी अन्य पिछली क्रिया या क्षण (when I arrived, the film had started) से पहले हुई हो।
• तीसरी सशर्त में और wish के बाद अतीत के बारे में: if I had known…; I wish I had gone.
अपवाद:
• जब क्रम स्पष्ट है (after, before, as soon as) तो past simple अक्सर पर्याप्त होता है: after he left, I called.
• ’d का अर्थ had या would हो सकता है - निम्न फ़ॉर्म से निर्णय लें: she’d left (had), she’d leave (would)।
• पिछले क्षण तक की अवधि के लिए past perfect continuous. का उपयोग करें
क्रिया-रूप (पुरुष, वचन):
| पुरुष | had + भूतकालिक कृदंत |
| I / you / he / she / it / we / they | had worked · had gone · had been |`,
        ga: `Rialacha:
• Had + rangabháil chaite: I had finished, she had left.
• Gníomh a tharla ROIMH ghníomh eile nó pointe ama san am atá caite (when I arrived, the film had started).
• Sa tríú coinníollach agus tar éis wish faoin am atá caite: if I had known…; I wish I had gone.
Eisceachtaí:
• Nuair atá an t-ord soiléir (after, before, as soon as), is leor an past simple go minic: after he left, I called.
• Féadann ’d had nó would a chiallaíonn; braitheann sé ar an bhfoirm a leanann: she’d left (had), she’d leave (would).
• Le fad ama go dtí pointe san am atá caite, úsáidtear an past perfect continuous.
Réimniú (pearsa, uimhir):
| Pearsa | had + rangabháil chaite |
| I / you / he / she / it / we / they | had worked · had gone · had been |`
    });

    D('past-perfect-continuous', {
        uk: `Правила:
• Had been + verb-ing: she had been studying for hours.
• Тривала дія до певного моменту в минулому, часто з видимим наслідком (his hands were dirty — he had been working).
Винятки:
• З дієсловами стану — past perfect simple: I had known her for years.
• Коли названа кількість — simple: he had written three letters.`,
        en: `Rules:
• Had been + verb-ing: she had been studying for hours.
• A long action up to a past moment, often with a visible result (his hands were dirty — he had been working).
Exceptions:
• With state verbs use the past perfect simple: I had known her for years.
• When a number is given — simple: he had written three letters.`,
        fr: `Règles:
• Had been + verbe en -ing : she had been studying for hours.
• Une action longue jusqu'à un instant passé, avec souvent un résultat visible (his hands were dirty — he had been working).
Exceptions:
• Avec les verbes d'état, utilisez le past perfect simple : I had known her for years.
• Quand un numéro est donné — simple : he had written three letters.`,
        ru: `Правила:
• Had been + глагол на -ing: she had been studying for hours.
• Длительное действие до прошлого момента, часто с видимым результатом (his hands were dirty — he had been working).
Исключения:
• С глаголами состояния используйте past perfect simple: I had known her for years.
• Когда задано число — simple: he had written three letters.`,
        es: `Reglas:
• Had been + verbo en -ing: she had been studying for hours.
• Una acción prolongada hasta un momento pasado, a menudo con un resultado visible (his hands were dirty — he had been working).
Excepciones:
• Con verbos de estado use past perfect simple: I had known her for years.
• Cuando se da un número — simple: he had written three letters.`,
        zh: `规则:
• Had been + 动词的 -ing 形式：she had been studying for hours.
• 持续到过去某个时刻的长时间操作，通常会产生可见的结果 (his hands were dirty — he had been working)。
例外:
• 状态动词使用 past perfect simple：I had known her for years.
• 当给出数字时 - simple: he had written three letters.`,
        ko: `규칙:
• Had been + 동사의 -ing형: she had been studying for hours.
• 지난 순간까지의 긴 작업으로, 가시적인 결과가 나타나는 경우가 많습니다 (his hands were dirty — he had been working).
예외:
• 상태 동사에는 past perfect simple: I had known her for years.를 사용하세요
• 숫자가 주어지면 — simple: he had written three letters.`,
        hi: `नियम:
• Had been + क्रिया का -ing रूप: she had been studying for hours.
• बीते क्षण तक की एक लंबी कार्रवाई, अक्सर दृश्यमान परिणाम (his hands were dirty — he had been working) के साथ।
अपवाद:
• स्थितिसूचक क्रियाओं के साथ past perfect simple: I had known her for years. का उपयोग करें
• जब कोई संख्या दी जाती है - simple: he had written three letters.`,
        ga: `Rialacha:
• Had been + foirm -ing an bhriathair: she had been studying for hours.
• Gníomh fada go dtí pointe san am atá caite, go minic le toradh infheicthe (his hands were dirty — he had been working).
Eisceachtaí:
• Le briathra staide, úsáidtear an past perfect simple: I had known her for years.
• Nuair a shonraítear líon, úsáidtear an simple: he had written three letters.`
    });

    D('future-will', {
        uk: `Правила:
• Will + основа: I will help, it will rain; скорочення ’ll, won’t.
• Рішення в момент мовлення, прогнози (I think it will snow), обіцянки, пропозиції.
• Часто після I think, probably, perhaps, I’m sure.
Винятки:
• Після if/when/as soon as/before/until про майбутнє — present simple, не will: if it rains, we will stay.
• Will для запланованого — going to / present continuous краще.
• Shall — I/we у пропозиціях: shall I open the window? (брит.).`,
        en: `Rules:
• Will + base verb: I will help, it will rain; contractions ’ll, won’t.
• Spontaneous decisions, predictions (I think it will snow), promises, offers.
• Often after I think, probably, perhaps, I’m sure.
Exceptions:
• After if/when/as soon as/before/until about the future — present simple, not will: if it rains, we will stay.
• For something already planned going to / present continuous is better.
• Shall — I/we in offers: shall I open the window? (British).`,
        fr: `Règles:
• Will + forme base du verbe : I will help, it will rain; contractions ’ll, won’t.
• Décisions spontanées, prédictions (I think it will snow), promesses, offres.
• Souvent après I think, probably, perhaps, I’m sure.
Exceptions:
• Après if/when/as soon as/before/until sur le futur — present simple, pas will : if it rains, we will stay.
• Pour quelque chose de déjà prévu, going to / present continuous est mieux.
• Shall — I/we dans les offres : shall I open the window? (britannique).
Conjugaison (personne, nombre):
| Personne | will + base verbale | going to |
| I | I will work (I’ll work) | I am going to work |
| you | you will work | you are going to work |
| he / she / it | he will work | he is going to work |
| we / they | we will work | we are going to work |`,
        ru: `Правила:
• Will + базовая форма глагола: I will help, it will rain; сокращения ’ll, won’t.
• Спонтанные решения, прогнозы (I think it will snow), обещания, предложения.
• Часто после I think, probably, perhaps, I’m sure.
Исключения:
• После if/when/as soon as/before/until о будущем — present simple, а не will: if it rains, we will stay.
• Для уже запланированного going to / present continuous лучше.
• Shall — I/we в предложениях: shall I open the window? (Британский).
Спряжение (лицо, число):
| Лицо | will + начальная форма глагола | going to |
| I | I will work (I’ll work) | I am going to work |
| you | you will work | you are going to work |
| he / she / it | he will work | he is going to work |
| we / they | we will work | we are going to work |`,
        es: `Reglas:
• Will + forma base del verbo: I will help, it will rain; contracciones ’ll, won’t.
• Decisiones espontáneas, predicciones (I think it will snow), promesas, ofertas.
• A menudo después de I think, probably, perhaps, I’m sure.
Excepciones:
• Después de if/when/as soon as/before/until sobre el futuro: present simple, no will: if it rains, we will stay.
• Para algo ya planeado, going to / present continuous es mejor.
• Shall — I/we en ofertas: shall I open the window? (británico).
Conjugación (persona, número):
| Persona | will + forma base del verbo | going to |
| I | I will work (I’ll work) | I am going to work |
| you | you will work | you are going to work |
| he / she / it | he will work | he is going to work |
| we / they | we will work | we are going to work |`,
        zh: `规则:
• Will + 动词的基本形式：I will help, it will rain；缩写 ’ll, won’t.
• 自发决定、预测 (I think it will snow)、承诺、提议。
• 通常在 I think, probably, perhaps, I’m sure. 之后
例外:
• 在关于未来的 if/when/as soon as/before/until 之后 - present simple，而不是 will：if it rains, we will stay.
• 对于已经计划好的事情，going to / present continuous 更好。
• 优惠中的 Shall — I/we：shall I open the window?（英国）。
变位（人称、数）:
| 人称 | will + 动词原形 | going to |
| I | I will work (I’ll work) | I am going to work |
| you | you will work | you are going to work |
| he / she / it | he will work | he is going to work |
| we / they | we will work | we are going to work |`,
        ko: `규칙:
• Will + 동사의 기본형: I will help, it will rain; 축약형 ’ll, won’t.
• 자발적인 결정, 예측 (I think it will snow), 약속, 제안.
• I think, probably, perhaps, I’m sure. 이후에 자주
예외:
• 미래에 대한 if/when/as soon as/before/until 이후 — will가 아닌 present simple: if it rains, we will stay.
• 이미 계획된 일에는 going to / present continuous가 더 좋습니다.
• 오퍼 내 Shall — I/we: shall I open the window?(영국).
활용(인칭, 수):
| 인칭 | will + 동사원형 | going to |
| I | I will work (I’ll work) | I am going to work |
| you | you will work | you are going to work |
| he / she / it | he will work | he is going to work |
| we / they | we will work | we are going to work |`,
        hi: `नियम:
• Will + क्रिया का मूल रूप: I will help, it will rain; संकुचन ’ll, won’t.
• सहज निर्णय, भविष्यवाणियाँ (I think it will snow), वादे, प्रस्ताव।
• अक्सर I think, probably, perhaps, I’m sure. के बाद
अपवाद:
• भविष्य के बारे में if/when/as soon as/before/until के बाद - present simple, will नहीं: if it rains, we will stay.
• पहले से नियोजित किसी चीज़ के लिए going to / present continuous बेहतर है।
• ऑफ़र में Shall — I/we: shall I open the window? (ब्रिटिश)।
क्रिया-रूप (पुरुष, वचन):
| पुरुष | will + क्रिया का मूल रूप | going to |
| I | I will work (I’ll work) | I am going to work |
| you | you will work | you are going to work |
| he / she / it | he will work | he is going to work |
| we / they | we will work | we are going to work |`,
        ga: `Rialacha:
• Will + bunfhoirm an bhriathair: I will help, it will rain; foirmeacha giorraithe ’ll, won’t.
• Cinntí spontáineacha, tuartha (I think it will snow), gealltanais, tairiscintí.
• Go minic tar éis I think, probably, perhaps, I’m sure.
Eisceachtaí:
• Tar éis if/when/as soon as/before/until faoin todhchaí, úsáidtear an present simple, ní will: if it rains, we will stay.
• Le rud atá pleanáilte cheana, is fearr going to / present continuous.
• Shall — I/we i dtairiscintí: shall I open the window? (Béarla na Breataine).
Réimniú (pearsa, uimhir):
| Pearsa | will + bunfhoirm an bhriathair | going to |
| I | I will work (I’ll work) | I am going to work |
| you | you will work | you are going to work |
| he / she / it | he will work | he is going to work |
| we / they | we will work | we are going to work |`
    });

    D('going-to', {
        uk: `Правила:
• Am/is/are going to + основа: we are going to buy a house.
• Наміри й попередні плани; прогноз за очевидними ознаками (look at the clouds — it’s going to rain).
Винятки:
• З go і come частіше просто present continuous: I’m going to the shop (I’m going to go to the shop — теж правильно, лише довше).
• Не використовується з ситуаціями, що вирішені в момент мовлення — там will.
• В розмові: gonna (не пишуть у формальному тексті).`,
        en: `Rules:
• Am/is/are going to + base verb: we are going to buy a house.
• Intentions and prior plans; a prediction based on evidence (look at the clouds — it’s going to rain).
Exceptions:
• With go and come the present continuous is more usual: I’m going to the shop (I’m going to go to the shop is also correct, just longer).
• Not for decisions made at the moment of speaking — use will.
• Spoken: gonna (not written in formal text).`,
        fr: `Règles:
• Am/is/are going to + forme base du verbe : we are going to buy a house.
• Intentions et plans antérieurs ; une prédiction basée sur des preuves (look at the clouds — it’s going to rain).
Exceptions:
• Avec go et come, le present continuous est plus habituel : I’m going to the shop (I’m going to go to the shop est également correct, juste plus long).
• Pas pour les décisions prises au moment de parler — utilisez will.
• Parlé : gonna (non écrit en texte formel).`,
        ru: `Правила:
• Am/is/are going to + основная форма глагола: we are going to buy a house.
• Намерения и предыдущие планы; предсказание, основанное на доказательствах (look at the clouds — it’s going to rain).
Исключения:
• Для go и come present continuous более привычен: I’m going to the shop (I’m going to go to the shop тоже правильно, только длиннее).
• Не для решений, принятых в момент разговора — используйте will.
• Разговорный: gonna (не написано в официальном тексте).`,
        es: `Reglas:
• Am/is/are going to + forma base del verbo: we are going to buy a house.
• Intenciones y planes previos; una predicción basada en evidencia (look at the clouds — it’s going to rain).
Excepciones:
• Con go y come el present continuous es más habitual: I’m going to the shop (I’m going to go to the shop también es correcto, solo que más largo).
• No para decisiones tomadas al momento de hablar — use will.
• Hablado: gonna (no escrito en texto formal).`,
        zh: `规则:
• Am/is/are going to + 动词的基本形式：we are going to buy a house.
• 意图和事先计划；基于证据 (look at the clouds — it’s going to rain) 的预测。
例外:
• 对于 go 和 come，present continuous 更常见：I’m going to the shop（I’m going to go to the shop 也是正确的，只是更长）。
• 不适用于说话时做出的决定 - 使用 will.
• 口语：gonna（非书面形式）。`,
        ko: `규칙:
• Am/is/are going to + 동사 기본형: we are going to buy a house.
• 의도 및 사전 계획 증거 (look at the clouds — it’s going to rain)를 기반으로 한 예측입니다.
예외:
• go 및 come의 경우 present continuous가 더 일반적입니다. I’m going to the shop(I’m going to go to the shop도 정확하지만 더 깁니다).
• 말하는 순간에 내린 결정이 아닌 will.를 사용하세요
• 음성어: gonna(공식 텍스트로 작성되지 않음)`,
        hi: `नियम:
• Am/is/are going to + क्रिया का मूल रूप: we are going to buy a house.
• इरादे और पूर्व योजनाएँ; साक्ष्य (look at the clouds — it’s going to rain) पर आधारित एक भविष्यवाणी।
अपवाद:
• go और come के साथ present continuous अधिक सामान्य है: I’m going to the shop (I’m going to go to the shop भी सही है, बस लंबा है)।
• बोलने के समय लिए गए निर्णयों के लिए नहीं - will. का उपयोग करें
• बोला गया: gonna (औपचारिक पाठ में नहीं लिखा गया)।`,
        ga: `Rialacha:
• Am/is/are going to + bunfhoirm an bhriathair: we are going to buy a house.
• Intinn agus pleananna roimh ré; tuar bunaithe ar fhianaise (look at the clouds — it’s going to rain).
Eisceachtaí:
• Le go agus come, is gnách an present continuous: I’m going to the shop (tá I’m going to go to the shop ceart freisin, ach níos faide).
• Ní úsáidtear le cinntí a dhéantar tráth na cainte é; úsáidtear will.
• Sa chaint: gonna (ní úsáidtear sa scríbhneoireacht fhoirmiúil é).`
    });

    D('future-continuous-perfect', {
        uk: `Правила:
• Future continuous: will be + verb-ing — дія в процесі в певний момент майбутнього (this time tomorrow I will be flying).
• Future perfect: will have + past participle — дія завершиться до певного моменту (by June she will have finished).
• Future perfect continuous: will have been + verb-ing — тривалість до моменту (by May I will have been working here for five years).
Винятки:
• Після by (до) — future perfect; після until/till — future simple або continuous залежно від значення.
• Після when/before/after про майбутнє — present simple/perfect, не will have.`,
        en: `Rules:
• Future continuous: will be + verb-ing — an action in progress at a future moment (this time tomorrow I will be flying).
• Future perfect: will have + past participle — an action completed by a future moment (by June she will have finished).
• Future perfect continuous: will have been + verb-ing — duration up to a moment (by May I will have been working here for five years).
Exceptions:
• After by (before) — future perfect; after until/till — future simple or continuous depending on meaning.
• After when/before/after about the future — present simple/perfect, not will have.`,
        fr: `Règles:
• Future continuous : will be + verbe en -ing – une action en cours à un moment futur (this time tomorrow I will be flying).
• Future perfect : will have + participe passé — une action complétée par un moment futur (by June she will have finished).
• Future perfect continuous : will have been + verbe en -ing — durée jusqu'à un instant (by May I will have been working here for five years).
Exceptions:
• Après by (avant) — future perfect ; après until/till — future simple ou continuous selon la signification.
• Après when/before/after sur le futur — present simple/perfect, pas will have.`,
        ru: `Правила:
• Future continuous: will be + глагол на -ing — действие, происходящее в будущем момент (this time tomorrow I will be flying).
• Future perfect: will have + причастие прошедшего времени — действие, завершающееся моментом будущего времени (by June she will have finished).
• Future perfect continuous: will have been + глагол на -ing — длительность до момента (by May I will have been working here for five years).
Исключения:
• После by (до) — future perfect; после until/till — future simple или continuous в зависимости от значения.
• После when/before/after о будущем — present simple/perfect, а не will have.`,
        es: `Reglas:
• Future continuous: will be + verbo-ing: una acción en progreso en un momento futuro (this time tomorrow I will be flying).
• Future perfect: will have + participio pasado: una acción completada por un momento futuro (by June she will have finished).
• Future perfect continuous: will have been + verbo-ing — duración hasta un momento (by May I will have been working here for five years).
Excepciones:
• Después de by (antes) — future perfect; después de until/till — future simple o continuous según el significado.
• Después de when/before/after sobre el futuro: present simple/perfect, no will have.`,
        zh: `规则:
• Future continuous：will be + 动词的 -ing 形式 - 未来时刻正在进行的动作 (this time tomorrow I will be flying)。
• Future perfect：will have + 过去分词 - 由未来时刻 (by June she will have finished) 完成的动作。
• Future perfect continuous：will have been + 动词的 -ing 形式 - 持续时间最长为 (by May I will have been working here for five years)。
例外:
• by 之后（之前）— future perfect；根据含义，位于 until/till — future simple 或 continuous 之后。
• 在关于未来的 when/before/after 之后 - present simple/perfect，而不是 will have.`,
        ko: `규칙:
• Future continuous: will be + 동사-ing — 미래의 순간 (this time tomorrow I will be flying)에서 진행 중인 작업입니다.
• Future perfect: will have + 과거 분사 — 미래 순간 (by June she will have finished)에 의해 완료된 동작.
• Future perfect continuous: will have been + 동사의 -ing형 — 최대 순간 (by May I will have been working here for five years)까지의 지속 시간.
예외:
• by 이후(이전) — future perfect; 의미에 따라 until/till — future simple 또는 continuous 뒤에 옵니다.
• 미래에 대한 when/before/after 이후 — will have.가 아닌 present simple/perfect`,
        hi: `नियम:
• Future continuous: will be + क्रिया का -ing रूप - भविष्य के क्षण (this time tomorrow I will be flying) में प्रगति पर एक क्रिया।
• Future perfect: will have + भूत कृदंत - एक क्रिया जो भविष्य के क्षण (by June she will have finished) द्वारा पूरी की जाती है।
• Future perfect continuous: will have been + क्रिया का -ing रूप - एक क्षण तक की अवधि (by May I will have been working here for five years)।
अपवाद:
• by के बाद (पहले) - future perfect; अर्थ के आधार पर until/till — future simple या continuous के बाद।
• भविष्य के बारे में when/before/after के बाद - present simple/perfect, will have. नहीं`,
        ga: `Rialacha:
• Future continuous: will be + foirm -ing an bhriathair — gníomh ar siúl ag pointe sa todhchaí (this time tomorrow I will be flying).
• Future perfect: will have + rangabháil chaite — gníomh a bheidh críochnaithe faoi phointe sa todhchaí (by June she will have finished).
• Future perfect continuous: will have been + foirm -ing an bhriathair — fad ama go dtí pointe (by May I will have been working here for five years).
Eisceachtaí:
• Tar éis by («faoi»), úsáidtear an future perfect; tar éis until/till — future simple nó continuous de réir na brí.
• Tar éis when/before/after faoin todhchaí, úsáidtear an present simple/perfect, ní will have.`
    });

    D('used-to-would', {
        uk: `Правила:
• Used to + основа: колишня звичка або стан, яких більше немає (we used to live in Spain; he used to be shy).
• Would + основа: повторювана минула дія, але НЕ стан (every summer we would visit my aunt).
• Заперечення й питання: didn’t use to, did you use to.
Винятки:
• З дієсловами стану (be, have, know, live) — лише used to: I used to have a dog (не would have).
• Be used to + -ing — «звикнути»: I’m used to getting up early — інша конструкція.
• Для одноразового минулого — past simple.`,
        en: `Rules:
• Used to + base verb: a past habit or state that no longer applies (we used to live in Spain; he used to be shy).
• Would + base verb: a repeated past action, NOT a state (every summer we would visit my aunt).
• Negatives and questions: didn’t use to, did you use to.
Exceptions:
• With state verbs (be, have, know, live) only used to: I used to have a dog (not would have).
• Be used to + -ing means "accustomed to": I’m used to getting up early — a different construction.
• For a single past event — the past simple.`,
        fr: `Règles:
• Used to + forme de base du verbe : une habitude ou un état passé qui ne s'applique plus à (we used to live in Spain; he used to be shy).
• Would + forme de base du verbe : une action passée répétée, PAS un état (every summer we would visit my aunt).
• Phrases et questions négatives : didn’t use to, did you use to.
Exceptions:
• Avec les verbes d'état (be, have, know, live) uniquement used to : I used to have a dog (pas would have).
• Be used to + -ing signifie « habitué à » : I’m used to getting up early — une construction différente.
• Pour un seul événement passé – le past simple.`,
        ru: `Правила:
• Used to + базовая форма глагола: прошлая привычка или состояние, которое больше не применимо (we used to live in Spain; he used to be shy).
• Would + базовая форма глагола: повторяющееся прошедшее действие, НЕ состояние (every summer we would visit my aunt).
• Отрицательные предложения и вопросы: didn’t use to, did you use to.
Исключения:
• С глаголами состояния (be, have, know, live) только used to: I used to have a dog (не would have).
• Be used to + -ing означает "привыкший": I’m used to getting up early — другая конструкция.
• Для одного прошлого события — past simple.`,
        es: `Reglas:
• Used to + forma base del verbo: un hábito o estado pasado que ya no aplica (we used to live in Spain; he used to be shy).
• Would + forma base del verbo: una acción pasada repetida, NO un estado (every summer we would visit my aunt).
• Oraciones negativas y preguntas: didn’t use to, did you use to.
Excepciones:
• Con verbos de estado (be, have, know, live) solo used to: I used to have a dog (no would have).
• Be used to + -ing significa "acostumbrado a": I’m used to getting up early — una construcción diferente.
• Para un único evento pasado: el past simple.`,
        zh: `规则:
• Used to + 动词的基本形式：过去的习惯或状态，不再适用 (we used to live in Spain; he used to be shy)。
• Would + 动词的基本形式：重复的过去动作，而不是状态 (every summer we would visit my aunt)。
• 否定句和疑问句：didn’t use to, did you use to.
例外:
• 仅使用状态动词 (be, have, know, live) used to：I used to have a dog（不是 would have）。
• Be used to + -ing 的意思是“习惯于”：I’m used to getting up early — 不同的结构。
• 对于单个过去的事件 - past simple.`,
        ko: `규칙:
• Used to + 동사 기본형: 더 이상 (we used to live in Spain; he used to be shy)를 적용하지 않는 과거 습관 또는 상태.
• Would + 동사 기본형: 상태 (every summer we would visit my aunt)가 아닌 반복된 과거 동작.
• 부정문 및 질문: didn’t use to, did you use to.
예외:
• 상태 동사 (be, have, know, live)만 사용하여 used to: I used to have a dog(would have 아님)
• Be used to + -ing는 "익숙함"을 의미합니다. I’m used to getting up early — 다른 구조입니다.
• 과거 단일 이벤트의 경우 — past simple.`,
        hi: `नियम:
• Used to + क्रिया का मूल रूप: एक पिछली आदत या स्थिति जो अब (we used to live in Spain; he used to be shy) पर लागू नहीं होती है।
• Would + क्रिया का मूल रूप: दोहराई गई पिछली क्रिया, कोई अवस्था नहीं (every summer we would visit my aunt)।
• नकारात्मक वाक्य और प्रश्न: didn’t use to, did you use to.
अपवाद:
• केवल अवस्था क्रिया (be, have, know, live) के साथ used to: I used to have a dog (would have नहीं)।
• Be used to + -ing का अर्थ है "आदी": I’m used to getting up early - एक अलग निर्माण।
• एक पिछली घटना के लिए - past simple.`,
        ga: `Rialacha:
• Used to + bunfhoirm an bhriathair: nós nó staid san am atá caite nach mbaineann leis an lá inniu a thuilleadh (we used to live in Spain; he used to be shy).
• Would + bunfhoirm an bhriathair: gníomh athfhillteach san am atá caite, NÍ staid (every summer we would visit my aunt).
• Diúltú agus ceisteanna: didn’t use to, did you use to.
Eisceachtaí:
• Le briathra staide (be, have, know, live), ní úsáidtear ach used to: I used to have a dog (seachas would have).
• Ciallaíonn Be used to + -ing «cleachta le»: I’m used to getting up early — struchtúr eile.
• Le heachtra aonair san am atá caite, úsáidtear an past simple.`
    });

    D('modal-verbs', {
        uk: `Правила:
• Can/could, may/might, must, should/ought to, will/would, shall + основа БЕЗ to; без -s у 3-й особі; заперечення просто + not (can’t).
• Can — здатність/дозвіл; could — ввічливо або минуле; may/might — можливість; must — сильний обов’язок/висновок; should — порада.
• Заперечення must not (заборона) ≠ don’t have to (необов’язково).
Винятки:
• Must не має минулого: had to (I had to leave).
• Ought to — з to, на відміну від решти.
• Can’t have + participle — упевнене заперечення про минуле: he can’t have seen it.
• Need і dare можуть бути модальними (needn’t) або звичайними (don’t need to).`,
        en: `Rules:
• Can/could, may/might, must, should/ought to, will/would, shall + base verb WITHOUT to; no -s in the third person; negation just + not (can’t).
• Can — ability/permission; could — polite or past; may/might — possibility; must — strong obligation/deduction; should — advice.
• Must not (prohibition) ≠ don’t have to (not necessary).
Exceptions:
• Must has no past form: had to (I had to leave).
• Ought to takes to, unlike the others.
• Can’t have + participle — a confident negative about the past: he can’t have seen it.
• Need and dare can be modal (needn’t) or ordinary (don’t need to).`,
        fr: `Règles:
• Can/could, may/might, must, should/ought to, will/would, shall + forme de base du verbe SANS to ; pas de -s à la troisième personne ; négation juste + not (can’t).
• Can — capacité/autorisation ; could — poli ou passé ; may/might — possibilité ; must — obligation/déduction forte ; should — conseils.
• Must not (interdiction) ≠ don’t have to (pas nécessaire).
Exceptions:
• Must n'a pas de forme passée : had to (I had to leave).
• Ought to prend to, contrairement aux autres.
• Can’t have + participe — un négatif confiant sur le passé : he can’t have seen it.
• Need et dare peuvent être des (needn’t) modaux ou des (don’t need to) ordinaires.`,
        ru: `Правила:
• Can/could, may/might, must, should/ought to, will/would, shall + базовая форма глагола БЕЗ to; нет -s в третьем лице; отрицание просто + not (can’t).
• Can — возможность/разрешение; could — вежливый или мимолетный; may/might — возможность; must — сильное обязательство/вычет; should — совет.
• Must not (запрет) ≠ don’t have to (не обязательно).
Исключения:
• Must не имеет прошедшей формы: had to (I had to leave).
• Ought to принимает to, в отличие от остальных.
• Can’t have + причастие — уверенное отрицание о прошлом: he can’t have seen it.
• Need и dare могут быть модальными (needn’t) или обычными (don’t need to).`,
        es: `Reglas:
• Can/could, may/might, must, should/ought to, will/would, shall + forma base del verbo SIN to; no -s en tercera persona; negación solo + not (can’t).
• Can — habilidad/permiso; could — educado o pasado; may/might — posibilidad; must — obligación/deducción fuerte; should — consejo.
• Must not (prohibición) ≠ don’t have to (no necesario).
Excepciones:
• Must no tiene forma pasada: had to (I had to leave).
• Ought to toma to, a diferencia de los demás.
• Can’t have + participio — una negativa segura sobre el pasado: he can’t have seen it.
• Need y dare pueden ser (needn’t) modales o (don’t need to) ordinarios.`,
        zh: `规则:
• Can/could, may/might, must, should/ought to, will/would, shall + 没有 to 的动词基本形式；第三人称中没有-s；否定只是 + not (can’t)。
• Can — 能力/权限； could——礼貌或过去； may/might——可能性； must——强义务/扣除； should — 建议。
• Must not（禁止）≠ don’t have to（不必要）。
例外:
• Must 没有过去形式：had to (I had to leave)。
• Ought to 采用 to，与其他不同。
• Can’t have + 分词 — 对过去充满信心的否定：he can’t have seen it.
• Need和dare可以是模态(needn’t)或普通(don’t need to)。`,
        ko: `규칙:
• Can/could, may/might, must, should/ought to, will/would, shall + WITHOUT to 동사의 기본형; 3인칭 -s는 없습니다. 부정은 + not (can’t)입니다.
• Can — 능력/권한; could — 정중함 또는 과거형; may/might — 가능성; must — 강력한 의무/공제; should — 조언.
• Must not(금지) ≠ don’t have to(필요하지 않음).
예외:
• Must에는 과거 형식이 없습니다: had to (I had to leave).
• Ought to는 다른 것과 달리 to를 사용합니다.
• Can’t have + 분사 — 과거에 대한 확신에 찬 부정: he can’t have seen it.
• Need 및 dare는 조동사 (needn’t) 또는 일반 (don’t need to)일 수 있습니다.`,
        hi: `नियम:
• Can/could, may/might, must, should/ought to, will/would, shall + to के बिना क्रिया का मूल रूप; तृतीय पुरुष में कोई -s नहीं; निषेध बस + not (can’t)।
• Can - क्षमता/अनुमति; could - विनम्र या अतीत; may/might - संभावना; must - मजबूत दायित्व/निष्कर्ष; should - सलाह.
• Must not (निषेध) ≠ don’t have to (आवश्यक नहीं)।
अपवाद:
• Must का कोई पिछला रूप नहीं है: had to (I had to leave)।
• Ought to दूसरों के विपरीत, to लेता है।
• Can’t have + कृदंत - अतीत के बारे में एक आश्वस्त नकारात्मक: he can’t have seen it.
• Need और dare भाववाचक सहायक क्रियाएँ (needn’t) या साधारण (don’t need to) हो सकते हैं।`,
        ga: `Rialacha:
• Can/could, may/might, must, should/ought to, will/would, shall + bunfhoirm an bhriathair GAN to; níl -s sa tríú pearsa; le diúltú, cuirtear not leis (can’t).
• Can — cumas/cead; could — cúirtéiseach nó san am atá caite; may/might — féidearthacht; must — dualgas láidir/tátal cinnte; should — comhairle.
• Must not (toirmeasc) ≠ don’t have to (ní gá).
Eisceachtaí:
• Níl foirm chaite ag Must: had to (I had to leave).
• Glacann Ought to to, murab ionann agus na cinn eile.
• Can’t have + rangabháil — tátal diúltach cinnte faoin am atá caite: he can’t have seen it.
• Féadann Need agus dare a bheith módúil (needn’t) nó ina ngnáthbhriathra (don’t need to).`
    });

    D('conditional-zero-first', {
        uk: `Правила:
• Zero: if + present, present — загальні істини (if you heat ice, it melts).
• First: if + present, will + основа — реальна майбутня умова (if it rains, we will stay home).
• Інверсія за відсутності if в письмовій мові: should you need help, call us.
Винятки:
• Після if не вживається will в умовній частині: if it rains (не if it will rain).
• Але if you will (ввічливо, «якщо ви будете ласкаві»): if you will wait here…
• Unless = if … not: unless you hurry, you will be late.
• Замість will можуть бути модальні: if you ask, he may help.`,
        en: `Rules:
• Zero: if + present, present — general truths (if you heat ice, it melts).
• First: if + present, will + base verb — a real future condition (if it rains, we will stay home).
• Inversion without if in formal writing: should you need help, call us.
Exceptions:
• No will in the if-clause: if it rains (not if it will rain).
• But if you will (polite, "if you are willing"): if you will wait here…
• Unless = if … not: unless you hurry, you will be late.
• Modals can replace will: if you ask, he may help.`,
        fr: `Règles:
• Zero : if + present, present — vérités générales (if you heat ice, it melts).
• First : if + present, will + forme de base du verbe — une condition future réelle (if it rains, we will stay home).
• Inversion sans if en écriture formelle : should you need help, call us.
Exceptions:
• Pas de will dans la proposition if : if it rains (pas if it will rain).
• Mais if you will (poli, "si vous le souhaitez") : if you will wait here…
• Unless = if … not : unless you hurry, you will be late.
• Les modaux peuvent remplacer will : if you ask, he may help.`,
        ru: `Правила:
• Zero: if + present, present — общие истины (if you heat ice, it melts).
• First: if + present, will + базовая форма глагола — реальное будущее состояние (if it rains, we will stay home).
• Инверсия без if в формальном письме: should you need help, call us.
Исключения:
• Нет will в предложении if: if it rains (не if it will rain).
• Но if you will (вежливо, «если хотите»): if you will wait here…
• Unless = if … not: unless you hurry, you will be late.
• Модалы могут заменять will: if you ask, he may help.`,
        es: `Reglas:
• Zero: if + present, present — verdades generales (if you heat ice, it melts).
• First: if + present, will + forma base del verbo: una condición futura real (if it rains, we will stay home).
• Inversión sin if en escritura formal: should you need help, call us.
Excepciones:
• No hay will en la cláusula if: if it rains (no if it will rain).
• Pero if you will (educado, "si estás dispuesto"): if you will wait here…
• Unless = if … not: unless you hurry, you will be late.
• Los modales pueden reemplazar a will: if you ask, he may help.`,
        zh: `规则:
• Zero：if + present, present — 一般事实 (if you heat ice, it melts)。
• First：if + present, will + 动词的基本形式 - 真实的将来条件 (if it rains, we will stay home)。
• 正式写作中没有 if 的反转：should you need help, call us.
例外:
• if 子句中没有 will：if it rains（不是 if it will rain）。
• 但是if you will（礼貌，“如果你愿意的话”）：if you will wait here…
• Unless = if … not：unless you hurry, you will be late.
• 模态框可以替换 will：if you ask, he may help.`,
        ko: `규칙:
• Zero: if + present, present — 일반적인 진실 (if you heat ice, it melts).
• First: if + present, will + 동사 기본형 — 실제 미래 조건 (if it rains, we will stay home).
• 정식 쓰기에서 if가 없는 반전: should you need help, call us.
예외:
• if 절에 will가 없습니다: if it rains(if it will rain 아님)
• 그러나 if you will(정중하게, "원한다면"): if you will wait here…
• Unless = if … not: unless you hurry, you will be late.
• 조동사은 will: if you ask, he may help.를 대체할 수 있습니다`,
        hi: `नियम:
• Zero: if + present, present - सामान्य सत्य (if you heat ice, it melts)।
• First: if + present, will + क्रिया का मूल रूप - एक वास्तविक भविष्य की स्थिति (if it rains, we will stay home)।
• औपचारिक लेखन में if के बिना उलटा: should you need help, call us.
अपवाद:
• यदि-खंड में कोई will नहीं है: if it rains (if it will rain नहीं)।
• लेकिन if you will (विनम्र, "यदि आप चाहें"): if you will wait here...
• Unless = if … not: unless you hurry, you will be late.
• भाववाचक सहायक क्रियाएँ will: if you ask, he may help. की जगह ले सकते हैं`,
        ga: `Rialacha:
• Zero: if + present, present — fírinní ginearálta (if you heat ice, it melts).
• First: if + present, will + bunfhoirm an bhriathair — coinníoll réadúil sa todhchaí (if it rains, we will stay home).
• Inbhéartú gan if sa scríbhneoireacht fhoirmiúil: should you need help, call us.
Eisceachtaí:
• Ní úsáidtear will sa chlásal if: if it rains (seachas if it will rain).
• Ach if you will (cúirtéiseach, «má tá tú sásta»): if you will wait here…
• Unless = if … not: unless you hurry, you will be late.
• Féadann briathra módúla teacht in áit will: if you ask, he may help.`
    });

    D('conditional-second', {
        uk: `Правила:
• If + past simple, would + основа: if I had a car, I would drive.
• Нереальна або малоймовірна ситуація зараз/в майбутньому; поради: if I were you, I would apologise.
• Може бути could/might замість would.
Винятки:
• Be: were для всіх осіб (if I were rich; формально) — розмовно was.
• Would не ставиться в умовній частині: if I had (не if I would have).
• Інверсія: were I you, I would…
• Mixed: if I had studied (минуле), I would be a doctor now.`,
        en: `Rules:
• If + past simple, would + base verb: if I had a car, I would drive.
• An unreal or unlikely present/future situation; advice: if I were you, I would apologise.
• Could/might can replace would.
Exceptions:
• Be: were for all persons (if I were rich; formal) — informally was.
• No would in the if-clause: if I had (not if I would have).
• Inversion: were I you, I would…
• Mixed: if I had studied (past), I would be a doctor now.`,
        fr: `Règles:
• If + past simple, would + forme base du verbe : if I had a car, I would drive.
• Une situation présente/future irréelle ou improbable ; conseil : if I were you, I would apologise.
• Could/might peut remplacer would.
Exceptions:
• Be : were pour toutes les personnes (if I were rich ; formel) – de manière informelle was.
• Pas de would dans la proposition if : if I had (pas if I would have).
• Inversion : were I you, I would…
• Mixte : if I had studied (passé), I would be a doctor now.`,
        ru: `Правила:
• If + past simple, would + основная форма глагола: if I had a car, I would drive.
• Нереальная или маловероятная ситуация настоящего/будущего; совет: if I were you, I would apologise.
• Could/might может заменить would.
Исключения:
• Be: were для всех лиц (if I were rich; формально) — неофициально was.
• Нет would в предложении if: if I had (не if I would have).
• Инверсия: were I you, I would…
• Смешанный: if I had studied (прошлый), I would be a doctor now.`,
        es: `Reglas:
• If + past simple, would + forma base del verbo: if I had a car, I would drive.
• Una situación presente/futura irreal o improbable; consejo: if I were you, I would apologise.
• Could/might puede reemplazar a would.
Excepciones:
• Be: were para todas las personas (if I were rich; formal) — informalmente was.
• No hay would en la cláusula if: if I had (no if I would have).
• Inversión: were I you, I would…
• Mixto: if I had studied (pasado), I would be a doctor now.`,
        zh: `规则:
• If + past simple, would + 动词的基本形式：if I had a car, I would drive.
• 不真实或不可能的当前/未来情况；建议：if I were you, I would apologise.
• Could/might 可以替代 would.
例外:
• Be：were 适用于所有人（if I were rich；正式）- 非正式 was.
• if 子句中没有 would：if I had（不是 if I would have）。
• 反转：were I you, I would…
• 混合：if I had studied（过去）、I would be a doctor now.`,
        ko: `규칙:
• If + past simple, would + 동사 기본형: if I had a car, I would drive.
• 비현실적이거나 가능성이 희박한 현재/미래 상황, 조언: if I were you, I would apologise.
• Could/might는 would.를 대체할 수 있습니다
예외:
• Be: 모든 사람을 위한 were (if I were rich; 공식) — 비공식적으로 was.
• if 절에 would가 없습니다: if I had(if I would have 아님)
• 반전: were I you, I would…
• 혼합: if I had studied(과거), I would be a doctor now.`,
        hi: `नियम:
• If + past simple, would + क्रिया का मूल रूप: if I had a car, I would drive.
• एक अवास्तविक या असंभावित वर्तमान/भविष्य की स्थिति; सलाह: if I were you, I would apologise.
• Could/might, would. की जगह ले सकता है
अपवाद:
• Be: सभी पुरुषों के लिए were (if I were rich; औपचारिक) - अनौपचारिक रूप से was.
• यदि-खंड में कोई would नहीं है: if I had (if I would have नहीं)।
• उलटा: were I you, I would…
• मिश्रित: if I had studied (अतीत), I would be a doctor now.`,
        ga: `Rialacha:
• If + past simple, would + bunfhoirm an bhriathair: if I had a car, I would drive.
• Staid neamhréadúil nó neamhdhóchúil san am i láthair nó sa todhchaí; comhairle: if I were you, I would apologise.
• Féadann Could/might teacht in áit would.
Eisceachtaí:
• Be: were do gach pearsa (if I were rich; foirmiúil); go neamhfhoirmiúil, was.
• Ní úsáidtear would sa chlásal if: if I had (seachas if I would have).
• Inbhéartú: were I you, I would…
• Measctha: if I had studied (san am atá caite), I would be a doctor now.`
    });

    D('conditional-third', {
        uk: `Правила:
• If + past perfect, would have + past participle: if she had studied, she would have passed.
• Нездійснена умова в минулому й її уявний наслідок; жаль і докір.
• Could have/might have замість would have.
Винятки:
• Не вживають would have в if-частині: if I had known (не if I would have known).
• Інверсія: had I known, I would have come.
• Mixed conditional: if I had taken the job, I would be rich now.`,
        en: `Rules:
• If + past perfect, would have + past participle: if she had studied, she would have passed.
• An unfulfilled past condition and its imagined result; regret and reproach.
• Could have/might have instead of would have.
Exceptions:
• No would have in the if-clause: if I had known (not if I would have known).
• Inversion: had I known, I would have come.
• Mixed conditional: if I had taken the job, I would be rich now.`,
        fr: `Règles:
• If + past perfect, would have + participe passé : if she had studied, she would have passed.
• Une condition passée non remplie et son résultat imaginé ; regret et reproche.
• Could have/might have au lieu de would have.
Exceptions:
• Pas de would have dans la proposition if : if I had known (pas if I would have known).
• Inversion : had I known, I would have come.
• Conditionnel mixte : if I had taken the job, I would be rich now.`,
        ru: `Правила:
• If + past perfect, would have + причастие прошедшего времени: if she had studied, she would have passed.
• Невыполненное прошлое условие и его воображаемый результат; сожаление и упрек.
• Could have/might have вместо would have.
Исключения:
• Нет would have в предложении if: if I had known (не if I would have known).
• Инверсия: had I known, I would have come.
• Смешанное условие: if I had taken the job, I would be rich now.`,
        es: `Reglas:
• If + past perfect, would have + participio pasado: if she had studied, she would have passed.
• Una condición pasada incumplida y su resultado imaginado; arrepentimiento y reproche.
• Could have/might have en lugar de would have.
Excepciones:
• No hay would have en la cláusula if: if I had known (no if I would have known).
• Inversión: had I known, I would have come.
• Condicional mixto: if I had taken the job, I would be rich now.`,
        zh: `规则:
• If + past perfect, would have + 过去分词：if she had studied, she would have passed.
• 过去未实现的条件及其想象的结果；遗憾和责备。
• Could have/might have 而不是 would have.
例外:
• if 子句中没有 would have：if I had known（不是 if I would have known）。
• 反转：had I known, I would have come.
• 混合条件：if I had taken the job, I would be rich now.`,
        ko: `규칙:
• If + past perfect, would have + 과거분사: if she had studied, she would have passed.
• 성취되지 않은 과거 조건과 그에 따른 상상의 결과; 후회하고 비난합니다.
• would have. 대신 Could have/might have
예외:
• if 절에 would have가 없습니다: if I had known(if I would have known 아님)
• 반전: had I known, I would have come.
• 혼합 조건부: if I had taken the job, I would be rich now.`,
        hi: `नियम:
• If + past perfect, would have + भूतकालिक कृदंत: if she had studied, she would have passed.
• एक अधूरी अतीत की स्थिति और उसका कल्पित परिणाम; पछतावा और तिरस्कार.
• would have. के बजाय Could have/might have
अपवाद:
• यदि-खंड में कोई would have नहीं है: if I had known (if I would have known नहीं)।
• उलटा: had I known, I would have come.
• मिश्रित सशर्त: if I had taken the job, I would be rich now.`,
        ga: `Rialacha:
• If + past perfect, would have + rangabháil chaite: if she had studied, she would have passed.
• Coinníoll nár comhlíonadh san am atá caite agus an toradh samhlaithe; aiféala agus cáineadh.
• Could have/might have in áit would have.
Eisceachtaí:
• Ní úsáidtear would have sa chlásal if: if I had known (seachas if I would have known).
• Inbhéartú: had I known, I would have come.
• Coinníollach measctha: if I had taken the job, I would be rich now.`
    });

    D('wishes', {
        uk: `Правила:
• Wish/if only + past simple — бажання щодо теперішнього: I wish I were taller; if only I knew.
• Wish/if only + past perfect — жаль про минуле: I wish I had gone; if only I hadn’t said that.
• Wish + would — докір, роздратування (I wish he would stop).
Винятки:
• Be: were для всіх осіб у формальному стилі: I wish I were there.
• Wish + would не вживається, коли підмети однакові: не I wish I would…
• Could замість would для здатності: I wish I could fly.`,
        en: `Rules:
• Wish/if only + past simple — a wish about the present: I wish I were taller; if only I knew.
• Wish/if only + past perfect — regret about the past: I wish I had gone; if only I hadn’t said that.
• Wish + would — complaint, annoyance (I wish he would stop).
Exceptions:
• Be: were for all persons in formal style: I wish I were there.
• Wish + would is not used when the subject is the same: not I wish I would…
• Could instead of would for ability: I wish I could fly.`,
        fr: `Règles:
• Wish/if only + past simple — un souhait à propos du présent : I wish I were taller; if only I knew.
• Wish/if only + past perfect — regret du passé : I wish I had gone; if only I hadn’t said that.
• Wish + would — plainte, désagrément (I wish he would stop).
Exceptions:
• Be : were pour toutes les personnes en style formel : I wish I were there.
• Wish + would n'est pas utilisé lorsque le sujet est le même : pas I wish I would…
• Could au lieu de would pour la capacité : I wish I could fly.`,
        ru: `Правила:
• Wish/if only + past simple — пожелание о настоящем: I wish I were taller; if only I knew.
• Wish/if only + past perfect — сожаление о прошлом: I wish I had gone; if only I hadn’t said that.
• Wish + would — жалоба, раздражение (I wish he would stop).
Исключения:
• Be: were для всех людей, придерживающихся формального стиля: I wish I were there.
• Wish + would не используется, если тема та же: не I wish I would…
• Could вместо would для способности: I wish I could fly.`,
        es: `Reglas:
• Wish/if only + past simple — un deseo sobre el presente: I wish I were taller; if only I knew.
• Wish/if only + past perfect — arrepentimiento por el pasado: I wish I had gone; if only I hadn’t said that.
• Wish + would — queja, molestia (I wish he would stop).
Excepciones:
• Be: were para todas las personas con estilo formal: I wish I were there.
• Wish + would no se utiliza cuando el sujeto es el mismo: no I wish I would…
• Could en lugar de would para habilidad: I wish I could fly.`,
        zh: `规则:
• Wish/if only + past simple — 关于礼物的愿望：I wish I were taller; if only I knew.
• Wish/if only + past perfect — 对过去感到遗憾：I wish I had gone; if only I hadn’t said that.
• Wish + would — 投诉、烦恼 (I wish he would stop)。
例外:
• Be：were 适用于所有正式风格人士：I wish I were there.
• 当主语相同时不使用Wish + would：不是I wish I would...
• Could 而不是 would 的能力：I wish I could fly.`,
        ko: `규칙:
• Wish/if only + past simple — 현재에 대한 소망: I wish I were taller; if only I knew.
• Wish/if only + past perfect — 과거에 대한 후회: I wish I had gone; if only I hadn’t said that.
• Wish + would — 불만, 짜증 (I wish he would stop).
예외:
• Be: were 정장 스타일의 모든 사람: I wish I were there.
• 주어가 동일한 경우에는 Wish + would를 사용하지 않습니다: I wish I would가 아닙니다...
• would 대신 Could 능력: I wish I could fly.`,
        hi: `नियम:
• Wish/if only + past simple - वर्तमान के बारे में एक इच्छा: I wish I were taller; if only I knew.
• Wish/if only + past perfect - अतीत के बारे में पछतावा: I wish I had gone; if only I hadn’t said that.
• Wish + would - शिकायत, झुंझलाहट (I wish he would stop)।
अपवाद:
• Be: were औपचारिक शैली में सभी पुरुषों के लिए: I wish I were there.
• कर्ता समान होने पर Wish + would का उपयोग नहीं किया जाता है: I wish I would नहीं...
• क्षमता के लिए would के बजाय Could: I wish I could fly.`,
        ga: `Rialacha:
• Wish/if only + past simple — mian faoin am i láthair: I wish I were taller; if only I knew.
• Wish/if only + past perfect — aiféala faoin am atá caite: I wish I had gone; if only I hadn’t said that.
• Wish + would — gearán, crá (I wish he would stop).
Eisceachtaí:
• Be: were do gach pearsa sa stíl fhoirmiúil: I wish I were there.
• Ní úsáidtear Wish + would nuair is ionann an t-ainmní; ní deirtear I wish I would…
• Could in áit would le haghaidh cumais: I wish I could fly.`
    });

    D('subjunctive', {
        uk: `Правила:
• Після suggest, recommend, insist, demand, propose, require: that + підмет + ОСНОВА (I suggest that he go; it is vital that she be present).
• If I were…, as if he were… (формально).
• Імператив: основа без підмета: Close the door. Заперечення: Don’t + дієслово. Let’s — пропозиція (let’s go).
Винятки:
• У розмовній (особливо брит.) англійській часто should: I suggest that he should go.
• Subjunctive не змінює 3-ю особу: he go, а не goes.
• Імператив з you для емфази: You be quiet!`,
        en: `Rules:
• After suggest, recommend, insist, demand, propose, require: that + subject + BASE form (I suggest that he go; it is vital that she be present).
• If I were…, as if he were… (formal).
• Imperative: base verb without subject: Close the door. Negative: Don’t + verb. Let’s — a suggestion (let’s go).
Exceptions:
• In spoken (especially British) English should is common: I suggest that he should go.
• The subjunctive does not inflect in the third person: he go, not goes.
• Imperative with you for emphasis: You be quiet!`,
        fr: `Règles:
• Après suggest, recommend, insist, demand, propose, require : that + sujet + formulaire BASE (I suggest that he go; it is vital that she be present).
• If I were…, as if he were… (formel).
• Impératif : forme de base du verbe sans sujet : Close the door. Négatif : Don’t + verbe. Let’s — une suggestion (let’s go).
Exceptions:
• En anglais parlé (en particulier britannique), should est courant : I suggest that he should go.
• Le mode du subjonctif ne s'infléchit pas à la troisième personne : he go, pas goes.
• Impératif avec you pour accentuer : You be quiet!`,
        ru: `Правила:
• После suggest, recommend, insist, demand, propose, require: that + тема + БАЗОВАЯ форма (I suggest that he go; it is vital that she be present).
• If I were…, as if he were… (официально).
• Императив: базовая форма глагола без подлежащего: Close the door. Отрицательный: Don’t + глагол. Let’s — предложение (let’s go).
Исключения:
• В разговорном (особенно британском) английском языке should часто встречается: I suggest that he should go.
• Сослагательное наклонение не изменяется в третьем лице: he go, а не goes.
• Императив с you для акцента: You be quiet!`,
        es: `Reglas:
• Después de suggest, recommend, insist, demand, propose, require: that + asunto + formulario BASE (I suggest that he go; it is vital that she be present).
• If I were…, as if he were… (formal).
• Imperativo: forma base del verbo sin sujeto: Close the door. Negativo: Don’t + verbo. Let’s — una sugerencia (let’s go).
Excepciones:
• En inglés hablado (especialmente británico), should es común: I suggest that he should go.
• El modo subjuntivo no se flexiona en tercera persona: he go, no goes.
• Imperativo con you para énfasis: You be quiet!`,
        zh: `规则:
• suggest, recommend, insist, demand, propose, require 之后：that + 主题 + 基本形式 (I suggest that he go; it is vital that she be present)。
• If I were…, as if he were…（正式）。
• 祈使句：不带主语的动词基本形式：Close the door. 否定句：Don’t + 动词。 Let’s — 建议 (let’s go)。
例外:
• 在英语口语（尤其是英式英语）中，should 很常见：I suggest that he should go.
• 虚拟式在第三人称中不变形：he go，而不是 goes.
• 命令式 you 表示强调：You be quiet!`,
        ko: `규칙:
• suggest, recommend, insist, demand, propose, require 이후: that + 주어 + BASE 형식 (I suggest that he go; it is vital that she be present).
• If I were…, as if he were… (공식).
• 명령형: 주어가 없는 동사의 기본형: Close the door. 부정형: Don’t + 동사. Let’s — (let’s go) 제안.
예외:
• 구어(특히 영국) 영어에서는 should가 일반적입니다: I suggest that he should go.
• 가정법은 3인칭에 영향을 주지 않습니다: goes.가 아니라 he go
• 강조를 위한 you 명령형: You be quiet!`,
        hi: `नियम:
• suggest, recommend, insist, demand, propose, require के बाद: that + कर्ता + मूल रूप (I suggest that he go; it is vital that she be present)।
• If I were…, as if he were… (औपचारिक).
• आज्ञार्थक: कर्ता के बिना क्रिया का मूल रूप: Close the door. नकारात्मक: Don’t + क्रिया। Let’s - एक सुझाव (let’s go)।
अपवाद:
• बोली जाने वाली (विशेष रूप से ब्रिटिश) अंग्रेजी में should आम है: I suggest that he should go.
• विधिलिंग तृतीय पुरुष में विभक्त नहीं होती: he go, goes. नहीं
• जोर देने के लिए you की आज्ञार्थकता: You be quiet!`,
        ga: `Rialacha:
• Tar éis suggest, recommend, insist, demand, propose, require: that + ainmní + BUNFHOIRM an bhriathair (I suggest that he go; it is vital that she be present).
• If I were…, as if he were… (foirmiúil).
• Modh ordaitheach: bunfhoirm an bhriathair gan ainmní: Close the door. Diúltach: Don’t + briathar. Let’s — moladh (let’s go).
Eisceachtaí:
• Sa Bhéarla labhartha, go háirithe Béarla na Breataine, tá should coitianta: I suggest that he should go.
• Ní athraíonn an foshuiteach sa tríú pearsa: he go, seachas goes.
• Modh ordaitheach le you chun béim a chur air: You be quiet!`
    });

    D('infinitive-gerund', {
        uk: `Правила:
• To-інфінітив: want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave).
• -ing: enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming).
• Після прийменників — тільки -ing: interested in learning, before leaving.
• Gerund як підмет: swimming is fun.
Винятки:
• Обидва з різним значенням: remember/forget/stop/try — I stopped smoking (кинув) / I stopped to smoke (зупинився, щоб закурити); remember to lock (не забути) / remember locking (пам’ятати, що зробив).
• Обидва з тим самим значенням: like, love, hate, prefer, begin, start (like to swim / like swimming).
• Інфінітив без to після модальних, let, make (he made me laugh).`,
        en: `Rules:
• To-infinitive: want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave).
• -ing: enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming).
• After prepositions only -ing: interested in learning, before leaving.
• Gerund as a subject: swimming is fun.
Exceptions:
• Both with different meanings: remember/forget/stop/try — I stopped smoking (quit) / I stopped to smoke (paused in order to smoke); remember to lock (not forget) / remember locking (recall doing).
• Both with the same meaning: like, love, hate, prefer, begin, start (like to swim / like swimming).
• Bare infinitive after modals, let, make (he made me laugh).`,
        fr: `Règles:
• Infinitif avec to : want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave).
• -ing : enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming).
• Après une préposition, on emploie uniquement la forme en -ing : interested in learning, before leaving.
• Gérondif comme sujet : swimming is fun.
Exceptions:
• Les deux constructions ont des sens différents : remember/forget/stop/try — I stopped smoking (j’ai cessé de fumer) / I stopped to smoke (je me suis arrêté pour fumer) ; remember to lock (ne pas oublier de fermer à clé) / remember locking (se souvenir de l’avoir fait).
• Les deux ayant la même signification : like, love, hate, prefer, begin, start (like to swim / like swimming).
• Infinitif sans to après les verbes modaux, let et make (he made me laugh).`,
        ru: `Правила:
• Инфинитив с to: want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave).
• -ing: enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming).
• После предлогов используется только форма на -ing: interested in learning, before leaving.
• Герундий как подлежащее: swimming is fun.
Исключения:
• Обе конструкции с разным значением: remember/forget/stop/try — I stopped smoking (бросил курить) / I stopped to smoke (остановился, чтобы покурить); remember to lock (не забыть запереть) / remember locking (помнить, что запирал).
• Оба имеют одинаковое значение: like, love, hate, prefer, begin, start (like to swim / like swimming).
• Инфинитив без to после модальных глаголов, let, make (he made me laugh).`,
        es: `Reglas:
• Infinitivo con to: want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave).
• -ing: enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming).
• Después de una preposición se usa únicamente la forma en -ing: interested in learning, before leaving.
• Gerundio como sujeto: swimming is fun.
Excepciones:
• Ambas construcciones con significados distintos: remember/forget/stop/try — I stopped smoking (dejé de fumar) / I stopped to smoke (me detuve para fumar); remember to lock (no olvidar cerrar con llave) / remember locking (recordar haberlo hecho).
• Ambos con el mismo significado: like, love, hate, prefer, begin, start (like to swim / like swimming).
• Infinitivo sin to después de los verbos modales, let y make (he made me laugh).`,
        zh: `规则:
• 带 to 的不定式：want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave)。
• -ing：enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming)。
• 介词后只能用 -ing 形式：interested in learning, before leaving。
• 动名词作为主语：swimming is fun.
例外:
• 两种结构含义不同：remember/forget/stop/try — I stopped smoking（戒烟）/ I stopped to smoke（停下来抽烟）；remember to lock（记得去锁门）/ remember locking（记得锁过门）。
• 两者含义相同：like, love, hate, prefer, begin, start (like to swim / like swimming)。
• 情态动词以及 let、make 后用不带 to 的不定式 (he made me laugh)。`,
        ko: `규칙:
• to부정사: want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave).
• -ing: enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming).
• 전치사 뒤에서는 -ing형만 사용합니다: interested in learning, before leaving.
• 주어로서의 동명사: swimming is fun.
예외:
• 두 구조는 뜻이 다릅니다: remember/forget/stop/try — I stopped smoking (담배를 끊었다) / I stopped to smoke (담배를 피우려고 멈췄다); remember to lock (잠그는 것을 잊지 않다) / remember locking (잠갔던 일을 기억하다).
• 둘 다 같은 의미: like, love, hate, prefer, begin, start (like to swim / like swimming).
• 조동사와 let, make 뒤에는 to 없는 원형부정사를 씁니다 (he made me laugh).`,
        hi: `नियम:
• to के साथ क्रिया का मूल रूप: want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave)।
• -ing रूप: enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming)।
• संबंधसूचक अव्यय के बाद केवल -ing रूप आता है: interested in learning, before leaving।
• कर्ता के रूप में क्रियावाचक संज्ञा: swimming is fun.
अपवाद:
• दोनों संरचनाओं के अर्थ अलग हैं: remember/forget/stop/try — I stopped smoking (धूम्रपान छोड़ दिया) / I stopped to smoke (धूम्रपान करने के लिए रुका); remember to lock (ताला लगाना न भूलना) / remember locking (ताला लगाने की बात याद होना)।
• दोनों का अर्थ समान: like, love, hate, prefer, begin, start (like to swim / like swimming)।
• भाववाचक सहायक क्रियाओं, let और make के बाद to के बिना क्रिया का मूल रूप आता है (he made me laugh)।`,
        ga: `Rialacha:
• Infinideach le to: want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave).
• -ing: enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming).
• Tar éis réamhfhocail, ní úsáidtear ach an fhoirm -ing: interested in learning, before leaving.
• Ainm briathartha mar ainmní: swimming is fun.
Eisceachtaí:
• Tá bríonna éagsúla leis an dá struchtúr: remember/forget/stop/try — I stopped smoking (d’éirigh mé as caitheamh tobac) / I stopped to smoke (stad mé chun tobac a chaitheamh); remember to lock (gan dearmad a dhéanamh ar ghlasáil) / remember locking (cuimhneamh gur ghlasáil mé).
• An bhrí chéanna leis an dá fhoirm: like, love, hate, prefer, begin, start (like to swim / like swimming).
• Infinideach gan to tar éis briathra módúla, let agus make (he made me laugh).`
    });

    D('passive-voice', {
        uk: `Правила:
• Be (у потрібному часі) + past participle: is written, was broken, has been done, will be sent, is being built.
• Виконавець — by (за потреби): written by Tom.
• Вживається, коли виконавець невідомий, неважливий або очевидний.
Винятки:
• Лише перехідні дієслова мають passive (не можна: it was happened).
• З двома додатками можна утворити два passive: I was given a book / a book was given to me.
• Модальні: must be done, can be seen. Інфінітив: to be done.
• Get-passive (розм.): he got fired.
• Stative passive (the door is closed) описує стан.`,
        en: `Rules:
• Be (in the needed tense) + past participle: is written, was broken, has been done, will be sent, is being built.
• Agent with by (if needed): written by Tom.
• Used when the doer is unknown, unimportant or obvious.
Exceptions:
• Only transitive verbs have a passive (not: it was happened).
• With two objects two passives are possible: I was given a book / a book was given to me.
• Modals: must be done, can be seen. Infinitive: to be done.
• Get-passive (informal): he got fired.
• The stative passive (the door is closed) describes a state.`,
        fr: `Règles:
• Be (au temps nécessaire) + participe passé : is written, was broken, has been done, will be sent, is being built.
• Agent avec by (si nécessaire) : written by Tom.
• Utilisé lorsque l'auteur est inconnu, sans importance ou évident.
Exceptions:
• Seuls les verbes transitifs ont un passif (pas : it was happened).
• Avec deux objets deux passifs sont possibles : I was given a book / a book was given to me.
• Modaux : must be done, can be seen. Infinitif : to be done.
• Obtenez-passif (informel) : he got fired.
• Le passif statif (the door is closed) décrit un état.
Conjugaison (personne, nombre):
| Temps | be + participe passé (singulier / pluriel) |
| Présent | the letter is written / the letters are written |
| Passé | the letter was written / the letters were written |
| Present perfect | the letter has been written / the letters have been written |
| Futur | the letter will be written / the letters will be written |`,
        ru: `Правила:
• Be (в нужном времени) + причастие прошедшего времени: is written, was broken, has been done, will be sent, is being built.
• Агент с by (при необходимости): written by Tom.
• Используется, когда исполнитель неизвестен, неважен или очевиден.
Исключения:
• Только переходные глаголы имеют пассив (не: it was happened).
• При двух объектах возможны два пассива: I was given a book / a book was given to me.
• Модальные глаголы: must be done, can be seen. Инфинитив: to be done.
• Пассивный (неформальный): he got fired.
• Статический пассив (the door is closed) описывает состояние.
Спряжение (лицо, число):
| Время | be + причастие прошедшего времени (ед. ч. / мн. ч.) |
| Настоящее время | the letter is written / the letters are written |
| Прошедшее время | the letter was written / the letters were written |
| Настоящее совершённое время | the letter has been written / the letters have been written |
| Будущее время | the letter will be written / the letters will be written |`,
        es: `Reglas:
• Be (en el tiempo necesario) + participio pasado: is written, was broken, has been done, will be sent, is being built.
• Agente con by (si es necesario): written by Tom.
• Se utiliza cuando el autor es desconocido, sin importancia o obvio.
Excepciones:
• Solo los verbos transitivos tienen pasiva (no: it was happened).
• Con dos objetos son posibles dos pasivas: I was given a book / a book was given to me.
• Modales: must be done, can be seen. Infinitivo: to be done.
• Ponte pasivo (informal): he got fired.
• El pasivo estativo (the door is closed) describe un estado.
Conjugación (persona, número):
| Tiempo | be + participio pasado (singular / plural) |
| Presente | the letter is written / the letters are written |
| Pasado | the letter was written / the letters were written |
| Pretérito perfecto compuesto | the letter has been written / the letters have been written |
| Futuro | the letter will be written / the letters will be written |`,
        zh: `规则:
• Be（所需时态）+过去分词：is written, was broken, has been done, will be sent, is being built.
• by 代理（如果需要）：written by Tom.
• 当行为者未知、不重要或明显时使用。
例外:
• 只有及物动词才有被动语态（不是：it was happened）。
• 对于两个对象，可以有两个被动：I was given a book / a book was given to me.
• 情态动词：must be done, can be seen. 不定式：to be done.
• 获取被动（非正式）：he got fired.
• 静态被动 (the door is closed) 描述一种状态。
变位（人称、数）:
| 时态 | be + 过去分词（单数 / 复数） |
| 现在时 | the letter is written / the letters are written |
| 过去时 | the letter was written / the letters were written |
| 现在完成时 | the letter has been written / the letters have been written |
| 将来时 | the letter will be written / the letters will be written |`,
        ko: `규칙:
• Be(필요 시제) + 과거 분사: is written, was broken, has been done, will be sent, is being built.
• by를 사용하는 에이전트(필요한 경우): written by Tom.
• 행위자가 알려지지 않았거나 중요하지 않거나 명백할 때 사용됩니다.
예외:
• 타동사에만 수동태가 있습니다(it was happened 아님).
• 두 개의 객체에는 두 개의 패시브가 가능합니다: I was given a book / a book was given to me.
• 조동사: must be done, can be seen. 부정사: to be done.
• Get-passive(비공식): he got fired.
• 정적 수동형 (the door is closed)는 상태를 설명합니다.
활용(인칭, 수):
| 시제 | be + 과거분사 (단수 / 복수) |
| 현재 | the letter is written / the letters are written |
| 과거 | the letter was written / the letters were written |
| 현재완료 | the letter has been written / the letters have been written |
| 미래 | the letter will be written / the letters will be written |`,
        hi: `नियम:
• Be (आवश्यक काल में) + भूतकालिक कृदंत: is written, was broken, has been done, will be sent, is being built.
• आवश्यक होने पर कर्ता को by से दर्शाते हैं: written by Tom.
• जब कार्य करने वाला अज्ञात, गौण या स्पष्ट हो, तब प्रयोग होता है।
अपवाद:
• केवल सकर्मक क्रियाओं का कर्मवाच्य बनता है (it was happened नहीं)।
• दो कर्म होने पर दो कर्मवाच्य रूप संभव हैं: I was given a book / a book was given to me.
• भाववाचक सहायक क्रियाएँ: must be done, can be seen. अनंत रूप: to be done.
• Get से बना कर्मवाच्य (अनौपचारिक): he got fired.
• स्थितिसूचक कर्मवाच्य (the door is closed) किसी अवस्था को दर्शाता है।
क्रिया-रूप (पुरुष, वचन):
| काल | be + भूतकालिक कृदंत (एकवचन / बहुवचन) |
| वर्तमान काल | the letter is written / the letters are written |
| भूतकाल | the letter was written / the letters were written |
| पूर्ण वर्तमान काल | the letter has been written / the letters have been written |
| भविष्य काल | the letter will be written / the letters will be written |`,
        ga: `Rialacha:
• Be (san aimsir chuí) + rangabháil chaite: is written, was broken, has been done, will be sent, is being built.
• An gníomhaí le by, más gá: written by Tom.
• Nuair atá an gníomhaí anaithnid, neamhthábhachtach nó soiléir.
Eisceachtaí:
• Ní bhíonn foirm fhulangach ach ag briathra aistreacha (ní deirtear it was happened).
• Le dhá chuspóir, is féidir dhá fhoirm fhulangacha: I was given a book / a book was given to me.
• Briathra módúla: must be done, can be seen. Infinideach: to be done.
• Foirm fhulangach le Get (neamhfhoirmiúil): he got fired.
• Déanann an fhoirm fhulangach statach (the door is closed) cur síos ar staid.
Réimniú (pearsa, uimhir):
| Aimsir | be + rangabháil chaite (uatha / iolra) |
| Aimsir láithreach | the letter is written / the letters are written |
| Aimsir chaite | the letter was written / the letters were written |
| Aimsir láithreach fhoirfe | the letter has been written / the letters have been written |
| Aimsir fháistineach | the letter will be written / the letters will be written |`
    });

    D('causative', {
        uk: `Правила:
• Have + об’єкт + past participle — дію виконує хтось інший для нас: I had my hair cut; she is having the car repaired.
• Get + об’єкт + participle — розмовніше: I need to get my phone fixed.
• Для негативного досвіду: he had his wallet stolen.
Винятки:
• Have + person + base verb (без to) — «змусити/попросити»: I had the mechanic check the car.
• Get + person + to-інфінітив: I got him to help me.
• Не плутати з простим have: I have my hair cut (звичка) — залежить від контексту.`,
        en: `Rules:
• Have + object + past participle — someone else does the action for us: I had my hair cut; she is having the car repaired.
• Get + object + participle — more informal: I need to get my phone fixed.
• For a negative experience: he had his wallet stolen.
Exceptions:
• Have + person + base verb (no to) — "to get someone to": I had the mechanic check the car.
• Get + person + to-infinitive: I got him to help me.
• Not to be confused with plain have: I have my hair cut (habit) — depends on context.`,
        fr: `Règles:
• Have + objet + participe passé — quelqu'un d'autre fait l'action à notre place : I had my hair cut; she is having the car repaired.
• Get + objet + participe — plus informel : I need to get my phone fixed.
• Pour une expérience négative : he had his wallet stolen.
Exceptions:
• Verbe Have + person + base (non à) — "pour trouver quelqu'un to" : I had the mechanic check the car.
• Get + person + à-infinitif : I got him to help me.
• À ne pas confondre avec le simple have : I have my hair cut (habitude) — dépend du contexte.`,
        ru: `Правила:
• Have + дополнение + причастие прошедшего времени — за нас действие делает кто-то другой: I had my hair cut; she is having the car repaired.
• Get + дополнение + причастие — более неформально: I need to get my phone fixed.
• За негативный опыт: he had his wallet stolen.
Исключения:
• Глагол Have + person + base (нет to) — «достать кого-то to»: I had the mechanic check the car.
• Get + person + инфинитив: I got him to help me.
• Не путать с простым have: I have my hair cut (привычка) — зависит от контекста.`,
        es: `Reglas:
• Have + objeto + participio pasado: alguien más hace la acción por nosotros: I had my hair cut; she is having the car repaired.
• Get + objeto + participio — más informal: I need to get my phone fixed.
• Para una experiencia negativa: he had his wallet stolen.
Excepciones:
• Verbo Have + person + base (no a) — "conseguir a alguien to": I had the mechanic check the car.
• Get + person + a infinitivo: I got him to help me.
• No debe confundirse con have simple: I have my hair cut (hábito), depende del contexto.`,
        zh: `规则:
• Have + 宾语 + 过去分词 — 其他人为我们执行该操作：I had my hair cut; she is having the car repaired.
• Get + 宾语 + 分词 — 更非正式：I need to get my phone fixed.
• 对于负面体验：he had his wallet stolen.
例外:
• Have + person + base 动词（不）-“让某人 to”：I had the mechanic check the car.
• Get + person + to-不定式：I got him to help me.
• 不要与简单的 have 混淆：I have my hair cut（习惯）- 取决于上下文。`,
        ko: `규칙:
• Have + 목적어 + 과거 분사 — 다른 사람이 우리를 위해 작업을 수행합니다: I had my hair cut; she is having the car repaired.
• Get + 목적어 + 분사 — 더 비공식적으로: I need to get my phone fixed.
• 부정적인 경험: he had his wallet stolen.
예외:
• Have + person + base 동사(아니요) — "누군가를 구하다 to": I had the mechanic check the car.
• Get + person + to부정사: I got him to help me.
• 일반 have: I have my hair cut(습관)과 혼동하지 마세요. 상황에 따라 다릅니다.`,
        hi: `नियम:
• Have + कर्म + भूतकालिक कृदंत — कोई दूसरा हमारे लिए कार्य करता है: I had my hair cut; she is having the car repaired.
• Get + कर्म + कृदंत — अधिक अनौपचारिक: I need to get my phone fixed.
• अप्रिय अनुभव के लिए: he had his wallet stolen.
अपवाद:
• Have + person + base क्रिया (to के बिना) — किसी से कार्य करवाना (to): I had the mechanic check the car.
• Get + person + to वाला अनंत रूप: I got him to help me.
• साधारण have से भ्रमित न करें: I have my hair cut (आदत) — अर्थ संदर्भ पर निर्भर है।`,
        ga: `Rialacha:
• Have + cuspóir + rangabháil chaite — déanann duine eile an gníomh dúinn: I had my hair cut; she is having the car repaired.
• Get + cuspóir + rangabháil — níos neamhfhoirmiúla: I need to get my phone fixed.
• Le heispéireas diúltach: he had his wallet stolen.
Eisceachtaí:
• Have + person + base an bhriathair (gan to) — cur ar dhuine rud a dhéanamh (to): I had the mechanic check the car.
• Get + person + infinideach le to: I got him to help me.
• Ná measc leis an ngnáth-have é: I have my hair cut (nós); braitheann sé ar an gcomhthéacs.`
    });

    D('reported-speech', {
        uk: `Правила:
• Теперішній → минулий: "I am tired" → she said she was tired; will → would; can → could; have done → had done.
• Займенники й слова часу зсуваються: I → he/she; today → that day; tomorrow → the next day; here → there.
• Питання: asked if/whether або wh-слово + прямий порядок слів: he asked where I lived.
• Накази: told/asked + об’єкт + to-інфінітив.
Винятки:
• Зсув не обов’язковий, якщо твердження все ще правдиве: she said that the Earth is round.
• Could, would, should, might, ought to не змінюються.
• Said без об’єкта / told з об’єктом: she said that…; she told me that…
• Past simple може лишитись past simple, якщо контекст очевидний.`,
        en: `Rules:
• Present → past: "I am tired" → she said she was tired; will → would; can → could; have done → had done.
• Pronouns and time words shift: I → he/she; today → that day; tomorrow → the next day; here → there.
• Questions: asked if/whether or a wh-word + statement word order: he asked where I lived.
• Orders: told/asked + object + to-infinitive.
Exceptions:
• The tense shift is optional if the statement is still true: she said that the Earth is round.
• Could, would, should, might, ought to do not change.
• Said without an object / told with an object: she said that…; she told me that…
• The past simple can stay if the context is clear.`,
        fr: `Règles:
• Présent → passé : "I am tired" → she said she was tired; will → would; can → could; have done → had done.
• Décalage des pronoms et des mots temporels : I → he/she; today → that day; tomorrow → the next day; here → there.
• Questions : asked if/whether ou un mot wh + ordre des mots d'instruction : he asked where I lived.
• Ordres : told/asked + objet + to-infinitif.
Exceptions:
• Le changement de temps est facultatif si l'énoncé est toujours vrai : she said that the Earth is round.
• Could, would, should, might, ought to ne change pas.
• Said sans objet / told avec un objet : she said that…; she told me that…
• Le past simple peut rester si le contexte est clair.`,
        ru: `Правила:
• Настоящее → прошлое: "I am tired" → she said she was tired; will → would; can → could; have done → had done.
• Местоимения и временные слова меняются: I → he/she; today → that day; tomorrow → the next day; here → there.
• Вопросы: asked if/whether или порядок слов "белое слово + утверждение": he asked where I lived.
• Приказы: told/asked + объект + инфинитив.
Исключения:
• Сдвиг времени необязателен, если утверждение по-прежнему истинно: she said that the Earth is round.
• Could, would, should, might, ought to не изменять.
• Said без объекта / told с объектом: she said that…; she told me that…
• past simple может остаться, если контекст ясен.`,
        es: `Reglas:
• Presente → pasado: "I am tired" → she said she was tired; will → would; can → could; have done → had done.
• Cambio de pronombres y palabras de tiempo: I → he/she; today → that day; tomorrow → the next day; here → there.
• Preguntas: asked if/whether o una palabra wh + orden de palabras de declaración: he asked where I lived.
• Órdenes: told/asked + objeto + hasta-infinitivo.
Excepciones:
• El cambio de tiempo es opcional si la afirmación sigue siendo cierta: she said that the Earth is round.
• Could, would, should, might, ought to no cambia.
• Said sin objeto / told con objeto: she said that…; she told me that…
• El past simple puede quedarse si el contexto es claro.`,
        zh: `规则:
• 现在 → 过去：“I am tired”→ she said she was tired; will → would; can → could; have done → had done.
• 代词和时间词变化：I → he/she; today → that day; tomorrow → the next day; here → there.
• 问题：asked if/whether 或 wh 词 + 语句词序：he asked where I lived.
• 顺序：told/asked + 宾语 + to 不定式。
例外:
• 如果陈述仍然成立，则时态转换是可选的：she said that the Earth is round.
• Could, would, should, might, ought to 不变。
• 没有对象的 Said / 有对象的 told：she said that…; she told me that…
• 如果上下文清楚，past simple 可以保留。`,
        ko: `규칙:
• 현재 → 과거: "I am tired" → she said she was tired; will → would; can → could; have done → had done.
• 대명사 및 시간어 이동: I → he/she; today → that day; tomorrow → the next day; here → there.
• 질문: asked if/whether 또는 wh-단어 + 명령문 어순: he asked where I lived.
• 주문: told/asked + 목적어 + to 부정사.
예외:
• 다음 진술이 여전히 참인 경우 시제 전환은 선택 사항입니다: she said that the Earth is round.
• Could, would, should, might, ought to는 변경되지 않습니다.
• 객체가 없는 Said / 객체가 있는 told: she said that…; she told me that…
• 상황이 명확하면 past simple는 그대로 유지될 수 있습니다.`,
        hi: `नियम:
• वर्तमान → भूतकाल: "I am tired" → she said she was tired; will → would; can → could; have done → had done.
• सर्वनाम और समयसूचक शब्द बदलते हैं: I → he/she; today → that day; tomorrow → the next day; here → there.
• प्रश्न: asked if/whether या प्रश्नवाचक शब्द + कथन का शब्दक्रम: he asked where I lived.
• आदेश: told/asked + कर्म + to वाला अनंत रूप।
अपवाद:
• कथन अभी भी सत्य हो तो काल बदलना वैकल्पिक है: she said that the Earth is round.
• Could, would, should, might, ought to नहीं बदलते।
• Said बिना कर्म के / told कर्म के साथ: she said that…; she told me that…
• संदर्भ स्पष्ट हो तो past simple बना रह सकता है।`,
        ga: `Rialacha:
• Láithreach → caite: "I am tired" → she said she was tired; will → would; can → could; have done → had done.
• Athraíonn forainmneacha agus focail ama: I → he/she; today → that day; tomorrow → the next day; here → there.
• Ceisteanna: asked if/whether nó focal ceisteach + ord focal ráitis: he asked where I lived.
• Orduithe: told/asked + cuspóir + infinideach le to.
Eisceachtaí:
• Tá an t-athrú aimsire roghnach má tá an ráiteas fós fíor: she said that the Earth is round.
• Ní athraíonn Could, would, should, might, ought to.
• Said gan chuspóir / told le cuspóir: she said that…; she told me that…
• Féadann an past simple fanacht má tá an comhthéacs soiléir.`
    });

    D('question-tags', {
        uk: `Правила:
• Ствердне речення → заперечний tag (you like tea, don’t you?); заперечне → ствердний (it isn’t cold, is it?).
• Tag повторює допоміжне/модальне дієслово підмета; якщо його немає — do/does/did.
• Інтонація: спадна — перевірка очікуваного; висхідна — справжнє питання.
Винятки:
• I am → aren’t I? (а не amn’t I).
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they: nobody called, did they?
• Речення зі never/hardly/barely вважаються заперечними: he never lies, does he?`,
        en: `Rules:
• Positive statement → negative tag (you like tea, don’t you?); negative → positive (it isn’t cold, is it?).
• The tag repeats the subject’s auxiliary/modal; if none, do/does/did.
• Intonation: falling — checking something expected; rising — a real question.
Exceptions:
• I am → aren’t I? (not amn’t I).
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they: nobody called, did they?
• Sentences with never/hardly/barely count as negative: he never lies, does he?`,
        fr: `Règles:
• Déclaration positive → balise négative (you like tea, don’t you?) ; négatif → positif (it isn’t cold, is it?).
• La balise répète l'auxiliaire/modal du sujet ; si aucun, do/does/did.
• Intonation : chute – vérifier quelque chose attendu ; en hausse : une vraie question.
Exceptions:
• I am → aren’t I? (pas amn’t I).
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they : nobody called, did they?
• Les phrases avec never/hardly/barely comptent comme négatives : he never lies, does he?`,
        ru: `Правила:
• Позитивное утверждение → отрицательный тег (you like tea, don’t you?); отрицательный → положительный (it isn’t cold, is it?).
• Тег повторяет вспомогательное/модальное значение темы; если нет, do/does/did.
• Интонация: падение — проверка чего-то ожидаемого; рост — реальный вопрос.
Исключения:
• I am → aren’t I? (не amn’t I).
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they: nobody called, did they?
• Предложения с never/hardly/barely считаются отрицательными: he never lies, does he?`,
        es: `Reglas:
• Declaración positiva → etiqueta negativa (you like tea, don’t you?); negativo → positivo (it isn’t cold, is it?).
• La etiqueta repite el auxiliar/modal del sujeto; si no hay ninguno, do/does/did.
• Entonación: caer - comprobar algo esperado; aumentando: una verdadera pregunta.
Excepciones:
• I am → aren’t I? (no amn’t I).
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they: nobody called, did they?
• Las oraciones con never/hardly/barely cuentan como negativas: he never lies, does he?`,
        zh: `规则:
• 正面陈述→负面标签(you like tea, don’t you?)；负 → 正 (it isn’t cold, is it?)。
• 该标签重复主语的助词/情态词；如果没有，do/does/did.
• 语调：下降——检查预期的东西；上升——一个真正的问题。
例外:
• I am → aren’t I?（不是 amn’t I）。
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they：nobody called, did they?
• 带有 never/hardly/barely 的句子算作否定：he never lies, does he?`,
        ko: `규칙:
• 긍정적 표현 → 부정적 태그 (you like tea, don’t you?); 음수 → 양수 (it isn’t cold, is it?).
• 태그는 주어의 보조/조동사을 반복합니다. 없으면 do/does/did.
• 억양: 하강 — 예상되는 내용 확인; 상승 - 진짜 질문입니다.
예외:
• I am → aren’t I?(amn’t I 아님).
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they: nobody called, did they?
• never/hardly/barely가 포함된 문장은 음수로 간주됩니다: he never lies, does he?`,
        hi: `नियम:
• सकारात्मक कथन → नकारात्मक प्रश्न-पुच्छ (you like tea, don’t you?); नकारात्मक कथन → सकारात्मक प्रश्न-पुच्छ (it isn’t cold, is it?)।
• प्रश्न-पुच्छ में कर्ता की सहायक/भाववाचक क्रिया दोहराते हैं; ऐसी क्रिया न हो तो do/does/did.
• स्वर: उतरता हुआ — अपेक्षित बात की पुष्टि; चढ़ता हुआ — वास्तविक प्रश्न।
अपवाद:
• I am → aren’t I? (amn’t I नहीं)।
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they: nobody called, did they?
• never/hardly/barely वाले वाक्य नकारात्मक माने जाते हैं: he never lies, does he?`,
        ga: `Rialacha:
• Ráiteas dearfach → clibcheist dhiúltach (you like tea, don’t you?); diúltach → dearfach (it isn’t cold, is it?).
• Athdhéantar briathar cúnta/módúil an ainmní sa chlibcheist; mura bhfuil ceann ann, do/does/did.
• Tuineadh: ag titim — deimhniú ar rud a bhfuiltear ag súil leis; ag ardú — fíorcheist.
Eisceachtaí:
• I am → aren’t I? (seachas amn’t I).
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they: nobody called, did they?
• Áirítear abairtí le never/hardly/barely mar abairtí diúltacha: he never lies, does he?`
    });

    D('phrasal-verbs', {
        uk: `Правила:
• Дієслово + частка (up, out, off, on, in, down, away, back, over…): give up, look after, turn off, carry on.
• Перехідні роздільні: займенник ТІЛЬКИ між дієсловом і часткою (turn it off, не turn off it); іменник — по обидва боки (turn the light off / turn off the light).
• Неперехідні: wake up, break down, take off.
Винятки:
• Нероздільні: look after, get over, run into, deal with — об’єкт після частки.
• Три слова: put up with, look forward to, run out of, get on with.
• Значення часто ідіоматичне і не випливає з частин: give up = здатися, put off = відкласти.
• Частка ≠ прийменник місця: He ran up the stairs (прийменник) vs He picked up the book.`,
        en: `Rules:
• Verb + particle (up, out, off, on, in, down, away, back, over…): give up, look after, turn off, carry on.
• Transitive separable: a pronoun goes ONLY between verb and particle (turn it off, not turn off it); a noun can be on either side (turn the light off / turn off the light).
• Intransitive: wake up, break down, take off.
Exceptions:
• Inseparable: look after, get over, run into, deal with — the object follows the particle.
• Three-word verbs: put up with, look forward to, run out of, get on with.
• The meaning is often idiomatic: give up = surrender, put off = postpone.
• A particle ≠ a preposition of place: He ran up the stairs (preposition) vs He picked up the book.`,
        fr: `Règles:
• Verbe + particule (up, out, off, on, in, down, away, back, over…) : give up, look after, turn off, carry on.
• Transitif séparable : un pronom va UNIQUEMENT entre le verbe et la particule (turn it off, pas turn off it) ; un nom peut être de chaque côté de (turn the light off / turn off the light).
• Intransitif : wake up, break down, take off.
Exceptions:
• Inséparable : look after, get over, run into, deal with — l'objet suit la particule.
• Verbes de trois mots : put up with, look forward to, run out of, get on with.
• Le sens est souvent idiomatique : give up = reddition, put off = reporter.
• Une particule ≠ une préposition de lieu : He ran up the stairs (préposition) vs He picked up the book.`,
        ru: `Правила:
• Глагол + частица (up, out, off, on, in, down, away, back, over…): give up, look after, turn off, carry on.
• Переходное разделяемое: местоимение стоит ТОЛЬКО между глаголом и частицей (turn it off, а не turn off it); существительное может стоять с обеих сторон (turn the light off / turn off the light).
• Непереходный: wake up, break down, take off.
Исключения:
• Неразделимо: look after, get over, run into, deal with — объект следует за частицей.
• Глаголы из трех слов: put up with, look forward to, run out of, get on with.
• Значение часто идиоматическое: give up = сдаться, put off = отложить.
• Частица ≠ предлог места: He ran up the stairs (предлог) vs He picked up the book.`,
        es: `Reglas:
• Verbo + partícula (up, out, off, on, in, down, away, back, over…): give up, look after, turn off, carry on.
• Transitivo separable: un pronombre SÓLO va entre verbo y partícula (turn it off, no turn off it); un sustantivo puede estar en cualquier lado (turn the light off / turn off the light).
• Intransitivo: wake up, break down, take off.
Excepciones:
• Inseparable: look after, get over, run into, deal with: el objeto sigue a la partícula.
• Verbos de tres palabras: put up with, look forward to, run out of, get on with.
• El significado suele ser idiomático: give up = rendirse, put off = posponer.
• Una partícula ≠ una preposición de lugar: He ran up the stairs (preposición) vs He picked up the book.`,
        zh: `规则:
• 动词+助词（up, out, off, on, in, down, away, back, over…）：give up, look after, turn off, carry on.
• 及物可分离：代词仅出现在动词和助词之间（turn it off，而不是 turn off it）； (turn the light off / turn off the light) 两侧都可以有名词。
• 不及物：wake up, break down, take off.
例外:
• 不可分离：look after, get over, run into, deal with — 物体跟随粒子。
• 三词动词：put up with, look forward to, run out of, get on with.
• 其含义通常是惯用的：give up = 投降，put off = 推迟。
• 助词 ≠ 地点介词：He ran up the stairs（介词）vs He picked up the book.`,
        ko: `규칙:
• 동사 + 조사(up, out, off, on, in, down, away, back, over…): give up, look after, turn off, carry on.
• 타동적 분리 가능: 대명사는 동사와 조사 사이에만 사용됩니다(turn it off, turn off it 아님). 명사는 (turn the light off / turn off the light) 양쪽에 올 수 있습니다.
• 자동사: wake up, break down, take off.
예외:
• 분리 불가능: look after, get over, run into, deal with — 개체가 입자를 따릅니다.
• 세 단어 동사: put up with, look forward to, run out of, get on with.
• 의미는 종종 관용적입니다: give up = 항복, put off = 연기.
• 입자 ≠ 장소 전치사: He ran up the stairs (전치사) vs He picked up the book.`,
        hi: `नियम:
• क्रिया + निपात (up, out, off, on, in, down, away, back, over…): give up, look after, turn off, carry on.
• सकर्मक, वियोज्य: सर्वनाम केवल क्रिया और निपात के बीच आता है (turn it off, turn off it नहीं); संज्ञा दोनों स्थानों पर आ सकती है (turn the light off / turn off the light)।
• अकर्मक: wake up, break down, take off.
अपवाद:
• अवियोज्य: look after, get over, run into, deal with — कर्म निपात के बाद आता है।
• तीन शब्दों वाली क्रियाएँ: put up with, look forward to, run out of, get on with.
• अर्थ प्रायः मुहावरेदार होता है: give up = हार मानना, put off = स्थगित करना।
• निपात और स्थानसूचक संबंधसूचक अव्यय अलग हैं: He ran up the stairs (संबंधसूचक अव्यय), तुलना करें: vs He picked up the book.`,
        ga: `Rialacha:
• Briathar + cáithnín (up, out, off, on, in, down, away, back, over…): give up, look after, turn off, carry on.
• Aistreach inscartha: ní thagann forainm ach idir briathar agus cáithnín (turn it off, seachas turn off it); féadann ainmfhocal teacht ar cheachtar taobh (turn the light off / turn off the light).
• Neamhaistreach: wake up, break down, take off.
Eisceachtaí:
• Doscartha: look after, get over, run into, deal with — leanann an cuspóir an cáithnín.
• Briathra trí fhocal: put up with, look forward to, run out of, get on with.
• Is minic a bhíonn an bhrí nathach: give up = géilleadh, put off = cur siar.
• Cáithnín ≠ réamhfhocal áite: He ran up the stairs (réamhfhocal), i gcomparáid le vs He picked up the book.`
    });

    D('articles-a-an', {
        uk: `Правила:
• A — перед приголосним ЗВУКОМ, an — перед голосним ЗВУКОМ (a book, an apple).
• Для однини лічильних іменників при першій згадці, для «будь-якого» (she is a doctor), у значенні «один» (twice a week).
• Не вживається з множиною і нелічильними.
Винятки:
• Ключовий — звук, не літера: an hour, an honest man (h німа); a university, a European, a one-way ticket (звук /j/ або /w/).
• Скорочення за вимовою літер: an MBA, a UFO.
• Багато стійких виразів без артикля: go to bed, at school.`,
        en: `Rules:
• A — before a consonant SOUND, an — before a vowel SOUND (a book, an apple).
• For singular countable nouns at first mention, "any one" (she is a doctor), meaning "one" (twice a week).
• Not used with plurals and uncountables.
Exceptions:
• What counts is the sound, not the letter: an hour, an honest man (silent h); a university, a European, a one-way ticket (/j/ or /w/ sound).
• Abbreviations by letter sound: an MBA, a UFO.
• Many fixed phrases have no article: go to bed, at school.`,
        fr: `Règles:
• A — avant une consonne SOUND, an — avant une voyelle SOUND (a book, an apple).
• Pour les noms dénombrables au singulier à la première mention, "n'importe lequel" (she is a doctor), signifiant "un" (twice a week).
• Non utilisé avec les pluriels et les indénombrables.
Exceptions:
• Ce qui compte c'est le son, pas la lettre : an hour, an honest man (h silencieux) ; a university, a European, a one-way ticket (son /j/ ou /w/).
• Abréviations par son de lettre : an MBA, a UFO.
• De nombreuses phrases fixes n'ont pas d'article : go to bed, at school.`,
        ru: `Правила:
• A — перед согласным ЗВУКОМ, an — перед гласным ЗВУКОМ (a book, an apple).
• Для исчисляемых существительных в единственном числе при первом упоминании «любой» (she is a doctor), что означает «один» (twice a week).
• Не используется с множественным числом и неисчисляемыми числами.
Исключения:
• Важен звук, а не буква: an hour, an honest man (тихий h); a university, a European, a one-way ticket (/j/ или /w/ звук).
• Сокращения по звуку буквы: an MBA, a UFO.
• Многие устойчивые фразы не имеют артикля: go to bed, at school.`,
        es: `Reglas:
• A — antes de un SONIDO consonante, an — antes de un SONIDO vocal (a book, an apple).
• Para sustantivos contables singulares en la primera mención, "cualquiera" (she is a doctor), que significa "uno" (twice a week).
• No se usa con plurales e incontables.
Excepciones:
• Lo que cuenta es el sonido, no la letra: an hour, an honest man (h silencioso); a university, a European, a one-way ticket (sonido /j/ o /w/).
• Abreviaturas por sonido de letra: an MBA, a UFO.
• Muchas frases fijas no tienen artículo: go to bed, at school.`,
        zh: `规则:
• A — 辅音之前，an — 元音 (a book, an apple) 之前。
• 对于首次提及的单数可数名词，“任何一个”(she is a doctor)，意思是“一个”(twice a week)。
• 不与复数和不可数一起使用。
例外:
• 重要的是声音，而不是字母：an hour, an honest man（无声h）； a university, a European, a one-way ticket（/j/或/w/声音）。
• 字母发音缩写：an MBA, a UFO.
• 许多固定短语没有冠词：go to bed, at school.`,
        ko: `규칙:
• A — 자음 SOUND 앞, an — 모음 앞 SOUND (a book, an apple).
• 처음 언급되는 단수 셀 수 있는 명사의 경우 "하나" (twice a week)를 의미하는 "any one" (she is a doctor)입니다.
• 복수형 및 셀 수 없는 것과 함께 사용되지 않습니다.
예외:
• 중요한 것은 문자가 아니라 소리입니다. an hour, an honest man (무음 h); a university, a European, a one-way ticket (/j/ 또는 /w/ 소리).
• 문자소리별 약어: an MBA, a UFO.
• 많은 고정 문구에 관사가 없습니다: go to bed, at school.`,
        hi: `नियम:
• A — व्यंजन ध्वनि से पहले, an — स्वर ध्वनि से पहले (a book, an apple)।
• एकवचन गणनीय संज्ञा के प्रथम उल्लेख पर, «कोई एक» (she is a doctor) या «एक» (twice a week) के अर्थ में।
• बहुवचन और अगणनीय संज्ञाओं के साथ प्रयोग नहीं होता।
अपवाद:
• अक्षर नहीं, ध्वनि महत्त्वपूर्ण है: an hour, an honest man (मूक h); a university, a European, a one-way ticket (/j/ या /w/ ध्वनि)।
• संक्षिप्त रूपों में अक्षर की ध्वनि के अनुसार: an MBA, a UFO.
• कई रूढ़ पदबंधों में उपपद नहीं आता: go to bed, at school.`,
        ga: `Rialacha:
• A roimh FHUAIM chonsain, an roimh FHUAIM ghuta (a book, an apple).
• Le hainmfhocal ináirithe uatha ar an gcéad lua, «ceann éigin» (she is a doctor) nó «aon» (twice a week).
• Ní úsáidtear le hiolraí ná ainmfhocail neamh-ináirithe é.
Eisceachtaí:
• An fhuaim atá tábhachtach, ní an litir: an hour, an honest man (h balbh); a university, a European, a one-way ticket (fuaim /j/ nó /w/).
• Le giorrúcháin, de réir fhuaim na litreach: an MBA, a UFO.
• Níl alt i mórán nathanna seasta: go to bed, at school.`
    });

    D('article-the', {
        uk: `Правила:
• The для відомого співрозмовникам або єдиного: the sun, the book on the table, the best.
• Друга згадка: I saw a dog. The dog was big.
• З найвищим ступенем, порядковими, іменами рік, океанів, готелів, газет, країн у множині (the United States).
Винятки:
• Без the: країни й міста (France, Paris), мови, більшість озер, вершин, прийоми їжі (breakfast).
• Але the Netherlands, the Alps, the Pacific, the Thames, the UK.
• Вимова: the /ðə/ перед приголосним, /ði/ перед голосним, /ðiː/ для підкреслення.
• Назви установ у типовому значенні — без the: go to school, in hospital (брит.).`,
        en: `Rules:
• The for something known to both speakers or unique: the sun, the book on the table, the best.
• Second mention: I saw a dog. The dog was big.
• With superlatives, ordinals, names of rivers, oceans, hotels, newspapers, plural countries (the United States).
Exceptions:
• No the: countries and cities (France, Paris), languages, most lakes, peaks, meals (breakfast).
• But the Netherlands, the Alps, the Pacific, the Thames, the UK.
• Pronunciation: the /ðə/ before a consonant, /ði/ before a vowel, /ðiː/ for emphasis.
• Institutions in their typical use — no the: go to school, in hospital (British).`,
        fr: `Règles:
• The pour quelque chose de connu des deux locuteurs ou unique : the sun, the book on the table, the best.
• Deuxième mention : I saw a dog. The dog was big.
• Avec superlatifs, ordinaux, noms de rivières, d'océans, d'hôtels, de journaux, de pays pluriels (the United States).
Exceptions:
• Non the : pays et villes (France, Paris), langues, la plupart des lacs, sommets, repas (breakfast).
• Mais the Netherlands, the Alps, the Pacific, the Thames, the UK.
• Prononciation : the /ðə/ avant une consonne, /ði/ avant une voyelle, /ðiː/ pour l'emphase.
• Institutions dans leur utilisation typique — non the : go to school, in hospital (britannique).`,
        ru: `Правила:
• The для чего-то известного обоим говорящим или уникального: the sun, the book on the table, the best.
• Второе упоминание: I saw a dog. The dog was big.
• С превосходной степенью, порядковым номером, названиями рек, океанов, отелей, газет, стран во множественном числе (the United States).
Исключения:
• Нет the: страны и города (France, Paris), языки, большинство озер, вершины, блюда (breakfast).
• Но the Netherlands, the Alps, the Pacific, the Thames, the UK.
• Произношение: the /ðə/ перед согласной, /ði/ перед гласной, /ðiː/ для ударения.
• Учреждения в их типичном использовании — нет the: go to school, in hospital (Британский).`,
        es: `Reglas:
• The para algo conocido por ambos hablantes o único: the sun, the book on the table, the best.
• Segunda mención: I saw a dog. The dog was big.
• Con superlativos, ordinales, nombres de ríos, océanos, hoteles, periódicos, países en plural (the United States).
Excepciones:
• No the: países y ciudades (France, Paris), idiomas, mayoría de lagos, picos, comidas (breakfast).
• Pero the Netherlands, the Alps, the Pacific, the Thames, the UK.
• Pronunciación: the /ðə/ antes de consonante, /ði/ antes de vocal, /ðiː/ para énfasis.
• Instituciones en su uso típico: no the: go to school, in hospital (británico).`,
        zh: `规则:
• The 表示双方都知道或独特的内容：the sun, the book on the table, the best.
• 第二次提及：I saw a dog. The dog was big.
• 带有最高级、序数词、河流、海洋、酒店、报纸、复数国家名称 (the United States)。
例外:
• 否 the：国家和城市 (France, Paris)、语言、大多数湖泊、山峰、膳食 (breakfast)。
• 但是the Netherlands, the Alps, the Pacific, the Thames, the UK.
• 发音：辅音前 the /ðə/，元音前 /ði/，/ðiː/ 表示强调。
• 典型用途的机构 — 无 the：go to school, in hospital（英国）。`,
        ko: `규칙:
• 두 화자 모두에게 알려진 내용 또는 고유한 내용의 경우 The: the sun, the book on the table, the best.
• 두 번째 언급: I saw a dog. The dog was big.
• 최상급, 서수, 강, 바다, 호텔, 신문, 복수 국가의 이름 (the United States).
예외:
• the 없음: 국가 및 도시 (France, Paris), 언어, 대부분의 호수, 봉우리, 식사 (breakfast).
• 하지만 the Netherlands, the Alps, the Pacific, the Thames, the UK.
• 발음: 자음 앞에는 the /ðə/, 모음 앞에는 /ði/, 강조는 /ðiː/
• 일반적으로 사용되는 기관 — the 없음: go to school, in hospital(영국).`,
        hi: `नियम:
• The — दोनों वक्ताओं को ज्ञात या अद्वितीय वस्तु के लिए: the sun, the book on the table, the best.
• दूसरी बार उल्लेख: I saw a dog. The dog was big.
• उत्तमावस्था, क्रमवाचक संख्याओं, नदियों, महासागरों, होटलों, समाचारपत्रों और बहुवचन देशनामों के साथ (the United States)।
अपवाद:
• the नहीं आता: देश और शहर (France, Paris), भाषाएँ, अधिकांश झीलें, पर्वत-शिखर और भोजन (breakfast)।
• लेकिन the Netherlands, the Alps, the Pacific, the Thames, the UK.
• उच्चारण: व्यंजन से पहले the /ðə/, स्वर से पहले /ði/, बल देने के लिए /ðiː/।
• संस्थाओं के सामान्य प्रयोजन के अर्थ में the नहीं आता: go to school, in hospital (ब्रिटिश अंग्रेज़ी)।`,
        ga: `Rialacha:
• The le rud atá ar eolas ag an dá chainteoir nó atá uathúil: the sun, the book on the table, the best.
• An dara lua: I saw a dog. The dog was big.
• Le sárchéimeanna, orduimhreacha, ainmneacha aibhneacha, aigéan, óstán, nuachtán agus tíortha iolra (the United States).
Eisceachtaí:
• Gan the: tíortha agus cathracha (France, Paris), teangacha, formhór lochanna, beanna sléibhe agus béilí (breakfast).
• Ach the Netherlands, the Alps, the Pacific, the Thames, the UK.
• Fuaimniú: the /ðə/ roimh chonsan, /ði/ roimh ghuta, /ðiː/ le haghaidh béime.
• Institiúidí ina ngnáthfheidhm: gan the: go to school, in hospital (Béarla na Breataine).`
    });

    D('zero-article', {
        uk: `Правила:
• Без артикля: множина й нелічильні в загальному значенні (I like music, dogs are loyal).
• Мови, національності як мови, назви предметів, прийоми їжі, види спорту, більшість країн/міст, пори року.
• Institution phrases: go to school/church/prison/bed, at home, at work.
Винятки:
• Конкретний випадок — з the: the music I heard yesterday.
• Прийоми їжі з прикметником — a: we had a wonderful lunch.
• By + транспорт без артикля: by car, by train.
• Деякі країни/групи — з the: the UK, the Netherlands.`,
        en: `Rules:
• No article: plurals and uncountables in a general sense (I like music, dogs are loyal).
• Languages, subjects, meals, sports, most countries/cities, seasons.
• Institution phrases: go to school/church/prison/bed, at home, at work.
Exceptions:
• A specific case takes the: the music I heard yesterday.
• Meals with an adjective take a: we had a wonderful lunch.
• By + transport has no article: by car, by train.
• Some countries/groups take the: the UK, the Netherlands.`,
        fr: `Règles:
• Pas d'article : pluriels et indénombrables au sens général (I like music, dogs are loyal).
• Langues, matières, repas, sports, plupart des pays/villes, saisons.
• Expressions institutionnelles : go to school/church/prison/bed, at home, at work.
Exceptions:
• Un cas spécifique prend the : the music I heard yesterday.
• Les repas avec un adjectif prennent a : we had a wonderful lunch.
• By + transport n'a pas d'article : by car, by train.
• Certains pays/groupes acceptent the : the UK, the Netherlands.`,
        ru: `Правила:
• Нет артикля: множественное число и неисчисляемые числа в общем смысле (I like music, dogs are loyal).
• Языки, предметы, питание, спорт, большинство стран/городов, времена года.
• Фразы учреждения: go to school/church/prison/bed, at home, at work.
Исключения:
• В конкретном случае принимается the: the music I heard yesterday.
• Блюда с прилагательным принимают a: we had a wonderful lunch.
• By + транспорт не имеет артикула: by car, by train.
• Некоторые страны/группы принимают the: the UK, the Netherlands.`,
        es: `Reglas:
• Sin artículo: plurales e incontables en sentido general (I like music, dogs are loyal).
• Idiomas, materias, comidas, deportes, mayoría de países/ciudades, estaciones.
• Frases institucionales: go to school/church/prison/bed, at home, at work.
Excepciones:
• Un caso específico toma the: the music I heard yesterday.
• Comidas con adjetivo tomar a: we had a wonderful lunch.
• By + transporte no tiene artículo: by car, by train.
• Algunos países/grupos toman the: the UK, the Netherlands.`,
        zh: `规则:
• 无冠词：一般意义上的复数和不可数(I like music, dogs are loyal)。
• 语言、科目、膳食、运动、大多数国家/城市、季节。
• 机构短语：go to school/church/prison/bed, at home, at work.
例外:
• 具体案例为the：the music I heard yesterday.
• 带有形容词的餐食采用 a：we had a wonderful lunch.
• By + 运输没有文章：by car, by train.
• 一些国家/地区采用 the：the UK, the Netherlands.`,
        ko: `규칙:
• 관사 없음: 일반적인 의미에서 복수형과 셀 수 없는 것 (I like music, dogs are loyal).
• 언어, 과목, 식사, 스포츠, 대부분의 국가/도시, 계절.
• 기관 문구: go to school/church/prison/bed, at home, at work.
예외:
• 특정 사례에는 the: the music I heard yesterday.가 사용됩니다
• 형용사가 a: we had a wonderful lunch.인 식사
• By + 운송에 기사가 없습니다: by car, by train.
• 일부 국가/그룹에서는 the: the UK, the Netherlands.를 사용합니다`,
        hi: `नियम:
• सामान्य अर्थ में बहुवचन और अगणनीय संज्ञाओं के साथ उपपद नहीं आता (I like music, dogs are loyal)।
• भाषाएँ, कर्ता, भोजन, खेल, अधिकांश देश/शहर और ऋतुएँ।
• संस्थाओं से जुड़े रूढ़ पदबंध: go to school/church/prison/bed, at home, at work.
अपवाद:
• विशिष्ट संदर्भ में the आता है: the music I heard yesterday.
• भोजन के नाम से पहले विशेषण हो तो a आता है: we had a wonderful lunch.
• By + यातायात का साधन — उपपद नहीं: by car, by train.
• कुछ देशों/समूहों के नामों के साथ the आता है: the UK, the Netherlands.`,
        ga: `Rialacha:
• Gan alt: iolraí agus ainmfhocail neamh-ináirithe sa chiall ghinearálta (I like music, dogs are loyal).
• Teangacha, ábhair, béilí, spóirt, formhór tíortha/cathracha agus séasúir.
• Nathanna institiúidí: go to school/church/prison/bed, at home, at work.
Eisceachtaí:
• Le cás sonrach, úsáidtear the: the music I heard yesterday.
• Le hainm béile agus aidiacht, úsáidtear a: we had a wonderful lunch.
• By + modh taistil, gan alt: by car, by train.
• Glacann roinnt tíortha/grúpaí the: the UK, the Netherlands.`
    });

    D('countable-uncountable', {
        uk: `Правила:
• Лічильні мають множину й a/an (a book, two books); нелічильні — ні (water, advice, information, furniture, news).
• Кількість нелічильних: some, much, a lot of, a piece of, a bit of, a glass of.
• Питання: how many (лічильні), how much (нелічильні).
Винятки:
• Нелічильні в англійській, лічильні в українській: advice, information, news, furniture, luggage, traffic, progress, knowledge (an advice — помилка).
• Деякі іменники мають обидва значення: a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — зазвичай нелічильні; hairs, fruits — окремі предмети/види.`,
        en: `Rules:
• Countables have a plural and a/an (a book, two books); uncountables do not (water, advice, information, furniture, news).
• Quantity of uncountables: some, much, a lot of, a piece of, a bit of, a glass of.
• Questions: how many (countable), how much (uncountable).
Exceptions:
• Uncountable in English but countable in many languages: advice, information, news, furniture, luggage, traffic, progress, knowledge (an advice is wrong).
• Some nouns have both: a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — usually uncountable; hairs, fruits — individual items/kinds.`,
        fr: `Règles:
• Les dénombrables ont un pluriel et a/an (a book, two books) ; les indénombrables ne font pas (water, advice, information, furniture, news).
• Quantité d'indénombrables : some, much, a lot of, a piece of, a bit of, a glass of.
• Questions : how many (dénombrable), how much (indénombrable).
Exceptions:
• Indénombrable en anglais mais dénombrable dans de nombreuses langues : advice, information, news, furniture, luggage, traffic, progress, knowledge (an advice est faux).
• Certains noms ont les deux : a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — généralement indénombrable ; hairs, fruits – articles/types individuels.`,
        ru: `Правила:
• Счетные таблицы имеют множественное число и a/an (a book, two books); неисчисляемые числа не имеют (water, advice, information, furniture, news).
• Количество неисчисляемых величин: some, much, a lot of, a piece of, a bit of, a glass of.
• Вопросы: how many (исчисляемые), how much (неисчисляемые).
Исключения:
• Неисчисляемо на английском языке, но исчисляемо на многих языках: advice, information, news, furniture, luggage, traffic, progress, knowledge (an advice неверно).
• Некоторые существительные имеют и то, и другое: a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — обычно неисчисляемое; hairs, fruits — отдельные предметы/виды.`,
        es: `Reglas:
• Los contables tienen plural y a/an (a book, two books); los incontables no (water, advice, information, furniture, news).
• Cantidad de incontables: some, much, a lot of, a piece of, a bit of, a glass of.
• Preguntas: how many (contable), how much (incontable).
Excepciones:
• Incontable en inglés pero contable en muchos idiomas: advice, information, news, furniture, luggage, traffic, progress, knowledge (an advice es incorrecto).
• Algunos sustantivos tienen ambos: a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — normalmente incontable; hairs, fruits — artículos/tipos individuales.`,
        zh: `规则:
• 可数词有复数，a/an (a book, two books)；不可数不是 (water, advice, information, furniture, news)。
• 不可数的数量：some, much, a lot of, a piece of, a bit of, a glass of.
• 问题：how many（可数）、how much（不可数）。
例外:
• 在英语中不可数，但在许多语言中可数：advice, information, news, furniture, luggage, traffic, progress, knowledge（an advice 是错误的）。
• 一些名词两者兼有：a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — 通常不可数； hairs, fruits — 单个项目/种类。`,
        ko: `규칙:
• 가산 가능 항목에는 복수형과 a/an (a book, two books)가 있습니다. 셀 수 없는 것은 (water, advice, information, furniture, news)가 아닙니다.
• 셀 수 없는 수량: some, much, a lot of, a piece of, a bit of, a glass of.
• 질문: how many(셀 수 있음), how much(셀 수 없음).
예외:
• 영어로는 셀 수 없지만 여러 언어에서는 셀 수 있습니다: advice, information, news, furniture, luggage, traffic, progress, knowledge(an advice는 틀렸습니다.)
• 일부 명사는 둘 다 갖습니다: a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — 일반적으로 셀 수 없습니다. hairs, fruits — 개별 아이템/종류.`,
        hi: `नियम:
• गणनीय संज्ञाओं का बहुवचन होता है और उनके साथ a/an आता है (a book, two books); अगणनीय संज्ञाओं के साथ ऐसा नहीं होता (water, advice, information, furniture, news)।
• अगणनीय संज्ञाओं की मात्रा: some, much, a lot of, a piece of, a bit of, a glass of.
• प्रश्न: how many (गणनीय), how much (अगणनीय)।
अपवाद:
• अंग्रेज़ी में अगणनीय, पर कई अन्य भाषाओं में गणनीय: advice, information, news, furniture, luggage, traffic, progress, knowledge (an advice ग़लत है)।
• कुछ संज्ञाएँ दोनों तरह प्रयुक्त होती हैं: a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — सामान्यतः अगणनीय; hairs, fruits — अलग-अलग वस्तुएँ/प्रकार।`,
        ga: `Rialacha:
• Tá iolra agus a/an ag ainmfhocail ináirithe (a book, two books); níl ag ainmfhocail neamh-ináirithe (water, advice, information, furniture, news).
• Cainníocht le hainmfhocail neamh-ináirithe: some, much, a lot of, a piece of, a bit of, a glass of.
• Ceisteanna: how many (ináirithe), how much (neamh-ináirithe).
Eisceachtaí:
• Neamh-ináirithe sa Bhéarla ach ináirithe i mórán teangacha: advice, information, news, furniture, luggage, traffic, progress, knowledge (tá an advice mícheart).
• Tá an dá úsáid ag roinnt ainmfhocal: a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — neamh-ináirithe de ghnáth; hairs, fruits — míreanna/cineálacha aonair.`
    });

    D('quantifiers', {
        uk: `Правила:
• Some — ствердження; any — заперечення й питання; no = not any.
• Much/little — нелічильні; many/few — лічильні; a lot of/plenty of — обидва.
• A few/a little = «трохи» (позитивно); few/little = «майже ні» (негативно).
• Enough, several, both, all, each, every.
Винятки:
• Some у питаннях-пропозиціях і проханнях: would you like some tea? can I have some water?
• Any у ствердженні = «будь-який»: any day will do.
• Much/many рідко у ствердженнях (a lot of); у запереченні й питаннях — природні.
• Each/every + однина дієслова: every student has a book.`,
        en: `Rules:
• Some — positives; any — negatives and questions; no = not any.
• Much/little — uncountables; many/few — countables; a lot of/plenty of — both.
• A few/a little = "some" (positive); few/little = "hardly any" (negative).
• Enough, several, both, all, each, every.
Exceptions:
• Some in offers and requests: would you like some tea? can I have some water?
• Any in a positive means "any at all": any day will do.
• Much/many are rare in positives (use a lot of); natural in negatives and questions.
• Each/every take a singular verb: every student has a book.`,
        fr: `Règles:
• Some — positifs ; any — négatifs et questions ; no = not any.
• Much/little — indénombrables ; many/few — comptes ; a lot of/plenty of — les deux.
• A few/a little = "certains" (positif) ; few/little = "presque aucun" (négatif).
• Enough, several, both, all, each, every.
Exceptions:
• Some dans les offres et demandes : would you like some tea? can I have some water?
• Any au positif signifie "n'importe lequel" : any day will do.
• Les Much/many sont rares en positifs (utilisez a lot of) ; naturel dans les négatifs et les questions.
• Each/every prend un verbe au singulier : every student has a book.`,
        ru: `Правила:
• Some — позитивы; any — негативы и вопросы; no = not any.
• Much/little — неисчисляемые числа; many/few — счетные числа; a lot of/plenty of — оба.
• A few/a little = "некоторые" (положительный); few/little = «почти нет» (отрицательно).
• Enough, several, both, all, each, every.
Исключения:
• Some в предложениях и запросах: would you like some tea? can I have some water?
• Any в положительном значении означает "любой вообще": any day will do.
• Much/many редко встречаются в положительных результатах (используйте a lot of); естественно в отрицаниях и вопросах.
• Each/every возьмите глагол в единственном числе: every student has a book.`,
        es: `Reglas:
• Some — positivos; any — negativos y preguntas; no = not any.
• Much/little — incontables; many/few — contables; a lot of/plenty of: ambos.
• A few/a little = "algunos" (positivo); few/little = "casi ninguno" (negativo).
• Enough, several, both, all, each, every.
Excepciones:
• Some en ofertas y solicitudes: would you like some tea? can I have some water?
• Any en positivo significa "cualquiera": any day will do.
• Much/many son raros en positivos (use a lot of); natural en negativas y preguntas.
• Each/every toma un verbo singular: every student has a book.`,
        zh: `规则:
• Some — 积极； any——否定和问题； no = not any.
• Much/little — 不可数； many/few — 可数； a lot of/plenty of — 两者都有。
• A few/a little = "一些"（正数）； few/little =“几乎没有”（负）。
• Enough, several, both, all, each, every.
例外:
• 报价和请求中的 Some：would you like some tea? can I have some water?
• Any 积极的意思是“任何”：any day will do.
• Much/many 很少出现在阳性中（使用 a lot of）；自然的否定和疑问句。
• Each/every 采用单数动词：every student has a book.`,
        ko: `규칙:
• Some — 긍정적인 점; any — 부정문 및 질문; no = not any.
• Much/little — 셀 수 없는 것; many/few — 셀 수 있는 항목; a lot of/plenty of — 둘 다.
• A few/a little = "일부"(긍정적); few/little = "거의 없음"(부정적).
• Enough, several, both, all, each, every.
예외:
• 제안 및 요청의 Some: would you like some tea? can I have some water?
• Any는 양수로 "모든 것"을 의미합니다: any day will do.
• Much/many는 긍정적인 경우가 거의 없습니다(a lot of 사용). 부정문과 질문문이 자연스럽습니다.
• Each/every 단수 동사 취하기: every student has a book.`,
        hi: `नियम:
• Some — सकारात्मक कथनों में; any — नकारात्मक कथनों और प्रश्नों में; no = not any.
• Much/little — अगणनीय के साथ; many/few — गणनीय के साथ; a lot of/plenty of — दोनों के साथ।
• A few/a little = «कुछ» (सकारात्मक अर्थ); few/little = «लगभग नहीं» (नकारात्मक अर्थ)।
• Enough, several, both, all, each, every.
अपवाद:
• प्रस्तावों और अनुरोधों में Some: would you like some tea? can I have some water?
• सकारात्मक कथन में Any का अर्थ «कोई भी» है: any day will do.
• सकारात्मक कथनों में Much/many कम आते हैं (a lot of प्रयोग करें); नकारात्मक कथनों और प्रश्नों में स्वाभाविक हैं।
• Each/every के साथ एकवचन क्रिया आती है: every student has a book.`,
        ga: `Rialacha:
• Some — dearfach; any — diúltú agus ceisteanna; no = not any.
• Much/little — neamh-ináirithe; many/few — ináirithe; a lot of/plenty of — an dá chineál.
• A few/a little = «roinnt» (dearfach); few/little = «beagnach gan aon» (diúltach).
• Enough, several, both, all, each, every.
Eisceachtaí:
• Some i dtairiscintí agus iarrataí: would you like some tea? can I have some water?
• Ciallaíonn Any i ráiteas dearfach «cibé ceann»: any day will do.
• Is annamh Much/many i ráitis dhearfacha (úsáidtear a lot of); tá siad nádúrtha i ndiúltú agus i gceisteanna.
• Glacann Each/every briathar uatha: every student has a book.`
    });

    D('plurals', {
        uk: `Правила:
• Зазвичай +s: book → books.
• -s, -x, -ch, -sh, -z → +es: box → boxes, watch → watches.
• Приголосна + y → -ies: city → cities; голосна + y → +s: day → days.
• -f/-fe → -ves: knife → knives, leaf → leaves.
Винятки:
• Неправильні: man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• Незмінні: sheep, fish, deer, series, species.
• -o: potatoes, tomatoes, heroes (але photos, pianos).
• Лише множина: scissors, trousers, glasses, clothes; news і слова на -ics (mathematics, physics) — з дієсловом в однині.`,
        en: `Rules:
• Usually +s: book → books.
• -s, -x, -ch, -sh, -z → +es: box → boxes, watch → watches.
• Consonant + y → -ies: city → cities; vowel + y → +s: day → days.
• -f/-fe → -ves: knife → knives, leaf → leaves.
Exceptions:
• Irregular: man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• Unchanged: sheep, fish, deer, series, species.
• -o: potatoes, tomatoes, heroes (but photos, pianos).
• Plural only: scissors, trousers, glasses, clothes; news and -ics words (mathematics, physics) take a singular verb.`,
        fr: `Règles:
• Généralement +s : book → books.
• -s, -x, -ch, -sh, -z → +es : box → boxes, watch → watches.
• Consonne + y → -ies : city → cities ; voyelle + y → +s : day → days.
• -f/-fe → -ves : knife → knives, leaf → leaves.
Exceptions:
• Irrégulier : man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• Inchangé : sheep, fish, deer, series, species.
• -o : potatoes, tomatoes, heroes (mais photos, pianos).
• Pluriel uniquement : les mots scissors, trousers, glasses, clothes; news et -ics (mathematics, physics) prennent un verbe au singulier.
Conjugaison (personne, nombre):
| Singulier | Pluriel | Règle |
| book | books | +s |
| box | boxes | -x/-s/-ch/-sh → +es |
| city | cities | consonne + y → -ies |
| knife | knives | -f/-fe → -ves |
| man | men | irrégulier |
| child | children | irrégulier |
| sheep | sheep | invariable |`,
        ru: `Правила:
• Обычно +s: book → books.
• -s, -x, -ch, -sh, -z → +es: box → boxes, watch → watches.
• Согласная + y → -ies: city → cities; гласная + y → +s: day → days.
• -f/-fe → -ves: knife → knives, leaf → leaves.
Исключения:
• Неправильные формы: man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• Без изменений: sheep, fish, deer, series, species.
• -o: potatoes, tomatoes, heroes (но photos, pianos).
• Только во множественном числе: слова scissors, trousers, glasses, clothes; news и -ics (mathematics, physics) принимают глагол в единственном числе.
Спряжение (лицо, число):
| Единственное число | Множественное число | Правило |
| book | books | +s |
| box | boxes | -x/-s/-ch/-sh → +es |
| city | cities | согласная + y → -ies |
| knife | knives | -f/-fe → -ves |
| man | men | неправильная форма |
| child | children | неправильная форма |
| sheep | sheep | без изменений |`,
        es: `Reglas:
• Normalmente +s: book → books.
• -s, -x, -ch, -sh, -z → +es: box → boxes, watch → watches.
• Consonante + y → -ies: city → cities; vocal + y → +s: day → days.
• -f/-fe → -ves: knife → knives, leaf → leaves.
Excepciones:
• Irregular: man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• Sin cambios: sheep, fish, deer, series, species.
• -o: potatoes, tomatoes, heroes (pero photos, pianos).
• Solo plural: las palabras scissors, trousers, glasses, clothes; news y -ics (mathematics, physics) toman un verbo en singular.
Conjugación (persona, número):
| Singular | Plural | Regla |
| book | books | +s |
| box | boxes | -x/-s/-ch/-sh → +es |
| city | cities | consonante + y → -ies |
| knife | knives | -f/-fe → -ves |
| man | men | irregular |
| child | children | irregular |
| sheep | sheep | invariable |`,
        zh: `规则:
• 通常为 +s：book → books.
• -s, -x, -ch, -sh, -z → +es：box → boxes, watch → watches.
• 辅音 + y → -ies：city → cities；元音+y → +s：day → days.
• -f/-fe → -ves：knife → knives, leaf → leaves.
例外:
• 不规则：man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• 不变：sheep, fish, deer, series, species.
• -o：potatoes, tomatoes, heroes（但 photos, pianos）。
• 仅限复数：scissors, trousers, glasses, clothes; news 和 -ics 单词 (mathematics, physics) 采用单数动词。
变位（人称、数）:
| 单数 | 复数 | 规则 |
| book | books | +s |
| box | boxes | -x/-s/-ch/-sh → +es |
| city | cities | 辅音 + y → -ies |
| knife | knives | -f/-fe → -ves |
| man | men | 不规则变化 |
| child | children | 不规则变化 |
| sheep | sheep | 不变 |`,
        ko: `규칙:
• 보통 +s: book → books.
• -s, -x, -ch, -sh, -z → +es: box → boxes, watch → watches.
• 자음 + y → -ies: city → cities; 모음 + y → +s: day → days.
• -f/-fe → -ves: knife → knives, leaf → leaves.
예외:
• 불규칙: man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• 변경되지 않음: sheep, fish, deer, series, species.
• -o: potatoes, tomatoes, heroes(그러나 photos, pianos).
• 복수형만 사용: scissors, trousers, glasses, clothes; news 및 -ics 단어 (mathematics, physics)는 단수 동사를 취합니다.
활용(인칭, 수):
| 단수 | 복수 | 규칙 |
| book | books | +s |
| box | boxes | -x/-s/-ch/-sh → +es |
| city | cities | 자음 + y → -ies |
| knife | knives | -f/-fe → -ves |
| man | men | 불규칙 |
| child | children | 불규칙 |
| sheep | sheep | 변화 없음 |`,
        hi: `नियम:
• सामान्यतः +s: book → books.
• -s, -x, -ch, -sh, -z → +es: box → boxes, watch → watches.
• व्यंजन + y → -ies: city → cities; स्वर + y → +s: day → days.
• -f/-fe → -ves: knife → knives, leaf → leaves.
अपवाद:
• अनियमित रूप: man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• अपरिवर्तित रूप: sheep, fish, deer, series, species.
• -o: potatoes, tomatoes, heroes (लेकिन photos, pianos)।
• केवल बहुवचन: scissors, trousers, glasses, clothes; news तथा -ics पर समाप्त शब्दों (mathematics, physics) के साथ एकवचन क्रिया आती है।
क्रिया-रूप (पुरुष, वचन):
| एकवचन | बहुवचन | नियम |
| book | books | +s |
| box | boxes | -x/-s/-ch/-sh → +es |
| city | cities | व्यंजन + y → -ies |
| knife | knives | -f/-fe → -ves |
| man | men | अनियमित |
| child | children | अनियमित |
| sheep | sheep | अपरिवर्तित |`,
        ga: `Rialacha:
• De ghnáth +s: book → books.
• -s, -x, -ch, -sh, -z → +es: box → boxes, watch → watches.
• Consan + y → -ies: city → cities; guta + y → +s: day → days.
• -f/-fe → -ves: knife → knives, leaf → leaves.
Eisceachtaí:
• Neamhrialta: man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• Gan athrú: sheep, fish, deer, series, species.
• -o: potatoes, tomatoes, heroes (ach photos, pianos).
• Iolra amháin: scissors, trousers, glasses, clothes; news agus focail dar críoch -ics (mathematics, physics) a ghlacann briathar uatha.
Réimniú (pearsa, uimhir):
| Uatha | Iolra | Riail |
| book | books | +s |
| box | boxes | -x/-s/-ch/-sh → +es |
| city | cities | consan + y → -ies |
| knife | knives | -f/-fe → -ves |
| man | men | neamhrialta |
| child | children | neamhrialta |
| sheep | sheep | gan athrú |`
    });

    D('possessives', {
        uk: `Правила:
• Людина/тварина: ’s (Tom’s book); множина на -s: apostrophe після s (the boys’ room); нерегулярна множина: ’s (children’s toys).
• Річ: of (the end of the day, the door of the house).
• Присвійні прикметники перед іменником: my, your, his, her, its, our, their; займенники без іменника: mine, yours, his, hers, ours, theirs.
Винятки:
• Its (присвійне) ≠ it’s (it is/has).
• Час і відстань також з ’s: today’s news, a week’s holiday.
• Подвійний присвійний: a friend of mine (не a friend of me).
• Спільне володіння: Tom and Anna’s house; окреме — Tom’s and Anna’s cars.`,
        en: `Rules:
• People/animals: ’s (Tom’s book); plural in -s: apostrophe after s (the boys’ room); irregular plural: ’s (children’s toys).
• Things: of (the end of the day, the door of the house).
• Possessive adjectives before a noun: my, your, his, her, its, our, their; pronouns without a noun: mine, yours, his, hers, ours, theirs.
Exceptions:
• Its (possessive) ≠ it’s (it is/has).
• Time and distance also take ’s: today’s news, a week’s holiday.
• Double possessive: a friend of mine (not a friend of me).
• Joint ownership: Tom and Anna’s house; separate — Tom’s and Anna’s cars.`,
        fr: `Règles:
• Personnes/animaux : ’s (Tom’s book) ; pluriel dans -s : apostrophe après s (the boys’ room) ; Pluriel irrégulier : ’s (children’s toys).
• Choses : of (the end of the day, the door of the house).
• Adjectifs possessifs avant un nom : my, your, his, her, its, our, their ; pronoms sans nom : mine, yours, his, hers, ours, theirs.
Exceptions:
• Its (possessif) ≠ it’s (it is/has).
• Le temps et la distance prennent également ’s : today’s news, a week’s holiday.
• Double possessif : a friend of mine (pas a friend of me).
• Copropriété : Tom and Anna’s house ; séparé — Tom’s and Anna’s cars.`,
        ru: `Правила:
• Люди/животные: ’s (Tom’s book); множественное число в -s: апостроф после s (the boys’ room); неправильное множественное число: ’s (children’s toys).
• Вещи: of (the end of the day, the door of the house).
• Притяжательные прилагательные перед существительным: my, your, his, her, its, our, their; местоимения без существительного: mine, yours, his, hers, ours, theirs.
Исключения:
• Its (притяжательное) ≠ it’s (it is/has).
• Время и расстояние также принимают ’s: today’s news, a week’s holiday.
• Двойной притяжательный падеж: a friend of mine (не a friend of me).
• Совместное владение: Tom and Anna’s house; отдельный — Tom’s and Anna’s cars.`,
        es: `Reglas:
• Personas/animales: ’s (Tom’s book); plural en -s: apóstrofe después de s (the boys’ room); Plural irregular: ’s (children’s toys).
• Cosas: of (the end of the day, the door of the house).
• Adjetivos posesivos delante de un sustantivo: my, your, his, her, its, our, their; pronombres sin sustantivo: mine, yours, his, hers, ours, theirs.
Excepciones:
• Its (posesivo) ≠ it’s (it is/has).
• El tiempo y la distancia también toman ’s: today’s news, a week’s holiday.
• Doble posesivo: a friend of mine (no a friend of me).
• Propiedad conjunta: Tom and Anna’s house; separado — Tom’s and Anna’s cars.`,
        zh: `规则:
• 人/动物：'s (Tom’s book)； -s 中的复数：s (the boys’ room) 后的撇号；不规则复数：'s (children’s toys)。
• 事物：of (the end of the day, the door of the house)。
• 名词前所有格形容词：my, your, his, her, its, our, their；没有名词的代词：mine, yours, his, hers, ours, theirs.
例外:
• Its（所有格）≠ it’s (it is/has)。
• 时间和距离也取 's: today’s news, a week’s holiday.
• 双重所有格：a friend of mine（不是 a friend of me）。
• 共同所有权：Tom and Anna’s house；单独 — Tom’s and Anna’s cars.`,
        ko: `규칙:
• 사람/동물: ’s (Tom’s book); -s의 복수형: s (the boys’ room) 뒤에 아포스트로피; 불규칙 복수형: ’s (children’s toys).
• 사물: of (the end of the day, the door of the house).
• 명사 앞의 소유격 형용사: my, your, his, her, its, our, their; 명사가 없는 대명사: mine, yours, his, hers, ours, theirs.
예외:
• Its(소유격) ≠ it’s (it is/has).
• 시간과 거리에도 's: today’s news, a week’s holiday.'가 걸립니다
• 이중 소유격: a friend of mine(a friend of me 아님)
• 공동 소유권: Tom and Anna’s house; 별도 — Tom’s and Anna’s cars.`,
        hi: `नियम:
• व्यक्ति/प्राणी: ’s (Tom’s book); -s पर समाप्त बहुवचन में s के बाद अपॉस्ट्रॉफ़ (the boys’ room); अनियमित बहुवचन: ’s (children’s toys)।
• वस्तुएँ: of (the end of the day, the door of the house)।
• संज्ञा से पहले संबंधवाचक विशेषण: my, your, his, her, its, our, their; संज्ञा के बिना सर्वनाम: mine, yours, his, hers, ours, theirs.
अपवाद:
• Its (स्वामित्व) ≠ it’s (it is/has)।
• समय और दूरी के साथ भी ’s आता है: today’s news, a week’s holiday.
• दोहरा संबंधसूचक प्रयोग: a friend of mine (a friend of me नहीं)।
• संयुक्त स्वामित्व: Tom and Anna’s house; अलग-अलग स्वामित्व: Tom’s and Anna’s cars.`,
        ga: `Rialacha:
• Daoine/ainmhithe: ’s (Tom’s book); iolra dar críoch -s: uaschamóg tar éis s (the boys’ room); iolra neamhrialta: ’s (children’s toys).
• Rudaí: of (the end of the day, the door of the house).
• Aidiachtaí sealbhacha roimh ainmfhocal: my, your, his, her, its, our, their; forainmneacha gan ainmfhocal: mine, yours, his, hers, ours, theirs.
Eisceachtaí:
• Its (sealbhach) ≠ it’s (it is/has).
• Glacann am agus fad ’s freisin: today’s news, a week’s holiday.
• Sealbhach dúbailte: a friend of mine (seachas a friend of me).
• Comhsheilbh: Tom and Anna’s house; seilbh ar leith: Tom’s and Anna’s cars.`
    });

    D('demonstratives', {
        uk: `Правила:
• This/these — близьке в просторі, часі або свідомості; that/those — далеке.
• This/that — однина; these/those — множина.
• Займенники й визначники: this is my friend; I like these shoes.
Винятки:
• This у телефонних розмовах: this is Anna (я), is that John? (ви).
• That/those як заміна повтореного іменника: the weather here is better than that in Spain.
• Those who = ті, хто: those who wait.
• This/that перед one/ones: I like this one, those ones (розм.).`,
        en: `Rules:
• This/these — near in space, time or mind; that/those — far.
• This/that — singular; these/those — plural.
• Pronouns and determiners: this is my friend; I like these shoes.
Exceptions:
• This on the phone: this is Anna (I am), is that John? (you).
• That/those replacing a repeated noun: the weather here is better than that in Spain.
• Those who = people who: those who wait.
• This/that before one/ones: I like this one, those ones (informal).`,
        fr: `Règles:
• This/these — proche dans l'espace, le temps ou l'esprit ; that/those — loin.
• This/that — singulier ; these/those — pluriel.
• Pronoms et déterminants : this is my friend; I like these shoes.
Exceptions:
• This au téléphone : this is Anna (je suis), is that John? (vous).
• That/those remplaçant un nom répété : the weather here is better than that in Spain.
• Those qui = personnes who : those who wait.
• This/that avant one/ones : I like this one, those ones (informel).`,
        ru: `Правила:
• This/these — рядом в пространстве, времени или разуме; that/those — далеко.
• This/that — единственное число; these/those — множественное число.
• Местоимения и определители: this is my friend; I like these shoes.
Исключения:
• This по телефону: this is Anna (я), is that John? (вы).
• That/those заменяет повторяющееся существительное: the weather here is better than that in Spain.
• Those who = люди who: those who wait.
• This/that перед one/ones: I like this one, those ones (неофициально).`,
        es: `Reglas:
• This/these — cerca en el espacio, el tiempo o la mente; that/those — lejos.
• This/that — singular; these/those — plural.
• Pronombres y determinantes: this is my friend; I like these shoes.
Excepciones:
• This al teléfono: this is Anna (yo soy), is that John? (tú).
• That/those reemplazando un sustantivo repetido: the weather here is better than that in Spain.
• Those quién = personas who: those who wait.
• This/that antes de one/ones: I like this one, those ones (informal).`,
        zh: `规则:
• This/these — 在空间、时间或心灵上接近； that/those — 远。
• This/that — 单数； these/those — 复数。
• 代词和限定词：this is my friend; I like these shoes.
例外:
• 手机上的 This：this is Anna（我），is that John?（你）。
• That/those 替换重复的名词：the weather here is better than that in Spain.
• Those 谁=人who：those who wait.
• This/that 在 one/ones 之前：I like this one, those ones（非正式）。`,
        ko: `규칙:
• This/these — 공간, 시간 또는 정신에 가깝습니다. that/those — 멀리.
• This/that — 단수; these/those — 복수형.
• 대명사 및 한정사: this is my friend; I like these shoes.
예외:
• 전화상의 This: this is Anna(나는), is that John?(당신).
• 반복되는 명사를 바꾸는 That/those: the weather here is better than that in Spain.
• Those 누가 = 사람 who: those who wait.
• one/ones 이전의 This/that: I like this one, those ones(비공식)`,
        hi: `नियम:
• This/these — स्थान, समय या विचार में निकट; that/those — दूर।
• This/that — एकवचन; these/those — बहुवचन।
• सर्वनाम और निर्धारक: this is my friend; I like these shoes.
अपवाद:
• फ़ोन पर This: this is Anna (मैं हूँ), is that John? (आप)।
• संज्ञा दोहराने के बदले That/those: the weather here is better than that in Spain.
• Those who = वे लोग who: those who wait.
• one/ones से पहले This/that: I like this one, those ones (अनौपचारिक)।`,
        ga: `Rialacha:
• This/these — gar ó thaobh áite, ama nó smaoinimh; that/those — i bhfad.
• This/that — uatha; these/those — iolra.
• Forainmneacha agus cinnteoirí: this is my friend; I like these shoes.
Eisceachtaí:
• This ar an bhfón: this is Anna (mise), is that John? (tusa).
• That/those in áit ainmfhocail a athdhéanfaí: the weather here is better than that in Spain.
• Those who = daoine who: those who wait.
• This/that roimh one/ones: I like this one, those ones (neamhfhoirmiúil).`
    });

    D('comparatives', {
        uk: `Правила:
• Однослівні прикметники: +er (tall → taller); двоскладові на -y: -ier (happy → happier); довгі — more + adj (more interesting).
• Than для порівняння: she is taller than her brother.
• Приголосна подвоюється: big → bigger; -e + r: nice → nicer.
Винятки:
• Неправильні: good → better, bad → worse, far → farther/further, little → less, many/much → more.
• Двоскладові: clever → cleverer / more clever, simple → simpler.
• The … the…: the more, the better.
• Less + adj для протилежного: less expensive.`,
        en: `Rules:
• One-syllable adjectives: +er (tall → taller); two-syllable in -y: -ier (happy → happier); long ones — more + adj (more interesting).
• Than introduces the comparison: she is taller than her brother.
• Consonant doubling: big → bigger; -e + r: nice → nicer.
Exceptions:
• Irregular: good → better, bad → worse, far → farther/further, little → less, many/much → more.
• Some two-syllable: clever → cleverer / more clever, simple → simpler.
• The … the…: the more, the better.
• Less + adj for the opposite: less expensive.`,
        fr: `Règles:
• Adjectifs d'une syllabe : +er (tall → taller) ; deux syllabes dans -y : -ier (happy → happier) ; les longs — more + adjectif (more interesting).
• Than introduit la comparaison : she is taller than her brother.
• Doublage de consonnes : big → bigger; -e + r : nice → nicer.
Exceptions:
• Irrégulier : good → better, bad → worse, far → farther/further, little → less, many/much → more.
• Quelques deux syllabes : clever → cleverer / more clever, simple → simpler.
• The … the… : the more, the better.
• Less + adjectif pour le contraire : less expensive.`,
        ru: `Правила:
• Односложные прилагательные: +er (tall → taller); двусложный в -y: -ier (happy → happier); длинные — more + прил (more interesting).
• Than представляет сравнение: she is taller than her brother.
• Удвоение согласных: big → bigger; -e + r: nice → nicer.
Исключения:
• Неправильные формы: good → better, bad → worse, far → farther/further, little → less, many/much → more.
• Какое-то двусложное слово: clever → cleverer / more clever, simple → simpler.
• The … the…: the more, the better.
• Less + прил противоположного значения: less expensive.`,
        es: `Reglas:
• Adjetivos de una sílaba: +er (tall → taller); bisílaba en -y: -ier (happy → happier); los largos — more + adjetivo (more interesting).
• Than presenta la comparación: she is taller than her brother.
• Duplicación de consonantes: big → bigger; -e + r: nice → nicer.
Excepciones:
• Irregular: good → better, bad → worse, far → farther/further, little → less, many/much → more.
• Algunas dos sílabas: clever → cleverer / more clever, simple → simpler.
• The … the…: the more, the better.
• Less + adjetivo para lo contrario: less expensive.`,
        zh: `规则:
• 单音节形容词：+er (tall → taller)； -y 中的双音节：-ier (happy → happier)；长的 — more + 形容词 (more interesting)。
• Than介绍对比：she is taller than her brother.
• 双辅音：big → bigger; -e + r：nice → nicer.
例外:
• 不规则：good → better, bad → worse, far → farther/further, little → less, many/much → more.
• 一些双音节：clever → cleverer / more clever, simple → simpler.
• The … the…：the more, the better.
• Less + 相反的形容词：less expensive.`,
        ko: `규칙:
• 1음절 형용사: +er (tall → taller); -y의 2음절: -ier (happy → happier); 긴 것 — more + 형용사 (more interesting).
• Than는 비교를 소개합니다: she is taller than her brother.
• 자음 이중화: big → bigger; -e + r: nice → nicer.
예외:
• 불규칙: good → better, bad → worse, far → farther/further, little → less, many/much → more.
• 일부 2음절: clever → cleverer / more clever, simple → simpler.
• The … the…: the more, the better.
• Less + 반대의 경우 형용사: less expensive.`,
        hi: `नियम:
• एक अक्षरांश वाले विशेषण: +er (tall → taller); -y पर समाप्त दो अक्षरांश वाले: -ier (happy → happier); लंबे विशेषण: more + विशेषण (more interesting)।
• तुलना में Than आता है: she is taller than her brother.
• व्यंजन का द्वित्व: big → bigger; -e + r: nice → nicer.
अपवाद:
• अनियमित रूप: good → better, bad → worse, far → farther/further, little → less, many/much → more.
• कुछ दो अक्षरांश वाले विशेषण: clever → cleverer / more clever, simple → simpler.
• The … the…: the more, the better.
• विपरीत तुलना में Less + विशेषण: less expensive.`,
        ga: `Rialacha:
• Aidiachtaí aonsiollacha: +er (tall → taller); dhá shiolla dar críoch -y: -ier (happy → happier); cinn fhada: more + aidiacht (more interesting).
• Cuireann Than an chomparáid in iúl: she is taller than her brother.
• Dúbailt an chonsain: big → bigger; -e + r: nice → nicer.
Eisceachtaí:
• Neamhrialta: good → better, bad → worse, far → farther/further, little → less, many/much → more.
• Roinnt aidiachtaí dhá shiolla: clever → cleverer / more clever, simple → simpler.
• The … the…: the more, the better.
• Less + aidiacht le haghaidh comparáide sa treo eile: less expensive.`
    });

    D('superlatives', {
        uk: `Правила:
• The + adj-est (the tallest); двоскладові на -y: the happiest; довгі — the most + adj (the most beautiful).
• Після найвищого ступеня — in/of: the tallest in the class, the best of all.
• Наявність the майже обов’язкова.
Винятки:
• Неправильні: the best, the worst, the furthest, the least, the most.
• Прислівники: the fastest (fast), the most carefully.
• Без the, коли немає порівняння з групою: she is happiest when she sings.
• Один із найбільш…: one of the most important.`,
        en: `Rules:
• The + adj-est (the tallest); two-syllable in -y: the happiest; long ones — the most + adj (the most beautiful).
• After a superlative — in/of: the tallest in the class, the best of all.
• The is almost always required.
Exceptions:
• Irregular: the best, the worst, the furthest, the least, the most.
• Adverbs: the fastest (fast), the most carefully.
• No the when there is no comparison with a group: she is happiest when she sings.
• One of the most…: one of the most important.`,
        fr: `Règles:
• The + adjectif-est (the tallest) ; deux syllabes dans -y : the happiest ; les longs — the most + adjectif (the most beautiful).
• Après un superlatif — in/of : the tallest in the class, the best of all.
• The est presque toujours requis.
Exceptions:
• Irrégulier : the best, the worst, the furthest, the least, the most.
• Adverbes : the fastest (fast), the most carefully.
• Pas de the lorsqu'il n'y a pas de comparaison avec un groupe : she is happiest when she sings.
• L'un des plus… : one of the most important.`,
        ru: `Правила:
• The + прил (the tallest); двусложный в -y: the happiest; длинные — the most + прил (the most beautiful).
• После превосходной степени — in/of: the tallest in the class, the best of all.
• The требуется почти всегда.
Исключения:
• Неправильные формы: the best, the worst, the furthest, the least, the most.
• Наречия: the fastest (fast), the most carefully.
• Нет the, когда нет сравнения с группой: she is happiest when she sings.
• Один из самых…: one of the most important.`,
        es: `Reglas:
• The + ajuste (the tallest); bisílaba en -y: the happiest; los largos — the most + adjetivo (the most beautiful).
• Después de un superlativo: in/of: the tallest in the class, the best of all.
• Casi siempre se requiere The.
Excepciones:
• Irregular: the best, the worst, the furthest, the least, the most.
• Adverbios: the fastest (fast), the most carefully.
• No hay the cuando no hay comparación con un grupo: she is happiest when she sings.
• Uno de los más…: one of the most important.`,
        zh: `规则:
• The + 形容词-est (the tallest); -y 中的双音节：the happiest；长的 — the most + 形容词 (the most beautiful)。
• 最高级之后 — in/of：the tallest in the class, the best of all.
• The 几乎总是必需的。
例外:
• 不规则：the best, the worst, the furthest, the least, the most.
• 副词：the fastest (fast)、the most carefully.
• 没有与组进行比较时没有 the：she is happiest when she sings.
• 最…之一：one of the most important.`,
        ko: `규칙:
• The + 조정 (the tallest); -y의 2음절: the happiest; 긴 것 — the most + 형용사 (the most beautiful).
• 최상급 뒤에 오는 — in/of: the tallest in the class, the best of all.
• The는 거의 항상 필수입니다.
예외:
• 불규칙: the best, the worst, the furthest, the least, the most.
• 부사: the fastest (fast), the most carefully.
• 그룹과 비교가 없을 때 the 없음: she is happiest when she sings.
• 가장…: one of the most important.`,
        hi: `नियम:
• The + विशेषण-est (the tallest); -y पर समाप्त दो अक्षरांश वाले: the happiest; लंबे विशेषण: the most + विशेषण (the most beautiful)।
• उत्तमावस्था के बाद in/of: the tallest in the class, the best of all.
• The लगभग हमेशा आवश्यक है।
अपवाद:
• अनियमित रूप: the best, the worst, the furthest, the least, the most.
• क्रियाविशेषण: the fastest (fast), the most carefully.
• समूह से तुलना न होने पर the नहीं: she is happiest when she sings.
• «सबसे अधिक… में से एक»: one of the most important.`,
        ga: `Rialacha:
• The + aidiacht-est (the tallest); dhá shiolla dar críoch -y: the happiest; cinn fhada: the most + aidiacht (the most beautiful).
• Tar éis sárchéime, in/of: the tallest in the class, the best of all.
• Bíonn The ag teastáil beagnach i gcónaí.
Eisceachtaí:
• Neamhrialta: the best, the worst, the furthest, the least, the most.
• Dobhriathra: the fastest (fast), the most carefully.
• Gan the nuair nach bhfuil comparáid le grúpa i gceist: she is happiest when she sings.
• Ceann de na cinn is…: one of the most important.`
    });

    D('as-as-too-enough', {
        uk: `Правила:
• As + прикметник/прислівник + as: рівний ступінь (as tall as his father).
• Not as/so … as: менший ступінь (not as expensive as).
• Too + прикметник — «занадто» (негативно): it is too hot.
• Прикметник + enough — «достатньо»: old enough to drive; enough + іменник: enough money.
Винятки:
• Too much/too many з іменниками: too much noise, too many people.
• Enough ставиться ПІСЛЯ прикметника, але ПЕРЕД іменником.
• So … that / such … that — результат: so tired that…, such a long day that…
• As much/many as для кількості: as many as ten.`,
        en: `Rules:
• As + adjective/adverb + as: equal degree (as tall as his father).
• Not as/so … as: lower degree (not as expensive as).
• Too + adjective — "excessively" (negative): it is too hot.
• Adjective + enough — "sufficiently": old enough to drive; enough + noun: enough money.
Exceptions:
• Too much/too many with nouns: too much noise, too many people.
• Enough comes AFTER an adjective but BEFORE a noun.
• So … that / such … that — result: so tired that…, such a long day that…
• As much/many as for amounts: as many as ten.`,
        fr: `Règles:
• As + adjectif/adverbe + as : degré égal (as tall as his father).
• Not as/so … as : degré inférieur (not as expensive as).
• Too + adjectif — "excessivement" (négatif) : it is too hot.
• Adjectif + enough — "suffisamment" : old enough to drive; enough + nom : enough money.
Exceptions:
• Too much/too many avec les noms : too much noise, too many people.
• Enough vient APRÈS un adjectif mais AVANT un nom.
• So … that / such … that — résultat : so tired that…, such a long day that…
• As much/many as pour les montants : as many as ten.`,
        ru: `Правила:
• As + прилагательное/наречие + as: равная степень (as tall as his father).
• Not as/so … as: низшая степень (not as expensive as).
• Too + прилагательное — «чрезмерно» (отрицательный): it is too hot.
• Прилагательное + enough — «достаточно»: old enough to drive; enough + существительное: enough money.
Исключения:
• Too much/too many с существительными: too much noise, too many people.
• Enough стоит ПОСЛЕ прилагательного, но ПЕРЕД существительным.
• So … that / such … that — результат: so tired that…, such a long day that…
• As much/many as для сумм: as many as ten.`,
        es: `Reglas:
• As + adjetivo/adverbio + as: igual grado (as tall as his father).
• Not as/so … as: grado inferior (not as expensive as).
• Too + adjetivo — "excesivamente" (negativo): it is too hot.
• Adjetivo + enough — "suficientemente": old enough to drive; enough + sustantivo: enough money.
Excepciones:
• Too much/too many con sustantivos: too much noise, too many people.
• Enough viene DESPUÉS de un adjetivo pero ANTES de un sustantivo.
• So … that / such … that — resultado: so tired that…, such a long day that…
• As much/many as para importes: as many as ten.`,
        zh: `规则:
• As + 形容词/副词 + as：等度 (as tall as his father)。
• Not as/so … as：低阶(not as expensive as)。
• Too + 形容词 —“过度”（否定）：it is too hot.
• 形容词 + enough —“足够”：old enough to drive; enough + 名词：enough money.
例外:
• Too much/too many 与名词：too much noise, too many people.
• Enough 出现在形容词之后、名词之前。
• So … that / such … that — 结果：so tired that…, such a long day that…
• As much/many as 金额：as many as ten.`,
        ko: `규칙:
• As + 형용사/부사 + as: 등호 (as tall as his father).
• Not as/so … as: 낮은 등급 (not as expensive as).
• Too + 형용사 — "과도하게"(부정): it is too hot.
• 형용사 + enough — "충분히": old enough to drive; enough + 명사: enough money.
예외:
• Too much/too many(명사: too much noise, too many people.)
• Enough는 형용사 뒤에 오고 명사 앞에 옵니다.
• So … that / such … that — 결과: so tired that…, such a long day that...
• 금액: as many as ten.의 경우 As much/many as`,
        hi: `नियम:
• As + विशेषण/क्रियाविशेषण + as: समान स्तर (as tall as his father)।
• Not as/so … as: कम स्तर (not as expensive as)।
• Too + विशेषण — «ज़रूरत से अधिक» (नकारात्मक अर्थ): it is too hot.
• विशेषण + enough — «पर्याप्त»: old enough to drive; enough + संज्ञा: enough money.
अपवाद:
• संज्ञाओं के साथ Too much/too many: too much noise, too many people.
• Enough विशेषण के बाद, लेकिन संज्ञा से पहले आता है।
• So … that / such … that — परिणाम: so tired that…, such a long day that…
• मात्रा दर्शाने के लिए As much/many as: as many as ten.`,
        ga: `Rialacha:
• As + aidiacht/dobhriathar + as: an chéim chéanna (as tall as his father).
• Not as/so … as: céim níos ísle (not as expensive as).
• Too + aidiacht — «iomarcach» (diúltach): it is too hot.
• Aidiacht + enough — «leordhóthanach»: old enough to drive; enough + ainmfhocal: enough money.
Eisceachtaí:
• Too much/too many le hainmfhocail: too much noise, too many people.
• Tagann Enough TAR ÉIS aidiachta ach ROIMH ainmfhocal.
• So … that / such … that — toradh: so tired that…, such a long day that…
• As much/many as le méideanna: as many as ten.`
    });

    D('adjective-order', {
        uk: `Правила:
• Порядок: думка → розмір → вік → форма → колір → походження → матеріал → призначення + іменник: a lovely small old round red Italian wooden table.
• Запам’ятовують як OSASCOMP.
• Зазвичай не більше трьох прикметників.
Винятки:
• Кома й and між прикметниками однієї категорії: a tall, handsome man.
• Після дієслів зв’язки прикметники в будь-якому порядку: the table is old and wooden.
• Окремі сталі пари: black and white, big bad wolf.`,
        en: `Rules:
• Order: opinion → size → age → shape → colour → origin → material → purpose + noun: a lovely small old round red Italian wooden table.
• Remembered as OSASCOMP.
• Usually no more than three adjectives.
Exceptions:
• Comma/and between adjectives of the same category: a tall, handsome man.
• After linking verbs any order works: the table is old and wooden.
• Set pairs: black and white, big bad wolf.`,
        fr: `Règles:
• Ordre : avis → taille → âge → forme → couleur → origine → matière → fonction + nom : a lovely small old round red Italian wooden table.
• Mémorisé sous le nom OSASCOMP.
• Généralement pas plus de trois adjectifs.
Exceptions:
• Virgule/and entre adjectifs de même catégorie : a tall, handsome man.
• Après avoir lié les verbes, n'importe quel ordre fonctionne : the table is old and wooden.
• Définir les paires : black and white, big bad wolf.`,
        ru: `Правила:
• Порядок: мнение → размер → возраст → форма → цвет → происхождение → материал → назначение + существительное: a lovely small old round red Italian wooden table.
• Запомнился как OSASCOMP.
• Обычно не более трех прилагательных.
Исключения:
• Запятая/and между прилагательными одной категории: a tall, handsome man.
• После соединения глаголов работает любой порядок: the table is old and wooden.
• Установить пары: black and white, big bad wolf.`,
        es: `Reglas:
• Orden: opinión → tamaño → edad → forma → color → origen → material → propósito + sustantivo: a lovely small old round red Italian wooden table.
• Recordado como OSASCOMP.
• Normalmente no más de tres adjetivos.
Excepciones:
• Coma/and entre adjetivos de la misma categoría: a tall, handsome man.
• Después de vincular verbos, cualquier orden funciona: the table is old and wooden.
• Establecer pares: black and white, big bad wolf.`,
        zh: `规则:
• 顺序：意见→大小→年龄→形状→颜色→起源→材料→目的+名词：a lovely small old round red Italian wooden table.
• 记住为 OSASCOMP.
• 通常不超过三个形容词。
例外:
• 同类形容词之间的逗号/and：a tall, handsome man.
• 链接动词后任何顺序都有效：the table is old and wooden.
• 设置对：black and white, big bad wolf.`,
        ko: `규칙:
• 순서: 의견 → 크기 → 나이 → 모양 → 색상 → 원산지 → 재료 → 목적 + 명사: a lovely small old round red Italian wooden table.
• OSASCOMP.로 기억됨
• 보통 형용사는 3개 이하입니다.
예외:
• 동일 카테고리 형용사 사이의 쉼표/and: a tall, handsome man.
• 동사를 연결한 후에는 어떤 순서든 작동합니다: the table is old and wooden.
• 세트 쌍: black and white, big bad wolf.`,
        hi: `नियम:
• क्रम: राय → आकार → उम्र → आकृति → रंग → उत्पत्ति → सामग्री → प्रयोजन + संज्ञा: a lovely small old round red Italian wooden table.
• याद रखने का सूत्र: OSASCOMP.
• सामान्यतः तीन से अधिक विशेषण नहीं आते।
अपवाद:
• एक ही श्रेणी के विशेषणों के बीच अल्पविराम/and: a tall, handsome man.
• योजक क्रियाओं के बाद कोई भी क्रम संभव है: the table is old and wooden.
• रूढ़ जोड़ियाँ: black and white, big bad wolf.`,
        ga: `Rialacha:
• Ord: tuairim → méid → aois → cruth → dath → bunús → ábhar → cuspóir + ainmfhocal: a lovely small old round red Italian wooden table.
• Cuimhnítear air mar OSASCOMP.
• De ghnáth, ní bhíonn níos mó ná trí aidiacht ann.
Eisceachtaí:
• Camóg/and idir aidiachtaí den chatagóir chéanna: a tall, handsome man.
• Tar éis briathra ceangail, féadann aon ord a bheith ann: the table is old and wooden.
• Péirí seasta: black and white, big bad wolf.`
    });

    D('adverbs-manner', {
        uk: `Правила:
• Прикметник + -ly: quick → quickly, careful → carefully; приголосна + y → -ily: happy → happily.
• Ставляться після дієслова або його об’єкта: she sings beautifully; he did it carefully.
• Модифікують дієслово, прикметник або інший прислівник.
Винятки:
• Однакова форма прикметника й прислівника: fast, hard, late, early, daily, straight.
• Good → well (прислівник): she plays well.
• Hardly = майже ні, lately = останнім часом (не від hard/late).
• Дієслова зв’язки беруть прикметник: it smells good, не well (але he is well — здоровий).
• Прикметники на -ly: friendly, lovely, lonely — не прислівники.`,
        en: `Rules:
• Adjective + -ly: quick → quickly, careful → carefully; consonant + y → -ily: happy → happily.
• Placed after the verb or its object: she sings beautifully; he did it carefully.
• They modify a verb, an adjective or another adverb.
Exceptions:
• Same form for adjective and adverb: fast, hard, late, early, daily, straight.
• Good → well (adverb): she plays well.
• Hardly = almost not, lately = recently (not from hard/late).
• Linking verbs take adjectives: it smells good, not well (but he is well — healthy).
• Adjectives in -ly: friendly, lovely, lonely — not adverbs.`,
        fr: `Règles:
• Adjectif + -ly : quick → quickly, careful → carefully ; consonne + y → -ily : happy → happily.
• Placé après le verbe ou son complément : she sings beautifully; he did it carefully.
• Ils modifient un verbe, un adjectif ou un autre adverbe.
Exceptions:
• Même forme pour l'adjectif et l'adverbe : fast, hard, late, early, daily, straight.
• Good → well (adverbe) : she plays well.
• Hardly = presque pas, lately = récemment (pas de hard/late).
• Les verbes de liaison prennent des adjectifs : it smells good, pas well (mais he is well — sain).
• Adjectifs dans -ly : friendly, lovely, lonely — pas des adverbes.`,
        ru: `Правила:
• Прилагательное + -ly: quick → quickly, careful → carefully; согласная + y → -ily: happy → happily.
• Размещается после глагола или его дополнения: she sings beautifully; he did it carefully.
• Они изменяют глагол, прилагательное или другое наречие.
Исключения:
• Одинаковая форма прилагательного и наречия: fast, hard, late, early, daily, straight.
• Good → well (наречие): she plays well.
• Hardly = почти нет, lately = недавно (не из hard/late).
• Глаголы-связки принимают прилагательные: it smells good, а не well (а he is well — здоровый).
• Прилагательные в -ly: friendly, lovely, lonely — не наречия.`,
        es: `Reglas:
• Adjetivo + -ly: quick → quickly, careful → carefully; consonante + y → -ily: happy → happily.
• Colocado después del verbo o su objeto: she sings beautifully; he did it carefully.
• Modifican un verbo, un adjetivo u otro adverbio.
Excepciones:
• Misma forma para adjetivo y adverbio: fast, hard, late, early, daily, straight.
• Good → well (adverbio): she plays well.
• Hardly = casi no, lately = recientemente (no de hard/late).
• Los verbos de enlace toman adjetivos: it smells good, no well (sino he is well: saludable).
• Adjetivos en -ly: friendly, lovely, lonely, no adverbios.`,
        zh: `规则:
• 形容词 + -ly：quick → quickly, careful → carefully；辅音+y → -ily：happy → happily.
• 放在动词或其宾语后面：she sings beautifully; he did it carefully.
• 它们修饰动词、形容词或另一个副词。
例外:
• 形容词和副词的形式相同：fast, hard, late, early, daily, straight.
• Good → well（副词）：she plays well.
• Hardly = 几乎没有，lately = 最近（不是来自 hard/late）。
• 连接动词采用形容词：it smells good，而不是 well（但 he is well - 健康）。
• -ly 中的形容词：friendly, lovely, lonely — 不是副词。`,
        ko: `규칙:
• 형용사 + -ly: quick → quickly, careful → carefully; 자음 + y → -ily: happy → happily.
• 동사 또는 목적어 뒤에 위치: she sings beautifully; he did it carefully.
• 동사, 형용사 또는 다른 부사를 수식합니다.
예외:
• 형용사와 부사의 동일한 형태: fast, hard, late, early, daily, straight.
• Good → well(부사): she plays well.
• Hardly = 거의 없음, lately = 최근(hard/late 출신 아님).
• 연결 동사는 형용사를 취합니다: well가 아닌 it smells good(그러나 he is well — 건강).
• -ly의 형용사: friendly, lovely, lonely — 부사가 아닙니다.`,
        hi: `नियम:
• विशेषण + -ly: quick → quickly, careful → carefully; व्यंजन + y → -ily: happy → happily.
• क्रिया या उसके कर्म के बाद आते हैं: she sings beautifully; he did it carefully.
• ये क्रिया, विशेषण या अन्य क्रियाविशेषण की विशेषता बताते हैं।
अपवाद:
• विशेषण और क्रियाविशेषण का एक ही रूप: fast, hard, late, early, daily, straight.
• Good → well (क्रियाविशेषण): she plays well.
• Hardly = लगभग नहीं, lately = हाल में (hard/late से नहीं बनते)।
• योजक क्रियाओं के साथ विशेषण आता है: it smells good, well नहीं (लेकिन he is well — स्वस्थ)।
• -ly पर समाप्त विशेषण: friendly, lovely, lonely — क्रियाविशेषण नहीं हैं।`,
        ga: `Rialacha:
• Aidiacht + -ly: quick → quickly, careful → carefully; consan + y → -ily: happy → happily.
• Cuirtear tar éis an bhriathair nó a chuspóra iad: she sings beautifully; he did it carefully.
• Cáilíonn siad briathar, aidiacht nó dobhriathar eile.
Eisceachtaí:
• An fhoirm chéanna don aidiacht agus don dobhriathar: fast, hard, late, early, daily, straight.
• Good → well (dobhriathar): she plays well.
• Hardly = beagnach nach, lately = le déanaí (ní foirmeacha de hard/late iad).
• Glacann briathra ceangail aidiachtaí: it smells good, seachas well (ach he is well — sláintiúil).
• Aidiachtaí dar críoch -ly: friendly, lovely, lonely — ní dobhriathra iad.`
    });

    D('adverbs-frequency', {
        uk: `Правила:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• Перед основним дієсловом: she often reads; після be: he is always late; між допоміжним і основним: I have never seen it.
• Sometimes, usually, often можуть стояти на початку або в кінці для емфази.
Винятки:
• Never, hardly ever, rarely — вже заперечні: не вживаються з not (I never eat meat, не I don’t never).
• Always у present continuous — роздратування: he is always complaining.
• Фрази-частоти: every day, twice a week, once a month — в кінці речення.`,
        en: `Rules:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• Before the main verb: she often reads; after be: he is always late; between auxiliary and main verb: I have never seen it.
• Sometimes, usually, often can start or end the sentence for emphasis.
Exceptions:
• Never, hardly ever, rarely are already negative: not used with not (I never eat meat, not I don’t never).
• Always in the present continuous — annoyance: he is always complaining.
• Frequency phrases: every day, twice a week, once a month — at the end of the sentence.`,
        fr: `Règles:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• Avant le verbe principal : she often reads; après be : he is always late ; entre verbe auxiliaire et verbe principal : I have never seen it.
• Sometimes, usually, often peut commencer ou terminer la phrase pour l'accentuer.
Exceptions:
• Never, hardly ever, rarely sont déjà négatifs : non utilisés avec not (I never eat meat, pas I don’t never).
• Always dans le present continuous — gêne : he is always complaining.
• Phrases de fréquence : every day, twice a week, once a month — à la fin de la phrase.`,
        ru: `Правила:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• Перед основным глаголом: she often reads; после be: he is always late; между вспомогательным глаголом и основным глаголом: I have never seen it.
• Sometimes, usually, often может начинать или заканчивать предложение для выделения.
Исключения:
• Never, hardly ever, rarely уже отрицательные: не используются с not (I never eat meat, не I don’t never).
• Always в present continuous — раздражение: he is always complaining.
• Часто встречающиеся фразы: every day, twice a week, once a month — в конце предложения.`,
        es: `Reglas:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• Antes del verbo principal: she often reads; después de be: he is always late; entre verbo auxiliar y verbo principal: I have never seen it.
• Sometimes, usually, often puede comenzar o terminar la oración para darle énfasis.
Excepciones:
• Never, hardly ever, rarely ya son negativos: no se usan con not (I never eat meat, no I don’t never).
• Always en el present continuous — molestia: he is always complaining.
• Frases de frecuencia: every day, twice a week, once a month — al final de la oración.`,
        zh: `规则:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• 主要动词前：she often reads; be之后：he is always late；助动词和主动词之间：I have never seen it.
• Sometimes, usually, often 可以作为句子的开头或结尾来强调。
例外:
• Never, hardly ever, rarely 已经为负：不与 not 一起使用（I never eat meat，而不是 I don’t never）。
• present continuous 中的 Always — 烦恼：he is always complaining.
• 常用短语：every day, twice a week, once a month — 位于句子末尾。`,
        ko: `규칙:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• 주동사 앞: she often reads; be 이후: he is always late; 조동사와 본동사 사이: I have never seen it.
• Sometimes, usually, often는 강조를 위해 문장을 시작하거나 끝낼 수 있습니다.
예외:
• Never, hardly ever, rarely는 이미 음수입니다. not(I don’t never가 아닌 I never eat meat)와 함께 사용할 수 없습니다.
• present continuous의 Always — 성가심: he is always complaining.
• 빈도 문구: every day, twice a week, once a month — 문장 끝에.`,
        hi: `नियम:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• मुख्य क्रिया से पहले: she often reads; be के बाद: he is always late; सहायक और मुख्य क्रिया के बीच: I have never seen it.
• ज़ोर देने के लिए Sometimes, usually, often वाक्य के आरंभ या अंत में आ सकते हैं।
अपवाद:
• Never, hardly ever, rarely पहले से नकारात्मक हैं; not के साथ नहीं आते (I never eat meat, I don’t never नहीं)।
• present continuous में Always झुँझलाहट दर्शाता है: he is always complaining.
• आवृत्तिसूचक पदबंध: every day, twice a week, once a month — वाक्य के अंत में।`,
        ga: `Rialacha:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• Roimh an bpríomhbhriathar: she often reads; tar éis be: he is always late; idir an briathar cúnta agus an príomhbhriathar: I have never seen it.
• Féadann Sometimes, usually, often teacht ag tús nó deireadh abairte chun béim a chur air.
Eisceachtaí:
• Tá Never, hardly ever, rarely diúltach cheana; ní úsáidtear le not iad (I never eat meat, seachas I don’t never).
• Always sa present continuous — crá: he is always complaining.
• Nathanna minicíochta: every day, twice a week, once a month — ag deireadh na habairte.`
    });

    D('personal-pronouns', {
        uk: `Правила:
• Підмет: I, you, he, she, it, we, they; додаток: me, you, him, her, it, us, them.
• Додаток після дієслова або прийменника: she called me; give it to them.
• It — речі, тварини, безособове; he/she — особи.
Винятки:
• Після be у розмові — додаткова форма: it’s me (формально: it is I).
• У порівняннях: taller than I (формально) / than me (розм.).
• They для однієї особи невідомої статі: someone called — they left a message.
• You — ти й ви; для множини — you guys, y’all (розм.).`,
        en: `Rules:
• Subject: I, you, he, she, it, we, they; object: me, you, him, her, it, us, them.
• Object forms after a verb or preposition: she called me; give it to them.
• It — things, animals, impersonal; he/she — persons.
Exceptions:
• After be in speech — the object form: it’s me (formally: it is I).
• In comparisons: taller than I (formal) / than me (informal).
• They for one person of unknown gender: someone called — they left a message.
• You — singular and plural; for emphasis you guys, y’all (informal).`,
        fr: `Règles:
• Sujet : I, you, he, she, it, we, they ; objet : me, you, him, her, it, us, them.
• Formes d'objet après un verbe ou une préposition : she called me; give it to them.
• It — choses, animaux, impersonnels ; he/she — personnes.
Exceptions:
• Après be dans le discours — la forme objet : it’s me (officiellement : it is I).
• En comparaison : taller than I (formel) / than me (informel).
• They pour une personne de sexe inconnu : someone called — they left a message.
• You — singulier et pluriel ; pour souligner you guys, y’all (informel).`,
        ru: `Правила:
• Тема: I, you, he, she, it, we, they; объект: me, you, him, her, it, us, them.
• Объект формируется после глагола или предлога: she called me; give it to them.
• It — вещи, животные, обезличенные; he/she — лиц.
Исключения:
• После be в речи — форма объекта: it’s me (формально: it is I).
• В сравнении: taller than I (формальный) / than me (неформальный).
• They для одного человека неизвестного пола: someone called — they left a message.
• You — единственное и множественное число; для акцента you guys, y’all (неформально).`,
        es: `Reglas:
• Asunto: I, you, he, she, it, we, they; objeto: me, you, him, her, it, us, them.
• Formas del objeto después de un verbo o preposición: she called me; give it to them.
• It — cosas, animales, impersonales; he/she — personas.
Excepciones:
• Después de be en el habla, la forma del objeto: it’s me (formalmente: it is I).
• En comparaciones: taller than I (formal) / than me (informal).
• They para una persona de sexo desconocido: someone called — they left a message.
• You — singular y plural; para énfasis you guys, y’all (informal).`,
        zh: `规则:
• 主题：I, you, he, she, it, we, they；对象：me, you, him, her, it, us, them.
• 动词或介词后的宾语形式：she called me; give it to them.
• It — 事物、动物、非个人的； he/she — 人。
例外:
• 语音中的 be 之后 — 宾语形式：it’s me（正式形式：it is I）。
• 比较：taller than I（正式）/ than me（非正式）。
• They 一个性别未知的人：someone called — they left a message.
• You — 单数和复数；用于强调 you guys, y’all（非正式）。`,
        ko: `규칙:
• 제목: I, you, he, she, it, we, they; 개체: me, you, him, her, it, us, them.
• 동사 또는 전치사 뒤의 목적어 형태: she called me; give it to them.
• It — 사물, 동물, 비인격적; he/she — 명.
예외:
• 말에서 be 뒤 — 목적어 형식: it’s me(공식: it is I)
• 비교: taller than I(공식) / than me(비공식)
• 성별을 알 수 없는 1인의 경우 They: someone called — they left a message.
• You — 단수 및 복수; you guys, y’all(비공식)을 강조합니다.`,
        hi: `नियम:
• कर्ता: I, you, he, she, it, we, they; कर्म: me, you, him, her, it, us, them.
• क्रिया या संबंधसूचक अव्यय के बाद कर्मरूप: she called me; give it to them.
• It — वस्तुएँ, प्राणी, निर्वैयक्तिक प्रयोग; he/she — व्यक्ति।
अपवाद:
• बोलचाल में be के बाद कर्मरूप: it’s me (औपचारिक: it is I)।
• तुलना में: taller than I (औपचारिक) / than me (अनौपचारिक)।
• अज्ञात लिंग वाले एक व्यक्ति के लिए They: someone called — they left a message.
• You — एकवचन और बहुवचन; ज़ोर देने के लिए you guys, y’all (अनौपचारिक)।`,
        ga: `Rialacha:
• Ainmní: I, you, he, she, it, we, they; cuspóir: me, you, him, her, it, us, them.
• Foirmeacha cuspóireacha tar éis briathair nó réamhfhocail: she called me; give it to them.
• It — rudaí, ainmhithe, neamhphearsanta; he/she — daoine.
Eisceachtaí:
• Tar éis be sa chaint, an fhoirm chuspóireach: it’s me (go foirmiúil: it is I).
• I gcomparáidí: taller than I (foirmiúil) / than me (neamhfhoirmiúil).
• They do dhuine amháin nach eol a inscne: someone called — they left a message.
• You — uatha agus iolra; le haghaidh béime, you guys, y’all (neamhfhoirmiúil).`
    });

    D('reflexive-pronouns', {
        uk: `Правила:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• Дія повертається на виконавця: she hurt herself; he taught himself.
• Для підкреслення: I did it myself; by + reflexive = самотужки: by myself.
Винятки:
• Багато дієслів, зворотних в інших мовах, у англійській без reflexive: wash, shave, dress, feel, relax, hurry (he washed, not he washed himself — якщо очевидно).
• Множина — -selves, однина — -self.
• Each other / one another — взаємність, не reflexive: they love each other.`,
        en: `Rules:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• The action returns to the doer: she hurt herself; he taught himself.
• For emphasis: I did it myself; by + reflexive = alone: by myself.
Exceptions:
• Many verbs reflexive in other languages take no reflexive in English: wash, shave, dress, feel, relax, hurry (he washed — not he washed himself when obvious).
• -selves for plural, -self for singular.
• Each other / one another — reciprocal, not reflexive: they love each other.`,
        fr: `Règles:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• L'action revient à celui qui l'a fait : she hurt herself; he taught himself.
• Pour souligner : I did it myself; by + réflexif = seul : by myself.
Exceptions:
• De nombreux verbes réfléchis dans d'autres langues ne prennent pas de reflet en anglais : wash, shave, dress, feel, relax, hurry (he washed — not he washed himself lorsqu'il est évident).
• -selves pour le pluriel, -self pour le singulier.
• Each other / one another — réciproque, non réflexif : they love each other.`,
        ru: `Правила:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• Действие возвращается к исполнителю: she hurt herself; he taught himself.
• Для ударения: I did it myself; by + рефлексивное = отдельно: by myself.
Исключения:
• Многие возвратные глаголы в других языках не требуют возвратного глагола в английском языке: wash, shave, dress, feel, relax, hurry (he washed — not he washed himself, если это очевидно).
• -selves для множественного числа, -self для единственного числа.
• Each other / one another — взаимный, а не рефлексивный: they love each other.`,
        es: `Reglas:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• La acción vuelve al autor: she hurt herself; he taught himself.
• Para énfasis: I did it myself; by + reflexivo = solo: by myself.
Excepciones:
• Muchos verbos reflexivos en otros idiomas no aceptan reflexivo en inglés: wash, shave, dress, feel, relax, hurry (he washed — not he washed himself cuando es obvio).
• -selves para plural, -self para singular.
• Each other / one another — recíproco, no reflexivo: they love each other.`,
        zh: `规则:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• 操作返回给执行者：she hurt herself; he taught himself.
• 强调：I did it myself; by + 自反=单独：by myself.
例外:
• 许多其他语言中的反身动词在英语中不做反身：wash, shave, dress, feel, relax, hurry（明显时为 he washed — not he washed himself）。
• -selves 表示复数，-self 表示单数。
• Each other / one another — 倒数，非自反：they love each other.`,
        ko: `규칙:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• 작업이 수행자에게 반환됩니다: she hurt herself; he taught himself.
• 강조: I did it myself; by + 재귀 = 단독: by myself.
예외:
• 다른 언어의 많은 재귀 동사는 영어에서 재귀 동사를 취하지 않습니다: wash, shave, dress, feel, relax, hurry(명확한 경우 he washed — not he washed himself).
• 복수형은 -selves, 단수형은 -self
• Each other / one another — 반사적이 아닌 상호적: they love each other.`,
        hi: `नियम:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• क्रिया का प्रभाव स्वयं कर्ता पर पड़ता है: she hurt herself; he taught himself.
• ज़ोर देने के लिए: I did it myself; by + निजवाचक सर्वनाम = अकेले: by myself.
अपवाद:
• अन्य भाषाओं में निजवाचक होने वाली कई क्रियाओं के साथ अंग्रेज़ी में निजवाचक सर्वनाम नहीं आता: wash, shave, dress, feel, relax, hurry (अर्थ स्पष्ट हो तो he washed — not he washed himself)।
• बहुवचन में -selves, एकवचन में -self।
• Each other / one another — परस्परवाचक, निजवाचक नहीं: they love each other.`,
        ga: `Rialacha:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• Filleann an gníomh ar an ngníomhaí: she hurt herself; he taught himself.
• Le haghaidh béime: I did it myself; by + forainm athfhillteach = ina aonar: by myself.
Eisceachtaí:
• Ní ghlacann mórán briathra atá athfhillteach i dteangacha eile forainm athfhillteach sa Bhéarla: wash, shave, dress, feel, relax, hurry (he washed — not he washed himself nuair atá an bhrí soiléir).
• -selves don iolra, -self don uatha.
• Each other / one another — cómhalartach, ní athfhillteach: they love each other.`
    });

    D('relative-pronouns', {
        uk: `Правила:
• Who — особи; which — речі; that — особи й речі (обмежувальні речення); whose — належність; where — місце; when — час.
• Who/which/that можуть бути підметом (the man who called) або додатком (the book that I read).
• Whom — формальний додаток (the man whom I met).
Винятки:
• Займенник (that/who/which) можна опустити, коли він — додаток: the book (that) I read.
• That не вживається після прийменника та в необмежувальних реченнях.
• Which може відноситись до цілого речення: he was late, which annoyed me.
• Whose — і для речей: a house whose roof is red.`,
        en: `Rules:
• Who — people; which — things; that — people and things (defining clauses); whose — possession; where — place; when — time.
• Who/which/that may be subject (the man who called) or object (the book that I read).
• Whom — formal object (the man whom I met).
Exceptions:
• That/who/which can be dropped when it is the object: the book (that) I read.
• That is not used after a preposition or in non-defining clauses.
• Which may refer to the whole clause: he was late, which annoyed me.
• Whose — also for things: a house whose roof is red.`,
        fr: `Règles:
• Who — personnes ; which — des choses ; that — personnes et choses (propositions de définition) ; whose — possession ; where — lieu ; when — heure.
• Who/which/that peut être le sujet (the man who called) ou l'objet (the book that I read).
• Whom — objet formel (the man whom I met).
Exceptions:
• That/who/which peut être supprimé lorsqu'il s'agit de l'objet : the book (that) I read.
• That n'est pas utilisé après une préposition ou dans des propositions non définissantes.
• Which peut faire référence à la proposition entière : he was late, which annoyed me.
• Whose — aussi pour les choses : a house whose roof is red.`,
        ru: `Правила:
• Who — люди; which — вещи; that — люди и вещи (определяющие предложения); whose — владение; where — место; when — время.
• Who/which/that может быть субъектом (the man who called) или объектом (the book that I read).
• Whom — формальный объект (the man whom I met).
Исключения:
• That/who/which можно удалить, если это объект: the book (that) I read.
• That не используется после предлога или в неопределяющих предложениях.
• Which может относиться ко всему предложению: he was late, which annoyed me.
• Whose — также для вещей: a house whose roof is red.`,
        es: `Reglas:
• Who — personas; which—cosas; that — personas y cosas (cláusulas definitorias); whose—posesión; where—lugar; when — tiempo.
• Who/which/that puede ser el sujeto (the man who called) o el objeto (the book that I read).
• Whom — objeto formal (the man whom I met).
Excepciones:
• That/who/which se puede eliminar cuando es el objeto: the book (that) I read.
• That no se usa después de una preposición ni en cláusulas no definitorias.
• Which puede hacer referencia a la cláusula completa: he was late, which annoyed me.
• Whose — también para cosas: a house whose roof is red.`,
        zh: `规则:
• Who — 人； which——事物； that——人和事（定义从句）； whose——占有； where——地点； when — 时间。
• Who/which/that 可能是主体 (the man who called) 或客体 (the book that I read)。
• Whom — 形式对象 (the man whom I met)。
例外:
• That/who/which 为对象时可以删除：the book (that) I read.
• That 不用于介词之后或非定义从句中。
• Which 可以指整个子句：he was late, which annoyed me.
• Whose — 也适用于：a house whose roof is red.`,
        ko: `규칙:
• Who — 사람; which — 사물; that — 사람과 사물(정의절); whose — 소유; where — 장소; when — 시간.
• Who/which/that는 주어 (the man who called) 또는 개체 (the book that I read)일 수 있습니다.
• Whom — 형식 객체 (the man whom I met).
예외:
• That/who/which는 객체인 경우 삭제할 수 있습니다: the book (that) I read.
• That는 전치사 뒤나 정의하지 않는 절에서는 사용되지 않습니다.
• Which는 전체 조항을 나타낼 수 있습니다: he was late, which annoyed me.
• Whose — 사물용: a house whose roof is red.`,
        hi: `नियम:
• Who — व्यक्ति; which — वस्तुएँ; that — व्यक्ति और वस्तुएँ (पहचान निर्धारित करने वाले उपवाक्य); whose — स्वामित्व; where — स्थान; when — समय।
• Who/which/that कर्ता (the man who called) या कर्म (the book that I read) हो सकता है।
• Whom — औपचारिक कर्मरूप (the man whom I met)।
अपवाद:
• कर्म होने पर That/who/which छोड़ा जा सकता है: the book (that) I read.
• That संबंधसूचक अव्यय के बाद या अतिरिक्त जानकारी वाले उपवाक्यों में नहीं आता।
• Which पूरे उपवाक्य की ओर संकेत कर सकता है: he was late, which annoyed me.
• Whose — वस्तुओं के लिए भी: a house whose roof is red.`,
        ga: `Rialacha:
• Who — daoine; which — rudaí; that — daoine agus rudaí (clásail shainmhínitheacha); whose — seilbh; where — áit; when — am.
• Féadann Who/which/that a bheith ina ainmní (the man who called) nó ina chuspóir (the book that I read).
• Whom — cuspóir foirmiúil (the man whom I met).
Eisceachtaí:
• Féadfar That/who/which a fhágáil ar lár nuair is cuspóir é: the book (that) I read.
• Ní úsáidtear That tar éis réamhfhocail ná i gclásail neamhshainmhínitheacha.
• Féadann Which tagairt don chlásal iomlán: he was late, which annoyed me.
• Whose — le rudaí freisin: a house whose roof is red.`
    });

    D('defining-non-defining', {
        uk: `Правила:
• Обмежувальне (defining) — необхідне для ідентифікації, БЕЗ ком: the girl who lives here is my cousin.
• Необмежувальне (non-defining) — додаткова інформація, У КОМАХ: my sister, who lives here, is a nurse.
• У необмежувальних не вживається that і не опускається займенник.
Винятки:
• Власні імена майже завжди з необмежувальним реченням: Paris, which is in France…
• Which у необмежувальному може стосуватись усього речення.
• Where/when у необмежувальних: in 2020, when the pandemic started, we moved.`,
        en: `Rules:
• Defining — needed to identify, NO commas: the girl who lives here is my cousin.
• Non-defining — extra information, IN COMMAS: my sister, who lives here, is a nurse.
• In non-defining clauses that is not used and the pronoun cannot be dropped.
Exceptions:
• Proper names almost always take a non-defining clause: Paris, which is in France…
• Which in a non-defining clause may refer to the whole sentence.
• Where/when in non-defining clauses: in 2020, when the pandemic started, we moved.`,
        fr: `Règles:
• Définition – nécessaire pour identifier, PAS de virgule : the girl who lives here is my cousin.
• Non définissant — informations supplémentaires, EN VIGULES : my sister, who lives here, is a nurse.
• Dans les propositions non définissantes, that n'est pas utilisé et le pronom ne peut pas être supprimé.
Exceptions:
• Les noms propres prennent presque toujours une proposition non définissant : Paris, which is in France…
• Which dans une proposition non-définitive peut faire référence à la phrase entière.
• Where/when dans les propositions non-définitives : in 2020, when the pandemic started, we moved.`,
        ru: `Правила:
• Определение — необходимо для идентификации, БЕЗ запятых: the girl who lives here is my cousin.
• Неопределяющее — дополнительная информация, В ЗАПЯТЫХ: my sister, who lives here, is a nurse.
• В неопределяющих предложениях that не используется и местоимение не может быть отброшено.
Исключения:
• Имена собственные почти всегда содержат неопределяющее предложение: Paris, which is in France…
• Which в неопределяющем предложении может относиться ко всему предложению.
• Where/when в неопределяющих предложениях: in 2020, when the pandemic started, we moved.`,
        es: `Reglas:
• Definición: necesaria para identificar, SIN comas: the girl who lives here is my cousin.
• No definitorio: información adicional, EN COMAS: my sister, who lives here, is a nurse.
• En cláusulas no definitorias, that no se utiliza y el pronombre no se puede eliminar.
Excepciones:
• Los nombres propios casi siempre llevan una cláusula no definitoria: Paris, which is in France…
• Which en una cláusula no definitoria puede referirse a la oración completa.
• Where/when en cláusulas no definitorias: in 2020, when the pandemic started, we moved.`,
        zh: `规则:
• 定义 — 需要识别，无逗号：the girl who lives here is my cousin.
• 非定义 — 额外信息，以逗号表示：my sister, who lives here, is a nurse.
• 在非限定性从句中不使用 that，并且不能删除代词。
例外:
• 专有名称几乎总是带有非定义子句：Paris, which is in France…
• 非限定性从句中的Which可以指整个句子。
• 非定义子句中的 Where/when：in 2020, when the pandemic started, we moved.`,
        ko: `규칙:
• 정의 — 식별이 필요함, 쉼표 없음: the girl who lives here is my cousin.
• 비정의 — 추가 정보, 쉼표: my sister, who lives here, is a nurse.
• 비정의절에서는 that를 사용하지 않으며 대명사는 생략할 수 없습니다.
예외:
• 고유명사는 거의 항상 정의하지 않는 절을 사용합니다: Paris, which is in France...
• 비정의절의 Which는 문장 전체를 가리킬 수도 있습니다.
• 비정의 조항의 Where/when: in 2020, when the pandemic started, we moved.`,
        hi: `नियम:
• पहचान निर्धारित करने वाला उपवाक्य — पहचान के लिए आवश्यक; अल्पविराम नहीं: the girl who lives here is my cousin.
• अतिरिक्त जानकारी वाला उपवाक्य — अल्पविरामों के बीच: my sister, who lives here, is a nurse.
• अतिरिक्त जानकारी वाले उपवाक्य में that नहीं आता और सर्वनाम छोड़ा नहीं जा सकता।
अपवाद:
• व्यक्तिवाचक नामों के साथ लगभग हमेशा अतिरिक्त जानकारी वाला उपवाक्य आता है: Paris, which is in France…
• अतिरिक्त जानकारी वाले उपवाक्य में Which पूरे वाक्य की ओर संकेत कर सकता है।
• अतिरिक्त जानकारी वाले उपवाक्यों में Where/when: in 2020, when the pandemic started, we moved.`,
        ga: `Rialacha:
• Sainmhínitheach: riachtanach chun aithint, GAN chamóga: the girl who lives here is my cousin.
• Neamhshainmhínitheach: eolas breise, IDIR CHAMÓGA: my sister, who lives here, is a nurse.
• I gclásail neamhshainmhínitheacha, ní úsáidtear that agus ní féidir an forainm a fhágáil ar lár.
Eisceachtaí:
• Le hainmneacha dílse, úsáidtear clásal neamhshainmhínitheach beagnach i gcónaí: Paris, which is in France…
• I gclásal neamhshainmhínitheach, féadann Which tagairt don abairt iomlán.
• Where/when i gclásail neamhshainmhínitheacha: in 2020, when the pandemic started, we moved.`
    });

    D('indefinite-pronouns', {
        uk: `Правила:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — ствердження; any- — заперечення й питання; no- вже заперечення; every- — усе/всі.
• Дієслово — в однині: everyone is here.
• Для займенників з -body/-one: they/their (everyone brought their book).
Винятки:
• Some- у питаннях-пропозиціях: would you like something to drink?
• Any- у ствердженні = «будь-який»: anyone can do it.
• Не вживайте подвійне заперечення: I don’t see anything (не nothing).
• Else: someone else, nothing else.`,
        en: `Rules:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — positives; any- — negatives and questions; no- is already negative; every- — all.
• The verb is singular: everyone is here.
• For -body/-one pronouns use they/their (everyone brought their book).
Exceptions:
• Some- in offers: would you like something to drink?
• Any- in a positive = "any at all": anyone can do it.
• No double negatives: I don’t see anything (not nothing).
• Else: someone else, nothing else.`,
        fr: `Règles:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — positifs ; any- — négatifs et questions ; no- est déjà négatif ; every- — tous.
• Le verbe est au singulier : everyone is here.
• Pour les pronoms -body/-one, utilisez they/their (everyone brought their book).
Exceptions:
• Some- dans les offres : would you like something to drink?
• Any- dans un positif = "n'importe lequel" : anyone can do it.
• Pas de doubles négatifs : I don’t see anything (pas nothing).
• Else : someone else, nothing else.`,
        ru: `Правила:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — позитивы; any- — негативы и вопросы; no- уже отрицателен; every- — все.
• Глагол в единственном числе: everyone is here.
• Для местоимений -body/-one используйте they/their (everyone brought their book).
Исключения:
• Some- в предложениях: would you like something to drink?
• Any- в положительном значении = "любой вообще": anyone can do it.
• Нет двойного отрицания: I don’t see anything (не nothing).
• Else: someone else, nothing else.`,
        es: `Reglas:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — positivos; any- — negativos y preguntas; no- ya es negativo; every- — todos.
• El verbo es singular: everyone is here.
• Para los pronombres -body/-one utilice they/their (everyone brought their book).
Excepciones:
• Some- en ofertas: would you like something to drink?
• Any- en positivo = "cualquiera": anyone can do it.
• Sin dobles negativos: I don’t see anything (no nothing).
• Else: someone else, nothing else.`,
        zh: `规则:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — 积极； any-——否定和问题； no- 已经为负； every- — 全部。
• 动词是单数：everyone is here.
• 对于 -body/-one 代词，请使用 they/their (everyone brought their book)。
例外:
• 优惠中的 Some-：would you like something to drink?
• 正数中的 Any- =“任何”：anyone can do it.
• 没有双重否定：I don’t see anything（不是 nothing）。
• Else：someone else, nothing else.`,
        ko: `규칙:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — 긍정적인 점; any- — 부정문 및 질문; no-는 이미 음수입니다. every- — 모두.
• 단수형 동사: everyone is here.
• -body/-one 대명사에는 they/their (everyone brought their book)를 사용하세요.
예외:
• 쿠폰 내 Some-: would you like something to drink?
• 양수에서의 Any- = "전혀": anyone can do it.
• 이중 부정 금지: I don’t see anything(nothing 아님).
• Else: someone else, nothing else.`,
        hi: `नियम:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — सकारात्मक कथन; any- — नकारात्मक कथन और प्रश्न; no- पहले से नकारात्मक है; every- — सभी।
• क्रिया एकवचन में आती है: everyone is here.
• -body/-one वाले सर्वनामों के लिए they/their प्रयोग करें (everyone brought their book)।
अपवाद:
• प्रस्तावों में Some-: would you like something to drink?
• सकारात्मक कथन में Any- = «कोई भी»: anyone can do it.
• दोहरा नकार नहीं: I don’t see anything (nothing नहीं)।
• Else: someone else, nothing else.`,
        ga: `Rialacha:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — dearfach; any- — diúltú agus ceisteanna; tá no- diúltach cheana; every- — gach ceann.
• Bíonn an briathar san uatha: everyone is here.
• Le forainmneacha -body/-one, úsáidtear they/their (everyone brought their book).
Eisceachtaí:
• Some- i dtairiscintí: would you like something to drink?
• Any- i ráiteas dearfach = «cibé duine»: anyone can do it.
• Gan diúltú dúbailte: I don’t see anything (seachas nothing).
• Else: someone else, nothing else.`
    });

    D('there-is-it', {
        uk: `Правила:
• There is/are/was/were + підмет: існування (there is a cat on the roof; there are three apples).
• Дієслово узгоджується з наступним іменником: there is a book, there are books.
• It — формальний підмет для погоди, часу, відстані, оцінок: it is raining; it is half past nine; it is far.
Винятки:
• Розмовно there’s + множина: there’s two people (допустимо усно).
• There ≠ they’re ≠ their (орфографія).
• It is … that/to: it is important to learn.
• There seems/appears/happens to be…`,
        en: `Rules:
• There is/are/was/were + subject: existence (there is a cat on the roof; there are three apples).
• The verb agrees with the following noun: there is a book, there are books.
• It — dummy subject for weather, time, distance, evaluations: it is raining; it is half past nine; it is far.
Exceptions:
• Informally there’s + plural: there’s two people (accepted in speech).
• There ≠ they’re ≠ their (spelling).
• It is … that/to: it is important to learn.
• There seems/appears/happens to be…`,
        fr: `Règles:
• There is/are/was/were + sujet : existence (there is a cat on the roof; there are three apples).
• Le verbe s'accorde avec le nom suivant : there is a book, there are books.
• It — sujet factice pour la météo, l'heure, la distance, les évaluations : it is raining; it is half past nine; it is far.
Exceptions:
• Informellement there’s + pluriel : there’s two people (accepté oralement).
• There ≠ they’re ≠ their (orthographe).
• It is … that/to : it is important to learn.
• There seems/appears/happens to be…`,
        ru: `Правила:
• There is/are/was/were + тема: существование (there is a cat on the roof; there are three apples).
• Глагол согласуется со следующим существительным: there is a book, there are books.
• It — фиктивный субъект для погоды, времени, расстояния, оценок: it is raining; it is half past nine; it is far.
Исключения:
• Неофициально there’s + множественное число: there’s two people (принято в речи).
• There ≠ they’re ≠ their (правописание).
• It is … that/to: it is important to learn.
• There seems/appears/happens to be…`,
        es: `Reglas:
• There is/are/was/were + asunto: existencia (there is a cat on the roof; there are three apples).
• El verbo concuerda con el siguiente sustantivo: there is a book, there are books.
• It — sujeto ficticio para el clima, el tiempo, la distancia y las evaluaciones: it is raining; it is half past nine; it is far.
Excepciones:
• Informalmente there’s + plural: there’s two people (aceptado en el discurso).
• There ≠ they’re ≠ their (ortografía).
• It is … that/to: it is important to learn.
• There seems/appears/happens to be…`,
        zh: `规则:
• There is/are/was/were + 主题：存在 (there is a cat on the roof; there are three apples)。
• 动词与以下名词一致：there is a book, there are books.
• It — 天气、时间、距离、评估的虚拟主题：it is raining; it is half past nine; it is far.
例外:
• 非正式地 there’s + 复数：there’s two people（在演讲中接受）。
• There ≠ they’re ≠ their（拼写）。
• It is … that/to：it is important to learn.
• There seems/appears/happens to be…`,
        ko: `규칙:
• There is/are/was/were + 제목: 존재 (there is a cat on the roof; there are three apples).
• 동사는 다음 명사와 일치합니다: there is a book, there are books.
• It — 날씨, 시간, 거리, 평가를 위한 더미 주어: it is raining; it is half past nine; it is far.
예외:
• 비공식적으로 there’s + 복수형: there’s two people(음성으로 사용)
• There ≠ they’re ≠ their(철자법).
• It is … that/to: it is important to learn.
• There seems/appears/happens to be…`,
        hi: `नियम:
• There is/are/was/were + कर्ता: अस्तित्व (there is a cat on the roof; there are three apples)।
• क्रिया बाद में आने वाली संज्ञा के वचन के अनुसार होती है: there is a book, there are books.
• It — मौसम, समय, दूरी और मूल्यांकन में औपचारिक कर्ता: it is raining; it is half past nine; it is far.
अपवाद:
• अनौपचारिक रूप में there’s + बहुवचन: there’s two people (बोलचाल में स्वीकृत)।
• There ≠ they’re ≠ their (वर्तनी)।
• It is … that/to: it is important to learn.
• There seems/appears/happens to be…`,
        ga: `Rialacha:
• There is/are/was/were + ainmní: bheith ann (there is a cat on the roof; there are three apples).
• Réitíonn an briathar leis an ainmfhocal a leanann é: there is a book, there are books.
• It — ainmní foirmiúil le haimsir, am, fad agus measúnuithe: it is raining; it is half past nine; it is far.
Eisceachtaí:
• Go neamhfhoirmiúil, there’s + iolra: there’s two people (glactar leis sa chaint).
• There ≠ they’re ≠ their (litriú).
• It is … that/to: it is important to learn.
• There seems/appears/happens to be…`
    });

    D('negatives', {
        uk: `Правила:
• Допоміжне + not: is not/isn’t, have not/haven’t, will not/won’t; у простих часах — do/does/did + not + основа: she doesn’t like it.
• No, never, nobody, nothing, nowhere, neither, none також заперечують.
• У англійській ОДНЕ заперечення в частині: I don’t know anything (= I know nothing).
Винятки:
• Be/модальні — без do: she isn’t, he can’t.
• Подвійне заперечення в стандартній мові — помилка, у діалектах — підсилення.
• Заперечення + any → no-: I don’t have any money = I have no money.
• Neither/nor → інверсія: neither do I, nor will he.
• Don’t + дієслово — заборона (don’t go), без підмета.`,
        en: `Rules:
• Auxiliary + not: is not/isn’t, have not/haven’t, will not/won’t; in simple tenses do/does/did + not + base verb: she doesn’t like it.
• No, never, nobody, nothing, nowhere, neither, none also negate.
• English uses ONE negative per clause: I don’t know anything (= I know nothing).
Exceptions:
• Be/modals — no do: she isn’t, he can’t.
• Double negatives are wrong in standard English; in dialects they intensify.
• Negative + any → no-: I don’t have any money = I have no money.
• Neither/nor → inversion: neither do I, nor will he.
• Don’t + verb — a prohibition (don’t go), no subject.`,
        fr: `Règles:
• Auxiliaire + not : is not/isn’t, have not/haven’t, will not/won’t ; aux temps simples do/does/did + not + forme base du verbe : she doesn’t like it.
• No, never, nobody, nothing, nowhere, neither, none annule également.
• L'anglais utilise UN négatif par proposition : I don’t know anything (= I know nothing).
Exceptions:
• Be/modals — pas de do : she isn’t, he can’t.
• Les doubles négations sont fausses en anglais standard ; dans les dialectes, ils s'intensifient.
• Négatif + any → no- : I don’t have any money = I have no money.
• Neither/nor → inversion : neither do I, nor will he.
• Don’t + verbe — une interdiction (don’t go), sans sujet.`,
        ru: `Правила:
• Вспомогательный + not: is not/isn’t, have not/haven’t, will not/won’t; в простом времени do/does/did + not + основная форма глагола: she doesn’t like it.
• No, never, nobody, nothing, nowhere, neither, none также отрицает.
• В английском языке используется ОДНО отрицание в каждом предложении: I don’t know anything (= I know nothing).
Исключения:
• Be/modals — нет do: she isn’t, he can’t.
• Двойное отрицание неверно в стандартном английском языке; в диалектах они усиливаются.
• Отрицательный + any → no-: I don’t have any money = I have no money.
• Neither/nor → инверсия: neither do I, nor will he.
• Don’t + глагол — запрет (don’t go), без подлежащего.`,
        es: `Reglas:
• Auxiliar + not: is not/isn’t, have not/haven’t, will not/won’t; en tiempos simples do/does/did + not + forma base del verbo: she doesn’t like it.
• No, never, nobody, nothing, nowhere, neither, none también niega.
• El inglés usa UN negativo por cláusula: I don’t know anything (= I know nothing).
Excepciones:
• Be/modales — sin do: she isn’t, he can’t.
• Los dobles negativos son incorrectos en inglés estándar; en dialectos se intensifican.
• Negativo + any → no-: I don’t have any money = I have no money.
• Neither/nor → inversión: neither do I, nor will he.
• Don’t + verbo — una prohibición (don’t go), sin sujeto.`,
        zh: `规则:
• 辅助 + not: is not/isn’t, have not/haven’t, will not/won’t;简单时态 do/does/did + not + 动词的基本形式：she doesn’t like it.
• No, never, nobody, nothing, nowhere, neither, none 也否定。
• 英语每个子句使用一个否定：I don’t know anything (= I know nothing)。
例外:
• Be/modals — 无 do：she isn’t, he can’t.
• 标准英语中的双重否定是错误的；在方言中它们会加强。
• 负 + any → no-：I don’t have any money = I have no money.
• Neither/nor → 反转：neither do I, nor will he.
• Don’t + 动词 — 禁止 (don’t go)，无主语。`,
        ko: `규칙:
• 보조 + not: is not/isn’t, have not/haven’t, will not/won’t; 단순 시제 do/does/did + not + 동사 기본형: she doesn’t like it.
• No, never, nobody, nothing, nowhere, neither, none도 부정합니다.
• 영어에서는 절당 하나의 부정문을 사용합니다: I don’t know anything(= I know nothing).
예외:
• Be/modals — do 없음: she isn’t, he can’t.
• 표준 영어에서는 이중 부정문이 잘못되었습니다. 방언에서는 그 강도가 더욱 강해집니다.
• 음수 + any → no-: I don’t have any money = I have no money.
• Neither/nor → 반전: neither do I, nor will he.
• Don’t + 동사 — (don’t go) 금지, 주어 없음.`,
        hi: `नियम:
• सहायक क्रिया + not: is not/isn’t, have not/haven’t, will not/won’t; सरल कालों में do/does/did + not + क्रिया का मूल रूप: she doesn’t like it.
• No, never, nobody, nothing, nowhere, neither, none भी नकार व्यक्त करते हैं।
• अंग्रेज़ी के प्रत्येक उपवाक्य में एक ही नकार आता है: I don’t know anything (= I know nothing)।
अपवाद:
• Be/भाववाचक सहायक क्रियाओं के साथ do नहीं आता: she isn’t, he can’t.
• मानक अंग्रेज़ी में दोहरा नकार ग़लत है; बोलियों में बल बढ़ाने के लिए आता है।
• नकारात्मक संरचना + any → no-: I don’t have any money = I have no money.
• Neither/nor → उलटा शब्दक्रम: neither do I, nor will he.
• Don’t + क्रिया — निषेध (don’t go); कर्ता नहीं होता।`,
        ga: `Rialacha:
• Briathar cúnta + not: is not/isn’t, have not/haven’t, will not/won’t; in aimsirí simplí, do/does/did + not + bunfhoirm an bhriathair: she doesn’t like it.
• Cuireann No, never, nobody, nothing, nowhere, neither, none diúltú in iúl freisin.
• Úsáidtear AON diúltú amháin in aghaidh an chlásail sa Bhéarla: I don’t know anything (= I know nothing).
Eisceachtaí:
• Be/briathra módúla — gan do: she isn’t, he can’t.
• Tá diúltú dúbailte mícheart sa Bhéarla caighdeánach; i gcanúintí, neartaíonn sé an diúltú.
• Diúltú + any → no-: I don’t have any money = I have no money.
• Neither/nor → inbhéartú: neither do I, nor will he.
• Don’t + briathar — toirmeasc (don’t go), gan ainmní.`
    });

    D('questions', {
        uk: `Правила:
• Yes/no: допоміжне перед підметом (do you like it? is she here? have you finished?).
• Wh-питання: питальне слово + допоміжне + підмет + дієслово: where do you live?
• Питання до підмета — без do і без інверсії: who called? what happened?
• В простих часах без допоміжного — do/does/did.
Винятки:
• Be в простих часах — сам виходить на початок: is she tired?
• Непрямі питання — прямий порядок слів: I wonder where she lives (не where does she live).
• Ввічливі питання: could you tell me…?
• Заперечні питання: don’t you like it? / do you not like it? (формально).`,
        en: `Rules:
• Yes/no: auxiliary before the subject (do you like it? is she here? have you finished?).
• Wh-questions: question word + auxiliary + subject + verb: where do you live?
• Subject questions — no do and no inversion: who called? what happened?
• In simple tenses without an auxiliary — do/does/did.
Exceptions:
• Be in the simple tenses moves itself to the front: is she tired?
• Indirect questions — statement word order: I wonder where she lives (not where does she live).
• Polite questions: could you tell me…?
• Negative questions: don’t you like it? / do you not like it? (formal).`,
        fr: `Règles:
• Yes/no : verbe auxiliaire avant le sujet (do you like it? is she here? have you finished?).
• Questions-Questions : mot interrogatif + verbe auxiliaire + sujet + verbe : where do you live?
• Questions sur le sujet — pas de do et pas d'inversion : who called? what happened?
• Aux temps simples sans verbe auxiliaire — do/does/did.
Exceptions:
• Be aux temps simples se déplace vers l'avant : is she tired?
• Questions indirectes — ordre des mots de l'énoncé : I wonder where she lives (et non where does she live).
• Questions polies : could you tell me…?
• Questions négatives : don’t you like it? / do you not like it? (formel).`,
        ru: `Правила:
• Yes/no: вспомогательный глагол перед подлежащим (do you like it? is she here? have you finished?).
• Wh-вопросы: вопросительное слово + вспомогательный глагол + подлежащее + глагол: where do you live?
• Тематические вопросы — без do и без инверсии: who called? what happened?
• В простых временах без вспомогательного глагола — do/does/did.
Исключения:
• Be в простых временах перемещается вперед: is she tired?
• Косвенные вопросы — порядок слов в утверждении: I wonder where she lives (не where does she live).
• Вежливые вопросы: could you tell me…?
• Отрицательные вопросы: don’t you like it? / do you not like it? (формальный).`,
        es: `Reglas:
• Yes/no: verbo auxiliar antes del sujeto (do you like it? is she here? have you finished?).
• Preguntas-wh: palabra interrogativa + verbo auxiliar + sujeto + verbo: where do you live?
• Preguntas sobre el tema: sin do ni inversión: who called? what happened?
• En tiempos simples sin verbo auxiliar: do/does/did.
Excepciones:
• Be en los tiempos simples se mueve al frente: is she tired?
• Preguntas indirectas: orden de las palabras del enunciado: I wonder where she lives (no where does she live).
• Preguntas educadas: ¿could you tell me…?
• Preguntas negativas: don’t you like it? / do you not like it? (formal).`,
        zh: `规则:
• Yes/no：主语(do you like it? is she here? have you finished?)之前的助动词。
• Wh-问题：疑问词+助动词+主语+动词：where do you live?
• 主题问题 — 没有 do 且没有倒置：who called? what happened?
• 不带助动词的简单时态 — do/does/did.
例外:
• 简单时态中的 Be 移到前面：is she tired?
• 间接疑问句 - 陈述词序：I wonder where she lives（不是 where does she live）。
• 礼貌提问：could you tell me…？
• 否定问题：don’t you like it? / do you not like it?（正式）。`,
        ko: `규칙:
• Yes/no: 주어 (do you like it? is she here? have you finished?) 앞의 조동사.
• Wh-질문: 의문사 + 조동사 + 주어 + 동사: where do you live?
• 주어 질문 - do 및 도치 없음: who called? what happened?
• 조동사가 없는 단순 시제 — do/does/did.
예외:
• 단순 시제의 Be는 앞으로 움직입니다: is she tired?
• 간접 질문 — 진술 단어 순서: I wonder where she lives(where does she live 아님).
• 정중한 질문: could you tell me...?
• 부정 질문: don’t you like it? / do you not like it?(공식).`,
        hi: `नियम:
• Yes/no प्रश्न: सहायक क्रिया कर्ता से पहले (do you like it? is she here? have you finished?)।
• प्रश्नवाचक शब्द वाले प्रश्न: प्रश्नवाचक शब्द + सहायक क्रिया + कर्ता + मुख्य क्रिया: where do you live?
• कर्ता के बारे में प्रश्न: do नहीं और उलटा शब्दक्रम नहीं: who called? what happened?
• सरल कालों में सहायक क्रिया न हो तो do/does/did.
अपवाद:
• सरल कालों में Be स्वयं आगे आता है: is she tired?
• अप्रत्यक्ष प्रश्नों में कथन का शब्दक्रम: I wonder where she lives (where does she live नहीं)।
• विनम्र प्रश्न: could you tell me…?
• नकारात्मक प्रश्न: don’t you like it? / do you not like it? (औपचारिक)।`,
        ga: `Rialacha:
• Yes/no: briathar cúnta roimh an ainmní (do you like it? is she here? have you finished?).
• Ceisteanna wh-: focal ceisteach + briathar cúnta + ainmní + briathar: where do you live?
• Ceisteanna faoin ainmní: gan do ná inbhéartú: who called? what happened?
• In aimsirí simplí gan bhriathar cúnta, úsáidtear do/does/did.
Eisceachtaí:
• In aimsirí simplí, bogann Be féin chun tosaigh: is she tired?
• Ceisteanna indíreacha: ord focal ráitis: I wonder where she lives (seachas where does she live).
• Ceisteanna cúirtéiseacha: could you tell me…?
• Ceisteanna diúltacha: don’t you like it? / do you not like it? (foirmiúil).`
    });

    D('conjunctions', {
        uk: `Правила:
• Сурядні (FANBOYS): for, and, nor, but, or, yet, so — з’єднують рівнозначні частини; перед ними — кома між двома реченнями.
• Підрядні: because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas — вводять підрядне речення.
• Підрядне може стояти на початку (кома) або після головного (без коми).
Винятки:
• Although/though/even though ≠ despite/in spite of (+ іменник/-ing): although it rained / despite the rain.
• Since — час («з тих пір») або причина («оскільки»).
• Because ≠ because of (+ іменник): because it rained / because of the rain.
• Whereas/while у значенні протиставлення.`,
        en: `Rules:
• Coordinating (FANBOYS): for, and, nor, but, or, yet, so — join equal parts; a comma before them between two clauses.
• Subordinating: because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas — introduce a subordinate clause.
• The subordinate clause may come first (comma) or after the main clause (no comma).
Exceptions:
• Although/though/even though ≠ despite/in spite of (+ noun/-ing): although it rained / despite the rain.
• Since — time ("from then") or reason ("as").
• Because ≠ because of (+ noun): because it rained / because of the rain.
• Whereas/while express contrast.`,
        fr: `Règles:
• Coordination de (FANBOYS) : for, and, nor, but, or, yet, so – joindre des parties égales ; une virgule devant eux entre deux propositions.
• Subordination : because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas — introduisez une proposition subordonnée.
• La proposition subordonnée peut venir en premier (virgule) ou après la proposition principale (pas de virgule).
Exceptions:
• Although/though/even though ≠ despite/in spite of (+ nom/-ing) : although it rained / despite the rain.
• Since — heure ("à partir de là") ou raison ("comme").
• Because ≠ because of (+ nom) : because it rained / because of the rain.
• Whereas/while exprime le contraste.`,
        ru: `Правила:
• Согласование (FANBOYS): for, and, nor, but, or, yet, so — соединить равные части; запятая перед ними между двумя предложениями.
• Подчинительное: because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas — ввести придаточное предложение.
• Придаточное предложение может идти первым (запятая) или после главного предложения (без запятой).
Исключения:
• Although/though/even though ≠ despite/in spite of (+ существительное/-ing): although it rained / despite the rain.
• Since — время («с тех пор») или причина («как»).
• Because ≠ because of (+ существительное): because it rained / because of the rain.
• Whereas/while выражает контраст.`,
        es: `Reglas:
• Coordinando (FANBOYS): for, and, nor, but, or, yet, so — unir partes iguales; una coma delante de ellos entre dos cláusulas.
• Subordinación: because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas: introduce una cláusula subordinada.
• La cláusula subordinada puede ir primero (coma) o después de la cláusula principal (sin coma).
Excepciones:
• Although/though/even though ≠ despite/in spite of (+ sustantivo/-ing): although it rained / despite the rain.
• Since — tiempo ("desde entonces") o motivo ("como").
• Because ≠ because of (+ sustantivo): because it rained / because of the rain.
• Whereas/while expresa contraste.`,
        zh: `规则:
• 协调 (FANBOYS)：for, and, nor, but, or, yet, so — 连接相等的部分；两个子句之间有一个逗号。
• 从属：because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas — 引入从句。
• 从句可以放在前面（逗号），也可以放在主句后面（没有逗号）。
例外:
• Although/though/even though ≠ despite/in spite of（+名词/-ing）：although it rained / despite the rain.
• Since — 时间（“从那时起”）或原因（“作为”）。
• Because ≠ because of（+名词）：because it rained / because of the rain.
• Whereas/while 表达对比。`,
        ko: `규칙:
• (FANBOYS) 조정: for, and, nor, but, or, yet, so — 동일한 부분을 결합합니다. 두 절 사이에 쉼표가 있습니다.
• 종속: because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas — 종속절을 소개합니다.
• 종속절이 먼저 올 수도 있고(쉼표) 주절 뒤에 올 수도 있습니다(쉼표 없음).
예외:
• Although/though/even though ≠ despite/in spite of (+ 명사/-ing): although it rained / despite the rain.
• Since — 시간("그때부터") 또는 이유("as").
• Because ≠ because of(+명사): because it rained / because of the rain.
• Whereas/while 표현 대비`,
        hi: `नियम:
• समानाधिकरण समुच्चयबोधक (FANBOYS): for, and, nor, but, or, yet, so — समान स्तर के अंश जोड़ते हैं; दो उपवाक्यों के बीच इनके पहले अल्पविराम आता है।
• अधीनस्थ समुच्चयबोधक: because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas — अधीन उपवाक्य आरंभ करते हैं।
• अधीन उपवाक्य पहले (अल्पविराम सहित) या मुख्य उपवाक्य के बाद (बिना अल्पविराम) आ सकता है।
अपवाद:
• Although/though/even though ≠ despite/in spite of (+ संज्ञा/-ing): although it rained / despite the rain.
• Since — समय («तब से») या कारण («क्योंकि»)।
• Because ≠ because of (+ संज्ञा): because it rained / because of the rain.
• Whereas/while विरोध दर्शाते हैं।`,
        ga: `Rialacha:
• Comhordaitheacha (FANBOYS): for, and, nor, but, or, yet, so — nascann siad codanna comhionanna; camóg rompu idir dhá chlásal.
• Fo-ordaitheacha: because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas — tosaíonn siad fochlásal.
• Féadann an fochlásal teacht ar dtús (camóg) nó tar éis an phríomhchlásail (gan chamóg).
Eisceachtaí:
• Although/though/even though ≠ despite/in spite of (+ ainmfhocal/-ing): although it rained / despite the rain.
• Since — am («ón uair sin») nó cúis («mar»).
• Because ≠ because of (+ ainmfhocal): because it rained / because of the rain.
• Cuireann Whereas/while codarsnacht in iúl.`
    });

    D('linking-words', {
        uk: `Правила:
• Протиставлення: however, nevertheless, on the other hand, in contrast, whereas.
• Наслідок: therefore, consequently, as a result, thus, so.
• Додавання: moreover, furthermore, besides, in addition, also.
• Порядок: firstly, then, finally; приклад: for example, for instance.
• На початку речення — після коми; з крапкою з комою між реченнями.
Винятки:
• However також значить «як би не» (however hard he tries) — це не зв’язка.
• Therefore, however можуть стояти у середині в комах: it was late; we, however, continued.
• But/and/so — сполучники, не зв’язки: перед ними крапка не потрібна.
• Not only … but also — парний зв’язок; інверсія лише тоді, коли not only стоїть на початку: not only did he lie, but he also left.`,
        en: `Rules:
• Contrast: however, nevertheless, on the other hand, in contrast, whereas.
• Result: therefore, consequently, as a result, thus, so.
• Addition: moreover, furthermore, besides, in addition, also.
• Order: firstly, then, finally; example: for example, for instance.
• At the start of a sentence — followed by a comma; between clauses preceded by a semicolon.
Exceptions:
• However also means "no matter how" (however hard he tries) — not a connector then.
• Therefore, however can sit in the middle between commas: it was late; we, however, continued.
• But/and/so are conjunctions, not connectors: no full stop before them.
• Not only … but also — a paired connector; inversion only when not only opens the sentence: not only did he lie, but he also left.`,
        fr: `Règles:
• Contraste : however, nevertheless, on the other hand, in contrast, whereas.
• Résultat : therefore, consequently, as a result, thus, so.
• Ajout : moreover, furthermore, besides, in addition, also.
• Commande : firstly, then, finally ; exemple : for example, for instance.
• Au début d'une phrase — suivi d'une virgule ; entre les propositions précédées d'un point-virgule.
Exceptions:
• However signifie également "peu importe comment" (however hard he tries) — ce n'est donc pas un connecteur.
• Therefore, however peut être placé entre des virgules : it was late; we, however, continued.
• But/and/so sont des conjonctions, pas des connecteurs : pas de point avant eux.
• Not only … but also — un connecteur couplé ; inversion uniquement lorsque not only ouvre la phrase : not only did he lie, but he also left.`,
        ru: `Правила:
• Контраст: however, nevertheless, on the other hand, in contrast, whereas.
• Результат: therefore, consequently, as a result, thus, so.
• Дополнение: moreover, furthermore, besides, in addition, also.
• Заказ: firstly, then, finally; пример: for example, for instance.
• В начале предложения — после запятой; между предложениями, которым предшествует точка с запятой.
Исключения:
• However также означает «независимо от того, как» (however hard he tries) — тогда это не соединитель.
• Therefore, however может находиться посередине между запятыми: it was late; we, however, continued.
• But/and/so — это союзы, а не соединители: перед ними нет точки.
• Not only … but also — парный разъем; инверсия только тогда, когда not only открывает предложение: not only did he lie, but he also left.`,
        es: `Reglas:
• Contraste: however, nevertheless, on the other hand, in contrast, whereas.
• Resultado: therefore, consequently, as a result, thus, so.
• Adición: moreover, furthermore, besides, in addition, also.
• Pedido: firstly, then, finally; ejemplo: for example, for instance.
• Al comienzo de una oración, seguido de una coma; entre cláusulas precedidas por un punto y coma.
Excepciones:
• However también significa "no importa cómo" (however hard he tries); entonces no es un conector.
• Therefore, however puede ubicarse en el medio entre comas: it was late; we, however, continued.
• But/and/so son conjunciones, no conectores: no hay punto delante de ellos.
• Not only … but also — un conector emparejado; inversión solo cuando not only abre la frase: not only did he lie, but he also left.`,
        zh: `规则:
• 对比度：however, nevertheless, on the other hand, in contrast, whereas.
• 结果：therefore, consequently, as a result, thus, so.
• 添加：moreover, furthermore, besides, in addition, also.
• 订单：firstly, then, finally；示例：for example, for instance.
• 位于句子开头 — 后跟逗号；子句之间以分号开头。
例外:
• However 也表示“无论如何”(however hard he tries) — 则不是连接器。
• Therefore, however 可以位于逗号之间：it was late; we, however, continued.
• But/and/so 是连词，不是连接词：前面没有句号。
• Not only … but also — 配对连接器；仅当 not only 打开句子时反转：not only did he lie, but he also left.`,
        ko: `규칙:
• 대비: however, nevertheless, on the other hand, in contrast, whereas.
• 결과: therefore, consequently, as a result, thus, so.
• 추가: moreover, furthermore, besides, in addition, also.
• 주문: firstly, then, finally; 예: for example, for instance.
• 문장 시작 부분 - 그 뒤에 쉼표가 옵니다. 앞에 세미콜론이 오는 절 사이
예외:
• However는 "어떻게든" (however hard he tries)를 의미하기도 하며 커넥터가 아닙니다.
• Therefore, however는 쉼표 사이의 중간에 위치할 수 있습니다: it was late; we, however, continued.
• But/and/so는 접속사가 아니라 접속사입니다. 앞에 마침표가 없습니다.
• Not only … but also — 페어링된 커넥터; not only가 문장을 열 때만 반전: not only did he lie, but he also left.`,
        hi: `नियम:
• विरोध: however, nevertheless, on the other hand, in contrast, whereas.
• परिणाम: therefore, consequently, as a result, thus, so.
• अतिरिक्त बात: moreover, furthermore, besides, in addition, also.
• क्रम: firstly, then, finally; उदाहरण: for example, for instance.
• वाक्य के आरंभ में इनके बाद अल्पविराम; उपवाक्यों के बीच इनके पहले अर्धविराम आता है।
अपवाद:
• However का अर्थ «चाहे जितना भी» (however hard he tries) भी होता है; तब यह योजक नहीं है।
• Therefore, however वाक्य के बीच अल्पविरामों के बीच आ सकते हैं: it was late; we, however, continued.
• But/and/so समुच्चयबोधक हैं, स्वतंत्र वाक्य-योजक नहीं; इनके पहले पूर्णविराम नहीं आता।
• Not only … but also — युग्मित योजक; केवल not only से वाक्य आरंभ होने पर उलटा शब्दक्रम: not only did he lie, but he also left.`,
        ga: `Rialacha:
• Codarsnacht: however, nevertheless, on the other hand, in contrast, whereas.
• Toradh: therefore, consequently, as a result, thus, so.
• Suimiú: moreover, furthermore, besides, in addition, also.
• Ord: firstly, then, finally; sampla: for example, for instance.
• Ag tús abairte, camóg ina dhiaidh; idir clásail, leathstad roimhe.
Eisceachtaí:
• Ciallaíonn However «is cuma cé chomh» (however hard he tries) freisin; ní nascóir é ansin.
• Féadann Therefore, however teacht i lár idir chamóga: it was late; we, however, continued.
• Is cónaisc iad But/and/so, ní nascóirí abairte; ní chuirtear lánstad rompu.
• Not only … but also — nascóir péireáilte; ní dhéantar inbhéartú ach nuair a thosaíonn not only an abairt: not only did he lie, but he also left.`
    });

    D('cleft', {
        uk: `Правила:
• It + be + виділена частина + that/who: it was Tom who broke it; it was yesterday that I met her.
• What-cleft: what I need is a rest; all I want is peace.
• Підкреслює новий або контрастний елемент.
Винятки:
• Who — тільки для осіб; that — для всього (особи також).
• Дієслово після who/that узгоджується з виділеним: it is I who am responsible (формально).
• Reverse wh-cleft: a rest is what I need.
• Не вживайте у ствердженнях без контрасту: звучить нав’язливо.`,
        en: `Rules:
• It + be + highlighted part + that/who: it was Tom who broke it; it was yesterday that I met her.
• What-cleft: what I need is a rest; all I want is peace.
• Stresses new or contrastive information.
Exceptions:
• Who — only for persons; that — for everything (persons too).
• The verb after who/that agrees with the highlighted word: it is I who am responsible (formal).
• Reverse wh-cleft: a rest is what I need.
• Not for neutral statements: it sounds insistent.`,
        fr: `Règles:
• It + be + partie en surbrillance + that/who : it was Tom who broke it; it was yesterday that I met her.
• Quelle fente : what I need is a rest; all I want is peace.
• Souligne les informations nouvelles ou contrastées.
Exceptions:
• Who — uniquement pour les personnes ; that — pour tout (les personnes aussi).
• Le verbe après who/that s'accorde avec le mot surligné : it is I who am responsible (formel).
• Fente inverse : a rest is what I need.
• Pas pour les déclarations neutres : cela semble insistant.`,
        ru: `Правила:
• It + be + выделенная часть + that/who: it was Tom who broke it; it was yesterday that I met her.
• Что за щель: what I need is a rest; all I want is peace.
• Подчеркивает новую или противоречивую информацию.
Исключения:
• Who — только для лиц; that — для всего (для людей в том числе).
• Глагол после who/that согласуется с выделенным словом: it is I who am responsible (формальный).
• Обратная белая расщелина: a rest is what I need.
• Не для нейтральных заявлений: это звучит настойчиво.`,
        es: `Reglas:
• It + be + parte resaltada + that/who: it was Tom who broke it; it was yesterday that I met her.
• Qué-hendidura: what I need is a rest; all I want is peace.
• Destaca la información nueva o contrastante.
Excepciones:
• Who — sólo para personas; that — para todo (las personas también).
• El verbo después de who/that concuerda con la palabra resaltada: it is I who am responsible (formal).
• Hendidura en blanco invertida: a rest is what I need.
• No apto para declaraciones neutrales: suena insistente.`,
        zh: `规则:
• It + be + 突出显示部分 + that/who：it was Tom who broke it; it was yesterday that I met her.
• 什么裂缝：what I need is a rest; all I want is peace.
• 强调新的或对比性的信息。
例外:
• Who — 仅限个人； that — 适用于一切（也适用于人）。
• who/that 后面的动词与突出显示的单词一致：it is I who am responsible（正式）。
• 反向 wh 裂：a rest is what I need.
• 不适用于中立的陈述：听起来很坚持。`,
        ko: `규칙:
• It + be + 강조표시된 부분 + that/who: it was Tom who broke it; it was yesterday that I met her.
• 무슨 갈라진 틈: what I need is a rest; all I want is peace.
• 새롭거나 대조되는 정보를 강조합니다.
예외:
• Who — 개인에게만 해당; that — 모든 것에 적용됩니다(사람도 포함).
• who/that 뒤의 동사는 강조표시된 단어인 it is I who am responsible(격식)와 일치합니다.
• 역방향 wh-갈라짐: a rest is what I need.
• 중립적인 진술이 아닙니다. 끈질기게 들립니다.`,
        hi: `नियम:
• It + be + प्रमुखता दिया गया अंश + that/who: it was Tom who broke it; it was yesterday that I met her.
• what से बनी बलसूचक संरचना: what I need is a rest; all I want is peace.
• नई या विरोधसूचक जानकारी पर बल देती है।
अपवाद:
• Who — केवल व्यक्तियों के लिए; that — सभी के लिए, व्यक्तियों सहित।
• who/that के बाद क्रिया प्रमुखता दिए गए शब्द के अनुसार होती है: it is I who am responsible (औपचारिक)।
• उलटी wh-बलसूचक संरचना: a rest is what I need.
• तटस्थ कथन के लिए नहीं; आग्रहपूर्ण लगती है।`,
        ga: `Rialacha:
• It + be + cuid aibhsithe + that/who: it was Tom who broke it; it was yesterday that I met her.
• Struchtúr scoilte le what: what I need is a rest; all I want is peace.
• Cuireann sé béim ar eolas nua nó codarsnach.
Eisceachtaí:
• Who — le daoine amháin; that — le gach rud, daoine san áireamh.
• Réitíonn an briathar tar éis who/that leis an bhfocal aibhsithe: it is I who am responsible (foirmiúil).
• Struchtúr wh-scoilte droim ar ais: a rest is what I need.
• Ní úsáidtear le ráitis neodracha é; bíonn ton áititheach leis.`
    });

    D('inversion', {
        uk: `Правила:
• Після never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little на початку — допоміжне перед підметом: never have I seen such a view.
• В простих часах — do/does/did: rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
Винятки:
• Не потрібна, якщо прислівник не на початку: I have never seen such a view.
• Only after/only when/only if — інверсія в головній частині: only after dinner did he speak.
• So/such на початку: so tired was he that…
• Не потрібна, коли заперечний прислівник — частина підмета: hardly anyone came.`,
        en: `Rules:
• After never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little at the start — the auxiliary precedes the subject: never have I seen such a view.
• In simple tenses — do/does/did: rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
Exceptions:
• Not needed when the adverb is not first: I have never seen such a view.
• Only after/only when/only if — inversion in the main clause: only after dinner did he speak.
• So/such at the start: so tired was he that…
• Not needed when the negative word is part of the subject: hardly anyone came.`,
        fr: `Règles:
• Après never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little au début — le verbe auxiliaire précède le sujet : never have I seen such a view.
• Aux temps simples — do/does/did : rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
Exceptions:
• Pas nécessaire lorsque l'adverbe n'est pas premier : I have never seen such a view.
• Only after/only when/only if — inversion dans la proposition principale : only after dinner did he speak.
• So/such au début : so tired was he that…
• Pas nécessaire lorsque le mot négatif fait partie du sujet : hardly anyone came.`,
        ru: `Правила:
• После never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little в начале — вспомогательный глагол предшествует подлежащему: never have I seen such a view.
• В простых временах — do/does/did: rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
Исключения:
• Не требуется, если наречие не стоит первым: I have never seen such a view.
• Only after/only when/only if — инверсия в главном предложении: only after dinner did he speak.
• So/such в начале: so tired was he that…
• Не требуется, если отрицательное слово является частью темы: hardly anyone came.`,
        es: `Reglas:
• Después de never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little al principio, el verbo auxiliar precede al sujeto: never have I seen such a view.
• En tiempos simples: do/does/did: rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
Excepciones:
• No es necesario cuando el adverbio no está primero: I have never seen such a view.
• Only after/only when/only if — inversión en la cláusula principal: only after dinner did he speak.
• So/such al inicio: so tired was he that…
• No es necesario cuando la palabra negativa forma parte del asunto: hardly anyone came.`,
        zh: `规则:
• 在开头的 never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little 之后 - 助动词在主语之前：never have I seen such a view.
• 简单时态 — do/does/did: rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
例外:
• 当副词不是在前面时不需要：I have never seen such a view.
• Only after/only when/only if — 主句中的反转：only after dinner did he speak.
• So/such 开头：so tired was he that...
• 当否定词是主语的一部分时不需要：hardly anyone came.`,
        ko: `규칙:
• 시작 부분에서 never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little 이후 — 보조 동사가 주어 앞에 옵니다: never have I seen such a view.
• 단순 시제로 — do/does/did: rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
예외:
• 부사가 앞에 오지 않으면 필요하지 않음: I have never seen such a view.
• Only after/only when/only if — 주절의 반전: only after dinner did he speak.
• 시작 시 So/such: so tired was he that…
• 부정어가 주어의 일부인 경우에는 필요하지 않습니다: hardly anyone came.`,
        hi: `नियम:
• वाक्य के आरंभ में never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little के बाद सहायक क्रिया कर्ता से पहले आती है: never have I seen such a view.
• सरल कालों में do/does/did: rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
अपवाद:
• क्रियाविशेषण आरंभ में न हो तो आवश्यक नहीं: I have never seen such a view.
• Only after/only when/only if — मुख्य उपवाक्य में उलटा शब्दक्रम: only after dinner did he speak.
• आरंभ में So/such: so tired was he that…
• नकारात्मक शब्द कर्ता का भाग हो तो आवश्यक नहीं: hardly anyone came.`,
        ga: `Rialacha:
• Tar éis never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little ag tús na habairte, tagann an briathar cúnta roimh an ainmní: never have I seen such a view.
• In aimsirí simplí, do/does/did: rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
Eisceachtaí:
• Ní gá nuair nach bhfuil an dobhriathar ar dtús: I have never seen such a view.
• Only after/only when/only if — inbhéartú sa phríomhchlásal: only after dinner did he speak.
• So/such ag an tús: so tired was he that…
• Ní gá nuair atá an focal diúltach ina chuid den ainmní: hardly anyone came.`
    });

    D('participle-clauses', {
        uk: `Правила:
• Present participle (-ing): дії одночасні, активний стан — walking home, I met Tom.
• Past participle: пасив — tired, she went to bed; built in 1900, the house is old.
• Perfect participle (having + participle): дія раніше — having finished, he left.
• Підмет підрядного й головного речення — той самий.
Винятки:
• «Висячий participle» (dangling) — помилка, коли підмети різні: walking down the street, the trees looked beautiful (хто йшов?).
• Після зв’язок: while walking, after finishing, on arriving.
• Not + participle: not knowing what to do, she waited.`,
        en: `Rules:
• Present participle (-ing): simultaneous actions, active — walking home, I met Tom.
• Past participle: passive — tired, she went to bed; built in 1900, the house is old.
• Perfect participle (having + participle): earlier action — having finished, he left.
• The subject of the participle clause and the main clause is the same.
Exceptions:
• A dangling participle is an error when the subjects differ: walking down the street, the trees looked beautiful (who was walking?).
• After conjunctions: while walking, after finishing, on arriving.
• Not + participle: not knowing what to do, she waited.`,
        fr: `Règles:
• Participe présent (-ing) : actions simultanées, actives — walking home, I met Tom.
• Participe passé : passif — tired, she went to bed; built in 1900, the house is old.
• Participe parfait (having + participe) : action antérieure — having finished, he left.
• Le sujet de la proposition de participe et de la proposition principale est le même.
Exceptions:
• Un participe dangling est une erreur lorsque les sujets diffèrent : walking down the street, the trees looked beautiful (qui marchait ?).
• Après les conjonctions : while walking, after finishing, on arriving.
• Not + participe : not knowing what to do, she waited.`,
        ru: `Правила:
• Причастие настоящего времени (-ing): одновременное действие, активное — walking home, I met Tom.
• Причастие прошедшего времени: пассив — tired, she went to bed; built in 1900, the house is old.
• Причастие совершенного вида (having + причастие): более раннее действие — having finished, he left.
• Подлежащее причастного и главного предложения одинаковое.
Исключения:
• Причастие dangling является ошибкой, когда предметы различаются: walking down the street, the trees looked beautiful (кто шел?).
• После союза: while walking, after finishing, on arriving.
• Not + причастие: not knowing what to do, she waited.`,
        es: `Reglas:
• Participio presente (-ing): acciones simultáneas, activas — walking home, I met Tom.
• Participio pasado: pasivo — tired, she went to bed; built in 1900, the house is old.
• Participio perfecto (having + participio): acción anterior — having finished, he left.
• El sujeto de la cláusula de participio y de la cláusula principal es el mismo.
Excepciones:
• Un participio dangling es un error cuando los sujetos difieren: walking down the street, the trees looked beautiful (¿quién caminaba?).
• Después de las conjunciones: while walking, after finishing, on arriving.
• Not + participio: not knowing what to do, she waited.`,
        zh: `规则:
• 现在分词 (-ing)：同时动作，主动 — walking home, I met Tom.
• 过去分词：被动 — tired, she went to bed; built in 1900, the house is old.
• 完美分词（having + 分词）：之前的动作 - having finished, he left.
• 分词从句的主语与主句相同。
例外:
• 当主语不同时，dangling 分词是错误的：walking down the street, the trees looked beautiful（谁在走路？）。
• 连词后：while walking, after finishing, on arriving.
• Not + 分词：not knowing what to do, she waited.`,
        ko: `규칙:
• 현재 분사 (-ing): 동시 동작, 활성 — walking home, I met Tom.
• 과거 분사: 수동태 — tired, she went to bed; built in 1900, the house is old.
• 완료 분사(having + 분사): 이전 동작 — having finished, he left.
• 분사절과 주절의 주어는 같습니다.
예외:
• dangling 분사는 주어가 다를 때 오류입니다: walking down the street, the trees looked beautiful (누가 걷고 있었나요?)
• 접속사 뒤: while walking, after finishing, on arriving.
• Not + 분사: not knowing what to do, she waited.`,
        hi: `नियम:
• वर्तमान कृदंत (-ing): साथ-साथ होने वाले कार्य, कर्तृवाच्य — walking home, I met Tom.
• भूतकालिक कृदंत: कर्मवाच्य — tired, she went to bed; built in 1900, the house is old.
• पूर्ण कृदंत (having + कृदंत): पहले हुआ कार्य — having finished, he left.
• कृदंत वाले उपवाक्य और मुख्य उपवाक्य का कर्ता एक ही होता है।
अपवाद:
• कर्ता अलग हों तो असंबद्ध (dangling) कृदंत ग़लत है: walking down the street, the trees looked beautiful (चल कौन रहा था?)।
• समुच्चयबोधकों के बाद: while walking, after finishing, on arriving.
• Not + कृदंत: not knowing what to do, she waited.`,
        ga: `Rialacha:
• Rangabháil láithreach (-ing): gníomhartha comhuaineacha, guth gníomhach — walking home, I met Tom.
• Rangabháil chaite: guth fulangach — tired, she went to bed; built in 1900, the house is old.
• Rangabháil fhoirfe (having + rangabháil): gníomh roimhe sin — having finished, he left.
• Is ionann ainmní chlásal na rangabhála agus ainmní an phríomhchlásail.
Eisceachtaí:
• Tá rangabháil dangling mícheart nuair is éagsúil an dá ainmní: walking down the street, the trees looked beautiful (cé a bhí ag siúl?).
• Tar éis cónasc: while walking, after finishing, on arriving.
• Not + rangabháil: not knowing what to do, she waited.`
    });

    D('so-neither', {
        uk: `Правила:
• So + допоміжне + підмет — згода зі ствердженням: "I love pizza." "So do I."
• Neither/nor + допоміжне + підмет — згода з запереченням: "I can’t swim." "Neither can I."
• Допоміжне те ж, що в початковому реченні; якщо його нема — do/does/did.
Винятки:
• Me too / me neither — розмовна заміна.
• З be: "I’m tired." "So am I."
• So I do (без інверсії) означає «справді так»: "You like it." "So I do." — це не те саме, що So do I.
• Not … either замість neither: I don’t either.`,
        en: `Rules:
• So + auxiliary + subject — agreement with a positive: "I love pizza." "So do I."
• Neither/nor + auxiliary + subject — agreement with a negative: "I can’t swim." "Neither can I."
• Same auxiliary as in the first sentence; if none — do/does/did.
Exceptions:
• Me too / me neither — informal replacements.
• With be: "I’m tired." "So am I."
• "So I do" (no inversion) means "indeed I do" — different from "So do I".
• Not … either instead of neither: I don’t either.`,
        fr: `Règles:
• So + verbe auxiliaire + sujet — accord avec un positif : "I love pizza." "So do I."
• Neither/nor + verbe auxiliaire + sujet — accord avec un négatif : "I can’t swim." "Neither can I."
• Même verbe auxiliaire que dans la première phrase ; si aucun – do/does/did.
Exceptions:
• Me too / me neither — remplacements informels.
• Avec be : "I’m tired." "So am I."
• "So I do" (pas d'inversion) signifie "en effet I do" — différent de "So do I".
• Not … either au lieu de neither : I don’t either.`,
        ru: `Правила:
• So + вспомогательный глагол + подлежащее — согласие с положительным: "I love pizza." "So do I."
• Neither/nor + вспомогательный глагол + подлежащее — согласие с отрицанием: "I can’t swim." "Neither can I."
• Тот же вспомогательный глагол, что и в первом предложении; если нет — do/does/did.
Исключения:
• Me too / me neither — неофициальные замены.
• С be: "I’m tired." "So am I."
• "So I do" (без инверсии) означает "действительно I do" — в отличие от "So do I".
• Not … either вместо neither: I don’t either.`,
        es: `Reglas:
• So + verbo auxiliar + sujeto — concordancia con un positivo: "I love pizza." "So do I."
• Neither/nor + verbo auxiliar + sujeto — concordancia con negativo: "I can’t swim." "Neither can I."
• Mismo verbo auxiliar que en la primera oración; si no hay ninguno — do/does/did.
Excepciones:
• Me too / me neither: reemplazos informales.
• Con be: "I’m tired." "So am I."
• "So I do" (sin inversión) significa "de hecho I do", diferente de "So do I".
• Not … either en lugar de neither: I don’t either.`,
        zh: `规则:
• So + 助动词 + 主语 — 与肯定句一致：“I love pizza.”“So do I.”
• Neither/nor + 助动词 + 主语 — 与否定一致：“I can’t swim.”“Neither can I.”
• 助动词与第一句相同；如果没有 - do/does/did.
例外:
• Me too / me neither — 非正式替换。
• 与 be：“I’m tired.”“So am I.”
• “So I do”（无反转）表示“确实 I do”——与“So do I”不同。
• Not … either 而不是 neither：I don’t either.`,
        ko: `규칙:
• So + 조동사 + 주어 — 긍정문과 일치: "I love pizza." "So do I."
• Neither/nor + 조동사 + 주어 — 부정어 일치: "I can’t swim." "Neither can I."
• 첫 번째 문장과 동일한 조동사; 없는 경우 - do/does/did.
예외:
• Me too / me neither — 비공식 대체
• be 포함: "I’m tired." "So am I."
• "So I do"(반전 없음)는 "실제로 I do"를 의미하며 "So do I"와는 다릅니다.
• neither 대신 Not … either: I don’t either.`,
        hi: `नियम:
• So + सहायक क्रिया + कर्ता — सकारात्मक बात से सहमति: "I love pizza." "So do I."
• Neither/nor + सहायक क्रिया + कर्ता — नकारात्मक बात से सहमति: "I can’t swim." "Neither can I."
• पहले वाक्य वाली सहायक क्रिया; सहायक क्रिया न हो तो do/does/did.
अपवाद:
• Me too / me neither — अनौपचारिक विकल्प।
• be के साथ: "I’m tired." "So am I."
• "So I do" (बिना उलटे शब्दक्रम) का अर्थ «वास्तव में I do» है; "So do I" से अलग।
• neither की जगह Not … either: I don’t either.`,
        ga: `Rialacha:
• So + briathar cúnta + ainmní — aontú le ráiteas dearfach: "I love pizza." "So do I."
• Neither/nor + briathar cúnta + ainmní — aontú le ráiteas diúltach: "I can’t swim." "Neither can I."
• An briathar cúnta céanna leis an gcéad abairt; mura bhfuil ceann ann, do/does/did.
Eisceachtaí:
• Me too / me neither — roghanna neamhfhoirmiúla.
• Le be: "I’m tired." "So am I."
• Ciallaíonn "So I do" (gan inbhéartú) «go deimhin I do»; tá sé difriúil ó "So do I".
• Not … either in áit neither: I don’t either.`
    });

    D('time-markers', {
        uk: `Правила:
• Past simple: yesterday, last week, ago, in 2010, then, when.
• Present perfect: already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous: now, at the moment, currently, these days.
• Future: tomorrow, next week, soon, by then, in a year.
• Ставляться на початку або в кінці речення; частотні — перед дієсловом.
Винятки:
• Already/yet: already у ствердженнях, yet у запереченнях і питаннях (але still — «все ще»).
• Just: present perfect (I have just left) або past simple (амер. I just left).
• Ago — з минулими часами (найчастіше past simple), ніколи з present perfect, і завжди ПІСЛЯ періоду: two years ago.
• For vs since: for + тривалість, since + початок.`,
        en: `Rules:
• Past simple: yesterday, last week, ago, in 2010, then, when.
• Present perfect: already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous: now, at the moment, currently, these days.
• Future: tomorrow, next week, soon, by then, in a year.
• At the start or end of the sentence; frequency words before the verb.
Exceptions:
• Already/yet: already in positives, yet in negatives and questions (still = "still").
• Just: present perfect (I have just left) or past simple (American I just left).
• Ago — with past tenses (mostly the past simple), never with the present perfect, and always AFTER the period: two years ago.
• For vs since: for + duration, since + starting point.`,
        fr: `Règles:
• Past simple : yesterday, last week, ago, in 2010, then, when.
• Present perfect : already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous : now, at the moment, currently, these days.
• Future : tomorrow, next week, soon, by then, in a year.
• Au début ou à la fin de la phrase ; mots de fréquence avant le verbe.
Exceptions:
• Already/yet : already en positifs, yet en négatifs et questions (still = "toujours").
• Just : present perfect (I have just left) ou past simple (américain I just left).
• Ago — avec les temps passés (principalement le past simple), jamais avec le present perfect, et toujours APRÈS le point : two years ago.
• For vs since : for + durée, since + point de départ.`,
        ru: `Правила:
• Past simple: yesterday, last week, ago, in 2010, then, when.
• Present perfect: already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous: now, at the moment, currently, these days.
• Future: tomorrow, next week, soon, by then, in a year.
• В начале или конце предложения; часто встречающиеся слова перед глаголом.
Исключения:
• Already/yet: already в положительном варианте, yet в отрицательном и вопросительном (still = "все еще").
• Just: present perfect (I have just left) или past simple (американский I just left).
• Ago — с прошедшими временами (в основном past simple), никогда с present perfect и всегда ПОСЛЕ точки: two years ago.
• For vs since: for + длительность, since + начальная точка.`,
        es: `Reglas:
• Past simple: yesterday, last week, ago, in 2010, then, when.
• Present perfect: already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous: now, at the moment, currently, these days.
• Future: tomorrow, next week, soon, by then, in a year.
• Al principio o al final de la oración; palabras de frecuencia antes del verbo.
Excepciones:
• Already/yet: already en positivos, yet en negativos y preguntas (still = "todavía").
• Just: present perfect (I have just left) o past simple (I just left americano).
• Ago — con tiempos pasados (principalmente el past simple), nunca con el present perfect y siempre DESPUÉS del punto: two years ago.
• For vs since: for + duración, since + punto de inicio.`,
        zh: `规则:
• Past simple：yesterday, last week, ago, in 2010, then, when.
• Present perfect：already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous：now, at the moment, currently, these days.
• Future：tomorrow, next week, soon, by then, in a year.
• 在句子的开头或结尾；动词前的频率词。
例外:
• Already/yet：already 表示积极，yet 表示消极和问题（still =“仍然”）。
• Just：present perfect (I have just left) 或 past simple（美国 I just left）。
• Ago — 使用过去时态（主要是 past simple），从不使用 present perfect，并且总是在句号之后：two years ago.
• For vs since：for + 持续时间，since + 起点。`,
        ko: `규칙:
• Past simple: yesterday, last week, ago, in 2010, then, when.
• Present perfect: already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous: now, at the moment, currently, these days.
• Future: tomorrow, next week, soon, by then, in a year.
• 문장 시작 또는 끝 부분 동사 앞의 빈도 단어.
예외:
• Already/yet: 긍정의 경우 already, 부정 및 질문의 경우 yet(still = "still")
• Just: present perfect (I have just left) 또는 past simple(미국식 I just left)
• Ago — 과거 시제(주로 past simple)를 사용하고 present perfect를 사용하지 않으며 항상 마침표 이후: two years ago.
• For vs since: for + 기간, since + 시작점.`,
        hi: `नियम:
• Past simple: yesterday, last week, ago, in 2010, then, when.
• Present perfect: already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous: now, at the moment, currently, these days.
• Future: tomorrow, next week, soon, by then, in a year.
• वाक्य के आरंभ या अंत में; आवृत्तिसूचक शब्द क्रिया से पहले।
अपवाद:
• Already/yet: सकारात्मक कथनों में already, नकारात्मक कथनों और प्रश्नों में yet (still = «अब भी»)।
• Just: present perfect (I have just left) या past simple (अमेरिकी अंग्रेज़ी: I just left)।
• Ago — भूतकालों के साथ, मुख्यतः past simple; present perfect के साथ कभी नहीं; हमेशा अवधि के बाद: two years ago.
• For vs since: for + अवधि, since + आरंभ-बिंदु।`,
        ga: `Rialacha:
• Past simple: yesterday, last week, ago, in 2010, then, when.
• Present perfect: already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous: now, at the moment, currently, these days.
• Future: tomorrow, next week, soon, by then, in a year.
• Ag tús nó deireadh abairte; focail mhinicíochta roimh an mbriathar.
Eisceachtaí:
• Already/yet: already i ráitis dhearfacha, yet i ndiúltú agus i gceisteanna (still = «fós»).
• Just: present perfect (I have just left) nó past simple (Meiriceánach: I just left).
• Ago — le haimsirí caite, an past simple den chuid is mó; riamh leis an present perfect; TAR ÉIS na tréimhse i gcónaí: two years ago.
• For vs since: for + fad ama, since + pointe tosaigh.`
    });

    D('for-since-ago-during', {
        uk: `Правила:
• For + тривалість: for two years, for ten minutes.
• Since + початок: since 2015, since Monday, since I was a child.
• Ago + past simple: five minutes ago.
• During + подія/період: during the war, during the summer.
• While + підмет + дієслово: while I was sleeping.
Винятки:
• For + present perfect (дія триває): I have lived here for years; for + past simple (завершена тривалість): I lived there for two years.
• During відповідає на «коли»; for — на «скільки».
• For часто опускається: I waited (for) an hour; не пропускається з present perfect для тривалості.
• Since + past simple у підрядному: since I left school.`,
        en: `Rules:
• For + duration: for two years, for ten minutes.
• Since + starting point: since 2015, since Monday, since I was a child.
• Ago + past simple: five minutes ago.
• During + event/period: during the war, during the summer.
• While + subject + verb: while I was sleeping.
Exceptions:
• For + present perfect (still going): I have lived here for years; for + past simple (finished duration): I lived there for two years.
• During answers "when"; for answers "how long".
• For is often dropped: I waited (for) an hour; not dropped with the present perfect for duration.
• Since + past simple in the clause: since I left school.`,
        fr: `Règles:
• For + durée : for two years, for ten minutes.
• Since + point de départ : since 2015, since Monday, since I was a child.
• Ago + past simple : five minutes ago.
• During + événement/période : during the war, during the summer.
• While + sujet + verbe : while I was sleeping.
Exceptions:
• For + present perfect (toujours en cours) : I have lived here for years; for + past simple (durée terminée) : I lived there for two years.
• During répond "quand" ; for répond "combien de temps".
• For est souvent supprimé : I waited (for) an hour ; non abandonné avec le present perfect pendant toute la durée.
• Since + past simple dans la proposition : since I left school.`,
        ru: `Правила:
• For + продолжительность: for two years, for ten minutes.
• Since + начальная точка: since 2015, since Monday, since I was a child.
• Ago + past simple: five minutes ago.
• During + событие/период: during the war, during the summer.
• While + подлежащее + глагол: while I was sleeping.
Исключения:
• For + present perfect (все еще действует): I have lived here for years; for + past simple (завершенная продолжительность): I lived there for two years.
• During отвечает «когда»; for отвечает "как долго".
• For часто отбрасывается: I waited (for) an hour; не удаляется вместе с present perfect на протяжении всего времени.
• Since + past simple в предложении: since I left school.`,
        es: `Reglas:
• For + duración: for two years, for ten minutes.
• Since + punto de partida: since 2015, since Monday, since I was a child.
• Ago + past simple: five minutes ago.
• During + evento/período: during the war, during the summer.
• While + sujeto + verbo: while I was sleeping.
Excepciones:
• For + present perfect (aún en curso): I have lived here for years; for + past simple (duración finalizada): I lived there for two years.
• During responde "cuándo"; for responde "cuánto tiempo".
• For a menudo se elimina: I waited (for) an hour; no se cae con el present perfect mientras dure.
• Since + past simple en la cláusula: since I left school.`,
        zh: `规则:
• For + 持续时间：for two years, for ten minutes.
• Since + 起点：since 2015, since Monday, since I was a child.
• Ago + past simple：five minutes ago.
• During + 事件/周期：during the war, during the summer.
• While + 主语 + 动词：while I was sleeping.
例外:
• For + present perfect（仍在进行）：I have lived here for years; for + past simple（已完成时长）：I lived there for two years.
• During 回答“何时”； for 回答“多久”。
• For 经常掉落：I waited (for) an hour；持续时间内不会与 present perfect 一起掉落。
• 子句中的 Since + past simple：since I left school.`,
        ko: `규칙:
• For + 기간: for two years, for ten minutes.
• Since + 시작점: since 2015, since Monday, since I was a child.
• Ago + past simple: five minutes ago.
• During + 이벤트/기간: during the war, during the summer.
• While + 주어 + 동사: while I was sleeping.
예외:
• For + present perfect(아직 진행 중): I have lived here for years; for + past simple(완료 기간): I lived there for two years.
• During는 "언제"라고 대답합니다. for는 "얼마나 오래"라고 대답합니다.
• For는 종종 삭제됩니다: I waited (for) an hour; 한동안 present perfect와 함께 사용하면 안 됩니다.
• 조항의 Since + past simple: since I left school.`,
        hi: `नियम:
• For + अवधि: for two years, for ten minutes.
• Since + आरंभ-बिंदु: since 2015, since Monday, since I was a child.
• Ago + past simple: five minutes ago.
• During + घटना/अवधि: during the war, during the summer.
• While + कर्ता + क्रिया: while I was sleeping.
अपवाद:
• For + present perfect (कार्य जारी है): I have lived here for years; for + past simple (अवधि समाप्त): I lived there for two years.
• During «कब» का उत्तर देता है; for «कितनी देर» का।
• For प्रायः छोड़ दिया जाता है: I waited (for) an hour; अवधि दर्शाने वाले present perfect में नहीं छोड़ते।
• उपवाक्य में Since + past simple: since I left school.`,
        ga: `Rialacha:
• For + fad ama: for two years, for ten minutes.
• Since + pointe tosaigh: since 2015, since Monday, since I was a child.
• Ago + past simple: five minutes ago.
• During + eachtra/tréimhse: during the war, during the summer.
• While + ainmní + briathar: while I was sleeping.
Eisceachtaí:
• For + present perfect (ar siúl fós): I have lived here for years; for + past simple (fad ama críochnaithe): I lived there for two years.
• Freagraíonn During «cathain»; freagraíonn for «cá fhad».
• Is minic a fhágtar For ar lár: I waited (for) an hour; ní fhágtar ar lár é leis an present perfect chun fad ama a léiriú.
• Since + past simple sa chlásal: since I left school.`
    });

    D('prepositions-time', {
        uk: `Правила:
• At + точний час і окремі моменти: at 5 pm, at noon, at night, at the weekend (брит.).
• On + дні й дати: on Monday, on May 3, on my birthday, on Friday morning.
• In + місяці, роки, пори року, частини дня, століття: in July, in 2020, in summer, in the morning.
Винятки:
• At night, але in the morning/afternoon/evening, on Monday morning.
• At the weekend (брит.) / on the weekend (амер.).
• Не вживаються з next/last/this/every/tomorrow: next week, last Monday, this morning.
• In 10 minutes (через) vs within 10 minutes (протягом).`,
        en: `Rules:
• At + exact time and certain moments: at 5 pm, at noon, at night, at the weekend (British).
• On + days and dates: on Monday, on May 3, on my birthday, on Friday morning.
• In + months, years, seasons, parts of the day, centuries: in July, in 2020, in summer, in the morning.
Exceptions:
• At night, but in the morning/afternoon/evening, on Monday morning.
• At the weekend (British) / on the weekend (American).
• No preposition with next/last/this/every/tomorrow: next week, last Monday, this morning.
• In 10 minutes ("after") vs within 10 minutes ("during").`,
        fr: `Règles:
• At + heure exacte et certains moments : at 5 pm, at noon, at night, at the weekend (britannique).
• On + jours et dates : on Monday, on May 3, on my birthday, on Friday morning.
• In + mois, années, saisons, parties de la journée, siècles : in July, in 2020, in summer, in the morning.
Exceptions:
• At night, mais in the morning/afternoon/evening, on Monday morning.
• At the weekend (britannique) / on the weekend (américain).
• Aucune préposition avec next/last/this/every/tomorrow : next week, last Monday, this morning.
• In 10 minutes ("après") vs within 10 minutes ("pendant").`,
        ru: `Правила:
• At + точное время и определенные моменты: at 5 pm, at noon, at night, at the weekend (британский).
• On + дни и даты: on Monday, on May 3, on my birthday, on Friday morning.
• In + месяцы, годы, времена года, части суток, столетия: in July, in 2020, in summer, in the morning.
Исключения:
• At night, но in the morning/afternoon/evening, on Monday morning.
• At the weekend (Британский) / on the weekend (Американский).
• Нет предлога с next/last/this/every/tomorrow: next week, last Monday, this morning.
• In 10 minutes ("после") vs within 10 minutes ("во время").`,
        es: `Reglas:
• At + hora exacta y momentos determinados: at 5 pm, at noon, at night, at the weekend (británico).
• On + días y fechas: on Monday, on May 3, on my birthday, on Friday morning.
• In + meses, años, estaciones, partes del día, siglos: in July, in 2020, in summer, in the morning.
Excepciones:
• At night, pero in the morning/afternoon/evening, on Monday morning.
• At the weekend (británico) / on the weekend (estadounidense).
• Sin preposición con next/last/this/every/tomorrow: next week, last Monday, this morning.
• In 10 minutes ("después") vs within 10 minutes ("durante").`,
        zh: `规则:
• At + 确切时间和某些时刻：at 5 pm, at noon, at night, at the weekend（英国）。
• On + 日期和日期：on Monday, on May 3, on my birthday, on Friday morning.
• In + 月份、年份、季节、一天中的部分时间、世纪：in July, in 2020, in summer, in the morning.
例外:
• At night，但是in the morning/afternoon/evening, on Monday morning.
• At the weekend（英国）/ on the weekend（美国）。
• 没有带有 next/last/this/every/tomorrow 的介词：next week, last Monday, this morning.
• In 10 minutes（“之后”）vs within 10 minutes（“期间”）。`,
        ko: `규칙:
• At + 정확한 시간 및 특정 순간: at 5 pm, at noon, at night, at the weekend(영국).
• On + 요일 및 날짜: on Monday, on May 3, on my birthday, on Friday morning.
• In + 월, 연도, 계절, 하루 중 일부, 세기: in July, in 2020, in summer, in the morning.
예외:
• At night이지만 in the morning/afternoon/evening, on Monday morning.
• At the weekend(영국) / on the weekend(미국)
• next/last/this/every/tomorrow: next week, last Monday, this morning.에는 전치사가 없습니다
• In 10 minutes("이후") vs within 10 minutes("중").`,
        hi: `नियम:
• At + निश्चित समय और कुछ विशिष्ट क्षण: at 5 pm, at noon, at night, at the weekend (ब्रिटिश अंग्रेज़ी)।
• On + दिन और तारीखें: on Monday, on May 3, on my birthday, on Friday morning.
• In + महीने, वर्ष, ऋतुएँ, दिन के भाग, शताब्दियाँ: in July, in 2020, in summer, in the morning.
अपवाद:
• At night, लेकिन in the morning/afternoon/evening, on Monday morning.
• At the weekend (ब्रिटिश) / on the weekend (अमेरिकी)।
• next/last/this/every/tomorrow के साथ संबंधसूचक अव्यय नहीं: next week, last Monday, this morning.
• In 10 minutes («के बाद»), तुलना करें: vs within 10 minutes («के भीतर»)।`,
        ga: `Rialacha:
• At + am cruinn agus tráthanna áirithe: at 5 pm, at noon, at night, at the weekend (Béarla na Breataine).
• On + laethanta agus dátaí: on Monday, on May 3, on my birthday, on Friday morning.
• In + míonna, blianta, séasúir, codanna den lá agus céadta bliain: in July, in 2020, in summer, in the morning.
Eisceachtaí:
• At night, ach in the morning/afternoon/evening, on Monday morning.
• At the weekend (Béarla na Breataine) / on the weekend (Béarla Mheiriceá).
• Gan réamhfhocal le next/last/this/every/tomorrow: next week, last Monday, this morning.
• In 10 minutes («i gceann»), i gcomparáid le vs within 10 minutes («laistigh de»).`
    });

    D('prepositions-place', {
        uk: `Правила:
• In — всередині (in the box, in London); on — на поверхні (on the table); at — точка (at the door, at school).
• До/з: to (напрямок), from, into, out of, onto, off.
• Положення: under, over, above, below, between, among, behind, in front of, next to, opposite.
Винятки:
• In a car/taxi, але on a bus/train/plane/bike.
• At home, at work, at school (без артикля); in bed, on the way.
• In the corner (внутрішній кут) / on the corner (вулиці); at the corner (точка перехрестя).
• Over/above і under/below відрізняються: over — вертикально над, above — вище на рівні.`,
        en: `Rules:
• In — inside (in the box, in London); on — on a surface (on the table); at — a point (at the door, at school).
• To/from: to (direction), from, into, out of, onto, off.
• Position: under, over, above, below, between, among, behind, in front of, next to, opposite.
Exceptions:
• In a car/taxi, but on a bus/train/plane/bike.
• At home, at work, at school (no article); in bed, on the way.
• In the corner (inside) / on the corner (of streets); at the corner (a point of the crossing).
• Over/above and under/below differ: over — directly over, above — higher up.`,
        fr: `Règles:
• In — à l'intérieur de (in the box, in London) ; on — on une surface (on the table) ; at — un point (at the door, at school).
• To/de : à (direction), from, into, out of, onto, off.
• Position : under, over, above, below, between, among, behind, in front of, next to, opposite.
Exceptions:
• In a car/taxi, mais on a bus/train/plane/bike.
• At home, at work, at school (pas d'article) ; in bed, on the way.
• In the corner (à l'intérieur) / on the corner (des rues) ; at the corner (un point de croisement).
• Over/above et under/below diffèrent : au-dessus — directement over, above — plus haut.`,
        ru: `Правила:
• In — внутри (in the box, in London); on — on поверхность (on the table); at — точка (at the door, at school).
• To/от: до (направление), from, into, out of, onto, off.
• Должность: under, over, above, below, between, among, behind, in front of, next to, opposite.
Исключения:
• In a car/taxi, но on a bus/train/plane/bike.
• At home, at work, at school (нет статьи); in bed, on the way.
• In the corner (внутри) / on the corner (улиц); at the corner (точка пересечения).
• Over/above и under/below различаются: сверху — прямо, over, above — выше вверх.`,
        es: `Reglas:
• In — dentro de (in the box, in London); on — on una superficie (on the table); at — un punto (at the door, at school).
• To/desde: a (dirección), from, into, out of, onto, off.
• Posición: under, over, above, below, between, among, behind, in front of, next to, opposite.
Excepciones:
• In a car/taxi, pero on a bus/train/plane/bike.
• At home, at work, at school (sin artículo); in bed, on the way.
• In the corner (adentro) / on the corner (de calles); at the corner (un punto de cruce).
• Over/above y under/below se diferencian: arriba, directamente over, above, más arriba.`,
        zh: `规则:
• In — 在 (in the box, in London) 内； on — on 曲面 (on the table)； at — 一个点 (at the door, at school)。
• To/from：到（方向），from, into, out of, onto, off.
• 位置：under, over, above, below, between, among, behind, in front of, next to, opposite.
例外:
• In a car/taxi，但是on a bus/train/plane/bike.
• At home, at work, at school（无文章）； in bed, on the way.
• In the corner（内部）/ on the corner（街道）； at the corner（交叉点）。
• Over/above 和 under/below 不同：超过 - 直接 over, above - 更高。`,
        ko: `규칙:
• In — (in the box, in London) 내부; on — on 표면 (on the table); at — 포인트 (at the door, at school).
• To/출발: (방향), from, into, out of, onto, off.
• 포지션: under, over, above, below, between, among, behind, in front of, next to, opposite.
예외:
• In a car/taxi, 하지만 on a bus/train/plane/bike.
• At home, at work, at school(기사 없음); in bed, on the way.
• In the corner(내부) / on the corner(거리); at the corner (교차점).
• Over/above와 under/below는 다릅니다. over — 바로 over, above — 더 높습니다.`,
        hi: `नियम:
• In — अंदर (in the box, in London); on — on सतह पर (on the table); at — किसी बिंदु पर (at the door, at school)।
• To/from: to (दिशा), from, into, out of, onto, off.
• स्थिति: under, over, above, below, between, among, behind, in front of, next to, opposite.
अपवाद:
• In a car/taxi, लेकिन on a bus/train/plane/bike.
• At home, at work, at school (उपपद नहीं); in bed, on the way.
• In the corner (अंदर का कोना) / on the corner (सड़क का मोड़); at the corner (चौराहे का बिंदु)।
• Over/above और under/below अलग हैं: over — सीधे ऊपर, over, above — अधिक ऊँचाई पर।`,
        ga: `Rialacha:
• In — taobh istigh (in the box, in London); on — on dhromchla (on the table); at — pointe (at the door, at school).
• To/from: to (treo), from, into, out of, onto, off.
• Suíomh: under, over, above, below, between, among, behind, in front of, next to, opposite.
Eisceachtaí:
• In a car/taxi, ach on a bus/train/plane/bike.
• At home, at work, at school (gan alt); in bed, on the way.
• In the corner (taobh istigh) / on the corner (sráideanna); at the corner (pointe an trasnaithe).
• Tá difríocht idir Over/above agus under/below: over — díreach os a chionn, over, above — níos airde.`
    });

    D('verb-preposition', {
        uk: `Правила:
• Прийменник залежить від дієслова/прикметника й не випливає з перекладу: depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• Після прийменника — іменник, займенник або -ing: good at swimming.
• Прийменник лишається при питанні/відносному реченні: who are you waiting for? the man I talked to.
Винятки:
• Одні дієслова — без прийменника там, де в інших мовах він є: enter the room, discuss the problem, marry her, approach the door, reach the city.
• Одне дієслово — різні прийменники з різним значенням: look at (дивитись), look for (шукати), look after (доглядати).
• Different from/to/than — залежно від варіанту англійської.
• Arrive at (будівля), arrive in (місто/країна).`,
        en: `Rules:
• The preposition depends on the verb/adjective and does not follow from translation: depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• After a preposition — a noun, pronoun or -ing: good at swimming.
• The preposition stays in questions/relative clauses: who are you waiting for? the man I talked to.
Exceptions:
• Some verbs take no preposition where other languages do: enter the room, discuss the problem, marry her, approach the door, reach the city.
• One verb — different prepositions with different meanings: look at, look for, look after.
• Different from/to/than — depending on the variety of English.
• Arrive at (a building), arrive in (a city/country).`,
        fr: `Règles:
• La préposition dépend du verbe/adjectif et ne découle pas de la traduction : depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• Après une préposition — un nom, un pronom ou -ing : good at swimming.
• La préposition reste dans les questions/propositions relatives : who are you waiting for? the man I talked to.
Exceptions:
• Certains verbes ne prennent pas de préposition là où d'autres langues le font : enter the room, discuss the problem, marry her, approach the door, reach the city.
• Un verbe — différentes prépositions avec des significations différentes : look at, look for, look after.
• Different from/to/than — selon la variété de l'anglais.
• Arrive at (un bâtiment), arrive in (une ville/un pays).`,
        ru: `Правила:
• Предлог зависит от глагола/прилагательного и не следует из перевода: depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• После предлога — существительное, местоимение или -ing: good at swimming.
• Предлог остается в вопросительном/придаточном предложении: who are you waiting for? the man I talked to.
Исключения:
• Некоторые глаголы не имеют предлога, в отличие от других языков: enter the room, discuss the problem, marry her, approach the door, reach the city.
• Один глагол — разные предлоги с разными значениями: look at, look for, look after.
• Different from/to/than — в зависимости от разновидности английского языка.
• Arrive at (здание), arrive in (город/страна).`,
        es: `Reglas:
• La preposición depende del verbo/adjetivo y no se desprende de la traducción: depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• Después de una preposición: un sustantivo, pronombre o -ing: good at swimming.
• La preposición permanece en preguntas/cláusulas de relativo: who are you waiting for? the man I talked to.
Excepciones:
• Algunos verbos no llevan preposición mientras que otros idiomas sí lo hacen: enter the room, discuss the problem, marry her, approach the door, reach the city.
• Un verbo: diferentes preposiciones con diferentes significados: look at, look for, look after.
• Different from/to/than — dependiendo de la variedad de inglés.
• Arrive at (un edificio), arrive in (una ciudad/país).`,
        zh: `规则:
• 介词取决于动词/形容词，并非来自翻译：depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• 介词之后 - 名词、代词或 -ing：good at swimming.
• 介词留在疑问句/关系从句中：who are you waiting for? the man I talked to.
例外:
• 有些动词不带介词，而其他语言却带介词：enter the room, discuss the problem, marry her, approach the door, reach the city.
• 一个动词 — 不同的介词具有不同的含义：look at, look for, look after.
• Different from/to/than — 取决于英语的种类。
• Arrive at（建筑物），arrive in（城市/国家）。`,
        ko: `규칙:
• 전치사는 동사/형용사에 따라 다르며 번역을 따르지 않습니다: depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• 전치사 뒤 — 명사, 대명사 또는 -ing: good at swimming.
• 전치사는 의문사/관계사절에 있습니다: who are you waiting for? the man I talked to.
예외:
• 일부 동사는 다른 언어와 달리 전치사를 취하지 않습니다: enter the room, discuss the problem, marry her, approach the door, reach the city.
• 하나의 동사 — 다양한 의미를 지닌 다양한 전치사: look at, look for, look after.
• Different from/to/than — 영어의 다양성에 따라 다름.
• Arrive at(건물), arrive in(도시/국가).`,
        hi: `नियम:
• संबंधसूचक अव्यय क्रिया/विशेषण पर निर्भर है, अनुवाद से तय नहीं होता: depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• संबंधसूचक अव्यय के बाद संज्ञा, सर्वनाम या -ing: good at swimming.
• प्रश्नों और संबंधवाचक उपवाक्यों में संबंधसूचक अव्यय बना रहता है: who are you waiting for? the man I talked to.
अपवाद:
• कुछ क्रियाओं के साथ अंग्रेज़ी में संबंधसूचक अव्यय नहीं आता, जबकि अन्य भाषाओं में आता है: enter the room, discuss the problem, marry her, approach the door, reach the city.
• एक क्रिया के साथ अलग संबंधसूचक अव्यय, अलग अर्थ: look at, look for, look after.
• Different from/to/than — अंग्रेज़ी की क्षेत्रीय किस्म पर निर्भर।
• Arrive at (इमारत), arrive in (शहर/देश)।`,
        ga: `Rialacha:
• Braitheann an réamhfhocal ar an mbriathar/aidiacht, ní ar an aistriúchán: depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• Tar éis réamhfhocail: ainmfhocal, forainm nó -ing: good at swimming.
• Fanann an réamhfhocal i gceisteanna/clásail choibhneasta: who are you waiting for? the man I talked to.
Eisceachtaí:
• Ní ghlacann roinnt briathra réamhfhocal sa Bhéarla cé go nglacann a gcomhionann i dteangacha eile é: enter the room, discuss the problem, marry her, approach the door, reach the city.
• Briathar amháin, réamhfhocail éagsúla le bríonna éagsúla: look at, look for, look after.
• Different from/to/than — de réir an chineáil Bhéarla.
• Arrive at (foirgneamh), arrive in (cathair/tír).`
    });

    D('purpose-cause-result', {
        uk: `Правила:
• Мета: to + інфінітив (he saved money to travel), in order to / so as to (формальніше), so that + підмет + can/will/would (so that we can see better).
• Причина: because + речення, because of + іменник, since/as, due to, owing to.
• Наслідок: so, therefore, as a result; so + adj + that; such + (a) + noun + that.
Винятки:
• Заперечна мета: in order not to / so as not to (не to not).
• So that + would/could у минулому: she left early so that she could catch the train.
• Because of ≠ because: not because of it rained.
• Such + a + adj + noun / so + adj: such a long day / so long a day (формально).`,
        en: `Rules:
• Purpose: to + infinitive (he saved money to travel), in order to / so as to (more formal), so that + subject + can/will/would (so that we can see better).
• Cause: because + clause, because of + noun, since/as, due to, owing to.
• Result: so, therefore, as a result; so + adj + that; such + (a) + noun + that.
Exceptions:
• Negative purpose: in order not to / so as not to (not to not).
• So that + would/could in the past: she left early so that she could catch the train.
• Because of ≠ because: not because of it rained.
• Such + a + adj + noun / so + adj: such a long day / so long a day (formal).`,
        fr: `Règles:
• Objectif : to + infinitif (he saved money to travel), in order to / so as to (plus formel), so that + sujet + can/will/would (so that we can see better).
• Cause : because + proposition, because of + nom, since/as, due to, owing to.
• Résultat : so, therefore, as a result; so + adjectif + that; such + (a) + nom + that.
Exceptions:
• Objectif négatif : in order not to / so as not to (et non to not).
• So that + would/could dans le passé : she left early so that she could catch the train.
• Because of ≠ because : not because of it rained.
• Such + a + adjectif + nom / so + adjectif : such a long day / so long a day (formel).`,
        ru: `Правила:
• Цель: to + инфинитив (he saved money to travel), in order to / so as to (более формальный), so that + подлежащее + can/will/would (so that we can see better).
• Причина: because + предложение, because of + существительное, since/as, due to, owing to.
• Результат: so, therefore, as a result; so + прил + that; such + (a) + существительное + that.
Исключения:
• Отрицательная цель: in order not to / so as not to (не to not).
• So that + would/could в прошлом: she left early so that she could catch the train.
• Because of ≠ because: not because of it rained.
• Such + a + прилаг + существительное / so + прил: such a long day / so long a day (формальный).`,
        es: `Reglas:
• Propósito: to + infinitivo (he saved money to travel), in order to / so as to (más formal), so that + sujeto + can/will/would (so that we can see better).
• Causa: because + cláusula, because of + sustantivo, since/as, due to, owing to.
• Resultado: so, therefore, as a result; so + adjetivo + that; such + (a) + sustantivo + that.
Excepciones:
• Propósito negativo: in order not to / so as not to (no to not).
• So that + would/could en el pasado: she left early so that she could catch the train.
• Because of ≠ because: not because of it rained.
• Such + a + adjetivo + sustantivo / so + adjetivo: such a long day / so long a day (formal).`,
        zh: `规则:
• 目的：to + 不定式 (he saved money to travel)、in order to / so as to（更正式）、so that + 主语 + can/will/would (so that we can see better)。
• 原因：because + 子句、because of + 名词、since/as, due to, owing to.
• 结果：so, therefore, as a result; so + 形容词 + that; such + (a) + 名词 + that.
例外:
• 负面目的：in order not to / so as not to（不是 to not）。
• 过去的So that + would/could：she left early so that she could catch the train.
• Because of ≠ because：not because of it rained.
• Such + a + 形容词 + 名词 / so + 形容词：such a long day / so long a day（正式）。`,
        ko: `규칙:
• 용도: to + 부정사 (he saved money to travel), in order to / so as to(격식), so that + 주어 + can/will/would (so that we can see better).
• 원인: because + 절, because of + 명사, since/as, due to, owing to.
• 결과: so, therefore, as a result; so + 형용사 + that; such + (a) + 명사 + that.
예외:
• 부정적인 목적: in order not to / so as not to(to not 아님)
• 과거의 So that + would/could: she left early so that she could catch the train.
• Because of ≠ because: not because of it rained.
• Such + a + 형용사 + 명사 / so + 형용사: such a long day / so long a day(형식적으로).`,
        hi: `नियम:
• उद्देश्य: to + अनंत रूप (he saved money to travel), in order to / so as to (अधिक औपचारिक), so that + कर्ता + can/will/would (so that we can see better)।
• कारण: because + उपवाक्य, because of + संज्ञा, since/as, due to, owing to.
• परिणाम: so, therefore, as a result; so + विशेषण + that; such + (a) + संज्ञा + that.
अपवाद:
• नकारात्मक उद्देश्य: in order not to / so as not to (to not नहीं)।
• भूतकाल में So that + would/could: she left early so that she could catch the train.
• Because of ≠ because: not because of it rained.
• Such + a + विशेषण + संज्ञा / so + विशेषण: such a long day / so long a day (औपचारिक)।`,
        ga: `Rialacha:
• Cuspóir: to + infinideach (he saved money to travel), in order to / so as to (níos foirmiúla), so that + ainmní + can/will/would (so that we can see better).
• Cúis: because + clásal, because of + ainmfhocal, since/as, due to, owing to.
• Toradh: so, therefore, as a result; so + aidiacht + that; such + (a) + ainmfhocal + that.
Eisceachtaí:
• Cuspóir diúltach: in order not to / so as not to (seachas to not).
• So that + would/could san am atá caite: she left early so that she could catch the train.
• Because of ≠ because: not because of it rained.
• Such + a + aidiacht + ainmfhocal / so + aidiacht: such a long day / so long a day (foirmiúil).`
    });


    // ---- Tables: person · number (English has no grammatical gender on verbs). Row = "| cell | cell |", first row is the header. ----
    const TBL = (id, rows) => {
        if (!en[id]) throw new Error('details table for unknown topic ' + id);
        const block = rows.map(r => '| ' + r.join(' | ') + ' |').join('\n');
        en[id].uk += '\nВідмінювання (особа, число):\n' + block.replace('PERSON', 'Особа');
        en[id].en += '\nConjugation (person, number):\n' + block.replace('PERSON', 'Person');
    };
    TBL('present-simple', [
        ['PERSON', 'work', 'be', 'have', 'do', 'go'],
        ['I', 'work', 'am', 'have', 'do', 'go'], ['you', 'work', 'are', 'have', 'do', 'go'],
        ['he / she / it', 'works', 'is', 'has', 'does', 'goes'],
        ['we / you / they', 'work', 'are', 'have', 'do', 'go']]);
    TBL('present-continuous', [
        ['PERSON', 'be + working'],
        ['I', 'am working'], ['you', 'are working'], ['he / she / it', 'is working'], ['we / you / they', 'are working']]);
    TBL('present-perfect', [
        ['PERSON', 'have/has + worked', 'have/has + gone'],
        ['I / you / we / they', 'have worked', 'have gone'], ['he / she / it', 'has worked', 'has gone']]);
    TBL('past-simple', [
        ['PERSON', 'work (regular)', 'go (irregular)', 'be', 'have', 'do'],
        ['I', 'worked', 'went', 'was', 'had', 'did'], ['you', 'worked', 'went', 'were', 'had', 'did'],
        ['he / she / it', 'worked', 'went', 'was', 'had', 'did'], ['we / you / they', 'worked', 'went', 'were', 'had', 'did']]);
    TBL('past-continuous', [
        ['PERSON', 'was/were + working'],
        ['I / he / she / it', 'was working'], ['you / we / they', 'were working']]);
    TBL('past-perfect', [
        ['PERSON', 'had + past participle'],
        ['I / you / he / she / it / we / they', 'had worked · had gone · had been']]);
    TBL('future-will', [
        ['PERSON', 'will + base verb', 'going to'],
        ['I', 'I will work (I’ll work)', 'I am going to work'], ['you', 'you will work', 'you are going to work'],
        ['he / she / it', 'he will work', 'he is going to work'], ['we / they', 'we will work', 'we are going to work']]);
    TBL('passive-voice', [
        ['tense', 'be + past participle (singular / plural)'],
        ['present', 'the letter is written / the letters are written'], ['past', 'the letter was written / the letters were written'],
        ['present perfect', 'the letter has been written / the letters have been written'], ['future', 'the letter will be written / the letters will be written']]);
    TBL('plurals', [
        ['singular', 'plural', 'rule'],
        ['book', 'books', '+s'], ['box', 'boxes', '-x/-s/-ch/-sh → +es'], ['city', 'cities', 'consonant + y → -ies'],
        ['knife', 'knives', '-f/-fe → -ves'], ['man', 'men', 'irregular'], ['child', 'children', 'irregular'], ['sheep', 'sheep', 'unchanged']]);

    const store = window.GRAMMAR_RULE_DETAILS || (window.GRAMMAR_RULE_DETAILS = {});
    store.en = en;
})();
