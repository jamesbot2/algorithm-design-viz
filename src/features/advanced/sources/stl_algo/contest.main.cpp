// ---- example main (stdin/stdout): line 1: k then k ints; line 2: m; then m lines
// "srt | rsrt | rev | rot k | nperm | pperm | nth k | cnt x | mx | lbd x" (lbd only right after srt).
// Output: one line per operation: "r=<result or -> v=[contents]" (nperm / pperm print 1 or 0; nth works on a copy).
#include <cstdio>
#include <cstring>
#include <string>
int main() {
  int k, m;
  if (std::scanf("%d", &k) != 1) return 0;
  std::vector<int> v(k);
  for (auto& x : v) std::scanf("%d", &x);
  if (std::scanf("%d", &m) != 1) return 0;
  char op[16];
  while (m-- > 0 && std::scanf("%15s", op) == 1) {
    std::string r = "-";
    int a = 0;
    if (!std::strcmp(op, "srt")) do_sort(v);
    else if (!std::strcmp(op, "rsrt")) do_rsort(v);
    else if (!std::strcmp(op, "rev")) do_reverse(v);
    else if (!std::strcmp(op, "rot")) { std::scanf("%d", &a); do_rotate(v, (std::size_t)a); }
    else if (!std::strcmp(op, "nperm")) r = do_next(v) ? "1" : "0";
    else if (!std::strcmp(op, "pperm")) r = do_prev(v) ? "1" : "0";
    else if (!std::strcmp(op, "nth")) { std::scanf("%d", &a); r = std::to_string(do_nth(v, (std::size_t)a)); }
    else if (!std::strcmp(op, "cnt")) { std::scanf("%d", &a); r = std::to_string(do_count(v, a)); }
    else if (!std::strcmp(op, "mx")) r = std::to_string(do_maxpos(v));
    else if (!std::strcmp(op, "lbd")) { std::scanf("%d", &a); r = std::to_string(do_lower(v, a)); }
    std::printf("r=%s v=[", r.c_str());
    for (size_t i = 0; i < v.size(); i++) std::printf(i ? " %d" : "%d", v[i]);
    std::printf("]\n");
  }
  return 0;
}
