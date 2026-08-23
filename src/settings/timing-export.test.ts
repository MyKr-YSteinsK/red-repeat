import { describe, expect, it } from 'vitest'
import type { RuntimeEdition } from '../library/runtime-schema'
import type { LyricsDocument, TimelineDocument } from '../library/schema'
import type { TimingOverridesDocument } from '../practice/practice-timing-overrides'
import { createTimingExportFilename, createTimingExportMarkdown } from './timing-export'

const edition: RuntimeEdition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.json',
  features: [],
  audio: {
    url: '/library-runtime/songs/first-light/audio.m4a',
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
    coverSmallUrl: '/library-runtime/songs/first-light/cover.webp',
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.webp',
  },
}

const lyrics: LyricsDocument = {
  segments: [{ id: 's001', lyrics: 'First line', translation: '第一句' }],
}

const timeline: TimelineDocument = {
  audioSourceHash: edition.audio.sourceHash,
  sections: [{ id: 'verse', label: '主歌', startMs: 0, endMs: 1000 }],
  occurrences: [{
    id: 'o001',
    segmentId: 's001',
    sectionId: 'verse',
    startMs: 100,
    endMs: 300,
    playStartMs: 50,
    playEndMs: 350,
  }],
}

const overrides: TimingOverridesDocument = {
  schemaVersion: 2,
  songId: 'first-light',
  editionContentHash: edition.contentHash,
  audioSourceHash: edition.audio.sourceHash,
  baseTimelineUrl: edition.timelineUrl,
  occurrences: { o001: { playStartMs: 70 } },
}

describe('timing export', () => {
  it('uses the stable single-song and all-song filenames', () => {
    expect(createTimingExportFilename('first-light')).toBe(
      'red-repeat-timing-fix-first-light.md',
    )
    expect(createTimingExportFilename()).toBe('red-repeat-timing-fixes-all.md')
  })

  it('contains human-readable changes, prompt context, and machine data', () => {
    const markdown = createTimingExportMarkdown(
      [{ edition, lyrics, timeline, overrides }],
      { version: '0.9.1', commit: 'abc1234', environment: 'local' },
    )

    expect(markdown).toContain('library/first-light/timeline.json')
    expect(markdown).toContain('First line')
    expect(markdown).toContain('canonical playStartMs: 50')
    expect(markdown).toContain('override playStartMs: 70')
    expect(markdown).toContain('override playEndMs: 未修改')
    expect(markdown).toContain('MyKr-YSteinsK/red-repeat')
    expect(markdown).toContain('Edition content hash: ' + edition.contentHash)
    expect(markdown).toContain('"editionContentHash": "' + edition.contentHash + '"')
    expect(markdown).toContain('"occurrences": {')
    expect(markdown).toContain('"playStartMs": 70')
  })
})
