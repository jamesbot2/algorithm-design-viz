/**
 * V27: LCS code-location gap detector shared by the unit tests and the E2E spec.
 *
 * A frame's semantic event is derived from what the frame SAYS (its banner/message),
 * never from the anchor id it carries, and the highlighted statement is judged by its
 * MEANING in the document actually shown (TypeScript or pseudocode):
 *   - the exec line must exist (no `data-exec-line=""`, no header `:—`, no missing anchor),
 *   - it must lie inside that document and belong to it (header doc id === shown doc),
 *   - the statement on that line must be the operation the event performs, and
 *   - it must sit in the right control-flow branch (enclosing header by indentation),
 *     so e.g. binding the else-write to the compare line, or "move up" to the
 *     "move left" branch, fails even though both lines exist.
 * No line numbers are hard-coded and no offsets between documents are assumed.
 */
import type { CodeDocument } from '../../src/codeCatalog/types'

export type LcsEvent =
  | 'init'
  | 'compare'
  | 'diagonal'
  | 'elseWrite'
  | 'reconstructStart'
  | 'match'
  | 'up'
  | 'left'
  | 'done'

export const LCS_EVENTS: LcsEvent[] = [
  'init',
  'compare',
  'diagonal',
  'elseWrite',
  'reconstructStart',
  'match',
  'up',
  'left',
  'done',
]

