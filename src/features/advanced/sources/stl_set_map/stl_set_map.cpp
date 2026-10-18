#include <map>
#include <set>

// set / multiset / map lab (C++17). Every function is ONE call on a real std container.
// set keeps unique sorted keys, multiset keeps duplicates, map keeps sorted unique keys with a value.
// multiset::erase(value) removes ALL copies; erase(find(value)) removes ONE. map[k] INSERTS k with value 0 when absent —
// even when you only wanted to read it; use find / count to look without inserting.
int s_insert(std::set<int>& s, int x) { return s.insert(x).second; }  // @a: sIns
int s_erase(std::set<int>& s, int x) { return (int)s.erase(x); }  // @a: sDel
void m_insert(std::multiset<int>& m, int x) { m.insert(x); }  // @a: mIns
int m_erase_all(std::multiset<int>& m, int x) { return (int)m.erase(x); }  // @a: mDelAll
int m_erase_one(std::multiset<int>& m, int x) {  // @a: mDelOne+4
  auto it = m.find(x);
  if (it == m.end()) return 0;
  m.erase(it);
  return 1;
}
int m_count(const std::multiset<int>& m, int x) { return (int)m.count(x); }  // @a: mCnt
bool s_lower(const std::set<int>& s, int x, int& out) {  // @a: sLb+3
  auto it = s.lower_bound(x);
  if (it == s.end()) return false;
  out = *it;
  return true;
}
void map_inc(std::map<int, int>& p, int k) { p[k]++; }  // @a: pInc
int map_get(std::map<int, int>& p, int k) { return p[k]; }  // @a: pGet
int map_find(const std::map<int, int>& p, int k) {  // @a: pFind+3
  auto it = p.find(k);
  if (it == p.end()) return -1;
  return it->second;
}
