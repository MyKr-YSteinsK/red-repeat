import type { Occurrence, TimelineDocument } from '../library/schema'
import type {
  EffectiveOccurrenceTiming,
  OccurrenceTimingProvider,
} from '../timeline/occurrence-timing'

export const TIMING_OVERRIDES_SCHEMA_VERSION = 3 as const
export const TIMING_OVERRIDES_STORAGE_PREFIX = 'red-repeat:timing-overrides:v3:'
export const TIMING_OVERRIDES_ARCHIVE_RECORD_PREFIX =
  'red-repeat:timing-overrides:archive:v1:'
const TIMING_OVERRIDES_ARCHIVE_ACTIVE_PREFIX =
  'red-repeat:timing-overrides:active:v1:'
const LEGACY_TIMING_OVERRIDES_STORAGE_PREFIXES = [
  'red-repeat:timing-overrides:v2:',
  'red-repeat:timing-overrides:v1:',
] as const

export interface TimingOverrideIdentity {
  songId: string
  editionContentHash: string
  audioSourceHash: string
  baseTimelineUrl: string
}

export interface TimingOverrideFields {
  startMs?: number
  endMs?: number
}

export interface TimingOverridesDocument extends TimingOverrideIdentity {
  schemaVersion: typeof TIMING_OVERRIDES_SCHEMA_VERSION
  occurrences: Record<string, TimingOverrideFields>
}

export type TimingOverridesInvalidReason =
  | 'malformed-json'
  | 'schema'
  | 'song-mismatch'
  | 'edition-mismatch'
  | 'audio-mismatch'
  | 'invalid-occurrence'

export type TimingOverridesReadResult =
  | { kind: 'none' }
  | { kind: 'compatible'; document: TimingOverridesDocument; source: 'archive' | 'v3' }
  | { kind: 'edition-stale'; document: TimingOverridesDocument; source: 'archive' | 'v3' }
  | { kind: 'timeline-stale'; document: TimingOverridesDocument; source: 'archive' | 'v3' }
  | { kind: 'audio-stale'; document: TimingOverridesDocument; source: 'archive' | 'v3' }
  | { kind: 'invalid'; reason: TimingOverridesInvalidReason; source?: 'archive' | 'v3' | 'legacy' }
  | { kind: 'conflict' }
  | { kind: 'storage-error' }

export interface TimingOverrideStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  readonly length?: number
  key?(index: number): string | null
}

export interface TimingOverrideLockManager {
  request<T>(name: string, callback: () => Promise<T> | T): Promise<T>
}

export interface TimingOverrideStorageSnapshot {
  status: 'available' | 'unavailable'
  archiveActiveRaw: string | null
  archiveRecordRaws: Array<{ key: string; raw: string }>
  legacyV3Raw: string | null
  legacySchemaRaws: Array<{ key: string; raw: string }>
}

export interface TimingOverrideArchiveRecord {
  format: 'red-repeat-timing-override-archive'
  schemaVersion: 1
  recordId: string
  identity: TimingOverrideIdentity
  document: TimingOverridesDocument
  preservedAt: string
  originalRaw: string
}

export interface TimingOverrideArchiveEntry {
  identity: TimingOverrideIdentity
  document: TimingOverridesDocument
  recordId?: string
  source: 'archive' | 'v3'
  originalRaw: string
}

export interface TimingOverrideArchiveListing {
  status: 'available' | 'unavailable'
  entries: TimingOverrideArchiveEntry[]
  invalidCount: number
}

export type TimingOverrideArchiveResult =
  | { status: 'none' | 'preserved' }
  | { status: 'conflict' | 'invalid' | 'unavailable' | 'failed' }

export type TimingOverrideSaveResult =
  | { status: 'saved' }
  | { status: 'conflict' | 'invalid' | 'unavailable' | 'failed' }

export interface TimingOverrideValidationOptions {
  occurrences?: readonly Occurrence[]
}

export interface TimingOverrideWriteOptions
  extends TimingOverrideValidationOptions {
  storage?: TimingOverrideStorage
  lockManager?: TimingOverrideLockManager
  expectedSnapshot?: TimingOverrideStorageSnapshot
}

export function getTimingOverridesStorageKey(songId: string): string {
  return `${TIMING_OVERRIDES_STORAGE_PREFIX}${songId}`
}

export function getTimingOverridesArchiveActiveKey(
  identity: TimingOverrideIdentity,
): string {
  return `${TIMING_OVERRIDES_ARCHIVE_ACTIVE_PREFIX}${encodeIdentity(identity)}`
}

