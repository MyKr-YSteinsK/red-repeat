import type { Occurrence } from '../library/schema'

export interface EffectiveOccurrenceTiming {
  startMs: number
  endMs: number
}

export interface OccurrenceTimingProvider {
  getTiming(occurrence: Occurrence): EffectiveOccurrenceTiming
}

export const canonicalOccurrenceTiming: OccurrenceTimingProvider = {
  getTiming: (occurrence) => ({
    startMs: occurrence.startMs,
    endMs: occurrence.endMs,
  }),
}
