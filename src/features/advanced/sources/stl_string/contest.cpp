// string / pair / tuple — contest reference (same calls as the teaching file). C++17, headers <cstddef>, <string>, <tuple>, <utility>.
// s.find(t) == std::string::npos means "absent". pair / tuple operator< is lexicographic, so sorting pairs sorts by first then second;
// std::tie(a, b, c) < std::tie(d, e, f) compares three fields without writing a comparator.
#include <cstddef>
#include <string>
#include <tuple>
#include <utility>
void s_append(std::string& s, const std::string& x) { s += x; }
std::string s_sub(const std::string& s, std::size_t p, std::size_t n) { return s.substr(p, n); }
std::size_t s_find(const std::string& s, const std::string& x) { return s.find(x); }
std::size_t s_rfind(const std::string& s, const std::string& x) { return s.rfind(x); }
void s_erase(std::string& s, std::size_t p, std::size_t n) { s.erase(p, n); }
void s_insert(std::string& s, std::size_t p, const std::string& x) { s.insert(p, x); }
bool pair_less(int a, int b, int c, int d) { return std::make_pair(a, b) < std::make_pair(c, d); }
bool tuple_less(int a, int b, int c, int d, int e, int f) { return std::tie(a, b, c) < std::tie(d, e, f); }