export function createTimingOverridesDocument(
  identity: TimingOverrideIdentity,
): TimingOverridesDocument {
  return {
    schemaVersion: TIMING_OVERRIDES_SCHEMA_VERSION,
    songId: identity.songId,
    editionContentHash: identity.editionContentHash,
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
    return { kind: 'storage-error' }
  }

  const snapshot = readTimingOverrideStorageSnapshot(identity, storage)
  if (snapshot.status !== 'available') {
    return { kind: 'storage-error' }
  }

  const archiveRecords: TimingOverrideArchiveRecord[] = []
  for (const { key, raw } of snapshot.archiveRecordRaws) {
    if (!key.startsWith(getSongArchiveRecordPrefix(identity.songId))) continue
    try {
      const record = parseTimingOverrideArchiveRecord(raw, options)
      if (key !== getArchiveRecordKey(record.identity.songId, record.recordId)) {
        return { kind: 'invalid', reason: 'schema', source: 'archive' }
      }
      if (record.identity.songId !== identity.songId) {
        return { kind: 'invalid', reason: 'song-mismatch', source: 'archive' }
      }
      if (sameIdentity(record.identity, identity)) archiveRecords.push(record)
    } catch (error) {
      return {
        kind: 'invalid',
        reason: error instanceof TimingOverridesParseError ? error.reason : 'schema',
        source: 'archive',
      }
    }
  }

  const archiveRawById = new Map(archiveRecords.map((record) => [record.recordId, record]))
  let selectedArchive: TimingOverrideArchiveRecord | undefined
  if (snapshot.archiveActiveRaw !== null) {
    const recordId = parseArchivePointer(snapshot.archiveActiveRaw)
    if (!recordId) return { kind: 'invalid', reason: 'schema', source: 'archive' }
    selectedArchive = archiveRawById.get(recordId)
    if (!selectedArchive) return { kind: 'invalid', reason: 'schema', source: 'archive' }
  } else if (archiveRecords.length > 0) {
    // Orphan records may follow an interrupted write. Never activate them as
    // a side effect of reading; the loader may repair a unique orphan under a lock.
    return { kind: 'conflict' }
  }

  let legacyDocument: TimingOverridesDocument | undefined
  const legacyRaw = snapshot.legacyV3Raw
  if (legacyRaw !== null) {
    try {
      legacyDocument = parseTimingOverridesDocument(legacyRaw)
    } catch (error) {
      return {
        kind: 'invalid',
        reason: error instanceof TimingOverridesParseError ? error.reason : 'schema',
        source: 'v3',
      }
    }
    if (legacyDocument.songId !== identity.songId) {
      return { kind: 'invalid', reason: 'song-mismatch', source: 'v3' }
    }
  }

  if (selectedArchive) {
    if (legacyDocument && sameIdentity(legacyDocument, identity)) {
      const knownLegacyVersion = archiveRecords.some((record) =>
        sameIdentity(record.identity, identity) && (
          record.originalRaw === legacyRaw ||
          serializeTimingOverrides(record.document) === serializeTimingOverrides(legacyDocument)
        ),
      )
      if (!knownLegacyVersion) return { kind: 'conflict' }
    }
    const document = validateDocumentAgainstCurrentOccurrences(
      selectedArchive.document,
      options,
    )
    if (!document) return { kind: 'invalid', reason: 'invalid-occurrence', source: 'archive' }
    return { ...classifyTimingOverridesDocument(document, identity), source: 'archive' }
  }

  if (legacyDocument) {
    const document = validateDocumentAgainstCurrentOccurrences(legacyDocument, options)
    if (!document) return { kind: 'invalid', reason: 'invalid-occurrence', source: 'v3' }
    return { ...classifyTimingOverridesDocument(document, identity), source: 'v3' }
  }

  try {
    const hasLegacyDocument = LEGACY_TIMING_OVERRIDES_STORAGE_PREFIXES.some(
      (prefix) => storage.getItem(`${prefix}${identity.songId}`) !== null,
    )
    if (hasLegacyDocument) {
      return { kind: 'invalid', reason: 'schema', source: 'legacy' }
    }
  } catch {
    return { kind: 'storage-error' }
  }
  return { kind: 'none' }
}

