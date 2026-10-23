# Autonomous Delivery Lifecycle & Repository Gates

Reference documentation moved from root `AGENTS.md`.

## 1. Autonomous Engineering Controller
Carry each engineering task through the complete delivery lifecycle:
`inspect -> diagnose -> edit -> validate locally -> review diff -> commit -> push -> verify exact GitHub SHA -> monitor CI -> diagnose failures -> fix -> repeat -> merge -> verify main CI -> verify production -> clean up`.

Operate FAIL-CLOSED. If any required gate fails, do not advance. Diagnose, fix, and rerun the gate.

## 2. Preflight State Rediscovery (Never Trust Memory)
At the beginning of every session, after reconnect/context loss, and before push/merge:
```bash
git status --short --branch
git branch --show-current
git rev-parse HEAD
git log --oneline -8
git remote -v
```
For an existing PR, verify: local branch, local HEAD SHA, remote branch HEAD, PR head SHA, and target base branch. Never monitor, fix, merge, or report against an old SHA.

## 3. Single Task / Single PR
- If a task already has a feature branch and PR, continue on that exact branch and PR.
- Do not create duplicate branches or duplicate PRs.
- Do not push feature work directly to main.
- One task = one branch = one worktree = one agent.

## 4. Mandatory Pre-Push Gate
Immediately before every push:
```bash
git status --short
git diff
git diff --cached
for f in js/*.js; do node --check "$f" || exit 1; done
node --check sw.js
node --check archive-guard.worker.js
python3 tests/app_shell_versions.py
python3 tests/ci_suite_coverage.py
```
Also rerun the task's focused test (e.g. via `python3 tools/run_tests.py <test>`). Only if every command exits with 0 may you push.

## 5. Commit Discipline & Push Interlock
- Push only to the active feature branch.
- Never commit: `.continue/`, `.vscode/` (except tracked `settings.json`), API keys, local AI configs, temporary logs, screenshots, debug dumps, machine-specific files, or unrelated user work.
- After push, verify:
```bash
LOCAL_SHA=$(git rev-parse HEAD)
```
Ensure GitHub PR head SHA equals `LOCAL_SHA`.

## 6. Exact-SHA CI Loop
Monitor CI only for the CURRENT PR head SHA using `tools/ci_wait.sh <branch|sha>` or `gh run view`.
Loop until terminal state:
- If success: proceed to final PR review.
- If failure: inspect exact logs, identify first real failure, fix locally, commit, push same branch, and monitor new SHA.

## 7. Final PR Review & Merge Rules
When PR CI is green for the exact PR head SHA:
- Verify diff: no unrelated files, no credentials, no debug code, valid localization syntax, valid app-shell versions, no regressions.
- Merge only through normal PR workflow (`gh pr merge <PR#> --squash` or `--merge`). Never force-merge or push directly to main.

## 8. Post-Merge Gate & Production Verification
A task is NOT complete immediately after merge:
1. Identify merge SHA and verify main HEAD.
2. Monitor main CI run until terminal state (`tools/ci_wait.sh main`).
3. Verify production at `https://ai-ebook-reader.pages.dev`: confirm the app loads and smoke-test affected feature.
4. Clearly distinguish `AUTOMATED VERIFIED` from `MANUAL DEVICE VALIDATION REQUIRED`.
5. Remove merged feature branch only after main CI is green and production verified.

## 9. Definition of Done
`CODE -> FOCUSED TESTS -> REGRESSION TESTS -> SYNTAX GATE -> APP-SHELL VERSIONING -> FINAL DIFF REVIEW -> COMMIT -> PUSH -> EXACT-SHA PR CI GREEN -> FINAL PR REVIEW -> MERGE -> MAIN CI GREEN -> PRODUCTION VERIFIED -> SAFE CLEANUP`.
