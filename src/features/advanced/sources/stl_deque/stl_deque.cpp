#include <deque>

// queue / deque lab (C++17). Every function is exactly ONE call on a real std::deque<int>.
// std::queue<int> is an adaptor over std::deque: push = push_back, pop = pop_front, front, back, size, empty.
// Pushing or popping at either END never moves the other elements (references to them stay valid; iterators may not).
// front()/back()/pop_*() on an EMPTY container are undefined behaviour: the lab stops before such a call.
void do_pushb(std::deque<int>& d, int x) { d.push_back(x); }  // @a: dPushB
void do_pushf(std::deque<int>& d, int x) { d.push_front(x); }  // @a: dPushF
void do_popb(std::deque<int>& d) { d.pop_back(); }  // @a: dPopB
void do_popf(std::deque<int>& d) { d.pop_front(); }  // @a: dPopF
int do_front(const std::deque<int>& d) { return d.front(); }  // @a: dFront
int do_back(const std::deque<int>& d) { return d.back(); }  // @a: dBack
