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

    expect(screen.getByRole('group', { name: 'Edition style' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use Cinema theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Use Liner theme' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('changes only the selected theme and leaves mode ownership to the page', () => {
    const onChange = vi.fn()
    render(<ThemeSwitcher theme="liner" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Use Nocturne theme' }))
    expect(onChange).toHaveBeenCalledWith('nocturne')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
