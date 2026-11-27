"""Local OCR API. Geometry always refers to the final exported image."""
import asyncio
import base64
from contextlib import asynccontextmanager, suppress
import json
import ipaddress
import os
import threading
import secrets
from PIL import Image
import numpy as np
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import Response, StreamingResponse
from starlette.concurrency import run_in_threadpool
from word_geometry import configure_word_decoder, reading_order, refine_word_boxes
from image_processing import decode, page_options, prepare
from document_jobs import JobStore, document_options
from pdf_document import OutputLimit, render_pdf

MAX_BYTES = 20 * 1024 * 1024
LOCK = threading.Lock()
DOWNLOADS = threading.BoundedSemaphore(4)
CLEANUP_INTERVAL = 30
DEVICE = os.getenv("OCR_DEVICE", "gpu:0")
TOKEN = os.getenv("OCR_TOKEN", "")
_engine = _prep = None
jobs = JobStore(os.getenv("OCR_JOB_DIR"))


@asynccontextmanager
async def lifespan(app):
    async def expire_jobs():
        while True:
            await asyncio.sleep(CLEANUP_INTERVAL)
            await run_in_threadpool(jobs.cleanup)
    task = asyncio.create_task(expire_jobs())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        await run_in_threadpool(jobs.close)


app = FastAPI(title="OCR Document Server", version="0.2.0", lifespan=lifespan)


