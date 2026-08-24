import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  createRuntimeClient,
  type RuntimeClient,
} from './runtime/runtime-client'

const emptyCatalog = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  editions: [],
}

const populatedCatalog = {
  contractVersion: 3,
  contentHash: 'b'.repeat(64),
  editions: [
    {
      songId: 'first-light',
      title: 'First Light',
      artist: 'A Composer',
      album: 'Returning',
      year: 2026,
      coverUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
      editionUrl: '/library-runtime/songs/first-light/edition.a.json',
    },
    {
      songId: 'second-signal',
      title: 'Second Signal',
      artist: 'Another Composer',
      coverUrl: '/library-runtime/songs/second-signal/cover-small.b.webp',
      editionUrl: '/library-runtime/songs/second-signal/edition.b.json',
    },
  ],
}

const boundaryCatalog = {
  contractVersion: 3,
  contentHash: 'f'.repeat(64),
  editions: [
    {
      songId: 'long-card',
      title: 'A Very Long Song Title That Must Stay On One Line',
      artist: 'Very Long Primary Artist Name × Another Collaborating Artist × Guest Artist',
      year: 2025,
      coverUrl: '/library-runtime/songs/long-card/cover-small.a.webp',
      editionUrl: '/library-runtime/songs/long-card/edition.a.json',
    },
    {
      songId: 'year-only',
      title: 'Year Only',
      artist: 'A Short Artist',
      year: 2024,
      coverUrl: '/library-runtime/songs/year-only/cover-small.b.webp',
      editionUrl: '/library-runtime/songs/year-only/edition.b.json',
    },
  ],
}

const runtimeEditionForApp = {
  contractVersion: 3,
  contentHash: 'c'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    album: 'Returning',
    year: 2026,
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.a.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.a.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.a.json',
  features: [],
  audio: {
    url: '/library-runtime/songs/first-light/audio.a.m4a',
    sourceHash: 'd'.repeat(64),
    runtimeHash: 'e'.repeat(64),
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
    coverSmallUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.a.webp',
  },
}

const resumeTimelineForApp = {
  audioSourceHash: 'd'.repeat(64),
  sections: [{ id: 'verse', label: 'Verse', startMs: 0, endMs: 1000 }],
  occurrences: [
    resumeOccurrence('o001', 100, 300),
    resumeOccurrence('o002', 400, 600),
  ],
}

