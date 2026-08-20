import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import { SongEditionPage, type SongEditionPageProps } from './SongEditionPage'

let activeEngine: AudioEngine | undefined

afterEach(() => {
  cleanup()
  activeEngine?.dispose()
  activeEngine = undefined
  window.localStorage.clear()
})

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  album: 'Returning',
  year: 2026,
  recommendedTheme: 'liner',
  coverUrl: '/library-runtime/cover.webp',
  editionUrl: '/library-runtime/edition.json',
}

const edition: RuntimeEdition = {
  contractVersion: 2,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    album: 'Returning',
    year: 2026,
  },
  lyricsUrl: '/library-runtime/lyrics.json',
  timelineUrl: '/library-runtime/timeline.json',
  practiceUrl: '/library-runtime/practice.json',
  visualUrl: '/library-runtime/visual.json',
  features: [
    {
      id: 'note',
      url: '/library-runtime/features/note.md',
    },
  ],
  audio: {
    url: '/library-runtime/audio.m4a',
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
    coverSmallUrl: '/library-runtime/cover.webp',
    coverLargeUrl: '/library-runtime/cover-large.webp',
  },
}

const lyrics: LyricsDocument = {
  segments: [
    { id: 's001', lyrics: 'First line', translation: '第一句' },
    { id: 's002', lyrics: 'Second line', translation: '第二句' },
  ],
}

const timeline: TimelineDocument = {
  audioSourceHash: 'a'.repeat(64),
  sections: [{ id: 'verse', label: 'Verse', startMs: 0, endMs: 1200 }],
  occurrences: [
    occurrence('o001', 's001', 100, 300, 50, 350),
    occurrence('o002', 's002', 500, 750, 450, 800),
  ],
}

const practice: PracticeDocument = {
  units: [
    { id: 'p001', sectionId: 'verse', label: '主歌 A', occurrenceIds: ['o001'] },
    { id: 'p002', sectionId: 'verse', label: '主歌 B', occurrenceIds: ['o002'] },
  ],
}

describe('SongEditionPage 学唱入口', () => {
  it('defaults to the Chinese Practice workspace without Focus or Immersive primary controls', async () => {
    render(<SongEditionPage {...propsFor()} />)

    expect(await screen.findByRole('heading', { name: 'First Light' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '学唱' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('region', { name: '学唱工作台' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '主歌 A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再听这句' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Focus' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Immersive' })).not.toBeInTheDocument()
  })

  it('keeps 全曲 and 讲解 as explicit transition tabs', async () => {
    render(<SongEditionPage {...propsFor()} />)
    await screen.findByRole('heading', { name: 'First Light' })

    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    expect(screen.getByLabelText('Song timeline playback')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '讲解' }))
    expect(screen.queryByRole('region', { name: '学唱工作台' })).not.toBeInTheDocument()
    expect(screen.getByText('A small note.')).toBeInTheDocument()
  })

  it('plays the clicked real occurrence and preserves the engine across Theme changes', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const loadCountBeforeRender = media.load.mock.calls.length
    render(<SongEditionPage {...propsFor(undefined, engine)} />)
    await screen.findByRole('heading', { name: 'First Light' })

    fireEvent.click(screen.getByRole('button', { name: '播放第 01 句' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledOnce())
    expect(media.currentTime).toBe(0.05)

    fireEvent.click(screen.getByRole('button', { name: 'Use Nocturne theme' }))
    expect(screen.getByRole('main')).toHaveAttribute('data-theme', 'nocturne')
    expect(media.load).toHaveBeenCalledTimes(loadCountBeforeRender + 1)
    expect(screen.getByRole('region', { name: '学唱工作台' })).toBeInTheDocument()
  })

  it('keeps edition loading errors recoverable', async () => {
    render(<SongEditionPage {...propsFor(new Error('offline'))} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The edition resources returned an unexpected error.',
    )
    expect(screen.getByRole('button', { name: 'Retry edition' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to Library' })).toHaveAttribute(
      'href',
      '/red-repeat/',
    )
  })
})

function propsFor(error?: Error, audioEngine?: AudioEngine): SongEditionPageProps {
  const client = {
    loadEdition: vi.fn(async () => {
      if (error) {
        throw error
      }
      return edition
    }),
    loadLyrics: vi.fn(async () => lyrics),
    loadTimeline: vi.fn(async () => timeline),
    loadPractice: vi.fn(async () => practice),
    loadVisual: vi.fn(async () => ({ recommendedTheme: 'liner' as const })),
    loadFeature: vi.fn(async () => '# Notes\n\nA small note.'),
    resolveAsset: vi.fn((logicalPath: string) => `/app${logicalPath}`),
  } as unknown as RuntimeClient

  return {
    catalogEdition,
    runtimeClient: client,
    homeHref: '/red-repeat/',
    audioEngine,
  }
}

function occurrence(
  id: string,
  segmentId: string,
  startMs: number,
  endMs: number,
  playStartMs: number,
  playEndMs: number,
) {
  return {
    id,
    segmentId,
    sectionId: 'verse',
    startMs,
    endMs,
    playStartMs,
    playEndMs,
  }
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
