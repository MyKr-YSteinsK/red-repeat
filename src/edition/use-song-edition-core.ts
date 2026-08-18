import { useEffect, useState } from 'react'
import type { CatalogEdition } from '../library/runtime-schema'
import {
  RuntimeClient,
  RuntimeClientError,
} from '../runtime/runtime-client'
import {
  loadRuntimeSongEditionCore,
  type RuntimeSongEditionCore,
} from '../runtime/song-edition-loader'

export type SongEditionLoadState =
  | { status: 'loading' }
  | { status: 'ready'; core: RuntimeSongEditionCore }
  | { status: 'error'; error: unknown }

export function useSongEditionCore(
  runtimeClient: RuntimeClient,
  catalogEdition: CatalogEdition,
  retryKey: number,
): SongEditionLoadState {
  const [state, setState] = useState<SongEditionLoadState>({
    status: 'loading',
  })

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    void loadRuntimeSongEditionCore(runtimeClient, catalogEdition, {
      signal: controller.signal,
    })
      .then((core) => {
        if (active) {
          setState({ status: 'ready', core })
        }
      })
      .catch((error: unknown) => {
        if (
          active &&
          !(error instanceof RuntimeClientError && error.kind === 'abort')
        ) {
          setState({ status: 'error', error })
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [catalogEdition, retryKey, runtimeClient])

  return state
}
