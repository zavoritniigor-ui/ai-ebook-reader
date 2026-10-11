/* grammar-rules-details-en.js — розгорнуті пояснення правил і ВИНЯТКІВ для тем англійського каталогу
 * (js/grammar-rules-data-en.js). Формат такий самий, як у js/grammar-rules-details-fr.js. Класичний <script src>. */
(function () {
    const en = {};
    const D = (id, uk, e) => { en[id] = { uk, en: e }; };

    D('present-simple',
`Правила:
• Ствердження: основа дієслова; в 3-й особі однини +s/-es (he works, she watches).
• Заперечення й питання — do/does + основа: she doesn’t work, does he work?
• Вживається для звичок, фактів, розкладів (the train leaves at nine) і з прислівниками частоти.
Винятки:
• Be, have: I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes); приголосна + y → -ies (studies), але голосна + y → +s (plays).
• Після does/doesn’t закінчення -s зникає: she doesn’t work (а не works).
• Модальні дієслова не мають -s: she can swim.`,
`Rules:
• Positive: the base verb; third person singular adds -s/-es (he works, she watches).
• Negatives and questions — do/does + base verb: she doesn’t work, does he work?
• Used for habits, facts, timetables (the train leaves at nine) and with frequency adverbs.
Exceptions:
• Be, have: I am / you are / he is; I have / he has.
• -s, -sh, -ch, -x, -o → +es (watches, goes); consonant + y → -ies (studies), but vowel + y → +s (plays).
• After does/doesn’t the -s disappears: she doesn’t work (not works).
• Modal verbs take no -s: she can swim.`);

    D('present-continuous',
`Правила:
• Am/is/are + дієслово з -ing: I am reading, they are playing.
• Дія зараз, тимчасова ситуація, домовленість на найближче майбутнє (we are meeting tomorrow).
• Для роздратування з always: he is always losing his keys.
Винятки:
• Дієслова стану зазвичай без continuous: know, like, love, want, believe, understand, need, belong, own, seem (I know, не I am knowing).
• Деякі дієслова мають обидва значення: I think it’s good (думка) / I’m thinking about it (процес); I see (бачу) / I’m seeing him (зустрічаюсь).
• Орфографія -ing: make → making, run → running, lie → lying.`,
`Rules:
• Am/is/are + verb-ing: I am reading, they are playing.
• An action now, a temporary situation, an arranged plan (we are meeting tomorrow).
• For annoyance with always: he is always losing his keys.
Exceptions:
• State verbs normally avoid the continuous: know, like, love, want, believe, understand, need, belong, own, seem (I know, not I am knowing).
• Some verbs have both meanings: I think it’s good (opinion) / I’m thinking about it (process); I see (understand) / I’m seeing him (meeting).
• -ing spelling: make → making, run → running, lie → lying.`);

    D('present-perfect',
`Правила:
• Have/has + past participle: I have seen, she has finished.
• Досвід (I have been to Rome), результат (I have lost my keys), дія до цього часу з for/since (we have lived here for years).
• Маркери: already, yet, just, ever, never, recently, so far, since, for.
Винятки:
• З конкретним минулим часом — не present perfect, а past simple: I saw him yesterday (не I have seen him yesterday).
• Неправильні participles: be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone (пішов і ще там) ≠ have been (був і повернувся).
• Брит. і амер. англійська: американці частіше вживають past simple з already/just/yet.`,
`Rules:
• Have/has + past participle: I have seen, she has finished.
• Experience (I have been to Rome), result (I have lost my keys), an action up to now with for/since (we have lived here for years).
• Markers: already, yet, just, ever, never, recently, so far, since, for.
Exceptions:
• With a definite past time use the past simple: I saw him yesterday (not I have seen him yesterday).
• Irregular participles: be → been, go → gone/been, do → done, see → seen, take → taken, write → written.
• Have gone (went and is still there) ≠ have been (went and came back).
• British vs American: Americans often use the past simple with already/just/yet.`);

    D('present-perfect-continuous',
`Правила:
• Have/has been + verb-ing: I have been waiting for an hour.
• Підкреслює ТРИВАЛІСТЬ дії, що почалась у минулому і триває або щойно завершилась; видимий результат (your eyes are red — you have been crying).
• Часто з for і since.
Винятки:
• З дієсловами стану — present perfect simple: I have known him for years (не have been knowing).
• Коли важлива кількість або завершеність — simple: I have read three books (не have been reading).
• Always/lately/recently — допускають обидва.`,
`Rules:
• Have/has been + verb-ing: I have been waiting for an hour.
• Stresses DURATION of an action that began in the past and continues or has just stopped; visible result (your eyes are red — you have been crying).
• Often with for and since.
Exceptions:
• With state verbs use the present perfect simple: I have known him for years (not have been knowing).
• When quantity or completion matters, use the simple form: I have read three books (not have been reading).
• Always/lately/recently allow both.`);

    D('past-simple',
`Правила:
• Правильні дієслова: +ed (walked); неправильні — окремі форми (go → went, see → saw).
• Заперечення й питання — did + основа: I didn’t go, did you see him?
• Завершена дія в минулому з відомим часом (yesterday, last year, in 2010, ago).
Винятки:
• Орфографія: stop → stopped, study → studied, love → loved, play → played.
• Вимова -ed: /t/ (walked), /d/ (played), /ɪd/ (wanted).
• Be: was/were; з did не вживається (did you be — помилка).
• Після did основа без -ed: I didn’t walk.`,
`Rules:
• Regular verbs: +ed (walked); irregular verbs have special forms (go → went, see → saw).
• Negatives and questions — did + base verb: I didn’t go, did you see him?
• A completed past action with a known time (yesterday, last year, in 2010, ago).
Exceptions:
• Spelling: stop → stopped, study → studied, love → loved, play → played.
• -ed pronunciation: /t/ (walked), /d/ (played), /ɪd/ (wanted).
• Be: was/were; not used with did (did you be is wrong).
• After did the base form has no -ed: I didn’t walk.`);

    D('past-continuous',
`Правила:
• Was/were + verb-ing: I was reading, they were playing.
• Дія в процесі в певний момент у минулому (at 8 pm I was cooking) або фон для короткої дії в past simple: I was walking when it started to rain.
• Дві тривалі дії одночасно: while she was cooking, he was reading.
Винятки:
• Дієслова стану: not was knowing — просто knew.
• Послідовні короткі дії — past simple, не continuous: he opened the door and walked in.
• Після when/while: while + continuous, when + simple (when the phone rang, I was sleeping).`,
`Rules:
• Was/were + verb-ing: I was reading, they were playing.
• An action in progress at a moment in the past (at 8 pm I was cooking) or the background to a short past-simple action: I was walking when it started to rain.
• Two simultaneous long actions: while she was cooking, he was reading.
Exceptions:
• State verbs: not was knowing — simply knew.
• Consecutive short actions use the past simple, not the continuous: he opened the door and walked in.
• After when/while: while + continuous, when + simple (when the phone rang, I was sleeping).`);

    D('past-perfect',
`Правила:
• Had + past participle: I had finished, she had left.
• Дія, що сталася ДО іншої минулої дії або моменту (when I arrived, the film had started).
• У третьому conditional та після wish про минуле: if I had known…; I wish I had gone.
Винятки:
• Якщо послідовність очевидна (after, before, as soon as), часто достатньо past simple: after he left, I called.
• Had не скорочується з not в одному слові так само, як інші: hadn’t; ’d може означати had або would.
• Для довготривалості до моменту в минулому — past perfect continuous.`,
`Rules:
• Had + past participle: I had finished, she had left.
• An action that happened BEFORE another past action or moment (when I arrived, the film had started).
• In the third conditional and after wish about the past: if I had known…; I wish I had gone.
Exceptions:
• When the order is obvious (after, before, as soon as) the past simple is often enough: after he left, I called.
• ’d can mean had or would — decide by the form that follows.
• For duration up to a past moment use the past perfect continuous.`);

    D('past-perfect-continuous',
`Правила:
• Had been + verb-ing: she had been studying for hours.
• Тривала дія до певного моменту в минулому, часто з видимим наслідком (his hands were dirty — he had been working).
Винятки:
• З дієсловами стану — past perfect simple: I had known her for years.
• Коли названа кількість — simple: he had written three letters.`,
`Rules:
• Had been + verb-ing: she had been studying for hours.
• A long action up to a past moment, often with a visible result (his hands were dirty — he had been working).
Exceptions:
• With state verbs use the past perfect simple: I had known her for years.
• When a number is given — simple: he had written three letters.`);

    D('future-will',
`Правила:
• Will + основа: I will help, it will rain; скорочення ’ll, won’t.
• Рішення в момент мовлення, прогнози (I think it will snow), обіцянки, пропозиції.
• Часто після I think, probably, perhaps, I’m sure.
Винятки:
• Після if/when/as soon as/before/until про майбутнє — present simple, не will: if it rains, we will stay.
• Will для запланованого — going to / present continuous краще.
• Shall — I/we у пропозиціях: shall I open the window? (брит.).`,
`Rules:
• Will + base verb: I will help, it will rain; contractions ’ll, won’t.
• Spontaneous decisions, predictions (I think it will snow), promises, offers.
• Often after I think, probably, perhaps, I’m sure.
Exceptions:
• After if/when/as soon as/before/until about the future — present simple, not will: if it rains, we will stay.
• For something already planned going to / present continuous is better.
• Shall — I/we in offers: shall I open the window? (British).`);

    D('going-to',
`Правила:
• Am/is/are going to + основа: we are going to buy a house.
• Наміри й попередні плани; прогноз за очевидними ознаками (look at the clouds — it’s going to rain).
Винятки:
• З going і come часто вживають present continuous: I’m going to the shop (не I’m going to go).
• Не використовується з ситуаціями, що вирішені в момент мовлення — там will.
• В розмові: gonna (не пишуть у формальному тексті).`,
`Rules:
• Am/is/are going to + base verb: we are going to buy a house.
• Intentions and prior plans; a prediction based on evidence (look at the clouds — it’s going to rain).
Exceptions:
• With go and come the present continuous is usually used: I’m going to the shop (not I’m going to go).
• Not for decisions made at the moment of speaking — use will.
• Spoken: gonna (not written in formal text).`);

    D('future-continuous-perfect',
`Правила:
• Future continuous: will be + verb-ing — дія в процесі в певний момент майбутнього (this time tomorrow I will be flying).
• Future perfect: will have + past participle — дія завершиться до певного моменту (by June she will have finished).
• Future perfect continuous: will have been + verb-ing — тривалість до моменту (by May I will have been working here for five years).
Винятки:
• Після by (до) — future perfect; після until/till — future simple або continuous залежно від значення.
• Після when/before/after про майбутнє — present simple/perfect, не will have.`,
`Rules:
• Future continuous: will be + verb-ing — an action in progress at a future moment (this time tomorrow I will be flying).
• Future perfect: will have + past participle — an action completed by a future moment (by June she will have finished).
• Future perfect continuous: will have been + verb-ing — duration up to a moment (by May I will have been working here for five years).
Exceptions:
• After by (before) — future perfect; after until/till — future simple or continuous depending on meaning.
• After when/before/after about the future — present simple/perfect, not will have.`);

    D('used-to-would',
`Правила:
• Used to + основа: колишня звичка або стан, яких більше немає (we used to live in Spain; he used to be shy).
• Would + основа: повторювана минула дія, але НЕ стан (every summer we would visit my aunt).
• Заперечення й питання: didn’t use to, did you use to.
Винятки:
• З дієсловами стану (be, have, know, live) — лише used to: I used to have a dog (не would have).
• Be used to + -ing — «звикнути»: I’m used to getting up early — інша конструкція.
• Для одноразового минулого — past simple.`,
`Rules:
• Used to + base verb: a past habit or state that no longer applies (we used to live in Spain; he used to be shy).
• Would + base verb: a repeated past action, NOT a state (every summer we would visit my aunt).
• Negatives and questions: didn’t use to, did you use to.
Exceptions:
• With state verbs (be, have, know, live) only used to: I used to have a dog (not would have).
• Be used to + -ing means "accustomed to": I’m used to getting up early — a different construction.
• For a single past event — the past simple.`);

    D('modal-verbs',
`Правила:
• Can/could, may/might, must, should/ought to, will/would, shall + основа БЕЗ to; без -s у 3-й особі; заперечення просто + not (can’t).
• Can — здатність/дозвіл; could — ввічливо або минуле; may/might — можливість; must — сильний обов’язок/висновок; should — порада.
• Заперечення must not (заборона) ≠ don’t have to (необов’язково).
Винятки:
• Must не має минулого: had to (I had to leave).
• Ought to — з to, на відміну від решти.
• Can’t have + participle — упевнене заперечення про минуле: he can’t have seen it.
• Need і dare можуть бути модальними (needn’t) або звичайними (don’t need to).`,
`Rules:
• Can/could, may/might, must, should/ought to, will/would, shall + base verb WITHOUT to; no -s in the third person; negation just + not (can’t).
• Can — ability/permission; could — polite or past; may/might — possibility; must — strong obligation/deduction; should — advice.
• Must not (prohibition) ≠ don’t have to (not necessary).
Exceptions:
• Must has no past form: had to (I had to leave).
• Ought to takes to, unlike the others.
• Can’t have + participle — a confident negative about the past: he can’t have seen it.
• Need and dare can be modal (needn’t) or ordinary (don’t need to).`);

    D('conditional-zero-first',
`Правила:
• Zero: if + present, present — загальні істини (if you heat ice, it melts).
• First: if + present, will + основа — реальна майбутня умова (if it rains, we will stay home).
• Інверсія за відсутності if в письмовій мові: should you need help, call us.
Винятки:
• Після if не вживається will в умовній частині: if it rains (не if it will rain).
• Але if you will (ввічливо, «якщо ви будете ласкаві»): if you will wait here…
• Unless = if … not: unless you hurry, you will be late.
• Замість will можуть бути модальні: if you ask, he may help.`,
`Rules:
• Zero: if + present, present — general truths (if you heat ice, it melts).
• First: if + present, will + base verb — a real future condition (if it rains, we will stay home).
• Inversion without if in formal writing: should you need help, call us.
Exceptions:
• No will in the if-clause: if it rains (not if it will rain).
• But if you will (polite, "if you are willing"): if you will wait here…
• Unless = if … not: unless you hurry, you will be late.
• Modals can replace will: if you ask, he may help.`);

    D('conditional-second',
`Правила:
• If + past simple, would + основа: if I had a car, I would drive.
• Нереальна або малоймовірна ситуація зараз/в майбутньому; поради: if I were you, I would apologise.
• Може бути could/might замість would.
Винятки:
• Be: were для всіх осіб (if I were rich; формально) — розмовно was.
• Would не ставиться в умовній частині: if I had (не if I would have).
• Інверсія: were I you, I would…
• Mixed: if I had studied (минуле), I would be a doctor now.`,
`Rules:
• If + past simple, would + base verb: if I had a car, I would drive.
• An unreal or unlikely present/future situation; advice: if I were you, I would apologise.
• Could/might can replace would.
Exceptions:
• Be: were for all persons (if I were rich; formal) — informally was.
• No would in the if-clause: if I had (not if I would have).
• Inversion: were I you, I would…
• Mixed: if I had studied (past), I would be a doctor now.`);

    D('conditional-third',
`Правила:
• If + past perfect, would have + past participle: if she had studied, she would have passed.
• Нездійснена умова в минулому й її уявний наслідок; жаль і докір.
• Could have/might have замість would have.
Винятки:
• Не вживають would have в if-частині: if I had known (не if I would have known).
• Інверсія: had I known, I would have come.
• Mixed conditional: if I had taken the job, I would be rich now.`,
`Rules:
• If + past perfect, would have + past participle: if she had studied, she would have passed.
• An unfulfilled past condition and its imagined result; regret and reproach.
• Could have/might have instead of would have.
Exceptions:
• No would have in the if-clause: if I had known (not if I would have known).
• Inversion: had I known, I would have come.
• Mixed conditional: if I had taken the job, I would be rich now.`);

    D('wishes',
`Правила:
• Wish/if only + past simple — бажання щодо теперішнього: I wish I were taller; if only I knew.
• Wish/if only + past perfect — жаль про минуле: I wish I had gone; if only I hadn’t said that.
• Wish + would — докір, роздратування (I wish he would stop).
Винятки:
• Be: were для всіх осіб у формальному стилі: I wish I were there.
• Wish + would не вживається, коли підмети однакові: не I wish I would…
• Could замість would для здатності: I wish I could fly.`,
`Rules:
• Wish/if only + past simple — a wish about the present: I wish I were taller; if only I knew.
• Wish/if only + past perfect — regret about the past: I wish I had gone; if only I hadn’t said that.
• Wish + would — complaint, annoyance (I wish he would stop).
Exceptions:
• Be: were for all persons in formal style: I wish I were there.
• Wish + would is not used when the subject is the same: not I wish I would…
• Could instead of would for ability: I wish I could fly.`);

    D('subjunctive',
`Правила:
• Після suggest, recommend, insist, demand, propose, require: that + підмет + ОСНОВА (I suggest that he go; it is vital that she be present).
• If I were…, as if he were… (формально).
• Імператив: основа без підмета: Close the door. Заперечення: Don’t + дієслово. Let’s — пропозиція (let’s go).
Винятки:
• У розмовній (особливо брит.) англійській часто should: I suggest that he should go.
• Subjunctive не змінює 3-ю особу: he go, а не goes.
• Імператив з you для емфази: You be quiet!`,
`Rules:
• After suggest, recommend, insist, demand, propose, require: that + subject + BASE form (I suggest that he go; it is vital that she be present).
• If I were…, as if he were… (formal).
• Imperative: base verb without subject: Close the door. Negative: Don’t + verb. Let’s — a suggestion (let’s go).
Exceptions:
• In spoken (especially British) English should is common: I suggest that he should go.
• The subjunctive does not inflect in the third person: he go, not goes.
• Imperative with you for emphasis: You be quiet!`);

    D('infinitive-gerund',
`Правила:
• To-інфінітив: want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave).
• -ing: enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming).
• Після прийменників — тільки -ing: interested in learning, before leaving.
• Gerund як підмет: swimming is fun.
Винятки:
• Обидва з різним значенням: remember/forget/stop/try — I stopped smoking (кинув) / I stopped to smoke (зупинився, щоб закурити); remember to lock (не забути) / remember locking (пам’ятати, що зробив).
• Обидва з тим самим значенням: like, love, hate, prefer, begin, start (like to swim / like swimming).
• Інфінітив без to після модальних, let, make (he made me laugh).`,
`Rules:
• To-infinitive: want, decide, hope, plan, promise, refuse, agree, manage, learn, afford (decide to leave).
• -ing: enjoy, avoid, finish, keep, mind, suggest, consider, practise, risk (enjoy swimming).
• After prepositions only -ing: interested in learning, before leaving.
• Gerund as a subject: swimming is fun.
Exceptions:
• Both with different meanings: remember/forget/stop/try — I stopped smoking (quit) / I stopped to smoke (paused in order to smoke); remember to lock (not forget) / remember locking (recall doing).
• Both with the same meaning: like, love, hate, prefer, begin, start (like to swim / like swimming).
• Bare infinitive after modals, let, make (he made me laugh).`);

    D('passive-voice',
`Правила:
• Be (у потрібному часі) + past participle: is written, was broken, has been done, will be sent, is being built.
• Виконавець — by (за потреби): written by Tom.
• Вживається, коли виконавець невідомий, неважливий або очевидний.
Винятки:
• Лише перехідні дієслова мають passive (не можна: it was happened).
• З двома додатками можна утворити два passive: I was given a book / a book was given to me.
• Модальні: must be done, can be seen. Інфінітив: to be done.
• Get-passive (розм.): he got fired.
• Stative passive (the door is closed) описує стан.`,
`Rules:
• Be (in the needed tense) + past participle: is written, was broken, has been done, will be sent, is being built.
• Agent with by (if needed): written by Tom.
• Used when the doer is unknown, unimportant or obvious.
Exceptions:
• Only transitive verbs have a passive (not: it was happened).
• With two objects two passives are possible: I was given a book / a book was given to me.
• Modals: must be done, can be seen. Infinitive: to be done.
• Get-passive (informal): he got fired.
• The stative passive (the door is closed) describes a state.`);

    D('causative',
`Правила:
• Have + об’єкт + past participle — дію виконує хтось інший для нас: I had my hair cut; she is having the car repaired.
• Get + об’єкт + participle — розмовніше: I need to get my phone fixed.
• Для негативного досвіду: he had his wallet stolen.
Винятки:
• Have + person + base verb (без to) — «змусити/попросити»: I had the mechanic check the car.
• Get + person + to-інфінітив: I got him to help me.
• Не плутати з простим have: I have my hair cut (звичка) — залежить від контексту.`,
`Rules:
• Have + object + past participle — someone else does the action for us: I had my hair cut; she is having the car repaired.
• Get + object + participle — more informal: I need to get my phone fixed.
• For a negative experience: he had his wallet stolen.
Exceptions:
• Have + person + base verb (no to) — "to get someone to": I had the mechanic check the car.
• Get + person + to-infinitive: I got him to help me.
• Not to be confused with plain have: I have my hair cut (habit) — depends on context.`);

    D('reported-speech',
`Правила:
• Теперішній → минулий: "I am tired" → she said she was tired; will → would; can → could; have done → had done.
• Займенники й слова часу зсуваються: I → he/she; today → that day; tomorrow → the next day; here → there.
• Питання: asked if/whether або wh-слово + прямий порядок слів: he asked where I lived.
• Накази: told/asked + об’єкт + to-інфінітив.
Винятки:
• Зсув не обов’язковий, якщо твердження все ще правдиве: she said that the Earth is round.
• Could, would, should, might, ought to не змінюються.
• Said без об’єкта / told з об’єктом: she said that…; she told me that…
• Past simple може лишитись past simple, якщо контекст очевидний.`,
`Rules:
• Present → past: "I am tired" → she said she was tired; will → would; can → could; have done → had done.
• Pronouns and time words shift: I → he/she; today → that day; tomorrow → the next day; here → there.
• Questions: asked if/whether or a wh-word + statement word order: he asked where I lived.
• Orders: told/asked + object + to-infinitive.
Exceptions:
• The tense shift is optional if the statement is still true: she said that the Earth is round.
• Could, would, should, might, ought to do not change.
• Said without an object / told with an object: she said that…; she told me that…
• The past simple can stay if the context is clear.`);

    D('question-tags',
`Правила:
• Ствердне речення → заперечний tag (you like tea, don’t you?); заперечне → ствердний (it isn’t cold, is it?).
• Tag повторює допоміжне/модальне дієслово підмета; якщо його немає — do/does/did.
• Інтонація: спадна — перевірка очікуваного; висхідна — справжнє питання.
Винятки:
• I am → aren’t I? (а не amn’t I).
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they: nobody called, did they?
• Речення зі never/hardly/barely вважаються заперечними: he never lies, does he?`,
`Rules:
• Positive statement → negative tag (you like tea, don’t you?); negative → positive (it isn’t cold, is it?).
• The tag repeats the subject’s auxiliary/modal; if none, do/does/did.
• Intonation: falling — checking something expected; rising — a real question.
Exceptions:
• I am → aren’t I? (not amn’t I).
• Let’s → shall we?; imperative → will you?/won’t you?
• Nobody/somebody/everyone → they: nobody called, did they?
• Sentences with never/hardly/barely count as negative: he never lies, does he?`);

    D('phrasal-verbs',
`Правила:
• Дієслово + частка (up, out, off, on, in, down, away, back, over…): give up, look after, turn off, carry on.
• Перехідні роздільні: займенник ТІЛЬКИ між дієсловом і часткою (turn it off, не turn off it); іменник — по обидва боки (turn the light off / turn off the light).
• Неперехідні: wake up, break down, take off.
Винятки:
• Нероздільні: look after, get over, run into, deal with — об’єкт після частки.
• Три слова: put up with, look forward to, run out of, get on with.
• Значення часто ідіоматичне і не випливає з частин: give up = здатися, put off = відкласти.
• Частка ≠ прийменник місця: He ran up the stairs (прийменник) vs He picked up the book.`,
`Rules:
• Verb + particle (up, out, off, on, in, down, away, back, over…): give up, look after, turn off, carry on.
• Transitive separable: a pronoun goes ONLY between verb and particle (turn it off, not turn off it); a noun can be on either side (turn the light off / turn off the light).
• Intransitive: wake up, break down, take off.
Exceptions:
• Inseparable: look after, get over, run into, deal with — the object follows the particle.
• Three-word verbs: put up with, look forward to, run out of, get on with.
• The meaning is often idiomatic: give up = surrender, put off = postpone.
• A particle ≠ a preposition of place: He ran up the stairs (preposition) vs He picked up the book.`);

    D('articles-a-an',
`Правила:
• A — перед приголосним ЗВУКОМ, an — перед голосним ЗВУКОМ (a book, an apple).
• Для однини лічильних іменників при першій згадці, для «будь-якого» (she is a doctor), у значенні «один» (twice a week).
• Не вживається з множиною і нелічильними.
Винятки:
• Ключовий — звук, не літера: an hour, an honest man (h німа); a university, a European, a one-way ticket (звук /j/ або /w/).
• Скорочення за вимовою літер: an MBA, a UFO.
• Багато стійких виразів без артикля: go to bed, at school.`,
`Rules:
• A — before a consonant SOUND, an — before a vowel SOUND (a book, an apple).
• For singular countable nouns at first mention, "any one" (she is a doctor), meaning "one" (twice a week).
• Not used with plurals and uncountables.
Exceptions:
• What counts is the sound, not the letter: an hour, an honest man (silent h); a university, a European, a one-way ticket (/j/ or /w/ sound).
• Abbreviations by letter sound: an MBA, a UFO.
• Many fixed phrases have no article: go to bed, at school.`);

    D('article-the',
`Правила:
• The для відомого співрозмовникам або єдиного: the sun, the book on the table, the best.
• Друга згадка: I saw a dog. The dog was big.
• З найвищим ступенем, порядковими, іменами рік, океанів, готелів, газет, країн у множині (the United States).
Винятки:
• Без the: країни й міста (France, Paris), мови, більшість озер, вершин, прийоми їжі (breakfast).
• Але the Netherlands, the Alps, the Pacific, the Thames, the UK.
• Вимова: the /ðə/ перед приголосним, /ði/ перед голосним, /ðiː/ для підкреслення.
• Назви установ у типовому значенні — без the: go to school, in hospital (брит.).`,
`Rules:
• The for something known to both speakers or unique: the sun, the book on the table, the best.
• Second mention: I saw a dog. The dog was big.
• With superlatives, ordinals, names of rivers, oceans, hotels, newspapers, plural countries (the United States).
Exceptions:
• No the: countries and cities (France, Paris), languages, most lakes, peaks, meals (breakfast).
• But the Netherlands, the Alps, the Pacific, the Thames, the UK.
• Pronunciation: the /ðə/ before a consonant, /ði/ before a vowel, /ðiː/ for emphasis.
• Institutions in their typical use — no the: go to school, in hospital (British).`);

    D('zero-article',
`Правила:
• Без артикля: множина й нелічильні в загальному значенні (I like music, dogs are loyal).
• Мови, національності як мови, назви предметів, прийоми їжі, види спорту, більшість країн/міст, пори року.
• Institution phrases: go to school/church/prison/bed, at home, at work.
Винятки:
• Конкретний випадок — з the: the music I heard yesterday.
• Прийоми їжі з прикметником — a: we had a wonderful lunch.
• By + транспорт без артикля: by car, by train.
• Деякі країни/групи — з the: the UK, the Netherlands.`,
`Rules:
• No article: plurals and uncountables in a general sense (I like music, dogs are loyal).
• Languages, subjects, meals, sports, most countries/cities, seasons.
• Institution phrases: go to school/church/prison/bed, at home, at work.
Exceptions:
• A specific case takes the: the music I heard yesterday.
• Meals with an adjective take a: we had a wonderful lunch.
• By + transport has no article: by car, by train.
• Some countries/groups take the: the UK, the Netherlands.`);

    D('countable-uncountable',
`Правила:
• Лічильні мають множину й a/an (a book, two books); нелічильні — ні (water, advice, information, furniture, news).
• Кількість нелічильних: some, much, a lot of, a piece of, a bit of, a glass of.
• Питання: how many (лічильні), how much (нелічильні).
Винятки:
• Нелічильні в англійській, лічильні в українській: advice, information, news, furniture, luggage, traffic, progress, knowledge (an advice — помилка).
• Деякі іменники мають обидва значення: a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — зазвичай нелічильні; hairs, fruits — окремі предмети/види.`,
`Rules:
• Countables have a plural and a/an (a book, two books); uncountables do not (water, advice, information, furniture, news).
• Quantity of uncountables: some, much, a lot of, a piece of, a bit of, a glass of.
• Questions: how many (countable), how much (uncountable).
Exceptions:
• Uncountable in English but countable in many languages: advice, information, news, furniture, luggage, traffic, progress, knowledge (an advice is wrong).
• Some nouns have both: a coffee / coffee, a paper / paper, a glass / glass, an experience / experience.
• Hair, fruit — usually uncountable; hairs, fruits — individual items/kinds.`);

    D('quantifiers',
`Правила:
• Some — ствердження; any — заперечення й питання; no = not any.
• Much/little — нелічильні; many/few — лічильні; a lot of/plenty of — обидва.
• A few/a little = «трохи» (позитивно); few/little = «майже ні» (негативно).
• Enough, several, both, all, each, every.
Винятки:
• Some у питаннях-пропозиціях і проханнях: would you like some tea? can I have some water?
• Any у ствердженні = «будь-який»: any day will do.
• Much/many рідко у ствердженнях (a lot of); у запереченні й питаннях — природні.
• Each/every + однина дієслова: every student has a book.`,
`Rules:
• Some — positives; any — negatives and questions; no = not any.
• Much/little — uncountables; many/few — countables; a lot of/plenty of — both.
• A few/a little = "some" (positive); few/little = "hardly any" (negative).
• Enough, several, both, all, each, every.
Exceptions:
• Some in offers and requests: would you like some tea? can I have some water?
• Any in a positive means "any at all": any day will do.
• Much/many are rare in positives (use a lot of); natural in negatives and questions.
• Each/every take a singular verb: every student has a book.`);

    D('plurals',
`Правила:
• Зазвичай +s: book → books.
• -s, -x, -ch, -sh, -z → +es: box → boxes, watch → watches.
• Приголосна + y → -ies: city → cities; голосна + y → +s: day → days.
• -f/-fe → -ves: knife → knives, leaf → leaves.
Винятки:
• Неправильні: man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• Незмінні: sheep, fish, deer, series, species.
• -o: potatoes, tomatoes, heroes (але photos, pianos).
• Лише множина: scissors, trousers, glasses, clothes; -ics (news, mathematics) — однина.`,
`Rules:
• Usually +s: book → books.
• -s, -x, -ch, -sh, -z → +es: box → boxes, watch → watches.
• Consonant + y → -ies: city → cities; vowel + y → +s: day → days.
• -f/-fe → -ves: knife → knives, leaf → leaves.
Exceptions:
• Irregular: man → men, woman → women, child → children, foot → feet, tooth → teeth, mouse → mice, person → people.
• Unchanged: sheep, fish, deer, series, species.
• -o: potatoes, tomatoes, heroes (but photos, pianos).
• Plural only: scissors, trousers, glasses, clothes; -ics words (news, mathematics) are singular.`);

    D('possessives',
`Правила:
• Людина/тварина: ’s (Tom’s book); множина на -s: apostrophe після s (the boys’ room); нерегулярна множина: ’s (children’s toys).
• Річ: of (the end of the day, the door of the house).
• Присвійні прикметники перед іменником: my, your, his, her, its, our, their; займенники без іменника: mine, yours, his, hers, ours, theirs.
Винятки:
• Its (присвійне) ≠ it’s (it is/has).
• Час і відстань також з ’s: today’s news, a week’s holiday.
• Подвійний присвійний: a friend of mine (не a friend of me).
• Спільне володіння: Tom and Anna’s house; окреме — Tom’s and Anna’s cars.`,
`Rules:
• People/animals: ’s (Tom’s book); plural in -s: apostrophe after s (the boys’ room); irregular plural: ’s (children’s toys).
• Things: of (the end of the day, the door of the house).
• Possessive adjectives before a noun: my, your, his, her, its, our, their; pronouns without a noun: mine, yours, his, hers, ours, theirs.
Exceptions:
• Its (possessive) ≠ it’s (it is/has).
• Time and distance also take ’s: today’s news, a week’s holiday.
• Double possessive: a friend of mine (not a friend of me).
• Joint ownership: Tom and Anna’s house; separate — Tom’s and Anna’s cars.`);

    D('demonstratives',
`Правила:
• This/these — близьке в просторі, часі або свідомості; that/those — далеке.
• This/that — однина; these/those — множина.
• Займенники й визначники: this is my friend; I like these shoes.
Винятки:
• This у телефонних розмовах: this is Anna (я), is that John? (ви).
• That/those як заміна повтореного іменника: the weather here is better than that in Spain.
• Those who = ті, хто: those who wait.
• This/that перед ім’ям не змінюються в множині.`,
`Rules:
• This/these — near in space, time or mind; that/those — far.
• This/that — singular; these/those — plural.
• Pronouns and determiners: this is my friend; I like these shoes.
Exceptions:
• This on the phone: this is Anna (I am), is that John? (you).
• That/those replacing a repeated noun: the weather here is better than that in Spain.
• Those who = people who: those who wait.
• This/that do not change before a name in the plural.`);

    D('comparatives',
`Правила:
• Однослівні прикметники: +er (tall → taller); двоскладові на -y: -ier (happy → happier); довгі — more + adj (more interesting).
• Than для порівняння: she is taller than her brother.
• Приголосна подвоюється: big → bigger; -e + r: nice → nicer.
Винятки:
• Неправильні: good → better, bad → worse, far → farther/further, little → less, many/much → more.
• Двоскладові: clever → cleverer / more clever, simple → simpler.
• The … the…: the more, the better.
• Less + adj для протилежного: less expensive.`,
`Rules:
• One-syllable adjectives: +er (tall → taller); two-syllable in -y: -ier (happy → happier); long ones — more + adj (more interesting).
• Than introduces the comparison: she is taller than her brother.
• Consonant doubling: big → bigger; -e + r: nice → nicer.
Exceptions:
• Irregular: good → better, bad → worse, far → farther/further, little → less, many/much → more.
• Some two-syllable: clever → cleverer / more clever, simple → simpler.
• The … the…: the more, the better.
• Less + adj for the opposite: less expensive.`);

    D('superlatives',
`Правила:
• The + adj-est (the tallest); двоскладові на -y: the happiest; довгі — the most + adj (the most beautiful).
• Після найвищого ступеня — in/of: the tallest in the class, the best of all.
• Наявність the майже обов’язкова.
Винятки:
• Неправильні: the best, the worst, the furthest, the least, the most.
• Прислівники: the fastest (fast), the most carefully.
• Без the, коли немає порівняння з групою: she is happiest when she sings.
• Один із найбільш…: one of the most important.`,
`Rules:
• The + adj-est (the tallest); two-syllable in -y: the happiest; long ones — the most + adj (the most beautiful).
• After a superlative — in/of: the tallest in the class, the best of all.
• The is almost always required.
Exceptions:
• Irregular: the best, the worst, the furthest, the least, the most.
• Adverbs: the fastest (fast), the most carefully.
• No the when there is no comparison with a group: she is happiest when she sings.
• One of the most…: one of the most important.`);

    D('as-as-too-enough',
`Правила:
• As + прикметник/прислівник + as: рівний ступінь (as tall as his father).
• Not as/so … as: менший ступінь (not as expensive as).
• Too + прикметник — «занадто» (негативно): it is too hot.
• Прикметник + enough — «достатньо»: old enough to drive; enough + іменник: enough money.
Винятки:
• Too much/too many з іменниками: too much noise, too many people.
• Enough ставиться ПІСЛЯ прикметника, але ПЕРЕД іменником.
• So … that / such … that — результат: so tired that…, such a long day that…
• As much/many as для кількості: as many as ten.`,
`Rules:
• As + adjective/adverb + as: equal degree (as tall as his father).
• Not as/so … as: lower degree (not as expensive as).
• Too + adjective — "excessively" (negative): it is too hot.
• Adjective + enough — "sufficiently": old enough to drive; enough + noun: enough money.
Exceptions:
• Too much/too many with nouns: too much noise, too many people.
• Enough comes AFTER an adjective but BEFORE a noun.
• So … that / such … that — result: so tired that…, such a long day that…
• As much/many as for amounts: as many as ten.`);

    D('adjective-order',
`Правила:
• Порядок: думка → розмір → вік → форма → колір → походження → матеріал → призначення + іменник: a lovely small old round red Italian wooden table.
• Запам’ятовують як OSASCOMP.
• Зазвичай не більше трьох прикметників.
Винятки:
• Кома й and між прикметниками однієї категорії: a tall, handsome man.
• Після дієслів зв’язки прикметники в будь-якому порядку: the table is old and wooden.
• Окремі сталі пари: black and white, big bad wolf.`,
`Rules:
• Order: opinion → size → age → shape → colour → origin → material → purpose + noun: a lovely small old round red Italian wooden table.
• Remembered as OSASCOMP.
• Usually no more than three adjectives.
Exceptions:
• Comma/and between adjectives of the same category: a tall, handsome man.
• After linking verbs any order works: the table is old and wooden.
• Set pairs: black and white, big bad wolf.`);

    D('adverbs-manner',
`Правила:
• Прикметник + -ly: quick → quickly, careful → carefully; приголосна + y → -ily: happy → happily.
• Ставляться після дієслова або його об’єкта: she sings beautifully; he did it carefully.
• Модифікують дієслово, прикметник або інший прислівник.
Винятки:
• Однакова форма прикметника й прислівника: fast, hard, late, early, daily, straight.
• Good → well (прислівник): she plays well.
• Hardly = майже ні, lately = останнім часом (не від hard/late).
• Дієслова зв’язки беруть прикметник: it smells good, не well (але he is well — здоровий).
• Прикметники на -ly: friendly, lovely, lonely — не прислівники.`,
`Rules:
• Adjective + -ly: quick → quickly, careful → carefully; consonant + y → -ily: happy → happily.
• Placed after the verb or its object: she sings beautifully; he did it carefully.
• They modify a verb, an adjective or another adverb.
Exceptions:
• Same form for adjective and adverb: fast, hard, late, early, daily, straight.
• Good → well (adverb): she plays well.
• Hardly = almost not, lately = recently (not from hard/late).
• Linking verbs take adjectives: it smells good, not well (but he is well — healthy).
• Adjectives in -ly: friendly, lovely, lonely — not adverbs.`);

    D('adverbs-frequency',
`Правила:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• Перед основним дієсловом: she often reads; після be: he is always late; між допоміжним і основним: I have never seen it.
• Sometimes, usually, often можуть стояти на початку або в кінці для емфази.
Винятки:
• Never, hardly ever, rarely — вже заперечні: не вживаються з not (I never eat meat, не I don’t never).
• Always у present continuous — роздратування: he is always complaining.
• Фрази-частоти: every day, twice a week, once a month — в кінці речення.`,
`Rules:
• Always, usually, often, sometimes, occasionally, rarely, seldom, never.
• Before the main verb: she often reads; after be: he is always late; between auxiliary and main verb: I have never seen it.
• Sometimes, usually, often can start or end the sentence for emphasis.
Exceptions:
• Never, hardly ever, rarely are already negative: not used with not (I never eat meat, not I don’t never).
• Always in the present continuous — annoyance: he is always complaining.
• Frequency phrases: every day, twice a week, once a month — at the end of the sentence.`);

    D('personal-pronouns',
`Правила:
• Підмет: I, you, he, she, it, we, they; додаток: me, you, him, her, it, us, them.
• Додаток після дієслова або прийменника: she called me; give it to them.
• It — речі, тварини, безособове; he/she — особи.
Винятки:
• Після be у розмові — додаткова форма: it’s me (формально: it is I).
• У порівняннях: taller than I (формально) / than me (розм.).
• They для однієї особи невідомої статі: someone called — they left a message.
• You — ти й ви; для множини — you guys, y’all (розм.).`,
`Rules:
• Subject: I, you, he, she, it, we, they; object: me, you, him, her, it, us, them.
• Object forms after a verb or preposition: she called me; give it to them.
• It — things, animals, impersonal; he/she — persons.
Exceptions:
• After be in speech — the object form: it’s me (formally: it is I).
• In comparisons: taller than I (formal) / than me (informal).
• They for one person of unknown gender: someone called — they left a message.
• You — singular and plural; for emphasis you guys, y’all (informal).`);

    D('reflexive-pronouns',
`Правила:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• Дія повертається на виконавця: she hurt herself; he taught himself.
• Для підкреслення: I did it myself; by + reflexive = самотужки: by myself.
Винятки:
• Багато дієслів, зворотних в інших мовах, у англійській без reflexive: wash, shave, dress, feel, relax, hurry (he washed, not he washed himself — якщо очевидно).
• Множина — -selves, однина — -self.
• Each other / one another — взаємність, не reflexive: they love each other.`,
`Rules:
• Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.
• The action returns to the doer: she hurt herself; he taught himself.
• For emphasis: I did it myself; by + reflexive = alone: by myself.
Exceptions:
• Many verbs reflexive in other languages take no reflexive in English: wash, shave, dress, feel, relax, hurry (he washed — not he washed himself when obvious).
• -selves for plural, -self for singular.
• Each other / one another — reciprocal, not reflexive: they love each other.`);

    D('relative-pronouns',
`Правила:
• Who — особи; which — речі; that — особи й речі (обмежувальні речення); whose — належність; where — місце; when — час.
• Who/which/that можуть бути підметом (the man who called) або додатком (the book that I read).
• Whom — формальний додаток (the man whom I met).
Винятки:
• Займенник (that/who/which) можна опустити, коли він — додаток: the book (that) I read.
• That не вживається після прийменника та в необмежувальних реченнях.
• Which може відноситись до цілого речення: he was late, which annoyed me.
• Whose — і для речей: a house whose roof is red.`,
`Rules:
• Who — people; which — things; that — people and things (defining clauses); whose — possession; where — place; when — time.
• Who/which/that may be subject (the man who called) or object (the book that I read).
• Whom — formal object (the man whom I met).
Exceptions:
• That/who/which can be dropped when it is the object: the book (that) I read.
• That is not used after a preposition or in non-defining clauses.
• Which may refer to the whole clause: he was late, which annoyed me.
• Whose — also for things: a house whose roof is red.`);

    D('defining-non-defining',
`Правила:
• Обмежувальне (defining) — необхідне для ідентифікації, БЕЗ ком: the girl who lives here is my cousin.
• Необмежувальне (non-defining) — додаткова інформація, У КОМАХ: my sister, who lives here, is a nurse.
• У необмежувальних не вживається that і не опускається займенник.
Винятки:
• Власні імена майже завжди з необмежувальним реченням: Paris, which is in France…
• Which у необмежувальному може стосуватись усього речення.
• Where/when у необмежувальних: in 2020, when the pandemic started, we moved.`,
`Rules:
• Defining — needed to identify, NO commas: the girl who lives here is my cousin.
• Non-defining — extra information, IN COMMAS: my sister, who lives here, is a nurse.
• In non-defining clauses that is not used and the pronoun cannot be dropped.
Exceptions:
• Proper names almost always take a non-defining clause: Paris, which is in France…
• Which in a non-defining clause may refer to the whole sentence.
• Where/when in non-defining clauses: in 2020, when the pandemic started, we moved.`);

    D('indefinite-pronouns',
`Правила:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — ствердження; any- — заперечення й питання; no- вже заперечення; every- — усе/всі.
• Дієслово — в однині: everyone is here.
• Для займенників з -body/-one: they/their (everyone brought their book).
Винятки:
• Some- у питаннях-пропозиціях: would you like something to drink?
• Any- у ствердженні = «будь-який»: anyone can do it.
• Не вживайте подвійне заперечення: I don’t see anything (не nothing).
• Else: someone else, nothing else.`,
`Rules:
• Some-/any-/no-/every- + -one/-body/-thing/-where.
• Some- — positives; any- — negatives and questions; no- is already negative; every- — all.
• The verb is singular: everyone is here.
• For -body/-one pronouns use they/their (everyone brought their book).
Exceptions:
• Some- in offers: would you like something to drink?
• Any- in a positive = "any at all": anyone can do it.
• No double negatives: I don’t see anything (not nothing).
• Else: someone else, nothing else.`);

    D('there-is-it',
`Правила:
• There is/are/was/were + підмет: існування (there is a cat on the roof; there are three apples).
• Дієслово узгоджується з наступним іменником: there is a book, there are books.
• It — формальний підмет для погоди, часу, відстані, оцінок: it is raining; it is half past nine; it is far.
Винятки:
• Розмовно there’s + множина: there’s two people (допустимо усно).
• There ≠ they’re ≠ their (орфографія).
• It is … that/to: it is important to learn.
• There seems/appears/happens to be…`,
`Rules:
• There is/are/was/were + subject: existence (there is a cat on the roof; there are three apples).
• The verb agrees with the following noun: there is a book, there are books.
• It — dummy subject for weather, time, distance, evaluations: it is raining; it is half past nine; it is far.
Exceptions:
• Informally there’s + plural: there’s two people (accepted in speech).
• There ≠ they’re ≠ their (spelling).
• It is … that/to: it is important to learn.
• There seems/appears/happens to be…`);

    D('negatives',
`Правила:
• Допоміжне + not: is not/isn’t, have not/haven’t, will not/won’t; у простих часах — do/does/did + not + основа: she doesn’t like it.
• No, never, nobody, nothing, nowhere, neither, none також заперечують.
• У англійській ОДНЕ заперечення в частині: I don’t know anything (= I know nothing).
Винятки:
• Be/модальні — без do: she isn’t, he can’t.
• Подвійне заперечення в стандартній мові — помилка, у діалектах — підсилення.
• Заперечення + any → no-: I don’t have any money = I have no money.
• Neither/nor → інверсія: neither do I, nor will he.
• Don’t + дієслово — заборона (don’t go), без підмета.`,
`Rules:
• Auxiliary + not: is not/isn’t, have not/haven’t, will not/won’t; in simple tenses do/does/did + not + base verb: she doesn’t like it.
• No, never, nobody, nothing, nowhere, neither, none also negate.
• English uses ONE negative per clause: I don’t know anything (= I know nothing).
Exceptions:
• Be/modals — no do: she isn’t, he can’t.
• Double negatives are wrong in standard English; in dialects they intensify.
• Negative + any → no-: I don’t have any money = I have no money.
• Neither/nor → inversion: neither do I, nor will he.
• Don’t + verb — a prohibition (don’t go), no subject.`);

    D('questions',
`Правила:
• Yes/no: допоміжне перед підметом (do you like it? is she here? have you finished?).
• Wh-питання: питальне слово + допоміжне + підмет + дієслово: where do you live?
• Питання до підмета — без do і без інверсії: who called? what happened?
• В простих часах без допоміжного — do/does/did.
Винятки:
• Be в простих часах — сам виходить на початок: is she tired?
• Непрямі питання — прямий порядок слів: I wonder where she lives (не where does she live).
• Ввічливі питання: could you tell me…?
• Заперечні питання: don’t you like it? / do you not like it? (формально).`,
`Rules:
• Yes/no: auxiliary before the subject (do you like it? is she here? have you finished?).
• Wh-questions: question word + auxiliary + subject + verb: where do you live?
• Subject questions — no do and no inversion: who called? what happened?
• In simple tenses without an auxiliary — do/does/did.
Exceptions:
• Be in the simple tenses moves itself to the front: is she tired?
• Indirect questions — statement word order: I wonder where she lives (not where does she live).
• Polite questions: could you tell me…?
• Negative questions: don’t you like it? / do you not like it? (formal).`);

    D('conjunctions',
`Правила:
• Сурядні (FANBOYS): for, and, nor, but, or, yet, so — з’єднують рівнозначні частини; перед ними — кома між двома реченнями.
• Підрядні: because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas — вводять підрядне речення.
• Підрядне може стояти на початку (кома) або після головного (без коми).
Винятки:
• Although/though/even though ≠ despite/in spite of (+ іменник/-ing): although it rained / despite the rain.
• Since — час («з тих пір») або причина («оскільки»).
• Because ≠ because of (+ іменник): because it rained / because of the rain.
• Whereas/while у значенні протиставлення.`,
`Rules:
• Coordinating (FANBOYS): for, and, nor, but, or, yet, so — join equal parts; a comma before them between two clauses.
• Subordinating: because, although/though, while, when, if, unless, since, after, before, until, as soon as, whereas — introduce a subordinate clause.
• The subordinate clause may come first (comma) or after the main clause (no comma).
Exceptions:
• Although/though/even though ≠ despite/in spite of (+ noun/-ing): although it rained / despite the rain.
• Since — time ("from then") or reason ("as").
• Because ≠ because of (+ noun): because it rained / because of the rain.
• Whereas/while express contrast.`);

    D('linking-words',
`Правила:
• Протиставлення: however, nevertheless, on the other hand, in contrast, whereas.
• Наслідок: therefore, consequently, as a result, thus, so.
• Додавання: moreover, furthermore, besides, in addition, also.
• Порядок: firstly, then, finally; приклад: for example, for instance.
• На початку речення — після коми; з крапкою з комою між реченнями.
Винятки:
• However також значить «як би не» (however hard he tries) — це не зв’язка.
• Therefore, however можуть стояти у середині в комах: it was late; we, however, continued.
• But/and/so — сполучники, не зв’язки: перед ними крапка не потрібна.
• Not only … but also — парний зв’язок з інверсією.`,
`Rules:
• Contrast: however, nevertheless, on the other hand, in contrast, whereas.
• Result: therefore, consequently, as a result, thus, so.
• Addition: moreover, furthermore, besides, in addition, also.
• Order: firstly, then, finally; example: for example, for instance.
• At the start of a sentence — followed by a comma; between clauses preceded by a semicolon.
Exceptions:
• However also means "no matter how" (however hard he tries) — not a connector then.
• Therefore, however can sit in the middle between commas: it was late; we, however, continued.
• But/and/so are conjunctions, not connectors: no full stop before them.
• Not only … but also — a paired connector with inversion.`);

    D('cleft',
`Правила:
• It + be + виділена частина + that/who: it was Tom who broke it; it was yesterday that I met her.
• What-cleft: what I need is a rest; all I want is peace.
• Підкреслює новий або контрастний елемент.
Винятки:
• Who — тільки для осіб; that — для всього (особи також).
• Дієслово після who/that узгоджується з виділеним: it is I who am responsible (формально).
• Reverse wh-cleft: a rest is what I need.
• Не вживайте у ствердженнях без контрасту: звучить нав’язливо.`,
`Rules:
• It + be + highlighted part + that/who: it was Tom who broke it; it was yesterday that I met her.
• What-cleft: what I need is a rest; all I want is peace.
• Stresses new or contrastive information.
Exceptions:
• Who — only for persons; that — for everything (persons too).
• The verb after who/that agrees with the highlighted word: it is I who am responsible (formal).
• Reverse wh-cleft: a rest is what I need.
• Not for neutral statements: it sounds insistent.`);

    D('inversion',
`Правила:
• Після never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little на початку — допоміжне перед підметом: never have I seen such a view.
• В простих часах — do/does/did: rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
Винятки:
• Не потрібна, якщо прислівник не на початку: I have never seen such a view.
• Only after/only when/only if — інверсія в головній частині: only after dinner did he speak.
• So/such на початку: so tired was he that…
• Не потрібна, коли заперечний прислівник — частина підмета: hardly anyone came.`,
`Rules:
• After never, rarely, seldom, hardly, scarcely, no sooner, not only, only then, little at the start — the auxiliary precedes the subject: never have I seen such a view.
• In simple tenses — do/does/did: rarely do we eat out; not only did he lie.
• Hardly/scarcely … when/before; no sooner … than.
Exceptions:
• Not needed when the adverb is not first: I have never seen such a view.
• Only after/only when/only if — inversion in the main clause: only after dinner did he speak.
• So/such at the start: so tired was he that…
• Not needed when the negative word is part of the subject: hardly anyone came.`);

    D('participle-clauses',
`Правила:
• Present participle (-ing): дії одночасні, активний стан — walking home, I met Tom.
• Past participle: пасив — tired, she went to bed; built in 1900, the house is old.
• Perfect participle (having + participle): дія раніше — having finished, he left.
• Підмет підрядного й головного речення — той самий.
Винятки:
• «Висячий participle» (dangling) — помилка, коли підмети різні: walking down the street, the trees looked beautiful (хто йшов?).
• Після зв’язок: while walking, after finishing, on arriving.
• Not + participle: not knowing what to do, she waited.`,
`Rules:
• Present participle (-ing): simultaneous actions, active — walking home, I met Tom.
• Past participle: passive — tired, she went to bed; built in 1900, the house is old.
• Perfect participle (having + participle): earlier action — having finished, he left.
• The subject of the participle clause and the main clause is the same.
Exceptions:
• A dangling participle is an error when the subjects differ: walking down the street, the trees looked beautiful (who was walking?).
• After conjunctions: while walking, after finishing, on arriving.
• Not + participle: not knowing what to do, she waited.`);

    D('so-neither',
`Правила:
• So + допоміжне + підмет — згода зі ствердженням: "I love pizza." "So do I."
• Neither/nor + допоміжне + підмет — згода з запереченням: "I can’t swim." "Neither can I."
• Допоміжне те ж, що в початковому реченні; якщо його нема — do/does/did.
Винятки:
• Me too / me neither — розмовна заміна.
• З be: "I’m tired." "So am I."
• So I do (без інверсії) означає «справді так»: "You like it." "So I do." — це не те саме, що So do I.
• Not … either замість neither: I don’t either.`,
`Rules:
• So + auxiliary + subject — agreement with a positive: "I love pizza." "So do I."
• Neither/nor + auxiliary + subject — agreement with a negative: "I can’t swim." "Neither can I."
• Same auxiliary as in the first sentence; if none — do/does/did.
Exceptions:
• Me too / me neither — informal replacements.
• With be: "I’m tired." "So am I."
• "So I do" (no inversion) means "indeed I do" — different from "So do I".
• Not … either instead of neither: I don’t either.`);

    D('time-markers',
`Правила:
• Past simple: yesterday, last week, ago, in 2010, then, when.
• Present perfect: already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous: now, at the moment, currently, these days.
• Future: tomorrow, next week, soon, by then, in a year.
• Ставляться на початку або в кінці речення; частотні — перед дієсловом.
Винятки:
• Already/yet: already у ствердженнях, yet у запереченнях і питаннях (але still — «все ще»).
• Just: present perfect (I have just left) або past simple (амер. I just left).
• Ago — тільки з past simple, і завжди ПІСЛЯ періоду: two years ago.
• For vs since: for + тривалість, since + початок.`,
`Rules:
• Past simple: yesterday, last week, ago, in 2010, then, when.
• Present perfect: already, yet, just, ever, never, recently, lately, so far, since, for.
• Continuous: now, at the moment, currently, these days.
• Future: tomorrow, next week, soon, by then, in a year.
• At the start or end of the sentence; frequency words before the verb.
Exceptions:
• Already/yet: already in positives, yet in negatives and questions (still = "still").
• Just: present perfect (I have just left) or past simple (American I just left).
• Ago — only with the past simple, and always AFTER the period: two years ago.
• For vs since: for + duration, since + starting point.`);

    D('for-since-ago-during',
`Правила:
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
`Rules:
• For + duration: for two years, for ten minutes.
• Since + starting point: since 2015, since Monday, since I was a child.
• Ago + past simple: five minutes ago.
• During + event/period: during the war, during the summer.
• While + subject + verb: while I was sleeping.
Exceptions:
• For + present perfect (still going): I have lived here for years; for + past simple (finished duration): I lived there for two years.
• During answers "when"; for answers "how long".
• For is often dropped: I waited (for) an hour; not dropped with the present perfect for duration.
• Since + past simple in the clause: since I left school.`);

    D('prepositions-time',
`Правила:
• At + точний час і окремі моменти: at 5 pm, at noon, at night, at the weekend (брит.).
• On + дні й дати: on Monday, on May 3, on my birthday, on Friday morning.
• In + місяці, роки, пори року, частини дня, століття: in July, in 2020, in summer, in the morning.
Винятки:
• At night, але in the morning/afternoon/evening, on Monday morning.
• At the weekend (брит.) / on the weekend (амер.).
• Не вживаються з next/last/this/every/tomorrow: next week, last Monday, this morning.
• In 10 minutes (через) vs within 10 minutes (протягом).`,
`Rules:
• At + exact time and certain moments: at 5 pm, at noon, at night, at the weekend (British).
• On + days and dates: on Monday, on May 3, on my birthday, on Friday morning.
• In + months, years, seasons, parts of the day, centuries: in July, in 2020, in summer, in the morning.
Exceptions:
• At night, but in the morning/afternoon/evening, on Monday morning.
• At the weekend (British) / on the weekend (American).
• No preposition with next/last/this/every/tomorrow: next week, last Monday, this morning.
• In 10 minutes ("after") vs within 10 minutes ("during").`);

    D('prepositions-place',
`Правила:
• In — всередині (in the box, in London); on — на поверхні (on the table); at — точка (at the door, at school).
• До/з: to (напрямок), from, into, out of, onto, off.
• Положення: under, over, above, below, between, among, behind, in front of, next to, opposite.
Винятки:
• In a car/taxi, але on a bus/train/plane/bike.
• At home, at work, at school (без артикля); in bed, on the way.
• In the corner (внутрішній кут) / on the corner (вулиці); at the corner (точка перехрестя).
• Over/above і under/below відрізняються: over — вертикально над, above — вище на рівні.`,
`Rules:
• In — inside (in the box, in London); on — on a surface (on the table); at — a point (at the door, at school).
• To/from: to (direction), from, into, out of, onto, off.
• Position: under, over, above, below, between, among, behind, in front of, next to, opposite.
Exceptions:
• In a car/taxi, but on a bus/train/plane/bike.
• At home, at work, at school (no article); in bed, on the way.
• In the corner (inside) / on the corner (of streets); at the corner (a point of the crossing).
• Over/above and under/below differ: over — directly over, above — higher up.`);

    D('verb-preposition',
`Правила:
• Прийменник залежить від дієслова/прикметника й не випливає з перекладу: depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• Після прийменника — іменник, займенник або -ing: good at swimming.
• Прийменник лишається при питанні/відносному реченні: who are you waiting for? the man I talked to.
Винятки:
• Одні дієслова — без прийменника там, де в інших мовах він є: enter the room, discuss the problem, marry her, approach the door, reach the city.
• Одне дієслово — різні прийменники з різним значенням: look at (дивитись), look for (шукати), look after (доглядати).
• Different from/to/than — залежно від варіанту англійської.
• Arrive at (будівля), arrive in (місто/країна).`,
`Rules:
• The preposition depends on the verb/adjective and does not follow from translation: depend on, listen to, wait for, look at, afraid of, good at, interested in, married to, different from.
• After a preposition — a noun, pronoun or -ing: good at swimming.
• The preposition stays in questions/relative clauses: who are you waiting for? the man I talked to.
Exceptions:
• Some verbs take no preposition where other languages do: enter the room, discuss the problem, marry her, approach the door, reach the city.
• One verb — different prepositions with different meanings: look at, look for, look after.
• Different from/to/than — depending on the variety of English.
• Arrive at (a building), arrive in (a city/country).`);

    D('purpose-cause-result',
`Правила:
• Мета: to + інфінітив (he saved money to travel), in order to / so as to (формальніше), so that + підмет + can/will/would (so that we can see better).
• Причина: because + речення, because of + іменник, since/as, due to, owing to.
• Наслідок: so, therefore, as a result; so + adj + that; such + (a) + noun + that.
Винятки:
• Заперечна мета: in order not to / so as not to (не to not).
• So that + would/could у минулому: she left early so that she could catch the train.
• Because of ≠ because: not because of it rained.
• Such + a + adj + noun / so + adj: such a long day / so long a day (формально).`,
`Rules:
• Purpose: to + infinitive (he saved money to travel), in order to / so as to (more formal), so that + subject + can/will/would (so that we can see better).
• Cause: because + clause, because of + noun, since/as, due to, owing to.
• Result: so, therefore, as a result; so + adj + that; such + (a) + noun + that.
Exceptions:
• Negative purpose: in order not to / so as not to (not to not).
• So that + would/could in the past: she left early so that she could catch the train.
• Because of ≠ because: not because of it rained.
• Such + a + adj + noun / so + adj: such a long day / so long a day (formal).`);


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
