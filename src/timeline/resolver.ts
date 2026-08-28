import type {
  Occurrence,
  Section,
  TimelineDocument,
} from '../library/schema'
import {
  canonicalOccurrenceTiming,
  type EffectiveOccurrenceTiming,
  type OccurrenceTimingProvider,
} from './occurrence-timing'

export interface TimelineResolution {
  currentSection: Section | null
  activeOccurrences: Occurrence[]
  primaryOccurrence: Occurrence | null
  previousOccurrence: Occurrence | null
  nextOccurrence: Occurrence | null
  sectionProgress: number | null
}

interface IndexedOccurrence {
  occurrence: Occurrence
  sourceIndex: number
  timing: EffectiveOccurrenceTiming
}

/**
 * Resolves a validated Timeline at a non-negative media time in milliseconds.
 * All ranges use [startMs, endMs) semantics.
 */
export function resolveTimeline(
  timeline: TimelineDocument,
  currentTimeMs: number,
  timingProvider: OccurrenceTimingProvider = canonicalOccurrenceTiming,
): TimelineResolution {
  if (!Number.isFinite(currentTimeMs) || currentTimeMs < 0) {
    throw new RangeError('currentTimeMs must be a finite non-negative number')
  }

  const currentSection =
    timeline.sections.find(
      (section) =>
        section.startMs <= currentTimeMs && currentTimeMs < section.endMs,
    ) ?? null
  const orderedOccurrences = timeline.occurrences
    .map((occurrence, sourceIndex) => ({
      occurrence,
      sourceIndex,
      timing: timingProvider.getTiming(occurrence),
    }))
    .sort(compareIndexedOccurrences)
  const activeEntries = orderedOccurrences
    .filter(
      ({ timing }) => timing.startMs <= currentTimeMs && currentTimeMs < timing.endMs,
    )
  const activeOccurrences = activeEntries.map(({ occurrence }) => occurrence)
  const primaryOccurrence = activeOccurrences[0] ?? null
  const primaryIndex = primaryOccurrence
    ? orderedOccurrences.findIndex(({ occurrence }) => occurrence === primaryOccurrence)
    : -1

  const previousOccurrence = primaryOccurrence
    ? (orderedOccurrences[primaryIndex - 1]?.occurrence ?? null)
    : findPreviousOccurrence(orderedOccurrences, currentTimeMs)
  const nextOccurrence = primaryOccurrence
    ? (orderedOccurrences[primaryIndex + 1]?.occurrence ?? null)
    : findNextOccurrence(orderedOccurrences, currentTimeMs)

  return {
    currentSection,
    activeOccurrences,
    primaryOccurrence,
    previousOccurrence,
    nextOccurrence,
    sectionProgress: currentSection
      ? clampProgress(
          (currentTimeMs - currentSection.startMs) /
            (currentSection.endMs - currentSection.startMs),
        )
      : null,
  }
}

function compareIndexedOccurrences(
  left: IndexedOccurrence,
  right: IndexedOccurrence,
): number {
  return left.timing.startMs - right.timing.startMs ||
    left.sourceIndex - right.sourceIndex
}

function findPreviousOccurrence(
  orderedOccurrences: IndexedOccurrence[],
  currentTimeMs: number,
): Occurrence | null {
  return (
    orderedOccurrences
      .filter(({ timing }) => timing.endMs <= currentTimeMs)
      .at(-1)?.occurrence ?? null
  )
}

function findNextOccurrence(
  orderedOccurrences: IndexedOccurrence[],
  currentTimeMs: number,
): Occurrence | null {
  return (
    orderedOccurrences.find(({ timing }) => timing.startMs > currentTimeMs)
      ?.occurrence ?? null
  )
}

function clampProgress(progress: number): number {
  return Math.min(Math.max(progress, 0), 1)
}
