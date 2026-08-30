import { describe, expect, it, vi } from 'vitest'
import { buildInfo } from '../release/build-info'
import {
  createUpdateManager,
  describeUpdateStatus,
  type RegisterServiceWorker,
} from './update-manager'

const newerVersion = nextPatchVersion(buildInfo.version)

describe('PWA update manager', () => {
  it('reports the current production build as up to date', async () => {
    const manager = createUpdateManager({
      fetchImpl: probeFetch(buildInfo.version, buildInfo.commit),
      locationHref: () => 'https://example.test/red-repeat/#settings',
      now: () => 100,
    })

    await expect(manager.checkForUpdate({ manual: true })).resolves.toMatchObject({
      status: 'up-to-date',
      remote: { version: buildInfo.version, commit: buildInfo.commit },
    })
    expect(describeUpdateStatus(manager.getSnapshot())).toBe('当前已是最新版本')
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

  it('reports a newer SemVer and a same-version new build as background installing', async () => {
    const newer = createUpdateManager({
      fetchImpl: probeFetch(newerVersion, 'abcdef123456'),
      locationHref: () => 'https://example.test/',
    })
    await newer.checkForUpdate({ manual: true })
    expect(newer.getSnapshot()).toMatchObject({
      status: 'installing',
      remote: { version: newerVersion },
    })
    expect(describeUpdateStatus(newer.getSnapshot())).toContain('正在后台准备')

    const rebuilt = createUpdateManager({
      fetchImpl: probeFetch(buildInfo.version, 'different123'),
      locationHref: () => 'https://example.test/',
    })
    await rebuilt.checkForUpdate({ manual: true })
    expect(rebuilt.getSnapshot()).toMatchObject({
      status: 'installing',
      remote: { version: buildInfo.version, commit: 'different123' },
    })
  })

  it('exposes a waiting worker as ready for the next launch without skipWaiting or reload', () => {
    let callbacks: Parameters<RegisterServiceWorker>[0] | undefined
    const updateServiceWorker = vi.fn(async () => undefined)
    const manager = createUpdateManager({
      fetchImpl: probeFetch(buildInfo.version, buildInfo.commit),
      locationHref: () => 'https://example.test/',
    })

    manager.register((options) => {
      callbacks = options
      return updateServiceWorker
    })
    callbacks?.onNeedRefresh?.()
    callbacks?.onNeedReload?.()

    expect(manager.getSnapshot()).toMatchObject({ status: 'ready-next-launch' })
    expect(describeUpdateStatus(manager.getSnapshot())).toBe(
      '新版本已准备，下次重新打开后生效',
    )
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  it('tracks an installing worker until the browser exposes it as waiting', () => {
    const worker = new FakeServiceWorker()
    const serviceWorker = worker as unknown as ServiceWorker
    const waitingState: { worker?: ServiceWorker } = {}
    const registration = createFakeRegistration(
      () => serviceWorker,
      () => waitingState.worker,
      async () => undefined as unknown as ServiceWorkerRegistration,
    )
    let callbacks: Parameters<RegisterServiceWorker>[0] | undefined
    const manager = createUpdateManager({
      fetchImpl: probeFetch(buildInfo.version, buildInfo.commit),
      locationHref: () => 'https://example.test/',
    })

    manager.register((options) => {
      callbacks = options
      options?.onRegisteredSW?.('/sw.js', registration)
      return vi.fn(async () => undefined)
    })

    expect(manager.getSnapshot().status).toBe('installing')
    worker.state = 'installed'
    waitingState.worker = serviceWorker
    worker.dispatchEvent(new Event('statechange'))
    callbacks?.onNeedRefresh?.()

    expect(manager.getSnapshot().status).toBe('ready-next-launch')
  })

  it('manual checks only probe and schedule background registration.update', async () => {
    const update = vi.fn(async () => undefined as unknown as ServiceWorkerRegistration)
    const registration = createFakeRegistration(
      () => undefined,
      () => undefined,
      update,
    )
    const manager = createUpdateManager({
      fetchImpl: probeFetch(newerVersion, 'abcdef123456'),
      locationHref: () => 'https://example.test/',
    })

    manager.register((options) => {
      options?.onRegisteredSW?.('/sw.js', registration)
      return vi.fn(async () => undefined)
    })
    await manager.checkForUpdate({ manual: true })
    await Promise.resolve()

    expect(update).toHaveBeenCalled()
    expect(manager.getSnapshot().status).toBe('installing')
  })

  it('keeps registration update failures in the non-blocking Settings state', async () => {
    const manager = createUpdateManager({
      fetchImpl: probeFetch(buildInfo.version, buildInfo.commit),
      locationHref: () => 'https://example.test/',
    })
    const registration = createFakeRegistration(
      () => undefined,
      () => undefined,
      async () => { throw new Error('registration update failed') },
    )

    manager.register((options) => {
      options?.onRegisteredSW?.('/sw.js', registration)
      return vi.fn(async () => undefined)
    })
    await manager.checkForUpdate({ manual: true })
    await Promise.resolve()
    await Promise.resolve()

    expect(manager.getSnapshot()).toMatchObject({
      status: 'error',
      error: 'registration update failed',
    })
  })

  it('keeps the app usable when the remote probe fails', async () => {
    const manager = createUpdateManager({
      fetchImpl: vi.fn(async () => { throw new Error('offline') }),
      locationHref: () => 'https://example.test/',
    })

    await manager.checkForUpdate({ manual: true })
    expect(manager.getSnapshot()).toMatchObject({ status: 'error' })
    expect(describeUpdateStatus(manager.getSnapshot())).toBe(
      '检查失败（当前 App 不受影响）',
    )
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
    const probeChecks = fetchImpl.mock.calls.map(([input]) =>
      new URL(String(input)).searchParams.get('check'),
    )
    expect(new Set(probeChecks).size).toBe(3)
  })

  it('publishes ready-next-launch when a waiting worker already exists at registration', () => {
    const worker = new FakeServiceWorker()
    const serviceWorker = worker as unknown as ServiceWorker
    const registration = createFakeRegistration(
      () => undefined,
      () => serviceWorker,
      async () => undefined as unknown as ServiceWorkerRegistration,
    )
    const manager = createUpdateManager({ locationHref: () => 'https://example.test/' })

    manager.register((options) => {
      options?.onRegisteredSW?.('/sw.js', registration)
      return vi.fn(async () => undefined)
    })

    expect(manager.getSnapshot().status).toBe('ready-next-launch')
  })
})

function nextPatchVersion(version: string): string {
  const [major, minor, patch] = version.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}

class FakeServiceWorker extends EventTarget {
  state: ServiceWorkerState = 'installing'
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
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void input
    void init
    return new Response(JSON.stringify({
      version,
      commit,
      builtAt: '2026-08-24T00:00:00.000Z',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
}
