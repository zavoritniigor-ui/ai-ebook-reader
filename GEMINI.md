# Gemini Agent Instructions

You are an autonomous implementation agent for the AI Ebook Reader project.

## Before Starting Any Work

1. **Read these files first** (in order):
   - AGENTS.md (contains the mandatory 3-tier risk system: Small/Normal/High-risk)
   - ARCHITECTURE.md (maps the codebase)
   - HANDOFF.md (current task state and project history)
   - CLAUDE.md (if applying the same rules as Claude)

2. **Follow the same Git and workflow rules as Claude**:
   - Work only in `dev` branch
   - Never edit or push to `main` directly
   - Create PRs to `main`, wait for CI, enable auto-merge
   - Update HANDOFF.md before stopping due to context limits

## Risk Level Triage

Before executing any task, evaluate its risk level:

### Small (Minimal Risk)
- Typos, CSS tweaks, simple isolated UI changes
- Minimal targeted fix → Run targeted test → Commit → Push to dev → PR → CI → Auto-merge

### Normal (Standard Maintenance)
- Bug fixes, isolated feature additions, logic tweaks in one module
- Read ARCHITECTURE.md → Make change → Run targeted tests + relevant regressions → Commit → Push → PR → CI → Auto-merge

### High-risk (Core / Cross-module / Architecture)
- Changes to PDF.js, Service Worker, persistence, PWA lifecycle, AI security, file parsing, multi-module refactoring
- Full root-cause analysis → Run full test suite → Commit → Push → PR → CI → Auto-merge → Production verification

## Project Workflow

1. **Branch Strategy**: Work only in `dev`. Never push to `main` directly.
2. **Git Hygiene**: Commit only relevant files. No secrets, API keys, debug files.
3. **Testing**: Run targeted tests first; full suite for High-risk changes.
4. **CI/Release**: PR → GitHub Actions CI → Auto-merge when green.
5. **Production**: Cloudflare Pages auto-deploys after main merge.

## Security Rules

- Never hardcode API keys or credentials
- Treat AI output, imported books, HTML, EPUB content as untrusted input
- Do not weaken sanitization or bypass file/archive safety guards

## Task Handoff Format

When pausing due to context limits or interruptions:

Update HANDOFF.md with:
- Current task (one line)
- Current branch
- Completed work
- Uncommitted/unfinished work
- Files modified
- Commit hash (if committed)
- PR number (if applicable)
- CI status
- Production status
- Exact next action

## Gemini-Specific Implementation

### Auto-Allowed Operations (No Authorization Needed)

These operations may be performed automatically to inspect and plan work:

**File Operations:**
- ✅ Read any project file (GEMINI.md, AGENTS.md, HANDOFF.md, source code, tests, config)
- ✅ Write files during development (create/edit .js, .md, .py, .json, etc. in the repository)
- ✅ Create temporary/debug files for testing

**Git Inspection (Read-Only):**
- ✅ `git status` — inspect uncommitted changes
- ✅ `git branch` — show current and available branches
- ✅ `git log` — review commit history
- ✅ `git show` — inspect specific commits
- ✅ `git diff` — review proposed changes
- ✅ `git config` — check configuration

**Testing & Analysis:**
- ✅ Run project test suite (`python3 tests/*_browser.py`)
- ✅ JavaScript syntax checks (`node --check`)
- ✅ File inspection (`grep`, `cat`, `ls`, `find`)

### Authorization-Required Operations (Ask User First)

These operations **MUST** have explicit user approval before execution:

**Git Modification:**
- 🔒 `git add` — stage changes for commit (ask user to review first)
- 🔒 `git commit` — commit changes (requires explicit approval and user-provided message)
- 🔒 `git push` — push to origin (requires explicit approval)
- 🔒 `git branch create` — create new branches (requires explicit approval)

**Destructive Operations (NEVER Without Explicit Authorization):**
- ❌ `git reset --hard` — discard all changes (requires explicit confirmation)
- ❌ `git clean -fd` — remove untracked files (requires explicit confirmation)
- ❌ `git checkout -- .` — discard all changes (requires explicit confirmation)
- ❌ `git restore` — restore files (requires explicit confirmation)
- ❌ `git rebase` — rewrite history (never, unless explicitly authorized)
- ❌ `git push --force` — force-push (never without explicit confirmation)
- ❌ `rm -rf` — delete directories (never without explicit confirmation)

**GitHub Operations (Requires Explicit Authorization):**
- 🔒 `gh pr create` — open pull request (requires user to approve content and title)
- 🔒 `gh pr merge` — merge pull request (requires user confirmation)
- 🔒 `gh run view` — view CI results (use sparingly; review output first)

### Decision Framework

Before running ANY command, ask yourself:

1. **Is it read-only?** If yes (git log, git status, grep, cat) → proceed
2. **Is it test-related?** If yes (python3 tests/) → proceed
3. **Does it modify files?** If yes → ask user for approval
4. **Does it modify git state?** If yes → ask user for approval
5. **Is it destructive?** If yes → ask user for explicit confirmation

### Workflow Example

When given a development task:

```
1. [NO AUTH] Read AGENTS.md, ARCHITECTURE.md, HANDOFF.md
2. [NO AUTH] Inspect current branch, status, recent commits
3. [NO AUTH] Read related source files
4. [NO AUTH] Plan the fix, show diffs
5. [AUTH REQUIRED] Ask user: "Should I stage these changes with 'git add'?"
6. [AUTH REQUIRED] Ask user: "Should I commit with message: '...'"?
7. [AUTH REQUIRED] Ask user: "Should I push to origin/dev?"
8. [AUTH REQUIRED] Ask user: "Should I open a PR to main?"
```

### This Agent Must

- Read and edit real project files (not just suggest code)
- Run tests and review results
- Review git diffs before committing
- Update HANDOFF.md before stopping
- Preserve concurrent-session work; never reset unrelated changes
- Ask for authorization before git modification operations
- Commit with proper attribution: `Co-Authored-By: Gemini <noreply@google.com>`
- For PRs: End with "🤖 Generated with Gemini Code"

### This Agent Must NOT

- Commit or push without explicit user authorization
- Guess configuration keys or file formats
- Modify unrelated files or break existing tests
- Force-push or rewrite history
- Reset git branches without explicit user understanding and approval
- Delete files or directories without explicit confirmation
- Perform destructive operations (git reset, git clean, rm -rf) automatically
- Make unauthorized changes to HANDOFF.md, AGENTS.md, or CLAUDE.md
