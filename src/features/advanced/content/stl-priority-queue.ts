import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '标准规定：std::priority_queue 是容器适配器，top() 返回一个最大元素（按比较器），push/pop 是对数复杂度。内部通常用 push_heap/pop_heap 在 vector 上实现，但确切的交换序列与最终数组形状不是标准保证。',
    '本页的堆是"选定的教学模型"（教科书二叉大根堆，严格 < 比较，相等不交换），不是某个 STL 二进制的真实内存回放。',
    '堆序 ≠ 整个数组有序：只保证父 ≥ 孩子。兄弟之间、叶子之间没有顺序。',
  ],
  sections: [
    { id: 'when', title: '适用场景', bullets: ['反复取"当前最大/最小"：Dijkstra、合并 k 个有序序列、任务调度。', '需要 O(log n) 的插入与取最值，不需要遍历或按值删除。'] },
    { id: 'header', title: '头文件与最低标准', paragraphs: ['<queue>；小根堆还需要 <functional>（std::greater）与 <vector>。以 C++17 为基线。'] },
    {
      id: 'api',
      title: '核心 API',
      table: {
        head: ['写法', '说明'],
        rows: [
          ['priority_queue<int> pq;', '默认 std::less → 大根堆，top 是最大值'],
          ['pq.push(x);', '插入，O(log n)'],
          ['pq.top();', '只读最大元素，O(1)；容器为空时未定义行为'],
          ['pq.pop();', '删除最大元素，O(log n)；容器为空时未定义行为'],
          ['priority_queue<int, vector<int>, greater<int>> mq;', '小根堆'],
        ],
      },
    },
    { id: 'ops', title: '操作：上浮与下沉', bullets: ['push：先放到数组末尾，再与父比较，比父大就交换（上浮），直到不大于父或到根。', 'pop：把堆顶与末尾交换，移除末尾，再让新的根与较大的孩子比较并下沉。', '相等时不交换（严格 <）：重复值各自保留。'] },
    { id: 'complexity', title: '复杂度条件', bullets: ['push / pop：O(log n)（树高 ⌊log2 n⌋）。', 'top：O(1)。', '用 n 个元素一次性构造（make_heap）：O(n)，比逐个 push 的 O(n log n) 快。'] },
    { id: 'example', title: '操作示例', code: { label: 'C++17', text: '#include <queue>\n#include <vector>\n#include <functional>\nstd::priority_queue<int> pq;\npq.push(5); pq.push(9); pq.push(3);\nint a = pq.top();  // 9\npq.pop();          // 现在 top 是 5\nstd::priority_queue<int, std::vector<int>, std::greater<int>> mq;  // 小根堆\nmq.push(5); mq.push(3);  // mq.top() == 3' } },
    { id: 'mistakes', title: '常见错误', bullets: ['对空队列调用 top() / pop()（未定义行为）。本实验在执行它之前停止并解释。', '把底层数组当作有序数组读取。', '自定义比较器写成 <=（不是严格弱序）。', '想要小根堆却忘了第三个模板参数，或在 pair 上忘了"字典序大者优先"。', '用 priority_queue 做"按值删除/修改优先级"：它不支持，需要换结构（如 set）或"懒删除"。'] },
    { id: 'related', title: '关联', paragraphs: ['课程里的「堆优化 Dijkstra」使用同一类结构；这里把堆本身拆开讲。'] },
  ],
}
export default content
