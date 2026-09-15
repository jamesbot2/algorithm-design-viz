import { SCENE_PROTOCOL_VERSION, type ScenePayload } from './types'

const MAX_SCENE_JSON_CHARS = 12_000

export function validateScene(raw: unknown):
  | { ok: true; scene: ScenePayload; versionMismatch: boolean }
  | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: '须为对象' }
  const r = raw as Partial<ScenePayload>
  if (typeof r.algoId !== 'string' || !r.algoId) {
    return { ok: false, reason: '缺少 algoId' }
  }
  if (typeof r.version !== 'number' || !Number.isFinite(r.version)) {
    return { ok: false, reason: '缺少 version' }
  }
  if (r.input !== undefined && (typeof r.input !== 'object' || r.input === null)) {
    return { ok: false, reason: 'input 结构非法' }
  }
  if (r.params !== undefined && (typeof r.params !== 'object' || r.params === null || Array.isArray(r.params))) {
    return { ok: false, reason: 'params 结构非法' }
  }
  if (r.stepIndex !== undefined && (!Number.isInteger(r.stepIndex) || r.stepIndex < 0)) {
    return { ok: false, reason: 'stepIndex 须为非负整数' }
  }
  if (r.seed !== undefined && typeof r.seed !== 'number') {
    return { ok: false, reason: 'seed 须为数字' }
  }

  const versionMismatch = r.version !== SCENE_PROTOCOL_VERSION
  if (versionMismatch) {
    return {
      ok: false,
      reason: `场景协议版本不匹配：场景 v${r.version}，当前 v${SCENE_PROTOCOL_VERSION}（已拒绝加载，无静默回退）`,
    }
  }

  return {
    ok: true,
    scene: {
      version: r.version,
      algoId: r.algoId,
      input: r.input ?? {},
      params: r.params,
      seed: r.seed,
      stepIndex: typeof r.stepIndex === 'number' ? r.stepIndex : 0,
      runSnapshot: r.runSnapshot,
      sourceHash: typeof r.sourceHash === 'string' ? r.sourceHash : undefined,
      draftOnly: r.draftOnly === true,
    },
    versionMismatch: false,
  }
}

/** Compact URL fragment (without leading ?): scene=<base64url json> */
export function sceneToHashFragment(scene: ScenePayload): string | null {
  try {
    const json = JSON.stringify(scene)
    if (json.length > MAX_SCENE_JSON_CHARS) return null
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
  if (enc.length > MAX_SCENE_JSON_CHARS * 2) {
    return { ok: false, reason: 'scene 过大，已拒绝' }
  }
  try {
    const b64 = enc.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const json = decodeURIComponent(escape(atob(b64 + pad)))
    if (json.length > MAX_SCENE_JSON_CHARS) {
      return { ok: false, reason: 'scene JSON 过大，已拒绝' }
    }
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
    if (text.length > MAX_SCENE_JSON_CHARS * 2) {
      return { ok: false as const, reason: 'JSON 过大，已拒绝' }
    }
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

export { MAX_SCENE_JSON_CHARS }
