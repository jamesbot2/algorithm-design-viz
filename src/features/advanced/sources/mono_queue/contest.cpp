// Monotonic deque — contest version. sliding(a, k, cmp): value of the "best" element of every length-k window,
// where cmp(x, y) = true means x is at least as good as y (>= for max, <= for min). 1 <= k <= a.size().
// O(n): every index enters and leaves the deque once. C++17, headers <deque> <vector>.
#include <deque>
#include <functional>
#include <vector>
template <class T, class Cmp>
std::vector<T> sliding(const std::vector<T>& a, int k, Cmp cmp) {
  std::vector<T> out;
  std::deque<int> dq;
  for (int i = 0; i < (int)a.size(); i++) {
    while (!dq.empty() && cmp(a[i], a[dq.back()])) dq.pop_back();
    dq.push_back(i);
    if (dq.front() <= i - k) dq.pop_front();
    if (i >= k - 1) out.push_back(a[dq.front()]);
  }
  return out;
}
template <class T> std::vector<T> window_max(const std::vector<T>& a, int k) { return sliding(a, k, std::greater_equal<T>()); }
template <class T> std::vector<T> window_min(const std::vector<T>& a, int k) { return sliding(a, k, std::less_equal<T>()); }

