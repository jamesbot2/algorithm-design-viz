/**
 * V28: multi-language code-location gap detector (LCS / KMP / Floyd).
 * Event from message; statement meaning + enclosing headers + weak condition per language.
 * No hard-coded line numbers; no offsets between documents.
 */
import type { CodeDocument } from '../../src/codeCatalog/types'

export type DocLang = 'typescript' | 'pseudocode' | 'python' | 'cpp' | 'java' | 'rust' | 'go'
export const ALL_LANGS: DocLang[] = ['typescript', 'python', 'cpp', 'java', 'rust', 'go']
type PerLang = Partial<Record<DocLang, RegExp>>
type PerLangList = Partial<Record<DocLang, RegExp[]>>

export interface EventRule {
  stmt: PerLang
  enclosing?: PerLangList
  weak?: PerLang
  next?: PerLang
  prev?: PerLang
  rangeHas?: PerLang
  elseAfter?: PerLang
}
export interface AlgoSemantics<E extends string = string> {
  algo: string
  events: readonly E[]
  classify: (msg: string) => E | null
  rules: Record<E, EventRule>
}
export const docLang = (doc: CodeDocument): DocLang => doc.language as DocLang
export function norm(lang: DocLang, s: string): string {
  const w = s.replace(/\s+/g, '')
  return lang === 'typescript' ? w.replace(/!/g, '') : w
}
const indent = (s: string) => ((s.match(/^[ \t]*/)?.[0] ?? '').replace(/\t/g, '    ').length)
export function enclosingHeaders(lines: string[], line1: number): number[] {
  const out: number[] = []
  let cur = indent(lines[line1 - 1] ?? '')
  for (let k = line1 - 2; k >= 0; k--) {
    const l = lines[k]!
    if (!l.trim()) continue
    const d = indent(l)
    if (d < cur) { out.push(k + 1); cur = d }
  }
  return out
}
export interface ShownExec {
  execLine: number | null
  rangeEnd?: number | null
  headerDocId?: string | null
  headerLine?: string | null
  domText?: string | null
  weakLines?: number[]
  weakTexts?: string[]
}
export function execFailures<E extends string>(sem: AlgoSemantics<E>, doc: CodeDocument, event: E | null, shown: ShownExec): string[] {
  const f: string[] = []
  const lang = docLang(doc)
  const id = doc.documentId
  const lines = doc.source.split('\n')
  if (!event) return [`unclassified ${sem.algo} frame (cannot judge ${id})`]
  const rule = sem.rules[event]
  const stmt = rule.stmt[lang]
  if (!stmt) return [`${id}: no statement rule for ${sem.algo}/${event} in ${lang}`]
  if (shown.headerLine != null && !/^\d+$/.test(shown.headerLine)) f.push(`${id}: header shows no exec line (":${shown.headerLine}")`)
  if (shown.headerDocId !== undefined && shown.headerDocId !== id) f.push(`header doc "${shown.headerDocId}" is not the shown doc "${id}"`)
  const L = shown.execLine
  if (L == null || !Number.isInteger(L) || L <= 0) { f.push(`${id}: no execution line for ${event} (data-exec-line="${L ?? ''}")`); return f }
  if (L > lines.length) { f.push(`${id}: exec line ${L} outside document (1..${lines.length})`); return f }
  if (shown.headerLine && /^\d+$/.test(shown.headerLine) && Number(shown.headerLine) !== L) f.push(`header line ${shown.headerLine} ≠ exec line ${L}`)
  const text = lines[L - 1]!
  if (shown.domText != null && norm(lang, shown.domText) !== norm(lang, text)) f.push(`highlighted DOM text "${shown.domText}" ≠ ${id}:${L} "${text.trim()}"`)
  if (!stmt.test(norm(lang, text))) f.push(`${id}:${L} "${text.trim()}" is not the ${event} statement (${stmt})`)
  const heads = enclosingHeaders(lines, L)
  rule.enclosing?.[lang]?.forEach((re, i) => {
    const h = heads[i]
    if (!h || !re.test(norm(lang, lines[h - 1]!))) f.push(`${id}:${L} ${event}: enclosing header #${i + 1} is "${h ? lines[h - 1]!.trim() : '(none)'}", expected ${re}`)
  })
  const elseAfter = rule.elseAfter?.[lang]
  if (elseAfter) {
    const elseLine = heads[0]
    const sib = elseLine
      ? [...lines.slice(0, elseLine - 1).entries()].reverse().find(([, l]) => l.trim() && indent(l) === indent(lines[elseLine - 1]!))
      : undefined
    if (!sib || !elseAfter.test(norm(lang, sib[1]))) f.push(`${id}:${L} ${event}: the else does not follow ${elseAfter}`)
  }
  const nx = rule.next?.[lang]
  if (nx && !nx.test(norm(lang, lines[L] ?? ''))) f.push(`${id}:${L} ${event}: next line "${(lines[L] ?? '').trim()}" ≠ ${nx}`)
  const pv = rule.prev?.[lang]
  if (pv && !pv.test(norm(lang, lines[L - 2] ?? ''))) f.push(`${id}:${L} ${event}: previous line "${(lines[L - 2] ?? '').trim()}" ≠ ${pv}`)
  const rh = rule.rangeHas?.[lang]
  if (rh) {
    const end = shown.rangeEnd ?? L
    if (!lines.slice(L - 1, end).some((l) => rh.test(norm(lang, l)))) f.push(`${id}:${L}-${end} ${event}: range lacks ${rh}`)
  }
  const weak = rule.weak?.[lang]
  if (weak && (shown.weakLines || shown.weakTexts)) {
    const texts = [...(shown.weakLines ?? []).map((w) => lines[w - 1] ?? ''), ...(shown.weakTexts ?? [])]
    if (!texts.some((t) => weak.test(norm(lang, t)))) f.push(`${id}: ${event} lacks its weak condition line ${weak} (weak: ${JSON.stringify(texts.map((t) => t.trim()))})`)
  }
  return f
}
const one = (a: PerLang): PerLangList => Object.fromEntries(Object.keys(a).map((k) => [k, [a[k as DocLang]!]])) as PerLangList
const both = (a: PerLang, b: PerLang): PerLangList => Object.fromEntries(Object.keys(a).map((k) => [k, [a[k as DocLang]!, b[k as DocLang]!]])) as PerLangList
const per6 = (re: RegExp): PerLang => Object.fromEntries(ALL_LANGS.map((l) => [l, re])) as PerLang

