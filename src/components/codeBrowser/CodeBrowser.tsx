import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView, Decoration, gutter, GutterMarker, keymap } from '@codemirror/view'
import { Compartment, RangeSetBuilder, StateEffect, StateField, type Extension, type Range } from '@codemirror/state'
import { createScrollFollowIntent } from '../../utils/scrollFollowIntent'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search'
import type { CodeDocument, CodeLanguage, SourceRange } from '../../codeCatalog/types'
import { useLabTheme } from '../../theme/LabThemeContext'
import { useMotion } from '../../theme/MotionContext'
import { activeCatalogDoc, resolveExecRange } from './resolveExec'
import {
  availableLanguages,
  LANGUAGE_LABEL,
  LANGUAGE_SHORT,
  loadAlgoLanguages,
  peekLanguageDoc,
} from '../../codeCatalog/languages'
import { useCodeLanguage } from '../../codeCatalog/languagePreference'
import { loadLanguageSupport, peekLanguageSupport } from './languageSupport'

export type CodeBrowserDocuments = {
  typescript: CodeDocument
  pseudocode?: CodeDocument
}

interface Props {
  /**
   * V28: catalog id (e.g. 'lcs'). Enables the Python / C++ / Java / Rust / Go documents of that
   * algorithm (lazy chunk). Without it only TypeScript (+ pseudocode) is offered.
   */
  algoId?: string
  /** Preferred: full catalog docs so each tab resolves its own anchors */
  documents?: CodeBrowserDocuments
  /** @deprecated single-doc fallback */
  document?: CodeDocument
  /** Anchor id from step primary codeRef — drives exec arrow */
  execAnchorId?: string
  /** Additional weak-highlight anchor ids (context/condition) */
  contextAnchorIds?: string[]
  /** Fallback 0-based line when no anchor (legacy) */
  activeLine?: number
  /** @deprecated use documents.pseudocode */
  pseudocode?: string
  onTabChange?: (tab: 'ts' | 'pseudo') => void
  /** When true, show unmapped teaching banner instead of faking activeLine */
  unmapped?: boolean
  /**
   * V25-01: whether `activeLine` (a meta.code summary index) may stand in for a document
   * line when no anchor is given. 'forbidden' → never (see NUMERIC_LINE_FALLBACK).
   */
  numericFallback?: 'forbidden' | 'legacy-unverified'
}

class ExecMarker extends GutterMarker {
  toDOM() {
    const el = document.createElement('div')
    el.className = 'cm-exec-arrow'
    el.textContent = '▶'
    el.title = '执行位置'
    return el
  }
}

const execMarker = new ExecMarker()
const setExecLine = StateEffect.define<number | null>()
const setContextLines = StateEffect.define<number[]>()

const execLineField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setExecLine)) return e.value
    }
    return value
  },
})

const contextLinesField = StateField.define<number[]>({
  create: () => [],
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setContextLines)) return e.value
    }
    return value
  },
})

function buildExecGutter(): Extension {
  return [
    execLineField,
    contextLinesField,
    gutter({
      class: 'cm-exec-gutter',
      markers: (view) => {
        const line = view.state.field(execLineField)
        const builder = new RangeSetBuilder<GutterMarker>()
        if (line != null && line >= 1 && line <= view.state.doc.lines) {
          const pos = view.state.doc.line(line).from
          builder.add(pos, pos, execMarker)
        }
        return builder.finish()
      },
    }),
    EditorView.decorations.compute([execLineField, contextLinesField], (state) => {
      const line = state.field(execLineField)
      const ctx = state.field(contextLinesField)
      const ranges: Range<Decoration>[] = []
      if (line != null && line >= 1 && line <= state.doc.lines) {
        const info = state.doc.line(line)
        ranges.push(Decoration.line({ class: 'cm-exec-line' }).range(info.from))
      }
      for (const cl of ctx) {
        if (cl === line) continue
        if (cl >= 1 && cl <= state.doc.lines) {
          const info = state.doc.line(cl)
          ranges.push(Decoration.line({ class: 'cm-context-line' }).range(info.from))
        }
      }
      return ranges.length ? Decoration.set(ranges, true) : Decoration.none
    }),
    EditorView.theme({
      '.cm-exec-gutter': {
        width: '1.1rem',
        minWidth: '1.1rem',
      },
      '.cm-exec-arrow': {
        display: 'inline-block',
        width: '1rem',
        textAlign: 'center',
      },
      '.cm-context-line': {
        backgroundColor: 'color-mix(in srgb, var(--sem-read, #64748b) 18%, transparent)',
      },
    }),
  ]
}

