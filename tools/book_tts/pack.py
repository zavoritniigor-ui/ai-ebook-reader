#!/usr/bin/env python3
"""One file per voice for the reader: the narration MP3 with its JSON inside an ID3v2.4 tag (a GEOB frame).

The file stays a normal MP3 (players skip the tag). The reader (js/book-speech.js bsUnpack) reads the JSON from the tag
and keeps the bytes after it as the audio, so the byte ranges of the JSON stay as they are. The JSON also gets the
book it belongs to ("pdf": { name, pages }), so a narration picked for another book is refused.

Usage:
  python3 pack.py JSON --pdf "livre 34.pdf" --out "Par ici 3-4 - Kokoro ff_siwis.mp3"
"""
import argparse
import json
import os
import subprocess

DESCRIPTION = 'ai-ebook-reader-narration'


def syncsafe(n):
    if n >= 1 << 28:
        raise ValueError('too large for an ID3 tag')
    return bytes([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f])


def pdf_pages(path):
    out = subprocess.run(['pdfinfo', path], capture_output=True, text=True, check=True).stdout
    return int(next(line.split()[-1] for line in out.splitlines() if line.startswith('Pages:')))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('json')
    parser.add_argument('--pdf', required=True, help='the book the narration was made from')
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    path = os.path.expanduser(args.json)
    with open(path, encoding='utf-8') as f:
        meta = json.load(f)
    pdf = os.path.expanduser(args.pdf)
    meta['pdf'] = {'name': os.path.basename(pdf), 'pages': pdf_pages(pdf)}
    data = json.dumps(meta, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    body = b'\x03' + b'application/json\x00' + b'narration.json\x00' + DESCRIPTION.encode() + b'\x00' + data
    frame = b'GEOB' + syncsafe(len(body)) + b'\x00\x00' + body
    tag = b'ID3\x04\x00\x00' + syncsafe(len(frame)) + frame
    out = os.path.expanduser(args.out)
    with open(out, 'wb') as dst, open(os.path.join(os.path.dirname(path), meta['audio']), 'rb') as src:
        dst.write(tag)
        while True:
            chunk = src.read(1 << 22)
            if not chunk:
                break
            dst.write(chunk)
    print(f'{out}: {os.path.getsize(out) / 1e6:.1f} MB ({len(meta["sentences"])} sentences, '
          f'{len(meta.get("lexicon") or {})} words, {meta["pdf"]["name"]}, {meta["pdf"]["pages"]} pages)')


if __name__ == '__main__':
    main()
