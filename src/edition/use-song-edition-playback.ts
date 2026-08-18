import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AudioEngine,
  AudioEngineState,
} from '../audio/audio-engine'
import { getAudioEngine } from '../audio/audio-engine'
import { resolveTimeline, type TimelineResolution } from '../timeline/resolver'
import { toOccurrencePlaybackRange } from '../timeline/playback-ranges'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { AssembledOccurrence, AssembledSongEdition } from '../runtime/song-edition'

const IDLE_AUDIO_STATE: AudioEngineState = {
  status: 'idle',
  intent: 'continuous',
  playbackRate: 1,
  currentTimeMs: 0,
}

export interface SongEditionPlaybackSnapshot {
  engine: AudioEngine | null
  audioState: AudioEngineState
  resolution: TimelineResolution
  selectedOccurrenceId?: string
  selectOccurrence: (occurrence: AssembledOccurrence) => void
}

export function useSongEditionPlayback(
  model: AssembledSongEdition,
  runtimeClient: RuntimeClient,
  providedEngine?: AudioEngine,
): SongEditionPlaybackSnapshot {
  const engine =
    providedEngine ?? (typeof Audio === 'undefined' ? null : getAudioEngine())
  const sourceUrl = runtimeClient.resolveAsset(model.edition.audio.url)
  const [audioState, setAudioState] = useState<AudioEngineState>(() =>
    engine?.getState() ?? IDLE_AUDIO_STATE,
  )
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<
    string | undefined
  >()

  useEffect(() => {
    if (!engine) {
      return
    }
    return engine.subscribe(setAudioState)
  }, [engine])

  useEffect(() => {
    if (!engine) {
      return
    }

    engine.loadSource(sourceUrl)
    return () => {
      if (engine.getState().sourceUrl === sourceUrl) {
        engine.pause()
      }
    }
  }, [engine, sourceUrl])

  const effectiveAudioState =
    audioState.sourceUrl === sourceUrl ? audioState : IDLE_AUDIO_STATE
  const resolution = useMemo(
    () => resolveTimeline(model.timeline, effectiveAudioState.currentTimeMs),
    [effectiveAudioState.currentTimeMs, model.timeline],
  )
  const selectOccurrence = useCallback(
    (assembledOccurrence: AssembledOccurrence): void => {
      setSelectedOccurrenceId(assembledOccurrence.occurrence.id)
      if (!engine) {
        return
      }

      const range = toOccurrencePlaybackRange(assembledOccurrence.occurrence)
      void engine.playRange(range, assembledOccurrence.occurrence.id).catch(() => {
        // The Engine publishes a recoverable error state for the UI.
      })
    },
    [engine],
  )

  return {
    engine,
    audioState: effectiveAudioState,
    resolution,
    selectedOccurrenceId,
    selectOccurrence,
  }
}
