/**
 * V23: production CSS is split by responsibility (styles.css = theme/components,
 * styles/animation.css = motion, styles/scene.css = stage composition,
 * styles/layout.css = page/workbench geometry). Static CSS guards read ALL of it,
 * in import order, so a rule that moved files is still checked.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const CSS_FILES = ['src/styles.css', 'src/styles/animation.css', 'src/styles/scene.css', 'src/styles/layout.css']

export function readAllCss(root = process.cwd()): string {
  return CSS_FILES.map((f) => `/* ==== ${f} ==== */\n` + readFileSync(resolve(root, f), 'utf8')).join('\n')
}
