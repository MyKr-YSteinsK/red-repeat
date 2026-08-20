import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioEngine,
  type AudioEngine,
  type AudioMediaAdapter,
  type FrameScheduler,
} from '../audio/audio-engine'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import { getTimingOverridesStorageKey } from '../practice/practice-timing-overrides'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import type { RuntimeClient } from '../runtime/runtime-client'
import { FullSongWorkspace } from './FullSongWorkspace'

const engines: AudioEngine[] = []

afterEach(() => {
  cleanup()
  engines.forEach((engine) => engine.dispose())
  engines.length = 0
  mediaByEngine.clear()
  window.localStorage.clear()
})

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  recommendedTheme: 'liner',
  coverUrl: '/library-runtime/songs/first-light/cover-small.webp',
  editionUrl: '/library-runtime/songs/first-light/edition.json',
}

const edition: RuntimeEdition = {
  contractVersion: 2,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.json',
  visualUrl: '/library-runtime/songs/first-light/visual.json',
  features: [],
  audio: {
    url: '/library-runtime/songs/first-light/audio.m4a',
    sourceHash: 'b'.repeat(64),
    runtimeHash: 'c'.repeat(64),
    durationMs: 2600,
    format: {
      container: 'm4a',
      codec: 'aac-lc',
      bitrateKbps: 192,
      sampleRate: 48000,
      channels: 2,
    },
  },
  artwork: {
    coverSmallUrl: catalogEdition.coverUrl,
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.webp',
  },
}

const model = assembleRuntimeSongEdition({
  catalogEdition,
  edition,
  lyrics: {
    segments: [
      {
        id: 's001',
        lyrics: 'Repeat me',
        translation: '再来一次',
        layers: [{ id: 'reading', label: '读音', text: 'リピート・ミー' }],
        notes: [{ body: 'Only a private note.' }],
      },
      {
        id: 's002',
        lyrics: 'Stay near',
        translation: '靠近一些',
      },
      {
        id: 's003',
        lyrics: 'Counterpoint line',
        translation: '对位句',
      },
      {
        id: 's004',
        lyrics: 'One more light',
        translation: '再亮一点',
      },
    ],
  } satisfies LyricsDocument,
  timeline: {
    audioSourceHash: 'a'.repeat(64),
    sections: [
      { id: 'verse', label: 'Verse', startMs: 0, endMs: 1200 },
      { id: 'instrumental', label: 'Instrumental', startMs: 1200, endMs: 1500 },
      { id: 'chorus', label: 'Chorus', startMs: 1500, endMs: 2600 },
    ],
    occurrences: [
      {
        id: 'o001',
        segmentId: 's001',
        sectionId: 'verse',
        startMs: 100,
        endMs: 500,
        playStartMs: 50,
        playEndMs: 550,
      },
      {
        id: 'o002',
        segmentId: 's002',
        sectionId: 'verse',
        startMs: 450,
        endMs: 900,
        playStartMs: 400,
        playEndMs: 950,
      },
      {
        id: 'o003',
        segmentId: 's003',
        sectionId: 'verse',
        startMs: 700,
        endMs: 1100,
        playStartMs: 650,
        playEndMs: 1150,
      },
      {
        id: 'o004',
        segmentId: 's004',
        sectionId: 'chorus',
        startMs: 1600,
        endMs: 1900,
        playStartMs: 1550,
        playEndMs: 1950,
      },
    ],
  } satisfies TimelineDocument,
  practice: {
    units: [
      { id: 'p001', sectionId: 'verse', label: 'Verse', occurrenceIds: ['o001', 'o002', 'o003'] },
      { id: 'p002', sectionId: 'chorus', label: 'Chorus', occurrenceIds: ['o004'] },
    ],
  },
  visual: { recommendedTheme: 'liner' } satisfies VisualDocument,
  features: [],
})

