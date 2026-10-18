// ---- example main (stdin/stdout): line 1: k then k ints (initial deque, front to back); line 2: m; then m lines
// "pushb x | pushf x | popb | popf | front | back". Output: one line per operation: "r=<value read or -> size=.. [front..back]".
#include <cstdio>
#include <cstring>
int main() {
  int k, m;
  if (std::scanf("%d", &k) != 1) return 0;
  std::deque<int> d;
  for (int i = 0; i < k; i++) { int x; std::scanf("%d", &x); d.push_back(x); }
  if (std::scanf("%d", &m) != 1) return 0;
  char op[16];
  while (m-- > 0 && std::scanf("%15s", op) == 1) {
    int x = 0;
    long long r = 0;
    bool has = false;
    if (!std::strcmp(op, "pushb")) { std::scanf("%d", &x); do_pushb(d, x); }
    else if (!std::strcmp(op, "pushf")) { std::scanf("%d", &x); do_pushf(d, x); }
    else if (!std::strcmp(op, "popb")) do_popb(d);
    else if (!std::strcmp(op, "popf")) do_popf(d);
    else if (!std::strcmp(op, "front")) { r = do_front(d); has = true; }
    else if (!std::strcmp(op, "back")) { r = do_back(d); has = true; }
    if (has) std::printf("r=%lld size=%zu [", r, d.size());
    else std::printf("r=- size=%zu [", d.size());
    for (size_t i = 0; i < d.size(); i++) std::printf(i ? " %d" : "%d", d[i]);
    std::printf("]\n");
  }
  return 0;
}
