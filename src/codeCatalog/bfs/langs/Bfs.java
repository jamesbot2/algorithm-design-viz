import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** BFS shortest path on unweighted graph — complete Java reference. */
public final class Bfs {
    public record Result(int[] dist, int[] parent) {}

    public static Result bfs(List<List<Integer>> adj, int start) {
        int n = adj.size();
        int[] dist = new int[n];
        int[] parent = new int[n];
        Arrays.fill(dist, -1);
        Arrays.fill(parent, -1);
        List<Integer> q = new ArrayList<>(List.of(start)); // @a: init
        dist[start] = 0;
        int head = 0;
        while (head < q.size()) {
            int u = q.get(head++); // @a: dequeue
            for (int v : adj.get(u)) {
                if (dist[v] < 0) { // @a: visit
                    dist[v] = dist[u] + 1;
                    parent[v] = u;
                    q.add(v); // @a: enqueue
                }
            }
        }
        return new Result(dist, parent); // @a: done
    }
}
