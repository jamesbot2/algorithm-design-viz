// unique / remove + erase — contest reference. C++17, headers <algorithm>, <cstddef>, <vector>.
// Distinct sorted values:  std::sort(v.begin(), v.end()); v.erase(std::unique(v.begin(), v.end()), v.end());
// Remove all x:            v.erase(std::remove(v.begin(), v.end(), x), v.end());
// unique / remove alone leave size() unchanged; the tail after the returned iterator is unspecified.
#include <algorithm>
#include <cstddef>
#include <vector>
std::size_t unique_keep(std::vector<int>& v) { return std::unique(v.begin(), v.end()) - v.begin(); }
std::size_t remove_keep(std::vector<int>& v, int x) { return std::remove(v.begin(), v.end(), x) - v.begin(); }
void sort_all(std::vector<int>& v) { std::sort(v.begin(), v.end()); }
void erase_tail(std::vector<int>& v, std::size_t keep) { v.erase(v.begin() + keep, v.end()); }

