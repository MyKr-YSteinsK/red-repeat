import type { VitePWAOptions } from 'vite-plugin-pwa'

type RuntimeCaching = NonNullable<
  VitePWAOptions['workbox']['runtimeCaching']
>[number]

export const RUNTIME_CACHE_NAMES = {
  catalog: 'red-repeat-catalog-v1',
  snapshot: 'red-repeat-song-download-v1',
  runtime: 'red-repeat-song-download-v1',
  audio: 'red-repeat-song-download-v1',
} as const

export const LEGACY_RUNTIME_CACHE_NAMES = [
  'red-repeat-runtime-v1',
  'red-repeat-audio-v1',
] as const

const catalogPattern = /\/library-runtime\/catalog\.json(?:\?.*)?$/
const hash = '[a-f0-9]{64}'
const immutableRuntimePattern = new RegExp(
  `\\/library-runtime\\/songs\\/[^/]+\\/(?:` +
    `(?:edition|lyrics|timeline|practice)\\.${hash}\\.json` +
    `|features\\/[^/]+\\.${hash}\\.md` +
    `|(?:cover-small|cover-large|hero-large)\\.${hash}\\.webp` +
    `)(?:\\?.*)?$`,
)
const audioPattern = new RegExp(
  `\\/library-runtime\\/songs\\/[^/]+\\/audio\\.${hash}\\.m4a(?:\\?.*)?$`,
)

export type RuntimeCacheRouteKind = 'catalog' | 'runtime' | 'audio'

export const runtimeCaching: RuntimeCaching[] = [
  {
    urlPattern: catalogPattern,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: RUNTIME_CACHE_NAMES.catalog,
      cacheableResponse: { statuses: [200] },
    },
  },
  {
    urlPattern: audioPattern,
    handler: 'CacheFirst',
    options: {
      cacheName: RUNTIME_CACHE_NAMES.audio,
      cacheableResponse: { statuses: [200] },
      rangeRequests: true,
    },
  },
  {
    urlPattern: immutableRuntimePattern,
    handler: 'CacheFirst',
    options: {
      cacheName: RUNTIME_CACHE_NAMES.runtime,
      cacheableResponse: { statuses: [200] },
    },
  },
]

export function classifyRuntimeRequest(
  requestUrl: string | URL,
): RuntimeCacheRouteKind | undefined {
  const url = String(requestUrl)
  if (catalogPattern.test(url)) {
    return 'catalog'
  }
  if (audioPattern.test(url)) {
    return 'audio'
  }
  if (immutableRuntimePattern.test(url)) {
    return 'runtime'
  }
  return undefined
}
