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
Current step: Step 7 — translation.js (starting now)
Current branch: dev
Current task status: active

Last completed action: Step 6 — extracted js/tts.js (PR #21). Along the way, PR #21's CI hit
  the same MemoryError in tests/browser_cdp.py that a docs-only PR #20 had already hit once —
  failed twice in a row on PR #21, so root-caused it instead of rerunning blind: the hand-rolled
  WebSocket reader didn't handle fragmented frames or ping/pong control frames, which desynced
  the byte stream under CI's Network.* event traffic. Fixed tests/browser_cdp.py
  (_read_message()/_send_frame(), reassemble by FIN bit), verified 4x locally, pushed to the
  same PR, CI went green. See MIGRATION_STATUS.md's "CI flake found and fixed during Step 6"
  section for full detail. Production verified: fresh load zero errors, all 6 js/*.js scripts
  in correct order including tts.js, every extracted TTS function present as a real global,
  startTTS() exercised live end to end, SW active+controlling, genuine network-level offline
  reload working.

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: 86e6aa2 on dev (merged to main as 5660e7e)
Last PR: #21, merged
Last CI result: green (after a genuine test-infra fix, not a lucky rerun — see above)
Last production result: verified live — fresh load zero errors, all 6 js/*.js scripts present
  in correct order, every TTS function present as a global, startTTS() exercised live, SW
  active+controlling, genuine network-level offline reload loaded the full app correctly
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read MIGRATION_STATUS.md's "Mechanism correction" section (four
  learned lessons) before extracting. Also: after changing any js/*.js file, run
  `python3 tools/version_app_shell.py` before testing — the versioning scheme requires this or
  `tests/app_shell_versions.py` will fail CI. And: if migration_audit_browser.py fails in CI
  with anything from browser_cdp.py's socket layer (not an assertion), that's a transport bug —
  see MIGRATION_STATUS.md's "CI flake found and fixed during Step 6" before assuming it's a
  flake and just rerunning.
Next required action: Step 7 (translation.js). Re-grep fresh line numbers first — everything
  shifts after every prior step's edits. See MIGRATION_STATUS.md's "Step 7 next" section.

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
