package org.aiebook.reader.scanner;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Recursive whitespace cuts: headings first, then columns, then lines. Latin left-to-right only. */
public final class ReadingOrder {
    private ReadingOrder() {}
    public static List<OcrWord> sort(List<OcrWord> words) {
        List<List<OcrWord>> lines = new ArrayList<>();
        for (OcrWord word : words) {
            List<OcrWord> line = null;
            for (List<OcrWord> candidate : lines) if (candidate.get(0).line == word.line) { line = candidate; break; }
            if (line == null) { line = new ArrayList<>(); lines.add(line); }
            line.add(word);
        }
        for (List<OcrWord> line : lines) line.sort(Comparator.comparingDouble(w -> w.left));
        List<OcrWord> result = new ArrayList<>(); cut(lines, result, 0); return result;
    }
    private static float edge(List<OcrWord> line, boolean vertical, boolean end) {
        float value = end ? -Float.MAX_VALUE : Float.MAX_VALUE;
        for (OcrWord w : line) {
            float next = vertical ? (end ? w.right : w.left) : (end ? w.bottom : w.top);
            value = end ? Math.max(value, next) : Math.min(value, next);
        }
        return value;
    }
    private static void cut(List<List<OcrWord>> lines, List<OcrWord> result, int depth) {
        if (lines.size() < 2 || depth > 40) {
            lines.sort(Comparator.comparingDouble(l -> edge(l, false, false)));
            for (List<OcrWord> l : lines) result.addAll(l); return;
        }
        float medianHeight = (float) lines.stream().mapToDouble(l -> edge(l, false, true) - edge(l, false, false)).sorted().skip(lines.size()/2).findFirst().orElse(10);
        // Prefer a full-height column gap. If a heading crosses it, first split above the body.
        for (boolean vertical : new boolean[]{true, false}) {
            List<List<OcrWord>> sorted = new ArrayList<>(lines);
            sorted.sort(Comparator.comparingDouble(l -> edge(l, vertical, false)));
            float maxEnd = edge(sorted.get(0), vertical, true), best = 0;
            int split = -1;
            for (int i=1; i<sorted.size(); i++) {
                float gap = edge(sorted.get(i), vertical, false) - maxEnd;
                float threshold = medianHeight * (vertical ? 1.0f : .35f);
                if (gap > threshold && gap > best) { best = gap; split = i; }
                maxEnd = Math.max(maxEnd, edge(sorted.get(i), vertical, true));
            }
            if (split > 0) {
                cut(new ArrayList<>(sorted.subList(0, split)), result, depth+1);
                cut(new ArrayList<>(sorted.subList(split, sorted.size())), result, depth+1); return;
            }
        }
        lines.sort(Comparator.<List<OcrWord>>comparingDouble(l -> edge(l, false, false)).thenComparingDouble(l -> edge(l, true, false)));
        for (List<OcrWord> l : lines) result.addAll(l);
    }
}
