import type { Occurrence, TimelineDocument } from '../library/schema'
import type {
  EffectivePracticeTiming,
  PracticeTimingProvider,
} from './practice-scope'

export const TIMING_OVERRIDES_SCHEMA_VERSION = 1 as const
export const TIMING_OVERRIDES_STORAGE_PREFIX = 'red-repeat:timing-overrides:v1:'

export interface TimingOverrideIdentity {
  songId: string
  audioSourceHash: string
  baseTimelineUrl: string
}

export interface TimingOverrideFields {
  playStartMs?: number
  playEndMs?: number
}

export interface TimingOverridesDocument extends TimingOverrideIdentity {
  schemaVersion: typeof TIMING_OVERRIDES_SCHEMA_VERSION
  occurrences: Record<string, TimingOverrideFields>
}

export type TimingOverridesInvalidReason =
  | 'malformed-json'
  | 'schema'
  | 'song-mismatch'
  | 'audio-mismatch'
  | 'invalid-occurrence'

export type TimingOverridesReadResult =
  | { kind: 'none' }
  | { kind: 'compatible'; document: TimingOverridesDocument }
  | { kind: 'timeline-stale'; document: TimingOverridesDocument }
  | { kind: 'audio-stale'; document: TimingOverridesDocument }
  | { kind: 'invalid'; reason: TimingOverridesInvalidReason }

export interface TimingOverrideStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface TimingOverrideValidationOptions {
  occurrences?: readonly Occurrence[]
}

export interface TimingOverrideWriteOptions
  extends TimingOverrideValidationOptions {
  storage?: TimingOverrideStorage
}

export function getTimingOverridesStorageKey(songId: string): string {
  return `${TIMING_OVERRIDES_STORAGE_PREFIX}${songId}`
}

export function createTimingOverridesDocument(
  identity: TimingOverrideIdentity,
): TimingOverridesDocument {
  return {
    schemaVersion: TIMING_OVERRIDES_SCHEMA_VERSION,
    songId: identity.songId,
    audioSourceHash: identity.audioSourceHash,
    baseTimelineUrl: identity.baseTimelineUrl,
    occurrences: {},
  }
}

export function readTimingOverrides(
  identity: TimingOverrideIdentity,
  options: TimingOverrideValidationOptions & {
    storage?: TimingOverrideStorage
  } = {},
): TimingOverridesReadResult {
  const storage = options.storage ?? getBrowserStorage()
  if (!storage) {
    return { kind: 'none' }
  }

  let raw: string | null
  try {
    raw = storage.getItem(getTimingOverridesStorageKey(identity.songId))
  } catch {
    return { kind: 'none' }
  }
  if (raw === null) {
    return { kind: 'none' }
  }

  let document: TimingOverridesDocument
  try {
    document = parseTimingOverridesDocument(raw, options)
  } catch (error) {
    return {
      kind: 'invalid',
      reason: error instanceof TimingOverridesParseError
        ? error.reason
        : 'schema',
    }
  }

  if (document.songId !== identity.songId) {
    return { kind: 'invalid', reason: 'song-mismatch' }
  }
  return classifyTimingOverridesDocument(document, identity)
}

export function classifyTimingOverridesDocument(
  document: TimingOverridesDocument,
  identity: TimingOverrideIdentity,
): Exclude<TimingOverridesReadResult, { kind: 'none' | 'invalid' }> {
  if (document.songId !== identity.songId) {
    throw new Error('个人微调与当前歌曲不匹配。')
  }
  if (document.audioSourceHash !== identity.audioSourceHash) {
    return { kind: 'audio-stale', document }
  }
  if (document.baseTimelineUrl !== identity.baseTimelineUrl) {
    return { kind: 'timeline-stale', document }
  }
  return { kind: 'compatible', document }
}

export function parseTimingOverridesDocument(
  raw: string,
  options: TimingOverrideValidationOptions = {},
): TimingOverridesDocument {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new TimingOverridesParseError('malformed-json')
  }
  return validateTimingOverridesDocument(parsed, options)
}

