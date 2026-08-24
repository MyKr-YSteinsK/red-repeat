import { setTimeout as wait } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

interface SmokeOptions {
  url: string
  version: string
  commit: string
  timeoutMs: number
  intervalMs: number
}

interface RemoteBuildIdentity {
  version?: unknown
  commit?: unknown
  builtAt?: unknown
}

const DEFAULT_TIMEOUT_MS = 120_000
const DEFAULT_INTERVAL_MS = 5_000

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyDeployedVersion(parseOptions(process.argv.slice(2)))
}

export async function verifyDeployedVersion(options: SmokeOptions): Promise<void> {
  const expectedCommit = normalizeCommit(options.commit)
  const deadline = Date.now() + options.timeoutMs
  let attempt = 0
  let lastFailure = 'no response received'

  while (Date.now() <= deadline) {
    attempt += 1
    const probeUrl = createProbeUrl(options.url, attempt)
    try {
      const response = await globalThis.fetch(probeUrl, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const identity = await response.json() as RemoteBuildIdentity
      assertIdentity(identity, options.version, expectedCommit)
      console.log(
        `Production identity passed after ${attempt} attempt(s): ${identity.version} ${normalizeCommit(String(identity.commit))} builtAt=${String(identity.builtAt)}`,
      )
      return
    } catch (error) {
      lastFailure = describeError(error)
      if (Date.now() + options.intervalMs > deadline) {
        break
      }
      console.log(`Production identity attempt ${attempt} failed: ${lastFailure}; retrying…`)
      await wait(options.intervalMs)
    }
  }

  throw new Error(
    `Production identity did not converge within ${options.timeoutMs}ms: ${lastFailure}`,
  )
}

function parseOptions(args: readonly string[]): SmokeOptions {
  const values = new Map<string, string>()
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!argument?.startsWith('--')) {
      continue
    }
    const key = argument.slice(2)
    const value = args[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }
    values.set(key, value)
    index += 1
  }

  const url = requireOption(values, 'url')
  const version = requireOption(values, 'version')
  const commit = requireOption(values, 'commit')
  return {
    url,
    version,
    commit,
    timeoutMs: parsePositiveNumber(values.get('timeout'), DEFAULT_TIMEOUT_MS),
    intervalMs: parsePositiveNumber(values.get('interval'), DEFAULT_INTERVAL_MS),
  }
}

function createProbeUrl(deploymentUrl: string, attempt: number): string {
  const base = new URL(deploymentUrl)
  base.search = ''
  base.hash = ''
  if (!base.pathname.endsWith('/')) {
    base.pathname += '/'
  }
  const probeUrl = new URL('version.json', base)
  probeUrl.searchParams.set('verify', `${Date.now()}-${attempt}`)
  return probeUrl.toString()
}

function assertIdentity(
  identity: RemoteBuildIdentity,
  expectedVersion: string,
  expectedCommit: string,
): void {
  if (identity.version !== expectedVersion) {
    throw new Error(`stale version ${String(identity.version)}; expected ${expectedVersion}`)
  }
  if (typeof identity.commit !== 'string' || normalizeCommit(identity.commit) !== expectedCommit) {
    throw new Error(`stale commit ${String(identity.commit)}; expected ${expectedCommit}`)
  }
  if (
    typeof identity.builtAt !== 'string' ||
    Number.isNaN(Date.parse(identity.builtAt))
  ) {
    throw new Error('invalid builtAt in version probe')
  }
}

function normalizeCommit(value: string): string {
  const normalized = value.trim()
  if (normalized.length === 0) {
    throw new Error('commit must not be empty')
  }
  return normalized.slice(0, 12)
}

function requireOption(values: ReadonlyMap<string, string>, key: string): string {
  const value = values.get(key)?.trim()
  if (!value) {
    throw new Error(`Missing required option --${key}`)
  }
  return value
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive number, received ${value}`)
  }
  return parsed
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
