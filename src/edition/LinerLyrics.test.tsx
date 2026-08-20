import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import { LinerLyrics } from './LinerLyrics'

afterEach(() => {
  cleanup()
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
    song: {
      songId: 'first-light',
      title: 'First Light',
      artist: 'A Composer',
    },
    lyricsUrl: '/library-runtime/lyrics.json',
    timelineUrl: '/library-runtime/timeline.json',
    practiceUrl: '/library-runtime/practice.json',
    visualUrl: '/library-runtime/visual.json',
    features: [],
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
  } satisfies RuntimeEdition,
  lyrics: {
    segments: [
      {
        id: 's001',
        lyrics: 'Repeat me',
        translation: '再来一次',
        layers: [
          { id: 'reading', label: 'Reading', text: 'リピート' },
          { id: 'pronunciation', label: 'Pronunciation', text: 'ri-pi-to' },
        ],
        notes: [{ title: 'Cue', body: 'A quiet entrance.' }],
      },
      {
        id: 's002',
        lyrics: 'Stay near',
        translation: '靠近一些',
      },
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

describe('Liner lyrics renderer', () => {
  it('renders repeated canonical Segment content as separate Occurrences', () => {
    render(<LinerLyrics model={model} />)

    expect(screen.getAllByText('Repeat me')).toHaveLength(2)
    expect(screen.getAllByText('再来一次')).toHaveLength(2)
    expect(document.querySelectorAll('[data-occurrence-id]')).toHaveLength(3)
    expect(document.querySelector('[data-occurrence-id="o001"]')).toBeTruthy()
    expect(document.querySelector('[data-occurrence-id="o002"]')).toBeTruthy()
  })

  it('keeps instrumental Sections visible without inventing a lyric', () => {
    render(<LinerLyrics model={model} />)

    expect(screen.getByRole('heading', { name: 'Instrumental' })).toBeInTheDocument()
    expect(screen.getByText('Instrumental passage')).toBeInTheDocument()
  })

  it('toggles source-ordered reading layers without changing Original playback', () => {
    const onSelect = vi.fn()
    render(<LinerLyrics model={model} onSelectOccurrence={onSelect} />)

    expect(screen.queryByText('リピート')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show reading' }))
    expect(screen.getAllByText('リピート')).toHaveLength(2)
    expect(screen.getAllByText('ri-pi-to')).toHaveLength(2)
    expect(screen.getAllByText('Reading')[0]).toBeInTheDocument()

    const originalButtons = screen.getAllByRole('button', { name: /Play line/ })
    fireEvent.click(originalButtons[1])
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ occurrence: expect.objectContaining({ id: 'o002' }) }),
    )
    expect(screen.getAllByText('A quiet entrance.')).toHaveLength(2)
  })

  it('renders active, primary, and selected states without changing identity', () => {
    render(
      <LinerLyrics
        model={model}
        activeOccurrenceIds={new Set(['o002', 'o003'])}
        primaryOccurrenceId="o002"
        selectedOccurrenceId="o003"
      />,
    )

    expect(document.querySelector('[data-occurrence-id="o002"]')).toHaveClass(
      'is-active',
      'is-primary',
    )
    expect(document.querySelector('[data-occurrence-id="o003"]')).toHaveClass(
      'is-active',
      'is-selected',
    )
  })
})
