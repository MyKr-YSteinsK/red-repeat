import type {
  AssembledOccurrence,
  AssembledSongEdition,
  RuntimeFeatureContent,
} from '../runtime/song-edition'
import type { RuntimeFeatureLoadError } from '../runtime/song-edition-loader'

export interface FeatureSectionProps {
  model: AssembledSongEdition
  features: readonly RuntimeFeatureContent[]
  featureErrors: readonly RuntimeFeatureLoadError[]
}

export function FeatureSection({
  model,
  features,
  featureErrors,
}: FeatureSectionProps) {
  if (features.length === 0 && featureErrors.length === 0) {
    return null
  }

  return (
    <section className="feature-section" aria-labelledby="features-title">
      <div className="feature-heading">
        <p className="eyebrow">FEATURE / NOTES</p>
        <h2 id="features-title">A little more about the work.</h2>
      </div>
      {featureErrors.length > 0 ? (
        <div className="feature-errors" role="status">
          {featureErrors.map(({ descriptor }) => (
            <p key={descriptor.id}>
              {descriptor.id} is temporarily unavailable. The lyric reading remains
              available.
            </p>
          ))}
        </div>
      ) : null}
      {features.map((feature) => (
        <article className="feature-article" key={feature.descriptor.id}>
          <p className="feature-label">{feature.descriptor.id}</p>
          <MarkdownBlocks content={feature.content} model={model} />
        </article>
      ))}
    </section>
  )
}

export function MarkdownBlocks({
  content,
  model,
}: {
  content: string
  model: AssembledSongEdition
}) {
  const blocks = parseMarkdownBlocks(content)
  return (
    <div className="feature-markdown">
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <h3 key={`heading-${index}`}>
              <InlineMarkdown text={block.text} model={model} />
            </h3>
          )
        }
        if (block.kind === 'list') {
          return (
            <ul key={`list-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`item-${itemIndex}`}>
                  <InlineMarkdown text={item} model={model} />
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={`paragraph-${index}`}>
            <InlineMarkdown text={block.text} model={model} />
          </p>
        )
      })}
    </div>
  )
}

function InlineMarkdown({
  text,
  model,
}: {
  text: string
  model: AssembledSongEdition
}) {
  const tokens = text.split(
    /(\[\[segment:[^\]]+\]\]|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g,
  )
  return (
    <>
      {tokens.map((token, index) => {
        if (!token) {
          return null
        }
        const crossReference = /^\[\[segment:([^\]]+)\]\]$/.exec(token)
        if (crossReference) {
          return (
            <SegmentReference
              key={`reference-${index}`}
              model={model}
              segmentId={crossReference[1]}
            />
          )
        }
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={`strong-${index}`}>{token.slice(2, -2)}</strong>
        }
        if (token.startsWith('__') && token.endsWith('__')) {
          return <strong key={`strong-${index}`}>{token.slice(2, -2)}</strong>
        }
        if (token.startsWith('*') && token.endsWith('*')) {
          return <em key={`emphasis-${index}`}>{token.slice(1, -1)}</em>
        }
        if (token.startsWith('_') && token.endsWith('_')) {
          return <em key={`emphasis-${index}`}>{token.slice(1, -1)}</em>
        }
        return token
      })}
    </>
  )
}

function SegmentReference({
  model,
  segmentId,
}: {
  model: AssembledSongEdition
  segmentId: string
}) {
  const segment = model.segmentsById[segmentId]
  const target = findFirstRenderedOccurrence(model, segmentId)
  if (!segment || !target) {
    return <span className="feature-reference">{segmentId}</span>
  }

  return (
    <button
      className="feature-reference"
      type="button"
      data-segment-reference={segmentId}
      aria-label={`Jump to ${segmentId}`}
      onClick={() => scrollToOccurrence(target)}
    >
      {segmentId}
    </button>
  )
}

function findFirstRenderedOccurrence(
  model: AssembledSongEdition,
  segmentId: string,
): AssembledOccurrence | null {
  return (
    model.sections
      .flatMap(({ occurrences }) => occurrences)
      .find(({ segment }) => segment.id === segmentId) ?? null
  )
}

function scrollToOccurrence(occurrence: AssembledOccurrence): void {
  const element = document.querySelector(
    `[data-occurrence-id="${occurrence.occurrence.id}"]`,
  )
  if (!element || typeof element.scrollIntoView !== 'function') {
    return
  }
  const reducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches
  element.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'center',
  })
}

type MarkdownBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) {
      index += 1
      continue
    }

    const heading = /^#{1,6}\s+(.+)$/.exec(line)
    if (heading) {
      blocks.push({ kind: 'heading', text: heading[1] })
      index += 1
      continue
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length) {
        const item = /^[-*+]\s+(.+)$/.exec(lines[index].trim())
        if (!item) {
          break
        }
        items.push(item[1])
        index += 1
      }
      blocks.push({ kind: 'list', items })
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const paragraphLine = lines[index].trim()
      if (
        !paragraphLine ||
        /^#{1,6}\s+/.test(paragraphLine) ||
        /^[-*+]\s+/.test(paragraphLine)
      ) {
        break
      }
      paragraphLines.push(paragraphLine)
      index += 1
    }
    blocks.push({ kind: 'paragraph', text: paragraphLines.join(' ') })
  }

  return blocks
}
