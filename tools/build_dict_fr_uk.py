"""Build the offline French → Ukrainian dictionary (dict/fr-uk.json) and its pinned catalog (js/offline-dict-catalog.js).

    python3 tools/build_dict_fr_uk.py                 # download the sources once (cached), build, print statistics
    python3 tools/build_dict_fr_uk.py --cache DIR     # where the downloaded sources are kept (default ~/.cache/ai-reader-dict)
    python3 tools/build_dict_fr_uk.py --kaikki FILE   # also read Wiktionary translations from a wiktextract (kaikki.org) JSONL file
    python3 tools/build_dict_fr_uk.py --todo          # list frequent lemmas that still have no Ukrainian meaning (for dict/src/written-*.tsv)

Sources (every download pinned by SHA-256; see dict/NOTICE for the licences):
    Lexique 3.83            French lemmas, forms, part of speech, gender, frequency (lexique.org; the same file is shipped
                            inside the pylexique wheel on PyPI, used when lexique.org is unreachable)
    Wiktionary (en)         French headwords with their inflected forms and English senses (kaikki.org/wiktextract extract,
                            published as a TSV by the Wiktionary-Dictionaries project)
    Wiktionary (fr, en)     French → Ukrainian translations, through ConceptNet 5.7 (its Wiktionary-derived edges only)
    VESUM 6.8.6             Ukrainian word forms (brown-uk/dict_uk release): checks every Ukrainian meaning and gives the forms
                            the app needs to fit a substituted word into its sentence
    dict/src/*.tsv          meanings and set expressions written for this project (source "written")

Output, read by js/offline-dict.js and pinned (size + SHA-256) in js/offline-dict-catalog.js; licences in dict/NOTICE:
  dict/fr-uk.json (CC BY-SA 4.0)
    lemmas   "lemma TAB pos TAB gender TAB freq [TAB meanings TAB sources [TAB confusions]]"; meanings ';'-separated, an
             aspect pair as 'imperfective|perfective', sources one letter per meaning (w = Wiktionary, x = written),
             confusions: Ukrainian words the pivot through English is known to put for this word
    index    forms → lemma numbers (hex), sorted, front-coded in blocks of INDEX_BLOCK; heads = first key of each block
    expr     set expressions "french TAB ukrainian TAB w|x"
  dict/uk-forms.json (VESUM, CC BY-NC-SA 4.0)
    uk       Ukrainian lemmas "lemma TAB kind TAB paradigm TAB cut" (kind N:m|f|n|p, V:perf|imperf, A, …); a form is
             lemma[:len-cut] + the paradigm's ending for a slot
    paradigms "slot=ending …" (nouns: case n g d a i l v + number s p; adjectives: gender m f n p + case; verbs: inf, r1s… present,
             f1s… perfective future, pm pf pn pp past, i2s… imperative)
    alias    a form written in a meaning → its lemma («гарна» → гарний)
    guess    verb endings → slot, for words of a translation that are not in `uk` (only endings VESUM reads one way)
"""
import argparse, bz2, pickle, collections, gzip, hashlib, html, io, json, math, re, sys, unicodedata, urllib.request, zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
OUT = root / 'dict' / 'fr-uk.json'
OUT_UK = root / 'dict' / 'uk-forms.json'
CATALOG = root / 'js' / 'offline-dict-catalog.js'
SRC = root / 'dict' / 'src'
FORMAT = 1
INDEX_BLOCK = 32

