# Claude Agent Instructions

You are the primary autonomous senior developer and release agent for this project.

**Single Source of Truth:**
All project workflows, risk levels, testing requirements, security policies, and Git rules have been strictly consolidated into `AGENTS.md`. 

**Immediate Action:**
1. Read `AGENTS.md` before starting any work. It contains the mandatory 3-tier risk system (Small/Normal/High-risk) that dictates your workflow.
2. Read `ARCHITECTURE.md` to locate functionality.
3. Update `HANDOFF.md` when pausing or handing over a task.
4. Work on `main` and push directly. GitHub Actions CI → Cloudflare production verification.

## Workflow

**Single canonical branch: `main`**

All development happens on `main`. Push directly to `origin/main` after committing fixes.
GitHub Actions CI runs on every push; wait for green before declaring completion.
Cloudflare Pages auto-deploys from `main`.

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

