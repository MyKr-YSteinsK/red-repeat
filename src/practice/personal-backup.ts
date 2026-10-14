import type { LyricDisplayPreferences } from '../edition/LyricDisplayPreferences'
import { isLyricDisplayPreferences, LYRIC_DISPLAY_PREFERENCES_STORAGE_KEY } from '../edition/LyricDisplayPreferences'
import type { RuntimeEdition } from '../library/runtime-schema'
import type { PracticeDocument, TimelineDocument } from '../library/schema'
import { createPracticeIndex } from './practice-scope'
import {
  parsePracticeLearningStateForBackup,
  getPracticeStateStorageKey,
  type PracticeLearningState,
} from './practice-state'
import { getPracticeRateStorageKey, PRACTICE_PLAYBACK_RATES } from './practice-rate'
import {
  getTimingOverridesStorageKey,
  parseTimingOverridesDocument,
  serializeTimingOverrides,
  type TimingOverridesDocument,
} from './practice-timing-overrides'
import {
  parseResumeContext,
  isResumeIdentityCompatible,
  RESUME_CONTEXT_STORAGE_KEY,
  type ResumeContext,
} from './resume-context'
import {
  createPracticeQueueItemId,
  parsePracticeQueue,
  PRACTICE_QUEUE_STORAGE_KEY,
  type PracticeQueueDocument,
  type PracticeQueueItem,
} from './practice-queue'

export const PERSONAL_BACKUP_FORMAT = 'red-repeat-personal-backup' as const
export const PERSONAL_BACKUP_SCHEMA_VERSION = 1 as const
export const PERSONAL_BACKUP_MAX_CHARS = 1_000_000
export const PERSONAL_BACKUP_MAX_SONGS = 24

export type PersonalBackupDomain =
  | 'practice'
  | 'rates'
  | 'lyricDisplayPreferences'
  | 'resumeContext'
  | 'practiceQueue'
  | 'timingOverrides'

export interface BackupSongIdentity {
  songId: string
  editionContentHash: string
  audioSourceHash: string
  timelineUrl: string
}

export interface BackupSongValue<T> {
  identity: BackupSongIdentity
  value: T
}

export interface PersonalBackupPayload {
  practice: BackupSongValue<PracticeLearningState>[]
  rates: BackupSongValue<number>[]
  lyricDisplayPreferences?: LyricDisplayPreferences
  resumeContext?: ResumeContext
  practiceQueue?: PracticeQueueDocument
  timingOverrides: BackupSongValue<TimingOverridesDocument>[]
}

export interface PersonalBackupDocument {
  format: typeof PERSONAL_BACKUP_FORMAT
  schemaVersion: typeof PERSONAL_BACKUP_SCHEMA_VERSION
  createdAt: string
  payload: PersonalBackupPayload
}

export interface BackupCurrentEditionContext {
  edition: RuntimeEdition
  practice: PracticeDocument
  timeline: TimelineDocument
  segmentIds: ReadonlySet<string>
}

export interface BackupStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface BackupWriteCandidate {
  domain: PersonalBackupDomain
  key: string
  value: string
  expectedOldValue: string | null
  state: 'new' | 'conflict' | 'unchanged'
}

export interface PersonalBackupImportPreview {
  candidates: BackupWriteCandidate[]
  skipped: Partial<Record<PersonalBackupDomain, number>>
}

export type BackupCommitResult =
  | { status: 'committed'; written: number }
  | { status: 'unchanged' }
  | { status: 'changed-since-preview'; key: string }
  | { status: 'rolled-back'; error: string }
  | { status: 'rollback-failed'; error: string; rollbackErrors: string[] }

