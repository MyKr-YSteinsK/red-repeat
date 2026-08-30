import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import { buildInfo } from '../release/build-info'
import { compareSemVer } from '../release/semver'
import { createServiceWorkerRegistrationOptions } from './register-service-worker-options'
import { fetchVersionProbe, type RemoteBuildInfo } from './version-probe'

export type UpdateStatus =
  | 'checking'
  | 'installing'
  | 'ready-next-launch'
  | 'up-to-date'
  | 'error'

export interface UpdateSnapshot {
  status: UpdateStatus
  remote?: RemoteBuildInfo
  error?: string
  checkedAt?: number
}

export type RegisterServiceWorker = (
  options?: RegisterSWOptions,
) => unknown

export interface UpdateManager {
  getSnapshot(): UpdateSnapshot
  subscribe(listener: () => void): () => void
  register(registerSW: RegisterServiceWorker): void
  checkForUpdate(options?: { manual?: boolean }): Promise<UpdateSnapshot>
}

export interface UpdateManagerOptions {
  fetchImpl?: typeof fetch
  now?: () => number
  checkIntervalMs?: number
  locationHref?: () => string
  onVisibilityChange?: (listener: () => void) => () => void
}

const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000
const SERVICE_WORKER_UPDATE_TIMEOUT_MS = 15 * 1000

export function createUpdateManager(
  options: UpdateManagerOptions = {},
): UpdateManager {
  return new UpdateManagerImpl(options)
}

export function describeUpdateStatus(snapshot: UpdateSnapshot): string {
  if (snapshot.status === 'checking') {
    return '正在后台检查…'
  }
  if (snapshot.status === 'installing') {
    return snapshot.remote?.version
      ? `发现新版本 ${snapshot.remote.version}，正在后台准备…`
      : '发现新版本，正在后台准备…'
  }
  if (snapshot.status === 'ready-next-launch') {
    return snapshot.remote?.version
      ? `新版本 ${snapshot.remote.version} 已准备，下次重新打开后生效`
      : '新版本已准备，下次重新打开后生效'
  }
  if (snapshot.status === 'error') {
    return '检查失败（当前 App 不受影响）'
  }
  return snapshot.checkedAt !== undefined ? '当前已是最新版本' : '尚未检查'
}

class UpdateManagerImpl implements UpdateManager {
  private snapshot: UpdateSnapshot = {
    status: 'up-to-date',
  }

  private readonly listeners = new Set<() => void>()
  private readonly fetchImpl: typeof fetch
  private readonly now: () => number
  private readonly checkIntervalMs: number
  private readonly locationHref: () => string
  private readonly onVisibilityChange: (listener: () => void) => () => void
  private registration: ServiceWorkerRegistration | undefined
  private registered = false
  private waitingWorker = false
  private installingWorker: ServiceWorker | undefined
  private installingWorkerStateChange: (() => void) | undefined
  private lastAutomaticCheckAt = Number.NEGATIVE_INFINITY
  private checkPromise: Promise<UpdateSnapshot> | undefined
  private probeSequence = 0
  private updateRequestSequence = 0

