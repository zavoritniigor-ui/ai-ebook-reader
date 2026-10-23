# Evidence-First Debugging & Review Procedures

Reference documentation moved from root `AGENTS.md`.

## 1. Evidence-First Debugging
Never guess why CI or tests failed. For every failure:
1. Verify current PR head SHA.
2. Find the CI run for that exact SHA.
3. Inspect failed job, step, and actual log (`tools/ci_wait.sh` or `gh run view --log-failed`).
4. Identify the FIRST real error.

Classify the failure as one of:
- `PRODUCTION_BUG`
- `TEST_BUG`
- `STALE_TEST`
- `SYNTAX_ERROR`
- `VERSIONING_ERROR`
- `RACE_CONDITION`
- `MOCK_ERROR`
- `CONFIGURATION_ERROR`
- `CI_INFRASTRUCTURE`
- `UNKNOWN`

Do not blame CI infrastructure unless logs prove it. Always solve the earliest failing layer first.

## 2. No Cascade CI Patching
Do not push one syntax fix at a time when local tools can reveal the next one:
`node --check` error -> fix it -> re-check -> fix next -> repeat until file is clean -> run syntax checks on ALL JS files -> only then proceed. GitHub CI must not be used as a slow syntax checker.

## 3. Diff-Aware Review
Before modifying a file that previously worked, inspect its diff against the last known-good commit:
```bash
git diff <KNOWN_GOOD_SHA>..HEAD -- <file>
```
Look for unintended quote changes, unrelated localization edits, accidental formatting, lost escaping, or behavior changes outside the task.

## 4. Self-Correction
If evidence disproves a previous diagnosis, discard that hypothesis immediately (`PREVIOUS HYPOTHESIS INVALID`). Do not build fixes around disproven assumptions.