export function parsePersonalBackup(raw: string): PersonalBackupDocument {
  if (raw.length > PERSONAL_BACKUP_MAX_CHARS) {
    throw new Error('备份文件超过 1 MB，已拒绝读取。')
  }
  let value: unknown
  try {
    value = JSON.parse(raw) as unknown
  } catch {
    throw new Error('备份不是有效 JSON。')
  }
  if (!isRecord(value) || !hasExactKeys(value, ['format', 'schemaVersion', 'createdAt', 'payload'])) {
    throw new Error('备份格式无效或包含未知字段。')
  }
  if (value.format !== PERSONAL_BACKUP_FORMAT || value.schemaVersion !== PERSONAL_BACKUP_SCHEMA_VERSION) {
    throw new Error('不支持此备份格式或 schema 版本。')
  }
  if (typeof value.createdAt !== 'string' || !isIsoTimestamp(value.createdAt)) {
    throw new Error('备份生成时间无效。')
  }
  if (!isRecord(value.payload) || !hasOnlyKeys(value.payload, [
    'practice', 'rates', 'lyricDisplayPreferences', 'resumeContext',
    'practiceQueue', 'timingOverrides',
  ]) || !hasRequiredKeys(value.payload, ['practice', 'rates', 'timingOverrides'])) {
    throw new Error('备份数据域无效或包含未知字段。')
  }
  const payload = value.payload
  const practice = parseSongValues(payload.practice, parsePracticeBackupShape, 'practice')
  const rates = parseSongValues(payload.rates, parseRate, 'rates')
  const timingOverrides = parseSongValues(
    payload.timingOverrides,
    parseTimingOverrideShape,
    'timingOverrides',
  )
  const lyricDisplayPreferences = payload.lyricDisplayPreferences === undefined
    ? undefined
    : isLyricDisplayPreferences(payload.lyricDisplayPreferences)
      ? payload.lyricDisplayPreferences
      : fail('歌词显示偏好数据无效。')
  const resumeContext = payload.resumeContext === undefined
    ? undefined
    : parseResumeContext(payload.resumeContext) ?? fail('最近学习位置数据无效。')
  const practiceQueue = payload.practiceQueue === undefined
    ? undefined
    : parsePracticeQueue(payload.practiceQueue) ?? fail('待练队列数据无效。')
  if (
    practice.length > PERSONAL_BACKUP_MAX_SONGS ||
    rates.length > PERSONAL_BACKUP_MAX_SONGS ||
    timingOverrides.length > PERSONAL_BACKUP_MAX_SONGS
  ) {
    throw new Error('备份歌曲条目过多。')
  }
  return {
    format: PERSONAL_BACKUP_FORMAT,
    schemaVersion: PERSONAL_BACKUP_SCHEMA_VERSION,
    createdAt: value.createdAt,
    payload: {
      practice,
      rates,
      ...(lyricDisplayPreferences ? { lyricDisplayPreferences } : {}),
      ...(resumeContext ? { resumeContext } : {}),
      ...(practiceQueue ? { practiceQueue } : {}),
      timingOverrides,
    },
  }
}

export function serializePersonalBackup(document: PersonalBackupDocument): string {
  const normalized = parsePersonalBackup(JSON.stringify(document))
  return `${JSON.stringify(normalized, null, 2)}\n`
}

export function createBackupIdentity(edition: RuntimeEdition): BackupSongIdentity {
  return {
    songId: edition.song.songId,
    editionContentHash: edition.contentHash,
    audioSourceHash: edition.audio.sourceHash,
    timelineUrl: edition.timelineUrl,
  }
}

export function preparePersonalBackupImport(
  backup: PersonalBackupDocument,
  current: ReadonlyMap<string, BackupCurrentEditionContext>,
  storage: BackupStorage,
): PersonalBackupImportPreview {
  const candidates: BackupWriteCandidate[] = []
  const skipped: Partial<Record<PersonalBackupDomain, number>> = {}
  const addSkipped = (domain: PersonalBackupDomain): void => {
    skipped[domain] = (skipped[domain] ?? 0) + 1
  }
  const addCandidate = (domain: PersonalBackupDomain, key: string, value: string): void => {
    const oldValue = storage.getItem(key)
    candidates.push({
      domain,
      key,
      value,
      expectedOldValue: oldValue,
      state: oldValue === value ? 'unchanged' : oldValue === null ? 'new' : 'conflict',
    })
  }
  const getMatching = (identity: BackupSongIdentity): BackupCurrentEditionContext | undefined => {
    const context = current.get(identity.songId)
    return context && hasMatchingIdentity(identity, createBackupIdentity(context.edition)) &&
      context.edition.timelineUrl === identity.timelineUrl
      ? context
      : undefined
  }

  for (const item of backup.payload.practice) {
    const context = getMatching(item.identity)
    const state = context
      ? parsePracticeLearningStateForBackup(item.value, context.practice, context.timeline)
      : undefined
    if (!state) {
      addSkipped('practice')
      continue
    }
    addCandidate('practice', getPracticeStateStorageKey(item.identity.songId), JSON.stringify(state))
  }
  for (const item of backup.payload.rates) {
    if (!getMatching(item.identity)) {
      addSkipped('rates')
      continue
    }
    addCandidate('rates', getPracticeRateStorageKey(item.identity.songId), String(item.value))
  }
  if (backup.payload.lyricDisplayPreferences) {
    addCandidate(
      'lyricDisplayPreferences',
      LYRIC_DISPLAY_PREFERENCES_STORAGE_KEY,
      JSON.stringify(backup.payload.lyricDisplayPreferences),
    )
  }
  if (backup.payload.resumeContext) {
    const resume = backup.payload.resumeContext
    const context = current.get(resume.songId)
    if (
      !context ||
      !isResumeIdentityCompatible(resume, createBackupIdentity(context.edition)) ||
      !isResumeTargetValid(resume, context)
    ) {
      addSkipped('resumeContext')
    } else {
      addCandidate('resumeContext', RESUME_CONTEXT_STORAGE_KEY, JSON.stringify(resume))
    }
  }
  if (backup.payload.practiceQueue) {
    const validItems: PracticeQueueItem[] = []
    for (const item of backup.payload.practiceQueue.items) {
      const context = getMatching(item)
      if (!context || !isQueueTargetValid(item, context)) {
        addSkipped('practiceQueue')
      } else {
        validItems.push(item)
      }
    }
    const queue = parsePracticeQueue({ schemaVersion: 1, items: validItems })
    if (queue && (validItems.length > 0 || backup.payload.practiceQueue.items.length === 0)) {
      addCandidate('practiceQueue', PRACTICE_QUEUE_STORAGE_KEY, JSON.stringify(queue))
    } else if (!queue) {
      addSkipped('practiceQueue')
    }
  }
  for (const item of backup.payload.timingOverrides) {
    const context = getMatching(item.identity)
    if (!context) {
      addSkipped('timingOverrides')
      continue
    }
    try {
      const document = parseTimingOverridesDocument(
        JSON.stringify(item.value),
        { occurrences: context.timeline.occurrences },
      )
      const identity = createBackupIdentity(context.edition)
      if (!hasMatchingIdentity(item.identity, identity) ||
        document.songId !== identity.songId ||
        document.editionContentHash !== identity.editionContentHash ||
        document.audioSourceHash !== identity.audioSourceHash ||
        document.baseTimelineUrl !== identity.timelineUrl ||
        Object.keys(document.occurrences).some((occurrenceId) =>
          !context.timeline.occurrences.some(({ id }) => id === occurrenceId),
        )) {
        addSkipped('timingOverrides')
        continue
      }
      addCandidate(
        'timingOverrides',
        getTimingOverridesStorageKey(item.identity.songId),
        serializeTimingOverrides(document),
      )
    } catch {
      addSkipped('timingOverrides')
    }
  }
  return { candidates, skipped }
}

