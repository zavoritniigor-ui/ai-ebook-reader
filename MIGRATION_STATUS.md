# AI Ebook Reader — Migration Status

Current phase: Modularization

Step 0 — Prepare mutable state containers: DONE
Step 1 — core.js: IN PROGRESS
Step 2 — lang-detect.js: PENDING
Step 3 — ai-client.js: PENDING
Step 4 — selection.js: PENDING
Step 5 — pdf-render.js: PENDING
Step 6 — tts.js: PENDING
Step 7 — translation.js: PENDING
Step 8 — grammar-svo.js: PENDING
Step 9 — navigation.js: PENDING
Step 10 — formats.js: PENDING
Step 11 — pdf-zoom-pan.js: PENDING
Step 12 — pdf-ink.js: PENDING
Step 13 — pdf-crop.js: PENDING
Step 14 — dictation.js: PENDING
Step 15 — ui-tooltip.js: PENDING
Step 16 — onboarding.js: PENDING
Step 17 — pwa-lifecycle.js: PENDING
Step 18 — main.js + remove old inline code: PENDING
Step 19 — final ARCHITECTURE.md: PENDING

Last successful step: Step 0 — Prepare mutable state containers
Last successful PR: #4 (https://github.com/zavoritniigor-ui/ai-ebook-reader/pull/4)
Last successful commit: 5a85de7 (merged to main as f933e65)
Last CI result: green (pull_request-triggered run passed on first attempt; a duplicate push-triggered
  run flaked on the pre-existing "center focal anchor stable" pinch-zoom tolerance check — confirmed
  as CI infra flakiness, not a regression, by rerunning the identical commit to a clean pass)
Last production deploy: verified live at https://ai-ebook-reader.pages.dev/ — readerEpoch/pdfTasks
  present in served HTML, smoke test confirmed typeof initPdf/renderPdfPage still 'function',
  readerEpoch/pdfTasks have the expected shape, zero console errors on load

Next step: Step 1 — core.js
