import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Kruskal MST — complete Java reference (union-find with path compression). */
public final class Kruskal {
    public record Edge(int u, int v, long w) {}
    public record Result(long total, List<Edge> mst) {}

    private static int find(int[] parent, int x) {
        return parent[x] == x ? x : (parent[x] = find(parent, parent[x]));
    }

    public static Result kruskal(int n, List<Edge> edges) {
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        List<Edge> sorted = new ArrayList<>(edges);
        sorted.sort(Comparator.comparingLong(Edge::w)); // @a: sort
        List<Edge> mst = new ArrayList<>();
        long total = 0;
        for (Edge e : sorted) {
            int a = find(parent, e.u()); // @a: find
            int b = find(parent, e.v());
            if (a == b) continue; // @a: skip
            parent[a] = b; // @a: union
            mst.add(e);
            total += e.w();
            if (mst.size() == n - 1) break;
        }
        return new Result(total, mst); // @a: done
    }
}
