import type {
  Catalog,
  CatalogEdition,
  RuntimeEdition,
} from '../library/runtime-schema'
import type { RuntimeClient, RuntimeLoadOptions } from '../runtime/runtime-client'

export interface RuntimeAssetWarmupOptions {
  fetchImpl?: typeof fetch
  isServiceWorkerControlled?: () => boolean
  signal?: AbortSignal
  onError?: (url: string, error: unknown) => void
}

export interface CatalogWarmupOptions extends RuntimeAssetWarmupOptions {
  songConcurrency?: number
  assetConcurrency?: number
  onSongError?: (songId: string, error: unknown) => void
}

export interface RuntimeWarmupSummary {
  attempted: number
  warmed: number
  failed: number
  skipped: boolean
}

const DEFAULT_SONG_CONCURRENCY = 2
const DEFAULT_ASSET_CONCURRENCY = 3

export async function warmRuntimeAsset(
  url: string,
  options: RuntimeAssetWarmupOptions = {},
): Promise<boolean> {
  if (!isServiceWorkerControlled(options.isServiceWorkerControlled)) {
    return false
  }

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: 'GET',
      credentials: 'same-origin',
      signal: options.signal,
    })
    if (!response.ok) {
      options.onError?.(url, new Error(`runtime warmup returned HTTP ${response.status}`))
      return false
    }
    return true
  } catch (error) {
    options.onError?.(url, error)
    return false
  }
}

export async function warmRuntimeAssets(
  urls: readonly string[],
  options: RuntimeAssetWarmupOptions & { concurrency?: number } = {},
): Promise<RuntimeWarmupSummary> {
  if (!isServiceWorkerControlled(options.isServiceWorkerControlled)) {
    return { attempted: 0, warmed: 0, failed: 0, skipped: true }
  }

  const pendingUrls = [...new Set(urls)]
  let nextIndex = 0
  let warmed = 0
  let failed = 0
  const workerCount = Math.min(
    Math.max(1, options.concurrency ?? DEFAULT_ASSET_CONCURRENCY),
    pendingUrls.length,
  )

  const worker = async (): Promise<void> => {
    while (nextIndex < pendingUrls.length) {
      if (options.signal?.aborted) {
        return
      }

      const url = pendingUrls[nextIndex]
      nextIndex += 1
      const didWarm = await warmRuntimeAsset(url, options)
      if (didWarm) {
        warmed += 1
      } else {
        failed += 1
      }
    }
  }

  await Promise.all(
    Array.from({ length: workerCount }, () => worker()),
  )

  return {
    attempted: pendingUrls.length,
    warmed,
    failed,
    skipped: false,
  }
}

export async function warmCatalogRuntime(
  catalog: Catalog,
  runtimeClient: RuntimeClient,
  options: CatalogWarmupOptions = {},
): Promise<RuntimeWarmupSummary> {
  if (!isServiceWorkerControlled(options.isServiceWorkerControlled)) {
    return { attempted: 0, warmed: 0, failed: 0, skipped: true }
  }

  const editions = [...catalog.editions]
  let nextIndex = 0
  let attempted = 0
  let warmed = 0
  let failed = 0
  const workerCount = Math.min(
    Math.max(1, options.songConcurrency ?? DEFAULT_SONG_CONCURRENCY),
    editions.length,
  )

  const worker = async (): Promise<void> => {
    while (nextIndex < editions.length) {
      if (options.signal?.aborted) {
        return
      }

      const catalogEdition = editions[nextIndex]
      nextIndex += 1
      const summary = await warmSongRuntime(
        catalogEdition,
        runtimeClient,
        options,
      )
      attempted += summary.attempted
      warmed += summary.warmed
      failed += summary.failed
    }
  }

  if (workerCount > 0) {
    await Promise.all(
      Array.from({ length: workerCount }, () => worker()),
    )
  }

  return { attempted, warmed, failed, skipped: false }
}

async function warmSongRuntime(
  catalogEdition: CatalogEdition,
  runtimeClient: RuntimeClient,
  options: CatalogWarmupOptions,
): Promise<RuntimeWarmupSummary> {
  let edition: RuntimeEdition
  try {
    edition = await runtimeClient.loadEdition(catalogEdition.editionUrl, {
      signal: options.signal,
    } satisfies RuntimeLoadOptions)
  } catch (error) {
    options.onSongError?.(catalogEdition.songId, error)
    return { attempted: 0, warmed: 0, failed: 1, skipped: false }
  }

  const logicalPaths = [
    catalogEdition.coverUrl,
    edition.lyricsUrl,
    edition.timelineUrl,
    edition.practiceUrl,
    edition.visualUrl,
    ...edition.features.map((feature) => feature.url),
    edition.artwork.coverSmallUrl,
    edition.artwork.coverLargeUrl,
    ...(edition.artwork.heroLargeUrl ? [edition.artwork.heroLargeUrl] : []),
    edition.audio.url,
  ]
  const urls = logicalPaths.map((logicalPath) =>
    runtimeClient.resolveAsset(logicalPath),
  )
  return warmRuntimeAssets(urls, options)
}

function isServiceWorkerControlled(
  override?: () => boolean,
): boolean {
  if (override) {
    return override()
  }

  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    Boolean(navigator.serviceWorker.controller)
  )
}
