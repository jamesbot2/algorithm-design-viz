// Dijkstra with binary heap — complete C++17 reference (hand-written heap of (u, d), lazy deletion).
#include <limits>
#include <utility>
#include <vector>

struct Item { int u; double d; };

std::pair<std::vector<double>, std::vector<int>> dijkstraHeap(int n, int start, const std::vector<std::vector<std::pair<int, double>>>& adj) {
    const double INF = std::numeric_limits<double>::infinity();
    std::vector<double> dist(n, INF);
    std::vector<int> parent(n, -1);
    dist[start] = 0; // @a: init
    std::vector<Item> heap{{start, 0}};
    auto push = [&](int u, double d) {
        heap.push_back({u, d});
        int i = static_cast<int>(heap.size()) - 1;
        while (i > 0) {
            int p = (i - 1) >> 1;
            if (heap[p].d <= heap[i].d) break;
            std::swap(heap[p], heap[i]);
            i = p;
        }
    };
    auto pop = [&]() -> Item {
        Item top = heap[0];
        Item last = heap.back();
        heap.pop_back();
        if (!heap.empty()) {
            heap[0] = last;
            int i = 0;
            for (;;) {
                int l = i * 2 + 1;
                int r = l + 1;
                int best = i;
                if (l < static_cast<int>(heap.size()) && heap[l].d < heap[best].d) best = l;
                if (r < static_cast<int>(heap.size()) && heap[r].d < heap[best].d) best = r;
                if (best == i) break;
                std::swap(heap[i], heap[best]);
                i = best;
            }
        }
        return top;
    };
    while (!heap.empty()) {
        Item cur = pop(); // @a: extract
        if (cur.d != dist[cur.u]) continue; // @a: stale
        for (auto [v, w] : adj[cur.u]) {
            if (dist[cur.u] + w < dist[v]) { // @a: relax
                dist[v] = dist[cur.u] + w;
                parent[v] = cur.u;
                push(v, dist[v]);
            }
        }
    }
    return {dist, parent}; // @a: done, return
}
