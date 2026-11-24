#!/usr/bin/env python3
# Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
# Copying, modification, distribution or commercial use without written permission is prohibited.
"""Builds dict/en-verbs.json — English verb forms and adjective degrees for the Grammar panel, read by js/grammar-english.js.

The French tables (tools/build_fr_verbs.py) made the Grammar panel immediate for French; this is the same for English.

    python3 tools/build_en_verbs.py            # build from the extract already cached by tools/build_dict_fr_uk.py
    python3 tools/build_en_verbs.py --cache DIR

Source (cached and pinned; licence in dict/NOTICE, CC BY-SA 4.0 / GFDL):
    English Wiktionary, wiktextract extract (kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz), its English entries only:
        - a verb's forms (3rd person singular, present participle, past, past participle), as its headword line gives them;
        - an adjective's comparative and superlative;
        - how common a form is: how often it occurs in the usage examples and quotations of all English entries (several
          million words of real English; no separate frequency list is needed), and, from the word before it, how often the form
          is used as a verb (I walk, to walk, will walk) or as a noun (the walk) or an adjective (very light, the light car).

Output (one line of JSON per section):
    verbs        "lemma\\tcode": most common first. code '' = regular (walk: walks, walking, walked, walked), or the forms that are
                 not regular: "s|ing|past|pp" with '' for a regular cell (go: goes||went|gone). js/grammar-english.js applies the same
                 spelling rules (enRegularForms) as this build, which checks every verb's four forms against Wiktionary.
    adjectives   "lemma\\tcode": code '' = no comparative (–), 'er' = regular -er/-est (big: bigger, biggest), 'more' = more/most
                 (beautiful), or "comparative|superlative" spelled out (good: better|best).
    homographs   a verb form -> how often a determiner or very / so stands before it in the examples, against a subject pronoun,
                 a modal: the share of its uses that are not a verb ("book" 0.99, "walk" 0.4, "went" none); only ≥ 0.05.
    adj_homographs  how often an adjective, after a determiner, ends its phrase -- a noun there («the light.», «the right of»).
    adj_participles the participles that after «be» are adjectives (very tired, so interested), not the passive (was painted).
"""
import argparse, gzip, hashlib, json, os, re, subprocess, sys
from collections import Counter, defaultdict
from pathlib import Path

root = Path(__file__).resolve().parent.parent
OUT = root / 'dict' / 'en-verbs.json'
CHECK = root / 'tests' / 'fixtures' / 'en_verbs_check.json'   # Wiktionary's own forms for a sample: tests/en_conjugation_test.mjs
KAIKKI_EN = 'kaikki/en-raw-wiktextract-data.jsonl.gz'
KAIKKI_EN_SHA256 = '784574cc577d333bbf9e659be38efa27e75e9bfc0a2a8c7ab2371bb5fec29b2d'
VERB_MAX = 9000       # the most common verbs
ADJ_MAX = 12000       # the most common adjectives
SKIP_SENSE_TAGS = {'obsolete', 'archaic', 'rare', 'nonstandard', 'dialectal', 'misspelling', 'proscribed', 'nonce-word', 'Internet', 'slang'}
# The word before a form tells how it is used: after a determiner it is a noun (the book), after a subject pronoun, «to» or a
# modal a verb (I book, to book, will book), after an intensifier an adjective (very light).
CONTEXT_OF = {**{w: 'det' for w in ('the', 'a', 'an', 'his', 'her', 'my', 'your', 'their', 'our', 'its', 'these', 'those', 'every', 'each')},
              **{w: 'subj' for w in ('i', 'you', 'we', 'they', 'he', 'she')},
              'to': 'to', **{w: 'modal' for w in ('will', 'would', 'can', 'could', 'should', 'must', 'may', 'might', "didn't", "don't", "doesn't", 'shall')},
              **{w: 'be' for w in ('is', 'are', 'was', 'were', 'am', 'be', 'been', "i'm", "it's", "he's", "she's", "they're", "we're", "you're")},
              **{w: 'intens' for w in ('very', 'so', 'too', 'quite', 'rather', 'extremely', 'really', 'more', 'most', 'less', 'least', 'how', 'fairly', 'pretty')}}
