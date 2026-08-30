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

export class RuntimeClient {
  private readonly appBaseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly activeControllers = new Set<AbortController>()
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
    )
  }

  loadLyrics(
    logicalRuntimePath: string,
    options: RuntimeLoadOptions = {},
  ): Promise<LyricsDocument> {
    return this.loadJson(logicalRuntimePath, LyricsSchema.parse, options)
  }

  loadTimeline(
    logicalRuntimePath: string,
    options: RuntimeLoadOptions = {},
  ): Promise<TimelineDocument> {
    return this.loadJson(logicalRuntimePath, TimelineSchema.parse, options)
  }

  loadPractice(
    logicalRuntimePath: string,
    options: RuntimeLoadOptions = {},
  ): Promise<PracticeDocument> {
    return this.loadJson(logicalRuntimePath, PracticeSchema.parse, options)
  }

  loadFeature(
    feature: RuntimeFeatureDescriptor | string,
    options: RuntimeLoadOptions = {},
  ): Promise<string> {
    const logicalRuntimePath =
      typeof feature === 'string' ? feature : feature.url
    return this.loadText(logicalRuntimePath, options)
  }

  resolveAsset(logicalRuntimePath: string): string {
    return this.resolve(logicalRuntimePath)
  }

  cancelPending(): void {
    this.requestGeneration += 1
    this.activeControllers.forEach((controller) => controller.abort())
    this.activeControllers.clear()
  }

  invalidate(): void {
    this.cancelPending()
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

  private async loadText(
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
