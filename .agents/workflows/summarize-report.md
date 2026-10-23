# /summarize-report — Agent Report Compression & Verification

Read-only workflow. Do NOT edit, commit, or modify any project files.

## Procedure
1. Receive or read an agent's completion report.
2. Verify actual git and GitHub state:
   - Check if claimed commit SHA exists: `git rev-parse --verify <sha>`
   - Check if claimed PR exists and matches head SHA: `gh pr view <pr#> --json headRefOid,state`
   - Check if claimed CI run actually passed: `gh run list --commit <sha> --limit 1`
   - Check if claimed tests actually ran (or are merely asserted without logs).
3. Identify:
   - Branch name & verified Head SHA
   - PR number & status
   - CI status and exact URL
   - Cloudflare deployment status
   - Tests actually run with recorded results
   - Incomplete items (NOT done)
   - Unverified claims (mark explicitly as `UNVERIFIED`)
4. Output format: strictly <= 20 lines.
5. Save result to `~/handoff/agy/<date>-summarize-report.md`.
