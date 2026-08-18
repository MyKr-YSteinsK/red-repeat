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
