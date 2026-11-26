# OCR Document Server

This optional GPU service converts original camera photos into searchable PDFs for
AI E-book Reader. It runs on the owner's computer; phone and tablet clients use
the Reader's dedicated proxy. The on-device scanner remains available offline.
The repository's root `LICENSE` applies to this project's own source.

## Image and coordinate pipeline

JPEG, PNG or WebP → EXIF orientation → downsample to a maximum 4000-pixel long
side → optional user crop → document/grey/B&W filter → clockwise rotation →
optional experimental dewarp → OCR → losslessly embedded final image and
invisible Unicode text. OCR and exported PDF use **the same final pixels**.
No original photo is written to disk. Whole-photo crop, original colour and no
rotation/dewarp are the defaults. Automatic edge detection is not applied.

Word boxes and polygons in the manifest use the final image's top-left origin
and pixel units. The word list is already in reading order. PDF generation uses
the embedded Unicode font's actual ascent/descent and individual word width;
explicit spaces preserve token boundaries. Paper-size and N-up assembly applies
the same PDF transformation to image and text. A photo-size document uses one
photo per page; A4/Letter support 1, 2, 4, 6 or 9 photos per sheet.

PP-OCRv5's French/Latin model handles the intended English and French pages.
The PaddleX 3.3.13 decoder adapter preserves Unicode accents and original CTC
alignment columns. Other scripts are not a supported server feature. Dewarp
remains experimental: compare its preview with the ordinary result before use.
Same-photo Adobe Scan comparison and physical Pixel 9 / Lenovo validation remain
separate acceptance checks; automated tests do not certify those devices.

## Launch on the owner's computer

Requirements: working NVIDIA driver, Podman, NVIDIA CDI GPU 0, and at least
30 GiB free for a **new** GPU runtime build. `run.sh` checks those requirements;
it never installs drivers, changes system CUDA, configures CDI, changes Kokoro,
starts a tunnel or enables automatic startup.

```bash
cd server/ocr
./run.sh
```

The only published port is `127.0.0.1:8765`. The token is generated as
`.ocr-token` with mode 0600 and passed to Podman by environment name, not as a
command-line value. Do not commit it or expose it to the browser. `OCR_CACHE_DIR`
can point to an existing private model cache, avoiding another model download;
otherwise `.cache` is used. Cache files are not part of the container build.

The GPU base is built from pinned Python image/Paddle GPU dependencies;
application dependencies are installed in a thin layer. PDF generation and
assembly use ReportLab and pypdf. The runtime does not require PyMuPDF.

For a **private local migration only**, `OCR_RUNTIME_IMAGE` may select an already
present compatible Paddle/cu126 image. Missing overrides fail without a pull or
retag. The launcher prints its image ID so the actual provenance is visible;
the application layer removes PyMuPDF and fails the build if `fitz` remains
importable. This cache override does not turn an old image into a clean build:
do not publish legacy OCI layers. Published source builds use
`Containerfile.runtime`, which contains the GPU-only recipe.

`run_local.py` is an alternative for an already isolated Python GPU environment:
install the cu126 Paddle GPU wheel and `requirements-gpu.txt` / `requirements.txt`
there, then run that environment's Python on `run_local.py`. It binds the same
loopback address, uses private `.jobs` temporary data and never changes system
CUDA. A single worker is required because model and job state are process-local.

## Document API

Every `/v1/` request requires `Authorization: Bearer <local token>`. Tokens and
client IP addresses are never returned or logged by this application. API
responses use `Cache-Control: no-store`. `GET /health` is unauthenticated and
returns `{status, configured_device, model_loaded}`. `configured_device` alone
is not evidence of GPU execution; observe the OCR PID and GPU usage during a
real request.

1. `POST /v1/jobs` with JSON
   `{"paper":"fit","nup":1,"dewarp":false}` → HTTP 201 `{"id":"32 lowercase hex digits"}`.
2. `PUT /v1/jobs/{id}/pages/0` with the original image bytes and header
   `X-OCR-Options: {"corners":[[0,0],[1,0],[1,1],[0,1]],"rotation":0,"filter":"orig"}`
   → `{index,width,height,word_count}`. Upload indexes sequentially, starting at
   zero. Corners are normalized, clockwise TL/TR/BR/BL and must form a convex,
   non-crossing quadrilateral. Rotation is 0/90/180/270 and filter is
   `orig`/`doc`/`bw`/`gray`. Omitted page settings use the defaults above.
