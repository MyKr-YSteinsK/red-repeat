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
  VisualDocument,
} from '../library/schema'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import { ExplainLyricQuote } from './ExplainLyricQuote'

let activeEngine: AudioEngine | undefined

afterEach(() => {
  cleanup()
  activeEngine?.dispose()
  activeEngine = undefined
  window.localStorage.clear()
})

describe('ExplainLyricQuote', () => {
  it('renders Original, Translation, and the first Reading without Notes or internal IDs', () => {
    render(<ExplainLyricQuote model={model} segmentId="s021" />)

    expect(screen.getByText('First line')).toBeInTheDocument()
    expect(screen.getByText('第一句')).toBeInTheDocument()
    expect(screen.getByText('first reading')).toBeInTheDocument()
    expect(screen.queryByText('private note')).not.toBeInTheDocument()
    expect(screen.queryByText('s021')).not.toBeInTheDocument()
    expect(screen.queryByText('o001')).not.toBeInTheDocument()
  })

  it('does not autoplay when the quote mounts', () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    engine.loadSource('/audio.m4a')

    render(
      <ExplainLyricQuote
        model={model}
        segmentId="s021"
        audioEngine={engine}
      />,
    )

    expect(media.play).not.toHaveBeenCalled()
    expect(engine.getState().activeOccurrenceId).toBeUndefined()
  })

  it('plays the selected occurrence with the compatible effective timing range', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    engine.loadSource('/audio.m4a')
    window.localStorage.setItem(
      'red-repeat:timing-overrides:v1:first-light',
      JSON.stringify({
        schemaVersion: 1,
        songId: 'first-light',
        audioSourceHash: 'b'.repeat(64),
        baseTimelineUrl: '/library-runtime/timeline.json',
        occurrences: { o001: { playStartMs: 75, playEndMs: 325 } },
      }),
    )

    render(
      <ExplainLyricQuote
        model={model}
        segmentId="s021"
        audioEngine={engine}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '试听这句' }))

    await waitFor(() => {
      expect(engine.getState().activeRange).toEqual({
        startMs: 75,
        endMs: 325,
      })
    })
    expect(media.currentTime).toBe(0.075)
    expect(media.play).toHaveBeenCalledOnce()
  })

  it('ignores a stale Timing Override and uses the canonical range', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    engine.loadSource('/audio.m4a')
    window.localStorage.setItem(
      'red-repeat:timing-overrides:v1:first-light',
      JSON.stringify({
        schemaVersion: 1,
        songId: 'first-light',
        audioSourceHash: 'b'.repeat(64),
        baseTimelineUrl: '/old-timeline.json',
        occurrences: { o001: { playStartMs: 75, playEndMs: 325 } },
      }),
    )

    render(
      <ExplainLyricQuote
        model={model}
        segmentId="s021"
        audioEngine={engine}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '试听这句' }))

    await waitFor(() => {
      expect(engine.getState().activeRange).toEqual({
        startMs: 50,
        endMs: 300,
      })
    })
  })

  it('defaults to the chronological first occurrence and lets the selector choose the second', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    engine.loadSource('/audio.m4a')
    const { container } = render(
      <ExplainLyricQuote
        model={model}
        segmentId="s021"
        audioEngine={engine}
        onStartPracticeUnit={vi.fn()}
      />,
    )

    expect(container.querySelector('[data-selected-occurrence-id]')).toHaveAttribute(
      'data-selected-occurrence-id',
      'o001',
    )
    expect(screen.getByRole('option', { name: '第1次·主歌 A·00:00' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '第2次·主歌 A·00:00' })).toBeInTheDocument()
    expect(screen.queryByText('o001')).not.toBeInTheDocument()
    expect(screen.queryByText('p001')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: '选择出现位置' }), {
      target: { value: 'o002' },
    })
    expect(container.querySelector('[data-selected-occurrence-id]')).toHaveAttribute(
      'data-selected-occurrence-id',
      'o002',
    )
    fireEvent.click(screen.getByRole('button', { name: '试听这句' }))
    await waitFor(() => {
      expect(engine.getState().activeOccurrenceId).toBe('o002')
      expect(engine.getState().activeRange).toEqual({
        startMs: 450,
        endMs: 700,
      })
    })
  })

  it('hands the selected occurrence to its Practice Unit without autoplay or navigation', () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    engine.loadSource('/audio.m4a')
    const onStartPracticeUnit = vi.fn()
    render(
      <ExplainLyricQuote
        model={model}
        segmentId="s021"
        audioEngine={engine}
        onStartPracticeUnit={onStartPracticeUnit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '学习这一段 →' }))

    expect(onStartPracticeUnit).toHaveBeenCalledWith('p001')
    expect(media.play).not.toHaveBeenCalled()
  })

  it('shows a non-interactive fallback for a missing Segment', () => {
    render(<ExplainLyricQuote model={model} segmentId="s999" />)

    expect(screen.getByRole('note')).toHaveTextContent('这条歌词引用暂不可用。')
    expect(screen.queryByText('s999')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

const model = assembleRuntimeSongEdition({
  catalogEdition: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    recommendedTheme: 'liner',
    coverUrl: '/library-runtime/cover.webp',
    editionUrl: '/library-runtime/edition.json',
  } satisfies CatalogEdition,
  edition: {
    contractVersion: 2,
    contentHash: 'a'.repeat(64),
    song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
    lyricsUrl: '/library-runtime/lyrics.json',
    timelineUrl: '/library-runtime/timeline.json',
    practiceUrl: '/library-runtime/practice.json',
    visualUrl: '/library-runtime/visual.json',
    features: [],
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
    segments: [
      {
        id: 's021',
        lyrics: 'First line',
        translation: '第一句',
        layers: [{ id: 'reading', label: 'Reading', text: 'first reading' }],
        notes: [{ title: 'Private', body: 'private note' }],
      },
    ],
  } satisfies LyricsDocument,
  timeline: {
    audioSourceHash: 'a'.repeat(64),
    sections: [{ id: 'verse', label: '主歌 A', startMs: 0, endMs: 1000 }],
    occurrences: [
      {
        id: 'o001',
        segmentId: 's021',
        sectionId: 'verse',
        startMs: 100,
        endMs: 250,
        playStartMs: 50,
        playEndMs: 300,
      },
      {
        id: 'o002',
        segmentId: 's021',
        sectionId: 'verse',
        startMs: 500,
        endMs: 650,
        playStartMs: 450,
        playEndMs: 700,
      },
    ],
  } satisfies TimelineDocument,
  practice: {
    units: [
      {
        id: 'p001',
        sectionId: 'verse',
        label: '主歌 A',
        occurrenceIds: ['o001', 'o002'],
      },
    ],
  } satisfies PracticeDocument,
  visual: { recommendedTheme: 'liner' } satisfies VisualDocument,
  features: [],
})

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
