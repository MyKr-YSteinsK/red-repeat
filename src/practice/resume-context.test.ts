import { describe, expect, it } from 'vitest'
import {
  isResumeIdentityCompatible,
  parseResumeContext,
  readResumeContext,
  RESUME_CONTEXT_STORAGE_KEY,
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

  it('round-trips a printable Unicode Explain Feature ID without changing its exact value', () => {
    const featureId = '01-先行单曲与《13月1日》-「あの歌」・解説'
    const value: ResumeContext = {
      schemaVersion: 1,
      songId: 'first-light',
      editionContentHash: 'a'.repeat(64),
      audioSourceHash: 'b'.repeat(64),
      timelineUrl: '/library-runtime/timeline.a.json',
      mode: 'explain',
      featureId,
      updatedAt: 124,
    }
    const storage = new MemoryStorage()

    expect(saveResumeContext(value, storage)).toBe(true)
    expect(JSON.parse(storage.getItem(RESUME_CONTEXT_STORAGE_KEY) ?? 'null')).toEqual(value)
    expect(parseResumeContext(JSON.parse(storage.getItem(RESUME_CONTEXT_STORAGE_KEY) ?? 'null'))).toEqual(value)
    expect(readResumeContext(storage)).toEqual(value)
  })

  it.each([
    '',
    ' \u3000 ',
    ' leading',
    'trailing ',
    'a/b',
    'a\\b',
    '.',
    '..',
    'C:relative-path',
    'bad\u0001id',
    'bad\u202Eid',
    '漢'.repeat(257),
  ])('rejects unsafe or oversized Feature IDs: %s', (featureId) => {
    const value: ResumeContext = {
      schemaVersion: 1,
      songId: 'first-light',
      editionContentHash: 'a'.repeat(64),
      audioSourceHash: 'b'.repeat(64),
      timelineUrl: '/library-runtime/timeline.a.json',
      mode: 'explain',
      featureId,
      updatedAt: 125,
    }
    const storage = new MemoryStorage()

    expect(parseResumeContext(value)).toBeUndefined()
    expect(saveResumeContext(value, storage)).toBe(false)
    expect(storage.getItem(RESUME_CONTEXT_STORAGE_KEY)).toBeNull()
  })

  it('keeps song, Occurrence and Practice Unit identifiers on the existing ASCII contract', () => {
    const value: ResumeContext = {
      schemaVersion: 1,
      songId: 'first-light',
      editionContentHash: 'a'.repeat(64),
      audioSourceHash: 'b'.repeat(64),
      timelineUrl: '/library-runtime/timeline.a.json',
      mode: 'practice',
      occurrenceId: 'o001',
      practiceUnitId: 'p001',
      updatedAt: 126,
    }

    expect(parseResumeContext({ ...value, songId: '第一首歌' })).toBeUndefined()
    expect(parseResumeContext({ ...value, occurrenceId: '句001' })).toBeUndefined()
    expect(parseResumeContext({ ...value, practiceUnitId: '練習001' })).toBeUndefined()
    expect(parseResumeContext(value)).toEqual(value)
  })
})

class MemoryStorage implements ResumeStorage {
  private value: string | null = null
  getItem(key: string): string | null {
    void key
    return this.value
  }
  setItem(_key: string, value: string): void { this.value = value }
}
