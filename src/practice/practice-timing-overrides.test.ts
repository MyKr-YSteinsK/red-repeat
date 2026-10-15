import { describe, expect, it } from 'vitest'
import type { Occurrence } from '../library/schema'
import {
  acknowledgeTimelineStale,
  applyTimingOverride,
  classifyTimingOverridesDocument,
  clearTimingOverrides,
  createEffectiveOccurrenceTimingProvider,
  createTimingOverridesDocument,
  getTimingOverridesStorageKey,
  listTimingOverrideArchive,
  parseTimingOverridesDocument,
  preserveLegacyTimingOverrides,
  readTimingOverrideStorageSnapshot,
  readTimingOverrides,
  resetTimingOverride,
  saveTimingOverrides,
  serializeTimingOverrides,
  serializeTimingOverrideArchiveExport,
  updateTimingOverride,
  validateTimingOverridesDocument,
  type TimingOverrideIdentity,
  type TimingOverrideStorage,
} from './practice-timing-overrides'

const identity: TimingOverrideIdentity = {
  songId: 'work-millennium-parade',
  editionContentHash: 'b'.repeat(64),
  audioSourceHash: 'a'.repeat(64),
  baseTimelineUrl: '/library-runtime/work-millennium-parade/timeline.a.json',
}

const occurrence = createOccurrence('o018', 36_500, 40_140)

