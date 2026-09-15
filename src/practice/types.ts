export type JudgmentType = 'predict_next' | 'explain_choice' | 'counterexample'

/**
 * Choice / construct judge modes:
 * - single: exactly one selected id, must equal the sole acceptId (or be in acceptIds if len=1)
 * - multiExact: selected set must equal acceptIds exactly (complete hit)
 * - construct / path / setOptimal: free-form judged by judgeKey (any-valid optimal)
 */
export type JudgeMode = 'single' | 'multiExact' | 'construct' | 'path' | 'setOptimal'

export interface PracticeChoice {
  id: string
  label: string
}

export interface PracticeItemBase {
  id: string
  algoId: string
  type: JudgmentType
  prompt: string
  /** Link back to demo step / teaching note */
  stepLink?: { algoId: string; hint: string }
  explanation: string
  seed?: number
  /** How this item is judged */
  judgeMode?: JudgeMode
}

export interface PredictNextItem extends PracticeItemBase {
  type: 'predict_next'
  choices: PracticeChoice[]
  /** Acceptable choice ids — interpretation depends on judgeMode */
  acceptIds: string[]
  judgeMode?: 'single' | 'multiExact'
}

export interface ExplainChoiceItem extends PracticeItemBase {
  type: 'explain_choice'
  choices: PracticeChoice[]
  acceptIds: string[]
  judgeMode?: 'single' | 'multiExact'
}

export interface CounterexampleItem extends PracticeItemBase {
  type: 'counterexample'
  /** Structured fields the learner fills */
  fields: { id: string; label: string; placeholder?: string }[]
  /** Judge function key */
  judgeKey: string
  /** Payload for judge */
  judgePayload?: unknown
  judgeMode?: 'construct' | 'path' | 'setOptimal'
}

export type PracticeItem = PredictNextItem | ExplainChoiceItem | CounterexampleItem

export interface JudgeResult {
  ok: boolean
  message: string
  /** Extra accepted alternatives note */
  note?: string
}
