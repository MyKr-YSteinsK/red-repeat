import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import { FeatureSection } from './FeatureMarkdown'

afterEach(() => {
  cleanup()
})

const featureDescriptor = {
  id: 'liner-note',
  url: '/library-runtime/songs/first-light/features/liner-note.md',
}

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
    contractVersion: 1,
    contentHash: 'a'.repeat(64),
    song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
    lyricsUrl: '/library-runtime/lyrics.json',
    timelineUrl: '/library-runtime/timeline.json',
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
      { id: 's021', lyrics: 'First line', translation: '第一句' },
      { id: 's022', lyrics: 'Second line', translation: '第二句' },
    ],
  } satisfies LyricsDocument,
  timeline: {
    audioSourceHash: 'a'.repeat(64),
    sections: [{ id: 'verse', label: 'Verse', startMs: 0, endMs: 1000 }],
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
      {
        id: 'o003',
        segmentId: 's022',
        sectionId: 'verse',
        startMs: 700,
        endMs: 850,
        playStartMs: 650,
        playEndMs: 900,
      },
    ],
  } satisfies TimelineDocument,
  visual: { recommendedTheme: 'liner' } satisfies VisualDocument,
  features: [],
})

describe('Feature Markdown baseline', () => {
  it('renders no Feature zone when the edition has no Features', () => {
    const { container } = render(
      <FeatureSection model={model} features={[]} featureErrors={[]} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders headings, paragraphs, lists, emphasis, and raw HTML as text', () => {
    render(
      <FeatureSection
        model={model}
        features={[{
          descriptor: featureDescriptor,
          content:
            '# Context\n\nA *quiet* and **clear** note.\n\n- first\n- second\n\n<script>alert(1)</script>',
        }]}
        featureErrors={[]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Context' })).toBeInTheDocument()
    expect(screen.getByText('quiet')).toBeInTheDocument()
    expect(screen.getByText('clear')).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(screen.queryByRole('script')).not.toBeInTheDocument()
  })

  it('renders a Segment cross-reference that jumps to the first rendered Occurrence', () => {
    render(
      <>
        <div data-occurrence-id="o001" />
        <FeatureSection
          model={model}
          features={[{
            descriptor: featureDescriptor,
            content: 'Return to [[segment:s021]] when the refrain arrives.',
          }]}
          featureErrors={[]}
        />
      </>,
    )
    const firstOccurrence = document.querySelector(
      '[data-occurrence-id="o001"]',
    ) as HTMLElement
    const scrollIntoView = vi.fn()
    Object.defineProperty(firstOccurrence, 'scrollIntoView', {
      value: scrollIntoView,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Jump to s021' }))

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    })
  })

  it('keeps Feature load errors local to the editorial zone', () => {
    render(
      <FeatureSection
        model={model}
        features={[]}
        featureErrors={[{ descriptor: featureDescriptor, error: new Error('offline') }]}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'liner-note is temporarily unavailable',
    )
  })
})
