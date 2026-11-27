package org.aiebook.reader.scanner;

import android.app.Activity;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Session survival, temporary-file cleanup and late cancellation. */
@RunWith(AndroidJUnit4.class)
public class LifecycleTest {
    private static Context context() { return InstrumentationRegistry.getInstrumentation().getTargetContext(); }
    private static File pageImage(Context context) throws Exception {
        Bitmap image = Bitmap.createBitmap(300, 200, Bitmap.Config.ARGB_8888); image.eraseColor(Color.WHITE);
        try { return ImagePipeline.saveFinal(context, image); } finally { image.recycle(); }
    }
    private static OcrWord word(String text) { return new OcrWord(text, 10, 20, 90, 50, new float[]{10, 20, 90, 20, 90, 50, 10, 50}, 3); }
    private static ScanSession sessionOf(Activity activity) throws Exception {
        Field f = MainActivity.class.getDeclaredField("session"); f.setAccessible(true); return (ScanSession) f.get(activity);
    }
    private static void waitFor(java.util.function.BooleanSupplier condition) throws InterruptedException {
        for (int i = 0; i < 100 && !condition.getAsBoolean(); i++) Thread.sleep(50);
    }

    @Test public void sessionRoundTripKeepsPagesWordsAndAccents() throws Exception {
        Context context = context(); ScanSession.discard(context);
        ScanSession session = new ScanSession();
        File image = pageImage(context);
        session.pages.add(new DocumentExporter.Page(image, 300, 200, List.of(word("l'école"), word("cœur")), 123));
        session.rotation = 270; session.input = pageImage(context);
        session.save(context);
        ScanSession back = ScanSession.restore(context);
        assertEquals(1, back.pages.size()); assertEquals(270, back.rotation);
        assertEquals(session.input, back.input);
        DocumentExporter.Page page = back.pages.get(0);
        assertEquals(image, page.image()); assertEquals(300, page.width()); assertEquals(123, page.elapsedMs());
        assertEquals("l'école", page.words().get(0).text); assertEquals("cœur", page.words().get(1).text);
        assertEquals(3, page.words().get(0).line); assertEquals(90, page.words().get(0).right, 0);
        image.delete(); // a page whose image vanished is dropped, not exported broken
        assertEquals(0, ScanSession.restore(context).pages.size());
        ScanSession.discard(context);
    }

    @Test public void damagedOrHostileStateIsIgnored() throws Exception {
        Context context = context(); ScanSession.discard(context);
        File state = new File(ScanSession.sessionDir(context), "state.json");
        Files.write(state.toPath(), "{not json".getBytes(StandardCharsets.UTF_8));
        assertTrue(ScanSession.restore(context).pages.isEmpty());
        File outside = new File(context.getFilesDir(), "outside.png"); Files.write(outside.toPath(), new byte[]{1});
        Files.write(state.toPath(), ("{\"schema\":1,\"input\":\"../outside.png\",\"capture\":\"../../x\",\"pages\":[{\"image\":\"../outside.png\",\"w\":1,\"h\":1,\"words\":[]}]}")
                .getBytes(StandardCharsets.UTF_8));
        ScanSession s = ScanSession.restore(context);
        assertNull(s.input); assertNull(s.capture); assertTrue(s.pages.isEmpty());
        outside.delete(); ScanSession.discard(context);
    }

    @Test public void recreationRestoresTheSessionAndLeavingDiscardsIt() throws Exception {
        Context context = context();
        File image;
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            image = pageImage(context);
            File capture = File.createTempFile("camera-", ".jpg", ScanSession.captureDir(context));
            scenario.onActivity(activity -> {
                try { ScanSession s = sessionOf(activity); s.pages.add(new DocumentExporter.Page(image, 300, 200, List.of(word("déjà")), 5)); s.capture = capture; s.rotation = 90; }
                catch (Exception e) { throw new RuntimeException(e); }
            });
            scenario.recreate();
            AtomicReference<ScanSession> restored = new AtomicReference<>();
            scenario.onActivity(activity -> { try { restored.set(sessionOf(activity)); } catch (Exception e) { throw new RuntimeException(e); } });
            assertEquals(1, restored.get().pages.size()); assertEquals("déjà", restored.get().pages.get(0).words().get(0).text);
            assertEquals(capture, restored.get().capture); assertEquals(90, restored.get().rotation);
            assertTrue("recreation must not delete the working copies", image.isFile() && capture.isFile());

            // The camera returns «cancelled»: its empty temporary file is removed.
            scenario.onActivity(activity -> {
                try { Method m = MainActivity.class.getDeclaredMethod("onActivityResult", int.class, int.class, android.content.Intent.class); m.setAccessible(true); m.invoke(activity, 2, Activity.RESULT_CANCELED, null); }
                catch (Exception e) { throw new RuntimeException(e); }
            });
            assertFalse("cancelled camera file left behind", capture.exists());
            assertNull(restored.get().capture);
        }
        // Closing the scanner (finishing) releases the session's private copies once the worker is idle.
        waitFor(() -> !image.exists());
        assertFalse("finished session kept its page image", image.exists());
    }

    @Test public void aFreshStartRemovesLeftoversButKeepsRecentExports() throws Exception {
        Context context = context();
        File stale = pageImage(context), shot = File.createTempFile("camera-", ".jpg", ScanSession.captureDir(context));
        File recent = new File(ScanSession.exportDir(context), "Reader-scan-recent.pdf"); Files.write(recent.toPath(), new byte[]{1});
        File old = new File(ScanSession.exportDir(context), "Reader-scan-old.pdf"); Files.write(old.toPath(), new byte[]{1});
        assertTrue(old.setLastModified(System.currentTimeMillis() - 3L * 24 * 60 * 60 * 1000));
        try (ActivityScenario<MainActivity> ignored = ActivityScenario.launch(MainActivity.class)) {
            assertFalse(stale.exists()); assertFalse(shot.exists()); assertFalse(old.exists());
            assertTrue("a PDF shared minutes ago must stay readable", recent.isFile());
        }
        recent.delete();
    }

    @Test public void cancelAfterTheLastPageStillDeletesTheDocument() throws Exception {
        Context context = context();
        File image = pageImage(context);
        File[] before = ScanSession.exportDir(context).listFiles();
        // The exporter checks: before the page, before saving, after writing both files. Cancel arrives at the last one.
        AtomicInteger checks = new AtomicInteger();
        java.util.function.BooleanSupplier lateCancel = () -> checks.incrementAndGet() >= 3;
        assertThrows(InterruptedException.class, () -> DocumentExporter.export(context, List.of(new DocumentExporter.Page(image, 300, 200, List.of(word("très")), 0)), lateCancel));
        assertEquals(3, checks.get());
        File[] after = ScanSession.exportDir(context).listFiles();
        assertEquals("a cancelled export left files", before == null ? 0 : before.length, after == null ? 0 : after.length);
        image.delete();
    }
}
