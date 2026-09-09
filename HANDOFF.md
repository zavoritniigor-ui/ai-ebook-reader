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

Task: user reported that TTS "sounds like the same voice plays twice with a millisecond delay" —
noticed in French, asked to check other languages too. No repro steps beyond "listening while TTS
is on"; investigation was code-driven (this sandbox has no real audio device/real TTS voices, so
the bug itself could not be heard here — see verification limits below).

**Root cause found by code audit**: several places called `speechSynthesis.speak()` in the exact
same synchronous tick as `speechSynthesis.cancel()` — `speakText`/`speakInLang` (tooltip word/
translation speaker buttons), `stepSentence()`'s active-reading branch (prev/next sentence
buttons), and the settings voice-preview sample in `js/main.js`. This is a well-documented Chrome/
Android Web-Speech-API quirk: an immediate `speak()` right after `cancel()` can start the new
utterance while the platform is still flushing the just-cancelled one's audio tail — audible as
the same voice repeating a few ms apart, exactly matching the report. Ruled out first (code-level,
confirmed clean): the FR/EN language-segmentation logic in `lang-detect.js` (a pure French
sentence produces exactly one segment/one utterance — no duplication there, and
`tests/language_context_browser.py`'s existing `noDrop` check already guards against
duplicated/dropped words across segments); the `speakSegment→onend→speakSegment` chain inside
`speakCurrentSentence()` (no `cancel()` between those `speak()` calls, and the `ttsGen` generation
guard already protects against a stale/duplicate `onend`+`onerror` firing for the same utterance).

**Fix**: `js/tts.js` gains `TTS_CANCEL_SPEAK_DELAY_MS` (80ms) — every one of those four call sites
now gives `cancel()` a short head start before the next `speak()`, guarded by the existing
`ttsGen` counter so a second rapid call (another tap, a fast double-step) discards the now-stale
scheduled `speak()` instead of also firing it, guaranteeing only one utterance is ever in flight.

Release code commit: fd874f0 (fix) + reconnect merge on dev; PR #74 MERGED (squash); main release
commit 65d59d8.
CI: required `test` check PASS on both parallel runs (push + PR triggers), no flake.
Local: full suite PASS — `tests/pdf_ux_browser.py`, `tests/learning_ux_browser.py`,
`tests/migration_audit_browser.py`, `tests/app_shell_versions.py`,
`tests/browser_cdp_transport.py`, `tests/language_paren_browser.py`,
`tests/language_context_browser.py`, `tests/ask_ai_language_browser.py`,
`tests/local_translator_warmup_browser.py`, and the new `tests/tts_double_voice_browser.py`
(7/7 checks: `speak()` never fires synchronously with `cancel()`; fires exactly once after the
delay with the right text; a second call before the delay elapses results in exactly ONE `speak()`
for the LAST request for both `speakText`/`speakInLang`; a fast double-`stepSentence()` speaks
only the sentence actually landed on, once; no app errors) — all PASS.
Production: verified `https://ai-ebook-reader.pages.dev/`'s served HTML has the exact new
content-hashes (`tts.js?v=2b9871dfb6d2`, `main.js?v=4c80c4049370`);
`tests/tts_double_voice_browser.py` re-run directly against production (`READER_TTS_URL`) —
all 7 checks PASS, confirming the fix itself is live.

**Not verifiable from this sandbox**: whether this actually fixes the AUDIBLE doubling on the
user's real tablet/browser. This environment has no real audio device and mocks
`speechSynthesis` entirely (it's natively read-only — `Object.defineProperty` was needed even to
install the mock) — it can verify the call-sequencing/no-overlap LOGIC but not real sound. The
user should manually confirm: listen to TTS in French (and ideally at least one other language)
via the page-reading "▶ Read" button (prev/next sentence buttons too, since that's one of the
fixed call sites) and the tooltip word/translation speaker icons, and report whether the doubling
is gone. If it persists, the next step would be to capture the browser/OS/voice engine involved
(e.g. `speechSynthesis.getVoices()` output on their tablet) since the remaining candidate would be
an OS/engine-level duplicate-voice registration rather than an app-logic race.

An untracked draft `tests/language_tts_browser.py`, and untracked scratch files `test.js`,
`debug_pdf.mjs`, `dups.txt`, `test_pdf.html`, `test_pdf.mjs`, `viewer.css`, still exist (not
mine, not committed, not wired into CI) — left untouched per "don't overwrite another agent's
uncommitted work" / standard git-hygiene scratch-file exclusions.

Exact next action: none — wait for the user's confirmation (or continued repro) of the TTS
double-voice fix on their real device, and for the offline-translation manual confirmation from
the previous task (still outstanding — see PR #72/#73's history in this file's git log).

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
