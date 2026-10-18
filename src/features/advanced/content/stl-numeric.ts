import type { TopicContent } from './types'

const content: TopicContent = {
  "boundary": [
    "这是\"内置模型\"实验：页面运行站内的操作模型并把每一步画出来；右侧的 C++ 是对应的参考代码，不会执行你编辑过的 C++。模型的状态已用真实 g++（ASan+UBSan）对拍。",
    "本页数值范围很小（≤ 8 个元素，|x| ≤ 99，≤ 10 步），不会触发 int 溢出；真实竞赛里要自己留意。"
  ],
  "sections": [
    {
      "id": "when",
      "title": "什么时候用",
      "bullets": [
        "前缀和 / 差分（partial_sum、adjacent_difference）、求总和、最大公约数、状态压缩与集合运算（bitset）。"
      ]
    },
    {
      "id": "headers",
      "title": "头文件与最低标准",
      "bullets": [
        "#include <numeric>（iota、accumulate、partial_sum、adjacent_difference、gcd、lcm）与 <bitset>；gcd / lcm 需要 C++17。"
      ]
    },
    {
      "id": "api",
      "title": "核心 API",
      "bullets": [
        "iota(first, last, x)；accumulate(first, last, init)；partial_sum(first, last, out)；adjacent_difference(first, last, out)；std::gcd(a, b)。",
        "bitset<N>：set(i)、flip(i)、count()、b <<= k、to_string()。"
      ]
    },
    {
      "id": "complexity",
      "title": "复杂度条件",
      "bullets": [
        "数组算法均 O(n)；bitset 的 count / 移位按机器字计算，约 O(N/64)。"
      ]
    },
    {
      "id": "example",
      "title": "示例",
      "paragraphs": [
        "[4,6,8,10]：gcd 为 2，总和 28；psum 得 [4,10,18,28]，adiff 恢复 [4,6,8,10]；iota 5 得 [5,6,7,8]；bset 3、bflip 0 后 bitset 为 …1001，count = 2，左移 2 位为 …100100。"
      ]
    },
    {
      "id": "mistakes",
      "title": "常见错误",
      "bullets": [
        "accumulate 初值类型错误导致溢出。",
        "以为 partial_sum 的输出区间必须是另一个数组（可以原地）。",
        "bitset 的下标方向与字符串相反（第 0 位在最右）。",
        "忘了 gcd 需要 C++17 的 <numeric>。"
      ]
    },
    {
      "id": "related",
      "title": "相关竞赛算法",
      "paragraphs": [
        "前缀和 / 差分（见前缀和与差分页）、数论（gcd）、位运算状态压缩。"
      ]
    }
  ]
}
export default content
