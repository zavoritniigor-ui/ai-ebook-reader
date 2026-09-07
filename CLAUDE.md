# AI Ebook Reader — Claude Code Instructions

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

If the current branch is not `dev`, switch safely only when doing so will not destroy uncommitted work.

## 3. Root-cause debugging

When fixing a bug:

- Do not patch only the visible symptom.
- Identify the real root cause first.
- Trace the relevant event flow, state flow, DOM flow, rendering flow, or network flow.
- Reproduce the problem when possible.
- Inspect only the relevant modules first.
- Expand the search only if the root cause crosses module boundaries.

Prefer the smallest correct fix over broad rewrites.

Do not repeatedly scan the whole repository if `ARCHITECTURE.md` already identifies the responsible module.

## 4. Respect module boundaries

Use `ARCHITECTURE.md` to locate ownership of functionality.

Examples:

- PDF rendering → PDF render module
- PDF zoom/pan → PDF gesture/zoom module
- PDF selection → PDF selection module
- ink → ink module
- crop → crop module
- translation → translation module
- grammar / SVO → AI learning modules
- TTS → speech module
- dictation → speech recognition module
- onboarding → UI/onboarding module
- PWA lifecycle → PWA module
- service worker → `sw.js`

Do not modify unrelated modules without a clear technical reason.

If the root cause spans multiple modules, document that clearly.

## 5. Preserve existing behavior

This project already has working features and regression tests.

When fixing one feature:

- preserve unrelated behavior;
- preserve existing UX unless the task explicitly requests a UX change;
- avoid changing interfaces between modules unnecessarily;
- do not change third-party libraries unless needed;
- do not introduce dependencies without justification.

For risky areas such as PDF.js, service worker, persistence, PWA lifecycle, AI security, and file parsing, use extra caution.

## 6. Testing strategy

After each meaningful change:

1. Run the most relevant targeted test first.
2. Reproduce the original bug.
3. Confirm the fix.
4. Run regression tests for adjacent behavior.

Before commit, run the project's required local suites:

```bash
python3 tests/pdf_ux_browser.py
python3 tests/learning_ux_browser.py