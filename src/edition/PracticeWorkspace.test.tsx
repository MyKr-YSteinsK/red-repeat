import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AudioEngine, AudioEngineState } from '../audio/audio-engine'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { PracticeDocument } from '../library/schema'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import { PracticeWorkspace } from './PracticeWorkspace'

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  coverUrl: '/library-runtime/cover.webp',
  editionUrl: '/library-runtime/edition.json',
}

const edition: RuntimeEdition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
  lyricsUrl: '/library-runtime/lyrics.json',
  timelineUrl: '/library-runtime/timeline.json',
  practiceUrl: '/library-runtime/practice.json',
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
    coverSmallUrl: '/library-runtime/cover.webp',
    coverLargeUrl: '/library-runtime/cover-large.webp',
  },
}

const timeline = {
  audioSourceHash: 'b'.repeat(64),
  sections: [
    { id: 'verse', label: 'Verse', startMs: 0, endMs: 2200 },
    { id: 'chorus', label: 'Chorus', startMs: 2200, endMs: 3000 },
  ],
  occurrences: [
    { id: 'o001', segmentId: 's001', sectionId: 'verse', startMs: 100, endMs: 400, playStartMs: 50, playEndMs: 450 },
    { id: 'o002', segmentId: 's002', sectionId: 'verse', startMs: 600, endMs: 900, playStartMs: 550, playEndMs: 950 },
    { id: 'o003', segmentId: 's003', sectionId: 'chorus', startMs: 2300, endMs: 2600, playStartMs: 2250, playEndMs: 2650 },
  ],
}

const practice: PracticeDocument = {
  units: [
    { id: 'p001', sectionId: 'verse', label: 'Verse', occurrenceIds: ['o001', 'o002'] },
    { id: 'p002', sectionId: 'chorus', label: 'Chorus', occurrenceIds: ['o003'] },
  ],
}

const model = assembleRuntimeSongEdition({
  catalogEdition,
  edition,
  lyrics: {
    segments: [
      { id: 's001', lyrics: 'First line', translation: '第一句' },
      { id: 's002', lyrics: 'Second line', translation: '第二句' },
      { id: 's003', lyrics: 'Chorus line', translation: '副歌' },
    ],
  },
  timeline,
  practice,
  features: [],
})

afterEach(() => cleanup())