3. Repeat PUT for subsequent pages. Retrying the same index with identical image
   bytes and equivalent normalized settings is idempotent; conflicting content
   or an out-of-order index returns 409.
4. `GET /v1/jobs/{id}/pdf` streams `application/pdf` with a bounded content length.
5. `GET /v1/jobs/{id}/manifest` returns
   `{schema:1,id,paper,nup,dewarp,coordinate_space:"final_image_top_left_pixels",pages:[{index,width,height,words:[{text,line,bbox,polygon}]}]}`.
6. `DELETE /v1/jobs/{id}` returns 204 and removes the temporary document. Call it
   after download and on cancellation. Deleting during recognition prevents the
   completed result from being committed to disk. GPU inference already running
   finishes its current call before the GPU lock becomes available again.

`POST /v1/ocr?dewarp=false` remains compatible with the original local CLI: raw
image in, JSON `{schema,width,height,coordinate_space,words,pdf_base64}` out.
Document jobs avoid this endpoint's base64 download overhead.

## Resource and privacy bounds

| Resource | Limit |
| --- | --- |
| Raw photo body | 20 MiB, including streamed uploads without Content-Length |
| Original image | 80 megapixels; final long side ≤4000 pixels |
| Active jobs | 4 globally |
| Pages per job | 20 |
| Manifest per page | 4 MiB |
| Final PDF | 100 MiB; checked before a larger output write |
| All temporary jobs and cached PDFs | 512 MiB, including accounted manifest data |
| Active downloads | 4, streamed in 64 KiB chunks |
| Server download buffers | At most 4 × 100 MiB; freed at completion/disconnect |
| Job lifetime | 30 minutes; idle cleanup every 30 seconds |
| Authenticated proxy client | 2 active documents and 20 new documents/hour |
| Remembered proxy clients | 1024/hour maximum |

Jobs are held under a private per-process directory. Access expires at the
deadline; idle files are removed by the next 30-second sweep. Normal shutdown
removes the process directory. In Podman `/jobs` is a 512 MiB tmpfs, so a crash or
container removal also discards it. Native execution may leave a directory after
an ungraceful process kill; remove only the stopped server's private `.jobs/ocr-*`
directory before restart. Runtime disk capacity remains bounded by the tmpfs.
No job is restored after restart.

OCR is serialized with a nonblocking GPU lock. Busy requests return 429;
CPU/image/model work runs outside the event loop. Invalid settings or images
return 422, absent/expired jobs 404, large request/output 413, capacity/quota 429,
and actual temporary-disk exhaustion 507. Clients should retry a busy upload
without changing its index, bytes or settings. A 100 MiB PDF limit can require
splitting a large photo series into smaller documents.

The dedicated proxy should forward the verified connecting IP as `X-Client-IP`.
This header is trusted **only after** bearer authentication; the IP is kept in
bounded in-memory rate accounting for an hour and omitted from manifests. An
authorized local CLI without that header uses the global job bounds. Keep the
backend on loopback; the proxy must use fixed routes/upstream and server-held
credentials. Do not reuse or change Kokoro's port/token/tunnel for OCR.

## CPU checks and GPU acceptance

CPU tests replace OCR with deterministic words and require no Paddle/CUDA wheels:

```bash
python3.12 -m venv /tmp/reader-ocr-tests
/tmp/reader-ocr-tests/bin/python -m pip install -r server/ocr/requirements-test.txt
PATH="/tmp/reader-ocr-tests/bin:$PATH" server/ocr/test.sh
```

The suite checks authorization, crop/EXIF/50 MP handling, token and reading
order, exact exported pixels, PDF font matrices/bounds, N-up placement, idle
expiry, idempotency/conflicts, cancellation, quotas, disk/output/body limits and
event-loop responsiveness. The PDF assertions read font descriptors/widths and
transforms with pypdf independently of the generator; they allow ≤0.2 pt error.
No unit test claims actual GPU execution or OCR accuracy.

Before publishing a runtime change, send a real camera photo, verify the OCR PID
and SM/VRAM activity with `nvidia-smi`, record cold/warm timings, inspect French
accents and reading order, and check the resulting PDF in Reader at
100/200/400%. Keep before/after Kokoro process checks. Downloaded model weights
and GPU runtime dependencies remain external dependencies with their own terms;
this repository does not redistribute cached models or container layers.

Implementation references: [ReportLab text objects](https://docs.reportlab.com/reportlab/userguide/ch2_graphics/),
[pypdf transformations](https://pypdf.readthedocs.io/en/latest/user/cropping-and-transforming.html).
