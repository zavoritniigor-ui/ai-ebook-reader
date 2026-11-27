package org.aiebook.reader.scanner;

/** Coordinates always refer to the final, upright image, in pixels from its top left. */
public final class OcrWord {
    public final String text;
    public final float left, top, right, bottom;
    public final float[] polygon;
    public final int line;
    public OcrWord(String text, float left, float top, float right, float bottom, float[] polygon, int line) {
        if (text == null || text.trim().isEmpty() || !Float.isFinite(left) || !Float.isFinite(top)
                || !Float.isFinite(right) || !Float.isFinite(bottom) || right <= left || bottom <= top) {
            throw new IllegalArgumentException("Invalid OCR word");
        }
        this.text = text; this.left = left; this.top = top; this.right = right; this.bottom = bottom;
        this.polygon = polygon.clone(); this.line = line;
    }
}
