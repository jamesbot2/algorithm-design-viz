#include <iostream>
#include "algo.cpp"
int main() {
  std::string t, p;
  std::getline(std::cin, t);
  std::getline(std::cin, p);
  auto h = kmpSearch(t, p);
  for (size_t k = 0; k < h.size(); k++) std::cout << (k ? " " : "") << h[k];
  std::cout << "\n";
  auto l = buildLps(p);
  for (size_t k = 0; k < l.size(); k++) std::cout << (k ? " " : "") << l[k];
  std::cout << "\n";
}