export function classifyTimingOverridesDocument(
  document: TimingOverridesDocument,
  identity: TimingOverrideIdentity,
):
  | { kind: 'compatible'; document: TimingOverridesDocument }
  | { kind: 'edition-stale'; document: TimingOverridesDocument }
  | { kind: 'timeline-stale'; document: TimingOverridesDocument }
  | { kind: 'audio-stale'; document: TimingOverridesDocument } {
  if (document.songId !== identity.songId) {
    throw new Error('个人微调与当前歌曲不匹配。')
  }
  if (document.editionContentHash !== identity.editionContentHash) {
    return { kind: 'edition-stale', document }
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
    'editionContentHash',
    'audioSourceHash',
    'baseTimelineUrl',
    'occurrences',
  ])) {
    throw new TimingOverridesParseError('schema')
  }
  if (value.schemaVersion !== TIMING_OVERRIDES_SCHEMA_VERSION) {
    throw new TimingOverridesParseError('schema')
  }
  if (
    !isNonEmptyString(value.songId) ||
    !isNonEmptyString(value.editionContentHash) ||
    !isNonEmptyString(value.baseTimelineUrl)
  ) {
    throw new TimingOverridesParseError('schema')
  }
  if (
    !isContentHash(value.editionContentHash) ||
    !isContentHash(value.audioSourceHash)
  ) {
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
      fieldKeys.some((key) => key !== 'startMs' && key !== 'endMs')
    ) {
      throw new TimingOverridesParseError('invalid-occurrence')
    }

    const fields: TimingOverrideFields = {}
    if ('startMs' in rawFields) {
      if (!isValidTimingNumber(rawFields.startMs)) {
        throw new TimingOverridesParseError('invalid-occurrence')
      }
      fields.startMs = rawFields.startMs
    }
    if ('endMs' in rawFields) {
      if (!isValidTimingNumber(rawFields.endMs)) {
        throw new TimingOverridesParseError('invalid-occurrence')
      }
      fields.endMs = rawFields.endMs
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
    editionContentHash: value.editionContentHash,
    audioSourceHash: value.audioSourceHash,
    baseTimelineUrl: value.baseTimelineUrl,
    occurrences,
  }
}

export function applyTimingOverride(
  occurrence: Occurrence,
  override?: TimingOverrideFields,
): EffectiveOccurrenceTiming {
  return {
    startMs: override?.startMs ?? occurrence.startMs,
    endMs: override?.endMs ?? occurrence.endMs,
  }
}

export function createEffectiveOccurrenceTimingProvider(
  timeline: TimelineDocument,
  document?: TimingOverridesDocument,
): OccurrenceTimingProvider {
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
    document.editionContentHash !== identity.editionContentHash ||
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
  // Historical v1/v2 records remain subject to the original strict
  // invalidation rule. The valid v3 slot is never deleted by this helper.
  return clearLegacyTimingOverrides(identity.songId, storage)
}

export function clearLegacyTimingOverrides(
  songId: string,
  storage?: TimingOverrideStorage,
): boolean {
  const resolvedStorage = storage ?? getBrowserStorage()
  if (!resolvedStorage) {
    return false
  }
  try {
    LEGACY_TIMING_OVERRIDES_STORAGE_PREFIXES.forEach((prefix) => {
      resolvedStorage.removeItem(`${prefix}${songId}`)
    })
    return true
  } catch {
    return false
  }
}

export async function preserveLegacyTimingOverrides(
  songId: string,
  options: {
    storage?: TimingOverrideStorage
    lockManager?: TimingOverrideLockManager
  } = {},
): Promise<TimingOverrideArchiveResult> {
  const storage = options.storage ?? getBrowserStorage()
  const lockManager = options.lockManager ?? getBrowserLockManager()
  if (!storage || !lockManager) return { status: 'unavailable' }

  try {
    return await lockManager.request(getTimingOverrideLockName(songId), async () => {
      const legacyKey = getTimingOverridesStorageKey(songId)
      const legacyRaw = storage.getItem(legacyKey)
      if (legacyRaw === null) {
        const repair = repairUnambiguousArchivePointers(songId, storage)
        if (repair === 'unavailable') return { status: 'unavailable' }
        if (repair === 'invalid') return { status: 'invalid' }
        return repair === 'repaired' ? { status: 'preserved' } : { status: 'none' }
      }

      let document: TimingOverridesDocument
      try {
        document = parseTimingOverridesDocument(legacyRaw)
      } catch {
        return { status: 'invalid' }
      }
      if (document.songId !== songId) return { status: 'invalid' }
      return preserveLegacyDocumentLocked(document, legacyRaw, storage)
    })
  } catch {
    return { status: 'failed' }
  }
}

