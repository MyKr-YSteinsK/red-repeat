import type {
  AudioEngine,
  AudioEngineState,
  AudioRange,
} from '../audio/audio-engine'
import type { Occurrence } from '../library/schema'

export const RAMP_STAGE_RATES = [0.7, 0.85, 1] as const
export const RAMP_REPETITIONS_PER_STAGE = 2
export const RAMP_TOTAL_REPETITIONS =
  RAMP_STAGE_RATES.length * RAMP_REPETITIONS_PER_STAGE

export type ShadowPhase = 'source-before' | 'your-turn' | 'source-after'

export interface PracticeScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown
  clearTimeout(handle: unknown): void
  now(): number
}

export interface PracticeControllerOptions {
  scheduler?: PracticeScheduler
}

export interface RampPracticeState {
  kind: 'ramp'
  targetRange: AudioRange
  stageIndex: number
  repetitionIndex: number
  stageSpeed: number
  completedRepetitions: number
  totalRepetitions: number
  originalPlaybackRate: number
}

export interface ShadowPracticeState {
  kind: 'shadow'
  targetOccurrenceId: string
  phase: ShadowPhase
  silenceDurationMs: number
  silenceDeadlineMs?: number
  playbackRate: number
}

export type PracticeStrategyState =
  | { kind: 'idle' }
  | RampPracticeState
  | ShadowPracticeState

export type PracticeControllerListener = (
  state: PracticeStrategyState,
) => void

const IDLE_STATE: PracticeStrategyState = { kind: 'idle' }

export class PracticeController {
  private state: PracticeStrategyState = IDLE_STATE
  private readonly listeners = new Set<PracticeControllerListener>()
  private readonly engine: AudioEngine
  private readonly scheduler: PracticeScheduler
  private readonly unsubscribeEngine: () => void
  private activeSourceUrl: string | undefined
  private hasActiveStrategy = false
  private generation = 0
  private silenceTimer: unknown
  private disposed = false

  constructor(
    engine: AudioEngine,
    options: PracticeControllerOptions = {},
  ) {
    this.engine = engine
    this.scheduler = options.scheduler ?? createDefaultPracticeScheduler()
    this.unsubscribeEngine = engine.subscribe((nextState) => {
      this.handleEngineState(nextState)
    })
  }

  getState(): PracticeStrategyState {
    return clonePracticeState(this.state)
  }

  subscribe(listener: PracticeControllerListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  startRamp(range: AudioRange): boolean {
    if (!isValidAudioRange(range) || this.disposed) {
      return false
    }

    this.beginStrategy()
    this.setState({
      kind: 'ramp',
      targetRange: { ...range },
      stageIndex: 0,
      repetitionIndex: 0,
      stageSpeed: RAMP_STAGE_RATES[0],
      completedRepetitions: 0,
      totalRepetitions: RAMP_TOTAL_REPETITIONS,
      originalPlaybackRate: this.engine.getState().playbackRate,
    })
    return true
  }

  startShadow(occurrence: Occurrence): boolean {
    if (!isValidShadowOccurrence(occurrence) || this.disposed) {
      return false
    }

    this.beginStrategy()
    this.setState({
      kind: 'shadow',
      targetOccurrenceId: occurrence.id,
      phase: 'source-before',
      silenceDurationMs: calculateShadowSilenceMs(occurrence),
      playbackRate: this.engine.getState().playbackRate,
    })
    return true
  }

  cancel(): void {
    if (!this.hasActiveStrategy) {
      this.clearSilenceTimer()
      return
    }

    const previousState = this.state
    this.generation += 1
    this.hasActiveStrategy = false
    this.activeSourceUrl = undefined
    this.clearSilenceTimer()

    if (previousState.kind === 'ramp') {
      try {
        this.engine.setPlaybackRate(previousState.originalPlaybackRate)
      } catch {
        // The owning consumer may already have disposed the Engine.
      }
    }

    this.setState(IDLE_STATE)
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.cancel()
    this.disposed = true
    this.unsubscribeEngine()
    this.listeners.clear()
  }

  private beginStrategy(): number {
    this.cancel()
    this.generation += 1
    this.hasActiveStrategy = true
    this.activeSourceUrl = this.engine.getState().sourceUrl
    return this.generation
  }

  private handleEngineState(nextState: AudioEngineState): void {
    if (!this.hasActiveStrategy) {
      return
    }

    if (
      nextState.status === 'error' ||
      nextState.sourceUrl !== this.activeSourceUrl
    ) {
      this.cancel()
    }
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer === undefined) {
      return
    }

    this.scheduler.clearTimeout(this.silenceTimer)
    this.silenceTimer = undefined
  }

  private setState(nextState: PracticeStrategyState): void {
    this.state = nextState
    const snapshot = this.getState()
    this.listeners.forEach((listener) => listener(snapshot))
  }
}

export function calculateShadowSilenceMs(occurrence: Occurrence): number {
  const actualDurationMs = occurrence.endMs - occurrence.startMs
  return Math.min(8000, Math.max(2000, Math.round(actualDurationMs * 1.15)))
}

function isValidAudioRange(range: AudioRange): boolean {
  return (
    Number.isFinite(range.startMs) &&
    Number.isFinite(range.endMs) &&
    range.startMs >= 0 &&
    range.startMs < range.endMs
  )
}

function isValidShadowOccurrence(occurrence: Occurrence): boolean {
  return (
    Number.isFinite(occurrence.startMs) &&
    Number.isFinite(occurrence.endMs) &&
    Number.isFinite(occurrence.playStartMs) &&
    Number.isFinite(occurrence.playEndMs) &&
    occurrence.startMs >= 0 &&
    occurrence.startMs < occurrence.endMs &&
    occurrence.playStartMs >= 0 &&
    occurrence.playStartMs < occurrence.playEndMs
  )
}

function clonePracticeState(
  state: PracticeStrategyState,
): PracticeStrategyState {
  if (state.kind === 'idle') {
    return IDLE_STATE
  }

  if (state.kind === 'ramp') {
    return {
      ...state,
      targetRange: { ...state.targetRange },
    }
  }

  return { ...state }
}

function createDefaultPracticeScheduler(): PracticeScheduler {
  return {
    setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearTimeout: (handle) => globalThis.clearTimeout(handle as number),
    now: () => Date.now(),
  }
}
