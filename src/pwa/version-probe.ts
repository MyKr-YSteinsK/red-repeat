import { parseSemVer } from '../release/semver'

export interface RemoteBuildInfo {
  version: string
  commit: string
}

export const VERSION_PROBE_PATH = 'version.json'

export interface VersionProbeOptions {
  fetchImpl?: typeof fetch
  locationHref?: string
  cacheBust?: number
  signal?: AbortSignal
}

export function createVersionProbeUrl(
  locationHref: string,
  cacheBust: number,
): string {
  const url = new URL(VERSION_PROBE_PATH, locationHref)
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
  return payload
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
    candidate.commit.length > 0
  )
}

function getDefaultLocationHref(): string {
  if (typeof window !== 'undefined') {
    return window.location.href
  }
  return 'http://localhost/'
}
