// comparators — contest reference (same calls as the teaching file). C++17, headers <algorithm>, <cstddef>, <functional>, <utility>, <vector>.
// Sort by first, ties by original order:  std::stable_sort(v.begin(), v.end(), [](const P& a, const P& b) { return a.first < b.first; });
// A comparator must return false for equal elements (use < or >, never <=). Heterogeneous lower_bound takes (element, value).
#include <algorithm>
#include <cstddef>
#include <functional>
#include <utility>
#include <vector>
using P = std::pair<int, int>;
struct ByFirst { bool operator()(const P& a, const P& b) const { return a.first < b.first; } };
struct BySecondDesc { bool operator()(const P& a, const P& b) const { return a.second > b.second; } };
void sort_lex(std::vector<P>& v) { std::sort(v.begin(), v.end()); }
void sort_greater(std::vector<P>& v) { std::sort(v.begin(), v.end(), std::greater<P>()); }
void stable_first(std::vector<P>& v) { std::stable_sort(v.begin(), v.end(), ByFirst()); }
void stable_second_desc(std::vector<P>& v) { std::stable_sort(v.begin(), v.end(), BySecondDesc()); }
void reverse_all(std::vector<P>& v) { std::reverse(v.begin(), v.end()); }
P last_via_rbegin(const std::vector<P>& v) { return *v.rbegin(); }
std::size_t min_by_first(const std::vector<P>& v) { return std::min_element(v.begin(), v.end(), ByFirst()) - v.begin(); }
std::size_t lower_by_first(const std::vector<P>& v, int x) {
  return std::lower_bound(v.begin(), v.end(), x, [](const P& p, int value) { return p.first < value; }) - v.begin();
}

