import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LyricText } from './LyricText'

describe('LyricText', () => {
  it('renders positioned ruby while retaining canonical lyric semantics', () => {
    render(
      <LyricText
        segment={{
          lyrics: '歌プレイ and',
          ruby: [
            { start: 0, end: 1, base: '歌', reading: 'うた' },
            { start: 1, end: 4, base: 'プレイ', reading: 'ぷれい' },
          ],
        }}
      />,
    )

    const text = screen.getByLabelText('歌プレイ and')
    expect(text).toHaveAttribute('data-canonical-lyric', '歌プレイ and')
    expect(text.querySelectorAll('ruby')).toHaveLength(2)
    expect(text.querySelector('ruby rt')).toHaveTextContent('うた')
    expect(text.querySelectorAll('rt')[1]).toHaveTextContent('ぷれい')
    expect(text).toHaveTextContent('歌')
    expect(text).toHaveTextContent('プレイ')
    expect(text).toHaveTextContent('and')
  })

  it('renders plain canonical text without ruby when no annotations exist', () => {
    render(<LyricText segment={{ lyrics: 'Wake Up Bankers' }} />)

    const text = screen.getByLabelText('Wake Up Bankers')
    expect(text).toHaveTextContent('Wake Up Bankers')
    expect(text.querySelector('ruby')).toBeNull()
  })

  it('keeps a lyric tap target working around ruby markup', () => {
    const onClick = vi.fn()
    render(
      <button type="button" onClick={onClick}>
        <LyricText
          segment={{
            lyrics: '已',
            ruby: [{ start: 0, end: 1, base: '已', reading: 'のみ' }],
          }}
        />
      </button>,
    )

    fireEvent.click(screen.getByRole('button', { name: '已' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
