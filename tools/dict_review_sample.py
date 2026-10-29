"""Write dict/REVIEW_SAMPLE.md: the owner's review sample of the offline French → Ukrainian dictionary.

    python3 tools/dict_review_sample.py [REVIEW-LOG]

  * 200 words: 100 drawn at random (fixed seed) from the lemmas that have a meaning — shown as a random form of the lemma, so the
    form → lemma step is reviewed too — and 100 textbook words (A1–B2: school, family, home, work, travel, everyday verbs);
  * 30 set expressions drawn at random (fixed seed);
  * 20 sentences (dict/review_sentences.tsv): the Bergamot translation before and after the dictionary, and the tapped word. They
    come from the REVIEW lines printed by tests/offline_dict_real_browser.py in CI: save the
    job log and pass it as REVIEW-LOG (without it the table says the run is missing);
  * 100 unusual sentences (dict/test_sentences_hard.tsv) from the HARD lines of the same log.
"""
import json, random, re, sys, unicodedata
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'dict/fr-uk.json').read_text(encoding='utf-8'))
POS_UK = {'N': 'ім.', 'V': 'дієсл.', 'A': 'прикм.', 'ADV': 'присл.', 'PRE': 'прийм.', 'CON': 'спол.', 'PRO': 'займ.', 'DET': 'означ.',
          'NUM': 'числ.', 'INTJ': 'виг.'}
SRC = {'w': 'wiktionary', 'x': 'written'}
TEXTBOOK = '''école classe élève professeur cahier livre stylo crayon règle gomme trousse cartable tableau devoir leçon examen récréation
cantine bibliothèque université famille père mère frère sœur grand-mère grand-père oncle tante cousin enfant fils fille mari femme bébé
parents neveu nièce mariage maison appartement cuisine chambre salon jardin porte fenêtre table chaise lit armoire escalier toit clé
voisin immeuble étage ménage travail bureau collègue patron salaire entreprise métier réunion ordinateur emploi voyage gare train avion
aéroport billet valise hôtel plage passeport carte route voiture vélo file aller venir faire prendre manger boire dormir parler écrire
lire acheter travailler habiter attendre fasses belles yeux'''.split()


def norm(w):
    return unicodedata.normalize('NFC', w.strip().lower()).replace('’', "'").replace('œ', 'oe').replace('æ', 'ae')


def index():
    """form → [lemma numbers] and lemma number → [forms], decoded from the front-coded index."""
    forms, by_lemma = {}, {}
    for block in data['index']:
        prev = ''
        for n, row in enumerate(block.split('\n')):
            full = prev[:int(row[0], 36)] + row[1:] if n else row
            prev = full
            key, refs = full.split('\t')
            nums = [int(x, 16) for x in refs.split(',')]
            forms[key] = nums
            for i in nums:
                by_lemma.setdefault(i, []).append(key)
    return forms, by_lemma


def entry(i):
    cols = data['lemmas'][i].split('\t')
    meanings = cols[4].split(';') if len(cols) > 4 else []
    return {'lemma': cols[0], 'pos': cols[1], 'gender': cols[2], 'meanings': meanings, 'src': cols[5] if len(cols) > 5 else ''}


def row(word, e):
    srcs = sorted({SRC[s] for s in e['src']})
    meanings = '; '.join(m.replace('|', ' / ') for m in e['meanings'])
    return f"| {word} | {e['lemma']} | {POS_UK[e['pos']]}{' ' + e['gender'] if e['gender'] else ''} | {meanings} | {', '.join(srcs)} |"


