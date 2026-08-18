import { describe, expect, it } from 'vitest'

import type { TimelineDocument } from '../library/schema'
import {
  areTimelinesEqual,
  cloneTimeline,
  updateOccurrenceTiming,
  validateTimelineWorkingCopy,
} from './timeline-debugger-model'

const timeline: TimelineDocument = {
  audioSourceHash: 'a'.repeat(64),
  sections: [
    {
      id: 'verse',
      label: 'Verse',
      startMs: 0,
      endMs: 600,
    },
  ],
  occurrences: [
    {
      id: 'o001',
      segmentId: 's001',
      sectionId: 'verse',
      startMs: 100,
      endMs: 400,
      playStartMs: 50,
      playEndMs: 450,
    },
  ],
}

describe('Timeline Debugger working-copy model', () => {
  it('applies exact timing deltas without clamping or mutating the source', () => {
    const changed = updateOccurrenceTiming(timeline, 'o001', 'playStartMs', -100)

    expect(changed.occurrences[0].playStartMs).toBe(-50)
    expect(timeline.occurrences[0].playStartMs).toBe(50)
    expect(validateTimelineWorkingCopy(changed)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'occurrences[o001].timing',
        }),
      ]),
    })
  })

  it('reports actual timing outside its Section separately from practice-range rules', () => {
    const changed = updateOccurrenceTiming(timeline, 'o001', 'endMs', 250)
    const validation = validateTimelineWorkingCopy(changed)

    expect(validation.valid).toBe(false)
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'occurrences[o001].endMs',
          message: expect.stringContaining('within Section verse'),
        }),
      ]),
    )
  })

  it('clones and compares a working copy deterministically', () => {
    const copy = cloneTimeline(timeline)

    expect(copy).not.toBe(timeline)
    expect(copy).toEqual(timeline)
    expect(areTimelinesEqual(copy, timeline)).toBe(true)
    copy.occurrences[0].endMs += 50
    expect(areTimelinesEqual(copy, timeline)).toBe(false)
  })
})