SOURCES = {
    'lexique': [
        {'url': 'http://www.lexique.org/databases/Lexique383/Lexique383.tsv', 'md5': 'a742a88cb00759c1ebed34995aed9904'},
        {'url': 'https://files.pythonhosted.org/packages/dc/03/77f94be96bac73e7e95a1751fa7b26fc288c313e9d9ce559e252e49ee227/pylexique-1.5.1-py3-none-any.whl',
         'sha256': '41ae25154858101b376106d2bf24c21ff33df98623fe69e7d09256e7d4d8eebc', 'member': 'pylexique/Lexique383/Lexique383.txt'},
    ],
    'wiktionary_fr_en': [
        {'url': 'https://raw.githubusercontent.com/Vuizur/Wiktionary-Dictionaries/be0cfb8d614470bc8b9d9006ddff8b921cd5c2e3/French-English%20Wiktionary%20dictionary.tsv',
         'sha256': 'b1e0eb3ae60ac9145c01bf5195a9fd1a3021a9d03770ac4e82d754ef93215a7f'},
    ],
    'conceptnet': [
        {'url': 'https://s3.amazonaws.com/conceptnet/downloads/2019/edges/conceptnet-assertions-5.7.0.csv.gz',
         'sha256': 'accd65fe94038584295574ddc26e1500c1919c8c4532bf771811cafd0948af7e'},
    ],
    'vesum': [
        {'url': 'https://github.com/brown-uk/dict_uk/releases/download/v6.8.6/dict_corp_vis.txt.bz2',
         'sha256': 'e33803783ac138e6f3af2cf0e9428ba146c0ecfda7f5c41fe83ae00c7af24be9'},
    ],
}

# Parts of speech of the dictionary (index = number used nowhere else: the JSON keeps the names).
POS = ('N', 'V', 'A', 'ADV', 'PRE', 'CON', 'PRO', 'DET', 'NUM', 'INTJ')
LEXIQUE_POS = {'NOM': 'N', 'VER': 'V', 'AUX': 'V', 'ADJ': 'A', 'ADV': 'ADV', 'PRE': 'PRE', 'CON': 'CON', 'ONO': 'INTJ',
               'ADJ:num': 'NUM', 'ADJ:pos': 'DET', 'ADJ:dem': 'DET', 'ADJ:ind': 'DET', 'ADJ:int': 'DET',
               'ART:def': 'DET', 'ART:ind': 'DET', 'LIA': 'PRO'}
WIKT_POS = {'noun': 'N', 'verb': 'V', 'adj': 'A', 'adv': 'ADV', 'prep': 'PRE', 'conj': 'CON', 'pron': 'PRO', 'det': 'DET',
            'article': 'DET', 'num': 'NUM', 'intj': 'INTJ', 'particle': 'ADV', 'contraction': 'PRE'}
SUBJECT = {'je', "j'", 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'me', "m'", 'te', "t'", 'se', "s'"}

# Ukrainian form slots kept from VESUM. Nouns: case + number; adjectives: gender (m f n, p = plural) + case; verbs: see below.
CASES = {'v_naz': 'n', 'v_rod': 'g', 'v_dav': 'd', 'v_zna': 'a', 'v_oru': 'i', 'v_mis': 'l', 'v_kly': 'v'}
UK_POS = {'noun': 'N', 'adj': 'A', 'verb': 'V', 'adv': 'ADV', 'prep': 'PRE', 'conj': 'CON', 'part': 'ADV', 'intj': 'INTJ',
          'numr': 'NUM', 'noninfl': 'ADV', 'onomat': 'INTJ', 'adjp': 'A', 'advp': 'ADV'}
UK_BAD = re.compile(r':(bad|subst|arch|obsc|vulg|prop)\b')   # non-standard («суржик»), archaic, obscene, proper names: never a meaning
UK_VARIANT = re.compile(r':(short|long|alt|rare|coll|slang|abbr)\b')   # a spelling or style variant: not the form the app generates


def log(*a):
    print(*a, file=sys.stderr)


