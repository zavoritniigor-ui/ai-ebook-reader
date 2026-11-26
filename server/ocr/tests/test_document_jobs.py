import concurrent.futures
import io
import json
import secrets
import struct
import threading
import time
import unittest
import zlib
from unittest.mock import patch

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from pypdf import PdfReader

import document_jobs
import image_processing
import pdf_document
import server
from document_jobs import JobStore
from pdf_helpers import text_boxes


def photo(size=(200, 400), color="white", exif=None):
    buffer = io.BytesIO()
    image = Image.new("RGB", size, color)
    image.save(buffer, "JPEG" if exif is not None else "PNG", **({"exif": exif} if exif is not None else {}))
    return buffer.getvalue()


class DocumentTests(unittest.TestCase):
    def setUp(self):
        self.clock = [0]
        self.store = JobStore(clock=lambda: self.clock[0])
        self.addCleanup(self.store.close)
        self.patches = [patch.object(server, "jobs", self.store), patch.object(server, "TOKEN", secrets.token_urlsafe(32))]
        for item in self.patches:
            item.start()
            self.addCleanup(item.stop)
        self.client = TestClient(server.app)
        self.client.headers["Authorization"] = "Bearer " + server.TOKEN
        self.seen = []
        def fake_ocr(image, dewarp):
            self.seen.append((image.copy(), dewarp, threading.current_thread().name))
            return image, [{"text": "L'école", "line": 0, "bbox": [10, 20, 70, 40], "polygon": [[10, 20], [70, 20], [70, 40], [10, 40]]},
                           {"text": "française", "line": 0, "bbox": [80, 20, 170, 40], "polygon": [[80, 20], [170, 20], [170, 40], [80, 40]]}]
        item = patch.object(server, "recognize", side_effect=fake_ocr)
        self.ocr = item.start()
        self.addCleanup(item.stop)

    def create(self, **options):
        response = self.client.post("/v1/jobs", json=options)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertRegex(response.json()["id"], r"^[0-9a-f]{32}$")
        return response.json()["id"]

    def put(self, key, index=0, raw=None, **options):
        return self.client.put(f"/v1/jobs/{key}/pages/{index}", content=photo() if raw is None else raw,
                               headers={"X-OCR-Options": json.dumps(options)})

    def test_authentication_on_every_document_route(self):
        key = self.create()
        self.client.headers.pop("Authorization")
        for method, path in [("POST", "/v1/jobs"), ("PUT", f"/v1/jobs/{key}/pages/0"),
                             ("GET", f"/v1/jobs/{key}/pdf"), ("GET", f"/v1/jobs/{key}/manifest"),
                             ("DELETE", f"/v1/jobs/{key}")]:
            with self.subTest(method=method, path=path):
                self.assertEqual(self.client.request(method, path).status_code, 401)

    def test_document_options_reject_unsupported_and_ambiguous_values(self):
        for options in [{"paper": "wide"}, {"nup": True}, {"nup": 3}, {"paper": "fit", "nup": 2},
                        {"dewarp": "false"}, {"unexpected": 1}, []]:
            self.assertEqual(self.client.post("/v1/jobs", json=options).status_code, 422, options)
        self.assertEqual(self.client.post("/v1/jobs", content=b"x" * 1025).status_code, 413)

    def test_all_page_option_guards_fail_before_ocr(self):
        key = self.create()
        for options in [{"rotation": True}, {"rotation": 45}, {"filter": "enhance"}, {"url": "http://bad"},
                        {"corners": [[0, 0], [1, 1], [1, 0], [0, 1]]},
                        {"corners": [[-1, 0], [1, 0], [1, 1], [0, 1]]},
                        {"corners": [[0, 0], [0, 0], [1, 1], [0, 1]]},
                        {"corners": [[0, 0], [float("nan"), 0], [1, 1], [0, 1]]}]:
            self.assertEqual(self.put(key, **options).status_code, 422, options)
        self.ocr.assert_not_called()

    def test_sequential_upload_and_idempotent_retry(self):
        key = self.create()
        self.assertEqual(self.put(key, 1).status_code, 409)
        result = self.put(key)
        self.assertEqual(result.json(), {"index": 0, "width": 200, "height": 400, "word_count": 2})
        self.assertEqual(self.put(key).json(), result.json())
        self.assertEqual(self.put(key, corners=[[0., 0.], [1., 0.], [1., 1.], [0., 1.]]).json(), result.json())
        self.assertEqual(self.ocr.call_count, 1)
        self.assertEqual(self.put(key, rotation=90).status_code, 409)
        self.assertEqual(self.put(key, raw=photo(color="red")).status_code, 409)
        self.assertEqual(self.ocr.call_count, 1)
        self.assertEqual(self.put(key, 1).status_code, 200)
        self.assertEqual(self.put(key, 20).status_code, 422)

    def test_body_stream_limit_and_invalid_images_release_gpu_lock(self):
        key = self.create()
        with patch.object(server, "MAX_BYTES", 8):
            response = self.client.put(f"/v1/jobs/{key}/pages/0", content=iter([b"abc", b"012345678"]))
            self.assertEqual(response.status_code, 413)
        self.assertEqual(self.put(key, raw=b"broken").status_code, 422)
        self.assertEqual(self.put(key).status_code, 200)

    def test_manifest_and_lossless_embedded_image_share_final_pixels(self):
        key = self.create(dewarp=True)
        colored = Image.new("RGB", (200, 400), "white")
        draw = ImageDraw.Draw(colored)
        draw.rectangle((10, 30, 80, 90), fill="blue")
        draw.rectangle((100, 280, 170, 360), fill="red")
        buffer = io.BytesIO()
        colored.save(buffer, "PNG")
        self.assertEqual(self.put(key, raw=buffer.getvalue(), rotation=90, filter="gray").status_code, 200)
        manifest = self.client.get(f"/v1/jobs/{key}/manifest").json()
        page = manifest["pages"][0]
        self.assertEqual((page["width"], page["height"]), (400, 200))
        self.assertEqual([word["text"] for word in page["words"]], ["L'école", "française"])
        self.assertEqual(manifest["coordinate_space"], "final_image_top_left_pixels")
        self.assertTrue(self.seen[0][1])
        self.assertIn("worker", self.seen[0][2].lower())
        response = self.client.get(f"/v1/jobs/{key}/pdf")
        self.assertEqual(response.headers["Content-Type"], "application/pdf")
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        document = PdfReader(io.BytesIO(response.content))
        self.assertEqual(document.pages[0].extract_text().split(), ["L'école", "française"])
        pixels = document.pages[0].images[0].image.convert("RGB")
        self.assertTrue(np.array_equal(np.asarray(pixels), np.asarray(self.seen[0][0])))
        for actual, expected in zip(text_boxes(document.pages[0]), page["words"]):
            for coordinate, target in zip(actual, expected["bbox"]):
                self.assertAlmostEqual(coordinate, target * 842 / 400, delta=.2)

    def test_crop_then_rotation_and_whole_photo_defaults(self):
        raw = photo((400, 300), "blue")
        key = self.create()
        self.assertEqual(self.put(key, raw=raw, corners=[[.5, 0], [1, 0], [1, 1], [.5, 1]], rotation=90).status_code, 200)
        image = self.seen[0][0]
        self.assertEqual(image.size, (299, 200))
        self.assertEqual(image.getpixel((100, 100)), (0, 0, 255))
        self.assertEqual(image_processing.page_options({})["corners"], image_processing.FULL)

    def test_fit_and_nup_preserve_pdf_text_order_and_transforms(self):
        for paper, nup in [("fit", 1), ("a4", 2), ("letter", 4), ("a4", 6), ("letter", 9)]:
            key = self.create(paper=paper, nup=nup)
            for index in range(4):
                self.assertEqual(self.put(key, index).status_code, 200)
            response = self.client.get(f"/v1/jobs/{key}/pdf")
            self.assertEqual(response.status_code, 200)
            document = PdfReader(io.BytesIO(response.content))
            self.assertEqual(len(document.pages), (4 + nup - 1) // nup)
            self.assertEqual([word for page in document.pages for word in page.extract_text().split()], ["L'école", "française"] * 4)
            if nup == 2:
                page = document.pages[0]
                boxes = text_boxes(page)
                self.assertEqual(len(boxes), 4)
                self.assertLess(boxes[1][2], float(page.mediabox.width) / 2)
                self.assertGreater(boxes[2][0], float(page.mediabox.width) / 2)
                self.assertTrue(all(0 <= b[0] < b[2] <= float(page.mediabox.width) and 0 <= b[1] < b[3] <= float(page.mediabox.height) for b in boxes))
            self.assertEqual(self.client.delete(f"/v1/jobs/{key}").status_code, 204)

    def test_empty_deleted_expired_and_invalid_jobs(self):
        key = self.create()
        self.assertEqual(self.client.get(f"/v1/jobs/{key}/pdf").status_code, 409)
        self.assertEqual(self.put(key).status_code, 200)
        self.clock[0] = document_jobs.TTL_SECONDS + 1
        self.assertEqual(self.client.get(f"/v1/jobs/{key}/manifest").status_code, 404)
        self.assertFalse((self.store.root / key).exists())
        self.assertEqual(self.client.get("/v1/jobs/not-a-job/manifest").status_code, 404)
        key = self.create()
        self.put(key)
        self.client.delete(f"/v1/jobs/{key}")
        self.assertEqual(self.client.get(f"/v1/jobs/{key}/pdf").status_code, 404)
        self.assertEqual(self.store.storage_bytes(), 0)

    def test_cleanup_expires_idle_documents_without_new_requests(self):
        with patch.object(server, "CLEANUP_INTERVAL", .01), TestClient(server.app) as client:
            client.headers["Authorization"] = self.client.headers["Authorization"]
            key = client.post("/v1/jobs", json={}).json()["id"]
            self.clock[0] = document_jobs.TTL_SECONDS + 1
            deadline = time.monotonic() + 1
            while key in self.store.jobs and time.monotonic() < deadline:
                time.sleep(.01)
            self.assertNotIn(key, self.store.jobs)
            self.assertFalse((self.store.root / key).exists())

    def test_active_jobs_and_storage_are_bounded(self):
        for _ in range(4):
            self.create()
        self.assertEqual(self.client.post("/v1/jobs", json={}).status_code, 429)
        key = next(iter(self.store.jobs))
        with patch.object(document_jobs, "MAX_STORAGE", 100):
            self.assertEqual(self.put(key).status_code, 429)
        self.assertEqual(self.store.manifest(key)["pages"], [])
        self.assertEqual(self.store.storage_bytes(), 0)
        self.assertEqual(self.put(key).status_code, 200)
        with patch.object(document_jobs, "MAX_STORAGE", self.store.storage_bytes() + 10):
            self.assertEqual(self.client.get(f"/v1/jobs/{key}/pdf").status_code, 429)
        self.assertFalse((self.store.root / key / "document.pdf").exists())

    def test_authenticated_proxy_client_quotas_and_bounded_identity_storage(self):
        self.client.headers["X-Client-IP"] = "203.0.113.1"
        first, second = self.create(), self.create()
        self.assertEqual(self.client.post("/v1/jobs", json={}).status_code, 429)
        self.client.delete(f"/v1/jobs/{first}")
        self.client.delete(f"/v1/jobs/{second}")
        for _ in range(document_jobs.MAX_CLIENT_HOURLY - 2):
            key = self.create()
            self.client.delete(f"/v1/jobs/{key}")
        self.assertEqual(self.client.post("/v1/jobs", json={}).status_code, 429)
        self.clock[0] += 3601
        self.create()
        self.assertEqual(len(self.store.clients["203.0.113.1"]), 1)
        self.client.headers["X-Client-IP"] = "203.0.113.2"
        with patch.object(document_jobs, "MAX_CLIENTS", 1):
            self.assertEqual(self.client.post("/v1/jobs", json={}).status_code, 429)
        self.client.headers["X-Client-IP"] = "not-an-address"
        self.assertEqual(self.client.post("/v1/jobs", json={}).status_code, 422)

    def test_pdf_and_manifest_caps_fail_before_storage_commit(self):
        key = self.create()
        with patch.object(pdf_document, "MAX_OUTPUT_BYTES", 64):
            self.assertEqual(self.put(key).status_code, 413)
        with patch.object(document_jobs, "MAX_MANIFEST_PAGE", 64):
            self.assertEqual(self.put(key).status_code, 413)
        self.assertEqual(self.store.manifest(key)["pages"], [])
        self.assertEqual(self.put(key).status_code, 200)
        with patch.object(pdf_document, "MAX_OUTPUT_BYTES", 1024):
            self.assertEqual(self.client.get(f"/v1/jobs/{key}/pdf").status_code, 413)
        self.assertEqual(self.store.jobs[key]["pdf_size"], 0)

    def test_busy_gpu_and_health_remain_responsive(self):
        key = self.create()
        entered, release = threading.Event(), threading.Event()
        original = self.ocr.side_effect
        def waiting(image, dewarp):
            entered.set()
            release.wait(2)
            return original(image, dewarp)
        self.ocr.side_effect = waiting
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(self.put, key)
            try:
                self.assertTrue(entered.wait(2))
                start = time.monotonic()
                self.assertEqual(self.client.get("/health").status_code, 200)
                self.assertLess(time.monotonic() - start, .5)
                self.assertEqual(self.put(key, 1).status_code, 429)
            finally:
                release.set()
            self.assertEqual(future.result().status_code, 200)

    def test_delete_cancels_storage_commit_while_ocr_is_running(self):
        key = self.create()
        entered, release = threading.Event(), threading.Event()
        original = self.ocr.side_effect
        def waiting(image, dewarp):
            entered.set()
            release.wait(2)
            return original(image, dewarp)
        self.ocr.side_effect = waiting
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(self.put, key)
            try:
                self.assertTrue(entered.wait(2))
                self.assertEqual(self.client.delete(f"/v1/jobs/{key}").status_code, 204)
                self.assertEqual(self.store.storage_bytes(), 0)
            finally:
                release.set()
            self.assertEqual(future.result().status_code, 404)
        self.assertFalse((self.store.root / key).exists())

    def test_download_slot_is_released_on_completion_and_bounded(self):
        key = self.create()
        self.put(key)
        for _ in range(6):
            self.assertEqual(self.client.get(f"/v1/jobs/{key}/pdf").status_code, 200)
        held = []
        try:
            for _ in range(4):
                self.assertTrue(server.DOWNLOADS.acquire(blocking=False))
                held.append(True)
            self.assertEqual(self.client.get(f"/v1/jobs/{key}/pdf").status_code, 429)
        finally:
            for _ in held:
                server.DOWNLOADS.release()


class ImageTests(unittest.TestCase):
    def test_exif_and_pixel_limit_precede_processing(self):
        exif = Image.Exif()
        exif[274] = 6
        self.assertEqual(image_processing.decode(photo((120, 80), exif=exif)).size, (80, 120))
        def chunk(kind, value):
            return struct.pack(">I", len(value)) + kind + value + struct.pack(">I", zlib.crc32(kind + value))
        oversized = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 9000, 9000, 8, 2, 0, 0, 0)) + chunk(b"IEND", b"")
        with self.assertWarns(Image.DecompressionBombWarning), self.assertRaises(ValueError):
            image_processing.decode(oversized)

    def test_fifty_megapixel_photo_is_decoded_to_bounded_final_size(self):
        image = image_processing.decode(photo((5000, 10000), exif=Image.Exif()))
        self.assertEqual(image.size, (2000, 4000))

    def test_filters_keep_text_and_color_and_output_valid_modes(self):
        image = Image.new("RGB", (400, 300), (180, 170, 140))
        draw = ImageDraw.Draw(image)
        draw.rectangle((20, 20, 90, 35), fill="black")
        draw.rectangle((250, 100, 280, 130), fill="red")
        color = image_processing.filter_image(image, "doc")
        self.assertTrue(all(value > 240 for value in color.getpixel((150, 50))))
        self.assertLess(max(color.getpixel((30, 25))), 10)
        red, green, blue = color.getpixel((260, 110))
        self.assertGreater(red, 180)
        self.assertLess(max(green, blue), 30)
        gray = np.asarray(image_processing.filter_image(image, "gray"))
        self.assertTrue(np.array_equal(gray[:, :, 0], gray[:, :, 2]))
        mono = np.asarray(image_processing.filter_image(image, "bw"))
        self.assertEqual(set(np.unique(mono)), {0, 255})


if __name__ == "__main__":
    unittest.main()
