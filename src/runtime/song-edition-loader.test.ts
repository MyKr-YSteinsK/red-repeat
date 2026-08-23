import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CatalogEdition } from '../library/runtime-schema'
import {
  createTimingOverridesDocument,
  getTimingOverridesStorageKey,
  saveTimingOverrides,
} from '../practice/practice-timing-overrides'
import type { RuntimeClient } from './runtime-client'
import { RuntimeClientError } from './runtime-client'
import { loadRuntimeSongEditionCore } from './song-edition-loader'

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  coverUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
  editionUrl: '/library-runtime/songs/first-light/edition.a.json',
}

const edition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.a.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.a.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.a.json',
  features: [],
  audio: {
    url: '/library-runtime/songs/first-light/audio.a.m4a',
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
    coverSmallUrl: catalogEdition.coverUrl,
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.a.webp',
  },
}

afterEach(() => window.localStorage.clear())

describe('runtime Song Edition loader', () => {
  it('loads edition metadata and core reading resources', async () => {
    const client = {
      loadEdition: vi.fn(async () => edition),
      loadLyrics: vi.fn(async () => ({ segments: [] })),
      loadTimeline: vi.fn(async () => ({
        audioSourceHash: 'a'.repeat(64),
        sections: [],
        occurrences: [],
      })),
      loadPractice: vi.fn(async () => ({ units: [] })),
    } as unknown as RuntimeClient

    const result = await loadRuntimeSongEditionCore(client, catalogEdition)

    expect(result.catalogEdition).toBe(catalogEdition)
    expect(result.edition).toBe(edition)
    expect(client.loadEdition).toHaveBeenCalledWith(
      catalogEdition.editionUrl,
      {},
    )
    expect(client.loadLyrics).toHaveBeenCalledWith(edition.lyricsUrl, {})
    expect(client.loadTimeline).toHaveBeenCalledWith(edition.timelineUrl, {})
    expect(client.loadPractice).toHaveBeenCalledWith(edition.practiceUrl, {})
  })

  it('keeps an individual Feature failure local to the assembled core', async () => {
    const featureEdition = {
      ...edition,
      features: [
        {
          id: 'liner-note',
          url: '/library-runtime/songs/first-light/features/liner-note.md',
        },
      ],
    }
    const client = {
      loadEdition: vi.fn(async () => featureEdition),
      loadLyrics: vi.fn(async () => ({ segments: [] })),
      loadTimeline: vi.fn(async () => ({
        audioSourceHash: 'a'.repeat(64),
        sections: [],
        occurrences: [],
      })),
      loadPractice: vi.fn(async () => ({ units: [] })),
      loadFeature: vi.fn(async () => {
        throw new RuntimeClientError({
          kind: 'network',
          logicalPath: featureEdition.features[0].url,
          url: featureEdition.features[0].url,
          message: 'offline',
        })
      }),
    } as unknown as RuntimeClient

    const result = await loadRuntimeSongEditionCore(client, catalogEdition)

    expect(result.features).toEqual([])
    expect(result.featureErrors).toHaveLength(1)
    expect(result.featureErrors[0].descriptor.id).toBe('liner-note')
    expect(result.assembled.features).toEqual([])
    expect(client.loadFeature).toHaveBeenCalledWith(
      featureEdition.features[0],
      {},
    )
  })

  it('retains same-edition timing overrides and clears only the changed edition', async () => {
    let currentEdition = edition
    const client = {
      loadEdition: vi.fn(async () => currentEdition),
      loadLyrics: vi.fn(async () => ({ segments: [] })),
      loadTimeline: vi.fn(async () => ({
        audioSourceHash: 'a'.repeat(64),
        sections: [],
        occurrences: [],
      })),
      loadPractice: vi.fn(async () => ({ units: [] })),
    } as unknown as RuntimeClient
    const firstDocument = createTimingOverridesDocument({
      songId: edition.song.songId,
      editionContentHash: edition.contentHash,
      audioSourceHash: edition.audio.sourceHash,
      baseTimelineUrl: edition.timelineUrl,
    })
    firstDocument.occurrences = { o001: { playStartMs: 20 } }
    expect(saveTimingOverrides(firstDocument)).toBe(true)

    const otherDocument = createTimingOverridesDocument({
      songId: 'second-signal',
      editionContentHash: 'e'.repeat(64),
      audioSourceHash: 'f'.repeat(64),
      baseTimelineUrl: '/library-runtime/songs/second-signal/timeline.json',
    })
    otherDocument.occurrences = { o002: { playStartMs: 30 } }
    expect(saveTimingOverrides(otherDocument)).toBe(true)

    await loadRuntimeSongEditionCore(client, catalogEdition)
    expect(window.localStorage.getItem(getTimingOverridesStorageKey('first-light'))).not.toBeNull()

    currentEdition = {
      ...edition,
      contentHash: 'd'.repeat(64),
    }
    await loadRuntimeSongEditionCore(client, catalogEdition)

    expect(window.localStorage.getItem(getTimingOverridesStorageKey('first-light'))).toBeNull()
    expect(window.localStorage.getItem(getTimingOverridesStorageKey('second-signal'))).not.toBeNull()
  })
})
