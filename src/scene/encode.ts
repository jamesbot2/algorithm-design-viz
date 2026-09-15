import { SCENE_PROTOCOL_VERSION, type ScenePayload } from './types'

export function validateScene(raw: unknown):
  | { ok: true; scene: ScenePayload; versionMismatch: boolean }
  | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: '须为对象' }
  const r = raw as Partial<ScenePayload>
  if (typeof r.algoId !== 'string' || !r.algoId) {
    return { ok: false, reason: '缺少 algoId' }
  }
  if (typeof r.version !== 'number') {
    return { ok: false, reason: '缺少 version' }
  }
  const versionMismatch = r.version !== SCENE_PROTOCOL_VERSION
  return {
    ok: true,
    scene: {
      version: r.version,
      algoId: r.algoId,
      input: r.input ?? {},
      params: r.params,
      seed: r.seed,
      stepIndex: typeof r.stepIndex === 'number' ? r.stepIndex : 0,
    },
    versionMismatch,
  }
}

/** Compact URL fragment (without leading ?): scene=<base64url json> */
export function sceneToHashFragment(scene: ScenePayload): string | null {
  try {
    const json = JSON.stringify(scene)
    if (json.length > 12000) return null
    const b64 = btoa(unescape(encodeURIComponent(json)))
    const urlSafe = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `scene=${urlSafe}`
  } catch {
    return null
  }
}

export function sceneFromHashFragment(hashOrSearch: string):
  | { ok: true; scene: ScenePayload; versionMismatch: boolean }
  | { ok: false; reason: string } {
  const q = hashOrSearch.includes('?') ? hashOrSearch.split('?')[1]! : hashOrSearch
  const params = new URLSearchParams(q.startsWith('scene=') || q.includes('=') ? q : '')
  const enc = params.get('scene')
  if (!enc) return { ok: false, reason: '无 scene 参数' }
  try {
    const b64 = enc.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const json = decodeURIComponent(escape(atob(b64 + pad)))
    return validateScene(JSON.parse(json))
  } catch {
    return { ok: false, reason: 'scene 解码失败' }
  }
}

export function loadSceneFromHash(hash: string) {
  return sceneFromHashFragment(hash)
}

export function exportSceneJson(scene: ScenePayload): string {
  return JSON.stringify(scene, null, 2)
}

export function importSceneJson(text: string) {
  try {
    return validateScene(JSON.parse(text))
  } catch {
    return { ok: false as const, reason: 'JSON 解析失败' }
  }
}

/** Round-trip helper for tests */
export function roundTripScene(scene: ScenePayload): ScenePayload {
  const frag = sceneToHashFragment(scene)
  if (!frag) throw new Error('too large')
  const loaded = sceneFromHashFragment(`?${frag}`)
  if (!loaded.ok) throw new Error(loaded.reason)
  return loaded.scene
}
