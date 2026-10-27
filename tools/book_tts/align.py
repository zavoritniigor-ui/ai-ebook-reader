#!/usr/bin/env python3
"""Exact word timings for a narration made by generate.py (forced alignment on the audio itself).

edge-tts reports word boundaries that are predicted from the text, not measured: they run up to a quarter of a second
ahead of the sound, so a tapped word played with them carries the end of the previous word and loses its own end.
This script listens to every sentence of the MP3 with a speech model (torchaudio MMS_FA, wav2vec2 forced alignment),
finds where each word really is, and places each cut at the quietest point between two words. The JSON is rewritten with
"timing": "aligned"; the reader then plays exactly [start, end) of a word, with no extra margin.

The sentences are decoded with ffmpeg from the same byte ranges the reader decodes (Chrome decodes MP3 with FFmpeg too),
so the times are times in the buffer the reader gets.

Usage:
  python3 align.py "~/Books/Textbook/tts/a1-full/fr-CA-SylvieNeural_p1-162.json"   # rewrites it in place (keeps a .bak)
  python3 align.py --marked JSON     # only the sentences repair.py re-synthesized

Needs: torch, torchaudio (2.5), numpy, num2words; ffmpeg. A GPU is used when there is one.
"""
import argparse
import copy
import fcntl
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata

import numpy as np
import torch
import torchaudio
from num2words import num2words

# A word as the reader takes it on a tap (js/selection.js isWordChar): letters, digits, apostrophes and hyphens inside.
WORD = re.compile(r"[^\W_](?:[^\W_]|['’\-](?=[^\W_]))*")
MODEL_RATE = 16000
PLAY_RATE = 24000          # edge-tts MP3 rate; only used for the energy envelope
HOP = 0.005                # energy envelope step, s
LEAD = 0.025               # kept before the first sound of a word that follows silence
TAIL = 0.030               # kept after the last sound before silence
SEARCH = 0.030             # a cut is looked for this far around the aligned boundary


def words_of(text):
    return [(m.start(), m.end(), m.group()) for m in WORD.finditer(text)]


def romanize(token, labels):
    """The letters MMS_FA knows (a-z and '), with numbers written out in French."""
    parts = re.split(r'(\d+)', token)
    spoken = ''.join(num2words(int(p), lang='fr') if p.isdigit() else p for p in parts)
    spoken = spoken.lower().replace('œ', 'oe').replace('æ', 'ae').replace('’', "'")
    spoken = ''.join(c for c in unicodedata.normalize('NFD', spoken) if not unicodedata.combining(c))
    return ''.join(c for c in spoken if c in labels and c != '-')


def decode(blob, rate):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', str(rate), 'pipe:1'],
                         input=blob, capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32)


