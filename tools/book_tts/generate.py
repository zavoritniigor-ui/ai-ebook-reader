#!/usr/bin/env python3
"""Offline narration of a book's pages: edge-tts or Kokoro (engines.py).

One chapter = a page range of a PDF. Each sentence is synthesized on its own
(cached, so an interrupted run resumes), then the sentence streams are joined
into one MP3. The JSON next to it stores, for every sentence, its byte range in
the MP3, its duration and, for every word, the character span in the sentence
and the time span in milliseconds. The reader decodes only the bytes it needs.

Usage:
  python3 generate.py --pdf livre.pdf --pages 20-21 --voice fr-CA-SylvieNeural \
      --out ~/Books/Par\\ Ici/tts/a1-ch1
  ~/tools/kokoro-venv/bin/python generate.py --pdf livre.pdf --pages 1-203 --voice kokoro:ff_siwis --out ...
  python3 generate.py --pdf book.pdf --pages 1-657 --mix 'fr=fr-FR-DeniseNeural@-10%,en=en-GB-SoniaNeural@+0%' --out ...
      # a bilingual book in one file: each sentence read by the voice of its language

Needs: edge-tts (pip) or kokoro, pdftotext and ffprobe (poppler / ffmpeg).

Then run align.py on the JSON: the edge-tts word times are estimates (up to a quarter
of a second off); align.py measures them on the audio, and the reader plays a tapped
word exactly only with aligned times.
"""
import argparse
import asyncio
import hashlib
import json
import os
import re
import subprocess
import sys

from engines import synthesize as engine_synthesize

SENTENCE_END = re.compile(r'(?<=[.!?…])\s+')
# «CD1 - piste 10» marks point at the book's own audio; they are not text to read.
PISTE_MARK = re.compile(r'CD\s*\d\s*[-–—]?\s*piste\s*\d+|piste\s*\d+', re.IGNORECASE)


def parse_pages(spec):
    first, _, last = spec.partition('-')
    return list(range(int(first), int(last or first) + 1))


def page_text(pdf, page):
    out = subprocess.run(['pdftotext', '-f', str(page), '-l', str(page), '-raw', pdf, '-'],
                         check=True, capture_output=True, text=True).stdout
    return ' '.join(out.split())


def sentences_of(pdf, pages):
    result = []
    for page in pages:
        text = PISTE_MARK.sub(' ', page_text(pdf, page))
        # the printed folio at the foot of the page, e.g. «20 vingt» (the number written out)
        text = re.sub(rf'\s{page}\s+\S+$', ' ', text.strip())
        for part in SENTENCE_END.split(text.strip()):
            # exercise bullets («*», «•», a checkbox «o») are not spoken; they would take the first word's timing
            part = re.sub(r'^(?:[*•●]|o(?=\s))\s*', '', part.strip())
            if re.search(r'\w', part):
                result.append({'page': page, 'text': part})
    return result


# The language of a sentence of a bilingual book (Complete French: English explanations, French examples), so that each voice
# reads only its own language: function words of each language, accents count for French. '' when unclear (both voices
# read it: a heading, a number, a single name). The reader picks the narration by the sentence's language and falls back to
# the other one, so a sentence judged differently there is still played.
FR_WORDS = set('le la les un une des du de et est je tu il elle nous vous ils elles ce cette ces que qui ne pas au aux en dans '
               'pour avec sur mon ma mes ton ta tes son sa ses leur leurs très mais ou où y à être avoir ai sont suis es êtes '
               'sommes fait bonjour merci oui non c j l d qu n s m t chez se lui moi toi aussi comme'.split())
EN_WORDS = set('the an and is are was were i you he she it we they this that these those of to in for with at by from not do '
               'does did have has had be been will would can could should my your his her its our their which what who how '
               'when where or but if so there here yes please thank example exercise answer note word words verb verbs'.split())


def sentence_lang(text):
    words = re.findall(r"[^\W\d_]+", text.lower())
    fr = sum(w in FR_WORDS for w in words) + 0.5 * len(re.findall(r'[éèêàçùûôîœ]', text.lower()))
    en = sum(w in EN_WORDS for w in words)
    if fr >= 2 and en >= 2 and min(fr, en) > max(fr, en) / 3:
        return ''   # both languages (a French line printed beside its English translation): both voices read it
    if fr >= 1 and fr > en * 1.2:
        return 'fr'
    if en >= 1 and en > fr * 1.2:
        return 'en'
    return ''


def cache_key(voice, rate, text):
    return hashlib.sha1(f'{voice}|{rate}|{text}'.encode('utf-8')).hexdigest()


async def synthesize(text, voice, rate):
    return await engine_synthesize(text, voice, rate, boundaries=True)


def align_words(text, words):
    """Map edge-tts tokens (which can hold several words, numbers, dates) back to character spans of text."""
    spans, cursor, misses = [], 0, 0
    for w in words:
        token = w['token']
        at = text.find(token, cursor)
        if at < 0:
            # the service normalized the token (a number, an abbreviation): keep its timing, point at the cursor
            misses += 1
            at = cursor
            end = min(len(text), at + len(token))
        else:
            end = at + len(token)
        spans.append({'s': at, 'e': end, 'start': round(w['start']), 'end': round(w['end'])})
        cursor = end
    return spans, misses


def duration_of(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'default=nw=1:nk=1', path],
                         check=True, capture_output=True, text=True).stdout
    return float(out.strip())


def parse_mix(spec):
    """«fr=fr-FR-DeniseNeural@-10%,en=en-GB-SoniaNeural@+0%» -> {'fr': (voice, rate), 'en': (voice, rate)}, in that order:
    the first language also reads the sentences whose language is unclear."""
    mix = {}
    for part in spec.split(','):
        lang, _, rest = part.strip().partition('=')
        voice, _, rate = rest.partition('@')
        if lang not in ('fr', 'en') or not voice:
            raise SystemExit(f'--mix: bad part {part!r}')
        mix[lang] = (voice, rate or '+0%')
    return mix


