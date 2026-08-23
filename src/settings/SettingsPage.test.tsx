import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Catalog, CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type { LyricsDocument, PracticeDocument, TimelineDocument } from '../library/schema'
import { createUpdateManager } from '../pwa/update-manager'
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
    expect(screen.getAllByText('1.2.5').length).toBeGreaterThan(0)
    expect(screen.getAllByText('当前版本').length).toBeGreaterThan(0)
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
    expect(screen.getByRole('heading', { name: '开发中的小版本' })).toBeInTheDocument()

    const onePointZero = milestones.find(
      (milestone) => milestone.querySelector('summary')?.textContent?.includes('1.0'),
    )
    expect(onePointZero).toBeDefined()
    if (!onePointZero) {
      return
    }
    fireEvent.click(onePointZero.querySelector('summary') as HTMLElement)
    expect(onePointZero.open).toBe(true)
    expect(onePointZero.querySelectorAll('[data-release-milestone]').length).toBe(0)
    expect(onePointZero.querySelectorAll('[data-release-entry]').length).toBe(2)
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

  it('manually checks for a newer build and exposes the immediate update action', async () => {
    const updateManager = createUpdateManager({
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({
        version: '1.3.0',
        commit: 'abcdef123456',
      }), { status: 200 })),
      locationHref: () => 'https://example.test/red-repeat/#settings',
    })
    const applyUpdate = vi.spyOn(updateManager, 'applyUpdate')

    render(
      <SettingsPage
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={runtimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
        updateManager={updateManager}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '检查更新' }))

    expect(await screen.findByText('发现新版本 1.3.0')).toBeInTheDocument()
    expect(screen.getByText('发现新版本，但暂时无法读取更新说明。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '立即更新' }))
    expect(applyUpdate).toHaveBeenCalledOnce()
  })

  it('shows remote release notes without replacing the local changelog', async () => {
    const updateManager = createUpdateManager({
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({
        version: '1.3.0',
        commit: 'abcdef123456',
        release: {
          version: '1.3.0',
          date: '2026-08-24',
          level: 'minor',
          title: '远端学习更新',
          summary: '远端真实更新说明。',
          changes: ['旧 App 也能看到这条更新。'],
        },
      }), { status: 200 })),
      locationHref: () => 'https://example.test/red-repeat/#settings',
    })

    render(
      <SettingsPage
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={runtimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
        updateManager={updateManager}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '检查更新' }))

    expect(await screen.findByText('远端更新说明')).toBeInTheDocument()
    expect(screen.getByText('远端学习更新')).toBeInTheDocument()
    expect(screen.getByText('远端真实更新说明。')).toBeInTheDocument()
    expect(screen.getByText('旧 App 也能看到这条更新。')).toBeInTheDocument()
    expect(screen.getAllByText('1.2.5').length).toBeGreaterThan(0)
  })

  it('opens the milestone containing the requested release from the global update entry', () => {
    render(
      <SettingsPage
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={runtimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
        highlightVersion="1.2.1"
      />,
    )

    const highlighted = document.querySelector<HTMLDetailsElement>(
      '[data-release-milestone][data-release-highlighted="true"]',
    )
    expect(highlighted).toBeDefined()
    expect(highlighted?.open).toBe(true)
    expect(highlighted?.textContent).toContain('PWA 一键更新')
  })
})
