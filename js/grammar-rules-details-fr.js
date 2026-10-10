/* grammar-rules-details-fr.js — розгорнуті пояснення правил і ВИНЯТКІВ для тем французького каталогу
 * (js/grammar-rules-data-fr.js). Ключ — id теми; текст uk/en. Рядок, що закінчується на «:», — підзаголовок
 * («Правила:», «Винятки:»), рядок з «• » — пункт списку. Показується в панелі «Правила» під короткою теорією
 * й передається AI як опорний матеріал для «Розібрати за теорією». Класичний <script src>. */
(function () {
    const fr = {};
    const D = (id, uk, en) => { fr[id] = { uk, en }; };

    D('present',
`Правила:
• Дієслова на -er (група 1, їх більшість): je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• Дієслова на -ir (finir): je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• Дієслова на -re (vendre): je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• Présent передає дію зараз, звичку, загальну істину, а з розкладом — і близьке майбутнє (le train part à neuf heures).
Винятки:
• Неправильні дієслова: être (je suis, nous sommes, ils sont), avoir (j’ai, nous avons, ils ont), aller (je vais, ils vont), faire (vous faites, ils font), dire (vous dites), venir, pouvoir, vouloir, savoir тощо — форми треба вчити.
• Орфографічні зміни в -er: manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• У tu-формі -er дієслів завжди -es (tu parles), але в наказовому способі -s відпадає (parle !).`,
`Rules:
• -er verbs (group 1, the majority): je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.
• -ir verbs (finir): je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent.
• -re verbs (vendre): je vends, tu vends, il vend, nous vendons, vous vendez, ils vendent.
• The présent expresses an action now, a habit, a general truth, and with a timetable also the near future (le train part à neuf heures).
Exceptions:
• Irregular verbs: être (je suis, nous sommes, ils sont), avoir (j’ai, nous avons, ils ont), aller (je vais, ils vont), faire (vous faites, ils font), dire (vous dites), venir, pouvoir, vouloir, savoir etc. — the forms must be learned.
• Spelling changes in -er verbs: manger → nous mangeons, commencer → nous commençons, appeler → j’appelle, acheter → j’achète, payer → je paie/je paye.
• -er verbs take -es in the tu-form but drop the -s in the imperative (parle !).`);

    D('passe-compose',
`Правила:
• Утворення: avoir (présent) + participe passé: j’ai parlé, tu as fini, il a vendu.
• З être — дієслова руху й стану (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, devenir, retourner) і ВСІ зворотні дієслова: elle est allée, nous nous sommes levés.
• Participe passé: -er → -é, -ir → -i, -re → -u (parlé, fini, vendu).
• Заперечення охоплює допоміжне: je n’ai pas parlé.
Винятки:
• Неправильні participes: avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• Деякі дієслова руху беруть avoir, коли мають прямий додаток: j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier (але: elle est sortie).
• Узгодження participe: з être — з підметом (elles sont parties); з avoir — лише з COD перед дієсловом (les lettres qu’il a écrites).`,
`Rules:
• Formation: avoir (present) + past participle: j’ai parlé, tu as fini, il a vendu.
• With être — verbs of motion and state (aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, devenir, retourner) and ALL reflexive verbs: elle est allée, nous nous sommes levés.
• Participles: -er → -é, -ir → -i, -re → -u (parlé, fini, vendu).
• The negation wraps the auxiliary: je n’ai pas parlé.
Exceptions:
• Irregular participles: avoir → eu, être → été, faire → fait, prendre → pris, voir → vu, mettre → mis, écrire → écrit, ouvrir → ouvert, venir → venu.
• Some motion verbs take avoir when they have a direct object: j’ai sorti la voiture, il a monté les valises, elle a descendu l’escalier (but: elle est sortie).
• Agreement: with être the participle agrees with the subject (elles sont parties); with avoir only with a direct object placed BEFORE the verb (les lettres qu’il a écrites).`);

    D('imparfait',
`Правила:
• Основа — форма nous у présent без -ons; закінчення: -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais).
• Вживається для опису, фону, звички й тривалої дії в минулому; з passé composé утворює «фон + подія» (il pleuvait quand je suis sorti).
• Вирази: toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
Винятки:
• Єдине неправильне дієслово — être: j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.
• Дієслова на -ger/-cer: nous mangions (але je mangeais), nous commencions (але je commençais) — для збереження вимови.
• Дієслова на -ier: у nous/vous два i (nous étudiions, vous riiez).
• Не плутайте з conditionnel: закінчення схожі, але в conditionnel є -r- перед ними.`,
`Rules:
• Stem = the nous-form of the présent without -ons; endings: -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → je parlais).
• Used for description, background, habit and continuing past actions; with the passé composé it forms "background + event" (il pleuvait quand je suis sorti).
• Typical words: toujours, souvent, d’habitude, chaque jour, autrefois, pendant que.
Exceptions:
• The only irregular stem is être: j’étais, tu étais, il était, nous étions, vous étiez, ils étaient.
• Verbs in -ger/-cer: nous mangions (but je mangeais), nous commencions (but je commençais) — to keep the pronunciation.
• Verbs in -ier: two i’s in nous/vous (nous étudiions, vous riiez).
• Do not confuse with the conditional: the endings are similar, but the conditional has an -r- before them.`);

    D('plus-que-parfait',
`Правила:
• Утворення: avoir/être в imparfait + participe passé: j’avais fini, elle était partie, nous nous étions levés.
• Позначає дію, що сталася ДО іншої минулої дії або до моменту в минулому.
• Вибір допоміжного й узгодження participe — як у passé composé.
Винятки:
• У розповіді часто замінюється passé composé, коли послідовність ясна з контексту.
• Після si в нереальній умові про минуле — plus-que-parfait (si j’avais su…), але у головній частині — conditionnel passé.`,
`Rules:
• Formation: avoir/être in the imparfait + past participle: j’avais fini, elle était partie, nous nous étions levés.
• Marks an action that happened BEFORE another past action or a moment in the past.
• Choice of auxiliary and participle agreement as in the passé composé.
Exceptions:
• In narration it is often replaced by the passé composé when the order is clear from context.
• After si in an unreal past condition — plus-que-parfait (si j’avais su…), but the main clause takes the past conditional.`);

    D('passe-simple',
`Правила:
• Лише в літературі, історичних текстах і казках; у мові — passé composé.
• -er: il parla, ils parlèrent; -ir/-re: il finit, ils finirent, il vendit, ils vendirent.
• Позначає завершені події в розповіді (ouvrit la porte, entra).
Винятки:
• Дуже неправильні основи: être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• На практиці читачеві треба впізнавати саме 3-тю особу (il/elle/ils/elles).`,
`Rules:
• Only in literature, historical texts and tales; in speech the passé composé is used.
• -er: il parla, ils parlèrent; -ir/-re: il finit, ils finirent, il vendit, ils vendirent.
• Marks completed events in narration (ouvrit la porte, entra).
Exceptions:
• Strongly irregular stems: être → il fut, ils furent; avoir → il eut; faire → il fit; venir/tenir → il vint, ils vinrent, il tint; voir → il vit; dire → il dit; prendre → il prit.
• In practice a reader mostly needs to recognise the 3rd person (il/elle/ils/elles).`);

    D('futur-simple',
`Правила:
• Інфінітив (у -re без -e) + -ai, -as, -a, -ons, -ez, -ont: je parlerai, nous finirons, il vendra.
• Вживається для майбутньої дії, прогнозів і ввічливих наказів (tu feras attention).
• Після quand/lorsque/dès que, якщо головне в futur, підрядне також у futur (quand tu arriveras, je partirai) — на відміну від української.
Винятки (особливі основи):
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• Після si — не futur, а présent (si tu viens, nous partirons).`,
`Rules:
• Infinitive (-re loses its -e) + -ai, -as, -a, -ons, -ez, -ont: je parlerai, nous finirons, il vendra.
• Used for future actions, predictions and polite orders (tu feras attention).
• After quand/lorsque/dès que, if the main clause is future, the subordinate clause is future too (quand tu arriveras, je partirai) — unlike English.
Exceptions (irregular stems):
• être → je serai; avoir → j’aurai; aller → j’irai; faire → je ferai; pouvoir → je pourrai; vouloir → je voudrai; savoir → je saurai; voir → je verrai; venir → je viendrai; envoyer → j’enverrai; devoir → je devrai.
• After si — not the future but the présent (si tu viens, nous partirons).`);

    D('futur-anterieur',
`Правила:
• Утворення: avoir/être у futur simple + participe passé: j’aurai fini, elle sera partie.
• Означає дію, завершену ДО іншої майбутньої дії або моменту (quand tu arriveras, j’aurai fini).
• Може виражати припущення: il aura oublié (мабуть, забув).
Винятки:
• Вибір avoir/être і узгодження — як у passé composé.
• Після si так не вживається: si tu as fini…, а не si tu auras fini.`,
`Rules:
• Formation: avoir/être in the futur simple + past participle: j’aurai fini, elle sera partie.
• An action completed BEFORE another future action or moment (quand tu arriveras, j’aurai fini).
• It can express a supposition: il aura oublié (he must have forgotten).
Exceptions:
• Choice of avoir/être and agreement as in the passé composé.
• Not used after si: si tu as fini…, not si tu auras fini.`);

    D('futur-proche',
`Правила:
• Aller (présent) + інфінітив: je vais partir, il va pleuvoir, nous allons manger.
• Для близьких, запланованих подій і прогнозів за очевидними ознаками; у розмові часто замінює futur simple.
• Заперечення — навколо aller: je ne vais pas partir.
Винятки:
• Не плутати з aller як повноцінним дієсловом руху (je vais à Paris).
• З дієсловом aller сам futur proche зазвичай не утворюють (краще j’irai ou je vais aller).`,
`Rules:
• Aller (present) + infinitive: je vais partir, il va pleuvoir, nous allons manger.
• For imminent or planned events and predictions based on evidence; in speech it often replaces the futur simple.
• Negation wraps aller: je ne vais pas partir.
Exceptions:
• Do not confuse with aller as a full verb of motion (je vais à Paris).
• With aller itself the futur proche is usually avoided (prefer j’irai or je vais aller).`);

    D('passe-recent',
`Правила:
• Venir de (présent) + інфінітив: il vient d’arriver, nous venons de manger.
• Для дії, яка відбулася щойно; в minulому — venait de + інфінітив (il venait de partir).
Винятки:
• Venir de + іменник/місце означає «приходити з» (je viens de Paris) — це не passé récent.
• Заперечення зазвичай не вживається; кажуть il n’est pas encore arrivé.`,
`Rules:
• Venir de (present) + infinitive: il vient d’arriver, nous venons de manger.
• For an action that has just happened; in the past — venait de + infinitive (il venait de partir).
Exceptions:
• Venir de + noun/place means "to come from" (je viens de Paris) — not the passé récent.
• Rarely negated; one says il n’est pas encore arrivé instead.`);

    D('en-train-de',
`Правила:
• Être (будь-який час) + en train de + інфінітив: je suis en train de lire, ils étaient en train de manger.
• Підкреслює, що дія ТРИВАЄ саме зараз (або тривала в певний момент).
Винятки:
• Не вживається з дієсловами стану й сприйняття (savoir, aimer, vouloir, voir): не кажуть « je suis en train de savoir ».
• Для звичного, повторюваного нічого не підкреслює — тоді простий présent.`,
`Rules:
• Être (any tense) + en train de + infinitive: je suis en train de lire, ils étaient en train de manger.
• Stresses that the action is IN PROGRESS right now (or was at a given moment).
Exceptions:
• Not used with state and perception verbs (savoir, aimer, vouloir, voir): you do not say « je suis en train de savoir ».
• Not for habits — use the plain présent.`);

    D('conditionnel-present',
`Правила:
• Основа futur simple + закінчення imparfait: je parlerais, tu finirais, il serait, nous irions.
• Вживається для ввічливих прохань (je voudrais un café), порад (tu devrais), здогадів і нереальної умови (si j’avais le temps, je voyagerais).
• Після si — imparfait, а в головному реченні conditionnel présent.
Винятки:
• Ті самі особливі основи, що й у futur: être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• Після si ніколи не вживається conditionnel (si j’avais…, а не si j’aurais…).
• Для непідтвердженої новини в пресі (le ministre aurait démissionné — нібито).`,
`Rules:
• Futur stem + imparfait endings: je parlerais, tu finirais, il serait, nous irions.
• Used for polite requests (je voudrais un café), advice (tu devrais), conjecture and unreal conditions (si j’avais le temps, je voyagerais).
• After si — imparfait, with the conditional in the main clause.
Exceptions:
• Same irregular stems as the future: être → serais, avoir → aurais, aller → irais, faire → ferais, pouvoir → pourrais, vouloir → voudrais, savoir → saurais, venir → viendrais.
• Never the conditional right after si (si j’avais…, not si j’aurais…).
• In the press for unconfirmed news (le ministre aurait démissionné — allegedly).`);

    D('conditionnel-passe',
`Правила:
• Утворення: avoir/être у conditionnel présent + participe passé: j’aurais voulu, il serait venu, elles se seraient levées.
• Нездійснена умова в минулому: si + plus-que-parfait → conditionnel passé (si j’avais su, je serais venu).
• Жаль і докір: tu aurais dû me prévenir; невпевнена інформація в пресі.
Винятки:
• Вибір avoir/être й узгодження participe — як у passé composé.
• Devoir/pouvoir/vouloir у conditionnel passé + інфінітив: j’aurais pu venir, il aurait dû partir.`,
`Rules:
• Formation: avoir/être in the present conditional + past participle: j’aurais voulu, il serait venu, elles se seraient levées.
• Unfulfilled past condition: si + plus-que-parfait → past conditional (si j’avais su, je serais venu).
• Regret and reproach: tu aurais dû me prévenir; unverified information in the press.
Exceptions:
• Auxiliary choice and participle agreement as in the passé composé.
• Devoir/pouvoir/vouloir in the past conditional + infinitive: j’aurais pu venir, il aurait dû partir.`);

    D('hypothese-si',
`Правила:
• Реальна умова: si + présent → futur / présent / impératif (si tu viens, nous partirons).
• Нереальна (теперішнє): si + imparfait → conditionnel présent (si j’étais riche, j’achèterais…).
• Нездійснена в минулому: si + plus-que-parfait → conditionnel passé (si j’avais su, je serais venu).
• Si може стояти на початку або в середині речення; перед il/ils — s’ (s’il pleut).
Винятки:
• Після si ніколи не ставиться futur чи conditionnel (si tu viendras — помилка).
• Si = «так» у відповіді на заперечне питання (tu ne viens pas ? — Si !) і si = «настільки» (si grand) — це не умова.
• Si у непрямому питанні (je me demande s’il vient) — «чи».`,
`Rules:
• Real condition: si + présent → futur / présent / imperative (si tu viens, nous partirons).
• Unreal (present): si + imparfait → present conditional (si j’étais riche, j’achèterais…).
• Unfulfilled (past): si + plus-que-parfait → past conditional (si j’avais su, je serais venu).
• Si may start or sit inside the sentence; before il/ils — s’ (s’il pleut).
Exceptions:
• Never futur or conditional right after si (si tu viendras is wrong).
• Si = "yes" answering a negative question (tu ne viens pas ? — Si !) and si = "so" (si grand) are not conditions.
• Si in an indirect question (je me demande s’il vient) means "whether".`);

    D('subjonctif-present',
`Правила:
• Утворення: que + основа ils (présent) + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle).
• Вживається після: необхідності (il faut que), бажання/наказу (vouloir que, exiger que), емоцій (être content que, regretter que), сумніву (douter que, il se peut que), а також сполучників bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• Якщо підмет головного й підрядного ТОЙ САМИЙ, вживають інфінітив: je veux partir (не je veux que je parte).
Винятки:
• Неправильні: être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• У nous/vous збігається з imparfait (que nous parlions).
• Після penser/croire/espérer у ствердженні — indicatif, а в запереченні чи питанні (je ne pense pas que) — subjonctif.
• Après que (після того як) вживають indicatif, хоча багато хто помилково вживає subjonctif.`,
`Rules:
• Formation: que + ils-stem (présent) + -e, -es, -e, -ions, -iez, -ent (qu’ils parlent → que je parle).
• Used after: necessity (il faut que), wish/order (vouloir que, exiger que), emotion (être content que, regretter que), doubt (douter que, il se peut que), and the conjunctions bien que, pour que, avant que, afin que, à moins que, jusqu’à ce que.
• If the subject of both clauses is the SAME, use the infinitive: je veux partir (not je veux que je parte).
Exceptions:
• Irregular: être → que je sois, qu’il soit; avoir → que j’aie, qu’il ait; aller → que j’aille; faire → que je fasse; pouvoir → que je puisse; savoir → que je sache; vouloir → que je veuille.
• In nous/vous it equals the imparfait (que nous parlions).
• After penser/croire/espérer in the affirmative — indicative; in the negative or a question (je ne pense pas que) — subjunctive.
• Après que takes the indicative, although many wrongly use the subjunctive.`);

    D('subjonctif-passe',
`Правила:
• Утворення: avoir/être у subjonctif présent + participe passé: que j’aie fini, qu’elle soit partie.
• Позначає дію, ЗАВЕРШЕНУ до дії головного речення, після тих самих тригерів, що й subjonctif présent (je suis content que tu sois venu).
Винятки:
• Вибір допоміжного й узгодження participe — як у passé composé.
• Якщо дії одночасні або наступні — subjonctif présent (je suis content que tu viennes).`,
`Rules:
• Formation: avoir/être in the present subjunctive + past participle: que j’aie fini, qu’elle soit partie.
• Marks an action COMPLETED before the main clause, after the same triggers as the present subjunctive (je suis content que tu sois venu).
Exceptions:
• Auxiliary choice and participle agreement as in the passé composé.
• If the actions are simultaneous or later — present subjunctive (je suis content que tu viennes).`);

    D('imperatif',
`Правила:
• Три форми — tu, nous, vous без підмета: parle ! parlons ! parlez !
• У tu-формі -er дієслів (і aller, ouvrir тощо) відпадає -s: parle, va, ouvre — але перед y/en повертається: vas-y, parles-en.
• Заперечення — ne … pas навколо дієслова: ne parle pas ! Займенники — ПІСЛЯ ствердного дієслова через дефіс (donne-le-moi), а в запереченні — перед ним (ne me le donne pas).
Винятки:
• Особливі форми: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez (ввічливо).
• Me/te → moi/toi після дієслова (lève-toi, donne-moi).`,
`Rules:
• Three forms — tu, nous, vous without a subject: parle ! parlons ! parlez !
• The tu-form of -er verbs (and aller, ouvrir etc.) drops the -s: parle, va, ouvre — but it returns before y/en: vas-y, parles-en.
• Negation — ne … pas around the verb: ne parle pas ! Pronouns FOLLOW an affirmative verb with hyphens (donne-le-moi), but precede it in the negative (ne me le donne pas).
Exceptions:
• Special forms: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez (polite).
• Me/te become moi/toi after the verb (lève-toi, donne-moi).`);

    D('infinitif',
`Правила:
• Закінчення: -er (parler), -ir (finir), -re (vendre), -oir (pouvoir); зворотні — se lever.
• Стоїть після прийменників (pour, sans, avant de, afin de, au lieu de), після модальних (pouvoir, vouloir, devoir, savoir), після aller і venir de, а також як іменник (lire est utile).
• Заперечення інфінітива: ne pas partir (обидва слова ПЕРЕД інфінітивом).
Винятки:
• Після après — інфінітив минулого (après avoir mangé), а не простий.
• Після прийменника en вживається не інфінітив, а gérondif (en parlant).
• Дієслова з à/de перед інфінітивом: commencer à, finir de, essayer de, décider de — див. тему про прийменники.`,
`Rules:
• Endings: -er (parler), -ir (finir), -re (vendre), -oir (pouvoir); reflexive — se lever.
• Follows prepositions (pour, sans, avant de, afin de, au lieu de), modals (pouvoir, vouloir, devoir, savoir), aller and venir de, and may act as a noun (lire est utile).
• Negative infinitive: ne pas partir (both words BEFORE the infinitive).
Exceptions:
• After après — the past infinitive (après avoir mangé), not the simple one.
• After the preposition en — not the infinitive but the gérondif (en parlant).
• Verbs with à/de before an infinitive: commencer à, finir de, essayer de, décider de — see the prepositions topic.`);

    D('participe-present-gerondif',
`Правила:
• Participe présent: основа nous + -ant (nous parlons → parlant); не змінюється в роді й числі, коли це дієслівна форма.
• Gérondif = en + participe présent: спосіб (il travaille en chantant), одночасність (en marchant), умова (en travaillant, tu réussiras).
• Підмет gérondif — той самий, що в головному реченні.
Винятки:
• Три неправильні основи: être → étant, avoir → ayant, savoir → sachant.
• Прикметники від participe узгоджуються (une histoire amusante, des enfants charmants) — це вже не дієслівна форма.
• Після прийменника en вживають лише gérondif; для інших прийменників — інфінітив (pour partir).`,
`Rules:
• Present participle: nous-stem + -ant (nous parlons → parlant); invariable when it is a verb form.
• Gérondif = en + present participle: manner (il travaille en chantant), simultaneity (en marchant), condition (en travaillant, tu réussiras).
• Its subject is the same as in the main clause.
Exceptions:
• Three irregular stems: être → étant, avoir → ayant, savoir → sachant.
• Adjectives derived from the participle agree (une histoire amusante, des enfants charmants) — no longer a verb form.
• Only the gérondif follows the preposition en; other prepositions take the infinitive (pour partir).`);

    D('voix-passive',
`Правила:
• Être (у потрібному часі) + participe passé, що узгоджується з підметом: la lettre est écrite, les livres ont été vendus.
• Виконавець — par (дія) або de (стан/почуття): écrit par Zola, aimé de tous.
• Часто passive уникають: on + дієслово (on parle français ici) або зворотна форма (cela se dit).
Винятки:
• Не кожне дієслово має passive: лише перехідні (з прямим додатком); непряму особу не переносять на місце підмета (на відміну від англійської).
• Passé composé з être (elle est partie) — не passive.
• Дієслова стану (être fatigué) і passive легко сплутати: порівняйте la porte est fermée (стан) і la porte est fermée par le gardien (дія).`,
`Rules:
• Être (in the needed tense) + past participle agreeing with the subject: la lettre est écrite, les livres ont été vendus.
• The agent: par (action) or de (state/feeling): écrit par Zola, aimé de tous.
• The passive is often avoided: on + verb (on parle français ici) or a reflexive form (cela se dit).
Exceptions:
• Only transitive verbs (with a direct object) have a passive; an indirect object cannot become the subject (unlike English).
• The passé composé with être (elle est partie) is not a passive.
• State verbs (être fatigué) and the passive are easily confused: la porte est fermée (state) vs la porte est fermée par le gardien (action).`);

    D('verbes-pronominaux',
`Правила:
• Займенник узгоджується з підметом: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons).
• Типи: власне зворотні (se lever), взаємні (se parler), пасивного значення (cela se vend), суто займенникові (se souvenir, s’évanouir).
• У passé composé — тільки з être; participe узгоджується з COD, якщо він стоїть ПЕРЕД дієсловом: elle s’est lavée, але elle s’est lavé les mains.
Винятки:
• Participe НЕ узгоджується, коли займенник — непрямий додаток: elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• Дієслова se rire, se plaire, se complaire, se succéder, se ressembler, se nuire — participe незмінне.
• В імперативі: lève-toi ! (дефіс + toi), заперечення: ne te lève pas !`,
`Rules:
• The pronoun agrees with the subject: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se (je me lave, nous nous levons).
• Types: truly reflexive (se lever), reciprocal (se parler), passive-like (cela se vend), purely pronominal (se souvenir, s’évanouir).
• In the passé composé — only être; the participle agrees with a direct object placed BEFORE the verb: elle s’est lavée, but elle s’est lavé les mains.
Exceptions:
• The participle does NOT agree when the pronoun is an indirect object: elles se sont parlé, ils se sont téléphoné, elle s’est acheté un livre.
• With se rire, se plaire, se complaire, se succéder, se ressembler, se nuire — the participle is invariable.
• In the imperative: lève-toi ! (hyphen + toi), negative: ne te lève pas !`);

    D('verbes-modaux',
`Правила:
• Pouvoir (je peux, nous pouvons, ils peuvent), vouloir (je veux, nous voulons, ils veulent), devoir (je dois, nous devons, ils doivent), savoir + ІНФІНІТИВ без прийменника.
• Значення: можливість/дозвіл (pouvoir), бажання (vouloir), обов’язок/імовірність (devoir), уміння (savoir).
• Falloir — безособове: il faut partir, il faut que tu partes.
Винятки:
• Pouvoir у питанні в 1-й особі: puis-je (а не peux-je).
• Savoir ≠ pouvoir: je sais nager (вмію), je peux nager (можу/дозволено).
• Devoir + іменник — «бути винним» (je dois dix euros), а не модальне значення.
• Participes у passé composé: dû, pu, voulu, su (je n’ai pas pu venir).`,
`Rules:
• Pouvoir (je peux, nous pouvons, ils peuvent), vouloir (je veux, nous voulons, ils veulent), devoir (je dois, nous devons, ils doivent), savoir + INFINITIVE with no preposition.
• Meanings: possibility/permission (pouvoir), wish (vouloir), obligation/probability (devoir), know-how (savoir).
• Falloir is impersonal: il faut partir, il faut que tu partes.
Exceptions:
• Pouvoir in a first-person question: puis-je (not peux-je).
• Savoir ≠ pouvoir: je sais nager (I know how), je peux nager (I am able/allowed).
• Devoir + noun means "to owe" (je dois dix euros), not a modal meaning.
• Participles in the passé composé: dû, pu, voulu, su (je n’ai pas pu venir).`);

    D('concordance-temps',
`Правила:
• Головне в теперішньому: підрядне — présent (одночасність), passé composé (раніше), futur (пізніше): il dit qu’il vient / est venu / viendra.
• Головне в минулому: одночасність → imparfait; раніше → plus-que-parfait; пізніше → conditionnel présent: il a dit qu’il venait / était venu / viendrait.
Винятки:
• Загальна істина лишається в présent: il a dit que la Terre est ronde.
• Після si в нереальній умові — imparfait/plus-que-parfait, а не conditionnel.
• В непрямому питанні й після espérer/croire (ствердно) немає subjonctif, лише indicatif.`,
`Rules:
• Main clause in the present: subordinate — présent (simultaneous), passé composé (earlier), futur (later): il dit qu’il vient / est venu / viendra.
• Main clause in the past: simultaneous → imparfait; earlier → plus-que-parfait; later → present conditional: il a dit qu’il venait / était venu / viendrait.
Exceptions:
• A general truth stays in the présent: il a dit que la Terre est ronde.
• After si in an unreal condition — imparfait/plus-que-parfait, not the conditional.
• In an indirect question and after espérer/croire (affirmative) — indicative, never subjunctive.`);

    D('discours-indirect',
`Правила:
• Твердження: dire que; питання «так/ні»: demander si; питання з питальним словом: demander ce que/où/quand…; наказ: dire de + інфінітив.
• Займенники й слова часу зсуваються: je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• Час змінюється за concordance des temps (présent → imparfait тощо).
Винятки:
• Inversion зникає: Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• Si перед il/ils → s’il, але перед elle — si elle.`,
`Rules:
• Statements: dire que; yes/no questions: demander si; wh-questions: demander ce que/où/quand…; orders: dire de + infinitive.
• Pronouns and time words shift: je → il, ici → là, demain → le lendemain, hier → la veille, maintenant → alors.
• Tenses shift by the concordance des temps (présent → imparfait etc.).
Exceptions:
• Inversion disappears: Où vas-tu ? → Il demande où je vais.
• Qu’est-ce que → ce que; qu’est-ce qui → ce qui; est-ce que → si.
• Si before il/ils → s’il, but before elle — si elle.`);

    D('accord-participe-etre',
`Правила:
• З être participe узгоджується з підметом у роді й числі: il est parti, elle est partie, ils sont partis, elles sont parties.
• Те саме з passive: la lettre est écrite.
• Зі зворотними дієсловами правило складніше (див. verbes pronominaux).
Винятки:
• З on: якщо on = nous, participe може узгоджуватись (on est allées — жінки).
• Vous у ввічливій формі однини: узгодження з реальним підметом (vous êtes arrivée, madame).
• Дієслова руху, що беруть avoir (sortir une voiture), підпорядковуються іншому правилу — узгодження лише з COD перед дієсловом.`,
`Rules:
• With être the participle agrees with the subject in gender and number: il est parti, elle est partie, ils sont partis, elles sont parties.
• The same in the passive: la lettre est écrite.
• With reflexive verbs the rule is more complex (see reflexive verbs).
Exceptions:
• With on: when on = nous, the participle can agree (on est allées — women).
• Polite vous for one person: agree with the real subject (vous êtes arrivée, madame).
• Motion verbs that take avoir (sortir une voiture) follow the other rule — agreement only with a COD placed before the verb.`);

    D('accord-participe-avoir',
`Правила:
• Participe з avoir узгоджується з прямим додатком (COD), ЯКЩО він стоїть ПЕРЕД дієсловом: les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• Якщо COD після дієслова або його немає — participe незмінне: j’ai mangé des pommes, elles ont parlé.
Винятки:
• З займенником en participe незмінне: j’en ai mangé.
• Незмінні participes: coûté, valu, duré, vécu, couru, pesé у прямому значенні (les dix euros que ce livre m’a coûté).
• Перед інфінітивом participe узгоджується, лише коли COD сам виконує дію інфінітива: la femme que j’ai vue chanter (вона співає — узгоджується), les chansons que j’ai entendu chanter (пісні не співають — не узгоджується).
• Le (= це) невизначене: elle est plus grande que je ne l’avais pensé (незмінне).`,
`Rules:
• With avoir the participle agrees with the direct object (COD) ONLY if it comes BEFORE the verb: les pommes que j’ai mangées, je les ai vus, quelle robe as-tu choisie ?
• If the COD follows the verb or is absent, the participle is invariable: j’ai mangé des pommes, elles ont parlé.
Exceptions:
• With the pronoun en the participle is invariable: j’en ai mangé.
• Invariable participles: coûté, valu, duré, vécu, couru, pesé in their literal sense (les dix euros que ce livre m’a coûté).
• Before an infinitive the participle agrees only if the COD performs the infinitive’s action: la femme que j’ai vue chanter (agrees), les chansons que j’ai entendu chanter (does not).
• Neuter le (= it): elle est plus grande que je ne l’avais pensé (invariable).`);

    D('accord-adjectif',
`Правила:
• Жіночий рід — зазвичай +e (petit → petite), множина +s (petits, petites); для -s/-x множина не змінюється (gris, heureux).
• Прикметник узгоджується з іменником, до якого належить, і після être (elle est contente).
• Кілька іменників: якщо різного роду — чоловічий рід множини (un homme et une femme contents).
Винятки:
• Подвоєння: bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• Особливі: beau → belle (bel перед голосним), nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• Множина: -al → -aux (national → nationaux), beau/nouveau → +x.
• Незмінні: кольори від іменників (orange, marron), compounds (bleu foncé), demi/nu перед іменником.`,
`Rules:
• Feminine is usually +e (petit → petite), plural +s (petits, petites); -s/-x plurals are unchanged (gris, heureux).
• The adjective agrees with its noun and also after être (elle est contente).
• Several nouns: if of mixed gender — masculine plural (un homme et une femme contents).
Exceptions:
• Doubling: bon → bonne, gentil → gentille, gros → grosse, muet → muette.
• Special: beau → belle (bel before a vowel), nouveau → nouvelle, vieux → vieille, blanc → blanche, long → longue, doux → douce, heureux → heureuse, actif → active.
• Plurals: -al → -aux (national → nationaux), beau/nouveau → +x.
• Invariable: colours from nouns (orange, marron), compounds (bleu foncé), demi/nu before the noun.`);

    D('place-adjectif',
`Правила:
• Зазвичай після іменника: une voiture rouge, un livre intéressant, une table ronde (колір, форма, національність — завжди ПІСЛЯ).
• Перед іменником — короткі й частотні (правило BAGS: beauté, âge, bonté, grandeur): un beau jour, un jeune homme, un bon repas, une grande maison.
• Також перед іменником: petit, joli, vieux, nouveau, mauvais, long, court, haut.
Винятки (зміна значення):
• un grand homme (видатний) / un homme grand (високий); un ancien collègue (колишній) / un livre ancien (старовинний); ma propre chambre (власна) / une chambre propre (чиста); un pauvre garçon (бідолаха) / un garçon pauvre (небагатий); un brave homme (добрий) / un homme brave (хоробрий).
• Два прикметники: кожен на своєму місці (une jolie robe rouge).`,
`Rules:
• Usually after the noun: une voiture rouge, un livre intéressant, une table ronde (colour, shape, nationality — always AFTER).
• Before the noun — short, frequent ones (BAGS: beauty, age, goodness, size): un beau jour, un jeune homme, un bon repas, une grande maison.
• Also before the noun: petit, joli, vieux, nouveau, mauvais, long, court, haut.
Exceptions (meaning changes):
• un grand homme (great) / un homme grand (tall); un ancien collègue (former) / un livre ancien (antique); ma propre chambre (own) / une chambre propre (clean); un pauvre garçon (poor fellow) / un garçon pauvre (poor, without money); un brave homme (good) / un homme brave (brave).
• Two adjectives: each takes its own position (une jolie robe rouge).`);

    D('pluriel-noms',
`Правила:
• Зазвичай +s: un livre → des livres; іменники на -s, -x, -z не змінюються: un fils → des fils.
• -al → -aux (un journal → des journaux); -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux).
• Артикль і прикметник теж змінюються; на слух множину часто видно лише за артиклем.
Винятки:
• -ail → -ails (des détails), але des travaux, des vitraux, des coraux.
• Неправильні: un œil → des yeux, monsieur → messieurs, madame → mesdames.
• Винятки на -al: bal, carnaval, festival, récital — +s; на -ou: bijou, caillou, chou, genou, hibou, joujou, pou — +x.`,
`Rules:
• Usually +s: un livre → des livres; nouns in -s, -x, -z are unchanged: un fils → des fils.
• -al → -aux (un journal → des journaux); -eau, -eu → +x (un cadeau → des cadeaux, un jeu → des jeux).
• The article and adjective change too; the plural is often audible only in the article.
Exceptions:
• -ail → -ails (des détails), but des travaux, des vitraux, des coraux.
• Irregular: un œil → des yeux, monsieur → messieurs, madame → mesdames.
• -al exceptions: bal, carnaval, festival, récital — +s; -ou exceptions: bijou, caillou, chou, genou, hibou, joujou, pou — +x.`);

    D('genre-noms',
`Правила:
• Жіночий: -tion, -sion, -té, -ée (крім musée, lycée), -ure, -ance, -ence, -ie, -ette, -eur (абстрактні: la peur).
• Чоловічий: -ment, -age, -eau, -isme, -ier, -oir, -eur (особи: le docteur), назви днів, мов, дерев, металів.
• Рід треба запам’ятовувати разом із артиклем.
Винятки:
• -age: la plage, l’image, la page, la cage, la nage — жіночого роду.
• -ée: le musée, le lycée, le trophée — чоловічого.
• Рід змінює значення: le livre (книга) / la livre (фунт), le tour / la tour, le poste / la poste, le mode / la mode.
• Підступні слова: amour, orgue, délice — чоловічого роду в однині, але жіночого в множині.`,
`Rules:
• Feminine: -tion, -sion, -té, -ée (except musée, lycée), -ure, -ance, -ence, -ie, -ette, -eur (abstract: la peur).
• Masculine: -ment, -age, -eau, -isme, -ier, -oir, -eur (persons: le docteur), days, languages, trees, metals.
• Learn the gender with the article.
Exceptions:
• -age: la plage, l’image, la page, la cage, la nage — feminine.
• -ée: le musée, le lycée, le trophée — masculine.
• Gender changes meaning: le livre (book) / la livre (pound), le tour / la tour, le poste / la poste, le mode / la mode.
• Tricky words: amour, orgue, délice — masculine in the singular, feminine in the plural.`);

    D('article-defini',
`Правила:
• Le (чол.), la (жін.), l’ (перед голосним або німим h), les (множина).
• Для відомого чи єдиного предмета (la lune), для загальних понять (j’aime le café), для днів у значенні «щоразу» (le lundi), частин тіла (je me lave les mains).
• Заперечення артикль le/la/les не змінює.
Винятки:
• H aspiré — без елізії: le héros, la honte, les haricots (але l’homme, l’heure — h німий).
• Не вживається після être у ролях/професіях (il est médecin) і в багатьох сталих виразах (avoir faim).
• Le/la/les як займенники COD — не артикль (je le vois).`,
`Rules:
• Le (masc.), la (fem.), l’ (before a vowel or mute h), les (plural).
• For a known or unique item (la lune), general concepts (j’aime le café), days meaning "every" (le lundi), body parts (je me lave les mains).
• The definite article does not change after a negation.
Exceptions:
• Aspirated h — no elision: le héros, la honte, les haricots (but l’homme, l’heure — mute h).
• Omitted after être with professions (il est médecin) and in many set phrases (avoir faim).
• Le/la/les as direct-object pronouns are not articles (je le vois).`);

    D('article-indefini',
`Правила:
• Un (чол.), une (жін.), des (множина) — для нового, невизначеного або «якогось» предмета.
• Після заперечення — de/d’: je n’ai pas de livre (але: ce n’est pas un livre — існування, а не кількість).
• Перед прикметником у множині часто de: de beaux jours (формально), у розмові des beaux jours.
Винятки:
• Des + прикметник перед іменником → de (de grandes maisons) у письмовій мові.
• Un/une після c’est/il y a зберігається навіть у запереченні, коли заперечується ідентичність.
• Un як числівник («один») — відрізняється інтонацією (j’ai un frère, pas deux).`,
`Rules:
• Un (masc.), une (fem.), des (plural) — for a new, unspecified or "some" item.
• After a negation — de/d’: je n’ai pas de livre (but: ce n’est pas un livre — identity, not quantity).
• Before a plural adjective formally de: de beaux jours (in speech often des beaux jours).
Exceptions:
• Des + adjective before the noun → de (de grandes maisons) in formal writing.
• Un/une stays after c’est/il y a even in the negative when the identity is denied.
• Un as a numeral ("one") — distinguished by stress (j’ai un frère, pas deux).`);

    D('article-partitif',
`Правила:
• Du (чол.), de la (жін.), de l’ (перед голосним), des (множина) — невизначена кількість нелічильного: du pain, de la confiture, de l’eau.
• Після заперечення й слів кількості — de/d’: pas de pain, beaucoup de pain, un kilo de farine.
• Для абстрактного: avoir du courage, faire du sport, jouer du piano (інструмент: jouer de + le = du).
Винятки:
• Після aimer, adorer, détester, préférer — означений артикль (j’aime le café, не du café), бо мова про загальне.
• Не плутати з contraction de + le = du (je parle du film).
• Після être у запереченні: ce n’est pas du lait — партітив зберігається (ідентифікація).`,
`Rules:
• Du (masc.), de la (fem.), de l’ (before a vowel), des (plural) — an indefinite amount of an uncountable: du pain, de la confiture, de l’eau.
• After a negation and quantities — de/d’: pas de pain, beaucoup de pain, un kilo de farine.
• For abstracts: avoir du courage, faire du sport, jouer du piano (instrument: jouer de + le = du).
Exceptions:
• After aimer, adorer, détester, préférer — the definite article (j’aime le café, not du café) because the meaning is general.
• Do not confuse with the contraction de + le = du (je parle du film).
• After être in the negative: ce n’est pas du lait — the partitive stays (identification).`);

    D('contractions',
`Правила:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• Перед la та l’ злиття немає: à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
Винятки:
• Перед h aspiré злиття є (au héros), але перед h німим — ні (à l’hôtel).
• Du/des у значенні партитиву або неозначеного артикля — це не злиття (du pain, des amis).
• Країни: au Canada, aux États-Unis, але en France (без артикля).`,
`Rules:
• à + le → au; à + les → aux; de + le → du; de + les → des.
• No contraction before la and l’: à la maison, de l’école.
• Aller au cinéma, parler du film, revenir des États-Unis.
Exceptions:
• Before aspirated h the contraction occurs (au héros), but not before mute h (à l’hôtel).
• Du/des as a partitive or indefinite article are not contractions (du pain, des amis).
• Countries: au Canada, aux États-Unis, but en France (no article).`);

    D('possessifs',
`Правила:
• Узгоджуються з ПРЕДМЕТОМ володіння, а не з власником: mon/ma/mes, ton/ta/tes, son/sa/ses (свій/його/її), notre/nos, votre/vos, leur/leurs.
• Son/sa/ses може значити «його» й «її» — рід визначає предмет (son père = його або її батько).
• Перед жіночим іменником на голосний: mon, ton, son (mon amie, ton école).
Винятки:
• Для частин тіла часто означений артикль замість присвійного: je me lave les mains, il a mal à la tête.
• Leur(s) — присвійне; не плутати з займенником leur (je leur parle).
• Присвійне + à + займенник підкреслює власника: c’est mon livre à moi.`,
`Rules:
• They agree with the thing POSSESSED, not with the owner: mon/ma/mes, ton/ta/tes, son/sa/ses (his/her/its), notre/nos, votre/vos, leur/leurs.
• Son/sa/ses can mean both "his" and "her" — the gender of the noun decides (son père = his or her father).
• Before a feminine noun starting with a vowel: mon, ton, son (mon amie, ton école).
Exceptions:
• For body parts the definite article often replaces the possessive: je me lave les mains, il a mal à la tête.
• Leur(s) is the possessive; do not confuse it with the pronoun leur (je leur parle).
• Possessive + à + pronoun stresses the owner: c’est mon livre à moi.`);

    D('demonstratifs',
`Правила:
• Ce (чол.), cet (чол. перед голосним/німим h), cette (жін.), ces (множина).
• Для вказування на предмет у ситуації або тексті; -ci (близьке) і -là (далеке) уточнюють: ce livre-ci, cette femme-là.
• Рід і число — за іменником.
Винятки:
• Cet — лише перед голосним: cet homme, cet été; але ce héros (h aspiré).
• У розмові -là часто заміняє -ci взагалі.
• Ce — також частина c’est/ce sont (займенник), не плутати з ознакою.`,
`Rules:
• Ce (masc.), cet (masc. before a vowel/mute h), cette (fem.), ces (plural).
• For pointing at something in the situation or text; -ci (near) and -là (far) specify: ce livre-ci, cette femme-là.
• Gender and number follow the noun.
Exceptions:
• Cet only before a vowel: cet homme, cet été; but ce héros (aspirated h).
• In speech -là often replaces -ci altogether.
• Ce is also part of c’est/ce sont (a pronoun), not to be confused with the determiner.`);

    D('quantite',
`Правила:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + іменник без артикля: beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — без de; chaque тільки в однині.
• La plupart des, bien des, la moitié de + множина з артиклем: la plupart des gens.
Винятки:
• Encore du/de la, un peu de + партитив: un peu de sel.
• Bien du/de la (багато) з партитивом: bien du plaisir.
• Дієслово після la plupart des, une foule de, un grand nombre de — у множині.
• Quelques ≠ quelque (одн., «якийсь»): quelque chose, quelque temps.`,
`Rules:
• Beaucoup de, peu de, assez de, trop de, plus de, moins de, tant de + noun without an article: beaucoup de monde.
• Plusieurs, quelques, chaque, certains, divers — without de; chaque only in the singular.
• La plupart des, bien des, la moitié de + plural with article: la plupart des gens.
Exceptions:
• Encore du/de la, un peu de + partitive: un peu de sel.
• Bien du/de la (much) with the partitive: bien du plaisir.
• The verb after la plupart des, une foule de, un grand nombre de — plural.
• Quelques ≠ quelque (sing. "some"): quelque chose, quelque temps.`);

    D('comparatif',
`Правила:
• Plus/moins/aussi + прикметник або прислівник + que: elle est plus grande que lui.
• Для кількості: plus de/moins de/autant de + іменник + que (plus de livres que moi).
• Дієслово: verbe + plus/moins/autant que.
Винятки:
• Bon → meilleur (не plus bon): ce vin est meilleur. Bien → mieux (не plus bien): il chante mieux.
• Mauvais → pire (або plus mauvais), mal → plus mal / pis (рідко).
• Petit → plus petit; moindre — «менший» у переносному значенні (le moindre mal — найменше зло).
• Після que — тонічний займенник (plus grand que moi); у формальному стилі перед дієсловом може з’явитися ne (il est plus grand que je ne pensais).`,
`Rules:
• Plus/moins/aussi + adjective or adverb + que: elle est plus grande que lui.
• For quantity: plus de/moins de/autant de + noun + que (plus de livres que moi).
• With verbs: verb + plus/moins/autant que.
Exceptions:
• Bon → meilleur (not plus bon): ce vin est meilleur. Bien → mieux (not plus bien): il chante mieux.
• Mauvais → pire (or plus mauvais), mal → plus mal / pis (rare).
• Petit → plus petit; moindre — "lesser" in the figurative sense (le moindre mal).
• After que the pronoun is stressed (plus grand que moi); in formal style a pleonastic ne may appear before the verb (il est plus grand que je ne pensais).`);

    D('superlatif',
`Правила:
• Le/la/les + plus/moins + прикметник: le plus grand, la plus belle, les moins chers.
• Прислівник: le plus vite, le mieux.
• Після найвищого ступеня вживають de (le plus grand de la classe), а відносне підрядне часто стоїть у subjonctif.
Винятки:
• Le meilleur (від bon), le mieux (від bien), le pire (від mauvais).
• Якщо прикметник стоїть ПІСЛЯ іменника, артикль повторюється: la voiture la plus rapide; перед іменником артикль один: le plus beau jour.
• Після le plus… que + subjonctif для оцінок: c’est le plus beau film que j’aie vu.`,
`Rules:
• Le/la/les + plus/moins + adjective: le plus grand, la plus belle, les moins chers.
• Adverb: le plus vite, le mieux.
• After a superlative use de (le plus grand de la classe); the relative clause is often in the subjunctive.
Exceptions:
• Le meilleur (from bon), le mieux (from bien), le pire (from mauvais).
• With an adjective AFTER the noun the article is repeated: la voiture la plus rapide; before the noun there is one article: le plus beau jour.
• After le plus… que + subjunctive for evaluations: c’est le plus beau film que j’aie vu.`);

    D('adverbes-ment',
`Правила:
• Жіноча форма прикметника + -ment: lent → lente → lentement; doux → douce → doucement.
• Прикметник на голосний у чол. роді: +ment: vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment: constant → constamment, évident → évidemment.
Винятки:
• Неправильні: gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux, petit → peu — окремі прислівники.
• Деякі прикметники функціонують як прислівники: parler bas, coûter cher, travailler dur.`,
`Rules:
• Feminine form of the adjective + -ment: lent → lente → lentement; doux → douce → doucement.
• Adjectives ending in a vowel: +ment: vrai → vraiment, poli → poliment.
• -ant → -amment, -ent → -emment: constant → constamment, évident → évidemment.
Exceptions:
• Irregular: gentil → gentiment, bref → brièvement, précis → précisément, énorme → énormément, profond → profondément.
• Bon → bien, mauvais → mal, meilleur → mieux, petit → peu — separate adverbs.
• Some adjectives function as adverbs: parler bas, coûter cher, travailler dur.`);

    D('adverbes-places',
`Правила:
• У простих часах — одразу ПІСЛЯ дієслова: il parle lentement.
• У складених — короткі прислівники (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent) між auxiliaire та participe: il a déjà mangé.
• Прислівники на -ment часто після participe: il a parlé lentement (або перед: il a lentement parlé — стилістично).
Винятки:
• Прислівники місця й часу (hier, demain, ici, là) стоять після participe: il est arrivé hier.
• Прислівники речення (heureusement, malheureusement, probablement) — на початку або після підмета.
• Pas, jamais, plus — разом з ne навколо допоміжного: il n’a jamais mangé.`,
`Rules:
• In simple tenses — right AFTER the verb: il parle lentement.
• In compound tenses short adverbs (déjà, bien, mal, trop, beaucoup, toujours, encore, vite, souvent) go between auxiliary and participle: il a déjà mangé.
• -ment adverbs often follow the participle: il a parlé lentement (or precede it: il a lentement parlé — stylistic).
Exceptions:
• Adverbs of place and time (hier, demain, ici, là) follow the participle: il est arrivé hier.
• Sentence adverbs (heureusement, malheureusement, probablement) — at the start or after the subject.
• Pas, jamais, plus — with ne around the auxiliary: il n’a jamais mangé.`);

    D('pronoms-sujets',
`Правила:
• Je (j’ перед голосним), tu, il, elle, on, nous, vous, ils, elles.
• Tu — до друзів і дітей; vous — ввічливо або множина.
• On = «ми» (розм.), «люди взагалі», «хтось»; дієслово в 3-й особі однини.
Винятки:
• Il безособове: il pleut, il faut, il y a.
• Ils — для групи, де є хоч один чоловік; elles — лише жінки.
• Підмет-іменник + займенник (Pierre, il…) у розмові для виділення.
• Узгодження з on: participe може бути в множині (on est partis).`,
`Rules:
• Je (j’ before a vowel), tu, il, elle, on, nous, vous, ils, elles.
• Tu — to friends and children; vous — polite or plural.
• On = "we" (informal), "people in general", "someone"; the verb is 3rd person singular.
Exceptions:
• Impersonal il: il pleut, il faut, il y a.
• Ils — for a group with at least one man; elles — only women.
• Noun subject + pronoun (Pierre, il…) in speech for emphasis.
• Agreement with on: the participle can be plural (on est partis).`);

    D('pronoms-cod',
`Правила:
• Me, te, le/la (l’), nous, vous, les — ПЕРЕД відмінюваним дієсловом: je le vois, elle les a achetés.
• З інфінітивом — перед інфінітивом: je veux le voir.
• В імперативі ствердному — після дієслова через дефіс: regarde-le !
• Le/la/les замінюють іменник з означеним артиклем або присвійним/вказівним (le livre → je le lis).
Винятки:
• Le може замінювати цілу думку або прикметник: je le sais, elle l’est (heureuse).
• Викликає узгодження participe: je les ai vus (COD стоїть перед дієсловом).
• З неозначеним артиклем/партитивом замість le — en (j’en veux).`,
`Rules:
• Me, te, le/la (l’), nous, vous, les — BEFORE the conjugated verb: je le vois, elle les a achetés.
• With an infinitive — before the infinitive: je veux le voir.
• In the affirmative imperative — after the verb with a hyphen: regarde-le !
• Le/la/les replace a noun with a definite, possessive or demonstrative determiner (le livre → je le lis).
Exceptions:
• Le may replace a whole idea or an adjective: je le sais, elle l’est (heureuse).
• Triggers participle agreement: je les ai vus (COD before the verb).
• With an indefinite or partitive article use en instead (j’en veux).`);

    D('pronoms-coi',
`Правила:
• Me, te, lui, nous, vous, leur — замінюють à + ОСОБА: je lui parle, il leur a donné un livre.
• Позиція — перед дієсловом (як COD); у ствердному імперативі — після: parle-lui !
• Типові дієслова: parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
Винятки:
• Для речей — y замість lui/leur: je pense à mon travail → j’y pense.
• Деякі дієслова з à вимагають займенника з à + тонічний: penser à lui, songer à elle, s’intéresser à eux, être à moi.
• Leur (займенник, без -s) ≠ leur(s) (присвійне).`,
`Rules:
• Me, te, lui, nous, vous, leur — replace à + PERSON: je lui parle, il leur a donné un livre.
• Position — before the verb (like COD); in the affirmative imperative — after: parle-lui !
• Typical verbs: parler à, donner à, téléphoner à, écrire à, répondre à, dire à.
Exceptions:
• For things use y instead of lui/leur: je pense à mon travail → j’y pense.
• Some verbs with à require à + stressed pronoun: penser à lui, songer à elle, s’intéresser à eux, être à moi.
• Leur (pronoun, no -s) ≠ leur(s) (possessive).`);

    D('pronoms-y-en',
`Правила:
• Y замінює à/dans/sur/chez + місце або річ: j’y vais (je vais à Paris), j’y pense.
• En замінює de + іменник, партитив або кількість: j’en veux (du pain), j’en ai trois, je viens d’en parler.
• Позиція — перед дієсловом, у ствердному імперативі — після (vas-y, parles-en).
Винятки:
• З числівником/словом кількості en зберігає його: j’en ai trois, j’en ai beaucoup.
• У tu-імперативі повертається -s: vas-y, parles-en, manges-en.
• En не вживається для людей з de + особа — тоді de lui/d’elle: je parle de lui.
• Y/en в двох займенниках — завжди останні (je lui en donne).`,
`Rules:
• Y replaces à/dans/sur/chez + place or thing: j’y vais (je vais à Paris), j’y pense.
• En replaces de + noun, a partitive or a quantity: j’en veux (du pain), j’en ai trois, je viens d’en parler.
• Position — before the verb; in the affirmative imperative — after (vas-y, parles-en).
Exceptions:
• With a numeral/quantity word en keeps it: j’en ai trois, j’en ai beaucoup.
• The tu-imperative regains its -s: vas-y, parles-en, manges-en.
• For people with de + person use de lui/d’elle, not en: je parle de lui.
• In pronoun clusters y/en always come last (je lui en donne).`);

    D('pronoms-relatifs',
`Правила:
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
`Rules:
• Qui — subject: l’homme qui parle.
• Que (qu’) — direct object: le livre que je lis.
• Dont — of which/whom: le film dont je parle; and "whose": la femme dont le fils est médecin.
• Où — place/time: la ville où j’habite, le jour où il est venu.
• Preposition + lequel/laquelle/lesquels/lesquelles: la table sur laquelle (with à → auquel, de → duquel).
Exceptions:
• For people after a preposition — qui: la femme avec qui je parle.
• Ce qui/ce que/ce dont — without an antecedent: je sais ce que tu veux.
• The verb after qui agrees with the antecedent: moi qui suis, toi qui es, nous qui sommes.
• Que elides before a vowel (qu’il), qui never does.`);

    D('pronoms-toniques',
`Правила:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• Вживаються: після прийменників (avec moi, pour toi), після c’est/ce sont (c’est moi), для підкреслення (moi, je pense), у порівняннях (plus grand que lui), без дієслова (Qui est là ? — Moi.), при сполученні (Pierre et moi).
Винятки:
• Після à для людей з певними дієсловами тонічний замість COI: penser à lui, songer à elle.
• Soi — безособовий: on a besoin de soi, chacun pour soi.
• Eux/elles — лише для людей і тварин; для речей — y/en.`,
`Rules:
• Moi, toi, lui, elle, nous, vous, eux, elles.
• Used: after prepositions (avec moi, pour toi), after c’est/ce sont (c’est moi), for emphasis (moi, je pense), in comparisons (plus grand que lui), without a verb (Qui est là ? — Moi.), in coordination (Pierre et moi).
Exceptions:
• After à for people, certain verbs use a stressed pronoun instead of an indirect pronoun: penser à lui, songer à elle.
• Soi — impersonal: on a besoin de soi, chacun pour soi.
• Eux/elles — only for people and animals; for things use y/en.`);

    D('double-pronoms',
`Правила:
• Порядок перед дієсловом: me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• Приклади: il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• У ствердному імперативі: дієслово + COD + COI (donne-le-moi), у запереченні — як зазвичай (ne me le donne pas).
Винятки:
• Me/te/se перед le/la/les не елідуються: il me le donne (а не il m’le donne).
• В імперативі me/te → moi/toi (donne-le-moi), але перед en: donne-m’en.
• Не можна поєднувати me/te/nous/vous + lui/leur: не je lui te présente, а je te présente à lui.`,
`Rules:
• Order before the verb: me/te/se/nous/vous → le/la/les → lui/leur → y → en.
• Examples: il me le donne; je le lui dis; nous leur en parlons; elle m’y a conduit.
• In the affirmative imperative: verb + COD + COI (donne-le-moi); in the negative as usual (ne me le donne pas).
Exceptions:
• Me/te/se do not elide before le/la/les: il me le donne (not il m’le donne).
• In the imperative me/te → moi/toi (donne-le-moi) but before en: donne-m’en.
• me/te/nous/vous cannot combine with lui/leur: not je lui te présente but je te présente à lui.`);

    D('pronoms-interrogatifs',
`Правила:
• Хто: qui / qui est-ce qui (підмет), qui / qui est-ce que (додаток).
• Що: qu’est-ce qui (підмет), que / qu’est-ce que (додаток), quoi (після прийменника).
• Де/коли/як/чому/скільки: où, quand, comment, pourquoi, combien (de).
• Який: quel, quelle, quels, quelles (узгоджується); lequel — котрий із.
Винятки:
• Que (qu’) — тільки з інверсією або est-ce que: que veux-tu ? / qu’est-ce que tu veux ?
• Quoi — після прийменника або без дієслова: tu parles de quoi ? Quoi ?
• Pourquoi + інверсія з сполучним -t-: pourquoi a-t-il…
• Quel — після être: quelle est ta ville ?`,
`Rules:
• Who: qui / qui est-ce qui (subject), qui / qui est-ce que (object).
• What: qu’est-ce qui (subject), que / qu’est-ce que (object), quoi (after a preposition).
• Where/when/how/why/how many: où, quand, comment, pourquoi, combien (de).
• Which: quel, quelle, quels, quelles (agrees); lequel — which one of.
Exceptions:
• Que (qu’) only with inversion or est-ce que: que veux-tu ? / qu’est-ce que tu veux ?
• Quoi — after a preposition or without a verb: tu parles de quoi ? Quoi ?
• Pourquoi + inversion with euphonic -t-: pourquoi a-t-il…
• Quel — after être: quelle est ta ville ?`);

    D('negation',
`Правила:
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
`Rules:
• Ne (n’) before the verb + the second part after it: ne … pas, ne … jamais, ne … plus, ne … rien, ne … personne, ne … aucun, ne … guère.
• In compound tenses the second part follows the auxiliary: je n’ai pas mangé; but personne, aucun follow the participle: je n’ai vu personne.
• The article after a negation: un/une/des/du → de/d’ (je n’ai pas de pain).
• With an infinitive both words precede it: ne pas partir.
Exceptions:
• Ne … que is not a negation but a restriction ("only").
• Ne … ni … ni: je n’ai ni frère ni sœur (no article).
• In speech ne is often dropped: je sais pas.
• Pas/jamais without ne in an answer or without a verb: Pas du tout ! Jamais !
• Expletive ne (no negative meaning): je crains qu’il ne vienne.`);

    D('interrogation',
`Правила:
• Інтонація (розм.): Tu viens ?
• Est-ce que (нейтрально): Est-ce que tu viens ?
• Інверсія (формально): Viens-tu ? Où vas-tu ?
• З питальним словом: Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où ?
Винятки:
• Інверсія з il/elle/on після голосної — сполучний -t-: Parle-t-il ? A-t-elle fini ?
• Іменник-підмет + займенник: Pierre vient-il ? (подвоєння підмета).
• З je інверсія рідкісна: puis-je, suis-je, ai-je — замість неї est-ce que.
• Питання про підмет (qui, qu’est-ce qui) не мають інверсії: Qui parle ?`,
`Rules:
• Intonation (informal): Tu viens ?
• Est-ce que (neutral): Est-ce que tu viens ?
• Inversion (formal): Viens-tu ? Où vas-tu ?
• With a question word: Où habites-tu ? / Où est-ce que tu habites ? / Tu habites où ?
Exceptions:
• Inversion with il/elle/on after a vowel takes a euphonic -t-: Parle-t-il ? A-t-elle fini ?
• Noun subject + pronoun: Pierre vient-il ? (subject doubling).
• With je inversion is rare: puis-je, suis-je, ai-je — otherwise use est-ce que.
• Questions about the subject (qui, qu’est-ce qui) take no inversion: Qui parle ?`);

    D('mise-en-relief',
`Правила:
• C’est + виділений елемент + qui (підмет) / que (інше): c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + множина (формально), у розмові часто c’est.
• Можна виділяти підмет, додаток, обставину: c’est demain que je pars.
• Дієслово після qui узгоджується з виділеним: c’est moi qui ai fait ça.
Винятки:
• Для виділення з прийменником: c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est: ce que je veux, c’est du repos (псевдо-розщеплене).
• У запереченні: ce n’est pas moi qui…`,
`Rules:
• C’est + highlighted element + qui (subject) / que (other): c’est Marie qui a parlé; c’est ce livre que je veux.
• Ce sont + plural (formal), in speech often c’est.
• Subject, object or adverbial can be highlighted: c’est demain que je pars.
• The verb after qui agrees with the highlighted element: c’est moi qui ai fait ça.
Exceptions:
• With a preposition: c’est à toi que je parle; c’est de lui que je parle.
• Ce qui/ce que/ce dont … c’est: ce que je veux, c’est du repos (pseudo-cleft).
• Negated: ce n’est pas moi qui…`);

    D('conjonctions-subordination',
`Правила:
• З indicatif: parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• З subjonctif: bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Que замінює повторену сполучну: quand il pleut et que je suis fatigué…
Винятки:
• Après que — indicatif (хоча часто помилково subjonctif).
• Avant que, sans que — subjonctif, але з тим самим підметом — інфінітив (avant de partir).
• Parce que відповідає на pourquoi; puisque — вже відома причина; car — сурядний, не підрядний.`,
`Rules:
• With the indicative: parce que, puisque, quand, lorsque, pendant que, tandis que, comme, dès que, après que, aussitôt que, si.
• With the subjunctive: bien que, quoique, pour que, afin que, avant que, jusqu’à ce que, à moins que, sans que, pourvu que.
• Que replaces a repeated conjunction: quand il pleut et que je suis fatigué…
Exceptions:
• Après que takes the indicative (although the subjunctive is often used wrongly).
• Avant que, sans que — subjunctive, but with the same subject use the infinitive (avant de partir).
• Parce que answers pourquoi; puisque — a cause already known; car is coordinating, not subordinating.`);

    D('connecteurs-logiques',
`Правила:
• Протиставлення: mais, pourtant, cependant, toutefois, en revanche, au contraire.
• Причина: car, en effet, parce que; наслідок: donc, alors, par conséquent, c’est pourquoi.
• Порядок: d’abord, ensuite, puis, enfin; додавання: de plus, en outre, d’ailleurs.
• Зазвичай відокремлюються комою на початку речення.
Винятки:
• Mais не ставиться з pourtant у тому ж значенні одночасно.
• Donc може стояти всередині: je pense donc je suis.
• Or — «а втім», вводить нову обставину, не «або».
• Car — сурядний сполучник: зазвичай стоїть між двома частинами речення, а не на його початку.`,
`Rules:
• Contrast: mais, pourtant, cependant, toutefois, en revanche, au contraire.
• Cause: car, en effet, parce que; consequence: donc, alors, par conséquent, c’est pourquoi.
• Order: d’abord, ensuite, puis, enfin; addition: de plus, en outre, d’ailleurs.
• Usually set off by a comma at the start of a sentence.
Exceptions:
• Mais and pourtant are not used together with the same meaning.
• Donc may stand inside: je pense donc je suis.
• Or — "now/yet", introduces a new circumstance, not "or".
• Car is a coordinating conjunction: it normally sits between two clauses, not at the start of a sentence.`);

    D('proposition-relative',
`Правила:
• Пояснює іменник; починається відносним займенником (qui, que, dont, où, lequel).
• Визначальна (без коми): l’homme qui parle est mon père; пояснювальна (у комах): Paul, qui parle, est mon père.
• Дієслово в relative з qui узгоджується з антецедентом.
• Іноді вимагає subjonctif (c’est le seul livre que je puisse lire).
Винятки:
• Qui не елідується, que — так (qu’il).
• Dont уже містить de (не кажуть « dont de »): le livre dont j’ai besoin.
• Où після іменника місця чи часу заміняє прийменник + lequel.`,
`Rules:
• Qualifies a noun; opens with a relative pronoun (qui, que, dont, où, lequel).
• Defining (no commas): l’homme qui parle est mon père; non-defining (in commas): Paul, qui parle, est mon père.
• The verb of a qui-clause agrees with the antecedent.
• Sometimes requires the subjunctive (c’est le seul livre que je puisse lire).
Exceptions:
• Qui never elides, que does (qu’il).
• Dont already contains de (never « dont de »): le livre dont j’ai besoin.
• Où after a noun of place/time replaces preposition + lequel.`);

    D('depuis-il-y-a-pendant',
`Правила:
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
`Rules:
• Depuis + présent: the action is still going: j’habite ici depuis deux ans.
• Il y a + period + past tense: "ago": il est parti il y a une heure.
• Pendant + period: duration (finished or future): j’ai dormi pendant dix heures.
• Dans + period: "in": je pars dans deux jours.
• En + period: "within" (how long it took): j’ai fini en une heure.
Exceptions:
• Depuis + imparfait for a continuing past action: il travaillait depuis une heure quand…
• Ça fait … que / il y a … que + présent — same as depuis: ça fait deux ans que j’habite ici.
• Pendant is often omitted: j’ai dormi dix heures.
• Depuis with a negative passé composé: je ne l’ai pas vu depuis mardi.`);

    D('marqueurs-temps',
`Правила:
• Минуле: hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• Теперішнє: maintenant, en ce moment, aujourd’hui, actuellement → présent.
• Майбутнє: demain, bientôt, la semaine prochaine, dans… → futur.
• Частота: toujours, souvent, parfois, rarement, jamais.
• Послідовність: d’abord, ensuite, puis, enfin, soudain.
Винятки:
• Déjà, encore, toujours, ne … plus — залежно від контексту мають різні значення (encore = ще/знову).
• Soudain/tout à coup — passé composé, а не imparfait (подія, а не фон).
• Aujourd’hui може відноситись до минулого в тексті («сьогодні» оповідача).`,
`Rules:
• Past: hier, avant-hier, la semaine dernière, autrefois, il y a… → passé composé/imparfait.
• Present: maintenant, en ce moment, aujourd’hui, actuellement → présent.
• Future: demain, bientôt, la semaine prochaine, dans… → futur.
• Frequency: toujours, souvent, parfois, rarement, jamais.
• Sequence: d’abord, ensuite, puis, enfin, soudain.
Exceptions:
• Déjà, encore, toujours, ne … plus mean different things depending on context (encore = still/again).
• Soudain/tout à coup — passé composé, not imparfait (an event, not background).
• Aujourd’hui can refer to the past inside a text (the narrator’s "today").`);

    D('prepositions-lieu',
`Правила:
• À + місто (à Paris), en + країна жін. роду (en France, en Italie), au + чол. (au Canada, au Japon), aux + мн. (aux États-Unis).
• Dans + закрите місце (dans la boîte), sur, sous, devant, derrière, entre, chez + особа (chez moi).
• De/du/des/d’ — звідки: je viens de France, du Canada, des États-Unis, de Paris.
Винятки:
• Країни на -e жіночого роду; винятки: le Mexique, le Zaïre, le Cambodge — чоловічі.
• Острови: à Cuba, à Malte, en Corse, à Tahiti.
• Перед голосним: en Iran, en Israël, en Afghanistan (навіть чол. рід).
• Chez для осіб і закладів: chez le médecin.`,
`Rules:
• À + city (à Paris), en + feminine country (en France, en Italie), au + masculine (au Canada, au Japon), aux + plural (aux États-Unis).
• Dans + enclosed place (dans la boîte), sur, sous, devant, derrière, entre, chez + person (chez moi).
• De/du/des/d’ — from: je viens de France, du Canada, des États-Unis, de Paris.
Exceptions:
• Countries in -e are feminine; exceptions: le Mexique, le Zaïre, le Cambodge — masculine.
• Islands: à Cuba, à Malte, en Corse, à Tahiti.
• Before a vowel: en Iran, en Israël, en Afghanistan (even masculine).
• Chez for persons and shops: chez le médecin.`);

    D('a-de-en',
`Правила:
• À: напрямок/місце (aller à l’école), час (à midi), належність (ce livre est à moi), після penser à, répondre à, commencer à, aider à, apprendre à.
• De: походження (venir de), приналежність (la maison de Paul), після parler de, avoir besoin de, finir de, essayer de, décider de, oublier de.
• En: матеріал (en bois), мова (en français), транспорт (en train; але à pied, à vélo, à moto), місяць/рік/пора (en mai, en 2020, en été).
Винятки:
• У транспорті: en voiture, en train, en avion, en bus, але à vélo, à pied, à cheval, à moto.
• Пори року: en été, en automne, en hiver, але au printemps.
• Дієслова з двома значеннями: penser à (думати про), penser de (мати думку).
• Після прийменника займенник: penser à lui, parler de lui; але y/en для речей.`,
`Rules:
• À: direction/place (aller à l’école), time (à midi), possession (ce livre est à moi), after penser à, répondre à, commencer à, aider à, apprendre à.
• De: origin (venir de), belonging (la maison de Paul), after parler de, avoir besoin de, finir de, essayer de, décider de, oublier de.
• En: material (en bois), language (en français), transport (en train; but à pied, à vélo, à moto), month/year/season (en mai, en 2020, en été).
Exceptions:
• Transport: en voiture, en train, en avion, en bus, but à vélo, à pied, à cheval, à moto.
• Seasons: en été, en automne, en hiver, but au printemps.
• Verbs with two meanings: penser à (to think about), penser de (to have an opinion on).
• After a preposition use a stressed pronoun: penser à lui, parler de lui; but y/en for things.`);

    D('expressions-cause-but',
`Правила:
• Причина: parce que, car, puisque, comme, à cause de (негативна), grâce à (позитивна), en raison de.
• Мета: pour + інфінітив, afin de + інфінітив, pour que/afin que + subjonctif.
• Наслідок: donc, alors, si bien que, tellement … que, tant … que, au point de.
Винятки:
• Pour que/afin que — subjonctif; pour/afin de — інфінітив, коли підмет той самий.
• Si bien que + indicatif (факт), de sorte que + subjonctif (мета) або indicatif (наслідок).
• À cause de ≠ grâce à (негатив/позитив); en raison de нейтральне.`,
`Rules:
• Cause: parce que, car, puisque, comme, à cause de (negative), grâce à (positive), en raison de.
• Purpose: pour + infinitive, afin de + infinitive, pour que/afin que + subjunctive.
• Result: donc, alors, si bien que, tellement … que, tant … que, au point de.
Exceptions:
• Pour que/afin que — subjunctive; pour/afin de — infinitive when the subject is the same.
• Si bien que + indicative (fact), de sorte que + subjunctive (purpose) or indicative (result).
• À cause de ≠ grâce à (negative/positive); en raison de is neutral.`);

    D('ne-que-restriction',
`Правила:
• Ne … que = «тільки»: il ne mange que du pain.
• Ne стоїть перед дієсловом, que — перед обмеженим словом (не відразу після дієслова обов’язково): je n’ai que dix euros.
• Артикль зберігається (не змінюється на de), бо це не заперечення.
Винятки:
• Seulement/uniquement — синоніми, без ne.
• У складених часах que — перед обмеженим елементом, не після auxiliary: il n’a mangé que du pain.
• Ne … pas que — «не тільки»: il n’y a pas que moi.
• Не плутати з ne … pas: ne … que ствердне за змістом.`,
`Rules:
• Ne … que = "only": il ne mange que du pain.
• Ne goes before the verb, que before the restricted element: je n’ai que dix euros.
• The article is kept (it does not become de) because it is not a negation.
Exceptions:
• Seulement/uniquement — synonyms, without ne.
• In compound tenses que precedes the restricted element, not right after the auxiliary: il n’a mangé que du pain.
• Ne … pas que — "not only": il n’y a pas que moi.
• Not to be confused with ne … pas: ne … que is affirmative in meaning.`);


    // ---- Таблиці відмінювання: особа · число · рід. Рядок таблиці — «| клітинка | клітинка |», перший рядок — заголовок. ----
    const TBL = (id, rows) => {
        if (!fr[id]) throw new Error('details table for unknown topic ' + id);
        const block = rows.map(r => '| ' + r.join(' | ') + ' |').join('\n');
        fr[id].uk += '\nВідмінювання (особа, число, рід):\n' + block.replace('PERSON', 'Особа');
        fr[id].en += '\nConjugation (person, number, gender):\n' + block.replace('PERSON', 'Person');
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
