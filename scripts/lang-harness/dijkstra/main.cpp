#include "algo.cpp"
#include <cmath>
#include <iostream>
int main() {
    int n, start, u, v;
    double w;
    std::cin >> n >> start;
    std::vector<std::vector<std::pair<int, double>>> adj(n);
    while (std::cin >> u >> v >> w) adj[u].push_back({v, w});
    auto [dist, parent] = naiveDijkstra(n, start, adj);
    for (int i = 0; i < n; i++) {
        if (i) std::cout << " ";
        if (std::isinf(dist[i])) std::cout << "INF"; else std::cout << static_cast<long long>(dist[i]);
    }
    std::cout << "\n";
    for (int i = 0; i < n; i++) std::cout << (i ? " " : "") << parent[i];
    std::cout << "\n";
}
