"""Keep Unicode words attached to their original CTC alignment columns."""
import re
import statistics
from types import MethodType

import numpy as np
import cv2


def unicode_word_info(decoder, text, selection):
    columns = np.flatnonzero(selection)
    if len(columns) != len(text):
        raise ValueError("Decoded characters do not match alignment columns")
    matches = list(re.finditer(r"\S+", text))
    words = [list(match.group()) for match in matches]
    word_columns = [columns[match.start():match.end()].tolist() for match in matches]
    return words, word_columns, ["en&num"] * len(words)


def configure_word_decoder(engine):
    decoder = engine.paddlex_pipeline.text_rec_model.post_op
    if not callable(getattr(decoder, "get_word_info", None)):
        raise RuntimeError("Unsupported PaddleX word-alignment decoder")
    decoder.get_word_info = MethodType(unicode_word_info, decoder)


def reading_order(words):
    lines = {}
    for word in words:
        lines.setdefault(word["line"], []).append(word)
    boxes = {line: [min(word["bbox"][0] for word in group),
                    min(word["bbox"][1] for word in group),
                    max(word["bbox"][2] for word in group),
                    max(word["bbox"][3] for word in group)]
             for line, group in lines.items()}

    # Gutters scale with the type size. A tilted or curved photographed line has a box far taller than its letters,
    # so the column gap is measured against word heights (2026-11-26, real two-column photo: the 50-75 px gutter was
    # below 3 x the inflated line height and both columns were read line by line in turn).
    word_height = statistics.median(word["bbox"][3] - word["bbox"][1] for word in words) if words else 0

    def split(indices):
        if len(indices) < 2:
            return indices
        height = statistics.median(boxes[index][3] - boxes[index][1] for index in indices)
        for axis, minimum in [(0, min(height * 3, word_height * 0.8)), (1, height * 1.5)]:
            ordered = sorted(indices, key=lambda index: boxes[index][axis])
            end = boxes[ordered[0]][axis + 2]
            gaps = []
            for position, index in enumerate(ordered[1:], 1):
                gap = boxes[index][axis] - end
                if gap > minimum:
                    gaps.append((gap, position))
                end = max(end, boxes[index][axis + 2])
            if gaps:
                _, position = max(gaps)
                return split(ordered[:position]) + split(ordered[position:])
        return sorted(indices, key=lambda index: (boxes[index][1], boxes[index][0]))

    output = []
    for line_number, index in enumerate(split(list(lines))):
        for word in sorted(lines[index], key=lambda item: item["bbox"][0]):
            output.append({**word, "line": line_number})
    return output


def refine_word_boxes(image, words):
    pixels = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2GRAY)
    height, width = pixels.shape
    lines = {}
    for word in words:
        lines.setdefault(word["line"], []).append(word)
    output = []
    for group in lines.values():
        group = sorted(group, key=lambda word: word["bbox"][0])
        boundaries = [0]
        for previous, following in zip(group, group[1:]):
            previous_box, following_box = previous["bbox"], following["bbox"]
            estimate = (previous_box[2] + following_box[0]) / 2
            padding = max(previous_box[3] - previous_box[1], following_box[3] - following_box[1]) * 0.4
            start = max(0, int(max((previous_box[0] + previous_box[2]) / 2, estimate - padding)))
            end = min(width, int(min((following_box[0] + following_box[2]) / 2, estimate + padding)))
            top = max(0, int(min(previous_box[1], following_box[1])) - 2)
            bottom = min(height, int(np.ceil(max(previous_box[3], following_box[3]))) + 2)
            region = pixels[top:bottom, start:end]
            boundary = estimate
            if region.size and int(region.max()) - int(region.min()) >= 24:
                _, dark = cv2.threshold(region, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
                counts = np.count_nonzero(dark, axis=0)
                quiet = counts <= counts.min()
                transitions = np.diff(np.r_[False, quiet, False].astype(int))
                intervals = list(zip(np.flatnonzero(transitions == 1), np.flatnonzero(transitions == -1)))
                if intervals:
                    gap_start, gap_end = max(intervals, key=lambda gap: (
                        gap[1] - gap[0], -abs(start + sum(gap) / 2 - estimate)))
                    boundary = start + (gap_start + gap_end) / 2
            boundaries.append(boundary)
        boundaries.append(width)
        for index, word in enumerate(group):
            left, top, right, bottom = word["bbox"]
            padding = max(3, (bottom - top) * 0.4)
            minimum, maximum = boundaries[index:index + 2]
            crop_left = max(0, int(max(minimum, left - padding)))
            crop_right = min(width, int(np.ceil(min(maximum, right + padding))))
            crop_top = max(0, int(top) - 2)
            crop_bottom = min(height, int(np.ceil(bottom)) + 2)
            crop = pixels[crop_top:crop_bottom, crop_left:crop_right]
            if not crop.size or int(crop.max()) - int(crop.min()) < 24:
                output.append(word)
                continue
            _, mask = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
            _, _, components, _ = cv2.connectedComponentsWithStats(mask)
            kept = []
            for component_left, component_top, component_width, component_height, area in components[1:]:
                if area < 2:
                    continue
                if component_width > component_height * 12 or component_height > component_width * 12:
                    continue
                if crop_left + component_left + component_width <= left or crop_left + component_left >= right:
                    continue
                kept.append([component_left, component_top,
                             component_left + component_width, component_top + component_height])
            if not kept:
                output.append(word)
                continue
            box = [float(crop_left + min(component[0] for component in kept)),
                   float(crop_top + min(component[1] for component in kept)),
                   float(crop_left + max(component[2] for component in kept)),
                   float(crop_top + max(component[3] for component in kept))]
            output.append({**word, "bbox": box,
                           "polygon": [[box[0], box[1]], [box[2], box[1]],
                                       [box[2], box[3]], [box[0], box[3]]]})
    return output
