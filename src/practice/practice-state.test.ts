import { describe, expect, it } from 'vitest'
import {
  createInitialPracticeState,
  loadPracticeLearningState,
  readPracticeResumeMetadata,
  resolvePracticeResumeSummary,
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

  it('persists a sortable updatedAt for a newly selected Practice position', () => {
    const storage = new MemoryStorage()
    const index = createPracticeIndex(practice, timeline)
    const state = setCurrentPracticeOccurrence(
      createInitialPracticeState(index),
      index,
      'o002',
    )

    expect(state.updatedAt).toEqual(expect.any(Number))
    savePracticeLearningState('first-light', state, storage)

    expect(readPracticeResumeMetadata('first-light', storage)).toEqual({
      updatedAt: state.updatedAt,
      practiceUnitId: 'p001',
      occurrenceId: 'o002',
    })
  })

  it('reads v1 state without updatedAt and never writes during resume reads', () => {
    const storage = new MemoryStorage()
    storage.value = JSON.stringify({
      schemaVersion: 1,
      practiceUnitId: 'p001',
      currentOccurrenceId: 'o002',
      coveredUntilByUnit: { p001: 'o002' },
    })

    expect(
      loadPracticeLearningState('first-light', practice, timeline, storage),
    ).toMatchObject({
      practiceUnitId: 'p001',
      currentOccurrenceId: 'o002',
    })
    expect(readPracticeResumeMetadata('first-light', storage)).toEqual({
      practiceUnitId: 'p001',
      occurrenceId: 'o002',
    })
    expect(storage.writeCount).toBe(0)
  })

  it('resolves a legacy resume summary without manufacturing updatedAt', () => {
    const storage = new MemoryStorage()
    storage.value = JSON.stringify({
      schemaVersion: 1,
      practiceUnitId: 'p001',
      currentOccurrenceId: 'o002',
      coveredUntilByUnit: { p001: 'o002' },
    })
    const metadata = readPracticeResumeMetadata('first-light', storage)

    expect(metadata).toEqual({ practiceUnitId: 'p001', occurrenceId: 'o002' })
    expect(
      resolvePracticeResumeSummary(metadata!, practice, timeline),
    ).toEqual({
      practiceUnitId: 'p001',
      occurrenceId: 'o002',
      unitLabel: 'First',
      lineIndex: 2,
      lineCount: 2,
    })
    expect(storage.writeCount).toBe(0)
  })

  it('rejects invalid resume timestamps while accepting a missing legacy timestamp', () => {
    const storage = new MemoryStorage()
    const legacyState = {
      schemaVersion: 1,
      practiceUnitId: 'p001',
      currentOccurrenceId: 'o002',
      coveredUntilByUnit: { p001: 'o002' },
    }

    storage.value = JSON.stringify({ ...legacyState, updatedAt: null })
    expect(readPracticeResumeMetadata('first-light', storage)).toBeUndefined()

    storage.value = JSON.stringify(legacyState)
    expect(readPracticeResumeMetadata('first-light', storage)).toEqual({
      practiceUnitId: 'p001',
      occurrenceId: 'o002',
    })
    expect(storage.writeCount).toBe(0)
  })

  it('resolves a user-facing line summary without changing covered progress', () => {
    const storage = new MemoryStorage()
    const index = createPracticeIndex(practice, timeline)
    const state = setCurrentPracticeOccurrence(
      createInitialPracticeState(index),
      index,
      'o002',
    )
    savePracticeLearningState('first-light', state, storage)
    const before = storage.value
    const metadata = readPracticeResumeMetadata('first-light', storage)

    expect(metadata).toBeDefined()
    expect(
      resolvePracticeResumeSummary(metadata!, practice, timeline),
    ).toMatchObject({
      updatedAt: state.updatedAt,
      practiceUnitId: 'p001',
      occurrenceId: 'o002',
      unitLabel: 'First',
      lineIndex: 2,
      lineCount: 2,
    })
    expect(storage.value).toBe(before)
  })

  it('does not produce a summary for stale Practice Unit or Occurrence ids', () => {
    const staleMetadata = {
      updatedAt: 123,
      practiceUnitId: 'missing',
      occurrenceId: 'missing',
    }

    expect(
      resolvePracticeResumeSummary(staleMetadata, practice, timeline),
    ).toBeUndefined()
    expect(
      resolvePracticeResumeSummary(
        { ...staleMetadata, practiceUnitId: 'p001', occurrenceId: 'missing' },
        practice,
        timeline,
      ),
    ).toBeUndefined()
  })

  it('rebinds persisted progress by Occurrence when Practice Units are regrouped', () => {
    const regroupedPractice = {
      units: [
        { id: 'p001', sectionId: 'verse', label: 'First', occurrenceIds: ['o001'] },
        { id: 'p003', sectionId: 'verse', label: 'Merged', occurrenceIds: ['o002', 'o003'] },
      ],
    }
    const storage = new MemoryStorage()
    storage.value = JSON.stringify({
      schemaVersion: 1,
      // p002 is the old unit id for the same occurrence; the new source uses p003.
      practiceUnitId: 'p002',
      currentOccurrenceId: 'o002',
      coveredUntilByUnit: { p002: 'o002' },
    })

    expect(
      loadPracticeLearningState(
        'first-light',
        regroupedPractice,
        timeline,
        storage,
      ),
    ).toMatchObject({
      practiceUnitId: 'p003',
      currentOccurrenceId: 'o002',
      coveredUntilByUnit: { p003: 'o002' },
    })
    expect(
      resolvePracticeResumeSummary(
        { practiceUnitId: 'p002', occurrenceId: 'o002' },
        regroupedPractice,
        timeline,
      ),
    ).toMatchObject({
      practiceUnitId: 'p003',
      unitLabel: 'Merged',
      lineIndex: 1,
      lineCount: 2,
    })
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
  writeCount = 0

  getItem(): string | null {
    return this.value
  }

  setItem(_key: string, value: string): void {
    this.value = value
    this.writeCount += 1
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
