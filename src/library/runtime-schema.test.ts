import { describe, expect, it } from 'vitest'
import { hashJson, stableStringify } from './hash'
import {
  CatalogSchema,
  RuntimeEditionSchema,
} from './runtime-schema'

const runtimeEdition = {
  contractVersion: 2,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.a.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.b.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.c.json',
  visualUrl: '/library-runtime/songs/first-light/visual.d.json',
  features: [],
  audio: {
    url: '/library-runtime/songs/first-light/audio.d.m4a',
    sourceHash: 'b'.repeat(64),
    runtimeHash: 'c'.repeat(64),
    durationMs: 1000,
    format: {
      container: 'm4a',
      codec: 'aac-lc',
      bitrateKbps: 192,
      sampleRate: 48000,
      channels: 2,
    },
  },
  artwork: {
    coverSmallUrl: '/library-runtime/songs/first-light/cover-small.e.webp',
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.f.webp',
  },
}

describe('runtime contract', () => {
  it('accepts a synthetic edition and catalog shape', () => {
    expect(RuntimeEditionSchema.safeParse(runtimeEdition).success).toBe(true)

    const catalogPayload = {
      contractVersion: 2 as const,
      editions: [
        {
          songId: 'first-light',
          title: 'First Light',
          artist: 'A Composer',
          recommendedTheme: 'liner' as const,
          coverUrl: runtimeEdition.artwork.coverSmallUrl,
          editionUrl:
            '/library-runtime/songs/first-light/edition.aa.json',
        },
      ],
    }
    const catalog = {
      ...catalogPayload,
      contentHash: hashJson(catalogPayload),
    }

    expect(CatalogSchema.safeParse(catalog).success).toBe(true)
  })

  it('does not silently accept the retired v1 contract', () => {
    expect(
      RuntimeEditionSchema.safeParse({ ...runtimeEdition, contractVersion: 1 })
        .success,
    ).toBe(false)

    const catalogPayload = {
      contractVersion: 1,
      editions: [],
    }
    expect(
      CatalogSchema.safeParse({
        ...catalogPayload,
        contentHash: hashJson(catalogPayload),
      }).success,
    ).toBe(false)
  })

  it('hashes equivalent object key order identically', () => {
    expect(hashJson({ b: 2, a: 1 })).toBe(hashJson({ a: 1, b: 2 }))
  })

  it('preserves array order while canonicalizing object keys', () => {
    const value = { sections: [{ id: 'second' }, { id: 'first' }] }

    expect(stableStringify(value)).toBe(
      '{"sections":[{"id":"second"},{"id":"first"}]}',
    )
  })
})