NOUN_END_RE = re.compile(r'[.,;:!?()"“”]')
FUNCTION_AFTER_NOUN = {'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'and', 'or', 'but', 'is', 'was', 'are', 'were', 'has', 'had', 'have',
                       'that', 'which', 'who', 'he', 'she', 'it', 'they', 'we', 'i', 'you', 'as', 'than', 'will', 'would', 'can', 'could', 'into', 'about'}
TOKEN_RE = re.compile(r"[a-z]+(?:['’][a-z]+)*")


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''): h.update(block)
    return h.hexdigest()


# ---------- pass over the extract (slow: ~3 GB; cached by the extract's hash) ----------
def scan(src, cache_dir):
    cache_path = Path(cache_dir) / f'en-verbs-pass5-{KAIKKI_EN_SHA256[:16]}.json.gz'   # JSON, not pickle: data only
    if cache_path.exists():
        with gzip.open(cache_path, 'rt', encoding='utf-8') as f: return json.load(f)
    entries = defaultdict(list)      # (word, pos) -> [{forms, senses, tags}]  (verbs and adjectives)
    pos_of = defaultdict(set)        # word -> every part of speech it has (lemma entries, not form-of)
    freq = Counter()                 # token -> occurrences in the examples (outside the marked headword)
    ctx = defaultdict(Counter)       # token -> the kinds of word right before it (CONTEXT_OF): how it is used
    # zcat | grep keeps only the English entries' lines (fast); no shell
    unzip = subprocess.Popen(['zcat', str(src)], stdout=subprocess.PIPE)
    proc = subprocess.Popen(['grep', '-F', '"lang_code": "en"'], stdin=unzip.stdout, stdout=subprocess.PIPE, bufsize=1 << 20)
    unzip.stdout.close()
    n = 0
    for line in proc.stdout:
        d = json.loads(line)
        if d.get('lang_code') != 'en': continue
        n += 1
        word, pos = d.get('word', ''), d.get('pos', '')
        senses = d.get('senses') or []
        lemma_senses = [s for s in senses if not s.get('form_of') and not s.get('alt_of') and 'form-of' not in (s.get('tags') or [])]
        if lemma_senses and ' ' not in word: pos_of[word].add(pos)
        if pos in ('verb', 'adj') and ' ' not in word:
            entries[(word, pos)].append({
                'forms': [(f.get('form', ''), tuple(f.get('tags') or ())) for f in (d.get('forms') or [])
                          if not {'table-tags', 'inflection-template'} & set(f.get('tags') or ())][:40],
                'lemma_senses': len(lemma_senses),
                'good_senses': sum(1 for s in lemma_senses if not SKIP_SENSE_TAGS & set(s.get('tags') or ())),
                'form_of': sorted({fo.get('word', '') for s in senses for fo in (s.get('form_of') or [])})[:4],
            })
        for s in senses:
            for ex in s.get('examples') or []:
                text = ex.get('text') or ''
                if not text or len(text) > 2000: continue
                spans = ex.get('bold_text_offsets') or []
                low = text.lower().replace('’', "'")
                cut = [False] * len(low)
                for a, b in spans:
                    if 0 <= a < b <= len(low):
                        for i in range(a, b): cut[i] = True
                toks = list(TOKEN_RE.finditer(low))
                for i, m in enumerate(toks):
                    tok = m.group()
                    if not cut[m.start()]: freq[tok] += 1
                    kind = CONTEXT_OF.get(toks[i - 1].group()) if i else None
                    if kind: ctx[tok][kind] += 1
                    if kind == 'det':   # «the way.» / «the way to»: a noun; «the big house»: (mostly) an adjective
                        nxt = toks[i + 1] if i + 1 < len(toks) else None
                        ends = nxt is None or NOUN_END_RE.search(low, m.end(), nxt.start()) or nxt.group() in FUNCTION_AFTER_NOUN
                        ctx[tok]['det_end' if ends else 'det_word'] += 1
    proc.wait(); unzip.wait()
    data = {'entries': {f'{w}\t{p}': v for (w, p), v in entries.items()}, 'pos_of': {w: sorted(p) for w, p in pos_of.items()}, 'freq': freq, 'ctx': {w: dict(c) for w, c in ctx.items() if sum(c.values()) >= 2}, 'lines': n}
    with gzip.open(cache_path, 'wt', encoding='utf-8') as f: json.dump(data, f)
    return data


