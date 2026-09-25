// V23 one-shot CSS migration helper (kept for audit): removes the old layout
// production paths (fixed 96px inspect band, body-portal inspector sheet,
// margin-right gutters, data-height-fallback hybrid, lab-fill short-height
// patch layers) from styles.css / animation.css and writes a removal log that
// docs/V23_DELIVERY.md summarizes. New rules live in styles/layout.css and
// styles/scene.css.
import postcss from 'postcss'
import fs from 'fs'

const REMOVE = [
  /\.workbench-(layout|header|title|input-summary|desktop-controls|panels|panels-stable|viz-panel|code-panel|inspector-panel|resize|panel-inner|code-inner|inspector|transport|transport-inner|chrome-host|tabs|tab-panels|tab-panel)(?![\w-])/,
  /\.visualizer(?![\w-])/,
  /\.viz-(body|body-single|main|inspector|vars-stable|banner|banner-slot|banner-text|banner-controls|legend|side)(?![\w-])/,
  /\.inspector-(sheet|sheet-toggle|sheet-head|sheet-transport|sheet-body|explanation|stack|explain-text|delta)(?![\w-])/,
  /\.stats-row(-fixed)?(?![\w-])/,
  /\.kbd-hint(?![\w-])/,
  /data-height-fallback|data-data-open|data-inspector-layout|data-layout-profile|data-height-mode|data-input-collapsed/,
  /\.main-wrap\[data-lab-fill/,
  /\.algo-page(?![\w-])/,
  /\.page-header-compact/,
  /\.input-panel-v9|\.input-summary-bar|\.input-summary-text|\.input-panel-body|\.input-actions-sticky/,
  /^\.stage-viewport$/,
  /\[data-scroll-owner=/,
  /\.theory-drawer/,
  /\.playback-settings-dock/,
  /^\.input-panel$/,
  /^\.input-panel h3$/,
]

function prune(file, logName) {
  const css = fs.readFileSync(file, 'utf8')
  const root = postcss.parse(css)
  const log = []
  root.walkRules((rule) => {
    // skip keyframe steps
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return
    const sels = rule.selectors
    const keep = sels.filter((s) => !REMOVE.some((re) => re.test(s.trim())))
    if (keep.length === sels.length) return
    const ctx = []
    let p = rule.parent
    while (p && p.type !== 'root') { if (p.type === 'atrule') ctx.push(`@${p.name} ${p.params}`); p = p.parent }
    log.push({ line: rule.source.start.line, media: ctx.join(' '), removed: sels.filter((s) => !keep.includes(s)), kept: keep, decls: rule.nodes.filter((n) => n.type === 'decl').map((d) => `${d.prop}:${d.value}${d.important ? '!important' : ''}`) })
    if (keep.length === 0) rule.remove()
    else rule.selectors = keep
  })
  // drop empty at-rules and orphan comments left at end of emptied blocks
  root.walkAtRules((at) => { if (at.nodes && at.nodes.filter((n) => n.type !== 'comment').length === 0) at.remove() })
  fs.writeFileSync(file, root.toString().replace(/\n{3,}/g, '\n\n'))
  fs.writeFileSync(logName, JSON.stringify(log, null, 1))
  return log
}

const a = prune('src/styles.css', process.argv[2] || '/tmp/v23-css-removed-styles.json')
const b = prune('src/styles/animation.css', process.argv[3] || '/tmp/v23-css-removed-animation.json')
console.log('styles.css rules touched', a.length, 'animation.css rules touched', b.length)