def main():
    forms, by_lemma = index()
    rng = random.Random(20261029)
    with_meanings = [i for i in range(len(data['lemmas'])) if data['lemmas'][i].count('\t') >= 5]
    out = ['# Вибірка для перевірки офлайн-словника французька → українська', '',
           'Згенеровано `tools/dict_review_sample.py` з `dict/fr-uk.json`. Джерело: **wiktionary** — переклад із Вікісловника, '
           '**written** — значення, написане для цього проєкту (кожне українське слово перевірене за VESUM). '
           'Аспектна пара дієслова записана як «недоконаний / доконаний».', '',
           '## 1. 100 випадкових слів', '', 'Слово — випадкова форма випадкової леми (щоб перевірити й крок «форма → лема»).', '',
           '| Слово | Лема | Частина мови | Значення | Джерело |', '|---|---|---|---|---|']
    for i in rng.sample(with_meanings, 100):
        word = rng.choice(sorted(by_lemma.get(i, [entry(i)['lemma']])))
        if 'œ' in entry(i)['lemma']:
            word = word.replace('oe', 'œ')   # the index keys write œ out
        out.append(row(word, entry(i)))
    out += ['', '## 2. 100 слів із підручників A1–B2', '', 'Школа, родина, дім, робота, подорожі, щоденні дієслова (і три форми: «fasses», «belles», «yeux»).', '',
            '| Слово | Лема | Частина мови | Значення | Джерело |', '|---|---|---|---|---|']
    missing = []
    for word in TEXTBOOK:
        nums = [i for i in forms.get(norm(word), []) if data['lemmas'][i].count('\t') >= 5]
        if not nums:
            missing.append(word)
            out.append(f'| {word} | — | — | (немає значення в словнику) | — |')
        for i in nums:
            out.append(row(word, entry(i)))
    out += ['', '## 3. 30 стійких виразів', '', '| Вираз | Переклад | Джерело |', '|---|---|---|']
    for line in rng.sample(data['expr'], 30):
        fr, uk, src = line.split('\t')
        out.append(f"| {fr} | {uk.replace('|', ' / ')} | {SRC[src]} |")
    out += ['', '## 4. 20 речень: Bergamot до і після словника', '',
            'Речення написані для цього проєкту. «До» — переклад пакета Bergamot (fr → en → uk) як є; «після» — той самий переклад, '
            'виправлений словником там, де він упевнений. Переклади зроблені справжнім рушієм і справжніми моделями Mozilla в CI '
            '(`tests/offline_dict_real_browser.py`).', '']
    log = Path(sys.argv[1]).read_text(encoding='utf-8', errors='replace') if len(sys.argv) > 1 else ''
    runs = [json.loads(m.group(1)) for m in re.finditer(r'REVIEW (\{.*\})', log)]
    if not runs:
        out.append('_Прогону з рушієм ще немає: запустіть CI і передайте журнал задачі цьому інструменту._')
    else:
        out += ['| # | Речення | Bergamot до | Після словника | Слово: до → після |', '|---|---|---|---|---|']
        for n, r in enumerate(runs, 1):
            word = f"**{r['word']}**: {r['wordBefore']} → {r['wordAfter']}" + (f" ({r['note']})" if r.get('note') else '')
            mark = ' ✎' if r.get('changed') else ''
            out.append(f"| {n} | {r['sentence']} | {r['before']} | {r['after']}{mark} | {word} |")
        out += ['', '✎ — речення, у якому словник щось замінив.']
    hard = [json.loads(m.group(1)) for m in re.finditer(r'HARD (\{.*\})', log)]
    out += ['', '## 5. 100 незвичних речень', '',
            'Рідкісні часи, омографи, еліція, вирази в інших часах і з запереченням, пастки, вигадані слова, розмовна мова, довгі '
            'речення (`dict/test_sentences_hard.tsv`). Лему й вираз кожного слова перевіряє `tests/offline_dict_hard_browser.py` '
            '(без моделей); переклади — справжній рушій у CI.', '']
    if not hard:
        out.append('_Прогону з рушієм ще немає._')
    else:
        changed = sum(1 for r in hard if r.get('changed'))
        out += [f'Словник змінив {changed} речень зі {len(hard)}.', '',
                '| # | Речення | Bergamot до | Після словника | Слово: до → після |', '|---|---|---|---|---|']
        for n, r in enumerate(hard, 1):
            word = f"**{r['word']}**: {r['wordBefore']} → {r['wordAfter']}" + (f" ({r['note']})" if r.get('note') else '')
            out.append(f"| {n} | {r['sentence']} | {r['before']} | {r['after']}{' ✎' if r.get('changed') else ''} | {word} |")
    (root / 'dict/REVIEW_SAMPLE.md').write_text('\n'.join(out) + '\n', encoding='utf-8')
    print(f'dict/REVIEW_SAMPLE.md written; textbook words without meaning: {missing or "none"}; sentences: {len(runs)}')


if __name__ == '__main__':
    main()
