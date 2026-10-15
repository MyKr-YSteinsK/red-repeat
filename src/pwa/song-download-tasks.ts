import type { CatalogEdition } from '../library/runtime-schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import {
  downloadSongRuntime,
  readSongDownloadState,
  removeSongRuntime,
  type SongDownloadProgress,
  type SongDownloadState,
} from './song-download'

export type SongDownloadTaskSource = 'manual' | 'catalog-refresh'

export type SongDownloadTaskSnapshot =
  | {
      kind: 'download'
      songId: string
      editionUrl: string
      source: SongDownloadTaskSource
      status: 'running'
      phase: SongDownloadProgress['phase']
      completedResources: number
      totalResources?: number
    }
  | {
      kind: 'download'
      songId: string
      editionUrl: string
      source: SongDownloadTaskSource
      status: 'completed' | 'cancelled' | 'failed'
      phase: SongDownloadProgress['phase']
      completedResources: number
      totalResources?: number
      resultState: SongDownloadState
      message?: string
    }
  | {
      kind: 'remove'
      songId: string
      status: 'running'
    }

export type SongDownloadTaskStartResult =
  | {
      outcome: 'started' | 'joined' | 'already-completed'
      completion: Promise<SongDownloadState>
    }
  | {
      outcome: 'conflict'
      task: SongDownloadTaskSnapshot
    }

interface SongDownloadTaskDependencies {
  download: typeof downloadSongRuntime
  readState: typeof readSongDownloadState
  remove: typeof removeSongRuntime
}

interface ActiveDownload {
  editionUrl: string
  controller: AbortController
  source: SongDownloadTaskSource
  completion: Promise<SongDownloadState>
}

const defaultDependencies: SongDownloadTaskDependencies = {
  download: downloadSongRuntime,
  readState: readSongDownloadState,
  remove: removeSongRuntime,
}

/** Owns transient download/remove mutations for one mounted App document. */
export class SongDownloadTaskManager {
  private readonly dependencies: SongDownloadTaskDependencies
  private readonly activeDownloads = new Map<string, ActiveDownload>()
  private readonly removalOperations = new Map<string, Promise<void>>()
  private readonly tasks = new Map<string, SongDownloadTaskSnapshot>()
  private readonly listeners = new Set<() => void>()
  private taskSnapshot: Readonly<Record<string, SongDownloadTaskSnapshot>> =
    Object.freeze({})

  constructor(
    dependencies: Partial<SongDownloadTaskDependencies> = {},
  ) {
    this.dependencies = { ...defaultDependencies, ...dependencies }
  }

  getTask(songId: string): SongDownloadTaskSnapshot | undefined {
    return this.tasks.get(songId)
  }

