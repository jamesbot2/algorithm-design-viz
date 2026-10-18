import type { Step } from '../../types/step'
import type { AdvancedView } from '../../types/advancedView'

export type Ref = NonNullable<Step['codeRefs']>[number]
export const refs = (doc: string, ...anchors: (string | [string, Ref['role']])[]): Ref[] =>
  anchors.map((a, i) => {
    const [anchorId, role] = Array.isArray(a) ? a : [a, i === 0 ? 'primary' : 'context']
    return { documentId: doc, anchorId, role } as Ref
  })

/** Small step recorder: ids are sequential, views are deep-copied so frames are immutable snapshots. */
export class Recorder {
  steps: Step[] = []
  private doc: string
  constructor(doc: string) {
    this.doc = doc
  }
  push(
    message: string,
    view: AdvancedView,
    anchors: (string | [string, Ref['role']])[],
    vars: Record<string, string | number | boolean | null> = {},
    extra: Partial<Step> = {},
  ) {
    this.steps.push({
      id: this.steps.length,
      message,
      advanced: structuredClone(view),
      vars,
      codeRefs: refs(this.doc, ...anchors),
      ...extra,
    })
  }
}
