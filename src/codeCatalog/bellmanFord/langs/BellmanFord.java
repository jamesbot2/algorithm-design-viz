import java.util.Arrays;
import java.util.List;

/** Bellman-Ford — complete Java reference. */
public final class BellmanFord {
    public record Edge(int u, int v, double w) {}
    public record Result(double[] dist, int[] parent, boolean negCycle) {}

    public static Result bellmanFord(int n, List<Edge> edges, int start) {
        final double INF = Double.POSITIVE_INFINITY;
        double[] dist = new double[n];
        Arrays.fill(dist, INF);
        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        dist[start] = 0; // @a: init
        for (int i = 0; i < n - 1; i++) { // @a: round
            for (Edge e : edges) {
                if (dist[e.u()] + e.w() < dist[e.v()]) { // @a: relax
                    dist[e.v()] = dist[e.u()] + e.w(); // @a: update
                    parent[e.v()] = e.u();
                }
            }
        }
        boolean negCycle = false;
        for (Edge e : edges) {
            if (dist[e.u()] + e.w() < dist[e.v()]) {
                negCycle = true; // @a: negCycle
                break;
            }
        }
        return new Result(dist, parent, negCycle); // @a: done
    }
}
