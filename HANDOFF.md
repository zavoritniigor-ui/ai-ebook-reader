# AI Ebook Reader — Current Handoff State (2026-10-23)

> **RULE FOR AGENTS**: Replace your section with the current state when handing off.
> **NEVER append history dumps** to this file. Historical logs through 2026-10-23 are archived
> verbatim in `docs/archive/HANDOFF-history-2026-10-23.md`.

## Active Agent Worktrees & Tasks
- **Antigravity** (Branch: `chore/agent-setup`, worktree `../wt-agent-setup`):
  - Task: Token optimization (compact rules, docs archiving, .vscode search exclusions) and Antigravity workflow definitions.
  - Status: In progress.
- **Claude Code** (Branch: `main` / device LLM follow-ups):
  - Working in main directory on `functions/api/device-llm.js`, `js/device-llm.js`.
  - Isolation rule: Do NOT touch or edit files in the main folder while Claude is active.

## Open Product Tasks Pending Device Verification
1. **On-Device LLM (Gemma 4 E2B via MediaPipe, PR #278 merged)**:
   - Built: 2.0 GB model download in 64 MiB parts, WebGPU inference for offline translation and explanations.
   - Pending owner validation: Owner's Android 12+ tablet (requires WebGPU, ~6–8 GB RAM, 2.1 GB storage).
   - Check GPU and tokens/s in 📋 `deviceAi` diagnostics.
   - Open question: Evaluate lighter model if Gemma 4 E2B is too slow on tablet.
2. **Book Narration & Piste Dialogues (PR #269, #270, #276 merged)**:
   - Built: Aligned sentence audio, exact dragged words playback, 3-column narrow gutter fixes.
   - Pending owner reproduction: Owner reported tablet only played system voice; `bookSpeech` diagnostic trace added to 📋 report to log file imports, piste taps, and codec matching.
   - Awaiting owner's 📋 report from physical tablet.
3. **Exact-Words Drag Highlight & Translation (PR #279 merged)**:
   - Verified on desktop/emulation; awaiting owner touch validation on tablet.

## Open Pull Requests
- PR #266: `docs(handoff): local speech engine...` (`docs/handoff-2026-10-20`)
- PR #254: `feat(sidebar): the Contents drawer closes automatically...` (`feat/sidebar-autoclose`)
- PR #252: `feat(drive): save a library book to Google Drive...` (`feat/google-drive-save`)
- PR #245: `[DRAFT, do not merge] feat(page-translation)` (`feat/page-translation`)

## Release / Verification Target
- Production URL: `https://ai-ebook-reader.pages.dev`
- Main CI: Verify green on `main` before closing tasks.
