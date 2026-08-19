export type AudioStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'seeking'
  | 'playing'
  | 'paused'
  | 'error'

export type AudioIntent = 'continuous' | 'range' | 'loop'

export interface AudioRange {
  startMs: number
  endMs: number
}

export interface AudioEngineState {
  status: AudioStatus
  intent: AudioIntent
  playbackRate: number
  currentTimeMs: number
  sourceUrl?: string
  durationMs?: number
  activeOccurrenceId?: string
  activeRange?: AudioRange
  error?: Error
}

export type BoundedPlaybackCompletion =
  | { status: 'completed' }
  | { status: 'cancelled' }
  | { status: 'errored'; error: Error }

export type AudioMediaEvent =
  | 'loadedmetadata'
  | 'durationchange'
  | 'ended'
  | 'error'
  | 'pause'

export interface AudioMediaAdapter {
  src: string
  currentTime: number
  duration: number
  paused: boolean
  playbackRate: number
  preservesPitch?: boolean
  load(): void
  play(): Promise<void>
  pause(): void
  addEventListener(event: AudioMediaEvent, listener: () => void): void
  removeEventListener(event: AudioMediaEvent, listener: () => void): void
}

export type AudioEngineListener = (state: AudioEngineState) => void

export interface FrameScheduler {
  requestFrame(callback: () => void): unknown
  cancelFrame(handle: unknown): void
}

export interface AudioEngineOptions {
  frameScheduler?: FrameScheduler
}

export const MIN_PLAYBACK_RATE = 0.5
export const MAX_PLAYBACK_RATE = 1.25
export const PLAYBACK_RATE_STEP = 0.05
export const DEFAULT_PLAYBACK_RATE = 1

export class AudioEngine {
  private state: AudioEngineState = {
    status: 'idle',
    intent: 'continuous',
    playbackRate: DEFAULT_PLAYBACK_RATE,
    currentTimeMs: 0,
  }

  private readonly listeners = new Set<AudioEngineListener>()
  private readonly frameScheduler: FrameScheduler
  private operationGeneration = 0
  private disposed = false
  private playbackObservationHandle: unknown
  private pendingInternalPauseEvents = 0
  private pendingBoundedCompletion?: {
    resolve: (completion: BoundedPlaybackCompletion) => void
  }

  private readonly onLoadedMetadata = (): void => {
    this.refreshDuration()
    if (this.state.status === 'loading' || this.state.status === 'seeking') {
      this.setState({ status: 'ready' })
    }
  }

  private readonly onDurationChange = (): void => {
    this.refreshDuration()
  }

  private readonly onEnded = (): void => {
    if (this.state.intent === 'loop' && this.state.activeRange) {
      this.restartLoop(this.operationGeneration, this.state.activeRange)
      return
    }

    this.cancelPlaybackObservation()
    this.setState({ status: 'paused', currentTimeMs: this.readCurrentTimeMs() })
  }

  private readonly onError = (): void => {
    const error = new Error('audio media element reported an error')
    this.operationGeneration += 1
    this.cancelPlaybackObservation()
    this.settleBoundedCompletion({ status: 'errored', error })
    this.setState({
      status: 'error',
      error,
    })
  }

  private readonly onPause = (): void => {
    if (this.disposed) {
      return
    }

    if (this.pendingInternalPauseEvents > 0) {
      this.pendingInternalPauseEvents -= 1
      return
    }

    this.operationGeneration += 1
    this.cancelPlaybackObservation()
    this.settleBoundedCompletion({ status: 'cancelled' })
    this.setState({
      status: this.state.sourceUrl ? 'paused' : 'idle',
      intent: 'continuous',
      currentTimeMs: this.readCurrentTimeMs(),
      activeOccurrenceId: undefined,
      activeRange: undefined,
    })
  }

  private readonly media: AudioMediaAdapter

  constructor(media: AudioMediaAdapter, options: AudioEngineOptions = {}) {
    this.media = media
    this.frameScheduler = options.frameScheduler ?? createDefaultFrameScheduler()
    media.addEventListener('loadedmetadata', this.onLoadedMetadata)
    media.addEventListener('durationchange', this.onDurationChange)
    media.addEventListener('ended', this.onEnded)
    media.addEventListener('error', this.onError)
    media.addEventListener('pause', this.onPause)
    this.applyPlaybackRate()
    this.applyPitchPreservation()
  }

