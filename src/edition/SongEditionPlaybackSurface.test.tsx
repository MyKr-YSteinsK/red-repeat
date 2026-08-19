import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioEngine,
  getAudioEngine,
  resetAudioEngineForTests,
  type AudioMediaAdapter,
  type FrameScheduler,
} from '../audio/audio-engine'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import type { RuntimeClient } from '../runtime/runtime-client'
import { SongEditionPlaybackSurface } from './SongEditionPlaybackSurface'
import { useSongEditionPlayback } from './use-song-edition-playback'

afterEach(() => {
  cleanup()
  resetAudioEngineForTests()
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
  contractVersion: 1,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.json',
  visualUrl: '/library-runtime/songs/first-light/visual.json',
  features: [],
  audio: {
    url: '/library-runtime/songs/first-light/audio.m4a',
    sourceHash: 'b'.repeat(64),
    runtimeHash: 'c'.repeat(64),
    durationMs: 2000,
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
      { id: 's001', lyrics: 'Repeat me', translation: '再来一次' },
      { id: 's002', lyrics: 'Stay near', translation: '靠近一些' },
    ],
  } satisfies LyricsDocument,
  timeline: {
    audioSourceHash: 'a'.repeat(64),
    sections: [
      { id: 'verse', label: 'Verse', startMs: 0, endMs: 1000 },
      { id: 'instrumental', label: 'Instrumental', startMs: 1000, endMs: 1400 },
    ],
    occurrences: [
      {
        id: 'o001',
        segmentId: 's001',
        sectionId: 'verse',
        startMs: 100,
        endMs: 300,
        playStartMs: 50,
        playEndMs: 350,
      },
      {
        id: 'o002',
        segmentId: 's001',
        sectionId: 'verse',
        startMs: 500,
        endMs: 700,
        playStartMs: 450,
        playEndMs: 750,
      },
      {
        id: 'o003',
        segmentId: 's002',
        sectionId: 'verse',
        startMs: 600,
        endMs: 800,
        playStartMs: 550,
        playEndMs: 850,
      },
    ],
  } satisfies TimelineDocument,
  visual: { recommendedTheme: 'liner' } satisfies VisualDocument,
  features: [],
})

