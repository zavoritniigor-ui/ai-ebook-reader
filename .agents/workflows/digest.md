# /digest — Repository Health & Work Status

Read-only workflow. Do NOT edit, commit, or modify any project files.

## Procedure
1. Run preflight checks:
   ```bash
   git fetch origin main
   gh pr list --state open --limit 10
   gh run list --branch main --limit 1 --json databaseId,status,conclusion,url,headSha
   git worktree list
   git status --short
   ```
2. Inspect `HANDOFF.md` for active tasks and stale entries.
3. Check for any dirty working trees across active worktrees.
4. Mark directly observed observations as `CONFIRMED` and subjective evaluations as `INFERRED`.
5. Output format must be strictly <= 20 lines covering:
   - Active work & assigned branches
   - Latest main CI status (URL + conclusion)
   - Open PRs
   - Stale items or blocker warnings
   - Uncommitted-work warnings
6. Save report to `~/handoff/agy/<date>-digest.md`.
