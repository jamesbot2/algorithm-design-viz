/** Browser/Node-safe SHA-256 hex of utf-8 text. Sync via SubtleCrypto is async; we use a tiny FNV-1a fallback label + WebCrypto when awaited. */
export function fnv1aHex(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(text)
    const dig = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  return fnv1aHex(text)
}
