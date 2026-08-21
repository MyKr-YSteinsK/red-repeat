import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeSwitcher } from './ThemeSwitcher'

afterEach(() => {
  cleanup()
})

describe('ThemeSwitcher', () => {
  it('exposes one accessible group with a pressed current option', () => {
    const onChange = vi.fn()
    render(<ThemeSwitcher theme="cinema" onChange={onChange} />)

    expect(screen.getByRole('group', { name: '显示风格' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '使用影院显示风格' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: '使用经典显示风格' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('changes only the selected theme and leaves mode ownership to the page', () => {
    const onChange = vi.fn()
    render(<ThemeSwitcher theme="liner" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '使用夜间显示风格' }))
    expect(onChange).toHaveBeenCalledWith('nocturne')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
