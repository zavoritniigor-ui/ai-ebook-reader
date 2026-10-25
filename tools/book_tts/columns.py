#!/usr/bin/env python3
"""The text of a PDF page for the narration, cut into the book's own sentences (generate.py).

A sentence of the book is one unit for the narration, from its first word to its full stop, so that a selection of exactly
that sentence matches one recording. Two things keep the units right:
- a heading is a block of its own (pdftotext puts it in a block of its own): it is not glued to the sentence below it. A
  paragraph's block goes on into the next block only when a sentence is still open at its end;
- side-by-side columns (Complete French: a French sentence on the left, its English on the right, row by row) are read cell
  by cell, in their column's language, even when a cell is two words with no full stop («devenir» / «to become»). A line that
  wraps goes on in the same cell (it is indented under the column's start).

The items are [('flow', text) | ('cell', text, column)] in reading order; a flow text is split into sentences by its
punctuation (generate.py). A cell is one sentence, read in the language of its column.
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
GAP = 14.0           # pt between two words that means a new column on the same line (a word space is about 3 pt)
COLUMN_WIDTH = 230.0 # pt: the widest a column's text runs (a footer far to the right is not in any column)
SENTENCE_END = re.compile(r'(?<=[.!?…»])\s+')
TERMINAL = re.compile(r'[.!?…][»”"’)\]]*$')
BLOCK = re.compile(r'<block [^>]*>(.*?)</block>', re.S)
LINE = re.compile(r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', re.S)
WORD = re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', re.S)


def page_lines(pdf, page):
    """The page's text lines in reading order: [(y, height, [(x, text), ...], block)].

    block = (number, lines in the block, whether the block ends with a full stop): the blocks are pdftotext's own."""
    with tempfile.TemporaryDirectory() as tmp:
        out = f'{tmp}/page.html'
        subprocess.run(['pdftotext', '-f', str(page), '-l', str(page), '-bbox-layout', pdf, out], check=True,
                       capture_output=True)
        with open(out, encoding='utf-8') as f:
            raw = f.read()
    lines = []
    for number, block in enumerate(BLOCK.finditer(raw)):
        block_lines = []
        for m in LINE.finditer(block.group(1)):
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
            block_lines.append((float(m.group(2)), float(m.group(4)) - float(m.group(2)),
                                [(s[0], ' '.join(s[2])) for s in segments]))
        if not block_lines:
            continue
        last = ' '.join(text for _, text in block_lines[-1][2]).strip()
        info = (number, len(block_lines), bool(TERMINAL.search(last)))
        lines += [(y, h, segs, info) for y, h, segs in block_lines]
    return lines


