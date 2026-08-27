import { describe, expect, it } from 'vitest'
import {
  LyricsSchema,
  ManifestSchema,
  PracticeSchema,
  TimelineSchema,
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
  audioSourceHash: 'a'.repeat(64),
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

const validPractice = {
  units: [
    {
      id: 'p001',
      sectionId: 'verse-1',
      label: 'Verse 1',
      occurrenceIds: ['o001'],
    },
  ],
}

describe('Song Edition source schemas', () => {
  it('accepts a valid minimal source package', () => {
    expect(ManifestSchema.safeParse(validManifest).success).toBe(true)
    expect(LyricsSchema.safeParse(validLyrics).success).toBe(true)
    expect(TimelineSchema.safeParse(validTimeline).success).toBe(true)
    expect(PracticeSchema.safeParse(validPractice).success).toBe(true)
  })

  it('requires stable Practice Unit fields', () => {
    expect(
      PracticeSchema.safeParse({
        units: [{ ...validPractice.units[0], id: 'unit-1' }],
      }).success,
    ).toBe(false)
    expect(
      PracticeSchema.safeParse({
        units: [{ ...validPractice.units[0], occurrenceIds: [] }],
      }).success,
    ).toBe(false)
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

  it('validates position-verifiable Hiragana ruby coverage', () => {
    const rubySegment = {
      id: 's001',
      lyrics: '歌プレイ',
      translation: 'Song play',
      ruby: [
        { start: 0, end: 1, base: '歌', reading: 'うた' },
        { start: 1, end: 4, base: 'プレイ', reading: 'ぷれい' },
      ],
    }

    expect(LyricsSchema.safeParse({ segments: [rubySegment] }).success).toBe(true)
    expect(
      LyricsSchema.safeParse({
        segments: [{ ...rubySegment, ruby: rubySegment.ruby?.slice(0, 1) }],
      }).success,
    ).toBe(false)
    expect(
      LyricsSchema.safeParse({
        segments: [
          {
            ...rubySegment,
            ruby: [
              { start: 0, end: 2, base: '歌', reading: 'うた' },
              rubySegment.ruby[1],
            ],
          },
        ],
      }).success,
    ).toBe(false)
    expect(
      LyricsSchema.safeParse({
        segments: [
          {
            ...rubySegment,
            ruby: [
              rubySegment.ruby[0],
              { start: 1, end: 4, base: 'プレイ', reading: 'プレイ' },
            ],
          },
        ],
      }).success,
    ).toBe(false)
    expect(
      LyricsSchema.safeParse({
        segments: [
          {
            id: 's001',
            lyrics: '已',
            translation: 'Only',
            ruby: [{ start: 0, end: 1, base: '已', reading: 'のみ' }],
          },
        ],
      }).success,
    ).toBe(true)
  })

  it('allows pure English lyrics without ruby', () => {
    expect(
      LyricsSchema.safeParse({
        segments: [
          { id: 's001', lyrics: 'Wake Up Bankers', translation: '醒醒吧' },
        ],
      }).success,
    ).toBe(true)
  })

  it('rejects invalid timing order', () => {
    const result = TimelineSchema.safeParse({
      ...validTimeline,
      occurrences: [
        { ...validTimeline.occurrences[0], playStartMs: 3200, playEndMs: 3000 },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('accepts a precise playback window inside the editorial lyric range', () => {
    const result = TimelineSchema.safeParse({
      ...validTimeline,
      occurrences: [
        {
          ...validTimeline.occurrences[0],
          playStartMs: 1200,
          playEndMs: 2200,
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('requires a lowercase SHA-256 audio source fingerprint', () => {
    expect(
      TimelineSchema.safeParse({
        ...validTimeline,
        audioSourceHash: 'A'.repeat(64),
      }).success,
    ).toBe(false)
    expect(
      TimelineSchema.safeParse({
        ...validTimeline,
        audioSourceHash: undefined,
      }).success,
    ).toBe(false)
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
