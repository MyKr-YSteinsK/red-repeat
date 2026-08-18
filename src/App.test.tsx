import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  createRuntimeClient,
  type RuntimeClient,
} from './runtime/runtime-client'

const emptyCatalog = {
  contractVersion: 1,
  contentHash: 'a'.repeat(64),
  editions: [],
}

const populatedCatalog = {
  contractVersion: 1,
  contentHash: 'b'.repeat(64),
  editions: [
    {
      songId: 'first-light',
      title: 'First Light',
      artist: 'A Composer',
      album: 'Returning',
      year: 2026,
      recommendedTheme: 'liner',
      coverUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
      editionUrl: '/library-runtime/songs/first-light/edition.a.json',
    },
    {
      songId: 'second-signal',
      title: 'Second Signal',
      artist: 'Another Composer',
      recommendedTheme: 'liner',
      coverUrl: '/library-runtime/songs/second-signal/cover-small.b.webp',
      editionUrl: '/library-runtime/songs/second-signal/edition.b.json',
    },
  ],
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  cleanup()
})

describe('App Library consumer', () => {
  it('keeps the existing empty Library state for a zero-edition catalog', async () => {
    render(<App runtimeClient={clientFor(emptyCatalog)} />)

    expect(
      await screen.findByRole('heading', { name: 'Your library is empty.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Song Editions will appear here when you add them.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Your first Song Edition will have a place here.'),
    ).toBeInTheDocument()
  })

  it('shows an explicit loading state while catalog fetch is pending', async () => {
    let resolveResponse: ((response: Response) => void) | undefined
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    )
    const client = createRuntimeClient({ fetchImpl })

    render(<App runtimeClient={client} />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading catalog')
    resolveResponse?.(jsonResponse(emptyCatalog))
    expect(
      await screen.findByRole('heading', { name: 'Your library is empty.' }),
    ).toBeInTheDocument()
  })

  it('shows a recoverable error and retries the catalog', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(jsonResponse(emptyCatalog))
    const client = createRuntimeClient({ fetchImpl })

    render(<App runtimeClient={client} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Runtime network while reading /library-runtime/catalog.json.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry catalog' }))

    expect(
      await screen.findByRole('heading', { name: 'Your library is empty.' }),
    ).toBeInTheDocument()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('renders one or more catalog editions as archive entries', async () => {
    render(<App runtimeClient={clientFor(populatedCatalog)} />)

    expect(
      await screen.findByRole('link', { name: 'Open First Light Song Edition' }),
    ).toHaveAttribute('href', '/#edition=first-light')
    expect(
      screen.getByRole('link', { name: 'Open Second Signal Song Edition' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Returning / 2026')).toBeInTheDocument()
    expect(screen.getByText('Another Composer')).toBeInTheDocument()
  })

  it('enters an edition without autoplay and returns through browser history', async () => {
    render(<App runtimeClient={clientFor(populatedCatalog)} />)

    fireEvent.click(
      await screen.findByRole('link', { name: 'Open First Light Song Edition' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'First Light' }),
    ).toBeInTheDocument()
    expect(screen.getByText('A Composer')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'RED:REPEAT home' }))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Songs worth returning to.' }),
      ).toBeInTheDocument()
    })
  })
})

function clientFor(payload: unknown): RuntimeClient {
  return createRuntimeClient({
    fetchImpl: vi.fn(async () => jsonResponse(payload)),
  })
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
  })
}
