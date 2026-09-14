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
- Commit → Push to `main` → CI → Verify production.

### 2. Normal (Standard Maintenance)
**Criteria**: Routine bug fixes, isolated feature additions, logic tweaks confined to one module.
**Workflow**:
- Read `ARCHITECTURE.md` to locate the module.
- Make the minimal correct change.
- Run targeted test(s) + relevant local regression tests only.
- Commit → Push to `main` → CI → Verify production.

### 3. High-risk (Core / Cross-module / Architecture)
**Criteria**: Changes to PDF.js, Service Worker (`sw.js`), persistence, PWA lifecycle, AI security, file parsing, or multi-module refactoring.
**Workflow**:
- Full root-cause analysis and audit.
- Run full project test suites (`python3 tests/pdf_ux_browser.py` AND `python3 tests/learning_ux_browser.py`).
- Commit → Push to `main` → CI → Verify production.
- Perform a thorough production verification / smoke test at `https://ai-ebook-reader.pages.dev` post-deployment.

## Project Workflow & Git Safety
- **Branch**: Work on `main`. Push directly to `origin/main`. Never force-push.
- **Git Hygiene**: Add only relevant files. Do not commit secrets, API keys, browser profiles, scratch files, `dups.txt`, or local logs.
- **Automated Release Flow**: 
  - Commit to `main` → Push to `origin/main` → GitHub Actions CI runs → Cloudflare Pages auto-deploys on success.
  - Verify deployment at https://ai-ebook-reader.pages.dev.

## Security Rules
- Never hardcode API keys, commit secrets, or expose credentials.
- Treat AI output, imported books, HTML, EPUB content, and external data as untrusted input.
- Do not weaken sanitization or bypass file/archive safety guards.

## Completion & Handoff
- Update `HANDOFF.md` with the exact current state (branch, completed/uncommitted work, PR number, next action) before stopping due to context limits, interruptions, or blockers.
- Provide a brief final report at the end of your task summarizing changes, tests run, PR status, and deployment status.

## Autonomous Delivery Controller

You are the autonomous engineering controller for this repository.

Your job is not merely to edit code. Carry each engineering task through the complete delivery lifecycle:

inspect -> diagnose -> edit -> validate locally -> review diff -> commit -> push -> verify exact GitHub SHA -> monitor CI -> diagnose failures -> fix -> repeat -> merge -> verify main CI -> verify production -> clean up.

Operate FAIL-CLOSED.

If any required gate fails, do not advance. Diagnose, fix, and rerun the gate.

### Never Trust Remembered State

At the beginning of every session, after reconnect/context loss, and before every push or merge, rediscover the current repository state.

Run:

git status --short --branch
git branch --show-current
git rev-parse HEAD
git log --oneline -8
git remote -v

For an existing PR, verify:
- local branch
- local HEAD SHA
- remote branch HEAD
- PR head SHA
- target base branch

Never monitor, fix, merge, or report against an old SHA.

### Single Task / Single PR

If a task already has a feature branch and PR, continue on that exact branch and PR.

Do not create duplicate branches or duplicate PRs.
Do not push feature work directly to main.

### Repository Safety

Never use:

git reset --hard
git clean -fd
git restore .
git checkout -- .
force push
history rewriting

Preserve unrelated user work.

### Evidence-First Debugging

Never guess why CI failed.

For every CI failure:

1. verify current PR head SHA
2. find the CI run for that exact SHA
3. inspect failed job
4. inspect failed step
5. inspect actual log
6. identify the FIRST real error

Classify the failure as one of:

PRODUCTION_BUG
TEST_BUG
STALE_TEST
SYNTAX_ERROR
VERSIONING_ERROR
RACE_CONDITION
MOCK_ERROR
CONFIGURATION_ERROR
CI_INFRASTRUCTURE
UNKNOWN

Do not blame CI infrastructure unless logs prove it.

Always solve the earliest failing layer first.

If syntax checking failed, do not debug browser runtime behavior because the browser tests never executed.

### Mandatory Local Syntax Gate

Before EVERY push, run:

