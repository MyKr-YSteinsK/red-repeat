import { describe, expect, it } from 'vitest'
import {
  LyricsSchema,
  ManifestSchema,
  TimelineSchema,
  VisualSchema,
} from './schema'

const validManifest = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
}

const validLyrics = {
  segments: [
    {
      id: 's001',
      lyrics: 'A line worth returning to',
      translation: '一行值得反复回到的歌词',
      layers: [{ id: 'reading', label: 'Reading', text: 'A line worth returning to' }],
      notes: [{ title: 'Context', body: 'A small note.' }],
      emphasis: 'subtle',
    },
  ],
}

const validTimeline = {
  sections: [{ id: 'verse-1', label: 'Verse 1', startMs: 0, endMs: 4000 }],
  occurrences: [
    {
      id: 'o001',
      segmentId: 's001',
      sectionId: 'verse-1',
      startMs: 1000,
      endMs: 2500,
      playStartMs: 500,
      playEndMs: 3000,
    },
  ],
}

const validVisual = {
  recommendedTheme: 'liner',
  mood: ['quiet', 'open'],
  motifs: ['paper', 'distance'],
  energy: 'restrained',
  density: 'sparse',
  motion: 'slow',
  coverTreatment: 'editorial',
  sectionCues: [{ sectionId: 'verse-1', cue: 'isolate' }],
}

describe('Song Edition source schemas', () => {
  it('accepts a valid minimal source package', () => {
    expect(ManifestSchema.safeParse(validManifest).success).toBe(true)
    expect(LyricsSchema.safeParse(validLyrics).success).toBe(true)
    expect(TimelineSchema.safeParse(validTimeline).success).toBe(true)
    expect(VisualSchema.safeParse(validVisual).success).toBe(true)
  })

  it('requires non-empty translations', () => {
    const result = LyricsSchema.safeParse({
      segments: [{ ...validLyrics.segments[0], translation: '   ' }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects duplicate Segment IDs', () => {
    const result = LyricsSchema.safeParse({
      segments: [validLyrics.segments[0], { ...validLyrics.segments[0] }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects unknown themes and section cues', () => {
    expect(
      VisualSchema.safeParse({ ...validVisual, recommendedTheme: 'paper' }).success,
    ).toBe(false)
    expect(
      VisualSchema.safeParse({
        ...validVisual,
        sectionCues: [{ sectionId: 'verse-1', cue: 'flash' }],
      }).success,
    ).toBe(false)
  })

  it('rejects invalid timing order', () => {
    const result = TimelineSchema.safeParse({
      ...validTimeline,
      occurrences: [
        { ...validTimeline.occurrences[0], playStartMs: 1200, startMs: 1000 },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('allows overlapping occurrences and repeated Segment references', () => {
    const result = TimelineSchema.safeParse({
      ...validTimeline,
      occurrences: [
        validTimeline.occurrences[0],
        {
          ...validTimeline.occurrences[0],
          id: 'o002',
          startMs: 2000,
          endMs: 3500,
          playStartMs: 1500,
          playEndMs: 4000,
        },
      ],
    })

    expect(result.success).toBe(true)
  })
})
