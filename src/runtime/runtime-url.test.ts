import { describe, expect, it } from 'vitest'
import { resolveRuntimeAsset } from './runtime-url'

describe('runtime asset URL resolution', () => {
  it('resolves root deployment paths', () => {
    expect(
      resolveRuntimeAsset('/library-runtime/catalog.json', '/'),
    ).toBe('/library-runtime/catalog.json')
  })

  it('resolves a nested application base path', () => {
    expect(
      resolveRuntimeAsset('/library-runtime/catalog.json', '/red-repeat/'),
    ).toBe('/red-repeat/library-runtime/catalog.json')
  })

  it('resolves nested edition, audio, and artwork resources', () => {
    const base = '/red-repeat'

    expect(
      resolveRuntimeAsset(
        '/library-runtime/songs/first-light/edition.abc.json',
        base,
      ),
    ).toBe('/red-repeat/library-runtime/songs/first-light/edition.abc.json')
    expect(
      resolveRuntimeAsset(
        '/library-runtime/songs/first-light/audio.abc.m4a',
        base,
      ),
    ).toBe('/red-repeat/library-runtime/songs/first-light/audio.abc.m4a')
    expect(
      resolveRuntimeAsset(
        '/library-runtime/songs/first-light/cover-large.abc.webp',
        base,
      ),
    ).toBe('/red-repeat/library-runtime/songs/first-light/cover-large.abc.webp')
  })

  it('supports an absolute application base URL', () => {
    expect(
      resolveRuntimeAsset(
        '/library-runtime/catalog.json',
        'https://example.test/red-repeat/',
      ),
    ).toBe('https://example.test/red-repeat/library-runtime/catalog.json')
  })

  it('rejects paths outside the runtime namespace', () => {
    expect(() => resolveRuntimeAsset('/assets/app.js', '/')).toThrow(
      '/library-runtime/',
    )
    expect(() => resolveRuntimeAsset('library-runtime/catalog.json', '/')).toThrow(
      '/library-runtime/',
    )
    expect(() =>
      resolveRuntimeAsset('/library-runtime/../assets/app.js', '/'),
    ).toThrow('/library-runtime/')
  })
})
