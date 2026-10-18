import java.util.ArrayList;

/** Kahn's topological sort. Returns [status, order...]: status 1 = acyclic (order has n nodes), 0 = cycle (order = nodes processed before it blocked). */
public class Topo {
    static long[] topoSort(long nn, long[] edges) {
        int n = (int) nn;
        ArrayList<ArrayList<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int i = 0; i + 1 < edges.length; i += 2) {
            adj.get((int) edges[i]).add((int) edges[i + 1]); // @a: tsBuild+1
            indeg[(int) edges[i + 1]]++;
        }
        int[] queue = new int[n];
        int tail = 0;
        for (int v = 0; v < n; v++) if (indeg[v] == 0) queue[tail++] = v; // @a: tsSeed
        long[] res = new long[n + 1];
        int cnt = 0;
        for (int head = 0; head < tail; head++) {
            int u = queue[head]; // @a: tsPop
            res[1 + cnt++] = u;
            for (int v : adj.get(u)) {
                indeg[v]--; // @a: tsRelax
                if (indeg[v] == 0) queue[tail++] = v; // @a: tsEnqueue
            }
        }
        res[0] = cnt == n ? 1 : 0; // @a: tsResult
        return java.util.Arrays.copyOf(res, cnt + 1);
    }
}
