# Book format support

This is the first implementation increment of the format-expansion plan, not a
claim of universal format or layout fidelity. Books are processed on the device;
there is no server conversion or OCR in this release.

| Format | Supported here | Remaining limitations |
| --- | --- | --- |
| PDF | Existing PDF.js pages, images, text-layer selection, zoom, ink | Scans need an existing text layer; OCR and the reported file-specific scanned-PDF offset remain open |
| EPUB | Spine chapters, archive-relative raster images, SVG-wrapped covers, a safe rasterized SVG shape/text subset | Publisher stylesheets/fonts, full SVG, real navigation-document TOC, cross-chapter footnotes and fixed-layout presentation remain follow-up work |
| FB2 / FB2.ZIP | Text, inline emphasis, raster binary illustrations, all bodies including notes, XML-declared encodings | ZIP must contain exactly one FB2; full FictionBook layout and cross-chapter note navigation remain follow-up work |
| DOCX | Existing Mammoth semantic HTML and inline images | Not an exact reproduction of Word pages |
| TXT | Plain text and existing block navigation | UTF-8 text; no attached assets |
| Markdown (.md / .markdown) | Marked CommonMark/GFM HTML, headings, lists, code, tables, emphasis; output passes through safeHtml | Local image bundles are not imported; raw HTML is restricted by the existing sanitizer |
| HTML / HTM | Existing sanitized HTML | Companion files are not automatically imported |
| RTF | Existing basic text extraction | Not full RTF formatting or image support |

Reflowable content waits for image decoding and browser fonts before initial
pagination, with a three-second fallback for unavailable resources and another
reflow for late image loads. Character offsets supplement old page bookmarks, so
font changes, resize, and reopening can resolve the reading fragment in the new
layout. Image-only pages still fall back to page position.

Word selection now indexes the current text block across inline formatting and
keeps apostrophes, hyphens and combining marks. PDF retains its independent
geometry-aware selection path. Dictionary segmentation for scripts without spaces
and general OCR coordinates remain future work.

EPUB images must resolve inside the guarded archive (or be embedded raster data).
Missing or remote EPUB images are not fetched as accidental application URLs.
SVG is rebuilt from a small shape/text allowlist and rasterized at no more than
2048 pixels per side. Active content, external references and CSS are excluded;
the shared HTML/AI sanitizer has not been loosened.

## Acceptance coverage

`python3 tests/formats_browser.py` generates synthetic, redistributable FB2,
FB2.ZIP, EPUB and Markdown fixtures in memory. It checks decoded images, encoded
paths, declared text encodings, malformed input, ambiguous ZIPs, archive traversal,
HTML/SVG sanitization, words split by tags, repeated taps, combining marks, stale
render guards, font reflow and character-position restoration. CI runs this suite
alongside the existing full PDF, learning and cross-cutting offline/security suites.
Set `READER_TEST_URL` to run the format suite against a deployed app.

The fixtures are regression checks, not a substitute for validation on a licensed
corpus of complex real books or physical Android/iOS devices.

## Dependency

Marked 18.0.12 is vendored from its npm release with the package SHA-512 integrity
verified at import; its MIT license is in `vendor/marked-LICENSE.md`. The pinned
browser bundle is included in the offline app shell. Marked output is always
sanitized before insertion, as required by https://github.com/markedjs/marked.

## Next increments

1. Real EPUB navigation and footnote routing, isolated publisher styles/fonts,
   shared book/resource metadata and local HTML/Markdown bundles.
2. Real-book corpus and broader multilingual word segmentation/large-book tuning.
3. RTF/ODT and verified MOBI/AZW3 conversion adapters, with explicit consent for any
   optional server transfer.
4. Fixed-layout EPUB, DJVU/comics, then cancellable page OCR and caching.
