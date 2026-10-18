#include <algorithm>
#include <numeric>
#include <vector>

// Binary search on the answer: split a (all > 0) into at most k contiguous parts, minimise the largest part sum.
long long segments_needed(const std::vector<long long>& a, long long cap) {
  long long cnt = 1;  // @a: fInit
  long long cur = 0;
  for (long long x : a) {
    if (cur + x > cap) {  // @a: fCheck
      cnt++;  // @a: fNew+1
      cur = x;
    } else cur += x;  // @a: fExtend
  }
  return cnt;  // @a: fReturn
}

// segments_needed for each cap in caps (every cap must be >= max(a)).
std::vector<long long> segments_list(const std::vector<long long>& a, const std::vector<long long>& caps) {
  std::vector<long long> r;
  for (long long c : caps) r.push_back(segments_needed(a, c));
  return r;
}

long long min_largest_sum(const std::vector<long long>& a, long long k) {
  long long lo = *std::max_element(a.begin(), a.end());  // @a: bsInit+1
  long long hi = std::accumulate(a.begin(), a.end(), 0LL);
  while (lo < hi) {
    long long mid = lo + (hi - lo) / 2;  // @a: bsMid
    if (segments_needed(a, mid) <= k) {  // @a: bsCheck
      hi = mid;  // @a: bsShrink
    } else {
      lo = mid + 1;  // @a: bsRaise
    }
  }
  return lo;  // @a: bsReturn
}