describe('Song Edition timeline playback binding', () => {
  it('loads exactly one source without autoplay', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    renderSurface(engine)

    await waitFor(() => {
      expect(media.src).toBe('/app/library-runtime/songs/first-light/audio.m4a')
    })
    expect(media.load).toHaveBeenCalledTimes(1)
    expect(media.play).not.toHaveBeenCalled()
  })

  it('plays the exact clicked Occurrence practice range', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    fireEvent.click(screen.getAllByRole('button', { name: 'Play line Repeat me' })[1])

    await waitFor(() => {
      expect(engine.getState()).toMatchObject({
        status: 'playing',
        currentTimeMs: 450,
        activeOccurrenceId: 'o002',
      })
    })
  })

  it('uses Resolver state for overlap, instrumental Section, and gap', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    await engine.playContinuous()

    await act(async () => {
      media.currentTime = 0.65
      frames.flush()
    })
    expect(document.querySelector('[data-occurrence-id="o002"]')).toHaveClass(
      'is-active',
      'is-primary',
    )
    expect(document.querySelector('[data-occurrence-id="o003"]')).toHaveClass(
      'is-active',
    )
    expect(screen.getByText('NOW / Verse')).toBeInTheDocument()

    await act(async () => {
      media.currentTime = 1.1
      frames.flush()
    })
    expect(screen.getByText('NOW / Instrumental')).toBeInTheDocument()
    expect(screen.getByText('No lyric active')).toBeInTheDocument()
    expect(document.querySelectorAll('.lyric-occurrence.is-active')).toHaveLength(0)

    await act(async () => {
      media.currentTime = 1.6
      frames.flush()
    })
    expect(screen.getByText('NOW / Gap')).toBeInTheDocument()
  })

  it('switches source and clears the previous command context', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    const view = renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    await engine.playRange({ startMs: 450, endMs: 750 }, 'o002')

    const nextModel = {
      ...model,
      edition: {
        ...model.edition,
        audio: {
          ...model.edition.audio,
          url: '/library-runtime/songs/second-signal/audio.m4a',
        },
      },
    }
    view.rerender(
      <SongEditionPlaybackSurface
        model={nextModel}
        runtimeClient={runtimeClientFor()}
        audioEngine={engine}
      />,
    )

    await waitFor(() => {
      expect(media.src).toBe('/app/library-runtime/songs/second-signal/audio.m4a')
    })
    expect(engine.getState()).toMatchObject({
      status: 'loading',
      sourceUrl: '/app/library-runtime/songs/second-signal/audio.m4a',
      intent: 'continuous',
    })
    expect(frames.pendingCount()).toBe(0)
  })

  it('keeps one global Audio Engine owner', () => {
    const first = getAudioEngine(new FakeMedia())
    expect(getAudioEngine()).toBe(first)
  })

  it('provides previous/next boundaries and loop scope replacement', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    expect(screen.getByRole('button', { name: 'Previous occurrence' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next occurrence' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next occurrence' }))
    await waitFor(() => expect(engine.getState().activeOccurrenceId).toBe('o001'))

    fireEvent.click(screen.getByRole('button', { name: '2 lines loop' }))
    fireEvent.click(screen.getByRole('button', { name: 'Loop 2 lines' }))
    await waitFor(() => {
      expect(engine.getState()).toMatchObject({
        intent: 'loop',
        activeRange: { startMs: 50, endMs: 750 },
      })
    })
    expect(frames.pendingCount()).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: '4 lines loop' }))
    await waitFor(() => {
      expect(engine.getState().activeRange).toEqual({ startMs: 50, endMs: 850 })
    })
    expect(frames.pendingCount()).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(engine.getState()).toMatchObject({
      status: 'paused',
      intent: 'continuous',
    })
    expect(frames.pendingCount()).toBe(0)
  })

  it('exposes speed steps, shortcuts, and a usable Focus toggle', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Increase speed' }))
    expect(engine.getState().playbackRate).toBe(1.05)
    fireEvent.click(screen.getByRole('button', { name: 'Set speed 0.65x' }))
    expect(engine.getState().playbackRate).toBe(0.65)
    fireEvent.click(screen.getByRole('button', { name: 'Decrease speed' }))
    expect(engine.getState().playbackRate).toBe(0.6)

    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    expect(screen.getByRole('heading', { name: 'No lyric active' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exit Focus' })).toBeInTheDocument()
    expect(engine.getState().sourceUrl).toBe(
      '/app/library-runtime/songs/first-light/audio.m4a',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Exit Focus' }))
    expect(screen.getByRole('heading', { name: 'The work in time.' })).toBeInTheDocument()
  })

  it('enables Focus practice for a valid anchor and coordinates transport controls', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    await engine.playContinuous()

    await act(async () => {
      media.currentTime = 0.65
      frames.flush()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))

    expect(screen.getByRole('button', { name: 'Ramp' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Shadow' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Ramp' }))
    expect(screen.getByRole('button', { name: 'Ramp' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Increase speed' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '2 lines loop' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Loop 1 line' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Shadow' }))
    expect(screen.getByRole('button', { name: 'Ramp' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Shadow' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Next occurrence' }))
    await waitFor(() => expect(engine.getState().activeOccurrenceId).toBe('o003'))
    expect(screen.getByRole('button', { name: 'Shadow' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('disables Shadow without an active lyric anchor and cancels practice on Focus exit', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    await engine.playContinuous()

    await act(async () => {
      media.currentTime = 1.1
      frames.flush()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    expect(screen.getByRole('button', { name: 'Shadow' })).toBeDisabled()

    await act(async () => {
      media.currentTime = 0.65
      frames.flush()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Exit Focus' }))
    expect(screen.queryByRole('button', { name: 'Shadow' })).not.toBeInTheDocument()

    engine.setPlaybackRate(0.75)
    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ramp' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exit Focus' }))
    expect(engine.getState().playbackRate).toBe(0.75)
  })

  it('marks Section loop unavailable during an instrumental Section', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    await engine.playContinuous()

    await act(async () => {
      media.currentTime = 1.1
      frames.flush()
    })

    expect(
      screen.getByRole('button', {
        name: 'Section loop: unavailable without lyric Occurrences',
      }),
    ).toBeDisabled()
  })

  it('enters and exits Focus without rebuilding playback state', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    await engine.playContinuous()
    engine.setPlaybackRate(0.75)

    await act(async () => {
      media.currentTime = 0.65
      frames.flush()
    })
    const stateBeforeFocus = engine.getState()

    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    expect(screen.getByRole('heading', { name: 'Repeat me' })).toBeInTheDocument()
    expect(engine.getState()).toMatchObject({
      sourceUrl: stateBeforeFocus.sourceUrl,
      status: stateBeforeFocus.status,
      currentTimeMs: stateBeforeFocus.currentTimeMs,
      playbackRate: 0.75,
    })
    expect(screen.getByText('再来一次')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Exit Focus' }))
    expect(screen.getByRole('heading', { name: 'The work in time.' })).toBeInTheDocument()
    expect(screen.getAllByText('Repeat me')).toHaveLength(2)
  })

  it('switches page modes without reloading audio or resetting reading', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Show reading' }))
    await engine.playContinuous()

    await act(async () => {
      media.currentTime = 0.65
      frames.flush()
    })
    const stateBeforeModeChange = engine.getState()

    fireEvent.click(screen.getByRole('button', { name: 'Immersive' }))
    expect(screen.getByLabelText('Song timeline playback')).toHaveAttribute(
      'data-mode',
      'immersive',
    )
    expect(screen.getByRole('button', { name: 'Hide reading' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    expect(screen.getByLabelText('Song timeline playback')).toHaveAttribute(
      'data-mode',
      'focus',
    )
    expect(engine.getState()).toMatchObject({
      sourceUrl: stateBeforeModeChange.sourceUrl,
      status: stateBeforeModeChange.status,
      currentTimeMs: stateBeforeModeChange.currentTimeMs,
      playbackRate: stateBeforeModeChange.playbackRate,
    })
    expect(media.load).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Hide reading' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Exit Focus' }))
    expect(screen.getByLabelText('Song timeline playback')).toHaveAttribute(
      'data-mode',
      'liner',
    )
  })

  it('preserves reading visibility and never keeps a lyric through instrumental or gap', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    renderSurface(engine)
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Show reading' }))
    expect(screen.getByRole('button', { name: 'Hide reading' })).toBeInTheDocument()

    await engine.playContinuous()
    await act(async () => {
      media.currentTime = 1.1
      frames.flush()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    expect(screen.getByRole('heading', { name: 'No lyric active' })).toBeInTheDocument()
    expect(screen.getByText('Instrumental passage')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide reading' })).toBeInTheDocument()

    await act(async () => {
      media.currentTime = 1.6
      frames.flush()
    })
    expect(screen.getByRole('heading', { name: 'No lyric active' })).toBeInTheDocument()
    expect(screen.getByText('A gap between Sections')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Exit Focus' }))
    expect(screen.getByRole('button', { name: 'Hide reading' })).toBeInTheDocument()
  })

  it('does not rerender the consumer for frames inside one semantic timeline state', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    const renderSnapshots = vi.fn()

    render(
      <PlaybackRenderProbe
        model={model}
        engine={engine}
        onRender={renderSnapshots}
      />,
    )
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    await engine.playContinuous()

    await act(async () => {
      media.currentTime = 0.15
      frames.flush()
    })
    await waitFor(() => {
      expect(document.querySelector('output')).toHaveAttribute(
        'data-primary-occurrence',
        'o001',
      )
    })
    const afterSemanticChange = renderSnapshots.mock.calls.length

    await act(async () => {
      media.currentTime = 0.18
      frames.flush()
      media.currentTime = 0.2
      frames.flush()
    })
    expect(
      renderSnapshots.mock.calls.length,
      JSON.stringify(renderSnapshots.mock.calls),
    ).toBe(afterSemanticChange)

    await act(async () => {
      media.currentTime = 0.35
      frames.flush()
    })
    expect(renderSnapshots.mock.calls.length).toBeGreaterThan(afterSemanticChange)
  })
})

function renderSurface(
  engine: ReturnType<typeof createAudioEngine>,
) {
  return render(
    <SongEditionPlaybackSurface
      model={model}
      runtimeClient={runtimeClientFor()}
      audioEngine={engine}
    />,
  )
}

function PlaybackRenderProbe({
  model: probeModel,
  engine,
  onRender,
}: {
  model: typeof model
  engine: ReturnType<typeof createAudioEngine>
  onRender: (snapshot: {
    currentTimeMs: number
    status: string
    sectionId?: string
    primaryId?: string
    previousId?: string
    nextId?: string
  }) => void
}) {
  const playback = useSongEditionPlayback(
    probeModel,
    runtimeClientFor(),
    engine,
  )
  onRender({
    currentTimeMs: playback.audioState.currentTimeMs,
    status: playback.audioState.status,
    sectionId: playback.resolution.currentSection?.id,
    primaryId: playback.resolution.primaryOccurrence?.id,
    previousId: playback.resolution.previousOccurrence?.id,
    nextId: playback.resolution.nextOccurrence?.id,
  })
  return (
    <output data-primary-occurrence={playback.resolution.primaryOccurrence?.id}>
      {playback.resolution.primaryOccurrence?.id ?? 'none'}
    </output>
  )
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

  pendingCount(): number {
    return this.callbacks.size
  }
}
