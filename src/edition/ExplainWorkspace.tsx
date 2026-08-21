import { useMemo, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { RuntimeFeatureDescriptor } from '../library/runtime-schema'
import type { RuntimeFeatureLoadError } from '../runtime/song-edition-loader'
import type {
  AssembledSongEdition,
  RuntimeFeatureContent,
} from '../runtime/song-edition'
import type { EditionTheme } from '../theme/theme-preference'
import {
  ExplainArticleBody,
  parseFeatureArticle,
  type ExplainArticle,
} from './FeatureMarkdown'
import { ExplainLyricQuote } from './ExplainLyricQuote'
import { useSongEditionPlayback } from './use-song-edition-playback'
import type { RuntimeClient } from '../runtime/runtime-client'

export interface ExplainWorkspaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  features: readonly RuntimeFeatureContent[]
  featureErrors: readonly RuntimeFeatureLoadError[]
  audioEngine?: AudioEngine
  theme?: EditionTheme
  onStartPracticeUnit?: (practiceUnitId: string) => void
}

interface ExplainTopicEntry {
  id: string
  descriptor: RuntimeFeatureDescriptor
  article?: ExplainArticle
  unavailable: boolean
}

export function ExplainWorkspace({
  model,
  runtimeClient,
  features,
  featureErrors,
  audioEngine,
  theme = 'liner',
  onStartPracticeUnit,
}: ExplainWorkspaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const [selectedTopicId, setSelectedTopicId] = useState(
    features[0]?.descriptor.id,
  )
  const topics = useMemo(
    () => createTopicEntries(model, features, featureErrors),
    [featureErrors, features, model],
  )
  const availableTopics = topics.filter((topic) => topic.article)
  const selectedTopic =
    availableTopics.find(({ id }) => id === selectedTopicId) ??
    availableTopics[0]

  if (topics.length === 0) {
    return (
      <section className="explain-workspace" aria-label="讲解工作台" data-theme={theme}>
        <div className="explain-empty">
          <p className="eyebrow">讲解</p>
          <h2>这首歌暂时没有讲解内容。</h2>
          <p>当前歌曲仍可使用学唱与全曲功能。</p>
        </div>
      </section>
    )
  }

  const selectedTopicIndex = selectedTopic
    ? availableTopics.findIndex(({ id }) => id === selectedTopic.id)
    : -1
  const previousTopic =
    selectedTopicIndex > 0 ? availableTopics[selectedTopicIndex - 1] : undefined
  const nextTopic =
    selectedTopicIndex >= 0 && selectedTopicIndex < availableTopics.length - 1
      ? availableTopics[selectedTopicIndex + 1]
      : undefined

  return (
    <section
      className="explain-workspace"
      aria-label="讲解工作台"
      data-theme={theme}
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
                if (availableTopics.some(({ id }) => id === nextTopicId)) {
                  setSelectedTopicId(nextTopicId)
                }
              }}
            >
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id} disabled={topic.unavailable}>
                  {topic.article?.title ?? descriptorTitle(topic.descriptor.id)}
                  {topic.unavailable ? '（暂不可用）' : ''}
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
              onSelect={() => {
                if (topic.article) {
                  setSelectedTopicId(topic.id)
                }
              }}
            />
          ))}
        </nav>

        <div className="explain-current-topic">
          {selectedTopic?.article ? (
            <article className="explain-article">
              <p className="feature-label">主题 {String(selectedTopicIndex + 1).padStart(2, '0')}</p>
              <h3>{selectedTopic.article.title}</h3>
              <ExplainArticleBody
                article={selectedTopic.article}
                model={model}
                renderLyricReference={(segmentId, referenceIndex) => (
                  <ExplainLyricQuote
                    key={`${selectedTopic.id}-${referenceIndex}-${segmentId}`}
                    model={model}
                    segmentId={segmentId}
                    audioEngine={playback.engine}
                    onStartPracticeUnit={onStartPracticeUnit}
                  />
                )}
              />
            </article>
          ) : (
            <div className="explain-topic-unavailable" role="status">
              这篇讲解暂时不可用，歌词练习仍然可以使用。
            </div>
          )}

          <nav className="explain-topic-pager" aria-label="讲解主题翻页">
            <button
              type="button"
              disabled={!previousTopic}
              onClick={() => previousTopic && setSelectedTopicId(previousTopic.id)}
            >
              ← 上一篇
            </button>
            <button
              type="button"
              disabled={!nextTopic}
              onClick={() => nextTopic && setSelectedTopicId(nextTopic.id)}
            >
              下一篇 →
            </button>
          </nav>
        </div>
      </div>
    </section>
  )
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
  if (topic.unavailable) {
    return (
      <div className="explain-topic-directory-item is-unavailable" aria-disabled="true">
        <span className="explain-topic-index">{String(index + 1).padStart(2, '0')}</span>
        <span>
          <strong>{descriptorTitle(topic.descriptor.id)}</strong>
          <small>暂不可用</small>
        </span>
      </div>
    )
  }

  return (
    <button
      className={`explain-topic-directory-item${active ? ' is-active' : ''}`}
      type="button"
      aria-label={topic.article?.title}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
    >
      <span className="explain-topic-index">{String(index + 1).padStart(2, '0')}</span>
      <strong>{topic.article?.title}</strong>
    </button>
  )
}

function createTopicEntries(
  model: AssembledSongEdition,
  features: readonly RuntimeFeatureContent[],
  featureErrors: readonly RuntimeFeatureLoadError[],
): ExplainTopicEntry[] {
  const articlesById = new Map(
    features.map((feature) => [feature.descriptor.id, parseFeatureArticle(feature)]),
  )
  const errorsById = new Set(featureErrors.map(({ descriptor }) => descriptor.id))
  const descriptors = model.edition.features.length > 0
    ? model.edition.features
    : features.map(({ descriptor }) => descriptor)

  return descriptors.map((descriptor) => ({
    id: descriptor.id,
    descriptor,
    article: articlesById.get(descriptor.id),
    unavailable: errorsById.has(descriptor.id) || !articlesById.has(descriptor.id),
  }))
}

function descriptorTitle(id: string): string {
  return id
    .replace(/^\s*\d+(?:[-_.\s]+)+/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}
