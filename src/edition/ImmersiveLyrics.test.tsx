import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import { resolveTimeline } from '../timeline/resolver'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import type { SongEditionPlaybackSnapshot } from './use-song-edition-playback'
import { ImmersiveLyrics } from './ImmersiveLyrics'

afterEach(() => {
  cleanup()
  if (originalScrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: originalScrollIntoView,
    })
  } else {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: undefined,
    })
  }
  if (originalMatchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
  } else {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    })
  }
})

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
const originalMatchMedia = window.matchMedia

const model = assembleRuntimeSongEdition({
  catalogEdition: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    recommendedTheme: 'liner',
    coverUrl: '/cover.webp',
    editionUrl: '/edition.json',
  } satisfies CatalogEdition,
  edition: {
    contractVersion: 2,
    contentHash: 'a'.repeat(64),
    song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
    lyricsUrl: '/lyrics.json',
    timelineUrl: '/timeline.json',
    practiceUrl: '/practice.json',
    visualUrl: '/visual.json',
    features: [],
    audio: {
      url: '/audio.m4a',
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
    artwork: { coverSmallUrl: '/cover.webp', coverLargeUrl: '/cover-large.webp' },
  } satisfies RuntimeEdition,
  lyrics: {
    segments: [
      {
        id: 's001',
        lyrics: 'Repeat me',
        translation: '再来一次',
        notes: [{ title: 'Hidden note', body: 'Do not show me.' }],
      },
      { id: 's002', lyrics: 'Stay near', translation: '靠近一些' },
    ],
  } satisfies LyricsDocument,
  timeline: {
    audioSourceHash: 'a'.repeat(64),
    sections: [
      { id: 'verse', label: 'Verse', startMs: 0, endMs: 1000 },
      { id: 'instrumental', label: 'Instrumental', startMs: 1000, endMs: 1400 },
    ],
    occurrences: [
      {
        id: 'o001',
        segmentId: 's001',
        sectionId: 'verse',
        startMs: 100,
        endMs: 300,
        playStartMs: 0,
        playEndMs: 350,
      },
      {
        id: 'o002',
        segmentId: 's001',
        sectionId: 'verse',
        startMs: 500,
        endMs: 700,
        playStartMs: 400,
        playEndMs: 750,
      },
      {
        id: 'o003',
        segmentId: 's002',
        sectionId: 'verse',
        startMs: 600,
        endMs: 800,
        playStartMs: 550,
        playEndMs: 850,
      },
    ],
  } satisfies TimelineDocument,
  practice: { units: [] },
  visual: { recommendedTheme: 'liner' } satisfies VisualDocument,
  features: [],
})

describe('Immersive Lyrics renderer', () => {
  it('uses Occurrence identity and preserves overlap hierarchy', () => {
    renderImmersiveAt(650)

    const primary = document.querySelector('[data-occurrence-id="o002"]')
    const secondary = document.querySelector('[data-occurrence-id="o003"]')
    expect(primary).toHaveClass('is-active', 'is-primary')
    expect(primary).toHaveAttribute('aria-current', 'true')
    expect(secondary).toHaveClass('is-active', 'is-secondary-active')
    expect(secondary).not.toHaveClass('is-primary')
    expect(screen.getAllByText('Repeat me')).toHaveLength(2)
    expect(screen.getByText('Current Segment')).toBeInTheDocument()
  })

  it('shows chronological previous and next context without inventing a current lyric', () => {
    renderImmersiveAt(350)

    expect(document.querySelector('[data-occurrence-id="o001"]')).toHaveClass(
      'is-context',
    )
    expect(document.querySelector('[data-occurrence-id="o002"]')).toHaveClass(
      'is-context',
    )
    expect(screen.getByText('Between Sections')).toBeInTheDocument()
    expect(screen.queryByRole('listitem', { current: 'true' })).not.toBeInTheDocument()
  })

  it('marks instrumental Sections and timeline gaps with minimal cues', () => {
    renderImmersiveAt(1100)
    expect(screen.getByText('NOW / Instrumental')).toBeInTheDocument()
    expect(screen.getByText('Instrumental passage')).toBeInTheDocument()
    expect(screen.queryByRole('listitem', { current: 'true' })).not.toBeInTheDocument()

    cleanup()
    renderImmersiveAt(1600)
    expect(screen.getByText('NOW / Between Sections')).toBeInTheDocument()
    expect(screen.getByText('Between Sections')).toBeInTheDocument()
  })

  it('does not render notes, features, annotations, or word-level spans', () => {
    renderImmersiveAt(650)

    expect(screen.queryByText('Hidden note')).not.toBeInTheDocument()
    expect(screen.queryByText('Do not show me.')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.lyric-notes')).toHaveLength(0)
    expect(document.querySelectorAll('.immersive-word')).toHaveLength(0)
  })

  it('plays the clicked Occurrence without making translation interactive', () => {
    const selectOccurrence = vi.fn()
    render(createImmersiveElement(650, selectOccurrence))

    const originals = screen.getAllByRole('button', {
      name: 'Play line Repeat me',
    })
    expect(originals[1]).toHaveAttribute('type', 'button')
    fireEvent.click(originals[1])

    expect(selectOccurrence).toHaveBeenCalledTimes(1)
    expect(selectOccurrence).toHaveBeenCalledWith(model.occurrencesById.o002)
    fireEvent.click(screen.getAllByText('再来一次')[0])
    expect(selectOccurrence).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Immersive lyrics')).toBeInTheDocument()
  })

  it('scrolls only when the primary Occurrence changes and honors reduced motion', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    })

    const view = renderImmersiveAt(650)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: 'auto',
      block: 'center',
    })

    view.rerender(createImmersiveElement(680))
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    view.rerender(createImmersiveElement(750))
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })
})

function renderImmersiveAt(currentTimeMs: number) {
  return render(createImmersiveElement(currentTimeMs))
}

function createImmersiveElement(
  currentTimeMs: number,
  selectOccurrence = vi.fn(),
) {
  const resolution = resolveTimeline(model.timeline, currentTimeMs)
  const playback: SongEditionPlaybackSnapshot = {
    engine: null,
    audioState: {
      status: 'paused',
      intent: 'continuous',
      playbackRate: 1,
      currentTimeMs,
    },
    resolution,
    selectedOccurrenceId: undefined,
    selectOccurrence,
  }
  return <ImmersiveLyrics model={model} playback={playback} />
}
