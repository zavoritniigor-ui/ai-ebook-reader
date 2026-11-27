package org.aiebook.reader.scanner;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.view.View;

/** Four handles use normalized coordinates; display scale never reaches OCR coordinates. */
public final class CropView extends View {
    private Bitmap bitmap;
    private final float[] corners={0,0,1,0,1,1,0,1};
    private final RectF display=new RectF();
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
    private final Path path=new Path();
    private int active=-1;
    public CropView(Context context){super(context);setContentDescription(context.getString(R.string.crop_description));}
    public void setImage(Bitmap next){if(bitmap!=null&&bitmap!=next)bitmap.recycle();bitmap=next;float[] reset={0,0,1,0,1,1,0,1};System.arraycopy(reset,0,corners,0,8);invalidate();}
    public float[] getCorners(){return corners.clone();}
    @Override protected void onDraw(Canvas canvas){
        super.onDraw(canvas);canvas.drawColor(Color.rgb(35,38,42));if(bitmap==null)return;
        float padding=24*getResources().getDisplayMetrics().density;
        float scale=Math.min((getWidth()-padding*2)/bitmap.getWidth(),(getHeight()-padding*2)/bitmap.getHeight());
        float w=bitmap.getWidth()*scale,h=bitmap.getHeight()*scale;display.set((getWidth()-w)/2,(getHeight()-h)/2,(getWidth()+w)/2,(getHeight()+h)/2);
        canvas.drawBitmap(bitmap,null,display,paint);
        path.reset();path.moveTo(x(0),y(0));for(int i=1;i<4;i++)path.lineTo(x(i),y(i));path.close();
        paint.setColor(Color.rgb(30,144,255));paint.setStrokeWidth(3*getResources().getDisplayMetrics().density);paint.setStyle(Paint.Style.STROKE);canvas.drawPath(path,paint);
        paint.setStyle(Paint.Style.FILL);for(int i=0;i<4;i++)canvas.drawCircle(x(i),y(i),10*getResources().getDisplayMetrics().density,paint);
    }
    private float x(int i){return display.left+corners[i*2]*display.width();}
    private float y(int i){return display.top+corners[i*2+1]*display.height();}
    @Override public boolean onTouchEvent(MotionEvent event){
        if(bitmap==null||display.isEmpty()||!isEnabled())return false;
        if(event.getActionMasked()==MotionEvent.ACTION_DOWN){
            float best=56*getResources().getDisplayMetrics().density;active=-1;
            for(int i=0;i<4;i++){float d=(float)Math.hypot(event.getX()-x(i),event.getY()-y(i));if(d<best){best=d;active=i;}}
            return active>=0;
        }
        if(event.getActionMasked()==MotionEvent.ACTION_MOVE&&active>=0){corners[active*2]=Math.max(0,Math.min(1,(event.getX()-display.left)/display.width()));corners[active*2+1]=Math.max(0,Math.min(1,(event.getY()-display.top)/display.height()));invalidate();return true;}
        if(event.getActionMasked()==MotionEvent.ACTION_UP||event.getActionMasked()==MotionEvent.ACTION_CANCEL){active=-1;performClick();return true;}
        return active>=0;
    }
    @Override public boolean performClick(){super.performClick();return true;}
}
