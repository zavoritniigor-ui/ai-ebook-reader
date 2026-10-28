# Book narration: how the text is cut (binding rules)

Every agent so far cut the book text its own way, and each time the narration "played only now and then". These rules are
the owner's and are final. Do not redesign them; if a book breaks them, fix the extraction (`tools/book_tts/columns.py`)
and keep these rules.

## 1. What plays what (owner's rule, final)

| The reader selects | It plays |
|---|---|
| a whole sentence (or several) | its recording, from its first sound to its last, with its own intonation |
| ONE word | that word said alone (`words.py` lexicon) |
| TWO OR MORE words, less than a sentence | the SYSTEM voice: never words alone strung together, never a piece cut out of a sentence |

So the narration works only when **one recorded unit = one whole sentence of the book, from its first word to its full
stop.** A unit that is a piece of a sentence, or two sentences glued, can never match a selection: the system voice reads.

## 2. How the text is cut

1. **A unit is one sentence of the book**, first word to `.` `!` `?` `…`. A paragraph that runs over several blocks or lines
   is joined until its sentence ends.
2. **A heading is a unit of its own**: one line, no full stop, the next block starting in capitals. Never glue it to the
   sentence below («Use of the plus-que-parfait As we mentioned…» is wrong).
3. **A box of short lines** (each line its own pdftotext block, a French textbook) goes on into the next block when the line ends on
   a word or a comma and the next block starts in lower case. Not after a colon that opens a list, not after a page number.
4. **Reading order is pdftotext's block order.** Never sort running text by its height on the page: side-by-side columns
   would be read line by line, mixed («Écrivez B plat est bon ou fie-t-elle que le»).
5. **Two-column tables only for a bilingual book (`--mix`)**, e.g. the bilingual workbook: a French cell, then its English one,
   each one sentence in its column's language. **A book in one voice (a French textbook, a conjugation reference) has no tables**: its boxes,
   forms and exercises are running text. Table detection on a French textbook turned every line of a box into a unit.
6. **A word printed in touching pieces is one word.** pdftotext cuts slanted text into pieces on lines of their own
   («réside» + «nce», «déterminan» + «ts»): a piece that starts where the word before ends (≤ 0.5 pt, about the same
   line, letters on both sides) is glued to it.
7. **Not read:** page numbers, the folio («20 vingt»), bare labels («1.», «a.»), bullets and checkboxes («•», «*», «o»).
8. **One sentence, one language, never cut by language** (`--mix`): the language most of its words are in.

## 3. Check BEFORE making audio (required)

Generating a book takes hours. Measure the cut first:

```bash
cd tools/book_tts
~/tools/book-tts/.venv/bin/python check_units.py "~/Books/textbook 3-4/book 34.pdf" --pages 15-60
~/tools/book-tts/.venv/bin/python check_units.py "~/Books/Workbook/<book>.pdf" --pages 30-60 --mix
```

Reference (2026-10-26, after PR #291), pages 15-60: textbook 1-2 **3** cut sentences of 1694 units; textbook 3-4 **25**.
Before the fix: 220 and 252. If a book shows dozens of cut sentences, read the examples it prints and fix `columns.py`
first. Any change to `columns.py` / `generate.py` must keep `tests/book_tts_columns_test.py` green and must not change
the bilingual workbook (`--mix`) except for the better: diff its units before/after.

## 4. After making audio (required)

Open the packed file's JSON (ID3 GEOB tag, see `pack.py`) and check: `lexicon` present (words said alone, from
`words.py`: without it EVERY single-word tap is the system voice), every page has units, no zero-length units.

## 5. Names (owner's rule, 2026-10-26)

- **A book keeps the exact name it has in its RAR archive.** Never rename a book file (`book 56.pdf` stays `book 56.pdf`).
  The book's archive holds e.g. `book 56.pdf`, `answers 56.pdf`, `audio 56`; a book from another archive keeps the name it
  has on disk.
- **The narration is named EXACTLY like its book**, with `.mp3`: `book 56.pdf` → `book 56.mp3`,
  `Textbook 5-6 listening.pdf` → `Textbook 5-6 listening.mp3`. No voice, no level
  in the name (the voice is inside the file).
- **A package folder is named like the archive's books** (`textbook 5-6`), the same locally and on Drive.
- A folder can hold several books (5-6: `book 56.pdf` and the `Manuel de compréhension orale`): each needs its own
  narration. A narration made for one is refused by the other — that is right, not a bug.

## 6. The pipeline (one voice, a French textbook)

`generate.py --voice fr-CA-AntoineNeural --rate=-10%` → `align.py` → `repair.py` → `align.py --marked` → **`words.py`**
→ `pack.py --pdf <book.pdf>`. One file per book, named like the book (section 5), next to the book PDF (the reader
finds it there). Driver: `~/tools/book-tts/narrate_par_ici.sh <folder> <book.pdf>`. The bilingual pipeline is `narrate_book.sh` (Kokoro, `--mix`).

The narration's units are fixed when it is made: after any change to these rules or to `columns.py`, a book narrated
before must be made again for whole sentences to match.
