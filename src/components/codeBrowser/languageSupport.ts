/**
 * V28: CodeMirror syntax support per code language. TypeScript is bundled (it was before V28);
 * the other grammars are dynamic imports, fetched the first time a language is shown.
 */
import type { Extension } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import type { CodeLanguage } from '../../codeCatalog/types'

const cache = new Map<CodeLanguage, Extension>([['typescript', javascript({ typescript: true })]])
const inflight = new Map<CodeLanguage, Promise<Extension>>()

export function peekLanguageSupport(lang: CodeLanguage): Extension | null {
  return cache.get(lang) ?? null
}

async function importSupport(lang: CodeLanguage): Promise<Extension> {
  switch (lang) {
    case 'typescript':
      return javascript({ typescript: true })
    case 'python':
      return (await import('@codemirror/lang-python')).python()
    case 'cpp':
      return (await import('@codemirror/lang-cpp')).cpp()
    case 'java':
      return (await import('@codemirror/lang-java')).java()
    case 'rust':
      return (await import('@codemirror/lang-rust')).rust()
    case 'go':
      return (await import('@codemirror/lang-go')).go()
  }
}

export function loadLanguageSupport(lang: CodeLanguage): Promise<Extension> {
  const hit = cache.get(lang)
  if (hit) return Promise.resolve(hit)
  const pending = inflight.get(lang)
  if (pending) return pending
  const p = importSupport(lang)
    .then((ext) => {
      cache.set(lang, ext)
      inflight.delete(lang)
      return ext
    })
    .catch((e) => {
      // A grammar is only colouring: if its chunk cannot be fetched, show the code as plain text
      // rather than blocking the document (browsers would not re-fetch a failed import anyway).
      inflight.delete(lang)
      console.warn(`[code] ${lang} syntax highlighting unavailable:`, e)
      const plain: Extension = []
      cache.set(lang, plain)
      return plain
    })
  inflight.set(lang, p)
  return p
}
