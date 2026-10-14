import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LYRIC_DISPLAY_PREFERENCES,
  LyricDisplayPreferencesControls,
  LyricDisplayPreferencesProvider,
  readLyricDisplayPreferences,
  visibleLyricLayers,
} from './LyricDisplayPreferences'

const storageKey = 'red-repeat:lyric-display-preferences:v1'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('lyric display preferences', () => {
  it('uses safe defaults for unavailable, malformed, and unknown-version storage', () => {
    expect(readLyricDisplayPreferences({ getItem: () => { throw new Error('blocked') } }))
      .toEqual(DEFAULT_LYRIC_DISPLAY_PREFERENCES)
    expect(readLyricDisplayPreferences({ getItem: () => '{broken' }))
      .toEqual(DEFAULT_LYRIC_DISPLAY_PREFERENCES)
    expect(readLyricDisplayPreferences({
      getItem: () => JSON.stringify({ ...DEFAULT_LYRIC_DISPLAY_PREFERENCES, version: 2 }),
    })).toEqual(DEFAULT_LYRIC_DISPLAY_PREFERENCES)
  })

  it('persists only display choices and keeps controls usable if storage writes fail', () => {
    const beforeChange = vi.fn()
    render(
      <LyricDisplayPreferencesProvider>
        <LyricDisplayPreferencesControls onBeforeChange={beforeChange} />
      </LyricDisplayPreferencesProvider>,
    )

    fireEvent.click(screen.getByText('歌词显示'))
    fireEvent.click(screen.getByRole('checkbox', { name: '显示翻译' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '显示 Romaji' }))
    fireEvent.click(screen.getByRole('radio', { name: '大' }))

    expect(beforeChange).toHaveBeenCalledTimes(3)
    expect(JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')).toEqual({
      version: 1,
      translationVisible: false,
      romajiVisible: false,
      textSize: 'large',
    })
    expect(screen.getByRole('checkbox', { name: '显示翻译' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: '显示 Romaji' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: '大' })).toBeChecked()

    window.localStorage.clear()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    fireEvent.click(screen.getByRole('checkbox', { name: '显示翻译' }))
    expect(screen.getByRole('checkbox', { name: '显示翻译' })).toBeChecked()
  })

  it('hides only the layer whose canonical id is romaji', () => {
    const layers = [
      { id: 'romaji', label: 'Romaji', text: 'koi no uta' },
      { id: 'pitch-guide', label: '音高提示', text: 'low' },
    ]

    expect(visibleLyricLayers(layers, false)).toEqual([layers[1]])
    expect(visibleLyricLayers(layers, true)).toEqual(layers)
  })
})
