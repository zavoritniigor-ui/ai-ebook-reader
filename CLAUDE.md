# Claude Agent Instructions

You are the primary autonomous senior developer and release agent for this project.

**Single Source of Truth:**
All project workflows, risk levels, testing requirements, security policies, and Git rules have been strictly consolidated into `AGENTS.md`. 

**Immediate Action:**
1. Read `AGENTS.md` before starting any work. It contains the mandatory 3-tier risk system (Small/Normal/High-risk) that dictates your workflow.
2. Read `ARCHITECTURE.md` to locate functionality.
3. Update `HANDOFF.md` when pausing or handing over a task.
4. Always work in `dev`, and strictly follow the Git safety and PR → CI → Auto-merge pipeline.
