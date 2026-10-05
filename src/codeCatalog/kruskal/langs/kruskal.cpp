// Kruskal MST — complete C++17 reference (union-find with path compression).
#include <algorithm>
#include <functional>
#include <numeric>
#include <utility>
#include <vector>

struct Edge { int u, v; long long w; };

std::pair<long long, std::vector<Edge>> kruskal(int n, const std::vector<Edge>& edges) {
    std::vector<int> parent(n);
    std::iota(parent.begin(), parent.end(), 0);
    std::function<int(int)> find = [&](int x) { return parent[x] == x ? x : parent[x] = find(parent[x]); };
    std::vector<Edge> sorted = edges;
    std::stable_sort(sorted.begin(), sorted.end(), [](const Edge& a, const Edge& b) { return a.w < b.w; }); // @a: sort
    std::vector<Edge> mst;
    long long total = 0;
    for (const Edge& e : sorted) {
        int a = find(e.u); // @a: find
        int b = find(e.v);
        if (a == b) continue; // @a: skip
        parent[a] = b; // @a: union
        mst.push_back(e);
        total += e.w;
        if (static_cast<int>(mst.size()) == n - 1) break;
    }
    return {total, mst}; // @a: done
}
