package org.aiebook.reader.scanner;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.text.PDFTextStripper;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.nio.file.Files;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class OfflineOcrTest {
    @Test public void bundledModelWorksWithoutNetworkAndExportsFrenchPdf() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals(android.content.pm.PackageManager.PERMISSION_DENIED,context.checkCallingOrSelfPermission("android.permission.INTERNET"));
        assertEquals("Run this test in airplane mode",1,android.provider.Settings.Global.getInt(context.getContentResolver(),android.provider.Settings.Global.AIRPLANE_MODE_ON,0));
        Bitmap bitmap=Bitmap.createBitmap(2200,1200,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(bitmap);canvas.drawColor(Color.WHITE);
        Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);paint.setColor(Color.BLACK);paint.setTextSize(52);paint.setTypeface(Typeface.createFromAsset(context.getAssets(),"fonts/DejaVuSans.ttf"));
        String[] lines={"Small words remain selectable at every zoom.","L'école française prépare déjà un café très apprécié.","Été Noël cœur garçon où à côté."};
        for(int i=0;i<lines.length;i++)canvas.drawText(lines[i],90,150+i*130,paint);
        long start=android.os.SystemClock.elapsedRealtime();List<OcrWord> words;long elapsed,repeat;
        try(OfflineOcrEngine engine=new OfflineOcrEngine()){
            words=engine.recognize(bitmap);elapsed=android.os.SystemClock.elapsedRealtime()-start;
            start=android.os.SystemClock.elapsedRealtime();List<OcrWord> again=engine.recognize(bitmap);repeat=android.os.SystemClock.elapsedRealtime()-start;
            assertEquals(words.stream().map(w->w.text).collect(Collectors.toList()),again.stream().map(w->w.text).collect(Collectors.toList()));
        }
        String text=words.stream().map(w->w.text).collect(Collectors.joining(" "));
        assertTrue("Actual OCR: "+text,text.contains("école"));assertTrue("Actual OCR: "+text,text.contains("française"));assertTrue("Actual OCR: "+text,text.contains("déjà"));assertTrue("Actual OCR: "+text,text.contains("café"));assertTrue("Actual OCR: "+text,text.contains("très"));
        File image=ImagePipeline.saveFinal(context,bitmap);DocumentExporter.Page page=new DocumentExporter.Page(image,bitmap.getWidth(),bitmap.getHeight(),words,elapsed);bitmap.recycle();
        DocumentExporter.Output output=DocumentExporter.export(context,List.of(page),new AtomicBoolean());
        PDFBoxResourceLoader.init(context);
        try(PDDocument pdf=PDDocument.load(output.pdf())){String extracted=new PDFTextStripper().getText(pdf);for(OcrWord word:words)assertTrue("Missing Unicode word "+word.text,extracted.contains(word.text));assertEquals(2200*DocumentExporter.PDF_POINTS_PER_PIXEL,pdf.getPage(0).getMediaBox().getWidth(),.01);}
        File validation=new File(context.getFilesDir(),"validation");validation.mkdirs();
        Files.write(new File(validation,"offline-benchmark.json").toPath(),new org.json.JSONObject().put("first_ms",elapsed).put("repeat_ms",repeat).put("airplane_mode",true).put("internet_permission",false).put("device",android.os.Build.MODEL).put("sdk",android.os.Build.VERSION.SDK_INT).toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        Files.copy(output.pdf().toPath(),new File(validation,"offline-control.pdf").toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        Files.copy(output.json().toPath(),new File(validation,"offline-control.json").toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        Files.copy(image.toPath(),new File(validation,"offline-control.png").toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        image.delete();
    }
    @Test public void perspectiveRotationAndInvalidCorners() throws Exception {
        Bitmap image=Bitmap.createBitmap(400,600,Bitmap.Config.ARGB_8888);image.eraseColor(Color.WHITE);
        Bitmap result=ImagePipeline.transform(image,new float[]{0,0,1,0,1,1,0,1},90,true);
        assertTrue(image.isRecycled());assertEquals(599,result.getWidth());assertEquals(399,result.getHeight());result.recycle();
        assertThrows(java.io.IOException.class,()->ImagePipeline.validateCorners(new float[]{0,0,100,100,100,0,0,100}));
    }
    @Test public void cancelledExportCreatesNoDocument() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        DocumentExporter.Page page=new DocumentExporter.Page(new File(context.getCacheDir(),"missing"),100,100,List.of(),0);
        assertThrows(InterruptedException.class,()->DocumentExporter.export(context,List.of(page),new AtomicBoolean(true)));
    }
    @Test public void blankPageAndMultipageExport() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        Bitmap image=Bitmap.createBitmap(500,400,Bitmap.Config.ARGB_8888);image.eraseColor(Color.WHITE);
        List<OcrWord> blank;try(OfflineOcrEngine engine=new OfflineOcrEngine()){blank=engine.recognize(image);}assertTrue(blank.isEmpty());
        File file=ImagePipeline.saveFinal(context,image);image.recycle();
        OcrWord word=new OcrWord("élève",20,30,100,60,new float[]{20,30,100,30,100,60,20,60},0);
        DocumentExporter.Output output=DocumentExporter.export(context,List.of(new DocumentExporter.Page(file,500,400,blank,0),new DocumentExporter.Page(file,500,400,List.of(word),0)),new AtomicBoolean());
        try(PDDocument pdf=PDDocument.load(output.pdf())){assertEquals(2,pdf.getNumberOfPages());assertTrue(new PDFTextStripper().getText(pdf).contains("élève"));}
        file.delete();output.pdf().delete();output.json().delete();
    }
    @Test public void smallColumnsAndSyntheticCurve() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        Context testContext=InstrumentationRegistry.getInstrumentation().getContext();
        org.json.JSONArray reference;
        try(java.io.InputStream in=testContext.getAssets().open("columns-reference.json")){reference=new org.json.JSONArray(new java.util.Scanner(in,"UTF-8").useDelimiter("\\A").next());}
        List<String> expected=new java.util.ArrayList<>();for(int i=0;i<reference.length();i++)expected.add(reference.getJSONObject(i).getString("text"));
        org.json.JSONArray metrics=new org.json.JSONArray();File validation=new File(context.getFilesDir(),"validation");validation.mkdirs();
        for(String name:new String[]{"english-french-columns","curved-columns"}){
            Bitmap bitmap;try(java.io.InputStream in=testContext.getAssets().open(name+".png")){bitmap=android.graphics.BitmapFactory.decodeStream(in);}
            List<OcrWord> words;long started=android.os.SystemClock.elapsedRealtime();try(OfflineOcrEngine engine=new OfflineOcrEngine()){words=engine.recognize(bitmap);}
            long elapsed=android.os.SystemClock.elapsedRealtime()-started;List<String> recognized=words.stream().map(w->w.text).collect(Collectors.toList());
            assertTrue(recognized.toString(),recognized.stream().anyMatch(w->w.contains("école")));
            boolean reachedRight=false;for(OcrWord word:words){if(word.left>1200)reachedRight=true;else assertFalse("Columns interleaved: "+recognized,reachedRight);}
            int errors=editDistance(expected,recognized);double wer=(double)errors/expected.size();
            File image=ImagePipeline.saveFinal(context,bitmap);DocumentExporter.Page page=new DocumentExporter.Page(image,bitmap.getWidth(),bitmap.getHeight(),words,elapsed);bitmap.recycle();
            DocumentExporter.Output output=DocumentExporter.export(context,List.of(page),new AtomicBoolean());
            for(File file:List.of(output.pdf(),output.json(),image)){String extension=file==output.pdf()?"pdf":file==output.json()?"json":"png";Files.copy(file.toPath(),new File(validation,"offline-"+name+"."+extension).toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);file.delete();}
            metrics.put(new org.json.JSONObject().put("case",name).put("words",words.size()).put("word_errors",errors).put("wer",wer).put("ocr_ms",elapsed).put("text",String.join(" ",recognized)));
            // A flat page must be read almost exactly. The synthetic book curve is a known open gap (no dewarp on Android
            // yet): its word error rate is recorded in the metrics file and the report, not hidden behind a loose threshold.
            if(name.equals("english-french-columns"))assertTrue("More than 5% word errors on a flat page: "+metrics,wer<=.05);
        }
        Files.write(new File(validation,"offline-small-curved-metrics.json").toPath(),metrics.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
    private static int editDistance(List<String> expected,List<String> actual){int[] previous=new int[actual.size()+1];for(int i=0;i<previous.length;i++)previous[i]=i;for(int i=0;i<expected.size();i++){int[] row=new int[actual.size()+1];row[0]=i+1;for(int j=0;j<actual.size();j++)row[j+1]=Math.min(Math.min(previous[j+1]+1,row[j]+1),previous[j]+(expected.get(i).equals(actual.get(j))?0:1));previous=row;}return previous[actual.size()];}
}
