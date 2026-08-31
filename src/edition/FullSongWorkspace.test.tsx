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
} from '../library/schema'
import { createEffectiveOccurrenceTimingProvider } from '../practice/practice-timing-overrides'
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
  coverUrl: '/library-runtime/songs/first-light/cover-small.webp',
  editionUrl: '/library-runtime/songs/first-light/edition.json',
}

const edition: RuntimeEdition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.json',
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
        startMs: 50,
        endMs: 550,
      },
      {
        id: 'o002',
        segmentId: 's002',
        sectionId: 'verse',
        startMs: 400,
        endMs: 950,
      },
      {
        id: 'o003',
        segmentId: 's003',
        sectionId: 'verse',
        startMs: 650,
        endMs: 1150,
      },
      {
        id: 'o004',
        segmentId: 's004',
        sectionId: 'chorus',
        startMs: 1550,
        endMs: 1950,
      },
    ],
  } satisfies TimelineDocument,
  practice: {
    units: [
      { id: 'p001', sectionId: 'verse', label: 'Verse', occurrenceIds: ['o001', 'o002', 'o003'] },
      { id: 'p002', sectionId: 'chorus', label: 'Chorus', occurrenceIds: ['o004'] },
    ],
  },
  features: [],
})

const modelWithTimingOverride = {
  ...model,
  timingProvider: createEffectiveOccurrenceTimingProvider(model.timeline, {
    schemaVersion: 3,
    songId: 'first-light',
    editionContentHash: edition.contentHash,
    audioSourceHash: edition.audio.sourceHash,
    baseTimelineUrl: edition.timelineUrl,
    occurrences: { o002: { startMs: 420, endMs: 880 } },
  }),
}

const gappedModel = assembleRuntimeSongEdition({
  catalogEdition,
  edition,
  lyrics: {
    segments: [
      { id: 'g001', lyrics: 'Gap line 1', translation: '间隔句一' },
      { id: 'g002', lyrics: 'Gap line 2', translation: '间隔句二' },
      { id: 'g003', lyrics: 'Gap line 3', translation: '间隔句三' },
      { id: 'g004', lyrics: 'Gap line 4', translation: '间隔句四' },
      { id: 'g005', lyrics: 'Gap line 5', translation: '间隔句五' },
    ],
  } satisfies LyricsDocument,
  timeline: {
    audioSourceHash: 'a'.repeat(64),
    sections: [
      { id: 'gap-verse', label: 'Gap Verse', startMs: 0, endMs: 1600 },
      { id: 'gap-instrumental', label: 'Gap Instrumental', startMs: 1600, endMs: 1800 },
      { id: 'gap-chorus', label: 'Gap Chorus', startMs: 1800, endMs: 2600 },
    ],
    occurrences: [
      { id: 'go001', segmentId: 'g001', sectionId: 'gap-verse', startMs: 100, endMs: 250 },
      { id: 'go002', segmentId: 'g002', sectionId: 'gap-verse', startMs: 400, endMs: 550 },
      { id: 'go003', segmentId: 'g003', sectionId: 'gap-verse', startMs: 700, endMs: 850 },
      { id: 'go004', segmentId: 'g004', sectionId: 'gap-verse', startMs: 1000, endMs: 1150 },
      { id: 'go005', segmentId: 'g005', sectionId: 'gap-chorus', startMs: 1900, endMs: 2050 },
    ],
  } satisfies TimelineDocument,
  practice: {
    units: [
      {
        id: 'gap-unit',
        sectionId: 'gap-verse',
        label: 'Gap Verse',
        occurrenceIds: ['go001', 'go002', 'go003', 'go004'],
      },
    ],
  },
  features: [],
})

