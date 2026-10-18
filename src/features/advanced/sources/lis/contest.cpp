// Strictly increasing LIS in O(n log n) — contest version. lis_strict(a) returns one longest strictly increasing subsequence
// (values, in order). Its size is the LIS length. For NON-strict (<=) replace lower_bound by upper_bound.
// Note: `tails` holds the smallest tail values — it is NOT itself the answer; recover through prev. C++17, headers <algorithm>, <vector>.
#include <algorithm>
#include <vector>
std::vector<long long> lis_strict(const std::vector<long long>& a) {
  int n = (int)a.size();
  std::vector<long long> tv;       // tv[k] = smallest tail value of a strictly increasing subsequence of length k+1
  std::vector<int> ti, prev(n, -1);  // ti[k] = index of that tail
  for (int i = 0; i < n; i++) {
    int p = (int)(std::lower_bound(tv.begin(), tv.end(), a[i]) - tv.begin());
    if (p > 0) prev[i] = ti[p - 1];
    if (p == (int)tv.size()) tv.push_back(a[i]), ti.push_back(i);
    else tv[p] = a[i], ti[p] = i;
  }
  std::vector<long long> seq;
  for (int k = ti.empty() ? -1 : ti.back(); k >= 0; k = prev[k]) seq.push_back(a[k]);
  std::reverse(seq.begin(), seq.end());
  return seq;
}