export function commitPersonalBackupImport(
  preview: PersonalBackupImportPreview,
  selectedDomains: ReadonlySet<PersonalBackupDomain>,
  overwriteDomains: ReadonlySet<PersonalBackupDomain>,
  storage: BackupStorage,
): BackupCommitResult {
  const writes = preview.candidates.filter((candidate) =>
    selectedDomains.has(candidate.domain) &&
    candidate.state !== 'unchanged' &&
    (candidate.state !== 'conflict' || overwriteDomains.has(candidate.domain)),
  )
  if (writes.length === 0) return { status: 'unchanged' }

  for (const write of writes) {
    try {
      if (storage.getItem(write.key) !== write.expectedOldValue) {
        return { status: 'changed-since-preview', key: write.key }
      }
    } catch {
      return { status: 'changed-since-preview', key: write.key }
    }
  }

  const attempted: BackupWriteCandidate[] = []
  try {
    for (const write of writes) {
      attempted.push(write)
      storage.setItem(write.key, write.value)
      if (storage.getItem(write.key) !== write.value) {
        throw new Error(`写入校验失败：${write.key}`)
      }
    }
    return { status: 'committed', written: writes.length }
  } catch (error) {
    const rollbackErrors: string[] = []
    for (const write of attempted.reverse()) {
      try {
        if (write.expectedOldValue === null) {
          storage.removeItem(write.key)
        } else {
          storage.setItem(write.key, write.expectedOldValue)
        }
        if (storage.getItem(write.key) !== write.expectedOldValue) {
          rollbackErrors.push(`${write.key}: 恢复值核验失败`)
        }
      } catch (rollbackError) {
        rollbackErrors.push(`${write.key}: ${errorText(rollbackError)}`)
      }
    }
    const message = errorText(error)
    return rollbackErrors.length > 0
      ? { status: 'rollback-failed', error: message, rollbackErrors }
      : { status: 'rolled-back', error: message }
  }
}

export function emptyBackupPayload(): PersonalBackupPayload {
  return {
    practice: [],
    rates: [],
    timingOverrides: [],
  }
}

function isQueueTargetValid(
  item: PracticeQueueItem,
  context: BackupCurrentEditionContext,
): boolean {
  if (!context.segmentIds.has(item.segmentId)) return false
  try {
    const index = createPracticeIndex(context.practice, context.timeline)
    return index.unitIdByOccurrenceId.get(item.occurrenceId) === item.practiceUnitId &&
      context.timeline.occurrences.some(({ id, segmentId }) =>
        id === item.occurrenceId && segmentId === item.segmentId,
      ) &&
      item.id === createPracticeQueueItemId(item)
  } catch {
    return false
  }
}

