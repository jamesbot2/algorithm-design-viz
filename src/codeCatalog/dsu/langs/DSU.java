/** DSU (union by size + path compression), teaching version. Elements are 0..n-1. */
public class DSU {
    int[] parent, size;
    int count; // number of disjoint sets

    DSU(int n) {
        parent = new int[n]; // @a: init+3
        size = new int[n];
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
        count = n;
    }

    /** Root of x; afterwards every node on the path points directly at the root. */
    int find(int x) {
        int root = x; // @a: findStart
        while (parent[root] != root) { // @a: findClimb+2
            root = parent[root];
        }
        while (parent[x] != root) { // @a: compress+4
            int next = parent[x];
            parent[x] = root;
            x = next;
        }
        return root; // @a: findReturn
    }

    /** Merge the sets of a and b. Returns true if they were different sets. */
    boolean union(int a, int b) {
        int ra = find(a), rb = find(b); // @a: unionFind
        if (ra == rb) return false; // @a: unionSame
        if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; } // @a: unionSwap
        parent[rb] = ra; // @a: unionLink+2
        size[ra] += size[rb];
        count--;
        return true; // @a: unionDone
    }

    boolean same(int a, int b) {
        return find(a) == find(b); // @a: sameCompare
    }
}
