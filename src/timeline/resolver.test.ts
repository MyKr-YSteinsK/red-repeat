import { describe, expect, it } from 'vitest'
import { resolveTimeline } from './resolver'
import type { TimelineDocument } from '../library/schema'

const timeline: TimelineDocument = {
  audioSourceHash: 'a'.repeat(64),
  sections: [
    { id: 'verse-1', label: 'Verse 1', startMs: 100, endMs: 1000 },
    { id: 'instrumental', label: 'Instrumental', startMs: 1500, endMs: 2500 },
    { id: 'verse-2', label: 'Verse 2', startMs: 2500, endMs: 4000 },
  ],
  occurrences: [
    occurrence('o001', 200, 400, 0, 450),
    occurrence('o002', 400, 700, 350, 750),
    occurrence('o003', 400, 550, 350, 600),
    occurrence('o004', 800, 900, 750, 950),
    occurrence('o005', 2700, 3000, 2650, 3050),
  ],
}

describe('Timeline Resolver', () => {
  it('returns no Section before the first Section', () => {
    const result = resolveTimeline(timeline, 50)

    expect(result.currentSection).toBeNull()
    expect(result.activeOccurrences).toEqual([])
    expect(result.previousOccurrence).toBeNull()
    expect(result.nextOccurrence?.id).toBe('o001')
  })

  it('enters a Section at its exact start and reports zero progress', () => {
    const result = resolveTimeline(timeline, 100)

    expect(result.currentSection?.id).toBe('verse-1')
    expect(result.sectionProgress).toBe(0)
  })

  it('leaves a Section at its exact end and keeps gaps empty', () => {
    const atSectionEnd = resolveTimeline(timeline, 1000)
    const inGap = resolveTimeline(timeline, 1200)

    expect(atSectionEnd.currentSection).toBeNull()
    expect(inGap.currentSection).toBeNull()
    expect(inGap.activeOccurrences).toEqual([])
    expect(inGap.previousOccurrence?.id).toBe('o004')
    expect(inGap.nextOccurrence?.id).toBe('o005')
  })

  it('selects the next adjacent Section at its shared boundary', () => {
    const result = resolveTimeline(timeline, 2500)

    expect(result.currentSection?.id).toBe('verse-2')
    expect(result.sectionProgress).toBe(0)
  })

  it('resolves an instrumental Section without active Occurrences', () => {
    const result = resolveTimeline(timeline, 2000)

    expect(result.currentSection?.id).toBe('instrumental')
    expect(result.activeOccurrences).toEqual([])
    expect(result.sectionProgress).toBe(0.5)
  })

  it('resolves one active Occurrence and its Section progress', () => {
    const result = resolveTimeline(timeline, 250)

    expect(result.activeOccurrences.map(({ id }) => id)).toEqual(['o001'])
    expect(result.primaryOccurrence?.id).toBe('o001')
    expect(result.sectionProgress).toBeCloseTo(150 / 900)
  })

  it('keeps overlapping Occurrences in deterministic order', () => {
    const result = resolveTimeline(timeline, 450)

    expect(result.activeOccurrences.map(({ id }) => id)).toEqual(['o002', 'o003'])
    expect(result.primaryOccurrence?.id).toBe('o002')
    expect(result.previousOccurrence?.id).toBe('o001')
    expect(result.nextOccurrence?.id).toBe('o003')
  })

  it('treats an Occurrence end as inactive', () => {
    const result = resolveTimeline(timeline, 400)

    expect(result.activeOccurrences.map(({ id }) => id)).toEqual(['o002', 'o003'])
    expect(result.activeOccurrences.some(({ id }) => id === 'o001')).toBe(false)
  })

  it('keeps Section progress below one before the end boundary', () => {
    const result = resolveTimeline(timeline, 999.999)

    expect(result.sectionProgress).toBeGreaterThanOrEqual(0)
    expect(result.sectionProgress).toBeLessThan(1)
  })

  it('rejects invalid resolver time input', () => {
    expect(() => resolveTimeline(timeline, -1)).toThrow(RangeError)
    expect(() => resolveTimeline(timeline, Number.NaN)).toThrow(RangeError)
  })
})

function occurrence(
  id: string,
  startMs: number,
  endMs: number,
  playStartMs: number,
  playEndMs: number,
) {
  return {
    id,
    segmentId: `s${id.slice(1)}`,
    sectionId: startMs >= 2500 ? 'verse-2' : 'verse-1',
    startMs,
    endMs,
    playStartMs,
    playEndMs,
  }
}
