#!/usr/bin/env python3
"""Checks tools/book_tts/columns.py on made-up lines (no PDF): a two-column table is read cell by cell, a wrapped cell goes
on in the same sentence, a cell of several sentences is split, a heading is a unit of its own, and a paragraph goes on
across blocks only while a sentence is open. A book in one voice (a French textbook) has no tables: its boxes are running text in
pdftotext's reading order, and a word printed in touching pieces is one word."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools' / 'book_tts'))
from columns import _touches, items_from_lines  # noqa: E402

H = 12.0   # line height, pt
ROWS = [('changer', 'to change'), ('devenir', 'to become'), ('être', 'to be'), ('évoluer', 'to evolve'), ('exister', 'to exist')]


def table_lines():
    """Five rows of two columns, each line in a block of its own (as pdftotext gives short cells)."""
    lines = []
    for i, (fr, en) in enumerate(ROWS):
        y = 43 + 13 * i
        lines.append((y, H, [(138.3, fr)], (100 + i, 1, True)))
        lines.append((y, H, [(330.3, en)], (200 + i, 1, True)))
    return lines


def cells(items):
    return [(item[2], item[1]) for item in items if item[0] == 'cell']


def flows(items):
    return [item[1] for item in items if item[0] == 'flow']


def check(name, ok):
    print(('PASS ' if ok else 'FAIL ') + name)
    return ok


results = []

items = items_from_lines(table_lines())
results.append(check('table rows: each French cell, then its English one, as one sentence each',
                     cells(items) == [(c, t) for fr, en in ROWS for c, t in ((0, fr), (1, en))]))

lines = table_lines() + [
    (200, H, [(138.3, 'Le monde existe depuis longtemps.')], (300, 1, True)),
    (200, H, [(330.3, 'The world has existed for a long')], (301, 2, False)),
    (212, H, [(342.3, 'time.')], (301, 2, True)),
]
items = items_from_lines(lines)
results.append(check('a wrapped line (indented, same block) goes on in the same cell',
                     (1, 'The world has existed for a long time.') in cells(items)))

lines = table_lines() + [
    (270, H, [(138.3, 'la pâte')], (310, 1, True)),
    (300, H, [(151.0, 'Il a un nouvel ordinateur.')], (311, 2, True)),
    (313, H, [(151.0, 'Il habite à Strasbourg.')], (311, 2, True)),
    (330, H, [(138.3, 'le thé')], (312, 1, True)),       # a row lower down keeps the table's rows around them
    (330, H, [(330.3, 'the tea')], (313, 1, True)),
]
items = items_from_lines(lines)
pair = [(0, 'Il a un nouvel ordinateur.'), (0, 'Il habite à Strasbourg.')]
results.append(check('two sentences in one block are two cells, both in the French column, one after the other',
                     any(cells(items)[n:n + 2] == pair for n in range(len(cells(items))))))

example = [
    (110, 15, [(138.3, 'Je ne m’étais pas rendu compte que')], (400, 4, True)),
    (110.2, 15, [(330.3, 'I had not realized I was sick.')], (401, 1, True)),
    (123, 15, [(151.3, 'j’étais malade.')], (400, 4, True)),
    (135, 15, [(138.3, 'Elle avait faim parce qu’elle n’avait')], (400, 4, True)),
    (147.5, 15, [(151.3, 'pas eu le temps de déjeuner.')], (400, 4, True)),
    (135.2, 15, [(330.3, 'She was hungry because she had not had')], (402, 2, True)),
    (147.7, 15, [(342.3, 'time for lunch.')], (402, 2, True)),
]
items = items_from_lines(example)
results.append(check('a two-row example beside running text is a table: the French and English sentences are whole',
                     cells(items) == [(0, 'Je ne m’étais pas rendu compte que j’étais malade.'),
                                      (1, 'I had not realized I was sick.'),
                                      (0, 'Elle avait faim parce qu’elle n’avait pas eu le temps de déjeuner.'),
                                      (1, 'She was hungry because she had not had time for lunch.')]))

heading_and_paragraph = [
    (39, 20, [(66.0, 'Use of the plus-que-parfait')], (1, 1, False)),
    (61, 16.5, [(90.3, 'As we mentioned earlier, this is one sentence.')], (2, 2, True)),
    (75, 16.5, [(90.3, 'It goes on to a second one.')], (2, 2, True)),
]
results.append(check('a heading (one line, no full stop) is a unit of its own, not glued to the sentence below',
                     flows(items_from_lines(heading_and_paragraph)) == [
                         'Use of the plus-que-parfait',
                         'As we mentioned earlier, this is one sentence. It goes on to a second one.']))

across = [
    (61, 16.5, [(90.3, 'The sentence starts here and')], (3, 2, False)),
    (75, 16.5, [(90.3, 'goes on in the next block.')], (4, 1, True)),
]
results.append(check('a sentence still open at the end of a block goes on into the next block',
                     flows(items_from_lines(across)) == ['The sentence starts here and goes on in the next block.']))

paragraph = [(43 + 13 * i, H, [(90.3, f'Running text line {i}.')], (5, 8, True)) for i in range(8)]
results.append(check('a page with no two-column table is all running text (read as before)',
                     all(item[0] == 'flow' for item in items_from_lines(paragraph))))

box = [   # a box of short lines, each a block of its own (textbook 3-4 p. 25)
    (451, H, [(434.0, 'À Montréal, le métro de la ville')], (30, 1, False)),
    (463, H, [(434.0, 'ferme tard le samedi soir.')], (31, 1, True)),
]
results.append(check('a box line that ends on a word goes on into the next block when that one starts in lower case',
                     flows(items_from_lines(box)) == ['À Montréal, le métro de la ville ferme tard le samedi soir.']))

opened = [
    (61, H, [(90.3, 'Most nouns ending in -age are masculine:')], (6, 1, False)),
    (75, H, [(90.3, 'le fromage')], (7, 1, True)),
    (89, H, [(90.3, '26')], (8, 1, False)),
    (103, H, [(90.3, 'grammaire du quotidien')], (9, 1, False)),
]
results.append(check('a colon opening a list and a page number do not go on into the next block',
                     flows(items_from_lines(opened)) == ['Most nouns ending in -age are masculine:', 'le fromage', '26',
                                                        'grammaire du quotidien']))

results.append(check('a book in one voice (tables=False) reads a two-column layout as running text',
                     all(item[0] == 'flow' for item in items_from_lines(table_lines(), tables=False))))

side = [   # pdftotext reads the left column, then the right one; the right one starts higher on the page
    (300, H, [(60.0, 'Left column, first line')], (1, 2, False)),
    (313, H, [(60.0, 'goes on here.')], (1, 2, True)),
    (290, H, [(330.0, 'Right column sentence.')], (2, 1, True)),
]
results.append(check('with no table, side-by-side columns keep pdftotext\'s order (not mixed line by line)',
                     flows(items_from_lines(side, tables=False)) == ['Left column, first line goes on here.',
                                                                   'Right column sentence.']))

results.append(check('a word printed in two touching pieces is one word; a space or punctuation between words is not',
                     _touches((349.7, 398.3, 'déterminan', 689.7), (398.3, 405.0, 'ts', 693.5))
                     and not _touches((332.8, 346.5, 'Les', 688.4), (349.7, 398.3, 'déterminan', 689.7))
                     and not _touches((10.0, 20.0, 'l’', 5.0), (20.0, 40.0, 'école', 5.0))))

if not all(results):
    sys.exit(1)
print(f'PASS all {len(results)} column checks')