function isResumeTargetValid(
  resume: ResumeContext,
  context: BackupCurrentEditionContext,
): boolean {
  if (resume.mode === 'practice') {
    if (!resume.occurrenceId || !resume.practiceUnitId) return false
    try {
      return createPracticeIndex(context.practice, context.timeline)
        .unitIdByOccurrenceId.get(resume.occurrenceId) === resume.practiceUnitId
    } catch {
      return false
    }
  }
  if (resume.mode === 'all') {
    return Boolean(resume.occurrenceId &&
      context.timeline.occurrences.some(({ id }) => id === resume.occurrenceId))
  }
  return Boolean(resume.featureId &&
    context.edition.features.some(({ id }) => id === resume.featureId))
}

function parseSongValues<T>(
  value: unknown,
  parseValue: (candidate: unknown) => T | undefined,
  domain: string,
): BackupSongValue<T>[] {
  if (!Array.isArray(value) || value.length > PERSONAL_BACKUP_MAX_SONGS) {
    return fail(`备份 ${domain} 数据域无效。`)
  }
  const result: BackupSongValue<T>[] = []
  const songs = new Set<string>()
  for (const candidate of value) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ['identity', 'value'])) {
      return fail(`备份 ${domain} 条目格式无效。`)
    }
    const identity = parseIdentity(candidate.identity)
    const parsedValue = parseValue(candidate.value)
    if (!identity || parsedValue === undefined || songs.has(identity.songId)) {
      return fail(`备份 ${domain} 条目或歌曲身份无效。`)
    }
    songs.add(identity.songId)
    result.push({ identity, value: parsedValue })
  }
  return result
}

function parseIdentity(value: unknown): BackupSongIdentity | undefined {
  if (!isRecord(value) || !hasExactKeys(value, [
    'songId', 'editionContentHash', 'audioSourceHash', 'timelineUrl',
  ])) return undefined
  if (!isIdentifier(value.songId) || !isHash(value.editionContentHash) ||
    !isHash(value.audioSourceHash) || !isRuntimeUrl(value.timelineUrl)) return undefined
  return value as unknown as BackupSongIdentity
}

function parsePracticeBackupShape(value: unknown): PracticeLearningState | undefined {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'schemaVersion', 'practiceUnitId', 'currentOccurrenceId', 'coveredUntilByUnit', 'updatedAt',
  ]) || !hasRequiredKeys(value, [
    'schemaVersion', 'practiceUnitId', 'currentOccurrenceId', 'coveredUntilByUnit',
  ]) || value.schemaVersion !== 1 || !isIdentifier(value.practiceUnitId) ||
    !isIdentifier(value.currentOccurrenceId) ||
    (value.updatedAt !== undefined && !isTimestamp(value.updatedAt)) ||
    !isRecord(value.coveredUntilByUnit) || Object.keys(value.coveredUntilByUnit).length > 200) {
    return undefined
  }
  const covered: Record<string, string> = {}
  for (const [unitId, occurrenceId] of Object.entries(value.coveredUntilByUnit)) {
    if (unitId === '__proto__' || unitId === 'constructor' || !isIdentifier(unitId) || !isIdentifier(occurrenceId)) return undefined
    covered[unitId] = occurrenceId
  }
  return {
    schemaVersion: 1,
    practiceUnitId: value.practiceUnitId,
    currentOccurrenceId: value.currentOccurrenceId,
    coveredUntilByUnit: covered,
    ...(value.updatedAt !== undefined ? { updatedAt: value.updatedAt } : {}),
  }
}

function parseRate(value: unknown): number | undefined {
  return PRACTICE_PLAYBACK_RATES.some((rate) => rate === value) ? value as number : undefined
}

function parseTimingOverrideShape(value: unknown): TimingOverridesDocument | undefined {
  if (!isRecord(value)) return undefined
  try {
    return parseTimingOverridesDocument(JSON.stringify(value))
  } catch {
    return undefined
  }
}

function hasMatchingIdentity(
  left: Pick<BackupSongIdentity, 'songId' | 'editionContentHash' | 'audioSourceHash' | 'timelineUrl'>,
  right: Pick<BackupSongIdentity, 'songId' | 'editionContentHash' | 'audioSourceHash' | 'timelineUrl'>,
): boolean {
  return left.songId === right.songId &&
    left.editionContentHash === right.editionContentHash &&
    left.audioSourceHash === right.audioSourceHash &&
    left.timelineUrl === right.timelineUrl
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

function hasRequiredKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => Object.hasOwn(value, key))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,127}$/i.test(value)
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

function isRuntimeUrl(value: unknown): value is string {
  return typeof value === 'string' && /^\/library-runtime\/[a-zA-Z0-9._/-]+$/.test(value)
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
}

function fail(message: string): never {
  throw new Error(message)
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '未知存储错误'
}
