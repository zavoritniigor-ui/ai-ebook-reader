package org.aiebook.reader.scanner;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.net.Uri;
import androidx.exifinterface.media.ExifInterface;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

public final class ImagePipeline {
    public static final int MAX_SIDE = 4000;
    public static final long MAX_PIXELS = 80_000_000L, MAX_BYTES = 64L * 1024 * 1024;
    private ImagePipeline() {}
    public static File importImage(Context context, Uri uri) throws IOException {
        File file = File.createTempFile("source-", ".image", ScanSession.sessionDir(context));
        try (InputStream input = context.getContentResolver().openInputStream(uri); FileOutputStream output = new FileOutputStream(file)) {
            if (input == null) throw new IOException("Cannot open this image");
            byte[] buffer = new byte[65536]; long size = 0; int n;
            while ((n = input.read(buffer)) != -1) {
                size += n; if (size > MAX_BYTES) throw new IOException("Image exceeds 64 MB"); output.write(buffer, 0, n);
            }
            return file;
        } catch (IOException | RuntimeException error) { file.delete(); throw error; }
    }
    public static Bitmap decode(File file, int maxSide) throws IOException {
        BitmapFactory.Options info = new BitmapFactory.Options(); info.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(file.getPath(), info);
        if (info.outWidth <= 0 || info.outHeight <= 0 || (long)info.outWidth * info.outHeight > MAX_PIXELS) throw new IOException("Unsupported image or image exceeds 80 megapixels");
        BitmapFactory.Options options = new BitmapFactory.Options(); options.inPreferredConfig = Bitmap.Config.ARGB_8888;
        options.inSampleSize = 1;
        while (Math.max(info.outWidth, info.outHeight) / options.inSampleSize > maxSide * 1.4f) options.inSampleSize *= 2;
        Bitmap decoded = BitmapFactory.decodeFile(file.getPath(), options);
        if (decoded == null) throw new IOException("Image could not be decoded");
        try {
            ExifInterface exif = new ExifInterface(file);
            Matrix matrix = new Matrix();
            if (exif.isFlipped()) matrix.postScale(-1, 1);
            matrix.postRotate(exif.getRotationDegrees());
            Bitmap upright = Bitmap.createBitmap(decoded, 0, 0, decoded.getWidth(), decoded.getHeight(), matrix, true);
            if (upright != decoded) { decoded.recycle(); decoded = upright; }
            float scale = Math.min(1f, (float)maxSide / Math.max(decoded.getWidth(), decoded.getHeight()));
            if (scale < 1) {
                Bitmap smaller = Bitmap.createScaledBitmap(decoded, Math.max(1, Math.round(decoded.getWidth()*scale)), Math.max(1, Math.round(decoded.getHeight()*scale)), true);
                decoded.recycle(); decoded = smaller;
            }
            return decoded;
        } catch (IOException | RuntimeException error) { decoded.recycle(); throw error; }
    }
    public static Bitmap transform(Bitmap source, float[] normalizedCorners, int rotation, boolean clean) throws IOException {
        if (normalizedCorners.length != 8) throw new IOException("Four corners required");
        float[] corners = normalizedCorners.clone();
        for (int i=0;i<8;i+=2) { corners[i] *= source.getWidth()-1; corners[i+1] *= source.getHeight()-1; }
        validateCorners(corners);
        int width = Math.max(1, Math.round(Math.max(distance(corners,0,2),distance(corners,6,4))));
        int height = Math.max(1, Math.round(Math.max(distance(corners,0,6),distance(corners,2,4))));
        float scale = Math.min(1f, (float)MAX_SIDE/Math.max(width,height)); width = Math.round(width*scale); height = Math.round(height*scale);
        Matrix perspective = new Matrix();
        if (!perspective.setPolyToPoly(corners,0,new float[]{0,0,width,0,width,height,0,height},0,4)) throw new IOException("Invalid page corners");
        Bitmap out = Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);
        android.graphics.Canvas canvas = new android.graphics.Canvas(out); canvas.drawColor(Color.WHITE);
        canvas.drawBitmap(source,perspective,new android.graphics.Paint(android.graphics.Paint.FILTER_BITMAP_FLAG));
        source.recycle();
        if (rotation != 0) { Matrix rotate = new Matrix(); rotate.postRotate(rotation); Bitmap turned=Bitmap.createBitmap(out,0,0,width,height,rotate,true); out.recycle(); out=turned; }
        if (clean) {
            int[] row = new int[out.getWidth()];
            for(int y=0;y<out.getHeight();y++) {
                out.getPixels(row,0,row.length,0,y,row.length,1);
                for(int x=0;x<row.length;x++) { int p=row[x]; int gray=(Color.red(p)*30+Color.green(p)*59+Color.blue(p)*11)/100; int contrast=Math.max(0,Math.min(255,(gray-30)*255/210)); row[x]=Color.rgb(contrast,contrast,contrast); }
                out.setPixels(row,0,row.length,0,y,row.length,1);
            }
        }
        return out;
    }
    private static float distance(float[] a,int i,int j) { return (float)Math.hypot(a[i]-a[j],a[i+1]-a[j+1]); }
    static void validateCorners(float[] p) throws IOException {
        float sign=0;
        for(int i=0;i<4;i++) {
            int a=i*2,b=((i+1)%4)*2,c=((i+2)%4)*2;
            float cross=(p[b]-p[a])*(p[c+1]-p[b+1])-(p[b+1]-p[a+1])*(p[c]-p[b]);
            if (!Float.isFinite(cross)||Math.abs(cross)<1|| (i>0 && sign*cross<=0)) throw new IOException("Corners must form a convex page"); sign=cross;
        }
        if(distance(p,0,2)<32||distance(p,0,6)<32) throw new IOException("Selected page is too small");
    }
    public static File saveFinal(Context context, Bitmap bitmap) throws IOException {
        File file=File.createTempFile("page-", ".png", ScanSession.sessionDir(context));
        try(FileOutputStream out=new FileOutputStream(file)) { if(!bitmap.compress(Bitmap.CompressFormat.PNG,100,out)) throw new IOException("Cannot save page"); }
        catch(IOException|RuntimeException error) { file.delete(); throw error; }
        return file;
    }
}