# ========== DOWNLOADS ==========
def fetch(name, cache):
    """The first reachable source of `name`, verified (SHA-256 or the publisher's MD5) and kept in `cache`."""
    errors = []
    for src in SOURCES[name]:
        path = cache / (name + '-' + src.get('sha256', src.get('md5'))[:16] + Path(src['url'].split('?')[0]).suffix)
        if not path.exists():
            try:
                log('downloading', src['url'])
                req = urllib.request.Request(src['url'], headers={'user-agent': 'ai-ebook-reader-dict'})
                with urllib.request.urlopen(req, timeout=120) as r, open(str(path) + '.part', 'wb') as f:
                    while True:
                        chunk = r.read(1 << 20)
                        if not chunk:
                            break
                        f.write(chunk)
                Path(str(path) + '.part').rename(path)
            except Exception as e:   # unreachable host, refused by a network policy: try the next copy
                errors.append(f'{src["url"]}: {e}')
                continue
        algo, want = ('sha256', src['sha256']) if 'sha256' in src else ('md5', src['md5'])
        h = hashlib.new(algo)
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(1 << 20), b''):
                h.update(chunk)
        if h.hexdigest() != want:
            path.unlink()
            errors.append(f'{src["url"]}: {algo} mismatch')
            continue
        if 'member' in src:
            with zipfile.ZipFile(path) as z:
                return z.read(src['member'])
        return path
    raise SystemExit(f'no copy of {name} could be downloaded:\n  ' + '\n  '.join(errors))


def text_of(data):
    raw = data if isinstance(data, bytes) else Path(data).read_bytes()
    try:
        return raw.decode('utf-8')
    except UnicodeDecodeError:
        return raw.decode('latin-1')   # the copy inside the pylexique wheel is Latin-1


# ========== FRENCH ==========
def norm(word):
    """Lookup key of a French word: lower case, NFC, œ/æ written out, typographic apostrophe → '."""
    w = unicodedata.normalize('NFC', word.strip().lower()).replace('’', "'")
    return w.replace('œ', 'oe').replace('æ', 'ae')


def load_lexique(data):
    """{(lemma, pos): {'g': gender, 'f': freq, 'forms': set}} from Lexique 3.83."""
    lex = {}
    lines = text_of(data).splitlines()
    head = lines[0].split('\t')
    col = {name.split('_', 1)[-1]: i for i, name in enumerate(head)}
    for line in lines[1:]:
        r = line.split('\t')
        pos = LEXIQUE_POS.get(r[col['cgram']], 'PRO' if r[col['cgram']].startswith('PRO') else None)
        if not pos or not r[col['lemme']]:
            continue
        key = (r[col['lemme']], pos)
        e = lex.setdefault(key, {'g': '', 'f': 0.0, 'forms': set()})
        e['forms'].add(r[col['ortho']])
        e['f'] = max(e['f'], float(r[col['freqlemfilms2']].replace(',', '.') or 0), float(r[col['freqlemlivres']].replace(',', '.') or 0))
        if pos == 'N' and r[col['genre']] in ('m', 'f') and r[col['ortho']] == r[col['lemme']] and r[col['genre']] not in e['g']:
            e['g'] = ''.join(sorted(e['g'] + r[col['genre']], reverse=True))   # 'm', 'f' or 'mf'
    return lex


GLOSS_LABEL = re.compile(r'^\(([^)]*)\)\s*')


def load_wiktionary_fr_en(path):
    """French headwords of the English Wiktionary: [(headword, pos, forms, [english senses])], one item per part of speech.
    The TSV lists a headword's inflected forms once for all its parts of speech: a long list (a conjugation) goes to the verb."""
    out = []
    for line in text_of(path).splitlines():
        if '\t' not in line:
            continue
        heads, body = line.split('\t', 1)
        names = heads.split('|')
        head = names[0]
        forms = set()
        for f in names[1:]:
            if ' of ' in f or '+' in f:
                continue
            parts = f.split()
            if len(parts) == 2 and parts[0] in SUBJECT:
                f = parts[1]
            elif len(parts) > 1:
                continue
            f = re.sub(r"-(moi|toi|nous|vous|le|la|les|lui|leur|en|y)$", '', f)
            if re.fullmatch(r"[\w'’-]+", f):
                forms.add(f)
        sections = re.findall(r'<i>([^<]*)</i>(.*?)(?=<i>[^<]*</i><br><ol>|$)', body)
        poses = [WIKT_POS.get(p) for p, _ in sections]
        conjugation = 'V' in poses and len(forms) > 10
        for (p, sec), pos in zip(sections, poses):
            senses = [html.unescape(re.sub(r'<[^>]+>', '', x)).strip() for x in re.findall(r'<li>(.*?)</li>', sec)]
            out.append((head, pos, forms if not conjugation or pos == 'V' else set(), senses))
    return out