def assign_voices(sentences, voice, rate, mix):
    """Each sentence gets the voice that reads it: one voice, or with --mix the voice of the sentence's language."""
    first = next(iter(mix.values())) if mix else None
    for x in sentences:
        x['voice'], x['rate'] = (mix.get(sentence_lang(x['text'])) or first) if mix else (voice, rate)


async def fill_cache(sentences, cache_dir, concurrency):
    semaphore = asyncio.Semaphore(concurrency)
    failed = []

    async def one(sentence):
        voice, rate = sentence['voice'], sentence['rate']
        key = cache_key(voice, rate, sentence['text'])
        path = os.path.join(cache_dir, key + '.json')
        if os.path.exists(path):
            return
        async with semaphore:
            for attempt in range(4):
                try:
                    audio, words = await synthesize(sentence['text'], voice, rate)
                    with open(os.path.join(cache_dir, key + '.mp3'), 'wb') as f:
                        f.write(audio)
                    with open(path, 'w', encoding='utf-8') as f:
                        json.dump({'words': words}, f, ensure_ascii=False)
                    return
                except Exception as error:  # the service drops connections now and then
                    if attempt == 3:
                        failed.append((sentence['text'], repr(error)))
                        return
                    await asyncio.sleep(2 ** attempt)

    done = 0
    for coro in asyncio.as_completed([one(s) for s in sentences]):
        await coro
        done += 1
        if done % 20 == 0:
            print(f'  synthesized {done}/{len(sentences)}', file=sys.stderr)
    return failed


def assemble(sentences, cache_dir, out_dir, name, mixed=False):
    mp3_path = os.path.join(out_dir, name + '.mp3')
    offset = 0
    entries = []
    total_misses = 0
    with open(mp3_path, 'wb') as out:
        for sentence in sentences:
            key = cache_key(sentence['voice'], sentence['rate'], sentence['text'])
            with open(os.path.join(cache_dir, key + '.mp3'), 'rb') as f:
                data = f.read()
            with open(os.path.join(cache_dir, key + '.json'), encoding='utf-8') as f:
                words = json.load(f)['words']
            spans, misses = align_words(sentence['text'], words)
            total_misses += misses
            out.write(data)
            entries.append({
                'page': sentence['page'],
                'text': sentence['text'],
                'bytes': [offset, offset + len(data)],
                'duration': round(duration_of(os.path.join(cache_dir, key + '.mp3')), 3),
                'words': spans,
                **({'voice': sentence['voice'], 'rate': sentence['rate']} if mixed else {}),
            })
            offset += len(data)
    print(f'word tokens not found in the text: {total_misses}', file=sys.stderr)
    return mp3_path, entries


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--pdf', required=True)
    parser.add_argument('--pages', required=True, help='e.g. 20-21')
    parser.add_argument('--voice', help='one voice for the whole book')
    parser.add_argument('--mix', help='a bilingual book in ONE file, each sentence read by the voice of its language: '
                                      '«fr=fr-FR-DeniseNeural@-10%%,en=en-GB-SoniaNeural@+0%%» (the first reads unclear ones)')
    parser.add_argument('--rate', default='-10%')
    parser.add_argument('--out', required=True)
    parser.add_argument('--concurrency', type=int, default=6)
    parser.add_argument('--lang', choices=['fr', 'en'], help='a bilingual book: only the sentences in this language (and unclear ones)')
    args = parser.parse_args()
    if bool(args.voice) == bool(args.mix):
        parser.error('give --voice or --mix')
    mix = parse_mix(args.mix) if args.mix else {}

    pdf = os.path.expanduser(args.pdf)
    out_dir = os.path.expanduser(args.out)
    cache_dir = os.path.join(out_dir, 'cache')
    os.makedirs(cache_dir, exist_ok=True)

    pages = parse_pages(args.pages)
    sentences = sentences_of(pdf, pages)
    print(f'{len(sentences)} sentences on pages {args.pages}', file=sys.stderr)
    if args.lang:
        sentences = [x for x in sentences if sentence_lang(x['text']) in (args.lang, '')]
        print(f'{len(sentences)} of them in {args.lang} (or unclear)', file=sys.stderr)

    assign_voices(sentences, args.voice, args.rate, mix)
    if mix:
        for lang, (voice, _) in mix.items():
            print(f'{sum(x["voice"] == voice for x in sentences)} sentences read by {voice} ({lang})', file=sys.stderr)
    failed = asyncio.run(fill_cache(sentences, cache_dir, args.concurrency))
    if failed:
        for text, error in failed:
            print(f'FAILED: {text[:60]!r}: {error}', file=sys.stderr)
        sys.exit(1)

    voice = 'mix:' + '+'.join(v for v, _ in mix.values()) if mix else args.voice
    rate = 'mix' if mix else args.rate
    name = f"{voice.replace(':', '-')}_p{args.pages}"
    mp3_path, entries = assemble(sentences, cache_dir, out_dir, name, mixed=bool(mix))
    meta = {'voice': voice, 'rate': rate, 'pages': pages,
            'audio': os.path.basename(mp3_path), 'sentences': entries}
    with open(os.path.join(out_dir, name + '.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    total = sum(e['duration'] for e in entries)
    print(f'{mp3_path}: {len(entries)} sentences, {total / 60:.1f} min', file=sys.stderr)
    print(f'next: python3 align.py {os.path.join(out_dir, name + ".json")!r}', file=sys.stderr)


if __name__ == '__main__':
    main()
