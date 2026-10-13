import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioEngine,
  type AudioEngine,
  type AudioMediaAdapter,
} from '../audio/audio-engine'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  PracticeDocument,
  TimelineDocument,
} from '../library/schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import { ExplainWorkspace } from './ExplainWorkspace'

let activeEngine: AudioEngine | undefined

afterEach(() => {
  cleanup()
  activeEngine?.dispose()
  activeEngine = undefined
  window.localStorage.clear()
})

describe('ExplainWorkspace', () => {
  it('loads only the selected article and switches between topics', async () => {
    render(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
      />,
    )

    expect(screen.getByRole('region', { name: '讲解工作台' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Context' })).toBeInTheDocument()
    expect(await screen.findByText('First body.')).toBeInTheDocument()
    expect(screen.queryByText('Second body.')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Context' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'History' }))

    expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument()
    expect(await screen.findByText('Second body.')).toBeInTheDocument()
    expect(screen.queryByText('First body.')).not.toBeInTheDocument()
  })

  it('keeps Feature failures local and offers retry for the selected topic', async () => {
    const loadFeature = vi.fn()
      .mockResolvedValueOnce('# Context\n\nFirst body.')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('# History\n\nSecond body.')
    const runtimeClient = runtimeClientFor(
      loadFeature as RuntimeClient['loadFeature'],
    )
    render(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClient}
      />,
    )

    expect(await screen.findByText('First body.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(await screen.findByText('这篇讲解暂时不可用，歌词练习仍然可以使用。')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /history（暂不可用）/i })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: '重试加载' }))
    expect(await screen.findByText('Second body.')).toBeInTheDocument()
    expect(loadFeature).toHaveBeenCalledTimes(3)
  })

  it('shows an explicit Chinese empty workspace when no Features exist', () => {
    const emptyModel = assembleRuntimeSongEdition({
      ...modelInput,
      edition: { ...modelInput.edition, features: [] },
      features: [],
    })

    render(
      <ExplainWorkspace
        model={emptyModel}
        runtimeClient={runtimeClientFor()}
      />,
    )

    expect(screen.getByRole('region', { name: '讲解工作台' })).toHaveTextContent(
      '这首歌暂时没有讲解内容。',
    )
  })

  it('keeps lyric quotes available for listening without a Practice CTA', async () => {
    render(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
      />,
    )

    expect(await screen.findByRole('button', { name: '试听这句' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '学习这一段 →' }),
    ).not.toBeInTheDocument()
  })

  it('reuses the current audio session when explain rerenders', () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    engine.loadSource('/app/library-runtime/audio.m4a')
    media.currentTime = 0.62
    const loadCount = media.load.mock.calls.length
    const runtimeClient = runtimeClientFor()
    const { rerender } = render(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClient}
        audioEngine={engine}
      />,
    )

    rerender(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClient}
        audioEngine={engine}
      />,
    )

    expect(media.load).toHaveBeenCalledTimes(loadCount)
    expect(media.currentTime).toBe(0.62)
    expect(media.play).not.toHaveBeenCalled()
  })

  it('returns to the top without changing the selected topic', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    try {
      render(
        <ExplainWorkspace
          model={model}
          runtimeClient={runtimeClientFor()}
        />,
      )

      await screen.findByRole('heading', { name: 'Context' })
      fireEvent.click(screen.getByRole('button', { name: '回到顶部' }))

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      expect(screen.getByRole('heading', { name: 'Context' })).toBeInTheDocument()
    } finally {
      scrollTo.mockRestore()
    }
  })

  it('keeps directory changes anchored and reveals pager changes at a stable offset', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.tagName === 'H3') {
          return { top: 420, bottom: 500 } as DOMRect
        }
        return { top: 0, bottom: 0 } as DOMRect
      })

    try {
      render(
        <ExplainWorkspace
          model={model}
          runtimeClient={runtimeClientFor()}
        />,
      )

      await screen.findByRole('heading', { name: 'Context' })
      fireEvent.click(screen.getByRole('button', { name: 'History' }))
      expect(scrollTo).not.toHaveBeenCalled()

      scrollTo.mockClear()
      fireEvent.click(screen.getByRole('button', { name: '← 上一篇' }))
      expect(scrollTo).toHaveBeenCalledWith({ top: 324, behavior: 'auto' })
    } finally {
      rect.mockRestore()
      scrollTo.mockRestore()
    }
  })

  it('keeps previous, top, and next actions in a symmetric footer order', async () => {
    render(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
      />,
    )

    await screen.findByRole('heading', { name: 'Context' })
    const pager = screen.getByRole('navigation', { name: '讲解主题翻页' })
    const buttons = [...pager.querySelectorAll('button')]
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      '← 上一篇',
      '回到顶部',
      '下一篇 →',
    ])
    expect(buttons[0]).toHaveClass('explain-topic-pager-previous')
    expect(buttons[1]).toHaveClass('explain-scroll-top')
    expect(buttons[2]).toHaveClass('explain-topic-pager-next')
    buttons.forEach((button) => expect(button).toHaveClass('control-button'))
    expect(screen.getByRole('button', { name: 'Context' })).not.toHaveClass('control-button')

    fireEvent.click(screen.getByRole('button', { name: '下一篇 →' }))
    expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '← 上一篇' }))
    expect(await screen.findByRole('heading', { name: 'Context' })).toBeInTheDocument()
  })
})

