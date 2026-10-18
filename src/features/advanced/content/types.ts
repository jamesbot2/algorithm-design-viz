export interface ContentSection {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
  code?: { label?: string; text: string }
  table?: { head: string[]; rows: string[][] }
}
export interface TopicContent {
  sections: ContentSection[]
  /** short statements about what the standard/algorithm guarantees vs what this demo model chooses */
  boundary: string[]
}
