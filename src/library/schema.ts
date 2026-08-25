import { z } from 'zod'

const nonEmptyText = z.string().trim().min(1)
const integerMilliseconds = z.number().int().nonnegative()
const sha256Hash = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'must be a lowercase SHA-256 hex digest')

export const SongIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a URL/filesystem-safe slug')

export const SegmentIdSchema = z
  .string()
  .regex(/^s[0-9]+[A-Za-z0-9_-]*$/, 'must start with s and contain a numeric stem')

export const OccurrenceIdSchema = z
  .string()
  .regex(/^o[0-9]+[A-Za-z0-9_-]*$/, 'must start with o and contain a numeric stem')

export const PracticeUnitIdSchema = z
  .string()
  .regex(/^p[0-9]+[A-Za-z0-9_-]*$/, 'must start with p and contain a numeric stem')

export const SectionIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_-]*$/, 'must be a stable readable identifier')

export const ManifestSchema = z
  .object({
    songId: SongIdSchema,
    title: nonEmptyText,
    artist: nonEmptyText,
    album: nonEmptyText.optional(),
    year: z.number().int().nonnegative().optional(),
    intro: nonEmptyText.max(280).optional(),
  })
  .strict()

export const LayerSchema = z
  .object({
    id: nonEmptyText,
    label: nonEmptyText,
    text: nonEmptyText,
  })
  .strict()

export const NoteSchema = z
  .object({
    title: nonEmptyText.optional(),
    body: nonEmptyText,
  })
  .strict()

export const SegmentSchema = z
  .object({
    id: SegmentIdSchema,
    lyrics: nonEmptyText,
    translation: nonEmptyText,
    layers: z.array(LayerSchema).optional(),
    notes: z.array(NoteSchema).optional(),
    emphasis: z.enum(['subtle', 'strong']).optional(),
  })
  .strict()

export const LyricsSchema = z
  .object({
    segments: z.array(SegmentSchema),
  })
  .strict()
  .superRefine((lyrics, context) => {
    const seen = new Map<string, number>()

    lyrics.segments.forEach((segment, index) => {
      const firstIndex = seen.get(segment.id)

      if (firstIndex !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['segments', index, 'id'],
          message: `duplicate Segment id; first declared at index ${firstIndex}`,
        })
      } else {
        seen.set(segment.id, index)
      }
    })
  })

export const SectionSchema = z
  .object({
    id: SectionIdSchema,
    label: nonEmptyText,
    startMs: integerMilliseconds,
    endMs: integerMilliseconds,
  })
  .strict()
  .refine((section) => section.startMs < section.endMs, {
    path: ['endMs'],
    message: 'section timing must satisfy startMs < endMs',
  })

export const OccurrenceSchema = z
  .object({
    id: OccurrenceIdSchema,
    segmentId: SegmentIdSchema,
    sectionId: SectionIdSchema,
    startMs: integerMilliseconds,
    endMs: integerMilliseconds,
    playStartMs: integerMilliseconds,
    playEndMs: integerMilliseconds,
    performanceNote: nonEmptyText.optional(),
  })
  .strict()

export const TimelineSchema = z
  .object({
    audioSourceHash: sha256Hash,
    sections: z.array(SectionSchema),
    occurrences: z.array(OccurrenceSchema),
  })
  .strict()
  .superRefine((timeline, context) => {
    const sectionIds = new Map<string, number>()
    const occurrenceIds = new Map<string, number>()

    timeline.sections.forEach((section, index) => {
      const firstIndex = sectionIds.get(section.id)

      if (firstIndex !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['sections', index, 'id'],
          message: `duplicate Section id; first declared at index ${firstIndex}`,
        })
      } else {
        sectionIds.set(section.id, index)
      }
    })

    timeline.occurrences.forEach((occurrence, index) => {
      const firstIndex = occurrenceIds.get(occurrence.id)

      if (firstIndex !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['occurrences', index, 'id'],
          message: `duplicate Occurrence id; first declared at index ${firstIndex}`,
        })
      } else {
        occurrenceIds.set(occurrence.id, index)
      }

      const hasValidTiming =
        0 <= occurrence.playStartMs &&
        occurrence.playStartMs < occurrence.playEndMs &&
        0 <= occurrence.startMs &&
        occurrence.startMs < occurrence.endMs &&
        0 <= occurrence.endMs

      if (!hasValidTiming) {
        context.addIssue({
          code: 'custom',
          path: ['occurrences', index],
          message:
            'timing must satisfy 0 <= playStartMs < playEndMs and 0 <= startMs < endMs',
        })
      }
    })
  })

export const PracticeUnitSchema = z
  .object({
    id: PracticeUnitIdSchema,
    sectionId: SectionIdSchema,
    label: nonEmptyText,
    occurrenceIds: z.array(OccurrenceIdSchema).min(1),
  })
  .strict()

export const PracticeSchema = z
  .object({
    units: z.array(PracticeUnitSchema),
  })
  .strict()

export type SongManifest = z.infer<typeof ManifestSchema>
export type Layer = z.infer<typeof LayerSchema>
export type Note = z.infer<typeof NoteSchema>
export type Segment = z.infer<typeof SegmentSchema>
export type LyricsDocument = z.infer<typeof LyricsSchema>
export type Section = z.infer<typeof SectionSchema>
export type Occurrence = z.infer<typeof OccurrenceSchema>
export type TimelineDocument = z.infer<typeof TimelineSchema>
export type PracticeUnit = z.infer<typeof PracticeUnitSchema>
export type PracticeDocument = z.infer<typeof PracticeSchema>

export const SOURCE_FILE_NAMES = {
  manifest: 'manifest.json',
  lyrics: 'lyrics.json',
  timeline: 'timeline.json',
  practice: 'practice.json',
} as const
