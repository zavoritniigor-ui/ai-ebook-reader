# Reader scanner and the optional OCR server

Open **Document scanner**, then choose where to process photos. **On this device**
is the default: it keeps photos local and uses the browser's existing Tesseract
engine. **On the OCR server** is an explicit upload choice. Original selected
photos go through the Reader's same-origin HTTPS proxy to the owner's GPU server
when an export action is pressed. Choosing a mode, adding photos and editing a
frame do not upload anything.

The server mode prepares previews with a maximum 1000-pixel long side. Its
original file, normalized four corners, filter and rotation are uploaded one
page at a time. The server returns the final PDF; the browser does not rebuild
its image or text layer. Selecting pages and changing their order also sets the
upload order. A photo-size PDF has one photo per page; A4/Letter also support
several photos per sheet. Curvature correction is experimental and starts off.

Up to 20 photos, each no larger than 20 MiB, can be sent in one job. The server
also limits decoded image size. Cancel, or close the scanner, to abort a transfer
and release its temporary job. An inference already running finishes its current
call, but a cancelled job cannot retain the finished result. Server jobs also
expire automatically. An unavailable or busy server produces a clear error;
choose local processing explicitly if that is the desired alternative.

Switching back to local processing re-renders each preview from its original
photo before export. Local JPG/PNG, printing and Tesseract remain available.

## Deployment

The GPU service is under `server/ocr/`. Its port stays on
`127.0.0.1:8765`. The dedicated `/api/ocr/` Pages proxy uses server-side
`OCR_TUNNEL_URL` and `OCR_TOKEN` bindings. Credentials are never sent to the
browser. These bindings and the OCR tunnel are separate from the speech service.
An installation without those bindings can continue using the local scanner.

## Quality checks

`tests/scanner_server_browser.py` verifies opt-in behavior, original-byte uploads,
editing metadata, unchanged PDF download, bounded previews, cancellation, failure
messages and return to local export. `tests/scanner_browser.py` covers the local
scanner. Core PDF/learning regressions remain mandatory for changes in this flow.

PDF coordinate checks and live GPU measurements are separate from browser
transport tests. Physical Pixel 9 / Lenovo checks and comparison with an Adobe
Scan PDF from the very same camera image remain explicit acceptance work; a
synthetic page or browser touch emulation cannot establish those results.

A companion Android scanner is developed separately under `android/ocr-scanner/`.
Its bundled OCR engine is intended to work without a PC or internet and exports
PDF into Reader. It does not use the server mode described above.
