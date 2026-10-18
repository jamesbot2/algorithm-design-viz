// Monotonic stack — contest version. Heights/values are long long; indices are int.
// next_greater(a)[i] = index of the next STRICTLY greater element to the right, or -1.
// largest_rect(h)    = max over bars of height * width of the maximal window where that bar is the minimum (h >= 0).
// O(n) each (every index is pushed and popped at most once). C++17, headers <algorithm> <vector>.
#include <algorithm>
#include <vector>
std::vector<int> next_greater(const std::vector<long long>& a) {
  std::vector<int> r(a.size(), -1), st;
  for (int i = 0; i < (int)a.size(); i++) {
    while (!st.empty() && a[st.back()] < a[i]) r[st.back()] = i, st.pop_back();
    st.push_back(i);
  }
  return r;
}
long long largest_rect(const std::vector<long long>& h) {
  std::vector<int> st;
  long long best = 0;
  for (int i = 0; i <= (int)h.size(); i++) {
    long long cur = i == (int)h.size() ? 0 : h[i];
    while (!st.empty() && h[st.back()] >= cur) {
      long long ht = h[st.back()];
      st.pop_back();
      best = std::max(best, ht * (i - (st.empty() ? 0 : st.back() + 1)));
    }
    st.push_back(i);
  }
  return best;
}

