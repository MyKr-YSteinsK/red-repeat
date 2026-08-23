import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Catalog, CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type { LyricsDocument, PracticeDocument, TimelineDocument } from '../library/schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import { SettingsPage } from './SettingsPage'

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
  song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.json',
  features: [],
  audio: {
    url: '/library-runtime/songs/first-light/audio.m4a',
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
    coverSmallUrl: catalogEdition.coverUrl,
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.webp',
  },
}

const lyrics: LyricsDocument = {
  segments: [{ id: 's001', lyrics: 'First line', translation: '第一句' }],
}
const timeline: TimelineDocument = {
  audioSourceHash: edition.audio.sourceHash,
  sections: [{ id: 'verse', label: '主歌', startMs: 0, endMs: 1000 }],
  occurrences: [{
    id: 'o001',
    segmentId: 's001',
    sectionId: 'verse',
    startMs: 100,
    endMs: 300,
    playStartMs: 50,
    playEndMs: 350,
  }],
}
const practice: PracticeDocument = { units: [] }

function runtimeClient(): RuntimeClient {
  return {
    loadEdition: vi.fn(async () => edition),
    loadLyrics: vi.fn(async () => lyrics),
    loadTimeline: vi.fn(async () => timeline),
    loadPractice: vi.fn(async () => practice),
  } as unknown as RuntimeClient
}

describe('SettingsPage', () => {
  it('shows system information, timing entry, and the permanent changelog', () => {
    render(
      <SettingsPage
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={runtimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument()
    expect(screen.getAllByText('1.0.0').length).toBeGreaterThan(0)
    expect(screen.getByText('当前版本')).toBeInTheDocument()
    expect(screen.queryByText('GitHub Pages')).not.toBeInTheDocument()
    expect(screen.getByText('播放切口调试')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '打开播放切口调试 →' })).toHaveAttribute(
      'href',
      '/#timing=debug',
    )
    expect(screen.getByText('更新日志')).toBeInTheDocument()
    expect(screen.getByText('0.1.0')).toBeInTheDocument()

    const milestones = [...document.querySelectorAll<HTMLDetailsElement>('[data-release-milestone]')]
    expect(milestones.length).toBeGreaterThan(1)
    expect(milestones.every((milestone) => !milestone.open)).toBe(true)
    expect(screen.queryByRole('heading', { name: '开发中的小版本' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('1.0', { exact: true }))
    expect(milestones[0].open).toBe(true)
    expect(milestones[0].querySelectorAll('[data-release-milestone]').length).toBe(0)
    expect(milestones[0].querySelectorAll('[data-release-entry]').length).toBe(2)
  })

  it('reports that there is nothing to export when no local override exists', async () => {
    render(
      <SettingsPage
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={runtimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '生成并下载修复包' }))

    expect(
      await screen.findByText('当前没有待合入的播放切口微调。'),
    ).toBeInTheDocument()
  })
})
