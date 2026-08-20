import type {
  AudioEngineState,
  BoundedPlaybackCompletion,
} from '../audio/audio-engine'
import type { ResolvedPracticeRange } from './practice-scope'

export type PracticeRepeatMode = 1 | 3 | 'infinite'

export type PracticePlaybackStatus =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'error'

export interface PracticePlaybackTarget {
  range: ResolvedPracticeRange
  activeOccurrenceId?: string
}

export interface PracticePlaybackSessionState {
  status: PracticePlaybackStatus
  target?: PracticePlaybackTarget
  repeatMode?: PracticeRepeatMode
  completedRepetitions: number
  currentRepetition?: number
  resumeAtMs?: number
  error?: Error
}

export interface PracticePlaybackEngine {
  getState(): AudioEngineState
  pause(): void
  playRangeUntilComplete(
    range: ResolvedPracticeRange,
    activeOccurrenceId?: string,
  ): Promise<BoundedPlaybackCompletion>
}

export type PracticePlaybackListener = (
  state: PracticePlaybackSessionState,
) => void

interface ActivePracticePlayback {
  generation: number
  target: PracticePlaybackTarget
  repeatMode: PracticeRepeatMode
  completedRepetitions: number
  operationId?: number
  pauseRequested: boolean
  resumeAtMs?: number
}

const IDLE_STATE: PracticePlaybackSessionState = {
  status: 'idle',
  completedRepetitions: 0,
}

export class PracticePlaybackSession {
  private state: PracticePlaybackSessionState = IDLE_STATE
  private readonly listeners = new Set<PracticePlaybackListener>()
  private activePlayback?: ActivePracticePlayback
  private nextGeneration = 0
  private nextOperationId = 0
  private disposed = false

  private readonly engine: PracticePlaybackEngine

  constructor(engine: PracticePlaybackEngine) {
    this.engine = engine
  }

  getState(): PracticePlaybackSessionState {
    return cloneSessionState(this.state)
  }

