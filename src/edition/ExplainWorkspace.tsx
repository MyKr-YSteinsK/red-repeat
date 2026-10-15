import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { RuntimeFeatureDescriptor } from '../library/runtime-schema'
import type { AssembledSongEdition } from '../runtime/song-edition'
import {
  ExplainArticleBody,
  parseFeatureArticle,
  type ExplainArticle,
} from './FeatureMarkdown'
import {
  explainArticleBlockDomId,
  getExplainArticleHeadingTargets,
} from './explain-article-navigation'
import { ExplainLyricQuote } from './ExplainLyricQuote'
import { useSongEditionPlayback } from './use-song-edition-playback'
import { useSessionViewState } from './song-playback-context'
import {
  RuntimeClientError,
  type RuntimeClient,
} from '../runtime/runtime-client'
import {
  captureScrollAnchor,
  prefersReducedMotion,
  restoreScrollPolicy,
  type TransitionPolicy,
} from '../navigation/stable-context-transition'

export interface ExplainWorkspaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
  initialFeatureId?: string
  relatedContext?: { segmentId: string; occurrenceId: string }
  onReturnToSource?: () => void
  onResumeFeature?: (featureId: string) => void
}

interface ExplainTopicEntry {
  id: string
  descriptor: RuntimeFeatureDescriptor
  article?: ExplainArticle
  status: ExplainFeatureStatus
}

type ExplainFeatureStatus = 'idle' | 'loading' | 'ready' | 'error'

type ExplainFeatureLoadState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; article: ExplainArticle }
  | { status: 'error'; error: unknown }

type RelatedLookupResult =
  | { status: 'found'; featureId: string; blockIndex: number }
  | { status: 'not-found' }
  | { status: 'unavailable' }
  | { status: 'dismissed' }

type ExplainNavigationSource = 'directory' | 'select' | 'previous' | 'next'

