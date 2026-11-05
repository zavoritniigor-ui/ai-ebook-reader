# AI Ebook Reader — Current Handoff State (2026-10-26)

> **RULE FOR AGENTS**: Replace your section with the current state when handing off.
> **NEVER append history dumps** to this file. Historical logs through 2026-10-23 are archived
> verbatim in `docs/archive/HANDOFF-history-2026-10-23.md`.

## Claims
Read before your first edit; add your row; remove it after your merge ([how](docs/agents/coordination.md)).

| Agent | Branch | Files / area | State | Since |
| --- | --- | --- | --- | --- |
| Codex, cloud | `fix/iphone-word-tap` | `js/selection.js`, `tests/iphone_word_tap_browser.py`, CI diagnostics/invocation; generated hashes | reproduce iPhone tap and translation popup issue | 2026-11-05 |
| Codex, cloud | `feat/separate-scans-shelf` | `js/book-shelf.js`, `js/scanner.js`, `tests/book_shelf_browser.py`, `tests/scanner_browser.py`, `ARCHITECTURE.md`; shelf CSS and generated hashes | working | current session |
| Codex, local | `fix/blurred-scan-sharpness` | `js/pdf-contrast.js`, `tests/pdf_contrast_browser.py`; generated shell hashes | PR #367 open; local gates PASS; exact-head CI pending | 2026-11-02 |
| Claude Code, cloud session «Порівняння функцій конкурентів» | `ccr-a7aab2dd-fip6w9` | library window layout on phones — `index.html` (library CSS), `js/library.js`, `tests/library_browser.py` (#365 merged: scanner, ✦ test, library) | PR open | 2026-11-01 |
| Claude Code on the owner's computer | — | «Analects» OCR offset (`js/pdf-render.js`); waits for the owner's PDF file | not started | 2026-10-31 |

## Codex — iPhone word tap and translation popup
- Worktree `/workspace/wt-iphone-word-tap`, branch `fix/iphone-word-tap`, base main032dea655645aeb81572e41d9112b2a6fd7f15f0. Owner reports missed word taps and long translation delays on iPhone. Physical iPhone/iOS version unverified.
- Confirmed with genuine browser touch events: a swipe with no compatibility click leaves `suppressNextClick` armed, discarding the next deliberate word tap. Baseline `/tmp/iphone-tap-before.log` FAIL, minimal three-line fix and `/tmp/iphone-tap-after.log` PASS. A new primary down in book content clears the stale guard; same-gesture ghost clicks remain suppressed. No translation-provider, dictionary, voice or caret rewrite.
- New regression exercises initial tap, first tap after real swipe, switching popup words, ignoring a ghost click and following real tap exactly once. A held provider proves the popup appears before its response. Local Chrome timing is diagnostic only (193ms latest run), not a physical iPhone/network performance claim.
- All ten focused/regression suites PASS in `/tmp/iphone-word-regressions.log`: new tap test, page edges, tooltip touch, PDF drag/line hold, PDF ink, speech first tap/double voice/local speech, PDF UX and learning UX. Final focused rerun after timing diagnostics PASS. App/worker syntax, content versions and149 CI-suite coverage pass. Generic failure-only CI annotations preserve failure status and every existing suite.
- Additional WebKitGTK2.52.6 app boot/caret/ordinary word lookup PASS with no boot errors. WebDriver maps touch requests to mouse events, so this is engine coverage, not real iPhone finger testing. No system install, new secrets, environment configuration change or publication.
- Separate crop task remains PR372 in `/workspace/wt-crop-image-handoff`; actual EPUB screenshot regression now passes. Latest owner screenshot has old Gemini, so an external Google failure in the new unmerged code is not established. Preserve both changes when merging main; do not clear books or blame custom-domain DNS without source evidence.

## Codex — server speech and selected words
- Fully delivered in PR370/371. Final feature head7f0d1a4188bf8c9dcf16883e9f2c08bb4770330c passed CI41912579650; normal merge032dea655645aeb81572e41d9112b2a6fd7f15f0 passed final mainCI41940731493 and Cloudflare production. Feature/merge trees match.
- French/English page, selected-phrase and clicked-word speech use the server; Ukrainian uses system voice only. Fixed whole-word language matching, exact reflow occurrence context and soft-hyphen word boundaries. Existing imported book narration retains priority; no narration slicing or credentials changed.
- Production smoke `/tmp/server-page-production-smoke.py` / `/tmp/server-word-final-production.log` verified exact six sources, real French page, English selection and French/English clicked-word WAV responses with no system fallback. Ukrainian makes zero server calls with uk-UA system routing; headless Ukrainian synthesis callbacks were mocked, physical playback unverified. Final local speech/word/context/format/book-speech/PDF/learning regressions passed.
- Earlier mainCI41905049078 attempt1 failed with only an exit1 annotation (logs denied at Actions log host); identical feature/merge tree and diagnostic attempt2 SUCCESS. Do not claim the original failure's cause known or ask the owner for those logs again. Worktree and refs retained; only unrelated local HANDOFF notes may remain. No further speech code work needed absent a new report.

## Codex — separate saved scans and fifteen books
- Branch: `feat/separate-scans-shelf`; owner requested separate scan/book lists and a fifteen-book limit.
- Implemented: separate collection controls/counts on the home screen and in My books; 15 books, scans outside the book count and byte budget; explicit scan provenance and compatibility with legacy generated filenames without changing file/bookmark keys. Added a stale-render token for source switches and localised scan retention information.
- Verified locally: shelf persistence/eviction/legacy/custom-name/320px/i18n regressions, scanner, start screen, library, PDF UX and learning UX. Phone screenshot inspected. Syntax, app-shell versions, CI coverage and the final focused rerun all pass.
- Next: commit/push this feature branch, PR exact-head CI, normal merge, main CI and production verification. Keep branch refs unless deletion is explicitly authorised.

## Codex — word translation latency (2026-11-03)
- Branch: `fix/word-translation-latency`; owner's task: decouple translation completion/cache from dictionaries and try OpenAI sooner when Groq stalls.
- Implemented: optional dictionary additions run independently with current-lookup guards; AI answers cache immediately. Groq translation deadline is 3 seconds when a backup exists; OpenAI retains its normal timeout.
- Verified locally: routing/timing regressions (including persistent cache before dictionary completion and real timeout/abort), single-word translation, persistent cache, popup timer, robust translation, rate limits, PDF UX and learning UX. Provider responses mocked, no paid calls. Syntax, shell version and CI coverage gates passed.
- Delivery: PR #368 merged after exact-head CI success; merge `89a289d05b4aa770515676b1193b5ad28d5ed6e1`. Cloudflare production check succeeded; live HTML, worker and changed JS match the merge. Live Chromium smoke confirms the 3000 ms Groq deadline and lookup/cache completion with a hanging dictionary (provider mocked, all POSTs blocked). Main CI run 41729521494 completed successfully: https://github.com/zavoritniigor-ui/ai-ebook-reader/actions/runs/41729521494.
- Follow-up inspection requested by owner: old UI is possible after the 3500 ms navigation timeout (cached shell) or resuming an existing page; the navigation function reproduced old/new/offline results. Existing exit/update/start-URL browser suites pass. No update-lifecycle code changed.
- Complete: PR and main CI green; exact production files and live Chromium lookup verified. Automatic approval review rejected deleting the remote feature ref without explicit permission. The cleanup command did not execute; local and remote feature branches are retained. The completed handoff is preserved in the subsequent shelf task. No direct main push or check bypass.

## Codex — blurred scan sharpness (2026-11-02)
- **Owner's task:** improve blurry letters in scanned books. **Owner's delivery requirement: merge ONLY after successful GitHub CI on the exact final PR head.** Opening a PR does not waive checks. Do not push directly to main, bypass checks, or claim delivery based on local tests alone.
- **Branch / PR:** `fix/blurred-scan-sharpness`, isolated worktree `../wt-scan-sharpness`; [PR #367](https://github.com/zavoritniigor-ui/ai-ebook-reader/pull/367) targets `main`. Implementation `28411ec53bbc6ffdcc880ec2b80dd5bc5f901d65`; verified base `4bbd0cefadcc5205e43454b50f692e9493fedcf9`. GitHub API access works in this local session; the previous cloud networking blocker does not prevent delivery here.
- **Implemented / reviewed:** mild automatic sharpening for soft monochrome PDF text before existing contrast/dark-mode filters. Bounded native-resolution strips and a per-canvas WeakMap; no new dependency or setting. Original-file mode removes the filter; source pixels and text/handwriting geometry remain unchanged. Sharp digital text and tested colour pages are left alone. `index.html` / `sw.js` contain generated hashes only; `js/pdf-render.js` is untouched.
- **Independently verified locally:** `python3 tools/run_tests.py tests/pdf_contrast_browser.py tests/pdf_ux_browser.py tests/learning_ux_browser.py` PASS; all application/worker syntax, app-shell hashes, all 148 browser suites' CI coverage, CDP transport and `git diff --check` PASS. Re-running the shell generator produced no changes. Browser checks include actual edge gradients, DPR 1/2, dark/off modes, sharp/colour pages, unchanged pixels and filter reuse.
- **Current state:** PR open; exact-final-head GitHub CI, merge and production verification are pending. This commit changes handoff documentation only; no unrelated working-tree changes.
- **Next:** monitor PR #367's current head with `tools/ci_wait.sh <sha>`; resolve any failures before normal merge. Then verify main CI and production and remove this Claims row. The owner's original blurred book and physical tablet still need a visual check.

## Active Agent Worktrees & Tasks
- **Antigravity** (Branch: `chore/agent-setup`, worktree `../wt-agent-setup`):
  - Task: Token optimization (compact rules, docs archiving, .vscode search exclusions) and Antigravity workflow definitions.
  - Status: In progress.
- **Claude Code** (2026-10-26 evening; merge chain running unattended):
  - Merged + in production today: #288 #289 #291 #292 #293 #294 #295 #296 #297 #298 #299 #300 #301 #302 #303
    (CBZ, narration text rules, free dictionaries, Persian + flags, word-level alignment, folder narration import,
    whole-unit sentence matching, popup stays while used, wheel without «Голоси», menu section colours).
  - Open, merged one by one by a background script (`scratchpad/chain2.sh`: merge main → CI → merge): #304 sidebar
    hides on reading (a zoom keeps it), #306 «AI на пристрої» section hidden from Settings (code stays), #307 «AI E-book
    Reader» name + Z/I logo + «Від розробника» + mailto feedback, #308 no book titles or book text in the code.
    If a PR is still open tomorrow: merge origin/main into its worktree (`../wt-sidebar`, `../wt-hideai`, `../wt-brand`,
    `../wt-neutral`), re-version (`tools/version_app_shell.py`), wait CI, merge; then verify production.
  - Narration: every book of the four textbook folders narrated (Antoine fr-CA, words alone) and on the owner's Drive
    (one folder per textbook); narration file = book name + .mp3 (docs/agents/narration_text_rules.md §5).
  - Next: a French presentation with screenshots and an in-app «what it can do» tour in the menu language (owner);
    the demo book must be free to show (not the commercial textbooks): a self-made colour Québec «newspaper» from
    Wikipedia/Wikinews + Wikimedia Commons was proposed, owner postponed the choice.
  - Owner to remove locally: worktrees `../wt-noai`, `../wt-start-screen`, `../wt-main-check` (deletion denied to me).
- **Claude Code — narration history** (PR #283 merged 2026-10-24; PR #282 merged 2026-10-24):
  - Book narration restarted from scratch on 2026-10-24. Isolation rule: do NOT edit files in the main folder while Claude is active.
  - **Owner's rule (final):** a whole sentence plays its recording (its own intonation); ONE word plays that word said alone (`words.py`); TWO OR MORE selected words go to the SYSTEM VOICE (never words alone strung together, never a piece cut out of a sentence). App side is PR #283 (`bsPhrasePlan` / `bsPhraseAnywhere` return null for 2+ words; tests in `tests/book_speech_browser.py`). Not live until #283 is merged.
  - **Old narrations rejected** («неприродно», «як з поганого динаміка» = edge-tts is fixed at 24 kHz / 48 kbps). All old MP3s + caches were moved to the local Trash (not emptied) and to the Drive trash. Drive now has one folder per book: a French textbook, «Workbook», «a conjugation reference» (book PDFs + new narrations).
  - **textbook 1-2 (done):** Microsoft Sylvie (fr-CA, −10%), 7 138 sentences + 4 781 words alone, 240 MB, `~/Books/textbook 1-2 - Sylvie (fr-CA).mp3` (+ copy `~/Books/book 12.pdf`), uploaded to `gdrive:a French textbook`. Driver: `~/tools/book-tts/narrate_sentences.sh` then `words.py`, `rejoin.py`, `align.py --marked`, `pack.py`. Owner still to verify on the computer/tablet.
  - **the bilingual workbook (DONE 2026-10-24 23:08; 2132.5 MB, 36 497 parts, 20 551 words alone, 302 line-end broken words re-said, 0 cut short; 24 kHz / 128 kbps — the 2.1 GB size may be heavy for the tablet's storage: check the import there; a lower bitrate or dropping words is the fallback):** ONE file, Kokoro `ff_siwis` (−10%) for French, Kokoro `am_adam` for English; lines holding both languages are split by `lingua` into parts (`generate.py --mix`), 36 497 parts (22 702 FR, 13 795 EN), 12 846 words alone (each by the voice of its language). Kokoro is now encoded at 128 kbps. Was running then. Driver `~/tools/book-tts/cf_mix.sh`, log `~/Books/Workbook/cf_mix.log`, output `~/Books/the bilingual workbook - Kokoro FR+EN (ff_siwis, am_adam).mp3` → upload to `gdrive:the bilingual workbook`.
  - **Known weak spots:** lingua mislabels some parts («coin corner» → EN, a heading split mid-phrase); a real sentence glued to a heading/page number in the PDF text («féminin 19 Le séisme…») is one recorded part, so selecting just the sentence = 2+ words of a part → system voice. Count those and re-cut them next. a French textbook PDF has letter-spaced headings («J e s u i s») read letter by letter.
  - **Voice tests** (owner listening): `~/Books/Textbook/xtts-test/` (13 Microsoft FR voices, 4 XTTS-v2, Kokoro), `~/Books/Workbook/kokoro-test/` (12 Kokoro EN voices, p.30 mixed), `~/Books/Textbook/pairs-test/` (pairs cut vs said alone). XTTS-v2 venv `~/tools/xtts-venv` (owner accepted CPML; torch 2.6 + transformers 4.57). Azure Speech (48 kHz) declined — paid.
  - **Drive problem (2026-10-24 23:08):** rclone (`scope = drive.file`, shared client_id being retired) refreshed its token and now sees ONLY a NEW root folder «Workbook» (created 23:08:37) holding the narration MP3 (2 132 515 352 bytes, size verified). The older folders (a French textbook, «a conjugation reference», the first «Workbook» with the PDF, «AI Ebook Reader») are invisible to it (Drive usage unchanged, 13 GiB). Owner: move the MP3 into the old folder in the Drive UI; make an own rclone client_id (https://rclone.org/drive/#making-your-own-client-id).
  - **Next:** merge #283 after green CI + production check; owner re-imports narrations on the tablet; fix glued headings / letter-spaced text; a conjugation reference not redone yet.

- **Claude Code — cloud session «Порівняння функцій конкурентів»** (2026-10-31, branch `ccr-a7aab2dd-fip6w9`; main CI green after each merge):
  - Merged: #341 text look settings; #344 automatic contrast for faded scans + «Запитати Gemini» in the crop dialog;
    #348 the real EPUB contents (nav.xhtml / toc.ncx) and Wikisource books built as EPUB 3; #349 EPUB footnotes in a card
    and working internal links (`js/formats.js` `rewriteEpubLinks`; in-chapter footnote blocks stay visible on purpose,
    hiding them would shift saved reading offsets).
  - This PR: agent coordination (`docs/agents/coordination.md`, AGENTS.md §9, the Claims table above).
  - Open: highlight offset on an OCR scan («The Analects», p. 896–897) needs the PDF; the app's text-layer geometry measures
    correct. AI speed: proposed Groq streaming for Ask AI and a shorter hedge before the OpenAI backup — waiting for the owner.
    Wikisource illustrations need `upload.wikimedia.org` in the library proxy — the owner's decision. Bottom bar from this
    session's design was cancelled by the owner (the computer agent's bottom reading row #345 is a separate, merged change).
  - CI flakes seen on shared runners: `language_context_browser.py` (voice trace), `sync_browser.py`; a rerun of the failed
    job passed. `format_reader_audit_browser.py` fails its PDF «next page» check in the cloud container on clean main too.

- **Claude Code — offline translation improvements** (2026-10-30, task file «prompt-offline-translation-1»):
  - Item 2 merged: #333 (engine answers kept in memory for the session; 📋 `offline.memory {calls, saved, kept}`).
  - Item 1: PR #334 `feat/offline-dict-meanings` (worktree `.claude/worktrees/offline-dict`): Wiktionary fr→uk via kaikki.org extracts,
    pairs committed in `dict/src/wiktionary-fr-uk.tsv`; 9 744 → 18 833 lemmas with a meaning. Next: after its CI, regenerate
    `dict/REVIEW_SAMPLE.md` from the CI log (`gh run view --log` → `python3 tools/dict_review_sample.py LOG`), push, merge.
    Extracts cached locally in `~/.cache/ai-reader-dict/kaikki/` (SHA-256 at the head of the TSV).
  - Item 5: PR `fix/offline-tr-cut-at-sentence` (`offlineTrClip`, test 3h4).
  - Item 3 measured, NOT done: beam 3 / 4 on the 116 stand sentences (local, real engine): median engine time 83 → 141 / 170 ms,
    ~91 sentences change, with clear regressions («Їх голодувала на довгу зиму», wrong gender) next to gains; Mozilla's
    student models are tuned for greedy decoding. Keep `beam-size: 1`.
  - Item 6 measured, NOT done (High-Risk path): a word tap after the engine stopped ≈ 950 ms vs ≈ 190 ms warm (desktop Chrome).
    Owner to decide whether a longer idle while visible is worth ~300 MB held.
  - Not started: item 4 (quality scores), 7 (en→uk dictionary), 8 (catalog freshness check in CI).

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
   - #281: a part of a sentence plays its words said alone, a whole sentence its speech, nothing is ever cut out of a sentence (else the system voice); a drag end never highlights past the finger (`wordBoundsAt` with the anchor: geometry, anchor side in a space, not-reached = keep, only the finger's line); Grammar verb rows said with one tap from the open book's narration (recorded sentence → words alone → system voice); pronunciation dictionaries for every book were built and then REMOVED at the owner's request (a conjugation reference rows are mostly not recorded as rows; Grammar stays AI-driven as before); a bilingual book picks the narration by the sentence's language; `tools/book_tts/words.py` records one-letter words («y» as «i»), `rejoin.py` re-says words broken at a line end. ~600 real drags on 4 books checked (scratch `hl_stress.py`).
   - Narration files must be re-imported on the tablet after the rebuilt ones are uploaded.

## Open Pull Requests
- PR #289: `feat(reader): CBZ comics and magazine archives` (`feat/cbz-comics`)
- PR #266: `docs(handoff): local speech engine...` (`docs/handoff-2026-10-20`)
- PR #254: `feat(sidebar): the Contents drawer closes automatically...` (`feat/sidebar-autoclose`)
- PR #252: `feat(drive): save a library book to Google Drive...` (`feat/google-drive-save`)
- PR #245: `[DRAFT, do not merge] feat(page-translation)` (`feat/page-translation`)

## Release / Verification Target
- Production URL: `https://ai-ebook-reader.pages.dev`
- Main CI: Verify green on `main` before closing tasks.
