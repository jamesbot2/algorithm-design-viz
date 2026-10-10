/**
 * V31-02 deploy gate — mocked REST, simulated event timelines. Validates that a same-SHA deploy
 * fires exactly once whichever of CI / E2E completes last, never on failure / cancel, never for a
 * SHA that is no longer main's tip, and that manual dispatch still needs both green.
 */
import { describe, expect, it } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import gate from '../scripts/deploy-gate.cjs'

const SHA = 'a'.repeat(40)
const NEWER = 'b'.repeat(40)
type Run = { id: number; head_sha: string; event: string; head_branch: string; status: string; conclusion: string | null; updated_at: string }
const run = (id: number, status: string, conclusion: string | null, extra: Partial<Run> = {}): Run => ({
  id, head_sha: SHA, event: 'push', head_branch: 'main', status, conclusion, updated_at: `2026-10-10T00:00:${String(id % 60).padStart(2, '0')}Z`, ...extra,
})

/** Mutable fake GitHub: workflow runs per file, main tip, pages deployments (deploy() records one). */
function world() {
  const w = {
    runs: { 'ci.yml': [] as Run[], 'e2e.yml': [] as Run[] },
    main: SHA,
    deployments: [] as { id: number; sha: string; ok: boolean }[],
    calls: 0,
  }
  const github = {
    rest: {
      actions: {
        listWorkflowRuns: async ({ workflow_id, head_sha }: { workflow_id: 'ci.yml' | 'e2e.yml'; head_sha: string }) => {
          w.calls++
          return { data: { workflow_runs: w.runs[workflow_id].filter((r) => r.head_sha === head_sha) } }
        },
      },
      repos: {
        getBranch: async () => ({ data: { commit: { sha: w.main } } }),
        listDeployments: async ({ sha }: { sha: string }) => ({ data: w.deployments.filter((d) => d.sha === sha) }),
        listDeploymentStatuses: async ({ deployment_id }: { deployment_id: number }) => ({
          data: w.deployments.filter((d) => d.id === deployment_id && d.ok).map(() => ({ state: 'success' })),
        }),
      },
    },
  }
  return { w, github }
}

function core() {
  const log: string[] = []
  const out: Record<string, string> = {}
  return {
    log, out, failed: [] as string[],
    info: (m: string) => log.push(`info ${m}`),
    notice: (m: string) => log.push(`notice ${m}`),
    setOutput: (k: string, v: string) => { out[k] = v },
    setFailed(m: string) { this.failed.push(m); log.push(`failed ${m}`) },
  }
}

const wfEvent = (name: 'CI' | 'E2E', r: Run) => ({
  eventName: 'workflow_run', sha: 'ignored', repo: { owner: 'o', repo: 'r' },
  payload: { workflow_run: { name, id: r.id, conclusion: r.conclusion, event: r.event, head_sha: r.head_sha, head_branch: r.head_branch } },
})
const dispatch = (sha = SHA) => ({ eventName: 'workflow_dispatch', sha, repo: { owner: 'o', repo: 'r' }, payload: {} })

/** One deploy-pages.yml run: gate → (build) → deploy job pre-check → deploy. Returns decision + whether Pages was deployed. */
async function fire(env: ReturnType<typeof world>, context: ReturnType<typeof wfEvent> | ReturnType<typeof dispatch>) {
  const c = core()
  const res = await gate.runGate({ github: env.github, context, core: c, graceMs: 0, pollMs: 1, sleep: async () => {} })
  let deployed = false
  if (res.decision === 'deploy') {
    const p = core()
    const pre = await gate.preDeploy({ github: env.github, context, core: p, sha: c.out.sha, manual: context.eventName === 'workflow_dispatch' })
    if (pre.go) {
      env.w.deployments.push({ id: env.w.deployments.length + 1, sha: c.out.sha, ok: true })
      deployed = true
    }
  }
  return { ...res, deployed, log: c.log, failed: c.failed }
}
const deploysOf = (env: ReturnType<typeof world>, sha = SHA) => env.w.deployments.filter((d) => d.sha === sha).length