# ========== WIKTIONARY TRANSLATIONS ==========
def load_conceptnet_fr_uk(path):
    """French → Ukrainian translations from the Wiktionary-derived edges of ConceptNet 5.7: {french: [(uk, pos, sense)]}."""
    out = collections.defaultdict(list)
    with gzip.open(path, 'rt', encoding='utf-8') as f:
        for line in f:
            if '/c/uk/' not in line or '/c/fr/' not in line or not line.startswith('/a/[/r/Synonym/'):
                continue
            p = line.split('\t')
            if '/d/wiktionary/' not in p[4]:
                continue
            a, b = p[2].split('/'), p[3].split('/')
            if a[2] == 'uk':
                a, b = b, a
            if a[2] != 'fr' or b[2] != 'uk':
                continue
            pos = {'n': 'N', 'v': 'V', 'a': 'A', 's': 'A', 'r': 'ADV'}.get(a[4] if len(a) > 4 else '', '')
            sense = a[-1] if len(a) > 6 else ''
            out[a[3].replace('_', ' ')].append((b[3].replace('_', ' '), pos, sense))
    return out


def load_kaikki(path):
    """Optional: French entries of a wiktextract JSONL (e.g. kaikki.org's French Wiktionary extract) with Ukrainian translations."""
    out = collections.defaultdict(list)
    opener = gzip.open if str(path).endswith('.gz') else open
    with opener(path, 'rt', encoding='utf-8') as f:
        for line in f:
            e = json.loads(line)
            if e.get('lang_code') != 'fr':
                continue
            pos = WIKT_POS.get(e.get('pos', ''), '')
            for t in e.get('translations', []):
                if t.get('lang_code') == 'uk' and t.get('word'):
                    out[e['word']].append((t['word'], pos, t.get('sense', '')))
    return out


# ========== UKRAINIAN (VESUM) ==========
def uk_slot(pos, tags):
    """The slot of a VESUM form, or None for a form the app never generates (variants, rare tags)."""
    t = tags.split(':')
    if pos == 'N':
        case = next((CASES[x] for x in t if x in CASES), None)
        num = 'p' if 'p' in t else 's' if any(x in t for x in ('m', 'f', 'n')) else None
        return case + num if case and num else None
    if pos == 'A':
        case = next((CASES[x] for x in t if x in CASES), None)
        gen = next((x for x in ('m', 'f', 'n', 'p') if x in t), None)
        if not case or not gen or 'ranim' in t:
            return None
        return gen + case
    if pos == 'V':
        if 'inf' in t:
            return 'inf'
        person = next((x for x in ('1', '2', '3') if x in t), '')
        num = 's' if 's' in t else 'p' if 'p' in t else ''
        if 'pres' in t:
            return 'r' + person + num
        if 'futr' in t:
            return 'f' + person + num
        if 'past' in t:
            return 'p' + next((x for x in ('m', 'f', 'n', 'p') if x in t), '')
        if 'impr' in t:
            return 'i' + person + num
        return None
    return 'x'   # an uninflected word: one form


def uk_kind(pos, tags):
    """The part of speech the app needs: a noun with its gender (N:m, N:f, N:n, N:p = plural only), a verb with its aspect."""
    t = tags.split(':')
    if pos == 'N':
        return 'N:' + next((x for x in ('m', 'f', 'n', 'p') if x in t), 'm')
    if pos == 'V':
        return 'V:' + ('perf' if 'perf' in t else 'imperf')
    return pos


def load_vesum(path):
    """{lemma: [(pos, {slot: form}, good)]} for every VESUM lemma (several entries for homographs), and the set of good forms."""
    lemmas, good_forms = collections.defaultdict(list), set()
    cur = None
    with bz2.open(path, 'rt', encoding='utf-8') as f:
        for line in f:
            line = line.split('#', 1)[0].rstrip()
            if not line:
                continue
            indented = line.startswith(' ')
            word, tags = line.strip().split(' ', 1)
            pos = UK_POS.get(tags.split(':', 1)[0])
            if not indented:
                ok = pos is not None and not UK_BAD.search(tags)
                cur = (pos, {}, ok, tags) if pos else None
                if cur:
                    lemmas[word].append(cur)
            if not cur or UK_BAD.search(tags):
                continue
            if cur[2]:
                good_forms.add(word)
            slot = None if UK_VARIANT.search(tags) else uk_slot(cur[0], tags)
            if slot and slot not in cur[1]:
                cur[1][slot] = word
    return lemmas, good_forms


