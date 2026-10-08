"""Hand-authored GOLD Practice readings (schema v2) shared by the Practice/Grammar browser suites.

Practice is a READING / EXAMPLES surface: per-word example sentences plus connected paragraphs, every
inflected target attached to the sentence it is in. No live AI is available to CI, so these are what a
correct model reply looks like. Not a test file itself (no `_browser` suffix), so ci_suite_coverage
does not expect a CI invocation for it.
"""


def tgt(surface, lemma, why, occurrence=1, forms=None, **features):
    return dict(surface=surface, lemma=lemma, occurrence=occurrence, features=features, explanation=why, forms=forms)


def item(text, *targets):
    return dict(text=text, targets=list(targets))


def section(heading, kind, *items):
    return dict(heading=heading, kind=kind, items=list(items))


def reading(title, mode, *sections, language='fr'):
    return dict(title=title, language=language, mode=mode, sections=list(sections))


# ----------------------------------------------------------------------------------------- verbs (fr)
PARLER = section(
    'parler', 'examples',
    item('Nous parlons français tous les jours.',
         tgt('parlons', 'parler', "Présent: a habit ('tous les jours'), 1st person plural after 'nous'.", tense='présent', mood='indicatif', person='1re personne', number='pluriel')),
    item('Hier, nous avons parlé avec notre professeur.',
         tgt('avons parlé', 'parler', "Passé composé: a finished action ('hier'); avoir + participle.", tense='passé composé', mood='indicatif', person='1re personne', number='pluriel', auxiliary='avoir', participle='parlé')),
    item("Quand j'étais enfant, je parlais souvent avec ma grand-mère.",
         tgt('parlais', 'parler', "Imparfait: a repeated habit in the past ('souvent').", tense='imparfait', mood='indicatif', person='1re personne', number='singulier')),
    item("Demain, je parlerai avec le directeur de l'école.",
         tgt('parlerai', 'parler', "Futur simple: a planned future action ('demain').", tense='futur simple', mood='indicatif', person='1re personne', number='singulier')),
    item('Ils ne parlent jamais de leurs problèmes au travail.',
         tgt('parlent', 'parler', "Présent, 3rd person plural after 'ils'; negation wraps the verb.", tense='présent', mood='indicatif', person='3e personne', number='pluriel')),
    item('Elle parle vite, mais son frère parle encore plus vite.',
         tgt('parle', 'parler', "Présent, 3rd person singular: the subject is 'elle'.", occurrence=1, tense='présent', mood='indicatif', person='3e personne', number='singulier'),
         tgt('parle', 'parler', "Présent, 3rd person singular: the subject is 'son frère'.", occurrence=2, tense='présent', mood='indicatif', person='3e personne', number='singulier')),
    item('Il faut que vous parliez avec le médecin avant de partir.',
         tgt('parliez', 'parler', "Subjonctif présent, required after 'il faut que'.", tense='subjonctif présent', mood='subjonctif', person='2e personne', number='pluriel')),
    item('Si tu parlais plus lentement, tout le monde te comprendrait.',
         tgt('parlais', 'parler', "Imparfait after 'si' in a hypothetical condition.", tense='imparfait', mood='indicatif', person='2e personne', number='singulier')),
)
PLAINDRE = section(
    'plaindre', 'examples',
    item("Tout le monde plaint cette pauvre femme après l'accident.",
         tgt('plaint', 'plaindre', "Présent, 3rd person singular after 'tout le monde'.", tense='présent', mood='indicatif', person='3e personne', number='singulier')),
    item('Nous plaignons les enfants qui doivent travailler si jeunes.',
         tgt('plaignons', 'plaindre', "Présent, 1st person plural after 'nous'.", tense='présent', mood='indicatif', person='1re personne', number='pluriel')),
    item("Autrefois, on plaignait ceux qui n'avaient pas de maison.",
         tgt('plaignait', 'plaindre', "Imparfait: a general situation in the past ('autrefois').", tense='imparfait', mood='indicatif', person='3e personne', number='singulier')),
    item('Ils plaindront sûrement le pauvre homme quand ils apprendront la nouvelle.',
         tgt('plaindront', 'plaindre', "Futur simple: a future reaction.", tense='futur simple', mood='indicatif', person='3e personne', number='pluriel')),
    item("Je ne veux pas qu'on me plaigne.",
         tgt('plaigne', 'plaindre', "Subjonctif présent after 'ne pas vouloir que'.", tense='subjonctif présent', mood='subjonctif', person='3e personne', number='singulier')),
    item('Vous plaignez sans cesse votre voisin, mais vous ne lui rendez jamais visite.',
         tgt('plaignez', 'plaindre', "Présent, 2nd person plural after 'vous'.", tense='présent', mood='indicatif', person='2e personne', number='pluriel')),
)
STORY_VERBS = section(
    '', 'story',
    item("Hier soir, Marie a parlé longtemps avec sa voisine. Elle plaignait cette vieille dame qui vit seule depuis la mort de son mari. Demain, elles parleront ensemble de leurs projets pour l'été.",
         tgt('a parlé', 'parler', "Passé composé: one finished conversation.", tense='passé composé', mood='indicatif', person='3e personne', number='singulier', auxiliary='avoir', participle='parlé'),
         tgt('plaignait', 'plaindre', "Imparfait: a lasting feeling in the past.", tense='imparfait', mood='indicatif', person='3e personne', number='singulier'),
         tgt('parleront', 'parler', "Futur simple: a plan for tomorrow.", tense='futur simple', mood='indicatif', person='3e personne', number='pluriel')),
    item("Quand elle était petite, sa mère lui parlait chaque soir avant de dormir. Aujourd'hui, c'est elle qui parle doucement à ses enfants, et personne ne la plaint parce qu'elle est heureuse.",
         tgt('parlait', 'parler', "Imparfait: a nightly habit in the past.", tense='imparfait', mood='indicatif', person='3e personne', number='singulier'),
         tgt('parle', 'parler', "Présent: what she does today.", tense='présent', mood='indicatif', person='3e personne', number='singulier'),
         tgt('plaint', 'plaindre', "Présent, 3rd person singular after 'personne ne … la'.", tense='présent', mood='indicatif', person='3e personne', number='singulier')),
)
VERBS_FR = reading('Parler et plaindre en contexte', 'verbs', PARLER, PLAINDRE, STORY_VERBS)
VERB_LEMMAS = ['parler', 'plaindre']

