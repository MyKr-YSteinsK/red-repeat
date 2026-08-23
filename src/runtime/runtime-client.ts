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
import { fetchWithSongDownloadFallback } from '../pwa/song-download'
import { resolveRuntimeAsset } from './runtime-url'

export const RUNTIME_CATALOG_PATH = '/library-runtime/catalog.json'

export type RuntimeClientErrorKind =
  | 'network'
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
    return this.loadJson(
      RUNTIME_CATALOG_PATH,
      CatalogSchema.parse,
      options,
    )
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

  private async loadJson<T>(
    logicalRuntimePath: string,
    parse: (value: unknown) => T,
    options: RuntimeLoadOptions,
  ): Promise<T> {
    const url = this.resolve(logicalRuntimePath)
    const context = this.beginRequest(options.signal)

    try {
      const response = await this.fetchResponse(
        logicalRuntimePath,
        url,
        context,
      )
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
    } finally {
      context.cleanup()
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
    let response: Response
    try {
      response = await this.fetchImpl(url, { signal: context.controller.signal })
    } catch (error) {
      if (this.isAborted(context)) {
        throw this.createAbortError(logicalRuntimePath, url, error)
      }

      throw new RuntimeClientError({
        kind: 'network',
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
