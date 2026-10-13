import { createContext, useCallback, useContext, useState, type Dispatch, type SetStateAction } from 'react'
import type { SongPlaybackSession } from './song-playback-session'

export const SongPlaybackContext = createContext<{
  session: SongPlaybackSession | null
  views: Map<string, unknown>
} | null>(null)

/** Session-local view context, never a new persistence/learning schema. */
export function useSessionViewState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const context = useContext(SongPlaybackContext)
  const [value, setValue] = useState<T>(() => {
    const makeInitial = () => typeof initial === 'function' ? (initial as () => T)() : initial
    if (context && !context.views.has(key)) context.views.set(key, makeInitial())
    return context ? context.views.get(key) as T : makeInitial()
  })
  const update = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue(previous => {
      const resolved = typeof next === 'function' ? (next as (value: T) => T)(previous) : next
      context?.views.set(key, resolved)
      return resolved
    })
  }, [key, context])
  return [value, update]
}
