package org.aiebook.reader.scanner;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public final class MainActivity extends Activity {
    private static final int PICK=1,CAPTURE=2,SAVE_PDF=3,SAVE_JSON=4;
    private static final String RESTORE="scanner-session";
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final AtomicBoolean cancelled=new AtomicBoolean();
    // UI-thread state. It is written to ScanSession whenever Android may kill the process (camera, picker, save dialog).
    private ScanSession session;
    private CropView preview; private TextView status; private CheckBox clean;
    private boolean busy,destroyed;
    private OfflineOcrEngine engine; // Worker-thread confined; reuse the bundled model between pages.
    private final List<Button> editingButtons=new ArrayList<>();
    private Button pdfButton,jsonButton,shareButton,cancelButton;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        if(state!=null&&state.getBoolean(RESTORE))session=ScanSession.restore(this);
        else{ScanSession.discardLeftovers(this);session=new ScanSession();}
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(12,8,12,8);
        root.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(12,insets.getSystemWindowInsetTop()+8,12,insets.getSystemWindowInsetBottom()+8);return insets;});
        TextView title=new TextView(this);title.setText(R.string.title);title.setTextSize(22);root.addView(title);
        TextView help=new TextView(this);help.setText(R.string.help);root.addView(help);
        LinearLayout first=row(root);addButton(first,getString(R.string.pick_photo),this::pick,true);addButton(first,getString(R.string.camera),this::camera,true);
        preview=new CropView(this);root.addView(preview,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout edit=row(root);addButton(edit,getString(R.string.rotate),()->{session.rotation=(session.rotation+90)%360;show(getString(R.string.rotation,session.rotation));},true);
        clean=new CheckBox(this);clean.setText(R.string.enhance);edit.addView(clean);
        addButton(edit,getString(R.string.add_page),this::addPage,true);
        LinearLayout export=row(root);addButton(export,getString(R.string.create_pdf),this::export,true);addButton(export,getString(R.string.clear),this::clear,true);cancelButton=addButton(export,getString(R.string.cancel),()->{cancelled.set(true);show(getString(R.string.cancelling));},false);
        LinearLayout save=row(root);pdfButton=addButton(save,getString(R.string.save_pdf),()->save(SAVE_PDF),false);jsonButton=addButton(save,getString(R.string.save_json),()->save(SAVE_JSON),false);shareButton=addButton(save,getString(R.string.share),this::share,false);
        status=new TextView(this);status.setText(R.string.initial);status.setTextSize(14);root.addView(status);setContentView(root);updateButtons();
        if(session.input!=null)showInput(session.input,session.rotation);
        else if(!session.pages.isEmpty())show(session.exported!=null?getString(R.string.export_ready,session.pages.size()):getString(R.string.check_corners,session.pages.size()));
    }
    @Override protected void onSaveInstanceState(Bundle out){
        super.onSaveInstanceState(out);
        try{session.save(this);out.putBoolean(RESTORE,true);}catch(Exception error){/* The next start is then a clean session. */}
    }
    private LinearLayout row(LinearLayout root){LinearLayout row=new LinearLayout(this);row.setOrientation(LinearLayout.HORIZONTAL);root.addView(row);return row;}
    private Button addButton(LinearLayout row,String label,Runnable action,boolean editing){Button button=new Button(this);button.setText(label);button.setTextSize(12);button.setAllCaps(false);row.addView(button,new LinearLayout.LayoutParams(0,-2,1));button.setOnClickListener(v->action.run());if(editing)editingButtons.add(button);return button;}
    private void pick(){Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.setType("image/*");intent.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(intent,PICK);}
    private void camera(){
        File file=null;
        try{
            dropCapture();
            file=File.createTempFile("camera-",".jpg",ScanSession.captureDir(this));
            Uri uri=FileProvider.getUriForFile(this,getPackageName()+".files",file);
            Intent intent=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);intent.putExtra(MediaStore.EXTRA_OUTPUT,uri);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);intent.setClipData(ClipData.newRawUri("Camera output",uri));
            session.capture=file;file=null;
            startActivityForResult(intent,CAPTURE);
        }catch(Exception error){if(file!=null)file.delete();dropCapture();showError(error);}
    }
    private void dropCapture(){if(session.capture!=null){session.capture.delete();session.capture=null;}}
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==CAPTURE){
            File shot=session.capture;session.capture=null;
            // A cancelled or failed camera leaves an empty temporary file behind; it is removed either way.
            if(result!=RESULT_OK||shot==null||!shot.isFile()||shot.length()==0){if(shot!=null)shot.delete();return;}
            load(Uri.fromFile(shot),shot);return;
        }
        if(result!=RESULT_OK)return;
        if(request==PICK&&data!=null&&data.getData()!=null)load(data.getData(),null);
        else if((request==SAVE_PDF||request==SAVE_JSON)&&data!=null&&data.getData()!=null&&session.exported!=null)copyTo(request==SAVE_PDF?session.exported.pdf():session.exported.json(),data.getData());
    }
    private void copyTo(File source,Uri destination){
        if(!runJob(()->{
            boolean complete=false;
            try(InputStream in=new FileInputStream(source);OutputStream out=getContentResolver().openOutputStream(destination,"wt")){
                if(out==null)throw new java.io.IOException("Cannot save file");
                byte[] buffer=new byte[65536];int count;
                while((count=in.read(buffer))!=-1){DocumentExporter.checkCancelled(cancelled);out.write(buffer,0,count);}
                out.flush();complete=true;
            }finally{
                // The user chose a new document for this file: a partial copy is removed instead of left looking like a PDF.
                if(!complete)try{DocumentsContract.deleteDocument(getContentResolver(),destination);}catch(Exception ignored){}
            }
            ui(()->show(getString(R.string.saved,source.getName())));
        }))show(getString(R.string.busy));
    }
    /** owned: a private file (the camera shot) that this load consumes, whether it succeeds or not. */
    private void load(Uri uri,File owned){
        if(!runJob(()->{
            File next=null;Bitmap bitmap=null;
            try{
                next=ImagePipeline.importImage(this,uri);
                bitmap=ImagePipeline.decode(next,1800);DocumentExporter.checkCancelled(cancelled);
                Bitmap shown=bitmap;File chosen=next;bitmap=null;next=null;
                uiOrElse(()->{if(session.input!=null)session.input.delete();session.input=chosen;session.rotation=0;preview.setImage(shown);show(getString(R.string.check_corners,session.pages.size()));},
                        ()->{shown.recycle();chosen.delete();});
            }finally{if(bitmap!=null)bitmap.recycle();if(next!=null)next.delete();if(owned!=null)owned.delete();}
        })){if(owned!=null)owned.delete();show(getString(R.string.busy));}
    }
    /** After the process was recreated: show the photo the user was framing (the corners start again from the full photo). */
    private void showInput(File file,int turn){
        runJob(()->{
            Bitmap bitmap=ImagePipeline.decode(file,1800);
            uiOrElse(()->{session.rotation=turn;preview.setImage(bitmap);show(getString(R.string.check_corners,session.pages.size()));},bitmap::recycle);
        });
    }
    private void addPage(){
        if(session.input==null){show(getString(R.string.choose_first));return;}
        if(session.pages.size()>=20){show(getString(R.string.page_limit));return;}
        File source=session.input;float[] corners=preview.getCorners();int turn=session.rotation;boolean filter=clean.isChecked();
        runJob(()->{
            Bitmap bitmap=null;File finalFile=null;
            try{
                if(engine==null)engine=new OfflineOcrEngine();
                bitmap=ImagePipeline.decode(source,ImagePipeline.MAX_SIDE);DocumentExporter.checkCancelled(cancelled);
                Bitmap decoded=bitmap;bitmap=null;
                bitmap=ImagePipeline.transform(decoded,corners,turn,filter); // transform owns and recycles the decoded bitmap
                DocumentExporter.checkCancelled(cancelled);
                finalFile=ImagePipeline.saveFinal(this,bitmap);
                long start=android.os.SystemClock.elapsedRealtime();
                // recognize() returns only after ML Kit has finished with this bitmap, even when cancelled.
                List<OcrWord> words=engine.recognize(bitmap);long ms=android.os.SystemClock.elapsedRealtime()-start;
                DocumentExporter.checkCancelled(cancelled);
                DocumentExporter.Page page=new DocumentExporter.Page(finalFile,bitmap.getWidth(),bitmap.getHeight(),words,ms);File kept=finalFile;finalFile=null;
                uiOrElse(()->{session.pages.add(page);if(session.input==source){source.delete();session.input=null;}preview.setImage(null);invalidateExport();show(getString(R.string.page_added,session.pages.size(),words.size(),ms));},
                        kept::delete);
            }finally{if(bitmap!=null&&!bitmap.isRecycled())bitmap.recycle();if(finalFile!=null)finalFile.delete();}
        });
    }
    private void export(){
        if(session.pages.isEmpty()){show(getString(R.string.add_first));return;}
        List<DocumentExporter.Page> copy=new ArrayList<>(session.pages);
        runJob(()->{
            DocumentExporter.Output output=DocumentExporter.export(this,copy,cancelled);
            uiOrElse(()->{
                // Cancel pressed after the exporter's last check but before this runs on the UI thread.
                if(cancelled.get()){output.pdf().delete();output.json().delete();show(getString(R.string.cancelled));return;}
                invalidateExport();session.exported=output;show(getString(R.string.export_ready,copy.size()));
            },()->{output.pdf().delete();output.json().delete();});
        });
    }
    private void save(int request){if(session.exported==null)return;File file=request==SAVE_PDF?session.exported.pdf():session.exported.json();Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(request==SAVE_PDF?"application/pdf":"application/json");intent.putExtra(Intent.EXTRA_TITLE,file.getName());startActivityForResult(intent,request);}
    private void share(){if(session.exported==null)return;Uri uri=FileProvider.getUriForFile(this,getPackageName()+".files",session.exported.pdf());Intent intent=new Intent(Intent.ACTION_SEND);intent.setType("application/pdf");intent.putExtra(Intent.EXTRA_STREAM,uri);intent.setClipData(ClipData.newRawUri("Scanned PDF",uri));intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(Intent.createChooser(intent,getString(R.string.share_title)));}
    private void clear(){if(session.input!=null){session.input.delete();session.input=null;}dropCapture();preview.setImage(null);for(DocumentExporter.Page page:session.pages)page.image().delete();session.pages.clear();invalidateExport();show(getString(R.string.initial));updateButtons();}
    private void invalidateExport(){if(session.exported!=null){session.exported.pdf().delete();session.exported.json().delete();session.exported=null;}}
    private interface Job{void run()throws Exception;}
    /** Returns false when another job is still running and this one was not started. */
    private boolean runJob(Job job){
        if(busy)return false;busy=true;cancelled.set(false);show(getString(R.string.processing));updateButtons();
        worker.execute(()->{try{job.run();}catch(Exception|OutOfMemoryError error){ui(()->showError(error));}finally{ui(()->{busy=false;updateButtons();});}});
        return true;
    }
    private void ui(Runnable action){uiOrElse(action,null);}
    /** Results that reach a destroyed activity are released (files deleted, bitmaps recycled) instead of leaking. */
    private void uiOrElse(Runnable action,Runnable discard){runOnUiThread(()->{if(!destroyed){action.run();updateButtons();}else if(discard!=null)discard.run();});}
    private void updateButtons(){boolean ready=!busy&&session!=null&&session.exported!=null;for(Button button:editingButtons)button.setEnabled(!busy);if(preview!=null)preview.setEnabled(!busy);if(clean!=null)clean.setEnabled(!busy);if(cancelButton!=null)cancelButton.setEnabled(busy);if(pdfButton!=null){pdfButton.setEnabled(ready);jsonButton.setEnabled(ready);shareButton.setEnabled(ready);}}
    private void show(String message){if(status!=null)status.setText(message);}
    private void showError(Throwable error){show(error instanceof InterruptedException?getString(R.string.cancelled):getString(R.string.error,error.getMessage()==null?error.getClass().getSimpleName():error.getMessage()));}
    @Override protected void onDestroy(){
        destroyed=true;cancelled.set(true);
        boolean finishing=isFinishing()&&!isChangingConfigurations();
        // A job still running ends first (single worker), then the model is closed and, if the user left, the working copies go.
        worker.execute(()->{if(engine!=null){engine.close();engine=null;}if(finishing)ScanSession.discard(this);});
        worker.shutdown();preview.setImage(null);super.onDestroy();
    }
}
