"""Shared fixtures for tests/ai_contract_browser.py -- the REAL-model contract of Grammar and Practice.

PROVENANCE (be precise about what this is):
  * The French text is the real page reported from a live-AI acceptance run (HVAC / refrigeration training material:
    "PRÉPARER LES TRAVAUX", "Établi un diagnostic du travail à effectuer", ...) plus further sentences in the same register.
  * The model replies are hand-built to look like what real models emit for this prompt, INCLUDING the deviations real models are
    known to produce (fences, unescaped inner quotes, lower-cased capitalised words, phrase lemmas, split arrays, cut-off replies).
  * The provider ENVELOPES follow the documented OpenAI Responses / Gemini generateContent / Groq chat-completions shapes.
  * They are NOT a capture of the specific failing response (no provider credential was available when this was written). Replies
    captured from a real failing session are replayed by the same test: drop them into tests/live_responses/ (see its README).
"""
import json

SENTENCES = [
    "PRÉPARER LES TRAVAUX.",
    "Établi un diagnostic du travail à effectuer.",
    "Observation visuelle et olfactive.",
    "Utilisation appropriée des instruments de mesure.",
    "Mettre en place les mesures pour effectuer le travail.",
    "Appliquer les mesures sécuritaires liées au travail à effectuer.",
    "Le technicien vérifie la pression du circuit avant de démarrer le compresseur.",
    "Il faut d'abord purger l'installation et contrôler les raccords.",
    "Quand la température baisse, le détendeur régule le débit du fluide frigorigène.",
    "Nous avons remplacé le filtre déshydrateur qui était encrassé.",
    "Les mesures prises confirment que le système fonctionne correctement.",
    "Le responsable signalera toute anomalie constatée pendant l'intervention.",
    "Chaque opération doit être consignée dans le carnet d'entretien.",
    "Une formation régulière permet de réduire les risques d'accident.",
]


def v(lemma, surface, why, **feat):
    return dict(pos='verb', lemma=lemma, surface=surface, occurrence=1, agreesWith=None, features=feat, explanation=why, stemBreakdown=None, forms=None)


def a(lemma, surface, why, agrees=None, **feat):
    return dict(pos='adjective', lemma=lemma, surface=surface, occurrence=1, agreesWith=agrees, features=feat, explanation=why, stemBreakdown=None, forms=None)


# what a correct model finds in each sentence (index -> items)
ITEMS = {
    0: [v('préparer', 'PRÉPARER', "Infinitif en titre : l'action à accomplir.", mood='infinitif')],
    1: [v('établir', 'Établi', "Participe passé en tête de phrase : le diagnostic est établi.", mood='participe', participle='établi'),
        v('effectuer', 'effectuer', "Infinitif après « à » : le travail qu'il reste à faire.", mood='infinitif')],
    2: [a('visuel', 'visuelle', "Féminin singulier : s'accorde avec « observation ».", agrees='Observation', gender='féminin', number='singulier'),
        a('olfactif', 'olfactive', "Féminin singulier : s'accorde avec « observation ».", agrees='Observation', gender='féminin', number='singulier')],
    3: [a('approprié', 'appropriée', "Féminin singulier : s'accorde avec « utilisation ».", agrees='Utilisation', gender='féminin', number='singulier')],
    4: [v('mettre', 'Mettre', "Infinitif à valeur d'instruction.", mood='infinitif'),
        v('effectuer', 'effectuer', "Infinitif après « pour » : but de l'action.", mood='infinitif')],
    5: [v('appliquer', 'Appliquer', "Infinitif à valeur d'instruction.", mood='infinitif'),
        a('sécuritaire', 'sécuritaires', "Pluriel : s'accorde avec « mesures ».", agrees='mesures', gender='féminin', number='pluriel'),
        a('lié', 'liées', "Participe employé comme adjectif, féminin pluriel : « mesures ».", agrees='mesures', gender='féminin', number='pluriel')],
    6: [v('vérifier', 'vérifie', "Présent : action habituelle du technicien.", tense='présent', mood='indicatif', person='3e personne', number='singulier'),
        v('démarrer', 'démarrer', "Infinitif après « avant de ».", mood='infinitif')],
    7: [v('purger', 'purger', "Infinitif après « il faut ».", mood='infinitif'), v('contrôler', 'contrôler', "Infinitif après « il faut ».", mood='infinitif')],
    8: [v('baisser', 'baisse', "Présent après « quand ».", tense='présent', mood='indicatif', person='3e personne', number='singulier'),
        v('réguler', 'régule', "Présent : le détendeur agit à chaque variation.", tense='présent', mood='indicatif', person='3e personne', number='singulier')],
    9: [v('remplacer', 'avons remplacé', "Passé composé : action terminée.", tense='passé composé', mood='indicatif', person='1re personne', number='pluriel', auxiliary='avoir', participle='remplacé'),
        a('encrassé', 'encrassé', "Masculin singulier : s'accorde avec « filtre ».", agrees='filtre', gender='masculin', number='singulier')],
    10: [a('pris', 'prises', "Participe adjectif, féminin pluriel : « mesures ».", agrees='mesures', gender='féminin', number='pluriel'),
         v('confirmer', 'confirment', "Présent, 3e personne du pluriel.", tense='présent', mood='indicatif', person='3e personne', number='pluriel'),
         v('fonctionner', 'fonctionne', "Présent, 3e personne du singulier.", tense='présent', mood='indicatif', person='3e personne', number='singulier')],
    11: [v('signaler', 'signalera', "Futur simple : action à venir.", tense='futur simple', mood='indicatif', person='3e personne', number='singulier'),
         a('constaté', 'constatée', "Féminin singulier : s'accorde avec « anomalie ».", agrees='anomalie', gender='féminin', number='singulier')],
    12: [a('consigné', 'consignée', "Féminin singulier : s'accorde avec « opération ».", agrees='opération', gender='féminin', number='singulier')],
    13: [v('permettre', 'permet', "Présent, 3e personne du singulier.", tense='présent', mood='indicatif', person='3e personne', number='singulier'),
         v('réduire', 'réduire', "Infinitif après « permet de ».", mood='infinitif'),
         a('régulier', 'régulière', "Féminin singulier : s'accorde avec « formation ».", agrees='formation', gender='féminin', number='singulier')],
}