describe('V31-02 gate: the four completion orderings', () => {
  it('1) CI → E2E (both green): CI event waits for E2E, E2E event deploys — exactly once', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'in_progress', null)]
    const early = await fire(env, wfEvent('CI', env.w.runs['ci.yml'][0]!))
    expect(early.decision).toBe('wait')
    expect(early.reason).toMatch(/^waiting for E2E/)
    expect(early.failed).toEqual([])
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'success')]
    const late = await fire(env, wfEvent('E2E', env.w.runs['e2e.yml'][0]!))
    expect(late.decision).toBe('deploy')
    expect(deploysOf(env)).toBe(1)
  })

  it('2) E2E → CI (both green): E2E event waits for CI, CI event deploys — exactly once', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'queued', null)]
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'success')]
    const early = await fire(env, wfEvent('E2E', env.w.runs['e2e.yml'][0]!))
    expect(early.decision).toBe('wait')
    expect(early.reason).toMatch(/^waiting for CI/)
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    const late = await fire(env, wfEvent('CI', env.w.runs['ci.yml'][0]!))
    expect(late.decision).toBe('deploy')
    expect(deploysOf(env)).toBe(1)
  })

  it('3) CI green → E2E red: waiting, then blocked (red, distinct from waiting) — no deploy', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'in_progress', null)]
    expect((await fire(env, wfEvent('CI', env.w.runs['ci.yml'][0]!))).decision).toBe('wait')
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'failure')]
    const late = await fire(env, wfEvent('E2E', env.w.runs['e2e.yml'][0]!))
    expect(late.decision).toBe('blocked')
    expect(late.reason).toMatch(/^blocked: E2E concluded 'failure'/)
    expect(late.failed.length).toBe(1)
    expect(deploysOf(env)).toBe(0)
  })

  it('4) E2E green → CI cancelled: waiting, then blocked — no deploy', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'in_progress', null)]
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'success')]
    expect((await fire(env, wfEvent('E2E', env.w.runs['e2e.yml'][0]!))).decision).toBe('wait')
    env.w.runs['ci.yml'] = [run(1, 'completed', 'cancelled')]
    const late = await fire(env, wfEvent('CI', env.w.runs['ci.yml'][0]!))
    expect(late.decision).toBe('blocked')
    expect(late.reason).toMatch(/CI concluded 'cancelled'/)
    expect(deploysOf(env)).toBe(0)
  })
})

