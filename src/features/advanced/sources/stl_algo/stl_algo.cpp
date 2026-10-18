#include <algorithm>
#include <cstddef>
#include <functional>
#include <vector>

// standard algorithms lab (C++17). Every function is ONE call on a real std::vector<int>.
// sort is not stable and its internal comparison order is unspecified; nth_element only guarantees the element at position k
// (everything before is <=, everything after is >=) — so this lab runs it on a COPY and reports just that element.
// lower_bound requires the range to be sorted; the lab refuses to run it otherwise.
void do_sort(std::vector<int>& v) { std::sort(v.begin(), v.end()); }  // @a: aSort
void do_rsort(std::vector<int>& v) { std::sort(v.begin(), v.end(), std::greater<int>()); }  // @a: aRSort
void do_reverse(std::vector<int>& v) { std::reverse(v.begin(), v.end()); }  // @a: aRev
void do_rotate(std::vector<int>& v, std::size_t k) { std::rotate(v.begin(), v.begin() + k, v.end()); }  // @a: aRot
bool do_next(std::vector<int>& v) { return std::next_permutation(v.begin(), v.end()); }  // @a: aNext
bool do_prev(std::vector<int>& v) { return std::prev_permutation(v.begin(), v.end()); }  // @a: aPrev
int do_nth(std::vector<int> v, std::size_t k) {  // @a: aNth+3
  std::nth_element(v.begin(), v.begin() + k, v.end());
  return v[k];
}
int do_count(const std::vector<int>& v, int x) { return (int)std::count(v.begin(), v.end(), x); }  // @a: aCnt
std::size_t do_maxpos(const std::vector<int>& v) { return std::max_element(v.begin(), v.end()) - v.begin(); }  // @a: aMax
std::size_t do_lower(const std::vector<int>& v, int x) { return std::lower_bound(v.begin(), v.end(), x) - v.begin(); }  // @a: aLb
