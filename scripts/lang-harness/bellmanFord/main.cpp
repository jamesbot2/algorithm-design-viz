#include "algo.cpp"
#include <cmath>
#include <iostream>
#include <string>
int main() {
    int n, start, u, v;
    double w;
    std::string mode;
    std::cin >> n >> start >> mode;
    std::vector<Edge> edges;
    while (std::cin >> u >> v >> w) edges.push_back({u, v, w});
    auto [dist, parent, neg] = bellmanFord(n, edges, start);
    if (mode == "full") {
        for (int i = 0; i < n; i++) {
            if (i) std::cout << " ";
            if (std::isinf(dist[i])) std::cout << "INF"; else std::cout << static_cast<long long>(dist[i]);
        }
        std::cout << "\n";
        for (int i = 0; i < n; i++) std::cout << (i ? " " : "") << parent[i];
        std::cout << "\n";
    }
    std::cout << (neg ? "true" : "false") << "\n";
}
