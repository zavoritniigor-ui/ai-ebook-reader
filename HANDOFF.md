# AI Ebook Reader — Handoff

> Short on purpose: who works on what **now**, and what waits for the owner. Notes about finished work belong in the
> commit message and the PR, not here. History: `docs/archive/HANDOFF-history-2026-11-14.md` (and the older
> `docs/archive/HANDOFF-history-2026-10-23.md`).

## Claims
Read before your first edit; add your row; remove it after your merge ([how](docs/agents/coordination.md)).

| Agent | Branch | Files / area | State | Since |
| --- | --- | --- | --- | --- |
| Claude Code, cloud session «Порівняння функцій конкурентів» | `ccr-a7aab2dd-fip6w9` | XSS review: `tests/hostile_book_browser.py`, `tests/ci_browser_suites.txt`, `ARCHITECTURE.md` | PR open | 2026-11-14 |
| Claude Code on the owner's computer | — | «Analects» OCR highlight offset (`js/pdf-render.js`); waits for the owner's PDF file | not started | 2026-10-31 |

New browser suites go into `tests/ci_browser_suites.txt` (one line), not into `ci.yml`.

## Waiting for the owner
- **On-device AI** (Gemma, PR #278): check on the Android tablet (WebGPU, 6–8 GB RAM); 📋 `deviceAi` shows GPU and speed.
- **Book narration on the tablet**: re-import the rebuilt narration files; if only the system voice plays, send the 📋 report (`bookSpeech` trace).
- **«Analects» highlight offset**: send the PDF to the agent on the computer.
- **Scanner with many photos** (PRs #362–#364): confirm on the phone; a failed photo now names the reason.

## Release
Production: `https://ai-ebook-reader.pages.dev` — check `main` CI is green before closing a task.
