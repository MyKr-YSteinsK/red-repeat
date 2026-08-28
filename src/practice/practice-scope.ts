import type {
  Occurrence,
  PracticeDocument,
  PracticeUnit,
  TimelineDocument,
} from '../library/schema'
import {
  canonicalOccurrenceTiming,
  type OccurrenceTimingProvider,
} from '../timeline/occurrence-timing'

export type PracticeScope =
  | { kind: 'currentOccurrence'; occurrenceId: string }
  | {
      kind: 'coveredRange'
      practiceUnitId: string
      endOccurrenceId: string
    }
  | { kind: 'customRange'; startOccurrenceId: string; endOccurrenceId: string }
  | { kind: 'practiceUnit'; practiceUnitId: string }

export interface ResolvedPracticeRange {
  startMs: number
  endMs: number
  occurrenceIds: readonly string[]
}

export type PracticeOccurrenceDirection = 'previous' | 'next'

export interface PracticeIndex {
  units: readonly PracticeUnit[]
  unitsById: ReadonlyMap<string, PracticeUnit>
  occurrencesById: ReadonlyMap<string, Occurrence>
  occurrenceIdsByUnitId: ReadonlyMap<string, readonly string[]>
  unitIdByOccurrenceId: ReadonlyMap<string, string>
  chronologicalOccurrenceIds: readonly string[]
}

export function createPracticeIndex(
  practice: PracticeDocument,
  timeline: TimelineDocument,
): PracticeIndex {
  const occurrencesById = new Map<string, Occurrence>()
  timeline.occurrences.forEach((occurrence) => {
    if (occurrencesById.has(occurrence.id)) {
      throw new Error(`duplicate Timeline Occurrence ${occurrence.id}`)
    }
    occurrencesById.set(occurrence.id, occurrence)
  })

  const unitsById = new Map<string, PracticeUnit>()
  const occurrenceIdsByUnitId = new Map<string, readonly string[]>()
  const unitIdByOccurrenceId = new Map<string, string>()
  const sectionIds = new Set(timeline.sections.map((section) => section.id))

  practice.units.forEach((unit) => {
    if (unitsById.has(unit.id)) {
      throw new Error(`duplicate Practice Unit ${unit.id}`)
    }
    if (!sectionIds.has(unit.sectionId)) {
      throw new Error(
        `Practice Unit ${unit.id} references missing Section ${unit.sectionId}`,
      )
    }
    if (unit.occurrenceIds.length === 0) {
      throw new Error(`Practice Unit ${unit.id} must contain an Occurrence`)
    }

    let previousOccurrence: Occurrence | undefined
    unit.occurrenceIds.forEach((occurrenceId) => {
      const occurrence = occurrencesById.get(occurrenceId)
      if (!occurrence) {
        throw new Error(
          `Practice Unit ${unit.id} references missing Occurrence ${occurrenceId}`,
        )
      }
      if (occurrence.sectionId !== unit.sectionId) {
        throw new Error(
          `Practice Unit ${unit.id} crosses Section boundary at ${occurrenceId}`,
        )
      }
      if (unitIdByOccurrenceId.has(occurrenceId)) {
        throw new Error(`Occurrence ${occurrenceId} belongs to multiple Units`)
      }
      if (previousOccurrence && compareOccurrence(previousOccurrence, occurrence) > 0) {
        throw new Error(
          `Practice Unit ${unit.id} Occurrences are not chronological`,
        )
      }
      previousOccurrence = occurrence
      unitIdByOccurrenceId.set(occurrenceId, unit.id)
    })

    unitsById.set(unit.id, unit)
    occurrenceIdsByUnitId.set(unit.id, [...unit.occurrenceIds])
  })

  const chronologicalOccurrenceIds = [...timeline.occurrences]
    .sort(compareOccurrence)
    .map(({ id }) => id)

  return {
    units: [...practice.units],
    unitsById,
    occurrencesById,
    occurrenceIdsByUnitId,
    unitIdByOccurrenceId,
    chronologicalOccurrenceIds,
  }
}

export function resolvePracticeRange(
  scope: PracticeScope,
  practice: PracticeDocument,
  timeline: TimelineDocument,
  timingProvider: OccurrenceTimingProvider = canonicalOccurrenceTiming,
): ResolvedPracticeRange {
  const index = createPracticeIndex(practice, timeline)
  const occurrenceIds = resolveScopeOccurrenceIds(scope, index)
  if (occurrenceIds.length === 0) {
    throw new Error('Practice scope resolved to an empty Occurrence range')
  }

  const firstOccurrence = getOccurrence(index, occurrenceIds[0])
  const lastOccurrence = getOccurrence(index, occurrenceIds[occurrenceIds.length - 1])
  const firstTiming = timingProvider.getTiming(firstOccurrence)
  const lastTiming = timingProvider.getTiming(lastOccurrence)

  if (
    !Number.isFinite(firstTiming.startMs) ||
    !Number.isFinite(lastTiming.endMs) ||
    firstTiming.startMs < 0 ||
    firstTiming.startMs >= lastTiming.endMs
  ) {
    throw new Error('Practice scope produced an invalid continuous playback range')
  }

  return {
    startMs: firstTiming.startMs,
    endMs: lastTiming.endMs,
    occurrenceIds,
  }
}

