export type AppRoute =
  | { kind: 'library' }
  | { kind: 'edition'; songId: string }

type NavigationLocation = Pick<Location, 'hash' | 'pathname' | 'search'>

export function parseAppRoute(location: Pick<Location, 'hash'>): AppRoute {
  const hash = location.hash.startsWith('#')
    ? location.hash.slice(1)
    : location.hash
  const params = new URLSearchParams(hash)
  const songId = params.get('edition')?.trim()

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
