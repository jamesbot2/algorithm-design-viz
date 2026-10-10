/**
 * V31-02 Pages deploy gate — same-SHA CI + E2E, in EITHER completion order.
 *
 * deploy-pages.yml runs on `workflow_run: completed` of BOTH "CI" and "E2E" (and on manual
 * dispatch). Each event runs this gate for the triggering run's head SHA:
 *   - the EARLY event (the other workflow still running) waits a short bounded grace, then exits
 *     cleanly with `wait` ("waiting for E2E") — the LATE event will deploy;
 *   - the LATE event sees both green on the same SHA and returns `deploy`;
 *   - any failure / cancel / timeout of either workflow for that SHA → `blocked` (no deploy);
 *   - SHA no longer the tip of main → `stale` (an older SHA never overwrites newer main);
 *   - this SHA already has a successful github-pages deployment → `duplicate` (both events saw
 *     both green: the second one is a no-op); the deploy job re-checks this right before deploying,
 *     serialized by the `pages` concurrency group.
 * Pure decision logic (`decide`) is separated from REST I/O (`collect`) so it is unit-tested with
 * mocked REST responses (tests/v31-deploy-gate.test.ts) — never experimented on production main.
 */
'use strict'

const WORKFLOWS = { CI: 'ci.yml', E2E: 'e2e.yml' }
const OTHER = { CI: 'E2E', E2E: 'CI' }

/** Summarize all runs of one workflow for one SHA (push / dispatch on main only). */
function summarize(runs, sha) {
  const mine = (runs || []).filter(
    (r) => r.head_sha === sha && (r.event === 'push' || r.event === 'workflow_dispatch') && (r.head_branch == null || r.head_branch === 'main'),
  )
  if (!mine.length) return { state: 'missing', run: null }
  const ok = mine.find((r) => r.status === 'completed' && r.conclusion === 'success')
  if (ok) return { state: 'success', run: ok }
  const live = mine.find((r) => r.status !== 'completed')
  if (live) return { state: 'pending', run: live }
  const last = mine.slice().sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0]
  return { state: 'failed', run: last, conclusion: last.conclusion }
}

/**
 * @param {object} f facts
 *   f.event          'workflow_run' | 'workflow_dispatch'
 *   f.trigger        { name: 'CI'|'E2E', conclusion, event, head_sha, head_branch, id } (workflow_run only)
 *   f.sha            target SHA
 *   f.mainSha        current tip of main
 *   f.ci, f.e2e      summarize() results
 *   f.deployedOk     true when github-pages already has a successful deployment of f.sha
 * @returns {{ decision: 'deploy'|'wait'|'blocked'|'stale'|'duplicate'|'ignored', reason: string }}
 */
function decide(f) {
  const short = String(f.sha).slice(0, 7)
  if (f.event === 'workflow_run') {
    const t = f.trigger || {}
    if (t.event !== 'push' && t.event !== 'workflow_dispatch') return { decision: 'ignored', reason: `ignored: ${t.name} run ${t.id} was triggered by '${t.event}', not a push / dispatch on main` }
    if (t.head_branch && t.head_branch !== 'main') return { decision: 'ignored', reason: `ignored: ${t.name} ran on '${t.head_branch}', not main` }
    if (t.conclusion !== 'success') return { decision: 'blocked', reason: `blocked: ${t.name} concluded '${t.conclusion}' for ${short} — no deploy` }
  }
  if (f.mainSha && f.mainSha !== f.sha) return { decision: 'stale', reason: `stale: ${short} is no longer the tip of main (${String(f.mainSha).slice(0, 7)}) — an older SHA never overwrites newer main` }
  const by = { CI: f.ci, E2E: f.e2e }
  // the triggering run's own completion payload is authoritative (the run listing may lag it)
  if (f.event === 'workflow_run' && by[f.trigger.name].state !== 'success') by[f.trigger.name] = { state: 'success', run: { id: f.trigger.id } }
  for (const name of ['CI', 'E2E']) {
    const s = by[name]
    if (s.state === 'failed') return { decision: 'blocked', reason: `blocked: ${name} concluded '${s.conclusion}' for ${short} — no deploy` }
  }
  for (const name of f.event === 'workflow_run' ? [OTHER[f.trigger.name], f.trigger.name] : ['CI', 'E2E']) {
    const s = by[name]
    if (s.state === 'pending') {
      return f.event === 'workflow_run'
        ? { decision: 'wait', reason: `waiting for ${name} on ${short} (run ${s.run.id} ${s.run.status}) — its completion event will deploy` }
        : { decision: 'blocked', reason: `blocked: ${name} for ${short} is still ${s.run.status}; manual deploy requires same-SHA CI + E2E success` }
    }
    if (s.state === 'missing') {
      return f.event === 'workflow_run'
        ? { decision: 'wait', reason: `waiting for ${name} on ${short} (no run listed yet) — its completion event will deploy` }
        : { decision: 'blocked', reason: `blocked: no ${name} run for ${short}; manual deploy requires same-SHA CI + E2E success` }
    }
  }
  if (f.event === 'workflow_run' && f.deployedOk) return { decision: 'duplicate', reason: `duplicate: ${short} already deployed to github-pages by the other completion event` }
  return { decision: 'deploy', reason: `deploy: CI run ${by.CI.run.id} + E2E run ${by.E2E.run.id} both succeeded on ${short} (tip of main)` }
}