describe('PracticeWorkspace 1.0', () => {
  it('shows only the compact high-frequency controls', () => {
    renderWorkspace()

    expect(screen.getByRole('region', { name: '学唱工作台' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '0.60x' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '0.80x' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1.00x' })).toBeInTheDocument()
    expect(screen.queryByText('已学到这里')).not.toBeInTheDocument()
    expect(screen.queryByText('自选范围')).not.toBeInTheDocument()
    expect(screen.queryByText('微调播放切口')).not.toBeInTheDocument()
    expect(screen.queryByText('展开练习控制')).not.toBeInTheDocument()
  })

  it('keeps the dock to context, primary, and mode rows with accessible ramp guidance', () => {
    const { container } = renderWorkspace()
    const dock = container.querySelector('.practice-dock')

    expect(dock).not.toBeNull()
    expect(dock?.querySelector('.practice-dock-navigation')).toBeNull()
    expect(dock?.querySelector('.practice-dock-topline')).toBeInTheDocument()
    expect(dock?.querySelector('.practice-dock-modes')).toBeInTheDocument()
    expect(dock?.querySelectorAll(':scope > div')).toHaveLength(3)
    expect(screen.getByRole('button', { name: '上一段' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下一段' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '1.00x' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const continuousButton = screen.getByRole('button', { name: '连续播放' })
    const rampButton = screen.getByRole('button', { name: '渐速练习' })
    fireEvent.click(continuousButton)
    fireEvent.click(rampButton)

    expect(continuousButton).toHaveAttribute('aria-pressed', 'true')
    expect(rampButton).toHaveAttribute('aria-pressed', 'true')
    expect(continuousButton.matches(".practice-dock .practice-action[aria-pressed='true']")).toBe(true)
    expect(rampButton.matches(".practice-dock .practice-action[aria-pressed='true']")).toBe(true)
    expect(screen.getByRole('button', { name: '0.60x' })).toHaveAttribute(
      'data-ramp-active',
      'true',
    )
    expect(screen.getByText(/开启渐速练习时/)).toBeInTheDocument()

    fireEvent.click(rampButton)
    fireEvent.click(continuousButton)
    expect(continuousButton).toHaveAttribute('aria-pressed', 'false')
    expect(rampButton).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '0.60x' })).toHaveAttribute(
      'data-ramp-active',
      'false',
    )
  })

  it('plays one occurrence at the selected speed when both toggles are off', async () => {
    const engine = createFakeEngine()
    renderWorkspace(engine)

    fireEvent.click(screen.getByRole('button', { name: '播放第 01 句' }))

    await waitFor(() => expect(engine.playRangeUntilComplete).toHaveBeenCalledOnce())
    expect(engine.setPlaybackRate).toHaveBeenCalledWith(1)
    expect(engine.playRangeUntilComplete).toHaveBeenCalledWith(
      { startMs: 50, endMs: 450, occurrenceIds: ['o001'] },
      'o001',
    )
  })

  it('runs one complete Practice Unit at 0.60, 0.80, and 1.00 when both toggles are on', async () => {
    const engine = createFakeEngine()
    renderWorkspace(engine)

    fireEvent.click(screen.getByRole('button', { name: '连续播放' }))
    fireEvent.click(screen.getByRole('button', { name: '渐速练习' }))
    fireEvent.click(screen.getByRole('button', { name: '播放第 02 句' }))

    await waitFor(() => expect(engine.playRangeUntilComplete).toHaveBeenCalledTimes(3))
    expect(engine.setPlaybackRate).toHaveBeenCalledWith(0.6)
    expect(engine.setPlaybackRate).toHaveBeenCalledWith(0.8)
    expect(engine.setPlaybackRate).toHaveBeenCalledWith(1)
    expect(engine.playRangeUntilComplete).toHaveBeenNthCalledWith(
      1,
      { startMs: 550, endMs: 950, occurrenceIds: ['o002'] },
      'o002',
    )
    expect(engine.playRangeUntilComplete).toHaveBeenNthCalledWith(
      3,
      { startMs: 550, endMs: 950, occurrenceIds: ['o002'] },
      'o002',
    )
  })

  it('keeps the song map internally scrollable and marks only the current unit', () => {
    const { container } = renderWorkspace()
    fireEvent.click(screen.getByText('歌曲地图'))

    expect(container.querySelectorAll('.practice-unit-link')).toHaveLength(2)
    expect(screen.getAllByText('当前')).toHaveLength(1)
    expect(screen.queryByText('已访问')).not.toBeInTheDocument()
    expect(screen.queryByText('未访问')).not.toBeInTheDocument()
  })

  it('reveals a selected map item inside the map without scrolling the page', async () => {
    const { container } = renderWorkspace()
    const mapNav = container.querySelector<HTMLElement>('[data-practice-map-scroll="true"]')
    const mapItems = container.querySelectorAll<HTMLElement>('.practice-map li')

    expect(mapNav).not.toBeNull()
    expect(mapItems).toHaveLength(2)
    if (!mapNav || !mapItems[1]) {
      return
    }

    Object.defineProperty(mapNav, 'clientHeight', {
      configurable: true,
      value: 120,
    })
    Object.defineProperty(mapNav, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    })
    vi.spyOn(mapNav, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 220,
    } as DOMRect)
    vi.spyOn(mapItems[1], 'getBoundingClientRect').mockReturnValue({
      top: 260,
      bottom: 300,
    } as DOMRect)

    fireEvent.click(screen.getByText('歌曲地图'))
    fireEvent.click(screen.getByRole('button', { name: /Chorus/ }))

    await waitFor(() => expect(mapNav.scrollTop).toBeCloseTo(94.4))
    expect(mapNav).toHaveAttribute('data-practice-map-scroll', 'true')
  })
})

function renderWorkspace(engine = createFakeEngine()) {
  const runtimeClient = {
    resolveAsset: (path: string) => `/app${path}`,
  } as unknown as RuntimeClient
  return render(
    <PracticeWorkspace
      model={model}
      runtimeClient={runtimeClient}
      audioEngine={engine}
    />,
  )
}

function createFakeEngine() {
  let state: AudioEngineState = {
    status: 'ready',
    intent: 'continuous',
    playbackRate: 1,
    currentTimeMs: 0,
    sourceUrl: '/app/library-runtime/audio.m4a',
  }
  const listeners = new Set<(next: AudioEngineState) => void>()
  const update = (next: Partial<AudioEngineState>): void => {
    state = { ...state, ...next }
    listeners.forEach((listener) => listener(state))
  }
  const engine = {
    getState: vi.fn(() => state),
    subscribe: vi.fn((listener: (next: AudioEngineState) => void) => {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    }),
    loadSource: vi.fn((sourceUrl: string) => update({ sourceUrl })),
    pause: vi.fn(() => update({ status: 'paused', intent: 'continuous' })),
    setPlaybackRate: vi.fn((rate: number) => update({ playbackRate: rate })),
    playRangeUntilComplete: vi.fn(async () => ({ status: 'completed' as const })),
  }
  return engine as unknown as AudioEngine & {
    playRangeUntilComplete: ReturnType<typeof vi.fn>
    setPlaybackRate: ReturnType<typeof vi.fn>
  }
}
