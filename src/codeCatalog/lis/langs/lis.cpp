#include <algorithm>
#include <vector>

// Strictly increasing LIS in O(n log n) with recovery. Returns {length, one longest strictly increasing subsequence...}.
std::vector<long long> lis(const std::vector<long long>& a) {
  int n = (int)a.size();
  std::vector<int> tails, prev(n, -1);  // tails[k] = index of the smallest possible tail of length k+1
  for (int i = 0; i < n; i++) {
    int lo = 0, hi = (int)tails.size();
    while (lo < hi) {  // @a: lisSearch+4
      int mid = (lo + hi) / 2;
      if (a[tails[mid]] < a[i]) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1];  // @a: lisPrev
    if (lo == (int)tails.size()) tails.push_back(i);  // @a: lisPlace+1
    else tails[lo] = i;
  }
  std::vector<long long> seq;
  for (int k = tails.empty() ? -1 : tails.back(); k >= 0; k = prev[k]) seq.push_back(a[k]);  // @a: lisRecover
  std::reverse(seq.begin(), seq.end());
  seq.insert(seq.begin(), (long long)seq.size());  // @a: lisReturn
  return seq;
}
