# AI Ebook Reader — Agent Handoff

This file is the shared handoff state between Claude Code and Codex.

Before starting or resuming work, every agent must read:

- AGENTS.md
- CLAUDE.md if applicable
- AUTONOMOUS_MIGRATION.md
- MODULARIZATION_PLAN.md
- MIGRATION_STATUS.md
- HANDOFF.md

## Current handoff

Active agent: Claude Code
Current step: Step 19 — final ARCHITECTURE.md (documentation only, closes out the migration)
Current branch: dev
Current task status: active

Last completed action: Step 18 — extracted js/main.js (PR #45), the final assembly step:
  consolidated five scattered inline fragments (reader-settings restore/wiring, Learn-mode
  toggle, Ask-panel mic/send wiring, the file-upload format-detection dispatcher, zoom/theme/
  prev-next button wiring, and the startup bootstrap calls that must run last) into one
  <script src="js/main.js">. The real risk was ordering, not cut-and-paste: caught and fixed
  a wrong tag position (right after core.js, matching where the FIRST fragment used to sit)
  before any test ran, by re-deriving that applyI18n() needs js/tts.js/js/navigation.js/
  js/dictation.js already loaded. Final position: right before js/pwa-lifecycle.js's tag,
  exactly where the bootstrap-call fragment already was. Verified extensively: a REAL
  'change' event dispatched on the file-upload input with a real File correctly ran the
  whole format-detection pipeline end to end, live both locally and against production, plus
  all the usual UI-wiring checks. All local suites green including three "cold/hard reload"
  cases that would have caught a bad ordering immediately. **index.html is now a thin shell**
  — markup, styles, 18 ordered `<script src>` tags, plus exactly one still-inline fragment
  (the lang-detect.js voice trigger, staying inline for the Step 1-3 incident-fix reason).
  See MIGRATION_STATUS.md's "Step 18 — main.js: DONE" section for full detail.

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: 03c1af0 on dev (merged to main)
Last PR: #45, merged
Last CI result: green
Last production result: verified live — fresh load zero errors, all 18 js/*.js scripts
  present in correct order, all main.js wiring confirmed correct, a REAL dispatched file-
  upload 'change' event ran the format-detection pipeline end to end, genuine network-level
  offline reload loaded the full app correctly
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read MIGRATION_STATUS.md's "Mechanism correction" section (four
  learned lessons) — still worth reading even for a docs-only step, for context. Also: if this
  session ever needs to touch a js/*.js file again for any reason, run
  `python3 tools/version_app_shell.py` before testing — the versioning scheme requires this or
  `tests/app_shell_versions.py` will fail CI. And: if migration_audit_browser.py fails in CI
  with anything from browser_cdp.py's socket layer (not an assertion), that's a transport bug —
  see MIGRATION_STATUS.md's "CI flake found and fixed during Step 6" before assuming it's a
  flake and just rerunning; if a job instead times out waiting for Chrome's CDP port before any
  test even runs, that's the separate, purely infra "ci-chrome-cdp-startup-flake" — safe to
  rerun once, but treat two-in-a-row on the same PR as worth investigating for real.
Next required action: Step 19 (final ARCHITECTURE.md) — documentation only, no code changes.
  See MIGRATION_STATUS.md's "Step 19 next" section for exactly what it needs to cover (module
  map, the classic-script mechanism, load order, cross-module dependency notes, test coverage
  map, the content-hash versioning mechanism). This is the LAST step of the 19-step
  modularization migration — when it lands, the whole migration is complete.

## Handoff rules

Before an agent stops because of token limits, context limits, session end, external interruption, or any other blocker, it must update this file.

The agent must record:

- current migration step;
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

The next agent must continue from this recorded state and must not repeat completed work unless verification shows the state is wrong.

Never rely only on conversation memory.
Use Git, MIGRATION_STATUS.md, and HANDOFF.md as the source of truth.
