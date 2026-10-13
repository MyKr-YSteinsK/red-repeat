import {
  CatalogSchema,
  RuntimeEditionSchema,
  type Catalog,
  type RuntimeEdition,
  type RuntimeFeatureDescriptor,
} from '../library/runtime-schema'
import {
  LyricsSchema,
  PracticeSchema,
  TimelineSchema,
  type LyricsDocument,
  type PracticeDocument,
  type TimelineDocument,
} from '../library/schema'
import {
  fetchWithSongDownloadFallback,
  SongDownloadFetchError,
} from '../pwa/song-download'
import {
  deleteCatalogCache,
  readCatalogCache,
  writeCatalogCache,
} from '../pwa/catalog-cache'
import { resolveRuntimeAsset } from './runtime-url'

export const RUNTIME_CATALOG_PATH = '/library-runtime/catalog.json'

export type RuntimeClientErrorKind =
  | 'network'
  | 'offline-not-downloaded'
  | 'download-incomplete'
  | 'http'
  | 'json-parse'
  | 'schema'
  | 'abort'

export class RuntimeClientError extends Error {
  readonly kind: RuntimeClientErrorKind
  readonly logicalPath: string
  readonly url: string
  readonly status?: number

  constructor(options: {
    kind: RuntimeClientErrorKind
    logicalPath: string
    url: string
    message: string
    status?: number
    cause?: unknown
  }) {
    super(options.message, { cause: options.cause })
    this.name = 'RuntimeClientError'
    this.kind = options.kind
    this.logicalPath = options.logicalPath
    this.url = options.url
    this.status = options.status
  }
}

export interface RuntimeClientOptions {
  appBaseUrl?: string
  fetchImpl?: typeof fetch
}

export interface RuntimeLoadOptions {
  signal?: AbortSignal
}

interface RequestContext {
  controller: AbortController
  generation: number
  cleanup: () => void
}

interface PendingRuntimeResource {
  controller: AbortController
  promise: Promise<unknown>
  subscribers: number
  settled: boolean
}

const MAX_CACHED_RUNTIME_RESOURCES = 64

export class RuntimeClient {
  private readonly appBaseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly activeControllers = new Set<AbortController>()
  private readonly runtimeResourceCache = new Map<string, unknown>()
  private readonly pendingRuntimeResources = new Map<
    string,
    PendingRuntimeResource
  >()
  private requestGeneration = 0

  constructor(options: RuntimeClientOptions = {}) {
    this.appBaseUrl = options.appBaseUrl ?? import.meta.env.BASE_URL
    this.fetchImpl = options.fetchImpl ?? fetchWithSongDownloadFallback
  }

  loadCatalog(options: RuntimeLoadOptions = {}): Promise<Catalog> {
    return this.loadCatalogLocalFirst(options)
  }

  loadEdition(
    logicalRuntimePath: string,
    options: RuntimeLoadOptions = {},
  ): Promise<RuntimeEdition> {
    return this.loadJson(
      logicalRuntimePath,
      RuntimeEditionSchema.parse,
      options,
      undefined,
      'edition',
    )
  }

  loadLyrics(
    logicalRuntimePath: string,
    options: RuntimeLoadOptions = {},
  ): Promise<LyricsDocument> {
    return this.loadJson(
      logicalRuntimePath,
      LyricsSchema.parse,
      options,
      undefined,
      'lyrics',
    )
  }

  loadTimeline(
    logicalRuntimePath: string,
    options: RuntimeLoadOptions = {},
  ): Promise<TimelineDocument> {
    return this.loadJson(
      logicalRuntimePath,
      TimelineSchema.parse,
      options,
      undefined,
      'timeline',
    )
  }

  loadPractice(
    logicalRuntimePath: string,
    options: RuntimeLoadOptions = {},
  ): Promise<PracticeDocument> {
    return this.loadJson(
      logicalRuntimePath,
      PracticeSchema.parse,
      options,
      undefined,
      'practice',
    )
  }

  loadFeature(
    feature: RuntimeFeatureDescriptor | string,
    options: RuntimeLoadOptions = {},
  ): Promise<string> {
    const logicalRuntimePath =
      typeof feature === 'string' ? feature : feature.url
    return this.loadText(logicalRuntimePath, options, 'feature')
  }

