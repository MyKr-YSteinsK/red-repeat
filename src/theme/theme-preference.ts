import type { VisualDocument } from '../library/schema'

export type EditionTheme = VisualDocument['recommendedTheme']

export const EDITION_THEMES: readonly EditionTheme[] = [
  'liner',
  'cinema',
  'nocturne',
]

export interface ThemePreferenceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const THEME_PREFERENCE_KEY_PREFIX = 'red-repeat:theme:v1:'

export function readThemePreference(
  songId: string,
  storage: ThemePreferenceStorage | undefined = getBrowserStorage(),
): EditionTheme | undefined {
  try {
    const value = storage?.getItem(themePreferenceKey(songId))
    return isEditionTheme(value) ? value : undefined
  } catch {
    return undefined
  }
}

export function resolveThemePreference(
  songId: string,
  recommendedTheme: EditionTheme,
  storage?: ThemePreferenceStorage,
): EditionTheme {
  return readThemePreference(songId, storage) ?? recommendedTheme
}

export function writeThemePreference(
  songId: string,
  theme: EditionTheme,
  storage: ThemePreferenceStorage | undefined = getBrowserStorage(),
): void {
  try {
    storage?.setItem(themePreferenceKey(songId), theme)
  } catch {
    // Preference persistence is best effort; the in-memory selection still applies.
  }
}

export function themePreferenceKey(songId: string): string {
  return `${THEME_PREFERENCE_KEY_PREFIX}${songId}`
}

export function isEditionTheme(value: unknown): value is EditionTheme {
  return typeof value === 'string' && EDITION_THEMES.includes(value as EditionTheme)
}

function getBrowserStorage(): ThemePreferenceStorage | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
