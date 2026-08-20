import { describe, expect, it } from 'vitest'
import {
  getNextPracticePlaybackRate,
  getPracticeRateStorageKey,
  readPracticePlaybackRate,
  savePracticePlaybackRate,
  type PracticeRateStorage,
} from './practice-rate'

describe('practice playback rate persistence', () => {
  it('stores and restores only AudioEngine-normalized rates', () => {
    const storage = new MemoryStorage()
    const songId = 'first-light'

    savePracticePlaybackRate(songId, 0.75, storage)
    expect(storage.getItem(getPracticeRateStorageKey(songId))).toBe('0.75')
    expect(readPracticePlaybackRate(songId, storage)).toBe(0.75)

    storage.setItem(getPracticeRateStorageKey(songId), '0.751')
    expect(readPracticePlaybackRate(songId, storage)).toBe(1)
    storage.setItem(getPracticeRateStorageKey(songId), 'not-a-rate')
    expect(readPracticePlaybackRate(songId, storage)).toBe(1)
  })

  it('steps without exceeding the AudioEngine rate boundaries', () => {
    expect(getNextPracticePlaybackRate(0.5, -1)).toBe(0.5)
    expect(getNextPracticePlaybackRate(1.25, 1)).toBe(1.25)
    expect(getNextPracticePlaybackRate(0.75, 1)).toBe(0.8)
    expect(getNextPracticePlaybackRate(0.8, -1)).toBe(0.75)
  })
})

class MemoryStorage implements PracticeRateStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}
