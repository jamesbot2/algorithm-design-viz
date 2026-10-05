#include "algo.cpp"
#include <iostream>
int main() {
    int n, u, v;
    long long w;
    std::cin >> n;
    std::vector<Edge> edges;
    while (std::cin >> u >> v >> w) edges.push_back({u, v, w});
    auto [total, mst] = kruskal(n, edges);
    std::cout << total << "\n";
    for (size_t k = 0; k < mst.size(); k++) std::cout << (k ? " " : "") << mst[k].u << "-" << mst[k].v << ":" << mst[k].w;
    std::cout << "\n";
}
