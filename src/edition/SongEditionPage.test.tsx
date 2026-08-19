import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioEngine,
  type AudioMediaAdapter,
  type FrameScheduler,
} from '../audio/audio-engine'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import { RuntimeClientError } from '../runtime/runtime-client'
import {
  SongEditionPage,
  type SongEditionPageProps,
} from './SongEditionPage'
import { themePreferenceKey } from '../theme/theme-preference'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  album: 'Returning',
  year: 2026,
  recommendedTheme: 'liner',
  coverUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
  editionUrl: '/library-runtime/songs/first-light/edition.a.json',
}

const edition: RuntimeEdition = {
  contractVersion: 1,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    album: 'Returning',
    year: 2026,
    intro: 'A quiet beginning.',
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.a.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.a.json',
  visualUrl: '/library-runtime/songs/first-light/visual.a.json',
  features: [],
  audio: {
    url: '/library-runtime/songs/first-light/audio.a.m4a',
    sourceHash: 'b'.repeat(64),
    runtimeHash: 'c'.repeat(64),
    durationMs: 1000,
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
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.a.webp',
    heroLargeUrl: '/library-runtime/songs/first-light/hero-large.a.webp',
  },
}

describe('Liner Song Edition opening', () => {
  it('renders required and optional metadata with cover and hero artwork', async () => {
    const { container } = render(<SongEditionPage {...propsFor(edition)} />)

    expect(
      await screen.findByRole('heading', { name: 'First Light' }),
    ).toBeInTheDocument()
    expect(screen.getByText('A Composer')).toBeInTheDocument()
    expect(screen.getByText('Returning / 2026')).toBeInTheDocument()
    expect(screen.getByText('A quiet beginning.')).toBeInTheDocument()
    expect(screen.getByAltText('First Light cover artwork')).toHaveAttribute(
      'src',
      '/app/library-runtime/songs/first-light/cover-large.a.webp',
    )
    expect(container.querySelectorAll('img')).toHaveLength(2)
  })

  it('naturally omits optional metadata and hero artwork', async () => {
    const minimalEdition: RuntimeEdition = {
      ...edition,
      song: {
        songId: 'first-light',
        title: 'First Light',
        artist: 'A Composer',
      },
      artwork: {
        coverSmallUrl: catalogEdition.coverUrl,
        coverLargeUrl: edition.artwork.coverLargeUrl,
      },
    }

    const { container } = render(
      <SongEditionPage
        {...propsFor(minimalEdition, undefined, {
          ...catalogEdition,
          album: undefined,
          year: undefined,
        })}
      />,
    )

    expect(
      await screen.findByRole('heading', { name: 'First Light' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Returning / 2026')).not.toBeInTheDocument()
    expect(screen.queryByText('A quiet beginning.')).not.toBeInTheDocument()
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('shows an edition load error while keeping the Library return action', async () => {
    const error = new RuntimeClientError({
      kind: 'http',
      logicalPath: catalogEdition.editionUrl,
      url: `/app${catalogEdition.editionUrl}`,
      status: 404,
      message: 'missing',
    })
    const props = propsFor(edition, error)

    render(<SongEditionPage {...props} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Runtime http while reading /library-runtime/songs/first-light/edition.a.json.',
    )
    expect(screen.getByRole('link', { name: 'Return to Library' })).toHaveAttribute(
      'href',
      '/red-repeat/',
    )
  })

  it('owns page-level Focus state and hides secondary notes until exit', async () => {
    const editionWithFeature: RuntimeEdition = {
      ...edition,
      features: [
        {
          id: 'note',
          url: '/library-runtime/songs/first-light/note.md',
        },
      ],
    }
    render(<SongEditionPage {...propsFor(editionWithFeature)} />)

    expect(
      await screen.findByRole('heading', {
        name: 'A little more about the work.',
      }),
    ).toBeInTheDocument()
    const page = screen.getByRole('main')
    expect(page).toHaveAttribute('data-focus-mode', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    expect(page).toHaveAttribute('data-focus-mode', 'true')
    expect(
      screen.queryByRole('heading', {
        name: 'A little more about the work.',
      }),
    ).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(page).toHaveAttribute('data-focus-mode', 'false')
    expect(
      screen.getByRole('heading', {
        name: 'A little more about the work.',
      }),
    ).toBeInTheDocument()
  })

  it('keeps page modes mutually exclusive and exits Immersive with Escape', async () => {
    const editionWithFeature: RuntimeEdition = {
      ...edition,
      features: [
        {
          id: 'note',
          url: '/library-runtime/songs/first-light/note.md',
        },
      ],
    }
    render(<SongEditionPage {...propsFor(editionWithFeature)} />)

    expect(
      await screen.findByRole('heading', {
        name: 'A little more about the work.',
      }),
    ).toBeInTheDocument()
    const page = screen.getByRole('main')

    fireEvent.click(screen.getByRole('button', { name: 'Immersive' }))
    expect(page).toHaveAttribute('data-mode', 'immersive')
    expect(page).toHaveAttribute('data-focus-mode', 'false')
    expect(
      screen.queryByRole('heading', {
        name: 'A little more about the work.',
      }),
    ).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(page).toHaveAttribute('data-mode', 'liner')
    expect(
      screen.getByRole('heading', {
        name: 'A little more about the work.',
      }),
    ).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'f' })
    expect(page).toHaveAttribute('data-mode', 'focus')
    fireEvent.keyDown(window, { key: 'f' })
    expect(page).toHaveAttribute('data-mode', 'liner')
  })

  it('uses persisted Theme over the recommendation and preserves page Mode', async () => {
    window.localStorage.setItem(themePreferenceKey('first-light'), 'nocturne')
    const cinemaCatalogEdition = {
      ...catalogEdition,
      recommendedTheme: 'cinema' as const,
    }
    render(
      <SongEditionPage
        {...propsFor(edition, undefined, cinemaCatalogEdition, {
          visual: { recommendedTheme: 'cinema' },
        })}
      />,
    )

    expect(
      await screen.findByRole('heading', { name: 'First Light' }),
    ).toBeInTheDocument()
    const page = screen.getByRole('main')
    expect(page).toHaveAttribute('data-theme', 'nocturne')
    expect(
      screen.getByRole('button', { name: 'Use Nocturne theme' }),
    ).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use Cinema theme' }))

    expect(page).toHaveAttribute('data-mode', 'focus')
    expect(page).toHaveAttribute('data-theme', 'cinema')
    expect(
      screen.getByRole('button', { name: 'Use Cinema theme' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem(themePreferenceKey('first-light'))).toBe(
      'cinema',
    )
  })

  it('keeps Feature behavior owned by Mode when Theme is Cinema', async () => {
    const editionWithFeature: RuntimeEdition = {
      ...edition,
      features: [
        {
          id: 'note',
          url: '/library-runtime/songs/first-light/note.md',
        },
      ],
    }
    const cinemaCatalogEdition = {
      ...catalogEdition,
      recommendedTheme: 'cinema' as const,
    }
    render(
      <SongEditionPage
        {...propsFor(editionWithFeature, undefined, cinemaCatalogEdition, {
          visual: { recommendedTheme: 'cinema' },
        })}
      />,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'A little more about the work.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('data-theme', 'cinema')
    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    expect(
      screen.queryByRole('heading', {
        name: 'A little more about the work.',
      }),
    ).not.toBeInTheDocument()
  })

  it('keeps source and time continuous through Immersive, auto-scroll, and Escape', async () => {
    try {
      const media = new FakeMedia()
      const frames = new FakeFrameScheduler()
      const engine = createAudioEngine(media, { frameScheduler: frames })
      const scrollIntoView = vi.fn()
      const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        writable: true,
        value: scrollIntoView,
      })
      const content = {
        lyrics: {
          segments: [
            { id: 's001', lyrics: 'Repeat me', translation: '再来一次' },
            { id: 's002', lyrics: 'Stay near', translation: '靠近一些' },
          ],
        } satisfies LyricsDocument,
        timeline: {
          audioSourceHash: 'b'.repeat(64),
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
      }

      const view = render(
        <SongEditionPage
          {...propsFor(edition, undefined, catalogEdition, content)}
          audioEngine={engine}
        />,
      )
      await screen.findByRole('heading', { name: 'First Light' })
      await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
      await act(async () => {
        await engine.playContinuous()
        media.currentTime = 0.15
        frames.flush()
      })
      const stateBeforeImmersive = engine.getState()
      vi.useFakeTimers()

      fireEvent.click(screen.getByRole('button', { name: 'Immersive' }))
      const page = screen.getByRole('main')
      expect(page).toHaveAttribute('data-mode', 'immersive')
      expect(engine.getState()).toMatchObject({
        status: stateBeforeImmersive.status,
        sourceUrl: stateBeforeImmersive.sourceUrl,
        currentTimeMs: stateBeforeImmersive.currentTimeMs,
      })

      await act(async () => {
        media.currentTime = 0.65
        frames.flush()
      })
      expect(document.querySelector('.immersive-lyrics')).toHaveAttribute(
        'data-primary-occurrence-id',
        'o002',
      )
      expect(scrollIntoView).toHaveBeenCalled()

      const surface = screen.getByLabelText('Song timeline playback')
      await act(async () => {
        vi.advanceTimersByTime(3000)
      })
      expect(surface).toHaveAttribute('data-controls-hidden', 'true')
      fireEvent.pointerMove(surface)
      expect(surface).toHaveAttribute('data-controls-hidden', 'false')

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(page).toHaveAttribute('data-mode', 'liner')
      expect(engine.getState()).toMatchObject({
        status: 'playing',
        sourceUrl: stateBeforeImmersive.sourceUrl,
        currentTimeMs: 650,
      })
      view.unmount()
      engine.dispose()
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        writable: true,
        value: originalScrollIntoView,
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('owns the desktop shortcuts once and protects editable or modified targets', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    const view = render(
      <SongEditionPage {...propsFor(edition)} audioEngine={engine} />,
    )
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    await act(async () => {
      await engine.playContinuous()
    })

    const page = screen.getByRole('main')
    const spaceEvent = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    act(() => window.dispatchEvent(spaceEvent))
    expect(spaceEvent.defaultPrevented).toBe(true)
    expect(engine.getState().status).toBe('paused')

    act(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: ']', bubbles: true, cancelable: true }),
      ),
    )
    expect(engine.getState().playbackRate).toBe(1.05)
    act(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: '[', bubbles: true, cancelable: true }),
      ),
    )
    expect(engine.getState().playbackRate).toBe(1)

    fireEvent.keyDown(window, { key: 'f' })
    expect(page).toHaveAttribute('data-mode', 'focus')
    fireEvent.keyDown(window, { key: 'f' })
    expect(page).toHaveAttribute('data-mode', 'liner')

    fireEvent.click(screen.getByRole('button', { name: 'Immersive' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(page).toHaveAttribute('data-mode', 'liner')

    const input = document.createElement('input')
    document.body.append(input)
    fireEvent.keyDown(input, { key: 'f' })
    expect(page).toHaveAttribute('data-mode', 'liner')
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    expect(page).toHaveAttribute('data-mode', 'liner')
    input.remove()

    view.unmount()
    engine.dispose()
  })
})

function propsFor(
  runtimeEdition: RuntimeEdition,
  error?: Error,
  runtimeCatalogEdition: CatalogEdition = catalogEdition,
  content: {
    lyrics?: LyricsDocument
    timeline?: TimelineDocument
    visual?: VisualDocument
  } = {},
): SongEditionPageProps {
  const client = {
    loadEdition: vi.fn(async () => {
      if (error) {
        throw error
      }
      return runtimeEdition
    }),
    loadLyrics: vi.fn(async () => content.lyrics ?? { segments: [] }),
    loadTimeline: vi.fn(
      async () =>
        content.timeline ?? {
          audioSourceHash: 'a'.repeat(64),
          sections: [],
          occurrences: [],
        },
    ),
    loadVisual: vi.fn(
      async () => content.visual ?? { recommendedTheme: 'liner' as const },
    ),
    loadFeature: vi.fn(async () => '# Notes\n\nA small note.'),
    resolveAsset: vi.fn((logicalPath: string) => `/app${logicalPath}`),
  } as unknown as RuntimeClient

  return {
    catalogEdition: runtimeCatalogEdition,
    runtimeClient: client,
    homeHref: '/red-repeat/',
  }
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
