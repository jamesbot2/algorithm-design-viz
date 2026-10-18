// vector operations — contest reference (same calls as the teaching file, compact). C++17, headers <cstddef>, <vector>.
// reserve(n) avoids repeated reallocation when the final size is known; resize(n) CHANGES size (and value-initialises new elements).
// After any reallocation (push_back/insert/reserve/resize/shrink_to_fit that moved the buffer) ALL iterators, pointers and references are invalid.
#include <cstddef>
#include <vector>
void do_push(std::vector<int>& v, int x) { v.push_back(x); }
void do_reserve(std::vector<int>& v, std::size_t n) { v.reserve(n); }
void do_resize(std::vector<int>& v, std::size_t n) { v.resize(n); }
void do_insert(std::vector<int>& v, std::size_t i, int x) { v.insert(v.begin() + i, x); }
void do_erase(std::vector<int>& v, std::size_t i) { v.erase(v.begin() + i); }
void do_shrink(std::vector<int>& v) { v.shrink_to_fit(); }

