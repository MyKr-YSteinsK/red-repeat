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
  const requestKey = `${catalogEdition.songId}\u0000${catalogEdition.editionUrl}\u0000${retryKey}`
  const [requestState, setRequestState] = useState<{
    key: string
    state: SongEditionLoadState
  }>(() => ({
    key: requestKey,
    state: { status: 'loading' },
  }))

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    void loadRuntimeSongEditionCore(runtimeClient, catalogEdition, {
      signal: controller.signal,
    })
      .then((core) => {
        if (active) {
          setRequestState({ key: requestKey, state: { status: 'ready', core } })
        }
      })
      .catch((error: unknown) => {
        if (
          active &&
          !(error instanceof RuntimeClientError && error.kind === 'abort')
        ) {
          setRequestState({ key: requestKey, state: { status: 'error', error } })
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [catalogEdition, requestKey, runtimeClient])

  if (requestState.key === requestKey) {
    return requestState.state
  }
  return { status: 'loading' }
}
