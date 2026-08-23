import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import { buildInfo } from '../release/build-info'
import { compareSemVer } from '../release/semver'
import { createServiceWorkerRegistrationOptions } from './register-service-worker-options'
import { fetchVersionProbe, type RemoteBuildInfo } from './version-probe'

export type UpdateStatus =
  | 'checking'
  | 'up-to-date'
  | 'update-available'
  | 'updating'
  | 'error'

export interface UpdateSnapshot {
  status: UpdateStatus
  remote?: RemoteBuildInfo
  error?: string
  dismissed: boolean
  checkedAt?: number
}

export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>
export type RegisterServiceWorker = (
  options?: RegisterSWOptions,
) => UpdateServiceWorker

export interface UpdateManager {
  getSnapshot(): UpdateSnapshot
  subscribe(listener: () => void): () => void
  register(registerSW: RegisterServiceWorker): void
  checkForUpdate(options?: { manual?: boolean }): Promise<UpdateSnapshot>
  applyUpdate(): Promise<void>
  dismissUpdate(): void
}

export interface UpdateManagerOptions {
  fetchImpl?: typeof fetch
  now?: () => number
  checkIntervalMs?: number
  locationHref?: () => string
  reload?: () => void
  onVisibilityChange?: (listener: () => void) => () => void
}

const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000

export function createUpdateManager(
  options: UpdateManagerOptions = {},
): UpdateManager {
  return new UpdateManagerImpl(options)
}

export function describeUpdateStatus(snapshot: UpdateSnapshot): string {
  if (snapshot.status === 'checking') {
    return '正在检查…'
  }
  if (snapshot.status === 'updating') {
    return '正在更新…'
  }
  if (snapshot.status === 'error') {
    return '检查失败，请稍后重试'
  }
  if (snapshot.status === 'update-available') {
    if (snapshot.remote?.version === buildInfo.version) {
      return `发现新的构建 ${snapshot.remote.version}`
    }
    return snapshot.remote?.version
      ? `发现新版本 ${snapshot.remote.version}`
      : '发现新版本'
  }
  return snapshot.checkedAt ? '已是最新版本' : '尚未检查'
}

class UpdateManagerImpl implements UpdateManager {
  private snapshot: UpdateSnapshot = {
    status: 'up-to-date',
    dismissed: false,
  }

  private readonly listeners = new Set<() => void>()
  private readonly fetchImpl: typeof fetch
  private readonly now: () => number
  private readonly checkIntervalMs: number
  private readonly locationHref: () => string
  private readonly reload: () => void
  private readonly onVisibilityChange: (listener: () => void) => () => void
  private registration: ServiceWorkerRegistration | undefined
  private updateServiceWorker: UpdateServiceWorker | undefined
  private registered = false
  private waitingWorker = false
  private lastAutomaticCheckAt = Number.NEGATIVE_INFINITY
  private checkPromise: Promise<UpdateSnapshot> | undefined
  private updatePromise: Promise<void> | undefined
  private resolveUpdate: (() => void) | undefined
  private reloadTriggered = false

  constructor(options: UpdateManagerOptions) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
    this.now = options.now ?? (() => Date.now())
    this.checkIntervalMs = options.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS
    this.locationHref = options.locationHref ?? (() => getDefaultLocationHref())
    this.reload = options.reload ?? (() => window.location.reload())
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
      this.updateServiceWorker = registerSW(
        createServiceWorkerRegistrationOptions({
          onNeedRefresh: () => this.handleWaitingWorker(),
          onNeedReload: () => this.handleControllerChange(),
          onRegisteredSW: (_scriptUrl, registration) => {
            this.registration = registration
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

    if (manual) {
      this.publish({ dismissed: false, error: undefined })
    } else {
      this.lastAutomaticCheckAt = currentTime
    }
    this.publish({ status: 'checking', error: undefined })

    const promise = this.performCheck().finally(() => {
      this.checkPromise = undefined
    })
    this.checkPromise = promise
    return promise
  }

  applyUpdate(): Promise<void> {
    if (this.updatePromise) {
      return this.updatePromise
    }
    if (!this.updateServiceWorker) {
      this.handleError(new Error('Service Worker update is unavailable'))
      return Promise.resolve()
    }

    this.reloadTriggered = false
    this.publish({ status: 'updating', dismissed: false, error: undefined })
    this.updatePromise = new Promise<void>((resolve) => {
      this.resolveUpdate = resolve
    })
    void this.requestUpdateActivation()
    return this.updatePromise
  }

  dismissUpdate(): void {
    if (this.snapshot.status === 'update-available') {
      this.publish({ dismissed: true })
    }
  }

  private async performCheck(): Promise<UpdateSnapshot> {
    const probePromise = fetchVersionProbe({
      fetchImpl: this.fetchImpl,
      locationHref: this.locationHref(),
      cacheBust: this.now(),
    })
    const registrationUpdatePromise = this.registration?.update?.()
    const [probeResult] = await Promise.allSettled([
      probePromise,
      registrationUpdatePromise ?? Promise.resolve(),
    ])

    if (probeResult.status === 'rejected') {
      if (this.waitingWorker) {
        this.publish({ status: 'update-available', checkedAt: this.now() })
      } else {
        this.publish({
          status: 'error',
          error: describeError(probeResult.reason),
          checkedAt: this.now(),
        })
      }
      return this.snapshot
    }

    const remote = probeResult.value
    this.publish({
      status: this.waitingWorker || isRemoteUpdate(remote)
        ? 'update-available'
        : 'up-to-date',
      remote,
      checkedAt: this.now(),
      dismissed: this.waitingWorker ? this.snapshot.dismissed : false,
      error: undefined,
    })
    return this.snapshot
  }

  private async requestUpdateActivation(): Promise<void> {
    try {
      await this.registration?.update?.()
      await this.updateServiceWorker?.(false)
    } catch (error) {
      this.finishUpdateWithError(error)
    }
  }

  private handleWaitingWorker(): void {
    this.waitingWorker = true
    this.publish({ status: 'update-available', dismissed: false, error: undefined })
  }

  private handleControllerChange(): void {
    if (this.snapshot.status !== 'updating') {
      return
    }
    if (this.reloadTriggered) {
      return
    }

    this.reloadTriggered = true
    try {
      this.reload()
    } finally {
      this.resolveUpdate?.()
      this.resolveUpdate = undefined
      this.updatePromise = undefined
    }
  }

  private finishUpdateWithError(error: unknown): void {
    if (this.snapshot.status !== 'updating') {
      return
    }
    this.publish({
      status: 'error',
      error: describeError(error),
      checkedAt: this.now(),
    })
    this.resolveUpdate?.()
    this.resolveUpdate = undefined
    this.updatePromise = undefined
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

export const updateManager = createUpdateManager()

export function getUpdateManager(): UpdateManager {
  return updateManager
}
