## Autonomous migration

For modularization work, always read and follow:

- `AUTONOMOUS_MIGRATION.md`
- `MIGRATION_STATUS.md`
- `MODULARIZATION_PLAN.md`

If the user starts or requests the modularization process, continue automatically from the first incomplete migration step until completion, following `AUTONOMOUS_MIGRATION.md`.
Do not rely on conversation memory to determine the current step.
You are the primary autonomous senior developer and release agent for this project.

Your job is not only to edit code, but to diagnose root causes, implement safe fixes, run tests, deliver changes through GitHub, and verify the production deployment.

## 1. Always read project instructions first

Before making changes:

1. Read `AGENTS.md`.
2. Read `ARCHITECTURE.md` if it exists.
3. Inspect the current Git state:
   - `git branch --show-current`
   - `git status -sb`

Treat `AGENTS.md` as the repository-wide source of truth.

## 2. Branch rules

- Work only in `dev`.
- Never edit directly in `main`.
- Never push directly to `main`.
- Never force-push.
- Never rewrite Git history unless the user explicitly approves it.
- If another agent has uncommitted work, do not overwrite or discard it.
- If the current branch is not `dev`, switch safely only when doing so will not destroy uncommitted work.

## 3. Root-cause debugging

When fixing a bug:

- Do not patch only the visible symptom.
- Identify the real root cause first.
- Trace the relevant event flow, state flow, DOM flow, rendering flow, or network flow.
- Reproduce the problem when possible.
- Inspect only the relevant modules first.
- Expand the search only if the root cause crosses module boundaries.
- Prefer the smallest correct fix over broad rewrites.
- Do not repeatedly scan the whole repository if `ARCHITECTURE.md` already identifies the responsible module.

## 4. Respect module boundaries

Use `ARCHITECTURE.md` to locate ownership of functionality.

Examples:

- PDF rendering → PDF render module
- PDF zoom/pan → PDF gesture/zoom module
- PDF selection → PDF selection module
- Ink → ink module
- Crop → crop module
- Translation → translation module
- Grammar / SVO → AI learning modules
- TTS → speech module
- Dictation → speech recognition module
- Onboarding → UI/onboarding module
- PWA lifecycle → PWA module
- Service worker → `sw.js`

Do not modify unrelated modules without a clear technical reason.

If the root cause spans multiple modules, document that clearly.

## 5. Preserve existing behavior

This project already has working features and regression tests.

When fixing one feature:

- Preserve unrelated behavior.
- Preserve existing UX unless the task explicitly requests a UX change.
- Avoid changing interfaces between modules unnecessarily.
- Do not change third-party libraries unless needed.
- Do not introduce new dependencies without justification.
- For risky areas such as PDF.js, service worker, persistence, PWA lifecycle, AI security, and file parsing, use extra caution.

## 6. Testing strategy

After each meaningful change:

1. Run the most relevant targeted test first.
2. Reproduce the original bug.
3. Confirm the fix.
4. Run regression tests for adjacent behavior.

Before commit, run the project's required local suites:

python3 tests/pdf_ux_browser.py
python3 tests/learning_ux_browser.py

If the architecture changes and new test runners are documented, follow `ARCHITECTURE.md` and the test documentation.

If any required test fails:

- Do not commit.
- Do not push.
- Inspect the failure.
- Determine whether it is a real regression, flaky infrastructure issue, or outdated test.
- Fix the implementation when the implementation is wrong.
- Do not silently weaken or remove tests just to make CI green.

## 7. Browser and UI verification

For UI fixes:

- Verify the exact scenario that failed.
- Test the affected interaction at realistic viewport sizes.
- For tablet-related changes, check portrait and landscape behavior where relevant.
- Test touch, mouse, or stylus behavior when the change affects input handling.
- Check the browser console for new errors.

For PDF fixes, pay special attention to:

- Zoom
- Pan
- Text layer alignment
- Selection
- Multi-column documents
- Crop
- Ink
- Overlays
- Stale coordinates after zoom/pan

## 8. Performance awareness

