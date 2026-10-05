#include "algo.cpp"
#include <iostream>
int main() {
    std::vector<long long> a;
    long long x;
    while (std::cin >> x) a.push_back(x);
    auto r = kadane(a);
    if (!r) std::cout << "null\n";
    else std::cout << r->best << " " << r->start << " " << r->end << "\n";
}