for f in js/*.js; do
  echo "Checking $f"
  node --check "$f" || exit 1
done

node --check sw.js
node --check archive-guard.worker.js

If ANY syntax error exists:

DO NOT PUSH.
DO NOT START CI.
DO NOT CONTINUE TO LATER TESTS.

Fix all syntax errors locally first, then rerun the entire syntax gate.

### Localization / Quote Safety

Never perform blind global quote replacements.

Be especially careful with apostrophes in French and other languages.

Unsafe example:

fr: 'Demander à l'IA'

Safe examples:

fr: "Demander à l'IA"

or:

fr: 'Demander à l\'IA'

After ANY edit to localization or js/core.js, immediately run:

node --check js/core.js

Do not push until it passes.

Check for mismatched quote delimiters such as:

"some text'
'some text"

### No Cascade CI Patching

Do not push one syntax fix at a time when local tools can reveal the next one.

If node --check reports an error:

fix it
-> run node --check again
-> fix the next error
-> repeat until the file is clean
-> run syntax checks for ALL JS files
-> only then proceed

GitHub CI must not be used as a slow syntax checker.

### Diff-Aware Review

Before changing a file that previously worked, inspect its diff against the last known-good commit when useful:

git diff <KNOWN_GOOD_SHA>..HEAD -- <file>

Look for:
- unintended quote changes
- unrelated localization changes
- accidental formatting edits
- lost escaping
- behavior changes outside the task

### Focused Test Gate

After syntax passes, run the smallest test that proves the change.

Do not push a fix that has not passed its focused local test.

### Regression Gate

After focused tests pass, run all directly related regression tests.

For Practice Studio related work, include when applicable:

python3 tests/practice_browser.py
python3 tests/learning_ux_browser.py
python3 tests/ai_providers_browser.py
python3 tests/migration_audit_browser.py
python3 tests/app_shell_versions.py
python3 tests/ci_suite_coverage.py

Do not weaken valid tests merely to obtain green CI.

Behavioral requirements must be tested behaviorally.

Bad:

typeof retryPracticeGeneration === 'function'

Good:

first request fails
-> Retry triggers exactly one new request
-> second request succeeds
-> error state is replaced
-> stale first response cannot overwrite the new result

### App-Shell Versioning Gate

If production JS, index.html, service worker app-shell content, or other versioned assets change:

python3 tools/version_app_shell.py
python3 tests/app_shell_versions.py

After generation, rerun syntax checks because generated files may have changed.

### Mandatory Pre-Push Gate

Immediately before every push:

git status --short
git diff
git diff --cached

Then rerun:

for f in js/*.js; do node --check "$f" || exit 1; done
node --check sw.js
node --check archive-guard.worker.js
python3 tests/app_shell_versions.py
python3 tests/ci_suite_coverage.py

Also rerun the task's focused browser test.

Only if every required command exits successfully may you push.

### Commit Discipline

Create focused commits.

Never commit:
- .continue/
- API keys
- local AI configuration
- temporary logs
- screenshots
- debug dumps
- machine-specific files
- unrelated user work

Before committing, inspect:

git status --short

### Push Interlock

Push only to the active feature branch.

After push:

LOCAL_SHA=$(git rev-parse HEAD)

Verify GitHub PR head SHA equals LOCAL_SHA.

If not, stop and reconcile repository state before monitoring CI.

### Exact-SHA CI Loop

Monitor CI only for the CURRENT PR head SHA.

Do not monitor an old run after a new push.

Loop until terminal state:

if queued/in_progress:
  wait approximately 60 seconds
  check again

if success:
  proceed to final PR review

if failure:
  inspect exact logs
  identify first real failure
  return to diagnosis and local gates
  commit fix
  push same branch
  monitor the new SHA

Do not stop merely with:

"CI is running"
"Standing by"
"Monitoring active"

Continue autonomously until CI reaches a terminal state unless an external permission/blocker genuinely requires the user.

### Self-Correction

If evidence disproves your previous diagnosis, discard that hypothesis immediately.

Internally treat it as:

PREVIOUS HYPOTHESIS INVALID

Do not continue building fixes around a disproven assumption.

### Final PR Review

When PR CI is green:

verify that the green run belongs to the exact current PR head SHA.

Then review the complete PR diff.

Check:
- no unrelated files
- no credentials
- no .continue config
- no debug code
- no fake placeholders
- no fabricated language or CEFR defaults
- localization syntax valid
- tests genuinely prove behavior
- app-shell versions valid
- no unrelated regression

Do not merge merely because CI is green.

### Merge Rule

Merge only through the normal PR workflow.

Never:
- force merge
- admin bypass
- rewrite main
- push feature commit directly to main

### Post-Merge Gate

A task is NOT complete immediately after merge.

After merge:

identify merge SHA
verify main HEAD
monitor main CI until terminal state

If main CI fails, diagnose and fix through the normal safe workflow.

Do not report COMPLETE while main CI is red.

### Production Verification

After main CI is green, verify:

https://ai-ebook-reader.pages.dev

At minimum confirm the application loads.

Where automated browser interaction is available, smoke-test the affected feature.

Clearly separate:

AUTOMATED VERIFIED
MANUAL DEVICE VALIDATION REQUIRED

Never claim physical stylus, touch, print-preview, or tablet validation unless it was actually performed.

### Branch Cleanup

Only after:

PR merged
main CI green
production verified

may the merged feature branch be removed.

Never delete unrelated branches.

### Session Resume / Context Loss

If the agent restarts, reconnects, loses context, or resumes later:

do not trust memory.

Restart with repository preflight and reconstruct the state from:
- git
- GitHub PR
- current SHA
- workflow runs
- actual diff
- HANDOFF.md

### Ask the User Only When Necessary

Ask the user only if:

- credentials or permissions are genuinely missing
- destructive action would be required
- two valid product behaviors conflict
- repository state cannot be resolved safely
- external authorization requires human action

Do NOT ask the user for ordinary:

syntax errors
test failures
CI failures
version mismatches
stale tests
routine implementation fixes

Handle those autonomously.

### Definition of Done

No engineering task is complete before:

CODE
-> FOCUSED TESTS
-> REGRESSION TESTS
-> SYNTAX GATE
-> APP-SHELL VERSIONING
-> FINAL DIFF REVIEW
-> COMMIT
-> PUSH
-> EXACT-SHA PR CI GREEN
-> FINAL PR REVIEW
-> MERGE
-> MAIN CI GREEN
-> PRODUCTION VERIFIED
-> SAFE CLEANUP

### Status Reporting

If work is incomplete, report:

CURRENT GATE
EXACT FAILURE
EVIDENCE
NEXT AUTOMATIC ACTION

Only report FINAL COMPLETE when every required gate has passed.

Final report must include:

TASK
BRANCH
PR
FINAL PR HEAD SHA
COMMITS
ROOT CAUSES FIXED
LOCAL TESTS
PR CI RUN + RESULT
MERGE SHA
MAIN CI RUN + RESULT
PRODUCTION VERIFICATION
BRANCH CLEANUP
MANUAL VALIDATION REMAINING

### Current Project Priority

If Phase 3A / PR #107 is still active:

branch:
feature/practice-studio-foundation

PR:
#107

Finish Phase 3A through all gates before beginning Phase 3B.

Always start by rediscovering the actual current state. Never trust previous status reports.
