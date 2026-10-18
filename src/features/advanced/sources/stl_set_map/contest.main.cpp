// ---- example main (stdin/stdout): line 1: m; then m lines "op x" with op in
// sins sdel mins mdel mdel1 mcnt slb mapinc mapget mapfind. Containers start empty.
// Output: one line per operation: "r=<result or -> S=[set] M=[multiset] P=[k:v map]" (slb prints "end" when nothing is >= x).
#include <cstdio>
#include <cstring>
#include <string>
int main() {
  int m;
  if (std::scanf("%d", &m) != 1) return 0;
  std::set<int> s;
  std::multiset<int> ms;
  std::map<int, int> p;
  char op[16];
  while (m-- > 0 && std::scanf("%15s", op) == 1) {
    int x;
    std::scanf("%d", &x);
    std::string r = "-";
    if (!std::strcmp(op, "sins")) r = std::to_string(s_insert(s, x));
    else if (!std::strcmp(op, "sdel")) r = std::to_string(s_erase(s, x));
    else if (!std::strcmp(op, "mins")) m_insert(ms, x);
    else if (!std::strcmp(op, "mdel")) r = std::to_string(m_erase_all(ms, x));
    else if (!std::strcmp(op, "mdel1")) r = std::to_string(m_erase_one(ms, x));
    else if (!std::strcmp(op, "mcnt")) r = std::to_string(m_count(ms, x));
    else if (!std::strcmp(op, "slb")) { int o = 0; r = s_lower(s, x, o) ? std::to_string(o) : "end"; }
    else if (!std::strcmp(op, "mapinc")) map_inc(p, x);
    else if (!std::strcmp(op, "mapget")) r = std::to_string(map_get(p, x));
    else if (!std::strcmp(op, "mapfind")) r = std::to_string(map_find(p, x));
    std::printf("r=%s S=[", r.c_str());
    bool f = true;
    for (int e : s) { std::printf(f ? "%d" : " %d", e); f = false; }
    std::printf("] M=[");
    f = true;
    for (int e : ms) { std::printf(f ? "%d" : " %d", e); f = false; }
    std::printf("] P=[");
    f = true;
    for (auto& kv : p) { std::printf(f ? "%d:%d" : " %d:%d", kv.first, kv.second); f = false; }
    std::printf("]\n");
  }
  return 0;
}
