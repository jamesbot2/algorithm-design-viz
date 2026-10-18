#include <deque>
#include <vector>

// Monotonic deque. sliding_max: maximum of every window of length k (1 <= k <= a.size()).
std::vector<long long> sliding_max(const std::vector<long long>& a, long long k) {
  std::vector<long long> out;
  std::deque<int> dq;  // indices; values strictly decrease from front to back
  for (int i = 0; i < (int)a.size(); i++) {
    while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();  // @a: mqPopBack
    dq.push_back(i);  // @a: mqPush
    if (dq.front() <= i - k) dq.pop_front();  // @a: mqExpire
    if (i >= k - 1) out.push_back(a[dq.front()]);  // @a: mqEmit
  }
  return out;
}

// Minimum of every window: the maximum of the negated array, negated back.
std::vector<long long> sliding_min(const std::vector<long long>& a, long long k) {
  std::vector<long long> neg;
  for (long long x : a) neg.push_back(-x);
  std::vector<long long> r = sliding_max(neg, k);
  for (long long& x : r) x = -x;
  return r;
}
