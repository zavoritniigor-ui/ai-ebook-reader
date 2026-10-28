# Book audio: how a book gets its audio (binding rules)

Every agent so far invented its own way of finding a book's audio (a folder that must be called «audio…», a disc chosen
in a setting, a fix for one textbook's file names), and each fix broke another book. These rules are the owner's and are
final (2026-10-28). Do not redesign them. If a book does not fit, extend the generic rules below and add the case to the
check in §8; never add a special case for one book.

Code: `js/book-audio.js` (tracks, marks, player, the dialog), `js/book-speech.js` (narration, the remembered folder).
What the narration itself must contain: [Narration Text Rules](narration_text_rules.md).

## 1. One menu for every book

The menu row «Аудіо до книги» and its dialog serve **every** book that has audio files, whatever its title, language or
publisher. Three kinds of audio go through the same menu:

| Kind | What it is | Example file names (invented) |
|---|---|---|
| **A. Disc tracks** | the book's recordings, numbered per disc; the book prints «CD2 - piste 35» | `CD1/01 Track 01.m4a`, `CD2 - 05.mp3`, `Disc 2/7 Audio Track.aiff` |
| **B. Section tracks** | the book's recordings, numbered per section (episode, unit, lesson) or straight through | `XYZ_EP01_P3.mp3`, `Unit 4/Track 02.mp3`, `Piste 12.mp3` |
| **C. Narration** | our own recording of the book's text, one tagged MP3 per book | `<book file name>.mp3` (tag `ai-ebook-reader-narration`) |

The learner never says which kind a file is. The app tells it from the file itself (§4).

## 2. No book names anywhere

- **No title, series, publisher or file name of a real book** in code, comments, i18n strings, the menu, the dialog,
  toasts, tests, fixtures, tool examples or repo docs. Tests use invented names («Book 56», «textbook 5-6»).
- Decisions are made **only** from what is in the files: the narration's tag, the PDF's page count and text, generic
  folder and file name patterns (§4), the marks printed in the book (§6).
- A rule that works for one book only is not a rule. Write it so it holds for any book with that structure.

## 3. The order: automatic first, by hand only when that fails

1. **Automatic.** When a book is opened and it has no audio yet, the app looks for it by itself (§5). Quiet: no dialog,
   one toast when something was connected.
2. **One button by hand: «Вибрати папку з аудіо».** When the automatic search found nothing (a phone, no remembered
   folder, files elsewhere). The learner points to ANY folder that holds the audio (§5.2) and the app sorts it out.
3. **«Додати вручну» (single files)** is the last resort, for a phone file picker that cannot choose folders.

No settings, no choices up front. The app asks a question only when the files really cannot tell (§7), after the pick,
with few buttons (owner's dialog rule: 1–2 buttons, main-menu colours, no dark buttons).

## 4. Telling the files apart

For every audio file found (`mp3 m4a m4b aac wav ogg oga opus flac wma aif aiff`):

1. **Narration (C):** an MP3 whose ID3 tag holds `ai-ebook-reader-narration` with valid meta. It belongs to the open book
   when its `pdf.pages` equals the book's page count AND (its `pdf.name` equals the book's file name OR sample sentences
   are printed on their pages, `bsSameBook`). A narration of another book is skipped, never imported as a track.
2. **Everything else is a track (A or B).** From the folder path and the file name:
   - **disc** — `cd`, `disc`, `disk`, `диск` + a number, from the nearest folder, else from the file name.
     A folder `CD1-2` / `CD 1-2` is **part 2 of disc 1**, not disc 2 or disc 12.
   - **section** — `ep`, `episode`, `épisode`, `unit`, `unité`, `leçon`, `lesson`, `module` + a number.
   - **track** — `track`, `piste`, `plage`, `pista`, `t` + a number; else a number at the start of the name
     (`07 Audio Track`); else the last number in the name.
   - **page** — `p` + 3 digits **when the name also has an explicit track token** (`…_p011_t006` = page 11, track 6).
     Without a track token, `p` + number is the track (`…_EP01_P3` = track 3).
   - a trailing copy number (`01 Track 01 1`) = the same track number on the next disc, used only when no folder says
     the disc (a plain file picker has no folder names).
3. **Hidden and work folders are never read**: any path segment starting with `.` (`.work`, `.cache`), and system
   folders (`__MACOSX`). They hold thousands of cache files of the narration pipeline.
4. **Images, PDFs, text files** next to the audio are ignored without a message.

## 5. Where the app looks

### 5.1 Automatic (computer: Chrome / Edge with the File System Access API)

- The **remembered folder** (chosen once, kept per device) is searched up to `BF_DEPTH` levels for:
  - the narration (C) of the open book, by its tag (§4.1), anywhere in the folder;
  - the book's **package**: the folder that holds the opened book file. **All** audio in the package and in its
    sub-folders, whatever they are called (not only folders named «audio…»), are its tracks, minus the narration
    and minus §4.3. A book whose audio lies in a sibling folder outside its package is not found automatically: §5.2.
- Permission to read is asked for only from a tap (the browser refuses it otherwise); a remembered folder that lost its
  permission shows one button «Дозволити доступ».

