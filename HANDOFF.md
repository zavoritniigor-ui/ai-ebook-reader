# AI Ebook Reader — Current Handoff State (2026-10-26)

> **RULE FOR AGENTS**: Replace your section with the current state when handing off.
> **NEVER append history dumps** to this file. Historical logs through 2026-10-23 are archived
> verbatim in `docs/archive/HANDOFF-history-2026-10-23.md`.

## Claims
Read before your first edit; add your row; remove it after your merge ([how](docs/agents/coordination.md)).

| Agent | Branch | Files / area | State | Since |
| --- | --- | --- | --- | --- |
| Codex, local delivery | `fix/iphone-word-tap` | existing PR #373 selection merge, iPhone/bilingual tests, CI lists; generated hashes | PR #373; print fixture fixed, focused gates PASS, full prefix/new CI next | 2026-11-12 |

| Codex, local | `fix/pdf-sidebar-reflow` | `js/navigation.js`, `js/pdf-continuous.js`, `js/pdf-zoom-pan.js`, `tests/large_publications_browser.py`; generated hashes | PR #390; implementation complete, CI scheduling blocked | 2026-11-11 |
| Antigravity | `fix/ba-restart-single-track` | `js/book-audio.js`, `tests/book_audio_browser.py`, `docs/agents/book_audio_rules.md`; generated shell hashes | working | 2026-11-08 |
| Codex, cloud | `fix/server-page-speech` | `js/tts.js`, `js/local-speech.js`, `js/lang-detect.js`, `js/selection.js`, `tests/local_speech_browser.py`, `tests/language_context_browser.py`; generated hashes | follow-up: en/fr server only; selected-word speech audit | 2026-11-04 |
| Codex, cloud | `feat/separate-scans-shelf` | `js/book-shelf.js`, `js/scanner.js`, `tests/book_shelf_browser.py`, `tests/scanner_browser.py`, `ARCHITECTURE.md`; shelf CSS and generated hashes | working | current session |
| Codex, local | `fix/blurred-scan-sharpness` | `js/pdf-contrast.js`, `tests/pdf_contrast_browser.py`; generated shell hashes | PR #367 open; local gates PASS; exact-head CI pending | 2026-11-02 |
| Claude Code, cloud session «Порівняння функцій конкурентів» | `ccr-a7aab2dd-fip6w9` | library window layout on phones — `index.html` (library CSS), `js/library.js`, `tests/library_browser.py` (#365 merged: scanner, ✦ test, library) | PR open | 2026-11-01 |
| Claude Code on the owner's computer | — | «Analects» OCR offset (`js/pdf-render.js`); waits for the owner's PDF file | not started | 2026-10-31 |

## Codex — Practice selection and French tense timeline (2026-11-10)
- Branch `feat/practice-selection-tense-timeline`, worktree `../wt-practice-timeline`; PR [#388](https://github.com/zavoritniigor-ui/ai-ebook-reader/pull/388). Implementation and local validation complete; no further source edits planned.
- Practice mouse/pen drags select generated words across clickable targets and sentence/story rows; plain target clicks still focus Grammar. Translation and highlights exclude sentence action icons and expanded translations. Native target selection retains handles; pen touch events are blocked only while selecting.
- French controls: past forms left, Présent centered initially/on resize and after the lookup presenter’s two consecutive renders, Futur simple right; moods stay separate. Soft theme-aware shades deepen away from the center, all labels meet AA in the three themes. Default tense lookup and other languages are preserved.
- Final local PASS: Practice selection, timeline, panel translation, sentence actions, AI contract (including the real PDF acceptance), PDF UX and learning UX; syntax, app-shell and CI coverage. Related Practice reading, Grammar redesign/French/lookup and legacy Practice also passed. Existing label checks compare the complete French set without imposing the old visual order; the speech test now uses `original` and asserts the exact spoken word.
- Delivery and CI are tracked in PR #388. No uncommitted work is planned after the handoff commit. Next owner check: Practice selection with the physical Android stylus and the French tense strip in the preferred theme.

## Claude Code — the book's own list of its recordings (2026-11-07) — MERGED (PR #379, main `ed3063f`)
- Rules §6.4 of `docs/agents/book_audio_rules.md`; the code is in `js/book-audio.js`; the test is `tests/book_audio_annex_browser.py`
  (10 checks, in CI). The branch `feat/ba-annex-list` (worktree `/home/igor/Projects/wt-ba-stations`) is merged; nothing is pending on it.
- The owner's question: «can the audio be attached by hand so that it works for ALL the dialogues of the book?» — **yes**, for a book
  that prints its own list of its recordings.
- The Manuel «Par Ici 5-6 Manuel» prints that list at the end: **243 entries** «i Piste N, page M» under 13 headings (STATION 1 … STATION 10,
  STATION PHONÉTIQUE, ANNEXE – MORPHOLOGIE, ANNEXE – STRATÉGIES). The app reads it in the order a reader reads it (the sideways headings
  in the margin are left out), measures the shift to the PDF's pages (**+3**), and every mark then knows its page and its group.
- Measured on the owner's **real** Manuel (148 PDF pages, 500 marks): 243 entries read, 13 groups, **241 of the 257** body marks placed
  (the 16 left are on pages 4/9/10 — the pages that describe the book, not dialogues), **243 of 243** list marks placed; the body mark
  and the list mark of one dialogue resolve to the same recording. End to end with the real file: `page 16 - piste 1.mp3` plays on the
  body mark **and** on the list's mark of that dialogue; `Station 1 - piste 2.mp3` plays on station 1's piste 2 only; the piste 1 of
  another page does not pick it up.
- How to attach by hand: name the files by the book's printed page (`page 27 - piste 5.mp3`) or by the book's own group heading
  (`Station 02 - piste 5.mp3`, or a folder `Station 02`). A plain `piste 5.mp3` stays undecided — the numbers restart in every station.
- **Still missing:** the Manuel's own 236 pistes are not on the disk (page 3 of the PDF: «Accédez au matériel audio et vidéo du manuel au
  www.methode-parici.com»). The CD «audio CD 56» (96 tracks) belongs to the textbook `livre 56.pdf`; the folder `audio 56` (26 FLS2 files)
  is not the Manuel's audio.

## Claude Code — book audio: choosing the folders by hand (2026-11-07)

**Where to start tomorrow (nothing else is pending on this side):**
1. PR #378 (`fix/ba-narration-disc-ask`) is **merged** (main `089f9da`): the narration no longer asks which disc and one foreign narration no longer blocks the batch. PR #379 (the book's own list of its recordings) is **merged** too (main `ed3063f`) — see the section above.
2. The Manuel's own 236 pistes are still missing — they are on www.methode-parici.com (§ above); once the owner downloads them and names them by page or by station, every dialogue of the Manuel plays. Nothing to code until then.

### What PR #378 changes (owner: «я просто вручну вказати папку… може бути не одна папка, а дві»)
- The owner's manual flow was broken in two places, both on the **real** book folder `~/Books/Par Ici 5-6`:
  1. the app asked **«З якого диска ці файли?»** for the folder that holds the book, because the book's own narration MP3
     (an MP3 with the narration tag, rules §4.1) was counted as a loose track. Now `baNarrationFiles()` recognises it
     **before** the question (§4.1, §7); it is never stored as a track.
  2. the folder holds **two narrations**: the book's own (148 pages) and «livre 56» (203 pages). The second one made
     `bsImport` refuse the **whole batch**, so the book's own narration was never connected. Now a narration of another
     book is **skipped** (noted in the 📋 report) and the others are imported.
- Measured on the owner's book (clean Chrome profile, 8767 server, choosing the book folder): **122 tracks** (disc 1: 53,
  disc 2: 43, five sections: 26) + the book's narration (**8939 sentences**), **no question**; the other book's narration is
  skipped. Two folders picked one after another keep both sets side by side (§6.4) — nothing is overwritten.
