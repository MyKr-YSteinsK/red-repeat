import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioEngine,
  type AudioMediaAdapter,
  type FrameScheduler,
} from '../audio/audio-engine'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type { LyricsDocument, TimelineDocument } from '../library/schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import { TimelineDebuggerPage } from './TimelineDebuggerPage'

let activeEngine: ReturnType<typeof createAudioEngine> | undefined

afterEach(() => {
  cleanup()
  activeEngine?.dispose()
  activeEngine = undefined
})

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  coverUrl: '/library-runtime/songs/first-light/cover.webp',
  editionUrl: '/library-runtime/songs/first-light/edition.json',
}

const edition: RuntimeEdition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.json',
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
    coverSmallUrl: '/library-runtime/songs/first-light/cover.webp',
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.webp',
  },
}

const lyrics: LyricsDocument = {
  segments: [
    { id: 's001', lyrics: 'Repeat me', translation: '再来一次' },
    { id: 's002', lyrics: 'Stay near', translation: '靠近一些' },
  ],
}

const timeline: TimelineDocument = {
  audioSourceHash: 'd'.repeat(64),
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
      endMs: 600,
      playStartMs: 50,
      playEndMs: 650,
    },
    {
      id: 'o002',
      segmentId: 's002',
      sectionId: 'verse',
      startMs: 500,
      endMs: 800,
      playStartMs: 450,
      playEndMs: 850,
    },
  ],
}

