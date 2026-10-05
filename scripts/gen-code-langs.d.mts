export const LANGS: string[]
export const LANG_LABEL: Record<string, string>
export function sha256(text: string): string
export function parseAnnotated(raw: string, lang: string, where?: string): { source: string; anchors: { id: string; range: { startLine: number; endLine: number } }[] }
export function algoDirs(): string[]
export interface BuiltDoc { documentId: string; language: string; title: string; sourceFile: string; source: string; sourceHash: string; anchors: { id: string; range: { startLine: number; endLine: number } }[] }
export function buildDocs(dir: string): { algo: string; dir: string; docs: BuiltDoc[] }
export function renderModule(built: { dir: string; docs: BuiltDoc[] }): string
export function buildAll(): { algo: string; dir: string; docs: BuiltDoc[]; path: string; text: string }[]
