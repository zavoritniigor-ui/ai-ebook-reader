# AI Ebook Reader — Autonomous Migration Controller

Purpose:
Run the complete modularization plan automatically from the current migration state to completion, without requiring the user to remember or manually request the next step.

Before doing anything:

1. Read `CLAUDE.md`.
2. Read `AGENTS.md`.
3. Read `MODULARIZATION_PLAN.md`.
4. Read `MIGRATION_STATUS.md`.
5. Inspect Git:
   - `git branch --show-current`
   - `git status -sb`

The migration controller must always use `MIGRATION_STATUS.md` as the source of truth for progress.

## Core rule

Find the first migration step that is marked `PENDING` or `IN PROGRESS`.

Execute only that step.

Do not skip steps.

Do not start a later step until the current step has been fully completed, tested, merged, deployed, verified, and recorded in `MIGRATION_STATUS.md`.

After successfully completing a step, automatically continue to the next one.

Do not wait for the user to say “continue”.

## Per-step workflow

For every migration step:

1. Read the exact instructions for that step in `MODULARIZATION_PLAN.md`.
2. Mark the step `IN PROGRESS` in `MIGRATION_STATUS.md`.
3. Make only the changes required for that step.
4. Do not perform unrelated refactoring.
5. Preserve existing application behavior.
6. Run the relevant targeted tests.
7. Run required regression tests:
   - `python3 tests/pdf_ux_browser.py`
   - `python3 tests/learning_ux_browser.py`
8. If any required test fails:
   - do not commit;
   - do not push;
   - do not move to the next step;
   - identify the root cause;
   - fix it;
   - rerun tests until green.
9. When local tests are green:
   - commit on `dev`;
   - push to `origin/dev`;
   - create or update a PR from `dev` to `main`;
   - wait for GitHub Actions;
   - inspect CI logs if CI fails;
   - fix failures in `dev`;
   - push again;
   - repeat until CI is green.
10. When all required checks are green:
   - use auto-merge;
   - wait for the PR to merge into `main`.
11. Verify the production deployment at:
   - `https://ai-ebook-reader.pages.dev`
12. Perform a smoke test of the functionality affected by the current migration step.
13. If production is correct:
   - mark the step `DONE` in `MIGRATION_STATUS.md`;
   - record the PR number;
   - record the successful commit hash;
   - record CI result;
   - record production deployment result;
   - set `Next step` to the next pending step.
14. Continue automatically to the next step.

## Progress safety

Never rely on conversation memory to determine progress.

Always derive the current migration position from:

- `MIGRATION_STATUS.md`
- Git history
- PR state
- GitHub CI state

If the agent restarts, reconnects, or the computer/session is interrupted, resume by reading these sources and continue from the first incomplete step.

Never redo a step already marked `DONE` unless verification proves that the recorded state is incorrect.

## Git safety

- Work only in `dev`.
- Never push directly to `main`.
- Never force-push.
- Never rewrite Git history without explicit user approval.
- Do not use `git add .` when unrelated untracked files exist.
- Stage only files related to the current migration step.
- Do not commit temporary/debug files.

## Stop conditions

Stop and ask the user only if:

- a destructive action is required;
- a secret or credential is required;
- force-push/reset/history rewrite is required;
- security policy must be weakened;
- production architecture must materially change;
- tests conflict with the requested product behavior;
- there are multiple solutions with materially different product consequences;
- an external service or permission issue blocks safe progress.

Normal bugs, test failures, merge conflicts, or CI failures are not reasons to stop if they can be resolved safely.

## Completion condition

The migration is complete only when:

- Step 0 through Step 19 are all marked `DONE`;
- all required tests are green;
- all relevant PRs are merged;
- production is updated;
- final smoke tests pass;
- `ARCHITECTURE.md` exists and matches the real modular structure.

Only then provide the final migration report.