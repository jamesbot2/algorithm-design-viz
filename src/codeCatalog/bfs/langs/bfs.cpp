// BFS shortest path on unweighted graph — complete C++17 reference.
#include <utility>
#include <vector>

std::pair<std::vector<int>, std::vector<int>> bfs(const std::vector<std::vector<int>>& adj, int start) {
    int n = static_cast<int>(adj.size());
    std::vector<int> dist(n, -1);
    std::vector<int> parent(n, -1);
    std::vector<int> q{start}; // @a: init
    dist[start] = 0;
    size_t head = 0;
    while (head < q.size()) {
        int u = q[head++]; // @a: dequeue
        for (int v : adj[u]) {
            if (dist[v] < 0) { // @a: visit
                dist[v] = dist[u] + 1;
                parent[v] = u;
                q.push_back(v); // @a: enqueue
            }
        }
    }
    return {dist, parent}; // @a: done
}
