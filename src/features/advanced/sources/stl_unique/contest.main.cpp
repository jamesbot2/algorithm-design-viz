// ---- example main (stdin/stdout): line 1: k then k ints; line 2: "mode x" (mode 0 = unique, 1 = remove x, 2 = sort then unique).
// Output: one line "k=<logical new size> kept=[prefix before erase] final=[after erase] size_before_erase=<k0>".
#include <cstdio>
int main() {
  int k, mode, x;
  if (std::scanf("%d", &k) != 1) return 0;
  std::vector<int> v(k);
  for (auto& e : v) std::scanf("%d", &e);
  if (std::scanf("%d %d", &mode, &x) != 2) return 0;
  if (mode == 2) sort_all(v);
  std::size_t keep = mode == 1 ? remove_keep(v, x) : unique_keep(v);
  std::size_t before = v.size();
  std::printf("k=%zu kept=[", keep);
  for (size_t i = 0; i < keep; i++) std::printf(i ? " %d" : "%d", v[i]);
  erase_tail(v, keep);
  std::printf("] final=[");
  for (size_t i = 0; i < v.size(); i++) std::printf(i ? " %d" : "%d", v[i]);
  std::printf("] size_before_erase=%zu\n", before);
  return 0;
}
