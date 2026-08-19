import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioEngine,
  type AudioEngine,
  type AudioMediaAdapter,
} from '../audio/audio-engine'
import {
  PracticeController,
  type PracticeScheduler,
} from './practice-controller'

let activeEngine: AudioEngine | undefined
let activeController: PracticeController | undefined

afterEach(() => {
  activeController?.dispose()
  activeController = undefined
  activeEngine?.dispose()
  activeEngine = undefined
})

describe('PracticeController', () => {
  it('keeps one active strategy and exposes a stable snapshot', () => {
    const engine = createTestEngine()
    activeEngine = engine
    activeController = new PracticeController(engine)

    expect(
      activeController.startRamp({ startMs: 100, endMs: 400 }),
    ).toBe(true)
    expect(activeController.getState()).toMatchObject({
      kind: 'ramp',
      stageIndex: 0,
      repetitionIndex: 0,
      stageSpeed: 0.7,
      totalRepetitions: 6,
    })

    expect(
      activeController.startShadow(createOccurrence()),
    ).toBe(true)
    expect(activeController.getState()).toMatchObject({
      kind: 'shadow',
      targetOccurrenceId: 'o001',
      phase: 'source-before',
    })
    expect(activeController.getState()).not.toHaveProperty('stageIndex')
  })

  it('cancels the previous strategy and restores its captured rate', () => {
    const engine = createTestEngine()
    activeEngine = engine
    engine.setPlaybackRate(0.75)
    activeController = new PracticeController(engine)

    activeController.startRamp({ startMs: 100, endMs: 400 })
    engine.setPlaybackRate(0.7)
    activeController.startShadow(createOccurrence())

    expect(activeController.getState().kind).toBe('shadow')
    expect(engine.getState().playbackRate).toBe(0.75)
  })

  it('settles active strategy state on source replacement and engine errors', () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    engine.loadSource('/first.m4a')
    activeController = new PracticeController(engine)

    activeController.startRamp({ startMs: 100, endMs: 400 })
    engine.loadSource('/second.m4a')
    expect(activeController.getState()).toEqual({ kind: 'idle' })

    activeController.startShadow(createOccurrence())
    media.emit('error')
    expect(activeController.getState()).toEqual({ kind: 'idle' })
  })

  it('stops notifying an unsubscribed listener and does not dispose the engine', () => {
    const engine = createTestEngine()
    activeEngine = engine
    activeController = new PracticeController(engine)
    const listener = vi.fn()
    const unsubscribe = activeController.subscribe(listener)

    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    activeController.startRamp({ startMs: 100, endMs: 400 })
    activeController.cancel()

    expect(listener).toHaveBeenCalledTimes(1)
    const dispose = vi.spyOn(engine, 'dispose')
    activeController.dispose()
    expect(dispose).not.toHaveBeenCalled()
    expect(() => engine.loadSource('/still-usable.m4a')).not.toThrow()
  })

  it('accepts an injected scheduler without owning a media timer', () => {
    const scheduler: PracticeScheduler = {
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
      now: () => 1000,
    }
    const engine = createTestEngine()
    activeEngine = engine
    activeController = new PracticeController(engine, { scheduler })

    activeController.startShadow(createOccurrence())
    activeController.cancel()

    expect(scheduler.setTimeout).not.toHaveBeenCalled()
    expect(scheduler.clearTimeout).not.toHaveBeenCalled()
  })

  it('runs the fixed Ramp sequence one bounded repetition at a time', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    activeEngine = engine
    engine.loadSource('/audio.m4a')
    engine.setPlaybackRate(1.2)
    activeController = new PracticeController(engine)

    expect(
      activeController.startRamp({ startMs: 100, endMs: 400 }),
    ).toBe(true)
    await flushMicrotasks(8)

    for (let repetition = 0; repetition < 6; repetition += 1) {
      expect(frames.pendingCount()).toBe(1)
      media.currentTime = 0.4
      frames.flush()
      await flushMicrotasks(8)
    }

    expect(media.playbackRates).toEqual([0.7, 0.7, 0.85, 0.85, 1, 1])
    expect(activeController.getState()).toEqual({ kind: 'idle' })
    expect(engine.getState().playbackRate).toBe(1.2)
  })

  it('restores the original rate when Ramp is cancelled or errors', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    activeEngine = engine
    engine.loadSource('/audio.m4a')
    engine.setPlaybackRate(0.75)
    activeController = new PracticeController(engine)

    activeController.startRamp({ startMs: 100, endMs: 400 })
    await flushMicrotasks()
    activeController.cancel()
    expect(activeController.getState()).toEqual({ kind: 'idle' })
    expect(engine.getState().playbackRate).toBe(0.75)

    const rejection = new Error('play blocked')
    media.play = vi.fn(() => Promise.reject(rejection))
    activeController.startRamp({ startMs: 100, endMs: 400 })
    await flushMicrotasks()

    expect(activeController.getState()).toEqual({ kind: 'idle' })
    expect(engine.getState().playbackRate).toBe(0.75)
    expect(frames.pendingCount()).toBe(0)
  })

  it('does not let a stale Ramp completion advance after another strategy starts', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    activeEngine = engine
    engine.loadSource('/audio.m4a')
    activeController = new PracticeController(engine)

    activeController.startRamp({ startMs: 100, endMs: 400 })
    await flushMicrotasks()
    activeController.startShadow(createOccurrence())

    media.currentTime = 0.4
    frames.flush()
    await flushMicrotasks()

    expect(activeController.getState()).toMatchObject({
      kind: 'shadow',
      phase: 'source-before',
    })
    expect(media.playbackRates).toEqual([0.7])
  })

  it('does not start Ramp for an invalid or empty range', () => {
    const engine = createTestEngine()
    activeEngine = engine
    activeController = new PracticeController(engine)

    expect(
      activeController.startRamp({ startMs: 400, endMs: 400 }),
    ).toBe(false)
    expect(activeController.getState()).toEqual({ kind: 'idle' })
  })
})

