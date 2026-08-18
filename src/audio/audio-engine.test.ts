import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioEngine,
  getAudioEngine,
  normalizePlaybackRate,
  resetAudioEngineForTests,
  type AudioRange,
  type AudioMediaAdapter,
  type FrameScheduler,
} from './audio-engine'

afterEach(() => {
  resetAudioEngineForTests()
})

describe('Audio Engine foundation', () => {
  it('returns one global engine owner', () => {
    const first = getAudioEngineWithFake()
    const second = getAudioEngine()

    expect(second).toBe(first)
  })

  it('loads a source and exposes metadata state', () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    const listener = vi.fn()
    engine.subscribe(listener)

    engine.loadSource('/library-runtime/songs/first-light/audio.a.m4a')
    media.duration = 12.345
    media.emit('loadedmetadata')

    expect(engine.getState()).toMatchObject({
      status: 'ready',
      intent: 'continuous',
      sourceUrl: '/library-runtime/songs/first-light/audio.a.m4a',
      durationMs: 12_345,
      playbackRate: 1,
    })
    expect(listener).toHaveBeenCalled()
  })

  it('transitions play rejection into a recoverable error state', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    const rejection = new Error('autoplay blocked')
    media.play = vi.fn(() => Promise.reject(rejection))
    engine.loadSource('/audio.m4a')

    await expect(engine.playContinuous()).rejects.toBe(rejection)
    expect(engine.getState()).toMatchObject({
      status: 'error',
      error: rejection,
    })
  })

  it('cancels a stale play command after source replacement', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    let resolvePlay: (() => void) | undefined
    media.play = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePlay = resolve
        }),
    )
    engine.loadSource('/first.m4a')
    const stalePlay = engine.playContinuous()
    await Promise.resolve()
    engine.loadSource('/second.m4a')
    resolvePlay?.()
    await stalePlay

    expect(engine.getState()).toMatchObject({
      status: 'loading',
      sourceUrl: '/second.m4a',
      intent: 'continuous',
    })
  })

  it('pause cancels active command and preserves playback rate', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    engine.loadSource('/audio.m4a')
    engine.setPlaybackRate(0.75)
    media.play = vi.fn(async () => {
      media.paused = false
    })
    await engine.playContinuous()

    engine.pause()

    expect(media.pause).toHaveBeenCalled()
    expect(engine.getState()).toMatchObject({
      status: 'paused',
      intent: 'continuous',
      playbackRate: 0.75,
    })
    expect(media.playbackRate).toBe(0.75)
  })

  it('does not depend on Web Audio APIs', () => {
    expect('AudioContext' in globalThis).toBe(false)
  })

  it('plays a range from its start and stops at its end', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    const range: AudioRange = { startMs: 100, endMs: 300 }
    engine.loadSource('/audio.m4a')

    await engine.playRange(range, 'o001')

    expect(media.currentTime).toBe(0.1)
    expect(engine.getState()).toMatchObject({
      status: 'playing',
      intent: 'range',
      activeOccurrenceId: 'o001',
      activeRange: range,
    })
    expect(frames.pendingCount()).toBe(1)

    media.currentTime = 0.299
    frames.flush()
    expect(engine.getState().status).toBe('playing')

    media.currentTime = 0.3
    frames.flush()
    expect(engine.getState()).toMatchObject({
      status: 'paused',
      currentTimeMs: 300,
    })
    expect(frames.pendingCount()).toBe(0)
    expect(media.pause).toHaveBeenCalled()
  })

  it('pause cancels the active range watcher', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/audio.m4a')
    await engine.playRange({ startMs: 100, endMs: 300 })

    engine.pause()
    media.currentTime = 0.3
    frames.flush()

    expect(engine.getState()).toMatchObject({ status: 'paused', intent: 'continuous' })
    expect(frames.pendingCount()).toBe(0)
  })

  it('observes continuous playback time on the shared frame scheduler', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/audio.m4a')

    await engine.playContinuous()

    expect(frames.pendingCount()).toBe(1)
    media.currentTime = 0.42
    frames.flush()

    expect(engine.getState()).toMatchObject({
      status: 'playing',
      intent: 'continuous',
      currentTimeMs: 420,
    })
    expect(frames.pendingCount()).toBe(1)

    engine.pause()
    expect(frames.pendingCount()).toBe(0)
  })

  it('ignores a delayed internal pause event after a new play command', async () => {
    const media = new FakeMedia()
    media.queuePauseEvents = true
    const engine = createAudioEngine(media)
    engine.loadSource('/audio.m4a')
    await engine.playContinuous()

    engine.pause()
    await engine.playContinuous()
    media.flushPauseEvents()

    expect(engine.getState()).toMatchObject({
      status: 'playing',
      intent: 'continuous',
    })
  })

  it('ignores the internal pause event during loop restart', async () => {
    const media = new FakeMedia()
    media.queuePauseEvents = true
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/audio.m4a')
    await engine.playLoop({ startMs: 100, endMs: 300 })

    media.currentTime = 0.3
    frames.flush()
    await flushMicrotasks()
    media.flushPauseEvents()

    expect(engine.getState()).toMatchObject({
      status: 'playing',
      intent: 'loop',
      activeRange: { startMs: 100, endMs: 300 },
    })
  })

  it('ignores a delayed pause event when replacing the source', async () => {
    const media = new FakeMedia()
    media.queuePauseEvents = true
    const engine = createAudioEngine(media)
    engine.loadSource('/first.m4a')
    await engine.playContinuous()

    engine.loadSource('/second.m4a')
    media.flushPauseEvents()

    expect(engine.getState()).toMatchObject({
      status: 'loading',
      sourceUrl: '/second.m4a',
      intent: 'continuous',
    })
  })

  it('honors an external pause event', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/audio.m4a')
    await engine.playContinuous()

    media.userPause()

    expect(engine.getState()).toMatchObject({
      status: 'paused',
      intent: 'continuous',
    })
    expect(frames.pendingCount()).toBe(0)
  })

  it('a second range cancels the first watcher', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/audio.m4a')
    await engine.playRange({ startMs: 100, endMs: 300 }, 'o001')
    const staleCallback = frames.latestCallback()

    await engine.playRange({ startMs: 500, endMs: 700 }, 'o002')
    staleCallback()

    expect(engine.getState()).toMatchObject({
      status: 'playing',
      activeOccurrenceId: 'o002',
      activeRange: { startMs: 500, endMs: 700 },
    })
    expect(media.currentTime).toBe(0.5)
    expect(frames.pendingCount()).toBe(1)
  })

  it('source replacement cancels range playback and stale RAF work', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/first.m4a')
    await engine.playRange({ startMs: 100, endMs: 300 }, 'o001')
    const staleCallback = frames.latestCallback()

    engine.loadSource('/second.m4a')
    staleCallback()

    expect(engine.getState()).toMatchObject({
      status: 'loading',
      sourceUrl: '/second.m4a',
      intent: 'continuous',
    })
    expect(frames.pendingCount()).toBe(0)
  })

  it('a stale range RAF cannot pause newer continuous playback', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/audio.m4a')
    await engine.playRange({ startMs: 100, endMs: 300 })
    const staleCallback = frames.latestCallback()

    await engine.playContinuous()
    media.currentTime = 0.2
    staleCallback()

    expect(engine.getState()).toMatchObject({
      status: 'playing',
      intent: 'continuous',
    })
  })

  it('cleans the watcher when range play is rejected', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    const rejection = new Error('play blocked')
    media.play = vi.fn(() => Promise.reject(rejection))
    engine.loadSource('/audio.m4a')

    await expect(engine.playRange({ startMs: 100, endMs: 300 })).rejects.toBe(
      rejection,
    )
    expect(engine.getState()).toMatchObject({ status: 'error', error: rejection })
    expect(frames.pendingCount()).toBe(0)
  })

  it('repeats a range without stacking watchers and preserves speed', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/audio.m4a')
    engine.setPlaybackRate(0.75)
    await engine.playLoop({ startMs: 100, endMs: 300 })

    for (let cycle = 0; cycle < 3; cycle += 1) {
      media.currentTime = 0.3
      frames.flush()
      await flushMicrotasks()

      expect(engine.getState()).toMatchObject({
        status: 'playing',
        intent: 'loop',
        playbackRate: 0.75,
      })
      expect(media.currentTime).toBe(0.1)
      expect(media.playbackRate).toBe(0.75)
      expect(frames.pendingCount()).toBe(1)
    }
  })

  it('pause exits a loop and range or continuous intent replaces it', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/audio.m4a')
    await engine.playLoop({ startMs: 100, endMs: 300 })
    const staleLoopCallback = frames.latestCallback()

    engine.pause()
    staleLoopCallback()
    expect(engine.getState()).toMatchObject({
      status: 'paused',
      intent: 'continuous',
    })
    expect(frames.pendingCount()).toBe(0)

    await engine.playLoop({ startMs: 100, endMs: 300 })
    const staleLoopForRange = frames.latestCallback()
    await engine.playRange({ startMs: 500, endMs: 700 }, 'o002')
    staleLoopForRange()
    expect(engine.getState()).toMatchObject({
      status: 'playing',
      intent: 'range',
      activeOccurrenceId: 'o002',
    })

    const staleLoopForContinuous = frames.latestCallback()
    await engine.playContinuous()
    staleLoopForContinuous()
    expect(engine.getState()).toMatchObject({
      status: 'playing',
      intent: 'continuous',
    })
  })

  it('source switch exits a loop', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/first.m4a')
    await engine.playLoop({ startMs: 100, endMs: 300 })
    const staleCallback = frames.latestCallback()

    engine.loadSource('/second.m4a')
    staleCallback()

    expect(engine.getState()).toMatchObject({
      status: 'loading',
      sourceUrl: '/second.m4a',
      intent: 'continuous',
    })
    expect(frames.pendingCount()).toBe(0)
  })

  it('accepts only the supported playback-rate range and step', () => {
    expect(normalizePlaybackRate(0.5)).toBe(0.5)
    expect(normalizePlaybackRate(0.65)).toBe(0.65)
    expect(normalizePlaybackRate(0.75)).toBe(0.75)
    expect(normalizePlaybackRate(0.85)).toBe(0.85)
    expect(normalizePlaybackRate(1)).toBe(1)
    expect(normalizePlaybackRate(1.25)).toBe(1.25)
    expect(() => normalizePlaybackRate(0.66)).toThrow(RangeError)
    expect(() => normalizePlaybackRate(1.3)).toThrow(RangeError)
  })
})

