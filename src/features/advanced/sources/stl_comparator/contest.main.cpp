// ---- example main (stdin/stdout): line 1: k then k pairs "a b"; line 2: m; then m lines
// "sortlex | grtr | sfirst | ssecd | rev | rbeg | minel | lbf x" (lbf only while the pairs are sorted by first).
// Output: one line per operation: "r=<result or -> v=[a:b ...]" (rbeg prints a:b, minel / lbf print an index).
#include <cstdio>
#include <cstring>
#include <string>
int main() {
  int k, m;
  if (std::scanf("%d", &k) != 1) return 0;
  std::vector<P> v(k);
  for (auto& p : v) std::scanf("%d %d", &p.first, &p.second);
  if (std::scanf("%d", &m) != 1) return 0;
  char op[16];
  while (m-- > 0 && std::scanf("%15s", op) == 1) {
    std::string r = "-";
    int a = 0;
    if (!std::strcmp(op, "sortlex")) sort_lex(v);
    else if (!std::strcmp(op, "grtr")) sort_greater(v);
    else if (!std::strcmp(op, "sfirst")) stable_first(v);
    else if (!std::strcmp(op, "ssecd")) stable_second_desc(v);
    else if (!std::strcmp(op, "rev")) reverse_all(v);
    else if (!std::strcmp(op, "rbeg")) { P p = last_via_rbegin(v); r = std::to_string(p.first) + ":" + std::to_string(p.second); }
    else if (!std::strcmp(op, "minel")) r = std::to_string(min_by_first(v));
    else if (!std::strcmp(op, "lbf")) { std::scanf("%d", &a); r = std::to_string(lower_by_first(v, a)); }
    std::printf("r=%s v=[", r.c_str());
    for (size_t i = 0; i < v.size(); i++) std::printf(i ? " %d:%d" : "%d:%d", v[i].first, v[i].second);
    std::printf("]\n");
  }
  return 0;
}
