import { useEffect, useState } from 'react'
import type {
  AudioEngine,
  AudioEngineState,
} from '../audio/audio-engine'
import { getAudioEngine } from '../audio/audio-engine'
import type { TimelineDocument } from '../library/schema'
import { resolveTimeline, type TimelineResolution } from '../timeline/resolver'

const IDLE_AUDIO_STATE: AudioEngineState = {
  status: 'idle',
  intent: 'continuous',
  playbackRate: 1,
  currentTimeMs: 0,
}

export interface TimelineDebuggerPlayback {
  engine: AudioEngine | null
  audioState: AudioEngineState
  resolution: TimelineResolution
}

export function useTimelineDebuggerPlayback(
  timeline: TimelineDocument,
  sourceUrl: string,
  providedEngine?: AudioEngine,
): TimelineDebuggerPlayback {
  const engine =
    providedEngine ?? (typeof Audio === 'undefined' ? null : getAudioEngine())
  const [audioState, setAudioState] = useState<AudioEngineState>(
    () => engine?.getState() ?? IDLE_AUDIO_STATE,
  )

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

    if (engine.getState().sourceUrl !== sourceUrl) {
      engine.loadSource(sourceUrl)
    }

    return () => {
      if (engine.getState().sourceUrl === sourceUrl) {
        engine.pause()
      }
    }
  }, [engine, sourceUrl])

  const effectiveAudioState =
    audioState.sourceUrl === sourceUrl ? audioState : IDLE_AUDIO_STATE

  return {
    engine,
    audioState: effectiveAudioState,
    resolution: resolveTimeline(
      timeline,
      effectiveAudioState.currentTimeMs,
    ),
  }
}