const resumePracticeForApp = {
  units: [
    {
      id: 'p001',
      sectionId: 'verse',
      label: '主歌 B',
      occurrenceIds: ['o001', 'o002'],
    },
  ],
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('App Library consumer', () => {
  it('keeps the existing empty Library state for a zero-edition catalog', async () => {
    render(<App runtimeClient={clientFor(emptyCatalog)} />)

    expect(
      await screen.findByRole('heading', { name: '还没有歌曲' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('添加歌曲后，它们会显示在这里。'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('你的第一首歌会出现在这里。'),
    ).toBeInTheDocument()
  })

  it('shows an explicit loading state while catalog fetch is pending', async () => {
    let resolveResponse: ((response: Response) => void) | undefined
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    )
    const client = createRuntimeClient({ fetchImpl })

    render(<App runtimeClient={client} />)

    expect(screen.getByRole('status')).toHaveTextContent('正在加载…')
    resolveResponse?.(jsonResponse(emptyCatalog))
    expect(
      await screen.findByRole('heading', { name: '还没有歌曲' }),
    ).toBeInTheDocument()
  })

  it('shows a recoverable error and retries the catalog', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(jsonResponse(emptyCatalog))
    const client = createRuntimeClient({ fetchImpl })

    render(<App runtimeClient={client} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Runtime network while reading /library-runtime/catalog.json.',
    )
    fireEvent.click(screen.getByRole('button', { name: '重试' }))

    expect(
      await screen.findByRole('heading', { name: '还没有歌曲' }),
    ).toBeInTheDocument()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('keeps a direct edition route recoverable when the catalog fails', async () => {
    window.history.replaceState({}, '', '/#edition=first-light')
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      if (fetchImpl.mock.calls.length === 1) {
        throw new TypeError('offline')
      }
      return responseForAppUrl(input)
    })

    render(<App runtimeClient={createRuntimeClient({ fetchImpl })} />)

    expect(
      await screen.findByRole('alert', { name: '歌曲错误' }),
    ).toHaveTextContent(
      'Runtime network while reading /library-runtime/catalog.json.',
    )
    expect(
      screen.queryByRole('heading', { name: '正在打开歌曲…' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '重试' }))

    expect(
      await screen.findByRole('heading', { name: 'First Light' }),
    ).toBeInTheDocument()
  })

  it('keeps a missing edition separate from a catalog error', async () => {
    window.history.replaceState({}, '', '/#edition=missing')
    render(<App runtimeClient={clientFor(emptyCatalog)} />)

    expect(
      await screen.findByRole('heading', {
        name: '曲库里没有这首歌',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('alert', { name: '歌曲错误' }),
    ).not.toBeInTheDocument()
  })

  it('opens the dev-only Timeline Debugger from its explicit hash route', async () => {
    window.history.replaceState(
      {},
      '',
      '/#debug=timeline&edition=first-light',
    )
    render(<App runtimeClient={clientFor(populatedCatalog)} />)

    expect(
      await screen.findByRole('heading', { name: 'Timeline Debugger' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-debugger-state',
      'ready',
    )
    expect(screen.getByText('First Light')).toBeInTheDocument()
    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument()
    expect(screen.getByText('d'.repeat(64))).toBeInTheDocument()
    expect(screen.queryByText('曲库')).not.toBeInTheDocument()
  })

  it('opens the normal-product Timing Debugger route', async () => {
    window.history.replaceState({}, '', '/#timing=debug')
    render(<App runtimeClient={clientFor(populatedCatalog)} />)

    expect(
      await screen.findByRole('heading', { name: '选择一首歌' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /First Light/ }),
    ).toHaveAttribute('href', '/#timing=debug&edition=first-light')
  })

  it('shows an explicit debugger state for an unknown runtime edition', async () => {
    window.history.replaceState({}, '', '/#debug=timeline&edition=missing')
    render(<App runtimeClient={clientFor(populatedCatalog)} />)

    expect(
      await screen.findByRole('heading', {
        name: 'The requested edition is not in the runtime catalog.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-debugger-state',
      'missing-edition',
    )
  })

  it('shows the empty runtime catalog state inside the dev debugger', async () => {
    window.history.replaceState({}, '', '/#debug=timeline&edition=first-light')
    render(<App runtimeClient={clientFor(emptyCatalog)} />)

    expect(
      await screen.findByRole('heading', {
        name: 'The runtime catalog is empty.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-debugger-state',
      'empty',
    )
  })

  it('keeps debugger runtime resource failures explicit', async () => {
    window.history.replaceState({}, '', '/#debug=timeline&edition=first-light')
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.endsWith('/catalog.json')) {
        return jsonResponse(populatedCatalog)
      }
      throw new TypeError('offline')
    })

    render(<App runtimeClient={createRuntimeClient({ fetchImpl })} />)

    expect(
      await screen.findByRole('alert', { name: 'Could not load First Light.' }),
    ).toHaveTextContent(
      'Runtime network while reading /library-runtime/songs/first-light/edition.a.json.',
    )
  })

  it('renders the catalog as mobile-friendly song cards', async () => {
    render(<App runtimeClient={clientFor(populatedCatalog)} />)

    expect(screen.getByText('Curated by MyKr')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '设置' })).toHaveAttribute(
      'href',
      '/#settings',
    )
    expect(await screen.findByRole('heading', { name: '曲库' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: '曲库' })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: '全部歌曲' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '最近学习' }),
    ).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-song-id]')).toHaveLength(2)
    expect(
      await screen.findByRole('link', { name: '开始学唱 First Light' }),
    ).toHaveAttribute('href', '/#edition=first-light')
    expect(document.querySelectorAll('.catalog-arrow')).toHaveLength(0)
    expect(document.querySelectorAll('.catalog-entry-main')).toHaveLength(2)
    expect(
      screen.getAllByRole('button', { name: /下载 (First Light|Second Signal)/ }),
    ).toHaveLength(2)
    const firstDownloadButton = screen.getByRole('button', {
      name: '下载 First Light',
    })
    expect(firstDownloadButton).toBeInTheDocument()
    expect(firstDownloadButton.closest('a')).toBeNull()
    expect(
      screen.getByRole('button', { name: '下载 Second Signal' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '开始学唱 Second Signal' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Returning / 2026')).toBeInTheDocument()
    expect(screen.getByText('Another Composer')).toBeInTheDocument()
    expect(screen.queryByText(/liner edition/i)).not.toBeInTheDocument()
  })

  it('keeps long catalog metadata inside one compact card row', async () => {
    render(<App runtimeClient={clientFor(boundaryCatalog)} />)

    const longTitle = 'A Very Long Song Title That Must Stay On One Line'
    const longArtist =
      'Very Long Primary Artist Name × Another Collaborating Artist × Guest Artist'
    const longLink = await screen.findByRole('link', {
      name: `开始学唱 ${longTitle}`,
    })
    const longCard = longLink.closest('.catalog-entry')
    const artist = screen.getByText(longArtist)

    expect(longCard).not.toBeNull()
    expect(artist).toHaveClass('catalog-artist')
    expect(screen.getByText('2025')).toHaveClass('catalog-meta')
    expect(document.querySelectorAll('.catalog-download-slot')).toHaveLength(2)
    expect(longCard?.querySelector('.catalog-download-slot')?.parentElement).toHaveClass(
      'catalog-entry-main',
    )
    expect(screen.queryByText('↗')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '开始学唱 Year Only' }),
    ).toBeInTheDocument()
  })

  it('keeps installed, removing, installing, and failed download states in the compact slot', async () => {
    const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
    const originalFetch = globalThis.fetch
    const cacheEntries = new Map<string, Response>()
    const requestKey = (request: RequestInfo | URL): string => {
      if (typeof request === 'string') {
        return new URL(request, window.location.origin).toString()
      }
      return request instanceof URL ? request.toString() : request.url
    }
    const cache = {
      match: vi.fn(async (request: RequestInfo | URL) =>
        cacheEntries.get(requestKey(request))?.clone(),
      ),
      put: vi.fn(async (request: RequestInfo | URL, response: Response) => {
        cacheEntries.set(requestKey(request), response.clone())
      }),
      delete: vi.fn(async (request: RequestInfo | URL) =>
        cacheEntries.delete(requestKey(request)),
      ),
      keys: vi.fn(async () =>
        [...cacheEntries.keys()].map((url) => new Request(url)),
      ),
    } as unknown as Cache
    const storage = {
      open: vi.fn(async () => cache),
    } as unknown as CacheStorage
    const manifestUrl = new URL(
      '/.red-repeat/song-downloads/first-light.json',
      window.location.origin,
    ).toString()
    const resourceUrl = new URL(
      '/library-runtime/songs/first-light/edition.a.json',
      window.location.origin,
    ).toString()
    cacheEntries.set(
      manifestUrl,
      new Response(JSON.stringify({
        schemaVersion: 1,
        songId: 'first-light',
        contentHash: 'c'.repeat(64),
        urls: [resourceUrl],
        installedAt: 100,
      })),
    )
    cacheEntries.set(resourceUrl, new Response('installed resource'))

    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: storage,
    })
    let rejectDownload: ((reason?: unknown) => void) | undefined
    globalThis.fetch = vi.fn(
      () => new Promise<Response>((_resolve, reject) => {
        rejectDownload = reject
      }),
    ) as unknown as typeof fetch

    try {
      render(<App runtimeClient={clientFor(populatedCatalog)} />)

      expect(await screen.findByText('已下载')).toBeInTheDocument()
      expect(screen.getByText('已下载')).toBeInTheDocument()

      const firstCard = document.querySelector<HTMLElement>(
        '[data-song-id="first-light"]',
      )
      const firstSurface = firstCard?.querySelector<HTMLElement>(
        '.catalog-entry-surface',
      )
      const secondCard = document.querySelector<HTMLElement>(
        '[data-song-id="second-signal"]',
      )
      const secondSurface = secondCard?.querySelector<HTMLElement>(
        '.catalog-entry-surface',
      )
      expect(firstSurface).not.toBeNull()
      expect(secondSurface).not.toBeNull()
      expect(
        screen.queryByRole('button', { name: '删除 Second Signal' }),
      ).not.toBeInTheDocument()

      fireEvent.pointerDown(secondSurface!, {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 220,
        clientY: 24,
      })
      fireEvent.pointerMove(secondSurface!, {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 160,
        clientY: 24,
      })
      fireEvent.pointerUp(secondSurface!, {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 160,
        clientY: 24,
      })
      expect(secondCard).not.toHaveAttribute('data-swipe-open', 'true')

      fireEvent.pointerDown(firstSurface!, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 220,
        clientY: 24,
      })
      fireEvent.pointerMove(firstSurface!, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 160,
        clientY: 25,
      })
      fireEvent.pointerUp(firstSurface!, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 160,
        clientY: 25,
      })

      expect(firstCard).toHaveAttribute('data-swipe-open', 'true')
      expect(firstSurface).toHaveStyle({
        transform: 'translate3d(-68px, 0, 0)',
      })

      // The synthetic click emitted after the swipe is suppressed; the next tap closes the tray.
      fireEvent.click(firstSurface!)
      expect(firstCard).toHaveAttribute('data-swipe-open', 'true')
      expect(window.location.hash).toBe('')
      fireEvent.click(firstSurface!)
      expect(firstCard).not.toHaveAttribute('data-swipe-open')
      expect(window.location.hash).toBe('')

      const deleteButton = screen.getByRole('button', {
        name: '删除 First Light',
      })
      fireEvent.focus(deleteButton)
      expect(firstCard).toHaveAttribute('data-swipe-open', 'true')

      fireEvent.click(deleteButton)
      expect(
        await screen.findByRole('button', { name: '下载 First Light' }),
      ).toBeInTheDocument()

      fireEvent.click(
        screen.getByRole('button', { name: '下载 Second Signal' }),
      )
      const installingButton = await screen.findByRole('button', {
        name: '下载中… Second Signal',
      })
      expect(installingButton).toBeDisabled()

      rejectDownload?.(new Error('offline'))
      expect(
        await screen.findByRole('button', { name: '重试 Second Signal' }),
      ).toBeInTheDocument()
      expect(screen.getByText('下载失败，请检查网络后重试。')).toBeInTheDocument()
    } finally {
      globalThis.fetch = originalFetch
      if (originalCaches) {
        Object.defineProperty(globalThis, 'caches', originalCaches)
      } else {
        delete (globalThis as { caches?: CacheStorage }).caches
      }
    }
  })

  it('enters an edition without autoplay and returns through browser history', async () => {
    render(<App runtimeClient={clientFor(populatedCatalog)} />)

    fireEvent.click(
      await screen.findByRole('link', { name: '开始学唱 First Light' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'First Light' }),
    ).toBeInTheDocument()
    expect(screen.getByText('A Composer')).toBeInTheDocument()

    fireEvent.click(
      within(screen.getByRole('main')).getByRole('link', { name: '返回曲库' }),
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '曲库' })).toBeInTheDocument()
    })
  })

  it('renders the catalog before resume enrichment and then shows a direct continue summary', async () => {
    window.localStorage.setItem(
      'red-repeat:practice:first-light',
      JSON.stringify({
        schemaVersion: 1,
        practiceUnitId: 'p001',
        currentOccurrenceId: 'o002',
        coveredUntilByUnit: { p001: 'o002' },
        updatedAt: 200,
      }),
    )
    let resolveEdition: ((response: Response) => void) | undefined
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.endsWith('/catalog.json')) {
        return jsonResponse(populatedCatalog)
      }
      if (url.endsWith('/edition.a.json')) {
        return new Promise<Response>((resolve) => {
          resolveEdition = resolve
        })
      }
      return responseForResumeUrl(input)
    })

    render(<App runtimeClient={createRuntimeClient({ fetchImpl })} />)

    expect(
      await screen.findByRole('heading', { name: '曲库' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '开始学唱 First Light' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('上次：主歌 B · 第2句')).not.toBeInTheDocument()

    resolveEdition?.(jsonResponse(runtimeEditionForApp))

    expect(
      (await screen.findAllByRole('link', { name: '继续学唱 First Light' })).length,
    ).toBe(1)
    expect(screen.getAllByText('上次：主歌 B · 第2句')).toHaveLength(1)
    expect(
      fetchImpl.mock.calls.some(([input]) => String(input).endsWith('/lyrics.a.json')),
    ).toBe(false)
  })

  it('shows a legacy resume summary without writing a timestamp', async () => {
    const legacyState = JSON.stringify({
      schemaVersion: 1,
      practiceUnitId: 'p001',
      currentOccurrenceId: 'o002',
      coveredUntilByUnit: { p001: 'o002' },
    })
    window.localStorage.setItem('red-repeat:practice:first-light', legacyState)
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    try {
      render(
        <App
          runtimeClient={createRuntimeClient({
            fetchImpl: vi.fn(async (input) => responseForResumeUrl(input)),
          })}
        />,
      )

      expect(
        await screen.findByRole('link', { name: '继续学唱 First Light' }),
      ).toBeInTheDocument()
      expect(screen.getByText('上次：主歌 B · 第2句')).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: '最近学习' }),
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: '开始学唱 Second Signal' }),
      ).toBeInTheDocument()
      expect(window.localStorage.getItem('red-repeat:practice:first-light')).toBe(
        legacyState,
      )
      expect(setItemSpy).not.toHaveBeenCalled()
    } finally {
      setItemSpy.mockRestore()
    }
  })

  it('falls back to start when a legacy resume position is stale', async () => {
    window.localStorage.setItem(
      'red-repeat:practice:first-light',
      JSON.stringify({
        schemaVersion: 1,
        practiceUnitId: 'missing',
        currentOccurrenceId: 'missing',
        coveredUntilByUnit: { missing: 'missing' },
      }),
    )

    render(
      <App
        runtimeClient={createRuntimeClient({
          fetchImpl: vi.fn(async (input) => responseForResumeUrl(input)),
        })}
      />,
    )

    expect(
      await screen.findByRole('link', { name: '开始学唱 First Light' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/上次：/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '最近学习' }),
    ).not.toBeInTheDocument()
  })

  it('isolates a single resume enrichment failure and keeps its card usable', async () => {
    window.localStorage.setItem(
      'red-repeat:practice:first-light',
      JSON.stringify({
        schemaVersion: 1,
        practiceUnitId: 'p001',
        currentOccurrenceId: 'o002',
        coveredUntilByUnit: { p001: 'o002' },
        updatedAt: 200,
      }),
    )
    window.localStorage.setItem(
      'red-repeat:practice:second-signal',
      JSON.stringify({
        schemaVersion: 1,
        practiceUnitId: 'p001',
        currentOccurrenceId: 'o002',
        coveredUntilByUnit: { p001: 'o002' },
        updatedAt: 100,
      }),
    )
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.endsWith('/catalog.json')) {
        return jsonResponse(populatedCatalog)
      }
      if (url.includes('/second-signal/')) {
        throw new TypeError('resume offline')
      }
      return responseForResumeUrl(input)
    })

    render(<App runtimeClient={createRuntimeClient({ fetchImpl })} />)

    expect(
      (await screen.findAllByRole('link', { name: '继续学唱 First Light' })).length,
    ).toBe(1)
    expect(
      screen.getByRole('link', { name: '开始学唱 Second Signal' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('上次：主歌 B · 第2句')).toHaveLength(1)
  })

  it('keeps catalog order and filters title or artist in Unicode text', async () => {
    window.localStorage.setItem(
      'red-repeat:practice:first-light',
      JSON.stringify({
        schemaVersion: 1,
        practiceUnitId: 'p001',
        currentOccurrenceId: 'o001',
        coveredUntilByUnit: { p001: 'o001' },
        updatedAt: 100,
      }),
    )
    window.localStorage.setItem(
      'red-repeat:practice:second-signal',
      JSON.stringify({
        schemaVersion: 1,
        practiceUnitId: 'p001',
        currentOccurrenceId: 'o002',
        coveredUntilByUnit: { p001: 'o002' },
        updatedAt: 300,
      }),
    )
    render(<App runtimeClient={createRuntimeClient({ fetchImpl: vi.fn(async (input) => responseForResumeUrl(input)) })} />)

    await screen.findByRole('link', { name: '继续学唱 Second Signal' })
    expect(screen.getByRole('link', { name: '继续学唱 First Light' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '最近学习' }),
    ).not.toBeInTheDocument()

    const search = screen.getByRole('searchbox', { name: '搜索歌曲或歌手' })
    fireEvent.change(search, { target: { value: 'another' } })
    expect(screen.getByRole('link', { name: '继续学唱 Second Signal' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '继续学唱 First Light' })).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: '不存在' } })
    expect(screen.getByRole('status')).toHaveTextContent('没有找到歌曲')
    expect(screen.queryByRole('link', { name: '继续学唱 Second Signal' })).not.toBeInTheDocument()
  })
})