/** Scroll only view.scrollDOM — the ONE real code scrollport after height-chain fix. */
function scrollLineNearest(view: EditorView, line1: number) {
  if (line1 < 1 || line1 > view.state.doc.lines) return
  const scrollDOM = view.scrollDOM
  // If scroller is unconstrained (client≈scroll), scrolling is a no-op — bail cleanly
  if (scrollDOM.clientHeight < 8) return
  const line = view.state.doc.line(line1)
  const block = view.lineBlockAt(line.from)
  const margin = 40
  const top = block.top
  const bottom = block.bottom
  const visTop = scrollDOM.scrollTop
  const visBottom = visTop + scrollDOM.clientHeight
  if (top < visTop + margin) {
    scrollDOM.scrollTop = Math.max(0, top - margin)
  } else if (bottom > visBottom - margin) {
    scrollDOM.scrollTop = Math.max(0, bottom - scrollDOM.clientHeight + margin)
  }
}

function scrollLineCenter(view: EditorView, line1: number) {
  if (line1 < 1 || line1 > view.state.doc.lines) return
  const scrollDOM = view.scrollDOM
  if (scrollDOM.clientHeight < 8) return
  const line = view.state.doc.line(line1)
  const block = view.lineBlockAt(line.from)
  scrollDOM.scrollTop = Math.max(0, block.top - scrollDOM.clientHeight / 2 + block.height / 2)
}

function scheduleScrollAfterLayout(view: EditorView, fn: () => void) {
  try {
    view.requestMeasure()
  } catch {
    /* ignore */
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(fn)
  })
}

function rangeLines(range: SourceRange | null): number[] {
  if (!range) return []
  const out: number[] = []
  for (let L = range.startLine; L <= range.endLine; L++) out.push(L)
  return out
}