# ------------------------------------------------------------------------------------ adjectives (fr)
PETIT_FORMS = dict(ms='petit', fs='petite', mp='petits', fp='petites')
HEUREUX_FORMS = dict(ms='heureux', fs='heureuse', mp='heureux', fp='heureuses')
BEAU_FORMS = dict(ms='beau', fs='belle', mp='beaux', fp='belles', ms_vowel='bel')
PETIT = section(
    'petit', 'examples',
    item('Mon petit frère joue dans le jardin.',
         tgt('petit', 'petit', "Masculine singular: it agrees with 'frère'.", forms=PETIT_FORMS, gender='masculin', number='singulier')),
    item('Elle habite dans une petite maison près de la mer.',
         tgt('petite', 'petit', "Feminine singular: +e to agree with 'maison'.", forms=PETIT_FORMS, gender='féminin', number='singulier')),
    item('Les petits enfants dorment déjà à cette heure.',
         tgt('petits', 'petit', "Masculine plural: +s to agree with 'enfants'.", forms=PETIT_FORMS, gender='masculin', number='pluriel')),
    item("J'aime beaucoup ces petites rues étroites du vieux quartier.",
         tgt('petites', 'petit', "Feminine plural: +e +s to agree with 'rues'.", forms=PETIT_FORMS, gender='féminin', number='pluriel')),
    item('Cette valise est trop petite pour tous tes vêtements.',
         tgt('petite', 'petit', "Feminine singular, predicative: agrees with 'valise' after 'est'.", forms=PETIT_FORMS, gender='féminin', number='singulier')),
    item('Ses deux fils sont encore petits.',
         tgt('petits', 'petit', "Masculine plural, predicative: agrees with 'fils'.", forms=PETIT_FORMS, gender='masculin', number='pluriel')),
)
HEUREUX = section(
    'heureux', 'examples',
    item('Il est très heureux de son nouveau travail.',
         tgt('heureux', 'heureux', "Masculine singular: it describes 'il'.", forms=HEUREUX_FORMS, gender='masculin', number='singulier')),
    item('Elle semble heureuse depuis son retour à Paris.',
         tgt('heureuse', 'heureux', "Feminine singular: -x becomes -se to agree with 'elle'.", forms=HEUREUX_FORMS, gender='féminin', number='singulier')),
    item('Les enfants sont heureux quand il neige.',
         tgt('heureux', 'heureux', "Masculine plural: 'heureux' already ends in -x, so no -s is added.", forms=HEUREUX_FORMS, gender='masculin', number='pluriel')),
    item('Toutes mes amies étaient heureuses de la revoir.',
         tgt('heureuses', 'heureux', "Feminine plural: -x becomes -ses to agree with 'amies'.", forms=HEUREUX_FORMS, gender='féminin', number='pluriel')),
    item('Mon père était heureux, et ma mère aussi était heureuse de le voir sourire.',
         tgt('heureux', 'heureux', "Masculine singular: it agrees with 'père'.", occurrence=1, forms=HEUREUX_FORMS, gender='masculin', number='singulier'),
         tgt('heureuse', 'heureux', "Feminine singular: it agrees with 'ma mère'.", occurrence=1, forms=HEUREUX_FORMS, gender='féminin', number='singulier')),
)
BEAU = section(
    'beau', 'examples',
    item('Quel beau jour pour se promener au bord du lac !',
         tgt('beau', 'beau', "Masculine singular before a consonant: 'beau'.", forms=BEAU_FORMS, gender='masculin', number='singulier')),
    item('Un bel arbre pousse devant notre maison.',
         tgt('bel', 'beau', "Masculine singular before a vowel: 'beau' becomes 'bel'.", forms=BEAU_FORMS, gender='masculin', number='singulier')),
    item("C'est une belle histoire que ma grand-mère raconte.",
         tgt('belle', 'beau', "Feminine singular: irregular, 'belle' agrees with 'histoire'.", forms=BEAU_FORMS, gender='féminin', number='singulier')),
    item('Les belles fleurs de son jardin attirent les abeilles.',
         tgt('belles', 'beau', "Feminine plural: 'belles' agrees with 'fleurs'.", forms=BEAU_FORMS, gender='féminin', number='pluriel')),
    item("Ces beaux paysages me rappellent mon enfance.",
         tgt('beaux', 'beau', "Masculine plural: 'beaux' agrees with 'paysages'.", forms=BEAU_FORMS, gender='masculin', number='pluriel')),
)
STORY_ADJ = section(
    '', 'story',
    item("Ma voisine est une femme très gentille. Sa petite fille est toujours heureuse quand elle voit les beaux oiseaux du jardin, et son petit frère rit avec elle.",
         tgt('petite', 'petit', "Feminine singular: agrees with 'fille'.", forms=PETIT_FORMS, gender='féminin', number='singulier'),
         tgt('heureuse', 'heureux', "Feminine singular: agrees with 'fille'.", forms=HEUREUX_FORMS, gender='féminin', number='singulier'),
         tgt('beaux', 'beau', "Masculine plural: agrees with 'oiseaux'.", forms=BEAU_FORMS, gender='masculin', number='pluriel'),
         tgt('petit', 'petit', "Masculine singular: agrees with 'frère'.", forms=PETIT_FORMS, gender='masculin', number='singulier')),
    item("Dans cette belle ville, les rues sont petites, mais les gens sont heureux. Un bel après-midi, nous avons vu de petits enfants jouer près d'une belle fontaine.",
         tgt('belle', 'beau', "Feminine singular: agrees with 'ville'.", occurrence=1, forms=BEAU_FORMS, gender='féminin', number='singulier'),
         tgt('petites', 'petit', "Feminine plural: agrees with 'rues'.", forms=PETIT_FORMS, gender='féminin', number='pluriel'),
         tgt('heureux', 'heureux', "Masculine plural: agrees with 'gens'.", forms=HEUREUX_FORMS, gender='masculin', number='pluriel'),
         tgt('bel', 'beau', "Masculine singular before a vowel ('après-midi' starts with a vowel sound).", forms=BEAU_FORMS, gender='masculin', number='singulier'),
         tgt('petits', 'petit', "Masculine plural: agrees with 'enfants'.", forms=PETIT_FORMS, gender='masculin', number='pluriel')),
)
ADJECTIVES_FR = reading('Petit, heureux et beau en contexte', 'adjectives', PETIT, HEUREUX, BEAU, STORY_ADJ)
ADJECTIVE_LEMMAS = ['petit', 'heureux', 'beau']

