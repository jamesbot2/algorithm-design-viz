#include "algo.cpp"
#include <iostream>
int main() {
    int t, x;
    std::cin >> t;
    std::vector<int> a;
    while (std::cin >> x) a.push_back(x);
    std::cout << binarySearch(a, t) << "\n";
}
