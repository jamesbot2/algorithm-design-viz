#include <cstddef>
#include <vector>

// vector lab (C++17). Every function is exactly ONE call on a real std::vector<int>.
// size()/capacity(), reallocation and iterator invalidation follow the standard; the capacity GROWTH factor is
// implementation-defined (libstdc++ doubles; other libraries may differ). Using an invalidated iterator is
// undefined behaviour, so the lab stops before such a call instead of drawing a made-up value.
void do_push(std::vector<int>& v, int x) { v.push_back(x); }  // @a: vPush
void do_reserve(std::vector<int>& v, std::size_t n) { v.reserve(n); }  // @a: vReserve
void do_resize(std::vector<int>& v, std::size_t n) { v.resize(n); }  // @a: vResize
void do_insert(std::vector<int>& v, std::size_t i, int x) { v.insert(v.begin() + i, x); }  // @a: vInsert
void do_erase(std::vector<int>& v, std::size_t i) { v.erase(v.begin() + i); }  // @a: vErase
void do_shrink(std::vector<int>& v) { v.shrink_to_fit(); }  // @a: vShrink
std::vector<int>::iterator do_iter(std::vector<int>& v, std::size_t i) { return v.begin() + i; }  // @a: vIter
int do_use(std::vector<int>::iterator it) { return *it; }  // @a: vUse