export async function saveTimingOverrides(
  document: TimingOverridesDocument,
  options: TimingOverrideWriteOptions = {},
): Promise<TimingOverrideSaveResult> {
  const storage = options.storage ?? getBrowserStorage()
  const lockManager = options.lockManager ?? getBrowserLockManager()
  if (!storage || !lockManager || !options.expectedSnapshot) {
    return { status: 'unavailable' }
  }

  try {
    const validated = validateTimingOverridesDocument(document, options)
    return await lockManager.request(
      getTimingOverrideLockName(validated.songId),
      async () => {
        const actualSnapshot = readTimingOverrideStorageSnapshot(validated, storage)
        if (actualSnapshot.status !== 'available') return { status: 'unavailable' }
        if (!sameStorageSnapshot(actualSnapshot, options.expectedSnapshot)) {
          return { status: 'conflict' }
        }

        const initialLegacyRaw = actualSnapshot.legacyV3Raw
        if (initialLegacyRaw !== null) {
          let initialLegacyDocument: TimingOverridesDocument
          try {
            initialLegacyDocument = parseTimingOverridesDocument(initialLegacyRaw)
          } catch {
            return { status: 'conflict' }
          }
          if (initialLegacyDocument.songId !== validated.songId) {
            return { status: 'conflict' }
          }
          const preserveResult = preserveLegacyDocumentLocked(
            initialLegacyDocument,
            initialLegacyRaw,
            storage,
          )
          if (
            preserveResult.status === 'invalid' ||
            preserveResult.status === 'unavailable' ||
            preserveResult.status === 'failed' ||
            (preserveResult.status === 'conflict' && sameIdentity(initialLegacyDocument, validated))
          ) {
            return preserveResult.status === 'unavailable'
              ? { status: 'unavailable' }
              : preserveResult.status === 'invalid'
                ? { status: 'invalid' }
                : preserveResult.status === 'failed'
                  ? { status: 'failed' }
                  : { status: 'conflict' }
          }
        }
        const postPreservationSnapshot = readTimingOverrideStorageSnapshot(validated, storage)
        if (postPreservationSnapshot.status !== 'available') return { status: 'unavailable' }

        const current = readTimingOverrides(validated, { storage, ...options })
        if (
          current.kind === 'invalid' || current.kind === 'conflict' || current.kind === 'storage-error' ||
          ((current.kind === 'edition-stale' || current.kind === 'audio-stale' || current.kind === 'timeline-stale') &&
            sameIdentity(current.document, validated))
        ) {
          return current.kind === 'storage-error'
            ? { status: 'unavailable' }
            : { status: 'conflict' }
        }

        const matchingRecords = listArchiveRecordsForIdentity(validated, storage)
        if (matchingRecords.status !== 'available') return { status: 'unavailable' }
        if (matchingRecords.invalidCount > 0) return { status: 'invalid' }

        const selectedRecord = readArchivePointerAndRecord(validated, storage)
        if (selectedRecord.status === 'invalid') return { status: 'invalid' }
        if (selectedRecord.status === 'unavailable') return { status: 'unavailable' }

        const legacyKey = getTimingOverridesStorageKey(validated.songId)
        const legacyRaw = storage.getItem(legacyKey)
        if (legacyRaw !== null) {
          let legacyDocument: TimingOverridesDocument
          try {
            legacyDocument = parseTimingOverridesDocument(legacyRaw)
          } catch {
            return { status: 'conflict' }
          }
          if (sameIdentity(legacyDocument, validated)) {
            const knownLegacyVersion = matchingRecords.records.some(({ record }) =>
              record.originalRaw === legacyRaw ||
              serializeTimingOverrides(record.document) === serializeTimingOverrides(legacyDocument),
            )
            if (!knownLegacyVersion && current.kind === 'compatible' && current.source === 'archive') {
              return { status: 'conflict' }
            }
          }
        }

        const rawSnapshot = postPreservationSnapshot
        const nextRecord = findArchivedDocument(matchingRecords.records, validated)
          ?? createTimingOverrideArchiveRecord(validated, serializeTimingOverrides(validated))
        const recordKey = getArchiveRecordKey(validated.songId, nextRecord.recordId)
        const recordRaw = serializeArchiveRecord(nextRecord)
        const existingRaw = storage.getItem(recordKey)
        if (existingRaw === null) {
          storage.setItem(recordKey, recordRaw)
          if (storage.getItem(recordKey) !== recordRaw) return { status: 'failed' }
        } else {
          const existing = parseTimingOverrideArchiveRecord(existingRaw)
          if (
            !sameIdentity(existing.identity, validated) ||
            serializeTimingOverrides(existing.document) !== serializeTimingOverrides(validated)
          ) {
            return { status: 'conflict' }
          }
        }

        const afterRecordSnapshot = readTimingOverrideStorageSnapshot(validated, storage)
        if (
          afterRecordSnapshot.status !== 'available' ||
          afterRecordSnapshot.legacyV3Raw !== rawSnapshot.legacyV3Raw ||
          afterRecordSnapshot.archiveActiveRaw !== rawSnapshot.archiveActiveRaw
        ) {
          // A racing legacy build may have changed v3 while the immutable copy
          // was being staged. Keep the staged record as a recoverable orphan;
          // never discard either value or switch the active pointer.
          return { status: 'conflict' }
        }

        const activeKey = getTimingOverridesArchiveActiveKey(validated)
        storage.setItem(activeKey, nextRecord.recordId)
        if (storage.getItem(activeKey) !== nextRecord.recordId) {
          return { status: 'failed' }
        }
        const finalRead = readTimingOverrides(validated, { storage, ...options })
        return finalRead.kind === 'compatible' &&
          finalRead.source === 'archive' &&
          serializeTimingOverrides(finalRead.document) === serializeTimingOverrides(validated)
          ? { status: 'saved' }
          : { status: finalRead.kind === 'storage-error' ? 'unavailable' : 'conflict' }
      },
    )
  } catch {
    return { status: 'failed' }
  }
}

