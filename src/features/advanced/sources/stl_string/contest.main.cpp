// ---- example main (stdin/stdout): line 1: initial string (letters) or "-" for empty; line 2: m; then m lines
// "app w | sub p n | find w | rfind w | ers p n | ins p w | pless a b c d | tless a b c d e f".
// Output: one line per operation: "r=<result or -> s=<string>" (find / rfind print npos when absent).
#include <cstdio>
#include <cstring>
int main() {
  char buf[64];
  int m;
  if (std::scanf("%63s %d", buf, &m) != 2) return 0;
  std::string s = std::strcmp(buf, "-") ? buf : "";
  char op[16], w[64];
  while (m-- > 0 && std::scanf("%15s", op) == 1) {
    std::string r = "-";
    int a, b, c, d, e, f;
    if (!std::strcmp(op, "app")) { std::scanf("%63s", w); s_append(s, w); }
    else if (!std::strcmp(op, "sub")) { std::scanf("%d %d", &a, &b); r = s_sub(s, a, b); }
    else if (!std::strcmp(op, "find") || !std::strcmp(op, "rfind")) {
      std::scanf("%63s", w);
      std::size_t pos = !std::strcmp(op, "find") ? s_find(s, w) : s_rfind(s, w);
      r = pos == std::string::npos ? "npos" : std::to_string(pos);
    }
    else if (!std::strcmp(op, "ers")) { std::scanf("%d %d", &a, &b); s_erase(s, a, b); }
    else if (!std::strcmp(op, "ins")) { std::scanf("%d %63s", &a, w); s_insert(s, a, w); }
    else if (!std::strcmp(op, "pless")) { std::scanf("%d %d %d %d", &a, &b, &c, &d); r = pair_less(a, b, c, d) ? "1" : "0"; }
    else if (!std::strcmp(op, "tless")) { std::scanf("%d %d %d %d %d %d", &a, &b, &c, &d, &e, &f); r = tuple_less(a, b, c, d, e, f) ? "1" : "0"; }
    std::printf("r=%s s=%s\n", r.c_str(), s.c_str());
  }
  return 0;
}
