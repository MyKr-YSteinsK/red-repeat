import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Catalog, CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type { LyricsDocument, PracticeDocument, TimelineDocument } from '../library/schema'
import { getTimingOverridesStorageKey } from '../practice/practice-timing-overrides'
import type { RuntimeClient } from '../runtime/runtime-client'
import { TimingDebuggerPage } from './TimingDebuggerPage'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  coverUrl: '/library-runtime/songs/first-light/cover.webp',
  editionUrl: '/library-runtime/songs/first-light/edition.json',
}

const catalog: Catalog = {
  contractVersion: 3,
  contentHash: 'f'.repeat(64),
  editions: [catalogEdition],
}

const edition: RuntimeEdition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.json',
  features: [],
  audio: {
    url: '/library-runtime/songs/first-light/audio.m4a',
    sourceHash: 'b'.repeat(64),
    runtimeHash: 'c'.repeat(64),
    durationMs: 1200,
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
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.webp',
  },
}

const lyrics: LyricsDocument = {
  segments: [
    { id: 's001', lyrics: '首句', translation: 'First line' },
    { id: 's002', lyrics: '第二句', translation: 'Second line' },
  ],
}

const timeline: TimelineDocument = {
  audioSourceHash: edition.audio.sourceHash,
  sections: [{ id: 'verse', label: '主歌', startMs: 0, endMs: 1200 }],
  occurrences: [
    {
      id: 'o001',
      segmentId: 's001',
      sectionId: 'verse',
      startMs: 100,
      endMs: 300,
      playStartMs: 50,
      playEndMs: 350,
    },
    {
      id: 'o002',
      segmentId: 's002',
      sectionId: 'verse',
      startMs: 500,
      endMs: 700,
      playStartMs: 450,
      playEndMs: 750,
    },
  ],
}

const practice: PracticeDocument = {
  units: [
    {
      id: 'p001',
      sectionId: 'verse',
      label: '主歌',
      occurrenceIds: ['o001', 'o002'],
    },
  ],
}

function createRuntimeClient(): RuntimeClient {
  return {
    loadEdition: vi.fn(async () => edition),
    loadLyrics: vi.fn(async () => lyrics),
    loadTimeline: vi.fn(async () => timeline),
    loadPractice: vi.fn(async () => practice),
    resolveAsset: vi.fn((path: string) => path),
  } as unknown as RuntimeClient
}

describe('TimingDebuggerPage', () => {
  it('offers a normal-product song selector', () => {
    render(
      <TimingDebuggerPage
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: '选择一首歌' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /First Light/ })).toHaveAttribute(
      'href',
      expect.stringContaining('#timing=debug&edition=first-light'),
    )
  })

  it('adjusts and saves effective timing without exposing canonical low-level controls', async () => {
    render(
      <TimingDebuggerPage
        songId="first-light"
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={createRuntimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '播放切口调试' })).toBeInTheDocument()
      expect(screen.getAllByText('首句').length).toBeGreaterThan(0)
    })

    expect(screen.queryByText('startMs')).not.toBeInTheDocument()
    expect(screen.queryByText('endMs')).not.toBeInTheDocument()
    expect(screen.queryByText('playStartMs')).not.toBeInTheDocument()
    expect(screen.queryByText('playEndMs')).not.toBeInTheDocument()
    expect(screen.queryByText('当前播放位置')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '用当前位置' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '恢复当前句默认' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '播放' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: '保存本机微调' })).toBeInTheDocument()
    expect(screen.getAllByText('起点')).toHaveLength(2)
    expect(screen.getAllByText('终点')).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: '+20ms' })[0])

    expect(screen.getByText('70 ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存本机微调' }))

    await waitFor(() => {
      const raw = window.localStorage.getItem(
        getTimingOverridesStorageKey('first-light'),
      )
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw ?? '{}')).toMatchObject({
        schemaVersion: 2,
        songId: 'first-light',
        editionContentHash: edition.contentHash,
        occurrences: { o001: { playStartMs: 70 } },
      })
    })
  })
})
