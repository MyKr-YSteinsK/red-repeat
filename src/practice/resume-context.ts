export const RESUME_CONTEXT_SCHEMA_VERSION = 1 as const
export const RESUME_CONTEXT_STORAGE_KEY = 'red-repeat:resume-context:v1'

export type ResumeMode = 'practice' | 'all' | 'explain'

export interface ResumeIdentity {
  songId: string
  editionContentHash: string
  audioSourceHash: string
  timelineUrl: string
}

export interface ResumeContext extends ResumeIdentity {
  schemaVersion: typeof RESUME_CONTEXT_SCHEMA_VERSION
  mode: ResumeMode
  occurrenceId?: string
  practiceUnitId?: string
  featureId?: string
  updatedAt: number
}

export interface ResumeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function parseResumeContext(value: unknown): ResumeContext | undefined {
  const allowedKeys = [
    'schemaVersion', 'songId', 'editionContentHash', 'audioSourceHash',
    'timelineUrl', 'mode', 'occurrenceId', 'practiceUnitId', 'featureId',
    'updatedAt',
  ] as const
  if (!isRecord(value) || !hasOnlyKeys(value, allowedKeys) || !hasKeys(value, [
    'schemaVersion', 'songId', 'editionContentHash', 'audioSourceHash',
    'timelineUrl', 'mode', 'updatedAt',
  ])) {
    return undefined
  }
  if (
    value.schemaVersion !== RESUME_CONTEXT_SCHEMA_VERSION ||
    !isIdentifier(value.songId) ||
    !isHash(value.editionContentHash) ||
    !isHash(value.audioSourceHash) ||
    !isRuntimeUrl(value.timelineUrl) ||
    (value.mode !== 'practice' && value.mode !== 'all' && value.mode !== 'explain') ||
    !isTimestamp(value.updatedAt) ||
    !optionalIdentifier(value.occurrenceId) ||
    !optionalIdentifier(value.practiceUnitId) ||
    !optionalIdentifier(value.featureId)
  ) {
    return undefined
  }
  return value as unknown as ResumeContext
}

export function readResumeContext(storage?: ResumeStorage): ResumeContext | undefined {
  const persistence = storage ?? getBrowserStorage()
  if (!persistence) return undefined
  try {
    const raw = persistence.getItem(RESUME_CONTEXT_STORAGE_KEY)
    return raw ? parseResumeContext(JSON.parse(raw) as unknown) : undefined
  } catch {
    return undefined
  }
}

export function saveResumeContext(
  value: ResumeContext,
  storage?: ResumeStorage,
): boolean {
  const persistence = storage ?? getBrowserStorage()
  const validated = parseResumeContext(value)
  if (!persistence || !validated) return false
  try {
    persistence.setItem(RESUME_CONTEXT_STORAGE_KEY, JSON.stringify(validated))
    return true
  } catch {
    return false
  }
}

export function isResumeIdentityCompatible(
  saved: ResumeIdentity,
  current: ResumeIdentity,
): boolean {
  return saved.songId === current.songId &&
    saved.editionContentHash === current.editionContentHash &&
    saved.audioSourceHash === current.audioSourceHash &&
    saved.timelineUrl === current.timelineUrl
}

function getBrowserStorage(): ResumeStorage | undefined {
  if (typeof globalThis.localStorage === 'undefined') return undefined
  return globalThis.localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function hasKeys(value: Record<string, unknown>, required: readonly string[]): boolean {
  return required.every((key) => Object.hasOwn(value, key))
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,127}$/i.test(value)
}

function optionalIdentifier(value: unknown): value is string | undefined {
  return value === undefined || isIdentifier(value)
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

function isRuntimeUrl(value: unknown): value is string {
  return typeof value === 'string' && /^\/library-runtime\/[a-zA-Z0-9._/-]+$/.test(value)
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
