// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
/* reader-workspace.js — geometry of the reading area between the side panels, shared by the PDF layout
 * (js/pdf-continuous.js) and the word popup (js/ui-tooltip.js); and the «workspace changed» signal.
 * Moved out of pdf-continuous.js unchanged (2026-11-14): it measures panels, not PDF pages, and the popup used it
 * while pdf-continuous.js called the popup back. Now both build on this file and neither calls the other.
 */
// ===================== CENTRAL PDF WORKSPACE GEOMETRY =====================
// Canonical measurement function for the visible central workspace between side surfaces:
// availableLeft  = max(mainArea.left, visible nav.right, visible askPanel.right)
// availableRight = min(mainArea.right, visible grammarPanel.left)   (Practice overlays this gap; see below)
// availableWidth = max(1, availableRight - availableLeft)
// availableHeight = max(1, mainArea.bottom - mainArea.top)
function getReaderWorkspaceRect() {
    const mainEl = els.mainArea || document.getElementById('main-area');
    const mainRect = mainEl ? mainEl.getBoundingClientRect() : {
        left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight,
        width: window.innerWidth, height: window.innerHeight
    };

    let availableLeft = mainRect.left;
    let availableRight = mainRect.right;
    const availableTop = mainRect.top;
    const availableBottom = mainRect.bottom;

    // 1. Left sidebar (nav#sidebar for thumbnails/contents, or #ask-panel)
    const nav = document.getElementById('sidebar');
    if (nav && !nav.classList.contains('collapsed')) {
        const w = nav.offsetWidth || nav.getBoundingClientRect().width;
        if (w > 0) {
            availableLeft = Math.max(availableLeft, mainRect.left + w);
        }
    }
    const ask = document.getElementById('ask-panel');
    if (ask && ask.classList.contains('expanded')) {
        const w = ask.offsetWidth || ask.getBoundingClientRect().width;
        if (w > 0) {
            availableLeft = Math.max(availableLeft, mainRect.left + w);
        }
    }

    // 2. Right panel (#grammar-panel)
    const grammar = document.getElementById('grammar-panel');
    if (grammar && grammar.classList.contains('expanded')) {
        const w = grammar.offsetWidth || grammar.getBoundingClientRect().width;
        if (w > 0) {
            availableRight = Math.min(availableRight, mainRect.right - w);
        }
    }
    // #practice-panel is deliberately NOT a reserve: layoutPracticeWorkspace (practice-worksheet.js)
    // always lays the expanded worksheet OVER this same central gap (start = max(nav, ask),
    // end = innerWidth - Grammar), never beside it. Clamping to its left edge collapsed the book
    // underneath to ~0px — a full relayout of every page at zero width plus a reading anchor taken
    // from that collapsed stack — and its collapsed/bookmark tab must never reserve width either.

    const availableWidth = Math.max(1, availableRight - availableLeft);
    const availableHeight = Math.max(1, availableBottom - availableTop);

    return {
        left: availableLeft,
        right: availableRight,
        top: availableTop,
        bottom: availableBottom,
        width: availableWidth,
        height: availableHeight
    };
}

// The reading area was resized because a side panel opened or closed (js/pdf-continuous.js): whatever is placed
// over the book follows (js/ui-tooltip.js registers the word popup).
const READER_WORKSPACE_CHANGED = [];
function onReaderWorkspaceChanged(listener) { READER_WORKSPACE_CHANGED.push(listener); }
function notifyReaderWorkspaceChanged() { for (const listener of READER_WORKSPACE_CHANGED) listener(); }
