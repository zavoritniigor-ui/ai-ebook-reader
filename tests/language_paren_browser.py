"""Parenthetical translation pairs in EN/FR mixed text (js/lang-detect.js).
Language-learning books put a word/phrase immediately followed by its translation
in parentheses — bonjour (hello), house (maison) — and the text inside parens must
be detected as an INDEPENDENT language segment, not inherit the language outside
it. Also guards existing flat (non-parenthetical) mixed-language detection so the
paren-aware split doesn't regress it. READER_TTS_URL can target production.
"""
import json, os
from browser_cdp import CDP
c = CDP(); c.sock.settimeout(40); c.call('Page.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")

cases = [
    # Основна вимога: переклад у дужках — ОКРЕМИЙ відрізок, у будь-який бік.
    [('fr', 'bonjour'), ('en', '(hello)')],
    [('fr', 'maison'), ('en', '(house)')],
    [('fr', 'Je suis fatigué.'), ('en', '(I am tired.)')],
    [('en', 'hello'), ('fr', '(bonjour)')],
    [('en', 'house'), ('fr', '(maison)')],
    [('en', 'I am tired.'), ('fr', '(Je suis fatigué.)')],
    # Вкладені дужки: кожен рівень аналізується окремо від свого безпосереднього
    # "сусіда", а не від мови всього речення.
    [('en', 'house'), ('fr', '(maison'), ('en', '(house))')],
    # Дужка без жодного надійного власного сигналу все одно не повинна
    # успадкувати мову ЗОВНІ — вона трактується як переклад (протилежна мова).
    [('fr', 'bonjour'), ('en', '(an unknown example)')],
    # Регрес: суцільний (без дужок) одномовний і мішаний текст — незмінна
    # поведінка "плаского" аналізу.
    [('fr', 'Le restaurant est fermé.')],
    [('en', 'This restaurant is closed.')],
    [('fr', "J'aime l'école et qu'il parle.")],
    [('fr', 'Exemple:'), ('fr', 'une bonne question.')],
    [('fr', 'Il est très important'), ('en', 'to pronounce it correctly.')],
    # Вправи з французькими дієсловами в дужках: інфінітив лишається французькою,
    # а не помилково розпізнається як англійська (Defect 2).
    [('fr', 'Ils (plaindre) la pauvre femme.')],
    [('fr', 'La muraille (ceindre) la ville.')],
    [('fr', '3. Ils (plaindre) la pauvre femme.')],
    [('fr', 'Elle (se plaindre) souvent.')],
    [('fr', 'Tu (finir) le travail.')],
    [('fr', 'Nous (être) là.')],
]
failures = []
for expected in cases:
    text = ' '.join(part for _, part in expected)
    result = c.js('''(()=>{const text=''' + json.dumps(text) + ''',expected=''' + json.dumps(expected) + ''';
    const words=s=>tokenizeForLang(s).filter(t=>t.isWord).map(t=>t.text);
    const segments=buildLanguageSegments(text,'en');
    const actual=segments.flatMap(s=>words(s.text).map(w=>[s.lang,w]));
    const wanted=expected.flatMap(([lang,s])=>words(s).map(w=>[lang,w]));
    return segments.map(s=>s.text).join('')===text&&JSON.stringify(actual)===JSON.stringify(wanted)?true:{text,actual,wanted,joined:segments.map(s=>s.text).join('')};})()''')
    if result is not True: failures.append(result)
    else: print('PASS', text, flush=True)
assert not failures, json.dumps(failures, ensure_ascii=False, indent=2)

# Targeted API checks for Defect 2 (fragmentLangInContext and grammarSourceLanguageFor)
assert c.js("fragmentLangInContext('plaindre', 'Ils (plaindre) la pauvre femme.')") == 'fr'
assert c.js("grammarSourceLanguageFor('plaindre', 'Ils (plaindre) la pauvre femme.')") == 'fr'
assert c.js("fragmentLangInContext('ceindre', '4. La muraille (ceindre) la ville.')") == 'fr'
assert c.js("grammarSourceLanguageFor('ceindre', '4. La muraille (ceindre) la ville.')") == 'fr'
assert c.js("fragmentLangInContext('hello', 'bonjour (hello)')") == 'en'
assert c.js("grammarSourceLanguageFor('hello', 'bonjour (hello)')") == 'en'
assert c.js("fragmentLangInContext('maison', 'house (maison)')") == 'fr'
assert c.js("grammarSourceLanguageFor('maison', 'house (maison)')") == 'fr'
print('PASS Defect 2 targeted API checks (fragmentLangInContext / grammarSourceLanguageFor)', flush=True)

# ---------------------------------------------------------------------------------------
# The exercise-cue rule must be STRUCTURAL, not word shape: a parenthesised French infinitive
# in a fill-in-the-blank line is French, but English glosses that merely END like one
# (father, water, teacher, dinner, fire, desire ...) must stay English.
# ---------------------------------------------------------------------------------------
def lang_of(fragment, context):
    a = c.js('fragmentLangInContext(%s,%s)' % (json.dumps(fragment, ensure_ascii=False), json.dumps(context, ensure_ascii=False)))
    b = c.js('grammarSourceLanguageFor(%s,%s)' % (json.dumps(fragment, ensure_ascii=False), json.dumps(context, ensure_ascii=False)))
    return a, b

# (context, clicked fragment) -> French. The first four are the reported cases.
EXERCISE_CUES = [
    ('Ils (plaindre) la pauvre femme.', 'plaindre'),
    ('Nous (finir) le travail.', 'finir'),
    ('Elle (aller) à Paris.', 'aller'),
    ('Vous (être) prêts.', 'être'),
    ('Je (prendre) le train.', 'prendre'),
    ('Tu (avoir) faim.', 'avoir'),
    ('Elles (partir) demain.', 'partir'),
    ('Il me (tendre) la main pour me dire bonjour.', 'tendre'),                  # clitic between subject and cue
    ("Est-ce qu'il (être) aussi amusant que son frère ?", 'être'),
    ('Est-ce que vous (savoir) jouer au poker ?', 'savoir'),
    ('Ils (se lever) tôt.', 'lever'),                                              # reflexive
    ("Nous voulons (s'écrire) plus souvent.", 'écrire'),
    ('Elle (ne pas savoir) si il travaille lundi.', 'savoir'),                     # negated
    ('La muraille (ceindre) la ville.', 'ceindre'),                                # noun subject, French-only ending
    ('Cette organisation (promouvoir) la recherche scientifique.', 'promouvoir'),
    ('Quel jour (partir) ?', 'partir'),
    ('Molière (mourir) en 1673.', 'mourir'),
    ('Ça (aller) ?', 'aller'),
]
for ctx, frag in EXERCISE_CUES:
    got = lang_of(frag, ctx)
    assert got == ('fr', 'fr'), ('exercise cue must resolve to French', ctx, frag, got)
print('PASS %d French fill-in-the-blank cues resolve to fr (fragmentLangInContext AND grammarSourceLanguageFor)' % len(EXERCISE_CUES), flush=True)

# French word (English gloss): the gloss stays ENGLISH -- including English words that end -er/-re/-ir/-oir.
FR_WITH_EN_GLOSS = [
    ('la maison (the house)', 'house'), ('eau (water)', 'water'), ('Le père (father) parle.', 'father'),
    ('la mère (mother)', 'mother'), ('le professeur (teacher)', 'teacher'), ('le dîner (dinner)', 'dinner'),
    ('la réponse (answer)', 'answer'), ('le frère (brother)', 'brother'), ('la soeur (sister)', 'sister'),
    ('le nombre (number)', 'number'), ('la lettre (letter)', 'letter'), ('le feu (fire)', 'fire'),
    ('le désir (desire)', 'desire'), ('le haut-parleur (loudspeaker)', 'loudspeaker'), ('le miroir (mirror)', 'mirror'),
    ('chanter (to sing)', 'sing'), ('prendre (to take)', 'take'), ('être (to be)', 'be'),
    ('Il est ici (here) et là (there).', 'there'),
    ('Ils (they) parlent.', 'they'), ('Vous (you) êtes prêts.', 'you'), ('Nous (we) parlons.', 'we'),   # gloss of a pronoun
]
for ctx, frag in FR_WITH_EN_GLOSS:
    got = lang_of(frag, ctx)
    assert got == ('en', 'en'), ('English gloss must stay English', ctx, frag, got)
print('PASS %d English glosses after French (incl. father/water/teacher/dinner/fire/desire) stay en' % len(FR_WITH_EN_GLOSS), flush=True)

# English word (French gloss): the gloss stays FRENCH.
EN_WITH_FR_GLOSS = [
    ('the house (la maison)', 'maison'), ('to speak (parler)', 'parler'), ('to finish (finir)', 'finir'),
    ('father (père)', 'père'), ("the water (l'eau)", 'eau'), ('to be (être)', 'être'),
    ('the auxiliary verb (être)', 'être'),
]
for ctx, frag in EN_WITH_FR_GLOSS:
    got = lang_of(frag, ctx)
    assert got == ('fr', 'fr'), ('French gloss must stay French', ctx, frag, got)
print('PASS %d French glosses after English stay fr' % len(EN_WITH_FR_GLOSS), flush=True)

# The predicate itself (shared with js/selection.js): structure decides, shape alone never does.
CUE = lambda inner, before: c.js('isFrenchExerciseCue(%s,%s)' % (json.dumps(inner, ensure_ascii=False), json.dumps(before, ensure_ascii=False)))
assert CUE('plaindre', '3. Ils ') is True and CUE('manger', 'Ils ') is True and CUE('finir', 'Ils ') is True
assert CUE('ceindre', 'La muraille ') is True and CUE('se marier', 'Ils doivent ') is True and CUE('ne pas être', 'Leurs méthodes ') is True
assert CUE('father', 'Le père ') is False and CUE('teacher', 'le ') is False and CUE('water', 'eau ') is False
assert CUE('manger', 'Les enfants ') is False, 'a noun subject + plain -er is not claimed (indistinguishable from an English gloss)'
assert CUE('they', 'Ils ') is False and CUE('m.', "l'allemand ") is False and CUE('familiar', 'vous êtes you are ') is False
assert CUE('sir', 'Ils ') is False and CUE('stir', 'la ') is False and CUE('secure', 'la ') is False   # 'secure' is not a reflexive 'se …'
print('PASS isFrenchExerciseCue: French subject / French-only ending / reflexive => cue; English glosses, tags and lookalikes => not', flush=True)

print('ALL PARENTHESES/LANGUAGE CHECKS PASSED')
