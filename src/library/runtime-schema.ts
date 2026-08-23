import { z } from 'zod'
import { SongIdSchema } from './schema'

const contentHash = z.string().regex(/^[a-f0-9]{64}$/)
const runtimeUrl = z.string().regex(/^\/library-runtime\/.+/)
const nonEmptyText = z.string().trim().min(1)

export const RuntimeContractVersion = z.literal(3)

export const RuntimeFeatureDescriptorSchema = z
  .object({
    id: nonEmptyText,
    url: runtimeUrl,
  })
  .strict()

export const RuntimeAudioFormatSchema = z
  .object({
    container: z.literal('m4a'),
    codec: z.literal('aac-lc'),
    bitrateKbps: z.literal(192),
    sampleRate: z.union([z.literal(44100), z.literal(48000)]),
    channels: z.literal(2),
  })
  .strict()

export const RuntimeAudioDescriptorSchema = z
  .object({
    url: runtimeUrl,
    sourceHash: contentHash,
    runtimeHash: contentHash,
    durationMs: z.number().int().nonnegative(),
    format: RuntimeAudioFormatSchema,
  })
  .strict()

export const RuntimeArtworkDescriptorSchema = z
  .object({
    coverSmallUrl: runtimeUrl,
    coverLargeUrl: runtimeUrl,
    heroLargeUrl: runtimeUrl.optional(),
  })
  .strict()

export const RuntimeSongMetadataSchema = z
  .object({
    songId: SongIdSchema,
    title: nonEmptyText,
    artist: nonEmptyText,
    album: nonEmptyText.optional(),
    year: z.number().int().nonnegative().optional(),
    intro: nonEmptyText.max(280).optional(),
  })
  .strict()

export const RuntimeEditionSchema = z
  .object({
    contractVersion: RuntimeContractVersion,
    contentHash,
    song: RuntimeSongMetadataSchema,
    lyricsUrl: runtimeUrl,
    timelineUrl: runtimeUrl,
    practiceUrl: runtimeUrl,
    features: z.array(RuntimeFeatureDescriptorSchema),
    audio: RuntimeAudioDescriptorSchema,
    artwork: RuntimeArtworkDescriptorSchema,
  })
  .strict()

export const CatalogEditionSchema = z
  .object({
    songId: SongIdSchema,
    title: nonEmptyText,
    artist: nonEmptyText,
    album: nonEmptyText.optional(),
    year: z.number().int().nonnegative().optional(),
    coverUrl: runtimeUrl,
    editionUrl: runtimeUrl,
  })
  .strict()

export const CatalogSchema = z
  .object({
    contractVersion: RuntimeContractVersion,
    contentHash,
    editions: z.array(CatalogEditionSchema),
  })
  .strict()

export type RuntimeFeatureDescriptor = z.infer<
  typeof RuntimeFeatureDescriptorSchema
>
export type RuntimeAudioFormat = z.infer<typeof RuntimeAudioFormatSchema>
export type RuntimeAudioDescriptor = z.infer<
  typeof RuntimeAudioDescriptorSchema
>
export type RuntimeArtworkDescriptor = z.infer<
  typeof RuntimeArtworkDescriptorSchema
>
export type RuntimeSongMetadata = z.infer<typeof RuntimeSongMetadataSchema>
export type RuntimeEdition = z.infer<typeof RuntimeEditionSchema>
export type CatalogEdition = z.infer<typeof CatalogEditionSchema>
export type Catalog = z.infer<typeof CatalogSchema>
