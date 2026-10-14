export const PRACTICE_QUEUE_SCHEMA_VERSION = 1 as const
export const PRACTICE_QUEUE_STORAGE_KEY = 'red-repeat:practice-queue:v1'
export const PRACTICE_QUEUE_MAX_ITEMS = 16

export interface PracticeQueueIdentity {
  songId: string
  editionContentHash: string
  audioSourceHash: string
  timelineUrl: string
}

export interface PracticeQueueItem extends PracticeQueueIdentity {
  id: string
  practiceUnitId: string
  occurrenceId: string
  segmentId: string
  addedAt: number
}

export interface PracticeQueueDocument {
  schemaVersion: typeof PRACTICE_QUEUE_SCHEMA_VERSION
  items: PracticeQueueItem[]
}

export interface PracticeQueueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type AddPracticeQueueResult = 'added' | 'duplicate' | 'full' | 'unavailable'

export function createEmptyPracticeQueue(): PracticeQueueDocument {
  return { schemaVersion: PRACTICE_QUEUE_SCHEMA_VERSION, items: [] }
}

export function parsePracticeQueue(value: unknown): PracticeQueueDocument | undefined {
  if (!isRecord(value) || !sameKeys(value, ['schemaVersion', 'items']) ||
    value.schemaVersion !== PRACTICE_QUEUE_SCHEMA_VERSION ||
    !Array.isArray(value.items) || value.items.length > PRACTICE_QUEUE_MAX_ITEMS) {
    return undefined
  }
  const items: PracticeQueueItem[] = []
  const ids = new Set<string>()
  for (const candidate of value.items) {
    const item = parsePracticeQueueItem(candidate)
    if (!item || ids.has(item.id)) return undefined
    ids.add(item.id)
    items.push(item)
  }
  return { schemaVersion: PRACTICE_QUEUE_SCHEMA_VERSION, items }
}

export function parsePracticeQueueItem(value: unknown): PracticeQueueItem | undefined {
  if (!isRecord(value) || !sameKeys(value, [
    'id', 'songId', 'editionContentHash', 'audioSourceHash', 'timelineUrl',
    'practiceUnitId', 'occurrenceId', 'segmentId', 'addedAt',
  ])) return undefined
  if (
    !isQueueId(value.id) ||
    !isIdentifier(value.songId) ||
    !isHash(value.editionContentHash) ||
    !isHash(value.audioSourceHash) ||
    !isRuntimeUrl(value.timelineUrl) ||
    !isIdentifier(value.practiceUnitId) ||
    !isIdentifier(value.occurrenceId) ||
    !isIdentifier(value.segmentId) ||
    !isTimestamp(value.addedAt)
  ) return undefined
  const item = value as unknown as PracticeQueueItem
  if (item.id !== createPracticeQueueItemId(item)) return undefined
  return item
}

export function readPracticeQueue(storage?: PracticeQueueStorage): PracticeQueueDocument {
  return readPracticeQueueStatus(storage).queue
}

export function readPracticeQueueStatus(storage?: PracticeQueueStorage): {
  queue: PracticeQueueDocument
  invalid: boolean
} {
  const persistence = storage ?? getBrowserStorage()
  if (!persistence) return { queue: createEmptyPracticeQueue(), invalid: false }
  try {
    const raw = persistence.getItem(PRACTICE_QUEUE_STORAGE_KEY)
    if (!raw) return { queue: createEmptyPracticeQueue(), invalid: false }
    const queue = parsePracticeQueue(JSON.parse(raw) as unknown)
    return queue
      ? { queue, invalid: false }
      : { queue: createEmptyPracticeQueue(), invalid: true }
  } catch {
    return { queue: createEmptyPracticeQueue(), invalid: true }
  }
}

export function savePracticeQueue(
  queue: PracticeQueueDocument,
  storage?: PracticeQueueStorage,
): boolean {
  const persistence = storage ?? getBrowserStorage()
  const validated = parsePracticeQueue(queue)
  if (!persistence || !validated) return false
  try {
    persistence.setItem(PRACTICE_QUEUE_STORAGE_KEY, JSON.stringify(validated))
    return true
  } catch {
    return false
  }
}

export function createPracticeQueueItemId(
  item: Pick<PracticeQueueItem,
    'songId' | 'editionContentHash' | 'audioSourceHash' | 'timelineUrl' | 'occurrenceId'>,
): string {
  return [
    item.songId,
    item.editionContentHash,
    item.audioSourceHash,
    item.timelineUrl,
    item.occurrenceId,
  ].join('|')
}

export function addPracticeQueueItem(
  item: Omit<PracticeQueueItem, 'id' | 'addedAt'> & { addedAt?: number },
  storage?: PracticeQueueStorage,
): AddPracticeQueueResult {
  const { queue, invalid } = readPracticeQueueStatus(storage)
  if (invalid) return 'unavailable'
  const id = createPracticeQueueItemId(item)
  if (queue.items.some((entry) => entry.id === id)) return 'duplicate'
  if (queue.items.length >= PRACTICE_QUEUE_MAX_ITEMS) return 'full'
  const nextItem = parsePracticeQueueItem({
    ...item,
    id,
    addedAt: item.addedAt ?? Date.now(),
  })
  if (!nextItem) return 'unavailable'
  return savePracticeQueue({ ...queue, items: [...queue.items, nextItem] }, storage)
    ? 'added'
    : 'unavailable'
}

export function removePracticeQueueItem(
  id: string,
  storage?: PracticeQueueStorage,
): boolean {
  const { queue, invalid } = readPracticeQueueStatus(storage)
  if (invalid) return false
  return savePracticeQueue({
    ...queue,
    items: queue.items.filter((item) => item.id !== id),
  }, storage)
}

export function movePracticeQueueItem(
  id: string,
  direction: -1 | 1,
  storage?: PracticeQueueStorage,
): boolean {
  const { queue, invalid } = readPracticeQueueStatus(storage)
  if (invalid) return false
  const index = queue.items.findIndex((item) => item.id === id)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= queue.items.length) return false
  const items = [...queue.items]
  ;[items[index], items[nextIndex]] = [items[nextIndex], items[index]]
  return savePracticeQueue({ ...queue, items }, storage)
}

function getBrowserStorage(): PracticeQueueStorage | undefined {
  if (typeof globalThis.localStorage === 'undefined') return undefined
  return globalThis.localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sameKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,127}$/i.test(value)
}

function isQueueId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 2048 && /^[a-z0-9][a-z0-9._:/|-]*$/i.test(value)
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
