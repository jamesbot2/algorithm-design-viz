#include "algo.cpp"
#include <iostream>
#include <sstream>
#include <string>
int main() {
    std::string line;
    std::getline(std::cin, line);
    std::istringstream h(line);
    int n, start;
    h >> n >> start;
    std::vector<std::vector<int>> adj(n);
    for (int i = 0; i < n; i++) {
        std::getline(std::cin, line);
        std::istringstream a(line);
        int v;
        while (a >> v) adj[i].push_back(v);
    }
    auto [dist, parent] = bfs(adj, start);
    for (int i = 0; i < n; i++) std::cout << (i ? " " : "") << dist[i];
    std::cout << "\n";
    for (int i = 0; i < n; i++) std::cout << (i ? " " : "") << parent[i];
    std::cout << "\n";
}
