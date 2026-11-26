import unittest, io
import sys
from types import SimpleNamespace
from unittest.mock import Mock, patch
from PIL import Image
from pypdf import PdfReader
from pdf_helpers import text_boxes
import server
from fastapi.testclient import TestClient

class Tests(unittest.TestCase):
    def test_geometry(self):
        words=server.normalize({"text_word":[["Bonjour","école"]],
          "text_word_boxes":[[[10,20,100,45],[120,20,180,45]]]},200,100)
        self.assertEqual(words[1]["bbox"],[120,20,180,45])
        self.assertEqual(words[1]["text"],"école")
    def test_missing_geometry(self):
        with self.assertRaises(ValueError):
            server.normalize({"rec_texts":["hello"]},200,100)
    def test_blank_geometry(self):
        self.assertEqual(server.normalize({"rec_texts":[]},200,100),[])
    def test_sloped_line_does_not_collapse_word_height(self):
        result={"text_word":[["été"]],"text_word_boxes":[[[20,40,70,43]]],
                "rec_polys":[[[10,40],[180,10],[180,45],[10,75]]]}
        self.assertEqual(server.normalize(result,200,100)[0]["bbox"],[20,10,70,75])
    def test_blank_model_result_without_word_regions(self):
        engine=Mock()
        engine.predict.side_effect=[KeyError("text_word_region"), [{"rec_texts":[]}]]
        fake=SimpleNamespace(PaddleOCR=None,DocPreprocessor=None)
        with patch.dict(sys.modules,{"paddleocr":fake}), patch.object(server,"_engine",engine):
            image,words=server.recognize(Image.new("RGB",(50,80)),False)
        self.assertEqual(words,[])
        self.assertEqual(image.size,(50,80))
        self.assertEqual(engine.predict.call_args.kwargs,{"return_word_box":False})
    def test_missing_word_regions_cannot_discard_recognized_text(self):
        engine=Mock()
        engine.predict.side_effect=[KeyError("text_word_region"), [{"rec_texts":["bonjour"]}]]
        fake=SimpleNamespace(PaddleOCR=None,DocPreprocessor=None)
        with patch.dict(sys.modules,{"paddleocr":fake}), patch.object(server,"_engine",engine):
            with self.assertRaises(KeyError):
                server.recognize(Image.new("RGB",(50,80)),False)
    def test_mismatch(self):
        with self.assertRaises(ValueError):
            server.normalize({"text_word":[["a","b"]],"text_word_boxes":[[[1,1,2,2]]]},200,100)
    def test_pdf(self):
        im=Image.new("RGB",(800,1000),"white")
        words=[{"text":"Bonjour","bbox":[100,200,250,240]},{"text":"école","bbox":[300,200,400,240]}]
        data=server.render_pdf(im,words)
        doc=PdfReader(io.BytesIO(data))
        self.assertEqual(doc.pages[0].extract_text().split(),["Bonjour","école"])
        for actual,expected in zip(text_boxes(doc.pages[0]),words):
                for a,b in zip(actual[:4],expected["bbox"]):
                    self.assertAlmostEqual(a,b*.842,delta=.2)
    def test_decode(self):
        b=io.BytesIO(); Image.new("RGB",(50,80)).save(b,"PNG")
        self.assertEqual(server.decode(b.getvalue()).size,(50,80))
    def test_pdf_preserves_explicit_spaces_between_touching_boxes(self):
        words=[{"text":"Le","bbox":[20,20,50,40]},
               {"text":"prix","bbox":[50,20,100,40]}]
        data=server.render_pdf(Image.new("RGB",(200,100),"white"),words)
        document=PdfReader(io.BytesIO(data))
        self.assertEqual(document.pages[0].extract_text().split(),["Le","prix"])
    def test_auth(self):
        self.assertEqual(TestClient(server.app).post("/v1/ocr",content=b"bad").status_code,401)

if __name__=="__main__": unittest.main()
