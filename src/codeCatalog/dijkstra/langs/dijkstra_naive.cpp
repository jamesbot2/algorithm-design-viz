// Naive Dijkstra (non-negative weights) — complete C++17 reference. adj[u] = {(v, w), ...}.
#include <limits>
#include <utility>
#include <vector>

std::pair<std::vector<double>, std::vector<int>> naiveDijkstra(int n, int start, const std::vector<std::vector<std::pair<int, double>>>& adj) {
    const double INF = std::numeric_limits<double>::infinity();
    std::vector<double> dist(n, INF);
    std::vector<bool> done(n, false);
    std::vector<int> parent(n, -1);
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
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) { // @a: relax.condition
                dist[v] = dist[u] + w; // @a: relax.update
                parent[v] = u;
            }
        }
    }
    return {dist, parent}; // @a: done, return
}
