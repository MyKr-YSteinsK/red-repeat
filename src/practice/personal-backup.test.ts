import { describe, expect, it } from 'vitest'
import type { RuntimeEdition } from '../library/runtime-schema'
import type { PracticeDocument, TimelineDocument } from '../library/schema'
import {
  commitPersonalBackupImport,
  parsePersonalBackup,
  preparePersonalBackupImport,
  serializePersonalBackup,
  type BackupCurrentEditionContext,
  type BackupStorage,
  type PersonalBackupDocument,
} from './personal-backup'
import { getPracticeStateStorageKey } from './practice-state'
import { getPracticeRateStorageKey } from './practice-rate'
import { createPracticeQueueItemId } from './practice-queue'
import { readResumeContext, RESUME_CONTEXT_STORAGE_KEY } from './resume-context'

const edition: RuntimeEdition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
  lyricsUrl: '/library-runtime/lyrics.a.json',
  timelineUrl: '/library-runtime/timeline.a.json',
  practiceUrl: '/library-runtime/practice.a.json',
  features: [{ id: 'note', url: '/library-runtime/note.md' }],
  audio: {
    url: '/library-runtime/audio.a.m4a',
    sourceHash: 'b'.repeat(64),
    runtimeHash: 'c'.repeat(64),
    durationMs: 1000,
    format: { container: 'm4a', codec: 'aac-lc', bitrateKbps: 192, sampleRate: 48000, channels: 2 },
  },
  artwork: { coverSmallUrl: '/library-runtime/cover.a.webp', coverLargeUrl: '/library-runtime/cover-large.a.webp' },
}
const timeline: TimelineDocument = {
  audioSourceHash: 'b'.repeat(64),
  sections: [{ id: 'verse', label: 'Verse', startMs: 0, endMs: 1000 }],
  occurrences: [
    { id: 'o001', segmentId: 's001', sectionId: 'verse', startMs: 100, endMs: 250 },
    { id: 'o002', segmentId: 's001', sectionId: 'verse', startMs: 400, endMs: 600 },
  ],
}
const practice: PracticeDocument = {
  units: [{ id: 'p001', sectionId: 'verse', label: 'Verse', occurrenceIds: ['o001', 'o002'] }],
}
const context: BackupCurrentEditionContext = {
  edition,
  practice,
  timeline,
  segmentIds: new Set(['s001']),
}

