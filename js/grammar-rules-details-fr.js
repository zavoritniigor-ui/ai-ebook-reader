// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
/* grammar-rules-details-fr.js — розгорнуті пояснення правил і ВИНЯТКІВ для тем французького каталогу
 * (js/grammar-rules-data-fr.js). Ключ — id теми; текст мовами інтерфейсу. Рядок, що закінчується на «:», — підзаголовок
 * («Правила:», «Винятки:»), рядок з «• » — пункт списку. Показується в панелі «Правила» під короткою теорією
 * й передається AI як опорний матеріал для «Розібрати за теорією». Класичний <script src>. */
(function () {
    const fr = {};
    const D = (id, texts) => { fr[id] = texts; };

    D('present', {
        uk: `Правила:
• Дієслова на -er (група 1, їх більшість): je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• Дієслова на -ir (finir): je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• Дієслова на -re (vendre): je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• Présent передає дію зараз, звичку, загальну істину, а з розкладом — і близьке майбутнє (le train part à neuf heures).
Винятки:
• Неправильні дієслова: être (je suis, nous sommes, ils sont), avoir (j’ai, nous avons, ils ont), aller (je vais, ils vont), faire (vous faites, ils font), dire (vous dites), venir, pouvoir, vouloir, savoir тощо — форми треба вчити.
• Орфографічні зміни в -er: manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• У tu-формі -er дієслів завжди -es (tu parles), але в наказовому способі -s відпадає (parle !).
• Не всі дієслова на -ir відмінюються як finir: partir, sortir, dormir, sentir, servir — je pars, nous partons (без -iss-); ouvrir, offrir, souffrir, cueillir — як -er (j’ouvre, tu ouvres).`,
        en: `Rules:
• -er verbs (group 1, the majority): je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• -ir verbs (finir): je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• -re verbs (vendre): je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• The présent expresses an action now, a habit, a general truth, and with a timetable also the near future (le train part à neuf heures).
Exceptions:
• Irregular verbs: être (je suis, nous sommes, ils sont), avoir (j’ai, nous avons, ils ont), aller (je vais, ils vont), faire (vous faites, ils font), dire (vous dites), venir, pouvoir, vouloir, savoir etc. — the forms must be learned.
• Spelling changes in -er verbs: manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• -er verbs take -es in the tu-form but drop the -s in the imperative (parle !).
• Not every -ir verb goes like finir: partir, sortir, dormir, sentir, servir — je pars, nous partons (no -iss-); ouvrir, offrir, souffrir, cueillir go like -er (j’ouvre, tu ouvres).`,
        fr: `Règles:
• Verbes -er (groupe 1, la majorité) : je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• Verbes -ir (finir) : je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• Verbes -re (vendre) : je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• Le présent exprime une action actuelle, une habitude, une vérité générale, et avec un calendrier également le futur proche (le train part à neuf heures).
Exceptions:
• Verbes irréguliers : être (je suis, nous sommes, ils sont), avoir (j’ai, nous avons, ils ont), aller (je vais, ils vont), faire (vous faites, ils font), dire (vous dites), venir, pouvoir, vouloir, savoir etc. — les formes doivent être apprises.
• Changements orthographiques dans les verbes -er : manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• Les verbes -er prennent -es sous la forme tu mais abandonnent -s à l'impératif (parle !).
• Tous les verbes -ir ne ressemblent pas à finir : partir, sortir, dormir, sentir, servir — je pars, nous partons (pas de -iss-) ; ouvrir, offrir, souffrir, cueillir va comme -er (j’ouvre, tu ouvres).
Conjugaison (personne, nombre, genre):
| Personne | parler | finir | vendre | être | avoir | aller | faire |
| je | parle | finis | vends | suis | ai | vais | fais |
| tu | parles | finis | vends | es | as | vas | fais |
| il / elle / on | parle | finit | vend | est | a | va | fait |
| nous | parlons | finissons | vendons | sommes | avons | allons | faisons |
| vous | parlez | finissez | vendez | êtes | avez | allez | faites |
| ils / elles | parlent | finissent | vendent | sont | ont | vont | font |`,
        ru: `Правила:
• Глаголы -er (группа 1, большинство): je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• Глаголы -ir (finir): je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• Глаголы -re (vendre): je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• présent выражает действие сейчас, привычку, общую истину, а с расписанием также и ближайшее будущее (le train part à neuf heures).
Исключения:
• Неправильные глаголы: être (je suis, nous sommes, ils sont), avoir (j’ai, nous avons, ils ont), aller (je vais, ils vont), faire (vous faites, ils font), dire (vous dites), venir, pouvoir, vouloir, savoir и т. д. — формы необходимо выучить.
• Изменения правописания глаголов -er: manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• Глаголы -er принимают -es в форме tu, но отбрасывают -s в повелительном наклонении (parle !).
• Не каждый глагол -ir выглядит как finir: partir, sortir, dormir, sentir, servir — je pars, nous partons (нет -iss-); ouvrir, offrir, souffrir, cueillir идет как -er (j’ouvre, tu ouvres).
Спряжение (лицо, число, род):
| Лицо | parler | finir | vendre | être | avoir | aller | faire |
| je | parle | finis | vends | suis | ai | vais | fais |
| tu | parles | finis | vends | es | as | vas | fais |
| il / elle / on | parle | finit | vend | est | a | va | fait |
| nous | parlons | finissons | vendons | sommes | avons | allons | faisons |
| vous | parlez | finissez | vendez | êtes | avez | allez | faites |
| ils / elles | parlent | finissent | vendent | sont | ont | vont | font |`,
        es: `Reglas:
• Verbos -er (grupo 1, la mayoría): je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• -ir verbos (finir): je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• -re verbos (vendre): je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• El présent expresa una acción ahora, un hábito, una verdad general, y con un cronograma también el futuro cercano (le train part à neuf heures).
Excepciones:
• Verbos irregulares: être (je suis, nous sommes, ils sont), avoir (j’ai, nous avons, ils ont), aller (je vais, ils vont), faire (vous faites, ils font), dire (vous dites), venir, pouvoir, vouloir, savoir, etc. — las formas deben aprenderse.
• Cambios ortográficos en los verbos -er: manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• Los verbos -er toman -es en la forma tu pero eliminan el -s en imperativo (¡parle!).
• No todos los verbos -ir son así: finir: partir, sortir, dormir, sentir, servir — je pars, nous partons (no -iss-); ouvrir, offrir, souffrir, cueillir es como -er (j’ouvre, tu ouvres).
Conjugación (persona, número, género):
| Persona | parler | finir | vendre | être | avoir | aller | faire |
| je | parle | finis | vends | suis | ai | vais | fais |
| tu | parles | finis | vends | es | as | vas | fais |
| il / elle / on | parle | finit | vend | est | a | va | fait |
| nous | parlons | finissons | vendons | sommes | avons | allons | faisons |
| vous | parlez | finissez | vendez | êtes | avez | allez | faites |
| ils / elles | parlent | finissent | vendent | sont | ont | vont | font |`,
        zh: `规则:
• -er 动词（第 1 组，大多数）：je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• -ir 动词 (finir)：je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• -re 动词 (vendre)：je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• présent 表达了现在的行动、习惯、普遍真理，以及时间表，也表达了不久的将来的 (le train part à neuf heures)。
例外:
• 不规则动词：être (je suis, nous sommes, ils sont)、avoir (j’ai, nous avons, ils ont)、aller (je vais, ils vont)、faire (vous faites, ils font)、dire (vous dites)、venir, pouvoir, vouloir, savoir 等 - 形式必须学习。
• -er 动词的拼写变化：manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• -er 动词采用 tu 形式的 -es，但在祈使句中删除 -s（parle！）。
• 并非每个 -ir 动词都像 finir：partir, sortir, dormir, sentir, servir — je pars, nous partons（没有 -iss-）； ouvrir, offrir, souffrir, cueillir 就像 -er (j’ouvre, tu ouvres) 一样。
变位（人称、数、性）:
| 人称 | parler | finir | vendre | être | avoir | aller | faire |
| je | parle | finis | vends | suis | ai | vais | fais |
| tu | parles | finis | vends | es | as | vas | fais |
| il / elle / on | parle | finit | vend | est | a | va | fait |
| nous | parlons | finissons | vendons | sommes | avons | allons | faisons |
| vous | parlez | finissez | vendez | êtes | avez | allez | faites |
| ils / elles | parlent | finissent | vendent | sont | ont | vont | font |`,
        ko: `규칙:
• -er 동사(그룹 1, 다수): je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• -ir 동사 (finir): je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• -re 동사 (vendre): je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• présent는 현재의 행동, 습관, 일반적인 진실을 표현하며 시간표와 함께 가까운 미래의 (le train part à neuf heures)도 표현합니다.
예외:
• 불규칙 동사: être (je suis, nous sommes, ils sont), avoir (j’ai, nous avons, ils ont), aller (je vais, ils vont), faire (vous faites, ils font), dire (vous dites), venir, pouvoir, vouloir, savoir 등 — 형태를 배워야 합니다.
• -er 동사의 철자 변경: manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• -er 동사는 tu 형식에서 -es를 취하지만 명령형에서는 -s를 삭제합니다(parle !).
• 모든 -ir 동사가 finir: partir, sortir, dormir, sentir, servir — je pars, nous partons (-iss- 없음)와 같은 것은 아닙니다. ouvrir, offrir, souffrir, cueillir는 -er (j’ouvre, tu ouvres)처럼 됩니다.
활용(인칭, 수, 성):
| 인칭 | parler | finir | vendre | être | avoir | aller | faire |
| je | parle | finis | vends | suis | ai | vais | fais |
| tu | parles | finis | vends | es | as | vas | fais |
| il / elle / on | parle | finit | vend | est | a | va | fait |
| nous | parlons | finissons | vendons | sommes | avons | allons | faisons |
| vous | parlez | finissez | vendez | êtes | avez | allez | faites |
| ils / elles | parlent | finissent | vendent | sont | ont | vont | font |`,
        hi: `नियम:
• -er क्रियाएँ (पहला समूह, सबसे अधिक): je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• -ir क्रियाएँ (finir): je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• -re क्रियाएँ (vendre): je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• présent अभी का कार्य, आदत, सामान्य सत्य और समय-सारणी के साथ निकट भविष्य भी दर्शाता है (le train part à neuf heures)।
अपवाद:
• अनियमित क्रियाएँ: être (je suis, nous sommes, ils sont), avoir (j’ai, nous avons, ils ont), aller (je vais, ils vont), faire (vous faites, ils font), dire (vous dites), venir, pouvoir, vouloir, savoir आदि — रूप याद करने होते हैं।
• -er क्रियाओं में वर्तनी-परिवर्तन: manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• -er क्रियाओं के tu रूप में -es आता है, लेकिन आज्ञार्थक में -s हटता है (parle !)।
• हर -ir क्रिया का रूपांतरण finir जैसा नहीं होता: partir, sortir, dormir, sentir, servir — je pars, nous partons (-iss- नहीं); ouvrir, offrir, souffrir, cueillir का रूपांतरण -er जैसा होता है (j’ouvre, tu ouvres)।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | parler | finir | vendre | être | avoir | aller | faire |
| je | parle | finis | vends | suis | ai | vais | fais |
| tu | parles | finis | vends | es | as | vas | fais |
| il / elle / on | parle | finit | vend | est | a | va | fait |
| nous | parlons | finissons | vendons | sommes | avons | allons | faisons |
| vous | parlez | finissez | vendez | êtes | avez | allez | faites |
| ils / elles | parlent | finissent | vendent | sont | ont | vont | font |`,
        ga: `Rialacha:
• Briathra -er (grúpa 1, an chuid is mó): je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• Briathra -ir (finir): je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• Briathra -re (vendre): je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• Léiríonn an présent gníomh anois, nós, fírinne ghinearálta, agus le hamchlár, an neastodhchaí freisin (le train part à neuf heures).
Eisceachtaí:
• Briathra neamhrialta: être (je suis, nous sommes, ils sont), avoir (j’ai, nous avons, ils ont), aller (je vais, ils vont), faire (vous faites, ils font), dire (vous dites), venir, pouvoir, vouloir, savoir srl. — ní mór na foirmeacha a fhoghlaim.
• Athruithe litrithe i mbriathra -er: manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• Glacann briathra -er -es san fhoirm tu, ach fágtar -s ar lár sa mhodh ordaitheach (parle !).
• Ní réimnítear gach briathar -ir mar finir: partir, sortir, dormir, sentir, servir — je pars, nous partons (gan -iss-); réimnítear ouvrir, offrir, souffrir, cueillir mar bhriathra -er (j’ouvre, tu ouvres).
Réimniú (pearsa, uimhir, inscne):
| Pearsa | parler | finir | vendre | être | avoir | aller | faire |
| je | parle | finis | vends | suis | ai | vais | fais |
| tu | parles | finis | vends | es | as | vas | fais |
| il / elle / on | parle | finit | vend | est | a | va | fait |
| nous | parlons | finissons | vendons | sommes | avons | allons | faisons |
| vous | parlez | finissez | vendez | êtes | avez | allez | faites |
| ils / elles | parlent | finissent | vendent | sont | ont | vont | font |`
    });

    D('passe-compose', {
        uk: `Правила:
• Утворення: avoir (présent) + participe passé: j’ai parlé, tu as fini, il a vendu.
• З être — лише закритий список дієслів руху й зміни стану (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, passer, retourner) та їхні похідні (devenir, revenir, rentrer, repartir…) і ВСІ зворотні дієслова: elle est allée, nous nous sommes levés. Інші дієслова руху беруть avoir: j’ai couru, il a marché, nous avons voyagé.
• Participe passé: -er → -é, -ir → -i, -re → -u (parlé, fini, vendu).
• Заперечення охоплює допоміжне: je n’ai pas parlé.
Винятки:
• Неправильні participes: avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• Деякі дієслова руху беруть avoir, коли мають прямий додаток: j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier (але: elle est sortie).
• Узгодження participe: з être — з підметом (elles sont parties); з avoir — лише з COD перед дієсловом (les lettres qu’il a écrites); у зворотних — з COD, коли він перед дієсловом: elle s’est lavée, але elle s’est lavé les mains, ils se sont parlé.`,
        en: `Rules:
• Formation: avoir (present) + past participle: j’ai parlé, tu as fini, il a vendu.
• With être — only a closed list of verbs of motion and change of state (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, passer, retourner) and their derivatives (devenir, revenir, rentrer, repartir…) and ALL reflexive verbs: elle est allée, nous nous sommes levés. Other motion verbs take avoir: j’ai couru, il a marché, nous avons voyagé.
• Participles: -er → -é, -ir → -i, -re → -u (parlé, fini, vendu).
• The negation wraps the auxiliary: je n’ai pas parlé.
Exceptions:
• Irregular participles: avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• Some motion verbs take avoir when they have a direct object: j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier (but: elle est sortie).
• Agreement: with être the participle agrees with the subject (elles sont parties); with avoir only with a direct object placed BEFORE the verb (les lettres qu’il a écrites); in reflexives with the direct object when it comes before the verb: elle s’est lavée, but elle s’est lavé les mains, ils se sont parlé.`,
        fr: `Règles:
• Formation : avoir (présent) + participe passé : j’ai parlé, tu as fini, il a vendu.
• Avec être — uniquement une liste fermée des verbes de mouvement et de changement d'état (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, passer, retourner) et leurs dérivés (devenir, revenir, rentrer, repartir…) et TOUS les verbes réfléchis : elle est allée, nous nous sommes levés. Les autres verbes de mouvement prennent avoir : j’ai couru, il a marché, nous avons voyagé.
• Participes : -er → -é, -ir → -i, -re → -u (parlé, fini, vendu).
• La négation enveloppe le verbe auxiliaire : je n’ai pas parlé.
Exceptions:
• Participes irréguliers : avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• Certains verbes de mouvement prennent avoir lorsqu'ils ont un complément d’objet direct : j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier (mais : elle est sortie).
• Accord : avec être, le participe s’accorde avec le sujet (elles sont parties) ; avec avoir, uniquement avec le COD placé AVANT le verbe (les lettres qu’il a écrites) ; pour les verbes pronominaux, avec le COD placé avant le verbe : elle s’est lavée, mais elle s’est lavé les mains, ils se sont parlé.
Conjugaison (personne, nombre, genre):
| Personne | avoir + parlé (le genre ne change pas la forme) | être + allé (genre et nombre !) |
| je | j’ai parlé | je suis allé (m.) / allée (f.) |
| tu | tu as parlé | tu es allé / allée |
| il | il a parlé | il est allé |
| elle | elle a parlé | elle est allée |
| nous | nous avons parlé | nous sommes allés (m.) / allées (f.) |
| vous | vous avez parlé | vous êtes allé(e) (sing.) · allé(e)s (plur.) |
| ils | ils ont parlé | ils sont allés |
| elles | elles ont parlé | elles sont allées |`,
        ru: `Правила:
• Образование: avoir (настоящее время) + причастие прошедшего времени: j’ai parlé, tu as fini, il a vendu.
• С être — только закрытый список глаголов движения и изменения состояния (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, passer, retourner) и их производные (devenir, revenir, rentrer, repartir…) и ВСЕ возвратные глаголы: elle est allée, nous nous sommes levés. Остальные глаголы движения принимают avoir: j’ai couru, il a marché, nous avons voyagé.
• Причастия: -er → -é, -ir → -i, -re → -u (parlé, fini, vendu).
• Отрицание оборачивает вспомогательный глагол: je n’ai pas parlé.
Исключения:
• Неправильные причастия: avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• Некоторые глаголы движения принимают avoir, когда у них есть прямой объект: j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier (но: elle est sortie).
• Согласование: с être причастие согласуется с подлежащим (elles sont parties); с avoir — только с прямым дополнением перед глаголом (les lettres qu’il a écrites); у возвратных глаголов — с прямым дополнением, если оно перед глаголом: elle s’est lavée, но elle s’est lavé les mains, ils se sont parlé.
Спряжение (лицо, число, род):
| Лицо | avoir + parlé (род не влияет) | être + allé (род и число!) |
| je | j’ai parlé | je suis allé (м.) / allée (ж.) |
| tu | tu as parlé | tu es allé / allée |
| il | il a parlé | il est allé |
| elle | elle a parlé | elle est allée |
| nous | nous avons parlé | nous sommes allés (м.) / allées (ж.) |
| vous | vous avez parlé | vous êtes allé(e) (ед. ч.) · allé(e)s (мн. ч.) |
| ils | ils ont parlé | ils sont allés |
| elles | elles ont parlé | elles sont allées |`,
        es: `Reglas:
• Formación: avoir (presente) + participio pasado: j’ai parlé, tu as fini, il a vendu.
• Con être — sólo una lista cerrada de verbos de movimiento y cambio de estado (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, passer, retourner) y sus derivados (devenir, revenir, rentrer, repartir…) y TODOS los verbos reflexivos: elle est allée, nous nous sommes levés. Otros verbos de movimiento toman avoir: j’ai couru, il a marché, nous avons voyagé.
• Participios: -er → -é, -ir → -i, -re → -u (parlé, fini, vendu).
• La negación envuelve el verbo auxiliar: je n’ai pas parlé.
Excepciones:
• Participios irregulares: avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• Algunos verbos de movimiento toman avoir cuando tienen un objeto directo: j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier (pero: elle est sortie).
• Concordancia: con être, el participio concuerda con el sujeto (elles sont parties); con avoir, solo con el complemento directo que precede al verbo (les lettres qu’il a écrites); en los pronominales, con el complemento directo antepuesto: elle s’est lavée, pero elle s’est lavé les mains, ils se sont parlé.
Conjugación (persona, número, género):
| Persona | avoir + parlé (el género no influye) | être + allé (¡género y número!) |
| je | j’ai parlé | je suis allé (m.) / allée (f.) |
| tu | tu as parlé | tu es allé / allée |
| il | il a parlé | il est allé |
| elle | elle a parlé | elle est allée |
| nous | nous avons parlé | nous sommes allés (m.) / allées (f.) |
| vous | vous avez parlé | vous êtes allé(e) (sing.) · allé(e)s (pl.) |
| ils | ils ont parlé | ils sont allés |
| elles | elles ont parlé | elles sont allées |`,
        zh: `规则:
• 构成：avoir（现在时）+过去分词：j’ai parlé, tu as fini, il a vendu.
• 使用 être — 仅包含运动动词和状态变化 (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, passer, retourner) 及其派生词 (devenir, revenir, rentrer, repartir...) 和所有反身动词：elle est allée, nous nous sommes levés. 其他运动动词采用 avoir：j’ai couru, il a marché, nous avons voyagé.
• 分词：-er → -é, -ir → -i, -re → -u (parlé, fini, vendu)。
• 否定包含助动词：je n’ai pas parlé.
例外:
• 不规则分词：avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• 一些动作动词在有直接宾语时采用 avoir：j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier（但是：elle est sortie）。
• 配合：用 être 时，分词与主语保持性数一致 (elles sont parties)；用 avoir 时，仅与动词前的直接宾语配合 (les lettres qu’il a écrites)；代词式动词也与位于动词前的直接宾语配合：elle s’est lavée，但 elle s’est lavé les mains, ils se sont parlé。
变位（人称、数、性）:
| 人称 | avoir + parlé（不受性影响） | être + allé（注意性和数！） |
| je | j’ai parlé | je suis allé （阳性） / allée （阴性） |
| tu | tu as parlé | tu es allé / allée |
| il | il a parlé | il est allé |
| elle | elle a parlé | elle est allée |
| nous | nous avons parlé | nous sommes allés （阳性） / allées （阴性） |
| vous | vous avez parlé | vous êtes allé(e) （单数） · allé(e)s （复数） |
| ils | ils ont parlé | ils sont allés |
| elles | elles ont parlé | elles sont allées |`,
        ko: `규칙:
• 형식: avoir(현재) + 과거분사: j’ai parlé, tu as fini, il a vendu.
• être 사용 — 동작 동사와 상태 변화 (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, passer, retourner) 및 그 파생어(devenir, revenir, rentrer, repartir…) 및 모든 재귀 동사의 폐쇄형 목록만 사용: elle est allée, nous nous sommes levés. 기타 동작 동사에는 avoir 사용: j’ai couru, il a marché, nous avons voyagé.
• 분사: -er → -é, -ir → -i, -re → -u (parlé, fini, vendu).
• 부정은 조동사를 감싸줍니다: je n’ai pas parlé.
예외:
• 불규칙 분사: avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• 일부 동작 동사는 직접 목적어가 있는 경우 avoir를 취합니다: j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier(그러나: elle est sortie).
• 일치: être를 쓰면 분사의 성·수를 주어에 맞춥니다 (elles sont parties). avoir를 쓰면 동사 앞에 놓인 직접목적어와만 일치시킵니다 (les lettres qu’il a écrites). 대명동사도 직접목적어가 동사 앞에 올 때 일치시킵니다: elle s’est lavée, 그러나 elle s’est lavé les mains, ils se sont parlé.
활용(인칭, 수, 성):
| 인칭 | avoir + parlé (성에 따른 변화 없음) | être + allé (성과 수에 주의!) |
| je | j’ai parlé | je suis allé (남성) / allée (여성) |
| tu | tu as parlé | tu es allé / allée |
| il | il a parlé | il est allé |
| elle | elle a parlé | elle est allée |
| nous | nous avons parlé | nous sommes allés (남성) / allées (여성) |
| vous | vous avez parlé | vous êtes allé(e) (단수) · allé(e)s (복수) |
| ils | ils ont parlé | ils sont allés |
| elles | elles ont parlé | elles sont allées |`,
        hi: `नियम:
• रचना: avoir (वर्तमान) + भूतकालिक कृदंत: j’ai parlé, tu as fini, il a vendu.
• être के साथ केवल गति और अवस्था-परिवर्तन की निश्चित क्रियाएँ (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, passer, retourner), उनसे बनी क्रियाएँ (devenir, revenir, rentrer, repartir…) और सभी निजवाचक क्रियाएँ आती हैं: elle est allée, nous nous sommes levés. गति की अन्य क्रियाएँ avoir लेती हैं: j’ai couru, il a marché, nous avons voyagé.
• कृदंत: -er → -é, -ir → -i, -re → -u (parlé, fini, vendu)।
• नकार के दोनों अंश सहायक क्रिया के दोनों ओर आते हैं: je n’ai pas parlé.
अपवाद:
• अनियमित कृदंत: avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• कुछ गति-क्रियाओं का प्रत्यक्ष कर्म होने पर avoir आता है: j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier (लेकिन elle est sortie)।
• सामंजस्य: être के साथ कृदंत कर्ता के अनुसार (elles sont parties); avoir के साथ केवल क्रिया से पहले आए प्रत्यक्ष कर्म के अनुसार (les lettres qu’il a écrites); निजवाचक क्रियाओं में भी पहले आए प्रत्यक्ष कर्म के अनुसार: elle s’est lavée, लेकिन elle s’est lavé les mains, ils se sont parlé।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | avoir + parlé (लिंग का प्रभाव नहीं) | être + allé (लिंग और वचन!) |
| je | j’ai parlé | je suis allé (पुल्लिंग) / allée (स्त्रीलिंग) |
| tu | tu as parlé | tu es allé / allée |
| il | il a parlé | il est allé |
| elle | elle a parlé | elle est allée |
| nous | nous avons parlé | nous sommes allés (पुल्लिंग) / allées (स्त्रीलिंग) |
| vous | vous avez parlé | vous êtes allé(e) (एकवचन) · allé(e)s (बहुवचन) |
| ils | ils ont parlé | ils sont allés |
| elles | elles ont parlé | elles sont allées |`,
        ga: `Rialacha:
• Foirmiú: avoir (láithreach) + rangabháil chaite: j’ai parlé, tu as fini, il a vendu.
• Ní úsáidtear être ach le liosta teoranta briathra gluaiseachta agus athraithe staide (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, passer, retourner), a ndíorthaigh (devenir, revenir, rentrer, repartir…) agus GACH briathar athfhillteach: elle est allée, nous nous sommes levés. Glacann briathra gluaiseachta eile avoir: j’ai couru, il a marché, nous avons voyagé.
• Rangabhálacha: -er → -é, -ir → -i, -re → -u (parlé, fini, vendu).
• Tagann an diúltú timpeall ar an mbriathar cúnta: je n’ai pas parlé.
Eisceachtaí:
• Rangabhálacha neamhrialta: avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• Glacann roinnt briathra gluaiseachta avoir nuair atá cuspóir díreach acu: j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier (ach elle est sortie).
• Réiteach: le être, réitíonn an rangabháil leis an ainmní (elles sont parties); le avoir, leis an gcuspóir díreach amháin má thagann sé ROIMH an mbriathar (les lettres qu’il a écrites); le briathra athfhillteacha, leis an gcuspóir díreach roimh an mbriathar: elle s’est lavée, ach elle s’est lavé les mains, ils se sont parlé.
Réimniú (pearsa, uimhir, inscne):
| Pearsa | avoir + parlé (ní athraíonn an fhoirm de réir inscne) | être + allé (inscne agus uimhir!) |
| je | j’ai parlé | je suis allé (fir.) / allée (bain.) |
| tu | tu as parlé | tu es allé / allée |
| il | il a parlé | il est allé |
| elle | elle a parlé | elle est allée |
| nous | nous avons parlé | nous sommes allés (fir.) / allées (bain.) |
| vous | vous avez parlé | vous êtes allé(e) (uatha) · allé(e)s (iolra) |
| ils | ils ont parlé | ils sont allés |
| elles | elles ont parlé | elles sont allées |`
    });

    D('imparfait', {
        uk: `Правила:
• Основа — форма nous у présent без -ons; закінчення: -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais).
• Вживається для опису, фону, звички й тривалої дії в минулому; з passé composé утворює «фон + подія» (il pleuvait quand je suis sorti).
• Вирази: toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
Винятки:
• Єдине неправильне дієслово — être: j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.
• Дієслова на -ger/-cer: nous mangions (але je mangeais), nous commencions (але je commençais) — для збереження вимови.
• Дієслова, основа яких закінчується на -i (étudier, rire): у nous/vous два i (nous étudiions, vous riiez).
• Не плутайте з conditionnel: закінчення схожі, але в conditionnel є -r- перед ними.`,
        en: `Rules:
• Stem = the nous-form of the présent without -ons; endings: -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais).
• Used for description, background, habit and continuing past actions; with the passé composé it forms "background + event" (il pleuvait quand je suis sorti).
• Typical words: toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
Exceptions:
• The only irregular stem is être: j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.
• Verbs in -ger/-cer: nous mangions (but je mangeais), nous commencions (but je commençais) — to keep the pronunciation.
• Verbs whose stem ends in -i (étudier, rire): two i’s in nous/vous (nous étudiions, vous riiez).
• Do not confuse with the conditional: the endings are similar, but the conditional has an -r- before them.`,
        fr: `Règles:
• Radical verbal = la forme nous du présent sans -ons ; terminaisons : -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais).
• Utilisé pour la description, le contexte, l'habitude et la poursuite des actions passées ; avec le passé composé il forme "fond + événement" (il pleuvait quand je suis sorti).
• Mots typiques : toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
Exceptions:
• La seule racine verbale irrégulière est être : j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.
• Verbes en -ger/-cer : nous mangions (mais je mangeais), nous commencions (mais je commençais) — pour conserver la prononciation.
• Verbes dont le radical verbal se termine par -i (étudier, rire) : deux i dans nous/vous (nous étudiions, vous riiez).
• Ne pas confondre avec le conditionnel : les terminaisons sont similaires, mais le conditionnel est précédé d'un -r-.
Conjugaison (personne, nombre, genre):
| Personne | parler | finir | être | avoir | aller |
| je | parlais | finissais | étais | avais | allais |
| tu | parlais | finissais | étais | avais | allais |
| il / elle / on | parlait | finissait | était | avait | allait |
| nous | parlions | finissions | étions | avions | allions |
| vous | parliez | finissiez | étiez | aviez | alliez |
| ils / elles | parlaient | finissaient | étaient | avaient | allaient |`,
        ru: `Правила:
• Корень глагола = nous-форма présent без -ons; окончания: -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais).
• Используется для описания, предыстории, привычки и продолжения прошлых действий; с passé composé он образует «фон + событие» (il pleuvait quand je suis sorti).
• Типичные слова: toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
Исключения:
• Единственная неправильная основа глагола — être: j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.
• Глаголы в -ger/-cer: nous mangions (но je mangeais), nous commencions (но je commençais) — для сохранения произношения.
• Глаголы, основа которых заканчивается на -i (étudier, rire): два «и» на nous/vous (nous étudiions, vous riiez).
• Не путайте с условным: окончания похожи, но перед условным стоит -r-.
Спряжение (лицо, число, род):
| Лицо | parler | finir | être | avoir | aller |
| je | parlais | finissais | étais | avais | allais |
| tu | parlais | finissais | étais | avais | allais |
| il / elle / on | parlait | finissait | était | avait | allait |
| nous | parlions | finissions | étions | avions | allions |
| vous | parliez | finissiez | étiez | aviez | alliez |
| ils / elles | parlaient | finissaient | étaient | avaient | allaient |`,
        es: `Reglas:
• Raíz verbal = la forma nous de présent sin -ons; terminaciones: -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais).
• Se utiliza para descripción, antecedentes, hábitos y acciones pasadas continuas; con el passé composé forma "fondo + evento" (il pleuvait quand je suis sorti).
• Palabras típicas: toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
Excepciones:
• La única raíz del verbo irregular es être: j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.
• Verbos en -ger/-cer: nous mangions (pero je mangeais), nous commencions (pero je commençais) — para mantener la pronunciación.
• Verbos cuya raíz verbal termina en -i (étudier, rire): dos ies en nous/vous (nous étudiions, vous riiez).
• No confundir con el condicional: las terminaciones son similares, pero el condicional tiene un -r- delante.
Conjugación (persona, número, género):
| Persona | parler | finir | être | avoir | aller |
| je | parlais | finissais | étais | avais | allais |
| tu | parlais | finissais | étais | avais | allais |
| il / elle / on | parlait | finissait | était | avait | allait |
| nous | parlions | finissions | étions | avions | allions |
| vous | parliez | finissiez | étiez | aviez | alliez |
| ils / elles | parlaient | finissaient | étaient | avaient | allaient |`,
        zh: `规则:
• 动词词干 = présent 的 nous 形式，不含 -ons；结局：-ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais)。
• 用于描述、背景、习惯和延续过去的动作；与passé composé组成“背景+事件”(il pleuvait quand je suis sorti)。
• 典型词：toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
例外:
• 唯一的不规则动词词干是 être: j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.
• -ger/-cer 中的动词：nous mangions（但 je mangeais）、nous commencions（但 je commençais）— 保持发音。
• 动词词干以 -i (étudier, rire) 结尾的动词：nous/vous (nous étudiions, vous riiez) 中有两个 i。
• 不要与条件句混淆：结尾相似，但条件句前面有一个 -r-。
变位（人称、数、性）:
| 人称 | parler | finir | être | avoir | aller |
| je | parlais | finissais | étais | avais | allais |
| tu | parlais | finissais | étais | avais | allais |
| il / elle / on | parlait | finissait | était | avait | allait |
| nous | parlions | finissions | étions | avions | allions |
| vous | parliez | finissiez | étiez | aviez | alliez |
| ils / elles | parlaient | finissaient | étaient | avaient | allaient |`,
        ko: `규칙:
• 동사 어간 = -ons가 없는 présent의 nous형; 엔딩: -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais).
• 설명, 배경, 습관 및 계속되는 과거 작업에 사용됩니다. passé composé를 사용하면 "배경 + 이벤트" (il pleuvait quand je suis sorti)를 형성합니다.
• 일반적인 단어: toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
예외:
• 유일한 불규칙 동사 어간은 être: j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.입니다
• -ger/-cer의 동사: nous mangions(그러나 je mangeais), nous commencions(그러나 je commençais) — 발음을 유지합니다.
• 동사 어간이 -i (étudier, rire)로 끝나는 동사: nous/vous (nous étudiions, vous riiez)에 i가 2개 있습니다.
• 조건법과 혼동하지 마세요. 결말은 비슷하지만 조건법 앞에 -r-가 있습니다.
활용(인칭, 수, 성):
| 인칭 | parler | finir | être | avoir | aller |
| je | parlais | finissais | étais | avais | allais |
| tu | parlais | finissais | étais | avais | allais |
| il / elle / on | parlait | finissait | était | avait | allait |
| nous | parlions | finissions | étions | avions | allions |
| vous | parliez | finissiez | étiez | aviez | alliez |
| ils / elles | parlaient | finissaient | étaient | avaient | allaient |`,
        hi: `नियम:
• आधार = présent के nous रूप से -ons हटाएँ; प्रत्यय: -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais)।
• वर्णन, पृष्ठभूमि, आदत और भूतकाल में जारी कार्यों के लिए; passé composé के साथ «पृष्ठभूमि + घटना» बनता है (il pleuvait quand je suis sorti)।
• सामान्य सूचक शब्द: toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
अपवाद:
• एकमात्र अनियमित आधार être है: j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.
• -ger/-cer क्रियाएँ: nous mangions (लेकिन je mangeais), nous commencions (लेकिन je commençais) — उच्चारण बनाए रखने के लिए।
• -i पर समाप्त आधार वाली क्रियाओं में (étudier, rire): nous/vous में दो i आते हैं (nous étudiions, vous riiez)।
• शर्तवाचक से भ्रमित न करें: प्रत्यय समान हैं, लेकिन शर्तवाचक में उनसे पहले -r- आता है।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | parler | finir | être | avoir | aller |
| je | parlais | finissais | étais | avais | allais |
| tu | parlais | finissais | étais | avais | allais |
| il / elle / on | parlait | finissait | était | avait | allait |
| nous | parlions | finissions | étions | avions | allions |
| vous | parliez | finissiez | étiez | aviez | alliez |
| ils / elles | parlaient | finissaient | étaient | avaient | allaient |`,
        ga: `Rialacha:
• Fréamh = foirm nous an présent gan -ons; deirí: -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais).
• Le haghaidh cur síos, cúlra, nósanna agus gníomhartha leanúnacha san am atá caite; leis an passé composé, cruthaíonn sé «cúlra + eachtra» (il pleuvait quand je suis sorti).
• Gnáthfhocail chomhartha: toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
Eisceachtaí:
• Is é être an t-aon fhréamh neamhrialta: j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.
• Briathra dar críoch -ger/-cer: nous mangions (ach je mangeais), nous commencions (ach je commençais) — chun an fuaimniú a choinneáil.
• Le fréamh dar críoch -i (étudier, rire), bíonn dhá i sna foirmeacha nous/vous (nous étudiions, vous riiez).
• Ná measc leis an modh coinníollach é: tá na deirí cosúil le chéile, ach tá -r- rompu sa choinníollach.
Réimniú (pearsa, uimhir, inscne):
| Pearsa | parler | finir | être | avoir | aller |
| je | parlais | finissais | étais | avais | allais |
| tu | parlais | finissais | étais | avais | allais |
| il / elle / on | parlait | finissait | était | avait | allait |
| nous | parlions | finissions | étions | avions | allions |
| vous | parliez | finissiez | étiez | aviez | alliez |
| ils / elles | parlaient | finissaient | étaient | avaient | allaient |`
    });

    D('plus-que-parfait', {
        uk: `Правила:
• Утворення: avoir/être в imparfait + participe passé: j’avais fini, elle était partie, nous nous étions levés.
• Позначає дію, що сталася ДО іншої минулої дії або до моменту в минулому.
• Вибір допоміжного й узгодження participe — як у passé composé.
Винятки:
• У розповіді часто замінюється passé composé, коли послідовність ясна з контексту.
• Після si в нереальній умові про минуле — plus-que-parfait (si j’avais su…), але у головній частині — conditionnel passé.`,
        en: `Rules:
• Formation: avoir/être in the imparfait + past participle: j’avais fini, elle était partie, nous nous étions levés.
• Marks an action that happened BEFORE another past action or a moment in the past.
• Choice of auxiliary and participle agreement as in the passé composé.
Exceptions:
• In narration it is often replaced by the passé composé when the order is clear from context.
• After si in an unreal past condition — plus-que-parfait (si j’avais su…), but the main clause takes the past conditional.`,
        fr: `Règles:
• Formation : avoir/être à l’imparfait + participe passé : j’avais fini, elle était partie, nous nous étions levés.
• Marque une action qui s'est produite AVANT une autre action passée ou un moment dans le passé.
• Le choix du verbe auxiliaire et l’accord du participe suivent les règles du passé composé.
Exceptions:
• Dans la narration, il est souvent remplacé par le passé composé lorsque l'ordre ressort clairement du contexte.
• Après si dans une condition passée irréelle — plus-que-parfait (si j’avais su…), mais la proposition principale prend le conditionnel passé.
Conjugaison (personne, nombre, genre):
| Personne | avoir (imparfait) + parlé | être (imparfait) + allé |
| je | j’avais parlé | j’étais allé (m.) / allée (f.) |
| tu | tu avais parlé | tu étais allé / allée |
| il / elle | il / elle avait parlé | il était allé · elle était allée |
| nous | nous avions parlé | nous étions allés / allées |
| vous | vous aviez parlé | vous étiez allé(e)(s) |
| ils / elles | ils / elles avaient parlé | ils étaient allés · elles étaient allées |`,
        ru: `Правила:
• Образование: avoir/être в imparfait + причастие прошедшего времени: j’avais fini, elle était partie, nous nous étions levés.
• Отмечает действие, которое произошло ДО другого прошлого действия или момента в прошлом.
• Выбор вспомогательного глагола и согласование причастия — как в passé composé.
Исключения:
• В повествовании его часто заменяют на passé composé, если порядок понятен из контекста.
• После si в нереальном условии в прошлом — plus-que-parfait (si j’avais su…), но главное предложение принимает прошедшее условное наклонение.
Спряжение (лицо, число, род):
| Лицо | avoir (imparfait) + parlé | être (imparfait) + allé |
| je | j’avais parlé | j’étais allé (м.) / allée (ж.) |
| tu | tu avais parlé | tu étais allé / allée |
| il / elle | il / elle avait parlé | il était allé · elle était allée |
| nous | nous avions parlé | nous étions allés / allées |
| vous | vous aviez parlé | vous étiez allé(e)(s) |
| ils / elles | ils / elles avaient parlé | ils étaient allés · elles étaient allées |`,
        es: `Reglas:
• Formación: avoir/être en imparfait + participio pasado: j’avais fini, elle était partie, nous nous étions levés.
• Marca una acción que ocurrió ANTES de otra acción pasada o de un momento en el pasado.
• La elección del auxiliar y la concordancia del participio siguen las reglas del passé composé.
Excepciones:
• En la narración, a menudo se reemplaza por passé composé cuando el orden se desprende claramente del contexto.
• Después de si en una condición pasada irreal: plus-que-parfait (si j’avais su…), pero la cláusula principal toma el pasado condicional.
Conjugación (persona, número, género):
| Persona | avoir (imparfait) + parlé | être (imparfait) + allé |
| je | j’avais parlé | j’étais allé (m.) / allée (f.) |
| tu | tu avais parlé | tu étais allé / allée |
| il / elle | il / elle avait parlé | il était allé · elle était allée |
| nous | nous avions parlé | nous étions allés / allées |
| vous | vous aviez parlé | vous étiez allé(e)(s) |
| ils / elles | ils / elles avaient parlé | ils étaient allés · elles étaient allées |`,
        zh: `规则:
• 构成：imparfait 中的 avoir/être + 过去分词：j’avais fini, elle était partie, nous nous étions levés.
• 标记在另一个过去的操作或过去的某个时刻之前发生的操作。
• 助动词的选择及分词的性数配合规则与 passé composé 相同。
例外:
• 在叙述中，当上下文中的顺序清晰时，它通常被 passé composé 取代。
• 在不真实的过去条件式中的 si 之后 - plus-que-parfait (si j’avais su…)，但主句采用过去条件式。
变位（人称、数、性）:
| 人称 | avoir (imparfait) + parlé | être (imparfait) + allé |
| je | j’avais parlé | j’étais allé （阳性） / allée （阴性） |
| tu | tu avais parlé | tu étais allé / allée |
| il / elle | il / elle avait parlé | il était allé · elle était allée |
| nous | nous avions parlé | nous étions allés / allées |
| vous | vous aviez parlé | vous étiez allé(e)(s) |
| ils / elles | ils / elles avaient parlé | ils étaient allés · elles étaient allées |`,
        ko: `규칙:
• 형식: imparfait의 avoir/être + 과거 분사: j’avais fini, elle était partie, nous nous étions levés.
• 다른 과거 작업 또는 과거 순간 이전에 발생한 작업을 표시합니다.
• 조동사 선택과 분사의 성·수 일치 규칙은 passé composé와 같습니다.
예외:
• 내레이션에서는 순서가 문맥상 명확할 때 passé composé로 대체되는 경우가 많습니다.
• 비현실적인 과거 조건에서 si 이후 — plus-que-parfait (si j’avais su…), 그러나 주절은 과거 조건을 취합니다.
활용(인칭, 수, 성):
| 인칭 | avoir (imparfait) + parlé | être (imparfait) + allé |
| je | j’avais parlé | j’étais allé (남성) / allée (여성) |
| tu | tu avais parlé | tu étais allé / allée |
| il / elle | il / elle avait parlé | il était allé · elle était allée |
| nous | nous avions parlé | nous étions allés / allées |
| vous | vous aviez parlé | vous étiez allé(e)(s) |
| ils / elles | ils / elles avaient parlé | ils étaient allés · elles étaient allées |`,
        hi: `नियम:
• रचना: imparfait में avoir/être + भूतकालिक कृदंत: j’avais fini, elle était partie, nous nous étions levés.
• भूतकाल की किसी अन्य क्रिया या समय-बिंदु से पहले हो चुका कार्य दर्शाता है।
• सहायक क्रिया का चुनाव और कृदंत का लिंग-वचन सामंजस्य passé composé जैसे हैं।
अपवाद:
• कथा में क्रम संदर्भ से स्पष्ट हो तो इसकी जगह प्रायः passé composé आता है।
• भूतकाल की अवास्तविक शर्त में si के बाद plus-que-parfait (si j’avais su…), लेकिन मुख्य उपवाक्य में भूतकालिक शर्तवाचक रूप आता है।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | avoir (imparfait) + parlé | être (imparfait) + allé |
| je | j’avais parlé | j’étais allé (पुल्लिंग) / allée (स्त्रीलिंग) |
| tu | tu avais parlé | tu étais allé / allée |
| il / elle | il / elle avait parlé | il était allé · elle était allée |
| nous | nous avions parlé | nous étions allés / allées |
| vous | vous aviez parlé | vous étiez allé(e)(s) |
| ils / elles | ils / elles avaient parlé | ils étaient allés · elles étaient allées |`,
        ga: `Rialacha:
• Foirmiú: avoir/être san imparfait + rangabháil chaite: j’avais fini, elle était partie, nous nous étions levés.
• Léiríonn sé gníomh a tharla ROIMH ghníomh eile nó roimh phointe ama san am atá caite.
• Roghnaítear an briathar cúnta agus déantar réiteach na rangabhála mar atá sa passé composé.
Eisceachtaí:
• Sa scéalaíocht, is minic a chuirtear an passé composé ina áit nuair atá an t-ord soiléir ón gcomhthéacs.
• Tar éis si i gcoinníoll neamhréadúil san am atá caite, úsáidtear an plus-que-parfait (si j’avais su…), ach an coinníollach caite sa phríomhchlásal.
Réimniú (pearsa, uimhir, inscne):
| Pearsa | avoir (imparfait) + parlé | être (imparfait) + allé |
| je | j’avais parlé | j’étais allé (fir.) / allée (bain.) |
| tu | tu avais parlé | tu étais allé / allée |
| il / elle | il / elle avait parlé | il était allé · elle était allée |
| nous | nous avions parlé | nous étions allés / allées |
| vous | vous aviez parlé | vous étiez allé(e)(s) |
| ils / elles | ils / elles avaient parlé | ils étaient allés · elles étaient allées |`
    });

    D('passe-simple', {
        uk: `Правила:
• Лише в літературі, історичних текстах і казках; у мові — passé composé.
• -er: il parla, ils parlèrent; -ir/-re: il finit, ils finirent, il vendit, ils vendirent.
• Позначає завершені події в розповіді (ouvrit la porte, entra).
Винятки:
• Дуже неправильні основи: être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• На практиці читачеві треба впізнавати саме 3-тю особу (il/elle/ils/elles).`,
        en: `Rules:
• Only in literature, historical texts and tales; in speech the passé composé is used.
• -er: il parla, ils parlèrent; -ir/-re: il finit, ils finirent, il vendit, ils vendirent.
• Marks completed events in narration (ouvrit la porte, entra).
Exceptions:
• Strongly irregular stems: être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• In practice a reader mostly needs to recognise the 3rd person (il/elle/ils/elles).`,
        fr: `Règles:
• Uniquement dans la littérature, les textes historiques et les contes ; dans le discours, le passé composé est utilisé.
• -er : il parla, ils parlèrent; -ir/-re : il finit, ils finirent, il vendit, ils vendirent.
• Marque les événements terminés dans la narration (ouvrit la porte, entra).
Exceptions:
• Tiges fortement irrégulières : être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• En pratique, un lecteur a surtout besoin de reconnaître la 3ème personne (il/elle/ils/elles).
Conjugaison (personne, nombre, genre):
| Personne | parler | finir | être | avoir |
| je | parlai | finis | fus | eus |
| tu | parlas | finis | fus | eus |
| il / elle | parla | finit | fut | eut |
| nous | parlâmes | finîmes | fûmes | eûmes |
| vous | parlâtes | finîtes | fûtes | eûtes |
| ils / elles | parlèrent | finirent | furent | eurent |`,
        ru: `Правила:
• Только в литературе, исторических текстах и сказках; в речи используется passé composé.
• -er: il parla, ils parlèrent; -ir/-re: il finit, ils finirent, il vendit, ils vendirent.
• Отмечает завершенные события в повествовании (ouvrit la porte, entra).
Исключения:
• Сильно неровные стебли: être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• На практике читателю чаще всего приходится распознавать (il/elle/ils/elles) от третьего лица.
Спряжение (лицо, число, род):
| Лицо | parler | finir | être | avoir |
| je | parlai | finis | fus | eus |
| tu | parlas | finis | fus | eus |
| il / elle | parla | finit | fut | eut |
| nous | parlâmes | finîmes | fûmes | eûmes |
| vous | parlâtes | finîtes | fûtes | eûtes |
| ils / elles | parlèrent | finirent | furent | eurent |`,
        es: `Reglas:
• Sólo en literatura, textos históricos y cuentos; en el habla se utiliza el passé composé.
• -er: il parla, ils parlèrent; -ir/-re: il finit, ils finirent, il vendit, ils vendirent.
• Marca eventos completados en la narración (ouvrit la porte, entra).
Excepciones:
• Tallos muy irregulares: être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• En la práctica, un lector necesita principalmente reconocer la tercera persona (il/elle/ils/elles).
Conjugación (persona, número, género):
| Persona | parler | finir | être | avoir |
| je | parlai | finis | fus | eus |
| tu | parlas | finis | fus | eus |
| il / elle | parla | finit | fut | eut |
| nous | parlâmes | finîmes | fûmes | eûmes |
| vous | parlâtes | finîtes | fûtes | eûtes |
| ils / elles | parlèrent | finirent | furent | eurent |`,
        zh: `规则:
• 仅出现在文学、历史文本和故事中；在语音中使用 passé composé。
• -er：il parla, ils parlèrent; -ir/-re：il finit, ils finirent, il vendit, ils vendirent.
• 在旁白中标记已完成的事件 (ouvrit la porte, entra)。
例外:
• 严重不规则的茎：être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• 实际上，读者大多需要识别第三人称 (il/elle/ils/elles)。
变位（人称、数、性）:
| 人称 | parler | finir | être | avoir |
| je | parlai | finis | fus | eus |
| tu | parlas | finis | fus | eus |
| il / elle | parla | finit | fut | eut |
| nous | parlâmes | finîmes | fûmes | eûmes |
| vous | parlâtes | finîtes | fûtes | eûtes |
| ils / elles | parlèrent | finirent | furent | eurent |`,
        ko: `규칙:
• 문학, 역사서, 동화에만 해당됩니다. 연설에서는 passé composé가 사용됩니다.
• -er: il parla, ils parlèrent; -ir/-re: il finit, ils finirent, il vendit, ils vendirent.
• (ouvrit la porte, entra) 내레이션에서 완료된 이벤트를 표시합니다.
예외:
• 매우 불규칙 어간: être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• 실제로 독자는 대부분 3인칭 (il/elle/ils/elles)를 인식해야 합니다.
활용(인칭, 수, 성):
| 인칭 | parler | finir | être | avoir |
| je | parlai | finis | fus | eus |
| tu | parlas | finis | fus | eus |
| il / elle | parla | finit | fut | eut |
| nous | parlâmes | finîmes | fûmes | eûmes |
| vous | parlâtes | finîtes | fûtes | eûtes |
| ils / elles | parlèrent | finirent | furent | eurent |`,
        hi: `नियम:
• केवल साहित्य, ऐतिहासिक लेखन और कथाओं में; बोलचाल में passé composé आता है।
• -er: il parla, ils parlèrent; -ir/-re: il finit, ils finirent, il vendit, ils vendirent.
• कथा में पूर्ण घटनाएँ दर्शाता है (ouvrit la porte, entra)।
अपवाद:
• अत्यधिक अनियमित आधार: être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• व्यवहार में पाठक को मुख्यतः तृतीय पुरुष पहचानना आवश्यक है (il/elle/ils/elles)।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | parler | finir | être | avoir |
| je | parlai | finis | fus | eus |
| tu | parlas | finis | fus | eus |
| il / elle | parla | finit | fut | eut |
| nous | parlâmes | finîmes | fûmes | eûmes |
| vous | parlâtes | finîtes | fûtes | eûtes |
| ils / elles | parlèrent | finirent | furent | eurent |`,
        ga: `Rialacha:
• I litríocht, i dtéacsanna stairiúla agus i scéalta amháin; sa chaint, úsáidtear an passé composé.
• -er: il parla, ils parlèrent; -ir/-re: il finit, ils finirent, il vendit, ils vendirent.
• Léiríonn sé eachtraí críochnaithe sa scéalaíocht (ouvrit la porte, entra).
Eisceachtaí:
• Fréamhacha atá an-neamhrialta: être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• Go praiticiúil, is ar an tríú pearsa is mó a chaithfidh an léitheoir aithint (il/elle/ils/elles).
Réimniú (pearsa, uimhir, inscne):
| Pearsa | parler | finir | être | avoir |
| je | parlai | finis | fus | eus |
| tu | parlas | finis | fus | eus |
| il / elle | parla | finit | fut | eut |
| nous | parlâmes | finîmes | fûmes | eûmes |
| vous | parlâtes | finîtes | fûtes | eûtes |
| ils / elles | parlèrent | finirent | furent | eurent |`
    });

    D('futur-simple', {
        uk: `Правила:
• Інфінітив (у -re без -e) + -ai, -as, -a, -ons, -ez, -ont: je parlerai, nous finirons, il vendra.
• Вживається для майбутньої дії, прогнозів і ввічливих наказів (tu feras attention).
• Після quand/lorsque/dès que, якщо головне в futur, підрядне також у futur (quand tu arriveras, je partirai) — як і в українській («коли приїдеш, я піду»), але на відміну від англійської (when you arrive).
Винятки (особливі основи):
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• Після si — не futur, а présent (si tu viens, nous partirons).`,
        en: `Rules:
• Infinitive (-re loses its -e) + -ai, -as, -a, -ons, -ez, -ont: je parlerai, nous finirons, il vendra.
• Used for future actions, predictions and polite orders (tu feras attention).
• After quand/lorsque/dès que, if the main clause is future, the subordinate clause is future too (quand tu arriveras, je partirai) — unlike English.
Exceptions (irregular stems):
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• After si — not the future but the présent (si tu viens, nous partirons).`,
        fr: `Règles:
• Infinitif (-re perd son -e) + -ai, -as, -a, -ons, -ez, -ont : je parlerai, nous finirons, il vendra.
• Utilisé pour les actions futures, les prédictions et les ordres de politesse (tu feras attention).
• Après quand/lorsque/dès que, si la proposition principale est future, la proposition subordonnée est également future (quand tu arriveras, je partirai) — contrairement à l'anglais.
Exceptions (radicaux irréguliers):
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• Après si — pas le futur mais le présent (si tu viens, nous partirons).
Conjugaison (personne, nombre, genre):
| Personne | parler | finir | être | avoir | aller | faire |
| je | parlerai | finirai | serai | aurai | irai | ferai |
| tu | parleras | finiras | seras | auras | iras | feras |
| il / elle / on | parlera | finira | sera | aura | ira | fera |
| nous | parlerons | finirons | serons | aurons | irons | ferons |
| vous | parlerez | finirez | serez | aurez | irez | ferez |
| ils / elles | parleront | finiront | seront | auront | iront | feront |`,
        ru: `Правила:
• Инфинитив (-re теряет -e) + -ai, -as, -a, -ons, -ez, -ont: je parlerai, nous finirons, il vendra.
• Используется для будущих действий, прогнозов и вежливых приказов (tu feras attention).
• После quand/lorsque/dès que, если главное предложение стоит в будущем, придаточное предложение тоже будет в будущем (quand tu arriveras, je partirai) — в отличие от английского языка.
Исключения (неправильные основы):
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• После si — не будущее, а présent (si tu viens, nous partirons).
Спряжение (лицо, число, род):
| Лицо | parler | finir | être | avoir | aller | faire |
| je | parlerai | finirai | serai | aurai | irai | ferai |
| tu | parleras | finiras | seras | auras | iras | feras |
| il / elle / on | parlera | finira | sera | aura | ira | fera |
| nous | parlerons | finirons | serons | aurons | irons | ferons |
| vous | parlerez | finirez | serez | aurez | irez | ferez |
| ils / elles | parleront | finiront | seront | auront | iront | feront |`,
        es: `Reglas:
• Infinitivo (-re pierde su -e) + -ai, -as, -a, -ons, -ez, -ont: je parlerai, nous finirons, il vendra.
• Utilizado para acciones futuras, predicciones y órdenes educadas (tu feras attention).
• Después de quand/lorsque/dès que, si la cláusula principal es futura, la cláusula subordinada también es futura (quand tu arriveras, je partirai), a diferencia del inglés.
Excepciones (raíces irregulares):
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• Después del si, no el futuro sino el présent (si tu viens, nous partirons).
Conjugación (persona, número, género):
| Persona | parler | finir | être | avoir | aller | faire |
| je | parlerai | finirai | serai | aurai | irai | ferai |
| tu | parleras | finiras | seras | auras | iras | feras |
| il / elle / on | parlera | finira | sera | aura | ira | fera |
| nous | parlerons | finirons | serons | aurons | irons | ferons |
| vous | parlerez | finirez | serez | aurez | irez | ferez |
| ils / elles | parleront | finiront | seront | auront | iront | feront |`,
        zh: `规则:
• 不定式（-re 失去 -e）+ -ai, -as, -a, -ons, -ez, -ont：je parlerai, nous finirons, il vendra.
• 用于未来的行动、预测和礼貌命令 (tu feras attention)。
• 在 quand/lorsque/dès que 之后，如果主句是将来时，从句也是将来时 (quand tu arriveras, je partirai) — 与英语不同。
例外（不规则词干）:
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• si 之后 — 不是未来，而是 présent (si tu viens, nous partirons)。
变位（人称、数、性）:
| 人称 | parler | finir | être | avoir | aller | faire |
| je | parlerai | finirai | serai | aurai | irai | ferai |
| tu | parleras | finiras | seras | auras | iras | feras |
| il / elle / on | parlera | finira | sera | aura | ira | fera |
| nous | parlerons | finirons | serons | aurons | irons | ferons |
| vous | parlerez | finirez | serez | aurez | irez | ferez |
| ils / elles | parleront | finiront | seront | auront | iront | feront |`,
        ko: `규칙:
• 부정사 (-re는 -e를 잃음) + -ai, -as, -a, -ons, -ez, -ont: je parlerai, nous finirons, il vendra.
• 향후 행동, 예측, 정중한 명령 (tu feras attention)에 사용됩니다.
• quand/lorsque/dès que 이후 주절이 미래이면 종속절도 미래입니다. (quand tu arriveras, je partirai) — 영어와는 다릅니다.
예외(불규칙 어간):
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• si 이후 — 미래가 아닌 présent (si tu viens, nous partirons).
활용(인칭, 수, 성):
| 인칭 | parler | finir | être | avoir | aller | faire |
| je | parlerai | finirai | serai | aurai | irai | ferai |
| tu | parleras | finiras | seras | auras | iras | feras |
| il / elle / on | parlera | finira | sera | aura | ira | fera |
| nous | parlerons | finirons | serons | aurons | irons | ferons |
| vous | parlerez | finirez | serez | aurez | irez | ferez |
| ils / elles | parleront | finiront | seront | auront | iront | feront |`,
        hi: `नियम:
• अनंत रूप (-re से -e हटता है) + -ai, -as, -a, -ons, -ez, -ont: je parlerai, nous finirons, il vendra.
• भविष्य के कार्यों, पूर्वानुमानों और विनम्र आदेशों के लिए (tu feras attention)।
• quand/lorsque/dès que के बाद मुख्य उपवाक्य भविष्य में हो तो अधीन उपवाक्य भी भविष्य में आता है (quand tu arriveras, je partirai) — अंग्रेज़ी से अलग।
अपवाद (अनियमित आधार):
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• si के बाद भविष्य नहीं, présent आता है (si tu viens, nous partirons)।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | parler | finir | être | avoir | aller | faire |
| je | parlerai | finirai | serai | aurai | irai | ferai |
| tu | parleras | finiras | seras | auras | iras | feras |
| il / elle / on | parlera | finira | sera | aura | ira | fera |
| nous | parlerons | finirons | serons | aurons | irons | ferons |
| vous | parlerez | finirez | serez | aurez | irez | ferez |
| ils / elles | parleront | finiront | seront | auront | iront | feront |`,
        ga: `Rialacha:
• Infinideach (cailltear -e ó -re) + -ai, -as, -a, -ons, -ez, -ont: je parlerai, nous finirons, il vendra.
• Le haghaidh gníomhartha sa todhchaí, tuartha agus orduithe cúirtéiseacha (tu feras attention).
• Tar éis quand/lorsque/dès que, má tá an príomhchlásal san fháistineach, bíonn an fochlásal san fháistineach freisin (quand tu arriveras, je partirai) — murab ionann agus an Béarla.
Eisceachtaí (fréamhacha neamhrialta):
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• Tar éis si, úsáidtear an présent seachas an fáistineach (si tu viens, nous partirons).
Réimniú (pearsa, uimhir, inscne):
| Pearsa | parler | finir | être | avoir | aller | faire |
| je | parlerai | finirai | serai | aurai | irai | ferai |
| tu | parleras | finiras | seras | auras | iras | feras |
| il / elle / on | parlera | finira | sera | aura | ira | fera |
| nous | parlerons | finirons | serons | aurons | irons | ferons |
| vous | parlerez | finirez | serez | aurez | irez | ferez |
| ils / elles | parleront | finiront | seront | auront | iront | feront |`
    });

    D('futur-anterieur', {
        uk: `Правила:
• Утворення: avoir/être у futur simple + participe passé: j’aurai fini, elle sera partie.
• Означає дію, завершену ДО іншої майбутньої дії або моменту (quand tu arriveras, j’aurai fini).
• Може виражати припущення: il aura oublié (мабуть, забув).
Винятки:
• Вибір avoir/être і узгодження — як у passé composé.
• Після si так не вживається: si tu as fini…, а не si tu auras fini.`,
        en: `Rules:
• Formation: avoir/être in the futur simple + past participle: j’aurai fini, elle sera partie.
• An action completed BEFORE another future action or moment (quand tu arriveras, j’aurai fini).
• It can express a supposition: il aura oublié (he must have forgotten).
Exceptions:
• Choice of avoir/être and agreement as in the passé composé.
• Not used after si: si tu as fini…, not si tu auras fini.`,
        fr: `Règles:
• Formation : avoir/être au futur simple + participe passé : j’aurai fini, elle sera partie.
• Une action terminée AVANT une autre action ou moment futur (quand tu arriveras, j’aurai fini).
• Il peut exprimer une supposition : il aura oublié (il a dû oublier).
Exceptions:
• Le choix entre avoir/être et l’accord suivent les règles du passé composé.
• Non utilisé après si : si tu as fini…, pas si tu auras fini.
Conjugaison (personne, nombre, genre):
| Personne | avoir (futur) + parlé | être (futur) + allé |
| je | j’aurai parlé | je serai allé (m.) / allée (f.) |
| tu | tu auras parlé | tu seras allé / allée |
| il / elle | il / elle aura parlé | il sera allé · elle sera allée |
| nous | nous aurons parlé | nous serons allés / allées |
| vous | vous aurez parlé | vous serez allé(e)(s) |
| ils / elles | ils / elles auront parlé | ils seront allés · elles seront allées |`,
        ru: `Правила:
• Образование: avoir/être в futur simple + причастие прошедшего времени: j’aurai fini, elle sera partie.
• Действие завершено ДО другого будущего действия или момента (quand tu arriveras, j’aurai fini).
• Он может выражать предположение: il aura oublié (наверное, он забыл).
Исключения:
• Выбор avoir/être и согласование — как в passé composé.
• Не используется после si: si tu as fini…, а не si tu auras fini.
Спряжение (лицо, число, род):
| Лицо | avoir (futur) + parlé | être (futur) + allé |
| je | j’aurai parlé | je serai allé (м.) / allée (ж.) |
| tu | tu auras parlé | tu seras allé / allée |
| il / elle | il / elle aura parlé | il sera allé · elle sera allée |
| nous | nous aurons parlé | nous serons allés / allées |
| vous | vous aurez parlé | vous serez allé(e)(s) |
| ils / elles | ils / elles auront parlé | ils seront allés · elles seront allées |`,
        es: `Reglas:
• Formación: avoir/être en futur simple + participio pasado: j’aurai fini, elle sera partie.
• Una acción completada ANTES de otra acción futura o momento (quand tu arriveras, j’aurai fini).
• Puede expresar una suposición: il aura oublié (debe haberlo olvidado).
Excepciones:
• La elección de avoir/être y la concordancia siguen las reglas del passé composé.
• No se usa después de si: si tu as fini…, no si tu auras fini.
Conjugación (persona, número, género):
| Persona | avoir (futur) + parlé | être (futur) + allé |
| je | j’aurai parlé | je serai allé (m.) / allée (f.) |
| tu | tu auras parlé | tu seras allé / allée |
| il / elle | il / elle aura parlé | il sera allé · elle sera allée |
| nous | nous aurons parlé | nous serons allés / allées |
| vous | vous aurez parlé | vous serez allé(e)(s) |
| ils / elles | ils / elles auront parlé | ils seront allés · elles seront allées |`,
        zh: `规则:
• 构成：futur simple 中的 avoir/être + 过去分词：j’aurai fini, elle sera partie.
• 某个操作在另一个未来操作或时刻 (quand tu arriveras, j’aurai fini) 之前完成。
• 它可以表达一个假设：il aura oublié（他一定忘记了）。
例外:
• avoir/être 的选择和性数配合规则与 passé composé 相同。
• 在 si 之后不使用：si tu as fini…，而不是 si tu auras fini.
变位（人称、数、性）:
| 人称 | avoir (futur) + parlé | être (futur) + allé |
| je | j’aurai parlé | je serai allé （阳性） / allée （阴性） |
| tu | tu auras parlé | tu seras allé / allée |
| il / elle | il / elle aura parlé | il sera allé · elle sera allée |
| nous | nous aurons parlé | nous serons allés / allées |
| vous | vous aurez parlé | vous serez allé(e)(s) |
| ils / elles | ils / elles auront parlé | ils seront allés · elles seront allées |`,
        ko: `규칙:
• 형식: futur simple의 avoir/être + 과거 분사: j’aurai fini, elle sera partie.
• 다른 향후 작업 또는 순간 (quand tu arriveras, j’aurai fini) 이전에 완료된 작업입니다.
• il aura oublié라는 가정을 표현할 수 있습니다(그가 잊어버렸나 봐요).
예외:
• avoir/être 선택과 성·수 일치 규칙은 passé composé와 같습니다.
• si 이후에는 사용되지 않습니다: si tu as fini…, si tu auras fini. 아님
활용(인칭, 수, 성):
| 인칭 | avoir (futur) + parlé | être (futur) + allé |
| je | j’aurai parlé | je serai allé (남성) / allée (여성) |
| tu | tu auras parlé | tu seras allé / allée |
| il / elle | il / elle aura parlé | il sera allé · elle sera allée |
| nous | nous aurons parlé | nous serons allés / allées |
| vous | vous aurez parlé | vous serez allé(e)(s) |
| ils / elles | ils / elles auront parlé | ils seront allés · elles seront allées |`,
        hi: `नियम:
• रचना: futur simple में avoir/être + भूतकालिक कृदंत: j’aurai fini, elle sera partie.
• भविष्य के किसी अन्य कार्य या समय-बिंदु से पहले पूरा हो जाने वाला कार्य (quand tu arriveras, j’aurai fini)।
• अनुमान भी दर्शा सकता है: il aura oublié (वह शायद भूल गया होगा)।
अपवाद:
• avoir/être का चुनाव और लिंग-वचन सामंजस्य passé composé जैसे हैं।
• si के बाद नहीं आता: si tu as fini…, si tu auras fini. नहीं।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | avoir (futur) + parlé | être (futur) + allé |
| je | j’aurai parlé | je serai allé (पुल्लिंग) / allée (स्त्रीलिंग) |
| tu | tu auras parlé | tu seras allé / allée |
| il / elle | il / elle aura parlé | il sera allé · elle sera allée |
| nous | nous aurons parlé | nous serons allés / allées |
| vous | vous aurez parlé | vous serez allé(e)(s) |
| ils / elles | ils / elles auront parlé | ils seront allés · elles seront allées |`,
        ga: `Rialacha:
• Foirmiú: avoir/être san futur simple + rangabháil chaite: j’aurai fini, elle sera partie.
• Gníomh a bheidh críochnaithe ROIMH ghníomh eile nó pointe ama sa todhchaí (quand tu arriveras, j’aurai fini).
• Féadann sé tuairimíocht a léiriú: il aura oublié (caithfidh sé go ndearna sé dearmad).
Eisceachtaí:
• Roghnaítear avoir/être agus déantar réiteach mar atá sa passé composé.
• Ní úsáidtear tar éis si é: si tu as fini…, seachas si tu auras fini.
Réimniú (pearsa, uimhir, inscne):
| Pearsa | avoir (futur) + parlé | être (futur) + allé |
| je | j’aurai parlé | je serai allé (fir.) / allée (bain.) |
| tu | tu auras parlé | tu seras allé / allée |
| il / elle | il / elle aura parlé | il sera allé · elle sera allée |
| nous | nous aurons parlé | nous serons allés / allées |
| vous | vous aurez parlé | vous serez allé(e)(s) |
| ils / elles | ils / elles auront parlé | ils seront allés · elles seront allées |`
    });

    D('futur-proche', {
        uk: `Правила:
• Aller (présent) + інфінітив: je vais partir, il va pleuvoir, nous allons manger.
• Для близьких, запланованих подій і прогнозів за очевидними ознаками; у розмові часто замінює futur simple.
• Заперечення — навколо aller: je ne vais pas partir.
Винятки:
• Не плутати з aller як повноцінним дієсловом руху (je vais à Paris).
• Je vais aller — розмовне й правильне; у письмі частіше простий futur: j’irai.`,
        en: `Rules:
• Aller (present) + infinitive: je vais partir, il va pleuvoir, nous allons manger.
• For imminent or planned events and predictions based on evidence; in speech it often replaces the futur simple.
• Negation wraps aller: je ne vais pas partir.
Exceptions:
• Do not confuse with aller as a full verb of motion (je vais à Paris).
• Je vais aller is colloquial and correct; in writing the simple future is more usual: j’irai.`,
        fr: `Règles:
• Aller (présent) + infinitif : je vais partir, il va pleuvoir, nous allons manger.
• Pour les événements imminents ou planifiés et les prédictions basées sur des preuves ; dans le discours, il remplace souvent le futur simple.
• La négation renvoie aller : je ne vais pas partir.
Exceptions:
• Ne pas confondre avec aller comme verbe complet de mouvement (je vais à Paris).
• Je vais aller est familier et correct ; à l'écrit, le futur simple est plus habituel : j’irai.
Conjugaison (personne, nombre, genre):
| Personne | aller (présent) + infinitif |
| je | je vais parler |
| tu | tu vas parler |
| il / elle / on | il va parler |
| nous | nous allons parler |
| vous | vous allez parler |
| ils / elles | ils vont parler |`,
        ru: `Правила:
• Aller (настоящее время) + инфинитив: je vais partir, il va pleuvoir, nous allons manger.
• Для неизбежных или запланированных событий и прогнозов, основанных на доказательствах; в речи часто заменяет futur simple.
• Отрицание переносит aller: je ne vais pas partir.
Исключения:
• Не путайте aller с полным глаголом движения (je vais à Paris).
• Je vais aller — разговорный и правильный вариант; в письменной форме более привычно простое будущее: j’irai.
Спряжение (лицо, число, род):
| Лицо | aller (présent) + инфинитив |
| je | je vais parler |
| tu | tu vas parler |
| il / elle / on | il va parler |
| nous | nous allons parler |
| vous | vous allez parler |
| ils / elles | ils vont parler |`,
        es: `Reglas:
• Aller (presente) + infinitivo: je vais partir, il va pleuvoir, nous allons manger.
• Para eventos inminentes o planificados y predicciones basadas en evidencia; en el habla a menudo reemplaza al futur simple.
• La negación envuelve aller: je ne vais pas partir.
Excepciones:
• No confundir con aller como verbo completo de movimiento (je vais à Paris).
• Je vais aller es coloquial y correcto; por escrito es más habitual el futuro simple: j’irai.
Conjugación (persona, número, género):
| Persona | aller (présent) + infinitivo |
| je | je vais parler |
| tu | tu vas parler |
| il / elle / on | il va parler |
| nous | nous allons parler |
| vous | vous allez parler |
| ils / elles | ils vont parler |`,
        zh: `规则:
• Aller（现在时）+ 不定式：je vais partir, il va pleuvoir, nous allons manger.
• 针对即将发生或计划发生的事件以及基于证据的预测；在语音中它经常代替 futur simple.
• 否定换行 aller：je ne vais pas partir.
例外:
• 不要与 aller 混淆，作为完整的运动动词 (je vais à Paris)。
• Je vais aller 是口语且正确的；在写作中，简单的未来更常见：j’irai.
变位（人称、数、性）:
| 人称 | aller (présent) + 不定式 |
| je | je vais parler |
| tu | tu vas parler |
| il / elle / on | il va parler |
| nous | nous allons parler |
| vous | vous allez parler |
| ils / elles | ils vont parler |`,
        ko: `규칙:
• Aller(현재) + 부정사: je vais partir, il va pleuvoir, nous allons manger.
• 임박하거나 계획된 사건 및 증거를 기반으로 한 예측 연설에서는 종종 futur simple.를 대체합니다
• 부정 래핑 aller: je ne vais pas partir.
예외:
• aller를 동작 (je vais à Paris)의 정식 동사로 혼동하지 마세요.
• Je vais aller는 구어적이고 정확합니다. 서면에서는 단순한 미래가 더 일반적입니다: j’irai.
활용(인칭, 수, 성):
| 인칭 | aller (présent) + 부정사 |
| je | je vais parler |
| tu | tu vas parler |
| il / elle / on | il va parler |
| nous | nous allons parler |
| vous | vous allez parler |
| ils / elles | ils vont parler |`,
        hi: `नियम:
• Aller (वर्तमान) + अनंत रूप: je vais partir, il va pleuvoir, nous allons manger.
• निकट या नियोजित घटनाओं तथा प्रमाण पर आधारित पूर्वानुमानों के लिए; बोलचाल में प्रायः futur simple. की जगह आता है।
• नकार aller के दोनों ओर आता है: je ne vais pas partir.
अपवाद:
• गति की स्वतंत्र क्रिया aller से भ्रमित न करें (je vais à Paris)।
• Je vais aller बोलचाल में सही है; लिखित भाषा में सरल भविष्य अधिक सामान्य है: j’irai.
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | aller (présent) + क्रिया का अनंत रूप |
| je | je vais parler |
| tu | tu vas parler |
| il / elle / on | il va parler |
| nous | nous allons parler |
| vous | vous allez parler |
| ils / elles | ils vont parler |`,
        ga: `Rialacha:
• Aller (láithreach) + infinideach: je vais partir, il va pleuvoir, nous allons manger.
• Le haghaidh eachtraí atá ar tí tarlú nó atá pleanáilte, agus tuartha bunaithe ar fhianaise; sa chaint, tagann sé in áit an futur simple. go minic.
• Tagann an diúltú timpeall ar aller: je ne vais pas partir.
Eisceachtaí:
• Ná measc é le aller mar ghnáthbhriathar gluaiseachta (je vais à Paris).
• Tá Je vais aller ceart sa chaint; sa scríbhneoireacht, is gnách an fáistineach simplí: j’irai.
Réimniú (pearsa, uimhir, inscne):
| Pearsa | aller (présent) + infinideach |
| je | je vais parler |
| tu | tu vas parler |
| il / elle / on | il va parler |
| nous | nous allons parler |
| vous | vous allez parler |
| ils / elles | ils vont parler |`
    });

    D('passe-recent', {
        uk: `Правила:
• Venir de (présent) + інфінітив: il vient d’arriver, nous venons de manger.
• Для дії, яка відбулася щойно; у минулому — venait de + інфінітив (il venait de partir).
Винятки:
• Venir de + іменник/місце означає «приходити з» (je viens de Paris) — це не passé récent.
• Заперечення зазвичай не вживається; кажуть il n’est pas encore arrivé.`,
        en: `Rules:
• Venir de (present) + infinitive: il vient d’arriver, nous venons de manger.
• For an action that has just happened; in the past — venait de + infinitive (il venait de partir).
Exceptions:
• Venir de + noun/place means "to come from" (je viens de Paris) — not the passé récent.
• Rarely negated; one says il n’est pas encore arrivé instead.`,
        fr: `Règles:
• Venir de (présent) + infinitif : il vient d’arriver, nous venons de manger.
• Pour une action qui vient de se produire ; dans le passé — venait de + infinitif (il venait de partir).
Exceptions:
• Venir de + nom/lieu signifie « venir de » (je viens de Paris) — pas du passé récent.
• Rarement nié ; on dit il n’est pas encore arrivé à la place.
Conjugaison (personne, nombre, genre):
| Personne | venir de (présent) + infinitif |
| je | je viens de parler |
| tu | tu viens de parler |
| il / elle / on | il vient de parler |
| nous | nous venons de parler |
| vous | vous venez de parler |
| ils / elles | ils viennent de parler |`,
        ru: `Правила:
• Venir de (настоящее время) + инфинитив: il vient d’arriver, nous venons de manger.
• Для только что произошедшего действия; в прошедшем времени — venait de + инфинитив (il venait de partir).
Исключения:
• Venir de + существительное/место означает "происходящий из" (je viens de Paris), а не passé récent.
• Редко отрицается; вместо этого пишут il n’est pas encore arrivé.
Спряжение (лицо, число, род):
| Лицо | venir de (présent) + инфинитив |
| je | je viens de parler |
| tu | tu viens de parler |
| il / elle / on | il vient de parler |
| nous | nous venons de parler |
| vous | vous venez de parler |
| ils / elles | ils viennent de parler |`,
        es: `Reglas:
• Venir de (presente) + infinitivo: il vient d’arriver, nous venons de manger.
• Para una acción que acaba de ocurrir; en el pasado — venait de + infinitivo (il venait de partir).
Excepciones:
• Venir de + sustantivo/lugar significa "venir de" (je viens de Paris), no del passé récent.
• Rara vez negado; uno dice il n’est pas encore arrivé en su lugar.
Conjugación (persona, número, género):
| Persona | venir de (présent) + infinitivo |
| je | je viens de parler |
| tu | tu viens de parler |
| il / elle / on | il vient de parler |
| nous | nous venons de parler |
| vous | vous venez de parler |
| ils / elles | ils viennent de parler |`,
        zh: `规则:
• Venir de（现在时）+ 不定式：il vient d’arriver, nous venons de manger.
• 对于刚刚发生的动作；过去 — venait de + 不定式 (il venait de partir)。
例外:
• Venir de + 名词/地点的意思是“来自”(je viens de Paris) — 不是 passé récent.
• 很少被否定；有人说 il n’est pas encore arrivé。
变位（人称、数、性）:
| 人称 | venir de (présent) + 不定式 |
| je | je viens de parler |
| tu | tu viens de parler |
| il / elle / on | il vient de parler |
| nous | nous venons de parler |
| vous | vous venez de parler |
| ils / elles | ils viennent de parler |`,
        ko: `규칙:
• Venir de(현재) + 부정사: il vient d’arriver, nous venons de manger.
• 방금 발생한 작업의 경우; 과거 — venait de + 부정사 (il venait de partir).
예외:
• Venir de + 명사/장소는 passé récent.가 아닌 (je viens de Paris)에서 "온다"를 의미합니다
• 부정되는 경우는 거의 없습니다. 대신 il n’est pas encore arrivé라고 말합니다.
활용(인칭, 수, 성):
| 인칭 | venir de (présent) + 부정사 |
| je | je viens de parler |
| tu | tu viens de parler |
| il / elle / on | il vient de parler |
| nous | nous venons de parler |
| vous | vous venez de parler |
| ils / elles | ils viennent de parler |`,
        hi: `नियम:
• Venir de (वर्तमान) + अनंत रूप: il vient d’arriver, nous venons de manger.
• अभी-अभी हुए कार्य के लिए; भूतकाल में venait de + अनंत रूप (il venait de partir)।
अपवाद:
• Venir de + संज्ञा/स्थान का अर्थ «से आना» है (je viens de Paris); यह passé récent. नहीं है।
• इसका नकारात्मक प्रयोग दुर्लभ है; इसके बदले il n’est pas encore arrivé कहते हैं।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | venir de (présent) + क्रिया का अनंत रूप |
| je | je viens de parler |
| tu | tu viens de parler |
| il / elle / on | il vient de parler |
| nous | nous venons de parler |
| vous | vous venez de parler |
| ils / elles | ils viennent de parler |`,
        ga: `Rialacha:
• Venir de (láithreach) + infinideach: il vient d’arriver, nous venons de manger.
• Le haghaidh gníomh atá díreach tar éis tarlú; san am atá caite, venait de + infinideach (il venait de partir).
Eisceachtaí:
• Ciallaíonn Venir de + ainmfhocal/áit «teacht ó» (je viens de Paris); ní hé an passé récent. é.
• Is annamh a dhiúltaítear é; deirtear il n’est pas encore arrivé ina áit.
Réimniú (pearsa, uimhir, inscne):
| Pearsa | venir de (présent) + infinideach |
| je | je viens de parler |
| tu | tu viens de parler |
| il / elle / on | il vient de parler |
| nous | nous venons de parler |
| vous | vous venez de parler |
| ils / elles | ils viennent de parler |`
    });

    D('en-train-de', {
        uk: `Правила:
• Être (будь-який час) + en train de + інфінітив: je suis en train de lire, ils étaient en train de manger.
• Підкреслює, що дія ТРИВАЄ саме зараз (або тривала в певний момент).
Винятки:
• Не вживається з дієсловами стану й сприйняття (savoir, aimer, vouloir, voir): не кажуть « je suis en train de savoir ».
• Для звичного, повторюваного нічого не підкреслює — тоді простий présent.`,
        en: `Rules:
• Être (any tense) + en train de + infinitive: je suis en train de lire, ils étaient en train de manger.
• Stresses that the action is IN PROGRESS right now (or was at a given moment).
Exceptions:
• Not used with state and perception verbs (savoir, aimer, vouloir, voir): you do not say « je suis en train de savoir ».
• Not for habits — use the plain présent.`,
        fr: `Règles:
• Être (n'importe quel temps) + en train de + infinitif : je suis en train de lire, ils étaient en train de manger.
• Souligne que l'action est EN COURS à l'heure actuelle (ou l'était à un moment donné).
Exceptions:
• Ne s'utilise pas avec les verbes d'état et de perception (savoir, aimer, vouloir, voir) : on ne dit pas « je suis en train de savoir ».
• Pas pour les habitudes — utilisez le simple présent.`,
        ru: `Правила:
• Être (любое время) + en train de + инфинитив: je suis en train de lire, ils étaient en train de manger.
• Подчеркивает, что действие ВЫПОЛНЯЕТСЯ прямо сейчас (или было в данный момент).
Исключения:
• Не используется с глаголами состояния и восприятия (savoir, aimer, vouloir, voir): вы не говорите « je suis en train de savoir ».
• Не для привычек — используйте простой présent.`,
        es: `Reglas:
• Être (cualquier tiempo) + en train de + infinitivo: je suis en train de lire, ils étaient en train de manger.
• Destaca que la acción está EN CURSO en estos momentos (o lo estuvo en un momento dado).
Excepciones:
• No se usa con los verbos de estado y percepción (savoir, aimer, vouloir, voir): no se dice « je suis en train de savoir ».
• No por hábitos: utilice el modelo simple présent.`,
        zh: `规则:
• Être（任何时态）+ en train de + 不定式：je suis en train de lire, ils étaient en train de manger.
• 强调该操作现在正在进行（或在特定时刻）。
例外:
• 不与状态动词和知觉动词 (savoir, aimer, vouloir, voir) 一起使用：你不要说“je suis en train de savoir”。
• 不适合习惯 - 使用普通的 présent.`,
        ko: `규칙:
• Être(모든 시제) + en train de + 부정사: je suis en train de lire, ils étaient en train de manger.
• 작업이 현재 진행 중임을 강조합니다(또는 특정 순간에 진행 중이었습니다).
예외:
• 상태 및 인식 동사 (savoir, aimer, vouloir, voir)와 함께 사용되지 않습니다. « je suis en train de savoir »라고 말하지 않습니다.
• 습관용이 아닙니다. 일반 présent.를 사용하세요`,
        hi: `नियम:
• Être (किसी भी काल में) + en train de + अनंत रूप: je suis en train de lire, ils étaient en train de manger.
• कार्य के ठीक अभी जारी होने पर, या किसी दिए हुए समय पर जारी होने पर, बल देता है।
अपवाद:
• स्थिति और अनुभूति की क्रियाओं (savoir, aimer, vouloir, voir) के साथ नहीं आता: «je suis en train de savoir» नहीं कहते।
• आदतों के लिए नहीं; साधारण présent. प्रयोग करें।`,
        ga: `Rialacha:
• Être (in aon aimsir) + en train de + infinideach: je suis en train de lire, ils étaient en train de manger.
• Cuireann sé béim ar ghníomh atá AR SIÚL anois díreach, nó a bhí ar siúl ag am ar leith.
Eisceachtaí:
• Ní úsáidtear le briathra staide ná braistinte (savoir, aimer, vouloir, voir) é: ní deirtear «je suis en train de savoir».
• Ní úsáidtear le haghaidh nósanna é; úsáidtear an gnáth-présent.`
    });

    D('conditionnel-present', {
        uk: `Правила:
• Основа futur simple + закінчення imparfait: je parlerais, tu finirais, il serait, nous irions.
• Вживається для ввічливих прохань (je voudrais un café), порад (tu devrais), здогадів і нереальної умови (si j’avais le temps, je voyagerais).
• Після si — imparfait, а в головному реченні conditionnel présent.
Винятки:
• Ті самі особливі основи, що й у futur: être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• Після si у значенні «якщо» conditionnel не вживається (si j’avais…, а не si j’aurais…); після si = «чи» в непрямому питанні — можна (je me demande s’il viendrait).
• Для непідтвердженої новини в пресі (le ministre aurait démissionné — нібито).`,
        en: `Rules:
• Futur stem + imparfait endings: je parlerais, tu finirais, il serait, nous irions.
• Used for polite requests (je voudrais un café), advice (tu devrais), conjecture and unreal conditions (si j’avais le temps, je voyagerais).
• After si — imparfait, with the conditional in the main clause.
Exceptions:
• Same irregular stems as the future: être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• Never the conditional after si meaning «if» (si j’avais…, not si j’aurais…); after si meaning «whether» it is fine (je me demande s’il viendrait).
• In the press for unconfirmed news (le ministre aurait démissionné — allegedly).`,
        fr: `Règles:
• Radical verbal Futur + terminaisons imparfait : je parlerais, tu finirais, il serait, nous irions.
• Utilisé pour les demandes polies (je voudrais un café), les conseils (tu devrais), les conjectures et les conditions irréelles (si j’avais le temps, je voyagerais).
• Après si, on emploie l’imparfait, avec le conditionnel dans la proposition principale.
Exceptions:
• Mêmes radicaux irréguliers que le futur : être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• Jamais de conditionnel après si introduisant une condition (si j’avais…, et non si j’aurais…) ; il est possible après si dans une interrogation indirecte (je me demande s’il viendrait).
• Dans la presse pour des informations non confirmées (le ministre aurait démissionné — prétendument).
Conjugaison (personne, nombre, genre):
| Personne | parler | finir | être | avoir | aller | pouvoir |
| je | parlerais | finirais | serais | aurais | irais | pourrais |
| tu | parlerais | finirais | serais | aurais | irais | pourrais |
| il / elle / on | parlerait | finirait | serait | aurait | irait | pourrait |
| nous | parlerions | finirions | serions | aurions | irions | pourrions |
| vous | parleriez | finiriez | seriez | auriez | iriez | pourriez |
| ils / elles | parleraient | finiraient | seraient | auraient | iraient | pourraient |`,
        ru: `Правила:
• Основа глагола Futur + окончания imparfait: je parlerais, tu finirais, il serait, nous irions.
• Используется для вежливых просьб (je voudrais un café), советов (tu devrais), предположений и нереальных условий (si j’avais le temps, je voyagerais).
• После si употребляется imparfait, а в главном предложении — условное наклонение.
Исключения:
• Те же неправильные основы, что и будущее: être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• После si со значением «если» условное наклонение не употребляется (si j’avais…, а не si j’aurais…); после si со значением «ли» оно возможно (je me demande s’il viendrait).
• В прессе по неподтвержденным новостям (le ministre aurait démissionné — якобы).
Спряжение (лицо, число, род):
| Лицо | parler | finir | être | avoir | aller | pouvoir |
| je | parlerais | finirais | serais | aurais | irais | pourrais |
| tu | parlerais | finirais | serais | aurais | irais | pourrais |
| il / elle / on | parlerait | finirait | serait | aurait | irait | pourrait |
| nous | parlerions | finirions | serions | aurions | irions | pourrions |
| vous | parleriez | finiriez | seriez | auriez | iriez | pourriez |
| ils / elles | parleraient | finiraient | seraient | auraient | iraient | pourraient |`,
        es: `Reglas:
• Raíz verbal Futur + terminaciones imparfait: je parlerais, tu finirais, il serait, nous irions.
• Utilizado para solicitudes educadas (je voudrais un café), consejos (tu devrais), conjeturas y condiciones irreales (si j’avais le temps, je voyagerais).
• Después de si se usa el imparfait, con el condicional en la oración principal.
Excepciones:
• Los mismos raíces irregulares que el futuro: être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• Nunca se usa el condicional después de si que introduce una condición (si j’avais…, no si j’aurais…); sí puede usarse tras si en una interrogativa indirecta (je me demande s’il viendrait).
• En la prensa por noticias no confirmadas (le ministre aurait démissionné — supuestamente).
Conjugación (persona, número, género):
| Persona | parler | finir | être | avoir | aller | pouvoir |
| je | parlerais | finirais | serais | aurais | irais | pourrais |
| tu | parlerais | finirais | serais | aurais | irais | pourrais |
| il / elle / on | parlerait | finirait | serait | aurait | irait | pourrait |
| nous | parlerions | finirions | serions | aurions | irions | pourrions |
| vous | parleriez | finiriez | seriez | auriez | iriez | pourriez |
| ils / elles | parleraient | finiraient | seraient | auraient | iraient | pourraient |`,
        zh: `规则:
• Futur 动词词干 + imparfait 词尾：je parlerais, tu finirais, il serait, nous irions.
• 用于礼貌请求 (je voudrais un café)、建议 (tu devrais)、猜想和不真实的条件 (si j’avais le temps, je voyagerais)。
• si 后用 imparfait，主句用条件式。
例外:
• 与未来相同的不规则词干：être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• si 表示“如果”时，后面不能用条件式 (si j’avais…，而不是 si j’aurais…)；si 表示“是否”时可以用 (je me demande s’il viendrait)。
• 在媒体上发布未经证实的消息（le ministre aurait démissionné - 据称）。
变位（人称、数、性）:
| 人称 | parler | finir | être | avoir | aller | pouvoir |
| je | parlerais | finirais | serais | aurais | irais | pourrais |
| tu | parlerais | finirais | serais | aurais | irais | pourrais |
| il / elle / on | parlerait | finirait | serait | aurait | irait | pourrait |
| nous | parlerions | finirions | serions | aurions | irions | pourrions |
| vous | parleriez | finiriez | seriez | auriez | iriez | pourriez |
| ils / elles | parleraient | finiraient | seraient | auraient | iraient | pourraient |`,
        ko: `규칙:
• Futur 동사 어간 + imparfait 어미: je parlerais, tu finirais, il serait, nous irions.
• 정중한 요청 (je voudrais un café), 조언 (tu devrais), 추측 및 비현실적인 조건 (si j’avais le temps, je voyagerais)에 사용됩니다.
• si 뒤에는 imparfait를, 주절에는 조건법을 씁니다.
예외:
• 미래와 동일한 불규칙 어간: être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• si가 «만약»을 뜻하면 뒤에 조건법을 쓰지 않습니다 (si j’avais…, si j’aurais… 아님). 간접의문에서 «~인지»를 뜻할 때는 가능합니다 (je me demande s’il viendrait).
• 확인되지 않은 소식에 대한 언론 보도(le ministre aurait démissionné — 추정)
활용(인칭, 수, 성):
| 인칭 | parler | finir | être | avoir | aller | pouvoir |
| je | parlerais | finirais | serais | aurais | irais | pourrais |
| tu | parlerais | finirais | serais | aurais | irais | pourrais |
| il / elle / on | parlerait | finirait | serait | aurait | irait | pourrait |
| nous | parlerions | finirions | serions | aurions | irions | pourrions |
| vous | parleriez | finiriez | seriez | auriez | iriez | pourriez |
| ils / elles | parleraient | finiraient | seraient | auraient | iraient | pourraient |`,
        hi: `नियम:
• Futur का आधार + imparfait के प्रत्यय: je parlerais, tu finirais, il serait, nous irions.
• विनम्र अनुरोध (je voudrais un café), सलाह (tu devrais), अनुमान और अवास्तविक शर्तों के लिए (si j’avais le temps, je voyagerais)।
• si के बाद imparfait और मुख्य उपवाक्य में शर्तवाचक रूप आता है।
अपवाद:
• भविष्य वाले ही अनियमित आधार: être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• «यदि» के अर्थ वाले si के बाद शर्तवाचक रूप नहीं आता (si j’avais…, न कि si j’aurais…); अप्रत्यक्ष प्रश्न में «क्या…» के अर्थ वाले si के बाद आ सकता है (je me demande s’il viendrait)।
• समाचारों में अपुष्ट सूचना के लिए (le ministre aurait démissionné — कथित रूप से)।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | parler | finir | être | avoir | aller | pouvoir |
| je | parlerais | finirais | serais | aurais | irais | pourrais |
| tu | parlerais | finirais | serais | aurais | irais | pourrais |
| il / elle / on | parlerait | finirait | serait | aurait | irait | pourrait |
| nous | parlerions | finirions | serions | aurions | irions | pourrions |
| vous | parleriez | finiriez | seriez | auriez | iriez | pourriez |
| ils / elles | parleraient | finiraient | seraient | auraient | iraient | pourraient |`,
        ga: `Rialacha:
• Fréamh an Futur + deirí an imparfait: je parlerais, tu finirais, il serait, nous irions.
• Le haghaidh iarratais chúirtéiseacha (je voudrais un café), comhairle (tu devrais), tuairimíochta agus coinníollacha neamhréadúla (si j’avais le temps, je voyagerais).
• Tar éis si, úsáidtear an imparfait, agus an modh coinníollach sa phríomhchlásal.
Eisceachtaí:
• Na fréamhacha neamhrialta céanna leis an bhfáistineach: être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• Ní úsáidtear an modh coinníollach tar éis si a chiallaíonn «má» (si j’avais…, seachas si j’aurais…); tá sé ceadaithe tar éis si i gceist indíreach (je me demande s’il viendrait).
• Sa phreas le haghaidh eolais neamh dheimhnithe (le ministre aurait démissionné — de réir tuairiscí).
Réimniú (pearsa, uimhir, inscne):
| Pearsa | parler | finir | être | avoir | aller | pouvoir |
| je | parlerais | finirais | serais | aurais | irais | pourrais |
| tu | parlerais | finirais | serais | aurais | irais | pourrais |
| il / elle / on | parlerait | finirait | serait | aurait | irait | pourrait |
| nous | parlerions | finirions | serions | aurions | irions | pourrions |
| vous | parleriez | finiriez | seriez | auriez | iriez | pourriez |
| ils / elles | parleraient | finiraient | seraient | auraient | iraient | pourraient |`
    });

    D('conditionnel-passe', {
        uk: `Правила:
• Утворення: avoir/être у conditionnel présent + participe passé: j’aurais voulu, il serait venu, elles se seraient levées.
• Нездійснена умова в минулому: si + plus-que-parfait → conditionnel passé (si j’avais su, je serais venu).
• Жаль і докір: tu aurais dû me prévenir; невпевнена інформація в пресі.
Винятки:
• Вибір avoir/être й узгодження participe — як у passé composé.
• Devoir/pouvoir/vouloir у conditionnel passé + інфінітив: j’aurais pu venir, il aurait dû partir.`,
        en: `Rules:
• Formation: avoir/être in the present conditional + past participle: j’aurais voulu, il serait venu, elles se seraient levées.
• Unfulfilled past condition: si + plus-que-parfait → past conditional (si j’avais su, je serais venu).
• Regret and reproach: tu aurais dû me prévenir; unverified information in the press.
Exceptions:
• Auxiliary choice and participle agreement as in the passé composé.
• Devoir/pouvoir/vouloir in the past conditional + infinitive: j’aurais pu venir, il aurait dû partir.`,
        fr: `Règles:
• Formation : avoir/être au conditionnel présent + participe passé : j’aurais voulu, il serait venu, elles se seraient levées.
• Condition passée non remplie : si + plus-que-parfait → (si j’avais su, je serais venu) conditionnel passé.
• Regrets et reproches : tu aurais dû me prévenir ; informations non vérifiées dans la presse.
Exceptions:
• Le choix du verbe auxiliaire et l’accord du participe suivent les règles du passé composé.
• Devoir/pouvoir/vouloir au passé conditionnel + infinitif : j’aurais pu venir, il aurait dû partir.
Conjugaison (personne, nombre, genre):
| Personne | avoir (conditionnel) + voulu | être (conditionnel) + venu |
| je | j’aurais voulu | je serais venu (m.) / venue (f.) |
| tu | tu aurais voulu | tu serais venu / venue |
| il / elle | il / elle aurait voulu | il serait venu · elle serait venue |
| nous | nous aurions voulu | nous serions venus / venues |
| vous | vous auriez voulu | vous seriez venu(e)(s) |
| ils / elles | ils / elles auraient voulu | ils seraient venus · elles seraient venues |`,
        ru: `Правила:
• Образование: avoir/être в условном настоящем времени + причастие прошедшего времени: j’aurais voulu, il serait venu, elles se seraient levées.
• Невыполненное прошедшее условие: si + plus-que-parfait → прошедшее условное (si j’avais su, je serais venu).
• Сожаление и упрек: tu aurais dû me prévenir; непроверенная информация в прессе.
Исключения:
• Выбор вспомогательного глагола и согласование причастия — как в passé composé.
• Devoir/pouvoir/vouloir в условном прошедшем + инфинитиве: j’aurais pu venir, il aurait dû partir.
Спряжение (лицо, число, род):
| Лицо | avoir (conditionnel) + voulu | être (conditionnel) + venu |
| je | j’aurais voulu | je serais venu (м.) / venue (ж.) |
| tu | tu aurais voulu | tu serais venu / venue |
| il / elle | il / elle aurait voulu | il serait venu · elle serait venue |
| nous | nous aurions voulu | nous serions venus / venues |
| vous | vous auriez voulu | vous seriez venu(e)(s) |
| ils / elles | ils / elles auraient voulu | ils seraient venus · elles seraient venues |`,
        es: `Reglas:
• Formación: avoir/être en presente condicional + participio pasado: j’aurais voulu, il serait venu, elles se seraient levées.
• Condición pasada no cumplida: si + plus-que-parfait → condicional pasada (si j’avais su, je serais venu).
• Arrepentimiento y reproche: tu aurais dû me prévenir; información no verificada en la prensa.
Excepciones:
• La elección del auxiliar y la concordancia del participio siguen las reglas del passé composé.
• Devoir/pouvoir/vouloir en pasado condicional + infinitivo: j’aurais pu venir, il aurait dû partir.
Conjugación (persona, número, género):
| Persona | avoir (conditionnel) + voulu | être (conditionnel) + venu |
| je | j’aurais voulu | je serais venu (m.) / venue (f.) |
| tu | tu aurais voulu | tu serais venu / venue |
| il / elle | il / elle aurait voulu | il serait venu · elle serait venue |
| nous | nous aurions voulu | nous serions venus / venues |
| vous | vous auriez voulu | vous seriez venu(e)(s) |
| ils / elles | ils / elles auraient voulu | ils seraient venus · elles seraient venues |`,
        zh: `规则:
• 构成：现在条件式中的 avoir/être + 过去分词：j’aurais voulu, il serait venu, elles se seraient levées.
• 未满足的过去条件式：si + plus-que-parfait → 过去条件式 (si j’avais su, je serais venu)。
• 遗憾与责备：tu aurais dû me prévenir；媒体上未经证实的信息。
例外:
• 助动词的选择及分词的性数配合规则与 passé composé 相同。
• Devoir/pouvoir/vouloir 过去时条件式 + 不定式：j’aurais pu venir, il aurait dû partir.
变位（人称、数、性）:
| 人称 | avoir (conditionnel) + voulu | être (conditionnel) + venu |
| je | j’aurais voulu | je serais venu （阳性） / venue （阴性） |
| tu | tu aurais voulu | tu serais venu / venue |
| il / elle | il / elle aurait voulu | il serait venu · elle serait venue |
| nous | nous aurions voulu | nous serions venus / venues |
| vous | vous auriez voulu | vous seriez venu(e)(s) |
| ils / elles | ils / elles auraient voulu | ils seraient venus · elles seraient venues |`,
        ko: `규칙:
• 형식: 조건법 현재형 + 과거분사의 avoir/être: j’aurais voulu, il serait venu, elles se seraient levées.
• 미완성 과거 조건: si + plus-que-parfait → 과거 조건 (si j’avais su, je serais venu).
• 후회와 비난: tu aurais dû me prévenir; 언론에서 확인되지 않은 정보입니다.
예외:
• 조동사 선택과 분사의 성·수 일치 규칙은 passé composé와 같습니다.
• Devoir/pouvoir/vouloir 과거 조건법 + 부정사: j’aurais pu venir, il aurait dû partir.
활용(인칭, 수, 성):
| 인칭 | avoir (conditionnel) + voulu | être (conditionnel) + venu |
| je | j’aurais voulu | je serais venu (남성) / venue (여성) |
| tu | tu aurais voulu | tu serais venu / venue |
| il / elle | il / elle aurait voulu | il serait venu · elle serait venue |
| nous | nous aurions voulu | nous serions venus / venues |
| vous | vous auriez voulu | vous seriez venu(e)(s) |
| ils / elles | ils / elles auraient voulu | ils seraient venus · elles seraient venues |`,
        hi: `नियम:
• रचना: वर्तमान शर्तवाचक में avoir/être + भूतकालिक कृदंत: j’aurais voulu, il serait venu, elles se seraient levées.
• भूतकाल की अपूर्ण शर्त: si + plus-que-parfait → भूतकालिक शर्तवाचक (si j’avais su, je serais venu)।
• पछतावा और उलाहना: tu aurais dû me prévenir; समाचारों में अपुष्ट सूचना।
अपवाद:
• सहायक क्रिया का चुनाव और कृदंत का लिंग-वचन सामंजस्य passé composé जैसे हैं।
• भूतकालिक शर्तवाचक में Devoir/pouvoir/vouloir + अनंत रूप: j’aurais pu venir, il aurait dû partir.
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | avoir (conditionnel) + voulu | être (conditionnel) + venu |
| je | j’aurais voulu | je serais venu (पुल्लिंग) / venue (स्त्रीलिंग) |
| tu | tu aurais voulu | tu serais venu / venue |
| il / elle | il / elle aurait voulu | il serait venu · elle serait venue |
| nous | nous aurions voulu | nous serions venus / venues |
| vous | vous auriez voulu | vous seriez venu(e)(s) |
| ils / elles | ils / elles auraient voulu | ils seraient venus · elles seraient venues |`,
        ga: `Rialacha:
• Foirmiú: avoir/être sa choinníollach láithreach + rangabháil chaite: j’aurais voulu, il serait venu, elles se seraient levées.
• Coinníoll nár comhlíonadh san am atá caite: si + plus-que-parfait → coinníollach caite (si j’avais su, je serais venu).
• Aiféala agus cáineadh: tu aurais dû me prévenir; eolas neamh dheimhnithe sa phreas.
Eisceachtaí:
• Roghnaítear an briathar cúnta agus déantar réiteach na rangabhála mar atá sa passé composé.
• Devoir/pouvoir/vouloir sa choinníollach caite + infinideach: j’aurais pu venir, il aurait dû partir.
Réimniú (pearsa, uimhir, inscne):
| Pearsa | avoir (conditionnel) + voulu | être (conditionnel) + venu |
| je | j’aurais voulu | je serais venu (fir.) / venue (bain.) |
| tu | tu aurais voulu | tu serais venu / venue |
| il / elle | il / elle aurait voulu | il serait venu · elle serait venue |
| nous | nous aurions voulu | nous serions venus / venues |
| vous | vous auriez voulu | vous seriez venu(e)(s) |
| ils / elles | ils / elles auraient voulu | ils seraient venus · elles seraient venues |`
    });

    D('hypothese-si', {
        uk: `Правила:
• Реальна умова: si + présent → futur / présent / impératif (si tu viens, nous partirons).
• Нереальна (теперішнє): si + imparfait → conditionnel présent (si j’étais riche, j’achèterais…).
• Нездійснена в минулому: si + plus-que-parfait → conditionnel passé (si j’avais su, je serais venu).
• Si може стояти на початку або в середині речення; перед il/ils — s’ (s’il pleut).
Винятки:
• Після si ніколи не ставиться futur чи conditionnel (si tu viendras — помилка).
• Si = «так» у відповіді на заперечне питання (tu ne viens pas ? — Si !) і si = «настільки» (si grand) — це не умова.
• Si у непрямому питанні (je me demande s’il vient) — «чи».`,
        en: `Rules:
• Real condition: si + présent → futur / présent / imperative (si tu viens, nous partirons).
• Unreal (present): si + imparfait → present conditional (si j’étais riche, j’achèterais…).
• Unfulfilled (past): si + plus-que-parfait → past conditional (si j’avais su, je serais venu).
• Si may start or sit inside the sentence; before il/ils — s’ (s’il pleut).
Exceptions:
• Never futur or conditional right after si (si tu viendras is wrong).
• Si = "yes" answering a negative question (tu ne viens pas ? — Si !) and si = "so" (si grand) are not conditions.
• Si in an indirect question (je me demande s’il vient) means "whether".`,
        fr: `Règles:
• Condition réelle : si + présent → futur / présent / impératif (si tu viens, nous partirons).
• Irréel (présent) : si + imparfait → présent conditionnel (si j’étais riche, j’achèterais…).
• Non rempli (passé) : si + plus-que-parfait → passé (si j’avais su, je serais venu) conditionnel.
• Si peut commencer ou se trouver à l'intérieur de la phrase ; avant il/ils — s’ (s’il pleut).
Exceptions:
• Jamais futur ou conditionnel juste après si (si tu viendras est faux).
• Si = "oui" répondant à une question négative (tu ne viens pas ? — Si !) et si = "donc" (si grand) ne sont pas des conditions.
• Si dans une question indirecte (je me demande s’il vient) signifie "si".`,
        ru: `Правила:
• Реальное состояние: si + présent → futur / présent / императивное (si tu viens, nous partirons).
• Нереальное (настоящее время): si + imparfait → настоящее условное наклонение (si j’étais riche, j’achèterais…).
• Невыполнено (прошедшее): si + plus-que-parfait → прошедшее условное наклонение (si j’avais su, je serais venu).
• Si может начинаться или находиться внутри предложения; перед il/ils — s’ (s’il pleut).
Исключения:
• Никогда futur или условное выражение сразу после si (si tu viendras неверно).
• Si = "да" при ответе на отрицательный вопрос (tu ne viens pas ? — Si !) и si = "так" (si grand) не являются условиями.
• Si в косвенном вопросе (je me demande s’il vient) означает "ли".`,
        es: `Reglas:
• Condición real: si + présent → futur / présent / imperativo (si tu viens, nous partirons).
• Irreal (presente): si + imparfait → presente condicional (si j’étais riche, j’achèterais…).
• No cumplido (pasado): si + plus-que-parfait → pasado condicional (si j’avais su, je serais venu).
• Si puede comenzar o permanecer dentro de la oración; antes de il/ils — s’ (s’il pleut).
Excepciones:
• Nunca futur o condicional justo después de si (si tu viendras es incorrecto).
• Si = "sí" responder una pregunta negativa (tu ne viens pas ? — Si !) y si = "entonces" (si grand) no son condiciones.
• Si en una pregunta indirecta (je me demande s’il vient) significa "si".`,
        zh: `规则:
• 实际条件：si + présent → futur / présent / 命令式 (si tu viens, nous partirons)。
• 虚幻（现在）：si + imparfait → 现在条件式（si j’étais riche, j’achèterais…）。
• 未实现（过去）：si + plus-que-parfait → 过去条件式 (si j’avais su, je serais venu)。
• Si 可以开始或位于句子内部；在il/ils — s’ (s’il pleut)之前。
例外:
• 切勿在 si 之后使用 futur 或条件式（si tu viendras 是错误的）。
• Si =“是”回答否定问题（tu ne viens pas ? — Si！）和 si =“所以”(si grand) 不是条件。
• Si 在间接疑问句中 (je me demande s’il vient) 的意思是“是否”。`,
        ko: `규칙:
• 실제 조건: si + présent → futur / présent / 명령형 (si tu viens, nous partirons).
• Unreal(현재): si + imparfait → 현재 조건법(si j’étais riche, j’achèterais…).
• 미충족(과거): si + plus-que-parfait → 과거 조건법 (si j’avais su, je serais venu).
• Si는 문장 안에서 시작하거나 문장 안에 들어갈 수 있습니다. il/ils — s’ (s’il pleut) 이전.
예외:
• futur 또는 si 바로 뒤에는 조건법가 사용되지 않습니다(si tu viendras가 잘못됨).
• Si = 부정적인 질문에 대답하는 "예"(tu ne viens pas ? — Si !) 및 si = "so" (si grand)는 조건이 아닙니다.
• 간접 질문 (je me demande s’il vient)에서 Si는 "여부"를 의미합니다.`,
        hi: `नियम:
• वास्तविक शर्त: si + présent → futur / présent / आज्ञार्थक (si tu viens, nous partirons)।
• अवास्तविक वर्तमान: si + imparfait → वर्तमान शर्तवाचक (si j’étais riche, j’achèterais…)।
• भूतकाल में अपूर्ण शर्त: si + plus-que-parfait → भूतकालिक शर्तवाचक (si j’avais su, je serais venu)।
• Si वाक्य के आरंभ या बीच में आ सकता है; il/ils — s’ से पहले (s’il pleut)।
अपवाद:
• si के तुरंत बाद futur या शर्तवाचक कभी नहीं आता (si tu viendras ग़लत है)।
• नकारात्मक प्रश्न के उत्तर में «हाँ» वाला Si (tu ne viens pas ? — Si !) और «इतना» वाला si (si grand) शर्त नहीं हैं।
• अप्रत्यक्ष प्रश्न में Si (je me demande s’il vient) का अर्थ «क्या…» है।`,
        ga: `Rialacha:
• Coinníoll réadúil: si + présent → futur / présent / modh ordaitheach (si tu viens, nous partirons).
• Neamhréadúil san am i láthair: si + imparfait → coinníollach láithreach (si j’étais riche, j’achèterais…).
• Neamhchomhlíonta san am atá caite: si + plus-que-parfait → coinníollach caite (si j’avais su, je serais venu).
• Féadann Si teacht ag tús nó i lár na habairte; roimh il/ils — s’ (s’il pleut).
Eisceachtaí:
• Ní thagann an futur ná an coinníollach díreach tar éis si riamh (tá si tu viendras mícheart).
• Ní coinníollacha iad Si = «sea» mar fhreagra ar cheist dhiúltach (tu ne viens pas ? — Si !) ná si = «chomh» (si grand).
• I gceist indíreach, ciallaíonn Si (je me demande s’il vient) «an…».`
    });

    D('subjonctif-present', {
        uk: `Правила:
• Утворення: que + основа ils (présent) + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle).
• Вживається після: необхідності (il faut que), бажання/наказу (vouloir que, exiger que), емоцій (être content que, regretter que), сумніву (douter que, il se peut que), а також сполучників bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• Якщо підмет головного й підрядного ТОЙ САМИЙ, вживають інфінітив: je veux partir (не je veux que je parte).
Винятки:
• Неправильні: être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• У nous/vous збігається з imparfait (que nous parlions).
• Після penser/croire/espérer у ствердженні — indicatif, а в запереченні чи питанні (je ne pense pas que) — subjonctif.
• Après que (після того як) вживають indicatif, хоча багато хто помилково вживає subjonctif.`,
        en: `Rules:
• Formation: que + ils-stem (présent) + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle).
• Used after: necessity (il faut que), wish/order (vouloir que, exiger que), emotion (être content que, regretter que), doubt (douter que, il se peut que), and the conjunctions bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• If the subject of both clauses is the SAME, use the infinitive: je veux partir (not je veux que je parte).
Exceptions:
• Irregular: être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• In nous/vous it equals the imparfait (que nous parlions).
• After penser/croire/espérer in the affirmative — indicative; in the negative or a question (je ne pense pas que) — subjunctive.
• Après que takes the indicative, although many wrongly use the subjunctive.`,
        fr: `Règles:
• Formation : que + radical de la forme ils au présent + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle).
• Utilisé après : nécessité (il faut que), souhait/ordre (vouloir que, exiger que), émotion (être content que, regretter que), doute (douter que, il se peut que) et les conjonctions bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• Si le sujet des deux propositions est le MÊME, utilisez l'infinitif : je veux partir (et non je veux que je parte).
Exceptions:
• Irrégulier : être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• Dans nous/vous, cela équivaut à l’imparfait (que nous parlions).
• Après penser/croire/espérer à la forme affirmative : indicatif ; à la forme négative ou interrogative (je ne pense pas que) : subjonctif.
• Après que adopte le mode indicatif, bien que beaucoup utilisent à tort le mode subjonctif.
Conjugaison (personne, nombre, genre):
| Personne | parler | finir | être | avoir | aller | faire |
| que je | parle | finisse | sois | aie | aille | fasse |
| que tu | parles | finisses | sois | aies | ailles | fasses |
| qu’il / qu’elle | parle | finisse | soit | ait | aille | fasse |
| que nous | parlions | finissions | soyons | ayons | allions | fassions |
| que vous | parliez | finissiez | soyez | ayez | alliez | fassiez |
| qu’ils / qu’elles | parlent | finissent | soient | aient | aillent | fassent |`,
        ru: `Правила:
• Образование: que + основа формы ils в présent + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle).
• Используется после: необходимости (il faut que), желания/приказа (vouloir que, exiger que), эмоции (être content que, regretter que), сомнения (douter que, il se peut que) и союзов bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• Если подлежащее в обоих предложениях ОДИНАКОВОЕ, используйте инфинитив: je veux partir (не je veux que je parte).
Исключения:
• Неправильные формы: être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• В nous/vous он равен imparfait (que nous parlions).
• После penser/croire/espérer в утвердительной форме — изъявительное наклонение; в отрицательной или вопросительной форме (je ne pense pas que) — сослагательное.
• Après que принимает изъявительное наклонение, хотя многие ошибочно используют сослагательное наклонение.
Спряжение (лицо, число, род):
| Лицо | parler | finir | être | avoir | aller | faire |
| que je | parle | finisse | sois | aie | aille | fasse |
| que tu | parles | finisses | sois | aies | ailles | fasses |
| qu’il / qu’elle | parle | finisse | soit | ait | aille | fasse |
| que nous | parlions | finissions | soyons | ayons | allions | fassions |
| que vous | parliez | finissiez | soyez | ayez | alliez | fassiez |
| qu’ils / qu’elles | parlent | finissent | soient | aient | aillent | fassent |`,
        es: `Reglas:
• Formación: que + raíz de la forma ils del présent + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle).
• Usado después de: necesidad (il faut que), deseo/orden (vouloir que, exiger que), emoción (être content que, regretter que), duda (douter que, il se peut que) y las conjunciones bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• Si el sujeto de ambas cláusulas es el MISMO, use el infinitivo: je veux partir (no je veux que je parte).
Excepciones:
• Irregular: être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• En nous/vous es igual al imparfait (que nous parlions).
• Después de penser/croire/espérer en afirmativa se usa el indicativo; en negativa o interrogativa (je ne pense pas que), el subjuntivo.
• Après que toma el modo indicativo, aunque muchos usan erróneamente el modo subjuntivo.
Conjugación (persona, número, género):
| Persona | parler | finir | être | avoir | aller | faire |
| que je | parle | finisse | sois | aie | aille | fasse |
| que tu | parles | finisses | sois | aies | ailles | fasses |
| qu’il / qu’elle | parle | finisse | soit | ait | aille | fasse |
| que nous | parlions | finissions | soyons | ayons | allions | fassions |
| que vous | parliez | finissiez | soyez | ayez | alliez | fassiez |
| qu’ils / qu’elles | parlent | finissent | soient | aient | aillent | fassent |`,
        zh: `规则:
• 构成：que + présent 中 ils 形式的词干 + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle)。
• 用在：必要性 (il faut que)、愿望/命令 (vouloir que, exiger que)、情感 (être content que, regretter que)、怀疑 (douter que, il se peut que) 和连词 bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• 如果两个子句的主语相同，则使用不定式：je veux partir（而不是 je veux que je parte）。
例外:
• 不规则：être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• 在 nous/vous 中，它等于 imparfait (que nous parlions)。
• penser/croire/espérer 的肯定式后用直陈式；否定式或疑问式 (je ne pense pas que) 后用虚拟式。
• Après que 采用直陈式，尽管许多人错误地使用了虚拟式。
变位（人称、数、性）:
| 人称 | parler | finir | être | avoir | aller | faire |
| que je | parle | finisse | sois | aie | aille | fasse |
| que tu | parles | finisses | sois | aies | ailles | fasses |
| qu’il / qu’elle | parle | finisse | soit | ait | aille | fasse |
| que nous | parlions | finissions | soyons | ayons | allions | fassions |
| que vous | parliez | finissiez | soyez | ayez | alliez | fassiez |
| qu’ils / qu’elles | parlent | finissent | soient | aient | aillent | fassent |`,
        ko: `규칙:
• 형태: que + présent의 ils형 어간 + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle).
• 뒤에 사용됨: 필요성 (il faut que), 소원/주문 (vouloir que, exiger que), 감정 (être content que, regretter que), 의심 (douter que, il se peut que) 및 접속사 bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• 두 절의 주어가 동일한 경우 부정사 je veux partir(je veux que je parte 아님)를 사용하세요.
예외:
• 불규칙: être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• nous/vous에서는 imparfait (que nous parlions)와 같습니다.
• penser/croire/espérer의 긍정형 뒤에는 직설법을, 부정형이나 의문형 (je ne pense pas que) 뒤에는 접속법을 씁니다.
• Après que는 직설법을 사용하지만 접속법을 잘못 사용하는 경우가 많습니다.
활용(인칭, 수, 성):
| 인칭 | parler | finir | être | avoir | aller | faire |
| que je | parle | finisse | sois | aie | aille | fasse |
| que tu | parles | finisses | sois | aies | ailles | fasses |
| qu’il / qu’elle | parle | finisse | soit | ait | aille | fasse |
| que nous | parlions | finissions | soyons | ayons | allions | fassions |
| que vous | parliez | finissiez | soyez | ayez | alliez | fassiez |
| qu’ils / qu’elles | parlent | finissent | soient | aient | aillent | fassent |`,
        hi: `नियम:
• रचना: que + présent में ils रूप का आधार + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle)।
• इनके बाद आता है: आवश्यकता (il faut que), इच्छा/आदेश (vouloir que, exiger que), भावना (être content que, regretter que), संदेह (douter que, il se peut que) और समुच्चयबोधक bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• दोनों उपवाक्यों का कर्ता समान हो तो अनंत रूप आता है: je veux partir (je veux que je parte नहीं)।
अपवाद:
• अनियमित रूप: être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• nous/vous में यह imparfait के समान है (que nous parlions)।
• penser/croire/espérer के सकारात्मक रूप के बाद निश्चयार्थक विधि आती है; नकारात्मक या प्रश्नवाचक रूप (je ne pense pas que) के बाद विधिलिंग आता है।
• Après que के साथ निश्चयार्थक विधि आती है, हालाँकि कई लोग ग़लती से विधिलिंग लगाते हैं।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | parler | finir | être | avoir | aller | faire |
| que je | parle | finisse | sois | aie | aille | fasse |
| que tu | parles | finisses | sois | aies | ailles | fasses |
| qu’il / qu’elle | parle | finisse | soit | ait | aille | fasse |
| que nous | parlions | finissions | soyons | ayons | allions | fassions |
| que vous | parliez | finissiez | soyez | ayez | alliez | fassiez |
| qu’ils / qu’elles | parlent | finissent | soient | aient | aillent | fassent |`,
        ga: `Rialacha:
• Foirmiú: que + fréamh na foirme ils sa présent + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle).
• Úsáidtear tar éis riachtanais (il faut que), mianta/orduithe (vouloir que, exiger que), mothúchán (être content que, regretter que), amhrais (douter que, il se peut que) agus na gcónasc bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• Más ionann ainmní an dá chlásal, úsáidtear an infinideach: je veux partir (seachas je veux que je parte).
Eisceachtaí:
• Foirmeacha neamhrialta: être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• Sna foirmeacha nous/vous, is ionann é agus an imparfait (que nous parlions).
• Tar éis penser/croire/espérer san fhoirm dhearfach, úsáidtear an modh táscach; san fhoirm dhiúltach nó i gceist (je ne pense pas que), úsáidtear an modh foshuiteach.
• Glacann Après que an modh táscach, cé go n-úsáideann go leor daoine an foshuiteach go mícheart.
Réimniú (pearsa, uimhir, inscne):
| Pearsa | parler | finir | être | avoir | aller | faire |
| que je | parle | finisse | sois | aie | aille | fasse |
| que tu | parles | finisses | sois | aies | ailles | fasses |
| qu’il / qu’elle | parle | finisse | soit | ait | aille | fasse |
| que nous | parlions | finissions | soyons | ayons | allions | fassions |
| que vous | parliez | finissiez | soyez | ayez | alliez | fassiez |
| qu’ils / qu’elles | parlent | finissent | soient | aient | aillent | fassent |`
    });

    D('subjonctif-passe', {
        uk: `Правила:
• Утворення: avoir/être у subjonctif présent + participe passé: que j’aie fini, qu’elle soit partie.
• Позначає дію, ЗАВЕРШЕНУ до дії головного речення, після тих самих тригерів, що й subjonctif présent (je suis content que tu sois venu).
Винятки:
• Вибір допоміжного й узгодження participe — як у passé composé.
• Якщо дії одночасні або наступні — subjonctif présent (je suis content que tu viennes).`,
        en: `Rules:
• Formation: avoir/être in the present subjunctive + past participle: que j’aie fini, qu’elle soit partie.
• Marks an action COMPLETED before the main clause, after the same triggers as the present subjunctive (je suis content que tu sois venu).
Exceptions:
• Auxiliary choice and participle agreement as in the passé composé.
• If the actions are simultaneous or later — present subjunctive (je suis content que tu viennes).`,
        fr: `Règles:
• Formation : avoir/être au mode présent du subjonctif + participe passé : que j’aie fini, qu’elle soit partie.
• Marque une action COMPLETÉE avant la proposition principale, après les mêmes déclencheurs que le mode subjonctif présent (je suis content que tu sois venu).
Exceptions:
• Le choix du verbe auxiliaire et l’accord du participe suivent les règles du passé composé.
• Si les actions sont simultanées ou si l’action subordonnée est ultérieure, on emploie le subjonctif présent (je suis content que tu viennes).
Conjugaison (personne, nombre, genre):
| Personne | avoir (subjonctif) + fini | être (subjonctif) + parti |
| que je | j’aie fini | je sois parti (m.) / partie (f.) |
| que tu | tu aies fini | tu sois parti / partie |
| qu’il / qu’elle | il / elle ait fini | il soit parti · elle soit partie |
| que nous | nous ayons fini | nous soyons partis / parties |
| que vous | vous ayez fini | vous soyez parti(e)(s) |
| qu’ils / qu’elles | ils / elles aient fini | ils soient partis · elles soient parties |`,
        ru: `Правила:
• Образование: avoir/être в настоящем сослагательном наклонении + причастие прошедшего времени: que j’aie fini, qu’elle soit partie.
• Отмечает действие ЗАВЕРШЕННОЕ перед главным предложением после тех же триггеров, что и текущее сослагательное наклонение (je suis content que tu sois venu).
Исключения:
• Выбор вспомогательного глагола и согласование причастия — как в passé composé.
• Если действия одновременны или действие придаточного происходит позже — subjonctif présent (je suis content que tu viennes).
Спряжение (лицо, число, род):
| Лицо | avoir (subjonctif) + fini | être (subjonctif) + parti |
| que je | j’aie fini | je sois parti (м.) / partie (ж.) |
| que tu | tu aies fini | tu sois parti / partie |
| qu’il / qu’elle | il / elle ait fini | il soit parti · elle soit partie |
| que nous | nous ayons fini | nous soyons partis / parties |
| que vous | vous ayez fini | vous soyez parti(e)(s) |
| qu’ils / qu’elles | ils / elles aient fini | ils soient partis · elles soient parties |`,
        es: `Reglas:
• Formación: avoir/être en presente de subjuntivo + participio pasado: que j’aie fini, qu’elle soit partie.
• Marca una acción COMPLETADA antes de la cláusula principal, después de los mismos desencadenantes que el presente de subjuntivo (je suis content que tu sois venu).
Excepciones:
• La elección del auxiliar y la concordancia del participio siguen las reglas del passé composé.
• Si las acciones son simultáneas o la de la subordinada es posterior, se usa el presente de subjuntivo (je suis content que tu viennes).
Conjugación (persona, número, género):
| Persona | avoir (subjonctif) + fini | être (subjonctif) + parti |
| que je | j’aie fini | je sois parti (m.) / partie (f.) |
| que tu | tu aies fini | tu sois parti / partie |
| qu’il / qu’elle | il / elle ait fini | il soit parti · elle soit partie |
| que nous | nous ayons fini | nous soyons partis / parties |
| que vous | vous ayez fini | vous soyez parti(e)(s) |
| qu’ils / qu’elles | ils / elles aient fini | ils soient partis · elles soient parties |`,
        zh: `规则:
• 构成：现在虚拟式中的avoir/être + 过去分词：que j’aie fini, qu’elle soit partie.
• 在与当前虚拟式 (je suis content que tu sois venu) 相同的触发器之后，在主句之前标记一个动作已完成。
例外:
• 助动词的选择及分词的性数配合规则与 passé composé 相同。
• 动作同时发生，或从句动作较晚发生时，用现在虚拟式 (je suis content que tu viennes)。
变位（人称、数、性）:
| 人称 | avoir (subjonctif) + fini | être (subjonctif) + parti |
| que je | j’aie fini | je sois parti （阳性） / partie （阴性） |
| que tu | tu aies fini | tu sois parti / partie |
| qu’il / qu’elle | il / elle ait fini | il soit parti · elle soit partie |
| que nous | nous ayons fini | nous soyons partis / parties |
| que vous | vous ayez fini | vous soyez parti(e)(s) |
| qu’ils / qu’elles | ils / elles aient fini | ils soient partis · elles soient parties |`,
        ko: `규칙:
• 형식: 현재 접속법의 avoir/être + 과거 분사: que j’aie fini, qu’elle soit partie.
• 주절 앞, 현재 접속법 (je suis content que tu sois venu)와 동일한 트리거 뒤의 작업 완료를 표시합니다.
예외:
• 조동사 선택과 분사의 성·수 일치 규칙은 passé composé와 같습니다.
• 동작이 동시에 일어나거나 종속절의 동작이 나중에 일어나면 접속법 현재를 씁니다 (je suis content que tu viennes).
활용(인칭, 수, 성):
| 인칭 | avoir (subjonctif) + fini | être (subjonctif) + parti |
| que je | j’aie fini | je sois parti (남성) / partie (여성) |
| que tu | tu aies fini | tu sois parti / partie |
| qu’il / qu’elle | il / elle ait fini | il soit parti · elle soit partie |
| que nous | nous ayons fini | nous soyons partis / parties |
| que vous | vous ayez fini | vous soyez parti(e)(s) |
| qu’ils / qu’elles | ils / elles aient fini | ils soient partis · elles soient parties |`,
        hi: `नियम:
• रचना: वर्तमान विधिलिंग में avoir/être + भूतकालिक कृदंत: que j’aie fini, qu’elle soit partie.
• वर्तमान विधिलिंग वाले ही प्रेरक पदों के बाद, मुख्य उपवाक्य से पहले पूर्ण हुआ कार्य दर्शाता है (je suis content que tu sois venu)।
अपवाद:
• सहायक क्रिया का चुनाव और कृदंत का लिंग-वचन सामंजस्य passé composé जैसे हैं।
• क्रियाएँ एक साथ हों या अधीन उपवाक्य की क्रिया बाद में हो तो वर्तमान विधिलिंग आता है (je suis content que tu viennes)।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | avoir (subjonctif) + fini | être (subjonctif) + parti |
| que je | j’aie fini | je sois parti (पुल्लिंग) / partie (स्त्रीलिंग) |
| que tu | tu aies fini | tu sois parti / partie |
| qu’il / qu’elle | il / elle ait fini | il soit parti · elle soit partie |
| que nous | nous ayons fini | nous soyons partis / parties |
| que vous | vous ayez fini | vous soyez parti(e)(s) |
| qu’ils / qu’elles | ils / elles aient fini | ils soient partis · elles soient parties |`,
        ga: `Rialacha:
• Foirmiú: avoir/être sa fhoshuiteach láithreach + rangabháil chaite: que j’aie fini, qu’elle soit partie.
• Léiríonn sé gníomh a críochnaíodh roimh ghníomh an phríomhchlásail, tar éis na spreagthóirí céanna leis an bhfoshuiteach láithreach (je suis content que tu sois venu).
Eisceachtaí:
• Roghnaítear an briathar cúnta agus déantar réiteach na rangabhála mar atá sa passé composé.
• Má tharlaíonn na gníomhartha ag an am céanna, nó má tharlaíonn gníomh an fhochlásail níos déanaí, úsáidtear an foshuiteach láithreach (je suis content que tu viennes).
Réimniú (pearsa, uimhir, inscne):
| Pearsa | avoir (subjonctif) + fini | être (subjonctif) + parti |
| que je | j’aie fini | je sois parti (fir.) / partie (bain.) |
| que tu | tu aies fini | tu sois parti / partie |
| qu’il / qu’elle | il / elle ait fini | il soit parti · elle soit partie |
| que nous | nous ayons fini | nous soyons partis / parties |
| que vous | vous ayez fini | vous soyez parti(e)(s) |
| qu’ils / qu’elles | ils / elles aient fini | ils soient partis · elles soient parties |`
    });

    D('imperatif', {
        uk: `Правила:
• Три форми — tu, nous, vous без підмета: parle ! parlons ! parlez !
• У tu-формі -er дієслів (і aller, ouvrir тощо) відпадає -s: parle, va, ouvre — але перед y/en повертається: vas-y, parles-en.
• Заперечення — ne … pas навколо дієслова: ne parle pas ! Займенники — ПІСЛЯ ствердного дієслова через дефіс (donne-le-moi), а в запереченні — перед ним (ne me le donne pas).
Винятки:
• Особливі форми: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez (ввічливо).
• Me/te → moi/toi після дієслова (lève-toi, donne-moi).`,
        en: `Rules:
• Three forms — tu, nous, vous without a subject: parle ! parlons ! parlez !
• The tu-form of -er verbs (and aller, ouvrir etc.) drops the -s: parle, va, ouvre — but it returns before y/en: vas-y, parles-en.
• Negation — ne … pas around the verb: ne parle pas ! Pronouns FOLLOW an affirmative verb with hyphens (donne-le-moi), but precede it in the negative (ne me le donne pas).
Exceptions:
• Special forms: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez (polite).
• Me/te become moi/toi after the verb (lève-toi, donne-moi).`,
        fr: `Règles:
• Trois formes — tu, nous, vous sans sujet : parle ! parlons ! parlez !
• La forme tu des verbes -er (et aller, ouvrir, etc.) supprime le -s : parle, va, ouvre — mais elle revient avant y/en : vas-y, parles-en.
• Négation — ne … pas autour du verbe : ne parle pas ! Les pronoms SUIVENT un verbe affirmatif avec des traits d'union (donne-le-moi), mais le précèdent du négatif (ne me le donne pas).
Exceptions:
• Formes spéciales : être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez (poli).
• Me/te devient moi/toi après le verbe (lève-toi, donne-moi).
Conjugaison (personne, nombre, genre):
| Personne | parler | finir | être | avoir | aller |
| tu | parle ! | finis ! | sois ! | aie ! | va ! |
| nous | parlons ! | finissons ! | soyons ! | ayons ! | allons ! |
| vous | parlez ! | finissez ! | soyez ! | ayez ! | allez ! |`,
        ru: `Правила:
• Три формы — tu, nous, vous без подлежащего: parle ! parlons ! parlez !
• В форме tu глаголов -er (и aller, ouvrir и т. д.) отбрасывается -s: parle, va, ouvre, но возвращается перед y/en: vas-y, parles-en.
• Отрицание — ne … pas вокруг глагола: ne parle pas ! Местоимения СЛЕДУЮТ за утвердительным глаголом через дефис (donne-le-moi), но предшествуют ему отрицательным (ne me le donne pas).
Исключения:
• Специальные формы: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez (вежливо).
• Me/te становится moi/toi после глагола (lève-toi, donne-moi).
Спряжение (лицо, число, род):
| Лицо | parler | finir | être | avoir | aller |
| tu | parle ! | finis ! | sois ! | aie ! | va ! |
| nous | parlons ! | finissons ! | soyons ! | ayons ! | allons ! |
| vous | parlez ! | finissez ! | soyez ! | ayez ! | allez ! |`,
        es: `Reglas:
• Tres formularios: tu, nous, vous sin asunto: ¡parle ! parlons ! parlez!
• La forma tu de los verbos -er (y aller, ouvrir, etc.) elimina la forma -s: parle, va, ouvre, pero regresa antes de y/en: vas-y, parles-en.
• Negación — ne … pas alrededor del verbo: ne parle pas ! Los pronombres SIGUEN a un verbo afirmativo con guiones (donne-le-moi), pero lo preceden en negativo (ne me le donne pas).
Excepciones:
• Formas especiales: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez (educado).
• Me/te se convierte en moi/toi después del verbo (lève-toi, donne-moi).
Conjugación (persona, número, género):
| Persona | parler | finir | être | avoir | aller |
| tu | parle ! | finis ! | sois ! | aie ! | va ! |
| nous | parlons ! | finissons ! | soyons ! | ayons ! | allons ! |
| vous | parlez ! | finissez ! | soyez ! | ayez ! | allez ! |`,
        zh: `规则:
• 三种形式 - tu, nous, vous 无主语：parle ! parlons ! parlez！
• -er 动词（以及 aller, ouvrir 等）的 tu 形式会删除 -s：parle, va, ouvre — 但它会在 y/en：vas-y, parles-en. 之前返回
• 否定 - ne … pas 动词周围：ne parle pas！代词位于带有连字符 (donne-le-moi) 的肯定动词之后，但位于否定动词 (ne me le donne pas) 之前。
例外:
• 特殊形式：être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez（礼貌）。
• Me/te 在动词 (lève-toi, donne-moi) 后变为 moi/toi。
变位（人称、数、性）:
| 人称 | parler | finir | être | avoir | aller |
| tu | parle ! | finis ! | sois ! | aie ! | va ! |
| nous | parlons ! | finissons ! | soyons ! | ayons ! | allons ! |
| vous | parlez ! | finissez ! | soyez ! | ayez ! | allez ! |`,
        ko: `규칙:
• 세 가지 형식 — 주어가 없는 tu, nous, vous: parle ! parlons ! parlez !
• -er 동사(및 aller, ouvrir 등)의 tu 형식은 -s: parle, va, ouvre를 삭제하지만 y/en: vas-y, parles-en. 이전에 반환됩니다.
• 부정 — 동사 주변의 ne … pas: ne parle pas ! 대명사는 하이픈 (donne-le-moi)를 사용하여 긍정 동사를 따르지만 부정 (ne me le donne pas)에서는 앞에 옵니다.
예외:
• 특수 형식: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez(정중).
• Me/te는 동사 (lève-toi, donne-moi) 다음에 moi/toi가 됩니다.
활용(인칭, 수, 성):
| 인칭 | parler | finir | être | avoir | aller |
| tu | parle ! | finis ! | sois ! | aie ! | va ! |
| nous | parlons ! | finissons ! | soyons ! | ayons ! | allons ! |
| vous | parlez ! | finissez ! | soyez ! | ayez ! | allez ! |`,
        hi: `नियम:
• तीन रूप — कर्ता के बिना tu, nous, vous: parle ! parlons ! parlez !
• -er क्रियाओं और aller, ouvrir आदि के tu रूप में -s हटता है: parle, va, ouvre; लेकिन y/en से पहले लौट आता है: vas-y, parles-en.
• नकार में क्रिया के दोनों ओर ne … pas: ne parle pas ! सकारात्मक रूप में सर्वनाम क्रिया के बाद हाइफ़न सहित आते हैं (donne-le-moi); नकारात्मक में उससे पहले (ne me le donne pas)।
अपवाद:
• विशेष रूप: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez (विनम्र)।
• क्रिया के बाद Me/te बदलकर moi/toi हो जाते हैं (lève-toi, donne-moi)।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | parler | finir | être | avoir | aller |
| tu | parle ! | finis ! | sois ! | aie ! | va ! |
| nous | parlons ! | finissons ! | soyons ! | ayons ! | allons ! |
| vous | parlez ! | finissez ! | soyez ! | ayez ! | allez ! |`,
        ga: `Rialacha:
• Trí fhoirm — tu, nous, vous gan ainmní: parle ! parlons ! parlez !
• San fhoirm tu de bhriathra -er (agus aller, ouvrir srl.), fágtar -s ar lár: parle, va, ouvre; tagann sé ar ais roimh y/en, áfach: vas-y, parles-en.
• Diúltú: ne … pas timpeall ar an mbriathar: ne parle pas ! Leanann forainmneacha briathar dearfach le fleiscíní (donne-le-moi), ach tagann siad roimhe sa diúltach (ne me le donne pas).
Eisceachtaí:
• Foirmeacha speisialta: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez (cúirtéiseach).
• Athraíonn Me/te go moi/toi tar éis an bhriathair (lève-toi, donne-moi).
Réimniú (pearsa, uimhir, inscne):
| Pearsa | parler | finir | être | avoir | aller |
| tu | parle ! | finis ! | sois ! | aie ! | va ! |
| nous | parlons ! | finissons ! | soyons ! | ayons ! | allons ! |
| vous | parlez ! | finissez ! | soyez ! | ayez ! | allez ! |`
    });

    D('infinitif', {
        uk: `Правила:
• Закінчення: -er (parler), -ir (finir), -re (vendre), -oir (pouvoir); зворотні — se lever.
• Стоїть після прийменників (pour, sans, avant de, afin de, au lieu de), після модальних (pouvoir, vouloir, devoir, savoir), після aller і venir de, а також як іменник (lire est utile).
• Заперечення інфінітива: ne pas partir (обидва слова ПЕРЕД інфінітивом).
Винятки:
• Після après — інфінітив минулого (après avoir mangé), а не простий.
• Після прийменника en вживається не інфінітив, а gérondif (en parlant).
• Дієслова з à/de перед інфінітивом: commencer à, finir de, essayer de, décider de — див. тему про прийменники.`,
        en: `Rules:
• Endings: -er (parler), -ir (finir), -re (vendre), -oir (pouvoir); reflexive — se lever.
• Follows prepositions (pour, sans, avant de, afin de, au lieu de), modals (pouvoir, vouloir, devoir, savoir), aller and venir de, and may act as a noun (lire est utile).
• Negative infinitive: ne pas partir (both words BEFORE the infinitive).
Exceptions:
• After après — the past infinitive (après avoir mangé), not the simple one.
• After the preposition en — not the infinitive but the gérondif (en parlant).
• Verbs with à/de before an infinitive: commencer à, finir de, essayer de, décider de — see the prepositions topic.`,
        fr: `Règles:
• Fin : -er (parler), -ir (finir), -re (vendre), -oir (pouvoir) ; réflexif — se lever.
• Suit les prépositions (pour, sans, avant de, afin de, au lieu de), les modaux (pouvoir, vouloir, devoir, savoir), aller et venir de, et peut agir comme un nom (lire est utile).
• Infinitif négatif : ne pas partir (les deux mots AVANT l'infinitif).
Exceptions:
• Après après — l'infinitif passé (après avoir mangé), pas le simple.
• Après la préposition en — pas l'infinitif mais le gérondif (en parlant).
• Verbes avec à/de avant un infinitif : commencer à, finir de, essayer de, décider de — voir la rubrique sur les prépositions.`,
        ru: `Правила:
• Окончания: -er (parler), -ir (finir), -re (vendre), -oir (pouvoir); рефлексивный — se lever.
• Следует за предлогами (pour, sans, avant de, afin de, au lieu de), модальными глаголами (pouvoir, vouloir, devoir, savoir), aller и venir de и может действовать как существительное (lire est utile).
• Отрицательный инфинитив: ne pas partir (оба слова ПЕРЕД инфинитивом).
Исключения:
• После après — инфинитив прошедшего времени (après avoir mangé), не простой.
• После предлога en — не инфинитив gérondif (en parlant).
• Глаголы с à/de перед инфинитивом: commencer à, finir de, essayer de, décider de — см. раздел о предлогах.`,
        es: `Reglas:
• Terminaciones: -er (parler), -ir (finir), -re (vendre), -oir (pouvoir); reflexivo — se lever.
• Sigue las preposiciones (pour, sans, avant de, afin de, au lieu de), los modales (pouvoir, vouloir, devoir, savoir), aller y venir de, y puede actuar como un sustantivo (lire est utile).
• Infinitivo negativo: ne pas partir (ambas palabras ANTES del infinitivo).
Excepciones:
• Después de après: el infinitivo pasado (après avoir mangé), no el simple.
• Después de la preposición en, no el infinitivo sino gérondif (en parlant).
• Verbos con à/de antes de un infinitivo: commencer à, finir de, essayer de, décider de — consulta el tema de preposiciones.`,
        zh: `规则:
• 结局：-er (parler)、-ir (finir)、-re (vendre)、-oir (pouvoir)；自反性 — se lever.
• 跟在介词 (pour, sans, avant de, afin de, au lieu de)、情态词 (pouvoir, vouloir, devoir, savoir)、aller 和 venir de 后面，并且可以充当名词 (lire est utile)。
• 否定不定式：ne pas partir（不定式之前的两个词）。
例外:
• après 之后 - 过去不定式 (après avoir mangé)，不是简单的。
• 介词 en 之后 — 不是不定式，而是 gérondif (en parlant)。
• 不定式前带有 à/de 的动词：commencer à, finir de, essayer de, décider de — 请参阅介词主题。`,
        ko: `규칙:
• 엔딩: -er (parler), -ir (finir), -re (vendre), -oir (pouvoir); 재귀 — se lever.
• 전치사 (pour, sans, avant de, afin de, au lieu de), 조동사 (pouvoir, vouloir, devoir, savoir), aller 및 venir de를 따르며 명사 (lire est utile) 역할을 할 수 있습니다.
• 부정사: ne pas partir(두 단어 모두 부정사 앞에 있음).
예외:
• après 이후 — 단순 동사가 아닌 과거 부정사 (après avoir mangé).
• 전치사 en 뒤에 — 부정사가 아니라 gérondif (en parlant).
• 부정사 앞에 à/de가 있는 동사: commencer à, finir de, essayer de, décider de — 전치사 항목을 참조하세요.`,
        hi: `नियम:
• अंत्यांश: -er (parler), -ir (finir), -re (vendre), -oir (pouvoir); निजवाचक: se lever.
• संबंधसूचक अव्ययों (pour, sans, avant de, afin de, au lieu de), भाववाचक क्रियाओं (pouvoir, vouloir, devoir, savoir), aller और venir de के बाद आता है; संज्ञा की तरह भी काम कर सकता है (lire est utile)।
• नकारात्मक अनंत रूप: ne pas partir (दोनों शब्द अनंत रूप से पहले)।
अपवाद:
• après के बाद सरल नहीं, भूतकालिक अनंत रूप आता है (après avoir mangé)।
• संबंधसूचक अव्यय en के बाद अनंत रूप नहीं, gérondif आता है (en parlant)।
• अनंत रूप से पहले à/de लेने वाली क्रियाएँ: commencer à, finir de, essayer de, décider de — संबंधसूचक अव्यय वाली विषयवस्तु देखें।`,
        ga: `Rialacha:
• Deirí: -er (parler), -ir (finir), -re (vendre), -oir (pouvoir); athfhillteach: se lever.
• Tagann sé tar éis réamhfhocal (pour, sans, avant de, afin de, au lieu de), briathra módúla (pouvoir, vouloir, devoir, savoir), aller agus venir de, agus féadann sé feidhmiú mar ainmfhocal (lire est utile).
• Infinideach diúltach: ne pas partir (an dá fhocal ROIMH an infinideach).
Eisceachtaí:
• Tar éis après, úsáidtear an infinideach caite (après avoir mangé) seachas an ceann simplí.
• Tar éis an réamhfhocail en, úsáidtear an gérondif (en parlant) seachas an infinideach.
• Briathra a ghlacann à/de roimh infinideach: commencer à, finir de, essayer de, décider de — féach ábhar na réamhfhocal.`
    });

    D('participe-present-gerondif', {
        uk: `Правила:
• Participe présent: основа nous + -ant (nous parlons → parlant); не змінюється в роді й числі, коли це дієслівна форма.
• Gérondif = en + participe présent: спосіб (il travaille en chantant), одночасність (en marchant), умова (en travaillant, tu réussiras).
• Підмет gérondif — той самий, що в головному реченні.
Винятки:
• Три неправильні основи: être → étant, avoir → ayant, savoir → sachant.
• Прикметники від participe узгоджуються (une histoire amusante, des enfants charmants) — це вже не дієслівна форма.
• Після прийменника en вживають лише gérondif; для інших прийменників — інфінітив (pour partir).`,
        en: `Rules:
• Present participle: nous-stem + -ant (nous parlons → parlant); invariable when it is a verb form.
• Gérondif = en + present participle: manner (il travaille en chantant), simultaneity (en marchant), condition (en travaillant, tu réussiras).
• Its subject is the same as in the main clause.
Exceptions:
• Three irregular stems: être → étant, avoir → ayant, savoir → sachant.
• Adjectives derived from the participle agree (une histoire amusante, des enfants charmants) — no longer a verb form.
• Only the gérondif follows the preposition en; other prepositions take the infinitive (pour partir).`,
        fr: `Règles:
• Participe présent : nous-radical du verbe + -ant (nous parlons → parlant) ; invariable lorsqu'il s'agit d'une forme verbale.
• Gérondif = en + participe présent : manière (il travaille en chantant), simultanéité (en marchant), condition (en travaillant, tu réussiras).
• Son sujet est le même que dans la proposition principale.
Exceptions:
• Trois radicaux irréguliers : être → étant, avoir → ayant, savoir → sachant.
• Les adjectifs dérivés d’un participe s’accordent (une histoire amusante, des enfants charmants) : ce ne sont plus des formes verbales.
• Seul le gérondif suit la préposition en ; les autres prépositions prennent l'infinitif (pour partir).`,
        ru: `Правила:
• Причастие настоящего времени: nous-основа глагола + -ant (nous parlons → parlant); неизменен, если это форма глагола.
• Gérondif = en + причастие настоящего времени: манера (il travaille en chantant), одновременность (en marchant), условие (en travaillant, tu réussiras).
• Тема такая же, как и в главном предложении.
Исключения:
• Три стебля неправильной формы: être → étant, avoir → ayant, savoir → sachant.
• Прилагательные, образованные от причастия, согласуются в роде и числе (une histoire amusante, des enfants charmants); это уже не формы глагола.
• Только gérondif следует за предлогом en; другие предлоги принимают инфинитив (pour partir).`,
        es: `Reglas:
• Participio presente: nous-raíz del verbo + -ant (nous parlons → parlant); invariable cuando es una forma verbal.
• Gérondif = en + participio presente: manera (il travaille en chantant), simultaneidad (en marchant), condición (en travaillant, tu réussiras).
• Su sujeto es el mismo que en la cláusula principal.
Excepciones:
• Tres raíces irregulares: être → étant, avoir → ayant, savoir → sachant.
• Los adjetivos derivados del participio concuerdan en género y número (une histoire amusante, des enfants charmants); ya no son formas verbales.
• Sólo el gérondif sigue a la preposición en; otras preposiciones llevan el infinitivo (pour partir).`,
        zh: `规则:
• 现在分词：nous-动词词干 + -ant (nous parlons → parlant)；当它是动词形式时不变。
• Gérondif = en + 现在分词：方式 (il travaille en chantant)，同时性 (en marchant)，条件 (en travaillant, tu réussiras)。
• 其主语与主句相同。
例外:
• 三个不规则茎：être → étant, avoir → ayant, savoir → sachant.
• 由分词构成的形容词要作性数配合 (une histoire amusante, des enfants charmants)，此时已不是动词形式。
• 只有 gérondif 跟在介词 en 后面；其他介词采用不定式(pour partir)。`,
        ko: `규칙:
• 현재 분사: nous-동사 어간 + -ant (nous parlons → parlant); 동사 형태인 경우에는 변함이 없습니다.
• Gérondif = en + 현재 분사: 방식 (il travaille en chantant), 동시성 (en marchant), 조건 (en travaillant, tu réussiras).
• 주어는 주절과 동일합니다.
예외:
• 불규칙 어간 3개: être → étant, avoir → ayant, savoir → sachant.
• 분사에서 파생된 형용사는 성·수를 일치시킵니다 (une histoire amusante, des enfants charmants). 이때는 더 이상 동사 형태가 아닙니다.
• gérondif만이 전치사 en 뒤에 옵니다. 다른 전치사는 부정사 (pour partir)를 사용합니다.`,
        hi: `नियम:
• वर्तमान कृदंत: nous का आधार + -ant (nous parlons → parlant); क्रियारूप होने पर अपरिवर्तित।
• Gérondif = en + वर्तमान कृदंत: रीति (il travaille en chantant), समकालिकता (en marchant), शर्त (en travaillant, tu réussiras)।
• इसका कर्ता मुख्य उपवाक्य वाला ही होता है।
अपवाद:
• तीन अनियमित आधार: être → étant, avoir → ayant, savoir → sachant.
• कृदंत से बने विशेषण लिंग-वचन के अनुसार बदलते हैं (une histoire amusante, des enfants charmants); वे अब क्रियारूप नहीं हैं।
• केवल gérondif ही संबंधसूचक अव्यय en के बाद आता है; अन्य संबंधसूचक अव्ययों के बाद अनंत रूप आता है (pour partir)।`,
        ga: `Rialacha:
• Rangabháil láithreach: fréamh na foirme nous + -ant (nous parlons → parlant); tá sí do-athraithe nuair is foirm bhriathartha í.
• Gérondif = en + rangabháil láithreach: modh (il travaille en chantant), comhuaineacht (en marchant), coinníoll (en travaillant, tu réussiras).
• Is ionann a hainmní agus ainmní an phríomhchlásail.
Eisceachtaí:
• Trí fhréamh neamhrialta: être → étant, avoir → ayant, savoir → sachant.
• Réitíonn aidiachtaí a dhíorthaítear ó rangabháil lena n-ainmfhocal (une histoire amusante, des enfants charmants); ní foirmeacha briathartha iad a thuilleadh.
• Ní thagann ach an gérondif tar éis an réamhfhocail en; glacann réamhfhocail eile an infinideach (pour partir).`
    });

    D('voix-passive', {
        uk: `Правила:
• Être (у потрібному часі) + participe passé, що узгоджується з підметом: la lettre est écrite, les livres ont été vendus.
• Виконавець — par (дія) або de (стан/почуття): écrit par Zola, aimé de tous.
• Часто passive уникають: on + дієслово (on parle français ici) або зворотна форма (cela se dit).
Винятки:
• Не кожне дієслово має passive: лише перехідні (з прямим додатком); непряму особу не переносять на місце підмета (на відміну від англійської).
• Passé composé з être (elle est partie) — не passive.
• Дієслова стану (être fatigué) і passive легко сплутати: порівняйте la porte est fermée (стан) і la porte est fermée par le gardien (дія).`,
        en: `Rules:
• Être (in the needed tense) + past participle agreeing with the subject: la lettre est écrite, les livres ont été vendus.
• The agent: par (action) or de (state/feeling): écrit par Zola, aimé de tous.
• The passive is often avoided: on + verb (on parle français ici) or a reflexive form (cela se dit).
Exceptions:
• Only transitive verbs (with a direct object) have a passive; an indirect object cannot become the subject (unlike English).
• The passé composé with être (elle est partie) is not a passive.
• State verbs (être fatigué) and the passive are easily confused: la porte est fermée (state) vs la porte est fermée par le gardien (action).`,
        fr: `Règles:
• Être (au temps nécessaire) + participe passé en accord avec le sujet : la lettre est écrite, les livres ont été vendus.
• L'agent : par (action) ou de (état/sentiment) : écrit par Zola, aimé de tous.
• Le passif est souvent évité : on + verbe (on parle français ici) ou une forme réfléchie (cela se dit).
Exceptions:
• Seuls les verbes transitifs (avec un complément d’objet direct) ont un passif ; un complément d’objet indirect ne peut pas devenir le sujet (contrairement à l'anglais).
• Le passé composé avec être (elle est partie) n'est pas un passif.
• Les verbes statifs (être fatigué) et passifs se confondent facilement : la porte est fermée (état) vs la porte est fermée par le gardien (action).
Conjugaison (personne, nombre, genre):
| Genre et nombre | présent | passé composé | futur simple |
| masc. sing. | le livre est écrit | le livre a été écrit | le livre sera écrit |
| fém. sing. | la lettre est écrite | la lettre a été écrite | la lettre sera écrite |
| masc. plur. | les livres sont écrits | les livres ont été écrits | les livres seront écrits |
| fém. plur. | les lettres sont écrites | les lettres ont été écrites | les lettres seront écrites |`,
        ru: `Правила:
• Être (в нужном времени) + причастие прошедшего времени, согласующееся с подлежащим: la lettre est écrite, les livres ont été vendus.
• Агент: par (действие) или de (состояние/чувство): écrit par Zola, aimé de tous.
• Пассив часто избегают: on + глагол (on parle français ici) или возвратная форма (cela se dit).
Исключения:
• Только переходные глаголы (с прямым дополнением) имеют пассив; косвенный объект не может стать подлежащим (в отличие от английского языка).
• passé composé с être (elle est partie) не является пассивным.
• Стативные глаголы (être fatigué) и пассивный залог легко спутать: la porte est fermée (состояние) и la porte est fermée par le gardien (действие).
Спряжение (лицо, число, род):
| Род и число | présent | passé composé | futur simple |
| м. р., ед. ч. | le livre est écrit | le livre a été écrit | le livre sera écrit |
| ж. р., ед. ч. | la lettre est écrite | la lettre a été écrite | la lettre sera écrite |
| м. р., мн. ч. | les livres sont écrits | les livres ont été écrits | les livres seront écrits |
| ж. р., мн. ч. | les lettres sont écrites | les lettres ont été écrites | les lettres seront écrites |`,
        es: `Reglas:
• Être (en el tiempo necesario) + participio pasado de acuerdo con el sujeto: la lettre est écrite, les livres ont été vendus.
• El agente: par (acción) o de (estado/sentimiento): écrit par Zola, aimé de tous.
• A menudo se evita la voz pasiva: on + verbo (on parle français ici) o una forma reflexiva (cela se dit).
Excepciones:
• Solo los verbos transitivos (con objeto directo) tienen pasiva; un objeto indirecto no puede convertirse en sujeto (a diferencia del inglés).
• El passé composé con être (elle est partie) no es pasivo.
• Los verbos estativos (être fatigué) y el pasivo se confunden fácilmente: la porte est fermée (estado) vs la porte est fermée par le gardien (acción).
Conjugación (persona, número, género):
| Género y número | présent | passé composé | futur simple |
| masc. sing. | le livre est écrit | le livre a été écrit | le livre sera écrit |
| fem. sing. | la lettre est écrite | la lettre a été écrite | la lettre sera écrite |
| masc. pl. | les livres sont écrits | les livres ont été écrits | les livres seront écrits |
| fem. pl. | les lettres sont écrites | les lettres ont été écrites | les lettres seront écrites |`,
        zh: `规则:
• Être（所需时态）+与主语一致的过去分词：la lettre est écrite, les livres ont été vendus.
• 代理：par（动作）或 de（状态/感觉）：écrit par Zola, aimé de tous.
• 经常避免使用被动式：on + 动词 (on parle français ici) 或反身形式 (cela se dit)。
例外:
• 只有及物动词（带有直接宾语）才有被动语态；间接宾语不能成为主语（与英语不同）。
• passé composé 与 être (elle est partie) 不是被动式。
• 静态动词 (être fatigué) 和被动动词很容易混淆：la porte est fermée（状态）与 la porte est fermée par le gardien（动作）。
变位（人称、数、性）:
| 性和数 | présent | passé composé | futur simple |
| 阳性单数 | le livre est écrit | le livre a été écrit | le livre sera écrit |
| 阴性单数 | la lettre est écrite | la lettre a été écrite | la lettre sera écrite |
| 阳性复数 | les livres sont écrits | les livres ont été écrits | les livres seront écrits |
| 阴性复数 | les lettres sont écrites | les lettres ont été écrites | les lettres seront écrites |`,
        ko: `규칙:
• Être(필요 시제) + 주어와 일치하는 과거 분사: la lettre est écrite, les livres ont été vendus.
• 에이전트: par(행동) 또는 de(상태/감정): écrit par Zola, aimé de tous.
• 수동태는 피하는 경우가 많습니다: on + 동사 (on parle français ici) 또는 재귀형 (cela se dit).
예외:
• (직접 목적어가 있는) 타동사에만 수동태가 있습니다. (영어와 달리) 간접 목적어는 주어가 될 수 없습니다.
• être (elle est partie)가 있는 passé composé는 패시브가 아닙니다.
• 상태 동사 (être fatigué)와 수동 동사는 la porte est fermée(상태)와 la porte est fermée par le gardien(동작)처럼 쉽게 혼동됩니다.
활용(인칭, 수, 성):
| 성과 수 | présent | passé composé | futur simple |
| 남성 단수 | le livre est écrit | le livre a été écrit | le livre sera écrit |
| 여성 단수 | la lettre est écrite | la lettre a été écrite | la lettre sera écrite |
| 남성 복수 | les livres sont écrits | les livres ont été écrits | les livres seront écrits |
| 여성 복수 | les lettres sont écrites | les lettres ont été écrites | les lettres seront écrites |`,
        hi: `नियम:
• Être (आवश्यक काल में) + कर्ता के लिंग-वचन के अनुरूप भूतकालिक कृदंत: la lettre est écrite, les livres ont été vendus.
• कार्य करने वाला: par (कार्य) या de (अवस्था/भावना): écrit par Zola, aimé de tous.
• कर्मवाच्य से प्रायः बचते हैं: on + क्रिया (on parle français ici) या निजवाचक रूप (cela se dit)।
अपवाद:
• केवल सकर्मक क्रियाओं, जिनका प्रत्यक्ष कर्म हो, का कर्मवाच्य बनता है; अप्रत्यक्ष कर्म कर्ता नहीं बन सकता — अंग्रेज़ी से अलग।
• être के साथ passé composé (elle est partie) कर्मवाच्य नहीं है।
• स्थितिसूचक क्रियाओं (être fatigué) और कर्मवाच्य में भ्रम हो सकता है: la porte est fermée (अवस्था) बनाम la porte est fermée par le gardien (कार्य)।
क्रिया-रूप (पुरुष, वचन, लिंग):
| लिंग और वचन | présent | passé composé | futur simple |
| पुल्लिंग एकवचन | le livre est écrit | le livre a été écrit | le livre sera écrit |
| स्त्रीलिंग एकवचन | la lettre est écrite | la lettre a été écrite | la lettre sera écrite |
| पुल्लिंग बहुवचन | les livres sont écrits | les livres ont été écrits | les livres seront écrits |
| स्त्रीलिंग बहुवचन | les lettres sont écrites | les lettres ont été écrites | les lettres seront écrites |`,
        ga: `Rialacha:
• Être (san aimsir chuí) + rangabháil chaite a réitíonn leis an ainmní: la lettre est écrite, les livres ont été vendus.
• An gníomhaí: par (gníomh) nó de (staid/mothúchán): écrit par Zola, aimé de tous.
• Is minic a sheachnaítear an fhoirm fhulangach: on + briathar (on parle français ici) nó foirm athfhillteach (cela se dit).
Eisceachtaí:
• Ní bhíonn foirm fhulangach ach ag briathra aistreacha (le cuspóir díreach); ní féidir le cuspóir indíreach a bheith ina ainmní, murab ionann agus an Béarla.
• Ní foirm fhulangach é an passé composé le être (elle est partie).
• Is furasta briathra staide (être fatigué) agus an fhoirm fhulangach a mheascadh: la porte est fermée (staid) i gcomparáid le la porte est fermée par le gardien (gníomh).
Réimniú (pearsa, uimhir, inscne):
| Inscne agus uimhir | présent | passé composé | futur simple |
| firinscneach uatha | le livre est écrit | le livre a été écrit | le livre sera écrit |
| baininscneach uatha | la lettre est écrite | la lettre a été écrite | la lettre sera écrite |
| firinscneach iolra | les livres sont écrits | les livres ont été écrits | les livres seront écrits |
| baininscneach iolra | les lettres sont écrites | les lettres ont été écrites | les lettres seront écrites |`
    });

    D('verbes-pronominaux', {
        uk: `Правила:
• Займенник узгоджується з підметом: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons).
• Типи: власне зворотні (se lever), взаємні (se parler), пасивного значення (cela se vend), суто займенникові (se souvenir, s’évanouir).
• У passé composé — тільки з être; participe узгоджується з COD, якщо він стоїть ПЕРЕД дієсловом: elle s’est lavée, але elle s’est lavé les mains.
Винятки:
• Participe НЕ узгоджується, коли займенник — непрямий додаток: elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• Дієслова se rire, se plaire, se complaire, se succéder, se ressembler, se nuire — participe незмінне.
• В імперативі: lève-toi ! (дефіс + toi), заперечення: ne te lève pas !`,
        en: `Rules:
• The pronoun agrees with the subject: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons).
• Types: truly reflexive (se lever), reciprocal (se parler), passive-like (cela se vend), purely pronominal (se souvenir, s’évanouir).
• In the passé composé — only être; the participle agrees with a direct object placed BEFORE the verb: elle s’est lavée, but elle s’est lavé les mains.
Exceptions:
• The participle does NOT agree when the pronoun is an indirect object: elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• With se rire, se plaire, se complaire, se succéder, se ressembler, se nuire — the participle is invariable.
• In the imperative: lève-toi ! (hyphen + toi), negative: ne te lève pas !`,
        fr: `Règles:
• Le pronom s'accorde avec le sujet : je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons).
• Types : (se lever) véritablement réflexif, (se parler) réciproque, (cela se vend) de type passif, (se souvenir, s’évanouir) purement pronominal.
• Dans le passé composé — uniquement être ; le participe s'accorde avec un complément d’objet direct placé AVANT le verbe : elle s’est lavée, mais elle s’est lavé les mains.
Exceptions:
• Le participe NE s'accorde PAS lorsque le pronom est un complément d’objet indirect : elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• Avec se rire, se plaire, se complaire, se succéder, se ressembler, se nuire — le participe est invariable.
• À l'impératif : lève-toi ! (trait d'union + toi), négatif : ne te lève pas !
Conjugaison (personne, nombre, genre):
| Personne | présent (se laver) | passé composé (avec être) |
| je | je me lave | je me suis lavé (m.) / lavée (f.) |
| tu | tu te laves | tu t’es lavé / lavée |
| il | il se lave | il s’est lavé |
| elle | elle se lave | elle s’est lavée |
| nous | nous nous lavons | nous nous sommes lavés / lavées |
| vous | vous vous lavez | vous vous êtes lavé(e)(s) |
| ils | ils se lavent | ils se sont lavés |
| elles | elles se lavent | elles se sont lavées |`,
        ru: `Правила:
• Местоимение соответствует подлежащему: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons).
• Типы: истинно рефлексивный (se lever), реципрокный (se parler), пассивный (cela se vend), чисто местоименный (se souvenir, s’évanouir).
• В passé composé — только être; причастие согласуется с прямым дополнением, стоящим ПЕРЕД глаголом: elle s’est lavée, но elle s’est lavé les mains.
Исключения:
• Причастие НЕ согласуется, когда местоимение является косвенным дополнением: elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• При se rire, se plaire, se complaire, se succéder, se ressembler, se nuire — причастие неизменно.
• В повелительном наклонении: lève-toi ! (дефис + toi), отрицательная форма: ne te lève pas !
Спряжение (лицо, число, род):
| Лицо | présent (se laver) | passé composé (с être) |
| je | je me lave | je me suis lavé (м.) / lavée (ж.) |
| tu | tu te laves | tu t’es lavé / lavée |
| il | il se lave | il s’est lavé |
| elle | elle se lave | elle s’est lavée |
| nous | nous nous lavons | nous nous sommes lavés / lavées |
| vous | vous vous lavez | vous vous êtes lavé(e)(s) |
| ils | ils se lavent | ils se sont lavés |
| elles | elles se lavent | elles se sont lavées |`,
        es: `Reglas:
• El pronombre concuerda con el sujeto: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons).
• Tipos: (se lever) verdaderamente reflexivo, (se parler) recíproco, (cela se vend) de tipo pasivo, (se souvenir, s’évanouir) puramente pronominal.
• En el passé composé, solo être; el participio concuerda con un objeto directo colocado ANTES del verbo: elle s’est lavée, pero elle s’est lavé les mains.
Excepciones:
• El participio NO concuerda cuando el pronombre es objeto indirecto: elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• Con se rire, se plaire, se complaire, se succéder, se ressembler, se nuire, el participio es invariable.
• En imperativo: lève-toi ! (guion + toi), negativo: ne te lève pas !
Conjugación (persona, número, género):
| Persona | présent (se laver) | passé composé (con être) |
| je | je me lave | je me suis lavé (m.) / lavée (f.) |
| tu | tu te laves | tu t’es lavé / lavée |
| il | il se lave | il s’est lavé |
| elle | elle se lave | elle s’est lavée |
| nous | nous nous lavons | nous nous sommes lavés / lavées |
| vous | vous vous lavez | vous vous êtes lavé(e)(s) |
| ils | ils se lavent | ils se sont lavés |
| elles | elles se lavent | elles se sont lavées |`,
        zh: `规则:
• 代词与主语一致：je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons)。
• 类型：真正反身(se lever)、倒数(se parler)、被动式(cela se vend)、纯代词(se souvenir, s’évanouir)。
• 在 passé composé 中 — 仅 être；分词与动词前面的直接宾语一致：elle s’est lavée，但是elle s’est lavé les mains.
例外:
• 当代词是间接宾语时，分词不一致：elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• 对于 se rire, se plaire, se complaire, se succéder, se ressembler, se nuire — 分词是不变的。
• 祈使句：lève-toi！ （连字符 + toi），负数：ne te lève pas！
变位（人称、数、性）:
| 人称 | présent (se laver) | passé composé （用 être） |
| je | je me lave | je me suis lavé （阳性） / lavée （阴性） |
| tu | tu te laves | tu t’es lavé / lavée |
| il | il se lave | il s’est lavé |
| elle | elle se lave | elle s’est lavée |
| nous | nous nous lavons | nous nous sommes lavés / lavées |
| vous | vous vous lavez | vous vous êtes lavé(e)(s) |
| ils | ils se lavent | ils se sont lavés |
| elles | elles se lavent | elles se sont lavées |`,
        ko: `규칙:
• 주어와 일치하는 대명사: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons).
• 유형: 진정한 재귀 (se lever), 상호 (se parler), 수동형 (cela se vend), 순전히 대명사 (se souvenir, s’évanouir).
• passé composé에서는 — être만; 분사는 동사 앞에 배치된 직접 목적어와 일치합니다: elle s’est lavée, 그러나 elle s’est lavé les mains.
예외:
• 대명사가 간접 목적어일 때 분사가 일치하지 않습니다: elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• se rire, se plaire, se complaire, se succéder, se ressembler, se nuire를 사용하면 분사가 변하지 않습니다.
• 명령형: lève-toi ! (하이픈 + toi), 부정: ne te lève pas !
활용(인칭, 수, 성):
| 인칭 | présent (se laver) | passé composé (être 사용) |
| je | je me lave | je me suis lavé (남성) / lavée (여성) |
| tu | tu te laves | tu t’es lavé / lavée |
| il | il se lave | il s’est lavé |
| elle | elle se lave | elle s’est lavée |
| nous | nous nous lavons | nous nous sommes lavés / lavées |
| vous | vous vous lavez | vous vous êtes lavé(e)(s) |
| ils | ils se lavent | ils se sont lavés |
| elles | elles se lavent | elles se sont lavées |`,
        hi: `नियम:
• सर्वनाम कर्ता के अनुसार होता है: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons)।
• प्रकार: वास्तविक निजवाचक (se lever), परस्परवाचक (se parler), कर्मवाच्य जैसे (cela se vend), स्वभावतः सर्वनामयुक्त (se souvenir, s’évanouir)।
• passé composé में केवल être; कृदंत क्रिया से पहले आए प्रत्यक्ष कर्म के अनुसार बदलता है: elle s’est lavée, लेकिन elle s’est lavé les mains.
अपवाद:
• सर्वनाम अप्रत्यक्ष कर्म हो तो कृदंत का सामंजस्य नहीं होता: elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• se rire, se plaire, se complaire, se succéder, se ressembler, se nuire के साथ कृदंत अपरिवर्तित रहता है।
• आज्ञार्थक: lève-toi ! (हाइफ़न + toi), नकारात्मक: ne te lève pas !
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुरुष | présent (se laver) | passé composé (être के साथ) |
| je | je me lave | je me suis lavé (पुल्लिंग) / lavée (स्त्रीलिंग) |
| tu | tu te laves | tu t’es lavé / lavée |
| il | il se lave | il s’est lavé |
| elle | elle se lave | elle s’est lavée |
| nous | nous nous lavons | nous nous sommes lavés / lavées |
| vous | vous vous lavez | vous vous êtes lavé(e)(s) |
| ils | ils se lavent | ils se sont lavés |
| elles | elles se lavent | elles se sont lavées |`,
        ga: `Rialacha:
• Réitíonn an forainm leis an ainmní: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons).
• Cineálacha: fíor-athfhillteach (se lever), cómhalartach (se parler), cosúil leis an bhfoirm fhulangach (cela se vend), forainmneach go bunúsach (se souvenir, s’évanouir).
• Sa passé composé, ní úsáidtear ach être; réitíonn an rangabháil le cuspóir díreach a thagann ROIMH an mbriathar: elle s’est lavée, ach elle s’est lavé les mains.
Eisceachtaí:
• NÍ réitíonn an rangabháil nuair is cuspóir indíreach é an forainm: elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• Le se rire, se plaire, se complaire, se succéder, se ressembler, se nuire, tá an rangabháil do-athraithe.
• Sa mhodh ordaitheach: lève-toi ! (fleiscín + toi); diúltach: ne te lève pas !
Réimniú (pearsa, uimhir, inscne):
| Pearsa | présent (se laver) | passé composé (le être) |
| je | je me lave | je me suis lavé (fir.) / lavée (bain.) |
| tu | tu te laves | tu t’es lavé / lavée |
| il | il se lave | il s’est lavé |
| elle | elle se lave | elle s’est lavée |
| nous | nous nous lavons | nous nous sommes lavés / lavées |
| vous | vous vous lavez | vous vous êtes lavé(e)(s) |
| ils | ils se lavent | ils se sont lavés |
| elles | elles se lavent | elles se sont lavées |`
    });

    D('verbes-modaux', {
        uk: `Правила:
• Pouvoir (je peux, nous pouvons, ils peuvent), vouloir (je veux, nous voulons, ils veulent), devoir (je dois, nous devons, ils doivent), savoir + ІНФІНІТИВ без прийменника.
• Значення: можливість/дозвіл (pouvoir), бажання (vouloir), обов’язок/імовірність (devoir), уміння (savoir).
• Falloir — безособове: il faut partir, il faut que tu partes.
Винятки:
• Pouvoir у питанні в 1-й особі: puis-je (а не peux-je).
• Savoir ≠ pouvoir: je sais nager (вмію), je peux nager (можу/дозволено).
• Devoir + іменник — «бути винним» (je dois dix euros), а не модальне значення.
• Participes у passé composé: dû, pu, voulu, su (je n’ai pas pu venir).`,
        en: `Rules:
• Pouvoir (je peux, nous pouvons, ils peuvent), vouloir (je veux, nous voulons, ils veulent), devoir (je dois, nous devons, ils doivent), savoir + INFINITIVE with no preposition.
• Meanings: possibility/permission (pouvoir), wish (vouloir), obligation/probability (devoir), know-how (savoir).
• Falloir is impersonal: il faut partir, il faut que tu partes.
Exceptions:
• Pouvoir in a first-person question: puis-je (not peux-je).
• Savoir ≠ pouvoir: je sais nager (I know how), je peux nager (I am able/allowed).
• Devoir + noun means "to owe" (je dois dix euros), not a modal meaning.
• Participles in the passé composé: dû, pu, voulu, su (je n’ai pas pu venir).`,
        fr: `Règles:
• Pouvoir (je peux, nous pouvons, ils peuvent), vouloir (je veux, nous voulons, ils veulent), devoir (je dois, nous devons, ils doivent), savoir + INFINITIF sans préposition.
• Significations : possibilité/permission (pouvoir), souhait (vouloir), obligation/probabilité (devoir), savoir-faire (savoir).
• Falloir est impersonnel : il faut partir, il faut que tu partes.
Exceptions:
• Pouvoir dans une question à la première personne : puis-je (et non peux-je).
• Savoir ≠ pouvoir : je sais nager (je sais comment), je peux nager (je suis capable/autorisé).
• Devoir + nom signifie « devoir » (je dois dix euros), pas une signification modale.
• Participes dans le passé composé : dû, pu, voulu, su (je n’ai pas pu venir).`,
        ru: `Правила:
• Pouvoir (je peux, nous pouvons, ils peuvent), vouloir (je veux, nous voulons, ils veulent), devoir (je dois, nous devons, ils doivent), savoir + ИНФИНИТИВ без предлога.
• Значения: возможность/разрешение (pouvoir), желание (vouloir), обязательство/вероятность (devoir), ноу-хау (savoir).
• Falloir обезличен: il faut partir, il faut que tu partes.
Исключения:
• Pouvoir в вопросе от первого лица: puis-je (не peux-je).
• Savoir ≠ pouvoir: je sais nager (я умею), je peux nager (мне можно/разрешено).
• Devoir + существительное означает "должить" (je dois dix euros), а не модальное значение.
• Причастия в passé composé: dû, pu, voulu, su (je n’ai pas pu venir).`,
        es: `Reglas:
• Pouvoir (je peux, nous pouvons, ils peuvent), vouloir (je veux, nous voulons, ils veulent), devoir (je dois, nous devons, ils doivent), savoir + INFINITIVO sin preposición.
• Significados: posibilidad/permiso (pouvoir), deseo (vouloir), obligación/probabilidad (devoir), saber hacer (savoir).
• Falloir es impersonal: il faut partir, il faut que tu partes.
Excepciones:
• Pouvoir en una pregunta en primera persona: puis-je (no peux-je).
• Savoir ≠ pouvoir: je sais nager (sé cómo), je peux nager (soy capaz/permitido).
• Devoir + sustantivo significa "deber" (je dois dix euros), no un significado modal.
• Participios en el passé composé: dû, pu, voulu, su (je n’ai pas pu venir).`,
        zh: `规则:
• Pouvoir (je peux, nous pouvons, ils peuvent)、vouloir (je veux, nous voulons, ils veulent)、devoir (je dois, nous devons, ils doivent)、savoir + 不带介词的不定式。
• 含义：可能性/许可 (pouvoir)、愿望 (vouloir)、义务/可能性 (devoir)、专有技术 (savoir)。
• Falloir 是非个人的：il faut partir, il faut que tu partes.
例外:
• 第一人称问题中的 Pouvoir：puis-je（不是 peux-je）。
• Savoir ≠ pouvoir：je sais nager（我知道如何），je peux nager（我能够/允许）。
• Devoir + 名词意思是“欠”(je dois dix euros)，不是情态含义。
• passé composé 中的分词：dû, pu, voulu, su (je n’ai pas pu venir)。`,
        ko: `규칙:
• Pouvoir (je peux, nous pouvons, ils peuvent), vouloir (je veux, nous voulons, ils veulent), devoir (je dois, nous devons, ils doivent), savoir + 전치사가 없는 부정사.
• 의미: 가능성/허가 (pouvoir), 소원 (vouloir), 의무/확률 (devoir), 노하우 (savoir).
• Falloir는 비개인적입니다: il faut partir, il faut que tu partes.
예외:
• 1인칭 질문의 Pouvoir: puis-je(peux-je 아님).
• Savoir ≠ pouvoir: je sais nager(방법을 알고 있음), je peux nager(가능/허용됨)
• Devoir + 명사는 조동사 의미가 아니라 "빚지다" (je dois dix euros)를 의미합니다.
• passé composé의 분사: dû, pu, voulu, su (je n’ai pas pu venir).`,
        hi: `नियम:
• Pouvoir (je peux, nous pouvons, ils peuvent), vouloir (je veux, nous voulons, ils veulent), devoir (je dois, nous devons, ils doivent), savoir + अनंत रूप; बीच में संबंधसूचक अव्यय नहीं।
• अर्थ: संभावना/अनुमति (pouvoir), इच्छा (vouloir), बाध्यता/संभाव्यता (devoir), कौशल (savoir)।
• Falloir निर्वैयक्तिक है: il faut partir, il faut que tu partes.
अपवाद:
• प्रथम पुरुष के प्रश्न में Pouvoir: puis-je (peux-je नहीं)।
• Savoir ≠ pouvoir: je sais nager (मुझे करना आता है), je peux nager (मैं कर सकता हूँ/अनुमति है)।
• Devoir + संज्ञा का अर्थ «ऋणी होना» है (je dois dix euros); भाववाचक अर्थ नहीं।
• passé composé में कृदंत: dû, pu, voulu, su (je n’ai pas pu venir)।`,
        ga: `Rialacha:
• Pouvoir (je peux, nous pouvons, ils peuvent), vouloir (je veux, nous voulons, ils veulent), devoir (je dois, nous devons, ils doivent), savoir + INFINIDEACH gan réamhfhocal.
• Bríonna: féidearthacht/cead (pouvoir), mian (vouloir), dualgas/dóchúlacht (devoir), fios conas (savoir).
• Tá Falloir neamhphearsanta: il faut partir, il faut que tu partes.
Eisceachtaí:
• Pouvoir i gceist sa chéad phearsa: puis-je (seachas peux-je).
• Savoir ≠ pouvoir: je sais nager (tá a fhios agam conas), je peux nager (tá mé ábalta/tá cead agam).
• Ciallaíonn Devoir + ainmfhocal «bheith i bhfiacha» (je dois dix euros); ní brí mhódúil í.
• Rangabhálacha sa passé composé: dû, pu, voulu, su (je n’ai pas pu venir).`
    });

    D('concordance-temps', {
        uk: `Правила:
• Головне в теперішньому: підрядне — présent (одночасність), passé composé (раніше), futur (пізніше): il dit qu’il vient / est venu / viendra.
• Головне в минулому: одночасність → imparfait; раніше → plus-que-parfait; пізніше → conditionnel présent: il a dit qu’il venait / était venu / viendrait.
Винятки:
• Загальна істина лишається в présent: il a dit que la Terre est ronde.
• Після si в нереальній умові — imparfait/plus-que-parfait, а не conditionnel.
• В непрямому питанні й після espérer/croire (ствердно) немає subjonctif, лише indicatif.`,
        en: `Rules:
• Main clause in the present: subordinate — présent (simultaneous), passé composé (earlier), futur (later): il dit qu’il vient / est venu / viendra.
• Main clause in the past: simultaneous → imparfait; earlier → plus-que-parfait; later → present conditional: il a dit qu’il venait / était venu / viendrait.
Exceptions:
• A general truth stays in the présent: il a dit que la Terre est ronde.
• After si in an unreal condition — imparfait/plus-que-parfait, not the conditional.
• In an indirect question and after espérer/croire (affirmative) — indicative, never subjunctive.`,
        fr: `Règles:
• Proposition principale au présent : subordonnée — présent (simultané), passé composé (avant), futur (plus tard) : il dit qu’il vient / est venu / viendra.
• Proposition principale dans le passé : simultané → imparfait ; plus tôt → plus-que-parfait ; plus tard → présent conditionnel : il a dit qu’il venait / était venu / viendrait.
Exceptions:
• Une vérité générale demeure dans le présent : il a dit que la Terre est ronde.
• Après si dans une condition irréelle — imparfait/plus-que-parfait, pas le conditionnel.
• Dans une interrogation indirecte et après espérer/croire à l’affirmative : indicatif, jamais subjonctif.`,
        ru: `Правила:
• Главное предложение в настоящем: подчиненное — présent (одновременно), passé composé (ранее), futur (позже): il dit qu’il vient / est venu / viendra.
• Главное предложение в прошедшем времени: одновременно → imparfait; ранее → plus-que-parfait; позже → настоящее условное наклонение: il a dit qu’il venait / était venu / viendrait.
Исключения:
• Общая истина остается в présent: il a dit que la Terre est ronde.
• После si в нереальном условии — imparfait/plus-que-parfait, а не в условном.
• В косвенном вопросе и после espérer/croire в утвердительной форме — изъявительное наклонение, а не сослагательное.`,
        es: `Reglas:
• Cláusula principal en presente: subordinada — présent (simultánea), passé composé (antes), futur (después): il dit qu’il vient / est venu / viendra.
• Cláusula principal en pasado: simultáneo → imparfait; antes → plus-que-parfait; más tarde → presente condicional: il a dit qu’il venait / était venu / viendrait.
Excepciones:
• Una verdad general queda en el présent: il a dit que la Terre est ronde.
• Después de si en una condición irreal: imparfait/plus-que-parfait, no el condicional.
• En una interrogativa indirecta y después de espérer/croire en afirmativa se usa el indicativo, nunca el subjuntivo.`,
        zh: `规则:
• 现在主句：从属 — présent（同时）、passé composé（在前）、futur（在后）：il dit qu’il vient / est venu / viendra.
• 过去主从句：同时 → imparfait;较早 → plus-que-parfait；稍后 → 现在条件式：il a dit qu’il venait / était venu / viendrait.
例外:
• présent 中存在一个普遍真理：il a dit que la Terre est ronde.
• 在非真实条件式下的 si 之后 — imparfait/plus-que-parfait，而不是条件式。
• 间接疑问句中，以及肯定式的 espérer/croire 后，用直陈式，不用虚拟式。`,
        ko: `규칙:
• 현재의 주절: 종속 — présent(동시), passé composé(이전), futur(나중에): il dit qu’il vient / est venu / viendra.
• 과거 주절: 동시 → imparfait; 이전 → plus-que-parfait; 나중에 → 현재 조건법: il a dit qu’il venait / était venu / viendrait.
예외:
• présent: il a dit que la Terre est ronde.에는 일반적인 진실이 있습니다
• 비현실적인 조건의 si 이후 — 조건법가 아닌 imparfait/plus-que-parfait.
• 간접의문문과 espérer/croire의 긍정형 뒤에서는 직설법을 쓰며, 접속법을 쓰지 않습니다.`,
        hi: `नियम:
• मुख्य उपवाक्य वर्तमान में: अधीन उपवाक्य में présent (समकालिक), passé composé (पहले), futur (बाद में): il dit qu’il vient / est venu / viendra.
• मुख्य उपवाक्य भूतकाल में: समकालिक → imparfait; पहले → plus-que-parfait; बाद में → वर्तमान शर्तवाचक: il a dit qu’il venait / était venu / viendrait.
अपवाद:
• सामान्य सत्य présent में रहता है: il a dit que la Terre est ronde.
• अवास्तविक शर्त में si के बाद imparfait/plus-que-parfait, शर्तवाचक नहीं।
• अप्रत्यक्ष प्रश्न में और espérer/croire के सकारात्मक रूप के बाद निश्चयार्थक विधि आती है, विधिलिंग नहीं।`,
        ga: `Rialacha:
• Príomhchlásal sa láithreach: fochlásal sa présent (ag an am céanna), passé composé (roimhe), futur (ina dhiaidh): il dit qu’il vient / est venu / viendra.
• Príomhchlásal san am atá caite: ag an am céanna → imparfait; roimhe → plus-que-parfait; ina dhiaidh → coinníollach láithreach: il a dit qu’il venait / était venu / viendrait.
Eisceachtaí:
• Fanann fírinne ghinearálta sa présent: il a dit que la Terre est ronde.
• Tar éis si i gcoinníoll neamhréadúil, úsáidtear an imparfait/plus-que-parfait, ní an coinníollach.
• I gceist indíreach agus tar éis espérer/croire san fhoirm dhearfach, úsáidtear an modh táscach, ní an modh foshuiteach.`
    });

    D('discours-indirect', {
        uk: `Правила:
• Твердження: dire que; питання «так/ні»: demander si; питання з питальним словом: demander ce que/où/quand…; наказ: dire de + інфінітив.
• Займенники й слова часу зсуваються: je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• Час змінюється за concordance des temps (présent → imparfait тощо).
Винятки:
• Inversion зникає: Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• Si перед il/ils → s’il, але перед elle — si elle.`,
        en: `Rules:
• Statements: dire que; yes/no questions: demander si; wh-questions: demander ce que/où/quand…; orders: dire de + infinitive.
• Pronouns and time words shift: je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• Tenses shift by the concordance des temps (présent → imparfait etc.).
Exceptions:
• Inversion disappears: Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• Si before il/ils → s’il, but before elle — si elle.`,
        fr: `Règles:
• Déclarations : dire que ; questions oui/non : demander si ; questions wh : demander ce que/où/quand… ; ordres : dire de + infinitif.
• Décalage des pronoms et des mots temporels : je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• Les temps changent selon le concordance des temps (présent → imparfait etc.).
Exceptions:
• L'inversion disparaît : Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• Si avant il/ils → s’il, mais avant elle — si elle.`,
        ru: `Правила:
• Утверждения: dire que; вопросы да/нет: demander si; ч-вопросы: demander ce que/où/quand…; заказы: dire de + инфинитив.
• Местоимения и временные слова меняются: je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• Время меняется на concordance des temps (présent → imparfait и т. д.).
Исключения:
• Инверсия исчезает: Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• Si перед il/ils → s’il, но перед elle — si elle.`,
        es: `Reglas:
• Declaraciones: dire que; preguntas de sí/no: demander si; preguntas-wh: demander ce que/où/quand…; órdenes: dire de + infinitivo.
• Cambio de pronombres y palabras de tiempo: je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• Los tiempos cambian según el concordance des temps (présent → imparfait, etc.).
Excepciones:
• La inversión desaparece: Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• Si antes de il/ils → s’il, pero antes de elle — si elle.`,
        zh: `规则:
• 语句：dire que；是/否问题：demander si； wh-问题：demander ce que/où/quand…；命令：dire de + 不定式。
• 代词和时间词变化：je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• 时态变换为 concordance des temps（présent → imparfait 等）。
例外:
• 反转消失：Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• Si 在 il/ils → s’il 之前，但在 elle — si elle. 之前`,
        ko: `규칙:
• 진술: dire que; 예/아니오 질문: demander si; wh-질문: demander ce que/où/quand...; 주문: dire de + 부정사.
• 대명사 및 시간어 이동: je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• concordance des temps(présent → imparfait 등)에 의해 시제가 이동합니다.
예외:
• 반전이 사라짐: Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• Si는 il/ils → s’il 이전, elle — si elle. 이전`,
        hi: `नियम:
• कथन: dire que; हाँ/नहीं वाले प्रश्न: demander si; प्रश्नवाचक शब्द वाले प्रश्न: demander ce que/où/quand…; आदेश: dire de + अनंत रूप।
• सर्वनाम और समयसूचक शब्द बदलते हैं: je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• काल concordance des temps के अनुसार बदलते हैं (présent → imparfait आदि)।
अपवाद:
• उलटा शब्दक्रम हट जाता है: Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• il/ils → s’il से पहले Si, लेकिन elle — si elle. से पहले नहीं।`,
        ga: `Rialacha:
• Ráitis: dire que; ceisteanna sea/ní hea: demander si; ceisteanna le focal ceisteach: demander ce que/où/quand…; orduithe: dire de + infinideach.
• Athraíonn forainmneacha agus focail ama: je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• Athraíonn na haimsirí de réir an concordance des temps (présent → imparfait srl.).
Eisceachtaí:
• Imíonn an t-inbhéartú: Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• Roimh il/ils → s’il, úsáidtear Si, ach roimh elle — si elle.`
    });

    D('accord-participe-etre', {
        uk: `Правила:
• З être participe узгоджується з підметом у роді й числі: il est parti, elle est partie, ils sont partis, elles sont parties.
• Те саме з passive: la lettre est écrite.
• Зі зворотними дієсловами правило складніше (див. verbes pronominaux).
Винятки:
• З on: якщо on = nous, participe може узгоджуватись (on est allées — жінки).
• Vous у ввічливій формі однини: узгодження з реальним підметом (vous êtes arrivée, madame).
• Дієслова руху, що беруть avoir (sortir une voiture), підпорядковуються іншому правилу — узгодження лише з COD перед дієсловом.`,
        en: `Rules:
• With être the participle agrees with the subject in gender and number: il est parti, elle est partie, ils sont partis, elles sont parties.
• The same in the passive: la lettre est écrite.
• With reflexive verbs the rule is more complex (see reflexive verbs).
Exceptions:
• With on: when on = nous, the participle can agree (on est allées — women).
• Polite vous for one person: agree with the real subject (vous êtes arrivée, madame).
• Motion verbs that take avoir (sortir une voiture) follow the other rule — agreement only with a COD placed before the verb.`,
        fr: `Règles:
• Avec être le participe s'accorde avec le sujet en genre et en nombre : il est parti, elle est partie, ils sont partis, elles sont parties.
• Idem au passif : la lettre est écrite.
• Avec les verbes réfléchis, la règle est plus complexe (voir verbes réfléchis).
Exceptions:
• Avec on : quand on = nous, le participe peut s'accorder (on est allées — femmes).
• Avec vous de politesse désignant une seule personne, l’accord se fait avec le sujet réel (vous êtes arrivée, madame).
• Les verbes de mouvement qui prennent avoir (sortir une voiture) suivent l'autre règle : accord uniquement avec un COD placé avant le verbe.
Conjugaison (personne, nombre, genre):
| Genre et nombre | Terminaison | Exemple |
| masc. sing. | — | il est parti |
| fém. sing. | +e | elle est partie |
| masc. plur. | +s | ils sont partis |
| fém. plur. | +es | elles sont parties |`,
        ru: `Правила:
• При être причастие согласуется с подлежащим в роде и числе: il est parti, elle est partie, ils sont partis, elles sont parties.
• То же в пассиве: la lettre est écrite.
• С возвратными глаголами правило более сложное (см. Возвратные глаголы).
Исключения:
• При on: при on = nous причастие может согласовываться (on est allées — женщины).
• При вежливом обращении vous к одному человеку согласование идёт с реальным подлежащим (vous êtes arrivée, madame).
• Глаголы движения, которые принимают avoir (sortir une voiture), подчиняются другому правилу — согласование только с COD, поставленным перед глаголом.
Спряжение (лицо, число, род):
| Род и число | Окончание | Пример |
| м. р., ед. ч. | — | il est parti |
| ж. р., ед. ч. | +e | elle est partie |
| м. р., мн. ч. | +s | ils sont partis |
| ж. р., мн. ч. | +es | elles sont parties |`,
        es: `Reglas:
• Con être el participio concuerda con el sujeto en género y número: il est parti, elle est partie, ils sont partis, elles sont parties.
• Lo mismo en la pasiva: la lettre est écrite.
• Con los verbos reflexivos la regla es más compleja (ver verbos reflexivos).
Excepciones:
• Con on: cuando on = nous, el participio puede concordar (on est allées — mujeres).
• Con vous de cortesía dirigido a una sola persona, se concuerda con el sujeto real (vous êtes arrivée, madame).
• Los verbos de movimiento que toman avoir (sortir une voiture) siguen la otra regla: concordancia solo con un COD colocado antes del verbo.
Conjugación (persona, número, género):
| Género y número | Terminación | Ejemplo |
| masc. sing. | — | il est parti |
| fem. sing. | +e | elle est partie |
| masc. pl. | +s | ils sont partis |
| fem. pl. | +es | elles sont parties |`,
        zh: `规则:
• être 分词与主语性和数一致：il est parti, elle est partie, ils sont partis, elles sont parties.
• 被动式相同：la lettre est écrite.
• 对于反身动词，规则更加复杂（请参阅反身动词）。
例外:
• 对于 on：当 on = nous 时，分词可以配合（on est allées — 女性）。
• vous 礼貌地指一个人时，按实际主语的性和数配合 (vous êtes arrivée, madame)。
• 采用 avoir (sortir une voiture) 的运动动词遵循其他规则 - 仅与放在动词前面的 COD 一致。
变位（人称、数、性）:
| 性和数 | 词尾 | 例子 |
| 阳性单数 | — | il est parti |
| 阴性单数 | +e | elle est partie |
| 阳性复数 | +s | ils sont partis |
| 阴性复数 | +es | elles sont parties |`,
        ko: `규칙:
• être를 사용하면 분사가 성별 및 수의 주어와 일치합니다: il est parti, elle est partie, ils sont partis, elles sont parties.
• 패시브에서도 동일: la lettre est écrite.
• 재귀 동사의 경우 규칙이 더 복잡합니다(재귀 동사 참조).
예외:
• on 사용: on = nous인 경우 분사가 일치할 수 있습니다(on est allées — 여성).
• 한 사람에게 공손하게 vous를 쓸 때는 실제 주어에 성·수를 일치시킵니다 (vous êtes arrivée, madame).
• avoir (sortir une voiture)를 취하는 동작 동사는 다른 규칙을 따릅니다. 즉 동사 앞에 있는 COD와만 일치합니다.
활용(인칭, 수, 성):
| 성과 수 | 어미 | 예문 |
| 남성 단수 | — | il est parti |
| 여성 단수 | +e | elle est partie |
| 남성 복수 | +s | ils sont partis |
| 여성 복수 | +es | elles sont parties |`,
        hi: `नियम:
• être के साथ कृदंत कर्ता के लिंग-वचन के अनुसार बदलता है: il est parti, elle est partie, ils sont partis, elles sont parties.
• कर्मवाच्य में भी ऐसा ही है: la lettre est écrite.
• निजवाचक क्रियाओं में नियम अधिक जटिल है; निजवाचक क्रियाएँ देखें।
अपवाद:
• on के साथ: जब on = nous हो, तो कृदंत का सामंजस्य हो सकता है (on est allées — महिलाएँ)।
• एक व्यक्ति के लिए आदरसूचक vous होने पर सामंजस्य वास्तविक कर्ता के अनुसार होता है (vous êtes arrivée, madame)।
• avoir लेने वाली गति-क्रियाओं (sortir une voiture) का नियम अलग है: सामंजस्य केवल क्रिया से पहले आए COD से।
क्रिया-रूप (पुरुष, वचन, लिंग):
| लिंग और वचन | प्रत्यय | उदाहरण |
| पुल्लिंग एकवचन | — | il est parti |
| स्त्रीलिंग एकवचन | +e | elle est partie |
| पुल्लिंग बहुवचन | +s | ils sont partis |
| स्त्रीलिंग बहुवचन | +es | elles sont parties |`,
        ga: `Rialacha:
• Le être, réitíonn an rangabháil leis an ainmní ó thaobh inscne agus uimhreach: il est parti, elle est partie, ils sont partis, elles sont parties.
• Is amhlaidh sa fhoirm fhulangach freisin: la lettre est écrite.
• Tá an riail níos casta le briathra athfhillteacha; féach briathra athfhillteacha.
Eisceachtaí:
• Le on: nuair is on = nous atá i gceist, féadann an rangabháil réiteach leis (on est allées — mná).
• Le vous cúirtéiseach do dhuine amháin, déantar réiteach leis an bhfíorábhar (vous êtes arrivée, madame).
• Leanann briathra gluaiseachta a ghlacann avoir (sortir une voiture) an riail eile: ní dhéantar réiteach ach le COD a thagann roimh an mbriathar.
Réimniú (pearsa, uimhir, inscne):
| Inscne agus uimhir | Deireadh | Sampla |
| firinscneach uatha | — | il est parti |
| baininscneach uatha | +e | elle est partie |
| firinscneach iolra | +s | ils sont partis |
| baininscneach iolra | +es | elles sont parties |`
    });

    D('accord-participe-avoir', {
        uk: `Правила:
• Participe з avoir узгоджується з прямим додатком (COD), ЯКЩО він стоїть ПЕРЕД дієсловом: les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• Якщо COD після дієслова або його немає — participe незмінне: j’ai mangé des pommes, elles ont parlé.
Винятки:
• З займенником en participe незмінне: j’en ai mangé.
• Незмінні participes: coûté, valu, duré, vécu, couru, pesé у прямому значенні (les dix euros que ce livre m’a coûté).
• Перед інфінітивом participe узгоджується, лише коли COD сам виконує дію інфінітива: la femme que j’ai vue chanter (вона співає — узгоджується), les chansons que j’ai entendu chanter (пісні не співають — не узгоджується).
• Le (= це) невизначене: elle est plus grande que je ne l’avais pensé (незмінне).`,
        en: `Rules:
• With avoir the participle agrees with the direct object (COD) ONLY if it comes BEFORE the verb: les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• If the COD follows the verb or is absent, the participle is invariable: j’ai mangé des pommes, elles ont parlé.
Exceptions:
• With the pronoun en the participle is invariable: j’en ai mangé.
• Invariable participles: coûté, valu, duré, vécu, couru, pesé in their literal sense (les dix euros que ce livre m’a coûté).
• Before an infinitive the participle agrees only if the COD performs the infinitive’s action: la femme que j’ai vue chanter (agrees), les chansons que j’ai entendu chanter (does not).
• Neuter le (= it): elle est plus grande que je ne l’avais pensé (invariable).`,
        fr: `Règles:
• Avec avoir le participe s'accorde avec l'complément d’objet direct (COD) SEULEMENT s'il vient AVANT le verbe : les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• Si le COD suit le verbe ou est absent, le participe est invariable : j’ai mangé des pommes, elles ont parlé.
Exceptions:
• Avec le pronom en le participe est invariable : j’en ai mangé.
• Participes invariables : coûté, valu, duré, vécu, couru, pesé au sens littéral (les dix euros que ce livre m’a coûté).
• Devant un infinitif, le participe s’accorde seulement si le COD accomplit l’action de l’infinitif : la femme que j’ai vue chanter (accord), les chansons que j’ai entendu chanter (pas d’accord).
• Neutre le (= it) : elle est plus grande que je ne l’avais pensé (invariable).
Conjugaison (personne, nombre, genre):
| COD avant le verbe | participe | Exemple |
| masc. sing. | mangé | le gâteau que j’ai mangé |
| fém. sing. | mangée | la pomme que j’ai mangée |
| masc. plur. | mangés | les gâteaux que j’ai mangés |
| fém. plur. | mangées | les pommes que j’ai mangées |`,
        ru: `Правила:
• При avoir причастие согласуется с прямым дополнением (COD) ТОЛЬКО если оно стоит ПЕРЕД глаголом: les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• Если COD следует за глаголом или отсутствует, причастие неизменно: j’ai mangé des pommes, elles ont parlé.
Исключения:
• С местоимением en причастие неизменно: j’en ai mangé.
• Неизменяемые причастия: coûté, valu, duré, vécu, couru, pesé в прямом смысле (les dix euros que ce livre m’a coûté).
• Перед инфинитивом причастие согласуется, только если COD выполняет действие инфинитива: la femme que j’ai vue chanter (согласуется), les chansons que j’ai entendu chanter (не согласуется).
• Средний род le (= it): elle est plus grande que je ne l’avais pensé (неизменяемый).
Спряжение (лицо, число, род):
| Прямое дополнение (COD) перед глаголом | participe | Пример |
| м. р., ед. ч. | mangé | le gâteau que j’ai mangé |
| ж. р., ед. ч. | mangée | la pomme que j’ai mangée |
| м. р., мн. ч. | mangés | les gâteaux que j’ai mangés |
| ж. р., мн. ч. | mangées | les pommes que j’ai mangées |`,
        es: `Reglas:
• Con avoir el participio concuerda con el objeto directo (COD) SÓLO si va ANTES del verbo: les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• Si el COD sigue al verbo o está ausente, el participio es invariable: j’ai mangé des pommes, elles ont parlé.
Excepciones:
• Con el pronombre en el participio es invariable: j’en ai mangé.
• Participios invariables: coûté, valu, duré, vécu, couru, pesé en su sentido literal (les dix euros que ce livre m’a coûté).
• Ante un infinitivo, el participio concuerda solo si el COD realiza la acción del infinitivo: la femme que j’ai vue chanter (concuerda), les chansons que j’ai entendu chanter (no concuerda).
• Pronombre neutro le (= it): elle est plus grande que je ne l’avais pensé (invariable).
Conjugación (persona, número, género):
| Complemento directo (COD) antes del verbo | participe | Ejemplo |
| masc. sing. | mangé | le gâteau que j’ai mangé |
| fem. sing. | mangée | la pomme que j’ai mangée |
| masc. pl. | mangés | les gâteaux que j’ai mangés |
| fem. pl. | mangées | les pommes que j’ai mangées |`,
        zh: `规则:
• 对于 avoir，分词只有在动词之前才与直接宾语 (COD) 一致：les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• 如果 COD 跟在动词后面或不存在，则分词不变：j’ai mangé des pommes, elles ont parlé.
例外:
• 代词 en 的分词是不变的：j’en ai mangé.
• 不变分词：字面意义上的 coûté, valu, duré, vécu, couru, pesé (les dix euros que ce livre m’a coûté)。
• 不定式前的分词，只有在 COD 执行不定式所表示的动作时才与其保持性数一致：la femme que j’ai vue chanter（配合），les chansons que j’ai entendu chanter（不配合）。
• 中性 le（= it）：elle est plus grande que je ne l’avais pensé（不变）。
变位（人称、数、性）:
| 动词前的直接宾语 (COD) | participe | 例子 |
| 阳性单数 | mangé | le gâteau que j’ai mangé |
| 阴性单数 | mangée | la pomme que j’ai mangée |
| 阳性复数 | mangés | les gâteaux que j’ai mangés |
| 阴性复数 | mangées | les pommes que j’ai mangées |`,
        ko: `규칙:
• avoir의 경우 분사는 동사 앞에 오는 경우에만 직접 목적어 (COD)와 일치합니다: les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• COD가 동사 뒤에 나오거나 없으면 분사는 변하지 않습니다: j’ai mangé des pommes, elles ont parlé.
예외:
• 대명사 en의 경우 분사는 불변입니다: j’en ai mangé.
• 불변 분사: coûté, valu, duré, vécu, couru, pesé는 문자 그대로 (les dix euros que ce livre m’a coûté)입니다.
• 부정사 앞의 분사는 COD가 부정사의 동작을 수행할 때만 성·수를 일치시킵니다: la femme que j’ai vue chanter (일치), les chansons que j’ai entendu chanter (불일치).
• 중성 le (= it): elle est plus grande que je ne l’avais pensé (불변).
활용(인칭, 수, 성):
| 동사 앞의 직접목적어 (COD) | participe | 예문 |
| 남성 단수 | mangé | le gâteau que j’ai mangé |
| 여성 단수 | mangée | la pomme que j’ai mangée |
| 남성 복수 | mangés | les gâteaux que j’ai mangés |
| 여성 복수 | mangées | les pommes que j’ai mangées |`,
        hi: `नियम:
• avoir के साथ कृदंत प्रत्यक्ष कर्म (COD) के अनुसार केवल तभी बदलता है जब वह क्रिया से पहले आए: les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• COD क्रिया के बाद आए या न हो तो कृदंत अपरिवर्तित है: j’ai mangé des pommes, elles ont parlé.
अपवाद:
• सर्वनाम en के साथ कृदंत अपरिवर्तित है: j’en ai mangé.
• अपरिवर्तनीय कृदंत: coûté, valu, duré, vécu, couru, pesé अपने शाब्दिक अर्थ में (les dix euros que ce livre m’a coûté)।
• अनंत रूप से पहले कृदंत का लिंग-वचन सामंजस्य तभी होता है जब COD उस क्रिया को करता है: la femme que j’ai vue chanter (सामंजस्य), les chansons que j’ai entendu chanter (सामंजस्य नहीं)।
• तटस्थ le (= यह): elle est plus grande que je ne l’avais pensé (अपरिवर्तित)।
क्रिया-रूप (पुरुष, वचन, लिंग):
| क्रिया से पहले प्रत्यक्ष कर्म (COD) | participe | उदाहरण |
| पुल्लिंग एकवचन | mangé | le gâteau que j’ai mangé |
| स्त्रीलिंग एकवचन | mangée | la pomme que j’ai mangée |
| पुल्लिंग बहुवचन | mangés | les gâteaux que j’ai mangés |
| स्त्रीलिंग बहुवचन | mangées | les pommes que j’ai mangées |`,
        ga: `Rialacha:
• Le avoir, ní réitíonn an rangabháil leis an gcuspóir díreach (COD) ACH má thagann sé ROIMH an mbriathar: les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• Má thagann an COD tar éis an bhriathair nó mura bhfuil sé ann, tá an rangabháil do-athraithe: j’ai mangé des pommes, elles ont parlé.
Eisceachtaí:
• Leis an bhforainm en, tá an rangabháil do-athraithe: j’en ai mangé.
• Rangabhálacha do-athraithe: coûté, valu, duré, vécu, couru, pesé ina mbrí litriúil (les dix euros que ce livre m’a coûté).
• Roimh infinideach, ní réitíonn an rangabháil leis an COD ach má dhéanann an COD gníomh an infinidigh: la femme que j’ai vue chanter (réiteach), les chansons que j’ai entendu chanter (gan réiteach).
• le neodrach (= é sin): elle est plus grande que je ne l’avais pensé (do-athraithe).
Réimniú (pearsa, uimhir, inscne):
| Cuspóir díreach (COD) roimh an mbriathar | participe | Sampla |
| firinscneach uatha | mangé | le gâteau que j’ai mangé |
| baininscneach uatha | mangée | la pomme que j’ai mangée |
| firinscneach iolra | mangés | les gâteaux que j’ai mangés |
| baininscneach iolra | mangées | les pommes que j’ai mangées |`
    });

    D('accord-adjectif', {
        uk: `Правила:
• Жіночий рід — зазвичай +e (petit → petite), множина +s (petits, petites); для -s/-x множина не змінюється (gris, heureux).
• Прикметник узгоджується з іменником, до якого належить, і після être (elle est contente).
• Кілька іменників: якщо різного роду — чоловічий рід множини (un homme et une femme contents).
Винятки:
• Подвоєння: bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• Особливі: beau → belle (bel перед голосним), nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• Множина: -al → -aux (national → nationaux; але banal, final, fatal, naval → -als), beau/nouveau → +x.
• Незмінні: кольори від іменників (orange, marron), compounds (bleu foncé), demi/nu перед іменником.`,
        en: `Rules:
• Feminine is usually +e (petit → petite), plural +s (petits, petites); -s/-x plurals are unchanged (gris, heureux).
• The adjective agrees with its noun and also after être (elle est contente).
• Several nouns: if of mixed gender — masculine plural (un homme et une femme contents).
Exceptions:
• Doubling: bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• Special: beau → belle (bel before a vowel), nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• Plurals: -al → -aux (national → nationaux; but banal, final, fatal, naval → -als), beau/nouveau → +x.
• Invariable: colours from nouns (orange, marron), compounds (bleu foncé), demi/nu before the noun.`,
        fr: `Règles:
• Le féminin est généralement +e (petit → petite), le pluriel +s (petits, petites) ; Les pluriels -s/-x restent inchangés (gris, heureux).
• L'adjectif s'accorde avec son nom et aussi après être (elle est contente).
• Plusieurs noms : si de genre mixte — masculin pluriel (un homme et une femme contents).
Exceptions:
• Doublage : bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• Spécial : beau → belle (bel avant une voyelle), nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• Pluriel : -al → -aux (national → nationaux ; mais banal, final, fatal, naval → -als), beau/nouveau → +x.
• Invariable : couleurs des noms (orange, marron), composés (bleu foncé), demi/nu avant le nom.
Conjugaison (personne, nombre, genre):
| masc. sing. | fém. sing. | masc. plur. | fém. plur. |
| petit | petite | petits | petites |
| grand | grande | grands | grandes |
| bon | bonne | bons | bonnes |
| heureux | heureuse | heureux | heureuses |
| blanc | blanche | blancs | blanches |
| beau (bel) | belle | beaux | belles |
| nouveau (nouvel) | nouvelle | nouveaux | nouvelles |`,
        ru: `Правила:
• Женский род обычно +e (petit → petite), множественное число +s (petits, petites); -s/-x во множественном числе остаются без изменений (gris, heureux).
• Прилагательное согласуется со своим существительным, а также после être (elle est contente).
• Несколько существительных: если смешанного рода — мужского рода во множественном числе (un homme et une femme contents).
Исключения:
• Удвоение: bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• Специальный вариант: beau → belle (bel перед гласной), nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• Множественное число: -al → -aux (national → nationaux; но banal, final, fatal, naval → -als), beau/nouveau → +x.
• Неизменяемые: цвета от существительных (orange, marron), составные (bleu foncé), demi/nu перед существительным.
Спряжение (лицо, число, род):
| м. р., ед. ч. | ж. р., ед. ч. | м. р., мн. ч. | ж. р., мн. ч. |
| petit | petite | petits | petites |
| grand | grande | grands | grandes |
| bon | bonne | bons | bonnes |
| heureux | heureuse | heureux | heureuses |
| blanc | blanche | blancs | blanches |
| beau (bel) | belle | beaux | belles |
| nouveau (nouvel) | nouvelle | nouveaux | nouvelles |`,
        es: `Reglas:
• Lo femenino suele ser +e (petit → petite), plural +s (petits, petites); Los plurales -s/-x no cambian (gris, heureux).
• El adjetivo concuerda con su sustantivo y también después de être (elle est contente).
• Varios sustantivos: si es de género mixto, plural masculino (un homme et une femme contents).
Excepciones:
• Duplicación: bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• Especial: beau → belle (bel antes de una vocal), nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• Plurales: -al → -aux (national → nationaux; pero banal, final, fatal, naval → -als), beau/nouveau → +x.
• Invariable: colores de los sustantivos (orange, marron), compuestos (bleu foncé), demi/nu antes del sustantivo.
Conjugación (persona, número, género):
| masc. sing. | fem. sing. | masc. pl. | fem. pl. |
| petit | petite | petits | petites |
| grand | grande | grands | grandes |
| bon | bonne | bons | bonnes |
| heureux | heureuse | heureux | heureuses |
| blanc | blanche | blancs | blanches |
| beau (bel) | belle | beaux | belles |
| nouveau (nouvel) | nouvelle | nouveaux | nouvelles |`,
        zh: `规则:
• 阴性通常是+e (petit → petite)，复数+s (petits, petites)； -s/-x 复数形式不变 (gris, heureux)。
• 形容词与其名词一致，并且位于 être (elle est contente) 之后。
• 几个名词：如果是混合性别 — 阳性复数 (un homme et une femme contents)。
例外:
• 加倍：bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• 特殊：beau → belle（元音前的 bel）、nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• 复数：-al → -aux（national → nationaux；但 banal, final, fatal, naval → -als）、beau/nouveau → +x.
• 不变：来自名词 (orange, marron) 的颜色，名词前的复合词 (bleu foncé)、demi/nu。
变位（人称、数、性）:
| 阳性单数 | 阴性单数 | 阳性复数 | 阴性复数 |
| petit | petite | petits | petites |
| grand | grande | grands | grandes |
| bon | bonne | bons | bonnes |
| heureux | heureuse | heureux | heureuses |
| blanc | blanche | blancs | blanches |
| beau (bel) | belle | beaux | belles |
| nouveau (nouvel) | nouvelle | nouveaux | nouvelles |`,
        ko: `규칙:
• 여성형은 일반적으로 +e (petit → petite), 복수형 +s (petits, petites)입니다. -s/-x 복수형은 (gris, heureux)로 변경되지 않습니다.
• 형용사는 명사와 일치하며 être (elle est contente) 뒤에도 일치합니다.
• 여러 명사: 혼합 성별인 경우 — 남성 복수형 (un homme et une femme contents).
예외:
• 더블링: bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• 특수: beau → belle(모음 앞의 bel), nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• 복수형: -al → -aux(national → nationaux; 그러나 banal, final, fatal, naval → -als), beau/nouveau → +x.
• 불변: 명사 앞의 (orange, marron), 복합어 (bleu foncé), demi/nu의 색상.
활용(인칭, 수, 성):
| 남성 단수 | 여성 단수 | 남성 복수 | 여성 복수 |
| petit | petite | petits | petites |
| grand | grande | grands | grandes |
| bon | bonne | bons | bonnes |
| heureux | heureuse | heureux | heureuses |
| blanc | blanche | blancs | blanches |
| beau (bel) | belle | beaux | belles |
| nouveau (nouvel) | nouvelle | nouveaux | nouvelles |`,
        hi: `नियम:
• स्त्रीलिंग सामान्यतः +e (petit → petite), बहुवचन +s (petits, petites); -s/-x पर समाप्त बहुवचन अपरिवर्तित (gris, heureux)।
• विशेषण अपनी संज्ञा के अनुसार बदलता है; être के बाद भी (elle est contente)।
• कई संज्ञाएँ हों और उनके लिंग अलग हों तो पुल्लिंग बहुवचन (un homme et une femme contents)।
अपवाद:
• द्वित्व: bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• विशेष रूप: beau → belle (स्वर से पहले bel), nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• बहुवचन: -al → -aux (national → nationaux; लेकिन banal, final, fatal, naval → -als), beau/nouveau → +x.
• अपरिवर्तनीय: संज्ञाओं से बने रंग (orange, marron), संयुक्त रंगनाम (bleu foncé), संज्ञा से पहले demi/nu।
क्रिया-रूप (पुरुष, वचन, लिंग):
| पुल्लिंग एकवचन | स्त्रीलिंग एकवचन | पुल्लिंग बहुवचन | स्त्रीलिंग बहुवचन |
| petit | petite | petits | petites |
| grand | grande | grands | grandes |
| bon | bonne | bons | bonnes |
| heureux | heureuse | heureux | heureuses |
| blanc | blanche | blancs | blanches |
| beau (bel) | belle | beaux | belles |
| nouveau (nouvel) | nouvelle | nouveaux | nouvelles |`,
        ga: `Rialacha:
• Baininscneach de ghnáth: +e (petit → petite); iolra: +s (petits, petites); ní athraíonn iolraí dar críoch -s/-x (gris, heureux).
• Réitíonn an aidiacht lena hainmfhocal, agus tar éis être freisin (elle est contente).
• Le roinnt ainmfhocal d’inscní éagsúla, úsáidtear an firinscneach iolra (un homme et une femme contents).
Eisceachtaí:
• Dúbailt: bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• Foirmeacha speisialta: beau → belle (bel roimh ghuta), nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• Iolraí: -al → -aux (national → nationaux; ach banal, final, fatal, naval → -als), beau/nouveau → +x.
• Do-athraithe: dathanna ó ainmfhocail (orange, marron), dathanna comhshuite (bleu foncé), demi/nu roimh an ainmfhocal.
Réimniú (pearsa, uimhir, inscne):
| firinscneach uatha | baininscneach uatha | firinscneach iolra | baininscneach iolra |
| petit | petite | petits | petites |
| grand | grande | grands | grandes |
| bon | bonne | bons | bonnes |
| heureux | heureuse | heureux | heureuses |
| blanc | blanche | blancs | blanches |
| beau (bel) | belle | beaux | belles |
| nouveau (nouvel) | nouvelle | nouveaux | nouvelles |`
    });

    D('place-adjectif', {
        uk: `Правила:
• Зазвичай після іменника: une voiture rouge, un livre intéressant, une table ronde (колір, форма, національність — завжди ПІСЛЯ).
• Перед іменником — короткі й частотні (правило BAGS: beauté, âge, bonté, grandeur): un beau jour, un jeune homme, un bon repas, une grande maison.
• Також перед іменником: petit, joli, vieux, nouveau, mauvais, long, court, haut.
Винятки (зміна значення):
• un grand homme (видатний) / un homme grand (високий); un ancien collègue (колишній) / un livre ancien (старовинний); ma propre chambre (власна) / une chambre propre (чиста); un pauvre garçon (бідолаха) / un garçon pauvre (небагатий); un brave homme (добрий) / un homme brave (хоробрий).
• Два прикметники: кожен на своєму місці (une jolie robe rouge).`,
        en: `Rules:
• Usually after the noun: une voiture rouge, un livre intéressant, une table ronde (colour, shape, nationality — always AFTER).
• Before the noun — short, frequent ones (BAGS: beauty, age, goodness, size): un beau jour, un jeune homme, un bon repas, une grande maison.
• Also before the noun: petit, joli, vieux, nouveau, mauvais, long, court, haut.
Exceptions (meaning changes):
• un grand homme (great) / un homme grand (tall); un ancien collègue (former) / un livre ancien (antique); ma propre chambre (own) / une chambre propre (clean); un pauvre garçon (poor fellow) / un garçon pauvre (poor, without money); un brave homme (good) / un homme brave (brave).
• Two adjectives: each takes its own position (une jolie robe rouge).`,
        fr: `Règles:
• Généralement après le nom : une voiture rouge, un livre intéressant, une table ronde (couleur, forme, nationalité — toujours APRÈS).
• Avant le nom — courts et fréquents (BAGS : beauté, âge, bonté, taille) : un beau jour, un jeune homme, un bon repas, une grande maison.
• Aussi avant le nom : petit, joli, vieux, nouveau, mauvais, long, court, haut.
Exceptions (changements de sens):
• un grand homme (super) / un homme grand (grand) ; un ancien collègue (ancien) / un livre ancien (antique) ; ma propre chambre (propre) / une chambre propre (propre) ; un pauvre garçon (pauvre garçon) / un garçon pauvre (pauvre, sans argent) ; un brave homme (bon) / un homme brave (courageux).
• Deux adjectifs : chacun prend sa propre position (une jolie robe rouge).`,
        ru: `Правила:
• Обычно после существительного: une voiture rouge, un livre intéressant, une table ronde (цвет, форма, национальность — всегда ПОСЛЕ).
• Перед существительным — короткие, частые (BAGS: красота, возраст, доброта, размер): un beau jour, un jeune homme, un bon repas, une grande maison.
• Также перед существительным: petit, joli, vieux, nouveau, mauvais, long, court, haut.
Исключения (изменение значения):
• un grand homme (большой) / un homme grand (высокий); un ancien collègue (бывший) / un livre ancien (античный); ma propre chambre (свой)/une chambre propre (чистый); un pauvre garçon (бедняга) / un garçon pauvre (бедняк, без денег); un brave homme (хороший) / un homme brave (храбрый).
• Два прилагательных: каждое занимает свою позицию (une jolie robe rouge).`,
        es: `Reglas:
• Generalmente después del sustantivo: une voiture rouge, un livre intéressant, une table ronde (color, forma, nacionalidad, siempre DESPUÉS).
• Antes del sustantivo, breves y frecuentes (BAGS: belleza, edad, bondad, tamaño): un beau jour, un jeune homme, un bon repas, une grande maison.
• También antes del sustantivo: petit, joli, vieux, nouveau, mauvais, long, court, haut.
Excepciones (cambios de significado):
• un grand homme (genial) / un homme grand (alto); un ancien collègue (antiguo) / un livre ancien (antiguo); ma propre chambre (propio) / une chambre propre (limpio); un pauvre garçon (pobre) / un garçon pauvre (pobre, sin dinero); un brave homme (bueno) / un homme brave (valiente).
• Dos adjetivos: cada uno toma su propia posición (une jolie robe rouge).`,
        zh: `规则:
• 通常在名词之后：une voiture rouge, un livre intéressant, une table ronde（颜色、形状、国籍 - 总是在之后）。
• 名词前 - 简短、频繁的名词（BAGS：美丽、年龄、善良、尺寸）：un beau jour, un jeune homme, un bon repas, une grande maison.
• 也在名词之前：petit, joli, vieux, nouveau, mauvais, long, court, haut.
例外（词义变化）:
• un grand homme（伟大）/ un homme grand（高）； un ancien collègue（旧）/ un livre ancien（古董）； ma propre chambre（自己）/ une chambre propre（干净）； un pauvre garçon（穷人）/un garçon pauvre（穷，没钱）； un brave homme（善良）/ un homme brave（勇敢）。
• 两个形容词：每个都有自己的位置 (une jolie robe rouge)。`,
        ko: `규칙:
• 일반적으로 명사 뒤: une voiture rouge, un livre intéressant, une table ronde(색상, 모양, 국적 — 항상 AFTER).
• 명사 앞 — 짧고 빈번한 것(BAGS: 아름다움, 나이, 선함, 크기): un beau jour, un jeune homme, un bon repas, une grande maison.
• 또한 명사 앞: petit, joli, vieux, nouveau, mauvais, long, court, haut.
예외(의미 변화):
• un grand homme(대형) / un homme grand(키가 큰); un ancien collègue(이전) / un livre ancien(골동품); ma propre chambre(자체) / une chambre propre(깨끗함); un pauvre garçon(가난한 사람) / un garçon pauvre(가난하고 돈이 없음); un brave homme(좋음) / un homme brave(용감함).
• 두 개의 형용사: 각각 자신의 위치 (une jolie robe rouge)를 취합니다.`,
        hi: `नियम:
• सामान्यतः संज्ञा के बाद: une voiture rouge, un livre intéressant, une table ronde (रंग, आकृति, राष्ट्रीयता — हमेशा बाद में)।
• संज्ञा से पहले छोटे, प्रचलित विशेषण (BAGS: सुंदरता, उम्र, अच्छाई, आकार): un beau jour, un jeune homme, un bon repas, une grande maison.
• ये भी संज्ञा से पहले: petit, joli, vieux, nouveau, mauvais, long, court, haut.
अपवाद (अर्थ में परिवर्तन):
• un grand homme (महान) / un homme grand (लंबे कद का); un ancien collègue (पूर्व) / un livre ancien (प्राचीन); ma propre chambre (अपना) / une chambre propre (साफ़); un pauvre garçon (बेचारा) / un garçon pauvre (निर्धन); un brave homme (भला) / un homme brave (बहादुर)।
• दो विशेषण: प्रत्येक अपने स्थान पर आता है (une jolie robe rouge)।`,
        ga: `Rialacha:
• Tar éis an ainmfhocail de ghnáth: une voiture rouge, un livre intéressant, une table ronde (dath, cruth, náisiúntacht — i gCÓNAÍ INA DHIAIDH).
• Roimh an ainmfhocal: cinn ghearra choitianta (BAGS: áilleacht, aois, maitheas, méid): un beau jour, un jeune homme, un bon repas, une grande maison.
• Roimh an ainmfhocal freisin: petit, joli, vieux, nouveau, mauvais, long, court, haut.
Eisceachtaí (athruithe brí):
• un grand homme (mór le rá) / un homme grand (ard); un ancien collègue (iar-) / un livre ancien (seanársa); ma propre chambre (mo chuid féin) / une chambre propre (glan); un pauvre garçon (créatúr bocht) / un garçon pauvre (gan airgead); un brave homme (maith) / un homme brave (cróga).
• Dhá aidiacht: glacann gach ceann a hionad féin (une jolie robe rouge).`
    });

    D('pluriel-noms', {
        uk: `Правила:
• Зазвичай +s: un livre → des livres; іменники на -s, -x, -z не змінюються: un fils → des fils.
• -al → -aux (un journal → des journaux); -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux).
• Артикль і прикметник теж змінюються; на слух множину часто видно лише за артиклем.
Винятки:
• -ail → -ails (des détails), але des travaux, des vitraux, des coraux.
• Неправильні: un œil → des yeux, monsieur → messieurs, madame → mesdames.
• Винятки на -al: bal, carnaval, festival, récital — +s; на -eu: pneu, bleu — +s; на -ou: bijou, caillou, chou, genou, hibou, joujou, pou — +x.`,
        en: `Rules:
• Usually +s: un livre → des livres; nouns in -s, -x, -z are unchanged: un fils → des fils.
• -al → -aux (un journal → des journaux); -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux).
• The article and adjective change too; the plural is often audible only in the article.
Exceptions:
• -ail → -ails (des détails), but des travaux, des vitraux, des coraux.
• Irregular: un œil → des yeux, monsieur → messieurs, madame → mesdames.
• -al exceptions: bal, carnaval, festival, récital — +s; -eu exceptions: pneu, bleu — +s; -ou exceptions: bijou, caillou, chou, genou, hibou, joujou, pou — +x.`,
        fr: `Règles:
• Généralement +s : un livre → des livres ; les noms dans -s, -x, -z restent inchangés : un fils → des fils.
• -al → -aux (un journal → des journaux) ; -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux).
• L'article et l'adjectif changent également ; le pluriel n'est souvent audible que dans l'article.
Exceptions:
• -ail → -ails (des détails), mais des travaux, des vitraux, des coraux.
• Irrégulier : un œil → des yeux, monsieur → messieurs, madame → mesdames.
• Exceptions -al : Exceptions bal, carnaval, festival, récital — +s; -eu : Exceptions pneu, bleu — +s; -ou : bijou, caillou, chou, genou, hibou, joujou, pou — +x.`,
        ru: `Правила:
• Обычно +s: un livre → des livres; существительные в -s, -x, -z не изменяются: un fils → des fils.
• -al → -aux (un journal → des journaux); -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux).
• Артикль и прилагательное также меняются; множественное число часто слышно только в статье.
Исключения:
• -ail → -ails (des détails), но des travaux, des vitraux, des coraux.
• Неправильные формы: un œil → des yeux, monsieur → messieurs, madame → mesdames.
• Исключения -al: Исключения bal, carnaval, festival, récital — +s; -eu: Исключения pneu, bleu — +s; -ou: bijou, caillou, chou, genou, hibou, joujou, pou — +x.`,
        es: `Reglas:
• Normalmente +s: un livre → des livres; los sustantivos en -s, -x, -z no cambian: un fils → des fils.
• -al → -aux (un journal → des journaux); -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux).
• El artículo y el adjetivo también cambian; el plural suele ser audible sólo en el artículo.
Excepciones:
• -ail → -ails (des détails), pero des travaux, des vitraux, des coraux.
• Irregular: un œil → des yeux, monsieur → messieurs, madame → mesdames.
• Excepciones -al: Excepciones bal, carnaval, festival, récital — +s; -eu: Excepciones pneu, bleu — +s; -ou: bijou, caillou, chou, genou, hibou, joujou, pou — +x.`,
        zh: `规则:
• 通常为+s：un livre → des livres； -s, -x, -z 中的名词不变：un fils → des fils.
• -al → -aux (un journal → des journaux); -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux)。
• 冠词和形容词也变了；复数通常只能在文章中听到。
例外:
• -ail → -ails (des détails)，但 des travaux, des vitraux, des coraux.
• 不规则：un œil → des yeux, monsieur → messieurs, madame → mesdames.
• -al 例外：bal, carnaval, festival, récital — +s; -eu 例外：pneu, bleu — +s; -ou 例外：bijou, caillou, chou, genou, hibou, joujou, pou — +x.`,
        ko: `규칙:
• 보통 +s: un livre → des livres; -s, -x, -z의 명사는 변경되지 않습니다: un fils → des fils.
• -al → -aux (un journal → des journaux); -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux).
• 관사와 형용사도 바뀌었습니다. 복수형은 기사에서만 들을 수 있는 경우가 많습니다.
예외:
• -ail → -ails (des détails), 하지만 des travaux, des vitraux, des coraux.
• 불규칙: un œil → des yeux, monsieur → messieurs, madame → mesdames.
• -al 예외: bal, carnaval, festival, récital — +s; -eu 예외: pneu, bleu — +s; -ou 예외: bijou, caillou, chou, genou, hibou, joujou, pou — +x.`,
        hi: `नियम:
• सामान्यतः +s: un livre → des livres; -s, -x, -z पर समाप्त संज्ञाएँ अपरिवर्तित: un fils → des fils.
• -al → -aux (un journal → des journaux); -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux)।
• उपपद और विशेषण भी बदलते हैं; कई बार बहुवचन केवल उपपद के उच्चारण से पता चलता है।
अपवाद:
• -ail → -ails (des détails), लेकिन des travaux, des vitraux, des coraux.
• अनियमित रूप: un œil → des yeux, monsieur → messieurs, madame → mesdames.
• -al के अपवाद: bal, carnaval, festival, récital — +s; -eu के अपवाद: pneu, bleu — +s; -ou के अपवाद: bijou, caillou, chou, genou, hibou, joujou, pou — +x.`,
        ga: `Rialacha:
• De ghnáth +s: un livre → des livres; ní athraíonn ainmfhocail dar críoch -s, -x, -z: un fils → des fils.
• -al → -aux (un journal → des journaux); -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux).
• Athraíonn an t-alt agus an aidiacht freisin; is minic nach gcloistear an t-iolra ach san alt.
Eisceachtaí:
• -ail → -ails (des détails), ach des travaux, des vitraux, des coraux.
• Foirmeacha neamhrialta: un œil → des yeux, monsieur → messieurs, madame → mesdames.
• -al — eisceachtaí: bal, carnaval, festival, récital — +s; -eu — eisceachtaí: pneu, bleu — +s; -ou — eisceachtaí: bijou, caillou, chou, genou, hibou, joujou, pou — +x.`
    });

    D('genre-noms', {
        uk: `Правила:
• Жіночий: -tion, -sion, -té, -ée (крім musée, lycée), -ure, -ance, -ence, -ie, -ette, -eur (абстрактні: la peur; але le bonheur, le malheur, l’honneur — чоловічого).
• Чоловічий: -ment, -age, -eau, -isme, -ier, -oir, -eur (особи: le docteur), назви днів, мов, дерев, металів.
• Рід треба запам’ятовувати разом із артиклем.
Винятки:
• -age: la plage, l’image, la page, la cage, la nage — жіночого роду.
• -ée: le musée, le lycée, le trophée — чоловічого.
• Рід змінює значення: le livre (книга) / la livre (фунт), le tour / la tour, le poste / la poste, le mode / la mode.
• Підступні слова: amour, orgue, délice — чоловічого роду в однині, але жіночого в множині.`,
        en: `Rules:
• Feminine: -tion, -sion, -té, -ée (except musée, lycée), -ure, -ance, -ence, -ie, -ette, -eur (abstract: la peur; but le bonheur, le malheur, l’honneur are masculine).
• Masculine: -ment, -age, -eau, -isme, -ier, -oir, -eur (persons: le docteur), days, languages, trees, metals.
• Learn the gender with the article.
Exceptions:
• -age: la plage, l’image, la page, la cage, la nage — feminine.
• -ée: le musée, le lycée, le trophée — masculine.
• Gender changes meaning: le livre (book) / la livre (pound), le tour / la tour, le poste / la poste, le mode / la mode.
• Tricky words: amour, orgue, délice — masculine in the singular, feminine in the plural.`,
        fr: `Règles:
• Féminin : -tion, -sion, -té, -ée (sauf musée, lycée), -ure, -ance, -ence, -ie, -ette, -eur (résumé : la peur ; mais le bonheur, le malheur, l’honneur sont masculins).
• Masculin : -ment, -age, -eau, -isme, -ier, -oir, -eur (personnes : le docteur), jours, langues, arbres, métaux.
• Apprenez le sexe avec l'article.
Exceptions:
• -age : la plage, l’image, la page, la cage, la nage — féminin.
• -ée : le musée, le lycée, le trophée — masculin.
• Le genre change signifiant : le livre (livre) / la livre (livre), le tour / la tour, le poste / la poste, le mode / la mode.
• Mots délicats : amour, orgue, délice — masculin au singulier, féminin au pluriel.`,
        ru: `Правила:
• Женский род: -tion, -sion, -té, -ée (кроме musée, lycée), -ure, -ance, -ence, -ie, -ette, -eur (абстрактно: la peur; но le bonheur, le malheur, l’honneur — мужской род).
• Мужской род: -ment, -age, -eau, -isme, -ier, -oir, -eur (лица: le docteur), дни, языки, деревья, металлы.
• Узнайте пол по статье.
Исключения:
• -age: la plage, l’image, la page, la cage, la nage — женский.
• -ée: le musée, le lycée, le trophée — мужской род.
• Пол меняет значение: le livre (книга) / la livre (фунт), le tour / la tour, le poste / la poste, le mode / la mode.
• Хитрые слова: amour, orgue, délice — мужской род в единственном числе, женский во множественном.`,
        es: `Reglas:
• Femenino: -tion, -sion, -té, -ée (excepto musée, lycée), -ure, -ance, -ence, -ie, -ette, -eur (abstracto: la peur; pero le bonheur, le malheur, l’honneur son masculinos).
• Masculino: -ment, -age, -eau, -isme, -ier, -oir, -eur (personas: le docteur), días, idiomas, árboles, metales.
• Aprende el género con el artículo.
Excepciones:
• -age: la plage, l’image, la page, la cage, la nage — femenino.
• -ée: le musée, le lycée, le trophée — masculino.
• El género cambia de significado: le livre (libro) / la livre (libra), le tour / la tour, le poste / la poste, le mode / la mode.
• Palabras complicadas: amour, orgue, délice: masculino en singular, femenino en plural.`,
        zh: `规则:
• 女性：-tion, -sion, -té, -ée（musée, lycée 除外）、-ure, -ance, -ence, -ie, -ette, -eur（摘要：la peur；但 le bonheur, le malheur, l’honneur 为男性）。
• 阳性：-ment, -age, -eau, -isme, -ier, -oir, -eur（人：le docteur）、日子、语言、树木、金属。
• 通过文章了解性别。
例外:
• -age：la plage, l’image, la page, la cage, la nage — 女性。
• -ée：le musée, le lycée, le trophée — 男性。
• 性别变化含义：le livre（书）/la livre（磅）、le tour / la tour, le poste / la poste, le mode / la mode.
• 棘手的单词：amour, orgue, délice — 单数为阳性，复数为阴性。`,
        ko: `규칙:
• 여성형: -tion, -sion, -té, -ée(musée, lycée 제외), -ure, -ance, -ence, -ie, -ette, -eur(추상: la peur. 그러나 le bonheur, le malheur, l’honneur는 남성형).
• 남성형: -ment, -age, -eau, -isme, -ier, -oir, -eur(사람: le docteur), 날, 언어, 나무, 금속.
• 기사를 통해 성별을 알아보세요.
예외:
• -age: la plage, l’image, la page, la cage, la nage — 여성형.
• -ée: le musée, le lycée, le trophée — 남성형.
• 성별 변경 의미: le livre(책) / la livre(파운드), le tour / la tour, le poste / la poste, le mode / la mode.
• 까다로운 단어: amour, orgue, délice — 단수형은 남성형, 복수형은 여성형입니다.`,
        hi: `नियम:
• स्त्रीलिंग: -tion, -sion, -té, -ée (musée, lycée को छोड़कर), -ure, -ance, -ence, -ie, -ette, -eur (अमूर्त: la peur; लेकिन le bonheur, le malheur, l’honneur पुल्लिंग हैं)।
• पुल्लिंग: -ment, -age, -eau, -isme, -ier, -oir, -eur (व्यक्ति: le docteur), दिन, भाषाएँ, पेड़, धातुएँ।
• लिंग उपपद के साथ याद करें।
अपवाद:
• -age: la plage, l’image, la page, la cage, la nage — स्त्रीलिंग।
• -ée: le musée, le lycée, le trophée — पुल्लिंग।
• लिंग से अर्थ बदलता है: le livre (किताब) / la livre (पाउंड), le tour / la tour, le poste / la poste, le mode / la mode.
• ध्यान देने योग्य: amour, orgue, délice — एकवचन में पुल्लिंग, बहुवचन में स्त्रीलिंग।`,
        ga: `Rialacha:
• Baininscneach: -tion, -sion, -té, -ée (seachas musée, lycée), -ure, -ance, -ence, -ie, -ette, -eur (teibí: la peur; ach tá le bonheur, le malheur, l’honneur firinscneach).
• Firinscneach: -ment, -age, -eau, -isme, -ier, -oir, -eur (daoine: le docteur), laethanta, teangacha, crainn, miotail.
• Foghlaim an inscne leis an alt.
Eisceachtaí:
• -age: la plage, l’image, la page, la cage, la nage — baininscneach.
• -ée: le musée, le lycée, le trophée — firinscneach.
• Athraíonn an inscne an bhrí: le livre (leabhar) / la livre (punt), le tour / la tour, le poste / la poste, le mode / la mode.
• Focail chasta: amour, orgue, délice — firinscneach san uatha, baininscneach san iolra.`
    });

    D('article-defini', {
        uk: `Правила:
• Le (чол.), la (жін.), l’ (перед голосним або німим h), les (множина).
• Для відомого чи єдиного предмета (la lune), для загальних понять (j’aime le café), для днів у значенні «щоразу» (le lundi), частин тіла (je me lave les mains).
• Заперечення артикль le/la/les не змінює.
Винятки:
• H aspiré — без елізії: le héros, la honte, les haricots (але l’homme, l’heure — h німий).
• Не вживається після être у ролях/професіях (il est médecin) і в багатьох сталих виразах (avoir faim).
• Le/la/les як займенники COD — не артикль (je le vois).`,
        en: `Rules:
• Le (masc.), la (fem.), l’ (before a vowel or mute h), les (plural).
• For a known or unique item (la lune), general concepts (j’aime le café), days meaning "every" (le lundi), body parts (je me lave les mains).
• The definite article does not change after a negation.
Exceptions:
• Aspirated h — no elision: le héros, la honte, les haricots (but l’homme, l’heure — mute h).
• Omitted after être with professions (il est médecin) and in many set phrases (avoir faim).
• Le/la/les as direct-object pronouns are not articles (je le vois).`,
        fr: `Règles:
• Le (masc.), la (fem.), l’ (avant une voyelle ou un h muet), les (pluriel).
• Pour un article connu ou unique (la lune), concepts généraux (j’aime le café), jours signifiant "chaque" (le lundi), parties du corps (je me lave les mains).
• L'article défini ne change pas après une négation.
Exceptions:
• h aspiré — pas d'élision : le héros, la honte, les haricots (mais l’homme, l’heure — h muet).
• Omis après être avec les professions (il est médecin) et dans de nombreuses phrases définies (avoir faim).
• Le/la/les en tant que pronoms objets directs ne sont pas des articles (je le vois).`,
        ru: `Правила:
• Le (маск.), la (жен.), l’ (перед гласной или немой h), les (множественное число).
• Для известного или уникального предмета (la lune), общих понятий (j’aime le café), дней, означающих «каждый» (le lundi), частей тела (je me lave les mains).
• Определенный артикль не меняется после отрицания.
Исключения:
• Атмосферный h — без исключения: le héros, la honte, les haricots (но l’homme, l’heure — немой h).
• Пропускается после être с профессиями (il est médecin) и во многих устойчивых фразах (avoir faim).
• Le/la/les как местоимения прямого дополнения не являются артиклями (je le vois).`,
        es: `Reglas:
• Le (masc.), la (fem.), l’ (antes de vocal o muda h), les (plural).
• Para un artículo conocido o único (la lune), conceptos generales (j’aime le café), días que significan "cada" (le lundi), partes del cuerpo (je me lave les mains).
• El artículo definido no cambia después de una negación.
Excepciones:
• h aspirado: sin elisión: le héros, la honte, les haricots (pero l’homme, l’heure: silenciado h).
• Omitido después de être con las profesiones (il est médecin) y en muchas frases hechas (avoir faim).
• Le/la/les como pronombres de objeto directo no son artículos (je le vois).`,
        zh: `规则:
• Le（阳性）、la（阴性）、l’（元音或静音 h 之前）、les（复数）。
• 对于已知或独特的项目 (la lune)，一般概念 (j’aime le café)，表示“每个”的天数 (le lundi)，身体部位 (je me lave les mains)。
• 否定后定冠词不改变。
例外:
• 送气 h — 无省略：le héros, la honte, les haricots（但 l’homme, l’heure — 静音 h）。
• 在职业 (il est médecin) 和许多固定短语 (avoir faim) 中的 être 之后被省略。
• Le/la/les 作为直接宾语代词不是冠词 (je le vois)。`,
        ko: `규칙:
• Le(masc.), la(fem.), l’(모음 또는 음소거 앞 h), les(복수).
• 알려진 또는 고유 항목 (la lune)의 경우 일반 개념 (j’aime le café), "모든"을 의미하는 날짜 (le lundi), 신체 부위 (je me lave les mains).
• 부정 후에도 정관사는 변하지 않습니다.
예외:
• 흡기형 h — 제거 없음: le héros, la honte, les haricots(그러나 l’homme, l’heure — 음소거 h).
• être 이후 직업 (il est médecin) 및 다양한 설정 문구 (avoir faim)에서는 생략됩니다.
• 직접 목적어 대명사인 Le/la/les는 관사 (je le vois)가 아닙니다.`,
        hi: `नियम:
• Le (पुल्लिंग), la (स्त्रीलिंग), l’ (स्वर या मूक h से पहले), les (बहुवचन)।
• ज्ञात या अद्वितीय वस्तु (la lune), सामान्य संकल्पनाएँ (j’aime le café), «प्रत्येक» के अर्थ वाले दिन (le lundi), शरीर के अंग (je me lave les mains)।
• नकार के बाद निश्चित उपपद नहीं बदलता।
अपवाद:
• महाप्राण h के आगे स्वर-लोप नहीं: le héros, la honte, les haricots (लेकिन l’homme, l’heure — मूक h)।
• पेशों के नामों के साथ être के बाद (il est médecin) और कई रूढ़ पदबंधों में (avoir faim) छूटता है।
• प्रत्यक्ष कर्म के सर्वनाम के रूप में Le/la/les उपपद नहीं हैं (je le vois)।`,
        ga: `Rialacha:
• Le (fir.), la (bain.), l’ (roimh ghuta nó h balbh), les (iolra).
• Le haghaidh rud aitheanta nó uathúil (la lune), coincheapa ginearálta (j’aime le café), laethanta a chiallaíonn «gach» (le lundi), baill choirp (je me lave les mains).
• Ní athraíonn an t-alt cinnte tar éis diúltaithe.
Eisceachtaí:
• Roimh h aspiré, ní dhéantar eiliú: le héros, la honte, les haricots (ach l’homme, l’heure — h balbh).
• Fágtar ar lár é tar éis être le gairmeacha (il est médecin) agus i mórán nathanna seasta (avoir faim).
• Ní ailt iad Le/la/les mar fhorainmneacha cuspóra dhírigh (je le vois).`
    });

    D('article-indefini', {
        uk: `Правила:
• Un (чол.), une (жін.), des (множина) — для нового, невизначеного або «якогось» предмета.
• Після заперечення — de/d’: je n’ai pas de livre (але: ce n’est pas un livre — існування, а не кількість).
• Перед прикметником у множині часто de: de beaux jours (формально), у розмові des beaux jours.
Винятки:
• Des + прикметник перед іменником → de (de grandes maisons) у письмовій мові.
• Un/une після c’est/il y a зберігається навіть у запереченні, коли заперечується ідентичність.
• Un як числівник («один») — відрізняється інтонацією (j’ai un frère, pas deux).`,
        en: `Rules:
• Un (masc.), une (fem.), des (plural) — for a new, unspecified or "some" item.
• After a negation — de/d’: je n’ai pas de livre (but: ce n’est pas un livre — identity, not quantity).
• Before a plural adjective formally de: de beaux jours (in speech often des beaux jours).
Exceptions:
• Des + adjective before the noun → de (de grandes maisons) in formal writing.
• Un/une stays after c’est/il y a even in the negative when the identity is denied.
• Un as a numeral ("one") — distinguished by stress (j’ai un frère, pas deux).`,
        fr: `Règles:
• Un (masc.), une (fem.), des (pluriel) — pour un élément nouveau, non spécifié ou "certains".
• Après une négation — de/d’ : je n’ai pas de livre (mais : ce n’est pas un livre — identité, pas quantité).
• Devant un adjectif pluriel formellement de : de beaux jours (dans le discours souvent des beaux jours).
Exceptions:
• Des + adjectif avant le nom → de (de grandes maisons) en écriture formelle.
• Un/une reste après c’est/il y a même dans la négative lorsque l'identité est refusée.
• Un sous forme de chiffre ("un") — distingué par l'accentuation (j’ai un frère, pas deux).`,
        ru: `Правила:
• Un (маск.), une (жен.), des (множественное число) — для нового, неопределенного или «какого-то» предмета.
• После отрицания — de/d’: je n’ai pas de livre (но: ce n’est pas un livre — тождество, а не количество).
• Перед прилагательным во множественном числе формально de: de beaux jours (в речи часто des beaux jours).
Исключения:
• Des + прилагательное перед существительным → de (de grandes maisons) в официальном письме.
• Un/une остается после c’est/il y a даже в отрицательном значении, когда личность отрицается.
• Un как числительное ("один") — выделяется ударением (j’ai un frère, pas deux).`,
        es: `Reglas:
• Un (masc.), une (fem.), des (plural): para un elemento nuevo, no especificado o "algunos".
• Después de una negación — de/d’: je n’ai pas de livre (pero: ce n’est pas un livre — identidad, no cantidad).
• Antes de un adjetivo plural formalmente de: de beaux jours (en el habla a menudo des beaux jours).
Excepciones:
• Des + adjetivo antes del sustantivo → de (de grandes maisons) en escritura formal.
• Un/une permanece después de c’est/il y a incluso en negativo cuando se niega la identidad.
• Un como un número ("uno"), distinguido por el acento (j’ai un frère, pas deux).`,
        zh: `规则:
• Un（阳性）、une（阴性）、des（复数）— 用于新的、未指定的或“某些”项目。
• 否定后 — de/d’: je n’ai pas de livre（但是：ce n’est pas un livre — 身份，而不是数量）。
• 正式复数形容词 de 之前：de beaux jours（在语音中通常为 des beaux jours）。
例外:
• Des + 名词前的形容词 → 正式写作中的 de (de grandes maisons)。
• 即使身份被拒绝，Un/une 也会保留在 c’est/il y a 之后。
• Un 作为数字（“一”）——通过重音 (j’ai un frère, pas deux) 进行区分。`,
        ko: `규칙:
• Un(masc.), une(fem.), des(복수) — 새 항목, 지정되지 않은 항목 또는 '일부' 항목에 사용됩니다.
• 부정 후 — de/d’: je n’ai pas de livre(그러나: ce n’est pas un livre — 수량이 아닌 동일성).
• 복수형 형용사 앞에는 형식적으로 de: de beaux jours(대개 des beaux jours로 사용됨)
예외:
• Des + 명사 앞의 형용사 → 격식어에서는 de (de grandes maisons)
• Un/une는 신원이 거부된 경우 부정적인 상황에서도 c’est/il y a 이후에 유지됩니다.
• Un는 숫자("1")로 표시되며 강세 (j’ai un frère, pas deux)로 구분됩니다.`,
        hi: `नियम:
• Un (पुल्लिंग), une (स्त्रीलिंग), des (बहुवचन) — नई, अनिर्दिष्ट या «कोई» वस्तु के लिए।
• नकार के बाद de/d’: je n’ai pas de livre (लेकिन ce n’est pas un livre — पहचान, मात्रा नहीं)।
• बहुवचन विशेषण से पहले औपचारिक रूप में de: de beaux jours (बोलचाल में प्रायः des beaux jours)।
अपवाद:
• संज्ञा से पहले Des + विशेषण → औपचारिक लेखन में de (de grandes maisons)।
• पहचान का निषेध हो तो c’est/il y a के बाद नकारात्मक वाक्य में भी Un/une बना रहता है।
• संख्या «एक» के रूप में Un — उच्चारण के बल से भेद होता है (j’ai un frère, pas deux)।`,
        ga: `Rialacha:
• Un (fir.), une (bain.), des (iolra) — le haghaidh rud nua, neamhshonraithe nó «éigin».
• Tar éis diúltaithe, de/d’: je n’ai pas de livre (ach ce n’est pas un livre — céannacht, ní cainníocht).
• Roimh aidiacht iolra, úsáidtear de go foirmiúil: de beaux jours (sa chaint, des beaux jours go minic).
Eisceachtaí:
• Des + aidiacht roimh an ainmfhocal → de (de grandes maisons) sa scríbhneoireacht fhoirmiúil.
• Fanann Un/une tar éis c’est/il y a fiú sa diúltach nuair a dhiúltaítear don chéannacht.
• Un mar uimhir («aon») — aithnítear é de réir na béime (j’ai un frère, pas deux).`
    });

    D('article-partitif', {
        uk: `Правила:
• Du (чол.), de la (жін.), de l’ (перед голосним), des (множина) — невизначена кількість нелічильного: du pain, de la confiture, de l’eau.
• Після заперечення й слів кількості — de/d’: pas de pain, beaucoup de pain, un kilo de farine.
• Для абстрактного: avoir du courage, faire du sport, jouer du piano (інструмент: jouer de + le = du).
Винятки:
• Після aimer, adorer, détester, préférer — означений артикль (j’aime le café, не du café), бо мова про загальне.
• Не плутати з contraction de + le = du (je parle du film).
• Після être у запереченні: ce n’est pas du lait — партітив зберігається (ідентифікація).`,
        en: `Rules:
• Du (masc.), de la (fem.), de l’ (before a vowel), des (plural) — an indefinite amount of an uncountable: du pain, de la confiture, de l’eau.
• After a negation and quantities — de/d’: pas de pain, beaucoup de pain, un kilo de farine.
• For abstracts: avoir du courage, faire du sport, jouer du piano (instrument: jouer de + le = du).
Exceptions:
• After aimer, adorer, détester, préférer — the definite article (j’aime le café, not du café) because the meaning is general.
• Do not confuse with the contraction de + le = du (je parle du film).
• After être in the negative: ce n’est pas du lait — the partitive stays (identification).`,
        fr: `Règles:
• Du (masc.), de la (fem.), de l’ (avant une voyelle), des (pluriel) — une quantité indéfinie d'un indénombrable : du pain, de la confiture, de l’eau.
• Après une négation et des quantités — de/d’ : pas de pain, beaucoup de pain, un kilo de farine.
• Pour les résumés : avoir du courage, faire du sport, jouer du piano (instrument : jouer de + le = du).
Exceptions:
• Après aimer, adorer, détester, préférer — l'article défini (j’aime le café, pas du café) car le sens est général.
• Ne pas confondre avec la contraction de + le = du (je parle du film).
• Après être à la négative : ce n’est pas du lait — le partitif reste (identification).`,
        ru: `Правила:
• Du (маск.), de la (жен.), de l’ (перед гласной), des (множественное число) — неопределенное количество неисчисляемого: du pain, de la confiture, de l’eau.
• После отрицания и количества — de/d’: pas de pain, beaucoup de pain, un kilo de farine.
• Для тезисов: avoir du courage, faire du sport, jouer du piano (инструмент: jouer de + le = du).
Исключения:
• После aimer, adorer, détester, préférer — определенный артикль (j’aime le café, а не du café), поскольку смысл общий.
• Не путайте сокращение de + le = du с (je parle du film).
• После être в отрицании: ce n’est pas du lait — партитив остается (идентификация).`,
        es: `Reglas:
• Du (masc.), de la (fem.), de l’ (antes de una vocal), des (plural) — una cantidad indefinida de un incontable: du pain, de la confiture, de l’eau.
• Después de una negación y cantidades — de/d’: pas de pain, beaucoup de pain, un kilo de farine.
• Para resúmenes: avoir du courage, faire du sport, jouer du piano (instrumento: jouer de + le = du).
Excepciones:
• Después de aimer, adorer, détester, préférer, el artículo definido (j’aime le café, no du café) porque el significado es general.
• No confundir con la contracción de + le = du (je parle du film).
• Después de être en negativo: ce n’est pas du lait — el partitivo permanece (identificación).`,
        zh: `规则:
• Du（阳性）、de la（阴性）、de l’（元音前）、des（复数）——不可数的不定数量：du pain, de la confiture, de l’eau.
• 求反和数量之后 — de/d’: pas de pain, beaucoup de pain, un kilo de farine.
• 摘要：avoir du courage, faire du sport, jouer du piano（工具：jouer de + le = du）。
例外:
• aimer, adorer, détester, préférer 之后 — 定冠词（j’aime le café，而不是 du café），因为含义是通用的。
• 不要与缩写 de + le = du (je parle du film) 混淆。
• 否定中的 être 之后：ce n’est pas du lait — 部分保留（标识）。`,
        ko: `규칙:
• Du (masc.), de la (fem.), de l’ (모음 앞), des (복수) — 셀 수 없는 무한한 양: du pain, de la confiture, de l’eau.
• 부정 및 수량 이후 — de/d’: pas de pain, beaucoup de pain, un kilo de farine.
• 초록의 경우: avoir du courage, faire du sport, jouer du piano(기기: jouer de + le = du).
예외:
• aimer, adorer, détester, préférer 이후 — 의미가 일반적이기 때문에 정관사(du café가 아닌 j’aime le café)입니다.
• 축약형 de + le = du (je parle du film)와 혼동하지 마세요.
• 음수의 être 이후: ce n’est pas du lait — 부분형이 유지됩니다(식별).`,
        hi: `नियम:
• Du (पुल्लिंग), de la (स्त्रीलिंग), de l’ (स्वर से पहले), des (बहुवचन) — अगणनीय वस्तु की अनिश्चित मात्रा: du pain, de la confiture, de l’eau.
• नकार और मात्रासूचक शब्दों के बाद de/d’: pas de pain, beaucoup de pain, un kilo de farine.
• अमूर्त अर्थों के लिए: avoir du courage, faire du sport, jouer du piano (वाद्ययंत्र: jouer de + le = du)।
अपवाद:
• aimer, adorer, détester, préférer के बाद निश्चित उपपद (j’aime le café, du café नहीं), क्योंकि अर्थ सामान्य है।
• संयुक्त रूप de + le = du से भ्रमित न करें (je parle du film)।
• नकारात्मक être के बाद ce n’est pas du lait — अंशसूचक उपपद बना रहता है, क्योंकि पहचान व्यक्त होती है।`,
        ga: `Rialacha:
• Du (fir.), de la (bain.), de l’ (roimh ghuta), des (iolra) — méid neamhchinnte de rud neamh-ináirithe: du pain, de la confiture, de l’eau.
• Tar éis diúltaithe agus cainníochtaí, de/d’: pas de pain, beaucoup de pain, un kilo de farine.
• Le coincheapa teibí: avoir du courage, faire du sport, jouer du piano (uirlis cheoil: jouer de + le = du).
Eisceachtaí:
• Tar éis aimer, adorer, détester, préférer, úsáidtear an t-alt cinnte (j’aime le café, seachas du café), mar tá an bhrí ginearálta.
• Ná measc é leis an gcumasc de + le = du (je parle du film).
• Tar éis être sa diúltach: ce n’est pas du lait — fanann an t-alt páirteach (aithint).`
    });

    D('contractions', {
        uk: `Правила:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• Перед la та l’ злиття немає: à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
Винятки:
• Перед h aspiré злиття є (au héros), але перед h німим — ні (à l’hôtel).
• Du/des у значенні партитиву або неозначеного артикля — це не злиття (du pain, des amis).
• Країни: au Canada, aux États-Unis, але en France (без артикля).`,
        en: `Rules:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• No contraction before la and l’: à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
Exceptions:
• Before aspirated h the contraction occurs (au héros), but not before mute h (à l’hôtel).
• Du/des as a partitive or indefinite article are not contractions (du pain, des amis).
• Countries: au Canada, aux États-Unis, but en France (no article).`,
        fr: `Règles:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• Aucune contraction avant la et l’ : à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
Exceptions:
• Avant h aspiré, la contraction se produit (au héros), mais pas avant h muet (à l’hôtel).
• Du/des en tant qu'article partitif ou indéfini ne sont pas des contractions (du pain, des amis).
• Pays : au Canada, aux États-Unis, mais en France (pas d'article).`,
        ru: `Правила:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• Нет сокращений перед la и l’: à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
Исключения:
• Перед придыханием h происходит сокращение (au héros), но не раньше немого h (à l’hôtel).
• Du/des как разделительный или неопределенный артикль не являются сокращениями (du pain, des amis).
• Страны: au Canada, aux États-Unis, но en France (нет статьи).`,
        es: `Reglas:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• Sin contracción antes de la y l’: à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
Excepciones:
• Antes de aspirar h se produce la contracción (au héros), pero no antes de silenciar h (à l’hôtel).
• Du/des como artículo partitivo o indefinido no son contracciones (du pain, des amis).
• Países: au Canada, aux États-Unis, pero en France (sin artículo).`,
        zh: `规则:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• la 和 l’ 之前没有收缩：à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
例外:
• 在送气 h 之前，收缩发生在 (au héros) 之前，但在静音 h (à l’hôtel) 之前不会发生收缩。
• Du/des 作为分词或不定冠词不是缩写 (du pain, des amis)。
• 国家/地区：au Canada, aux États-Unis，但 en France（无文章）。`,
        ko: `규칙:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• la 및 l’ 이전에는 수축이 없습니다: à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
예외:
• h 흡기 전에 (au héros) 수축이 발생하지만 음소거 h (à l’hôtel) 이전에는 수축이 발생하지 않습니다.
• 부분관사나 부정관사로서의 Du/des는 축약형 (du pain, des amis)가 아닙니다.
• 국가: au Canada, aux États-Unis, 그러나 en France(기사 없음).`,
        hi: `नियम:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• la और l’ से पहले संकुचन नहीं: à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
अपवाद:
• महाप्राण h से पहले संकुचन होता है (au héros), मूक h से पहले नहीं (à l’hôtel)।
• अंशसूचक या अनिश्चित उपपद वाले Du/des संकुचन नहीं हैं (du pain, des amis)।
• देश: au Canada, aux États-Unis, लेकिन en France (उपपद नहीं)।`,
        ga: `Rialacha:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• Ní dhéantar cumasc roimh la ná l’: à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
Eisceachtaí:
• Déantar cumasc roimh h aspiré (au héros), ach ní dhéantar roimh h balbh (à l’hôtel).
• Ní cumaisc iad Du/des mar ailt pháirteacha nó éiginnte (du pain, des amis).
• Tíortha: au Canada, aux États-Unis, ach en France (gan alt).`
    });

    D('possessifs', {
        uk: `Правила:
• Узгоджуються з ПРЕДМЕТОМ володіння, а не з власником: mon/ma/mes, ton/ta/tes, son/sa/ses (свій/його/її), notre/nos, votre/vos, leur/leurs.
• Son/sa/ses може значити «його» й «її» — рід визначає предмет (son père = його або її батько).
• Перед жіночим іменником на голосний: mon, ton, son (mon amie, ton école).
Винятки:
• Для частин тіла часто означений артикль замість присвійного: je me lave les mains, il a mal à la tête.
• Leur(s) — присвійне; не плутати з займенником leur (je leur parle).
• Присвійне + à + займенник підкреслює власника: c’est mon livre à moi.`,
        en: `Rules:
• They agree with the thing POSSESSED, not with the owner: mon/ma/mes, ton/ta/tes, son/sa/ses (his/her/its), notre/nos, votre/vos, leur/leurs.
• Son/sa/ses can mean both "his" and "her" — the gender of the noun decides (son père = his or her father).
• Before a feminine noun starting with a vowel: mon, ton, son (mon amie, ton école).
Exceptions:
• For body parts the definite article often replaces the possessive: je me lave les mains, il a mal à la tête.
• Leur(s) is the possessive; do not confuse it with the pronoun leur (je leur parle).
• Possessive + à + pronoun stresses the owner: c’est mon livre à moi.`,
        fr: `Règles:
• Ils s’accordent avec la chose POSSÉDÉE, et non avec le possesseur : mon/ma/mes, ton/ta/tes, son/sa/ses (à lui/à elle), notre/nos, votre/vos, leur/leurs.
• Son/sa/ses peut signifier à la fois « son » et « elle » — le genre du nom décide (son père = son père).
• Devant un nom féminin commençant par une voyelle : mon, ton, son (mon amie, ton école).
Exceptions:
• Pour les parties du corps l'article défini remplace souvent le possessif : je me lave les mains, il a mal à la tête.
• Leur(s) est le possessif ; ne le confondez pas avec le pronom leur (je leur parle).
• Possessif + à + pronom souligne le propriétaire : c’est mon livre à moi.`,
        ru: `Правила:
• Они согласуются с названием ПРИНАДЛЕЖАЩЕГО предмета, а не с владельцем: mon/ma/mes, ton/ta/tes, son/sa/ses (его/её), notre/nos, votre/vos, leur/leurs.
• Son/sa/ses может означать как «его», так и «ее» — решает пол существительного (son père = его или ее отец).
• Перед существительным женского рода, начинающимся на гласную: mon, ton, son (mon amie, ton école).
Исключения:
• Для частей тела определенный артикль часто заменяет притяжательный падеж: je me lave les mains, il a mal à la tête.
• Leur(s) — притяжательное; не путайте его с местоимением leur (je leur parle).
• Притяжательное + à + местоимение подчеркивает владельца: c’est mon livre à moi.`,
        es: `Reglas:
• Concuerdan con la cosa POSEÍDA, no con el poseedor: mon/ma/mes, ton/ta/tes, son/sa/ses (de él/de ella), notre/nos, votre/vos, leur/leurs.
• Son/sa/ses puede significar tanto "su" como "ella"; el género del sustantivo decide (son père = su padre).
• Antes de un sustantivo femenino que comienza con vocal: mon, ton, son (mon amie, ton école).
Excepciones:
• Para partes del cuerpo, el artículo definido a menudo reemplaza al posesivo: je me lave les mains, il a mal à la tête.
• Leur(s) es el posesivo; no lo confundas con el pronombre leur (je leur parle).
• Posesivo + à + pronombre enfatiza al propietario: c’est mon livre à moi.`,
        zh: `规则:
• 与被拥有的事物保持性数一致，而不取决于拥有者：mon/ma/mes, ton/ta/tes, son/sa/ses（他/她/它的），notre/nos, votre/vos, leur/leurs。
• Son/sa/ses 可以表示“他的”和“她的”——名词的性别决定（son père = 他或她的父亲）。
• 在以元音开头的阴性名词之前：mon, ton, son (mon amie, ton école)。
例外:
• 对于身体部位，定冠词通常取代所有格：je me lave les mains, il a mal à la tête.
• Leur(s) 是所有格；不要将其与代词 leur (je leur parle) 混淆。
• 所有格 + à + 代词强调所有者：c’est mon livre à moi.`,
        ko: `규칙:
• 소유자가 아니라 소유되는 대상에 성·수를 일치시킵니다: mon/ma/mes, ton/ta/tes, son/sa/ses (그/그녀/그것의), notre/nos, votre/vos, leur/leurs.
• Son/sa/ses는 '그의'와 '그녀의'를 모두 의미할 수 있습니다. 명사의 성별에 따라 결정됩니다(son père = 그의 아버지).
• 모음으로 시작하는 여성 명사 앞: mon, ton, son (mon amie, ton école).
예외:
• 신체 부위의 경우 종종 소유격을 정관사로 대체합니다: je me lave les mains, il a mal à la tête.
• Leur(s)는 소유격입니다. 대명사 leur (je leur parle)와 혼동하지 마세요.
• 소유격 + à + 대명사는 소유자를 강조합니다: c’est mon livre à moi.`,
        hi: `नियम:
• इनका लिंग-वचन सामंजस्य स्वामित्व वाली वस्तु से होता है, स्वामी से नहीं: mon/ma/mes, ton/ta/tes, son/sa/ses (उसका/उसकी), notre/nos, votre/vos, leur/leurs।
• Son/sa/ses का अर्थ «उस पुरुष का» या «उस स्त्री का» हो सकता है; संज्ञा का लिंग निर्णायक है (son père = उसका पिता)।
• स्वर से शुरू होने वाली स्त्रीलिंग संज्ञा से पहले mon, ton, son (mon amie, ton école)।
अपवाद:
• शरीर के अंगों के साथ स्वत्वबोधक की जगह प्रायः निश्चित उपपद आता है: je me lave les mains, il a mal à la tête.
• Leur(s) स्वत्वबोधक है; इसे सर्वनाम leur से भ्रमित न करें (je leur parle)।
• स्वत्वबोधक + à + सर्वनाम से स्वामी पर बल: c’est mon livre à moi.`,
        ga: `Rialacha:
• Réitíonn siad leis an rud atá faoi ÚINÉIREACHT, seachas leis an úinéir: mon/ma/mes, ton/ta/tes, son/sa/ses (aige/aici), notre/nos, votre/vos, leur/leurs.
• Féadann Son/sa/ses «aige» nó «aici» a chiallaíonn; inscne an ainmfhocail a shocraíonn an fhoirm (son père = a athair/a hathair).
• Roimh ainmfhocal baininscneach a thosaíonn le guta: mon, ton, son (mon amie, ton école).
Eisceachtaí:
• Le baill choirp, tagann an t-alt cinnte in áit an tsealbhaigh go minic: je me lave les mains, il a mal à la tête.
• Tá Leur(s) sealbhach; ná measc é leis an bhforainm leur (je leur parle).
• Sealbhach + à + forainm chun béim a chur ar an úinéir: c’est mon livre à moi.`
    });

    D('demonstratifs', {
        uk: `Правила:
• Ce (чол.), cet (чол. перед голосним/німим h), cette (жін.), ces (множина).
• Для вказування на предмет у ситуації або тексті; -ci (близьке) і -là (далеке) уточнюють: ce livre-ci, cette femme-là.
• Рід і число — за іменником.
Винятки:
• Cet — лише перед голосним: cet homme, cet été; але ce héros (h aspiré).
• У розмові -là часто заміняє -ci взагалі.
• Ce — також частина c’est/ce sont (займенник), не плутати з вказівним прикметником.`,
        en: `Rules:
• Ce (masc.), cet (masc. before a vowel/mute h), cette (fem.), ces (plural).
• For pointing at something in the situation or text; -ci (near) and -là (far) specify: ce livre-ci, cette femme-là.
• Gender and number follow the noun.
Exceptions:
• Cet only before a vowel: cet homme, cet été; but ce héros (aspirated h).
• In speech -là often replaces -ci altogether.
• Ce is also part of c’est/ce sont (a pronoun), not to be confused with the determiner.`,
        fr: `Règles:
• Ce (masc.), cet (masc. avant une voyelle/muette h), cette (fem.), ces (pluriel).
• Pour pointer du doigt quelque chose dans la situation ou dans le texte ; -ci (proche) et -là (loin) précisent : ce livre-ci, cette femme-là.
• Le genre et le numéro suivent le nom.
Exceptions:
• Cet uniquement avant une voyelle : cet homme, cet été ; mais ce héros (h aspiré).
• Dans le discours, -là remplace souvent complètement -ci.
• Ce fait également partie de c’est/ce sont (un pronom), à ne pas confondre avec le déterminant.`,
        ru: `Правила:
• Ce (маск.), cet (маск. перед гласной/немой h), cette (жен.), ces (множественное число).
• Для указания на что-либо в ситуации или тексте; -ci (ближний) и -là (дальний) указывают: ce livre-ci, cette femme-là.
• Пол и число следуют за существительным.
Исключения:
• Cet только перед гласной: cet homme, cet été; а ce héros (атмосферник h).
• В речи -là часто вообще заменяет -ci.
• Ce также является частью c’est/ce sont (местоимение), не путать с определителем.`,
        es: `Reglas:
• Ce (masc.), cet (masc. antes de vocal/muda h), cette (fem.), ces (plural).
• Por señalar algo en la situación o texto; -ci (cerca) y -là (lejos) especifican: ce livre-ci, cette femme-là.
• El género y el número siguen al sustantivo.
Excepciones:
• Cet sólo antes de una vocal: cet homme, cet été; pero ce héros (aspirado h).
• En el habla, -là a menudo reemplaza a -ci por completo.
• Ce también es parte de c’est/ce sont (un pronombre), que no debe confundirse con el determinante.`,
        zh: `规则:
• Ce（阳性）、cet（元音/静音 h 之前的阴性）、cette（阴性）、ces（复数）。
• 用于指出情境或文本中的某些内容； -ci（近）和-là（远）指定：ce livre-ci, cette femme-là.
• 名词后面有性别和数字。
例外:
• Cet 仅在元音之前：cet homme, cet été；但是ce héros（送气h）。
• 在语音中，-là 通常完全取代 -ci。
• Ce 也是 c’est/ce sont（代词）的一部分，不要与限定词混淆。`,
        ko: `규칙:
• Ce(masc.), cet(모음/음소거 앞의 Masc. h), cette(fem.), ces(복수).
• 상황이나 텍스트의 내용을 가리키는 경우 -ci(근거리) 및 -là(원거리) 지정: ce livre-ci, cette femme-là.
• 성별과 수는 명사 뒤에 옵니다.
예외:
• 모음 앞에만 Cet: cet homme, cet été; 하지만 ce héros(흡기식 h).
• 말할 때 -là는 종종 -ci를 완전히 대체합니다.
• Ce는 c’est/ce sont(대명사)의 일부이므로 한정사와 혼동하지 마세요.`,
        hi: `नियम:
• Ce (पुल्लिंग), cet (स्वर/मूक h से पहले पुल्लिंग), cette (स्त्रीलिंग), ces (बहुवचन)।
• स्थिति या पाठ में किसी वस्तु की ओर संकेत; -ci (निकट) और -là (दूर) भेद स्पष्ट करते हैं: ce livre-ci, cette femme-là.
• लिंग और वचन संज्ञा के अनुसार होते हैं।
अपवाद:
• Cet केवल स्वर से पहले: cet homme, cet été; लेकिन ce héros (महाप्राण h)।
• बोलचाल में -là प्रायः पूरी तरह -ci की जगह लेता है।
• Ce सर्वनाम c’est/ce sont का भी भाग है; निर्धारक से भ्रमित न करें।`,
        ga: `Rialacha:
• Ce (fir.), cet (fir. roimh ghuta/h balbh), cette (bain.), ces (iolra).
• Chun rud sa chás nó sa téacs a chur in iúl; sonraíonn -ci (gar) agus -là (i bhfad): ce livre-ci, cette femme-là.
• Leanann an inscne agus an uimhir an t-ainmfhocal.
Eisceachtaí:
• Cet roimh ghuta amháin: cet homme, cet été; ach ce héros (h aspiré).
• Sa chaint, is minic a thagann -là in áit -ci ar fad.
• Tá Ce mar chuid de c’est/ce sont (forainm) freisin; ná measc leis an gcinnteoir é.`
    });

    D('quantite', {
        uk: `Правила:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + іменник без артикля: beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — без de; chaque тільки в однині.
• La plupart des, bien des, la moitié de + множина з артиклем: la plupart des gens.
Винятки:
• Encore + частковий артикль (encore du pain), але un peu de — без артикля (un peu de sel).
• Bien du/de la (багато) з партитивом: bien du plaisir.
• Дієслово після la plupart des, une foule de, un grand nombre de — у множині.
• Quelques ≠ quelque (одн., «якийсь»): quelque chose, quelque temps.`,
        en: `Rules:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + noun without an article: beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — without de; chaque only in the singular.
• La plupart des, bien des, la moitié de + plural with article: la plupart des gens.
Exceptions:
• Encore + partitive article (encore du pain), but un peu de takes no article (un peu de sel).
• Bien du/de la (much) with the partitive: bien du plaisir.
• The verb after la plupart des, une foule de, un grand nombre de — plural.
• Quelques ≠ quelque (sing. "some"): quelque chose, quelque temps.`,
        fr: `Règles:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + nom sans article : beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — sans de; chaque uniquement au singulier.
• La plupart des, bien des, la moitié de + pluriel avec article : la plupart des gens.
Exceptions:
• Encore + article partitif (encore du pain), mais un peu de ne prend pas d'article (un peu de sel).
• Bien du/de la (beaucoup) avec le partitif : bien du plaisir.
• Le verbe après la plupart des, une foule de, un grand nombre de — pluriel.
• Quelques ≠ quelque (chanter "certains") : quelque chose, quelque temps.`,
        ru: `Правила:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + существительное без артикля: beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — без de; chaque только в единственном числе.
• La plupart des, bien des, la moitié de + множественное число с артиклем: la plupart des gens.
Исключения:
• Encore + разделительный артикль (encore du pain), но un peu de не принимает артикль (un peu de sel).
• Bien du/de la (много) с партитивом: bien du plaisir.
• Глагол после la plupart des, une foule de, un grand nombre de — множественное число.
• Quelques ≠ quelque (пойте "некоторые"): quelque chose, quelque temps.`,
        es: `Reglas:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + sustantivo sin artículo: beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — sin de; chaque solo en singular.
• La plupart des, bien des, la moitié de + plural con artículo: la plupart des gens.
Excepciones:
• Encore + artículo partitivo (encore du pain), pero un peu de no lleva artículo (un peu de sel).
• Bien du/de la (mucho) con el partitivo: bien du plaisir.
• El verbo después de la plupart des, une foule de, un grand nombre de — plural.
• Quelques ≠ quelque (canta. "algunos"): quelque chose, quelque temps.`,
        zh: `规则:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + 不带冠词的名词：beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — 仅以单数形式不含 de; chaque。
• La plupart des, bien des, la moitié de + 冠词的复数：la plupart des gens.
例外:
• Encore + 部分冠词 (encore du pain)，但 un peu de 不包含冠词 (un peu de sel)。
• Bien du/de la（很多），分词：bien du plaisir.
• la plupart des, une foule de, un grand nombre de 后面的动词 — 复数。
• Quelques ≠ quelque（唱。“一些”）：quelque chose, quelque temps.`,
        ko: `규칙:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + 관사가 없는 명사: beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — 단수형에만 de; chaque가 없습니다.
• La plupart des, bien des, la moitié de + 관사가 있는 복수형: la plupart des gens.
예외:
• Encore + 부분 기사 (encore du pain), 그러나 un peu de는 기사 (un peu de sel)를 취하지 않습니다.
• Bien du/de la (많은) 부분형 포함: bien du plaisir.
• la plupart des, une foule de, un grand nombre de 뒤의 동사 — 복수형.
• Quelques ≠ quelque("some" 노래): quelque chose, quelque temps.`,
        hi: `नियम:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + बिना उपपद संज्ञा: beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — de; chaque के बिना, केवल एकवचन में।
• La plupart des, bien des, la moitié de + उपपद सहित बहुवचन: la plupart des gens.
अपवाद:
• Encore + अंशसूचक उपपद (encore du pain), लेकिन un peu de बिना उपपद आता है (un peu de sel)।
• अंशसूचक के साथ Bien du/de la («बहुत»): bien du plaisir.
• la plupart des, une foule de, un grand nombre de के बाद क्रिया बहुवचन में होती है।
• Quelques ≠ quelque (एकवचन में «कुछ»): quelque chose, quelque temps.`,
        ga: `Rialacha:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + ainmfhocal gan alt: beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — gan de; chaque san uatha amháin.
• La plupart des, bien des, la moitié de + iolra le halt: la plupart des gens.
Eisceachtaí:
• Encore + alt páirteach (encore du pain), ach ní ghlacann un peu de alt (un peu de sel).
• Bien du/de la («go leor») leis an alt páirteach: bien du plaisir.
• Bíonn an briathar tar éis la plupart des, une foule de, un grand nombre de san iolra.
• Quelques ≠ quelque (uatha, «éigin»): quelque chose, quelque temps.`
    });

    D('comparatif', {
        uk: `Правила:
• Plus/moins/aussi + прикметник або прислівник + que: elle est plus grande que lui.
• Для кількості: plus de/moins de/autant de + іменник + que (plus de livres que moi).
• Дієслово: verbe + plus/moins/autant que.
Винятки:
• Bon → meilleur (не plus bon): ce vin est meilleur. Bien → mieux (не plus bien): il chante mieux.
• Mauvais → pire (або plus mauvais), mal → plus mal / pis (рідко).
• Petit → plus petit; moindre — «менший» у переносному значенні (le moindre mal — найменше зло).
• Після que — тонічний займенник (plus grand que moi); у формальному стилі перед дієсловом може з’явитися ne (il est plus grand que je ne pensais).`,
        en: `Rules:
• Plus/moins/aussi + adjective or adverb + que: elle est plus grande que lui.
• For quantity: plus de/moins de/autant de + noun + que (plus de livres que moi).
• With verbs: verb + plus/moins/autant que.
Exceptions:
• Bon → meilleur (not plus bon): ce vin est meilleur. Bien → mieux (not plus bien): il chante mieux.
• Mauvais → pire (or plus mauvais), mal → plus mal / pis (rare).
• Petit → plus petit; moindre — "lesser" in the figurative sense (le moindre mal).
• After que the pronoun is stressed (plus grand que moi); in formal style a pleonastic ne may appear before the verb (il est plus grand que je ne pensais).`,
        fr: `Règles:
• Plus/moins/aussi + adjectif ou adverbe + que : elle est plus grande que lui.
• Pour la quantité : plus de/moins de/autant de + nom + que (plus de livres que moi).
• Avec verbes : verbe + plus/moins/autant que.
Exceptions:
• Bon → meilleur (pas plus bon) : ce vin est meilleur. Bien → mieux (pas plus bien) : il chante mieux.
• Mauvais → pire (ou plus mauvais), mal → plus mal / pis (rare).
• Petit → plus petit; moindre — « moindre » au sens figuré (le moindre mal).
• Après que, le pronom est accentué (plus grand que moi) ; dans le style formel, un pléonastique ne peut apparaître avant le verbe (il est plus grand que je ne pensais).`,
        ru: `Правила:
• Plus/moins/aussi + прилагательное или наречие + que: elle est plus grande que lui.
• Для количества: plus de/moins de/autant de + существительное + que (plus de livres que moi).
• С глаголами: глагол + plus/moins/autant que.
Исключения:
• Bon → meilleur (не plus bon): ce vin est meilleur. Bien → mieux (не plus bien): il chante mieux.
• Mauvais → pire (или plus mauvais), mal → plus mal / pis (редко).
• Petit → plus petit; moindre — «меньший» в переносном смысле (le moindre mal).
• После que ударение ставится местоимением (plus grand que moi); в формальном стиле плеонастический ne может стоять перед глаголом (il est plus grand que je ne pensais).`,
        es: `Reglas:
• Plus/moins/aussi + adjetivo o adverbio + que: elle est plus grande que lui.
• Para cantidad: plus de/moins de/autant de + sustantivo + que (plus de livres que moi).
• Con verbos: verbo + plus/moins/autant que.
Excepciones:
• Bon → meilleur (no plus bon): ce vin est meilleur. Bien → mieux (no plus bien): il chante mieux.
• Mauvais → pire (o plus mauvais), mal → plus mal / pis (raro).
• Petit → plus petit; moindre — "menor" en sentido figurado (le moindre mal).
• Después de que se acentúa el pronombre (plus grand que moi); en estilo formal puede aparecer un pleonástico ne antes del verbo (il est plus grand que je ne pensais).`,
        zh: `规则:
• Plus/moins/aussi + 形容词或副词 + que：elle est plus grande que lui.
• 数量：plus de/moins de/autant de + 名词 + que (plus de livres que moi)。
• 带动词：动词 + plus/moins/autant que.
例外:
• Bon → meilleur（不是 plus bon）：ce vin est meilleur. Bien → mieux（不是 plus bien）：il chante mieux.
• Mauvais → pire（或 plus mauvais）、mal → plus mal / pis（罕见）。
• Petit → plus petit; moindre — 比喻意义上的“较小”(le moindre mal)。
• 在que之后代词重读(plus grand que moi)；在正式风格中，动词 (il est plus grand que je ne pensais) 之前可能会出现复数 ne。`,
        ko: `규칙:
• Plus/moins/aussi + 형용사 또는 부사 + que: elle est plus grande que lui.
• 수량: plus de/moins de/autant de + 명사 + que (plus de livres que moi).
• 동사 포함: 동사 + plus/moins/autant que.
예외:
• Bon → meilleur(plus bon 아님): ce vin est meilleur. Bien → mieux(plus bien 아님): il chante mieux.
• Mauvais → pire(또는 plus mauvais), mal → plus mal / pis(희귀).
• Petit → plus petit; moindre — 비유적인 의미에서 "더 작은" (le moindre mal).
• que 다음에는 대명사에 강세 (plus grand que moi)가 붙습니다. 격식을 갖춘 스타일에서는 ne가 동사 (il est plus grand que je ne pensais) 앞에 나타날 수 있습니다.`,
        hi: `नियम:
• Plus/moins/aussi + विशेषण या क्रियाविशेषण + que: elle est plus grande que lui.
• मात्रा के लिए plus de/moins de/autant de + संज्ञा + que (plus de livres que moi)।
• क्रियाओं के साथ: क्रिया + plus/moins/autant que.
अपवाद:
• Bon → meilleur (plus bon नहीं): ce vin est meilleur. Bien → mieux (plus bien नहीं): il chante mieux.
• Mauvais → pire (या plus mauvais), mal → plus mal / pis (दुर्लभ)।
• Petit → plus petit; moindre — लाक्षणिक अर्थ में «कमतर» (le moindre mal)।
• que के बाद बलयुक्त सर्वनाम (plus grand que moi); औपचारिक शैली में क्रिया से पहले अर्थहीन ne आ सकता है (il est plus grand que je ne pensais)।`,
        ga: `Rialacha:
• Plus/moins/aussi + aidiacht nó dobhriathar + que: elle est plus grande que lui.
• Le cainníocht: plus de/moins de/autant de + ainmfhocal + que (plus de livres que moi).
• Le briathra: briathar + plus/moins/autant que.
Eisceachtaí:
• Bon → meilleur (seachas plus bon): ce vin est meilleur. Bien → mieux (seachas plus bien): il chante mieux.
• Mauvais → pire (nó plus mauvais), mal → plus mal / pis (annamh).
• Petit → plus petit; moindre — «níos lú» sa chiall fháthchiallach (le moindre mal).
• Tar éis que, úsáidtear forainm treise (plus grand que moi); sa stíl fhoirmiúil, féadann ne iomarcach teacht roimh an mbriathar (il est plus grand que je ne pensais).`
    });

    D('superlatif', {
        uk: `Правила:
• Le/la/les + plus/moins + прикметник: le plus grand, la plus belle, les moins chers.
• Прислівник: le plus vite, le mieux.
• Після найвищого ступеня вживають de (le plus grand de la classe), а відносне підрядне часто стоїть у subjonctif.
Винятки:
• Le meilleur (від bon), le mieux (від bien), le pire (від mauvais).
• Якщо прикметник стоїть ПІСЛЯ іменника, артикль повторюється: la voiture la plus rapide; перед іменником артикль один: le plus beau jour.
• Після le plus… que + subjonctif для оцінок: c’est le plus beau film que j’aie vu.`,
        en: `Rules:
• Le/la/les + plus/moins + adjective: le plus grand, la plus belle, les moins chers.
• Adverb: le plus vite, le mieux.
• After a superlative use de (le plus grand de la classe); the relative clause is often in the subjunctive.
Exceptions:
• Le meilleur (from bon), le mieux (from bien), le pire (from mauvais).
• With an adjective AFTER the noun the article is repeated: la voiture la plus rapide; before the noun there is one article: le plus beau jour.
• After le plus… que + subjunctive for evaluations: c’est le plus beau film que j’aie vu.`,
        fr: `Règles:
• Le/la/les + plus/moins + adjectif : le plus grand, la plus belle, les moins chers.
• Adverbe : le plus vite, le mieux.
• Après une utilisation superlative de (le plus grand de la classe) ; la proposition relative est souvent au mode subjonctif.
Exceptions:
• Le meilleur (à partir de bon), le mieux (à partir de bien), le pire (à partir de mauvais).
• Avec un adjectif APRÈS le nom l'article est répété : la voiture la plus rapide ; avant le nom il y a un article : le plus beau jour.
• Après le plus… que + mode subjonctif pour les évaluations : c’est le plus beau film que j’aie vu.`,
        ru: `Правила:
• Le/la/les + plus/moins + прилагательное: le plus grand, la plus belle, les moins chers.
• Наречие: le plus vite, le mieux.
• После превосходной степени используйте de (le plus grand de la classe); относительное предложение часто находится в сослагательном наклонении.
Исключения:
• Le meilleur (из bon), le mieux (из bien), le pire (из mauvais).
• При прилагательном ПОСЛЕ существительного артикль повторяется: la voiture la plus rapide; перед существительным стоит один артикль: le plus beau jour.
• После le plus… que + сослагательное наклонение для оценок: c’est le plus beau film que j’aie vu.`,
        es: `Reglas:
• Le/la/les + plus/moins + adjetivo: le plus grand, la plus belle, les moins chers.
• Adverbio: le plus vite, le mieux.
• Después de un uso superlativo de (le plus grand de la classe); la cláusula relativa suele estar en modo subjuntivo.
Excepciones:
• Le meilleur (de bon), le mieux (de bien), le pire (de mauvais).
• Con un adjetivo DESPUÉS del sustantivo se repite el artículo: la voiture la plus rapide; delante del sustantivo hay un artículo: le plus beau jour.
• Después de le plus… que + modo subjuntivo para evaluaciones: c’est le plus beau film que j’aie vu.`,
        zh: `规则:
• Le/la/les + plus/moins + 形容词：le plus grand, la plus belle, les moins chers.
• 副词：le plus vite, le mieux.
• 在最高级使用 de (le plus grand de la classe) 后；关系从句通常采用虚拟式。
例外:
• Le meilleur（来自bon）、le mieux（来自bien）、le pire（来自mauvais）。
• 名词后面有形容词，冠词会重复：la voiture la plus rapide；名词前有一篇文章：le plus beau jour.
• 在 le plus… que + 评估虚拟式之后：c’est le plus beau film que j’aie vu.`,
        ko: `규칙:
• Le/la/les + plus/moins + 형용사: le plus grand, la plus belle, les moins chers.
• 부사: le plus vite, le mieux.
• 최상급 사용 후 de (le plus grand de la classe); 관계사절은 접속법인 경우가 많습니다.
예외:
• Le meilleur(bon에서), le mieux(bien에서), le pire(mauvais에서)
• 명사 뒤에 형용사가 있으면 관사가 반복됩니다: la voiture la plus rapide; 명사 앞에 관사가 하나 있습니다: le plus beau jour.
• le plus… que 이후 + 평가를 위한 접속법: c’est le plus beau film que j’aie vu.`,
        hi: `नियम:
• Le/la/les + plus/moins + विशेषण: le plus grand, la plus belle, les moins chers.
• क्रियाविशेषण: le plus vite, le mieux.
• उत्तमावस्था के बाद de प्रयोग करें (le plus grand de la classe); संबंधवाचक उपवाक्य में प्रायः विधिलिंग आता है।
अपवाद:
• Le meilleur (bon से), le mieux (bien से), le pire (mauvais से)।
• विशेषण संज्ञा के बाद हो तो उपपद दोहराते हैं: la voiture la plus rapide; संज्ञा से पहले एक ही उपपद: le plus beau jour.
• मूल्यांकन में le plus… que के बाद विधिलिंग: c’est le plus beau film que j’aie vu.`,
        ga: `Rialacha:
• Le/la/les + plus/moins + aidiacht: le plus grand, la plus belle, les moins chers.
• Dobhriathar: le plus vite, le mieux.
• Tar éis sárchéime, úsáidtear de (le plus grand de la classe); is minic a bhíonn an clásal coibhneasta sa mhodh foshuiteach.
Eisceachtaí:
• Le meilleur (ó bon), le mieux (ó bien), le pire (ó mauvais).
• Le haidiacht TAR ÉIS an ainmfhocail, athdhéantar an t-alt: la voiture la plus rapide; roimh an ainmfhocal, níl ach alt amháin ann: le plus beau jour.
• Tar éis le plus… que, úsáidtear an foshuiteach le haghaidh measúnuithe: c’est le plus beau film que j’aie vu.`
    });

    D('adverbes-ment', {
        uk: `Правила:
• Жіноча форма прикметника + -ment: lent → lente → lentement; doux → douce → doucement.
• Прикметник на голосний у чол. роді: +ment: vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment: constant → constamment, évident → évidemment.
Винятки:
• Неправильні: gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux — окремі прислівники.
• Lent → lentement, présent → présentement — не -emment, хоч прикметник на -ent.
• Деякі прикметники функціонують як прислівники: parler bas, coûter cher, travailler dur.`,
        en: `Rules:
• Feminine form of the adjective + -ment: lent → lente → lentement; doux → douce → doucement.
• Adjectives ending in a vowel: +ment: vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment: constant → constamment, évident → évidemment.
Exceptions:
• Irregular: gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux — separate adverbs.
• Lent → lentement, présent → présentement — not -emment, though the adjective ends in -ent.
• Some adjectives function as adverbs: parler bas, coûter cher, travailler dur.`,
        fr: `Règles:
• Forme féminine de l'adjectif + -ment : lent → lente → lentement; doux → douce → doucement.
• Adjectifs se terminant par une voyelle : +ment : vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment : constant → constamment, évident → évidemment.
Exceptions:
• Irrégulier : gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux — adverbes séparés.
• Lent → lentement, présent → présentement — pas -emment, bien que l'adjectif se termine par -ent.
• Certains adjectifs fonctionnent comme des adverbes : parler bas, coûter cher, travailler dur.`,
        ru: `Правила:
• Женская форма прилагательного + -ment: lent → lente → lentement; doux → douce → doucement.
• Прилагательные, оканчивающиеся на гласную: +ment: vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment: constant → constamment, évident → évidemment.
Исключения:
• Неправильные формы: gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux — отдельные наречия.
• Lent → lentement, présent → présentement — не -emment, хотя прилагательное оканчивается на -ent.
• Некоторые прилагательные действуют как наречия: parler bas, coûter cher, travailler dur.`,
        es: `Reglas:
• Forma femenina del adjetivo + -ment: lent → lente → lentement; doux → douce → doucement.
• Adjetivos terminados en vocal: +ment: vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment: constant → constamment, évident → évidemment.
Excepciones:
• Irregular: gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux — adverbios separados.
• Lent → lentement, présent → présentement — no -emment, aunque el adjetivo termina en -ent.
• Algunos adjetivos funcionan como adverbios: parler bas, coûter cher, travailler dur.`,
        zh: `规则:
• 形容词的阴性形式 + -ment：lent → lente → lentement; doux → douce → doucement.
• 以元音结尾的形容词：+ment：vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment：constant → constamment, évident → évidemment.
例外:
• 不规则：gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux — 单独的副词。
• Lent → lentement, présent → présentement — 不是 -emment，尽管形容词以 -ent. 结尾
• 一些形容词充当副词：parler bas, coûter cher, travailler dur.`,
        ko: `규칙:
• 형용사 + -ment의 여성형: lent → lente → lentement; doux → douce → doucement.
• 모음으로 끝나는 형용사: +ment: vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment: constant → constamment, évident → évidemment.
예외:
• 불규칙: gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux — 별도의 부사.
• Lent → lentement, présent → présentement — -emment는 아니지만 형용사는 -ent.로 끝납니다.
• 일부 형용사는 부사 역할을 합니다: parler bas, coûter cher, travailler dur.`,
        hi: `नियम:
• विशेषण का स्त्रीलिंग रूप + -ment: lent → lente → lentement; doux → douce → doucement.
• स्वर पर समाप्त विशेषण: +ment: vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment: constant → constamment, évident → évidemment.
अपवाद:
• अनियमित रूप: gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux — अलग क्रियाविशेषण हैं।
• Lent → lentement, présent → présentement — -emment नहीं, भले ही विशेषण -ent. पर समाप्त होता है।
• कुछ विशेषण क्रियाविशेषण का काम करते हैं: parler bas, coûter cher, travailler dur.`,
        ga: `Rialacha:
• Foirm bhaininscneach na haidiachta + -ment: lent → lente → lentement; doux → douce → doucement.
• Aidiachtaí dar críoch guta: +ment: vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment: constant → constamment, évident → évidemment.
Eisceachtaí:
• Foirmeacha neamhrialta: gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux — dobhriathra ar leith.
• Lent → lentement, présent → présentement — ní -emment, cé go gcríochnaíonn an aidiacht le -ent.
• Feidhmíonn roinnt aidiachtaí mar dhobhriathra: parler bas, coûter cher, travailler dur.`
    });

    D('adverbes-places', {
        uk: `Правила:
• У простих часах — одразу ПІСЛЯ дієслова: il parle lentement.
• У складених — короткі прислівники (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent) між auxiliaire та participe: il a déjà mangé.
• Прислівники на -ment часто після participe: il a parlé lentement (або перед: il a lentement parlé — стилістично).
Винятки:
• Прислівники місця й часу (hier, demain, ici, là) стоять після participe: il est arrivé hier.
• Прислівники речення (heureusement, malheureusement, probablement) — на початку або після підмета.
• Pas, jamais, plus — разом з ne навколо допоміжного: il n’a jamais mangé.`,
        en: `Rules:
• In simple tenses — right AFTER the verb: il parle lentement.
• In compound tenses short adverbs (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent) go between auxiliary and participle: il a déjà mangé.
• -ment adverbs often follow the participle: il a parlé lentement (or precede it: il a lentement parlé — stylistic).
Exceptions:
• Adverbs of place and time (hier, demain, ici, là) follow the participle: il est arrivé hier.
• Sentence adverbs (heureusement, malheureusement, probablement) — at the start or after the subject.
• Pas, jamais, plus — with ne around the auxiliary: il n’a jamais mangé.`,
        fr: `Règles:
• Aux temps simples — juste APRÈS le verbe : il parle lentement.
• Aux temps composés, les adverbes courts (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent) se situent entre le verbe auxiliaire et le participe : il a déjà mangé.
• Les adverbes -ment suivent souvent le participe : il a parlé lentement (ou le précèdent : il a lentement parlé — stylistique).
Exceptions:
• Les adverbes de lieu et d'heure (hier, demain, ici, là) suivent le participe : il est arrivé hier.
• Adverbes de phrase (heureusement, malheureusement, probablement) — au début ou après le sujet.
• Pas, jamais, plus — avec ne autour du verbe auxiliaire : il n’a jamais mangé.`,
        ru: `Правила:
• В простых временах — сразу ПОСЛЕ глагола: il parle lentement.
• В сложных временах короткие наречия (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent) стоят между вспомогательным глаголом и причастием: il a déjà mangé.
• Наречия -ment часто следуют за причастием: il a parlé lentement (или предшествуют ему: il a lentement parlé — стилистический).
Исключения:
• Наречия места и времени (hier, demain, ici, là) следуют за причастием: il est arrivé hier.
• Наречия в предложениях (heureusement, malheureusement, probablement) — в начале или после подлежащего.
• Pas, jamais, plus — с ne вокруг вспомогательного глагола: il n’a jamais mangé.`,
        es: `Reglas:
• En tiempos simples, justo DESPUÉS del verbo: il parle lentement.
• En tiempos compuestos, los adverbios cortos (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent) van entre el verbo auxiliar y el participio: il a déjà mangé.
• Los adverbios -ment suelen seguir al participio: il a parlé lentement (o precederlo: il a lentement parlé — estilístico).
Excepciones:
• Los adverbios de lugar y tiempo (hier, demain, ici, là) siguen el participio: il est arrivé hier.
• Adverbios de oración (heureusement, malheureusement, probablement): al principio o después del sujeto.
• Pas, jamais, plus — con ne alrededor del verbo auxiliar: il n’a jamais mangé.`,
        zh: `规则:
• 简单时态 - 在动词之后：il parle lentement.
• 在复合时态中，短副词 (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent) 位于助动词和分词之间：il a déjà mangé.
• -ment 副词通常位于分词后面：il a parlé lentement（或位于其前面：il a lentement parlé — 文体）。
例外:
• 地点和时间副词 (hier, demain, ici, là) 跟在分词后面：il est arrivé hier.
• 句子副词 (heureusement, malheureusement, probablement) — 在主语开头或主语之后。
• Pas, jamais, plus — 助动词周围有 ne：il n’a jamais mangé.`,
        ko: `규칙:
• 단순 시제 — 동사 바로 뒤: il parle lentement.
• 복합 시제에서 짧은 부사 (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent)는 조동사와 분사 사이를 이동합니다: il a déjà mangé.
• -ment 부사는 분사 뒤에 오는 경우가 많습니다: il a parlé lentement(또는 앞에 위치: il a lentement parlé — 문체)
예외:
• 장소 및 시간 부사 (hier, demain, ici, là)는 분사형 il est arrivé hier. 뒤에 옵니다.
• 문장 부사 (heureusement, malheureusement, probablement) — 주어 시작 또는 뒤에.
• Pas, jamais, plus — 보조 동사 주위에 ne 포함: il n’a jamais mangé.`,
        hi: `नियम:
• सरल कालों में क्रिया के तुरंत बाद: il parle lentement.
• संयुक्त कालों में छोटे क्रियाविशेषण (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent) सहायक क्रिया और कृदंत के बीच आते हैं: il a déjà mangé.
• -ment वाले क्रियाविशेषण प्रायः कृदंत के बाद: il a parlé lentement (या शैलीगत रूप में पहले: il a lentement parlé)।
अपवाद:
• स्थान और समय के क्रियाविशेषण (hier, demain, ici, là) कृदंत के बाद आते हैं: il est arrivé hier.
• पूरे वाक्य से जुड़े क्रियाविशेषण (heureusement, malheureusement, probablement) आरंभ में या कर्ता के बाद आते हैं।
• Pas, jamais, plus — सहायक क्रिया के दोनों ओर ne के साथ: il n’a jamais mangé.`,
        ga: `Rialacha:
• In aimsirí simplí, díreach TAR ÉIS an bhriathair: il parle lentement.
• In aimsirí comhshuite, tagann dobhriathra gearra (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent) idir an briathar cúnta agus an rangabháil: il a déjà mangé.
• Is minic a leanann dobhriathra -ment an rangabháil: il a parlé lentement (nó roimpi: il a lentement parlé — rogha stíle).
Eisceachtaí:
• Leanann dobhriathra áite agus ama (hier, demain, ici, là) an rangabháil: il est arrivé hier.
• Dobhriathra abairte (heureusement, malheureusement, probablement) — ag an tús nó tar éis an ainmní.
• Pas, jamais, plus — le ne timpeall ar an mbriathar cúnta: il n’a jamais mangé.`
    });

    D('pronoms-sujets', {
        uk: `Правила:
• Je (j’ перед голосним), tu, il, elle, on, nous, vous, ils, elles.
• Tu — до друзів і дітей; vous — ввічливо або множина.
• On = «ми» (розм.), «люди взагалі», «хтось»; дієслово в 3-й особі однини.
Винятки:
• Il безособове: il pleut, il faut, il y a.
• Ils — для групи, де є хоч один чоловік; elles — лише жінки.
• Підмет-іменник + займенник (Pierre, il…) у розмові для виділення.
• Узгодження з on: participe може бути в множині (on est partis).`,
        en: `Rules:
• Je (j’ before a vowel), tu, il, elle, on, nous, vous, ils, elles.
• Tu — to friends and children; vous — polite or plural.
• On = "we" (informal), "people in general", "someone"; the verb is 3rd person singular.
Exceptions:
• Impersonal il: il pleut, il faut, il y a.
• Ils — for a group with at least one man; elles — only women.
• Noun subject + pronoun (Pierre, il…) in speech for emphasis.
• Agreement with on: the participle can be plural (on est partis).`,
        fr: `Règles:
• Je (j’ avant une voyelle), tu, il, elle, on, nous, vous, ils, elles.
• Tu — aux amis et aux enfants ; vous — poli ou pluriel.
• On = "nous" (informel), "les gens en général", "quelqu'un" ; le verbe est à la 3ème personne du singulier.
Exceptions:
• il impersonnel : il pleut, il faut, il y a.
• Ils — pour un groupe avec au moins un homme ; elles — uniquement pour les femmes.
• Nom sujet + pronom (Pierre, il…) dans le discours pour mettre l'accent.
• Accord avec on : le participe peut être pluriel (on est partis).`,
        ru: `Правила:
• Je (j’ перед гласной), tu, il, elle, on, nous, vous, ils, elles.
• Tu — друзьям и детям; vous — вежливое или множественное число.
• On = "мы" (неформально), "люди в целом", "кто-то"; глагол имеет форму 3-го лица единственного числа.
Исключения:
• Обезличенный il: il pleut, il faut, il y a.
• Ils — для группы хотя бы из одного человека; elles — только женщины.
• Существительное подлежащее + местоимение (Pierre, il…) в речи для акцентирования.
• Согласие с on: причастие может быть во множественном числе (on est partis).`,
        es: `Reglas:
• Je (j’ antes de una vocal), tu, il, elle, on, nous, vous, ils, elles.
• Tu — a amigos e hijos; vous — educado o plural.
• On = "nosotros" (informal), "gente en general", "alguien"; el verbo es 3ª persona del singular.
Excepciones:
• Impersonal il: il pleut, il faut, il y a.
• Ils — para un grupo con al menos un hombre; elles — sólo mujeres.
• Sustantivo sujeto + pronombre (Pierre, il…) en el discurso para dar énfasis.
• Concordancia con on: el participio puede ser plural (on est partis).`,
        zh: `规则:
• Je（元音前的 j’）、tu, il, elle, on, nous, vous, ils, elles.
• Tu — 给朋友和孩子； vous — 礼貌或复数。
• On = "我们"（非正式）、"一般人"、"某人";动词是第三人称单数。
例外:
• 非个人 il：il pleut, il faut, il y a.
• Ils — 至少有一个人的团体； elles — 仅限女性。
• 名词主语+代词（Pierre, il…）在演讲中用于强调。
• 配合on：分词可以是复数(on est partis)。`,
        ko: `규칙:
• Je (모음 앞의 j’), tu, il, elle, on, nous, vous, ils, elles.
• Tu — 친구와 아이들에게 vous — 정중함 또는 복수형.
• On = "우리"(비공식), "일반적인 사람들", "누군가"; 동사는 3인칭 단수입니다.
예외:
• 비개인적인 il: il pleut, il faut, il y a.
• Ils — 최소 한 명의 남성이 포함된 그룹의 경우; elles — 여성 전용.
• 강조를 위한 연설에서 명사 주어 + 대명사(Pierre, il…)
• on와의 합의: 분사는 복수형 (on est partis)일 수 있습니다.`,
        hi: `नियम:
• Je (स्वर से पहले j’), tu, il, elle, on, nous, vous, ils, elles.
• Tu — मित्रों और बच्चों से; vous — आदरसूचक या बहुवचन।
• On = «हम» (अनौपचारिक), «लोग सामान्यतः», «कोई»; क्रिया तृतीय पुरुष एकवचन में।
अपवाद:
• निर्वैयक्तिक il: il pleut, il faut, il y a.
• Ils — समूह में कम से कम एक पुरुष; elles — केवल महिलाएँ।
• बोलचाल में बल देने के लिए संज्ञात्मक कर्ता + सर्वनाम (Pierre, il…)।
• on के साथ सामंजस्य: कृदंत बहुवचन में हो सकता है (on est partis)।`,
        ga: `Rialacha:
• Je (j’ roimh ghuta), tu, il, elle, on, nous, vous, ils, elles.
• Tu — le cairde agus páistí; vous — cúirtéiseach nó iolra.
• On = «muid» (neamhfhoirmiúil), «daoine go ginearálta», «duine éigin»; bíonn an briathar sa tríú pearsa uatha.
Eisceachtaí:
• il neamhphearsanta: il pleut, il faut, il y a.
• Ils — le grúpa ina bhfuil fear amháin ar a laghad; elles — mná amháin.
• Ainmfhocal mar ainmní + forainm (Pierre, il…) sa chaint chun béim a chur air.
• Réiteach le on: féadann an rangabháil a bheith san iolra (on est partis).`
    });

    D('pronoms-cod', {
        uk: `Правила:
• Me, te, le/la (l’), nous, vous, les — ПЕРЕД відмінюваним дієсловом: je le vois, elle les a achetés.
• З інфінітивом — перед інфінітивом: je veux le voir.
• В імперативі ствердному — після дієслова через дефіс: regarde-le !
• Le/la/les замінюють іменник з означеним артиклем або присвійним/вказівним (le livre → je le lis).
Винятки:
• Le може замінювати цілу думку або прикметник: je le sais, elle l’est (heureuse).
• Викликає узгодження participe: je les ai vus (COD стоїть перед дієсловом).
• З неозначеним артиклем/партитивом замість le — en (j’en veux).`,
        en: `Rules:
• Me, te, le/la (l’), nous, vous, les — BEFORE the conjugated verb: je le vois, elle les a achetés.
• With an infinitive — before the infinitive: je veux le voir.
• In the affirmative imperative — after the verb with a hyphen: regarde-le !
• Le/la/les replace a noun with a definite, possessive or demonstrative determiner (le livre → je le lis).
Exceptions:
• Le may replace a whole idea or an adjective: je le sais, elle l’est (heureuse).
• Triggers participle agreement: je les ai vus (COD before the verb).
• With an indefinite or partitive article use en instead (j’en veux).`,
        fr: `Règles:
• Me, te, le/la (l’), nous, vous, les — AVANT le verbe conjugué : je le vois, elle les a achetés.
• Avec un infinitif — avant l'infinitif : je veux le voir.
• À l'impératif affirmatif — après le verbe avec un trait d'union : regarde-le !
• Le/la/les remplace un nom par un déterminant défini, possessif ou démonstratif (le livre → je le lis).
Exceptions:
• Le peut remplacer toute une idée ou un adjectif : je le sais, elle l’est (heureuse).
• Déclenche l'accord du participe : je les ai vus (COD avant le verbe).
• Avec un article indéfini ou partitif, utilisez en à la place de (j’en veux).`,
        ru: `Правила:
• Me, te, le/la (l’), nous, vous, les — ПЕРЕД спряженным глаголом: je le vois, elle les a achetés.
• С инфинитивом — перед инфинитивом: je veux le voir.
• В утвердительном повелительном наклонении — после глагола через дефис: regarde-le !
• Le/la/les заменяет существительное определенным, притяжательным или указательным определителем (le livre → je le lis).
Исключения:
• Le может заменить целую идею или прилагательное: je le sais, elle l’est (heureuse).
• Вызывает согласование причастия: je les ai vus (COD перед глаголом).
• В неопределенном или разделительном артикле используйте en вместо (j’en veux).`,
        es: `Reglas:
• Me, te, le/la (l’), nous, vous, les — ANTES del verbo conjugado: je le vois, elle les a achetés.
• Con infinitivo — antes del infinitivo: je veux le voir.
• En imperativo afirmativo, después del verbo con un guión: regarde-le !
• Le/la/les reemplaza un sustantivo con un determinante definido, posesivo o demostrativo (le livre → je le lis).
Excepciones:
• Le puede reemplazar una idea completa o un adjetivo: je le sais, elle l’est (heureuse).
• Desencadena el concordancia del participio: je les ai vus (COD antes del verbo).
• Con un artículo indefinido o partitivo utilice en en lugar de (j’en veux).`,
        zh: `规则:
• Me, te, le/la (l’)、nous, vous, les — 在共轭动词之前：je le vois, elle les a achetés.
• 带有不定式 — 不定式之前：je veux le voir.
• 在肯定祈使句中 - 在带有连字符的动词之后：regarde-le！
• Le/la/les 用确定、所有格或指示限定词 (le livre → je le lis) 替换名词。
例外:
• Le 可以替换整个想法或形容词：je le sais, elle l’est (heureuse)。
• 触发分词一致：je les ai vus（动词前的 COD）。
• 对于不定冠词或部分冠词，请使用 en 而不是 (j’en veux)。`,
        ko: `규칙:
• Me, te, le/la (l’), nous, vous, les — 활용 동사 앞: je le vois, elle les a achetés.
• 부정사 포함 — 부정사 앞: je veux le voir.
• 긍정 명령에서 — 하이픈이 있는 동사 뒤: regarde-le !
• Le/la/les 명사를 한정, 소유 또는 실증 한정사 (le livre → je le lis)로 바꿉니다.
예외:
• Le는 전체 개념이나 형용사를 대체할 수 있습니다: je le sais, elle l’est (heureuse).
• 분사 일치를 트리거합니다: je les ai vus(동사 앞의 COD)
• 부정관사나 부분관사에는 (j’en veux) 대신 en를 사용하세요.`,
        hi: `नियम:
• Me, te, le/la (l’), nous, vous, les — रूपांतरित क्रिया से पहले: je le vois, elle les a achetés.
• अनंत रूप के साथ, अनंत रूप से पहले: je veux le voir.
• सकारात्मक आज्ञार्थक में क्रिया के बाद हाइफ़न सहित: regarde-le !
• Le/la/les निश्चित, स्वत्वबोधक या संकेतवाचक निर्धारक वाली संज्ञा की जगह आते हैं (le livre → je le lis)।
अपवाद:
• Le पूरे विचार या विशेषण की जगह आ सकता है: je le sais, elle l’est (heureuse)।
• कृदंत का सामंजस्य कराता है: je les ai vus (क्रिया से पहले COD)।
• अनिश्चित या अंशसूचक उपपद हो तो इसके बदले en आता है (j’en veux)।`,
        ga: `Rialacha:
• Me, te, le/la (l’), nous, vous, les — ROIMH an mbriathar réimnithe: je le vois, elle les a achetés.
• Le hinfinideach, roimh an infinideach: je veux le voir.
• Sa mhodh ordaitheach dearfach, tar éis an bhriathair le fleiscín: regarde-le !
• Tagann Le/la/les in áit ainmfhocail le cinnteoir cinnte, sealbhach nó taispeántach (le livre → je le lis).
Eisceachtaí:
• Féadann Le teacht in áit smaoinimh iomláin nó aidiachta: je le sais, elle l’est (heureuse).
• Spreagann sé réiteach na rangabhála: je les ai vus (COD roimh an mbriathar).
• Le halt éiginnte nó páirteach, úsáidtear en ina áit (j’en veux).`
    });

    D('pronoms-coi', {
        uk: `Правила:
• Me, te, lui, nous, vous, leur — замінюють à + ОСОБА: je lui parle, il leur a donné un livre.
• Позиція — перед дієсловом (як COD); у ствердному імперативі — після: parle-lui !
• Типові дієслова: parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
Винятки:
• Для речей — y замість lui/leur: je pense à mon travail → j’y pense.
• Деякі дієслова з à вимагають займенника з à + тонічний: penser à lui, songer à elle, s’intéresser à eux, être à moi.
• Leur (займенник, без -s) ≠ leur(s) (присвійне).`,
        en: `Rules:
• Me, te, lui, nous, vous, leur — replace à + PERSON: je lui parle, il leur a donné un livre.
• Position — before the verb (like COD); in the affirmative imperative — after: parle-lui !
• Typical verbs: parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
Exceptions:
• For things use y instead of lui/leur: je pense à mon travail → j’y pense.
• Some verbs with à require à + stressed pronoun: penser à lui, songer à elle, s’intéresser à eux, être à moi.
• Leur (pronoun, no -s) ≠ leur(s) (possessive).`,
        fr: `Règles:
• Me, te, lui, nous, vous, leur — remplacer à + PERSONNE : je lui parle, il leur a donné un livre.
• Position — avant le verbe (comme COD) ; à l'impératif affirmatif — après : parle-lui !
• Verbes typiques : parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
Exceptions:
• Pour les choses, utilisez y au lieu de lui/leur : je pense à mon travail → j’y pense.
• Certains verbes avec à nécessitent à + pronom accentué : penser à lui, songer à elle, s’intéresser à eux, être à moi.
• Leur (pronom, pas de -s) ≠ leur(s) (possessif).`,
        ru: `Правила:
• Me, te, lui, nous, vous, leur — замените à + ЧЕЛОВЕК: je lui parle, il leur a donné un livre.
• Позиция — перед глаголом (например, COD); в утвердительном повелительном наклонении — после: parle-lui !
• Типичные глаголы: parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
Исключения:
• Для вещей используйте y вместо lui/leur: je pense à mon travail → j’y pense.
• Некоторые глаголы с à требуют à + ударное местоимение: penser à lui, songer à elle, s’intéresser à eux, être à moi.
• Leur (местоимение, нет -s) ≠ leur(s) (притяжательное).`,
        es: `Reglas:
• Me, te, lui, nous, vous, leur — reemplaza à + PERSONA: je lui parle, il leur a donné un livre.
• Posición: antes del verbo (como COD); en imperativo afirmativo — después de: parle-lui !
• Verbos típicos: parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
Excepciones:
• Para cosas use y en lugar de lui/leur: je pense à mon travail → j’y pense.
• Algunos verbos con à requieren à + pronombre acentuado: penser à lui, songer à elle, s’intéresser à eux, être à moi.
• Leur (pronombre, no -s) ≠ leur(s) (posesivo).`,
        zh: `规则:
• Me, te, lui, nous, vous, leur — 替换 à + 人员：je lui parle, il leur a donné un livre.
• 位置 — 动词之前（如 COD）；在肯定祈使句中 — 之后：parle-lui！
• 典型动词：parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
例外:
• 对于使用 y 而不是 lui/leur 的事物：je pense à mon travail → j’y pense.
• 一些带有 à 的动词需要 à + 重读代词：penser à lui, songer à elle, s’intéresser à eux, être à moi.
• Leur（代词，无 -s）≠ leur(s)（所有格）。`,
        ko: `규칙:
• Me, te, lui, nous, vous, leur — à + 사람 교체: je lui parle, il leur a donné un livre.
• 위치 — 동사 앞(예: COD) 긍정 명령형 — 이후: parle-lui !
• 일반적인 동사: parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
예외:
• lui/leur 대신 y를 사용하세요: je pense à mon travail → j’y pense.
• à가 포함된 일부 동사에는 à + 강세 대명사: penser à lui, songer à elle, s’intéresser à eux, être à moi.가 필요합니다.
• Leur(대명사, -s가 아님) ≠ leur(s)(소유격).`,
        hi: `नियम:
• Me, te, lui, nous, vous, leur — à + व्यक्ति की जगह: je lui parle, il leur a donné un livre.
• स्थान — क्रिया से पहले (COD जैसे); सकारात्मक आज्ञार्थक में बाद में: parle-lui !
• सामान्य क्रियाएँ: parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
अपवाद:
• वस्तुओं के लिए lui/leur की जगह y आता है: je pense à mon travail → j’y pense.
• à वाली कुछ क्रियाओं में à + बलयुक्त सर्वनाम आवश्यक है: penser à lui, songer à elle, s’intéresser à eux, être à moi.
• Leur (सर्वनाम, -s नहीं) ≠ leur(s) (स्वत्वबोधक)।`,
        ga: `Rialacha:
• Me, te, lui, nous, vous, leur — in áit à + DUINE: je lui parle, il leur a donné un livre.
• Suíomh: roimh an mbriathar (mar an COD); sa mhodh ordaitheach dearfach, ina dhiaidh: parle-lui !
• Gnáthbhriathra: parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
Eisceachtaí:
• Le rudaí, úsáidtear y in áit lui/leur: je pense à mon travail → j’y pense.
• Éilíonn roinnt briathra le à à + forainm treise: penser à lui, songer à elle, s’intéresser à eux, être à moi.
• Leur (forainm, gan -s) ≠ leur(s) (sealbhach).`
    });

    D('pronoms-y-en', {
        uk: `Правила:
• Y замінює à/dans/sur/chez + місце або річ: j’y vais (je vais à Paris), j’y pense.
• En замінює de + іменник, партитив або кількість: j’en veux (du pain), j’en ai trois, je viens d’en parler.
• Позиція — перед дієсловом, у ствердному імперативі — після (vas-y, parles-en).
Винятки:
• З числівником/словом кількості en зберігає його: j’en ai trois, j’en ai beaucoup.
• У tu-імперативі повертається -s: vas-y, parles-en, manges-en.
• En не вживається для людей з de + особа — тоді de lui/d’elle: je parle de lui.
• Y/en в двох займенниках — завжди останні (je lui en donne).`,
        en: `Rules:
• Y replaces à/dans/sur/chez + place or thing: j’y vais (je vais à Paris), j’y pense.
• En replaces de + noun, a partitive or a quantity: j’en veux (du pain), j’en ai trois, je viens d’en parler.
• Position — before the verb; in the affirmative imperative — after (vas-y, parles-en).
Exceptions:
• With a numeral/quantity word en keeps it: j’en ai trois, j’en ai beaucoup.
• The tu-imperative regains its -s: vas-y, parles-en, manges-en.
• For people with de + person use de lui/d’elle, not en: je parle de lui.
• In pronoun clusters y/en always come last (je lui en donne).`,
        fr: `Règles:
• Y remplace à/dans/sur/chez + lieu ou chose : j’y vais (je vais à Paris), j’y pense.
• En remplace de + nom, un partitif ou une quantité : j’en veux (du pain), j’en ai trois, je viens d’en parler.
• Position — avant le verbe ; à l'impératif affirmatif — après (vas-y, parles-en).
Exceptions:
• Avec un chiffre/quantité mot en le garde : j’en ai trois, j’en ai beaucoup.
• L'impératif tu retrouve son -s : vas-y, parles-en, manges-en.
• Pour les personnes avec de +, utilisez de lui/d’elle, et non en : je parle de lui.
• Dans les groupes de pronoms, y/en vient toujours en dernier, (je lui en donne).`,
        ru: `Правила:
• Y заменяет à/dans/sur/chez + место или предмет: j’y vais (je vais à Paris), j’y pense.
• En заменяет de + существительное, партитив или количество: j’en veux (du pain), j’en ai trois, je viens d’en parler.
• Позиция — перед глаголом; в утвердительном повелительном наклонении — после (vas-y, parles-en).
Исключения:
• С числовым/количественным словом en сохраняет его: j’en ai trois, j’en ai beaucoup.
• Императив tu вновь обретает свой -s: vas-y, parles-en, manges-en.
• Для людей с de + person используйте de lui/d’elle, а не en: je parle de lui.
• В группах местоимений y/en всегда идет последним (je lui en donne).`,
        es: `Reglas:
• Y reemplaza a à/dans/sur/chez + lugar o cosa: j’y vais (je vais à Paris), j’y pense.
• En reemplaza a de + sustantivo, un partitivo o una cantidad: j’en veux (du pain), j’en ai trois, je viens d’en parler.
• Posición: antes del verbo; en imperativo afirmativo, después de (vas-y, parles-en).
Excepciones:
• Con una palabra numérica/cantidad en se queda: j’en ai trois, j’en ai beaucoup.
• El imperativo tu recupera su -s: vas-y, parles-en, manges-en.
• Para personas con de + persona use de lui/d’elle, no en: je parle de lui.
• En los grupos de pronombres y/en siempre viene al final (je lui en donne).`,
        zh: `规则:
• Y 替换 à/dans/sur/chez + 地点或事物：j’y vais (je vais à Paris)、j’y pense.
• En 替换 de + 名词、分词或数量：j’en veux (du pain)、j’en ai trois, je viens d’en parler.
• 位置 — 动词之前；在肯定祈使句中 — 在 (vas-y, parles-en) 之后。
例外:
• 用数字/数量词 en 保留它：j’en ai trois, j’en ai beaucoup.
• tu 命令恢复其 -s：vas-y, parles-en, manges-en.
• 对于 de + person 的人使用 de lui/d’elle，而不是 en：je parle de lui.
• 在代词簇中 y/en 总是排在最后 (je lui en donne)。`,
        ko: `규칙:
• Y는 à/dans/sur/chez + 장소 또는 사물을 대체합니다: j’y vais (je vais à Paris), j’y pense.
• En는 de + 명사, 부분 또는 수량을 대체합니다: j’en veux (du pain), j’en ai trois, je viens d’en parler.
• 위치 — 동사 앞; 긍정 명령형 — (vas-y, parles-en) 뒤에.
예외:
• 숫자/수량 단어 en는 다음을 유지합니다: j’en ai trois, j’en ai beaucoup.
• tu 명령은 -s를 회복합니다: vas-y, parles-en, manges-en.
• de + 사람의 경우 en가 아닌 de lui/d’elle를 사용하세요: je parle de lui.
• 대명사 클러스터에서는 y/en가 항상 (je lui en donne) 끝에 옵니다.`,
        hi: `नियम:
• Y, à/dans/sur/chez + स्थान या वस्तु की जगह आता है: j’y vais (je vais à Paris), j’y pense.
• En, de + संज्ञा, अंशसूचक या मात्रा की जगह आता है: j’en veux (du pain), j’en ai trois, je viens d’en parler.
• स्थान — क्रिया से पहले; सकारात्मक आज्ञार्थक में बाद में (vas-y, parles-en)।
अपवाद:
• en के साथ संख्या/मात्रासूचक शब्द बना रहता है: j’en ai trois, j’en ai beaucoup.
• tu के आज्ञार्थक रूप में -s लौट आता है: vas-y, parles-en, manges-en.
• व्यक्तियों के लिए de + व्यक्ति की जगह de lui/d’elle, en नहीं: je parle de lui.
• सर्वनामों के समूह में y/en हमेशा अंत में आते हैं (je lui en donne)।`,
        ga: `Rialacha:
• Tagann Y in áit à/dans/sur/chez + áit nó rud: j’y vais (je vais à Paris), j’y pense.
• Tagann En in áit de + ainmfhocal, ailt pháirtigh nó cainníochta: j’en veux (du pain), j’en ai trois, je viens d’en parler.
• Suíomh: roimh an mbriathar; sa mhodh ordaitheach dearfach, ina dhiaidh (vas-y, parles-en).
Eisceachtaí:
• Le huimhreán/focal cainníochta, coinníonn en é: j’en ai trois, j’en ai beaucoup.
• Faigheann foirm ordaitheach tu a -s ar ais: vas-y, parles-en, manges-en.
• Le daoine, in áit de + duine, úsáidtear de lui/d’elle, ní en: je parle de lui.
• I ngrúpaí forainmneacha, tagann y/en i gcónaí ag an deireadh (je lui en donne).`
    });

    D('pronoms-relatifs', {
        uk: `Правила:
• Qui — підмет: l’homme qui parle.
• Que (qu’) — прямий додаток: le livre que je lis.
• Dont — de + щось/хтось: le film dont je parle; і «чий»: la femme dont le fils est médecin.
• Où — місце/час: la ville où j’habite, le jour où il est venu.
• Прийменник + lequel/laquelle/lesquels/lesquelles: la table sur laquelle (з à → auquel, de → duquel).
Винятки:
• Для людей після прийменника — qui: la femme avec qui je parle.
• Ce qui/ce que/ce dont — без антецедента: je sais ce que tu veux.
• Дієслово після qui узгоджується з антецедентом: moi qui suis, toi qui es, nous qui sommes.
• Que елідується перед голосним (qu’il), qui — ніколи.`,
        en: `Rules:
• Qui — subject: l’homme qui parle.
• Que (qu’) — direct object: le livre que je lis.
• Dont — of which/whom: le film dont je parle; and "whose": la femme dont le fils est médecin.
• Où — place/time: la ville où j’habite, le jour où il est venu.
• Preposition + lequel/laquelle/lesquels/lesquelles: la table sur laquelle (with à → auquel, de → duquel).
Exceptions:
• For people after a preposition — qui: la femme avec qui je parle.
• Ce qui/ce que/ce dont — without an antecedent: je sais ce que tu veux.
• The verb after qui agrees with the antecedent: moi qui suis, toi qui es, nous qui sommes.
• Que elides before a vowel (qu’il), qui never does.`,
        fr: `Règles:
• Qui — sujet : l’homme qui parle.
• Que (qu’) — complément d’objet direct : le livre que je lis.
• Dont — dont/qui : le film dont je parle ; et "dont" : la femme dont le fils est médecin.
• Où — lieu/heure : la ville où j’habite, le jour où il est venu.
• Préposition + lequel/laquelle/lesquels/lesquelles : la table sur laquelle (avec à → auquel, de → duquel).
Exceptions:
• Pour les personnes après une préposition — qui : la femme avec qui je parle.
• Ce qui/ce que/ce dont — sans antécédent : je sais ce que tu veux.
• Le verbe après qui s'accorde avec l'antécédent : moi qui suis, toi qui es, nous qui sommes.
• Que s'élimine devant une voyelle (qu’il), qui ne le fait jamais.`,
        ru: `Правила:
• Qui — субъект: l’homme qui parle.
• Que (qu’) — прямой объект: le livre que je lis.
• Dont — из которых/кого: le film dont je parle; и «чей»: la femme dont le fils est médecin.
• Où — место/время: la ville où j’habite, le jour où il est venu.
• Предлог + lequel/laquelle/lesquels/lesquelles: la table sur laquelle (с à → auquel, de → duquel).
Исключения:
• Для людей после предлога — qui: la femme avec qui je parle.
• Ce qui/ce que/ce dont — без антецедента: je sais ce que tu veux.
• Глагол после qui согласуется с антецедентом: moi qui suis, toi qui es, nous qui sommes.
• Que выпадает перед гласной (qu’il), а qui никогда.`,
        es: `Reglas:
• Qui — asunto: l’homme qui parle.
• Que (qu’) — objeto directo: le livre que je lis.
• Dont — de los cuales/quién: le film dont je parle; y "cuyo": la femme dont le fils est médecin.
• Où — lugar/hora: la ville où j’habite, le jour où il est venu.
• Preposición + lequel/laquelle/lesquels/lesquelles: la table sur laquelle (con à → auquel, de → duquel).
Excepciones:
• Para personas después de una preposición: qui: la femme avec qui je parle.
• Ce qui/ce que/ce dont — sin antecedente: je sais ce que tu veux.
• El verbo después de qui concuerda con el antecedente: moi qui suis, toi qui es, nous qui sommes.
• Que elide antes de una vocal (qu’il), qui nunca lo hace.`,
        zh: `规则:
• Qui — 主题：l’homme qui parle.
• Que (qu’) — 直接对象：le livre que je lis.
• Dont — 其中/谁：le film dont je parle；和“谁的”：la femme dont le fils est médecin.
• Où — 地点/时间：la ville où j’habite, le jour où il est venu.
• 介词 + lequel/laquelle/lesquels/lesquelles：la table sur laquelle（与 à → auquel, de → duquel）。
例外:
• 对于介词后的人 — qui: la femme avec qui je parle.
• Ce qui/ce que/ce dont — 没有先行词：je sais ce que tu veux.
• qui 后面的动词与先行词一致：moi qui suis, toi qui es, nous qui sommes.
• Que 在元音 (qu’il) 之前省略，而 qui 从不省略。`,
        ko: `규칙:
• Qui — 제목: l’homme qui parle.
• Que (qu’) — 직접 목적어: le livre que je lis.
• Dont — 그 중/누구: le film dont je parle; 그리고 "누구의": la femme dont le fils est médecin.
• Où — 장소/시간: la ville où j’habite, le jour où il est venu.
• 전치사 + lequel/laquelle/lesquels/lesquelles: la table sur laquelle(à → auquel, de → duquel 포함)
예외:
• 전치사 뒤에 오는 사람의 경우 — qui: la femme avec qui je parle.
• Ce qui/ce que/ce dont — 선행사 없음: je sais ce que tu veux.
• qui 뒤의 동사는 선행사와 일치합니다: moi qui suis, toi qui es, nous qui sommes.
• Que는 모음 (qu’il) 앞에서 사라지고 qui는 절대 생략되지 않습니다.`,
        hi: `नियम:
• Qui — कर्ता: l’homme qui parle.
• Que (qu’) — प्रत्यक्ष कर्म: le livre que je lis.
• Dont — जिसके बारे में/जिसका: le film dont je parle; और «जिसका»: la femme dont le fils est médecin.
• Où — स्थान/समय: la ville où j’habite, le jour où il est venu.
• संबंधसूचक अव्यय + lequel/laquelle/lesquels/lesquelles: la table sur laquelle (साथ में à → auquel, de → duquel)।
अपवाद:
• व्यक्तियों के लिए संबंधसूचक अव्यय के बाद qui: la femme avec qui je parle.
• Ce qui/ce que/ce dont — बिना पूर्ववर्ती संज्ञा: je sais ce que tu veux.
• qui के बाद क्रिया पूर्ववर्ती संज्ञा के पुरुष-वचन के अनुसार होती है: moi qui suis, toi qui es, nous qui sommes.
• स्वर से पहले Que में स्वर-लोप होता है (qu’il); qui में कभी नहीं।`,
        ga: `Rialacha:
• Qui — ainmní: l’homme qui parle.
• Que (qu’) — cuspóir díreach: le livre que je lis.
• Dont — faoina bhfuiltear ag caint: le film dont je parle; agus «a bhfuil… aige/aici»: la femme dont le fils est médecin.
• Où — áit/am: la ville où j’habite, le jour où il est venu.
• Réamhfhocal + lequel/laquelle/lesquels/lesquelles: la table sur laquelle (le à → auquel, de → duquel).
Eisceachtaí:
• Le daoine tar éis réamhfhocail, qui: la femme avec qui je parle.
• Ce qui/ce que/ce dont — gan réamhtheachtaí: je sais ce que tu veux.
• Réitíonn an briathar tar éis qui leis an réamhtheachtaí: moi qui suis, toi qui es, nous qui sommes.
• Déantar eiliú ar Que roimh ghuta (qu’il), ach ní dhéantar ar qui riamh.`
    });

    D('pronoms-toniques', {
        uk: `Правила:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• Вживаються: після прийменників (avec moi, pour toi), після c’est/ce sont (c’est moi), для підкреслення (moi, je pense), у порівняннях (plus grand que lui), без дієслова (Qui est là ? — Moi.), при сполученні (Pierre et moi).
Винятки:
• Після à для людей з певними дієсловами тонічний замість COI: penser à lui, songer à elle.
• Soi — безособовий: on a besoin de soi, chacun pour soi.
• Eux/elles — лише для людей і тварин; для речей — y/en.`,
        en: `Rules:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• Used: after prepositions (avec moi, pour toi), after c’est/ce sont (c’est moi), for emphasis (moi, je pense), in comparisons (plus grand que lui), without a verb (Qui est là ? — Moi.), in coordination (Pierre et moi).
Exceptions:
• After à for people, certain verbs use a stressed pronoun instead of an indirect pronoun: penser à lui, songer à elle.
• Soi — impersonal: on a besoin de soi, chacun pour soi.
• Eux/elles — only for people and animals; for things use y/en.`,
        fr: `Règles:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• Utilisé : après les prépositions (avec moi, pour toi), après c’est/ce sont (c’est moi), pour souligner (moi, je pense), dans les comparaisons (plus grand que lui), sans verbe (Qui est là ? — Moi.), en coordination (Pierre et moi).
Exceptions:
• Après à pour les personnes, certains verbes utilisent un pronom accentué au lieu d'un pronom indirect : penser à lui, songer à elle.
• Soi — impersonnel : on a besoin de soi, chacun pour soi.
• Eux/elles — uniquement pour les personnes et les animaux ; pour les choses, utilisez y/en.`,
        ru: `Правила:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• Используется: после предлогов (avec moi, pour toi), после c’est/ce sont (c’est moi), для ударения (moi, je pense), в сравнениях (plus grand que lui), без глагола (Qui est là ? — Moi.), в координации (Pierre et moi).
Исключения:
• После à, обозначающего людей, в некоторых глаголах вместо косвенного местоимения используется ударное местоимение: penser à lui, songer à elle.
• Soi — обезличено: on a besoin de soi, chacun pour soi.
• Eux/elles — только для людей и животных; для вещей используйте y/en.`,
        es: `Reglas:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• Usado: después de las preposiciones (avec moi, pour toi), después de c’est/ce sont (c’est moi), para énfasis (moi, je pense), en comparaciones (plus grand que lui), sin verbo (Qui est là ? — Moi.), en coordinación (Pierre et moi).
Excepciones:
• Después de à para las personas, ciertos verbos usan un pronombre acentuado en lugar de un pronombre indirecto: penser à lui, songer à elle.
• Soi — impersonal: on a besoin de soi, chacun pour soi.
• Eux/elles — sólo para personas y animales; para cosas usa y/en.`,
        zh: `规则:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• 用于：介词(avec moi, pour toi)之后，c’est/ce sont (c’est moi)之后，强调(moi, je pense)，比较(plus grand que lui)，不带动词(Qui est là ? — Moi.)，并列(Pierre et moi)。
例外:
• 在表示人的 à 之后，某些动词使用重读代词而不是间接代词：penser à lui, songer à elle.
• Soi — 非个人：on a besoin de soi, chacun pour soi.
• Eux/elles — 仅适用于人和动物；对于事物使用 y/en.`,
        ko: `규칙:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• 사용됨: 전치사 (avec moi, pour toi) 뒤, c’est/ce sont (c’est moi) 뒤, (moi, je pense) 강조를 위해, 비교 (plus grand que lui)에서, 동사 (Qui est là ? — Moi.) 없이, (Pierre et moi)를 조정합니다.
예외:
• 사람에 대한 à 이후 특정 동사는 간접 대명사 대신 강세 대명사를 사용합니다: penser à lui, songer à elle.
• Soi — 비개인적: on a besoin de soi, chacun pour soi.
• Eux/elles — 사람과 동물에게만 해당됩니다. 사물에는 y/en.를 사용하세요`,
        hi: `नियम:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• प्रयोग: संबंधसूचक अव्ययों के बाद (avec moi, pour toi), c’est/ce sont के बाद (c’est moi), बल देने के लिए (moi, je pense), तुलना में (plus grand que lui), बिना क्रिया (Qui est là ? — Moi.), समानाधिकरण में (Pierre et moi)।
अपवाद:
• व्यक्तियों के लिए à के बाद कुछ क्रियाएँ अप्रत्यक्ष कर्म के सर्वनाम की जगह बलयुक्त सर्वनाम लेती हैं: penser à lui, songer à elle.
• Soi — निर्वैयक्तिक: on a besoin de soi, chacun pour soi.
• Eux/elles — केवल व्यक्ति और प्राणी; वस्तुओं के लिए y/en.`,
        ga: `Rialacha:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• Úsáid: tar éis réamhfhocal (avec moi, pour toi), tar éis c’est/ce sont (c’est moi), le haghaidh béime (moi, je pense), i gcomparáidí (plus grand que lui), gan bhriathar (Qui est là ? — Moi.), i gcomhordú (Pierre et moi).
Eisceachtaí:
• Tar éis à le daoine, glacann roinnt briathra forainm treise seachas forainm cuspóra indírigh: penser à lui, songer à elle.
• Soi — neamhphearsanta: on a besoin de soi, chacun pour soi.
• Eux/elles — le daoine agus ainmhithe amháin; le rudaí, úsáidtear y/en.`
    });

    D('double-pronoms', {
        uk: `Правила:
• Порядок перед дієсловом: me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• Приклади: il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• У ствердному імперативі: дієслово + COD + COI (donne-le-moi), у запереченні — як зазвичай (ne me le donne pas).
Винятки:
• Me/te/se перед le/la/les не елідуються: il me le donne (а не il m’le donne).
• В імперативі me/te → moi/toi (donne-le-moi), але перед en: donne-m’en.
• Не можна поєднувати me/te/nous/vous + lui/leur: не je lui te présente, а je te présente à lui.`,
        en: `Rules:
• Order before the verb: me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• Examples: il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• In the affirmative imperative: verb + COD + COI (donne-le-moi); in the negative as usual (ne me le donne pas).
Exceptions:
• Me/te/se do not elide before le/la/les: il me le donne (not il m’le donne).
• In the imperative me/te → moi/toi (donne-le-moi) but before en: donne-m’en.
• me/te/nous/vous cannot combine with lui/leur: not je lui te présente but je te présente à lui.`,
        fr: `Règles:
• Ordre avant le verbe : me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• Exemples : il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• À l'impératif affirmatif : verbe + COD + COI (donne-le-moi) ; dans le négatif comme d'habitude (ne me le donne pas).
Exceptions:
• Me/te/se ne s'efface pas avant le/la/les : il me le donne (pas il m’le donne).
• À l'impératif me/te → moi/toi (donne-le-moi) mais avant en : donne-m’en.
• me/te/nous/vous ne peut pas se combiner avec lui/leur : pas je lui te présente mais je te présente à lui.`,
        ru: `Правила:
• Порядок перед глаголом: me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• Примеры: il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• В утвердительном повелительном наклонении: глагол + COD + COI (donne-le-moi); как обычно в отрицательной форме (ne me le donne pas).
Исключения:
• Me/te/se не исключается перед le/la/les: il me le donne (не il m’le donne).
• В повелительном наклонении me/te → moi/toi (donne-le-moi), но перед en: donne-m’en.
• me/te/nous/vous не может сочетаться с lui/leur: не je lui te présente, а je te présente à lui.`,
        es: `Reglas:
• Orden antes del verbo: me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• Ejemplos: il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• En imperativo afirmativo: verbo + COD + COI (donne-le-moi); en negativo como siempre (ne me le donne pas).
Excepciones:
• Me/te/se no elide antes de le/la/les: il me le donne (no il m’le donne).
• En imperativo me/te → moi/toi (donne-le-moi) pero antes de en: donne-m’en.
• me/te/nous/vous no se puede combinar con lui/leur: no con je lui te présente sino con je te présente à lui.`,
        zh: `规则:
• 在动词之前排序：me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• 示例：il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• 在肯定祈使句中：动词 + COD + COI (donne-le-moi)；像往常一样为负(ne me le donne pas)。
例外:
• Me/te/se 不要在 le/la/les 之前删除：il me le donne（不是 il m’le donne）。
• 在命令式 me/te → moi/toi (donne-le-moi) 中但在 en 之前：donne-m’en.
• me/te/nous/vous 不能与 lui/leur 结合：不是 je lui te présente，而是 je te présente à lui.`,
        ko: `규칙:
• 동사 앞 순서: me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• 예: il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• 긍정 명령형: 동사 + COD + COI (donne-le-moi); 평소와 같이 부정적인 (ne me le donne pas).
예외:
• Me/te/se는 le/la/les: il me le donne(il m’le donne 아님) 이전에 생략되지 않습니다.
• 명령어 me/te → moi/toi (donne-le-moi)에서 en 이전: donne-m’en.
• me/te/nous/vous는 lui/leur와 결합할 수 없습니다: je lui te présente가 아니라 je te présente à lui.`,
        hi: `नियम:
• क्रिया से पहले क्रम: me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• उदाहरण: il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• सकारात्मक आज्ञार्थक में क्रिया + COD + COI (donne-le-moi); नकारात्मक में सामान्य क्रम (ne me le donne pas)।
अपवाद:
• le/la/les से पहले Me/te/se में स्वर-लोप नहीं: il me le donne (il m’le donne नहीं)।
• आज्ञार्थक में me/te → moi/toi (donne-le-moi), लेकिन en से पहले: donne-m’en.
• me/te/nous/vous और lui/leur एक साथ नहीं आ सकते: je lui te présente नहीं, je te présente à lui.`,
        ga: `Rialacha:
• Ord roimh an mbriathar: me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• Samplaí: il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• Sa mhodh ordaitheach dearfach: briathar + COD + COI (donne-le-moi); sa diúltach, an gnáthord (ne me le donne pas).
Eisceachtaí:
• Ní dhéantar eiliú ar Me/te/se roimh le/la/les: il me le donne (seachas il m’le donne).
• Sa mhodh ordaitheach, me/te → moi/toi (donne-le-moi), ach roimh en: donne-m’en.
• Ní féidir me/te/nous/vous agus lui/leur a chur le chéile: ní je lui te présente ach je te présente à lui.`
    });

    D('pronoms-interrogatifs', {
        uk: `Правила:
• Хто: qui / qui est-ce qui (підмет), qui / qui est-ce que (додаток).
• Що: qu’est-ce qui (підмет), que / qu’est-ce que (додаток), quoi (після прийменника).
• Де/коли/як/чому/скільки: où, quand, comment, pourquoi, combien (de).
• Який: quel, quelle, quels, quelles (узгоджується); lequel — котрий із.
Винятки:
• Que (qu’) — тільки з інверсією або est-ce que: que veux-tu ? / qu’est-ce que tu veux ?
• Quoi — після прийменника або без дієслова: tu parles de quoi ? Quoi ?
• Pourquoi + інверсія з сполучним -t-: pourquoi a-t-il…
• Quel — після être: quelle est ta ville ?`,
        en: `Rules:
• Who: qui / qui est-ce qui (subject), qui / qui est-ce que (object).
• What: qu’est-ce qui (subject), que / qu’est-ce que (object), quoi (after a preposition).
• Where/when/how/why/how many: où, quand, comment, pourquoi, combien (de).
• Which: quel, quelle, quels, quelles (agrees); lequel — which one of.
Exceptions:
• Que (qu’) only with inversion or est-ce que: que veux-tu ? / qu’est-ce que tu veux ?
• Quoi — after a preposition or without a verb: tu parles de quoi ? Quoi ?
• Pourquoi + inversion with euphonic -t-: pourquoi a-t-il…
• Quel — after être: quelle est ta ville ?`,
        fr: `Règles:
• Qui : qui / qui est-ce qui (sujet), qui / qui est-ce que (objet).
• Quoi : qu’est-ce qui (sujet), que / qu’est-ce que (objet), quoi (après une préposition).
• Où/quand/comment/pourquoi/combien : où, quand, comment, pourquoi, combien (de).
• Quel : quel, quelle, quels, quelles (accord en genre et en nombre) ; lequel signifie « lequel parmi plusieurs ».
Exceptions:
• Que (qu’) uniquement avec inversion ou est-ce que : que veux-tu ? / qu’est-ce que tu veux ?
• Quoi — après une préposition ou sans verbe : tu parles de quoi ? Quoi ?
• Pourquoi + inversion avec -t- euphonique : pourquoi a-t-il…
• Quel — après être : quelle est ta ville ?`,
        ru: `Правила:
• Кто: qui / qui est-ce qui (субъект), qui / qui est-ce que (объект).
• Что: qu’est-ce qui (подлежащее), que / qu’est-ce que (дополнение), quoi (после предлога).
• Где/когда/как/почему/сколько: où, quand, comment, pourquoi, combien (de).
• «Который»: quel, quelle, quels, quelles (согласуются в роде и числе); lequel — «который из».
Исключения:
• Que (qu’) только с инверсией или est-ce que: que veux-tu ? / qu’est-ce que tu veux ?
• Quoi — после предлога или без глагола: tu parles de quoi ? Quoi ?
• Pourquoi + инверсия с благозвучным -t-: pourquoi a-t-il…
• Quel — после être: quelle est ta ville ?`,
        es: `Reglas:
• Quién: qui / qui est-ce qui (sujeto), qui / qui est-ce que (objeto).
• Qué: qu’est-ce qui (sujeto), que / qu’est-ce que (objeto), quoi (después de una preposición).
• Dónde/cuándo/cómo/por qué/cuántos: où, quand, comment, pourquoi, combien (de).
• «Cuál»: quel, quelle, quels, quelles (concordancia de género y número); lequel — «cuál de varios».
Excepciones:
• Que (qu’) solo con inversión o est-ce que: que veux-tu ? / qu’est-ce que tu veux ?
• Quoi — después de una preposición o sin verbo: tu parles de quoi ? Quoi ?
• Pourquoi + inversión con eufónico -t-: pourquoi a-t-il…
• Quel — después de être: ¿quelle est ta ville?`,
        zh: `规则:
• 谁：qui / qui est-ce qui（主体），qui / qui est-ce que（客体）。
• 什么：qu’est-ce qui（主语）、que / qu’est-ce que（宾语）、quoi（介词后）。
• 地点/时间/方式/原因/数量：où, quand, comment, pourquoi, combien (de)。
• “哪一个”：quel, quelle, quels, quelles（按性和数变化）；lequel 表示“其中哪一个”。
例外:
• Que (qu’) 仅具有反转或 est-ce que：que veux-tu ? / qu’est-ce que tu veux ？
• Quoi — 在介词之后或没有动词：tu parles de quoi ? Quoi ?
• Pourquoi + 悦耳 -t- 转位：pourquoi a-t-il…
• Quel — 在 être 之后：quelle est ta ville ？`,
        ko: `규칙:
• 누구: qui / qui est-ce qui(주체), qui / qui est-ce que(객체).
• 무엇: qu’est-ce qui(주어), que / qu’est-ce que(목적어), quoi(전치사 뒤)
• 어디서/언제/어떻게/왜/몇 개: où, quand, comment, pourquoi, combien (de).
• «어느»: quel, quelle, quels, quelles (성·수 일치); lequel — «여럿 중 어느 것».
예외:
• Que (qu’) 반전만 사용 또는 est-ce que: que veux-tu ? / qu’est-ce que tu veux ?
• Quoi — 전치사 뒤 또는 동사 없이: tu parles de quoi ? Quoi ?
• Pourquoi + 유포닉 -t-: pourquoi a-t-il…
• Quel — être 이후: quelle est ta ville ?`,
        hi: `नियम:
• कौन: qui / qui est-ce qui (कर्ता), qui / qui est-ce que (कर्म)।
• क्या: qu’est-ce qui (कर्ता), que / qu’est-ce que (कर्म), quoi (संबंधसूचक अव्यय के बाद)।
• कहाँ/कब/कैसे/क्यों/कितना: où, quand, comment, pourquoi, combien (de)।
• कौन-सा: quel, quelle, quels, quelles (लिंग-वचन के अनुसार बदलता है); lequel — इनमें से कौन-सा।
अपवाद:
• Que (qu’) केवल उलटे शब्दक्रम या est-ce que के साथ: que veux-tu ? / qu’est-ce que tu veux ?
• Quoi — संबंधसूचक अव्यय के बाद या क्रिया के बिना: tu parles de quoi ? Quoi ?
• Pourquoi + उलटा शब्दक्रम; सुश्रव्यता के लिए -t-: pourquoi a-t-il…
• Quel — être के बाद: quelle est ta ville ?`,
        ga: `Rialacha:
• Cé: qui / qui est-ce qui (ainmní), qui / qui est-ce que (cuspóir).
• Cad: qu’est-ce qui (ainmní), que / qu’est-ce que (cuspóir), quoi (tar éis réamhfhocail).
• Cá/cathain/conas/cén fáth/cé mhéad: où, quand, comment, pourquoi, combien (de).
• Cén: quel, quelle, quels, quelles (réiteach inscne agus uimhreach); lequel — cé acu díobh.
Eisceachtaí:
• Ní úsáidtear Que (qu’) ach le hinbhéartú nó est-ce que: que veux-tu ? / qu’est-ce que tu veux ?
• Quoi — tar éis réamhfhocail nó gan bhriathar: tu parles de quoi ? Quoi ?
• Pourquoi + inbhéartú le -t- ar mhaithe le dea-fhuaimniú: pourquoi a-t-il…
• Quel — tar éis être: quelle est ta ville ?`
    });

    D('negation', {
        uk: `Правила:
• Ne (n’) перед дієсловом + друга частина після нього: ne … pas, ne … jamais, ne … plus, ne … rien, ne … personne, ne … aucun, ne … guère.
• У складених часах друга частина — після допоміжного: je n’ai pas mangé; але personne, aucun — після participe: je n’ai vu personne.
• Артикль після заперечення: un/une/des/du → de/d’ (je n’ai pas de pain).
• З інфінітивом обидва слова перед ним: ne pas partir.
Винятки:
• Ne … que — не заперечення, а обмеження («лише»).
• Ne … ni … ni: je n’ai ni frère ni sœur (без артикля).
• У розмові ne часто опускається: je sais pas.
• Pas/jamais без ne у відповіді або без дієслова: Pas du tout ! Jamais !
• Ne explétif (без заперечного значення): je crains qu’il ne vienne.`,
        en: `Rules:
• Ne (n’) before the verb + the second part after it: ne … pas, ne … jamais, ne … plus, ne … rien, ne … personne, ne … aucun, ne … guère.
• In compound tenses the second part follows the auxiliary: je n’ai pas mangé; but personne, aucun follow the participle: je n’ai vu personne.
• The article after a negation: un/une/des/du → de/d’ (je n’ai pas de pain).
• With an infinitive both words precede it: ne pas partir.
Exceptions:
• Ne … que is not a negation but a restriction ("only").
• Ne … ni … ni: je n’ai ni frère ni sœur (no article).
• In speech ne is often dropped: je sais pas.
• Pas/jamais without ne in an answer or without a verb: Pas du tout ! Jamais !
• Expletive ne (no negative meaning): je crains qu’il ne vienne.`,
        fr: `Règles:
• Ne (n’) avant le verbe + la deuxième partie après : ne … pas, ne … jamais, ne … plus, ne … rien, ne … personne, ne … aucun, ne … guère.
• Aux temps composés, la deuxième partie suit le verbe auxiliaire : je n’ai pas mangé ; mais personne, aucun suit le participe : je n’ai vu personne.
• L'article après une négation : un/une/des/du → de/d’ (je n’ai pas de pain).
• D'un infinitif les deux mots le précèdent : ne pas partir.
Exceptions:
• Ne … que n'est pas une négation mais une restriction ("seulement").
• Ne … ni … ni : je n’ai ni frère ni sœur (pas d'article).
• Dans le discours, ne est souvent supprimé : je sais pas.
• Pas/jamais sans ne dans une réponse ou sans verbe : Pas du tout ! Jamais !
• Explétif ne (pas de signification négative) : je crains qu’il ne vienne.`,
        ru: `Правила:
• Ne (n’) перед глаголом + вторая часть после него: ne … pas, ne … jamais, ne … plus, ne … rien, ne … personne, ne … aucun, ne … guère.
• В сложных временах вторая часть следует за вспомогательным глаголом: je n’ai pas mangé; но personne, aucun следует за причастием: je n’ai vu personne.
• Артикль после отрицания: un/une/des/du → de/d’ (je n’ai pas de pain).
• При инфинитиве перед ним оба слова: ne pas partir.
Исключения:
• Ne … que — это не отрицание, а ограничение («только»).
• Ne … ni … ni: je n’ai ni frère ni sœur (нет статьи).
• В речи ne часто опускается: je sais pas.
• Pas/jamais без ne в ответе или без глагола: Pas du tout ! Jamais !
• Руганство ne (без отрицательного значения): je crains qu’il ne vienne.`,
        es: `Reglas:
• Ne (n’) antes del verbo + segunda parte después: ne … pas, ne … jamais, ne … plus, ne … rien, ne … personne, ne … aucun, ne … guère.
• En tiempos compuestos, la segunda parte sigue al verbo auxiliar: je n’ai pas mangé; pero personne, aucun sigue el participio: je n’ai vu personne.
• El artículo después de una negación: un/une/des/du → de/d’ (je n’ai pas de pain).
• Con infinitivo ambas palabras lo preceden: ne pas partir.
Excepciones:
• Ne … que no es una negación sino una restricción ("sólo").
• Ne … ni … ni: je n’ai ni frère ni sœur (sin artículo).
• En el habla, a menudo se omite ne: je sais pas.
• Pas/jamais sin ne en una respuesta o sin verbo: Pas du tout ! Jamais !
• Expletivo ne (sin significado negativo): je crains qu’il ne vienne.`,
        zh: `规则:
• Ne (n’) 动词之前 + 后面的第二部分：ne … pas, ne … jamais, ne … plus, ne … rien, ne … personne, ne … aucun, ne … guère.
• 在复合时态中，第二部分跟随助动词：je n’ai pas mangé；但 personne, aucun 遵循分词：je n’ai vu personne.
• 否定后的文章：un/une/des/du → de/d’ (je n’ai pas de pain)。
• 对于不定式，两个词都在其前面：ne pas partir.
例外:
• Ne … que 不是否定而是限制（“仅”）。
• Ne … ni … ni：je n’ai ni frère ni sœur（无文章）。
• 在语音中 ne 经常被丢弃：je sais pas.
• Pas/jamais 答案中没有 ne 或没有动词：Pas du tout ! Jamais！
• 脏话ne（无负面含义）：je crains qu’il ne vienne.`,
        ko: `규칙:
• 동사 앞 Ne (n’) + 동사 뒤 두 번째 부분: ne … pas, ne … jamais, ne … plus, ne … rien, ne … personne, ne … aucun, ne … guère.
• 복합 시제에서 두 번째 부분은 조동사 뒤에 옵니다: je n’ai pas mangé; 그러나 personne, aucun는 분사를 따릅니다: je n’ai vu personne.
• 부정 뒤의 기사: un/une/des/du → de/d’ (je n’ai pas de pain).
• 부정사 앞에 두 단어가 모두 나옵니다: ne pas partir.
예외:
• Ne … que는 부정이 아니라 제한('만')입니다.
• Ne … ni … ni: je n’ai ni frère ni sœur(기사 없음).
• 연설에서 ne는 종종 생략됩니다: je sais pas.
• 답변에 ne가 없거나 동사가 없는 Pas/jamais: Pas du tout ! Jamais !
• 욕설 ne(부정적 의미 없음): je crains qu’il ne vienne.`,
        hi: `नियम:
• क्रिया से पहले Ne (n’) और दूसरा अंश उसके बाद: ne … pas, ne … jamais, ne … plus, ne … rien, ne … personne, ne … aucun, ne … guère.
• संयुक्त कालों में दूसरा अंश सहायक क्रिया के बाद: je n’ai pas mangé; लेकिन personne, aucun कृदंत के बाद: je n’ai vu personne.
• नकार के बाद उपपद: un/une/des/du → de/d’ (je n’ai pas de pain)।
• अनंत रूप के साथ दोनों शब्द उससे पहले आते हैं: ne pas partir.
अपवाद:
• Ne … que नकार नहीं, सीमा («केवल») दर्शाता है।
• Ne … ni … ni: je n’ai ni frère ni sœur (उपपद नहीं)।
• बोलचाल में ne प्रायः छूटता है: je sais pas.
• उत्तर में या बिना क्रिया Pas/jamais के साथ ne नहीं आता: Pas du tout ! Jamais !
• अर्थहीन ne (नकारात्मक अर्थ नहीं): je crains qu’il ne vienne.`,
        ga: `Rialacha:
• Ne (n’) roimh an mbriathar agus an dara cuid ina dhiaidh: ne … pas, ne … jamais, ne … plus, ne … rien, ne … personne, ne … aucun, ne … guère.
• In aimsirí comhshuite, leanann an dara cuid an briathar cúnta: je n’ai pas mangé; ach leanann personne, aucun an rangabháil: je n’ai vu personne.
• An t-alt tar éis diúltaithe: un/une/des/du → de/d’ (je n’ai pas de pain).
• Le hinfinideach, tagann an dá fhocal roimhe: ne pas partir.
Eisceachtaí:
• Ní diúltú é Ne … que ach srian («amháin»).
• Ne … ni … ni: je n’ai ni frère ni sœur (gan alt).
• Sa chaint, is minic a fhágtar ne ar lár: je sais pas.
• I bhfreagra nó gan bhriathar, úsáidtear Pas/jamais gan ne: Pas du tout ! Jamais !
• ne iomarcach (gan bhrí dhiúltach): je crains qu’il ne vienne.`
    });

    D('interrogation', {
        uk: `Правила:
• Інтонація (розм.): Tu viens ?
• Est-ce que (нейтрально): Est-ce que tu viens ?
• Інверсія (формально): Viens-tu ? Où vas-tu ?
• З питальним словом: Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où ?
Винятки:
• Інверсія з il/elle/on після голосної — сполучний -t-: Parle-t-il ? A-t-elle fini ?
• Іменник-підмет + займенник: Pierre vient-il ? (подвоєння підмета).
• З je інверсія рідкісна: puis-je, suis-je, ai-je — замість неї est-ce que.
• Питання про підмет (qui, qu’est-ce qui) не мають інверсії: Qui parle ?`,
        en: `Rules:
• Intonation (informal): Tu viens ?
• Est-ce que (neutral): Est-ce que tu viens ?
• Inversion (formal): Viens-tu ? Où vas-tu ?
• With a question word: Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où ?
Exceptions:
• Inversion with il/elle/on after a vowel takes a euphonic -t-: Parle-t-il ? A-t-elle fini ?
• Noun subject + pronoun: Pierre vient-il ? (subject doubling).
• With je inversion is rare: puis-je, suis-je, ai-je — otherwise use est-ce que.
• Questions about the subject (qui, qu’est-ce qui) take no inversion: Qui parle ?`,
        fr: `Règles:
• Intonation (informelle) : Tu viens ?
• Est-ce que (neutre) : Est-ce que tu viens ?
• Inversion (formelle) : Viens-tu ? Où vas-tu ?
• Avec un mot interrogatif : Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où ?
Exceptions:
• Inversion avec il/elle/on après qu'une voyelle prend un -t- euphonique : Parle-t-il ? A-t-elle fini ?
• Nom sujet + pronom : Pierre vient-il ? (sujet doublant).
• Avec je, l'inversion est rare : puis-je, suis-je, ai-je — sinon utilisez est-ce que.
• Les questions sur le sujet (qui, qu’est-ce qui) ne s'inversent pas : Qui parle ?`,
        ru: `Правила:
• Интонация (неформальная): Tu viens ?
• Est-ce que (нейтральный): Est-ce que tu viens ?
• Инверсия (формальная): Viens-tu ? Où vas-tu ?
• С вопросительным словом: Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où ?
Исключения:
• Инверсия с il/elle/on после гласной принимает благозвучный -t-: Parle-t-il ? A-t-elle fini ?
• Существительное субъект + местоимение: Pierre vient-il ? (субъект дублируется).
• При je инверсия встречается редко: puis-je, suis-je, ai-je — в противном случае используйте est-ce que.
• Вопросы по теме (qui, qu’est-ce qui) не требуют инверсии: Qui parle ?`,
        es: `Reglas:
• Entonación (informal): ¿Tu viens ?
• Est-ce que (neutral): ¿Est-ce que tu viens?
• Inversión (formal): ¿Viens-tu ? Où vas-tu ?
• Con una palabra interrogativa: ¿Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où?
Excepciones:
• Inversión con il/elle/on después de una vocal toma un -t- eufónico: Parle-t-il ? A-t-elle fini ?
• Sustantivo sujeto + pronombre: Pierre vient-il ? (sujeto a duplicación).
• Con je la inversión es poco común: puis-je, suis-je, ai-je; de lo contrario, use est-ce que.
• Preguntas sobre el tema (qui, qu’est-ce qui) no aceptan inversión: Qui parle ?`,
        zh: `规则:
• 语调（非正式）：Tu viens ?
• Est-ce que（中性）：Est-ce que tu viens ？
• 反演（正式）：Viens-tu ? Où vas-tu ？
• 带有疑问词：Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où ?
例外:
• 在元音发出悦耳的 -t- 后用 il/elle/on 倒转：Parle-t-il ? A-t-elle fini ？
• 名词主语 + 代词：Pierre vient-il ? （主题加倍）。
• 使用 je 时，反转很少见：puis-je, suis-je, ai-je — 否则使用 est-ce que.
• 关于主题 (qui, qu’est-ce qui) 的问题不需倒置：Qui parle ？`,
        ko: `규칙:
• 억양(비공식): Tu viens ?
• Est-ce que(중립): Est-ce que tu viens ?
• 반전(공식): Viens-tu ? Où vas-tu ?
• 질문 단어 포함: Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où ?
예외:
• 모음 뒤에 il/elle/on를 사용한 반전은 유포닉 -t-: Parle-t-il ? A-t-elle fini ?
• 명사 주어 + 대명사: Pierre vient-il ? (주어를 두 배로 늘림).
• je를 사용하면 반전이 거의 발생하지 않습니다. puis-je, suis-je, ai-je — 그렇지 않으면 est-ce que.를 사용하세요
• 주어 (qui, qu’est-ce qui)에 대한 질문에는 반전이 없습니다: Qui parle ?`,
        hi: `नियम:
• प्रश्नसूचक स्वर (अनौपचारिक): Tu viens ?
• Est-ce que (तटस्थ): Est-ce que tu viens ?
• उलटा शब्दक्रम (औपचारिक): Viens-tu ? Où vas-tu ?
• प्रश्नवाचक शब्द के साथ: Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où ?
अपवाद:
• स्वर के बाद il/elle/on वाले उलटे शब्दक्रम में सुश्रव्य -t- जुड़ता है: Parle-t-il ? A-t-elle fini ?
• संज्ञात्मक कर्ता + सर्वनाम: Pierre vient-il ? (कर्ता दोहरता है)।
• je के साथ उलटा शब्दक्रम दुर्लभ: puis-je, suis-je, ai-je; अन्यथा est-ce que. प्रयोग करें।
• कर्ता के बारे में प्रश्नों (qui, qu’est-ce qui) में उलटा शब्दक्रम नहीं: Qui parle ?`,
        ga: `Rialacha:
• Tuineadh ceisteach (neamhfhoirmiúil): Tu viens ?
• Est-ce que (neodrach): Est-ce que tu viens ?
• Inbhéartú (foirmiúil): Viens-tu ? Où vas-tu ?
• Le focal ceisteach: Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où ?
Eisceachtaí:
• Le hinbhéartú agus il/elle/on tar éis guta, cuirtear -t- leis ar mhaithe le dea-fhuaimniú: Parle-t-il ? A-t-elle fini ?
• Ainmfhocal mar ainmní + forainm: Pierre vient-il ? (dúbailt an ainmní).
• Is annamh inbhéartú le je: puis-je, suis-je, ai-je; murach sin, úsáidtear est-ce que.
• Ní dhéantar inbhéartú i gceisteanna faoin ainmní (qui, qu’est-ce qui): Qui parle ?`
    });

    D('mise-en-relief', {
        uk: `Правила:
• C’est + виділений елемент + qui (підмет) / que (інше): c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + множина (формально), у розмові часто c’est.
• Можна виділяти підмет, додаток, обставину: c’est demain que je pars.
• Дієслово після qui узгоджується з виділеним: c’est moi qui ai fait ça.
Винятки:
• Для виділення з прийменником: c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est: ce que je veux, c’est du repos (псевдо-розщеплене).
• У запереченні: ce n’est pas moi qui…`,
        en: `Rules:
• C’est + highlighted element + qui (subject) / que (other): c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + plural (formal), in speech often c’est.
• Subject, object or adverbial can be highlighted: c’est demain que je pars.
• The verb after qui agrees with the highlighted element: c’est moi qui ai fait ça.
Exceptions:
• With a preposition: c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est: ce que je veux, c’est du repos (pseudo-cleft).
• Negated: ce n’est pas moi qui…`,
        fr: `Règles:
• C’est + élément en surbrillance + qui (sujet) / que (autre) : c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + pluriel (formel), dans le discours souvent c’est.
• Le sujet, l'objet ou l'adverbial peuvent être mis en évidence : c’est demain que je pars.
• Le verbe après qui s'accorde avec l'élément en surbrillance : c’est moi qui ai fait ça.
Exceptions:
• Avec une préposition : c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est : ce que je veux, c’est du repos (pseudo-fente).
• Négaté : ce n’est pas moi qui…`,
        ru: `Правила:
• C’est + выделенный элемент + qui (тема) / que (другое): c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + множественное число (формальное), в речи часто c’est.
• Подлежащее, дополнение или наречие можно выделить: c’est demain que je pars.
• Глагол после qui согласуется с выделенным элементом: c’est moi qui ai fait ça.
Исключения:
• С предлогом: c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est: ce que je veux, c’est du repos (псевдорасщелина).
• Отрицается: ce n’est pas moi qui…`,
        es: `Reglas:
• C’est + elemento resaltado + qui (asunto) / que (otro): c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + plural (formal), en el habla suele ser c’est.
• Se puede resaltar sujeto, objeto o adverbial: c’est demain que je pars.
• El verbo después de qui concuerda con el elemento resaltado: c’est moi qui ai fait ça.
Excepciones:
• Con preposición: c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est: ce que je veux, c’est du repos (pseudohendidura).
• Negado: ce n’est pas moi qui…`,
        zh: `规则:
• C’est + 突出显示的元素 + qui（主题）/que（其他）：c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + 复数（正式），在演讲中常为 c’est.
• 可以突出显示主语、宾语或状语：c’est demain que je pars.
• qui 后面的动词与突出显示的元素一致：c’est moi qui ai fait ça.
例外:
• 带有介词：c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est：ce que je veux, c’est du repos（伪裂口）。
• 否定：ce n’est pas moi qui…`,
        ko: `규칙:
• C’est + 강조표시된 요소 + qui(주어) / que(기타): c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + 복수형(형식적), 연설에서 자주 c’est.
• 주어, 목적어, 부사 강조 표시 가능: c’est demain que je pars.
• qui 뒤의 동사는 강조 표시된 요소와 일치합니다: c’est moi qui ai fait ça.
예외:
• 전치사 사용: c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est: ce que je veux, c’est du repos(유사 갈라짐).
• 부정됨: ce n’est pas moi qui…`,
        hi: `नियम:
• C’est + प्रमुखता दिया गया अंश + qui (कर्ता) / que (अन्य): c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + बहुवचन (औपचारिक); बोलचाल में प्रायः c’est.
• कर्ता, कर्म या क्रियाविशेषणीय अंश पर बल दे सकते हैं: c’est demain que je pars.
• qui के बाद क्रिया प्रमुखता दिए गए अंश के अनुसार होती है: c’est moi qui ai fait ça.
अपवाद:
• संबंधसूचक अव्यय के साथ: c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est: ce que je veux, c’est du repos (छद्म-बलसूचक संरचना)।
• नकारात्मक रूप: ce n’est pas moi qui…`,
        ga: `Rialacha:
• C’est + gné aibhsithe + qui (ainmní) / que (eile): c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + iolra (foirmiúil); sa chaint, c’est. go minic.
• Is féidir an t-ainmní, an cuspóir nó an dobhriathra a aibhsiú: c’est demain que je pars.
• Réitíonn an briathar tar éis qui leis an ngné aibhsithe: c’est moi qui ai fait ça.
Eisceachtaí:
• Le réamhfhocal: c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est: ce que je veux, c’est du repos (struchtúr bréagscoilte).
• Diúltach: ce n’est pas moi qui…`
    });

    D('conjonctions-subordination', {
        uk: `Правила:
• З indicatif: parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• З subjonctif: bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Que замінює повторену сполучну: quand il pleut et que je suis fatigué…
Винятки:
• Après que — indicatif (хоча часто помилково subjonctif).
• Avant que, sans que — subjonctif, але з тим самим підметом — інфінітив (avant de partir).
• Parce que відповідає на pourquoi; puisque — вже відома причина; car — сурядний, не підрядний.`,
        en: `Rules:
• With the indicative: parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• With the subjunctive: bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Que replaces a repeated conjunction: quand il pleut et que je suis fatigué…
Exceptions:
• Après que takes the indicative (although the subjunctive is often used wrongly).
• Avant que, sans que — subjunctive, but with the same subject use the infinitive (avant de partir).
• Parce que answers pourquoi; puisque — a cause already known; car is coordinating, not subordinating.`,
        fr: `Règles:
• Avec le mode indicatif : parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• Avec le mode subjonctif : bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Que remplace une conjonction répétée : quand il pleut et que je suis fatigué…
Exceptions:
• Après que prend le mode indicatif (bien que le mode subjonctif soit souvent utilisé à tort).
• Avant que, sans que — mode subjonctif, mais avec le même sujet, utilisez l'infinitif (avant de partir).
• Parce que répond pourquoi; puisque — une cause déjà connue ; car coordonne et non subordonne.`,
        ru: `Правила:
• С изъявительным наклонением: parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• С сослагательным наклонением: bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Que заменяет повторяющийся союз: quand il pleut et que je suis fatigué…
Исключения:
• Après que принимает изъявительное наклонение (хотя сослагательное наклонение часто используется неправильно).
• Avant que, sans que — сослагательное наклонение, но с тем же подлежащим употребляется инфинитив (avant de partir).
• Parce que отвечает на pourquoi; puisque — причина уже известна; car координирует, а не подчиняет.`,
        es: `Reglas:
• Con el modo indicativo: parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• Con el modo subjuntivo: bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Que reemplaza una conjunción repetida: quand il pleut et que je suis fatigué…
Excepciones:
• Après que toma el modo indicativo (aunque el modo subjuntivo a menudo se usa incorrectamente).
• Avant que, sans que — modo subjuntivo, pero con el mismo sujeto usa el infinitivo (avant de partir).
• Parce que responde pourquoi; puisque: una causa ya conocida; car coordina, no subordina.`,
        zh: `规则:
• 直陈式：parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• 使用虚拟式：bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Que 替换重复连词：quand il pleut et que je suis fatigué...
例外:
• Après que 采用直陈式（尽管虚拟式经常被错误地使用）。
• Avant que, sans que — 虚拟式，但主语相同时使用不定式 (avant de partir)。
• Parce que 回答 pourquoi; puisque — 原因已知； car 是协调，而不是服从。`,
        ko: `규칙:
• 직설법: parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• 접속법 사용: bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Que는 반복 접속사를 대체합니다: quand il pleut et que je suis fatigué...
예외:
• Après que는 직설법을 사용합니다(단, 접속법은 종종 잘못 사용됩니다).
• Avant que, sans que — 접속법이지만 동일한 주어에는 부정사 (avant de partir)를 사용합니다.
• Parce que는 pourquoi; puisque에 답변합니다. 원인은 이미 알려져 있습니다. car는 종속이 아닌 조화를 이루고 있습니다.`,
        hi: `नियम:
• निश्चयार्थक विधि के साथ: parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• विधिलिंग के साथ: bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Que दोहराए जाने वाले समुच्चयबोधक की जगह आता है: quand il pleut et que je suis fatigué…
अपवाद:
• Après que के साथ निश्चयार्थक विधि आती है, यद्यपि प्रायः ग़लती से विधिलिंग लगाया जाता है।
• Avant que, sans que — विधिलिंग; लेकिन कर्ता समान हो तो अनंत रूप (avant de partir)।
• Parce que, pourquoi; puisque का उत्तर है — पहले से ज्ञात कारण; car समानाधिकरण समुच्चयबोधक है, अधीनस्थ नहीं।`,
        ga: `Rialacha:
• Leis an modh táscach: parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• Leis an modh foshuiteach: bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Tagann Que in áit cónaisc a athdhéanfaí: quand il pleut et que je suis fatigué…
Eisceachtaí:
• Glacann Après que an modh táscach (cé go n-úsáidtear an foshuiteach go mícheart go minic).
• Avant que, sans que — an foshuiteach; leis an ainmní céanna, úsáidtear an infinideach (avant de partir), áfach.
• Freagraíonn Parce que pourquoi; puisque — cúis atá ar eolas cheana; tá car comhordaitheach, ní fo-ordaitheach.`
    });

    D('connecteurs-logiques', {
        uk: `Правила:
• Протиставлення: mais, pourtant, cependant, toutefois, en revanche, au contraire.
• Причина: car, en effet, parce que; наслідок: donc, alors, par conséquent, c’est pourquoi.
• Порядок: d’abord, ensuite, puis, enfin; додавання: de plus, en outre, d’ailleurs.
• Зазвичай відокремлюються комою на початку речення.
Винятки:
• Mais не ставиться з pourtant у тому ж значенні одночасно.
• Donc може стояти всередині: je pense donc je suis.
• Or — «а між тим», «проте»: вводить нову обставину в міркування; це не «або».
• Car — сурядний сполучник: зазвичай стоїть між двома частинами речення, а не на його початку.`,
        en: `Rules:
• Contrast: mais, pourtant, cependant, toutefois, en revanche, au contraire.
• Cause: car, en effet, parce que; consequence: donc, alors, par conséquent, c’est pourquoi.
• Order: d’abord, ensuite, puis, enfin; addition: de plus, en outre, d’ailleurs.
• Usually set off by a comma at the start of a sentence.
Exceptions:
• Mais and pourtant are not used together with the same meaning.
• Donc may stand inside: je pense donc je suis.
• Or — "now/yet", introduces a new circumstance, not "or".
• Car is a coordinating conjunction: it normally sits between two clauses, not at the start of a sentence.`,
        fr: `Règles:
• Contraste : mais, pourtant, cependant, toutefois, en revanche, au contraire.
• Cause : car, en effet, parce que ; conséquence : donc, alors, par conséquent, c’est pourquoi.
• Commande : d’abord, ensuite, puis, enfin ; ajout : de plus, en outre, d’ailleurs.
• Généralement précédé d'une virgule au début d'une phrase.
Exceptions:
• Mais et pourtant ne sont pas utilisés ensemble avec la même signification.
• Donc peut se trouver à l'intérieur : je pense donc je suis.
• Or — "maintenant/encore", introduit une nouvelle circonstance, pas "ou".
• Car est une conjonction de coordination : elle se situe normalement entre deux propositions, et non au début d'une phrase.`,
        ru: `Правила:
• Контраст: mais, pourtant, cependant, toutefois, en revanche, au contraire.
• Причина: car, en effet, parce que; следствие: donc, alors, par conséquent, c’est pourquoi.
• Заказ: d’abord, ensuite, puis, enfin; дополнение: de plus, en outre, d’ailleurs.
• Обычно выделяется запятой в начале предложения.
Исключения:
• Mais и pourtant не используются вместе в одном и том же значении.
• Donc может стоять внутри: je pense donc je suis.
• Or — «сейчас/еще» вводит новое обстоятельство, а не «или».
• Car — сочинительный союз: обычно он находится между двумя предложениями, а не в начале предложения.`,
        es: `Reglas:
• Contraste: mais, pourtant, cependant, toutefois, en revanche, au contraire.
• Causa: car, en effet, parce que; consecuencia: donc, alors, par conséquent, c’est pourquoi.
• Pedido: d’abord, ensuite, puis, enfin; adición: de plus, en outre, d’ailleurs.
• Generalmente se pone una coma al comienzo de una oración.
Excepciones:
• Mais y pourtant no se usan juntos con el mismo significado.
• Donc puede estar dentro: je pense donc je suis.
• Or — "ahora/todavía", introduce una nueva circunstancia, no "o".
• Car es una conjunción coordinante: normalmente se encuentra entre dos cláusulas, no al comienzo de una oración.`,
        zh: `规则:
• 对比度：mais, pourtant, cependant, toutefois, en revanche, au contraire.
• 原因：car, en effet, parce que；结果：donc, alors, par conséquent, c’est pourquoi.
• 订单：d’abord, ensuite, puis, enfin；加法：de plus, en outre, d’ailleurs.
• 通常在句子开头用逗号分隔。
例外:
• Mais 和 pourtant 不一起使用具有相同的含义。
• Donc 可以站在里面：je pense donc je suis.
• Or — “现在/还”，引入新的情况，而不是“或”。
• Car 是并列连词：它通常位于两个分句之间，而不是位于句子的开头。`,
        ko: `규칙:
• 대비: mais, pourtant, cependant, toutefois, en revanche, au contraire.
• 원인: car, en effet, parce que; 결과: donc, alors, par conséquent, c’est pourquoi.
• 주문: d’abord, ensuite, puis, enfin; 추가: de plus, en outre, d’ailleurs.
• 대개 문장 시작 부분에 쉼표를 사용합니다.
예외:
• Mais와 pourtant는 같은 의미로 함께 사용되지 않습니다.
• Donc는 내부에 서 있을 수 있습니다: je pense donc je suis.
• Or — "현재/아직"은 "또는"이 아닌 새로운 상황을 소개합니다.
• Car는 등위 접속사입니다. 일반적으로 문장의 시작 부분이 아닌 두 절 사이에 위치합니다.`,
        hi: `नियम:
• विरोध: mais, pourtant, cependant, toutefois, en revanche, au contraire.
• कारण: car, en effet, parce que; परिणाम: donc, alors, par conséquent, c’est pourquoi.
• क्रम: d’abord, ensuite, puis, enfin; अतिरिक्त बात: de plus, en outre, d’ailleurs.
• वाक्य के आरंभ में प्रायः अल्पविराम से अलग किया जाता है।
अपवाद:
• Mais और pourtant एक ही अर्थ में साथ नहीं आते।
• Donc बीच में आ सकता है: je pense donc je suis.
• Or — «अब/फिर भी», नई परिस्थिति जोड़ता है; «या» नहीं।
• Car समानाधिकरण समुच्चयबोधक है; सामान्यतः दो उपवाक्यों के बीच आता है, वाक्य के आरंभ में नहीं।`,
        ga: `Rialacha:
• Codarsnacht: mais, pourtant, cependant, toutefois, en revanche, au contraire.
• Cúis: car, en effet, parce que; toradh: donc, alors, par conséquent, c’est pourquoi.
• Ord: d’abord, ensuite, puis, enfin; suimiú: de plus, en outre, d’ailleurs.
• De ghnáth, scartar le camóg é ag tús na habairte.
Eisceachtaí:
• Ní úsáidtear Mais agus pourtant le chéile leis an mbrí chéanna.
• Féadann Donc teacht i lár na habairte: je pense donc je suis.
• Or — «anois/fós», cuireann sé cúinse nua i láthair; ní chiallaíonn sé «nó».
• Is cónasc comhordaitheach é Car: de ghnáth bíonn sé idir dhá chlásal, ní ag tús abairte.`
    });

    D('proposition-relative', {
        uk: `Правила:
• Пояснює іменник; починається відносним займенником (qui, que, dont, où, lequel).
• Визначальна (без коми): l’homme qui parle est mon père; пояснювальна (у комах): Paul, qui parle, est mon père.
• Дієслово в relative з qui узгоджується з антецедентом.
• Іноді вимагає subjonctif (c’est le seul livre que je puisse lire).
Винятки:
• Qui не елідується, que — так (qu’il).
• Dont уже містить de (не кажуть « dont de »): le livre dont j’ai besoin.
• Où після іменника місця чи часу заміняє прийменник + lequel.`,
        en: `Rules:
• Qualifies a noun; opens with a relative pronoun (qui, que, dont, où, lequel).
• Defining (no commas): l’homme qui parle est mon père; non-defining (in commas): Paul, qui parle, est mon père.
• The verb of a qui-clause agrees with the antecedent.
• Sometimes requires the subjunctive (c’est le seul livre que je puisse lire).
Exceptions:
• Qui never elides, que does (qu’il).
• Dont already contains de (never « dont de »): le livre dont j’ai besoin.
• Où after a noun of place/time replaces preposition + lequel.`,
        fr: `Règles:
• Qualifie un nom ; s'ouvre avec un pronom relatif (qui, que, dont, où, lequel).
• Définition (sans virgules) : l’homme qui parle est mon père ; non définissant (entre virgules) : Paul, qui parle, est mon père.
• Le verbe d'une proposition qui est en accord avec l'antécédent.
• Nécessite parfois le mode subjonctif (c’est le seul livre que je puisse lire).
Exceptions:
• Qui n'échappe jamais, que fait (qu’il).
• Dont contient déjà de (jamais « dont de ») : le livre dont j’ai besoin.
• Où après un nom de lieu/heure remplace la préposition + lequel.`,
        ru: `Правила:
• Указывает существительное; открывается относительным местоимением (qui, que, dont, où, lequel).
• Определение (без запятых): l’homme qui parle est mon père; неопределяющее (в запятых): Paul, qui parle, est mon père.
• Глагол в предложении qui согласуется с антецедентом.
• Иногда требуется сослагательное наклонение (c’est le seul livre que je puisse lire).
Исключения:
• Qui никогда не ускользает, que ускользает от (qu’il).
• Dont уже содержит de (никогда не « dont de »): le livre dont j’ai besoin.
• Où после того, как существительное места/времени заменяет предлог + lequel.`,
        es: `Reglas:
• Califica un sustantivo; se abre con un pronombre relativo (qui, que, dont, où, lequel).
• Definición (sin comas): l’homme qui parle est mon père; no definitorio (entre comas): Paul, qui parle, est mon père.
• El verbo de una cláusula qui concuerda con el antecedente.
• A veces requiere el modo subjuntivo (c’est le seul livre que je puisse lire).
Excepciones:
• Qui nunca elide, que lo hace (qu’il).
• Dont ya contiene de (nunca « dont de »): le livre dont j’ai besoin.
• Où después de un sustantivo de lugar/tiempo reemplaza la preposición + lequel.`,
        zh: `规则:
• 限定名词；以关系代词 (qui, que, dont, où, lequel) 开头。
• 定义（无逗号）：l’homme qui parle est mon père;非定义（以逗号分隔）：Paul, qui parle, est mon père.
• qui 子句的动词与先行词一致。
• 有时需要虚拟式 (c’est le seul livre que je puisse lire)。
例外:
• Qui 永远不会省略，que 会省略 (qu’il)。
• Dont 已包含 de（绝不是 « dont de »）：le livre dont j’ai besoin.
• 地点/时间名词替换介词后的 Où + lequel.`,
        ko: `규칙:
• 명사를 한정합니다. 관계대명사 (qui, que, dont, où, lequel)로 시작됩니다.
• 정의(쉼표 없음): l’homme qui parle est mon père; 비정의(쉼표): Paul, qui parle, est mon père.
• qui 절의 동사가 선행사와 일치합니다.
• 접속법 (c’est le seul livre que je puisse lire)가 필요한 경우도 있습니다.
예외:
• Qui는 절대 제거되지 않으며, que는 (qu’il)를 제거합니다.
• Dont에는 이미 de가 포함되어 있습니다('dont de'는 사용하지 않음): le livre dont j’ai besoin.
• 장소/시간 명사 뒤의 Où가 전치사 + lequel.를 대체합니다`,
        hi: `नियम:
• संज्ञा की विशेषता बताता है; संबंधवाचक सर्वनाम से आरंभ होता है (qui, que, dont, où, lequel)।
• पहचान निर्धारित करने वाला (बिना अल्पविराम): l’homme qui parle est mon père; अतिरिक्त जानकारी वाला (अल्पविरामों में): Paul, qui parle, est mon père.
• qui वाले उपवाक्य की क्रिया पूर्ववर्ती संज्ञा के पुरुष-वचन के अनुसार होती है।
• कभी-कभी विधिलिंग आवश्यक होता है (c’est le seul livre que je puisse lire)।
अपवाद:
• Qui में कभी स्वर-लोप नहीं; que में होता है (qu’il)।
• Dont में de पहले से शामिल है («dont de» कभी नहीं): le livre dont j’ai besoin.
• स्थान/समय की संज्ञा के बाद Où, संबंधसूचक अव्यय + lequel. की जगह आता है।`,
        ga: `Rialacha:
• Cáilíonn sé ainmfhocal; tosaíonn sé le forainm coibhneasta (qui, que, dont, où, lequel).
• Sainmhínitheach (gan chamóga): l’homme qui parle est mon père; neamhshainmhínitheach (idir chamóga): Paul, qui parle, est mon père.
• Réitíonn briathar clásail a thosaíonn le qui leis an réamhtheachtaí.
• Éilítear an foshuiteach uaireanta (c’est le seul livre que je puisse lire).
Eisceachtaí:
• Ní dhéantar eiliú ar Qui riamh, ach déantar ar que (qu’il).
• Tá de san áireamh in Dont cheana (ní úsáidtear «dont de» riamh): le livre dont j’ai besoin.
• Tar éis ainmfhocail áite/ama, tagann Où in áit réamhfhocail + lequel.`
    });

    D('depuis-il-y-a-pendant', {
        uk: `Правила:
• Depuis + présent: дія триває досі: j’habite ici depuis deux ans.
• Il y a + період + минулий час: «тому»: il est parti il y a une heure.
• Pendant + період: тривалість (завершена або майбутня): j’ai dormi pendant dix heures.
• Dans + період: «через»: je pars dans deux jours.
• En + період: «за» (скільки часу зайняло): j’ai fini en une heure.
Винятки:
• Depuis + imparfait для тривалої дії в минулому: il travaillait depuis une heure quand…
• Ça fait … que / il y a … que + présent — те саме, що depuis: ça fait deux ans que j’habite ici.
• Pendant часто опускається: j’ai dormi dix heures.
• Depuis + заперечення в passé composé: je ne l’ai pas vu depuis mardi.`,
        en: `Rules:
• Depuis + présent: the action is still going: j’habite ici depuis deux ans.
• Il y a + period + past tense: "ago": il est parti il y a une heure.
• Pendant + period: duration (finished or future): j’ai dormi pendant dix heures.
• Dans + period: "in": je pars dans deux jours.
• En + period: "within" (how long it took): j’ai fini en une heure.
Exceptions:
• Depuis + imparfait for a continuing past action: il travaillait depuis une heure quand…
• Ça fait … que / il y a … que + présent — same as depuis: ça fait deux ans que j’habite ici.
• Pendant is often omitted: j’ai dormi dix heures.
• Depuis with a negative passé composé: je ne l’ai pas vu depuis mardi.`,
        fr: `Règles:
• Depuis + présent : l'action continue : j’habite ici depuis deux ans.
• Il y a + point + passé : "il y a" : il est parti il y a une heure.
• Pendant + période : durée (terminée ou future) : j’ai dormi pendant dix heures.
• Dans + point : "dans" : je pars dans deux jours.
• En + point : "dans" (combien de temps cela a pris) : j’ai fini en une heure.
Exceptions:
• Depuis + imparfait pour une action passée continue : il travaillait depuis une heure quand…
• Ça fait … que / il y a … que + présent — identique à depuis : ça fait deux ans que j’habite ici.
• Pendant est souvent omis : j’ai dormi dix heures.
• Depuis avec un passé composé négatif : je ne l’ai pas vu depuis mardi.`,
        ru: `Правила:
• Depuis + présent: действие еще продолжается: j’habite ici depuis deux ans.
• Il y a + точка + прошедшее время: "назад": il est parti il y a une heure.
• Pendant + период: продолжительность (завершенная или будущая): j’ai dormi pendant dix heures.
• Dans + точка: "в": je pars dans deux jours.
• En + точка: "в пределах" (сколько времени это заняло): j’ai fini en une heure.
Исключения:
• Depuis + imparfait для продолжающегося прошлого действия: il travaillait depuis une heure quand…
• Ça fait … que / il y a … que + présent — то же, что depuis: ça fait deux ans que j’habite ici.
• Pendant часто опускается: j’ai dormi dix heures.
• Depuis с отрицательным passé composé: je ne l’ai pas vu depuis mardi.`,
        es: `Reglas:
• Depuis + présent: la acción aún continúa: j’habite ici depuis deux ans.
• Il y a + punto + tiempo pasado: "ago": il est parti il y a une heure.
• Pendant + periodo: duración (terminado o futuro): j’ai dormi pendant dix heures.
• Dans + punto: "en": je pars dans deux jours.
• En + periodo: "dentro" (cuánto tiempo tardó): j’ai fini en une heure.
Excepciones:
• Depuis + imparfait para una acción pasada continua: il travaillait depuis une heure quand…
• Ça fait … que / il y a … que + présent — igual que depuis: ça fait deux ans que j’habite ici.
• Pendant a menudo se omite: j’ai dormi dix heures.
• Depuis con un passé composé negativo: je ne l’ai pas vu depuis mardi.`,
        zh: `规则:
• Depuis + présent：操作仍在进行中：j’habite ici depuis deux ans.
• Il y a + 句号 + 过去时：“ago”：il est parti il y a une heure.
• Pendant + period：持续时间（已完成或将来）：j’ai dormi pendant dix heures.
• Dans + 句点：“in”：je pars dans deux jours.
• En + 句点：“以内”（花了多长时间）：j’ai fini en une heure.
例外:
• Depuis + imparfait 表示过去的连续动作：il travaillait depuis une heure quand…
• Ça fait … que / il y a … que + présent — 与 depuis 相同：ça fait deux ans que j’habite ici.
• Pendant 经常被省略：j’ai dormi dix heures.
• Depuis 带有负 passé composé：je ne l’ai pas vu depuis mardi.`,
        ko: `규칙:
• Depuis + présent: 작업이 계속 진행 중입니다: j’habite ici depuis deux ans.
• Il y a + 마침표 + 과거형: "전": il est parti il y a une heure.
• Pendant + 기간: 기간(완료 또는 향후): j’ai dormi pendant dix heures.
• Dans + 마침표: "in": je pars dans deux jours.
• En + 기간: "within"(걸린 시간): j’ai fini en une heure.
예외:
• 지속적인 과거 행동에 대한 Depuis + imparfait: il travaillait depuis une heure quand…
• Ça fait … que / il y a … que + présent — depuis와 동일: ça fait deux ans que j’habite ici.
• Pendant는 종종 생략됩니다: j’ai dormi dix heures.
• 음수 passé composé가 있는 Depuis: je ne l’ai pas vu depuis mardi.`,
        hi: `नियम:
• Depuis + présent: कार्य अब भी जारी है: j’habite ici depuis deux ans.
• Il y a + अवधि + भूतकाल: «पहले»: il est parti il y a une heure.
• Pendant + अवधि: बीती या भविष्य की अवधि: j’ai dormi pendant dix heures.
• Dans + अवधि: «के बाद»: je pars dans deux jours.
• En + अवधि: «इतने समय में» (लगा हुआ समय): j’ai fini en une heure.
अपवाद:
• भूतकाल में जारी कार्य के लिए Depuis + imparfait: il travaillait depuis une heure quand…
• Ça fait … que / il y a … que + présent का अर्थ depuis जैसा है: ça fait deux ans que j’habite ici.
• Pendant प्रायः छूट जाता है: j’ai dormi dix heures.
• नकारात्मक passé composé के साथ Depuis: je ne l’ai pas vu depuis mardi.`,
        ga: `Rialacha:
• Depuis + présent: tá an gníomh ar siúl fós: j’habite ici depuis deux ans.
• Il y a + tréimhse + aimsir chaite: «ó shin»: il est parti il y a une heure.
• Pendant + tréimhse: fad ama (críochnaithe nó sa todhchaí): j’ai dormi pendant dix heures.
• Dans + tréimhse: «i gceann»: je pars dans deux jours.
• En + tréimhse: «laistigh de» (an t-am a thóg sé): j’ai fini en une heure.
Eisceachtaí:
• Depuis + imparfait le gníomh leanúnach san am atá caite: il travaillait depuis une heure quand…
• Tá an bhrí chéanna ag Ça fait … que / il y a … que + présent agus depuis: ça fait deux ans que j’habite ici.
• Is minic a fhágtar Pendant ar lár: j’ai dormi dix heures.
• Depuis le passé composé diúltach: je ne l’ai pas vu depuis mardi.`
    });

    D('marqueurs-temps', {
        uk: `Правила:
• Минуле: hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• Теперішнє: maintenant, en ce moment, aujourd’hui, actuellement → présent.
• Майбутнє: demain, bientôt, la semaine prochaine, dans… → futur.
• Частота: toujours, souvent, parfois, rarement, jamais.
• Послідовність: d’abord, ensuite, puis, enfin, soudain.
Винятки:
• Déjà, encore, toujours, ne … plus — залежно від контексту мають різні значення (encore = ще/знову).
• Soudain/tout à coup — passé composé, а не imparfait (подія, а не фон).
• Aujourd’hui може відноситись до минулого в тексті («сьогодні» оповідача).`,
        en: `Rules:
• Past: hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• Present: maintenant, en ce moment, aujourd’hui, actuellement → présent.
• Future: demain, bientôt, la semaine prochaine, dans… → futur.
• Frequency: toujours, souvent, parfois, rarement, jamais.
• Sequence: d’abord, ensuite, puis, enfin, soudain.
Exceptions:
• Déjà, encore, toujours, ne … plus mean different things depending on context (encore = still/again).
• Soudain/tout à coup — passé composé, not imparfait (an event, not background).
• Aujourd’hui can refer to the past inside a text (the narrator’s "today").`,
        fr: `Règles:
• Passé : hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• Présent : maintenant, en ce moment, aujourd’hui, actuellement → présent.
• Futur : demain, bientôt, la semaine prochaine, dans… → futur.
• Fréquence : toujours, souvent, parfois, rarement, jamais.
• Séquence : d’abord, ensuite, puis, enfin, soudain.
Exceptions:
• Déjà, encore, toujours, ne … plus signifie différentes choses selon le contexte (encore = encore/encore).
• Soudain/tout à coup — passé composé, pas imparfait (un événement, pas un arrière-plan).
• Aujourd’hui peut faire référence au passé à l'intérieur d'un texte (le "aujourd'hui" du narrateur).`,
        ru: `Правила:
• Прошлое: hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• Настоящее время: maintenant, en ce moment, aujourd’hui, actuellement → présent.
• Будущее: demain, bientôt, la semaine prochaine, dans… → futur.
• Частота: toujours, souvent, parfois, rarement, jamais.
• Последовательность: d’abord, ensuite, puis, enfin, soudain.
Исключения:
• Déjà, encore, toujours, ne … plus означает разные вещи в зависимости от контекста (encore = еще/снова).
• Soudain/tout à coup — passé composé, а не imparfait (событие, а не фон).
• Aujourd’hui может относиться к прошлому внутри текста («сегодня» рассказчика).`,
        es: `Reglas:
• Pasado: hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• Presente: maintenant, en ce moment, aujourd’hui, actuellement → présent.
• Futuro: demain, bientôt, la semaine prochaine, dans… → futur.
• Frecuencia: toujours, souvent, parfois, rarement, jamais.
• Secuencia: d’abord, ensuite, puis, enfin, soudain.
Excepciones:
• Déjà, encore, toujours, ne … plus significa cosas diferentes según el contexto (encore = todavía/otra vez).
• Soudain/tout à coup — passé composé, no imparfait (un evento, no un fondo).
• Aujourd’hui puede referirse al pasado dentro de un texto (el "hoy" del narrador).`,
        zh: `规则:
• 过去：hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• 当前：maintenant, en ce moment, aujourd’hui, actuellement → présent.
• 未来：demain, bientôt, la semaine prochaine, dans… → futur.
• 频率：toujours, souvent, parfois, rarement, jamais.
• 序列：d’abord, ensuite, puis, enfin, soudain.
例外:
• Déjà, encore, toujours, ne … plus 根据上下文的不同有不同的含义（encore = 仍然/再次）。
• Soudain/tout à coup — passé composé，而不是 imparfait（事件，不是背景）。
• Aujourd’hui 可以指文本中的过去（叙述者的“今天”）。`,
        ko: `규칙:
• 과거: hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• 현재: maintenant, en ce moment, aujourd’hui, actuellement → présent.
• 미래: demain, bientôt, la semaine prochaine, dans… → futur.
• 주파수: toujours, souvent, parfois, rarement, jamais.
• 순서: d’abord, ensuite, puis, enfin, soudain.
예외:
• Déjà, encore, toujours, ne … plus는 상황에 따라 다른 의미를 갖습니다(encore = 여전히/다시).
• imparfait가 아닌 Soudain/tout à coup — passé composé(배경이 아닌 이벤트)
• Aujourd’hui는 텍스트 내에서 과거(화자의 '오늘')를 가리킬 수 있습니다.`,
        hi: `नियम:
• भूतकाल: hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• वर्तमान: maintenant, en ce moment, aujourd’hui, actuellement → présent.
• भविष्य: demain, bientôt, la semaine prochaine, dans… → futur.
• आवृत्ति: toujours, souvent, parfois, rarement, jamais.
• क्रम: d’abord, ensuite, puis, enfin, soudain.
अपवाद:
• Déjà, encore, toujours, ne … plus का अर्थ संदर्भ से बदलता है (encore = अब भी/फिर)।
• Soudain/tout à coup — passé composé, imparfait नहीं (घटना, पृष्ठभूमि नहीं)।
• Aujourd’hui पाठ के भीतर भूतकाल को भी दर्शा सकता है — कथावाचक का «आज»।`,
        ga: `Rialacha:
• Am atá caite: hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• Am i láthair: maintenant, en ce moment, aujourd’hui, actuellement → présent.
• Todhchaí: demain, bientôt, la semaine prochaine, dans… → futur.
• Minicíocht: toujours, souvent, parfois, rarement, jamais.
• Seicheamh: d’abord, ensuite, puis, enfin, soudain.
Eisceachtaí:
• Athraíonn brí Déjà, encore, toujours, ne … plus de réir an chomhthéacs (encore = fós/arís).
• Soudain/tout à coup — passé composé, seachas imparfait (eachtra, ní cúlra).
• Féadann Aujourd’hui tagairt don am atá caite laistigh de théacs — «inniu» an scéalaí.`
    });

    D('prepositions-lieu', {
        uk: `Правила:
• À + місто (à Paris), en + країна жін. роду (en France, en Italie), au + чол. (au Canada, au Japon), aux + мн. (aux États-Unis).
• Dans + закрите місце (dans la boîte), sur, sous, devant, derrière, entre, chez + особа (chez moi).
• De/du/des/d’ — звідки: je viens de France, du Canada, des États-Unis, de Paris.
Винятки:
• Країни на -e жіночого роду; винятки: le Mexique, le Mozambique, le Cambodge — чоловічі.
• Острови: à Cuba, à Malte, en Corse, à Tahiti.
• Перед голосним: en Iran, en Israël, en Afghanistan (навіть чол. рід).
• Chez для осіб і закладів: chez le médecin.`,
        en: `Rules:
• À + city (à Paris), en + feminine country (en France, en Italie), au + masculine (au Canada, au Japon), aux + plural (aux États-Unis).
• Dans + enclosed place (dans la boîte), sur, sous, devant, derrière, entre, chez + person (chez moi).
• De/du/des/d’ — from: je viens de France, du Canada, des États-Unis, de Paris.
Exceptions:
• Countries in -e are feminine; exceptions: le Mexique, le Mozambique, le Cambodge — masculine.
• Islands: à Cuba, à Malte, en Corse, à Tahiti.
• Before a vowel: en Iran, en Israël, en Afghanistan (even masculine).
• Chez for persons and shops: chez le médecin.`,
        fr: `Règles:
• À + ville (à Paris), en + pays féminin (en France, en Italie), au + masculin (au Canada, au Japon), aux + pluriel (aux États-Unis).
• Dans + lieu clos (dans la boîte), sur, sous, devant, derrière, entre, chez + personne (chez moi).
• De/du/des/d’ — de : je viens de France, du Canada, des États-Unis, de Paris.
Exceptions:
• Les pays de -e sont féminins ; exceptions : le Mexique, le Mozambique, le Cambodge — masculin.
• Îles : à Cuba, à Malte, en Corse, à Tahiti.
• Devant une voyelle : en Iran, en Israël, en Afghanistan (même masculin).
• Chez pour les particuliers et les commerces : chez le médecin.`,
        ru: `Правила:
• À + город (à Paris), en + страна женского рода (en France, en Italie), au + мужской род (au Canada, au Japon), aux + множественное число (aux États-Unis).
• Dans + закрытое место (dans la boîte), sur, sous, devant, derrière, entre, chez + человек (chez moi).
• De/du/des/d’ — от: je viens de France, du Canada, des États-Unis, de Paris.
Исключения:
• Страны в -e женские; исключения: le Mexique, le Mozambique, le Cambodge — мужской род.
• Острова: à Cuba, à Malte, en Corse, à Tahiti.
• Перед гласной: en Iran, en Israël, en Afghanistan (даже мужского рода).
• Chez для людей и магазинов: chez le médecin.`,
        es: `Reglas:
• À + ciudad (à Paris), en + femenino país (en France, en Italie), au + masculino (au Canada, au Japon), aux + plural (aux États-Unis).
• Dans + lugar cerrado (dans la boîte), sur, sous, devant, derrière, entre, chez + persona (chez moi).
• De/du/des/d’ — de: je viens de France, du Canada, des États-Unis, de Paris.
Excepciones:
• Los países en -e son femeninos; excepciones: le Mexique, le Mozambique, le Cambodge — masculino.
• Islas: à Cuba, à Malte, en Corse, à Tahiti.
• Antes de una vocal: en Iran, en Israël, en Afghanistan (incluso masculina).
• Chez para personas y comercios: chez le médecin.`,
        zh: `规则:
• À + 城市 (à Paris)、en + 阴性国家 (en France, en Italie)、au + 阳性 (au Canada, au Japon)、aux + 复数 (aux États-Unis)。
• Dans + 封闭地点 (dans la boîte)、sur, sous, devant, derrière, entre, chez + 人 (chez moi)。
• De/du/des/d’ — 来自：je viens de France, du Canada, des États-Unis, de Paris.
例外:
• -e 中的国家是阴性国家；例外：le Mexique, le Mozambique, le Cambodge — 男性。
• 岛屿：à Cuba, à Malte, en Corse, à Tahiti.
• 元音前：en Iran, en Israël, en Afghanistan（甚至是阳性）。
• Chez 适用于个人和商店：chez le médecin.`,
        ko: `규칙:
• À + 도시 (à Paris), en + 여성형 국가 (en France, en Italie), au + 남성형 (au Canada, au Japon), aux + 복수형 (aux États-Unis).
• Dans + 밀폐된 장소 (dans la boîte), sur, sous, devant, derrière, entre, chez + 사람 (chez moi).
• De/du/des/d’ — 보낸 사람: je viens de France, du Canada, des États-Unis, de Paris.
예외:
• -e에 속한 국가는 여성적입니다. 예외: le Mexique, le Mozambique, le Cambodge — 남성형.
• 섬: à Cuba, à Malte, en Corse, à Tahiti.
• 모음 앞: en Iran, en Israël, en Afghanistan(남성이라도).
• 사람과 상점을 위한 Chez: chez le médecin.`,
        hi: `नियम:
• À + शहर (à Paris), en + स्त्रीलिंग देश (en France, en Italie), au + पुल्लिंग देश (au Canada, au Japon), aux + बहुवचन देश (aux États-Unis)।
• Dans + बंद स्थान (dans la boîte), sur, sous, devant, derrière, entre, chez + व्यक्ति (chez moi)।
• De/du/des/d’ — «से»: je viens de France, du Canada, des États-Unis, de Paris.
अपवाद:
• -e पर समाप्त देशों के नाम स्त्रीलिंग; अपवाद: le Mexique, le Mozambique, le Cambodge — पुल्लिंग।
• द्वीप: à Cuba, à Malte, en Corse, à Tahiti.
• स्वर से पहले en Iran, en Israël, en Afghanistan, पुल्लिंग में भी।
• व्यक्तियों और दुकानों के लिए Chez: chez le médecin.`,
        ga: `Rialacha:
• À + cathair (à Paris), en + tír bhaininscneach (en France, en Italie), au + firinscneach (au Canada, au Japon), aux + iolra (aux États-Unis).
• Dans + áit iata (dans la boîte), sur, sous, devant, derrière, entre, chez + duine (chez moi).
• De/du/des/d’ — «ó»: je viens de France, du Canada, des États-Unis, de Paris.
Eisceachtaí:
• Tá tíortha dar críoch -e baininscneach; eisceachtaí: le Mexique, le Mozambique, le Cambodge — firinscneach.
• Oileáin: à Cuba, à Malte, en Corse, à Tahiti.
• Roimh ghuta: en Iran, en Israël, en Afghanistan, fiú má tá sé firinscneach.
• Chez le daoine agus siopaí: chez le médecin.`
    });

    D('a-de-en', {
        uk: `Правила:
• À: напрямок/місце (aller à l’école), час (à midi), належність (ce livre est à moi), після penser à, répondre à, commencer à, aider à, apprendre à.
• De: походження (venir de), приналежність (la maison de Paul), після parler de, avoir besoin de, finir de, essayer de, décider de, oublier de.
• En: матеріал (en bois), мова (en français), транспорт (en train; але à pied, à vélo, à moto), місяць/рік/пора (en mai, en 2020, en été).
Винятки:
• У транспорті: en voiture, en train, en avion, en bus, але à vélo, à pied, à cheval, à moto.
• Пори року: en été, en automne, en hiver, але au printemps.
• Дієслова з двома значеннями: penser à (думати про), penser de (мати думку).
• Після прийменника займенник: penser à lui, parler de lui; але y/en для речей.`,
        en: `Rules:
• À: direction/place (aller à l’école), time (à midi), possession (ce livre est à moi), after penser à, répondre à, commencer à, aider à, apprendre à.
• De: origin (venir de), belonging (la maison de Paul), after parler de, avoir besoin de, finir de, essayer de, décider de, oublier de.
• En: material (en bois), language (en français), transport (en train; but à pied, à vélo, à moto), month/year/season (en mai, en 2020, en été).
Exceptions:
• Transport: en voiture, en train, en avion, en bus, but à vélo, à pied, à cheval, à moto.
• Seasons: en été, en automne, en hiver, but au printemps.
• Verbs with two meanings: penser à (to think about), penser de (to have an opinion on).
• After a preposition use a stressed pronoun: penser à lui, parler de lui; but y/en for things.`,
        fr: `Règles:
• À : direction/lieu (aller à l’école), heure (à midi), possession (ce livre est à moi), après penser à, répondre à, commencer à, aider à, apprendre à.
• De : origine (venir de), appartenant à (la maison de Paul), après parler de, avoir besoin de, finir de, essayer de, décider de, oublier de.
• En : matière (en bois), langue (en français), transport (en train ; mais à pied, à vélo, à moto), mois/année/saison (en mai, en 2020, en été).
Exceptions:
• Transport : en voiture, en train, en avion, en bus, mais à vélo, à pied, à cheval, à moto.
• Saisons : en été, en automne, en hiver, mais au printemps.
• Verbes à deux sens : penser à (réfléchir), penser de (avoir une opinion sur).
• Après une préposition, utilisez un pronom accentué : penser à lui, parler de lui ; mais y/en pour les choses.`,
        ru: `Правила:
• À: направление/место (aller à l’école), время (à midi), владение (ce livre est à moi), после penser à, répondre à, commencer à, aider à, apprendre à.
• De: происхождение (venir de), принадлежащее (la maison de Paul), после parler de, avoir besoin de, finir de, essayer de, décider de, oublier de.
• En: материал (en bois), язык (en français), транспорт (en train; но à pied, à vélo, à moto), месяц/год/сезон (en mai, en 2020, en été).
Исключения:
• Транспорт: en voiture, en train, en avion, en bus, но à vélo, à pied, à cheval, à moto.
• Времена года: en été, en automne, en hiver, но au printemps.
• Глаголы с двумя значениями: penser à (думать), penser de (иметь мнение).
• После предлога используйте ударное местоимение: penser à lui, parler de lui; но y/en для вещей.`,
        es: `Reglas:
• À: dirección/lugar (aller à l’école), hora (à midi), posesión (ce livre est à moi), después de penser à, répondre à, commencer à, aider à, apprendre à.
• De: origen (venir de), perteneciente a (la maison de Paul), posterior a parler de, avoir besoin de, finir de, essayer de, décider de, oublier de.
• En: material (en bois), idioma (en français), transporte (en train; pero à pied, à vélo, à moto), mes/año/temporada (en mai, en 2020, en été).
Excepciones:
• Transporte: en voiture, en train, en avion, en bus, pero à vélo, à pied, à cheval, à moto.
• Temporadas: en été, en automne, en hiver, pero au printemps.
• Verbos con dos significados: penser à (pensar), penser de (opinar).
• Después de una preposición, utilice un pronombre acentuado: penser à lui, parler de lui; pero y/en para las cosas.`,
        zh: `规则:
• À：方向/地点(aller à l’école)，时间(à midi)，控球权(ce livre est à moi)，之后penser à, répondre à, commencer à, aider à, apprendre à.
• De：起源(venir de)，属于(la maison de Paul)，在parler de, avoir besoin de, finir de, essayer de, décider de, oublier de.之后
• En：材料 (en bois)，语言 (en français)，运输（en train；但 à pied, à vélo, à moto），月/年/季节 (en mai, en 2020, en été)。
例外:
• 交通：en voiture, en train, en avion, en bus，但 à vélo, à pied, à cheval, à moto.
• 季节：en été, en automne, en hiver，但 au printemps.
• 有两个含义的动词：penser à（思考），penser de（有意见）。
• 介词后使用重读代词：penser à lui, parler de lui；但 y/en 的事情。`,
        ko: `규칙:
• À: 방향/장소 (aller à l’école), 시간 (à midi), 소유 (ce livre est à moi), penser à, répondre à, commencer à, aider à, apprendre à. 이후
• De: 원본 (venir de), (la maison de Paul)에 속함, parler de, avoir besoin de, finir de, essayer de, décider de, oublier de. 이후
• En: 재료 (en bois), 언어 (en français), 운송(en train, 그러나 à pied, à vélo, à moto), 월/연도/계절 (en mai, en 2020, en été).
예외:
• 운송수단: en voiture, en train, en avion, en bus, 그러나 à vélo, à pied, à cheval, à moto.
• 시즌: en été, en automne, en hiver, 단 au printemps.
• 두 가지 의미를 갖는 동사: penser à(생각하다), penser de(의견을 갖다)
• 전치사 뒤에 강세 대명사 사용: penser à lui, parler de lui; 하지만 y/en는 중요합니다.`,
        hi: `नियम:
• À: दिशा/स्थान (aller à l’école), समय (à midi), स्वामित्व (ce livre est à moi); इन क्रियाओं के बाद: penser à, répondre à, commencer à, aider à, apprendre à.
• De: उत्पत्ति (venir de), संबंध (la maison de Paul); इन क्रियाओं के बाद: parler de, avoir besoin de, finir de, essayer de, décider de, oublier de.
• En: सामग्री (en bois), भाषा (en français), यातायात (en train; लेकिन à pied, à vélo, à moto), महीना/वर्ष/ऋतु (en mai, en 2020, en été)।
अपवाद:
• यातायात: en voiture, en train, en avion, en bus, लेकिन à vélo, à pied, à cheval, à moto.
• ऋतुएँ: en été, en automne, en hiver, लेकिन au printemps.
• दो अर्थ वाली क्रियाएँ: penser à (के बारे में सोचना), penser de (पर राय होना)।
• संबंधसूचक अव्यय के बाद बलयुक्त सर्वनाम: penser à lui, parler de lui; लेकिन वस्तुओं के लिए y/en।`,
        ga: `Rialacha:
• À: treo/áit (aller à l’école), am (à midi), seilbh (ce livre est à moi); tar éis penser à, répondre à, commencer à, aider à, apprendre à.
• De: bunús (venir de), muintearas (la maison de Paul); tar éis parler de, avoir besoin de, finir de, essayer de, décider de, oublier de.
• En: ábhar (en bois), teanga (en français), iompar (en train; ach à pied, à vélo, à moto), mí/bliain/séasúr (en mai, en 2020, en été).
Eisceachtaí:
• Iompar: en voiture, en train, en avion, en bus, ach à vélo, à pied, à cheval, à moto.
• Séasúir: en été, en automne, en hiver, ach au printemps.
• Briathra le dhá bhrí: penser à (smaoineamh ar), penser de (tuairim a bheith faoi).
• Tar éis réamhfhocail, úsáidtear forainm treise: penser à lui, parler de lui; le rudaí, áfach, y/en.`
    });

    D('expressions-cause-but', {
        uk: `Правила:
• Причина: parce que, car, puisque, comme, à cause de (негативна), grâce à (позитивна), en raison de.
• Мета: pour + інфінітив, afin de + інфінітив, pour que/afin que + subjonctif.
• Наслідок: donc, alors, si bien que, tellement … que, tant … que, au point de.
Винятки:
• Pour que/afin que — subjonctif; pour/afin de — інфінітив, коли підмет той самий.
• Si bien que + indicatif (факт), de sorte que + subjonctif (мета) або indicatif (наслідок).
• À cause de ≠ grâce à (негатив/позитив); en raison de нейтральне.`,
        en: `Rules:
• Cause: parce que, car, puisque, comme, à cause de (negative), grâce à (positive), en raison de.
• Purpose: pour + infinitive, afin de + infinitive, pour que/afin que + subjunctive.
• Result: donc, alors, si bien que, tellement … que, tant … que, au point de.
Exceptions:
• Pour que/afin que — subjunctive; pour/afin de — infinitive when the subject is the same.
• Si bien que + indicative (fact), de sorte que + subjunctive (purpose) or indicative (result).
• À cause de ≠ grâce à (negative/positive); en raison de is neutral.`,
        fr: `Règles:
• Cause : parce que, car, puisque, comme, à cause de (négatif), grâce à (positif), en raison de.
• Objectif : pour + infinitif, afin de + infinitif, pour que/afin que + mode subjonctif.
• Résultat : donc, alors, si bien que, tellement … que, tant … que, au point de.
Exceptions:
• Pour que/afin que — mode subjonctif ; pour/afin de — infinitif lorsque le sujet est le même.
• Si bien que + mode indicatif (fait), de sorte que + mode subjonctif (objectif) ou mode indicatif (résultat).
• À cause de ≠ grâce à (négatif/positif) ; en raison de est neutre.`,
        ru: `Правила:
• Причина: parce que, car, puisque, comme, à cause de (отрицательный), grâce à (положительный), en raison de.
• Назначение: pour + инфинитив, afin de + инфинитив, pour que/afin que + сослагательное наклонение.
• Результат: donc, alors, si bien que, tellement … que, tant … que, au point de.
Исключения:
• Pour que/afin que — сослагательное наклонение; pour/afin de — инфинитив, если подлежащее одно и то же.
• Si bien que + изъявительное наклонение (факт), de sorte que + сослагательное наклонение (цель) или изъявительное наклонение (результат).
• À cause de ≠ grâce à (отрицательный/положительный); en raison de нейтральен.`,
        es: `Reglas:
• Causa: parce que, car, puisque, comme, à cause de (negativo), grâce à (positivo), en raison de.
• Propósito: pour + infinitivo, afin de + infinitivo, pour que/afin que + modo subjuntivo.
• Resultado: donc, alors, si bien que, tellement … que, tant … que, au point de.
Excepciones:
• Pour que/afin que — modo subjuntivo; pour/afin de — infinitivo cuando el sujeto es el mismo.
• Si bien que + modo indicativo (hecho), de sorte que + modo subjuntivo (propósito) o modo indicativo (resultado).
• À cause de ≠ grâce à (negativo/positivo); en raison de es neutral.`,
        zh: `规则:
• 原因：parce que, car, puisque, comme, à cause de（负）、grâce à（正）、en raison de.
• 用途：pour + 不定式、afin de + 不定式、pour que/afin que + 虚拟式。
• 结果：donc, alors, si bien que, tellement … que, tant … que, au point de.
例外:
• Pour que/afin que — 虚拟式； pour/afin de — 主语相同时的不定式。
• Si bien que + 直陈式（事实），de sorte que + 虚拟式（目的）或直陈式（结果）。
• À cause de ≠ grâce à（负/正）； en raison de 为中性。`,
        ko: `규칙:
• 원인: parce que, car, puisque, comme, à cause de(부정), grâce à(긍정), en raison de.
• 용도: pour + 부정사, afin de + 부정사, pour que/afin que + 접속법.
• 결과: donc, alors, si bien que, tellement … que, tant … que, au point de.
예외:
• Pour que/afin que — 접속법; pour/afin de — 주어가 같을 때 부정사.
• Si bien que + 직설법(사실), de sorte que + 접속법(목적) 또는 직설법(결과).
• À cause de ≠ grâce à (부정/긍정); en raison de는 중립적입니다.`,
        hi: `नियम:
• कारण: parce que, car, puisque, comme, à cause de (नकारात्मक), grâce à (सकारात्मक), en raison de.
• उद्देश्य: pour + अनंत रूप, afin de + अनंत रूप, pour que/afin que + विधिलिंग।
• परिणाम: donc, alors, si bien que, tellement … que, tant … que, au point de.
अपवाद:
• Pour que/afin que — विधिलिंग; pour/afin de — कर्ता समान हो तो अनंत रूप।
• Si bien que + निश्चयार्थक विधि (तथ्य), de sorte que + विधिलिंग (उद्देश्य) या निश्चयार्थक विधि (परिणाम)।
• À cause de ≠ grâce à (नकारात्मक/सकारात्मक); en raison de तटस्थ है।`,
        ga: `Rialacha:
• Cúis: parce que, car, puisque, comme, à cause de (diúltach), grâce à (dearfach), en raison de.
• Cuspóir: pour + infinideach, afin de + infinideach, pour que/afin que + foshuiteach.
• Toradh: donc, alors, si bien que, tellement … que, tant … que, au point de.
Eisceachtaí:
• Pour que/afin que — foshuiteach; pour/afin de — infinideach nuair is ionann an t-ainmní.
• Si bien que + táscach (fíric), de sorte que + foshuiteach (cuspóir) nó táscach (toradh).
• À cause de ≠ grâce à (diúltach/dearfach); tá en raison de neodrach.`
    });

    D('ne-que-restriction', {
        uk: `Правила:
• Ne … que = «тільки»: il ne mange que du pain.
• Ne стоїть перед дієсловом, que — перед обмеженим словом (не відразу після дієслова обов’язково): je n’ai que dix euros.
• Артикль зберігається (не змінюється на de), бо це не заперечення.
Винятки:
• Seulement/uniquement — синоніми, без ne.
• У складених часах que — перед обмеженим елементом, не одразу після допоміжного дієслова: il n’a mangé que du pain.
• Ne … pas que — «не тільки»: il n’y a pas que moi.
• Не плутати з ne … pas: ne … que ствердне за змістом.`,
        en: `Rules:
• Ne … que = "only": il ne mange que du pain.
• Ne goes before the verb, que before the restricted element: je n’ai que dix euros.
• The article is kept (it does not become de) because it is not a negation.
Exceptions:
• Seulement/uniquement — synonyms, without ne.
• In compound tenses que precedes the restricted element, not right after the auxiliary: il n’a mangé que du pain.
• Ne … pas que — "not only": il n’y a pas que moi.
• Not to be confused with ne … pas: ne … que is affirmative in meaning.`,
        fr: `Règles:
• Ne … que = "uniquement" : il ne mange que du pain.
• Ne précède le verbe, que avant l'élément restreint : je n’ai que dix euros.
• L'article est conservé (il ne devient pas de) car ce n'est pas une négation.
Exceptions:
• Seulement/uniquement — synonymes, sans ne.
• Dans les temps composés, que précède l'élément restreint, et non juste après le verbe auxiliaire : il n’a mangé que du pain.
• Ne … pas que — "pas seulement" : il n’y a pas que moi.
• À ne pas confondre avec ne … pas : ne … que a un sens affirmatif.`,
        ru: `Правила:
• Ne … que = "только": il ne mange que du pain.
• Ne ставится перед глаголом, que перед ограниченным элементом: je n’ai que dix euros.
• Артикль сохраняется (он не становится de), поскольку он не является отрицанием.
Исключения:
• Seulement/uniquement — синонимы, без ne.
• В сложных временах que предшествует ограниченному элементу, а не сразу после вспомогательного глагола: il n’a mangé que du pain.
• Ne … pas que — «не только»: il n’y a pas que moi.
• Не путать с ne … pas: ne … que имеет утвердительное значение.`,
        es: `Reglas:
• Ne … que = "sólo": il ne mange que du pain.
• Ne va antes del verbo, que antes del elemento restringido: je n’ai que dix euros.
• El artículo se mantiene (no pasa a ser de) porque no es una negación.
Excepciones:
• Seulement/uniquement — sinónimos, sin ne.
• En tiempos compuestos, que precede al elemento restringido, no justo después del verbo auxiliar: il n’a mangé que du pain.
• Ne … pas que — "no sólo": il n’y a pas que moi.
• No debe confundirse con ne … pas: ne … que tiene un significado afirmativo.`,
        zh: `规则:
• Ne … que =“仅”：il ne mange que du pain.
• Ne 位于动词之前，que 位于受限制元素之前：je n’ai que dix euros.
• 该文章被保留（它不会变成 de），因为它不是否定。
例外:
• Seulement/uniquement — 同义词，不含 ne.
• 在复合时态中，que 位于受限制元素之前，而不是位于助动词之后：il n’a mangé que du pain.
• Ne … pas que —“不仅”：il n’y a pas que moi.
• 不要与 ne … pas 混淆：ne … que 的含义是肯定的。`,
        ko: `규칙:
• Ne … que = "만": il ne mange que du pain.
• Ne는 동사 앞에 오고, que는 제한된 요소 앞에 옵니다: je n’ai que dix euros.
• 부정이 아니기 때문에 관사가 유지됩니다(de가 되지 않음).
예외:
• Seulement/uniquement — ne.가 없는 동의어
• 복합 시제에서 que는 조동사 바로 뒤가 아니라 제한된 요소 앞에 옵니다: il n’a mangé que du pain.
• Ne … pas que — "뿐만 아니라": il n’y a pas que moi.
• ne … pas와 혼동하지 마세요. ne … que는 의미상 긍정적입니다.`,
        hi: `नियम:
• Ne … que = «केवल»: il ne mange que du pain.
• Ne क्रिया से पहले, que सीमित किए गए अंश से पहले: je n’ai que dix euros.
• उपपद बना रहता है; de नहीं बनता, क्योंकि यह नकार नहीं है।
अपवाद:
• Seulement/uniquement — समानार्थी, ne. के बिना।
• संयुक्त कालों में que सीमित अंश से पहले आता है, सहायक क्रिया के तुरंत बाद नहीं: il n’a mangé que du pain.
• Ne … pas que — «केवल… नहीं»: il n’y a pas que moi.
• ne … pas से भ्रमित न करें: ne … que का अर्थ सकारात्मक है।`,
        ga: `Rialacha:
• Ne … que = «amháin»: il ne mange que du pain.
• Tagann Ne roimh an mbriathar, que roimh an ngné srianta: je n’ai que dix euros.
• Coinnítear an t-alt; ní athraíonn sé go de mar ní diúltú é.
Eisceachtaí:
• Seulement/uniquement — comhchiallaigh, gan ne.
• In aimsirí comhshuite, tagann que roimh an ngné srianta, ní díreach tar éis an bhriathair chúnta: il n’a mangé que du pain.
• Ne … pas que — «ní… amháin»: il n’y a pas que moi.
• Ná measc le ne … pas é: tá brí dhearfach le ne … que.`
    });


    // ---- Таблиці відмінювання: особа · число · рід. Рядок таблиці — «| клітинка | клітинка |», перший рядок — заголовок. ----
    // The rows carry the Ukrainian notes; the English text gets them in English (whole bilingual cells first, then the short notes).
    const EN_NOTES = [
        ['COD перед дієсловом / object BEFORE the verb', 'COD BEFORE the verb'], ['рід і число / gender and number', 'gender and number'],
        ['закінчення / ending', 'ending'], ['приклад / example', 'example'],
        ['чол. одн. / masc. sg.', 'masc. sg.'], ['жін. одн. / fem. sg.', 'fem. sg.'], ['чол. мн. / masc. pl.', 'masc. pl.'], ['жін. мн. / fem. pl.', 'fem. pl.'],
        ['чол. одн.', 'masc. sg.'], ['жін. одн.', 'fem. sg.'], ['чол. мн.', 'masc. pl.'], ['жін. мн.', 'fem. pl.'],
        ['(рід не впливає)', '(gender does not matter)'], ['(рід і число!)', '(gender and number!)'], ['(з être)', '(with être)'],
        ['інфінітив', 'infinitive'], ['(ч.)', '(m.)'], ['(ж.)', '(f.)'], ['(одн.)', '(sg.)'], ['(мн.)', '(pl.)']];
    const enNotes = cell => EN_NOTES.reduce((text, [uk, en]) => text.split(uk).join(en), cell);
    const TBL = (id, rows) => {
        if (!fr[id]) throw new Error('details table for unknown topic ' + id);
        const block = rr => rr.map(r => '| ' + r.join(' | ') + ' |').join('\n');
        fr[id].uk += '\nВідмінювання (особа, число, рід):\n' + block(rows).replace('PERSON', 'Особа');
        fr[id].en += '\nConjugation (person, number, gender):\n' + block(rows.map(r => r.map(enNotes))).replace('PERSON', 'Person');
    };
    TBL('present', [
        ['PERSON', 'parler', 'finir', 'vendre', 'être', 'avoir', 'aller', 'faire'],
        ['je', 'parle', 'finis', 'vends', 'suis', 'ai', 'vais', 'fais'],
        ['tu', 'parles', 'finis', 'vends', 'es', 'as', 'vas', 'fais'],
        ['il / elle / on', 'parle', 'finit', 'vend', 'est', 'a', 'va', 'fait'],
        ['nous', 'parlons', 'finissons', 'vendons', 'sommes', 'avons', 'allons', 'faisons'],
        ['vous', 'parlez', 'finissez', 'vendez', 'êtes', 'avez', 'allez', 'faites'],
        ['ils / elles', 'parlent', 'finissent', 'vendent', 'sont', 'ont', 'vont', 'font']]);
    TBL('passe-compose', [
        ['PERSON', 'avoir + parlé (рід не впливає)', 'être + allé (рід і число!)'],
        ['je', 'j’ai parlé', 'je suis allé (ч.) / allée (ж.)'],
        ['tu', 'tu as parlé', 'tu es allé / allée'],
        ['il', 'il a parlé', 'il est allé'],
        ['elle', 'elle a parlé', 'elle est allée'],
        ['nous', 'nous avons parlé', 'nous sommes allés (ч.) / allées (ж.)'],
        ['vous', 'vous avez parlé', 'vous êtes allé(e) (одн.) · allé(e)s (мн.)'],
        ['ils', 'ils ont parlé', 'ils sont allés'],
        ['elles', 'elles ont parlé', 'elles sont allées']]);
    TBL('imparfait', [
        ['PERSON', 'parler', 'finir', 'être', 'avoir', 'aller'],
        ['je', 'parlais', 'finissais', 'étais', 'avais', 'allais'],
        ['tu', 'parlais', 'finissais', 'étais', 'avais', 'allais'],
        ['il / elle / on', 'parlait', 'finissait', 'était', 'avait', 'allait'],
        ['nous', 'parlions', 'finissions', 'étions', 'avions', 'allions'],
        ['vous', 'parliez', 'finissiez', 'étiez', 'aviez', 'alliez'],
        ['ils / elles', 'parlaient', 'finissaient', 'étaient', 'avaient', 'allaient']]);
    TBL('plus-que-parfait', [
        ['PERSON', 'avoir (imparfait) + parlé', 'être (imparfait) + allé'],
        ['je', 'j’avais parlé', 'j’étais allé (ч.) / allée (ж.)'],
        ['tu', 'tu avais parlé', 'tu étais allé / allée'],
        ['il / elle', 'il / elle avait parlé', 'il était allé · elle était allée'],
        ['nous', 'nous avions parlé', 'nous étions allés / allées'],
        ['vous', 'vous aviez parlé', 'vous étiez allé(e)(s)'],
        ['ils / elles', 'ils / elles avaient parlé', 'ils étaient allés · elles étaient allées']]);
    TBL('passe-simple', [
        ['PERSON', 'parler', 'finir', 'être', 'avoir'],
        ['je', 'parlai', 'finis', 'fus', 'eus'],
        ['tu', 'parlas', 'finis', 'fus', 'eus'],
        ['il / elle', 'parla', 'finit', 'fut', 'eut'],
        ['nous', 'parlâmes', 'finîmes', 'fûmes', 'eûmes'],
        ['vous', 'parlâtes', 'finîtes', 'fûtes', 'eûtes'],
        ['ils / elles', 'parlèrent', 'finirent', 'furent', 'eurent']]);
    TBL('futur-simple', [
        ['PERSON', 'parler', 'finir', 'être', 'avoir', 'aller', 'faire'],
        ['je', 'parlerai', 'finirai', 'serai', 'aurai', 'irai', 'ferai'],
        ['tu', 'parleras', 'finiras', 'seras', 'auras', 'iras', 'feras'],
        ['il / elle / on', 'parlera', 'finira', 'sera', 'aura', 'ira', 'fera'],
        ['nous', 'parlerons', 'finirons', 'serons', 'aurons', 'irons', 'ferons'],
        ['vous', 'parlerez', 'finirez', 'serez', 'aurez', 'irez', 'ferez'],
        ['ils / elles', 'parleront', 'finiront', 'seront', 'auront', 'iront', 'feront']]);
    TBL('futur-anterieur', [
        ['PERSON', 'avoir (futur) + parlé', 'être (futur) + allé'],
        ['je', 'j’aurai parlé', 'je serai allé (ч.) / allée (ж.)'],
        ['tu', 'tu auras parlé', 'tu seras allé / allée'],
        ['il / elle', 'il / elle aura parlé', 'il sera allé · elle sera allée'],
        ['nous', 'nous aurons parlé', 'nous serons allés / allées'],
        ['vous', 'vous aurez parlé', 'vous serez allé(e)(s)'],
        ['ils / elles', 'ils / elles auront parlé', 'ils seront allés · elles seront allées']]);
    TBL('futur-proche', [
        ['PERSON', 'aller (présent) + інфінітив'],
        ['je', 'je vais parler'], ['tu', 'tu vas parler'], ['il / elle / on', 'il va parler'],
        ['nous', 'nous allons parler'], ['vous', 'vous allez parler'], ['ils / elles', 'ils vont parler']]);
    TBL('passe-recent', [
        ['PERSON', 'venir de (présent) + інфінітив'],
        ['je', 'je viens de parler'], ['tu', 'tu viens de parler'], ['il / elle / on', 'il vient de parler'],
        ['nous', 'nous venons de parler'], ['vous', 'vous venez de parler'], ['ils / elles', 'ils viennent de parler']]);
    TBL('conditionnel-present', [
        ['PERSON', 'parler', 'finir', 'être', 'avoir', 'aller', 'pouvoir'],
        ['je', 'parlerais', 'finirais', 'serais', 'aurais', 'irais', 'pourrais'],
        ['tu', 'parlerais', 'finirais', 'serais', 'aurais', 'irais', 'pourrais'],
        ['il / elle / on', 'parlerait', 'finirait', 'serait', 'aurait', 'irait', 'pourrait'],
        ['nous', 'parlerions', 'finirions', 'serions', 'aurions', 'irions', 'pourrions'],
        ['vous', 'parleriez', 'finiriez', 'seriez', 'auriez', 'iriez', 'pourriez'],
        ['ils / elles', 'parleraient', 'finiraient', 'seraient', 'auraient', 'iraient', 'pourraient']]);
    TBL('conditionnel-passe', [
        ['PERSON', 'avoir (conditionnel) + voulu', 'être (conditionnel) + venu'],
        ['je', 'j’aurais voulu', 'je serais venu (ч.) / venue (ж.)'],
        ['tu', 'tu aurais voulu', 'tu serais venu / venue'],
        ['il / elle', 'il / elle aurait voulu', 'il serait venu · elle serait venue'],
        ['nous', 'nous aurions voulu', 'nous serions venus / venues'],
        ['vous', 'vous auriez voulu', 'vous seriez venu(e)(s)'],
        ['ils / elles', 'ils / elles auraient voulu', 'ils seraient venus · elles seraient venues']]);
    TBL('subjonctif-present', [
        ['PERSON', 'parler', 'finir', 'être', 'avoir', 'aller', 'faire'],
        ['que je', 'parle', 'finisse', 'sois', 'aie', 'aille', 'fasse'],
        ['que tu', 'parles', 'finisses', 'sois', 'aies', 'ailles', 'fasses'],
        ['qu’il / qu’elle', 'parle', 'finisse', 'soit', 'ait', 'aille', 'fasse'],
        ['que nous', 'parlions', 'finissions', 'soyons', 'ayons', 'allions', 'fassions'],
        ['que vous', 'parliez', 'finissiez', 'soyez', 'ayez', 'alliez', 'fassiez'],
        ['qu’ils / qu’elles', 'parlent', 'finissent', 'soient', 'aient', 'aillent', 'fassent']]);
    TBL('subjonctif-passe', [
        ['PERSON', 'avoir (subjonctif) + fini', 'être (subjonctif) + parti'],
        ['que je', 'j’aie fini', 'je sois parti (ч.) / partie (ж.)'],
        ['que tu', 'tu aies fini', 'tu sois parti / partie'],
        ['qu’il / qu’elle', 'il / elle ait fini', 'il soit parti · elle soit partie'],
        ['que nous', 'nous ayons fini', 'nous soyons partis / parties'],
        ['que vous', 'vous ayez fini', 'vous soyez parti(e)(s)'],
        ['qu’ils / qu’elles', 'ils / elles aient fini', 'ils soient partis · elles soient parties']]);
    TBL('imperatif', [
        ['PERSON', 'parler', 'finir', 'être', 'avoir', 'aller'],
        ['tu', 'parle !', 'finis !', 'sois !', 'aie !', 'va !'],
        ['nous', 'parlons !', 'finissons !', 'soyons !', 'ayons !', 'allons !'],
        ['vous', 'parlez !', 'finissez !', 'soyez !', 'ayez !', 'allez !']]);
    TBL('voix-passive', [
        ['рід і число / gender and number', 'présent', 'passé composé', 'futur simple'],
        ['чол. одн. / masc. sg.', 'le livre est écrit', 'le livre a été écrit', 'le livre sera écrit'],
        ['жін. одн. / fem. sg.', 'la lettre est écrite', 'la lettre a été écrite', 'la lettre sera écrite'],
        ['чол. мн. / masc. pl.', 'les livres sont écrits', 'les livres ont été écrits', 'les livres seront écrits'],
        ['жін. мн. / fem. pl.', 'les lettres sont écrites', 'les lettres ont été écrites', 'les lettres seront écrites']]);
    TBL('verbes-pronominaux', [
        ['PERSON', 'présent (se laver)', 'passé composé (з être)'],
        ['je', 'je me lave', 'je me suis lavé (ч.) / lavée (ж.)'],
        ['tu', 'tu te laves', 'tu t’es lavé / lavée'],
        ['il', 'il se lave', 'il s’est lavé'],
        ['elle', 'elle se lave', 'elle s’est lavée'],
        ['nous', 'nous nous lavons', 'nous nous sommes lavés / lavées'],
        ['vous', 'vous vous lavez', 'vous vous êtes lavé(e)(s)'],
        ['ils', 'ils se lavent', 'ils se sont lavés'],
        ['elles', 'elles se lavent', 'elles se sont lavées']]);
    TBL('accord-participe-etre', [
        ['рід і число / gender and number', 'закінчення / ending', 'приклад / example'],
        ['чол. одн.', '—', 'il est parti'], ['жін. одн.', '+e', 'elle est partie'],
        ['чол. мн.', '+s', 'ils sont partis'], ['жін. мн.', '+es', 'elles sont parties']]);
    TBL('accord-participe-avoir', [
        ['COD перед дієсловом / object BEFORE the verb', 'participe', 'приклад / example'],
        ['чол. одн.', 'mangé', 'le gâteau que j’ai mangé'], ['жін. одн.', 'mangée', 'la pomme que j’ai mangée'],
        ['чол. мн.', 'mangés', 'les gâteaux que j’ai mangés'], ['жін. мн.', 'mangées', 'les pommes que j’ai mangées']]);
    TBL('accord-adjectif', [
        ['чол. одн.', 'жін. одн.', 'чол. мн.', 'жін. мн.'],
        ['petit', 'petite', 'petits', 'petites'], ['grand', 'grande', 'grands', 'grandes'],
        ['bon', 'bonne', 'bons', 'bonnes'], ['heureux', 'heureuse', 'heureux', 'heureuses'],
        ['blanc', 'blanche', 'blancs', 'blanches'], ['beau (bel)', 'belle', 'beaux', 'belles'],
        ['nouveau (nouvel)', 'nouvelle', 'nouveaux', 'nouvelles']]);

    const store = window.GRAMMAR_RULE_DETAILS || (window.GRAMMAR_RULE_DETAILS = {});
    store.fr = fr;
})();
