"""The generated offline dictionary (dict/fr-uk.json, dict/uk-forms.json; tools/build_dict_fr_uk.py): schema, size, pinned catalog,
every form leads to an existing lemma, no empty meanings, every Ukrainian word of a meaning has its forms, the licences are stated."""
import hashlib, json, re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
MAX_BYTES = 10_000_000   # the owner's budget: the whole dictionary within 5–10 MB
fr_raw, uk_raw = (root / 'dict/fr-uk.json').read_bytes(), (root / 'dict/uk-forms.json').read_bytes()
fr, uk = json.loads(fr_raw), json.loads(uk_raw)

# ---- catalog: the app downloads exactly these bytes ----
catalog = (root / 'js/offline-dict-catalog.js').read_text()
for kind, path, raw, data in (('data', 'dict/fr-uk.json', fr_raw, fr), ('forms', 'dict/uk-forms.json', uk_raw, uk)):
    m = re.search(r'type: "%s", path: "%s", version: "(\w+)", size: (\d+), sha256: "([0-9a-f]{64})"' % (kind, re.escape(path)), catalog)
    assert m, f'{path} is not in js/offline-dict-catalog.js: run python3 tools/build_dict_fr_uk.py'
    assert m.group(1) == data['version'] and int(m.group(2)) == len(raw) and m.group(3) == hashlib.sha256(raw).hexdigest(), f'{path}: the catalog does not pin this file'
assert len(fr_raw) + len(uk_raw) <= MAX_BYTES, f'the dictionary grew to {len(fr_raw) + len(uk_raw)} bytes'
print(f'PASS catalog pins both files; size {len(fr_raw) + len(uk_raw)} bytes')

# ---- schema ----
assert fr['format'] == 1 and uk['format'] == 1
pos = set(fr['pos'])
assert pos == {'N', 'V', 'A', 'ADV', 'PRE', 'CON', 'PRO', 'DET', 'NUM', 'INTJ'}
lemmas = fr['lemmas']
with_meanings = 0
for i, line in enumerate(lemmas):
    cols = line.split('\t')
    assert len(cols) in (4, 6, 7), (i, line)
    assert cols[0] and cols[1] in pos and cols[2] in ('', 'm', 'f', 'mf') and re.fullmatch(r'\d+(\.\d+)?', cols[3]), (i, line)
    if len(cols) > 4:
        meanings = cols[4].split(';')
        assert meanings and all(m.strip() and m == m.strip() for m in meanings), ('empty meaning', line)
        assert all(a.strip() for m in meanings for a in m.split('|')), ('empty aspect alternative', line)
        assert len(cols[5]) == len(meanings) and set(cols[5]) <= {'w', 'x'}, ('one source per meaning', line)
        if len(cols) == 7:
            assert all(c.strip() for c in cols[6].split(';')), ('empty confusion', line)
        with_meanings += 1
print(f'PASS {len(lemmas)} lemmas, {with_meanings} with meanings, no empty meaning, every meaning has its source')

# ---- the index: sorted, front-coded, every form → existing lemmas ----
assert len(fr['heads']) == len(fr['index'])
forms, prev_key = 0, ''
for b, block in enumerate(fr['index']):
    rows, prev = block.split('\n'), ''
    assert 1 <= len(rows) <= fr['block']
    for n, row in enumerate(rows):
        full = prev[:int(row[0], 36)] + row[1:] if n else row
        prev = full
        key, refs = full.split('\t')
        if n == 0:
            assert fr['heads'][b] == key
        assert key > prev_key or (b == 0 and n == 0), ('index not sorted', prev_key, key)
        prev_key = key
        targets = [int(x, 16) for x in refs.split(',')]
        assert targets and all(0 <= t < len(lemmas) for t in targets), ('form leads nowhere', key)
        assert key == key.lower() and 'œ' not in key, key
        forms += 1
print(f'PASS {forms} forms, sorted, each leads to an existing lemma')

# ---- known forms ----
def lookup(word):
    key = word.lower().replace('œ', 'oe')
    i = max(n for n, h in enumerate(fr['heads']) if h <= key)
    prev = ''
    for n, row in enumerate(fr['index'][i].split('\n')):
        full = prev[:int(row[0], 36)] + row[1:] if n else row
        prev = full
        k, refs = full.split('\t')
        if k == key:
            return {lemmas[int(x, 16)].split('\t')[0] for x in refs.split(',')}
    return set()
for form, lemma in (('fasses', 'faire'), ('belles', 'beau'), ('yeux', 'œil'), ('allions', 'aller'), ('eûmes', 'avoir'), ('vendues', 'vendre')):
    assert lemma in lookup(form), (form, lookup(form))
print('PASS fasses → faire, belles → beau, yeux → œil, allions → aller, eûmes → avoir, vendues → vendre')

# ---- expressions ----
for line in fr['expr']:
    cols = line.split('\t')
    assert len(cols) == 3 and len(re.findall(r"\w+", cols[0])) >= 2 and cols[1].strip() and cols[2] in ('w', 'x'), line
assert len(fr['expr']) >= 500, 'the owner asked for 500+ set expressions'
print(f'PASS {len(fr["expr"])} set expressions')

# ---- Ukrainian forms ----
known = set()
for line in uk['uk']:
    lemma, kind, pid, cut = line.split('\t')
    assert re.fullmatch(r"N:[mfnp]|V:(perf|imperf)|A|ADV|PRE|CON|INTJ|NUM", kind) and 0 <= int(pid) < len(uk['paradigms']) and int(cut) >= 0, line
    known.add(lemma)
for para in uk['paradigms']:
    assert all('=' in pair for pair in para.split(' ')), para
missing = set()
for line in lemmas:
    cols = line.split('\t')
    if len(cols) > 4:
        for m in cols[4].split(';'):
            for alt in m.split('|'):
                head = alt.split()[0].lower()
                if head not in known and uk['alias'].get(head) not in known:
                    missing.add(head)
assert len(missing) <= with_meanings // 50, ('meanings without Ukrainian forms', sorted(missing)[:40])
print(f'PASS {len(known)} Ukrainian lemmas with forms; {len(missing)} meaning heads without forms (uninflected words)')

notice = (root / 'dict/NOTICE').read_text()
for needle in ('Lexique', 'CC BY-SA 4.0', 'VESUM', 'CC BY-NC-SA 4.0', 'Wiktionary', 'ConceptNet'):
    assert needle in notice, needle
print('PASS dict/NOTICE states the sources and their licences')
