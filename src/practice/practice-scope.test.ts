import { describe, expect, it } from 'vitest'
import {
  createPracticeIndex,
  getAdjacentPracticeOccurrence,
  getAdjacentPracticeUnit,
  resolvePracticeRange,
} from './practice-scope'
import {
  createEffectivePracticeTimingProvider,
  createTimingOverridesDocument,
} from './practice-timing-overrides'

const timeline = {
  audioSourceHash: 'a'.repeat(64),
  sections: [
    { id: 'verse', label: 'Verse', startMs: 0, endMs: 1200 },
    { id: 'chorus', label: 'Chorus', startMs: 1200, endMs: 2200 },
  ],
  occurrences: [
    occurrence('o001', 'verse', 100, 300, 50, 350),
    occurrence('o002', 'verse', 450, 700, 400, 750),
    occurrence('o003', 'verse', 800, 1000, 750, 1050),
    occurrence('o004', 'chorus', 1300, 1500, 1250, 1550),
  ],
}

const practice = {
  units: [
    { id: 'p001', sectionId: 'verse', label: 'Verse A', occurrenceIds: ['o001', 'o002'] },
    { id: 'p002', sectionId: 'verse', label: 'Verse B', occurrenceIds: ['o003'] },
    { id: 'p003', sectionId: 'chorus', label: 'Chorus', occurrenceIds: ['o004'] },
  ],
}

describe('Practice Scope', () => {
  it('resolves a current occurrence to its canonical play range', () => {
    expect(resolvePracticeRange({ kind: 'currentOccurrence', occurrenceId: 'o002' }, practice, timeline)).toEqual({
      startMs: 400,
      endMs: 750,
      occurrenceIds: ['o002'],
    })
  })

  it('resolves covered and unit scopes as one continuous first-to-last range', () => {
    expect(resolvePracticeRange({ kind: 'coveredRange', practiceUnitId: 'p001', endOccurrenceId: 'o002' }, practice, timeline)).toEqual({
      startMs: 50,
      endMs: 750,
      occurrenceIds: ['o001', 'o002'],
    })
    expect(resolvePracticeRange({ kind: 'practiceUnit', practiceUnitId: 'p001' }, practice, timeline)).toEqual({
      startMs: 50,
      endMs: 750,
      occurrenceIds: ['o001', 'o002'],
    })
  })

  it('resolves custom chronological ranges across Units', () => {
    expect(resolvePracticeRange({ kind: 'customRange', startOccurrenceId: 'o002', endOccurrenceId: 'o004' }, practice, timeline)).toMatchObject({
      startMs: 400,
      endMs: 1550,
      occurrenceIds: ['o002', 'o003', 'o004'],
    })
  })

  it('does not create intermediate stops for a multi-occurrence range', () => {
    const range = resolvePracticeRange({ kind: 'practiceUnit', practiceUnitId: 'p001' }, practice, timeline)
    expect(range).toEqual({ startMs: 50, endMs: 750, occurrenceIds: ['o001', 'o002'] })
  })

  it('resolves every scope from the same effective first/last timing envelope', () => {
    const originalFirst = timeline.occurrences[0]
    const originalLast = timeline.occurrences[1]
    const overrides = createTimingOverridesDocument({
      songId: 'song',
      audioSourceHash: timeline.audioSourceHash,
      baseTimelineUrl: '/library-runtime/song/timeline.json',
    })
    overrides.occurrences = {
      o001: { playStartMs: 80 },
      o002: { playEndMs: 780 },
      o003: { playStartMs: 760, playEndMs: 1080 },
    }
    const provider = createEffectivePracticeTimingProvider(timeline, overrides)

    expect(resolvePracticeRange({ kind: 'currentOccurrence', occurrenceId: 'o001' }, practice, timeline, provider)).toEqual({
      startMs: 80,
      endMs: 350,
      occurrenceIds: ['o001'],
    })
    expect(resolvePracticeRange({ kind: 'coveredRange', practiceUnitId: 'p001', endOccurrenceId: 'o002' }, practice, timeline, provider)).toEqual({
      startMs: 80,
      endMs: 780,
      occurrenceIds: ['o001', 'o002'],
    })
    expect(resolvePracticeRange({ kind: 'practiceUnit', practiceUnitId: 'p001' }, practice, timeline, provider)).toEqual({
      startMs: 80,
      endMs: 780,
      occurrenceIds: ['o001', 'o002'],
    })
    expect(resolvePracticeRange({ kind: 'customRange', startOccurrenceId: 'o002', endOccurrenceId: 'o004' }, practice, timeline, provider)).toEqual({
      startMs: 400,
      endMs: 1550,
      occurrenceIds: ['o002', 'o003', 'o004'],
    })
    expect(originalFirst.playStartMs).toBe(50)
    expect(originalLast.playEndMs).toBe(750)
  })

  it('rejects unknown, empty, reverse, and invalid ranges', () => {
    expect(() => resolvePracticeRange({ kind: 'currentOccurrence', occurrenceId: 'missing' }, practice, timeline)).toThrow('unknown Occurrence')
    expect(() => resolvePracticeRange({ kind: 'coveredRange', practiceUnitId: 'p001', endOccurrenceId: 'o004' }, practice, timeline)).toThrow('does not belong')
    expect(() => resolvePracticeRange({ kind: 'customRange', startOccurrenceId: 'o004', endOccurrenceId: 'o002' }, practice, timeline)).toThrow('chronological')
    expect(() => resolvePracticeRange({ kind: 'practiceUnit', practiceUnitId: 'missing' }, practice, timeline)).toThrow('unknown Practice Unit')
  })

  it('provides occurrence and Unit navigation within the practice map', () => {
    const index = createPracticeIndex(practice, timeline)
    expect(getAdjacentPracticeOccurrence(index, 'p001', 'o001', 'next')).toBe('o002')
    expect(getAdjacentPracticeOccurrence(index, 'p001', 'o001', 'previous')).toBeNull()
    expect(getAdjacentPracticeUnit(index, 'p002', 'previous')?.id).toBe('p001')
    expect(getAdjacentPracticeUnit(index, 'p003', 'next')).toBeNull()
  })
})

function occurrence(
  id: string,
  sectionId: string,
  startMs: number,
  endMs: number,
  playStartMs: number,
  playEndMs: number,
) {
  return {
    id,
    segmentId: `s${id.slice(1)}`,
    sectionId,
    startMs,
    endMs,
    playStartMs,
    playEndMs,
  }
}
