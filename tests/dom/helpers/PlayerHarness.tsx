/**
 * V23 test harness: the PRODUCTION composition of one learning page's player —
 * usePlaybackController (the single cursor/timer) + Visualizer (scene) +
 * PlaybackTransport (the one transport). Before V23 the Visualizer owned the
 * timer and rendered its own transport; tests that mounted <Visualizer steps…/>
 * now mount this harness with the same props, so their assertions are unchanged.
 */
import Visualizer from '../../../src/components/Visualizer'
import PlaybackTransport from '../../../src/components/workbench/PlaybackTransport'
import { usePlaybackController, type PlaybackOptions } from '../../../src/components/workbench/usePlaybackController'

export type { SeekCommand } from '../../../src/components/workbench/usePlaybackController'

export default function PlayerHarness(props: PlaybackOptions & { staleResult?: boolean }) {
  const { staleResult, ...opts } = props
  const player = usePlaybackController(opts)
  return (
    <div data-testid="player-harness">
      <Visualizer key={String(opts.runId ?? '')} player={player} staleResult={staleResult} />
      <PlaybackTransport {...player.transportProps} />
    </div>
  )
}
