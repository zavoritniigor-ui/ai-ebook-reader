"""Short-lived, capacity-bounded jobs. Originals never reach disk."""
import hashlib
import io
import json
import re
import secrets
import shutil
import tempfile
import threading
import time
from pathlib import Path

from fastapi import HTTPException
from pdf_document import OutputLimit, assemble

MAX_JOBS = 4
MAX_PAGES = 20
MAX_STORAGE = 512 * 1024 * 1024
MAX_MANIFEST_PAGE = 4 * 1024 * 1024
TTL_SECONDS = 30 * 60
MAX_CLIENTS = 1024
MAX_CLIENT_ACTIVE = 2
MAX_CLIENT_HOURLY = 20


def document_options(value):
    if not isinstance(value, dict) or set(value) - {"paper", "nup", "dewarp"}:
        raise ValueError("Invalid document options")
    paper, nup, dewarp = value.get("paper", "fit"), value.get("nup", 1), value.get("dewarp", False)
    if paper not in ("fit", "a4", "letter") or type(nup) is not int or nup not in (1, 2, 4, 6, 9):
        raise ValueError("Invalid paper or pages-per-sheet")
    if paper == "fit" and nup != 1 or type(dewarp) is not bool:
        raise ValueError("Photo-size PDF requires one page per sheet; dewarp must be boolean")
    return {"paper": paper, "nup": nup, "dewarp": dewarp}


class JobStore:
    def __init__(self, directory=None, clock=time.monotonic):
        # One private root per process; never trust or load user-controlled on-disk metadata.
        if directory:
            Path(directory).mkdir(mode=0o700, parents=True, exist_ok=True)
        self.root = Path(tempfile.mkdtemp(prefix="ocr-", dir=directory))
        self.root.chmod(0o700)
        self.clock = clock
        self.jobs = {}
        self.clients = {}
        self.lock = threading.RLock()

    def close(self):
        with self.lock:
            shutil.rmtree(self.root, ignore_errors=True)
            self.jobs.clear()
            self.clients.clear()

    def cleanup(self):
        with self.lock:
            for key, job in list(self.jobs.items()):
                if self.clock() >= job["expires"]:
                    self._delete(key)
            for client, times in list(self.clients.items()):
                recent = [at for at in times if at > self.clock() - 3600]
                if recent:
                    self.clients[client] = recent
                else:
                    del self.clients[client]

    def _get(self, key):
        self.cleanup()
        if not re.fullmatch(r"[0-9a-f]{32}", key) or key not in self.jobs:
            raise HTTPException(404, "Job not found or expired")
        return self.jobs[key]

    def _delete(self, key):
        shutil.rmtree(self.root / key, ignore_errors=True)
        del self.jobs[key]

    def storage_bytes(self):
        return sum(job["size"] for job in self.jobs.values())

    def create(self, options, client=None):
        with self.lock:
            self.cleanup()
            if len(self.jobs) >= MAX_JOBS:
                raise HTTPException(429, "Too many active OCR documents")
            if client is not None:
                active = sum(job["client"] == client for job in self.jobs.values())
                if active >= MAX_CLIENT_ACTIVE or len(self.clients.get(client, [])) >= MAX_CLIENT_HOURLY:
                    raise HTTPException(429, "OCR client quota exceeded; retry later")
                if client not in self.clients and len(self.clients) >= MAX_CLIENTS:
                    raise HTTPException(429, "OCR client capacity reached; retry later")
            key = secrets.token_hex(16)
            (self.root / key).mkdir(mode=0o700)
            self.jobs[key] = {"options": options, "expires": self.clock() + TTL_SECONDS,
                              "pages": [], "size": 0, "pdf_size": 0, "client": client}
            if client is not None:
                self.clients.setdefault(client, []).append(self.clock())
            return {"id": key}

    def delete(self, key):
        with self.lock:
            self._get(key)
            self._delete(key)

    def put(self, key, index, raw, options, process):
        digest = hashlib.sha256(raw + json.dumps(options, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        with self.lock:
            job = self._get(key)
            pages = job["pages"]
            if not 0 <= index < MAX_PAGES:
                raise HTTPException(422, "Document is limited to 20 pages")
            if index < len(pages):
                if pages[index]["digest"] != digest:
                    raise HTTPException(409, "Page already exists with different content or options")
                return self._summary(pages[index]["manifest"])
            if index != len(pages):
                raise HTTPException(409, "Upload pages in order, starting with index 0")
            dewarp = job["options"]["dewarp"]
        # The API's GPU lock serializes recognition. Do not hold the metadata lock:
        # cancel/expiry can remove a job and health/manifest stay responsive during OCR.
        pdf, manifest = process(raw, options, dewarp)
        manifest = {"index": index, **manifest}
        metadata = json.dumps(manifest, ensure_ascii=False, allow_nan=False).encode()
        if len(metadata) > MAX_MANIFEST_PAGE:
            raise HTTPException(413, "Page word geometry exceeds the manifest limit")
        with self.lock:
            job = self._get(key)
            pages = job["pages"]
            if len(pages) != index:
                raise HTTPException(409, "Document changed while recognition was running")
            added = len(pdf) + len(metadata)
            if self.storage_bytes() - job["pdf_size"] + added > MAX_STORAGE:
                raise HTTPException(429, "OCR document storage is full; remove finished documents")
            directory = self.root / key
            path = directory / f"page-{index}.pdf"
            try:
                path.write_bytes(pdf)
            except OSError:
                path.unlink(missing_ok=True)
                raise HTTPException(507, "OCR temporary storage is full") from None
            (directory / "document.pdf").unlink(missing_ok=True)
            job["size"] += added - job["pdf_size"]
            job["pdf_size"] = 0
            pages.append({"path": path, "manifest": manifest, "digest": digest})
            return self._summary(manifest)

    @staticmethod
    def _summary(manifest):
        return {"index": manifest["index"], "width": manifest["width"],
                "height": manifest["height"], "word_count": len(manifest["words"])}

    def manifest(self, key):
        with self.lock:
            job = self._get(key)
            return {"schema": 1, "id": key, **job["options"],
                    "coordinate_space": "final_image_top_left_pixels",
                    "pages": [page["manifest"] for page in job["pages"]]}

    def pdf(self, key):
        with self.lock:
            job = self._get(key)
            if not job["pages"]:
                raise HTTPException(409, "Document has no pages")
            path = self.root / key / "document.pdf"
            if not job["pdf_size"]:
                try:
                    data = assemble([page["path"] for page in job["pages"]], job["options"]["paper"], job["options"]["nup"])
                except OutputLimit as exc:
                    raise HTTPException(413, str(exc)) from None
                if self.storage_bytes() + len(data) > MAX_STORAGE:
                    raise HTTPException(429, "OCR document storage is full; remove finished documents")
                try:
                    path.write_bytes(data)
                except OSError:
                    path.unlink(missing_ok=True)
                    raise HTTPException(507, "OCR temporary storage is full") from None
                job["pdf_size"] = len(data)
                job["size"] += len(data)
            # Snapshot under the lock so DELETE/expiry immediately frees all disk
            # data. The API caps concurrent snapshots at four, each <=100 MiB.
            return io.BytesIO(path.read_bytes()), job["pdf_size"]
