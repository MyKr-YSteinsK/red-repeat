import { DEFAULT_PLAYBACK_RATE } from '../audio/audio-engine'

export const PRACTICE_RATE_STORAGE_PREFIX = 'red-repeat:practice-rate:v1:'
export const PRACTICE_PLAYBACK_RATES = [0.6, 0.8, 1] as const

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
    return normalizePracticeRate(Number(raw))
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
      String(normalizePracticeRate(playbackRate)),
    )
  } catch {
    // Local persistence is an enhancement; playback remains usable.
  }
}

export function getNextPracticePlaybackRate(
  currentRate: number,
  direction: -1 | 1,
): number {
  const safeCurrentRate = normalizePracticeRate(currentRate)
  const currentIndex = PRACTICE_PLAYBACK_RATES.indexOf(
    safeCurrentRate as (typeof PRACTICE_PLAYBACK_RATES)[number],
  )
  const nextIndex = Math.min(
    PRACTICE_PLAYBACK_RATES.length - 1,
    Math.max(0, currentIndex + direction),
  )
  return PRACTICE_PLAYBACK_RATES[nextIndex]
}

function normalizePracticeRate(value: number): number {
  return PRACTICE_PLAYBACK_RATES.includes(
    value as (typeof PRACTICE_PLAYBACK_RATES)[number],
  )
    ? value
    : DEFAULT_PLAYBACK_RATE
}

function getBrowserStorage(): PracticeRateStorage | undefined {
  if (typeof globalThis.localStorage === 'undefined') {
    return undefined
  }
  return globalThis.localStorage
}
