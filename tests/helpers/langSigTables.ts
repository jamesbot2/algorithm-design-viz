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
import * as dijkstraAlgo from '../../src/algorithms/dijkstra'
import * as dijkstraHeapAlgo from '../../src/algorithms/dijkstraHeap'
import * as bfsAlgo from '../../src/algorithms/bfs'
import * as kruskalAlgo from '../../src/algorithms/kruskal'
import * as primAlgo from '../../src/algorithms/prim'
import * as bellmanAlgo from '../../src/algorithms/bellmanFord'
import * as K from '../../src/algorithms/knapsack'

/** the page's default trace (registry solve with default input) */
export const defaultTrace = (id: string) => ({ name: 'default', steps: getAlgo(id as never)!.solve!({} as never).trace.steps as Step[] })
const PUSH = '(push|append|add|push_back)'
/** graph arc target / weight / current vertex across the six documents */
const GV = '(v|e\\.V|a\\.v\\(\\))'
const GW = '(w|e\\.W|a\\.w\\(\\))'
const CU = '(cur\\.u|cu|cur_u|cur\\.u\\(\\))'
const RET_DP = /^(return)?(\{dist,parent\}|\(?dist,parent\)?|newResult\(dist,parent\));?$/

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
  /** distinct primary anchors the default trace must use (default 3) */
  minPrimaries?: number
  /** why minPrimaries is lowered (reported as degraded) */
  coarseTraceNote?: string
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
        call: /(functiondfs\(|defdfs\(|fndfs\(|voiddfs\(|dfs=\[&\]\(|dfs=func\()/,
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
  dijkstra: {
    algoId: 'dijkstra',
    sig: {
      anchors: {
        init: /^dist\[start\]=0(\.0)?;?$/,
        selectMin: /^if\(?(!|not)done\[i\](&&|and)dist\[i\]<best\)?/,
        'relax.condition': new RegExp(`^if\\(?dist\\[u\\]\\+${GW}<dist\\[${GV}\\]\\)?`),
        'relax.update': new RegExp(`^dist\\[${GV}\\]=dist\\[u\\]\\+${GW};?$`),
        done: RET_DP,
        return: RET_DP,
      },
    },
    traces: () => [
      defaultTrace('dijkstra'),
      { name: 'unreachable', steps: dijkstraAlgo.generateSteps([], [[0, 1, 5]], 3, 0) },
      { name: 'single', steps: dijkstraAlgo.generateSteps([], [], 1, 0) },
      { name: 'ties', steps: dijkstraAlgo.generateSteps([], [[0, 1, 1], [1, 2, 1], [0, 2, 2], [2, 3, 0]], 4, 0) },
    ],
  },
  dijkstraHeap: {
    algoId: 'dijkstraHeap',
    sig: {
      anchors: {
        init: /^dist\[start\]=0(\.0)?;?$/,
        extract: /(cur|cu,cd\)|cur_u,cur_d):?=pop\(/,
        stale: new RegExp(`^if\\(?(cur\\.d|cd|cur_d|cur\\.d\\(\\))!==?dist\\[${CU}\\]\\)?.*continue`),
        relax: new RegExp(`^if\\(?dist\\[${CU}\\]\\+${GW}<dist\\[${GV}\\]\\)?`),
        done: RET_DP,
        return: RET_DP,
      },
    },
    traces: () => [
      defaultTrace('dijkstraHeap'),
      { name: 'unreachable', steps: dijkstraHeapAlgo.generateSteps([], [[0, 1, 5]], 3, 0) },
      { name: 'stale', steps: dijkstraHeapAlgo.generateSteps([], [[0, 1, 10], [0, 2, 1], [2, 1, 1], [1, 3, 1], [2, 3, 10]], 4, 0) },
    ],
  },
  bfs: {
    algoId: 'bfs',
    sig: {
      anchors: {
        init: /q.*(=|\{).*start/,
        dequeue: /u:?=q(\[head(\+\+)?\]|\.get\(head\+\+\))/,
        visit: /^if\(?dist\[v\]<0\)?/,
        enqueue: /^(q\.push\(v\)|q\.append\(v\)|q\.push_back\(v\)|q\.add\(v\)|q=append\(q,v\));?$/,
        done: RET_DP,
      },
    },
    traces: () => [
      defaultTrace('bfs'),
      { name: 'isolated', steps: bfsAlgo.generateSteps([], { 0: [1], 1: [0], 2: [] }, 0) },
      { name: 'single', steps: bfsAlgo.generateSteps([], { 0: [] }, 0) },
    ],
  },
  kruskal: {
    algoId: 'kruskal',
    sig: {
      anchors: {
        sort: /sort.*(\.w|\.W|Edge::w)/,
        find: /a:?=find\((&mut)?(parent,)?e\.(u|U|u\(\))\)/,
        skip: /^if\(?a===?b\)?(:|\{)?continue/,
        union: /^parent\[a\]=b;?$/,
        done: /^(return)?(\{total,mst\}|\(?total,mst\)?|newResult\(total,mst\));?$/,
      },
    },
    traces: () => [
      defaultTrace('kruskal'),
      { name: 'one edge', steps: kruskalAlgo.generateSteps([], [[0, 1, 1]], 2) },
      { name: 'triangle ties', steps: kruskalAlgo.generateSteps([], [[0, 1, 4], [1, 2, 4], [0, 2, 4]], 3) },
    ],
  },
  prim: {
    algoId: 'prim',
    sig: {
      anchors: {
        init: /^key\[start\]=0(\.0)?;?$/,
        selectMin: /^if\(?(!|not)(inMst|in_mst)\[i\](&&|and)key\[i\]<best\)?/,
        add: /^(inMst|in_mst)\[u\]=(true|True);?$/,
        relax: new RegExp(`^if\\(?(!|not)(inMst|in_mst)\\[${GV}\\](&&|and)${GW}<key\\[${GV}\\]\\)?`),
        update: new RegExp(`^key\\[${GV}\\]=${GW};?parent\\[${GV}\\]=u(asi64)?;?$`),
        done: /^(return)?(\{total,parent\}|\(?total,parent\)?|newResult\(total,parent\));?$/,
      },
    },
    traces: () => [
      defaultTrace('prim'),
      { name: 'start=4', steps: primAlgo.generateSteps([], primAlgo.meta.defaultEdges, primAlgo.meta.defaultN, 4) },
      { name: 'two nodes', steps: primAlgo.generateSteps([], [[0, 1, 1]], 2, 0) },
    ],
  },
  bellmanFord: {
    algoId: 'bellmanFord',
    sig: {
      anchors: {
        init: /^dist\[start\]=0(\.0)?;?$/,
        round: /^for.*(i|_).*n-1|^for.*n\.saturating_sub\(1\)/,
        relax: /^if\(?dist\[e\.(u|U|u\(\))\]\+e\.(w|W|w\(\))<dist\[e\.(v|V|v\(\))\]\)?/,
        update: /^dist\[e\.(v|V|v\(\))\]=dist\[e\.(u|U|u\(\))\]\+e\.(w|W|w\(\));?$/,
        negCycle: /^neg_?[cC]ycle=(true|True);?$/,
        done: /^(return\{|return|\(|returnnewResult\()dist,parent,neg_?[cC]ycle/,
      },
    },
    traces: () => [
      defaultTrace('bellmanFord'),
      { name: 'negative cycle', steps: bellmanAlgo.generateSteps([], [[0, 1, 1], [1, 2, -1], [2, 1, -1]], 3, 0) },
      { name: 'unreachable', steps: bellmanAlgo.generateSteps([], [[0, 1, 1]], 3, 0) },
    ],
  },
  'knapsack/dp1dCorrect': {
    algoId: 'knapsack.dp1dCorrect',
    sig: {
      anchors: {
        init: /dp.*(W|cap)\+1/,
        reverse: /^for.*w.*(W|cap).*(w>=wt|w--|\.rev\(\)|,-1\))/,
        update: /^dp\[w\]=(?=.*max)(?=.*dp\[w-wt\]\+val)/,
        done: /^(return)?dp\[(W|cap)\];?$/,
      },
    },
    traces: () => [K.DEFAULT_INSTANCE, K.FORWARD_UPDATE_COUNTEREXAMPLE, K.GREEDY_COUNTEREXAMPLE].map((i, k) => ({ name: `inst${k}`, steps: K.solveDp1dCorrect(i).steps })),
  },
  'knapsack/dp1dWrong': {
    algoId: 'knapsack.dp1dWrong',
    sig: {
      anchors: {
        init: /dp.*(W|cap)\+1/,
        forward: /^for.*w.*wt.*(w<=(W|cap)|w\+\+|(W|cap)\+1\)|\.\.=cap)/,
        update: /^dp\[w\]=(?=.*max)(?=.*dp\[w-wt\]\+val)/,
        done: /^(return)?dp\[(W|cap)\];?$/,
      },
    },
    traces: () => [K.FORWARD_UPDATE_COUNTEREXAMPLE, K.DEFAULT_INSTANCE].map((i, k) => ({ name: `inst${k}`, steps: K.solveDp1dWrongForward(i).steps })),
  },
  'knapsack/brute': {
    algoId: 'knapsack.brute',
    sig: {
      anchors: {
        enum: /^for.*mask.*total/,
        sum: /^wt\+=weights\[i\];?$/,
        feasible: /^if\(?wt<=(W|cap)(&&|and)val>best\)?.*best=val/,
        done: ret('best'),
      },
    },
    traces: () => [K.DEFAULT_INSTANCE, K.GREEDY_COUNTEREXAMPLE].map((i, k) => ({ name: `inst${k}`, steps: K.bruteForceKnapsack(i).steps ?? [] })),
  },
  'knapsack/backtracking': {
    algoId: 'knapsack.backtracking',
    sig: {
      anchors: {
        call: /(functiondfs\(|defdfs\(|fndfs\(|voiddfs\(|dfs=\[&\]\(|dfs=func\()/,
        best: /^if\(?cur>\*?best\)?.*\*?best=cur/,
        skip: /^dfs\(i\+1,(remW|rem_w),cur(,.*)?\);?$/,
        take: /^dfs\(i\+1,(remW|rem_w)-weights\[i\],cur\+values\[i\](,.*)?\);?$/,
      },
    },
    traces: () => [K.DEFAULT_INSTANCE, K.GREEDY_COUNTEREXAMPLE].map((i, k) => ({ name: `inst${k}`, steps: K.solveBacktracking(i).steps })),
    minPrimaries: 2,
    coarseTraceNote: 'teaching-unit trace is summary-level: 2 frames (call → best); skip/take anchors exist in every language but no frame uses them',
  },
  'knapsack/branchAndBound': {
    algoId: 'knapsack.branchAndBound',
    sig: {
      anchors: {
        bound: /(functionbound\(|defbound\(|fnbound\(|doublebound\(|bound=\[&\]\(|bound:?=func\()/,
        prune: /^if\(?bound\((c,)?i,(remW|rem_w),cur\)<=.*best.*return/,
        take: /^if\(?(c\.)?weights\[idx\]<=(remW|rem_w)\)?.*dfs\((c,)?i\+1,(remW|rem_w)-(c\.)?weights\[idx\],cur\+(c\.)?values\[idx\]\)/,
        skip: /^dfs\((c,)?i\+1,(remW|rem_w),cur\);?$/,
      },
    },
    traces: () => [K.DEFAULT_INSTANCE, K.GREEDY_COUNTEREXAMPLE].map((i, k) => ({ name: `inst${k}`, steps: K.solveBranchAndBound(i).steps })),
    minPrimaries: 1,
    coarseTraceNote: 'teaching-unit trace is summary-level: 2 frames, both on the bound function; prune/take/skip anchors exist in every language but no frame uses them',
  },
  'knapsack/greedy': {
    algoId: 'knapsack.greedy',
    sig: {
      anchors: {
        sort: /(sort|sorted).*(density|values\[.\]\/weights\[.\])|values\[b\]\/weights\[b\]-values\[a\]\/weights\[a\]/,
        check: /^if\(?weights\[i\]<=rem\)?/,
        pick: new RegExp(`${PUSH}\\((selected,)?i\\)`),
        done: /^(return)?(\{value,selected\}|\(?value,selected\)?|newResult\(value,selected\));?$/,
      },
      // TS splits the sort comparator onto its own continuation line; the others sort in one statement
      depthExempt: ['sort'],
    },
    traces: () => [K.GREEDY_COUNTEREXAMPLE, K.DEFAULT_INSTANCE].map((i, k) => ({ name: `inst${k}`, steps: K.greedyByDensity(i).steps })),
  },
}
