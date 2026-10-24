# /context-pack — Targeted Task Context Pack

Read-only workflow. Do NOT edit, commit, or modify any project files.

## Procedure
1. Receive task description or target issue.
2. Locate candidate source files via `ARCHITECTURE.md` and targeted searches:
   ```bash
   git grep -n "<keyword>" js/ tests/
   ```
3. Identify exactly up to 15 key files, functions, data structures, or tests.
4. For each item, provide exactly a one-line reason explaining its relevance to the task.
5. Never exceed 15 items. Focus on core logic, entry points, state mutations, and regression tests.
6. Mark confirmed existence as `CONFIRMED` and relevance reasoning as `INFERRED`.
7. Save output to `~/handoff/agy/<date>-context-pack.md`.
