import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '本页是四件小工具的组合：gcd、扩展欧几里得、快速幂 + 模逆元、埃氏筛。线性筛、欧拉函数、中国剩余定理、Miller–Rabin 等没有做。',
    '前提：gcd / exgcd 要求 a, b ≥ 0；快速幂要求底数 ≥ 0、指数 ≥ 0、模 m ≥ 1；模逆元只在 gcd(a, m) = 1 时存在，否则本页返回 −1 并如实标出。',
    '数值范围：TypeScript 版用 double，要求模 m ≤ 10^6（乘积 < 10^12 仍精确）；C++ / Java / Rust / Go 用 64 位整数，m ≤ 3·10^9；Python 是大整数。页面输入框限制在 ≤ 9999，保证演示中所有量都精确。',
    'exgcd 的 (x, y) 不唯一：本页给出的是迭代法得到的那一组，满足 a·x + b·y = gcd；验证以"等式成立"为准，而不是和别的 (x, y) 比较。',
  ],
  sections: [
    { id: 'when', title: '什么时候用', bullets: ['约分、判断互素、解线性同余 a·x ≡ c (mod m)。', '大指数取模（快速幂）、除法取模（乘逆元）。', '一次性求出 n 以内的所有素数（筛法）。'] },
    { id: 'gcd', title: 'gcd：辗转相除', paragraphs: ['gcd(a, b) = gcd(b, a mod b)，直到 b = 0。每两步余数至少减半，所以步数 O(log min(a, b))。'] },
    { id: 'exgcd', title: 'exgcd：把系数一起带着走', paragraphs: ['维护三对数 r、s、t，保持不变量 r = a·s + b·t：初值 r = (a, b)，s = (1, 0)，t = (0, 1)。每次用同一个商 q 更新三对数，不变量不会破坏。结束时 r0 = gcd，且 a·s0 + b·t0 = gcd。'] },
    { id: 'pow', title: '快速幂', paragraphs: ['把 power 写成二进制：base^power = ∏ base^(2^i)（第 i 位为 1 的那些）。base 每轮自乘一次得到 base^(2^i)，遇到 1 位就乘进结果。每一步都对 m 取模。'] },
    { id: 'inv', title: '模逆元', paragraphs: ['a·x + m·y = 1 两边模 m 得 a·x ≡ 1。所以逆元 = exgcd(a mod m, m) 给出的 x，再规约到 [0, m)。当 gcd ≠ 1 时没有这样的 x，必须报告"不存在"而不是返回一个看似合理的数。'] },
    { id: 'sieve', title: '埃氏筛', paragraphs: ['从 2 开始，每遇到没被标记的数 i 就是素数，并把 i·i, i·i+i, … 标成合数（比 i·i 小的倍数已被更小的素因子标记过）。复杂度 O(n log log n)。'] },
    { id: 'mistakes', title: '常见错误', bullets: ['int 乘法溢出：a·b 要用 long long，且每次乘完立刻取模。', '逆元存在性不检查（m 不是素数时尤其常见）。', 'exgcd 的 x 是负数时，忘了 ((x % m) + m) % m。', '筛法内层循环从 2·i 开始而不是 i·i（对但慢），或者从 i·i 开始却用 int 导致 i·i 溢出。', '快速幂里把 power 当作可变引用弄丢了原值。'] },
    { id: 'apps', title: '应用方向', paragraphs: ['组合数取模、线性同余方程、RSA 玩具例子、欧拉函数。这里只列方向，未做。'] },
  ],
}
export default content
