#include "algo.cpp"
#include <iostream>
int main() {
    std::vector<int> a;
    int x;
    while (std::cin >> x) a.push_back(x);
    std::vector<int> r = insertionSort(a);
    for (size_t k = 0; k < r.size(); k++) std::cout << (k ? " " : "") << r[k];
    std::cout << "\n";
}
