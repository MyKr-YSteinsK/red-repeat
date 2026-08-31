import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AudioEngine, AudioEngineState } from '../audio/audio-engine'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { PracticeDocument } from '../library/schema'
import {
  assembleRuntimeSongEdition,
  type AssembledSongEdition,
} from '../runtime/song-edition'
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
    { id: 'o001', segmentId: 's001', sectionId: 'verse', startMs: 50, endMs: 450 },
    { id: 'o002', segmentId: 's002', sectionId: 'verse', startMs: 550, endMs: 950 },
    { id: 'o003', segmentId: 's003', sectionId: 'chorus', startMs: 2250, endMs: 2650 },
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

const variableLengthModel = assembleRuntimeSongEdition({
  catalogEdition,
  edition,
  lyrics: {
    segments: Array.from({ length: 7 }, (_, index) => ({
      id: `v${index + 1}`,
      lyrics: `Line ${index + 1}`,
      translation: `第 ${index + 1} 句`,
    })),
  },
  timeline: {
    audioSourceHash: 'b'.repeat(64),
    sections: [{ id: 'verse', label: 'Verse', startMs: 0, endMs: 3000 }],
    occurrences: Array.from({ length: 7 }, (_, index) => ({
      id: `vo${index + 1}`,
      segmentId: `v${index + 1}`,
      sectionId: 'verse',
      startMs: 50 + index * 350,
      endMs: 400 + index * 350,
    })),
  },
  practice: {
    units: [
      { id: 'one', sectionId: 'verse', label: 'One', occurrenceIds: ['vo1'] },
      { id: 'two', sectionId: 'verse', label: 'Two', occurrenceIds: ['vo2', 'vo3'] },
      {
        id: 'four',
        sectionId: 'verse',
        label: 'Four',
        occurrenceIds: ['vo4', 'vo5', 'vo6', 'vo7'],
      },
    ],
  },
  features: [],
})