describe('Timeline Debugger live context', () => {
  it('subscribes to the existing Audio Engine and exposes deterministic context', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    activeEngine = createAudioEngine(media, { frameScheduler: frames })

    render(
      <TimelineDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog: { contractVersion: 3, contentHash: 'e'.repeat(64), editions: [catalogEdition] } }}
        runtimeClient={runtimeClientFor()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
        audioEngine={activeEngine}
      />,
    )

    expect(
      await screen.findByRole('heading', { name: 'Timeline Debugger' }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(media.src).toBe('/app/library-runtime/songs/first-light/audio.m4a')
    })
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-working-copy-state',
      'clean',
    )
    expect(screen.getByText('00:00.000')).toBeInTheDocument()
    expect(screen.getByText('Timeline audio hash')).toBeInTheDocument()
    expect(screen.getByText('d'.repeat(64))).toBeInTheDocument()

    await activeEngine.playContinuous()
    await act(async () => {
      media.currentTime = 0.55
      frames.flush()
    })

    expect(screen.getByText('00:00.550')).toBeInTheDocument()
    expect(screen.getByText('550 ms')).toBeInTheDocument()
    expect(screen.getByText('PRIMARY')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /o001.*Repeat me/ })[0]).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getAllByRole('button', { name: /o002.*Stay near/ }).length,
    ).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button', { name: /o002.*Stay near/ })[0])
    expect(screen.getByRole('heading', { name: 'o002' })).toBeInTheDocument()
    expect(screen.getAllByText('playStartMs').length).toBeGreaterThan(0)
    expect(screen.getAllByText('450').length).toBeGreaterThan(0)
    expect(screen.getByText('靠近一些')).toBeInTheDocument()

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(
        screen.getByRole('button', { name: 'Increase playStartMs by 100ms' }),
      )
    }
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-working-copy-state',
      'invalid',
    )
    expect(
      screen.getByRole('alert', { name: 'Timeline validation errors' }),
    ).toHaveTextContent('occurrences[o002].timing')

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(
        screen.getByRole('button', { name: 'Decrease playStartMs by 100ms' }),
      )
    }
    fireEvent.click(screen.getByRole('button', { name: 'Increase endMs by 50ms' }))
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-working-copy-state',
      'dirty',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Seek startMs' }))
    expect(media.currentTime).toBe(0.5)
    fireEvent.click(screen.getByRole('button', { name: 'Jump endMs' }))
    expect(media.currentTime).toBe(0.85)
    fireEvent.click(screen.getByRole('button', { name: 'Jump playEndMs' }))
    expect(media.currentTime).toBe(0.85)
    fireEvent.click(screen.getByRole('button', { name: 'Play actual range' }))
    await waitFor(() => expect(media.currentTime).toBe(0.5))
    fireEvent.click(screen.getByRole('button', { name: 'Replay practice range' }))
    await waitFor(() => expect(media.currentTime).toBe(0.45))

    fireEvent.click(screen.getByRole('button', { name: 'Previous Occurrence' }))
    expect(screen.getByRole('heading', { name: 'o001' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Select Section Instrumental/ }))
    expect(screen.getByRole('heading', { name: 'Instrumental' })).toBeInTheDocument()
    expect(screen.getByText('INSTRUMENTAL')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Increase Section startMs by 100ms' }),
    )
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-working-copy-state',
      'dirty',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Seek Section startMs' }))
    expect(media.currentTime).toBe(1.1)
    fireEvent.click(screen.getByRole('button', { name: 'Seek Section endMs' }))
    expect(media.currentTime).toBe(1.4)
    fireEvent.click(screen.getByRole('button', { name: 'Play Section' }))
    await waitFor(() => expect(media.currentTime).toBe(1.1))
    expect(activeEngine.getState().activeOccurrenceId).toBeUndefined()

    fireEvent.click(
      screen.getByRole('button', { name: 'Decrease Section startMs by 100ms' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Decrease Section startMs by 100ms' }),
    )
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-working-copy-state',
      'invalid',
    )
    expect(
      screen.getByRole('alert', { name: 'Timeline validation errors' }),
    ).toHaveTextContent('sections[instrumental]')
    expect(screen.getByRole('button', { name: 'Copy timeline.json' })).toBeDisabled()
    fireEvent.click(
      screen.getByRole('button', { name: 'Increase Section startMs by 100ms' }),
    )
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-working-copy-state',
      'dirty',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reset selected Section' }))
    expect(screen.getAllByText('1000').length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: /o002.*Stay near/ })[0])
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset selected Occurrence' }),
    )
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-working-copy-state',
      'clean',
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Increase Section startMs by 50ms' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reset all changes' }))
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-working-copy-state',
      'clean',
    )

    const writeText = vi.fn((text: string) =>
      Promise.resolve(text).then(() => undefined),
    )
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy timeline.json' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(JSON.parse(writeText.mock.calls[0][0])).toMatchObject({
      audioSourceHash: 'b'.repeat(64),
    })

    const createObjectURL = vi.fn(() => 'blob:timeline')
    const revokeObjectURL = vi.fn()
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Download timeline.json' }))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:timeline')

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: originalCreateObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: originalRevokeObjectURL,
    })
    anchorClick.mockRestore()
  }, 15_000)

  it('pauses debugger playback on unmount', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    activeEngine = createAudioEngine(media, { frameScheduler: frames })

    const view = render(
      <TimelineDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog: { contractVersion: 3, contentHash: 'e'.repeat(64), editions: [catalogEdition] } }}
        runtimeClient={runtimeClientFor()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
        audioEngine={activeEngine}
      />,
    )

    await screen.findByRole('heading', { name: 'Timeline Debugger' })
    await waitFor(() => expect(media.src).toBe('/app/library-runtime/songs/first-light/audio.m4a'))
    await activeEngine.playContinuous()
    expect(media.paused).toBe(false)

    view.unmount()
    expect(media.pause).toHaveBeenCalled()
    expect(media.paused).toBe(true)
  })

  it('does not pause a replacement source during debugger cleanup', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    activeEngine = createAudioEngine(media, { frameScheduler: frames })

    const view = render(
      <TimelineDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog: { contractVersion: 3, contentHash: 'e'.repeat(64), editions: [catalogEdition] } }}
        runtimeClient={runtimeClientFor()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
        audioEngine={activeEngine}
      />,
    )

    await screen.findByRole('heading', { name: 'Timeline Debugger' })
    await waitFor(() => expect(media.src).toBe('/app/library-runtime/songs/first-light/audio.m4a'))
    await activeEngine.playContinuous()

    activeEngine.loadSource('/app/library-runtime/songs/other/audio.m4a')
    const pauseCallCount = media.pause.mock.calls.length
    expect(media.src).toBe('/app/library-runtime/songs/other/audio.m4a')
    view.unmount()

    expect(media.pause.mock.calls.length).toBe(pauseCallCount)
  })
})

function runtimeClientFor(): RuntimeClient {
  return {
    loadEdition: vi.fn(async () => edition),
    loadLyrics: vi.fn(async () => lyrics),
    loadTimeline: vi.fn(async () => timeline),
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