describe('V31-02 gate: races and guards', () => {
  it('near-simultaneous completion: both events see both green → one deploy, the other is a duplicate no-op', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'success')]
    const a = await fire(env, wfEvent('CI', env.w.runs['ci.yml'][0]!))
    const b = await fire(env, wfEvent('E2E', env.w.runs['e2e.yml'][0]!))
    expect([a.deployed, b.deployed].filter(Boolean)).toHaveLength(1)
    expect(b.decision).toBe('duplicate')
    expect(deploysOf(env)).toBe(1)
  })

  it('both gates pass before either deploys (serialized deploy job): second pre-check skips', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'success')]
    const c1 = core(), c2 = core()
    const g1 = await gate.runGate({ github: env.github, context: wfEvent('CI', env.w.runs['ci.yml'][0]!), core: c1, graceMs: 0 })
    const g2 = await gate.runGate({ github: env.github, context: wfEvent('E2E', env.w.runs['e2e.yml'][0]!), core: c2, graceMs: 0 })
    expect([g1.decision, g2.decision]).toEqual(['deploy', 'deploy'])
    const p1 = await gate.preDeploy({ github: env.github, context: dispatch(), core: core(), sha: SHA })
    expect(p1.go).toBe(true)
    env.w.deployments.push({ id: 1, sha: SHA, ok: true })
    const p2 = await gate.preDeploy({ github: env.github, context: dispatch(), core: core(), sha: SHA })
    expect(p2.go).toBe(false)
    expect(p2.reason).toMatch(/^duplicate/)
  })

  it('cross-SHA: a late green event for an older SHA never overwrites newer main (gate)', async () => {
    const env = world()
    env.w.main = NEWER
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'success')]
    const r = await fire(env, wfEvent('E2E', env.w.runs['e2e.yml'][0]!))
    expect(r.decision).toBe('stale')
    expect(r.failed).toEqual([])
    expect(env.w.deployments).toHaveLength(0)
  })

  it('cross-SHA: main advances between gate and deploy → deploy job pre-check skips', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'success')]
    const c = core()
    expect((await gate.runGate({ github: env.github, context: wfEvent('E2E', env.w.runs['e2e.yml'][0]!), core: c, graceMs: 0 })).decision).toBe('deploy')
    env.w.main = NEWER
    const p = await gate.preDeploy({ github: env.github, context: dispatch(), core: core(), sha: SHA })
    expect(p.go).toBe(false)
    expect(p.reason).toMatch(/^stale/)
  })

  it('pull_request-triggered E2E/CI completions are ignored', async () => {
    const env = world()
    const pr = run(9, 'completed', 'success', { event: 'pull_request' })
    expect((await fire(env, wfEvent('E2E', pr))).decision).toBe('ignored')
  })

  it('a pull_request E2E success for the same SHA does not satisfy the gate', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'success', { event: 'pull_request' })]
    expect((await fire(env, wfEvent('CI', env.w.runs['ci.yml'][0]!))).decision).toBe('wait')
  })

  it('triggering run failed → blocked immediately', async () => {
    const env = world()
    const r = await fire(env, wfEvent('CI', run(1, 'completed', 'failure')))
    expect(r.decision).toBe('blocked')
  })

  it('run listing lags the completion payload: triggering run counts as green', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'in_progress', null)] // listing not yet updated
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'success')]
    expect((await fire(env, wfEvent('CI', run(1, 'completed', 'success')))).decision).toBe('deploy')
  })

  it('early event re-polls within the bounded grace and deploys if the other finishes meanwhile', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'in_progress', null)]
    let t = 0
    const c = core()
    const r = await gate.runGate({
      github: env.github, context: wfEvent('CI', env.w.runs['ci.yml'][0]!), core: c,
      graceMs: 60, pollMs: 20, now: () => t,
      sleep: async (ms: number) => { t += ms; if (t >= 40) env.w.runs['e2e.yml'] = [run(2, 'completed', 'success')] },
    })
    expect(r.decision).toBe('deploy')
    expect(c.log.filter((l) => l.includes('re-checking'))).toHaveLength(2)
  })

  it('bounded grace: early event gives up with a clear waiting notice (no failure)', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'in_progress', null)]
    let t = 0
    const c = core()
    const r = await gate.runGate({ github: env.github, context: wfEvent('CI', env.w.runs['ci.yml'][0]!), core: c, graceMs: 100, pollMs: 20, now: () => t, sleep: async (ms: number) => { t += ms } })
    expect(r.decision).toBe('wait')
    expect(c.failed).toEqual([])
    expect(c.log.at(-1)).toMatch(/^notice waiting for E2E/)
    expect(t).toBeLessThanOrEqual(100)
  })

  it('manual dispatch requires same-SHA CI + E2E green', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'in_progress', null)]
    const a = await fire(env, dispatch())
    expect(a.decision).toBe('blocked')
    expect(a.reason).toMatch(/E2E .* still in_progress/)
    env.w.runs['e2e.yml'] = []
    expect((await fire(env, dispatch())).reason).toMatch(/no E2E run/)
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'success')]
    const ok = await fire(env, dispatch())
    expect(ok.decision).toBe('deploy')
    // manual redeploy of an already-deployed SHA is allowed (explicit intent)
    expect((await fire(env, dispatch())).deployed).toBe(true)
  })

  it('a later green re-run after a red attempt counts (any success on the SHA, as in V11)', async () => {
    const env = world()
    env.w.runs['ci.yml'] = [run(1, 'completed', 'success')]
    env.w.runs['e2e.yml'] = [run(2, 'completed', 'failure'), run(3, 'completed', 'success', { event: 'workflow_dispatch' })]
    expect((await fire(env, wfEvent('E2E', env.w.runs['e2e.yml'][1]!))).decision).toBe('deploy')
  })
})