# ---------- the spelling rules (js/grammar-english.js enRegularForms is the same) ----------
VOWEL_GROUPS = re.compile(r'[aeiouy]+')


def doubles(w):
    """stop -> stopp-ing, big -> bigg-er: one syllable ending consonant + one vowel + consonant (not w, x, y)."""
    return bool(re.search(r'(?:^|[^aeiou])[aeiou][bcdfgklmnprstvz]$', w)) and len(VOWEL_GROUPS.findall(w[:-1] + 'x')) == 1 and not w.endswith('qu')


def regular_verb(w):
    if re.search(r'(?:s|x|z|ch|sh|o)$', w): s = w + 'es'
    elif re.search(r'[^aeiou]y$', w): s = w[:-1] + 'ies'
    else: s = w + 's'
    st = w + w[-1] if doubles(w) else w
    if w.endswith('ie'): ing = w[:-2] + 'ying'
    elif re.search(r'[^aeioy]e$', w): ing = w[:-1] + 'ing'
    else: ing = st + 'ing'
    if w.endswith('e'): past = w + 'd'
    elif re.search(r'[^aeiou]y$', w): past = w[:-1] + 'ied'
    else: past = st + 'ed'
    return [s, ing, past, past]


def regular_adj(w):
    if w.endswith('e'): return [w + 'r', w + 'st']
    if re.search(r'[^aeiou]y$', w): return [w[:-1] + 'ier', w[:-1] + 'iest']
    st = w + w[-1] if doubles(w) else w
    return [st + 'er', st + 'est']


def decode_verb(lemma, code):
    reg = regular_verb(lemma)
    if not code: return [[c] for c in reg]
    return [cell.split(',') if cell else [reg[i]] for i, cell in enumerate(code.split('|'))]


def decode_adj(lemma, code):
    if code == '': return None
    if code == 'm': return [['more ' + lemma], ['most ' + lemma]]
    if code == 'r': return [[c] for c in regular_adj(lemma)]
    return [c.split(',') for c in code.split('|')]


# ---------- build ----------
# never a verb or an adjective in the tables (their rare senses: «to you», «an even number» is kept by the AI if ever)
FUNCTION_WORDS = set('''i you he she it we they me him her us them my your his its our their mine yours ours theirs this that these those
a an the some any no every each all both either neither many much more most few less least several such other another own same
first second third last next one two three four five six seven eight nine ten hundred thousand million
of in on at by for with from into onto upon about over under after before between through during without within against among
towards toward across behind beyond near since until till than as per via off out up down around along despite past
and or but nor so yet because although though if unless while whereas whether when where why how what which who whom whose
not just even still well also only very too quite rather almost already always never ever often sometimes soon then now here there
again once twice back away else perhaps maybe really indeed enough ago today tomorrow yesterday tonight together anyway something
nothing anything everything someone anyone everyone nobody somebody anybody everybody yes oh sir mr mrs miss lord'''.split())
CLOSED_POS = {'pron', 'det', 'prep', 'conj', 'particle', 'num', 'article', 'postp'}
MODALS = {'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would', 'ought'}
BAD_FORM_TAGS = {'archaic', 'obsolete', 'nonstandard', 'dialectal', 'rare', 'alternative', 'colloquial', 'proscribed', 'humorous', 'Internet',
                 'pronunciation-spelling', 'error-lua-exec', 'poetic', 'informal', 'slang', 'eye-dialect', 'Northumbria', 'Scotland', 'misspelling'}
VERB_CELLS = [frozenset({'present', 'singular', 'third-person'}), frozenset({'participle', 'present'}), frozenset({'past'}), frozenset({'participle', 'past'})]
ADJ_CELLS = [frozenset({'comparative'}), frozenset({'superlative'})]
WORD_RE = re.compile(r"^[a-z]+(?:-[a-z]+)*$")
CAPITALISED_ADJ_RE = re.compile(r"^[A-Z][a-z]+$")   # American, French, Victorian


