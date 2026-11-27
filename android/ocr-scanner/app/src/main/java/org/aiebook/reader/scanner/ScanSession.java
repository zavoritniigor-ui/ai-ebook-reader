package org.aiebook.reader.scanner;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

/**
 * The working session survives Android killing the process while the camera, picker or save dialog is open.
 * Every file it names lives in app-private storage (never the cache, which Android may trim in the background).
 */
public final class ScanSession {
    public File input, capture;
    public int rotation;
    public final List<DocumentExporter.Page> pages = new ArrayList<>();
    public DocumentExporter.Output exported;

    private static final long EXPORT_KEEP_MS = 24L * 60 * 60 * 1000;
    public static File sessionDir(Context context) { return directory(context, "session"); }
    public static File captureDir(Context context) { return directory(context, "capture"); }
    public static File exportDir(Context context) { return directory(context, "exports"); }
    private static File directory(Context context, String name) {
        File dir = new File(context.getFilesDir(), name);
        if (!dir.mkdirs() && !dir.isDirectory()) throw new IllegalStateException("Cannot create " + name);
        return dir;
    }
    private static File stateFile(Context context) { return new File(sessionDir(context), "state.json"); }

    /** Fresh start: nothing from an earlier session is reachable any more, so its files go. Recent exports stay for apps they were shared with. */
    public static void discardLeftovers(Context context) {
        wipe(sessionDir(context)); wipe(captureDir(context));
        File[] cache = context.getCacheDir().listFiles();
        if (cache != null) for (File f : cache) if (f.isFile() && (f.getName().startsWith("source-") || f.getName().startsWith("page-"))) f.delete();
        File[] exports = exportDir(context).listFiles();
        long now = System.currentTimeMillis();
        if (exports != null) for (File f : exports) if (now - f.lastModified() > EXPORT_KEEP_MS) f.delete();
    }
    /** The user closed the scanner: the working copies are no longer needed. */
    public static void discard(Context context) { wipe(sessionDir(context)); wipe(captureDir(context)); }
    private static void wipe(File dir) { File[] files = dir.listFiles(); if (files != null) for (File f : files) if (f.isFile()) f.delete(); }

    public void save(Context context) throws IOException {
        try {
            JSONObject state = new JSONObject().put("schema", 1).put("rotation", rotation);
            if (input != null) state.put("input", input.getName());
            if (capture != null) state.put("capture", capture.getName());
            if (exported != null) state.put("pdf", exported.pdf().getName()).put("json", exported.json().getName());
            JSONArray list = new JSONArray();
            for (DocumentExporter.Page page : pages) {
                JSONArray words = new JSONArray();
                for (OcrWord w : page.words()) words.put(new JSONObject().put("t", w.text).put("b", new JSONArray(new float[]{w.left, w.top, w.right, w.bottom}))
                        .put("p", new JSONArray(w.polygon)).put("l", w.line));
                list.put(new JSONObject().put("image", page.image().getName()).put("w", page.width()).put("h", page.height()).put("ms", page.elapsedMs()).put("words", words));
            }
            state.put("pages", list);
            File target = stateFile(context), temp = new File(target.getPath() + ".tmp");
            try (FileOutputStream out = new FileOutputStream(temp)) { out.write(state.toString().getBytes(StandardCharsets.UTF_8)); out.getFD().sync(); }
            if (!temp.renameTo(target)) { temp.delete(); throw new IOException("Cannot store the scanner session"); }
        } catch (org.json.JSONException error) { throw new IOException(error); }
    }

    /** Restores what still exists on disk; a page whose image was lost is dropped instead of producing a broken PDF. */
    public static ScanSession restore(Context context) {
        ScanSession session = new ScanSession();
        File file = stateFile(context);
        if (!file.isFile()) return session;
        try {
            JSONObject state = new JSONObject(new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8));
            if (state.optInt("schema") != 1) return session;
            session.rotation = Math.floorMod(state.optInt("rotation"), 360) / 90 * 90;
            session.input = existing(sessionDir(context), state.optString("input", null));
            session.capture = named(captureDir(context), state.optString("capture", null));
            File pdf = existing(exportDir(context), state.optString("pdf", null)), json = existing(exportDir(context), state.optString("json", null));
            if (pdf != null && json != null) session.exported = new DocumentExporter.Output(pdf, json);
            JSONArray list = state.optJSONArray("pages");
            for (int i = 0; list != null && i < list.length() && session.pages.size() < 20; i++) {
                JSONObject p = list.getJSONObject(i);
                File image = existing(sessionDir(context), p.optString("image", null));
                if (image == null) continue;
                List<OcrWord> words = new ArrayList<>();
                JSONArray ws = p.getJSONArray("words");
                for (int j = 0; j < ws.length(); j++) {
                    JSONObject w = ws.getJSONObject(j); JSONArray b = w.getJSONArray("b"), poly = w.getJSONArray("p");
                    float[] polygon = new float[poly.length()];
                    for (int k = 0; k < polygon.length; k++) polygon[k] = (float) poly.getDouble(k);
                    words.add(new OcrWord(w.getString("t"), (float) b.getDouble(0), (float) b.getDouble(1), (float) b.getDouble(2), (float) b.getDouble(3), polygon, w.getInt("l")));
                }
                session.pages.add(new DocumentExporter.Page(image, p.getInt("w"), p.getInt("h"), words, p.optLong("ms")));
            }
        } catch (Exception error) {
            // A damaged state file must not crash the scanner; the user starts over with a clean session.
            ScanSession empty = new ScanSession();
            return empty;
        }
        return session;
    }
    /** Only a plain file name inside the given private directory is accepted. */
    private static File named(File dir, String name) {
        if (name == null || name.isEmpty() || name.contains("/") || name.contains("\\") || name.startsWith(".")) return null;
        return new File(dir, name);
    }
    private static File existing(File dir, String name) { File f = named(dir, name); return f != null && f.isFile() ? f : null; }
}
