import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { EditorView, Decoration, gutter, GutterMarker, keymap } from '@codemirror/view'
import { RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search'
import type { CodeDocument } from '../../codeCatalog/types'
import { useLabTheme } from '../../theme/LabThemeContext'

interface Props {
  document: CodeDocument
  /** Anchor id from step.codeRefs — drives exec arrow */
  execAnchorId?: string
  /** Fallback 0-based line when no anchor */
  activeLine?: number
  pseudocode?: string
  onTabChange?: (tab: 'ts' | 'pseudo') => void
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

const execLineField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setExecLine)) return e.value
    }
    return value
  },
})

function buildExecGutter(): Extension {
  return [
    execLineField,
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
    EditorView.decorations.compute([execLineField], (state) => {
      const line = state.field(execLineField)
      if (line == null || line < 1 || line > state.doc.lines) return Decoration.none
      const info = state.doc.line(line)
      return Decoration.set([Decoration.line({ class: 'cm-exec-line' }).range(info.from)])
    }),
    // Reserve gutter width from init so first arrow does not shift code
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
    }),
  ]
}

/** Scroll only when line is near edges; use nearest. Never scroll window. */
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

export default function CodeBrowser({
  document: doc,
  execAnchorId,
  activeLine,
  pseudocode,
}: Props) {
  const [tab, setTab] = useState<'ts' | 'pseudo'>('ts')
  const [fontSize, setFontSize] = useState(13)
  const [followExec, setFollowExec] = useState(true)
  const [userScrolledAway, setUserScrolledAway] = useState(false)
  const viewRef = useRef<EditorView | null>(null)
  const programmaticScroll = useRef(false)
  const { theme } = useLabTheme()

  const cmTheme = theme === 'lab-light' ? 'light' : 'dark'

  const execLine1 = useMemo(() => {
    if (execAnchorId) {
      const a = doc.anchors.find((x) => x.id === execAnchorId)
      if (a) return a.range.startLine
    }
    if (typeof activeLine === 'number' && activeLine >= 0) return activeLine + 1
    return null
  }, [execAnchorId, doc.anchors, activeLine])

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
    view.dispatch({ effects: setExecLine.of(execLine1) })
    scrollLineCenter(view, execLine1)
    setUserScrolledAway(false)
    setFollowExec(true)
  }, [execLine1, markProgrammatic])

  // Highlight update separate from scroll
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setExecLine.of(execLine1) })
    if (followExec && !userScrolledAway && execLine1 != null) {
      markProgrammatic()
      scrollLineNearest(view, execLine1)
    }
  }, [execLine1, followExec, userScrolledAway, markProgrammatic])

  const onCreate = useCallback(
    (view: EditorView) => {
      viewRef.current = view
      // Reserve gutter + set initial highlight without centering
      view.dispatch({ effects: setExecLine.of(execLine1) })
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
    [execLine1, followExec],
  )

  useEffect(() => {
    return () => {
      const view = viewRef.current as unknown as { __advScrollCleanup?: () => void } | null
      view?.__advScrollCleanup?.()
    }
  }, [])

  const copy = async () => {
    const text = tab === 'ts' ? doc.source : (pseudocode ?? '')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="code-browser"
      data-testid="code-browser"
      onKeyDown={(e) => {
        e.stopPropagation()
      }}
    >
      <div className="code-browser-toolbar">
        <div className="code-tabs">
          <button type="button" className={tab === 'ts' ? 'active' : ''} onClick={() => setTab('ts')}>
            TypeScript
          </button>
          {pseudocode && (
            <button
              type="button"
              className={tab === 'pseudo' ? 'active' : ''}
              onClick={() => setTab('pseudo')}
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
        {doc.title}
        {execAnchorId ? ` · ▶ ${execAnchorId}` : ' · ▶ —'}
      </div>
      {tab === 'ts' ? (
        <div
          className="code-browser-cm-wrap"
          style={{ fontSize }}
          data-testid="code-mirror-wrap"
          onWheel={() => {
            if (followExec) setUserScrolledAway(true)
          }}
        >
          <CodeMirror
            value={doc.source}
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
        <pre className="code-pre" style={{ fontSize }}>
          {(pseudocode ?? '').split('\n').map((line, i) => (
            <div key={i} className={`code-line${execLine1 === i + 1 ? ' active' : ''}`}>
              <span className="ln">{i + 1}</span>
              <span className="lt">{line || ' '}</span>
            </div>
          ))}
        </pre>
      )}
    </div>
  )
}
