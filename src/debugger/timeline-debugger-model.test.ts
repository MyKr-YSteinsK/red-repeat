import { describe, expect, it } from 'vitest'

import type { TimelineDocument } from '../library/schema'
import {
  areTimelinesEqual,
  cloneTimeline,
  prepareTimelineForExport,
  serializeTimeline,
  updateOccurrenceTiming,
  updateSectionTiming,
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
      startMs: 50,
      endMs: 450,
    },
  ],
}

describe('Timeline Debugger working-copy model', () => {
  it('applies exact timing deltas without clamping or mutating the source', () => {
    const changed = updateOccurrenceTiming(timeline, 'o001', 'startMs', -100)

    expect(changed.occurrences[0].startMs).toBe(-50)
    expect(timeline.occurrences[0].startMs).toBe(50)
    expect(validateTimelineWorkingCopy(changed)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'occurrences[o001].timing',
        }),
      ]),
    })
  })

  it('allows authoritative timing to cross its Section boundary', () => {
    const changed = updateOccurrenceTiming(timeline, 'o001', 'endMs', 250)
    const validation = validateTimelineWorkingCopy(changed)

    expect(validation.valid).toBe(true)
    expect(validation.errors).toEqual([])
  })

  it('updates instrumental Section timing without moving its Occurrences', () => {
    const twoSectionTimeline: TimelineDocument = {
      ...timeline,
      sections: [
        timeline.sections[0],
        {
          id: 'instrumental',
          label: 'Instrumental',
          startMs: 700,
          endMs: 1000,
        },
      ],
    }
    const changed = updateSectionTiming(
      twoSectionTimeline,
      'instrumental',
      'startMs',
      -150,
    )

    expect(changed.sections[1].startMs).toBe(550)
    expect(twoSectionTimeline.sections[1].startMs).toBe(700)
    expect(validateTimelineWorkingCopy(changed).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'sections[instrumental]',
          message: expect.stringContaining('overlaps verse'),
        }),
      ]),
    )
  })

  it('keeps Section timing separate when a Section is shortened', () => {
    const changed = updateSectionTiming(timeline, 'verse', 'endMs', -250)
    const validation = validateTimelineWorkingCopy(changed)

    expect(changed.sections[0].endMs).toBe(350)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toEqual([])
  })

  it('clones and compares a working copy deterministically', () => {
    const copy = cloneTimeline(timeline)

    expect(copy).not.toBe(timeline)
    expect(copy).toEqual(timeline)
    expect(areTimelinesEqual(copy, timeline)).toBe(true)
    copy.occurrences[0].endMs += 50
    expect(areTimelinesEqual(copy, timeline)).toBe(false)
  })

  it('serializes the complete source-order Timeline with the runtime audio hash', () => {
    const exportTimeline = prepareTimelineForExport(timeline, 'b'.repeat(64))
    const serialized = serializeTimeline(exportTimeline)

    expect(exportTimeline.audioSourceHash).toBe('b'.repeat(64))
    expect(exportTimeline.sections.map((section) => section.id)).toEqual(['verse'])
    expect(exportTimeline.occurrences.map((occurrence) => occurrence.id)).toEqual([
      'o001',
    ])
    expect(serialized).toBe(`${JSON.stringify(exportTimeline, null, 2)}\n`)
    expect(JSON.parse(serialized)).toEqual(exportTimeline)
  })
})
