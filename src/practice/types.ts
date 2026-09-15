export type JudgmentType = 'predict_next' | 'explain_choice' | 'counterexample'

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
}

export interface PredictNextItem extends PracticeItemBase {
  type: 'predict_next'
  choices: PracticeChoice[]
  /** One or more acceptable choice ids */
  acceptIds: string[]
}

export interface ExplainChoiceItem extends PracticeItemBase {
  type: 'explain_choice'
  choices: PracticeChoice[]
  acceptIds: string[]
}

export interface CounterexampleItem extends PracticeItemBase {
  type: 'counterexample'
  /** Structured fields the learner fills */
  fields: { id: string; label: string; placeholder?: string }[]
  /** Judge function key */
  judgeKey: string
  /** Payload for judge */
  judgePayload?: unknown
}

export type PracticeItem = PredictNextItem | ExplainChoiceItem | CounterexampleItem

export interface JudgeResult {
  ok: boolean
  message: string
  /** Extra accepted alternatives note */
  note?: string
}
