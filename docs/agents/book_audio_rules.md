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

For every audio file found (`mp3 m4a m4b mp4 aac wav ogg oga opus flac wma aif aiff`):

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
5. **A format the browser cannot play** (`wma` in Chrome; checked with `canPlayType`) is not stored: the dialog says how many
   such files were skipped and that MP3 / M4A play everywhere. It is never stored silently to fail on the first tap.

### 4.6 How a track is stored (owner, 2026-10-28: «AIFF must be squeezed about 10 times»)

Uncompressed audio (`aif aiff wav flac`) is **encoded to Opus (Ogg) at import**, in the browser (WebCodecs `AudioEncoder`,
48 kHz, 64 kbit/s mono / 96 kbit/s stereo): about 10–20 times smaller than WAV, the same for speech. The learner picks the
AIFF folder as it came from the publisher; nothing is converted by hand. When the browser cannot encode or cannot play Opus,
AIFF is stored as WAV (same PCM, playable) and WAV / FLAC as they are. Compressed formats (`mp3 m4a mp4 aac ogg opus`) are
stored untouched. A track already stored as WAV is re-encoded when its folder is picked again.

## 5. Where the app looks

### 5.1 Automatic (computer: Chrome / Edge with the File System Access API)

- The **remembered folder** (chosen once, kept per device) is searched up to `BF_DEPTH` levels for:
  - the narration (C) of the open book, by its tag (§4.1), anywhere in the folder;
  - the book's **package**: the folder that holds the opened book file. **All** audio in the package and in its
    sub-folders, whatever they are called (not only folders named «audio…»), are its tracks, minus the narration
    and minus §4.3. A book whose audio lies in a sibling folder outside its package is not found automatically: §5.2.
- **The remembered folder is set by the one button** «Вибрати папку з аудіо» (§5.2): a picked folder that holds the open
  book is remembered (one per device, the last one wins); a picked folder elsewhere is not. There is no separate
  «books folder» row, no «Дозволити доступ» button: a folder whose permission lapsed is simply picked again (the picker
  opens where it was).

### 5.3 What the dialog says

The status tells what plays in **this** book, never just how many files are stored:
«Грають усі позначки книги: N» / «Грають K з N позначок книги» (green), or, when stored tracks match none of the book's
marks, an amber line that names one missing mark («CD1 · piste 20») and asks for the folder with this book's recordings.
The narration has its own line «Озвучка: N речень». A book without marks shows the track count. A book WITH marks and no
tracks is amber («Записів до позначок книги ще немає…») even when its narration is connected: the narration is never
reported as the book's recordings (owner, 2026-10-28: a green «Аудіо підключено» hid that no dialogue was connected).
Marks that cannot be matched (§6.2: numbers restart per section and the book has no track table) give an amber line
that says so; they are not counted as playing.

### 5.2 By hand: «Вибрати папку з аудіо»

The learner may point to **any** of these, and the result must be the same:

- the disc folder itself (`CD1`), or the audio folder above the discs (`audio`, `Аудіо`, `Tracks`, anything);
- the book's whole folder (book PDF + narration + audio folders + hidden work folders);
- a folder that holds **two or more audio folders** (two discs, discs split in parts `CD1-1 … CD1-3`, a disc set AND a
  section set, a second copy of the same set).

The app walks every sub-folder (§4.3 excluded), imports the narration it finds for this book, and the tracks. Drag and
drop of a folder onto the dialog does exactly the same.

## 6. Which track a mark in the book plays

Marks are found in the PDF text: «CD2 - piste 35», «CD1 - Piste 3», «CD2 - Exercice 4», a bare «piste 37» / «plage 4» /
«track 12» (a bare «exercice 4» is running text, never a mark). A headphones
icon set in a symbol font comes out as one small letter glued to the mark («iCD1- piste 4») and does not hide it.
Not marks: a bare «plage 11» / «piste 3» after an article («la plage», «une piste») — the word in running text; and a word
followed by a number of the NEXT table column (a gap of several letters: «10. plage      20. calepin»). A bilingual book with
no audio must show no marks at all (checked: 0 on a 657-page French–English book).

The number printed in a mark is NOT always the track number on the disc (owner's report 2026-10-28: a textbook printed
«CD2 - piste 1» on the page of episode 22 and the app played disc-2 track 1, the dialogue of episode 15). Books number their
marks in one of three ways, and the app finds out which, from the book itself, in this order:

