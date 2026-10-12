#!/usr/bin/env python3
"""Build library-catalog.json (the reader's built-in free-library index) from Project Gutenberg's official catalog.

    curl -L -o pg_catalog.csv https://gutenberg.pglaf.org/cache/epub/feeds/pg_catalog.csv
    python3 tools/build_library_catalog.py pg_catalog.csv library-catalog.json

Output: {"v":1,"themes":[keys],"books":[[id,"title","author","lang",themeBitmask], ...]}. Themes come from the catalog's own
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
        entry = (int(row['Text#']), title, clean_author(row['Authors']), lang, mask, score)
        key = (lang, title.lower(), entry[2].lower())
        if key not in best or entry[0] < best[key][0]: best[key] = entry   # one edition per work: the oldest id
    books, by_lang = [], {}
    for e in best.values(): by_lang.setdefault(e[3], []).append(e)
    for lang, items in by_lang.items():
        items.sort(key=lambda e: (-e[5], e[0]))
        books += items[:CAPS[lang]]
    books.sort(key=lambda e: (e[3], -e[5], e[0]))
    out = {'v': 1, 'themes': [k for k, _ in THEMES], 'books': [[e[0], e[1], e[2], e[3], e[4]] for e in books]}
    with open(dst, 'w', encoding='utf-8') as f: json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(len(books), 'books', {l: min(len(v), CAPS[l]) for l, v in by_lang.items()})


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
