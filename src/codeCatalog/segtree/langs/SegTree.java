/** Segment tree (point assign + range sum), teaching version. 0-based, half-open [l, r). */
public class SegTree {
    int n;
    long[] tree; // tree[node] = sum of a[lo, hi); node 1 is the root

    SegTree(long[] a) {
        n = a.length;
        tree = new long[4 * Math.max(1, n)];
        if (n > 0) build(a, 1, 0, n); // @a: buildCall
    }

    void build(long[] a, int node, int lo, int hi) {
        if (hi - lo == 1) {
            tree[node] = a[lo]; // @a: buildLeaf
            return;
        }
        int mid = lo + (hi - lo) / 2;
        build(a, 2 * node, lo, mid);
        build(a, 2 * node + 1, mid, hi);
        tree[node] = tree[2 * node] + tree[2 * node + 1]; // @a: buildPull
    }

    /** a[i] = v */
    void set(int i, long v) {
        setRec(1, 0, n, i, v); // @a: setCall
    }

    void setRec(int node, int lo, int hi, int i, long v) {
        if (hi - lo == 1) {
            tree[node] = v; // @a: setLeaf
            return;
        }
        int mid = lo + (hi - lo) / 2;
        if (i < mid) setRec(2 * node, lo, mid, i, v); // @a: setDescend+1
        else setRec(2 * node + 1, mid, hi, i, v);
        tree[node] = tree[2 * node] + tree[2 * node + 1]; // @a: setPull
    }

    /** Sum of a[l..r). */
    long sum(int l, int r) {
        return query(1, 0, n, l, r); // @a: sumCall
    }

    long query(int node, int lo, int hi, int l, int r) {
        if (r <= lo || hi <= l) return 0; // @a: queryOutside
        if (l <= lo && hi <= r) return tree[node]; // @a: queryInside
        int mid = lo + (hi - lo) / 2;
        return query(2 * node, lo, mid, l, r) + query(2 * node + 1, mid, hi, l, r); // @a: querySplit
    }
}
