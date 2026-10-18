import type { CodeLanguage } from '../../../codeCatalog/types'

export type SectionId = 'stl' | 'algorithms'
export type Difficulty = 'basic' | 'intermediate' | 'topic'
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { basic: '竞赛基础', intermediate: '进阶', topic: '专题' }

/** One capability = one honest state. No single "done" flag. */
export type CapState = 'done' | 'partial' | 'none' | 'n/a'
export interface Capabilities {
  /** 讲解页内容 */
  explanation: CapState
  /** 逐步演示（主场景 + 播放器） */
  demo: CapState
  /** 模板（教学版/竞赛版，含导出） */
  template: CapState
  /** 代码语言：six = 六语言；cpp = 仅 C++（STL 专题） */
  languages: 'six' | 'cpp' | 'none'
  /** 语义锚点：各语言文档都有 */
  anchors: CapState
}

export interface TopicMeta {
  id: string
  section: SectionId
  titleZh: string
  titleEn: string
  /** abbreviations / synonyms that search must match (case-insensitive) */
  aliases: string[]
  tags: string[]
  difficulty: Difficulty
  /** prerequisite: other delivered topic ids or legacy course algorithm ids (prefixed `algo:`) */
  prereqs: string[]
  summary: string
  /** order in the learning route */
  routeOrder: number
  /** demo algorithm id in src/algorithms/advanced/registry (absent = no demo) */
  demoId?: string
  templateId?: string
  /** legacy course algorithms related to this topic (links, not copies) */
  relatedAlgos: string[]
  /** header / minimal standard */
  standard?: string
  caps: Capabilities
}

export interface RoadmapItem {
  id: string
  section: SectionId
  titleZh: string
  titleEn: string
  aliases: string[]
  note: string
}

export type { CodeLanguage }
