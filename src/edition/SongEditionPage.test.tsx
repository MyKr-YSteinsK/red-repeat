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
import {
  RuntimeClientError,
  type RuntimeClient,
  type RuntimeClientErrorKind,
} from '../runtime/runtime-client'
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
  coverUrl: '/library-runtime/cover.webp',
  editionUrl: '/library-runtime/edition.json',
}

const edition: RuntimeEdition = {
  contractVersion: 3,
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
    { id: 'p001', sectionId: 'verse', label: '主歌 A', occurrenceIds: ['o001', 'o002'] },
  ],
}

describe('SongEditionPage 学唱入口', () => {
  it('defaults to the Chinese Practice workspace without Focus or Immersive primary controls', async () => {
    render(<SongEditionPage {...propsFor()} />)

    expect(await screen.findByRole('heading', { name: 'First Light' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '学唱' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('region', { name: '学唱工作台' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '主歌 A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '播放第 01 句' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Focus' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Immersive' })).not.toBeInTheDocument()
  })

  it('opens the high-quality cover in a centered backdrop without a close button', async () => {
    render(<SongEditionPage {...propsFor()} />)

    await screen.findByRole('heading', { name: 'First Light' })
    const trigger = screen.getByRole('button', {
      name: '查看First Light封面大图',
    })
    expect(trigger.querySelector('img')).toHaveAttribute(
      'src',
      '/app/library-runtime/cover.webp',
    )

    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'First Light封面预览' })
    const image = screen.getByRole('img', { name: 'First Light封面大图' })
    expect(image).toHaveAttribute(
      'src',
      '/app/library-runtime/cover-large.webp',
    )
    expect(dialog.querySelector('button')).toBeNull()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(image)
    expect(screen.getByRole('dialog', { name: 'First Light封面预览' })).toBeInTheDocument()

    fireEvent.click(dialog.parentElement!)
    expect(screen.queryByRole('dialog', { name: 'First Light封面预览' })).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    expect(trigger).toHaveFocus()
  })

  it('closes the cover backdrop with Escape', async () => {
    render(<SongEditionPage {...propsFor()} />)

    await screen.findByRole('heading', { name: 'First Light' })
    const trigger = screen.getByRole('button', {
      name: '查看First Light封面大图',
    })
    fireEvent.click(trigger)

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'First Light封面预览' })).not.toBeInTheDocument()
    })
    expect(trigger).toHaveFocus()
  })

  it('keeps 全曲 and 讲解 as explicit transition tabs', async () => {
    render(<SongEditionPage {...propsFor()} />)
    await screen.findByRole('heading', { name: 'First Light' })

    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    expect(screen.getByRole('region', { name: '全曲歌词' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: '全曲播放器' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Focus' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Immersive' })).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'f' })
    fireEvent.keyDown(window, { key: 'l' })
    expect(screen.queryByText('渐速练习')).not.toBeInTheDocument()
    expect(screen.queryByText('Loop')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '讲解' }))
    expect(screen.queryByRole('region', { name: '学唱工作台' })).not.toBeInTheDocument()
    expect(screen.getByText('A small note.')).toBeInTheDocument()
  })

  it('hands a selected Full Song line to the first occurrence of its Practice Unit', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    render(<SongEditionPage {...propsFor(undefined, engine)} />)
    await screen.findByRole('heading', { name: 'First Light' })

    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    fireEvent.click(
      screen.getByRole('button', { name: '从这里连续播放：Second line' }),
    )
    await waitFor(() => expect(media.play).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '开始学这一段 →' }))

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '学唱工作台' })).toHaveAttribute(
        'data-current-occurrence-id',
        'o001',
      )
    })
    expect(media.play).toHaveBeenCalledOnce()
  })

  it('keeps the same audio session across Full Song to Practice without reload, reset, or autoplay', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    render(<SongEditionPage {...propsFor(undefined, engine)} />)
    await screen.findByRole('heading', { name: 'First Light' })

    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    await waitFor(() => expect(media.load).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledOnce())
    media.currentTime = 0.62
    const loadCount = media.load.mock.calls.length
    const playCount = media.play.mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: '学唱' }))
    await screen.findByRole('region', { name: '学唱工作台' })

    expect(media.load).toHaveBeenCalledTimes(loadCount)
    expect(media.currentTime).toBe(0.62)
    expect(media.play).toHaveBeenCalledTimes(playCount)
  })

  it('keeps Full Song structure stable while switching tabs', async () => {
    render(<SongEditionPage {...propsFor()} />)
    await screen.findByRole('heading', { name: 'First Light' })
    fireEvent.click(screen.getByRole('button', { name: '全曲' }))

    const before = screen
      .getByRole('region', { name: '全曲歌词' })
      .querySelectorAll('[data-occurrence-id]').length
    expect(
      screen
        .getByRole('region', { name: '全曲歌词' })
        .querySelectorAll('[data-occurrence-id]').length,
    ).toBe(before)
    expect(screen.getByRole('complementary', { name: '全曲播放器' })).toBeInTheDocument()
  })

  it('plays the clicked real occurrence and preserves the engine across tabs', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const loadCountBeforeRender = media.load.mock.calls.length
    render(<SongEditionPage {...propsFor(undefined, engine)} />)
    await screen.findByRole('heading', { name: 'First Light' })
    await waitFor(() => expect(media.load).toHaveBeenCalledTimes(loadCountBeforeRender + 1))

    fireEvent.click(screen.getByRole('button', { name: '播放第 01 句' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledOnce())
    expect(media.currentTime).toBe(0.05)

    expect(media.load).toHaveBeenCalledTimes(loadCountBeforeRender + 1)
    expect(screen.getByRole('region', { name: '学唱工作台' })).toBeInTheDocument()
  })

  it('keeps edition loading errors recoverable', async () => {
    render(<SongEditionPage {...propsFor(new Error('offline'))} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '无法读取这首歌的内容，请重试。',
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The edition resources returned an unexpected error.',
    )
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回曲库' })).toHaveAttribute(
      'href',
      '/red-repeat/',
    )
  })

  it.each([
    [
      'offline-not-downloaded',
      '这首歌的当前版本尚未下载，离线时无法打开。',
    ],
    [
      'download-incomplete',
      '这首歌的本地下载不完整，请联网后重新下载。',
    ],
    [
      'schema',
      '歌曲 Runtime 数据格式无效，请联网重试或重新下载。',
    ],
  ] satisfies Array<[RuntimeClientErrorKind, string]>)(
    'distinguishes the %s recovery message',
    async (kind, message) => {
      render(
        <SongEditionPage
          {...propsFor(new RuntimeClientError({
            kind,
            logicalPath: catalogEdition.editionUrl,
            url: catalogEdition.editionUrl,
            message: kind,
          }))}
        />,
      )

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
    },
  )
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
  _editorialStartMs: number,
  _editorialEndMs: number,
  effectiveStartMs: number,
  effectiveEndMs: number,
) {
  return {
    id,
    segmentId,
    sectionId: 'verse',
    startMs: effectiveStartMs,
    endMs: effectiveEndMs,
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
