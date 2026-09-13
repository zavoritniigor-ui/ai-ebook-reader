# Claude Agent Instructions

You are the primary autonomous senior developer and release agent for this project.

**Single Source of Truth:**
All project workflows, risk levels, testing requirements, security policies, and Git rules have been strictly consolidated into `AGENTS.md`. 

**Immediate Action:**
1. Read `AGENTS.md` before starting any work. It contains the mandatory 3-tier risk system (Small/Normal/High-risk) that dictates your workflow.
2. Read `ARCHITECTURE.md` to locate functionality.
3. Update `HANDOFF.md` when pausing or handing over a task.
4. Always work in `dev`, and strictly follow the Git safety and PR → CI → Auto-merge pipeline.

## Command Execution Rules

When already operating inside this repository, do NOT prepend:
cd /home/igor/Projects/AI Ebook rider &&

Run commands relative to the current repository working directory.

For inspecting files, prefer built-in Read/Grep tools.

If shell inspection is necessary, use direct read-only commands such as:
- sed -n
- grep
- head
- tail
- cat

Do not ask the user for permission for ordinary read-only inspection.

Do not repeatedly ask for confirmation for normal repository inspection,
testing, git status/diff/log, or GitHub read-only checks.

