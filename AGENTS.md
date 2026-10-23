# AI Ebook Reader — Agent Rules

## 1. Mode & Map
The 19-step modularization migration is **COMPLETE**. Repository is in **NORMAL MAINTENANCE MODE**.
- `ARCHITECTURE.md` is the primary map of the codebase.
- `HANDOFF.md` tracks active state between agents/sessions (historical entries archived in `docs/archive/`).
- Do NOT use archived migration plans unless explicitly instructed.

## 2. Agent Roles
- **Antigravity**: High-volume reading, triage, context packs, second review, digests, documentation, and Small-risk tasks.
- **Claude Code / Codex / Copilot**: Normal and High-risk tasks (PDF.js, `sw.js`, persistence, AI security, cross-module logic).
- **Advisory Reports**: Any agent's report is advisory; commit SHA, CI, and production deployment claims must be independently verified.
- **Worktree Isolation**: One task = one branch = one worktree = one agent. Never touch another active agent's working tree.

## 3. Triage & Risk Tiers
Evaluate risk level before executing to prevent small changes from triggering oversized audits:
1. **Small (Minimal Risk)**: Typos, CSS tweaks, isolated UI/copy fixes.
   - Minimal change -> targeted test -> short-lived branch -> PR to `main` -> CI green -> merge -> verify production.
2. **Normal (Standard Maintenance)**: Routine bug fixes, isolated feature additions, single-module logic.
   - Consult `ARCHITECTURE.md` -> minimal correct change -> targeted + relevant local regression tests -> PR -> CI green -> merge -> verify production.
3. **High-Risk (Core / Cross-Module / Architecture)**: PDF.js, Service Worker (`sw.js`), persistence, PWA lifecycle, AI security, file parsing.
   - Full root-cause audit -> full test suites (`python3 tools/run_tests.py tests/pdf_ux_browser.py tests/learning_ux_browser.py`) -> PR -> CI green -> merge -> verify main CI & production smoke-test (`https://ai-ebook-reader.pages.dev`).

## 4. Repository & Git Safety
- **Branch Protection**: `main` is protected (PR + required `test` check). Work only on short-lived feature branches. Never push feature commits directly to `main`.
- **Forbidden Commands**: Never run `git reset --hard`, `git clean -fd`, `git restore .`, `git checkout -- .`, `git push --force` (`-f`), `git branch -D`, `git stash drop`, or history rewrites. Preserve unrelated user/agent work.
- **Git Hygiene**: Never commit secrets, API keys, browser profiles, scratch files, `dups.txt`, or local logs. Un-ignored: `.vscode/settings.json` only.

## 5. Security Rules
- Never hardcode API keys, commit secrets, or expose credentials.
- Treat AI outputs, imported books (EPUB, PDF, FB2, DOCX), HTML, and external inputs as untrusted data.
- Do not weaken sanitization (`safeHtml`, `archive-guard.worker.js`) or bypass safety guards.

## 6. Autonomous Delivery Lifecycle
Agents operate FAIL-CLOSED: if any required gate fails, do not advance. Diagnose, fix, and rerun.
1. **Preflight**: Rediscover current state (`git status --short --branch`, `git rev-parse HEAD`, `git log --oneline -8`). Never trust remembered state.
2. **Local Syntax & Versioning**: Run local syntax and app-shell gates before push.
3. **Pre-Push Gate**:
   ```bash
   for f in js/*.js; do node --check "$f" || exit 1; done
   node --check sw.js && node --check archive-guard.worker.js
   python3 tests/app_shell_versions.py && python3 tests/ci_suite_coverage.py
   python3 tools/run_tests.py <focused_test.py>
   ```
4. **Push & PR CI**: Push only to active feature branch. Monitor exact PR head SHA with `tools/ci_wait.sh <branch|sha>` until green.
5. **Merge & Post-Merge**: Merge via standard PR merge. Monitor main CI run (`tools/ci_wait.sh main`), verify production (`https://ai-ebook-reader.pages.dev`), and clean up merged branch.
- Detailed procedures: [Delivery Lifecycle](docs/agents/delivery_lifecycle.md), [Debugging](docs/agents/debugging_procedures.md), [Syntax & Quotes](docs/agents/syntax_and_quotes.md), [Testing & Versioning](docs/agents/testing_and_versioning.md).

## 7. Testing & Verification Commands
- `python3 tools/run_tests.py <test1.py> [test2.py ...]`: Standard local test runner (prints one PASS/FAIL line + 40-line error tail; starts ephemeral test server/Chrome if needed).
- `tools/ci_wait.sh <branch|sha>`: Monitors GitHub Actions CI run to completion; prints failed jobs + step error tails on failure.
- `python3 tools/version_app_shell.py`: Updates app-shell versions after editing JS, HTML, or service worker assets.

## 8. Handoff & Status Reporting
- Update `HANDOFF.md` before stopping: replace your own section with current state (branch, uncommitted work, PR #, next action); never append historical dumps.
- Report only confirmed facts with file path, line number, or CI log URL; mark interpretations as INFERRED.
- Definition of Done: `CODE -> FOCUSED TESTS -> REGRESSION TESTS -> SYNTAX GATE -> APP-SHELL VERSIONING -> FINAL DIFF REVIEW -> COMMIT -> PUSH -> EXACT-SHA PR CI GREEN -> FINAL PR REVIEW -> MERGE -> MAIN CI GREEN -> PRODUCTION VERIFIED -> SAFE CLEANUP`.
