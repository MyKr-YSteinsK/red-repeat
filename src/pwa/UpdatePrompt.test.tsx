import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UpdatePrompt } from './UpdatePrompt'

afterEach(cleanup)

describe('UpdatePrompt', () => {
  it('shows an available version with view, update, and dismiss actions', () => {
    const onApplyUpdate = vi.fn()
    const onDismiss = vi.fn()
    render(
      <UpdatePrompt
        snapshot={{
          status: 'update-available',
          remote: {
            version: '1.2.0',
            commit: 'abcdef123456',
            builtAt: '2026-08-24T00:00:00.000Z',
          },
          dismissed: false,
        }}
        settingsHref="/#settings&release=1.2.0"
        onApplyUpdate={onApplyUpdate}
        onDismiss={onDismiss}
      />,
    )

    expect(screen.getByText('发现新版本 1.2.0')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看更新' })).toHaveClass('control-button')
    expect(screen.getByRole('link', { name: '查看更新' })).toHaveAttribute(
      'href',
      '/#settings&release=1.2.0',
    )
    const updateButton = screen.getByRole('button', { name: '立即更新' })
    const dismissButton = screen.getByRole('button', { name: '稍后' })
    expect(updateButton).toHaveClass('control-button', 'control-button--primary')
    expect(dismissButton).toHaveClass('control-button', 'control-button--quiet')
    fireEvent.click(updateButton)
    fireEvent.click(dismissButton)
    expect(onApplyUpdate).toHaveBeenCalledOnce()
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('hides a dismissed prompt and disables duplicate update clicks', () => {
    const { rerender } = render(
      <UpdatePrompt
        snapshot={{ status: 'update-available', dismissed: true }}
        settingsHref="/#settings"
        onApplyUpdate={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.queryByRole('status', { name: '应用更新提示' })).not.toBeInTheDocument()

    rerender(
      <UpdatePrompt
        snapshot={{ status: 'updating', dismissed: false }}
        settingsHref="/#settings"
        onApplyUpdate={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '更新中…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '稍后' })).toBeDisabled()
  })

  it('does not render when there is no available update', () => {
    render(
      <UpdatePrompt
        snapshot={{ status: 'up-to-date', dismissed: false, checkedAt: 1 }}
        settingsHref="/#settings"
        onApplyUpdate={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.queryByRole('status', { name: '应用更新提示' })).not.toBeInTheDocument()
  })
})
