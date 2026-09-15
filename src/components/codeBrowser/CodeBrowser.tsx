import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { EditorView, Decoration, gutter, GutterMarker, keymap } from '@codemirror/view'
import { RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search'
import type { CodeDocument } from '../../codeCatalog/types'

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
      return Decoration.set([
        Decoration.line({ class: 'cm-exec-line' }).range(info.from),
      ])
    }),
  ]
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
        // Text selection must not change algo cursor — no-op handlers; parent owns cursor
        mousedown: () => {
          /* allow selection only */
          return false
        },
      }),
    ]
    return exts
  }, [])

  const scrollToExec = useCallback(() => {
    const view = viewRef.current
    if (!view || execLine1 == null) return
    if (execLine1 < 1 || execLine1 > view.state.doc.lines) return
    const line = view.state.doc.line(execLine1)
    view.dispatch({
      effects: [
        setExecLine.of(execLine1),
        EditorView.scrollIntoView(line.from, { y: 'center' }),
      ],
    })
    setUserScrolledAway(false)
    setFollowExec(true)
  }, [execLine1])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setExecLine.of(execLine1) })
    if (followExec && !userScrolledAway && execLine1 != null) {
      if (execLine1 >= 1 && execLine1 <= view.state.doc.lines) {
        const line = view.state.doc.line(execLine1)
        view.dispatch({
          effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
        })
      }
    }
  }, [execLine1, followExec, userScrolledAway])

  const onCreate = useCallback((view: EditorView) => {
    viewRef.current = view
    if (execLine1 != null) {
      view.dispatch({ effects: setExecLine.of(execLine1) })
    }
  }, [execLine1])

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
        // Do not let Space/arrows bubble to Visualizer while focused in editor
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
        {userScrolledAway && (
          <button type="button" className="primary" onClick={scrollToExec}>
            回到执行行
          </button>
        )}
        <label className="muted" style={{ fontSize: '0.72rem' }}>
          <input
            type="checkbox"
            checked={followExec}
            onChange={(e) => {
              setFollowExec(e.target.checked)
              if (e.target.checked) {
                setUserScrolledAway(false)
                scrollToExec()
              }
            }}
          />{' '}
          跟随执行
        </label>
      </div>
      <div className="code-browser-meta muted">
        {doc.title} · hash {doc.sourceHash.slice(0, 12)}…
        {execAnchorId ? ` · ▶ ${execAnchorId}` : ''}
      </div>
      {tab === 'ts' ? (
        <div
          style={{ fontSize }}
          onWheel={() => {
            if (followExec) setUserScrolledAway(true)
          }}
        >
          <CodeMirror
            value={doc.source}
            height="100%"
            theme="dark"
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
            <div
              key={i}
              className={`code-line${execLine1 === i + 1 ? ' active' : ''}`}
            >
              <span className="ln">{i + 1}</span>
              <span className="lt">{line || ' '}</span>
            </div>
          ))}
        </pre>
      )}
    </div>
  )
}
