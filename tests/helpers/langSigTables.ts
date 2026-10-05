/**
 * V28 Phase 3: statement signatures (tests/helpers/langSignatures.ts) and test traces for every
 * algorithm that gained Python / C++ / Java / Rust / Go documents in Phase 3.
 *
 * Signatures run on the whitespace-free text of an anchor's range; identifiers follow each
 * document's own naming (L/R or lo/hi in Rust, camelCase or snake_case), so alternatives are
 * spelled out. A signature states the statement's MEANING (what is compared / written / returned).
 */
import type { Step } from '../../src/types/step'
import type { AlgoSig } from './langSignatures'
import * as bubbleAlgo from '../../src/algorithms/bubbleSort'
import * as insertionAlgo from '../../src/algorithms/insertionSort'
import * as mergeAlgo from '../../src/algorithms/mergeSort'
import * as quickAlgo from '../../src/algorithms/quickSort'
import * as binarySearchAlgo from '../../src/algorithms/binarySearch'
import * as kadaneAlgo from '../../src/algorithms/kadane'
import * as maxSubDcAlgo from '../../src/algorithms/maxSubarrayDC'
import * as nQueensAlgo from '../../src/algorithms/nQueens'
import * as editAlgo from '../../src/algorithms/editDistance'
import * as mcAlgo from '../../src/algorithms/matrixChain'
import * as huffmanAlgo from '../../src/algorithms/huffman'
import * as activityAlgo from '../../src/algorithms/activitySelection'
import * as knapsack01Algo from '../../src/algorithms/knapsack01'
import { getAlgo } from '../../src/algorithms/registry'

/** the page's default trace (registry solve with default input) */
export const defaultTrace = (id: string) => ({ name: 'default', steps: getAlgo(id as never)!.solve!({} as never).trace.steps as Step[] })
const PUSH = '(push|append|add|push_back)'

/** `return x` / Rust tail expression `x` */
export const ret = (x: string) => new RegExp(`^(return)?${x};?$`)
const LO = '(L|lo)'
const HI = '(R|hi)'
const US = '(asusize)?'
const ST = '(_?[sS]tart)'

export interface P3Algo {
  /** catalog id used by the page (getCatalog / availableLanguages / loadAlgoLanguages) */
  algoId: string
  sig: AlgoSig
  /** default trace first, then small/edge inputs */
  traces: () => { name: string; steps: Step[] }[]
}

const SORT_DEFAULT = [5, 2, 8, 1, 9, 3, 7]
const sortTraces = (gen: (a: number[]) => Step[]) => () =>
  [SORT_DEFAULT, [2, 1], [1], [3, 3, 1], [1, 2, 3]].map((a) => ({ name: `[${a}]`, steps: gen(a) }))

const KADANE_DEFAULT = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