describe('personal backup', () => {
  it('rejects malformed, unknown-version, oversized, unknown-key, and unsafe payloads', () => {
    expect(() => parsePersonalBackup('{')).toThrow('有效 JSON')
    expect(() => parsePersonalBackup(JSON.stringify({ ...backup(), schemaVersion: 2 }))).toThrow('不支持')
    expect(() => parsePersonalBackup(' '.repeat(1_000_001))).toThrow('1 MB')
    expect(() => parsePersonalBackup(JSON.stringify({ ...backup(), extra: true }))).toThrow('未知字段')
    const unsafe = JSON.parse(JSON.stringify(backup())) as Record<string, unknown>
    Object.defineProperty(unsafe.payload, '__proto__', { value: { arbitrary: true }, enumerable: true })
    expect(() => parsePersonalBackup(JSON.stringify(unsafe))).toThrow('数据域')
  })

  it('previews without writes, skips identity/Occurrence mismatches, and preserves existing values by default', () => {
    const storage = new MemoryStorage()
    storage.values.set(getPracticeStateStorageKey('first-light'), 'old-practice')
    const input = backup()
    input.payload.practice.push({
      identity: { ...input.payload.practice[0].identity, editionContentHash: 'd'.repeat(64) },
      value: input.payload.practice[0].value,
    })
    input.payload.timingOverrides = [{
      identity: identity(),
      value: {
        schemaVersion: 3,
        songId: 'first-light',
        editionContentHash: 'a'.repeat(64),
        audioSourceHash: 'b'.repeat(64),
        baseTimelineUrl: '/library-runtime/timeline.a.json',
        occurrences: { o001: { startMs: 500, endMs: 200 } },
      },
    }]

    const preview = preparePersonalBackupImport(input, new Map([['first-light', context]]), storage)
    expect(storage.setCalls).toBe(0)
    expect(preview.candidates.map(({ domain, state }) => [domain, state])).toContainEqual(['practice', 'conflict'])
    expect(preview.candidates.map(({ domain }) => domain)).toContain('rates')
    expect(preview.skipped.practice).toBe(1)
    expect(preview.skipped.timingOverrides).toBe(1)

    const result = commitPersonalBackupImport(preview, new Set(['practice', 'rates']), new Set(), storage)
    expect(result).toEqual({ status: 'committed', written: 1 })
    expect(storage.values.get(getPracticeStateStorageKey('first-light'))).toBe('old-practice')
    expect(storage.values.get(getPracticeRateStorageKey('first-light'))).toBe('0.8')
  })

  it('restores prior keys in reverse order and verifies rollback when a later write fails', () => {
    const storage = new MemoryStorage()
    storage.values.set(getPracticeStateStorageKey('first-light'), 'prior-practice')
    storage.failOnWrite = 2
    const preview = preparePersonalBackupImport(backup(), new Map([['first-light', context]]), storage)
    const result = commitPersonalBackupImport(preview, new Set(['practice', 'rates']), new Set(['practice']), storage)
    expect(result.status).toBe('rolled-back')
    expect(storage.values.get(getPracticeStateStorageKey('first-light'))).toBe('prior-practice')
    expect(storage.values.has(getPracticeRateStorageKey('first-light'))).toBe(false)
  })

  it('never reports success when compensating rollback cannot be verified', () => {
    const storage = new MemoryStorage()
    storage.values.set(getPracticeStateStorageKey('first-light'), 'prior-practice')
    storage.failOnWrites = [2, 3]
    const preview = preparePersonalBackupImport(backup(), new Map([['first-light', context]]), storage)
    const result = commitPersonalBackupImport(preview, new Set(['practice', 'rates']), new Set(['practice']), storage)
    expect(result.status).toBe('rollback-failed')
    expect(result).toHaveProperty('rollbackErrors')
  })

  it('refuses to commit if a key changed after the no-side-effect preview', () => {
    const storage = new MemoryStorage()
    const preview = preparePersonalBackupImport(backup(), new Map([['first-light', context]]), storage)
    storage.values.set(getPracticeRateStorageKey('first-light'), '1')
    expect(commitPersonalBackupImport(preview, new Set(['rates']), new Set(), storage)).toMatchObject({ status: 'changed-since-preview' })
  })

  it('round-trips the explicit whitelist only', () => {
    const parsed = parsePersonalBackup(serializePersonalBackup(backup()))
    expect(parsed.format).toBe('red-repeat-personal-backup')
    expect(Object.keys(parsed.payload).sort()).toEqual(['practice', 'practiceQueue', 'rates', 'timingOverrides'])
    expect(parsed.payload.practice[0].identity.songId).toBe('first-light')
  })

  it('round-trips a Unicode Explain target through backup preview and restore', () => {
    const featureId = '01-先行单曲与《13月1日》-「あの歌」・解説'
    const input = backup()
    input.payload.resumeContext = {
      schemaVersion: 1,
      ...identity(),
      mode: 'explain',
      featureId,
      updatedAt: 130,
    }
    const parsed = parsePersonalBackup(serializePersonalBackup(input))
    expect(parsed.payload.resumeContext?.featureId).toBe(featureId)

    const matchingEditionContext: BackupCurrentEditionContext = {
      ...context,
      edition: {
        ...edition,
        features: [{ id: featureId, url: '/library-runtime/features/unicode.md' }],
      },
    }
    const storage = new MemoryStorage()
    const preview = preparePersonalBackupImport(
      parsed,
      new Map([['first-light', matchingEditionContext]]),
      storage,
    )
    expect(storage.setCalls).toBe(0)
    expect(preview.candidates.map(({ domain }) => domain)).toContain('resumeContext')
    expect(preview.skipped.resumeContext).toBeUndefined()

    const result = commitPersonalBackupImport(preview, new Set(['resumeContext']), new Set(), storage)
    expect(result).toEqual({ status: 'committed', written: 1 })
    expect(storage.values.has(RESUME_CONTEXT_STORAGE_KEY)).toBe(true)
    expect(readResumeContext(storage)).toEqual(input.payload.resumeContext)
  })

  it('accepts a timing override only with matching Edition/audio/Timeline and canonical Occurrence fields', () => {
    const input = backup()
    input.payload.timingOverrides = [{
      identity: identity(),
      value: {
        schemaVersion: 3,
        songId: 'first-light',
        editionContentHash: 'a'.repeat(64),
        audioSourceHash: 'b'.repeat(64),
        baseTimelineUrl: '/library-runtime/timeline.a.json',
        occurrences: { o001: { startMs: 120 } },
      },
    }]
    const preview = preparePersonalBackupImport(input, new Map([['first-light', context]]), new MemoryStorage())
    expect(preview.candidates.map(({ domain }) => domain)).toContain('timingOverrides')
    input.payload.timingOverrides[0].value.audioSourceHash = 'd'.repeat(64)
    const mismatch = preparePersonalBackupImport(input, new Map([['first-light', context]]), new MemoryStorage())
    expect(mismatch.candidates.map(({ domain }) => domain)).not.toContain('timingOverrides')
    expect(mismatch.skipped.timingOverrides).toBe(1)

    input.payload.timingOverrides[0].value.audioSourceHash = 'b'.repeat(64)
    input.payload.timingOverrides[0].value.occurrences = { removedOccurrence: { startMs: 120 } }
    const removed = preparePersonalBackupImport(input, new Map([['first-light', context]]), new MemoryStorage())
    expect(removed.candidates.map(({ domain }) => domain)).not.toContain('timingOverrides')
    expect(removed.skipped.timingOverrides).toBe(1)
  })

  it('rejects resume and queue targets whose stable ids do not map to the saved lyric', () => {
    const input = backup()
    input.payload.resumeContext = {
      schemaVersion: 1,
      ...identity(),
      mode: 'practice',
      practiceUnitId: 'wrong-unit',
      occurrenceId: 'o002',
      updatedAt: 12,
    }
    const queueItem = {
      ...identity(),
      practiceUnitId: 'p001',
      occurrenceId: 'o002',
      segmentId: 'other-segment',
      addedAt: 12,
    }
    input.payload.practiceQueue = {
      schemaVersion: 1,
      items: [{ ...queueItem, id: createPracticeQueueItemId(queueItem) }],
    }

    const preview = preparePersonalBackupImport(input, new Map([['first-light', context]]), new MemoryStorage())
    expect(preview.candidates.map(({ domain }) => domain)).not.toContain('resumeContext')
    expect(preview.skipped.resumeContext).toBe(1)
    expect(preview.candidates.map(({ domain }) => domain)).not.toContain('practiceQueue')
    expect(preview.skipped.practiceQueue).toBe(1)
  })
})

