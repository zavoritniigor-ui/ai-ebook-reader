package org.aiebook.reader.scanner;

import android.graphics.Bitmap;
import android.graphics.Point;
import android.graphics.Rect;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.util.ArrayList;
import java.util.List;

/** Bundled Latin model: no server, model download, or Google Play Services installation needed. */
public final class OfflineOcrEngine implements AutoCloseable {
    private final TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    public synchronized List<OcrWord> recognize(Bitmap finalImage) throws Exception {
        Text result=process(finalImage);
        List<OcrWord> words = new ArrayList<>(); int lineId=0;
        for(Text.TextBlock block:result.getTextBlocks()) for(Text.Line line:block.getLines()) {
            // Measured 2026-11-26: re-reading small lines enlarged added errors on a flat page (5 vs 2 of 66 words:
            // «cceur», lost «À» and punctuation) and changed nothing on a curved one, so whole-page results are used as-is.
            append(words,line.getElements(),0,0,1,1,finalImage.getWidth(),finalImage.getHeight(),lineId);
            lineId++;
        }
        return ReadingOrder.sort(words);
    }
    private Text process(Bitmap bitmap) throws Exception {
        com.google.android.gms.tasks.Task<Text> task=recognizer.process(InputImage.fromBitmap(bitmap,0));
        Text result;boolean interrupted=false;
        // ML Kit has no cancellation token here. Never release its bitmap while native work runs.
        while(true){try{result=Tasks.await(task);break;}catch(InterruptedException error){interrupted=true;}}
        if(interrupted){Thread.currentThread().interrupt();throw new InterruptedException("Cancelled after OCR completed");}
        return result;
    }
    private static void append(List<OcrWord> words,List<Text.Element> elements,float x,float y,float sx,float sy,int width,int height,int lineId){
            for(Text.Element element:elements) {
                Rect bounds=element.getBoundingBox(); if(bounds==null||bounds.isEmpty()||element.getText().trim().isEmpty()) continue;
                Point[] points=element.getCornerPoints(); float[] polygon;
                float l=clamp(x+bounds.left/sx,width),t=clamp(y+bounds.top/sy,height),r=clamp(x+bounds.right/sx,width),b=clamp(y+bounds.bottom/sy,height);
                if(points!=null&&points.length==4) { polygon=new float[8]; for(int i=0;i<4;i++){polygon[i*2]=clamp(x+points[i].x/sx,width);polygon[i*2+1]=clamp(y+points[i].y/sy,height);} }
                else polygon=new float[]{l,t,r,t,r,b,l,b};
                if(r>l&&b>t) words.add(new OcrWord(element.getText(),l,t,r,b,polygon,lineId));
            }
    }
    private static float clamp(float value,int max) {return Math.max(0,Math.min(max,value));}
    @Override public synchronized void close() {recognizer.close();}
}
