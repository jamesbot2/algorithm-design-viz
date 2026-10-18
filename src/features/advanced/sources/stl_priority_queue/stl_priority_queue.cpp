#include <cstddef>
#include <queue>
#include <utility>
#include <vector>

// priority_queue teaching model: a textbook binary max-heap on a vector (C++17).
// std::priority_queue<int> (default: max-heap) keeps the same observable contract:
// top() is a maximum, push/pop are O(log n). The standard does NOT fix the exact swap
// sequence or the final array; this is the chosen teaching model, not libstdc++ source.
// Precondition for top()/pop(): the heap is not empty (otherwise undefined behaviour).
// Min-heap in real code: std::priority_queue<int, std::vector<int>, std::greater<int>>.

struct MaxHeap {
  std::vector<int> h;  // children of i are 2i+1 and 2i+2; heap order only (not sorted)

  void push(int v) {
    h.push_back(v);  // @a: pushAppend
    std::size_t i = h.size() - 1;
    while (i > 0) {  // @a: siftUpLoop
      std::size_t parent = (i - 1) / 2;
      if (!(h[parent] < h[i])) break;  // @a: siftUpCmp
      std::swap(h[parent], h[i]);  // @a: siftUpSwap
      i = parent;
    }
  }

  int top() const { return h.front(); }  // @a: top

  void pop() {
    std::swap(h.front(), h.back());  // @a: popSwap
    h.pop_back();  // @a: popShrink
    std::size_t i = 0, n = h.size();
    while (true) {
      std::size_t l = 2 * i + 1, r = l + 1, big = i;  // @a: siftDownCmp+3
      if (l < n && h[big] < h[l]) big = l;
      if (r < n && h[big] < h[r]) big = r;
      if (big == i) break;
      std::swap(h[i], h[big]);  // @a: siftDownSwap
      i = big;
    }
  }

  bool empty() const { return h.empty(); }
};
