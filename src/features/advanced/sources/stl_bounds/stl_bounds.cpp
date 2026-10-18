#include <algorithm>
#include <cstddef>
#include <vector>

// lower_bound / upper_bound teaching model on the closed-open range [first, last).
// Header <algorithm>, C++17. Precondition: a is sorted non-decreasing under operator<.
// Not the library source: the standard fixes the result and the O(log n) comparison
// count for random-access iterators, not these exact statements.

// First index i with !(a[i] < x); a.size() means end() (no such element).
std::size_t lower_bound_idx(const std::vector<int>& a, int x) {
  std::size_t first = 0, last = a.size();  // @a: lbInit
  while (first < last) {  // @a: lbLoop
    std::size_t mid = first + (last - first) / 2;  // @a: lbMid
    if (a[mid] < x) {  // @a: lbCmp
      first = mid + 1;  // @a: lbGoRight
    } else {
      last = mid;  // @a: lbGoLeft
    }
  }
  return first;  // @a: lbDone
}

// First index i with x < a[i]; a.size() means end().
std::size_t upper_bound_idx(const std::vector<int>& a, int x) {
  std::size_t first = 0, last = a.size();  // @a: ubInit
  while (first < last) {  // @a: ubLoop
    std::size_t mid = first + (last - first) / 2;  // @a: ubMid
    if (!(x < a[mid])) {  // @a: ubCmp
      first = mid + 1;  // @a: ubGoRight
    } else {
      last = mid;  // @a: ubGoLeft
    }
  }
  return first;  // @a: ubDone
}

// The standard-library way: same answers, iterator arithmetic gives the index.
std::size_t std_lower_bound_idx(const std::vector<int>& a, int x) {
  return static_cast<std::size_t>(std::lower_bound(a.begin(), a.end(), x) - a.begin());
}
std::size_t std_upper_bound_idx(const std::vector<int>& a, int x) {
  return static_cast<std::size_t>(std::upper_bound(a.begin(), a.end(), x) - a.begin());
}
