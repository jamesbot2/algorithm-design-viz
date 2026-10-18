import type { TopicContent } from './types'

const content: TopicContent = {
  "boundary": [
    "这是\"内置模型\"实验：页面运行站内的操作模型并把每一步画出来；右侧的 C++ 是对应的参考代码，不会执行你编辑过的 C++。容器内容已用真实 g++（ASan+UBSan）对拍。",
    "红黑树的内部结构与旋转不在本页范围；只展示可观察行为（有序、唯一 / 重复、值）。",
    "mapfind 在本模板中\"没找到\"约定输出 −1，这是模板约定，不是标准库行为（标准库返回 end()）。"
  ],
  "sections": [
    {
      "id": "when",
      "title": "什么时候用",
      "bullets": [
        "set：去重并保持有序、找前驱 / 后继（lower_bound）。",
        "multiset：需要重复元素的有序多重集（滑动中位数、反悔贪心）。",
        "map：键 → 计数 / 值，且需要按键有序遍历。"
      ]
    },
    {
      "id": "headers",
      "title": "头文件与最低标准",
      "bullets": [
        "#include <set>、<map>；C++98 起可用，本页按 C++17。"
      ]
    },
    {
      "id": "api",
      "title": "核心 API",
      "bullets": [
        "insert / erase / find / count / lower_bound / upper_bound。",
        "set::insert 返回 pair<iterator,bool>，second 表示是否真的插入。",
        "multiset::erase(值) 删全部；erase(迭代器) 删一个。",
        "map::operator[]：键不存在时插入默认值；map::at / find / count 不插入。"
      ]
    },
    {
      "id": "complexity",
      "title": "复杂度条件",
      "bullets": [
        "以上操作均 O(log n)；遍历 O(n)，按键升序。",
        "前提：比较器是严格弱序；否则行为未定义。"
      ]
    },
    {
      "id": "example",
      "title": "示例",
      "paragraphs": [
        "默认输入依次演示：重复插入 set、multiset 的 mdel1 与 mdel、map 的 mapget 副作用与 mapfind。注意 mapget 7 之后 map 里多了 7→0。"
      ]
    },
    {
      "id": "mistakes",
      "title": "常见错误",
      "bullets": [
        "用 p[k] 判断存在（会插入）。",
        "multiset::erase(值) 以为只删一个。",
        "erase(find(x)) 而不检查 find 是否为 end()（未定义行为）。",
        "遍历时 erase 当前迭代器后继续 ++it。",
        "自定义比较器写成 <=（不是严格弱序）。"
      ]
    },
    {
      "id": "related",
      "title": "相关竞赛算法",
      "paragraphs": [
        "lower_bound / upper_bound（本站 stl-bounds）、离散化、Dijkstra 的 set 版本、扫描线。"
      ]
    }
  ]
}
export default content
