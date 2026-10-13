import type { AudioEngine, AudioEngineState, AudioRange, BoundedPlaybackCompletion } from '../audio/audio-engine'

type Intent = 'continuous' | 'practice' | 'bounded' | 'preview' | 'paused'
interface PracticeOperation {
  range: AudioRange
  occurrenceId?: string
  rates: readonly number[]
  index: number
  restoreRate: number
}
interface ResumePoint {
  state: AudioEngineState
  intent: Intent
  practice?: PracticeOperation
}

const owners = new WeakMap<AudioEngine, SongPlaybackSession>()

/** Owns commands for one validated Edition, independently of its mounted mode. */
export class SongPlaybackSession {
  private active = false
  private generation = 0
  private intent: Intent = 'paused'
  private practice?: PracticeOperation
  private pausedPracticeTime?: number
  private preview?: { owner: object; resume: ResumePoint }
  readonly identity: string
  readonly sourceUrl: string
  readonly engine: AudioEngine
  private readonly initialRate: number

  constructor(
    identity: string,
    sourceUrl: string,
    engine: AudioEngine,
    initialRate = 1,
  ) {
    this.identity = identity
    this.sourceUrl = sourceUrl
    this.engine = engine
    this.initialRate = initialRate
  }

  activate(): void {
    if (this.isCurrent()) return
    const previous = owners.get(this.engine)
    previous?.close()
    owners.set(this.engine, this)
    this.active = true
    if (this.engine.getState().sourceUrl !== this.sourceUrl || (previous && previous.identity !== this.identity)) {
      this.engine.loadSource(this.sourceUrl)
    }
    this.engine.setPlaybackRate(this.initialRate)
  }

  close(): void {
    this.generation++
    this.preview = undefined
    this.practice = undefined
    this.pausedPracticeTime = undefined
    if (this.isCurrent()) this.engine.pause()
    this.active = false
    this.intent = 'paused'
  }

  getIntent(): Intent { return this.intent }
  canResumePractice(): boolean { return this.pausedPracticeTime !== undefined && this.practice !== undefined }
  cancelPractice(): void {
    if (!this.practice) return
    this.pause()
    this.practice = undefined
    this.pausedPracticeTime = undefined
  }

  pause(): void {
    if (!this.isCurrent()) return
    const state = this.engine.getState()
    this.generation++
    if (this.intent === 'practice' && this.practice) this.pausedPracticeTime = state.currentTimeMs
    else if (this.intent !== 'paused') { this.practice = undefined; this.pausedPracticeTime = undefined }
    this.preview = undefined
    this.intent = 'paused'
    this.engine.pause()
    if (this.practice) this.engine.setPlaybackRate(this.practice.restoreRate)
  }

  playContinuous(startMs?: number): Promise<void> {
    if (!this.isCurrent()) return Promise.resolve()
    this.begin('continuous')
    return startMs === undefined ? this.engine.playContinuous() : this.engine.playContinuousFrom(startMs)
  }

  seek(timeMs: number): Promise<void> {
    if (!this.isCurrent()) return Promise.resolve()
    // Seeking is a new explicit intent, never a preview recovery trigger.
    this.begin(this.engine.getState().status === 'playing' ? 'continuous' : 'paused')
    return this.engine.seek(timeMs)
  }

  setRate(rate: number): void {
    if (!this.isCurrent()) return
    if (this.preview) this.cancelPreview()
    if (this.practice) {
      this.practice.restoreRate = rate
      if (this.practice.rates.length > 1 && this.intent === 'practice') return
      this.practice.rates = [rate]
      this.practice.index = 0
    }
    this.engine.setPlaybackRate(rate)
  }

  playBounded(range: AudioRange, occurrenceId?: string): Promise<BoundedPlaybackCompletion> {
    if (!this.isCurrent()) return Promise.resolve({ status: 'cancelled' })
    this.begin('bounded')
    return this.engine.playRangeUntilComplete(range, occurrenceId)
  }

  playPractice(range: AudioRange, occurrenceId: string, rates: readonly number[], restoreRate: number): Promise<BoundedPlaybackCompletion> {
    if (!this.isCurrent()) return Promise.resolve({ status: 'cancelled' })
    const token = this.begin('practice')
    this.practice = { range: { ...range }, occurrenceId, rates: [...rates], index: 0, restoreRate }
    return this.runPractice(token)
  }

