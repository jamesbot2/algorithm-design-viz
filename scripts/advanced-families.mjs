/**
 * Generic family validation specs (used by advanced-validate.mjs).
 * Case = { k, a[], b[], c[] }; every language driver reads
 *   T, then per case "k n m q", a-line, b-line, c-line
 * and prints, for each call, one line of space-separated integers.
 * `naive(case)` is an independent baseline written HERE (it never calls the code under test).
 */
export const BIG = 1_000_000_000_000
export function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const rint = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1))

export const caseInput = (cs) => `${cs.length}\n` + cs.map((c) => `${c.k} ${c.a.length} ${c.b.length} ${c.c.length}\n${c.a.join(' ')}\n${c.b.join(' ')}\n${c.c.join(' ')}`).join('\n') + '\n'

// ---------- language drivers: `calls` = list of expressions returning an int sequence ----------
export function driver(lang, dir, calls) {
  if (lang === 'python')
    return `import sys\nfrom ${dir} import *\nd=sys.stdin.read().split();p=1\nout=[]\nfor _ in range(int(d[0])):\n    k=int(d[p]);n=int(d[p+1]);m=int(d[p+2]);q=int(d[p+3]);p+=4\n    a=[int(x) for x in d[p:p+n]];p+=n\n    b=[int(x) for x in d[p:p+m]];p+=m\n    c=[int(x) for x in d[p:p+q]];p+=q\n${calls.map((e) => `    out.append(' '.join(map(str,${e})))`).join('\n')}\nprint('\\n'.join(out))\n`
  if (lang === 'typescript')
    return `import * as M from './${dir}.ts'\nimport { readFileSync } from 'node:fs'\nconst d = readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean); let p = 0\nconst T = Number(d[p++]); const out: string[] = []\nfor (let t = 0; t < T; t++) {\n  const k = Number(d[p++]), n = Number(d[p++]), m = Number(d[p++]), q = Number(d[p++])\n  const a: number[] = [], b: number[] = [], c: number[] = []\n  for (let i = 0; i < n; i++) a.push(Number(d[p++]))\n  for (let i = 0; i < m; i++) b.push(Number(d[p++]))\n  for (let i = 0; i < q; i++) c.push(Number(d[p++]))\n  void k\n${calls.map((e) => `  out.push((${e}).join(' '))`).join('\n')}\n}\nconsole.log(out.join('\\n'))\n`
  if (lang === 'cpp')
    return `#include <cstdio>\nstatic void pr(const std::vector<long long>& r){for(size_t i=0;i<r.size();i++)std::printf(i?" %lld":"%lld",r[i]);std::printf("\\n");}\nint main(){int T;std::scanf("%d",&T);while(T--){long long k;int n,m,q;std::scanf("%lld %d %d %d",&k,&n,&m,&q);std::vector<long long> a(n),b(m),c(q);for(auto&x:a)std::scanf("%lld",&x);for(auto&x:b)std::scanf("%lld",&x);for(auto&x:c)std::scanf("%lld",&x);(void)k;\n${calls.map((e) => `pr(${e});`).join('\n')}\n}}\n`
  if (lang === 'java')
    return `import java.io.*;import java.util.*;\npublic class Main{static StringBuilder o=new StringBuilder();static void pr(long[] r){for(int i=0;i<r.length;i++){if(i>0)o.append(' ');o.append(r[i]);}o.append('\\n');}\npublic static void main(String[] z)throws IOException{StreamTokenizer s=new StreamTokenizer(new BufferedReader(new InputStreamReader(System.in)));s.resetSyntax();s.wordChars(33,255);s.whitespaceChars(0,32);s.nextToken();int T=Integer.parseInt(s.sval);while(T-->0){s.nextToken();long k=Long.parseLong(s.sval);s.nextToken();int n=Integer.parseInt(s.sval);s.nextToken();int m=Integer.parseInt(s.sval);s.nextToken();int q=Integer.parseInt(s.sval);long[] a=new long[n],b=new long[m],c=new long[q];for(int i=0;i<n;i++){s.nextToken();a[i]=Long.parseLong(s.sval);}for(int i=0;i<m;i++){s.nextToken();b[i]=Long.parseLong(s.sval);}for(int i=0;i<q;i++){s.nextToken();c[i]=Long.parseLong(s.sval);}if(k==Long.MIN_VALUE)return;\n${calls.map((e) => `pr(${e});`).join('\n')}\n}System.out.print(o);}}\n`
  if (lang === 'rust')
    return `#[path = "${dir}.rs"]\nmod ${dir};\n#[allow(unused_imports)]\nuse ${dir}::*;\nuse std::io::Read;\nfn pr(o:&mut String,r:&[i64]){let v:Vec<String>=r.iter().map(|x|x.to_string()).collect();o.push_str(&v.join(" "));o.push('\\n');}\nfn main(){let mut s=String::new();std::io::stdin().read_to_string(&mut s).unwrap();let mut it=s.split_whitespace().map(|x|x.parse::<i64>().unwrap());let t=it.next().unwrap();let mut o=String::new();for _ in 0..t{let k=it.next().unwrap();let n=it.next().unwrap() as usize;let m=it.next().unwrap() as usize;let q=it.next().unwrap() as usize;let a:Vec<i64>=(0..n).map(|_|it.next().unwrap()).collect();let b:Vec<i64>=(0..m).map(|_|it.next().unwrap()).collect();let c:Vec<i64>=(0..q).map(|_|it.next().unwrap()).collect();let _=(k,&a,&b,&c);\n${calls.map((e) => `pr(&mut o,&${e});`).join('\n')}\n}print!("{}",o);}\n`
  if (lang === 'go')
    return `package main\nimport ("bufio";"fmt";"os";"strings")\nfunc pr(o *strings.Builder, r []int64){for i,x:=range r{if i>0{o.WriteByte(' ')};o.WriteString(fmt.Sprint(x))};o.WriteByte('\\n')}\nfunc main(){rd:=bufio.NewReader(os.Stdin);var t int;fmt.Fscan(rd,&t);var o strings.Builder;for ;t>0;t--{var k int64;var n,m,q int;fmt.Fscan(rd,&k,&n,&m,&q);a:=make([]int64,n);b:=make([]int64,m);c:=make([]int64,q);for i:=range a{fmt.Fscan(rd,&a[i])};for i:=range b{fmt.Fscan(rd,&b[i])};for i:=range c{fmt.Fscan(rd,&c[i])};_,_,_,_=k,a,b,c\n${calls.map((e) => `pr(&o,${e})`).join('\n')}\n};fmt.Print(o.String())}\n`
  throw new Error('lang ' + lang)
}
export const coreDriver = (stmts) =>
  `#include "core.cpp"\n#include <cstdio>\nstatic void pr(const std::vector<long long>& r){for(size_t i=0;i<r.size();i++)std::printf(i?" %lld":"%lld",r[i]);std::printf("\\n");}\nint main(){int T;std::scanf("%d",&T);while(T--){long long k;int n,m,q;std::scanf("%lld %d %d %d",&k,&n,&m,&q);std::vector<long long> a(n),b(m),c(q);for(auto&x:a)std::scanf("%lld",&x);for(auto&x:b)std::scanf("%lld",&x);for(auto&x:c)std::scanf("%lld",&x);(void)k;\n${stmts.join('\n')}\n}}\n`


