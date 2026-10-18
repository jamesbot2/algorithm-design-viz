import type { TopicContent } from './types'

const content: TopicContent = {
  "boundary": [
    "这是\"内置模型\"实验：页面运行站内的操作模型并把每一步画出来；右侧的 C++ 是对应的参考代码，不会执行你编辑过的 C++。模型的状态已用真实 g++（ASan+UBSan）对拍。",
    "pos > size() 会抛出 out_of_range，本页在这一步停止，不画结果。",
    "本实验限制字符串长度 ≤ 24（这是页面限制，不是 C++ 的限制）。"
  ],
  "sections": [
    {
      "id": "when",
      "title": "什么时候用",
      "bullets": [
        "字符串匹配的暴力对照、哈希、KMP 之前先用 find 写出基线。",
        "需要按多个字段排序时，pair / tuple 的字典序比较比手写比较器更短。"
      ]
    },
    {
      "id": "headers",
      "title": "头文件与最低标准",
      "bullets": [
        "#include <string> <utility> <tuple>；C++11 起 tuple / tie 可用，本页按 C++17。"
      ]
    },
    {
      "id": "api",
      "title": "核心 API",
      "bullets": [
        "s.find(x) / s.rfind(x)：位置或 npos；s.substr(p, n)；s.erase(p, n)；s.insert(p, x)；s += x。",
        "std::make_pair(a, b) 与 std::tie(a, b, c) 都可以用 < 比较，规则是字典序。"
      ]
    },
    {
      "id": "complexity",
      "title": "复杂度条件",
      "bullets": [
        "find / rfind 最坏 O(n·m)；substr / erase / insert O(n)。",
        "pair / tuple 比较最多比较各个元素一次。"
      ]
    },
    {
      "id": "example",
      "title": "示例",
      "paragraphs": [
        "初始 abcab，追加 ab 得到 abcabab：find ab = 0，rfind ab = 5，find zz = npos；substr(1,3) = bca；erase(0,2) 得 cabab；insert(2, xy) 得 caxybab。"
      ]
    },
    {
      "id": "mistakes",
      "title": "常见错误",
      "bullets": [
        "用 int 接 find 的结果再与 -1 比较（可行但危险），或直接 < 0（永远为假）。",
        "pos > size() 时调用 substr / erase / insert（抛出 out_of_range）。",
        "以为 erase(p, n) 在 n 过大时会出错（它只删到末尾）。",
        "把 pair 的 first / second 当作无序的两个值。"
      ]
    },
    {
      "id": "related",
      "title": "相关竞赛算法",
      "paragraphs": [
        "字符串匹配：KMP、Z 函数、哈希；排序：多关键字用 pair / tuple 一次完成。"
      ]
    }
  ]
}
export default content
