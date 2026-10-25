# AI Ebook Reader — Current Handoff State (2026-10-24)

> **RULE FOR AGENTS**: Replace your section with the current state when handing off.
> **NEVER append history dumps** to this file. Historical logs through 2026-10-23 are archived
> verbatim in `docs/archive/HANDOFF-history-2026-10-23.md`.

## Active Agent Worktrees & Tasks
- **Antigravity** (Branch: `chore/agent-setup`, worktree `../wt-agent-setup`):
  - Task: Token optimization (compact rules, docs archiving, .vscode search exclusions) and Antigravity workflow definitions.
  - Status: In progress.
- **Claude Code** (Branch: `feat/narration-mixed-voices`, PR #283 open on `main`; PR #282 merged 2026-10-24):
  - Book narration restarted from scratch on 2026-10-24. Isolation rule: do NOT edit files in the main folder while Claude is active.
  - **Owner's rule (final):** a whole sentence plays its recording (its own intonation); ONE word plays that word said alone (`words.py`); TWO OR MORE selected words go to the SYSTEM VOICE (never words alone strung together, never a piece cut out of a sentence). App side is PR #283 (`bsPhrasePlan` / `bsPhraseAnywhere` return null for 2+ words; tests in `tests/book_speech_browser.py`). Not live until #283 is merged.
  - **Old narrations rejected** («неприродно», «як з поганого динаміка» = edge-tts is fixed at 24 kHz / 48 kbps). All old MP3s + caches were moved to the local Trash (not emptied) and to the Drive trash. Drive now has one folder per book: «Par ici», «Complete French», «Bescherelle» (book PDFs + new narrations).
  - **Par ici 1-2 (done):** Microsoft Sylvie (fr-CA, −10%), 7 138 sentences + 4 781 words alone, 240 MB, `~/Books/Par ici 1-2 - Sylvie (fr-CA).mp3` (+ copy `~/Books/livre 12.pdf`), uploaded to `gdrive:Par ici`. Driver: `~/tools/book-tts/narrate_sentences.sh` then `words.py`, `rejoin.py`, `align.py --marked`, `pack.py`. Owner still to verify on the computer/tablet.
  - **Complete French (DONE 2026-10-24 23:08; 2132.5 MB, 36 497 parts, 20 551 words alone, 302 line-end broken words re-said, 0 cut short; 24 kHz / 128 kbps — the 2.1 GB size may be heavy for the tablet's storage: check the import there; a lower bitrate or dropping words is the fallback):** ONE file, Kokoro `ff_siwis` (−10%) for French, Kokoro `am_adam` for English; lines holding both languages are split by `lingua` into parts (`generate.py --mix`), 36 497 parts (22 702 FR, 13 795 EN), 12 846 words alone (each by the voice of its language). Kokoro is now encoded at 128 kbps. Was running then. Driver `~/tools/book-tts/cf_mix.sh`, log `~/Books/Complete French/cf_mix.log`, output `~/Books/Complete French - Kokoro FR+EN (ff_siwis, am_adam).mp3` → upload to `gdrive:Complete French`.
  - **Known weak spots:** lingua mislabels some parts («coin corner» → EN, a heading split mid-phrase); a real sentence glued to a heading/page number in the PDF text («féminin 19 Le séisme…») is one recorded part, so selecting just the sentence = 2+ words of a part → system voice. Count those and re-cut them next. Par ici PDF has letter-spaced headings («J e s u i s») read letter by letter.
  - **Voice tests** (owner listening): `~/Books/Par Ici/xtts-test/` (13 Microsoft FR voices, 4 XTTS-v2, Kokoro), `~/Books/Complete French/kokoro-test/` (12 Kokoro EN voices, p.30 mixed), `~/Books/Par Ici/pairs-test/` (pairs cut vs said alone). XTTS-v2 venv `~/tools/xtts-venv` (owner accepted CPML; torch 2.6 + transformers 4.57). Azure Speech (48 kHz) declined — paid.
  - **Drive problem (2026-10-24 23:08):** rclone (`scope = drive.file`, shared client_id being retired) refreshed its token and now sees ONLY a NEW root folder «Complete French» (created 23:08:37) holding the narration MP3 (2 132 515 352 bytes, size verified). The older folders («Par ici», «Bescherelle», the first «Complete French» with the PDF, «AI Ebook Reader») are invisible to it (Drive usage unchanged, 13 GiB). Owner: move the MP3 into the old folder in the Drive UI; make an own rclone client_id (https://rclone.org/drive/#making-your-own-client-id).
  - **Next:** merge #283 after green CI + production check; owner re-imports narrations on the tablet; fix glued headings / letter-spaced text; Bescherelle not redone yet.

## Open Product Tasks Pending Device Verification
1. **On-Device LLM (Gemma 4 E2B via MediaPipe, PR #278 merged)**:
   - Built: 2.0 GB model download in 64 MiB parts, WebGPU inference for offline translation and explanations.
   - Pending owner validation: Owner's Android 12+ tablet (requires WebGPU, ~6–8 GB RAM, 2.1 GB storage).
   - Check GPU and tokens/s in 📋 `deviceAi` diagnostics.
   - Lighter model: Gemma 3 1B web measured 2026-10-23 — 2–3× faster but unusable (words in Russian/French, explanations in English); owner: «не потрібно, точка». Do not propose again.
2. **Book Narration & Piste Dialogues (PR #269, #270, #276 merged)**:
   - Built: Aligned sentence audio, exact dragged words playback, 3-column narrow gutter fixes.
   - Pending owner reproduction: Owner reported tablet only played system voice; `bookSpeech` diagnostic trace added to 📋 report to log file imports, piste taps, and codec matching.
   - Awaiting owner's 📋 report from physical tablet.
3. **Exact-Words Drag Highlight & Translation (PR #279 merged) + PR #281 (open)**:
   - #281: a part of a sentence plays its words said alone, a whole sentence its speech, nothing is ever cut out of a sentence (else the system voice); a drag end never highlights past the finger (`wordBoundsAt` with the anchor: geometry, anchor side in a space, not-reached = keep, only the finger's line); Grammar verb rows said with one tap from the open book's narration (recorded sentence → words alone → system voice); pronunciation dictionaries for every book were built and then REMOVED at the owner's request (Bescherelle rows are mostly not recorded as rows; Grammar stays AI-driven as before); a bilingual book picks the narration by the sentence's language; `tools/book_tts/words.py` records one-letter words («y» as «i»), `rejoin.py` re-says words broken at a line end. ~600 real drags on 4 books checked (scratch `hl_stress.py`).
   - Narration files must be re-imported on the tablet after the rebuilt ones are uploaded.

## Open Pull Requests
- PR #266: `docs(handoff): local speech engine...` (`docs/handoff-2026-10-20`)
- PR #254: `feat(sidebar): the Contents drawer closes automatically...` (`feat/sidebar-autoclose`)
- PR #252: `feat(drive): save a library book to Google Drive...` (`feat/google-drive-save`)
- PR #245: `[DRAFT, do not merge] feat(page-translation)` (`feat/page-translation`)

## Release / Verification Target
- Production URL: `https://ai-ebook-reader.pages.dev`
- Main CI: Verify green on `main` before closing tasks.