describe('practice timing overrides', () => {
  it('round-trips sparse partial start/end overrides with stable JSON', () => {
    const document = createTimingOverridesDocument(identity)
    const withStart = updateTimingOverride(
      document,
      occurrence,
      'startMs',
      36_420,
    )
    const withBoth = updateTimingOverride(
      withStart,
      occurrence,
      'endMs',
      39_860,
    )

    expect(withBoth.occurrences).toEqual({
      o018: { startMs: 36_420, endMs: 39_860 },
    })
    expect(serializeTimingOverrides(withBoth)).toBe(`{
  "schemaVersion": 3,
  "songId": "work-millennium-parade",
  "editionContentHash": "${'b'.repeat(64)}",
  "audioSourceHash": "${'a'.repeat(64)}",
  "baseTimelineUrl": "/library-runtime/work-millennium-parade/timeline.a.json",
  "occurrences": {
    "o018": {
      "endMs": 39860,
      "startMs": 36420
    }
  }
}
`)
    expect(parseTimingOverridesDocument(serializeTimingOverrides(withBoth), {
      occurrences: [occurrence],
    })).toEqual(withBoth)
    expect(serializeTimingOverrides(withBoth)).toContain('"o018"')
  })

  it('removes a field and then the occurrence when canonical timing is restored', () => {
    const document = updateTimingOverride(
      createTimingOverridesDocument(identity),
      occurrence,
      'startMs',
      36_420,
    )
    const restored = updateTimingOverride(
      document,
      occurrence,
      'startMs',
      occurrence.startMs,
    )

    expect(restored.occurrences).toEqual({})
    expect(resetTimingOverride(document, occurrence.id).occurrences).toEqual({})
  })

  it('applies a sparse override without mutating the canonical occurrence', () => {
    const override = { endMs: 39_860 }
    const timing = applyTimingOverride(occurrence, override)

    expect(timing).toEqual({ startMs: 36_500, endMs: 39_860 })
    expect(occurrence.endMs).toBe(40_140)
    expect(
      createEffectiveOccurrenceTimingProvider(
        {
          audioSourceHash: identity.audioSourceHash,
          sections: [],
          occurrences: [occurrence],
        },
        {
          ...createTimingOverridesDocument(identity),
          occurrences: { [occurrence.id]: override },
        },
      ).getTiming(occurrence),
    ).toEqual(timing)
  })

  it('classifies compatible, timeline-stale, and audio-stale documents', async () => {
    const storage = new MemoryStorage()
    const document = updateTimingOverride(
      createTimingOverridesDocument(identity),
      occurrence,
      'startMs',
      36_420,
    )
    expect(await saveTimingOverrides(document, {
      storage,
      occurrences: [occurrence],
      lockManager: immediateLocks,
      expectedSnapshot: readTimingOverrideStorageSnapshot(identity, storage),
    })).toEqual({ status: 'saved' })
    expect(readTimingOverrides(identity, { storage, occurrences: [occurrence] }).kind).toBe('compatible')
    expect(
      classifyTimingOverridesDocument(
        document,
        { ...identity, baseTimelineUrl: '/library-runtime/work-millennium-parade/timeline.b.json' },
      ).kind,
    ).toBe('timeline-stale')
    expect(
      classifyTimingOverridesDocument(
        document,
        { ...identity, audioSourceHash: 'b'.repeat(64) },
      ).kind,
    ).toBe('audio-stale')
    expect(
      classifyTimingOverridesDocument(
        document,
        { ...identity, editionContentHash: 'c'.repeat(64) },
      ).kind,
    ).toBe('edition-stale')
  })

  it('acknowledges a stale Timeline explicitly without changing absolute values', () => {
    const document = updateTimingOverride(
      createTimingOverridesDocument({
        ...identity,
        baseTimelineUrl: '/library-runtime/work-millennium-parade/timeline.old.json',
      }),
      occurrence,
      'startMs',
      36_420,
    )
    expect(acknowledgeTimelineStale(document, identity)).toEqual({
      ...document,
      baseTimelineUrl: identity.baseTimelineUrl,
    })
  })

  it('falls back safely for corrupt, mismatched, and mathematically invalid data', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      getTimingOverridesStorageKey(identity.songId),
      '{not json',
    )
    expect(readTimingOverrides(identity, { storage })).toEqual({
      kind: 'invalid',
      reason: 'malformed-json',
      source: 'v3',
    })

    const mismatched = {
      ...createTimingOverridesDocument(identity),
      songId: 'another-song',
    }
    storage.setItem(
      getTimingOverridesStorageKey(identity.songId),
      serializeTimingOverrides(mismatched),
    )
    expect(readTimingOverrides(identity, { storage }).kind).toBe('invalid')

    expect(() =>
      validateTimingOverridesDocument({
        ...createTimingOverridesDocument(identity),
        occurrences: { [occurrence.id]: { startMs: 36_500.5 } },
      }),
    ).toThrow()
    expect(() =>
      validateTimingOverridesDocument({
        ...createTimingOverridesDocument(identity),
        occurrences: { [occurrence.id]: { startMs: Number.NaN } },
      }),
    ).toThrow()
    expect(() =>
      validateTimingOverridesDocument({
        ...createTimingOverridesDocument(identity),
        occurrences: { [occurrence.id]: { startMs: 40_200 } },
      }, { occurrences: [occurrence] }),
    ).toThrow('invalid timing overrides')
    expect(() =>
      updateTimingOverride(createTimingOverridesDocument(identity), occurrence, 'endMs', 36_400),
    ).toThrow('起点早于终点')
  })

  it('saves an empty current revision without deleting the prior v3 copy', async () => {
    const storage = new MemoryStorage()
    const document = createTimingOverridesDocument(identity)
    const previous = createTimingOverridesDocument(identity)
    previous.occurrences = { o018: { startMs: 36_420 } }
    const previousRaw = serializeTimingOverrides(previous)
    storage.setItem(getTimingOverridesStorageKey(identity.songId), previousRaw)
    const result = await saveTimingOverrides(document, {
      storage,
      lockManager: immediateLocks,
      expectedSnapshot: readTimingOverrideStorageSnapshot(identity, storage),
    })
    expect(result).toEqual({ status: 'saved' })
    expect(storage.getItem(getTimingOverridesStorageKey(identity.songId))).toBe(previousRaw)
    expect(readTimingOverrides(identity, { storage }).kind).toBe('compatible')
    expect(readTimingOverrides(identity, { storage })).toMatchObject({
      kind: 'compatible',
      document: { occurrences: {} },
      source: 'archive',
    })
    expect(listTimingOverrideArchive(storage).entries).toHaveLength(2)
    expect(clearTimingOverrides(identity, storage)).toBe(true)
    expect(storage.getItem(getTimingOverridesStorageKey(identity.songId))).toBe(previousRaw)

    const throwingStorage = new ThrowingStorage()
    expect(readTimingOverrides(identity, { storage: throwingStorage }).kind).toBe('storage-error')
    expect(await saveTimingOverrides(document, {
      storage: throwingStorage,
      lockManager: immediateLocks,
      expectedSnapshot: readTimingOverrideStorageSnapshot(identity, new MemoryStorage()),
    })).toEqual({ status: 'unavailable' })
    expect(await preserveLegacyTimingOverrides(identity.songId, {
      storage: throwingStorage,
      lockManager: immediateLocks,
    })).toEqual({ status: 'failed' })
    expect(clearTimingOverrides(identity, throwingStorage)).toBe(false)
  })

  it('invalidates and clears legacy v1/v2 playback-only documents', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      `red-repeat:timing-overrides:v2:${identity.songId}`,
      JSON.stringify({ schemaVersion: 2 }),
    )
    storage.setItem(
      `red-repeat:timing-overrides:v1:${identity.songId}`,
      JSON.stringify({ schemaVersion: 1 }),
    )

    expect(readTimingOverrides(identity, { storage })).toEqual({
      kind: 'invalid',
      reason: 'schema',
      source: 'legacy',
    })
    expect(clearTimingOverrides(identity, storage)).toBe(true)
    expect(readTimingOverrides(identity, { storage }).kind).toBe('none')
  })

  it('preserves H1 as a dormant exact-identity record while H2 remains isolated', async () => {
    const storage = new MemoryStorage()
    const h1 = createTimingOverridesDocument(identity)
    h1.occurrences = { o018: { startMs: 36_420 } }
    const h1Raw = serializeTimingOverrides(h1)
    storage.setItem(getTimingOverridesStorageKey(identity.songId), h1Raw)

    expect(await preserveLegacyTimingOverrides(identity.songId, {
      storage,
      lockManager: immediateLocks,
    })).toEqual({ status: 'preserved' })
    expect(storage.getItem(getTimingOverridesStorageKey(identity.songId))).toBe(h1Raw)

    const h2Identity = {
      ...identity,
      editionContentHash: 'c'.repeat(64),
    }
    const occurrenceH2 = createOccurrence('o018', 36_500, 40_140)
    expect(readTimingOverrides(h2Identity, { storage, occurrences: [occurrenceH2] }).kind)
      .toBe('edition-stale')
    expect(createEffectiveOccurrenceTimingProvider(
      { audioSourceHash: identity.audioSourceHash, sections: [], occurrences: [occurrenceH2] },
      undefined,
    ).getTiming(occurrenceH2)).toEqual({ startMs: 36_500, endMs: 40_140 })

    const h2 = createTimingOverridesDocument(h2Identity)
    h2.occurrences = { o018: { startMs: 36_480 } }
    expect(await saveTimingOverrides(h2, {
      storage,
      lockManager: immediateLocks,
      occurrences: [occurrenceH2],
      expectedSnapshot: readTimingOverrideStorageSnapshot(h2Identity, storage),
    })).toEqual({ status: 'saved' })
    expect(readTimingOverrides(identity, { storage, occurrences: [occurrence] })).toMatchObject({
      kind: 'compatible',
      source: 'archive',
      document: { occurrences: { o018: { startMs: 36_420 } } },
    })
    expect(readTimingOverrides(h2Identity, { storage, occurrences: [occurrenceH2] })).toMatchObject({
      kind: 'compatible',
      source: 'archive',
      document: { occurrences: { o018: { startMs: 36_480 } } },
    })
    const listing = listTimingOverrideArchive(storage)
    expect(listing.entries.map(({ identity: entryIdentity }) => entryIdentity.editionContentHash))
      .toEqual(expect.arrayContaining([identity.editionContentHash, h2Identity.editionContentHash]))
    expect(JSON.parse(serializeTimingOverrideArchiveExport(listing))).toMatchObject({
      format: 'red-repeat-timing-override-archive-export',
      entries: expect.arrayContaining([
        expect.objectContaining({ identity, document: h1 }),
        expect.objectContaining({ identity: h2Identity, document: h2 }),
      ]),
    })
  })

  it('fails closed when an old client writes a different value for an archived identity', async () => {
    const storage = new MemoryStorage()
    const oldDocument = createTimingOverridesDocument(identity)
    oldDocument.occurrences = { o018: { startMs: 36_420 } }
    storage.setItem(getTimingOverridesStorageKey(identity.songId), serializeTimingOverrides(oldDocument))
    await preserveLegacyTimingOverrides(identity.songId, { storage, lockManager: immediateLocks })

    const conflictingDocument = { ...oldDocument, occurrences: { o018: { startMs: 36_300 } } }
    const conflictingRaw = serializeTimingOverrides(conflictingDocument)
    storage.setItem(getTimingOverridesStorageKey(identity.songId), conflictingRaw)
    expect(await preserveLegacyTimingOverrides(identity.songId, {
      storage,
      lockManager: immediateLocks,
    })).toEqual({ status: 'conflict' })
    expect(readTimingOverrides(identity, { storage, occurrences: [occurrence] })).toEqual({ kind: 'conflict' })
    expect(storage.getItem(getTimingOverridesStorageKey(identity.songId))).toBe(conflictingRaw)
    expect(listTimingOverrideArchive(storage).entries).toHaveLength(2)
  })

  it('keeps the original v3 bytes when quota prevents archive preparation', async () => {
    const storage = new MemoryStorage()
    const oldDocument = createTimingOverridesDocument(identity)
    oldDocument.occurrences = { o018: { startMs: 36_420 } }
    const oldRaw = serializeTimingOverrides(oldDocument)
    storage.setItem(getTimingOverridesStorageKey(identity.songId), oldRaw)
    storage.denyWritesForPrefix = 'red-repeat:timing-overrides:archive:v1:'

    expect(await preserveLegacyTimingOverrides(identity.songId, {
      storage,
      lockManager: immediateLocks,
    })).toEqual({ status: 'failed' })
    expect(storage.getItem(getTimingOverridesStorageKey(identity.songId))).toBe(oldRaw)
    expect(readTimingOverrides(identity, { storage, occurrences: [occurrence] })).toMatchObject({
      kind: 'compatible',
      source: 'v3',
      document: oldDocument,
    })
  })

  it('keeps the original v3 bytes when archive write read-back mismatches', async () => {
    const storage = new ReadbackMismatchStorage()
    const document = createTimingOverridesDocument(identity)
    document.occurrences = { o018: { startMs: 36_420 } }
    const originalRaw = serializeTimingOverrides(document)
    storage.setItem(getTimingOverridesStorageKey(identity.songId), originalRaw)

    expect(await preserveLegacyTimingOverrides(identity.songId, {
      storage,
      lockManager: immediateLocks,
    })).toEqual({ status: 'failed' })
    expect(storage.getItem(getTimingOverridesStorageKey(identity.songId))).toBe(originalRaw)
    expect(readTimingOverrides(identity, { storage, occurrences: [occurrence] })).toMatchObject({
      kind: 'compatible',
      source: 'v3',
      document,
    })
  })

  it('repairs a unique archive orphan after active-pointer commit is interrupted', async () => {
    const storage = new FailOnceOnArchivePointerStorage()
    const document = createTimingOverridesDocument(identity)
    document.occurrences = { o018: { startMs: 36_420 } }
    const originalRaw = serializeTimingOverrides(document)
    storage.setItem(getTimingOverridesStorageKey(identity.songId), originalRaw)

    expect(await preserveLegacyTimingOverrides(identity.songId, {
      storage,
      lockManager: immediateLocks,
    })).toEqual({ status: 'failed' })
    expect(storage.getItem(getTimingOverridesStorageKey(identity.songId))).toBe(originalRaw)
    expect(readTimingOverrides(identity, { storage, occurrences: [occurrence] })).toEqual({
      kind: 'conflict',
    })

    expect(await preserveLegacyTimingOverrides(identity.songId, {
      storage,
      lockManager: immediateLocks,
    })).toEqual({ status: 'preserved' })
    expect(storage.getItem(getTimingOverridesStorageKey(identity.songId))).toBe(originalRaw)
    expect(readTimingOverrides(identity, { storage, occurrences: [occurrence] })).toMatchObject({
      kind: 'compatible',
      source: 'archive',
      document,
    })
  })

  it('serializes two debugger writes and rejects the stale tab snapshot', async () => {
    const storage = new MemoryStorage()
    const expectedSnapshot = readTimingOverrideStorageSnapshot(identity, storage)
    const first = createTimingOverridesDocument(identity)
    first.occurrences = { o018: { startMs: 36_420 } }
    const second = createTimingOverridesDocument(identity)
    second.occurrences = { o018: { startMs: 36_300 } }

    const results = await Promise.all([
      saveTimingOverrides(first, {
        storage,
        lockManager: serialLocks,
        expectedSnapshot,
      }),
      saveTimingOverrides(second, {
        storage,
        lockManager: serialLocks,
        expectedSnapshot,
      }),
    ])
    expect(results.map(({ status }) => status).sort()).toEqual(['conflict', 'saved'])
    expect(readTimingOverrides(identity, { storage, occurrences: [occurrence] })).toMatchObject({
      kind: 'compatible',
      source: 'archive',
      document: { occurrences: { o018: { startMs: 36_420 } } },
    })
  })

  it('fails closed when the browser has no cross-tab lock manager', async () => {
    const storage = new MemoryStorage()
    const document = createTimingOverridesDocument(identity)
    expect(await saveTimingOverrides(document, {
      storage,
      expectedSnapshot: readTimingOverrideStorageSnapshot(identity, storage),
    })).toEqual({ status: 'unavailable' })
    expect(listTimingOverrideArchive(storage).entries).toEqual([])
  })
})

