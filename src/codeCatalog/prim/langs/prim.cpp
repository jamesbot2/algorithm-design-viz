// Prim MST (dense O(V^2)) — complete C++17 reference. adj[u] = {(v, w), ...} (undirected).
#include <limits>
#include <utility>
#include <vector>

std::pair<double, std::vector<int>> prim(int n, const std::vector<std::vector<std::pair<int, double>>>& adj, int start = 0) {
    const double INF = std::numeric_limits<double>::infinity();
    std::vector<double> key(n, INF);
    std::vector<int> parent(n, -1);
    std::vector<bool> inMst(n, false);
    key[start] = 0; // @a: init
    for (int iter = 0; iter < n; iter++) {
        int u = -1;
        double best = INF;
        for (int i = 0; i < n; i++) {
            if (!inMst[i] && key[i] < best) { // @a: selectMin
                best = key[i];
                u = i;
            }
        }
        if (u < 0) break;
        inMst[u] = true; // @a: add
        for (auto [v, w] : adj[u]) {
            if (!inMst[v] && w < key[v]) { // @a: relax
                key[v] = w; // @a: update+1
                parent[v] = u;
            }
        }
    }
    double total = 0;
    for (int i = 0; i < n; i++) if (parent[i] >= 0) total += key[i];
    return {total, parent}; // @a: done
}
