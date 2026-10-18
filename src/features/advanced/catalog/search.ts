import { TOPICS } from './topics'
import { ROADMAP } from './roadmap'
import type { TopicMeta, RoadmapItem, SectionId, Difficulty } from './types'

/** Lowercase, strip spaces/punctuation that people type differently ("union find" / "union-find" / "Union_Find"). */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-_/·.()（）【】,，、:：]+/g, '')
}

function haystack(t: { titleZh: string; titleEn: string; aliases: string[]; tags?: string[]; summary?: string; note?: string }): string[] {
  return [t.titleZh, t.titleEn, ...t.aliases, ...(t.tags ?? []), t.summary ?? '', t.note ?? ''].map(normalize)
}

export const matchesQuery = (t: Parameters<typeof haystack>[0], q: string): boolean => {
  const n = normalize(q)
  if (!n) return true
  return haystack(t).some((h) => h.includes(n))
}

export interface TopicFilter {
  q?: string
  section?: SectionId | 'all'
  difficulty?: Difficulty | 'all'
}

export function searchTopics(f: TopicFilter = {}): TopicMeta[] {
  return TOPICS.filter(
    (t) => (!f.section || f.section === 'all' || t.section === f.section) && (!f.difficulty || f.difficulty === 'all' || t.difficulty === f.difficulty) && matchesQuery(t, f.q ?? ''),
  ).sort((a, b) => a.routeOrder - b.routeOrder)
}

/** Planned items that match — shown in a separate "规划中" group, never as learnable results. */
export function searchRoadmap(q: string): RoadmapItem[] {
  const n = normalize(q)
  if (!n) return []
  return ROADMAP.filter((r) => matchesQuery(r, q))
}

/** Words that count as a hit for the module entry itself ("高阶", "advanced", "STL", "竞赛模板"…). */
export const MODULE_KEYWORDS = ['高阶算法', '高阶', 'advanced', 'STL', '竞赛', '模板', 'ACM', 'ICPC', 'template']
export const matchesModule = (q: string): boolean => {
  const n = normalize(q)
  return !!n && MODULE_KEYWORDS.some((k) => normalize(k).includes(n) || n.includes(normalize(k)))
}
