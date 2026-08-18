export type AppRoute =
  | { kind: 'library' }
  | { kind: 'edition'; songId: string }
  | { kind: 'timeline-debugger'; songId?: string }

type NavigationLocation = Pick<Location, 'hash' | 'pathname' | 'search'>

export function parseAppRoute(
  location: Pick<Location, 'hash'>,
  options: { devMode?: boolean } = {},
): AppRoute {
  const hash = location.hash.startsWith('#')
    ? location.hash.slice(1)
    : location.hash
  const params = new URLSearchParams(hash)
  const debugMode = params.get('debug')?.trim()
  const songId = params.get('edition')?.trim()

  const devMode = import.meta.env.DEV && (options.devMode ?? true)

  if (debugMode === 'timeline' && !devMode) {
    return { kind: 'library' }
  }

  if (devMode && debugMode === 'timeline') {
    return {
      kind: 'timeline-debugger',
      ...(songId ? { songId } : {}),
    }
  }

  return songId ? { kind: 'edition', songId } : { kind: 'library' }
}

export function createLibraryHref(location: NavigationLocation): string {
  return `${location.pathname}${location.search}`
}

export function createEditionHref(
  songId: string,
  location: NavigationLocation,
): string {
  return `${createLibraryHref(location)}#edition=${encodeURIComponent(songId)}`
}
