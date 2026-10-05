// Bellman-Ford — complete C++17 reference.
#include <limits>
#include <tuple>
#include <vector>

struct Edge { int u, v; double w; };

std::tuple<std::vector<double>, std::vector<int>, bool> bellmanFord(int n, const std::vector<Edge>& edges, int start) {
    const double INF = std::numeric_limits<double>::infinity();
    std::vector<double> dist(n, INF);
    std::vector<int> parent(n, -1);
    dist[start] = 0; // @a: init
    for (int i = 0; i < n - 1; i++) { // @a: round
        for (const Edge& e : edges) {
            if (dist[e.u] + e.w < dist[e.v]) { // @a: relax
                dist[e.v] = dist[e.u] + e.w; // @a: update
                parent[e.v] = e.u;
            }
        }
    }
    bool negCycle = false;
    for (const Edge& e : edges) {
        if (dist[e.u] + e.w < dist[e.v]) {
            negCycle = true; // @a: negCycle
            break;
        }
    }
    return {dist, parent, negCycle}; // @a: done
}
