import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioEngine,
  getAudioEngine,
  resetAudioEngineForTests,
  type AudioMediaAdapter,
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
    media.play = vi.fn(() => Promise.resolve())
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
  play = vi.fn(async () => {
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
