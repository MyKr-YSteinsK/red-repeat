import { describe, expect, it } from 'vitest'
import {
  readThemePreference,
  resolveThemePreference,
  themePreferenceKey,
  writeThemePreference,
  type ThemePreferenceStorage,
} from './theme-preference'

describe('theme preference', () => {
  it('uses a versioned per-song key and accepts a valid persisted theme', () => {
    const storage = new MemoryStorage()
    storage.setItem(themePreferenceKey('first-light'), 'nocturne')

    expect(readThemePreference('first-light', storage)).toBe('nocturne')
    expect(resolveThemePreference('first-light', 'cinema', storage)).toBe(
      'nocturne',
    )
    expect(themePreferenceKey('first-light')).toBe(
      'red-repeat:theme:v1:first-light',
    )
  })

  it('falls back for missing, unknown, and corrupted values', () => {
    const storage = new MemoryStorage()

    expect(resolveThemePreference('first-light', 'cinema', storage)).toBe(
      'cinema',
    )
    storage.setItem(themePreferenceKey('first-light'), 'future-theme')
    expect(resolveThemePreference('first-light', 'cinema', storage)).toBe(
      'cinema',
    )
    storage.setItem(themePreferenceKey('first-light'), '{"theme":"liner"}')
    expect(readThemePreference('first-light', storage)).toBeUndefined()
  })

  it('keeps separate songs independent and makes writes best effort', () => {
    const storage = new MemoryStorage()
    writeThemePreference('first-light', 'nocturne', storage)
    writeThemePreference('second-signal', 'cinema', storage)

    expect(readThemePreference('first-light', storage)).toBe('nocturne')
    expect(readThemePreference('second-signal', storage)).toBe('cinema')

    const throwingStorage: ThemePreferenceStorage = {
      getItem: () => {
        throw new Error('storage blocked')
      },
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }
    expect(resolveThemePreference('first-light', 'liner', throwingStorage)).toBe(
      'liner',
    )
    expect(() => writeThemePreference('first-light', 'cinema', throwingStorage)).not.toThrow()
  })
})

class MemoryStorage implements ThemePreferenceStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}