1. **The book has a track table** («correspondance des pistes»: rows of *track number — name with piste / exercice N — pages*,
   under headers «CD1 …», «CD2 …», often at the end of the book). Then a mark plays the row of its disc with the same
   piste (or exercice) number and the page the mark is printed on; the row's number is the track on the disc. The page
   numbers printed in the table are the book's own; the shift to the PDF's page numbers is measured from the marks (the most
   common difference). A mark that names its page («CD1 - piste 5, p. 22», as in a transcript section) uses that page.
   A row is used only when the table of that disc is whole (tracks 1…N, each once). The table's own
   rows are not marks (no buttons on a table page). The player names the row («CD2 · piste 1 · Épisode 22»).
2. **No table, and the marks of a disc restart** (piste 1 on three or more pages, and the highest piste is at most half of
   that disc's tracks): the numbers are per section and cannot be matched without the publisher's table. Those marks do not
   play; the dialog says so in amber. Guessing a track would play another page's dialogue: worse than silence.
3. **Otherwise the numbers run through the disc** («CD1 - piste 30» = disc-1 track 30), the usual case:
   - **disc marks** («CD2 - piste 35») play the disc-2 track 35 of a disc set (A);
   - **bare marks** take the disc from the nearest disc mark above them on the page («CD2 - piste 40, piste 41» = CD2 · 41);
     without one, a track that exists once, else the one disc-less track of that number (a set without discs, B).
   - an «exercice N» mark has no meaning without a table and does not play.

Also:

- **Two sets never overwrite each other.** Tracks are stored per kind of set (`baSetOf`: disc / section / plain), so a
  disc set and a section set of one book live side by side. A disc mark plays only a disc track (or the one plain track
  of that number); it never plays a section track. Two copies of the same set are one set.
- A mark whose track is on the device is drawn solid, one that is not yet is dashed; a tap on a dashed mark opens the
  dialog with the reason («у вибраних файлах немає доріжки CD2 · piste 35»).
- The marks of the whole book are read in the background as soon as the book has tracks (a tap waits for it), because
  the table and the restart test need every page.

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
| disc set as flat AIFF files `CD1 - 14 Audio Track.aiff` outside the book folder, chosen by hand | stored as Opus (≈10× smaller than WAV); all marks solid and playing |
| a book whose marks restart per episode and which prints a track table (marks «CDn - piste k», «CDn - Exercice k») | every mark plays the track of its table row (e.g. the episode-22 page's «CD2 - piste 1» → disc-2 track 25); table rows give no buttons |
| a book whose marks restart per unit, without a table | amber line, the marks do not play |
| book folder with a section set `XYZ_EP01_P1 …` beside a disc set | both kept; disc marks play the disc set; nothing overwritten |
| book folder with `.work/cache/*.mp3` (thousands of files) | ignored; the count of tracks equals the real tracks |
| bilingual book: PDF + narration only, no marks | narration connected; no track count, no error |
| a folder with no audio at all | «Нічого не знайдено» + «Додати вручну» lit; nothing stored |

Report the numbers: tracks stored per disc / set, marks found vs marks solid, narration sentences. A browser test for
each row lives in `tests/book_audio_browser.py` / `tests/book_folder_browser.py`, with invented names (§2).

## 9. State (2026-10-28, PR «track tables, Opus»)

Fixed in code: package audio of any folder name; hidden / system folders skipped (pick, drop, package); a sub-folder holding
another book is not read; `…_p011_t006` = track 6; sections parsed; sets kept apart (old tracks replaced, not doubled); bare
marks take the disc above them; an icon letter glued to «CD1» is ignored; the book's track table (§6.1); restarting numbers
without a table do not play (§6.2); AIFF / WAV / FLAC stored as Opus; MP4 accepted, WMA refused with a message.

Measured on the owner's real books (marks that play / marks found, choosing the book's folder):
four-level textbook 1-2: 258/258 as printed; 3-4: 187/189 through its track table (the two left are on the «how to use the
book» page; checked by tap and track length: episode 22 «CD2 - piste 1» → disc-2 track 25, «CD1 - piste 5, p. 22» in the
transcripts → track 5, «CD2 - Exercice 9» → track 49); 5-6: 205/205; 7-8: 157/157; a listening book whose numbers restart per
unit, with 236 invented tracks: 0/500, amber; bilingual book: 0 marks. 96 AIFF tracks (1.33 GB) stored as Opus: 89.5 MB, in
101 s on a computer, durations unchanged. Before this the textbook with a track table played the wrong track for almost every
mark after its first episode, and the status counted them as «playing».

Still open:
- A book whose audio lies outside its folder is found only by hand (§5.1), by design.
- Section tracks (B) matched to restarting marks by section: no book with both yet.
