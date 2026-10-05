#include "algo.cpp"
#include <iostream>
#include <sstream>
int main() {
    std::string l0, l1, l2;
    std::getline(std::cin, l0); std::getline(std::cin, l1); std::getline(std::cin, l2);
    std::istringstream a(l1), b(l2);
    std::vector<int> w; std::vector<long long> v; long long x;
    while (a >> x) w.push_back(static_cast<int>(x));
    while (b >> x) v.push_back(x);
    std::cout << knapsackDp2d(w, v, std::stoi(l0)).first << "\n";
}