function createTestEngine(): AudioEngine {
  const engine = createAudioEngine(new FakeMedia())
  engine.loadSource('/audio.m4a')
  return engine
}

function createOccurrence() {
  return {
    id: 'o001',
    segmentId: 's001',
    sectionId: 'verse',
    startMs: 100,
    endMs: 600,
    playStartMs: 50,
    playEndMs: 650,
  }
}

class FakeMedia implements AudioMediaAdapter {
  src = ''
  currentTime = 0
  duration = Number.NaN
  paused = true
  playbackRate = 1
  preservesPitch = false
  playbackRates: number[] = []
  play = vi.fn(async () => {
    this.playbackRates.push(this.playbackRate)
    this.paused = false
  })
  pause = vi.fn(() => {
    this.paused = true
  })
  load = vi.fn()
  private readonly listeners = new Map<string, Set<() => void>>()

  addEventListener(event: string, listener: () => void): void {
    const eventListeners = this.listeners.get(event) ?? new Set<() => void>()
    eventListeners.add(listener)
    this.listeners.set(event, eventListeners)
  }

  removeEventListener(event: string, listener: () => void): void {
    this.listeners.get(event)?.delete(listener)
  }

  emit(event: string): void {
    this.listeners.get(event)?.forEach((listener) => listener())
  }
}

class FakeFrameScheduler {
  private nextId = 0
  private readonly callbacks = new Map<number, () => void>()

  requestFrame(callback: () => void): number {
    const id = this.nextId
    this.nextId += 1
    this.callbacks.set(id, callback)
    return id
  }

  cancelFrame(handle: unknown): void {
    this.callbacks.delete(handle as number)
  }

  flush(): void {
    const callbacks = [...this.callbacks.values()]
    this.callbacks.clear()
    callbacks.forEach((callback) => callback())
  }

  pendingCount(): number {
    return this.callbacks.size
  }
}

async function flushMicrotasks(count = 4): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await Promise.resolve()
  }
}
