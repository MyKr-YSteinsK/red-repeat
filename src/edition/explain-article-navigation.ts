import type { ExplainArticle } from './FeatureMarkdown'

export interface ExplainArticleHeadingTarget {
  id: string
  blockIndex: number
  level: number
  text: string
}

export function explainArticleBlockDomId(articleId: string, blockIndex: number): string {
  return `explain-${encodeURIComponent(articleId)}-block-${blockIndex}`
}

export function getExplainArticleHeadingTargets(
  article: ExplainArticle,
): ExplainArticleHeadingTarget[] {
  return article.blocks.flatMap((block, blockIndex) =>
    block.kind === 'heading'
      ? [{
          id: explainArticleBlockDomId(article.id, blockIndex),
          blockIndex,
          level: block.level,
          text: block.text,
        }]
      : [],
  )
}
