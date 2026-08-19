import { describe, expect, it } from 'vitest'
import {
  classifyRuntimeRequest,
  RUNTIME_CACHE_NAMES,
  runtimeCaching,
} from './cache-routes'

const hash = 'a'.repeat(64)

describe('PWA Runtime cache routes', () => {
  it('keeps stable cache names independent from the app build hash', () => {
    expect(RUNTIME_CACHE_NAMES).toEqual({
      catalog: 'red-repeat-catalog-v1',
      runtime: 'red-repeat-runtime-v1',
      audio: 'red-repeat-audio-v1',
    })
  })

  it('classifies catalog as Network First', () => {
    expect(
      classifyRuntimeRequest(
        `https://example.test/red-repeat/library-runtime/catalog.json`,
      ),
    ).toBe('catalog')
    expect(runtimeCaching[0]).toMatchObject({
      handler: 'NetworkFirst',
      options: {
        cacheName: RUNTIME_CACHE_NAMES.catalog,
        networkTimeoutSeconds: 3,
      },
    })
  })

  it('classifies only hash-named structured, feature, and artwork resources', () => {
    const base = 'https://example.test/red-repeat/library-runtime/songs/first-light/'
    expect(classifyRuntimeRequest(`${base}edition.${hash}.json`)).toBe('runtime')
    expect(classifyRuntimeRequest(`${base}lyrics.${hash}.json`)).toBe('runtime')
    expect(classifyRuntimeRequest(`${base}features/essay.${hash}.md`)).toBe(
      'runtime',
    )
    expect(classifyRuntimeRequest(`${base}hero-large.${hash}.webp`)).toBe(
      'runtime',
    )
    expect(classifyRuntimeRequest(`${base}edition.not-hashed.json`)).toBeUndefined()
    expect(classifyRuntimeRequest(`${base}cover-large.${hash}.png`)).toBeUndefined()
  })

  it('uses Cache First plus Range Requests for complete audio responses', () => {
    const audioUrl =
      `https://example.test/red-repeat/library-runtime/songs/first-light/audio.${hash}.m4a`
    expect(classifyRuntimeRequest(audioUrl)).toBe('audio')
    expect(runtimeCaching[1]).toMatchObject({
      handler: 'CacheFirst',
      options: {
        cacheName: RUNTIME_CACHE_NAMES.audio,
        rangeRequests: true,
      },
    })
  })

  it('does not claim mutable or non-runtime URLs', () => {
    expect(classifyRuntimeRequest('/assets/app.js')).toBeUndefined()
    expect(
      classifyRuntimeRequest(
        '/library-runtime/songs/first-light/audio.current.m4a',
      ),
    ).toBeUndefined()
    expect(
      classifyRuntimeRequest(
        '/library-runtime/songs/first-light/edition.' + hash + '.json?cache=1',
      ),
    ).toBe('runtime')
  })
})
