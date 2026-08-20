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
import type { RuntimeClient } from '../runtime/runtime-client'
import { PracticeWorkspace } from './PracticeWorkspace'

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
  recommendedTheme: 'liner',
  coverUrl: '/library-runtime/cover.webp',
  editionUrl: '/library-runtime/edition.json',
}

const edition: RuntimeEdition = {
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
    durationMs: 3000,
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
    coverLargeUrl: '/library-runtime/cover-large.webp',
  },
}

const lyrics: LyricsDocument = {
  segments: [
    { id: 's001', lyrics: 'First line', translation: '第一句', layers: [{ id: 'reading', label: 'Reading', text: 'ファースト' }] },
    { id: 's002', lyrics: 'Second line', translation: '第二句' },
    { id: 's003', lyrics: 'Third line', translation: '第三句' },
    { id: 's004', lyrics: 'Fourth line', translation: '第四句' },
  ],
}

const timeline: TimelineDocument = {
  audioSourceHash: 'a'.repeat(64),
  sections: [
    { id: 'verse', label: 'Verse', startMs: 0, endMs: 1600 },
    { id: 'chorus', label: 'Chorus', startMs: 1600, endMs: 2800 },
  ],
  occurrences: [
    occurrence('o001', 's001', 'verse', 100, 300, 50, 350),
    occurrence('o002', 's002', 'verse', 450, 700, 400, 750),
    occurrence('o003', 's003', 'verse', 850, 1100, 800, 1150),
    occurrence('o004', 's004', 'chorus', 1800, 2100, 1750, 2150),
  ],
}

const practice: PracticeDocument = {
  units: [
    { id: 'p001', sectionId: 'verse', label: '主歌 A', occurrenceIds: ['o001', 'o002'] },
    { id: 'p002', sectionId: 'verse', label: '主歌 B', occurrenceIds: ['o003'] },
    { id: 'p003', sectionId: 'chorus', label: '副歌', occurrenceIds: ['o004'] },
  ],
}

const model = assembleRuntimeSongEdition({
  catalogEdition,
  edition,
  lyrics,
  timeline,
  practice,
  visual: { recommendedTheme: 'liner' } satisfies VisualDocument,
  features: [],
})

describe('PracticeWorkspace', () => {
  it('completes current sentence, covered range, unit, and next-unit actions', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const playRange = vi.spyOn(engine, 'playRange')

    render(
      <PracticeWorkspace
        model={model}
        runtimeClient={runtimeClient}
        audioEngine={engine}
        theme="liner"
      />,
    )

    expect(screen.getByRole('heading', { name: '主歌 A' })).toBeInTheDocument()
    expect(screen.getByText('First line')).toBeInTheDocument()
    expect(screen.getByText('第一句')).toBeInTheDocument()
    expect(screen.getByText('Reading')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '播放第 o001 句' }))
    expect(playRange).toHaveBeenLastCalledWith(
      { startMs: 50, endMs: 350, occurrenceIds: ['o001'] },
      'o001',
    )

    fireEvent.click(screen.getByRole('button', { name: '↓ 下一句' }))
    expect(screen.getByRole('region', { name: '学唱工作台' })).toHaveAttribute('data-current-occurrence-id', 'o002')
    expect(screen.getByText('已学到这里：01–02')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '已学到这里 · 连续播放' }))
    expect(playRange).toHaveBeenLastCalledWith(
      { startMs: 50, endMs: 750, occurrenceIds: ['o001', 'o002'] },
      'o002',
    )

    fireEvent.click(screen.getByRole('button', { name: '当前学习段 · 整段播放' }))
    expect(playRange).toHaveBeenLastCalledWith(
      { startMs: 50, endMs: 750, occurrenceIds: ['o001', 'o002'] },
      'o002',
    )

    fireEvent.click(screen.getByRole('button', { name: '下一段 →' }))
    expect(screen.getByRole('heading', { name: '主歌 B' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '学唱工作台' })).toHaveAttribute('data-current-occurrence-id', 'o003')
  })

  it('restores the last position after remount without starting playback', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const view = render(
      <PracticeWorkspace
        model={model}
        runtimeClient={runtimeClient}
        audioEngine={engine}
        theme="nocturne"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '播放第 o001 句' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: '↓ 下一句' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledTimes(2))
    const playCountBeforeRemount = media.play.mock.calls.length
    view.unmount()
    render(
      <PracticeWorkspace
        model={model}
        runtimeClient={runtimeClient}
        audioEngine={engine}
        theme="nocturne"
      />,
    )

    expect(screen.getByRole('region', { name: '学唱工作台' })).toHaveAttribute('data-current-occurrence-id', 'o002')
    expect(media.play).toHaveBeenCalledTimes(playCountBeforeRemount)
  })

  it('keeps core controls available without Focus or Immersive modes', () => {
    render(
      <PracticeWorkspace
        model={model}
        runtimeClient={runtimeClient}
        theme="cinema"
      />,
    )

    expect(screen.getByRole('button', { name: '再听这句' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '↓ 下一句' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Focus' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Immersive' })).not.toBeInTheDocument()
  })
})

const runtimeClient = {
  resolveAsset: (logicalPath: string) => `/app${logicalPath}`,
} as unknown as RuntimeClient

function occurrence(
  id: string,
  segmentId: string,
  sectionId: string,
  startMs: number,
  endMs: number,
  playStartMs: number,
  playEndMs: number,
) {
  return { id, segmentId, sectionId, startMs, endMs, playStartMs, playEndMs }
}

class FakeMedia implements AudioMediaAdapter {
  src = ''
  currentTime = 0
  duration = 3
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