- Tests: `book_audio_browser.py` **14o** (new: the narration raises no question and is no track), 14d now awaits the
  async call; `book_speech_browser.py` **13h** (new: a batch with a foreign narration keeps this book's one).
  Suites `book_audio_browser.py`, `book_folder_browser.py`, `book_speech_browser.py` pass locally; `app_shell_versions.py`
  and `ci_suite_coverage.py` pass.
- Note for the next run: a browser keeps the **old** JS until the new service worker is active — reload the page two or
  three times after `tools/version_app_shell.py`, or the suite silently tests the previous build.

## Claude Code — book audio: a wrong dialogue (2026-11-06)
- Owner's report (tablet screenshot): the Par Ici 5-6 Manuel played **another page's dialogue**; the dialog said «Грають усі позначки книги: 500». Checked on the owner's computer with the real PDF and the real folder: the same thing — **not a device bug**.
- Cause: rules §6.2 (numbers that restart per section must not play) could not see this book. The restart test only counted the tracks of a **disc**, so a **section set** (`FLS2_EP01_P1 …`) was invisible to it, and its second condition («the highest piste is at most half of that disc's tracks») cannot fire when the files are fewer than the book has dialogues (26 files ↔ 236 pistes).
- Fix (PR #376, merged as `667e77c`): the restart is now also read from the book alone — the same number printed on **three or more pages** (a mark that names its page — a transcript — does not count). Such marks are blocked, the dialog says so in amber, no other dialogue plays.
- Measured on the owner's real books (marks that play / found): 1-2 258/258, 3-4 187/189 (track table), 7-8 157/157 — unchanged; the Manuel with 500 marks and 26 section files: **0/500, amber** (before 500/500 green, every mark wrong). New browser check `14n`; rules §6.2, §8, §9 updated.
- The Manuel itself: it prints «STATION N» and numbers its 236 pistes **again in every station** and has no piste table at the end, so its dialogues cannot be matched by number at all. The folder «audio 56» (26 files `FLS2_EPxx_Pyy`, ~1 min each) is **not** the Manuel's audio (its stations hold 12–26 pistes each); the method's own dialogues are the disc set «audio CD 56» of `livre 56.pdf`.
- Next: the Manuel's dialogues play only with its own files named so the station is visible («STATION 09 - piste 5.mp3») and a new rule that matches (station, piste); needs the owner's files or the publisher's table. Nothing to do until then.
- Also done before: the rollback of PR #372 (PR #375, merge `f6a9584`) restores the 2026-11-04 green tree; main CI `42332434339` is green.

## Codex — server speech and selected words
- Worktree `/workspace/wt-server-page-speech`, branch `fix/server-page-speech`. PR #370 merged as `1759723eda10d7c2ec7337c127d0f726cb9404aa` after exact-head CI `41899329848` and Cloudflare preview success. Production HTML/JS/worker match; French page and English selection played real server WAV with no system fallback.
- Final owner rule: server speech only French/English; Ukrainian uses system speech. Follow-up PR #371 also keeps the existing Cyrillic detector for correct system locale. Superseded Ukrainian-server CI `41906464814` was cancelled after this clarification; new head CI pending after push.
- Word audit confirmed wrong-language substring matches (car inside cartoon, est inside test, on inside conversation), ambiguity between repeated words in mixed-language text, and partial selection at hidden soft hyphens. Fix: whole-word context matching, exact reflow occurrence from the clicked range, retain soft hyphens in source offsets but ignore them for language scoring/server pronunciation. No narration slicing, credentials or server configuration changes.
- Verified: 31 local-speech assertions plus eight real-pointer word scenarios; contextual/parenthetical languages, PDF word taps/split words, formats, book speech, first-tap/double-voice, PDF UX and learning UX. Syntax, app-shell versions, CI coverage and diff checks pass. Real backend chat(fr/en) produces different WAV hashes; no language-cache conflation observed.
- Main CI `41905049078` attempt1 failed in browser tests; logs blocked at results-receiver.actions.githubusercontent.com, annotations only exit1. Green PR and merge trees identical (`52f3d31113afb66716807286e637e02161054548`); one diagnostic rerun attempt2 running. Cause unconfirmed. Async owner question requests failed-test name/log tail; do not repeat unnecessarily.
- Next: push final word/routing changes, update PR371 title/body, exact-head CI, main gate, normal merge and final main CI. Update `/tmp/server-page-production-smoke.py` for real en/fr pages + clicked words and Ukrainian system routing (headless mock only); then run against deployed exact source files. Retain branch refs; preserve unrelated root-worktree HANDOFF edits.

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
- **Codex — PDF and large publications (2026-11-11)** (follow-up branch `fix/pdf-sidebar-reflow`, worktree `../wt-pdf-sidebar-reflow`; [PR #390](https://github.com/zavoritniigor-ui/ai-ebook-reader/pull/390)):
  - Initial delivery [PR #389](https://github.com/zavoritniigor-ui/ai-ebook-reader/pull/389) merged as `6786f13`; exact-head CI [43040075800](https://github.com/zavoritniigor-ui/ai-ebook-reader/actions/runs/43040075800) and main CI [43046161806](https://github.com/zavoritniigor-ui/ai-ebook-reader/actions/runs/43046161806) passed. Large PDF streaming/range opening, complete translations/selections and independent series downloads are deployed.
  - Final production visual QA on the real Par Ici revealed a remaining sidebar race: navigation/scroll cancelled the entire delayed resize, leaving an 800px stack in a 480px workspace. The follow-up invalidates only the stale reading anchor; explicit setup/relayout owns cancellation, and the queued resize captures the newer reading position.
  - The new regression fails on main with the oversized stack and passes after the fix. Isolated Chromium at 800x1280 also confirms the owner's real Par Ici page 69 is entirely between x=320 and x=800, with a 480px stack, wrapper and canvas. Screenshot: `/tmp/pdf-sidebar-reflow/tablet-original-book-sidebar.png` (not committed).
  - Local follow-up gates PASS on stable source in isolated Chrome (debug port 9333): PDF UX, learning UX, workspace, workspace regressions, visited drags, large publications and strict real-book edge checks; all-JS syntax, shell versions and CI coverage. Earlier default-port probes were interrupted by browser/page closure; their cause remains unconfirmed.
  - Delivery blocker: source `9f8832b` is pushed in PR #390; [CI run 43096544958](https://github.com/zavoritniigor-ui/ai-ebook-reader/actions/runs/43096544958) remained queued with zero jobs for over 35 minutes. Both normal and force-cancel REST requests returned HTTP 409, “Cannot cancel a workflow run that has not been queued yet”; no retry/cancellation was accepted. Full local and exact-head hosted-preview large-file/strict real-book checks pass. A separate library workflow is also queued; underlying GitHub scheduling cause is unconfirmed.
  - This checkpoint changes HANDOFF only; all functional work is committed. Next: require current PR-head CI green, final review/normal merge, main CI green and production edge/width verification. No further functional edits are planned before CI. Existing EPUB/DOCX archive safety limits remain enforced; the physical tablet still needs the owner's visual check.
- **Antigravity** (Branch: `fix/multi-device-page-speech`, worktree `../wt-ba-general-rules`; previous `fix/ba-general-rules` PR #381 merged `5ffd5c5`, main CI `42510962711` green):
  - Task: Multi-device parallel full-page local speech & translation (`js/local-speech.js`, `js/tts.js`, `js/translation.js`, `js/ai-client.js`, plus local `/home/igor/tools/tts-server/server.py`): split long selected passages (> 260 chars) into sentence chunks with background prefetching in `speakViaLocal`, avoid disabling local speech on HTTP 400, disable word-alignment JSON overhead for selections > 450 chars, scale Groq translation timeout and token budget for full-page selections, and raise local server `MAX_CHARS` (5000), `RATE_MAX` (240/min per Wi-Fi IP), and GPU synthesis lock.
  - Verified locally: `tests/local_speech_browser.py`, `tests/translation_robust_browser.py`, `tests/bilingual_selection_browser.py`, `tests/groq_limit_browser.py`, `tests/ai_groq_first_own_keys_browser.py`, `tests/pdf_ux_browser.py`, `tests/learning_ux_browser.py`, syntax and app-shell version gates PASS.
  - Status: Opening PR and awaiting exact-head CI before merge.
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

## Codex — delivery of PRs #391, #374, #373 (2026-11-12)
- Owner requested all three PRs through normal merge, main CI and production. PR #373 continues on `fix/iphone-word-tap` in `../wt-deliver-373`; unrelated dirty worktrees are preserved. Main #374 is integrated.
- EPUB taps use touch completion and fresh gesture guards; main’s PDF touch ownership, selection bounds, share UI and title remain. The pending-provider test isolates local preview. The print regression now owns the native-printer stub, waits for the real print invocation after image decode/focus, removes its frame, and exercises real CDP Ctrl+P. Existing rasterization/shortcut assertions remain, plus a new print-invocation assertion.
- Confirmed prior CI [43226337049](https://github.com/zavoritniigor-ui/ai-ebook-reader/actions/runs/43226337049) failed only at the synthetic Ctrl+P assertion; app boot errors were empty. Source inspection found image readiness was mistaken for print completion. Classification of that timing as the CI cause is INFERRED, not a reproduced product failure; production print code is unchanged.
- Local PASS: PDF print, the fixed full repair suite twice and iPhone taps with CI Chrome flags. Earlier source/integration gates passed: bilingual/visited drags, large publications, PDF UX, learning UX, share/title, bottom-row/page-arrow; application/worker syntax, hashes and coverage. A complete 60-suite CI prefix with baseline diagnostics followed by the fixed repair suite is still running. Next: require that sequence and new exact-head CI green, final review, normal merge, main CI and production.

## Codex — iridescent bottom reading bar delivery (2026-11-12)
- PR #374 merged as `364d940a83e1234403d439cb4ebee7139b013885` after exact-head CI [43219553679](https://github.com/zavoritniigor-ui/ai-ebook-reader/actions/runs/43219553679) passed. Main CI [43225399563](https://github.com/zavoritniigor-ui/ai-ebook-reader/actions/runs/43225399563) passed. Production HTML was rechecked after CI and matches the merge; three-theme/reduced-motion smoke passed. The clean task worktree and merged local/remote branch were safely removed; preserve the merged CSS when integrating other work.
- Local PASS: `reading_bottom_row_browser.py`, `page_arrows_browser.py`, application/worker syntax, app-shell hashes, all 154 CI suite invocations. Next: exact-head CI, final review, normal merge, main CI and production smoke.