  getState(): AudioEngineState {
    return {
      ...this.state,
      activeRange: this.state.activeRange
        ? { ...this.state.activeRange }
        : undefined,
    }
  }

  subscribe(listener: AudioEngineListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  loadSource(sourceUrl: string): void {
    this.assertUsable()
    if (sourceUrl.trim().length === 0) {
      throw new Error('audio source URL must not be empty')
    }

    this.beginOperation(true)
    this.setState({
      status: 'loading',
      intent: 'continuous',
      sourceUrl,
      durationMs: undefined,
      currentTimeMs: 0,
      activeOccurrenceId: undefined,
      activeRange: undefined,
      error: undefined,
    })
    this.media.src = sourceUrl
    this.media.currentTime = 0
    this.applyPlaybackRate()
    this.media.load()
  }

  playContinuous(): Promise<void> {
    this.assertUsable()
    this.assertSourceLoaded()
    const generation = this.beginOperation(true)
    this.setState({
      status: 'loading',
      intent: 'continuous',
      activeOccurrenceId: undefined,
      activeRange: undefined,
      error: undefined,
    })

    return Promise.resolve()
      .then(() => this.media.play())
      .then(() => {
        if (this.isCurrentOperation(generation)) {
          this.setState({
            status: 'playing',
            currentTimeMs: this.readCurrentTimeMs(),
          })
          this.startPlaybackObservation(generation)
        }
      })
      .catch((error: unknown) => {
        if (this.isCurrentOperation(generation)) {
          const normalizedError = toError(error)
          this.setState({ status: 'error', error: normalizedError })
        }
        throw error
      })
  }

  pause(): void {
    this.assertUsable()
    this.beginOperation(true)
    this.setState({
      status: this.state.sourceUrl ? 'paused' : 'idle',
      intent: 'continuous',
      currentTimeMs: this.readCurrentTimeMs(),
      activeOccurrenceId: undefined,
      activeRange: undefined,
      error: undefined,
    })
  }

  async seek(timeMs: number): Promise<void> {
    this.assertUsable()
    this.assertSourceLoaded()
    assertNonNegativeFinite(timeMs, 'seek time')
    const generation = this.beginOperation(true)
    this.setState({
      status: 'seeking',
      intent: 'continuous',
      activeOccurrenceId: undefined,
      activeRange: undefined,
      error: undefined,
    })
    this.media.currentTime = timeMs / 1000
    await Promise.resolve()

    if (this.isCurrentOperation(generation)) {
      this.setState({
        status: 'paused',
        currentTimeMs: this.readCurrentTimeMs(),
      })
    }
  }

  async playRange(
    range: AudioRange,
    activeOccurrenceId?: string,
  ): Promise<void> {
    return this.playBoundedRange(range, 'range', activeOccurrenceId, false)
  }

  async playLoop(
    range: AudioRange,
    activeOccurrenceId?: string,
  ): Promise<void> {
    return this.playBoundedRange(range, 'loop', activeOccurrenceId, true)
  }

  async playRangeUntilComplete(
    range: AudioRange,
    activeOccurrenceId?: string,
  ): Promise<BoundedPlaybackCompletion> {
    let resolveCompletion!: (
      completion: BoundedPlaybackCompletion,
    ) => void
    const completion = new Promise<BoundedPlaybackCompletion>((resolve) => {
      resolveCompletion = resolve
    })

    try {
      await this.playBoundedRange(
        range,
        'range',
        activeOccurrenceId,
        false,
        { resolve: resolveCompletion },
      )
    } catch (error) {
      resolveCompletion({ status: 'errored', error: toError(error) })
    }

    return completion
  }

  private async playBoundedRange(
    range: AudioRange,
    intent: 'range' | 'loop',
    activeOccurrenceId: string | undefined,
    repeat: boolean,
    boundedCompletion?: {
      resolve: (completion: BoundedPlaybackCompletion) => void
    },
  ): Promise<void> {
    this.assertUsable()
    this.assertSourceLoaded()
    assertValidRange(range)
    const generation = this.beginOperation(true)
    this.pendingBoundedCompletion = boundedCompletion
    this.setState({
      status: 'seeking',
      intent,
      activeOccurrenceId,
      activeRange: { ...range },
      error: undefined,
    })
    this.media.currentTime = range.startMs / 1000
    await Promise.resolve()

    if (!this.isCurrentOperation(generation)) {
      return
    }

    try {
      await this.media.play()
      if (!this.isCurrentOperation(generation)) {
        return
      }

      this.setState({
        status: 'playing',
        currentTimeMs: this.readCurrentTimeMs(),
      })
      this.startPlaybackObservation(generation, range, repeat)
    } catch (error) {
      if (this.isCurrentOperation(generation)) {
        this.cancelPlaybackObservation()
        const normalizedError = toError(error)
        this.settleBoundedCompletion({
          status: 'errored',
          error: normalizedError,
        })
        this.setState({ status: 'error', error: normalizedError })
      }
      throw error
    }
  }

  setPlaybackRate(playbackRate: number): number {
    this.assertUsable()
    const normalizedRate = normalizePlaybackRate(playbackRate)
    this.state.playbackRate = normalizedRate
    this.applyPlaybackRate()
    this.emit()
    return normalizedRate
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.operationGeneration += 1
    this.cancelPlaybackObservation()
    this.settleBoundedCompletion({ status: 'cancelled' })
    this.requestInternalPause()
    this.media.removeEventListener('loadedmetadata', this.onLoadedMetadata)
    this.media.removeEventListener('durationchange', this.onDurationChange)
    this.media.removeEventListener('ended', this.onEnded)
    this.media.removeEventListener('error', this.onError)
    this.media.removeEventListener('pause', this.onPause)
    this.listeners.clear()
  }

  private beginOperation(pauseMedia = false): number {
    this.operationGeneration += 1
    this.cancelPlaybackObservation()
    this.settleBoundedCompletion({ status: 'cancelled' })
    if (pauseMedia) {
      this.requestInternalPause()
    }
    return this.operationGeneration
  }

  private isCurrentOperation(generation: number): boolean {
    return !this.disposed && generation === this.operationGeneration
  }

  private refreshDuration(): void {
    const durationMs = Number.isFinite(this.media.duration)
      ? Math.max(0, Math.round(this.media.duration * 1000))
      : undefined
    this.setState({ durationMs, currentTimeMs: this.readCurrentTimeMs() })
  }

  private readCurrentTimeMs(): number {
    return Math.max(0, Math.round(this.media.currentTime * 1000))
  }

  private applyPlaybackRate(): void {
    this.media.playbackRate = this.state.playbackRate
  }

  private applyPitchPreservation(): void {
    if (this.media.preservesPitch !== undefined) {
      this.media.preservesPitch = true
    }
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new Error('audio engine has been disposed')
    }
  }

