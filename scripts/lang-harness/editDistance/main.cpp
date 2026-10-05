#include "algo.cpp"
#include <iostream>
int main() {
    std::string a, b;
    std::getline(std::cin, a);
    std::getline(std::cin, b);
    std::cout << editDistance(a, b) << "\n";
}
