#!/usr/bin/env node
/**
 * 高阶算法 template validation — compiles / runs the EXACT displayed sources with real toolchains.
 *   node scripts/advanced-validate.mjs [--only=<templateId>] [--out=docs/advanced/validation-run.json]
 * - The displayed source is read from the generated catalog (the same text the page shows, copies and exports),
 *   its SHA-256 is recomputed here and compared to the hash the UI binds to (hashes.generated.ts).
 * - Vectors: fixed-seed PRNG + an independent naive baseline written in this file (no use of the code under test).
 * - Each language driver imports/calls the displayed function; many inputs per process.
 * - C++: g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra.
 * - Writes src/features/advanced/templates/validation.json (bound to sourceHash + TESTSET_VERSION) and a raw log JSON.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')))
const only = args.only
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href)
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex')

const { TESTSET_VERSION, SOURCE_HASHES } = await imp('src/features/advanced/templates/hashes.generated.ts')
const { default: contestSources } = await imp('src/features/advanced/templates/sources.generated.ts')
import { FAM, caseInput, driver, coreDriver, mulberry32 as famRng } from './advanced-families.mjs'
const { TEMPLATES } = await imp('src/features/advanced/templates/meta.ts')

// ---------- toolchain ----------
const cmdLog = []
const run = (cmd, a, o = {}) => {
  const t0 = Date.now()
  const r = spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 256 << 20, timeout: 240_000, ...o })
  cmdLog.push({ cmd: [cmd, ...a].join(' ').replace(/\/tmp\/adv-[^ /]+/g, '$TMP'), code: r.status ?? (r.error ? 127 : -1), ms: Date.now() - t0 })
  return { cmd: [cmd, ...a].join(' '), code: r.status ?? (r.error ? 127 : -1), stdout: r.stdout ?? '', stderr: (r.stderr ?? '') + (r.error ? String(r.error) : ''), ms: Date.now() - t0 }
}
const ver = (cmd, a) => {
  const r = run(cmd, a)
  return r.code === 0 || r.stdout || r.stderr ? (r.stdout + r.stderr).split('\n')[0].trim() : 'MISSING'
}
const toolchain = {
  gpp: ver('g++', ['--version']),
  python: ver('python3', ['--version']),
  node: ver('node', ['--version']),
  javac: ver('javac', ['-version']),
  java: ver('java', ['-version']),
  rustc: ver('rustc', ['--version']),
  go: ver('go', ['version']),
}
console.log('toolchain', toolchain)
const missing = Object.entries(toolchain).filter(([, v]) => v === 'MISSING' || /not found|ENOENT/.test(v)).map(([k]) => k)
if (missing.length) console.log('MISSING TOOLS:', missing.join(', '))

// ---------- PRNG + naive baselines ----------
function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rint = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1))

function genDsu(seed) {
  const r = mulberry32(seed)
  const cases = []
  for (let c = 0; c < 400; c++) {
    const n = c < 6 ? 1 + c : rint(r, 1, 40)
    const m = rint(r, 0, 60)
    const ops = []
    for (let i = 0; i < m; i++) ops.push([['u', 'u', 'f', 's'][rint(r, 0, 3)], rint(r, 0, n - 1), rint(r, 0, n - 1)])
    cases.push({ n, ops })
  }
  cases.push({ n: 12, ops: [['u', 0, 1], ['u', 2, 3], ['u', 0, 2], ['f', 3, 0], ['u', 4, 5], ['u', 6, 7], ['u', 4, 6], ['u', 0, 4], ['s', 3, 7], ['u', 1, 7]] }) // lab default shape
  // long chains (stress find depth & compression)
  const chain = []
  for (let i = 0; i + 1 < 3000; i++) chain.push(['u', i, i + 1])
  chain.push(['f', 0, 0], ['s', 0, 2999])
  cases.push({ n: 3000, ops: chain })
  return cases
}
function naiveDsu(cs) {
  // label array, O(n) relabel — independent of any DSU structure
  return cs.map(({ n, ops }) => {
    const lab = Array.from({ length: n }, (_, i) => i)
    const per = []
    for (const [k, a, b] of ops) {
      if (k === 'u') {
        if (lab[a] === lab[b]) per.push(0)
        else {
          const from = lab[b], to = lab[a]
          for (let i = 0; i < n; i++) if (lab[i] === from) lab[i] = to
          per.push(1)
        }
      } else if (k === 's') per.push(lab[a] === lab[b] ? 1 : 0)
      else per.push(null) // find: any member of the class that is a stable representative — checked structurally
    }
    return { per, lab, count: new Set(lab).size }
  })
}
const dsuInput = (cs) => `${cs.length}\n` + cs.map(({ n, ops }) => `${n} ${ops.length}\n` + ops.map(([k, a, b]) => `${k} ${a} ${b}`).join('\n')).join('\n') + '\n'
function checkDsu(cs, nv, outText) {
  const lines = outText.trim().split('\n')
  if (lines.length !== cs.length) throw new Error(`dsu: expected ${cs.length} output lines, got ${lines.length}`)
  cs.forEach(({ n, ops }, ci) => {
    const [resS, cntS, rootsS] = lines[ci].split('|').map((s) => s.trim())
    const res = resS ? resS.split(/\s+/).map(Number) : []
    const roots = rootsS.split(/\s+/).map(Number)
    if (res.length !== ops.length) throw new Error(`dsu case ${ci}: result count`)
    const exp = nv[ci]
    ops.forEach(([k], i) => {
      if (k !== 'f' && res[i] !== exp.per[i]) throw new Error(`dsu case ${ci} op ${i} (${k}): got ${res[i]} want ${exp.per[i]}`)
    })
    if (Number(cntS) !== exp.count) throw new Error(`dsu case ${ci}: count ${cntS} want ${exp.count}`)
    // partition by final roots must equal the naive partition; roots must be fixed points of the partition (root in its own class)
    const m1 = new Map(), m2 = new Map()
    for (let i = 0; i < n; i++) {
      if (exp.lab[roots[i]] !== exp.lab[i]) throw new Error(`dsu case ${ci}: root of ${i} is in another class`)
      if (roots[roots[i]] !== roots[i]) throw new Error(`dsu case ${ci}: root of ${i} is not a root`)
      if ((m1.get(roots[i]) ?? exp.lab[i]) !== exp.lab[i]) throw new Error(`dsu case ${ci}: two classes share a root`)
      m1.set(roots[i], exp.lab[i])
      if ((m2.get(exp.lab[i]) ?? roots[i]) !== roots[i]) throw new Error(`dsu case ${ci}: one class has two roots`)
      m2.set(exp.lab[i], roots[i])
    }
    // each `find` result must be the class root at that moment: re-simulate classes
    const lab = Array.from({ length: n }, (_, i) => i)
    ops.forEach(([k, a, b], i) => {
      if (k === 'u' && lab[a] !== lab[b]) {
        const from = lab[b], to = lab[a]
        for (let j = 0; j < n; j++) if (lab[j] === from) lab[j] = to
      } else if (k === 'f') {
        if (lab[res[i]] !== lab[a]) throw new Error(`dsu case ${ci} op ${i}: find(${a}) returned ${res[i]} from another class`)
      }
    })
  })
}

function genFenwick(seed) {
  const r = mulberry32(seed)
  const cases = []
  for (let c = 0; c < 400; c++) {
    const n = c < 5 ? 1 + c : rint(r, 1, 70)
    const m = rint(r, 0, 80)
    const ops = []
    for (let i = 0; i < m; i++) {
      const t = rint(r, 0, 2)
      if (t === 0) ops.push(['a', rint(r, 0, n - 1), c % 7 === 0 ? rint(r, -1_000_000_000_000, 1_000_000_000_000) : rint(r, -1000, 1000)])
      else if (t === 1) ops.push(['p', rint(r, 0, n), 0])
      else {
        const l = rint(r, 0, n)
        ops.push(['r', l, rint(r, l, n)])
      }
    }
    cases.push({ n, ops })
  }
  const big = []
  for (let i = 0; i < 1000; i++) big.push(['a', i % 1024, 3_000_000_000]) // exceeds 32-bit
  big.push(['r', 0, 1024], ['p', 1024, 0])
  cases.push({ n: 1024, ops: big })
  return cases
}
function naiveFenwick(cs) {
  return cs.map(({ n, ops }) => {
    const a = new Array(n).fill(0n)
    const out = []
    for (const [k, x, y] of ops) {
      if (k === 'a') a[x] += BigInt(y)
      else if (k === 'p') out.push(a.slice(0, x).reduce((s, v) => s + v, 0n))
      else out.push(a.slice(x, y).reduce((s, v) => s + v, 0n))
    }
    return out.map(String)
  })
}
const fwInput = dsuInput
function checkFenwick(cs, nv, outText) {
  const lines = outText.trim().split('\n')
  if (lines.length !== cs.length) throw new Error(`fenwick: expected ${cs.length} lines, got ${lines.length}`)
  cs.forEach((_, ci) => {
    const got = lines[ci].trim() ? lines[ci].trim().split(/\s+/) : []
    if (got.join(' ') !== nv[ci].join(' ')) throw new Error(`fenwick case ${ci}: got [${got.slice(0, 6)}…] want [${nv[ci].slice(0, 6)}…]`)
  })
}

function genSeg(seed) {
  const r = mulberry32(seed)
  const cases = []
  for (let c = 0; c < 400; c++) {
    const n = c < 5 ? 1 + c : rint(r, 1, 70)
    const init = Array.from({ length: n }, () => rint(r, -1000, 1000))
    const m = rint(r, 0, 80)
    const ops = []
    for (let i = 0; i < m; i++) {
      if (r() < 0.5) ops.push(['a', rint(r, 0, n - 1), c % 7 === 0 ? rint(r, -1_000_000_000_000, 1_000_000_000_000) : rint(r, -1000, 1000)])
      else {
        const l = rint(r, 0, n)
        ops.push(['r', l, rint(r, l, n)])
      }
    }
    cases.push({ n, init, ops })
  }
  const big = Array.from({ length: 1024 }, () => 3_000_000_000)
  cases.push({ n: 1024, init: big, ops: [['r', 0, 1024], ['a', 5, -3_000_000_000], ['r', 0, 1024], ['r', 7, 900]] })
  return cases
}
function naiveSeg(cs) {
  return cs.map(({ init, ops }) => {
    const a = init.map((v) => BigInt(v))
    const out = []
    for (const [k, x, y] of ops) {
      if (k === 'a') a[x] = BigInt(y)
      else out.push(a.slice(x, y).reduce((s, v) => s + v, 0n))
    }
    return out.map(String)
  })
}
const segInput = (cs) => `${cs.length}\n` + cs.map(({ n, init, ops }) => `${n} ${ops.length}\n${init.join(' ')}\n` + ops.map(([k, a, b]) => `${k} ${a} ${b}`).join('\n')).join('\n') + '\n'

function genLazy(seed) {
  const r = mulberry32(seed)
  const cases = []
  for (let c = 0; c < 400; c++) {
    const n = c < 5 ? 1 + c : rint(r, 1, 70)
    const init = Array.from({ length: n }, () => rint(r, -1000, 1000))
    const m = rint(r, 0, 80)
    const ops = []
    for (let i = 0; i < m; i++) {
      const l = rint(r, 0, n)
      const rr = rint(r, l, n)
      if (r() < 0.5) ops.push(['a', l, rr, c % 7 === 0 ? rint(r, -1_000_000_000, 1_000_000_000) : rint(r, -1000, 1000)])
      else ops.push(['s', l, rr, 0])
    }
    cases.push({ n, init, ops })
  }
  // exact int64 pressure: big values times long ranges (TS Number would lose precision beyond 2^53; sums here stay below 2^53)
  cases.push({ n: 1024, init: Array.from({ length: 1024 }, () => 3_000_000), ops: [['s', 0, 1024, 0], ['a', 0, 1024, 4_000_000], ['s', 0, 1024, 0], ['a', 5, 900, -7_000_000], ['s', 3, 1000, 0]] })
  return cases
}
function naiveLazy(cs) {
  return cs.map(({ init, ops }) => {
    const a = init.map((v) => BigInt(v))
    const out = []
    for (const [k, x, y, v] of ops) {
      if (k === 'a') for (let i = x; i < y; i++) a[i] += BigInt(v)
      else out.push(a.slice(x, y).reduce((s, q) => s + q, 0n))
    }
    return out.map(String)
  })
}
const lazyInput = (cs) => `${cs.length}\n` + cs.map(({ n, init, ops }) => `${n} ${ops.length}\n${init.join(' ')}\n` + ops.map(([k, a, b, v]) => `${k} ${a} ${b} ${v}`).join('\n')).join('\n') + '\n'

function genBounds(seed) {
  const r = mulberry32(seed)
  const cases = []
  for (let c = 0; c < 500; c++) {
    const len = c < 3 ? c : rint(r, 0, 20)
    const a = Array.from({ length: len }, () => rint(r, -6, 6)).sort((x, y) => x - y)
    const qs = []
    for (let x = -8; x <= 8; x++) qs.push(x)
    cases.push({ a, qs })
  }
  return cases
}
const bdInput = (cs) => `${cs.length}\n` + cs.map(({ a, qs }) => `${a.length} ${qs.length}\n${a.join(' ')}\n${qs.join(' ')}`).join('\n') + '\n'
function checkBounds(cs, outText) {
  const lines = outText.trim().split('\n')
  if (lines.length !== cs.length) throw new Error('bounds: line count')
  cs.forEach(({ a, qs }, ci) => {
    const got = lines[ci].trim().split(/\s+/).map(Number)
    qs.forEach((x, qi) => {
      let lo = 0
      while (lo < a.length && a[lo] < x) lo++ // naive linear scan
      let hi = 0
      while (hi < a.length && !(x < a[hi])) hi++
      const g = got.slice(qi * 4, qi * 4 + 4)
      if (g[0] !== lo || g[1] !== hi || g[2] !== lo || g[3] !== hi) throw new Error(`bounds case ${ci} x=${x}: got ${g} want ${lo},${hi} (model, model, std, std)`)
    })
  })
}

function genPq(seed) {
  const r = mulberry32(seed)
  const cases = []
  for (let c = 0; c < 400; c++) {
    const m = rint(r, 0, 80)
    const ops = []
    let size = 0
    for (let i = 0; i < m; i++) {
      if (size > 0 && r() < 0.45) {
        ops.push(['o', 0])
        size--
      } else if (size > 0 && r() < 0.15) ops.push(['t', 0])
      else {
        ops.push(['p', rint(r, -9, 9)])
        size++
      }
    }
    cases.push({ ops })
  }
  return cases
}
const pqInput = (cs) => `${cs.length}\n` + cs.map(({ ops }) => `${ops.length}\n` + ops.map(([k, v]) => `${k} ${v}`).join('\n')).join('\n') + '\n'
function checkPq(cs, outText) {
  const lines = outText.trim().split('\n')
  if (lines.length !== cs.length) throw new Error('pq: line count')
  cs.forEach(({ ops }, ci) => {
    const toks = lines[ci].trim() ? lines[ci].trim().split(/\s+/) : []
    const bag = [] // naive multiset as an unsorted list
    ops.forEach(([k, v], i) => {
      if (k === 'p') bag.push(v)
      else if (k === 'o') bag.splice(bag.indexOf(Math.max(...bag)), 1)
      const t = toks.slice(i * 3, i * 3 + 3)
      const wantTop = bag.length ? Math.max(...bag) : 'E'
      if (String(t[0]) !== String(wantTop) || Number(t[1]) !== bag.length || t[2] !== 'ok') throw new Error(`pq case ${ci} op ${i} (${k} ${v}): got top=${t[0]} size=${t[1]} heap=${t[2]}, want top=${wantTop} size=${bag.length} heap=ok`)
    })
  })
}

// ---------- drivers ----------
const D = {
  dsu: {
    python: `import sys\nfrom dsu import DSU\nd=sys.stdin.read().split();p=1\nout=[]\nfor _ in range(int(d[0])):\n    n=int(d[p]);m=int(d[p+1]);p+=2\n    x=DSU(n);res=[]\n    for _ in range(m):\n        k=d[p];a=int(d[p+1]);b=int(d[p+2]);p+=3\n        if k=='u':res.append('1' if x.union(a,b) else '0')\n        elif k=='s':res.append('1' if x.same(a,b) else '0')\n        else:res.append(str(x.find(a)))\n    roots=[str(x.find(i)) for i in range(n)]\n    out.append(' '.join(res)+' | '+str(x.count)+' | '+' '.join(roots))\nprint('\\n'.join(out))\n`,
    typescript: `import { DSU } from './dsu.ts'\nimport { readFileSync } from 'node:fs'\nconst d = readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean); let p = 1\nconst out: string[] = []\nfor (let T = Number(d[0]); T > 0; T--) {\n  const n = Number(d[p]), m = Number(d[p + 1]); p += 2\n  const x = new DSU(n); const res: string[] = []\n  for (let i = 0; i < m; i++) {\n    const k = d[p], a = Number(d[p + 1]), b = Number(d[p + 2]); p += 3\n    if (k === 'u') res.push(x.union(a, b) ? '1' : '0')\n    else if (k === 's') res.push(x.same(a, b) ? '1' : '0')\n    else res.push(String(x.find(a)))\n  }\n  const roots: string[] = []\n  for (let i = 0; i < n; i++) roots.push(String(x.find(i)))\n  out.push(res.join(' ') + ' | ' + x.count + ' | ' + roots.join(' '))\n}\nconsole.log(out.join('\\n'))\n`,
    cpp: `#include <cstdio>\n#include <string>\nint main(){int T;std::scanf("%d",&T);while(T--){int n,m;std::scanf("%d %d",&n,&m);DSU x(n);std::string res;for(int i=0;i<m;i++){char k;int a,b;std::scanf(" %c %d %d",&k,&a,&b);if(k=='u')res+=x.unite(a,b)?"1 ":"0 ";else if(k=='s')res+=x.same(a,b)?"1 ":"0 ";else res+=std::to_string(x.find(a))+" ";}\nstd::printf("%s| %d |",res.c_str(),x.count);for(int i=0;i<n;i++)std::printf(" %d",x.find(i));std::printf("\\n");}}\n`,
    java: `import java.io.*;import java.util.*;\npublic class Main{public static void main(String[] z)throws IOException{StreamTokenizer s=new StreamTokenizer(new BufferedReader(new InputStreamReader(System.in)));s.resetSyntax();s.wordChars(33,255);s.whitespaceChars(0,32);s.nextToken();int T=Integer.parseInt(s.sval);StringBuilder o=new StringBuilder();while(T-->0){s.nextToken();int n=Integer.parseInt(s.sval);s.nextToken();int m=Integer.parseInt(s.sval);DSU x=new DSU(n);StringBuilder r=new StringBuilder();for(int i=0;i<m;i++){s.nextToken();String k=s.sval;s.nextToken();int a=Integer.parseInt(s.sval);s.nextToken();int b=Integer.parseInt(s.sval);if(k.equals("u"))r.append(x.union(a,b)?"1 ":"0 ");else if(k.equals("s"))r.append(x.same(a,b)?"1 ":"0 ");else r.append(x.find(a)).append(' ');}\nr.append("| ").append(x.count).append(" |");for(int i=0;i<n;i++)r.append(' ').append(x.find(i));o.append(r).append('\\n');}System.out.print(o);}}\n`,
    rust: `#[path = "dsu.rs"]\nmod dsu;\nuse dsu::Dsu;\nuse std::io::Read;\nfn main(){let mut s=String::new();std::io::stdin().read_to_string(&mut s).unwrap();let mut it=s.split_whitespace();let t:usize=it.next().unwrap().parse().unwrap();let mut out=String::new();for _ in 0..t{let n:usize=it.next().unwrap().parse().unwrap();let m:usize=it.next().unwrap().parse().unwrap();let mut x=Dsu::new(n);let mut r=String::new();for _ in 0..m{let k=it.next().unwrap();let a:usize=it.next().unwrap().parse().unwrap();let b:usize=it.next().unwrap().parse().unwrap();match k{"u"=>r.push_str(if x.union(a,b){"1 "}else{"0 "}),"s"=>r.push_str(if x.same(a,b){"1 "}else{"0 "}),_=>{r.push_str(&format!("{} ",x.find(a)));}}}\nr.push_str(&format!("| {} |",x.count));for i in 0..n{r.push_str(&format!(" {}",x.find(i)));}out.push_str(&r);out.push('\\n');}print!("{}",out);}\n`,
    go: `package main\nimport ("bufio";"fmt";"os";"strings")\nfunc main(){rd:=bufio.NewReader(os.Stdin);var t int;fmt.Fscan(rd,&t);var o strings.Builder;for ;t>0;t--{var n,m int;fmt.Fscan(rd,&n,&m);x:=NewDSU(n);var r strings.Builder;for i:=0;i<m;i++{var k string;var a,b int;fmt.Fscan(rd,&k,&a,&b);switch k{case "u":if x.Union(a,b){r.WriteString("1 ")}else{r.WriteString("0 ")};case "s":if x.Same(a,b){r.WriteString("1 ")}else{r.WriteString("0 ")};default:r.WriteString(fmt.Sprintf("%d ",x.Find(a)))}}\nr.WriteString(fmt.Sprintf("| %d |",x.count));for i:=0;i<n;i++{r.WriteString(fmt.Sprintf(" %d",x.Find(i)))};o.WriteString(r.String()+"\\n")};fmt.Print(o.String())}\n`,
  },
  fenwick: {
    python: `import sys\nfrom fenwick import Fenwick\nd=sys.stdin.read().split();p=1\nout=[]\nfor _ in range(int(d[0])):\n    n=int(d[p]);m=int(d[p+1]);p+=2\n    f=Fenwick(n);res=[]\n    for _ in range(m):\n        k=d[p];a=int(d[p+1]);b=int(d[p+2]);p+=3\n        if k=='a':f.add(a,b)\n        elif k=='p':res.append(str(f.prefix(a)))\n        else:res.append(str(f.range(a,b)))\n    out.append(' '.join(res))\nprint('\\n'.join(out))\n`,
    typescript: `import { Fenwick } from './fenwick.ts'\nimport { readFileSync } from 'node:fs'\nconst d = readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean); let p = 1\nconst out: string[] = []\nfor (let T = Number(d[0]); T > 0; T--) {\n  const n = Number(d[p]), m = Number(d[p + 1]); p += 2\n  const f = new Fenwick(n); const res: string[] = []\n  for (let i = 0; i < m; i++) {\n    const k = d[p], a = Number(d[p + 1]), b = Number(d[p + 2]); p += 3\n    if (k === 'a') f.add(a, b)\n    else if (k === 'p') res.push(String(f.prefix(a)))\n    else res.push(String(f.range(a, b)))\n  }\n  out.push(res.join(' '))\n}\nconsole.log(out.join('\\n'))\n`,
    cpp: `#include <cstdio>\nint main(){int T;std::scanf("%d",&T);while(T--){int n,m;std::scanf("%d %d",&n,&m);Fenwick f(n);bool first=true;for(int i=0;i<m;i++){char k;long long a,b;std::scanf(" %c %lld %lld",&k,&a,&b);if(k=='a')f.add((int)a,b);else{long long v=k=='p'?f.prefix((int)a):f.range((int)a,(int)b);std::printf(first?"%lld":" %lld",v);first=false;}}std::printf("\\n");}}\n`,
    java: `import java.io.*;import java.util.*;\npublic class Main{public static void main(String[] z)throws IOException{StreamTokenizer s=new StreamTokenizer(new BufferedReader(new InputStreamReader(System.in)));s.resetSyntax();s.wordChars(33,255);s.whitespaceChars(0,32);s.nextToken();int T=Integer.parseInt(s.sval);StringBuilder o=new StringBuilder();while(T-->0){s.nextToken();int n=Integer.parseInt(s.sval);s.nextToken();int m=Integer.parseInt(s.sval);Fenwick f=new Fenwick(n);StringJoiner r=new StringJoiner(" ");for(int i=0;i<m;i++){s.nextToken();String k=s.sval;s.nextToken();long a=Long.parseLong(s.sval);s.nextToken();long b=Long.parseLong(s.sval);if(k.equals("a"))f.add((int)a,b);else if(k.equals("p"))r.add(Long.toString(f.prefix((int)a)));else r.add(Long.toString(f.range((int)a,(int)b)));}\no.append(r).append('\\n');}System.out.print(o);}}\n`,
    rust: `#[path = "fenwick.rs"]\nmod fenwick;\nuse fenwick::Fenwick;\nuse std::io::Read;\nfn main(){let mut s=String::new();std::io::stdin().read_to_string(&mut s).unwrap();let mut it=s.split_whitespace();let t:usize=it.next().unwrap().parse().unwrap();let mut out=String::new();for _ in 0..t{let n:usize=it.next().unwrap().parse().unwrap();let m:usize=it.next().unwrap().parse().unwrap();let mut f=Fenwick::new(n);let mut r:Vec<String>=vec![];for _ in 0..m{let k=it.next().unwrap();let a:i64=it.next().unwrap().parse().unwrap();let b:i64=it.next().unwrap().parse().unwrap();match k{"a"=>f.add(a as usize,b),"p"=>r.push(f.prefix(a as usize).to_string()),_=>r.push(f.range(a as usize,b as usize).to_string())}}\nout.push_str(&r.join(" "));out.push('\\n');}print!("{}",out);}\n`,
    go: `package main\nimport ("bufio";"fmt";"os";"strings")\nfunc main(){rd:=bufio.NewReader(os.Stdin);var t int;fmt.Fscan(rd,&t);var o strings.Builder;for ;t>0;t--{var n,m int;fmt.Fscan(rd,&n,&m);f:=NewFenwick(n);var r []string;for i:=0;i<m;i++{var k string;var a,b int64;fmt.Fscan(rd,&k,&a,&b);switch k{case "a":f.Add(int(a),b);case "p":r=append(r,fmt.Sprint(f.Prefix(int(a))));default:r=append(r,fmt.Sprint(f.Range(int(a),int(b))))}};o.WriteString(strings.Join(r," ")+"\\n")};fmt.Print(o.String())}\n`,
  },
  segtree: {
    python: `import sys\nfrom segtree import SegTree\nd=sys.stdin.read().split();p=1\nout=[]\nfor _ in range(int(d[0])):\n    n=int(d[p]);m=int(d[p+1]);p+=2\n    a=[int(x) for x in d[p:p+n]];p+=n\n    t=SegTree(a);res=[]\n    for _ in range(m):\n        k=d[p];x=int(d[p+1]);y=int(d[p+2]);p+=3\n        if k=='a':t.set(x,y)\n        else:res.append(str(t.sum(x,y)))\n    out.append(' '.join(res))\nprint('\\n'.join(out))\n`,
    typescript: `import { SegTree } from './segtree.ts'\nimport { readFileSync } from 'node:fs'\nconst d = readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean); let p = 1\nconst out: string[] = []\nfor (let T = Number(d[0]); T > 0; T--) {\n  const n = Number(d[p]), m = Number(d[p + 1]); p += 2\n  const a: number[] = []\n  for (let i = 0; i < n; i++) a.push(Number(d[p++]))\n  const t = new SegTree(a); const res: string[] = []\n  for (let i = 0; i < m; i++) {\n    const k = d[p], x = Number(d[p + 1]), y = Number(d[p + 2]); p += 3\n    if (k === 'a') t.set(x, y)\n    else res.push(String(t.sum(x, y)))\n  }\n  out.push(res.join(' '))\n}\nconsole.log(out.join('\\n'))\n`,
    cpp: `#include <cstdio>\nint main(){int T;std::scanf("%d",&T);while(T--){int n,m;std::scanf("%d %d",&n,&m);std::vector<long long> a(n);for(auto&x:a)std::scanf("%lld",&x);SegTree t(a);bool first=true;for(int i=0;i<m;i++){char k;long long x,y;std::scanf(" %c %lld %lld",&k,&x,&y);if(k=='a')t.set((int)x,y);else{std::printf(first?"%lld":" %lld",t.sum((int)x,(int)y));first=false;}}std::printf("\\n");}}\n`,
    java: `import java.io.*;import java.util.*;\npublic class Main{public static void main(String[] z)throws IOException{StreamTokenizer s=new StreamTokenizer(new BufferedReader(new InputStreamReader(System.in)));s.resetSyntax();s.wordChars(33,255);s.whitespaceChars(0,32);s.nextToken();int T=Integer.parseInt(s.sval);StringBuilder o=new StringBuilder();while(T-->0){s.nextToken();int n=Integer.parseInt(s.sval);s.nextToken();int m=Integer.parseInt(s.sval);long[] a=new long[n];for(int i=0;i<n;i++){s.nextToken();a[i]=Long.parseLong(s.sval);}SegTree t=new SegTree(a);StringJoiner r=new StringJoiner(" ");for(int i=0;i<m;i++){s.nextToken();String k=s.sval;s.nextToken();long x=Long.parseLong(s.sval);s.nextToken();long y=Long.parseLong(s.sval);if(k.equals("a"))t.set((int)x,y);else r.add(Long.toString(t.sum((int)x,(int)y)));}\no.append(r).append('\\n');}System.out.print(o);}}\n`,
    rust: `#[path = "segtree.rs"]\nmod segtree;\nuse segtree::SegTree;\nuse std::io::Read;\nfn main(){let mut s=String::new();std::io::stdin().read_to_string(&mut s).unwrap();let mut it=s.split_whitespace();let t:usize=it.next().unwrap().parse().unwrap();let mut out=String::new();for _ in 0..t{let n:usize=it.next().unwrap().parse().unwrap();let m:usize=it.next().unwrap().parse().unwrap();let a:Vec<i64>=(0..n).map(|_|it.next().unwrap().parse().unwrap()).collect();let mut st=SegTree::new(&a);let mut r:Vec<String>=vec![];for _ in 0..m{let k=it.next().unwrap();let x:i64=it.next().unwrap().parse().unwrap();let y:i64=it.next().unwrap().parse().unwrap();match k{"a"=>st.set(x as usize,y),_=>r.push(st.sum(x as usize,y as usize).to_string())}}\nout.push_str(&r.join(" "));out.push('\\n');}print!("{}",out);}\n`,
    go: `package main\nimport ("bufio";"fmt";"os";"strings")\nfunc main(){rd:=bufio.NewReader(os.Stdin);var t int;fmt.Fscan(rd,&t);var o strings.Builder;for ;t>0;t--{var n,m int;fmt.Fscan(rd,&n,&m);a:=make([]int64,n);for i:=range a{fmt.Fscan(rd,&a[i])};st:=NewSegTree(a);var r []string;for i:=0;i<m;i++{var k string;var x,y int64;fmt.Fscan(rd,&k,&x,&y);if k=="a"{st.Set(int(x),y)}else{r=append(r,fmt.Sprint(st.Sum(int(x),int(y))))}};o.WriteString(strings.Join(r," ")+"\\n")};fmt.Print(o.String())}\n`,
  },
  'segtree-lazy': {
    python: `import sys\nfrom segtree_lazy import LazySegTree\nd=sys.stdin.read().split();p=1\nout=[]\nfor _ in range(int(d[0])):\n    n=int(d[p]);m=int(d[p+1]);p+=2\n    a=[int(x) for x in d[p:p+n]];p+=n\n    t=LazySegTree(a);res=[]\n    for _ in range(m):\n        k=d[p];x=int(d[p+1]);y=int(d[p+2]);v=int(d[p+3]);p+=4\n        if k=='a':t.add(x,y,v)\n        else:res.append(str(t.sum(x,y)))\n    out.append(' '.join(res))\nprint('\\n'.join(out))\n`,
    typescript: `import { LazySegTree } from './segtree_lazy.ts'\nimport { readFileSync } from 'node:fs'\nconst d = readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean); let p = 1\nconst out: string[] = []\nfor (let T = Number(d[0]); T > 0; T--) {\n  const n = Number(d[p]), m = Number(d[p + 1]); p += 2\n  const a: number[] = []\n  for (let i = 0; i < n; i++) a.push(Number(d[p++]))\n  const t = new LazySegTree(a); const res: string[] = []\n  for (let i = 0; i < m; i++) {\n    const k = d[p], x = Number(d[p + 1]), y = Number(d[p + 2]), v = Number(d[p + 3]); p += 4\n    if (k === 'a') t.add(x, y, v)\n    else res.push(String(t.sum(x, y)))\n  }\n  out.push(res.join(' '))\n}\nconsole.log(out.join('\\n'))\n`,
    cpp: `#include <cstdio>\nint main(){int T;std::scanf("%d",&T);while(T--){int n,m;std::scanf("%d %d",&n,&m);std::vector<long long> a(n);for(auto&x:a)std::scanf("%lld",&x);LazySegTree t(a);bool first=true;for(int i=0;i<m;i++){char k;long long x,y,v;std::scanf(" %c %lld %lld %lld",&k,&x,&y,&v);if(k=='a')t.add((int)x,(int)y,v);else{std::printf(first?"%lld":" %lld",t.sum((int)x,(int)y));first=false;}}std::printf("\\n");}}\n`,
    java: `import java.io.*;import java.util.*;\npublic class Main{public static void main(String[] z)throws IOException{StreamTokenizer s=new StreamTokenizer(new BufferedReader(new InputStreamReader(System.in)));s.resetSyntax();s.wordChars(33,255);s.whitespaceChars(0,32);s.nextToken();int T=Integer.parseInt(s.sval);StringBuilder o=new StringBuilder();while(T-->0){s.nextToken();int n=Integer.parseInt(s.sval);s.nextToken();int m=Integer.parseInt(s.sval);long[] a=new long[n];for(int i=0;i<n;i++){s.nextToken();a[i]=Long.parseLong(s.sval);}LazySegTree t=new LazySegTree(a);StringJoiner r=new StringJoiner(" ");for(int i=0;i<m;i++){s.nextToken();String k=s.sval;s.nextToken();long x=Long.parseLong(s.sval);s.nextToken();long y=Long.parseLong(s.sval);s.nextToken();long v=Long.parseLong(s.sval);if(k.equals("a"))t.add((int)x,(int)y,v);else r.add(Long.toString(t.sum((int)x,(int)y)));}\no.append(r).append('\\n');}System.out.print(o);}}\n`,
    rust: `#[path = "segtree_lazy.rs"]\nmod segtree_lazy;\nuse segtree_lazy::LazySegTree;\nuse std::io::Read;\nfn main(){let mut s=String::new();std::io::stdin().read_to_string(&mut s).unwrap();let mut it=s.split_whitespace();let t:usize=it.next().unwrap().parse().unwrap();let mut out=String::new();for _ in 0..t{let n:usize=it.next().unwrap().parse().unwrap();let m:usize=it.next().unwrap().parse().unwrap();let a:Vec<i64>=(0..n).map(|_|it.next().unwrap().parse().unwrap()).collect();let mut st=LazySegTree::new(&a);let mut r:Vec<String>=vec![];for _ in 0..m{let k=it.next().unwrap();let x:i64=it.next().unwrap().parse().unwrap();let y:i64=it.next().unwrap().parse().unwrap();let v:i64=it.next().unwrap().parse().unwrap();match k{"a"=>st.add(x as usize,y as usize,v),_=>r.push(st.sum(x as usize,y as usize).to_string())}}\nout.push_str(&r.join(" "));out.push('\\n');}print!("{}",out);}\n`,
    go: `package main\nimport ("bufio";"fmt";"os";"strings")\nfunc main(){rd:=bufio.NewReader(os.Stdin);var t int;fmt.Fscan(rd,&t);var o strings.Builder;for ;t>0;t--{var n,m int;fmt.Fscan(rd,&n,&m);a:=make([]int64,n);for i:=range a{fmt.Fscan(rd,&a[i])};st:=NewLazySegTree(a);var r []string;for i:=0;i<m;i++{var k string;var x,y,v int64;fmt.Fscan(rd,&k,&x,&y,&v);if k=="a"{st.Add(int(x),int(y),v)}else{r=append(r,fmt.Sprint(st.Sum(int(x),int(y))))}};o.WriteString(strings.Join(r," ")+"\\n")};fmt.Print(o.String())}\n`,
  },
  'stl-bounds': {
    cpp: `#include <cstdio>\nint main(){int T;std::scanf("%d",&T);while(T--){int n,q;std::scanf("%d %d",&n,&q);std::vector<int> a(n);for(int&x:a)std::scanf("%d",&x);bool first=true;for(int i=0;i<q;i++){int x;std::scanf("%d",&x);std::printf(first?"%zu %zu %zu %zu":" %zu %zu %zu %zu",lower_bound_idx(a,x),upper_bound_idx(a,x),std_lower_bound_idx(a,x),std_upper_bound_idx(a,x));first=false;}std::printf("\\n");}}\n`,
  },
  'stl-priority-queue': {
    cpp: `#include <cstdio>\nint main(){int T;std::scanf("%d",&T);while(T--){int m;std::scanf("%d",&m);MaxHeap q;bool first=true;for(int i=0;i<m;i++){char k;int v;std::scanf(" %c %d",&k,&v);if(k=='p')q.push(v);else if(k=='o')q.pop();bool ok=true;for(std::size_t j=1;j<q.h.size();j++)if(q.h[(j-1)/2]<q.h[j])ok=false;if(q.empty())std::printf(first?"E %d %s":" E %d %s",0,ok?"ok":"BAD");else std::printf(first?"%d %zu %s":" %d %zu %s",q.top(),q.h.size(),ok?"ok":"BAD");first=false;}std::printf("\\n");}}\n`,
  },
}
// contest core drivers (include the displayed core file as-is)
const CD = {
  dsu: `#include "core.cpp"\n#include <cstdio>\n#include <string>\nint main(){int T;std::scanf("%d",&T);while(T--){int n,m;std::scanf("%d %d",&n,&m);DSU x(n);std::string res;for(int i=0;i<m;i++){char k;int a,b;std::scanf(" %c %d %d",&k,&a,&b);if(k=='u')res+=x.unite(a,b)?"1 ":"0 ";else if(k=='s')res+=x.same(a,b)?"1 ":"0 ";else res+=std::to_string(x.find(a))+" ";}\nint cnt=0;for(int i=0;i<n;i++)if(x.find(i)==i)cnt++;std::printf("%s| %d |",res.c_str(),cnt);for(int i=0;i<n;i++)std::printf(" %d",x.find(i));std::printf("\\n");}}\n`,
  fenwick: `#include "core.cpp"\n#include <cstdio>\nint main(){int T;std::scanf("%d",&T);while(T--){int n,m;std::scanf("%d %d",&n,&m);BIT<long long> f(n);bool first=true;for(int i=0;i<m;i++){char k;long long a,b;std::scanf(" %c %lld %lld",&k,&a,&b);if(k=='a')f.add((int)a,b);else{long long v=k=='p'?f.prefix((int)a):f.sum((int)a,(int)b);std::printf(first?"%lld":" %lld",v);first=false;}}std::printf("\\n");}}\n`,
  segtree: `#include "core.cpp"\n#include <cstdio>\nint main(){int T;std::scanf("%d",&T);while(T--){int n,m;std::scanf("%d %d",&n,&m);std::vector<long long> a(n);for(auto&x:a)std::scanf("%lld",&x);SegTree<long long> t(n);for(int i=0;i<n;i++)t.set(i,a[i]);bool first=true;for(int i=0;i<m;i++){char k;long long x,y;std::scanf(" %c %lld %lld",&k,&x,&y);if(k=='a')t.set((int)x,y);else{std::printf(first?"%lld":" %lld",t.sum((int)x,(int)y));first=false;}}std::printf("\\n");}}\n`,
  'segtree-lazy': `#include "core.cpp"\n#include <cstdio>\nint main(){int T;std::scanf("%d",&T);while(T--){int n,m;std::scanf("%d %d",&n,&m);std::vector<long long> a(n);for(auto&x:a)std::scanf("%lld",&x);LazySeg<long long> t(a);bool first=true;for(int i=0;i<m;i++){char k;long long x,y,v;std::scanf(" %c %lld %lld %lld",&k,&x,&y,&v);if(k=='a')t.add((int)x,(int)y,v);else{std::printf(first?"%lld":" %lld",t.sum((int)x,(int)y));first=false;}}std::printf("\\n");}}\n`,
  'stl-bounds': `#include "core.cpp"\n#include <cstdio>\nint main(){int T;std::scanf("%d",&T);while(T--){int n,q;std::scanf("%d %d",&n,&q);std::vector<int> a(n);for(int&x:a)std::scanf("%d",&x);bool first=true;for(int i=0;i<q;i++){int x;std::scanf("%d",&x);int lo=first_ge(a,x),hi=first_gt(a,x);std::printf(first?"%d %d %d %d":" %d %d %d %d",lo,hi,lo,hi);first=false;if(count_equal(a,x)!=hi-lo)return 3;}std::printf("\\n");}}\n`,
  'stl-priority-queue': `#include "core.cpp"\n#include <cstdio>\n#include <cstdlib>\nint main(){int T;std::scanf("%d",&T);while(T--){int m;std::scanf("%d",&m);std::priority_queue<int> mx;MinPQ<int> mn;bool first=true;for(int i=0;i<m;i++){char k;int v;std::scanf(" %c %d",&k,&v);if(k=='p'){mx.push(v);mn.push(v);}else if(k=='o'){mx.pop();mn.pop();}\nif(mx.empty())std::printf(first?"E %d ok":" E %d ok",0);else std::printf(first?"%d %zu ok":" %d %zu ok",mx.top(),mx.size());first=false;}std::printf("\\n");}\n  std::vector<int> v{5,1,4,1,5,9,2,6};auto d=drain_desc(v);for(size_t i=1;i<d.size();i++)if(d[i-1]<d[i])return 4;return 0;}\n`,
}

// ---------- docs of the displayed sources ----------
async function teachDocs(id) {
  const dir = id.replace(/-/g, '_')
  const cap = id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
  const out = {}
  if (['dsu', 'fenwick', 'segtree', 'segtree-lazy'].includes(id) || FAM[id]) {
    const idx = await imp(`src/codeCatalog/${dir}/index.ts`)
    const cat = idx[`get${cap}Catalog`]()
    out.typescript = cat.typescript
    const gen = (await imp(`src/codeCatalog/${dir}/langs.generated.ts`)).default
    for (const d of gen) out[d.language] = d
  } else {
    const idx = await imp(`src/codeCatalog/${dir}/index.ts`)
    out.cpp = idx[`get${cap}Catalog`]().typescript
  }
  return out
}

// ---------- runners ----------
const CXX = ['-std=c++17', '-O1', '-g', '-fsanitize=address,undefined', '-fno-sanitize-recover=undefined', '-Wall', '-Wextra']
const results = {}
const logs = []
const record = (key, hash, status, tests, checks, extra = {}) => {
  results[key] = { hash, status, tests, toolchain: extra.toolchain ?? '', checks }
  logs.push({ key, status, tests, checks, ...extra, commands: cmdLog.splice(0) })
  console.log(status === 'pass' ? 'PASS' : 'FAIL', key, `${tests} cases`, checks)
}
const tmp = (p) => mkdtempSync(join(tmpdir(), `adv-${p}-`))
const ASAN_ENV = { ...process.env, ASAN_OPTIONS: 'detect_leaks=0:abort_on_error=0', UBSAN_OPTIONS: 'halt_on_error=1:print_stacktrace=1' }

function guard(key, hash, fn) {
  try {
    fn()
  } catch (e) {
    record(key, hash, 'fail', 0, String(e.message).slice(0, 400), { error: String(e.stack ?? e).slice(0, 2000) })
  }
}
const need = (r, what) => {
  if (r.code !== 0) throw new Error(`${what} exit ${r.code}: ${(r.stderr || r.stdout).slice(0, 600)}`)
  return r
}

async function validateTopic(id) {
  if (FAM[id]) return validateFam(id)
  const dir = id.replace(/-/g, '_')
  const gens = { dsu: [genDsu, naiveDsu, dsuInput, checkDsu], fenwick: [genFenwick, naiveFenwick, fwInput, checkFenwick], segtree: [genSeg, naiveSeg, segInput, checkFenwick], 'segtree-lazy': [genLazy, naiveLazy, lazyInput, checkFenwick], 'stl-bounds': [genBounds, null, bdInput, checkBounds], 'stl-priority-queue': [genPq, null, pqInput, checkPq] }
  const [gen, naive, inp, chk] = gens[id]
  const cases = gen(20260101 + id.length)
  const nv = naive ? naive(cases) : null
  const input = inp(cases)
  const check = (outText) => (nv ? chk(cases, nv, outText) : chk(cases, outText))
  const docs = await teachDocs(id)
  const hashes = SOURCE_HASHES[id]

  // teaching sources
  for (const [lang, doc] of Object.entries(docs)) {
    const key = `${id}|teach|${lang}|run`
    const h = sha(doc.source)
    if (h !== hashes.teach[lang] || h !== doc.sourceHash) {
      record(key, h, 'fail', 0, `displayed-source hash ${h.slice(0, 12)} != bound ${String(hashes.teach[lang]).slice(0, 12)}`)
      continue
    }
    guard(key, h, () => {
      const d = tmp(`${id}-${lang}`)
      const drv = D[id][lang]
      let r
      let checks
      if (lang === 'python') {
        writeFileSync(join(d, `${dir}.py`), doc.source)
        writeFileSync(join(d, 'main.py'), drv)
        writeFileSync(join(d, 'in.txt'), input)
        r = need(run('python3', ['-X', 'dev', 'main.py'], { cwd: d, input }), 'python3')
        checks = 'python3 -X dev'
      } else if (lang === 'typescript') {
        writeFileSync(join(d, `${dir}.ts`), doc.source)
        writeFileSync(join(d, 'main.ts'), drv)
        r = need(run('node', ['--experimental-strip-types', '--no-warnings', 'main.ts'], { cwd: d, input }), 'node')
        checks = 'node strip-types (displayed .ts imported unchanged)'
      } else if (lang === 'cpp') {
        writeFileSync(join(d, 'main.cpp'), doc.source + '\n' + drv)
        need(run('g++', [...CXX, 'main.cpp', '-o', 'main'], { cwd: d }), 'g++ compile')
        const c = run('g++', [...CXX, 'main.cpp', '-o', 'main'], { cwd: d })
        if (/warning:/.test(c.stderr)) throw new Error('compiler warnings: ' + c.stderr.slice(0, 500))
        r = need(run('./main', [], { cwd: d, input, env: ASAN_ENV }), 'run under ASan/UBSan')
        checks = 'g++ -std=c++17 ASan+UBSan -Wall -Wextra clean'
      } else if (lang === 'java') {
        const cls = { dsu: 'DSU', fenwick: 'Fenwick', segtree: 'SegTree', 'segtree-lazy': 'LazySegTree' }[id]
        writeFileSync(join(d, `${cls}.java`), doc.source)
        writeFileSync(join(d, 'Main.java'), drv)
        need(run('javac', ['-Xlint:all', `${cls}.java`, 'Main.java'], { cwd: d }), 'javac')
        r = need(run('java', ['-ea', '-cp', d, 'Main'], { cwd: d, input }), 'java')
        checks = 'javac -Xlint:all; java -ea'
      } else if (lang === 'rust') {
        writeFileSync(join(d, `${dir}.rs`), doc.source)
        writeFileSync(join(d, 'main.rs'), drv)
        need(run('rustc', ['--edition', '2021', '-C', 'debuginfo=0', '-C', 'overflow-checks=on', '-D', 'warnings', 'main.rs', '-o', 'main'], { cwd: d }), 'rustc')
        r = need(run('./main', [], { cwd: d, input }), 'rust run')
        checks = 'rustc -D warnings, overflow-checks=on'
      } else if (lang === 'go') {
        writeFileSync(join(d, `${dir}.go`), doc.source)
        writeFileSync(join(d, 'main.go'), drv)
        writeFileSync(join(d, 'go.mod'), 'module advtmp\ngo 1.21\n')
        need(run('go', ['vet', './...'], { cwd: d, env: { ...process.env, GOFLAGS: '-mod=mod', GOCACHE: join(d, '.cache') } }), 'go vet')
        r = need(run('go', ['run', '.'], { cwd: d, input, env: { ...process.env, GOFLAGS: '-mod=mod', GOCACHE: join(d, '.cache') } }), 'go run')
        checks = 'go vet; go run'
      }
      check(r.stdout)
      record(key, h, 'pass', cases.length, checks, { toolchain: tcOf(lang) })
    })
  }

  // contest: core via driver, full as displayed
  const cs = contestSources[id]
  for (const form of ['core', 'full']) {
    const key = `${id}|contest-${form}|cpp|run`
    const h = sha(cs[form].source)
    if (h !== hashes.contest[form] || h !== cs[form].hash) {
      record(key, h, 'fail', 0, 'displayed-source hash mismatch')
      continue
    }
    guard(key, h, () => {
      const d = tmp(`${id}-c-${form}`)
      let r
      let n
      let checks
      if (form === 'core') {
        writeFileSync(join(d, 'core.cpp'), cs.core.source)
        writeFileSync(join(d, 'main.cpp'), CD[id])
        need(run('g++', [...CXX, 'main.cpp', '-o', 'main'], { cwd: d }), 'g++ compile')
        const c = run('g++', [...CXX, 'main.cpp', '-o', 'main'], { cwd: d })
        if (/warning:/.test(c.stderr)) throw new Error('compiler warnings: ' + c.stderr.slice(0, 500))
        r = need(run('./main', [], { cwd: d, input, env: ASAN_ENV }), 'run under ASan/UBSan')
        n = cases.length
        const text = r.stdout
        // contest core has no `count` field: DSU driver derives it from roots; bounds/pq outputs follow the shared format
        check(text)
        checks = 'core compiled as displayed + driver; ASan+UBSan; naive baseline'
      } else {
        writeFileSync(join(d, 'full.cpp'), cs.full.source)
        need(run('g++', [...CXX, 'full.cpp', '-o', 'full'], { cwd: d }), 'g++ compile full')
        const t = TEMPLATES.find((x) => x.id === id)
        const s1 = need(run('./full', [], { cwd: d, input: t.sample.input, env: ASAN_ENV }), 'sample run')
        if (s1.stdout !== t.sample.output) throw new Error(`sample output mismatch: got ${JSON.stringify(s1.stdout)} want ${JSON.stringify(t.sample.output)}`)
        n = 1
        const r2 = mulberry32(777 + id.length)
        for (let k = 0; k < 150; k++) n += randomStdin(id, d, r2)
        checks = 'full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan'
      }
      record(key, h, 'pass', n, checks, { toolchain: tcOf('cpp') })
    })
  }
}

// ---------- generic families ----------
async function validateFam(id) {
  const F = FAM[id]
  const cases = F.gen(20260101 + id.length * 7)
  const want = cases.map((c) => F.naive(c))
  const input = caseInput(cases)
  const check = (text, what) => {
    const lines = text.replace(/\n$/, '').split('\n')
    const per = want[0].length
    if (lines.length !== cases.length * per) throw new Error(`${what}: ${lines.length} output lines, want ${cases.length * per}`)
    cases.forEach((c, ci) => {
      const got = lines.slice(ci * per, ci * per + per)
      if (F.check) F.check(c, got, want[ci])
      else if (got.map((x) => x.trim()).join('|') !== want[ci].join('|')) throw new Error(`${id} case ${ci} ${JSON.stringify({ k: c.k, a: c.a.slice(0, 8), b: c.b.slice(0, 8), c: c.c.slice(0, 8) })}: got ${JSON.stringify(got).slice(0, 160)} want ${JSON.stringify(want[ci]).slice(0, 160)}`)
    })
  }
  const dir = F.dir
  const docs = await teachDocs(id)
  const hashes = SOURCE_HASHES[id]
  for (const [lang, doc] of Object.entries(docs)) {
    const key = `${id}|teach|${lang}|run`
    const h = sha(doc.source)
    if (h !== hashes.teach[lang] || h !== doc.sourceHash) {
      record(key, h, 'fail', 0, `displayed-source hash ${h.slice(0, 12)} != bound ${String(hashes.teach[lang]).slice(0, 12)}`)
      continue
    }
    guard(key, h, () => {
      const d = tmp(`${id}-${lang}`)
      const drv = driver(lang, dir, F.calls[lang])
      let r
      let checks
      if (lang === 'python') {
        writeFileSync(join(d, `${dir}.py`), doc.source)
        writeFileSync(join(d, 'main.py'), drv)
        r = need(run('python3', ['-X', 'dev', 'main.py'], { cwd: d, input }), 'python3')
        checks = 'python3 -X dev'
      } else if (lang === 'typescript') {
        writeFileSync(join(d, `${dir}.ts`), doc.source)
        writeFileSync(join(d, 'main.ts'), drv)
        r = need(run('node', ['--experimental-strip-types', '--no-warnings', 'main.ts'], { cwd: d, input }), 'node')
        checks = 'node strip-types (displayed .ts imported unchanged)'
      } else if (lang === 'cpp') {
        writeFileSync(join(d, 'main.cpp'), doc.source + '\n' + drv)
        const c = need(run('g++', [...CXX, 'main.cpp', '-o', 'main'], { cwd: d }), 'g++ compile')
        if (/warning:/.test(c.stderr)) throw new Error('compiler warnings: ' + c.stderr.slice(0, 500))
        r = need(run('./main', [], { cwd: d, input, env: ASAN_ENV }), 'run under ASan/UBSan')
        checks = 'g++ -std=c++17 ASan+UBSan -Wall -Wextra clean'
      } else if (lang === 'java') {
        writeFileSync(join(d, `${F.cls}.java`), doc.source)
        writeFileSync(join(d, 'Main.java'), drv)
        need(run('javac', ['-Xlint:all', `${F.cls}.java`, 'Main.java'], { cwd: d }), 'javac')
        r = need(run('java', ['-ea', '-cp', d, 'Main'], { cwd: d, input }), 'java')
        checks = 'javac -Xlint:all; java -ea'
      } else if (lang === 'rust') {
        writeFileSync(join(d, `${dir}.rs`), doc.source)
        writeFileSync(join(d, 'main.rs'), drv)
        need(run('rustc', ['--edition', '2021', '-C', 'debuginfo=0', '-C', 'overflow-checks=on', '-D', 'warnings', 'main.rs', '-o', 'main'], { cwd: d }), 'rustc')
        r = need(run('./main', [], { cwd: d, input }), 'rust run')
        checks = 'rustc -D warnings, overflow-checks=on'
      } else {
        writeFileSync(join(d, `${dir}.go`), doc.source)
        writeFileSync(join(d, 'main.go'), drv)
        writeFileSync(join(d, 'go.mod'), 'module advtmp\ngo 1.21\n')
        const env = { ...process.env, GOFLAGS: '-mod=mod', GOCACHE: join(d, '.cache') }
        need(run('go', ['vet', './...'], { cwd: d, env }), 'go vet')
        r = need(run('go', ['run', '.'], { cwd: d, input, env }), 'go run')
        checks = 'go vet; go run'
      }
      check(r.stdout, `${id}/${lang}`)
      record(key, h, 'pass', cases.length, checks, { toolchain: tcOf(lang) })
    })
  }
  const cs = contestSources[id]
  for (const form of ['core', 'full']) {
    const key = `${id}|contest-${form}|cpp|run`
    const h = sha(cs[form].source)
    if (h !== hashes.contest[form] || h !== cs[form].hash) {
      record(key, h, 'fail', 0, 'displayed-source hash mismatch')
      continue
    }
    guard(key, h, () => {
      const d = tmp(`${id}-c-${form}`)
      let n
      let checks
      if (form === 'core') {
        writeFileSync(join(d, 'core.cpp'), cs.core.source)
        writeFileSync(join(d, 'main.cpp'), coreDriver(F.core))
        const c = need(run('g++', [...CXX, 'main.cpp', '-o', 'main'], { cwd: d }), 'g++ compile')
        if (/warning:/.test(c.stderr)) throw new Error('compiler warnings: ' + c.stderr.slice(0, 500))
        const r = need(run('./main', [], { cwd: d, input, env: ASAN_ENV }), 'run under ASan/UBSan')
        check(r.stdout, `${id}/contest-core`)
        n = cases.length
        checks = 'core compiled as displayed + driver; ASan+UBSan; naive baseline'
      } else {
        writeFileSync(join(d, 'full.cpp'), cs.full.source)
        const c = need(run('g++', [...CXX, 'full.cpp', '-o', 'full'], { cwd: d }), 'g++ compile full')
        if (/warning:/.test(c.stderr)) throw new Error('compiler warnings: ' + c.stderr.slice(0, 500))
        const t = TEMPLATES.find((x) => x.id === id)
        const s1 = need(run('./full', [], { cwd: d, input: t.sample.input, env: ASAN_ENV }), 'sample run')
        if (s1.stdout !== t.sample.output) throw new Error(`sample output mismatch: got ${JSON.stringify(s1.stdout)} want ${JSON.stringify(t.sample.output)}`)
        n = 1
        const r2 = famRng(777 + id.length)
        for (let k = 0; k < 150; k++) {
          const { input: inp, expected, verify } = F.full(r2)
          const o = need(run('./full', [], { cwd: d, input: inp, env: ASAN_ENV }), 'full random')
          if (verify) verify(o.stdout)
          else if (o.stdout !== expected) throw new Error(`${id} full: random stdin mismatch\n${inp}\ngot ${JSON.stringify(o.stdout)} want ${JSON.stringify(expected)}`)
          n++
        }
        checks = 'full compiled as displayed; sample output exact; random stdin vs naive; ASan+UBSan'
      }
      record(key, h, 'pass', n, checks, { toolchain: tcOf('cpp') })
    })
  }
}
const tcOf = (lang) => ({ python: toolchain.python, typescript: toolchain.node, cpp: toolchain.gpp, java: toolchain.javac, rust: toolchain.rustc, go: toolchain.go })[lang]

// random stdin for contest "full" mains (each uses the template's documented protocol)
function randomStdin(id, d, r) {
  if (id === 'dsu') {
    const n = rint(r, 1, 12), q = rint(r, 1, 30)
    const ops = []
    for (let i = 0; i < q; i++) ops.push([rint(r, 0, 1), rint(r, 0, n - 1), rint(r, 0, n - 1)])
    const input = `${n} ${q}\n` + ops.map((o) => o.join(' ')).join('\n') + '\n'
    const lab = Array.from({ length: n }, (_, i) => i)
    const exp = []
    for (const [t, u, v] of ops) {
      if (t === 0) {
        const f = lab[v], to = lab[u]
        for (let i = 0; i < n; i++) if (lab[i] === f) lab[i] = to
      } else exp.push(lab[u] === lab[v] ? 1 : 0)
    }
    const o = need(run('./full', [], { cwd: d, input, env: ASAN_ENV }), 'full random')
    if (o.stdout !== exp.map((x) => x + '\n').join('')) throw new Error('dsu full: random stdin mismatch\n' + input)
  } else if (id === 'fenwick') {
    const n = rint(r, 1, 12), q = rint(r, 1, 30)
    const a = Array.from({ length: n }, () => rint(r, -50, 50))
    const lines = []
    const exp = []
    const cur = [...a]
    for (let i = 0; i < q; i++) {
      if (r() < 0.5) {
        const p = rint(r, 0, n - 1), x = rint(r, -50, 50)
        lines.push(`0 ${p} ${x}`)
        cur[p] += x
      } else {
        const l = rint(r, 0, n), rr = rint(r, l, n)
        lines.push(`1 ${l} ${rr}`)
        exp.push(cur.slice(l, rr).reduce((s, v) => s + v, 0))
      }
    }
    const input = `${n} ${q}\n${a.join(' ')}\n${lines.join('\n')}\n`
    const o = need(run('./full', [], { cwd: d, input, env: ASAN_ENV }), 'full random')
    if (o.stdout !== exp.map((x) => x + '\n').join('')) throw new Error('fenwick full: random stdin mismatch\n' + input)
  } else if (id === 'segtree') {
    const n = rint(r, 1, 12), q = rint(r, 1, 30)
    const a = Array.from({ length: n }, () => rint(r, -50, 50))
    const lines = []
    const exp = []
    const cur = [...a]
    for (let i = 0; i < q; i++) {
      if (r() < 0.5) {
        const p = rint(r, 0, n - 1), x = rint(r, -50, 50)
        lines.push(`0 ${p} ${x}`)
        cur[p] = x
      } else {
        const l = rint(r, 0, n), rr = rint(r, l, n)
        lines.push(`1 ${l} ${rr}`)
        exp.push(cur.slice(l, rr).reduce((s, v) => s + v, 0))
      }
    }
    const input = `${n} ${q}\n${a.join(' ')}\n${lines.join('\n')}\n`
    const o = need(run('./full', [], { cwd: d, input, env: ASAN_ENV }), 'full random')
    if (o.stdout !== exp.map((x) => x + '\n').join('')) throw new Error('segtree full: random stdin mismatch\n' + input)
  } else if (id === 'segtree-lazy') {
    const n = rint(r, 1, 12), q = rint(r, 1, 30)
    const a = Array.from({ length: n }, () => rint(r, -50, 50))
    const lines = []
    const exp = []
    const cur = [...a]
    for (let i = 0; i < q; i++) {
      const l = rint(r, 0, n), rr = rint(r, l, n)
      if (r() < 0.5) {
        const x = rint(r, -50, 50)
        lines.push(`0 ${l} ${rr} ${x}`)
        for (let j = l; j < rr; j++) cur[j] += x
      } else {
        lines.push(`1 ${l} ${rr}`)
        exp.push(cur.slice(l, rr).reduce((s, v) => s + v, 0))
      }
    }
    const input = `${n} ${q}\n${a.join(' ')}\n${lines.join('\n')}\n`
    const o = need(run('./full', [], { cwd: d, input, env: ASAN_ENV }), 'full random')
    if (o.stdout !== exp.map((x) => x + '\n').join('')) throw new Error('segtree-lazy full: random stdin mismatch\n' + input)
  } else if (id === 'stl-bounds') {
    const n = rint(r, 0, 12)
    const a = Array.from({ length: n }, () => rint(r, -5, 5)).sort((x, y) => x - y)
    const qs = Array.from({ length: rint(r, 1, 8) }, () => rint(r, -7, 7))
    const input = `${n}\n${a.join(' ')}\n${qs.length}\n${qs.join('\n')}\n`
    const exp = qs.map((x) => {
      let lo = 0
      while (lo < n && a[lo] < x) lo++
      let hi = 0
      while (hi < n && !(x < a[hi])) hi++
      return `${lo} ${hi} ${hi - lo}\n`
    }).join('')
    const o = need(run('./full', [], { cwd: d, input, env: ASAN_ENV }), 'full random')
    if (o.stdout !== exp) throw new Error('bounds full: random stdin mismatch\n' + input)
  } else {
    const n = rint(r, 1, 15)
    const v = Array.from({ length: n }, () => rint(r, -20, 20))
    const input = `${n}\n${v.join(' ')}\n`
    const exp = [...v].sort((x, y) => y - x).join(' ') + '\n'
    const o = need(run('./full', [], { cwd: d, input, env: ASAN_ENV }), 'full random')
    if (o.stdout !== exp) throw new Error('pq full: random stdin mismatch\n' + input)
  }
  return 1
}

const ids = ['stl-bounds', 'stl-priority-queue', 'dsu', 'fenwick', 'segtree', 'segtree-lazy', ...Object.keys(FAM)].filter((i) => !only || i === only)
for (const id of ids) await validateTopic(id)

const outPath = join(ROOT, 'src/features/advanced/templates/validation.json')
let prev = { testsetVersion: TESTSET_VERSION, toolchain: {}, entries: {} }
if (only && existsSync(outPath)) prev = JSON.parse(readFileSync(outPath, 'utf8'))
const db = { testsetVersion: TESTSET_VERSION, toolchain, entries: { ...(only ? prev.entries : {}), ...results } }
writeFileSync(outPath, JSON.stringify(db, null, 2) + '\n')
mkdirSync(join(ROOT, 'docs/advanced'), { recursive: true })
writeFileSync(args.out ? resolve(args.out) : join(ROOT, 'docs/advanced/validation-run.json'), JSON.stringify({ ranAt: new Date().toISOString(), toolchain, missing, logs }, null, 2))
const failed = Object.entries(results).filter(([, v]) => v.status !== 'pass')
console.log(`\n${Object.keys(results).length} entries, ${failed.length} failed`)
process.exit(failed.length ? 1 : 0)
