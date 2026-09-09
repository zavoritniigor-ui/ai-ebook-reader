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

Task: user asked to remove the Google Classroom integration COMPLETELY — the entire feature
built and iterated on across PRs #60/#62/#64/#66/#68 (see those PRs' descriptions and older
entries in this file's git history for what the feature used to be; none of it applies
anymore). Done in full: `js/google-classroom.js` and `tests/google_classroom_browser.py`
deleted; the "🎓 Classroom" toolbar button, the `accounts.google.com/gsi/client` script tag
(used only for Classroom sign-in — no other Google integration in this app needs Google
Identity Services), the module's own `<script>` tag, the `#classroom-modal` markup, and every
`.classroom-*`/`.modal-content.wide` CSS rule removed from `index.html`; the `classroom`
overlay layer removed from `js/pwa-lifecycle.js`'s `OVERLAY_LAYERS`/`closeTopOverlay`/
`MutationObserver` watch list; every `classroom*`/`btnClassroom`/`tClassroom` i18n string
removed from `js/core.js`; the `google-classroom.js` `APP_SHELL` entry removed from `sw.js`;
the Classroom test step removed from `.github/workflows/ci.yml`; `ARCHITECTURE.md`'s module
map row, test-coverage row, load-order entry and its explanatory paragraph all removed, module/
script count reverted 19→18; `tests/migration_audit_browser.py`'s hardcoded script-order
assertion updated to drop it.

**Kept, deliberately**: `js/main.js`'s `openBookFile(file)` — it predates being "the thing
Classroom also called" and is still the manual `<input type=file>` handler's own
implementation; only its comment (which explained sharing it with Classroom) was reworded, no
behavior change. Also kept untouched: the Gemini/Google AI Studio key field and its
`aistudio.google.com` link in the settings modal, and Gemini as an AI provider in
`ai-client.js` — unrelated Google functionality, per explicit instruction not to remove it.

**Merge conflict note**: another agent had continued Classroom-specific work on `main` (PR #68,
a real Drive-404 fix widening the scope to `drive.readonly`) concurrently with — and merged
just before — this removal's own PR was opened. This produced modify/delete conflicts on
`js/google-classroom.js`/`tests/google_classroom_browser.py` and text conflicts on
`ARCHITECTURE.md`/`index.html`/`sw.js` during the usual pre-PR `git merge --no-ff origin/main`
reconnect step. Resolved by keeping the full-removal side for every hunk (never resurrecting
the deleted files or any Classroom content), then re-running
`python3 tools/version_app_shell.py` on the merged tree to get the authoritative hash — same
principle as any other merge conflict, just make sure "which side wins" matches the actual
intent (removal) rather than mechanically preferring HEAD or origin.

Release code commit: 68911ea (removal) + 27438aa (reconnect merge, with conflict resolution)
on dev; PR #69 MERGED (squash); main release commit b1e2ad2.
CI: required `test` check PASS on both parallel runs, no flake.
Local: full suite PASS — `tests/pdf_ux_browser.py`, `tests/learning_ux_browser.py`,
`tests/migration_audit_browser.py`, `tests/app_shell_versions.py`,
`tests/browser_cdp_transport.py`, `tests/language_paren_browser.py`,
`tests/language_context_browser.py`, `tests/ask_ai_language_browser.py` — confirming every
remaining Reader feature (PDF, EPUB, DOCX, TXT/MD, FB2, HTML, RTF, TTS, translation, AI,
annotations, PWA/offline, Android-Back overlay stack) is unaffected.
Production: verified `https://ai-ebook-reader.pages.dev/`'s served HTML contains **zero**
matches for "classroom" or "accounts.google.com" (`grep` exit 1); the 18 `<script src="js/...">`
tags present are exactly the non-Classroom set; live in-browser checks confirm
`#btn-classroom`/`#classroom-modal` don't exist, `openClassroomModal`/`GOOGLE_CLIENT_ID` are
`undefined`, no GIS script tag loads, and `openBookFile`/`initPdf`/`startTTS`/`aiText` are all
still real functions; `pdf_ux_browser.py`/`learning_ux_browser.py`/`migration_audit_browser.py`
re-run directly against production — all PASS, no console errors.

An untracked draft `tests/language_tts_browser.py`, and untracked scratch files `test.js`,
`debug_pdf.mjs`, `dups.txt`, `test_pdf.html`, `test_pdf.mjs`, `viewer.css`, still exist (not
mine, not committed, not wired into CI) — left untouched per "don't overwrite another agent's
uncommitted work" / standard git-hygiene scratch-file exclusions.

Exact next action: none related to Classroom — that feature and everything about it is gone.
Wait for the user's next actual request.

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
