/** Monotonic stack. nextGreater: index of the next STRICTLY greater element to the right, or -1. */
public class MonoStack {
    static long[] nextGreater(long[] a) {
        long[] res = new long[a.length];
        java.util.Arrays.fill(res, -1); // @a: msInit
        int[] st = new int[a.length]; // indices; values never increase from bottom to top
        int top = 0;
        for (int i = 0; i < a.length; i++) {
            while (top > 0 && a[st[top - 1]] < a[i]) { // @a: msPopCheck
                res[st[--top]] = i; // @a: msPop
            }
            st[top++] = i; // @a: msPush
        }
        return res; // @a: msReturn
    }

    /** Largest rectangle in a histogram of non-negative heights (unit-width bars). */
    static long largestRectangle(long[] h) {
        int[] st = new int[h.length + 1]; // indices; heights strictly increase from bottom to top
        int top = 0;
        long best = 0;
        for (int i = 0; i <= h.length; i++) {
            long cur = i == h.length ? 0 : h[i]; // sentinel height 0 flushes the stack
            while (top > 0 && h[st[top - 1]] >= cur) { // @a: lrPopCheck
                long height = h[st[--top]]; // @a: lrPop
                int left = top == 0 ? 0 : st[top - 1] + 1; // @a: lrArea+1
                best = Math.max(best, height * (i - left));
            }
            st[top++] = i; // @a: lrPush
        }
        return best; // @a: lrReturn
    }
}
