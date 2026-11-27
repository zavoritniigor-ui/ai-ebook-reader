package org.aiebook.reader.scanner;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader;
import com.tom_roush.pdfbox.io.MemoryUsageSetting;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.pdmodel.PDPage;
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream;
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle;
import com.tom_roush.pdfbox.pdmodel.font.PDType0Font;
import com.tom_roush.pdfbox.pdmodel.graphics.image.PDImageXObject;
import com.tom_roush.pdfbox.pdmodel.graphics.state.RenderingMode;
import com.tom_roush.pdfbox.util.Matrix;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

public final class DocumentExporter {
    public static final float PDF_POINTS_PER_PIXEL=72f/300f;
    public record Page(File image, int width, int height, List<OcrWord> words, long elapsedMs) {}
    public record Output(File pdf,File json) {}
    private DocumentExporter() {}
    public static Output export(Context context,List<Page> pages,AtomicBoolean cancelled) throws Exception {return export(context,pages,(java.util.function.BooleanSupplier)cancelled::get);}
    public static Output export(Context context,List<Page> pages,java.util.function.BooleanSupplier cancelled) throws Exception {
        if(pages.isEmpty()||pages.size()>20) throw new IllegalArgumentException("Choose 1 to 20 pages");
        PDFBoxResourceLoader.init(context);
        File directory=new File(context.getFilesDir(),"exports"); if(!directory.mkdirs()&&!directory.isDirectory()) throw new java.io.IOException("Cannot create export directory");
        String name="Reader-scan-"+System.currentTimeMillis(); File pdf=new File(directory,name+".pdf"),json=new File(directory,name+".json");
        JSONArray jsonPages=new JSONArray();
        try(PDDocument document=new PDDocument(MemoryUsageSetting.setupTempFileOnly());InputStream fontInput=context.getAssets().open("fonts/DejaVuSans.ttf")) {
            PDType0Font font=PDType0Font.load(document,fontInput,true);
            float ascent=font.getFontDescriptor().getAscent()/1000f,descent=font.getFontDescriptor().getDescent()/1000f;
            for(Page input:pages) {
                checkCancelled(cancelled);
                float pageWidth=input.width()*PDF_POINTS_PER_PIXEL,pageHeight=input.height()*PDF_POINTS_PER_PIXEL;
                PDPage page=new PDPage(new PDRectangle(pageWidth,pageHeight)); document.addPage(page);
                JSONArray words=new JSONArray();
                try(PDPageContentStream content=new PDPageContentStream(document,page)) {
                    PDImageXObject image=PDImageXObject.createFromFileByContent(input.image(),document);
                    content.drawImage(image,0,0,pageWidth,pageHeight);
                    for(OcrWord word:input.words()) {
                        float advance=font.getStringWidth(word.text)/1000f;
                        if(advance<=0) continue;
                        float sx=(word.right-word.left)*PDF_POINTS_PER_PIXEL/advance,sy=(word.bottom-word.top)*PDF_POINTS_PER_PIXEL/(ascent-descent);
                        content.beginText(); content.setFont(font,1); content.setRenderingMode(RenderingMode.NEITHER);
                        content.setTextMatrix(new Matrix(sx,0,0,sy,word.left*PDF_POINTS_PER_PIXEL,(input.height()-word.bottom)*PDF_POINTS_PER_PIXEL-descent*sy));
                        content.showText(word.text+" "); content.endText();
                        words.put(new JSONObject().put("text",word.text).put("bbox",new JSONArray(new float[]{word.left,word.top,word.right,word.bottom})).put("polygon",new JSONArray(word.polygon)).put("line",word.line));
                    }
                }
                jsonPages.put(new JSONObject().put("width",input.width()).put("height",input.height()).put("words",words).put("ocr_ms",input.elapsedMs()));
            }
            checkCancelled(cancelled);document.save(pdf);
            JSONObject metadata=new JSONObject().put("schema","reader-offline-ocr/v1").put("engine","ML Kit bundled Latin 16.0.1").put("coordinate_space","final-image-pixels-top-left").put("pdf_points_per_pixel",PDF_POINTS_PER_PIXEL).put("pages",jsonPages);
            try(FileOutputStream output=new FileOutputStream(json)) {output.write(metadata.toString(2).getBytes(StandardCharsets.UTF_8));}
            // A cancel pressed while the files were written still wins: nothing is offered for saving.
            checkCancelled(cancelled);
            return new Output(pdf,json);
        } catch(Exception error) {pdf.delete();json.delete();throw error;}
    }
    public static void checkCancelled(AtomicBoolean cancelled) throws InterruptedException {if(cancelled.get()||Thread.currentThread().isInterrupted())throw new InterruptedException("Cancelled");}
    static void checkCancelled(java.util.function.BooleanSupplier cancelled) throws InterruptedException {if(cancelled.getAsBoolean()||Thread.currentThread().isInterrupted())throw new InterruptedException("Cancelled");}
}
