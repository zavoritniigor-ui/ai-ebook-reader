# What the real AI answers in Ukrainian — measured on production

The linguistic review of 2026-11-15 (PRs #408–#411) changed the translation prompts: `aiTranslateText`
(`js/translation-ai.js`) now names the likely source language, and every prompt whose output is Ukrainian carries
`languageNormNote()` (`js/core-languages.js`) — literary Ukrainian, no Russianisms, quotes «». Those changes were never
tried against a real model, because a mocked test cannot show what a model writes.

This is that measurement. **No app behaviour was changed**: nothing here is a defect in the code.

## How it was measured

The app's own `aiTranslateText()` was called in the **production** page
(`https://ai-ebook-reader.pages.dev`) driven by headless Chrome over CDP (`tools/uk_translation_review.py`,
the same `tests/browser_cdp.py` harness the browser suites use). No API key was used, read or stored: production's
`/api/ai` Function adds the site's Cloudflare secret server-side, so this is exactly what a keyless visitor gets.

* Measured 2026-11-26. `js/translation-ai.js` and `js/core-languages.js` as served by production were **byte-identical**
  to `origin/main` at `733e6f3`, so these numbers describe today's `main`.
* Each case was sent to one provider explicitly (`aiTranslateText`'s `provider` argument) so the two can be compared.
  In normal use the app asks **Groq first** and OpenAI only as the backup (`aiProviderForTask`), so the Groq column is
  what the reader actually sees.
* Models: Groq `openai/gpt-oss-120b`, OpenAI `gpt-5.4`. 45 cases per provider, 0 empty replies, 0 errors.
* Latency: Groq min 229 / median 484 / max 791 ms. OpenAI min 798 / median 1046 / max 2141 ms.
* Cases: all 20 lines of `dict/review_sentences.tsv` as words-in-context, 20 whole sentences from that file and
  `dict/test_sentences_hard.tsv` (idioms, rare tenses, registers, a homograph pair), and 5 short foreign quotes inside
  an English sentence.

Verdicts below: **ok** = correct and idiomatic · **sense** = wrong meaning · **calque** = Russianism or word-for-word
copy · **form** = wrong Ukrainian form/grammar · **weak** = understandable but not what a careful translator writes.

## 1. A tapped word, with its sentence as context

| Word | Context sentence | Groq | | OpenAI | | Note |
|---|---|---|---|---|---|---|
| file | Nous attendons dans la **file** pour la carte d'étudiant. | черга | ok | черга | ok | Not «файл» — the context did its job. |
| ménage | ma mère fait le **ménage** | прибирання | ok | прибирання | ok | |
| beau | Il fait **beau** aujourd'hui | гарна | ok | гарна | ok | Feminine, agreeing with «погода»; a sensible reading of a weather phrase. |
| rendu | Je me suis **rendu** compte que… | зрозумів | ok | зрозумів | ok | Both add «se rendre compte» as the context note. The documented fix works. |
| besoin | Les enfants ont **besoin** de dormir | потреба | ok | потреба | ok | |
| face | une boulangerie en **face** de la gare | напроти | ok | навпроти | ok | Both normative; «навпроти» is the more literary. |
| crémaillère | Nos voisins pendent la **crémaillère** | новосіль | form | новосілля | ok | «новосіль» is not a Ukrainian word. **Unstable** — see §4. |
| pris | Elle a **pris** le train de huit heures | взяла | calque | сіла | ok | «взяла потяг» is a calque; French *prendre le train* = «сіла на потяг». Stable, 4/4. |
| devoirs | Paul fait ses **devoirs** | домашні завдання | ok | домашнє завдання | ok | |
| emploi | cherche un **emploi** | робота | ok | робота | ok | |
| coup | donner un **coup** de main | допомога | ok | допомога | ok | |
| lève | ma grand-mère se **lève** tôt | встає | ok | встає | ok | |
| rendez-vous | Nous avons **rendez-vous** devant le musée | зустріч | ok | зустріч | ok | |
| pose | Le professeur **pose** une question | запитує | weak | ставить | ok | The prompt forbids exactly this («не замінюй слово перекладом словосполучення»): *poser* = «ставить». Stable, 4/4. |
| oublié | j'ai **oublié** mon parapluie | забув | ok | забув | ok | |
| yeux | coûte les **yeux** de la tête | очі | ok | очі | ok | Correct as a word, although the same idiom breaks as a sentence (§2). |
| temps | Je n'ai pas le **temps** | час | ok | час | ok | |
| été | Ils se sont mariés l'**été** dernier | літо | ok | літо | ok | The noun, not the participle of *être* — the hard case, right on both. |
| tombé | Pierre est **tombé** amoureux | закохався | ok | закохався | ok | |
| rangeons | nous **rangeons** nos livres | кладемо | ok | складаємо | ok | |

**Words: Groq 17/20 clean, OpenAI 20/20.**

## 2. Whole sentences and fragments

| Source | Groq | | OpenAI | | Note |
|---|---|---|---|---|---|
| Cette robe coûte les yeux de la tête ! | Ця сукня коштує **очі в голові**! | calque | Ця сукня коштує шалені гроші! | ok | The idiom copied word for word; meaningless in Ukrainian. **The worst single result.** |
| Tu peux me donner un coup de main avec ces valises ? | Можеш допомогти мені з цими валізами? | ok | Ти можеш допомогти мені з цими валізами? | ok | |
| Nos voisins pendent la crémaillère samedi soir. | …влаштовують новосільну вечірку… | ok | …справляють новосілля… | ok | |
| Je me suis rendu compte que j'avais oublié mon cahier. | Я зрозумів, що забув свій зошит. | ok | Я зрозумів, що забув свій зошит. | ok | |
| Il nous a posé un lapin pour la troisième fois. | Він втретє підвів нас. | ok | Він уже втретє не прийшов на домовлену зустріч. | ok | |
| Il pleuvait des cordes quand nous sommes sortis. | Коли ми вийшли, лило як з відра. | ok | Коли ми вийшли, лило як із відра. | ok | The Ukrainian idiom, not a copy. |
| Ils ont fait la grasse matinée jusqu'à midi. | Вони спали до полудня. | ok | Вони проспали до полудня. | ok | |
| Nous avons du pain sur la planche cette semaine. | У нас цього тижня багато справ. | ok | Цього тижня в нас багато роботи. | ok | |
| Elle s'est levée du pied gauche ce matin. | …встала **з лівої ноги**. | calque | …встала не з тієї ноги. | ok | Ukrainian says «не з тієї ноги». **Unstable** — see §4. |
| Mon grand-père a vendu la mèche au dîner. | Мій дід розкрив таємницю… | ok | Мій дідусь… проговорився. | ok | |
| Nous allons prendre le taureau par les cornes. | Ми візьмемо **біка** за роги | form | Ми візьмемо бика за роги. | ok | Wrong accusative («бика»), and the final period is missing. |
| Petit à petit, l'oiseau fait son nid. | Поступово пташка будує гніздо. | ok | Потроху пташка в'є своє гніздечко. | ok | OpenAI keeps the proverb's tone («в'є гніздечко»). |
| Il fallut que nous partissions avant l'aube. | Ми мали піти до світанку. | ok | Нам довелося вирушити до світанку. | ok | A tense Ukrainian has no form for; both resolve it sensibly. |
| Qu'il fût roi ou mendiant, il riait de la même façon. | **Будь то** король чи бідняк… | calque | Хай він був королем чи жебраком… | ok | «будь то» is a Russianism; Ukrainian «хай (би)…», «чи то… чи то». |
| S'ils avaient su, ils seraient restés chez eux. | Якби вони знали, вони б залишились вдома. | ok | Якби вони знали, то залишилися б удома. | ok | |
| Plus il parlait, moins on le comprenait. | **Чим більше**… тим менше… | weak | Що більше… то менше… | ok | «чим…тим» is tolerated but is the Russian pattern; «що…то» is the literary one. |
| C'est ouf, j'ai kiffé ce concert ! | Це божевільно, я кайфував від цього концерту. | weak | Це шалено, мені дуже сподобався цей концерт! | ok | Groq keeps the slang register but «божевільно» is odd; OpenAI is clean but flattens the slang. |
| Les poules du couvent couvent leurs œufs. | Курки монастиря висиджують свої яйця. | weak | Кури монастиря висиджують свої яйця. | weak | **Both resolve the homograph correctly** (noun *couvent* + verb *couvent*). Phrasing should be «монастирські кури». |
| Tu me casses les pieds avec tes questions ! | **Ти мене надокучаєш**… | form | Ти мені набрид своїми запитаннями! | ok | «надокучати» takes the dative: «ти мені надокучаєш». |
| Rarement ai-je vu une mer aussi calme. | Рідко я бачив море таке спокійне. | weak | Рідко я бачив таке спокійне море. | ok | Groq keeps the French word order. |

**Sentences: Groq 12/20 clean (5 clearly wrong, 3 weak), OpenAI 19/20 clean.**

## 3. A foreign quote inside an English book

`srcCode` is whatever `langForText()` (`js/lang-detect.js`) really returns for the quote inside its English sentence.

| Quote | Real language | `srcCode` passed | Groq | OpenAI | Verdict |
|---|---|---|---|---|---|
| Was ist das? | German | **en** | Що це? | Що це таке? | ok |
| Muchas gracias | Spanish | **en** | Щиро дякую | Щиро дякую | ok |
| Che sarà, sarà | Italian | **fr** | Що буде, те й буде | Що буде, те й буде | ok |
| Wie geht's dir? | German | **en** | Як ти? | Як ти? | ok |
| Dziękuję bardzo | Polish | **en** | Дуже дякую | Щиро дякую | ok |

**The language detector was wrong on all 5, and both models translated all 5 correctly anyway.** This is the
stage-4 hedge working as designed: the prompt calls the language only «ймовірна» and adds «якщо текст явно іншою
мовою, перекладай з неї», so a wrong guess does not force the model to misread the quote. Worth keeping exactly as it
is — a confident «the source language is English» would have broken these.

## 4. Stability: Groq's errors repeated 4×

The same case was asked four times (`state.translationCache` cleared each time) to tell a stable failure from one
unlucky sample. OpenAI was asked twice and gave the same correct answer every time.

| Case | Groq, four runs | Stable? |
|---|---|---|
| crémaillère (word) | новосіль · вітальна вечірка · весільна · **веселка** | No — **four different answers, three wrong**, one («веселка» = rainbow) a different word entirely |
| coûte les yeux de la tête | очі в голові · очі гроші · очей голови · цілий статок | No — three broken calques, one correct |
| du pied gauche | з лівої ноги · не в найкращому настрої · з лівого боку · прокинулася з лівого боку | No — one acceptable, three wrong |
| casses les pieds | Ти мене надокучаєш · Ти мені набридлий · Ти мене дратуєш | No — «набридлий» is not a verb form at all |
| taureau par les cornes | біка · бика · схопимо бика · бика | Mostly fixed after the first run |
| Qu'il fût roi ou mendiant | Будь то · Хоч він був · То був він і король, і бідняк (wrong sense) | No |
| **pose** (word) | запитує · запитує · запитує · запитує | **Yes** — a stable violation of the prompt's own rule |
| **pris** (word) | взяла · взяла · взяла · взяла | **Yes** — a stable calque |

This is the most useful finding: for a **rare** word or a **set expression**, Groq's answer is not merely sometimes
wrong, it is *not reproducible*. The same tap can give «новосілля» or «веселка». For common words it is stable and
correct.

## 5. Does the literary-norm note do anything?

Measured directly: the app's own sentence prompt was built in the page and sent twice per case — once as shipped,
once with `languageNormNote()` removed — on seven sentences that pull towards exactly the forms the note names. The
whole A/B was then repeated, because Groq varies between runs (§4) and a single pass cannot tell the prompt's effect
from that variation.

| Sentence pulls towards | Run 1: with note / without | Run 2: with note / without |
|---|---|---|
| брати / приймати участь | Ми **брали** участь… / Ми **брали** участь… | Ми **брали** участь… / Ми **взяли** участь… |
| протягом / на протязі | **Протягом** усього тижня… / **Протягом** усього тижня… | identical, both «протягом» |
| наступний / слідуючий | **Наступного** місяця… до Ліона / same | **Наступного** місяця… до **Ліону** / …до Ліона |
| мені здається / кажеться | **Мені здається**… / **Мені здається**… | identical, both «мені здається» |
| вибачте / вибачаюсь | **Вибачте**… / **Вибачте**… | identical, both «вибачте» |
| quotes «» / "" | Вона сказала: **«Привіт»** / **«привіт»** | Вона сказала: **«доброго дня»** / **привіт** (no quotes) |
| що більше…то / чим більше…тим | **Чим більше… тим менше** / same | **Чим більше… тим менше** / same |

**The note cannot be credited with the Ukrainian quality seen above, and has one real but small effect.**

* **None of the six Russianisms it names ever appeared** — with or without it. The model writes «брати участь»,
  «протягом», «наступний», «мені здається», «вибачте» on its own. The note is not what prevents them.
* **The one calque it should have caught survives it untouched**: «чим більше… тим менше» came out identically with
  and without the note in both runs. The note does not list this pattern, and the model does not avoid it unprompted.
* **The quotes rule does something.** In run 2 the note kept «» where its absence produced no quotes at all; in run 1
  both variants used «». So: visible in 1 of 2 runs, in the only case where the note states a typographic rule the
  model would not otherwise follow.
* **Where the two variants differ otherwise, both are correct** («брали/взяли участь», «поїдемо/вирушимо») — that is
  Groq's run-to-run variation, not the prompt. Once it even got *worse* with the note («до Ліону» for «до Ліона»).

The note costs ~60 tokens on every Ukrainian request (~17 000 tokens/day at Groq's measured ≈290 translations before
the daily cap). On this evidence it is worth keeping for the quotes rule alone, but if it is ever extended, the item
to add is **«чим більше… тим менше» → «що більше… то менше»**, which is the Russianism the model actually produces.

## Summary

* **Correct share.** Groq **34/45 (76 %)** clean — 17/20 words, 12/20 sentences, 5/5 quotes. OpenAI **44/45 (98 %)**.
  No empty replies and no errors from either.
* **Typical errors, all on Groq:**
  1. **Set expressions copied word for word** — «коштує очі в голові», «встала з лівої ноги». The single biggest class.
  2. **Rare words answered at random** — `crémaillère` gave four different answers in four runs, including «веселка».
     This is worse than a wrong answer, because it is not reproducible.
  3. **A phrase returned instead of the tapped word** — `pose` → «запитує» (4/4), against the prompt's explicit rule.
  4. **Wrong Ukrainian forms and government** — «біка» for «бика», «ти мене надокучаєш» for «ти мені надокучаєш»,
     «набридлий».
  5. **Residual Russianisms the note does not name** — «будь то», «чим більше… тим менше».
* **What is already right and should not be touched:** the sentence-as-context fix (`rendu` → «зрозумів», `file` →
  «черга», `été` → «літо»), the homograph pair, the rare tenses, and above all the «ймовірна мова» hedge — the
  detector misread all five foreign quotes and the translations were still correct.
* **The literary-norm note is nearly inert.** None of the six Russianisms it lists ever appeared, with or without it;
  its only visible effect in two A/B runs was keeping the «» quotes. The Russianism the model really does produce,
  «чим більше… тим менше», is not on its list and survives it.
* **Nothing was changed in the app.** The quality gap is a property of `openai/gpt-oss-120b`, not a bug: the app sends
  every translation to Groq first by the owner's explicit decision (≈0.5 s vs ≈1.0 s, and OpenAI's free pool is
  limited). The measurement simply prices that decision: on words and plain sentences Groq is as good as OpenAI, and on
  **idioms and rare words it is unreliable in a way the reader cannot detect.** Whether to route set expressions and
  rare words to OpenAI is the owner's call, not this report's.

Reproduce with `python3 tools/uk_translation_review.py --provider groq` (no key needed; it uses production's shared
key, and stores none).