  private assertSourceLoaded(): void {
    if (!this.state.sourceUrl) {
      throw new Error('load an audio source before issuing playback commands')
    }
  }

  private setState(patch: Partial<AudioEngineState>): void {
    this.state = { ...this.state, ...patch }
    this.emit()
  }

  private emit(): void {
    const nextState = this.getState()
    this.listeners.forEach((listener) => listener(nextState))
  }

  private startPlaybackObservation(
    generation: number,
    range?: AudioRange,
    repeat = false,
  ): void {
    this.cancelPlaybackObservation()
    this.playbackObservationHandle = this.frameScheduler.requestFrame(() => {
      this.playbackObservationHandle = undefined

      if (!this.isCurrentOperation(generation)) {
        return
      }

      const currentTimeMs = this.readCurrentTimeMs()
      if (range && currentTimeMs >= range.endMs) {
        if (repeat) {
          this.restartLoop(generation, range)
        } else {
          this.cancelPlaybackObservation()
          this.requestInternalPause()
          if (this.isCurrentOperation(generation)) {
            this.setState({ status: 'paused', currentTimeMs })
            this.settleBoundedCompletion({ status: 'completed' })
          }
        }
        return
      }

      this.setState({ currentTimeMs })
      this.startPlaybackObservation(generation, range, repeat)
    })
  }

  private restartLoop(generation: number, range: AudioRange): void {
    if (!this.isCurrentOperation(generation)) {
      return
    }

    this.requestInternalPause()
    this.setState({
      status: 'seeking',
      currentTimeMs: range.startMs,
    })
    this.media.currentTime = range.startMs / 1000

    void Promise.resolve()
      .then(() => this.media.play())
      .then(() => {
        if (!this.isCurrentOperation(generation)) {
          return
        }
        this.setState({
          status: 'playing',
          currentTimeMs: this.readCurrentTimeMs(),
        })
        this.startPlaybackObservation(generation, range, true)
      })
      .catch((error: unknown) => {
        if (this.isCurrentOperation(generation)) {
          this.cancelPlaybackObservation()
          this.setState({ status: 'error', error: toError(error) })
        }
      })
  }