export function ExplainWorkspace({
  model,
  runtimeClient,
  audioEngine,
  initialFeatureId,
  relatedContext,
  onReturnToSource,
  onResumeFeature,
}: ExplainWorkspaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const [selectedTopicId, setSelectedTopicId] = useSessionViewState('explain.topic',
    initialFeatureId ?? model.edition.features[0]?.id,
  )
  const [featureStates, setFeatureStates] = useSessionViewState<
    Readonly<Record<string, ExplainFeatureLoadState>>
  >('explain.features', {})
  const [retryByUrl, setRetryByUrl] = useState<Readonly<Record<string, number>>>({})
  const [relatedLookup, setRelatedLookup] = useState<{
    key: string
    result: RelatedLookupResult
  }>()
  const relatedLookupKeyRef = useRef<string | undefined>(undefined)
  const relatedLookupRequestRef = useRef(0)
  const relatedLookupControllerRef = useRef<AbortController | undefined>(undefined)
  const startedRequestsRef = useRef(new Set<string>())
  const featureLoadPromisesRef = useRef(new Map<string, {
    promise: Promise<ExplainArticle>
    signal: AbortSignal
  }>())
  const featureStatesRef = useRef(featureStates)
  const updateFeatureState = useCallback(
    (url: string, state: ExplainFeatureLoadState): void => {
      const next = { ...featureStatesRef.current, [url]: state }
      featureStatesRef.current = next
      setFeatureStates(next)
    },
    [setFeatureStates],
  )
  const loadFeatureArticle = useCallback((
    descriptor: RuntimeFeatureDescriptor,
    signal: AbortSignal,
  ): Promise<ExplainArticle> => {
    const existing = featureLoadPromisesRef.current.get(descriptor.url)
    if (existing && !existing.signal.aborted) return existing.promise
    const request = runtimeClient
      .loadFeature(descriptor, { signal })
      .then((content) => parseFeatureArticle({ descriptor, content }))
    const requestEntry = { promise: request, signal }
    featureLoadPromisesRef.current.set(descriptor.url, requestEntry)
    void request.then(
      () => {
        if (featureLoadPromisesRef.current.get(descriptor.url) === requestEntry) {
          featureLoadPromisesRef.current.delete(descriptor.url)
        }
      },
      () => {
        if (featureLoadPromisesRef.current.get(descriptor.url) === requestEntry) {
          featureLoadPromisesRef.current.delete(descriptor.url)
        }
      },
    )
    return request
  }, [runtimeClient])
  const topics = useMemo(
    () => createTopicEntries(model.edition.features, featureStates),
    [featureStates, model.edition.features],
  )
  const selectedTopic = topics.find(({ id }) => id === selectedTopicId) ?? topics[0]
  const selectedDescriptor = selectedTopic?.descriptor
  const selectedFeatureUrl = selectedTopic?.descriptor.url
  const selectedRetry = selectedFeatureUrl
    ? retryByUrl[selectedFeatureUrl] ?? 0
    : 0
  const relatedLookupKey = relatedContext
    ? `${model.edition.contentHash}\u0000${relatedContext.segmentId}\u0000${relatedContext.occurrenceId}`
    : undefined
  const activeRelatedLookup = useMemo(() => {
    if (relatedLookup && relatedLookup.key === relatedLookupKey) return relatedLookup.result
    return relatedContext ? { status: 'loading' as const } : undefined
  }, [relatedContext, relatedLookup, relatedLookupKey])
  const selectedArticle = selectedTopic?.article
  const chapterTargets = selectedArticle
    ? getExplainArticleHeadingTargets(selectedArticle)
    : []
  const relatedTargetBlockIndex = relatedContext &&
    activeRelatedLookup?.status === 'found' &&
    activeRelatedLookup.featureId === selectedTopic?.id &&
    selectedArticle
    ? resolveRelatedReferenceBlockIndex(
        selectedArticle,
        relatedContext.segmentId,
        activeRelatedLookup.blockIndex,
      )
    : undefined
  const topicHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const pendingTopicNavigationRef = useRef<{
    anchor: ReturnType<typeof captureScrollAnchor>
    policy: TransitionPolicy
  } | undefined>(undefined)
  const lastRelatedScrollKeyRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!relatedContext) {
      relatedLookupKeyRef.current = undefined
      relatedLookupRequestRef.current += 1
      return
    }
    const lookupKey = relatedLookupKey
    if (!lookupKey) return
    if (relatedLookupKeyRef.current === lookupKey) return
    relatedLookupKeyRef.current = lookupKey
    const requestId = relatedLookupRequestRef.current + 1
    relatedLookupRequestRef.current = requestId
    const controller = new AbortController()
    relatedLookupControllerRef.current = controller
    let active = true
    const isCurrentRequest = (): boolean =>
      active && relatedLookupRequestRef.current === requestId &&
      relatedLookupKeyRef.current === lookupKey

    void (async () => {
      for (const descriptor of model.edition.features) {
        if (!isCurrentRequest()) return
        const cached = featureStatesRef.current[descriptor.url]
        const article = cached?.status === 'ready'
          ? cached.article
          : await loadFeatureArticle(descriptor, controller.signal)
        if (!isCurrentRequest()) return
        if (cached?.status !== 'ready') {
          updateFeatureState(descriptor.url, { status: 'ready', article })
        }
        const blockIndex = article.blocks.findIndex(
          (block) => block.kind === 'lyric-reference' && block.segmentId === relatedContext.segmentId,
        )
        if (blockIndex >= 0) {
          setSelectedTopicId(descriptor.id)
          setRelatedLookup({
            key: lookupKey,
            result: { status: 'found', featureId: descriptor.id, blockIndex },
          })
          return
        }
      }
      if (isCurrentRequest()) {
        setRelatedLookup({ key: lookupKey, result: { status: 'not-found' } })
      }
    })().catch((error: unknown) => {
      if (isCurrentRequest() && !(error instanceof RuntimeClientError && error.kind === 'abort')) {
        setRelatedLookup({ key: lookupKey, result: { status: 'unavailable' } })
      }
    })
    return () => {
      active = false
      controller.abort()
      if (relatedLookupControllerRef.current === controller) {
        relatedLookupControllerRef.current = undefined
      }
      if (relatedLookupRequestRef.current === requestId) {
        relatedLookupKeyRef.current = undefined
      }
    }
  }, [loadFeatureArticle, model.edition.features, relatedContext, relatedLookupKey, setSelectedTopicId, updateFeatureState])

  useEffect(() => {
    if (!selectedTopic) return
    if (relatedContext && activeRelatedLookup?.status !== 'dismissed' && (
      activeRelatedLookup?.status !== 'found' || activeRelatedLookup.featureId !== selectedTopic.id
    )) return
    onResumeFeature?.(selectedTopic.id)
  }, [activeRelatedLookup, onResumeFeature, relatedContext, selectedTopic])

  useEffect(() => {
    if (relatedContext && activeRelatedLookup?.status === 'loading') return
    const descriptor = selectedDescriptor
    if (!descriptor) {
      return
    }
    const currentState = featureStatesRef.current[descriptor.url]
    if (currentState?.status === 'ready') {
      return
    }

    const requestKey = `${descriptor.url}\u0000${selectedRetry}`
    if (startedRequestsRef.current.has(requestKey)) {
      return
    }
    startedRequestsRef.current.add(requestKey)
    const startedRequests = startedRequestsRef.current

    let active = true
    const controller = new AbortController()
    updateFeatureState(descriptor.url, { status: 'loading' })
    void loadFeatureArticle(descriptor, controller.signal)
      .then((article) => {
        if (active) {
          updateFeatureState(descriptor.url, {
            status: 'ready',
            article,
          })
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        if (error instanceof RuntimeClientError && error.kind === 'abort') {
          updateFeatureState(descriptor.url, { status: 'idle' })
          return
        }
        updateFeatureState(descriptor.url, { status: 'error', error })
      })

    return () => {
      active = false
      controller.abort()
      startedRequests.delete(requestKey)
    }
  }, [
    runtimeClient,
    loadFeatureArticle,
    selectedDescriptor,
    selectedRetry,
    relatedContext,
    activeRelatedLookup?.status,
    updateFeatureState,
  ])

  const dismissRelatedNavigation = (): void => {
    if (!relatedLookupKey) return
    relatedLookupRequestRef.current += 1
    relatedLookupControllerRef.current?.abort()
    setRelatedLookup({ key: relatedLookupKey, result: { status: 'dismissed' } })
  }

  const navigateExplainTopic = (
    nextTopicId: string,
    source: ExplainNavigationSource,
  ): void => {
    dismissRelatedNavigation()
    if (nextTopicId === selectedTopic?.id) {
      return
    }
    pendingTopicNavigationRef.current = {
      anchor: captureScrollAnchor(topicHeadingRef.current),
      policy:
        source === 'previous' || source === 'next'
          ? 'reveal-content-start'
          : 'preserve-anchor',
    }
    setSelectedTopicId(nextTopicId)
  }

  useLayoutEffect(() => {
    const pendingNavigation = pendingTopicNavigationRef.current
    if (!pendingNavigation) {
      return
    }
    pendingTopicNavigationRef.current = undefined
    restoreScrollPolicy(
      pendingNavigation.policy,
      pendingNavigation.anchor,
      topicHeadingRef.current,
      96,
    )
  }, [selectedTopic?.id])

  useLayoutEffect(() => {
    if (!relatedContext) {
      lastRelatedScrollKeyRef.current = undefined
      return
    }
    if (
      activeRelatedLookup?.status !== 'found' ||
      activeRelatedLookup.featureId !== selectedTopic?.id ||
      !selectedArticle
    ) return

    const blockIndex = resolveRelatedReferenceBlockIndex(
      selectedArticle,
      relatedContext.segmentId,
      activeRelatedLookup.blockIndex,
    )
    if (blockIndex === undefined) return
    const scrollKey = `${relatedLookupKey}\u0000${activeRelatedLookup.featureId}\u0000${blockIndex}`
    if (lastRelatedScrollKeyRef.current === scrollKey) return

    const target = document.getElementById(
      explainArticleBlockDomId(selectedArticle.id, blockIndex),
    )
    if (!(target instanceof HTMLElement)) return

    lastRelatedScrollKeyRef.current = scrollKey
    revealExplainTarget(target)
  }, [
    activeRelatedLookup,
    relatedContext,
    relatedLookupKey,
    selectedArticle,
    selectedTopic?.id,
  ])

  if (topics.length === 0) {
    return (
      <section className="explain-workspace" aria-label="讲解工作台">
        <div className="explain-empty">
          <p className="eyebrow">讲解</p>
          <h2>这首歌暂时没有讲解内容。</h2>
          <p>当前歌曲仍可使用学唱与全曲功能。</p>
        </div>
      </section>
    )
  }

  const selectedTopicIndex = selectedTopic
    ? topics.findIndex(({ id }) => id === selectedTopic.id)
    : -1
  const previousTopic =
    selectedTopicIndex > 0 ? topics[selectedTopicIndex - 1] : undefined
  const nextTopic =
    selectedTopicIndex >= 0 && selectedTopicIndex < topics.length - 1
      ? topics[selectedTopicIndex + 1]
      : undefined

  return (
    <section
      className="explain-workspace"
      aria-label="讲解工作台"
      data-current-topic-id={selectedTopic?.id}
    >
      <header className="explain-workspace-heading">
        <div>
          <p className="eyebrow">讲解</p>
          <h2>从作品里听见更多。</h2>
        </div>
        {onReturnToSource ? (
          <button className="explain-return-source" type="button" onClick={onReturnToSource}>
            返回来源位置
          </button>
        ) : null}
        {topics.length > 1 ? (
          <label className="explain-topic-select">
            <span>选择主题</span>
            <select
              aria-label="选择讲解主题"
              value={selectedTopic?.id ?? ''}
              onChange={(event) => {
                const nextTopicId = event.currentTarget.value
                if (topics.some(({ id }) => id === nextTopicId)) {
                  navigateExplainTopic(nextTopicId, 'select')
                }
              }}
            >
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.article?.title ?? descriptorTitle(topic.descriptor.id)}
                  {topic.status === 'loading' ? '（加载中）' : ''}
                  {topic.status === 'error' ? '（暂不可用）' : ''}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      {activeRelatedLookup?.status === 'loading' ? <p className="explain-related-status" role="status">正在查找引用这句歌词的讲解…</p> : null}
      {activeRelatedLookup?.status === 'not-found' ? <p className="explain-related-status" role="status">暂无引用这句歌词的讲解。</p> : null}
      {activeRelatedLookup?.status === 'unavailable' ? <p className="explain-related-status" role="status">讲解暂时无法核对；学唱和全曲仍可使用。</p> : null}

      <div className="explain-workspace-layout">
        <nav className="explain-topic-directory" aria-label="讲解主题目录">
          {topics.map((topic, index) => (
            <TopicDirectoryItem
              key={topic.id}
              topic={topic}
              index={index}
              active={topic.id === selectedTopic?.id}
              onSelect={() => navigateExplainTopic(topic.id, 'directory')}
            />
          ))}
        </nav>

        <div className="explain-current-topic">
          {selectedTopic?.status === 'ready' && selectedTopic.article ? (
            <article className="explain-article">
              <p className="feature-label">主题 {String(selectedTopicIndex + 1).padStart(2, '0')}</p>
              <h3 ref={topicHeadingRef}>{selectedTopic.article.title}</h3>
              {chapterTargets.length > 0 ? (
                <details className="explain-chapter-navigation">
                  <summary>本篇章节</summary>
                  <nav aria-label="本篇章节">
                    {chapterTargets.map((heading) => (
                      <button
                        key={heading.id}
                        type="button"
                        aria-label={chapterNavigationLabel(heading, chapterTargets)}
                        style={{
                          paddingInlineStart: `${Math.max(0, heading.level - 2) * 0.65}rem`,
                        }}
                        onClick={() => {
                          dismissRelatedNavigation()
                          const target = document.getElementById(heading.id)
                          if (target instanceof HTMLElement) revealExplainTarget(target)
                        }}
                      >
                        {heading.text}
                      </button>
                    ))}
                  </nav>
                </details>
              ) : null}
              <ExplainArticleBody
                article={selectedTopic.article}
                model={model}
                relatedTarget={relatedTargetBlockIndex === undefined || !relatedContext
                  ? undefined
                  : { blockIndex: relatedTargetBlockIndex, segmentId: relatedContext.segmentId }}
                renderLyricReference={(segmentId, referenceIndex) => (
                  <ExplainLyricQuote
                    key={`${selectedTopic.id}-${referenceIndex}-${segmentId}`}
                    model={model}
                    segmentId={segmentId}
                    audioEngine={playback.engine}
                    playbackSession={playback.session}
                    preferredOccurrenceId={relatedContext?.segmentId === segmentId ? relatedContext.occurrenceId : undefined}
                  />
                )}
              />
            </article>
          ) : selectedTopic?.status === 'error' ? (
            <div className="explain-topic-unavailable" role="status">
              这篇讲解暂时不可用，歌词练习仍然可以使用。
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  const url = selectedTopic.descriptor.url
                  setRetryByUrl((current) => ({
                    ...current,
                    [url]: (current[url] ?? 0) + 1,
                  }))
                }}
              >
                重试加载
              </button>
            </div>
          ) : (
            <div className="explain-topic-loading" role="status">
              正在加载这篇讲解…
            </div>
          )}

          <nav className="explain-topic-pager" aria-label="讲解主题翻页">
            <button
              className="control-button explain-topic-pager-previous"
              type="button"
              disabled={!previousTopic}
              onClick={() => previousTopic && navigateExplainTopic(previousTopic.id, 'previous')}
            >
              ← 上一篇
            </button>
            <button className="control-button control-button--quiet explain-scroll-top" type="button" onClick={() => {
              dismissRelatedNavigation()
              scrollExplainToTop()
            }}>
              回到顶部
            </button>
            <button
              className="control-button explain-topic-pager-next"
              type="button"
              disabled={!nextTopic}
              onClick={() => nextTopic && navigateExplainTopic(nextTopic.id, 'next')}
            >
              下一篇 →
            </button>
          </nav>
        </div>
      </div>
    </section>
  )
}

