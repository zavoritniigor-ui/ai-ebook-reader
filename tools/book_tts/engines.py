"""The speech engines of the book narration: edge-tts (a Microsoft neural voice, e.g. «fr-CA-SylvieNeural») or Kokoro
run on this computer («kokoro:ff_siwis»). Both give MP3 bytes the reader can decode slice by slice.

Kokoro's audio is encoded to MP3 by ffmpeg WITHOUT a Xing/LAME header, like the edge-tts streams: the reader (Chrome
decodes MP3 with FFmpeg) and align.py then see the same samples at the same times.
"""
import asyncio
import re
import subprocess
import threading

_kokoro = {}
_kokoro_lock = threading.Lock()


def is_kokoro(voice):
    return voice.startswith('kokoro:')


def kokoro_speed(rate):
    """edge-tts rate «-10%» -> Kokoro speed 0.9."""
    m = re.fullmatch(r'([+-]\d+)%', rate or '+0%')
    return 1 + int(m.group(1)) / 100 if m else 1.0


def kokoro_parts(text, limit=200):
    """The text in parts of at most limit characters, cut at spaces."""
    parts, cur = [], ''
    for word in text.split():
        if cur and len(cur) + 1 + len(word) > limit:
            parts.append(cur)
            cur = word
        else:
            cur = f'{cur} {word}' if cur else word
    return parts + [cur] if cur else parts


def _kokoro_mp3(text, voice, rate):
    import numpy as np
    from kokoro import KPipeline
    name = voice.split(':', 1)[1]
    with _kokoro_lock:
        if name[0] not in _kokoro:
            _kokoro[name[0]] = KPipeline(lang_code=name[0], repo_id='hexgrad/Kokoro-82M')   # «ff_siwis» -> «f» (French)
        # Kokoro cuts a piece at 510 phonemes: a long run without punctuation (a table, a contents page) is given in parts
        chunks = [np.asarray(audio, dtype=np.float32) for part in kokoro_parts(text)
                  for _, _, audio in _kokoro[name[0]](part, voice=name, speed=kokoro_speed(rate))]
    if not chunks:
        raise RuntimeError('no audio returned')
    pcm = np.concatenate(chunks).tobytes()
    return subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', '24000', '-ac', '1', '-i', 'pipe:0',
                           '-c:a', 'libmp3lame', '-b:a', '48k', '-write_xing', '0', '-id3v2_version', '0', '-f', 'mp3', 'pipe:1'],
                          input=pcm, capture_output=True, check=True).stdout


async def synthesize(text, voice, rate, boundaries=False):
    """(MP3 bytes, word boundaries: [{token, start, end}] in ms — edge-tts only, align.py measures them anyway)."""
    if is_kokoro(voice):
        return await asyncio.to_thread(_kokoro_mp3, text, voice, rate), []
    import edge_tts
    communicate = edge_tts.Communicate(text, voice, rate=rate, boundary='WordBoundary') if boundaries else edge_tts.Communicate(text, voice, rate=rate)
    audio = bytearray()
    words = []
    async for chunk in communicate.stream():
        if chunk['type'] == 'audio':
            audio.extend(chunk['data'])
        elif chunk['type'] == 'WordBoundary':
            words.append({'token': chunk['text'],
                          'start': chunk['offset'] / 10000,
                          'end': (chunk['offset'] + chunk['duration']) / 10000})
    if not audio:
        raise RuntimeError('no audio returned')
    return bytes(audio), words