async function listRuns(github, owner, repo, wf, sha) {
  const res = await github.rest.actions.listWorkflowRuns({ owner, repo, workflow_id: WORKFLOWS[wf], head_sha: sha, per_page: 50 })
  return (res.data && res.data.workflow_runs) || []
}

async function deployedOk(github, owner, repo, sha) {
  const res = await github.rest.repos.listDeployments({ owner, repo, environment: 'github-pages', sha, per_page: 20 })
  for (const d of res.data || []) {
    const st = await github.rest.repos.listDeploymentStatuses({ owner, repo, deployment_id: d.id, per_page: 5 })
    if ((st.data || []).some((s) => s.state === 'success')) return true
  }
  return false
}

async function collect({ github, context, sha }) {
  const { owner, repo } = context.repo
  const [ciRuns, e2eRuns, branch] = await Promise.all([
    listRuns(github, owner, repo, 'CI', sha),
    listRuns(github, owner, repo, 'E2E', sha),
    github.rest.repos.getBranch({ owner, repo, branch: 'main' }),
  ])
  return { ci: summarize(ciRuns, sha), e2e: summarize(e2eRuns, sha), mainSha: branch.data.commit.sha }
}

/**
 * Gate entry for actions/github-script. Early events re-poll a bounded grace (both workflows can
 * finish within seconds of each other; the REST listing may lag the event) before reporting wait.
 */
async function runGate({ github, context, core, graceMs = 120000, pollMs = 20000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = () => Date.now() }) {
  const event = context.eventName
  const wr = context.payload.workflow_run
  const trigger = event === 'workflow_run' ? { name: wr.name, conclusion: wr.conclusion, event: wr.event, head_sha: wr.head_sha, head_branch: wr.head_branch, id: wr.id } : null
  const sha = trigger ? trigger.head_sha : context.sha
  const { owner, repo } = context.repo
  const t0 = now()
  let out
  for (;;) {
    const facts = { event, trigger, sha, ...(await collect({ github, context, sha })) }
    if (event === 'workflow_run' && facts.ci.state === 'success' && facts.e2e.state === 'success' && facts.mainSha === sha) {
      facts.deployedOk = await deployedOk(github, owner, repo, sha)
    }
    out = decide(facts)
    if (out.decision !== 'wait' || now() - t0 + pollMs > graceMs) break
    core.info(`${out.reason} — re-checking in ${Math.round(pollMs / 1000)}s`)
    await sleep(pollMs)
  }
  core.setOutput('decision', out.decision)
  core.setOutput('sha', sha)
  core.setOutput('reason', out.reason)
  if (out.decision === 'blocked') core.setFailed(`Deploy ${out.reason}`)
  else if (out.decision === 'deploy') core.info(out.reason)
  else core.notice(out.reason)
  return out
}

/** Deploy-job pre-check: still the tip of main, not yet deployed (serialized by concurrency `pages`). */
async function preDeploy({ github, context, core, sha, manual = false }) {
  const { owner, repo } = context.repo
  const branch = await github.rest.repos.getBranch({ owner, repo, branch: 'main' })
  if (branch.data.commit.sha !== sha) {
    const reason = `stale: ${sha.slice(0, 7)} is no longer the tip of main (${branch.data.commit.sha.slice(0, 7)}) — skipping deploy`
    core.setOutput('go', 'false')
    core.notice(reason)
    return { go: false, reason }
  }
  if (!manual && (await deployedOk(github, owner, repo, sha))) {
    const reason = `duplicate: ${sha.slice(0, 7)} already deployed — skipping`
    core.setOutput('go', 'false')
    core.notice(reason)
    return { go: false, reason }
  }
  core.setOutput('go', 'true')
  return { go: true, reason: 'go' }
}

module.exports = { decide, summarize, collect, runGate, preDeploy, WORKFLOWS }
