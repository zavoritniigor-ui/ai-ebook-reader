"""Names of cached narration audio (generate.py: whole sentences, words.py: words said alone).

A clip is named by SHA-256 of «voice|rate|text». Caches made before 2026-11-14 named clips by SHA-1 (flagged by the
Security Gate: python.lang.security.insecure-hash-algorithms). Those files are not thrown away: when a clip exists only
under its old name it is renamed, once, to the new one — so a book's narration is not synthesized again. The old name
is computed with `usedforsecurity=False` because it identifies a file and nothing else; nothing new is named by it.
"""
import hashlib
import os


def clip_name(voice, rate, text):
    return hashlib.sha256(f'{voice}|{rate}|{text}'.encode('utf-8')).hexdigest()


def _legacy_name(voice, rate, text):
    return hashlib.new('sha1', f'{voice}|{rate}|{text}'.encode('utf-8'), usedforsecurity=False).hexdigest()


def adopt_legacy(cache_dir, voice, rate, text, suffixes):
    """Rename the clip's files from the pre-2026-11-14 name to clip_name(), when only the old ones exist. Returns the name."""
    name = clip_name(voice, rate, text)
    if cache_dir and not any(os.path.exists(os.path.join(cache_dir, name + s)) for s in suffixes):
        old = _legacy_name(voice, rate, text)
        for s in suffixes:
            if os.path.exists(os.path.join(cache_dir, old + s)):
                os.replace(os.path.join(cache_dir, old + s), os.path.join(cache_dir, name + s))
    return name
