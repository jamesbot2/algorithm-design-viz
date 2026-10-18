#include <cstddef>
#include <string>
#include <tuple>
#include <utility>

// string / pair / tuple lab (C++17). Every function is ONE call on a real std::string / std::pair / std::tuple.
// find / rfind return std::string::npos (the largest size_t) when there is no match — never compare the result with -1 as an int.
// substr / erase / insert throw std::out_of_range when pos > size(); the lab stops before such a call.
// pair and tuple compare LEXICOGRAPHICALLY: first element decides, ties go to the next element.
void s_append(std::string& s, const std::string& x) { s += x; }  // @a: stApp
std::string s_sub(const std::string& s, std::size_t p, std::size_t n) { return s.substr(p, n); }  // @a: stSub
std::size_t s_find(const std::string& s, const std::string& x) { return s.find(x); }  // @a: stFind
std::size_t s_rfind(const std::string& s, const std::string& x) { return s.rfind(x); }  // @a: stRfind
void s_erase(std::string& s, std::size_t p, std::size_t n) { s.erase(p, n); }  // @a: stErase
void s_insert(std::string& s, std::size_t p, const std::string& x) { s.insert(p, x); }  // @a: stIns
bool pair_less(int a, int b, int c, int d) { return std::make_pair(a, b) < std::make_pair(c, d); }  // @a: stPair
bool tuple_less(int a, int b, int c, int d, int e, int f) { return std::tie(a, b, c) < std::tie(d, e, f); }  // @a: stTuple
