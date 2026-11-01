#!/usr/bin/env python3
"""Build library-catalog.json (the reader's built-in free-library index) from Project Gutenberg's official catalog.

    curl -L -o pg_catalog.csv https://gutenberg.pglaf.org/cache/epub/feeds/pg_catalog.csv
    python3 tools/build_library_catalog.py pg_catalog.csv library-catalog.json
    python3 tools/build_library_catalog.py --enrich pg_catalog.csv library-catalog.json   # only add author years, same books

Output: {"v":2,"themes":[keys],"books":[[id,"title","author","lang",themeBitmask,born,died], ...]} — born/died are the first
author's years from the catalog (negative = BCE, 0 = unknown); the reader's «years» filter matches books whose author lived then. Themes come from the catalog's own
"Bookshelves" field. French and the small languages are kept whole (capped); English is capped by a classics-first score.
"""
import csv, json, re, sys

THEMES = [  # key, bookshelf names (exact) that switch it on
    ('fiction', {'Category: Novels'}),
    ('adventure', {'Category: Adventure'}),
    ('detective', {'Category: Crime, Thrillers and Mystery'}),
    ('historical', {'Category: Historical Novels', 'Historical Fiction'}),
    ('love', {'Category: Romance'}),
    ('scifi', {'Category: Science-Fiction & Fantasy', 'Science Fiction'}),
    ('stories', {'Category: Short Stories'}),
    ('poetry', {'Category: Poetry'}),
    ('drama', {'Category: Plays/Films/Dramas', 'FR Théâtre'}),
    ('children', {'Category: Children & Young Adult Reading', "Children's Fiction", "Children's Literature", "Children's Book Series"}),
    ('humor', {'Category: Humour'}),
    ('biography', {'Category: Biographies', 'FR Biographie, Mémoires, Journal intime, Correspondance', 'Category: Journals'}),
    ('history', None),   # any "Category: History - ..." or FR Histoire
    ('philosophy', {'Category: Philosophy & Ethics'}),
    ('myth', {'Category: Mythology, Legends & Folklore'}),
    ('travel', {'Category: Travel Writing'}),
]
CAPS = {'fr': 100000, 'en': 1500, 'de': 400, 'es': 300, 'it': 300}
BOOST = {'Category: Classics of Literature': 5, 'Nobel Prizes in Literature': 4, 'Bestsellers, American, 1895-1923': 2, 'Category: French Literature': 2}


def themes_of(shelves):
    mask = 0
    for i, (key, names) in enumerate(THEMES):
        if key == 'history':
            if any(s.startswith('Category: History -') or s == 'FR Histoire' for s in shelves): mask |= 1 << i
        elif shelves & names: mask |= 1 << i
    return mask


def clean_author(raw):
    first = re.sub(r'\s*\[[^\]]*\]', '', raw.split(';')[0]).strip()
    parts = [p.strip() for p in first.split(',')]
    name = parts[0]
    if len(parts) > 1 and parts[1] and not re.search(r'\d', parts[1]): name = f'{parts[1]} {parts[0]}'
    return name[:60]


def author_years(raw):
    """«Hugo, Victor, 1802-1885» -> (1802, 1885); «Homer, 751? BCE-651? BCE» -> (-751, -651); unknown parts -> 0."""
    first = raw.split(';')[0]
    m = re.search(r'(\d{1,4})\??\s*(BCE)?\s*-\s*(?:(\d{1,4})\??\s*(BCE)?)?', first) or re.search(r'-\s*(\d{1,4})\??\s*(BCE)?', first)
    if not m: return 0, 0
    g = m.groups()
    if len(g) == 2: return 0, -int(g[0]) if g[1] else int(g[0])
    born = -int(g[0]) if g[1] else int(g[0])
    died = (-int(g[2]) if g[3] else int(g[2])) if g[2] else 0
    return born, died


def enrich(src, dst):
    years = {}
    for row in csv.DictReader(open(src, encoding='utf-8')):
        try: years[int(row['Text#'])] = author_years(row['Authors'])
        except ValueError: pass
    data = json.load(open(dst, encoding='utf-8'))
    data['v'] = 2
    data['books'] = [b[:5] + list(years.get(b[0], (0, 0))) for b in data['books']]
    with open(dst, 'w', encoding='utf-8') as f: json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    known = sum(1 for b in data['books'] if b[5] or b[6])
    print(len(data['books']), 'books,', known, 'with author years')


def main(src, dst):
    best = {}
    for row in csv.DictReader(open(src, encoding='utf-8')):
        lang = row['Language'].strip()
        if row['Type'] != 'Text' or lang not in CAPS: continue
        shelves = {s.strip() for s in row['Bookshelves'].split(';') if s.strip()}
        mask = themes_of(shelves)
        if lang != 'fr' and not mask: continue
        score = sum(v for k, v in BOOST.items() if k in shelves)
        title = re.sub(r'\s+', ' ', row['Title']).strip()[:120]
        entry = (int(row['Text#']), title, clean_author(row['Authors']), lang, mask, score, *author_years(row['Authors']))
        key = (lang, title.lower(), entry[2].lower())
        if key not in best or entry[0] < best[key][0]: best[key] = entry   # one edition per work: the oldest id
    books, by_lang = [], {}
    for e in best.values(): by_lang.setdefault(e[3], []).append(e)
    for lang, items in by_lang.items():
        items.sort(key=lambda e: (-e[5], e[0]))
        books += items[:CAPS[lang]]
    books.sort(key=lambda e: (e[3], -e[5], e[0]))
    out = {'v': 2, 'themes': [k for k, _ in THEMES], 'books': [[e[0], e[1], e[2], e[3], e[4], e[6], e[7]] for e in books]}
    with open(dst, 'w', encoding='utf-8') as f: json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(len(books), 'books', {l: min(len(v), CAPS[l]) for l, v in by_lang.items()})


if __name__ == '__main__':
    if sys.argv[1] == '--enrich': enrich(sys.argv[2], sys.argv[3])
    else: main(sys.argv[1], sys.argv[2])
