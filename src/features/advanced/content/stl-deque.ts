import type { TopicContent } from './types'

const content: TopicContent = {
  "boundary": [
    "这是\"内置模型\"实验：页面运行站内的操作模型并把每一步画出来；右侧的 C++ 是对应的参考代码，不会执行你编辑过的 C++。模型的状态已用真实 g++（ASan+UBSan）对拍。",
    "\"固定槽位\"是教学画法：每个元素在它的一生里占同一个槽位，说明两端操作不搬动别的元素。真实 std::deque 内部是分块数组，这里不画它的块结构。",
    "空容器上的 front / back / pop 是未定义行为，本页在这一步停止。"
  ],
  "sections": [
    {
      "id": "when",
      "title": "什么时候用",
      "bullets": [
        "BFS、层序遍历、拓扑排序：用 queue（先进先出）。",
        "滑动窗口最值、0-1 BFS：用 deque（两端都要加入 / 移除）。"
      ]
    },
    {
      "id": "headers",
      "title": "头文件与最低标准",
      "bullets": [
        "#include <queue>（queue）与 <deque>（deque）；C++98 起可用，本页按 C++17。"
      ]
    },
    {
      "id": "api",
      "title": "核心 API",
      "bullets": [
        "queue：push(x)、pop()、front()、back()、size()、empty()。",
        "deque：push_back / push_front / pop_back / pop_front、front / back、d[i]、size。",
        "queue 默认基于 deque；pop() 不返回值。"
      ]
    },
    {
      "id": "complexity",
      "title": "复杂度条件",
      "bullets": [
        "两端 push / pop：均摊 O(1)（每次分摊内存块的分配）。",
        "d[i]：O(1)；中间 insert / erase：O(n)。"
      ]
    },
    {
      "id": "example",
      "title": "示例",
      "paragraphs": [
        "初始 [1,2,3]：pushf 0、pushb 4 后是 [0..4]；front = 0，back = 4；popf、popb 之后回到 [1,2,3]。观察每个元素的槽位始终不变。"
      ]
    },
    {
      "id": "mistakes",
      "title": "常见错误",
      "bullets": [
        "空队列上 front / pop（未定义行为）。",
        "以为 pop() 会返回被删除的值（要先 front() 再 pop()）。",
        "在 deque 中间 insert 之后继续使用旧迭代器。",
        "把 deque 当 vector 用却依赖元素连续存储（deque 不连续）。"
      ]
    },
    {
      "id": "related",
      "title": "相关竞赛算法",
      "paragraphs": [
        "BFS、拓扑排序（Kahn）、单调队列（滑动窗口）。本站已有 单调队列、拓扑排序 页面可对照。"
      ]
    }
  ]
}
export default content