# every known sentence with its items, for the in-page reply generator
KNOWN = [dict(sentence=SENTENCES[i], items=[dict(x, sentence=SENTENCES[i]) for x in ITEMS.get(i, [])]) for i in range(len(SENTENCES))]


def text_for(indices):
    return ' '.join(SENTENCES[i] for i in indices)


PAGE_SENTENCES_1 = text_for([1])                # A / B: one sentence (the tapped word's sentence / a sentence selection)
SEVERAL_C = text_for(range(0, 6))                # C: several sentences (the reported page)
PARAGRAPH_D = text_for(range(0, 14))             # D: a paragraph
# E: a large page selection, well beyond the analysis cap
PAGE_E = ' '.join('Étape %d. %s' % (n + 1, text_for(range(14))) for n in range(5))


def reply_for(indices, lite=False, extras=False):
    """A correct, complete model reply for the given sentences (optionally with harmless extra fields real models add)."""
    items = []
    for i in indices:
        for x in ITEMS.get(i, []):
            it = dict(x, sentence=SENTENCES[i])
            if lite:
                it['forms'] = None; it['stemBreakdown'] = None
            if extras:
                it['confidence'] = 0.9; it['translation'] = 'x'
                it['features'] = dict(it['features'], voice='active')
            items.append(it)
    out = dict(language='fr', items=items)
    if extras:
        out['meta'] = dict(sentences=len(list(indices)), note='extra top-level field intended for a bigger analysis')
    return out


def dumps(obj):
    return json.dumps(obj, ensure_ascii=False)


# The reported page as a real PDF: each line is its own text item and (except the trailing "..." on two of them) has no sentence
# punctuation, so the sentence context captured by a tap is the whole run up to the first period.
PDF_LINES = ["PRÉPARER LES TRAVAUX", "Établi un diagnostic du travail à effectuer", "Observation visuelle et olfactive...",
             "Utilisation appropriée des instruments de mesure", "Mettre en place les mesures pour effectuer le travail",
             "Appliquer les mesures sécuritaires liées au travail à effectuer..."]


def hvac_pdf(lines=PDF_LINES):
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>', b'', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']
    ops = b''.join(b'BT /F1 16 Tf 50 %d Td (' % (720 - 30 * i) + l.encode('cp1252').replace(b'\\', b'\\\\').replace(b'(', b'\\(').replace(b')', b'\\)') + b') Tj ET\n' for i, l in enumerate(lines))
    objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>')
    objs.append(b'<< /Length %d >>\nstream\n' % len(ops) + ops + b'endstream')
    objs[1] = b'<< /Type /Pages /Count 1 /Kids [4 0 R] >>'
    data = b'%PDF-1.4\n'; offs = [0]
    for i, o in enumerate(objs, 1):
        offs.append(len(data)); data += b'%d 0 obj\n' % i + o + b'\nendobj\n'
    x = len(data)
    data += b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1) + b''.join(b'%010d 00000 n \n' % o for o in offs[1:])
    return data + b'trailer << /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF' % (len(objs) + 1, x)
