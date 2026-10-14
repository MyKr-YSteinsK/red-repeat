import { useEffect, useState } from 'react'
import type { Catalog } from '../library/runtime-schema'
import { createPracticeIndex } from './practice-scope'
import {
  movePracticeQueueItem,
  readPracticeQueueStatus,
  removePracticeQueueItem,
  PRACTICE_QUEUE_STORAGE_KEY,
  type PracticeQueueItem,
} from './practice-queue'
import type { RuntimeClient } from '../runtime/runtime-client'
import { loadValidatedSongContext } from './validated-song-context'
import { createPracticeQueueHref } from '../navigation'

type QueueItemStatus = 'checking' | 'ready' | 'stale' | 'unavailable'

export function PracticeQueuePanel({
  catalog,
  runtimeClient,
  onBeforeNavigate,
}: {
  catalog: Catalog
  runtimeClient: RuntimeClient
  onBeforeNavigate: () => void
}) {
  const [open, setOpen] = useState(false)
  const [queueState, setQueueState] = useState(readPracticeQueueStatus)
  const [statusSnapshot, setStatusSnapshot] = useState<{
    queueKey: string
    byId: Readonly<Record<string, QueueItemStatus>>
  }>({ queueKey: '', byId: {} })
  const queueKey = queueState.queue.items.map(({ id }) => id).join('\u0000')

  const refreshQueue = (): void => {
    setQueueState(readPracticeQueueStatus())
    setStatusSnapshot({ queueKey: '', byId: {} })
  }

  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (!event.key || event.key === PRACTICE_QUEUE_STORAGE_KEY) refreshQueue()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!open || queueState.invalid || queueState.queue.items.length === 0) return
    const controller = new AbortController()
    let active = true
    const items = [...queueState.queue.items]
    const currentQueueKey = items.map(({ id }) => id).join('\u0000')
    let nextIndex = 0
    const worker = async (): Promise<void> => {
      while (active && nextIndex < items.length) {
        const item = items[nextIndex++]
        const status = await validateQueueItem(item, catalog, runtimeClient, controller.signal)
        if (active) setStatusSnapshot((current) => ({
          queueKey: currentQueueKey,
          byId: {
            ...(current.queueKey === currentQueueKey ? current.byId : {}),
            [item.id]: status,
          },
        }))
      }
    }
    void Promise.all([worker(), worker(), worker()])
    return () => {
      active = false
      controller.abort()
    }
  }, [catalog, open, queueState.invalid, queueState.queue.items, runtimeClient])

  const move = (itemId: string, direction: -1 | 1): void => {
    if (movePracticeQueueItem(itemId, direction)) refreshQueue()
  }

  const remove = (itemId: string): void => {
    if (removePracticeQueueItem(itemId)) refreshQueue()
  }

  return (
    <section className="practice-queue-panel" aria-labelledby="practice-queue-title">
      <div className="practice-queue-heading">
        <div>
          <p className="eyebrow">本地 / 手动</p>
          <h2 id="practice-queue-title">待练队列</h2>
        </div>
        <button
          className="practice-queue-toggle"
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? '收起' : `查看 ${queueState.queue.items.length} 项`}
        </button>
      </div>
      {queueState.invalid ? (
        <p className="practice-queue-status" role="alert">
          本机待练数据无法验证，已保留原数据；请先导出个人备份以便检查。
        </p>
      ) : open ? queueState.queue.items.length === 0 ? (
        <p className="practice-queue-status">还没有待练项目。可在歌词旁手动加入。</p>
      ) : (
        <ol className="practice-queue-list">
          {queueState.queue.items.map((item, index) => (
            <QueueEntry
              key={item.id}
              item={item}
              index={index}
              count={queueState.queue.items.length}
              edition={catalog.editions.find(({ songId }) => songId === item.songId)}
              status={statusSnapshot.queueKey === queueKey
                ? statusSnapshot.byId[item.id] ?? 'checking'
                : 'checking'}
              onBeforeNavigate={onBeforeNavigate}
              onMove={move}
              onRemove={remove}
            />
          ))}
        </ol>
      ) : (
        <p className="practice-queue-status">
          手动保存想稍后练习的句子。进入队列时会按当前有效 Song Edition 核验目标。
        </p>
      )}
    </section>
  )
}

function QueueEntry({
  item,
  index,
  count,
  edition,
  status,
  onBeforeNavigate,
  onMove,
  onRemove,
}: {
  item: PracticeQueueItem
  index: number
  count: number
  edition?: Catalog['editions'][number]
  status: QueueItemStatus
  onBeforeNavigate: () => void
  onMove: (id: string, direction: -1 | 1) => void
  onRemove: (id: string) => void
}) {
  const statusLabel = status === 'checking'
    ? '正在核对…'
    : status === 'ready'
      ? '可进入学唱'
      : status === 'stale'
        ? '版本或歌词已变化'
        : '当前不可用'
  return (
    <li className="practice-queue-entry" data-queue-item-id={item.id}>
      <div className="practice-queue-entry-copy">
        <strong>{edition?.title ?? item.songId}</strong>
        <span>Occurrence {item.occurrenceId} · {statusLabel}</span>
      </div>
      <div className="practice-queue-entry-actions">
        {status === 'ready' && edition ? (
          <a
            className="practice-queue-open"
            href={createPracticeQueueHref(item.songId, item.id, window.location)}
            onClick={onBeforeNavigate}
          >
            打开学唱
          </a>
        ) : null}
        <button type="button" aria-label={`待练第 ${index + 1} 项上移`} disabled={index === 0} onClick={() => onMove(item.id, -1)}>上移</button>
        <button type="button" aria-label={`待练第 ${index + 1} 项下移`} disabled={index === count - 1} onClick={() => onMove(item.id, 1)}>下移</button>
        <button type="button" aria-label={`移除待练 ${edition?.title ?? item.songId} ${item.occurrenceId}`} onClick={() => onRemove(item.id)}>移除</button>
      </div>
    </li>
  )
}

async function validateQueueItem(
  item: PracticeQueueItem,
  catalog: Catalog,
  runtimeClient: RuntimeClient,
  signal: AbortSignal,
): Promise<QueueItemStatus> {
  const catalogEdition = catalog.editions.find(({ songId }) => songId === item.songId)
  if (!catalogEdition) return 'unavailable'
  try {
    const core = await loadValidatedSongContext(runtimeClient, catalogEdition, { signal })
    if (core.edition.song.songId !== item.songId) return 'stale'
    if (
      core.edition.contentHash !== item.editionContentHash ||
      core.edition.audio.sourceHash !== item.audioSourceHash ||
      core.edition.timelineUrl !== item.timelineUrl
    ) return 'stale'
    const index = createPracticeIndex(core.practice, core.timeline)
    if (
      index.unitIdByOccurrenceId.get(item.occurrenceId) !== item.practiceUnitId ||
      !core.assembled.segmentsById[item.segmentId] ||
      !core.timeline.occurrences.some(({ id, segmentId }) =>
        id === item.occurrenceId && segmentId === item.segmentId,
      )
    ) return 'stale'
    return 'ready'
  } catch {
    return 'unavailable'
  }
}
