/** Fenwick tree (binary indexed tree), teaching version.
 *  Public API: 0-based indices, half-open ranges [l, r). Internally tree is 1-based. */
public class Fenwick {
    int n;
    long[] tree; // tree[0] is unused

    Fenwick(int n) {
        this.n = n;
        this.tree = new long[n + 1]; // @a: init
    }

    /** a[i] += delta (i is 0-based). */
    void add(int i, long delta) {
        int p = i + 1; // @a: addStart
        while (p <= n) {
            tree[p] += delta; // @a: addApply
            p += p & -p; // @a: addNext
        }
    }

    /** Sum of a[0..r). */
    long prefix(int r) {
        long sum = 0; // @a: prefixStart+1
        int p = r;
        while (p > 0) {
            sum += tree[p]; // @a: prefixAccum
            p -= p & -p; // @a: prefixNext
        }
        return sum; // @a: prefixReturn
    }

    /** Sum of a[l..r). */
    long range(int l, int r) {
        return prefix(r) - prefix(l); // @a: rangeCompute
    }
}