  resolveAsset(logicalRuntimePath: string): string {
    return this.resolve(logicalRuntimePath)
  }

  cancelPending(): void {
    this.requestGeneration += 1
    this.activeControllers.forEach((controller) => controller.abort())
    this.activeControllers.clear()
    this.pendingRuntimeResources.forEach(({ controller }) => controller.abort())
    this.pendingRuntimeResources.clear()
  }

  invalidate(): void {
    this.cancelPending()
    this.runtimeResourceCache.clear()
  }

  private async loadCatalogLocalFirst(
    options: RuntimeLoadOptions,
  ): Promise<Catalog> {
    const logicalRuntimePath = RUNTIME_CATALOG_PATH
    const url = this.resolve(logicalRuntimePath)
    const cachedResponse = await readCatalogCache(url)

    if (cachedResponse) {
      const context = this.beginRequest(options.signal)
      try {
        const catalog = await this.parseJsonResponse(
          logicalRuntimePath,
          url,
          cachedResponse,
          context,
          CatalogSchema.parse,
        )
        void this.refreshCatalogCache(url, catalog.contentHash)
        return catalog
      } catch (error) {
        if (error instanceof RuntimeClientError && error.kind === 'abort') {
          throw error
        }
        await deleteCatalogCache(url)
      } finally {
        context.cleanup()
      }
    }

    return this.loadJson(
      logicalRuntimePath,
      CatalogSchema.parse,
      options,
      async (response) => writeCatalogCache(url, response),
    )
  }

  private async refreshCatalogCache(
    url: string,
    currentContentHash: string,
  ): Promise<void> {
    try {
      const response = await this.fetchImpl(url, {
        credentials: 'same-origin',
      })
      if (!response.ok) {
        return
      }

      const cacheResponse = response.clone()
      const payload: unknown = await response.json()
      const parsed = CatalogSchema.safeParse(payload)
      if (
        !parsed.success ||
        parsed.data.contentHash === currentContentHash
      ) {
        return
      }
      await writeCatalogCache(url, cacheResponse)
    } catch {
      // Background freshness must not invalidate the current session catalog.
    }
  }

  private async loadJson<T>(
    logicalRuntimePath: string,
    parse: (value: unknown) => T,
    options: RuntimeLoadOptions,
    onValidatedResponse?: (response: Response) => Promise<void>,
    cacheKind?: string,
  ): Promise<T> {
    const url = this.resolve(logicalRuntimePath)
    if (cacheKind && isContentAddressedRuntimePath(logicalRuntimePath)) {
      return this.loadCachedRuntimeResource(
        `json:${cacheKind}:${url}`,
        logicalRuntimePath,
        url,
        options.signal,
        (signal) =>
          this.loadJsonUncached(
            logicalRuntimePath,
            parse,
            { signal },
            onValidatedResponse,
          ),
      )
    }

    return this.loadJsonUncached(
      logicalRuntimePath,
      parse,
      options,
      onValidatedResponse,
    )
  }

  private async loadJsonUncached<T>(
    logicalRuntimePath: string,
    parse: (value: unknown) => T,
    options: RuntimeLoadOptions,
    onValidatedResponse?: (response: Response) => Promise<void>,
  ): Promise<T> {
    const url = this.resolve(logicalRuntimePath)
    const context = this.beginRequest(options.signal)

    try {
      const response = await this.fetchResponse(
        logicalRuntimePath,
        url,
        context,
      )
      const responseForPersistence = onValidatedResponse
        ? response.clone()
        : undefined
      const parsed = await this.parseJsonResponse(
        logicalRuntimePath,
        url,
        response,
        context,
        parse,
      )
      if (responseForPersistence && onValidatedResponse) {
        await onValidatedResponse(responseForPersistence)
      }
      return parsed
    } finally {
      context.cleanup()
    }
  }

  private async parseJsonResponse<T>(
    logicalRuntimePath: string,
    url: string,
    response: Response,
    context: RequestContext,
    parse: (value: unknown) => T,
  ): Promise<T> {
    this.assertCurrent(logicalRuntimePath, url, context)

    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      this.assertCurrent(logicalRuntimePath, url, context)
      throw new RuntimeClientError({
        kind: 'json-parse',
        logicalPath: logicalRuntimePath,
        url,
        message: `failed to parse runtime JSON: ${logicalRuntimePath}`,
        cause: error,
      })
    }

