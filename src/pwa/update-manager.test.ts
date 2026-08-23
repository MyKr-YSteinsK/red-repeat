import { describe, expect, it, vi } from 'vitest'
import { buildInfo } from '../release/build-info'
import {
  createUpdateManager,
  type RegisterServiceWorker,
} from './update-manager'

describe('PWA update manager', () => {
  it('reports the current production build as up to date', async () => {
    const fetchImpl = probeFetch(buildInfo.version, buildInfo.commit)
    const manager = createUpdateManager({
      fetchImpl,
      locationHref: () => 'https://example.test/red-repeat/#settings',
      now: () => 100,
    })

    await expect(manager.checkForUpdate({ manual: true })).resolves.toMatchObject({
      status: 'up-to-date',
      remote: { version: buildInfo.version, commit: buildInfo.commit },
    })
  })

  it('does not block the version probe on a stalled Service Worker update', async () => {
    const stalledRegistration = {
      update: () => new Promise<ServiceWorkerRegistration>(() => undefined),
    } as ServiceWorkerRegistration
    const registerSW: RegisterServiceWorker = (options) => {
      options?.onRegisteredSW?.('/sw.js', stalledRegistration)
      return vi.fn(async () => undefined)
    }
    const manager = createUpdateManager({
      fetchImpl: probeFetch(buildInfo.version, buildInfo.commit),
      locationHref: () => 'https://example.test/red-repeat/#settings',
    })

    manager.register(registerSW)

    await expect(manager.checkForUpdate({ manual: true })).resolves.toMatchObject({
      status: 'up-to-date',
      remote: { version: buildInfo.version, commit: buildInfo.commit },
    })
  })

  it('reports a newer SemVer and a same-version new build', async () => {
    const newer = createUpdateManager({
      fetchImpl: probeFetch('1.3.0', 'abcdef123456'),
      locationHref: () => 'https://example.test/',
    })
    await newer.checkForUpdate({ manual: true })
    expect(newer.getSnapshot()).toMatchObject({
      status: 'update-available',
      remote: { version: '1.3.0' },
    })

    const rebuilt = createUpdateManager({
      fetchImpl: probeFetch(buildInfo.version, 'different123'),
      locationHref: () => 'https://example.test/',
    })
    await rebuilt.checkForUpdate({ manual: true })
    expect(rebuilt.getSnapshot()).toMatchObject({
      status: 'update-available',
      remote: { version: buildInfo.version, commit: 'different123' },
    })
  })

  it('keeps the app usable when the probe fails', async () => {
    const manager = createUpdateManager({
      fetchImpl: vi.fn(async () => { throw new Error('offline') }),
      locationHref: () => 'https://example.test/',
    })

    await manager.checkForUpdate({ manual: true })
    expect(manager.getSnapshot()).toMatchObject({ status: 'error' })
  })

  it('throttles automatic checks while allowing manual checks through', async () => {
    let now = 0
    const fetchImpl = probeFetch(buildInfo.version, buildInfo.commit)
    const manager = createUpdateManager({
      fetchImpl,
      now: () => now,
      checkIntervalMs: 300000,
      locationHref: () => 'https://example.test/',
    })

    await manager.checkForUpdate()
    await manager.checkForUpdate()
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    now = 300001
    await manager.checkForUpdate()
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    now = 300002
    await manager.checkForUpdate({ manual: true })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('exposes a waiting worker and reloads only once after activation', async () => {
    const fetchImpl = probeFetch(buildInfo.version, buildInfo.commit)
    const reload = vi.fn()
    let callbacks: Parameters<RegisterServiceWorker>[0] | undefined
    const updateServiceWorker = vi.fn(async () => undefined)
    const registerSW: RegisterServiceWorker = (options) => {
      callbacks = options
      return updateServiceWorker
    }
    const manager = createUpdateManager({
      fetchImpl,
      reload,
      locationHref: () => 'https://example.test/',
    })

    manager.register(registerSW)
    callbacks?.onNeedRefresh?.()
    expect(manager.getSnapshot().status).toBe('update-available')
    const updatePromise = manager.applyUpdate()
    await Promise.resolve()
    expect(updateServiceWorker).toHaveBeenCalledWith(false)

    callbacks?.onNeedReload?.()
    callbacks?.onNeedReload?.()
    await updatePromise
    expect(reload).toHaveBeenCalledOnce()
  })

  it('dismisses only the current-session prompt and resets dismissal on manual check', async () => {
    const manager = createUpdateManager({
      fetchImpl: probeFetch('1.3.0', 'abcdef123456'),
      locationHref: () => 'https://example.test/',
    })
    await manager.checkForUpdate({ manual: true })
    manager.dismissUpdate()
    expect(manager.getSnapshot().dismissed).toBe(true)
    await manager.checkForUpdate({ manual: true })
    expect(manager.getSnapshot().dismissed).toBe(false)
  })
})

function probeFetch(version: string, commit: string) {
  return vi.fn(async () => new Response(JSON.stringify({ version, commit }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }))
}
