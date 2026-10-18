// set / multiset / map — contest reference (same calls as the teaching file). C++17, headers <map>, <set>.
// count(k) / find(k) read without inserting; m[k] inserts. multiset: erase(value) removes ALL copies, erase(find(value)) removes one.
// All operations are O(log n); iteration visits keys in increasing order.
#include <map>
#include <set>
int s_insert(std::set<int>& s, int x) { return s.insert(x).second; }
int s_erase(std::set<int>& s, int x) { return (int)s.erase(x); }
void m_insert(std::multiset<int>& m, int x) { m.insert(x); }
int m_erase_all(std::multiset<int>& m, int x) { return (int)m.erase(x); }
int m_erase_one(std::multiset<int>& m, int x) {
  auto it = m.find(x);
  if (it == m.end()) return 0;
  m.erase(it);
  return 1;
}
int m_count(const std::multiset<int>& m, int x) { return (int)m.count(x); }
bool s_lower(const std::set<int>& s, int x, int& out) {
  auto it = s.lower_bound(x);
  if (it == s.end()) return false;
  out = *it;
  return true;
}
void map_inc(std::map<int, int>& p, int k) { p[k]++; }
int map_get(std::map<int, int>& p, int k) { return p[k]; }
int map_find(const std::map<int, int>& p, int k) {
  auto it = p.find(k);
  if (it == p.end()) return -1;
  return it->second;
}