# -------------------------------------------------------------------------------- English (2nd language)
EN_VERBS = reading(
    'Walking and talking', 'verbs',
    section('walk', 'examples',
            item('Every morning I walk to the station before the shops open.', tgt('walk', 'walk', 'Present simple: a daily habit, 1st person singular.', tense='present simple', person='1st person', number='singular')),
            item('Yesterday we walked along the river for almost two hours.', tgt('walked', 'walk', 'Past simple: a finished action, marked by yesterday.', tense='past simple', person='1st person', number='plural')),
            item('She is walking the dog because it stopped raining.', tgt('is walking', 'walk', 'Present continuous: an action happening right now.', tense='present continuous', person='3rd person', number='singular')),
            item('They have walked this path many times without getting lost.', tgt('have walked', 'walk', 'Present perfect: experience up to now.', tense='present perfect', person='3rd person', number='plural')),
            item('If it stays sunny, he will walk home instead of taking the bus.', tgt('will walk', 'walk', 'Future simple after a condition.', tense='future simple', person='3rd person', number='singular')),
            item('My grandfather used to walk five miles to school every single day.', tgt('walk', 'walk', "Bare infinitive after 'used to'.", tense='infinitive')),
            item('We walk together on Sundays, and the children always run ahead of us.', tgt('walk', 'walk', 'Present simple, 1st person plural: a weekly habit.', tense='present simple', person='1st person', number='plural')),
            item('He walks very slowly now because his knee still hurts after the fall.', tgt('walks', 'walk', 'Present simple, 3rd person singular: the -s ending.', tense='present simple', person='3rd person', number='singular')),
            item('Would you like to walk through the park before we go to the museum?', tgt('walk', 'walk', "Bare infinitive after 'would you like to'.", tense='infinitive')),
            item('They were walking home when the storm suddenly broke over the town.', tgt('were walking', 'walk', 'Past continuous: an action interrupted by another.', tense='past continuous', person='3rd person', number='plural'))),
    section('', 'story',
            item('Last summer my sister walked across the hills with a friend. She was walking slowly at first, but by noon they had walked twelve miles and stopped for lunch.',
                 tgt('walked', 'walk', 'Past simple: the whole trip.', tense='past simple', person='3rd person', number='singular'),
                 tgt('was walking', 'walk', 'Past continuous: the situation at the start.', tense='past continuous', person='3rd person', number='singular'),
                 tgt('had walked', 'walk', 'Past perfect: completed before they stopped.', tense='past perfect', person='3rd person', number='plural')),
            item('Now she walks to work every morning. If the weather is bad, she will walk to the bus stop instead, and on Fridays she walks home with her colleagues because they enjoy the fresh air.',
                 tgt('walks', 'walk', 'Present simple: her regular routine.', tense='present simple', person='3rd person', number='singular'),
                 tgt('will walk', 'walk', 'Future simple after a condition.', tense='future simple', person='3rd person', number='singular'),
                 tgt('walks', 'walk', 'Present simple: a Friday habit.', occurrence=2, tense='present simple', person='3rd person', number='singular'))),
    language='en')


def to_json(obj):
    import json
    return json.dumps(obj, ensure_ascii=False)
