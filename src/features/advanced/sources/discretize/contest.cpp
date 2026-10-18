// Coordinate compression — contest version (std::sort + std::unique + std::lower_bound).
// Compress<T>: id(x) = number of distinct values < x (0-based rank); for a present value it is its rank.
// O(n log n) build, O(log n) per id(). C++17, headers <algorithm> <vector>. Same ranks as the teaching version.
#include <algorithm>
#include <vector>
template <class T = long long>
struct Compress {
  std::vector<T> u;
  explicit Compress(std::vector<T> a) : u(std::move(a)) {
    std::sort(u.begin(), u.end());
    u.erase(std::unique(u.begin(), u.end()), u.end());
  }
  int id(const T& x) const { return int(std::lower_bound(u.begin(), u.end(), x) - u.begin()); }
  int size() const { return int(u.size()); }
};

