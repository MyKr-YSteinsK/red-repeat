import { describe, expect, it } from 'vitest'
import type { Occurrence } from '../library/schema'
import {
  acknowledgeTimelineStale,
  applyTimingOverride,
  clearTimingOverrides,
  createEffectiveOccurrenceTimingProvider,
  createTimingOverridesDocument,
  getTimingOverridesStorageKey,
  parseTimingOverridesDocument,
  readTimingOverrides,
  resetTimingOverride,
  saveTimingOverrides,
  serializeTimingOverrides,
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

  it('classifies compatible, timeline-stale, and audio-stale documents', () => {
    const storage = new MemoryStorage()
    const document = updateTimingOverride(
      createTimingOverridesDocument(identity),
      occurrence,
      'startMs',
      36_420,
    )
    expect(saveTimingOverrides(document, { storage, occurrences: [occurrence] })).toBe(true)
    expect(readTimingOverrides(identity, { storage, occurrences: [occurrence] }).kind).toBe('compatible')
    expect(
      readTimingOverrides(
        { ...identity, baseTimelineUrl: '/library-runtime/work-millennium-parade/timeline.b.json' },
        { storage, occurrences: [occurrence] },
      ).kind,
    ).toBe('timeline-stale')
    expect(
      readTimingOverrides(
        { ...identity, audioSourceHash: 'b'.repeat(64) },
        { storage, occurrences: [occurrence] },
      ).kind,
    ).toBe('audio-stale')
    expect(
      readTimingOverrides(
        { ...identity, editionContentHash: 'c'.repeat(64) },
        { storage, occurrences: [occurrence] },
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

  it('removes an empty document from storage and tolerates storage failures', () => {
    const storage = new MemoryStorage()
    const document = createTimingOverridesDocument(identity)
    storage.setItem(getTimingOverridesStorageKey(identity.songId), 'old')
    expect(saveTimingOverrides(document, { storage })).toBe(true)
    expect(storage.getItem(getTimingOverridesStorageKey(identity.songId))).toBeNull()
    expect(clearTimingOverrides(identity, storage)).toBe(true)

    const throwingStorage = new ThrowingStorage()
    expect(readTimingOverrides(identity, { storage: throwingStorage }).kind).toBe('none')
    expect(saveTimingOverrides(document, { storage: throwingStorage })).toBe(false)
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
    })
    expect(clearTimingOverrides(identity, storage)).toBe(true)
    expect(readTimingOverrides(identity, { storage }).kind).toBe('none')
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

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

class ThrowingStorage implements TimingOverrideStorage {
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
