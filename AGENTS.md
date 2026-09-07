# AI Ebook Reader — Agent Rules
## Autonomous migration

For modularization work, always read and follow:

- `AUTONOMOUS_MIGRATION.md`
- `MIGRATION_STATUS.md`
- `MODULARIZATION_PLAN.md`

Determine the current migration step from `MIGRATION_STATUS.md`, not from conversation memory.

If modularization has been started, continue automatically from the first incomplete step until completion, following `AUTONOMOUS_MIGRATION.md`.

Do not skip completed steps and do not repeat steps already marked `DONE` unless verification proves the recorded status is wrong.
## Project workflow

- Work only in the `dev` branch.
- Never edit directly in `main`.
- Never push directly to `main`.
- Never use force-push.
- Before starting work, run:
  - `git branch --show-current`
  - `git status -sb`
- If there are uncommitted changes from another agent, do not overwrite them.

## Project structure

- Before editing code, read `ARCHITECTURE.md` if it exists.
- Work only in the module related to the task whenever possible.
- Do not scan or refactor unrelated modules without a clear reason.
- Do not perform large refactors unless explicitly requested.

## Testing

After every meaningful change:

1. Run relevant local tests.
2. Before commit, run:
   - `python3 tests/pdf_ux_browser.py`
   - `python3 tests/learning_ux_browser.py`
3. If any test fails:
   - do not commit;
   - do not push;
   - investigate;
   - fix;
   - rerun tests.
4. Do not bypass failing tests.

## Git hygiene

Before commit:

- Run `git status`.
- Add only files relevant to the task.
- Do not add temporary/debug files unless they are intentionally part of the project.
- Do not add secrets, API keys, browser profiles, scratch files, `dups.txt`, temporary test files, or local logs.

Use clear commit messages describing the actual change.

## Automated release flow

After local tests are green:

1. Commit changes in `dev`.
2. Push to `origin/dev`.
3. Check whether an open PR from `dev` to `main` already exists.
4. If no PR exists, create one.
5. Wait for GitHub Actions required check `test`.
6. If CI fails:
   - inspect logs;
   - fix in `dev`;
   - commit;
   - push;
   - wait for CI again.
7. When CI is green, enable or use auto-merge.
8. Do not bypass branch protection.
9. After merge to `main`, Cloudflare Pages will deploy production automatically.
10. Verify production at:
   - `https://ai-ebook-reader.pages.dev`

## Production verification

After deployment:

- Perform a smoke test of the feature that was changed.
- If the site appears stale, first check:
  - Cloudflare deploy status;
  - service worker;
  - PWA cache;
  - browser cache.
- Do not redeploy blindly.

## When to stop and ask the user

Stop and ask only when:

- requirements are ambiguous;
- a destructive action is required;
- Git history rewrite/reset is needed;
- secrets or credentials are required;
- security policy must change;
- production architecture must change;
- multiple implementation choices have materially different consequences;
- tests conflict with the requested behavior.

For normal bugfixes and UI/UX changes, continue through the full workflow without asking for confirmation at every step.

## Completion criteria

A task is complete only when:

- the code change is implemented;
- local tests are green;
- changes are committed;
- pushed to `dev`;
- PR exists;
- GitHub CI is green;
- merge to `main` succeeds;
- production is updated;
- production smoke test passes.

Do not stop at “code changed successfully”.

## Final report

At the end, report briefly:

- what was changed;
- which files/modules were changed;
- which local tests passed;
- GitHub CI status;
- PR number;
- merge status;
- production deployment status;
- what the user should verify manually on the tablet.
## Agent handoff

Before starting or resuming work, always read `HANDOFF.md`.

Before stopping because of token limits, context limits, session end, interruption, or blocker, update `HANDOFF.md` with the exact current state.

Record:
- current step;
- current branch;
- completed work;
- unfinished work;
- modified files;
- commit hash;
- PR number;
- CI status;
- production status;
- exact next action.

Do not rely on conversation memory when resuming work.
Use `HANDOFF.md`, `MIGRATION_STATUS.md`, and Git state as the source of truth.