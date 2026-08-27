import type { PracticeDocument } from '../library/schema'
import {
  createPracticeIndex,
  type PracticeIndex,
} from './practice-scope'

export const PRACTICE_STATE_SCHEMA_VERSION = 1 as const

export interface PracticeLearningState {
  schemaVersion: typeof PRACTICE_STATE_SCHEMA_VERSION
  practiceUnitId: string
  currentOccurrenceId: string
  coveredUntilByUnit: Readonly<Record<string, string>>
  /** The last explicitly saved Practice position, when one exists. */
  updatedAt?: number
}

export interface PracticeResumeMetadata {
  practiceUnitId: string
  occurrenceId: string
  /** Present for positions saved after timestamped resume support was added. */
  updatedAt?: number
}

export interface PracticeResumeSummary extends PracticeResumeMetadata {
  unitLabel: string
  lineIndex: number
  lineCount: number
}

export interface PracticeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function createInitialPracticeState(
  index: PracticeIndex,
): PracticeLearningState {
  const firstUnit = index.units[0]
  const firstOccurrenceId = firstUnit?.occurrenceIds[0]
  if (!firstUnit || !firstOccurrenceId) {
    throw new Error('Practice document must contain a usable Practice Unit')
  }

  return {
    schemaVersion: PRACTICE_STATE_SCHEMA_VERSION,
    practiceUnitId: firstUnit.id,
    currentOccurrenceId: firstOccurrenceId,
    coveredUntilByUnit: { [firstUnit.id]: firstOccurrenceId },
  }
}

export function setCurrentPracticeOccurrence(
  state: PracticeLearningState,
  index: PracticeIndex,
  occurrenceId: string,
): PracticeLearningState {
  const practiceUnitId = index.unitIdByOccurrenceId.get(occurrenceId)
  if (!practiceUnitId) {
    throw new Error(`Occurrence ${occurrenceId} is not covered by Practice`)
  }

  const nextCovered = { ...state.coveredUntilByUnit }
  const occurrenceIds = index.occurrenceIdsByUnitId.get(practiceUnitId)
  if (!occurrenceIds) {
    throw new Error(`Practice Unit ${practiceUnitId} is not indexed`)
  }

  const nextIndex = occurrenceIds.indexOf(occurrenceId)
  const coveredId = nextCovered[practiceUnitId]
  const coveredIndex = coveredId ? occurrenceIds.indexOf(coveredId) : -1
  if (nextIndex > coveredIndex) {
    nextCovered[practiceUnitId] = occurrenceId
  }

  return {
    schemaVersion: PRACTICE_STATE_SCHEMA_VERSION,
    practiceUnitId,
    currentOccurrenceId: occurrenceId,
    coveredUntilByUnit: nextCovered,
    updatedAt: Date.now(),
  }
}

export function focusPracticeUnitStart(
  state: PracticeLearningState,
  index: PracticeIndex,
  practiceUnitId: string,
): PracticeLearningState {
  const unit = index.unitsById.get(practiceUnitId)
  const firstOccurrenceId = unit?.occurrenceIds[0]
  if (!unit || !firstOccurrenceId) {
    throw new Error(`Practice Unit ${practiceUnitId} is not usable`)
  }

  return {
    schemaVersion: PRACTICE_STATE_SCHEMA_VERSION,
    practiceUnitId: unit.id,
    currentOccurrenceId: firstOccurrenceId,
    coveredUntilByUnit: state.coveredUntilByUnit,
    updatedAt: Date.now(),
  }
}

/**
 * Read only the persisted position metadata. This function never normalizes,
 * writes, or otherwise changes Practice state.
 */
export function readPracticeResumeMetadata(
  songId: string,
  storage?: PracticeStorage,
): PracticeResumeMetadata | undefined {
  const persistence = storage ?? getBrowserStorage()
  if (!persistence) {
    return undefined
  }

  try {
    const raw = persistence.getItem(storageKey(songId))
    if (!raw) {
      return undefined
    }
    const value = JSON.parse(raw) as unknown
    if (!isRecord(value) || value.schemaVersion !== PRACTICE_STATE_SCHEMA_VERSION) {
      return undefined
    }

    const updatedAt = value.updatedAt
    const practiceUnitId = value.practiceUnitId
    const occurrenceId = value.currentOccurrenceId
    if (
      (updatedAt !== undefined && !isValidUpdatedAt(updatedAt)) ||
      typeof practiceUnitId !== 'string' ||
      typeof occurrenceId !== 'string'
    ) {
      return undefined
    }

    return {
      practiceUnitId,
      occurrenceId,
      ...(updatedAt !== undefined ? { updatedAt } : {}),
    }
  } catch {
    return undefined
  }
}