function getAudioEngineWithFake() {
  resetAudioEngineForTests()
  return getAudioEngine(new FakeMedia())
}

class FakeMedia implements AudioMediaAdapter {
  src = ''
  currentTime = 0
  duration = Number.NaN
  paused = true
  playbackRate = 1
  preservesPitch = false
  queuePauseEvents = false
  play = vi.fn(async () => {
    this.paused = false
  })
  pause = vi.fn(() => {
    const wasPlaying = !this.paused
    this.paused = true
    if (wasPlaying) {
      if (this.queuePauseEvents) {
        this.pendingPauseEvents += 1
      } else {
        this.emit('pause')
      }
    }
  })
  load = vi.fn()

  private readonly listeners = new Map<string, Set<() => void>>()
  private pendingPauseEvents = 0

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

  flushPauseEvents(): void {
    const pendingPauseEvents = this.pendingPauseEvents
    this.pendingPauseEvents = 0
    for (let index = 0; index < pendingPauseEvents; index += 1) {
      this.emit('pause')
    }
  }

  userPause(): void {
    this.paused = true
    this.emit('pause')
  }
}

class FakeFrameScheduler implements FrameScheduler {
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
    const pendingCallbacks = [...this.callbacks.values()]
    this.callbacks.clear()
    pendingCallbacks.forEach((callback) => callback())
  }

  latestCallback(): () => void {
    const callback = [...this.callbacks.values()].at(-1)
    if (!callback) {
      throw new Error('expected a pending frame callback')
    }
    return callback
  }

  pendingCount(): number {
    return this.callbacks.size
  }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
