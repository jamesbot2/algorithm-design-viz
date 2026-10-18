import type { TopicContent } from './types'

const content: TopicContent = {
  "boundary": [
    "这是\"内置模型\"实验：页面运行站内的操作模型并把每一步画出来；右侧的 C++ 是对应的参考代码，不会执行你编辑过的 C++。保留前缀与最终结果已用真实 g++（ASan+UBSan）对拍。",
    "读 / 写指针的逐步画法是对 unique 的示意：标准只规定结果前缀，不规定内部步骤；新终点之后的值未指定，页面用\"？\"表示。",
    "sort 内部的比较顺序不由标准规定，这里只展示排序结果。"
  ],
  "sections": [
    {
      "id": "when",
      "title": "什么时候用",
      "bullets": [
        "去重（先 sort 再 unique + erase）、离散化的第一步、删除所有等于某值的元素（remove + erase）。"
      ]
    },
    {
      "id": "headers",
      "title": "头文件与最低标准",
      "bullets": [
        "#include <algorithm>；C++98 起可用，本页按 C++17。"
      ]
    },
    {
      "id": "api",
      "title": "核心 API",
      "bullets": [
        "std::unique(first, last)：合并相邻重复，返回逻辑新终点。",
        "std::remove(first, last, x)：把不等于 x 的元素按原顺序移到前面，返回逻辑新终点。",
        "container.erase(new_end, end)：真正缩小容器。"
      ]
    },
    {
      "id": "complexity",
      "title": "复杂度条件",
      "bullets": [
        "unique / remove：O(n) 次比较；只移动元素，不释放内存。",
        "前提：unique 对\"相邻相等\"敏感，所以要得到不同值须先 O(n log n) 排序。"
      ]
    },
    {
      "id": "example",
      "title": "示例",
      "paragraphs": [
        "[1,1,2,2,2,3,1,1]：模式 0 得到 k=4（[1,2,3,1]）；模式 1 且 x=2 得到 [1,1,3,1,1]；模式 2 得到 [1,2,3]。观察\"返回新终点\"那一步 size() 并没有变。"
      ]
    },
    {
      "id": "mistakes",
      "title": "常见错误",
      "bullets": [
        "忘了 erase：size() 不变，尾部是未指定的值。",
        "不排序就 unique，以为得到不同值。",
        "用 remove 的返回值当作\"删除个数\"（它是新终点，不是个数）。",
        "在 erase 之后继续使用旧的 end 迭代器。"
      ]
    },
    {
      "id": "related",
      "title": "相关竞赛算法",
      "paragraphs": [
        "离散化（sort + unique + lower_bound）、双指针。本站已有 离散化 页面可对照。"
      ]
    }
  ]
}
export default content
