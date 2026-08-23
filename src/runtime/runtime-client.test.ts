import { describe, expect, it, vi } from 'vitest'
import {
  createRuntimeClient,
  RuntimeClientError,
  type RuntimeClientErrorKind,
} from './runtime-client'

const catalog = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
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
  ],
}

const edition = {
  contractVersion: 3,
  contentHash: 'b'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    album: 'Returning',
    year: 2026,
    intro: 'A quiet beginning.',
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.a.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.a.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.a.json',
  features: [
    {
      id: 'liner-note',
      url: '/library-runtime/songs/first-light/features/liner-note.md',
    },
  ],
  audio: {
    url: '/library-runtime/songs/first-light/audio.a.m4a',
    sourceHash: 'c'.repeat(64),
    runtimeHash: 'd'.repeat(64),
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
    heroLargeUrl: '/library-runtime/songs/first-light/hero-large.a.webp',
  },
}

const lyrics = {
  segments: [
    {
      id: 's001',
      lyrics: 'First light',
      translation: '初光',
      layers: [{ id: 'reading', label: 'Reading', text: 'ファーストライト' }],
    },
  ],
}

const timeline = {
  audioSourceHash: 'a'.repeat(64),
  sections: [
    { id: 'verse', label: 'Verse', startMs: 0, endMs: 1000 },
  ],
  occurrences: [
    {
      id: 'o001',
      segmentId: 's001',
      sectionId: 'verse',
      startMs: 100,
      endMs: 500,
      playStartMs: 0,
      playEndMs: 600,
    },
  ],
}

const practice = {
  units: [],
}

describe('Runtime Client', () => {
  it('loads a catalog through the resolver at the root base', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(catalog))
    const client = createRuntimeClient({ appBaseUrl: '/', fetchImpl })

    await expect(client.loadCatalog()).resolves.toEqual(catalog)
    expect(fetchImpl).toHaveBeenCalledWith('/library-runtime/catalog.json', {
      signal: expect.any(AbortSignal),
    })
  })

  it('binds native global fetch to globalThis when no implementation is injected', async () => {
    const originalFetch = globalThis.fetch
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
    const receiverSensitiveFetch = function (
      this: typeof globalThis,
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      expect(this).toBe(globalThis)
      calls.push({ input, init })
      return Promise.resolve(jsonResponse(catalog))
    }

    globalThis.fetch = receiverSensitiveFetch as typeof fetch
    try {
      const client = createRuntimeClient({ appBaseUrl: '/' })

      await expect(client.loadCatalog()).resolves.toEqual(catalog)
      expect(calls).toHaveLength(1)
      expect(calls[0]?.input).toBe('/library-runtime/catalog.json')
      expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('loads edition resources through a nested base path', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(catalog))
      .mockResolvedValueOnce(jsonResponse(edition))
      .mockResolvedValueOnce(jsonResponse(lyrics))
      .mockResolvedValueOnce(jsonResponse(timeline))
      .mockResolvedValueOnce(jsonResponse(practice))
      .mockResolvedValueOnce(new Response('# Liner note\n'))
    const client = createRuntimeClient({
      appBaseUrl: '/red-repeat/',
      fetchImpl,
    })

    await client.loadCatalog()
    await client.loadEdition(catalog.editions[0].editionUrl)
    await client.loadLyrics(edition.lyricsUrl)
    await client.loadTimeline(edition.timelineUrl)
    await client.loadPractice(edition.practiceUrl)
    await expect(client.loadFeature(edition.features[0])).resolves.toBe(
      '# Liner note\n',
    )

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      '/red-repeat/library-runtime/catalog.json',
      '/red-repeat/library-runtime/songs/first-light/edition.a.json',
      '/red-repeat/library-runtime/songs/first-light/lyrics.a.json',
      '/red-repeat/library-runtime/songs/first-light/timeline.a.json',
      '/red-repeat/library-runtime/songs/first-light/practice.a.json',
      '/red-repeat/library-runtime/songs/first-light/features/liner-note.md',
    ])
  })

  it('rejects invalid runtime JSON with a schema error', async () => {
    const client = createRuntimeClient({
      fetchImpl: vi.fn(async () => jsonResponse({ invalid: true })),
    })

    await expectRuntimeError(
      client.loadCatalog(),
      'schema',
      '/library-runtime/catalog.json',
    )
  })

  it('distinguishes malformed JSON from schema mismatch', async () => {
    const client = createRuntimeClient({
      fetchImpl: vi.fn(async () => new Response('{not-json')),
    })

    await expectRuntimeError(
      client.loadEdition('/library-runtime/songs/first-light/edition.a.json'),
      'json-parse',
      '/library-runtime/songs/first-light/edition.a.json',
    )
  })

  it('distinguishes non-success HTTP responses', async () => {
    const client = createRuntimeClient({
      fetchImpl: vi.fn(async () => new Response('missing', { status: 404 })),
    })

    await expectRuntimeError(
      client.loadCatalog(),
      'http',
      '/library-runtime/catalog.json',
    )
  })

  it('distinguishes network failures', async () => {
    const client = createRuntimeClient({
      fetchImpl: vi.fn(async () => {
        throw new TypeError('offline')
      }),
    })

    await expectRuntimeError(
      client.loadCatalog(),
      'network',
      '/library-runtime/catalog.json',
    )
  })

  it('normalizes caller cancellation', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'))
          })
        }),
    )
    const client = createRuntimeClient({ fetchImpl })
    const pending = client.loadCatalog({ signal: controller.signal })

    controller.abort()

    await expectRuntimeError(pending, 'abort', '/library-runtime/catalog.json')
  })

  it('invalidates an old response when pending work is cancelled', async () => {
    let resolveResponse: ((response: Response) => void) | undefined
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    )
    const client = createRuntimeClient({ fetchImpl })
    const pending = client.loadEdition(
      '/library-runtime/songs/first-light/edition.a.json',
    )

    client.cancelPending()
    resolveResponse?.(jsonResponse(edition))

    await expectRuntimeError(
      pending,
      'abort',
      '/library-runtime/songs/first-light/edition.a.json',
    )
  })

  it('loads Feature Markdown as text without JSON parsing', async () => {
    const fetchImpl = vi.fn(async () => new Response('## Notes\n\nA paragraph.'))
    const client = createRuntimeClient({ fetchImpl })

    await expect(
      client.loadFeature('/library-runtime/songs/first-light/note.md'),
    ).resolves.toBe('## Notes\n\nA paragraph.')
  })

  it('rejects a non-runtime logical path before fetching', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(catalog))
    const client = createRuntimeClient({ fetchImpl })

    await expect(
      client.loadEdition('/assets/edition.json'),
    ).rejects.toThrow('/library-runtime/')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

async function expectRuntimeError(
  promise: Promise<unknown>,
  kind: RuntimeClientErrorKind,
  logicalPath: string,
): Promise<void> {
  await expect(promise).rejects.toSatisfy((error: unknown) => {
    return (
      error instanceof RuntimeClientError &&
      error.kind === kind &&
      error.logicalPath === logicalPath
    )
  })
}
