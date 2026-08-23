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

  it('waits for an installing worker after the remote probe before activating once', async () => {
    const reload = vi.fn()
    const worker = new FakeServiceWorker()
    const serviceWorker = worker as unknown as ServiceWorker
    let installingWorker: ServiceWorker | undefined
    let waitingWorker: ServiceWorker | undefined = undefined
    const updateRegistration = vi.fn(async () => undefined as unknown as ServiceWorkerRegistration)
    const registration = createFakeRegistration(
      () => installingWorker,
      () => waitingWorker,
      () => {
        installingWorker = serviceWorker
        return updateRegistration()
      },
    )
    let callbacks: Parameters<RegisterServiceWorker>[0] | undefined
    const updateServiceWorker = vi.fn(async () => undefined)
    const registerSW: RegisterServiceWorker = (options) => {
      callbacks = options
      options?.onRegisteredSW?.('/sw.js', registration)
      return updateServiceWorker
    }
    const manager = createUpdateManager({
      fetchImpl: probeFetch('1.2.4', 'abcdef123456'),
      reload,
      locationHref: () => 'https://example.test/',
    })

    manager.register(registerSW)
    await manager.checkForUpdate({ manual: true })
    updateRegistration.mockClear()
    expect(manager.getSnapshot().status).toBe('update-available')

    const updatePromise = manager.applyUpdate()
    await Promise.resolve()
    expect(updateRegistration).toHaveBeenCalledOnce()
    expect(updateServiceWorker).not.toHaveBeenCalled()
    expect(manager.getSnapshot().status).toBe('updating')

    worker.state = 'installed'
    worker.dispatchEvent(new Event('statechange'))
    expect(updateServiceWorker).not.toHaveBeenCalled()

    callbacks?.onNeedRefresh?.()
    await Promise.resolve()
    expect(updateServiceWorker).not.toHaveBeenCalled()
    waitingWorker = serviceWorker
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(manager.getSnapshot().status).toBe('updating')
    expect(updateServiceWorker).toHaveBeenCalledWith(false)
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })

    callbacks?.onNeedReload?.()
    callbacks?.onNeedReload?.()
    await updatePromise
    expect(reload).toHaveBeenCalledOnce()
  })

  it('reloads after the waiting worker activates even without a controlling callback', async () => {
    const reload = vi.fn()
    const worker = new FakeServiceWorker()
    const serviceWorker = worker as unknown as ServiceWorker
    const registration = createFakeRegistration(
      () => undefined,
      () => serviceWorker,
      async () => undefined as unknown as ServiceWorkerRegistration,
    )
    let callbacks: Parameters<RegisterServiceWorker>[0] | undefined
    const updateServiceWorker = vi.fn(async () => undefined)
    const registerSW: RegisterServiceWorker = (options) => {
      callbacks = options
      options?.onRegisteredSW?.('/sw.js', registration)
      return updateServiceWorker
    }
    const manager = createUpdateManager({
      fetchImpl: probeFetch(buildInfo.version, buildInfo.commit),
      reload,
      locationHref: () => 'https://example.test/',
    })

    manager.register(registerSW)
    callbacks?.onNeedRefresh?.()
    const updatePromise = manager.applyUpdate()
    await Promise.resolve()
    expect(updateServiceWorker).toHaveBeenCalledWith(false)

    worker.state = 'activated'
    worker.dispatchEvent(new Event('statechange'))
    await updatePromise
    expect(reload).toHaveBeenCalledOnce()
  })

  it('enters recoverable error after a timeout and retries a later worker update', async () => {
    vi.useFakeTimers()
    try {
      const reload = vi.fn()
      const worker = new FakeServiceWorker()
      const serviceWorker = worker as unknown as ServiceWorker
      let waitingWorker: ServiceWorker | undefined = undefined
      let updateAttempt = 0
      let callbacks: Parameters<RegisterServiceWorker>[0] | undefined
      const updateRegistration = vi.fn(async () => undefined as unknown as ServiceWorkerRegistration)
      const registration = createFakeRegistration(
        () => undefined,
        () => waitingWorker,
        () => {
          updateAttempt += 1
          if (updateAttempt === 2) {
            waitingWorker = serviceWorker
            callbacks?.onNeedRefresh?.()
          }
          return updateRegistration()
        },
      )
      const updateServiceWorker = vi.fn(async () => undefined)
      const registerSW: RegisterServiceWorker = (options) => {
        callbacks = options
        options?.onRegisteredSW?.('/sw.js', registration)
        return updateServiceWorker
      }
      const manager = createUpdateManager({
        fetchImpl: probeFetch('1.2.4', 'abcdef123456'),
        reload,
        locationHref: () => 'https://example.test/',
      })

      manager.register(registerSW)
      await manager.checkForUpdate({ manual: true })
      updateAttempt = 0

      const firstUpdate = manager.applyUpdate()
      await vi.advanceTimersByTimeAsync(15000)
      await firstUpdate
      expect(manager.getSnapshot().status).toBe('error')

      const retryUpdate = manager.applyUpdate()
      await Promise.resolve()
      expect(updateServiceWorker).toHaveBeenCalledWith(false)
      callbacks?.onNeedReload?.()
      await retryUpdate
      expect(manager.getSnapshot().status).toBe('updating')
      expect(reload).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
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

  it('keeps an automatic check quiet after dismissing one remote identity', async () => {
    let now = 0
    const fetchImpl = probeFetch('1.2.4', 'abcdef123456')
    const manager = createUpdateManager({
      fetchImpl,
      now: () => now,
      checkIntervalMs: 300000,
      locationHref: () => 'https://example.test/',
    })

    await manager.checkForUpdate({ manual: true })
    manager.dismissUpdate()
    now = 300001
    await manager.checkForUpdate()
    expect(manager.getSnapshot().dismissed).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    now = 600002
    fetchImpl.mockImplementationOnce(async () => new Response(JSON.stringify({
      version: '1.2.5',
      commit: 'fedcba654321',
    }), { status: 200 }))
    await manager.checkForUpdate()
    expect(manager.getSnapshot()).toMatchObject({
      status: 'update-available',
      remote: { version: '1.2.5' },
      dismissed: false,
    })
  })

})

class FakeServiceWorker extends EventTarget {
  state: ServiceWorkerState = 'installing'
  postMessage = vi.fn()
}

function createFakeRegistration(
  getInstalling: () => ServiceWorker | undefined,
  getWaiting: () => ServiceWorker | undefined,
  update: () => Promise<ServiceWorkerRegistration>,
): ServiceWorkerRegistration {
  return {
    get installing() {
      return getInstalling() ?? null
    },
    get waiting() {
      return getWaiting() ?? null
    },
    update,
  } as unknown as ServiceWorkerRegistration
}

function probeFetch(version: string, commit: string) {
  return vi.fn(async () => new Response(JSON.stringify({ version, commit }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }))
}
