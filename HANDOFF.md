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

Status: **release in progress**. Branch: `dev`.

Task: User approved the supplied format-expansion plan (`go`); implementing its
first maintenance increment. See `FORMAT_SUPPORT.md` for exact capabilities,
limitations and remaining increments.

Completed: FB2 raster binaries/all bodies/XML encoding; guarded FB2.ZIP; pinned
local Marked + sanitization + offline precache; EPUB path resolution and safe SVG
rasterization/cover images; image/font-aware pagination; character-offset bookmarks
and reflow; word selection across inline formatting. Added synthetic format suite
to CI and architecture/support documentation.

Concurrent-session incident: the other session committed partial format changes
into 9cab25d (PR #78) but omitted the new Marked vendor files and overwrote the word
index. Those changes are repaired here. The user confirmed the other session is
stopped. Its whitespace-tap/translation-dismissal fix is retained. Auto-merge on
#78 was temporarily disabled until this complete file set passes CI.

Local validation: full pdf_ux_browser.py, learning_ux_browser.py,
migration_audit_browser.py and pdf_sentence_reselect_browser.py passed. The final
formats_browser.py (20 checks), app_shell_versions.py and browser_cdp_transport.py
passed. One isolated Chrome cold-start timed out; retry passed. Node is not in the
local PATH; CI performs the JavaScript syntax checks.

Pending commit: .github/workflows/ci.yml, ARCHITECTURE.md, FORMAT_SUPPORT.md,
HANDOFF.md, index.html, js/formats.js, js/main.js, js/navigation.js, js/selection.js,
sw.js, tests/formats_browser.py, vendor/marked-18.0.12.umd.js,
vendor/marked-LICENSE.md. Earlier format implementation is already in 9cab25d.
Unrelated untracked scratch files and tests/language_tts_browser.py are untouched.

PR: #78 open; final patch not pushed yet. CI/deployment: pending final patch.
Next action: commit the relevant files, push dev, rewrite PR #78 for the combined
change, wait for CI, enable auto-merge, verify the production deployment with the
format fixtures plus PDF/offline smoke checks.

Still open separately: the reported scanned-PDF text-layer offset/misread word
needs the actual affected file or a reproducible fixture. Do not claim it is fixed.

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