export default function CodeBrowser({
  algoId,
  documents,
  document: legacyDoc,
  execAnchorId,
  contextAnchorIds = [],
  activeLine,
  pseudocode,
  onTabChange,
  unmapped = false,
  numericFallback = 'legacy-unverified',
}: Props) {
  const [tab, setTab] = useState<'ts' | 'pseudo'>('ts')
  const [fontSize, setFontSize] = useState(13)
  const [followExec, setFollowExec] = useState(true)
  const [userScrolledAway, setUserScrolledAway] = useState(false)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [lineWrap, setLineWrap] = useState(true)
  const viewRef = useRef<EditorView | null>(null)
  const pseudoPreRef = useRef<HTMLPreElement | null>(null)
  const scrollGen = useRef(0)
  const pseudoScrollCleanup = useRef<(() => void) | null>(null)
  const intentRef = useRef(createScrollFollowIntent())
  const wrapCompartment = useRef(new Compartment())
  const followExecRef = useRef(true)
  const userScrolledAwayRef = useRef(false)
  const execLine1Ref = useRef<number | null>(null)
  // V23 (brief E): per-document reading memory. Leaving a doc while in reading mode
  // (follow paused by real browsing) remembers its scrollTop; returning restores it
  // and stays in reading mode. Follow mode keeps locating the current statement.
  // V28: keyed per shown document view ('pseudo' or a code language).
  const readingMemo = useRef<Record<string, number | null>>({})
  const pendingRestore = useRef<number | null>(null)
  /** Paused-reading pin for the TS scroller (layout reflow restores to it). */
  const pinTopRef = useRef(0)
  // V28: language choice (persisted, shared) and the per-language CodeMirror grammar.
  const [prefLanguage, setPrefLanguage] = useCodeLanguage()
  const langs = useMemo(() => availableLanguages(algoId), [algoId])
  const language: CodeLanguage = langs.includes(prefLanguage) ? prefLanguage : 'typescript'
  const [loadTick, setLoadTick] = useState(0)
  const [loadFailure, setLoadError] = useState<{ lang: CodeLanguage; msg: string } | null>(null)
  const [langCompartment] = useState(() => new Compartment())
  const langRowRef = useRef<HTMLDivElement | null>(null)
  /** language whose grammar the live editor currently has */
  const cmLangRef = useRef<CodeLanguage>('typescript')
  /** last fully loaded CM document (kept on screen, covered, while the next one loads) */
  const [lastCmDoc, setLastCmDoc] = useState<CodeDocument | null>(null)
  const { theme } = useLabTheme()
  const { mode: motionMode } = useMotion()
  const reduceMotion = motionMode === 'reduced'
  followExecRef.current = followExec
  userScrolledAwayRef.current = userScrolledAway
  const codeLoadingRef = useRef(false)
  const cmDocLanguageRef = useRef<CodeLanguage>('typescript')

  const cmTheme = theme === 'lab-light' ? 'light' : 'dark'

  const docs: CodeBrowserDocuments | null = useMemo(() => {
    if (documents) return documents
    if (legacyDoc) {
      const pseudoDoc: CodeDocument | undefined =
        legacyDoc && pseudocode
          ? {
              documentId: `${legacyDoc.documentId}.pseudo-legacy`,
              language: 'pseudocode',
              title: `${legacyDoc.title}（伪代码）`,
              source: pseudocode,
              sourceHash: 'legacy',
              anchors: [], // no anchors → must not fake TS lines
            }
          : undefined
      return { typescript: legacyDoc, pseudocode: pseudoDoc }
    }
    return null
  }, [documents, legacyDoc, pseudocode])

  // V28: the document of the active language (null while its chunk/grammar is loading).
  const langDoc: CodeDocument | null = !docs
    ? null
    : language === 'typescript'
      ? docs.typescript
      : peekLanguageDoc(algoId, language)
  const langSupportReady = peekLanguageSupport(language) != null
  const langReady = !!langDoc && langSupportReady
  const showPseudoTab = tab === 'pseudo' && !!docs?.pseudocode
  const codeLoading = !!docs && !showPseudoTab && !langReady
  const loadError = loadFailure && loadFailure.lang === language ? loadFailure.msg : null
  const viewKey = showPseudoTab ? 'pseudo' : language
  useEffect(() => {
    if (!docs || langReady) return
    let alive = true
    const work: Promise<unknown>[] = [loadLanguageSupport(language)]
    if (algoId && language !== 'typescript') work.push(loadAlgoLanguages(algoId, docs.typescript.anchors))
    Promise.all(work)
      .then(() => {
        if (alive) setLoadTick((t) => t + 1)
      })
      .catch((e: unknown) => {
        if (alive) setLoadError({ lang: language, msg: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      alive = false
    }
  }, [docs, langReady, language, algoId, loadTick])
  // adjust-state-during-render: remember the last document that was fully ready
  if (langReady && langDoc && lastCmDoc !== langDoc) setLastCmDoc(langDoc)
  /** what the (single, persistent) CodeMirror instance displays */
  const cmDoc: CodeDocument | null = langReady ? langDoc : ((langReady ? langDoc : lastCmDoc) ?? docs?.typescript ?? null)
  const cmDocLanguage: CodeLanguage = langReady
    ? language
    : ((lastCmDoc?.language as CodeLanguage | undefined) ?? 'typescript')

  const activeDoc = useMemo(() => {
    if (!docs) return null
    if (showPseudoTab) return activeCatalogDoc(docs, 'pseudo')
    return langReady ? langDoc : null
  }, [docs, showPseudoTab, langReady, langDoc])

  const execRange = useMemo(() => {
    if (unmapped) return null
    return resolveExecRange(activeDoc, execAnchorId)
  }, [activeDoc, execAnchorId, unmapped])

  const execLine1 = useMemo(() => {
    if (execRange) return execRange.startLine
    // Legacy numeric fallback: TS tab, no anchor, and the module does not forbid it.
    if (
      numericFallback !== 'forbidden' &&
      tab === 'ts' &&
      language === 'typescript' &&
      langReady &&
      typeof activeLine === 'number' &&
      activeLine >= 0 &&
      !execAnchorId
    ) {
      return activeLine + 1
    }
    return null
  }, [execRange, activeLine, tab, execAnchorId, numericFallback, language, langReady])
  execLine1Ref.current = execLine1
  useLayoutEffect(() => {
    codeLoadingRef.current = codeLoading
    cmDocLanguageRef.current = cmDocLanguage
  })
  /**
   * V27: what the shown document can say about the current step.
   * preview = no step yet; unmapped = teaching event without code mapping;
   * no-location = the step has an anchor but THIS document has no statement for it.
   */
  const execState: 'preview' | 'unmapped' | 'no-location' | 'mapped' | 'loading' = unmapped
    ? 'unmapped'
    : codeLoading
      ? 'loading'
      : execLine1 != null
      ? 'mapped'
      : execAnchorId
        ? 'no-location'
        : 'preview'

  const contextLines = useMemo(() => {
    if (!activeDoc || unmapped) return [] as number[]
    const lines: number[] = []
    for (const id of contextAnchorIds) {
      const r = resolveExecRange(activeDoc, id)
      lines.push(...rangeLines(r))
    }
    // Also highlight full primary range weakly beyond start line
    if (execRange && execRange.endLine > execRange.startLine) {
      for (let L = execRange.startLine + 1; L <= execRange.endLine; L++) lines.push(L)
    }
    return [...new Set(lines)]
  }, [activeDoc, contextAnchorIds, execRange, unmapped])

  const extensions = useMemo(() => {
    const exts: Extension[] = [
      // V28: grammar via Compartment — language switches reconfigure, never remount
      langCompartment.of(peekLanguageSupport('typescript') ?? []),
      history(),
      search(),
      highlightSelectionMatches(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      buildExecGutter(),
      EditorView.editable.of(false),
      // V20-03: line wrap via Compartment — toggled without remount
      wrapCompartment.current.of(EditorView.lineWrapping),
      EditorView.domEventHandlers({
        mousedown: () => false,
      }),
    ]
    return exts
  }, [langCompartment])

  const beginScrollTxn = useCallback((kind: 'follow' | 'layout' | 'locate' = 'follow') => {
    return intentRef.current.beginTransaction(kind)
  }, [])

  /**
   * Local-only scroll for pseudo: mutate pre.scrollTop only.
   * Never window / workbench outer. No unconstrained scrollIntoView.
   */
  const scrollPseudoToLine = useCallback((line1: number, center: boolean) => {
    pseudoScrollCleanup.current?.()
    pseudoScrollCleanup.current = null
    const pre = pseudoPreRef.current
    if (!pre || line1 < 1) return
    // Inactive/hidden panel: do not force-scroll ancestors
    if (pre.closest('[hidden]')) return
    if (pre.clientHeight <= 0) return
    const el = pre.querySelector(`[data-line="${line1}"]`) as HTMLElement | null
    if (!el) return

    // V21-01: content coords relative to pre scrollport (offsetParent may be
    // .page.algo-page because pre is not positioned — offsetTop ≠ pre content Y).
    const preRect = pre.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const elTop = pre.scrollTop + (elRect.top - preRect.top)
    const elHeight = elRect.height || el.offsetHeight
    const elBottom = elTop + elHeight
    const margin = 12
    const visTop = pre.scrollTop
    const visBottom = visTop + pre.clientHeight

    let target = pre.scrollTop
    if (center) {
      target = Math.max(0, elTop - pre.clientHeight / 2 + elHeight / 2)
    } else {
      // Already fully readable in scrollport → no-op (no meaningless relocate)
      if (elTop >= visTop + margin && elBottom <= visBottom - margin) return
      if (elTop < visTop + margin) target = Math.max(0, elTop - margin)
      else target = Math.max(0, elBottom - pre.clientHeight + margin)
    }
    const maxTop = Math.max(0, pre.scrollHeight - pre.clientHeight)
    target = Math.min(Math.max(0, target), maxTop)
    if (Math.abs(target - pre.scrollTop) < 1) return

    const gen = ++scrollGen.current
    const txn = intentRef.current.beginTransaction('follow')
    // Instant scroll (honor reduced-motion — never force smooth)
    void reduceMotion
    pre.scrollTop = target
    const done = () => {
      if (scrollGen.current === gen) txn.end()
      else txn.end()
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(done))
    pseudoScrollCleanup.current = () => cancelAnimationFrame(raf)
  }, [reduceMotion])

  const canGotoExec = !unmapped && !codeLoading && execLine1 != null

  const scrollToExecCenter = useCallback(() => {
    if (!canGotoExec || execLine1 == null) return
    if (tab === 'ts') {
      const view = viewRef.current
      if (!view) return
      view.dispatch({
        effects: [setExecLine.of(execLine1), setContextLines.of(contextLines)],
      })
      const gen = ++scrollGen.current
      scheduleScrollAfterLayout(view, () => {
        if (scrollGen.current !== gen) return
        const txn = beginScrollTxn('locate')
        scrollLineCenter(view, execLine1)
        requestAnimationFrame(() => requestAnimationFrame(() => txn.end()))
      })
    } else {
      scrollPseudoToLine(execLine1, true)
    }
    setUserScrolledAway(false)
    setFollowExec(true)
  }, [canGotoExec, execLine1, tab, contextLines, beginScrollTxn, scrollPseudoToLine])

  useEffect(() => {
    if (tab === 'ts') {
      const view = viewRef.current
      if (!view) return
      view.dispatch({
        effects: [setExecLine.of(execLine1), setContextLines.of(contextLines)],
      })
      if (followExec && !userScrolledAway && execLine1 != null) {
        // Do NOT begin txn before schedule — bumps cancel via scrollGen.
        // Open layout/follow txn only inside the post-layout callback.
        const gen = ++scrollGen.current
        scheduleScrollAfterLayout(view, () => {
          if (scrollGen.current !== gen) return
          const txn = beginScrollTxn('follow')
          scrollLineNearest(view, execLine1)
          requestAnimationFrame(() => requestAnimationFrame(() => txn.end()))
        })
      }
    } else if (followExec && !userScrolledAway && execLine1 != null) {
      scrollPseudoToLine(execLine1, false)
    }
  }, [execLine1, contextLines, followExec, userScrolledAway, beginScrollTxn, tab, scrollPseudoToLine, activeDoc?.documentId])

  // V28: keep the live editor's grammar in step with the document it shows (no remount).
  useEffect(() => {
    const view = viewRef.current
    if (!view || tab !== 'ts' || cmLangRef.current === cmDocLanguage) return
    const ext = peekLanguageSupport(cmDocLanguage)
    if (!ext) return
    view.dispatch({ effects: langCompartment.reconfigure(ext) })
    cmLangRef.current = cmDocLanguage
  }, [cmDocLanguage, tab, langCompartment])

  // Clear CM viewRef when leaving TS tab so we never dispatch to destroyed editor
  // V28: runs per shown document (pseudo or a language) once that document is on screen.
  useEffect(() => {
    if (tab !== 'ts') {
      const view = viewRef.current as unknown as { __advScrollCleanup?: () => void } | null
      view?.__advScrollCleanup?.()
      viewRef.current = null
    }
    // Cancel stale pseudo scrolls on tab change
    scrollGen.current += 1
    intentRef.current.cancelAll()
    pseudoScrollCleanup.current?.()
    pseudoScrollCleanup.current = null
    // V28: the language document is still loading — keep any pending restore for when it is shown.
    if (tab === 'ts' && codeLoading) return
    // V23: returning to a doc that was in reading mode restores its reading position.
    const restoreTop = pendingRestore.current
    if (restoreTop != null) {
      pendingRestore.current = null
      const gen = scrollGen.current
      let tries = 0
      const apply = () => {
        if (scrollGen.current !== gen) return
        const el = tab === 'ts' ? viewRef.current?.scrollDOM : pseudoPreRef.current
        if ((!el || el.scrollHeight - el.clientHeight < restoreTop) && tries++ < 20) {
          requestAnimationFrame(apply)
          return
        }
        if (!el) return
        if (tab === 'ts') pinTopRef.current = restoreTop
        const txn = intentRef.current.beginTransaction('layout')
        el.scrollTop = restoreTop
        requestAnimationFrame(() => requestAnimationFrame(() => txn.end()))
      }
      requestAnimationFrame(apply)
    }
    // V21-01: remasure pseudo scrollport after tab restore (pre may layout async)
    if (tab === 'pseudo' && followExecRef.current && !userScrolledAwayRef.current) {
      const line = execLine1Ref.current
      if (line != null) {
        const gen = scrollGen.current
        const raf = requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollGen.current !== gen) return
            if (!followExecRef.current || userScrolledAwayRef.current) return
            scrollPseudoToLine(line, false)
          })
        })
        pseudoScrollCleanup.current = () => cancelAnimationFrame(raf)
      }
    }
    // V28: another language document replaced the editor's text (same editor instance):
    // while following, locate the current step in it, inside the editor's own scroller.
    if (tab === 'ts' && restoreTop == null && followExecRef.current && !userScrolledAwayRef.current) {
      const view = viewRef.current
      const line = execLine1Ref.current
      if (view && line != null) {
        const gen = scrollGen.current
        scheduleScrollAfterLayout(view, () => {
          if (scrollGen.current !== gen || viewRef.current !== view) return
          if (!followExecRef.current || userScrolledAwayRef.current) return
          const cur = execLine1Ref.current
          if (cur == null) return
          const txn = intentRef.current.beginTransaction('follow')
          scrollLineNearest(view, cur)
          requestAnimationFrame(() => requestAnimationFrame(() => txn.end()))
        })
      }
    }
  }, [viewKey, codeLoading, tab, scrollPseudoToLine])

  const onCreate = useCallback(
    (view: EditorView) => {
      viewRef.current = view
      // V28: a (re)created editor starts with the TS grammar — give it the shown doc's grammar.
      cmLangRef.current = 'typescript'
      const ext = peekLanguageSupport(cmDocLanguageRef.current)
      if (ext && cmDocLanguageRef.current !== 'typescript') {
        view.dispatch({ effects: langCompartment.reconfigure(ext) })
        cmLangRef.current = cmDocLanguageRef.current
      }
      view.dispatch({
        effects: [setExecLine.of(execLine1), setContextLines.of(contextLines)],
      })
      const scrollDOM = view.scrollDOM
      if (!scrollDOM.hasAttribute('tabindex')) scrollDOM.tabIndex = -1
      const unbind = intentRef.current.bind(scrollDOM, () => {
        if (followExecRef.current) setUserScrolledAway(true)
      })
      // V20-01 / V21-02: pin scrollTop across layout/data reflow while paused.
      // Keep updating pin on real user browse (not only pre-pause); absorb layout/follow
      // txn scrolls so restore does not overwrite the user's latest reading position.
      pinTopRef.current = scrollDOM.scrollTop
      const onScrollPin = () => {
        if (intentRef.current.isAbsorbing()) return
        pinTopRef.current = scrollDOM.scrollTop
      }
      scrollDOM.addEventListener('scroll', onScrollPin, { passive: true })
      let ro: ResizeObserver | null = null
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          if (!userScrolledAwayRef.current) return
          const txn = intentRef.current.beginTransaction('layout')
          const max = Math.max(0, scrollDOM.scrollHeight - scrollDOM.clientHeight)
          scrollDOM.scrollTop = Math.min(pinTopRef.current, max)
          requestAnimationFrame(() => requestAnimationFrame(() => txn.end()))
        })
        ro.observe(scrollDOM)
      }
      // V27: the editor is (re)created when the TS tab is shown again; while following,
      // locate the current step here — the follow effect ran before this view existed.
      if (followExecRef.current && !userScrolledAwayRef.current && execLine1Ref.current != null) {
        const gen = scrollGen.current
        scheduleScrollAfterLayout(view, () => {
          if (scrollGen.current !== gen || viewRef.current !== view) return
          if (!followExecRef.current || userScrolledAwayRef.current) return
          const line = execLine1Ref.current
          if (line == null) return
          const txn = intentRef.current.beginTransaction('follow')
          scrollLineNearest(view, line)
          requestAnimationFrame(() => requestAnimationFrame(() => txn.end()))
        })
      }
      ;(view as unknown as { __advScrollCleanup?: () => void }).__advScrollCleanup = () => {
        unbind()
        scrollDOM.removeEventListener('scroll', onScrollPin)
        ro?.disconnect()
      }
    },
    [execLine1, contextLines, langCompartment],
  )

  // V20-03: reconfigure wrap compartment — layout txn so reflow scroll ≠ user pause
  useEffect(() => {
    const view = viewRef.current
    if (!view || tab !== 'ts') return
    const txn = intentRef.current.beginTransaction('layout')
    view.dispatch({
      effects: wrapCompartment.current.reconfigure(lineWrap ? EditorView.lineWrapping : []),
    })
    // After wrap reflow, keep follow if armed; do not move if user paused
    const gen = ++scrollGen.current
    scheduleScrollAfterLayout(view, () => {
      txn.end()
      if (scrollGen.current !== gen) return
      if (!followExecRef.current || userScrolledAwayRef.current) return
      const line = execLine1Ref.current
      if (line == null) return
      const followTxn = intentRef.current.beginTransaction('follow')
      scrollLineNearest(view, line)
      requestAnimationFrame(() => requestAnimationFrame(() => followTxn.end()))
    })
  }, [lineWrap, tab])

  useEffect(() => {
    return () => {
      const view = viewRef.current as unknown as { __advScrollCleanup?: () => void } | null
      view?.__advScrollCleanup?.()
      scrollGen.current += 1
      intentRef.current.cancelAll()
      pseudoScrollCleanup.current?.()
      pseudoScrollCleanup.current = null
    }
  }, [])

  /** Remember the reading position of the document being left (reading mode only). */
  const leaveView = () => {
    const cur = tab === 'ts' ? viewRef.current?.scrollDOM : pseudoPreRef.current
    readingMemo.current[viewKey] = userScrolledAway && cur && !codeLoading ? cur.scrollTop : null
  }

  const changeTab = (t: 'ts' | 'pseudo') => {
    if (t === tab) {
      setUserScrolledAway(false)
      return
    }
    leaveView()
    const memo = readingMemo.current[t === 'pseudo' ? 'pseudo' : language] ?? null
    pendingRestore.current = memo
    setTab(t)
    onTabChange?.(t)
    setUserScrolledAway(memo != null)
  }

  /**
   * V28: show another language's document. Only the document changes: the run, cursor, speed
   * and playback state are untouched; the same semantic step is located in the new document.
   */
  const changeLanguage = (l: CodeLanguage) => {
    if (!langs.includes(l)) return
    if (tab === 'ts' && l === language) {
      setUserScrolledAway(false)
      return
    }
    leaveView()
    const memo = readingMemo.current[l] ?? null
    pendingRestore.current = memo
    setPrefLanguage(l)
    if (tab !== 'ts') {
      setTab('ts')
      onTabChange?.('ts')
    }
    setUserScrolledAway(memo != null)
  }

  // V28: language row — mark overflowing edges (CSS fades them) and keep the active pill inside
  // the row's own visible box (scrolls only the row, never the page).
  useEffect(() => {
    const row = langRowRef.current
    if (!row) return
    const update = () => {
      const max = row.scrollWidth - row.clientWidth
      const s = max > 1 && row.scrollLeft > 1
      const e = max > 1 && row.scrollLeft < max - 1
      row.dataset.ovf = s && e ? 'both' : s ? 'start' : e ? 'end' : 'none'
    }
    update()
    row.addEventListener('scroll', update, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(row)
    return () => {
      row.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [])
  useEffect(() => {
    const row = langRowRef.current
    const pill = row?.querySelector<HTMLElement>('.code-lang-pill.active')
    if (!row || !pill) return
    const left = pill.getBoundingClientRect().left - row.getBoundingClientRect().left - row.clientLeft + row.scrollLeft
    const right = left + pill.offsetWidth
    if (left < row.scrollLeft) row.scrollLeft = Math.max(0, left - 8)
    else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth + 8
  }, [language, showPseudoTab])

  const copy = async () => {
    if (!activeDoc) return
    const text = activeDoc.source
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setCopyMsg('已复制')
    } catch (err) {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        setCopyMsg(ok ? '已复制' : '复制失败：请手动选择文本')
      } catch {
        setCopyMsg(`复制失败：${err instanceof Error ? err.message : '剪贴板不可用'}`)
      }
    }
    window.setTimeout(() => setCopyMsg(null), 2000)
  }

  if (!docs || !cmDoc) {
    return <div className="code-browser muted">（无代码文档）</div>
  }

  const showPseudo = Boolean(docs.pseudocode)
  const shownLanguage = showPseudoTab ? 'pseudocode' : language
  const title = activeDoc?.title ?? `${docs.typescript.title.replace(/\s*\(TypeScript\)\s*$/, '')} (${LANGUAGE_LABEL[language]})`
  const langFallback = !showPseudoTab && prefLanguage !== language

  return (
    <div
      className="code-browser"
      data-testid="code-browser"
      data-active-doc={activeDoc?.documentId ?? ''}
      data-tab={showPseudoTab ? 'pseudo' : 'ts'}
      data-language={shownLanguage}
      data-code-loading={codeLoading ? '1' : '0'}
      data-exec-state={execState}
      onKeyDown={(e) => {
        e.stopPropagation()
      }}
    >
      <div className="code-browser-head">
        <div className="code-lang-switch" role="group" aria-label="代码语言" data-testid="code-lang-switch" ref={langRowRef} data-ovf="none">
          {langs.map((l) => {
            const on = !showPseudoTab && language === l
            return (
              <button
                key={l}
                type="button"
                className={`code-lang-pill${on ? ' active' : ''}`}
                data-testid={l === 'typescript' ? 'tab-ts' : `tab-lang-${l}`}
                data-lang={l}
                aria-pressed={on}
                title={LANGUAGE_LABEL[l]}
                onClick={() => changeLanguage(l)}
              >
                <span className="lang-full">{LANGUAGE_LABEL[l]}</span>
                <span className="lang-short" aria-hidden="true">
                  {LANGUAGE_SHORT[l]}
                </span>
                {on && codeLoading && <span className="code-lang-spinner" aria-hidden="true" />}
              </button>
            )
          })}
          {showPseudo && (
            <>
              <span className="code-lang-sep" aria-hidden="true" />
              <button
                type="button"
                className={`code-lang-pill pseudo${showPseudoTab ? ' active' : ''}`}
                data-testid="tab-pseudo"
                data-lang="pseudocode"
                aria-pressed={showPseudoTab}
                onClick={() => changeTab('pseudo')}
              >
                伪代码
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          className={`code-copy-btn${copyMsg === '已复制' ? ' copied' : ''}`}
          onClick={copy}
          title={`复制 ${showPseudoTab ? '伪代码' : LANGUAGE_LABEL[language]} 代码`}
          data-testid="code-copy-btn"
          disabled={!activeDoc}
        >
          {copyMsg === '已复制' ? '✓ 已复制' : '复制'}
        </button>
      </div>
      <div className="code-browser-toolbar">
        <button
          type="button"
          className="primary"
          onClick={scrollToExecCenter}
          title={canGotoExec ? '居中到执行行' : '当前无执行位置或未映射'}
          disabled={!canGotoExec}
          data-testid="goto-exec-btn"
        >
          回到执行行
        </button>
        <label className="muted code-toggle">
          <input
            type="checkbox"
            checked={followExec && !userScrolledAway}
            onChange={(e) => {
              setFollowExec(e.target.checked)
              if (e.target.checked) {
                setUserScrolledAway(false)
              }
            }}
          />{' '}
          跟随执行
        </label>
        {userScrolledAway && followExec && (
          <span className="hint" data-testid="follow-paused" role="status">
            已暂停自动跟随
          </span>
        )}
        <label className="muted code-toggle">
          <input
            type="checkbox"
            data-testid="line-wrap-checkbox"
            checked={lineWrap}
            onChange={(e) => setLineWrap(e.target.checked)}
          />{' '}
          软换行
        </label>
        <span className="spacer" />
        <label className="muted code-font">
          字号
          <input
            type="range"
            min={11}
            max={18}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            aria-label="代码字号"
          />
        </label>
        {copyMsg && (
          <span className={copyMsg === '已复制' ? 'sr-only' : 'hint'} role="status" data-testid="copy-feedback">
            {copyMsg}
          </span>
        )}
      </div>
      <div className="code-browser-meta muted">
        {title}
        {unmapped
          ? ' · ▶ 未映射'
          : codeLoading
            ? ' · 加载中…'
            : execAnchorId
              ? ` · ▶ ${execAnchorId} @${activeDoc?.documentId ?? ''}:${execLine1 ?? '—'}`
              : ' · ▶ —'}
      </div>
      {langFallback && (
        <div className="code-lang-fallback" data-testid="code-lang-fallback" role="note">
          此算法暂未提供 {LANGUAGE_LABEL[prefLanguage]} 版本，当前显示 TypeScript。
        </div>
      )}
      {unmapped && (
        <div className="code-unmapped-banner" data-testid="code-unmapped" role="status">
          此教学事件未映射
        </div>
      )}
      {execState === 'no-location' && activeDoc && (
        <div className="code-unmapped-banner" data-testid="code-doc-no-location" role="status">
          当前文档（{activeDoc.title}）没有此步骤的执行位置。
          {(showPseudoTab || language !== 'typescript') && (
            <>
              {' '}
              <button
                type="button"
                className="ghost"
                data-testid="code-doc-open-ts"
                onClick={() => (showPseudoTab ? changeTab('ts') : changeLanguage('typescript'))}
              >
                查看完整实现（TypeScript）
              </button>
            </>
          )}
        </div>
      )}
      {tab === 'ts' ? (
        <div
          className="code-browser-cm-wrap"
          style={{ fontSize }}
          data-testid="code-mirror-wrap"
          data-exec-line={execLine1 ?? ''}
          data-exec-end={execRange?.endLine ?? execLine1 ?? ''}
          data-weak-lines={contextLines.join(',')}
          data-scroll-owner="code"
          data-cm-doc={cmDoc.documentId}
          aria-busy={codeLoading || undefined}
        >
          {codeLoading && (
            <div className="code-skeleton" data-testid="code-loading" role="status" aria-live="polite">
              {loadError ? (
                <div className="code-load-error" data-testid="code-load-error">
                  {LANGUAGE_LABEL[language]} 代码加载失败：{loadError}
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setLoadError(null)
                      setLoadTick((t) => t + 1)
                    }}
                  >
                    重试
                  </button>
                </div>
              ) : (
                <>
                  <span className="code-skeleton-label">正在加载 {LANGUAGE_LABEL[language]} 代码…</span>
                  {[72, 54, 88, 40, 66, 80, 48, 60].map((w, i) => (
                    <span key={i} className="code-skeleton-line" style={{ width: `${w}%` }} />
                  ))}
                </>
              )}
            </div>
          )}
          <CodeMirror
            value={cmDoc.source}
            height="100%"
            theme={cmTheme}
            editable={false}
            extensions={extensions}
            onCreateEditor={onCreate}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: false,
              autocompletion: false,
            }}
          />
        </div>
      ) : (
        <pre
          className="code-pre"
          style={{ fontSize, whiteSpace: lineWrap ? 'pre-wrap' : 'pre', overflow: 'auto' }}
          data-testid="pseudo-pre"
          data-exec-line={execLine1 ?? ''}
          ref={pseudoPreRef}
          onWheel={() => intentRef.current.noteUserGesture()}
          onTouchStart={() => intentRef.current.noteUserGesture()}
          onScroll={() => {
            if (intentRef.current.isAbsorbing()) return
            if (!intentRef.current.hasRecentUserGesture()) return
            if (followExec) setUserScrolledAway(true)
          }}
        >
          {(activeDoc?.source ?? '').split('\n').map((line, i) => {
            const ln = i + 1
            const isExec = !unmapped && execLine1 === ln
            const isCtx = !unmapped && contextLines.includes(ln) && !isExec
            return (
              <div
                key={i}
                className={`code-line${isExec ? ' active' : ''}${isCtx ? ' context' : ''}`}
                data-line={ln}
              >
                <span className="ln">{ln}</span>
                <span className="lt">{line || ' '}</span>
              </div>
            )
          })}
        </pre>
      )}
    </div>
  )
}
