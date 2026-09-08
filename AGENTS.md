# AI Ebook Reader — Agent Rules

## Mode check (read this first, before anything else)

The 19-step modularization migration (Steps 0–19) is **COMPLETE** — check `MIGRATION_STATUS.md`
to confirm (it says `MIGRATION STATUS: COMPLETE` at the top). The repository is now in
**NORMAL MAINTENANCE MODE**:

- Do **not** read or execute `AUTONOMOUS_MIGRATION.md`. It gates itself on the same
  `MIGRATION_STATUS.md` check, but do not even open it for migration purposes while that file
  says COMPLETE.
- Do **not** resume, restart, or re-run any migration step, and do not treat a request like
  "continue the migration" or "start the next step" as a live instruction — there is no next
  step. Tell the user the migration is already complete and point them at
  `MIGRATION_STATUS.md`'s "Migration complete" section instead.
- `MIGRATION_STATUS.md` and `MODULARIZATION_PLAN.md` are now **historical records**, kept for
  audit purposes — do not edit them except to correct a factual error in the historical
  account, and never treat them as a live task list.
- `ARCHITECTURE.md` is the **primary, actively maintained map of the codebase**. Use it for
  every normal task from here on (see "Normal task workflow" below).
- `HANDOFF.md` remains in active use — but now for handing off ordinary unfinished tasks
  between agents/sessions, not migration steps.

Only re-engage `AUTONOMOUS_MIGRATION.md`/`MODULARIZATION_PLAN.md` if the user explicitly and
deliberately asks to reopen modularization work with a clear, specific reason (e.g. splitting
an oversized module further) — and even then, confirm that intent before acting, since it
reverses an explicit, documented "this is done" state.

## Normal task workflow (maintenance mode)

For any regular bugfix, feature request, or change:

1. Read `ARCHITECTURE.md` to find the module responsible for the affected functionality.
2. Make the minimal correct change in that module (see "Project structure" below).
3. Run the targeted test(s) for the change, then the required regression suites (see
   "Testing" below).
4. Commit on `dev` → push → open/update a PR to `main` → wait for CI → auto-merge → verify
   production (see "Automated release flow" and "Production verification" below).

The rest of this file's sections (project workflow, project structure, testing, git hygiene,
release flow, production verification, when to stop, completion criteria, final report, agent
handoff) describe this same workflow in full detail and still apply exactly as written.
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

- Before editing code, read `ARCHITECTURE.md` — the primary map of the codebase.
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