export function readTimingOverrideStorageSnapshot(
  identity: TimingOverrideIdentity,
  storage: TimingOverrideStorage = getBrowserStorage() as TimingOverrideStorage,
): TimingOverrideStorageSnapshot {
  if (!storage || typeof storage.length !== 'number' || typeof storage.key !== 'function') {
    return {
      status: 'unavailable',
      archiveActiveRaw: null,
      archiveRecordRaws: [],
      legacyV3Raw: null,
      legacySchemaRaws: [],
    }
  }
  try {
    const archiveRecordRaws: Array<{ key: string; raw: string }> = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key?.startsWith(getSongArchiveRecordPrefix(identity.songId))) continue
      const raw = storage.getItem(key)
      if (raw === null) continue
      try {
        const record = parseTimingOverrideArchiveRecord(raw)
        if (key !== getArchiveRecordKey(record.identity.songId, record.recordId)) {
          archiveRecordRaws.push({ key, raw })
        } else if (sameIdentity(record.identity, identity)) {
          archiveRecordRaws.push({ key, raw })
        }
      } catch {
        // Unknown archive data is part of the optimistic concurrency token;
        // never let a later valid write silently move past it.
        archiveRecordRaws.push({ key, raw })
      }
    }
    const legacySchemaRaws = LEGACY_TIMING_OVERRIDES_STORAGE_PREFIXES.flatMap((prefix) => {
      const key = `${prefix}${identity.songId}`
      const raw = storage.getItem(key)
      return raw === null ? [] : [{ key, raw }]
    })
    return {
      status: 'available',
      archiveActiveRaw: storage.getItem(getTimingOverridesArchiveActiveKey(identity)),
      archiveRecordRaws: archiveRecordRaws.sort((left, right) => left.key.localeCompare(right.key)),
      legacyV3Raw: storage.getItem(getTimingOverridesStorageKey(identity.songId)),
      legacySchemaRaws,
    }
  } catch {
    return {
      status: 'unavailable',
      archiveActiveRaw: null,
      archiveRecordRaws: [],
      legacyV3Raw: null,
      legacySchemaRaws: [],
    }
  }
}

export function listTimingOverrideArchive(
  storage: TimingOverrideStorage = getBrowserStorage() as TimingOverrideStorage,
): TimingOverrideArchiveListing {
  if (!storage || typeof storage.length !== 'number' || typeof storage.key !== 'function') {
    return { status: 'unavailable', entries: [], invalidCount: 0 }
  }
  const entriesByValue = new Map<string, TimingOverrideArchiveEntry>()
  let invalidCount = 0
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key) continue
      const raw = storage.getItem(key)
      if (raw === null) continue

      if (key.startsWith(TIMING_OVERRIDES_ARCHIVE_RECORD_PREFIX)) {
        try {
          const record = parseTimingOverrideArchiveRecord(raw)
          if (key !== getArchiveRecordKey(record.identity.songId, record.recordId)) {
            invalidCount += 1
            continue
          }
          addArchiveListingEntry(entriesByValue, {
            identity: record.identity,
            document: record.document,
            recordId: record.recordId,
            source: 'archive',
            originalRaw: record.originalRaw,
          })
        } catch {
          invalidCount += 1
        }
      } else if (key.startsWith(TIMING_OVERRIDES_STORAGE_PREFIX)) {
        try {
          const document = parseTimingOverridesDocument(raw)
          if (key !== getTimingOverridesStorageKey(document.songId)) {
            invalidCount += 1
            continue
          }
          addArchiveListingEntry(entriesByValue, {
            identity: document,
            document,
            source: 'v3',
            originalRaw: raw,
          })
        } catch {
          invalidCount += 1
        }
      }
    }
    return {
      status: 'available',
      entries: [...entriesByValue.values()].sort((left, right) =>
        encodeIdentity(left.identity).localeCompare(encodeIdentity(right.identity)) ||
        serializeTimingOverrides(left.document).localeCompare(serializeTimingOverrides(right.document)),
      ),
      invalidCount,
    }
  } catch {
    return { status: 'unavailable', entries: [], invalidCount }
  }
}

