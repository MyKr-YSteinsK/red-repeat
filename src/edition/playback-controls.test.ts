import { describe, expect, it } from 'vitest'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import { resolveTimeline } from '../timeline/resolver'
import {
  findAdjacentOccurrence,
  getLoopRange,
} from './playback-controls'

const model = assembleRuntimeSongEdition({
  catalogEdition: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    recommendedTheme: 'liner',
    coverUrl: '/library-runtime/cover.webp',
    editionUrl: '/library-runtime/edition.json',
  } satisfies CatalogEdition,
  edition: {
    contractVersion: 2,
    contentHash: 'a'.repeat(64),
    song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
    lyricsUrl: '/library-runtime/lyrics.json',
    timelineUrl: '/library-runtime/timeline.json',
    practiceUrl: '/library-runtime/practice.json',
    visualUrl: '/library-runtime/visual.json',
    features: [],
    audio: {
      url: '/library-runtime/audio.m4a',
      sourceHash: 'b'.repeat(64),
      runtimeHash: 'c'.repeat(64),
      durationMs: 1500,
      format: {
        container: 'm4a',
        codec: 'aac-lc',
        bitrateKbps: 192,
        sampleRate: 48000,
        channels: 2,
      },
    },
    artwork: {
      coverSmallUrl: '/library-runtime/cover.webp',
      coverLargeUrl: '/library-runtime/cover-large.webp',
    },
  } satisfies RuntimeEdition,
  lyrics: {
    segments: [
      { id: 's001', lyrics: 'One', translation: '一' },
      { id: 's002', lyrics: 'Two', translation: '二' },
      { id: 's003', lyrics: 'Three', translation: '三' },
    ],
  } satisfies LyricsDocument,
  timeline: {
    audioSourceHash: 'a'.repeat(64),
    sections: [
      { id: 'verse', label: 'Verse', startMs: 0, endMs: 1000 },
      { id: 'instrumental', label: 'Instrumental', startMs: 1000, endMs: 1200 },
    ],
    occurrences: [
      occurrence('o001', 's001', 100, 300, 0, 350),
      occurrence('o002', 's002', 400, 600, 350, 650),
      occurrence('o003', 's003', 500, 700, 450, 750),
    ],
  } satisfies TimelineDocument,
  practice: { units: [] },
  visual: { recommendedTheme: 'liner' } satisfies VisualDocument,
  features: [],
})

describe('Playback Dock timeline controls', () => {
  it('moves through deterministic occurrences without wrapping', () => {
    const before = resolveTimeline(model.timeline, 0)
    const first = model.occurrencesById.o001

    expect(findAdjacentOccurrence(model, 'previous', undefined, before)).toBeNull()
    expect(
      findAdjacentOccurrence(model, 'next', undefined, before)?.occurrence.id,
    ).toBe('o001')
    expect(
      findAdjacentOccurrence(model, 'next', 'o001', before)?.occurrence.id,
    ).toBe('o002')
    expect(
      findAdjacentOccurrence(model, 'previous', 'o001', before),
    ).toBeNull()
    expect(
      findAdjacentOccurrence(model, 'next', 'o003', before),
    ).toBeNull()
    expect(first.occurrence.id).toBe('o001')
  })

  it('creates one continuous envelope for 1, 2, and 4 line scopes', () => {
    const anchor = model.occurrencesById.o001
    const verse = model.timeline.sections[0]
    const resolution = resolveTimeline(model.timeline, 0)

    expect(getLoopRange(model, '1', anchor, verse)).toEqual({
      startMs: 0,
      endMs: 350,
    })
    expect(getLoopRange(model, '2', anchor, verse)).toEqual({
      startMs: 0,
      endMs: 650,
    })
    expect(getLoopRange(model, '4', anchor, verse)).toEqual({
      startMs: 0,
      endMs: 750,
    })
    expect(
      getLoopRange(model, '1', null, resolution.currentSection),
    ).toBeNull()
  })

  it('uses lyric occurrences for Section loop and rejects instrumental Sections', () => {
    const verse = model.timeline.sections[0]
    const instrumental = model.timeline.sections[1]
    const resolution = resolveTimeline(model.timeline, 1050)

    expect(getLoopRange(model, 'section', null, verse)).toEqual({
      startMs: 0,
      endMs: 750,
    })
    expect(
      getLoopRange(model, 'section', null, instrumental),
    ).toBeNull()
    expect(resolution.currentSection?.id).toBe('instrumental')
  })
})

function occurrence(
  id: string,
  segmentId: string,
  startMs: number,
  endMs: number,
  playStartMs: number,
  playEndMs: number,
) {
  return {
    id,
    segmentId,
    sectionId: 'verse',
    startMs,
    endMs,
    playStartMs,
    playEndMs,
  }
}
