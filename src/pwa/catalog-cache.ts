import { RUNTIME_CACHE_NAMES } from './cache-routes'

export async function readCatalogCache(
  requestUrl: string,
): Promise<Response | undefined> {
  const storage = getCacheStorage()
  if (!storage) {
    return undefined
  }

  try {
    const cache = await storage.open(RUNTIME_CACHE_NAMES.catalog)
    return await cache.match(requestUrl)
  } catch {
    return undefined
  }
}

export async function writeCatalogCache(
  requestUrl: string,
  response: Response,
): Promise<void> {
  const storage = getCacheStorage()
  if (!storage) {
    return
  }

  try {
    const cache = await storage.open(RUNTIME_CACHE_NAMES.catalog)
    await cache.put(requestUrl, response)
  } catch {
    // Catalog persistence is an optimization; a valid network response remains usable.
  }
}

export async function deleteCatalogCache(requestUrl: string): Promise<void> {
  const storage = getCacheStorage()
  if (!storage) {
    return
  }

  try {
    const cache = await storage.open(RUNTIME_CACHE_NAMES.catalog)
    await cache.delete(requestUrl)
  } catch {
    // A malformed optional cache entry must not block the network recovery path.
  }
}

function getCacheStorage(): CacheStorage | undefined {
  return typeof caches === 'undefined' ? undefined : caches
}