function createOccurrence(
  id: string,
  startMs: number,
  endMs: number,
): Occurrence {
  return {
    id,
    segmentId: `segment-${id}`,
    sectionId: 'section-01',
    startMs,
    endMs,
  }
}

class MemoryStorage implements TimingOverrideStorage {
  private readonly values = new Map<string, string>()
  denyWritesForPrefix?: string

  get length(): number {
    return this.values.size
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.denyWritesForPrefix && key.startsWith(this.denyWritesForPrefix)) {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    }
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

const immediateLocks = {
  request<T>(_name: string, callback: () => Promise<T> | T): Promise<T> {
    return Promise.resolve(callback())
  },
}

const serialLocks = new (class {
  private readonly tails = new Map<string, Promise<void>>()

  async request<T>(name: string, callback: () => Promise<T> | T): Promise<T> {
    const previous = this.tails.get(name) ?? Promise.resolve()
    let release: () => void = () => undefined
    const tail = new Promise<void>((resolve) => { release = resolve })
    this.tails.set(name, tail)
    await previous
    try {
      return await callback()
    } finally {
      release()
      if (this.tails.get(name) === tail) this.tails.delete(name)
    }
  }
})()

class ThrowingStorage implements TimingOverrideStorage {
  get length(): number {
    return 0
  }

  key(): string | null {
    return null
  }

  getItem(): string | null {
    throw new Error('storage unavailable')
  }

  setItem(): void {
    throw new Error('storage unavailable')
  }

  removeItem(): void {
    throw new Error('storage unavailable')
  }
}

class ReadbackMismatchStorage extends MemoryStorage {
  private mismatchedReadbackKey?: string

  override setItem(key: string, value: string): void {
    super.setItem(key, value)
    if (key.startsWith('red-repeat:timing-overrides:archive:v1:')) {
      this.mismatchedReadbackKey = key
    }
  }

  override getItem(key: string): string | null {
    if (key === this.mismatchedReadbackKey) return null
    return super.getItem(key)
  }
}

class FailOnceOnArchivePointerStorage extends MemoryStorage {
  private shouldFail = true

  override setItem(key: string, value: string): void {
    if (this.shouldFail && key.startsWith('red-repeat:timing-overrides:active:v1:')) {
      this.shouldFail = false
      throw new DOMException('interrupted pointer write', 'QuotaExceededError')
    }
    super.setItem(key, value)
  }
}
