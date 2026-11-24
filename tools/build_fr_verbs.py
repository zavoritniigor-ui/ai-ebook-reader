#!/usr/bin/env python3
# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Builds dict/fr-verbs.json — French conjugation tables for the Grammar panel, read by js/grammar-conjugation.js.

Owner, 2026-11-23: selecting a verb to see its conjugation must be immediate. The tables are data, not AI answers.

    python3 tools/build_fr_verbs.py            # build from the sources already cached by tools/build_dict_fr_uk.py
    python3 tools/build_fr_verbs.py --cache DIR

Sources (both cached and pinned by tools/build_dict_fr_uk.py; licences in dict/NOTICE, CC BY-SA 4.0):
    French Wiktionary, wiktextract extract (kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz): the verb entries' own
        conjugation tables (forms tagged indicative/present, imperfect, …), person by person.
    Lexique 3.83: which verbs (VER/AUX lemmas) — the French a learner reads — and how common each is.

Output (one line of JSON per section, so a diff stays readable):
    tenses    the simple tenses stored, in order; each has 6 persons (je, tu, il, nous, vous, ils), the impératif 3 (tu, nous, vous)
    patterns  ending lists: a verb's forms are its stem + each ending, in the order of `tenses`, then the past and the
              present participle; '~' = no such form (an impersonal verb has only «il»). Shared by every verb with the same endings.
    verbs     "lemma\\tstem\\tpattern\\taux": aux 'a' (avoir) or 'e' (être; pronominal verbs too); most common first
    homographs  a verb form -> the share of its uses that are another word in Lexique (books frequency): «porte» 0.87, «est» 0.01.
              js/grammar-conjugation.js counts a form as a verb in a sentence only with evidence when this is high; ≥ 0.05 only
    Compound tenses (passé composé, plus-que-parfait, …) are built from the auxiliary's own tables + the past participle by
    js/grammar-conjugation.js; this build builds them the same way and checks them against Wiktionary's own compound tables.