export function validateTimingOverridesDocument(
  value: unknown,
  options: TimingOverrideValidationOptions = {},
): TimingOverridesDocument {
  if (!isRecord(value)) {
    throw new TimingOverridesParseError('schema')
  }

  const keys = Object.keys(value)
  if (!sameKeys(keys, [
    'schemaVersion',
    'songId',
    'audioSourceHash',
    'baseTimelineUrl',
    'occurrences',
  ])) {
    throw new TimingOverridesParseError('schema')
  }
  if (value.schemaVersion !== TIMING_OVERRIDES_SCHEMA_VERSION) {
    throw new TimingOverridesParseError('schema')
  }
  if (!isNonEmptyString(value.songId) || !isNonEmptyString(value.baseTimelineUrl)) {
    throw new TimingOverridesParseError('schema')
  }
  if (!isContentHash(value.audioSourceHash)) {
    throw new TimingOverridesParseError('schema')
  }
  if (!isRecord(value.occurrences)) {
    throw new TimingOverridesParseError('schema')
  }

  const canonicalById = new Map(
    (options.occurrences ?? []).map((occurrence) => [occurrence.id, occurrence]),
  )
  const occurrences: Record<string, TimingOverrideFields> = {}
  for (const [occurrenceId, rawFields] of Object.entries(value.occurrences)) {
    if (!isNonEmptyString(occurrenceId) || !isRecord(rawFields)) {
      throw new TimingOverridesParseError('invalid-occurrence')
    }

    const fieldKeys = Object.keys(rawFields)
    if (
      fieldKeys.length === 0 ||
      fieldKeys.some((key) => key !== 'playStartMs' && key !== 'playEndMs')
    ) {
      throw new TimingOverridesParseError('invalid-occurrence')
    }

    const fields: TimingOverrideFields = {}
    if ('playStartMs' in rawFields) {
      if (!isValidTimingNumber(rawFields.playStartMs)) {
        throw new TimingOverridesParseError('invalid-occurrence')
      }
      fields.playStartMs = rawFields.playStartMs
    }
    if ('playEndMs' in rawFields) {
      if (!isValidTimingNumber(rawFields.playEndMs)) {
        throw new TimingOverridesParseError('invalid-occurrence')
      }
      fields.playEndMs = rawFields.playEndMs
    }

    const canonical = canonicalById.get(occurrenceId)
    if (canonical) {
      const effective = applyTimingOverride(canonical, fields)
      if (!isValidEffectiveTiming(effective)) {
        throw new TimingOverridesParseError('invalid-occurrence')
      }
    }
    occurrences[occurrenceId] = fields
  }

  return {
    schemaVersion: TIMING_OVERRIDES_SCHEMA_VERSION,
    songId: value.songId,
    audioSourceHash: value.audioSourceHash,
    baseTimelineUrl: value.baseTimelineUrl,
    occurrences,
  }
}

export function applyTimingOverride(
  occurrence: Occurrence,
  override?: TimingOverrideFields,
): EffectivePracticeTiming {
  return {
    playStartMs: override?.playStartMs ?? occurrence.playStartMs,
    playEndMs: override?.playEndMs ?? occurrence.playEndMs,
  }
}

export function createEffectivePracticeTimingProvider(
  timeline: TimelineDocument,
  document?: TimingOverridesDocument,
): PracticeTimingProvider {
  void timeline
  const overrides = document?.occurrences ?? {}
  return {
    getTiming: (occurrence) =>
      applyTimingOverride(occurrence, overrides[occurrence.id]),
  }
}

export function acknowledgeTimelineStale(
  document: TimingOverridesDocument,
  identity: TimingOverrideIdentity,
): TimingOverridesDocument {
  if (
    document.songId !== identity.songId ||
    document.audioSourceHash !== identity.audioSourceHash
  ) {
    throw new Error('只能确认同一首歌且同一音源的 Timeline 更新。')
  }
  return {
    ...document,
    baseTimelineUrl: identity.baseTimelineUrl,
  }
}

