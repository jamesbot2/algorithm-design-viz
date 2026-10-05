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
}