/* LCS */
export type LcsEvent = 'init' | 'compare' | 'diagonal' | 'elseWrite' | 'reconstructStart' | 'match' | 'up' | 'left' | 'done'
export function classifyLcs(msg: string): LcsEvent | null {
  const m = msg.trim()
  if (/^计算 LCS\(/.test(m)) return 'init'
  if (/^比较 X\[\d+\]=.* 与 Y\[\d+\]=/.test(m)) return 'compare'
  if (/^X\[\d+\]='.' == Y\[\d+\]='.' → dp\[\d+\]\[\d+\]=\d+$/.test(m)) return 'diagonal'
  if (/^不相等 → dp\[\d+\]\[\d+\]=max\(\d+,\d+\)=\d+$/.test(m)) return 'elseWrite'
  if (/^填表完成，开始回溯/.test(m)) return 'reconstructStart'
  if (/^匹配 '.'：取对角 → \(\d+,\d+\)/.test(m)) return 'match'
  if (/^上移 → \(\d+,\d+\)$/.test(m)) return 'up'
  if (/^左移 → \(\d+,\d+\)$/.test(m)) return 'left'
  if (/^LCS 长度 = \d+/.test(m)) return 'done'
  return null
}
const LCS_CMP: PerLang = {
  typescript: /^if\(X\[i-1\]===Y\[j-1\]\)\{$/, pseudocode: /^ifX\[i-1\]=Y\[j-1\]:$/,
  python: /^ifX\[i-1\]==Y\[j-1\]:$/, cpp: /^if\(X\[i-1\]==Y\[j-1\]\)\{$/,
  java: /^if\(X\.charAt\(i-1\)==Y\.charAt\(j-1\)\)\{$/, rust: /^ifx\[i-1\]==y\[j-1\]\{$/, go: /^ifX\[i-1\]==Y\[j-1\]\{$/,
}
const LCS_FORJ: PerLang = {
  typescript: /^for\(letj=1;j<=n;j\+\+\)\{$/, pseudocode: /^forj←1\.\.n:$/,
  python: /^forjinrange\(1,n\+1\):$/, cpp: /^for\(intj=1;j<=n;j\+\+\)\{$/,
  java: /^for\(intj=1;j<=n;j\+\+\)\{$/, rust: /^forjin1\.\.=n\{$/, go: /^forj:=1;j<=n;j\+\+\{$/,
}
const LCS_WHILE: PerLang = {
  typescript: /^while\(i>0&&j>0\)\{$/, pseudocode: /^whilei>0andj>0:$/,
  python: /^whilei>0andj>0:$/, cpp: /^while\(i>0&&j>0\)\{$/,
  java: /^while\(i>0&&j>0\)\{$/, rust: /^whilei>0&&j>0\{$/, go: /^fori>0&&j>0\{$/,
}
const LCS_TIE: PerLang = {
  typescript: /^\}elseif\(dp\[i-1\]\[j\]>=dp\[i\]\[j-1\]\)\{$/,
  pseudocode: /^elseifdp\[i-1\]\[j\]≥dp\[i\]\[j-1\]:/,
  python: /^elifdp\[i-1\]\[j\]>=dp\[i\]\[j-1\]:$/,
  cpp: /^\}elseif\(dp\[i-1\]\[j\]>=dp\[i\]\[j-1\]\)\{$/,
  java: /^\}elseif\(dp\[i-1\]\[j\]>=dp\[i\]\[j-1\]\)\{$/,
  rust: /^\}elseifdp\[i-1\]\[j\]>=dp\[i\]\[j-1\]\{$/,
  go: /^\}elseifdp\[i-1\]\[j\]>=dp\[i\]\[j-1\]\{$/,
}
const ELSE: PerLang = {
  typescript: /^\}else\{$/, pseudocode: /^else:$/, python: /^else:$/, cpp: /^\}else\{$/, java: /^\}else\{$/, rust: /^\}else\{$/, go: /^\}else\{$/,
}
export const LCS_SEMANTICS: AlgoSemantics<LcsEvent> = {
  algo: 'lcs', events: ['init','compare','diagonal','elseWrite','reconstructStart','match','up','left','done'],
  classify: classifyLcs,
  rules: {
    init: {
      stmt: {
        typescript: /^for\(leti=0;i<=m;i\+\+\)dp\[i\]\[0\]=0;?$/,
        pseudocode: /^fori←0\.\.m:dp\[i\]\[0\]←0$/,
        python: /^foriinrange\(m\+1\):$/, cpp: /^for\(inti=0;i<=m;i\+\+\)dp\[i\]\[0\]=0;$/,
        java: /^for\(inti=0;i<=m;i\+\+\)dp\[i\]\[0\]=0;$/, rust: /^foriin0\.\.=m\{$/, go: /^fori:=0;i<=m;i\+\+\{$/,
      },
      next: { python: /^dp\[i\]\[0\]=0$/, rust: /^dp\[i\]\[0\]=0;$/, go: /^dp\[i\]\[0\]=0$/ },
    },
    compare: { stmt: LCS_CMP, enclosing: one(LCS_FORJ) },
    diagonal: {
      stmt: {
        ...(Object.fromEntries(ALL_LANGS.map((l) => [l, /^dp\[i\]\[j\]=dp\[i-1\]\[j-1\]\+1;?$/])) as PerLang),
        pseudocode: /^dp\[i\]\[j\]←dp\[i-1\]\[j-1\]\+1$/,
      },
      enclosing: both(LCS_CMP, LCS_FORJ), weak: LCS_CMP,
    },
    elseWrite: {
      stmt: {
        typescript: /^dp\[i\]\[j\]=Math\.max\(dp\[i-1\]\[j\],dp\[i\]\[j-1\]\);?$/,
        pseudocode: /^dp\[i\]\[j\]←max\(dp\[i-1\]\[j\],dp\[i\]\[j-1\]\)$/,
        python: /^dp\[i\]\[j\]=max\(dp\[i-1\]\[j\],dp\[i\]\[j-1\]\)$/,
        cpp: /^dp\[i\]\[j\]=std::max\(dp\[i-1\]\[j\],dp\[i\]\[j-1\]\);$/,
        java: /^dp\[i\]\[j\]=Math\.max\(dp\[i-1\]\[j\],dp\[i\]\[j-1\]\);$/,
        rust: /^dp\[i\]\[j\]=dp\[i-1\]\[j\]\.max\(dp\[i\]\[j-1\]\);$/,
        go: /^dp\[i\]\[j\]=max\(dp\[i-1\]\[j\],dp\[i\]\[j-1\]\)$/,
      },
      enclosing: both(ELSE, LCS_FORJ), weak: LCS_CMP,
    },
    reconstructStart: {
      stmt: {
        typescript: /^leti=m;?$/, pseudocode: /^i←m;j←n;S←\[\]$/,
        python: /^i=m$/, cpp: /^inti=m;$/, java: /^inti=m;$/, rust: /^letmuti=m;$/, go: /^i:=m$/,
      },
    },
    match: {
      stmt: {
        typescript: /^chars\.push\(X\[i-1\]\);?$/,
        pseudocode: /^appendX\[i-1\]toS$/,
        python: /^chars\.append\(X\[i-1\]\)$/,
        cpp: /^chars\.push_back\(X\[i-1\]\);$/,
        java: /^chars\.append\(X\.charAt\(i-1\)\);$/,
        rust: /^chars\.push\(x\[i-1\]\);$/,
        go: /^chars=append\(chars,X\[i-1\]\)$/,
      },
      enclosing: both(LCS_CMP, LCS_WHILE),
    },
    up: {
      stmt: { typescript: /^i--;?$/, pseudocode: /^i←i-1$/, python: /^i-=1$/, cpp: /^i--;$/, java: /^i--;$/, rust: /^i-=1;$/, go: /^i--$/ },
      enclosing: both(LCS_TIE, LCS_WHILE), weak: LCS_TIE,
    },
    left: {
      stmt: { typescript: /^j--;?$/, pseudocode: /^j←j-1$/, python: /^j-=1$/, cpp: /^j--;$/, java: /^j--;$/, rust: /^j-=1;$/, go: /^j--$/ },
      enclosing: both(ELSE, LCS_WHILE), elseAfter: LCS_TIE,
    },
    done: {
      stmt: {
        typescript: /^return\{length:dp\[m\]\[n\],sequence:chars\.reverse\(\)/,
        pseudocode: /^return\(dp\[m\]\[n\],reverse\(S\)\)$/,
        python: /^returndp\[m\]\[n\],"".join\(reversed\(chars\)\)$/,
        cpp: /^return\{dp\[m\]\[n\],std::string\(chars\.rbegin\(\),chars\.rend\(\)\)\};$/,
        java: /^returnnewResult\(dp\[m\]\[n\],chars\.reverse\(\)\.toString\(\)\);$/,
        rust: /^\(dp\[m\]\[n\],chars\.iter\(\)\.rev\(\)\.collect\(\)\)$/,
        go: /^returndp\[m\]\[n\],string\(chars\)$/,
      },
      prev: { go: /^slices\.Reverse\(chars\)$/ },
    },
  },
}

/* KMP */
export type KmpEvent =
  | 'emptyPattern' | 'buildLps' | 'lpsCompare' | 'lpsExtend' | 'lpsFallback' | 'lpsZero' | 'lpsReturn'
  | 'match' | 'hit' | 'fallbackWrite' | 'advance' | 'done'
export function classifyKmp(msg: string): KmpEvent | null {
  const m = msg.trim()
  if (/^空模式：/.test(m)) return 'emptyPattern'
  if (/^构建 π\/next 数组/.test(m)) return 'buildLps'
  if (/^比较 p\[\d+\]='.' 与 p\[\d+\]='.'$/.test(m)) return 'lpsCompare'
  if (/^匹配，next\[\d+\]=\d+$/.test(m)) return 'lpsExtend'
  if (/^失配，len ← next\[\.\.\.\] 回退到 \d+$/.test(m)) return 'lpsFallback'
  if (/^next\[\d+\]=0$/.test(m)) return 'lpsZero'
  if (/^π\/next = \[/.test(m)) return 'lpsReturn'
  if (/^比较 t\[\d+\]='.' 与 p\[\d+\]='.*'$/.test(m)) return 'match'
  if (/^匹配成功！起点 \d+$/.test(m)) return 'hit'
  if (/^失配，模式串跳转 j ← \d+$/.test(m)) return 'fallbackWrite'
  if (/^失配且 j=0，文本前进$/.test(m)) return 'advance'
  if (/^完成，(命中位置|无匹配)/.test(m)) return 'done'
  return null
}
const L_ = '(len|length)'
const K_SEARCH: PerLang = Object.fromEntries(ALL_LANGS.map((l) => [l, /(function|def|fn|func|static|std::vector<int>).*kmp_?search\(/i])) as PerLang
const K_BUILD: PerLang = Object.fromEntries(ALL_LANGS.map((l) => [l, /(function|def|fn|func|static|std::vector<int>).*build_?lps\(/i])) as PerLang
const K_WHILE_T: PerLang = {
  typescript: /^while\(i<text\.length\)\{$/, python: /^whilei<len\(text\):$/, cpp: /^while\(i<text\.size\(\)\)\{$/,
  java: /^while\(i<text\.length\(\)\)\{$/, rust: /^whilei<t\.len\(\)\{$/, go: /^fori<len\(text\)\{$/,
}
const K_WHILE_P: PerLang = {
  typescript: /^while\(i<pattern\.length\)\{$/, python: /^whilei<len\(pattern\):$/, cpp: /^while\(i<pattern\.size\(\)\)\{$/,
  java: /^while\(i<pattern\.length\(\)\)\{$/, rust: /^whilei<p\.len\(\)\{$/, go: /^fori<len\(pattern\)\{$/,
}
const K_MATCH: PerLang = {
  typescript: /^if\(text\[i\]===pattern\[j\]\)\{$/, python: /^iftext\[i\]==pattern\[j\]:$/, cpp: /^if\(text\[i\]==pattern\[j\]\)\{$/,
  java: /^if\(text\.charAt\(i\)==pattern\.charAt\(j\)\)\{$/, rust: /^ift\[i\]==p\[j\]\{$/, go: /^iftext\[i\]==pattern\[j\]\{$/,
}
const K_FULL: PerLang = {
  typescript: /^if\(j===pattern\.length\)\{$/, python: /^ifj==len\(pattern\):$/, cpp: /^if\(j==pattern\.size\(\)\)\{$/,
  java: /^if\(j==pattern\.length\(\)\)\{$/, rust: /^ifj==p\.len\(\)\{$/, go: /^ifj==len\(pattern\)\{$/,
}
const K_JGT0: PerLang = {
  typescript: /^\}elseif\(j>0\)\{$/, python: /^elifj>0:$/, cpp: /^\}elseif\(j>0\)\{$/, java: /^\}elseif\(j>0\)\{$/, rust: /^\}elseifj>0\{$/, go: /^\}elseifj>0\{$/,
}
const K_LCMP: PerLang = {
  typescript: /^if\(pattern\[i\]===pattern\[len\]\)\{$/, python: /^ifpattern\[i\]==pattern\[length\]:$/, cpp: /^if\(pattern\[i\]==pattern\[len\]\)\{$/,
  java: /^if\(pattern\.charAt\(i\)==pattern\.charAt\(len\)\)\{$/, rust: /^ifp\[i\]==p\[len\]\{$/, go: /^ifpattern\[i\]==pattern\[length\]\{$/,
}
const K_LGT0: PerLang = {
  typescript: /^\}elseif\(len>0\)\{$/, python: /^eliflength>0:$/, cpp: /^\}elseif\(len>0\)\{$/, java: /^\}elseif\(len>0\)\{$/, rust: /^\}elseiflen>0\{$/, go: /^\}elseiflength>0\{$/,
}
const ELSE6: PerLang = { typescript: ELSE.typescript!, python: ELSE.python!, cpp: ELSE.cpp!, java: ELSE.java!, rust: ELSE.rust!, go: ELSE.go! }
export const KMP_SEMANTICS: AlgoSemantics<KmpEvent> = {
  algo: 'kmp',
  events: ['emptyPattern','buildLps','lpsCompare','lpsExtend','lpsFallback','lpsZero','lpsReturn','match','hit','fallbackWrite','advance','done'],
  classify: classifyKmp,
  rules: {
    emptyPattern: {
      stmt: {
        typescript: /^if\(pattern\)return\[0\]$/, python: /^ifnotpattern:$/, cpp: /^if\(pattern\.empty\(\)\)return\{0\};$/,
        java: /^if\(pattern\.isEmpty\(\)\)returnList\.of\(0\);$/, rust: /^ifp\.is_empty\(\)\{$/, go: /^iflen\(pattern\)==0\{$/,
      },
      next: { python: /^return\[0\]$/, rust: /^returnvec!\[0\];$/, go: /^return\[\]int\{0\}$/ },
      enclosing: one(K_SEARCH),
    },
    buildLps: { stmt: per6(/^(const|let|int\[\]|conststd::vector<int>)?lps:?=build_?lps\(&?(pattern|p)\);?$/i), enclosing: one(K_SEARCH) },
    lpsCompare: { stmt: K_LCMP, enclosing: both(K_WHILE_P, K_BUILD) },
    lpsExtend: {
      stmt: per6(new RegExp(`^${L_}(\\+\\+|\\+=1);?$`)),
      rangeHas: per6(new RegExp(`^lps\\[i\\]=${L_};?$`)),
      enclosing: both(K_LCMP, K_WHILE_P), weak: K_LCMP,
    },
    lpsFallback: { stmt: per6(new RegExp(`^${L_}=lps\\[${L_}-1\\];?$`)), enclosing: both(K_LGT0, K_WHILE_P), weak: K_LGT0 },
    lpsZero: {
      stmt: per6(/^lps\[i\]=0;?$/), rangeHas: per6(/^i(\+\+|\+=1);?$/),
      enclosing: both(ELSE6, K_WHILE_P), elseAfter: K_LGT0,
    },
    lpsReturn: { stmt: { typescript: /^returnlps$/, python: /^returnlps$/, cpp: /^returnlps;$/, java: /^returnlps;$/, rust: /^lps$/, go: /^returnlps$/ }, enclosing: one(K_BUILD) },
    match: { stmt: K_MATCH, enclosing: both(K_WHILE_T, K_SEARCH) },
    hit: {
      stmt: {
        typescript: /^hits\.push\(i-j\)$/, python: /^hits\.append\(i-j\)$/, cpp: /^hits\.push_back\(static_cast<int>\(i-j\)\);$/,
        java: /^hits\.add\(i-j\);$/, rust: /^hits\.push\(i-j\);$/, go: /^hits=append\(hits,i-j\)$/,
      },
      enclosing: Object.fromEntries(ALL_LANGS.map((l) => [l, [K_FULL[l]!, K_MATCH[l]!, K_WHILE_T[l]!]])) as PerLangList,
    },
    fallbackWrite: { stmt: per6(/^j=lps\[j-1\];?$/), enclosing: both(K_JGT0, K_WHILE_T), weak: K_JGT0 },
    advance: { stmt: per6(/^i(\+\+|\+=1);?$/), enclosing: both(ELSE6, K_WHILE_T), elseAfter: K_JGT0 },
    done: { stmt: { typescript: /^returnhits$/, python: /^returnhits$/, cpp: /^returnhits;$/, java: /^returnhits;$/, rust: /^hits$/, go: /^returnhits$/ }, enclosing: one(K_SEARCH) },
  },
}

/* Floyd */
export type FloydEvent = 'init' | 'kLoop' | 'relax' | 'update' | 'done'
export function classifyFloyd(msg: string): FloydEvent | null {
  const m = msg.trim()
  if (/^初始化距离矩阵/.test(m)) return 'init'
  if (/^中转点 k = \d+$/.test(m)) return 'kLoop'
  if (/^检查 d\[\d+\]\[\d+\] vs /.test(m)) return 'relax'
  if (/^更新 d\[\d+\]\[\d+\] = /.test(m)) return 'update'
  if (/^Floyd 完成|^检测到负环/.test(m)) return 'done'
  return null
}
const F_FUNC = per6(/(function|def|fn|func|static|std::vector<std::vector<double>>).*floyd\(/)
const F_K: PerLang = {
  typescript: /^for\(letk=0;k<n;k\+\+\)\{$/, python: /^forkinrange\(n\):$/, cpp: /^for\(size_tk=0;k<n;k\+\+\)\{$/,
  java: /^for\(intk=0;k<n;k\+\+\)\{$/, rust: /^forkin0\.\.n\{$/, go: /^fork:=0;k<n;k\+\+\{$/,
}
const loopVar = (v: string): PerLang => ({
  typescript: new RegExp(`^for\\(let${v}=0;${v}<n;${v}\\+\\+\\)\\{$`),
  python: new RegExp(`^for${v}inrange\\(n\\):$`),
  cpp: new RegExp(`^for\\(size_t${v}=0;${v}<n;${v}\\+\\+\\)\\{$`),
  java: new RegExp(`^for\\(int${v}=0;${v}<n;${v}\\+\\+\\)\\{$`),
  rust: new RegExp(`^for${v}in0\\.\\.n\\{$`),
  go: new RegExp(`^for${v}:=0;${v}<n;${v}\\+\\+\\{$`),
})
const F_I = loopVar('i'), F_J = loopVar('j')
const F_RELAX: PerLang = {
  typescript: /^if\(d\[i\]\[k\]\+d\[k\]\[j\]<d\[i\]\[j\]\)\{$/, python: /^ifd\[i\]\[k\]\+d\[k\]\[j\]<d\[i\]\[j\]:$/,
  cpp: /^if\(d\[i\]\[k\]\+d\[k\]\[j\]<d\[i\]\[j\]\)\{$/, java: /^if\(d\[i\]\[k\]\+d\[k\]\[j\]<d\[i\]\[j\]\)\{$/,
  rust: /^ifd\[i\]\[k\]\+d\[k\]\[j\]<d\[i\]\[j\]\{$/, go: /^ifd\[i\]\[k\]\+d\[k\]\[j\]<d\[i\]\[j\]\{$/,
}
const chainOf = (...ps: PerLang[]): PerLangList => Object.fromEntries(ALL_LANGS.map((l) => [l, ps.map((p) => p[l]!)])) as PerLangList
export const FLOYD_SEMANTICS: AlgoSemantics<FloydEvent> = {
  algo: 'floyd', events: ['init','kLoop','relax','update','done'], classify: classifyFloyd,
  rules: {
    init: {
      stmt: {
        typescript: /^constd=dist\.map\(\(r\)=>r\.slice\(\)\)$/, python: /^d=\[row\[:\]forrowindist\]$/,
        cpp: /^std::vector<std::vector<double>>d=dist;$/, java: /^double\[\]\[\]d=newdouble\[n\]\[\];$/,
        rust: /^letmutd:Vec<Vec<f64>>=dist\.to_vec\(\);$/, go: /^d:=make\(\[\]\[\]float64,n\)$/,
      },
      rangeHas: { java: /^d\[r\]=dist\[r\]\.clone\(\);$/, go: /^d\[r\]=append\(\[\]float64\(nil\),dist\[r\]\.\.\.\)$/ },
      enclosing: one(F_FUNC),
    },
    kLoop: { stmt: F_K, enclosing: one(F_FUNC) },
    relax: { stmt: F_RELAX, enclosing: chainOf(F_J, F_I, F_K) },
    update: { stmt: per6(/^d\[i\]\[j\]=d\[i\]\[k\]\+d\[k\]\[j\];?$/), enclosing: chainOf(F_RELAX, F_J, F_I, F_K), weak: F_RELAX },
    done: { stmt: { typescript: /^returnd$/, python: /^returnd$/, cpp: /^returnd;$/, java: /^returnd;$/, rust: /^d$/, go: /^returnd$/ }, enclosing: one(F_FUNC) },
  },
}
export const SEMANTICS = { lcs: LCS_SEMANTICS, kmp: KMP_SEMANTICS, floyd: FLOYD_SEMANTICS } as const
export type Phase2Algo = keyof typeof SEMANTICS
