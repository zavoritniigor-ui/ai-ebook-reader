#!/usr/bin/env python3
"""The text of a PDF page for the narration, with side-by-side columns read sentence by sentence (generate.py).

Complete French prints its vocabulary and exercises in columns: a French word, sentence or example on the left, its English
on the right, row by row. Every sentence of a column is one whole sentence for the narration, in its column's language, even
when it is two words with no full stop («devenir» / «to become»): said once, with its own intonation. A line that wraps
goes on in the same sentence (it is indented under the column's start). The text outside the columns is read in reading
order, as before, and split into sentences by its punctuation.

A page with no such columns gives None: generate.py then reads it as it always did.
"""
import html
import re
import subprocess
import tempfile
from collections import Counter

TOL = 6.0            # pt: a column starts at the same x on every row
WRAP = (3.0, 30.0)   # pt a wrapped line is indented past its column's start (Complete French: about 12)
ROW = 4.0            # pt: a column's cell and its neighbour's share a row when their tops are this close (validation)
ROW_ORDER = 8.0      # pt: the same, to read a row's left cell before its right one
GAP_MAX = 1.6        # × line height: a wrapped line follows the one above it at most this far below
SENTENCE_END = re.compile(r'(?<=[.!?…»])\s+')
LINE = re.compile(r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', re.S)
WORD = re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', re.S)
GAP = 14.0           # pt between two words that means a new column on the same line (a word space is about 3 pt)
COLUMN_WIDTH = 230.0 # pt: the widest a column's text runs (a footer far to the right is not in any column)


def page_lines(pdf, page):
    """The page's text lines in reading order: [(y, height, [(x, text), ...])], one (x, text) per column segment."""
    with tempfile.TemporaryDirectory() as tmp:
        out = f'{tmp}/page.html'
        subprocess.run(['pdftotext', '-f', str(page), '-l', str(page), '-bbox-layout', pdf, out], check=True,
                       capture_output=True)
        with open(out, encoding='utf-8') as f:
            raw = f.read()
    lines = []
    for m in LINE.finditer(raw):
        words = [(float(w.group(1)), float(w.group(3)), html.unescape(w.group(5))) for w in WORD.finditer(m.group(5))]
        if not words:
            continue
        segments = []
        for x0, x1, text in words:
            if segments and x0 - segments[-1][1] <= GAP:
                segments[-1][1] = max(segments[-1][1], x1)
                segments[-1][2].append(text)
            else:
                segments.append([x0, x1, [text]])
        lines.append((float(m.group(2)), float(m.group(4)) - float(m.group(2)),
                      [(s[0], ' '.join(s[2])) for s in segments]))
    return lines


def table_columns(lines):
    """The x where each column of the page's table starts (left to right), or None when the page has no table.

    A table is two columns whose rows line up: most of the left column's lines have a right-column line on the same row.
    Starts that lie a few points apart are one column (a wrapped line is indented under its column's start)."""
    counts = Counter(round(x / TOL) for _, _, segs in lines for x, _ in segs)
    starts = sorted(b * TOL for b, c in counts.items() if c >= 4)
    best = None
    for i, a in enumerate(starts):
        for b in starts[i + 1:]:
            if b - a < 100:
                continue
            lefts = [y for y, _, segs in lines for x, _ in segs if abs(x - a) <= TOL]
            rights = [y for y, _, segs in lines for x, _ in segs if abs(x - b) <= TOL]
            pairs = sum(any(abs(y - z) <= ROW for z in rights) for y in lefts)
            if pairs >= 3 and pairs >= 0.6 * len(lefts):
                score = min(len(lefts), len(rights))
                if best is None or score > best[0]:
                    best = (score, a, b)
    if best is None:
        return None
    _, a, _ = best
    # the columns: every start from the table's left one on, a few points apart at most one column (a wrapped line is
    # indented under it); a column starts where most of its lines start
    clusters = []
    for s in starts:
        if s < a - TOL:
            continue
        if clusters and s - clusters[-1][-1] < 25:
            clusters[-1].append(s)
        else:
            clusters.append([s])
    return [max(c, key=lambda s: counts[round(s / TOL)]) for c in clusters]


def page_items(pdf, page):
    """[('flow', text) | ('cell', text, column)] in reading order, or None when the page has no table.

    'column' counts the table's columns from the left (0, 1, ...); the text of a cell is one sentence (generate.py reads it
    in the language of its column)."""
    return items_from_lines(page_lines(pdf, page))


def items_from_lines(lines):
    """page_items for the page's lines as page_lines gives them (a pure function: the tests use it on made-up lines)."""
    columns = table_columns(lines)
    if columns is None:
        return None

    def column_of(x):
        for k, start in enumerate(columns):
            end = columns[k + 1] - TOL if k + 1 < len(columns) else start + COLUMN_WIDTH
            if start - TOL <= x < end:
                return k
        return None

    # each piece of a line: (y, height, x, text, column or None)
    pieces = []
    for y, h, segs in lines:
        for x, text in segs:
            pieces.append((y, h, x, text, column_of(x)))
    in_table = [p for p in pieces if p[4] is not None]
    if not in_table:
        return None
    top = min(p[0] for p in in_table) - 2
    bottom = max(p[0] for p in in_table) + 25

    # the text of each column, in units: a line that starts a new row opens a unit; an indented line that follows
    # closely is a wrap of the unit above it
    units = []   # [column, y, last_y, text]
    open_unit = {}
    flows = []   # (y, text): the running text around the table
    for y, h, x, text, k in sorted(pieces, key=lambda p: p[0]):
        if k is None or not (top <= y <= bottom):
            flows.append((y, text))
            continue
        u = open_unit.get(k)
        indent = x - columns[k]
        if u is not None and WRAP[0] <= indent <= WRAP[1] and y - u[2] <= GAP_MAX * h:
            u[3] += ' ' + text
            u[2] = y
        else:
            u = [k, y, y, text]
            units.append(u)
            open_unit[k] = u

    # a unit may hold several sentences: each one is a cell
    cells = []
    for k, y, _, text in units:
        for n, sentence in enumerate(SENTENCE_END.split(text.strip())):
            if sentence.strip():
                cells.append((y + 0.01 * n, k, sentence.strip()))

    # reading order: the running text and the cells by their tops; a row's left cell before its right one
    left_tops = [y for y, k, _ in cells if k == 0]

    def order(item):
        y, k = item[0], item[1]
        if k not in (None, 0):
            near = [t for t in left_tops if abs(t - y) <= ROW_ORDER]
            if near:
                return min(near, key=lambda t: abs(t - y)) + 0.5 * k
        return y

    events = [(y, k, text) for y, k, text in cells] + [(y, None, text) for y, text in flows]
    items, flow = [], []

    def flush():
        if flow:
            items.append(('flow', ' '.join(flow)))
            flow.clear()

    for y, k, text in sorted(events, key=order):
        if k is None:
            flow.append(text)
        else:
            flush()
            items.append(('cell', text, k))
    flush()
    return items
