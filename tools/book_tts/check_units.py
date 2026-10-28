#!/usr/bin/env python3
"""Checks how a book's text is cut into narration units BEFORE any audio is made (docs/agents/narration_text_rules.md).

A unit must be one whole sentence of the book. This prints, for some pages: the number of units, their median length in
words, and the sentences cut across two units (a unit ending on a letter or a comma, the next starting in lower case on the
same page), with examples. A one-voice book must show (almost) no cut sentences; textbook 1-2, pages 15-60: 3.

Usage:
  python3 check_units.py "~/Books/textbook 3-4/book 34.pdf" --pages 15-60            # a book in one voice
  python3 check_units.py "~/Books/Workbook/....pdf" --pages 30-60 --mix      # a bilingual book (--mix)
"""
import argparse
import os
import re
import statistics

from generate import parse_pages, sentences_of

CUT_END = re.compile(r'[^\W\d_],?$')
CUT_START = re.compile(r'[a-zà-öø-ÿœ]')


def cut_sentences(units):
    """Pairs of neighbouring units on the same page that are one sentence cut in two."""
    return [(a, b) for a, b in zip(units, units[1:])
            if a['page'] == b['page'] and CUT_END.search(a['text']) and CUT_START.match(b['text'])
            and len(a['text'].split()) >= 3]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('pdf')
    parser.add_argument('--pages', required=True)
    parser.add_argument('--mix', action='store_true', help='a bilingual book: two-column tables, as generate.py --mix')
    parser.add_argument('--show', type=int, default=12, help='examples to print')
    args = parser.parse_args()
    units = sentences_of(os.path.expanduser(args.pdf), parse_pages(args.pages), tables=args.mix)
    cut = cut_sentences(units)
    print(f'{len(units)} units, median {statistics.median(len(u["text"].split()) for u in units)} words, '
          f'{len(cut)} sentences cut across two units')
    for a, b in cut[:args.show]:
        print(f'  p{a["page"]}: …{a["text"][-50:]} || {b["text"][:50]}…')


if __name__ == '__main__':
    main()
