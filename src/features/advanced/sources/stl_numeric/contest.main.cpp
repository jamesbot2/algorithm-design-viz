// ---- example main (stdin/stdout): line 1: k then k ints; line 2: m; then m lines
// "iota x | acc | psum | adiff | gcdall | bset i | bflip i | bcnt | bshl k" (bit indices 0..15). The bitset<16> starts all zero.
// Output: one line per operation: "r=<result or -> v=[contents] b=<16 bits, bit 15 first>".
#include <cstdio>
#include <cstring>
#include <string>
int main() {
  int k, m;
  if (std::scanf("%d", &k) != 1) return 0;
  std::vector<int> v(k);
  for (auto& x : v) std::scanf("%d", &x);
  if (std::scanf("%d", &m) != 1) return 0;
  std::bitset<16> b;
  char op[16];
  while (m-- > 0 && std::scanf("%15s", op) == 1) {
    std::string r = "-";
    int a = 0;
    if (!std::strcmp(op, "iota")) { std::scanf("%d", &a); do_iota(v, a); }
    else if (!std::strcmp(op, "acc")) r = std::to_string(do_sum(v));
    else if (!std::strcmp(op, "psum")) do_psum(v);
    else if (!std::strcmp(op, "adiff")) do_adiff(v);
    else if (!std::strcmp(op, "gcdall")) r = std::to_string(do_gcdall(v));
    else if (!std::strcmp(op, "bset")) { std::scanf("%d", &a); bit_set(b, (std::size_t)a); }
    else if (!std::strcmp(op, "bflip")) { std::scanf("%d", &a); bit_flip(b, (std::size_t)a); }
    else if (!std::strcmp(op, "bcnt")) r = std::to_string(bit_count(b));
    else if (!std::strcmp(op, "bshl")) { std::scanf("%d", &a); bit_shl(b, (std::size_t)a); }
    std::printf("r=%s v=[", r.c_str());
    for (size_t i = 0; i < v.size(); i++) std::printf(i ? " %d" : "%d", v[i]);
    std::printf("] b=%s\n", b.to_string().c_str());
  }
  return 0;
}
