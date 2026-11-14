# Book audio — state history (moved out of docs/agents/book_audio_rules.md §9 on 2026-11-14)

What each change fixed and what was measured on the owner's books. The rules themselves stay in `docs/agents/book_audio_rules.md`.

## 9. State (2026-10-28, PR «track tables, Opus»; 2026-11-06, PR «restarting numbers read from the book»)

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

2026-11-06: a book whose numbers restart per section played **another page's dialogue** when its files were a section set
(«…_EP01_P1 …»): the old restart test only looked at the tracks of a disc, so a section set was invisible to it, and the
files (fewer than the book has dialogues) could not pass its "half of the disc's tracks" test either. The restart is now also
read from the book alone (§6.2), so those marks do not play and the dialog says so in amber. Measured after the change on the
owner's books: 1-2 258/258, 3-4 187/189, 7-8 157/157 (unchanged); the listening book with 500 marks and 26 section files:
0/500, amber (before: 500/500 green, every mark playing a wrong dialogue).

2026-11-07: a book whose numbers restart per station and which prints its own list of its recordings (the Manuel
«Par Ici 5-6», 148 PDF pages) now reads that list: **243 recordings, the shift to the PDF's pages = +3, 241 of the 257
marks of the body placed** (the 16 left are the pages that describe the book, not dialogues); 13 groups read in the book's own
words (STATION PHONÉTIQUE, STATION 1 … STATION 10, ANNEXE – MORPHOLOGIE, ANNEXE – STRATÉGIES). The files of such a book are
named by the page (`page 27 - piste 5.mp3`) or by the group (`Station 02 - piste 5.mp3`, or a folder `Station 02`); a mark then
plays only the file of its own page or group, so the dialogue of another page never answers it. Before this, the marks of
that book could not be matched at all (the numbers restart in every station).
2026-11-07: the owner's own flow — choosing the folder(s) by hand — was broken in two places. (1) The book's own narration
(the MP3 with the narration tag) was counted as a loose track, so the app asked «З якого диска ці файли?» for a folder that
holds the book; the narration is now recognised before the question and never stored as a track (§4.1, §7). (2) When several
narrations were picked at once, one narration of another book refused the whole batch, so the book's own narration was never
connected; now the narration of another book is skipped and the others are imported. Measured on the owner's listening book
(«Par Ici 5-6 Manuel», 148 pages, 500 marks): choosing the book's folder gives 122 tracks (disc 1: 53, disc 2: 43, five
sections: 26) and the book's narration (8939 sentences), no question; the narration of the other book in the same folder
(«livre 56», 203 pages) is skipped with the note «another book».

2026-11-08: Generalised mark parsing, dialog deduplication, and slot disambiguation across language learning textbooks (PR #383).
(1) `renderBookAudioDialog` suppresses duplicate messages when `message === text` (such as `t('baRestart')`), preventing duplicate
identical paragraphs. (2) `BA_MARK_RE` accepts commas and slashes after `CD N` (`CD 1, piste 2`). (3) `baMarkBoxes` updates disc
from preceding line headers in narrow columns. (4) `la piste N` is parsed while preserving article exclusion for «la plage» and «une piste».
(5) `baAssignDiscs` requires duplicate files with a copy suffix (`copy > 0`) before assigning artificial CD numbers.
(6) `baPickBestParsed` disambiguates duplicate slots by book token overlap, coverage of the open book's marks, explicit track names,
and clean suffixes (vocal over `_vi`, main audio over short supplements).
