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
  it('shows one article at a time and switches between available topics', () => {
    render(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
        features={features}
        featureErrors={[]}
      />,
    )

    expect(screen.getByRole('region', { name: '讲解工作台' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Context' })).toBeInTheDocument()
    expect(screen.getByText('First body.')).toBeInTheDocument()
    expect(screen.queryByText('Second body.')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Context' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'History' }))

    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument()
    expect(screen.getByText('Second body.')).toBeInTheDocument()
    expect(screen.queryByText('First body.')).not.toBeInTheDocument()
  })

  it('keeps Feature failures local and marks an unavailable topic in Chinese', () => {
    render(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
        features={[features[0]]}
        featureErrors={[{ descriptor: secondDescriptor, error: new Error('offline') }]}
      />,
    )

    expect(screen.getByText('First body.')).toBeInTheDocument()
    expect(screen.getByText('暂不可用')).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: /history（暂不可用）/i }),
    ).toBeDisabled()
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
        features={[]}
        featureErrors={[]}
      />,
    )

    expect(screen.getByRole('region', { name: '讲解工作台' })).toHaveTextContent(
      '这首歌暂时没有讲解内容。',
    )
  })

  it('hands a selected quote to Practice without autoplay or progress state changes', () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    engine.loadSource('/app/library-runtime/audio.m4a')
    const onStartPracticeUnit = vi.fn()

    render(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
        features={features}
        featureErrors={[]}
        audioEngine={engine}
        onStartPracticeUnit={onStartPracticeUnit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '学习这一段 →' }))

    expect(onStartPracticeUnit).toHaveBeenCalledWith('p001')
    expect(media.play).not.toHaveBeenCalled()
    expect(engine.getState().activeOccurrenceId).toBeUndefined()
  })

  it('reuses the current audio session when explain rerenders', () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    engine.loadSource('/app/library-runtime/audio.m4a')
    media.currentTime = 0.62
    const loadCount = media.load.mock.calls.length
    const { rerender } = render(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
        features={features}
        featureErrors={[]}
        audioEngine={engine}
      />,
    )

    rerender(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
        features={features}
        featureErrors={[]}
        audioEngine={engine}
      />,
    )

    expect(media.load).toHaveBeenCalledTimes(loadCount)
    expect(media.currentTime).toBe(0.62)
    expect(media.play).not.toHaveBeenCalled()
  })

  it('returns to the top without changing the selected topic', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    try {
      render(
        <ExplainWorkspace
          model={model}
          runtimeClient={runtimeClientFor()}
          features={features}
          featureErrors={[]}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: '回到顶部' }))

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      expect(screen.getByRole('heading', { name: 'Context' })).toBeInTheDocument()
    } finally {
      scrollTo.mockRestore()
    }
  })

  it('keeps previous, top, and next actions in a symmetric footer order', () => {
    render(
      <ExplainWorkspace
        model={model}
        runtimeClient={runtimeClientFor()}
        features={features}
        featureErrors={[]}
      />,
    )

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
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '← 上一篇' }))
    expect(screen.getByRole('heading', { name: 'Context' })).toBeInTheDocument()
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
        startMs: 100,
        endMs: 250,
        playStartMs: 50,
        playEndMs: 300,
      },
    ],
  } satisfies TimelineDocument,
  practice: {
    units: [{ id: 'p001', sectionId: 'verse', label: '主歌 A', occurrenceIds: ['o001'] }],
  } satisfies PracticeDocument,
  features,
}

const model = assembleRuntimeSongEdition(modelInput)

function runtimeClientFor(): RuntimeClient {
  return {
    resolveAsset: (logicalPath: string) => `/app${logicalPath}`,
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
