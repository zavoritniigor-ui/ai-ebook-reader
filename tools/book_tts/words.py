#!/usr/bin/env python3
"""Every word of a narration spoken on its own, as if there were no other text (the voice of a tap on a word).

A word cut out of a sentence carries its neighbours: the liaison, the enchaînement, the melody of the sentence. The reader
plays the word said alone instead: for a tap, and word after word for a selected part of a sentence; the sentence narration
only for a whole sentence. It never cuts a piece out of a sentence, so every word needs its entry here.

For each distinct word of the JSON (its key: lower case, no punctuation) the most frequent printed form is synthesized
with the same voice and rate (engines.py: edge-tts or Kokoro), cached, and appended to the narration MP3 after the sentences. The JSON gets
"lexicon": { key: { text, bytes: [a, b), start, end (ms of the decoded clip: its sound without the silence) } } and
"lexiconStart" (the MP3 size before the words; a new run cuts the file there first). One-letter words are in too: «à», «a»,
«ô» said alone are the word itself; «y» alone is read as the letter's name «i grec» (670 ms), so it is said as «i» (SAY).

Usage:
  python3 words.py "~/Books/Textbook/tts/a1-full/fr-CA-SylvieNeural_p1-162.json"     # after align.py

Needs: edge-tts or kokoro, numpy; ffmpeg.
"""
import argparse
import asyncio
import collections
import hashlib
import json
import os
import re
import subprocess
import sys

import numpy as np

from engines import synthesize as engine_synthesize

WORD = re.compile(r"[^\W_](?:[^\W_]|['’\-](?=[^\W_]))*")
RATE = 24000
HOP = 0.005
LEAD = 0.020   # kept before the first sound
TAIL = 0.060   # kept after the last sound (the decay of a final consonant)


# words whose printed form, said alone, is read as something else
SAY = {'y': 'i', 'Y': 'I'}


def key_of(form):
    return re.sub(r'[\W_]+', '', form.lower())


def forms_of(meta):
    """key -> the printed form to say: the most frequent, in lower case unless the word is always written with a capital."""
    seen = collections.defaultdict(collections.Counter)
    for s in meta['sentences']:
        for w in s['words']:
            form = s['text'][w['s']:w['e']].replace('’', "'")
            key = key_of(form)
            if key:
                seen[key][form] += 1
    out = {}
    for key, counts in seen.items():
        lower = [f for f in counts if f == f.lower()]
        if lower:
            out[key] = max(lower, key=counts.get)
        else:
            form = max(counts, key=counts.get)
            out[key] = form if not form.isupper() else form.capitalize()   # «BONJOUR» in a heading is the word bonjour
    return {key: SAY.get(form, form) for key, form in out.items()}


async def synthesize(text, voice, rate):
    return (await engine_synthesize(text, voice, rate))[0]


async def fill_cache(forms, voice, rate, cache_dir, concurrency):
    semaphore = asyncio.Semaphore(concurrency)
    failed = []

    async def one(form):
        path = clip_path(cache_dir, voice, rate, form)
        if os.path.exists(path):
            return
        async with semaphore:
            for attempt in range(4):
                try:
                    data = await synthesize(form, voice, rate)
                    with open(path + '.part', 'wb') as f:
                        f.write(data)
                    os.replace(path + '.part', path)
                    return
                except Exception as error:  # the service drops connections now and then
                    if attempt == 3:
                        failed.append((form, repr(error)))
                        return
                    await asyncio.sleep(2 ** attempt)

    done = 0
    for coro in asyncio.as_completed([one(f) for f in forms]):
        await coro
        done += 1
        if done % 250 == 0:
            print(f'  synthesized {done}/{len(forms)}', file=sys.stderr)
    return failed


def sound_span(blob):
    """(start, end) in ms of the sound in a clip, as the reader decodes it (ffmpeg = Chrome's decoder)."""
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', str(RATE), 'pipe:1'],
                         input=blob, capture_output=True, check=True).stdout
    x = np.frombuffer(pcm, dtype=np.float32)
    hop, win = int(RATE * HOP), int(RATE * 0.010)
    env = np.sqrt((np.lib.stride_tricks.sliding_window_view(np.pad(x, (0, win)), win)[::hop] ** 2).mean(axis=1))
    loud = np.nonzero(env > max(env.max() * 0.02, 1e-4))[0]
    duration = len(x) / RATE
    if not len(loud):
        return 0, round(duration * 1000)
    start = max(0.0, loud[0] * HOP - LEAD)
    end = min(duration, (loud[-1] + 2) * HOP + TAIL)
    return round(start * 1000), round(end * 1000)


def voices_of(meta):
    """key -> (voice, rate) that says the word: the book's voice, or for a mixed narration (generate.py --mix) the voice
    of the parts the word is printed in most often («table» in the English explanations is said in English)."""
    seen = collections.defaultdict(collections.Counter)
    for s in meta['sentences']:
        vr = (s.get('voice', meta['voice']), s.get('rate', meta['rate']))
        for w in s['words']:
            key = key_of(s['text'][w['s']:w['e']].replace('’', "'"))
            if key:
                seen[key][vr] += 1
    return {key: counts.most_common(1)[0][0] for key, counts in seen.items()}


def clip_path(cache_dir, voice, rate, form):
    return os.path.join(cache_dir, hashlib.sha1(f'{voice}|{rate}|{form}'.encode()).hexdigest() + '.mp3')


def build(path, concurrency):
    with open(path, encoding='utf-8') as f:
        meta = json.load(f)
    out_dir = os.path.dirname(path)
    mp3_path = os.path.join(out_dir, meta['audio'])
    cache_dir = os.path.join(out_dir, 'cache-words')
    os.makedirs(cache_dir, exist_ok=True)
    forms = forms_of(meta)
    print(f'{path}: {len(forms)} words', file=sys.stderr)
    voices = voices_of(meta)
    failed = []
    for vr in sorted(set(voices.values())):
        wanted = sorted({form for key, form in forms.items() if voices[key] == vr})
        failed += asyncio.run(fill_cache(wanted, vr[0], vr[1], cache_dir, concurrency))
    for form, error in failed:
        print(f'skipped (the reader reads it with the system voice): {form!r}: {error}', file=sys.stderr)
    if len(failed) > len(forms) // 100:   # more than a word here and there: the service is down, run again later
        sys.exit(1)
    skipped = {form for form, _ in failed}
    forms = {key: form for key, form in forms.items() if form not in skipped}
    # the words go after the sentences: a sentence repaired after an earlier run (repair.py) sits after the old words
    start = max(meta.get('lexiconStart') or os.path.getsize(mp3_path), max(s['bytes'][1] for s in meta['sentences']))
    lexicon = {}
    with open(mp3_path, 'r+b') as out:
        out.truncate(start)
        out.seek(start)
        offset = start
        for key in sorted(forms):
            form = forms[key]
            with open(clip_path(cache_dir, *voices[key], form), 'rb') as f:
                data = f.read()
            a, b = sound_span(data)
            out.write(data)
            lexicon[key] = {'text': form, 'bytes': [offset, offset + len(data)], 'start': a, 'end': b}
            offset += len(data)
    meta['lexiconStart'] = start
    meta['lexicon'] = lexicon
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(f'{mp3_path}: {len(lexicon)} words appended, {(offset - start) / 1e6:.1f} MB', file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('json', nargs='+')
    parser.add_argument('--concurrency', type=int, default=6)
    args = parser.parse_args()
    for name in args.json:
        build(os.path.expanduser(name), args.concurrency)


if __name__ == '__main__':
    main()
