#include <iostream>
#include "algo.cpp"
int main() {
  std::string X, Y;
  std::getline(std::cin, X);
  std::getline(std::cin, Y);
  LcsResult r = lcs(X, Y);
  std::cout << r.length << " " << r.sequence << "\n";
}
