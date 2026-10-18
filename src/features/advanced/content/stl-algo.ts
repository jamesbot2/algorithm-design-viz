import type { TopicContent } from './types'

const content: TopicContent = {
  "boundary": [
    "这是\"内置模型\"实验：页面运行站内的操作模型并把每一步画出来；右侧的 C++ 是对应的参考代码，不会执行你编辑过的 C++。模型的状态已用真实 g++（ASan+UBSan）对拍。",
    "本实验不模拟 sort 的内部比较顺序（标准未规定），只显示结果。",
    "nth_element 在副本上运行：标准只保证第 k 位正确，其余元素的顺序未指定，所以只报告那一个值。",
    "lower_bound 在未排序的数组上、rotate 的 k 超过大小：本页在调用之前停止。"
  ],
  "sections": [
    {
      "id": "when",
      "title": "什么时候用",
      "bullets": [
        "排序后二分、去重离散化、全排列枚举（暴力搜索）、第 k 小（nth_element）。"
      ]
    },
    {
      "id": "headers",
      "title": "头文件与最低标准",
      "bullets": [
        "#include <algorithm>（greater 在 <functional>）；next_permutation 自 C++98 起，本页按 C++17。"
      ]
    },
    {
      "id": "api",
      "title": "核心 API",
      "bullets": [
        "sort(first, last[, comp])、reverse、rotate(first, mid, last)、next_permutation / prev_permutation、nth_element(first, nth, last)、count、max_element、lower_bound。"
      ]
    },
    {
      "id": "complexity",
      "title": "复杂度条件",
      "bullets": [
        "sort O(n log n)，不稳定；需要稳定用 stable_sort。",
        "nth_element 平均 O(n)，只保证第 k 位及其两侧的大小关系。",
        "lower_bound 要求区间有序，O(log n)（随机访问迭代器）。"
      ]
    },
    {
      "id": "example",
      "title": "示例",
      "paragraphs": [
        "[3,1,2]：next_permutation 得 [3,2,1]（返回真），再调用回绕成 [1,2,3]（返回假）；nth 1 在 [1,2,3] 上是 2；sort 后 lower_bound 2 的位置是 1。"
      ]
    },
    {
      "id": "mistakes",
      "title": "常见错误",
      "bullets": [
        "在没排序的区间上用 lower_bound。",
        "以为 nth_element 会把前 k 个排好序（只保证都 ≤ 第 k 个）。",
        "枚举排列前忘了先 sort。",
        "rotate 的中间迭代器越过 end()。"
      ]
    },
    {
      "id": "related",
      "title": "相关竞赛算法",
      "paragraphs": [
        "枚举：全排列暴力搜索；选择：第 k 小；二分：见 STL 二分页。"
      ]
    }
  ]
}
export default content