function scrollExplainToTop(): void {
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

function chapterNavigationLabel(
  target: ReturnType<typeof getExplainArticleHeadingTargets>[number],
  targets: ReturnType<typeof getExplainArticleHeadingTargets>,
): string {
  const duplicateTargets = targets.filter(({ text }) => text === target.text)
  const duplicateIndex = duplicateTargets.findIndex(({ id }) => id === target.id)
  const duplicateLabel = duplicateTargets.length > 1
    ? `（第${duplicateIndex + 1}处）`
    : ''
  return `跳转到章节：${target.text}${duplicateLabel}`
}

function resolveRelatedReferenceBlockIndex(
  article: ExplainArticle,
  segmentId: string,
  preferredBlockIndex: number,
): number | undefined {
  const preferredBlock = article.blocks[preferredBlockIndex]
  if (
    preferredBlock?.kind === 'lyric-reference' &&
    preferredBlock.segmentId === segmentId
  ) return preferredBlockIndex

  const currentMatch = article.blocks.findIndex(
    (block) => block.kind === 'lyric-reference' && block.segmentId === segmentId,
  )
  return currentMatch >= 0 ? currentMatch : undefined
}

function revealExplainTarget(target: HTMLElement): void {
  restoreScrollPolicy('reveal-content-start', undefined, target, 112)
  target.focus({ preventScroll: true })
}

function TopicDirectoryItem({
  topic,
  index,
  active,
  onSelect,
}: {
  topic: ExplainTopicEntry
  index: number
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      className={`explain-topic-directory-item${active ? ' is-active' : ''}`}
      type="button"
      aria-label={topic.article?.title ?? descriptorTitle(topic.descriptor.id)}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
    >
      <span className="explain-topic-index">{String(index + 1).padStart(2, '0')}</span>
      <span>
        <strong>{topic.article?.title ?? descriptorTitle(topic.descriptor.id)}</strong>
        {topic.status === 'loading' ? <small>加载中</small> : null}
        {topic.status === 'error' ? <small>暂不可用</small> : null}
      </span>
    </button>
  )
}

function createTopicEntries(
  descriptors: readonly RuntimeFeatureDescriptor[],
  featureStates: Readonly<Record<string, ExplainFeatureLoadState>>,
): ExplainTopicEntry[] {
  return descriptors.map((descriptor) => {
    const state = featureStates[descriptor.url] ?? { status: 'idle' }
    return {
      id: descriptor.id,
      descriptor,
      ...(state.status === 'ready' ? { article: state.article } : {}),
      status: state.status,
    }
  })
}

function descriptorTitle(id: string): string {
  const title = id
    .replace(/^\s*\d+(?:[-_.\s]+)+/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
  return title ? `${title[0].toLocaleUpperCase()}${title.slice(1)}` : id
}
