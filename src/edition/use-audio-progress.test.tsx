import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAudioEngine, type AudioMediaAdapter, type FrameScheduler } from '../audio/audio-engine'
import { useAudioProgress, type AudioProgressSnapshot } from './use-audio-progress'

afterEach(cleanup)

describe('useAudioProgress', () => {
  it('updates the compact player without rerendering the lyric tree per frame', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/audio.m4a')
    media.duration = 2
    media.emit('loadedmetadata')

    const lyricRenders = vi.fn()
    const playerRenders = vi.fn()
    render(
      <>
        <LyricProbe onRender={lyricRenders} />
        <ProgressProbe engine={engine} onRender={playerRenders} />
      </>,
    )

    await act(async () => {
      await engine.playContinuous()
      media.currentTime = 0.25
      frames.flush()
    })

    expect(lyricRenders).toHaveBeenCalledTimes(1)
    expect(playerRenders.mock.calls.at(-1)?.[0]).toMatchObject({
      status: 'playing',
      currentTimeMs: 250,
      durationMs: 2000,
    })
    expect(screen.getByRole('status')).toHaveTextContent('250 / 2000')
  })
})

function LyricProbe({ onRender }: { onRender: () => void }) {
  onRender()
  return <p data-testid="lyrics">lyrics</p>
}

function ProgressProbe({
  engine,
  onRender,
}: {
  engine: ReturnType<typeof createAudioEngine>
  onRender: (progress: AudioProgressSnapshot) => void
}) {
  const progress = useAudioProgress(engine)
  onRender(progress)
  return (
    <output role="status">
      {progress.currentTimeMs} / {progress.durationMs ?? 0}
    </output>
  )
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
    const listeners = this.listeners.get(event) ?? new Set<() => void>()
    listeners.add(listener)
    this.listeners.set(event, listeners)
  }

  removeEventListener(event: string, listener: () => void): void {
    this.listeners.get(event)?.delete(listener)
  }

  emit(event: string): void {
    this.listeners.get(event)?.forEach((listener) => listener())
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
    const callbacks = [...this.callbacks.values()]
    this.callbacks.clear()
    callbacks.forEach((callback) => callback())
  }
}
