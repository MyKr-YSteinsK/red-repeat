import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import type { Segment } from '../library/schema'

export type LyricTextSize = 'small' | 'standard' | 'large'

export interface LyricDisplayPreferences {
  version: 1
  translationVisible: boolean
  romajiVisible: boolean
  textSize: LyricTextSize
}

interface LyricDisplayPreferencesContextValue {
  preferences: LyricDisplayPreferences
  update: (patch: Partial<Omit<LyricDisplayPreferences, 'version'>>) => void
}

const STORAGE_KEY = 'red-repeat:lyric-display-preferences:v1'

export const DEFAULT_LYRIC_DISPLAY_PREFERENCES: LyricDisplayPreferences = {
  version: 1,
  translationVisible: true,
  romajiVisible: true,
  textSize: 'standard',
}

const LyricDisplayPreferencesContext =
  createContext<LyricDisplayPreferencesContextValue | null>(null)

const EMPTY_CONTEXT: LyricDisplayPreferencesContextValue = {
  preferences: DEFAULT_LYRIC_DISPLAY_PREFERENCES,
  update: () => undefined,
}

export function readLyricDisplayPreferences(
  storage?: Pick<Storage, 'getItem'>,
): LyricDisplayPreferences {
  try {
    const availableStorage =
      storage ?? (typeof window === 'undefined' ? undefined : window.localStorage)
    if (!availableStorage) return DEFAULT_LYRIC_DISPLAY_PREFERENCES
    const raw = availableStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_LYRIC_DISPLAY_PREFERENCES
    const parsed: unknown = JSON.parse(raw)
    if (!isLyricDisplayPreferences(parsed)) {
      return DEFAULT_LYRIC_DISPLAY_PREFERENCES
    }
    return parsed
  } catch {
    return DEFAULT_LYRIC_DISPLAY_PREFERENCES
  }
}

export function LyricDisplayPreferencesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [preferences, setPreferences] = useState(readLyricDisplayPreferences)
  const preferencesRef = useRef(preferences)

  const update = useCallback(
    (patch: Partial<Omit<LyricDisplayPreferences, 'version'>>) => {
      const next = { ...preferencesRef.current, ...patch, version: 1 as const }
      preferencesRef.current = next
      setPreferences(next)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Reading controls still work for this page when browser storage is unavailable.
      }
    },
    [],
  )

  return (
    <LyricDisplayPreferencesContext.Provider value={{ preferences, update }}>
      {children}
    </LyricDisplayPreferencesContext.Provider>
  )
}

export function useLyricDisplayPreferences(): LyricDisplayPreferencesContextValue {
  return useContext(LyricDisplayPreferencesContext) ?? EMPTY_CONTEXT
}

export function LyricDisplayPreferencesControls({
  onBeforeChange,
}: {
  onBeforeChange?: () => void
}) {
  const { preferences, update } = useLyricDisplayPreferences()
  const change = (patch: Partial<Omit<LyricDisplayPreferences, 'version'>>) => {
    onBeforeChange?.()
    update(patch)
  }

  return (
    <details className="lyric-display-preferences">
      <summary>歌词显示</summary>
      <div className="lyric-display-preferences-panel">
        <label>
          <input
            type="checkbox"
            checked={preferences.translationVisible}
            onChange={(event) =>
              change({ translationVisible: event.currentTarget.checked })
            }
          />
          显示翻译
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.romajiVisible}
            onChange={(event) =>
              change({ romajiVisible: event.currentTarget.checked })
            }
          />
          显示 Romaji
        </label>
        <fieldset>
          <legend>歌词字号</legend>
          {(['small', 'standard', 'large'] as const).map((size, index) => (
            <label key={size}>
              <input
                type="radio"
                name="lyric-text-size"
                value={size}
                checked={preferences.textSize === size}
                onChange={() => change({ textSize: size })}
              />
              {['小', '标准', '大'][index]}
            </label>
          ))}
        </fieldset>
      </div>
    </details>
  )
}

export function visibleLyricLayers(
  layers: Segment['layers'],
  romajiVisible: boolean,
) {
  return layers?.filter(
    (layer) => romajiVisible || layer.id !== 'romaji',
  )
}

export function useLyricAnchorPreservation(
  containerRef: RefObject<HTMLElement | null>,
  preferences: LyricDisplayPreferences,
) {
  const pendingAnchorRef = useRef<{ id: string; top: number } | undefined>(
    undefined,
  )

  const capture = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const navBottom =
      document.querySelector('.practice-page-tools')?.getBoundingClientRect().bottom ??
      0
    const anchor = Array.from(
      container.querySelectorAll<HTMLElement>('[data-reading-anchor-id]'),
    ).find((element) => {
      const rect = element.getBoundingClientRect()
      return rect.bottom > navBottom + 4 && rect.top < window.innerHeight
    })
    if (!anchor?.dataset.readingAnchorId) return
    pendingAnchorRef.current = {
      id: anchor.dataset.readingAnchorId,
      top: anchor.getBoundingClientRect().top,
    }
  }, [containerRef])

  useLayoutEffect(() => {
    const pending = pendingAnchorRef.current
    pendingAnchorRef.current = undefined
    if (!pending) return
    const anchor = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>(
        '[data-reading-anchor-id]',
      ) ?? [],
    ).find((element) => element.dataset.readingAnchorId === pending.id)
    if (!anchor) return
    const delta = anchor.getBoundingClientRect().top - pending.top
    if (Math.abs(delta) > 1) {
      window.scrollTo({ top: window.scrollY + delta, behavior: 'auto' })
    }
  }, [
    containerRef,
    preferences.translationVisible,
    preferences.romajiVisible,
    preferences.textSize,
  ])

  return capture
}

function isLyricDisplayPreferences(value: unknown): value is LyricDisplayPreferences {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LyricDisplayPreferences>
  return (
    candidate.version === 1 &&
    typeof candidate.translationVisible === 'boolean' &&
    typeof candidate.romajiVisible === 'boolean' &&
    (candidate.textSize === 'small' ||
      candidate.textSize === 'standard' ||
      candidate.textSize === 'large')
  )
}
