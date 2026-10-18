import type { TopicContent } from './types'

const content: TopicContent = {
  "boundary": [
    "这是\"内置模型\"实验：页面运行站内的操作模型并把每一步画出来；右侧的 C++ 是对应的参考代码，不会执行你编辑过的 C++。模型的状态已用真实 g++（ASan+UBSan）对拍。",
    "sort 的内部比较顺序标准未规定，本页只演示结果唯一的情形（对 pair 的全序排序）和 stable_sort。",
    "违反严格弱序的比较器（如 <=）是未定义行为，本页只在说明里讲它，不执行。",
    "lower_bound 在未按 first 排序的数组上：本页在调用之前停止。"
  ],
  "sections": [
    {
      "id": "when",
      "title": "什么时候用",
      "bullets": [
        "多关键字排序、按自定义规则排序、稳定排序（先按次要关键字再按主要关键字）、排序后二分。"
      ]
    },
    {
      "id": "headers",
      "title": "头文件与最低标准",
      "bullets": [
        "#include <algorithm>、<functional>（greater）、<utility>；自定义比较器自 C++98 起可用，本页按 C++17。"
      ]
    },
    {
      "id": "api",
      "title": "核心 API",
      "bullets": [
        "sort(first, last, comp)、stable_sort、min_element(first, last, comp)、lower_bound(first, last, value, comp)；v.rbegin()、v.rend() 反向迭代。"
      ]
    },
    {
      "id": "complexity",
      "title": "复杂度条件",
      "bullets": [
        "sort / stable_sort O(n log n)（stable_sort 在内存不足时可能更慢）；lower_bound O(log n)，要求区间已按同一个比较规则排序。"
      ]
    },
    {
      "id": "example",
      "title": "示例",
      "paragraphs": [
        "[(2,5),(1,5),(2,3),(1,9)]：stable_sort 按 first 得 [(1,5),(1,9),(2,5),(2,3)]（相同 first 保持原来顺序）；再按 second 降序得 [(1,9),(1,5),(2,5),(2,3)]。"
      ]
    },
    {
      "id": "mistakes",
      "title": "常见错误",
      "bullets": [
        "比较器写成 <= 或对相等元素返回 true。",
        "比较器不满足传递性（例如混合两种规则）。",
        "在没排序的区间上用 lower_bound，或排序规则与二分的规则不一致。",
        "以为 sort 对相等元素保持顺序（需要 stable_sort）。"
      ]
    },
    {
      "id": "related",
      "title": "相关竞赛算法",
      "paragraphs": [
        "排序与二分：见 STL 二分页与归并排序页；稳定排序常用于多关键字。"
      ]
    }
  ]
}
export default content
