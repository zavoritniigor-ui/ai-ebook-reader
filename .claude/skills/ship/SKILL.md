---
name: ship
description: Carry a finished change through the delivery lifecycle of AGENTS.md (pre-push gate, app-shell versioning, push, PR, exact-SHA CI, merge, main CI, production check). Use when the owner says to ship, deliver or merge a change.
argument-hint: "[focused test files]"
disable-model-invocation: true
---

# /ship: deliver the current branch

Fail-closed: when a step fails, stop, fix the cause and rerun that step. Never skip one, never weaken a test to pass.
The rules are in `AGENTS.md` sections 3, 6, 8 and 9; this is only the order of commands. Details:
`docs/agents/delivery_lifecycle.md`, `docs/agents/testing_and_versioning.md`, `docs/agents/coordination.md`.

Focused tests for this change: `$ARGUMENTS` (when empty, pick the smallest suites in `tests/` that prove the change).

1. **Preflight.** `git status --short --branch`, `git rev-parse HEAD`, `git log --oneline -8`. You must be on a
   feature branch, never on `main`. Your row must be in the Claims table of `HANDOFF.md`.
2. **Risk tier.** Name it (Small / Normal / High-Risk, `AGENTS.md` section 3). High-Risk adds the full suites:
   `python3 tools/run_tests.py tests/pdf_ux_browser.py tests/learning_ux_browser.py`.
3. **Take in `main`.** `git fetch origin main` and `git merge origin/main`. Keep both intentions on a conflict;
   never revert another agent's merged behaviour.
4. **Version the app shell** when JS, `index.html`, `sw.js` or a versioned asset changed:
   `python3 tools/version_app_shell.py`.
5. **Pre-push gate.** Every command must exit 0:
   ```bash
   for f in js/*.js; do node --check "$f" || exit 1; done
   node --check sw.js && node --check archive-guard.worker.js
   python3 tests/app_shell_versions.py && python3 tests/ci_suite_coverage.py
   python3 tools/run_tests.py <focused tests>
   ```
6. **Final diff review.** `git status --short` and `git diff origin/main...HEAD`: no unrelated files, secrets,
   logs or debug code. Stage files by explicit path and commit.
7. **Push and PR.** `git push -u origin <branch>`; open the PR to `main` with `gh pr create` unless one exists
   (one task = one PR). Check the PR head SHA equals `git rev-parse HEAD`.
8. **PR CI.** `tools/ci_wait.sh <branch>`. On failure read the printed log tail, fix, and go back to step 5.
9. **Merge**, only when the owner asked for a merge and CI is green for the exact head SHA: `gh pr merge <PR#> --squash`.
   Otherwise stop here and report the PR link.
10. **After the merge.** `tools/ci_wait.sh main`, then open `https://ai-ebook-reader.pages.dev` and smoke-test the
    changed feature. Remove your Claims row and the merged branch (`git branch -d`, never `-D`).

Report in the owner's language, short: tier, tests run with PASS/FAIL, PR link, CI result, and what is
`AUTOMATED VERIFIED` versus `MANUAL DEVICE VALIDATION REQUIRED`.
