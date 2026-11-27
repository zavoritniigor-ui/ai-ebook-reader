#!/usr/bin/env python3
"""Independent export validation. Requires PyMuPDF; it is not an Android dependency."""
import argparse
import json
from pathlib import Path

import fitz


def verify(pdf_path, json_path):
    metadata = json.loads(Path(json_path).read_text(encoding="utf-8"))
    scale = metadata["pdf_points_per_pixel"]
    result = {"pdf": str(Path(pdf_path).resolve()), "json": str(Path(json_path).resolve()), "pages": [], "max_bbox_error_pt": 0}
    with fitz.open(pdf_path) as pdf:
        assert len(pdf) == len(metadata["pages"]), "Page count mismatch"
        for index, (page, source) in enumerate(zip(pdf, metadata["pages"])):
            assert abs(page.rect.width-source["width"]*scale) < .01
            assert abs(page.rect.height-source["height"]*scale) < .01
            extracted = page.get_text("words", sort=False)
            expected = source["words"]
            assert [word[4] for word in extracted] == [word["text"] for word in expected], "PDF/JSON Unicode tokens or reading order differ"
            max_error = max((abs(actual-point*scale) for observed, word in zip(extracted, expected) for actual, point in zip(observed[:4], word["bbox"])), default=0)
            assert max_error < .5, f"PDF/JSON coordinate drift: {max_error:.4f} pt"
            result["max_bbox_error_pt"] = max(result["max_bbox_error_pt"], max_error)
            result["pages"].append({"index": index, "words": len(expected), "ocr_ms": source["ocr_ms"], "text": " ".join(word["text"] for word in expected), "max_bbox_error_pt": max_error})
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf")
    parser.add_argument("json")
    parser.add_argument("--report")
    args = parser.parse_args()
    report = verify(args.pdf, args.json)
    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    if args.report:
        Path(args.report).write_text(rendered+"\n", encoding="utf-8")
    print(rendered)
