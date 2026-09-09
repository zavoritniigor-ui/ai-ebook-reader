# AI Ebook Reader — Agent Handoff

This file is the shared handoff state between Claude Code and Codex. The 19-step
modularization migration is **COMPLETE** (see `MIGRATION_STATUS.md`) — the repository is in
normal maintenance mode, and from here on this file hands off ordinary unfinished tasks
(bugfixes, features, chores) between agents/sessions, not migration steps.

Before starting or resuming work, every agent must read:

- AGENTS.md (mode-check section first)
- CLAUDE.md if applicable (mode-check section first)
- ARCHITECTURE.md — the primary map of the codebase
- HANDOFF.md (this file)

`AUTONOMOUS_MIGRATION.md`, `MODULARIZATION_PLAN.md`, and `MIGRATION_STATUS.md` are historical
records of the completed migration — read them only if investigating that history, not as
part of normal task startup.

## Current handoff

Status: **idle**. Current branch: dev.

Task: user reported that translation "doesn't work well offline / without an API key" and asked
for it to also work well using the tablet's/computer's own resources, no internet required. User
confirmed on their real Android tablet that Chrome's on-device `Translator` API
(`'Translator' in self`) IS available there, and explicitly rejected bundling a heavy WASM/
neural translation model ("older versions worked with downloaded language packs; a big
expansion of the app might hurt it") — so the fix had to stay entirely on Chrome's own built-in,
OS/browser-managed on-device API, no new runtime.

**Root cause**: `js/translation.js` already had on-device translation support
(`translateLocally`/`getLocalTranslator`, tier 2 of the AI → local → Google-translate fallback
chain in `ai-client.js`'s `machineTranslate`) — but the per-language-pair "language pack" only
starts downloading on first actual use, and tier 1 (AI, via `aiTranslateText`) almost always wins
first whenever an API key + network are present. So `translateLocally` essentially never ran
while online, meaning the on-device model was never pre-fetched — by the time the user actually
went offline, the pack wasn't there, and downloading it then requires network it no longer has.
The capability existed but never got a chance to prepare itself.

**Fix**: `js/translation.js` gained `warmLocalTranslator(srcLang, tgtLang)` — starts the
language-pack download in the background (fire-and-forget, idempotent via the existing
`localTranslators` cache Map) as soon as both languages of a pair are known, independent of
whether AI is available. Called from two places where that's true: `js/lang-detect.js`'s
`updateSourceLang()` (fires whenever a book/chapter's language is (re)detected) and
`js/main.js`'s target-language `<select>` change handler. `getLocalTranslator()` gained a
`showProgress` parameter (default `false`): its download-progress callback writes to
`els.progress` — the SAME element used for "page X of Y" reading progress — which was fine for
the original foreground-only caller (`translateLocally`, actively awaited during a real
translation, now explicitly passes `showProgress=true`) but would have been a UX regression for
the new silent background warm-up (a stray "Завантаження... 43%" briefly replacing the reading
indicator while the user is just reading). This was caught and fixed during design, before
shipping.

**Merge conflict note**: same reconnect-merge pattern as always — `git merge --no-ff origin/main`
hit real conflicts in `sw.js` (`CACHE_NAME` + the `translation.js` `APP_SHELL` entry) and
`index.html` (the `translation.js` script tag), caused by a concurrent commit (`9c5ae59`,
unrelated Zapitai AI-explanation-translation feature) that had regenerated hashes for a different
module in the same files. Resolved by keeping HEAD's side for every hunk (it reflected this
change's actual current content), then re-running `python3 tools/version_app_shell.py` — no
further diff, confirming the resolution was already exactly correct.

Release code commit: d4ebff2 (warm-up feature) + 72877d3 (reconnect merge, with conflict
resolution) on dev; PR #72 MERGED (squash); main release commit 9246922.
CI: required `test` check PASS on both parallel runs (push + PR triggers), no flake this time.
Local: full suite PASS — `tests/pdf_ux_browser.py`, `tests/learning_ux_browser.py`,
`tests/migration_audit_browser.py`, `tests/app_shell_versions.py`,
`tests/browser_cdp_transport.py`, `tests/language_paren_browser.py`,
`tests/language_context_browser.py`, `tests/ask_ai_language_browser.py`, and the new
`tests/local_translator_warmup_browser.py` (7/7 checks: silent warm-up never touches the
progress indicator; a real foreground translation still shows download %; both trigger points
fire with the correct language pair; warm-up is skipped while offline or for a same-language
pair; repeated calls for the same pair only start one download; no app errors) — all PASS.
Production: verified `https://ai-ebook-reader.pages.dev/`'s served HTML has the exact new
content-hashes (`translation.js?v=59e0973c2adc`, `lang-detect.js?v=6da5d4bbd5dc`,
`main.js?v=1c39b93701a1`) and zero remaining "classroom" references;
`tests/local_translator_warmup_browser.py` re-run directly against production
(`READER_TTS_URL`, fresh Chrome profile, mocked `Translator` API since this sandbox can't
download a real language pack) — all 7 checks PASS, confirming the warm-up wiring itself is
live and correct.

**Not verifiable from this sandbox**: whether Chrome actually completes a REAL language-pack
download in the background on the user's tablet, and whether translation then genuinely works
with Wi-Fi/data off. This environment can only mock the `Translator` API — it cannot exercise
real on-device model downloads. The user should manually confirm: open a book online for a
minute (to let a real pack download happen in the background), then actually disable
Wi-Fi/mobile data and try translating a word/sentence.

An untracked draft `tests/language_tts_browser.py`, and untracked scratch files `test.js`,
`debug_pdf.mjs`, `dups.txt`, `test_pdf.html`, `test_pdf.mjs`, `viewer.css`, still exist (not
mine, not committed, not wired into CI) — left untouched per "don't overwrite another agent's
uncommitted work" / standard git-hygiene scratch-file exclusions.

Exact next action: none — wait for the user's next actual request, and for their manual
confirmation of real offline behavior on their tablet.

## Handoff rules

Before an agent stops because of token limits, context limits, session end, external interruption, or any other blocker, it must update this file.

The agent must record:

- the current task (what was asked, in one line);
- current branch;
- what has already been completed;
- what remains unfinished;
- files currently modified;
- whether changes are committed;
- commit hash if available;
- PR number if available;
- CI status;
- production deployment status;
- exact next action for the next agent.

When there is no unfinished task, this file should say so plainly (as it does now) rather
than describing stale work as if it were still active.

The next agent must continue from this recorded state and must not repeat completed work unless verification shows the state is wrong.

Never rely only on conversation memory.
Use Git, ARCHITECTURE.md, and HANDOFF.md as the source of truth for ongoing work;
MIGRATION_STATUS.md only for the historical record of the completed migration.
