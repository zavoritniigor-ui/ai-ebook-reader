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
Current step: Step 11 — pdf-zoom-pan.js (starting now)
Current branch: dev
Current task status: active

Last completed action: Step 10 — extracted js/formats.js (PR #29): runArchiveGuard,
  initEpub/loadEpubChapter, initRichDoc/splitIntoChapters/renderDocChapter, fb2ToHtml,
  rtfToHtml, initTxt/renderTxtPage — one fully contiguous block. Also completed the buildToc
  fold-in flagged by Step 9's deviation note: appended to js/navigation.js (no new tag),
  since it's format-agnostic and shared by all three loaders (openFooterMenu/closeFooterMenu/
  enterMobileFullScreenIfNeeded, the other three functions that same plan entry named, are
  still left for Step 15 — they're genuinely tangled with ui-tooltip.js material, see
  MIGRATION_STATUS.md's deviation section). All local suites green. Production verified:
  fresh load zero errors, all 10 js/*.js scripts in correct order including formats.js, every
  extracted function present as a real global, and a real synthetic TXT file loaded end to end
  through initTxt() live against production (correct pagination and TOC), genuine
  network-level offline reload working.

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: 0a6c1b7 on dev (merged to main)
Last PR: #29, merged
Last CI result: green
Last production result: verified live — fresh load zero errors, all 10 js/*.js scripts present
  in correct order, every formats.js function present as a global, a real TXT file loaded
  end to end via initTxt(), genuine network-level offline reload loaded the full app correctly
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read MIGRATION_STATUS.md's "Mechanism correction" section (four
  learned lessons) before extracting. Also: after changing any js/*.js file, run
  `python3 tools/version_app_shell.py` before testing — the versioning scheme requires this or
  `tests/app_shell_versions.py` will fail CI. And: if migration_audit_browser.py fails in CI
  with anything from browser_cdp.py's socket layer (not an assertion), that's a transport bug —
  see MIGRATION_STATUS.md's "CI flake found and fixed during Step 6" before assuming it's a
  flake and just rerunning.
Next required action: Step 11 (pdf-zoom-pan.js: rerenderPdfAtCurrentZoom, rememberPdfFocus,
  pdfBaseScale, pdfAnchor, restorePdfAnchor, layoutPdfZoom, applyPdfZoom, persistPdfZoom,
  setPdfScale, cancelPdfRender, cancelPdfInteraction, pinchMetrics, paintPdfGesture,
  endPdfPointer, the pdfPointers Map/pointer/wheel listeners, the pdfBlockClick capture-phase
  click listener, and the #pdf-fit onchange handler — all confirmed 100% pdf-zoom-pan.js
  content back in Step 4's recon). Re-grep fresh line numbers first. See MIGRATION_STATUS.md's
  "Step 11 next" section.

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