  private requestInternalPause(): void {
    if (this.state.status === 'playing' || !this.media.paused) {
      this.pendingInternalPauseEvents += 1
      this.media.pause()
    }
  }

  private cancelPlaybackObservation(): void {
    if (this.playbackObservationHandle !== undefined) {
      this.frameScheduler.cancelFrame(this.playbackObservationHandle)
      this.playbackObservationHandle = undefined
    }
  }

  private settleBoundedCompletion(
    completion: BoundedPlaybackCompletion,
  ): void {
    const pendingCompletion = this.pendingBoundedCompletion
    if (!pendingCompletion) {
      return
    }

    this.pendingBoundedCompletion = undefined
    pendingCompletion.resolve(completion)
  }
}

export function createAudioEngine(
  media: AudioMediaAdapter,
  options: AudioEngineOptions = {},
): AudioEngine {
  return new AudioEngine(media, options)
}

let globalAudioEngine: AudioEngine | undefined

export function getAudioEngine(media?: AudioMediaAdapter): AudioEngine {
  if (!globalAudioEngine) {
    globalAudioEngine = createAudioEngine(
      media ?? createBrowserAudioMediaAdapter(),
    )
  }
  return globalAudioEngine
}

export function resetAudioEngineForTests(): void {
  globalAudioEngine?.dispose()
  globalAudioEngine = undefined
}

export function normalizePlaybackRate(playbackRate: number): number {
  if (!Number.isFinite(playbackRate)) {
    throw new RangeError('playback rate must be finite')
  }

  const steps = Math.round(
    (playbackRate - MIN_PLAYBACK_RATE) / PLAYBACK_RATE_STEP,
  )
  const normalizedRate = Number(
    (MIN_PLAYBACK_RATE + steps * PLAYBACK_RATE_STEP).toFixed(2),
  )

  if (
    normalizedRate < MIN_PLAYBACK_RATE ||
    normalizedRate > MAX_PLAYBACK_RATE ||
    Math.abs(normalizedRate - playbackRate) > 1e-9
  ) {
    throw new RangeError(
      `playback rate must be between ${MIN_PLAYBACK_RATE} and ${MAX_PLAYBACK_RATE} in ${PLAYBACK_RATE_STEP} steps`,
    )
  }

  return normalizedRate
}

function createBrowserAudioMediaAdapter(): AudioMediaAdapter {
  if (typeof Audio === 'undefined') {
    throw new Error('Audio Engine requires a browser Audio implementation')
  }

  const element = new Audio()
  return {
    get src() {
      return element.src
    },
    set src(value: string) {
      element.src = value
    },
    get currentTime() {
      return element.currentTime
    },
    set currentTime(value: number) {
      element.currentTime = value
    },
    get duration() {
      return element.duration
    },
    get paused() {
      return element.paused
    },
    get playbackRate() {
      return element.playbackRate
    },
    set playbackRate(value: number) {
      element.playbackRate = value
    },
    get preservesPitch() {
      return element.preservesPitch
    },
    set preservesPitch(value: boolean | undefined) {
      if (value !== undefined) {
        element.preservesPitch = value
      }
    },
    load: () => element.load(),
    play: () => element.play(),
    pause: () => element.pause(),
    addEventListener: (event, listener) => {
      element.addEventListener(event, listener)
    },
    removeEventListener: (event, listener) => {
      element.removeEventListener(event, listener)
    },
  }
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`)
  }
}

function assertValidRange(range: AudioRange): void {
  assertNonNegativeFinite(range.startMs, 'range start')
  assertNonNegativeFinite(range.endMs, 'range end')
  if (range.startMs >= range.endMs) {
    throw new RangeError('audio range must satisfy startMs < endMs')
  }
}

function createDefaultFrameScheduler(): FrameScheduler {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return {
      requestFrame: (callback) => globalThis.requestAnimationFrame(callback),
      cancelFrame: (handle) =>
        globalThis.cancelAnimationFrame(handle as number),
    }
  }

  return {
    requestFrame: (callback) => setTimeout(callback, 16),
    cancelFrame: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
