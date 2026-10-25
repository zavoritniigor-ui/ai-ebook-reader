#!/usr/bin/env python3
"""Checks tools/book_tts/columns.py on made-up lines (no PDF): a two-column table is read cell by cell, a wrapped cell
goes on in the same sentence, a cell of several sentences is split, and a page with no table gives None."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools' / 'book_tts'))
from columns import items_from_lines  # noqa: E402

H = 12.0   # line height, pt
ROWS = [('changer', 'to change'), ('devenir', 'to become'), ('être', 'to be'), ('évoluer', 'to evolve'), ('exister', 'to exist')]


def table_lines():
    lines = []
    for i, (fr, en) in enumerate(ROWS):
        y = 43 + 13 * i
        lines.append((y, H, [(138.3, fr)]))
        lines.append((y, H, [(330.3, en)]))
    return lines


def cells(items):
    return [(item[2], item[1]) for item in items if item[0] == 'cell']


def check(name, ok):
    print(('PASS ' if ok else 'FAIL ') + name)
    return ok


results = []

items = items_from_lines(table_lines())
results.append(check('table rows: each French cell, then its English one, as one sentence each',
                     cells(items) == [(c, t) for fr, en in ROWS for c, t in ((0, fr), (1, en))]))

lines = table_lines() + [(200, H, [(138.3, 'Le monde existe depuis longtemps.')]),
                         (200, H, [(330.3, 'The world has existed for a long')]),
                         (212, H, [(342.3, 'time.')])]
items = items_from_lines(lines)
results.append(check('a wrapped line (indented) goes on in the same cell',
                     (1, 'The world has existed for a long time.') in cells(items)))

lines = table_lines() + [(270, H, [(138.3, 'la pâte')]),
                         (300, H, [(151.0, 'Il a un nouvel ordinateur.')]),
                         (313, H, [(151.0, 'Il habite à Strasbourg.')])]
items = items_from_lines(lines)
results.append(check('two sentences in one unit are two cells, both in the French column',
                     [c for c in cells(items) if c[0] == 0][-2:] == [(0, 'Il a un nouvel ordinateur.'),
                                                                      (0, 'Il habite à Strasbourg.')]))

paragraph = [(43 + 13 * i, H, [(90.3, f'Running text line {i}.')]) for i in range(8)]
results.append(check('a page with no two-column table gives None (read as before)', items_from_lines(paragraph) is None))

if not all(results):
    sys.exit(1)
print(f'PASS all {len(results)} column checks')
