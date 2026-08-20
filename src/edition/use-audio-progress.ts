import { useEffect, useState } from 'react'
import type { AudioEngine, AudioEngineState, AudioStatus } from '../audio/audio-engine'

export interface AudioProgressSnapshot {
  status: AudioStatus
  currentTimeMs: number
  durationMs?: number
  playbackRate: number
}

const IDLE_PROGRESS: AudioProgressSnapshot = {
  status: 'idle',
  currentTimeMs: 0,
  playbackRate: 1,
}

export function useAudioProgress(
  engine: AudioEngine | null,
): AudioProgressSnapshot {
  const [progress, setProgress] = useState<AudioProgressSnapshot>(() =>
    toProgressSnapshot(engine?.getState()),
  )

  useEffect(() => {
    if (!engine) {
      return
    }

    return engine.subscribe((state) => {
      const nextProgress = toProgressSnapshot(state)
      setProgress((previous) =>
        sameProgress(previous, nextProgress) ? previous : nextProgress,
      )
    })
  }, [engine])

  return progress
}

function toProgressSnapshot(
  state: AudioEngineState | undefined,
): AudioProgressSnapshot {
  if (!state) {
    return IDLE_PROGRESS
  }
  return {
    status: state.status,
    currentTimeMs: state.currentTimeMs,
    durationMs: state.durationMs,
    playbackRate: state.playbackRate,
  }
}

function sameProgress(
  left: AudioProgressSnapshot,
  right: AudioProgressSnapshot,
): boolean {
  return (
    left.status === right.status &&
    left.currentTimeMs === right.currentTimeMs &&
    left.durationMs === right.durationMs &&
    left.playbackRate === right.playbackRate
  )
}
