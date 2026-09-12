# Quick Wheel redesign — awaiting physical acceptance

PR #98 stays Draft on `feature/bottom-quick-menu`. The previous physical
acceptance failed. This redesign is not approved for merge or production.

## Render and interaction model

Eleven persistent buttons each retain their own real action and handler. A floating
`wheelPosition` determines wrapped index distance, angle, transform, scale, opacity,
visibility and stacking on every animation frame. No recycled closures, empty slots,
or fixed six-button viewport remain. Generic button transform transitions are
explicitly disabled so CSS cannot lag behind the frame renderer.

Vertical pointer movement works from a button or the space around the arc. After a
6px threshold, pointer capture preserves the drag outside the panel. One action is
66px of vertical input. Release retains recent velocity, capped at 0.025 actions/ms;
requestAnimationFrame integrates motion with exponential decay (190ms time constant),
then eases to the nearest detent (65ms time constant, 0.001-action rest tolerance).
Each crossed detent emits one 18ms Web Audio tick. No interval drives animation.

Open/close use a 220ms cubic ease-out fan/collapse, with up to 18ms of item staggering.
The launcher remains fixed. Reduced motion removes entrance/exit motion and inertia.
A backdrop blocks reader interaction and ignores backdrop taps. Launcher, actions,
Escape and the existing Android Back overlay stack close the wheel. Full Menu has
its own position. Arrow keys rotate; Tab cycles visible enabled actions and controls.

## Actions

| Label | Existing destination |
| --- | --- |
| Open | `file-upload` |
| Read | `btn-tts` |
| Study | `btn-translate-mode` |
| Statistics | `reading-stats-button` |
| Theme | opens Full Menu and focuses `theme-select` |
| Contents | `toggle-toc-desktop` |
| Print | `printCurrentReaderPage()` → browser print API |
| Draw | `btn-ink` |
| Region | `btn-region` |
| Alt Voices | `btn-alt-voices` |
| Language Level | `btn-lang-level` |

Source disabled states are respected. Print requires a loaded book. PDF printing uses
`getViewport({scale:1})` to calculate valid, bounded print canvas dimensions.

## Geometry

The dock uses visualViewport height/offset, targeting 76% with a 100px bottom guard.
The launcher center is 80px plus safe-area inset from the right edge, leaving room
for the PDF scrubber. Full Menu is 68px above it. The action arc has radius 220px
and 0.30 radians (17.19°) per detent. Five actions are visible normally; three on
viewports below 540px high. The visible arc window spans 85.94° or 51.57° respectively;
settled first-to-last item centers span 68.75° or 34.38°. Center scale is 1.0,
adjacent scale 0.9, outer scale 0.8 (five-item mode).

Measured launcher centers: 76.00% on 320×568, 390×844, 768×1024, 1024×768 and
1280×800; 74.36% on 844×390 because of the bottom guard. Each viewport is checked in
light and dark themes against actual PDF, Ask AI, Grammar and footer geometry.

## Behavioral evidence

`tests/quick_wheel_browser.py` replaces internal-offset/source-existence assertions
with rendered geometry and real CDP mouse/touch/keyboard input:

- A detent changes visible labels; Print appears after two detents from initial open.
- All eleven distinct actions become visible over a full revolution.
- Visible taps route to all existing controls; real text and PDF print functions reach
  the browser print API (intercepted so automated tests do not open OS dialogs).
- Drag moves at least three action rectangles; an observed four-item sample moved
  vertically by −30.14, −30.87, −32.42 and −34.57px and horizontally along the arc.
- Rectangles continue moving after pointerup, eventually stop and snap to active scale 1.
- Pairwise action, label, Full Menu, launcher and reader-control collision checks run
  at rest and during fractional drag positions across the viewport matrix.
- Open/close transforms are sampled on the browser animation clock.
- Modal backdrop, Escape, Android Back, Full Menu sync and reduced motion are checked.

Validation is still running. Final automated results and preview details will be
recorded here after the checks finish. Real Android print UI, thumb comfort, ticking,
and animation feel require the user's physical preview review.
