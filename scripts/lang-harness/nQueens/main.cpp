#include "algo.cpp"
#include <iostream>
int main() {
    int n;
    std::cin >> n;
    auto s = solveNQueens(n);
    std::cout << s.size() << "\n";
    for (auto& v : s) {
        for (size_t k = 0; k < v.size(); k++) std::cout << (k ? " " : "") << v[k];
        std::cout << "\n";
    }
}
