"""Bounded, EXIF-aware page preparation; OCR sees the exact exported pixels."""
import io
import math

import cv2
import numpy as np
from PIL import Image, ImageOps

MAX_PIXELS = 80_000_000
MAX_SIDE = 4000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
FULL = [[0, 0], [1, 0], [1, 1], [0, 1]]


def page_options(value):
    if not isinstance(value, dict) or set(value) - {"corners", "rotation", "filter"}:
        raise ValueError("Invalid page options")
    corners = value.get("corners", FULL)
    if (not isinstance(corners, list) or len(corners) != 4
            or any(not isinstance(p, list) or len(p) != 2 for p in corners)):
        raise ValueError("Four crop corners are required")
    for point in corners:
        if any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1 for v in point):
            raise ValueError("Crop corners must be finite fractions of the image")
    quad = np.asarray(corners, dtype=np.float64)
    edges = np.roll(quad, -1, axis=0) - quad
    crosses = edges[:, 0] * np.roll(edges, -1, axis=0)[:, 1] - edges[:, 1] * np.roll(edges, -1, axis=0)[:, 0]
    if np.any(crosses <= 0.00001) or np.min(np.linalg.norm(edges, axis=1)) < 0.005:
        raise ValueError("Crop must be convex, clockwise and non-crossing")
    rotation = value.get("rotation", 0)
    mode = value.get("filter", "orig")
    if type(rotation) is not int or rotation not in (0, 90, 180, 270):
        raise ValueError("Invalid rotation")
    if mode not in ("orig", "doc", "bw", "gray"):
        raise ValueError("Invalid filter")
    return {"corners": quad.tolist(), "rotation": rotation, "filter": mode}


def decode(raw):
    with Image.open(io.BytesIO(raw)) as source:
        if source.format not in ("JPEG", "PNG", "WEBP") or source.width * source.height > MAX_PIXELS:
            raise ValueError("Unsupported image or pixel limit exceeded")
        # JPEG draft decoding reduces peak RAM before EXIF transpose / RGB conversion.
        source.draft("RGB", (MAX_SIDE, MAX_SIDE))
        image = ImageOps.exif_transpose(source)
        image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
        return image.convert("RGB")


def _paper_background(luma):
    height, width = luma.shape
    cell = max(8, round(min(width, height) / 40))
    gh, gw = math.ceil(height / cell), math.ceil(width / cell)
    padded = np.pad(luma, ((0, gh * cell - height), (0, gw * cell - width)), mode="edge")
    grid = padded.reshape(gh, cell, gw, cell).max(axis=(1, 3)).astype(np.float32)
    grid = cv2.dilate(grid, np.ones((7, 7), np.uint8))
    for _ in range(2):
        grid = np.maximum(24, grid * .5 + cv2.blur(grid, (3, 3)) * .5)
    return cv2.resize(grid, (width, height), interpolation=cv2.INTER_LINEAR)


def filter_image(image, mode):
    if mode == "orig":
        return image
    rgb = np.asarray(image).copy()
    # Same integer luma weights and paper-normalisation policy as the phone scanner.
    luma = ((rgb[:, :, 0].astype(np.uint16) * 77 + rgb[:, :, 1].astype(np.uint16) * 150
             + rgb[:, :, 2].astype(np.uint16) * 29) >> 8).astype(np.uint8)
    if mode == "gray":
        return Image.fromarray(luma).convert("RGB")
    background = _paper_background(luma)
    paper_sum = np.zeros(3, dtype=np.float64)
    papers = 0
    for start in range(0, image.height, 128):
        end = start + 128
        factor = 255 / background[start:end]
        if mode == "bw":
            mono = np.where(luma[start:end] * factor < 175, 0, 255).astype(np.uint8)
            rgb[start:end] = mono[:, :, None]
        else:
            adjusted = np.clip(rgb[start:end].astype(np.float32) * factor[:, :, None], 0, 255)
            rgb[start:end] = np.rint(adjusted).astype(np.uint8)
            paper = luma[start:end] * factor > 225
            paper_sum += rgb[start:end][paper].sum(axis=0)
            papers += int(np.count_nonzero(paper))
    if mode == "doc":
        gain = np.minimum(1.4, 255 / np.maximum(1, paper_sum / papers)) if papers else np.ones(3)
        for start in range(0, image.height, 128):
            adjusted = rgb[start:start + 128].astype(np.float32) * gain
            rgb[start:start + 128] = np.rint(np.clip(np.where(adjusted >= 246, 255, (adjusted - 12) * 1.06), 0, 255)).astype(np.uint8)
    return Image.fromarray(rgb)


def prepare(image, options):
    if options["corners"] != FULL:
        quad = np.asarray(options["corners"], dtype=np.float32) * [image.width - 1, image.height - 1]
        width = max(np.linalg.norm(quad[1] - quad[0]), np.linalg.norm(quad[2] - quad[3]))
        height = max(np.linalg.norm(quad[3] - quad[0]), np.linalg.norm(quad[2] - quad[1]))
        scale = min(1, MAX_SIDE / max(width, height))
        width, height = max(2, round(width * scale)), max(2, round(height * scale))
        dest = np.asarray([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype=np.float32)
        matrix = cv2.getPerspectiveTransform(quad.astype(np.float32), dest)
        image = Image.fromarray(cv2.warpPerspective(np.asarray(image), matrix, (width, height), flags=cv2.INTER_LINEAR))
    image = filter_image(image, options["filter"])
    if options["rotation"]:
        image = image.rotate(-options["rotation"], expand=True)
    return image
