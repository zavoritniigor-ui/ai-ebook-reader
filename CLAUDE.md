# Claude Agent Instructions

All project workflows, risk levels, testing requirements, security policies, and Git rules are strictly consolidated in `AGENTS.md`.

## Immediate Action
1. Read `AGENTS.md` before starting any work. It defines the 3-tier risk system (Small/Normal/High-Risk), forbidden git commands, and the delivery lifecycle.
2. Read `ARCHITECTURE.md` to locate modules and code ownership.
3. Read `HANDOFF.md` **only when resuming an ongoing task** or handing off unfinished work. Do not assume historical notes are your active task.
4. `main` is protected: always work on a short-lived feature branch, open a PR to `main`, wait for green CI, and merge through standard PR workflow.
5. Never touch another active agent's worktree.