function identity() {
  return {
    songId: 'first-light',
    editionContentHash: 'a'.repeat(64),
    audioSourceHash: 'b'.repeat(64),
    timelineUrl: '/library-runtime/timeline.a.json',
  }
}

function backup(): PersonalBackupDocument {
  return {
    format: 'red-repeat-personal-backup',
    schemaVersion: 1,
    createdAt: '2026-10-14T00:00:00.000Z',
    payload: {
      practice: [{ identity: identity(), value: {
        schemaVersion: 1,
        practiceUnitId: 'p001',
        currentOccurrenceId: 'o002',
        coveredUntilByUnit: { p001: 'o002' },
        updatedAt: 9,
      } }],
      rates: [{ identity: identity(), value: 0.8 }],
      timingOverrides: [],
      practiceQueue: { schemaVersion: 1, items: [] },
    },
  }
}

class MemoryStorage implements BackupStorage {
  readonly values = new Map<string, string>()
  setCalls = 0
  failOnWrite?: number
  failOnWrites?: number[]
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void {
    this.setCalls++
    if (this.setCalls === this.failOnWrite || this.failOnWrites?.includes(this.setCalls)) {
      throw new Error('simulated quota failure')
    }
    this.values.set(key, value)
  }
  removeItem(key: string): void { this.values.delete(key) }
}
