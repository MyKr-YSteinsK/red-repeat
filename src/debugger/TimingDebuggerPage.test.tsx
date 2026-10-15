import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AudioEngine } from '../audio/audio-engine'
import type { Catalog, CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type { LyricsDocument, PracticeDocument, TimelineDocument } from '../library/schema'
import { getTimingOverridesStorageKey } from '../practice/practice-timing-overrides'
import type { RuntimeClient } from '../runtime/runtime-client'
import { TimingDebuggerPage } from './TimingDebuggerPage'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  coverUrl: '/library-runtime/songs/first-light/cover.webp',
  editionUrl: '/library-runtime/songs/first-light/edition.json',
}

const catalog: Catalog = {
  contractVersion: 3,
  contentHash: 'f'.repeat(64),
  editions: [catalogEdition],
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
    durationMs: 1200,
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

const lyrics: LyricsDocument = {
  segments: [
    { id: 's001', lyrics: '首句', translation: 'First line' },
    { id: 's002', lyrics: '第二句', translation: 'Second line' },
  ],
}

const timeline: TimelineDocument = {
  audioSourceHash: edition.audio.sourceHash,
  sections: [{ id: 'verse', label: '主歌', startMs: 0, endMs: 1200 }],
  occurrences: [
    {
      id: 'o001',
      segmentId: 's001',
      sectionId: 'verse',
      startMs: 50,
      endMs: 350,
    },
    {
      id: 'o002',
      segmentId: 's002',
      sectionId: 'verse',
      startMs: 450,
      endMs: 750,
    },
  ],
}

const practice: PracticeDocument = {
  units: [
    {
      id: 'p001',
      sectionId: 'verse',
      label: '主歌',
      occurrenceIds: ['o001', 'o002'],
    },
  ],
}

function createRuntimeClient(): RuntimeClient {
  return {
    loadEdition: vi.fn(async () => edition),
    loadLyrics: vi.fn(async () => lyrics),
    loadTimeline: vi.fn(async () => timeline),
    loadPractice: vi.fn(async () => practice),
    resolveAsset: vi.fn((path: string) => path),
  } as unknown as RuntimeClient
}

describe('TimingDebuggerPage', () => {
  it('offers a normal-product song selector', () => {
    render(
      <TimingDebuggerPage
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: '选择一首歌' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /First Light/ })).toHaveAttribute(
      'href',
      expect.stringContaining('#timing=debug&edition=first-light'),
    )
  })

  it('adjusts and saves effective timing without exposing canonical low-level controls', async () => {
    render(
      <TimingDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '播放切口调试' })).toBeInTheDocument()
      expect(screen.getAllByText('首句').length).toBeGreaterThan(0)
    })

    expect(screen.queryByText('startMs')).not.toBeInTheDocument()
    expect(screen.queryByText('endMs')).not.toBeInTheDocument()
    expect(screen.queryByText('playStartMs')).not.toBeInTheDocument()
    expect(screen.queryByText('playEndMs')).not.toBeInTheDocument()
    expect(screen.queryByText('当前播放位置')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '用当前位置' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '恢复当前句默认' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '播放' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: '保存本机微调' })).toBeInTheDocument()
    expect(screen.getAllByText('起点')).toHaveLength(2)
    expect(screen.getAllByText('终点')).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: '+20ms' })[0])

    expect(screen.getByText('70 ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存本机微调' }))

    await waitFor(() => {
      const raw = window.localStorage.getItem(
        getTimingOverridesStorageKey('first-light'),
      )
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw ?? '{}')).toMatchObject({
        schemaVersion: 3,
        songId: 'first-light',
        editionContentHash: edition.contentHash,
        occurrences: { o001: { startMs: 70 } },
      })
    })
  })

  it('previews the same effective range shown after edit, undo and redo', async () => {
    const audioState = {
      status: 'idle' as const,
      intent: 'continuous' as const,
      playbackRate: 1,
      currentTimeMs: 0,
    }
    const audioEngine = {
      getState: vi.fn(() => audioState),
      subscribe: vi.fn((listener: (state: typeof audioState) => void) => {
        listener(audioState)
        return () => undefined
      }),
      loadSource: vi.fn(),
      setPlaybackRate: vi.fn(),
      pause: vi.fn(),
      playRangeUntilComplete: vi.fn(async () => ({ status: 'completed' as const })),
    } as unknown as AudioEngine

    render(
      <TimingDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
        audioEngine={audioEngine}
      />,
    )

    await screen.findByRole('heading', { name: '播放切口调试' })
    fireEvent.click(screen.getAllByRole('button', { name: '+20ms' })[0])
    expect(screen.getByText('70 ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    await waitFor(() => {
      expect(audioEngine.playRangeUntilComplete).toHaveBeenLastCalledWith(
        { startMs: 70, endMs: 350 },
        'o001',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    expect(screen.getByText('50 ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    await waitFor(() => {
      expect(audioEngine.playRangeUntilComplete).toHaveBeenLastCalledWith(
        { startMs: 50, endMs: 350 },
        'o001',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: '重做' }))
    expect(screen.getByText('70 ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    await waitFor(() => {
      expect(audioEngine.playRangeUntilComplete).toHaveBeenLastCalledWith(
        { startMs: 70, endMs: 350 },
        'o001',
      )
    })
  })

  it('selects the exact deep-linked Occurrence only after the Edition is ready', async () => {
    render(
      <TimingDebuggerPage
        songId="first-light"
        occurrenceId="o002"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /第二句/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })
    expect(screen.getByText('450 ms')).toBeInTheDocument()
  })

  it('updates a same-Edition Occurrence target without discarding its current draft', async () => {
    const runtimeClient = createRuntimeClient()
    const view = render(
      <TimingDebuggerPage
        songId="first-light"
        occurrenceId="o001"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={runtimeClient}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await screen.findByRole('heading', { name: '播放切口调试' })
    fireEvent.click(screen.getAllByRole('button', { name: '+20ms' })[0])
    expect(screen.getByText('70 ms')).toBeInTheDocument()

    view.rerender(
      <TimingDebuggerPage
        songId="first-light"
        occurrenceId="o002"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={runtimeClient}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /第二句/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })
    expect(screen.getByText('450 ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /首句/ }))
    expect(screen.getByText('70 ms')).toBeInTheDocument()
  })

  it('does not edit or save an invalid deep-link target until the user explicitly selects a row', async () => {
    render(
      <TimingDebuggerPage
        songId="first-light"
        occurrenceId="removed-occurrence"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/句子链接.*不存在/)
    })
    expect(screen.queryByRole('button', { name: '+20ms' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存本机微调' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem(getTimingOverridesStorageKey('first-light'))).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /第二句/ }))
    expect(screen.getAllByRole('button', { name: '+20ms' }).some(button => !(button as HTMLButtonElement).disabled)).toBe(true)
    fireEvent.click(screen.getAllByRole('button', { name: '+20ms' })[0])
    fireEvent.click(screen.getByRole('button', { name: '保存本机微调' }))

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(
        getTimingOverridesStorageKey('first-light'),
      ) ?? '{}')).toMatchObject({
        occurrences: { o002: { startMs: 470 } },
      })
    })
  })

  it('treats an explicitly empty Occurrence target as invalid instead of selecting the first row', async () => {
    render(
      <TimingDebuggerPage
        songId="first-light"
        occurrenceId=""
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Occurrence「（空）」.*不存在/)
    })
    expect(screen.getByRole('button', { name: /首句/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.queryByRole('button', { name: '+20ms' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存本机微调' })).not.toBeInTheDocument()
  })

  it('keeps a bounded undo/redo draft and preserves the previous stored value on save failure', async () => {
    const storageKey = getTimingOverridesStorageKey('first-light')
    const previousRaw = JSON.stringify({
      schemaVersion: 3,
      songId: 'first-light',
      editionContentHash: edition.contentHash,
      audioSourceHash: edition.audio.sourceHash,
      baseTimelineUrl: edition.timelineUrl,
      occurrences: { o001: { startMs: 40 } },
    })
    window.localStorage.setItem(storageKey, previousRaw)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('storage full')
    })
    const view = render(
      <TimingDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await waitFor(() => expect(screen.getByText('40 ms')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '撤销' })).toBeDisabled()
    fireEvent.click(screen.getAllByRole('button', { name: '+20ms' })[0])
    expect(screen.getByText('60 ms')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('有未保存的微调')

    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    expect(screen.getByText('40 ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重做' }))
    expect(screen.getByText('60 ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存本机微调' }))

    expect(await screen.findByText(/无法保存本机播放切口/)).toBeInTheDocument()
    expect(window.localStorage.getItem(storageKey)).toBe(previousRaw)
    expect(screen.getByRole('status')).toHaveTextContent('有未保存的微调')

    fireEvent.click(screen.getByRole('button', { name: '保存本机微调' }))
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')).toMatchObject({
        occurrences: { o001: { startMs: 60 } },
      })
    })
    expect(screen.getByText('本机微调已保存。')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    expect(screen.getByText('40 ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存本机微调' }))
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')).toMatchObject({
        occurrences: { o001: { startMs: 40 } },
      })
    })

    view.unmount()
    render(
      <TimingDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByText('40 ms')).toBeInTheDocument())
    setItem.mockRestore()
  })

  it('does not re-associate stale-identity overrides with the current Edition', async () => {
    const storageKey = getTimingOverridesStorageKey('first-light')
    const staleRaw = JSON.stringify({
      schemaVersion: 3,
      songId: 'first-light',
      editionContentHash: 'd'.repeat(64),
      audioSourceHash: edition.audio.sourceHash,
      baseTimelineUrl: edition.timelineUrl,
      occurrences: { o001: { startMs: 40 } },
    })
    window.localStorage.setItem(storageKey, staleRaw)
    render(
      <TimingDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await screen.findByRole('heading', { name: '播放切口调试' })
    // Runtime loading applies D-021's existing invalidation rule before the Debugger reads overrides.
    expect(window.localStorage.getItem(storageKey)).toBeNull()
    expect(screen.getByText('50 ms')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: '+20ms' })[0])
    expect(screen.getByText('70 ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存本机微调' }))
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')).toMatchObject({
        editionContentHash: edition.contentHash,
        occurrences: { o001: { startMs: 70 } },
      })
    })
  })

  it('detects a stored-value change made after the editing session opened', async () => {
    const storageKey = getTimingOverridesStorageKey('first-light')
    render(
      <TimingDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await screen.findByRole('heading', { name: '播放切口调试' })
    fireEvent.click(screen.getAllByRole('button', { name: '+20ms' })[0])
    const externalRaw = JSON.stringify({
      schemaVersion: 3,
      songId: 'first-light',
      editionContentHash: edition.contentHash,
      audioSourceHash: edition.audio.sourceHash,
      baseTimelineUrl: edition.timelineUrl,
      occurrences: { o001: { startMs: 90 } },
    })
    window.localStorage.setItem(storageKey, externalRaw)

    fireEvent.click(screen.getByRole('button', { name: '保存本机微调' }))
    expect(await screen.findByText(/页面打开后发生变化/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存本机微调' })).toBeDisabled()
    expect(window.localStorage.getItem(storageKey)).toBe(externalRaw)
    expect(screen.getByText('70 ms')).toBeInTheDocument()
  })

  it('does not add a rejected boundary adjustment to undo history', async () => {
    render(
      <TimingDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await screen.findByRole('heading', { name: '播放切口调试' })
    fireEvent.click(screen.getAllByRole('button', { name: '-100ms' })[0])
    expect(screen.getByText('50 ms')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '撤销' })).toBeDisabled()
  })
})
