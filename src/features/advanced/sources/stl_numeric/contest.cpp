// numeric / bitset — contest reference (same calls as the teaching file). C++17, headers <bitset>, <cstddef>, <numeric>, <vector>.
// prefix sums: std::partial_sum(a.begin(), a.end(), p.begin()); total: std::accumulate(a.begin(), a.end(), 0LL) (note 0LL, not 0).
// std::gcd / std::lcm are in <numeric> since C++17. bitset<N> needs a compile-time N; count() = popcount; shifts drop bits that fall off.
#include <bitset>
#include <cstddef>
#include <numeric>
#include <vector>
void do_iota(std::vector<int>& v, int x) { std::iota(v.begin(), v.end(), x); }
long long do_sum(const std::vector<int>& v) { return std::accumulate(v.begin(), v.end(), 0LL); }
void do_psum(std::vector<int>& v) { std::partial_sum(v.begin(), v.end(), v.begin()); }
void do_adiff(std::vector<int>& v) { std::adjacent_difference(v.begin(), v.end(), v.begin()); }
int do_gcdall(const std::vector<int>& v) {
  int g = 0;
  for (int x : v) g = std::gcd(g, x);
  return g;
}
void bit_set(std::bitset<16>& b, std::size_t i) { b.set(i); }
void bit_flip(std::bitset<16>& b, std::size_t i) { b.flip(i); }
std::size_t bit_count(const std::bitset<16>& b) { return b.count(); }
void bit_shl(std::bitset<16>& b, std::size_t k) { b <<= k; }

