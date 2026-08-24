import { parseSemVer } from '../release/semver'

export interface RemoteBuildInfo {
  version: string
  commit: string
  builtAt: string
  release?: RemoteReleaseNote
}

export interface RemoteReleaseNote {
  version: string
  date: string
  level: 'patch' | 'minor' | 'major'
  title: string
  summary: string
  changes: readonly string[]
}

export const VERSION_PROBE_PATH = 'version.json'

export interface VersionProbeOptions {
  fetchImpl?: typeof fetch
  locationHref?: string
  baseUrl?: string
  cacheBust?: number | string
  signal?: AbortSignal
}

export function createVersionProbeUrl(
  locationHref: string,
  cacheBust: number | string,
  baseUrl = import.meta.env.BASE_URL,
): string {
  const origin = new URL(locationHref).origin
  const url = new URL(
    `${normalizeBaseUrl(baseUrl)}${VERSION_PROBE_PATH}`,
    origin,
  )
  url.searchParams.set('check', String(cacheBust))
  return url.toString()
}

export async function fetchVersionProbe(
  options: VersionProbeOptions = {},
): Promise<RemoteBuildInfo> {
  const fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
  const locationHref = options.locationHref ?? getDefaultLocationHref()
  const url = createVersionProbeUrl(
    locationHref,
    options.cacheBust ?? Date.now(),
    options.baseUrl,
  )
  const response = await fetchImpl(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'cache-control': 'no-cache' },
    signal: options.signal,
  })

  if (!response.ok) {
    throw new VersionProbeError(`version probe returned HTTP ${response.status}`)
  }

  const payload: unknown = await response.json()
  if (!isRemoteBuildInfo(payload)) {
    throw new VersionProbeError('version probe returned an invalid build identity')
  }
  const candidate = payload as unknown as Record<string, unknown>
  const release = isRemoteReleaseNote(candidate.release)
    ? candidate.release
    : undefined
  return {
    version: candidate.version as string,
    commit: candidate.commit as string,
    builtAt: candidate.builtAt as string,
    ...(release ? { release } : {}),
  }
}

export class VersionProbeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VersionProbeError'
  }
}

function isRemoteBuildInfo(value: unknown): value is RemoteBuildInfo {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.version === 'string' &&
    Boolean(parseSemVer(candidate.version)) &&
    typeof candidate.commit === 'string' &&
    candidate.commit.length > 0 &&
    typeof candidate.builtAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.builtAt))
  )
}

function isRemoteReleaseNote(value: unknown): value is RemoteReleaseNote {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.version === 'string' &&
    Boolean(parseSemVer(candidate.version)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(candidate.date)) &&
    (candidate.level === 'patch' || candidate.level === 'minor' || candidate.level === 'major') &&
    typeof candidate.title === 'string' &&
    typeof candidate.summary === 'string' &&
    Array.isArray(candidate.changes) &&
    candidate.changes.length > 0 &&
    candidate.changes.every((change) => typeof change === 'string')
  )
}

function getDefaultLocationHref(): string {
  if (typeof window !== 'undefined') {
    return window.location.href
  }
  return 'http://localhost/'
}

function normalizeBaseUrl(value: string): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`
}
