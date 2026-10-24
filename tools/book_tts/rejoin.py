#!/usr/bin/env python3
"""Re-synthesizes the sentences that hold a word broken at a line end («contri- buer»), said whole this time.

The PDF text keeps the line-end hyphen and the line break, so generate.py gave the voice «contri- buer» and it said two
broken pieces. Here the voice gets the sentence with the word joined («contribuer»), or with its hyphen when the book
writes that word with one elsewhere («peut-être»). The printed text stays as it is (the reader matches it with the page):
align.py aligns its two halves on the whole word said. The new audio goes to the end of the MP3, like repair.py; the
sentence is marked "realign".

Usage (with the engine's Python):
  python3 rejoin.py JSON          then   python3 align.py --marked JSON
"""
import argparse
import asyncio
import collections
import json
import os
import re
import sys

from repair import fresh

# words that follow a hyphen in French (pensez-vous, dites-le, celle-ci, lui-même): never the second half of a syllable break
AFTER_HYPHEN = {'je', 'moi', 'tu', 'toi', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les', 'lui', 'leur', 'y', 'en',
                'ce', 'ci', 'là', 'même', 'mêmes', 't'}
SUFFIXES = ('ment', 'tion', 'sion', 'ité', 'able', 'ible', 'eur', 'euse', 'ique', 'isme', 'iste', 'ance', 'ence', 'age', 'ant', 'ent', 'ier', 'ière')
BROKEN = re.compile(r"([^\W\d_]+)-\s+([^\W\d_]+)")
WORD = re.compile(r"[^\W_](?:[^\W_]|['’\-](?=[^\W_]))*")


def book_words(meta):
    """How often each word (lower case, hyphens kept) is printed whole in the book."""
    seen = collections.Counter()
    for s in meta['sentences']:
        seen.update(w.lower() for w in WORD.findall(BROKEN.sub(' ', s['text'])))
    return seen


def spoken(text, seen):
    """The sentence as the voice should read it, every line-end break mended: the form the book prints elsewhere (joined or
    with its hyphen); else a compound keeps its hyphen (two words of the book, or a name: «auteur-compositeur», «Louis-
    Hippolyte», «Îles-de-la-Madeleine»), and pieces that are not words are one word cut into syllables («géographi- quement»)."""
    def join(m):
        a, b = m.group(1), m.group(2)
        whole, hyphen = (a + b).lower(), f'{a}-{b}'.lower()
        if seen[hyphen] or seen[whole]:
            return f'{a}-{b}' if seen[hyphen] >= seen[whole] else a + b
        if b[0].isupper() or b.lower() in AFTER_HYPHEN or (seen[a.lower()] and seen[b.lower()]):
            return f'{a}-{b}'
        # a word of the book before the break and no suffix after it: a compound (auteur-compositeur, sous-jacente). A wrong
        # hyphen costs little (the voice says «par-tagent» like «partagent»); a wrong join mispronounces the compound.
        if len(a) >= 3 and seen[a.lower()] >= 2 and not b.lower().startswith(SUFFIXES):
            return f'{a}-{b}'
        if a[0].isupper() and b.lower() in ('de', 'du', 'des', 'la', 'le', 'les', 'sur', 'en', 'aux'):
            return f'{a}-{b}'   # Saint-Élie-de-Caxton
        return a + b
    return BROKEN.sub(join, text)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('json')
    args = parser.parse_args()
    path = os.path.expanduser(args.json)
    with open(path, encoding='utf-8') as f:
        meta = json.load(f)
    seen = book_words(meta)
    todo = [s for s in meta['sentences'] if BROKEN.search(s['text']) and not s.get('spoken')]
    print(f'{len(todo)} sentences with a word broken at a line end', file=sys.stderr)
    fixed = 0
    with open(os.path.join(os.path.dirname(path), meta['audio']), 'ab') as out:
        offset = out.tell()
        for s in todo:
            say = spoken(s['text'], seen)
            data, duration = asyncio.run(fresh(say, meta['voice'], meta['rate']))
            if data is None:
                print(f'  failed, kept: {s["text"][:60]!r}', file=sys.stderr)
                continue
            out.write(data)
            s['bytes'] = [offset, offset + len(data)]
            s['duration'] = round(duration, 3)
            s['spoken'] = say      # what the voice was given (a later run leaves the sentence alone)
            s['realign'] = True
            offset += len(data)
            fixed += 1
    # the words said alone follow the sentences in the MP3; new sentence audio sits after them, which the reader allows
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(f'{fixed} re-synthesized; next: align.py --marked {path!r}', file=sys.stderr)


if __name__ == '__main__':
    main()
