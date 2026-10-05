import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Dijkstra with binary heap — complete Java reference (hand-written heap of (u, d), lazy deletion). */
public final class DijkstraHeap {
    public record Arc(int v, double w) {}
    public record Result(double[] dist, int[] parent) {}
    private record Item(int u, double d) {}

    public static Result dijkstraHeap(int n, int start, List<List<Arc>> adj) {
        final double INF = Double.POSITIVE_INFINITY;
        double[] dist = new double[n];
        Arrays.fill(dist, INF);
        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        dist[start] = 0; // @a: init
        List<Item> heap = new ArrayList<>(List.of(new Item(start, 0)));
        while (!heap.isEmpty()) {
            Item cur = pop(heap); // @a: extract
            if (cur.d() != dist[cur.u()]) continue; // @a: stale
            for (Arc a : adj.get(cur.u())) {
                if (dist[cur.u()] + a.w() < dist[a.v()]) { // @a: relax
                    dist[a.v()] = dist[cur.u()] + a.w();
                    parent[a.v()] = cur.u();
                    push(heap, a.v(), dist[a.v()]);
                }
            }
        }
        return new Result(dist, parent); // @a: done, return
    }

    private static void push(List<Item> heap, int u, double d) {
        heap.add(new Item(u, d));
        int i = heap.size() - 1;
        while (i > 0) {
            int p = (i - 1) >> 1;
            if (heap.get(p).d() <= heap.get(i).d()) break;
            Collections.swap(heap, p, i);
            i = p;
        }
    }

    private static Item pop(List<Item> heap) {
        Item top = heap.get(0);
        Item last = heap.remove(heap.size() - 1);
        if (!heap.isEmpty()) {
            heap.set(0, last);
            int i = 0;
            for (;;) {
                int l = i * 2 + 1;
                int r = l + 1;
                int best = i;
                if (l < heap.size() && heap.get(l).d() < heap.get(best).d()) best = l;
                if (r < heap.size() && heap.get(r).d() < heap.get(best).d()) best = r;
                if (best == i) break;
                Collections.swap(heap, i, best);
                i = best;
            }
        }
        return top;
    }
}
