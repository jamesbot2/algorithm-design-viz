import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initialPlaybackState, playbackReducer, type PlaybackState } from '../src/components/workbench/playbackIntent'

const run = (s: PlaybackState, ...as: Parameters<typeof playbackReducer>[1][]) => as.reduce(playbackReducer, s)

describe('V30 playback action intent (pure reducer)', () => {
  const max = 4
  it('autoplay advances with intent autoAdvance; real from→to', () => {
    const s = run(initialPlaybackState(0), { type: 'togglePlay', len: 5 }, { type: 'autoAdvance', max })
    expect(s.playing).toBe(true)
    expect(s.t).toMatchObject({ from: 0, to: 1, intent: 'autoAdvance', motionPaused: false, snapshot: false })
  })

  it('V30-01 auto→manual Next: timer stops, new transition NOT paused', () => {
    const s0 = run(initialPlaybackState(0), { type: 'togglePlay', len: 5 }, { type: 'autoAdvance', max }, { type: 'autoAdvance', max })
    const s = playbackReducer(s0, { type: 'manualNext', max })
    expect(s.idx).toBe(3)
    expect(s.playing).toBe(false)
    expect(s.t).toMatchObject({ from: 2, to: 3, intent: 'manualNext', motionPaused: false, snapshot: false })
    expect(s.t.transitionId).toBe(s0.t.transitionId + 1)
    // a stale timer tick after takeover is swallowed
    expect(playbackReducer(s, { type: 'autoAdvance', max })).toBe(s)
  })

  it('Pause freezes (motionPaused) without moving the cursor; resume continues', () => {
    const playing = run(initialPlaybackState(0), { type: 'togglePlay', len: 5 }, { type: 'autoAdvance', max })
    const paused = playbackReducer(playing, { type: 'togglePlay', len: 5 })
    expect(paused.idx).toBe(1)
    expect(paused.t).toMatchObject({ intent: 'pause', motionPaused: true, transitionId: playing.t.transitionId })
    const resumed = playbackReducer(paused, { type: 'togglePlay', len: 5 })
    expect(resumed.t).toMatchObject({ intent: 'resume', motionPaused: false, transitionId: playing.t.transitionId })
    expect(resumed.playing).toBe(true)
  })

  it('paused → manual Next / Prev clears pause intent and records real direction', () => {
    const paused = run(initialPlaybackState(2), { type: 'togglePlay', len: 5 }, { type: 'togglePlay', len: 5 })
    const n = playbackReducer(paused, { type: 'manualNext', max })
    expect(n.t).toMatchObject({ from: 2, to: 3, motionPaused: false })
    const p = playbackReducer(n, { type: 'manualPrev' })
    expect(p.t).toMatchObject({ from: 3, to: 2, intent: 'manualPrev', motionPaused: false, snapshot: false })
  })

  it('seek / reset / replaceRun / replay are snapshot jumps', () => {
    const s = initialPlaybackState(3)
    expect(playbackReducer(s, { type: 'seek', target: 1, len: 5 }).t).toMatchObject({ intent: 'seek', snapshot: true, from: 3, to: 1 })
    expect(playbackReducer(s, { type: 'seek', target: 0, len: 5, intent: 'reset' }).t).toMatchObject({ intent: 'reset', snapshot: true })
    expect(playbackReducer(s, { type: 'seek', target: 0, len: 5, intent: 'replaceRun' }).t.snapshot).toBe(true)
    const end = initialPlaybackState(4)
    const replay = playbackReducer(end, { type: 'togglePlay', len: 5 })
    expect(replay).toMatchObject({ idx: 0, playing: true })
    expect(replay.t).toMatchObject({ intent: 'replay', snapshot: true })
  })

  it('autoplay completes at the end without moving; rapid Next is bounded', () => {
    const s = run(initialPlaybackState(4), { type: 'togglePlay', len: 6 }, { type: 'autoAdvance', max: 5 }, { type: 'autoAdvance', max: 5 })
    expect(s).toMatchObject({ idx: 5, playing: false })
    expect(s.t.intent).toBe('complete')
    let r = initialPlaybackState(0)
    for (let i = 0; i < 10; i++) r = playbackReducer(r, { type: 'manualNext', max })
    expect(r.idx).toBe(max)
    expect(r.t.transitionId).toBe(max)
  })

  it('ArrayView consults transition.motionPaused, not the autoplay flag, to pause motion', () => {
    const av = readFileSync(resolve(__dirname, '../src/components/ArrayView.tsx'), 'utf8')
    expect(av).toMatch(/transition\?\.motionPaused/)
    expect(av).not.toMatch(/playbackPlaying/)
    expect(av).toMatch(/lastIdsRef\.current \?\? prevElementIds/)
  })
})