    this.assertCurrent(logicalRuntimePath, url, context)

    try {
      return parse(payload)
    } catch (error) {
      throw new RuntimeClientError({
        kind: 'schema',
        logicalPath: logicalRuntimePath,
        url,
        message: `runtime schema validation failed: ${logicalRuntimePath}`,
        cause: error,
      })
    }
  }

  private loadText(
    logicalRuntimePath: string,
    options: RuntimeLoadOptions,
    cacheKind?: string,
  ): Promise<string> {
    const url = this.resolve(logicalRuntimePath)
    if (cacheKind && isContentAddressedRuntimePath(logicalRuntimePath)) {
      return this.loadCachedRuntimeResource(
        `text:${cacheKind}:${url}`,
        logicalRuntimePath,
        url,
        options.signal,
        (signal) => this.loadTextUncached(logicalRuntimePath, { signal }),
      )
    }

    return this.loadTextUncached(logicalRuntimePath, options)
  }

  private async loadTextUncached(
    logicalRuntimePath: string,
    options: RuntimeLoadOptions,
  ): Promise<string> {
    const url = this.resolve(logicalRuntimePath)
    const context = this.beginRequest(options.signal)

    try {
      const response = await this.fetchResponse(
        logicalRuntimePath,
        url,
        context,
      )
      this.assertCurrent(logicalRuntimePath, url, context)
      try {
        return await response.text()
      } catch (error) {
        if (this.isAborted(context)) {
          throw this.createAbortError(logicalRuntimePath, url, error)
        }
        throw new RuntimeClientError({
          kind: 'network',
          logicalPath: logicalRuntimePath,
          url,
          message: `runtime text request failed: ${logicalRuntimePath}`,
          cause: error,
        })
      }
    } finally {
      context.cleanup()
    }
  }

  private loadCachedRuntimeResource<T>(
    cacheKey: string,
    logicalRuntimePath: string,
    url: string,
    signal: AbortSignal | undefined,
    load: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (signal?.aborted) {
      return Promise.reject(this.createAbortError(logicalRuntimePath, url))
    }

    const cachedValue = this.getCachedRuntimeResource(cacheKey)
    if (cachedValue !== undefined) {
      return Promise.resolve(cachedValue as T)
    }

    let pending = this.pendingRuntimeResources.get(cacheKey)
    if (pending?.settled || pending?.controller.signal.aborted) {
      if (this.pendingRuntimeResources.get(cacheKey) === pending) {
        this.pendingRuntimeResources.delete(cacheKey)
      }
      pending = undefined
    }
    if (!pending) {
      const controller = new AbortController()
      const generation = this.requestGeneration
      const pendingResource: PendingRuntimeResource = {
        controller,
        promise: Promise.resolve(undefined),
        subscribers: 0,
        settled: false,
      }
      pendingResource.promise = Promise.resolve()
        .then(() => load(controller.signal))
        .then((value) => {
          if (
            controller.signal.aborted ||
            generation !== this.requestGeneration
          ) {
            throw this.createAbortError(logicalRuntimePath, url)
          }
          this.setCachedRuntimeResource(cacheKey, value)
          return value
        })
        .finally(() => {
          pendingResource.settled = true
          if (this.pendingRuntimeResources.get(cacheKey) === pendingResource) {
            this.pendingRuntimeResources.delete(cacheKey)
          }
        })
      this.pendingRuntimeResources.set(cacheKey, pendingResource)
      pending = pendingResource
    }

    return this.subscribeToRuntimeResource<T>(
      pending,
      logicalRuntimePath,
      url,
      signal,
    )
  }

  private subscribeToRuntimeResource<T>(
    pending: PendingRuntimeResource,
    logicalRuntimePath: string,
    url: string,
    signal?: AbortSignal,
  ): Promise<T> {
    if (signal?.aborted) {
      return Promise.reject(this.createAbortError(logicalRuntimePath, url))
    }

    pending.subscribers += 1
    return new Promise<T>((resolve, reject) => {
      let complete = false
      const finish = (): boolean => {
        if (complete) {
          return false
        }
        complete = true
        signal?.removeEventListener('abort', abortSubscriber)
        pending.subscribers = Math.max(0, pending.subscribers - 1)
        return true
      }
      const abortSubscriber = (): void => {
        if (!finish()) {
          return
        }
        reject(this.createAbortError(logicalRuntimePath, url))
        void Promise.resolve().then(() => {
          if (pending.subscribers === 0 && !pending.settled) {
            pending.controller.abort()
          }
        })
      }

      signal?.addEventListener('abort', abortSubscriber, { once: true })
      pending.promise.then(
        (value) => {
          if (finish()) {
            resolve(value as T)
          }
        },
        (error: unknown) => {
          if (finish()) {
            reject(error)
          }
        },
      )
    })
  }

  private getCachedRuntimeResource(cacheKey: string): unknown {
    if (!this.runtimeResourceCache.has(cacheKey)) {
      return undefined
    }
    const value = this.runtimeResourceCache.get(cacheKey)
    this.runtimeResourceCache.delete(cacheKey)
    this.runtimeResourceCache.set(cacheKey, value)
    return value
  }

  private setCachedRuntimeResource(cacheKey: string, value: unknown): void {
    this.runtimeResourceCache.delete(cacheKey)
    this.runtimeResourceCache.set(cacheKey, value)
    while (this.runtimeResourceCache.size > MAX_CACHED_RUNTIME_RESOURCES) {
      const oldestKey = this.runtimeResourceCache.keys().next().value
      if (oldestKey === undefined) {
        return
      }
      this.runtimeResourceCache.delete(oldestKey)
    }
  }

  private resolve(logicalRuntimePath: string): string {
    return resolveRuntimeAsset(logicalRuntimePath, this.appBaseUrl)
  }

  private beginRequest(signal?: AbortSignal): RequestContext {
    const controller = new AbortController()
    const generation = this.requestGeneration
    const abortFromCaller = (): void => controller.abort()

    if (signal) {
      if (signal.aborted) {
        controller.abort()
      } else {
        signal.addEventListener('abort', abortFromCaller, { once: true })
      }
    }

    this.activeControllers.add(controller)

    return {
      controller,
      generation,
      cleanup: () => {
        this.activeControllers.delete(controller)
        signal?.removeEventListener('abort', abortFromCaller)
      },
    }
  }

  private async fetchResponse(
    logicalRuntimePath: string,
    url: string,
    context: RequestContext,
  ): Promise<Response> {
    this.assertCurrent(logicalRuntimePath, url, context)

    let response: Response
    try {
      response = await this.fetchImpl(url, { signal: context.controller.signal })
    } catch (error) {
      if (this.isAborted(context)) {
        throw this.createAbortError(logicalRuntimePath, url, error)
      }

      throw new RuntimeClientError({
        kind: error instanceof SongDownloadFetchError
          ? error.kind
          : 'network',
        logicalPath: logicalRuntimePath,
        url,
        message: `runtime request failed: ${logicalRuntimePath}`,
        cause: error,
      })
    }

    this.assertCurrent(logicalRuntimePath, url, context)

    if (!response.ok) {
      throw new RuntimeClientError({
        kind: 'http',
        logicalPath: logicalRuntimePath,
        url,
        status: response.status,
        message: `runtime request returned HTTP ${response.status}: ${logicalRuntimePath}`,
      })
    }

    return response
  }

  private assertCurrent(
    logicalRuntimePath: string,
    url: string,
    context: RequestContext,
  ): void {
    if (this.isAborted(context)) {
      throw this.createAbortError(logicalRuntimePath, url)
    }
  }

  private isAborted(context: RequestContext): boolean {
    return (
      context.controller.signal.aborted ||
      context.generation !== this.requestGeneration
    )
  }

  private createAbortError(
    logicalRuntimePath: string,
    url: string,
    cause?: unknown,
  ): RuntimeClientError {
    return new RuntimeClientError({
      kind: 'abort',
      logicalPath: logicalRuntimePath,
      url,
      message: `runtime request aborted: ${logicalRuntimePath}`,
      cause,
    })
  }
}

export function createRuntimeClient(
  options: RuntimeClientOptions = {},
): RuntimeClient {
  return new RuntimeClient(options)
}

function isContentAddressedRuntimePath(logicalRuntimePath: string): boolean {
  const path = logicalRuntimePath.split(/[?#]/, 1)[0] ?? logicalRuntimePath
  return /\.[a-f0-9]{64}\.(?:json|md)$/.test(path)
}
