# AI Ebook Reader — Agent Rules

## Mode Check
The 19-step modularization migration is **COMPLETE**. The repository is in **NORMAL MAINTENANCE MODE**.
- `ARCHITECTURE.md` is the primary map of the codebase.
- `HANDOFF.md` is for handing off unfinished tasks between agents/sessions.
- Do NOT use `MODULARIZATION_PLAN.md` or `AUTONOMOUS_MIGRATION.md` unless explicitly instructed to reopen modularization.

## Triage & Risk Levels
Before executing any task, evaluate its risk level to determine the necessary workflow to prevent small tasks from triggering unnecessary massive audits and full test suites.

### 1. Small (Minimal Risk)
**Criteria**: Typos, CSS tweaks, simple isolated UI changes, safe text/copy updates.
**Workflow**: 
- Minimal targeted fix.
- Run a targeted test (or perform a specific manual check) for that isolated change.
- Commit → Push to `dev` → PR → CI → Auto-merge.

### 2. Normal (Standard Maintenance)
**Criteria**: Routine bug fixes, isolated feature additions, logic tweaks confined to one module.
**Workflow**:
- Read `ARCHITECTURE.md` to locate the module.
- Make the minimal correct change.
- Run targeted test(s) + relevant local regression tests only.
- Commit → Push to `dev` → PR → CI → Auto-merge.

### 3. High-risk (Core / Cross-module / Architecture)
**Criteria**: Changes to PDF.js, Service Worker (`sw.js`), persistence, PWA lifecycle, AI security, file parsing, or multi-module refactoring.
**Workflow**:
- Full root-cause analysis and audit.
- Run full project test suites (`python3 tests/pdf_ux_browser.py` AND `python3 tests/learning_ux_browser.py`).
- Commit → Push to `dev` → PR → CI → Auto-merge.
- Perform a thorough production verification / smoke test at `https://ai-ebook-reader.pages.dev` post-deployment.

## Project Workflow & Git Safety
- **Branch**: Work only in `dev`. Never edit or push directly to `main`. Never force-push.
- **Git Hygiene**: Add only relevant files. Do not commit secrets, API keys, browser profiles, scratch files, `dups.txt`, or local logs.
- **Automated Release Flow**: 
  - Push to `origin/dev` → Create/Update PR to `main` → Wait for GitHub Actions (CI must pass) → Enable/Use Auto-merge.
  - After merge, Cloudflare Pages will automatically deploy production.

## Security Rules
- Never hardcode API keys, commit secrets, or expose credentials.
- Treat AI output, imported books, HTML, EPUB content, and external data as untrusted input.
- Do not weaken sanitization or bypass file/archive safety guards.

## Completion & Handoff
- Update `HANDOFF.md` with the exact current state (branch, completed/uncommitted work, PR number, next action) before stopping due to context limits, interruptions, or blockers.
- Provide a brief final report at the end of your task summarizing changes, tests run, PR status, and deployment status.