export function serializeTimingOverrideArchiveExport(
  listing: TimingOverrideArchiveListing,
  exportedAt = new Date().toISOString(),
): string {
  if (listing.status !== 'available') {
    throw new Error('无法读取本机 Timing 保留记录。')
  }
  return `${JSON.stringify({
    format: 'red-repeat-timing-override-archive-export',
    schemaVersion: 1,
    exportedAt,
    warning: '仅供身份核对与留存；记录不会跨 Edition 自动应用，也不能直接作为当前 Edition 的 Timing Correction Export 合入。',
    invalidCount: listing.invalidCount,
    entries: listing.entries.map(({ identity, document, recordId, source, originalRaw }) => ({
      identity,
      document,
      recordId,
      source,
      originalRaw,
    })),
  }, null, 2)}\n`
}

function preserveLegacyDocumentLocked(
  document: TimingOverridesDocument,
  legacyRaw: string,
  storage: TimingOverrideStorage,
): TimingOverrideArchiveResult {
  const matching = listArchiveRecordsForIdentity(document, storage)
  if (matching.status !== 'available') return { status: 'unavailable' }
  if (matching.invalidCount > 0) return { status: 'invalid' }

  const existingVersion = matching.records.find(({ record }) =>
    record.originalRaw === legacyRaw ||
    serializeTimingOverrides(record.document) === legacyRaw ||
    serializeTimingOverrides(record.document) === serializeTimingOverrides(document),
  )
  if (existingVersion) {
    const activeKey = getTimingOverridesArchiveActiveKey(document)
    if (storage.getItem(activeKey) === null && matching.records.length === 1) {
      storage.setItem(activeKey, existingVersion.record.recordId)
      if (storage.getItem(activeKey) !== existingVersion.record.recordId) {
        return { status: 'failed' }
      }
    }
    return { status: 'preserved' }
  }

  const active = readArchivePointerAndRecord(document, storage)
  if (active.status === 'invalid') return { status: 'invalid' }
  if (active.status === 'unavailable') return { status: 'unavailable' }
  if (active.record !== undefined || matching.records.length > 0) {
    // The unseen v3 value is retained in its original key. Existing immutable
    // records remain untouched; Settings can export both sides for review.
    return { status: 'conflict' }
  }

  const record = createTimingOverrideArchiveRecord(document, legacyRaw)
  const recordKey = getArchiveRecordKey(document.songId, record.recordId)
  const recordRaw = serializeArchiveRecord(record)
  try {
    storage.setItem(recordKey, recordRaw)
    if (storage.getItem(recordKey) !== recordRaw) return { status: 'failed' }
    if (storage.getItem(getTimingOverridesStorageKey(document.songId)) !== legacyRaw) {
      // The exact original value remains in the archive and the newer value
      // remains in v3. Leave selection unresolved until the conflict is reviewed.
      return { status: 'conflict' }
    }

    if (active.record === undefined && matching.records.length === 0) {
      const activeKey = getTimingOverridesArchiveActiveKey(document)
      storage.setItem(activeKey, record.recordId)
      if (storage.getItem(activeKey) !== record.recordId) return { status: 'failed' }
      return { status: 'preserved' }
    }
    return { status: 'conflict' }
  } catch {
    return { status: 'failed' }
  }
}

function repairUnambiguousArchivePointers(
  songId: string,
  storage: TimingOverrideStorage,
): 'none' | 'repaired' | 'unavailable' | 'invalid' {
  if (typeof storage.length !== 'number' || typeof storage.key !== 'function') {
    return 'unavailable'
  }
  const recordsByIdentity = new Map<string, TimingOverrideArchiveRecord[]>()
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key?.startsWith(getSongArchiveRecordPrefix(songId))) continue
      const raw = storage.getItem(key)
      if (raw === null) continue
      const record = parseTimingOverrideArchiveRecord(raw)
      if (key !== getArchiveRecordKey(songId, record.recordId) || record.identity.songId !== songId) {
        return 'invalid'
      }
      const identityKey = encodeIdentity(record.identity)
      recordsByIdentity.set(identityKey, [
        ...(recordsByIdentity.get(identityKey) ?? []),
        record,
      ])
    }

    let repaired = false
    for (const records of recordsByIdentity.values()) {
      const identity = records[0]?.identity
      if (!identity) continue
      const activeKey = getTimingOverridesArchiveActiveKey(identity)
      const activeRaw = storage.getItem(activeKey)
      if (activeRaw !== null) {
        const activeId = parseArchivePointer(activeRaw)
        if (!activeId || !records.some(({ recordId }) => recordId === activeId)) {
          return 'invalid'
        }
        continue
      }
      if (records.length !== 1) continue
      const recordId = records[0].recordId
      storage.setItem(activeKey, recordId)
      if (storage.getItem(activeKey) !== recordId) return 'unavailable'
      repaired = true
    }
    return repaired ? 'repaired' : 'none'
  } catch {
    return 'unavailable'
  }
}

