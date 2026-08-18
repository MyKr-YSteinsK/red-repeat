import type { Occurrence, Section } from '../library/schema'
import {
  toOccurrencesPlaybackRange,
  toSectionPlaybackRange,
  type PlaybackRange,
} from '../timeline/playback-ranges'
import type { TimelineResolution } from '../timeline/resolver'
import type { AssembledOccurrence, AssembledSongEdition } from '../runtime/song-edition'

export type LoopScope = '1' | '2' | '4' | 'section'
export type OccurrenceDirection = 'previous' | 'next'

export const LOOP_SCOPES: readonly LoopScope[] = [
  '1',
  '2',
  '4',
  'section',
]

export function findNavigationAnchor(
  model: AssembledSongEdition,
  selectedOccurrenceId: string | undefined,
  resolution: TimelineResolution,
): AssembledOccurrence | null {
  if (selectedOccurrenceId) {
    return model.occurrencesById[selectedOccurrenceId] ?? null
  }

  const primaryId = resolution.primaryOccurrence?.id
  return primaryId ? model.occurrencesById[primaryId] ?? null : null
}

export function findAdjacentOccurrence(
  model: AssembledSongEdition,
  direction: OccurrenceDirection,
  selectedOccurrenceId: string | undefined,
  resolution: TimelineResolution,
): AssembledOccurrence | null {
  const anchor = findNavigationAnchor(
    model,
    selectedOccurrenceId,
    resolution,
  )
  if (!anchor) {
    const fallback =
      direction === 'previous'
        ? resolution.previousOccurrence
        : resolution.nextOccurrence
    return fallback ? model.occurrencesById[fallback.id] ?? null : null
  }

  const index = model.chronologicalOccurrences.findIndex(
    ({ occurrence }) => occurrence.id === anchor.occurrence.id,
  )
  const targetIndex = direction === 'previous' ? index - 1 : index + 1
  return model.chronologicalOccurrences[targetIndex] ?? null
}

export function getLoopRange(
  model: AssembledSongEdition,
  scope: LoopScope,
  anchor: AssembledOccurrence | null,
  currentSection: Section | null,
): PlaybackRange | null {
  if (scope === 'section') {
    if (!currentSection) {
      return null
    }
    return toSectionPlaybackRange(
      currentSection,
      model.occurrencesBySectionId[currentSection.id]?.map(
        ({ occurrence }) => occurrence,
      ) ?? [],
    )
  }

  if (!anchor) {
    return null
  }

  const count = Number(scope)
  const anchorIndex = model.chronologicalOccurrences.findIndex(
    ({ occurrence }) => occurrence.id === anchor.occurrence.id,
  )
  const occurrences = model.chronologicalOccurrences
    .slice(anchorIndex, anchorIndex + count)
    .map(({ occurrence }) => occurrence)
  return toOccurrencesPlaybackRange(occurrences)
}

export function getLoopScopeLabel(scope: LoopScope): string {
  return scope === 'section' ? 'Section' : `${scope} line${scope === '1' ? '' : 's'}`
}

export function getOccurrenceIds(
  occurrences: readonly AssembledOccurrence[],
): string[] {
  return occurrences.map(({ occurrence }) => occurrence.id)
}

export function getRawOccurrences(
  occurrences: readonly AssembledOccurrence[],
): Occurrence[] {
  return occurrences.map(({ occurrence }) => occurrence)
}