def envelope(x, rate):
    hop, win = int(rate * HOP), int(rate * 0.010)
    n = max(1, (len(x) - win) // hop + 1)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (0, win)), win)[::hop][:n]
    return np.sqrt((frames ** 2).mean(axis=1) + 1e-12)


def quietest(env, a, b, middle):
    """The time (s) of the quietest envelope frame in [a, b] when it is a real dip; else middle (two words run together)."""
    i, j = max(0, int(a / HOP)), min(len(env) - 1, int(b / HOP))
    if j <= i:
        return middle
    window = env[i:j + 1]
    k = int(np.argmin(window))
    if window[k] > 0.6 * np.median(window):
        return middle
    return (i + k) * HOP + 0.005


class Aligner:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        bundle = torchaudio.pipelines.MMS_FA
        self.model = bundle.get_model(with_star=False).to(self.device).eval()
        self.dictionary = bundle.get_dict(star=None)
        self.labels = set(self.dictionary)
        self.cpu_model = None

    def emission(self, wave):
        """The model's output for one sentence; a long sentence the GPU has no room for (another run holds it) goes to the CPU."""
        with torch.inference_mode():
            try:
                emission, _ = self.model(torch.from_numpy(wave.copy()).unsqueeze(0).to(self.device))
                return emission
            except torch.OutOfMemoryError:
                torch.cuda.empty_cache()
                if self.cpu_model is None:
                    self.cpu_model = copy.deepcopy(self.model).to('cpu')
                emission, _ = self.cpu_model(torch.from_numpy(wave.copy()).unsqueeze(0))
                return emission

    def spans(self, wave, tokens):
        """[(start s, end s)] of every token that has letters; None for the others."""
        keep = [(k, romanize(t, self.labels)) for k, t in enumerate(tokens)]
        keep = [(k, r) for k, r in keep if r]
        result = [None] * len(tokens)
        if not keep:
            return result
        emission = self.emission(wave)
        targets = [self.dictionary[c] for _, r in keep for c in r]
        if emission.size(1) < len(targets):
            return result
        aligned, scores = torchaudio.functional.forced_align(emission, torch.tensor([targets], device=emission.device))
        token_spans = torchaudio.functional.merge_tokens(aligned[0], scores[0].exp())
        seconds = len(wave) / MODEL_RATE / emission.size(1)
        at = 0
        for k, r in keep:
            group = token_spans[at:at + len(r)]
            at += len(r)
            result[k] = (group[0].start * seconds, group[-1].end * seconds)
        return result


def fill_gaps(spans, duration):
    """Tokens with nothing to align (a lone symbol) take the time between their neighbours."""
    out = list(spans)
    for k, sp in enumerate(out):
        if sp is None:
            prev = next((out[j][1] for j in range(k - 1, -1, -1) if out[j]), 0.0)
            nxt = next((spans[j][0] for j in range(k + 1, len(spans)) if spans[j]), duration)
            out[k] = (prev, max(prev, nxt))
    return out


def cuts(spans, env, duration):
    """Playback ranges: a cut between two words sits at the quietest point near their boundary."""
    if not spans:
        return []
    silence = max(env.max() * 0.03, 1e-4)
    bounds = []
    for (s0, e0), (s1, e1) in zip(spans, spans[1:]):
        lo, hi = sorted((e0, s1))
        bounds.append(quietest(env, lo - SEARCH, hi + SEARCH, (lo + hi) / 2))
    first = spans[0][0]
    i = int(first / HOP)
    while i > 0 and env[i] > silence and first - i * HOP < 0.15:
        i -= 1
    start = max(0.0, i * HOP - LEAD)
    last = spans[-1][1]
    j = int(last / HOP)
    while j < len(env) - 1 and env[j] > silence and j * HOP - last < 0.4:
        j += 1
    end = min(duration, j * HOP + TAIL)
    edges = [start] + bounds + [end]
    out = []
    for k in range(len(spans)):
        a, b = edges[k], edges[k + 1]
        out.append((a, max(b, a + 0.04)))
    return out


def align_file(path, aligner, marked=False):
    with open(path, encoding='utf-8') as f:
        meta = json.load(f)
    with open(os.path.join(os.path.dirname(path), meta['audio']), 'rb') as f:
        audio = f.read()
    for n, sentence in enumerate(meta['sentences']):
        if marked and not sentence.pop('realign', False):
            continue
        blob = audio[sentence['bytes'][0]:sentence['bytes'][1]]
        play = decode(blob, PLAY_RATE)
        duration = len(play) / PLAY_RATE
        tokens = words_of(sentence['text'])
        spans = fill_gaps(aligner.spans(decode(blob, MODEL_RATE), [t for _, _, t in tokens]), duration)
        ranges = cuts(spans, envelope(play, PLAY_RATE), duration)
        sentence['duration'] = round(duration, 3)
        sentence['words'] = [{'s': s, 'e': e, 'start': round(a * 1000), 'end': round(b * 1000)}
                             for (s, e, _), (a, b) in zip(tokens, ranges)]
        if n % 200 == 0:
            print(f'  aligned {n}/{len(meta["sentences"])}', file=sys.stderr)
    meta['timing'] = 'aligned'
    return meta


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('json', nargs='+')
    parser.add_argument('--out', help='write here instead of rewriting the JSON (one input only)')
    parser.add_argument('--marked', action='store_true', help='only the sentences repair.py marked "realign"')
    args = parser.parse_args()
    # One align at a time on this computer: a long sentence needs ~9 GB of the 12 GB GPU, two runs at once ran it out.
    lock = open(os.path.expanduser('~/.cache/book-tts-align.lock'), 'w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print('waiting for another align.py to finish', file=sys.stderr)
        fcntl.flock(lock, fcntl.LOCK_EX)
    aligner = Aligner()
    print(f'device: {aligner.device}', file=sys.stderr)
    for name in args.json:
        path = os.path.expanduser(name)
        meta = align_file(path, aligner, args.marked)
        target = os.path.expanduser(args.out) if args.out else path
        if target == path and not os.path.exists(path + '.bak'):
            shutil.copyfile(path, path + '.bak')
        with open(target, 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=1)
        print(f'{target}: {len(meta["sentences"])} sentences aligned', file=sys.stderr)


if __name__ == '__main__':
    main()
