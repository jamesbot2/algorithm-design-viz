#include <iostream>
#include <string>
#include "algo.cpp"
int main() {
  size_t n; std::cin >> n;
  std::vector<std::vector<double>> g(n, std::vector<double>(n));
  for (auto& row : g) for (auto& x : row) { std::string t; std::cin >> t; x = t == "INF" ? INF : std::stod(t); }
  auto d = floyd(g);
  for (auto& row : d) {
    for (size_t j = 0; j < n; j++) {
      if (j) std::cout << " ";
      if (row[j] == INF) std::cout << "INF"; else std::cout << static_cast<long long>(row[j]);
    }
    std::cout << "\n";
  }
}
