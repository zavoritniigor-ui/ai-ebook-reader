#!/bin/bash
# A whole book as ONE narration file for the reader (owner, 2026-10-25).
# Every sentence is recorded whole. A cell of a two-column table is one sentence in its column's language (columns.py).
# No word is recorded alone: the system voice reads a word or a part of a sentence. Kokoro: French ff_siwis (-10%),
# English am_adam (+0%). generate → align → repair → align --marked → pack.
#
# Usage: narrate_book.sh <book.pdf> <pages, e.g. 1-657> <work dir> <final .mp3 path> [cache dir to reuse]
# The cache (sentence audio by voice, rate and text) can come from an earlier run: the same sentence is not synthesized twice.
set -u
PDF=$1; PAGES=$2; OUT=$3; FINAL=$4; CACHE=${5:-}
KOKORO=~/tools/kokoro-venv/bin/python        # generate.py: Kokoro and lingua
PY=~/tools/book-tts/.venv/bin/python         # align.py (torch), pack.py
MIX='fr=kokoro:ff_siwis@-10%,en=kokoro:am_adam@+0%'
TOOLS="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT" && cd "$TOOLS" || exit 1
if [ -n "$CACHE" ] && [ ! -e "$OUT/cache" ]; then ln -s "$(realpath "$CACHE")" "$OUT/cache"; fi
echo "=== generate $(date '+%F %T')"
nice -n 5 $KOKORO generate.py --pdf "$PDF" --pages "$PAGES" --mix "$MIX" --out "$OUT" || { echo "GENERATE FAILED"; exit 1; }
JSON=$(ls "$OUT"/*.json | head -1)
echo "=== align $(date '+%F %T')"
$PY align.py "$JSON" || { echo "ALIGN FAILED"; exit 1; }
echo "=== repair $(date '+%F %T')"
$KOKORO repair.py "$JSON" || echo "repair had a problem"
$PY align.py --marked "$JSON" || echo "ALIGN --marked FAILED"
echo "=== pack $(date '+%F %T')"
$PY pack.py "$JSON" --pdf "$PDF" --out "$FINAL" || { echo "PACK FAILED"; exit 1; }
echo "=== all done $(date '+%F %T')"
