import {
  DEFAULT_PLAYBACK_RATE,
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  normalizePlaybackRate,
  PLAYBACK_RATE_STEP,
} from '../audio/audio-engine'

export const PRACTICE_RATE_STORAGE_PREFIX = 'red-repeat:practice-rate:v1:'

export interface PracticeRateStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function getPracticeRateStorageKey(songId: string): string {
  return `${PRACTICE_RATE_STORAGE_PREFIX}${songId}`
}

export function readPracticePlaybackRate(
  songId: string,
  storage?: PracticeRateStorage,
): number {
  const persistence = storage ?? getBrowserStorage()
  if (!persistence) {
    return DEFAULT_PLAYBACK_RATE
  }

  try {
    const raw = persistence.getItem(getPracticeRateStorageKey(songId))
    if (raw === null) {
      return DEFAULT_PLAYBACK_RATE
    }
    return normalizePlaybackRate(Number(raw))
  } catch {
    return DEFAULT_PLAYBACK_RATE
  }
}

export function savePracticePlaybackRate(
  songId: string,
  playbackRate: number,
  storage?: PracticeRateStorage,
): void {
  const persistence = storage ?? getBrowserStorage()
  if (!persistence) {
    return
  }

  try {
    persistence.setItem(
      getPracticeRateStorageKey(songId),
      String(normalizePlaybackRate(playbackRate)),
    )
  } catch {
    // Local persistence is an enhancement; playback remains usable.
  }
}

export function getNextPracticePlaybackRate(
  currentRate: number,
  direction: -1 | 1,
): number {
  const safeCurrentRate = Number.isFinite(currentRate)
    ? currentRate
    : DEFAULT_PLAYBACK_RATE
  const nextRate = Number(
    (safeCurrentRate + direction * PLAYBACK_RATE_STEP).toFixed(2),
  )
  return Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, nextRate))
}

function getBrowserStorage(): PracticeRateStorage | undefined {
  if (typeof globalThis.localStorage === 'undefined') {
    return undefined
  }
  return globalThis.localStorage
}
