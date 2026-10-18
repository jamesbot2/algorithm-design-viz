// standard algorithms — contest reference (same calls as the teaching file). C++17, headers <algorithm>, <cstddef>, <functional>, <vector>.
// sort O(n log n); nth_element O(n) average (k-th smallest without a full sort); next_permutation enumerates permutations in lexicographic
// order (start from a SORTED array to visit all of them); lower_bound needs a sorted range. stable_sort keeps the order of equal keys.
#include <algorithm>
#include <cstddef>
#include <functional>
#include <vector>
void do_sort(std::vector<int>& v) { std::sort(v.begin(), v.end()); }
void do_rsort(std::vector<int>& v) { std::sort(v.begin(), v.end(), std::greater<int>()); }
void do_reverse(std::vector<int>& v) { std::reverse(v.begin(), v.end()); }
void do_rotate(std::vector<int>& v, std::size_t k) { std::rotate(v.begin(), v.begin() + k, v.end()); }
bool do_next(std::vector<int>& v) { return std::next_permutation(v.begin(), v.end()); }
bool do_prev(std::vector<int>& v) { return std::prev_permutation(v.begin(), v.end()); }
int do_nth(std::vector<int> v, std::size_t k) {
  std::nth_element(v.begin(), v.begin() + k, v.end());
  return v[k];
}
int do_count(const std::vector<int>& v, int x) { return (int)std::count(v.begin(), v.end(), x); }
std::size_t do_maxpos(const std::vector<int>& v) { return std::max_element(v.begin(), v.end()) - v.begin(); }
std::size_t do_lower(const std::vector<int>& v, int x) { return std::lower_bound(v.begin(), v.end(), x) - v.begin(); }

