/** LCA by binary lifting. par[v-1] = parent of node v (1..n-1), must satisfy par[v-1] < v; node 0 is the root. queries = flat pairs (u v). */
public class Lca {
    static long[] lcaAll(long[] par, long[] queries) {
        int n = par.length + 1;
        int LOG = 1;
        while ((1 << LOG) < n) LOG++;
        int[] depth = new int[n];
        for (int v = 1; v < n; v++) depth[v] = depth[(int) par[v - 1]] + 1; // @a: lcaDepth
        int[][] up = new int[LOG][n];
        for (int v = 1; v < n; v++) up[0][v] = (int) par[v - 1]; // @a: lcaBase
        for (int j = 1; j < LOG; j++)
            for (int v = 0; v < n; v++) up[j][v] = up[j - 1][up[j - 1][v]]; // @a: lcaTable
        long[] out = new long[queries.length / 2];
        for (int q = 0; q + 1 < queries.length; q += 2) {
            int u = (int) queries[q], v = (int) queries[q + 1];
            if (depth[u] < depth[v]) { int t = u; u = v; v = t; }
            int diff = depth[u] - depth[v];
            for (int j = 0; j < LOG; j++) {
                if (((diff >> j) & 1) == 1) u = up[j][u]; // @a: lcaLift
            }
            if (u != v) {
                for (int j = LOG - 1; j >= 0; j--) {
                    if (up[j][u] != up[j][v]) { u = up[j][u]; v = up[j][v]; } // @a: lcaJump
                }
                u = up[0][u]; // @a: lcaParent
            }
            out[q / 2] = u; // @a: lcaAnswer
        }
        return out;
    }
}
