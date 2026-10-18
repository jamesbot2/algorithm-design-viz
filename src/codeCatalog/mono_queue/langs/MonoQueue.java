import java.util.ArrayDeque;

/** Monotonic deque. slidingMax: maximum of every window of length k (1 <= k <= a.length). */
public class MonoQueue {
    static long[] slidingMax(long[] a, long k) {
        long[] out = new long[(int) (a.length - k + 1)];
        ArrayDeque<Integer> dq = new ArrayDeque<>(); // indices; values strictly decrease from front to back
        for (int i = 0; i < a.length; i++) {
            while (!dq.isEmpty() && a[dq.peekLast()] <= a[i]) dq.pollLast(); // @a: mqPopBack
            dq.addLast(i); // @a: mqPush
            if (dq.peekFirst() <= i - k) dq.pollFirst(); // @a: mqExpire
            if (i >= k - 1) out[(int) (i - k + 1)] = a[dq.peekFirst()]; // @a: mqEmit
        }
        return out;
    }

    /** Minimum of every window: the maximum of the negated array, negated back. */
    static long[] slidingMin(long[] a, long k) {
        long[] neg = new long[a.length];
        for (int i = 0; i < a.length; i++) neg[i] = -a[i];
        long[] r = slidingMax(neg, k);
        for (int i = 0; i < r.length; i++) r[i] = -r[i];
        return r;
    }
}
