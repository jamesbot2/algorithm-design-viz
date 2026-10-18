// lower_bound / upper_bound — contest idiom (reference, uses the standard library).
// C++17, header <algorithm>. Precondition: v sorted non-decreasing. Closed-open [begin, end).
// idx = first position with !(v[i] < x) (lower) / x < v[i] (upper); idx == v.size() means "none".
#include <algorithm>
#include <vector>
long long count_equal(const std::vector<int>& v, int x) {
  return std::upper_bound(v.begin(), v.end(), x) - std::lower_bound(v.begin(), v.end(), x);
}
int first_ge(const std::vector<int>& v, int x) {  // index of first v[i] >= x, or v.size()
  return int(std::lower_bound(v.begin(), v.end(), x) - v.begin());
}
int first_gt(const std::vector<int>& v, int x) {  // index of first v[i] > x, or v.size()
  return int(std::upper_bound(v.begin(), v.end(), x) - v.begin());
}
