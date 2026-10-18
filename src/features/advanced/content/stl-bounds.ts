import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '标准规定：区间 [first,last) 必须已按比较关系划分；对随机访问迭代器比较次数是对数级。具体二分的语句顺序不是标准文本，本页的"教学模型"只是选定的一种写法。',
    '本页演示的是本站内置的操作模型，不是 C++ 编译器，也不会执行用户编辑的 C++ 源码。',
    '非随机访问迭代器（如 std::set 的迭代器）上调用泛型 std::lower_bound 比较次数仍是对数，但迭代器移动是线性的；set/map 请优先用成员函数 s.lower_bound(x)。',
  ],
  sections: [
    { id: 'when', title: '适用场景', bullets: ['在已排序序列里找"第一个不小于 x"或"第一个大于 x"的位置。', '统计某个值出现几次：upper_bound − lower_bound。', '把"有序查找"变成"插入位置"：返回的位置就是保持有序的插入点。'] },
    { id: 'header', title: '头文件与最低标准', paragraphs: ['头文件 <algorithm>。本站模板以 C++17 为基线（这是产品选择，不代表所有比赛都使用 C++17）。'] },
    {
      id: 'api',
      title: '核心 API 与闭开区间',
      table: {
        head: ['函数', '返回', '含义'],
        rows: [
          ['lower_bound(first,last,x)', '迭代器', '第一个满足 !(*it < x) 的位置，即第一个 ≥ x'],
          ['upper_bound(first,last,x)', '迭代器', '第一个满足 x < *it 的位置，即第一个 > x'],
          ['返回 last（= end()）', '—', '没有这样的元素；end() 不可解引用'],
        ],
      },
      paragraphs: ['区间是闭开的 [first,last)：first 在范围内，last 不在。因此"返回 last"是合法的、有意义的答案——表示"全都满足 < x（或 ≤ x）"。', '重复值时：lower_bound 指向这批重复值的第一个，upper_bound 指向最后一个的下一个，两者之差就是个数。'],
    },
    { id: 'precondition', title: '前提：序列必须有序', paragraphs: ['二分依赖"左边都不满足、右边都满足"的划分。若序列没有按 < 排好序，结果没有意义。本实验在运行前检查前提，未排序的输入会被拒绝，而不是硬给一个"查找结果"。'] },
    { id: 'complexity', title: '复杂度条件', bullets: ['随机访问迭代器（vector、数组）：O(log n) 次比较。', '对 list 之类的迭代器：比较仍是对数，但移动迭代器是 O(n)。', 'set/multiset/map 的成员 lower_bound：O(log n)。'] },
    { id: 'example', title: '操作示例', code: { label: 'C++17', text: '#include <algorithm>\n#include <vector>\nstd::vector<int> v = {1, 2, 2, 2, 5, 8, 8, 13};\nauto lo = std::lower_bound(v.begin(), v.end(), 2);  // 下标 1\nauto hi = std::upper_bound(v.begin(), v.end(), 2);  // 下标 4\nint cnt = int(hi - lo);                              // 3 个 2\nauto it = std::lower_bound(v.begin(), v.end(), 14);  // == v.end()' } },
    { id: 'mistakes', title: '常见错误', bullets: ['在未排序序列上调用。', '对返回的 end() 解引用（未定义行为）。', '混淆 lower/upper：查"是否存在 x"应检查 it != end() && *it == x。', '比较器用 <= 代替严格弱序（会破坏二分的不变量）。', '把迭代器差当成 int 溢出：容器很大时用 ptrdiff_t / size_t。'] },
    { id: 'related', title: '关联', paragraphs: ['课程里的「二分查找」演示的是"在有序数组中查值"；这里强调"位置"语义与闭开区间。'] },
  ],
}
export default content
