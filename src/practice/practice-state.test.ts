import { describe, expect, it } from 'vitest'
import {
  createInitialPracticeState,
  loadPracticeLearningState,
  savePracticeLearningState,
  setCurrentPracticeOccurrence,
  type PracticeStorage,
} from './practice-state'
import { createPracticeIndex } from './practice-scope'

const timeline = {
  audioSourceHash: 'a'.repeat(64),
  sections: [{ id: 'verse', label: 'Verse', startMs: 0, endMs: 1000 }],
  occurrences: [
    occurrence('o001', 100, 300),
    occurrence('o002', 400, 600),
    occurrence('o003', 700, 900),
  ],
}

const practice = {
  units: [
    { id: 'p001', sectionId: 'verse', label: 'First', occurrenceIds: ['o001', 'o002'] },
    { id: 'p002', sectionId: 'verse', label: 'Second', occurrenceIds: ['o003'] },
  ],
}

describe('Practice learning state', () => {
  it('advances coveredUntil monotonically and does not regress on back navigation', () => {
    const index = createPracticeIndex(practice, timeline)
    const initial = createInitialPracticeState(index)
    const advanced = setCurrentPracticeOccurrence(initial, index, 'o002')
    const returned = setCurrentPracticeOccurrence(advanced, index, 'o001')

    expect(advanced.coveredUntilByUnit.p001).toBe('o002')
    expect(returned.currentOccurrenceId).toBe('o001')
    expect(returned.coveredUntilByUnit.p001).toBe('o002')
  })

  it('restores valid song-scoped state without autoplay concerns', () => {
    const storage = new MemoryStorage()
    const index = createPracticeIndex(practice, timeline)
    const state = setCurrentPracticeOccurrence(
      createInitialPracticeState(index),
      index,
      'o002',
    )
    savePracticeLearningState('first-light', state, storage)

    expect(loadPracticeLearningState('first-light', practice, timeline, storage)).toEqual(state)
  })

  it('falls back safely for corrupt or stale state', () => {
    const storage = new MemoryStorage()
    storage.value = '{broken'
    expect(loadPracticeLearningState('first-light', practice, timeline, storage)).toMatchObject({
      practiceUnitId: 'p001',
      currentOccurrenceId: 'o001',
    })

    storage.value = JSON.stringify({
      schemaVersion: 1,
      practiceUnitId: 'missing',
      currentOccurrenceId: 'missing',
      coveredUntilByUnit: { missing: 'missing' },
    })
    expect(loadPracticeLearningState('first-light', practice, timeline, storage)).toMatchObject({
      practiceUnitId: 'p001',
      currentOccurrenceId: 'o001',
    })
  })

  it('does not block use when localStorage operations throw', () => {
    const throwingStorage: PracticeStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    const index = createPracticeIndex(practice, timeline)
    const state = createInitialPracticeState(index)

    expect(loadPracticeLearningState('first-light', practice, timeline, throwingStorage)).toEqual(state)
    expect(() => savePracticeLearningState('first-light', state, throwingStorage)).not.toThrow()
  })
})

class MemoryStorage implements PracticeStorage {
  value: string | null = null

  getItem(): string | null {
    return this.value
  }

  setItem(_key: string, value: string): void {
    this.value = value
  }
}

function occurrence(id: string, startMs: number, endMs: number) {
  return {
    id,
    segmentId: `s${id.slice(1)}`,
    sectionId: 'verse',
    startMs,
    endMs,
    playStartMs: startMs - 50,
    playEndMs: endMs + 50,
  }
}