describe('FullSongWorkspace', () => {
  it('renders the complete lyric stream with readable translation and reading layers', async () => {
    const { engine } = renderWorkspace()

    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    expect(screen.getByText('Repeat me')).toBeInTheDocument()
    expect(screen.getByText('再来一次')).toBeInTheDocument()
    expect(screen.getByText('器乐段')).toBeInTheDocument()
    expect(
      document.querySelectorAll(
        '.full-song-instrumental-marker-signal',
      ),
    ).toHaveLength(1)
    expect(
      document.querySelectorAll(
        '.full-song-instrumental-marker > span:not(.full-song-instrumental-marker-signal)',
      ),
    ).toHaveLength(3)
    expect(document.querySelectorAll('.full-song-lyric-cluster')).toHaveLength(4)
    expect(screen.queryByText('Only a private note.')).not.toBeInTheDocument()
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
      mediaFor(engine).currentTime = 0.75
      frames.flush()
    })
    await waitFor(() => {
      expect(document.querySelector('[data-occurrence-id="o002"]')).toHaveClass(
        'is-primary-active',
        'is-selected',
      )
    })

    await act(async () => {
      mediaFor(engine).currentTime = 1
      frames.flush()
    })
    await waitFor(() => {
      expect(document.querySelector('[data-occurrence-id="o003"]')).toHaveClass(
        'is-primary-active',
        'is-selected',
      )
    })

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

  it('keeps playback-follow selection stable across lyric gaps from a middle-line start', async () => {
    const { engine, frames } = renderWorkspace({ model: gappedModel })
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: '从这里连续播放：Gap line 2' }))
    await waitFor(() => {
      expect(engine.getState()).toMatchObject({
        status: 'playing',
        intent: 'continuous',
        currentTimeMs: 400,
      })
    })

    const workspace = screen.getByRole('region', { name: '全曲歌词' })
    const observed: Array<{ timeMs: number; primary?: string; visible?: string }> = []
    const updateAndCapture = async (
      timeMs: number,
      expectedPrimary: string | undefined,
      expectedVisible: string | undefined,
    ): Promise<void> => {
      await act(async () => {
        mediaFor(engine).currentTime = timeMs / 1000
        frames.flush()
      })
      await waitFor(() => {
        expect(
          document.querySelector<HTMLElement>('.is-primary-active')?.dataset
            .occurrenceId,
        ).toBe(expectedPrimary)
        expect(workspace.getAttribute('data-selected-occurrence-id') ?? undefined).toBe(
          expectedVisible,
        )
      })
      observed.push({
        timeMs,
        primary: document.querySelector<HTMLElement>('.is-primary-active')?.dataset
          .occurrenceId,
        visible: workspace.getAttribute('data-selected-occurrence-id') ?? undefined,
      })
    }

    await updateAndCapture(750, 'go003', 'go003')
    await updateAndCapture(900, undefined, 'go003')
    await updateAndCapture(1050, 'go004', 'go004')
    await updateAndCapture(1200, undefined, undefined)

    expect(observed).toEqual([
      { timeMs: 750, primary: 'go003', visible: 'go003' },
      { timeMs: 900, primary: undefined, visible: 'go003' },
      { timeMs: 1050, primary: 'go004', visible: 'go004' },
      { timeMs: 1200, primary: undefined, visible: undefined },
    ])
  })

  it('does not carry a lyric cursor through a real instrumental section', async () => {
    const { engine, frames } = renderWorkspace({ model: gappedModel })
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: '从这里连续播放：Gap line 2' }))
    await waitFor(() => expect(engine.getState().status).toBe('playing'))

    const workspace = screen.getByRole('region', { name: '全曲歌词' })
    await act(async () => {
      mediaFor(engine).currentTime = 1.7
      frames.flush()
    })
    await waitFor(() => {
      expect(workspace).not.toHaveAttribute('data-selected-occurrence-id')
      expect(
        document.querySelector('[data-section-id="gap-instrumental"]'),
      ).toHaveClass('is-section-playing')
    })
    expect(document.querySelector('.is-primary-active')).toBeNull()

    await act(async () => {
      mediaFor(engine).currentTime = 1.95
      frames.flush()
    })
    await waitFor(() => {
      expect(workspace).toHaveAttribute('data-selected-occurrence-id', 'go005')
      expect(document.querySelector('[data-occurrence-id="go005"]')).toHaveClass(
        'is-primary-active',
        'is-selected',
      )
    })
  })

  it('keeps same-source position when the workspace is replaced', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engines.push(engine)
    mediaByEngine.set(engine, media)
    const view = render(
      <FullSongWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
        audioEngine={engine}
      />,
    )
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    await engine.playContinuous()
    media.currentTime = 0.65
    frames.flush()
    engine.pause()
    const loadCount = media.load.mock.calls.length

    view.unmount()
    render(
      <FullSongWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
        audioEngine={engine}
      />,
    )
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    expect(media.load).toHaveBeenCalledTimes(loadCount)
    expect(media.currentTime).toBe(0.65)
    expect(media.play).toHaveBeenCalledOnce()
  })

  it('uses the assembled Effective Timing for continuous click and bounded replay', async () => {
    const { engine } = renderWorkspace({ model: modelWithTimingOverride })
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

  it('uses canonical one-shot bounds when no Effective Timing override exists', async () => {
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
    expect(player).toHaveClass('full-song-player')
    expect(player).not.toHaveClass('control-sheet')
    expect(player.querySelectorAll('.control-button')).toHaveLength(0)
    expect(player.querySelectorAll('.full-song-player-speed-button')).toHaveLength(3)
    expect(player.querySelector('.full-song-player-speed > span')).toBeNull()
    expect(player.querySelector('.full-song-player-context')).toHaveTextContent('当前段：Verse')
    expect(player.querySelectorAll('.full-song-player-context > span')).toHaveLength(1)
    expect(player.querySelector('[aria-live]')).toBeNull()
    expect(player).not.toHaveTextContent('当前句：')
    expect(screen.getByRole('button', { name: '播放' })).toHaveClass('full-song-player-toggle')
    expect(screen.getByRole('button', { name: '播放' })).not.toHaveClass('control-button--primary')
    expect(screen.getByRole('button', { name: '从这里连续播放：Repeat me' })).not.toHaveClass('control-button')
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

    expect(screen.queryByRole('button', { name: '加速' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '设置速度 0.65x' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '设置速度 0.80x' }))
    expect(engine.getState().playbackRate).toBe(0.8)
    expect(screen.getByRole('button', { name: '设置速度 0.80x' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '设置速度 0.80x' })).toHaveClass('full-song-player-speed-button')
    expect(window.localStorage.getItem('red-repeat:practice-rate:v1:first-light')).toBe(
      '0.8',
    )
  })

  it('does not scroll for the first primary after a lyric click, then follows later playback', async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    try {
      const { engine, frames } = renderWorkspace()
      await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

      fireEvent.click(
        screen.getByRole('button', { name: '从这里连续播放：Stay near' }),
      )
      await waitFor(() => expect(engine.getState().status).toBe('playing'))
      expect(scrollIntoView).not.toHaveBeenCalled()

      await act(async () => {
        mediaFor(engine).currentTime = 1
        frames.flush()
      })
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
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

  it('plays an instrumental section without inventing a lyric occurrence', async () => {
    const { engine } = renderWorkspace()
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    fireEvent.click(
      screen.getByRole('button', { name: '播放器乐段：Instrumental' }),
    )
    await waitFor(() => {
      expect(engine.getState()).toMatchObject({
        status: 'playing',
        intent: 'range',
        activeRange: { startMs: 1200, endMs: 1500 },
        currentTimeMs: 1200,
      })
    })
    expect(screen.getByRole('button', { name: '播放器乐段：Instrumental' })).toHaveClass(
      'is-playing',
    )
    expect(screen.getByRole('button', { name: '从这里连续播放：Stay near' })).not.toHaveClass(
      'is-selected',
    )
  })

  it('returns to the top without changing playback and resets to zero', async () => {
    const originalScrollTo = window.scrollTo
    const scrollTo = vi.fn()
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })

    try {
      const { engine } = renderWorkspace()
      await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
      fireEvent.click(screen.getByRole('button', { name: '播放' }))
      await waitFor(() => expect(engine.getState().status).toBe('playing'))
      fireEvent.change(screen.getByRole('slider', { name: '播放进度' }), {
        target: { value: '900' },
      })
      await waitFor(() => expect(engine.getState().currentTimeMs).toBe(900))

      fireEvent.click(screen.getByRole('button', { name: '回到顶部' }))
      expect(scrollTo).toHaveBeenCalled()
      expect(engine.getState().currentTimeMs).toBe(900)

      fireEvent.click(screen.getByRole('button', { name: '重置' }))
      await waitFor(() => {
        expect(engine.getState()).toMatchObject({
          status: 'paused',
          currentTimeMs: 0,
        })
      })
      expect(screen.getByRole('button', { name: '回到顶部' })).toBeInTheDocument()
      expect(scrollTo.mock.calls.length).toBeGreaterThanOrEqual(2)
    } finally {
      Object.defineProperty(window, 'scrollTo', {
        configurable: true,
        value: originalScrollTo,
      })
    }
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

  it('distinguishes touch taps from manual browsing and resumes follow after a lyric click', async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    try {
      const { engine, frames } = renderWorkspace()
      await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
      const stream = screen.getByText('Counterpoint line').closest('.full-song-lyrics-stream')!

      fireEvent.touchStart(stream)
      expect(screen.queryByRole('button', { name: '回到当前句' })).not.toBeInTheDocument()

      fireEvent.touchMove(stream)
      expect(screen.getByRole('button', { name: '回到当前句' })).toBeInTheDocument()
      const callsBeforeResume = scrollIntoView.mock.calls.length

      fireEvent.click(screen.getByRole('button', { name: '从这里连续播放：Stay near' }))
      await waitFor(() => expect(engine.getState().status).toBe('playing'))
      expect(screen.queryByRole('button', { name: '回到当前句' })).not.toBeInTheDocument()

      await act(async () => {
        mediaFor(engine).currentTime = 1
        frames.flush()
      })
      await waitFor(() =>
        expect(scrollIntoView.mock.calls.length).toBeGreaterThan(callsBeforeResume),
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

  it('uses automatic scrolling when reduced motion is preferred', async () => {
    const originalMatchMedia = window.matchMedia
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
    const scrollIntoView = vi.fn()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    })
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
      await waitFor(() =>
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: 'center',
          behavior: 'auto',
        }),
      )
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      })
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
  model?: typeof model
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
      model={options.model ?? model}
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
