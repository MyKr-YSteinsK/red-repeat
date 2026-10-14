import { describe, expect, it } from 'vitest'
import {
  addPracticeQueueItem,
  createPracticeQueueItemId,
  movePracticeQueueItem,
  parsePracticeQueue,
  readPracticeQueue,
  removePracticeQueueItem,
  type PracticeQueueStorage,
} from './practice-queue'

describe('Practice queue', () => {
  it('deduplicates by exact edition and Occurrence, persists order, and removes explicitly', () => {
    const storage = new MemoryStorage()
    const first = item('o001')
    const second = item('o002')

    expect(addPracticeQueueItem(first, storage)).toBe('added')
    expect(addPracticeQueueItem(first, storage)).toBe('duplicate')
    expect(addPracticeQueueItem(second, storage)).toBe('added')
    expect(movePracticeQueueItem(createPracticeQueueItemId(second), -1, storage)).toBe(true)
    expect(readPracticeQueue(storage).items.map(({ occurrenceId }) => occurrenceId)).toEqual(['o002', 'o001'])
    expect(removePracticeQueueItem(createPracticeQueueItemId(first), storage)).toBe(true)
    expect(readPracticeQueue(storage).items.map(({ occurrenceId }) => occurrenceId)).toEqual(['o002'])
  })

  it('keeps queue identities distinct when audio or timeline identity changes', () => {
    const storage = new MemoryStorage()
    const original = item('o001')
    const changedAudio = {
      ...original,
      audioSourceHash: 'c'.repeat(64),
      id: createPracticeQueueItemId({ ...original, audioSourceHash: 'c'.repeat(64) }),
    }
    const changedTimeline = {
      ...original,
      timelineUrl: '/library-runtime/timeline.b.json',
      id: createPracticeQueueItemId({ ...original, timelineUrl: '/library-runtime/timeline.b.json' }),
    }

    expect(addPracticeQueueItem(original, storage)).toBe('added')
    expect(addPracticeQueueItem(changedAudio, storage)).toBe('added')
    expect(addPracticeQueueItem(changedTimeline, storage)).toBe('added')
    expect(readPracticeQueue(storage).items).toHaveLength(3)
  })

  it('rejects duplicate identifiers, unknown fields, and prototype keys', () => {
    const valid = { schemaVersion: 1, items: [item('o001')] }
    expect(parsePracticeQueue(valid)).toEqual(valid)
    expect(parsePracticeQueue({ ...valid, extra: true })).toBeUndefined()
    expect(parsePracticeQueue({ schemaVersion: 1, items: [item('o001'), item('o001')] })).toBeUndefined()
    const unsafe = item('o001') as Record<string, unknown>
    Object.defineProperty(unsafe, '__proto__', { value: { unsafe: true }, enumerable: true })
    expect(parsePracticeQueue({ schemaVersion: 1, items: [unsafe] })).toBeUndefined()
  })
})

function item(occurrenceId: string) {
  const value = {
    songId: 'first-light',
    editionContentHash: 'a'.repeat(64),
    audioSourceHash: 'b'.repeat(64),
    timelineUrl: '/library-runtime/timeline.a.json',
    practiceUnitId: 'p001',
    occurrenceId,
    segmentId: 's001',
    addedAt: 42,
  }
  return { ...value, id: createPracticeQueueItemId(value) }
}

class MemoryStorage implements PracticeQueueStorage {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}
