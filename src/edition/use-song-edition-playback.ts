import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AudioEngine,
  AudioEngineState,
} from '../audio/audio-engine'
import { getAudioEngine } from '../audio/audio-engine'
import { resolveTimeline, type TimelineResolution } from '../timeline/resolver'
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
  playOccurrenceContinuously?: (
    occurrence: AssembledOccurrence,
    startMs?: number,
  ) => void
}

interface DerivedPlaybackState {
  audioState: AudioEngineState
  resolution: TimelineResolution
}

export function useSongEditionPlayback(
  model: AssembledSongEdition,
  runtimeClient: RuntimeClient,
  providedEngine?: AudioEngine,
): SongEditionPlaybackSnapshot {
  const engine =
    providedEngine ?? (typeof Audio === 'undefined' ? null : getAudioEngine())
  const sourceUrl = runtimeClient.resolveAsset(model.edition.audio.url)
  const initialDerivedState = derivePlaybackState(
    engine?.getState() ?? IDLE_AUDIO_STATE,
    sourceUrl,
    model.timeline,
  )
  const derivedStateRef = useRef(initialDerivedState)
  const [derivedState, setDerivedState] = useState(initialDerivedState)
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<
    string | undefined
  >()

  useEffect(() => {
    if (!engine) {
      return
    }

    return engine.subscribe((nextAudioState) => {
      const nextDerivedState = derivePlaybackState(
        nextAudioState,
        sourceUrl,
        model.timeline,
      )
      const previousState = derivedStateRef.current
      if (!previousState) {
        derivedStateRef.current = nextDerivedState
        setDerivedState(nextDerivedState)
        return
      }

      const audioStateChanged = !sameAudioControlState(
        previousState.audioState,
        nextDerivedState.audioState,
      )
      const resolutionChanged = !sameTimelineSemantics(
        previousState.resolution,
        nextDerivedState.resolution,
      )

      if (!audioStateChanged && !resolutionChanged) {
        return
      }

      const nextState = {
        audioState: audioStateChanged
          ? nextDerivedState.audioState
          : previousState.audioState,
        resolution: resolutionChanged
          ? nextDerivedState.resolution
          : previousState.resolution,
      }
      derivedStateRef.current = nextState
      setDerivedState(nextState)
    })
  }, [engine, model.timeline, sourceUrl])

  useEffect(() => {
    if (!engine) {
      return
    }

    if (engine.getState().sourceUrl !== sourceUrl) {
      engine.loadSource(sourceUrl)
    }
    return () => {
      if (engine.getState().sourceUrl === sourceUrl) {
        engine.pause()
      }
    }
  }, [engine, sourceUrl])

  const selectOccurrence = useCallback(
    (assembledOccurrence: AssembledOccurrence): void => {
      setSelectedOccurrenceId(assembledOccurrence.occurrence.id)
      if (!engine) {
        return
      }

      const timing = model.timingProvider.getTiming(assembledOccurrence.occurrence)
      void engine
        .playRange(
          { startMs: timing.playStartMs, endMs: timing.playEndMs },
          assembledOccurrence.occurrence.id,
        )
        .catch(() => {
          // The Engine publishes a recoverable error state for the UI.
        })
    },
    [engine, model.timingProvider],
  )
  const playOccurrenceContinuously = useCallback(
    (
      assembledOccurrence: AssembledOccurrence,
      startMs = model.timingProvider.getTiming(assembledOccurrence.occurrence)
        .playStartMs,
    ): void => {
      setSelectedOccurrenceId(assembledOccurrence.occurrence.id)
      if (!engine) {
        return
      }

      void engine.playContinuousFrom(startMs).catch(() => {
        // The Engine publishes a recoverable error state for the UI.
      })
    },
    [engine, model.timingProvider],
  )

  return {
    engine,
    audioState: derivedState.audioState,
    resolution: derivedState.resolution,
    selectedOccurrenceId,
    selectOccurrence,
    playOccurrenceContinuously,
  }
}

function derivePlaybackState(
  audioState: AudioEngineState,
  sourceUrl: string,
  timeline: AssembledSongEdition['timeline'],
): DerivedPlaybackState {
  const effectiveAudioState =
    audioState.sourceUrl === sourceUrl ? audioState : IDLE_AUDIO_STATE

  return {
    audioState: effectiveAudioState,
    resolution: resolveTimeline(
      timeline,
      effectiveAudioState.currentTimeMs,
    ),
  }
}

function sameAudioControlState(
  left: AudioEngineState,
  right: AudioEngineState,
): boolean {
  return (
    left.status === right.status &&
    left.intent === right.intent &&
    left.playbackRate === right.playbackRate &&
    left.sourceUrl === right.sourceUrl &&
    left.durationMs === right.durationMs &&
    left.activeOccurrenceId === right.activeOccurrenceId &&
    sameRange(left.activeRange, right.activeRange) &&
    left.error === right.error
  )
}

function sameRange(
  left: AudioEngineState['activeRange'],
  right: AudioEngineState['activeRange'],
): boolean {
  return (
    left?.startMs === right?.startMs && left?.endMs === right?.endMs
  )
}

function sameTimelineSemantics(
  left: TimelineResolution,
  right: TimelineResolution,
): boolean {
  return (
    left.currentSection?.id === right.currentSection?.id &&
    left.primaryOccurrence?.id === right.primaryOccurrence?.id &&
    left.previousOccurrence?.id === right.previousOccurrence?.id &&
    left.nextOccurrence?.id === right.nextOccurrence?.id &&
    left.activeOccurrences.length === right.activeOccurrences.length &&
    left.activeOccurrences.every(
      (occurrence, index) => occurrence.id === right.activeOccurrences[index]?.id,
    )
  )
}
