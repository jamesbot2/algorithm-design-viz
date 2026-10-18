#include <algorithm>
#include <cstddef>
#include <functional>
#include <utility>
#include <vector>

// iterators / comparators lab (C++17). Every function is ONE call on a real std::vector<std::pair<int,int>>.
// A comparator must be a STRICT WEAK ORDERING: irreflexive (comp(a, a) is false), asymmetric and transitive.
// Writing <= instead of < breaks irreflexivity and std::sort may then crash or loop (undefined behaviour) — never do that.
// std::sort is not stable; std::stable_sort keeps the original order of elements that compare equal.
using P = std::pair<int, int>;
struct ByFirst { bool operator()(const P& a, const P& b) const { return a.first < b.first; } };  // @a: cFirst
struct BySecondDesc { bool operator()(const P& a, const P& b) const { return a.second > b.second; } };  // @a: cSecD
void sort_lex(std::vector<P>& v) { std::sort(v.begin(), v.end()); }  // @a: cLex
void sort_greater(std::vector<P>& v) { std::sort(v.begin(), v.end(), std::greater<P>()); }  // @a: cGreater
void stable_first(std::vector<P>& v) { std::stable_sort(v.begin(), v.end(), ByFirst()); }  // @a: cStableFirst
void stable_second_desc(std::vector<P>& v) { std::stable_sort(v.begin(), v.end(), BySecondDesc()); }  // @a: cStableSec
void reverse_all(std::vector<P>& v) { std::reverse(v.begin(), v.end()); }  // @a: cRev
P last_via_rbegin(const std::vector<P>& v) { return *v.rbegin(); }  // @a: cRbegin
std::size_t min_by_first(const std::vector<P>& v) { return std::min_element(v.begin(), v.end(), ByFirst()) - v.begin(); }  // @a: cMin
std::size_t lower_by_first(const std::vector<P>& v, int x) {  // @a: cLb+2
  return std::lower_bound(v.begin(), v.end(), x, [](const P& p, int value) { return p.first < value; }) - v.begin();
}
