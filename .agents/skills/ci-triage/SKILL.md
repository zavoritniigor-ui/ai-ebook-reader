---
name: ci-triage
description: Triage a failed CI run (identify failing test, classify cause, extract evidence log lines, check if later commits already modified it).
---

# /ci-triage — CI Failure Root-Cause Analysis

Read-only workflow. Do NOT edit, commit, or modify any project files.

## Procedure
1. Given a GitHub Actions run ID `<run_id>`:
   ```bash
   gh run view <run_id> --json status,conclusion,jobs,headSha
   ```
2. Retrieve logs for failed jobs:
   ```bash
   gh run view --job <job_id> --log-failed
   # If empty, fallback to:
   gh api repos/:owner/:repo/actions/jobs/<job_id>/logs
   ```
3. Extract:
   - Failing test name and failure line number
   - Exact traceback or assertion message (quote lines verbatim)
   - Failure classification: `PRODUCTION_BUG`, `TEST_BUG`, `STALE_TEST`, `SYNTAX_ERROR`, `VERSIONING_ERROR`, `RACE_CONDITION`, `MOCK_ERROR`, `CONFIGURATION_ERROR`, `CI_INFRASTRUCTURE`, or `UNKNOWN`.
   - Confidence level (`HIGH`, `MEDIUM`, `LOW`) with rationale.
4. Check if a later commit on `main` or the PR branch has already modified that test or code:
   ```bash
   git log <headSha>..origin/main -- <test_file> <source_file>
   ```
5. Mark observed facts as `CONFIRMED` and analysis as `INFERRED`.
6. Save output to `~/handoff/agy/<date>-ci-triage.md`.
