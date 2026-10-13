import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CatalogEdition } from '../library/runtime-schema'
import {
  createTimingOverridesDocument,
  getTimingOverridesStorageKey,
  saveTimingOverrides,
} from '../practice/practice-timing-overrides'
import type { RuntimeClient } from './runtime-client'
import {
  loadRuntimeSongEditionCore,
} from './song-edition-loader'

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  coverUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
  editionUrl: `/library-runtime/songs/first-light/edition.${'a'.repeat(64)}.json`,
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
      loadFeature: vi.fn(),
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
    expect(client.loadFeature).not.toHaveBeenCalled()
    expect(result.assembled.features).toEqual([])
  })

  it('does not wait for optional Feature content before the core is ready', async () => {
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
      loadFeature: vi.fn(
        () => new Promise<string>(() => undefined),
      ),
    } as unknown as RuntimeClient

    const result = await loadRuntimeSongEditionCore(client, catalogEdition)

    expect(result.assembled.features).toEqual([])
    expect(client.loadFeature).not.toHaveBeenCalled()
  })

  it('reuses a previously validated core after confirming the effective edition URL', async () => {
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

    const first = await loadRuntimeSongEditionCore(client, catalogEdition)
    const second = await loadRuntimeSongEditionCore(client, catalogEdition)

    expect(second.edition.contentHash).toBe(edition.contentHash)
    expect(second.assembled).not.toBe(first.assembled)
    expect(client.loadEdition).toHaveBeenCalledOnce()
    expect(client.loadLyrics).toHaveBeenCalledOnce()
    expect(client.loadTimeline).toHaveBeenCalledOnce()
    expect(client.loadPractice).toHaveBeenCalledOnce()
  })

  it('rebuilds effective timing from the latest compatible local override', async () => {
    const occurrence = {
      id: 'o001',
      segmentId: 's001',
      sectionId: 'verse',
      startMs: 100,
      endMs: 300,
    }
    const client = {
      loadEdition: vi.fn(async () => edition),
      loadLyrics: vi.fn(async () => ({
        segments: [{ id: 's001', lyrics: 'First line' }],
      })),
      loadTimeline: vi.fn(async () => ({
        audioSourceHash: edition.audio.sourceHash,
        sections: [{ id: 'verse', label: 'Verse', startMs: 0, endMs: 1000 }],
        occurrences: [occurrence],
      })),
      loadPractice: vi.fn(async () => ({ units: [] })),
    } as unknown as RuntimeClient
    const override = createTimingOverridesDocument({
      songId: edition.song.songId,
      editionContentHash: edition.contentHash,
      audioSourceHash: edition.audio.sourceHash,
      baseTimelineUrl: edition.timelineUrl,
    })
    override.occurrences = { o001: { startMs: 120 } }
    expect(saveTimingOverrides(override)).toBe(true)

    const first = await loadRuntimeSongEditionCore(client, catalogEdition)
    expect(first.timingProvider.getTiming(occurrence)).toEqual({
      startMs: 120,
      endMs: 300,
    })

    override.occurrences = { o001: { startMs: 180 } }
    expect(saveTimingOverrides(override)).toBe(true)
    const reopened = await loadRuntimeSongEditionCore(client, catalogEdition)

    expect(reopened.timingProvider.getTiming(occurrence)).toEqual({
      startMs: 180,
      endMs: 300,
    })
    expect(client.loadEdition).toHaveBeenCalledOnce()
    expect(client.loadTimeline).toHaveBeenCalledOnce()
  })

  it('retains same-edition timing overrides and clears only the changed edition', async () => {
    let currentEdition = edition
    const occurrence = {
      id: 'o001',
      segmentId: 's001',
      sectionId: 'verse',
      startMs: 10,
      endMs: 300,
    }
    const client = {
      loadEdition: vi.fn(async () => currentEdition),
      loadLyrics: vi.fn(async () => ({
        segments: [{ id: 's001', lyrics: 'First line' }],
      })),
      loadTimeline: vi.fn(async () => ({
        audioSourceHash: edition.audio.sourceHash,
        sections: [{ id: 'verse', label: 'Verse', startMs: 0, endMs: 1000 }],
        occurrences: [occurrence],
      })),
      loadPractice: vi.fn(async () => ({ units: [] })),
    } as unknown as RuntimeClient
    const firstDocument = createTimingOverridesDocument({
      songId: edition.song.songId,
      editionContentHash: edition.contentHash,
      audioSourceHash: edition.audio.sourceHash,
      baseTimelineUrl: edition.timelineUrl,
    })
    firstDocument.occurrences = { o001: { startMs: 20 } }
    expect(saveTimingOverrides(firstDocument)).toBe(true)

    const otherDocument = createTimingOverridesDocument({
      songId: 'second-signal',
      editionContentHash: 'e'.repeat(64),
      audioSourceHash: 'f'.repeat(64),
      baseTimelineUrl: '/library-runtime/songs/second-signal/timeline.json',
    })
    otherDocument.occurrences = { o002: { startMs: 30 } }
    expect(saveTimingOverrides(otherDocument)).toBe(true)

    const firstCore = await loadRuntimeSongEditionCore(client, catalogEdition)
    expect(firstCore.timingProvider.getTiming(occurrence)).toEqual({
      startMs: 20,
      endMs: 300,
    })
    expect(window.localStorage.getItem(getTimingOverridesStorageKey('first-light'))).not.toBeNull()

    currentEdition = {
      ...edition,
      contentHash: 'd'.repeat(64),
    }
    const currentCatalogEdition = {
      ...catalogEdition,
      editionUrl: `/library-runtime/songs/first-light/edition.${'d'.repeat(64)}.json`,
    }
    const changedCore = await loadRuntimeSongEditionCore(client, currentCatalogEdition)

    expect(changedCore.timingProvider.getTiming(occurrence)).toEqual({
      startMs: 10,
      endMs: 300,
    })
    expect(window.localStorage.getItem(getTimingOverridesStorageKey('first-light'))).toBeNull()
    expect(window.localStorage.getItem(getTimingOverridesStorageKey('second-signal'))).not.toBeNull()
  })
})
