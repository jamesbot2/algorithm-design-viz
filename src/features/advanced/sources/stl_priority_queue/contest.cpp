// priority_queue — contest idiom (reference, uses the standard library).
// C++17, headers <functional> <queue> <vector>. push/pop O(log n), top O(1); top()/pop() on an empty queue is UB.
// Default is a MAX-heap. Min-heap: third template argument std::greater<T>. Pair keys compare lexicographically.
#include <functional>
#include <queue>
#include <vector>
template <class T>
using MinPQ = std::priority_queue<T, std::vector<T>, std::greater<T>>;
// Pops everything, returns the values in non-increasing order (heap sort via the queue).
std::vector<int> drain_desc(std::vector<int> v) {
  std::priority_queue<int> pq(v.begin(), v.end());
  std::vector<int> out;
  while (!pq.empty()) out.push_back(pq.top()), pq.pop();
  return out;
}