def cells_of(entries, cell_tags):
    """Each cell's forms, the main one first: the entry with the most senses gives it, the others add their own spellings."""
    out = [[] for _ in cell_tags]
    for e in sorted(entries, key=lambda e: -e['good_senses']):
        for form, tags in e['forms']:
            t = set(tags)
            if t & BAD_FORM_TAGS or not WORD_RE.match(form.replace('more ', '').replace('most ', '')): continue
            t -= {'British', 'US', 'Canada', 'Australia', 'UK', 'Commonwealth', 'American'}
            for i, want in enumerate(cell_tags):
                if t == want and form not in out[i]: out[i].append(form)
    return out


def verbal(ctx, w):
    c = {k: v for k, v in (ctx.get(w) or {}).items() if k not in ('det_word', 'det_end', 'be')}
    total = sum(c.values())
    if total < 8: return 0.2
    return (c.get('subj', 0) + c.get('modal', 0) + 0.3 * c.get('to', 0)) / total


def ctx_share(ctx, w, kinds, skip=()):
    c = {k: v for k, v in (ctx.get(w) or {}).items() if k not in skip and k not in ('det_word', 'det_end')}
    total = sum(c.values())
    return (sum(c.get(k, 0) for k in kinds) / total if total >= 8 else None), total


def build(data):
    E = {tuple(k.split('\t')): v for k, v in data['entries'].items()}
    F, C, P = data['freq'], data['ctx'], data['pos_of']
    verbs, adjs = [], []
    for (w, pos), entries in E.items():
        if not (WORD_RE.match(w) or (pos == 'adj' and CAPITALISED_ADJ_RE.match(w))) or w in MODALS: continue
        # pronouns, prepositions, determiners… (you, on, about, one) have rare verb / adjective senses; «like» stays (I like)
        if w in FUNCTION_WORDS or (pos == 'verb' and set(P.get(w, [])) & CLOSED_POS and verbal(C, w) < 0.35): continue
        good = [e for e in entries if e['good_senses'] > 0]
        if not good: continue
        if pos == 'verb':
            cells = cells_of(good, VERB_CELLS)
            if not all(cells): continue
            # a spelling kept beside the main one only when it is in real use (dreamt, learnt, gotten; not «sayed», «thunk»)
            # the most used spelling first (fixed, not «fixt»)
            cells = [sorted(c, key=lambda f: -F.get(f, 0)) for c in cells]
            cells = [[c[0]] + [f for f in c[1:] if F.get(f, 0) >= 0.1 * max(1, F.get(c[0], 0))] for c in cells]
            # how often its forms are used AS A VERB: after a subject pronoun, a modal or «to» (not «the use», «to you»)
            score = sum(F.get(f, 0) * verbal(C, f) for f in {w, *(c[0] for c in cells)})
            verbs.append((score, w, cells))
        else:
            cells = cells_of(good, ADJ_CELLS)
            # how often it is used as an adjective: after very / so / more, or between a determiner and a word («the big house»),
            # not as a noun («the way.», «the part of», «the home of»)
            c = C.get(w.lower()) or {}
            total = sum(v for k, v in c.items() if k not in ('det', 'be'))
            mid, end = c.get('det_word', 0), c.get('det_end', 0)
            ratio = mid / (mid + end) if mid + end >= 8 else None
            intens = c.get('intens', 0) / total if total >= 8 else 0
            if ratio is None: ok = intens >= 0.1 or (total < 8 and 'noun' not in P.get(w, []))
            else: ok = ratio >= 0.6 or (intens >= 0.05 and ratio >= 0.4)
            if not ok or (w[0].isupper() and (F.get(w.lower(), 0) < 30 or (w.lower(), 'adj') in E)): continue   # Victorian, French; not «Seussian», not «Red»
            score = F.get(w.lower(), 0) * ((ratio or 0.3) + intens)
            adjs.append((score, w, cells))
    # a form shared by two verbs counts for the more common one only («found»: find, not to found; «saw»: see)
    verbs.sort(key=lambda v: (-v[0], v[1]))
    claimed, rescored, pasts = set(), [], set()
    for score, w, cells in verbs:
        forms = {w, *(c[0] for c in cells)}
        # an irregular past that is a more common verb's own past is a dialect spelling of that verb («gan»: went)
        if cells[2][0] in pasts and cells[2][0] != regular_verb(w)[2]: continue
        pasts.add(cells[2][0])
        rescored.append((sum(F.get(f, 0) * verbal(C, f) for f in forms - claimed), w, cells))
        claimed |= forms
    verbs = [v for v in sorted(rescored, key=lambda v: (-v[0], v[1])) if v[0] >= 2][:VERB_MAX]   # «gan» (went): its own forms are rare
    adjs.sort(key=lambda v: (-v[0], v[1]))
    # «better», «eldest»: a degree of another adjective, not an adjective of its own; «taken», «lived», «fell»: a verb form, an
    # adjective only when it is really used as one (very tired, the developed world)
    degree_forms = {f for _, w, cells in adjs for c in cells for f in c if ' ' not in f and f != w}
    verb_forms = {f for _, w, cells in verbs for c in cells for f in c}
    def adjectival(w):
        c = C.get(w) or {}
        total = sum(v for k, v in c.items() if k not in ('det', 'be'))
        mid, end = c.get('det_word', 0), c.get('det_end', 0)
        return (total >= 8 and c.get('intens', 0) / total >= 0.1) or (mid >= 50 and mid / (mid + end) >= 0.8)
    adjs = [a for a in adjs if a[1] not in degree_forms and (a[1] not in verb_forms or adjectival(a[1]))]
    adjs = [a for a in adjs if a[0] >= 2][:ADJ_MAX]
    verb_lines, adj_lines, homographs, adj_homographs = [], [], {}, {}
    for _, w, cells in verbs:
        reg = regular_verb(w)
        code = '|'.join('' if c == [reg[i]] else ','.join(c) for i, c in enumerate(cells))
        if code == '|||': code = ''
        assert decode_verb(w, code) == cells, (w, code, cells)
        verb_lines.append(f'{w}\t{code}' if code else w)
        for f in {w, *(c[0] for c in cells)}:
            if f == cells[1][0]:   # an -ing form: a verb after be (is walking), a noun after a determiner (the building)
                c = C.get(f) or {}
                n = c.get('det', 0) + c.get('be', 0)
                if n >= 8 and c.get('det', 0) / n >= 0.05: homographs[f] = round(c.get('det', 0) / n, 2)
                continue
            share, total = ctx_share(C, f, ('det', 'intens'), ('to', 'be'))
            if share is None and f == cells[0][0]: share = ctx_share(C, w, ('det', 'intens'), ('to', 'be'))[0]   # «advantages»: as «advantage»
            if share is not None and share >= 0.05: homographs[f] = round(share, 2)
            elif share is None and ('noun' in P.get(f, []) or 'noun' in P.get(w, [])): homographs[f] = 0.5   # too rare to tell; also a noun
    for _, w, cells in adjs:
        comp, sup = cells
        if not comp or not sup: code = ''
        elif comp[0].startswith('more ') and sup[0].startswith('most '): code = 'm'
        else:
            comp1 = [f for f in comp if not f.startswith('more ')] or comp
            sup1 = [f for f in sup if not f.startswith('most ')] or sup
            code = 'r' if [comp1[0], sup1[0]] == regular_adj(w) and len(comp1) == 1 and len(sup1) == 1 else ','.join(comp1) + '|' + ','.join(sup1)
            if code != 'r': assert decode_adj(w, code) == [comp1, sup1], (w, code)
        adj_lines.append(f'{w}\t{code}' if code else w)
        # how often the word, after a determiner, ends its phrase (a noun: «the light.», «the right of») -- an adjective there only
        # with a word after it to describe
        c = C.get(w) or {}
        mid, end = c.get('det_word', 0), c.get('det_end', 0)
        if 'noun' in P.get(w, []) and mid + end >= 20 and end / (mid + end) >= 0.2: adj_homographs[w] = round(end / (mid + end), 2)
    # after be, a participle is an adjective only when it is mostly used as one: very tired, so interested, quite boring
    # («was painted», «were justified», «is leading» stay the passive / continuous)
    adj_participles = []
    for _, w, cells in adjs:
        if w not in verb_forms: continue
        c = {k: v for k, v in (C.get(w) or {}).items() if k not in ('det_word', 'det_end', 'be')}
        total = sum(c.values())
        if total >= 20 and c.get('intens', 0) / total >= 0.38: adj_participles.append(w)
    return verb_lines, adj_lines, homographs, adj_homographs, verbs, adjs, adj_participles


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', default=os.path.expanduser('~/.cache/ai-reader-dict'))
    args = ap.parse_args()
    src = Path(args.cache) / KAIKKI_EN
    pass_file = Path(args.cache) / f'en-verbs-pass5-{KAIKKI_EN_SHA256[:16]}.json.gz'
    if not pass_file.exists() and sha256(src) != KAIKKI_EN_SHA256: sys.exit(f'{src}: not the pinned extract (SHA-256)')
    data = scan(src, args.cache)
    verb_lines, adj_lines, homographs, adj_homographs, verbs, adjs, adj_participles = build(data)
    out = {'format': 1, 'source': 'English Wiktionary (wiktextract, kaikki.org), CC BY-SA 4.0; see dict/NOTICE'}
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('{\n')
        f.write(f'"format": 1,\n"source": {json.dumps(out["source"])},\n')
        f.write(f'"verbs": {json.dumps(verb_lines, ensure_ascii=False)},\n')
        f.write(f'"adjectives": {json.dumps(adj_lines, ensure_ascii=False)},\n')
        f.write(f'"homographs": {json.dumps(dict(sorted(homographs.items())), ensure_ascii=False)},\n')
        f.write(f'"adj_homographs": {json.dumps(dict(sorted(adj_homographs.items())), ensure_ascii=False)},\n')
        f.write(f'"adj_participles": {json.dumps(sorted(adj_participles), ensure_ascii=False)}\n')
        f.write('}\n')
    raw = OUT.read_bytes()
    # Wiktionary's own forms for a sample (the most common 150 verbs, every irregular one of the first 2 000, every 40th after),
    # and the adjectives likewise: tests/en_conjugation_test.mjs compares js/grammar-english.js with them.
    vs = [v for i, v in enumerate(verbs) if i < 150 or (i < 2000 and verb_lines[i].count('\t')) or i % 40 == 0]
    ad = [a for i, a in enumerate(adjs) if i < 150 or (i < 2000 and adj_lines[i].count('\t') and not adj_lines[i].endswith('\tr') and not adj_lines[i].endswith('\tm')) or i % 40 == 0]
    def adj_check(cells):
        if not all(cells): return None
        if cells[0][0].startswith('more '): return [cells[0][0], cells[1][0]]   # Wiktionary's first form: «more right», not «righter»
        comp = [f for f in cells[0] if not f.startswith('more ')] or cells[0]
        sup = [f for f in cells[1] if not f.startswith('most ')] or cells[1]
        return [comp[0], sup[0]]
    with open(CHECK, 'w', encoding='utf-8') as f:   # one line per word: «"go": ["goes", "going", "went", "gone"]»
        f.write('{"verbs": {\n' + ',\n'.join(f'{json.dumps(w)}: {json.dumps([c[0] for c in cells])}' for _, w, cells in vs) + '\n},\n')
        f.write('"adjectives": {\n' + ',\n'.join(f'{json.dumps(w, ensure_ascii=False)}: {json.dumps(adj_check(cells), ensure_ascii=False)}' for _, w, cells in ad) + '\n}}\n')
    irregular = sum(1 for l in verb_lines if '\t' in l)
    print(f'{OUT.relative_to(root)}: {len(verb_lines)} verbs ({irregular} not regular), {len(adj_lines)} adjectives, '
          f'{len(homographs)} verb homographs, {len(adj_homographs)} adjective homographs; {len(raw)} bytes, {len(gzip.compress(raw, 9))} gzip; '
          f'version {hashlib.sha256(raw).hexdigest()[:12]}')
    print(f'{CHECK.relative_to(root)}: {len(vs)} verbs, {len(ad)} adjectives checked against Wiktionary by tests/en_conjugation_test.mjs')


if __name__ == '__main__' and '--scan-only' in sys.argv:
    cache = Path(os.path.expanduser('~/.cache/ai-reader-dict'))
    d = scan(cache / KAIKKI_EN, cache)
    print(d['lines'], len(d['entries']), len(d['freq']))
    sys.exit(0)
if __name__ == '__main__':
    main()