const S = (xs) => xs.map(String).join(' ')
const rl = (r, n, lo, hi, big) => Array.from({ length: n }, () => (big && r() < 0.15 ? rint(r, -BIG, BIG) : rint(r, lo, hi)))

export const FAM = {}

// ───────────────────────── prefix-diff ─────────────────────────
FAM['prefix-diff'] = {
  dir: 'prefix_diff',
  cls: 'PrefixDiff',
  gen(seed) {
    const r = mulberry32(seed)
    const cs = []
    for (let t = 0; t < 400; t++) {
      const n = t < 4 ? t : rint(r, 1, 30)
      const a = rl(r, n, -100, 100, t % 5 === 0)
      const ups = []
      for (let i = rint(r, 0, 8); i > 0 && n > 0; i--) {
        const l = rint(r, 0, n)
        ups.push(l, rint(r, l, n), rint(r, -50, 50))
      }
      const qs = []
      for (let i = rint(r, 0, 8); i > 0 && n >= 0; i--) {
        const l = rint(r, 0, n)
        qs.push(l, rint(r, l, n))
      }
      cs.push({ k: 0, a, b: ups, c: qs })
    }
    return cs
  },
  naive(c) {
    const a = c.a.map(BigInt)
    const direct = [0n]
    for (let i = 0; i < a.length; i++) direct.push(a.slice(0, i + 1).reduce((x, y) => x + y, 0n))
    const fin = [...a]
    for (let i = 0; i + 2 < c.b.length; i += 3) for (let j = c.b[i]; j < c.b[i + 1]; j++) fin[j] += BigInt(c.b[i + 2])
    const sums = []
    for (let i = 0; i + 1 < c.c.length; i += 2) sums.push(a.slice(c.c[i], c.c[i + 1]).reduce((x, y) => x + y, 0n))
    return [S(direct), S(fin), S(sums)]
  },
  calls: {
    python: ['prefix_sums(a)', 'range_add_all(a,b)', 'range_sums(a,c)'],
    typescript: ['M.prefixSums(a)', 'M.rangeAddAll(a,b)', 'M.rangeSums(a,c)'],
    cpp: ['prefix_sums(a)', 'range_add_all(a,b)', 'range_sums(a,c)'],
    java: ['PrefixDiff.prefixSums(a)', 'PrefixDiff.rangeAddAll(a,b)', 'PrefixDiff.rangeSums(a,c)'],
    rust: ['prefix_sums(&a)', 'range_add_all(&a,&b)', 'range_sums(&a,&c)'],
    go: ['PrefixSums(a)', 'RangeAddAll(a,b)', 'RangeSums(a,c)'],
  },
  core: [
    'pr(Prefix<long long>(a).p);',
    '{Diff<long long> D(n);for(size_t i=0;i+2<b.size();i+=3)D.add((int)b[i],(int)b[i+1],b[i+2]);pr(D.apply(a));}',
    '{Prefix<long long> P(a);std::vector<long long> o;for(size_t i=0;i+1<c.size();i+=2)o.push_back(P.sum((int)c[i],(int)c[i+1]));pr(o);}',
  ],
  full(r) {
    const n = rint(r, 1, 12), u = rint(r, 0, 6), q = rint(r, 1, 6)
    const a = rl(r, n, -50, 50)
    const ups = Array.from({ length: u }, () => {
      const l = rint(r, 0, n)
      return [l, rint(r, l, n), rint(r, -20, 20)]
    })
    const qs = Array.from({ length: q }, () => {
      const l = rint(r, 0, n)
      return [l, rint(r, l, n)]
    })
    const cur = [...a]
    for (const [l, rr, x] of ups) for (let j = l; j < rr; j++) cur[j] += x
    return { input: `${n} ${u} ${q}\n${a.join(' ')}\n${ups.map((x) => x.join(' ')).join('\n')}${u ? '\n' : ''}${qs.map((x) => x.join(' ')).join('\n')}\n`, expected: qs.map(([l, rr]) => cur.slice(l, rr).reduce((x, y) => x + y, 0) + '\n').join('') }
  },
}