export const P3: Record<string, P3Algo> = {
  bubbleSort: {
    algoId: 'bubbleSort',
    sig: {
      anchors: {
        init: /^for(\((let|int))?i(=|:=|in)0?/,
        compare: /^if\(?arr\[j\]>arr\[j\+1\]\)?/,
        swap: /^(constt=arr\[j\]|intt=arr\[j\]|arr\[j\],arr\[j\+1\]=arr\[j\+1\],arr\[j\]|arr\.swap\(j,j\+1\))/,
        done: ret('arr'),
        return: ret('arr'),
      },
    },
    traces: sortTraces(bubbleAlgo.generateSteps as never),
  },
  insertionSort: {
    algoId: 'insertionSort',
    sig: {
      anchors: {
        outer: /key:?=arr\[i\];?$/,
        shift: /^arr\[\(?j\+1\)?(asusize)?\]=arr\[j(asusize)?\];?$/,
        insert: /^arr\[\(?j\+1\)?(asusize)?\]=key;?$/,
        done: ret('arr'),
        return: ret('arr'),
      },
    },
    traces: sortTraces(insertionAlgo.generateSteps as never),
  },
  mergeSort: {
    algoId: 'mergeSort',
    sig: {
      anchors: {
        done: ret('arr'),
        return: new RegExp(`^if\\(?${LO}>=${HI}\\)?:?\\{?return`),
        divide: new RegExp(`mid:?=(Math\\.floor\\()?\\(${LO}\\+${HI}\\)\\/\\/?2`),
        recurse: new RegExp(`^(sort|sortRange)\\(a,${LO},mid\\);?(sort|sortRange)\\(a,mid\\+1,${HI}\\);?$`),
        mergeSlice: new RegExp(`left.*${LO}.*mid\\+1.*right.*mid\\+1.*${HI}\\+1`),
        mergeCompare: /^if\(?left\[i\]<=right\[j\]\)?/,
        mergeWriteLeft: /^a\[k\]=left\[i\];?$/,
        mergeWriteRight: /^a\[k\]=right\[j\];?$/,
        mergeCopyLeft: /^a\[k\]=left\[i\];?$/,
        mergeCopyRight: /^a\[k\]=right\[j\];?$/,
      },
    },
    traces: sortTraces(mergeAlgo.generateSteps as never),
  },
  quickSort: {
    algoId: 'quickSort',
    sig: {
      anchors: {
        done: ret('arr'),
        return: ret('arr'),
        baseCase: new RegExp(`^if\\(?${LO}>=${HI}\\)?:?\\{?return`),
        recurse: new RegExp(`p:?=partition\\(arr,${LO},${HI}\\);?qs\\(arr,${LO},p-1\\);?qs\\(arr,p\\+1,${HI}\\);?$`),
        partition: new RegExp(`pivot:?=arr\\[${HI}${US}\\]`),
        compare: new RegExp(`^if\\(?arr\\[j${US}\\]<=pivot\\)?`),
        loopSwap: /^i(\+\+|\+=1);?.*(swap\(arr\[i\],arr\[j\]\)|swap\(iasusize,jasusize\)|t=arr\[i\];arr\[i\]=arr\[j\];arr\[j\]=t|arr\[i\],arr\[j\]=arr\[j\],arr\[i\])/,
        swap: /^i(\+\+|\+=1);?.*(swap\(arr\[i\],arr\[j\]\)|swap\(iasusize,jasusize\)|t=arr\[i\];arr\[i\]=arr\[j\];arr\[j\]=t|arr\[i\],arr\[j\]=arr\[j\],arr\[i\])/,
        pivotPlace: new RegExp(`^.*p:?=i\\+1;?.*(swap\\(arr\\[p\\],arr\\[${HI}\\]\\)|swap\\(pasusize,hiasusize\\)|t=arr\\[p\\];arr\\[p\\]=arr\\[${HI}\\];arr\\[${HI}\\]=t|arr\\[p\\],arr\\[${HI}\\]=arr\\[${HI}\\],arr\\[p\\])`),
      },
    },
    traces: sortTraces(quickAlgo.generateSteps as never),
  },
  binarySearch: {
    algoId: 'binarySearch',
    sig: {
      anchors: {
        init: /lo(:isize)?:?=0.*hi(:isize)?:?=.*-1.*candidate(:isize)?:?=-1/,
        mid: /mid:?=lo\+\(\(hi-lo\)>>1\)/,
        equal: /^if\(?a\[mid(asusize)?\]===?target\)?.*candidate=mid.*hi=mid-1/,
        less: /^(\}?elseif|elif)\(?a\[mid(asusize)?\]<target\)?.*lo=mid\+1/,
        greater: /^(\}?else\{?|else:)hi=mid-1;?$/,
        found: ret('candidate'),
        miss: ret('candidate'),
      },
    },
    traces: () => [
      { name: 'default', steps: binarySearchAlgo.generateSteps([1, 2, 3, 5, 7, 8, 9], 7, 'requireSorted') },
      { name: 'miss', steps: binarySearchAlgo.generateSteps([1, 3], 2, 'requireSorted') },
      { name: 'duplicates', steps: binarySearchAlgo.generateSteps([1, 2, 2, 2, 3], 2, 'requireSorted') },
      { name: 'single', steps: binarySearchAlgo.generateSteps([4], 4, 'requireSorted') },
    ],
  },
  kadane: {
    algoId: 'kadane',
    sig: {
      anchors: {
        emptyInput: /^if\(?(a\.length===?0|nota|a\.empty\(\)|a\.is_empty\(\)|len\(a\)==0)\)?(:|\{)?return(null|None|std::nullopt|nil)/,
        init: new RegExp(`best:?=a\\[0\\].*cur:?=a\\[0\\].*best${ST}:?=0.*best(_?[eE]nd):?=0.*cur${ST}:?=0`),
        loopVisit: /^for.*i.*1.*(a\.length|len\(a\)|a\.size\(\)|a\.len\(\))/,
        chooseCond: /^if\(?cur\+a\[i\]<a\[i\]\)?/,
        resetWrite: new RegExp(`^cur=a\\[i\\];?cur${ST}=i;?$`),
        extendWrite: /^cur=cur\+a\[i\];?$/,
        bestCond: /^if\(?cur>best\)?/,
        updateBest: new RegExp(`^best=cur;?best${ST}=cur${ST};?best(_?[eE]nd)=i;?$`),
        done: /best.*best_?[sS]tart.*best_?[eE]nd/,
      },
    },
    traces: () => [KADANE_DEFAULT, [], [5], [-3, -1, -2], [2, -1, 2]].map((a) => ({ name: `[${a}]`, steps: kadaneAlgo.generateSteps(a) })),
  },
  maxSubarrayDC: {
    algoId: 'maxSubarrayDC',
    sig: {
      anchors: {
        base: /^if\(?lo===?hi\)?(:|\{)?returna\[lo\]/,
        divide: /mid:?=\(lo\+hi\)>>1/,
        cross: /cross:?=crossing\((a,)?lo,mid,hi\)/,
        combine: /max\(.*left.*right.*cross|left\.max\(right\)\.max\(cross\)/,
        empty: /^if\(?(a\.length===?0|nota|a\.empty\(\)|a\.is_empty\(\)|len\(a\)==0)\)?(:|\{)?return0/,
        done: /^(return)?solve\((a,)?0,(a\.length|len\(a\)|static_cast<int>\(a\.size\(\)\)|a\.len\(\))-1\)/,
      },
    },
    traces: () => [KADANE_DEFAULT, [3], [1, -2], [-1, -2, -3]].map((a) => ({ name: `[${a}]`, steps: maxSubDcAlgo.generateSteps(a) })),
  },
  nQueens: {
    algoId: 'nQueens',
    sig: {
      anchors: {
        conflict: /^if\(?c===?col(\|\||or).*(abs\(c-col\)|\(c-col\)\.abs\(\)).*===?\(?row-r\)?(asi32)?.*return(false|False)/,
        call: /dfs.*\(.*row/,
        solution: new RegExp(`${PUSH}\\(cols(\\.slice\\(\\)|\\[:\\]|\\.clone\\(\\))?\\)|append\\(solutions,append\\(\\[\\]int\\(nil\\),cols\\.\\.\\.\\)\\)`),
        place: /^cols\[row\]=col;?$/,
        recurse: /^dfs\(row\+1(,.*)?\);?$/,
        backtrack: /^cols\[row\]=-1;?$/,
        done: /^(return)?(s\.)?solutions;?$/,
        return: /^(return)?(s\.)?solutions;?$/,
      },
    },
    traces: () => [defaultTrace('nQueens'), ...[1, 2, 3].map((n) => ({ name: `n=${n}`, steps: nQueensAlgo.generateSteps([], n, 'all') }))],
  },
  editDistance: {
    algoId: 'editDistance',
    sig: {
      anchors: {
        init: /dp\[i\]\[0\]=i/,
        equal: /^if\(?(a\[i-1\]===?b\[j-1\]|a\.charAt\(i-1\)==b\.charAt\(j-1\)|ra\[i-1\]==rb\[j-1\])\)?.*dp\[i\]\[j\]=dp\[i-1\]\[j-1\]/,
        replace: /^dp\[i\]\[j\]=1\+(?=.*min)(?=.*dp\[i-1\]\[j\])(?=.*dp\[i\]\[j-1\])(?=.*dp\[i-1\]\[j-1\])/,
        done: /^(return)?dp\[m\]\[n\];?$/,
        return: /^(return)?dp\[m\]\[n\];?$/,
      },
    },
    traces: () => [defaultTrace('editDistance'), ...([['', 'ab'], ['a', 'a'], ['ab', 'ba']] as const).map(([a, b]) => ({ name: `${a}/${b}`, steps: editAlgo.generateSteps([], a, b) }))],
  },
  matrixChain: {
    algoId: 'matrixChain',
    sig: {
      anchors: {
        init: /^(?=.*dp(:|=|\(|\[|:=))(?=.*split)/,
        lenLoop: /^for\(?(let|int)?(len|length)(=|:=|in)(range\()?2/,
        trySplit: /^for\(?(let|int)?k(=|:=|in)(i|range\(i)/,
        cost: /cost:?=dp\[i\]\[k\]\+dp\[k\+1\]\[j\]\+dims\[i\]\*dims\[k\+1\]\*dims\[j\+1\]/,
        update: /^if\(?cost<dp\[i\]\[j\]\)?/,
        done: /dp\[0\]\[n-1\]/,
      },
    },
    traces: () => [defaultTrace('matrixChain'), ...[[5, 10], [10, 20, 30], [40, 20, 30, 10, 30]].map((d) => ({ name: `[${d}]`, steps: mcAlgo.generateSteps([], d) }))],
  },
  huffman: {
    algoId: 'huffman',
    sig: {
      anchors: {
        init: /^(?=.*nodes)(?=.*symbols)(?=.*freq)/,
        sort: /^(nodes\.sort|std::stable_sort\(nodes|sort\.SliceStable\(nodes).*freq/i,
        merge: new RegExp(`${PUSH}\\(.*(a\\.|a->)freq\\+(b\\.|b->)freq.*a.*b`, 'i'),
        done: /^(return)?(nodes\[0\]|nodes\.get\(0\)|nodes\.pop\(\));?$/,
      },
    },
    traces: () => [
      defaultTrace('huffman'),
      ...([[['a'], [3]], [['a', 'b'], [1, 2]], [['a', 'b', 'c', 'd'], [1, 1, 1, 1]], [[], []]] as [string[], number[]][]).map(([s, f]) => ({ name: `${s}`, steps: huffmanAlgo.generateSteps([], s, f) })),
    ],
  },
  activitySelection: {
    algoId: 'activitySelection',
    sig: {
      anchors: {
        sort: /sort.*finish/i,
        check: /^if\(?act\.(start|Start)(\(\))?>=last_?[fF]inish\)?/,
        pick: new RegExp(`${PUSH}\\(.*act\\.(id|ID)(\\(\\)|\\.clone\\(\\))?\\)`),
        done: ret('picked'),
      },
    },
    traces: () => [defaultTrace('activitySelection'), ...([[[0], [1]], [[0, 0, 0], [5, 5, 5]], [[5, 1], [6, 2]]] as [number[], number[]][]).map(([a, b]) => ({ name: `${a}/${b}`, steps: activityAlgo.generateSteps([], a, b) }))],
  },
  'knapsack/dp2d': {
    algoId: 'knapsack01',
    sig: {
      anchors: {
        init: /dp.*(W|cap)\+1/,
        fill: /^dp\[i\]\[w\]=dp\[i-1\]\[w\];?$/,
        take: /take:?=dp\[i-1\]\[w-wt\]\+val;?$/,
        takeWrite: /^if\(?take>dp\[i\]\[w\]\)?.*dp\[i\]\[w\]=take/,
        reconstruct: new RegExp(`${PUSH}\\((selected,)?i-1\\)`),
        done: /dp\[n\]\[(W|cap)\]/,
        return: /dp\[n\]\[(W|cap)\]/,
      },
    },
    traces: () => [defaultTrace('knapsack01'), ...([[[1], [1], 0], [[5], [10], 4], [[2, 2, 2], [3, 3, 3], 5]] as [number[], number[], number][]).map(([w, v, W]) => ({ name: `W=${W}`, steps: knapsack01Algo.generateSteps([], w, v, W) }))],
  },
}
