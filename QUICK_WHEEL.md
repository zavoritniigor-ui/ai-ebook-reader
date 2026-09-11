# Quick wheel implementation and review

The existing full menu is `#app-header` / `#header-controls`. Its old
`#menu-handle` listener in `ui-tooltip.js` toggled `immersive-mode`. The new
native button opens the wheel on tap and calls `openFullMenu()` after a 520 ms
hold. Full menu markup and action handlers are preserved. Shift+Enter or the
wheel's central Full menu button provides a discoverable non-hold alternative.

## Existing action map

| Header control | Existing handler / owner |
| --- | --- |
| Contents (`toggle-toc-desktop`) | `openToc`, core.js |
| Open (`file-upload` label/input) | input change → `handleFile`, main.js / formats.js |
| Read / pause / resume (`btn-tts`) | `ttsBtn.onclick`, tts.js |
| Stop (`btn-tts-stop`) | TTS stop binding, tts.js |
| Two voices (`btn-alt-voices`) | alternate-voice binding, tts.js |
| Voice (`voice-select`) | `voiceSelect.onchange`, main.js / core.js voice helpers |
| Study (`btn-translate-mode`) | `translateBtn.onclick`, main.js |
| Translation language (`target-lang`) | `targetLang.onchange`, main.js |
| Statistics (`reading-stats-button`) | click listener / `updateReadingStatsNow`, learning-stats.js |
| Ink (`btn-ink`) | click handler, pdf-ink.js |
| Region (`btn-region`) | click handler, pdf-crop.js |
| Zoom out / in | click handlers, main.js → PDF zoom or text repagination |
| PDF fit (`pdf-fit`) | change handler, pdf-zoom-pan.js |
| Theme (`theme-select`) | change handler, main.js |
| Interface language (`ui-lang`) | change handler / `applyI18n`, main.js / core.js |
| AI keys | inline `openKeySettings()`, ui-tooltip.js |
| Installed-app exit (`btn-exit-app`) | inline `exitApp()`, pwa-lifecycle.js |

Footer chapter/page navigation, TTS transport, contextual translation/AI panels,
PDF tools, and key/voice settings remain accessible through their existing UI.
The wheel selects Open, Read, Study, Statistics, Theme, and Contents: direct
reading/navigation tasks that already have standalone controls. Contextual AI
requires a selected word, so it remains in the existing selection popup. Theme
reveals and focuses the existing chooser, preserving its options and settings
handler. Statistics reveals the header before opening its anchored popover.
Disabled original controls also disable their wheel proxies.

## Layout and interaction

The existing responsive breakpoints are 640px (phone), 641–1180px (tablet), and
above 1180px (desktop). The wheel instead sizes to the visual viewport, capped
at 320px, with margins and a safe-area-aware fixed launcher. It remains a body
sibling of the reader so pointer capture/touch-action never changes PDF or text
gesture handlers. Existing layers: sidebar 9999, header/footer 10000, launcher
10120, wheel 10110, stats 10200, TTS 10600, mobile panels 20000, PDF/settings
30000+, update notification 50000.

Opening the wheel hides the header without changing its layout or immersive
state. Only UI surfaces are dismissed; selection, translation state, speech,
book data and PDF state are not reset. Navigation signals and lifecycle events
close stale wheel UI. The existing overlay-history mechanism includes the wheel
for Android Back, with no separate history stack.

Six positions are spaced by π/3. Dragging integrates wrapped atan2 deltas;
release projects recent angular velocity by 70ms, caps momentum below half a
position, and rounds to a discrete step. CSS transitions settle the positions;
there is no animation-frame loop. A seven-pixel movement threshold separates
item taps from drags. Optional 6ms vibration marks position crossings. Reduced
motion disables inertia, transitions and entrance animation.

Native buttons provide Enter/Space activation, labels and focus rings. Arrow
keys, Home and End focus/rotate items; Tab cycles actions, Full menu and launcher.
Escape closes and restores focus. Labels use the application's eight languages.

## Validation

`tests/quick_wheel_browser.py` is explicitly wired into CI, alongside the existing
browser suites. It uses real CDP pointer/key input, intercepts original controls
to verify proxy routing, checks selection/UI state, viewport bounds and stable
listener/DOM counts. `tests/migration_audit_browser.py` recognizes the additional
classic module. Offline app-shell entries and content hashes include the module.

Physical-device checks still needed: iOS/Android long-press feel, stylus input,
vibration strength/support, notched safe areas and installed-PWA browser bars.

## Review results

All 23 browser suites passed (22 existing suites plus the wheel suite), including
PDF rendering/selection/pan/zoom, learning/TTS, resize/immersive, formats and PWA.
The complete Python CI checks, Node 20 syntax checks and `git diff --check` passed.
The PDF suite now explicitly opens/closes the wheel and verifies PDF state before
its existing gesture tests. Final wheel tests also cover real touch rotation,
press movement/cancellation, keyboard activation after dragging, Android Back,
and the full-menu keyboard shortcut. Phone dark and compact-landscape light
screenshots were visually reviewed. No commit, push, PR or deployment was made.

Changed files: `index.html`, `js/quick-wheel.js`, `js/ui-tooltip.js`,
`js/pwa-lifecycle.js`, `sw.js`, `tests/quick_wheel_browser.py`,
`tests/pdf_ux_browser.py`, `tests/migration_audit_browser.py`,
`.github/workflows/ci.yml`, `ARCHITECTURE.md`, and this document.
