import java.util.Arrays;
import java.util.List;

/** Prim MST (dense O(V^2)) — complete Java reference. adj.get(u) = arcs of u (undirected). */
public final class Prim {
    public record Arc(int v, double w) {}
    public record Result(double total, int[] parent) {}

    public static Result prim(int n, List<List<Arc>> adj, int start) {
        final double INF = Double.POSITIVE_INFINITY;
        double[] key = new double[n];
        Arrays.fill(key, INF);
        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        boolean[] inMst = new boolean[n];
        key[start] = 0; // @a: init
        for (int iter = 0; iter < n; iter++) {
            int u = -1;
            double best = INF;
            for (int i = 0; i < n; i++) {
                if (!inMst[i] && key[i] < best) { // @a: selectMin
                    best = key[i];
                    u = i;
                }
            }
            if (u < 0) break;
            inMst[u] = true; // @a: add
            for (Arc a : adj.get(u)) {
                if (!inMst[a.v()] && a.w() < key[a.v()]) { // @a: relax
                    key[a.v()] = a.w(); // @a: update+1
                    parent[a.v()] = u;
                }
            }
        }
        double total = 0;
        for (int i = 0; i < n; i++) if (parent[i] >= 0) total += key[i];
        return new Result(total, parent); // @a: done
    }
}