"""
import argparse, gzip, hashlib, json, os, re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
OUT = root / 'dict' / 'fr-verbs.json'
CHECK = root / 'tests' / 'fixtures' / 'fr_verbs_check.json'   # Wiktionary's own tables for a sample: tests/fr_conjugation_test.mjs
CHECK_ALSO = ['se lever', 'se souvenir', 's’asseoir', 'falloir', 'pleuvoir', 'aller', 'être', 'avoir', 'faire', 'dire', 'venir', 'prendre', 'manger', 'commencer', 'appeler', 'jeter', 'acheter', 'payer', 'finir', 'haïr', 'boire', 'naître', 'mourir', 'résoudre', 'coudre', 'moudre', 'vaincre', 'manœuvrer']
KAIKKI_FR = 'kaikki/fr-raw-wiktextract-data.jsonl.gz'
KAIKKI_FR_SHA256 = 'fdc0acd0dc33cb98323479bfc95ae17563f0e706868e7bef2413693b635354e3'
LEXIQUE = 'lexique-a742a88cb00759c1.tsv'
LEXIQUE_MD5 = 'a742a88cb00759c1ebed34995aed9904'

# (tense id, the Wiktionary tag set, number of persons)
TENSES = [
    ('present', {'indicative', 'present'}, 6),
    ('imparfait', {'indicative', 'imperfect'}, 6),
    ('passe_simple', {'indicative', 'past'}, 6),
    ('futur', {'indicative', 'future'}, 6),
    ('conditionnel', {'conditional', 'present'}, 6),
    ('subjonctif', {'subjunctive', 'present'}, 6),
    ('subjonctif_imparfait', {'subjunctive', 'imperfect'}, 6),
    ('imperatif', {'imperative', 'present'}, 3),
]
# Compound tenses checked against Wiktionary: (Wiktionary tags, the auxiliary's simple tense)
COMPOUND = [({'indicative', 'multiword-construction', 'past'}, 'present'), ({'indicative', 'pluperfect'}, 'imparfait'),
            ({'indicative', 'future', 'perfect'}, 'futur'), ({'conditional', 'past'}, 'conditionnel'), ({'subjunctive', 'past'}, 'subjonctif')]
PERSON = [  # the subject pronoun a Wiktionary cell starts with -> person index
    (re.compile(r"^(?:que\s+|qu['’]\s*)?j(?:e\s+|['’]\s*)", re.I), 0), (re.compile(r"^(?:que\s+)?tu\s+", re.I), 1),
    (re.compile(r"^(?:que\s+|qu['’]\s*)?(?:il\s*/\s*elle\s*/\s*on|il|elle|on)\s+", re.I), 2),
    (re.compile(r"^(?:que\s+)?nous\s+", re.I), 3), (re.compile(r"^(?:que\s+)?vous\s+", re.I), 4),
    (re.compile(r"^(?:que\s+|qu['’]\s*)?(?:ils\s*/\s*elles|ils|elles)\s+", re.I), 5),
]
IMPERATIVE_PERSONS = [1, 3, 4]


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''): h.update(block)
    return h.hexdigest()


def split_person(cell):
    cell = cell.strip()
    for rx, person in PERSON:
        m = rx.match(cell)
        if m: return person, cell[m.end():].strip()
    return None, cell


def tables_of(entry):
    """{tense: [form or None]*n}, past participle, present participle, compound tables {i: [..6]} from one Wiktionary verb entry."""
    out = {t: [None] * n for t, _, n in TENSES}
    compound = {i: [None] * 6 for i in range(len(COMPOUND))}
    pp = pr = None
    for f in entry.get('forms', []):
        tags, form = set(f.get('tags') or []), (f.get('form') or '').strip()
        if not form or form == '-': continue
        if tags == {'participle', 'past'}: pp = pp or form; continue
        if tags == {'participle', 'present'}: pr = pr or form; continue
        for t, want, n in TENSES:
            if tags == want:
                if n == 3:
                    slot = out[t].index(None) if None in out[t] else None   # tu, nous, vous in order
                    if slot is not None: out[t][slot] = form
                else:
                    person, rest = split_person(form)
                    if person is not None and out[t][person] is None: out[t][person] = rest
        for i, (want, _) in enumerate(COMPOUND):
            if tags == want:
                person, rest = split_person(form)
                if person is not None and compound[i][person] is None: compound[i][person] = rest
    return out, pp, pr, compound


def common_prefix(words):
    words = [w for w in words if w]
    if not words: return ''
    p = words[0]
    for w in words[1:]:
        while not w.startswith(p): p = p[:-1]
    return p


def build_compound(aux_tables, aux, pp, tense, person, reflexive):
    """The compound form as js/grammar-conjugation.js builds it: auxiliary + past participle (+ s in the plural with être)."""
    a = aux_tables['etre' if aux == 'e' else 'avoir'][tense][person]
    if not a or not pp: return None
    part = pp + ('s' if aux == 'e' and person in (3, 4, 5) and not pp.endswith('s') else '')
    if reflexive:
        pron = ['me', 'te', 'se', 'nous', 'vous', 'se'][person]
        if pron in ('me', 'te', 'se') and re.match(r"[aeiouyéèêhâ]", a, re.I): return f"{pron[0]}’{a} {part}"
        return f"{pron} {a} {part}"
    return f"{a} {part}"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--cache', default=os.path.expanduser('~/.cache/ai-reader-dict'))
    args = ap.parse_args()
    cache = Path(args.cache)
    kaikki, lexique = cache / KAIKKI_FR, cache / LEXIQUE
    for p in (kaikki, lexique):
        if not p.exists(): sys.exit(f'missing {p}: run tools/build_dict_fr_uk.py once (it downloads and verifies the sources)')
    if sha256(kaikki) != KAIKKI_FR_SHA256: sys.exit(f'{kaikki}: SHA-256 differs from the pinned one')
    if hashlib.md5(lexique.read_bytes()).hexdigest() != LEXIQUE_MD5: sys.exit(f'{lexique}: MD5 differs from the pinned one')

    rows = lexique.read_text(encoding='utf-8').splitlines()
    hdr = rows[0].split('\t'); ic, il, ifr = hdr.index('cgram'), hdr.index('lemme'), hdr.index('freqlemlivres')
    freq = {}
    io, iff = hdr.index('ortho'), hdr.index('freqlivres')
    as_verb, as_other = {}, {}
    for r in (x.split('\t') for x in rows[1:]):
        if r[ic] in ('VER', 'AUX'):
            try: freq[r[il]] = max(freq.get(r[il], 0.0), float(r[ifr]))
            except ValueError: pass
        try: f = float(r[iff])
        except ValueError: f = 0.0
        d = as_verb if r[ic] in ('VER', 'AUX') else as_other
        d[r[io]] = d.get(r[io], 0.0) + f
    homographs = {}
    for w in sorted(as_verb):
        share = as_other.get(w, 0.0) / (as_verb[w] + as_other.get(w, 0.0) + 1e-9)
        if share >= 0.05: homographs[w] = round(share, 2)

    spell = lambda v: v.replace('oe', 'œ')   # Lexique writes manoeuvrer, Wiktionary manœuvrer
    wanted = set(freq) | {spell(v) for v in freq} | {p + x for v in freq for x in (v, spell(v)) for p in ('se ', 's’')}
    best = {}
    with gzip.open(kaikki, 'rt', encoding='utf-8') as f:
        for line in f:
            if '"pos": "verb"' not in line or '"lang_code": "fr"' not in line: continue
            d = json.loads(line)
            w = d.get('word')
            if d.get('lang_code') != 'fr' or d.get('pos') != 'verb' or w not in wanted: continue
            n = len(d.get('forms', []))
            if n > len(best.get(w, {}).get('forms', [])): best[w] = d

    aux_tables = {}
    for name, key in (('avoir', 'avoir'), ('être', 'etre')):
        aux_tables[key] = tables_of(best[name])[0]

    verbs, patterns, pattern_ids, check = [], [], {}, {}
    compound_ids = ['indicatif_passe_compose', 'plus_que_parfait', 'futur_anterieur', 'conditionnel_passe', 'subjonctif_passe']
    stats = {'verbs': 0, 'reflexive_only': 0, 'compound_checked': 0, 'compound_mismatch': 0, 'missing': []}
    mismatches = []
    for lemma in sorted(freq, key=lambda v: (-freq[v], v)):
        name = lemma if best.get(lemma) else spell(lemma)
        # The entry with the fullest table: «souvenir» alone is impersonal (il me souvient), «se souvenir» has every person.
        # A tie keeps the plain verb (lever, not se lever).
        options = [(best.get(name), False), (best.get('se ' + name) or best.get('s’' + name), True)]
        options = [(e, r) for e, r in options if e and len(e.get('forms', [])) >= 20]
        if not options: stats['missing'].append(lemma); continue
        filled = lambda e: sum(1 for t, _, _ in TENSES for c in tables_of(e)[0][t] if c)
        entry, reflexive = max(options, key=lambda o: (filled(o[0]), not o[1]))
        tables, pp, pr, compound = tables_of(entry)
        if not any(tables['present']): stats['missing'].append(lemma); continue
        # An entry whose own table is pronominal (contrefoutre = «je me contrefous») is a pronominal verb.
        if re.match(r"^(?:me\s|m['’])", tables['present'][0] or ''): reflexive = True
        # the auxiliary, from Wiktionary's own passé composé
        pc = next((c for c in compound[0] if c), '') or ''
        bare = re.sub(r"^(?:me|te|se|nous|vous|m['’]|t['’]|s['’])\s*", '', pc)
        aux = 'e' if reflexive or re.match(r"^(?:suis|es|est|sommes|êtes|sont)\b", bare) else 'a'
        for i, (_, tense) in enumerate(COMPOUND):
            for person in range(6):
                want = compound[i][person]
                if not want: continue
                got = build_compound(aux_tables, aux, pp, tense, person, reflexive)
                stats['compound_checked'] += 1
                if got != want:
                    stats['compound_mismatch'] += 1
                    if len(mismatches) < 25: mismatches.append((lemma, tense, person, got, want))
        cells = [x for t, _, _ in TENSES for x in tables[t]] + [pp, pr]
        stem = common_prefix([c for c in cells if c])
        key = '|'.join('~' if c is None else c[len(stem):] for c in cells)
        if key not in pattern_ids: pattern_ids[key] = len(patterns); patterns.append(key)
        full = ('se ' if reflexive else '') + name
        if len(check) < 170 or full in CHECK_ALSO or name in CHECK_ALSO:
            check[full] = {'simple': {t: tables[t] for t, _, _ in TENSES}, 'compound': {compound_ids[i]: compound[i] for i in compound},
                           'participles': [pp, pr]}
        verbs.append(f"{('se ' if reflexive else '') + name}\t{stem}\t{pattern_ids[key]}\t{aux}")
        stats['verbs'] += 1; stats['reflexive_only'] += reflexive

    out = {
        'format': 1,
        'source': {'wiktionary_fr': KAIKKI_FR_SHA256, 'lexique': LEXIQUE_MD5},
        'tenses': [[t, n] for t, _, n in TENSES],
        'patterns': patterns,
        'verbs': verbs,
        'homographs': homographs,
    }
    text = '{\n' + ',\n'.join(f'"{k}": {json.dumps(v, ensure_ascii=False, separators=(",", ":"))}' for k, v in out.items()) + '\n}\n'
    OUT.write_text(text, encoding='utf-8')
    CHECK.parent.mkdir(parents=True, exist_ok=True)
    CHECK.write_text(json.dumps({'note': 'Wiktionary tables of a sample of verbs, written by tools/build_fr_verbs.py', 'verbs': check},
                                ensure_ascii=False, indent=0) + '\n', encoding='utf-8')
    print(f'check sample: {len(check)} verbs -> {CHECK.relative_to(root)}')
    gz = len(gzip.compress(text.encode('utf-8'), 9))
    print(f"verbs {stats['verbs']} (pronominal only: {stats['reflexive_only']}), patterns {len(patterns)}, "
          f"{len(text.encode('utf-8')) // 1024} KB ({gz // 1024} KB gzip) -> {OUT.relative_to(root)}")
    print(f"homographs (a verb form that is often another word): {len(homographs)}")
    print(f"compound forms checked against Wiktionary: {stats['compound_checked']}, different: {stats['compound_mismatch']}")
    for m in mismatches: print('   ', m)
    print(f"Lexique verbs without a Wiktionary table: {len(stats['missing'])}; the most common: {stats['missing'][:15]}")


if __name__ == '__main__':
    main()