### 5.2 By hand: «Вибрати папку з аудіо»

The learner may point to **any** of these, and the result must be the same:

- the disc folder itself (`CD1`), or the audio folder above the discs (`audio`, `Аудіо`, `Tracks`, anything);
- the book's whole folder (book PDF + narration + audio folders + hidden work folders);
- a folder that holds **two or more audio folders** (two discs, discs split in parts `CD1-1 … CD1-3`, a disc set AND a
  section set, a second copy of the same set).

The app walks every sub-folder (§4.3 excluded), imports the narration it finds for this book, and the tracks. Drag and
drop of a folder onto the dialog does exactly the same.

## 6. Which track a mark in the book plays

Marks are found in the PDF text: «CD2 - piste 35», «CD1 - Piste 3», a bare «piste 37» / «plage 4» / «track 12». A headphones
icon set in a symbol font comes out as one small letter glued to the mark («iCD1- piste 4») and does not hide it.

1. **Disc marks** («CD2 - piste 35») play the disc-2 track 35 of a disc set (A).
2. **Bare marks** take the disc from the nearest disc mark above them on the page («CD2 - piste 40, piste 41» = CD2 · 41);
   without one, a track that exists once, else the one disc-less track of that number (a set without discs, B).
3. **Numbering that restarts** (bare marks going 1, 2, … and back to 1 inside the book) means sections: the k-th run of
   marks is section k, matched to a section set (B). *Not verified yet on real files: the only such book on the owner's
   computer has no matching audio. Check it on real files before relying on it.*
4. **Two sets never overwrite each other.** Tracks are stored per kind of set (`baSetOf`: disc / section / plain), so a
   disc set and a section set of one book live side by side. A disc mark plays only a disc track (or the one plain track
   of that number); it never plays a section track. Two copies of the same set are one set.
5. A mark whose track is on the device is drawn solid, one that is not yet is dashed; a tap on a dashed mark opens the
   dialog with the reason («у вибраних файлах немає доріжки CD2 · piste 35»).

Narration (C) is not played from marks: it plays what the reader selects (narration rules §1).

## 7. When the files cannot tell

Ask only when two readings are equally possible, after the pick, once per book, then remember the answer:

- loose files with no disc in names or folders, in a book that prints disc marks → «З якого диска ці файли?»
  (CD1, CD2, …, «Без диска»);
- two sets fit the same marks equally → show the two folder names, the learner taps one.

Never ask what the files can answer.

## 8. Check BEFORE merging any change to book audio (required)

The owner's computer holds real books with audio (paths in the agent memory, not in the repo). A change to
`js/book-audio.js` or the audio part of `js/book-speech.js` is ready only when, in a fresh profile, each structure below
gives the expected result **both automatically (remembered folder) and by hand (choosing the book's folder)**:

| Structure on disk | Expected |
|---|---|
| book folder: PDF + narration MP3 + `audio/A CD1`, `audio/A CD2` (`NN Track NN[ 1].m4a`) | narration connected; every «CDn - piste m» mark solid and playing the right track |
| book folder: PDF + narration + `audio/CD1-1 … CD2-3` (parts of discs, `N Audio Track.m4a`) | parts joined into discs 1 and 2; all marks solid |
| book folder: PDF + narration + `audio/CD1/… CD1-3`, `audio/CD2/… CD2-4` (disc folder above the parts) | the same |
| disc set as flat AIFF files `CD1 - 14 Audio Track.aiff` outside the book folder, chosen by hand | stored as WAV; all marks solid |
| book folder with a section set `XYZ_EP01_P1 …` beside a disc set | both kept; disc marks play the disc set; nothing overwritten |
| book folder with `.work/cache/*.mp3` (thousands of files) | ignored; the count of tracks equals the real tracks |
| bilingual book: PDF + narration only, no marks | narration connected; no track count, no error |
| a folder with no audio at all | «Нічого не знайдено» + «Додати вручну» lit; nothing stored |

Report the numbers: tracks stored per disc / set, marks found vs marks solid, narration sentences. A browser test for
each row lives in `tests/book_audio_browser.py` / `tests/book_folder_browser.py`, with invented names (§2).

## 9. State (2026-10-28, PR «book audio from any folder»)

Fixed in code: package audio of any folder name; hidden / system folders skipped (pick, drop, package); a sub-folder holding
another book is not read; `…_p011_t006` = track 6; sections parsed; sets kept apart (old tracks replaced, not doubled); bare
marks take the disc above them; an icon letter glued to «CD1» is ignored.

Measured on the owner's real books (marks found / marks in the text, by choosing the book's folder):
four-level textbook 1-2: 258/258; 3-4: 178/178 (+87 entries of its «tracks ↔ episodes» table page stay dashed); 7-8: 157/157;
5-6: 205/205 with its CD folder, the section set kept beside it. 10 000–35 000 cache files per book folder skipped.

Still open:
- Section numbering that restarts (§6.3): no book with matching audio yet.
- A «tracks ↔ episodes» table page shows dashed marks (they are table entries, not exercises).
- A book whose audio lies outside its folder is found only by hand (§5.1), by design.
