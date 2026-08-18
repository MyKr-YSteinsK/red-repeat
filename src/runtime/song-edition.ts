import type {
  CatalogEdition,
  RuntimeEdition,
  RuntimeFeatureDescriptor,
} from '../library/runtime-schema'
import type {
  LyricsDocument,
  Occurrence,
  Section,
  Segment,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'

export interface RuntimeFeatureContent {
  descriptor: RuntimeFeatureDescriptor
  content: string
}

export interface AssembledOccurrence {
  occurrence: Occurrence
  segment: Segment
  section: Section
  sourceIndex: number
}

export interface AssembledSection {
  section: Section
  occurrences: readonly AssembledOccurrence[]
}

export interface AssembledSongEdition {
  catalogEdition: CatalogEdition
  edition: RuntimeEdition
  lyrics: LyricsDocument
  timeline: TimelineDocument
  visual: VisualDocument
  features: readonly RuntimeFeatureContent[]
  segmentsById: Readonly<Record<string, Segment>>
  occurrencesById: Readonly<Record<string, AssembledOccurrence>>
  occurrencesBySegmentId: Readonly<
    Record<string, readonly AssembledOccurrence[]>
  >
  occurrencesBySectionId: Readonly<
    Record<string, readonly AssembledOccurrence[]>
  >
  sections: readonly AssembledSection[]
  chronologicalOccurrences: readonly AssembledOccurrence[]
}

export interface AssembleSongEditionInput {
  catalogEdition: CatalogEdition
  edition: RuntimeEdition
  lyrics: LyricsDocument
  timeline: TimelineDocument
  visual: VisualDocument
  features: readonly RuntimeFeatureContent[]
}

export function assembleRuntimeSongEdition(
  input: AssembleSongEditionInput,
): AssembledSongEdition {
  assertCatalogConsistency(input.catalogEdition, input.edition, input.visual)

  const segmentsById = indexById(input.lyrics.segments, 'Segment')
  const sectionsById = indexById(input.timeline.sections, 'Section')
  indexById(input.timeline.occurrences, 'Occurrence')
  const assembledOccurrences = input.timeline.occurrences.map(
    (occurrence, sourceIndex): AssembledOccurrence => {
      const segment = segmentsById[occurrence.segmentId]
      if (!segment) {
        throw new Error(
          `Occurrence ${occurrence.id} references missing Segment ${occurrence.segmentId}`,
        )
      }

      const section = sectionsById[occurrence.sectionId]
      if (!section) {
        throw new Error(
          `Occurrence ${occurrence.id} references missing Section ${occurrence.sectionId}`,
        )
      }

      return { occurrence, segment, section, sourceIndex }
    },
  )
  const chronologicalOccurrences = [...assembledOccurrences].sort(
    compareChronologicalOccurrences,
  )

  const occurrencesBySegmentId = groupOccurrences(
    chronologicalOccurrences,
    ({ segment }) => segment.id,
  )
  const occurrencesBySectionId = groupOccurrences(
    chronologicalOccurrences,
    ({ section }) => section.id,
  )
  const sections = input.timeline.sections.map((section) => ({
    section,
    occurrences: occurrencesBySectionId[section.id] ?? [],
  }))

  return {
    catalogEdition: input.catalogEdition,
    edition: input.edition,
    lyrics: input.lyrics,
    timeline: input.timeline,
    visual: input.visual,
    features: assembleFeatures(input.edition.features, input.features),
    segmentsById,
    occurrencesById: Object.fromEntries(
      assembledOccurrences.map(({ occurrence, ...assembled }) => [
        occurrence.id,
        { occurrence, ...assembled },
      ]),
    ),
    occurrencesBySegmentId,
    occurrencesBySectionId,
    sections,
    chronologicalOccurrences,
  }
}

function assertCatalogConsistency(
  catalogEdition: CatalogEdition,
  edition: RuntimeEdition,
  visual: VisualDocument,
): void {
  const metadataFields: Array<
    'songId' | 'title' | 'artist' | 'album' | 'year'
  > = [
    'songId',
    'title',
    'artist',
    'album',
    'year',
  ]

  metadataFields.forEach((field) => {
    if (catalogEdition[field] !== edition.song[field]) {
      throw new Error(
        `catalog and edition metadata mismatch for ${String(field)}`,
      )
    }
  })

  if (catalogEdition.recommendedTheme !== visual.recommendedTheme) {
    throw new Error('catalog and visual recommendedTheme do not match')
  }
}

function assembleFeatures(
  descriptors: readonly RuntimeFeatureDescriptor[],
  contents: readonly RuntimeFeatureContent[],
): readonly RuntimeFeatureContent[] {
  const contentById = new Map<string, RuntimeFeatureContent>()
  contents.forEach((feature) => {
    if (contentById.has(feature.descriptor.id)) {
      throw new Error(`duplicate Feature content ${feature.descriptor.id}`)
    }
    contentById.set(feature.descriptor.id, feature)
  })

  const assembled = descriptors.map((descriptor) => {
    const feature = contentById.get(descriptor.id)
    if (!feature) {
      throw new Error(`missing Feature content ${descriptor.id}`)
    }
    if (feature.descriptor.url !== descriptor.url) {
      throw new Error(`Feature URL mismatch for ${descriptor.id}`)
    }
    return { descriptor, content: feature.content }
  })

  if (assembled.length !== contents.length) {
    const knownIds = new Set(descriptors.map(({ id }) => id))
    const extraFeature = contents.find(
      ({ descriptor }) => !knownIds.has(descriptor.id),
    )
    throw new Error(`unexpected Feature content ${extraFeature?.descriptor.id}`)
  }

  return assembled
}

function indexById<T extends { id: string }>(
  values: readonly T[],
  label: string,
): Readonly<Record<string, T>> {
  const index: Record<string, T> = Object.create(null) as Record<string, T>
  values.forEach((value) => {
    if (index[value.id]) {
      throw new Error(`duplicate ${label} ${value.id}`)
    }
    index[value.id] = value
  })
  return index
}

function groupOccurrences(
  occurrences: readonly AssembledOccurrence[],
  getKey: (occurrence: AssembledOccurrence) => string,
): Readonly<Record<string, readonly AssembledOccurrence[]>> {
  const groups: Record<string, AssembledOccurrence[]> = Object.create(null) as Record<
    string,
    AssembledOccurrence[]
  >

  occurrences.forEach((occurrence) => {
    const key = getKey(occurrence)
    groups[key] ??= []
    groups[key].push(occurrence)
  })

  return groups
}

function compareChronologicalOccurrences(
  left: AssembledOccurrence,
  right: AssembledOccurrence,
): number {
  return (
    left.occurrence.startMs - right.occurrence.startMs ||
    left.sourceIndex - right.sourceIndex
  )
}
