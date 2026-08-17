import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the RED:REPEAT library shell', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'RED:REPEAT' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Library is empty.')).toBeInTheDocument()
  })
})