// ───────────────────────── discretize ─────────────────────────
FAM['discretize'] = {
  dir: 'discretize',
  cls: 'Discretize',
  gen(seed) {
    const r = mulberry32(seed)
    const cs = []
    for (let t = 0; t < 400; t++) {
      const n = t < 4 ? t : rint(r, 1, 30)
      const span = t % 3 === 0 ? 5 : 40
      const a = rl(r, n, -span, span, t % 5 === 0)
      const qs = rl(r, rint(r, 0, 8), -span - 2, span + 2, t % 7 === 0)
      cs.push({ k: 0, a, b: [], c: qs })
    }
    return cs
  },
  naive(c) {
    const distinct = [...new Set(c.a)]
    const less = (x) => distinct.filter((v) => v < x).length
    return [S([...new Set(c.a)].sort((x, y) => x - y)), S(c.a.map(less)), S(c.c.map(less))]
  },
  calls: {
    python: ['unique_sorted(a)', 'compress(a)', 'lower_ranks(a,c)'],
    typescript: ['M.uniqueSorted(a)', 'M.compress(a)', 'M.lowerRanks(a,c)'],
    cpp: ['unique_sorted(a)', 'compress(a)', 'lower_ranks(a,c)'],
    java: ['Discretize.uniqueSorted(a)', 'Discretize.compress(a)', 'Discretize.lowerRanks(a,c)'],
    rust: ['unique_sorted(&a)', 'compress(&a)', 'lower_ranks(&a,&c)'],
    go: ['UniqueSorted(a)', 'Compress(a)', 'LowerRanks(a,c)'],
  },
  core: [
    '{Compress<long long> C(a);pr(C.u);}',
    '{Compress<long long> C(a);std::vector<long long> o;for(auto x:a)o.push_back(C.id(x));pr(o);}',
    '{Compress<long long> C(a);std::vector<long long> o;for(auto x:c)o.push_back(C.id(x));pr(o);}',
  ],
  full(r) {
    const n = rint(r, 1, 12), q = rint(r, 0, 6)
    const a = rl(r, n, -6, 6)
    const qs = rl(r, q, -8, 8)
    const less = (x) => new Set(a.filter((v) => v < x)).size
    return { input: `${n} ${q}\n${a.join(' ')}\n${qs.join(' ')}\n`, expected: a.map(less).join(' ') + '\n' + qs.map(less).join(' ') + '\n' }
  },
}