def _median(values):
    values = sorted(values)
    return values[len(values) // 2]


def _pair_rows(lines, a, b):
    """The rows where a line at column start a has a partner at column start b on the same row: (score, [xl], [xr], [y])."""
    lefts = [(y, x) for y, _, segs, _ in lines for x, _ in segs if abs(x - a) <= TOL]
    rights = [(y, x) for y, _, segs, _ in lines for x, _ in segs if abs(x - b) <= TOL]
    paired_l = [(y, x) for y, x in lefts if any(abs(y - z) <= ROW for z, _ in rights)]
    paired_r = [(y, x) for y, x in rights if any(abs(y - z) <= ROW for z, _ in lefts)]
    return paired_l, paired_r, len(lefts)


def find_tables(lines):
    """The page's tables, [{'columns': [x starts from the left], 'y0', 'y1'}], the main one first.

    A table is two columns whose rows line up: a line at one column start has a partner on the same row at another. Two
    rows are enough (a short example); the rows must be most of the left column's lines. The main table is the one with the
    most rows; a further table is one that lies in its own rows (a page can hold an example and an exercise)."""
    counts = Counter(round(x / TOL) for _, _, segs, _ in lines for x, _ in segs)
    starts = sorted(b * TOL for b, c in counts.items() if c >= 2)
    cands = []
    for i, a in enumerate(starts):
        for b in starts[i + 1:]:
            if b - a < 100:
                continue
            paired_l, paired_r, _ = _pair_rows(lines, a, b)
            if len(paired_l) < 2:
                continue
            # most of the left lines near these rows must have a partner (the same column on another part of the page does not count)
            ys = [y for y, _ in paired_l]
            near = sum(1 for y, _, segs, _ in lines for x, _ in segs
                       if abs(x - a) <= TOL and min(ys) - 30 <= y <= max(ys) + 30)
            if len(paired_l) >= 0.6 * near:
                cands.append((len(paired_l), a, b, paired_l, paired_r))
    if not cands:
        return []
    cands.sort(key=lambda c: -c[0])
    tables = []
    for score, a, b, paired_l, paired_r in cands:
        rows = [y for y, _ in paired_l]
        y0, y1 = min(rows) - 2, max(rows) + 25
        if tables:
            if any(y0 <= t['y1'] and t['y0'] <= y1 for t in tables):
                continue   # the rows of another table
            # the main table: its further columns (a page of four columns) are the other starts beyond its right one
            cols = [_median([x for _, x in paired_l]), _median([x for _, x in paired_r])]
        else:
            cols = _table_columns(lines, a, b, counts, starts, paired_l, paired_r)
        tables.append({'columns': cols, 'y0': y0, 'y1': y1})
    return tables


def _table_columns(lines, a, b, counts, starts, paired_l, paired_r):
    """The columns of the main table: where its cells start (the rows that share a line), then the further starts beyond."""
    rep_a = _median([x for _, x in paired_l])
    rep_b = _median([x for _, x in paired_r])
    clusters = []
    for s in starts:
        if s < a - TOL:
            continue
        if clusters and s - clusters[-1][-1] < 25:
            clusters[-1].append(s)
        else:
            clusters.append([s])
    columns = []
    for c in clusters:
        if any(abs(s - a) < 25 for s in c):
            columns.append(rep_a)
        elif any(abs(s - b) < 25 for s in c):
            columns.append(rep_b)
        else:
            columns.append(max(c, key=lambda s: counts[round(s / TOL)]))
    return columns


def continues(prev, block):
    """Whether the text of the block before (prev) goes on into this block: only when that block is several lines long and
    still has a sentence open at its end. A heading (one line, no full stop) and a finished paragraph start a new unit."""
    return prev is not None and block is not None and prev[1] >= 2 and not prev[2]


def items_from_lines(lines):
    """The items of a page's lines (see the module docstring). A page with no table is all 'flow'."""
    tables = find_tables(lines)

    def locate(x, y):
        """(table, column) of a piece: the table whose rows it is in, and the column its x falls in; None for running text."""
        for t, table in enumerate(tables):
            if not table['y0'] <= y <= table['y1']:
                continue
            cols = table['columns']
            for k, start in enumerate(cols):
                end = cols[k + 1] - TOL if k + 1 < len(cols) else start + COLUMN_WIDTH
                if start - TOL <= x < end:
                    return (t, k)
        return None

    # each piece of a line: (y, height, x, text, block, (table, column) or None)
    pieces = [(y, h, x, text, block, locate(x, y)) for y, h, segs, block in lines for x, text in segs]

    # a table's cells: a line that starts a new row opens a unit; an indented line that follows closely wraps it
    units = []   # [(table, column), y, last_y, text]
    open_unit = {}
    flows = []   # (y, text, block): the running text, in reading order
    for y, h, x, text, block, where in sorted(pieces, key=lambda p: p[0]):
        if where is None:
            flows.append((y, text, block))
            continue
        t, k = where
        u = open_unit.get(where)
        indent = x - tables[t]['columns'][k]
        if u is not None and WRAP[0] <= indent <= WRAP[1] and y - u[2] <= GAP_MAX * h:
            u[3] += ' ' + text
            u[2] = y
        else:
            u = [where, y, y, text]
            units.append(u)
            open_unit[where] = u

    # a unit may hold several sentences: each one is a cell
    cells = []
    for where, y, _, text in units:
        for n, sentence in enumerate(SENTENCE_END.split(text.strip())):
            if sentence.strip():
                cells.append((y + 0.01 * n, where, sentence.strip()))

    # reading order: a row's right cell after its left one, even when the right line sits a point higher
    left_tops = {}
    for y, (t, k), _ in cells:
        if k == 0:
            left_tops.setdefault(t, []).append(y)

    def cell_key(y, where):
        t, k = where
        if k:
            near = [top for top in left_tops.get(t, []) if abs(top - y) <= ROW_ORDER]
            if near:
                return min(near, key=lambda top: abs(top - y)) + 0.5 * k
        return y

    events = [(cell_key(y, where), 'cell', where, text) for y, where, text in cells]
    events += [(y, 'flow', block, text) for y, text, block in flows]

    items, current = [], None   # current: [text, block] of the running text being built

    def flush():
        nonlocal current
        if current is not None:
            items.append(('flow', current[0]))
            current = None

    for _, kind, a, b in sorted(events, key=lambda e: e[0]):
        if kind == 'flow':
            block = a
            if current is not None and (current[1] is not None and block is not None and current[1][0] == block[0]
                                        or continues(current[1], block)):
                current[0] += ' ' + b
                current[1] = block
            else:
                flush()
                current = [b, block]
        else:
            flush()
            items.append(('cell', b, a[1], a[0]))   # text, column, table
    flush()
    return items


def page_items(pdf, page):
    """The items of a page (see the module docstring): ('flow', text) or ('cell', text, column, table)."""
    return items_from_lines(page_lines(pdf, page))