/** Classify an LCS frame by its teaching message (independent of codeRefs). */
export function classifyLcsMessage(msg: string): LcsEvent | null {
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

const n = (s: string) => s.replace(/\s+/g, '').replace(/!/g, '')

type Lang = 'ts' | 'pseudo'
const langOf = (doc: CodeDocument): Lang => (doc.language === 'pseudocode' ? 'pseudo' : 'ts')

/** Statement predicates (normalized: whitespace and TS non-null `!` removed). */
const STMT: Record<Lang, Record<LcsEvent, RegExp>> = {
  ts: {
    init: /^for\(leti=0;i<=m;i\+\+\)dp\[i\]\[0\]=0;?$/,
    compare: /^if\(X\[i-1\]===Y\[j-1\]\)\{$/,
    diagonal: /^dp\[i\]\[j\]=dp\[i-1\]\[j-1\]\+1;?$/,
    elseWrite: /^dp\[i\]\[j\]=Math\.max\(dp\[i-1\]\[j\],dp\[i\]\[j-1\]\);?$/,
    reconstructStart: /^leti=m;?$/,
    match: /^chars\.push\(X\[i-1\]\);?$/,
    up: /^i--;?$/,
    left: /^j--;?$/,
    done: /^return\{length:dp\[m\]\[n\],sequence:chars\.reverse\(\)/,
  },
  pseudo: {
    init: /^fori←0\.\.m:dp\[i\]\[0\]←0$/,
    compare: /^ifX\[i-1\]=Y\[j-1\]:$/,
    diagonal: /^dp\[i\]\[j\]←dp\[i-1\]\[j-1\]\+1$/,
    elseWrite: /^dp\[i\]\[j\]←max\(dp\[i-1\]\[j\],dp\[i\]\[j-1\]\)$/,
    reconstructStart: /^i←m;j←n;S←\[\]$/,
    match: /^appendX\[i-1\]toS$/,
    up: /^i←i-1$/,
    left: /^j←j-1$/,
    done: /^return\(dp\[m\]\[n\],reverse\(S\)\)$/,
  },
}

/** Required chain of enclosing control-flow headers (innermost first), normalized regexes. */
const ENCLOSING: Record<Lang, Partial<Record<LcsEvent, RegExp[]>>> = {
  ts: {
    compare: [/^for\(letj=1;j<=n;j\+\+\)\{$/],
    diagonal: [/^if\(X\[i-1\]===Y\[j-1\]\)\{$/, /^for\(letj=1/],
    elseWrite: [/^\}else\{$/, /^for\(letj=1/],
    match: [/^if\(X\[i-1\]===Y\[j-1\]\)\{$/, /^while\(i>0&&j>0\)\{$/],
    up: [/^\}elseif\(dp\[i-1\]\[j\]>=dp\[i\]\[j-1\]\)\{$/, /^while\(i>0&&j>0\)\{$/],
    left: [/^\}else\{$/, /^while\(i>0&&j>0\)\{$/],
  },
  pseudo: {
    compare: [/^forj←1\.\.n:$/],
    diagonal: [/^ifX\[i-1\]=Y\[j-1\]:$/, /^forj←1/],
    elseWrite: [/^else:$/, /^forj←1/],
    match: [/^ifX\[i-1\]=Y\[j-1\]:$/, /^whilei>0andj>0:$/],
    up: [/^elseifdp\[i-1\]\[j\]≥dp\[i\]\[j-1\]:/, /^whilei>0andj>0:$/],
    left: [/^else:$/, /^whilei>0andj>0:$/],
  },
}

/** The `else` of the backtrack must follow the tie-break test (≥ → up), as in src/algorithms/lcs.ts. */
const TIE_BRANCH: Record<Lang, RegExp> = {
  ts: /^\}elseif\(dp\[i-1\]\[j\]>=dp\[i\]\[j-1\]\)\{$/,
  pseudo: /^elseifdp\[i-1\]\[j\]≥dp\[i\]\[j-1\]:/,
}

/** Lines that must be weakly highlighted with the exec line (condition / context). */
const WEAK: Record<Lang, Partial<Record<LcsEvent, RegExp>>> = {
  ts: { diagonal: STMT.ts.compare, elseWrite: STMT.ts.compare, up: TIE_BRANCH.ts },
  pseudo: { diagonal: STMT.pseudo.compare, elseWrite: STMT.pseudo.compare, up: TIE_BRANCH.pseudo },
}

const indent = (s: string) => (s.match(/^\s*/)?.[0].length ?? 0)

/** 1-based line numbers of enclosing headers (innermost first). */
export function enclosingHeaders(lines: string[], line1: number): number[] {
  const out: number[] = []
  let cur = indent(lines[line1 - 1] ?? '')
  for (let k = line1 - 2; k >= 0; k--) {
    const l = lines[k]!
    if (!l.trim()) continue
    const d = indent(l)
    if (d < cur) {
      out.push(k + 1)
      cur = d
    }
  }
  return out
}

export interface ShownExec {
  /** 1-based exec line the UI/anchor reports, or null/0/NaN when none */
  execLine: number | null
  /** document id the UI header claims (`@docId:line`), when available */
  headerDocId?: string | null
  /** line part of the header (`:12` → "12", `:—` → "—"), when available */
  headerLine?: string | null
  /** text of the highlighted DOM line, when available */
  domText?: string | null
  /** 1-based lines carrying the weak (context/condition) highlight, when available */
  weakLines?: number[]
  /** texts of the weakly highlighted lines (when line numbers are not exposed, e.g. CodeMirror) */
  weakTexts?: string[]
}

/**
 * The gap detector. Returns [] when the shown location is a valid, in-range line of `doc`
 * whose statement performs `event`; otherwise human-readable failures.
 */
export function lcsExecFailures(doc: CodeDocument, event: LcsEvent | null, shown: ShownExec): string[] {
  const f: string[] = []
  const lang = langOf(doc)
  const lines = doc.source.split('\n')
  if (!event) return [`unclassified LCS frame (cannot judge ${doc.documentId})`]
  if (shown.headerLine !== undefined && shown.headerLine !== null && !/^\d+$/.test(shown.headerLine)) {
    f.push(`${doc.documentId}: header shows no exec line (":${shown.headerLine}")`)
  }
  if (shown.headerDocId !== undefined && shown.headerDocId !== doc.documentId) {
    f.push(`header doc "${shown.headerDocId}" is not the shown doc "${doc.documentId}"`)
  }
  const L = shown.execLine
  if (L == null || !Number.isInteger(L) || L <= 0) {
    f.push(`${doc.documentId}: no execution line for ${event} (data-exec-line="${L ?? ''}")`)
    return f
  }
  if (L > lines.length) {
    f.push(`${doc.documentId}: exec line ${L} outside document (1..${lines.length})`)
    return f
  }
  if (shown.headerLine && /^\d+$/.test(shown.headerLine) && Number(shown.headerLine) !== L) {
    f.push(`header line ${shown.headerLine} ≠ exec line ${L}`)
  }
  const text = lines[L - 1]!
  if (shown.domText !== undefined && shown.domText !== null && n(shown.domText) !== n(text)) {
    f.push(`highlighted DOM text "${shown.domText}" ≠ ${doc.documentId}:${L} "${text.trim()}"`)
  }
  if (!STMT[lang][event].test(n(text))) {
    f.push(`${doc.documentId}:${L} "${text.trim()}" is not the ${event} statement`)
  }
  const chain = ENCLOSING[lang][event]
  if (chain) {
    const heads = enclosingHeaders(lines, L)
    chain.forEach((re, i) => {
      const h = heads[i]
      if (!h || !re.test(n(lines[h - 1]!))) {
        f.push(`${doc.documentId}:${L} ${event}: enclosing header #${i + 1} is "${h ? lines[h - 1]!.trim() : '(none)'}", expected ${re}`)
      }
    })
    if (event === 'left') {
      // the `else` must be the alternative of the tie-break test
      const elseLine = heads[0]
      const prevBranch = elseLine
        ? [...lines.slice(0, elseLine - 1).entries()].reverse().find(([, l]) => l.trim() && indent(l) === indent(lines[elseLine - 1]!))
        : undefined
      if (!prevBranch || !TIE_BRANCH[lang].test(n(prevBranch[1]))) {
        f.push(`${doc.documentId}:${L} left: the else does not follow the tie-break test`)
      }
    }
  }
  const weak = WEAK[lang][event]
  if (weak && (shown.weakLines || shown.weakTexts)) {
    const texts = [...(shown.weakLines ?? []).map((w) => lines[w - 1] ?? ''), ...(shown.weakTexts ?? [])]
    if (!texts.some((t) => weak.test(n(t)))) {
      f.push(`${doc.documentId}: ${event} lacks its weak condition line ${weak} (weak: ${JSON.stringify(texts.map((t) => t.trim()))})`)
    }
  }
  return f
}