export function updateTimingOverride(
  document: TimingOverridesDocument,
  occurrence: Occurrence,
  field: keyof TimingOverrideFields,
  value: number,
): TimingOverridesDocument {
  if (!isValidTimingNumber(value)) {
    throw new RangeError('个人播放切口必须是有限的整数毫秒。')
  }

  const nextFields: TimingOverrideFields = {
    ...document.occurrences[occurrence.id],
    [field]: value,
  }
  const canonicalValue = occurrence[field]
  if (nextFields[field] === canonicalValue) {
    delete nextFields[field]
  }
  if (!isValidEffectiveTiming(applyTimingOverride(occurrence, nextFields))) {
    throw new RangeError('播放切口必须满足起点早于终点。')
  }

  const occurrences = { ...document.occurrences }
  if (Object.keys(nextFields).length === 0) {
    delete occurrences[occurrence.id]
  } else {
    occurrences[occurrence.id] = nextFields
  }
  return { ...document, occurrences }
}

export function resetTimingOverride(
  document: TimingOverridesDocument,
  occurrenceId: string,
): TimingOverridesDocument {
  if (!(occurrenceId in document.occurrences)) {
    return document
  }
  const occurrences = { ...document.occurrences }
  delete occurrences[occurrenceId]
  return { ...document, occurrences }
}

export function clearTimingOverrides(
  identity: TimingOverrideIdentity,
  storage?: TimingOverrideStorage,
): boolean {
  const resolvedStorage = storage ?? getBrowserStorage()
  if (!resolvedStorage) {
    return false
  }
  try {
    resolvedStorage.removeItem(getTimingOverridesStorageKey(identity.songId))
    return true
  } catch {
    return false
  }
}

export function saveTimingOverrides(
  document: TimingOverridesDocument,
  options: TimingOverrideWriteOptions = {},
): boolean {
  const storage = options.storage ?? getBrowserStorage()
  if (!storage) {
    return false
  }

  try {
    const validated = validateTimingOverridesDocument(document, options)
    const key = getTimingOverridesStorageKey(validated.songId)
    if (Object.keys(validated.occurrences).length === 0) {
      storage.removeItem(key)
    } else {
      storage.setItem(key, serializeTimingOverrides(validated))
    }
    return true
  } catch {
    return false
  }
}

export function serializeTimingOverrides(
  document: TimingOverridesDocument,
): string {
  const occurrences = Object.fromEntries(
    Object.entries(document.occurrences)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([occurrenceId, fields]) => [
        occurrenceId,
        Object.fromEntries(
          Object.entries(fields).sort(([left], [right]) => left.localeCompare(right)),
        ),
      ]),
  )
  return `${JSON.stringify(
    {
      schemaVersion: TIMING_OVERRIDES_SCHEMA_VERSION,
      songId: document.songId,
      audioSourceHash: document.audioSourceHash,
      baseTimelineUrl: document.baseTimelineUrl,
      occurrences,
    },
    null,
    2,
  )}\n`
}

export function isTimingOverridesEmpty(
  document: TimingOverridesDocument,
): boolean {
  return Object.keys(document.occurrences).length === 0
}

export function isValidTimingNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0
}

export class TimingOverridesParseError extends Error {
  readonly reason: TimingOverridesInvalidReason

  constructor(reason: TimingOverridesInvalidReason) {
    super(`invalid timing overrides: ${reason}`)
    this.name = 'TimingOverridesParseError'
    this.reason = reason
  }
}

function isValidEffectiveTiming(
  timing: EffectivePracticeTiming,
): boolean {
  return (
    isValidTimingNumber(timing.playStartMs) &&
    isValidTimingNumber(timing.playEndMs) &&
    timing.playStartMs < timing.playEndMs
  )
}

function isContentHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sameKeys(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && expected.every((key) => actual.includes(key))
}

function getBrowserStorage(): TimingOverrideStorage | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
