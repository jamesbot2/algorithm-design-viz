#include <algorithm>
#include <cstddef>
#include <vector>

// unique + erase lab (C++17). std::unique / std::remove do NOT shrink the container: they move the kept elements to the
// front and return the logical new end; the values after it are valid but UNSPECIFIED. Call erase(new_end, end) to really
// shrink. unique only merges ADJACENT equal elements, so sort first when you want distinct values.
std::size_t unique_keep(std::vector<int>& v) { return std::unique(v.begin(), v.end()) - v.begin(); }  // @a: uUnique
std::size_t remove_keep(std::vector<int>& v, int x) { return std::remove(v.begin(), v.end(), x) - v.begin(); }  // @a: uRemove
void sort_all(std::vector<int>& v) { std::sort(v.begin(), v.end()); }  // @a: uSort
void erase_tail(std::vector<int>& v, std::size_t keep) { v.erase(v.begin() + keep, v.end()); }  // @a: uErase
