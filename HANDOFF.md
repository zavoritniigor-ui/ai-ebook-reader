# AI Ebook Reader — Current Handoff State (2026-10-23)

> **RULE FOR AGENTS**: Replace your section with the current state when handing off.
> **NEVER append history dumps** to this file. Historical logs through 2026-10-23 are archived
> verbatim in `docs/archive/HANDOFF-history-2026-10-23.md`.

## Active Agent Worktrees & Tasks
- **Antigravity** (Branch: `chore/agent-setup`, worktree `../wt-agent-setup`):
  - Task: Token optimization (compact rules, docs archiving, .vscode search exclusions) and Antigravity workflow definitions.
  - Status: In progress.
- **Claude Code** (Branch: `fix/selection-words-alone`, PR #281, main directory):
  - Selection/narration/Grammar work below; also took over the book narrations of the previous narration agent.
  - Isolation rule: Do NOT touch or edit files in the main folder while Claude is active.
  - Background narration jobs (scratch scripts, logs in the session scratchpad): `rejoin_all.sh` (Par ici 1-8: sentences with a word broken at a line end re-said whole, then pack into `~/Books/Par Ici/tts/relex-out`), `bescherelle.sh` (Bescherelle Antoine + Sylvie → `~/Books/Bescherelle/Озвучка Bescherelle`), `complete_french.sh` (waits for the two Kokoro generate runs, FR `ff_siwis` + EN `af_heart`, 24 647 sentences each → `~/Books/Complete French/Озвучка Complete French`). Aligns share the GPU through the align.py lock. Then: copy to the delivery folders, upload to Drive, owner re-imports.

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
   - #281: a part of a sentence plays its words said alone, a whole sentence its speech, nothing is ever cut out of a sentence (else the system voice); a drag end never highlights past the finger (`wordBoundsAt` with the anchor: geometry, anchor side in a space, not-reached = keep, only the finger's line); Grammar verb rows said with one tap (recorded sentence → words alone → system voice); narrations as pronunciation dictionaries for every book (Bescherelle); a bilingual book picks the narration by the sentence's language; `tools/book_tts/words.py` records one-letter words («y» as «i»), `rejoin.py` re-says words broken at a line end. ~600 real drags on 4 books checked (scratch `hl_stress.py`).
   - Narration files must be re-imported on the tablet after the rebuilt ones are uploaded.

## Open Pull Requests
- PR #281: selection = dragged words, words said alone, Grammar rows, dictionaries (`fix/selection-words-alone`)
- PR #266: `docs(handoff): local speech engine...` (`docs/handoff-2026-10-20`)
- PR #254: `feat(sidebar): the Contents drawer closes automatically...` (`feat/sidebar-autoclose`)
- PR #252: `feat(drive): save a library book to Google Drive...` (`feat/google-drive-save`)
- PR #245: `[DRAFT, do not merge] feat(page-translation)` (`feat/page-translation`)

## Release / Verification Target
- Production URL: `https://ai-ebook-reader.pages.dev`
- Main CI: Verify green on `main` before closing tasks.
