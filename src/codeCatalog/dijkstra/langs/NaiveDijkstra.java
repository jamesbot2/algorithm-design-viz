import java.util.Arrays;
import java.util.List;

/** Naive Dijkstra (non-negative weights) — complete Java reference. */
public final class NaiveDijkstra {
    public record Arc(int v, double w) {}
    public record Result(double[] dist, int[] parent) {}

    public static Result naiveDijkstra(int n, int start, List<List<Arc>> adj) {
        final double INF = Double.POSITIVE_INFINITY;
        double[] dist = new double[n];
        Arrays.fill(dist, INF);
        boolean[] done = new boolean[n];
        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        dist[start] = 0; // @a: init
        for (int iter = 0; iter < n; iter++) {
            int u = -1;
            double best = INF;
            for (int i = 0; i < n; i++) {
                if (!done[i] && dist[i] < best) { // @a: selectMin
                    best = dist[i];
                    u = i;
                }
            }
            if (u < 0 || best == INF) break;
            done[u] = true;
            for (Arc a : adj.get(u)) {
                if (dist[u] + a.w() < dist[a.v()]) { // @a: relax.condition
                    dist[a.v()] = dist[u] + a.w(); // @a: relax.update
                    parent[a.v()] = u;
                }
            }
        }
        return new Result(dist, parent); // @a: done, return
    }
}