// ───────────────────────── bs-answer ─────────────────────────
FAM['bs-answer'] = {
  dir: 'bs_answer',
  cls: 'BsAnswer',
  gen(seed) {
    const r = mulberry32(seed)
    const cs = []
    for (let t = 0; t < 400; t++) {
      const n = t < 3 ? t + 1 : rint(r, 1, 9)
      const a = Array.from({ length: n }, () => (t % 11 === 0 ? rint(r, 1, 1_000_000_000) : rint(r, 1, 30)))
      const k = rint(r, 1, n + 1)
      const mx = Math.max(...a)
      const sm = a.reduce((s, x) => s + x, 0)
      const caps = Array.from({ length: rint(r, 0, 6) }, () => rint(r, mx, sm + 3))
      cs.push({ k, a, b: [], c: caps })
    }
    return cs
  },
  naive(c) {
    // independent: min-max partition DP (no binary search, no greedy)
    const n = c.a.length
    const pre = [0]
    for (const x of c.a) pre.push(pre[pre.length - 1] + x)
    const INF = Infinity
    let dp = Array.from({ length: n + 1 }, (_, i) => (i === 0 ? INF : pre[i]))
    dp[0] = 0
    for (let j = 2; j <= Math.min(c.k, n); j++) {
      const nd = new Array(n + 1).fill(INF)
      nd[0] = 0
      for (let i = 1; i <= n; i++) for (let p = 0; p < i; p++) nd[i] = Math.min(nd[i], Math.max(dp[p], pre[i] - pre[p]))
      dp = nd
    }
    // dp over exactly min(k,n) parts is monotone non-increasing in the number of parts, so this is the optimum for "at most k"
    const ans = n === 0 ? 0 : dp[n]
    // greedy-free segment count for each cap: simulate by definition (scan, cut as late as possible)
    const segs = c.c.map((cap) => {
      let cnt = 1, cur = 0
      for (const x of c.a) {
        if (cur + x <= cap) cur += x
        else { cnt++; cur = x }
      }
      return cnt
    })
    return [String(ans), S(segs)]
  },
  calls: {
    python: ['[min_largest_sum(a,k)]', 'segments_list(a,c)'],
    typescript: ['[M.minLargestSum(a,k)]', 'M.segmentsList(a,c)'],
    cpp: ['std::vector<long long>{min_largest_sum(a,k)}', 'segments_list(a,c)'],
    java: ['new long[]{BsAnswer.minLargestSum(a,k)}', 'BsAnswer.segmentsList(a,c)'],
    rust: ['vec![min_largest_sum(&a,k)]', 'segments_list(&a,&c)'],
    go: ['[]int64{MinLargestSum(a,k)}', 'SegmentsList(a,c)'],
  },
  core: ['pr(std::vector<long long>{min_largest(a,k)});', '{std::vector<long long> o;for(auto cap:c)o.push_back(parts_needed(a,cap));pr(o);}'],
  full(r) {
    const n = rint(r, 1, 9)
    const a = Array.from({ length: n }, () => rint(r, 1, 20))
    const k = rint(r, 1, n + 1)
    const pre = [0]
    for (const x of a) pre.push(pre[pre.length - 1] + x)
    let best = Infinity
    const rec = (i, parts, mx) => {
      if (i === n) return void (best = Math.min(best, mx))
      if (parts === k) return
      for (let j = i + 1; j <= n; j++) rec(j, parts + 1, Math.max(mx, pre[j] - pre[i]))
    }
    rec(0, 0, 0)
    return { input: `${n} ${k}\n${a.join(' ')}\n`, expected: best + '\n' }
  },
}

