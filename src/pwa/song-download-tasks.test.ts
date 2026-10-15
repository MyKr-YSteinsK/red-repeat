import { describe, expect, it, vi } from 'vitest'
import type { CatalogEdition } from '../library/runtime-schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { SongDownloadState } from './song-download'
import { SongDownloadTaskManager } from './song-download-tasks'

const editionH1: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  coverUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
  editionUrl: `/library-runtime/songs/first-light/edition.${'a'.repeat(64)}.json`,
}

const editionH2: CatalogEdition = {
  ...editionH1,
  title: 'First Light H2',
  editionUrl: `/library-runtime/songs/first-light/edition.${'b'.repeat(64)}.json`,
}

const runtimeClient = {} as RuntimeClient

describe('SongDownloadTaskManager', () => {
  it('coalesces the same target and refuses a competing Edition for one song', async () => {
    let rejectDownload: ((reason: unknown) => void) | undefined
    const download = vi.fn(
      (_edition, _client, options) =>
        new Promise<SongDownloadState>((_resolve, reject) => {
          rejectDownload = reject
          options?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('cancelled'), { name: 'AbortError' }))
          })
          options?.onProgress?.({
            phase: 'downloading',
            completedResources: 2,
            totalResources: 9,
          })
        }),
    )
    const readState = vi.fn(async (): Promise<SongDownloadState> => ({
      songId: 'first-light',
      status: 'installed',
      editionUrl: editionH1.editionUrl,
      snapshotEdition: editionH1,
    }))
    const manager = new SongDownloadTaskManager({ download, readState })

    const first = manager.start(editionH2, runtimeClient, 'manual')
    const joined = manager.start(editionH2, runtimeClient, 'catalog-refresh')
    const conflict = manager.start(editionH1, runtimeClient, 'manual')

    expect(first.outcome).toBe('started')
    expect(joined.outcome).toBe('joined')
    expect(conflict.outcome).toBe('conflict')
    await vi.waitFor(() => expect(download).toHaveBeenCalledOnce())
    expect(manager.getTask('first-light')).toMatchObject({
      kind: 'download',
      status: 'running',
      editionUrl: editionH2.editionUrl,
      completedResources: 2,
      totalResources: 9,
    })
    expect(rejectDownload).toBeDefined()

    manager.cancel('first-light')
    if (!('completion' in first)) {
      throw new Error('Expected the first download to start.')
    }
    await first.completion
    expect(manager.getTask('first-light')).toMatchObject({
      status: 'cancelled',
      resultState: { status: 'installed', editionUrl: editionH1.editionUrl },
    })
    expect(readState).toHaveBeenCalledOnce()
  })

  it('waits for an active download to settle before removing its snapshot', async () => {
    const order: string[] = []
    const download = vi.fn(
      (_edition, _client, options) =>
        new Promise<SongDownloadState>((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            order.push('download-aborted')
            reject(Object.assign(new Error('cancelled'), { name: 'AbortError' }))
          })
        }),
    )
    const manager = new SongDownloadTaskManager({
      download,
      readState: vi.fn(async (): Promise<SongDownloadState> => ({
        songId: 'first-light',
        status: 'installed',
      })),
      remove: vi.fn(async () => {
        order.push('snapshot-removed')
      }),
    })

    const start = manager.start(editionH2, runtimeClient, 'manual')
    await vi.waitFor(() => expect(download).toHaveBeenCalledOnce())
    const removal = manager.remove('first-light')
    expect(manager.getTask('first-light')).toEqual({
      kind: 'remove',
      songId: 'first-light',
      status: 'running',
    })
    expect(manager.start(editionH1, runtimeClient, 'manual').outcome).toBe(
      'conflict',
    )

    await removal
    if (!('completion' in start)) {
      throw new Error('Expected the download to start.')
    }
    await start.completion
    expect(order).toEqual(['download-aborted', 'snapshot-removed'])
    expect(manager.getTask('first-light')).toBeUndefined()
  })

  it('keeps a successful result when cancellation arrives after the manifest commit starts', async () => {
    const installed: SongDownloadState = {
      songId: 'first-light',
      status: 'installed',
      editionUrl: editionH2.editionUrl,
      snapshotEdition: editionH2,
    }
    let resolveCommitted: ((state: SongDownloadState) => void) | undefined
    const manager = new SongDownloadTaskManager({
      download: vi.fn(
        (_edition, _client, options) =>
          new Promise<SongDownloadState>((resolve) => {
            options?.onProgress?.({
              phase: 'committing',
              completedResources: 9,
              totalResources: 9,
            })
            resolveCommitted = resolve
          }),
      ),
    })

    const started = manager.start(editionH2, runtimeClient, 'manual')
    if (!('completion' in started)) {
      throw new Error('Expected the download to start.')
    }
    await vi.waitFor(() =>
      expect(manager.getTask('first-light')).toMatchObject({
        status: 'running',
        phase: 'committing',
      }),
    )
    expect(manager.cancel('first-light')).toBe(true)
    resolveCommitted?.(installed)
    await started.completion

    expect(manager.getTask('first-light')).toMatchObject({
      status: 'completed',
      resultState: installed,
    })
  })
})