  subscribe(listener: PracticePlaybackListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  start(
    target: PracticePlaybackTarget,
    repeatMode: PracticeRepeatMode = 1,
  ): void {
    this.assertUsable()
    this.cancelActivePlayback()

    const playback: ActivePracticePlayback = {
      generation: ++this.nextGeneration,
      target: cloneTarget(target),
      repeatMode,
      completedRepetitions: 0,
      pauseRequested: false,
    }
    this.activePlayback = playback
    this.setState({
      status: 'playing',
      target: playback.target,
      repeatMode,
      completedRepetitions: 0,
      currentRepetition: 1,
      resumeAtMs: undefined,
      error: undefined,
    })
    this.playCurrentRepetition(playback, playback.target.range.startMs)
  }

  pause(): void {
    if (this.disposed || this.state.status !== 'playing') {
      return
    }

    const playback = this.activePlayback
    if (!playback) {
      return
    }

    const currentTimeMs = this.engine.getState().currentTimeMs
    playback.pauseRequested = true
    playback.resumeAtMs = isResumablePosition(
      playback.target.range,
      currentTimeMs,
    )
      ? currentTimeMs
      : undefined
    this.setState({
      status: 'paused',
      resumeAtMs: playback.resumeAtMs,
    })
    this.engine.pause()
  }

  resume(): void {
    if (this.disposed || this.state.status !== 'paused') {
      return
    }

    const playback = this.activePlayback
    if (!playback) {
      return
    }

    const resumeAtMs = playback.resumeAtMs ?? playback.target.range.startMs
    playback.pauseRequested = false
    playback.resumeAtMs = undefined
    this.setState({
      status: 'playing',
      resumeAtMs: undefined,
      error: undefined,
    })
    this.playCurrentRepetition(playback, resumeAtMs)
  }

  cancel(): void {
    if (this.disposed) {
      return
    }
    this.cancelActivePlayback()
  }

  stop(): void {
    this.cancel()
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.nextGeneration += 1
    this.activePlayback = undefined
    try {
      this.engine.pause()
    } catch {
      // Disposal should not be blocked by an already disposed Engine.
    }
    this.listeners.clear()
  }

  private playCurrentRepetition(
    playback: ActivePracticePlayback,
    startMs: number,
  ): void {
    const operationId = ++this.nextOperationId
    playback.operationId = operationId
    const range = {
      ...playback.target.range,
      startMs,
    }

    let completion: Promise<BoundedPlaybackCompletion>
    try {
      completion = this.engine.playRangeUntilComplete(
        range,
        playback.target.activeOccurrenceId,
      )
    } catch (error) {
      this.handleError(playback, operationId, toError(error))
      return
    }

    void completion.then(
      (result) => this.handleCompletion(playback, operationId, result),
      (error: unknown) => this.handleError(playback, operationId, toError(error)),
    )
  }

  private handleCompletion(
    playback: ActivePracticePlayback,
    operationId: number,
    completion: BoundedPlaybackCompletion,
  ): void {
    if (!this.isCurrentOperation(playback, operationId)) {
      return
    }

    if (completion.status === 'cancelled') {
      if (playback.pauseRequested) {
        return
      }
      this.finishCancelled(playback)
      return
    }

    if (completion.status === 'errored') {
      this.handleError(playback, operationId, completion.error)
      return
    }

    playback.completedRepetitions += 1
    if (
      playback.repeatMode !== 'infinite' &&
      playback.completedRepetitions >= playback.repeatMode
    ) {
      this.activePlayback = undefined
      this.setState({
        status: 'completed',
        completedRepetitions: playback.completedRepetitions,
        currentRepetition: undefined,
        resumeAtMs: undefined,
      })
      return
    }

    playback.operationId = undefined
    this.setState({
      status: 'playing',
      completedRepetitions: playback.completedRepetitions,
      currentRepetition: playback.completedRepetitions + 1,
      resumeAtMs: undefined,
      error: undefined,
    })
    this.playCurrentRepetition(playback, playback.target.range.startMs)
  }

  private handleError(
    playback: ActivePracticePlayback,
    operationId: number,
    error: Error,
  ): void {
    if (!this.isCurrentOperation(playback, operationId)) {
      return
    }

    this.activePlayback = undefined
    this.setState({
      status: 'error',
      completedRepetitions: playback.completedRepetitions,
      currentRepetition: undefined,
      resumeAtMs: undefined,
      error,
    })
  }

  private finishCancelled(playback: ActivePracticePlayback): void {
    if (this.activePlayback !== playback) {
      return
    }

    this.activePlayback = undefined
    this.setState({
      ...IDLE_STATE,
      completedRepetitions: playback.completedRepetitions,
    })
  }

  private cancelActivePlayback(): void {
    const playback = this.activePlayback
    this.nextGeneration += 1
    this.activePlayback = undefined
    if (playback) {
      try {
        this.engine.pause()
      } catch {
        // A replacement or cancellation remains safe if the Engine is unavailable.
      }
    }
    this.setState(IDLE_STATE)
  }

  private isCurrentOperation(
    playback: ActivePracticePlayback,
    operationId: number,
  ): boolean {
    return (
      !this.disposed &&
      this.activePlayback === playback &&
      playback.generation === this.nextGeneration &&
      playback.operationId === operationId
    )
  }

  private setState(patch: Partial<PracticePlaybackSessionState>): void {
    if (this.disposed) {
      return
    }
    this.state = { ...this.state, ...patch }
    const nextState = this.getState()
    this.listeners.forEach((listener) => listener(nextState))
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new Error('practice playback session has been disposed')
    }
  }
}

export function isResumablePosition(
  range: Pick<ResolvedPracticeRange, 'startMs' | 'endMs'>,
  positionMs: number,
): boolean {
  return (
    Number.isFinite(positionMs) &&
    positionMs > range.startMs &&
    positionMs < range.endMs
  )
}

function cloneSessionState(
  state: PracticePlaybackSessionState,
): PracticePlaybackSessionState {
  return {
    ...state,
    target: state.target ? cloneTarget(state.target) : undefined,
  }
}

function cloneTarget(target: PracticePlaybackTarget): PracticePlaybackTarget {
  return {
    ...target,
    range: {
      ...target.range,
      occurrenceIds: [...target.range.occurrenceIds],
    },
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
