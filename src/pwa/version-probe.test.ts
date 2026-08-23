import { describe, expect, it, vi } from 'vitest'
import { createVersionProbeUrl, fetchVersionProbe } from './version-probe'

describe('production version probe', () => {
  it('resolves version.json relative to the deployed base and bypasses caches', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input
      void init
      return new Response(
        JSON.stringify({ version: '1.2.0', commit: 'abcdef123456' }),
        { status: 200 },
      )
    })

    await expect(fetchVersionProbe({
      fetchImpl,
      locationHref: 'https://example.test/red-repeat/#settings',
      cacheBust: 42,
    })).resolves.toEqual({ version: '1.2.0', commit: 'abcdef123456' })

    expect(fetchImpl).toHaveBeenCalledWith(
      createVersionProbeUrl('https://example.test/red-repeat/#settings', 42),
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'cache-control': 'no-cache' },
      }),
    )
    expect(new URL(String(fetchImpl.mock.calls[0][0])).pathname).toBe(
      '/red-repeat/version.json',
    )
  })

  it('rejects an invalid or failed probe without accepting an arbitrary payload', async () => {
    const invalidResponse = vi.fn(async () => new Response(
      JSON.stringify({ version: 'latest', commit: '' }),
      { status: 200 },
    ))
    await expect(fetchVersionProbe({
      fetchImpl: invalidResponse,
      locationHref: 'https://example.test/',
    })).rejects.toThrow('invalid build identity')

    const failedResponse = vi.fn(async () => new Response('offline', { status: 503 }))
    await expect(fetchVersionProbe({
      fetchImpl: failedResponse,
      locationHref: 'https://example.test/',
    })).rejects.toThrow('HTTP 503')
  })
})