function clientFor(payload: unknown): RuntimeClient {
  return createRuntimeClient({
    fetchImpl: vi.fn(async (input) => responseForAppUrl(input, payload)),
  })
}

function responseForAppUrl(input: RequestInfo | URL, catalog: unknown = populatedCatalog): Response {
  const url = String(input)
  if (url.endsWith('/catalog.json')) {
    return jsonResponse(catalog)
  }
  if (url.endsWith('/edition.a.json') || url.endsWith('/edition.b.json')) {
    return jsonResponse(runtimeEditionForApp)
  }
  if (url.endsWith('/lyrics.a.json')) {
    return jsonResponse({ segments: [] })
  }
  if (url.endsWith('/timeline.a.json')) {
    return jsonResponse({
      audioSourceHash: 'a'.repeat(64),
      sections: [],
      occurrences: [],
    })
  }
  if (url.endsWith('/practice.a.json')) {
    return jsonResponse({ units: [] })
  }
  throw new Error(`unexpected App runtime URL: ${url}`)
}

function responseForResumeUrl(input: RequestInfo | URL): Response {
  const url = String(input)
  if (url.endsWith('/catalog.json')) {
    return jsonResponse(populatedCatalog)
  }
  if (url.endsWith('/edition.a.json') || url.endsWith('/edition.b.json')) {
    return jsonResponse(runtimeEditionForApp)
  }
  if (url.endsWith('/timeline.a.json')) {
    return jsonResponse(resumeTimelineForApp)
  }
  if (url.endsWith('/practice.a.json')) {
    return jsonResponse(resumePracticeForApp)
  }
  return jsonResponse({ segments: [] })
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
  })
}

function resumeOccurrence(id: string, startMs: number, endMs: number) {
  return {
    id,
    segmentId: `s${id.slice(1)}`,
    sectionId: 'verse',
    startMs,
    endMs,
    playStartMs: startMs - 50,
    playEndMs: endMs + 50,
  }
}