  resumePractice(): Promise<BoundedPlaybackCompletion> {
    if (!this.isCurrent() || !this.practice || this.pausedPracticeTime === undefined) return Promise.resolve({ status: 'cancelled' })
    const start = this.pausedPracticeTime
    this.pausedPracticeTime = undefined
    this.intent = 'practice'
    return this.runPractice(++this.generation, start)
  }

  async playPreview(range: AudioRange, occurrenceId: string, owner: object): Promise<BoundedPlaybackCompletion> {
    if (!this.isCurrent()) return { status: 'cancelled' }
    // Replacing a preview inherits its original context, not the interrupted preview.
    const resume = this.preview?.resume ?? {
      state: this.engine.getState(), intent: this.intent,
      practice: this.practice ? { ...this.practice, range: { ...this.practice.range }, rates: [...this.practice.rates] } : undefined,
    }
    const token = this.begin('preview')
    this.preview = { owner, resume }
    const completion = await this.engine.playRangeUntilComplete(range, occurrenceId)
    if (!this.isCurrent(token)) return { status: 'cancelled' }
    this.preview = undefined
    if (completion.status !== 'completed') {
      this.intent = 'paused'
      return completion
    }
    this.engine.setPlaybackRate(resume.state.playbackRate)
    this.practice = resume.practice
    const wasPlaying = resume.state.status === 'playing' ||
      (resume.intent !== 'paused' && ['loading', 'seeking'].includes(resume.state.status))
    if (!wasPlaying) {
      this.intent = 'paused'
      await this.engine.seek(resume.state.currentTimeMs)
      if (this.isCurrent(token) && this.practice) this.pausedPracticeTime = resume.state.currentTimeMs
      return this.isCurrent(token) ? completion : { status: 'cancelled' }
    }
    this.intent = resume.intent
    try {
      if (resume.practice) {
        void this.runPractice(token, resume.state.currentTimeMs)
      } else if (resume.state.activeRange && resume.state.currentTimeMs < resume.state.activeRange.endMs) {
        void this.engine.playRangeUntilComplete({ startMs: Math.max(resume.state.activeRange.startMs, resume.state.currentTimeMs), endMs: resume.state.activeRange.endMs }, resume.state.activeOccurrenceId)
      } else {
        await this.engine.playContinuousFrom(resume.state.currentTimeMs)
      }
    } catch (error) {
      return { status: 'errored', error: error instanceof Error ? error : new Error(String(error)) }
    }
    return this.isCurrent(token) ? completion : { status: 'cancelled' }
  }

  cancelPreview(owner?: object): void {
    if (!this.preview || (owner && this.preview.owner !== owner)) return
    this.pause()
  }

  invalidateTiming(): void {
    if (this.intent === 'preview' || this.intent === 'practice' || this.intent === 'bounded' || this.practice) {
      this.pause()
      this.practice = undefined
      this.pausedPracticeTime = undefined
    }
  }

  private begin(intent: Intent): number {
    this.intent = intent
    this.preview = undefined
    this.practice = undefined
    this.pausedPracticeTime = undefined
    return ++this.generation
  }

  private isCurrent(token = this.generation): boolean {
    return this.active && owners.get(this.engine) === this && token === this.generation && this.engine.getState().sourceUrl === this.sourceUrl
  }

  private async runPractice(token: number, resumedStart?: number): Promise<BoundedPlaybackCompletion> {
    const operation = this.practice
    if (!operation) return { status: 'cancelled' }
    for (; operation.index < operation.rates.length; operation.index++) {
      if (!this.isCurrent(token)) return { status: 'cancelled' }
      this.engine.setPlaybackRate(operation.rates[operation.index])
      const range = { ...operation.range, startMs: resumedStart === undefined ? operation.range.startMs : Math.max(operation.range.startMs, resumedStart) }
      resumedStart = undefined
      if (range.startMs < range.endMs) {
        const completion = await this.engine.playRangeUntilComplete(range, operation.occurrenceId)
        if (!this.isCurrent(token)) return { status: 'cancelled' }
        if (completion.status !== 'completed') {
          this.practice = undefined
          this.intent = 'paused'
          this.engine.setPlaybackRate(operation.restoreRate)
          return completion
        }
      }
    }
    if (!this.isCurrent(token)) return { status: 'cancelled' }
    this.practice = undefined
    this.intent = 'paused'
    this.engine.setPlaybackRate(operation.restoreRate)
    return { status: 'completed' }
  }
}