  getTasksSnapshot(): Readonly<Record<string, SongDownloadTaskSnapshot>> {
    return this.taskSnapshot
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  start(
    edition: CatalogEdition,
    runtimeClient: RuntimeClient,
    source: SongDownloadTaskSource,
  ): SongDownloadTaskStartResult {
    const active = this.activeDownloads.get(edition.songId)
    if (active) {
      if (active.editionUrl === edition.editionUrl) {
        return { outcome: 'joined', completion: active.completion }
      }
      return {
        outcome: 'conflict',
        task: this.tasks.get(edition.songId) as SongDownloadTaskSnapshot,
      }
    }

    const existing = this.tasks.get(edition.songId)
    if (existing?.kind === 'remove' && existing.status === 'running') {
      return { outcome: 'conflict', task: existing }
    }
    if (
      existing?.kind === 'download' &&
      existing.status === 'completed' &&
      existing.editionUrl === edition.editionUrl
    ) {
      return {
        outcome: 'already-completed',
        completion: Promise.resolve(existing.resultState),
      }
    }

    const controller = new AbortController()
    const initialTask: SongDownloadTaskSnapshot = {
      kind: 'download',
      songId: edition.songId,
      editionUrl: edition.editionUrl,
      source,
      status: 'running',
      phase: 'preparing',
      completedResources: 0,
    }
    const job: ActiveDownload = {
      editionUrl: edition.editionUrl,
      controller,
      source,
      completion: Promise.resolve(undefined as unknown as SongDownloadState),
    }
    const completion: Promise<SongDownloadState> = Promise.resolve().then(async () => {
      try {
        const result = await this.dependencies.download(
          edition,
          runtimeClient,
          {
            signal: controller.signal,
            onProgress: (progress) => this.updateProgress(edition.songId, job, progress),
          },
        )
        this.finishDownload(edition.songId, job, 'completed', result)
        return result
      } catch (error) {
        const result = await this.dependencies.readState(edition.songId).catch(
          (): SongDownloadState => ({
            songId: edition.songId,
            status: 'failed',
            errorMessage: '无法确认本机离线状态。',
          }),
        )
        const cancelled = controller.signal.aborted || isAbortError(error)
        this.finishDownload(
          edition.songId,
          job,
          cancelled ? 'cancelled' : 'failed',
          result,
          cancelled ? undefined : taskFailureMessage(result),
        )
        return result
      }
    })

    job.completion = completion
    this.activeDownloads.set(edition.songId, job)
    this.tasks.set(edition.songId, initialTask)
    this.emit()
    return { outcome: 'started', completion }
  }

  cancel(songId: string): boolean {
    const active = this.activeDownloads.get(songId)
    if (!active) {
      return false
    }
    active.controller.abort()
    return true
  }

  async remove(songId: string): Promise<void> {
    const existingRemoval = this.removalOperations.get(songId)
    if (existingRemoval) {
      return existingRemoval
    }

    const operation = this.removeAfterCurrentTask(songId)
    this.removalOperations.set(songId, operation)
    this.tasks.set(songId, { kind: 'remove', songId, status: 'running' })
    this.emit()
    return operation
  }

  private async removeAfterCurrentTask(songId: string): Promise<void> {
    const active = this.activeDownloads.get(songId)
    active?.controller.abort()
    if (active) {
      await active.completion
    }

    try {
      await this.dependencies.remove(songId)
      this.tasks.delete(songId)
    } finally {
      this.removalOperations.delete(songId)
      if (this.tasks.get(songId)?.kind === 'remove') {
        this.tasks.delete(songId)
      }
      this.emit()
    }
  }

  private updateProgress(
    songId: string,
    job: ActiveDownload,
    progress: SongDownloadProgress,
  ): void {
    if (this.activeDownloads.get(songId) !== job || this.removalOperations.has(songId)) {
      return
    }
    this.tasks.set(songId, {
      kind: 'download',
      songId,
      editionUrl: job.editionUrl,
      source: job.source,
      status: 'running',
      ...progress,
    })
    this.emit()
  }

  private finishDownload(
    songId: string,
    job: ActiveDownload,
    status: 'completed' | 'cancelled' | 'failed',
    resultState: SongDownloadState,
    message?: string,
  ): void {
    if (this.activeDownloads.get(songId) !== job) {
      return
    }
    this.activeDownloads.delete(songId)
    if (this.removalOperations.has(songId)) {
      return
    }

    const current = this.tasks.get(songId)
    const task: SongDownloadTaskSnapshot = {
      kind: 'download',
      songId,
      editionUrl: job.editionUrl,
      source: job.source,
      status,
      phase: current?.kind === 'download' ? current.phase : 'preparing',
      completedResources:
        current?.kind === 'download' ? current.completedResources : 0,
      ...(current?.kind === 'download' && current.totalResources !== undefined
        ? { totalResources: current.totalResources }
        : {}),
      resultState,
      ...(message ? { message } : {}),
    }
    this.tasks.set(songId, task)
    this.emit()
  }

  private emit(): void {
    this.taskSnapshot = Object.freeze(
      Object.fromEntries(this.tasks) as Record<
        string,
        SongDownloadTaskSnapshot
      >,
    )
    for (const listener of this.listeners) {
      listener()
    }
  }
}

function isAbortError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'AbortError',
  )
}

function taskFailureMessage(result: SongDownloadState): string {
  return result.status === 'installed'
    ? '更新失败，仍保留原离线版本。'
    : '下载失败，请检查网络后重试。'
}