  constructor(options: UpdateManagerOptions) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
    this.now = options.now ?? (() => Date.now())
    this.checkIntervalMs = options.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS
    this.locationHref = options.locationHref ?? (() => getDefaultLocationHref())
    this.onVisibilityChange = options.onVisibilityChange ?? defaultVisibilitySubscription
  }

  getSnapshot = (): UpdateSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  register(registerSW: RegisterServiceWorker): void {
    if (this.registered) {
      return
    }

    this.registered = true
    this.onVisibilityChange(() => {
      void this.checkForUpdate()
    })

    try {
      registerSW(
        createServiceWorkerRegistrationOptions({
          onNeedRefresh: () => this.handleWaitingWorker(),
          // A controller change is diagnostic only. The manager never reloads or
          // asks a waiting worker to take over the active document.
          onNeedReload: () => this.handleControllerChange(),
          onRegisteredSW: (_scriptUrl, registration) => {
            this.registration = registration
            this.syncRegistrationState()
            void this.checkForUpdate()
          },
          onRegisterError: (error) => this.handleError(error),
        }),
      )
      void this.checkForUpdate()
    } catch (error) {
      this.handleError(error)
    }
  }

  checkForUpdate({ manual = false }: { manual?: boolean } = {}): Promise<UpdateSnapshot> {
    const currentTime = this.now()
    if (
      !manual &&
      currentTime - this.lastAutomaticCheckAt < this.checkIntervalMs
    ) {
      return Promise.resolve(this.snapshot)
    }
    if (this.checkPromise) {
      return this.checkPromise
    }

    if (!manual) {
      this.lastAutomaticCheckAt = currentTime
    }
    if (!this.waitingWorker && !this.installingWorker) {
      this.publish({ status: 'checking', error: undefined })
    }

    const promise = this.performCheck().finally(() => {
      this.checkPromise = undefined
    })
    this.checkPromise = promise
    return promise
  }

  private async performCheck(): Promise<UpdateSnapshot> {
    this.requestBackgroundUpdate()
    const probePromise = fetchVersionProbe({
      fetchImpl: this.fetchImpl,
      locationHref: this.locationHref(),
      cacheBust: `${this.now()}-${++this.probeSequence}`,
    })
    const [probeResult] = await Promise.allSettled([probePromise])

    if (probeResult.status === 'rejected') {
      this.publish({
        status: 'error',
        error: describeError(probeResult.reason),
        checkedAt: this.now(),
      })
      return this.snapshot
    }

    if (this.snapshot.status === 'error') {
      return this.snapshot
    }

    const remote = probeResult.value
    const hasUpdate = this.waitingWorker || isRemoteUpdate(remote)
    this.publish({
      status: this.waitingWorker
        ? 'ready-next-launch'
        : hasUpdate
          ? 'installing'
          : 'up-to-date',
      remote,
      checkedAt: this.now(),
      error: undefined,
    })
    return this.snapshot
  }

  private requestBackgroundUpdate(): void {
    const registration = this.registration
    if (!registration || registration.waiting) {
      return
    }

    const requestSequence = ++this.updateRequestSequence
    const updatePromise = Promise.resolve().then(() => registration.update())
    void withTimeout(updatePromise, SERVICE_WORKER_UPDATE_TIMEOUT_MS).catch((error) => {
      if (requestSequence !== this.updateRequestSequence || this.waitingWorker) {
        return
      }
      this.handleError(error)
    })
  }

  private handleWaitingWorker(): void {
    this.waitingWorker = true
    this.publish({
      status: 'ready-next-launch',
      error: undefined,
    })
  }

  private syncRegistrationState(): void {
    const registration = this.registration
    if (!registration) {
      return
    }

    if (registration.waiting) {
      this.handleWaitingWorker()
    }
    if (registration.installing) {
      this.observeInstallingWorker(registration.installing)
    }
  }

  private observeInstallingWorker(worker: ServiceWorker): void {
    if (worker === this.installingWorker) {
      return
    }

    this.stopObservingInstallingWorker()
    this.installingWorker = worker
    if (!this.waitingWorker) {
      this.publish({ status: 'installing', error: undefined })
    }
    const onStateChange = (): void => {
      if (
        worker.state === 'installed' && this.registration?.waiting === worker
      ) {
        this.handleWaitingWorker()
      }
    }
    this.installingWorkerStateChange = onStateChange
    worker.addEventListener('statechange', onStateChange)
    onStateChange()
  }

  private stopObservingInstallingWorker(): void {
    if (this.installingWorker && this.installingWorkerStateChange) {
      this.installingWorker.removeEventListener(
        'statechange',
        this.installingWorkerStateChange,
      )
    }
    this.installingWorker = undefined
    this.installingWorkerStateChange = undefined
  }

  private handleControllerChange(): void {
    // The current document stays pinned to its startup build. A normal waiting
    // worker activates after all old clients finish; a controllerchange event
    // must therefore never become an updater-driven navigation or reload.
  }

  private handleError(error: unknown): void {
    this.publish({
      status: 'error',
      error: describeError(error),
      checkedAt: this.now(),
    })
  }

  private publish(patch: Partial<UpdateSnapshot>): void {
    this.snapshot = Object.freeze({ ...this.snapshot, ...patch })
    this.listeners.forEach((listener) => listener())
  }
}

function isRemoteUpdate(remote: RemoteBuildInfo): boolean {
  const versionComparison = compareSemVer(remote.version, buildInfo.version)
  return versionComparison > 0 || (
    versionComparison === 0 && remote.commit !== buildInfo.commit
  )
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : '未知更新错误'
}

function getDefaultLocationHref(): string {
  if (typeof window !== 'undefined') {
    return window.location.href
  }
  return 'http://localhost/'
}

function defaultVisibilitySubscription(listener: () => void): () => void {
  if (typeof document === 'undefined') {
    return () => undefined
  }

  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      listener()
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error('等待 Service Worker 后台检查超时'))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

export const updateManager = createUpdateManager()

export function getUpdateManager(): UpdateManager {
  return updateManager
}
