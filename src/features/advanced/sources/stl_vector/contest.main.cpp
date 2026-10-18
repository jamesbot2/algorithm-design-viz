// ---- example main (stdin/stdout): line 1: k then k ints (initial vector); line 2: m; then m lines "op args"
// (push x | reserve n | resize n | insert i x | erase i | shrink | it i | use).
// Output: one line per operation: "size=.. cap=.. re=<1 if the buffer moved> [contents]".
#include <cstdio>
#include <cstring>
int main() {
  int k, m;
  if (std::scanf("%d", &k) != 1) return 0;
  std::vector<int> v(k);
  for (auto& x : v) std::scanf("%d", &x);
  if (std::scanf("%d", &m) != 1) return 0;
  char op[16];
  while (m-- > 0 && std::scanf("%15s", op) == 1) {
    const int* before = v.data();
    long long a = 0, b = 0;
    if (!std::strcmp(op, "push")) { std::scanf("%lld", &a); do_push(v, (int)a); }
    else if (!std::strcmp(op, "reserve")) { std::scanf("%lld", &a); do_reserve(v, (std::size_t)a); }
    else if (!std::strcmp(op, "resize")) { std::scanf("%lld", &a); do_resize(v, (std::size_t)a); }
    else if (!std::strcmp(op, "insert")) { std::scanf("%lld %lld", &a, &b); do_insert(v, (std::size_t)a, (int)b); }
    else if (!std::strcmp(op, "erase")) { std::scanf("%lld", &a); do_erase(v, (std::size_t)a); }
    else if (!std::strcmp(op, "shrink")) do_shrink(v);
    else if (!std::strcmp(op, "it")) std::scanf("%lld", &a);  // iterator bookkeeping only (see the lab page)
    std::printf("size=%zu cap=%zu re=%d [", v.size(), v.capacity(), v.data() != before ? 1 : 0);
    for (size_t i = 0; i < v.size(); i++) std::printf(i ? " %d" : "%d", v[i]);
    std::printf("]\n");
  }
  return 0;
}
