import { describe, expect, it, vi } from 'vitest'
import type { CatalogEdition } from '../library/runtime-schema'
import type { RuntimeClient } from './runtime-client'
import { loadRuntimeSongEditionCore } from './song-edition-loader'

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  recommendedTheme: 'liner',
  coverUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
  editionUrl: '/library-runtime/songs/first-light/edition.a.json',
}

const edition = {
  contractVersion: 1,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.a.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.a.json',
  visualUrl: '/library-runtime/songs/first-light/visual.a.json',
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

describe('runtime Song Edition loader', () => {
  it('loads edition metadata and core reading resources', async () => {
    const client = {
      loadEdition: vi.fn(async () => edition),
      loadLyrics: vi.fn(async () => ({ segments: [] })),
      loadTimeline: vi.fn(async () => ({ sections: [], occurrences: [] })),
      loadVisual: vi.fn(async () => ({ recommendedTheme: 'liner' as const })),
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
    expect(client.loadVisual).toHaveBeenCalledWith(edition.visualUrl, {})
  })
})
