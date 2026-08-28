import type { Occurrence, Section } from '../library/schema'

export interface PlaybackRange {
  startMs: number
  endMs: number
}

export function toOccurrencePlaybackRange(
  occurrence: Occurrence,
): PlaybackRange {
  return createPlaybackRange(occurrence.startMs, occurrence.endMs)
}

export function toOccurrencesPlaybackRange(
  occurrences: readonly Occurrence[],
): PlaybackRange | null {
  if (occurrences.length === 0) {
    return null
  }

  const startMs = Math.min(...occurrences.map(({ startMs }) => startMs))
  const endMs = Math.max(...occurrences.map(({ endMs }) => endMs))
  return createPlaybackRange(startMs, endMs)
}

export function toSectionPlaybackRange(
  section: Section,
  occurrences: readonly Occurrence[],
): PlaybackRange | null {
  return toOccurrencesPlaybackRange(
    occurrences.filter(({ sectionId }) => sectionId === section.id),
  )
}

function createPlaybackRange(startMs: number, endMs: number): PlaybackRange {
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    startMs < 0 ||
    startMs >= endMs
  ) {
    throw new RangeError('playback range must satisfy 0 <= startMs < endMs')
  }

  return { startMs, endMs }
}
