import type { TimelineDocument } from '../library/schema'
import { TimelineSchema } from '../library/schema'

export type OccurrenceTimingField =
  | 'startMs'
  | 'endMs'
  | 'playStartMs'
  | 'playEndMs'

export type SectionTimingField = 'startMs' | 'endMs'

export interface TimelineValidationError {
  fieldPath: string
  message: string
}

export interface TimelineValidationResult {
  valid: boolean
  errors: TimelineValidationError[]
}

export function cloneTimeline(timeline: TimelineDocument): TimelineDocument {
  return {
    audioSourceHash: timeline.audioSourceHash,
    sections: timeline.sections.map((section) => ({ ...section })),
    occurrences: timeline.occurrences.map((occurrence) => ({ ...occurrence })),
  }
}

export function prepareTimelineForExport(
  timeline: TimelineDocument,
  audioSourceHash: string,
): TimelineDocument {
  return {
    ...cloneTimeline(timeline),
    audioSourceHash,
  }
}

export function serializeTimeline(timeline: TimelineDocument): string {
  return `${JSON.stringify(timeline, null, 2)}\n`
}

export function areTimelinesEqual(
  left: TimelineDocument,
  right: TimelineDocument,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function updateOccurrenceTiming(
  timeline: TimelineDocument,
  occurrenceId: string,
  field: OccurrenceTimingField,
  deltaMs: number,
): TimelineDocument {
  return {
    ...timeline,
    occurrences: timeline.occurrences.map((occurrence) =>
      occurrence.id === occurrenceId
        ? { ...occurrence, [field]: occurrence[field] + deltaMs }
        : occurrence,
    ),
  }
}

export function updateSectionTiming(
  timeline: TimelineDocument,
  sectionId: string,
  field: SectionTimingField,
  deltaMs: number,
): TimelineDocument {
  return {
    ...timeline,
    sections: timeline.sections.map((section) =>
      section.id === sectionId
        ? { ...section, [field]: section[field] + deltaMs }
        : section,
    ),
  }
}

export function validateTimelineWorkingCopy(
  timeline: TimelineDocument,
): TimelineValidationResult {
  const errors: TimelineValidationError[] = []
  const schemaResult = TimelineSchema.safeParse(timeline)

  if (!schemaResult.success) {
    schemaResult.error.issues.forEach((issue) => {
      errors.push({
        fieldPath: formatIssuePath(timeline, issue.path),
        message: issue.message,
      })
    })
  }

  const sectionsById = new Map(
    timeline.sections.map((section) => [section.id, section]),
  )
  timeline.sections.forEach((section, index) => {
    const previous = timeline.sections[index - 1]
    if (previous && section.startMs < previous.startMs) {
      errors.push({
        fieldPath: `sections[${section.id}].startMs`,
        message: 'Section source order must be non-decreasing by startMs.',
      })
    }
  })

  timeline.sections
    .map((section, index) => ({ section, index }))
    .sort(
      (left, right) =>
        left.section.startMs - right.section.startMs || left.index - right.index,
    )
    .forEach((current, index, ordered) => {
      const previous = ordered[index - 1]
      if (previous && previous.section.endMs > current.section.startMs) {
        errors.push({
          fieldPath: `sections[${current.section.id}]`,
          message: `Section overlaps ${previous.section.id}; gaps are legal but overlap is not.`,
        })
      }
    })

  timeline.occurrences.forEach((occurrence) => {
    const section = sectionsById.get(occurrence.sectionId)
    if (!section) {
      errors.push({
        fieldPath: `occurrences[${occurrence.id}].sectionId`,
        message: `Section ${occurrence.sectionId} does not exist.`,
      })
      return
    }
    if (occurrence.startMs < section.startMs) {
      errors.push({
        fieldPath: `occurrences[${occurrence.id}].startMs`,
        message: `Actual startMs must stay within Section ${section.id}.`,
      })
    }
    if (occurrence.endMs > section.endMs) {
      errors.push({
        fieldPath: `occurrences[${occurrence.id}].endMs`,
        message: `Actual endMs must stay within Section ${section.id}; practice range may cross Sections.`,
      })
    }
  })

  return { valid: errors.length === 0, errors }
}

function formatIssuePath(
  timeline: TimelineDocument,
  path: readonly PropertyKey[],
): string {
  if (path[0] === 'occurrences' && typeof path[1] === 'number') {
    const occurrenceId = timeline.occurrences[path[1]]?.id ?? path[1]
    const suffix = path
      .slice(2)
      .map((part) => `.${String(part)}`)
      .join('')
    return `occurrences[${occurrenceId}]${suffix || '.timing'}`
  }
  if (path[0] === 'sections' && typeof path[1] === 'number') {
    const sectionId = timeline.sections[path[1]]?.id ?? path[1]
    const suffix = path
      .slice(2)
      .map((part) => `.${String(part)}`)
      .join('')
    return `sections[${sectionId}]${suffix || '.timing'}`
  }
  return path.map(String).join('.') || 'timeline'
}