function addArchiveListingEntry(
  entries: Map<string, TimingOverrideArchiveEntry>,
  entry: TimingOverrideArchiveEntry,
): void {
  const key = `${encodeIdentity(entry.identity)}\u0000${serializeTimingOverrides(entry.document)}`
  const previous = entries.get(key)
  if (!previous || (previous.source === 'v3' && entry.source === 'archive')) {
    entries.set(key, entry)
  }
}

function listArchiveRecordsForIdentity(
  identity: TimingOverrideIdentity,
  storage: TimingOverrideStorage,
): {
  status: 'available' | 'unavailable'
  records: Array<{ key: string; record: TimingOverrideArchiveRecord }>
  invalidCount: number
} {
  if (typeof storage.length !== 'number' || typeof storage.key !== 'function') {
    return { status: 'unavailable', records: [], invalidCount: 0 }
  }
  const records: Array<{ key: string; record: TimingOverrideArchiveRecord }> = []
  let invalidCount = 0
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key?.startsWith(getSongArchiveRecordPrefix(identity.songId))) continue
      const raw = storage.getItem(key)
      if (raw === null) continue
      try {
        const record = parseTimingOverrideArchiveRecord(raw)
        if (key !== getArchiveRecordKey(record.identity.songId, record.recordId)) {
          invalidCount += 1
        } else if (sameIdentity(record.identity, identity)) {
          records.push({ key, record })
        }
      } catch {
        invalidCount += 1
      }
    }
    return { status: 'available', records, invalidCount }
  } catch {
    return { status: 'unavailable', records: [], invalidCount }
  }
}

function readArchivePointerAndRecord(
  identity: TimingOverrideIdentity,
  storage: TimingOverrideStorage,
): {
  status: 'available' | 'unavailable' | 'invalid'
  record?: TimingOverrideArchiveRecord
} {
  try {
    const recordId = parseArchivePointer(
      storage.getItem(getTimingOverridesArchiveActiveKey(identity)),
    )
    if (!recordId) {
      return storage.getItem(getTimingOverridesArchiveActiveKey(identity)) === null
        ? { status: 'available' }
        : { status: 'invalid' }
    }
    const raw = storage.getItem(getArchiveRecordKey(identity.songId, recordId))
    if (raw === null) return { status: 'invalid' }
    const record = parseTimingOverrideArchiveRecord(raw)
    if (
      record.recordId !== recordId ||
      !sameIdentity(record.identity, identity)
    ) return { status: 'invalid' }
    return { status: 'available', record }
  } catch {
    return { status: 'unavailable' }
  }
}

function parseTimingOverrideArchiveRecord(
  raw: string,
  options: TimingOverrideValidationOptions = {},
): TimingOverrideArchiveRecord {
  if (raw.length > 1_000_000) throw new TimingOverridesParseError('schema')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new TimingOverridesParseError('malformed-json')
  }
  if (!isRecord(parsed) || !sameKeys(Object.keys(parsed), [
    'format', 'schemaVersion', 'recordId', 'identity', 'document', 'preservedAt', 'originalRaw',
  ])) throw new TimingOverridesParseError('schema')
  if (
    parsed.format !== 'red-repeat-timing-override-archive' ||
    parsed.schemaVersion !== 1 ||
    !isNonEmptyString(parsed.recordId) ||
    !isValidIdentity(parsed.identity) ||
    !isNonEmptyString(parsed.preservedAt) ||
    !Number.isFinite(Date.parse(parsed.preservedAt)) ||
    typeof parsed.originalRaw !== 'string' ||
    parsed.originalRaw.length > 1_000_000
  ) throw new TimingOverridesParseError('schema')

  const identity = parsed.identity
  const document = validateTimingOverridesDocument(parsed.document, options)
  if (!sameIdentity(identity, document)) throw new TimingOverridesParseError('schema')
  let originalDocument: TimingOverridesDocument
  try {
    originalDocument = parseTimingOverridesDocument(parsed.originalRaw)
  } catch {
    throw new TimingOverridesParseError('schema')
  }
  if (
    !sameIdentity(identity, originalDocument) ||
    serializeTimingOverrides(originalDocument) !== serializeTimingOverrides(document)
  ) throw new TimingOverridesParseError('schema')

  return {
    format: 'red-repeat-timing-override-archive',
    schemaVersion: 1,
    recordId: parsed.recordId,
    identity,
    document,
    preservedAt: parsed.preservedAt,
    originalRaw: parsed.originalRaw,
  }
}

