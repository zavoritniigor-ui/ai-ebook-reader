#!/usr/bin/env python3
"""Re-synthesizes the sentences whose audio came back cut short, and appends the new audio to the narration MP3.

Now and then edge-tts returns 0.4 s for a whole sentence, and Kokoro stops after ~25 s of a long run without
punctuation (fixed in engines.py for new runs). A sentence is suspect when it has more than 15 letters and more than
25 letters per second of audio. The new audio goes to the end of the MP3 (the reader reads each sentence by its byte
range, so the order does not matter); the sentence is marked "realign" for `align.py --marked`.

Usage (with the engine's Python):
  python3 repair.py JSON          then   python3 align.py --marked JSON
"""
import argparse
import asyncio
import json
import os
import re
import subprocess
import sys

from engines import synthesize

MAX_RATE = 25   # letters per second


def letters(text):
    return len(re.findall(r'[^\W_]', text))


def suspect(text, duration):
    n = letters(text)
    return n > 15 and n / max(duration, 0.01) > MAX_RATE


def duration_of(blob):
    """Seconds of audio as the reader decodes it (ffprobe gives no duration for a header-less MP3 on a pipe)."""
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', '24000', 'pipe:1'],
                         input=blob, capture_output=True, check=True).stdout
    return len(pcm) / 2 / 24000


async def fresh(text, voice, rate):
    for attempt in range(6):
        try:
            data, _ = await synthesize(text, voice, rate)
            duration = duration_of(data)
            if not suspect(text, duration):
                return data, duration
        except Exception as error:  # a dropped connection: try again
            print(f'  retry {attempt + 1}: {error!r}', file=sys.stderr)
        await asyncio.sleep(2 ** attempt)
    return None, 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('json')
    args = parser.parse_args()
    path = os.path.expanduser(args.json)
    with open(path, encoding='utf-8') as f:
        meta = json.load(f)
    bad = [s for s in meta['sentences'] if suspect(s['text'], s['duration'])]
    print(f'{len(bad)} sentences cut short', file=sys.stderr)
    fixed = 0
    with open(os.path.join(os.path.dirname(path), meta['audio']), 'ab') as out:
        offset = out.tell()
        for s in bad:
            data, duration = asyncio.run(fresh(s['text'], meta['voice'], meta['rate']))
            if data is None:
                print(f'  still short, kept: {s["text"][:60]!r}', file=sys.stderr)
                continue
            out.write(data)
            s['bytes'] = [offset, offset + len(data)]
            s['duration'] = round(duration, 3)
            s['realign'] = True
            offset += len(data)
            fixed += 1
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(f'{fixed} re-synthesized; next: align.py --marked {path!r}', file=sys.stderr)


if __name__ == '__main__':
    main()
