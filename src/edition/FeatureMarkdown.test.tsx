import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import {
  ExplainArticleBody,
  parseFeatureArticle,
} from './FeatureMarkdown'

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
  practice: { units: [] },
  visual: { recommendedTheme: 'liner' } satisfies VisualDocument,
  features: [],
})

describe('Feature Markdown baseline', () => {
  it('uses the first heading as the article title and removes it from the body', () => {
    const article = parseFeatureArticle({
      descriptor: featureDescriptor,
      content: '# Context\n\nThe body remains here.\n\n## Detail',
    })

    expect(article.title).toBe('Context')
    expect(article.blocks).toEqual([
      { kind: 'paragraph', text: 'The body remains here.' },
      { kind: 'heading', level: 2, text: 'Detail' },
    ])
  })

  it('falls back to a readable descriptor title without a numeric sort prefix', () => {
    const article = parseFeatureArticle({
      descriptor: {
        id: '01-作品背景',
        url: featureDescriptor.url,
      },
      content: '没有显式标题。',
    })

    expect(article.title).toBe('作品背景')
    expect(article.blocks).toEqual([
      { kind: 'paragraph', text: '没有显式标题。' },
    ])
  })

  it('renders headings, paragraphs, lists, emphasis, strong, and raw HTML as text', () => {
    const article = parseFeatureArticle({
      descriptor: featureDescriptor,
      content:
        '# Context\n\nA *quiet* and **clear** note.\n\n## Detail\n\n- first\n- second\n\n<script>alert(1)</script>',
    })
    render(
      <ExplainArticleBody article={article} model={model} />,
    )

    expect(screen.getByRole('heading', { name: 'Detail' })).toBeInTheDocument()
    expect(screen.getByText('quiet')).toBeInTheDocument()
    expect(screen.getByText('clear')).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(screen.queryByRole('script')).not.toBeInTheDocument()
  })

  it('turns single and multiple Segment references into ordered block references', () => {
    const article = parseFeatureArticle({
      descriptor: featureDescriptor,
      content: 'Read [[segment:s021]] and [[segment:s022]] now.',
    })

    expect(article.blocks).toEqual([
      { kind: 'paragraph', text: 'Read and now.' },
      { kind: 'lyric-reference', segmentId: 's021' },
      { kind: 'lyric-reference', segmentId: 's022' },
    ])
  })

  it('keeps list items valid when a list item contains a lyric reference', () => {
    const article = parseFeatureArticle({
      descriptor: featureDescriptor,
      content: '- Keep [[segment:s021]] nearby\n- Keep the context.',
    })

    expect(article.blocks).toEqual([
      { kind: 'list', items: ['Keep nearby', 'Keep the context.'] },
      { kind: 'lyric-reference', segmentId: 's021' },
    ])
    render(<ExplainArticleBody article={article} model={model} />)
    expect(screen.getByRole('list').querySelectorAll(':scope > li')).toHaveLength(2)
    expect(screen.getByRole('group', { name: '歌词引用' })).toBeInTheDocument()
  })

  it('shows a clear non-interactive fallback for a missing Segment without leaking its ID', () => {
    const article = parseFeatureArticle({
      descriptor: featureDescriptor,
      content: '[[segment:s999]]',
    })

    render(<ExplainArticleBody article={article} model={model} />)

    expect(screen.getByRole('note')).toHaveTextContent('这条歌词引用暂不可用。')
    expect(screen.queryByText('s999')).not.toBeInTheDocument()
  })

})
