/** Lazy segment tree (range add + range sum), teaching version. 0-based, half-open [l, r). */
public class LazySegTree {
    int n;
    long[] total; // total[node] = sum of a[lo, hi) with tags at or above already applied
    long[] lazy; // lazy[node] = amount still to add to EACH element under node

    LazySegTree(long[] a) {
        n = a.length;
        total = new long[4 * Math.max(1, n)];
        lazy = new long[4 * Math.max(1, n)];
        if (n > 0) build(a, 1, 0, n); // @a: buildCall
    }

    void build(long[] a, int node, int lo, int hi) {
        if (hi - lo == 1) { total[node] = a[lo]; return; } // @a: buildLeaf
        int mid = lo + (hi - lo) / 2;
        build(a, 2 * node, lo, mid);
        build(a, 2 * node + 1, mid, hi);
        total[node] = total[2 * node] + total[2 * node + 1]; // @a: buildPull
    }

    /** Put tag v on node: every element in [lo, hi) gains v. */
    void apply(int node, int lo, int hi, long v) {
        total[node] += v * (hi - lo); // @a: applyTotal
        lazy[node] += v; // @a: applyTag
    }

    /** Hand the pending tag of node down to both children. */
    void push(int node, int lo, int hi) {
        if (lazy[node] == 0) return;
        int mid = lo + (hi - lo) / 2;
        apply(2 * node, lo, mid, lazy[node]); // @a: pushLeft
        apply(2 * node + 1, mid, hi, lazy[node]); // @a: pushRight
        lazy[node] = 0; // @a: pushClear
    }

    /** a[i] += v for every i in [l, r). */
    void add(int l, int r, long v) {
        addRec(1, 0, n, l, r, v); // @a: addCall
    }

    void addRec(int node, int lo, int hi, int l, int r, long v) {
        if (r <= lo || hi <= l) return; // @a: addOutside
        if (l <= lo && hi <= r) { apply(node, lo, hi, v); return; } // @a: addInside
        push(node, lo, hi); // @a: addPush
        int mid = lo + (hi - lo) / 2;
        addRec(2 * node, lo, mid, l, r, v); // @a: addSplit+1
        addRec(2 * node + 1, mid, hi, l, r, v);
        total[node] = total[2 * node] + total[2 * node + 1]; // @a: addPull
    }

    /** Sum of a[l..r). */
    long sum(int l, int r) {
        return query(1, 0, n, l, r); // @a: sumCall
    }

    long query(int node, int lo, int hi, int l, int r) {
        if (r <= lo || hi <= l) return 0; // @a: queryOutside
        if (l <= lo && hi <= r) return total[node]; // @a: queryInside
        push(node, lo, hi); // @a: queryPush
        int mid = lo + (hi - lo) / 2;
        return query(2 * node, lo, mid, l, r) + query(2 * node + 1, mid, hi, l, r); // @a: querySplit
    }
}