describe('FullSongWorkspace', () => {
  it('renders the complete lyric stream with translation, reading toggle, and instrumental marker', async () => {
    const { engine } = renderWorkspace()

    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    expect(screen.getByText('Repeat me')).toBeInTheDocument()
    expect(screen.getByText('再来一次')).toBeInTheDocument()
    expect(screen.getByText('器乐段')).toBeInTheDocument()
    expect(screen.queryByText('Only a private note.')).not.toBeInTheDocument()
    expect(screen.queryByText('リピート・ミー')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '显示读音' }))
    expect(screen.getByRole('button', { name: '隐藏读音' })).toBeInTheDocument()
    expect(screen.getByText('リピート・ミー')).toBeInTheDocument()
  })

  it('uses Resolver primary and secondary active states without merging selection into activity', async () => {
    const { engine, frames } = renderWorkspace()
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    await engine.playContinuous()

    await act(async () => {
      mediaFor(engine).currentTime = 0.75
      frames.flush()
    })

    expect(document.querySelector('[data-occurrence-id="o002"]')).toHaveClass(
      'is-active',
      'is-primary-active',
    )
    expect(document.querySelector('[data-occurrence-id="o003"]')).toHaveClass(
      'is-active',
      'is-secondary-active',
    )
    expect(document.querySelector('[data-occurrence-id="o002"]')).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(document.querySelector('[data-occurrence-id="o003"]')).not.toHaveClass(
      'is-primary-active',
    )
  })

  it('clicks a line into continuous playback and continues beyond its play envelope', async () => {
    const { engine, frames } = renderWorkspace()
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    fireEvent.click(
      screen.getByRole('button', { name: '从这里连续播放：Stay near' }),
    )
    await waitFor(() => {
      expect(engine.getState()).toMatchObject({
        status: 'playing',
        intent: 'continuous',
        currentTimeMs: 400,
      })
    })
    expect(engine.getState().activeRange).toBeUndefined()
    expect(
      document.querySelector('[data-occurrence-id="o002"]'),
    ).toHaveClass('is-selected')

    await act(async () => {
      mediaFor(engine).currentTime = 1.1
      frames.flush()
    })
    expect(engine.getState()).toMatchObject({
      status: 'playing',
      intent: 'continuous',
      currentTimeMs: 1100,
    })
    expect(engine.getState().activeRange).toBeUndefined()
  })

  it('uses a compatible Timing Override for continuous click and bounded replay', async () => {
    window.localStorage.setItem(
      getTimingOverridesStorageKey('first-light'),
      JSON.stringify({
        schemaVersion: 1,
        songId: 'first-light',
        audioSourceHash: 'b'.repeat(64),
        baseTimelineUrl: edition.timelineUrl,
        occurrences: { o002: { playStartMs: 420, playEndMs: 880 } },
      }),
    )
    const { engine } = renderWorkspace()
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    fireEvent.click(
      screen.getByRole('button', { name: '从这里连续播放：Stay near' }),
    )
    await waitFor(() => expect(engine.getState().currentTimeMs).toBe(420))
    expect(engine.getState().intent).toBe('continuous')

    fireEvent.click(screen.getByRole('button', { name: '再听这句' }))
    await waitFor(() => {
      expect(engine.getState()).toMatchObject({
        status: 'playing',
        intent: 'range',
        activeRange: { startMs: 420, endMs: 880 },
        currentTimeMs: 420,
      })
    })
  })

  it('ignores stale Timing Overrides and keeps canonical one-shot bounds', async () => {
    window.localStorage.setItem(
      getTimingOverridesStorageKey('first-light'),
      JSON.stringify({
        schemaVersion: 1,
        songId: 'first-light',
        audioSourceHash: 'b'.repeat(64),
        baseTimelineUrl: '/library-runtime/songs/first-light/old-timeline.json',
        occurrences: { o002: { playStartMs: 777, playEndMs: 888 } },
      }),
    )
    const { engine } = renderWorkspace()
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    fireEvent.click(
      screen.getByRole('button', { name: '从这里连续播放：Stay near' }),
    )
    await waitFor(() => expect(engine.getState().currentTimeMs).toBe(400))
    fireEvent.click(screen.getByRole('button', { name: '再听这句' }))
    await waitFor(() => {
      expect(engine.getState().activeRange).toEqual({
        startMs: 400,
        endMs: 950,
      })
    })
  })

  it('shows only selected-line quick actions and can hand off its Practice Unit', async () => {
    const onStartPracticeUnit = vi.fn()
    const { engine } = renderWorkspace({ onStartPracticeUnit })
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    expect(screen.queryByRole('button', { name: '再听这句' })).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: '从这里连续播放：Stay near' }),
    )
    expect(screen.getByRole('button', { name: '再听这句' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '开始学这一段 →' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '开始学这一段 →' }))
    expect(onStartPracticeUnit).toHaveBeenCalledWith('p001')
  })

  it('provides compact playback, accessible progress seeking, and shared speed controls', async () => {
    const { engine } = renderWorkspace()
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    const player = screen.getByRole('complementary', { name: '全曲播放器' })
    const progress = screen.getByRole('slider', { name: '播放进度' })
    expect(player).toBeInTheDocument()
    expect(progress).toHaveAttribute('max', '2600')
    expect(screen.getByText('00:00 / 00:02')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    await waitFor(() => expect(engine.getState().status).toBe('playing'))
    fireEvent.change(progress, { target: { value: '900' } })
    await waitFor(() => {
      expect(engine.getState()).toMatchObject({
        status: 'playing',
        currentTimeMs: 900,
      })
    })

    fireEvent.click(screen.getByRole('button', { name: '加速' }))
    expect(engine.getState().playbackRate).toBe(1.05)
    fireEvent.click(screen.getByRole('button', { name: '设置速度 0.65x' }))
    expect(engine.getState().playbackRate).toBe(0.65)
    expect(window.localStorage.getItem('red-repeat:practice-rate:v1:first-light')).toBe(
      '0.65',
    )
  })

  it('follows semantic primary changes, then stops stealing the viewport after manual browse', async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    try {
      const { engine, frames } = renderWorkspace()
      await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
      await engine.playContinuous()

      await act(async () => {
        mediaFor(engine).currentTime = 0.15
        frames.flush()
      })
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
      const callsBeforeManualBrowse = scrollIntoView.mock.calls.length

      fireEvent.wheel(screen.getByText('Counterpoint line').closest('.full-song-lyrics-stream')!)
      expect(screen.getByRole('button', { name: '回到当前句' })).toBeInTheDocument()

      await act(async () => {
        mediaFor(engine).currentTime = 0.75
        frames.flush()
      })
      expect(
        document.querySelector('[data-occurrence-id="o002"]'),
      ).toHaveClass('is-primary-active')
      expect(scrollIntoView).toHaveBeenCalledTimes(callsBeforeManualBrowse)

      fireEvent.click(screen.getByRole('button', { name: '回到当前句' }))
      await waitFor(() =>
        expect(scrollIntoView.mock.calls.length).toBeGreaterThan(
          callsBeforeManualBrowse,
        ),
      )
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
          configurable: true,
          value: originalScrollIntoView,
        })
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView
      }
    }
  })

  it('does not expose the old full-song practice modes or mega dock controls', () => {
    renderWorkspace()

    expect(screen.queryByRole('button', { name: 'Focus' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Immersive' })).not.toBeInTheDocument()
    expect(screen.queryByText('渐速练习')).not.toBeInTheDocument()
    expect(screen.queryByText('跟唱留白')).not.toBeInTheDocument()
    expect(screen.queryByText(/Loop/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/repeat count/i)).not.toBeInTheDocument()
  })
})

function renderWorkspace(options: {
  onStartPracticeUnit?: (practiceUnitId: string) => void
} = {}): {
  engine: AudioEngine
  frames: FakeFrameScheduler
} {
  const media = new FakeMedia()
  const frames = new FakeFrameScheduler()
  const engine = createAudioEngine(media, { frameScheduler: frames })
  engines.push(engine)
  render(
    <FullSongWorkspace
      model={model}
      runtimeClient={runtimeClientFor()}
      audioEngine={engine}
      onStartPracticeUnit={options.onStartPracticeUnit}
    />,
  )
  mediaByEngine.set(engine, media)
  return { engine, frames }
}

const mediaByEngine = new Map<AudioEngine, FakeMedia>()

function mediaFor(engine: AudioEngine): FakeMedia {
  const media = mediaByEngine.get(engine)
  if (!media) {
    throw new Error('test media was not registered')
  }
  return media
}

function runtimeClientFor(): RuntimeClient {
  return {
    resolveAsset: (logicalPath: string) => `/app${logicalPath}`,
  } as unknown as RuntimeClient
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
