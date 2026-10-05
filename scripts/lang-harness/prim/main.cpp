#include "algo.cpp"
#include <algorithm>
#include <iostream>
#include <string>
int main() {
    int n, start, u, v;
    double w;
    std::cin >> n >> start;
    std::vector<std::vector<std::pair<int, double>>> adj(n);
    while (std::cin >> u >> v >> w) { adj[u].push_back({v, w}); adj[v].push_back({u, w}); }
    auto [total, parent] = prim(n, adj, start);
    std::vector<std::string> es;
    for (int i = 0; i < n; i++) if (parent[i] >= 0) es.push_back(std::to_string(std::min(parent[i], i)) + "-" + std::to_string(std::max(parent[i], i)));
    std::sort(es.begin(), es.end());
    std::cout << static_cast<long long>(total) << "\n";
    for (size_t k = 0; k < es.size(); k++) std::cout << (k ? " " : "") << es[k];
    std::cout << "\n";
}