@app.middleware("http")
async def private_responses(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

def normalize(result, width, height):
    words, boxes = result.get("text_word"), result.get("text_word_boxes")
    if words is None and boxes is None and result.get("rec_texts") == []:
        return []
    if words is None or boxes is None or len(words) != len(boxes):
        raise ValueError("OCR result missing matching word geometry")
    out = []
    for line, (texts, coords) in enumerate(zip(words, boxes)):
        if len(texts) != len(coords):
            raise ValueError("Word count differs from geometry count")
        for text, box in zip(texts, coords):
            if not isinstance(text, str) or not text.strip():
                continue
            a = np.asarray(box, dtype=float)
            if a.shape == (4,):
                x0,y0,x1,y1 = a
                a = np.array([[x0,y0],[x1,y0],[x1,y1],[x0,y1]])
            if a.shape != (4,2) or not np.isfinite(a).all():
                raise ValueError("Invalid word polygon")
            a[:,0] = np.clip(a[:,0],0,width)
            a[:,1] = np.clip(a[:,1],0,height)
            x0,y0 = a.min(axis=0); x1,y1 = a.max(axis=0)
            line_polygons = result.get("rec_polys")
            if line_polygons is not None:
                if len(line_polygons) != len(words):
                    raise ValueError("Line geometry count differs from recognition count")
                line_polygon = np.asarray(line_polygons[line], dtype=float)
                if line_polygon.shape != (4, 2) or not np.isfinite(line_polygon).all():
                    raise ValueError("Invalid line polygon")
                y0 = float(np.clip(line_polygon[:, 1].min(), 0, height))
                y1 = float(np.clip(line_polygon[:, 1].max(), 0, height))
                a = np.array([[x0,y0],[x1,y0],[x1,y1],[x0,y1]])
            if x1 <= x0 or y1 <= y0:
                continue
            out.append({"text":text,"line":line,"polygon":a.tolist(),
                        "bbox":[float(x0),float(y0),float(x1),float(y1)]})
    return reading_order(out)

def recognize(image, dewarp):
    global _engine, _prep
    from paddleocr import PaddleOCR, DocPreprocessor
    # Run rectification separately; OCR and PDF use exactly the same pixels.
    bgr = np.asarray(image)[:,:,::-1].copy()
    if dewarp:
        if _prep is None:
            _prep = DocPreprocessor(device=DEVICE, use_doc_orientation_classify=True,
                                    use_doc_unwarping=True)
        result = next(iter(_prep.predict(bgr)))
        bgr = np.asarray(result["output_img"])
        image = Image.fromarray(bgr[:,:,::-1].copy())
        if max(image.size) > 4000:
            image.thumbnail((4000, 4000), Image.Resampling.LANCZOS)
            bgr = np.asarray(image)[:, :, ::-1].copy()
    if _engine is None:
        engine = PaddleOCR(device=DEVICE, lang="fr", ocr_version="PP-OCRv5",
                            use_doc_orientation_classify=False,
                            use_doc_unwarping=False, use_textline_orientation=False,
                            return_word_box=True, text_det_limit_side_len=4000,
                            text_det_limit_type="max")
        configure_word_decoder(engine)
        _engine = engine
    try:
        result = next(iter(_engine.predict(bgr)))
    except KeyError as exc:
        # PaddleX 3.3.x can omit text_word_region when detection finds no text.
        # Confirm that the page is empty before accepting absent word geometry.
        if exc.args != ("text_word_region",):
            raise
        fallback = next(iter(_engine.predict(bgr, return_word_box=False)))
        if fallback.get("rec_texts") != []:
            raise
        return image, []
    return image, refine_word_boxes(image, normalize(result, *image.size))

@app.get("/health")
def health():
    return {"status":"ready" if _engine is not None else "cold",
            "configured_device":DEVICE,"model_loaded":_engine is not None}

def authenticate(request):
    if not TOKEN or not secrets.compare_digest(request.headers.get("authorization",""), "Bearer "+TOKEN):
        raise HTTPException(401,"Unauthorized")


async def read_body(request, limit):
    body = bytearray()
    async for chunk in request.stream():
        if len(body)+len(chunk)>limit:
            raise HTTPException(413,"Request body too large")
        body.extend(chunk)
    return body


def process_page(raw, options, dewarp):
    try:
        image = prepare(decode(raw), options)
    except (ValueError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, "Invalid, unsupported or oversized image") from None
    final, words = recognize(image, dewarp)
    try:
        pdf = render_pdf(final, words)
    except OutputLimit as exc:
        raise HTTPException(413, str(exc)) from None
    return pdf, {"width": final.width, "height": final.height, "words": words}


@app.post("/v1/jobs", status_code=201)
async def create_job(request: Request):
    authenticate(request)
    try:
        options = document_options(json.loads(await read_body(request, 1024)))
        client = request.headers.get("x-client-ip")
        if client is not None:
            # This header is trusted only after bearer authentication by the private proxy.
            client = str(ipaddress.ip_address(client))
    except (ValueError, TypeError, UnicodeError):
        raise HTTPException(422, "Invalid document options") from None
    return await run_in_threadpool(jobs.create, options, client)


@app.put("/v1/jobs/{key}/pages/{index}")
async def upload_page(key: str, index: int, request: Request):
    authenticate(request)
    try:
        header = request.headers.get("x-ocr-options", "{}")
        if len(header) > 4096:
            raise ValueError("Page options too large")
        options = page_options(json.loads(header))
    except (ValueError, TypeError, UnicodeError):
        raise HTTPException(422, "Invalid page options") from None
    if not LOCK.acquire(blocking=False):
        raise HTTPException(429,"OCR busy; retry later")
    try:
        body = await read_body(request, MAX_BYTES)
        return await run_in_threadpool(jobs.put, key, index, body, options, process_page)
    finally:
        LOCK.release()


@app.get("/v1/jobs/{key}/manifest")
async def job_manifest(key: str, request: Request):
    authenticate(request)
    return await run_in_threadpool(jobs.manifest, key)


@app.get("/v1/jobs/{key}/pdf")
async def job_pdf(key: str, request: Request):
    authenticate(request)
    if not DOWNLOADS.acquire(blocking=False):
        raise HTTPException(429, "Too many active PDF downloads")
    try:
        source, size = await run_in_threadpool(jobs.pdf, key)
    except BaseException:
        DOWNLOADS.release()
        raise
    def stream():
        while chunk := source.read(64 * 1024):
            yield chunk
    class PDFResponse(StreamingResponse):
        async def __call__(self, scope, receive, send):
            try:
                await super().__call__(scope, receive, send)
            finally:
                source.close()
                DOWNLOADS.release()
    return PDFResponse(stream(), media_type="application/pdf", headers={
        "Content-Length": str(size), "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="scan.pdf"',
        "X-Content-Type-Options": "nosniff"})


@app.delete("/v1/jobs/{key}", status_code=204)
async def delete_job(key: str, request: Request):
    authenticate(request)
    await run_in_threadpool(jobs.delete, key)
    return Response(status_code=204)


@app.post("/v1/ocr")
async def ocr(request: Request, dewarp: bool = False):
    """Backward compatible local CLI endpoint. Document jobs avoid base64 overhead."""
    authenticate(request)
    if not LOCK.acquire(blocking=False):
        raise HTTPException(429, "OCR busy; retry later")
    try:
        body = await read_body(request, MAX_BYTES)
        pdf, result = await run_in_threadpool(process_page, body, page_options({}), dewarp)
        return {"schema": 1, **result, "coordinate_space": "final_image_top_left_pixels",
                "pdf_base64": base64.b64encode(pdf).decode("ascii")}
    finally:
        LOCK.release()
