import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { EditorView, Decoration, gutter, GutterMarker, keymap } from '@codemirror/view'
import { RangeSetBuilder, StateEffect, StateField, type Extension, type Range } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search'
import type { CodeDocument, SourceRange } from '../../codeCatalog/types'
import { useLabTheme } from '../../theme/LabThemeContext'
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

function scrollLineNearest(view: EditorView, line1: number) {
  if (line1 < 1 || line1 > view.state.doc.lines) return
  const line = view.state.doc.line(line1)
  const block = view.lineBlockAt(line.from)
  const scrollDOM = view.scrollDOM
  const margin = 40
  const top = block.top
  const bottom = block.bottom
  const visTop = scrollDOM.scrollTop
  const visBottom = visTop + scrollDOM.clientHeight
  if (top < visTop + margin) {
    scrollDOM.scrollTop = Math.max(0, top - margin)
  } else if (bottom > visBottom - margin) {
    scrollDOM.scrollTop = bottom - scrollDOM.clientHeight + margin
  }
}

function scrollLineCenter(view: EditorView, line1: number) {
  if (line1 < 1 || line1 > view.state.doc.lines) return
  const line = view.state.doc.line(line1)
  const block = view.lineBlockAt(line.from)
  const scrollDOM = view.scrollDOM
  scrollDOM.scrollTop = Math.max(0, block.top - scrollDOM.clientHeight / 2 + block.height / 2)
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
  const viewRef = useRef<EditorView | null>(null)
  const programmaticScroll = useRef(false)
  const { theme } = useLabTheme()

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
      EditorView.lineWrapping,
      EditorView.domEventHandlers({
        mousedown: () => false,
      }),
    ]
    return exts
  }, [])

  const markProgrammatic = useCallback(() => {
    programmaticScroll.current = true
    window.setTimeout(() => {
      programmaticScroll.current = false
    }, 80)
  }, [])

  const scrollToExecCenter = useCallback(() => {
    const view = viewRef.current
    if (!view || execLine1 == null) return
    markProgrammatic()
    view.dispatch({
      effects: [setExecLine.of(execLine1), setContextLines.of(contextLines)],
    })
    scrollLineCenter(view, execLine1)
    setUserScrolledAway(false)
    setFollowExec(true)
  }, [execLine1, contextLines, markProgrammatic])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: [setExecLine.of(execLine1), setContextLines.of(contextLines)],
    })
    if (followExec && !userScrolledAway && execLine1 != null) {
      markProgrammatic()
      scrollLineNearest(view, execLine1)
    }
  }, [execLine1, contextLines, followExec, userScrolledAway, markProgrammatic])

  const onCreate = useCallback(
    (view: EditorView) => {
      viewRef.current = view
      view.dispatch({
        effects: [setExecLine.of(execLine1), setContextLines.of(contextLines)],
      })
      const scrollDOM = view.scrollDOM
      const onScroll = () => {
        if (programmaticScroll.current) return
        if (followExec) setUserScrolledAway(true)
      }
      scrollDOM.addEventListener('scroll', onScroll, { passive: true })
      ;(view as unknown as { __advScrollCleanup?: () => void }).__advScrollCleanup = () => {
        scrollDOM.removeEventListener('scroll', onScroll)
      }
    },
    [execLine1, contextLines, followExec],
  )

  useEffect(() => {
    return () => {
      const view = viewRef.current as unknown as { __advScrollCleanup?: () => void } | null
      view?.__advScrollCleanup?.()
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
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
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
        <button type="button" onClick={copy} title="复制">
          复制
        </button>
        <button type="button" className="primary" onClick={scrollToExecCenter} title="居中到执行行">
          回到执行行
        </button>
        <label className="muted" style={{ fontSize: '0.72rem' }}>
          <input
            type="checkbox"
            checked={followExec}
            onChange={(e) => {
              setFollowExec(e.target.checked)
              if (e.target.checked) {
                setUserScrolledAway(false)
              }
            }}
          />{' '}
          跟随执行
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
          onWheel={() => {
            if (followExec) setUserScrolledAway(true)
          }}
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
          style={{ fontSize }}
          data-testid="pseudo-pre"
          data-exec-line={execLine1 ?? ''}
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
