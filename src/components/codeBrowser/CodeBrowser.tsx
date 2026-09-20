import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { EditorView, Decoration, gutter, GutterMarker, keymap } from '@codemirror/view'
import { Compartment, RangeSetBuilder, StateEffect, StateField, type Extension, type Range } from '@codemirror/state'
import { createScrollFollowIntent } from '../../utils/scrollFollowIntent'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search'
import type { CodeDocument, SourceRange } from '../../codeCatalog/types'
import { useLabTheme } from '../../theme/LabThemeContext'
import { useMotion } from '../../theme/MotionContext'
import { activeCatalogDoc, resolveExecRange } from './resolveExec'

export type CodeBrowserDocuments = {
  typescript: CodeDocument
  pseudocode?: CodeDocument
}

interface Props {
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
  documents,
  document: legacyDoc,
  execAnchorId,
  contextAnchorIds = [],
  activeLine,
  pseudocode,
  onTabChange,
  unmapped = false,
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
  const { theme } = useLabTheme()
  const { mode: motionMode } = useMotion()
  const reduceMotion = motionMode === 'reduced'
  followExecRef.current = followExec
  userScrolledAwayRef.current = userScrolledAway

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

  const activeDoc = useMemo(() => {
    if (!docs) return null
    return activeCatalogDoc(docs, tab)
  }, [docs, tab])

  const execRange = useMemo(() => {
    if (unmapped) return null
    return resolveExecRange(activeDoc, execAnchorId)
  }, [activeDoc, execAnchorId, unmapped])

  const execLine1 = useMemo(() => {
    if (execRange) return execRange.startLine
    // Only allow activeLine fallback on TS tab when no anchor (legacy generators)
    if (tab === 'ts' && typeof activeLine === 'number' && activeLine >= 0 && !execAnchorId) {
      return activeLine + 1
    }
    return null
  }, [execRange, activeLine, tab, execAnchorId])
  execLine1Ref.current = execLine1

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
      javascript({ typescript: true }),
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
  }, [])

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

    const margin = 12
    const elTop = el.offsetTop
    const elBottom = elTop + el.offsetHeight
    const visTop = pre.scrollTop
    const visBottom = visTop + pre.clientHeight

    let target = pre.scrollTop
    if (center) {
      target = Math.max(0, elTop - pre.clientHeight / 2 + el.offsetHeight / 2)
    } else {
      // Already visible → no-op
      if (elTop >= visTop + margin && elBottom <= visBottom - margin) return
      if (elTop < visTop + margin) target = Math.max(0, elTop - margin)
      else target = Math.max(0, elBottom - pre.clientHeight + margin)
    }
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

  const canGotoExec = !unmapped && execLine1 != null

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
  }, [execLine1, contextLines, followExec, userScrolledAway, beginScrollTxn, tab, scrollPseudoToLine])

  // Clear CM viewRef when leaving TS tab so we never dispatch to destroyed editor
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
  }, [tab])

  const onCreate = useCallback(
    (view: EditorView) => {
      viewRef.current = view
      view.dispatch({
        effects: [setExecLine.of(execLine1), setContextLines.of(contextLines)],
      })
      const scrollDOM = view.scrollDOM
      if (!scrollDOM.hasAttribute('tabindex')) scrollDOM.tabIndex = -1
      const unbind = intentRef.current.bind(scrollDOM, () => {
        if (followExecRef.current) setUserScrolledAway(true)
      })
      // V20-01: when follow paused, pin scrollTop across layout/data reflow
      let pinTop = scrollDOM.scrollTop
      const onScrollPin = () => {
        if (!userScrolledAwayRef.current) pinTop = scrollDOM.scrollTop
      }
      scrollDOM.addEventListener('scroll', onScrollPin, { passive: true })
      let ro: ResizeObserver | null = null
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          if (!userScrolledAwayRef.current) return
          const txn = intentRef.current.beginTransaction('layout')
          const max = Math.max(0, scrollDOM.scrollHeight - scrollDOM.clientHeight)
          scrollDOM.scrollTop = Math.min(pinTop, max)
          requestAnimationFrame(() => requestAnimationFrame(() => txn.end()))
        })
        ro.observe(scrollDOM)
      }
      ;(view as unknown as { __advScrollCleanup?: () => void }).__advScrollCleanup = () => {
        unbind()
        scrollDOM.removeEventListener('scroll', onScrollPin)
        ro?.disconnect()
      }
    },
    [execLine1, contextLines],
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

  const changeTab = (t: 'ts' | 'pseudo') => {
    setTab(t)
    onTabChange?.(t)
    setUserScrolledAway(false)
  }

  const copy = async () => {
    const text = activeDoc?.source ?? ''
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

  if (!docs || !activeDoc) {
    return <div className="code-browser muted">（无代码文档）</div>
  }

  const showPseudo = Boolean(docs.pseudocode)
  const source = activeDoc.source

  return (
    <div
      className="code-browser"
      data-testid="code-browser"
      data-active-doc={activeDoc.documentId}
      data-tab={tab}
      onKeyDown={(e) => {
        e.stopPropagation()
      }}
    >
      <div className="code-browser-toolbar">
        <div className="code-tabs">
          <button
            type="button"
            className={tab === 'ts' ? 'active' : ''}
            data-testid="tab-ts"
            onClick={() => changeTab('ts')}
          >
            TypeScript
          </button>
          {showPseudo && (
            <button
              type="button"
              className={tab === 'pseudo' ? 'active' : ''}
              data-testid="tab-pseudo"
              onClick={() => changeTab('pseudo')}
            >
              伪代码
            </button>
          )}
        </div>
        <span className="spacer" />
        <label className="muted" style={{ fontSize: '0.75rem' }}>
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
        <button type="button" onClick={copy} title="复制" data-testid="code-copy-btn">
          复制
        </button>
        {copyMsg && (
          <span className="hint" role="status" data-testid="copy-feedback">
            {copyMsg}
          </span>
        )}
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
        <label className="muted" style={{ fontSize: '0.72rem' }}>
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
        <label className="muted" style={{ fontSize: '0.72rem' }}>
          <input
            type="checkbox"
            data-testid="line-wrap-checkbox"
            checked={lineWrap}
            onChange={(e) => setLineWrap(e.target.checked)}
          />{' '}
          软换行
        </label>
      </div>
      <div className="code-browser-meta muted">
        {activeDoc.title}
        {unmapped
          ? ' · ▶ 未映射'
          : execAnchorId
            ? ` · ▶ ${execAnchorId} @${activeDoc.documentId}:${execLine1 ?? '—'}`
            : ' · ▶ —'}
      </div>
      {unmapped && (
        <div className="code-unmapped-banner" data-testid="code-unmapped" role="status">
          此教学事件未映射
        </div>
      )}
      {tab === 'ts' ? (
        <div
          className="code-browser-cm-wrap"
          style={{ fontSize }}
          data-testid="code-mirror-wrap"
          data-exec-line={execLine1 ?? ''}
          data-scroll-owner="code"
        >
          <CodeMirror
            value={source}
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
          {source.split('\n').map((line, i) => {
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
