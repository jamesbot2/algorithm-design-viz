#include "algo.cpp"
#include <iostream>
#include <sstream>
#include <string>
int main() {
    std::string l0, l1, l2;
    std::getline(std::cin, l0); std::getline(std::cin, l1); std::getline(std::cin, l2);
    int W = std::stoi(l0);
    std::istringstream a(l1), b(l2);
    std::vector<int> w; std::vector<long long> vals; long long x;
    while (a >> x) w.push_back(static_cast<int>(x));
    while (b >> x) vals.push_back(x);
    auto [v, sel] = knapsackGreedyByDensity(w, vals, W);
    std::cout << v << "\n";
    for (size_t k = 0; k < sel.size(); k++) std::cout << (k ? " " : "") << sel[k];
    std::cout << "\n";
}
