import type { ElementType, ReactNode } from 'react'
import type {
  AssembledSongEdition,
  RuntimeFeatureContent,
} from '../runtime/song-edition'
import { LyricText } from './LyricText'

export type ExplainBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: readonly string[] }
  | { kind: 'lyric-reference'; segmentId: string }

export interface ExplainArticle {
  id: string
  title: string
  blocks: readonly ExplainBlock[]
}

export interface ExplainArticleBodyProps {
  article: ExplainArticle
  model: AssembledSongEdition
  renderLyricReference?: (
    segmentId: string,
    referenceIndex: number,
  ) => ReactNode
}

export function ExplainArticleBody({
  article,
  model,
  renderLyricReference,
}: ExplainArticleBodyProps) {
  return (
    <div className="feature-markdown">
      {article.blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <ExplainHeading key={`heading-${index}`} level={block.level}>
              <InlineMarkdown text={block.text} />
            </ExplainHeading>
          )
        }
        if (block.kind === 'list') {
          return (
            <ul key={`list-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`item-${itemIndex}`}>
                  <InlineMarkdown text={item} />
                </li>
              ))}
            </ul>
          )
        }
        if (block.kind === 'paragraph') {
          return (
            <p key={`paragraph-${index}`}>
              <InlineMarkdown text={block.text} />
            </p>
          )
        }

        return (
          <div key={`lyric-reference-${index}`}>
            {renderLyricReference?.(block.segmentId, index) ?? (
              <DefaultLyricReference model={model} segmentId={block.segmentId} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function parseFeatureArticle(
  feature: RuntimeFeatureContent,
): ExplainArticle {
  const parsedBlocks = parseMarkdownBlocks(feature.content)
  const firstHeadingIndex = parsedBlocks.findIndex(
    (block) => block.kind === 'heading',
  )
  const firstHeading =
    firstHeadingIndex >= 0 ? parsedBlocks[firstHeadingIndex] : undefined

  return {
    id: feature.descriptor.id,
    title:
      firstHeading?.kind === 'heading'
        ? firstHeading.text
        : featureDescriptorTitle(feature.descriptor.id),
    blocks:
      firstHeadingIndex >= 0
        ? parsedBlocks.filter((_, index) => index !== firstHeadingIndex)
        : parsedBlocks,
  }
}

export function parseMarkdownBlocks(content: string): ExplainBlock[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ExplainBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) {
      index += 1
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      appendTextAndReferences(
        blocks,
        { kind: 'heading', level: heading[1].length },
        heading[2],
      )
      index += 1
      continue
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = []
      const references: string[] = []
      while (index < lines.length) {
        const item = /^[-*+]\s+(.+)$/.exec(lines[index].trim())
        if (!item) {
          break
        }
        const extracted = extractSegmentReferences(item[1])
        if (extracted.text) {
          items.push(extracted.text)
        }
        references.push(...extracted.references)
        index += 1
      }
      if (items.length > 0) {
        blocks.push({ kind: 'list', items })
      }
      references.forEach((segmentId) => {
        blocks.push({ kind: 'lyric-reference', segmentId })
      })
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const paragraphLine = lines[index].trim()
      if (
        !paragraphLine ||
        /^(#{1,6})\s+/.test(paragraphLine) ||
        /^[-*+]\s+/.test(paragraphLine)
      ) {
        break
      }
      paragraphLines.push(paragraphLine)
      index += 1
    }
    appendTextAndReferences(
      blocks,
      { kind: 'paragraph' },
      paragraphLines.join(' '),
    )
  }

  return blocks
}

function appendTextAndReferences(
  blocks: ExplainBlock[],
  block: { kind: 'heading'; level: number } | { kind: 'paragraph' },
  text: string,
): void {
  const extracted = extractSegmentReferences(text)
  if (extracted.text) {
    blocks.push({ ...block, text: extracted.text })
  }
  extracted.references.forEach((segmentId) => {
    blocks.push({ kind: 'lyric-reference', segmentId })
  })
}

function extractSegmentReferences(text: string): {
  text: string
  references: string[]
} {
  const references: string[] = []
  const textWithoutReferences = text.replace(
    /\[\[segment:([^\]]+)\]\]/g,
    (_match, rawSegmentId: string) => {
      const segmentId = rawSegmentId.trim()
      if (segmentId) {
        references.push(segmentId)
      }
      return ''
    },
  )

  return {
    text: textWithoutReferences.replace(/[ \t]{2,}/g, ' ').trim(),
    references,
  }
}

function featureDescriptorTitle(id: string): string {
  const withoutSortPrefix = id.replace(/^\s*\d+(?:[-_.\s]+)+/, '').trim()
  const readable = withoutSortPrefix.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
  return readable.trim() || id
}

function ExplainHeading({
  level,
  children,
}: {
  level: number
  children: ReactNode
}) {
  const Heading = `h${Math.min(6, Math.max(3, level + 1))}` as ElementType
  return <Heading>{children}</Heading>
}

function InlineMarkdown({ text }: { text: string }) {
  const tokens = text.split(
    /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g,
  )
  return (
    <>
      {tokens.map((token, index) => {
        if (!token) {
          return null
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

function DefaultLyricReference({
  model,
  segmentId,
}: {
  model: AssembledSongEdition
  segmentId: string
}) {
  const segment = model.segmentsById[segmentId]
  if (!segment) {
    return (
      <div className="feature-lyric-reference is-unavailable" role="note">
        这条歌词引用暂不可用。
      </div>
    )
  }

  const reading = segment.layers?.[0]?.text
  return (
    <div className="feature-lyric-reference" role="group" aria-label="歌词引用">
      <p className="feature-lyric-reference-original">
        <LyricText segment={segment} />
      </p>
      <p className="feature-lyric-reference-translation">{segment.translation}</p>
      {reading ? (
        <p className="feature-lyric-reference-reading">{reading}</p>
      ) : null}
    </div>
  )
}
