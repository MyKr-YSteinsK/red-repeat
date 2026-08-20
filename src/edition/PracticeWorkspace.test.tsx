import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioEngine,
  type AudioEngine,
  type AudioMediaAdapter,
  type FrameScheduler,
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

const resumeTimeline: TimelineDocument = {
  audioSourceHash: 'a'.repeat(64),
  sections: [{ id: 'resume-verse', label: 'Resume Verse', startMs: 0, endMs: 3200 }],
  occurrences: [
    occurrence('o001', 's001', 'resume-verse', 1100, 1900, 1000, 2000),
    occurrence('o002', 's002', 'resume-verse', 2100, 2900, 2000, 3000),
  ],
}

const resumePractice: PracticeDocument = {
  units: [
    { id: 'p001', sectionId: 'resume-verse', label: 'Resume Unit', occurrenceIds: ['o001', 'o002'] },
  ],
}

const resumeModel = assembleRuntimeSongEdition({
  catalogEdition,
  edition,
  lyrics,
  timeline: resumeTimeline,
  practice: resumePractice,
  visual: { recommendedTheme: 'liner' } satisfies VisualDocument,
  features: [],
})

describe('PracticeWorkspace', () => {
  it('completes current sentence, covered range, unit, and next-unit actions', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const playRange = vi.spyOn(engine, 'playRangeUntilComplete')

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

  it('keeps the mobile map compact while preserving the current unit context', () => {
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }),
    })
    try {
      render(
        <PracticeWorkspace
          model={model}
          runtimeClient={runtimeClient}
          theme="liner"
        />,
      )
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      })
    }

    const mapToggle = screen.getByText('歌曲地图').closest('summary')
    expect(mapToggle).not.toBeNull()
    expect(mapToggle).toHaveAccessibleName(/01 \/ 03/)
    const mapDetails = mapToggle!.parentElement as HTMLDetailsElement
    expect(mapDetails).not.toHaveAttribute('open')
    expect(screen.getByText('展开')).toBeInTheDocument()
    expect(screen.getByText('01 / 03 · 主歌 A')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '主歌 A' })).toBeInTheDocument()
    expect(screen.getByText('First line')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再听这句' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '↓ 下一句' })).toBeInTheDocument()

    fireEvent.click(mapToggle!)
    fireEvent(mapDetails, new Event('toggle'))
    expect(screen.getByText('收起')).toBeInTheDocument()
    expect(mapDetails).toHaveAttribute('open')
    expect(screen.getByRole('heading', { name: '主歌 A' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /02主歌 B/ }))
    expect(screen.getByRole('heading', { name: '主歌 B' })).toBeInTheDocument()

    const collapseMap = screen.getByText('歌曲地图').closest('summary')
    expect(collapseMap).not.toBeNull()
    fireEvent.click(collapseMap!)
    fireEvent(mapDetails, new Event('toggle'))
    expect(screen.getByText('展开')).toBeInTheDocument()
    expect(mapDetails).not.toHaveAttribute('open')
    expect(screen.getByRole('heading', { name: '主歌 B' })).toBeInTheDocument()

    const reopenMap = screen.getByText('歌曲地图').closest('summary')
    expect(reopenMap).not.toBeNull()
    fireEvent.click(reopenMap!)
    fireEvent(mapDetails, new Event('toggle'))
    expect(mapDetails).toHaveAttribute('open')
    expect(screen.getByRole('heading', { name: '主歌 B' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '学唱工作台' })).toHaveAttribute(
      'data-current-occurrence-id',
      'o003',
    )
  })

  it('resumes a paused current occurrence from the observed timestamp', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    activeEngine = engine
    const playRange = vi.spyOn(engine, 'playRangeUntilComplete')

    render(
      <PracticeWorkspace
        model={resumeModel}
        runtimeClient={runtimeClient}
        audioEngine={engine}
        theme="liner"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '播放第 o001 句' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledTimes(1))
    expect(playRange).toHaveBeenLastCalledWith(
      { startMs: 1000, endMs: 2000, occurrenceIds: ['o001'] },
      'o001',
    )

    media.currentTime = 1.45
    frames.flush()
    expect(engine.getState().currentTimeMs).toBe(1450)

    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '继续' })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    await waitFor(() =>
      expect(playRange).toHaveBeenLastCalledWith(
        { startMs: 1450, endMs: 2000, occurrenceIds: ['o001'] },
        'o001',
      ),
    )
  })

  it('preserves a range end and clears resume state on restart, navigation, and completion', async () => {
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    activeEngine = engine
    const playRange = vi.spyOn(engine, 'playRangeUntilComplete')

    render(
      <PracticeWorkspace
        model={resumeModel}
        runtimeClient={runtimeClient}
        audioEngine={engine}
        theme="liner"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '↓ 下一句' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: '已学到这里 · 连续播放' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledTimes(2))
    expect(playRange).toHaveBeenLastCalledWith(
      { startMs: 1000, endMs: 3000, occurrenceIds: ['o001', 'o002'] },
      'o002',
    )

    media.currentTime = 2.45
    frames.flush()
    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '继续' })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    await waitFor(() =>
      expect(playRange).toHaveBeenLastCalledWith(
        { startMs: 2450, endMs: 3000, occurrenceIds: ['o001', 'o002'] },
        'o002',
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: '播放第 o001 句' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledTimes(4))
    expect(playRange).toHaveBeenLastCalledWith(
      { startMs: 1000, endMs: 2000, occurrenceIds: ['o001'] },
      'o001',
    )

    fireEvent.click(screen.getByRole('button', { name: '再听这句' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledTimes(5))
    expect(playRange).toHaveBeenLastCalledWith(
      { startMs: 1000, endMs: 2000, occurrenceIds: ['o001'] },
      'o001',
    )

    media.currentTime = 3
    frames.flush()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument(),
    )
    fireEvent.keyDown(window, { key: ' ', code: 'Space' })
    await waitFor(() =>
      expect(playRange).toHaveBeenLastCalledWith(
        { startMs: 1000, endMs: 2000, occurrenceIds: ['o001'] },
        'o001',
      ),
    )
  })

  it('selects a same-unit custom range in either endpoint order and keeps it after a one-shot click', () => {
    const engine = createAudioEngine(new FakeMedia())
    activeEngine = engine
    const playRange = vi.spyOn(engine, 'playRangeUntilComplete')

    render(
      <PracticeWorkspace
        model={model}
        runtimeClient={runtimeClient}
        audioEngine={engine}
        theme="liner"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '自选范围' }))
    fireEvent.click(
      screen.getByRole('button', { name: '选择第 o002 句作为范围端点' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: '选择第 o001 句作为范围端点' }),
    )

    expect(screen.getByText(/自选范围：o001 → o002 · 2 句 · 0.70 秒/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '自选范围' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      document.querySelector('[data-occurrence-id="o001"]'),
    ).toHaveClass('is-in-custom-range')

    fireEvent.click(screen.getByRole('button', { name: '播放第 o001 句' }))
    expect(playRange).toHaveBeenLastCalledWith(
      { startMs: 50, endMs: 350, occurrenceIds: ['o001'] },
      'o001',
    )
    expect(screen.getByText(/自选范围：o001 → o002/)).toBeInTheDocument()
  })

  it('keeps a custom-range anchor across unit navigation and plays a continuous cross-unit range', () => {
    const engine = createAudioEngine(new FakeMedia())
    activeEngine = engine
    const playRange = vi.spyOn(engine, 'playRangeUntilComplete')

    render(
      <PracticeWorkspace
        model={model}
        runtimeClient={runtimeClient}
        audioEngine={engine}
        theme="liner"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '自选范围' }))
    fireEvent.click(
      screen.getByRole('button', { name: '选择第 o002 句作为范围端点' }),
    )
    fireEvent.click(screen.getByRole('button', { name: /02主歌 B/ }))
    expect(screen.getByText(/已保留起点 o002/)).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: '选择第 o003 句作为范围端点' }),
    )

    expect(screen.getByText(/自选范围：o002 → o003 · 2 句 · 0.75 秒/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    expect(playRange).toHaveBeenLastCalledWith(
      { startMs: 400, endMs: 1150, occurrenceIds: ['o002', 'o003'] },
      'o003',
    )

    fireEvent.click(screen.getByRole('button', { name: /01主歌 A/ }))
    expect(screen.getByText(/自选范围：o002 → o003/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清除自选范围' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '清除自选范围' }))
    expect(screen.getByRole('button', { name: '自选范围' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByText(/当前句：o001/)).toBeInTheDocument()
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

class FakeFrameScheduler implements FrameScheduler {
  private pendingCallback: (() => void) | undefined

  requestFrame(callback: () => void): unknown {
    this.pendingCallback = callback
    return callback
  }

  cancelFrame(handle: unknown): void {
    if (handle === this.pendingCallback) {
      this.pendingCallback = undefined
    }
  }

  flush(): void {
    const callback = this.pendingCallback
    this.pendingCallback = undefined
    callback?.()
  }
}