def uk_paradigm(lemma, forms):
    """(cut, 'slot=ending …'): the forms as endings after lemma[:len-cut], cut chosen as the longest common stem."""
    words = [lemma] + list(forms.values())
    stem = min(len(w) for w in words)
    while stem and any(w[:stem] != lemma[:stem] for w in words):
        stem -= 1
    return len(lemma) - stem, ' '.join(f'{s}={w[stem:]}' for s, w in sorted(forms.items()))


def verb_guesser(vesum):
    """Verb endings (2–4 letters, with -ся) → slot, kept only when VESUM never gives that ending another slot (≥ 50 verbs)."""
    seen = collections.defaultdict(collections.Counter)
    for entries in vesum.values():
        for pos, forms, ok, _ in entries:
            if pos != 'V' or not ok:
                continue
            for slot, form in forms.items():
                if slot == 'inf':
                    continue
                for n in (2, 3, 4):
                    if len(form) > n + 1:
                        seen[form[-n:]][slot] += 1
    out = {}
    for end in sorted(seen, key=len):
        c = seen[end]
        slot, n = c.most_common(1)[0]
        if n >= 50 and n == sum(c.values()) and not any(end.endswith(e) and out[e] == slot for e in out):
            out[end] = slot
    return out


# ========== WRITTEN DATA (dict/src) ==========
def read_tsv(name):
    rows = []
    for path in sorted(SRC.glob(name)):
        for n, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
            if line.strip() and not line.startswith('#'):
                rows.append((path.name, n, line.split('\t')))
    return rows


def split_meanings(text):
    return [m.strip() for m in text.split(';') if m.strip()]


def uk_words(meaning):
    """The words of a Ukrainian meaning, without punctuation («час — гроші», «кажуть, що»)."""
    words = re.split(r"[\s|/,()!?.«»—:]+", meaning.replace('ʼ', "'").replace('’', "'"))
    return [w.strip("'") for w in words if re.search(r'\w', w)]


