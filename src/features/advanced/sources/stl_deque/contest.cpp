// queue / deque operations — contest reference (compact). C++17, header <deque>.
// std::queue<int> q: q.push(x) / q.pop() / q.front() / q.back() / q.size() / q.empty() — BFS and sliding-window queues use exactly this.
// std::deque additionally supports push_front / pop_back and random access d[i]. Never call front/back/pop on an empty container.
#include <deque>
void do_pushb(std::deque<int>& d, int x) { d.push_back(x); }
void do_pushf(std::deque<int>& d, int x) { d.push_front(x); }
void do_popb(std::deque<int>& d) { d.pop_back(); }
void do_popf(std::deque<int>& d) { d.pop_front(); }
int do_front(const std::deque<int>& d) { return d.front(); }
int do_back(const std::deque<int>& d) { return d.back(); }