// ───────────────────────── mono-stack ─────────────────────────
FAM['mono-stack'] = {
  dir: 'mono_stack',
  cls: 'MonoStack',
  gen(seed) {
    const r = mulberry32(seed)
    const cs = []
    for (let t = 0; t < 400; t++) {
      const n = t < 4 ? t : rint(r, 1, 30)
      const span = t % 3 === 0 ? 3 : 20
      cs.push({ k: 0, a: Array.from({ length: n }, () => (t % 13 === 0 ? rint(r, 0, 1_000_000_000) : rint(r, 0, span))), b: [], c: [] })
    }
    return cs
  },
  naive(c) {
    const a = c.a
    const ng = a.map((x, i) => {
      for (let j = i + 1; j < a.length; j++) if (a[j] > x) return j
      return -1
    })
    let best = 0
    for (let l = 0; l < a.length; l++) {
      let mn = Infinity
      for (let r = l; r < a.length; r++) {
        mn = Math.min(mn, a[r])
        best = Math.max(best, mn * (r - l + 1))
      }
    }
    return [S(ng), String(best)]
  },
  calls: {
    python: ['next_greater(a)', '[largest_rectangle(a)]'],
    typescript: ['M.nextGreater(a)', '[M.largestRectangle(a)]'],
    cpp: ['next_greater(a)', 'std::vector<long long>{largest_rectangle(a)}'],
    java: ['MonoStack.nextGreater(a)', 'new long[]{MonoStack.largestRectangle(a)}'],
    rust: ['next_greater(&a)', 'vec![largest_rectangle(&a)]'],
    go: ['NextGreater(a)', '[]int64{LargestRectangle(a)}'],
  },
  core: ['{auto g=next_greater(a);pr(std::vector<long long>(g.begin(),g.end()));}', 'pr(std::vector<long long>{largest_rect(a)});'],
  full(r) {
    const n = rint(r, 1, 12)
    const a = Array.from({ length: n }, () => rint(r, 0, 6))
    const ng = a.map((x, i) => {
      for (let j = i + 1; j < n; j++) if (a[j] > x) return j
      return -1
    })
    let best = 0
    for (let l = 0; l < n; l++) {
      let mn = Infinity
      for (let rr = l; rr < n; rr++) {
        mn = Math.min(mn, a[rr])
        best = Math.max(best, mn * (rr - l + 1))
      }
    }
    return { input: `${n}\n${a.join(' ')}\n`, expected: ng.join(' ') + '\n' + best + '\n' }
  },
}

// ───────────────────────── mono-queue ─────────────────────────
FAM['mono-queue'] = {
  dir: 'mono_queue',
  cls: 'MonoQueue',
  gen(seed) {
    const r = mulberry32(seed)
    const cs = []
    for (let t = 0; t < 400; t++) {
      const n = t < 3 ? t + 1 : rint(r, 1, 30)
      const a = Array.from({ length: n }, () => (t % 13 === 0 ? rint(r, -BIG, BIG) : rint(r, -10, 10)))
      cs.push({ k: rint(r, 1, n), a, b: [], c: [] })
    }
    return cs
  },
  naive(c) {
    const mx = [], mn = []
    for (let i = 0; i + c.k <= c.a.length; i++) {
      const w = c.a.slice(i, i + c.k)
      mx.push(Math.max(...w))
      mn.push(Math.min(...w))
    }
    return [S(mx), S(mn)]
  },
  calls: {
    python: ['sliding_max(a,k)', 'sliding_min(a,k)'],
    typescript: ['M.slidingMax(a,k)', 'M.slidingMin(a,k)'],
    cpp: ['sliding_max(a,k)', 'sliding_min(a,k)'],
    java: ['MonoQueue.slidingMax(a,k)', 'MonoQueue.slidingMin(a,k)'],
    rust: ['sliding_max(&a,k)', 'sliding_min(&a,k)'],
    go: ['SlidingMax(a,k)', 'SlidingMin(a,k)'],
  },
  core: ['pr(window_max(a,(int)k));', 'pr(window_min(a,(int)k));'],
  full(r) {
    const n = rint(r, 1, 12), k = rint(r, 1, n)
    const a = Array.from({ length: n }, () => rint(r, -9, 9))
    const mx = [], mn = []
    for (let i = 0; i + k <= n; i++) {
      const w = a.slice(i, i + k)
      mx.push(Math.max(...w))
      mn.push(Math.min(...w))
    }
    return { input: `${n} ${k}\n${a.join(' ')}\n`, expected: mx.join(' ') + '\n' + mn.join(' ') + '\n' }
  },
}
