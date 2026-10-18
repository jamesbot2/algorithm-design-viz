import data from './validation.json'
import { SOURCE_HASHES, TESTSET_VERSION } from './hashes.generated'

export interface ValidationEntry {
  hash: string
  status: 'pass' | 'fail'
  tests: number
  toolchain: string
  checks: string
}
export type ValidationState = 'verified' | 'failed' | 'stale' | 'unverified'

const db = data as { testsetVersion: string; toolchain: Record<string, string>; entries: Record<string, ValidationEntry> }

/**
 * Validation status BINDS to source hash + test-set version: an edit to the displayed source (or a new test set)
 * turns a previous pass into "stale", never into a silent "verified".
 */
export function validationState(key: string, currentHash: string | undefined): { state: ValidationState; entry?: ValidationEntry } {
  const entry = db.entries[key]
  if (!entry || !currentHash) return { state: 'unverified' }
  if (entry.hash !== currentHash || db.testsetVersion !== TESTSET_VERSION) return { state: 'stale', entry }
  return { state: entry.status === 'pass' ? 'verified' : 'failed', entry }
}
export const VALIDATION_LABEL: Record<ValidationState, string> = {
  verified: '已验证（真实工具链）',
  failed: '验证失败',
  stale: '源码已变更：验证过期',
  unverified: '未验证',
}
export const toolchainInfo = () => db.toolchain
export { SOURCE_HASHES }
