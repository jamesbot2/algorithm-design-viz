#include <bitset>
#include <cstddef>
#include <numeric>
#include <vector>

// numeric / bitset lab (C++17). Every function is ONE call on a real std::vector<int> or std::bitset<16>.
// std::accumulate(first, last, init): the TYPE of init decides the accumulator type — 0 sums in int, 0LL in long long.
// partial_sum / adjacent_difference are inverses of each other; std::gcd (C++17, <numeric>) works on negative numbers too.
// bitset indices count from the right (bit 0 is the least significant); to_string() prints bit 15 first.
void do_iota(std::vector<int>& v, int x) { std::iota(v.begin(), v.end(), x); }  // @a: nIota
long long do_sum(const std::vector<int>& v) { return std::accumulate(v.begin(), v.end(), 0LL); }  // @a: nAcc
void do_psum(std::vector<int>& v) { std::partial_sum(v.begin(), v.end(), v.begin()); }  // @a: nPsum
void do_adiff(std::vector<int>& v) { std::adjacent_difference(v.begin(), v.end(), v.begin()); }  // @a: nAdiff
int do_gcdall(const std::vector<int>& v) {  // @a: nGcd+4
  int g = 0;
  for (int x : v) g = std::gcd(g, x);
  return g;
}
void bit_set(std::bitset<16>& b, std::size_t i) { b.set(i); }  // @a: bSet
void bit_flip(std::bitset<16>& b, std::size_t i) { b.flip(i); }  // @a: bFlip
std::size_t bit_count(const std::bitset<16>& b) { return b.count(); }  // @a: bCnt
void bit_shl(std::bitset<16>& b, std::size_t k) { b <<= k; }  // @a: bShl
