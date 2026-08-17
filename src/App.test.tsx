import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the RED:REPEAT library empty state', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: 'RED:REPEAT home' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your library is empty.' })).toBeInTheDocument()
    expect(screen.getByText('Song Editions will appear here when you add them.')).toBeInTheDocument()
    expect(screen.getByText('Your first Song Edition will have a place here.')).toBeInTheDocument()
  })
})
