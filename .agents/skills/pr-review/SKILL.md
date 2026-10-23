---
name: pr-review
description: Review a pull request diff against AGENTS.md rules (risks, regressions, security, localization quotes, app-shell versioning, missing tests).
---

# /pr-review — Pull Request Compliance Review

Read-only workflow. Do NOT edit, commit, or modify any project files.

## Procedure
1. Fetch PR details and diff:
   ```bash
   gh pr view <PR#> --json number,title,headRefName,headRefOid,baseRefName,changedFiles
   gh pr diff <PR#>
   ```
2. Audit diff against `AGENTS.md` rules:
   - **Risk Level**: Classify as Small, Normal, or High-Risk based on touched modules.
   - **Git Hygiene**: Ensure no secrets, API keys, local settings, `.continue/`, or scratch logs are committed.
   - **Security**: Check for unescaped user inputs, HTML injection, weakened archive-guard checks.
   - **Localization & Syntax**: Inspect quotes/apostrophes in French or multilingual strings (check for mismatched delimiters).
   - **App-Shell Versioning**: If production JS or HTML changed, verify that `tools/version_app_shell.py` was run.
   - **Test Coverage**: Check if focused and regression tests prove behavior without weakening existing assertions.
3. Mark observed lines/diff items as `CONFIRMED` and risk assessments as `INFERRED`.
4. Output verdict: `APPROVE`, `REQUEST_CHANGES`, or `COMMENT`.
5. Save output to `~/handoff/agy/<date>-pr-review.md`.
