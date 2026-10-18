import type { TopicContent } from './types'

const content: TopicContent = {
  "boundary": [
    "这是一个\"内置模型\"实验：页面运行站内的操作模型并把每一步画出来；右侧的 C++ 是对应的参考代码，不会执行你编辑过的 C++。模型的 size / capacity / 内容已用真实 g++（ASan+UBSan）对拍。",
    "capacity 的增长倍数、shrink_to_fit 是否真的收缩都是实现定义的：本页采用 libstdc++ 的行为（翻倍），其他标准库可能不同，但\"重新分配就使迭代器失效\"是标准保证的。",
    "迭代器是否失效由标准的规则决定；失效后解引用是未定义行为，无法在真实程序里可靠观察，所以本页在这一步停止而不画值。"
  ],
  "sections": [
    {
      "id": "when",
      "title": "什么时候用",
      "bullets": [
        "需要随机访问、尾部频繁追加的动态数组：几乎所有竞赛题的默认容器。",
        "已知最终大小时，用 reserve 避免反复重新分配。",
        "需要在中间插入 / 删除且数据量很小；大量中间操作应换成链表或平衡树。"
      ]
    },
    {
      "id": "headers",
      "title": "头文件与最低标准",
      "bullets": [
        "#include <vector>，C++11 起 shrink_to_fit 可用；本页代码按 C++17。"
      ]
    },
    {
      "id": "api",
      "title": "核心 API",
      "bullets": [
        "size()：元素个数；capacity()：已分配的格子数；capacity ≥ size。",
        "push_back(x)：尾部追加，满了才重新分配。",
        "reserve(n)：capacity 至少为 n，不创建元素，size 不变。",
        "resize(n)：size 变为 n，多出的元素被值初始化（int 为 0），变小则截断。",
        "insert(it, x) / erase(it)：中间插入 / 删除，后面的元素整体移动。",
        "shrink_to_fit()：请求收缩 capacity 到 size（非强制）。"
      ]
    },
    {
      "id": "reserve-resize",
      "title": "reserve 与 resize 的区别",
      "paragraphs": [
        "reserve 只准备空间：size 不变，v[i] 仍然越界。resize 才真的创建元素：之后 v[i] 合法，且新元素是 0。常见错误是 reserve 之后直接用下标赋值——这是越界。"
      ]
    },
    {
      "id": "invalidation",
      "title": "迭代器失效规则",
      "bullets": [
        "任何导致重新分配的操作（push_back / insert / reserve / resize / shrink_to_fit）：所有迭代器、指针、引用失效。",
        "不重新分配的 insert：插入点及之后的迭代器失效。",
        "erase：删除点及之后的迭代器失效。",
        "erase 与 resize 变小不会缩小 capacity。"
      ]
    },
    {
      "id": "complexity",
      "title": "复杂度条件",
      "bullets": [
        "push_back 摊还 O(1)：翻倍增长使 n 次追加总共 O(n)；单次最坏 O(n)。",
        "insert / erase 在位置 i：O(size − i)。",
        "前提：元素可移动 / 拷贝；摊还结论依赖 capacity 按固定倍数增长。"
      ]
    },
    {
      "id": "example",
      "title": "示例",
      "paragraphs": [
        "初始 {1,2,3}（capacity 3）；push 4 → 翻倍到 6；reserve 10 → 搬家到 10；resize 6 → size 6，新元素是 0；erase 0 → size 5，capacity 仍 10；shrink → capacity 5。把默认输入跑一遍，观察\"缓冲区编号\"何时变化。"
      ]
    },
    {
      "id": "mistakes",
      "title": "常见错误",
      "bullets": [
        "reserve 后直接 v[i] = x（越界）。",
        "持有 begin() 或元素引用的同时 push_back。",
        "for 循环里 erase 当前迭代器后继续 ++it。",
        "用 int 存 size() 做减法（size() − 1 在空容器上回绕）。",
        "以为 erase 会释放内存。"
      ]
    },
    {
      "id": "related",
      "title": "相关竞赛算法",
      "paragraphs": [
        "前缀和 / 差分数组、双指针、单调栈 / 队列、二分查找。这里列方向，不展开。"
      ]
    }
  ]
}
export default content