export function resolvePracticeResumeSummary(
  metadata: PracticeResumeMetadata,
  practice: PracticeDocument,
  timeline: Parameters<typeof createPracticeIndex>[1],
): PracticeResumeSummary | undefined {
  try {
    const index = createPracticeIndex(practice, timeline)
    // Occurrence identity is more stable than a Practice Unit boundary. This
    // lets a regrouped source document recover an old resume without trusting
    // a stale unit id whose meaning may now belong to another group.
    const practiceUnitId =
      index.unitIdByOccurrenceId.get(metadata.occurrenceId) ??
      metadata.practiceUnitId
    const unit = index.unitsById.get(practiceUnitId)
    const occurrenceIds = index.occurrenceIdsByUnitId.get(practiceUnitId)
    if (!unit || !occurrenceIds) {
      return undefined
    }

    const lineIndex = occurrenceIds.indexOf(metadata.occurrenceId)
    if (lineIndex < 0) {
      return undefined
    }

    return {
      ...metadata,
      practiceUnitId,
      unitLabel: unit.label,
      lineIndex: lineIndex + 1,
      lineCount: occurrenceIds.length,
    }
  } catch {
    return undefined
  }
}

export function loadPracticeLearningState(
  songId: string,
  practice: PracticeDocument,
  timeline: Parameters<typeof createPracticeIndex>[1],
  storage?: PracticeStorage,
): PracticeLearningState {
  const index = createPracticeIndex(practice, timeline)
  const fallback = createInitialPracticeState(index)
  const persistence = storage ?? getBrowserStorage()
  if (!persistence) {
    return fallback
  }

  try {
    const raw = persistence.getItem(storageKey(songId))
    if (!raw) {
      return fallback
    }
    return normalizePersistedState(JSON.parse(raw) as unknown, index, fallback)
  } catch {
    return fallback
  }
}

export function savePracticeLearningState(
  songId: string,
  state: PracticeLearningState,
  storage?: PracticeStorage,
): void {
  const persistence = storage ?? getBrowserStorage()
  if (!persistence) {
    return
  }

  try {
    persistence.setItem(storageKey(songId), JSON.stringify(state))
  } catch {
    // Local persistence is an enhancement; playback remains usable.
  }
}

function normalizePersistedState(
  value: unknown,
  index: PracticeIndex,
  fallback: PracticeLearningState,
): PracticeLearningState {
  if (!isRecord(value) || value.schemaVersion !== PRACTICE_STATE_SCHEMA_VERSION) {
    return fallback
  }

  const currentOccurrenceId =
    typeof value.currentOccurrenceId === 'string'
      ? value.currentOccurrenceId
      : undefined
  const storedUnitId =
    typeof value.practiceUnitId === 'string' ? value.practiceUnitId : undefined
  const currentUnitId = currentOccurrenceId
    ? index.unitIdByOccurrenceId.get(currentOccurrenceId)
    : undefined
  const practiceUnitId = currentUnitId ?? storedUnitId
  if (!practiceUnitId || !index.unitsById.has(practiceUnitId)) {
    return fallback
  }

  const resolvedCurrentOccurrenceId = currentUnitId
    ? currentOccurrenceId
    : index.occurrenceIdsByUnitId.get(practiceUnitId)?.[0]
  if (!resolvedCurrentOccurrenceId) {
    return fallback
  }

  const coveredUntilByUnit = normalizeCoveredUntil(
    value.coveredUntilByUnit,
    index,
  )
  if (!coveredUntilByUnit[practiceUnitId]) {
    coveredUntilByUnit[practiceUnitId] = resolvedCurrentOccurrenceId
  }

  return {
    schemaVersion: PRACTICE_STATE_SCHEMA_VERSION,
    practiceUnitId,
    currentOccurrenceId: resolvedCurrentOccurrenceId,
    coveredUntilByUnit,
    ...(isValidUpdatedAt(value.updatedAt)
      ? { updatedAt: value.updatedAt }
      : {}),
  }
}

function normalizeCoveredUntil(
  value: unknown,
  index: PracticeIndex,
): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }

  const result: Record<string, string> = {}
  const resultIndexes = new Map<string, number>()
  Object.entries(value).forEach(([unitId, occurrenceId]) => {
    if (typeof occurrenceId !== 'string') {
      return
    }
    const resolvedUnitId =
      index.unitIdByOccurrenceId.get(occurrenceId) ??
      (index.unitsById.has(unitId) ? unitId : undefined)
    if (!resolvedUnitId) {
      return
    }
    const occurrenceIds = index.occurrenceIdsByUnitId.get(resolvedUnitId)
    const occurrenceIndex = occurrenceIds?.indexOf(occurrenceId) ?? -1
    if (occurrenceIndex < 0) {
      return
    }
    const previousIndex = resultIndexes.get(resolvedUnitId) ?? -1
    if (occurrenceIndex >= previousIndex) {
      result[resolvedUnitId] = occurrenceId
      resultIndexes.set(resolvedUnitId, occurrenceIndex)
    }
  })
  return result
}

function storageKey(songId: string): string {
  return `red-repeat:practice:${songId}`
}

function getBrowserStorage(): PracticeStorage | undefined {
  if (typeof globalThis.localStorage === 'undefined') {
    return undefined
  }
  return globalThis.localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidUpdatedAt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