# ========== BUILD ==========
def front_code(keys):
    """Blocks of INDEX_BLOCK keys: the first one whole, the others as 'shared prefix length (base36 char)' + rest."""
    blocks = []
    for i in range(0, len(keys), INDEX_BLOCK):
        chunk, out, prev = keys[i:i + INDEX_BLOCK], [], ''
        for k in chunk:
            shared = 0
            if out:
                while shared < min(len(prev), len(k), 35) and prev[shared] == k[shared]:
                    shared += 1
                out.append('0123456789abcdefghijklmnopqrstuvwxyz'[shared] + k[shared:])
            else:
                out.append(k)
            prev = k
        blocks.append('\n'.join(out))
    return blocks


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--cache', default=str(Path.home() / '.cache' / 'ai-reader-dict'))
    ap.add_argument('--kaikki', action='append', default=[])
    ap.add_argument('--todo', type=int, nargs='?', const=500, help='print the N most frequent lemmas without meaning and stop')
    ap.add_argument('--todo-from', type=int, default=0)
    args = ap.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)

    # The parsed sources are kept next to the downloads (keyed by this file's parsers): a rebuild after editing dict/src takes seconds.
    parsed = cache / ('parsed-' + hashlib.sha256(Path(__file__).read_bytes().split(b'# ========== BUILD')[0]).hexdigest()[:16] + '.pickle')
    if parsed.exists():
        lexique, wikt, vesum, uk_good, trans = pickle.loads(parsed.read_bytes())
    else:
        log('reading Lexique 3.83 …')
        lexique = load_lexique(fetch('lexique', cache))
        log('reading Wiktionary (French headwords) …')
        wikt = load_wiktionary_fr_en(fetch('wiktionary_fr_en', cache))
        log('reading VESUM …')
        vesum, uk_good = load_vesum(fetch('vesum', cache))
        log('reading Wiktionary translations (ConceptNet) …')
        trans = load_conceptnet_fr_uk(fetch('conceptnet', cache))
        parsed.write_bytes(pickle.dumps((lexique, wikt, vesum, uk_good, trans), protocol=pickle.HIGHEST_PROTOCOL))
    for k in args.kaikki:
        for w, items in load_kaikki(k).items():
            trans[w].extend(items)

    # --- the French lexicon: Lexique, then Wiktionary's forms and the single-word headwords Lexique lacks ---
    oe = {}   # 'oeil' → 'œil': Lexique writes œ out, Wiktionary does not
    for head, pos, forms, senses in wikt:
        for w in [head, *forms]:
            if 'œ' in w or 'æ' in w:
                oe[norm(w)] = w
    fix = lambda w: oe.get(w, w)
    lex, english = {}, collections.defaultdict(list)
    for (lemma, pos), e in lexique.items():
        lex[(fix(lemma), pos)] = {'g': e['g'], 'f': e['f'], 'forms': {fix(f) for f in e['forms']}, 'src': 'lexique'}
    for head, pos, forms, senses in wikt:
        if not pos or ' ' in head or not re.fullmatch(r"[\w'’-]+", head) or head[:1].isupper() or head[:1].isdigit():
            continue
        key = (head, pos)
        if key not in lex:
            if pos not in ('N', 'V', 'A', 'ADV'):
                continue
            lex[key] = {'g': '', 'f': 0.0, 'forms': {head}, 'src': 'wiktionary'}
        lex[key]['forms'] |= forms
        english[key].extend(senses)

    # --- Ukrainian meanings: Wiktionary translations checked against VESUM, then the written ones ---
    def uk_ok(meaning):
        return all(w.lower() in uk_good or w in uk_good for w in uk_words(meaning))

    meanings = collections.defaultdict(list)   # key → [[uk, src]]
    rejected = collections.Counter()
    pos_of = collections.defaultdict(list)
    for key in lex:
        pos_of[key[0]].append(key)
    for fr_word, items in trans.items():
        keys = pos_of.get(fr_word) or pos_of.get(fix(fr_word))
        if not keys:
            continue
        for uk, pos, sense in items:
            uk = uk.strip().lower()
            if not uk_ok(uk):
                rejected['wiktionary: not in VESUM'] += 1
                continue
            key = next((k for k in keys if k[1] == pos), None) or (keys[0] if len(keys) == 1 or not pos else None)
            if key and uk not in (m[0] for m in meanings[key]):
                meanings[key].append([uk, 'w'])
    wikt_found = {k: [m[0] for m in v] for k, v in meanings.items()}
    written_errors = []
    for fname, n, cols in read_tsv('written-*.tsv'):
        if len(cols) < 3:
            written_errors.append(f'{fname}:{n}: expected lemma TAB pos TAB meanings')
            continue
        key = (cols[0], cols[1])
        if key not in lex:
            written_errors.append(f'{fname}:{n}: {cols[0]} {cols[1]} is not a lemma of the dictionary')
            continue
        items = split_meanings(cols[2])
        bad = [m for m in items if not uk_ok(m)]
        if bad:
            written_errors.append(f'{fname}:{n}: not in VESUM (or marked non-standard there): {"; ".join(bad)}')
            continue
        # The written list is the dictionary's order (the main meaning first); a meaning Wiktionary also gives keeps its source.
        known = set(wikt_found.get(key, []))
        meanings[key] = [[m, 'w' if any(a.strip() in known for a in m.split('|')) else 'x'] for m in items[:4]]
    if written_errors:
        raise SystemExit('dict/src/written-*.tsv:\n  ' + '\n  '.join(written_errors[:60]))

    if args.todo is not None:
        written = {(cols[0], cols[1]) for _, _, cols in read_tsv('written-*.tsv')}
        # Not yet written: lemmas without a meaning, and frequent ones whose only meanings come from Wiktionary (to complete them).
        todo = sorted((k for k in lex if k not in written and lex[k]['src'] == 'lexique' and k[1] != 'INTJ'
                       and (k not in meanings or lex[k]['f'] >= 20)), key=lambda k: -lex[k]['f'])
        for k in todo[args.todo_from:args.todo_from + args.todo]:
            eng = ' | '.join(s for s in english.get(k, [])[:4])[:160]
            print(f'{k[0]}\t{k[1]}\t{lex[k]["g"]}\t{lex[k]["f"]:.2f}\t{eng}\t{"; ".join(wikt_found.get(k, []))}')
        return

    # --- set expressions ---
    expressions, expr_errors, seen_expr = [], [], set()
    for fname, n, cols in read_tsv('expressions*.tsv'):
        if len(cols) < 3 or cols[2] not in ('wiktionary', 'written'):
            expr_errors.append(f'{fname}:{n}: expected french TAB ukrainian TAB wiktionary|written')
            continue
        if not uk_ok(cols[1]):
            expr_errors.append(f'{fname}:{n}: not in VESUM: {cols[1]}')
            continue
        if cols[0] in seen_expr:
            continue   # the first entry for an expression is its translation
        seen_expr.add(cols[0])
        expressions.append([cols[0], cols[1], 'w' if cols[2] == 'wiktionary' else 'x'])
    if expr_errors:
        raise SystemExit('dict/src/expressions*.tsv:\n  ' + '\n  '.join(expr_errors[:60]))

    # --- confusions: what the pivot through English makes of a word. A French word whose English sense is also the English of
    #     another French word with other meanings («file» = line, «ligne» = line → «лінія»): those meanings are the engine's
    #     likely mistakes for it. Only first English senses, only one-word glosses. ---
    def heads(senses):
        out = []
        for s in senses[:3]:
            s = GLOSS_LABEL.sub('', s)
            for part in re.split(r'[,;]', s):
                part = re.sub(r'^(to|a|an|the)\s+', '', part.strip().lower())
                if re.fullmatch(r"[a-z'-]+", part):
                    out.append(part)
        return out
    by_english = collections.defaultdict(set)
    for key, senses in english.items():
        if key in meanings:
            for g in heads(senses):
                by_english[g].add(key)
    confusions = {}
    for key in meanings:
        own = {m[0] for m in meanings[key]}
        bad = []
        for g in heads(english.get(key, [])):
            for other in by_english[g]:
                if other == key or other[1] != key[1]:   # the pivot keeps the part of speech: «file» (noun) is not «filer»
                    continue
                for m in meanings[other][:2]:
                    if m[0] not in own and m[0] not in bad and ' ' not in m[0]:
                        bad.append(m[0])
        if bad:
            confusions[key] = bad[:12]

    # --- Ukrainian forms of every word the app may substitute ---
    needed = set()
    for key, ms in meanings.items():
        for m, _ in ms:
            needed.update(w.lower() for w in uk_words(m))
    for c in confusions.values():
        needed.update(c)
    for _, uk, _ in expressions:
        needed.update(w.lower() for w in uk_words(uk))
    # A meaning written in a form other than the lemma («гарна погода»): the form → its lemma, so the app finds the paradigm.
    alias = {}
    for lemma, entries in vesum.items():
        for pos, forms, ok, _ in entries:
            if ok:
                for form in forms.values():
                    if form in needed and form != lemma and not vesum.get(form) and form not in alias:
                        alias[form] = lemma
    paradigms, uk_lines = {}, []
    for word in sorted(needed | set(alias.values())):
        for pos, forms, ok, tags in vesum.get(word, []):
            if not ok or not forms:
                continue
            cut, para = uk_paradigm(word, forms)
            pid = paradigms.setdefault(para, len(paradigms))
            uk_lines.append(f'{word}\t{uk_kind(pos, tags)}\t{pid}\t{cut}')

    # --- output ---
    keys = sorted(lex, key=lambda k: (norm(k[0]), POS.index(k[1])))
    number = {k: i for i, k in enumerate(keys)}
    lemma_lines = []
    for k in keys:
        e = lex[k]
        cols = [k[0], k[1], e['g'], ('%.2f' % e['f']).rstrip('0').rstrip('.')]
        if k in meanings:
            cols += [';'.join(m for m, _ in meanings[k]), ''.join(s for _, s in meanings[k])]
            if k in confusions:
                cols.append(';'.join(confusions[k]))
        lemma_lines.append('\t'.join(cols))
    forms = collections.defaultdict(set)
    for k in keys:
        for f in lex[k]['forms'] | {k[0]}:
            forms[norm(f)].add(number[k])
    index_keys = sorted(forms)
    index = [f + '\t' + ','.join(format(i, 'x') for i in sorted(forms[f])) for f in index_keys]
    blocks = front_code(index)
    fr_data = {'format': FORMAT, 'pos': POS, 'lemmas': lemma_lines, 'block': INDEX_BLOCK, 'index': blocks,
               'heads': [b.split('\t', 1)[0] for b in blocks], 'expr': ['\t'.join(e) for e in expressions]}
    uk_data = {'format': FORMAT, 'uk': uk_lines, 'paradigms': list(paradigms), 'alias': dict(sorted(alias.items())), 'guess': verb_guesser(vesum)}
    files = []
    for path, data in ((OUT, fr_data), (OUT_UK, uk_data)):
        data['version'] = hashlib.sha256(json.dumps(data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:12]
        body = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        path.parent.mkdir(exist_ok=True)
        path.write_bytes(body)
        files.append((path, data['version'], body))
    CATALOG.write_text(
        '// GENERATED by tools/build_dict_fr_uk.py. Do not edit.\n'
        '// The offline dictionaries installed with an offline-translation pack (js/offline-dict.js): every file\'s size and SHA-256\n'
        '// are checked on download. "data": the dictionary (CC BY-SA 4.0); "forms": the Ukrainian word forms (VESUM, CC BY-NC-SA 4.0).\n'
        'const OFFLINE_DICTS = {\n'
        '    "fr>uk": { files: [\n' + ''.join(
            f'        {{ type: "{t}", path: "{p.relative_to(root).as_posix()}", version: "{v}", size: {len(b)}, sha256: "{hashlib.sha256(b).hexdigest()}" }},\n'
            for t, (p, v, b) in zip(('data', 'forms'), files)) +
        '    ] },\n};\n', encoding='utf-8')

    # --- statistics ---
    with_m = [k for k in keys if k in meanings]
    src = collections.Counter(s for k in with_m for _, s in meanings[k])
    lemma_src = collections.Counter('wiktionary' if all(s == 'w' for _, s in meanings[k]) else 'written' if all(s == 'x' for _, s in meanings[k]) else 'mixed' for k in with_m)
    print(f'lemmas            {len(keys)} (Lexique {sum(1 for k in keys if lex[k]["src"] == "lexique")}, Wiktionary only {sum(1 for k in keys if lex[k]["src"] == "wiktionary")})')
    print(f'forms             {len(index_keys)}')
    print(f'with meanings     {len(with_m)} lemmas, {sum(src.values())} meanings: wiktionary {src["w"]}, written {src["x"]}')
    print(f'lemma sources     {dict(lemma_src)}')
    print(f'expressions       {len(expressions)} (wiktionary {sum(1 for e in expressions if e[2] == "w")}, written {sum(1 for e in expressions if e[2] == "x")})')
    print(f'confusion lists   {len(confusions)}')
    print(f'ukrainian lemmas  {len(uk_lines)} ({len(paradigms)} paradigms), verb endings {len(uk_data["guess"])}')
    print(f'rejected          {dict(rejected)}')
    for path, version, body in files:
        print(f'size              {path.name}: {len(body)} bytes ({len(gzip.compress(body))} gzip)')
    freq_with = sum(lex[k]['f'] for k in with_m) / max(1, sum(lex[k]['f'] for k in keys))
    print(f'text coverage     {freq_with:.1%} of word occurrences (Lexique frequencies) have a meaning')


if __name__ == '__main__':
    main()