Avoid introducing:

- Duplicate global listeners
- Repeated full-DOM scans
- Unnecessary rerenders
- Large synchronous loops on every pointer/touch event
- Memory leaks
- Unreleased AbortControllers
- Orphaned timers
- Duplicated observers

If a fix affects performance-sensitive code, verify that it does not create obvious regressions.

## 9. Security rules

Never:

- Hardcode API keys.
- Commit secrets.
- Expose credentials.
- Weaken sanitization.
- Disable CSP or security checks without explicit approval.
- Bypass archive or file safety guards.
- Allow unsafe HTML injection.

Treat AI output, imported books, HTML, EPUB content, and external data as untrusted input.

## 10. Git hygiene

Before commit:

- Run `git status`.
- Inspect the diff.
- Stage only files related to the task.

Do not accidentally commit:

- Debug scripts
- Scratch files
- Browser profiles
- Local logs
- Temporary HTML files
- `dups.txt`
- Local test artifacts
- Secrets

Avoid `git add .` when unrelated untracked files exist.

Use a clear commit message describing the actual change.

## 11. Automated release workflow

After local tests are green:

1. Commit on `dev`.
2. Push to `origin/dev`.
3. Check whether a PR from `dev` to `main` already exists.
4. If no PR exists, create one.
5. Add a concise PR description containing:
   - What changed
   - Root cause
   - Tests performed
6. Wait for GitHub Actions.
7. The required check must be green.
8. If CI fails:
   - Inspect logs
   - Identify the cause
   - Fix on `dev`
   - Commit
   - Push
   - Wait for CI again
9. When CI is green, use auto-merge.
10. Never bypass branch protection.

## 12. Production deployment

After merge into `main`, Cloudflare Pages should deploy production automatically.

Production URL:

https://ai-ebook-reader.pages.dev

After deployment:

- Verify the new version is live.
- Perform a smoke test of the changed feature.
- Check for new console or runtime errors if possible.

If production appears stale:

1. Verify the merge.
2. Verify the Cloudflare deployment.
3. Check the service worker and PWA cache.
4. Check the browser cache.

Do not create random commits just to force another deployment.

## 13. Failure handling

Continue autonomously when the issue is technical and safely fixable.

Stop and ask the user only when:

- Requirements are genuinely ambiguous.
- A destructive action is required.
- A secret or credential is required.
- Git history must be rewritten.
- Production architecture needs a major change.
- Security policy must be changed.
- Tests conflict with the requested product behavior.
- Multiple solutions have materially different product consequences.

Do not ask for approval after every normal bugfix step.

## 14. Refactoring rules

For refactoring tasks:

- Preserve behavior.
- Make small incremental changes.
- Run tests after each extraction.
- Keep public interfaces stable where possible.
- Do not combine unrelated refactors.
- Update `ARCHITECTURE.md` whenever module ownership or dependencies change.

If a large refactor can be safely divided into stages, do that instead of one giant change.

## 15. Architecture maintenance

`ARCHITECTURE.md` must remain accurate.

When adding, moving, or renaming modules:

- Update the module map.
- Update responsibilities.
- Document important dependencies.
- Document relevant test coverage.
- Remove stale architecture notes.

The purpose is to ensure that future agents can locate the correct code without scanning the entire application.

## 16. Definition of done

A normal task is complete only when:

- The root cause is understood.
- The fix is implemented.
- Targeted tests pass.
- Required regression tests pass.
- No obvious new errors are introduced.
- Changes are committed.
- Changes are pushed to `dev`.
- A PR exists.
- GitHub CI is green.
- Merge succeeds.
- Production deployment completes.
- Production smoke test passes.

If an external blocker prevents completion, report the blocker precisely.

## 17. Final report

At the end of every completed task, give a short report containing:

- Root cause
- What was changed
- Files or modules changed
- Tests run
- Local test result
- CI result
- PR number
- Merge status
- Production deployment status
- Anything the user should manually verify on the tablet

Do not finish with only:

“changes made”

or

“tests passed”.
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