const firstDescriptor = {
  id: '01-context',
  url: '/library-runtime/features/01-context.md',
}

const secondDescriptor = {
  id: '02-history',
  url: '/library-runtime/features/02-history.md',
}

const features = [
  { descriptor: firstDescriptor, content: '# Context\n\nFirst body.\n\n[[segment:s001]]' },
  { descriptor: secondDescriptor, content: '# History\n\nSecond body.' },
]

const modelInput = {
  catalogEdition: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    coverUrl: '/library-runtime/cover.webp',
    editionUrl: '/library-runtime/edition.json',
  } satisfies CatalogEdition,
  edition: {
    contractVersion: 3,
    contentHash: 'a'.repeat(64),
    song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
    lyricsUrl: '/library-runtime/lyrics.json',
    timelineUrl: '/library-runtime/timeline.json',
    practiceUrl: '/library-runtime/practice.json',
    features: [firstDescriptor, secondDescriptor],
    audio: {
      url: '/library-runtime/audio.m4a',
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
      coverSmallUrl: '/library-runtime/cover.webp',
      coverLargeUrl: '/library-runtime/cover-large.webp',
    },
  } satisfies RuntimeEdition,
  lyrics: {
    segments: [{ id: 's001', lyrics: 'Real lyric', translation: '真实翻译' }],
  } satisfies LyricsDocument,
  timeline: {
    audioSourceHash: 'a'.repeat(64),
    sections: [{ id: 'verse', label: '主歌 A', startMs: 0, endMs: 1000 }],
    occurrences: [
      {
        id: 'o001',
        segmentId: 's001',
        sectionId: 'verse',
        startMs: 50,
        endMs: 300,
      },
    ],
  } satisfies TimelineDocument,
  practice: {
    units: [{ id: 'p001', sectionId: 'verse', label: '主歌 A', occurrenceIds: ['o001'] }],
  } satisfies PracticeDocument,
  features,
}

const model = assembleRuntimeSongEdition(modelInput)

function runtimeClientFor(
  loadFeature: RuntimeClient['loadFeature'] = async (feature) => {
    const url = typeof feature === 'string' ? feature : feature.url
    return url === firstDescriptor.url
      ? features[0].content
      : features[1].content
  },
): RuntimeClient {
  return {
    resolveAsset: (logicalPath: string) => `/app${logicalPath}`,
    loadFeature,
  } as unknown as RuntimeClient
}

class FakeMedia implements AudioMediaAdapter {
  src = ''
  currentTime = 0
  duration = 2
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
}