function validateDocumentAgainstCurrentOccurrences(
  document: TimingOverridesDocument,
  options: TimingOverrideValidationOptions,
): TimingOverridesDocument | undefined {
  try {
    return validateTimingOverridesDocument(document, options)
  } catch {
    return undefined
  }
}

function createTimingOverrideArchiveRecord(
  document: TimingOverridesDocument,
  originalRaw: string,
): TimingOverrideArchiveRecord {
  return {
    format: 'red-repeat-timing-override-archive',
    schemaVersion: 1,
    recordId: createArchiveRecordId(),
    identity: {
      songId: document.songId,
      editionContentHash: document.editionContentHash,
      audioSourceHash: document.audioSourceHash,
      baseTimelineUrl: document.baseTimelineUrl,
    },
    document: validateTimingOverridesDocument(document),
    preservedAt: new Date().toISOString(),
    originalRaw,
  }
}

function serializeArchiveRecord(record: TimingOverrideArchiveRecord): string {
  return `${JSON.stringify({
    ...record,
    document: JSON.parse(serializeTimingOverrides(record.document)) as TimingOverridesDocument,
  }, null, 2)}\n`
}

function findArchivedDocument(
  records: readonly { record: TimingOverrideArchiveRecord }[],
  document: TimingOverridesDocument,
): TimingOverrideArchiveRecord | undefined {
  const expected = serializeTimingOverrides(document)
  return records.find(({ record }) =>
    serializeTimingOverrides(record.document) === expected,
  )?.record
}

function sameIdentity(
  left: TimingOverrideIdentity,
  right: TimingOverrideIdentity,
): boolean {
  return left.songId === right.songId &&
    left.editionContentHash === right.editionContentHash &&
    left.audioSourceHash === right.audioSourceHash &&
    left.baseTimelineUrl === right.baseTimelineUrl
}

function isValidIdentity(value: unknown): value is TimingOverrideIdentity {
  if (!isRecord(value) || !sameKeys(Object.keys(value), [
    'songId', 'editionContentHash', 'audioSourceHash', 'baseTimelineUrl',
  ])) return false
  return isNonEmptyString(value.songId) &&
    isContentHash(value.editionContentHash) &&
    isContentHash(value.audioSourceHash) &&
    isNonEmptyString(value.baseTimelineUrl)
}

function encodeIdentity(identity: TimingOverrideIdentity): string {
  return encodeURIComponent(JSON.stringify([
    identity.songId,
    identity.editionContentHash,
    identity.audioSourceHash,
    identity.baseTimelineUrl,
  ]))
}

function getSongArchiveRecordPrefix(songId: string): string {
  return `${TIMING_OVERRIDES_ARCHIVE_RECORD_PREFIX}${encodeURIComponent(songId)}:`
}

function getArchiveRecordKey(songId: string, recordId: string): string {
  return `${getSongArchiveRecordPrefix(songId)}${recordId}`
}

function parseArchivePointer(raw: string | null): string | undefined {
  return raw && /^[a-zA-Z0-9-]{8,80}$/.test(raw) ? raw : undefined
}

function createArchiveRecordId(): string {
  try {
    return globalThis.crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
  }
}

function getTimingOverrideLockName(songId: string): string {
  return `red-repeat:timing-overrides:${encodeURIComponent(songId)}`
}

function getBrowserLockManager(): TimingOverrideLockManager | undefined {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) return undefined
  try {
    const locks = navigator.locks
    return {
      request: (name, callback) => locks.request(name, () => callback()),
    }
  } catch {
    return undefined
  }
}

function sameStorageSnapshot(
  left: TimingOverrideStorageSnapshot,
  right: TimingOverrideStorageSnapshot | undefined,
): boolean {
  if (!right || left.status !== 'available' || right.status !== 'available') return false
  return left.archiveActiveRaw === right.archiveActiveRaw &&
    left.legacyV3Raw === right.legacyV3Raw &&
    JSON.stringify(left.archiveRecordRaws) === JSON.stringify(right.archiveRecordRaws) &&
    JSON.stringify(left.legacySchemaRaws) === JSON.stringify(right.legacySchemaRaws)
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
      editionContentHash: document.editionContentHash,
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
  timing: EffectiveOccurrenceTiming,
): boolean {
  return (
    isValidTimingNumber(timing.startMs) &&
    isValidTimingNumber(timing.endMs) &&
    timing.startMs < timing.endMs
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
