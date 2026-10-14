import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type { LyricsDocument, PracticeDocument, TimelineDocument } from '../library/schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import { loadValidatedSongContext } from './validated-song-context'

const snapshotEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light H1',
  artist: 'A Composer',
  coverUrl: '/library-runtime/cover-h1.webp',
  editionUrl: '/library-runtime/edition.h1.json',
}
const catalogEdition: CatalogEdition = {
  ...snapshotEdition,
  title: 'First Light H2',
  editionUrl: '/library-runtime/edition.h2.json',
}
const edition: RuntimeEdition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: { songId: 'first-light', title: 'First Light H1', artist: 'A Composer' },
  lyricsUrl: '/library-runtime/lyrics.h1.json',
  timelineUrl: '/library-runtime/timeline.h1.json',
  practiceUrl: '/library-runtime/practice.h1.json',
  features: [],
  audio: {
    url: '/library-runtime/audio.h1.m4a',
    sourceHash: 'b'.repeat(64),
    runtimeHash: 'c'.repeat(64),
    durationMs: 1000,
    format: { container: 'm4a', codec: 'aac-lc', bitrateKbps: 192, sampleRate: 48000, channels: 2 },
  },
  artwork: { coverSmallUrl: '/library-runtime/cover-h1.webp', coverLargeUrl: '/library-runtime/cover-h1-large.webp' },
}
const lyrics: LyricsDocument = { segments: [{ id: 's001', lyrics: 'line', translation: '句' }] }
const timeline: TimelineDocument = {
  audioSourceHash: 'b'.repeat(64),
  sections: [{ id: 'verse', label: 'Verse', startMs: 0, endMs: 500 }],
  occurrences: [{ id: 'o001', segmentId: 's001', sectionId: 'verse', startMs: 100, endMs: 300 }],
}
const practice: PracticeDocument = { units: [{ id: 'p001', sectionId: 'verse', label: 'Verse', occurrenceIds: ['o001'] }] }

vi.mock('../pwa/song-download', () => ({
  readDownloadedSongSnapshot: vi.fn(async () => ({ catalogEdition: snapshotEdition })),
}))

afterEach(() => window.localStorage.clear())

describe('loadValidatedSongContext', () => {
  it('selects the active H1 manifest and validates resources without clearing stored timing data', async () => {
    const timingKey = 'red-repeat:timing-overrides:v3:first-light'
    const staleOverride = JSON.stringify({
      schemaVersion: 3,
      songId: 'first-light',
      editionContentHash: 'd'.repeat(64),
      audioSourceHash: 'b'.repeat(64),
      baseTimelineUrl: '/library-runtime/timeline.h0.json',
      occurrences: { o001: { startMs: 120 } },
    })
    window.localStorage.setItem(timingKey, staleOverride)
    const client = {
      loadEdition: vi.fn(async (url: string) => {
        expect(url).toBe(snapshotEdition.editionUrl)
        return edition
      }),
      loadLyrics: vi.fn(async () => lyrics),
      loadTimeline: vi.fn(async () => timeline),
      loadPractice: vi.fn(async () => practice),
    } as unknown as RuntimeClient

    const loaded = await loadValidatedSongContext(client, catalogEdition)

    expect(loaded.catalogEdition.editionUrl).toBe(snapshotEdition.editionUrl)
    expect(loaded.assembled.occurrencesById.o001.segment.id).toBe('s001')
    expect(window.localStorage.getItem(timingKey)).toBe(staleOverride)
    expect(client.loadEdition).toHaveBeenCalledTimes(1)
  })
})