const gappedModel = assembleRuntimeSongEdition({
  catalogEdition,
  edition,
  lyrics: {
    segments: [
      { id: 'g001', lyrics: 'Gap line 1', translation: '间隔句一' },
      { id: 'g002', lyrics: 'Gap line 2', translation: '间隔句二' },
      { id: 'g003', lyrics: 'Gap line 3', translation: '间隔句三' },
      { id: 'g004', lyrics: 'Gap line 4', translation: '间隔句四' },
    ],
  },
  timeline: {
    audioSourceHash: 'b'.repeat(64),
    sections: [{ id: 'gap-verse', label: 'Gap Verse', startMs: 0, endMs: 2000 }],
    occurrences: [
      { id: 'go001', segmentId: 'g001', sectionId: 'gap-verse', startMs: 100, endMs: 250 },
      { id: 'go002', segmentId: 'g002', sectionId: 'gap-verse', startMs: 400, endMs: 550 },
      { id: 'go003', segmentId: 'g003', sectionId: 'gap-verse', startMs: 700, endMs: 850 },
      { id: 'go004', segmentId: 'g004', sectionId: 'gap-verse', startMs: 1000, endMs: 1150 },
    ],
  },
  practice: {
    units: [
      {
        id: 'gap-unit',
        sectionId: 'gap-verse',
        label: 'Gap Verse',
        occurrenceIds: ['go001', 'go002', 'go003', 'go004'],
      },
    ],
  },
  features: [],
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', undefined)
})

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
    expect(dock).not.toHaveClass('control-sheet')
    expect(dock?.querySelectorAll('.practice-player-button')).toHaveLength(8)
    expect(container.querySelector('.practice-segment-picker-layer')).toBeNull()
    expect(screen.getByRole('button', { name: '播放第 01 句' })).not.toHaveClass('control-button')
    expect(dock?.querySelector('.practice-dock-navigation')).toBeNull()
    expect(dock?.querySelector('.practice-dock-topline')).toBeInTheDocument()
    expect(dock?.querySelector('.practice-dock-primary .practice-play-button')).toBeInTheDocument()
    expect(dock?.querySelectorAll('.practice-rate-actions .practice-player-button')).toHaveLength(3)
    expect(dock?.querySelector('.practice-dock-modes')).toBeInTheDocument()
    expect(dock?.querySelectorAll('.practice-dock-modes .practice-player-button')).toHaveLength(2)
    expect(dock?.querySelectorAll(':scope > div')).toHaveLength(3)
    expect(screen.getByRole('button', { name: '上一段' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下一段' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '选择学习段：Verse' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
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
    expect(continuousButton.matches(".practice-dock .practice-player-button[aria-pressed='true']")).toBe(true)
    expect(rampButton.matches(".practice-dock .practice-player-button[aria-pressed='true']")).toBe(true)
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

  it('updates the mobile content reserve from the measured dock occlusion', () => {
    let notifyResize: ResizeObserverCallback | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          notifyResize = callback
        }

        observe = observe
        disconnect = disconnect
      },
    )
    const { container } = renderWorkspace()
    const workspace = container.querySelector<HTMLElement>('.practice-workspace')
    const dock = container.querySelector<HTMLElement>('.practice-dock')
    expect(workspace).not.toBeNull()
    expect(dock).not.toBeNull()
    if (!workspace || !dock) {
      return
    }

    vi.spyOn(dock, 'getBoundingClientRect').mockReturnValue({
      top: 650,
      bottom: 820,
      height: 170,
    } as DOMRect)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(852)
    notifyResize?.([], {} as ResizeObserver)

    expect(observe).toHaveBeenCalledWith(dock)
    expect(workspace.style.getPropertyValue('--practice-dock-occlusion')).toBe('202px')

    vi.mocked(dock.getBoundingClientRect).mockReturnValue({
      top: 630,
      bottom: 830,
      height: 200,
    } as DOMRect)
    notifyResize?.([], {} as ResizeObserver)

    expect(workspace.style.getPropertyValue('--practice-dock-occlusion')).toBe('222px')
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

  it('follows Resolver primary occurrence during continuous playback without persisting frame updates', async () => {
    const engine = createFakeEngine()
    const { container } = renderWorkspace(engine)

    fireEvent.click(screen.getByRole('button', { name: '连续播放' }))
    fireEvent.click(screen.getByRole('button', { name: '播放第 02 句' }))
    await waitFor(() => expect(engine.playRangeUntilComplete).toHaveBeenCalledOnce())

    const storedAfterSelection = snapshotLocalStorage()
    engine.update({ status: 'playing', currentTimeMs: 700 })

    await waitFor(() => {
      expect(document.querySelector('[data-occurrence-id="o002"]')).toHaveClass(
        'is-current',
      )
      expect(container.querySelector('.practice-workspace')).toHaveAttribute(
        'data-audible-occurrence-id',
        'o002',
      )
    })
    expect(snapshotLocalStorage()).toEqual(storedAfterSelection)

    engine.update({ currentTimeMs: 200 })
    await waitFor(() => {
      expect(document.querySelector('[data-occurrence-id="o001"]')).toHaveClass(
        'is-current',
      )
      expect(container.querySelector('.practice-workspace')).toHaveAttribute(
        'data-current-occurrence-id',
        'o001',
      )
    })
  })

  it('bridges same-unit lyric gaps when continuous playback starts in the middle', async () => {
    const engine = createFakeEngine()
    const { container } = renderWorkspace(engine, { model: gappedModel })

    fireEvent.click(screen.getByRole('button', { name: '连续播放' }))
    fireEvent.click(screen.getByRole('button', { name: '播放第 02 句' }))
    await waitFor(() => expect(engine.playRangeUntilComplete).toHaveBeenCalledOnce())

    const workspace = container.querySelector<HTMLElement>('.practice-workspace')
    if (!workspace) {
      throw new Error('expected Practice workspace')
    }

    const observed: Array<{ timeMs: number; audible?: string; visible?: string }> = []
    const updateAndCapture = async (
      timeMs: number,
      expectedAudible: string | undefined,
      expectedVisible: string | undefined,
    ): Promise<void> => {
      engine.update({ status: 'playing', currentTimeMs: timeMs })
      await waitFor(() => {
        expect(workspace.dataset.audibleOccurrenceId).toBe(expectedAudible)
        expect(workspace.dataset.currentOccurrenceId).toBe(expectedVisible)
      })
      observed.push({
        timeMs,
        audible: workspace.dataset.audibleOccurrenceId,
        visible: workspace.dataset.currentOccurrenceId,
      })
    }

    await updateAndCapture(750, 'go003', 'go003')
    await updateAndCapture(900, undefined, 'go003')
    await updateAndCapture(1050, 'go004', 'go004')
    await updateAndCapture(1200, undefined, undefined)

    expect(observed).toEqual([
      { timeMs: 750, audible: 'go003', visible: 'go003' },
      { timeMs: 900, audible: undefined, visible: 'go003' },
      { timeMs: 1050, audible: 'go004', visible: 'go004' },
      { timeMs: 1200, audible: undefined, visible: undefined },
    ])
  })

  it('keeps one, two, and four-line units on the same measured dock reserve', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(852)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('practice-dock')
          ? ({ top: 650, bottom: 820, height: 170 } as DOMRect)
          : ({ top: 96, bottom: 96, height: 0 } as DOMRect)
      },
    )
    const { container } = renderWorkspace(createFakeEngine(), {
      model: variableLengthModel,
    })
    const workspace = container.querySelector<HTMLElement>('.practice-workspace')
    const lyricRows = (): number =>
      container.querySelectorAll('.practice-lyric-row').length

    expect(lyricRows()).toBe(1)
    expect(workspace?.style.getPropertyValue('--practice-dock-occlusion')).toBe(
      '202px',
    )

    fireEvent.click(screen.getByRole('button', { name: '选择学习段：One' }))
    fireEvent.click(screen.getByRole('option', { name: /Two/ }))
    expect(lyricRows()).toBe(2)
    expect(workspace?.style.getPropertyValue('--practice-dock-occlusion')).toBe(
      '202px',
    )

    fireEvent.click(screen.getByRole('button', { name: '选择学习段：Two' }))
    fireEvent.click(screen.getByRole('option', { name: /Four/ }))
    expect(lyricRows()).toBe(4)
    expect(workspace?.style.getPropertyValue('--practice-dock-occlusion')).toBe(
      '202px',
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

  it('uses the fixed segment picker for unit selection and closes after navigation', async () => {
    const { container } = renderWorkspace()
    const contextButton = screen.getByRole('button', { name: '选择学习段：Verse' })

    fireEvent.click(contextButton)

    expect(screen.getByRole('dialog', { name: '选择学习段' })).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: '学习段' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Verse/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    fireEvent.click(screen.getByRole('option', { name: /Chorus/ }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Chorus' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: '选择学习段' })).not.toBeInTheDocument()
    })
    expect(container.querySelector('.practice-segment-picker-layer')).toBeNull()
  })

  it('keeps previous and next slots stable at the practice boundaries', () => {
    renderWorkspace()

    const previous = screen.getByRole('button', { name: '上一段' })
    const next = screen.getByRole('button', { name: '下一段' })
    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()

    fireEvent.click(next)

    expect(screen.getByRole('heading', { name: 'Chorus' })).toBeInTheDocument()
    expect(previous).toBeEnabled()
    expect(next).toBeDisabled()
  })

  it('reveals the new heading for previous, next, and picker navigation without native transitions', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const startViewTransition = vi.fn()
    const originalStartViewTransition = (
      document as unknown as { startViewTransition?: unknown }
    ).startViewTransition
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('practice-unit-heading')
          ? ({ top: 420 } as DOMRect)
          : ({ top: 0, bottom: 0, height: 0 } as DOMRect)
      },
    )

    try {
      renderWorkspace()

      fireEvent.click(screen.getByRole('button', { name: '下一段' }))
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 324, behavior: 'auto' })

      fireEvent.click(screen.getByRole('button', { name: '上一段' }))
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 324, behavior: 'auto' })

      fireEvent.click(screen.getByRole('button', { name: '选择学习段：Verse' }))
      fireEvent.click(screen.getByRole('option', { name: /Chorus/ }))
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 324, behavior: 'auto' })
      expect(scrollTo).toHaveBeenCalledTimes(3)
      expect(startViewTransition).not.toHaveBeenCalled()
    } finally {
      if (originalStartViewTransition) {
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          value: originalStartViewTransition,
        })
      } else {
        delete (document as unknown as { startViewTransition?: unknown })
          .startViewTransition
      }
    }
  })

  it('reveals externally requested units without native transitions', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const startViewTransition = vi.fn()
    const consumed = vi.fn()
    const originalStartViewTransition = (
      document as unknown as { startViewTransition?: unknown }
    ).startViewTransition
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('practice-unit-heading')
          ? ({ top: 420 } as DOMRect)
          : ({ top: 0, bottom: 0, height: 0 } as DOMRect)
      },
    )

    try {
      renderWorkspace(createFakeEngine(), {
        requestedPracticeUnitId: 'p002',
        onRequestedPracticeUnitConsumed: consumed,
      })

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Chorus' })).toBeInTheDocument()
      })
      expect(scrollTo).toHaveBeenCalledWith({ top: 324, behavior: 'auto' })
      expect(consumed).toHaveBeenCalledOnce()
      expect(startViewTransition).not.toHaveBeenCalled()
    } finally {
      if (originalStartViewTransition) {
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          value: originalStartViewTransition,
        })
      } else {
        delete (document as unknown as { startViewTransition?: unknown })
          .startViewTransition
      }
    }
  })

  it('closes the segment picker with Escape or an outside click', () => {
    const { container } = renderWorkspace()
    const contextButton = screen.getByRole('button', { name: '选择学习段：Verse' })

    fireEvent.click(contextButton)
    expect(screen.getByRole('dialog', { name: '选择学习段' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '选择学习段' })).not.toBeInTheDocument()

    fireEvent.click(contextButton)
    const layer = container.querySelector<HTMLElement>('.practice-segment-picker-layer')
    expect(layer).not.toBeNull()
    if (layer) {
      fireEvent.mouseDown(layer)
    }
    expect(screen.queryByRole('dialog', { name: '选择学习段' })).not.toBeInTheDocument()
  })
})

function renderWorkspace(
  engine = createFakeEngine(),
  props: Pick<
    ComponentProps<typeof PracticeWorkspace>,
    'requestedPracticeUnitId' | 'onRequestedPracticeUnitConsumed'
  > & { model?: AssembledSongEdition } = {},
) {
  const runtimeClient = {
    resolveAsset: (path: string) => `/app${path}`,
  } as unknown as RuntimeClient
  const { model: workspaceModel = model, ...workspaceProps } = props
  return render(
    <PracticeWorkspace
      model={workspaceModel}
      runtimeClient={runtimeClient}
      audioEngine={engine}
      {...workspaceProps}
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
    update,
  }
  return engine as unknown as AudioEngine & {
    playRangeUntilComplete: ReturnType<typeof vi.fn>
    setPlaybackRate: ReturnType<typeof vi.fn>
    update: (next: Partial<AudioEngineState>) => void
  }
}

function snapshotLocalStorage(): string[] {
  return Array.from({ length: window.localStorage.length }, (_, index) => {
    const key = window.localStorage.key(index)
    return `${key}:${key ? window.localStorage.getItem(key) : ''}`
  }).sort()
}
