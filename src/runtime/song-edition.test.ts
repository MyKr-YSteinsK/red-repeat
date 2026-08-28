import { describe, expect, it } from 'vitest'
import type {
  CatalogEdition,
  RuntimeEdition,
} from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  PracticeDocument,
} from '../library/schema'
import {
  assembleRuntimeSongEdition,
  type AssembleSongEditionInput,
} from './song-edition'

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  album: 'Returning',
  year: 2026,
  coverUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
  editionUrl: '/library-runtime/songs/first-light/edition.a.json',
}

const edition: RuntimeEdition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    album: 'Returning',
    year: 2026,
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.a.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.a.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.a.json',
  features: [
    {
      id: 'essay-z',
      url: '/library-runtime/songs/first-light/features/essay-z.md',
    },
    {
      id: 'essay-a',
      url: '/library-runtime/songs/first-light/features/essay-a.md',
    },
  ],
  audio: {
    url: '/library-runtime/songs/first-light/audio.a.m4a',
    sourceHash: 'b'.repeat(64),
    runtimeHash: 'c'.repeat(64),
    durationMs: 2000,
    format: {
      container: 'm4a',
      codec: 'aac-lc',
      bitrateKbps: 192,
      sampleRate: 48000,
      channels: 2,
    },
  },
  artwork: {
    coverSmallUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.a.webp',
  },
}

const lyrics: LyricsDocument = {
  segments: [
    { id: 's001', lyrics: 'One', translation: '一' },
    { id: 's002', lyrics: 'Two', translation: '二' },
  ],
}

const timeline: TimelineDocument = {
  audioSourceHash: 'a'.repeat(64),
  sections: [
    { id: 'intro', label: 'Intro', startMs: 0, endMs: 500 },
    { id: 'instrumental', label: 'Instrumental', startMs: 500, endMs: 750 },
    { id: 'chorus', label: 'Chorus', startMs: 750, endMs: 1500 },
  ],
  occurrences: [
    occurrence('o010', 's001', 'intro', 100, 300, 50, 350),
    occurrence('o002', 's001', 'chorus', 1000, 1200, 950, 1250),
    occurrence('o003', 's002', 'chorus', 800, 1050, 750, 1100),
    occurrence('o004', 's002', 'chorus', 800, 950, 750, 1000),
  ],
}

const practice: PracticeDocument = { units: [] }

const featureContents = [
  {
    descriptor: edition.features[1],
    content: 'Essay A',
  },
  {
    descriptor: edition.features[0],
    content: 'Essay Z',
  },
]

describe('assembled runtime Song Edition', () => {
  it('keeps canonical Segment content while expanding repeated Occurrences', () => {
    const model = assembleRuntimeSongEdition(createInput())
    const repeated = model.occurrencesBySegmentId.s001

    expect(repeated).toHaveLength(2)
    expect(repeated[0].segment).toBe(model.segmentsById.s001)
    expect(repeated[1].segment).toBe(model.segmentsById.s001)
    expect(repeated[0].occurrence.id).not.toBe(repeated[1].occurrence.id)
    expect(model.occurrencesById.o010.segment).toBe(model.segmentsById.s001)
  })

  it('preserves overlap and deterministic chronological/source order', () => {
    const model = assembleRuntimeSongEdition(createInput())

    expect(model.chronologicalOccurrences.map(({ occurrence }) => occurrence.id)).toEqual([
      'o010',
      'o003',
      'o004',
      'o002',
    ])
    expect(model.occurrencesBySectionId.chorus.map(({ occurrence }) => occurrence.id)).toEqual([
      'o003',
      'o004',
      'o002',
    ])
    expect(model.occurrencesBySectionId.chorus[0].occurrence.endMs).toBe(1100)
    expect(model.occurrencesBySectionId.chorus[1].occurrence.endMs).toBe(1000)
  })

  it('keeps instrumental Sections in source order without fake Occurrences', () => {
    const model = assembleRuntimeSongEdition(createInput())

    expect(model.sections.map(({ section }) => section.id)).toEqual([
      'intro',
      'instrumental',
      'chorus',
    ])
    expect(model.sections[1].occurrences).toEqual([])
  })

  it('returns Features in descriptor order even when loads complete differently', () => {
    const model = assembleRuntimeSongEdition(createInput())

    expect(model.features.map(({ descriptor }) => descriptor.id)).toEqual([
      'essay-z',
      'essay-a',
    ])
    expect(model.features.map(({ content }) => content)).toEqual([
      'Essay Z',
      'Essay A',
    ])
  })

  it('rejects missing cross-resource references at the assembled boundary', () => {
    const invalidTimeline: TimelineDocument = {
      ...timeline,
      occurrences: [
        occurrence('o999', 's999', 'intro', 100, 300, 50, 350),
      ],
    }

    expect(() =>
      assembleRuntimeSongEdition(createInput({ timeline: invalidTimeline })),
    ).toThrow('missing Segment s999')
  })

  it('rejects inconsistent catalog and edition identity', () => {
    expect(() =>
      assembleRuntimeSongEdition(
        createInput({
          catalogEdition: { ...catalogEdition, artist: 'Another Artist' },
        }),
      ),
    ).toThrow('metadata mismatch')

  })
})

function createInput(
  overrides: Partial<AssembleSongEditionInput> = {},
): AssembleSongEditionInput {
  return {
    catalogEdition,
    edition,
    lyrics,
    timeline,
    practice,
    features: featureContents,
    ...overrides,
  }
}

function occurrence(
  id: string,
  segmentId: string,
  sectionId: string,
  _editorialStartMs: number,
  _editorialEndMs: number,
  effectiveStartMs: number,
  effectiveEndMs: number,
) {
  return {
    id,
    segmentId,
    sectionId,
    startMs: effectiveStartMs,
    endMs: effectiveEndMs,
  }
}
