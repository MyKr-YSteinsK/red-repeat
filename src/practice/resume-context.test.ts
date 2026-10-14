import { describe, expect, it } from 'vitest'
import {
  isResumeIdentityCompatible,
  parseResumeContext,
  readResumeContext,
  saveResumeContext,
  type ResumeContext,
  type ResumeStorage,
} from './resume-context'

describe('resume context', () => {
  it('accepts optional stable targets and persists only the single typed record', () => {
    const storage = new MemoryStorage()
    const value: ResumeContext = {
      schemaVersion: 1,
      songId: 'first-light',
      editionContentHash: 'a'.repeat(64),
      audioSourceHash: 'b'.repeat(64),
      timelineUrl: '/library-runtime/timeline.a.json',
      mode: 'all',
      updatedAt: 123,
    }
    expect(saveResumeContext(value, storage)).toBe(true)
    expect(readResumeContext(storage)).toEqual(value)
    expect(parseResumeContext({ ...value, arbitrary: 'secret' })).toBeUndefined()
    expect(parseResumeContext({ ...value, editionContentHash: 'c'.repeat(64) })).toEqual({
      ...value,
      editionContentHash: 'c'.repeat(64),
    })
    expect(isResumeIdentityCompatible(value, { ...value, timelineUrl: '/library-runtime/timeline.b.json' })).toBe(false)
  })
})

class MemoryStorage implements ResumeStorage {
  private value: string | null = null
  getItem(): string | null { return this.value }
  setItem(_key: string, value: string): void { this.value = value }
}
