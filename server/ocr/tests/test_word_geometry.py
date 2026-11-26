import unittest
from types import SimpleNamespace

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from word_geometry import configure_word_decoder, reading_order, refine_word_boxes, unicode_word_info


class WordGeometryTests(unittest.TestCase):
    def test_accents_apostrophes_and_punctuation_keep_alignment(self):
        text = "L'école française, cœur et déjà-vu."
        selection = np.zeros(len(text) * 3, dtype=bool)
        selection[1::3] = True
        words, columns, states = unicode_word_info(None, text, selection)
        self.assertEqual(["".join(word) for word in words],
                         ["L'école", "française,", "cœur", "et", "déjà-vu."])
        self.assertEqual(columns[0], [1, 4, 7, 10, 13, 16, 19])
        self.assertEqual(columns[1][0], 25)
        self.assertEqual(states, ["en&num"] * 5)

    def test_blank_and_combining_accents(self):
        self.assertEqual(unicode_word_info(None, "", np.zeros(5, dtype=bool)),
                         ([], [], []))
        text = "e\u0301cole  où"
        words, columns, _ = unicode_word_info(None, text, np.ones(len(text), dtype=bool))
        self.assertEqual(["".join(word) for word in words], ["e\u0301cole", "où"])
        self.assertEqual(columns[1], [8, 9])

    def test_mismatched_alignment_fails_closed(self):
        with self.assertRaises(ValueError):
            unicode_word_info(None, "école", np.ones(4, dtype=bool))

    def test_adapter_changes_only_selected_decoder(self):
        decoder = SimpleNamespace(get_word_info=lambda *_: None)
        untouched = SimpleNamespace(get_word_info=lambda *_: "unchanged")
        engine = SimpleNamespace(paddlex_pipeline=SimpleNamespace(
            text_rec_model=SimpleNamespace(post_op=decoder)))
        configure_word_decoder(engine)
        words, _, _ = decoder.get_word_info("Noël", np.ones(4, dtype=bool))
        self.assertEqual(words, [list("Noël")])
        self.assertEqual(untouched.get_word_info(), "unchanged")

    def test_columns_follow_header_then_left_column_then_right(self):
        words = [{"text": text, "line": line, "bbox": box} for text, line, box in [
            ("heading", 0, [10, 0, 500, 20]),
            ("left-one", 1, [10, 80, 180, 100]),
            ("right-one", 2, [300, 79, 490, 99]),
            ("left-two", 3, [10, 115, 180, 135]),
            ("right-two", 4, [300, 114, 490, 134]),
            ("footer", 5, [10, 210, 500, 230])]]
        ordered = reading_order(words)
        self.assertEqual([word["text"] for word in ordered],
                         ["heading", "left-one", "left-two", "right-one", "right-two", "footer"])
        self.assertEqual([word["line"] for word in ordered], list(range(6)))

    def test_empty_reading_order(self):
        self.assertEqual(reading_order([]), [])

    def test_ink_refinement_keeps_short_word_and_accent(self):
        image = Image.new("RGB", (250, 100), "white")
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 48)
        ImageDraw.Draw(image).text((30, 15), "À", fill="black", font=font)
        mask = np.asarray(image)[:, :, 0] < 128
        vertical, horizontal = np.where(mask)
        expected = [horizontal.min(), vertical.min(), horizontal.max() + 1, vertical.max() + 1]
        words = [{"text": "À", "line": 0, "bbox": [40, 10, 51, 80]}]
        refined = refine_word_boxes(image, words)
        self.assertEqual(refined[0]["text"], "À")
        for actual, target in zip(refined[0]["bbox"], expected):
            self.assertLessEqual(abs(actual - target), 1)

    def test_ink_refinement_does_not_consume_adjacent_word(self):
        image = Image.new("RGB", (250, 100), "white")
        draw = ImageDraw.Draw(image)
        draw.rectangle((20, 30, 39, 49), fill="black")
        draw.rectangle((70, 30, 89, 49), fill="black")
        words = [{"text": "A", "line": 0, "bbox": [27, 0, 32, 80]},
                 {"text": "B", "line": 0, "bbox": [77, 0, 82, 80]}]
        self.assertEqual([word["bbox"] for word in refine_word_boxes(image, words)],
                         [[20, 30, 40, 50], [70, 30, 90, 50]])

    def test_blank_refinement_preserves_geometry(self):
        words = [{"text": "missing", "line": 0, "bbox": [10, 10, 80, 40]}]
        self.assertEqual(refine_word_boxes(Image.new("RGB", (100, 100), "white"), words), words)

    def test_word_boundary_uses_white_gap_instead_of_trimming_a_glyph(self):
        image = Image.new("RGB", (200, 100), "white")
        draw = ImageDraw.Draw(image)
        draw.rectangle((20, 30, 39, 49), fill="black")
        draw.rectangle((50, 30, 69, 49), fill="black")
        words = [{"text": "A", "line": 0, "bbox": [25, 0, 30, 80]},
                 {"text": "B", "line": 0, "bbox": [40, 0, 65, 80]}]
        self.assertEqual([word["bbox"] for word in refine_word_boxes(image, words)],
                         [[20, 30, 40, 50], [50, 30, 70, 50]])
