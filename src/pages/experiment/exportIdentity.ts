/** Completed experiment identity for export filenames — never use live draft selector alone. */
export type ExperimentWhich = 'maxsub' | 'knapsack' | 'dijkstra'

export type CompletedExperiment = {
  which: ExperimentWhich
  title?: string
}

/**
 * Basename for export files. Always from the completed snapshot.
 * Draft `which` is ignored so switching experiments without re-run cannot rename exports.
 */
export function exportBasename(completed: CompletedExperiment, _draftWhich?: ExperimentWhich): string {
  return `experiment-${completed.which}`
}
