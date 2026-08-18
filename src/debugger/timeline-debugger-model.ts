import type { TimelineDocument } from '../library/schema'

export function cloneTimeline(timeline: TimelineDocument): TimelineDocument {
  return {
    audioSourceHash: timeline.audioSourceHash,
    sections: timeline.sections.map((section) => ({ ...section })),
    occurrences: timeline.occurrences.map((occurrence) => ({ ...occurrence })),
  }
}