export function resolvePracticeUnitRangeFromOccurrence(
  practiceUnitId: string,
  startOccurrenceId: string,
  practice: PracticeDocument,
  timeline: TimelineDocument,
  timingProvider: OccurrenceTimingProvider = canonicalOccurrenceTiming,
): ResolvedPracticeRange {
  const index = createPracticeIndex(practice, timeline)
  const occurrenceIds = getUnitOccurrenceIds(index, practiceUnitId)
  const startIndex = occurrenceIds.indexOf(startOccurrenceId)
  if (startIndex < 0) {
    throw new Error(
      `Occurrence ${startOccurrenceId} does not belong to Practice Unit ${practiceUnitId}`,
    )
  }

  return resolvePracticeRange(
    {
      kind: 'customRange',
      startOccurrenceId: occurrenceIds[startIndex],
      endOccurrenceId: occurrenceIds[occurrenceIds.length - 1],
    },
    practice,
    timeline,
    timingProvider,
  )
}

export function getPracticeUnit(
  index: PracticeIndex,
  practiceUnitId: string,
): PracticeUnit {
  const unit = index.unitsById.get(practiceUnitId)
  if (!unit) {
    throw new Error(`unknown Practice Unit ${practiceUnitId}`)
  }
  return unit
}

export function getPracticeOccurrence(
  index: PracticeIndex,
  occurrenceId: string,
): Occurrence {
  return getOccurrence(index, occurrenceId)
}

export function getAdjacentPracticeOccurrence(
  index: PracticeIndex,
  practiceUnitId: string,
  occurrenceId: string,
  direction: PracticeOccurrenceDirection,
): string | null {
  const occurrenceIds = index.occurrenceIdsByUnitId.get(practiceUnitId)
  if (!occurrenceIds) {
    throw new Error(`unknown Practice Unit ${practiceUnitId}`)
  }
  const currentIndex = occurrenceIds.indexOf(occurrenceId)
  if (currentIndex < 0) {
    throw new Error(
      `Occurrence ${occurrenceId} does not belong to Practice Unit ${practiceUnitId}`,
    )
  }
  const targetIndex = direction === 'previous' ? currentIndex - 1 : currentIndex + 1
  return occurrenceIds[targetIndex] ?? null
}

export function getAdjacentPracticeUnit(
  index: PracticeIndex,
  practiceUnitId: string,
  direction: PracticeOccurrenceDirection,
): PracticeUnit | null {
  const currentIndex = index.units.findIndex(({ id }) => id === practiceUnitId)
  if (currentIndex < 0) {
    throw new Error(`unknown Practice Unit ${practiceUnitId}`)
  }
  const targetIndex = direction === 'previous' ? currentIndex - 1 : currentIndex + 1
  return index.units[targetIndex] ?? null
}

function resolveScopeOccurrenceIds(
  scope: PracticeScope,
  index: PracticeIndex,
): readonly string[] {
  if (scope.kind === 'currentOccurrence') {
    getOccurrence(index, scope.occurrenceId)
    return [scope.occurrenceId]
  }

  if (scope.kind === 'practiceUnit') {
    return getUnitOccurrenceIds(index, scope.practiceUnitId)
  }

  if (scope.kind === 'coveredRange') {
    const occurrenceIds = getUnitOccurrenceIds(index, scope.practiceUnitId)
    const endIndex = occurrenceIds.indexOf(scope.endOccurrenceId)
    if (endIndex < 0) {
      throw new Error(
        `Occurrence ${scope.endOccurrenceId} does not belong to Practice Unit ${scope.practiceUnitId}`,
      )
    }
    return occurrenceIds.slice(0, endIndex + 1)
  }

  const startIndex = index.chronologicalOccurrenceIds.indexOf(
    scope.startOccurrenceId,
  )
  const endIndex = index.chronologicalOccurrenceIds.indexOf(scope.endOccurrenceId)
  if (startIndex < 0 || endIndex < 0) {
    throw new Error('custom Practice range references an unknown Occurrence')
  }
  if (startIndex > endIndex) {
    throw new Error('custom Practice range must be chronological')
  }
  return index.chronologicalOccurrenceIds.slice(startIndex, endIndex + 1)
}

function getUnitOccurrenceIds(
  index: PracticeIndex,
  practiceUnitId: string,
): readonly string[] {
  const occurrenceIds = index.occurrenceIdsByUnitId.get(practiceUnitId)
  if (!occurrenceIds) {
    throw new Error(`unknown Practice Unit ${practiceUnitId}`)
  }
  return occurrenceIds
}

function getOccurrence(index: PracticeIndex, occurrenceId: string): Occurrence {
  const occurrence = index.occurrencesById.get(occurrenceId)
  if (!occurrence) {
    throw new Error(`unknown Occurrence ${occurrenceId}`)
  }
  return occurrence
}

function compareOccurrence(left: Occurrence, right: Occurrence): number {
  return left.startMs - right.startMs
}
