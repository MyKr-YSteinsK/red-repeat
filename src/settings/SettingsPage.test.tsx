import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Catalog, CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type { LyricsDocument, PracticeDocument, TimelineDocument } from '../library/schema'
import { buildInfo } from '../release/build-info'
import { createUpdateManager } from '../pwa/update-manager'
import type { RuntimeClient } from '../runtime/runtime-client'
import { getPracticeRateStorageKey } from '../practice/practice-rate'
import { getTimingOverridesStorageKey } from '../practice/practice-timing-overrides'
import { SettingsPage } from './SettingsPage'

const newerVersion = nextPatchVersion(buildInfo.version)

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
    startMs: 50,
    endMs: 350,
  }],
}
const practice: PracticeDocument = {
  units: [{ id: 'p001', sectionId: 'verse', label: '主歌', occurrenceIds: ['o001'] }],
}

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
    expect(screen.getAllByText(buildInfo.version).length).toBeGreaterThan(0)
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

  it('shows and exports an old identity record independently of the current Edition', async () => {
    const oldIdentity = {
      songId: 'first-light',
      editionContentHash: 'd'.repeat(64),
      audioSourceHash: edition.audio.sourceHash,
      baseTimelineUrl: '/library-runtime/songs/first-light/timeline.old.json',
    }
    window.localStorage.setItem(
      getTimingOverridesStorageKey(oldIdentity.songId),
      JSON.stringify({
        schemaVersion: 3,
        ...oldIdentity,
        occurrences: { o001: { startMs: 40 } },
      }),
    )
    const downloadClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    render(
      <SettingsPage
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={runtimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Timing 保留记录' })).toBeInTheDocument()
    expect(screen.getByText(/Edition dddddddddddd/)).toBeInTheDocument()
    expect(screen.getByText(/不会仅凭同一首歌自动应用于新版/)).toBeInTheDocument()
    expect(screen.getByText(/历史 Timing 保留记录不包含在此备份中/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '导出保留的 Timing JSON' }))
    expect(await screen.findByText(/包含 1 条可核验的保留记录/)).toBeInTheDocument()
    expect(downloadClick).toHaveBeenCalledOnce()
    expect(window.localStorage.getItem(getTimingOverridesStorageKey(oldIdentity.songId))).not.toBeNull()
    downloadClick.mockRestore()
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

    const exportButton = screen.getByRole('button', { name: '生成并下载修复包' })
    expect(exportButton).toHaveClass('control-button', 'control-button--primary')
    fireEvent.click(exportButton)

    expect(
      await screen.findByText('当前没有待合入的播放切口微调。'),
    ).toBeInTheDocument()
  })

  it('previews a backup without writes and applies a selected explicit overwrite only after confirmation', async () => {
    const rateKey = getPracticeRateStorageKey('first-light')
    window.localStorage.setItem(rateKey, '1')
    const backupRaw = JSON.stringify({
      format: 'red-repeat-personal-backup',
      schemaVersion: 1,
      createdAt: '2026-10-14T00:00:00.000Z',
      payload: {
        practice: [],
        rates: [{
          identity: {
            songId: 'first-light',
            editionContentHash: edition.contentHash,
            audioSourceHash: edition.audio.sourceHash,
            timelineUrl: edition.timelineUrl,
          },
          value: 0.6,
        }],
        timingOverrides: [],
      },
    })
    const backupFile = new File([], 'backup.json', { type: 'application/json' })
    Object.defineProperty(backupFile, 'text', {
      value: async () => backupRaw,
    })

    render(
      <SettingsPage
        catalogState={{ status: 'ready', catalog }}
        runtimeClient={runtimeClient()}
        homeHref="/red-repeat/"
        onRetryCatalog={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('选择本机 JSON 备份'), {
      target: { files: [backupFile] },
    })
    expect(await screen.findByText(/预览已完成；当前尚未写入/)).toBeInTheDocument()
    expect(window.localStorage.getItem(rateKey)).toBe('1')
    expect(screen.getByText(/播放速度：新增 0，已有冲突 1/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/播放速度：/))
    fireEvent.click(screen.getByLabelText('明确覆盖该域中身份相同的已有值'))
    fireEvent.click(screen.getByLabelText(/播放速度：/))
    fireEvent.click(screen.getByLabelText(/播放速度：/))
    expect(screen.getByLabelText('明确覆盖该域中身份相同的已有值')).not.toBeChecked()
    fireEvent.click(screen.getByLabelText('明确覆盖该域中身份相同的已有值'))
    const confirm = screen.getByRole('button', { name: '确认导入所选数据域' })
    expect(confirm).toBeEnabled()
    expect(window.localStorage.getItem(rateKey)).toBe('1')
    fireEvent.click(confirm)

    expect(await screen.findByText(/已恢复 1 项本机状态/)).toBeInTheDocument()
    expect(window.localStorage.getItem(rateKey)).toBe('0.6')
  })

  it('manually checks for a newer build without offering an immediate reload action', async () => {
    const updateManager = createUpdateManager({
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({
        version: newerVersion,
        commit: 'abcdef123456',
        builtAt: '2026-08-24T00:00:00.000Z',
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

    const checkButton = screen.getByRole('button', { name: '检查更新' })
    expect(checkButton).toHaveClass('control-button', 'control-button--quiet')
    fireEvent.click(checkButton)

    expect(await screen.findByText(`发现新版本 ${newerVersion}，正在后台准备…`)).toBeInTheDocument()
    expect(screen.getByText('线上版本')).toBeInTheDocument()
    expect(screen.getByText('线上 Build SHA')).toBeInTheDocument()
    expect(screen.getByText('abcdef123456')).toBeInTheDocument()
    expect(screen.getByText('2026-08-24T00:00:00.000Z')).toBeInTheDocument()
    expect(screen.getByText('最近检查')).toBeInTheDocument()
    expect(screen.getByText('发现新版本，但暂时无法读取更新说明。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '立即更新' })).not.toBeInTheDocument()
  })

  it('shows remote release notes without replacing the local changelog', async () => {
    const updateManager = createUpdateManager({
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({
        version: newerVersion,
        commit: 'abcdef123456',
        builtAt: '2026-08-24T00:00:00.000Z',
        release: {
          version: newerVersion,
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
    expect(screen.getAllByText('1.3.0').length).toBeGreaterThan(0)
  })

  it('does not report the current build as latest after a failed manual check', async () => {
    const updateManager = createUpdateManager({
      fetchImpl: vi.fn(async () => new Response('offline', { status: 503 })),
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

    expect(await screen.findByText('检查失败（当前 App 不受影响）')).toBeInTheDocument()
    expect(screen.queryByText('已是最新版本')).not.toBeInTheDocument()
    expect(screen.queryByText('线上版本')).not.toBeInTheDocument()
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
    expect(highlighted?.textContent).toContain('移动曲库卡片紧凑重排')
  })
})

function nextPatchVersion(version: string): string {
  const [major, minor, patch] = version.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}
