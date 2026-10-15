import { describe, expect, it } from 'vitest'
import {
  createTimingOverridesDocument,
  updateTimingOverride,
} from '../practice/practice-timing-overrides'
import type { Occurrence } from '../library/schema'
import {
  commitTimingEdit,
  createTimingEditHistory,
  isTimingEditDirty,
  markTimingEditSaved,
  redoTimingEdit,
  undoTimingEdit,
} from './timing-edit-history'

const identity = {
  songId: 'first-light',
  editionContentHash: 'a'.repeat(64),
  audioSourceHash: 'b'.repeat(64),
  baseTimelineUrl: '/library-runtime/timeline.json',
}

const occurrence: Occurrence = {
  id: 'o001',
  segmentId: 's001',
  sectionId: 'verse',
  startMs: 50,
  endMs: 350,
}

function updateStart(document: ReturnType<typeof createTimingOverridesDocument>, delta: number) {
  return updateTimingOverride(
    document,
    occurrence,
    'startMs',
    (document.occurrences.o001?.startMs ?? occurrence.startMs) + delta,
  )
}

describe('Timing Debugger edit history', () => {
  it('undoes and redoes atomic edits, then clears redo after a new edit', () => {
    let history = createTimingEditHistory(createTimingOverridesDocument(identity))
    history = commitTimingEdit(history, updateStart(history.current, 20))
    history = commitTimingEdit(history, updateStart(history.current, 20))

    expect(history.current.occurrences.o001).toEqual({ startMs: 90 })
    expect(isTimingEditDirty(history)).toBe(true)

    history = undoTimingEdit(history)
    expect(history.current.occurrences.o001).toEqual({ startMs: 70 })
    history = redoTimingEdit(history)
    expect(history.current.occurrences.o001).toEqual({ startMs: 90 })

    history = undoTimingEdit(history)
    history = commitTimingEdit(history, updateStart(history.current, 100))
    expect(history.current.occurrences.o001).toEqual({ startMs: 170 })
    expect(redoTimingEdit(history)).toBe(history)
  })

  it('keeps only the configured number of undo steps and moves the saved baseline', () => {
    let history = createTimingEditHistory(createTimingOverridesDocument(identity), 2)
    history = commitTimingEdit(history, updateStart(history.current, 20))
    history = commitTimingEdit(history, updateStart(history.current, 20))
    history = commitTimingEdit(history, updateStart(history.current, 20))
    expect(history.past).toHaveLength(2)

    history = markTimingEditSaved(history)
    expect(isTimingEditDirty(history)).toBe(false)
    history = undoTimingEdit(history)
    expect(isTimingEditDirty(history)).toBe(true)
    history = undoTimingEdit(history)
    expect(history.current.occurrences.o001).toEqual({ startMs: 70 })
    expect(undoTimingEdit(history)).toBe(history)
  })
})
