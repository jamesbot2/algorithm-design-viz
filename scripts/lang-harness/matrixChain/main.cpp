#include "algo.cpp"
#include <iostream>
#include <string>
std::vector<std::vector<int>> S;
std::string paren(int i, int j) {
    if (i == j) return "A" + std::to_string(i + 1);
    return "(" + paren(i, S[i][j]) + paren(S[i][j] + 1, j) + ")";
}
int main() {
    std::vector<long long> d;
    long long x;
    while (std::cin >> x) d.push_back(x);
    auto r = matrixChainOrder(d);
    S = r.second;
    std::cout << r.first << "\n" << paren(0, static_cast<int>(d.size()) - 2) << "\n";
}
