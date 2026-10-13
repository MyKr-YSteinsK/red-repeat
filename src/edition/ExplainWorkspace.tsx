import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { RuntimeFeatureDescriptor } from '../library/runtime-schema'
import type { AssembledSongEdition } from '../runtime/song-edition'
import {
  ExplainArticleBody,
  parseFeatureArticle,
  type ExplainArticle,
} from './FeatureMarkdown'
import { ExplainLyricQuote } from './ExplainLyricQuote'
import { useSongEditionPlayback } from './use-song-edition-playback'
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

type ExplainNavigationSource = 'directory' | 'select' | 'previous' | 'next'

export function ExplainWorkspace({
  model,
  runtimeClient,
  audioEngine,
}: ExplainWorkspaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const [selectedTopicId, setSelectedTopicId] = useState(
    model.edition.features[0]?.id,
  )
  const [featureStates, setFeatureStates] = useState<
    Readonly<Record<string, ExplainFeatureLoadState>>
  >({})
  const [retryByUrl, setRetryByUrl] = useState<Readonly<Record<string, number>>>({})
  const startedRequestsRef = useRef(new Set<string>())
  const featureStatesRef = useRef(featureStates)
  const updateFeatureState = useCallback(
    (url: string, state: ExplainFeatureLoadState): void => {
      const next = { ...featureStatesRef.current, [url]: state }
      featureStatesRef.current = next
      setFeatureStates(next)
    },
    [],
  )
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
  const topicHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const pendingTopicNavigationRef = useRef<{
    anchor: ReturnType<typeof captureScrollAnchor>
    policy: TransitionPolicy
  } | undefined>(undefined)

  useEffect(() => {
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
    void runtimeClient
      .loadFeature(descriptor, { signal: controller.signal })
      .then((content) => {
        if (active) {
          updateFeatureState(descriptor.url, {
            status: 'ready',
            article: parseFeatureArticle({ descriptor, content }),
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
    selectedDescriptor,
    selectedRetry,
    updateFeatureState,
  ])

  const navigateExplainTopic = (
    nextTopicId: string,
    source: ExplainNavigationSource,
  ): void => {
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
              <ExplainArticleBody
                article={selectedTopic.article}
                model={model}
                renderLyricReference={(segmentId, referenceIndex) => (
                  <ExplainLyricQuote
                    key={`${selectedTopic.id}-${referenceIndex}-${segmentId}`}
                    model={model}
                    segmentId={segmentId}
                    audioEngine={playback.engine}
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
            <button className="control-button control-button--quiet explain-scroll-top" type="button" onClick={scrollExplainToTop}>
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
