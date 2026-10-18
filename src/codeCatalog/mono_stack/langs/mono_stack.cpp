#include <algorithm>
#include <vector>

// Monotonic stack. next_greater: index of the next STRICTLY greater element to the right, or -1.
std::vector<long long> next_greater(const std::vector<long long>& a) {
  std::vector<long long> res(a.size(), -1);  // @a: msInit
  std::vector<int> st;  // indices; values never increase from bottom to top
  for (int i = 0; i < (int)a.size(); i++) {
    while (!st.empty() && a[st.back()] < a[i]) {  // @a: msPopCheck
      res[st.back()] = i;  // @a: msPop
      st.pop_back();
    }
    st.push_back(i);  // @a: msPush
  }
  return res;  // @a: msReturn
}

// Largest rectangle in a histogram of non-negative heights (unit-width bars).
long long largest_rectangle(const std::vector<long long>& h) {
  std::vector<int> st;  // indices; heights strictly increase from bottom to top
  long long best = 0;
  for (int i = 0; i <= (int)h.size(); i++) {
    long long cur = i == (int)h.size() ? 0 : h[i];  // sentinel height 0 flushes the stack
    while (!st.empty() && h[st.back()] >= cur) {  // @a: lrPopCheck
      long long height = h[st.back()];  // @a: lrPop
      st.pop_back();
      int left = st.empty() ? 0 : st.back() + 1;  // @a: lrArea+1
      best = std::max(best, height * (i - left));
    }
    st.push_back(i);  // @a: lrPush
  }
  return best;  // @a: lrReturn
}
